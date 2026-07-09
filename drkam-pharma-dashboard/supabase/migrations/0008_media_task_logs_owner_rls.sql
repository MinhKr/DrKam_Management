-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0008                                        ║
-- ║  Siết RLS Báo cáo ngày Media: mỗi người CHỈ sửa/xóa dòng của   ║
-- ║  chính mình (created_by = auth.uid()), Admin sửa/xóa tất cả.   ║
-- ║  (Xem vẫn chung; thêm vẫn ghi created_by = mình.)             ║
-- ║  Chạy nếu ĐÃ chạy 0007 bản cũ (update/delete đang = true).    ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                      ║
-- ╚══════════════════════════════════════════════════════════════╝

drop policy if exists media_task_logs_update on public.media_task_logs;
create policy media_task_logs_update on public.media_task_logs
  for update to authenticated
  using (created_by = auth.uid() or public.auth_role() = 'Admin')
  with check (created_by = auth.uid() or public.auth_role() = 'Admin');

drop policy if exists media_task_logs_delete on public.media_task_logs;
create policy media_task_logs_delete on public.media_task_logs
  for delete to authenticated
  using (created_by = auth.uid() or public.auth_role() = 'Admin');
