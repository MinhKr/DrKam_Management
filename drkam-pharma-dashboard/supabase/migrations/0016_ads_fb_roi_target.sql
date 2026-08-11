-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0016                                        ║
-- ║  TEAM ADS FACEBOOK — thêm chỉ tiêu ROI vào target tháng.       ║
-- ║  Màn "KPI tháng — Team Ads Facebook" cho Admin đặt 2 chỉ tiêu: ║
-- ║  doanh thu/tháng (revenue_target) và ROI (roi_target).         ║
-- ║  roi_target lưu dạng TỈ LỆ, khớp engine: ROI = ROAS − 1        ║
-- ║  (= DT/Chi − 1). VD ROI 150% ⇒ roi_target = 1.5 ⇒ DT = 2.5×Chi.║
-- ║  Ô nhập trong app hiển thị theo %, tự quy đổi ÷100 khi lưu.    ║
-- ║  Chạy SAU 0011, trong Supabase Dashboard > SQL Editor.         ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                      ║
-- ╚══════════════════════════════════════════════════════════════╝
alter table public.ads_fb_targets
  add column if not exists roi_target numeric(8,4) not null default 0;

comment on column public.ads_fb_targets.roi_target is
  'Chỉ tiêu ROI tháng, dạng tỉ lệ (1.5 = ROI 150%). 0 = chưa đặt. ROI = DT/Chi − 1.';
