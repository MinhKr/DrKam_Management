/**
 * KPI DOANH THU THEO NHÂN VIÊN — TEAM CONTENT (migration 0019).
 *
 * Ngoài chỉ tiêu theo KÊNH (src/lib/contentKpi.ts), mỗi nhân viên team Content
 * còn có chỉ tiêu DOANH THU RIÊNG theo bảng KPIs của công ty (Content TikTok
 * 240tr · Fanpage + SEO 240tr · Marketing AI 80tr…). Số này lưu CHUNG bảng
 * content_kpi_targets với kind = 'employee', item_id = 'emp:<tên chuẩn hoá>'.
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
import { AffiliateChannel, ContentKpiTarget, DailyReport, Employee } from '../types';
import { norm, CONTENT_LINE_ITEMS } from './contentKpi';
import { managerOf } from './channels';

/** Tiền tố id hạng mục KPI nhân viên — để tách khỏi hạng mục theo kênh. */
export const EMP_ITEM_PREFIX = 'emp:';

/** id hạng mục KPI của một nhân viên (khớp bằng TÊN đã chuẩn hoá). */
export const employeeItemId = (name: string) => `${EMP_ITEM_PREFIX}${norm(name)}`;

/** Dòng KPI này là chỉ tiêu của một nhân viên? */
export const isEmployeeItem = (itemId: string) => itemId.startsWith(EMP_ITEM_PREFIX);

/** Khoá của dòng doanh thu không xác định được người phụ trách. */
export const UNASSIGNED_KEY = '';
export const UNASSIGNED_LABEL = 'Chưa gán người phụ trách';

export type ContentEmployee = { key: string; name: string };

/**
 * Danh sách nhân sự có KPI doanh thu.
 *
 * Gộp 3 nguồn để không sót ai mà cũng không kéo cả công ty vào:
 *   1. Người đang phụ trách kênh — nguồn chuẩn của doanh thu thực hiện;
 *   2. Nhân sự có phòng ban chứa chữ "Content" — người chưa được giao kênh nào;
 *   3. Người đã từng được đặt KPI — giữ dòng cũ dù kênh đã chuyển cho người khác.
 */
export function contentEmployeeRoster(
  employees: Employee[],
  channels: AffiliateChannel[],
  targets: ContentKpiTarget[] = [],
): ContentEmployee[] {
  const byKey = new Map<string, string>();
  const add = (name: string | undefined) => {
    const n = (name ?? '').trim();
    const k = norm(n);
    if (k && !byKey.has(k)) byKey.set(k, n);
  };

  channels.forEach((c) => add(managerOf(c)));
  employees
    .filter((e) => e.status !== 'Đã khóa' && norm(e.department).includes('content'))
    .forEach((e) => add(e.name));
  targets.filter((t) => isEmployeeItem(t.itemId)).forEach((t) => add(t.itemLabel));

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
 * Gợi ý chỉ tiêu từng người = cộng chỉ tiêu các hạng mục KÊNH người đó phụ trách.
 * Hạng mục gộp nhiều kênh của nhiều người (vd "TikTok AI") được CHIA ĐỀU theo số
 * kênh mỗi người, nên tổng gợi ý ≈ tổng KPI theo kênh. Chỉ là số nháp — vẫn phải
 * bấm "Lưu KPI" mới ghi.
 */
export function suggestEmployeeTargets(
  channels: AffiliateChannel[],
  targetOf: (itemId: string) => number,
): Map<string, number> {
  const sum = new Map<string, number>();
  CONTENT_LINE_ITEMS.forEach((li) => {
    const target = targetOf(li.id);
    if (!target) return;
    // Kênh thuộc hạng mục này — dùng báo cáo giả để tái dùng đúng luật match của hạng mục.
    const owners = channels
      .filter((c) => li.match(c, { channelName: c.name } as DailyReport))
      .map((c) => norm(managerOf(c)))
      .filter(Boolean);
    if (owners.length === 0) return;
    const share = target / owners.length;
    owners.forEach((k) => sum.set(k, (sum.get(k) ?? 0) + share));
  });
  return new Map([...sum].map(([k, v]) => [k, Math.round(v)]));
}

/**
 * Chỉ tiêu đang áp dụng của một nhân viên trong tháng (0 = chưa đặt).
 * KHÔNG có số mặc định trong code: KPI theo người là số công ty giao từng tháng,
 * đoán bừa sẽ ra tiến độ sai — chưa đặt thì màn hình hiện "chưa thiết lập".
 */
export function employeeTargetResolver(
  targets: ContentKpiTarget[],
  period: string,
): (empKey: string) => number {
  const saved = new Map(
    targets
      .filter((t) => t.period === period && isEmployeeItem(t.itemId))
      .map((t) => [t.itemId.slice(EMP_ITEM_PREFIX.length), t.targetValue]),
  );
  return (empKey: string) => saved.get(empKey) ?? 0;
}
