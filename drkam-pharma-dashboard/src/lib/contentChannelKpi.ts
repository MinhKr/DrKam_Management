/**
 * BẢNG KPI MỚI — CHI TIẾT THEO TỪNG KÊNH (migration 0020).
 *
 * Bảng KPI cũ (src/lib/contentKpi.ts) có 13 hạng mục CỐ ĐỊNH trong code, trong
 * đó "TikTok AI" gộp chung mọi kênh AI nên không theo dõi được từng kênh. Bảng
 * mới ở đây lấy thẳng danh sách KÊNH ĐANG QUẢN LÝ (tab Quản lý kênh) — thêm
 * kênh mới là tự có dòng KPI, không phải sửa code.
 *
 * Hai bảng CHẠY SONG SONG (chốt với user): số KPI cũ giữ nguyên trong DB để đối
 * chiếu, không mất dữ liệu. Chúng dùng item_id khác nhau nên không đè nhau:
 *   • cũ  — item_id là id hạng mục ('ttai', 'fbads'…), kind='revenue'
 *   • mới — item_id = 'ch:<tên kênh chuẩn hoá>',        kind='channel'
 * Nhờ vậy tổng KPI cũ ở Tổng quan không bị cộng nhầm số của bảng mới.
 *
 * Kênh nào có mặt: kênh đang bật theo dõi doanh thu (tracking.revenueActive) —
 * đúng tập kênh có thể đổ doanh thu vào báo cáo ngày. Fanpage thương hiệu chỉ
 * đo reach nên không nằm ở đây.
 */
import { AffiliateChannel, ContentKpiTarget, DailyReport } from '../types';
import { norm, BadgeKind } from './contentKpi';
import { isRevenueBucket, isShopeeIdGroup, managerOf } from './channels';

/** Tiền tố id hạng mục KPI theo kênh — tách khỏi hạng mục bảng cũ và KPI nhân viên. */
export const CH_ITEM_PREFIX = 'ch:';

/** id hạng mục KPI của một kênh (khớp bằng TÊN đã chuẩn hoá, như mọi chỗ khác). */
export const channelItemId = (name: string) => `${CH_ITEM_PREFIX}${norm(name)}`;

/** Dòng KPI này là chỉ tiêu của một kênh? */
export const isChannelItem = (itemId: string) => itemId.startsWith(CH_ITEM_PREFIX);

export type ChannelGroupKey = 'tt-brand' | 'tt-koc' | 'tt-ai' | 'fb-ai' | 'fb-ads' | 'other';

/** Nhóm kênh — thứ tự trong mảng cũng là thứ tự hiển thị. */
export const CHANNEL_GROUPS: { key: ChannelGroupKey; label: string; badge: BadgeKind }[] = [
  { key: 'tt-brand', label: 'TikTok thương hiệu', badge: 'tiktok' },
  { key: 'tt-koc', label: 'TikTok KOC', badge: 'koc' },
  { key: 'tt-ai', label: 'TikTok AI', badge: 'tiktok' },
  { key: 'fb-ai', label: 'Facebook AI (ID Shopee)', badge: 'fb' },
  { key: 'fb-ads', label: 'Facebook Ads', badge: 'fb' },
  { key: 'other', label: 'Khác', badge: 'other' },
];

/** Kênh này thuộc nhóm nào (dùng lại đúng cách phân loại của lib/channels). */
export function channelGroupOf(c: AffiliateChannel): ChannelGroupKey {
  if (isRevenueBucket(c)) return 'fb-ads';
  if (isShopeeIdGroup(c)) return 'fb-ai';
  if (c.platform === 'TikTok') {
    return c.channelType === 'Brand' ? 'tt-brand' : c.channelType === 'AI KOC' ? 'tt-ai' : 'tt-koc';
  }
  return 'other';
}

export type ChannelKpiRow = {
  key: string;          // tên kênh đã chuẩn hoá — khoá khớp với báo cáo
  itemId: string;       // 'ch:<key>'
  name: string;         // tên kênh hiển thị
  manager: string;      // người phụ trách (có thể rỗng)
  group: ChannelGroupKey;
  badge: BadgeKind;
};

// ════════════════════════════════════════════════════════════════════════════
//  FACEBOOK ADS — MỘT DÒNG KPI GỘP (chốt lại với user 20/08/2026)
//
//  Doanh thu Facebook Ads nhập 1 số/ngày ở mục Facebook > Facebook Ads và KPI
//  cũng để GỘP một dòng, KHÔNG chia cho từng thành viên: KPI của mỗi nhân viên
//  chỉ tính từ các KÊNH họ phụ trách. Vì kênh gộp này không thuộc về ai nên ở
//  màn "Theo nhân viên" nó nằm tại dòng "Chưa gán người phụ trách".
// ════════════════════════════════════════════════════════════════════════════

/** Khoá kênh gộp Facebook Ads (= norm('Facebook Ads')). */
export const FB_ADS_KEY = 'facebookads';

/**
 * Danh sách kênh có KPI doanh thu, xếp theo nhóm rồi theo tên.
 * `extraNames` là tên kênh xuất hiện trong báo cáo nhưng không còn bật doanh thu
 * (hoặc đã xoá khỏi danh sách kênh) — truyền vào để Tổng quan vẫn hiện dòng đó,
 * không "nuốt" doanh thu đã nhập.
 */
export function channelKpiRows(
  channels: AffiliateChannel[],
  extraNames: string[] = [],
): ChannelKpiRow[] {
  const rows = new Map<string, ChannelKpiRow>();
  const push = (c: AffiliateChannel) => {
    const key = norm(c.name);
    if (!key || rows.has(key)) return;
    const group = channelGroupOf(c);
    rows.set(key, {
      key,
      itemId: channelItemId(c.name),
      name: c.name,
      manager: managerOf(c),
      group,
      badge: CHANNEL_GROUPS.find((g) => g.key === group)!.badge,
    });
  };

  channels.filter((c) => c.tracking.revenueActive).forEach(push);
  // Kênh đã tắt doanh thu nhưng tháng đang xem vẫn có số → vẫn phải hiện.
  const known = new Set(rows.keys());
  extraNames.forEach((n) => {
    const key = norm(n);
    if (!key || known.has(key) || rows.has(key)) return;
    const c = channels.find((x) => norm(x.name) === key);
    if (c) { push(c); return; }
    rows.set(key, { key, itemId: channelItemId(n), name: n, manager: '', group: 'other', badge: 'other' });
  });

  const order = new Map(CHANNEL_GROUPS.map((g, i) => [g.key, i]));
  return [...rows.values()].sort(
    (a, b) => (order.get(a.group)! - order.get(b.group)!) || a.name.localeCompare(b.name, 'vi'),
  );
}

/**
 * KPI của những KÊNH ĐÃ BỊ XOÁ (hoặc đổi tên) — chỉ tiêu vẫn nằm trong DB vì
 * item_id khớp theo TÊN kênh, nhưng kênh không còn trong danh sách nên bảng KPI
 * và Tổng quan sẽ không dựng được dòng cho nó.
 *
 * Nếu bỏ qua, con số đó BIẾN MẤT ÂM THẦM khỏi tổng KPI tháng — người dùng không
 * hiểu vì sao tổng hụt. Vì vậy vẫn dựng dòng (nhóm "Khác", nhãn lấy từ tên đã
 * lưu lúc đặt KPI) để nhìn thấy và sửa/đưa về 0 được.
 *
 * `existingKeys` là các kênh đã có dòng — tránh dựng trùng.
 */
export function deletedChannelKpiRows(
  targets: ContentKpiTarget[],
  period: string,
  existingKeys: Set<string>,
): ChannelKpiRow[] {
  return targets
    .filter((t) => t.period === period && isChannelItem(t.itemId) && t.targetValue > 0)
    .map((t) => ({ key: t.itemId.slice(CH_ITEM_PREFIX.length), label: t.itemLabel }))
    .filter((x) => x.key && !existingKeys.has(x.key))
    .map((x) => ({
      key: x.key,
      itemId: CH_ITEM_PREFIX + x.key,
      name: x.label || x.key,
      manager: '',
      group: 'other' as ChannelGroupKey,
      badge: 'other' as BadgeKind,
    }));
}

/**
 * Chỉ tiêu tháng của từng kênh ở BẢNG MỚI (0 = chưa đặt).
 * Không có số mặc định trong code: bảng mới là bảng đặt lại từ đầu, đoán bừa sẽ
 * làm % đạt sai — chưa đặt thì hiện "—".
 */
export function channelTargetResolver(
  targets: ContentKpiTarget[],
  period: string,
): (chKey: string) => number {
  const saved = new Map(
    targets
      .filter((t) => t.period === period && isChannelItem(t.itemId))
      .map((t) => [t.itemId.slice(CH_ITEM_PREFIX.length), t.targetValue]),
  );
  return (chKey: string) => saved.get(chKey) ?? 0;
}

/**
 * KPI Facebook Ads của một tháng ở BẢNG MỚI (dòng gộp 'ch:facebookads').
 * Dùng cho màn Facebook > Facebook Ads để đối chiếu đúng con số đang giao;
 * 0 = tháng đó chưa đặt ở bảng mới.
 */
export function fbAdsTotalTarget(targets: ContentKpiTarget[], period: string): number {
  const itemId = `${CH_ITEM_PREFIX}${FB_ADS_KEY}`;
  return targets.find((t) => t.period === period && t.itemId === itemId)?.targetValue ?? 0;
}

/** Bảng mới của tháng này đã được thiết lập chưa. */
export const hasChannelTargets = (targets: ContentKpiTarget[], period: string): boolean =>
  targets.some((t) => t.period === period && isChannelItem(t.itemId));

/**
 * Doanh thu thực hiện theo TÊN KÊNH (khoá = tên chuẩn hoá) trong một tập báo cáo.
 * `weekOf` trả về tuần 0–3 của báo cáo — truyền từ nơi gọi để dùng chung quy ước
 * chia tuần với bảng cũ (T1 1–7 · T2 8–14 · T3 15–21 · T4 22–cuối tháng).
 */
export function revenueByChannel(
  reports: DailyReport[],
  weekOf: (r: DailyReport) => number,
): Map<string, { total: number; weeks: number[] }> {
  const out = new Map<string, { total: number; weeks: number[] }>();
  reports.forEach((r) => {
    if (!r.revenue) return;
    const key = norm(r.channelName);
    const cur = out.get(key) ?? { total: 0, weeks: [0, 0, 0, 0] };
    cur.total += r.revenue;
    const wi = weekOf(r);
    if (wi >= 0 && wi < 4) cur.weeks[wi] += r.revenue;
    out.set(key, cur);
  });
  return out;
}
