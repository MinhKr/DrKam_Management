-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Seed Team Ads Facebook (nhân viên Nguyễn Thị Hà)      ║
-- ║  Chạy SAU migration 0011 và SAU khi đã tạo tài khoản Auth cho  ║
-- ║  Hà (Authentication > Add user, email hant@drkam.vn).          ║
-- ║  Việc làm: gán phòng "Ads Facebook" + vai trò Nhân viên,       ║
-- ║  đặt target tháng 7/2026 (80tr chi · 200tr DT · 700 đơn ÷30).  ║
-- ║  Chạy lại nhiều lần an toàn.                                   ║
-- ╚══════════════════════════════════════════════════════════════╝
do $$
declare
  ha uuid;
begin
  select id into ha from public.profiles where email = 'hant@drkam.vn';
  if ha is null then
    raise exception 'Chưa có tài khoản Hà trong profiles. Hãy tạo qua Authentication > Add user trước (hant@drkam.vn).';
  end if;

  -- 1) Gán phòng Ads Facebook + vai trò Nhân viên + tên hiển thị.
  update public.profiles
    set name = 'Nguyễn Thị Hà', role = 'Nhân viên', department = 'Ads Facebook'
    where id = ha;

  -- 2) Target tháng 7/2026 (khớp sheet Cấu hình: Hà 80tr/200tr/700, chia 30 ngày).
  delete from public.ads_fb_targets where period = '2026-07' and employee_id = ha;
  insert into public.ads_fb_targets
    (period, employee_id, employee_name, spend_target, revenue_target, orders_target, days_in_month, created_by)
    values
    ('2026-07', ha, 'Nguyễn Thị Hà', 80000000, 200000000, 700, 30, ha);

  raise notice 'Seed Team Ads Facebook (Hà) xong. ha=%', ha;
end $$;
