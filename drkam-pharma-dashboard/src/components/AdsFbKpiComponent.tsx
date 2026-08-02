import React, { useEffect, useMemo, useState } from 'react';
import { AdsFbTaskLog, AdsFbTarget, Employee, UserSession } from '../types';
import { inPeriod, fmtMoney, fmtPct } from '../lib/adsFacebook';
import { MonthPicker, shiftMonthKey } from './dashboardKit';

export const ADS_FB_DEPT = 'Ads Facebook';

/**
 * KPI tháng — Team Ads Facebook (CHỈ ADMIN).
 * Chỉ đặt MỘT chỉ tiêu: doanh thu/tháng cho từng nhân sự. KPI cả team = tổng các dòng.
 * Ghi vào đúng cột `revenueTarget` của target tháng (ads_fb_targets) nên số liệu
 * khớp ngay với thanh tiến trình ở Tổng quan và % đạt DT (Trục C) của báo cáo ngày.
 */

interface Props {
  logs: AdsFbTaskLog[];
  targets: AdsFbTarget[];
  employees: Employee[];
  session: UserSession;
  onAddTarget: (t: AdsFbTarget) => void;
  onUpdateTarget: (id: string, patch: Partial<AdsFbTarget>) => void;
}

const nowMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const onlyDigits = (s: string) => s.replace(/\D/g, '');
const groupDigits = (s: string) => (s ? Number(s).toLocaleString('vi-VN') : '');
const pctColor = (p: number | null) =>
  p == null ? 'text-slate-400 bg-slate-50'
    : p >= 100 ? 'text-green-700 bg-green-50'
    : p >= 70 ? 'text-amber-700 bg-amber-50'
    : 'text-rose-700 bg-rose-50';

export default function AdsFbKpiComponent({ logs, targets, employees, session, onAddTarget, onUpdateTarget }: Props) {
  const [period, setPeriod] = useState(nowMonthKey);
  const [draft, setDraft] = useState<Record<string, string>>({});   // employeeId → chuỗi số đang nhập
  const [notice, setNotice] = useState('');
  const isAdmin = session.role === 'Admin';

  // Đổi tháng thì bỏ mọi thay đổi chưa lưu (tránh ghi nhầm KPI sang tháng khác).
  useEffect(() => { setDraft({}); }, [period]);

  const staff = useMemo(() => employees
    .filter((e) => e.department === ADS_FB_DEPT && e.status === 'Hoạt động')
    .sort((a, b) => (a.role === 'Leader' ? -1 : 1) - (b.role === 'Leader' ? -1 : 1)), [employees]);

  const rows = useMemo(() => logs.filter((l) => inPeriod(l.date, period)), [logs, period]);
  const targetFor = (empId: string) => targets.find((t) => t.employeeId === empId && t.period === period) ?? null;

  // Mỗi nhân sự: KPI đang lưu, KPI đang nhập, doanh thu thực tế trong tháng.
  const lines = staff.map((emp) => {
    const target = targetFor(emp.id);
    const saved = target?.revenueTarget ?? 0;
    const typed = draft[emp.id];
    const value = typed !== undefined ? Number(typed || 0) : saved;
    const actual = rows.filter((r) => r.employeeId === emp.id).reduce((s, r) => s + r.revenue, 0);
    return {
      emp, target, saved, actual, value,
      dirty: value !== saved,
      pct: value > 0 ? Math.round((actual / value) * 1000) / 10 : null,
    };
  });

  const totalKpi = lines.reduce((s, l) => s + l.value, 0);
  const totalActual = rows.reduce((s, r) => s + r.revenue, 0);
  const totalPct = totalKpi > 0 ? Math.round((totalActual / totalKpi) * 1000) / 10 : null;
  const dirtyLines = lines.filter((l) => l.dirty);

  const setValue = (empId: string, raw: string) => setDraft((p) => ({ ...p, [empId]: onlyDigits(raw) }));

  const save = () => {
    dirtyLines.forEach((l, i) => {
      if (l.target) onUpdateTarget(l.target.id, { revenueTarget: l.value });
      else onAddTarget({
        id: `afbt_${Date.now()}_${i}`,
        period, employeeId: l.emp.id, employeeName: l.emp.name,
        spendTarget: 0, revenueTarget: l.value, ordersTarget: 0, daysInMonth: 30, note: '',
      });
    });
    setDraft({});
    setNotice(`Đã lưu KPI doanh thu cho ${dirtyLines.length} nhân sự · tháng ${period.slice(5)}/${period.slice(0, 4)}.`);
    setTimeout(() => setNotice(''), 4000);
  };

  // Lấy KPI tháng trước làm nháp — vẫn phải bấm "Lưu KPI" mới ghi.
  const copyPrevMonth = () => {
    const prev = shiftMonthKey(period, -1);
    const next: Record<string, string> = {};
    staff.forEach((emp) => {
      const t = targets.find((x) => x.employeeId === emp.id && x.period === prev);
      if (t && t.revenueTarget > 0) next[emp.id] = String(t.revenueTarget);
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
          <p className="text-[11px] text-slate-400 mt-0.5">Đặt chỉ tiêu doanh thu cho từng nhân sự — KPI cả team là tổng các dòng bên dưới.</p>
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
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Thực tế đã đạt</p>
            <div className="text-lg font-bold text-slate-700 tabular-nums">{fmtMoney(totalActual)} đ</div>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-sm font-extrabold ${pctColor(totalPct)}`}>
              {totalPct == null ? '—' : totalPct + '%'}
            </span>
          </div>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-4">
          <div className="h-full rounded-full bg-[#D32027] transition-all duration-500" style={{ width: `${Math.min(totalPct ?? 0, 100)}%` }} />
        </div>
        {dirtyLines.length > 0 && (
          <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">edit</span>
            Đang xem số nháp — bấm <b>Lưu KPI</b> để ghi lại.
          </p>
        )}
      </div>

      {/* Bảng đặt KPI từng nhân sự */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">KPI doanh thu từng nhân sự</h3>
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
          <table className="w-full text-xs border-separate border-spacing-0 min-w-[720px]">
            <thead>
              <tr>
                <th className={TH_NAME}>Nhân sự</th>
                <th className={TH}>KPI doanh thu / tháng (đ)</th>
                <th className={TH}>≈ KPI / ngày</th>
                <th className={TH}>Thực tế trong tháng</th>
                <th className={TH}>% đạt</th>
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
                        value={groupDigits(draft[l.emp.id] !== undefined ? draft[l.emp.id] : (l.saved ? String(l.saved) : ''))}
                        onChange={(e) => setValue(l.emp.id, e.target.value)}
                        placeholder="0"
                        className={`w-44 px-3 py-2 text-sm font-bold text-right tabular-nums rounded-lg border outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] ${
                          l.dirty ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
                        }`}
                      />
                    ) : (
                      <span className="font-bold tabular-nums">{l.value > 0 ? fmtMoney(l.value) : <span className="text-slate-300">—</span>}</span>
                    )}
                  </td>
                  <td className={`${CELL} text-right tabular-nums text-slate-500`}>
                    {l.value > 0 ? fmtMoney(Math.round(l.value / 30)) + ' đ' : <span className="text-slate-300">—</span>}
                  </td>
                  <td className={`${CELL} text-right tabular-nums text-slate-700 font-semibold`}>{fmtMoney(l.actual)} đ</td>
                  <td className={`${CELL} text-right`}>
                    {l.pct == null
                      ? <span className="text-slate-300">—</span>
                      : <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold ${pctColor(l.pct)}`}>{fmtPct(l.actual / l.value)}</span>}
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Chưa có nhân sự nào thuộc team Ads Facebook.</td></tr>
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
