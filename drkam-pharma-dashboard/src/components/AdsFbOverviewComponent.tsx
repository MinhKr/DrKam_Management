import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { AdsFbTaskLog, AdsFbTarget, AdsFbFormType, Employee, UserSession } from '../types';
import {
  inPeriod, adsFbScore, adsFbRank, avgOf, ADS_FB_ALERT, ADS_FB_BENCHMARK,
  fmtMoney, fmtNum, fmtPct, fmtScore,
} from '../lib/adsFacebook';
import { KpiBox, ChartCard, MonthPicker, tooltipStyle, compact } from './dashboardKit';

export const ADS_FB_DEPT = 'Ads Facebook';

interface Props {
  logs: AdsFbTaskLog[];
  targets: AdsFbTarget[];
  employees: Employee[];
  session: UserSession;
  onNavigateToTab: (tab: string) => void;
  // Target tháng CHỈ đặt ở tab "KPI tháng" (AdsFbKpiComponent) — màn này chỉ đọc,
  // tránh 2 đường vào cho cùng một bản ghi ads_fb_targets.
}

const nowMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const fmtVnd = (v: number) => v >= 1_000_000 ? (v / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }).replace(',0', '') + 'tr' : v.toLocaleString('vi-VN');
// Badge % đạt KPI — cùng thang màu với Tổng quan team Content.
const pctColor = (p: number | null) =>
  p == null ? 'text-slate-400 bg-slate-50'
    : p >= 100 ? 'text-green-700 bg-green-50'
    : p >= 70 ? 'text-amber-700 bg-amber-50'
    : 'text-rose-700 bg-rose-50';

export default function AdsFbOverviewComponent({ logs, targets, employees, session, onNavigateToTab }: Props) {
  const [period, setPeriod] = useState(() => {
    const ms = [...new Set(logs.map((l) => { const [d, m, y] = l.date.split('/'); return d ? `${y}-${m}` : ''; }).filter(Boolean))].sort().reverse();
    return ms[0] ?? nowMonthKey();
  });
  const [openAlert, setOpenAlert] = useState<string | null>(null);

  const isAdmin = session.role === 'Admin';
  const staff = useMemo(() => employees
    .filter((e) => e.department === ADS_FB_DEPT && e.status === 'Hoạt động')
    .sort((a, b) => (a.role === 'Leader' ? -1 : 1) - (b.role === 'Leader' ? -1 : 1)), [employees]);

  const rows = useMemo(() => logs.filter((l) => inPeriod(l.date, period)), [logs, period]);
  const targetFor = (empId: string) => targets.find((t) => t.employeeId === empId && t.period === period) ?? null;

  const totalSpend = rows.reduce((s, l) => s + l.spend, 0);
  const totalRevenue = rows.reduce((s, l) => s + l.revenue, 0);
  const totalOrders = rows.reduce((s, l) => s + l.orders, 0);
  const totalData = rows.reduce((s, l) => s + l.dataCount, 0);
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : null;
  const cpData = totalData > 0 ? totalSpend / totalData : null;
  // CPA chung = tổng chi tiêu ÷ tổng đơn (khác CPA TB/ngày ở bảng so sánh nhân viên).
  const cpa = totalOrders > 0 ? totalSpend / totalOrders : null;
  // KPI doanh thu tháng của cả team = tổng target DT của mọi nhân sự có đặt target trong kỳ.
  const revenueTarget = targets.filter((t) => t.period === period).reduce((s, t) => s + (t.revenueTarget || 0), 0);
  const revenuePct = revenueTarget > 0 ? Math.round((totalRevenue / revenueTarget) * 1000) / 10 : null;
  const teamScores = rows.map((l) => adsFbScore(l, targetFor(l.employeeId)).total);
  const avgScore = teamScores.length ? teamScores.reduce((s, x) => s + x, 0) / teamScores.length : null;

  // Chuỗi theo ngày: chi tiêu vs doanh thu + ROAS.
  const daySeries = useMemo(() => {
    const map = new Map<string, { spend: number; revenue: number }>();
    rows.forEach((r) => {
      const key = r.date.slice(0, 5); // dd/mm
      const cur = map.get(key) ?? { spend: 0, revenue: 0 };
      cur.spend += r.spend; cur.revenue += r.revenue;
      map.set(key, cur);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, v]) => ({
      day,
      'Chi tiêu': Math.round(v.spend),
      'Doanh thu': Math.round(v.revenue),
      ROAS: v.spend > 0 ? +(v.revenue / v.spend).toFixed(2) : 0,
    }));
  }, [rows]);

  // ── SO SÁNH NHÂN VIÊN (trung bình toàn kỳ) — bám đúng sheet Dashboard ──
  // Lưu ý: "Số ngày hoạt động" và các TB/ngày chỉ tính ngày ĐÃ nhập chi tiêu
  // (COUNTIFS D<>"" / AVERAGEIF bỏ qua ô trống); ROAS TB & CPA TB là trung bình
  // của các ngày (AVERAGEIF cột R/T), KHÁC với ROAS chung = tổng DT ÷ tổng chi.
  const perStaff = staff.map((emp) => {
    const empRows = rows.filter((r) => r.employeeId === emp.id);
    const spentRows = empRows.filter((r) => r.spend > 0);
    const target = targetFor(emp.id);
    const scored = empRows.map((l) => adsFbScore(l, target));
    const revenue = empRows.reduce((s, l) => s + l.revenue, 0);
    const avgScore = avgOf(scored.map((s) => s.total));
    return {
      emp, target,
      days: spentRows.length,
      avgSpend: avgOf(spentRows.map((l) => l.spend)),
      avgRevenue: avgOf(spentRows.map((l) => l.revenue)),
      avgRoas: avgOf(scored.map((s) => s.kpis.roas)),
      avgCpa: avgOf(scored.map((s) => s.kpis.cpa)),
      revenue,
      pctRevenue: target && target.revenueTarget > 0 ? revenue / target.revenueTarget : null,
      avgScore,
      rank: avgScore == null ? null : adsFbRank(avgScore),
    };
  });

  // ── SO SÁNH THEO HÌNH THỨC CHẠY ──
  const byFormType = (['Chuyển đổi', 'Sỉ', 'Mess'] as AdsFbFormType[]).map((ft) => {
    const ftRows = rows.filter((r) => r.formType === ft);
    const scored = ftRows.map((l) => adsFbScore(l, targetFor(l.employeeId)));
    return {
      formType: ft,
      days: ftRows.length,
      avgSpend: avgOf(ftRows.filter((l) => l.spend > 0).map((l) => l.spend)),
      avgRoas: avgOf(scored.map((s) => s.kpis.roas)),
      avgCpa: avgOf(scored.map((s) => s.kpis.cpa)),
      avgScore: avgOf(scored.map((s) => s.total)),
    };
  });

  // Giá trị dẫn đầu từng cột — chỉ tô sáng khi có ≥2 người/hình thức để so.
  const bestOf = (vals: Array<number | null>, dir: 'high' | 'low'): number | null => {
    const n = vals.filter((v): v is number => v != null);
    return n.length >= 2 ? (dir === 'high' ? Math.max(...n) : Math.min(...n)) : null;
  };
  const best = {
    avgRevenue: bestOf(perStaff.map((s) => s.avgRevenue), 'high'),
    avgRoas: bestOf(perStaff.map((s) => s.avgRoas), 'high'),
    avgCpa: bestOf(perStaff.map((s) => s.avgCpa), 'low'),
    revenue: bestOf(perStaff.map((s) => s.revenue), 'high'),
    pctRevenue: bestOf(perStaff.map((s) => s.pctRevenue), 'high'),
    avgScore: bestOf(perStaff.map((s) => s.avgScore), 'high'),
  };
  const bestFt = {
    avgRoas: bestOf(byFormType.map((f) => f.avgRoas), 'high'),
    avgCpa: bestOf(byFormType.map((f) => f.avgCpa), 'low'),
    avgScore: bestOf(byFormType.map((f) => f.avgScore), 'high'),
  };

  // ── TOP CẢNH BÁO — số ngày-NV vượt ngưỡng đỏ ──
  const alerts = useMemo(() => {
    const flagged = rows.map((l) => ({ log: l, sc: adsFbScore(l, targetFor(l.employeeId)) }));
    const mk = (
      key: string, label: string, icon: string,
      pick: (x: { log: AdsFbTaskLog; sc: ReturnType<typeof adsFbScore> }) => boolean,
      show: (x: { log: AdsFbTaskLog; sc: ReturnType<typeof adsFbScore> }) => string,
    ) => {
      const hits = flagged.filter(pick);
      return {
        key, label, icon, count: hits.length,
        items: hits
          .sort((a, b) => a.log.date.localeCompare(b.log.date))
          .map((x) => ({ date: x.log.date.slice(0, 5), name: x.log.employeeName, value: show(x) })),
      };
    };
    return [
      mk('roas', `ROAS đỏ (< ${ADS_FB_ALERT.roasBelow})`, 'trending_down',
        (x) => x.sc.kpis.roas != null && x.sc.kpis.roas < ADS_FB_ALERT.roasBelow,
        (x) => fmtNum(x.sc.kpis.roas)),
      mk('cpa', `CPA đỏ (> ${Math.round(ADS_FB_ALERT.cpaAbove / 1000)}k)`, 'local_atm',
        (x) => x.sc.kpis.cpa != null && x.sc.kpis.cpa > ADS_FB_ALERT.cpaAbove,
        (x) => fmtMoney(x.sc.kpis.cpa) + ' đ'),
      mk('score', `Điểm tổng Kém (< ${ADS_FB_ALERT.scoreBelow})`, 'warning',
        (x) => x.sc.total < ADS_FB_ALERT.scoreBelow,
        (x) => fmtScore(x.sc.total) + ' điểm'),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, targets]);

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-6 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">dashboard</span>
            <span>Tổng quan — Team Ads Facebook</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Chi tiêu · doanh thu · ROAS · điểm hiệu suất — tổng hợp từ báo cáo ngày.</p>
        </div>
        {/* allowFuture: màn này còn dùng để đặt target tháng tới cho nhân sự. */}
        <MonthPicker value={period} onChange={setPeriod} allowFuture />
      </div>

      {/* Tổng doanh thu hiện tại vs KPI tháng — cùng kiểu thanh tiến trình với Tổng quan team Content */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tổng doanh thu hiện tại · tháng {period.slice(5)}/{period.slice(0, 4)}
            </p>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums mt-1">{fmtMoney(totalRevenue)} đ</div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
              <span className="material-symbols-outlined text-[13px] text-green-600">sync</span>
              Tự cập nhật theo báo cáo mỗi ngày
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">KPI tháng</p>
            <div className="text-lg font-bold text-slate-700 tabular-nums">{revenueTarget > 0 ? fmtMoney(revenueTarget) + ' đ' : '—'}</div>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-sm font-extrabold ${pctColor(revenuePct)}`}>
              {revenuePct == null ? '—' : revenuePct + '%'}
            </span>
          </div>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-4">
          <div className="h-full rounded-full bg-[#D32027] transition-all duration-500" style={{ width: `${Math.min(revenuePct ?? 0, 100)}%` }} />
        </div>
        {revenueTarget === 0 && (
          <p className="text-[11px] text-amber-600 mt-2">
            Chưa đặt KPI doanh thu cho tháng này
            {isAdmin ? (
              <> — đặt ở tab{' '}
                <button onClick={() => onNavigateToTab('adsfb-kpi')} className="font-bold underline hover:text-[#D32027]">
                  KPI tháng
                </button>.
              </>
            ) : ' — nhờ Admin đặt ở tab KPI tháng.'}
          </p>
        )}
      </div>

      {/* KPI boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiBox label="Tổng chi tiêu" value={fmtVnd(totalSpend) + ' đ'} icon="payments" accent="bg-rose-50 text-[#D32027]">
          <span className="text-[11px] text-slate-400">{rows.length} báo cáo</span>
        </KpiBox>
        <KpiBox label="Giá 1 data" value={cpData === null ? '—' : fmtVnd(Math.round(cpData)) + ' đ'} icon="sell" accent="bg-violet-50 text-violet-600">
          <span className="text-[11px] text-slate-400">{totalData.toLocaleString('vi-VN')} data · Chi tiêu / data</span>
        </KpiBox>
        <KpiBox label="CPA (giá 1 đơn)" value={cpa === null ? '—' : fmtVnd(Math.round(cpa)) + ' đ'} icon="local_atm" accent="bg-orange-50 text-orange-600">
          {cpa === null
            ? <span className="text-[11px] text-slate-400">Chi tiêu / đơn</span>
            : <span className={`text-[11px] font-semibold ${cpa <= ADS_FB_BENCHMARK.cpa ? 'text-emerald-600' : cpa <= ADS_FB_ALERT.cpaAbove ? 'text-amber-600' : 'text-rose-600'}`}>
                Ngưỡng {Math.round(ADS_FB_BENCHMARK.cpa / 1000)}k · {cpa <= ADS_FB_BENCHMARK.cpa ? 'đạt' : cpa <= ADS_FB_ALERT.cpaAbove ? 'cần cải thiện' : 'vượt ngưỡng đỏ'}
              </span>}
        </KpiBox>
        <KpiBox label="Tổng doanh thu" value={fmtVnd(totalRevenue) + ' đ'} icon="trending_up" accent="bg-emerald-50 text-emerald-600">
          <span className="text-[11px] text-slate-400">{totalOrders.toLocaleString('vi-VN')} đơn</span>
        </KpiBox>
        <KpiBox label="ROAS chung" value={fmtNum(roas)} icon="query_stats" accent="bg-sky-50 text-sky-600">
          <span className="text-[11px] text-slate-400">Doanh thu / Chi tiêu</span>
        </KpiBox>
        <KpiBox label="Điểm TB team" value={fmtScore(avgScore)} icon="military_tech" accent="bg-amber-50 text-amber-600">
          <span className="text-[11px] text-slate-400">Trung bình các báo cáo</span>
        </KpiBox>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <ChartCard title="Chi tiêu vs Doanh thu theo ngày" icon="bar_chart" className="lg:col-span-3">
          {daySeries.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-slate-300 text-sm">Chưa có dữ liệu.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={daySeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="afbSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D32027" stopOpacity={0.25} /><stop offset="95%" stopColor="#D32027" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="afbRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} /><stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => compact(v as number)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown, n: unknown) => [fmtMoney(v as number) + ' đ', n as string]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Chi tiêu" stroke="#D32027" strokeWidth={2} fill="url(#afbSpend)" />
                <Area type="monotone" dataKey="Doanh thu" stroke="#16A34A" strokeWidth={2} fill="url(#afbRev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="ROAS theo ngày" icon="show_chart" className="lg:col-span-2">
          {daySeries.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-slate-300 text-sm">Chưa có dữ liệu.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={daySeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [v as number, 'ROAS']} />
                <Line type="monotone" dataKey="ROAS" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* SO SÁNH NHÂN VIÊN (trung bình toàn kỳ) — mỗi nhân sự 1 dòng, chỉ tiêu là cột */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">So sánh nhân viên · {`Tháng ${period.slice(5)}/${period.slice(0, 4)}`}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Trung bình toàn kỳ — ô <span className="text-emerald-600 font-semibold">nền xanh</span> là người dẫn đầu chỉ tiêu đó.</p>
          </div>
          <button onClick={() => onNavigateToTab('adsfb-daily')} className="text-[11px] font-bold text-[#D32027] hover:underline flex items-center gap-0.5">
            Xem báo cáo ngày <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0 min-w-[1080px]">
            <thead>
              <tr>
                <th className={TH_NAME}>Nhân sự</th>
                <th className={TH}>Số ngày<span className="block font-normal normal-case text-[9px] text-slate-300">đã nhập chi tiêu</span></th>
                <th className={TH}>Chi tiêu<br />TB/ngày</th>
                <th className={TH}>Doanh thu<br />TB/ngày</th>
                <th className={TH}>ROAS TB<span className="block font-normal normal-case text-[9px] text-slate-300">TB từng ngày</span></th>
                <th className={TH}>CPA TB<span className="block font-normal normal-case text-[9px] text-slate-300">thấp là tốt</span></th>
                <th className={`${TH} border-l-2 border-l-slate-200`}>Tổng DT kỳ</th>
                <th className={TH}>Target<br />DT/tháng</th>
                <th className={TH}>% đạt<br />DT tháng</th>
                <th className={`${TH} border-l-2 border-l-slate-200`}>Điểm TB</th>
                <th className={`${TH} text-left`}>Xếp loại</th>
              </tr>
            </thead>
            <tbody>
              {perStaff.map((s) => (
                <tr key={s.emp.id} className={ROW}>
                  <td className={NAME_CELL}>
                    <div className="flex items-center gap-2">
                      <img src={s.emp.avatar} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white ring-1 ring-slate-200 shrink-0" />
                      <span className="font-bold text-slate-700 truncate" title={s.emp.name}>{s.emp.name}</span>
                    </div>
                  </td>
                  <NumCell v={s.days} format={(v) => v.toLocaleString('vi-VN')} />
                  <NumCell v={s.avgSpend} format={fmtMoney} />
                  <NumCell v={s.avgRevenue} format={fmtMoney} best={best.avgRevenue} />
                  <NumCell v={s.avgRoas} format={(v) => fmtNum(v)} best={best.avgRoas} strong />
                  <NumCell v={s.avgCpa} format={fmtMoney} best={best.avgCpa} />
                  <NumCell v={s.revenue} format={fmtMoney} best={best.revenue} rule />
                  <NumCell v={s.target && s.target.revenueTarget > 0 ? s.target.revenueTarget : null}
                    format={(v) => fmtVnd(v) + ' đ'} empty={<span className="text-amber-500">chưa đặt</span>} />
                  <NumCell v={s.pctRevenue} format={(v) => fmtPct(v)} best={best.pctRevenue} strong
                    tone={s.pctRevenue == null ? undefined : s.pctRevenue >= 1 ? 'text-emerald-600' : s.pctRevenue >= 0.8 ? 'text-amber-600' : 'text-rose-600'} />
                  <NumCell v={s.avgScore} format={(v) => fmtScore(v)} best={best.avgScore} strong rule />
                  <td className={`${CELL} text-left`}>
                    {s.rank
                      ? <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.rank.color}`}>{s.rank.label}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
              {perStaff.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400">Chưa có nhân sự nào thuộc team Ads Facebook.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SO SÁNH THEO HÌNH THỨC CHẠY */}
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-slate-400">splitscreen</span>So sánh theo hình thức chạy
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-0 min-w-[480px]">
              <thead>
                <tr>
                  <th className={TH_NAME}>Hình thức</th>
                  <th className={TH}>Số ngày-NV</th>
                  <th className={TH}>Chi tiêu TB</th>
                  <th className={TH}>ROAS TB</th>
                  <th className={TH}>CPA TB</th>
                  <th className={TH}>Điểm TB</th>
                </tr>
              </thead>
              <tbody>
                {byFormType.map((f) => (
                  <tr key={f.formType} className={ROW}>
                    <td className={`${NAME_CELL} font-bold text-slate-700`}>{f.formType}</td>
                    <NumCell v={f.days} format={(v) => v.toLocaleString('vi-VN')} />
                    <NumCell v={f.avgSpend} format={fmtMoney} />
                    <NumCell v={f.avgRoas} format={(v) => fmtNum(v)} best={bestFt.avgRoas} strong />
                    <NumCell v={f.avgCpa} format={fmtMoney} best={bestFt.avgCpa} />
                    <NumCell v={f.avgScore} format={(v) => fmtScore(v)} best={bestFt.avgScore} strong />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP CẢNH BÁO */}
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-rose-400">crisis_alert</span>Top cảnh báo
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Số ngày-NV vượt ngưỡng đỏ trong kỳ — bấm để xem chi tiết.</p>
          </div>
          <div className="divide-y divide-slate-50">
            {alerts.map((a) => (
              <div key={a.key}>
                <button
                  onClick={() => setOpenAlert(openAlert === a.key ? null : a.key)}
                  disabled={a.count === 0}
                  className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors ${a.count === 0 ? 'cursor-default' : 'hover:bg-rose-50/40'}`}>
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${a.count > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-300'}`}>
                      <span className="material-symbols-outlined text-[17px]">{a.icon}</span>
                    </span>
                    {a.label}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className={`text-lg font-extrabold tabular-nums ${a.count > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{a.count}</span>
                    {a.count > 0 && (
                      <span className={`material-symbols-outlined text-[18px] text-slate-300 transition-transform ${openAlert === a.key ? 'rotate-180' : ''}`}>expand_more</span>
                    )}
                  </span>
                </button>
                {openAlert === a.key && a.count > 0 && (
                  <ul className="px-4 pb-3 max-h-52 overflow-y-auto flex flex-col gap-1">
                    {a.items.map((it, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-[11px] bg-slate-50/70 rounded-lg px-2.5 py-1.5">
                        <span className="text-slate-500 tabular-nums">{it.date}</span>
                        <span className="font-semibold text-slate-700 flex-1 truncate">{it.name}</span>
                        <span className="tabular-nums font-bold text-rose-600">{it.value}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── Lớp dùng chung cho 2 bảng so sánh (mỗi đối tượng 1 dòng) ──
   Cột tên dính trái khi cuộn ngang; hover đổi màu cả dòng để mắt bám được hàng. */
const ROW = 'group transition-colors hover:bg-rose-50';
const CELL = 'px-3 py-2.5 border-b border-slate-100 transition-colors';
const NAME_BASE = 'sticky left-0 z-10 px-4 py-2.5 border-r border-b border-slate-100 transition-colors';
const NAME_CELL = `${NAME_BASE} bg-white group-hover:bg-rose-50`;
const TH_BASE = 'text-[10px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200';
const TH = `px-3 py-2.5 text-right whitespace-nowrap bg-slate-50 ${TH_BASE}`;
const TH_NAME = `${NAME_BASE} bg-slate-50 text-left ${TH_BASE}`;

/* ── 1 ô số: canh phải, tô sáng ô dẫn đầu cột (nếu có `best`). ── */
function NumCell({ v, format, best, strong, tone, empty, rule }: {
  v: number | null;
  format: (v: number) => string;
  best?: number | null;
  strong?: boolean;
  tone?: string;
  empty?: React.ReactNode;
  rule?: boolean;       // kẻ dọc đậm để tách nhóm cột
}) {
  const isBest = best != null && v != null && v === best;
  return (
    <td className={`${CELL} text-right tabular-nums ${rule ? 'border-l-2 border-l-slate-200' : ''} ${
      strong ? 'font-bold text-sm' : ''
    } ${isBest ? 'bg-emerald-50 group-hover:bg-emerald-100 text-emerald-700 font-bold' : tone || 'text-slate-700'}`}>
      {v == null ? (empty ?? <span className="text-slate-300">—</span>) : format(v)}
    </td>
  );
}
