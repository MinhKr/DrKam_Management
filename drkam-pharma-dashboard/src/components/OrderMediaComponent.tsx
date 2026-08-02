'use client';
/**
 * ORDER — Team Content ĐẶT team Media (bảng content_media_orders).
 * Nguồn gốc: sheet "Tháng MM.YYYY - Media" (LOẠI · TITLE · LINK ORDER · NOTE ·
 * ƯU TIÊN · ORDER · PICK · DEADLINE · TRẠNG THÁI · LINK VIDEO).
 *
 * QUYỀN (chốt với user — đúng vai):
 *   • Bên ĐẶT (người tạo, hoặc Admin) sửa phần yêu cầu: loại, title, link order,
 *     note, ưu tiên, deadline, người làm.
 *   • Bên NHẬN (team Media, hoặc Admin) cập nhật tiến độ: trạng thái + link video trả.
 *   • Xóa: chỉ người tạo hoặc Admin.
 */
import React, { useMemo, useState } from 'react';
import {
  ContentMediaOrder, Employee, UserSession,
  ORDER_PRIORITIES, CONTENT_MEDIA_STATUSES, ContentMediaStatus, OrderPriority,
} from '../types';
import {
  orderDeadline, sortByUrgency, countAlerts, orderInPeriod, isOrderClosed,
  CONTENT_MEDIA_CATEGORIES, todayStart,
} from '../lib/orders';
import { MonthPicker } from './dashboardKit';
import {
  AlertStrip, DeadlineBadge, PriorityBadge, StatusBadge, LinkCell,
  Field, StaffSelect, DateField, INPUT, isContentStaff, isMediaStaff,
} from './orderKit';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  orders: ContentMediaOrder[];
  employees: Employee[];
  session: UserSession;
  currentUserId: string | null;
  onAdd: (o: ContentMediaOrder) => void;
  onUpdate: (id: string, patch: Partial<ContentMediaOrder>) => void;
  onDelete: (id: string) => void;
}

const nowMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const todayUi = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

export default function OrderMediaComponent({ orders, employees, session, currentUserId, onAdd, onUpdate, onDelete }: Props) {
  const [period, setPeriod] = useState(nowMonthKey);
  const [alertFilter, setAlertFilter] = useState<'overdue' | 'urgent' | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ContentMediaStatus>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all');
  const [showClosed, setShowClosed] = useState(true);
  const [editing, setEditing] = useState<ContentMediaOrder | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const isAdmin = session.role === 'Admin';
  const isMediaUser = session.department === 'Media';
  const contentStaff = useMemo(() => employees.filter(isContentStaff), [employees]);
  const mediaStaff = useMemo(() => employees.filter(isMediaStaff), [employees]);
  const now = todayStart();

  // Bên ĐẶT: người tạo dòng (hoặc Admin) mới sửa được phần yêu cầu.
  const canEditBrief = (o: ContentMediaOrder) => isAdmin || (!!currentUserId && o.requesterId === currentUserId);
  // Bên NHẬN: team Media cập nhật tiến độ; người đặt và Admin cũng sửa được.
  const canEditProgress = (o: ContentMediaOrder) => isAdmin || isMediaUser || canEditBrief(o);
  const canDelete = (o: ContentMediaOrder) => isAdmin || (!!currentUserId && o.requesterId === currentUserId);

  const monthOrders = useMemo(() => orders.filter((o) => orderInPeriod(o.orderDate, period)), [orders, period]);
  const counts = useMemo(() => countAlerts(monthOrders, now), [monthOrders, now]);

  const rows = useMemo(() => {
    let list = monthOrders;
    if (alertFilter) list = list.filter((o) => orderDeadline(o.deadline, o.status, now).alert === alertFilter);
    if (statusFilter !== 'all') list = list.filter((o) => o.status === statusFilter);
    if (assigneeFilter !== 'all') list = list.filter((o) => o.assigneeId === assigneeFilter);
    if (!showClosed) list = list.filter((o) => !isOrderClosed(o.status));
    return sortByUrgency(list, now);
  }, [monthOrders, alertFilter, statusFilter, assigneeFilter, showClosed, now]);

  const blank = (): ContentMediaOrder => ({
    id: '', orderDate: todayUi(), category: '', title: '', orderLink: '', note: '',
    priority: 'TRUNG BÌNH',
    requesterId: currentUserId, requesterName: session.name,
    assigneeId: null, assigneeName: '',
    deadline: '', status: 'Chờ nhận', resultLink: '',
  });

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-5 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">assignment</span>
            <span>Order — Team Content đặt team Media</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Đặt video/ảnh cho team Media · theo dõi hạn, tiến độ và link trả về.</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker value={period} onChange={setPeriod} allowFuture />
          <button onClick={() => setEditing(blank())}
            className="px-4 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">add</span>Thêm order
          </button>
        </div>
      </div>

      <AlertStrip counts={counts} active={alertFilter} onPick={setAlertFilter} />

      {/* Bộ lọc */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Trạng thái</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | ContentMediaStatus)}
            className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white">
            <option value="all">Tất cả</option>
            {CONTENT_MEDIA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Người làm</span>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white">
            <option value="all">Tất cả</option>
            {mediaStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="accent-[#D32027]" />
          Hiện cả order đã xong/hủy
        </label>
        <span className="ml-auto text-[11px] text-slate-400">{rows.length} order</span>
      </div>

      {/* Bảng order */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0 min-w-[1100px]">
            <thead>
              <tr>
                <th className={TH_NAME}>Hạn</th>
                <th className={TH}>Ngày order</th>
                <th className={`${TH} text-left`}>Loại</th>
                <th className={`${TH} text-left`}>Title</th>
                <th className={TH}>Ưu tiên</th>
                <th className={`${TH} text-left`}>Người đặt</th>
                <th className={`${TH} text-left`}>Người làm</th>
                <th className={`${TH} text-left`}>Trạng thái</th>
                <th className={`${TH} text-left`}>Link order</th>
                <th className={`${TH} text-left`}>Link trả</th>
                <th className={`${TH} text-center`}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const info = orderDeadline(o.deadline, o.status, now);
                return (
                  <tr key={o.id} className={`group transition-colors ${info.alert === 'overdue' ? 'bg-rose-50/40' : ''} hover:bg-slate-50`}>
                    <td className={NAME_CELL}>
                      <DeadlineBadge info={info} deadline={o.deadline} />
                      {o.deadline && <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">{o.deadline}</div>}
                    </td>
                    <td className={`${CELL} text-center tabular-nums text-slate-500`}>{o.orderDate}</td>
                    <td className={CELL}><span className="text-slate-600">{o.category || <span className="text-slate-300">—</span>}</span></td>
                    <td className={`${CELL} max-w-[260px]`}>
                      <div className="font-semibold text-slate-800 truncate" title={o.title}>{o.title || <span className="text-slate-300 font-normal">(chưa đặt tên)</span>}</div>
                      {o.note && <div className="text-[10px] text-slate-400 truncate" title={o.note}>{o.note}</div>}
                    </td>
                    <td className={`${CELL} text-center`}><PriorityBadge priority={o.priority} /></td>
                    <td className={`${CELL} text-slate-600`}>{o.requesterName || <span className="text-slate-300">—</span>}</td>
                    <td className={`${CELL} text-slate-600`}>{o.assigneeName || <span className="text-amber-500">chưa giao</span>}</td>
                    <td className={CELL}>
                      {canEditProgress(o) ? (
                        <select
                          value={o.status}
                          onChange={(e) => onUpdate(o.id, { status: e.target.value as ContentMediaStatus })}
                          className="text-[11px] font-bold border border-slate-200 rounded-lg px-1.5 py-1 outline-none bg-white cursor-pointer">
                          {CONTENT_MEDIA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : <StatusBadge status={o.status} />}
                    </td>
                    <td className={CELL}><LinkCell value={o.orderLink} /></td>
                    <td className={CELL}><LinkCell value={o.resultLink} /></td>
                    <td className={`${CELL} text-center whitespace-nowrap`}>
                      <button onClick={() => setEditing(o)} title="Sửa"
                        className="text-slate-400 hover:text-[#D32027] p-1 rounded-lg hover:bg-slate-100">
                        <span className="material-symbols-outlined text-[17px]">edit</span>
                      </button>
                      {canDelete(o) && (
                        <button title="Xóa"
                          onClick={() => setConfirm({
                            message: `Xóa order "${o.title || o.category}"?`,
                            onConfirm: () => { onDelete(o.id); setConfirm(null); },
                          })}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50">
                          <span className="material-symbols-outlined text-[17px]">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                  Chưa có order nào khớp bộ lọc trong tháng {period.slice(5)}/{period.slice(0, 4)}.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <OrderModal
          order={editing}
          contentStaff={contentStaff}
          mediaStaff={mediaStaff}
          canEditBrief={editing.id === '' || canEditBrief(editing)}
          canEditProgress={editing.id === '' || canEditProgress(editing)}
          onClose={() => setEditing(null)}
          onSubmit={(o) => {
            if (o.id) onUpdate(o.id, o);
            else onAdd({ ...o, id: 'cmo_' + Date.now() });
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

const CELL = 'px-3 py-2.5 border-b border-slate-100 align-top';
const NAME_BASE = 'sticky left-0 z-10 px-3 py-2.5 border-r border-b border-slate-100 align-top';
const NAME_CELL = `${NAME_BASE} bg-white group-hover:bg-slate-50`;
const TH_BASE = 'text-[10px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200';
const TH = `px-3 py-2.5 text-center whitespace-nowrap bg-slate-50 ${TH_BASE}`;
const TH_NAME = `${NAME_BASE} bg-slate-50 text-left ${TH_BASE}`;

/* ── Popup thêm/sửa order ──
   Ô của bên ĐẶT khóa lại với người không phải người đặt/Admin;
   ô tiến độ (trạng thái, người làm, link trả) mở cho team Media. */
function OrderModal({ order, contentStaff, mediaStaff, canEditBrief, canEditProgress, onClose, onSubmit }: {
  order: ContentMediaOrder;
  contentStaff: Employee[];
  mediaStaff: Employee[];
  canEditBrief: boolean;
  canEditProgress: boolean;
  onClose: () => void;
  onSubmit: (o: ContentMediaOrder) => void;
}) {
  const [f, setF] = useState<ContentMediaOrder>(order);
  const set = (patch: Partial<ContentMediaOrder>) => setF((p) => ({ ...p, ...patch }));
  const isNew = !order.id;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}
        className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 my-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">{isNew ? 'Thêm order cho team Media' : 'Sửa order'}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Đặt hạn để hệ thống cảnh báo trước 1 ngày và khi quá hạn.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Phần yêu cầu — bên đặt */}
          <div>
            <p className="text-[11px] font-bold text-[#D32027] uppercase tracking-widest mb-3">Yêu cầu · bên đặt (Content)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ngày order">
                <DateField value={f.orderDate} onChange={(v) => set({ orderDate: v })} disabled={!canEditBrief} />
              </Field>
              <Field label="Deadline" hint="Trống = chưa đặt hạn, sẽ không có cảnh báo.">
                <DateField value={f.deadline} onChange={(v) => set({ deadline: v })} disabled={!canEditBrief} />
              </Field>
              <Field label="Loại" hint="Gõ tự do hoặc chọn gợi ý.">
                <input list="cmo-categories" className={INPUT} disabled={!canEditBrief}
                  value={f.category} onChange={(e) => set({ category: e.target.value })} placeholder="Bán hàng, Bs Nguyên daily…" />
                <datalist id="cmo-categories">
                  {CONTENT_MEDIA_CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field label="Ưu tiên">
                <select className={INPUT} disabled={!canEditBrief} value={f.priority}
                  onChange={(e) => set({ priority: e.target.value as OrderPriority })}>
                  {ORDER_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Title" className="sm:col-span-2">
                <input className={INPUT} disabled={!canEditBrief} value={f.title}
                  onChange={(e) => set({ title: e.target.value })} placeholder="Tên video / đầu việc" required />
              </Field>
              <Field label="Link order (kịch bản)" className="sm:col-span-2">
                <input className={INPUT} disabled={!canEditBrief} value={f.orderLink ?? ''}
                  onChange={(e) => set({ orderLink: e.target.value })} placeholder="https://…" />
              </Field>
              <Field label="Note" className="sm:col-span-2">
                <textarea className={`${INPUT} min-h-[70px]`} disabled={!canEditBrief} value={f.note ?? ''}
                  onChange={(e) => set({ note: e.target.value })} placeholder="Ghi chú thêm cho team Media…" />
              </Field>
              <Field label="Người đặt">
                <StaffSelect value={f.requesterId} staff={contentStaff} disabled={!canEditBrief}
                  onChange={(id, name) => set({ requesterId: id, requesterName: name })} />
              </Field>
              <Field label="Người làm (Media)">
                <StaffSelect value={f.assigneeId} staff={mediaStaff} disabled={!canEditProgress}
                  onChange={(id, name) => set({ assigneeId: id, assigneeName: name })} placeholder="— chưa giao —" />
              </Field>
            </div>
          </div>

          {/* Phần tiến độ — bên nhận */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Tiến độ · bên nhận (Media)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Trạng thái">
                <select className={INPUT} disabled={!canEditProgress} value={f.status}
                  onChange={(e) => set({ status: e.target.value as ContentMediaStatus })}>
                  {CONTENT_MEDIA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Link video trả về">
                <input className={INPUT} disabled={!canEditProgress} value={f.resultLink ?? ''}
                  onChange={(e) => set({ resultLink: e.target.value })} placeholder="Tên file hoặc link" />
              </Field>
            </div>
          </div>

          {!canEditBrief && (
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              Bạn không phải người đặt order này nên chỉ cập nhật được phần tiến độ.
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
