// Lớp selectors thuần cho dashboard — nhận reports đã lọc theo phạm vi kênh + khoảng ngày,
// trả KPI / chuỗi theo ngày / gộp theo kênh / phễu. Dùng chung mọi dashboard (TikTok, Facebook, Tổng quan).
// Quy ước: count = cộng dồn; tỷ lệ (xem hết %, TG xem) = trung bình ngày (khớp bảng báo cáo).
import { DailyReport } from '../types';

export const toIso = (d: string) => { const [dd, mm, yy] = d.split('/'); return `${yy}-${mm}-${dd}`; };
export const toDdmm = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };
export const shiftIso = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};
export const daysBetween = (from: string, to: string) => {
  const [a, b, c] = from.split('-').map(Number);
  const [x, y, z] = to.split('-').map(Number);
  return Math.round((Date.UTC(x, y - 1, z) - Date.UTC(a, b - 1, c)) / 86_400_000) + 1;
};

const inRange = (r: DailyReport, from: string, to: string) => {
  const iso = toIso(r.date);
  return iso >= from && iso <= to;
};
type Traffic = NonNullable<DailyReport['traffic']>;

export type Kpi = {
  days: number; revenue: number; views: number; like: number; comment: number; share: number;
  save: number; followerIncr: number; engagement: number; viewAllRate: number; avgViewDuration: number;
};
export function kpiTotals(reports: DailyReport[], from: string, to: string): Kpi {
  const rs = reports.filter((r) => inRange(r, from, to));
  const traf = rs.map((r) => r.traffic).filter(Boolean) as Traffic[];
  const sum = (f: (t: Traffic) => number) => traf.reduce((s, t) => s + (f(t) || 0), 0);
  const avg = (f: (t: Traffic) => number) => (traf.length ? sum(f) / traf.length : 0);
  const like = sum((t) => t.like), comment = sum((t) => t.comment), share = sum((t) => t.share);
  return {
    days: rs.length,
    revenue: rs.reduce((s, r) => s + r.revenue, 0),
    views: sum((t) => t.viewsReach), like, comment, share, save: sum((t) => t.save),
    followerIncr: sum((t) => t.followerIncr),
    engagement: like + comment + share,
    viewAllRate: Math.round(avg((t) => t.viewAllRate) * 10) / 10,
    avgViewDuration: Math.round(avg((t) => t.avgViewDuration) * 10) / 10,
  };
}

export type DayPoint = { iso: string; label: string; revenue: number; views: number; engagement: number; followerIncr: number };
// 1 điểm / ngày trong khoảng (gồm cả ngày không có báo cáo = 0) → đường liền mạch.
export function dailySeries(reports: DailyReport[], from: string, to: string): DayPoint[] {
  const n = daysBetween(from, to);
  const acc = new Map<string, DayPoint>();
  for (let i = 0; i < n; i++) {
    const iso = shiftIso(from, i);
    acc.set(iso, { iso, label: toDdmm(iso), revenue: 0, views: 0, engagement: 0, followerIncr: 0 });
  }
  reports.forEach((r) => {
    const p = acc.get(toIso(r.date));
    if (!p) return;
    p.revenue += r.revenue;
    if (r.traffic) {
      p.views += r.traffic.viewsReach;
      p.engagement += r.traffic.like + r.traffic.comment + r.traffic.share;
      p.followerIncr += r.traffic.followerIncr;
    }
  });
  return Array.from(acc.values());
}

export type ChannelAgg = { name: string; revenue: number; views: number; engagement: number; followerIncr: number };
export function byChannel(reports: DailyReport[], from: string, to: string): ChannelAgg[] {
  const rs = reports.filter((r) => inRange(r, from, to));
  const m = new Map<string, ChannelAgg>();
  rs.forEach((r) => {
    const a = m.get(r.channelName) || { name: r.channelName, revenue: 0, views: 0, engagement: 0, followerIncr: 0 };
    a.revenue += r.revenue;
    if (r.traffic) {
      a.views += r.traffic.viewsReach;
      a.engagement += r.traffic.like + r.traffic.comment + r.traffic.share;
      a.followerIncr += r.traffic.followerIncr;
    }
    m.set(r.channelName, a);
  });
  return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
}

// Khoảng kỳ TRƯỚC cùng độ dài, ngay sát trước khoảng hiện tại (để so sánh % tăng/giảm).
export function prevRange(from: string, to: string) {
  const n = daysBetween(from, to);
  return { from: shiftIso(from, -n), to: shiftIso(from, -1) };
}
export function pctDelta(curr: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}
