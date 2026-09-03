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
import { managerOf } from './channels';
import { revenueByChannel } from './contentChannelKpi';
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
): Map<string, { total: number; weeks: number[] }> {
  const chByName = new Map(channels.map((c) => [c.name, c]));
  const out = new Map<string, { total: number; weeks: number[] }>();
  reports.forEach((r) => {
    if (!r.revenue) return;
    const ch = chByName.get(r.channelName);
    const key = ch ? norm(managerOf(ch)) : UNASSIGNED_KEY;
    const cur = out.get(key) ?? { total: 0, weeks: [0, 0, 0, 0] };
    cur.total += r.revenue;
    const wi = weekOf(r);
    if (wi >= 0 && wi < 4) cur.weeks[wi] += r.revenue;
    out.set(key, cur);
  });
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
): Map<string, number> {
  const out = new Map<string, number>();
  channels.forEach((c) => {
    const target = chTargetOf(norm(c.name));
    if (!target) return;
    // Kênh chưa gán ai (kể cả kênh gộp Facebook Ads) rơi vào khoá '' — "Chưa gán".
    const key = norm(managerOf(c));
    out.set(key, (out.get(key) ?? 0) + target);
  });
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
//    • KPI của người   = tổng KPI các KÊNH họ phụ trách
//    • Thực hiện       = tổng doanh thu các kênh đó
//    • Facebook Ads là kênh GỘP, không thuộc về ai → nằm ở dòng "Chưa gán"
//  Mọi kênh chưa gán người đều gom vào dòng "Chưa gán" nên tổng các dòng luôn
//  bằng tổng doanh thu team.
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

  // ── Từng kênh (kênh gộp Facebook Ads cũng chỉ là một kênh chưa gán ai) ──
  const seen = new Set<string>();
  channels.forEach((c) => {
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

  // ── Doanh thu của kênh không còn trong danh sách kênh → không được rơi mất ──
  actual.forEach((v, key) => {
    if (seen.has(key)) return;
    // Kênh đã xoá/đổi tên: chỉ tiêu vẫn tra được theo tên nên cộng luôn vào dòng
    // "Chưa gán" — tổng mục tiêu không bị hụt so với bảng Theo kênh.
    unassigned.lines.push({ key, name: key, target: chTargetOf(key), total: v.total, weeks: v.weeks, kind: 'other' });
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
