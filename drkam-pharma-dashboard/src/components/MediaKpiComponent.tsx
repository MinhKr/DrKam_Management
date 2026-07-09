import React, { useMemo, useState } from 'react';
import { MediaKpiEntry, MediaTaskLog, Employee, UserSession, MEDIA_VIDEO_TYPES } from '../types';
import { kpiAchieved, kpiScore, kpiTotal, kpiRank, formatKpiValue, videoTypeTotalsFromLogs, inPeriod } from '../lib/media';

interface Props {
  entries: MediaKpiEntry[];
  logs: MediaTaskLog[];
  employees: Employee[];
  session: UserSession;
  onAdd: (entry: MediaKpiEntry) => void;
  onUpdate: (id: string, patch: Partial<MediaKpiEntry>) => void;
  onDelete: (id: string) => void;
}

const monthLabel = (p: string) => `Tháng ${p.slice(5)}/${p.slice(0, 4)}`;
const achColor = (a: number) => a >= 100 ? 'bg-green-500' : a >= 50 ? 'bg-amber-500' : 'bg-rose-500';

export default function MediaKpiComponent({ entries, logs, employees, session, onAdd, onUpdate, onDelete }: Props) {
  const nowMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const dataMonths = useMemo(() => [...new Set(entries.map((e) => e.period))].sort().reverse(), [entries]);
  // Ô chọn tháng dạng lịch — mặc định tháng có KPI mới nhất.
  const [period, setPeriod] = useState(dataMonths[0] ?? nowMonthKey());
  const [editing, setEditing] = useState(false);
  const canEdit = session.role === 'Admin' || session.role === 'Leader' || session.department === 'Media';

  const periodEntries = entries.filter((e) => e.period === period);
  // Nhóm theo nhân sự, Leader trước.
  const groups = useMemo(() => {
    const map = new Map<string, MediaKpiEntry[]>();
    periodEntries.forEach((e) => { const a = map.get(e.employeeId) ?? []; a.push(e); map.set(e.employeeId, a); });
    return [...map.values()]
      .map((list) => list.sort((a, b) => a.stt - b.stt))
      .sort((a, b) => (a[0].roleScope === 'Leader' ? -1 : 1) - (b[0].roleScope === 'Leader' ? -1 : 1));
  }, [periodEntries]);

  const videoSummary = videoTypeTotalsFromLogs(logs.filter((r) => inPeriod(r.date, period)));
  const videoSummaryTotal = videoSummary.reduce((s, v) => s + v.value, 0);

  const addRow = (sample: MediaKpiEntry) => {
    onAdd({
      ...sample, id: 'mk_' + Date.now(),
      stt: (periodEntries.filter((e) => e.employeeId === sample.employeeId).length) + 1,
      groupName: '', metric: 'Chỉ số mới', targetValue: 100, unit: 'number', weight: 0, actualValue: 0, note: '',
    });
  };

  return (
    <div className="space-y-5 text-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">trending_up</span>
            <span>KPI tháng</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 soft-shadow">
            <span className="material-symbols-outlined text-[16px] text-[#D32027]">calendar_month</span>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
              className="text-sm font-semibold border-none outline-none bg-transparent text-slate-700" />
          </div>
          {canEdit && (
            <button onClick={() => setEditing((v) => !v)}
              className={`flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded-xl transition-colors soft-shadow ${
                editing ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-[#D32027] hover:bg-[#B70F1B] text-white'
              }`}>
              <span className="material-symbols-outlined text-[16px]">{editing ? 'check' : 'edit'}</span>
              {editing ? 'Xong' : 'Sửa KPI'}
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow py-12 text-center text-slate-400 font-medium">
          Chưa có KPI cho {monthLabel(period)}.
        </div>
      ) : groups.map((list) => {
        const first = list[0];
        const emp = employees.find((e) => e.id === first.employeeId);
        const total = kpiTotal(list);
        const rank = kpiRank(total);
        return (
          <section key={first.employeeId} className="bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden">
            {/* Header nhân sự */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 border-l-4 border-l-[#D32027]">
              <div className="flex items-center gap-3">
                {emp && <img src={emp.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />}
                <div>
                  <p className="font-bold text-slate-900">{first.employeeName}</p>
                  <span className="text-[11px] font-bold text-[#D32027]">{first.roleScope === 'Leader' ? 'Leader' : 'Nhân viên'}</span>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tổng điểm KPI</p>
                  <p className="text-xl font-extrabold text-[#D32027] tabular-nums leading-none">{total.toFixed(1)} <span className="text-xs font-semibold text-slate-400">điểm</span></p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${rank.color}`}>{rank.label}</span>
              </div>
            </div>

            {/* Bảng KPI */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 uppercase tracking-wide">
                    <th className="px-3 py-2.5 text-left font-bold">STT</th>
                    <th className="px-3 py-2.5 text-left font-bold">Nhóm KPI</th>
                    <th className="px-3 py-2.5 text-left font-bold">Chỉ số</th>
                    <th className="px-3 py-2.5 text-right font-bold">Mục tiêu</th>
                    <th className="px-3 py-2.5 text-right font-bold">Trọng số</th>
                    <th className="px-3 py-2.5 text-right font-bold">Thực tế</th>
                    <th className="px-3 py-2.5 text-left font-bold w-40">Đạt (%)</th>
                    <th className="px-3 py-2.5 text-right font-bold">Điểm</th>
                    {editing && <th className="px-2 py-2.5"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {list.map((e) => {
                    const ach = kpiAchieved(e);
                    const score = kpiScore(e);
                    return (
                      <tr key={e.id} className="hover:bg-rose-50/20">
                        <td className="px-3 py-2 text-slate-400 font-mono">{e.stt}</td>
                        <td className="px-3 py-2">
                          {editing
                            ? <input value={e.groupName} onChange={(ev) => onUpdate(e.id, { groupName: ev.target.value })} className="w-24 px-1.5 py-1 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-[#D32027]" />
                            : <span className="text-slate-600">{e.groupName}</span>}
                        </td>
                        <td className="px-3 py-2 max-w-[240px]">
                          {editing
                            ? <input value={e.metric} onChange={(ev) => onUpdate(e.id, { metric: ev.target.value })} className="w-full px-1.5 py-1 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-[#D32027]" />
                            : <span className="font-medium text-slate-700">{e.metric}</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                          {editing
                            ? <input type="text" inputMode="numeric" value={e.targetValue} onChange={(ev) => onUpdate(e.id, { targetValue: parseInt(ev.target.value.replace(/\D/g, ''), 10) || 0 })} className="w-24 px-1.5 py-1 text-right border border-slate-200 rounded outline-none focus:ring-1 focus:ring-[#D32027]" />
                            : formatKpiValue(e.targetValue, e.unit)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                          {editing
                            ? <input type="text" inputMode="numeric" value={e.weight} onChange={(ev) => onUpdate(e.id, { weight: parseInt(ev.target.value.replace(/\D/g, ''), 10) || 0 })} className="w-14 px-1.5 py-1 text-right border border-slate-200 rounded outline-none focus:ring-1 focus:ring-[#D32027]" />
                            : `${e.weight}%`}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">
                          {editing
                            ? <input type="text" inputMode="numeric" value={e.actualValue} onChange={(ev) => onUpdate(e.id, { actualValue: parseInt(ev.target.value.replace(/\D/g, ''), 10) || 0 })} className="w-24 px-1.5 py-1 text-right border border-slate-200 rounded outline-none focus:ring-1 focus:ring-[#D32027]" />
                            : formatKpiValue(e.actualValue, e.unit)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${achColor(ach)}`} style={{ width: `${Math.min(ach, 100)}%` }} />
                            </div>
                            <span className="text-[11px] font-bold tabular-nums text-slate-600 w-11 text-right">{ach.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-extrabold tabular-nums text-[#D32027]">{score.toFixed(1)}</td>
                        {editing && (
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => onDelete(e.id)} className="text-slate-300 hover:text-rose-600" title="Xóa chỉ số">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/80 font-bold text-slate-800">
                    <td colSpan={7} className="px-3 py-2.5 text-right uppercase text-[11px] tracking-wide">Tổng điểm KPI</td>
                    <td className="px-3 py-2.5 text-right text-[#D32027] tabular-nums">{total.toFixed(1)}</td>
                    {editing && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
            {editing && (
              <div className="px-4 py-2.5 border-t border-slate-100">
                <button onClick={() => addRow(first)} className="text-[11px] font-bold text-[#D32027] hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">add</span> Thêm chỉ số cho {first.employeeName}
                </button>
              </div>
            )}
          </section>
        );
      })}

      {/* Tổng hợp video theo loại (cả team) */}
      <div className="bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 font-display">Tổng hợp sản lượng video theo loại (cả team)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 uppercase tracking-wide">
                {MEDIA_VIDEO_TYPES.map((t) => <th key={t.key} className="px-3 py-2.5 text-center font-bold whitespace-nowrap">{t.label}</th>)}
                <th className="px-3 py-2.5 text-center font-bold bg-rose-50/60 text-[#D32027]">Tổng</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {videoSummary.map((v) => (
                  <td key={v.key} className="px-3 py-3 text-center">
                    <span className="text-lg font-extrabold tabular-nums" style={{ color: v.color }}>{v.value}</span>
                  </td>
                ))}
                <td className="px-3 py-3 text-center bg-rose-50/40">
                  <span className="text-lg font-extrabold text-[#D32027] tabular-nums">{videoSummaryTotal}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
