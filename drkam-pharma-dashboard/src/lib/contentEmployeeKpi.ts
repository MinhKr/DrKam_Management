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
import { allocateByWeights, fbAdsShareKey } from './contentChannelKpi';
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
