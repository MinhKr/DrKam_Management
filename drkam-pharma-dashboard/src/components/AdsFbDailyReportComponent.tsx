import React, { useMemo, useState } from 'react';
import { AdsFbTaskLog, AdsFbTarget, AdsFbFormType, Employee, UserSession } from '../types';
import {
  inPeriod, weekdayVi, adsFbScore, fmtMoney, fmtNum, fmtPct, fmtScore,
} from '../lib/adsFacebook';
import ConfirmDialog from './ConfirmDialog';
import { MonthPicker } from './dashboardKit';

export const ADS_FB_DEPT = 'Ads Facebook';

interface Props {
  logs: AdsFbTaskLog[];
  targets: AdsFbTarget[];
  employees: Employee[];
  session: UserSession;
  onAdd: (log: AdsFbTaskLog) => void;
  onUpdate: (id: string, patch: Partial<AdsFbTaskLog>) => void;
  onDelete: (id: string) => void;
}

const FORM_TYPES: AdsFbFormType[] = ['Chuyển đổi', 'Sỉ', 'Mess'];
const formTypeStyle = (t: AdsFbFormType) =>
  t === 'Chuyển đổi' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
  : t === 'Sỉ' ? 'text-sky-700 bg-sky-50 border-sky-200'
  : 'text-violet-700 bg-violet-50 border-violet-200';

const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const toDdmmyyyy = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const toIso = (dd: string) => { const [d, m, y] = dd.split('/'); return d ? `${y}-${m}-${d}` : ''; };
const periodOf = (dd: string) => { const [d, m, y] = dd.split('/'); return d ? `${y}-${m}` : ''; };
const monthLabel = (p: string) => `Tháng ${p.slice(5)}/${p.slice(0, 4)}`;

export default function AdsFbDailyReportComponent({ logs, targets, employees, session, onAdd, onUpdate, onDelete }: Props) {
  const staff = useMemo(() => employees
    .filter((e) => e.department === ADS_FB_DEPT && e.status === 'Hoạt động')
    .sort((a, b) => (a.role === 'Leader' ? -1 : 1) - (b.role === 'Leader' ? -1 : 1)), [employees]);

  const selfId = staff.find((s) => s.name === session.name)?.id;
  const [activeId, setActiveId] = useState(selfId ?? staff[0]?.id ?? '');
  const active = staff.find((s) => s.id === activeId) ?? staff[0];

  const isAdmin = session.role === 'Admin';
  const canEdit = !!active && (isAdmin || active.name === session.name);

  const [period, setPeriod] = useState(() => {
    const ms = [...new Set(logs.map((l) => periodOf(l.date)).filter(Boolean))].sort().reverse();
    return ms[0] ?? isoToday().slice(0, 7);
  });

  const [modal, setModal] = useState<AdsFbTaskLog | null>(null);
  const [dialog, setDialog] = useState<{ id: string; label: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Target tháng đang xem của người đang xem.
  const targetFor = (empId: string, dd: string) =>
    targets.find((t) => t.employeeId === empId && t.period === periodOf(dd)) ?? null;

  const personLogs = useMemo(() => logs.filter((l) => l.employeeId === activeId && inPeriod(l.date, period)), [logs, activeId, period]);

  const byDay = useMemo(() => {
    const map = new Map<string, AdsFbTaskLog[]>();
    personLogs.forEach((l) => { const a = map.get(l.date) ?? []; a.push(l); map.set(l.date, a); });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [personLogs]);

  // Tổng hợp tháng.
  const sum = useMemo(() => {
    const spend = personLogs.reduce((s, l) => s + l.spend, 0);
    const revenue = personLogs.reduce((s, l) => s + l.revenue, 0);
    const orders = personLogs.reduce((s, l) => s + l.orders, 0);
    const scores = personLogs.map((l) => adsFbScore(l, targetFor(l.employeeId, l.date)).total);
    const avgScore = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : null;
    return {
      spend, revenue, orders,
      roas: spend > 0 ? revenue / spend : null,
      cpa: orders > 0 ? spend / orders : null,
      avgScore,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personLogs, targets]);

  const openNew = () => setModal(blankLog(activeId, active?.name ?? '', toDdmmyyyy(isoToday())));

  return (
    <div className="space-y-4 text-slate-800">
      {/* Header + tháng */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">ads_click</span>
            <span>Báo cáo ngày — Ads Facebook</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Nhập chỉ số quảng cáo mỗi ngày — ROAS/CPA và điểm 3 trục tự tính theo cấu hình.</p>
        </div>
        <MonthPicker value={period} onChange={setPeriod} />
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
            <span className="material-symbols-outlined text-[18px]">add</span> Thêm báo cáo
          </button>
        )}
      </div>

      {/* Tóm tắt tháng */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SumBox label="Tổng chi tiêu" value={fmtMoney(sum.spend)} unit="đ" accent="text-rose-600" />
        <SumBox label="Tổng doanh thu" value={fmtMoney(sum.revenue)} unit="đ" accent="text-emerald-600" />
        <SumBox label="ROAS chung" value={fmtNum(sum.roas)} accent="text-sky-600" />
        <SumBox label="CPA chung" value={fmtMoney(sum.cpa)} unit="đ" accent="text-amber-600" />
        <SumBox label="Điểm TB tháng" value={fmtScore(sum.avgScore)} accent="text-[#D32027]" />
      </div>

      {!canEdit && (
        <div className="text-[11px] text-slate-400 italic px-1">Bạn chỉ xem báo cáo của {active?.name}. Đăng nhập đúng nick để chỉnh sửa.</div>
      )}

      {/* Báo cáo theo ngày — mỗi báo cáo là 1 dòng tóm tắt, bấm để mở chi tiết xuống dưới */}
      <div className="space-y-3">
        {byDay.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/70 soft-shadow py-10 text-center text-slate-400">
            Chưa có báo cáo trong {monthLabel(period).toLowerCase()}.
          </div>
        ) : byDay.map(([day, items]) => (
          <div key={day} className="rounded-xl border border-slate-200/70 bg-white soft-shadow overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-3 border-l-4 border-l-[#D32027] border-b border-slate-200/60">
              <span className="font-bold text-slate-800 text-sm">{weekdayVi(day)}</span>
              <span className="font-mono text-[12px] text-slate-500">{day}</span>
              <span className="ml-auto text-[11px] text-slate-400">{items.length} báo cáo</span>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((l) => {
                const sc = adsFbScore(l, targetFor(l.employeeId, l.date));
                const open = expanded.has(l.id);
                return (
                  <div key={l.id}>
                    {/* Dòng tóm tắt */}
                    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50/30 cursor-pointer" onClick={() => toggle(l.id)}>
                      <span className={`material-symbols-outlined text-[18px] text-slate-300 transition-transform ${open ? 'rotate-90' : ''}`}>chevron_right</span>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg border whitespace-nowrap ${formTypeStyle(l.formType)}`}>{l.formType}</span>
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs min-w-0">
                        <Stat label="Chi tiêu" value={fmtMoney(l.spend)} />
                        <Stat label="Doanh thu" value={fmtMoney(l.revenue)} />
                        <Stat label="Đơn" value={String(l.orders)} />
                        <Stat label="ROAS" value={fmtNum(sc.kpis.roas)} accent="text-sky-700" />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-center">
                          <div className="text-[10px] font-bold uppercase text-slate-400 leading-tight">Tổng</div>
                          <div className="text-lg font-extrabold text-[#D32027] tabular-nums leading-tight">{fmtScore(sc.total)}</div>
                        </div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${sc.rank.color}`}>{sc.rank.label}</span>
                      </div>
                      {canEdit && (
                        <div className="flex-shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setModal(l)} className="text-slate-300 hover:text-[#D32027] transition-colors" title="Sửa">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => setDialog({ id: l.id, label: `${l.formType} ${day}` })} className="text-slate-300 hover:text-rose-600 transition-colors ml-1" title="Xóa">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Chi tiết mở rộng */}
                    {open && (
                      <div className="px-4 pb-4 pt-1 bg-slate-50/50 space-y-4">
                        <DetailSection title="Kết quả">
                          <Pair label="Tổng chi tiêu" value={fmtMoney(l.spend) + ' đ'} />
                          <Pair label="Doanh thu" value={fmtMoney(l.revenue) + ' đ'} />
                          <Pair label="Số đơn" value={String(l.orders)} />
                          <Pair label="Số data" value={String(l.dataCount)} />
                          <Pair label="Số tin nhắn" value={String(l.messages)} />
                        </DetailSection>
                        <DetailSection title="Chỉ số quảng cáo">
                          <Pair label="Impressions" value={l.impressions.toLocaleString('vi-VN')} />
                          <Pair label="Clicks" value={l.clicks.toLocaleString('vi-VN')} />
                          <Pair label="Add to cart" value={String(l.addToCart)} />
                          <Pair label="Camp đang chạy" value={String(l.campsRunning)} />
                          <Pair label="Camp test mới" value={String(l.campsTest)} />
                          <Pair label="Content test mới" value={String(l.contentTest)} />
                          <Pair label="Số hành động tối ưu" value={String(l.optimizeActions)} />
                          <Pair label="Đánh giá TP" value={l.tpRating ? `${l.tpRating} ★` : '—'} />
                        </DetailSection>
                        <DetailSection title="KPI tự tính" color="text-sky-600">
                          <Pair label="ROAS" value={fmtNum(sc.kpis.roas)} />
                          <Pair label="ROI" value={fmtPct(sc.kpis.roi)} />
                          <Pair label="CPA" value={fmtMoney(sc.kpis.cpa) + ' đ'} />
                          <Pair label="Giá 1 data" value={fmtMoney(sc.kpis.cpData) + ' đ'} />
                          <Pair label="CTR" value={fmtPct(sc.kpis.ctr)} />
                          <Pair label="CPM" value={fmtMoney(sc.kpis.cpm) + ' đ'} />
                          <Pair label="CR đơn/click" value={fmtPct(sc.kpis.crOrderClick)} />
                          <Pair label="Tỷ lệ ATC" value={fmtPct(sc.kpis.atcRate)} />
                          <Pair label="CP/tin nhắn" value={fmtMoney(sc.kpis.cpMessage) + ' đ'} />
                          <Pair label="Tỷ lệ chốt mess" value={fmtPct(sc.kpis.closeMessRate)} />
                          <Pair label="AOV" value={fmtMoney(sc.kpis.aov) + ' đ'} />
                        </DetailSection>
                        <DetailSection title="Điểm & xếp loại" color="text-[#D32027]">
                          <Pair label="% đạt DT" value={fmtPct(sc.pct.revenue)} />
                          <Pair label="% đạt đơn" value={fmtPct(sc.pct.orders)} />
                          <Pair label="% ngân sách" value={fmtPct(sc.pct.budget)} />
                          <Pair label="Trục A (ads)" value={fmtScore(sc.axisA)} />
                          <Pair label="Trục B (tối ưu)" value={fmtScore(sc.axisB)} />
                          <Pair label="Trục C (target)" value={fmtScore(sc.axisC)} />
                          <Pair label="Điểm tổng" value={fmtScore(sc.total)} strong />
                          <Pair label="Xếp loại" value={sc.rank.label} strong />
                        </DetailSection>
                        {l.note && (
                          <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <span className="font-bold text-slate-500">Ghi chú tối ưu: </span>{l.note}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {modal && active && (
        <AdsFbLogModal
          log={modal}
          personName={active.name}
          hasTarget={!!targetFor(activeId, modal.date)}
          onClose={() => setModal(null)}
          onSubmit={(l) => {
            if (l.id) onUpdate(l.id, l);
            else { onAdd({ ...l, id: 'afb_' + Date.now() }); setPeriod(periodOf(l.date) || period); }
            setModal(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!dialog}
        title="Xóa báo cáo"
        message={`Xóa báo cáo "${dialog?.label}"?`}
        confirmText="Xóa"
        onConfirm={() => { if (dialog) onDelete(dialog.id); setDialog(null); }}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

function SumBox({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow p-3">
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-extrabold tabular-nums leading-tight mt-1 ${accent}`}>
        {value}{unit && value !== '—' && <span className="text-[11px] font-bold text-slate-400 ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

/* Ô nhập số — component cấp module (KHÔNG đặt trong modal, tránh mất focus khi gõ). */
function NumField({ label, hint, value, onChange }: {
  label: string; hint?: string; value: number; onChange: (v: number) => void;
}) {
  const cls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] bg-white';
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}{hint && <span className="text-slate-300 normal-case font-medium"> {hint}</span>}</span>
      <input type="text" inputMode="numeric" value={value ? value.toLocaleString('vi-VN') : ''}
        onChange={(e) => onChange(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
        className={`${cls} text-right tabular-nums`} placeholder="0" />
    </label>
  );
}

/* Chỉ số nhỏ trên dòng tóm tắt: nhãn trên, giá trị dưới. */
function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 leading-tight whitespace-nowrap">{label}</div>
      <div className={`text-sm tabular-nums font-semibold truncate ${accent ?? 'text-slate-700'}`}>{value}</div>
    </div>
  );
}

/* Cặp nhãn — giá trị (đường chấm nối) trong phần chi tiết mở rộng. */
function Pair({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-slate-500 whitespace-nowrap">{label}</span>
      <span className="flex-1 border-b border-dotted border-slate-300 self-end mb-1" />
      <span className={`tabular-nums whitespace-nowrap ${strong ? 'font-extrabold text-[#D32027]' : 'font-semibold text-slate-800'}`}>{value}</span>
    </div>
  );
}

/* Nhóm chi tiết: tiêu đề màu + lưới cặp nhãn-giá trị đi xuống. */
function DetailSection({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className={`text-[13px] font-bold uppercase tracking-wide ${color ?? 'text-slate-400'}`}>{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2.5">{children}</div>
    </div>
  );
}

function blankLog(employeeId: string, employeeName: string, date: string): AdsFbTaskLog {
  return {
    id: '', date, employeeId, employeeName, formType: 'Chuyển đổi',
    spend: 0, revenue: 0, orders: 0, dataCount: 0, messages: 0,
    impressions: 0, clicks: 0, addToCart: 0,
    campsRunning: 0, campsTest: 0, contentTest: 0, optimizeActions: 0,
    tpRating: null, note: '',
  };
}

/* ── Popup nhập/sửa báo cáo ngày ── */
function AdsFbLogModal({ log, personName, hasTarget, onClose, onSubmit }: {
  log: AdsFbTaskLog;
  personName: string;
  hasTarget: boolean;
  onClose: () => void;
  onSubmit: (l: AdsFbTaskLog) => void;
}) {
  const [f, setF] = useState<AdsFbTaskLog>(log);
  const set = (patch: Partial<AdsFbTaskLog>) => setF((p) => ({ ...p, ...patch }));
  const fromIso = (iso: string) => { const [y, m, d] = iso.split('-'); return d ? `${d}/${m}/${y}` : ''; };

  // Xem trước điểm (không có target thì Trục C = 0).
  const preview = adsFbScore(f, null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...f, employeeName: personName });
  };
  const cls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] bg-white';
  const numOf = (k: keyof AdsFbTaskLog) => ({
    value: f[k] as number,
    onChange: (v: number) => set({ [k]: v } as Partial<AdsFbTaskLog>),
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">{f.id ? 'Sửa báo cáo Ads' : 'Báo cáo Ads ngày'}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Nhân sự: <b className="text-slate-600">{personName}</b></p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Ngày + hình thức */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ngày</span>
              <input type="date" value={toIso(f.date)} onChange={(e) => set({ date: fromIso(e.target.value) })} className={cls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Hình thức</span>
              <select value={f.formType} onChange={(e) => set({ formType: e.target.value as AdsFbFormType })} className={cls}>
                {FORM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>

          {/* Kết quả */}
          <fieldset className="border border-slate-200 rounded-xl p-4">
            <legend className="text-[11px] font-bold text-slate-500 uppercase tracking-wide px-2">Kết quả</legend>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <NumField label="Tổng chi tiêu" hint="(đ)" {...numOf('spend')} />
              <NumField label="Doanh thu" hint="(đ)" {...numOf('revenue')} />
              <NumField label="Số đơn" {...numOf('orders')} />
              <NumField label="Số data" {...numOf('dataCount')} />
              <NumField label="Số tin nhắn" {...numOf('messages')} />
            </div>
          </fieldset>

          {/* Chỉ số quảng cáo */}
          <fieldset className="border border-slate-200 rounded-xl p-4">
            <legend className="text-[11px] font-bold text-slate-500 uppercase tracking-wide px-2">Chỉ số quảng cáo</legend>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <NumField label="Impressions" {...numOf('impressions')} />
              <NumField label="Clicks" {...numOf('clicks')} />
              <NumField label="Add to cart" {...numOf('addToCart')} />
            </div>
          </fieldset>

          {/* Tối ưu */}
          <fieldset className="border border-slate-200 rounded-xl p-4">
            <legend className="text-[11px] font-bold text-slate-500 uppercase tracking-wide px-2">Tối ưu (Trục B)</legend>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <NumField label="Camp đang chạy" {...numOf('campsRunning')} />
              <NumField label="Camp test mới" {...numOf('campsTest')} />
              <NumField label="Content test mới" {...numOf('contentTest')} />
              <NumField label="Số hành động tối ưu" {...numOf('optimizeActions')} />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Đánh giá TP</span>
                <select value={f.tpRating ?? ''} onChange={(e) => set({ tpRating: e.target.value ? parseInt(e.target.value, 10) : null })} className={cls}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} ★</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ghi chú tối ưu</span>
            <textarea value={f.note ?? ''} onChange={(e) => set({ note: e.target.value })} rows={2}
              className={`${cls} resize-y leading-relaxed`} placeholder="vd Scale camp tốt, tắt camp đắt..." />
          </label>

          {/* Xem trước điểm */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wide">Xem trước:</span>
            <span>ROAS <b className="text-sky-700">{fmtNum(preview.kpis.roas)}</b></span>
            <span>CPA <b>{fmtMoney(preview.kpis.cpa)}</b></span>
            <span>Trục A <b>{fmtScore(preview.axisA)}</b></span>
            <span>Trục B <b>{fmtScore(preview.axisB)}</b></span>
            <span className="text-slate-400">Trục C {hasTarget ? '(có target)' : '= 0 (chưa có target tháng)'}</span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</button>
          <button type="submit" className="px-6 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-lg transition-colors">Lưu báo cáo</button>
        </div>
      </form>
    </div>
  );
}
