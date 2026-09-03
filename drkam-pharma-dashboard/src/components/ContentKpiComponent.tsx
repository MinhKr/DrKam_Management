'use client';
/**
 * KPI THÁNG — TEAM CONTENT (bảng content_kpi_targets, migration 0015 + 0019).
 *
 * Màn này đặt 2 loại chỉ tiêu của một tháng:
 *   1. THEO KÊNH      — 13 hạng mục doanh thu + 2 dòng view/reach (migration 0015),
 *                       đúng danh sách hiển thị ở Tổng quan > Báo cáo chung.
 *   2. THEO KÊNH (MỚI) — 1 dòng cho MỖI KÊNH đang quản lý (migration 0020),
 *                       TikTok AI tách chi tiết từng kênh; lấy thẳng danh sách
 *                       kênh nên thêm kênh mới là tự có dòng.
 * Danh mục bảng cũ cố định trong src/lib/contentKpi.ts, bảng mới dựng từ danh
 * sách kênh (src/lib/contentChannelKpi.ts) nên 2 màn không lệch nhau được.
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
import { UserSession, ContentKpiTarget, AffiliateChannel, Employee } from '../types';
import { CONTENT_KPI_ITEMS, targetResolver, hasSavedTargets, BadgeKind } from '../lib/contentKpi';
// Bảng KPI MỚI — chi tiết từng kênh (migration 0020), chạy song song bảng cũ.
import {
  CHANNEL_GROUPS, ChannelKpiRow, channelKpiRows, channelTargetResolver,
} from '../lib/contentChannelKpi';
import { contentEmployeeRoster, employeeTargetsFromChannels, UNASSIGNED_LABEL } from '../lib/contentEmployeeKpi';
import { WEB_KPI_ITEMS, webTargetResolver } from '../lib/webReport';
import { MonthPicker, shiftMonthKey } from './dashboardKit';

interface Props {
  targets: ContentKpiTarget[];
  channels: AffiliateChannel[];
  employees: Employee[];
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
  badge: BadgeKind;
  saved: number;
  value: number;
  dirty: boolean;
};

export default function ContentKpiComponent({ targets, channels, employees, session, onSave }: Props) {
  const [period, setPeriod] = useState(nowMonthKey);
  const [draft, setDraft] = useState<Record<string, string>>({});   // itemId → chuỗi số đang gõ
  const [notice, setNotice] = useState('');

  // Team Content = không thuộc Media / Ads Facebook (đúng quy ước toàn hệ thống).
  const canEdit = session.role === 'Admin'
    || (session.department !== 'Media' && session.department !== 'Ads Facebook');

  // Đổi tháng thì bỏ số nháp — tránh ghi nhầm KPI sang tháng khác.
  useEffect(() => { setDraft({}); }, [period]);

  const savedFor = useMemo(() => targetResolver(targets, period), [targets, period]);
  const isSetup = useMemo(() => hasSavedTargets(targets, period), [targets, period]);

  /** Ghép số đã lưu + số đang gõ thành 1 dòng nhập. */
  const mkLine = (o: Omit<Line, 'value' | 'dirty'>): Line => {
    const typed = draft[o.id];
    const value = typed !== undefined ? Number(typed || 0) : o.saved;
    return { ...o, value, dirty: value !== o.saved };
  };

  const lines = CONTENT_KPI_ITEMS.map((item) => mkLine({
    id: item.id, label: item.label, kind: item.kind, badge: item.badge, saved: savedFor(item.id),
  }));
  // BẢNG MỚI — mỗi kênh đang quản lý 1 dòng (TikTok AI tách chi tiết từng kênh).
  const chTargetOf = useMemo(() => channelTargetResolver(targets, period), [targets, period]);
  const chRows = useMemo(() => channelKpiRows(channels), [channels]);
  const chLines = chRows.map((row) => ({
    row,
    line: mkLine({ id: row.itemId, label: row.name, kind: 'channel', badge: row.badge, saved: chTargetOf(row.key) }),
  }));

  // TỔNG KPI THEO NGƯỜI — cộng ngay từ số ĐANG GÕ ở bảng trên (kể cả phần
  // Facebook Ads), để vừa nhập là thấy chỉ tiêu tháng của từng nhân viên.
  const chValueOf = (chKey: string) =>
    chLines.find((x) => x.row.key === chKey)?.line.value ?? 0;
  const empKpi = employeeTargetsFromChannels(channels, chValueOf);
  const empRows = contentEmployeeRoster(employees, channels)
    .map((e) => ({ ...e, target: empKpi.get(e.key) ?? 0 }))
    .sort((a, b) => b.target - a.target || a.name.localeCompare(b.name, 'vi'));
  const empUnassigned = empKpi.get('') ?? 0;
  const empSum = empRows.reduce((s2, r) => s2 + r.target, 0);

  // Chỉ tiêu Web / SEO (migration 0021) — lưu chung bảng KPI với kind='viewreach',
  // item_id 'web-traffic' / 'web-posts' nên không đụng 2 hạng mục view/reach cũ.
  const webSavedFor = useMemo(() => webTargetResolver(targets, period), [targets, period]);
  const webLines = WEB_KPI_ITEMS.map((i) => ({
    unit: i.unit,
    line: mkLine({ id: i.id, label: i.label, kind: 'viewreach', badge: 'other', saved: webSavedFor(i.id) }),
  }));

  const revLines = lines.filter((l) => l.kind === 'revenue');
  const vrLines = lines.filter((l) => l.kind === 'viewreach');
  const allLines = [...lines, ...chLines.map((x) => x.line), ...webLines.map((x) => x.line)];
  const dirtyLines = allLines.filter((l) => l.dirty);

  const chTotal = chLines.reduce((s, x) => s + x.line.value, 0);
  const chWithTarget = chLines.filter((x) => x.line.value > 0).length;

  const totalTarget = revLines.reduce((s, l) => s + l.value, 0);
  const withTarget = revLines.filter((l) => l.value > 0).length;

  const setValue = (itemId: string, raw: string) => setDraft((p) => ({ ...p, [itemId]: onlyDigits(raw) }));

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 4000); };

  /**
   * Lưu TOÀN BỘ hạng mục của tháng (kênh + nhân viên, không chỉ dòng vừa sửa) —
   * để tháng đó được chốt số đầy đủ, không còn phụ thuộc số mặc định trong code.
   */
  const save = () => {
    const rows: ContentKpiTarget[] = allLines.map((l) => ({
      id: `ckt_${period}_${l.id}`,
      period,
      itemId: l.id,
      itemLabel: l.label,
      kind: l.kind,
      targetValue: l.value,
    }));
    onSave(period, rows);
    setDraft({});
    flash(`Đã lưu KPI ${monthLabel(period)} — ${chLines.length} kênh (bảng mới) + ${webLines.length} hạng mục web + ${lines.length} hạng mục bảng cũ.`);
  };

  /** Lấy KPI tháng trước làm nháp — vẫn phải bấm "Lưu KPI" mới ghi. */
  const copyPrevMonth = () => {
    const prev = shiftMonthKey(period, -1);
    if (!hasSavedTargets(targets, prev)) {
      flash(`${monthLabel(prev).replace('tháng', 'Tháng')} chưa thiết lập KPI để sao chép.`);
      return;
    }
    const prevOf = targetResolver(targets, prev);
    const prevChOf = channelTargetResolver(targets, prev);
    setDraft({
      ...Object.fromEntries(CONTENT_KPI_ITEMS.map((i) => [i.id, String(prevOf(i.id))])),
      ...Object.fromEntries(chRows.map((r) => [r.itemId, String(prevChOf(r.key))])),
      ...Object.fromEntries(WEB_KPI_ITEMS.map((i) => [i.id, String(webTargetResolver(targets, prev)(i.id))])),
    });
  };

  /** 1 dòng kênh của bảng mới — có thêm cột người phụ trách. */
  const renderChannelRow = ({ row, line }: { row: ChannelKpiRow; line: Line }) => (
    <tr key={line.id} className="group transition-colors hover:bg-rose-50/50">
      <td className={NAME_CELL}>
        <div className="flex items-center gap-2">
          <ItemBadge kind={line.badge} />
          <span className="font-semibold text-slate-700 truncate" title={row.name}>{row.name}</span>
        </div>
      </td>
      <td className={`${CELL} text-left text-slate-500 whitespace-nowrap`}>
        {row.manager || <span className="text-amber-600 font-semibold">Chưa gán</span>}
      </td>
      <td className={`${CELL} text-right`}>
        {canEdit ? (
          <input
            type="text" inputMode="numeric"
            value={groupDigits(draft[line.id] !== undefined ? draft[line.id] : (line.saved ? String(line.saved) : ''))}
            onChange={(e) => setValue(line.id, e.target.value)}
            placeholder="0"
            className={`w-36 px-3 py-2 text-sm font-bold text-right tabular-nums rounded-lg border outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] ${
              line.dirty ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
            }`}
          />
        ) : (
          <span className="font-bold tabular-nums">{line.value > 0 ? fmt(line.value) : <span className="text-slate-300">—</span>}</span>
        )}
      </td>
      <td className={`${CELL} text-right tabular-nums text-slate-400 whitespace-nowrap`}>
        {line.value > 0 ? `${fmt(Math.round(line.value / 4))} đ` : <span className="text-slate-300">—</span>}
      </td>
    </tr>
  );

  const renderRow = (l: Line, unit: string) => (
    <tr key={l.id} className="group transition-colors hover:bg-rose-50/50">
      <td className={NAME_CELL}>
        <div className="flex items-center gap-2">
          <ItemBadge kind={l.badge} />
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

      {/* 3 thẻ tổng: bảng MỚI theo kênh · KPI đã về tay người · bảng CŨ để đối chiếu */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-5 border-2 border-[#D32027]/20 soft-shadow">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#D32027]">
            Bảng mới · KPI theo kênh · {monthLabel(period)}
          </p>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums mt-1">{fmt(chTotal)} đ</div>
          <p className="text-[11px] text-slate-400 mt-1">{chWithTarget}/{chLines.length} kênh có chỉ tiêu</p>
          {dirtyLines.length > 0 && (
            <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">edit</span>
              Đang xem số nháp — bấm <b>Lưu KPI</b> để ghi lại.
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">KPI đã về tay nhân viên</p>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums mt-1">{fmt(empSum)} đ</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {empRows.filter((e) => e.target > 0).length}/{empRows.length} nhân viên có chỉ tiêu
          </p>
          {empUnassigned > 0 && (
            <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Còn {fmt(empUnassigned)} đ ở kênh chưa gán người
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 soft-shadow">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bảng cũ · KPI theo hạng mục</p>
          <div className="text-3xl font-extrabold text-slate-500 tracking-tight tabular-nums mt-1">{fmt(totalTarget)} đ</div>
          <p className="text-[11px] text-slate-400 mt-1">{withTarget}/{revLines.length} hạng mục có chỉ tiêu</p>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">history</span>
            Giữ nguyên để đối chiếu — không mất dữ liệu cũ.
          </p>
        </div>
      </div>

      {/* BẢNG MỚI — chỉ tiêu doanh thu chi tiết từng kênh */}
      <div className="bg-white rounded-2xl border-2 border-[#D32027]/20 soft-shadow overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-[#D32027] text-white text-[9px] font-extrabold uppercase tracking-wide">Bảng mới</span>
              Chỉ tiêu doanh thu chi tiết theo từng kênh
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Lấy đúng danh sách kênh đang quản lý — TikTok AI tách riêng từng kênh. Thêm kênh mới là tự có dòng.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400 tabular-nums">{chLines.length} kênh</span>
        </div>
        <div className="overflow-x-auto">
          {chLines.length === 0 ? (
            <p className="px-4 py-6 text-xs text-slate-400 text-center">
              Chưa có kênh nào bật theo dõi doanh thu — bật ở tab <b>Quản lý kênh</b> rồi quay lại đặt KPI.
            </p>
          ) : (
            <table className="w-full text-xs border-separate border-spacing-0 min-w-[680px]">
              <thead>
                <tr>
                  <th className={TH_NAME}>Kênh</th>
                  <th className={`${TH} text-left`}>Người phụ trách</th>
                  <th className={TH}>KPI tháng (đ)</th>
                  <th className={TH}>≈ Mục tiêu tuần</th>
                </tr>
              </thead>
              <tbody>
                {CHANNEL_GROUPS.map((g) => {
                  const items = chLines.filter((x) => x.row.group === g.key);
                  if (items.length === 0) return null;
                  const sub = items.reduce((acc, x) => acc + x.line.value, 0);
                  return (
                    <React.Fragment key={g.key}>
                      <tr>
                        <td colSpan={4} className="px-4 py-1.5 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                          {g.label} · {items.length} kênh · {fmt(sub)} đ
                          {g.key === 'fb-ads' && (
                            <span className="ml-2 normal-case font-semibold text-slate-400 tracking-normal">
                              — KPI gộp cả team, không chia cho từng người.
                            </span>
                          )}
                        </td>
                      </tr>
                      {items.map((x) => renderChannelRow(x))}
                    </React.Fragment>
                  );
                })}
                <tr className="bg-slate-50 font-bold">
                  <td className={`${NAME_BASE} bg-slate-50 text-slate-700`}>Tổng KPI bảng mới</td>
                  <td className={CELL} />
                  <td className={`${CELL} text-right tabular-nums text-slate-900`}>{fmt(chTotal)}</td>
                  <td className={`${CELL} text-right tabular-nums text-slate-400`}>{fmt(Math.round(chTotal / 4))}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* TỔNG KPI THEO NHÂN VIÊN — chỉ để xem, tự cộng từ bảng kênh phía trên */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
              <span className="material-symbols-outlined text-[#D32027] text-[18px]">groups</span>
              Tổng KPI doanh thu theo nhân viên
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tự cộng từ bảng trên: KPI các kênh người đó phụ trách. Facebook Ads là KPI gộp của team nên không tính cho ai.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400 tabular-nums">{fmt(empSum)} đ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0 min-w-[560px]">
            <thead>
              <tr>
                <th className={TH_NAME}>Nhân viên</th>
                <th className={TH}>KPI tháng (đ)</th>
                <th className={TH}>≈ Mục tiêu tuần</th>
              </tr>
            </thead>
            <tbody>
              {empRows.map((e) => (
                <tr key={e.key} className="group transition-colors hover:bg-rose-50/50">
                  <td className={NAME_CELL}>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 inline-flex items-center justify-center w-9 h-5 rounded-md text-[9px] font-extrabold text-white bg-slate-800">
                        {initialsOf(e.name)}
                      </span>
                      <span className="font-semibold text-slate-700 truncate" title={e.name}>{e.name}</span>
                    </div>
                  </td>
                  <td className={`${CELL} text-right font-bold tabular-nums ${e.target ? 'text-slate-900' : 'text-slate-300'}`}>
                    {e.target ? fmt(e.target) : '—'}
                  </td>
                  <td className={`${CELL} text-right tabular-nums text-slate-400 whitespace-nowrap`}>
                    {e.target ? `${fmt(Math.round(e.target / 4))} đ` : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
              {empUnassigned > 0 && (
                <tr className="bg-amber-50/60">
                  <td className={`${NAME_BASE} bg-amber-50/60`}>
                    <span className="text-amber-700 font-semibold">{UNASSIGNED_LABEL}</span>
                  </td>
                  <td className={`${CELL} text-right font-bold tabular-nums text-amber-700`}>{fmt(empUnassigned)}</td>
                  <td className={`${CELL} text-right text-[10px] text-amber-600`}>Gán ở tab Quản lý kênh</td>
                </tr>
              )}
              <tr className="bg-slate-50 font-bold">
                <td className={`${NAME_BASE} bg-slate-50 text-slate-700`}>Tổng đã giao cho người</td>
                <td className={`${CELL} text-right tabular-nums text-slate-900`}>{fmt(empSum)}</td>
                <td className={`${CELL} text-right tabular-nums text-slate-400`}>{fmt(Math.round(empSum / 4))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bảng hạng mục doanh thu */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-500 font-display flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-extrabold uppercase tracking-wide">Bảng cũ</span>
              Chỉ tiêu doanh thu theo hạng mục
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Giữ nguyên để đối chiếu với bảng mới — vẫn là số đang chấm ở bảng kênh × tuần của Tổng quan.
            </p>
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

      {/* Chỉ tiêu Web / SEO — dùng ở màn "Báo cáo web" */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-violet-600 text-[18px]">language</span>
            Chỉ tiêu Web / SEO
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Chấm ở màn <b>Báo cáo web</b>: lượt truy cập nhập tay theo ngày · số bài viết đếm từ dòng “SEO WEB” của Checklist.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0 min-w-[560px]">
            <thead>
              <tr>
                <th className={TH_NAME}>Hạng mục</th>
                <th className={TH}>KPI tháng</th>
                <th className={TH}>≈ Mục tiêu tuần</th>
              </tr>
            </thead>
            <tbody>{webLines.map((w) => renderRow(w.line, w.unit))}</tbody>
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

/** Chữ cái đầu của tên (2 từ cuối) — avatar chữ ở bảng tổng KPI theo nhân viên. */
const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';

/** Chấm màu nền tảng — cùng ngôn ngữ hình ảnh với bảng ở Tổng quan. */
function ItemBadge({ kind }: { kind: BadgeKind }) {
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
