-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Thêm nhân sự vào Team Ads Facebook                    ║
-- ║  Chạy SAU khi đã tạo tài khoản ở Authentication > Add user     ║
-- ║  (Auto Confirm User, metadata {"name":…, "role":"Nhân viên"}). ║
-- ║  Trigger handle_new_user chỉ điền name/email/role — KHÔNG điền ║
-- ║  department, nên phải gán phòng bằng file này thì nhân sự mới  ║
-- ║  thấy màn Ads và hiện trong bảng "KPI tháng — Team Ads FB".    ║
-- ║  KPI doanh thu/tháng KHÔNG seed ở đây: Admin nhập trong app    ║
-- ║  (KPI tháng — Team Ads Facebook), ghi vào ads_fb_targets.      ║
-- ║  Chạy lại nhiều lần an toàn.                                   ║
-- ╚══════════════════════════════════════════════════════════════╝
do $$
declare
  r        record;
  missing  text := '';
  -- Danh sách nhân sự cần thêm: (email, họ tên, vai trò).
  staff    text[][] := array[
    ['hieudn@drkam.vn', 'Đỗ Ngọc Hiếu',     'Nhân viên'],
    ['tuannd@drkam.vn', 'Nguyễn Duy Tuấn',  'Nhân viên']
  ];
  i int;
begin
  -- 1) Kiểm tra đã có tài khoản Auth chưa (báo hết một lượt cho dễ sửa).
  for i in 1 .. array_length(staff, 1) loop
    if not exists (select 1 from public.profiles where email = staff[i][1]) then
      missing := missing || staff[i][1] || ' ';
    end if;
  end loop;
  if missing <> '' then
    raise exception 'Chưa có tài khoản trong profiles: %— tạo qua Authentication > Add user trước.', missing;
  end if;

  -- 2) Gán tên hiển thị + vai trò + phòng Ads Facebook + trạng thái hoạt động.
  for i in 1 .. array_length(staff, 1) loop
    update public.profiles
      set name       = staff[i][2],
          role       = staff[i][3],
          department = 'Ads Facebook',
          status     = 'Hoạt động'
      where email = staff[i][1];
  end loop;

  raise notice 'Đã thêm % nhân sự vào Team Ads Facebook.', array_length(staff, 1);
end $$;

-- Kiểm tra lại kết quả:
select name, email, role, department, status
  from public.profiles
 where department = 'Ads Facebook'
 order by name;
