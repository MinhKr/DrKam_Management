import React, { useMemo, useState } from 'react';
import { MediaKpiEntry, MediaTaskLog, Employee, UserSession, MEDIA_VIDEO_TYPES } from '../types';
import { kpiAchieved, kpiScore, kpiTotal, kpiRank, formatKpiValue, videoTypeTotalsFromLogs, inPeriod, mediaVideoActual, isAutoMetric } from '../lib/media';
import { MonthPicker } from './dashboardKit';

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
/** Chỉ số đo "số lượng video sản xuất" — Thực tế tự đếm được từ báo cáo ngày. */
const isVideoCountMetric = (metric: string) => {
  const m = metric.toLowerCase();
  return m.includes('số lượng video') || m.includes('video sản xuất');
};
/**
 * Tổng trọng số của MỖI người phải đúng 100%.
 * Trả về thông báo lỗi (chuỗi rỗng = hợp lệ) — dùng chặn nút Lưu ở cả 2 popup.
 */
function weightError(rows: MediaKpiEntry[]): string {
  const bad = groupByEmployee(rows)
    .map((l) => ({ name: l[0].employeeName, total: l.reduce((s, e) => s + e.weight, 0) }))
    .filter((x) => x.total !== 100);
  if (bad.length === 0) return '';
  return `Tổng trọng số phải đúng 100% — ${bad.map((b) => `${b.name}: ${b.total}%`).join(' · ')}. `
    + 'Chỉnh lại trọng số các chỉ số cho đủ 100% rồi lưu.';
}

/**
 * Ép tổng trọng số mỗi người về đúng 100% cho khung tháng mới.
 * Các chỉ số nhập tay tháng trước đã bị loại khỏi khung → phần trọng số thiếu được dồn
 * vào chỉ số có trọng số lớn nhất (chỉ số chính), sửa lại được ngay trong form thiết lập.
 */
function normalizeWeights(rows: MediaKpiEntry[]): MediaKpiEntry[] {
  return groupByEmployee(rows).flatMap((list) => {
    const sum = list.reduce((s, e) => s + e.weight, 0);
    if (sum === 100) return list;
    const iMax = list.reduce((bi, e, i) => (e.weight > list[bi].weight ? i : bi), 0);
    return list.map((e, i) => (i === iMax ? { ...e, weight: Math.max(0, e.weight + (100 - sum)) } : e));
  });
}

/** Sắp xếp nhóm KPI theo nhân sự, Leader trước. */
function groupByEmployee(list: MediaKpiEntry[]): MediaKpiEntry[][] {
  const map = new Map<string, MediaKpiEntry[]>();
  list.forEach((e) => { const a = map.get(e.employeeId) ?? []; a.push(e); map.set(e.employeeId, a); });
  return [...map.values()]
    .map((l) => l.sort((a, b) => a.stt - b.stt))
    .sort((a, b) => (a[0].roleScope === 'Leader' ? -1 : 1) - (b[0].roleScope === 'Leader' ? -1 : 1));
}

export default function MediaKpiComponent({ entries, logs, employees, session, onAdd, onUpdate, onDelete }: Props) {
  const nowMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const dataMonths = useMemo(() => [...new Set(entries.map((e) => e.period))].sort().reverse(), [entries]);
  // Ô chọn tháng dạng lịch — LUÔN mặc định tháng hiện tại (tháng chưa set KPI → hiện khung từ tháng trước).
  const [period, setPeriod] = useState(nowMonthKey());
  const [setupOpen, setSetupOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const canEdit = session.role === 'Admin' || session.role === 'Leader' || session.department === 'Media';

  const periodEntries = entries.filter((e) => e.period === period);
  const periodLogs = useMemo(() => logs.filter((r) => inPeriod(r.date, period)), [logs, period]);

  // ── Khung KPI cho tháng CHƯA thiết lập ──────────────────────────
  // Tháng chưa có KPI → dựng khung từ tháng gần nhất TRƯỚC đó:
  //   • Mục tiêu = 0 (chưa đặt)   • Trọng số = giữ nguyên tháng trước
  //   • Thực tế  = tự đếm từ báo cáo ngày với chỉ số "Số lượng video"; các chỉ số khác = 0.
  const templateSource = useMemo(() => {
    const prior = dataMonths.filter((m) => m < period);
    return prior[0] ?? dataMonths.find((m) => m !== period) ?? null;
  }, [dataMonths, period]);
  const isTemplate = periodEntries.length === 0 && !!templateSource;
  const templateEntries = useMemo<MediaKpiEntry[]>(() => {
    if (!isTemplate || !templateSource) return [];
    const sttByEmp = new Map<string, number>();
    return normalizeWeights(entries
      .filter((e) => e.period === templateSource)
      // CHỈ kế thừa chỉ số TỰ ĐỘNG (video · reach · doanh thu) — đây là đầu việc cố định,
      // tháng nào cũng có. Chỉ số nhập tay (đào tạo, nhân sự…) KHÔNG chuyển sang tháng mới:
      // phát sinh tháng nào thì nhân viên tự thêm ở "Sửa KPI", và luôn được tính 100%.
      .filter(isAutoMetric)
      .sort((a, b) => a.stt - b.stt)
      .map((e) => {
        const stt = (sttByEmp.get(e.employeeId) ?? 0) + 1;
        sttByEmp.set(e.employeeId, stt);
        return {
          ...e,
          id: `tpl_${period}_${e.id}`,
          period,
          stt,
          targetValue: 0,
          actualValue: isVideoCountMetric(e.metric)
            ? mediaVideoActual({ ...e, period }, logs)
            : 0,
          note: '',
        };
      }));
  }, [isTemplate, templateSource, entries, period, periodLogs]);

  // Chỉ số video: Thực tế LUÔN tự đếm từ báo cáo ngày (live) — cho mọi tháng, không nhập tay.
  const withVideoActual = (list: MediaKpiEntry[]): MediaKpiEntry[] =>
    list.map((e) => isVideoCountMetric(e.metric)
      ? { ...e, actualValue: mediaVideoActual(e, logs) }
      : e);
  const displayEntries = isTemplate ? templateEntries : withVideoActual(periodEntries);
  const groups = useMemo(() => groupByEmployee(displayEntries), [displayEntries]);

  const videoSummary = videoTypeTotalsFromLogs(periodLogs);
  const videoSummaryTotal = videoSummary.reduce((s, v) => s + v.value, 0);

  // Lưu khung mẫu (đã nhập Mục tiêu + Trọng số ở popup) thành bản ghi thật.
  const saveSetup = (rows: MediaKpiEntry[]) => {
    rows.forEach((e, i) => onAdd({ ...e, id: `mk_${Date.now()}_${i}` }));
    setSetupOpen(false);
  };

  return (
    <div className="space-y-5 text-slate-800">
      {setupOpen && isTemplate && (
        <SetupKpiModal period={period} templateSource={templateSource!} templateEntries={templateEntries}
          employees={employees} onClose={() => setSetupOpen(false)} onSave={saveSetup} />
      )}
      {editOpen && !isTemplate && (
        <KpiEditModal period={period} entries={periodEntries} employees={employees}
          onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} onClose={() => setEditOpen(false)} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">trending_up</span>
            <span>KPI tháng</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* allowFuture: KPI có thể thiết lập trước cho tháng sau. */}
          <MonthPicker value={period} onChange={setPeriod} allowFuture />
          {canEdit && (isTemplate ? (
            <button onClick={() => setSetupOpen(true)}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded-xl transition-colors soft-shadow bg-[#D32027] hover:bg-[#B70F1B] text-white">
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Thiết lập KPI tháng này
            </button>
          ) : groups.length > 0 ? (
            <button onClick={() => setEditOpen(true)}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded-xl transition-colors soft-shadow bg-[#D32027] hover:bg-[#B70F1B] text-white">
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Sửa KPI
            </button>
          ) : null)}
        </div>
      </div>

      {/* Băng thông báo khi đang dùng khung từ tháng trước */}
      {isTemplate && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-800">
          <span className="material-symbols-outlined text-[18px] text-amber-500 flex-shrink-0">info</span>
          <p>
            <b>KPI {monthLabel(period)} chưa thiết lập</b> — đang hiển thị khung từ {monthLabel(templateSource!)}, chỉ gồm
            các <b>chỉ số cố định</b> (video · reach · doanh thu): mục tiêu để <b>0</b>, trọng số giữ nguyên, cột <b>Thực tế</b> <b>tự cập nhật</b> theo dữ liệu.
            Các đầu việc phát sinh (đào tạo, nhân sự…) không chuyển sang tháng mới — thêm ở <b>“Sửa KPI”</b> khi cần, tự tính <b>100%</b>.
            {canEdit && <> Bấm <b>“Thiết lập KPI tháng này”</b> để nhập mục tiêu &amp; trọng số.</>}
          </p>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow py-12 text-center text-slate-400 font-medium">
          Chưa có KPI cho {monthLabel(period)}.
        </div>
      ) : groups.map((list) => {
        const first = list[0];
        const emp = employees.find((e) => e.id === first.employeeId);
        const total = kpiTotal(list);
        const rank = isTemplate
          ? { label: 'Chưa thiết lập', color: 'text-slate-500 bg-slate-100 border-slate-200' }
          : kpiRank(total);
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

            {/* Bảng KPI (chỉ đọc — sửa qua popup) */}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {list.map((e) => {
                    const ach = kpiAchieved(e);
                    const score = kpiScore(e);
                    const autoActual = isAutoMetric(e);
                    return (
                      <tr key={e.id} className="hover:bg-rose-50/20">
                        <td className="px-3 py-2 text-slate-400 font-mono">{e.stt}</td>
                        <td className="px-3 py-2"><span className="text-slate-600">{e.groupName}</span></td>
                        <td className="px-3 py-2 max-w-[240px]"><span className="font-medium text-slate-700">{e.metric}</span></td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatKpiValue(e.targetValue, e.unit)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{e.weight}%</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">
                          <span className="inline-flex items-center gap-1 justify-end">
                            {formatKpiValue(e.actualValue, e.unit)}
                            {autoActual
                              ? <span className="material-symbols-outlined text-[13px] text-emerald-500" title="Tự cập nhật từ dữ liệu hệ thống">bolt</span>
                              : <span className="material-symbols-outlined text-[13px] text-slate-300" title={`Chỉ số nhập tay — mặc định hoàn thành 100% (đang: ${e.completionPct ?? 100}%). Sửa ở popup "Sửa KPI".`}>edit_note</span>}
                          </span>
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
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/80 font-bold text-slate-800">
                    <td colSpan={7} className="px-3 py-2.5 text-right uppercase text-[11px] tracking-wide">Tổng điểm KPI</td>
                    <td className="px-3 py-2.5 text-right text-[#D32027] tabular-nums">{total.toFixed(1)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
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

const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] bg-white';
const numCls = inputCls + ' text-right tabular-nums';
/** Hiển thị số nguyên trong ô nhập với dấu '.' ngăn cách hàng nghìn (vd 300.000.000). */
const fmtInt = (n: number) => (n || 0).toLocaleString('vi-VN');

/** Băng báo lỗi tổng trọng số ≠ 100% (hiện khi bấm Lưu). */
function WeightAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 text-[12px] text-rose-700">
      <span className="material-symbols-outlined text-[17px] text-rose-500 flex-shrink-0">error</span>
      <p className="font-medium">{message}</p>
    </div>
  );
}

/* ── Popup THIẾT LẬP KPI tháng — 1 form cho CẢ 2 thành viên, chỉ nhập Mục tiêu + Trọng số ──
   Chỉ số / nhóm / đơn vị kế thừa từ tháng trước; Thực tế tự cập nhật từ báo cáo ngày (không nhập ở đây). */
function SetupKpiModal({ period, templateSource, templateEntries, employees, onClose, onSave }: {
  period: string;
  templateSource: string;
  templateEntries: MediaKpiEntry[];
  employees: Employee[];
  onClose: () => void;
  onSave: (rows: MediaKpiEntry[]) => void;
}) {
  const [form, setForm] = useState<Record<string, { targetValue: number; weight: number }>>(() =>
    Object.fromEntries(templateEntries.map((e) => [e.id, { targetValue: e.targetValue, weight: e.weight }])));
  const [tried, setTried] = useState(false);

  const groups = useMemo(() => groupByEmployee(templateEntries), [templateEntries]);

  const setField = (id: string, key: 'targetValue' | 'weight', raw: string) => {
    const val = parseInt(raw.replace(/\D/g, ''), 10) || 0;
    setForm((f) => ({ ...f, [id]: { ...f[id], [key]: val } }));
  };

  const rows = templateEntries.map((e) => ({
    ...e,
    targetValue: form[e.id]?.targetValue ?? 0,
    weight: form[e.id]?.weight ?? 0,
  }));
  const wErr = weightError(rows);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setTried(true);
    if (wErr) return; // tổng trọng số chưa đúng 100% → không cho lưu
    onSave(rows);
  };

  const monthTxt = monthLabel(period);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="material-symbols-outlined text-[#D32027]">tune</span>Thiết lập KPI {monthTxt}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Chỉ số <b className="text-slate-600">cố định</b> kế thừa từ {monthLabel(templateSource)} · nhập <b className="text-slate-600">Mục tiêu</b> &amp; <b className="text-slate-600">Trọng số</b> cho cả 2 thành viên. Thực tế tự cập nhật từ dữ liệu. Đầu việc phát sinh (đào tạo, nhân sự…) thêm sau ở <b className="text-slate-600">“Sửa KPI”</b>.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {groups.map((list) => {
            const first = list[0];
            const emp = employees.find((e) => e.id === first.employeeId);
            const totalWeight = list.reduce((s, e) => s + (form[e.id]?.weight ?? 0), 0);
            return (
              <section key={first.employeeId} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {emp && <img src={emp.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm leading-tight truncate">{first.employeeName}</p>
                      <span className="text-[10px] font-bold text-[#D32027]">{first.roleScope === 'Leader' ? 'Leader' : 'Nhân viên'}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${totalWeight === 100 ? 'text-green-700 bg-green-50 border-green-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                    Tổng trọng số {totalWeight}%
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 uppercase tracking-wide bg-white border-b border-slate-100">
                        <th className="px-3 py-2 text-left font-bold w-8">STT</th>
                        <th className="px-3 py-2 text-left font-bold">Chỉ số</th>
                        <th className="px-3 py-2 text-right font-bold w-44">Mục tiêu</th>
                        <th className="px-3 py-2 text-right font-bold w-28">Trọng số (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {list.map((e) => (
                        <tr key={e.id}>
                          <td className="px-3 py-2 text-slate-400 font-mono align-top pt-3">{e.stt}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-700">{e.metric}</p>
                            <p className="text-[10px] text-slate-400">{e.groupName}{e.unit === 'currency' ? ' · đơn vị: đồng' : e.unit === 'percent' ? ' · đơn vị: %' : ''}</p>
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" inputMode="numeric" value={fmtInt(form[e.id]?.targetValue ?? 0)}
                              onChange={(ev) => setField(e.id, 'targetValue', ev.target.value)} className={numCls} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" inputMode="numeric" value={form[e.id]?.weight ?? 0}
                              onChange={(ev) => setField(e.id, 'weight', ev.target.value)} className={numCls} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 space-y-3">
          {tried && wErr && <WeightAlert message={wErr} />}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</button>
            <button type="submit" className="px-6 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-lg transition-colors">Lưu KPI {monthTxt}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ── Popup SỬA KPI tháng — 1 form cho CẢ 2 thành viên, sửa đầy đủ + thêm/xóa chỉ số ── */
type DraftRow = MediaKpiEntry;
const UNIT_OPTS: { v: MediaKpiEntry['unit']; label: string }[] = [
  { v: 'number', label: 'Số' }, { v: 'currency', label: 'Tiền (đ)' }, { v: 'percent', label: '%' },
];

function KpiEditModal({ period, entries, employees, onAdd, onUpdate, onDelete, onClose }: {
  period: string;
  entries: MediaKpiEntry[];
  employees: Employee[];
  onAdd: (entry: MediaKpiEntry) => void;
  onUpdate: (id: string, patch: Partial<MediaKpiEntry>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const origById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const [draft, setDraft] = useState<DraftRow[]>(() => entries.map((e) => ({ ...e })));
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());
  const [deleted, setDeleted] = useState<string[]>([]);
  const [tried, setTried] = useState(false);

  const groups = useMemo(() => groupByEmployee(draft), [draft]);
  const wErr = weightError(draft);

  const upd = (id: string, patch: Partial<MediaKpiEntry>) =>
    setDraft((d) => d.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const num = (raw: string) => parseInt(raw.replace(/\D/g, ''), 10) || 0;

  const del = (id: string) => {
    setDraft((d) => d.filter((r) => r.id !== id));
    if (origById.has(id)) setDeleted((x) => [...x, id]);
    else setNewIds((s) => { const n = new Set(s); n.delete(id); return n; });
  };

  const addRow = (sample: MediaKpiEntry) => {
    const id = `tmp_${Date.now()}_${draft.length}`;
    const stt = draft.filter((r) => r.employeeId === sample.employeeId).length + 1;
    setDraft((d) => [...d, {
      id, period, employeeId: sample.employeeId, employeeName: sample.employeeName,
      roleScope: sample.roleScope, stt, groupName: '', metric: '', targetValue: 0,
      unit: 'number', weight: 0, actualValue: 0, completionPct: 100, note: '',
    }]);
    setNewIds((s) => new Set(s).add(id));
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setTried(true);
    if (wErr) return; // tổng trọng số chưa đúng 100% → không cho lưu
    deleted.forEach((id) => onDelete(id));
    draft.forEach((row, i) => {
      if (newIds.has(row.id)) {
        onAdd({ ...row, id: `mk_${Date.now()}_${i}` });
      } else {
        const o = origById.get(row.id);
        if (o && (o.groupName !== row.groupName || o.metric !== row.metric || o.targetValue !== row.targetValue
          || o.weight !== row.weight || o.unit !== row.unit
          || (o.completionPct ?? 100) !== (row.completionPct ?? 100))) {
          onUpdate(row.id, {
            groupName: row.groupName, metric: row.metric, targetValue: row.targetValue,
            weight: row.weight, unit: row.unit, completionPct: row.completionPct ?? 100,
          });
        }
      }
    });
    onClose();
  };

  const monthTxt = monthLabel(period);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="material-symbols-outlined text-[#D32027]">edit</span>Sửa KPI {monthTxt}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sửa Nhóm · Chỉ số · Mục tiêu · Trọng số cho cả 2 thành viên. Chỉ số video / reach / doanh thu có
              <b className="text-emerald-600"> Thực tế tự cập nhật</b> từ dữ liệu. Chỉ số tự thêm (đào tạo, nhân sự…)
              <b className="text-slate-500"> mặc định hoàn thành 100%</b> — hạ ở cột <b className="text-slate-500">% Hoàn thành</b> nếu chưa đạt.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {groups.map((list) => {
            const first = list[0];
            const emp = employees.find((e) => e.id === first.employeeId);
            const totalWeight = list.reduce((s, e) => s + e.weight, 0);
            return (
              <section key={first.employeeId} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {emp && <img src={emp.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm leading-tight truncate">{first.employeeName}</p>
                      <span className="text-[10px] font-bold text-[#D32027]">{first.roleScope === 'Leader' ? 'Leader' : 'Nhân viên'}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${totalWeight === 100 ? 'text-green-700 bg-green-50 border-green-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                    Tổng trọng số {totalWeight}%
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 uppercase tracking-wide bg-white border-b border-slate-100">
                        <th className="px-2 py-2 text-left font-bold w-32">Nhóm</th>
                        <th className="px-2 py-2 text-left font-bold">Chỉ số</th>
                        <th className="px-2 py-2 text-left font-bold w-28">Đơn vị</th>
                        <th className="px-2 py-2 text-right font-bold w-40">Mục tiêu</th>
                        <th className="px-2 py-2 text-right font-bold w-24">Trọng số</th>
                        <th className="px-2 py-2 text-right font-bold w-32">% Hoàn thành</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {list.map((e) => (
                        <tr key={e.id} className="align-top">
                          <td className="px-2 py-2"><input value={e.groupName} onChange={(ev) => upd(e.id, { groupName: ev.target.value })} className={inputCls} /></td>
                          <td className="px-2 py-2"><input value={e.metric} onChange={(ev) => upd(e.id, { metric: ev.target.value })} className={inputCls} placeholder="Tên chỉ số" /></td>
                          <td className="px-2 py-2">
                            <select value={e.unit} onChange={(ev) => upd(e.id, { unit: ev.target.value as MediaKpiEntry['unit'] })} className={inputCls}>
                              {UNIT_OPTS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" value={fmtInt(e.targetValue)} onChange={(ev) => upd(e.id, { targetValue: num(ev.target.value) })} className={numCls} /></td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" value={e.weight} onChange={(ev) => upd(e.id, { weight: num(ev.target.value) })} className={numCls} /></td>
                          <td className="px-2 py-2">
                            {isAutoMetric(e) ? (
                              <div className="flex items-center justify-end gap-1 py-1.5 text-[11px] font-bold text-emerald-600" title="Thực tế tự cập nhật từ dữ liệu — không chấm tay">
                                <span className="material-symbols-outlined text-[14px]">bolt</span>Tự động
                              </div>
                            ) : (
                              <input type="text" inputMode="numeric" value={e.completionPct ?? 100}
                                onChange={(ev) => upd(e.id, { completionPct: Math.min(num(ev.target.value), 100) })}
                                className={numCls} title="Mặc định 100% — hạ xuống nếu chưa hoàn thành" />
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button type="button" onClick={() => del(e.id)} className="text-slate-300 hover:text-rose-600" title="Xóa chỉ số">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t border-slate-100">
                  <button type="button" onClick={() => addRow(first)} className="text-[11px] font-bold text-[#D32027] hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">add</span> Thêm chỉ số cho {first.employeeName}
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 space-y-3">
          {tried && wErr && <WeightAlert message={wErr} />}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</button>
            <button type="submit" className="px-6 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-lg transition-colors">Lưu thay đổi</button>
          </div>
        </div>
      </form>
    </div>
  );
}
