/**
 * Chuyển đổi giữa hàng dữ liệu Supabase (snake_case, khớp 0001_init.sql)
 * và kiểu TypeScript dùng trong UI (src/types.ts).
 *
 * Giữ UI nguyên vẹn: mọi khác biệt cấu trúc (ngày dd/mm/yyyy, linkedShop,
 * traffic gộp/tách...) đều được quy đổi tại đây.
 */
import type { Database } from '@/lib/supabase/types';
import {
  AffiliateChannel,
  DailyReport,
  Employee,
  TeamTarget,
  AuditLog,
  FbPage,
} from '../types';

type ChannelRow = Database['public']['Tables']['channels']['Row'];
type ReportRow = Database['public']['Tables']['daily_reports']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type TargetRow = Database['public']['Tables']['targets']['Row'];
type LogRow = Database['public']['Tables']['audit_logs']['Row'];
type FbPageRow = Database['public']['Tables']['fb_pages']['Row'];

/**
 * Quy ước nguồn doanh thu (source_platform) suy từ loại kênh của báo cáo.
 * Dùng làm 1 phần khóa UNIQUE(channel_id, report_date, source_platform) cho upsert.
 *  • TikTok (mọi loại) → 'tiktok_shop'
 *  • Facebook KOC inhouse (doanh thu Shopee) → 'shopee'
 *  • Còn lại (vd Facebook thương hiệu chỉ traffic) → 'manual'
 */
export function sourcePlatformFor(channelType: string): string {
  if (channelType.startsWith('TikTok')) return 'tiktok_shop';
  if (channelType === 'Facebook - KOC') return 'shopee';
  return 'manual';
}

// ── Ngày tháng ────────────────────────────────────────────────
/** "24/10/2023" → "2023-10-24" (kiểu DATE của Postgres). Nếu đã ISO thì giữ nguyên. */
export function toDbDate(ui: string): string {
  if (!ui) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(ui)) return ui.slice(0, 10);
  const [d, m, y] = ui.split('/');
  if (!d || !m || !y) return ui;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** "2023-10-24" → "24/10/2023" (định dạng hiển thị). */
export function toUiDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Báo cáo còn sửa được nếu cách hôm nay < 3 ngày. */
function computeEditable(isoDate: string): boolean {
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return false;
  const diffDays = (Date.now() - t) / 86_400_000;
  return diffDays < 3;
}

// ── linkedShop (boolean | 'disconnected') ↔ text ──────────────
function linkedShopToUi(v: ChannelRow['linked_shop']): AffiliateChannel['linkedShop'] {
  if (v === 'disconnected') return 'disconnected';
  return v === 'true';
}
function linkedShopToDb(v: AffiliateChannel['linkedShop']): ChannelRow['linked_shop'] {
  if (v === 'disconnected') return 'disconnected';
  return v ? 'true' : 'false';
}

// ── CHANNELS ──────────────────────────────────────────────────
export function channelFromRow(r: ChannelRow): AffiliateChannel {
  return {
    id: r.id,
    name: r.name,
    brandCategory: r.brand_category ?? '',
    platform: r.platform,
    channelType: r.channel_type,
    linkedShop: linkedShopToUi(r.linked_shop),
    auditId: r.audit_id ?? '',
    managerName: r.manager_name ?? '',
    managerAvatar: r.manager_avatar ?? '',
    status: r.status,
    tracking: { revenueActive: r.track_revenue, trafficActive: r.track_traffic },
  };
}

export function channelToInsert(
  c: AffiliateChannel,
  teamId: string | null = null,
  managerId: string | null = null,
): Database['public']['Tables']['channels']['Insert'] {
  return {
    name: c.name,
    brand_category: c.brandCategory || null,
    platform: c.platform,
    channel_type: c.channelType,
    linked_shop: linkedShopToDb(c.linkedShop),
    audit_id: c.auditId || null,
    manager_id: managerId,
    manager_name: c.managerName || null,
    manager_avatar: c.managerAvatar || null,
    status: c.status,
    track_revenue: c.tracking.revenueActive,
    track_traffic: c.tracking.trafficActive,
    team_id: teamId,
  };
}

// ── DAILY REPORTS ─────────────────────────────────────────────
export function reportFromRow(r: ReportRow): DailyReport {
  const hasTraffic =
    r.views_reach != null ||
    r.comment != null ||
    r.like_count != null ||
    r.share != null;
  const traffic: DailyReport['traffic'] = hasTraffic
    ? {
        viewsReach: r.views_reach ?? 0,
        comment: r.comment ?? 0,
        like: r.like_count ?? 0,
        share: r.share ?? 0,
        save: r.save_count ?? 0,
        viewAllRate: r.view_all_rate ?? 0,
        avgViewDuration: r.avg_view_duration ?? 0,
        followerIncr: r.follower_incr ?? 0,
      }
    : null;
  const interactions = traffic
    ? traffic.comment + traffic.like + traffic.share
    : null;
  return {
    id: r.id,
    date: toUiDate(r.report_date),
    channelName: r.channel_name ?? '',
    channelType: r.channel_type ?? '',
    revenue: r.revenue,
    views: r.views_reach,
    interactions,
    source: (r.created_by_role === 'Admin' ? 'Admin' : 'Nhân viên'),
    isEditable: computeEditable(r.report_date),
    traffic,
    note: r.note,
  };
}

export function reportToInsert(
  rep: DailyReport,
  createdBy: string,
  channelId: string,
): Database['public']['Tables']['daily_reports']['Insert'] {
  const t = rep.traffic;
  return {
    report_date: toDbDate(rep.date),
    channel_id: channelId,
    channel_name: rep.channelName || null,
    channel_type: rep.channelType || null,
    revenue: rep.revenue,
    source_platform: sourcePlatformFor(rep.channelType),
    created_by: createdBy,
    created_by_role: rep.source,
    views_reach: t ? t.viewsReach : rep.views,
    comment: t ? t.comment : null,
    like_count: t ? t.like : null,
    share: t ? t.share : null,
    save_count: t ? t.save : null,
    view_all_rate: t ? t.viewAllRate : null,
    avg_view_duration: t ? t.avgViewDuration : null,
    follower_incr: t ? t.followerIncr : null,
    note: rep.note ?? null,
  };
}

// ── PROFILES ↔ Employee ───────────────────────────────────────
export function employeeFromRow(r: ProfileRow): Employee {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    department: r.department ?? '',
    status: r.status,
    channelCount: r.channel_count,
    avatar: r.avatar ?? '',
  };
}

// ── TARGETS ───────────────────────────────────────────────────
export function targetFromRow(r: TargetRow): TeamTarget {
  return {
    id: r.id,
    employeeName: r.employee_name,
    employeeRole: (r.employee_role as TeamTarget['employeeRole']) ?? 'NV',
    department: r.department ?? '',
    targetRevenue: r.target_revenue,
    achievedRevenue: r.achieved_revenue,
    avatar: r.avatar ?? '',
  };
}

export function targetToInsert(
  t: TeamTarget,
  createdBy: string | null = null,
): Database['public']['Tables']['targets']['Insert'] {
  return {
    employee_id: null,
    employee_name: t.employeeName,
    employee_role: t.employeeRole,
    department: t.department || null,
    month: null,
    target_revenue: t.targetRevenue,
    achieved_revenue: t.achievedRevenue,
    avatar: t.avatar || null,
    created_by: createdBy,
  };
}

// ── FB PAGES ──────────────────────────────────────────────────
// shopeeChannelId (UI) = channel_id (DB) của nhóm ID Shopee KOC inhouse.
// addedBy (UI, tên hiển thị) ↔ added_by_name (DB); added_by (UUID) chỉ để FK/RLS.
export function fbPageFromRow(r: FbPageRow): FbPage {
  return {
    id: r.id,
    shopeeChannelId: r.channel_id,
    name: r.name,
    addedBy: r.added_by_name ?? '',
  };
}

export function fbPageToInsert(
  p: FbPage,
  addedById: string | null,
): Database['public']['Tables']['fb_pages']['Insert'] {
  return {
    channel_id: p.shopeeChannelId,
    name: p.name,
    added_by: addedById,
    added_by_name: p.addedBy || null,
  };
}

// ── AUDIT LOGS ────────────────────────────────────────────────
export function logFromRow(r: LogRow): AuditLog {
  return {
    id: r.id,
    timestamp: r.ts.replace('T', ' ').substring(0, 19),
    operator: r.operator,
    action: r.action,
    ipAddress: r.ip_address ?? '',
    module: r.module,
  };
}
