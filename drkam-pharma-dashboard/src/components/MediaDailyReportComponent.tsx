import React, { useMemo, useState } from 'react';
import { MediaTaskLog, Employee, UserSession, MEDIA_VIDEO_TYPES } from '../types';
import { inPeriod, weekdayVi, isVideoContent } from '../lib/media';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  logs: MediaTaskLog[];
  employees: Employee[];
  session: UserSession;
  onAdd: (log: MediaTaskLog) => void;
  onUpdate: (id: string, patch: Partial<MediaTaskLog>) => void;
  onDelete: (id: string) => void;
}

const CONTENT_OPTIONS = [...MEDIA_VIDEO_TYPES.map((t) => t.label), 'Khác'];
const contentColor = (label: string) => MEDIA_VIDEO_TYPES.find((t) => t.label === label)?.color ?? '#64748B';
const PROGRESS: MediaTaskLog['progress'][] = ['Chưa làm', 'Đang làm', 'Hoàn thành'];
const progressStyle = (p: MediaTaskLog['progress']) =>
  p === 'Hoàn thành' ? 'text-green-700 bg-green-50 border-green-200'
  : p === 'Đang làm' ? 'text-amber-700 bg-amber-50 border-amber-200'
  : 'text-slate-500 bg-slate-50 border-slate-200';

const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const toDdmmyyyy = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const toIso = (dd: string) => { const [d, m, y] = dd.split('/'); return d ? `${y}-${m}-${d}` : ''; };
const monthLabel = (p: string) => `Tháng ${p.slice(5)}/${p.slice(0, 4)}`;

export default function MediaDailyReportComponent({ logs, employees, session, onAdd, onUpdate, onDelete }: Props) {
  const staff = useMemo(() => employees
    .filter((e) => e.department === 'Media' && e.status === 'Hoạt động')
    .sort((a, b) => (a.role === 'Leader' ? -1 : 1) - (b.role === 'Leader' ? -1 : 1)), [employees]);

  const selfId = staff.find((s) => s.name === session.name)?.id;
  const [activeId, setActiveId] = useState(selfId ?? staff[0]?.id ?? '');
  const active = staff.find((s) => s.id === activeId) ?? staff[0];

  const isAdmin = session.role === 'Admin';
  // Mỗi nhân sự chỉ sửa được báo cáo của CHÍNH MÌNH (tab trùng tên); Admin sửa được tất cả.
  const canEdit = !!active && (isAdmin || active.name === session.name);

  // Mặc định mở tháng có dữ liệu mới nhất (không phải tháng hiện tại trống).
  const [period, setPeriod] = useState(() => {
    const ms = [...new Set(logs.map((l) => { const [d, m, y] = l.date.split('/'); return d ? `${y}-${m}` : ''; }).filter(Boolean))].sort().reverse();
    return ms[0] ?? isoToday().slice(0, 7);
  });

  // Chế độ lọc thời gian: theo Tháng hoặc theo Ngày cụ thể (dd/mm/yyyy).
  const [filterMode, setFilterMode] = useState<'month' | 'day'>('month');
  const [dayIso, setDayIso] = useState(() => {
    const ds = [...new Set(logs.map((l) => { const [d, m, y] = l.date.split('/'); return d ? `${y}-${m}-${d}` : ''; }).filter(Boolean))].sort();
    return ds[ds.length - 1] ?? isoToday();
  });
  const dayDd = toDdmmyyyy(dayIso);
  const matchFilter = (l: MediaTaskLog) => filterMode === 'day' ? l.date === dayDd : inPeriod(l.date, period);

  const [modal, setModal] = useState<MediaTaskLog | null>(null);
  const [dialog, setDialog] = useState<{ id: string; label: string } | null>(null);

  const personLogs = useMemo(() => logs.filter((l) => l.employeeId === activeId), [logs, activeId]);

  const byDay = useMemo(() => {
    const rows = personLogs.filter(matchFilter);
    const map = new Map<string, MediaTaskLog[]>();
    rows.forEach((l) => { const a = map.get(l.date) ?? []; a.push(l); map.set(l.date, a); });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personLogs, filterMode, dayDd, period]);

  const filtered = personLogs.filter(matchFilter);
  const videoCount = filtered.filter((l) => isVideoContent(l.contentType)).length;
  const perType = MEDIA_VIDEO_TYPES.map((t) => ({
    ...t, value: filtered.filter((l) => l.contentType === t.label).length,
  }));

  const openNew = () => setModal({
    id: '', date: filterMode === 'day' ? dayDd : toDdmmyyyy(isoToday()), employeeId: activeId, employeeName: active?.name ?? '',
    contentType: 'Bán hàng', task: '', progress: 'Hoàn thành', approval: 'Đã duyệt',
  });

  const cycleProgress = (l: MediaTaskLog) => {
    const next = PROGRESS[(PROGRESS.indexOf(l.progress) + 1) % PROGRESS.length];
    onUpdate(l.id, { progress: next });
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Header + tháng */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">bar_chart</span>
            <span>Báo cáo ngày</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Mỗi người ghi công việc chi tiết trong ngày — số video tự đếm cho Tổng quan & KPI.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Chế độ lọc: Tháng / Ngày */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
            <button type="button" onClick={() => setFilterMode('month')}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-colors ${filterMode === 'month' ? 'bg-white text-[#D32027] soft-shadow' : 'text-slate-500 hover:text-slate-700'}`}>Tháng</button>
            <button type="button" onClick={() => setFilterMode('day')}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-colors ${filterMode === 'day' ? 'bg-white text-[#D32027] soft-shadow' : 'text-slate-500 hover:text-slate-700'}`}>Ngày</button>
          </div>
          {/* Ô chọn thời gian tương ứng */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 soft-shadow">
            <span className="material-symbols-outlined text-[16px] text-[#D32027]">{filterMode === 'day' ? 'event' : 'calendar_month'}</span>
            {filterMode === 'month' ? (
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
                className="text-sm font-semibold border-none outline-none bg-transparent text-slate-700" />
            ) : (
              <input type="date" value={dayIso} max={isoToday()} onChange={(e) => setDayIso(e.target.value)}
                className="text-sm font-semibold border-none outline-none bg-transparent text-slate-700" />
            )}
          </div>
        </div>
      </div>

      {/* Tab người + nút thêm */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-max">
          {staff.map((emp) => (
            <button key={emp.id} onClick={() => setActiveId(emp.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeId === emp.id ? 'bg-white text-[#D32027] soft-shadow' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <img src={emp.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
              {emp.name.split(' ').slice(-1)[0]}
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${emp.role === 'Leader' ? 'bg-rose-100 text-[#D32027]' : 'bg-slate-200 text-slate-500'}`}>
                {emp.role === 'Leader' ? 'Lead' : 'NV'}
              </span>
            </button>
          ))}
        </div>
        {canEdit && (
          <button onClick={openNew}
            className="flex items-center gap-1 px-4 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-xl transition-colors soft-shadow">
            <span className="material-symbols-outlined text-[18px]">add</span> Thêm công việc
          </button>
        )}
      </div>

      {/* Tóm tắt tháng */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Video {filterMode === 'day' ? `ngày ${dayDd}` : monthLabel(period).toLowerCase()}
          </span>
          <span className="text-2xl font-extrabold text-[#D32027] tabular-nums leading-none">{videoCount}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {perType.map((t) => (
            <span key={t.key} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg"
              style={{ background: `${t.color}14`, color: t.color }}>
              {t.label}<b className="tabular-nums">{t.value}</b>
            </span>
          ))}
        </div>
      </div>

      {!canEdit && (
        <div className="text-[11px] text-slate-400 italic px-1">Bạn chỉ xem báo cáo của {active?.name}. Đăng nhập đúng nick để chỉnh sửa.</div>
      )}

      {/* Báo cáo theo ngày — MỖI NGÀY LÀ 1 THẺ, nền xen kẽ trắng / slate-100 để dễ phân cách.
         Header cột hiển thị 1 lần trên cùng; các thẻ dùng chung colgroup + table-fixed nên cột thẳng hàng. */}
      <div className="overflow-x-auto">
        <div className="min-w-[920px] space-y-3">
          {/* Hàng tiêu đề cột (1 lần) */}
          <table className="table-fixed w-full text-xs">
            <colgroup>
              <col className="w-24" /><col className="w-12" /><col /><col className="w-12" />
              <col className="w-28" /><col className="w-40" /><col className="w-32" /><col className="w-20" />
              {canEdit && <col className="w-16" />}
            </colgroup>
            <thead>
              <tr className="text-slate-500 uppercase tracking-wide text-[11px]">
                <th className="px-2 py-1.5 text-left font-bold">Content</th>
                <th className="px-2 py-1.5 text-left font-bold">KB</th>
                <th className="px-3 py-1.5 text-left font-bold">Công việc</th>
                <th className="px-2 py-1.5 text-center font-bold">SL</th>
                <th className="px-2 py-1.5 text-left font-bold">Tiến độ</th>
                <th className="px-2 py-1.5 text-left font-bold">Link sản phẩm</th>
                <th className="px-2 py-1.5 text-left font-bold">Ghi chú</th>
                <th className="px-2 py-1.5 text-left font-bold">Duyệt</th>
                {canEdit && <th className="px-2 py-1.5"></th>}
              </tr>
            </thead>
          </table>

          {byDay.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/70 soft-shadow py-10 text-center text-slate-400">
              Chưa có báo cáo {filterMode === 'day' ? `ngày ${dayDd}` : `trong ${monthLabel(period).toLowerCase()}`}.
            </div>
          ) : byDay.map(([day, items], di) => {
            const dayVideos = items.filter((l) => isVideoContent(l.contentType)).length;
            const tinted = di % 2 === 1; // xen kẽ: ngày lẻ dùng nền slate-100
            return (
              <div key={day} className={`rounded-xl border soft-shadow overflow-hidden ${tinted ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-200/70'}`}>
                {/* Tiêu đề ngày */}
                <div className="px-4 py-2.5 flex items-center gap-3 border-l-4 border-l-[#D32027] border-b border-slate-200/60">
                  <span className="font-bold text-slate-800 text-sm">{weekdayVi(day)}</span>
                  <span className="font-mono text-[12px] text-slate-500">{day}</span>
                  <span className="ml-auto text-[11px] font-bold text-[#D32027] bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">{dayVideos} video</span>
                </div>
                {/* Đầu việc trong ngày */}
                <table className="table-fixed w-full text-xs">
                  <colgroup>
                    <col className="w-24" /><col className="w-12" /><col /><col className="w-12" />
                    <col className="w-28" /><col className="w-40" /><col className="w-32" /><col className="w-20" />
                    {canEdit && <col className="w-16" />}
                  </colgroup>
                  <tbody className="divide-y divide-slate-200/50">
                    {items.map((l) => (
                      <tr key={l.id} className="align-top hover:bg-rose-50/30">
                        <td className="px-2 py-2">
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap"
                            style={{ background: `${contentColor(l.contentType)}1a`, color: contentColor(l.contentType) }}>{l.contentType}</span>
                        </td>
                        <td className="px-2 py-2 font-mono text-slate-400">{l.scriptNo || '–'}</td>
                        <td className="px-3 py-2 text-slate-700 whitespace-pre-line leading-relaxed break-words">{l.task}</td>
                        <td className="px-2 py-2 text-center tabular-nums text-slate-600">{l.quantity ?? '–'}</td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={canEdit ? () => cycleProgress(l) : undefined} disabled={!canEdit}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${progressStyle(l.progress)} ${canEdit ? 'cursor-pointer' : ''}`}
                            title={canEdit ? 'Bấm để đổi tiến độ' : ''}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />{l.progress}
                          </button>
                        </td>
                        <td className="px-2 py-2">
                          {l.productLink
                            ? <span className="text-slate-500 text-[11px] truncate inline-block max-w-full" title={l.productLink}>{l.productLink}</span>
                            : <span className="text-slate-300">–</span>}
                        </td>
                        <td className="px-2 py-2 text-slate-500 truncate" title={l.note ?? ''}>{l.note || ''}</td>
                        <td className="px-2 py-2 text-slate-500 text-[11px]">{l.approval || ''}</td>
                        {canEdit && (
                          <td className="px-2 py-2 whitespace-nowrap text-center">
                            <button onClick={() => setModal(l)} className="text-slate-300 hover:text-[#D32027] transition-colors" title="Sửa">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button onClick={() => setDialog({ id: l.id, label: l.task || '(trống)' })} className="text-slate-300 hover:text-rose-600 transition-colors ml-1" title="Xóa">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      {modal && active && (
        <LogModal
          log={modal}
          personName={active.name}
          onClose={() => setModal(null)}
          onSubmit={(l) => {
            if (l.id) onUpdate(l.id, l);
            else { onAdd({ ...l, id: 'ml_' + Date.now() }); const [d, m, y] = l.date.split('/'); if (d) setPeriod(`${y}-${m}`); }
            setModal(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!dialog}
        title="Xóa dòng báo cáo"
        message={`Xóa "${dialog?.label}"?`}
        confirmText="Xóa"
        onConfirm={() => { if (dialog) onDelete(dialog.id); setDialog(null); }}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

/* ── Popup báo cáo (hình chữ nhật) — thêm/sửa 1 công việc ── */
function LogModal({ log, personName, onClose, onSubmit }: {
  log: MediaTaskLog;
  personName: string;
  onClose: () => void;
  onSubmit: (l: MediaTaskLog) => void;
}) {
  const [f, setF] = useState<MediaTaskLog>(log);
  const set = (patch: Partial<MediaTaskLog>) => setF((p) => ({ ...p, ...patch }));
  const fromIso = (iso: string) => { const [y, m, d] = iso.split('-'); return d ? `${d}/${m}/${y}` : ''; };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.task.trim()) return;
    onSubmit({ ...f, employeeName: personName, task: f.task.trim() });
  };
  const cls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] bg-white';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header popup */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">{f.id ? 'Sửa báo cáo' : 'Báo cáo công việc'}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Nhân sự: <b className="text-slate-600">{personName}</b></p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ngày</span>
            <input type="date" value={toIso(f.date)} onChange={(e) => set({ date: fromIso(e.target.value) })} className={cls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Content (loại)</span>
            <select value={f.contentType} onChange={(e) => set({ contentType: e.target.value })} className={cls}>
              {CONTENT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Công việc *</span>
            <textarea value={f.task} onChange={(e) => set({ task: e.target.value })} required autoFocus rows={4}
              className={`${cls} resize-y min-h-[92px] leading-relaxed`} placeholder="Mô tả chi tiết công việc đã làm...&#10;Có thể xuống dòng, ghi nhiều ý." />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">KB (số kịch bản)</span>
            <input type="text" value={f.scriptNo ?? ''} onChange={(e) => set({ scriptNo: e.target.value })} className={cls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Số lượng</span>
            <input type="text" inputMode="numeric" value={f.quantity ?? ''} onChange={(e) => set({ quantity: parseInt(e.target.value.replace(/\D/g, ''), 10) || null })} className={cls} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tiến độ</span>
            <select value={f.progress} onChange={(e) => set({ progress: e.target.value as MediaTaskLog['progress'] })} className={cls}>
              {PROGRESS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Link sản phẩm</span>
            <input type="text" value={f.productLink ?? ''} onChange={(e) => set({ productLink: e.target.value })} className={cls} placeholder="Tên file / đường dẫn..." />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ghi chú</span>
            <input type="text" value={f.note ?? ''} onChange={(e) => set({ note: e.target.value })} className={cls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">TT Duyệt</span>
            <input type="text" value={f.approval ?? ''} onChange={(e) => set({ approval: e.target.value })} className={cls} placeholder="vd Đã duyệt" />
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</button>
          <button type="submit" className="px-6 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-lg transition-colors">Lưu báo cáo</button>
        </div>
      </form>
    </div>
  );
}
