-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Xóa kênh tinh642002 (TikTok AI KOC) khỏi DB production        ║
-- ║  Chạy trong: Supabase Dashboard > SQL Editor                   ║
-- ║  LƯU Ý: xóa cả dữ liệu lịch sử (báo cáo + checklist) — không   ║
-- ║  khôi phục được.                                               ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1) Báo cáo doanh thu của kênh
delete from public.daily_reports
where channel_name = 'tinh642002';

-- 2) Dòng checklist có nhắc tên kênh
delete from public.content_checklists
where label ilike '%tinh642002%';

-- 3) Kênh (tự cascade fb_pages nếu có)
delete from public.channels
where name = 'tinh642002' and platform = 'TikTok';
