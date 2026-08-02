'use client';
/**
 * Phần tử UI dùng chung cho MODULE ORDER (2 màn: Content→Media, Ads→Content).
 * Gồm: badge hạn/ưu tiên/trạng thái, dải ô đếm cảnh báo, ô nhập cơ bản.
 * Logic hạn nằm ở src/lib/orders.ts — ở đây chỉ hiển thị.
 */
import React from 'react';
import { Employee } from '../types';
import { OrderDeadlineInfo, priorityStyle, statusStyle } from '../lib/orders';

/** Team Content = nhân sự KHÔNG thuộc Media / Ads Facebook (đúng quy ước Checklist Content). */
export const isContentStaff = (e: Employee) =>
  e.status === 'Hoạt động' && e.department !== 'Media' && e.department !== 'Ads Facebook';
export const isMediaStaff = (e: Employee) => e.status === 'Hoạt động' && e.department === 'Media';
export const isAdsStaff = (e: Employee) => e.status === 'Hoạt động' && e.department === 'Ads Facebook';

const PILL = 'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap';

export function DeadlineBadge({ info, deadline }: { info: OrderDeadlineInfo; deadline?: string }) {
  return (
    <span className={`${PILL} ${info.color}`} title={deadline ? `Hạn ${deadline}` : 'Chưa đặt hạn'}>
      {info.alert === 'overdue' && <span className="material-symbols-outlined text-[12px] align-[-2px] mr-0.5">error</span>}
      {info.alert === 'urgent' && <span className="material-symbols-outlined text-[12px] align-[-2px] mr-0.5">schedule</span>}
      {info.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: 'CAO' | 'TRUNG BÌNH' | 'THẤP' }) {
  return <span className={`${PILL} ${priorityStyle(priority)}`}>{priority}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`${PILL} ${statusStyle(status)}`}>{status}</span>;
}

/** Dải 3 ô đếm: Quá hạn · Sắp hết hạn · Đang mở. Bấm để lọc nhanh. */
export function AlertStrip({ counts, active, onPick }: {
  counts: { overdue: number; urgent: number; open: number };
  active: 'overdue' | 'urgent' | null;
  onPick: (k: 'overdue' | 'urgent' | null) => void;
}) {
  const Box = ({ k, label, value, icon, tone }: {
    k: 'overdue' | 'urgent' | null; label: string; value: number; icon: string; tone: string;
  }) => {
    const on = k !== null && active === k;
    return (
      <button
        type="button"
        onClick={() => onPick(k === null ? null : on ? null : k)}
        disabled={k === null}
        className={`flex-1 min-w-[150px] bg-white rounded-2xl border soft-shadow p-4 flex items-center gap-3 text-left transition-all ${
          on ? 'border-[#D32027] ring-1 ring-[#D32027]' : 'border-slate-200/60'
        } ${k === null ? 'cursor-default' : 'hover:border-slate-300 cursor-pointer'}`}
      >
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
          <span className="block text-xl font-extrabold text-slate-900 tabular-nums leading-tight">{value}</span>
        </span>
        {on && <span className="material-symbols-outlined text-[16px] text-[#D32027] ml-auto">filter_alt</span>}
      </button>
    );
  };
  return (
    <div className="flex flex-wrap gap-3">
      <Box k="overdue" label="Quá hạn" value={counts.overdue} icon="error" tone="bg-rose-50 text-rose-600" />
      <Box k="urgent" label="Sắp hết hạn" value={counts.urgent} icon="schedule" tone="bg-amber-50 text-amber-600" />
      <Box k={null} label="Đang mở" value={counts.open} icon="pending_actions" tone="bg-slate-100 text-slate-500" />
    </div>
  );
}

/** Link ngắn gọn: hiện tên rút gọn, mở tab mới. Nếu không phải URL thì chỉ hiện text. */
export function LinkCell({ value, max = 26 }: { value?: string; max?: number }) {
  if (!value) return <span className="text-slate-300">—</span>;
  const short = value.length > max ? value.slice(0, max) + '…' : value;
  if (!/^https?:\/\//i.test(value)) return <span className="text-slate-600" title={value}>{short}</span>;
  return (
    <a href={value} target="_blank" rel="noreferrer" className="text-[#D32027] hover:underline font-semibold" title={value}>
      {short}
    </a>
  );
}

// ── Ô nhập dùng chung cho form order ──────────────────────────
export const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] bg-white disabled:bg-slate-50 disabled:text-slate-400';

export function Field({ label, hint, children, className }: {
  label: string; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className || ''}`}>
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

/** Ô chọn nhân sự (theo danh sách đã lọc phòng ban) — lưu cả id và tên. */
export function StaffSelect({ value, staff, onChange, disabled, placeholder = '— chọn —' }: {
  value?: string | null;
  staff: Employee[];
  onChange: (id: string | null, name: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <select
      className={INPUT}
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => {
        const emp = staff.find((s) => s.id === e.target.value);
        onChange(emp ? emp.id : null, emp ? emp.name : '');
      }}
    >
      <option value="">{placeholder}</option>
      {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );
}

/** Ô ngày dd/mm/yyyy dựa trên input type=date (UI vẫn giữ dd/mm/yyyy). */
export function DateField({ value, onChange, disabled, min }: {
  value?: string; onChange: (ui: string) => void; disabled?: boolean; min?: string;
}) {
  const toIso = (ui?: string) => {
    if (!ui) return '';
    const [d, m, y] = ui.split('/');
    return d && m && y ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : '';
  };
  const toUi = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  return (
    <input type="date" className={INPUT} disabled={disabled} min={min}
      value={toIso(value)} onChange={(e) => onChange(toUi(e.target.value))} />
  );
}
