# KẾ HOẠCH UPDATE — BÁO CÁO TEAM MEDIA (DrKam Management)

> Nhánh: `phien-lam-viec-2026-07-09` · Ngày lập: 09/07/2026
> Nguồn yêu cầu: Sheet "BÁO CÁO CÔNG VIỆC HÀNG NGÀY – TEAM MEDIA DRKAM (T6/2026)".

---

## 0. Quyết định đã chốt

| # | Quyết định | Ghi chú |
|---|-----------|---------|
| 1 | **Giai đoạn 1 chỉ làm localStorage (demo)** | CHƯA nối Supabase. Bỏ qua migration/mappers/repositories. Nhưng `types.ts` thiết kế sẵn để cloud gắn sau không phải sửa. |
| 2 | **Tách biệt hoàn toàn Media ↔ Content** | Bảng/tab/nhân sự riêng. |
| 3 | **2 nick Media có phân quyền** | Khải (Leader), Sơn (Nhân viên) — `department = "Media"`. |
| 4 | **Nick Media chỉ thấy màn Media** | Đăng nhập nick Media → sidebar chỉ có nhóm Media; "Tổng quan" → **"Tổng quan Media"**. Admin thấy tất cả (có thêm nhóm Media). Nick Content không thấy Media. |
| 5 | **KPI đổi theo tháng** | Mỗi tháng 1 bộ chỉ số riêng (chọn `period` = 'yyyy-mm'). User sẽ gửi KPI chi tiết mỗi tháng. |
| 6 | **Công thức điểm KPI** | `Điểm = Trọng số × (Đạt% ÷ 100)`. Cho phép sửa tay khi cần. |
| 7 | **Xếp loại theo tổng điểm** | `> 100` → **Xuất sắc**; `= 100` → **Đạt**; `80–99` → **Cần cố gắng**; `< 80` → **Cần cải thiện**. *(Ngưỡng dưới do tôi tạm đặt — báo nếu muốn đổi.)* |

---

## 1. Cấu trúc báo cáo Media (từ sheet)

Nhân sự: **Nguyễn Trọng Khải (Leader)** · **Vũ Văn Sơn (Nhân viên)**.
6 loại video: **Branding · BS Nguyên · Bán hàng · Xào KOC · ADS FB · FB Daily**.

| Khối | Mô tả |
|------|-------|
| **A. Báo cáo ngày** | 1 dòng/người/ngày: 6 cột loại video + `Reach` + `Ghi chú`. Tự cộng `Tổng video/ngày` và `TỔNG THÁNG`. |
| **B. Nhật ký công việc** | Nhiều dòng/người/ngày: Thứ · Ngày · Content(loại) · KB · Công việc · Số lượng · Tiến độ · Link sản phẩm · Hạn · Ghi chú · TT Duyệt. |
| **C. KPI tháng** | Scorecard trọng số cho Leader (6 chỉ số) + NV (2 chỉ số) → Tổng điểm + Xếp loại. Kèm bảng tổng hợp video theo loại. |
| **D. Đề xuất cải tiến** | Vấn đề · Đề xuất · Lợi ích · Ưu tiên (Cao/Trung bình/Thấp). |

---

## 2. Điều hướng & phân quyền hiển thị

### Session mở rộng
Thêm trường `department` (và cờ suy ra `isMediaUser`) vào `UserSession`.

```
isMediaUser  = (session.department === 'Media' && session.role !== 'Admin')
isAdmin      = session.role === 'Admin'
```

### Quy tắc sidebar
| Người dùng | Sidebar thấy gì |
|-----------|-----------------|
| **Nick Media (Khải/Sơn)** | CHỈ nhóm **Media** (Tổng quan Media, Báo cáo ngày, Nhật ký, KPI, Đề xuất). Không thấy TikTok/Facebook/Content/Quản trị. |
| **Admin** | Toàn bộ như hiện tại **+ thêm nhóm Media**. |
| **Content (Leader/NV)** | Như hiện tại, **không** có nhóm Media. |

### Tab id mới
`media-overview` · `media-daily` · `media-log` · `media-kpi` · `media-improve`
→ thêm cả 5 vào `ALLOWED_TABS`. Nick Media mặc định mở `media-overview`.

---

## 3. Mô hình dữ liệu (types.ts — localStorage)

```ts
// A. Báo cáo ngày sản lượng
interface MediaDailyReport {
  id: string;
  date: string;              // dd/mm/yyyy
  employeeId: string;
  employeeName: string;
  branding: number;
  bsNguyen: number;
  banHang: number;
  xaoKoc: number;
  adsFb: number;
  fbDaily: number;
  reach: number;
  note?: string | null;
  // total = tổng 6 loại (tính client, không lưu)
}

// B. Nhật ký công việc
interface MediaTaskLog {
  id: string;
  date: string;              // dd/mm/yyyy
  employeeId: string;
  employeeName: string;
  weekday?: string;          // Thứ (tự suy từ ngày)
  contentType: string;       // loại video (Branding/BS Nguyên/...)
  scriptNo?: string;         // KB
  task: string;              // Công việc
  quantity?: number;         // Số lượng
  progress: 'Hoàn thành' | 'Đang làm' | 'Chưa làm';
  productLink?: string;      // Link sản phẩm
  deadline?: string;         // Hạn
  note?: string;
  approval?: string;         // TT Duyệt
}

// C. KPI tháng (mỗi chỉ số 1 dòng)
interface MediaKpiEntry {
  id: string;
  period: string;            // 'yyyy-mm'
  employeeId: string;
  employeeName: string;
  roleScope: 'Leader' | 'NV';
  stt: number;
  groupName: string;         // Nhóm KPI (Hiệu suất/Hiệu quả/Nhân sự...)
  metric: string;            // Chỉ số
  targetValue: number;       // Mục tiêu (số)
  unit: 'number' | 'currency' | 'percent';
  weight: number;            // Trọng số %
  actualValue: number;       // Thực tế
  note?: string;
  // đạt% = actual/target*100; điểm = weight*đạt%/100 (tính client)
}

// D. Đề xuất cải tiến
interface MediaImprovement {
  id: string;
  period: string;            // 'yyyy-mm'
  stt: number;
  issue: string;             // Vấn đề / Hiện trạng
  proposal: string;          // Đề xuất
  benefit: string;           // Lợi ích kỳ vọng
  priority: 'Cao' | 'Trung bình' | 'Thấp';
}
```

Seed `INITIAL_MEDIA_*` từ dữ liệu THẬT tháng 6 trong sheet (báo cáo ngày, KPI T6, đề xuất) → demo trông thật ngay.

---

## 4. Nhân sự Media (demo)

Thêm vào `INITIAL_EMPLOYEES` + nút đăng nhập mô phỏng:

| Tên | Email | Vai trò | Phòng | Mật khẩu demo |
|-----|-------|---------|-------|---------------|
| Nguyễn Trọng Khải | khaint@drkam.vn | Leader | Media | 123456 |
| Vũ Văn Sơn | sonvv@drkam.vn | Nhân viên | Media | 123456 |

`LoginComponent`: thêm 2 nút mô phỏng "Media Lead" / "Media NV" (điền sẵn email + set `department='Media'`).

---

## 5. Component mới (src/components/)

| File | Vai trò |
|------|---------|
| `MediaOverviewComponent.tsx` | Tổng quan Media: thẻ số (Tổng video tháng, Reach, DT liên quan), donut video theo loại, bảng sản lượng theo người, tiến độ KPI. |
| `MediaDailyReportComponent.tsx` | Bảng nhập báo cáo ngày (6 loại + reach) theo người/ngày; tự tổng. |
| `MediaTaskLogComponent.tsx` | Nhật ký công việc chi tiết (thêm/sửa/xóa dòng). |
| `MediaKpiComponent.tsx` | Scorecard KPI theo tháng (Leader + NV), tự tính đạt%/điểm/xếp loại. |
| `MediaImprovementComponent.tsx` | Bảng đề xuất cải tiến. |

Tái sử dụng: `ConfirmDialog`, `dashboardKit`, style token `#D32027`, `soft-shadow`, `material-symbols`.

---

## 6. Wiring App.tsx (demo)

- State: `mediaDaily`, `mediaLogs`, `mediaKpi`, `mediaImprovements` (+ localStorage sync + INITIAL_*).
- Handlers CRUD cho từng loại (theo pattern `handleAddChecklistItem`...).
- `UserSession.department`; login set department; `renderTabContent` + sidebar rẽ nhánh theo `isMediaUser`.
- Sidebar: thêm nhóm "Media" (dropdown 5 mục), ẩn/hiện theo quyền.
- `ALLOWED_TABS` += 5 tab Media.
- Bump `SEED_VERSION` để nạp lại seed mới.

---

## 7. Thứ tự thực thi (phased)

1. **Preview UI**: prompt Stitch → chốt giao diện *(bước hiện tại)*.
2. **Nền dữ liệu**: `types.ts` (4 interface + seed thật + nhân sự Media + `department` cho session).
3. **Phân quyền hiển thị**: `UserSession.department` + `LoginComponent` 2 nút Media + logic sidebar/nav trong `App.tsx`.
4. **UI**: 5 component (Tổng quan → Báo cáo ngày → Nhật ký → KPI → Đề xuất).
5. **Kiểm thử**: `npm run build` + chạy demo, đối chiếu số liệu sheet.
6. *(Giai đoạn 2 — sau)* Nối Supabase: migration `0007_media_reports.sql` (4 bảng + RLS) + mappers + repositories + tạo tài khoản Auth cho Khải/Sơn.

---

## 7b. Kết quả review UI Stitch (09/07/2026)

Đã dựng 5 màn Stitch trong `stitch_drkam_wordmark_logo/` — **layout & nhận diện đạt chuẩn, dùng làm gốc UI**. Khi code thật sửa các sai lệch dữ liệu Stitch tự chế:

- **Ngày**: đổi về `dd/mm/yyyy` năm **2026** (Stitch dùng nhầm 10/2023, 05/2024).
- **Vai trò Sơn**: "Editor" → **"Nhân viên"**.
- **Donut Tổng quan**: đúng **6 loại video** (Branding·BS Nguyên·Bán hàng·Xào KOC·ADS FB·FB Daily), bỏ TikTok/Youtube/Reels/Livestream Stitch bịa.
- **Doanh thu Tổng quan**: số thật — TikTok Seller `355.551.750`/400tr · FB ADS `311.687.517`/150tr.
- **KPI tháng**: đủ **2 thẻ** (Leader 6 chỉ số + NV 2 chỉ số) + bảng "Tổng hợp video theo loại".
- **Seed**: nạp đúng dữ liệu thật T6 từ sheet (báo cáo ngày, KPI T6, 7 đề xuất).
- **Quyết định UX chốt**: màn Báo cáo ngày **tự lưu ngay** khi nhập (giống Content), **bỏ** luồng "Lưu nháp + Gửi báo cáo" của Stitch.

Bảng màu chip loại video (theo DESIGN.md, dùng cho badge Content/loại video):
Branding `#6366F1` · BS Nguyên `#0EA5E9` · Bán hàng `#F59E0B` · Xào KOC `#EC4899` · ADS FB `#10B981` · FB Daily `#64748B`.

---

## 8. Giai đoạn 2 (cloud) — ĐÃ XONG (09/07/2026)

Sau khi rework, "Báo cáo ngày" = bảng công việc (MediaTaskLog) → chỉ còn **3 bảng** (không phải 4):
- `media_task_logs` (báo cáo ngày = dòng công việc), `media_kpi_entries`, `media_improvements` + RLS (xem chung, cả team thêm/sửa/xóa — giống `content_checklists`).
- Migration `supabase/migrations/0007_media_reports.sql`.
- `getCurrentSession` (auth.ts) trả thêm `department` → nick Media nhận diện qua `profiles.department='Media'`.
- mappers + repositories + App.tsx handlers cloud-aware (`if (cloud) repo... else state`).
- Hướng dẫn setup + seed: `supabase/MEDIA_CLOUD_SETUP.md` + `supabase/data/media_seed_t6.sql`.
- Tạo tài khoản Auth Khải/Sơn (email `tên+chữ đầu@drkam.vn`, mk 123456), gán `department='Media'`, `role='Nhân viên'`.

**Chạy app:** `npm run dev` = cloud (vì `.env.local` đã cấu hình) · `npm run dev:demo` = localStorage (test không cần cloud).
