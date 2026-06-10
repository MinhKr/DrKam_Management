# Sổ mục lục báo cáo — DrKam Portal

> Mỗi phiên làm việc kết thúc → 1 báo cáo PDF. Báo cáo sau **CHỈ ghi phần mới** so với lần trước (không lặp lại).
> Cách tạo PDF: render HTML qua Edge headless (đường dẫn dự án có dấu tiếng Việt nên phải render qua thư mục tạm ASCII rồi chuyển về — xem lệnh ở cuối file).

| Ngày | File | Phạm vi đã báo cáo (mốc để lần sau không lặp) |
|------|------|----------------------------------------------|
| 09/06/2026 | [2026-06-09.pdf](2026-06-09.pdf) | **Baseline + phiên hôm nay.** Module TikTok (dropdown 3 loại hình, popup nhập tay, bảng mỗi-kênh-1-dòng + lọc ngày cộng dồn, seed mẫu). Dashboard Recharts (TikTok TH 6 KPI/4 chart; TikTok KOC 4 KPI/3 chart) + lớp analytics/dashboardKit. Mở quyền báo cáo mọi kênh. Sửa lỗi múi giờ UTC→GMT+7. Dọn UI/dead code. Bản nháp kế hoạch Database. |
| 10/06/2026 | [2026-06-10.pdf](2026-06-10.pdf) | FB Kênh thương hiệu: bỏ Graph API → **nhập tay 8 chỉ số**, dựng lại theo format TikTok (bảng + lọc ngày + dashboard) qua cờ `showRevenue`. FB KOC inhouse: dashboard **"Đua doanh thu"** so sánh 3 thành viên (đường đua + xếp hạng huy chương + donut, màu cố định/người). Icon sidebar chip màu + đổi vài icon. Đổi `BAR_COLORS` (3 đỏ/cam liền → tách hue). Ô tên dài hover-giãn-dòng. **Tạm khoá mọi mục ngoài TikTok/FB cho mọi vai trò** (giữ code). Phủ hết kênh TikTok KOC mẫu (+5 kênh) + đổi tên 2 page FB brand. |

## ▶ Mốc tiếp theo (chưa báo cáo)
- Làm lại Tổng quan bằng số thật → mở lại các mục đang khoá.
- Triển khai database thật (migration) + đẩy số lên UI.

## Lệnh tạo PDF (tham chiếu)
```bash
# 1) Ghi nội dung vào bao-cao/YYYY-MM-DD.html
# 2) Render (đường dẫn ASCII tạm vì project có dấu tiếng Việt):
TMP="/c/Users/nhatm/AppData/Local/Temp/drkam-rep"
cp "bao-cao/YYYY-MM-DD.html" "$TMP.html"
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu \
  --no-first-run --user-data-dir="C:\Users\nhatm\AppData\Local\Temp\edge-hl" --no-pdf-header-footer \
  --print-to-pdf="C:\Users\nhatm\AppData\Local\Temp\drkam-rep.pdf" \
  "file:///C:/Users/nhatm/AppData/Local/Temp/drkam-rep.html"
cp "$TMP.pdf" "bao-cao/YYYY-MM-DD.pdf"
```
