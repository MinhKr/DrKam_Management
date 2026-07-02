import React, { useState, useEffect } from 'react';
import { DailyReport, AffiliateChannel, UserSession, FbPage } from '../types';
import ConfirmDialog from './ConfirmDialog';
import BrandTrafficDashboard from './BrandTrafficDashboard';
import KocCompetitionDashboard from './KocCompetitionDashboard';
import { FacebookIcon } from './BrandIcons';

type ConfirmState = { message: string; onConfirm: () => void } | null;

export type BrandDayRecord = {
  date: string; // dd/mm/yyyy
  viewsReach: number; like: number; comment: number; share: number;
  save: number; completionRate: number; avgDuration: number; followerIncr: number;
  videoCount: number; // số video đăng trong ngày
};

interface FacebookReportComponentProps {
  reports: DailyReport[];
  channels: AffiliateChannel[];
  session: UserSession;
  fbPages: FbPage[];
  onAddReport: (newReport: DailyReport) => void;
  onDeleteReport: (reportId: string) => void;
  onAddFbPage: (page: FbPage) => void;
  onDeleteFbPage: (id: string) => void;
  onReportDay: (channelName: string, rec: BrandDayRecord) => void;
  onUpdateChannel: (id: string, patch: Partial<AffiliateChannel>) => void;
  onAddChannel: (chan: AffiliateChannel) => void; // thành viên tự thêm ID Shopee của mình
  view: 'koc' | 'brand'; // chọn từ dropdown sidebar
}

const numFormat = (val: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(val)
    .replace('₫', 'đ');
const intFmt = (n: number) => n.toLocaleString('vi-VN');

// Ngày hôm nay theo MÚI GIỜ MÁY (GMT+7 ở VN), KHÔNG dùng toISOString() vì nó trả UTC
// → tránh lệch 1 ngày trong khung 00:00–07:00 sáng giờ Việt Nam.
const isoTodayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const toDdmmyyyy = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const toIsoDate = (d: string) => { const [dd, mm, yy] = d.split('/'); return `${yy}-${mm}-${dd}`; };
const shiftIso = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};
const daysBetween = (from: string, to: string) => {
  const [a, b, c] = from.split('-').map(Number);
  const [x, y, z] = to.split('-').map(Number);
  return Math.round((Date.UTC(x, y - 1, z) - Date.UTC(a, b - 1, c)) / 86_400_000) + 1;
};

/**
 * Mục Facebook — 2 chế độ xem toàn màn hình:
 *  • Kênh KOC inhouse  → chia theo ID Shopee (mỗi thành viên): kênh FB + doanh thu (nhập tay)
 *  • Kênh thương hiệu  → chỉ TRAFFIC (8 chỉ số, không doanh thu) — NHẬP TAY toàn bộ, format giống TikTok
 */
export default function FacebookReportComponent(props: FacebookReportComponentProps) {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 text-slate-800">
      {props.view === 'koc' ? <KocInhouseView {...props} /> : <BrandView {...props} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   VIEW 1 — KÊNH KOC INHOUSE: chia theo ID Shopee (mỗi thành viên)
   ════════════════════════════════════════════════════════════════ */
function KocInhouseView({
  reports,
  channels,
  session,
  fbPages,
  onAddReport,
  onDeleteReport,
  onAddFbPage,
  onDeleteFbPage,
  onAddChannel,
}: FacebookReportComponentProps) {
  // Mỗi "nhóm" = 1 ID Shopee KOC inhouse (1 thành viên)
  const idGroups = channels.filter(
    (c) =>
      c.platform === 'Facebook' &&
      (c.channelType === 'Real KOC' || c.channelType === 'AI KOC') &&
      c.tracking.revenueActive,
  );

  const isMine = (g: AffiliateChannel) => g.managerName === session.name;
  // Chính sách (đã chốt 12/06): mỗi người chỉ sửa nhóm ID của MÌNH; Admin toàn quyền.
  // Người khác chỉ XEM (RLS Supabase ép cùng quy tắc qua manager_id).
  const canEdit = (g: AffiliateChannel) => session.role === 'Admin' || isMine(g);

  // Đưa nhóm của chính mình lên đầu cho dễ nhìn
  const sortedGroups = [...idGroups].sort((a, b) => Number(isMine(b)) - Number(isMine(a)));

  const [selectedId, setSelectedId] = useState(idGroups.find(isMine)?.id || idGroups[0]?.id || '');
  const selectedGroup = idGroups.find((g) => g.id === selectedId) || sortedGroups[0];
  const editable = selectedGroup ? canEdit(selectedGroup) : false;

  // Bộ lọc doanh thu theo ngày (rỗng = không giới hạn)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const toIso = (d: string) => {
    const [dd, mm, yy] = d.split('/');
    return dd && mm && yy ? `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}` : d;
  };
  const inRange = (r: DailyReport) => {
    const iso = toIso(r.date);
    if (fromDate && iso < fromDate) return false;
    if (toDate && iso > toDate) return false;
    return true;
  };

  // Báo cáo doanh thu (gộp theo ID): channelName = tên nhóm ID, áp bộ lọc ngày,
  // sắp xếp NGÀY GẦN NHẤT lên đầu.
  const reportsOf = (g: AffiliateChannel) =>
    reports
      .filter((r) => r.channelName === g.name && inRange(r))
      .sort((a, b) => toIso(b.date).localeCompare(toIso(a.date)));
  const revenueOf = (g: AffiliateChannel) => reportsOf(g).reduce((s, r) => s + r.revenue, 0);
  const pagesOf = (g: AffiliateChannel) => fbPages.filter((p) => p.shopeeChannelId === g.id);
  const totalTeamRevenue = idGroups.reduce((s, g) => s + revenueOf(g), 0);

  // ── Dữ liệu cho dashboard "đua doanh thu" giữa các thành viên ──
  // Range hiệu lực: theo bộ lọc nếu có; nếu trống thì phủ toàn bộ dải dữ liệu (mặc định 30 ngày gần nhất).
  const kocScoped = reports.filter((r) => r.channelType === 'Facebook - KOC');
  const allIso = kocScoped.map((r) => toIso(r.date)).sort();
  const dashTo = toDate || allIso[allIso.length - 1] || isoTodayLocal();
  const dashFrom = fromDate || allIso[0] || shiftIso(dashTo, -29);
  const competitionMembers = idGroups.map((g) => ({ channelName: g.name, managerName: g.managerName, auditId: g.auditId }));

  // ── Form thêm báo cáo doanh thu ──
  const [showReportForm, setShowReportForm] = useState(false);
  const [date, setDate] = useState(isoTodayLocal);
  const [revenueStr, setRevenueStr] = useState('');

  // ── Form thêm fanpage ──
  const [showPageForm, setShowPageForm] = useState(false);
  const [pageName, setPageName] = useState('');

  // ── Form thêm ID Shopee của chính mình (tự phục vụ) ──
  const [showIdForm, setShowIdForm] = useState(false);
  const [newShopeeId, setNewShopeeId] = useState('');

  const [notification, setNotification] = useState('');
  const [dialog, setDialog] = useState<ConfirmState>(null);
  // Ngày đã có doanh thu → hỏi có muốn sửa (ghi đè) không (giữ lại số cần lưu).
  const [dupInfo, setDupInfo] = useState<{ formattedDate: string; rev: number; vid: number } | null>(null);
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const submitReport = (formattedDate: string, rev: number, vid: number) => {
    if (!selectedGroup) return;
    onAddReport({
      id: 'r_fb_' + Date.now(),
      date: formattedDate,
      channelName: selectedGroup.name,
      channelType: 'Facebook - KOC',
      revenue: rev,
      views: null,
      interactions: null,
      source: session.role === 'Admin' ? 'Admin' : 'Nhân viên',
      isEditable: true,
      traffic: null,
      note: null,
      videoCount: vid || null,
    });
    setRevenueStr('');
    setShowReportForm(false);
    notify('Đã lưu doanh thu Shopee!');
  };

  const handleAddReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    const rev = parseInt(revenueStr.replace(/\D/g, ''), 10);
    if (isNaN(rev) || rev < 0) {
      alert('Vui lòng nhập doanh thu hợp lệ.');
      return;
    }
    const vid = 0;
    const [y, m, d] = date.split('-');
    const formattedDate = y && m && d ? `${d}/${m}/${y}` : date;
    // Ngày này đã có doanh thu cho ID đang chọn → hỏi trước khi ghi đè.
    const dup = reports.find((r) => r.channelName === selectedGroup.name && r.date === formattedDate);
    if (dup) { setDupInfo({ formattedDate, rev, vid }); return; }
    submitReport(formattedDate, rev, vid);
  };

  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !pageName.trim()) {
      alert('Vui lòng nhập tên fanpage.');
      return;
    }
    onAddFbPage({
      id: 'fp_' + Date.now(),
      shopeeChannelId: selectedGroup.id,
      name: pageName.trim(),
      addedBy: session.name,
    });
    setPageName('');
    setShowPageForm(false);
    notify('Đã thêm fanpage Facebook!');
  };

  // Thành viên tự thêm ID Shopee của mình → kênh tạo ra tự gắn chủ = chính họ
  // (managerName = session.name; ở chế độ DB, manager_id = người đăng nhập qua RLS).
  const handleAddShopeeId = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newShopeeId.trim();
    if (!id) { alert('Vui lòng nhập ID Shopee.'); return; }
    if (idGroups.some((g) => g.auditId === id || g.name === id)) {
      alert(`ID Shopee "${id}" đã tồn tại trong danh sách.`);
      return;
    }
    onAddChannel({
      id: 'ch_fb_' + Date.now(),
      name: id,
      brandCategory: 'KOC inhouse',
      platform: 'Facebook',
      channelType: 'Real KOC',
      linkedShop: false,
      auditId: id,
      managerName: session.name,
      managerAvatar: session.avatar,
      status: 'Đang nuôi',
      tracking: { revenueActive: true, trafficActive: false },
    });
    setNewShopeeId('');
    setShowIdForm(false);
    notify('Đã thêm ID Shopee của bạn!');
  };

  // Thanh "Thêm ID Shopee của tôi" — chỉ 1 nút bên phải; bấm mới hiện form.
  const addIdBar = (
    <div className="flex flex-col items-end gap-3">
      <button
        type="button"
        onClick={() => setShowIdForm((s) => !s)}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D32027] hover:bg-[#B70F1B] text-white font-bold text-xs rounded-xl shadow-soft transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">{showIdForm ? 'close' : 'add'}</span>
        <span>{showIdForm ? 'Đóng' : 'Thêm ID Shopee của tôi'}</span>
      </button>
      {showIdForm && (
        <form onSubmit={handleAddShopeeId} className="w-full bg-white border border-slate-200/60 rounded-2xl p-4 soft-shadow flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Nhập ID Shopee Affiliate của bạn (vd: conghaing)..."
            className="flex-1 min-w-[220px] px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-white"
            value={newShopeeId}
            onChange={(e) => setNewShopeeId(e.target.value)}
          />
          <button type="submit" className="px-4 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-xs font-bold rounded-lg">Lưu</button>
          <p className="w-full text-[11px] text-slate-400">ID này sẽ tự động thuộc về bạn — người khác chỉ xem, không sửa được.</p>
        </form>
      )}
    </div>
  );

  if (idGroups.length === 0) {
    return (
      <div className="space-y-4">
        {addIdBar}
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow py-12 text-center text-slate-400 font-medium px-6">
          Bạn chưa có ID Shopee nào. Bấm <b>“Thêm ID Shopee của tôi”</b> ở trên để bắt đầu — ID sẽ tự động thuộc về bạn.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#627D47] text-white px-5 py-4 rounded-xl shadow-lg border border-green-600 flex items-center gap-3">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
          <FacebookIcon className="w-6 h-6 text-[#1877F2]" />
          <span>Facebook — KOC inhouse (theo ID Shopee)</span>
        </h1>
      </div>

      {addIdBar}

      {/* ── BỘ LỌC DOANH THU THEO NGÀY ── */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-4 soft-shadow flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="material-symbols-outlined text-[20px] text-[#D32027]">filter_alt</span>
          <span className="text-sm font-bold">Lọc doanh thu theo ngày</span>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Từ ngày</label>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-slate-50/30"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Đến ngày</label>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-slate-50/30"
          />
        </div>
        {(fromDate || toDate) && (
          <button
            type="button"
            onClick={() => { setFromDate(''); setToDate(''); }}
            className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span>Xóa lọc</span>
          </button>
        )}
      </div>

      {/* ── THỐNG KÊ CHUNG CẢ TEAM ── */}
      <section className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-xl">leaderboard</span>
            <span>Thống kê chung cả team</span>
          </h2>
          <span className="text-sm font-bold text-[#D32027]">Tổng: {numFormat(totalTeamRevenue)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3">ID Shopee</th>
                <th className="px-5 py-3">Người phụ trách</th>
                <th className="px-5 py-3 text-center">Số kênh FB</th>
                <th className="px-5 py-3 text-center">Số báo cáo</th>
                <th className="px-5 py-3 text-right">Tổng doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sortedGroups.map((g) => (
                <tr
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  className={`cursor-pointer transition-colors ${
                    g.id === selectedGroup?.id ? 'bg-rose-50/60' : isMine(g) ? 'bg-green-50/40 hover:bg-green-50/60' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200/50">{g.auditId}</span>
                      {isMine(g) && (
                        <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">Của bạn</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600 font-medium">{g.managerName}</td>
                  <td className="px-5 py-3 text-center font-mono text-slate-700">{pagesOf(g).length}</td>
                  <td className="px-5 py-3 text-center font-mono text-slate-700">{reportsOf(g).length}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">{numFormat(revenueOf(g))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── BỘ CHỌN ID (nhóm của bạn ở đầu) ── */}
      <div className="flex flex-wrap gap-2">
        {sortedGroups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedId(g.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
              g.id === selectedGroup?.id
                ? 'bg-[#D32027] text-white border-[#D32027] shadow-soft'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">person</span>
            <span>{g.managerName}</span>
            <span className="font-mono text-[11px] opacity-70">({g.auditId})</span>
            {isMine(g) && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${g.id === selectedGroup?.id ? 'bg-white/20 text-white' : 'text-green-700 bg-green-50 border border-green-200'}`}>Của bạn</span>
            )}
          </button>
        ))}
      </div>

      {selectedGroup && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── KÊNH FACEBOOK ── */}
          <section className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <FacebookIcon className="w-5 h-5 text-[#1877F2]" />
                <span>Kênh Facebook</span>
                <span className="text-xs font-normal text-slate-400">({pagesOf(selectedGroup).length})</span>
              </h2>
              {editable && (
                <button
                  onClick={() => setShowPageForm((s) => !s)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#D32027] hover:bg-[#B70F1B] text-white font-bold text-[11px] rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">{showPageForm ? 'close' : 'add'}</span>
                  <span>{showPageForm ? 'Đóng' : 'Thêm kênh'}</span>
                </button>
              )}
            </div>

            {editable && showPageForm && (
              <form onSubmit={handleAddPage} className="p-4 border-b border-slate-100 bg-slate-50/40 flex gap-2">
                <input
                  type="text"
                  placeholder="Tên / đường dẫn fanpage..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-white"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                />
                <button type="submit" className="px-4 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-xs font-bold rounded-lg">Lưu</button>
              </form>
            )}

            <div className="divide-y divide-slate-100 flex-1">
              {pagesOf(selectedGroup).length === 0 ? (
                <p className="py-10 text-center text-slate-400 text-sm">Chưa có fanpage nào.</p>
              ) : (
                pagesOf(selectedGroup).map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <FacebookIcon className="w-[18px] h-[18px] text-[#1877F2]" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{p.name}</p>
                        <p className="text-[11px] text-slate-400">Thêm bởi {p.addedBy}</p>
                      </div>
                    </div>
                    {editable && (
                      <button
                        onClick={() => setDialog({ message: `Gỡ fanpage "${p.name}" khỏi danh sách?`, onConfirm: () => onDeleteFbPage(p.id) })}
                        className="text-slate-300 hover:text-rose-600 transition-colors flex-shrink-0"
                        title="Gỡ fanpage"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ── BÁO CÁO DOANH THU ── */}
          <section className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600 text-xl">storefront</span>
                <span>Doanh thu Shopee</span>
                <span className="text-xs font-normal text-slate-400">({numFormat(revenueOf(selectedGroup))})</span>
              </h2>
              {editable ? (
                <button
                  onClick={() => setShowReportForm((s) => !s)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#D32027] hover:bg-[#B70F1B] text-white font-bold text-[11px] rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">{showReportForm ? 'close' : 'add'}</span>
                  <span>{showReportForm ? 'Đóng' : 'Thêm báo cáo'}</span>
                </button>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                  <span className="material-symbols-outlined text-[14px]">lock</span>Chỉ xem
                </span>
              )}
            </div>

            {editable && showReportForm && (
              <form onSubmit={handleAddReport} className="p-4 border-b border-slate-100 bg-slate-50/40 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Ngày</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-white"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Doanh thu (VND)</label>
                    <input
                      type="text"
                      placeholder="Nhập..."
                      className="w-full px-3 py-2 text-sm text-right font-bold border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-white"
                      value={revenueStr}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '');
                        setRevenueStr(cleaned ? parseInt(cleaned, 10).toLocaleString('vi-VN') : '');
                      }}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="px-5 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-xs font-bold rounded-lg">Lưu doanh thu</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto overflow-y-auto max-h-[240px] flex-1">
              <table className="w-full text-left border-collapse min-w-[420px]">
                <thead>
                  <tr className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3">Ngày</th>
                    <th className="px-5 py-3 text-right">Doanh thu</th>
                    {editable && <th className="px-5 py-3 text-center">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {reportsOf(selectedGroup).length === 0 ? (
                    <tr><td colSpan={editable ? 3 : 2} className="py-10 text-center text-slate-400">Chưa có dữ liệu doanh thu.</td></tr>
                  ) : (
                    reportsOf(selectedGroup).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 text-slate-600 font-medium">{r.date}</td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900">{numFormat(r.revenue)}</td>
                        {editable && (
                          <td className="px-5 py-3 text-center">
                            <button
                              className="text-slate-300 hover:text-rose-600 transition-colors"
                              title="Xóa"
                              onClick={() => setDialog({ message: `Xóa doanh thu ngày ${r.date}?`, onConfirm: () => onDeleteReport(r.id) })}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ── DASHBOARD: độ cạnh tranh giữa các thành viên ── */}
      {competitionMembers.length > 0 && (
        <KocCompetitionDashboard reports={kocScoped} from={dashFrom} to={dashTo} members={competitionMembers} />
      )}

      <ConfirmDialog
        open={!!dialog}
        message={dialog?.message || ''}
        confirmText="Xóa"
        onConfirm={() => {
          dialog?.onConfirm();
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={!!dupInfo}
        danger={false}
        title="Ngày này đã có báo cáo"
        message={`ID "${selectedGroup?.auditId}" đã có doanh thu ngày ${dupInfo?.formattedDate}. Bạn có muốn sửa (ghi đè) không? Nếu không, hãy chọn ngày khác.`}
        confirmText="Sửa số liệu"
        cancelText="Chọn ngày khác"
        onConfirm={() => { if (dupInfo) submitReport(dupInfo.formattedDate, dupInfo.rev, dupInfo.vid); setDupInfo(null); }}
        onCancel={() => setDupInfo(null)}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   VIEW 2 — KÊNH THƯƠNG HIỆU: format giống TikTok TH
   Bảng cộng dồn theo khoảng + dashboard bên dưới. Báo cáo NHẬP TAY toàn bộ qua modal.
   ════════════════════════════════════════════════════════════════ */
type BrandAgg = {
  days: number; viewsReach: number; comment: number; like: number;
  share: number; save: number; followerIncr: number; viewAllRate: number; avgViewDuration: number;
};
function aggregate(rs: DailyReport[]): BrandAgg {
  const traf = rs.map((r) => r.traffic).filter(Boolean) as NonNullable<DailyReport['traffic']>[];
  const sumT = (f: (t: NonNullable<DailyReport['traffic']>) => number) => traf.reduce((s, t) => s + (f(t) || 0), 0);
  const avgT = (f: (t: NonNullable<DailyReport['traffic']>) => number) => (traf.length ? sumT(f) / traf.length : 0);
  return {
    days: rs.length,
    viewsReach: sumT((t) => t.viewsReach), comment: sumT((t) => t.comment), like: sumT((t) => t.like),
    share: sumT((t) => t.share), save: sumT((t) => t.save), followerIncr: sumT((t) => t.followerIncr),
    viewAllRate: Math.round(avgT((t) => t.viewAllRate) * 10) / 10,
    avgViewDuration: Math.round(avgT((t) => t.avgViewDuration) * 10) / 10,
  };
}

function BrandView({ reports, channels, session, onReportDay, onAddChannel }: FacebookReportComponentProps) {
  const list = channels.filter(
    (c) => c.platform === 'Facebook' && c.channelType === 'Brand' && c.tracking.trafficActive,
  );
  const isMine = (ch: AffiliateChannel) => ch.managerName === session.name;
  // Kênh thương hiệu FB là kênh DÙNG CHUNG → cả team content báo cáo được (khớp RLS
  // can_edit_channel_reports). isMine chỉ để xếp kênh của mình lên đầu + badge.
  const sorted = [...list].sort((a, b) => Number(isMine(b)) - Number(isMine(a)));

  const today = isoTodayLocal();
  const [preset, setPreset] = useState<'today' | 'yesterday' | '7d' | '30d' | 'custom'>('7d');
  const [customFrom, setCustomFrom] = useState(shiftIso(today, -6));
  const [customTo, setCustomTo] = useState(today);
  const range =
    preset === 'today' ? { from: today, to: today }
    : preset === 'yesterday' ? { from: shiftIso(today, -1), to: shiftIso(today, -1) }
    : preset === '7d' ? { from: shiftIso(today, -6), to: today }
    : preset === '30d' ? { from: shiftIso(today, -29), to: today }
    : { from: customFrom <= customTo ? customFrom : customTo, to: customTo >= customFrom ? customTo : customFrom };
  const dayCount = daysBetween(range.from, range.to);
  const single = range.from === range.to;

  const [modal, setModal] = useState<{ channel: AffiliateChannel; date: string } | null>(null);
  const [notification, setNotification] = useState('');
  const notify = (m: string) => { setNotification(m); setTimeout(() => setNotification(''), 4000); };

  // ── Form thêm page thương hiệu (tự phục vụ) ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageId, setNewPageId] = useState('');
  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPageName.trim();
    const pid = newPageId.trim();
    if (!name) { alert('Vui lòng nhập tên page.'); return; }
    if (list.some((c) => c.name === name)) { alert(`Page "${name}" đã tồn tại.`); return; }
    onAddChannel({
      id: 'ch_fbbrand_' + Date.now(),
      name,
      brandCategory: 'Kênh thương hiệu',
      platform: 'Facebook',
      channelType: 'Brand',
      linkedShop: false,
      auditId: pid, // Page ID Facebook (dùng cho Graph API sau này)
      managerName: session.name,
      managerAvatar: session.avatar,
      status: 'Đang nuôi',
      tracking: { revenueActive: false, trafficActive: true },
    });
    setNewPageName('');
    setNewPageId('');
    setShowAddForm(false);
    notify('Đã thêm page thương hiệu!');
  };

  // Khối "Thêm page" — chỉ 1 nút bên phải; bấm mới hiện form.
  const addBar = (
    <div className="flex flex-col items-end gap-3">
      <button
        type="button"
        onClick={() => setShowAddForm((s) => !s)}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D32027] hover:bg-[#B70F1B] text-white font-bold text-xs rounded-xl shadow-soft transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">{showAddForm ? 'close' : 'add'}</span>
        <span>{showAddForm ? 'Đóng' : 'Thêm page thương hiệu'}</span>
      </button>
      {showAddForm && (
        <form onSubmit={handleAddPage} className="w-full bg-white border border-slate-200/60 rounded-2xl p-4 soft-shadow grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-start">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Tên page (vd: DrKam - Sống khỏe...)"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-white"
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Page ID Facebook (vd: 1029716813565392)"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-white"
              value={newPageId}
              onChange={(e) => setNewPageId(e.target.value)}
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-xs font-bold rounded-lg sm:self-stretch">Lưu</button>
          <p className="sm:col-span-2 text-[11px] text-slate-400">Page ID lấy ở phần Giới thiệu/Trang của fanpage — dùng để tự lấy số qua API sau này. Cả team đều báo cáo được page này.</p>
        </form>
      )}
    </div>
  );

  const inRange = (r: DailyReport) => { const iso = toIsoDate(r.date); return iso >= range.from && iso <= range.to; };
  const isBrandReport = (r: DailyReport) => r.channelType === 'Facebook - Thương hiệu' || (r.channelType !== 'Facebook - KOC' && !!r.traffic);
  const reportsInRange = (ch: AffiliateChannel) =>
    reports
      .filter((r) => r.channelName === ch.name && isBrandReport(r) && inRange(r))
      .sort((a, b) => toIsoDate(b.date).localeCompare(toIsoDate(a.date)));

  const rows = sorted.map((ch) => { const rs = reportsInRange(ch); return { ch, rs, agg: aggregate(rs) }; });
  const totals = aggregate(rows.flatMap((r) => r.rs));

  // Toàn bộ báo cáo TH của nhóm kênh đang xem (KHÔNG lọc ngày — dashboard tự lọc + cần kỳ trước để so sánh).
  const scopeNames = new Set(list.map((c) => c.name));
  const scopedReports = reports.filter((r) => scopeNames.has(r.channelName) && isBrandReport(r));

  const handleSubmit = (channelName: string, rec: BrandDayRecord) => {
    onReportDay(channelName, rec);
    setModal(null);
    notify(`Đã lưu báo cáo ngày ${rec.date}!`);
  };

  const fmtRangeLabel = `${toDdmmyyyy(range.from)}${single ? '' : ' → ' + toDdmmyyyy(range.to)}`;
  const thNum = 'px-3 py-2.5 font-bold text-right whitespace-nowrap';
  const tdNum = 'px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap';

  return (
    <div className="space-y-5">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#627D47] text-white px-5 py-4 rounded-xl shadow-lg border border-green-600 flex items-center gap-3">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Header + bộ lọc ngày (góc trên phải) */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <FacebookIcon className="w-6 h-6 text-[#1877F2]" />
            <span>Facebook — Kênh thương hiệu</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Báo cáo traffic nhập tay theo từng page, mỗi ngày · 8 chỉ số</p>
        </div>

        <div className="flex flex-col items-stretch lg:items-end gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200/70 rounded-xl p-1 soft-shadow self-start lg:self-end">
            {([['today', 'Hôm nay'], ['yesterday', 'Hôm qua'], ['7d', '7 ngày'], ['30d', '30 ngày'], ['custom', 'Tùy chọn']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  preset === key ? 'bg-[#D32027] text-white shadow-soft' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-slate-200/70 rounded-xl px-3 py-2 soft-shadow">
              <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-slate-50/40" />
              <span className="material-symbols-outlined text-[16px] text-slate-400">arrow_forward</span>
              <input type="date" value={customTo} min={customFrom} max={today} onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-slate-50/40" />
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-slate-500 lg:justify-end flex-wrap">
            <span className="inline-flex items-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-[14px] text-[#D32027]">event</span>{fmtRangeLabel}
            </span>
            {!single && (
              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[13px]">functions</span>
                Cộng dồn {dayCount} ngày · tỉ lệ là TB
              </span>
            )}
          </div>
        </div>
      </div>

      {addBar}

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow py-12 text-center text-slate-400 font-medium px-6">
          Chưa có page thương hiệu nào. Bấm <b>“Thêm page”</b> ở trên để thêm — cả team đều nhập báo cáo traffic cho page đó được.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[860px]">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="sticky left-0 z-20 bg-slate-100 px-5 py-3 font-bold text-left border-b border-slate-200">Tên page</th>
                  <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Views/Reach</th>
                  <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Comment</th>
                  <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Like</th>
                  <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Share</th>
                  <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Lưu</th>
                  <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Xem hết</th>
                  <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>TG xem</th>
                  <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Follow+</th>
                  <th className="px-3 py-3 bg-slate-100 border-b border-slate-200 text-center w-[1%]"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map(({ ch, rs, agg }) => {
                  const has = rs.length > 0;
                  // Đã có báo cáo trong khoảng → SỬA đúng ngày báo cáo gần nhất (rs[0]),
                  // KHÔNG nhảy về hôm nay (bug cũ: sửa ở view nhiều ngày lại ghi vào hôm nay).
                  const reportDate = has ? toIsoDate(rs[0].date) : (single ? range.from : today);
                  const muted = !has ? 'text-slate-300' : '';
                  return (
                    <tr key={ch.id} className="group hover:bg-rose-50/40 transition-colors">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-rose-50 px-5 py-2.5 transition-colors">
                        <PageNameCell name={ch.name} mine={isMine(ch)} />
                      </td>
                      <td className={`${tdNum} ${has ? 'text-slate-900 font-bold' : muted}`}>{has ? intFmt(agg.viewsReach) : '—'}</td>
                      <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? intFmt(agg.comment) : '—'}</td>
                      <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? intFmt(agg.like) : '—'}</td>
                      <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? intFmt(agg.share) : '—'}</td>
                      <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? intFmt(agg.save) : '—'}</td>
                      <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? agg.viewAllRate + '%' : '—'}</td>
                      <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? agg.avgViewDuration + 's' : '—'}</td>
                      <td className={`${tdNum} ${has ? 'text-green-700' : muted}`}>{has ? '+' + intFmt(agg.followerIncr) : '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => setModal({ channel: ch, date: reportDate })}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-[#D32027] transition-colors"
                          title={has ? `Sửa báo cáo ngày ${rs[0].date}` : (single ? `Báo cáo ngày ${toDdmmyyyy(range.from)}` : 'Báo cáo hôm nay')}
                        >
                          <span className="material-symbols-outlined text-[18px]">{has ? 'edit' : 'add_chart'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Dòng tổng — cộng dồn toàn bộ page trong khoảng đang lọc */}
              <tfoot>
                <tr className="text-[11px]">
                  <td className="sticky left-0 z-10 bg-slate-50 px-5 py-3 font-bold text-slate-500 uppercase tracking-wider border-t-2 border-slate-200">Tổng {rows.length} page</td>
                  <td className={`${tdNum} font-extrabold text-[#D32027] bg-slate-50 border-t-2 border-slate-200`}>{intFmt(totals.viewsReach)}</td>
                  <td className={`${tdNum} font-bold text-slate-600 bg-slate-50 border-t-2 border-slate-200`}>{intFmt(totals.comment)}</td>
                  <td className={`${tdNum} font-bold text-slate-600 bg-slate-50 border-t-2 border-slate-200`}>{intFmt(totals.like)}</td>
                  <td className={`${tdNum} font-bold text-slate-600 bg-slate-50 border-t-2 border-slate-200`}>{intFmt(totals.share)}</td>
                  <td className={`${tdNum} font-bold text-slate-600 bg-slate-50 border-t-2 border-slate-200`}>{intFmt(totals.save)}</td>
                  <td className={`${tdNum} text-slate-300 bg-slate-50 border-t-2 border-slate-200`}>—</td>
                  <td className={`${tdNum} text-slate-300 bg-slate-50 border-t-2 border-slate-200`}>—</td>
                  <td className={`${tdNum} font-bold text-green-700 bg-slate-50 border-t-2 border-slate-200`}>+{intFmt(totals.followerIncr)}</td>
                  <td className="bg-slate-50 border-t-2 border-slate-200"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* DASHBOARD — đặt ngay dưới bảng, dùng chung bộ lọc ngày ở trên (traffic-only, không doanh thu) */}
      {list.length > 0 && (
        <BrandTrafficDashboard reports={scopedReports} from={range.from} to={range.to} showRevenue={false} />
      )}

      {modal && (
        <BrandReportModal
          channel={modal.channel}
          initialDate={modal.date}
          accentIndex={list.findIndex((c) => c.id === modal.channel.id) % 2}
          findReportOnDate={(d) =>
            reports.find((r) => r.channelName === modal.channel.name && r.date === d && isBrandReport(r))}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

/* Modal báo cáo traffic 1 ngày cho 1 page — NHẬP TAY toàn bộ 8 chỉ số */
function BrandReportModal({ channel, initialDate, accentIndex, findReportOnDate, onClose, onSubmit }: {
  channel: AffiliateChannel;
  initialDate: string;
  accentIndex: number;
  findReportOnDate: (dateDdmmyyyy: string) => DailyReport | undefined;
  onClose: () => void;
  onSubmit: (channelName: string, rec: BrandDayRecord) => void;
}) {
  const accent = accentIndex === 1
    ? { btn: 'bg-teal-600 hover:bg-teal-700', text: 'text-teal-700', soft: 'bg-teal-50', bar: 'from-[#0F766E] to-[#115E59]' }
    : { btn: 'bg-[#D32027] hover:bg-[#B70F1B]', text: 'text-[#D32027]', soft: 'bg-rose-50', bar: 'from-[#D32027] to-[#B70F1B]' };
  const maxDate = isoTodayLocal();

  const [date, setDate] = useState(initialDate);
  // Bản ghi đã có cho NGÀY đang chọn (cập nhật theo ô ngày trong modal).
  const existing = findReportOnDate(toDdmmyyyy(date));
  // Ngày đang chọn đã có báo cáo → modal ở chế độ SỬA (đổi tiêu đề + nút).
  const isEdit = !!existing;
  // Khi ngày đang chọn đã có báo cáo → hỏi có muốn sửa (ghi đè) không.
  const [dupDate, setDupDate] = useState<string | null>(null);
  const [viewsReach, setViewsReach] = useState('');
  const [like, setLike] = useState('');
  const [comment, setComment] = useState('');
  const [share, setShare] = useState('');
  const [save, setSave] = useState('');
  const [completionRate, setCompletionRate] = useState('');
  const [avgDuration, setAvgDuration] = useState('');
  const [followerIncr, setFollowerIncr] = useState('');

  // Mở lại / đổi ngày → prefill từ bản ghi đã có (nếu có).
  useEffect(() => {
    const t = existing?.traffic;
    setViewsReach(t?.viewsReach ? String(t.viewsReach) : '');
    setLike(t?.like ? String(t.like) : '');
    setComment(t?.comment ? String(t.comment) : '');
    setShare(t?.share ? String(t.share) : '');
    setSave(t?.save ? String(t.save) : '');
    setCompletionRate(t?.viewAllRate ? String(t.viewAllRate) : '');
    setAvgDuration(t?.avgViewDuration ? String(t.avgViewDuration) : '');
    setFollowerIncr(t?.followerIncr ? String(t.followerIncr) : '');
  }, [existing?.id, date]);

  const toDdmmyyyyLocal = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const intF = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0;
  const numF = (s: string) => parseFloat(s.replace(/[^\d.]/g, '')) || 0;
  const canSubmit = viewsReach.trim() !== '';

  const buildRec = (dateStr: string): BrandDayRecord => ({
    date: dateStr,
    viewsReach: intF(viewsReach),
    like: intF(like), comment: intF(comment), share: intF(share),
    save: intF(save),
    completionRate: numF(completionRate), avgDuration: numF(avgDuration), followerIncr: intF(followerIncr),
    videoCount: 0,
  });

  const submit = () => {
    if (!canSubmit) return;
    const dateStr = toDdmmyyyyLocal(date);
    // Đã có báo cáo cho ngày này → không gửi ngay, hỏi người dùng trước.
    if (findReportOnDate(dateStr)) { setDupDate(dateStr); return; }
    onSubmit(channel.name, buildRec(dateStr));
  };

  return (
    <>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className={`h-1.5 bg-gradient-to-r ${accent.bar}`} />
        <div className="p-6 overflow-y-auto">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isEdit ? 'Sửa báo cáo traffic ngày' : 'Báo cáo traffic ngày'}</p>
              <h2 className="text-lg font-bold text-slate-900 font-display truncate" title={channel.name}>{channel.name}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 flex-shrink-0">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="mb-5">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Ngày báo cáo</label>
            <input type="date" value={date} max={maxDate} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-slate-50/30" />
          </div>

          <div className={`rounded-xl p-4 mb-5 ${accent.soft}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`material-symbols-outlined text-[18px] ${accent.text}`}>analytics</span>
              <span className="text-xs font-bold text-slate-700">Chỉ số traffic (nhập tay)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <NumField label="Views / Reach" value={viewsReach} onChange={setViewsReach} required />
              <NumField label="Like (reactions)" value={like} onChange={setLike} />
              <NumField label="Comment" value={comment} onChange={setComment} />
              <NumField label="Share" value={share} onChange={setShare} />
              <NumField label="Lưu (Save)" value={save} onChange={setSave} />
              <NumField label="Follow+" value={followerIncr} onChange={setFollowerIncr} />
              <NumField label="Xem hết (%)" value={completionRate} onChange={setCompletionRate} decimal />
              <NumField label="TG xem (s)" value={avgDuration} onChange={setAvgDuration} decimal />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-amber-600 font-medium">{!canSubmit ? 'Điền ô Views/Reach để gửi.' : ''}</p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Hủy</button>
              <button onClick={submit} disabled={!canSubmit}
                className={`flex items-center gap-1.5 px-5 py-2 text-white text-xs font-bold rounded-xl shadow-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${accent.btn}`}>
                <span className="material-symbols-outlined text-[16px]">{isEdit ? 'save' : 'send'}</span>
                {isEdit ? 'Cập nhật' : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      open={!!dupDate}
      danger={false}
      title="Ngày này đã có báo cáo"
      message={`Page "${channel.name}" đã có báo cáo ngày ${dupDate}. Bạn có muốn sửa (ghi đè) số liệu ngày này không? Nếu không, hãy chọn ngày khác.`}
      confirmText="Sửa số liệu"
      cancelText="Chọn ngày khác"
      onConfirm={() => { const d = dupDate; setDupDate(null); if (d) onSubmit(channel.name, buildRec(d)); }}
      onCancel={() => setDupDate(null)}
    />
    </>
  );
}

/* Ô tên page: gọn (1 dòng, cắt gọn) mặc định; khi hover vào HÀNG thì tên tự xuống dòng
   hiện đầy đủ, đẩy các hàng dưới xuống — không đè, không cần tooltip nổi. */
function PageNameCell({ name, mine }: { name: string; mine: boolean }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="font-bold text-slate-800 max-w-[240px] truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
        {name}
      </span>
      {mine && (
        <span className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">Của bạn</span>
      )}
    </div>
  );
}

/* Ô nhập số nhập tay */
function NumField({ label, value, onChange, required, decimal }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; decimal?: boolean;
}) {
  const empty = value.trim() === '';
  const clean = (s: string) => (decimal ? s.replace(/[^\d.]/g, '') : s.replace(/\D/g, ''));
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
        {label}{required && <span className="text-rose-500"> *</span>}
      </label>
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        placeholder="Nhập số..."
        onChange={(e) => onChange(clean(e.target.value))}
        className={`w-full px-3 py-2 text-sm text-right font-mono rounded-lg border outline-none transition-colors ${
          required && empty ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white'
        } focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027]`}
      />
    </div>
  );
}
