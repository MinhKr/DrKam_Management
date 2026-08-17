-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0018                                        ║
-- ║  TEAM CONTENT — tab "Quản lý kênh" (CRUD đầy đủ).              ║
-- ║   1. channels.channel_url — link thật của kênh (trước đây UI   ║
-- ║      gắn cứng tiktok.com/@tên cho MỌI kênh → sai với FB).      ║
-- ║   2. RLS: cả team Content thêm/sửa/xóa được MỌI kênh (trước    ║
-- ║      đó chỉ Admin hoặc đúng chủ kênh mới sửa được). Nick team  ║
-- ║      Media & Ads Facebook KHÔNG đụng được vào kênh.            ║
-- ║   3. rename_channel() — đổi tên kênh + đồng bộ channel_name    ║
-- ║      trong TOÀN BỘ báo cáo cũ. Bắt buộc phải đi cùng nhau:     ║
-- ║      app nối báo cáo ↔ kênh bằng TÊN, đổi một nơi là mất       ║
-- ║      lịch sử doanh thu/traffic của kênh đó.                    ║
-- ║  Chạy SAU 0017, trong Supabase Dashboard > SQL Editor.         ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                      ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── 1. Link kênh ───────────────────────────────────────────────
alter table public.channels
  add column if not exists channel_url text;

comment on column public.channels.channel_url is
  'Link kênh (URL đầy đủ). Rỗng = app tự suy ra link TikTok từ tên kênh.';

-- ── 2. Helper phòng trường hợp chạy 0018 trước 0013/0015 ───────
create or replace function public.auth_department()
returns text language sql stable security definer set search_path = public as $$
  select department from public.profiles where id = auth.uid();
$$;

-- ── 3. RLS channels — team Content toàn quyền trên mọi kênh ────
-- "Team Content" = mọi tài khoản KHÔNG thuộc Media / Ads Facebook
--  (đúng quy ước đang dùng ở orders 0013/0014 và content_kpi 0015).
drop policy if exists channels_write  on public.channels;
drop policy if exists channels_insert on public.channels;
drop policy if exists channels_update on public.channels;
drop policy if exists channels_delete on public.channels;

create policy channels_insert on public.channels for insert to authenticated
  with check (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media', 'Ads Facebook')
  );

create policy channels_update on public.channels for update to authenticated
  using (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media', 'Ads Facebook')
  )
  with check (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media', 'Ads Facebook')
  );

create policy channels_delete on public.channels for delete to authenticated
  using (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media', 'Ads Facebook')
  );

-- ── 4. Đổi tên kênh: kênh + báo cáo cũ trong CÙNG 1 giao dịch ──
-- SECURITY DEFINER vì RLS của daily_reports (can_edit_channel_reports) chỉ cho
-- chủ kênh sửa báo cáo của kênh Facebook KOC cá nhân → nếu update thẳng từ app,
-- Postgres lặng lẽ bỏ qua các dòng không có quyền và báo cáo cũ bị mồ côi.
-- Quyền được kiểm tra ngay trong hàm, đúng bằng quyền sửa kênh ở trên.
create or replace function public.rename_channel(c_id uuid, new_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(new_name), '') = '' then
    raise exception 'Tên kênh không được để trống';
  end if;
  if not (
    public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media', 'Ads Facebook')
  ) then
    raise exception 'Bạn không có quyền đổi tên kênh';
  end if;

  update public.channels     set name = new_name where id = c_id;
  update public.daily_reports set channel_name = new_name where channel_id = c_id;
end;
$$;

revoke all on function public.rename_channel(uuid, text) from public;
grant execute on function public.rename_channel(uuid, text) to authenticated;

comment on function public.rename_channel(uuid, text) is
  'Đổi tên kênh và đồng bộ channel_name của mọi báo cáo thuộc kênh đó (app nối báo cáo ↔ kênh bằng tên).';
