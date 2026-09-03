-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0025                                        ║
-- ║  ĐƯA NGƯỜI PHỤ TRÁCH KÊNH VỀ ĐÚNG DỮ LIỆU (bỏ bảng dự phòng)   ║
-- ║                                                                ║
-- ║  VẤN ĐỀ: nhiều kênh seed có channels.manager_name TRỐNG, app    ║
-- ║  phải lấy tạm từ bảng cứng MANAGER_OVERRIDE trong               ║
-- ║  src/lib/channels.ts. Hệ quả: xoá một nhân sự thì kênh của họ   ║
-- ║  KHÔNG thể chuyển về "Chưa gán" — xoá tên trong DB xong app vẫn ║
-- ║  hiện lại tên cũ từ bảng cứng.                                  ║
-- ║                                                                ║
-- ║  Migration này chép người phụ trách vào ĐÚNG cột trong DB (chỉ  ║
-- ║  điền vào kênh đang trống, KHÔNG đè kênh đã gán tay), đồng thời ║
-- ║  gắn manager_id nếu tìm được hồ sơ trùng tên. Sau đó code bỏ    ║
-- ║  hẳn bảng cứng — nguồn duy nhất là DB, sửa ở tab Quản lý kênh.  ║
-- ║                                                                ║
-- ║  Chạy SAU 0024, trong Supabase Dashboard > SQL Editor.          ║
-- ║  Idempotent — chạy lại nhiều lần an toàn (chỉ điền chỗ trống).  ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── Kênh có tên không dấu: khớp chính xác theo tên ──────────────
update public.channels c
set manager_name = v.manager,
    manager_id   = coalesce(c.manager_id,
                            (select p.id from public.profiles p
                             where p.name = v.manager and p.status = 'Hoạt động' limit 1))
from (values
  ('drkampharmaofficial', 'Nguyễn Công Hải'),
  ('drkamvn',             'Hoàng Yến Nhi'),
  ('drkamvnofficial',     'Đặng Kim Khánh'),
  ('happyy.daily',        'Hoàng Yến Nhi'),
  ('nhacuacamcam',        'Nguyễn Công Hải'),
  ('giadinhminhhee',      'Nguyễn Công Hải'),
  ('bao_chau_day',        'Đặng Kim Khánh'),
  ('koi_928tramtram',     'Đặng Kim Khánh'),
  ('doisongsuckhoe86',    'Đặng Kim Khánh'),
  ('ngoc.huong259',       'Nguyễn Công Hải'),
  ('haidang0136',         'Nguyễn Công Hải'),
  ('minhquan8046',        'Lê Đắc Nhật Minh'),
  ('quinchana82',         'Hoàng Yến Nhi'),
  ('anhquan9684',         'Lê Đắc Nhật Minh'),
  ('conghaing',           'Nguyễn Công Hải'),
  ('ynni1809',            'Hoàng Yến Nhi'),
  ('duocsikhanh',         'Đặng Kim Khánh'),
  ('leminh139148',        'Lê Đắc Nhật Minh')
) as v(ch_name, manager)
where lower(c.name) = lower(v.ch_name)
  and (c.manager_name is null or btrim(c.manager_name) = '');

-- ── 2 fanpage thương hiệu (tên có dấu) — khớp bằng mẫu cho chắc ──
update public.channels
set manager_name = 'Đặng Kim Khánh',
    manager_id   = coalesce(manager_id,
                            (select p.id from public.profiles p
                             where p.name = 'Đặng Kim Khánh' and p.status = 'Hoạt động' limit 1))
where (manager_name is null or btrim(manager_name) = '')
  and platform = 'Facebook'
  and (name ilike '%Sống khỏe%' or name ilike '%Răng Miệng%');

-- ════════════════════════════════════════════════════════════════
-- KIỂM TRA: kênh nào còn trống người phụ trách sau khi chạy —
-- vào app, tab "Quản lý kênh", cột Người phụ trách sẽ hiện ô vàng
-- "— Chưa gán —" để Admin chọn.
--
--   select name, platform, coalesce(nullif(btrim(manager_name), ''), '(chưa gán)') as nguoi_phu_trach
--   from public.channels order by 3, 1;
-- ════════════════════════════════════════════════════════════════
