-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0006                                        ║
-- ║  Thêm kênh "Facebook Ads" — chỉ NHẬP DOANH THU (không traffic).║
-- ║  Báo cáo gắn cứng channel_id (NOT NULL từ 0002) nên cần có     ║
-- ║  kênh này tồn tại thì mục Facebook > Facebook Ads mới lưu được.║
-- ║  Chạy SAU 0005, trong Supabase Dashboard > SQL Editor.         ║
-- ║  Idempotent — chạy lại nhiều lần an toàn (chặn trùng theo tên).║
-- ╚══════════════════════════════════════════════════════════════╝

insert into public.channels
  (name, brand_category, platform, channel_type, linked_shop, audit_id, status, track_revenue, track_traffic)
select
  'Facebook Ads', 'Facebook Ads', 'Facebook', 'Brand', 'false', 'facebook-ads', 'Đã ra số', true, false
where not exists (
  select 1 from public.channels where name = 'Facebook Ads'
);
