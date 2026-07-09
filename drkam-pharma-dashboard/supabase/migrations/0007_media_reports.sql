-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0007                                        ║
-- ║  TEAM MEDIA — 3 bảng (tách biệt hoàn toàn với Content):        ║
-- ║   • media_task_logs     — Báo cáo ngày = dòng công việc chi tiết║
-- ║   • media_kpi_entries   — KPI tháng (mỗi chỉ số 1 dòng)        ║
-- ║   • media_improvements  — Đề xuất cải tiến                      ║
-- ║  MÔ HÌNH QUYỀN (giống content_checklists — dùng chung):        ║
-- ║   • XEM: mọi user đã đăng nhập.                                ║
-- ║   • THÊM: mọi user (created_by = auth.uid()).                 ║
-- ║   • SỬA/XÓA: mọi user đã đăng nhập (cả team làm hộ nhau).      ║
-- ║  Chạy SAU 0006, trong Supabase Dashboard > SQL Editor.        ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                      ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Hàm updated_at (tạo lại nếu chưa có — dùng chung nhiều bảng).
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- 1) media_task_logs — Báo cáo ngày (nhiều dòng / người / ngày)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.media_task_logs (
  id            uuid primary key default gen_random_uuid(),
  log_date      date not null default current_date,
  employee_id   uuid not null references public.profiles(id) on delete cascade,
  employee_name text not null default '',
  content_type  text not null default 'Khác',   -- 6 loại video hoặc "Khác"
  script_no     text,                            -- KB (số kịch bản)
  task          text not null default '',        -- Công việc (tự điền)
  quantity      integer,                         -- Số lượng
  progress      text not null default 'Hoàn thành'
                 check (progress in ('Hoàn thành','Đang làm','Chưa làm')),
  product_link  text,                            -- Link sản phẩm
  deadline      text,                            -- Hạn
  note          text,                            -- Ghi chú
  approval      text,                            -- TT Duyệt
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists media_task_logs_date_emp_idx
  on public.media_task_logs(log_date, employee_id);

drop trigger if exists media_task_logs_touch on public.media_task_logs;
create trigger media_task_logs_touch
  before update on public.media_task_logs
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════
-- 2) media_kpi_entries — KPI tháng (mỗi chỉ số 1 dòng, đổi theo tháng)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.media_kpi_entries (
  id            uuid primary key default gen_random_uuid(),
  period        text not null,                   -- 'yyyy-mm'
  employee_id   uuid not null references public.profiles(id) on delete cascade,
  employee_name text not null default '',
  role_scope    text not null default 'NV' check (role_scope in ('Leader','NV')),
  stt           integer not null default 1,
  group_name    text not null default '',        -- Nhóm KPI
  metric        text not null default '',        -- Chỉ số
  target_value  bigint not null default 0,       -- Mục tiêu (số; tiền có thể lớn)
  unit          text not null default 'number' check (unit in ('number','currency','percent')),
  weight        numeric not null default 0,      -- Trọng số %
  actual_value  bigint not null default 0,       -- Thực tế
  note          text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists media_kpi_period_emp_idx
  on public.media_kpi_entries(period, employee_id);

drop trigger if exists media_kpi_entries_touch on public.media_kpi_entries;
create trigger media_kpi_entries_touch
  before update on public.media_kpi_entries
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════
-- 3) media_improvements — Đề xuất cải tiến
-- ════════════════════════════════════════════════════════════════
create table if not exists public.media_improvements (
  id          uuid primary key default gen_random_uuid(),
  period      text not null,                     -- 'yyyy-mm'
  stt         integer not null default 1,
  issue       text not null default '',          -- Vấn đề / Hiện trạng
  proposal    text not null default '',          -- Đề xuất cải tiến
  benefit     text,                              -- Lợi ích kỳ vọng
  priority    text not null default 'Trung bình'
               check (priority in ('Cao','Trung bình','Thấp')),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists media_improvements_period_idx
  on public.media_improvements(period);

drop trigger if exists media_improvements_touch on public.media_improvements;
create trigger media_improvements_touch
  before update on public.media_improvements
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════
-- RLS — xem chung, cả team thêm/sửa/xóa (giống content_checklists)
-- ════════════════════════════════════════════════════════════════
alter table public.media_task_logs    enable row level security;
alter table public.media_kpi_entries  enable row level security;
alter table public.media_improvements enable row level security;

-- ── media_task_logs ──
drop policy if exists media_task_logs_select on public.media_task_logs;
create policy media_task_logs_select on public.media_task_logs
  for select to authenticated using (true);
drop policy if exists media_task_logs_insert on public.media_task_logs;
create policy media_task_logs_insert on public.media_task_logs
  for insert to authenticated with check (created_by = auth.uid());
-- SỬA/XÓA báo cáo ngày: CHỈ người tạo dòng (created_by) hoặc Admin.
-- → Khải chỉ sửa/xóa báo cáo của Khải, Sơn của Sơn.
drop policy if exists media_task_logs_update on public.media_task_logs;
create policy media_task_logs_update on public.media_task_logs
  for update to authenticated
  using (created_by = auth.uid() or public.auth_role() = 'Admin')
  with check (created_by = auth.uid() or public.auth_role() = 'Admin');
drop policy if exists media_task_logs_delete on public.media_task_logs;
create policy media_task_logs_delete on public.media_task_logs
  for delete to authenticated
  using (created_by = auth.uid() or public.auth_role() = 'Admin');

-- ── media_kpi_entries ──
drop policy if exists media_kpi_entries_select on public.media_kpi_entries;
create policy media_kpi_entries_select on public.media_kpi_entries
  for select to authenticated using (true);
drop policy if exists media_kpi_entries_insert on public.media_kpi_entries;
create policy media_kpi_entries_insert on public.media_kpi_entries
  for insert to authenticated with check (created_by = auth.uid());
drop policy if exists media_kpi_entries_update on public.media_kpi_entries;
create policy media_kpi_entries_update on public.media_kpi_entries
  for update to authenticated using (true) with check (true);
drop policy if exists media_kpi_entries_delete on public.media_kpi_entries;
create policy media_kpi_entries_delete on public.media_kpi_entries
  for delete to authenticated using (true);

-- ── media_improvements ──
drop policy if exists media_improvements_select on public.media_improvements;
create policy media_improvements_select on public.media_improvements
  for select to authenticated using (true);
drop policy if exists media_improvements_insert on public.media_improvements;
create policy media_improvements_insert on public.media_improvements
  for insert to authenticated with check (created_by = auth.uid());
drop policy if exists media_improvements_update on public.media_improvements;
create policy media_improvements_update on public.media_improvements
  for update to authenticated using (true) with check (true);
drop policy if exists media_improvements_delete on public.media_improvements;
create policy media_improvements_delete on public.media_improvements
  for delete to authenticated using (true);
