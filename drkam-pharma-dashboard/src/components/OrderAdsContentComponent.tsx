'use client';
/**
 * ORDER — ĐẶT KỊCH BẢN CHO TEAM CONTENT (bảng ads_content_orders).
 * Bên đặt: team Ads Facebook và team Media (chốt 06/08/2026 — Media cũng order được).
 * Vòng đời theo sheet gốc: bên đặt gửi brief → Content viết kịch bản → Editor dựng
 * video → Ads chạy và ghi kết quả (tiền tiêu / số data / giải trình).
 *
 * QUYỀN (chốt với user — đúng vai):
 *   • Bên ĐẶT (người tạo / người đứng tên đặt, hoặc Admin): brief, kích thước,
 *     link mẫu, hạn, ưu tiên + khối "kết quả chạy" và ô comment của bên đặt.
 *   • Bên NHẬN (team Content, hoặc Admin): trạng thái, kịch bản, người phụ trách,
 *     video final và ô comment của Content.
 *   • Xóa: chỉ người tạo hoặc Admin.
 *
 * Khối "kết quả chạy" chỉ có nghĩa với order của team Ads nên ẩn với nick Media.
 */
import React, { useMemo, useState } from 'react';
import {
  AdsContentOrder, Employee, UserSession,
  ORDER_PRIORITIES, ADS_CONTENT_STATUSES, AdsContentStatus, OrderPriority,
} from '../types';
import {
  orderDeadline, sortByUrgency, countAlerts, orderInPeriod, isOrderClosed,
  ADS_CONTENT_TOPICS, ADS_CONTENT_SIZES, todayStart,
} from '../lib/orders';
import { MonthPicker } from './dashboardKit';
import {
  AlertStrip, DeadlineBadge, PriorityBadge, StatusBadge, LinkCell,
  Field, StaffSelect, DateField, INPUT, isContentStaff, isAdsStaff, isMediaStaff,
} from './orderKit';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  orders: AdsContentOrder[];
  employees: Employee[];
  session: UserSession;
  currentUserId: string | null;
  onAdd: (o: AdsContentOrder) => void;
  onUpdate: (id: string, patch: Partial<AdsContentOrder>) => void;
  onDelete: (id: string) => void;
}

const nowMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const todayUi = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
const fmtVnd = (v: number) => v.toLocaleString('vi-VN');

export default function OrderAdsContentComponent({ orders, employees, session, currentUserId, onAdd, onUpdate, onDelete }: Props) {
  const [period, setPeriod] = useState(nowMonthKey);
  const [alertFilter, setAlertFilter] = useState<'overdue' | 'urgent' | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | AdsContentStatus>('all');
  const [ownerFilter, setOwnerFilter] = useState<'all' | string>('all');
  const [showClosed, setShowClosed] = useState(false);   // khối order đã xong/hủy: mặc định thu gọn
  const [editing, setEditing] = useState<AdsContentOrder | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const isAdmin = session.role === 'Admin';
  // Team Content = không thuộc Media / Ads Facebook (đúng quy ước Checklist Content).
  const isContentUser = session.department !== 'Media' && session.department !== 'Ads Facebook';
  const isMediaUser = session.department === 'Media';
  // BÊN ĐẶT = team Ads Facebook + team Media (và Admin); bên nhận (Content) chỉ nhận việc.
  const canCreate = isAdmin || session.department === 'Ads Facebook' || isMediaUser;
  const contentStaff = useMemo(() => employees.filter(isContentStaff), [employees]);
  const adsStaff = useMemo(() => employees.filter(isAdsStaff), [employees]);
  const mediaStaff = useMemo(() => employees.filter(isMediaStaff), [employees]);
  // Danh sách chọn "Người đặt" — gộp cả 2 team được phép đặt kịch bản.
  const requesterStaff = useMemo(() => [...adsStaff, ...mediaStaff], [adsStaff, mediaStaff]);
  const now = todayStart();

  // Bên ĐẶT = người TẠO dòng hoặc người ĐỨNG TÊN đặt (Ads hoặc Media).
  const canEditBrief = (o: AdsContentOrder) =>
    isAdmin || (!!currentUserId && (o.createdById === currentUserId || o.adsOwnerId === currentUserId));
  const canEditProgress = (o: AdsContentOrder) => isAdmin || isContentUser || canEditBrief(o);
  // Xóa — khớp đúng policy delete ở migration 0014:
  // dòng chưa có người tạo, hoặc mình là người tạo / người đặt, hoặc Admin.
  const canDelete = (o: AdsContentOrder) =>
    isAdmin || !o.createdById || (!!currentUserId && (o.createdById === currentUserId || o.adsOwnerId === currentUserId));

  const monthOrders = useMemo(() => orders.filter((o) => orderInPeriod(o.orderDate, period)), [orders, period]);
  const counts = useMemo(() => countAlerts(monthOrders, now), [monthOrders, now]);

  // Lọc chung, sau đó TÁCH order đang chạy và order đã đóng (xong/hủy):
  // đã đóng dồn xuống một khối gập riêng để không làm loãng danh sách đang làm.
  const filtered = useMemo(() => {
    let list = monthOrders;
    if (alertFilter) list = list.filter((o) => orderDeadline(o.deadline, o.status, now).alert === alertFilter);
    if (statusFilter !== 'all') list = list.filter((o) => o.status === statusFilter);
    if (ownerFilter !== 'all') list = list.filter((o) => o.contentOwnerId === ownerFilter);
    return sortByUrgency(list, now);
  }, [monthOrders, alertFilter, statusFilter, ownerFilter, now]);

  const activeRows = filtered.filter((o) => !isOrderClosed(o.status));
  const closedRows = filtered.filter((o) => isOrderClosed(o.status));
  const closedOpen = showClosed || (statusFilter !== 'all' && isOrderClosed(statusFilter));

  // Chỉ điền sẵn "Người đặt" khi người đang đăng nhập thuộc bên đặt (Ads / Media);
  // Admin thuộc team khác thì để trống và tự chọn.
  const meIsRequester = session.department === 'Ads Facebook' || isMediaUser;

  const blank = (): AdsContentOrder => ({
    id: '', orderDate: todayUi(), postCode: '', topic: '',
    adsOwnerId: meIsRequester ? currentUserId : null,
    adsOwnerName: meIsRequester ? session.name : '',
    size: '9:16', sampleLink: '', brief: '',
    priority: 'TRUNG BÌNH', deadline: '', status: 'Chờ nhận',
    scriptLink: '', contentOwnerId: null, contentOwnerName: '', videoFinal: '',
    commentContent: '', commentAds: '',
    isRunning: false, runOwnerName: '', airDate: '', spend: 0, dataCount: 0, explanation: '',
    createdById: currentUserId,
  });

  /**
   * 1 dòng order. Ba tín hiệu giúp mắt tách dòng khi danh sách dài:
   *  • nền so le (dòng chẵn/lẻ) — ô "Hạn" dính trái phải cùng nền nên tô riêng;
   *  • vạch màu bên trái theo mức khẩn (đỏ quá hạn · cam sắp hết hạn · xanh còn hạn);
   *  • dòng đã đóng thì xám và chữ mảnh hơn.
   */
  const renderRow = (o: AdsContentOrder, i: number, muted: boolean) => {
    const info = orderDeadline(o.deadline, o.status, now);
    const bg = muted
      ? (i % 2 ? 'bg-slate-100/60' : 'bg-slate-50/80')
      : info.alert === 'overdue' ? 'bg-rose-50/60'
      : i % 2 ? 'bg-slate-50/80' : 'bg-white';
    const bar = muted ? 'border-l-slate-200'
      : info.alert === 'overdue' ? 'border-l-rose-500'
      : info.alert === 'urgent' ? 'border-l-amber-400'
      : info.alert === 'ontime' ? 'border-l-emerald-400'
      : 'border-l-slate-200';
    return (
      <tr key={o.id} className={`group transition-colors ${bg} hover:bg-sky-50/70 ${muted ? 'text-slate-400' : ''}`}>
        <td className={`${NAME_CELL} ${bg} border-l-4 ${bar} group-hover:bg-sky-50/70`}>
          <DeadlineBadge info={info} deadline={o.deadline} />
          {o.deadline && <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">{o.deadline}</div>}
        </td>
        <td className={`${CELL} text-center tabular-nums ${muted ? '' : 'text-slate-500'}`}>{o.orderDate}</td>
        <td className={`${CELL} ${muted ? 'font-medium' : 'font-semibold text-slate-700'}`}>
          {o.postCode || <span className="text-slate-300 font-normal">—</span>}
        </td>
        <td className={`${CELL} max-w-[220px]`}>
          <div className={`truncate ${muted ? 'line-through decoration-slate-300' : 'text-slate-700'}`} title={o.topic}>
            {o.topic || <span className="text-slate-300">—</span>}
          </div>
          {o.brief && <div className="text-[10px] text-slate-400 truncate" title={o.brief}>{o.brief}</div>}
        </td>
        <td className={`${CELL} text-center ${muted ? '' : 'text-slate-500'}`}>{o.size || '—'}</td>
        <td className={`${CELL} text-center`}><PriorityBadge priority={o.priority} /></td>
        <td className={`${CELL} ${muted ? '' : 'text-slate-600'}`}>{o.adsOwnerName || <span className="text-slate-300">—</span>}</td>
        <td className={`${CELL} ${muted ? '' : 'text-slate-600'}`}>{o.contentOwnerName || <span className="text-amber-500">chưa giao</span>}</td>
        <td className={CELL}>
          {canEditProgress(o) ? (
            <select
              value={o.status}
              onChange={(e) => onUpdate(o.id, { status: e.target.value as AdsContentStatus })}
              className="text-[11px] font-bold border border-slate-200 rounded-lg px-1.5 py-1 outline-none bg-white text-slate-700 cursor-pointer">
              {ADS_CONTENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : <StatusBadge status={o.status} />}
        </td>
        <td className={CELL}><LinkCell value={o.videoFinal} max={22} /></td>
        <td className={`${CELL} text-center`}>
          {o.isRunning
            ? <span className="inline-flex flex-col items-center">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">play_circle</span>
                {o.spend > 0 && <span className="text-[10px] text-slate-400 tabular-nums">{fmtVnd(o.spend)}đ · {o.dataCount} số</span>}
              </span>
            : <span className="material-symbols-outlined text-[18px] text-slate-300">pause_circle</span>}
        </td>
        <td className={`${CELL} text-center whitespace-nowrap`}>
          <button onClick={() => setEditing(o)} title="Sửa"
            className="text-slate-400 hover:text-[#D32027] p-1 rounded-lg hover:bg-slate-100">
            <span className="material-symbols-outlined text-[17px]">edit</span>
          </button>
          {canDelete(o) && (
            <button title="Xóa"
              onClick={() => setConfirm({
                message: `Xóa order "${o.postCode || o.topic}"?`,
                onConfirm: () => { onDelete(o.id); setConfirm(null); },
              })}
              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50">
              <span className="material-symbols-outlined text-[17px]">delete</span>
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-5 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">campaign</span>
            <span>Order — Đặt kịch bản cho team Content</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Team Ads Facebook và team Media đều đặt được · theo dõi hạn, tiến độ và kết quả chạy.</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker value={period} onChange={setPeriod} allowFuture />
          {canCreate && (
            <button onClick={() => setEditing(blank())}
              className="px-4 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">add</span>Thêm order
            </button>
          )}
        </div>
      </div>

      <AlertStrip counts={counts} active={alertFilter} onPick={setAlertFilter} />

      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Trạng thái</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | AdsContentStatus)}
            className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white">
            <option value="all">Tất cả</option>
            {ADS_CONTENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Content phụ trách</span>
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white">
            <option value="all">Tất cả</option>
            {contentStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <span className="ml-auto text-[11px] text-slate-400">
          {activeRows.length} đang chạy{closedRows.length > 0 && ` · ${closedRows.length} đã xong/hủy`}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0 min-w-[1180px]">
            <thead>
              <tr>
                <th className={TH_NAME}>Hạn</th>
                <th className={TH}>Ngày</th>
                <th className={`${TH} text-left`}>ID bài viết</th>
                <th className={`${TH} text-left`}>Loại kịch bản</th>
                <th className={TH}>Kích thước</th>
                <th className={TH}>Ưu tiên</th>
                <th className={`${TH} text-left`}>Người đặt</th>
                <th className={`${TH} text-left`}>Content phụ trách</th>
                <th className={`${TH} text-left`}>Trạng thái</th>
                <th className={`${TH} text-left`}>Video final</th>
                <th className={TH}>Đã chạy</th>
                <th className={`${TH} text-center`}></th>
              </tr>
            </thead>
            <tbody>
              {activeRows.map((o, i) => renderRow(o, i, false))}
              {activeRows.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-10 text-center text-slate-400">
                  {closedRows.length > 0
                    ? 'Không còn order nào đang chạy — mọi order trong bộ lọc đã xong/hủy.'
                    : `Chưa có order nào khớp bộ lọc trong tháng ${period.slice(5)}/${period.slice(0, 4)}.`}
                </td></tr>
              )}

              {/* Khối order ĐÃ ĐÓNG — gập lại, xám đi để không tranh chỗ với việc đang chạy */}
              {closedRows.length > 0 && (
                <tr>
                  <td colSpan={12} className="p-0">
                    <button type="button" onClick={() => setShowClosed(!closedOpen)}
                      className="w-full px-4 py-2.5 bg-slate-100/80 border-y border-slate-200 flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:bg-slate-200/70 transition-colors">
                      <span className={`material-symbols-outlined text-[16px] transition-transform ${closedOpen ? 'rotate-180' : ''}`}>expand_more</span>
                      Đã hoàn thành / hủy ({closedRows.length})
                      <span className="font-normal text-slate-400">— {closedOpen ? 'bấm để thu gọn' : 'bấm để xem'}</span>
                    </button>
                  </td>
                </tr>
              )}
              {closedOpen && closedRows.map((o, i) => renderRow(o, i, true))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <AdsOrderModal
          order={editing}
          contentStaff={contentStaff}
          requesterStaff={requesterStaff}
          showRunResult={!isMediaUser || isAdmin}
          canEditBrief={editing.id === '' || canEditBrief(editing)}
          canEditProgress={editing.id === '' || canEditProgress(editing)}
          onClose={() => setEditing(null)}
          onSubmit={(o) => {
            if (o.id) onUpdate(o.id, o);
            else onAdd({ ...o, id: 'aco_' + Date.now() });
            setEditing(null);
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog open message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

// Viền dưới đậm hơn + dòng cao hơn để các dòng tách bạch khi danh sách dài.
const CELL = 'px-3 py-3 border-b border-slate-200 align-top';
const NAME_BASE = 'sticky left-0 z-10 px-3 py-3 border-r border-b border-slate-200 align-top';
const NAME_CELL = NAME_BASE;
const TH_BASE = 'text-[10px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200';
const TH = `px-3 py-2.5 text-center whitespace-nowrap bg-slate-50 ${TH_BASE}`;
const TH_NAME = `${NAME_BASE} bg-slate-50 text-left ${TH_BASE}`;

/* ── Popup thêm/sửa: 3 khối theo đúng 3 vai trong sheet gốc ──
   requesterStaff = nhân sự được đứng tên đặt (team Ads + team Media).
   showRunResult = có hiện khối "kết quả chạy" không (chỉ có nghĩa với order Ads). */
function AdsOrderModal({ order, contentStaff, requesterStaff, showRunResult, canEditBrief, canEditProgress, onClose, onSubmit }: {
  order: AdsContentOrder;
  contentStaff: Employee[];
  requesterStaff: Employee[];
  showRunResult: boolean;
  canEditBrief: boolean;
  canEditProgress: boolean;
  onClose: () => void;
  onSubmit: (o: AdsContentOrder) => void;
}) {
  const [f, setF] = useState<AdsContentOrder>(order);
  const set = (patch: Partial<AdsContentOrder>) => setF((p) => ({ ...p, ...patch }));
  const isNew = !order.id;
  const num = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}
        className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 my-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">{isNew ? 'Thêm order cho team Content' : 'Sửa order'}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Đặt hạn để hệ thống cảnh báo trước 1 ngày và khi quá hạn.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 1. Bên đặt (Ads / Media) */}
          <div>
            <p className="text-[11px] font-bold text-[#D32027] uppercase tracking-widest mb-3">Yêu cầu · bên đặt (Ads / Media)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ngày order">
                <DateField value={f.orderDate} onChange={(v) => set({ orderDate: v })} disabled={!canEditBrief} />
              </Field>
              <Field label="Deadline" hint="Trống = chưa đặt hạn, sẽ không có cảnh báo.">
                <DateField value={f.deadline} onChange={(v) => set({ deadline: v })} disabled={!canEditBrief} />
              </Field>
              <Field label="ID bài viết">
                <input className={INPUT} disabled={!canEditBrief} value={f.postCode ?? ''}
                  onChange={(e) => set({ postCode: e.target.value })} placeholder="ID-H24061" />
              </Field>
              <Field label="Loại kịch bản">
                <input list="aco-topics" className={INPUT} disabled={!canEditBrief} value={f.topic}
                  onChange={(e) => set({ topic: e.target.value })} placeholder="Hôi miệng, viêm nướu…" required />
                <datalist id="aco-topics">
                  {ADS_CONTENT_TOPICS.map((t) => <option key={t} value={t} />)}
                </datalist>
              </Field>
              <Field label="Kích thước">
                <input list="aco-sizes" className={INPUT} disabled={!canEditBrief} value={f.size ?? ''}
                  onChange={(e) => set({ size: e.target.value })} placeholder="9:16" />
                <datalist id="aco-sizes">
                  {ADS_CONTENT_SIZES.map((s) => <option key={s} value={s} />)}
                </datalist>
              </Field>
              <Field label="Ưu tiên">
                <select className={INPUT} disabled={!canEditBrief} value={f.priority}
                  onChange={(e) => set({ priority: e.target.value as OrderPriority })}>
                  {ORDER_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Link bài mẫu" className="sm:col-span-2">
                <input className={INPUT} disabled={!canEditBrief} value={f.sampleLink ?? ''}
                  onChange={(e) => set({ sampleLink: e.target.value })} placeholder="https://facebook.com/…" />
              </Field>
              <Field label="Khung kịch bản video (brief)" className="sm:col-span-2">
                <textarea className={`${INPUT} min-h-[90px]`} disabled={!canEditBrief} value={f.brief ?? ''}
                  onChange={(e) => set({ brief: e.target.value })} placeholder="Mô tả yêu cầu chi tiết cho team Content…" />
              </Field>
              <Field label="Người đặt" hint="Bắt buộc — nhân sự team Ads hoặc team Media.">
                <StaffSelect value={f.adsOwnerId} valueName={f.adsOwnerName} staff={requesterStaff}
                  disabled={!canEditBrief} required
                  onChange={(id, name) => set({ adsOwnerId: id, adsOwnerName: name })} />
              </Field>
              <Field label="Comment của bên đặt" hint="Phản hồi gửi lại team Content.">
                <input className={INPUT} disabled={!canEditBrief} value={f.commentAds ?? ''}
                  onChange={(e) => set({ commentAds: e.target.value })} placeholder="Video ok rồi / cần sửa…" />
              </Field>
            </div>
          </div>

          {/* 2. Content nhận */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Tiến độ · bên nhận (Content)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Trạng thái">
                <select className={INPUT} disabled={!canEditProgress} value={f.status}
                  onChange={(e) => set({ status: e.target.value as AdsContentStatus })}>
                  {ADS_CONTENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Content phụ trách">
                <StaffSelect value={f.contentOwnerId} valueName={f.contentOwnerName} staff={contentStaff} disabled={!canEditProgress}
                  onChange={(id, name) => set({ contentOwnerId: id, contentOwnerName: name })} placeholder="— chưa giao —" />
              </Field>
              <Field label="Kịch bản / link edit video">
                <input className={INPUT} disabled={!canEditProgress} value={f.scriptLink ?? ''}
                  onChange={(e) => set({ scriptLink: e.target.value })} placeholder="Link hoặc tên kịch bản" />
              </Field>
              <Field label="Video final">
                <input className={INPUT} disabled={!canEditProgress} value={f.videoFinal ?? ''}
                  onChange={(e) => set({ videoFinal: e.target.value })} placeholder="Tên file video editor trả" />
              </Field>
              <Field label="Comment của Content" className="sm:col-span-2">
                <input className={INPUT} disabled={!canEditProgress} value={f.commentContent ?? ''}
                  onChange={(e) => set({ commentContent: e.target.value })} placeholder="Ghi chú gửi lại team Ads…" />
              </Field>
            </div>
          </div>

          {/* 3. Ads chạy — chỉ có nghĩa với order của team Ads */}
          {showRunResult && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-3">Kết quả chạy · bên đặt (Ads)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tình trạng chạy">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 h-[38px]">
                  <input type="checkbox" className="accent-[#D32027] w-4 h-4" disabled={!canEditBrief}
                    checked={f.isRunning} onChange={(e) => set({ isRunning: e.target.checked })} />
                  Đã lên chạy
                </label>
              </Field>
              <Field label="Ngày lên">
                <DateField value={f.airDate} onChange={(v) => set({ airDate: v })} disabled={!canEditBrief} />
              </Field>
              <Field label="Người chạy (team Ads)">
                <input className={INPUT} disabled={!canEditBrief} value={f.runOwnerName}
                  onChange={(e) => set({ runOwnerName: e.target.value })} placeholder="Đức / Tuân / Hà…" />
              </Field>
              <Field label="Số tiền tiêu (đ)">
                <input type="text" inputMode="numeric" className={`${INPUT} text-right tabular-nums`} disabled={!canEditBrief}
                  value={f.spend ? f.spend.toLocaleString('vi-VN') : ''} onChange={(e) => set({ spend: num(e.target.value) })} placeholder="0" />
              </Field>
              <Field label="Số lượng số (data)">
                <input type="text" inputMode="numeric" className={`${INPUT} text-right tabular-nums`} disabled={!canEditBrief}
                  value={f.dataCount ? f.dataCount.toLocaleString('vi-VN') : ''} onChange={(e) => set({ dataCount: num(e.target.value) })} placeholder="0" />
              </Field>
              <Field label="Giải trình" className="sm:col-span-2">
                <textarea className={`${INPUT} min-h-[60px]`} disabled={!canEditBrief} value={f.explanation ?? ''}
                  onChange={(e) => set({ explanation: e.target.value })} placeholder="Nhận xét hiệu quả, lý do tắt…" />
              </Field>
            </div>
          </div>
          )}

          {!canEditBrief && (
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              Bạn không phải người đặt order này nên chỉ cập nhật được phần tiến độ của team Content.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</button>
          <button type="submit" className="px-6 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-lg transition-colors">
            {isNew ? 'Tạo order' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
}
