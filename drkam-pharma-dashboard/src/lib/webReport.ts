/**
 * BÁO CÁO WEB — SEO (migration 0021).
 *
 * Màn "Báo cáo web" của team Content gồm 2 con số, lấy từ 2 nguồn khác nhau:
 *   • LƯỢT TRUY CẬP — nhập tay theo NGÀY, lưu ở bảng web_reports.
 *   • SỐ BÀI VIẾT   — KHÔNG nhập lại: đếm tự động từ dòng "SEO WEB" trong
 *     checklist công việc ngày (mọi nhân sự cộng lại), đúng như user chốt.
 *
 * Chỉ tiêu tháng dùng chung bảng content_kpi_targets với kind='viewreach' và
 * item_id 'web-traffic' / 'web-posts' — đặt ở màn "KPI tháng — Team Content",
 * KHÔNG cần bảng riêng và KHÔNG đụng 2 hạng mục view/reach cũ (tt-view,
 * fb-reach) nên bảng cũ ở Tổng quan không bị cộng nhầm.
 *
 * Số mặc định lấy theo bảng KPIs công ty (sheet "CONTENT FANPAGE + SEO"):
 * 40 bài/tháng · 12.000 lượt traffic.
 */
import { ChecklistItem, ContentKpiTarget, WebReport } from '../types';
import { norm } from './contentKpi';

export const WEB_TRAFFIC_ID = 'web-traffic';
export const WEB_POSTS_ID = 'web-posts';

/** 2 hạng mục KPI của web — hiện ở màn đặt KPI, mục "Chỉ tiêu Web / SEO". */
export const WEB_KPI_ITEMS: { id: string; label: string; unit: string; defaultTarget: number }[] = [
  { id: WEB_TRAFFIC_ID, label: 'Lượt truy cập web', unit: 'lượt', defaultTarget: 12_000 },
  { id: WEB_POSTS_ID, label: 'Số bài viết SEO WEB', unit: 'bài', defaultTarget: 40 },
];

/**
 * Chỉ tiêu web của một tháng: lấy số đã đặt, chưa đặt thì dùng số mặc định
 * (12.000 / 40) để tháng nào cũng chấm được % mà không phải nhập trước.
 */
export function webTargetResolver(
  targets: ContentKpiTarget[],
  period: string,
): (itemId: string) => number {
  const saved = new Map(targets.filter((t) => t.period === period).map((t) => [t.itemId, t.targetValue]));
  const fallback = new Map(WEB_KPI_ITEMS.map((i) => [i.id, i.defaultTarget]));
  return (itemId: string) => saved.get(itemId) ?? fallback.get(itemId) ?? 0;
}

/**
 * Dòng checklist này có phải đầu việc SEO WEB không.
 * So khớp trên nhãn đã chuẩn hoá nên "SEO WEB", "SEO Web", "seo web" đều tính.
 */
export const isSeoWebTask = (label: string) => norm(label).includes('seoweb');

/** Ngày dd/mm/yyyy này có thuộc tháng 'yyyy-mm' đang xem không. */
export const inMonth = (uiDate: string, monthKey: string) => {
  const [dd, mm, yy] = uiDate.split('/');
  return !!dd && `${yy}-${mm}` === monthKey;
};

/**
 * Số bài viết SEO theo từng NGÀY của tháng (khoá: dd/mm/yyyy) — cộng số lượng
 * mọi dòng "SEO WEB" của mọi nhân sự trong ngày đó.
 */
export function seoPostsByDate(checklists: ChecklistItem[], monthKey: string): Map<string, number> {
  const out = new Map<string, number>();
  checklists.forEach((c) => {
    if (!isSeoWebTask(c.label) || !inMonth(c.date, monthKey)) return;
    out.set(c.date, (out.get(c.date) ?? 0) + (c.quantity || 0));
  });
  return out;
}

/** Lượt truy cập theo từng NGÀY của tháng (khoá: dd/mm/yyyy). */
export function trafficByDate(reports: WebReport[], monthKey: string): Map<string, number> {
  const out = new Map<string, number>();
  reports.forEach((r) => {
    if (!inMonth(r.date, monthKey)) return;
    out.set(r.date, (out.get(r.date) ?? 0) + (r.traffic || 0));
  });
  return out;
}
