# HƯỚNG DẪN NỐI SUPABASE CHO MODULE MEDIA (Giai đoạn 2)

Sau khi làm xong, app chạy `npm run dev` (đã có `.env.local`) sẽ ở **chế độ cloud**:
2 nick Media (Khải/Sơn) đăng nhập bằng Supabase Auth, dữ liệu Báo cáo ngày / KPI / Đề xuất
lưu vào 3 bảng `media_*`. Team Content không bị ảnh hưởng.

> Demo vẫn dùng được bằng `npm run dev:demo` (bỏ qua Supabase, dữ liệu localStorage).

---

## Bước 1 — Chạy migration tạo bảng
Mở **Supabase Dashboard → SQL Editor**, dán & chạy nội dung file:
```
supabase/migrations/0007_media_reports.sql
```
Tạo 3 bảng: `media_task_logs`, `media_kpi_entries`, `media_improvements` + RLS
(xem chung, mọi user đăng nhập thêm/sửa/xóa — giống `content_checklists`).

## Bước 2 — Tạo 2 tài khoản Media
**Dashboard → Authentication → Users → Add user** (bật **Auto Confirm User**):

| Email | Mật khẩu |
|-------|----------|
| khaint@drkam.vn | 123456 |
| sonvv@drkam.vn | 123456 |

> Trigger `handle_new_user` (migration 0001) tự tạo dòng trong `profiles` cho mỗi user mới.
> Quy ước email/mật khẩu theo chuẩn nội bộ DrKam.

## Bước 3 — Gán phòng Media + seed dữ liệu T6
Mở **SQL Editor**, dán & chạy file:
```
supabase/data/media_seed_t6.sql
```
File này sẽ:
1. Đặt `department = 'Media'`, `role = 'Nhân viên'`, tên hiển thị cho Khải & Sơn.
2. Seed **KPI tháng 6** (Khải 6 chỉ số, Sơn 2 chỉ số) + **7 đề xuất cải tiến**.

> Nếu báo lỗi *"Chưa có tài khoản Khải/Sơn"* → quay lại Bước 2.
> Báo cáo ngày (dòng công việc) **không seed** — nhập trực tiếp trong app, hoặc yêu cầu bổ sung file seed.

## Bước 4 — Chạy app ở chế độ cloud
```
cd drkam-pharma-dashboard
npm run dev
```
Vào màn đăng nhập → nhập **khaint@drkam.vn / 123456** (hoặc Sơn).
→ Chỉ thấy các màn **Media** (Tổng quan Media, Báo cáo ngày, Đề xuất). Thử thêm 1 công việc ở
"Báo cáo ngày" → kiểm tra bảng `media_task_logs` trong Supabase có dòng mới.

---

## Phân quyền (RLS đã cấu hình)
| Thao tác | Ai làm được |
|----------|-------------|
| Xem | Mọi user đã đăng nhập |
| Thêm | Mọi user (ghi `created_by = auth.uid()`) |
| Sửa / Xóa | Mọi user đã đăng nhập (cả team làm hộ nhau) |

Admin đăng nhập vẫn thấy toàn hệ thống + nhóm **Team Media** ở sidebar.

## Ghi chú kỹ thuật
- Nick Media được nhận diện qua `profiles.department = 'Media'` (đã trả về trong `getCurrentSession`).
- Nếu chưa chạy migration 0007, app vẫn chạy bình thường — chỉ log cảnh báo và phần Media rỗng.
- Muốn seed thêm tháng khác (T7…): copy `media_seed_t6.sql`, đổi `period` và số liệu.
