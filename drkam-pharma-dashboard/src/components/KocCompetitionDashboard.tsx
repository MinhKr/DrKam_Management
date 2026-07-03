'use client';
// Dashboard "đua doanh thu" giữa các thành viên KOC inhouse (Facebook) — nhấn mạnh độ CẠNH TRANH:
// xếp hạng theo người phụ trách, đường đua doanh thu theo ngày (mỗi thành viên 1 đường), tỷ trọng đóng góp.
import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
} from 'recharts';
import { DailyReport } from '../types';
import { toIso, toDdmm, shiftIso, daysBetween, prevRange, pctDelta } from '../lib/analytics';
import { numFormat, compact, tooltipStyle, Delta, KpiBox, ChartCard, Empty } from './dashboardKit';

export type CompetitionMember = { channelName: string; managerName: string; auditId: string };

const MEDALS = ['🥇', '🥈', '🥉'];

// Bảng màu riêng cho việc SO SÁNH thành viên — các hue cách xa nhau để dễ phân biệt
// (BAR_COLORS có 3 màu đầu đều tông đỏ/cam nên không hợp cho đường đua nhiều người).
const MEMBER_COLORS = ['#D32027', '#2563EB', '#16A34A', '#F59E0B', '#7C3AED', '#0891B2', '#DB2777', '#65A30D'];

export default function KocCompetitionDashboard({ reports, from, to, members }: {
  reports: DailyReport[]; from: string; to: string; members: CompetitionMember[];
}) {
  const within = (iso: string, a: string, b: string) => iso >= a && iso <= b;
  const prev = prevRange(from, to);
  const revOf = (channelName: string, a: string, b: string) =>
    reports
      .filter((r) => r.channelName === channelName && within(toIso(r.date), a, b))
      .reduce((s, r) => s + r.revenue, 0);

  // Tổng hợp theo thành viên + xếp hạng (cao → thấp).
  const ranked = members
    .map((m) => ({
      ...m,
      revenue: revOf(m.channelName, from, to),
      prevRevenue: revOf(m.channelName, prev.from, prev.to),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRev = ranked.reduce((s, m) => s + m.revenue, 0);
  const leader = ranked[0];
  const runnerUp = ranked[1];
  const leaderShare = leader && totalRev ? Math.round((leader.revenue / totalRev) * 100) : 0;
  const gapTop = leader && runnerUp ? leader.revenue - runnerUp.revenue : 0;

  // Màu CỐ ĐỊNH theo từng thành viên (gán theo thứ tự nhóm, KHÔNG theo thứ hạng) —
  // để mỗi người luôn giữ một màu dù lên/xuống hạng. Dùng chung cho đường đua, bảng xếp hạng & donut.
  const colorOf = new Map(members.map((m, i) => [m.managerName, MEMBER_COLORS[i % MEMBER_COLORS.length]]));
  const nameByChannel = new Map(members.map((m) => [m.channelName, m.managerName]));

  // Chuỗi "đường đua": 1 điểm/ngày, mỗi thành viên 1 khóa = doanh thu ngày đó.
  const n = daysBetween(from, to);
  const racePoints: Record<string, number | string>[] = [];
  const acc = new Map<string, Record<string, number | string>>();
  for (let i = 0; i < n; i++) {
    const iso = shiftIso(from, i);
    const p: Record<string, number | string> = { label: toDdmm(iso) };
    members.forEach((m) => { p[m.managerName] = 0; });
    acc.set(iso, p);
    racePoints.push(p);
  }
  reports.forEach((r) => {
    const iso = toIso(r.date);
    const p = acc.get(iso);
    const mgr = nameByChannel.get(r.channelName);
    if (!p || !mgr) return;
    p[mgr] = (p[mgr] as number) + r.revenue;
  });

  const donutData = ranked.filter((m) => m.revenue > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[#D32027]">sports_score</span>
        <h2 className="text-base font-bold text-slate-900 font-display">Đua doanh thu giữa các thành viên</h2>
        <span className="text-[11px] text-slate-400">· so với kỳ trước cùng độ dài</span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiBox label="Tổng DT cả nhóm" value={numFormat(totalRev)} icon="payments" accent="text-[#D32027] bg-rose-50">
          <Delta delta={pctDelta(totalRev, ranked.reduce((s, m) => s + m.prevRevenue, 0))} />
        </KpiBox>
        <KpiBox label="Người dẫn đầu" value={leader?.managerName || '—'} icon="trophy" accent="text-amber-600 bg-amber-50">
          {leader && totalRev
            ? <span className="text-[11px] font-semibold text-slate-500">{numFormat(leader.revenue)} · {leaderShare}%</span>
            : <span className="text-[11px] text-slate-300 font-medium">chưa có số</span>}
        </KpiBox>
        <KpiBox label="Cách biệt top 1–2" value={gapTop > 0 ? numFormat(gapTop) : '—'} icon="social_leaderboard" accent="text-blue-600 bg-blue-50">
          {leader && runnerUp
            ? <span className="text-[11px] font-semibold text-slate-500">{leader.managerName} hơn {runnerUp.managerName}</span>
            : <span className="text-[11px] text-slate-300 font-medium">cần ≥ 2 người ra số</span>}
        </KpiBox>
      </div>

      {/* Đường đua doanh thu theo ngày — mỗi thành viên 1 đường */}
      <ChartCard title="Đường đua doanh thu theo ngày" icon="show_chart">
        {totalRev === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={racePoints} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v as number)} width={44} />
              <Tooltip formatter={(v, n2) => [numFormat(v as number), n2 as string]} labelFormatter={(l) => 'Ngày ' + l} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} iconType="circle" />
              {ranked.map((m) => (
                <Line key={m.managerName} type="monotone" dataKey={m.managerName}
                  stroke={colorOf.get(m.managerName)} strokeWidth={2.4} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bảng xếp hạng */}
        <ChartCard title="Bảng xếp hạng thành viên" icon="leaderboard">
          {totalRev === 0 ? <Empty /> : (
            <div className="space-y-3 py-1">
              {ranked.map((m, i) => {
                const share = totalRev ? Math.round((m.revenue / totalRev) * 100) : 0;
                const color = colorOf.get(m.managerName);
                return (
                  <div key={m.managerName} className="flex items-center gap-3">
                    <span className="w-7 flex justify-center flex-shrink-0">
                      {MEDALS[i]
                        ? <span className="text-lg leading-none">{MEDALS[i]}</span>
                        : <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold text-xs tabular-nums">{i + 1}</span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-slate-800 text-sm truncate" title={m.managerName}>{m.managerName}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">{m.auditId}</span>
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-900 text-sm flex-shrink-0">{numFormat(m.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden flex-1">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, share)}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 w-9 text-right flex-shrink-0">{share}%</span>
                        <span className="w-[78px] flex-shrink-0 flex justify-end"><Delta delta={pctDelta(m.revenue, m.prevRevenue)} /></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* Tỷ trọng đóng góp */}
        <ChartCard title="Tỷ trọng đóng góp" icon="donut_large">
          {donutData.length === 0 ? <Empty /> : (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={donutData} dataKey="revenue" nameKey="managerName" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {donutData.map((m) => <Cell key={m.managerName} fill={colorOf.get(m.managerName)} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [numFormat(v as number), 'Doanh thu']} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {donutData.map((m) => (
                  <div key={m.managerName} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorOf.get(m.managerName) }} />
                      <span className="font-semibold text-slate-600 truncate" title={m.managerName}>{m.managerName}</span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 flex-shrink-0">{totalRev ? Math.round((m.revenue / totalRev) * 100) : 0}%</span>
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
