import React, { useState, useEffect } from 'react';
import { ChecklistItem, Employee, UserSession } from '../types';
// Checklist là đầu việc sản xuất nội dung nên chỉ hiện nhân sự team Content
// (bỏ Media, Ads Facebook và khối HR / Nhân sự - Hành chính) — quy tắc dùng
// chung ở src/lib/staff.ts.
import { isContentDept } from '../lib/staff';
import ConfirmDialog from './ConfirmDialog';

interface ContentChecklistComponentProps {
  checklists: ChecklistItem[];
  employees: Employee[];
  session: UserSession;
  currentUserId: string | null;
  onAddItem: (item: ChecklistItem) => void;
  onUpdateItem: (id: string, patch: { label?: string; quantity?: number; note?: string }) => void;
  onDeleteItem: (id: string) => void;
  readOnly?: boolean; // true = chỉ hiển thị (dùng ở Tổng quan), không cho thêm/sửa
}

// ── Mẫu đầu việc cố định theo từng người (khớp theo TÊN nhân sự) ─────────────
// Mỗi ngày các dòng này luôn hiện sẵn — người dùng chỉ việc điền SỐ LƯỢNG.
// Sửa danh sách ở đây nếu team thay đổi đầu việc.
const TASK_TEMPLATES: { name: string; tasks: string[] }[] = [
  {
    name: 'Đặng Kim Khánh',
    tasks: [
      'SEO WEB',
      '[FB] SỐNG KHỎE CÙNG CHUYÊN GIA',
      '[FB] BÁC SĨ RĂNG MIỆNG HỌNG',
      '[TIKTOK AI] haidang0136',
      '[TIKTOK KOC] bao_chau_day',
      '[FANPAGE FB AI] duocsikhanh',
      'KỊCH BẢN / QUAY',
      'FEEDBACK VIDEO',
    ],
  },
  {
    name: 'Nguyễn Công Hải',
    tasks: [
      '[TIKTOK] DRKAM PHARMA OFFICIAL',
      '[TIKTOK KOC] Nhacuacamcam',
      '[TIKTOK KOC] GiadinhMinhHee',
      '[TIKTOK AI] ngoc.huong259',
      'YOUTUBE',
      '[FANPAGE FB AI] conghaing',
      'KỊCH BẢN / QUAY/EDIT',
      'FEEDBACK VIDEO',
    ],
  },
  {
    name: 'Lê Đắc Nhật Minh',
    tasks: [
      '[TIKTOK AI] minhquan8046',
      '[TIKTOK AI] anhquan9684',
      '[FANPAGE FB AI] leminh139148',
      'Khác', // điều text / paragraph
    ],
  },
  {
    name: 'Hoàng Yến Nhi',
    tasks: [
      '[TIKTOK] DRKAMVN',
      '[TIKTOK KOC] Happy Daily',
      '[TIKTOK AI] koi_928tramtram',
      '[TIKTOK KOC] quinchana82',
      '[FANPAGE FB AI] ynni1809',
      'KỊCH BẢN / QUAY',
    ],
  },
];
const templateFor = (name: string) =>
  TASK_TEMPLATES.find((t) => t.name.trim() === name.trim())?.tasks ?? [];

// ── Ngày ────────────────────────────────────────────────────────────────────
const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const toDdmmyyyy = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

// ── Chip nhãn nền tảng (parse "[TIKTOK AI] tên") ─────────────────────────────
function parseLabel(label: string): { tag: string | null; rest: string } {
  const m = label.match(/^\[([^\]]+)\]\s*(.*)$/);
  return m ? { tag: m[1].trim(), rest: m[2].trim() } : { tag: null, rest: label };
}
const TAG_STYLE: Record<string, string> = {
  'TIKTOK': 'bg-slate-800 text-white',
  'TIKTOK AI': 'bg-violet-100 text-violet-700',
  'TIKTOK KOC': 'bg-rose-100 text-rose-700',
  'FB': 'bg-blue-100 text-blue-700',
  'FANPAGE FB AI': 'bg-indigo-100 text-indigo-700',
  'YOUTUBE': 'bg-red-100 text-red-700',
};
const tagStyle = (tag: string) => TAG_STYLE[tag] ?? 'bg-slate-100 text-slate-600';

export default function ContentChecklistComponent({
  checklists, employees, session, currentUserId, onAddItem, onUpdateItem, onDeleteItem, readOnly = false,
}: ContentChecklistComponentProps) {
  const [dateIso, setDateIso] = useState(isoToday);
  const date = toDdmmyyyy(dateIso);
  const [dialog, setDialog] = useState<{ id: string; label: string } | null>(null);

  // Ô "Thêm đầu việc" chung ở đầu (chọn người + nhãn + số lượng).
  const [addEmpId, setAddEmpId] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [addQty, setAddQty] = useState('');

  const isMine = (emp: Employee) =>
    currentUserId ? emp.id === currentUserId : emp.name === session.name;

  // Nhân sự content đang hoạt động (bỏ Admin, team Media, team Ads Facebook và khối HR).
  // Xếp người của mình lên đầu.
  const staff = [...employees]
    .filter((e) => e.status === 'Hoạt động' && e.role !== 'Admin' && isContentDept(e.department))
    .sort((a, b) => {
      const mine = Number(isMine(b)) - Number(isMine(a));
      return mine !== 0 ? mine : a.name.localeCompare(b.name, 'vi');
    });

  const isToday = dateIso === isoToday();
  // Người đang chọn để thêm — mặc định là chính mình, nếu không có thì người đầu danh sách.
  const selectedEmpId = addEmpId || staff.find(isMine)?.id || staff[0]?.id || '';

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = staff.find((s) => s.id === selectedEmpId);
    const label = addLabel.trim();
    if (!emp || !label) return;
    onAddItem({
      id: 'cl_' + Date.now(), date, employeeId: emp.id, employeeName: emp.name,
      label, quantity: parseInt(addQty.replace(/\D/g, ''), 10) || 0,
    });
    setAddLabel('');
    setAddQty('');
  };

  return (
    <div className={`${readOnly ? 'w-full' : 'max-w-[980px] mx-auto'} space-y-4 text-slate-800`}>
      {/* Header + chọn ngày */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">checklist</span>
            <span>Checklist công việc</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {readOnly ? 'Chỉ xem — vào tab “Checklist” ở menu để điền số lượng.' : 'Đầu việc đã điền sẵn theo từng người — mỗi ngày chỉ cần nhập số lượng.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 soft-shadow">
          <span className="material-symbols-outlined text-[18px] text-[#D32027]">event</span>
          <input
            type="date"
            value={dateIso}
            max={isoToday()}
            onChange={(e) => setDateIso(e.target.value)}
            className="text-sm font-semibold border-none outline-none bg-transparent text-slate-700"
          />
          {!isToday && (
            <button type="button" onClick={() => setDateIso(isoToday())}
              className="text-[11px] font-bold text-[#D32027] hover:underline">Hôm nay</button>
          )}
        </div>
      </div>

      {/* Ô thêm đầu việc CHUNG — chọn người rồi thêm (chỉ ở chế độ điền) */}
      {!readOnly && staff.length > 0 && (
        <form onSubmit={handleAddNew} className="bg-white border border-slate-200 rounded-2xl soft-shadow px-3 py-2.5 flex flex-wrap items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-[#D32027]">add_circle</span>
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">Thêm đầu việc cho</span>
          <select
            value={selectedEmpId}
            onChange={(e) => setAddEmpId(e.target.value)}
            className="px-2.5 py-1.5 text-sm font-semibold border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-white text-slate-700"
          >
            {staff.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}{isMine(emp) ? ' (bạn)' : ''}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Tên đầu việc..."
            className="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-white"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
          />
          <input
            type="text" inputMode="numeric" placeholder="SL"
            className="w-16 px-2.5 py-1.5 text-sm text-right font-mono border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-white"
            value={addQty}
            onChange={(e) => setAddQty(e.target.value.replace(/\D/g, ''))}
          />
          <button type="submit" disabled={!addLabel.trim()}
            className="px-4 py-1.5 bg-[#D32027] hover:bg-[#B70F1B] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Thêm
          </button>
        </form>
      )}

      {staff.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow py-12 text-center text-slate-400 font-medium px-6">
          Chưa có nhân sự content nào đang hoạt động.
        </div>
      ) : (
        <div className={readOnly ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start' : 'space-y-4'}>
          {staff.map((emp) => (
            <EmployeeChecklistCard
              key={emp.id}
              employee={emp}
              date={date}
              mine={isMine(emp)}
              readOnly={readOnly}
              rows={checklists.filter((c) => c.employeeId === emp.id && c.date === date)}
              templateTasks={templateFor(emp.name)}
              onAddItem={onAddItem}
              onUpdateItem={onUpdateItem}
              onRequestDelete={(id, label) => setDialog({ id, label })}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!dialog}
        title="Xóa đầu việc"
        message={`Xóa dòng "${dialog?.label}" khỏi checklist ngày ${date}?`}
        confirmText="Xóa"
        onConfirm={() => { if (dialog) onDeleteItem(dialog.id); setDialog(null); }}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Khu vực checklist của 1 nhân viên (mẫu cố định + dòng tự thêm)
   ════════════════════════════════════════════════════════════════ */
function EmployeeChecklistCard({
  employee, date, mine, readOnly, rows, templateTasks, onAddItem, onUpdateItem, onRequestDelete,
}: {
  employee: Employee;
  date: string;
  mine: boolean;
  readOnly: boolean;
  rows: ChecklistItem[];
  templateTasks: string[];
  onAddItem: (item: ChecklistItem) => void;
  onUpdateItem: (id: string, patch: { label?: string; quantity?: number; note?: string }) => void;
  onRequestDelete: (id: string, label: string) => void;
}) {
  // Dòng đã lưu, tra theo nhãn.
  const itemByLabel = new Map(rows.map((r) => [r.label, r]));
  // Dòng tự thêm (không nằm trong mẫu).
  const extras = rows.filter((r) => !templateTasks.includes(r.label));
  const totalQty = rows.reduce((s, r) => s + (r.quantity || 0), 0);

  // Điền số lượng cho 1 dòng mẫu: chưa có bản ghi → tạo mới (khi >0); có rồi → cập nhật.
  const commitQty = (label: string, qty: number, existing?: ChecklistItem) => {
    if (existing) {
      if (qty !== existing.quantity) onUpdateItem(existing.id, { quantity: qty });
    } else if (qty > 0) {
      onAddItem({ id: 'cl_' + Date.now(), date, employeeId: employee.id, employeeName: employee.name, label, quantity: qty });
    }
  };

  // Điền mô tả text cho dòng "Khác": chưa có → tạo mới (khi có chữ); có rồi → cập nhật.
  const commitNote = (label: string, note: string, existing?: ChecklistItem) => {
    if (existing) {
      if (note !== (existing.note ?? '')) onUpdateItem(existing.id, { note });
    } else if (note.trim()) {
      onAddItem({ id: 'cl_' + Date.now(), date, employeeId: employee.id, employeeName: employee.name, label, quantity: 0, note });
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/70 soft-shadow overflow-hidden">
      {/* Header nhân viên */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-1 h-7 rounded-full bg-[#D32027] flex-shrink-0" />
          <p className="font-bold text-slate-800 truncate">{employee.name}</p>
          {mine && (
            <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded whitespace-nowrap">Của bạn</span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tổng</span>
          <span className="text-base font-extrabold text-[#D32027] tabular-nums">{totalQty}</span>
        </div>
      </div>

      {/* Dòng mẫu + dòng tự thêm */}
      <div className="divide-y divide-slate-50">
        {templateTasks.map((label) => (
          <ChecklistRow
            key={label}
            label={label}
            existing={itemByLabel.get(label)}
            readOnly={readOnly}
            asNote={label === 'Khác'}
            onCommitQty={(qty) => commitQty(label, qty, itemByLabel.get(label))}
            onCommitNote={(note) => commitNote(label, note, itemByLabel.get(label))}
          />
        ))}
        {extras.map((item) => (
          <ChecklistRow
            key={item.id}
            label={item.label}
            existing={item}
            custom
            readOnly={readOnly}
            onCommitQty={(qty) => { if (qty !== item.quantity) onUpdateItem(item.id, { quantity: qty }); }}
            onCommitLabel={(lb) => { if (lb && lb !== item.label) onUpdateItem(item.id, { label: lb }); }}
            onDelete={() => onRequestDelete(item.id, item.label)}
          />
        ))}
        {templateTasks.length === 0 && extras.length === 0 && (
          <p className="py-6 text-center text-slate-400 text-xs">{readOnly ? 'Chưa có đầu việc.' : 'Chưa có đầu việc — thêm ở ô trên cùng.'}</p>
        )}
      </div>
    </section>
  );
}

/* Một dòng đầu việc — nhãn (chip nền tảng) + ô số lượng. Ai cũng sửa được. */
function ChecklistRow({
  label, existing, custom, readOnly, asNote, onCommitQty, onCommitNote, onCommitLabel, onDelete,
}: {
  label: string;
  existing?: ChecklistItem;
  custom?: boolean;
  readOnly?: boolean;
  asNote?: boolean; // dòng nhập MÔ TẢ bằng chữ thay vì số (vd: "Khác" — điều text/paragraph)
  onCommitQty: (qty: number) => void;
  onCommitNote?: (note: string) => void;
  onCommitLabel?: (label: string) => void;
  onDelete?: () => void;
}) {
  const { tag, rest } = parseLabel(label);
  const [qty, setQty] = useState(existing ? String(existing.quantity) : '');
  const [labelStr, setLabelStr] = useState(label);
  const [note, setNote] = useState(existing?.note ?? '');

  useEffect(() => { setQty(existing ? String(existing.quantity) : ''); }, [existing?.quantity, existing]);
  useEffect(() => { setLabelStr(label); }, [label]);
  useEffect(() => { setNote(existing?.note ?? ''); }, [existing?.note, existing]);

  const commitQty = () => onCommitQty(parseInt(qty.replace(/\D/g, ''), 10) || 0);

  const filled = (parseInt(qty.replace(/\D/g, ''), 10) || 0) > 0;

  // Nhãn (chip + tên) dùng chung cho cả 2 chế độ.
  const labelBlock = (
    <div className="flex-1 min-w-0 flex items-center gap-2">
      {tag && (
        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0 ${tagStyle(tag)}`}>{tag}</span>
      )}
      <span className={`text-sm truncate ${tag ? 'text-slate-700' : 'font-semibold text-slate-600'}`} title={rest || label}>
        {rest || label}
      </span>
    </div>
  );

  // Chế độ CHỈ XEM: nhãn + số lượng dạng text, không ô nhập / không xóa.
  if (readOnly) {
    // Dòng "Khác": nhãn ở trên, mô tả xuống dòng hiển thị đầy đủ (không cắt cụt).
    if (asNote) {
      return (
        <div className="px-3 py-1.5">
          <p className="text-sm font-semibold text-slate-600">{rest || label}</p>
          <p className={`text-[13px] leading-snug whitespace-pre-wrap break-words ${existing?.note ? 'text-slate-700' : 'text-slate-300'}`}>
            {existing?.note || '—'}
          </p>
        </div>
      );
    }
    return (
      <div className="px-3 py-1 flex items-center gap-2">
        {labelBlock}
        <span className={`w-9 text-right text-[13px] font-mono font-bold ${filled ? 'text-slate-900' : 'text-slate-300'}`}>
          {existing?.quantity ?? 0}
        </span>
      </div>
    );
  }

  // Dòng "Khác" — nhãn cố định + ô nhập MÔ TẢ bằng chữ (điều text/paragraph nhiều dòng).
  if (asNote) {
    return (
      <div className="group px-3 py-1.5 hover:bg-rose-50/30 transition-colors">
        <span className="text-sm font-semibold text-slate-600">{rest || label}</span>
        <textarea
          value={note}
          rows={2}
          placeholder="Mô tả công việc..."
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => onCommitNote?.(note.trim())}
          className="mt-1 w-full px-2 py-1 text-sm leading-snug border border-slate-200/70 hover:border-slate-200 focus:border-[#D32027] rounded-md outline-none bg-slate-50/40 focus:bg-white focus:ring-1 focus:ring-[#D32027] transition-colors resize-y"
        />
      </div>
    );
  }

  return (
    <div className="group px-3 py-1.5 flex items-center gap-2 hover:bg-rose-50/30 transition-colors">
      {/* Nhãn */}
      {custom && onCommitLabel ? (
        <input
          type="text"
          value={labelStr}
          onChange={(e) => setLabelStr(e.target.value)}
          onBlur={() => onCommitLabel(labelStr.trim())}
          className="flex-1 min-w-0 px-2 py-1 text-sm border border-transparent hover:border-slate-200 focus:border-[#D32027] rounded-md outline-none bg-transparent focus:bg-white transition-colors"
        />
      ) : (
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {tag && (
            <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0 ${tagStyle(tag)}`}>{tag}</span>
          )}
          <span className={`text-sm truncate ${tag ? 'text-slate-700' : 'font-semibold text-slate-600'}`} title={rest || label}>
            {rest || label}
          </span>
        </div>
      )}

      {/* Số lượng */}
      <input
        type="text"
        inputMode="numeric"
        value={qty}
        placeholder="0"
        onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
        onBlur={commitQty}
        className={`w-14 px-2 py-1 text-sm text-right font-mono rounded-md border outline-none transition-colors focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027] ${
          filled ? 'border-slate-200 bg-white text-slate-900 font-bold' : 'border-slate-200/70 bg-slate-50/40 text-slate-400'
        }`}
      />

      {/* Xóa (chỉ dòng tự thêm) */}
      {custom && onDelete ? (
        <button type="button" onClick={onDelete}
          className="text-slate-300 hover:text-rose-600 transition-colors flex-shrink-0"
          title="Xóa đầu việc">
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      ) : (
        <span className="w-4 flex-shrink-0" />
      )}
    </div>
  );
}
