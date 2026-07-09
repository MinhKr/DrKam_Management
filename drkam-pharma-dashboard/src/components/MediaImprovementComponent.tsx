import React, { useMemo, useState } from 'react';
import { MediaImprovement, UserSession } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  items: MediaImprovement[];
  session: UserSession;
  onAdd: (item: MediaImprovement) => void;
  onUpdate: (id: string, patch: Partial<MediaImprovement>) => void;
  onDelete: (id: string) => void;
}

const monthLabel = (p: string) => `Tháng ${p.slice(5)}/${p.slice(0, 4)}`;
const PRIORITIES: MediaImprovement['priority'][] = ['Cao', 'Trung bình', 'Thấp'];
const prioRank = (p: MediaImprovement['priority']) => PRIORITIES.indexOf(p);
const prioStyle: Record<MediaImprovement['priority'], { badge: string; bar: string; icon: string }> = {
  'Cao':        { badge: 'text-rose-700 bg-rose-50 border-rose-200',     bar: 'bg-[#D32027]', icon: 'priority_high' },
  'Trung bình': { badge: 'text-amber-700 bg-amber-50 border-amber-200',  bar: 'bg-amber-400', icon: 'drag_handle' },
  'Thấp':       { badge: 'text-slate-600 bg-slate-100 border-slate-200', bar: 'bg-slate-300', icon: 'low_priority' },
};

const nowPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export default function MediaImprovementComponent({ items, session, onAdd, onUpdate, onDelete }: Props) {
  const periods = useMemo(() => {
    const set = new Set(items.map((i) => i.period));
    set.add(nowPeriod());
    return [...set].sort().reverse();
  }, [items]);
  const [period, setPeriod] = useState(periods[0] ?? nowPeriod());
  const [modal, setModal] = useState<MediaImprovement | null>(null);
  const [dialog, setDialog] = useState<{ id: string; label: string } | null>(null);
  const canEdit = session.role === 'Admin' || session.role === 'Leader' || session.department === 'Media';

  const list = items
    .filter((i) => i.period === period)
    .sort((a, b) => prioRank(a.priority) - prioRank(b.priority) || a.stt - b.stt);

  const openNew = () => setModal({
    id: '', period, stt: list.length + 1, issue: '', proposal: '', benefit: '', priority: 'Trung bình',
  });

  return (
    <div className="space-y-4 text-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">lightbulb</span>
            <span>Đề xuất cải tiến</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Quản lý & theo dõi các sáng kiến nâng cao hiệu suất làm việc.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 soft-shadow">
            <span className="material-symbols-outlined text-[16px] text-[#D32027]">calendar_month</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="text-sm font-semibold border-none outline-none bg-transparent text-slate-700 cursor-pointer">
              {periods.map((p) => <option key={p} value={p}>{monthLabel(p)}</option>)}
            </select>
          </div>
          {canEdit && (
            <button onClick={openNew}
              className="flex items-center gap-1 px-4 py-1.5 bg-[#D32027] hover:bg-[#B70F1B] text-white text-xs font-bold rounded-xl transition-colors soft-shadow">
              <span className="material-symbols-outlined text-[16px]">add</span> Thêm đề xuất
            </button>
          )}
        </div>
      </div>

      {/* Lưới thẻ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
        {list.map((it) => {
          const st = prioStyle[it.priority];
          return (
            <div key={it.id} className={`bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden border-l-4 min-w-0`}
              style={{ borderLeftColor: it.priority === 'Cao' ? '#D32027' : it.priority === 'Trung bình' ? '#F59E0B' : '#CBD5E1' }}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.badge}`}>
                    <span className="material-symbols-outlined text-[13px]">{st.icon}</span> Ưu tiên: {it.priority}
                  </span>
                  {canEdit && (
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setModal(it)} className="text-slate-300 hover:text-[#D32027]" title="Sửa">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button onClick={() => setDialog({ id: it.id, label: it.issue.slice(0, 40) })} className="text-slate-300 hover:text-rose-600" title="Xóa">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{it.issue}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  <span className="font-bold text-slate-700">Đề xuất: </span>{it.proposal}
                </p>
                {it.benefit && (
                  <div className="pt-3 border-t border-slate-100 flex items-start gap-1.5 text-[11px] text-[#D32027] font-semibold">
                    <span className="material-symbols-outlined text-[15px] mt-px flex-shrink-0">trending_up</span>
                    <span className="leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-w-0">{it.benefit}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thẻ tạo mới */}
        {canEdit && (
          <button onClick={openNew}
            className="min-h-[180px] rounded-2xl border-2 border-dashed border-rose-200 hover:border-[#D32027] hover:bg-rose-50/30 transition-colors flex flex-col items-center justify-center gap-2 text-[#D32027]">
            <span className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">add</span>
            </span>
            <span className="text-sm font-bold">Tạo đề xuất mới</span>
          </button>
        )}

        {list.length === 0 && !canEdit && (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200/60 soft-shadow py-12 text-center text-slate-400 font-medium">
            Chưa có đề xuất trong {monthLabel(period)}.
          </div>
        )}
      </div>

      {modal && (
        <ImprovementModal
          item={modal}
          onClose={() => setModal(null)}
          onSubmit={(it) => {
            if (it.id) onUpdate(it.id, it);
            else onAdd({ ...it, id: 'mi_' + Date.now() });
            setModal(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!dialog}
        title="Xóa đề xuất"
        message={`Xóa đề xuất "${dialog?.label}…"?`}
        confirmText="Xóa"
        onConfirm={() => { if (dialog) onDelete(dialog.id); setDialog(null); }}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

/* ── Modal thêm/sửa đề xuất ── */
function ImprovementModal({ item, onClose, onSubmit }: {
  item: MediaImprovement;
  onClose: () => void;
  onSubmit: (it: MediaImprovement) => void;
}) {
  const [f, setF] = useState<MediaImprovement>(item);
  const set = (patch: Partial<MediaImprovement>) => setF((p) => ({ ...p, ...patch }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.issue.trim() || !f.proposal.trim()) return;
    onSubmit({ ...f, issue: f.issue.trim(), proposal: f.proposal.trim(), benefit: f.benefit.trim() });
  };
  const areaCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] bg-white resize-none';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-900 font-display mb-4">{f.id ? 'Sửa đề xuất' : 'Thêm đề xuất'}</h3>
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500">Vấn đề / Hiện trạng *</span>
            <textarea value={f.issue} onChange={(e) => set({ issue: e.target.value })} required rows={2} className={areaCls} placeholder="Mô tả vấn đề..." />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500">Đề xuất cải tiến *</span>
            <textarea value={f.proposal} onChange={(e) => set({ proposal: e.target.value })} required rows={2} className={areaCls} placeholder="Giải pháp đề xuất..." />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500">Lợi ích kỳ vọng</span>
            <textarea value={f.benefit} onChange={(e) => set({ benefit: e.target.value })} rows={2} className={areaCls} placeholder="Lợi ích mang lại..." />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500">Ưu tiên</span>
            <select value={f.priority} onChange={(e) => set({ priority: e.target.value as MediaImprovement['priority'] })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-white">
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</button>
          <button type="submit" className="px-5 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-lg transition-colors">Lưu</button>
        </div>
      </form>
    </div>
  );
}
