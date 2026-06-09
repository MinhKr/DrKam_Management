'use client';
import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { DailyReport } from '../types';
import { kpiTotals, dailySeries, byChannel, prevRange, pctDelta } from '../lib/analytics';
import { numFormat, compact, BAR_COLORS, tooltipStyle, Delta, KpiBox, ChartCard, Empty } from './dashboardKit';

// Dashboard cho kênh KOC (chỉ doanh thu): tổng quan doanh thu, xu hướng, xếp hạng & tỷ trọng kênh.
export default function KocRevenueDashboard({ reports, from, to, channelCount }: {
  reports: DailyReport[]; from: string; to: string; channelCount: number;
}) {
  const kpi = kpiTotals(reports, from, to);
  const prev = prevRange(from, to);
  const kpiPrev = kpiTotals(reports, prev.from, prev.to);
  const series = dailySeries(reports, from, to);
  const channels = byChannel(reports, from, to);
  const active = channels.filter((c) => c.revenue > 0);
  const totalRev = kpi.revenue;
  const avgPerActive = active.length ? Math.round(totalRev / active.length) : 0;
  const leader = active[0];
  const leaderShare = leader && totalRev ? Math.round((leader.revenue / totalRev) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[#D32027]">monitoring</span>
        <h2 className="text-base font-bold text-slate-900 font-display">Phân tích doanh thu</h2>
        <span className="text-[11px] text-slate-400">· so với kỳ trước cùng độ dài</span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiBox label="Tổng doanh thu" value={numFormat(totalRev)} icon="payments" accent="text-[#D32027] bg-rose-50">
          <Delta delta={pctDelta(totalRev, kpiPrev.revenue)} />
        </KpiBox>
        <KpiBox label="Kênh ra số" value={`${active.length}/${channelCount}`} icon="cell_tower" accent="text-blue-600 bg-blue-50">
          <span className="text-[11px] text-slate-400 font-medium">có doanh thu trong kỳ</span>
        </KpiBox>
        <KpiBox label="DT trung bình / kênh" value={numFormat(avgPerActive)} icon="equalizer" accent="text-teal-600 bg-teal-50">
          <span className="text-[11px] text-slate-400 font-medium">trên kênh đã ra số</span>
        </KpiBox>
        <KpiBox label="Kênh dẫn đầu" value={leader?.name || '—'} icon="trophy" accent="text-amber-600 bg-amber-50">
          {leader
            ? <span className="text-[11px] font-semibold text-slate-500">{numFormat(leader.revenue)} · {leaderShare}%</span>
            : <span className="text-[11px] text-slate-300 font-medium">chưa có số</span>}
        </KpiBox>
      </div>

      {/* Biểu đồ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Doanh thu theo ngày" icon="show_chart" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={series} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="kocRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D32027" stopOpacity={0.26} />
                  <stop offset="100%" stopColor="#D32027" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v as number)} width={44} />
              <Tooltip formatter={(v) => [numFormat(v as number), 'Doanh thu']} labelFormatter={(l) => 'Ngày ' + l} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="revenue" stroke="#D32027" strokeWidth={2.4} fill="url(#kocRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Doanh thu theo kênh" icon="leaderboard">
          {active.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.max(160, channels.length * 38)}>
              <BarChart data={channels} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v as number)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={130} />
                <Tooltip formatter={(v) => [numFormat(v as number), 'Doanh thu']} contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={18}>
                  {channels.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tỷ trọng đóng góp" icon="donut_large">
          {active.length === 0 ? <Empty /> : (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={active} dataKey="revenue" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {active.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [numFormat(v as number), 'Doanh thu']} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {active.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                      <span className="font-semibold text-slate-600 truncate" title={c.name}>{c.name}</span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 flex-shrink-0">{totalRev ? Math.round((c.revenue / totalRev) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
