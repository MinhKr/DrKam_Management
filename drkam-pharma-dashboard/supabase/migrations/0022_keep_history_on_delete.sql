-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0022                                        ║
-- ║  XOÁ NHÂN SỰ / KÊNH KHÔNG ĐƯỢC LÀM MẤT BÁO CÁO CŨ               ║
-- ║                                                                ║
-- ║  VẤN ĐỀ: các bảng dữ liệu đang trỏ tới profiles bằng            ║
-- ║  ON DELETE CASCADE, nên xoá 1 nhân sự là Postgres xoá luôn:     ║
-- ║    • daily_reports    (created_by)   → MẤT SẠCH doanh thu họ nhập║
-- ║    • content_checklists (employee_id) → mất checklist ngày      ║
-- ║    • media_task_logs / media_kpi_entries (employee_id)          ║
-- ║    • ads_fb_task_logs / ads_fb_targets  (employee_id)           ║
-- ║    • targets (employee_id)                                      ║
-- ║  Số liệu sẽ lệch hẳn so với thực tế — đúng điều KHÔNG được xảy ra.║
-- ║                                                                ║
-- ║  CÁCH SỬA: cho phép cột NULL + đổi ràng buộc sang               ║
-- ║  ON DELETE SET NULL. Xoá người thì DÒNG BÁO CÁO VẪN CÒN, chỉ    ║
-- ║  mất liên kết tới hồ sơ; TÊN người đã được lưu sẵn ngay trong   ║
-- ║  từng dòng (employee_name / channel_name…) nên báo cáo cũ vẫn   ║
-- ║  đọc và cộng số bình thường.                                    ║
-- ║                                                                ║
-- ║  GHI CHÚ QUYỀN: dòng có employee_id/created_by = NULL thì các    ║
-- ║  policy kiểu "chỉ chủ dòng được sửa" không khớp ai nữa — chỉ    ║
-- ║  Admin sửa/xoá được. Đúng mong muốn: dữ liệu lịch sử nên đóng   ║
-- ║  băng, không cho người khác sửa.                                ║
-- ║                                                                ║
-- ║  Bảng nào chưa tồn tại (chưa chạy migration tương ứng) thì bỏ   ║
-- ║  qua. Chạy SAU 0021, trong Supabase Dashboard > SQL Editor.     ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                       ║
-- ╚══════════════════════════════════════════════════════════════╝

do $$
declare
  t   record;
  con record;
begin
  for t in
    select * from (values
      ('daily_reports',      'created_by'),
      ('targets',            'employee_id'),
      ('content_checklists', 'employee_id'),
      ('media_task_logs',    'employee_id'),
      ('media_kpi_entries',  'employee_id'),
      ('ads_fb_task_logs',   'employee_id'),
      ('ads_fb_targets',     'employee_id')
    ) as v(tbl, col)
  loop
    -- Bảng chưa có (chưa chạy migration của module đó) → bỏ qua.
    if to_regclass('public.' || t.tbl) is null then
      continue;
    end if;

    -- 1) Cho phép NULL để dòng lịch sử sống sót khi hồ sơ bị xoá.
    execute format('alter table public.%I alter column %I drop not null', t.tbl, t.col);

    -- 2) Gỡ mọi FK cũ (cascade) của cột này tới profiles.
    for con in
      select c.conname
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
      where c.conrelid  = ('public.' || t.tbl)::regclass
        and c.contype   = 'f'
        and c.confrelid = 'public.profiles'::regclass
        and a.attname   = t.col
    loop
      execute format('alter table public.%I drop constraint %I', t.tbl, con.conname);
    end loop;

    -- 3) Gắn lại FK với ON DELETE SET NULL.
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) '
      'references public.profiles(id) on delete set null',
      t.tbl, t.tbl || '_' || t.col || '_fkey', t.col
    );

    raise notice 'Đã chuyển %.% sang ON DELETE SET NULL', t.tbl, t.col;
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════
-- XOÁ KÊNH CŨNG KHÔNG ĐƯỢC LÀM MẤT BÁO CÁO
--
-- Migration 0002 đã đổi daily_reports.channel_id sang ON DELETE RESTRICT nên
-- Postgres CHẶN xoá kênh còn báo cáo. An toàn, nhưng kênh chết thì không dọn
-- được. Đổi sang SET NULL: xoá kênh thì DÒNG BÁO CÁO VẪN CÒN (cột channel_name
-- đã lưu sẵn tên kênh nên Tổng quan vẫn cộng đủ doanh thu lịch sử).
--
-- fb_pages.channel_id giữ nguyên ON DELETE CASCADE — đó là danh sách fanpage
-- treo dưới một ID Shopee, không phải số liệu báo cáo.
-- ════════════════════════════════════════════════════════════════
do $$
declare
  con record;
begin
  if to_regclass('public.daily_reports') is null then
    return;
  end if;

  for con in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid  = 'public.daily_reports'::regclass
      and c.contype   = 'f'
      and c.confrelid = 'public.channels'::regclass
      and a.attname   = 'channel_id'
  loop
    execute format('alter table public.daily_reports drop constraint %I', con.conname);
  end loop;

  alter table public.daily_reports alter column channel_id drop not null;
  alter table public.daily_reports
    add constraint daily_reports_channel_id_fkey
    foreign key (channel_id) references public.channels(id) on delete set null;

  raise notice 'Đã chuyển daily_reports.channel_id sang ON DELETE SET NULL';
end $$;

-- ════════════════════════════════════════════════════════════════
-- KIỂM TRA NHANH sau khi chạy: mọi dòng phải là 'a' (set null),
-- không còn 'c' (cascade).
--
--   select c.conrelid::regclass as bang, a.attname as cot, c.confdeltype as quy_tac
--   from pg_constraint c
--   join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
--   where c.contype = 'f'
--     and c.confrelid in ('public.profiles'::regclass, 'public.channels'::regclass)
--   order by 1;
-- ════════════════════════════════════════════════════════════════
