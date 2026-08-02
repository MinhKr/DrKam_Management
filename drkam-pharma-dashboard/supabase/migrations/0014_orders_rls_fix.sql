-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0014                                       ║
-- ║  SỬA LỖI: sửa order xong, reload lại về số cũ.                 ║
-- ║                                                                ║
-- ║  Nguyên nhân: policy UPDATE ở 0013 chỉ cho người TẠO dòng      ║
-- ║  (created_by), Admin, hoặc đúng phòng ban bên nhận. Khi không  ║
-- ║  khớp, Postgres KHÔNG báo lỗi — câu update chỉ chạm 0 dòng,    ║
-- ║  nên app tưởng đã lưu. Các dòng tạo trước đó (hoặc tạo bằng    ║
-- ║  tài khoản khác) rơi đúng vào trường hợp này.                  ║
-- ║                                                                ║
-- ║  Sửa: cho phép sửa thêm khi mình là người ĐƯỢC GHI TÊN trên    ║
-- ║  order (người đặt / người làm / Ads đặt / Content phụ trách),  ║
-- ║  hoặc dòng chưa có chủ (created_by null — dữ liệu cũ/seed).    ║
-- ║  Mô hình "đúng vai" giữ nguyên: người ngoài cuộc vẫn không sửa.║
-- ║  Chạy SAU 0013. Idempotent.                                    ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── content_media_orders — bên nhận là team Media ──
drop policy if exists content_media_orders_update on public.content_media_orders;
create policy content_media_orders_update on public.content_media_orders
  for update to authenticated
  using (
    created_by is null                      -- dòng cũ chưa gắn người tạo
    or created_by = auth.uid()              -- người tạo order
    or requester_id = auth.uid()            -- người ĐẶT ghi trên order
    or assignee_id = auth.uid()             -- người LÀM được giao
    or public.auth_role() = 'Admin'
    or public.auth_department() = 'Media'   -- team nhận việc
  )
  with check (
    created_by is null
    or created_by = auth.uid()
    or requester_id = auth.uid()
    or assignee_id = auth.uid()
    or public.auth_role() = 'Admin'
    or public.auth_department() = 'Media'
  );

drop policy if exists content_media_orders_delete on public.content_media_orders;
create policy content_media_orders_delete on public.content_media_orders
  for delete to authenticated
  using (
    created_by is null
    or created_by = auth.uid()
    or requester_id = auth.uid()
    or public.auth_role() = 'Admin'
  );

-- ── ads_content_orders — bên nhận là team Content ──
-- (team Content = phòng ban KHÁC 'Media' và 'Ads Facebook')
drop policy if exists ads_content_orders_update on public.ads_content_orders;
create policy ads_content_orders_update on public.ads_content_orders
  for update to authenticated
  using (
    created_by is null
    or created_by = auth.uid()
    or ads_owner_id = auth.uid()            -- Ads đặt order
    or content_owner_id = auth.uid()        -- Content phụ trách
    or public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  )
  with check (
    created_by is null
    or created_by = auth.uid()
    or ads_owner_id = auth.uid()
    or content_owner_id = auth.uid()
    or public.auth_role() = 'Admin'
    or coalesce(public.auth_department(), '') not in ('Media','Ads Facebook')
  );

drop policy if exists ads_content_orders_delete on public.ads_content_orders;
create policy ads_content_orders_delete on public.ads_content_orders
  for delete to authenticated
  using (
    created_by is null
    or created_by = auth.uid()
    or ads_owner_id = auth.uid()
    or public.auth_role() = 'Admin'
  );

-- ── Kiểm tra nhanh: dòng nào TÀI KHOẢN ĐANG ĐĂNG NHẬP sửa được? ──
-- Chạy trong SQL Editor bằng đúng tài khoản gặp lỗi (Dashboard chạy quyền
-- service_role nên luôn thấy tất cả — muốn kiểm tra thật thì thử sửa trên app).
-- select id, title, created_by, requester_id, assignee_id from public.content_media_orders;
