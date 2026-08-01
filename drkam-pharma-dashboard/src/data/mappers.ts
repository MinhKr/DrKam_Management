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
  ChecklistItem,
  MediaTaskLog,
  MediaKpiEntry,
  MediaImprovement,
  AdsFbTaskLog,
  AdsFbTarget,
} from '../types';

type ChannelRow = Database['public']['Tables']['channels']['Row'];
type ReportRow = Database['public']['Tables']['daily_reports']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type TargetRow = Database['public']['Tables']['targets']['Row'];
type LogRow = Database['public']['Tables']['audit_logs']['Row'];
type FbPageRow = Database['public']['Tables']['fb_pages']['Row'];
type ChecklistRow = Database['public']['Tables']['content_checklists']['Row'];
type MediaLogRow = Database['public']['Tables']['media_task_logs']['Row'];
type MediaKpiRow = Database['public']['Tables']['media_kpi_entries']['Row'];
type MediaImprovementRow = Database['public']['Tables']['media_improvements']['Row'];
type AdsFbLogRow = Database['public']['Tables']['ads_fb_task_logs']['Row'];
type AdsFbTargetRow = Database['public']['Tables']['ads_fb_targets']['Row'];

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
    videoCount: r.video_count,
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
    video_count: rep.videoCount ?? null,
  };
}

// ── PROFILES ↔ Employee ───────────────────────────────────────
// Avatar dự phòng (data-URI) khi hồ sơ chưa có ảnh — tránh <img src="">
// (tài khoản tạo qua Supabase Auth chưa gán avatar). Sinh vòng tròn chữ cái đầu.
function initialsAvatar(name: string): string {
  const initials =
    name.trim().split(/\s+/).slice(-2).map((w) => w[0] || '').join('').toUpperCase() || '?';
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>` +
    `<rect width='64' height='64' rx='32' fill='#D32027'/>` +
    `<text x='50%' y='50%' dy='.35em' text-anchor='middle' font-family='Arial,sans-serif' font-size='26' font-weight='bold' fill='white'>${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function employeeFromRow(r: ProfileRow): Employee {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    department: r.department ?? '',
    status: r.status,
    channelCount: r.channel_count,
    avatar: r.avatar || initialsAvatar(r.name),
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

// ── CHECKLIST TEAM CONTENT ────────────────────────────────────
export function checklistFromRow(r: ChecklistRow): ChecklistItem {
  return {
    id: r.id,
    date: toUiDate(r.checklist_date),
    employeeId: r.employee_id,
    employeeName: r.employee_name ?? '',
    label: r.label,
    quantity: r.quantity,
    note: r.note ?? undefined,
    createdBy: r.created_by ?? undefined,
  };
}

export function checklistToInsert(
  item: ChecklistItem,
  createdBy: string,
): Database['public']['Tables']['content_checklists']['Insert'] {
  return {
    checklist_date: toDbDate(item.date),
    employee_id: item.employeeId,
    employee_name: item.employeeName || '',
    label: item.label,
    quantity: item.quantity,
    note: item.note ?? null,
    created_by: createdBy,
  };
}

// ── MEDIA: BÁO CÁO NGÀY (dòng công việc) ──────────────────────
export function mediaLogFromRow(r: MediaLogRow): MediaTaskLog {
  return {
    id: r.id,
    date: toUiDate(r.log_date),
    employeeId: r.employee_id,
    employeeName: r.employee_name ?? '',
    contentType: r.content_type ?? 'Khác',
    scriptNo: r.script_no ?? undefined,
    task: r.task ?? '',
    quantity: r.quantity,
    progress: r.progress,
    productLink: r.product_link ?? undefined,
    note: r.note ?? undefined,
    approval: r.approval ?? undefined,
  };
}

export function mediaLogToInsert(
  item: MediaTaskLog,
  createdBy: string,
): Database['public']['Tables']['media_task_logs']['Insert'] {
  return {
    log_date: toDbDate(item.date),
    employee_id: item.employeeId,
    employee_name: item.employeeName || '',
    content_type: item.contentType || 'Khác',
    script_no: item.scriptNo ?? null,
    task: item.task || '',
    quantity: item.quantity ?? null,
    progress: item.progress,
    product_link: item.productLink ?? null,
    note: item.note ?? null,
    approval: item.approval ?? null,
    created_by: createdBy,
  };
}

export function mediaLogToUpdate(
  patch: Partial<MediaTaskLog>,
): Database['public']['Tables']['media_task_logs']['Update'] {
  const u: Database['public']['Tables']['media_task_logs']['Update'] = {};
  if (patch.date !== undefined) u.log_date = toDbDate(patch.date);
  if (patch.employeeName !== undefined) u.employee_name = patch.employeeName;
  if (patch.contentType !== undefined) u.content_type = patch.contentType;
  if (patch.scriptNo !== undefined) u.script_no = patch.scriptNo ?? null;
  if (patch.task !== undefined) u.task = patch.task;
  if (patch.quantity !== undefined) u.quantity = patch.quantity ?? null;
  if (patch.progress !== undefined) u.progress = patch.progress;
  if (patch.productLink !== undefined) u.product_link = patch.productLink ?? null;
  if (patch.note !== undefined) u.note = patch.note ?? null;
  if (patch.approval !== undefined) u.approval = patch.approval ?? null;
  return u;
}

// ── MEDIA: KPI THÁNG ──────────────────────────────────────────
export function mediaKpiFromRow(r: MediaKpiRow): MediaKpiEntry {
  return {
    id: r.id,
    period: r.period,
    employeeId: r.employee_id,
    employeeName: r.employee_name ?? '',
    roleScope: r.role_scope,
    stt: r.stt,
    groupName: r.group_name ?? '',
    metric: r.metric ?? '',
    targetValue: r.target_value,
    unit: r.unit,
    weight: r.weight,
    actualValue: r.actual_value,
    completionPct: r.completion_pct ?? 100,
    note: r.note ?? undefined,
  };
}

export function mediaKpiToInsert(
  e: MediaKpiEntry,
  createdBy: string,
): Database['public']['Tables']['media_kpi_entries']['Insert'] {
  return {
    period: e.period,
    employee_id: e.employeeId,
    employee_name: e.employeeName || '',
    role_scope: e.roleScope,
    stt: e.stt,
    group_name: e.groupName || '',
    metric: e.metric || '',
    target_value: e.targetValue,
    unit: e.unit,
    weight: e.weight,
    actual_value: e.actualValue,
    completion_pct: e.completionPct ?? 100,
    note: e.note ?? null,
    created_by: createdBy,
  };
}

export function mediaKpiToUpdate(
  patch: Partial<MediaKpiEntry>,
): Database['public']['Tables']['media_kpi_entries']['Update'] {
  const u: Database['public']['Tables']['media_kpi_entries']['Update'] = {};
  if (patch.period !== undefined) u.period = patch.period;
  if (patch.employeeName !== undefined) u.employee_name = patch.employeeName;
  if (patch.roleScope !== undefined) u.role_scope = patch.roleScope;
  if (patch.stt !== undefined) u.stt = patch.stt;
  if (patch.groupName !== undefined) u.group_name = patch.groupName;
  if (patch.metric !== undefined) u.metric = patch.metric;
  if (patch.targetValue !== undefined) u.target_value = patch.targetValue;
  if (patch.unit !== undefined) u.unit = patch.unit;
  if (patch.weight !== undefined) u.weight = patch.weight;
  if (patch.actualValue !== undefined) u.actual_value = patch.actualValue;
  if (patch.completionPct !== undefined) u.completion_pct = patch.completionPct;
  if (patch.note !== undefined) u.note = patch.note ?? null;
  return u;
}

// ── MEDIA: ĐỀ XUẤT CẢI TIẾN ───────────────────────────────────
export function mediaImprovementFromRow(r: MediaImprovementRow): MediaImprovement {
  return {
    id: r.id,
    period: r.period,
    stt: r.stt,
    issue: r.issue ?? '',
    proposal: r.proposal ?? '',
    benefit: r.benefit ?? '',
    priority: r.priority,
  };
}

export function mediaImprovementToInsert(
  item: MediaImprovement,
  createdBy: string,
): Database['public']['Tables']['media_improvements']['Insert'] {
  return {
    period: item.period,
    stt: item.stt,
    issue: item.issue || '',
    proposal: item.proposal || '',
    benefit: item.benefit ?? null,
    priority: item.priority,
    created_by: createdBy,
  };
}

export function mediaImprovementToUpdate(
  patch: Partial<MediaImprovement>,
): Database['public']['Tables']['media_improvements']['Update'] {
  const u: Database['public']['Tables']['media_improvements']['Update'] = {};
  if (patch.period !== undefined) u.period = patch.period;
  if (patch.stt !== undefined) u.stt = patch.stt;
  if (patch.issue !== undefined) u.issue = patch.issue;
  if (patch.proposal !== undefined) u.proposal = patch.proposal;
  if (patch.benefit !== undefined) u.benefit = patch.benefit ?? null;
  if (patch.priority !== undefined) u.priority = patch.priority;
  return u;
}

// ── ADS FACEBOOK: BÁO CÁO NGÀY (metrics nhập tay) ─────────────
export function adsFbLogFromRow(r: AdsFbLogRow): AdsFbTaskLog {
  return {
    id: r.id,
    date: toUiDate(r.log_date),
    employeeId: r.employee_id,
    employeeName: r.employee_name ?? '',
    formType: r.form_type,
    spend: r.spend,
    revenue: r.revenue,
    orders: r.orders,
    dataCount: r.data_count,
    messages: r.messages,
    impressions: r.impressions,
    clicks: r.clicks,
    addToCart: r.add_to_cart,
    campsRunning: r.camps_running,
    campsTest: r.camps_test,
    contentTest: r.content_test,
    optimizeActions: r.optimize_actions,
    tpRating: r.tp_rating,
    note: r.note ?? undefined,
  };
}

export function adsFbLogToInsert(
  item: AdsFbTaskLog,
  createdBy: string,
): Database['public']['Tables']['ads_fb_task_logs']['Insert'] {
  return {
    log_date: toDbDate(item.date),
    employee_id: item.employeeId,
    employee_name: item.employeeName || '',
    form_type: item.formType,
    spend: item.spend || 0,
    revenue: item.revenue || 0,
    orders: item.orders || 0,
    data_count: item.dataCount || 0,
    messages: item.messages || 0,
    impressions: item.impressions || 0,
    clicks: item.clicks || 0,
    add_to_cart: item.addToCart || 0,
    camps_running: item.campsRunning || 0,
    camps_test: item.campsTest || 0,
    content_test: item.contentTest || 0,
    optimize_actions: item.optimizeActions || 0,
    tp_rating: item.tpRating ?? null,
    note: item.note ?? null,
    created_by: createdBy,
  };
}

export function adsFbLogToUpdate(
  patch: Partial<AdsFbTaskLog>,
): Database['public']['Tables']['ads_fb_task_logs']['Update'] {
  const u: Database['public']['Tables']['ads_fb_task_logs']['Update'] = {};
  if (patch.date !== undefined) u.log_date = toDbDate(patch.date);
  if (patch.employeeName !== undefined) u.employee_name = patch.employeeName;
  if (patch.formType !== undefined) u.form_type = patch.formType;
  if (patch.spend !== undefined) u.spend = patch.spend || 0;
  if (patch.revenue !== undefined) u.revenue = patch.revenue || 0;
  if (patch.orders !== undefined) u.orders = patch.orders || 0;
  if (patch.dataCount !== undefined) u.data_count = patch.dataCount || 0;
  if (patch.messages !== undefined) u.messages = patch.messages || 0;
  if (patch.impressions !== undefined) u.impressions = patch.impressions || 0;
  if (patch.clicks !== undefined) u.clicks = patch.clicks || 0;
  if (patch.addToCart !== undefined) u.add_to_cart = patch.addToCart || 0;
  if (patch.campsRunning !== undefined) u.camps_running = patch.campsRunning || 0;
  if (patch.campsTest !== undefined) u.camps_test = patch.campsTest || 0;
  if (patch.contentTest !== undefined) u.content_test = patch.contentTest || 0;
  if (patch.optimizeActions !== undefined) u.optimize_actions = patch.optimizeActions || 0;
  if (patch.tpRating !== undefined) u.tp_rating = patch.tpRating ?? null;
  if (patch.note !== undefined) u.note = patch.note ?? null;
  return u;
}

// ── ADS FACEBOOK: TARGET THÁNG ────────────────────────────────
export function adsFbTargetFromRow(r: AdsFbTargetRow): AdsFbTarget {
  return {
    id: r.id,
    period: r.period,
    employeeId: r.employee_id,
    employeeName: r.employee_name ?? '',
    spendTarget: r.spend_target,
    revenueTarget: r.revenue_target,
    ordersTarget: r.orders_target,
    daysInMonth: r.days_in_month,
    note: r.note ?? undefined,
  };
}

export function adsFbTargetToInsert(
  item: AdsFbTarget,
  createdBy: string,
): Database['public']['Tables']['ads_fb_targets']['Insert'] {
  return {
    period: item.period,
    employee_id: item.employeeId,
    employee_name: item.employeeName || '',
    spend_target: item.spendTarget || 0,
    revenue_target: item.revenueTarget || 0,
    orders_target: item.ordersTarget || 0,
    days_in_month: item.daysInMonth || 30,
    note: item.note ?? null,
    created_by: createdBy,
  };
}

export function adsFbTargetToUpdate(
  patch: Partial<AdsFbTarget>,
): Database['public']['Tables']['ads_fb_targets']['Update'] {
  const u: Database['public']['Tables']['ads_fb_targets']['Update'] = {};
  if (patch.period !== undefined) u.period = patch.period;
  if (patch.employeeName !== undefined) u.employee_name = patch.employeeName;
  if (patch.spendTarget !== undefined) u.spend_target = patch.spendTarget || 0;
  if (patch.revenueTarget !== undefined) u.revenue_target = patch.revenueTarget || 0;
  if (patch.ordersTarget !== undefined) u.orders_target = patch.ordersTarget || 0;
  if (patch.daysInMonth !== undefined) u.days_in_month = patch.daysInMonth || 30;
  if (patch.note !== undefined) u.note = patch.note ?? null;
  return u;
}
