/**
 * Tiện ích dùng chung cho module TEAM MEDIA.
 * Báo cáo ngày = các dòng công việc (MediaTaskLog). Số lượng video TỰ ĐẾM từ các dòng
 * có Content là loại video (không tính "Khác").
 * Công thức KPI (chốt với user): Điểm = Trọng số × (Đạt% ÷ 100), Đạt% chặn trần 120%.
 * Xếp loại theo tổng điểm: > 100 Xuất sắc · 80–100 Đạt · 60–79 Cần cố gắng · < 60 Cần cải thiện.
 */
import {
  MediaKpiEntry,
  MediaTaskLog,
  MEDIA_VIDEO_TYPES,
  AffiliateChannel,
  DailyReport,
} from '../types';

export const KPI_CAP = 120;

const VIDEO_LABELS: string[] = MEDIA_VIDEO_TYPES.map((t) => t.label);
/** Một dòng công việc được tính là "video" khi Content là 1 trong 6 loại (không phải "Khác"). */
export const isVideoContent = (content: string): boolean => VIDEO_LABELS.includes(content);

/** Số video trong danh sách dòng công việc (mỗi dòng loại video = 1 video). */
export const countVideos = (logs: MediaTaskLog[]): number =>
  logs.reduce((s, l) => s + (isVideoContent(l.contentType) ? 1 : 0), 0);

/** Tổng video theo 6 loại — đếm số dòng công việc mỗi loại (cho donut / bảng tổng hợp). */
export function videoTypeTotalsFromLogs(logs: MediaTaskLog[]) {
  return MEDIA_VIDEO_TYPES.map((t) => ({
    key: t.key,
    label: t.label,
    color: t.color,
    value: logs.reduce((s, l) => s + (l.contentType === t.label ? 1 : 0), 0),
  }));
}

// ── KPI ───────────────────────────────────────────────────────
/**
 * Chỉ số có "Thực tế" TỰ NỐI từ dữ liệu hệ thống:
 *   • Số lượng video   → đếm từ báo cáo ngày
 *   • Reach            → cộng Views 5 kênh thương hiệu
 *   • Doanh thu        → TikTok / Facebook Ads từ báo cáo team Content
 * Mọi chỉ số khác (thêm tay qua "Sửa KPI") = chỉ số NHẬP TAY → chấm bằng % hoàn thành.
 */
export function isAutoMetric(e: MediaKpiEntry): boolean {
  return isVideoCountMetric(e.metric)
    || e.metric.toLowerCase().includes('reach')
    || deriveRevenueActual(e, 0, 0) !== null;
}

/**
 * Đạt (%) của 1 chỉ số:
 *   • Chỉ số TỰ ĐỘNG  → Thực tế ÷ Mục tiêu.
 *   • Chỉ số NHẬP TAY → % hoàn thành do Leader chấm, MẶC ĐỊNH 100% (coi như đã hoàn thành).
 *     Vì các đầu việc này (đào tạo, nhân sự…) không có nguồn số liệu tự cập nhật,
 *     để mặc định 0% sẽ trừ oan điểm; muốn hạ thì sửa ở popup "Sửa KPI".
 */
export const kpiAchieved = (e: MediaKpiEntry): number =>
  isAutoMetric(e)
    ? (e.targetValue > 0 ? (e.actualValue / e.targetValue) * 100 : 0)
    : (e.completionPct ?? 100);

export const kpiScore = (e: MediaKpiEntry): number =>
  (e.weight * Math.min(kpiAchieved(e), KPI_CAP)) / 100;

export const kpiTotal = (entries: MediaKpiEntry[]): number =>
  entries.reduce((s, e) => s + kpiScore(e), 0);

export type KpiRank = { label: string; color: string };

export function kpiRank(total: number): KpiRank {
  if (total > 100) return { label: 'Xuất sắc', color: 'text-green-700 bg-green-50 border-green-200' };
  if (total >= 80) return { label: 'Đạt', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (total >= 60) return { label: 'Cần cố gắng', color: 'text-amber-700 bg-amber-50 border-amber-200' };
  return { label: 'Cần cải thiện', color: 'text-rose-700 bg-rose-50 border-rose-200' };
}

export function formatKpiValue(v: number, unit: MediaKpiEntry['unit']): string {
  if (unit === 'percent') return v + '%';
  // Tiền & số: hiển thị đầy đủ, có dấu '.' ngăn cách hàng nghìn (vd 300.000.000).
  return v.toLocaleString('vi-VN');
}

// ── Ngày tháng ────────────────────────────────────────────────
/** Lọc theo tháng 'yyyy-mm' (date dạng dd/mm/yyyy). */
export const inPeriod = (dateDdmmyyyy: string, period: string): boolean => {
  const [d, m, y] = dateDdmmyyyy.split('/');
  return !!d && `${y}-${m}` === period;
};

/** Thứ trong tuần (tiếng Việt) từ ngày dd/mm/yyyy. */
export function weekdayVi(dateDdmmyyyy: string): string {
  const [d, m, y] = dateDdmmyyyy.split('/').map(Number);
  if (!d || !m || !y) return '';
  const wd = new Date(y, m - 1, d).getDay(); // 0=CN
  return ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][wd];
}

// ── DOANH THU TỰ NỐI TỪ TEAM CONTENT ──────────────────────────
// "Thực tế" của các chỉ số doanh thu Media tự tính từ báo cáo team Content
// (kênh TikTok + Facebook Ads), cập nhật realtime khi Content nhập số liệu.

/** Chỉ số "số lượng video sản xuất" — Thực tế tự đếm từ báo cáo ngày. */
export const isVideoCountMetric = (metric: string): boolean => {
  const m = metric.toLowerCase();
  return m.includes('số lượng video') || m.includes('video sản xuất');
};

/**
 * Số video "Thực tế" cho 1 chỉ số KPI trong kỳ của nó:
 *   • Khải (Leader) → tổng CẢ TEAM (Khải + Sơn)
 *   • Người khác    → của chính mình
 */
export function mediaVideoActual(entry: MediaKpiEntry, logs: MediaTaskLog[]): number {
  const teamTotal = entry.employeeName.trim() === MEDIA_LEADER_NAME;
  return countVideos(logs.filter((l) =>
    inPeriod(l.date, entry.period) && (teamTotal || l.employeeId === entry.employeeId)));
}

/**
 * Media Leader — người đại diện SỐ LIỆU CẢ TEAM:
 *   • chỉ số "Số lượng video sản xuất" của người này = sản lượng cả team;
 *   • khối thẻ ở màn Tổng quan lấy Mục tiêu/%KPI từ đúng các dòng KPI của người này.
 */
export const MEDIA_LEADER_NAME = 'Nguyễn Trọng Khải';

/** Dòng KPI này có phải của Leader không (dùng để lọc KPI hiển thị ở Tổng quan). */
export const isLeaderEntry = (e: MediaKpiEntry): boolean =>
  e.employeeName.trim() === MEDIA_LEADER_NAME;

// Kênh TikTok tính vào doanh thu Media: Brand + KOC Người thật (Real KOC), TRỪ giadinhminhhee.
const MEDIA_TIKTOK_EXCLUDE = new Set(['giadinhminhhee']);
export function mediaTiktokRevenue(channels: AffiliateChannel[], reports: DailyReport[], period: string): number {
  const names = new Set(channels
    .filter((c) => c.platform === 'TikTok'
      && (c.channelType === 'Brand' || c.channelType === 'Real KOC')
      && !MEDIA_TIKTOK_EXCLUDE.has(c.name))
    .map((c) => c.name));
  return reports.reduce((s, r) => s + (names.has(r.channelName) && inPeriod(r.date, period) ? (r.revenue ?? 0) : 0), 0);
}

/** Doanh thu Facebook Ads (kênh tên "Facebook Ads" — team Content nhập ở màn Facebook Ads). */
export function mediaFbAdsRevenue(reports: DailyReport[], period: string): number {
  return reports.reduce((s, r) => s + (r.channelName === 'Facebook Ads' && inPeriod(r.date, period) ? (r.revenue ?? 0) : 0), 0);
}

/**
 * Tổng lượt Reach của 5 kênh THƯƠNG HIỆU (Brand) trên TikTok + Facebook,
 * trừ kênh "Facebook Ads" (chỉ doanh thu). Lấy cột Views/Reach từ báo cáo team Content.
 * Hiện gồm: 3 kênh TikTok Brand + 2 page Facebook Brand.
 */
export function mediaReach(channels: AffiliateChannel[], reports: DailyReport[], period: string): number {
  const names = new Set(channels
    .filter((c) => c.channelType === 'Brand'
      && (c.platform === 'TikTok' || c.platform === 'Facebook')
      && c.brandCategory !== 'Facebook Ads')
    .map((c) => c.name));
  return reports.reduce((s, r) => s + (names.has(r.channelName) && inPeriod(r.date, period) ? (r.views ?? 0) : 0), 0);
}

/**
 * Chỉ tiêu doanh thu này ăn theo nguồn nào — nhận diện bằng TÊN chỉ tiêu.
 * NGUỒN DUY NHẤT của quy tắc: cả "Thực tế" của KPI lẫn Mục tiêu hiện ở thẻ Tổng quan
 * đều dựa vào đây, đừng dò chuỗi 'tiktok'/'ads' ở component nữa.
 *   • 'mixed'  — tên có cả "tiktok" và "facebook/ads" (Sơn)
 *   • 'fbAds'  — chỉ "facebook/ads" (Khải)
 *   • 'tiktok' — chỉ "tiktok" (Khải)
 */
export type RevenueKind = 'tiktok' | 'fbAds' | 'mixed';

export function revenueKind(e: MediaKpiEntry): RevenueKind | null {
  if (e.unit !== 'currency') return null;
  const m = e.metric.toLowerCase();
  const hasTiktok = m.includes('tiktok');
  const hasAds = m.includes('facebook') || m.includes('ads');
  if (hasTiktok && hasAds) return 'mixed';
  if (hasAds) return 'fbAds';
  if (hasTiktok) return 'tiktok';
  return null;
}

/**
 * Tính "Thực tế" cho chỉ số doanh thu (unit=currency) từ dữ liệu Content.
 * Trả null nếu chỉ số KHÔNG phải doanh thu tự-nối → giữ nguyên actualValue đang lưu.
 *   • 'mixed'  → (TikTok + FB Ads) ÷ 2  — chốt 17/08/2026, trước đây là TikTok÷2 + FB Ads
 *   • 'fbAds'  → FB Ads (đủ 100%)
 *   • 'tiktok' → TikTok (đủ 100%)
 */
export function deriveRevenueActual(e: MediaKpiEntry, tiktok: number, fbAds: number): number | null {
  switch (revenueKind(e)) {
    case 'mixed': return Math.round((tiktok + fbAds) / 2);
    case 'fbAds': return fbAds;
    case 'tiktok': return tiktok;
    default: return null;
  }
}

/** Điền actualValue tự động cho toàn bộ KPI: số video (báo cáo ngày) + doanh thu (team Content). */
export function withMediaActuals(
  entries: MediaKpiEntry[], logs: MediaTaskLog[],
  channels: AffiliateChannel[], reports: DailyReport[],
): MediaKpiEntry[] {
  const revCache = new Map<string, { tiktok: number; fbAds: number }>();
  const revFor = (period: string) => {
    let v = revCache.get(period);
    if (!v) { v = { tiktok: mediaTiktokRevenue(channels, reports, period), fbAds: mediaFbAdsRevenue(reports, period) }; revCache.set(period, v); }
    return v;
  };
  return entries.map((e) => {
    if (isVideoCountMetric(e.metric)) {
      return { ...e, actualValue: mediaVideoActual(e, logs) };
    }
    // Tổng lượt reach đa kênh → tự cộng Views/Reach 5 kênh thương hiệu.
    if (e.metric.toLowerCase().includes('reach')) {
      return { ...e, actualValue: mediaReach(channels, reports, e.period) };
    }
    const { tiktok, fbAds } = revFor(e.period);
    const rev = deriveRevenueActual(e, tiktok, fbAds);
    if (rev != null) return { ...e, actualValue: rev };
    // Chỉ số nhập tay → Thực tế suy ra từ % hoàn thành (mặc định 100% = đạt đúng mục tiêu).
    const pct = e.completionPct ?? 100;
    return { ...e, completionPct: pct, actualValue: Math.round((e.targetValue * pct) / 100) };
  });
}
