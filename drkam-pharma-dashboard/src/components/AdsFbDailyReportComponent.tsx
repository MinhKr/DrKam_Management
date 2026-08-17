import React, { useMemo, useState } from 'react';
import { AdsFbTaskLog, AdsFbTarget, AdsFbFormType, Employee, UserSession } from '../types';
import {
  inPeriod, weekdayVi, adsFbScore, fmtMoney, fmtNum, fmtPct, fmtScore,
  fmtCriterionValue, AdsFbCriterion, adsFbContentCheck, parseContentLinks, isHttpLink,
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

/* ── Lọc theo KHOẢNG NGÀY ──────────────────────────────────────
   Ngày lưu dạng dd/mm/yyyy nên quy về ISO yyyy-mm-dd rồi so sánh chuỗi. */
type ViewMode = 'month' | 'range';
const monthStartIso = (p: string) => `${p}-01`;
const monthEndIso = (p: string) => {
  const [y, m] = p.split('-').map(Number);
  return `${p}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`; // ngày 0 tháng sau = ngày cuối tháng này
};

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

  // Xem theo THÁNG (mặc định) hoặc theo KHOẢNG NGÀY tự chọn.
  const [mode, setMode] = useState<ViewMode>('month');
  const [rangeFrom, setRangeFrom] = useState(() => monthStartIso(period));
  const [rangeTo, setRangeTo] = useState(isoToday);
  // Chọn ngược (từ > đến) vẫn hiểu đúng — đảo lại khi lọc.
  const [lo, hi] = rangeFrom <= rangeTo ? [rangeFrom, rangeTo] : [rangeTo, rangeFrom];

  const switchMode = (m: ViewMode) => {
    // Sang khoảng ngày: mặc định lấy trọn tháng đang xem, chặn ở hôm nay.
    if (m === 'range' && mode === 'month') {
      const today = isoToday();
      setRangeFrom(monthStartIso(period));
      setRangeTo(monthEndIso(period) > today ? today : monthEndIso(period));
    }
    setMode(m);
  };

  const inView = (dd: string) => {
    if (mode === 'month') return inPeriod(dd, period);
    const iso = toIso(dd);
    return !!iso && iso >= lo && iso <= hi;
  };
  const viewLabel = mode === 'month'
    ? monthLabel(period).toLowerCase()
    : `khoảng ${toDdmmyyyy(lo)} – ${toDdmmyyyy(hi)}`;

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

  const personLogs = useMemo(
    () => logs.filter((l) => l.employeeId === activeId && inView(l.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logs, activeId, mode, period, lo, hi],
  );

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
          <p className="text-[11px] text-slate-400 mt-0.5">
            Nhập chỉ số quảng cáo mỗi ngày — ROI/CPA và điểm 5 chỉ tiêu (Doanh thu 40% · ROI 30% · CPA 10% · Tỷ lệ chốt 10% · Content mới 10%) tự tính.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {([['month', 'Theo tháng'], ['range', 'Khoảng ngày']] as [ViewMode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === m ? 'bg-white text-[#D32027] soft-shadow' : 'text-slate-500 hover:text-slate-700'
                }`}>{label}</button>
            ))}
          </div>
          {mode === 'month' ? (
            <MonthPicker value={period} onChange={setPeriod} />
          ) : (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 soft-shadow">
              <span className="material-symbols-outlined text-[18px] text-[#D32027]">date_range</span>
              <input type="date" value={rangeFrom} max={isoToday()} onChange={(e) => setRangeFrom(e.target.value)}
                className="text-sm font-semibold border-none outline-none bg-transparent text-slate-700" />
              <span className="text-slate-400 font-bold">–</span>
              <input type="date" value={rangeTo} max={isoToday()} onChange={(e) => setRangeTo(e.target.value)}
                className="text-sm font-semibold border-none outline-none bg-transparent text-slate-700" />
            </div>
          )}
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
        <SumBox label={mode === 'month' ? 'Điểm TB tháng' : 'Điểm TB khoảng'} value={fmtScore(sum.avgScore)} accent="text-[#D32027]" />
      </div>

      {!canEdit && (
        <div className="text-[11px] text-slate-400 italic px-1">Bạn chỉ xem báo cáo của {active?.name}. Đăng nhập đúng nick để chỉnh sửa.</div>
      )}

      {/* Báo cáo theo ngày — mỗi báo cáo là 1 dòng tóm tắt, bấm để mở chi tiết xuống dưới */}
      <div className="space-y-3">
        {byDay.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/70 soft-shadow py-10 text-center text-slate-400">
            Chưa có báo cáo trong {viewLabel}.
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
                        {adsFbContentCheck(l).mismatch && (
                          <span className="material-symbols-outlined text-[17px] text-amber-500"
                            title={`Content mới khai ${l.contentTest} nhưng có ${adsFbContentCheck(l).count} link`}>link_off</span>
                        )}
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
                        <ContentLinksBlock check={adsFbContentCheck(l)} />
                        <DetailSection title="KPI tự tính" color="text-sky-600">
                          <Pair label="ROAS" value={fmtNum(sc.kpis.roas)} />
                          <Pair label="ROI (DT/Chi)" value={fmtPct(sc.kpis.roi)} />
                          <Pair label="CPA" value={fmtMoney(sc.kpis.cpa) + ' đ'} />
                          <Pair label="Giá 1 data" value={fmtMoney(sc.kpis.cpData) + ' đ'} />
                          <Pair label="CTR" value={fmtPct(sc.kpis.ctr)} />
                          <Pair label="CPM" value={fmtMoney(sc.kpis.cpm) + ' đ'} />
                          <Pair label="CR đơn/click" value={fmtPct(sc.kpis.crOrderClick)} />
                          <Pair label="Tỷ lệ ATC" value={fmtPct(sc.kpis.atcRate)} />
                          <Pair label="CP/tin nhắn" value={fmtMoney(sc.kpis.cpMessage) + ' đ'} />
                          <Pair label="Tỷ lệ chốt mess" value={fmtPct(sc.kpis.closeMessRate)} />
                          <Pair label="Tỷ lệ chốt data→đơn" value={fmtPct(sc.kpis.closeDataRate)} />
                          <Pair label="AOV" value={fmtMoney(sc.kpis.aov) + ' đ'} />
                        </DetailSection>
                        <div className="space-y-2.5">
                          <div className="text-[13px] font-bold uppercase tracking-wide text-[#D32027]">Điểm &amp; xếp loại</div>
                          <ScoreBreakdown criteria={sc.criteria} total={sc.total} rank={sc.rank} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2.5">
                            <Pair label="% đạt đơn (theo dõi)" value={fmtPct(sc.pct.orders)} />
                            <Pair label="% ngân sách (theo dõi)" value={fmtPct(sc.pct.budget)} />
                          </div>
                        </div>
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
          targetOf={(dd) => targetFor(activeId, dd)}
          onClose={() => setModal(null)}
          onSubmit={(l) => {
            if (l.id) onUpdate(l.id, l);
            else {
              onAdd({ ...l, id: 'afb_' + Date.now() });
              // Kéo bộ lọc về đúng ngày vừa nhập để báo cáo mới không bị ẩn.
              if (mode === 'month') setPeriod(periodOf(l.date) || period);
              else {
                const iso = toIso(l.date);
                if (iso && iso < lo) setRangeFrom(iso);
                if (iso && iso > hi) setRangeTo(iso);
              }
            }
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

/* Danh sách link content mới + cảnh báo khi số khai không khớp số link. */
function ContentLinksBlock({ check }: { check: ReturnType<typeof adsFbContentCheck> }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-bold uppercase tracking-wide text-slate-400">Content mới</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600">
          khai {check.declared} · {check.count} link
        </span>
        {check.mismatch && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">link_off</span>
            Lệch {Math.abs(check.declared - check.count)} so với số link
          </span>
        )}
      </div>
      {check.links.length === 0 ? (
        <div className="text-xs text-slate-400 italic">Chưa dán link content nào.</div>
      ) : (
        <ul className="flex flex-col gap-1">
          {check.links.map((link, i) => (
            <li key={i} className="flex items-baseline gap-2 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400 tabular-nums shrink-0">{i + 1}.</span>
              {isHttpLink(link) ? (
                <a href={link} target="_blank" rel="noopener noreferrer"
                  className="text-sky-700 hover:underline break-all">{link}</a>
              ) : (
                <span className="text-slate-600 break-all">{link}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Bảng phân tích điểm 5 chỉ tiêu: thực tế · mốc · điểm mục · trọng số · quy đổi. */
const scoreTone = (s: number) =>
  s >= 100 ? 'text-emerald-600' : s >= 70 ? 'text-slate-700' : s > 0 ? 'text-amber-600' : 'text-rose-600';

function ScoreBreakdown({ criteria, total, rank }: {
  criteria: AdsFbCriterion[];
  total: number;
  rank: { label: string; color: string };
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[560px]">
        <thead>
          <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <th className="text-left px-3 py-2">Chỉ tiêu</th>
            <th className="text-right px-3 py-2">Thực tế</th>
            <th className="text-right px-3 py-2">Mốc 100đ</th>
            <th className="text-right px-3 py-2">Điểm mục</th>
            <th className="text-right px-3 py-2">Trọng số</th>
            <th className="text-right px-3 py-2">Quy đổi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {criteria.map((c) => (
            <tr key={c.key}>
              <td className="px-3 py-2 font-semibold text-slate-700">
                {c.label}
                {c.note && <span className="text-[10px] font-medium text-amber-600 ml-1">({c.note})</span>}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700">{fmtCriterionValue(c.key, c.value)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-400">{fmtCriterionValue(c.key, c.benchmark)}</td>
              <td className={`px-3 py-2 text-right tabular-nums font-semibold ${scoreTone(c.score)}`}>{fmtScore(c.score)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-400">{c.weight}%</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-800">{fmtNum(c.points, 1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50/70 border-t border-slate-200">
            <td className="px-3 py-2 font-bold text-slate-700" colSpan={4}>Điểm tổng</td>
            <td className="px-3 py-2 text-right">
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${rank.color}`}>{rank.label}</span>
            </td>
            <td className="px-3 py-2 text-right text-base font-extrabold text-[#D32027] tabular-nums">{fmtScore(total)}</td>
          </tr>
        </tfoot>
      </table>
      </div>
      <p className="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-100">
        4 mục đầu không chặn trần — vượt mốc được thưởng điểm; riêng Content mới tối đa 100.
        Xếp loại: &gt;120 Xuất sắc · 100–120 Tốt · 80–99 Đạt · &lt;80 Chưa đạt.
      </p>
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
    tpRating: null, contentLinks: '', note: '',
  };
}

/* ── Popup nhập/sửa báo cáo ngày ── */
function AdsFbLogModal({ log, personName, targetOf, onClose, onSubmit }: {
  log: AdsFbTaskLog;
  personName: string;
  targetOf: (date: string) => AdsFbTarget | null;
  onClose: () => void;
  onSubmit: (l: AdsFbTaskLog) => void;
}) {
  const [f, setF] = useState<AdsFbTaskLog>(log);
  const set = (patch: Partial<AdsFbTaskLog>) => setF((p) => ({ ...p, ...patch }));
  const fromIso = (iso: string) => { const [y, m, d] = iso.split('-'); return d ? `${d}/${m}/${y}` : ''; };

  // Xem trước điểm theo target tháng của chính ngày đang nhập (chưa đặt KPI → mục Doanh thu 0đ).
  const target = targetOf(f.date);
  const preview = adsFbScore(f, target);

  // Ô "Content mới" tự khớp số link dán vào, TRỪ KHI người nhập tự sửa số
  // (content không có link) — lúc đó ngừng tự khớp và hiện cảnh báo lệch.
  const linkCount = parseContentLinks(f.contentLinks).length;
  const [countManual, setCountManual] = useState(() => log.contentTest !== parseContentLinks(log.contentLinks).length);
  const contentMismatch = f.contentTest !== linkCount;
  const setLinks = (raw: string) => {
    const n = parseContentLinks(raw).length;
    setF((p) => ({ ...p, contentLinks: raw, ...(countManual ? {} : { contentTest: n }) }));
  };

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
            <legend className="text-[11px] font-bold text-slate-500 uppercase tracking-wide px-2">Tối ưu &amp; content</legend>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <NumField label="Camp đang chạy" {...numOf('campsRunning')} />
              <NumField label="Camp test mới" {...numOf('campsTest')} />
              <NumField label="Content mới" hint="(mốc ≥2/ngày)" value={f.contentTest}
                onChange={(v) => { setCountManual(true); set({ contentTest: v }); }} />
              <NumField label="Số hành động tối ưu" {...numOf('optimizeActions')} />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Đánh giá TP</span>
                <select value={f.tpRating ?? ''} onChange={(e) => set({ tpRating: e.target.value ? parseInt(e.target.value, 10) : null })} className={cls}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} ★</option>)}
                </select>
              </label>
            </div>

            {/* Link content mới — mỗi dòng 1 link; ô số ở trên tự khớp số link. */}
            <label className="flex flex-col gap-1 mt-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Link content mới <span className="text-slate-300 normal-case font-medium">(mỗi dòng 1 link)</span>
              </span>
              <textarea value={f.contentLinks ?? ''} onChange={(e) => setLinks(e.target.value)} rows={3}
                className={`${cls} resize-y leading-relaxed font-mono text-[12px]`}
                placeholder={'https://facebook.com/...\nhttps://drive.google.com/...'} />
            </label>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
              <span className="text-slate-500">Đếm được <b className="text-slate-700">{linkCount}</b> link</span>
              {contentMismatch ? (
                <>
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">link_off</span>
                    Ô "Content mới" ghi {f.contentTest} — lệch so với số link
                  </span>
                  <button type="button" onClick={() => { setCountManual(false); set({ contentTest: linkCount }); }}
                    className="font-bold text-[#D32027] hover:underline">Khớp lại theo link</button>
                </>
              ) : (
                <span className="text-slate-400">Ô "Content mới" đang tự khớp số link.</span>
              )}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ghi chú tối ưu</span>
            <textarea value={f.note ?? ''} onChange={(e) => set({ note: e.target.value })} rows={2}
              className={`${cls} resize-y leading-relaxed`} placeholder="vd Scale camp tốt, tắt camp đắt..." />
          </label>

          {/* Xem trước điểm */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wide">Xem trước:</span>
              <span>ROI <b className="text-sky-700">{fmtNum(preview.kpis.roi)}</b></span>
              <span>CPA <b>{fmtMoney(preview.kpis.cpa)}</b></span>
              <span>Chốt data→đơn <b>{fmtPct(preview.kpis.closeDataRate)}</b></span>
              {!target && <span className="text-amber-600">Chưa đặt KPI tháng → mục Doanh thu (50%) tính 0 điểm</span>}
            </div>
            <ScoreBreakdown criteria={preview.criteria} total={preview.total} rank={preview.rank} />
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
