# Hướng dẫn: Đã ghép Next.js + Supabase

> Bản code AI Studio (Vite SPA) đã được **chuyển sang Next.js 15 + Supabase**, **giữ nguyên 100% giao diện**. Tài liệu này tóm tắt những gì đã làm và các bước bạn cần làm tiếp.

---

## 1. Đã làm gì

### ✅ Chuyển khung sang Next.js 15 (App Router)
- Khởi tạo `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.
- Giữ nguyên toàn bộ `src/components/*` (8 màn hình) và `src/types.ts` — **không đổi UI**.
- `src/App.tsx` thành "shell" client (`'use client'`), nạp qua `next/dynamic` (tắt SSR) để giữ đúng hành vi SPA.
- Gỡ các file riêng của Vite: `index.html`, `main.tsx`, `vite.config.ts`, `index.css`.
- Thay `package.json`, `tsconfig.json`, thêm `next.config.mjs`, `postcss.config.mjs`.
- **Đã build & chạy thử thành công** (`npm run build` ✓, server trả HTTP 200 ✓).

### ✅ Dựng nền Supabase đầy đủ
- `lib/supabase/client.ts` — client phía trình duyệt.
- `lib/supabase/server.ts` — client phía server.
- `lib/supabase/types.ts` — kiểu Database (TypeScript).
- `middleware.ts` — làm mới phiên đăng nhập.
- `supabase/migrations/0001_init.sql` — **schema + RLS phân quyền** (bảng: teams, profiles, channels, daily_reports, targets, audit_logs).
- `supabase/seed.sql` — **18 kênh thực tế** từ Google Sheet.
- `.env.example` — biến môi trường cần điền.

### 🔐 RLS đã cài đúng quyền đã chốt
- **Cả team XEM CHUNG** mọi số liệu (mọi user đã đăng nhập đều SELECT được).
- **User chỉ SỬA dữ liệu của mình** (báo cáo của người khác là read-only).
- **Leader** quản lý phạm vi nhóm; **Admin** toàn quyền + phân quyền.
- **Nhật ký** chỉ Admin xem.

---

## 2. Việc bạn cần làm để chạy với DB thật

1. Tạo project tại **https://supabase.com**.
2. Vào **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
3. Trong thư mục `drkam-pharma-dashboard/`, tạo file `.env.local` (copy từ `.env.example`) và dán 3 giá trị trên.
4. Mở **SQL Editor** trên Supabase, chạy lần lượt 2 file:
   - `supabase/migrations/0001_init.sql`
   - `supabase/seed.sql`
5. **Authentication → Users → Add user**: tạo tài khoản admin đầu tiên (email + mật khẩu).
6. **Table Editor → profiles**: tìm dòng vừa tạo, đặt `role = 'Admin'`, điền `name`.
7. `npm run dev` và đăng nhập.

> Nếu **chưa** điền `.env.local`, app vẫn chạy bình thường ở chế độ dữ liệu local (demo) — không lỗi.

---

## 3. Việc còn lại (bước kế tiếp, cần làm sau khi có Supabase)

**ĐÃ NỐI CODE (05/06/2026)** — lớp truy cập dữ liệu + xác thực Supabase đã viết xong và **build TypeScript sạch**. App tự nhận biết: **chưa có `.env.local` → chạy y hệt demo localStorage**; **có key → tự chuyển sang DB thật**. Cụ thể:

- [x] **Đăng nhập thật** qua Supabase Auth (`src/data/auth.ts`) — `LoginComponent` ẩn ô "mô phỏng vai trò" khi có key, đăng nhập email/mật khẩu thật, chặn tài khoản `Đã khóa`.
- [x] **`daily_reports`**: thêm/xóa qua Supabase (`created_by` = user hiện tại để khớp RLS).
- [x] **`channels`**: thêm/xóa qua Supabase.
- [x] **`profiles` (nhân sự)**: khóa/mở/xóa qua Supabase. *(Thêm mới nhân sự cần tạo tài khoản qua Auth Admin — để bước sau.)*
- [x] **`targets` (KPI)**: thêm/cập nhật qua Supabase.
- [x] **`audit_logs`**: ghi nhật ký vào Supabase mỗi thao tác; chỉ Admin xem (RLS).
- [ ] Khóa ẩn/hiện theo vai trò ở phía giao diện cho khớp tuyệt đối với RLS (hiện đã chặn tab theo vai trò; cần rà soát nút Sửa/Xóa theo chủ sở hữu).
- [ ] Thêm mới **nhân sự** ở chế độ DB (cần Supabase Auth Admin / service role — không làm từ trình duyệt).
- [ ] Xuất Excel thật (SheetJS) cho màn Thống kê.
- [ ] (Giai đoạn sau) Nối **API TikTok Shop Seller** kéo doanh thu tự động.

> **Lưu ý kỹ thuật:** đã nâng `@supabase/ssr` 0.5.2 → 0.10.3 để tương thích `@supabase/supabase-js` 2.107 (bản cũ truyền sai vị trí generic làm kiểu Insert thành `never`). Lớp dữ liệu nằm ở `src/data/{mappers,repositories,auth}.ts`.
>
> Phần DB thật cần kết nối Supabase để test chạy. Khi bạn đã tạo project + dán key vào `.env.local`, báo mình — mình sẽ chạy thử end-to-end và tinh chỉnh.

---

## 4. Lệnh hữu ích

```bash
cd drkam-pharma-dashboard
npm install        # cài thư viện
npm run dev        # chạy phát triển (localhost:3000)
npm run build      # build production (kiểm tra lỗi)
npm run start      # chạy bản build
```
