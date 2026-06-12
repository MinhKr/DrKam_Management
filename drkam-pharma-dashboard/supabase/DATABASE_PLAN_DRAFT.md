# 🗄️ Kế hoạch Database — DrKam (BẢN NHÁP)

> Trạng thái: **nháp**, còn chỉnh nhiều. Mục tiêu: chốt mô hình dữ liệu để chuyển từ localStorage/seed sang Supabase thật, phục vụ báo cáo + dashboard cho TikTok & Facebook, mở rộng về sau.

---

## 0. Hiện trạng (đã có sẵn — xây tiếp, không làm lại)
File `supabase/migrations/0001_init.sql` đã tạo:
- `teams`, `profiles` (1-1 với `auth.users`), `channels`, `daily_reports` (đã có đủ 8 cột traffic), `targets`, `audit_logs`.
- Hàm `auth_role()`, `auth_team()`, trigger tự tạo profile khi đăng ký.
- **RLS đầy đủ**: ai đăng nhập cũng XEM được; chỉ SỬA của mình; Leader phạm vi nhóm; Admin toàn quyền.

Tầng app (`src/data/repositories.ts`) đã nối: load/create/delete cho channels, daily_reports, targets, profiles, logs.

---

## 1. Khoảng cách giữa app hiện tại và schema (cần xử lý)

| # | Vấn đề | Hiện trạng | Đề xuất |
|---|--------|-----------|---------|
| 1 | **Upsert báo cáo theo (kênh + ngày)** | App gộp trong bộ nhớ; DB chỉ có `INSERT` → báo cáo lại 1 ngày sẽ tạo **dòng trùng** | Thêm `UNIQUE (channel_id, report_date)` + hàm `upsertReport()` (`on conflict ... do update`) và `updateReport()` |
| 2 | **Quyền "mọi người sửa mọi báo cáo"** | UI đã đặt `canEdit = true`, nhưng RLS chỉ cho sửa/xóa **của mình** | Cần CHỐT: (a) nới RLS update/delete `daily_reports` cho mọi authenticated, hay (b) giữ chặt RLS và sửa lại UI. *(xem mục 6)* |
| 3 | **Fanpage Facebook (`fb_pages`)** | Chỉ lưu localStorage, chưa có bảng | Thêm bảng `fb_pages` (mục 2) |
| 4 | **Dashboard gộp số** | Tải TOÀN BỘ reports về client rồi gộp | Thêm chỉ mục + **RPC/View gộp phía server** theo khoảng ngày (mục 4) |
| 5 | **Phân loại nguồn doanh thu** | `source_platform` đã có cột nhưng app chưa dùng | Quy ước giá trị: `tiktok_shop` \| `shopee` \| `manual`; dùng để tách DT theo nền tảng ở Tổng quan |
| 6 | **Kênh AI vs Người thật** | `channel_type` chỉ có `Brand/Real KOC/AI KOC` | Đủ dùng — Real/AI đã tách. Giữ nguyên |

---

## 2. Bảng cần THÊM / CHỈNH

### 2.1 `fb_pages` (mới) — fanpage thuộc 1 ID Shopee KOC inhouse
```sql
create table public.fb_pages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references public.channels(id) on delete cascade, -- ID Shopee KOC inhouse
  name        text not null,
  added_by    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
-- RLS: xem chung; thêm/xóa: chủ sở hữu channel hoặc Admin/Leader-nhóm
```

### 2.2 `daily_reports` — thêm ràng buộc upsert
```sql
-- Mỗi kênh chỉ 1 báo cáo / ngày / nguồn
alter table public.daily_reports
  add constraint daily_reports_uniq unique (channel_id, report_date, source_platform);
create index daily_reports_channel_date_idx on public.daily_reports(channel_id, report_date);
```
> Lưu ý: hiện `channel_id` cho phép null. Để upsert chuẩn, nên **bắt buộc `channel_id` not null** (gắn báo cáo vào kênh thật thay vì chỉ `channel_name`).

### 2.3 (Tùy chọn, khi DỮ LIỆU RẤT LỚN) bảng rollup `daily_channel_metrics`
Chỉ cần khi >1 triệu dòng / dashboard chậm. Materialized view hoặc bảng tổng hợp sẵn theo ngày-kênh, refresh bằng cron. **Chưa cần ở giai đoạn này.**

---

## 3. Sơ đồ quan hệ (rút gọn)
```
auth.users ──1:1── profiles ──┐
                              ├─< channels ──< daily_reports
            teams ──<─────────┘         └──< fb_pages
            profiles ──< targets
            profiles ──< audit_logs
```
- 1 profile (nhân sự) phụ trách nhiều channels.
- 1 channel có nhiều daily_reports (1/ngày/nguồn) và nhiều fb_pages (nếu là KOC inhouse).

---

## 4. Hiệu năng & mở rộng (cho lượng dữ liệu tăng)

1. **Chỉ mục** (quan trọng nhất cho dashboard):
   - `daily_reports(channel_id, report_date)` — lọc theo kênh + khoảng ngày.
   - `daily_reports(report_date)` — đã có.
   - Cân nhắc `daily_reports(channel_type, report_date)` cho gộp theo loại kênh.
2. **Gộp phía server (thay vì tải hết về client)** — viết RPC Postgres:
   ```sql
   -- ví dụ: tổng theo ngày trong khoảng, cho 1 nhóm loại kênh
   create function report_daily_series(p_from date, p_to date, p_platform text, p_type text)
   returns table(d date, revenue bigint, views bigint, engagement bigint, follower_incr bigint) ...
   ```
   → dashboard chỉ kéo vài chục dòng/kỳ thay vì toàn bộ lịch sử ⇒ nhẹ egress, nhanh.
3. **Phân vùng (partition by range report_date)**: chỉ đặt ra khi tới hàng triệu dòng/năm. Hiện **chưa cần**.
4. **Giữ client-side aggregation hiện tại** cho tới khi dữ liệu thật đủ lớn — lúc đó chuyển sang RPC (lớp `analytics.ts` đã tách sẵn nên thay nguồn dễ).

---

## 5. Toàn vẹn & nghiệp vụ
- `revenue` dùng `bigint` (đồng VND, không thập phân) — đúng.
- `report_date` là `date` (không kèm giờ) → tránh bẫy múi giờ; client chốt ngày theo GMT+7 (đã sửa ở UI).
- `updated_at` nên có **trigger tự cập nhật** khi update.
- Cân nhắc cột `synced boolean` (số tự lấy từ API vs nhập tay) — Facebook có, TikTok luôn `false`.

---

## 6. ✅ Quyết định ĐÃ CHỐT (12/06/2026)
1. **Quyền sửa/xóa báo cáo**: ⚠️ **ĐẢO LẠI — SỞ HỮU THEO KÊNH.** Chủ kênh (`channels.manager_id`) + Admin mới sửa/xóa được kênh + báo cáo + fanpage của kênh đó; người khác chỉ XEM. (Bỏ phương án "nới RLS cho mọi nhân viên".) Triển khai bằng hàm `owns_channel(c_id)` SECURITY DEFINER, áp cho RLS `channels` / `daily_reports` / `fb_pages`. Vẫn ghi `audit_logs`.
2. **`channel_id` bắt buộc**: ✅ **NOT NULL** — gắn cứng báo cáo vào kênh thật.
3. **Lưu lịch sử chỉnh sửa**: ✅ **CHỈ `audit_logs`** (không làm bảng versioning chi tiết ở giai đoạn này).
4. **Số báo cáo/ngày**: ✅ **1 báo cáo / kênh / ngày / nguồn** → `UNIQUE(channel_id, report_date, source_platform)` + upsert.

> ⚠️ Bẫy kỹ thuật cho upsert: `source_platform` hiện **nullable** → trong UNIQUE, NULL bị coi là khác nhau nên upsert KHÔNG gộp. Phải đặt `source_platform NOT NULL DEFAULT 'manual'` (hoặc backfill) trước khi thêm UNIQUE.

---

## 7. 💰 Chi phí: Free hay phải trả phí?

**Kết luận ngắn: dữ liệu kiểu này RẤT NHỎ — Free tier dùng tốt trong NHIỀU NĂM.** Lý do: ta lưu **số liệu tổng hợp theo ngày** (1 dòng/kênh/ngày), KHÔNG phải log sự kiện thô (vốn mới là thứ phình to).

### Ước lượng dung lượng `daily_reports` (~0.5 KB/dòng kèm index)
| Quy mô | Dòng/năm | Dung lượng/năm | Lấp đầy 500 MB (Free) sau |
|--------|----------|----------------|--------------------------|
| 100 kênh × 1 báo cáo/ngày | ~36.5K | ~18 MB | ~15+ năm |
| 300 kênh × 1/ngày | ~110K | ~55 MB | ~9 năm |
| 500 kênh × 2/ngày | ~365K | ~180 MB | ~2.7 năm |

→ Trừ khi bạn có **500+ kênh báo cáo nhiều lần/ngày**, Free thừa sức vài năm.

### Hạn mức Supabase (cần kiểm tra lại giá hiện hành)
| | Free | Pro (~$25/tháng) |
|---|------|------------------|
| Dung lượng DB | ~500 MB | 8 GB (rồi +$0.125/GB) |
| Egress/tháng | ~5 GB | 250 GB |
| Người dùng (MAU) | 50.000 | 100.000 |
| **Sao lưu (backup)** | ❌ không | ✅ hằng ngày (giữ 7 ngày) |
| **Tự ngủ khi 7 ngày không hoạt động** | ⚠️ có | ✅ không ngủ |

### Khuyến nghị
- **Giai đoạn dev/nháp**: dùng **Free** thoải mái.
- **Khi chạy thật cho công ty**: nên lên **Pro ($25/tháng)** — KHÔNG phải vì hết dung lượng, mà vì **(1) sao lưu hằng ngày** (dữ liệu doanh thu rất cần backup) và **(2) không bị tự ngủ** (Free ngủ sau 7 ngày không truy cập → request đầu sau đó bị chậm/đánh thức). Đây là "bảo hiểm" rẻ.
- Mẹo tiết kiệm egress: dùng **RPC gộp phía server** (mục 4) thay vì kéo toàn bộ reports về client.

> ⚠️ Con số hạn mức/giá Supabase thay đổi theo thời gian — kiểm tra lại tại supabase.com/pricing trước khi quyết.
