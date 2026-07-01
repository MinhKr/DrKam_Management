-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0005                                        ║
-- ║  Thêm cột "số video đăng" cho báo cáo ngày (daily_reports).   ║
-- ║  Nullable — báo cáo cũ không có giá trị vẫn hợp lệ.           ║
-- ║  Chạy SAU 0004, trong Supabase Dashboard > SQL Editor.        ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                      ║
-- ╚══════════════════════════════════════════════════════════════╝

alter table public.daily_reports
  add column if not exists video_count integer;
