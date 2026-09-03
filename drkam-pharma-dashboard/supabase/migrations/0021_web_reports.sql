-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0021                                        ║
-- ║  BÁO CÁO WEB (web_reports) — traffic website theo NGÀY          ║
-- ║                                                                ║
-- ║  Mục "Báo cáo web" của team Content gồm 2 con số:               ║
-- ║   • Lượt truy cập — NHẬP TAY mỗi ngày, lưu ở bảng này.          ║
-- ║   • Số bài viết   — KHÔNG lưu ở đây: đếm tự động từ dòng        ║
-- ║     "SEO WEB" trong checklist công việc ngày (content_checklists)║
-- ║     nên không phải nhập 2 lần.                                  ║
-- ║                                                                ║
-- ║  Chỉ tiêu tháng (traffic · số bài) nằm ở content_kpi_targets    ║
-- ║  với item_id 'web-traffic' / 'web-posts', kind='viewreach' —    ║
-- ║  đặt ở màn "KPI tháng — Team Content", không cần bảng riêng.    ║
-- ║                                                                ║
-- ║  MỖI NGÀY ĐÚNG 1 DÒNG (unique report_date): nhập lại cùng ngày  ║
-- ║  là ghi đè, không sinh dòng trùng.                              ║
-- ║  QUYỀN: mọi user đã đăng nhập XEM; team Content (và Admin)      ║
-- ║  thêm/sửa/xóa — cùng quy ước với content_kpi_targets (0015).    ║
-- ║  Chạy SAU 0020, trong Supabase Dashboard > SQL Editor.          ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                       ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Hàm updated_at (tạo lại nếu chưa có — dùng chung nhiều bảng).
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Phòng ban của user đang đăng nhập (đã có từ 0013 — tạo lại cho chắc).
create or replace function public.auth_department()
returns text language sql stable security definer set search_path = public as $$
  select department from public.profiles where id = auth.uid();
$$;

create table if not exists public.web_reports (
  id          uuid primary key default gen_random_uuid(),
  report_date date not null,
  traffic     bigint not null default 0,     -- lượt truy cập trong ngày
  note        text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1 ngày = 1 dòng → cho phép upsert theo report_date.
create unique index if not exists web_reports_date_uidx
  on public.web_reports(report_date);

drop trigger if exists web_reports_touch on public.web_reports;
create trigger web_reports_touch
  before update on public.web_reports
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════
-- RLS — mọi người xem; team Content (và Admin) nhập số
-- "team Content" = nhân sự KHÔNG thuộc Media / Ads Facebook.
-- ════════════════════════════════════════════════════════════════
alter table public.web_reports enable row level security;

drop policy if exists web_reports_select on public.web_reports;
create policy web_reports_select on public.web_reports
  for select to authenticated using (true);

drop policy if exists web_reports_insert on public.web_reports;
create policy web_reports_insert on public.web_reports
  for insert to authenticated
  with check (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  );

drop policy if exists web_reports_update on public.web_reports;
create policy web_reports_update on public.web_reports
  for update to authenticated
  using (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  )
  with check (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  );

drop policy if exists web_reports_delete on public.web_reports;
create policy web_reports_delete on public.web_reports
  for delete to authenticated
  using (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  );
