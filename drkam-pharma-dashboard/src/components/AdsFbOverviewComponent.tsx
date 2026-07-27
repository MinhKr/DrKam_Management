import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { AdsFbTaskLog, AdsFbTarget, Employee, UserSession } from '../types';
import { inPeriod, adsFbScore, adsFbRank, fmtMoney, fmtNum, fmtScore } from '../lib/adsFacebook';
import { KpiBox, ChartCard, tooltipStyle, compact } from './dashboardKit';

export const ADS_FB_DEPT = 'Ads Facebook';

interface Props {
  logs: AdsFbTaskLog[];
  targets: AdsFbTarget[];
  employees: Employee[];
  session: UserSession;
  onNavigateToTab: (tab: string) => void;
  onAddTarget: (t: AdsFbTarget) => void;
  onUpdateTarget: (id: string, patch: Partial<AdsFbTarget>) => void;
  onDeleteTarget: (id: string) => void;
}

const nowMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const fmtVnd = (v: number) => v >= 1_000_000 ? (v / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }).replace(',0', '') + 'tr' : v.toLocaleString('vi-VN');

export default function AdsFbOverviewComponent({ logs, targets, employees, session, onNavigateToTab, onAddTarget, onUpdateTarget, onDeleteTarget }: Props) {
  const [period, setPeriod] = useState(() => {
    const ms = [...new Set(logs.map((l) => { const [d, m, y] = l.date.split('/'); return d ? `${y}-${m}` : ''; }).filter(Boolean))].sort().reverse();
    return ms[0] ?? nowMonthKey();
  });
  const [targetModal, setTargetModal] = useState<AdsFbTarget | null>(null);

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

  const perStaff = staff.map((emp) => {
    const empRows = rows.filter((r) => r.employeeId === emp.id);
    const spend = empRows.reduce((s, l) => s + l.spend, 0);
    const revenue = empRows.reduce((s, l) => s + l.revenue, 0);
    const scores = empRows.map((l) => adsFbScore(l, targetFor(emp.id)).total);
    const avg = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : null;
    return {
      emp, days: empRows.length, spend, revenue,
      roas: spend > 0 ? revenue / spend : null,
      avgScore: avg, rank: avg == null ? null : adsFbRank(avg),
      target: targetFor(emp.id),
    };
  });

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
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 soft-shadow">
          <span className="material-symbols-outlined text-[18px] text-[#D32027]">calendar_month</span>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="text-sm font-semibold border-none outline-none bg-transparent text-slate-700" />
        </div>
      </div>

      {/* KPI boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiBox label="Tổng chi tiêu" value={fmtVnd(totalSpend) + ' đ'} icon="payments" accent="bg-rose-50 text-[#D32027]">
          <span className="text-[11px] text-slate-400">{rows.length} báo cáo</span>
        </KpiBox>
        <KpiBox label="Giá 1 data" value={cpData === null ? '—' : fmtVnd(Math.round(cpData)) + ' đ'} icon="sell" accent="bg-violet-50 text-violet-600">
          <span className="text-[11px] text-slate-400">{totalData.toLocaleString('vi-VN')} data · Chi tiêu / data</span>
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

      {/* Ranking nhân sự + target */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 font-display">Hiệu suất theo nhân sự · {`Tháng ${period.slice(5)}/${period.slice(0, 4)}`}</h3>
          <button onClick={() => onNavigateToTab('adsfb-daily')} className="text-[11px] font-bold text-[#D32027] hover:underline flex items-center gap-0.5">
            Xem báo cáo ngày <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left font-bold">Nhân sự</th>
                <th className="px-3 py-2.5 text-right font-bold">Số ngày</th>
                <th className="px-3 py-2.5 text-right font-bold">Chi tiêu</th>
                <th className="px-3 py-2.5 text-right font-bold">Doanh thu</th>
                <th className="px-3 py-2.5 text-right font-bold">ROAS</th>
                <th className="px-3 py-2.5 text-right font-bold">Target DT/tháng</th>
                <th className="px-3 py-2.5 text-center font-bold">Điểm TB</th>
                <th className="px-3 py-2.5 text-left font-bold">Xếp loại</th>
                {isAdmin && <th className="px-3 py-2.5"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {perStaff.map(({ emp, days, spend, revenue, roas: r, avgScore: sc, rank, target }) => (
                <tr key={emp.id} className="hover:bg-rose-50/20">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <img src={emp.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                      <span className="font-semibold text-slate-700">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{days}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{fmtMoney(spend)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{fmtMoney(revenue)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-sky-700">{fmtNum(r)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                    {target ? fmtVnd(target.revenueTarget) + ' đ' : <span className="text-amber-500">chưa đặt</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums font-extrabold text-[#D32027]">{fmtScore(sc)}</td>
                  <td className="px-3 py-2.5">
                    {rank ? <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${rank.color}`}>{rank.label}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => setTargetModal(target ?? blankTarget(emp.id, emp.name, period))}
                        className="text-[11px] font-bold text-slate-500 hover:text-[#D32027] inline-flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[15px]">tune</span>{target ? 'Sửa target' : 'Đặt target'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {perStaff.length === 0 && (
                <tr><td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-slate-400">Chưa có nhân sự nào thuộc team Ads Facebook.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {targetModal && (
        <TargetModal
          target={targetModal}
          onClose={() => setTargetModal(null)}
          onSubmit={(t) => {
            if (t.id) onUpdateTarget(t.id, t);
            else onAddTarget({ ...t, id: 'afbt_' + Date.now() });
            setTargetModal(null);
          }}
          onDelete={targetModal.id ? () => { onDeleteTarget(targetModal.id); setTargetModal(null); } : undefined}
        />
      )}
    </div>
  );
}

function blankTarget(employeeId: string, employeeName: string, period: string): AdsFbTarget {
  return { id: '', period, employeeId, employeeName, spendTarget: 0, revenueTarget: 0, ordersTarget: 0, daysInMonth: 30, note: '' };
}

/* ── Popup đặt/sửa target tháng ── */
function TargetModal({ target, onClose, onSubmit, onDelete }: {
  target: AdsFbTarget;
  onClose: () => void;
  onSubmit: (t: AdsFbTarget) => void;
  onDelete?: () => void;
}) {
  const [f, setF] = useState<AdsFbTarget>(target);
  const set = (patch: Partial<AdsFbTarget>) => setF((p) => ({ ...p, ...patch }));
  const cls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] bg-white text-right tabular-nums';
  const numChange = (k: keyof AdsFbTarget) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set({ [k]: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 } as Partial<AdsFbTarget>);
  const perDay = (v: number) => f.daysInMonth > 0 ? Math.round(v / f.daysInMonth) : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">Target tháng</h3>
            <p className="text-[11px] text-slate-400 mt-0.5"><b className="text-slate-600">{f.employeeName}</b> · Tháng {f.period.slice(5)}/{f.period.slice(0, 4)}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Chi tiêu / tháng (đ)</span>
              <input type="text" inputMode="numeric" value={f.spendTarget ? f.spendTarget.toLocaleString('vi-VN') : ''} onChange={numChange('spendTarget')} className={cls} placeholder="0" />
              <span className="text-[10px] text-slate-400 text-right">≈ {perDay(f.spendTarget).toLocaleString('vi-VN')} đ/ngày</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Doanh thu / tháng (đ)</span>
              <input type="text" inputMode="numeric" value={f.revenueTarget ? f.revenueTarget.toLocaleString('vi-VN') : ''} onChange={numChange('revenueTarget')} className={cls} placeholder="0" />
              <span className="text-[10px] text-slate-400 text-right">≈ {perDay(f.revenueTarget).toLocaleString('vi-VN')} đ/ngày</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Đơn / tháng</span>
              <input type="text" inputMode="numeric" value={f.ordersTarget ? f.ordersTarget.toLocaleString('vi-VN') : ''} onChange={numChange('ordersTarget')} className={cls} placeholder="0" />
              <span className="text-[10px] text-slate-400 text-right">≈ {perDay(f.ordersTarget).toLocaleString('vi-VN')} đơn/ngày</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Số ngày / tháng</span>
              <input type="text" inputMode="numeric" value={f.daysInMonth || ''} onChange={numChange('daysInMonth')} className={cls} placeholder="30" />
              <span className="text-[10px] text-slate-400 text-right">dùng để chia target/ngày</span>
            </label>
          </div>
          <p className="text-[11px] text-slate-400">Target/ngày (target tháng ÷ số ngày) là mẫu số tính <b>% đạt</b> → Trục C của mỗi báo cáo.</p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center gap-2">
          {onDelete
            ? <button type="button" onClick={onDelete} className="px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">Xóa target</button>
            : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</button>
            <button type="submit" className="px-6 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-lg transition-colors">Lưu target</button>
          </div>
        </div>
      </form>
    </div>
  );
}
