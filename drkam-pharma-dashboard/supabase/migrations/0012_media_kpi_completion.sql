-- ╔══════════════════════════════════════════════════════════════╗
-- ║  0012 — % HOÀN THÀNH cho chỉ số KPI NHẬP TAY (team Media)     ║
-- ║                                                              ║
-- ║  Bối cảnh: chỉ số tự nối dữ liệu (số video, reach, doanh thu) ║
-- ║  có cột "Thực tế" tự cập nhật. Các chỉ số thêm tay qua nút    ║
-- ║  "Sửa KPI" (đào tạo, nhân sự…) không có nguồn số liệu nào →   ║
-- ║  trước đây luôn đứng ở 0% và trừ oan điểm KPI.                ║
-- ║                                                              ║
-- ║  Từ nay: chỉ số nhập tay MẶC ĐỊNH 100% (coi như hoàn thành),  ║
-- ║  Leader có thể hạ xuống trong popup "Sửa KPI".                ║
-- ║                                                              ║
-- ║  Chạy SAU 0011, trong Supabase Dashboard > SQL Editor.        ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                     ║
-- ╚══════════════════════════════════════════════════════════════╝

alter table public.media_kpi_entries
  add column if not exists completion_pct numeric not null default 100;

comment on column public.media_kpi_entries.completion_pct is
  '% hoàn thành — CHỈ áp dụng cho chỉ số nhập tay (không tự nối dữ liệu). Mặc định 100.';

-- Chặn giá trị vô lý (0–100).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'media_kpi_entries_completion_pct_range'
  ) then
    alter table public.media_kpi_entries
      add constraint media_kpi_entries_completion_pct_range
      check (completion_pct >= 0 and completion_pct <= 100);
  end if;
end $$;
