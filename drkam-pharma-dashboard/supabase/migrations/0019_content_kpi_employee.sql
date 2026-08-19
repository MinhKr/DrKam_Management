-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0019                                       ║
-- ║  KPI DOANH THU THEO NHÂN VIÊN — TEAM CONTENT                   ║
-- ║                                                                ║
-- ║  Theo bảng KPIs công ty (Google Sheet), mỗi vị trí team Content ║
-- ║  có chỉ tiêu DOANH THU riêng: Content TikTok 240tr · Fanpage +  ║
-- ║  SEO 240tr · Marketing AI 80tr · Leader 800tr (= tổng cả team). ║
-- ║  Trước 0019 app chỉ đặt được chỉ tiêu theo KÊNH nên không theo  ║
-- ║  dõi được tiến độ của từng người.                              ║
-- ║                                                                ║
-- ║  KHÔNG tạo bảng mới: dùng lại content_kpi_targets (0015) với    ║
-- ║  kind = 'employee', item_id = 'emp:<tên nhân sự đã chuẩn hoá>'  ║
-- ║  (bỏ dấu · viết thường · bỏ ký tự đặc biệt — hàm norm trong     ║
-- ║  src/lib/contentKpi.ts), item_label = tên hiển thị.             ║
-- ║  Migration này CHỈ nới ràng buộc kind để nhận giá trị mới;      ║
-- ║  khóa duy nhất (period, item_id) và RLS của 0015 giữ nguyên     ║
-- ║  (team Content đặt được, Media / Ads Facebook chỉ xem).         ║
-- ║                                                                ║
-- ║  Doanh thu THỰC HIỆN của mỗi người KHÔNG lưu ở đây — tính       ║
-- ║  runtime = tổng doanh thu các kênh người đó phụ trách           ║
-- ║  (channels.manager_name), nên đổi người phụ trách kênh là tiến  ║
-- ║  độ đổi theo ngay.                                              ║
-- ║                                                                ║
-- ║  Chạy SAU 0018, trong Supabase Dashboard > SQL Editor.          ║
-- ║  Idempotent — chạy lại nhiều lần an toàn.                       ║
-- ╚══════════════════════════════════════════════════════════════╝

alter table public.content_kpi_targets
  drop constraint if exists content_kpi_targets_kind_check;

alter table public.content_kpi_targets
  add constraint content_kpi_targets_kind_check
  check (kind in ('revenue', 'viewreach', 'employee'));

-- Lọc nhanh danh sách KPI nhân viên của một tháng.
create index if not exists content_kpi_targets_kind_period_idx
  on public.content_kpi_targets(kind, period);
