# KẾ HOẠCH DỰ ÁN — Website Quản Lý Nội Bộ (Module Team Marketing)

> Phiên bản: 3.0 — Cập nhật: 04/06/2026
> Trạng thái: Đã đối chiếu với file Google Sheet thực tế của team
> Phạm vi phiên bản đầu tiên: **Quản lý team Marketing Content** (TikTok & Facebook — kênh thương hiệu + KOC inhouse)
> **Trọng tâm: DOANH THU + TRAFFIC (theo từng loại kênh).**

---

## 1. MỤC TIÊU & VẤN ĐỀ CẦN GIẢI QUYẾT

### 1.1. Hiện trạng
- Cả team cùng nhập liệu vào **một file Google Sheet chung** (hiện mới là **bảng cấu hình ma trận** liệt kê kênh + chỉ số cần theo dõi, chưa có dữ liệu hằng ngày).
- Khó quản lý: ai cũng sửa được của ai, dễ sai/đè dữ liệu.
- Không có **thống kê tự động, biểu đồ, so sánh hiệu suất**.
- Không phân quyền theo người.

### 1.2. Mục tiêu hệ thống
| Đối tượng | Hệ thống mang lại |
|-----------|-------------------|
| **Nhân viên (User)** | Nhập doanh thu/traffic hằng ngày nhanh gọn; chỉ thấy dữ liệu của mình; theo dõi tiến độ chỉ tiêu cá nhân. |
| **Trưởng nhóm (Leader)** | Xem & quản lý dữ liệu của các thành viên trong nhóm mình. |
| **Quản lý (Admin)** | Nhìn toàn cảnh team; thống kê tự động; bảng xếp hạng; đặt chỉ tiêu; xuất Excel; **phân quyền cho tài khoản khác**. |

### 1.3. Phạm vi (Scope)
- ✅ Trong phạm vi: Quản lý nhân sự, kênh/tài sản (đa loại hình), **báo cáo doanh thu + traffic hằng ngày**, chỉ tiêu, dashboard thống kê, xuất Excel, import dữ liệu cũ, **nối API TikTok Shop Seller (ưu tiên)**.
- 🟡 Một phần: nối API lấy traffic TikTok (nghiên cứu khả thi).
- ❌ Ngoài phạm vi đợt đầu: nối API Shopee (nhập tay), quản lý lương/chấm công, các team khác.

---

## 2. BỐI CẢNH NGHIỆP VỤ (đối chiếu file thực tế)

### 2.1. Phân loại kênh
Hệ thống phân theo **2 chiều**: Nền tảng × Loại hình kênh.

| Nền tảng | Loại hình kênh | Gắn shop? | Ghi chú |
|----------|----------------|:---------:|---------|
| TikTok | Kênh thương hiệu | ✅ | Kênh chính thức gắn shop DrKam |
| TikTok | KOC inhouse – Người thật | ❌ | KOC là người thật |
| TikTok | KOC inhouse – Kênh AI | ❌ | KOC dựng bằng AI |
| Facebook | Kênh thương hiệu | — | Fanpage thương hiệu |
| Facebook | KOC inhouse – Fanpage AI | — | Theo dõi qua **ID Affiliate** |

### 2.2. Chỉ số theo dõi theo từng loại kênh (đúng theo ma trận trong file)

| Loại kênh | DOANH THU | TRAFFIC* |
|-----------|:---------:|:--------:|
| **TikTok – Thương hiệu (gắn shop)** | ✅ | ✅ Đầy đủ |
| **TikTok – KOC (người thật & AI)** | ✅ | ❌ |
| **Facebook – Thương hiệu** | ❌ | ✅ Đầy đủ |
| **Facebook – KOC (fanpage AI)** | ✅ | ❌ |

\* **TRAFFIC** gồm 8 chỉ số: `Views/Reach`, `Comment`, `Like`, `Share`, `Lưu`, `Tỷ lệ xem hết video`, `Thời gian xem trung bình`, `Số follow tăng`.

> **Thiết kế quan trọng:** mỗi kênh sẽ có **cờ bật/tắt từng nhóm chỉ số** (giống cột TRUE/X trong file). Form nhập liệu **chỉ hiện đúng ô cần nhập** theo loại kênh → nhân viên không bị rối, dữ liệu sạch.

### 2.3. Nguồn dữ liệu doanh thu (theo ghi chú trong file)
- **Doanh thu TikTok** → lấy trên **TikTok Shop Seller Center** theo **ID kênh**.
- **Doanh thu Fanpage Facebook** → lấy trên **Shopee Seller** theo **ID KOC inhouse**.
- → Vì doanh thu lấy từ **Seller Center** (shop của DrKam), không phải affiliate bên thứ ba, nên **nối API TikTok khả thi hơn** affiliate thuần.

### 2.4. Quy tắc ghi nhận
- Báo cáo nhập **theo ngày**; một kênh/ngày **có thể nhiều dòng**.
- Mỗi dòng gắn: người nhập + kênh + ngày + nguồn + (doanh thu và/hoặc traffic tùy loại kênh).

---

## 3. PHÂN QUYỀN (RBAC)

Thiết kế **3 vai trò**:

| Vai trò | Phạm vi xem dữ liệu | Quyền thao tác |
|---------|---------------------|----------------|
| **Admin** | Toàn bộ team | Quản lý tài khoản; **phân quyền — gán vai trò Admin/Leader/User**; tạo nhóm; quản lý kênh; đặt chỉ tiêu; xem mọi báo cáo & thống kê; xuất Excel; audit log. |
| **Leader** | Thành viên trong nhóm mình | Xem báo cáo & thống kê của nhóm; đặt/điều chỉnh chỉ tiêu cho thành viên (tùy chọn). Không thấy nhóm khác. |
| **User** | Chỉ chính mình | Nhập/sửa báo cáo của mình (trong hạn cho phép), xem chỉ tiêu & dashboard cá nhân. |

**Quyền phân quyền:** Admin có màn hình **Quản lý phân quyền** — chọn tài khoản → đổi vai trò → gán nhóm. Khi nâng lên Leader thì chọn nhóm phụ trách.

**Nguyên tắc bảo mật:** mọi bản ghi gắn `user_id`; truy vấn của User tự lọc theo chính họ ở tầng backend; Leader lọc theo `team_id`; Admin không bị lọc.

> ✅ **Đã chốt chế độ xem chung:** Số liệu **cho cả team cùng xem chung**, một số phần ở chế độ **chỉ đọc (read-only)**. Cụ thể:
> - **Xem (read):** mọi thành viên team xem được số liệu chung (dashboard, thống kê, báo cáo của nhau) — minh bạch nội bộ.
> - **Sửa (write):** mỗi User **chỉ nhập/sửa được dữ liệu của chính mình**; dữ liệu người khác hiển thị **read-only**.
> - **Leader/Admin:** vẫn có quyền quản lý/sửa theo phạm vi như bảng trên.
> Tức là chuyển từ "ẩn dữ liệu người khác" sang "cho xem chung nhưng khóa quyền sửa".

---

## 4. CÁC MODULE & MÀN HÌNH

### Module A — Xác thực & Tài khoản
- Đăng nhập (email + mật khẩu).
- Quản lý nhân viên (Admin): tạo/sửa/vô hiệu hóa, reset mật khẩu.
- **Quản lý phân quyền** (Admin): gán vai trò & nhóm.
- Hồ sơ cá nhân.

### Module B — Quản lý Kênh / Tài sản
- Danh mục kênh theo **Nền tảng + Loại hình kênh**.
- Thuộc tính: tên/link kênh, nền tảng, loại hình, gắn shop (cờ), **ID đối soát** (ID kênh TikTok Shop / ID KOC affiliate), người phụ trách, nhóm, trạng thái, ghi chú.
- **Cờ bật/tắt chỉ số** (doanh thu, traffic) cho từng kênh.
- Admin/Leader gán kênh cho nhân viên (một người nhiều kênh).

### Module C — Báo cáo hằng ngày (LÕI HỆ THỐNG — thay Google Sheet)
- **Form nhập thông minh**: chọn ngày → chọn kênh → **hệ thống tự hiện đúng ô cần nhập** (doanh thu và/hoặc 8 chỉ số traffic) theo loại kênh.
  - Cho phép **nhiều dòng/kênh/ngày**; nhớ kênh gần nhất; mặc định ngày = hôm nay.
- Danh sách "báo cáo của tôi": xem/sửa/xóa (trong hạn), lọc theo ngày/kênh.
- **Khóa chỉnh sửa quá khứ** quá N ngày (mặc định 3).

### Module D — Chỉ tiêu (KPI)
- Admin/Leader đặt **chỉ tiêu doanh thu theo tháng** cho từng nhân viên/kênh.
- Hệ thống tự tính **% hoàn thành** theo dữ liệu thực tế.

### Module E — Dashboard & Thống kê
- **Dashboard User:** doanh thu & traffic cá nhân theo ngày/tuần/tháng, tiến độ chỉ tiêu, biểu đồ xu hướng.
- **Dashboard Admin/Leader:**
  - Tổng doanh thu theo thời gian, **tách theo nền tảng & loại hình kênh** (Thương hiệu vs KOC, Người thật vs AI).
  - **Bảng xếp hạng** nhân viên/kênh theo doanh thu.
  - Thống kê traffic cho nhóm kênh thương hiệu.
  - Bộ lọc thời gian/nền tảng/loại hình/nhóm + **xuất Excel**.

### Module F — Tích hợp & Tiện ích
- **🔌 Nối API TikTok Shop Seller (ưu tiên):** tự kéo doanh thu (và xét khả năng kéo traffic) cho các kênh TikTok.
- **Nhập tay/Import Excel** cho Shopee và các phần API chưa phủ.
- **Audit log**: ai sửa gì, khi nào.
- **Nhắc nhở** nộp báo cáo (giai đoạn sau).

---

## 5. MÔ HÌNH DỮ LIỆU (SƠ BỘ)

```
teams
  id, ten_nhom, leader_id, ngay_tao

users
  id, ho_ten, email, mat_khau_hash, role (admin|leader|user),
  team_id, trang_thai (active|disabled), ngay_tao

channels
  id, ten_kenh, nen_tang (tiktok|facebook),
  loai_hinh (thuong_hieu|koc_real|koc_ai),
  gan_shop (bool),
  id_doi_soat,            -- ID kênh TikTok Shop / ID KOC affiliate để tra cứu doanh thu
  track_doanh_thu (bool), -- cờ bật/tắt (như TRUE/X trong file)
  track_traffic (bool),
  user_id (phụ trách), team_id,
  trang_thai (nuoi|ra_don|han_che|die), ghi_chu, ngay_tao

daily_logs   -- báo cáo hằng ngày (nhiều dòng / kênh / ngày)
  id, user_id, channel_id, ngay,
  nguon_doanh_thu (tiktok_shop|shopee|null),
  doanh_thu,                 -- VND
  -- nhóm traffic (chỉ dùng cho kênh bật track_traffic):
  views_reach, comment, "like", share, luu,
  ty_le_xem_het,             -- %
  thoi_gian_xem_tb,          -- giây
  follow_tang,
  nguon_nhap (manual|import|api),
  ghi_chu, created_at, updated_at

revenue_targets
  id, user_id, channel_id (nullable), thang (yyyy-mm),
  chi_tieu_doanh_thu, created_by, created_at

audit_logs
  id, user_id, hanh_dong, bang, ban_ghi_id, du_lieu_cu, du_lieu_moi, thoi_gian
```

---

## 6. CÔNG NGHỆ ĐỀ XUẤT

| Thành phần | Lựa chọn | Lý do |
|------------|----------|-------|
| Framework | **Next.js (React) + TypeScript** | Một codebase FE+BE, dễ deploy, dễ làm API integration. |
| Database | **PostgreSQL** (Supabase) | Miễn phí lúc đầu, mạnh, có sẵn Auth. |
| Xác thực | Supabase Auth / NextAuth | Phân quyền theo vai trò. |
| Giao diện | Tailwind + shadcn/ui | Đẹp, responsive. **Tiếng Việt hoàn toàn.** |
| Biểu đồ | Recharts | Biểu đồ doanh thu & traffic. |
| Excel | SheetJS (xlsx) | Xuất & import. |
| Nền tảng tích hợp | **TikTok Shop Open Platform (Seller API)** | Kéo doanh thu TikTok tự động. |
| Triển khai | Vercel + Supabase | Lên web nhanh, chi phí thấp. |

---

## 7. LỘ TRÌNH TRIỂN KHAI

### Giai đoạn 1 — Nền tảng *(đăng nhập + phân quyền)*
- [x] Khởi tạo dự án Next.js + nền Supabase (schema + RLS). ✅
- [~] Đăng nhập & phân quyền Admin/Leader/User — *UI xong; còn nối Supabase Auth thật.*
- [~] Quản lý nhân viên & nhóm + **màn hình phân quyền** — *UI xong; còn nối CRUD Supabase.*

### Giai đoạn 2 — Lõi nghiệp vụ *(BẮT ĐẦU DÙNG THẬT)*
- [~] Quản lý kênh đa loại hình + cờ chỉ số — *UI xong; còn nối Supabase.*
- [~] Form nhập thông minh (doanh thu + traffic theo loại kênh, nhiều dòng/ngày) — *UI xong; còn nối Supabase.*
- [ ] Khóa chỉnh sửa quá khứ + nhập sẵn danh sách kênh thực tế *(seed 18 kênh đã có sẵn).*

> Chú thích: `[x]` xong · `[~]` đang dở (UI có rồi, chờ nối dữ liệu thật) · `[ ]` chưa làm.

### Giai đoạn 3 — Tích hợp TikTok API + Thống kê
- [ ] **Nghiên cứu & nối API TikTok Shop Seller** (doanh thu; xét traffic).
- [ ] Dashboard cá nhân & admin, biểu đồ, leaderboard, so sánh.
- [ ] Bộ lọc thời gian + xuất Excel.

### Giai đoạn 4 — Nâng cao
- [ ] Chỉ tiêu doanh thu & % hoàn thành.
- [ ] Import Google Sheet cũ; Audit log; nhắc nộp báo cáo.

---

## 8. CÁC ĐIỂM ĐÃ CHỐT

| # | Nội dung | Quyết định |
|---|----------|-----------|
| 1 | Chỉ số theo dõi | **Doanh thu + Traffic** (theo loại kênh, đúng ma trận file) |
| 2 | Phân loại kênh | Đưa vào đầy đủ: Nền tảng × (Thương hiệu / KOC người thật / KOC AI) |
| 3 | Vai trò Leader | Có bật |
| 4 | Chu kỳ báo cáo | Theo ngày; một kênh/ngày nhiều dòng |
| 5 | Nguồn doanh thu | TikTok → Shop Seller Center; FB → Shopee Seller (theo ID) |
| 6 | API tự động | **TikTok: ưu tiên nối API** · **Shopee: nhập tay** |
| 7 | Ngôn ngữ | Tiếng Việt hoàn toàn |
| 8 | Phân quyền | Admin được phân quyền cho tài khoản khác |
| 9 | Chế độ xem dữ liệu | **Cả team xem chung; sửa thì chỉ của mình (read-only phần của người khác)** |

---

## 9. PHỤ LỤC — Danh sách kênh thực tế (từ file, để nhập sẵn)

**TikTok – Kênh thương hiệu (gắn shop):** `drkampharmaofficial`, `drkamvn`, `drkamvnofficial`
**TikTok – KOC inhouse (người thật):** `happyy.daily`, `giadinhminhhee`, `nhacuacamcam`, `bao_chau_day`
**TikTok – KOC inhouse (AI):** `koi_928tramtram`, `doisongsuckhoe86`, `ngoc.huong259`, `haidang0136`, `minhquan8046`
**Facebook – Kênh thương hiệu:** `DrKam - Sống khỏe cùng Chuyên gia`, `DrKam - Bác sĩ Răng Miệng Họng của mọi gia đình`
**Facebook – KOC inhouse (fanpage AI):** `conghaing`, `ynni1809`, `duocsikhanh`

---

## 10. TIẾN ĐỘ HIỆN TẠI & ĐIỂM BẮT ĐẦU PHIÊN SAU

> 🔖 **Đọc mục này đầu tiên khi mở lại dự án.** Cập nhật: 04/06/2026.

### 10.1. Kho mã nguồn
- GitHub: **https://github.com/MinhKr/DrKam_Management.git** — nhánh `main` (đã push lần đầu).
- Thư mục code chính: `drkam-pharma-dashboard/`. Tài liệu kế hoạch + prompt UI + hướng dẫn nằm ở thư mục gốc.

### 10.2. Đã hoàn thành ✅
1. **Thống nhất nghiệp vụ & phân quyền** (xem mục 1–9): chỉ số Doanh thu + Traffic theo loại kênh; 3 vai trò Admin/Leader/User; cả team xem chung, sửa của mình.
2. **Thiết kế UI** bằng Stitch AI (prompt ở `PROMPT-UI-STITCH.md`), code sơ bộ qua Google AI Studio (Vite + React 19 + Tailwind v4) — 8 màn hình: Đăng nhập, Tổng quan, Báo cáo ngày, Quản lý kênh, Nhân sự, Chỉ tiêu KPI, Thống kê, Nhật ký.
3. **Đã GHÉP sang Next.js 15 (App Router) + TypeScript + Tailwind v4**, giữ nguyên 100% UI. Build & chạy thử OK (`npm run build` ✓, server trả HTTP 200 ✓).
4. **Dựng nền Supabase đầy đủ:** `lib/supabase/{client,server,types}.ts`, `middleware.ts`, schema + RLS phân quyền (`supabase/migrations/0001_init.sql`), seed 18 kênh thật (`supabase/seed.sql`), `.env.example`.

### 10.3. Trạng thái chạy hiện tại
- App **chạy được ngay** ở chế độ **dữ liệu tạm trên trình duyệt (localStorage)** để demo giao diện.
- Supabase đã sẵn sàng nhưng **chưa kết nối dữ liệu thật** (chờ tạo project + dán key). Hướng dẫn: `NEXTJS-SUPABASE-SETUP.md`.

### 10.4. 👉 VIỆC TIẾP THEO (theo thứ tự ưu tiên)
1. **[Chờ user]** Tạo project Supabase → điền `drkam-pharma-dashboard/.env.local` → chạy 2 file SQL → tạo user Admin đầu tiên (đặt `role='Admin'` trong bảng `profiles`).
2. ✅ **(05/06/2026) ĐÃ NỐI CODE** Đăng nhập thật + CRUD Supabase cho `daily_reports`, `channels`, `profiles`, `targets`, `audit_logs` — build sạch, tự fallback localStorage khi chưa có key. Lớp dữ liệu: `src/data/{mappers,repositories,auth}.ts`. **Cần test end-to-end khi có Supabase thật.**
3. Dọn màn **TikTok** về cấu trúc tương tự Facebook (KOC / thương hiệu).
4. **Nối DB thật cho fbPages + FB KOC** (hiện fbPages chỉ localStorage); làm màn **Admin tạo tài khoản & gắn ID Shopee** cho nhân viên.
5. Thêm mới **nhân sự** ở chế độ DB (cần Supabase Auth Admin/service role).
6. Xuất Excel thật (SheetJS) cho màn Thống kê.
7. **(Giai đoạn 3)** Nghiên cứu & nối **API TikTok Shop Seller** kéo doanh thu tự động.

### 10.4b. ✅ ĐÃ LÀM TRONG PHIÊN 05/06/2026 (UI module báo cáo, demo localStorage)
- **Tách sidebar TikTok / Facebook** riêng. Form báo cáo TikTok ẩn mặc định (bấm mới hiện). Form Thêm kênh: chỉ TikTok/Facebook + ô ID động (FB="ID Affiliate", TikTok="ID kênh").
- **Màn Facebook 2 tab con:** KOC inhouse (chỉ doanh thu) & Kênh thương hiệu (8 chỉ số traffic).
- **FB KOC inhouse chia theo ID Shopee** (mỗi ID = 1 thành viên): bảng thống kê chung cả team + chi tiết từng ID (danh sách fanpage FB do thành viên tự thêm + nhập doanh thu gộp theo ID). Quyền: chỉ sửa nhóm của mình, xem được cả team. Doanh thu sắp xếp mới→cũ, cuộn, có **bộ lọc theo ngày**. Nhóm của mình đẩy lên đầu.
- 3 ID thật: `conghaing` (Nguyễn Công Hải), `ynni1809` (Hoàng Yến Nhi), `duocsikhanh` (Đặng Kim Khánh).
- Thêm `ConfirmDialog` (hộp thoại xác nhận giữa màn hình), cơ chế `SEED_VERSION` tự nạp lại dữ liệu mẫu.

> ⚙️ **Kỹ thuật:** đã nâng `@supabase/ssr` 0.5.2 → 0.10.3 cho khớp `supabase-js` 2.107 (bản cũ làm kiểu Insert thành `never`). Đã thêm bộ skill/agent ECC vào `.claude/`. **Lưu ý:** đừng `npm run build` khi đang `npm run dev` (xung đột `.next`) — dùng `npx tsc --noEmit` để kiểm tra kiểu.

### 10.5. Lưu ý kỹ thuật cho phiên sau
- `src/App.tsx` là shell client, nạp qua `next/dynamic` với `ssr:false` → mọi state/persistence nằm ở đây, là nơi thay localStorage bằng lệnh gọi Supabase.
- Các component trong `src/components/` **không nên đổi giao diện**; chỉ thay nguồn dữ liệu qua props.
- Map dữ liệu: kiểu TS trong `src/types.ts` ↔ bảng SQL trong `0001_init.sql` (vd `AffiliateChannel` ↔ `channels`, `DailyReport` ↔ `daily_reports`).
- Đã có credential GitHub trong máy → `git push` chạy thẳng, không cần đăng nhập lại.
