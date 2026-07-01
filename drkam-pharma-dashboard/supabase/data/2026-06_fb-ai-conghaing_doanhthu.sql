-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Nạp doanh thu: FB AI "conghaing" (Nguyễn Công Hải)    ║
-- ║  Nguồn: Google Sheet [DRKAM] BÁO CÁO TEAM CONTENT T6.2026      ║
-- ║         tab "BÁO CÁO NGÀY", dòng kênh "FB AI - conghaing".     ║
-- ║  Khoảng ngày: 11/06/2026 → 28/06/2026 (18 ngày, đủ, không hở). ║
-- ║  Chạy trong Supabase Dashboard > SQL Editor.                  ║
-- ║                                                                ║
-- ║  MAPPING (đối chiếu code app — FacebookReportComponent.tsx     ║
-- ║   handleAddReport + mappers.reportToInsert):                  ║
-- ║   • channel_type    = 'Facebook - KOC'                        ║
-- ║   • source_platform = 'shopee'  (suy từ channelType)          ║
-- ║   • channel_name    = TÊN KÊNH (= ID Shopee), KHÔNG phải      ║
-- ║                       'conghaing' — 'conghaing' là FANPAGE.   ║
-- ║   • channel_id      = kênh ID-Shopee CHA của fanpage conghaing║
-- ║  UPSERT theo UNIQUE(channel_id, report_date, source_platform) ║
-- ║   → chạy lại nhiều lần KHÔNG tạo trùng, chỉ cập nhật revenue.  ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ┌──────────────────────────────────────────────────────────────┐
-- │ BƯỚC 1 (BẮT BUỘC kiểm tra trước) — tìm đúng kênh ID-Shopee.   │
-- │ 'conghaing' có thể là FANPAGE (fb_pages) chứ không phải kênh. │
-- │ Chạy 2 câu này, xác nhận ra ĐÚNG 1 kênh của Nguyễn Công Hải.  │
-- └──────────────────────────────────────────────────────────────┘
-- -- (a) Tìm theo tên kênh trực tiếp:
-- select id, name, platform, channel_type, manager_name
--   from public.channels
--  where platform = 'Facebook' and (name ilike '%conghaing%' or manager_name ilike '%Công Hải%');
-- -- (b) Tìm theo fanpage conghaing → kênh cha:
-- select c.id as channel_id, c.name as channel_name, c.manager_name, p.name as fanpage
--   from public.fb_pages p
--   join public.channels c on c.id = p.channel_id
--  where p.name ilike '%conghaing%';
-- -- (c) Người nhập (created_by):
-- select id, name, email, role from public.profiles where email = 'hodieulinh2211@gmail.com';

-- ┌──────────────────────────────────────────────────────────────┐
-- │ BƯỚC 2 — nạp doanh thu (UPSERT).                             │
-- │ Khối DO tự dò kênh: ưu tiên tên kênh, nếu không có thì lần    │
-- │ theo fanpage 'conghaing' → kênh cha. Báo lỗi rõ nếu mơ hồ.    │
-- └──────────────────────────────────────────────────────────────┘
do $$
declare
  v_channel_id   uuid;
  v_channel_name text;
  v_created_by   uuid;
  v_role         text;     -- 'Admin' | 'Nhân viên' (khớp cách app ghi created_by_role)
  v_n            int;
begin
  -- Dò kênh: (pri 0) tên kênh khớp 'conghaing'; (pri 1) fanpage 'conghaing' → kênh cha.
  -- ⚠️ Nếu BƯỚC 1 cho thấy tên/khóa khác, chỉnh điều kiện ilike bên dưới.
  select count(*) into v_n from (
    select c.id from public.channels c
      where c.platform = 'Facebook' and c.name ilike '%conghaing%'
    union
    select c.id from public.fb_pages p join public.channels c on c.id = p.channel_id
      where p.name ilike '%conghaing%'
  ) t;
  if v_n = 0 then
    raise exception 'Khong tim thay kenh/fanpage "conghaing" — chay BUOC 1 va sua dieu kien.';
  elsif v_n > 1 then
    raise exception 'Tim thay % kenh khop "conghaing" — mo ho, chay BUOC 1 va chi dinh ro 1 channel_id.', v_n;
  end if;

  select id, name into v_channel_id, v_channel_name from (
    select c.id, c.name, 0 as pri from public.channels c
      where c.platform = 'Facebook' and c.name ilike '%conghaing%'
    union all
    select c.id, c.name, 1 as pri from public.fb_pages p join public.channels c on c.id = p.channel_id
      where p.name ilike '%conghaing%'
  ) t order by pri limit 1;

  -- Người nhập (created_by NOT NULL). ⚠️ Chỉnh email nếu cần.
  select id, (case when role = 'Admin' then 'Admin' else 'Nhân viên' end)
    into v_created_by, v_role
    from public.profiles
   where email = 'hodieulinh2211@gmail.com'
   limit 1;
  if v_created_by is null then
    raise exception 'Khong tim thay profile created_by — chay BUOC 1 va sua lai email.';
  end if;

  insert into public.daily_reports
    (report_date, channel_id, channel_name, channel_type, revenue, source_platform, created_by, created_by_role)
  values
    (date '2026-06-11', v_channel_id, v_channel_name, 'Facebook - KOC',  549000, 'shopee', v_created_by, v_role),
    (date '2026-06-12', v_channel_id, v_channel_name, 'Facebook - KOC', 2900000, 'shopee', v_created_by, v_role),
    (date '2026-06-13', v_channel_id, v_channel_name, 'Facebook - KOC', 2100000, 'shopee', v_created_by, v_role),
    (date '2026-06-14', v_channel_id, v_channel_name, 'Facebook - KOC',  388000, 'shopee', v_created_by, v_role),
    (date '2026-06-15', v_channel_id, v_channel_name, 'Facebook - KOC',  480000, 'shopee', v_created_by, v_role),
    (date '2026-06-16', v_channel_id, v_channel_name, 'Facebook - KOC', 1500000, 'shopee', v_created_by, v_role),
    (date '2026-06-17', v_channel_id, v_channel_name, 'Facebook - KOC', 2400000, 'shopee', v_created_by, v_role),
    (date '2026-06-18', v_channel_id, v_channel_name, 'Facebook - KOC', 1000000, 'shopee', v_created_by, v_role),
    (date '2026-06-19', v_channel_id, v_channel_name, 'Facebook - KOC', 4600000, 'shopee', v_created_by, v_role),
    (date '2026-06-20', v_channel_id, v_channel_name, 'Facebook - KOC', 1500000, 'shopee', v_created_by, v_role),
    (date '2026-06-21', v_channel_id, v_channel_name, 'Facebook - KOC', 4100000, 'shopee', v_created_by, v_role),
    (date '2026-06-22', v_channel_id, v_channel_name, 'Facebook - KOC', 2100000, 'shopee', v_created_by, v_role),
    (date '2026-06-23', v_channel_id, v_channel_name, 'Facebook - KOC', 5500000, 'shopee', v_created_by, v_role),
    (date '2026-06-24', v_channel_id, v_channel_name, 'Facebook - KOC',  930000, 'shopee', v_created_by, v_role),
    (date '2026-06-25', v_channel_id, v_channel_name, 'Facebook - KOC', 3700000, 'shopee', v_created_by, v_role),
    (date '2026-06-26', v_channel_id, v_channel_name, 'Facebook - KOC', 3300000, 'shopee', v_created_by, v_role),
    (date '2026-06-27', v_channel_id, v_channel_name, 'Facebook - KOC', 1700000, 'shopee', v_created_by, v_role),
    (date '2026-06-28', v_channel_id, v_channel_name, 'Facebook - KOC', 1100000, 'shopee', v_created_by, v_role)
  on conflict (channel_id, report_date, source_platform)
  do update set revenue = excluded.revenue, updated_at = now();

  raise notice 'OK — da upsert 18 dong (11/6-28/6) vao kenh "%" (id=%), tong 39.847.000 d.', v_channel_name, v_channel_id;
end $$;

-- ┌──────────────────────────────────────────────────────────────┐
-- │ BƯỚC 3 (kiểm tra sau) — xác nhận đủ 18 dòng đúng kênh.        │
-- └──────────────────────────────────────────────────────────────┘
-- select r.report_date, r.channel_name, r.revenue
--   from public.daily_reports r
--  where r.source_platform = 'shopee'
--    and r.report_date between '2026-06-11' and '2026-06-28'
--    and r.channel_id in (
--      select c.id from public.channels c where c.platform='Facebook' and c.name ilike '%conghaing%'
--      union
--      select c.id from public.fb_pages p join public.channels c on c.id=p.channel_id where p.name ilike '%conghaing%')
--  order by r.report_date;
