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
} from '../types';
import {
  channelFromRow,
  channelToInsert,
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
