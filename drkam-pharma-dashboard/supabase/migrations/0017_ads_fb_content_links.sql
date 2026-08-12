-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0017                                        ║
-- ║  TEAM ADS FACEBOOK — lưu LINK CONTENT MỚI của báo cáo ngày.     ║
-- ║  Một ô text, MỖI DÒNG 1 LINK. App đếm số dòng có nội dung để   ║
-- ║  đối chiếu với ô "Content mới" (chỉ tiêu 10% điểm): lệch nhau  ║
-- ║  thì hiện cảnh báo ở Báo cáo ngày và Tổng quan.                ║
-- ║  Chạy SAU 0011, trong Supabase Dashboard > SQL Editor.         ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                      ║
-- ╚══════════════════════════════════════════════════════════════╝
alter table public.ads_fb_task_logs
  add column if not exists content_links text;

comment on column public.ads_fb_task_logs.content_links is
  'Link content mới của ngày — mỗi dòng 1 link. App đếm số dòng để đối chiếu với content_test.';
