-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0024                                        ║
-- ║  NGƯỜI ĐÃ NGHỈ / ĐÃ XOÁ KHÔNG ĐỌC ĐƯỢC SỐ LIỆU NỮA             ║
-- ║                                                                ║
-- ║  VẤN ĐỀ: xoá hồ sơ trong app chỉ xoá dòng `profiles`; TÀI KHOẢN ║
-- ║  đăng nhập ở auth.users vẫn còn (trình duyệt không xoá được, cần║
-- ║  service key). Mọi policy SELECT lại đang là `using (true)` cho ║
-- ║  bất kỳ ai đã đăng nhập ⇒ người vừa bị xoá (hoặc bị khoá) vẫn   ║
-- ║  gọi API đọc được TOÀN BỘ doanh thu, KPI, báo cáo.              ║
-- ║                                                                ║
-- ║  CÁCH VÁ: thêm public.auth_active() — chỉ TRUE khi người gọi có ║
-- ║  hồ sơ trong profiles và status = 'Hoạt động'. Mọi policy SELECT║
-- ║  đổi sang dùng hàm này. Hệ quả:                                 ║
-- ║   • Nghỉ việc (Đã khóa) → không đọc được gì nữa.                ║
-- ║   • Xoá hẳn hồ sơ       → không đọc được gì nữa.                ║
-- ║   • Người lạ tự đăng ký (hồ sơ tạo ra ở trạng thái Đã khóa theo ║
-- ║     migration 0023) → cũng không đọc được gì.                   ║
-- ║  Riêng profiles: vẫn cho đọc ĐÚNG DÒNG CỦA MÌNH để app hiện     ║
-- ║  thông báo "tài khoản đã bị khóa" thay vì lỗi trắng.            ║
-- ║                                                                ║
-- ║  Bảng daily_reports còn siết cả GHI: người không hoạt động thì  ║
-- ║  không chèn/sửa/xoá được doanh thu.                             ║
-- ║                                                                ║
-- ║  Chạy SAU 0023, trong Supabase Dashboard > SQL Editor.          ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                       ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Người đang gọi API có phải nhân sự ĐANG HOẠT ĐỘNG không.
-- security definer để không bị chính RLS của profiles chặn lại.
create or replace function public.auth_active()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'Hoạt động'
  );
$$;

-- ── Mọi policy SELECT "using (true)" → yêu cầu tài khoản đang hoạt động ──
do $$
declare r record;
begin
  for r in
    select * from (values
      ('teams',                'teams_select'),
      ('channels',             'channels_select'),
      ('daily_reports',        'reports_select'),
      ('targets',              'targets_select'),
      ('fb_pages',             'fb_pages_select'),
      ('content_checklists',   'content_checklists_select'),
      ('media_task_logs',      'media_task_logs_select'),
      ('media_kpi_entries',    'media_kpi_entries_select'),
      ('media_improvements',   'media_improvements_select'),
      ('ads_fb_task_logs',     'ads_fb_task_logs_select'),
      ('ads_fb_targets',       'ads_fb_targets_select'),
      ('content_media_orders', 'content_media_orders_select'),
      ('ads_content_orders',   'ads_content_orders_select'),
      ('content_kpi_targets',  'content_kpi_targets_select'),
      ('web_reports',          'web_reports_select')
    ) as v(tbl, pol)
  loop
    if to_regclass('public.' || r.tbl) is null then
      continue;   -- chưa chạy migration của module đó
    end if;
    execute format('drop policy if exists %I on public.%I', r.pol, r.tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.auth_active())',
      r.pol, r.tbl
    );
  end loop;
end $$;

-- ── profiles: người đang hoạt động xem cả danh sách; ai cũng xem được ĐÚNG
--    hồ sơ của mình (để app báo "tài khoản đã bị khóa" cho đúng). ──
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (public.auth_active() or id = auth.uid());

-- ── audit_logs: giữ nguyên "chỉ Admin", thêm điều kiện đang hoạt động ──
drop policy if exists logs_select on public.audit_logs;
create policy logs_select on public.audit_logs
  for select to authenticated
  using (public.auth_active() and public.auth_role() = 'Admin');

-- ── daily_reports: siết luôn quyền GHI (đây là bảng doanh thu) ──
drop policy if exists reports_insert on public.daily_reports;
create policy reports_insert on public.daily_reports
  for insert to authenticated
  with check (public.auth_active() and created_by = auth.uid());

drop policy if exists reports_update on public.daily_reports;
create policy reports_update on public.daily_reports
  for update to authenticated
  using (
    public.auth_active()
    and (
      created_by = auth.uid()
      or public.auth_role() = 'Admin'
      or (public.auth_role() = 'Leader'
          and exists (select 1 from public.profiles p
                      where p.id = daily_reports.created_by and p.team_id = public.auth_team()))
    )
  )
  with check (true);

drop policy if exists reports_delete on public.daily_reports;
create policy reports_delete on public.daily_reports
  for delete to authenticated
  using (
    public.auth_active()
    and (
      created_by = auth.uid()
      or public.auth_role() = 'Admin'
      or (public.auth_role() = 'Leader'
          and exists (select 1 from public.profiles p
                      where p.id = daily_reports.created_by and p.team_id = public.auth_team()))
    )
  );

-- ════════════════════════════════════════════════════════════════
-- KIỂM TRA NHANH: đăng nhập bằng một nick đã khoá rồi mở app —
-- phải thấy thông báo "Tài khoản đã bị khóa", và mọi lệnh đọc số
-- liệu trả về rỗng thay vì dữ liệu thật.
-- ════════════════════════════════════════════════════════════════
