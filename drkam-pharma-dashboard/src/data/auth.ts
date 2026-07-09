/**
 * Xác thực qua Supabase Auth + nạp hồ sơ (profiles) thành UserSession cho UI.
 * Chỉ dùng khi Supabase đã cấu hình; nếu chưa, LoginComponent vẫn chạy chế độ mô phỏng.
 */
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { UserSession } from '../types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAwxcNk3h_dSy-QxPJwh7IZAx4IPd69V4i_4FlgAIlvGpHoE4f-UZIj64GPyBokv3MGwEUuU4DVvOS81ZV1ab3ZbJuSzeY9ZAUh68pyIlXV1GQlhMqsnDe9GgkijJuB1d63sf4q171JOYdQiXM5rFRPd6Hcd38tUF2isSe2BxoOEf3mcf7uun3rlRhQQb-klabcjUgssUIDmF8PD7MnjvbOichafwaOsnBSNFY1RMIRVMTjWYedKiTdu5PPWrflyzqwB9hfglsHmTZ7';

/** Lấy UserSession từ profile của user đang đăng nhập. null nếu chưa đăng nhập. */
export async function getCurrentSession(): Promise<UserSession | null> {
  const client = createClient();
  if (!client) return null;

  const { data: auth } = await client.auth.getUser();
  const user = auth?.user;
  if (!user) return null;

  const { data } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  const profile = data as ProfileRow | null;

  if (profile?.status === 'Đã khóa') {
    await client.auth.signOut();
    throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ Admin.');
  }

  return {
    isLoggedIn: true,
    name: profile?.name || user.email?.split('@')[0] || 'Người dùng',
    email: profile?.email || user.email || '',
    role: profile?.role ?? 'Nhân viên',
    avatar: profile?.avatar || FALLBACK_AVATAR,
    department: profile?.department ?? undefined, // 'Media' → chỉ thấy màn Media
  };
}

/** Đăng nhập email/mật khẩu, trả về UserSession. Ném lỗi nếu sai thông tin. */
export async function signIn(email: string, password: string): Promise<UserSession> {
  const client = createClient();
  if (!client) throw new Error('Supabase chưa được cấu hình (.env.local).');

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Email hoặc mật khẩu không đúng.');

  const session = await getCurrentSession();
  if (!session) throw new Error('Không tải được hồ sơ người dùng.');
  return session;
}

/** Đăng xuất phiên Supabase hiện tại. */
export async function signOut(): Promise<void> {
  const client = createClient();
  if (!client) return;
  await client.auth.signOut();
}

/** ID của user đang đăng nhập (dùng cho created_by khi ghi dữ liệu). */
export async function getCurrentUserId(): Promise<string | null> {
  const client = createClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user?.id ?? null;
}
