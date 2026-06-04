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

Hiện màn hình **vẫn đọc/ghi vào localStorage** (để demo chạy ngay). Bước tiếp theo là **nối từng màn hình vào Supabase**:

- [ ] Đăng nhập thật qua Supabase Auth (thay nút "mô phỏng vai trò").
- [ ] `daily_reports`: đọc/thêm/sửa/xóa qua Supabase (thay localStorage).
- [ ] `channels`, `profiles` (nhân viên), `targets`, `audit_logs`: nối CRUD.
- [ ] Khóa quyền theo vai trò ở phía giao diện đồng bộ với RLS.
- [ ] (Giai đoạn sau) Nối **API TikTok Shop Seller** kéo doanh thu tự động.

> Phần này cần kết nối Supabase thật để test chính xác. Khi bạn đã tạo project và dán key, báo mình — mình sẽ nối dữ liệu thật cho từng màn hình.

---

## 4. Lệnh hữu ích

```bash
cd drkam-pharma-dashboard
npm install        # cài thư viện
npm run dev        # chạy phát triển (localhost:3000)
npm run build      # build production (kiểm tra lỗi)
npm run start      # chạy bản build
```
