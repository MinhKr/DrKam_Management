-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0002                                        ║
-- ║  • Chuẩn hóa daily_reports cho UPSERT (1 báo cáo/kênh/ngày/nguồn)║
-- ║  • Trigger updated_at                                          ║
-- ║  • MÔ HÌNH QUYỀN (Admin = toàn quyền):                         ║
-- ║      - Báo cáo kênh DÙNG CHUNG (TikTok + FB thương hiệu):      ║
-- ║        cả team sửa (can_edit_channel_reports).                 ║
-- ║      - Kênh CÁ NHÂN (FB KOC inhouse) + fanpage: chỉ chủ kênh   ║
-- ║        (channels.manager_id = auth.uid()).                     ║
-- ║      - XEM: mọi user đã đăng nhập.                             ║
-- ║  • Bảng fb_pages (fanpage thuộc 1 ID Shopee KOC inhouse)       ║
-- ║  Chạy SAU 0001_init.sql, trong Supabase Dashboard > SQL Editor ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                      ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  1. daily_reports — chuẩn hóa cho upsert                       ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1a. source_platform NOT NULL DEFAULT 'manual'
--     (BẪY: phải làm TRƯỚC khi thêm UNIQUE — NULL bị coi là khác nhau
--      trong unique index nên upsert sẽ KHÔNG gộp được.)
update public.daily_reports set source_platform = 'manual' where source_platform is null;
alter table public.daily_reports alter column source_platform set default 'manual';
alter table public.daily_reports alter column source_platform set not null;

-- 1b. channel_id NOT NULL — gắn cứng báo cáo vào kênh thật.
--     Dữ liệu cũ (trước 0002) có thể còn channel_id null → backfill từ channel_name,
--     rồi xóa dòng mồ côi không gắn được kênh (không thể thỏa NOT NULL). Tránh abort
--     migration giữa chừng trên DB đã có dữ liệu.
update public.daily_reports r
  set channel_id = c.id
  from public.channels c
  where r.channel_id is null and r.channel_name = c.name;
delete from public.daily_reports where channel_id is null;
alter table public.daily_reports alter column channel_id set not null;

-- 1c. Sửa FK channel_id: 0001 đặt ON DELETE SET NULL — mâu thuẫn với NOT NULL
--     (xóa channel sẽ cố set null → vi phạm). Đổi sang RESTRICT: KHÔNG cho xóa
--     kênh nếu còn báo cáo (bảo vệ lịch sử doanh thu — phải xử lý báo cáo trước).
alter table public.daily_reports drop constraint if exists daily_reports_channel_id_fkey;
alter table public.daily_reports
  add constraint daily_reports_channel_id_fkey
    foreign key (channel_id) references public.channels(id) on delete restrict;

-- 1d. UNIQUE(channel_id, report_date, source_platform) — nền cho upsert.
--     Index này cũng phục vụ dashboard lọc theo (channel_id, report_date) vì là
--     tiền tố trái → KHÔNG cần index (channel_id, report_date) riêng (sẽ thừa).
alter table public.daily_reports drop constraint if exists daily_reports_uniq;
alter table public.daily_reports
  add constraint daily_reports_uniq unique (channel_id, report_date, source_platform);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  2. Trigger updated_at — tự cập nhật khi UPDATE                ║
-- ╚══════════════════════════════════════════════════════════════╝
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_reports_touch_updated_at on public.daily_reports;
create trigger daily_reports_touch_updated_at
  before update on public.daily_reports
  for each row execute function public.touch_updated_at();

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  3. Hàm trợ giúp: user hiện tại có sở hữu kênh c_id không?     ║
-- ║  Admin → luôn true. Người khác → chỉ khi là manager của kênh. ║
-- ║  SECURITY DEFINER để tránh đệ quy RLS khi đọc channels.       ║
-- ╚══════════════════════════════════════════════════════════════╝
create or replace function public.owns_channel(c_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.auth_role() = 'Admin'
    or exists (
      select 1 from public.channels c
      where c.id = c_id and c.manager_id = auth.uid()
    );
$$;

-- Quyền SỬA BÁO CÁO của 1 kênh (rộng hơn owns_channel):
--  • Kênh DÙNG CHUNG (TikTok mọi loại + Facebook thương hiệu) → mọi nhân viên team sửa.
--  • Kênh CÁ NHÂN (Facebook KOC inhouse = Real/AI KOC) → chỉ chủ kênh.
--  • Admin → luôn được.
-- (fb_pages vẫn dùng owns_channel = chỉ chủ; chỉ riêng báo cáo mới mở rộng.)
create or replace function public.can_edit_channel_reports(c_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.auth_role() = 'Admin'
    or exists (
      select 1 from public.channels c
      where c.id = c_id
        and (
          c.platform = 'TikTok'
          or (c.platform = 'Facebook' and c.channel_type = 'Brand')
          or c.manager_id = auth.uid()
        )
    );
$$;

-- Chỉ mục cho cột manager_id (lọc kênh theo người phụ trách + dùng trong owns_channel).
create index if not exists channels_manager_idx on public.channels(manager_id);

-- Gán manager_id (best-effort) cho kênh seed dựa trên manager_name khớp profiles.name.
-- ⚠️ Chỉ tác dụng với tài khoản ĐÃ tồn tại lúc chạy. Sau khi Admin tạo 3 tài khoản KOC
--    (Nguyễn Công Hải / Hoàng Yến Nhi / Đặng Kim Khánh), CHẠY LẠI riêng đoạn UPDATE này
--    để họ thật sự sở hữu kênh của mình (nếu lúc migration tài khoản chưa có).
update public.channels c
  set manager_id = p.id
  from public.profiles p
  where c.manager_id is null and c.manager_name = p.name;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  4. RLS channels — ai tạo kênh thì sở hữu kênh đó              ║
-- ║  XEM: mọi user đã đăng nhập. SỬA/XÓA: Admin hoặc chủ kênh.     ║
-- ║  THÊM: phải tự gán mình làm manager (hoặc Admin gán cho ai).   ║
-- ║  Thay thế policy channels_write (FOR ALL) ở 0001.             ║
-- ╚══════════════════════════════════════════════════════════════╝
drop policy if exists channels_write  on public.channels;
drop policy if exists channels_insert on public.channels;
drop policy if exists channels_update on public.channels;
drop policy if exists channels_delete on public.channels;

create policy channels_insert on public.channels for insert to authenticated
  with check (public.auth_role() = 'Admin' or manager_id = auth.uid());
create policy channels_update on public.channels for update to authenticated
  using (public.auth_role() = 'Admin' or manager_id = auth.uid())
  with check (public.auth_role() = 'Admin' or manager_id = auth.uid());
create policy channels_delete on public.channels for delete to authenticated
  using (public.auth_role() = 'Admin' or manager_id = auth.uid());

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  5. RLS daily_reports — quyền theo can_edit_channel_reports    ║
-- ║  XEM: mọi user (giữ reports_select ở 0001).                   ║
-- ║  THÊM/SỬA/XÓA: kênh DÙNG CHUNG (TikTok + FB thương hiệu) cả   ║
-- ║   team; kênh CÁ NHÂN (FB KOC inhouse) chỉ chủ; Admin full.    ║
-- ║  (THÊM còn buộc created_by = chính mình.)                     ║
-- ╚══════════════════════════════════════════════════════════════╝
drop policy if exists reports_insert on public.daily_reports;
create policy reports_insert on public.daily_reports for insert to authenticated
  with check (created_by = auth.uid() and public.can_edit_channel_reports(channel_id));

drop policy if exists reports_update on public.daily_reports;
create policy reports_update on public.daily_reports for update to authenticated
  using (public.can_edit_channel_reports(channel_id))
  with check (public.can_edit_channel_reports(channel_id));

drop policy if exists reports_delete on public.daily_reports;
create policy reports_delete on public.daily_reports for delete to authenticated
  using (public.can_edit_channel_reports(channel_id));

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  6. fb_pages — fanpage FB thuộc 1 ID Shopee KOC inhouse        ║
-- ║  added_by_name: lưu sẵn tên người thêm (denormalize, giống    ║
-- ║  channels.manager_name) để hiển thị không cần join.           ║
-- ╚══════════════════════════════════════════════════════════════╝
create table if not exists public.fb_pages (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references public.channels(id) on delete cascade,
  name          text not null,
  added_by      uuid references public.profiles(id) on delete set null,
  added_by_name text,
  created_at    timestamptz not null default now()
);
create index if not exists fb_pages_channel_idx  on public.fb_pages(channel_id);
create index if not exists fb_pages_added_by_idx on public.fb_pages(added_by);

alter table public.fb_pages enable row level security;

-- Xem chung (mọi user đã đăng nhập); thêm/sửa/xóa: Admin hoặc chủ kênh chứa fanpage.
drop policy if exists fb_pages_select on public.fb_pages;
create policy fb_pages_select on public.fb_pages for select to authenticated using (true);

-- added_by phải là chính người đăng nhập (hoặc null) → audit trail đáng tin, không giả mạo.
drop policy if exists fb_pages_insert on public.fb_pages;
create policy fb_pages_insert on public.fb_pages for insert to authenticated
  with check (
    public.owns_channel(channel_id)
    and (added_by = auth.uid() or added_by is null)
  );

drop policy if exists fb_pages_update on public.fb_pages;
create policy fb_pages_update on public.fb_pages for update to authenticated
  using (public.owns_channel(channel_id))
  with check (public.owns_channel(channel_id));

drop policy if exists fb_pages_delete on public.fb_pages;
create policy fb_pages_delete on public.fb_pages for delete to authenticated
  using (public.owns_channel(channel_id));
