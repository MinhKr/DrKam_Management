// Chạy Next.js dev ở CHẾ ĐỘ DEMO (localStorage) — bỏ qua Supabase để test không cần cloud.
// Xoá 2 biến env Supabase trước khi khởi động: Next.js không ghi đè biến đã có sẵn trong
// process.env bằng .env.local, nên isSupabaseConfigured = false → app chạy dữ liệu local.
import { spawn } from 'node:child_process';

const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' };
const child = spawn('next', ['dev', ...process.argv.slice(2)], { stdio: 'inherit', shell: true, env });
child.on('exit', (code) => process.exit(code ?? 0));
