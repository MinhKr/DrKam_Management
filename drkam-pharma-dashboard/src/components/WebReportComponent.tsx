'use client';
/**
 * BÁO CÁO WEB — SEO (bảng web_reports, migration 0021).
 *
 * Hai con số của web, lấy từ 2 nguồn khác nhau (chốt với user):
 *   • LƯỢT TRUY CẬP — NHẬP TAY theo ngày ở màn này (1 ngày 1 dòng, nhập lại
 *     cùng ngày là ghi đè).
 *   • SỐ BÀI VIẾT   — KHÔNG nhập lại: đếm tự động từ dòng "SEO WEB" trong
 *     Checklist công việc ngày, cộng số lượng của mọi nhân sự.
 *
 * Bố cục theo đúng format các mục traffic đã có: thẻ tổng vs KPI tháng → form
 * nhập → bảng theo TUẦN (T1–T4) → bảng chi tiết theo ngày.
 *
 * Chỉ tiêu tháng đặt ở màn "KPI tháng — Team Content" (mục Chỉ tiêu Web / SEO);
 * tháng chưa đặt thì dùng số mặc định theo bảng KPIs công ty: 12.000 lượt · 40 bài.
 */
import React, { useState } from 'react';
import { ChecklistItem, ContentKpiTarget, UserSession, WebReport } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { MonthPicker } from './dashboardKit';
import {
  seoPostsByDate, trafficByDate, webTargetResolver, WEB_POSTS_ID, WEB_TRAFFIC_ID,
} from '../lib/webReport';

interface Props {
  webReports: WebReport[];
  checklists: ChecklistItem[];
  kpiTargets: ContentKpiTarget[];
  session: UserSession;
  onSaveReport: (r: WebReport) => void;
  onDeleteReport: (id: string) => void;
}

const intFmt = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v));
const isoTodayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const toDdmmyyyy = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const nowMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const lastDayOfMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
/** Cùng quy ước chia tuần với Tổng quan: T1 1–7 · T2 8–14 · T3 15–21 · T4 22–cuối tháng. */
const WEEK_BOUNDS = [7, 14, 21, 99];
const weekIndex = (day: number) => WEEK_BOUNDS.findIndex((b) => day <= b);
const pctOf = (actual: number, target: number) => (target > 0 ? Math.round((actual / target) * 1000) / 10 : null);
const pctColor = (p: number | null) =>
  p == null ? 'text-slate-400 bg-slate-50'
    : p >= 100 ? 'text-green-700 bg-green-50'
    : p >= 70 ? 'text-amber-700 bg-amber-50'
    : 'text-rose-700 bg-rose-50';

type ConfirmState = { message: string; onConfirm: () => void } | null;

export default function WebReportComponent({
  webReports, checklists, kpiTargets, session, onSaveReport, onDeleteReport,
}: Props) {
  const [monthKey, setMonthKey] = useState(nowMonthKey);
  const [date, setDate] = useState(isoTodayLocal);
  const [trafficStr, setTrafficStr] = useState('');
  const [dialog, setDialog] = useState<ConfirmState>(null);
  const [notification, setNotification] = useState('');
  const notify = (m: string) => { setNotification(m); setTimeout(() => setNotification(''), 4000); };

  // Team Media / Ads Facebook chỉ xem (đúng quy ước RLS của migration 0021).
  const canEdit = session.role === 'Admin'
    || (session.department !== 'Media' && session.department !== 'Ads Facebook');

  const [my, mm] = monthKey.split('-').map(Number);
  const days = lastDayOfMonth(monthKey);

  const targetOf = webTargetResolver(kpiTargets, monthKey);
  const trafficTarget = targetOf(WEB_TRAFFIC_ID);
  const postsTarget = targetOf(WEB_POSTS_ID);

  // Traffic nhập tay + số bài viết đếm từ checklist, cùng gom theo ngày.
  const trafficMap = trafficByDate(webReports, monthKey);
  const postsMap = seoPostsByDate(checklists, monthKey);

  const monthTraffic = [...trafficMap.values()].reduce((s, v) => s + v, 0);
  const monthPosts = [...postsMap.values()].reduce((s, v) => s + v, 0);
  const trafficPct = pctOf(monthTraffic, trafficTarget);
  const postsPct = pctOf(monthPosts, postsTarget);

  // Bảng tuần — mỗi tuần 1 dòng, đúng cách chia tuần của Tổng quan.
  const weeks = [0, 1, 2, 3].map((i) => ({ i, traffic: 0, posts: 0 }));
  trafficMap.forEach((v, d) => { weeks[weekIndex(Number(d.split('/')[0]))].traffic += v; });
  postsMap.forEach((v, d) => { weeks[weekIndex(Number(d.split('/')[0]))].posts += v; });
  const weekLabel = (i: number) => `Tuần ${i + 1} (${[1, 8, 15, 22][i]}–${[7, 14, 21, days][i]}/${mm})`;

  // Danh sách ngày có số liệu (traffic hoặc bài viết), mới nhất lên đầu.
  const dayRows = [...new Set([...trafficMap.keys(), ...postsMap.keys()])]
    .map((d) => ({
      date: d,
      traffic: trafficMap.get(d) ?? 0,
      posts: postsMap.get(d) ?? 0,
      row: webReports.find((r) => r.date === d),
    }))
    .sort((a, b) => {
      const [d1, m1, y1] = a.date.split('/');
      const [d2, m2, y2] = b.date.split('/');
      return `${y2}${m2}${d2}`.localeCompare(`${y1}${m1}${d1}`);
    });

  const handleSave = () => {
    const traffic = Number(trafficStr.replace(/[^\d]/g, ''));
    if (!date) { notify('Vui lòng chọn ngày.'); return; }
    if (!traffic || traffic <= 0) { notify('Vui lòng nhập lượt truy cập hợp lệ.'); return; }
    const formatted = toDdmmyyyy(date);
    const existing = webReports.find((r) => r.date === formatted);

    const doSave = () => {
      onSaveReport({ id: existing?.id ?? `web_${date.replace(/-/g, '')}`, date: formatted, traffic });
      setTrafficStr('');
      notify(`Đã lưu lượt truy cập ngày ${formatted}: ${intFmt(traffic)}`);
    };

    if (existing) {
      setDialog({
        message: `Ngày ${formatted} đã có ${intFmt(existing.traffic)} lượt truy cập. Ghi đè thành ${intFmt(traffic)}?`,
        onConfirm: () => { setDialog(null); doSave(); },
      });
      return;
    }
    doSave();
  };

  const askDelete = (r: WebReport) => {
    setDialog({
      message: `Xóa lượt truy cập ngày ${r.date} (${intFmt(r.traffic)})?`,
      onConfirm: () => { setDialog(null); onDeleteReport(r.id); },
    });
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-5 text-slate-800">
      <ConfirmDialog
        open={!!dialog}
        message={dialog?.message ?? ''}
        onConfirm={() => dialog?.onConfirm()}
        onCancel={() => setDialog(null)}
      />

      {/* Tiêu đề */}
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600">
          <span className="material-symbols-outlined text-[22px]">language</span>
        </span>
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-display">Báo cáo web — SEO</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Lượt truy cập nhập tay theo ngày · số bài viết tự đếm từ dòng “SEO WEB” của Checklist ngày.
          </p>
        </div>
      </div>

      {notification && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-semibold rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>{notification}
        </div>
      )}

      {/* Chọn tháng */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-600">Số liệu tháng {mm}/{my}</span>
        <MonthPicker value={monthKey} onChange={setMonthKey} />
      </div>

      {/* 2 thẻ: traffic và số bài viết, đều so với KPI tháng */}
      <div className="grid sm:grid-cols-2 gap-3">
        <StatCard
          label="Lượt truy cập web" value={intFmt(monthTraffic)} unit="lượt"
          target={trafficTarget} pct={trafficPct} icon="trending_up" color="#7C3AED"
          hint="Nhập tay theo ngày ở form bên dưới"
        />
        <StatCard
          label="Số bài viết SEO" value={intFmt(monthPosts)} unit="bài"
          target={postsTarget} pct={postsPct} icon="article" color="#0EA5E9"
          hint="Tự đếm từ dòng “SEO WEB” trong Checklist ngày"
        />
      </div>

      {/* Form nhập traffic */}
      {canEdit ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Nhập lượt truy cập theo ngày</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ngày</label>
              <input
                type="date" value={date} max={isoTodayLocal()}
                onChange={(e) => setDate(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lượt truy cập</label>
              <input
                type="text" inputMode="numeric"
                value={trafficStr ? intFmt(Number(trafficStr.replace(/[^\d]/g, ''))) : ''}
                onChange={(e) => setTrafficStr(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                placeholder="Ví dụ: 450"
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>Lưu
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Mỗi ngày một dòng — nhập lại cùng ngày sẽ hỏi ghi đè. Số bài viết không nhập ở đây, khai ở Checklist ngày.
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Chỉ nhân sự team Content (và Admin) nhập được số liệu web. Bạn đang xem ở chế độ chỉ đọc.
        </div>
      )}

      {/* Bảng theo tuần */}
      <div className="bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Theo tuần — tháng {mm}/{my}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">T1 (1–7) · T2 (8–14) · T3 (15–21) · T4 (22–{days}).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[520px]">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="px-4 py-2.5 text-left font-bold border-b border-slate-200">Tuần</th>
                <th className="px-4 py-2.5 text-right font-bold border-b border-slate-200">Lượt truy cập</th>
                <th className="px-4 py-2.5 text-right font-bold border-b border-slate-200">Số bài viết</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.i} className="hover:bg-violet-50/30">
                  <td className="px-4 py-2 font-semibold text-slate-700 border-b border-slate-50" title={weekLabel(w.i)}>
                    {weekLabel(w.i)}
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-slate-900 tabular-nums border-b border-slate-50">
                    {w.traffic ? intFmt(w.traffic) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-slate-900 tabular-nums border-b border-slate-50">
                    {w.posts ? intFmt(w.posts) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 text-[11px]">
                <td className="px-4 py-2.5 font-extrabold text-slate-700 uppercase border-t-2 border-slate-200">Tổng tháng</td>
                <td className="px-4 py-2.5 text-right font-extrabold text-violet-700 tabular-nums border-t-2 border-slate-200">{intFmt(monthTraffic)}</td>
                <td className="px-4 py-2.5 text-right font-extrabold text-sky-700 tabular-nums border-t-2 border-slate-200">{intFmt(monthPosts)}</td>
              </tr>
              <tr className="bg-slate-50 text-[11px]">
                <td className="px-4 py-2 font-bold text-slate-500 uppercase">KPI tháng</td>
                <td className="px-4 py-2 text-right text-slate-500 tabular-nums">
                  {intFmt(trafficTarget)}
                  <span className={`ml-2 inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(trafficPct)}`}>
                    {trafficPct == null ? '—' : trafficPct + '%'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-slate-500 tabular-nums">
                  {intFmt(postsTarget)}
                  <span className={`ml-2 inline-block px-1.5 py-0.5 rounded font-bold ${pctColor(postsPct)}`}>
                    {postsPct == null ? '—' : postsPct + '%'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bảng chi tiết theo ngày */}
      <div className="bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Chi tiết theo ngày</h3>
          <span className="text-xs font-bold text-violet-700">{dayRows.length} ngày có số liệu</span>
        </div>
        {dayRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-400">
            Chưa có số liệu web trong tháng này.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                <th className="px-4 py-2.5">Ngày</th>
                <th className="px-4 py-2.5 text-right">Lượt truy cập</th>
                <th className="px-4 py-2.5 text-right">Số bài viết</th>
                <th className="px-4 py-2.5 text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dayRows.map((d) => (
                <tr key={d.date} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-slate-700 tabular-nums">{d.date}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums">
                    {d.traffic ? intFmt(d.traffic) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-sky-700 tabular-nums">
                    {d.posts ? intFmt(d.posts) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {canEdit && d.row && (
                      <button
                        onClick={() => askDelete(d.row!)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa lượt truy cập ngày này"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400">
          Số bài viết lấy từ Checklist ngày (dòng “SEO WEB”) nên sửa ở Checklist là đây đổi theo.
        </div>
      </div>
    </div>
  );
}

/** Thẻ số liệu + thanh tiến độ so với KPI tháng. */
function StatCard({ label, value, unit, target, pct, icon, color, hint }: {
  label: string; value: string; unit: string;
  target: number; pct: number | null; icon: string; color: string; hint: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
            {value} <span className="text-sm font-bold text-slate-400">{unit}</span>
          </div>
        </div>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}14`, color }}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(pct ?? 0, 100)}%`, background: color }} />
        </div>
        <span className="text-xs font-extrabold tabular-nums w-12 text-right" style={{ color }}>
          {pct == null ? '—' : pct + '%'}
        </span>
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">
        KPI tháng: <b className="text-slate-600 tabular-nums">{intFmt(target)}</b> {unit} · {hint}
      </p>
    </div>
  );
}
