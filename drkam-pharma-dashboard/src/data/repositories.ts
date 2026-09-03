/**
 * Lớp truy cập dữ liệu Supabase cho từng thực thể.
 * Mọi hàm yêu cầu Supabase đã cấu hình (kiểm tra isSupabaseConfigured trước khi gọi).
 * Khi chưa cấu hình, createClient() trả null → các hàm này ném lỗi rõ ràng.
 */
import { createClient } from '@/lib/supabase/client';
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
  ContentMediaOrder,
  AdsContentOrder,
  ContentKpiTarget,
  WebReport,
} from '../types';
import {
  channelFromRow,
  channelToInsert,
  channelToUpdate,
  reportFromRow,
  reportToInsert,
  employeeFromRow,
  targetFromRow,
  targetToInsert,
  logFromRow,
  fbPageFromRow,
  fbPageToInsert,
  checklistFromRow,
  checklistToInsert,
  mediaLogFromRow,
  mediaLogToInsert,
  mediaLogToUpdate,
  mediaKpiFromRow,
  mediaKpiToInsert,
  mediaKpiToUpdate,
  mediaImprovementFromRow,
  mediaImprovementToInsert,
  mediaImprovementToUpdate,
  adsFbLogFromRow,
  adsFbLogToInsert,
  adsFbLogToUpdate,
  adsFbTargetFromRow,
  adsFbTargetToInsert,
  adsFbTargetToUpdate,
  contentMediaOrderFromRow,
  contentMediaOrderToInsert,
  contentMediaOrderToUpdate,
  adsContentOrderFromRow,
  adsContentOrderToInsert,
  adsContentOrderToUpdate,
  contentKpiTargetFromRow,
  contentKpiTargetToInsert,
  webReportFromRow,
  webReportToInsert,
} from './mappers';

function db() {
  const client = createClient();
  if (!client) throw new Error('Supabase chưa được cấu hình (.env.local).');
  return client;
}

// ── CHANNELS ──────────────────────────────────────────────────
export async function loadChannels(): Promise<AffiliateChannel[]> {
  const { data, error } = await db()
    .from('channels')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(channelFromRow);
}

/**
 * Tạo kênh. managerId = người tạo → kênh thuộc về họ (RLS yêu cầu manager_id =
 * auth.uid() với người không phải Admin; Admin có thể gán cho người khác sau).
 */
export async function createChannel(
  c: AffiliateChannel,
  managerId: string | null,
): Promise<AffiliateChannel> {
  const { data, error } = await db()
    .from('channels')
    .insert(channelToInsert(c, null, managerId))
    .select('*')
    .single();
  if (error) throw error;
  return channelFromRow(data);
}

/**
 * Cập nhật kênh (không gồm TÊN — đổi tên dùng renameChannel bên dưới).
 * managerId: truyền khi đổi người phụ trách để đồng bộ cột manager_id.
 */
export async function updateChannel(
  id: string,
  patch: Partial<AffiliateChannel>,
  managerId?: string | null,
): Promise<AffiliateChannel> {
  const { data, error } = await db()
    .from('channels')
    .update(channelToUpdate(patch, managerId))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return channelFromRow(data);
}

/**
 * Đổi tên kênh — gọi RPC rename_channel (migration 0018) để đổi tên kênh VÀ
 * channel_name của mọi báo cáo cũ trong cùng một giao dịch. Không update thẳng
 * daily_reports từ đây: RLS chỉ cho chủ kênh sửa báo cáo kênh FB KOC cá nhân
 * nên các dòng không có quyền sẽ bị bỏ qua âm thầm → báo cáo cũ mồ côi.
 */
export async function renameChannel(id: string, newName: string): Promise<void> {
  const { error } = await db().rpc('rename_channel', { c_id: id, new_name: newName });
  if (error) throw error;
}

export async function deleteChannel(id: string): Promise<void> {
  const { error } = await db().from('channels').delete().eq('id', id);
  if (error) throw error;
}

// ── DAILY REPORTS ─────────────────────────────────────────────
export async function loadReports(): Promise<DailyReport[]> {
  const { data, error } = await db()
    .from('daily_reports')
    .select('*')
    .order('report_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(reportFromRow);
}

/**
 * Upsert báo cáo theo khóa (channel_id, report_date, source_platform):
 * báo cáo lại cùng kênh/ngày/nguồn sẽ GHI ĐÈ thay vì tạo dòng trùng.
 * Khớp ràng buộc daily_reports_uniq + trigger updated_at (migration 0002).
 */
export async function upsertReport(
  rep: DailyReport,
  createdBy: string,
  channelId: string,
): Promise<DailyReport> {
  const { data, error } = await db()
    .from('daily_reports')
    .upsert(reportToInsert(rep, createdBy, channelId), {
      onConflict: 'channel_id,report_date,source_platform',
    })
    .select('*')
    .single();
  if (error) throw error;
  return reportFromRow(data);
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await db().from('daily_reports').delete().eq('id', id);
  if (error) throw error;
}

// ── FB PAGES (fanpage theo ID Shopee KOC inhouse) ─────────────
export async function loadFbPages(): Promise<FbPage[]> {
  const { data, error } = await db()
    .from('fb_pages')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fbPageFromRow);
}

export async function createFbPage(
  p: FbPage,
  addedById: string | null,
): Promise<FbPage> {
  const { data, error } = await db()
    .from('fb_pages')
    .insert(fbPageToInsert(p, addedById))
    .select('*')
    .single();
  if (error) throw error;
  return fbPageFromRow(data);
}

export async function deleteFbPage(id: string): Promise<void> {
  const { error } = await db().from('fb_pages').delete().eq('id', id);
  if (error) throw error;
}

// ── PROFILES (Nhân sự) ────────────────────────────────────────
export async function loadEmployees(): Promise<Employee[]> {
  const { data, error } = await db()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(employeeFromRow);
}

export async function setEmployeeStatus(
  id: string,
  status: Employee['status'],
): Promise<void> {
  const { error } = await db().from('profiles').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await db().from('profiles').delete().eq('id', id);
  if (error) throw error;
}

// ── TARGETS (KPI) ─────────────────────────────────────────────
export async function loadTargets(): Promise<TeamTarget[]> {
  const { data, error } = await db()
    .from('targets')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(targetFromRow);
}

export async function createTarget(
  t: TeamTarget,
  createdBy: string | null,
): Promise<TeamTarget> {
  const { data, error } = await db()
    .from('targets')
    .insert(targetToInsert(t, createdBy))
    .select('*')
    .single();
  if (error) throw error;
  return targetFromRow(data);
}

export async function updateTarget(
  id: string,
  targetRevenue: number,
  achievedRevenue: number,
): Promise<void> {
  const { error } = await db()
    .from('targets')
    .update({ target_revenue: targetRevenue, achieved_revenue: achievedRevenue })
    .eq('id', id);
  if (error) throw error;
}

// ── AUDIT LOGS ────────────────────────────────────────────────
/** Chỉ Admin SELECT được (RLS); vai trò khác sẽ nhận mảng rỗng. */
export async function loadLogs(): Promise<AuditLog[]> {
  const { data, error } = await db()
    .from('audit_logs')
    .select('*')
    .order('ts', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(logFromRow);
}

export async function insertLog(entry: {
  operator: string;
  operatorId: string | null;
  action: string;
  module: string;
}): Promise<void> {
  const { error } = await db().from('audit_logs').insert({
    operator: entry.operator,
    operator_id: entry.operatorId,
    action: entry.action,
    module: entry.module,
    ip_address: null,
  });
  // Ghi log là phụ trợ — không chặn luồng chính nếu lỗi.
  if (error) console.warn('Ghi nhật ký thất bại:', error.message);
}

export async function clearLogs(): Promise<void> {
  const { error } = await db()
    .from('audit_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

// ── CHECKLIST TEAM CONTENT ────────────────────────────────────
export async function loadChecklists(): Promise<ChecklistItem[]> {
  const { data, error } = await db()
    .from('content_checklists')
    .select('*')
    .order('checklist_date', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(checklistFromRow);
}

export async function createChecklistItem(
  item: ChecklistItem,
  createdBy: string,
): Promise<ChecklistItem> {
  const { data, error } = await db()
    .from('content_checklists')
    .insert(checklistToInsert(item, createdBy))
    .select('*')
    .single();
  if (error) throw error;
  return checklistFromRow(data);
}

export async function updateChecklistItem(
  id: string,
  patch: { label?: string; quantity?: number; note?: string },
): Promise<void> {
  const { error } = await db().from('content_checklists').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await db().from('content_checklists').delete().eq('id', id);
  if (error) throw error;
}

// ── MEDIA: BÁO CÁO NGÀY (media_task_logs) ─────────────────────
export async function loadMediaLogs(): Promise<MediaTaskLog[]> {
  const { data, error } = await db()
    .from('media_task_logs')
    .select('*')
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mediaLogFromRow);
}

export async function createMediaLog(item: MediaTaskLog, createdBy: string): Promise<MediaTaskLog> {
  const { data, error } = await db()
    .from('media_task_logs')
    .insert(mediaLogToInsert(item, createdBy))
    .select('*')
    .single();
  if (error) throw error;
  return mediaLogFromRow(data);
}

export async function updateMediaLog(id: string, patch: Partial<MediaTaskLog>): Promise<void> {
  const { error } = await db().from('media_task_logs').update(mediaLogToUpdate(patch)).eq('id', id);
  if (error) throw error;
}

export async function deleteMediaLog(id: string): Promise<void> {
  const { error } = await db().from('media_task_logs').delete().eq('id', id);
  if (error) throw error;
}

// ── MEDIA: KPI THÁNG (media_kpi_entries) ──────────────────────
export async function loadMediaKpi(): Promise<MediaKpiEntry[]> {
  const { data, error } = await db()
    .from('media_kpi_entries')
    .select('*')
    .order('period', { ascending: false })
    .order('stt', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mediaKpiFromRow);
}

export async function createMediaKpi(e: MediaKpiEntry, createdBy: string): Promise<MediaKpiEntry> {
  const { data, error } = await db()
    .from('media_kpi_entries')
    .insert(mediaKpiToInsert(e, createdBy))
    .select('*')
    .single();
  if (error) throw error;
  return mediaKpiFromRow(data);
}

export async function updateMediaKpi(id: string, patch: Partial<MediaKpiEntry>): Promise<void> {
  const { error } = await db().from('media_kpi_entries').update(mediaKpiToUpdate(patch)).eq('id', id);
  if (error) throw error;
}

export async function deleteMediaKpi(id: string): Promise<void> {
  const { error } = await db().from('media_kpi_entries').delete().eq('id', id);
  if (error) throw error;
}

// ── MEDIA: ĐỀ XUẤT CẢI TIẾN (media_improvements) ──────────────
export async function loadMediaImprovements(): Promise<MediaImprovement[]> {
  const { data, error } = await db()
    .from('media_improvements')
    .select('*')
    .order('period', { ascending: false })
    .order('stt', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mediaImprovementFromRow);
}

export async function createMediaImprovement(item: MediaImprovement, createdBy: string): Promise<MediaImprovement> {
  const { data, error } = await db()
    .from('media_improvements')
    .insert(mediaImprovementToInsert(item, createdBy))
    .select('*')
    .single();
  if (error) throw error;
  return mediaImprovementFromRow(data);
}

export async function updateMediaImprovement(id: string, patch: Partial<MediaImprovement>): Promise<void> {
  const { error } = await db().from('media_improvements').update(mediaImprovementToUpdate(patch)).eq('id', id);
  if (error) throw error;
}

export async function deleteMediaImprovement(id: string): Promise<void> {
  const { error } = await db().from('media_improvements').delete().eq('id', id);
  if (error) throw error;
}

// ── ADS FACEBOOK: BÁO CÁO NGÀY (ads_fb_task_logs) ─────────────
export async function loadAdsFbLogs(): Promise<AdsFbTaskLog[]> {
  const { data, error } = await db()
    .from('ads_fb_task_logs')
    .select('*')
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(adsFbLogFromRow);
}

export async function createAdsFbLog(item: AdsFbTaskLog, createdBy: string): Promise<AdsFbTaskLog> {
  const { data, error } = await db()
    .from('ads_fb_task_logs')
    .insert(adsFbLogToInsert(item, createdBy))
    .select('*')
    .single();
  if (error) throw error;
  return adsFbLogFromRow(data);
}

export async function updateAdsFbLog(id: string, patch: Partial<AdsFbTaskLog>): Promise<void> {
  const { error } = await db().from('ads_fb_task_logs').update(adsFbLogToUpdate(patch)).eq('id', id);
  if (error) throw error;
}

export async function deleteAdsFbLog(id: string): Promise<void> {
  const { error } = await db().from('ads_fb_task_logs').delete().eq('id', id);
  if (error) throw error;
}

// ── ADS FACEBOOK: TARGET THÁNG (ads_fb_targets) ───────────────
export async function loadAdsFbTargets(): Promise<AdsFbTarget[]> {
  const { data, error } = await db()
    .from('ads_fb_targets')
    .select('*')
    .order('period', { ascending: false })
    .order('employee_name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(adsFbTargetFromRow);
}

export async function createAdsFbTarget(item: AdsFbTarget, createdBy: string): Promise<AdsFbTarget> {
  const { data, error } = await db()
    .from('ads_fb_targets')
    .insert(adsFbTargetToInsert(item, createdBy))
    .select('*')
    .single();
  if (error) throw error;
  return adsFbTargetFromRow(data);
}

export async function updateAdsFbTarget(id: string, patch: Partial<AdsFbTarget>): Promise<void> {
  const { error } = await db().from('ads_fb_targets').update(adsFbTargetToUpdate(patch)).eq('id', id);
  if (error) throw error;
}

export async function deleteAdsFbTarget(id: string): Promise<void> {
  const { error } = await db().from('ads_fb_targets').delete().eq('id', id);
  if (error) throw error;
}

// Thông báo khi câu lệnh chạy xong nhưng KHÔNG chạm dòng nào (RLS chặn hoặc dòng đã bị xóa).
const NO_ROW_MSG =
  'không có dòng nào được ghi — bạn không có quyền sửa order này (RLS), hoặc order đã bị xóa. '
  + 'Nếu bạn là người đặt / người được giao mà vẫn báo lỗi này, hãy chạy migration 0014_orders_rls_fix.sql.';

// ════════════════════════════════════════════════════════════════
//  ORDER — 2 luồng đặt việc giữa các team (migration 0013)
//  Đọc mới nhất trước; ghi kèm created_by để RLS "bên đặt tạo" chạy đúng.
// ════════════════════════════════════════════════════════════════

// ── ORDER: Team Content đặt team Media (content_media_orders) ──
export async function loadContentMediaOrders(): Promise<ContentMediaOrder[]> {
  const { data, error } = await db()
    .from('content_media_orders')
    .select('*')
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(contentMediaOrderFromRow);
}

export async function createContentMediaOrder(item: ContentMediaOrder, createdBy: string): Promise<ContentMediaOrder> {
  const { data, error } = await db()
    .from('content_media_orders')
    .insert(contentMediaOrderToInsert(item, createdBy))
    .select('*')
    .single();
  if (error) throw error;
  return contentMediaOrderFromRow(data);
}

export async function updateContentMediaOrder(id: string, patch: Partial<ContentMediaOrder>): Promise<ContentMediaOrder> {
  // LƯU Ý: phải .select() để biết CÓ dòng nào thật sự được sửa không.
  // Khi RLS chặn, PostgREST trả 204 KHÔNG kèm lỗi và 0 dòng — nếu bỏ qua thì UI
  // tưởng lưu thành công, reload lại thấy số cũ.
  const { data, error } = await db()
    .from('content_media_orders')
    .update(contentMediaOrderToUpdate(patch))
    .eq('id', id)
    .select('*');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NO_ROW_MSG);
  return contentMediaOrderFromRow(data[0]);
}

export async function deleteContentMediaOrder(id: string): Promise<void> {
  const { data, error } = await db().from('content_media_orders').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NO_ROW_MSG);
}

// ── ORDER: Team Ads Facebook đặt team Content (ads_content_orders) ──
export async function loadAdsContentOrders(): Promise<AdsContentOrder[]> {
  const { data, error } = await db()
    .from('ads_content_orders')
    .select('*')
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(adsContentOrderFromRow);
}

export async function createAdsContentOrder(item: AdsContentOrder, createdBy: string): Promise<AdsContentOrder> {
  const { data, error } = await db()
    .from('ads_content_orders')
    .insert(adsContentOrderToInsert(item, createdBy))
    .select('*')
    .single();
  if (error) throw error;
  return adsContentOrderFromRow(data);
}

export async function updateAdsContentOrder(id: string, patch: Partial<AdsContentOrder>): Promise<AdsContentOrder> {
  const { data, error } = await db()
    .from('ads_content_orders')
    .update(adsContentOrderToUpdate(patch))
    .eq('id', id)
    .select('*');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NO_ROW_MSG);
  return adsContentOrderFromRow(data[0]);
}

export async function deleteAdsContentOrder(id: string): Promise<void> {
  const { data, error } = await db().from('ads_content_orders').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NO_ROW_MSG);
}

// ════════════════════════════════════════════════════════════════
//  KPI THÁNG — TEAM CONTENT (content_kpi_targets, migration 0015)
// ════════════════════════════════════════════════════════════════
export async function loadContentKpiTargets(): Promise<ContentKpiTarget[]> {
  const { data, error } = await db()
    .from('content_kpi_targets')
    .select('*')
    .order('period', { ascending: false })
    .order('item_id', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(contentKpiTargetFromRow);
}

/**
 * Ghi KPI của MỘT THÁNG (nhiều hạng mục một lần).
 * Dùng upsert theo khóa duy nhất (period, item_id) nên bấm Lưu nhiều lần
 * chỉ cập nhật đúng dòng cũ, không sinh dòng trùng — kể cả khi 2 người
 * cùng thiết lập một tháng.
 */
export async function saveContentKpiTargets(
  items: ContentKpiTarget[],
  createdBy: string,
): Promise<ContentKpiTarget[]> {
  if (items.length === 0) return [];
  const { data, error } = await db()
    .from('content_kpi_targets')
    .upsert(
      items.map((i) => contentKpiTargetToInsert(i, createdBy)),
      { onConflict: 'period,item_id' },
    )
    .select('*');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      'không có dòng nào được ghi — tài khoản của bạn không có quyền đặt KPI team Content (RLS). '
      + 'Nếu bạn thuộc team Content mà vẫn báo lỗi này, hãy chạy migration 0015_content_kpi_targets.sql.',
    );
  }
  return data.map(contentKpiTargetFromRow);
}

// ════════════════════════════════════════════════════════════════
//  BÁO CÁO WEB (web_reports, migration 0021)
//  1 ngày = 1 dòng: upsert theo report_date nên nhập lại cùng ngày là ghi đè,
//  không sinh dòng trùng (giống cách nhập doanh thu Facebook Ads).
// ════════════════════════════════════════════════════════════════
export async function loadWebReports(): Promise<WebReport[]> {
  const { data, error } = await db()
    .from('web_reports')
    .select('*')
    .order('report_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(webReportFromRow);
}

export async function upsertWebReport(rep: WebReport, createdBy: string): Promise<WebReport> {
  const { data, error } = await db()
    .from('web_reports')
    .upsert(webReportToInsert(rep, createdBy), { onConflict: 'report_date' })
    .select('*')
    .single();
  if (error) throw error;
  return webReportFromRow(data);
}

export async function deleteWebReport(id: string): Promise<void> {
  const { data, error } = await db().from('web_reports').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NO_ROW_MSG);
}
