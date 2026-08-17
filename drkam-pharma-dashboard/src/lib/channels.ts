/**
 * NGƯỜI PHỤ TRÁCH KÊNH — nguồn dùng chung.
 *
 * Nguồn sự thật là `channels.manager_name` trong Supabase, sửa ở tab "Quản lý kênh".
 * Bảng dưới đây chỉ là DỰ PHÒNG cho các kênh seed từ đầu dự án mà manager_name còn
 * trống — sửa người phụ trách trên web sẽ luôn ĐÈ bảng này (xem managerOf).
 * Khi mọi kênh đã có manager_name trong DB thì xóa hẳn bảng này được.
 */
import { AffiliateChannel } from '../types';
import { norm } from './contentKpi';

/** Khớp theo tên đã chuẩn hoá (bỏ dấu, viết thường, bỏ dấu cách/chấm/gạch). */
export const MANAGER_OVERRIDE: Record<string, string> = {
  // TikTok Brand
  'drkampharmaofficial': 'Nguyễn Công Hải',
  'drkamvn': 'Hoàng Yến Nhi',
  'drkamvnofficial': 'Đặng Kim Khánh',
  // TikTok KOC
  'happyydaily': 'Hoàng Yến Nhi',
  'nhacuacamcam': 'Nguyễn Công Hải',
  'giadinhminhhee': 'Nguyễn Công Hải',
  'baochauday': 'Đặng Kim Khánh',
  // TikTok AI
  'koi928tramtram': 'Đặng Kim Khánh',
  'doisongsuckhoe86': 'Đặng Kim Khánh',
  'ngochuong259': 'Nguyễn Công Hải',
  'haidang0136': 'Nguyễn Công Hải',
  'minhquan8046': 'Lê Đắc Nhật Minh',
  'quinchana82': 'Hoàng Yến Nhi',
  'anhquan9684': 'Lê Đắc Nhật Minh',
  // FB Brand (tên đầy đủ trong app)
  'drkamsongkhoecungchuyengia': 'Đặng Kim Khánh',
  'drkambacsirangmienghongcuamoigiadinh': 'Đặng Kim Khánh',
  // FB AI
  'duocsikhanh': 'Đặng Kim Khánh',
  'conghaing': 'Nguyễn Công Hải',
  'ynni1809': 'Hoàng Yến Nhi',
  'leminh139148': 'Lê Đắc Nhật Minh',
};

/** Người phụ trách kênh: ưu tiên dữ liệu đã lưu, thiếu mới lấy bảng dự phòng. */
export function managerOf(ch: Pick<AffiliateChannel, 'name' | 'managerName'>): string {
  return ch.managerName?.trim() || MANAGER_OVERRIDE[norm(ch.name)] || '';
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
