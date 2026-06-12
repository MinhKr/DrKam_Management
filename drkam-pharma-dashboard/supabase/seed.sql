-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Dữ liệu mẫu: 18 kênh thực tế (từ Google Sheet)        ║
-- ║  Chạy SAU 0001_init.sql, trong Supabase SQL Editor.            ║
-- ║  manager_name: ĐÃ điền cho kênh FACEBOOK (gán chủ qua bước     ║
-- ║   UPDATE manager_id ở 0002). Kênh TikTok để NULL — bổ sung sau.║
-- ║  manager_id vẫn để trống, gán sau khi đã có tài khoản nhân sự. ║
-- ║  Chạy SAU 0003 (cần UNIQUE(platform,name) cho ON CONFLICT).    ║
-- ║  An toàn chạy lại: on conflict do nothing → không tạo trùng.   ║
-- ╚══════════════════════════════════════════════════════════════╝

insert into public.channels
  (name, brand_category, platform, channel_type, linked_shop, status, track_revenue, track_traffic, manager_name)
values
  -- TikTok — Kênh thương hiệu (gắn shop): doanh thu + traffic đầy đủ
  ('drkampharmaofficial', 'Kênh thương hiệu', 'TikTok', 'Brand', 'true', 'Đã ra số', true, true, null),
  ('drkamvn',             'Kênh thương hiệu', 'TikTok', 'Brand', 'true', 'Đang nuôi', true, true, null),
  ('drkamvnofficial',     'Kênh thương hiệu', 'TikTok', 'Brand', 'true', 'Đang nuôi', true, true, null),

  -- TikTok — KOC inhouse (người thật): chỉ doanh thu
  ('happyy.daily',    'KOC người thật', 'TikTok', 'Real KOC', 'false', 'Đang nuôi', true, false, null),
  ('giadinhminhhee',  'KOC người thật', 'TikTok', 'Real KOC', 'false', 'Đang nuôi', true, false, null),
  ('nhacuacamcam',    'KOC người thật', 'TikTok', 'Real KOC', 'false', 'Đang nuôi', true, false, null),
  ('bao_chau_day',    'KOC người thật', 'TikTok', 'Real KOC', 'false', 'Đang nuôi', true, false, null),

  -- TikTok — KOC inhouse (AI): chỉ doanh thu
  ('koi_928tramtram',   'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false, null),
  ('tinh642002',        'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false, null),
  ('doisongsuckhoe86',  'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false, null),
  ('ngoc.huong259',     'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false, null),
  ('haidang0136',       'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false, null),
  ('minhquan8046',      'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false, null),
  ('quinchana82',       'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false, null),

  -- Facebook — Kênh thương hiệu: chỉ traffic (không doanh thu)
  ('DrKam - Sống khỏe cùng Chuyên gia',                  'Kênh thương hiệu', 'Facebook', 'Brand', 'false', 'Đang nuôi', false, true, 'Trần Thị Bích'),
  ('DrKam - Bác sĩ Răng Miệng Họng của mọi gia đình',    'Kênh thương hiệu', 'Facebook', 'Brand', 'false', 'Đang nuôi', false, true, 'Nguyễn Văn An')
on conflict (platform, name) do nothing;

-- ── Facebook — KOC inhouse (ID Shopee): KHÔNG seed ──────────────
-- Theo mô hình TỰ PHỤC VỤ (chốt 12/06): mỗi thành viên tự đăng nhập rồi bấm
-- "Thêm ID Shopee của tôi" trong màn Facebook → KOC inhouse. Kênh tạo ra tự gắn
-- manager_id = chính họ (RLS owns_channel), nên KHÔNG cần seed + KHÔNG cần gán tay.
-- (conghaing = Nguyễn Công Hải, ynni1809 = Hoàng Yến Nhi, duocsikhanh = Đặng Kim Khánh.)
