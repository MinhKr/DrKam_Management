# Thí nghiệm dò chỉ số Facebook (chi phí 0, ~15 phút)

Mục tiêu: xem **thực tế** Meta Graph API trả về số thật cho chỉ số nào trong 8 chỉ số
traffic của 2 page "Kênh thương hiệu" DrKam — trước khi quyết định code nút "Đồng bộ".

> Script `fb-insights-test.mjs` **chỉ đọc**, không ghi gì lên Facebook hay database.

---

## Bước 1 — Mở Graph API Explorer

Vào: https://developers.facebook.com/tools/explorer/

(Đăng nhập bằng tài khoản Facebook **là admin của 2 page DrKam**.)

## Bước 2 — Tạo app tạm (nếu chưa có)

- Góc trên bên phải, mục **"Meta App"** → chọn **"Create App"** nếu chưa có app nào.
- Loại app: chọn **"Other" → "Business"** (đặt tên gì cũng được, ví dụ `DrKam Test`).
- App để ở chế độ **Development** là đủ — KHÔNG cần App Review, KHÔNG cần xác minh
  doanh nghiệp, vì ta chỉ đọc page của chính mình.

## Bước 3 — Cấp quyền (permissions)

Trong Graph API Explorer, bấm **"Add a Permission"** rồi tick các quyền sau:

- `pages_show_list`
- `pages_read_engagement`
- `read_insights`

(Nếu có hỏi thêm `pages_read_user_content` thì tick luôn.)

## Bước 4 — Lấy token

- Bấm **"Generate Access Token"** → cửa sổ Facebook hiện ra → chọn **cả 2 page DrKam** →
  đồng ý.
- Token (chuỗi dài bắt đầu bằng `EAA...`) hiện trong ô **"Access Token"**. **Copy nó.**

> Token này là token tạm (~1-2 tiếng) — đủ để chạy thí nghiệm. Không cần token sống lâu
> ở bước này.

## Bước 5 — Chạy script

Mở PowerShell tại thư mục `drkam-pharma-dashboard`, dán token vào và chạy:

```powershell
$env:FB_TOKEN="EAA...dán_token_vào_đây..."
node scripts/fb-insights-test.mjs
```

(Hoặc gọn hơn: `node scripts/fb-insights-test.mjs EAA...token...`)

## Bước 6 — Đọc kết quả

Script in ra cho **từng page** một bảng ✅ / ⛔:

- ✅ = chỉ số này Meta trả số thật → **kéo tự động được**.
- ⛔ = không có / lỗi → **phải nhập tay** (hoặc thử cách khác).

Gửi lại toàn bộ kết quả in ra màn hình cho mình. Dựa vào đó mình sẽ chốt thiết kế nút
Đồng bộ cho đúng (chỉ số nào auto, chỉ số nào để ô nhập tay).

---

### Lỗi thường gặp

- **"không lấy được /me/accounts"** → token hết hạn (tạo lại ở Bước 4) hoặc chưa tick đủ
  quyền ở Bước 3.
- **"không quản lý page nào"** → đăng nhập Explorer bằng tài khoản KHÔNG phải admin page.
  Đăng nhập lại bằng đúng tài khoản admin 2 page DrKam.
- Token lộ ra ngoài cũng không sao ở bước test (nó tự hết hạn sau ~1-2h). Đừng commit nó
  vào git là được.
