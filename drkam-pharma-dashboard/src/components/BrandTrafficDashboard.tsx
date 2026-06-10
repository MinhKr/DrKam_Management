'use client';
import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { DailyReport } from '../types';
import { kpiTotals, dailySeries, byChannel, prevRange, pctDelta } from '../lib/analytics';
import { numFormat, compact, BAR_COLORS, tooltipStyle, Delta, ChartCard, Empty } from './dashboardKit';

export default function BrandTrafficDashboard({ reports, from, to, showRevenue = true }: {
  reports: DailyReport[]; from: string; to: string;
  // FB Kênh thương hiệu chỉ có traffic → tắt mọi phần doanh thu, đổi sang lấy Views làm trục chính.
  showRevenue?: boolean;
}) {
  const kpi = kpiTotals(reports, from, to);
  const prev = prevRange(from, to);
  const kpiPrev = kpiTotals(reports, prev.from, prev.to);
  const series = dailySeries(reports, from, to);
  const channels = byChannel(reports, from, to);

  // Thẻ đầu: doanh thu (TikTok) hoặc Lưu (FB traffic-only) — giữ luôn 6 thẻ cho lưới 6 cột.
  type CardT = { label: string; value: string; icon: string; accent: string; delta?: number | null; deltaPts?: number };
  const firstCard: CardT = showRevenue
    ? { label: 'Doanh thu', value: numFormat(kpi.revenue), delta: pctDelta(kpi.revenue, kpiPrev.revenue), icon: 'payments', accent: 'text-[#D32027] bg-rose-50' }
    : { label: 'Lưu (Save)', value: compact(kpi.save), delta: pctDelta(kpi.save, kpiPrev.save), icon: 'bookmark', accent: 'text-rose-600 bg-rose-50' };
  const cards: CardT[] = [
    firstCard,
    { label: 'Views / Reach', value: compact(kpi.views), delta: pctDelta(kpi.views, kpiPrev.views), icon: 'visibility', accent: 'text-blue-600 bg-blue-50' },
    { label: 'Tương tác', value: compact(kpi.engagement), delta: pctDelta(kpi.engagement, kpiPrev.engagement), icon: 'favorite', accent: 'text-pink-600 bg-pink-50' },
    { label: 'Follow tăng', value: '+' + compact(kpi.followerIncr), delta: pctDelta(kpi.followerIncr, kpiPrev.followerIncr), icon: 'group_add', accent: 'text-green-600 bg-green-50' },
    { label: 'Xem hết TB', value: kpi.viewAllRate + '%', deltaPts: Math.round((kpi.viewAllRate - kpiPrev.viewAllRate) * 10) / 10, icon: 'percent', accent: 'text-amber-600 bg-amber-50' },
    { label: 'TG xem TB', value: kpi.avgViewDuration + 's', deltaPts: Math.round((kpi.avgViewDuration - kpiPrev.avgViewDuration) * 10) / 10, icon: 'timer', accent: 'text-teal-600 bg-teal-50' },
  ];

  // Phễu tương tác (theo % so với Views)
  const funnel = [
    { label: 'Views', value: kpi.views, color: '#2563EB' },
    { label: 'Like', value: kpi.like, color: '#DB2777' },
    { label: 'Comment', value: kpi.comment, color: '#7C3AED' },
    { label: 'Share', value: kpi.share, color: '#0F766E' },
    { label: 'Lưu', value: kpi.save, color: '#D32027' },
  ];
  const funnelMax = Math.max(1, kpi.views);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[#D32027]">monitoring</span>
        <h2 className="text-base font-bold text-slate-900 font-display">Phân tích chỉ số</h2>
        <span className="text-[11px] text-slate-400">· so với kỳ trước cùng độ dài</span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200/60 soft-shadow p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{c.label}</span>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.accent}`}>
                <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
              </span>
            </div>
            <div className="text-lg font-extrabold text-slate-900 tracking-tight tabular-nums truncate" title={c.value}>{c.value}</div>
            <Delta delta={c.delta} deltaPts={c.deltaPts} />
          </div>
        ))}
      </div>

      {/* Biểu đồ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={showRevenue ? 'Doanh thu theo ngày' : 'Views / Reach theo ngày'} icon="show_chart">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={series} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D32027" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#D32027" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v as number)} width={44} />
              <Tooltip
                formatter={(v) => (showRevenue ? [numFormat(v as number), 'Doanh thu'] : [compact(v as number), 'Views/Reach'])}
                labelFormatter={(l) => 'Ngày ' + l} contentStyle={tooltipStyle}
              />
              <Area type="monotone" dataKey={showRevenue ? 'revenue' : 'views'} stroke="#D32027" strokeWidth={2.4} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Views & Tương tác theo ngày" icon="ssid_chart">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v as number)} width={44} />
              <Tooltip formatter={(v, n) => [compact(v as number), n === 'views' ? 'Views' : 'Tương tác']} labelFormatter={(l) => 'Ngày ' + l} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="views" stroke="#2563EB" strokeWidth={2.2} dot={false} />
              <Line type="monotone" dataKey="engagement" stroke="#DB2777" strokeWidth={2.2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500 mt-1 px-1">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />Views</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#DB2777]" />Tương tác (like+cmt+share)</span>
          </div>
        </ChartCard>

        <ChartCard title={showRevenue ? 'Doanh thu theo kênh' : 'Views theo kênh'} icon="leaderboard">
          {channels.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.max(160, channels.length * 44)}>
              <BarChart data={channels} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v as number)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={130} />
                <Tooltip
                  formatter={(v) => (showRevenue ? [numFormat(v as number), 'Doanh thu'] : [compact(v as number), 'Views/Reach'])}
                  contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey={showRevenue ? 'revenue' : 'views'} radius={[0, 6, 6, 0]} barSize={20}>
                  {channels.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Phễu tương tác" icon="filter_alt">
          <div className="space-y-2.5 py-1">
            {funnel.map((f) => {
              const pct = kpi.views ? Math.round((f.value / funnelMax) * 100) : 0;
              const rel = kpi.views && f.label !== 'Views' ? ((f.value / kpi.views) * 100).toFixed(1) + '%' : '';
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="font-semibold text-slate-600">{f.label}</span>
                    <span className="font-mono tabular-nums text-slate-500">{compact(f.value)}{rel && <span className="text-slate-300 ml-1">({rel})</span>}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, pct)}%`, backgroundColor: f.color }} />
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-slate-400 pt-1">Tỷ lệ tính trên tổng Views/Reach của kỳ.</p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

