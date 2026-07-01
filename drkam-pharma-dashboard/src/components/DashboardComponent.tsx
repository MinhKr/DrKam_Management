import React, { useState } from 'react';
import { DailyReport, AffiliateChannel, Employee, ChecklistItem, UserSession } from '../types';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts';
import { dailySeries } from '../lib/analytics';
import ContentChecklistComponent from './ContentChecklistComponent';

interface DashboardComponentProps {
  reports: DailyReport[];
  channels: AffiliateChannel[];
  employees: Employee[];
  checklists: ChecklistItem[];
  session: UserSession;
  currentUserId: string | null;
  onNavigateToTab: (tabId: string) => void;
  onAddChecklistItem: (item: ChecklistItem) => void;
  onUpdateChecklistItem: (id: string, patch: { label?: string; quantity?: number }) => void;
  onDeleteChecklistItem: (id: string) => void;
}

// ── Chỉ tiêu doanh số THÁNG theo kênh (copy tháng 6 theo ảnh — sửa tự do ở đây) ──
const CHANNEL_TARGETS: Record<string, number> = {
  'DrKam VN Official': 10_008_000,
  'KOC - Happy Daily': 50_000_000,
  'KOC - Nhà của CamCam': 20_000_000,
  'KOC - Gia đình MinhHee': 10_000_000,
  'KOC - Bảo Châu': 20_000_000,
  'FB AI - duocsikhanh': 70_000_000,
  'FB AI - conghaing': 70_000_000,
  'FB AI - ynni1809': 50_000_000,
};
const CATEGORY_TARGET_OVERRIDE: Record<string, number> = { 'tt-ai': 30_000_000 };

type CatKey = 'tt-brand' | 'tt-real' | 'tt-ai' | 'fb-ai' | 'fb-brand' | 'other';
const CATEGORIES: { key: CatKey; label: string; color: string }[] = [
  { key: 'tt-brand', label: 'TikTok — Thương hiệu', color: '#0F172A' },
  { key: 'tt-real', label: 'TikTok — KOC người thật', color: '#D32027' },
  { key: 'tt-ai', label: 'TikTok — KOC AI', color: '#7C3AED' },
  { key: 'fb-ai', label: 'Facebook AI (Shopee)', color: '#2563EB' },
  { key: 'fb-brand', label: 'Facebook — Thương hiệu', color: '#0891B2' },
  { key: 'other', label: 'Khác', color: '#64748B' },
];

const vnd = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v)) + ' đ';
const vndShort = (v: number) => {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace('.0', '') + ' tỷ';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.0', '') + ' tr';
  if (v >= 1_000) return Math.round(v / 1_000) + 'K';
  return String(Math.round(v));
};
const pct = (actual: number, target: number) => (target > 0 ? Math.round((actual / target) * 1000) / 10 : null);
const pctColor = (p: number | null) =>
  p == null ? 'text-slate-400 bg-slate-50'
    : p >= 100 ? 'text-green-700 bg-green-50'
    : p >= 70 ? 'text-amber-700 bg-amber-50'
    : 'text-rose-700 bg-rose-50';

const nowMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const lastDayOfMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const toDdmmyyyy = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const WEEK_BOUNDS = [7, 14, 21, 99];
const weekIndex = (dayOfMonth: number) => WEEK_BOUNDS.findIndex((b) => dayOfMonth <= b);

// Loại kênh (nền tảng + Brand/KOC/AI) theo meta kênh.
function catKeyOf(r: DailyReport, chMeta: Map<string, AffiliateChannel>): CatKey {
  const ch = chMeta.get(r.channelName);
  const plat = ch?.platform;
  const type = ch?.channelType;
  if (plat === 'TikTok') return type === 'Brand' ? 'tt-brand' : type === 'AI KOC' ? 'tt-ai' : type === 'Real KOC' ? 'tt-real' : 'other';
  if (plat === 'Facebook') return type === 'Brand' ? 'fb-brand' : 'fb-ai';
  if (r.channelType.startsWith('TikTok')) return r.channelType.includes('Thương hiệu') ? 'tt-brand' : 'tt-real';
  if (r.channelType.startsWith('Facebook')) return r.channelType.includes('Thương hiệu') ? 'fb-brand' : 'fb-ai';
  return 'other';
}

/* ════════════════════════════════════════════════════════════════
   CONTAINER — Tổng quan có 3 tab con
   ════════════════════════════════════════════════════════════════ */
export default function DashboardComponent(props: DashboardComponentProps) {
  const [view, setView] = useState<'chung' | 'doanhso' | 'checklist'>('chung');
  const TABS: { key: typeof view; label: string; icon: string }[] = [
    { key: 'chung', label: 'Báo cáo chung', icon: 'monitoring' },
    { key: 'doanhso', label: 'Doanh số', icon: 'storefront' },
    { key: 'checklist', label: 'Checklist', icon: 'checklist' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-4 text-slate-800">
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
          <span className="material-symbols-outlined text-[#D32027] text-2xl">dashboard</span>
          <span>Tổng quan — Team Content DrKam</span>
        </h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Tất cả báo cáo ở một nơi — chuyển tab để xem/chụp từng phần.</p>
      </div>

      {/* Tab con */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 soft-shadow self-start">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              view === t.key ? 'bg-[#D32027] text-white shadow-soft' : 'text-slate-500 hover:bg-slate-50'
            }`}>
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'chung' && <BaoCaoChung reports={props.reports} channels={props.channels} onGotoView={setView} />}
      {view === 'doanhso' && <DoanhSoNgay reports={props.reports} channels={props.channels} />}
      {view === 'checklist' && (
        <ContentChecklistComponent
          readOnly
          checklists={props.checklists}
          employees={props.employees}
          session={props.session}
          currentUserId={props.currentUserId}
          onAddItem={props.onAddChecklistItem}
          onUpdateItem={props.onUpdateChecklistItem}
          onDeleteItem={props.onDeleteChecklistItem}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 1 — BÁO CÁO CHUNG (tháng: KPI + biểu đồ + bảng kênh × tuần)
   ════════════════════════════════════════════════════════════════ */
function BaoCaoChung({ reports, channels, onGotoView }: {
  reports: DailyReport[];
  channels: AffiliateChannel[];
  onGotoView: (v: 'doanhso') => void;
}) {
  const [monthKey, setMonthKey] = useState(nowMonthKey);
  const [y, m] = monthKey.split('-').map(Number);
  const isCurrentMonth = monthKey === nowMonthKey();
  const monthFromIso = `${monthKey}-01`;
  const monthToIso = `${monthKey}-${String(lastDayOfMonth(monthKey)).padStart(2, '0')}`;

  const chMeta = new Map(channels.map((c) => [c.name, c]));
  const monthReports = reports.filter((r) => {
    const [dd, mm, yy] = r.date.split('/');
    return `${yy}-${mm}` === monthKey && dd;
  });

  type Row = { name: string; cat: CatKey; weeks: number[]; total: number; target: number };
  const rowMap = new Map<string, Row>();
  monthReports.forEach((r) => {
    const day = Number(r.date.split('/')[0]);
    const wi = weekIndex(day);
    let row = rowMap.get(r.channelName);
    if (!row) {
      row = { name: r.channelName, cat: catKeyOf(r, chMeta), weeks: [0, 0, 0, 0], total: 0, target: CHANNEL_TARGETS[r.channelName] ?? 0 };
      rowMap.set(r.channelName, row);
    }
    row.weeks[wi] += r.revenue;
    row.total += r.revenue;
  });

  const grouped = CATEGORIES.map((c) => {
    const rows = [...rowMap.values()].filter((r) => r.cat === c.key).sort((a, b) => b.total - a.total);
    const subWeeks = [0, 1, 2, 3].map((i) => rows.reduce((s, r) => s + r.weeks[i], 0));
    const subTotal = rows.reduce((s, r) => s + r.total, 0);
    const subTarget = rows.reduce((s, r) => s + r.target, 0) || (CATEGORY_TARGET_OVERRIDE[c.key] ?? 0);
    return { ...c, rows, subWeeks, subTotal, subTarget };
  }).filter((g) => g.rows.length > 0);

  const grandTotal = grouped.reduce((s, g) => s + g.subTotal, 0);
  const grandTarget = grouped.reduce((s, g) => s + g.subTarget, 0);
  const grandWeeks = [0, 1, 2, 3].map((i) => grouped.reduce((s, g) => s + g.subWeeks[i], 0));

  const revTikTok = monthReports.filter((r) => catKeyOf(r, chMeta).startsWith('tt')).reduce((s, r) => s + r.revenue, 0);
  const revFacebook = monthReports.filter((r) => catKeyOf(r, chMeta).startsWith('fb')).reduce((s, r) => s + r.revenue, 0);

  const prevKey = shiftMonth(monthKey, -1);
  const prevTotal = reports.filter((r) => { const [, mm, yy] = r.date.split('/'); return `${yy}-${mm}` === prevKey; }).reduce((s, r) => s + r.revenue, 0);
  const delta = prevTotal ? Math.round(((grandTotal - prevTotal) / prevTotal) * 1000) / 10 : null;

  const series = dailySeries(monthReports, monthFromIso, monthToIso);
  const catBar = grouped.map((g) => ({ label: g.label, value: g.subTotal, color: g.color }));
  const weekLabel = (i: number) => {
    const last = lastDayOfMonth(monthKey);
    return `Tuần ${i + 1} (${[1, 8, 15, 22][i]}–${[7, 14, 21, last][i]}/${m})`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Chọn tháng */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-600">Doanh số tháng {m}/{y}</span>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1.5 py-1 soft-shadow">
          <button onClick={() => setMonthKey(shiftMonth(monthKey, -1))} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="text-sm font-bold text-slate-700 px-2 tabular-nums">Tháng {m}/{y}</span>
          <button onClick={() => setMonthKey(shiftMonth(monthKey, 1))} disabled={isCurrentMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Tổng doanh số" value={vnd(grandTotal)} icon="payments" tone="rose"
          sub={delta == null ? 'Chưa có kỳ trước' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% so tháng trước`}
          subTone={delta == null ? 'muted' : delta >= 0 ? 'up' : 'down'} />
        <KpiCard label="Doanh số TikTok" value={vnd(revTikTok)} icon="smart_display" tone="slate" />
        <KpiCard label="Doanh số Facebook" value={vnd(revFacebook)} icon="storefront" tone="blue" />
        <KpiCard label="% đạt chỉ tiêu" value={grandTarget ? `${pct(grandTotal, grandTarget)}%` : '—'} icon="target" tone="green"
          sub={grandTarget ? `Chỉ tiêu ${vndShort(grandTarget)}` : 'Chưa đặt chỉ tiêu'} subTone="muted" />
      </div>

      {/* Biểu đồ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 border border-slate-200/70 soft-shadow">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Doanh số theo ngày</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D32027" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#D32027" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tickFormatter={vndShort} tick={{ fontSize: 10, fill: '#94A3B8' }} width={44} />
                <Tooltip formatter={(v) => vnd(Number(v))} labelFormatter={(l) => `Ngày ${l}`} />
                <Area type="monotone" dataKey="revenue" name="Doanh số" stroke="#D32027" strokeWidth={2.4} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/70 soft-shadow">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Doanh số theo nhóm kênh</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catBar} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tickFormatter={vndShort} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: '#64748B' }} width={92} />
                <Tooltip formatter={(v) => vnd(Number(v))} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {catBar.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bảng kênh × tuần */}
      <div className="bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Chi tiết theo kênh — Chỉ tiêu / Thực hiện / % (tháng {m}/{y})</h3>
          <span className="text-xs font-bold text-[#D32027]">Tổng: {vnd(grandTotal)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[860px]">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left font-bold border-b border-slate-200">Kênh</th>
                <th className="px-3 py-2.5 text-right font-bold border-b border-slate-200">Chỉ tiêu</th>
                <th className="px-3 py-2.5 text-right font-bold border-b border-slate-200">Thực hiện</th>
                <th className="px-3 py-2.5 text-center font-bold border-b border-slate-200">%</th>
                {[0, 1, 2, 3].map((i) => (
                  <th key={i} className="px-3 py-2.5 text-right font-bold border-b border-slate-200 whitespace-nowrap" title={weekLabel(i)}>T{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => {
                const p = pct(g.subTotal, g.subTarget);
                return (
                  <React.Fragment key={g.key}>
                    <tr className="bg-slate-50/60">
                      <td className="sticky left-0 z-10 bg-slate-50/60 px-4 py-2 font-bold text-slate-700 border-b border-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />{g.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-500 border-b border-slate-100">{g.subTarget ? vndShort(g.subTarget) : '—'}</td>
                      <td className="px-3 py-2 text-right font-extrabold text-slate-900 border-b border-slate-100">{vndShort(g.subTotal)}</td>
                      <td className="px-3 py-2 text-center border-b border-slate-100">
                        <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(p)}`}>{p == null ? '—' : p + '%'}</span>
                      </td>
                      {g.subWeeks.map((w, i) => (
                        <td key={i} className="px-3 py-2 text-right font-semibold text-slate-600 border-b border-slate-100">{w ? vndShort(w) : '—'}</td>
                      ))}
                    </tr>
                    {g.rows.map((r) => {
                      const rp = pct(r.total, r.target);
                      return (
                        <tr key={r.name} className="hover:bg-rose-50/30">
                          <td className="sticky left-0 z-10 bg-white px-4 py-1.5 pl-8 text-slate-600 truncate max-w-[220px] border-b border-slate-50" title={r.name}>{r.name}</td>
                          <td className="px-3 py-1.5 text-right text-slate-400 border-b border-slate-50">{r.target ? vndShort(r.target) : '—'}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-slate-800 border-b border-slate-50">{vndShort(r.total)}</td>
                          <td className="px-3 py-1.5 text-center border-b border-slate-50">
                            <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(rp)}`}>{rp == null ? '—' : rp + '%'}</span>
                          </td>
                          {r.weeks.map((w, i) => (
                            <td key={i} className="px-3 py-1.5 text-right text-slate-500 font-mono border-b border-slate-50">{w ? vndShort(w) : '—'}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {grouped.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">Chưa có báo cáo doanh số nào trong tháng này.</td></tr>
              )}
            </tbody>
            {grouped.length > 0 && (
              <tfoot>
                <tr className="text-[11px] bg-slate-100">
                  <td className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 font-extrabold text-slate-700 uppercase border-t-2 border-slate-200">Tổng cộng</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-600 border-t-2 border-slate-200">{grandTarget ? vndShort(grandTarget) : '—'}</td>
                  <td className="px-3 py-2.5 text-right font-extrabold text-[#D32027] border-t-2 border-slate-200">{vndShort(grandTotal)}</td>
                  <td className="px-3 py-2.5 text-center border-t-2 border-slate-200">
                    <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(pct(grandTotal, grandTarget))}`}>
                      {pct(grandTotal, grandTarget) == null ? '—' : pct(grandTotal, grandTarget) + '%'}
                    </span>
                  </td>
                  {grandWeeks.map((w, i) => (
                    <td key={i} className="px-3 py-2.5 text-right font-bold text-slate-700 border-t-2 border-slate-200">{w ? vndShort(w) : '—'}</td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="px-4 py-2 flex items-center gap-4 text-[10px] text-slate-400 border-t border-slate-100">
          <span>T1–T4 = 4 tuần trong tháng</span>
          <button onClick={() => onGotoView('doanhso')} className="ml-auto text-[#D32027] font-bold hover:underline flex items-center gap-1">
            Xem doanh số chi tiết <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 2 — DOANH SỐ NGÀY (bảng chi tiết từng dòng, ảnh 2)
   ════════════════════════════════════════════════════════════════ */
function DoanhSoNgay({ reports, channels }: { reports: DailyReport[]; channels: AffiliateChannel[] }) {
  const [dateIso, setDateIso] = useState(isoToday);
  const date = toDdmmyyyy(dateIso);
  const isToday = dateIso === isoToday();
  const day = Number(dateIso.split('-')[2]);
  const tuan = `Tuần ${weekIndex(day) + 1}`;

  const loaiKenh = (ch: AffiliateChannel) => {
    if (ch.platform === 'TikTok') return ch.channelType === 'Brand' ? 'TikTok Brand' : ch.channelType === 'Real KOC' ? 'TikTok KOC' : 'TikTok AI';
    if (ch.platform === 'Facebook') return ch.channelType === 'Brand' ? 'FB Brand' : 'FB AI';
    return ch.platform;
  };
  const catRank = (ch: AffiliateChannel) => {
    if (ch.platform === 'TikTok') return ch.channelType === 'Brand' ? 0 : ch.channelType === 'Real KOC' ? 1 : 2;
    if (ch.platform === 'Facebook') return ch.channelType === 'Brand' ? 3 : 4;
    return 5;
  };

  // Gán người phụ trách cố định cho một số kênh (khi manager_name trong DB trống).
  // Khớp theo tên đã chuẩn hoá (bỏ dấu tiếng Việt, viết thường, bỏ dấu cách/chấm/gạch) — sửa tự do ở đây.
  const norm = (s: string) => s.normalize('NFD').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
  const MANAGER_OVERRIDE: Record<string, string> = {
    // TikTok Brand
    'drkampharmaofficial': 'Nguyễn Công Hải',
    'drkamvn': 'Hoàng Yến Nhi',
    'drkamvnofficial': 'Đặng Kim Khánh',
    // TikTok KOC
    'happyydaily': 'Hoàng Yến Nhi',
    'nhacuacamcam': 'Nguyễn Công Hải',
    'giadinhminhhee': 'Nguyễn Công Hải',
    'baochauday': 'Đặng Kim Khánh',
    // TikTok AI
    'koi928tramtram': 'Đặng Kim Khánh',
    'tinh642002': 'Đặng Kim Khánh',
    'doisongsuckhoe86': 'Đặng Kim Khánh',
    'ngochuong259': 'Nguyễn Công Hải',
    'haidang0136': 'Nguyễn Công Hải',
    'minhquan8046': 'Hoàng Yến Nhi',
    'quinchana82': 'Hoàng Yến Nhi',
    'anhquan9684': 'Hoàng Yến Nhi',
    // FB Brand (tên đầy đủ trong app)
    'drkamsongkhoecungchuyengia': 'Đặng Kim Khánh',
    'drkambacsirangmienghongcuamoigiadinh': 'Đặng Kim Khánh',
    // FB AI
    'duocsikhanh': 'Đặng Kim Khánh',
    'conghaing': 'Nguyễn Công Hải',
    'ynni1809': 'Hoàng Yến Nhi',
  };
  const nguoiPT = (ch: AffiliateChannel) => MANAGER_OVERRIDE[norm(ch.name)] ?? ch.managerName ?? '—';

  // Tất cả kênh = dòng CỐ ĐỊNH (Kênh · Loại · Người PT để sẵn); doanh số/video/view lấy từ báo cáo ngày.
  const reportOf = (name: string) => reports.find((r) => r.channelName === name && r.date === date);
  const rows = [...channels]
    .sort((a, b) => catRank(a) - catRank(b) || a.name.localeCompare(b.name, 'vi'))
    .map((ch) => ({ ch, rep: reportOf(ch.name) }));

  const totalRev = rows.reduce((s, x) => s + (x.rep?.revenue ?? 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-600">Doanh số chi tiết ngày {date} · {tuan}</span>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 soft-shadow">
          <span className="material-symbols-outlined text-[18px] text-orange-600">event</span>
          <input type="date" value={dateIso} max={isoToday()} onChange={(e) => setDateIso(e.target.value)}
            className="text-sm font-semibold border-none outline-none bg-transparent text-slate-700" />
          {!isToday && <button onClick={() => setDateIso(isoToday())} className="text-[11px] font-bold text-[#D32027] hover:underline">Hôm nay</button>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[560px]">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="px-2 py-2.5 text-center font-bold border-b border-slate-200 w-9">#</th>
                <th className="px-2 py-2.5 text-left font-bold border-b border-slate-200 whitespace-nowrap">Tuần</th>
                <th className="px-3 py-2.5 text-left font-bold border-b border-slate-200">Kênh</th>
                <th className="px-2 py-2.5 text-left font-bold border-b border-slate-200 whitespace-nowrap">Loại kênh</th>
                <th className="px-3 py-2.5 text-left font-bold border-b border-slate-200 whitespace-nowrap">Người PT</th>
                <th className="px-3 py-2.5 text-right font-bold border-b border-slate-200">Doanh số</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">Chưa có kênh nào. Thêm kênh ở mục TikTok / Facebook.</td></tr>
              ) : (
                rows.map(({ ch, rep }, i) => (
                  <tr key={ch.id} className="hover:bg-orange-50/30">
                    <td className="px-2 py-1.5 text-center text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{tuan}</td>
                    <td className="px-3 py-1.5 font-semibold text-slate-700 truncate max-w-[200px]" title={ch.name}>{ch.name}</td>
                    <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{loaiKenh(ch)}</td>
                    <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{nguoiPT(ch)}</td>
                    <td className={`px-3 py-1.5 text-right font-bold ${rep && rep.revenue > 0 ? 'text-slate-900' : 'text-slate-300'}`}>{rep && rep.revenue > 0 ? vnd(rep.revenue) : ''}</td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="text-[11px] bg-slate-100 font-bold">
                  <td className="px-2 py-2.5 text-slate-600 uppercase border-t-2 border-slate-200" colSpan={5}>Tổng {rows.length} kênh</td>
                  <td className="px-3 py-2.5 text-right text-[#D32027] border-t-2 border-slate-200">{vnd(totalRev)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
          Danh sách kênh để sẵn — cột <b>Doanh số</b> tự điền khi báo cáo ở mục TikTok / Facebook.
        </p>
      </div>
    </div>
  );
}

// ── Thẻ KPI ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, tone, sub, subTone = 'muted' }: {
  label: string; value: string; icon: string; tone: 'rose' | 'slate' | 'blue' | 'green';
  sub?: string; subTone?: 'up' | 'down' | 'muted';
}) {
  const toneCls: Record<string, string> = {
    rose: 'bg-rose-50 text-[#D32027]', slate: 'bg-slate-100 text-slate-800',
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-700',
  };
  const subCls = subTone === 'up' ? 'text-green-700' : subTone === 'down' ? 'text-rose-600' : 'text-slate-400';
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/70 soft-shadow flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${toneCls[tone]}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
      </div>
      <div className="text-lg font-extrabold text-slate-900 tracking-tight tabular-nums">{value}</div>
      {sub && <div className={`text-[11px] font-semibold ${subCls}`}>{sub}</div>}
    </div>
  );
}
