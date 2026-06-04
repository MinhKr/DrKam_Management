'use client';

import dynamic from 'next/dynamic';

// App là một SPA client-side (dùng state + localStorage). Tải động, tắt SSR
// để giữ nguyên 100% hành vi giao diện đã thiết kế.
const App = dynamic(() => import('@/src/App'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <span className="material-symbols-outlined text-[#D32027] text-4xl animate-pulse">
          medication
        </span>
        <span className="text-sm font-semibold">Đang tải hệ thống DrKam…</span>
      </div>
    </div>
  ),
});

export default function Page() {
  return <App />;
}
