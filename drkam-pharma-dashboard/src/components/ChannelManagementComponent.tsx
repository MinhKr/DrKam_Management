'use client';
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TEAM CONTENT — QUẢN LÝ KÊNH                                             ║
// ║  Nơi DUY NHẤT quản lý danh sách kênh nội dung: thêm · sửa · xóa.         ║
// ║  Các tab TikTok/Facebook vẫn thêm nhanh được kênh vào đúng mục đang xem. ║
// ║                                                                          ║
// ║  BẢNG VÀ FORM DÙNG ĐÚNG MỘT BỘ TRƯỜNG (cập nhật 19/08/2026):            ║
// ║    tên kênh · nhãn mô tả · nền tảng · loại kênh (+ cờ DT/Traffic/gắn     ║
// ║    shop) · NGƯỜI PHỤ TRÁCH · link kênh.                                  ║
// ║  Bỏ cột "ID kênh": với TikTok thì ID chính là TÊN kênh (bấm vào tên là   ║
// ║  mở thẳng kênh) nên nhập 2 lần là thừa. Cột audit_id trong DB vẫn giữ    ║
// ║  nguyên — form không đụng tới, Page ID Facebook vẫn gắn ở mục Facebook.  ║
// ║                                                                          ║
// ║  NGƯỜI PHỤ TRÁCH (chốt 19/08/2026): chỉ Admin đổi được, sửa ngay trên    ║
// ║  bảng. Đây là nguồn suy ra KPI và doanh thu của từng nhân viên: KPI của  ║
// ║  một người = tổng chỉ tiêu các kênh họ cầm (đặt ở màn KPI tháng), thực   ║
// ║  hiện = tổng doanh thu các kênh đó. Gán sai người là lệch KPI cả tháng.  ║
// ║  Trạng thái kênh KHÔNG hiện ở màn này nên form cũng không đụng tới.      ║
// ║                                                                          ║
// ║  2 quy tắc dữ liệu (App.tsx thực thi, ở đây chỉ cảnh báo trước):         ║
// ║   • ĐỔI TÊN kênh sẽ cập nhật luôn tên trong toàn bộ báo cáo cũ — vì app  ║
// ║     nối báo cáo với kênh bằng TÊN, không phải id.                        ║
// ║   • Kênh ĐÃ CÓ BÁO CÁO vẫn xóa được (migration 0022 đổi FK sang SET      ║
// ║     NULL) — BÁO CÁO CŨ KHÔNG MẤT vì mỗi dòng đã lưu sẵn channel_name.    ║
// ║     Nhưng phải gõ đúng tên kênh để xác nhận, vì doanh thu cũ sẽ rơi vào  ║
// ║     nhóm "Khác" / "Chưa gán người phụ trách" ở Tổng quan.                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import React, { useMemo, useState } from 'react';
import { AffiliateChannel, DailyReport, Employee, UserSession } from '../types';
import { FacebookIcon, TikTokIcon } from './BrandIcons';
import { isContentChannel, managerOf } from '../lib/channels';
import { contentStaff } from '../lib/staff';

interface ChannelManagementProps {
  channels: AffiliateChannel[];
  reports: DailyReport[];
  employees: Employee[];
  session: UserSession;
  onAddChannel: (newChannel: AffiliateChannel) => void;
  onUpdateChannel: (id: string, patch: Partial<AffiliateChannel>) => void;
  onDeleteChannel: (channelId: string) => void;
}

type Platform = AffiliateChannel['platform'];
type ChannelType = AffiliateChannel['channelType'];

const PLATFORMS: Platform[] = ['TikTok', 'Facebook', 'Shopee', 'YouTube'];
const TYPES: ChannelType[] = ['Brand', 'Real KOC', 'AI KOC'];

const TYPE_LABEL: Record<ChannelType, string> = {
  'Brand': 'Kênh thương hiệu',
  'Real KOC': 'KOC người thật',
  'AI KOC': 'KOC AI',
};

// Link kênh: ưu tiên link người dùng nhập; kênh TikTok thì suy ra từ tên nếu chưa nhập.
const channelLink = (c: AffiliateChannel) => {
  const url = c.channelUrl?.trim();
  if (url) return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  if (c.platform === 'TikTok') return `https://tiktok.com/@${c.name}`;
  return '';
};

// Form dùng chung cho Thêm & Sửa — đúng bằng các trường bảng đang hiển thị.
type FormState = {
  name: string;
  brandCategory: string;
  platform: Platform;
  channelType: ChannelType;
  managerName: string;
  channelUrl: string;
  linkedShop: boolean;
  revenueActive: boolean;
  trafficActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  brandCategory: TYPE_LABEL['AI KOC'],
  platform: 'TikTok',
  channelType: 'AI KOC',
  managerName: '',
  channelUrl: '',
  linkedShop: false,
  revenueActive: true,
  trafficActive: false,
};

const formOf = (c: AffiliateChannel): FormState => ({
  name: c.name,
  brandCategory: c.brandCategory,
  platform: c.platform,
  channelType: c.channelType,
  managerName: managerOf(c),
  channelUrl: c.channelUrl ?? '',
  linkedShop: c.linkedShop === true,
  revenueActive: c.tracking.revenueActive,
  trafficActive: c.tracking.trafficActive,
});

export default function ChannelManagementComponent({
  channels, reports, employees, session, onAddChannel, onUpdateChannel, onDeleteChannel,
}: ChannelManagementProps) {
  // Chỉ Admin được đổi người phụ trách (chốt với user) — người khác chỉ xem.
  const canAssign = session.role === 'Admin';
  // Nhân sự team Content để chọn làm người phụ trách (bỏ Media / Ads FB / HR).
  const staff = useMemo(() => contentStaff(employees), [employees]);
  // ── Bộ lọc (chỉ lọc theo thứ bảng có hiển thị) ──
  const [platformFilter, setPlatformFilter] = useState('Tất cả');
  const [typeFilter, setTypeFilter] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'az' | 'za'>('az');

  // ── Modal thêm/sửa + hộp thoại xóa + toast ──
  const [editing, setEditing] = useState<AffiliateChannel | null>(null); // null + isFormOpen = thêm mới
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<AffiliateChannel | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [notification, setNotification] = useState('');
  const notify = (m: string) => { setNotification(m); setTimeout(() => setNotification(''), 4000); };
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  // CHỈ kênh nội dung thật. ID Shopee KOC inhouse (Facebook + Real/AI KOC) không
  // phải kênh — quản lý ở màn Facebook > KOC inhouse; dòng "Facebook Ads" chỉ là
  // hạng mục đổ doanh thu. Quy tắc nằm ở src/lib/channels.ts.
  const managed = useMemo(() => channels.filter(isContentChannel), [channels]);

  // Số báo cáo theo TÊN kênh (app nối báo cáo ↔ kênh bằng tên) — dùng để cảnh
  // báo khi đổi tên và chặn xóa kênh còn dữ liệu.
  const reportCountByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reports) m.set(r.channelName, (m.get(r.channelName) ?? 0) + 1);
    return m;
  }, [reports]);
  const reportCountOf = (c: AffiliateChannel) => reportCountByName.get(c.name) ?? 0;

  const summary = useMemo(() => ({
    total: managed.length,
    tiktok: managed.filter((c) => c.platform === 'TikTok').length,
    facebook: managed.filter((c) => c.platform === 'Facebook').length,
    noManager: managed.filter((c) => !managerOf(c).trim()).length,
  }), [managed]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = managed.filter((c) => {
      if (platformFilter !== 'Tất cả' && c.platform !== platformFilter) return false;
      if (typeFilter !== 'Tất cả' && c.channelType !== typeFilter) return false;
      if (q && !c.name.toLowerCase().includes(q)
            && !managerOf(c).toLowerCase().includes(q)
            && !c.brandCategory.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) => (sortBy === 'za' ? -1 : 1) * a.name.localeCompare(b.name, 'vi'));
  }, [managed, platformFilter, typeFilter, searchQuery, sortBy]);

  // ── Mở form ──
  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setIsFormOpen(true); };
  const openEdit = (c: AffiliateChannel) => { setEditing(c); setForm(formOf(c)); setIsFormOpen(true); };
  const closeForm = () => { setIsFormOpen(false); setEditing(null); };

  // Loại kênh chọn được theo nền tảng: Facebook chỉ có kênh thương hiệu, vì
  // Facebook + Real/AI KOC là ID Shopee — thêm ở màn Facebook > KOC inhouse.
  const typeOptions = (p: Platform) => (p === 'Facebook' ? (['Brand'] as ChannelType[]) : TYPES);
  const changePlatform = (p: Platform) => {
    setForm((f) => ({
      ...f,
      platform: p,
      channelType: typeOptions(p).includes(f.channelType) ? f.channelType : 'Brand',
    }));
  };

  // Đổi loại kênh → gợi ý lại nhãn mô tả nếu người dùng chưa tự sửa.
  const changeType = (t: ChannelType) => {
    setForm((f) => ({
      ...f,
      channelType: t,
      brandCategory: TYPES.some((x) => f.brandCategory === TYPE_LABEL[x]) || !f.brandCategory
        ? TYPE_LABEL[t] : f.brandCategory,
      trafficActive: t === 'Brand' ? true : f.trafficActive,
    }));
  };

  const editingReports = editing ? reportCountOf(editing) : 0;
  const willRename = !!editing && form.name.trim() !== editing.name;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { alert('Vui lòng nhập tên kênh.'); return; }
    // Trùng tên trên cùng nền tảng — DB có UNIQUE(platform, name), chặn sớm cho rõ lỗi.
    const dup = channels.find(
      (c) => c.id !== editing?.id && c.platform === form.platform && c.name.toLowerCase() === name.toLowerCase(),
    );
    if (dup) { alert(`Kênh "${name}" đã tồn tại trên ${form.platform}.`); return; }
    // Chốt chặn: đừng để tạo ra dòng vừa lưu xong đã biến mất khỏi tab này.
    if (form.platform === 'Facebook' && form.channelType !== 'Brand') {
      alert('Facebook + KOC là ID Shopee, không phải kênh. Vào mục Facebook > KOC inhouse để thêm ID Shopee.');
      return;
    }

    // Chỉ gồm các trường bảng hiển thị → sửa kênh không đụng ID kênh / trạng thái.
    const fields = {
      name,
      brandCategory: form.brandCategory.trim() || TYPE_LABEL[form.channelType],
      platform: form.platform,
      channelType: form.channelType,
      linkedShop: form.linkedShop,
      channelUrl: form.channelUrl.trim(),
      tracking: { revenueActive: form.revenueActive, trafficActive: form.trafficActive },
    };

    // Người phụ trách chỉ đưa vào patch KHI THỰC SỰ ĐỔI: App đồng bộ manager_id
    // theo tên, gửi kèm tên không đổi là thừa, gửi tên lạ sẽ xoá mất manager_id.
    const assigned = form.managerName.trim();
    const managerPatch = editing && assigned !== managerOf(editing)
      ? { managerName: assigned, managerAvatar: staff.find((e) => e.name === assigned)?.avatar ?? '' }
      : {};

    if (editing) {
      onUpdateChannel(editing.id, { ...fields, ...managerPatch });
      notify(willRename ? `Đã đổi tên kênh thành "${name}" (báo cáo cũ cập nhật theo).` : `Đã cập nhật kênh "${name}".`);
    } else {
      // Kênh mới: người phụ trách lấy theo ô đã chọn, bỏ trống thì là người đang
      // đăng nhập (DB cần manager_id cho RLS). audit_id để trống — với TikTok thì
      // ID kênh chính là tên kênh nên không cần lưu thêm.
      const owner = assigned || session.name;
      onAddChannel({
        id: 'ch_' + Date.now(),
        ...fields,
        auditId: '',
        managerName: owner,
        managerAvatar: staff.find((e) => e.name === owner)?.avatar ?? session.avatar,
        status: 'Đang nuôi',
      });
      notify(`Đã thêm kênh "${name}".`);
    }
    closeForm();
  };

  /** Admin đổi người phụ trách ngay trên bảng — ghi luôn, không cần mở form. */
  const assignManager = (c: AffiliateChannel, name: string) => {
    const current = managerOf(c);
    if (name === current) return;
    onUpdateChannel(c.id, {
      managerName: name,
      managerAvatar: staff.find((e) => e.name === name)?.avatar ?? '',
    });
    notify(name
      ? `Kênh "${c.name}" đã giao cho ${name}.`
      : `Đã bỏ người phụ trách kênh "${c.name}".`);
  };

  const deletingReports = deleting ? reportCountOf(deleting) : 0;
  // Kênh còn báo cáo vẫn xóa được nhưng phải gõ đúng tên để xác nhận (chốt với
  // user 03/09/2026): dữ liệu cũ được giữ, song doanh thu sẽ mất người phụ trách.
  const needTypedConfirm = deletingReports > 0;
  const canConfirmDelete = !needTypedConfirm || deleteConfirmText.trim() === (deleting?.name ?? '').trim();

  return (
    <div className="flex flex-col gap-6 text-slate-800">

      {/* Toast */}
      {notification && (
        <div className="fixed top-20 right-6 z-[150] bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 font-display">Quản lý kênh</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kênh nội dung team Content đang vận hành — thêm kênh mới, sửa thông tin, gỡ kênh không dùng.
          </p>
          <p className="text-xs text-slate-400 mt-1 flex items-start gap-1.5">
            <span className="material-symbols-outlined text-[14px] mt-px">info</span>
            <span>ID Shopee của KOC inhouse không phải kênh nên không nằm ở đây — quản lý tại mục Facebook &gt; KOC inhouse.</span>
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 bg-[#D32027] hover:bg-[#B70F1B] text-white px-5 py-2.5 rounded-xl shadow-soft font-bold text-sm transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>Thêm kênh mới</span>
        </button>
      </div>

      {/* Tổng hợp nhanh — đếm theo đúng thứ bảng hiển thị */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng số kênh', value: summary.total, icon: 'hub', accent: 'text-violet-600 bg-violet-50' },
          { label: 'TikTok', value: summary.tiktok, icon: 'music_note', accent: 'text-slate-900 bg-slate-100' },
          { label: 'Facebook', value: summary.facebook, icon: 'thumb_up', accent: 'text-blue-600 bg-blue-50' },
          { label: 'Chưa gán người', value: summary.noManager, icon: 'person_off', accent: 'text-amber-600 bg-amber-50' },
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
        <div className="flex-1 min-w-[260px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            type="text"
            placeholder="Tìm theo tên kênh, nhãn mô tả hoặc người phụ trách..."
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] focus:bg-white transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {([
          { label: 'Nền tảng', value: platformFilter, set: setPlatformFilter, options: PLATFORMS },
          { label: 'Loại hình', value: typeFilter, set: setTypeFilter, options: TYPES },
        ] as const).map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{f.label}</label>
            <select
              className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
            >
              <option value="Tất cả">Tất cả</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sắp xếp</label>
          <select
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="az">Tên A → Z</option>
            <option value="za">Tên Z → A</option>
          </select>
        </div>
      </div>

      {/* Bảng kênh */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden flex flex-col">
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500">
            Hiển thị <span className="text-slate-900">{filtered.length}</span> / {managed.length} kênh
          </p>
          <p className="text-[11px] text-slate-400 italic hidden sm:block">
            Xóa kênh không làm mất báo cáo cũ — lịch sử doanh thu luôn được giữ.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Kênh</th>
                <th className="py-4 px-4">Nền tảng</th>
                <th className="py-4 px-4">Phân loại</th>
                <th className="py-4 px-4">Người phụ trách</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy kênh phù hợp với điều kiện lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const link = channelLink(c);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/40 transition-colors group">
                      {/* Kênh */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col min-w-0">
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-slate-950 hover:text-[#D32027] transition-colors flex items-center gap-1 text-sm"
                              title={link}
                            >
                              <span>{c.name}</span>
                              <span className="material-symbols-outlined text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                            </a>
                          ) : (
                            <span className="font-bold text-slate-950 text-sm">{c.name}</span>
                          )}
                          <span className="text-[11px] text-slate-400">{c.brandCategory}</span>
                        </div>
                      </td>

                      {/* Nền tảng */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                          c.platform === 'TikTok' ? 'bg-slate-950 text-white'
                          : c.platform === 'Facebook' ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'bg-orange-50 text-orange-600 border border-orange-200'
                        }`}>
                          {c.platform === 'TikTok' ? <TikTokIcon className="w-3.5 h-3.5" />
                            : c.platform === 'Facebook' ? <FacebookIcon className="w-3.5 h-3.5" />
                            : <span className="material-symbols-outlined text-[14px]">storefront</span>}
                          <span>{c.platform}</span>
                        </span>
                      </td>

                      {/* Phân loại + cờ theo dõi */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            c.channelType === 'Brand' ? 'bg-red-50 text-red-700 border border-red-200'
                            : c.channelType === 'Real KOC' ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                            {c.channelType}
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <span className={c.tracking.revenueActive ? 'text-emerald-600' : ''} title="Theo dõi doanh thu">DT</span>
                            <span className="text-slate-200">·</span>
                            <span className={c.tracking.trafficActive ? 'text-emerald-600' : ''} title="Theo dõi lưu lượng">Traffic</span>
                            {c.linkedShop === true && (
                              <span className="material-symbols-outlined text-[13px] text-emerald-600" title="Đã gắn shop">link</span>
                            )}
                            {c.linkedShop === 'disconnected' && (
                              <span className="material-symbols-outlined text-[13px] text-red-600" title="Mất kết nối shop">link_off</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Người phụ trách — Admin đổi trực tiếp tại đây */}
                      <td className="py-4 px-4">
                        {canAssign ? (
                          <select
                            value={managerOf(c)}
                            onChange={(e) => assignManager(c, e.target.value)}
                            className={`w-full max-w-[190px] bg-white border rounded-lg py-1.5 px-2 text-xs font-semibold cursor-pointer outline-none focus:border-[#D32027] ${
                              managerOf(c) ? 'border-slate-200 text-slate-700' : 'border-amber-300 text-amber-700 bg-amber-50'
                            }`}
                          >
                            <option value="">— Chưa gán —</option>
                            {/* Người đang phụ trách nhưng không còn trong danh sách nhân sự vẫn phải hiện,
                                nếu không chọn ô này là vô tình xoá mất người phụ trách. */}
                            {!!managerOf(c) && !staff.some((e) => e.name === managerOf(c)) && (
                              <option value={managerOf(c)}>{managerOf(c)} (ngoài danh sách)</option>
                            )}
                            {staff.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
                          </select>
                        ) : managerOf(c) ? (
                          <span className="text-xs font-semibold text-slate-700">{managerOf(c)}</span>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-semibold italic">chưa gán</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-[#D32027] hover:bg-rose-50 rounded-lg transition-colors"
                            title="Sửa thông tin kênh"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => { setDeleting(c); setDeleteConfirmText(''); }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={reportCountOf(c) > 0
                              ? `Xóa kênh (còn ${reportCountOf(c)} báo cáo — báo cáo cũ vẫn được giữ)`
                              : 'Xóa kênh'}
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FORM THÊM / SỬA — đúng bằng bộ trường bảng đang hiển thị ── */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 relative animate-fade-in my-8">
            <button
              onClick={closeForm}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1 font-display">
              {editing ? 'Sửa thông tin kênh' : 'Thêm kênh mới'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {editing ? `Đang sửa kênh "${editing.name}".` : 'Kênh mới sẽ hiện ở đúng mục TikTok/Facebook tương ứng.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Kênh: tên + nhãn mô tả (cột "Kênh") */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tên kênh</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ví dụ: drkampharmaofficial"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
                {willRename && (
                  <p className="text-[11px] mt-1.5 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[14px] mt-px">info</span>
                    <span>
                      Đổi tên sẽ cập nhật tên kênh trong <b>{editingReports} báo cáo cũ</b> để không mất lịch sử doanh thu.
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nhãn mô tả kênh</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kênh thương hiệu, KOC AI, Kênh vệ tinh..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  value={form.brandCategory}
                  onChange={(e) => set('brandCategory', e.target.value)}
                />
                <p className="text-[11px] text-slate-400 mt-1 italic">Dòng chữ nhỏ hiện ngay dưới tên kênh trong bảng.</p>
              </div>

              {/* 2. Nền tảng + 3. Phân loại */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nền tảng</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                    value={form.platform}
                    onChange={(e) => changePlatform(e.target.value as Platform)}
                  >
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Phân loại</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                    value={form.channelType}
                    onChange={(e) => changeType(e.target.value as ChannelType)}
                  >
                    {typeOptions(form.platform).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]} ({t})</option>)}
                  </select>
                  {form.platform === 'Facebook' && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">
                      KOC inhouse trên Facebook là ID Shopee — thêm ở mục Facebook &gt; KOC inhouse.
                    </p>
                  )}
                </div>
              </div>

              {/* Cờ hiện dưới ô phân loại trong bảng: DT · Traffic · gắn shop */}
              <div className="rounded-xl border border-slate-200 p-3 flex flex-wrap gap-x-5 gap-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#D32027]"
                    checked={form.revenueActive}
                    onChange={(e) => set('revenueActive', e.target.checked)}
                  />
                  Theo dõi doanh thu (DT)
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#D32027]"
                    checked={form.trafficActive}
                    onChange={(e) => set('trafficActive', e.target.checked)}
                  />
                  Theo dõi lưu lượng (Traffic)
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#D32027]"
                    checked={form.linkedShop}
                    onChange={(e) => set('linkedShop', e.target.checked)}
                  />
                  Đã gắn shop
                </label>
              </div>

              {/* 4. Người phụ trách — nguồn suy ra KPI & doanh thu của từng nhân viên */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Người phụ trách</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">person</span>
                  <select
                    disabled={!canAssign}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400"
                    value={form.managerName}
                    onChange={(e) => set('managerName', e.target.value)}
                  >
                    <option value="">— Chưa gán —</option>
                    {!!form.managerName && !staff.some((e) => e.name === form.managerName) && (
                      <option value={form.managerName}>{form.managerName} (ngoài danh sách)</option>
                    )}
                    {staff.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </select>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  {canAssign
                    ? 'KPI và doanh thu của nhân viên được cộng từ các kênh họ phụ trách.'
                    : 'Chỉ Admin đổi được người phụ trách.'}
                </p>
              </div>

              {/* 5. Link kênh — làm tên kênh trong bảng bấm được */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Link kênh</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">link</span>
                  <input
                    type="text"
                    placeholder="https://www.tiktok.com/@... hoặc https://facebook.com/..."
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    value={form.channelUrl}
                    onChange={(e) => set('channelUrl', e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  Để trống thì kênh TikTok tự dùng link theo tên; kênh nền tảng khác sẽ không bấm vào tên được.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-xs font-bold rounded-lg"
                >
                  {editing ? 'Lưu thay đổi' : 'Thêm kênh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── XÓA KÊNH ── */}
      {deleting && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined">warning</span>
              </span>
              <h3 className="text-lg font-bold text-slate-900 font-display">Xóa kênh?</h3>
            </div>

            <p className="text-sm text-slate-600">
              Xóa kênh <b>{deleting.name}</b> khỏi danh sách đang quản lý.
            </p>

            {needTypedConfirm ? (
              <>
                <ul className="mt-3 space-y-1.5 text-[12px] text-slate-500">
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-green-600 mt-px">check_circle</span>
                    <span><b className="text-slate-700">{deletingReports} báo cáo cũ vẫn được giữ nguyên</b> — doanh thu lịch sử không mất, Tổng quan vẫn cộng đủ.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-amber-600 mt-px">error</span>
                    <span>Kênh biến mất khỏi danh sách nên doanh thu cũ sẽ nằm ở nhóm <b>“Khác”</b> và dòng <b>“Chưa gán người phụ trách”</b> ở Tổng quan.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-slate-400 mt-px">flag</span>
                    <span>
                      KPI của kênh: chưa đặt (0đ) thì <b>xóa luôn</b>; đã đặt cho tháng này thì <b>giữ tới hết tháng</b>
                      để đối chiếu, sang tháng sau tự hết.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-slate-400 mt-px">lightbulb</span>
                    <span>Chỉ muốn ngừng dùng kênh? Sửa kênh và <b>tắt “Theo dõi doanh thu”</b> — kênh vẫn còn, số cũ vẫn thuộc về người phụ trách.</span>
                  </li>
                </ul>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-4 mb-1">
                  Gõ đúng tên kênh để xác nhận
                </label>
                <input
                  type="text" value={deleteConfirmText} placeholder={deleting.name}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                />
              </>
            ) : (
              <p className="text-[12px] text-slate-500 mt-2">
                Kênh chưa có báo cáo nào nên xóa sẽ không mất dữ liệu. KPI chưa đặt của kênh cũng được dọn luôn.
              </p>
            )}

            <div className="pt-4 flex justify-end gap-2">
              <button onClick={() => setDeleting(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Hủy
              </button>
              <button
                disabled={!canConfirmDelete}
                onClick={() => {
                  onDeleteChannel(deleting.id);
                  notify(needTypedConfirm
                    ? `Đã xóa kênh "${deleting.name}" — ${deletingReports} báo cáo cũ vẫn được giữ.`
                    : `Đã xóa kênh "${deleting.name}".`);
                  setDeleting(null);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Xóa kênh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
