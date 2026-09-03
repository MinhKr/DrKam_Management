import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

/**
 * XOÁ TÀI KHOẢN ĐĂNG NHẬP (auth.users) — CHỈ ADMIN.
 *
 * Vì sao phải là API route: xoá user ở Supabase Auth cần SERVICE ROLE KEY,
 * khoá này là toàn quyền cơ sở dữ liệu nên KHÔNG bao giờ được nhúng vào trình
 * duyệt. Ở đây nó chỉ nằm trên server (process.env, không có tiền tố
 * NEXT_PUBLIC_) nên trình duyệt không thấy.
 *
 * Luồng: màn "Quản lý nhân sự" gọi POST { userId } → route tự kiểm tra người
 * gọi ĐANG ĐĂNG NHẬP và có vai trò Admin (đọc cookie phiên, không tin dữ liệu
 * client gửi lên) → mới xoá.
 *
 * Xoá auth.users kéo theo dòng profiles (FK on delete cascade), còn báo cáo cũ
 * thì KHÔNG mất vì migration 0022 đã đổi các khoá ngoại sang ON DELETE SET NULL.
 *
 * Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY → trả 501 để app tự lùi về cách cũ
 * (chỉ xoá hồ sơ, nhắc Admin xoá tay trên Supabase).
 */
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 501 },
    );
  }

  let userId = '';
  try {
    const body = await req.json();
    userId = String(body?.userId ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ.' }, { status: 400 });
  }
  if (!userId) return NextResponse.json({ error: 'Thiếu userId.' }, { status: 400 });

  // ── Người gọi phải là Admin ĐANG ĐĂNG NHẬP (đọc từ cookie phiên) ──
  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Server chưa cấu hình Supabase.' }, { status: 501 });
  }
  const { data: auth } = await supabase.auth.getUser();
  const caller = auth?.user;
  if (!caller) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();
  if (profile?.role !== 'Admin') {
    return NextResponse.json({ error: 'Chỉ Admin được xoá tài khoản.' }, { status: 403 });
  }
  if (caller.id === userId) {
    return NextResponse.json({ error: 'Không thể tự xoá tài khoản của mình.' }, { status: 400 });
  }

  // ── Xoá bằng service role ──
  const admin = createAdminClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
