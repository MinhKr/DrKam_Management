'use client';
// Bộ phần tử UI dùng chung cho mọi dashboard (brand traffic, KOC doanh thu, Facebook, Tổng quan).
import React from 'react';

export const numFormat = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v).replace('₫', 'đ');

export const compact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace('.0', '') + 'K';
  return n.toLocaleString('vi-VN');
};

export const BAR_COLORS = ['#D32027', '#E0563B', '#C2410C', '#0F766E', '#2563EB', '#7C3AED', '#DB2777', '#16A34A'];

export const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' } as const;

// Badge so sánh kỳ trước: dùng `delta` (%) cho chỉ số cộng dồn, `deltaPts` (điểm) cho chỉ số tỷ lệ.
export function Delta({ delta, deltaPts }: { delta?: number | null; deltaPts?: number }) {
  const val = deltaPts !== undefined ? deltaPts : delta;
  if (val === undefined || val === null) return <span className="text-[11px] text-slate-300 font-medium">— kỳ trước</span>;
  const up = val > 0, flat = val === 0;
  const suffix = deltaPts !== undefined ? ' điểm' : '%';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold w-max px-1.5 py-0.5 rounded-full ${
      flat ? 'text-slate-500 bg-slate-100' : up ? 'text-green-700 bg-green-50' : 'text-rose-600 bg-rose-50'
    }`}>
      <span className="material-symbols-outlined text-[13px]">{flat ? 'remove' : up ? 'arrow_upward' : 'arrow_downward'}</span>
      {Math.abs(val)}{suffix}
    </span>
  );
}

// Thẻ KPI: value lớn + dòng phụ tự do (delta hoặc ghi chú).
export function KpiBox({ label, value, icon, accent, children }: {
  label: string; value: string; icon: string; accent: string; children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
      </div>
      <div className="text-lg font-extrabold text-slate-900 tracking-tight tabular-nums truncate" title={value}>{value}</div>
      {children}
    </div>
  );
}

export function ChartCard({ title, icon, children, className }: { title: string; icon: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/60 soft-shadow p-4 flex flex-col ${className || ''}`}>
      <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5 mb-3">
        <span className="material-symbols-outlined text-[18px] text-slate-400">{icon}</span>{title}
      </h3>
      {children}
    </div>
  );
}

export function Empty() {
  return <div className="h-[160px] flex items-center justify-center text-slate-300 text-sm">Chưa có dữ liệu trong kỳ.</div>;
}
