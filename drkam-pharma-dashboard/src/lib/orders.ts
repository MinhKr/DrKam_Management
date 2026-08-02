/**
 * Tiện ích dùng chung cho MODULE ORDER (2 luồng đặt việc giữa các team):
 *   • ContentMediaOrder — Team Content đặt team Media
 *   • AdsContentOrder   — Team Ads Facebook đặt team Content
 *
 * TRỌNG TÂM: cảnh báo hạn. Ngưỡng "sắp hết hạn" = TRƯỚC 1 NGÀY (chốt với user),
 * nghĩa là order còn hạn hôm nay hoặc ngày mai được coi là GẤP.
 * Order đã Hoàn thành / Hủy KHÔNG bao giờ bị cảnh báo.
 *
 * Ngày ở UI luôn là dd/mm/yyyy; mọi so sánh quy về mốc 00:00 giờ địa phương
 * để không lệch múi giờ khi dùng Date.
 */
import {
  ContentMediaOrder,
  AdsContentOrder,
  OrderPriority,
  ContentMediaStatus,
  AdsContentStatus,
} from '../types';

/** Số ngày báo GẤP trước hạn — chốt với user: 1 ngày. */
export const ORDER_URGENT_DAYS = 1;

/** Trạng thái coi như ĐÃ ĐÓNG — không tính vào cảnh báo hạn. */
const CLOSED_STATUSES = ['Hoàn thành', 'Hủy'];
export const isOrderClosed = (status: string): boolean => CLOSED_STATUSES.includes(status);

// ── Ngày tháng ────────────────────────────────────────────────
/** "02/08/2026" → Date lúc 00:00 địa phương. Trả null nếu chuỗi không hợp lệ. */
export function parseUiDate(ui?: string): Date | null {
  if (!ui) return null;
  const [d, m, y] = ui.split('/').map((x) => parseInt(x, 10));
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Hôm nay lúc 00:00 địa phương — mốc so sánh hạn. */
export function todayStart(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/** Số ngày còn lại tới hạn: 0 = hết hạn hôm nay, âm = đã quá hạn. */
export function daysLeft(deadline?: string, now: Date = todayStart()): number | null {
  const dl = parseUiDate(deadline);
  if (!dl) return null;
  return Math.round((dl.getTime() - now.getTime()) / 86_400_000);
}

// ── Mức cảnh báo ──────────────────────────────────────────────
export type OrderAlert = 'overdue' | 'urgent' | 'ontime' | 'none' | 'closed';

export interface OrderDeadlineInfo {
  alert: OrderAlert;
  days: number | null;   // ngày còn lại (âm = quá hạn)
  label: string;         // nhãn ngắn hiển thị trên badge
  color: string;         // class Tailwind cho badge
}

/**
 * Xếp mức cảnh báo của 1 order theo hạn + trạng thái:
 *   • closed  — đã Hoàn thành/Hủy (không cảnh báo dù quá hạn)
 *   • none    — chưa đặt hạn
 *   • overdue — quá hạn (deadline < hôm nay)
 *   • urgent  — còn ≤ ORDER_URGENT_DAYS ngày (hôm nay / ngày mai)
 *   • ontime  — còn hạn
 */
export function orderDeadline(
  deadline: string | undefined,
  status: string,
  now: Date = todayStart(),
): OrderDeadlineInfo {
  const days = daysLeft(deadline, now);
  if (isOrderClosed(status)) {
    return { alert: 'closed', days, label: status, color: 'text-slate-500 bg-slate-100 border-slate-200' };
  }
  if (days === null) {
    return { alert: 'none', days: null, label: 'Chưa đặt hạn', color: 'text-slate-400 bg-slate-50 border-slate-200' };
  }
  if (days < 0) {
    return { alert: 'overdue', days, label: `Quá hạn ${Math.abs(days)} ngày`, color: 'text-rose-700 bg-rose-50 border-rose-200' };
  }
  if (days <= ORDER_URGENT_DAYS) {
    return {
      alert: 'urgent', days,
      label: days === 0 ? 'Hết hạn hôm nay' : 'Còn 1 ngày',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    };
  }
  return { alert: 'ontime', days, label: `Còn ${days} ngày`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
}

/** Thứ tự sắp xếp: quá hạn trước, rồi gấp, rồi còn hạn, chưa đặt hạn, cuối cùng là đã đóng. */
const ALERT_RANK: Record<OrderAlert, number> = { overdue: 0, urgent: 1, ontime: 2, none: 3, closed: 4 };
export const alertRank = (a: OrderAlert): number => ALERT_RANK[a];

/** Đếm số order theo mức cảnh báo — dùng cho dải cảnh báo đầu màn. */
export function countAlerts(items: Array<{ deadline?: string; status: string }>, now: Date = todayStart()) {
  const c = { overdue: 0, urgent: 0, ontime: 0, none: 0, closed: 0, open: 0 };
  items.forEach((it) => {
    const { alert } = orderDeadline(it.deadline, it.status, now);
    c[alert] += 1;
    if (alert !== 'closed') c.open += 1;
  });
  return c;
}

// ── Ưu tiên / trạng thái ──────────────────────────────────────
export const priorityStyle = (p: OrderPriority): string =>
  p === 'CAO' ? 'text-rose-700 bg-rose-50 border-rose-200'
    : p === 'THẤP' ? 'text-slate-600 bg-slate-50 border-slate-200'
    : 'text-sky-700 bg-sky-50 border-sky-200';

/** Màu trạng thái — dùng chung cho cả 2 loại order (nhãn khác nhau, tinh thần giống nhau). */
export function statusStyle(status: ContentMediaStatus | AdsContentStatus | string): string {
  switch (status) {
    case 'Hoàn thành': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'Đang làm':
    case 'Đang dựng': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    case 'Đang viết KB': return 'text-violet-700 bg-violet-50 border-violet-200';
    case 'Xong KB': return 'text-cyan-700 bg-cyan-50 border-cyan-200';
    case 'Delay': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'Hủy': return 'text-slate-500 bg-slate-100 border-slate-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';   // Chờ nhận
  }
}

// ── Lọc & sắp xếp ─────────────────────────────────────────────
/** Order thuộc tháng 'yyyy-mm' theo NGÀY ORDER. */
export function orderInPeriod(orderDate: string, period: string): boolean {
  const [d, m, y] = orderDate.split('/');
  return !!d && `${y}-${m}` === period;
}

/**
 * Sắp xếp mặc định của bảng order: cảnh báo gấp nhất lên đầu,
 * cùng mức thì hạn gần hơn trước, rồi tới ưu tiên CAO.
 */
export function sortByUrgency<T extends { deadline?: string; status: string; priority: OrderPriority }>(
  items: T[],
  now: Date = todayStart(),
): T[] {
  const prioRank = (p: OrderPriority) => (p === 'CAO' ? 0 : p === 'TRUNG BÌNH' ? 1 : 2);
  return [...items].sort((a, b) => {
    const da = orderDeadline(a.deadline, a.status, now);
    const dbb = orderDeadline(b.deadline, b.status, now);
    if (alertRank(da.alert) !== alertRank(dbb.alert)) return alertRank(da.alert) - alertRank(dbb.alert);
    if (da.days !== null && dbb.days !== null && da.days !== dbb.days) return da.days - dbb.days;
    return prioRank(a.priority) - prioRank(b.priority);
  });
}

/** Order đang mở (chưa Hoàn thành/Hủy) — dùng cho ô đếm và danh sách cảnh báo. */
export const openOrders = <T extends { status: string }>(items: T[]): T[] =>
  items.filter((i) => !isOrderClosed(i.status));

// ── Gợi ý ô nhập ──────────────────────────────────────────────
/** LOẠI hay dùng ở sheet order Media — gợi ý trong ô nhập (vẫn cho gõ tự do). */
export const CONTENT_MEDIA_CATEGORIES = [
  'BÁN HÀNG', 'Bs Nguyên daily', 'Bs Nguyên bán hàng', 'FACEBOOK', 'DRKAMVN',
  'Branding', 'Tài nguyên', 'Shopee', 'Trạm sức khỏe',
];

/** LOẠI KỊCH BẢN hay dùng ở sheet order của team Ads. */
export const ADS_CONTENT_TOPICS = [
  'HÔI MIỆNG, THỐI MIỆNG', 'VIÊM NƯỚU', 'VIÊM AMIDAN', 'CHẠY SỈ',
];

/** Kích thước video hay dùng. */
export const ADS_CONTENT_SIZES = ['9:16', '3:4', '1:1', '16:9'];

/** Gộp 2 loại order về 1 dòng cảnh báo chung (dùng cho dải cảnh báo tổng). */
export interface OrderAlertRow {
  id: string;
  kind: 'media' | 'content';   // media = Content→Media, content = Ads→Content
  title: string;
  assignee: string;
  deadline?: string;
  status: string;
  info: OrderDeadlineInfo;
}

export function buildAlertRows(
  mediaOrders: ContentMediaOrder[],
  adsOrders: AdsContentOrder[],
  now: Date = todayStart(),
): OrderAlertRow[] {
  const rows: OrderAlertRow[] = [
    ...mediaOrders.map((o) => ({
      id: o.id, kind: 'media' as const,
      title: o.title || o.category || '(chưa đặt tên)',
      assignee: o.assigneeName || 'chưa giao',
      deadline: o.deadline, status: o.status,
      info: orderDeadline(o.deadline, o.status, now),
    })),
    ...adsOrders.map((o) => ({
      id: o.id, kind: 'content' as const,
      title: o.postCode || o.topic || '(chưa đặt tên)',
      assignee: o.contentOwnerName || 'chưa giao',
      deadline: o.deadline, status: o.status,
      info: orderDeadline(o.deadline, o.status, now),
    })),
  ];
  return rows
    .filter((r) => r.info.alert === 'overdue' || r.info.alert === 'urgent')
    .sort((a, b) => alertRank(a.info.alert) - alertRank(b.info.alert) || (a.info.days ?? 0) - (b.info.days ?? 0));
}
