-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Dữ liệu mẫu: 18 kênh thực tế (từ Google Sheet)        ║
-- ║  Chạy SAU 0001_init.sql, trong Supabase SQL Editor.            ║
-- ║  (manager_id để trống — gán người phụ trách sau khi đã có      ║
-- ║   tài khoản nhân viên.)                                        ║
-- ╚══════════════════════════════════════════════════════════════╝

insert into public.channels
  (name, brand_category, platform, channel_type, linked_shop, status, track_revenue, track_traffic)
values
  -- TikTok — Kênh thương hiệu (gắn shop): doanh thu + traffic đầy đủ
  ('drkampharmaofficial', 'Kênh thương hiệu', 'TikTok', 'Brand', 'true', 'Đã ra số', true, true),
  ('drkamvn',             'Kênh thương hiệu', 'TikTok', 'Brand', 'true', 'Đang nuôi', true, true),
  ('drkamvnofficial',     'Kênh thương hiệu', 'TikTok', 'Brand', 'true', 'Đang nuôi', true, true),

  -- TikTok — KOC inhouse (người thật): chỉ doanh thu
  ('happyy.daily',    'KOC người thật', 'TikTok', 'Real KOC', 'false', 'Đang nuôi', true, false),
  ('giadinhminhhee',  'KOC người thật', 'TikTok', 'Real KOC', 'false', 'Đang nuôi', true, false),
  ('nhacuacamcam',    'KOC người thật', 'TikTok', 'Real KOC', 'false', 'Đang nuôi', true, false),
  ('bao_chau_day',    'KOC người thật', 'TikTok', 'Real KOC', 'false', 'Đang nuôi', true, false),

  -- TikTok — KOC inhouse (AI): chỉ doanh thu
  ('koi_928tramtram',   'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false),
  ('tinh642002',        'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false),
  ('doisongsuckhoe86',  'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false),
  ('ngoc.huong259',     'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false),
  ('haidang0136',       'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false),
  ('minhquan8046',      'KOC AI', 'TikTok', 'AI KOC', 'false', 'Đang nuôi', true, false),

  -- Facebook — Kênh thương hiệu: chỉ traffic (không doanh thu)
  ('DrKam - Sống khỏe cùng Chuyên gia',                  'Kênh thương hiệu', 'Facebook', 'Brand', 'false', 'Đang nuôi', false, true),
  ('DrKam - Bác sĩ Răng Miệng Họng của mọi gia đình',    'Kênh thương hiệu', 'Facebook', 'Brand', 'false', 'Đang nuôi', false, true),

  -- Facebook — KOC inhouse (fanpage AI, theo dõi qua ID Affiliate): chỉ doanh thu
  ('conghaing',    'KOC AI', 'Facebook', 'AI KOC', 'false', 'Đang nuôi', true, false),
  ('ynni1809',     'KOC AI', 'Facebook', 'AI KOC', 'false', 'Đang nuôi', true, false),
  ('duocsikhanh',  'KOC AI', 'Facebook', 'AI KOC', 'false', 'Đang nuôi', true, false);
