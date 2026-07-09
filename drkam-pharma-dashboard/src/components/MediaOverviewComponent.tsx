import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { MediaTaskLog, MediaKpiEntry, Employee, UserSession, MEDIA_VIDEO_TYPES } from '../types';
import { countVideos, videoTypeTotalsFromLogs, inPeriod, isVideoContent, kpiTotal, kpiRank, weekdayVi } from '../lib/media';
import { KpiBox, ChartCard, Delta, tooltipStyle, compact } from './dashboardKit';
import MediaKpiComponent from './MediaKpiComponent';

interface Props {
  logs: MediaTaskLog[];
  kpiEntries: MediaKpiEntry[];
  employees: Employee[];
  session: UserSession;
  onNavigateToTab: (tab: string) => void;
  onAddKpi: (entry: MediaKpiEntry) => void;
  onUpdateKpi: (id: string, patch: Partial<MediaKpiEntry>) => void;
  onDeleteKpi: (id: string) => void;
}

const fmtVnd = (v: number) => v >= 1_000_000 ? (v / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + 'tr đ' : v.toLocaleString('vi-VN') + ' đ';

export default function MediaOverviewComponent(props: Props) {
  const { logs, kpiEntries, employees, session, onAddKpi, onUpdateKpi, onDeleteKpi } = props;

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-6 text-slate-800">
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
          <span className="material-symbols-outlined text-[#D32027] text-2xl">dashboard</span>
          <span>Tổng quan — Team Media DrKam</span>
        </h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Sản xuất video · báo cáo ngày · KPI tháng — tất cả trong một trang.</p>
      </div>

      {/* 1. Dashboard sản xuất video */}
      <OverviewDashboard {...props} />

      {/* 2. Báo cáo ngày (bản để chụp gửi) */}
      <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
          <span className="material-symbols-outlined text-[#D32027] text-2xl">photo_camera</span>
          <span>Báo cáo công việc ngày</span>
        </h2>
        <DailySnapshot logs={logs} employees={employees} session={session} />
      </div>

      {/* 3. KPI tháng */}
      <div className="pt-4 border-t border-slate-200">
        <MediaKpiComponent
          entries={kpiEntries}
          logs={logs}
          employees={employees}
          session={session}
          onAdd={onAddKpi}
          onUpdate={onUpdateKpi}
          onDelete={onDeleteKpi}
        />
      </div>
    </div>
  );
}

const nowMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

function OverviewDashboard({ logs, kpiEntries, employees, onNavigateToTab }: Props) {
  // Các tháng có dữ liệu (từ báo cáo ngày + KPI).
  const dataMonths = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => { const [d, m, y] = l.date.split('/'); if (d) set.add(`${y}-${m}`); });
    kpiEntries.forEach((e) => set.add(e.period));
    return [...set].sort().reverse();
  }, [logs, kpiEntries]);
  // Ô chọn tháng dạng lịch (input type=month) — chọn bất kỳ tháng nào, mặc định tháng có dữ liệu mới nhất.
  const [period, setPeriod] = useState(dataMonths[0] ?? nowMonthKey());

  const rows = useMemo(() => logs.filter((l) => inPeriod(l.date, period)), [logs, period]);
  const staff = employees.filter((e) => e.department === 'Media' && e.status === 'Hoạt động');

  const totalVideo = countVideos(rows);

  // Doanh thu + reach lấy từ KPI Leader của kỳ.
  const kpiPeriod = kpiEntries.filter((e) => e.period === period);
  const findKpi = (kw: string) => kpiPeriod.find((e) => e.metric.toLowerCase().includes(kw.toLowerCase()));
  const reachKpi = findKpi('reach');
  const tiktokKpi = findKpi('TikTok Seller');
  const adsKpi = findKpi('Facebook ADS');
  const totalReach = reachKpi?.actualValue ?? 0;

  const donut = videoTypeTotalsFromLogs(rows).filter((d) => d.value > 0);

  // Sản lượng video theo ngày (2 series — đếm dòng loại video).
  const daySeries = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    rows.forEach((r) => {
      if (!isVideoContent(r.contentType)) return;
      const key = r.date.slice(0, 5); // dd/mm
      const cur = map.get(key) ?? {};
      cur[r.employeeName] = (cur[r.employeeName] ?? 0) + 1;
      map.set(key, cur);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, v]) => ({ day, ...v }));
  }, [rows]);

  const perStaff = staff.map((emp) => {
    const empRows = rows.filter((r) => r.employeeId === emp.id);
    const empKpi = kpiPeriod.filter((e) => e.employeeId === emp.id);
    return { emp, video: countVideos(empRows), tasks: empRows.length, kpiScore: kpiTotal(empKpi), hasKpi: empKpi.length > 0 };
  });

  return (
    <div className="space-y-5 text-slate-800">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-600">Sản xuất video · số video tự đếm từ báo cáo ngày</span>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 soft-shadow">
          <span className="material-symbols-outlined text-[18px] text-[#D32027]">calendar_month</span>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="text-sm font-semibold border-none outline-none bg-transparent text-slate-700" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiBox label="Tổng video tháng" value={totalVideo.toLocaleString('vi-VN')} icon="movie" accent="bg-rose-50 text-[#D32027]">
          <Delta delta={12} />
        </KpiBox>
        <KpiBox label="Tổng Reach" value={totalReach ? compact(totalReach) : '—'} icon="visibility" accent="bg-sky-50 text-sky-600">
          <span className="text-[11px] text-slate-400">Nguồn: KPI reach</span>
        </KpiBox>
        <KpiBox label="DT TikTok Seller" value={tiktokKpi ? fmtVnd(tiktokKpi.actualValue) : '—'} icon="storefront" accent="bg-amber-50 text-amber-600">
          <span className="text-[11px] text-slate-400">Mục tiêu {tiktokKpi ? fmtVnd(tiktokKpi.targetValue) : '—'}</span>
        </KpiBox>
        <KpiBox label="DT Facebook ADS" value={adsKpi ? fmtVnd(adsKpi.actualValue) : '—'} icon="ads_click" accent="bg-emerald-50 text-emerald-600">
          {adsKpi && <span className="text-[11px] font-bold text-green-700">Đạt {Math.round(adsKpi.actualValue / adsKpi.targetValue * 100)}% KPI</span>}
        </KpiBox>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <ChartCard title="Tỷ trọng video theo loại" icon="donut_large" className="lg:col-span-2">
          {donut.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-slate-300 text-sm">Chưa có dữ liệu.</div>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={2}>
                    {donut.map((d) => <Cell key={d.key} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown, n: unknown) => [`${v} video`, n as string]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{totalVideo}</span>
                <span className="text-[11px] text-slate-400 font-semibold">Video</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {donut.map((d) => (
              <div key={d.key} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="truncate">{d.label}</span>
                <span className="ml-auto font-bold tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Sản lượng video theo ngày" icon="show_chart" className="lg:col-span-3">
          {daySeries.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-slate-300 text-sm">Chưa có dữ liệu.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={daySeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  {staff.map((emp, i) => (
                    <linearGradient key={emp.id} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={i === 0 ? '#D32027' : '#2563EB'} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={i === 0 ? '#D32027' : '#2563EB'} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {staff.map((emp, i) => (
                  <Area key={emp.id} type="monotone" dataKey={emp.name} stroke={i === 0 ? '#D32027' : '#2563EB'} strokeWidth={2} fill={`url(#g${i})`} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 font-display">Sản lượng theo nhân sự</h3>
            <button onClick={() => onNavigateToTab('media-daily')} className="text-[11px] font-bold text-[#D32027] hover:underline flex items-center gap-0.5">
              Xem chi tiết <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left font-bold">Nhân sự</th>
                <th className="px-3 py-2.5 text-left font-bold">Vai trò</th>
                <th className="px-3 py-2.5 text-right font-bold">Tổng video</th>
                <th className="px-3 py-2.5 text-right font-bold">Số đầu việc</th>
                <th className="px-3 py-2.5 text-right font-bold">Điểm KPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {perStaff.map(({ emp, video, tasks, kpiScore, hasKpi }) => (
                <tr key={emp.id} className="hover:bg-rose-50/20">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <img src={emp.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                      <span className="font-semibold text-slate-700">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{emp.role}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-800">{video}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{tasks}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-[#D32027]">{hasKpi ? kpiScore.toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow p-4">
          <h3 className="text-sm font-bold text-slate-800 font-display mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-slate-400">trending_up</span>Tiến độ KPI tháng
          </h3>
          <div className="space-y-3">
            {perStaff.filter((p) => p.hasKpi).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có KPI trong kỳ.</p>
            ) : perStaff.filter((p) => p.hasKpi).map(({ emp, kpiScore }) => {
              const rank = kpiRank(kpiScore);
              const pct = Math.min(kpiScore, 120);
              return (
                <div key={emp.id} className="flex items-center gap-3">
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#D32027" strokeWidth="3.5"
                        strokeDasharray={`${(pct / 120) * 97.4} 97.4`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-slate-800">{Math.round(kpiScore)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{emp.name}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${rank.color}`}>{rank.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Bản báo cáo ngày để CHỤP gửi — chỉ đọc, tab chuyển Khải/Sơn.
   Lấy đúng dữ liệu điền ở màn "Báo cáo ngày" (sidebar).
   ════════════════════════════════════════════════════════════════ */
const snapIsoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const snapToDd = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const snapContentColor = (label: string) => MEDIA_VIDEO_TYPES.find((t) => t.label === label)?.color ?? '#64748B';
const progStyle = (p: MediaTaskLog['progress']) =>
  p === 'Hoàn thành' ? 'text-green-700 bg-green-50 border-green-200'
  : p === 'Đang làm' ? 'text-amber-700 bg-amber-50 border-amber-200'
  : 'text-slate-500 bg-slate-50 border-slate-200';

function DailySnapshot({ logs, employees, session }: { logs: MediaTaskLog[]; employees: Employee[]; session: UserSession }) {
  const staff = useMemo(() => employees
    .filter((e) => e.department === 'Media' && e.status === 'Hoạt động')
    .sort((a, b) => (a.role === 'Leader' ? -1 : 1) - (b.role === 'Leader' ? -1 : 1)), [employees]);

  const selfId = staff.find((s) => s.name === session.name)?.id;
  const [activeId, setActiveId] = useState(selfId ?? staff[0]?.id ?? '');
  const active = staff.find((s) => s.id === activeId) ?? staff[0];

  const latestIso = useMemo(() => {
    const isos = logs.map((l) => { const [d, m, y] = l.date.split('/'); return d ? `${y}-${m}-${d}` : ''; }).filter(Boolean).sort();
    return isos[isos.length - 1] ?? snapIsoToday();
  }, [logs]);
  const [dateIso, setDateIso] = useState(latestIso);
  const date = snapToDd(dateIso);
  const isToday = dateIso === snapIsoToday();

  const rows = logs.filter((l) => l.date === date && l.employeeId === activeId);
  const vids = rows.filter((l) => isVideoContent(l.contentType)).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Thanh điều khiển (ngoài ảnh chụp) */}
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
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 soft-shadow">
          <span className="material-symbols-outlined text-[18px] text-[#D32027]">event</span>
          <input type="date" value={dateIso} max={snapIsoToday()} onChange={(e) => setDateIso(e.target.value)}
            className="text-sm font-semibold border-none outline-none bg-transparent text-slate-700" />
          {!isToday && <button onClick={() => setDateIso(snapIsoToday())} className="text-[11px] font-bold text-[#D32027] hover:underline">Hôm nay</button>}
        </div>
      </div>

      {/* ===== KHỐI ẢNH BÁO CÁO (chụp từ đây) ===== */}
      <div className="bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden">
        <div className="bg-[#D32027] text-white px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {active && <img src={active.avatar} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white/40 flex-shrink-0" />}
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">DrKam · Team Media · Báo cáo ngày</div>
              <div className="text-lg font-black leading-tight truncate">{active?.name} <span className="text-[11px] font-bold opacity-80">· {active?.role === 'Leader' ? 'Leader' : 'Nhân viên'}</span></div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-black leading-tight">{weekdayVi(date)}, {date}</div>
            <div className="text-[11px] opacity-90 mt-0.5"><b>{vids}</b> video · {rows.length} đầu việc</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400 italic">{active?.name} chưa có báo cáo ngày {date}.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 uppercase tracking-wide text-[10px] bg-slate-50/70">
                <th className="pl-5 pr-2 py-2 text-left font-bold w-8">#</th>
                <th className="px-2 py-2 text-left font-bold">Content</th>
                <th className="px-2 py-2 text-left font-bold w-10">KB</th>
                <th className="px-3 py-2 text-left font-bold">Công việc</th>
                <th className="px-2 py-2 text-center font-bold w-10">SL</th>
                <th className="px-2 pr-5 py-2 text-left font-bold w-28">Tiến độ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((l, i) => (
                <tr key={l.id}>
                  <td className="pl-5 pr-2 py-2 text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-2 py-2">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap"
                      style={{ background: `${snapContentColor(l.contentType)}1a`, color: snapContentColor(l.contentType) }}>{l.contentType}</span>
                  </td>
                  <td className="px-2 py-2 font-mono text-slate-400">{l.scriptNo || '–'}</td>
                  <td className="px-3 py-2 text-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-w-[440px]">{l.task}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-slate-600">{l.quantity ?? '–'}</td>
                  <td className="px-2 pr-5 py-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${progStyle(l.progress)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />{l.progress}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Nguồn: Báo cáo ngày Team Media · DrKam Portal</span>
          <span>Chốt ngày {date}</span>
        </div>
      </div>
    </div>
  );
}
