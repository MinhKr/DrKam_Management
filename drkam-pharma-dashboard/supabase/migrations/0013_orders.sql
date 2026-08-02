-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0013                                       ║
-- ║  MODULE ORDER — 2 luồng đặt việc giữa các team:               ║
-- ║   • content_media_orders — Team Content ĐẶT team Media         ║
-- ║       (nguồn: sheet "Tháng MM.YYYY - Media")                   ║
-- ║   • ads_content_orders   — Team Ads Facebook ĐẶT team Content  ║
-- ║       (nguồn: sheet order kịch bản của team Ads)               ║
-- ║  Cảnh báo hạn (gấp/quá hạn) KHÔNG lưu ở đây — tính runtime     ║
-- ║  trong src/lib/orders.ts từ deadline + trạng thái.             ║
-- ║  MÔ HÌNH QUYỀN (đúng vai: bên đặt tạo — bên nhận cập nhật):    ║
-- ║   • XEM: mọi user đã đăng nhập (UI lọc theo phòng ban).        ║
-- ║   • THÊM: mọi user (created_by = auth.uid()).                  ║
-- ║   • SỬA: người tạo · Admin · HOẶC người thuộc team NHẬN order. ║
-- ║   • XÓA: chỉ người tạo hoặc Admin.                             ║
-- ║  Chạy SAU 0012, trong Supabase Dashboard > SQL Editor.         ║
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

-- Phòng ban của user đang đăng nhập — dùng cho policy "bên nhận cập nhật".
-- security definer để đọc được profiles mà không vướng RLS của chính bảng đó.
create or replace function public.auth_department()
returns text language sql stable security definer set search_path = public as $$
  select department from public.profiles where id = auth.uid();
$$;

-- ════════════════════════════════════════════════════════════════
-- 1) content_media_orders — Team Content ĐẶT team Media
--    1 dòng = 1 đầu việc (video/ảnh) giao cho 1 nhân sự Media.
-- ════════════════════════════════════════════════════════════════
create table if not exists public.content_media_orders (
  id             uuid primary key default gen_random_uuid(),
  order_date     date not null default current_date,   -- NGÀY ORDER
  category       text not null default '',             -- LOẠI (Bán hàng, Bs Nguyên daily, Facebook…)
  title          text not null default '',             -- TITLE
  order_link     text,                                 -- LINK ORDER (kịch bản / brief)
  note           text,                                 -- NOTE
  priority       text not null default 'TRUNG BÌNH'    -- ƯU TIÊN
                   check (priority in ('CAO','TRUNG BÌNH','THẤP')),
  requester_id   uuid references public.profiles(id) on delete set null,  -- ORDER (người đặt)
  requester_name text not null default '',
  assignee_id    uuid references public.profiles(id) on delete set null,  -- PICK (người làm)
  assignee_name  text not null default '',
  deadline       date,                                 -- DEADLINE (trống = chưa đặt hạn)
  status         text not null default 'Chờ nhận'      -- TRẠNG THÁI
                   check (status in ('Chờ nhận','Đang làm','Hoàn thành','Delay','Hủy')),
  result_link    text,                                 -- LINK VIDEO trả về
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists content_media_orders_deadline_idx
  on public.content_media_orders(status, deadline);
create index if not exists content_media_orders_assignee_idx
  on public.content_media_orders(assignee_id, order_date);

drop trigger if exists content_media_orders_touch on public.content_media_orders;
create trigger content_media_orders_touch
  before update on public.content_media_orders
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════
-- 2) ads_content_orders — Team Ads Facebook ĐẶT team Content
--    Vòng đời: Ads đặt brief → Content viết KB → Editor dựng video
--    → Ads chạy và ghi kết quả (tiền tiêu / số data / giải trình).
-- ════════════════════════════════════════════════════════════════
create table if not exists public.ads_content_orders (
  id               uuid primary key default gen_random_uuid(),
  order_date       date not null default current_date,  -- NGÀY
  post_code        text,                                -- ID - BÀI VIẾT (vd ID-H24061)
  topic            text not null default '',            -- LOẠI KỊCH BẢN (Hôi miệng, Viêm nướu…)
  ads_owner_id     uuid references public.profiles(id) on delete set null,  -- ADS đặt
  ads_owner_name   text not null default '',
  size             text,                                -- KÍCH THƯỚC (9:16, 3:4, 1:1…)
  sample_link      text,                                -- Link bài mẫu
  brief            text,                                -- KHUNG KỊCH BẢN VIDEO (yêu cầu)
  priority         text not null default 'TRUNG BÌNH'
                     check (priority in ('CAO','TRUNG BÌNH','THẤP')),
  deadline         date,
  status           text not null default 'Chờ nhận'
                     check (status in ('Chờ nhận','Đang viết KB','Xong KB','Đang dựng','Hoàn thành','Hủy')),
  -- ── Team Content điền ──
  script_link      text,                                -- KỊCH BẢN EDIT VIDEO
  content_owner_id uuid references public.profiles(id) on delete set null,  -- CONTENT phụ trách
  content_owner_name text not null default '',
  video_final      text,                                -- VIDEO FINAL (editor trả)
  comment_content  text,                                -- COMMENT SỬA NỘI DUNG (Content ghi)
  comment_ads      text,                                -- COMMENT NỘI DUNG SỬA (Ads ghi)
  -- ── Team Ads điền sau khi chạy ──
  is_running       boolean not null default false,      -- TÌNH TRẠNG CHẠY
  run_owner_name   text not null default '',            -- TEAM ADS (người chạy)
  air_date         date,                                -- NGÀY LÊN
  spend            bigint  not null default 0,          -- SỐ TIỀN TIÊU (đ)
  data_count       integer not null default 0,          -- SỐ LƯỢNG SỐ
  explanation      text,                                -- GIẢI TRÌNH
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists ads_content_orders_deadline_idx
  on public.ads_content_orders(status, deadline);
create index if not exists ads_content_orders_owner_idx
  on public.ads_content_orders(content_owner_id, order_date);

drop trigger if exists ads_content_orders_touch on public.ads_content_orders;
create trigger ads_content_orders_touch
  before update on public.ads_content_orders
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════
-- RLS — xem chung; bên đặt tạo, bên nhận cập nhật
-- ════════════════════════════════════════════════════════════════
alter table public.content_media_orders enable row level security;
alter table public.ads_content_orders   enable row level security;

-- ── content_media_orders — bên NHẬN là team Media ──
drop policy if exists content_media_orders_select on public.content_media_orders;
create policy content_media_orders_select on public.content_media_orders
  for select to authenticated using (true);

drop policy if exists content_media_orders_insert on public.content_media_orders;
create policy content_media_orders_insert on public.content_media_orders
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists content_media_orders_update on public.content_media_orders;
create policy content_media_orders_update on public.content_media_orders
  for update to authenticated
  using (
    created_by = auth.uid()
    or public.auth_role() = 'Admin'
    or public.auth_department() = 'Media'
  )
  with check (
    created_by = auth.uid()
    or public.auth_role() = 'Admin'
    or public.auth_department() = 'Media'
  );

drop policy if exists content_media_orders_delete on public.content_media_orders;
create policy content_media_orders_delete on public.content_media_orders
  for delete to authenticated
  using (created_by = auth.uid() or public.auth_role() = 'Admin');

-- ── ads_content_orders — bên NHẬN là team Content ──
-- Quy ước toàn hệ thống: "team Content" = nhân sự KHÔNG thuộc Media / Ads Facebook
-- (đúng cách lọc đang dùng ở Checklist Content).
drop policy if exists ads_content_orders_select on public.ads_content_orders;
create policy ads_content_orders_select on public.ads_content_orders
  for select to authenticated using (true);

drop policy if exists ads_content_orders_insert on public.ads_content_orders;
create policy ads_content_orders_insert on public.ads_content_orders
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists ads_content_orders_update on public.ads_content_orders;
create policy ads_content_orders_update on public.ads_content_orders
  for update to authenticated
  using (
    created_by = auth.uid()
    or public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  )
  with check (
    created_by = auth.uid()
    or public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  );

drop policy if exists ads_content_orders_delete on public.ads_content_orders;
create policy ads_content_orders_delete on public.ads_content_orders
  for delete to authenticated
  using (created_by = auth.uid() or public.auth_role() = 'Admin');
