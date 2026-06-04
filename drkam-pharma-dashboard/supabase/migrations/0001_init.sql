-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Schema khởi tạo (Supabase / PostgreSQL)               ║
-- ║  Chạy trong: Supabase Dashboard > SQL Editor                   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── Bảng nhóm ──────────────────────────────────────────────────
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  leader_id   uuid,
  created_at  timestamptz not null default now()
);

-- ── Hồ sơ người dùng (1-1 với auth.users) ─────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  email         text not null default '',
  role          text not null default 'Nhân viên' check (role in ('Admin','Leader','Nhân viên')),
  department    text,
  status        text not null default 'Hoạt động' check (status in ('Hoạt động','Đã khóa')),
  avatar        text,
  channel_count integer not null default 0,
  team_id       uuid references public.teams(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table public.teams
  add constraint teams_leader_fk foreign key (leader_id)
  references public.profiles(id) on delete set null;

-- ── Kênh / tài sản ────────────────────────────────────────────
create table if not exists public.channels (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  brand_category text,
  platform       text not null check (platform in ('TikTok','Facebook','Shopee','YouTube')),
  channel_type   text not null check (channel_type in ('Brand','Real KOC','AI KOC')),
  linked_shop    text not null default 'false' check (linked_shop in ('true','false','disconnected')),
  audit_id       text,
  manager_id     uuid references public.profiles(id) on delete set null,
  manager_name   text,
  manager_avatar text,
  status         text not null default 'Đang nuôi' check (status in ('Đã ra số','Đang nuôi','Bóp TT','Đã khóa')),
  track_revenue  boolean not null default true,
  track_traffic  boolean not null default false,
  team_id        uuid references public.teams(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ── Báo cáo hằng ngày (nhiều dòng / kênh / ngày) ──────────────
create table if not exists public.daily_reports (
  id                uuid primary key default gen_random_uuid(),
  report_date       date not null default current_date,
  channel_id        uuid references public.channels(id) on delete set null,
  channel_name      text,
  channel_type      text,
  revenue           bigint not null default 0,
  source_platform   text,                       -- 'tiktok_shop' | 'shopee'
  created_by        uuid not null references public.profiles(id) on delete cascade,
  created_by_role   text,
  -- nhóm traffic (chỉ dùng cho kênh bật track_traffic)
  views_reach       bigint,
  comment           bigint,
  like_count        bigint,
  share             bigint,
  save_count        bigint,
  view_all_rate     numeric,
  avg_view_duration numeric,
  follower_incr     bigint,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists daily_reports_created_by_idx on public.daily_reports(created_by);
create index if not exists daily_reports_date_idx        on public.daily_reports(report_date);

-- ── Chỉ tiêu doanh thu ────────────────────────────────────────
create table if not exists public.targets (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid references public.profiles(id) on delete cascade,
  employee_name    text not null,
  employee_role    text,
  department       text,
  month            text,                         -- 'yyyy-mm'
  target_revenue   bigint not null default 0,
  achieved_revenue bigint not null default 0,
  avatar           text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ── Nhật ký kiểm toán ─────────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  ts          timestamptz not null default now(),
  operator_id uuid references public.profiles(id) on delete set null,
  operator    text not null default '',
  action      text not null,
  module      text not null default '',
  ip_address  text
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Hàm trợ giúp lấy vai trò / nhóm hiện tại (tránh RLS đệ quy)   ║
-- ╚══════════════════════════════════════════════════════════════╝
create or replace function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_team()
returns uuid language sql stable security definer set search_path = public as $$
  select team_id from public.profiles where id = auth.uid();
$$;

-- ── Tự tạo profile khi có user mới đăng ký ────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'Nhân viên')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  RLS — Phân quyền                                              ║
-- ║  Nguyên tắc đã chốt:                                           ║
-- ║   • Cả team XEM CHUNG mọi số liệu (SELECT cho mọi user đã login)║
-- ║   • User chỉ SỬA dữ liệu CỦA MÌNH (read-only của người khác)   ║
-- ║   • Leader quản lý phạm vi NHÓM mình                            ║
-- ║   • Admin toàn quyền                                            ║
-- ╚══════════════════════════════════════════════════════════════╝
alter table public.teams         enable row level security;
alter table public.profiles      enable row level security;
alter table public.channels      enable row level security;
alter table public.daily_reports enable row level security;
alter table public.targets       enable row level security;
alter table public.audit_logs    enable row level security;

-- ─── TEAMS ───
create policy teams_select on public.teams for select to authenticated using (true);
create policy teams_write  on public.teams for all    to authenticated
  using (public.auth_role() = 'Admin') with check (public.auth_role() = 'Admin');

-- ─── PROFILES ───
create policy profiles_select on public.profiles for select to authenticated using (true);
-- Admin quản lý tất cả; mỗi người được sửa hồ sơ của chính mình
create policy profiles_admin_write on public.profiles for all to authenticated
  using (public.auth_role() = 'Admin') with check (public.auth_role() = 'Admin');
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ─── CHANNELS ───
create policy channels_select on public.channels for select to authenticated using (true);
create policy channels_write on public.channels for all to authenticated
  using (
    public.auth_role() = 'Admin'
    or (public.auth_role() = 'Leader' and team_id = public.auth_team())
  )
  with check (
    public.auth_role() = 'Admin'
    or (public.auth_role() = 'Leader' and team_id = public.auth_team())
  );

-- ─── DAILY_REPORTS ───  (xem chung; sửa của mình)
create policy reports_select on public.daily_reports for select to authenticated using (true);
create policy reports_insert on public.daily_reports for insert to authenticated
  with check (created_by = auth.uid());
create policy reports_update on public.daily_reports for update to authenticated
  using (
    created_by = auth.uid()
    or public.auth_role() = 'Admin'
    or (public.auth_role() = 'Leader'
        and exists (select 1 from public.profiles p
                    where p.id = daily_reports.created_by and p.team_id = public.auth_team()))
  )
  with check (true);
create policy reports_delete on public.daily_reports for delete to authenticated
  using (
    created_by = auth.uid()
    or public.auth_role() = 'Admin'
    or (public.auth_role() = 'Leader'
        and exists (select 1 from public.profiles p
                    where p.id = daily_reports.created_by and p.team_id = public.auth_team()))
  );

-- ─── TARGETS ───
create policy targets_select on public.targets for select to authenticated using (true);
create policy targets_write on public.targets for all to authenticated
  using (
    public.auth_role() = 'Admin'
    or (public.auth_role() = 'Leader' and department is not null)
  )
  with check (
    public.auth_role() = 'Admin'
    or (public.auth_role() = 'Leader' and department is not null)
  );

-- ─── AUDIT_LOGS ───  (chỉ Admin xem; mọi user ghi log; Admin xóa)
create policy logs_select on public.audit_logs for select to authenticated
  using (public.auth_role() = 'Admin');
create policy logs_insert on public.audit_logs for insert to authenticated
  with check (true);
create policy logs_delete on public.audit_logs for delete to authenticated
  using (public.auth_role() = 'Admin');
