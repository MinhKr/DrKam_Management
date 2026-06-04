# PROMPT UI cho Stitch AI — Web quản trị nội bộ DrKam

> Cách dùng:
> 1. Mỗi màn hình = 1 prompt riêng. Tạo từng cái trong Stitch.
> 2. **Dán KHỐI 0 (Hệ thống thiết kế chung) vào ĐẦU mỗi prompt**, rồi nối tiếp phần mô tả màn hình bên dưới.
> 3. Nếu Stitch xử lý tiếng Việt chưa tốt, có thể dịch phần mô tả sang tiếng Anh NHƯNG **giữ nguyên các nhãn/đoạn chữ trong ngoặc kép tiếng Việt** (đó là chữ hiển thị trên UI).
> 4. Chọn loại thiết kế: **Web / Desktop dashboard**.

---

## KHỐI 0 — HỆ THỐNG THIẾT KẾ CHUNG (dán vào đầu MỌI prompt)

```
Thiết kế giao diện web (desktop) cho một PHẦN MỀM QUẢN TRỊ NỘI BỘ của công ty dược phẩm "DrKam", dùng để quản lý team marketing affiliate (TikTok & Facebook).

PHONG CÁCH:
- Dashboard quản trị hiện đại, gọn gàng, chuyên nghiệp, nhiều khoảng trắng.
- Theme sáng (light). Thẻ (card) bo góc lớn (rounded-2xl), đổ bóng nhẹ, viền mảnh.
- Font "Montserrat" (giống website thương hiệu drkam.vn). TẤT CẢ chữ trên giao diện bằng TIẾNG VIỆT.
  (Nếu Montserrat thiếu dấu tiếng Việt thì dùng font dự phòng "Be Vietnam Pro".)

MÀU SẮC (lấy đúng theo bộ nhận diện thương hiệu DrKam tại drkam.vn):
- Màu chính (primary): ĐỎ DrKam #D32027 — dùng cho nút chính, mục sidebar đang chọn, điểm nhấn thương hiệu.
- Đỏ đậm (hover/nhấn): #B70F1B.
- Màu phụ (secondary): cam đất #C05530.
- Thành công: xanh olive #627D47. Cảnh báo: vàng hổ phách #F59E0B.
- Nền: xám rất nhạt #F7F7F8; bề mặt thẻ: trắng #FFFFFF; chữ chính: #4D4D4D; tiêu đề: #1F1F1F.

BỐ CỤC CHUNG (áp dụng cho mọi màn hình trừ Đăng nhập):
- Thanh điều hướng dọc bên trái (sidebar) nền trắng, có logo "DrKam" (chữ đỏ #D32027) trên cùng và các mục:
  "Tổng quan", "Báo cáo hằng ngày", "Quản lý kênh", "Nhân viên", "Phân quyền", "Chỉ tiêu", "Thống kê", "Nhật ký".
  Mục đang chọn được tô nền đỏ nhạt + chữ/viền trái màu đỏ DrKam.
- Thanh trên cùng (topbar): ô tìm kiếm, biểu tượng chuông thông báo, avatar người dùng kèm tên và huy hiệu vai trò ("Admin" / "Leader" / "Nhân viên").
- Vùng nội dung chính bên phải.
- Responsive: đẹp trên cả màn hình lớn và điện thoại.
```

---

## MÀN HÌNH 1 — Đăng nhập

```
Màn hình ĐĂNG NHẬP (không có sidebar/topbar).
- Bố cục giữa trang: thẻ đăng nhập trắng bo góc lớn, đổ bóng, nằm giữa nền gradient đỏ DrKam (#D32027) chuyển sang trắng.
- Trên thẻ: logo "DrKam" (chữ đỏ), tiêu đề "Đăng nhập hệ thống quản trị", phụ đề "Quản lý team Marketing".
- Trường: "Email", "Mật khẩu" (có biểu tượng hiện/ẩn mật khẩu), ô tick "Ghi nhớ đăng nhập", liên kết "Quên mật khẩu?".
- Nút lớn màu đỏ DrKam #D32027: "Đăng nhập".
- Bên trái (trên màn hình lớn) là một mảng nền đỏ DrKam với minh họa/hình ảnh chăm sóc răng miệng/sức khỏe + câu slogan màu trắng "Quản lý hiệu quả - Tăng trưởng doanh thu".
```

---

## MÀN HÌNH 2 — Tổng quan (Dashboard quản lý)

```
Màn hình "TỔNG QUAN" cho Admin/Leader.
- Tiêu đề trang "Tổng quan" + bộ lọc khoảng thời gian ở góc phải ("Hôm nay", "Tuần này", "Tháng này", "Tùy chọn ngày").
- Hàng 4 thẻ số liệu (stat card) có biểu tượng, số lớn và % tăng/giảm so với kỳ trước:
  "Tổng doanh thu", "Doanh thu TikTok", "Doanh thu Shopee (qua Facebook)", "Tổng lượt xem (kênh thương hiệu)".
- Biểu đồ đường (line chart) lớn: "Xu hướng doanh thu theo ngày", có 2 đường: TikTok và Shopee.
- Bên cạnh: biểu đồ tròn/donut "Tỷ trọng doanh thu theo loại kênh" (Thương hiệu, KOC người thật, KOC AI).
- Phía dưới: bảng "Bảng xếp hạng nhân viên theo doanh thu" gồm cột: Hạng, Nhân viên (avatar + tên), Nhóm, Doanh thu, % hoàn thành chỉ tiêu (thanh tiến độ).
- Dữ liệu mẫu tiếng Việt: nhân viên "Nguyễn Văn A", kênh "drkamvn", "happyy.daily"...
```

---

## MÀN HÌNH 3 — Báo cáo hằng ngày (form nhập thông minh) ⭐ QUAN TRỌNG NHẤT

```
Màn hình "BÁO CÁO HẰNG NGÀY" để nhân viên nhập số liệu.
- Khối trên cùng "Thêm báo cáo mới" dạng form ngang:
  + Ô chọn ngày (mặc định hôm nay).
  + Ô chọn kênh (dropdown có nhóm: "TikTok - Thương hiệu", "TikTok - KOC người thật", "TikTok - KOC AI", "Facebook - Thương hiệu", "Facebook - KOC AI"; ví dụ kênh: drkamvn, happyy.daily, conghaing).
  + Ô nhập "Doanh thu (VND)".
  + Một khu vực "Chỉ số traffic" gồm 8 ô (CHỈ hiện khi chọn kênh thương hiệu): "Views/Reach", "Comment", "Like", "Share", "Lưu", "Tỷ lệ xem hết video (%)", "Thời gian xem TB (giây)", "Số follow tăng".
  + Ghi chú gợi ý nhỏ màu xám: "Kênh KOC chỉ cần nhập Doanh thu. Kênh thương hiệu nhập thêm chỉ số traffic."
  + Nút "Lưu báo cáo" (đỏ DrKam #D32027) và "Thêm dòng" (viền đỏ, nền trắng — cho phép nhập nhiều dòng cùng lúc).
- Phía dưới: bảng "Báo cáo của tôi" có bộ lọc (ngày, kênh) và các cột: Ngày, Kênh, Loại kênh (badge màu), Doanh thu, Views, Tương tác, Nguồn, Thao tác (Sửa/Xóa).
- Báo cáo cũ hơn 3 ngày hiển thị nút Sửa bị khóa (icon ổ khóa).
```

---

## MÀN HÌNH 4 — Quản lý kênh

```
Màn hình "QUẢN LÝ KÊNH".
- Nút "+ Thêm kênh" góc phải + bộ lọc theo Nền tảng và Loại hình kênh.
- Bảng danh sách kênh, nhóm theo nền tảng, các cột:
  Tên/Link kênh, Nền tảng (badge TikTok/Facebook), Loại hình (badge: "Thương hiệu", "KOC người thật", "KOC AI"), Gắn shop (icon ✓/✗), ID đối soát, Người phụ trách (avatar+tên), Trạng thái (badge: "Đang nuôi" xanh / "Đã ra đơn" / "Bị hạn chế" vàng / "Khóa" đỏ), Theo dõi (2 chip nhỏ "Doanh thu", "Traffic" bật/tắt), Thao tác.
- Dữ liệu mẫu thật: drkampharmaofficial, drkamvn, happyy.daily, koi_928tramtram, "DrKam - Sống khỏe cùng Chuyên gia", conghaing...
- Có một modal "Thêm/Sửa kênh" với các trường tương ứng + 2 công tắc (toggle) "Theo dõi doanh thu", "Theo dõi traffic".
```

---

## MÀN HÌNH 5 — Nhân viên & Phân quyền

```
Màn hình "QUẢN LÝ NHÂN VIÊN" (dành cho Admin).
- Nút "+ Thêm nhân viên" + ô tìm kiếm + lọc theo nhóm và vai trò.
- Bảng nhân viên các cột: Họ tên (avatar), Email, Vai trò (badge màu: Admin đỏ, Leader xanh ngọc, Nhân viên xám), Nhóm, Trạng thái (Đang hoạt động / Vô hiệu), Số kênh phụ trách, Thao tác.
- Một modal "Phân quyền" hiện khi bấm nút phân quyền: chọn 1 nhân viên, ô chọn "Vai trò" (Admin / Leader / Nhân viên), ô chọn "Nhóm phụ trách" (chỉ hiện khi là Leader), nút "Lưu phân quyền".
- Dữ liệu mẫu tiếng Việt.
```

---

## MÀN HÌNH 6 — Chỉ tiêu (KPI)

```
Màn hình "CHỈ TIÊU DOANH THU".
- Bộ chọn tháng ở trên.
- Lưới các thẻ, mỗi thẻ một nhân viên: avatar + tên + nhóm, "Chỉ tiêu: 50.000.000đ", "Đã đạt: 32.000.000đ", thanh tiến độ % hoàn thành (đổi màu theo mức: đỏ <50%, vàng 50-80%, xanh >80%), số % lớn.
- Nút "Đặt chỉ tiêu" mở modal: chọn nhân viên (hoặc kênh), chọn tháng, nhập "Chỉ tiêu doanh thu (VND)".
- Trên cùng có 1 thẻ tổng: "Chỉ tiêu toàn team" và "% hoàn thành chung".
```

---

## MÀN HÌNH 7 — Thống kê chi tiết

```
Màn hình "THỐNG KÊ".
- Thanh bộ lọc nâng cao: khoảng thời gian, nền tảng, loại hình kênh, nhóm, nhân viên + nút "Xuất Excel" (icon download, màu xanh olive #627D47 - success).
- Biểu đồ cột (bar chart) "Doanh thu theo nhân viên".
- Biểu đồ đường "Doanh thu theo thời gian" có thể chồng nhiều kênh.
- Biểu đồ "So sánh traffic giữa các kênh thương hiệu" (views, like, share).
- Bảng chi tiết có phân trang ở dưới: Ngày, Nhân viên, Kênh, Loại kênh, Doanh thu, Views, Like, Share, Follow tăng.
- Các thẻ tổng nhỏ phía trên bảng: tổng doanh thu, trung bình/ngày, kênh hiệu quả nhất.
```

---

## MÀN HÌNH 8 — Nhật ký chỉnh sửa (Audit log) — (tùy chọn, làm sau)

```
Màn hình "NHẬT KÝ" (chỉ Admin).
- Bảng dòng thời gian các thay đổi: Thời gian, Người thực hiện (avatar+tên), Hành động (badge: Tạo/Sửa/Xóa), Đối tượng (vd "Báo cáo doanh thu", "Kênh"), Chi tiết (giá trị cũ → giá trị mới), bộ lọc theo người và theo ngày.
```

---

## GỢI Ý CHO BƯỚC SAU (Google AI Studio → bàn giao cho dev)
- Khi xuất code từ AI Studio, ưu tiên xuất dạng **React + Tailwind** (đừng kèm backend tự sinh).
- Giữ nguyên tên file/component theo từng màn hình ở trên để dễ ghép.
- Copy toàn bộ vào thư mục dự án này; tôi sẽ:
  + Chuyển sang **Next.js (App Router) + TypeScript**, giữ nguyên giao diện.
  + Gắn **Supabase** (DB + Auth), phân quyền Admin/Leader/User, chế độ xem chung read-only.
  + Thay biểu đồ tĩnh bằng **Recharts** dùng dữ liệu thật.
  + Nối **API TikTok Shop Seller** cho phần doanh thu TikTok.
```
