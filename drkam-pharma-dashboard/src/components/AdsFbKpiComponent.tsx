import React, { useEffect, useMemo, useState } from 'react';
import { AdsFbTarget, Employee, UserSession } from '../types';
import { fmtMoney, fmtPct, roiInputChars, roiPctToRatio, roiRatioToPct } from '../lib/adsFacebook';
import { MonthPicker, shiftMonthKey } from './dashboardKit';

export const ADS_FB_DEPT = 'Ads Facebook';

/**
 * KPI tháng — Team Ads Facebook (CHỈ ADMIN).
 * Màn này CHỈ ĐỂ ĐẶT chỉ tiêu — không hiển thị thực tế / % đạt / tiến trình.
 * Theo dõi kết quả xem ở "Tổng quan Ads" và "Báo cáo ngày".
 *
 * Đặt 2 chỉ tiêu cho từng nhân sự: doanh thu/tháng và ROI, ghi vào `revenueTarget`
 * + `roiTarget` của target tháng (ads_fb_targets) — đây là NƠI DUY NHẤT đặt KPI Ads.
 *
 * ROI: nhập theo % (ô "150" = ROI 150%) nhưng LƯU DẠNG TỈ LỆ (1.5) cho khớp engine
 * `adsFbKpis` (ROI = ROAS − 1 = DT/Chi − 1). ROI chưa dùng trong chấm điểm 3 trục.
 */

interface Props {
  targets: AdsFbTarget[];
  employees: Employee[];
  session: UserSession;
  onAddTarget: (t: AdsFbTarget) => void;
  onUpdateTarget: (id: string, patch: Partial<AdsFbTarget>) => void;
}

const nowMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const onlyDigits = (s: string) => s.replace(/\D/g, '');
const groupDigits = (s: string) => (s ? Number(s).toLocaleString('vi-VN') : '');

export default function AdsFbKpiComponent({ targets, employees, session, onAddTarget, onUpdateTarget }: Props) {
  const [period, setPeriod] = useState(nowMonthKey);
  // employeeId → số đang nhập; rev = KPI doanh thu (đ), roi = KPI ROI (%, chưa quy đổi).
  const [draft, setDraft] = useState<Record<string, { rev?: string; roi?: string }>>({});
  const [notice, setNotice] = useState('');
  const isAdmin = session.role === 'Admin';

  // Đổi tháng thì bỏ mọi thay đổi chưa lưu (tránh ghi nhầm KPI sang tháng khác).
  useEffect(() => { setDraft({}); }, [period]);

  const staff = useMemo(() => employees
    .filter((e) => e.department === ADS_FB_DEPT && e.status === 'Hoạt động')
    .sort((a, b) => (a.role === 'Leader' ? -1 : 1) - (b.role === 'Leader' ? -1 : 1)), [employees]);

  const targetFor = (empId: string) => targets.find((t) => t.employeeId === empId && t.period === period) ?? null;

  // Mỗi nhân sự: KPI đang lưu vs KPI đang nhập (chưa lưu).
  const lines = staff.map((emp) => {
    const target = targetFor(emp.id);
    const saved = target?.revenueTarget ?? 0;
    const savedRoi = target?.roiTarget ?? 0;              // tỉ lệ
    const typed = draft[emp.id];
    const value = typed?.rev !== undefined ? Number(typed.rev || 0) : saved;
    const roiValue = typed?.roi !== undefined ? roiPctToRatio(typed.roi) : savedRoi;
    return {
      emp, target, saved, savedRoi, value, roiValue,
      dirty: value !== saved || roiValue !== savedRoi,
    };
  });

  const totalKpi = lines.reduce((s, l) => s + l.value, 0);
  // KPI ROI cả team: trung bình các chỉ tiêu ĐÃ đặt (cộng dồn ROI là vô nghĩa).
  const roiLines = lines.filter((l) => l.roiValue > 0);
  const teamRoiTarget = roiLines.length
    ? roiLines.reduce((s, l) => s + l.roiValue, 0) / roiLines.length
    : null;
  const dirtyLines = lines.filter((l) => l.dirty);

  const setValue = (empId: string, raw: string) =>
    setDraft((p) => ({ ...p, [empId]: { ...p[empId], rev: onlyDigits(raw) } }));
  const setRoi = (empId: string, raw: string) =>
    setDraft((p) => ({ ...p, [empId]: { ...p[empId], roi: roiInputChars(raw) } }));

  const save = () => {
    dirtyLines.forEach((l, i) => {
      if (l.target) onUpdateTarget(l.target.id, { revenueTarget: l.value, roiTarget: l.roiValue });
      else onAddTarget({
        id: `afbt_${Date.now()}_${i}`,
        period, employeeId: l.emp.id, employeeName: l.emp.name,
        spendTarget: 0, revenueTarget: l.value, ordersTarget: 0, roiTarget: l.roiValue,
        daysInMonth: 30, note: '',
      });
    });
    setDraft({});
    setNotice(`Đã lưu KPI doanh thu + ROI cho ${dirtyLines.length} nhân sự · tháng ${period.slice(5)}/${period.slice(0, 4)}.`);
    setTimeout(() => setNotice(''), 4000);
  };

  // Lấy KPI tháng trước làm nháp — vẫn phải bấm "Lưu KPI" mới ghi.
  const copyPrevMonth = () => {
    const prev = shiftMonthKey(period, -1);
    const next: Record<string, { rev?: string; roi?: string }> = {};
    staff.forEach((emp) => {
      const t = targets.find((x) => x.employeeId === emp.id && x.period === prev);
      if (!t) return;
      const row: { rev?: string; roi?: string } = {};
      if (t.revenueTarget > 0) row.rev = String(t.revenueTarget);
      if (t.roiTarget > 0) row.roi = roiRatioToPct(t.roiTarget);
      if (row.rev !== undefined || row.roi !== undefined) next[emp.id] = row;
    });
    if (Object.keys(next).length === 0) {
      setNotice(`Tháng ${prev.slice(5)}/${prev.slice(0, 4)} chưa có KPI để sao chép.`);
      setTimeout(() => setNotice(''), 4000);
      return;
    }
    setDraft(next);
  };

  return (
    <div className="max-w-[1000px] mx-auto flex flex-col gap-5 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">flag</span>
            <span>KPI tháng — Team Ads Facebook</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Đặt chỉ tiêu doanh thu &amp; ROI cho từng nhân sự. Theo dõi kết quả thực tế ở <b>Tổng quan Ads</b>.
          </p>
        </div>
        {/* allowFuture: KPI thường được đặt trước cho tháng sau. */}
        <MonthPicker value={period} onChange={setPeriod} allowFuture />
      </div>

      {notice && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-semibold rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>{notice}
        </div>
      )}

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Chỉ Admin mới đặt được KPI. Bạn đang xem ở chế độ chỉ đọc.
        </div>
      )}

      {/* KPI cả team = tổng KPI từng người */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">KPI doanh thu cả team · tháng {period.slice(5)}/{period.slice(0, 4)}</p>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums mt-1">{fmtMoney(totalKpi)} đ</div>
            <p className="text-[11px] text-slate-400 mt-1">Tổng KPI của {lines.filter((l) => l.value > 0).length}/{staff.length} nhân sự</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">KPI ROI trung bình</p>
            <div className="text-lg font-bold text-slate-700 tabular-nums">{teamRoiTarget == null ? '—' : fmtPct(teamRoiTarget)}</div>
            <p className="text-[11px] text-slate-400 mt-1">{roiLines.length}/{staff.length} nhân sự đã đặt ROI</p>
          </div>
        </div>
        {dirtyLines.length > 0 && (
          <p className="text-[11px] text-amber-600 mt-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">edit</span>
            Đang xem số nháp — bấm <b>Lưu KPI</b> để ghi lại.
          </p>
        )}
      </div>

      {/* Bảng đặt KPI từng nhân sự */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">KPI doanh thu &amp; ROI từng nhân sự</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">KPI/ngày = KPI tháng ÷ 30 — dùng làm mẫu số tính % đạt của báo cáo ngày.</p>
          </div>
          {isAdmin && (
            <button onClick={copyPrevMonth}
              className="text-[11px] font-bold text-slate-500 hover:text-[#D32027] flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-50">
              <span className="material-symbols-outlined text-[15px]">content_copy</span>Lấy KPI tháng trước
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0 min-w-[640px]">
            <thead>
              <tr>
                <th className={TH_NAME}>Nhân sự</th>
                <th className={TH}>KPI doanh thu / tháng (đ)</th>
                <th className={TH}>KPI ROI (%)</th>
                <th className={TH}>≈ KPI / ngày</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.emp.id} className="group transition-colors hover:bg-rose-50/50">
                  <td className={NAME_CELL}>
                    <div className="flex items-center gap-2">
                      <img src={l.emp.avatar} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white ring-1 ring-slate-200 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-700 truncate" title={l.emp.name}>{l.emp.name}</div>
                        <div className="text-[10px] text-slate-400">{l.emp.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`${CELL} text-right`}>
                    {isAdmin ? (
                      <input
                        type="text" inputMode="numeric"
                        value={groupDigits(draft[l.emp.id]?.rev !== undefined ? draft[l.emp.id].rev! : (l.saved ? String(l.saved) : ''))}
                        onChange={(e) => setValue(l.emp.id, e.target.value)}
                        placeholder="0"
                        className={`w-44 px-3 py-2 text-sm font-bold text-right tabular-nums rounded-lg border outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] ${
                          l.value !== l.saved ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
                        }`}
                      />
                    ) : (
                      <span className="font-bold tabular-nums">{l.value > 0 ? fmtMoney(l.value) : <span className="text-slate-300">—</span>}</span>
                    )}
                  </td>
                  <td className={`${CELL} text-right`}>
                    {isAdmin ? (
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="text" inputMode="decimal"
                          value={draft[l.emp.id]?.roi !== undefined ? draft[l.emp.id].roi! : roiRatioToPct(l.savedRoi)}
                          onChange={(e) => setRoi(l.emp.id, e.target.value)}
                          placeholder="0"
                          title="VD: 150 nghĩa là ROI 150% — doanh thu gấp 2,5 lần chi tiêu."
                          className={`w-24 px-3 py-2 text-sm font-bold text-right tabular-nums rounded-lg border outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] ${
                            l.roiValue !== l.savedRoi ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
                          }`}
                        />
                        <span className="text-slate-400 font-bold">%</span>
                      </div>
                    ) : (
                      <span className="font-bold tabular-nums">{l.roiValue > 0 ? fmtPct(l.roiValue) : <span className="text-slate-300">—</span>}</span>
                    )}
                  </td>
                  <td className={`${CELL} text-right tabular-nums text-slate-500`}>
                    {l.value > 0 ? fmtMoney(Math.round(l.value / 30)) + ' đ' : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Chưa có nhân sự nào thuộc team Ads Facebook.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {isAdmin && (
          <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              {dirtyLines.length === 0 ? 'Chưa có thay đổi nào.' : `${dirtyLines.length} nhân sự có KPI thay đổi.`}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setDraft({})} disabled={dirtyLines.length === 0}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Hoàn tác
              </button>
              <button onClick={save} disabled={dirtyLines.length === 0}
                className="px-6 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Lưu KPI
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CELL = 'px-3 py-2.5 border-b border-slate-100';
const NAME_BASE = 'sticky left-0 z-10 px-4 py-2.5 border-r border-b border-slate-100';
const NAME_CELL = `${NAME_BASE} bg-white group-hover:bg-rose-50/50`;
const TH_BASE = 'text-[10px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200';
const TH = `px-3 py-2.5 text-right whitespace-nowrap bg-slate-50 ${TH_BASE}`;
const TH_NAME = `${NAME_BASE} bg-slate-50 text-left ${TH_BASE}`;
