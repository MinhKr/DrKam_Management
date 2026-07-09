# PROMPT UI STITCH — MODULE TEAM MEDIA (DrKam)

> Cách dùng (giống file gốc `PROMPT-UI-STITCH.md`):
> 1. Mỗi màn hình = 1 prompt riêng.
> 2. **Dán KHỐI 0 vào ĐẦU mỗi prompt**, rồi nối phần mô tả màn hình.
> 3. Chọn loại thiết kế: **Web / Desktop dashboard**.
> 4. Giữ nguyên các nhãn trong ngoặc kép tiếng Việt (đó là chữ hiển thị trên UI).

---

## KHỐI 0 — HỆ THỐNG THIẾT KẾ CHUNG (dán vào đầu MỌI prompt Media)

```
Thiết kế giao diện web (desktop) cho PHẦN MỀM QUẢN TRỊ NỘI BỘ của công ty dược "DrKam".
Đây là MODULE riêng của TEAM MEDIA (đội sản xuất video), TÁCH BIỆT khỏi team Content.

PHONG CÁCH:
- Dashboard quản trị hiện đại, gọn gàng, chuyên nghiệp, nhiều khoảng trắng.
- Theme sáng (light). Thẻ (card) bo góc lớn (rounded-2xl), đổ bóng nhẹ, viền mảnh.
- Font "Montserrat" (dự phòng "Be Vietnam Pro"). TẤT CẢ chữ bằng TIẾNG VIỆT.

MÀU SẮC (bộ nhận diện DrKam):
- Màu chính (primary): ĐỎ DrKam #D32027 — nút chính, mục sidebar đang chọn, điểm nhấn.
- Đỏ đậm (hover): #B70F1B. Màu phụ: cam đất #C05530.
- Thành công: xanh olive #627D47. Cảnh báo: vàng hổ phách #F59E0B.
- Nền: xám rất nhạt #F7F7F8; thẻ: trắng #FFFFFF; chữ chính: #4D4D4D; tiêu đề: #1F1F1F.

BỐ CỤC CHUNG (mọi màn Media):
- Sidebar trái nền trắng, logo "DrKam" đỏ trên cùng, phù hiệu nhỏ "TEAM MEDIA".
  Các mục sidebar CHỈ gồm nhóm Media: "Tổng quan Media", "Báo cáo ngày", "Nhật ký công việc",
  "KPI tháng", "Đề xuất cải tiến". Mục đang chọn tô nền đỏ nhạt + chữ/viền trái đỏ DrKam.
- Topbar: ô tìm kiếm, chuông thông báo, avatar người dùng kèm tên + huy hiệu vai trò
  ("Leader" hoặc "Nhân viên") và nhãn phòng "Media".
- Vùng nội dung chính bên phải. Responsive đẹp trên màn lớn và điện thoại.

BỐI CẢNH DỮ LIỆU (dùng đúng khi tạo dữ liệu mẫu):
- Nhân sự: "Nguyễn Trọng Khải" (Leader), "Vũ Văn Sơn" (Nhân viên).
- 6 loại video: "Branding", "BS Nguyên", "Bán hàng", "Xào KOC", "ADS FB", "FB Daily".
```

---

## MÀN 1 — Tổng quan Media

```
Màn hình "TỔNG QUAN MEDIA".
- Tiêu đề trang "Tổng quan Media" + bộ chọn tháng góc phải ("Tháng 6/2026").
- Hàng 4 thẻ số liệu (stat card) có icon, số lớn, % so kỳ trước:
  "Tổng video tháng" (vd 218), "Tổng Reach" (vd 8.023.259), "Doanh thu TikTok Seller (video inhouse)",
  "Doanh thu Facebook ADS (video team)".
- Biểu đồ tròn/donut "Tỷ trọng video theo loại" (6 loại: Branding, BS Nguyên, Bán hàng, Xào KOC, ADS FB, FB Daily).
- Biểu đồ đường "Sản lượng video theo ngày" (2 đường: Khải, Sơn).
- Bảng "Sản lượng theo nhân sự": Nhân sự (avatar+tên), Vai trò, Tổng video, Reach, thanh tiến độ % so KPI.
- Khối nhỏ "Tiến độ KPI tháng": 2 vòng tròn tiến độ cho Khải & Sơn kèm điểm tổng + xếp loại ("Xuất sắc").
```

---

## MÀN 2 — Báo cáo ngày (sản lượng video) ⭐ QUAN TRỌNG NHẤT

```
Màn hình "BÁO CÁO NGÀY" — nhập sản lượng video theo ngày cho team Media.
- Trên cùng: ô chọn ngày (mặc định hôm nay) + nút "Hôm nay".
- Với MỖI nhân sự (Khải, Sơn) một thẻ nhập riêng, tiêu đề là tên + vai trò, góc phải hiện "Tổng: 5".
  Trong thẻ là 1 hàng các ô nhập số nhỏ, mỗi ô có nhãn: "Branding", "BS Nguyên", "Bán hàng",
  "Xào KOC", "ADS FB", "FB Daily", và ô "Reach (lượt)" rộng hơn, cuối cùng ô "Ghi chú".
  Ô đã nhập > 0 tô đậm; ô trống mờ. Có badge tổng video/ngày tự cộng.
- Phía dưới: bảng "Lịch sử báo cáo ngày" các cột: Ngày, Nhân sự, Branding, BS Nguyên, Bán hàng,
  Xào KOC, ADS FB, FB Daily, Tổng, Reach, Ghi chú, Thao tác (Sửa/Xóa).
- Dòng chân bảng "TỔNG THÁNG" tô đậm cộng tất cả các cột.
- Dữ liệu mẫu thật: 01/06 Khải tổng 1, Sơn tổng 2; ... TỔNG THÁNG 218 video.
```

---

## MÀN 3 — Nhật ký công việc

```
Màn hình "NHẬT KÝ CÔNG VIỆC" — chi tiết đầu việc từng người, từng ngày.
- Bộ lọc trên: chọn nhân sự (Khải/Sơn/Tất cả) + chọn ngày/khoảng ngày.
- Nút "+ Thêm dòng" (đỏ DrKam) mở form ngang hoặc thêm dòng trực tiếp vào bảng.
- Bảng nhật ký các cột: "Thứ", "Ngày", "Content" (badge loại video), "KB" (số kịch bản),
  "Công việc" (mô tả), "Số lượng", "Tiến độ" (badge: "Hoàn thành" xanh olive / "Đang làm" vàng / "Chưa làm" xám),
  "Link sản phẩm" (icon link), "Hạn", "Ghi chú", "TT Duyệt" (badge), Thao tác (Sửa/Xóa).
- Nhóm các dòng theo ngày, mỗi ngày có tiêu đề phân cách nhẹ.
- Dữ liệu mẫu thật: "Edit video xào BLV Quang Huy 3", "Edit video BS Nguyên 338", "Họp team MKT"...
```

---

## MÀN 4 — KPI tháng

```
Màn hình "KPI THÁNG" cho team Media.
- Bộ chọn tháng trên cùng ("Tháng 6/2026") + huy hiệu "Xếp loại: Xuất sắc".
- 2 khối scorecard xếp dọc:
  Khối A "KPI LEADER MEDIA – Nguyễn Trọng Khải" và Khối B "KPI NHÂN VIÊN MEDIA – Vũ Văn Sơn".
- Mỗi khối là 1 bảng các cột: "STT", "Nhóm KPI", "Chỉ số", "Mục tiêu", "Trọng số (%)",
  "Thực tế", "Đạt (%)", "Điểm", "Ghi chú".
  + Cột "Đạt (%)" tô màu theo mức: xanh olive ≥100%, vàng 50–99%, đỏ <50%, kèm thanh tiến độ nhỏ.
  + Dòng chân "TỔNG ĐIỂM KPI" tô đậm hiển thị tổng điểm (vd 103.1) + badge xếp loại ("Xuất sắc").
- Dưới cùng: bảng nhỏ "Tổng hợp sản lượng video theo loại (cả team)":
  Branding, BS Nguyên, Bán hàng, Xào KOC, ADS FB, FB Daily, Tổng.
- Dữ liệu mẫu thật từ sheet: Leader 6 chỉ số (video 210/180, reach 8.023.259/15tr...),
  NV 2 chỉ số (video 129/90, doanh thu 333.619.633/200tr).
- Nút "Sửa KPI" (icon bút) cho phép Admin/Leader chỉnh mục tiêu/trọng số/thực tế.
```

---

## MÀN 5 — Đề xuất cải tiến

```
Màn hình "ĐỀ XUẤT CẢI TIẾN CÔNG VIỆC" — team Media.
- Bộ chọn tháng + nút "+ Thêm đề xuất" (đỏ DrKam).
- Danh sách dạng thẻ HOẶC bảng, mỗi mục gồm: "STT", "Vấn đề / Hiện trạng", "Đề xuất cải tiến",
  "Lợi ích kỳ vọng", "Ưu tiên" (badge: "Cao" đỏ, "Trung bình" vàng, "Thấp" xám).
- Sắp xếp theo ưu tiên (Cao lên đầu). Mỗi thẻ có nút Sửa/Xóa.
- Dữ liệu mẫu thật từ sheet: "Team chỉ 2 người nhưng gánh 6 đầu việc → dễ quá tải" (Ưu tiên Cao);
  "Thiếu thư viện template & quy trình edit chuẩn" (Trung bình); "Chưa có buổi review nội bộ định kỳ" (Thấp)...
```

---

## GHI CHÚ BÀN GIAO
- Xuất code **React + Tailwind** (không kèm backend). Giữ tên component theo từng màn để dễ ghép:
  `MediaOverviewComponent`, `MediaDailyReportComponent`, `MediaTaskLogComponent`,
  `MediaKpiComponent`, `MediaImprovementComponent`.
- Dev sẽ chuyển sang Next.js + TS, gắn localStorage (giai đoạn 1), Supabase (giai đoạn 2).
