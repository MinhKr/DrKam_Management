-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0010                                        ║
-- ║  Thêm cột ghi chú (note) cho checklist Team Content.           ║
-- ║  Dùng cho đầu việc "Khác" — mô tả bằng chữ (điều text/         ║
-- ║  paragraph), không đo được bằng số lượng.                     ║
-- ║  Chạy SAU 0004, trong Supabase Dashboard > SQL Editor.        ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                      ║
-- ╚══════════════════════════════════════════════════════════════╝

alter table public.content_checklists
  add column if not exists note text;
