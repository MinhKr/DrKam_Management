/**
 * NGƯỜI PHỤ TRÁCH KÊNH — nguồn dùng chung.
 *
 * NGUỒN DUY NHẤT là `channels.manager_name` trong Supabase, gán ở tab "Quản lý
 * kênh" (chỉ Admin). Trước đây còn một bảng cứng MANAGER_OVERRIDE trong code để
 * đỡ cho các kênh seed chưa có người phụ trách — đã BỎ ở migration 0025 vì nó
 * làm hỏng việc xoá nhân sự: xoá tên trong DB xong app vẫn hiện lại tên cũ từ
 * bảng cứng, kênh không bao giờ về được trạng thái "Chưa gán".
 *
 * Kênh chưa gán ai → trả về chuỗi rỗng; UI hiện "Chưa gán" (ô vàng) để Admin
 * thấy mà giao lại — doanh thu của kênh đó rơi vào dòng "Chưa gán người phụ
 * trách" ở Tổng quan chứ không mất đi đâu cả.
 */
import { AffiliateChannel } from '../types';

/** Người phụ trách kênh — rỗng nghĩa là chưa gán ai. */
export function managerOf(ch: Pick<AffiliateChannel, 'name' | 'managerName'>): string {
  return ch.managerName?.trim() ?? '';
}

// ════════════════════════════════════════════════════════════════════════════
//  PHÂN LOẠI DÒNG TRONG BẢNG channels
//  Bảng channels đang chứa 3 thứ khác nhau, vì daily_reports.channel_id là NOT
//  NULL nên muốn ghi doanh thu là buộc phải có một dòng kênh:
//    1. Kênh nội dung thật  — TikTok mọi loại + Facebook 'Brand'
//    2. ID Shopee KOC inhouse — Facebook + 'Real KOC'/'AI KOC': KHÔNG phải kênh,
//       là mã affiliate của một người, bên dưới treo danh sách fanpage (fb_pages).
//       Quản lý ở màn Facebook > KOC inhouse.
//    3. Hạng mục doanh thu   — dòng 'Facebook Ads' (migration 0006), chỉ để đổ
//       doanh thu quảng cáo, không phải kênh.
//  3 hàm dưới là NGUỒN DUY NHẤT của quy tắc này — đừng lặp lại điều kiện platform
//  /channelType ở component nữa.
// ════════════════════════════════════════════════════════════════════════════

/** Dòng này là ID Shopee của KOC inhouse (không phải kênh). */
export const isShopeeIdGroup = (c: AffiliateChannel) =>
  c.platform === 'Facebook' && (c.channelType === 'Real KOC' || c.channelType === 'AI KOC');

/** Dòng này chỉ là hạng mục đổ doanh thu, không phải kênh. */
export const isRevenueBucket = (c: AffiliateChannel) => c.name === 'Facebook Ads';

/** Kênh nội dung thật — thứ duy nhất hiện ở tab "Quản lý kênh". */
export const isContentChannel = (c: AffiliateChannel) => !isShopeeIdGroup(c) && !isRevenueBucket(c);
