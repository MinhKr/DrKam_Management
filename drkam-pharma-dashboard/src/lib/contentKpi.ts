/**
 * DANH MỤC KPI THÁNG — TEAM CONTENT (migration 0015).
 *
 * Đây là NGUỒN DUY NHẤT của danh sách hạng mục KPI, dùng chung cho:
 *   • Tổng quan > Báo cáo chung (DashboardComponent) — bảng kênh × tuần
 *   • Thiết lập KPI team Content (ContentKpiComponent) — nhập chỉ tiêu tháng
 * Sửa danh sách ở đây thì cả 2 màn đổi theo, không lệch nhau được.
 *
 * CHỈ TIÊU đặt theo TỪNG THÁNG và lưu ở bảng content_kpi_targets. Số ghi trong
 * `defaultTarget` bên dưới chỉ là MẶC ĐỊNH cho tháng chưa ai thiết lập (giữ
 * nguyên số KPI tháng 7/2026 đang chạy để báo cáo cũ không tụt về 0).
 */
import { AffiliateChannel, DailyReport, ContentKpiTarget } from '../types';

/** Chuẩn hoá tên kênh (bỏ dấu, viết thường, bỏ ký tự đặc biệt) — dùng để khớp kênh theo tên. */
export const norm = (s: string) =>
  s.normalize('NFD').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');

export type BadgeKind = 'fb' | 'tiktok' | 'koc' | 'other';

/** 1 hạng mục doanh thu: nhãn hiển thị, chỉ tiêu mặc định, và cách khớp báo cáo về hạng mục. */
export type LineItem = {
  id: string;
  label: string;
  defaultTarget: number;
  badge: BadgeKind;
  match: (ch: AffiliateChannel | undefined, r: DailyReport) => boolean;
};

const nameIs = (...keys: string[]) =>
  (ch: AffiliateChannel | undefined, r: DailyReport) => keys.includes(norm(ch?.name ?? r.channelName));

/** 13 hạng mục DOANH THU (tổng mặc định = 650.000.000 đ — KPI tháng 7/2026). */
export const CONTENT_LINE_ITEMS: LineItem[] = [
  { id: 'drkampharma', label: 'DrKam Pharma Official', defaultTarget: 40_000_000, badge: 'tiktok', match: nameIs('drkampharmaofficial') },
  { id: 'drkamvn', label: 'DrKam VN', defaultTarget: 40_000_000, badge: 'tiktok', match: nameIs('drkamvn') },
  { id: 'drkamvnofficial', label: 'DrKam VN Official', defaultTarget: 15_000_000, badge: 'tiktok', match: nameIs('drkamvnofficial') },
  { id: 'happy', label: 'KOC – Happy Daily', defaultTarget: 100_000_000, badge: 'koc', match: nameIs('happyydaily', 'happydaily') },
  { id: 'camcam', label: 'KOC – Nhà của CamCam', defaultTarget: 20_000_000, badge: 'koc', match: nameIs('nhacuacamcam') },
  { id: 'minhhee', label: 'KOC – Gia đình MinhHee', defaultTarget: 15_000_000, badge: 'koc', match: nameIs('giadinhminhhee') },
  { id: 'baochau', label: 'KOC – Bảo Châu', defaultTarget: 15_000_000, badge: 'koc', match: nameIs('baochauday', 'baochau') },
  { id: 'ttai', label: 'TikTok AI (tất cả kênh TikTok AI)', defaultTarget: 100_000_000, badge: 'tiktok',
    match: (ch) => ch?.platform === 'TikTok' && ch?.channelType === 'AI KOC' },
  { id: 'fbkhanh', label: 'FB AI – Khánh/duocsikhanh', defaultTarget: 50_000_000, badge: 'fb', match: nameIs('duocsikhanh') },
  { id: 'fbhai', label: 'FB AI – Hải/conghaing', defaultTarget: 60_000_000, badge: 'fb', match: nameIs('conghaing') },
  { id: 'fbnhi', label: 'FB AI – Nhi/ynni1809', defaultTarget: 10_000_000, badge: 'fb', match: nameIs('ynni1809') },
  { id: 'fbminh', label: 'FB AI – Minh/leminh139148', defaultTarget: 10_000_000, badge: 'fb', match: nameIs('leminh139148') },
  // Facebook Ads: doanh thu nhập ở mục Facebook > Facebook Ads (kênh tên "Facebook Ads").
  { id: 'fbads', label: 'Facebook Ads', defaultTarget: 175_000_000, badge: 'fb', match: nameIs('facebookads') },
];

/**
 * 2 hạng mục VIEW / REACH — chỉ tiêu THÁNG (tuần = tháng ÷ 4).
 * Thực hiện = tổng reach (viewsReach) các tuần, nhập ở form TikTok/Facebook thương hiệu.
 */
export const CONTENT_VIEW_REACH: { id: string; label: string; badge: BadgeKind; defaultTarget: number; plat: 'tt' | 'fb' }[] = [
  { id: 'tt-view', label: 'Lượt view TikTok', badge: 'tiktok', defaultTarget: 4_000_000, plat: 'tt' },
  { id: 'fb-reach', label: 'Lượt tiếp cận Facebook', badge: 'fb', defaultTarget: 5_000_000, plat: 'fb' },
];

/** Hai nhóm hạng mục — dùng để dựng bảng thiết lập KPI. */
export type ContentKpiKind = 'revenue' | 'viewreach';

/** Toàn bộ hạng mục ở dạng phẳng (id · nhãn · nhóm · chỉ tiêu mặc định) theo đúng thứ tự hiển thị. */
export const CONTENT_KPI_ITEMS: { id: string; label: string; kind: ContentKpiKind; badge: BadgeKind; defaultTarget: number }[] = [
  ...CONTENT_LINE_ITEMS.map((li) => ({ id: li.id, label: li.label, kind: 'revenue' as const, badge: li.badge, defaultTarget: li.defaultTarget })),
  ...CONTENT_VIEW_REACH.map((v) => ({ id: v.id, label: v.label, kind: 'viewreach' as const, badge: v.badge, defaultTarget: v.defaultTarget })),
];

/**
 * Chỉ tiêu THỰC DÙNG của một tháng: lấy số đã thiết lập cho đúng tháng đó;
 * tháng chưa thiết lập thì rơi về `defaultTarget` của hạng mục.
 *
 * Trả về hàm tra cứu theo id để nơi gọi không phải tự lo phần fallback.
 */
export function targetResolver(targets: ContentKpiTarget[], period: string): (itemId: string) => number {
  const saved = new Map(targets.filter((t) => t.period === period).map((t) => [t.itemId, t.targetValue]));
  const fallback = new Map(CONTENT_KPI_ITEMS.map((i) => [i.id, i.defaultTarget]));
  return (itemId: string) => saved.get(itemId) ?? fallback.get(itemId) ?? 0;
}

/** Tháng này đã được thiết lập KPI chưa (có ít nhất 1 dòng đã lưu). */
export const hasSavedTargets = (targets: ContentKpiTarget[], period: string): boolean =>
  targets.some((t) => t.period === period);

// Ghi chú: phần tính THỰC HIỆN / % đạt cố tình KHÔNG nằm ở đây — màn KPI chỉ để
// đặt số, còn tiến độ đã có sẵn ở Tổng quan > Báo cáo chung (chốt với user).
