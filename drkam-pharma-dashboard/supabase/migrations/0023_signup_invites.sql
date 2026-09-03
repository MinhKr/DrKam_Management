-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0023                                        ║
-- ║  CHẶN NGƯỜI LẠ TỰ ĐĂNG KÝ + KHÔNG CHO TỰ PHONG ADMIN           ║
-- ║                                                                ║
-- ║  BỐI CẢNH: để Admin tạo tài khoản ngay trong app, project phải  ║
-- ║  BẬT "Allow new users to sign up" và TẮT "Confirm email".      ║
-- ║  Nhưng anon key nằm công khai trong mã trang web, nên khi đó:   ║
-- ║   1. Bất kỳ ai cũng signUp được → có tài khoản → RLS cho phép   ║
-- ║      SELECT toàn bộ số liệu (lộ doanh thu, KPI…).               ║
-- ║   2. handle_new_user() cũ lấy role TỪ user metadata — thứ do    ║
-- ║      người đăng ký tự điền → tự phong mình làm Admin được.      ║
-- ║                                                                ║
-- ║  CÁCH VÁ (không cần service key, làm được từ trình duyệt):      ║
-- ║   • Bảng signup_invites — CHỈ ADMIN ghi được: "email này được   ║
-- ║     mời, vào sẽ là vai trò X, phòng ban Y".                     ║
-- ║   • Trigger tạo hồ sơ đọc lời mời thay vì đọc metadata:         ║
-- ║       - Có lời mời  → hồ sơ đúng vai trò/phòng ban, HOẠT ĐỘNG.  ║
-- ║       - Không mời   → hồ sơ tạo ra ở trạng thái ĐÃ KHÓA và vai  ║
-- ║         trò "Nhân viên" ⇒ người lạ đăng nhập KHÔNG vào được     ║
-- ║         (src/data/auth.ts chặn tài khoản Đã khóa), Admin nhìn   ║
-- ║         thấy trong màn Quản lý nhân sự để mở hoặc xoá.          ║
-- ║     (Cố tình KHÔNG raise exception để việc tạo tay trên         ║
-- ║      Supabase > Authentication > Users vẫn chạy — chỉ là tài    ║
-- ║      khoản đó sinh ra ở trạng thái khoá, Admin bấm mở là dùng.) ║
-- ║                                                                ║
-- ║  Chạy SAU 0022, trong Supabase Dashboard > SQL Editor.          ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                       ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── Lời mời tạo tài khoản (chỉ Admin thao tác) ──────────────────
create table if not exists public.signup_invites (
  email      text primary key,
  name       text not null default '',
  role       text not null default 'Nhân viên'
               check (role in ('Admin','Leader','Nhân viên')),
  department text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.signup_invites enable row level security;

drop policy if exists signup_invites_admin_all on public.signup_invites;
create policy signup_invites_admin_all on public.signup_invites
  for all to authenticated
  using (public.auth_role() = 'Admin')
  with check (public.auth_role() = 'Admin');

-- ── Trigger tạo hồ sơ: tin LỜI MỜI, không tin metadata ──────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv public.signup_invites%rowtype;
begin
  select * into inv
  from public.signup_invites
  where lower(email) = lower(new.email);

  insert into public.profiles (id, name, email, role, department, status)
  values (
    new.id,
    coalesce(nullif(inv.name, ''), new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    -- Vai trò LẤY TỪ LỜI MỜI. Không có lời mời → luôn là Nhân viên,
    -- dù metadata có ghi 'Admin' đi nữa.
    coalesce(inv.role, 'Nhân viên'),
    inv.department,
    -- Không được mời → khoá sẵn, Admin duyệt sau.
    case when inv.email is null then 'Đã khóa' else 'Hoạt động' end
  )
  on conflict (id) do nothing;

  -- Lời mời dùng một lần.
  delete from public.signup_invites where lower(email) = lower(new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════
-- SAU KHI CHẠY, ĐỔI CẤU HÌNH AUTH (Supabase > Authentication >
-- Sign In / Providers > User Signups):
--   • Allow new users to sign up : BẬT  (app cần để tạo tài khoản)
--   • Confirm email              : TẮT  (để người mới đăng nhập ngay)
-- Người lạ có signUp được cũng chỉ ra một hồ sơ ĐÃ KHÓA, không xem
-- được dữ liệu.
-- ════════════════════════════════════════════════════════════════
