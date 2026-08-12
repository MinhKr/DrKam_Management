# HƯỚNG DẪN NỐI SUPABASE CHO MODULE ADS FACEBOOK

Sau khi làm xong, app chạy `npm run dev` (đã có `.env.local`) sẽ ở **chế độ cloud**:
nick Ads Facebook (Hà…) đăng nhập bằng Supabase Auth, dữ liệu Báo cáo ngày lưu vào bảng
`ads_fb_task_logs`, target tháng lưu vào `ads_fb_targets`. Các team khác không bị ảnh hưởng.

> Demo vẫn dùng được bằng `npm run dev:demo` (bỏ qua Supabase, dữ liệu localStorage).

Mọi KPI (ROI/ROAS/CPA/CTR/CPM/AOV…) và **điểm 5 chỉ tiêu** (Doanh thu 40% · ROI 30% · CPA 10% ·
Tỷ lệ chốt 10% · Content mới 10%) được **tính runtime** trong `src/lib/adsFacebook.ts` từ metrics +
KPI tháng — không lưu ở DB. Chi tiết công thức ở cuối file này.

---

## Bước 1 — Chạy migration tạo bảng
Mở **Supabase Dashboard → SQL Editor**, dán & chạy nội dung file:
```
supabase/migrations/0011_ads_facebook_reports.sql
```
Tạo 2 bảng: `ads_fb_task_logs` (báo cáo ngày), `ads_fb_targets` (target tháng) + RLS
(xem chung; thêm = `created_by`; **sửa/xóa báo cáo ngày chỉ người tạo hoặc Admin**).

Chạy tiếp file `supabase/migrations/0016_ads_fb_roi_target.sql` — thêm cột `roi_target`
(chỉ tiêu ROI, dạng tỉ lệ: `2.5` = ROI 250% = DT ÷ Chi 2,5 lần) để đặt được KPI ROI ở màn KPI tháng.
> Chưa chạy 0016 thì màn KPI vẫn mở được nhưng **bấm Lưu KPI sẽ lỗi** vì DB chưa có cột.

Chạy tiếp `supabase/migrations/0017_ads_fb_content_links.sql` — thêm cột `content_links`
(link content mới của báo cáo ngày, **mỗi dòng 1 link**).
> Chưa chạy 0017 thì báo cáo ngày vẫn lưu bình thường (app chỉ gửi cột này khi có dán link),
> nhưng dán link rồi bấm Lưu sẽ lỗi vì DB chưa có cột.

## Bước 2 — Tạo tài khoản nhân viên Ads
**Dashboard → Authentication → Users → Add user** (bật **Auto Confirm User**):

| Email | Mật khẩu |
|-------|----------|
| hant@drkam.vn | 123456 |

> Trigger `handle_new_user` (migration 0001) tự tạo dòng trong `profiles`.
> Email/mật khẩu theo chuẩn nội bộ DrKam (mk mặc định 123456). **Kiểm tra lại email đúng
> quy ước cho Nguyễn Thị Hà trước khi tạo.**

## Bước 3 — Gán phòng Ads Facebook + đặt target
Mở **SQL Editor**, dán & chạy file:
```
supabase/data/adsfb_seed_ha.sql
```
File này sẽ:
1. Đặt `department = 'Ads Facebook'`, `role = 'Nhân viên'`, tên hiển thị cho Hà.
2. Đặt **target tháng 7/2026**: chi 80tr · DT 200tr · 700 đơn ÷ 30 ngày.

> Nếu báo lỗi *"Chưa có tài khoản Hà"* → quay lại Bước 2.
> **Nơi duy nhất đặt KPI trong app là tab "KPI tháng"** (Admin): doanh thu/tháng + ROI.
> Màn Tổng quan Ads chỉ đọc — đã bỏ nút "Đặt/Sửa target" để không có 2 đường vào
> cho cùng một dòng `ads_fb_targets`. Các chỉ tiêu chi tiêu/đơn/số ngày hiện chỉ đặt
> được bằng SQL (dùng cho "% đạt đơn" và "% ngân sách" ở báo cáo ngày).

## Bước 4 — Chạy app ở chế độ cloud
```
cd drkam-pharma-dashboard
npm run dev
```
Đăng nhập **hant@drkam.vn / 123456** → chỉ thấy các màn **Ads Facebook**
(Tổng quan Ads · Báo cáo ngày). Thử thêm 1 báo cáo ở "Báo cáo ngày" → kiểm tra bảng
`ads_fb_task_logs` trong Supabase có dòng mới, và cột ROAS/CPA/điểm hiển thị đúng.

---

## Phân quyền (RLS đã cấu hình)
| Thao tác | Ai làm được |
|----------|-------------|
| Xem | Mọi user đã đăng nhập (UI lọc theo phòng ban — team chỉ thấy báo cáo team mình) |
| Thêm | Mọi user (ghi `created_by = auth.uid()`) |
| Sửa / Xóa báo cáo ngày | Người tạo dòng hoặc Admin |
| Sửa / Xóa target | Mọi user đã đăng nhập (khuyến nghị để Admin quản) |

Admin đăng nhập thấy toàn hệ thống + nhóm **Team Ads Facebook** ở sidebar, và cột "Đặt target".

## Công thức chấm điểm — 5 chỉ tiêu (chốt 2026-08-12, `src/lib/adsFacebook.ts`)

| # | Chỉ tiêu | Mốc 100 điểm | Trọng số | Cách tính điểm mục |
|---|----------|--------------|----------|--------------------|
| 1 | Doanh thu | KPI tháng ÷ **số ngày thật của tháng** | 40% | DT ngày ÷ target/ngày × 100 — **không chặn trần** |
| 2 | ROI = DT ÷ Chi | ≥ 2.5 | 30% | ROI ÷ 2.5 × 100 — **không chặn trần** |
| 3 | CPA | ≤ 140k/đơn | 10% | 140k ÷ CPA × 100 — **không chặn trần** (CPA = 0 → 200) |
| 4 | Tỷ lệ chốt = Đơn ÷ Số data | ≥ 80% | 10% | tỷ lệ ÷ 80% × 100 — **không chặn trần** |
| 5 | Content mới | ≥ 2/ngày | 10% | MIN(100, số content ÷ 2 × 100) — mục DUY NHẤT chặn trần |

4 mục đầu là "càng cao càng tốt" nên vượt mốc được thưởng điểm ⇒ **điểm tổng không có max**
(vd DT gấp 2 target/ngày + ROI 3.5 → điểm tổng ~122). Chỉ "Content mới" giữ trần 100 vì
"đạt số là tối đa".

**Link content mới (migration 0017):** ô text trong form báo cáo, mỗi dòng 1 link. Ô số
"Content mới" **tự khớp số link** dán vào; nếu người nhập tự sửa số (content không có link)
thì ngừng tự khớp và hiện cảnh báo `link_off` ở: dòng báo cáo, chi tiết báo cáo (kèm số lệch),
và mục **"Content lệch số link"** trong Top cảnh báo ở Tổng quan. Điểm vẫn tính theo ô số —
cảnh báo để TP/Admin đối chiếu. Báo cáo cũ (có số content nhưng chưa dán link) sẽ bị đánh dấu
lệch cho tới khi bổ sung link.

- **Điểm tổng** = Σ(điểm mục × trọng số). **Thiếu dữ liệu = 0 điểm** ở mục đó (chưa đặt KPI tháng,
  số data = 0, chưa có đơn…) — không chia lại trọng số.
- **Xếp loại** (thang user chốt 2026-08-12): >120 Xuất sắc · 100–120 Tốt · 80–99 Đạt · <80 Chưa đạt.
  Cảnh báo "Điểm tổng Chưa đạt" ở Tổng quan cũng dùng mốc <80.
- **ROI = DT ÷ Chi** (không trừ 1) → trùng giá trị với ROAS; app hiển thị cả hai nhãn.
  Ô "KPI ROI" ở màn KPI tháng nhập theo % (**250** = ROI 250% = DT gấp 2,5 lần chi) và chỉ để
  theo dõi — chấm điểm dùng mốc cố định 2.5 cho cả team.
- Bảng gốc user gửi ghi Doanh thu 50% nhưng 5 trọng số cộng lại 110%; user chốt hạ Doanh thu
  còn **40%** để tổng đúng 100%.
- Các chỉ số CTR · CPM · ATC · CP-mess · camp test · số hành động tối ưu · đánh giá TP ·
  target đơn & ngân sách **vẫn nhập và hiển thị để theo dõi, KHÔNG tham gia chấm điểm**.
  Cột `days_in_month` trong `ads_fb_targets` không còn dùng để chia target/ngày.

## Ghi chú kỹ thuật
- Nick Ads FB nhận diện qua `profiles.department = 'Ads Facebook'`.
- Chưa chạy migration 0011 → app vẫn chạy bình thường, chỉ log cảnh báo và phần Ads FB rỗng.
- Thêm nhân viên khác: tạo Auth user rồi chạy `supabase/data/adsfb_add_staff.sql`
  (sửa mảng `staff` trong file — email · họ tên · vai trò). File này CHỈ gán phòng ban;
  KPI doanh thu/tháng nhập trong app ở màn **KPI tháng — Team Ads Facebook** (Admin).
