import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Supabase client dùng ở phía trình duyệt (Client Components).
 * Trả về null nếu chưa cấu hình env — để app vẫn chạy ở chế độ dữ liệu local.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createBrowserClient<Database>(url, anon);
}

/** Đã cấu hình Supabase hay chưa. */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
