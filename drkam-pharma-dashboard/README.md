# DrKam — Web quản trị nội bộ (Team Marketing)

Ứng dụng quản trị nội bộ DrKam, đã chuyển từ Vite SPA sang **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4**, nền tảng dữ liệu **Supabase** (PostgreSQL + Auth).

## Chạy dự án

```bash
npm install
npm run dev      # http://localhost:3000
```

- App hiện **chạy được ngay** với dữ liệu lưu tạm ở trình duyệt (localStorage) — UI/luồng giữ nguyên 100% như bản thiết kế.
- Khi cấu hình Supabase (xem dưới), hệ thống sẽ dùng cơ sở dữ liệu thật.

## Kết nối Supabase

1. Tạo project tại https://supabase.com → vào **Project Settings > API** lấy URL + anon key.
2. Copy `.env.example` thành `.env.local` và điền giá trị.
3. Trong **SQL Editor**, chạy lần lượt:
   - `supabase/migrations/0001_init.sql` (tạo bảng + RLS phân quyền)
   - `supabase/seed.sql` (nạp 18 kênh thực tế)
4. Tạo tài khoản đầu tiên (Authentication > Users), rồi vào bảng `profiles` đặt `role = 'Admin'`.

> Chi tiết từng bước: xem `../NEXTJS-SUPABASE-SETUP.md`.

## Cấu trúc

```
app/                     # Next.js App Router (layout, page, globals.css)
src/
  App.tsx                # Shell chính (sidebar + topbar + điều hướng tab)
  components/            # 8 màn hình (giữ nguyên UI từ thiết kế)
  types.ts               # Kiểu dữ liệu + dữ liệu mẫu
lib/supabase/            # client (browser) + server + Database types
middleware.ts            # Làm mới phiên Supabase
supabase/
  migrations/0001_init.sql  # Schema + RLS
  seed.sql                  # Dữ liệu kênh thật
```

## Tech stack
- Next.js 15 · React 19 · TypeScript · Tailwind CSS v4
- Supabase (PostgreSQL, Auth, Row Level Security)
- Icon: Material Symbols (web-font) · Font: Montserrat + Be Vietnam Pro
