# Module ORDER — hướng dẫn bật trên Supabase

Module Order gồm **2 luồng đặt việc** giữa các team:

| Màn hình | Bên đặt | Bên nhận | Bảng |
|---|---|---|---|
| Order team Media | Team Content | Team Media | `content_media_orders` |
| Order team Content | Team Ads Facebook | Team Content | `ads_content_orders` |

## 1. Chạy migration

Supabase Dashboard → **SQL Editor** → dán toàn bộ nội dung
`supabase/migrations/0013_orders.sql` → **Run**.

File idempotent, chạy lại nhiều lần an toàn. Migration tạo:

- 2 bảng trên + index theo `(status, deadline)` và theo người phụ trách.
- Trigger `updated_at`.
- Hàm `public.auth_department()` — trả phòng ban của user đang đăng nhập, dùng cho RLS.
- Policy RLS theo mô hình **đúng vai**.

Chạy tiếp `supabase/migrations/0014_orders_rls_fix.sql` — nới policy UPDATE/DELETE
cho người được ghi tên trên order (người đặt / người làm / Ads đặt / Content phụ trách)
và cho dòng chưa có `created_by`. Không chạy file này thì có thể gặp lỗi
**sửa order xong, reload lại về số cũ** (RLS chặn nhưng Postgres không báo lỗi).

## 2. Mô hình quyền (RLS + UI)

| Thao tác | Ai làm được |
|---|---|
| Xem | Mọi user đã đăng nhập (UI lọc theo phòng ban) |
| Tạo order | Mọi user; dòng ghi `created_by = auth.uid()` |
| Sửa phần **yêu cầu** (brief, hạn, ưu tiên, link mẫu…) | Người đặt (người tạo) hoặc Admin |
| Sửa phần **tiến độ** (trạng thái, người làm, link trả) | Bên nhận (Media / Content) hoặc Admin hoặc người đặt |
| Xóa | Người tạo, người đặt ghi trên order, hoặc Admin |

Sau 0014, RLS còn cho sửa khi mình là **người được ghi tên** trên order
(`requester_id` / `assignee_id` / `ads_owner_id` / `content_owner_id`) hoặc dòng
chưa có `created_by`. Nếu bị chặn, app **báo lỗi rõ** thay vì im lặng —
repo dùng `.update(...).select()` và ném lỗi khi 0 dòng bị ghi.

Quy ước phòng ban: **team Content = nhân sự KHÔNG thuộc `Media` và `Ads Facebook`**
(giống cách lọc ở Checklist Content). Vì vậy hồ sơ nhân sự trong `profiles`
phải điền đúng cột `department` thì phân quyền mới chạy chuẩn.

## 3. Cảnh báo hạn

Tính runtime trong `src/lib/orders.ts`, không lưu DB:

- **Quá hạn** (đỏ): `deadline` < hôm nay và order chưa Hoàn thành/Hủy.
- **Sắp hết hạn** (cam): còn ≤ **1 ngày** (hết hạn hôm nay hoặc ngày mai) — ngưỡng `ORDER_URGENT_DAYS`.
- **Còn hạn** (xanh): xa hơn 1 ngày.
- Order **Hoàn thành / Hủy** không bao giờ bị cảnh báo, kể cả khi quá hạn.
- Order **chưa đặt deadline** không có cảnh báo — badge ghi "Chưa đặt hạn".

Số cảnh báo (quá hạn + sắp hết hạn) hiện luôn ở **badge đỏ cạnh mục Order trong menu**.

## 4. Kiểm tra nhanh sau khi chạy migration

```sql
-- Phải trả về 2 dòng
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('content_media_orders','ads_content_orders');

-- Phòng ban của chính mình (dùng cho RLS)
select public.auth_department();
```

Nếu chưa chạy migration, app vẫn mở bình thường: phần Order chỉ log cảnh báo
`Tải dữ liệu Order thất bại (có thể chưa chạy migration 0013)` trong console
và hiển thị danh sách rỗng.

## 5. Dữ liệu cũ

Chốt với user: **không đổ dữ liệu cũ** từ 2 Google Sheet — hệ thống bắt đầu trắng,
sheet cũ giữ nguyên để tra cứu.
