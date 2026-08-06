-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0015                                       ║
-- ║  KPI THÁNG — TEAM CONTENT (content_kpi_targets)                ║
-- ║                                                                ║
-- ║  Trước đây chỉ tiêu tháng của từng kênh nằm CỨNG trong code    ║
-- ║  (DashboardComponent > LINE_ITEMS/VIEW_REACH), đổi KPI là phải ║
-- ║  sửa code. Bảng này đưa số đó ra ngoài: mỗi tháng team Content ║
-- ║  tự nhập ở màn "KPI team Content", Tổng quan đọc lại theo đúng ║
-- ║  tháng đang chọn. Tháng chưa thiết lập → app tự dùng số mặc    ║
-- ║  định trong src/lib/contentKpi.ts nên báo cáo cũ không về 0.   ║
-- ║                                                                ║
-- ║  1 dòng = 1 hạng mục của 1 tháng. Danh mục hạng mục KHÔNG lưu  ║
-- ║  ở DB (cố định trong code) — bảng này chỉ giữ CON SỐ.         ║
-- ║                                                                ║
-- ║  QUYỀN (chốt với user): toàn bộ nhân sự team Content đặt được  ║
-- ║  KPI; team Media / Ads Facebook chỉ xem.                       ║
-- ║  Chạy SAU 0014, trong Supabase Dashboard > SQL Editor.         ║
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

-- Phòng ban của user đang đăng nhập (đã tạo ở 0013 — tạo lại cho chắc nếu chạy lẻ).
create or replace function public.auth_department()
returns text language sql stable security definer set search_path = public as $$
  select department from public.profiles where id = auth.uid();
$$;

create table if not exists public.content_kpi_targets (
  id           uuid primary key default gen_random_uuid(),
  period       text not null,                       -- 'yyyy-mm'
  item_id      text not null,                       -- khớp id hạng mục trong code
  item_label   text not null default '',            -- nhãn lúc lưu (để đối chiếu khi đổi danh mục)
  kind         text not null default 'revenue'
                 check (kind in ('revenue','viewreach')),
  target_value bigint not null default 0,           -- đ (doanh thu) hoặc lượt (view/reach)
  note         text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Mỗi hạng mục chỉ có ĐÚNG 1 dòng trong 1 tháng — chặn nhân đôi KPI khi 2 người
-- cùng bấm lưu, và cho phép upsert theo (period, item_id).
create unique index if not exists content_kpi_targets_period_item_uidx
  on public.content_kpi_targets(period, item_id);

drop trigger if exists content_kpi_targets_touch on public.content_kpi_targets;
create trigger content_kpi_targets_touch
  before update on public.content_kpi_targets
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════
-- RLS — mọi người xem; team Content (và Admin) đặt KPI
-- Quy ước toàn hệ thống: "team Content" = nhân sự KHÔNG thuộc Media / Ads Facebook.
-- ════════════════════════════════════════════════════════════════
alter table public.content_kpi_targets enable row level security;

drop policy if exists content_kpi_targets_select on public.content_kpi_targets;
create policy content_kpi_targets_select on public.content_kpi_targets
  for select to authenticated using (true);

drop policy if exists content_kpi_targets_insert on public.content_kpi_targets;
create policy content_kpi_targets_insert on public.content_kpi_targets
  for insert to authenticated
  with check (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  );

drop policy if exists content_kpi_targets_update on public.content_kpi_targets;
create policy content_kpi_targets_update on public.content_kpi_targets
  for update to authenticated
  using (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  )
  with check (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  );

drop policy if exists content_kpi_targets_delete on public.content_kpi_targets;
create policy content_kpi_targets_delete on public.content_kpi_targets
  for delete to authenticated
  using (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  );
