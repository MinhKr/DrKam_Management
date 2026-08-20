/**
 * DOANH THU THEO NHÂN VIÊN — TEAM CONTENT.
 *
 * Không có bảng "KPI theo nhân viên" nhập tay nữa (chốt với user — bỏ khỏi màn
 * KPI): chỉ tiêu của mỗi người SUY RA từ bảng KPI mới theo kênh — cộng chỉ tiêu
 * các KÊNH người đó phụ trách. Đặt KPI 1 chỗ (theo kênh), tiến độ người tự có.
 *
 * KHỚP BẰNG TÊN — đúng quy ước toàn hệ thống (báo cáo ↔ kênh cũng khớp tên):
 * doanh thu thực hiện của một người = tổng doanh thu các KÊNH người đó phụ
 * trách (channels.manager_name, sửa ở tab "Quản lý kênh"). Đổi tên nhân sự thì
 * phải đổi luôn người phụ trách kênh, không thì doanh thu rơi vào "Chưa gán".
 *
 * KPI của Leader = KPI TỔNG cả team (chốt với user) nên Leader KHÔNG có dòng
 * riêng ở đây — tiến độ tổng đã nằm ở khối KPI chung của Tổng quan.
 *
 * File tách riêng khỏi contentKpi.ts vì cần dùng managerOf() của lib/channels
 * (channels.ts đã import contentKpi.norm — để chung sẽ thành import vòng).
 */
import { AffiliateChannel, DailyReport, Employee } from '../types';
import { norm } from './contentKpi';
import { isRevenueBucket, managerOf } from './channels';
import { allocateByWeights, fbAdsShareKey, FB_ADS_KEY, revenueByChannel } from './contentChannelKpi';
import { contentStaff } from './staff';
import { isContentStaff } from './staff';

/** Khoá của dòng doanh thu không xác định được người phụ trách. */
export const UNASSIGNED_KEY = '';
export const UNASSIGNED_LABEL = 'Chưa gán người phụ trách';

export type ContentEmployee = { key: string; name: string };

/**
 * Danh sách nhân sự có KPI doanh thu.
 *
 * Gộp 2 nguồn để không sót ai mà cũng không kéo cả công ty vào:
 *   1. Người đang phụ trách kênh — nguồn chuẩn của doanh thu thực hiện;
 *   2. Nhân sự team Content (theo src/lib/staff.ts) — người chưa được giao kênh nào.
 */
export function contentEmployeeRoster(
  employees: Employee[],
  channels: AffiliateChannel[],
): ContentEmployee[] {
  const byKey = new Map<string, string>();
  const add = (name: string | undefined) => {
    const n = (name ?? '').trim();
    const k = norm(n);
    if (k && !byKey.has(k)) byKey.set(k, n);
  };

  channels.forEach((c) => add(managerOf(c)));
  employees.filter((e) => isContentStaff(e)).forEach((e) => add(e.name));

  return [...byKey.entries()]
    .map(([key, name]) => ({ key, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

/**
 * Doanh thu thực hiện theo nhân viên trong một tập báo cáo (thường là 1 tháng).
 * Báo cáo của kênh chưa có người phụ trách gom vào khoá '' (dòng "Chưa gán") để
 * tổng các dòng nhân viên LUÔN bằng tổng doanh thu team — không rơi rớt đồng nào.
 *
 * `weekOf` cho biết báo cáo thuộc tuần nào (0–3), truyền từ nơi gọi để không lặp
 * lại quy ước chia tuần (T1 1–7 · T2 8–14 · T3 15–21 · T4 22–cuối tháng).
 */
export function revenueByEmployee(
  reports: DailyReport[],
  channels: AffiliateChannel[],
  weekOf: (r: DailyReport) => number,
  /**
   * Trọng số chia doanh thu kênh gộp Facebook Ads — khoá = tên người đã chuẩn
   * hoá, giá trị = KPI Facebook Ads của họ (lấy từ fbAdsWeights() trong
   * contentChannelKpi). Không truyền, hoặc chưa ai có KPI Facebook Ads → cả cục
   * nằm ở dòng "Chưa gán", không gán bừa cho ai.
   */
  fbAdsShares?: Map<string, number>,
): Map<string, { total: number; weeks: number[] }> {
  const chByName = new Map(channels.map((c) => [c.name, c]));
  const out = new Map<string, { total: number; weeks: number[] }>();
  /** Ô số của một người (tạo mới nếu chưa có). */
  const cell = (key: string) => {
    const c = out.get(key) ?? { total: 0, weeks: [0, 0, 0, 0] };
    out.set(key, c);
    return c;
  };

  // Doanh thu Facebook Ads gom riêng thành 1 cục để chia theo tỉ trọng KPI.
  const fbPool = { total: 0, weeks: [0, 0, 0, 0] };

  reports.forEach((r) => {
    if (!r.revenue) return;
    const ch = chByName.get(r.channelName);
    const wi = weekOf(r);
    const box = ch && isRevenueBucket(ch) ? fbPool : cell(ch ? norm(managerOf(ch)) : UNASSIGNED_KEY);
    box.total += r.revenue;
    if (wi >= 0 && wi < 4) box.weeks[wi] += r.revenue;
  });

  if (fbPool.total) {
    const keys = [...(fbAdsShares?.keys() ?? [])];
    const weights = keys.map((k) => fbAdsShares!.get(k) ?? 0);
    if (weights.some((w) => w > 0)) {
      // Chia tổng và chia từng tuần theo cùng tỉ trọng để cột T1–T4 khớp tổng.
      allocateByWeights(fbPool.total, weights).forEach((v, i) => { cell(keys[i]).total += v; });
      fbPool.weeks.forEach((w, wi) => {
        allocateByWeights(w, weights).forEach((v, i) => { cell(keys[i]).weeks[wi] += v; });
      });
    } else {
      const box = cell(UNASSIGNED_KEY);
      box.total += fbPool.total;
      fbPool.weeks.forEach((w, wi) => { box.weeks[wi] += w; });
    }
  }
  return out;
}

/**
 * Chỉ tiêu doanh thu của từng người, SUY RA TỪ BẢNG KPI MỚI THEO KÊNH:
 * = tổng chỉ tiêu các kênh người đó phụ trách. Kênh chưa gán người cộng vào
 * khoá '' (dòng "Chưa gán") nên tổng chỉ tiêu các dòng luôn bằng tổng KPI kênh.
 *
 * `chTargetOf` là hàm tra chỉ tiêu theo TÊN KÊNH đã chuẩn hoá — lấy từ
 * channelTargetResolver() của src/lib/contentChannelKpi.ts.
 */
export function employeeTargetsFromChannels(
  channels: AffiliateChannel[],
  chTargetOf: (chKey: string) => number,
  /** Nhân sự team Content — để cộng thêm phần KPI Facebook Ads chia riêng cho họ. */
  staffNames: string[] = [],
): Map<string, number> {
  const out = new Map<string, number>();
  const add = (key: string, target: number) => {
    if (!target) return;
    out.set(key, (out.get(key) ?? 0) + target);
  };
  // Kênh thường: chỉ tiêu về tay người phụ trách kênh.
  channels.forEach((c) => {
    if (isRevenueBucket(c)) return;                 // Facebook Ads tính riêng bên dưới
    add(norm(managerOf(c)), chTargetOf(norm(c.name)));
  });
  // Facebook Ads: mỗi người một phần KPI riêng (dòng 'facebookads:<tên>').
  staffNames.forEach((n) => add(norm(n), chTargetOf(fbAdsShareKey(n))));
  return out;
}


// ════════════════════════════════════════════════════════════════════════════
//  BẢNG PHÂN RÃ THEO NHÂN VIÊN — nguồn của tab "Theo nhân viên" ở Tổng quan
//
//  Một hàm duy nhất trả về: mỗi người · tổng KPI · tổng thực hiện · và CHI TIẾT
//  TỪNG KÊNH họ cầm (kèm phần chia Facebook Ads). Nhờ vậy màn hình chỉ việc vẽ,
//  không phải tự cộng lại — và số ở tab "Theo kênh" với tab "Theo nhân viên"
//  không thể lệch nhau.
//
//  Quy tắc số (chốt với user):
//    • KPI của người   = tổng KPI các kênh họ phụ trách + phần Facebook Ads của họ
//    • Thực hiện       = tổng doanh thu các kênh đó + phần Facebook Ads được chia
//    • Facebook Ads    = 1 cục doanh thu chung, chia theo ĐÚNG tỉ lệ KPI mỗi người
//  Kênh chưa gán người / doanh thu chưa chia được gom vào dòng "Chưa gán" để
//  tổng các dòng luôn bằng tổng doanh thu team.
// ════════════════════════════════════════════════════════════════════════════

/** 1 dòng chi tiết trong phần của một nhân viên. */
export type EmployeeLine = {
  key: string;
  name: string;
  target: number;
  total: number;
  weeks: number[];
  kind: 'channel' | 'fbads' | 'other';
};

/** 1 nhân viên: tổng KPI · tổng thực hiện · chi tiết từng kênh. */
export type EmployeeRow = {
  key: string;
  name: string;
  target: number;
  total: number;
  weeks: number[];
  lines: EmployeeLine[];
};

export function employeeBreakdown(
  employees: Employee[],
  channels: AffiliateChannel[],
  monthReports: DailyReport[],
  weekOf: (r: DailyReport) => number,
  chTargetOf: (chKey: string) => number,
): { rows: EmployeeRow[]; unassigned: EmployeeRow } {
  const actual = revenueByChannel(monthReports, weekOf);
  const rowMap = new Map<string, EmployeeRow>();
  const blank = (key: string, name: string): EmployeeRow =>
    ({ key, name, target: 0, total: 0, weeks: [0, 0, 0, 0], lines: [] });

  const rowOf = (name: string) => {
    const key = norm(name);
    const cur = rowMap.get(key) ?? blank(key, name);
    rowMap.set(key, cur);
    return cur;
  };
  const unassigned = blank(UNASSIGNED_KEY, UNASSIGNED_LABEL);
  const bucketOf = (name: string) => (norm(name) ? rowOf(name) : unassigned);

  // Có mặt sẵn mọi nhân sự để người chưa có kênh nào vẫn hiện (KPI 0).
  contentEmployeeRoster(employees, channels).forEach((e) => rowOf(e.name));

  // ── Kênh thường ──
  const seen = new Set<string>([FB_ADS_KEY]);
  channels.forEach((c) => {
    if (isRevenueBucket(c)) return;                 // Facebook Ads xử lý riêng bên dưới
    const key = norm(c.name);
    seen.add(key);
    const got = actual.get(key);
    const target = chTargetOf(key);
    if (!target && !got) return;                    // không KPI, không doanh thu → bỏ cho gọn
    bucketOf(managerOf(c)).lines.push({
      key, name: c.name, target,
      total: got?.total ?? 0, weeks: got?.weeks ?? [0, 0, 0, 0], kind: 'channel',
    });
  });

  // ── Facebook Ads: chia cục doanh thu chung theo tỉ lệ KPI từng người ──
  const pool = actual.get(FB_ADS_KEY) ?? { total: 0, weeks: [0, 0, 0, 0] };
  const staffNames = contentStaff(employees).map((e) => e.name);
  const weights = staffNames.map((n) => chTargetOf(fbAdsShareKey(n)));
  const shareTotals = allocateByWeights(pool.total, weights);
  const shareWeeks = pool.weeks.map((w) => allocateByWeights(w, weights));
  staffNames.forEach((n, i) => {
    if (!weights[i] && !shareTotals[i]) return;
    rowOf(n).lines.push({
      key: fbAdsShareKey(n), name: 'Facebook Ads (phần chia)', target: weights[i],
      total: shareTotals[i], weeks: shareWeeks.map((w) => w[i]), kind: 'fbads',
    });
  });
  const leftover = pool.total - shareTotals.reduce((s, v) => s + v, 0);
  if (leftover > 0) {
    unassigned.lines.push({
      key: 'fbads-chuachia', name: 'Facebook Ads — chưa chia cho ai', target: 0, total: leftover,
      weeks: pool.weeks.map((w, wi) => w - shareWeeks[wi].reduce((s, v) => s + v, 0)), kind: 'fbads',
    });
  }

  // ── Doanh thu của kênh không còn trong danh sách kênh → không được rơi mất ──
  actual.forEach((v, key) => {
    if (seen.has(key)) return;
    unassigned.lines.push({ key, name: key, target: 0, total: v.total, weeks: v.weeks, kind: 'other' });
  });

  const finish = (r: EmployeeRow) => {
    r.target = r.lines.reduce((s, l) => s + l.target, 0);
    r.total = r.lines.reduce((s, l) => s + l.total, 0);
    r.weeks = [0, 1, 2, 3].map((i) => r.lines.reduce((s, l) => s + (l.weeks[i] ?? 0), 0));
    r.lines.sort((a, b) => b.target - a.target || b.total - a.total);
    return r;
  };

  const rows = [...rowMap.values()]
    .map(finish)
    .filter((r) => r.target > 0 || r.total > 0)
    .sort((a, b) => {
      const pa = a.target > 0 ? a.total / a.target : -1;
      const pb = b.target > 0 ? b.total / b.target : -1;
      return pb - pa || b.total - a.total;
    });

  return { rows, unassigned: finish(unassigned) };
}
