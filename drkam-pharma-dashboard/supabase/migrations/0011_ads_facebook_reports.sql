-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0011                                        ║
-- ║  TEAM ADS FACEBOOK — 2 bảng (tách biệt hoàn toàn):             ║
-- ║   • ads_fb_task_logs — Báo cáo ngày (metrics nhập tay/ngày/NV) ║
-- ║   • ads_fb_targets   — Target tháng theo nhân viên            ║
-- ║  Mọi KPI (ROAS/CPA/CTR…) và điểm 3 trục KHÔNG lưu ở đây —      ║
-- ║  tính runtime trong src/lib/adsFacebook.ts từ metrics + target.║
-- ║  MÔ HÌNH QUYỀN (giống media_task_logs):                        ║
-- ║   • XEM: mọi user đã đăng nhập (UI lọc theo phòng ban).        ║
-- ║   • THÊM: mọi user (created_by = auth.uid()).                 ║
-- ║   • SỬA/XÓA báo cáo ngày: CHỈ người tạo dòng hoặc Admin.       ║
-- ║  Chạy SAU 0010, trong Supabase Dashboard > SQL Editor.        ║
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
-- 1) ads_fb_task_logs — Báo cáo ngày (1 dòng / người / ngày / hình thức)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.ads_fb_task_logs (
  id               uuid primary key default gen_random_uuid(),
  log_date         date not null default current_date,
  employee_id      uuid not null references public.profiles(id) on delete cascade,
  employee_name    text not null default '',
  form_type        text not null default 'Chuyển đổi'   -- Hình thức
                     check (form_type in ('Chuyển đổi','Sỉ','Mess')),
  -- ── Metrics nhập tay ──
  spend            bigint  not null default 0,   -- Tổng chi tiêu (đ)
  revenue          bigint  not null default 0,   -- Doanh thu đơn thực (đ)
  orders           integer not null default 0,   -- Số đơn
  data_count       integer not null default 0,   -- Số data
  messages         integer not null default 0,   -- Số tin nhắn (Mess)
  impressions      bigint  not null default 0,   -- Impressions
  clicks           integer not null default 0,   -- Clicks
  add_to_cart      integer not null default 0,   -- Add to cart (CĐ)
  camps_running    integer not null default 0,   -- Camp đang chạy
  camps_test       integer not null default 0,   -- Camp test mới
  content_test     integer not null default 0,   -- Content test mới
  optimize_actions integer not null default 0,   -- Số hành động tối ưu
  tp_rating        integer                       -- Đánh giá TP (1–5★), có thể trống
                     check (tp_rating is null or tp_rating between 1 and 5),
  note             text,                          -- Ghi chú tối ưu
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists ads_fb_task_logs_date_emp_idx
  on public.ads_fb_task_logs(log_date, employee_id);

drop trigger if exists ads_fb_task_logs_touch on public.ads_fb_task_logs;
create trigger ads_fb_task_logs_touch
  before update on public.ads_fb_task_logs
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════
-- 2) ads_fb_targets — Target tháng theo nhân viên (÷ số ngày → target/ngày)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.ads_fb_targets (
  id             uuid primary key default gen_random_uuid(),
  period         text not null,                    -- 'yyyy-mm'
  employee_id    uuid not null references public.profiles(id) on delete cascade,
  employee_name  text not null default '',
  spend_target   bigint  not null default 0,       -- Chi tiêu / tháng (đ)
  revenue_target bigint  not null default 0,       -- Doanh thu / tháng (đ)
  orders_target  integer not null default 0,       -- Đơn / tháng
  days_in_month  integer not null default 30,      -- Số ngày dùng để chia KPI → ngày
  note           text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (period, employee_id)
);
create index if not exists ads_fb_targets_period_emp_idx
  on public.ads_fb_targets(period, employee_id);

drop trigger if exists ads_fb_targets_touch on public.ads_fb_targets;
create trigger ads_fb_targets_touch
  before update on public.ads_fb_targets
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════
-- RLS — xem chung (UI lọc theo phòng ban), người tạo/Admin sửa-xóa
-- ════════════════════════════════════════════════════════════════
alter table public.ads_fb_task_logs enable row level security;
alter table public.ads_fb_targets   enable row level security;

-- ── ads_fb_task_logs ──
drop policy if exists ads_fb_task_logs_select on public.ads_fb_task_logs;
create policy ads_fb_task_logs_select on public.ads_fb_task_logs
  for select to authenticated using (true);
drop policy if exists ads_fb_task_logs_insert on public.ads_fb_task_logs;
create policy ads_fb_task_logs_insert on public.ads_fb_task_logs
  for insert to authenticated with check (created_by = auth.uid());
-- SỬA/XÓA báo cáo ngày: CHỈ người tạo dòng (created_by) hoặc Admin.
drop policy if exists ads_fb_task_logs_update on public.ads_fb_task_logs;
create policy ads_fb_task_logs_update on public.ads_fb_task_logs
  for update to authenticated
  using (created_by = auth.uid() or public.auth_role() = 'Admin')
  with check (created_by = auth.uid() or public.auth_role() = 'Admin');
drop policy if exists ads_fb_task_logs_delete on public.ads_fb_task_logs;
create policy ads_fb_task_logs_delete on public.ads_fb_task_logs
  for delete to authenticated
  using (created_by = auth.uid() or public.auth_role() = 'Admin');

-- ── ads_fb_targets ── (cấu hình chung team — mọi user đã đăng nhập sửa được)
drop policy if exists ads_fb_targets_select on public.ads_fb_targets;
create policy ads_fb_targets_select on public.ads_fb_targets
  for select to authenticated using (true);
drop policy if exists ads_fb_targets_insert on public.ads_fb_targets;
create policy ads_fb_targets_insert on public.ads_fb_targets
  for insert to authenticated with check (created_by = auth.uid());
drop policy if exists ads_fb_targets_update on public.ads_fb_targets;
create policy ads_fb_targets_update on public.ads_fb_targets
  for update to authenticated using (true) with check (true);
drop policy if exists ads_fb_targets_delete on public.ads_fb_targets;
create policy ads_fb_targets_delete on public.ads_fb_targets
  for delete to authenticated using (true);
