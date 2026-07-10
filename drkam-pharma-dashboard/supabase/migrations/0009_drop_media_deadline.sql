-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0009                                        ║
-- ║  Bỏ cột "deadline" (Hạn) khỏi media_task_logs.                 ║
-- ║  Cột này đã được gỡ khỏi UI Báo cáo ngày Team Media.           ║
-- ║  Chạy trong Supabase Dashboard > SQL Editor.                   ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                      ║
-- ╚══════════════════════════════════════════════════════════════╝

alter table public.media_task_logs drop column if exists deadline;
