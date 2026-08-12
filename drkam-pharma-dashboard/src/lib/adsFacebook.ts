/**
 * Engine KPI + chấm điểm cho TEAM ADS FACEBOOK.
 *
 *  KPI:      ROI = ROAS = DT/Chi (chốt 2026-08-12: ROI là doanh thu ÷ chi phí,
 *            KHÔNG trừ 1 — hai nhãn ROI/ROAS cùng một giá trị) ·
 *            CPA=Chi/Đơn · CTR=Click/Impr · CPM=Chi/Impr×1000 · CR=Đơn/Click ·
 *            ATC=ATC/Click · CP/mess=Chi/Mess · Chốt mess=Đơn/Mess · AOV=DT/Đơn
 *
 *  CHẤM ĐIỂM — 5 chỉ tiêu (công thức user chốt 2026-08-12), mỗi mục quy về
 *  thang 0–100 (chặn trần 100) rồi nhân trọng số:
 *
 *    1. Doanh thu   40%  target/ngày = KPI tháng ÷ SỐ NGÀY THẬT của tháng
 *                        điểm = MIN(100, DT ngày ÷ target/ngày × 100)
 *    2. ROI         30%  mốc cố định 2.5 — ĐẠT/KHÔNG ĐẠT: ≥2.5 → 100, <2.5 → 0
 *    3. CPA         10%  mốc ≤140k/đơn — điểm = MIN(100, 140k ÷ CPA × 100)
 *    4. Tỷ lệ chốt  10%  Đơn ÷ Số data, mốc ≥80% — điểm = MIN(100, tỷ lệ ÷ 80% × 100)
 *    5. Content mới 10%  Đơn vị: content/ngày, mốc ≥2 — điểm = MIN(100, số ÷ 2 × 100)
 *
 *  Điểm tổng = Σ(điểm mục × trọng số). THIẾU DỮ LIỆU = 0 ĐIỂM ở mục đó
 *  (chưa đặt KPI tháng, số data = 0, số đơn = 0…) — không chia lại trọng số.
 *
 *  XẾP LOẠI: ≥85 Xuất sắc · ≥70 Đạt · ≥55 Cần cải thiện · <55 Kém.
 *
 *  Các chỉ số CTR/CPM/ATC/CP-mess/camp test/hành động tối ưu/đánh giá TP vẫn
 *  được nhập và hiển thị để theo dõi, nhưng KHÔNG tham gia chấm điểm.
 */
import { AdsFbTaskLog, AdsFbTarget } from '../types';
import { inPeriod, weekdayVi } from './media';

export { inPeriod, weekdayVi };

// ── BENCHMARK — ngưỡng đạt 100 điểm ─────────────────────────────
export const ADS_FB_BENCHMARK = {
  roi: 2.5,          // DT/Chi — mốc cứng cho cả team, đạt/không đạt
  cpa: 140_000,      // thấp = tốt
  closeRate: 0.8,    // Đơn ÷ Data, cao = tốt (80%)
  contentNew: 2,     // content mới / ngày
} as const;

// ── TRỌNG SỐ (%) — tổng 100 ─────────────────────────────────────
// Bảng user gửi ghi Doanh thu 50% nhưng 5 trọng số cộng lại 110%; user chốt
// 2026-08-12: hạ Doanh thu 50 → 40 để tổng đúng 100, các mục khác giữ nguyên.
export const ADS_FB_WEIGHTS = {
  revenue: 40,
  roi: 30,
  cpa: 10,
  closeRate: 10,
  contentNew: 10,
} as const;

// ── NGƯỠNG CẢNH BÁO — khối "TOP CẢNH BÁO" ở Tổng quan ───────────
export const ADS_FB_ALERT = {
  roasBelow: 1.5,
  cpaAbove: 180_000,
  scoreBelow: 55,
} as const;

// ── Số ngày thật của tháng ──────────────────────────────────────
/** 'yyyy-mm' → số ngày của tháng đó (tháng 8 → 31, tháng 2/2026 → 28). */
export const daysInPeriod = (period: string): number => {
  const [y, m] = period.split('-').map(Number);
  return y && m ? new Date(y, m, 0).getDate() : 30;
};
/** 'dd/mm/yyyy' → số ngày thật của tháng chứa ngày đó. */
export const daysInMonthOfDate = (date: string): number => {
  const [, m, y] = date.split('/').map(Number);
  return y && m ? new Date(y, m, 0).getDate() : 30;
};

// ── KPI dẫn xuất (null khi thiếu mẫu số) ───────────────────────
export interface AdsFbKpis {
  roas: number | null;
  roi: number | null;        // = roas (ROI = DT/Chi)
  cpa: number | null;
  cpData: number | null;
  ctr: number | null;
  cpm: number | null;
  crOrderClick: number | null;
  atcRate: number | null;
  cpMessage: number | null;
  closeMessRate: number | null;
  closeDataRate: number | null; // Đơn ÷ Data — chỉ tiêu chấm điểm #4
  aov: number | null;
}

const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export function adsFbKpis(l: AdsFbTaskLog): AdsFbKpis {
  const roas = div(l.revenue, l.spend);
  return {
    roas,
    roi: roas,
    cpa: div(l.spend, l.orders),
    cpData: div(l.spend, l.dataCount),
    ctr: div(l.clicks, l.impressions),
    cpm: l.impressions > 0 ? (l.spend / l.impressions) * 1000 : null,
    crOrderClick: div(l.orders, l.clicks),
    // ATC: cần có clicks VÀ đã nhập add_to_cart (>0).
    atcRate: l.clicks > 0 && l.addToCart > 0 ? l.addToCart / l.clicks : null,
    cpMessage: div(l.spend, l.messages),
    closeMessRate: div(l.orders, l.messages),
    closeDataRate: div(l.orders, l.dataCount),
    aov: div(l.revenue, l.orders),
  };
}

// ── % đạt target (ratio, chưa ×100) ────────────────────────────
// Target/ngày = target tháng ÷ SỐ NGÀY THẬT của tháng chứa ngày báo cáo.
// Cột days_in_month trong ads_fb_targets không còn dùng để chia.
export interface AdsFbPctTarget {
  revenue: number | null; // %đạt DT — dùng cho chỉ tiêu #1
  orders: number | null;  // %đạt đơn — chỉ để theo dõi
  budget: number | null;  // %dùng ngân sách — chỉ để theo dõi
}

export function adsFbPctTarget(l: AdsFbTaskLog, t?: AdsFbTarget | null): AdsFbPctTarget {
  if (!t) return { revenue: null, orders: null, budget: null };
  const days = daysInMonthOfDate(l.date);
  const perDay = (monthly: number) => (monthly > 0 ? monthly / days : null);
  const revPerDay = perDay(t.revenueTarget);
  const ordPerDay = perDay(t.ordersTarget);
  const spendPerDay = perDay(t.spendTarget);
  return {
    revenue: revPerDay ? l.revenue / revPerDay : null,
    orders: ordPerDay ? l.orders / ordPerDay : null,
    budget: spendPerDay ? l.spend / spendPerDay : null,
  };
}

// ── 5 chỉ tiêu chấm điểm ───────────────────────────────────────
export type AdsFbCriterionKey = 'revenue' | 'roi' | 'cpa' | 'closeRate' | 'contentNew';

export interface AdsFbCriterion {
  key: AdsFbCriterionKey;
  label: string;
  weight: number;              // % trọng số
  value: number | null;        // giá trị thực tế (đ · tỉ lệ · đ · tỉ lệ · cái)
  benchmark: number | null;    // mốc đạt 100 (Doanh thu: target/ngày của người đó)
  score: number;               // điểm mục 0–100 (thiếu dữ liệu → 0)
  points: number;              // điểm quy đổi = score × weight/100
  hasData: boolean;            // false → mục bị 0 vì thiếu dữ liệu
  note?: string;               // lý do thiếu dữ liệu, hiện trên UI
}

/** Chặn trần 100, chặn sàn 0. */
const cap = (x: number): number => Math.min(100, Math.max(0, x));

export function adsFbCriteria(
  l: AdsFbTaskLog,
  k: AdsFbKpis,
  t?: AdsFbTarget | null,
): AdsFbCriterion[] {
  const B = ADS_FB_BENCHMARK;
  const W = ADS_FB_WEIGHTS;
  const days = daysInMonthOfDate(l.date);
  const revTargetPerDay = t && t.revenueTarget > 0 ? t.revenueTarget / days : null;

  const mk = (
    key: AdsFbCriterionKey, label: string, weight: number,
    value: number | null, benchmark: number | null,
    score: number | null, note?: string,
  ): AdsFbCriterion => ({
    key, label, weight, value, benchmark,
    score: score ?? 0,
    points: ((score ?? 0) * weight) / 100,
    hasData: score !== null,
    note: score === null ? note : undefined,
  });

  return [
    // 1. Doanh thu — tỷ lệ đạt target/ngày, chặn trần 100.
    mk('revenue', 'Doanh thu', W.revenue, l.revenue, revTargetPerDay,
      revTargetPerDay ? cap((l.revenue / revTargetPerDay) * 100) : null,
      'chưa đặt KPI doanh thu tháng'),
    // 2. ROI — đạt/không đạt quanh mốc 2.5.
    mk('roi', 'ROI (DT/Chi)', W.roi, k.roi, B.roi,
      k.roi === null ? null : (k.roi >= B.roi ? 100 : 0),
      'chưa nhập chi tiêu'),
    // 3. CPA — tỷ lệ nghịch, CPA = 0 (có đơn mà chưa tốn chi phí) coi là 100.
    mk('cpa', 'CPA', W.cpa, k.cpa, B.cpa,
      k.cpa === null ? null : (k.cpa <= 0 ? 100 : cap((B.cpa / k.cpa) * 100)),
      'chưa có đơn'),
    // 4. Tỷ lệ chốt Đơn ÷ Data.
    mk('closeRate', 'Tỷ lệ chốt (data→đơn)', W.closeRate, k.closeDataRate, B.closeRate,
      k.closeDataRate === null ? null : cap((k.closeDataRate / B.closeRate) * 100),
      'chưa nhập số data'),
    // 5. Content mới — đạt mốc là tối đa.
    mk('contentNew', 'Content mới', W.contentNew, l.contentTest, B.contentNew,
      cap((l.contentTest / B.contentNew) * 100)),
  ];
}

// ── Điểm tổng + xếp loại ───────────────────────────────────────
export interface AdsFbScore {
  kpis: AdsFbKpis;
  pct: AdsFbPctTarget;
  criteria: AdsFbCriterion[];
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

/** Tính toàn bộ điểm cho 1 dòng báo cáo (kèm target tháng của người đó). */
export function adsFbScore(l: AdsFbTaskLog, t?: AdsFbTarget | null): AdsFbScore {
  const kpis = adsFbKpis(l);
  const pct = adsFbPctTarget(l, t);
  const criteria = adsFbCriteria(l, kpis, t);
  const total = criteria.reduce((s, c) => s + c.points, 0);
  return { kpis, pct, criteria, total, rank: adsFbRank(total) };
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

/** Giá trị/mốc của 1 chỉ tiêu hiển thị đúng đơn vị (đ · % · cái). */
export const fmtCriterionValue = (key: AdsFbCriterionKey, v: number | null): string => {
  switch (key) {
    case 'revenue': return v == null ? '—' : fmtMoney(v) + ' đ';
    case 'roi': return fmtNum(v);
    case 'cpa': return v == null ? '—' : fmtMoney(v) + ' đ';
    case 'closeRate': return fmtPct(v);
    case 'contentNew': return v == null ? '—' : fmtNum(v, 0);
  }
};

// ── Ô nhập chỉ tiêu ROI ────────────────────────────────────────
// Admin nhập theo % ("250"), DB lưu dạng tỉ lệ (2.5) — khớp ROI = DT/Chi.
/** Lọc ký tự ô nhập ROI: chỉ số + tối đa 1 dấu thập phân ("," → "."). */
export const roiInputChars = (s: string): string => {
  const cleaned = s.replace(/[^\d.,]/g, '').replace(/,/g, '.');
  const [head, ...rest] = cleaned.split('.');
  return rest.length ? `${head}.${rest.join('')}` : head;
};
/** "250.5" (%) → 2.505 (tỉ lệ). Làm tròn 4 số lẻ cho khớp numeric(8,4). */
export const roiPctToRatio = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? Math.round((n / 100) * 10000) / 10000 : 0;
};
/** 2.505 (tỉ lệ) → "250,5" để đổ ngược vào ô nhập (0 = chưa đặt → rỗng). */
export const roiRatioToPct = (r: number): string =>
  r ? String(Math.round(r * 10000) / 100).replace('.', ',') : '';
