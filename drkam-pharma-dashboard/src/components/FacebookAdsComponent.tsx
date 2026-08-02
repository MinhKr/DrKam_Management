import React, { useState } from 'react';
import { DailyReport, UserSession } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { FacebookIcon } from './BrandIcons';
import { MonthPicker } from './dashboardKit';

/**
 * Mục Facebook → Facebook Ads.
 * Đơn giản: chỉ NHẬP DOANH THU theo ngày (không traffic). Mỗi ngày 1 dòng —
 * nhập lại cùng ngày sẽ ghi đè (cloud upsert theo channel_id + ngày).
 * Doanh thu ở đây cộng vào dòng "Facebook Ads" tại Tổng quan.
 */

const CHANNEL_NAME = 'Facebook Ads';
const CHANNEL_TYPE = 'Facebook - Ads';
const MONTHLY_TARGET = 175_000_000; // KPI tháng (khớp Tổng quan)

const vnd = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v)) + ' đ';

const isoTodayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const toDdmmyyyy = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const nowMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

type ConfirmState = { message: string; onConfirm: () => void } | null;

interface Props {
  reports: DailyReport[];
  session: UserSession;
  onAddReport: (r: DailyReport) => void;
  onDeleteReport: (id: string) => void;
}

export default function FacebookAdsComponent({ reports, session, onAddReport, onDeleteReport }: Props) {
  const [monthKey, setMonthKey] = useState(nowMonthKey);
  const [date, setDate] = useState(isoTodayLocal);
  const [revenueStr, setRevenueStr] = useState('');
  const [dialog, setDialog] = useState<ConfirmState>(null);
  const [notification, setNotification] = useState('');
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const [my, mm] = monthKey.split('-').map(Number);

  // Báo cáo Facebook Ads của tháng đang xem (mới nhất lên đầu).
  const adsReports = reports
    .filter((r) => r.channelName === CHANNEL_NAME)
    .filter((r) => {
      const [, m2, y2] = r.date.split('/');
      return `${y2}-${m2}` === monthKey;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const monthTotal = adsReports.reduce((s, r) => s + r.revenue, 0);
  const pct = MONTHLY_TARGET > 0 ? Math.round((monthTotal / MONTHLY_TARGET) * 1000) / 10 : 0;

  const handleSave = () => {
    const rev = Number(revenueStr.replace(/[^\d]/g, ''));
    if (!date) { notify('Vui lòng chọn ngày.'); return; }
    if (!rev || rev <= 0) { notify('Vui lòng nhập doanh thu hợp lệ.'); return; }
    const formattedDate = toDdmmyyyy(date);
    const existing = reports.find((r) => r.channelName === CHANNEL_NAME && r.date === formattedDate);

    const doSave = () => {
      onAddReport({
        id: existing?.id || 'r_fbads_' + date.replace(/-/g, ''),
        date: formattedDate,
        channelName: CHANNEL_NAME,
        channelType: CHANNEL_TYPE,
        revenue: rev,
        views: null,
        interactions: null,
        source: session.role === 'Admin' ? 'Admin' : 'Nhân viên',
        isEditable: true,
        traffic: null,
        note: null,
        synced: false,
        videoCount: null,
      });
      setRevenueStr('');
      notify(`Đã lưu doanh thu Facebook Ads ngày ${formattedDate}: ${vnd(rev)}`);
    };

    if (existing) {
      setDialog({
        message: `Ngày ${formattedDate} đã có doanh thu ${vnd(existing.revenue)}. Ghi đè thành ${vnd(rev)}?`,
        onConfirm: () => { setDialog(null); doSave(); },
      });
      return;
    }
    doSave();
  };

  const askDelete = (r: DailyReport) => {
    setDialog({
      message: `Xóa doanh thu Facebook Ads ngày ${r.date} (${vnd(r.revenue)})?`,
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
        <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-[#1877F2]">
          <FacebookIcon className="w-[22px] h-[22px]" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-display">Facebook Ads — Doanh thu</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Nhập doanh thu theo ngày. Số liệu cộng vào dòng "Facebook Ads" ở Tổng quan.</p>
        </div>
      </div>

      {notification && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-semibold rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {notification}
        </div>
      )}

      {/* Chọn tháng + tổng vs KPI */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Doanh thu Facebook Ads · tháng {mm}/{my}</p>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{vnd(monthTotal)}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">KPI tháng</p>
              <div className="text-sm font-bold text-slate-700 tabular-nums">{vnd(MONTHLY_TARGET)}</div>
            </div>
            <MonthPicker value={monthKey} onChange={setMonthKey} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#1877F2] transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <span className="text-xs font-extrabold text-slate-600 tabular-nums w-12 text-right">{pct}%</span>
        </div>
      </div>

      {/* Form nhập doanh thu */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Nhập doanh thu ngày</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ngày</label>
            <input
              type="date"
              value={date}
              max={isoTodayLocal()}
              onChange={(e) => setDate(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Doanh thu (đ)</label>
            <input
              type="text"
              inputMode="numeric"
              value={revenueStr ? Number(revenueStr.replace(/[^\d]/g, '')).toLocaleString('vi-VN') : ''}
              onChange={(e) => setRevenueStr(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="Ví dụ: 5.000.000"
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]"
            />
          </div>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#1877F2] text-white text-sm font-bold hover:bg-[#1568d8] transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Lưu
          </button>
        </div>
      </div>

      {/* Danh sách doanh thu tháng */}
      <div className="bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Doanh thu theo ngày — tháng {mm}/{my}</h3>
          <span className="text-xs font-bold text-[#1877F2]">Tổng: {vnd(monthTotal)}</span>
        </div>
        {adsReports.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-400">
            Chưa có doanh thu Facebook Ads trong tháng này.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                <th className="px-4 py-2.5">Ngày</th>
                <th className="px-4 py-2.5 text-right">Doanh thu</th>
                <th className="px-4 py-2.5 text-center w-16">Nguồn</th>
                <th className="px-4 py-2.5 text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adsReports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-slate-700 tabular-nums">{r.date}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums">{vnd(r.revenue)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-[10px] font-bold text-slate-400">{r.source}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => askDelete(r)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
