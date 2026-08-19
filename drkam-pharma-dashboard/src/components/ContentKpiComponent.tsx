'use client';
/**
 * KPI THÁNG — TEAM CONTENT (bảng content_kpi_targets, migration 0015 + 0019).
 *
 * Màn này đặt 2 loại chỉ tiêu của một tháng:
 *   1. THEO KÊNH      — 13 hạng mục doanh thu + 2 dòng view/reach (migration 0015),
 *                       đúng danh sách hiển thị ở Tổng quan > Báo cáo chung.
 *   2. THEO NHÂN VIÊN — chỉ tiêu doanh thu riêng của từng người (migration 0019),
 *                       theo bảng KPIs công ty (Content TikTok 240tr · Fanpage +
 *                       SEO 240tr · Marketing AI 80tr…). Thực hiện = tổng doanh
 *                       thu các kênh người đó phụ trách, tiến độ xem ở Tổng quan.
 * Danh mục kênh cố định trong src/lib/contentKpi.ts, danh sách nhân sự lấy từ
 * người phụ trách kênh (src/lib/contentEmployeeKpi.ts) nên không lệch nhau được.
 *
 * PHẠM VI: màn này CHỈ để đặt số (chốt với user) — không hiển thị thực hiện /
 * % đạt, vì phần theo dõi tiến trình đã có ở Tổng quan > Báo cáo chung.
 *
 * CÁCH DÙNG: chọn tháng → gõ số → bấm "Lưu KPI". Trước khi lưu, mọi số đang gõ
 * chỉ là NHÁP (ô viền vàng) và Tổng quan chưa đổi theo.
 *
 * QUYỀN (chốt với user): toàn bộ nhân sự team Content đặt được KPI;
 * team Media / Ads Facebook chỉ xem.
 *
 * Tháng chưa ai thiết lập → hạng mục KÊNH hiện số MẶC ĐỊNH trong code (KPI tháng
 * 7/2026) để báo cáo cũ không tụt về 0; KPI NHÂN VIÊN không có mặc định (công ty
 * giao lại từng tháng) nên để trống đến khi được đặt.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { UserSession, ContentKpiTarget, Employee, AffiliateChannel } from '../types';
import { CONTENT_KPI_ITEMS, targetResolver, hasSavedTargets, BadgeKind } from '../lib/contentKpi';
import {
  contentEmployeeRoster, employeeItemId, employeeTargetResolver, suggestEmployeeTargets,
} from '../lib/contentEmployeeKpi';
import { MonthPicker, shiftMonthKey } from './dashboardKit';

interface Props {
  targets: ContentKpiTarget[];
  employees: Employee[];
  channels: AffiliateChannel[];
  session: UserSession;
  onSave: (period: string, rows: ContentKpiTarget[]) => void;
}

const nowMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthLabel = (p: string) => `tháng ${p.slice(5)}/${p.slice(0, 4)}`;
const onlyDigits = (s: string) => s.replace(/\D/g, '');
const groupDigits = (s: string) => (s ? Number(s).toLocaleString('vi-VN') : '');
const fmt = (n: number) => n.toLocaleString('vi-VN');

/** 1 dòng nhập chỉ tiêu — dùng chung cho hạng mục kênh và nhân viên. */
type Line = {
  id: string;                       // = item_id lưu xuống DB
  label: string;
  kind: ContentKpiTarget['kind'];
  badge: BadgeKind | 'person';
  saved: number;
  value: number;
  dirty: boolean;
};

export default function ContentKpiComponent({ targets, employees, channels, session, onSave }: Props) {
  const [period, setPeriod] = useState(nowMonthKey);
  const [draft, setDraft] = useState<Record<string, string>>({});   // itemId → chuỗi số đang gõ
  const [notice, setNotice] = useState('');

  // Team Content = không thuộc Media / Ads Facebook (đúng quy ước toàn hệ thống).
  const canEdit = session.role === 'Admin'
    || (session.department !== 'Media' && session.department !== 'Ads Facebook');

  // Đổi tháng thì bỏ số nháp — tránh ghi nhầm KPI sang tháng khác.
  useEffect(() => { setDraft({}); }, [period]);

  const savedFor = useMemo(() => targetResolver(targets, period), [targets, period]);
  const empSavedFor = useMemo(() => employeeTargetResolver(targets, period), [targets, period]);
  const isSetup = useMemo(() => hasSavedTargets(targets, period), [targets, period]);
  const roster = useMemo(
    () => contentEmployeeRoster(employees, channels, targets),
    [employees, channels, targets],
  );

  /** Ghép số đã lưu + số đang gõ thành 1 dòng nhập. */
  const mkLine = (o: Omit<Line, 'value' | 'dirty'>): Line => {
    const typed = draft[o.id];
    const value = typed !== undefined ? Number(typed || 0) : o.saved;
    return { ...o, value, dirty: value !== o.saved };
  };

  const lines = CONTENT_KPI_ITEMS.map((item) => mkLine({
    id: item.id, label: item.label, kind: item.kind, badge: item.badge, saved: savedFor(item.id),
  }));
  const empLines = roster.map((e) => mkLine({
    id: employeeItemId(e.name), label: e.name, kind: 'employee', badge: 'person', saved: empSavedFor(e.key),
  }));

  const revLines = lines.filter((l) => l.kind === 'revenue');
  const vrLines = lines.filter((l) => l.kind === 'viewreach');
  const dirtyLines = [...lines, ...empLines].filter((l) => l.dirty);

  const totalTarget = revLines.reduce((s, l) => s + l.value, 0);
  const withTarget = revLines.filter((l) => l.value > 0).length;
  const empTotal = empLines.reduce((s, l) => s + l.value, 0);
  const empWithTarget = empLines.filter((l) => l.value > 0).length;
  // Tổng KPI giao cho người nên khớp tổng KPI giao cho kênh — lệch là có người thiếu/thừa chỉ tiêu.
  const empGap = empTotal - totalTarget;

  const setValue = (itemId: string, raw: string) => setDraft((p) => ({ ...p, [itemId]: onlyDigits(raw) }));

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 4000); };

  /**
   * Lưu TOÀN BỘ hạng mục của tháng (kênh + nhân viên, không chỉ dòng vừa sửa) —
   * để tháng đó được chốt số đầy đủ, không còn phụ thuộc số mặc định trong code.
   */
  const save = () => {
    const rows: ContentKpiTarget[] = [...lines, ...empLines].map((l) => ({
      id: `ckt_${period}_${l.id}`,
      period,
      itemId: l.id,
      itemLabel: l.label,
      kind: l.kind,
      targetValue: l.value,
    }));
    onSave(period, rows);
    setDraft({});
    flash(`Đã lưu KPI ${monthLabel(period)} — ${lines.length} hạng mục kênh + ${empLines.length} nhân viên. Tổng quan sẽ chấm theo số này.`);
  };

  /** Lấy KPI tháng trước làm nháp — vẫn phải bấm "Lưu KPI" mới ghi. */
  const copyPrevMonth = () => {
    const prev = shiftMonthKey(period, -1);
    if (!hasSavedTargets(targets, prev)) {
      flash(`${monthLabel(prev).replace('tháng', 'Tháng')} chưa thiết lập KPI để sao chép.`);
      return;
    }
    const prevOf = targetResolver(targets, prev);
    const prevEmpOf = employeeTargetResolver(targets, prev);
    setDraft({
      ...Object.fromEntries(CONTENT_KPI_ITEMS.map((i) => [i.id, String(prevOf(i.id))])),
      ...Object.fromEntries(roster.map((e) => [employeeItemId(e.name), String(prevEmpOf(e.key))])),
    });
  };

  /** Chia chỉ tiêu kênh về từng người theo kênh họ đang phụ trách (số nháp). */
  const suggestForEmployees = () => {
    const suggested = suggestEmployeeTargets(channels, (id) => {
      const typed = draft[id];
      return typed !== undefined ? Number(typed || 0) : savedFor(id);
    });
    setDraft((p) => ({
      ...p,
      ...Object.fromEntries(roster.map((e) => [employeeItemId(e.name), String(suggested.get(e.key) ?? 0)])),
    }));
    flash('Đã chia chỉ tiêu theo kênh mỗi người đang phụ trách — kiểm tra lại rồi bấm "Lưu KPI".');
  };

  const renderRow = (l: Line, unit: string) => (
    <tr key={l.id} className="group transition-colors hover:bg-rose-50/50">
      <td className={NAME_CELL}>
        <div className="flex items-center gap-2">
          <ItemBadge kind={l.badge} name={l.label} />
          <span className="font-semibold text-slate-700 truncate" title={l.label}>{l.label}</span>
        </div>
      </td>
      <td className={`${CELL} text-right`}>
        {canEdit ? (
          <input
            type="text" inputMode="numeric"
            value={groupDigits(draft[l.id] !== undefined ? draft[l.id] : (l.saved ? String(l.saved) : ''))}
            onChange={(e) => setValue(l.id, e.target.value)}
            placeholder="0"
            className={`w-40 px-3 py-2 text-sm font-bold text-right tabular-nums rounded-lg border outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] ${
              l.dirty ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
            }`}
          />
        ) : (
          <span className="font-bold tabular-nums">{l.value > 0 ? fmt(l.value) : <span className="text-slate-300">—</span>}</span>
        )}
      </td>
      <td className={`${CELL} text-right tabular-nums text-slate-400 whitespace-nowrap`}>
        {l.value > 0 ? `${fmt(Math.round(l.value / 4))} ${unit}` : <span className="text-slate-300">—</span>}
      </td>
    </tr>
  );

  return (
    <div className="max-w-[900px] mx-auto flex flex-col gap-5 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">flag</span>
            <span>KPI tháng — Team Content</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Đặt chỉ tiêu cho từng kênh và từng nhân viên · tiến độ và % đạt xem ở Tổng quan &gt; Báo cáo chung.
          </p>
        </div>
        {/* allowFuture: KPI thường đặt trước cho tháng sau. */}
        <MonthPicker value={period} onChange={setPeriod} allowFuture />
      </div>

      {notice && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-semibold rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>{notice}
        </div>
      )}

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Chỉ nhân sự team Content (và Admin) đặt được KPI. Bạn đang xem ở chế độ chỉ đọc.
        </div>
      )}

      {/* 2 thẻ tổng: KPI theo kênh và KPI đã giao cho người — đối chiếu nhau */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tổng KPI doanh thu · {monthLabel(period)}
          </p>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums mt-1">{fmt(totalTarget)} đ</div>
          <p className="text-[11px] text-slate-400 mt-1">{withTarget}/{revLines.length} hạng mục kênh có chỉ tiêu</p>
          {dirtyLines.length > 0 && (
            <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">edit</span>
              Đang xem số nháp — bấm <b>Lưu KPI</b> để ghi lại.
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng KPI giao cho nhân viên</p>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums mt-1">{fmt(empTotal)} đ</div>
          <p className="text-[11px] text-slate-400 mt-1">{empWithTarget}/{empLines.length} nhân viên có chỉ tiêu</p>
          {totalTarget > 0 && empTotal > 0 && empGap !== 0 && (
            <p className={`text-[11px] mt-2 flex items-center gap-1 ${empGap < 0 ? 'text-amber-600' : 'text-blue-600'}`}>
              <span className="material-symbols-outlined text-[14px]">{empGap < 0 ? 'warning' : 'trending_up'}</span>
              {empGap < 0
                ? `Thấp hơn tổng KPI theo kênh ${fmt(-empGap)} đ`
                : `Cao hơn tổng KPI theo kênh ${fmt(empGap)} đ`}
            </p>
          )}
        </div>
      </div>

      {/* Bảng KPI theo nhân viên */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">Chỉ tiêu doanh thu theo nhân viên</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Thực hiện = doanh thu các kênh người đó phụ trách (gán ở tab Quản lý kênh) · tiến độ xem ở Tổng quan.
            </p>
          </div>
          {canEdit && empLines.length > 0 && (
            <button onClick={suggestForEmployees}
              className="text-[11px] font-bold text-slate-500 hover:text-[#D32027] flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-50">
              <span className="material-symbols-outlined text-[15px]">call_split</span>Chia theo kênh phụ trách
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          {empLines.length === 0 ? (
            <p className="px-4 py-6 text-xs text-slate-400 text-center">
              Chưa có nhân sự nào phụ trách kênh — gán người phụ trách ở tab <b>Quản lý kênh</b> rồi quay lại đặt KPI.
            </p>
          ) : (
            <table className="w-full text-xs border-separate border-spacing-0 min-w-[560px]">
              <thead>
                <tr>
                  <th className={TH_NAME}>Nhân viên</th>
                  <th className={TH}>KPI tháng (đ)</th>
                  <th className={TH}>≈ Mục tiêu tuần</th>
                </tr>
              </thead>
              <tbody>
                {empLines.map((l) => renderRow(l, 'đ'))}
                <tr className="bg-slate-50 font-bold">
                  <td className={`${NAME_BASE} bg-slate-50 text-slate-700`}>Tổng KPI nhân viên</td>
                  <td className={`${CELL} text-right tabular-nums text-slate-900`}>{fmt(empTotal)}</td>
                  <td className={`${CELL} text-right tabular-nums text-slate-400`}>{fmt(Math.round(empTotal / 4))}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bảng hạng mục doanh thu */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">Chỉ tiêu doanh thu theo kênh</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Mục tiêu tuần = chỉ tiêu tháng ÷ 4 — đúng cách chia ở bảng kênh × tuần.</p>
          </div>
          {canEdit && (
            <button onClick={copyPrevMonth}
              className="text-[11px] font-bold text-slate-500 hover:text-[#D32027] flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-50">
              <span className="material-symbols-outlined text-[15px]">content_copy</span>Lấy KPI tháng trước
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0 min-w-[560px]">
            <thead>
              <tr>
                <th className={TH_NAME}>Hạng mục</th>
                <th className={TH}>KPI tháng (đ)</th>
                <th className={TH}>≈ Mục tiêu tuần</th>
              </tr>
            </thead>
            <tbody>
              {revLines.map((l) => renderRow(l, 'đ'))}
              <tr className="bg-slate-50 font-bold">
                <td className={`${NAME_BASE} bg-slate-50 text-slate-700`}>Tổng doanh thu</td>
                <td className={`${CELL} text-right tabular-nums text-slate-900`}>{fmt(totalTarget)}</td>
                <td className={`${CELL} text-right tabular-nums text-slate-400`}>{fmt(Math.round(totalTarget / 4))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bảng view / reach */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 font-display">Chỉ tiêu view / lượt tiếp cận</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Đối chiếu với ô Reach nhập theo tuần ở form TikTok / Facebook thương hiệu.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0 min-w-[560px]">
            <thead>
              <tr>
                <th className={TH_NAME}>Hạng mục</th>
                <th className={TH}>KPI tháng (lượt)</th>
                <th className={TH}>≈ Mục tiêu tuần</th>
              </tr>
            </thead>
            <tbody>{vrLines.map((l) => renderRow(l, 'lượt'))}</tbody>
          </table>
        </div>
      </div>

      {canEdit && (
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">
            {dirtyLines.length === 0
              ? (isSetup ? 'Chưa có thay đổi nào.' : 'Bấm "Lưu KPI" để chốt số mặc định cho tháng này.')
              : `${dirtyLines.length} hạng mục có chỉ tiêu thay đổi.`}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setDraft({})} disabled={dirtyLines.length === 0}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Hoàn tác
            </button>
            <button onClick={save} disabled={dirtyLines.length === 0 && isSetup}
              className="px-6 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Lưu KPI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const CELL = 'px-3 py-2.5 border-b border-slate-100';
const NAME_BASE = 'sticky left-0 z-10 px-4 py-2.5 border-r border-b border-slate-100';
const NAME_CELL = `${NAME_BASE} bg-white group-hover:bg-rose-50/50 max-w-[300px]`;
const TH_BASE = 'text-[10px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200';
const TH = `px-3 py-2.5 text-right whitespace-nowrap bg-slate-50 ${TH_BASE}`;
const TH_NAME = `${NAME_BASE} bg-slate-50 text-left ${TH_BASE}`;

/** Chữ cái đầu của tên — dùng cho avatar chữ của dòng nhân viên. */
const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';

/** Chấm màu nền tảng (hoặc avatar chữ với dòng nhân viên) — cùng ngôn ngữ hình ảnh với Tổng quan. */
function ItemBadge({ kind, name }: { kind: BadgeKind | 'person'; name: string }) {
  if (kind === 'person') {
    return (
      <span className="shrink-0 inline-flex items-center justify-center w-9 h-5 rounded-md text-[9px] font-extrabold text-white bg-[#D32027]">
        {initialsOf(name)}
      </span>
    );
  }
  const map: Record<BadgeKind, { c: string; t: string }> = {
    tiktok: { c: 'bg-slate-900', t: 'TT' },
    koc: { c: 'bg-pink-500', t: 'KOC' },
    fb: { c: 'bg-blue-600', t: 'FB' },
    other: { c: 'bg-slate-300', t: '—' },
  };
  const s = map[kind];
  return (
    <span className={`shrink-0 inline-flex items-center justify-center w-9 h-5 rounded-md text-[9px] font-extrabold text-white ${s.c}`}>
      {s.t}
    </span>
  );
}
