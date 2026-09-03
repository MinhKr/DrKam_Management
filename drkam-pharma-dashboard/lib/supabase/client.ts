import { createBrowserClient } from '@supabase/ssr';
import { createClient as createRawClient } from '@supabase/supabase-js';
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

/**
 * Client TẠM dùng để TẠO TÀI KHOẢN nhân sự mới (auth.signUp).
 *
 * Vì sao phải là client riêng: signUp sẽ đăng nhập luôn vào tài khoản vừa tạo.
 * Client này đặt persistSession = false nên phiên mới KHÔNG được ghi vào
 * cookie/localStorage — Admin đang đăng nhập không bị đá ra ngoài.
 */
export function createSignUpClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createRawClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
