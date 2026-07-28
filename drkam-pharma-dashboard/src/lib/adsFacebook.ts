/**
 * Engine KPI + chấm điểm cho TEAM ADS FACEBOOK.
 *
 * Toàn bộ công thức trích trực tiếp từ file gốc "DrKam_Dashboard_MetaAds.xlsx"
 * (sheet ẩn "Cấu hình") và ĐÃ verify khớp dữ liệu tháng 7/2026.
 *
 *  KPI:      ROAS=DT/Chi · ROI=ROAS−1 · CPA=Chi/Đơn · CTR=Click/Impr ·
 *            CPM=Chi/Impr×1000 · CR=Đơn/Click · ATC=ATC/Click ·
 *            CP/mess=Chi/Mess · Chốt mess=Đơn/Mess · AOV=DT/Đơn
 *
 *  3 TRỤC:   A (ads, 50%)   = trung bình CÓ TRỌNG SỐ các sub-score có dữ liệu
 *                             (ROAS35·CPA25·CTR12·CPM8·Phễu20).
 *            B (tối ưu,25%) = MIN(100, tối_ưu×25 + content_test×20 + camp_test×5);
 *                             nếu có Đánh giá TP → 0.5×base + 0.5×(TP×20).
 *            C (target,25%) = MIN(100, %đạt_DT×100).
 *            Điểm tổng = A×0.5 + B×0.25 + C×0.25.
 *
 *  XẾP LOẠI: ≥85 Xuất sắc · ≥70 Đạt · ≥55 Cần cải thiện · <55 Kém.
 *
 * Lưu ý ngữ nghĩa "ô trống": trong sheet, chỉ số thiếu dữ liệu (mẫu số = 0) thì
 * BỎ QUA sub-score đó (không kéo điểm xuống). Ở DB các cột mặc định 0, nên ta coi
 * mẫu số ≤ 0 là "chưa nhập" → sub-score = null (không tính vào trung bình trọng số).
 */
import { AdsFbTaskLog, AdsFbTarget } from '../types';
import { inPeriod, weekdayVi } from './media';

export { inPeriod, weekdayVi };

// ── BENCHMARK — ngưỡng đạt 100 điểm (sheet Cấu hình, cột C) ─────
export const ADS_FB_BENCHMARK = {
  roas: 2.5,        // cao = tốt
  cpa: 120_000,     // thấp = tốt
  ctr: 0.015,       // cao = tốt (1.5%)
  cpm: 120_000,     // thấp = tốt
  crOrderClick: 0.025, // cao = tốt (2.5%)
  atcRate: 0.06,    // cao = tốt (6%)
  cpMessage: 15_000, // thấp = tốt
  closeMessRate: 0.25, // cao = tốt (25%)
} as const;

// ── TRỌNG SỐ ──────────────────────────────────────────────────
export const ADS_FB_WEIGHTS = {
  // Trục A — sub-score
  sub: { roas: 35, cpa: 25, ctr: 12, cpm: 8, funnel: 20 },
  // Gộp 3 trục
  axis: { a: 0.5, b: 0.25, c: 0.25 },
} as const;

// ── NGƯỠNG CẢNH BÁO — khối "TOP CẢNH BÁO" của sheet Dashboard ──
// Đếm số ngày-NV vượt ngưỡng đỏ trong kỳ.
export const ADS_FB_ALERT = {
  roasBelow: 1.5,
  cpaAbove: 180_000,
  scoreBelow: 55,
} as const;

// ── KPI dẫn xuất (null khi thiếu mẫu số) ───────────────────────
export interface AdsFbKpis {
  roas: number | null;
  roi: number | null;
  cpa: number | null;
  cpData: number | null;
  ctr: number | null;
  cpm: number | null;
  crOrderClick: number | null;
  atcRate: number | null;
  cpMessage: number | null;
  closeMessRate: number | null;
  aov: number | null;
}

const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export function adsFbKpis(l: AdsFbTaskLog): AdsFbKpis {
  const roas = div(l.revenue, l.spend);
  return {
    roas,
    roi: roas === null ? null : roas - 1,
    cpa: div(l.spend, l.orders),
    cpData: div(l.spend, l.dataCount),
    ctr: div(l.clicks, l.impressions),
    cpm: l.impressions > 0 ? (l.spend / l.impressions) * 1000 : null,
    crOrderClick: div(l.orders, l.clicks),
    // ATC: cần có clicks VÀ đã nhập add_to_cart (>0) — khớp guard K="" của sheet.
    atcRate: l.clicks > 0 && l.addToCart > 0 ? l.addToCart / l.clicks : null,
    cpMessage: div(l.spend, l.messages),
    closeMessRate: div(l.orders, l.messages),
    aov: div(l.revenue, l.orders),
  };
}

// ── Sub-score: quy chỉ số về thang 0–100, chặn trần 100 ─────────
// "cao tốt": value/benchmark×100 · "thấp tốt": benchmark/value×100
const scoreHigher = (v: number | null, mark: number): number | null =>
  v === null ? null : Math.min(100, (v / mark) * 100);
const scoreLower = (v: number | null, mark: number): number | null =>
  v === null || v <= 0 ? null : Math.min(100, (mark / v) * 100);

export interface AdsFbSubScores {
  sRoas: number | null;
  sCpa: number | null;
  sCtr: number | null;
  sCpm: number | null;
  sFunnel: number | null; // trung bình 2 chỉ số phễu có dữ liệu
}

export function adsFbSubScores(l: AdsFbTaskLog, k: AdsFbKpis): AdsFbSubScores {
  const B = ADS_FB_BENCHMARK;
  // Phễu rẽ nhánh theo hình thức: "Mess" → CP/mess + Chốt mess; còn lại → CR + ATC.
  let f1: number | null;
  let f2: number | null;
  if (l.formType === 'Mess') {
    f1 = scoreLower(k.cpMessage, B.cpMessage);
    f2 = scoreHigher(k.closeMessRate, B.closeMessRate);
  } else {
    f1 = scoreHigher(k.crOrderClick, B.crOrderClick);
    f2 = scoreHigher(k.atcRate, B.atcRate);
  }
  const fun = [f1, f2].filter((x): x is number => x !== null);
  return {
    sRoas: scoreHigher(k.roas, B.roas),
    sCpa: scoreLower(k.cpa, B.cpa),
    sCtr: scoreHigher(k.ctr, B.ctr),
    sCpm: scoreLower(k.cpm, B.cpm),
    sFunnel: fun.length ? fun.reduce((s, x) => s + x, 0) / fun.length : null,
  };
}

// ── % đạt target (ratio, chưa ×100) ────────────────────────────
export interface AdsFbPctTarget {
  revenue: number | null; // %đạt DT
  orders: number | null;  // %đạt đơn
  budget: number | null;  // %dùng ngân sách
}

export function adsFbPctTarget(l: AdsFbTaskLog, t?: AdsFbTarget | null): AdsFbPctTarget {
  if (!t || t.daysInMonth <= 0) return { revenue: null, orders: null, budget: null };
  const revenuePerDay = t.revenueTarget / t.daysInMonth;
  const ordersPerDay = t.ordersTarget / t.daysInMonth;
  const spendPerDay = t.spendTarget / t.daysInMonth;
  return {
    revenue: revenuePerDay > 0 ? l.revenue / revenuePerDay : null,
    orders: ordersPerDay > 0 ? l.orders / ordersPerDay : null,
    budget: spendPerDay > 0 ? l.spend / spendPerDay : null,
  };
}

// ── 3 trục + điểm tổng + xếp loại ──────────────────────────────
export interface AdsFbScore {
  kpis: AdsFbKpis;
  sub: AdsFbSubScores;
  pct: AdsFbPctTarget;
  axisA: number | null; // null khi không có sub-score nào
  axisB: number;
  axisC: number;
  total: number;
  rank: AdsFbRank;
}

export type AdsFbRank = { label: string; color: string };

export function adsFbRank(total: number): AdsFbRank {
  if (total >= 85) return { label: 'Xuất sắc', color: 'text-green-700 bg-green-50 border-green-200' };
  if (total >= 70) return { label: 'Đạt', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (total >= 55) return { label: 'Cần cải thiện', color: 'text-amber-700 bg-amber-50 border-amber-200' };
  return { label: 'Kém', color: 'text-rose-700 bg-rose-50 border-rose-200' };
}

/** Trục A = Σ(sub×weight) ÷ Σ(weight của sub có dữ liệu). Null nếu không sub nào. */
export function adsFbAxisA(sub: AdsFbSubScores): number | null {
  const W = ADS_FB_WEIGHTS.sub;
  const parts: Array<[number | null, number]> = [
    [sub.sRoas, W.roas],
    [sub.sCpa, W.cpa],
    [sub.sCtr, W.ctr],
    [sub.sCpm, W.cpm],
    [sub.sFunnel, W.funnel],
  ];
  let num = 0;
  let den = 0;
  for (const [s, w] of parts) {
    if (s !== null) {
      num += s * w;
      den += w;
    }
  }
  return den > 0 ? num / den : null;
}

/** Trục B = MIN(100, tối_ưu×25 + content_test×20 + camp_test×5); có TP → blend 50/50. */
export function adsFbAxisB(l: AdsFbTaskLog): number {
  const base = Math.min(
    100,
    l.optimizeActions * 25 + l.contentTest * 20 + l.campsTest * 5,
  );
  if (l.tpRating == null) return base;
  return 0.5 * base + 0.5 * (l.tpRating * 20);
}

/** Trục C = MIN(100, %đạt_DT×100); 0 khi chưa có target. */
export function adsFbAxisC(pct: AdsFbPctTarget): number {
  return Math.min(100, (pct.revenue ?? 0) * 100);
}

/** Tính toàn bộ điểm cho 1 dòng báo cáo (kèm target tháng của người đó). */
export function adsFbScore(l: AdsFbTaskLog, t?: AdsFbTarget | null): AdsFbScore {
  const kpis = adsFbKpis(l);
  const sub = adsFbSubScores(l, kpis);
  const pct = adsFbPctTarget(l, t);
  const axisA = adsFbAxisA(sub);
  const axisB = adsFbAxisB(l);
  const axisC = adsFbAxisC(pct);
  const A = ADS_FB_WEIGHTS.axis;
  const total = (axisA ?? 0) * A.a + axisB * A.b + axisC * A.c;
  return { kpis, sub, pct, axisA, axisB, axisC, total, rank: adsFbRank(total) };
}

/**
 * Trung bình kiểu AVERAGEIF của sheet: BỎ QUA ô trống (null) thay vì tính là 0.
 * Trả null khi không còn giá trị nào — hiển thị "—".
 */
export function avgOf(values: Array<number | null | undefined>): number | null {
  const xs = values.filter((v): v is number => v != null);
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
}

// ── Định dạng hiển thị ─────────────────────────────────────────
export const fmtInt = (v: number): string => Math.round(v).toLocaleString('vi-VN');
export const fmtMoney = (v: number | null): string => (v == null ? '—' : Math.round(v).toLocaleString('vi-VN'));
export const fmtNum = (v: number | null, digits = 2): string =>
  v == null ? '—' : v.toLocaleString('vi-VN', { maximumFractionDigits: digits });
export const fmtPct = (ratio: number | null, digits = 1): string =>
  ratio == null ? '—' : (ratio * 100).toLocaleString('vi-VN', { maximumFractionDigits: digits }) + '%';
export const fmtScore = (v: number | null): string => (v == null ? '—' : Math.round(v).toString());
