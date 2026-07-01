-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0004                                        ║
-- ║  Checklist công việc ngày — Team Content.                     ║
-- ║  Mỗi dòng = 1 đầu việc của 1 nhân viên trong 1 ngày + số lượng.║
-- ║  MÔ HÌNH QUYỀN (chốt: dùng chung, không phân quyền theo người):║
-- ║   • XEM & THÊM/SỬA/XÓA: MỌI user đã đăng nhập đều làm được     ║
-- ║     — cả team điền hộ nhau thoải mái.                          ║
-- ║  Chạy SAU 0003, trong Supabase Dashboard > SQL Editor.        ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                      ║
-- ╚══════════════════════════════════════════════════════════════╝

create table if not exists public.content_checklists (
  id             uuid primary key default gen_random_uuid(),
  checklist_date date not null default current_date,
  employee_id    uuid not null references public.profiles(id) on delete cascade,
  employee_name  text not null default '',
  label          text not null,
  quantity       integer not null default 0,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Lọc nhanh theo (ngày, nhân viên) — truy vấn chính của màn checklist.
create index if not exists content_checklists_date_emp_idx
  on public.content_checklists(checklist_date, employee_id);

-- Trigger updated_at (dùng lại hàm touch_updated_at từ 0002; tự tạo nếu chưa có).
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_checklists_touch_updated_at on public.content_checklists;
create trigger content_checklists_touch_updated_at
  before update on public.content_checklists
  for each row execute function public.touch_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
alter table public.content_checklists enable row level security;

-- XEM: mọi user đã đăng nhập.
drop policy if exists content_checklists_select on public.content_checklists;
create policy content_checklists_select on public.content_checklists
  for select to authenticated using (true);

-- THÊM: mọi user (điền hộ nhau được); vẫn ghi created_by = chính mình để truy vết.
drop policy if exists content_checklists_insert on public.content_checklists;
create policy content_checklists_insert on public.content_checklists
  for insert to authenticated
  with check (created_by = auth.uid());

-- SỬA: mọi user đã đăng nhập.
drop policy if exists content_checklists_update on public.content_checklists;
create policy content_checklists_update on public.content_checklists
  for update to authenticated
  using (true) with check (true);

-- XÓA: mọi user đã đăng nhập.
drop policy if exists content_checklists_delete on public.content_checklists;
create policy content_checklists_delete on public.content_checklists
  for delete to authenticated
  using (true);
