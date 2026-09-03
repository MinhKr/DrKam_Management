'use client';
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  QUẢN LÝ NHÂN SỰ — CHỈ ADMIN                                             ║
// ║  Nơi duy nhất thêm / sửa / cho nghỉ / xoá tài khoản của cả 3 team        ║
// ║  marketing (Content · Media · Ads Facebook) + tài khoản hệ thống.        ║
// ║                                                                          ║
// ║  2 KIỂU "CHO NGHỈ" (chốt với user 03/09/2026):                          ║
// ║   • NGHỈ VIỆC  — status='Đã khóa': chặn đăng nhập ngay (src/data/auth.ts)║
// ║     nhưng GIỮ NGUYÊN hồ sơ; mở lại được. Dùng cho đa số trường hợp.      ║
// ║   • XOÁ HẲN   — xoá dòng profiles, cần xác nhận 2 bước. BÁO CÁO CŨ VẪN   ║
// ║     CÒN nhờ migration 0022 (FK chuyển sang ON DELETE SET NULL) — tên     ║
// ║     người đã lưu sẵn trong từng dòng báo cáo nên số liệu không lệch.     ║
// ║     Tài khoản đăng nhập ở auth.users KHÔNG xoá được từ trình duyệt →     ║
// ║     màn hình có nhắc Admin xoá nốt trên Supabase nếu muốn dứt điểm.      ║
// ║                                                                          ║
// ║  THÊM NGƯỜI: profiles.id là FK tới auth.users nên phải tạo tài khoản     ║
// ║  Auth trước — repositories.createEmployeeAccount() làm việc đó bằng một  ║
// ║  client phụ (không lưu phiên) nên Admin không bị đăng xuất.              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import React, { useMemo, useState } from 'react';
import { AffiliateChannel, Employee, UserSession } from '../types';
import { managerOf } from '../lib/channels';
import { norm } from '../lib/contentKpi';
import { DEFAULT_PASSWORD, DEPARTMENTS, suggestEmail, TEAMS, teamOf, TeamKey } from '../lib/staff';

type Role = Employee['role'];
const ROLES: Role[] = ['Admin', 'Leader', 'Nhân viên'];

interface Props {
  employees: Employee[];
  channels: AffiliateChannel[];
  session: UserSession;
  onCreateEmployee: (emp: Omit<Employee, 'id' | 'channelCount'>, password: string) => void;
  onUpdateEmployee: (id: string, patch: Partial<Employee>) => void;
  onToggleEmployeeStatus: (id: string) => void;
  onDeleteEmployee: (id: string) => void;
}

type FormState = { name: string; email: string; role: Role; department: string };
const EMPTY_FORM: FormState = { name: '', email: '', role: 'Nhân viên', department: 'Content' };

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';

const roleStyle: Record<Role, string> = {
  'Admin': 'bg-rose-50 text-[#D32027] border-rose-200',
  'Leader': 'bg-amber-50 text-amber-700 border-amber-200',
  'Nhân viên': 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function EmployeeManagementComponent({
  employees, channels, session, onCreateEmployee, onUpdateEmployee, onToggleEmployeeStatus, onDeleteEmployee,
}: Props) {
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamKey>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [showLocked, setShowLocked] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);  // null + formOpen = thêm mới
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [emailTouched, setEmailTouched] = useState(false);

  const [deleting, setDeleting] = useState<Employee | null>(null); // bước 1: cảnh báo
  const [confirmText, setConfirmText] = useState('');              // bước 2: gõ tên để chắc chắn
  const [notice, setNotice] = useState('');
  const notify = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 5000); };

  const isAdmin = session.role === 'Admin';

  // Số kênh mỗi người đang phụ trách — cảnh báo trước khi cho nghỉ / xoá.
  const channelsOf = useMemo(() => {
    const m = new Map<string, string[]>();
    channels.forEach((c) => {
      const key = norm(managerOf(c));
      if (!key) return;
      m.set(key, [...(m.get(key) ?? []), c.name]);
    });
    return m;
  }, [channels]);
  const channelNamesOf = (e: Employee) => channelsOf.get(norm(e.name)) ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (!showLocked && e.status === 'Đã khóa') return false;
      if (teamFilter !== 'all' && teamOf(e) !== teamFilter) return false;
      if (roleFilter !== 'all' && e.role !== roleFilter) return false;
      if (q && !e.name.toLowerCase().includes(q) && !e.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [employees, search, teamFilter, roleFilter, showLocked]);

  const summary = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.status === 'Hoạt động').length,
    locked: employees.filter((e) => e.status === 'Đã khóa').length,
    marketing: employees.filter((e) => teamOf(e) !== 'other').length,
  }), [employees]);

  // ── Form ──
  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setEmailTouched(false); setFormOpen(true); };
  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({ name: e.name, email: e.email, role: e.role, department: e.department || 'Content' });
    setEmailTouched(true);
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  /** Gõ tên → tự gợi ý email theo quy ước, trừ khi Admin đã tự sửa email. */
  const changeName = (name: string) => {
    setForm((f) => ({ ...f, name, email: emailTouched ? f.email : suggestEmail(name) }));
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name) { notify('Vui lòng nhập họ tên.'); return; }

    if (editing) {
      onUpdateEmployee(editing.id, { name, role: form.role, department: form.department });
      notify(`Đã cập nhật hồ sơ "${name}".`);
      closeForm();
      return;
    }

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { notify('Email không hợp lệ.'); return; }
    if (employees.some((e) => e.email.toLowerCase() === email)) { notify(`Email ${email} đã có người dùng.`); return; }

    onCreateEmployee(
      { name, email, role: form.role, department: form.department, status: 'Hoạt động', avatar: '' },
      DEFAULT_PASSWORD,
    );
    closeForm();
  };

  // ── Xoá hẳn: 2 bước ──
  const askDelete = (e: Employee) => { setDeleting(e); setConfirmText(''); };
  const confirmDelete = () => {
    if (!deleting) return;
    onDeleteEmployee(deleting.id);
    notify(`Đã xoá hồ sơ "${deleting.name}". Báo cáo cũ của họ vẫn được giữ nguyên.`);
    setDeleting(null);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-[720px] mx-auto bg-white rounded-2xl border border-slate-200/70 soft-shadow p-8 text-center">
        <span className="material-symbols-outlined text-[40px] text-slate-300">lock</span>
        <h2 className="text-lg font-bold text-slate-800 mt-2">Chỉ Admin xem được màn này</h2>
        <p className="text-xs text-slate-400 mt-1">Quản lý nhân sự gồm quyền truy cập hệ thống nên chỉ Admin thao tác.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 text-slate-800">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 font-display">Quản lý nhân sự</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tài khoản của cả 3 team marketing — Content · Media · Ads Facebook.
          </p>
          <p className="text-xs text-slate-400 mt-1 flex items-start gap-1.5">
            <span className="material-symbols-outlined text-[14px] mt-px">info</span>
            <span>Cho nghỉ hoặc xoá nhân sự <b>không làm mất báo cáo cũ</b> — số liệu lịch sử giữ nguyên.</span>
          </p>
        </div>
        <button onClick={openAdd}
          className="bg-[#D32027] hover:bg-[#B70F1B] text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-soft cursor-pointer self-start">
          <span className="material-symbols-outlined text-lg">person_add</span>
          <span>Thêm nhân sự</span>
        </button>
      </div>

      {notice && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-semibold rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>{notice}
        </div>
      )}

      {/* Tổng hợp nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng tài khoản', value: summary.total, icon: 'badge', accent: 'text-violet-600 bg-violet-50' },
          { label: 'Đang làm việc', value: summary.active, icon: 'how_to_reg', accent: 'text-green-600 bg-green-50' },
          { label: 'Đã nghỉ / khoá', value: summary.locked, icon: 'person_off', accent: 'text-amber-600 bg-amber-50' },
          { label: 'Thuộc 3 team MKT', value: summary.marketing, icon: 'groups', accent: 'text-[#D32027] bg-rose-50' },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200/60 rounded-2xl p-4 soft-shadow flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.accent}`}>
              <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{k.label}</p>
              <p className="text-2xl font-extrabold text-slate-900 leading-tight">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bộ lọc */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-wrap items-end gap-4 soft-shadow">
        <div className="flex-1 min-w-[240px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input type="text" placeholder="Tìm theo họ tên hoặc email..."
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] focus:bg-white transition-all"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team</label>
          <select className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
            value={teamFilter} onChange={(e) => setTeamFilter(e.target.value as typeof teamFilter)}>
            <option value="all">Tất cả</option>
            {TEAMS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vai trò</label>
          <select className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
            value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}>
            <option value="all">Tất cả</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer pb-1.5">
          <input type="checkbox" className="w-4 h-4 accent-[#D32027]"
            checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} />
          Hiện cả người đã nghỉ
        </label>
      </div>

      {/* Danh sách theo team */}
      {TEAMS.map((team) => {
        const list = filtered.filter((e) => teamOf(e) === team.key);
        if (list.length === 0) return null;
        return (
          <div key={team.key} className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${team.tone}`}>
                <span className="material-symbols-outlined text-[16px]">{team.icon}</span>
              </span>
              <h3 className="text-sm font-bold text-slate-800">{team.label}</h3>
              <span className="text-[11px] font-bold text-slate-400">{list.length} người</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-5">Nhân sự</th>
                    <th className="py-3 px-4">Vai trò</th>
                    <th className="py-3 px-4">Phòng ban</th>
                    <th className="py-3 px-4">Kênh phụ trách</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {list.map((e) => {
                    const chs = channelNamesOf(e);
                    const isMe = e.email.toLowerCase() === session.email.toLowerCase();
                    return (
                      <tr key={e.id} className={`hover:bg-slate-50/40 transition-colors ${e.status === 'Đã khóa' ? 'opacity-60' : ''}`}>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-9 h-9 rounded-full bg-slate-800 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                              {initialsOf(e.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm truncate">
                                {e.name}
                                {isMe && <span className="ml-1.5 text-[10px] font-bold text-slate-400">(bạn)</span>}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">{e.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border ${roleStyle[e.role]}`}>
                            {e.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">{e.department || <span className="text-slate-300 italic">chưa đặt</span>}</td>
                        <td className="py-3 px-4">
                          {chs.length > 0 ? (
                            <span className="text-xs font-bold text-slate-700" title={chs.join(' · ')}>{chs.length} kênh</span>
                          ) : (
                            <span className="text-[11px] text-slate-300 italic">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            e.status === 'Hoạt động' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${e.status === 'Hoạt động' ? 'bg-green-500' : 'bg-slate-400'}`} />
                            {e.status === 'Hoạt động' ? 'Đang làm' : 'Đã nghỉ'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(e)} title="Sửa hồ sơ"
                              className="p-1.5 text-slate-400 hover:text-[#D32027] hover:bg-rose-50 rounded-lg transition-colors">
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button onClick={() => onToggleEmployeeStatus(e.id)}
                              disabled={isMe}
                              title={isMe ? 'Không thể tự khoá tài khoản của mình' : (e.status === 'Hoạt động' ? 'Cho nghỉ việc (chặn đăng nhập)' : 'Cho làm lại')}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                              <span className="material-symbols-outlined text-lg">
                                {e.status === 'Hoạt động' ? 'person_off' : 'how_to_reg'}
                              </span>
                            </button>
                            <button onClick={() => askDelete(e)}
                              disabled={isMe}
                              title={isMe ? 'Không thể tự xoá tài khoản của mình' : 'Xoá hẳn hồ sơ (báo cáo cũ vẫn giữ)'}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow py-12 text-center text-sm text-slate-400">
          Không có nhân sự nào khớp bộ lọc.
        </div>
      )}

      {/* ── FORM THÊM / SỬA ── */}
      {formOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 relative animate-fade-in my-8">
            <button onClick={closeForm} type="button"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none">
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1 font-display">
              {editing ? 'Sửa hồ sơ nhân sự' : 'Thêm nhân sự mới'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {editing
                ? `Đang sửa "${editing.name}". Email là tài khoản đăng nhập nên không đổi ở đây.`
                : 'Hệ thống sẽ tạo tài khoản đăng nhập kèm theo — không cần vào Supabase.'}
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Họ và tên</label>
                <input type="text" required autoFocus placeholder="Ví dụ: Nguyễn Công Hải"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  value={form.name} onChange={(e) => changeName(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email đăng nhập</label>
                <input type="email" disabled={!!editing} placeholder="hainc@drkam.vn"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400"
                  value={form.email}
                  onChange={(e) => { setEmailTouched(true); setForm((f) => ({ ...f, email: e.target.value })); }} />
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  {editing
                    ? 'Muốn đổi email đăng nhập phải sửa trên Supabase > Authentication.'
                    : 'Tự gợi ý theo quy ước: tên gọi + chữ đầu họ và đệm. Sửa lại được nếu cần.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Phòng ban / team</label>
                  <select className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                    value={DEPARTMENTS.includes(form.department) ? form.department : '__other'}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value === '__other' ? '' : e.target.value }))}>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    <option value="__other">Khác (nhập tay)</option>
                  </select>
                  {!DEPARTMENTS.includes(form.department) && (
                    <input type="text" placeholder="Tên phòng ban..."
                      className="w-full mt-2 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                      value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Vai trò</label>
                  <select className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                    value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1 italic">Admin thấy toàn bộ hệ thống.</p>
                </div>
              </div>

              {!editing && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-[11px] text-slate-500 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[15px] mt-px">key</span>
                  <span>
                    Mật khẩu tạm: <b className="text-slate-700">{DEFAULT_PASSWORD}</b> — nhắc nhân sự đổi sau lần đăng nhập đầu.
                  </span>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={closeForm}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Hủy
                </button>
                <button type="submit"
                  className="px-6 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-lg transition-colors">
                  {editing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── XOÁ HẲN: cảnh báo + gõ tên xác nhận ── */}
      {deleting && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined">warning</span>
              </span>
              <h3 className="text-lg font-bold text-slate-900 font-display">Xoá hẳn hồ sơ nhân sự?</h3>
            </div>

            <p className="text-sm text-slate-600">
              Xoá <b>{deleting.name}</b> ({deleting.email}) khỏi danh sách nhân sự.
            </p>

            <ul className="mt-3 space-y-1.5 text-[12px] text-slate-500">
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-green-600 mt-px">check_circle</span>
                <span><b className="text-slate-700">Báo cáo cũ được giữ nguyên</b> — doanh thu, checklist, báo cáo Media/Ads họ đã nhập không mất.</span>
              </li>
              {channelNamesOf(deleting).length > 0 && (
                <li className="flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-amber-600 mt-px">error</span>
                  <span>
                    Đang phụ trách <b className="text-slate-700">{channelNamesOf(deleting).length} kênh</b> ({channelNamesOf(deleting).join(', ')}).
                    <b className="text-slate-700"> Kênh không bị xoá</b> — chỉ chuyển sang “Chưa gán”, doanh thu các kênh này
                    sẽ nằm ở dòng “Chưa gán người phụ trách” cho tới khi Admin giao lại ở tab <b>Quản lý kênh</b>.
                  </span>
                </li>
              )}
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-green-600 mt-px">lock</span>
                <span>
                  <b className="text-slate-700">Không đăng nhập vào app được nữa</b> — mất hồ sơ là bị chặn ngay ở màn đăng nhập
                  và cũng không đọc được số liệu.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-slate-400 mt-px">delete_forever</span>
                <span>
                  Tài khoản đăng nhập <b>{deleting.email}</b> cũng được xoá luôn khỏi Supabase.
                  Nếu server chưa cấu hình khoá quản trị, app sẽ báo lại để anh/chị xoá tay ở
                  Authentication &gt; Users.
                </span>
              </li>
            </ul>

            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-4 mb-1">
              Gõ đúng tên để xác nhận
            </label>
            <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
              placeholder={deleting.name}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" />

            <div className="pt-4 flex justify-end gap-2">
              <button onClick={() => setDeleting(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Hủy
              </button>
              <button onClick={confirmDelete}
                disabled={confirmText.trim() !== deleting.name.trim()}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Xoá hẳn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
