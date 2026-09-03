import React, { useState } from 'react';
import { DailyReport, AffiliateChannel, Employee, ChecklistItem, UserSession, ContentKpiTarget, WebReport } from '../types';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { dailySeries } from '../lib/analytics';
import { managerOf } from '../lib/channels';
import ContentChecklistComponent from './ContentChecklistComponent';
import { FacebookIcon, TikTokIcon } from './BrandIcons';
import { MonthPicker } from './dashboardKit';
// Danh mục hạng mục KPI dùng chung với màn "KPI tháng — Team Content".
// Chỉ tiêu KHÔNG còn hardcode ở đây: lấy theo tháng từ content_kpi_targets
// (migration 0015), tháng chưa thiết lập thì rơi về số mặc định trong lib.
import {
  BadgeKind, CONTENT_LINE_ITEMS as LINE_ITEMS, CONTENT_VIEW_REACH as VIEW_REACH,
  targetResolver,
} from '../lib/contentKpi';
// KPI doanh thu THEO NGƯỜI (migration 0019) — thực hiện suy từ kênh phụ trách.
import { employeeBreakdown, EmployeeRow } from '../lib/contentEmployeeKpi';
// Báo cáo web (migration 0021) — traffic nhập tay + số bài viết đếm từ Checklist.
import {
  seoPostsByDate, trafficByDate, webTargetResolver, WEB_POSTS_ID, WEB_TRAFFIC_ID,
} from '../lib/webReport';
// BẢNG MỚI — chi tiết từng kênh (migration 0020); bảng cũ bên dưới giữ nguyên để đối chiếu.
import {
  CHANNEL_GROUPS, channelKpiRows, channelTargetResolver, revenueByChannel,
} from '../lib/contentChannelKpi';

interface DashboardComponentProps {
  reports: DailyReport[];
  channels: AffiliateChannel[];
  employees: Employee[];
  checklists: ChecklistItem[];
  webReports: WebReport[];
  session: UserSession;
  currentUserId: string | null;
  kpiTargets: ContentKpiTarget[];
  onNavigateToTab: (tabId: string) => void;
  onAddChecklistItem: (item: ChecklistItem) => void;
  onUpdateChecklistItem: (id: string, patch: { label?: string; quantity?: number }) => void;
  onDeleteChecklistItem: (id: string) => void;
}

type CatKey = 'tt-brand' | 'tt-real' | 'tt-ai' | 'fb-ai' | 'fb-brand' | 'other';

// Dải màu theo % hoàn thành (khớp chú thích dưới biểu đồ) + icon trạng thái.
function completionStyle(p: number | null): { bar: string; text: string; icon: string | null } {
  if (p == null) return { bar: '#CBD5E1', text: '#94A3B8', icon: null };
  if (p >= 100) return { bar: '#16A34A', text: '#15803D', icon: 'check_circle' };
  if (p >= 80) return { bar: '#2563EB', text: '#2563EB', icon: 'check_circle' };
  if (p >= 50) return { bar: '#F59E0B', text: '#D97706', icon: 'remove' };
  if (p >= 40) return { bar: '#F97316', text: '#EA580C', icon: 'remove' };
  return { bar: '#EF4444', text: '#E11D48', icon: 'cancel' };
}

// Số "đẹp" cho trục (thuật toán nice-number) — vd max 70tr → trục 0/20/40/60/80tr.
function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range || 1));
  const f = range / Math.pow(10, exp);
  const nf = round
    ? (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10)
    : (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10);
  return nf * Math.pow(10, exp);
}

const vnd = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v)) + ' đ';
const vndShort = (v: number) => {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace('.0', '') + ' tỷ';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.0', '') + ' tr';
  if (v >= 1_000) return Math.round(v / 1_000) + 'K';
  return String(Math.round(v));
};
/** Số nguyên rút gọn cho traffic / số bài (không phải tiền nên không dùng vndShort). */
const intShort = (v: number) => {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.0', '') + 'tr';
  if (v >= 10_000) return Math.round(v / 1_000) + 'K';
  return new Intl.NumberFormat('vi-VN').format(Math.round(v));
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

/** Báo cáo của đúng tháng đang xem — dùng chung cho cả 3 tab số liệu. */
const monthReportsOf = (reports: DailyReport[], monthKey: string) =>
  reports.filter((r) => {
    const [dd, mm, yy] = r.date.split('/');
    return `${yy}-${mm}` === monthKey && !!dd;
  });

/** Báo cáo này thuộc tuần nào (0–3) của tháng. */
const weekOfReport = (r: DailyReport) => weekIndex(Number(r.date.split('/')[0]));

/** Nhãn tuần đầy đủ, vd "Tuần 2 (8–14/8)". */
const weekLabelOf = (monthKey: string, i: number) => {
  const m = Number(monthKey.split('-')[1]);
  const last = lastDayOfMonth(monthKey);
  return `Tuần ${i + 1} (${[1, 8, 15, 22][i]}–${[7, 14, 21, last][i]}/${m})`;
};

/** Nhịp tiến độ theo ngày của tháng đang xem (tháng đã qua → coi như hết tháng). */
function paceOf(monthKey: string) {
  const days = lastDayOfMonth(monthKey);
  const isCurrent = monthKey === nowMonthKey();
  const dayNow = isCurrent ? Math.min(new Date().getDate(), days) : days;
  return { days, dayNow, ratio: dayNow / days, daysLeft: Math.max(days - dayNow, 0) };
}

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
  const [view, setView] = useState<'chung' | 'nhanvien' | 'kenh' | 'doanhso' | 'checklist'>('chung');
  // Tháng để Ở ĐÂY (không nằm trong từng tab) — đổi tab vẫn giữ nguyên tháng đang xem.
  const [monthKey, setMonthKey] = useState(nowMonthKey);
  const TABS: { key: typeof view; label: string; icon: string }[] = [
    { key: 'chung', label: 'Báo cáo chung', icon: 'monitoring' },
    { key: 'nhanvien', label: 'Theo nhân viên', icon: 'groups' },
    { key: 'kenh', label: 'Theo kênh', icon: 'table_chart' },
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

      {view === 'chung' && (
        <BaoCaoChung
          reports={props.reports}
          channels={props.channels}
          checklists={props.checklists}
          webReports={props.webReports}
          kpiTargets={props.kpiTargets}
          monthKey={monthKey}
          onMonthChange={setMonthKey}
          onGotoView={setView}
        />
      )}
      {view === 'nhanvien' && (
        <TheoNhanVien
          reports={props.reports}
          channels={props.channels}
          employees={props.employees}
          kpiTargets={props.kpiTargets}
          monthKey={monthKey}
          onMonthChange={setMonthKey}
        />
      )}
      {view === 'kenh' && (
        <TheoKenh
          reports={props.reports}
          channels={props.channels}
          kpiTargets={props.kpiTargets}
          monthKey={monthKey}
          onMonthChange={setMonthKey}
        />
      )}
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
function BaoCaoChung({ reports, channels, checklists, webReports, kpiTargets, monthKey, onMonthChange, onGotoView }: {
  reports: DailyReport[];
  channels: AffiliateChannel[];
  checklists: ChecklistItem[];
  webReports: WebReport[];
  kpiTargets: ContentKpiTarget[];
  monthKey: string;
  onMonthChange: (v: string) => void;
  onGotoView: (v: 'doanhso' | 'nhanvien' | 'kenh') => void;
}) {
  // Chỉ tiêu của ĐÚNG tháng đang xem (chưa thiết lập → số mặc định trong lib).
  const targetOf = targetResolver(kpiTargets, monthKey);
  const [y, m] = monthKey.split('-').map(Number);
  const monthFromIso = `${monthKey}-01`;
  const monthToIso = `${monthKey}-${String(lastDayOfMonth(monthKey)).padStart(2, '0')}`;

  const chMeta = new Map(channels.map((c) => [c.name, c]));
  const monthReports = reports.filter((r) => {
    const [dd, mm, yy] = r.date.split('/');
    return `${yy}-${mm}` === monthKey && dd;
  });

  type Row = { id: string; label: string; badge: BadgeKind; target: number; weeks: number[]; total: number };
  const rowById = new Map<string, Row>();
  LINE_ITEMS.forEach((li) => rowById.set(li.id, { id: li.id, label: li.label, badge: li.badge, target: targetOf(li.id), weeks: [0, 0, 0, 0], total: 0 }));
  rowById.set('other', { id: 'other', label: 'Khác', badge: 'other', target: 0, weeks: [0, 0, 0, 0], total: 0 });
  monthReports.forEach((r) => {
    const wi = weekIndex(Number(r.date.split('/')[0]));
    const ch = chMeta.get(r.channelName);
    const li = LINE_ITEMS.find((x) => x.match(ch, r));
    const row = rowById.get(li ? li.id : 'other')!;
    row.weeks[wi] += r.revenue;
    row.total += r.revenue;
  });
  // Danh sách phẳng đúng thứ tự Excel; dòng "Khác" chỉ hiện khi có doanh thu lạc hạng mục.
  const rows = [
    ...LINE_ITEMS.map((li) => rowById.get(li.id)!),
    ...(rowById.get('other')!.total > 0 ? [rowById.get('other')!] : []),
  ];

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const grandTarget = LINE_ITEMS.reduce((s, li) => s + targetOf(li.id), 0);
  const grandWeeks = [0, 1, 2, 3].map((i) => rows.reduce((s, r) => s + r.weeks[i], 0));
  const grandPct = pct(grandTotal, grandTarget);
  const withTarget = LINE_ITEMS.filter((li) => targetOf(li.id) > 0);
  const reached = withTarget.filter((li) => rowById.get(li.id)!.total >= targetOf(li.id)).length;

  // VIEW / REACH — cộng reach (viewsReach) theo nền tảng & tuần (reach nhập theo tuần → cộng dồn ra tháng).
  const vrRows = VIEW_REACH.map((v) => ({ ...v, monthlyTarget: targetOf(v.id), weeks: [0, 0, 0, 0] as number[], total: 0 }));
  monthReports.forEach((r) => {
    const reach = r.traffic?.viewsReach ?? 0;
    if (!reach) return;
    const cat = catKeyOf(r, chMeta);
    const v = vrRows.find((x) => cat.startsWith(x.plat));
    if (!v) return;
    v.weeks[weekIndex(Number(r.date.split('/')[0]))] += reach;
    v.total += reach;
  });

  // WEB / SEO — traffic nhập tay (web_reports) + số bài viết đếm từ dòng "SEO WEB"
  // của Checklist ngày; chỉ tiêu lấy ở màn KPI tháng (mục Chỉ tiêu Web / SEO).
  const webTargetOf = webTargetResolver(kpiTargets, monthKey);
  const webTrafficByDay = trafficByDate(webReports, monthKey);
  const webPostsByDay = seoPostsByDate(checklists, monthKey);
  const webRows = [
    { id: WEB_TRAFFIC_ID, label: 'Lượt truy cập web', icon: 'trending_up', unit: 'lượt', byDay: webTrafficByDay },
    { id: WEB_POSTS_ID, label: 'Số bài viết SEO WEB', icon: 'article', unit: 'bài', byDay: webPostsByDay },
  ].map((w) => {
    const weeks = [0, 0, 0, 0];
    let total = 0;
    w.byDay.forEach((v, d) => { weeks[weekIndex(Number(d.split('/')[0]))] += v; total += v; });
    return { ...w, weeks, total, target: webTargetOf(w.id) };
  });

  const revTikTok = monthReports.filter((r) => catKeyOf(r, chMeta).startsWith('tt')).reduce((s, r) => s + r.revenue, 0);
  const revFacebook = monthReports.filter((r) => catKeyOf(r, chMeta).startsWith('fb')).reduce((s, r) => s + r.revenue, 0);
  // KPI theo nền tảng: TikTok gồm badge 'tiktok' + 'koc' (KOC là kênh TikTok), Facebook gồm badge 'fb'.
  const tkTarget = LINE_ITEMS.filter((li) => li.badge === 'tiktok' || li.badge === 'koc').reduce((s, li) => s + targetOf(li.id), 0);
  const fbTarget = LINE_ITEMS.filter((li) => li.badge === 'fb').reduce((s, li) => s + targetOf(li.id), 0);

  const series = dailySeries(monthReports, monthFromIso, monthToIso);
  const weekLabel = (i: number) => {
    const last = lastDayOfMonth(monthKey);
    return `Tuần ${i + 1} (${[1, 8, 15, 22][i]}–${[7, 14, 21, last][i]}/${m})`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Chọn tháng */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-600">Doanh số tháng {m}/{y}</span>
        <MonthPicker value={monthKey} onChange={onMonthChange} />
      </div>

      {/* Tổng doanh thu hiện tại vs KPI — realtime theo báo cáo ngày */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng doanh thu hiện tại · tháng {m}/{y}</p>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums mt-1">{vnd(grandTotal)}</div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
              <span className="material-symbols-outlined text-[13px] text-green-600">sync</span>
              Tự cập nhật theo báo cáo mỗi ngày
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">KPI tháng</p>
            <div className="text-lg font-bold text-slate-700 tabular-nums">{grandTarget ? vnd(grandTarget) : '—'}</div>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-sm font-extrabold ${pctColor(grandPct)}`}>{grandPct == null ? '—' : grandPct + '%'}</span>
          </div>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-4">
          <div className="h-full rounded-full bg-[#D32027] transition-all duration-500" style={{ width: `${Math.min(grandPct ?? 0, 100)}%` }} />
        </div>
      </div>

      {/* KPI phụ */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Doanh số TikTok" value={vnd(revTikTok)} iconNode={<TikTokIcon className="w-[18px] h-[18px]" />} tone="slate"
          target={tkTarget} pctVal={pct(revTikTok, tkTarget)} />
        <KpiCard label="Doanh số Facebook" value={vnd(revFacebook)} iconNode={<FacebookIcon className="w-[18px] h-[18px]" />} tone="blue"
          target={fbTarget} pctVal={pct(revFacebook, fbTarget)} />
        <KpiCard label="Hạng mục đạt KPI" value={`${reached}/${withTarget.length}`} icon="target" tone="green"
          sub={withTarget.length ? 'Số hạng mục ≥ 100% chỉ tiêu' : 'Chưa đặt chỉ tiêu'} subTone="muted" />
      </div>

      {/* Web / SEO — số nhanh; nhập & xem chi tiết ở mục "Báo cáo web" */}
      <div className="grid grid-cols-2 gap-3">
        {webRows.map((w) => (
          <WebMiniCard key={w.id} label={w.label} icon={w.icon} unit={w.unit} total={w.total} target={w.target} />
        ))}
      </div>

      {/* Biểu đồ 1 — Thực hiện vs Mục tiêu (thanh tiến độ tự vẽ) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
        <h3 className="text-base font-bold text-slate-800 mb-4">Thực hiện vs Mục tiêu theo hạng mục</h3>
        <div className="overflow-x-auto">
          <TargetProgressChart rows={rows} />
        </div>
      </div>

      {/* Biểu đồ 2 — Doanh số theo ngày */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/70 soft-shadow">
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

      {/* Bảng hạng mục × tuần (BẢNG CŨ — giữ để đối chiếu) */}
      <div className="bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-extrabold uppercase tracking-wide">Bảng cũ</span>
            Báo cáo chung theo hạng mục — tháng {m}/{y}
          </h3>
          <span className="text-xs font-bold text-[#D32027]">Tổng: {vnd(grandTotal)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[760px]">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left font-bold border-b border-slate-200">Hạng mục</th>
                <th className="px-3 py-2.5 text-right font-bold border-b border-slate-200 whitespace-nowrap">Mục tiêu</th>
                <th className="px-3 py-2.5 text-right font-bold border-b border-slate-200 whitespace-nowrap">Thực hiện</th>
                <th className="px-3 py-2.5 text-center font-bold border-b border-slate-200">%</th>
                {[0, 1, 2, 3].map((i) => (
                  <th key={i} className="px-3 py-2.5 text-right font-bold border-b border-slate-200 whitespace-nowrap" title={weekLabel(i)}>T{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rp = pct(r.total, r.target);
                return (
                  <tr key={r.id} className="hover:bg-rose-50/30">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 font-semibold text-slate-700 truncate max-w-[240px] border-b border-slate-50" title={r.label}>{r.label}</td>
                    <td className="px-3 py-2 text-right text-slate-400 border-b border-slate-50">{r.target ? vndShort(r.target) : '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 border-b border-slate-50">{r.total ? vndShort(r.total) : '—'}</td>
                    <td className="px-3 py-2 text-center border-b border-slate-50">
                      <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(rp)}`}>{rp == null ? '—' : rp + '%'}</span>
                    </td>
                    {r.weeks.map((w, i) => (
                      <td key={i} className="px-3 py-2 text-right text-slate-500 font-mono border-b border-slate-50">{w ? vndShort(w) : '—'}</td>
                    ))}
                  </tr>
                );
              })}
              {/* Tổng cộng doanh số */}
              <tr className="text-[11px] bg-slate-100">
                <td className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 font-extrabold text-slate-700 uppercase border-t-2 border-slate-200">Tổng doanh số</td>
                <td className="px-3 py-2.5 text-right font-bold text-slate-600 border-t-2 border-slate-200">{grandTarget ? vndShort(grandTarget) : '—'}</td>
                <td className="px-3 py-2.5 text-right font-extrabold text-[#D32027] border-t-2 border-slate-200">{vndShort(grandTotal)}</td>
                <td className="px-3 py-2.5 text-center border-t-2 border-slate-200">
                  <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(grandPct)}`}>{grandPct == null ? '—' : grandPct + '%'}</span>
                </td>
                {grandWeeks.map((w, i) => (
                  <td key={i} className="px-3 py-2.5 text-right font-bold text-slate-700 border-t-2 border-slate-200">{w ? vndShort(w) : '—'}</td>
                ))}
              </tr>

              {/* Dải ngăn cách — VIEW / REACH (traffic, nhập theo tuần) */}
              <tr>
                <td colSpan={8} className="bg-blue-600 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">visibility</span>
                    View / Reach · lấy từ báo cáo traffic (nhập theo tuần)
                  </span>
                </td>
              </tr>
              {vrRows.map((v) => {
                const vp = pct(v.total, v.monthlyTarget);
                return (
                  <tr key={v.id} className="hover:bg-blue-50/30">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 font-semibold text-slate-700 border-b border-slate-50">
                      <span className="inline-flex items-center gap-2">
                        {v.badge === 'tiktok'
                          ? <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center shrink-0"><TikTokIcon className="w-3 h-3 text-white" /></span>
                          : <FacebookIcon className="w-5 h-5 text-[#1877F2] shrink-0" />}
                        {v.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400 border-b border-slate-50">{vndShort(v.monthlyTarget)}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 border-b border-slate-50">{v.total ? vndShort(v.total) : '—'}</td>
                    <td className="px-3 py-2 text-center border-b border-slate-50">
                      <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(vp)}`}>{vp == null ? '—' : vp + '%'}</span>
                    </td>
                    {v.weeks.map((w, i) => (
                      <td key={i} className="px-3 py-2 text-right text-slate-500 font-mono border-b border-slate-50">{w ? vndShort(w) : '—'}</td>
                    ))}
                  </tr>
                );
              })}

              {/* Dải ngăn cách — WEB / SEO (nhập ở mục "Báo cáo web") */}
              <tr>
                <td colSpan={8} className="bg-violet-600 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">language</span>
                    Web / SEO · traffic nhập tay theo ngày · số bài viết đếm từ Checklist
                  </span>
                </td>
              </tr>
              {webRows.map((w) => {
                const wp = pct(w.total, w.target);
                return (
                  <tr key={w.id} className="hover:bg-violet-50/30">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 font-semibold text-slate-700 border-b border-slate-50">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[13px]">{w.icon}</span>
                        </span>
                        {w.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400 border-b border-slate-50">{w.target ? intShort(w.target) : '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 border-b border-slate-50">{w.total ? intShort(w.total) : '—'}</td>
                    <td className="px-3 py-2 text-center border-b border-slate-50">
                      <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(wp)}`}>{wp == null ? '—' : wp + '%'}</span>
                    </td>
                    {w.weeks.map((v, i) => (
                      <td key={i} className="px-3 py-2 text-right text-slate-500 font-mono border-b border-slate-50">{v ? intShort(v) : '—'}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 flex items-center gap-4 text-[10px] text-slate-400 border-t border-slate-100">
          <span>T1 (1–7) · T2 (8–14) · T3 (15–21) · T4 (22–cuối tháng) · Doanh số &amp; web cộng theo ngày · View/Reach cộng theo tuần</span>
          <button onClick={() => onGotoView('kenh')} className="ml-auto text-[#D32027] font-bold hover:underline flex items-center gap-1">
            Xem chi tiết theo kênh <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
          </button>
          <button onClick={() => onGotoView('nhanvien')} className="text-[#D32027] font-bold hover:underline flex items-center gap-1">
            Xem theo nhân viên <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
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

  // Người phụ trách: lấy từ kênh (sửa ở tab "Quản lý kênh"); kênh seed chưa có
  // manager_name thì rơi về bảng dự phòng MANAGER_OVERRIDE trong src/lib/channels.ts.
  const nguoiPT = (ch: AffiliateChannel) => managerOf(ch) || '—';

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

/* ════════════════════════════════════════════════════════════════
   Biểu đồ thanh: Thực hiện vs Mục tiêu theo hạng mục (tự vẽ bằng CSS)
   Thanh Thực hiện (tô màu theo % hoàn thành) phủ lên track Mục tiêu.
   ════════════════════════════════════════════════════════════════ */
function TargetProgressChart({ rows }: {
  rows: { id: string; label: string; badge: BadgeKind; target: number; total: number }[];
}) {
  // Giữ nguyên thứ tự hạng mục theo Excel (không sắp xếp lại).
  const data = rows;
  const rawMax = Math.max(1, ...data.map((r) => Math.max(r.target, r.total)));
  const step = niceNum(niceNum(rawMax, false) / 4, true);
  const axisMax = Math.max(step, Math.ceil(rawMax / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= axisMax + 1; v += step) ticks.push(v);
  const leftOf = (v: number) => `${(v / axisMax) * 100}%`;

  return (
    <div className="min-w-[620px]">
      {/* Trục ngang + tiêu đề 2 cột phải */}
      <div className="flex items-center gap-3 pb-1">
        <div className="w-48 shrink-0" />
        <div className="relative flex-1 h-4">
          {ticks.map((t, i) => (
            <span key={i}
              className={`absolute text-[10px] text-slate-400 tabular-nums ${i === 0 ? '' : i === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
              style={{ left: leftOf(t) }}>
              {t === 0 ? '0' : vndShort(t)}
            </span>
          ))}
        </div>
        <div className="w-24 shrink-0 text-right text-[10px] font-bold text-slate-500 leading-tight">Thực hiện /<br />Mục tiêu</div>
        <div className="w-20 shrink-0 text-right text-[10px] font-bold text-slate-500">% hoàn thành</div>
      </div>

      {/* Mỗi hạng mục 1 dòng */}
      {data.map((r) => {
        const p = pct(r.total, r.target);
        const st = completionStyle(p);
        return (
          <div key={r.id} className="flex items-center gap-3 py-2 border-t border-slate-50">
            <div className="w-48 shrink-0 flex items-center gap-2 min-w-0">
              <ItemBadge kind={r.badge} />
              <span className="text-xs font-semibold text-slate-700 truncate" title={r.label}>{r.label}</span>
            </div>
            <div className="relative flex-1 h-5">
              {ticks.map((t, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-l border-dashed border-slate-100" style={{ left: leftOf(t) }} />
              ))}
              {r.target > 0 && (
                <div className="absolute top-1/2 left-0 -translate-y-1/2 h-2.5 bg-slate-200/80 rounded-full" style={{ width: leftOf(r.target) }} />
              )}
              <div className="absolute top-1/2 left-0 -translate-y-1/2 h-2.5 rounded-full transition-all duration-500"
                style={{ width: leftOf(Math.min(r.total, axisMax)), background: st.bar }} />
            </div>
            <div className="w-24 shrink-0 text-right text-[11px] font-semibold text-slate-600 tabular-nums">
              {vndShort(r.total)} <span className="text-slate-300">/</span> {r.target ? vndShort(r.target) : '—'}
            </div>
            <div className="w-20 shrink-0 flex items-center justify-end gap-0.5">
              <span className="text-sm font-extrabold tabular-nums" style={{ color: st.text }}>{p == null ? '—' : p + '%'}</span>
              {st.icon && <span className="material-symbols-outlined text-[16px]" style={{ color: st.text }}>{st.icon}</span>}
            </div>
          </div>
        );
      })}

      {/* Chú thích màu */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-full bg-slate-200/80" /> Mục tiêu</span>
        <span className="font-semibold text-slate-600">% hoàn thành:</span>
        {([['#16A34A', '≥ 100%'], ['#2563EB', '80–99%'], ['#F59E0B', '50–79%'], ['#F97316', '40–49%'], ['#EF4444', '< 40%']] as const).map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: c }} /> {l}</span>
        ))}
      </div>
    </div>
  );
}

// Badge nền tảng của từng hạng mục — logo thật của Facebook / TikTok.
function ItemBadge({ kind }: { kind: BadgeKind }) {
  if (kind === 'fb') return <FacebookIcon className="w-6 h-6 shrink-0 text-[#1877F2]" />;
  if (kind === 'tiktok') return (
    <span className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
      <TikTokIcon className="w-3.5 h-3.5 text-white" />
    </span>
  );
  if (kind === 'koc') return (
    <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 text-[8px] font-extrabold tracking-tight">KOC</span>
  );
  return <span className="w-6 h-6 rounded-full bg-slate-300 shrink-0" />;
}

/** Thẻ số nhanh của Web / SEO — traffic và số bài viết đều là SỐ ĐẾM, không phải tiền. */
function WebMiniCard({ label, icon, unit, total, target }: {
  label: string; icon: string; unit: string; total: number; target: number;
}) {
  const p = pct(total, target);
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/70 soft-shadow flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-50 text-violet-600">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-lg font-extrabold text-slate-900 tracking-tight tabular-nums">
          {new Intl.NumberFormat('vi-VN').format(total)} <span className="text-xs font-bold text-slate-400">{unit}</span>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-extrabold ${pctColor(p)}`}>
          {p == null ? '—' : p + '%'}
        </span>
      </div>
      <div className="text-[11px] font-semibold text-slate-400 tabular-nums">
        / KPI {target ? new Intl.NumberFormat('vi-VN').format(target) : '—'} {unit}
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-violet-600 transition-all duration-500" style={{ width: `${Math.min(p ?? 0, 100)}%` }} />
      </div>
    </div>
  );
}

// ── Thẻ KPI ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, iconNode, tone, sub, subTone = 'muted', target, pctVal }: {
  label: string; value: string; icon?: string; iconNode?: React.ReactNode; tone: 'rose' | 'slate' | 'blue' | 'green';
  sub?: string; subTone?: 'up' | 'down' | 'muted';
  target?: number; pctVal?: number | null;
}) {
  const toneCls: Record<string, string> = {
    rose: 'bg-rose-50 text-[#D32027]', slate: 'bg-slate-100 text-slate-800',
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-700',
  };
  const subCls = subTone === 'up' ? 'text-green-700' : subTone === 'down' ? 'text-rose-600' : 'text-slate-400';
  const barCls: Record<string, string> = { rose: 'bg-[#D32027]', slate: 'bg-slate-800', blue: 'bg-blue-500', green: 'bg-green-600' };
  const showKpi = target != null;
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/70 soft-shadow flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${toneCls[tone]}`}>
          {iconNode ?? <span className="material-symbols-outlined text-[18px]">{icon}</span>}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-lg font-extrabold text-slate-900 tracking-tight tabular-nums">{value}</div>
        {showKpi && (
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-extrabold ${pctColor(pctVal ?? null)}`}>
            {pctVal == null ? '—' : pctVal + '%'}
          </span>
        )}
      </div>
      {showKpi && (
        <>
          <div className="text-[11px] font-semibold text-slate-400 tabular-nums">/ KPI {target ? vnd(target) : '—'}</div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barCls[tone]}`} style={{ width: `${Math.min(pctVal ?? 0, 100)}%` }} />
          </div>
        </>
      )}
      {sub && <div className={`text-[11px] font-semibold ${subCls}`}>{sub}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB — THEO NHÂN VIÊN
   Mỗi người 1 dòng: TỔNG KPI · thực hiện · % · thanh tiến độ, bấm
   vào mở ra CHI TIẾT TỪNG KÊNH họ cầm (kèm phần chia Facebook Ads).
   Toàn bộ số lấy từ employeeBreakdown() nên không thể lệch với tab
   "Theo kênh".
   ════════════════════════════════════════════════════════════════ */
function TheoNhanVien({ reports, channels, employees, kpiTargets, monthKey, onMonthChange }: {
  reports: DailyReport[];
  channels: AffiliateChannel[];
  employees: Employee[];
  kpiTargets: ContentKpiTarget[];
  monthKey: string;
  onMonthChange: (v: string) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const monthReports = monthReportsOf(reports, monthKey);
  const { rows, unassigned } = employeeBreakdown(
    employees, channels, monthReports, weekOfReport, channelTargetResolver(kpiTargets, monthKey),
  );

  const { days, dayNow, ratio, daysLeft } = paceOf(monthKey);
  const teamTarget = rows.reduce((s, r) => s + r.target, 0) + unassigned.target;
  const teamTotal = rows.reduce((s, r) => s + r.total, 0) + unassigned.total;
  const withTarget = rows.filter((r) => r.target > 0);
  const onTrack = withTarget.filter((r) => r.total >= r.target * ratio).length;
  const [y, m] = monthKey.split('-').map(Number);

  const toggle = (key: string) => setOpenKey((k) => (k === key ? null : key));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-sm font-bold text-slate-600">KPI &amp; tiến độ từng nhân viên · tháng {m}/{y}</span>
          <p className="text-[11px] text-slate-400 mt-0.5">
            KPI của một người = tổng chỉ tiêu các kênh họ phụ trách · bấm vào dòng để xem chi tiết từng kênh.
          </p>
        </div>
        <MonthPicker value={monthKey} onChange={onMonthChange} />
      </div>

      {/* 3 thẻ tóm tắt */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Tổng KPI đã giao" value={teamTarget ? vnd(teamTarget) : '—'} icon="flag" tone="rose"
          sub={`${withTarget.length} nhân viên có chỉ tiêu`} />
        <KpiCard label="Team đã đạt" value={vnd(teamTotal)} icon="payments" tone="green"
          target={teamTarget} pctVal={pct(teamTotal, teamTarget)} />
        <KpiCard label="Bám nhịp tháng" value={`${onTrack}/${withTarget.length}`} icon="speed" tone="blue"
          sub={`Đến ngày ${dayNow}/${days} cần đạt ${Math.round(ratio * 100)}% KPI`} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-xs text-slate-400 text-center">
            Chưa có nhân viên nào có chỉ tiêu hoặc doanh thu trong tháng này — đặt KPI ở màn <b>KPI tháng — Team Content</b>.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => (
              <EmployeeRowCard key={r.key} row={r} open={openKey === r.key} onToggle={() => toggle(r.key)}
                ratio={ratio} daysLeft={daysLeft} monthKey={monthKey} />
            ))}
            {(unassigned.total > 0 || unassigned.target > 0) && (
              <EmployeeRowCard row={unassigned} open={openKey === unassigned.key} onToggle={() => toggle(unassigned.key)}
                ratio={ratio} daysLeft={daysLeft} monthKey={monthKey} muted />
            )}
          </div>
        )}
        <div className="px-5 py-2.5 border-t border-slate-100 text-[10px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
          <span>Vạch xám trên thanh = nhịp kỳ vọng đến ngày {dayNow}/{days}.</span>
          <span>Facebook Ads là kênh gộp của cả team nên nằm ở dòng “Chưa gán người phụ trách”.</span>
          <span>Gán người phụ trách kênh ở tab <b>Quản lý kênh</b>; đặt KPI ở màn <b>KPI tháng — Team Content</b>.</span>
        </div>
      </div>
    </div>
  );
}

/** Chữ cái đầu của tên (2 từ cuối) — avatar chữ cho dòng nhân viên. */
const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';

/** 1 nhân viên: dòng tổng + (mở rộng) bảng chi tiết từng kênh. */
function EmployeeRowCard({ row, open, onToggle, ratio, daysLeft, monthKey, muted = false }: {
  row: EmployeeRow;
  open: boolean;
  onToggle: () => void;
  ratio: number;
  daysLeft: number;
  monthKey: string;
  muted?: boolean;
}) {
  const p = pct(row.total, row.target);
  const st = completionStyle(p);
  const gap = row.target - row.total;
  const behind = row.target > 0 && row.total < row.target * ratio;

  return (
    <div className={muted ? 'bg-slate-50/40' : ''}>
      <button onClick={onToggle} className="w-full text-left px-5 py-3 hover:bg-rose-50/30 transition-colors">
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 shrink-0 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
            muted ? 'bg-slate-200 text-slate-500' : 'bg-slate-800 text-white'
          }`}>
            {muted ? <span className="material-symbols-outlined text-[16px]">help</span> : initialsOf(row.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800 truncate" title={row.name}>{row.name}</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{row.lines.length} kênh</span>
            </div>
            <span className="text-[11px] text-slate-500 tabular-nums">
              {vnd(row.total)} <span className="text-slate-300">/</span> {row.target ? vnd(row.target) : 'chưa có KPI'}
            </span>
          </div>
          <span className="text-lg font-extrabold tabular-nums w-20 text-right" style={{ color: st.text }}>
            {p == null ? '—' : p + '%'}
          </span>
          <span className={`material-symbols-outlined text-[20px] text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>

        {/* Thanh tiến độ + vạch nhịp kỳ vọng */}
        <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden mt-2">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(p ?? 0, 100)}%`, background: st.bar }} />
          {row.target > 0 && (
            <div className="absolute top-0 bottom-0 w-[2px] bg-slate-400/70" style={{ left: `${Math.min(ratio * 100, 100)}%` }} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400 mt-1.5">
          {row.target === 0 ? (
            <span className="text-amber-600 font-semibold">Kênh phụ trách chưa có chỉ tiêu tháng này</span>
          ) : gap > 0 ? (
            <>
              <span>Còn thiếu <b className="text-slate-600">{vndShort(gap)}</b></span>
              {daysLeft > 0 && <span>Cần <b className="text-slate-600">{vndShort(gap / daysLeft)}</b>/ngày · còn {daysLeft} ngày</span>}
              <span className={behind ? 'text-rose-600 font-semibold' : 'text-green-700 font-semibold'}>
                {behind ? 'Chậm hơn nhịp' : 'Bám nhịp'}
              </span>
            </>
          ) : (
            <span className="text-green-700 font-semibold">Đã vượt chỉ tiêu {vndShort(-gap)}</span>
          )}
          <span className="ml-auto tabular-nums">
            {row.weeks.map((w, i) => `T${i + 1} ${w ? vndShort(w) : '—'}`).join(' · ')}
          </span>
        </div>
      </button>

      {/* Chi tiết từng kênh của người này */}
      {open && (
        <div className="px-5 pb-4 -mt-1">
          <div className="overflow-x-auto rounded-xl border border-slate-200/70">
            <table className="w-full text-xs border-collapse min-w-[620px]">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50">
                  <th className="px-3 py-2 text-left font-bold">Kênh</th>
                  <th className="px-3 py-2 text-right font-bold">Mục tiêu</th>
                  <th className="px-3 py-2 text-right font-bold">Thực hiện</th>
                  <th className="px-3 py-2 text-center font-bold">%</th>
                  {[0, 1, 2, 3].map((i) => (
                    <th key={i} className="px-3 py-2 text-right font-bold" title={weekLabelOf(monthKey, i)}>T{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {row.lines.map((l) => {
                  const lp = pct(l.total, l.target);
                  return (
                    <tr key={l.key} className="border-t border-slate-100 hover:bg-rose-50/20">
                      <td className="px-3 py-2 font-semibold text-slate-700 truncate max-w-[220px]" title={l.name}>
                        <span className="inline-flex items-center gap-1.5">
                          {l.kind === 'fbads' && <FacebookIcon className="w-3.5 h-3.5 text-[#1877F2] shrink-0" />}
                          {l.name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">{l.target ? vndShort(l.target) : '—'}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-800">{l.total ? vndShort(l.total) : '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(lp)}`}>{lp == null ? '—' : lp + '%'}</span>
                      </td>
                      {l.weeks.map((w, i) => (
                        <td key={i} className="px-3 py-2 text-right text-slate-500 font-mono">{w ? vndShort(w) : '—'}</td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-700">Tổng của {row.name}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{row.target ? vndShort(row.target) : '—'}</td>
                  <td className="px-3 py-2 text-right text-[#D32027]">{vndShort(row.total)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(p)}`}>{p == null ? '—' : p + '%'}</span>
                  </td>
                  {row.weeks.map((w, i) => (
                    <td key={i} className="px-3 py-2 text-right text-slate-600">{w ? vndShort(w) : '—'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB — THEO KÊNH (bảng KPI mới, chi tiết từng kênh)
   ════════════════════════════════════════════════════════════════ */
function TheoKenh({ reports, channels, kpiTargets, monthKey, onMonthChange }: {
  reports: DailyReport[];
  channels: AffiliateChannel[];
  kpiTargets: ContentKpiTarget[];
  monthKey: string;
  onMonthChange: (v: string) => void;
}) {
  const [y, m] = monthKey.split('-').map(Number);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-sm font-bold text-slate-600">Doanh thu &amp; KPI từng kênh · tháng {m}/{y}</span>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Mục tiêu lấy từ bảng KPI mới · cột người phụ trách gán ở tab Quản lý kênh.
          </p>
        </div>
        <MonthPicker value={monthKey} onChange={onMonthChange} />
      </div>
      <ChannelDetailReport
        reports={monthReportsOf(reports, monthKey)}
        channels={channels}
        kpiTargets={kpiTargets}
        monthKey={monthKey}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   BẢNG MỚI — DOANH THU CHI TIẾT THEO TỪNG KÊNH (migration 0020)

   Bảng cũ gộp mọi kênh TikTok AI vào 1 dòng nên không biết kênh nào
   kéo số, kênh nào chết. Bảng này lấy thẳng danh sách kênh đang bật
   theo dõi doanh thu (tab Quản lý kênh) — thêm kênh là tự có dòng.

   Mục tiêu lấy từ KPI "bảng mới" (kind='channel', đặt ở màn KPI tháng);
   kênh chưa đặt chỉ tiêu vẫn hiện số thực hiện, cột % để trống. Kênh đã
   tắt doanh thu nhưng trong tháng vẫn có số thì vẫn hiện (nhóm "Khác")
   để không nuốt mất doanh thu đã nhập.
   ════════════════════════════════════════════════════════════════ */
function ChannelDetailReport({ reports, channels, kpiTargets, monthKey }: {
  reports: DailyReport[];          // báo cáo ĐÃ lọc theo tháng đang xem
  channels: AffiliateChannel[];
  kpiTargets: ContentKpiTarget[];
  monthKey: string;
}) {
  const weekLabel = (i: number) => weekLabelOf(monthKey, i);
  const targetOf = channelTargetResolver(kpiTargets, monthKey);
  const actual = revenueByChannel(reports, (r) => weekIndex(Number(r.date.split('/')[0])));
  const rows = channelKpiRows(channels, reports.filter((r) => r.revenue).map((r) => r.channelName))
    .map((c) => {
      const got = actual.get(c.key);
      return { ...c, target: targetOf(c.key), total: got?.total ?? 0, weeks: got?.weeks ?? [0, 0, 0, 0] };
    });

  const grandTarget = rows.reduce((s, r) => s + r.target, 0);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const grandWeeks = [0, 1, 2, 3].map((i) => rows.reduce((s, r) => s + r.weeks[i], 0));
  const grandPct = pct(grandTotal, grandTarget);
  const notSet = rows.filter((r) => r.target === 0).length;

  return (
    <div className="bg-white rounded-2xl border-2 border-[#D32027]/20 soft-shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-[#D32027] text-white text-[9px] font-extrabold uppercase tracking-wide">Bảng mới</span>
          Doanh thu chi tiết theo từng kênh
        </h3>
        <span className="text-xs font-bold text-[#D32027]">Tổng: {vnd(grandTotal)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[820px]">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left font-bold border-b border-slate-200">Kênh</th>
              <th className="px-3 py-2.5 text-left font-bold border-b border-slate-200 whitespace-nowrap">Người phụ trách</th>
              <th className="px-3 py-2.5 text-right font-bold border-b border-slate-200 whitespace-nowrap">Mục tiêu</th>
              <th className="px-3 py-2.5 text-right font-bold border-b border-slate-200 whitespace-nowrap">Thực hiện</th>
              <th className="px-3 py-2.5 text-center font-bold border-b border-slate-200">%</th>
              {[0, 1, 2, 3].map((i) => (
                <th key={i} className="px-3 py-2.5 text-right font-bold border-b border-slate-200 whitespace-nowrap" title={weekLabel(i)}>T{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHANNEL_GROUPS.map((g) => {
              const items = rows.filter((r) => r.group === g.key);
              if (items.length === 0) return null;
              const sub = items.reduce((s, r) => s + r.total, 0);
              const subTarget = items.reduce((s, r) => s + r.target, 0);
              return (
                <React.Fragment key={g.key}>
                  <tr>
                    <td colSpan={9} className="bg-slate-100/70 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      {g.label} · {items.length} kênh · {vndShort(sub)}{subTarget ? ` / ${vndShort(subTarget)}` : ''}
                    </td>
                  </tr>
                  {items.map((r) => {
                    const rp = pct(r.total, r.target);
                    return (
                      <tr key={r.key} className="hover:bg-rose-50/30">
                        <td className="sticky left-0 z-10 bg-white px-4 py-2 font-semibold text-slate-700 truncate max-w-[240px] border-b border-slate-50" title={r.name}>{r.name}</td>
                        <td className="px-3 py-2 text-slate-500 border-b border-slate-50 whitespace-nowrap">
                          {r.manager || <span className="text-amber-600 font-semibold">Chưa gán</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-400 border-b border-slate-50">{r.target ? vndShort(r.target) : '—'}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900 border-b border-slate-50">{r.total ? vndShort(r.total) : '—'}</td>
                        <td className="px-3 py-2 text-center border-b border-slate-50">
                          <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(rp)}`}>{rp == null ? '—' : rp + '%'}</span>
                        </td>
                        {r.weeks.map((w, i) => (
                          <td key={i} className="px-3 py-2 text-right text-slate-500 font-mono border-b border-slate-50">{w ? vndShort(w) : '—'}</td>
                        ))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
            <tr className="text-[11px] bg-slate-100">
              <td className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 font-extrabold text-slate-700 uppercase border-t-2 border-slate-200">Tổng cộng</td>
              <td className="border-t-2 border-slate-200" />
              <td className="px-3 py-2.5 text-right font-bold text-slate-600 border-t-2 border-slate-200">{grandTarget ? vndShort(grandTarget) : '—'}</td>
              <td className="px-3 py-2.5 text-right font-extrabold text-[#D32027] border-t-2 border-slate-200">{vndShort(grandTotal)}</td>
              <td className="px-3 py-2.5 text-center border-t-2 border-slate-200">
                <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(grandPct)}`}>{grandPct == null ? '—' : grandPct + '%'}</span>
              </td>
              {grandWeeks.map((w, i) => (
                <td key={i} className="px-3 py-2.5 text-right font-bold text-slate-700 border-t-2 border-slate-200">{w ? vndShort(w) : '—'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
        <span>Mục tiêu lấy từ bảng KPI mới (màn “KPI tháng — Team Content”) · doanh số cộng theo ngày.</span>
        {notSet > 0 && <span className="text-amber-600 font-semibold">{notSet} kênh chưa đặt chỉ tiêu tháng này</span>}
      </div>
    </div>
  );
}
