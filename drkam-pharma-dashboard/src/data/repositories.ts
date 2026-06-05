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

export async function createChannel(c: AffiliateChannel): Promise<AffiliateChannel> {
  const { data, error } = await db()
    .from('channels')
    .insert(channelToInsert(c))
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

export async function createReport(
  rep: DailyReport,
  createdBy: string,
): Promise<DailyReport> {
  const { data, error } = await db()
    .from('daily_reports')
    .insert(reportToInsert(rep, createdBy))
    .select('*')
    .single();
  if (error) throw error;
  return reportFromRow(data);
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await db().from('daily_reports').delete().eq('id', id);
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
