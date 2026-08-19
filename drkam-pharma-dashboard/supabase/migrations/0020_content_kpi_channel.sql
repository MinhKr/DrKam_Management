-- ╔═════════════════════════════════════════════════════════╗
--
--  DrKam - Migration 0020
--  BANG KPI MOI: CHI TIEU DOANH THU THEO TUNG KENH
--
--  Bang KPI cu chi co 13 hang muc co dinh trong code, trong do "TikTok AI"
--  gop chung moi kenh AI nen khong theo doi duoc tung kenh. Bang moi lay
--  thang danh sach kenh dang quan ly: 1 kenh = 1 dong KPI.
--
--  KHONG tao bang moi: dung lai content_kpi_targets (0015) voi
--  kind = 'channel', item_id = 'ch:<ten kenh da chuan hoa>'.
--  Hai bang chay SONG SONG - so KPI cu giu nguyen de doi chieu, khong mat
--  du lieu; item_id khac nhau nen khong de nhau.
--
--  Chay SAU 0019, trong Supabase Dashboard > SQL Editor.
--  Idempotent - chay lai nhieu lan an toan.
--
-- ╚═════════════════════════════════════════════════════════╝

alter table public.content_kpi_targets
  drop constraint if exists content_kpi_targets_kind_check;

alter table public.content_kpi_targets
  add constraint content_kpi_targets_kind_check
  check (kind in ('revenue', 'viewreach', 'employee', 'channel'));
