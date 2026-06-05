import React, { useState } from 'react';
import { DailyReport, AffiliateChannel, UserSession, FbPage } from '../types';
import ConfirmDialog from './ConfirmDialog';

type ConfirmState = { message: string; onConfirm: () => void } | null;

interface FacebookReportComponentProps {
  reports: DailyReport[];
  channels: AffiliateChannel[];
  session: UserSession;
  fbPages: FbPage[];
  onAddReport: (newReport: DailyReport) => void;
  onDeleteReport: (reportId: string) => void;
  onAddFbPage: (page: FbPage) => void;
  onDeleteFbPage: (id: string) => void;
}

const numFormat = (val: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(val)
    .replace('₫', 'đ');

/**
 * Mục Facebook — 2 chế độ xem toàn màn hình:
 *  • Kênh KOC inhouse  → chia theo ID Shopee (mỗi thành viên): kênh FB + doanh thu (nhập tay)
 *  • Kênh thương hiệu  → chỉ TRAFFIC (8 chỉ số, không doanh thu)
 */
export default function FacebookReportComponent(props: FacebookReportComponentProps) {
  const [view, setView] = useState<'koc' | 'brand'>('koc');

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 text-slate-800">
      <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-2xl p-1.5 soft-shadow w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setView('koc')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            view === 'koc' ? 'bg-[#D32027] text-white shadow-soft' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">groups</span>
          <span>Kênh KOC inhouse</span>
        </button>
        <button
          type="button"
          onClick={() => setView('brand')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            view === 'brand' ? 'bg-[#D32027] text-white shadow-soft' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>Kênh thương hiệu</span>
        </button>
      </div>

      {view === 'koc' ? <KocInhouseView {...props} /> : <BrandView {...props} />}
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
}: FacebookReportComponentProps) {
  // Mỗi "nhóm" = 1 ID Shopee KOC inhouse (1 thành viên)
  const idGroups = channels.filter(
    (c) =>
      c.platform === 'Facebook' &&
      (c.channelType === 'Real KOC' || c.channelType === 'AI KOC') &&
      c.tracking.revenueActive,
  );

  const isAdmin = session.role === 'Admin';
  const isMine = (g: AffiliateChannel) => g.managerName === session.name;
  const canEdit = (g: AffiliateChannel) => isAdmin || isMine(g);

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

  // ── Form thêm báo cáo doanh thu ──
  const [showReportForm, setShowReportForm] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [revenueStr, setRevenueStr] = useState('');

  // ── Form thêm fanpage ──
  const [showPageForm, setShowPageForm] = useState(false);
  const [pageName, setPageName] = useState('');

  const [notification, setNotification] = useState('');
  const [dialog, setDialog] = useState<ConfirmState>(null);
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleAddReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    const rev = parseInt(revenueStr.replace(/\D/g, ''), 10);
    if (isNaN(rev) || rev < 0) {
      alert('Vui lòng nhập doanh thu hợp lệ.');
      return;
    }
    const [y, m, d] = date.split('-');
    const formattedDate = y && m && d ? `${d}/${m}/${y}` : date;
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
    });
    setRevenueStr('');
    setShowReportForm(false);
    notify('Đã lưu doanh thu Shopee!');
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

  if (idGroups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow py-12 text-center text-slate-400 font-medium px-6">
        Chưa có ID Shopee KOC inhouse nào. Admin sẽ gắn ID Shopee cho từng thành viên (sẽ bổ sung sau).
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
          <span className="material-symbols-outlined text-blue-600 text-2xl">groups</span>
          <span>Facebook — KOC inhouse (theo ID Shopee)</span>
        </h1>
      </div>

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
                <span className="material-symbols-outlined text-blue-600 text-xl">dns</span>
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
                      <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[18px]">public</span>
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
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   VIEW 2 — KÊNH THƯƠNG HIỆU (chỉ traffic, không doanh thu)
   ════════════════════════════════════════════════════════════════ */
function BrandView({ reports, channels, session, onAddReport, onDeleteReport }: FacebookReportComponentProps) {
  const fbBrandChannels = channels.filter(
    (c) => c.platform === 'Facebook' && c.channelType === 'Brand' && c.tracking.trafficActive,
  );

  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [channelName, setChannelName] = useState(fbBrandChannels[0]?.name || '');
  const [views, setViews] = useState('');
  const [comments, setComments] = useState('');
  const [likes, setLikes] = useState('');
  const [shares, setShares] = useState('');
  const [saves, setSaves] = useState('');
  const [completionRate, setCompletionRate] = useState('');
  const [avgDuration, setAvgDuration] = useState('');
  const [followers, setFollowers] = useState('');
  const [note, setNote] = useState('');
  const [notification, setNotification] = useState('');
  const [dialog, setDialog] = useState<ConfirmState>(null);

  const selectedChannel = fbBrandChannels.find((c) => c.name === channelName);
  const numInt = (v: string) => (v ? parseInt(v, 10) : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName) {
      alert('Vui lòng chọn kênh Facebook thương hiệu.');
      return;
    }
    const [y, m, d] = date.split('-');
    const formattedDate = y && m && d ? `${d}/${m}/${y}` : date;

    onAddReport({
      id: 'r_fbbrand_' + Date.now(),
      date: formattedDate,
      channelName,
      channelType: 'Facebook - Thương hiệu',
      revenue: 0,
      views: views ? numInt(views) : null,
      interactions: numInt(likes) + numInt(comments) + numInt(shares) || null,
      source: session.role === 'Admin' ? 'Admin' : 'Nhân viên',
      isEditable: true,
      traffic: {
        viewsReach: numInt(views),
        comment: numInt(comments),
        like: numInt(likes),
        share: numInt(shares),
        save: numInt(saves),
        viewAllRate: completionRate ? parseFloat(completionRate) : 0,
        avgViewDuration: avgDuration ? parseFloat(avgDuration) : 0,
        followerIncr: numInt(followers),
      },
      note: note.trim() || null,
    });

    setViews(''); setComments(''); setLikes(''); setShares(''); setSaves('');
    setCompletionRate(''); setAvgDuration(''); setFollowers(''); setNote('');
    setShowForm(false);
    setNotification('Đã lưu chỉ số traffic cho kênh thương hiệu!');
    setTimeout(() => setNotification(''), 4000);
  };

  const fbNames = new Set(fbBrandChannels.map((c) => c.name));
  const brandReports = reports.filter((r) => fbNames.has(r.channelName) || r.channelType === 'Facebook - Thương hiệu');

  return (
    <div className="space-y-6">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#627D47] text-white px-5 py-4 rounded-xl shadow-lg border border-green-600 flex items-center gap-3">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-2xl">verified</span>
            <span>Facebook — Kênh thương hiệu</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi <span className="font-semibold text-blue-600">8 chỉ số traffic</span> (không có doanh thu). Nhập tay theo ngày.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          disabled={fbBrandChannels.length === 0}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs rounded-xl shadow-soft transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            showForm ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-[#D32027] hover:bg-[#B70F1B] text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add_circle'}</span>
          <span>{showForm ? 'Đóng form' : 'Thêm chỉ số traffic'}</span>
        </button>
      </div>

      {showForm && (
        <section className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200/60 soft-shadow">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 font-display">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">add_circle</span>
            <span>Thêm chỉ số traffic (Facebook thương hiệu)</span>
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Ngày báo cáo</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] outline-none text-sm font-medium bg-slate-50/30"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Kênh thương hiệu</label>
                <select
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] outline-none text-sm bg-slate-50/30 cursor-pointer"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                >
                  {fbBrandChannels.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {selectedChannel && (
                  <p className="text-[11px] text-slate-400 mt-1">Phụ trách: {selectedChannel.managerName}</p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">analytics</span>
                <span>Chỉ số traffic</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <TrafficField label="Views/Reach" placeholder="VD: 50000" value={views} onChange={setViews} />
                <TrafficField label="Comment" placeholder="VD: 15" value={comments} onChange={setComments} />
                <TrafficField label="Like" placeholder="VD: 150" value={likes} onChange={setLikes} />
                <TrafficField label="Share" placeholder="VD: 5" value={shares} onChange={setShares} />
                <TrafficField label="Lưu" placeholder="VD: 20" value={saves} onChange={setSaves} />
                <TrafficField label="Tỷ lệ xem hết (%)" placeholder="VD: 45.2" step="0.1" value={completionRate} onChange={setCompletionRate} />
                <TrafficField label="TG xem TB (giây)" placeholder="VD: 18.2" step="0.1" value={avgDuration} onChange={setAvgDuration} />
                <TrafficField label="Số follow tăng" placeholder="VD: 45" value={followers} onChange={setFollowers} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Ghi chú (tùy chọn)</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] outline-none text-sm bg-slate-50/30"
                placeholder="VD: bài viral, chiến dịch..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-4">
              <p className="text-xs text-slate-400 italic">* Kênh thương hiệu chỉ theo dõi traffic, không nhập doanh thu.</p>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-6 py-2.5 bg-[#D32027] hover:bg-[#B70F1B] text-white font-bold text-xs rounded-xl shadow-soft cursor-pointer">Lưu chỉ số</button>
              </div>
            </div>
          </form>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-2xl font-bold">list_alt</span>
          <h2 className="text-lg font-bold text-slate-900 font-display">Traffic đã nhập</h2>
        </div>
        {fbBrandChannels.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium px-6">
            Chưa có kênh Facebook thương hiệu nào bật theo dõi traffic. Hãy tạo kênh Facebook (Brand) ở mục <b>Quản lý kênh</b>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-4">Ngày</th>
                  <th className="px-5 py-4">Kênh</th>
                  <th className="px-5 py-4 text-right">Views/Reach</th>
                  <th className="px-5 py-4 text-right">Like</th>
                  <th className="px-5 py-4 text-right">Comment</th>
                  <th className="px-5 py-4 text-right">Share</th>
                  <th className="px-5 py-4 text-right">Lưu</th>
                  <th className="px-5 py-4 text-right">Xem hết %</th>
                  <th className="px-5 py-4 text-right">TG xem</th>
                  <th className="px-5 py-4 text-right">Follow+</th>
                  <th className="px-5 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {brandReports.length === 0 ? (
                  <tr><td colSpan={11} className="py-12 text-center text-slate-400 font-medium">Chưa có dữ liệu. Bấm “Thêm chỉ số traffic” để nhập.</td></tr>
                ) : (
                  brandReports.map((r) => {
                    const t = r.traffic;
                    const fmt = (n: number | undefined) => (n != null ? n.toLocaleString('vi-VN') : '-');
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 text-slate-600 font-medium">{r.date}</td>
                        <td className="px-5 py-4 font-bold text-[#D32027] max-w-[220px] truncate" title={r.channelName}>{r.channelName}</td>
                        <td className="px-5 py-4 text-right font-mono text-slate-700">{fmt(t?.viewsReach)}</td>
                        <td className="px-5 py-4 text-right font-mono text-slate-500">{fmt(t?.like)}</td>
                        <td className="px-5 py-4 text-right font-mono text-slate-500">{fmt(t?.comment)}</td>
                        <td className="px-5 py-4 text-right font-mono text-slate-500">{fmt(t?.share)}</td>
                        <td className="px-5 py-4 text-right font-mono text-slate-500">{fmt(t?.save)}</td>
                        <td className="px-5 py-4 text-right font-mono text-slate-500">{t?.viewAllRate != null ? t.viewAllRate + '%' : '-'}</td>
                        <td className="px-5 py-4 text-right font-mono text-slate-500">{t?.avgViewDuration != null ? t.avgViewDuration + 's' : '-'}</td>
                        <td className="px-5 py-4 text-right font-mono text-green-700 font-semibold">{fmt(t?.followerIncr)}</td>
                        <td className="px-5 py-4 text-center">
                          <button className="text-slate-400 hover:text-rose-600 transition-colors" title="Xóa bản ghi"
                            onClick={() => setDialog({ message: `Xóa traffic ngày ${r.date} của kênh "${r.channelName}"?`, onConfirm: () => onDeleteReport(r.id) })}>
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
    </div>
  );
}

/* Ô nhập 1 chỉ số traffic */
function TrafficField({
  label,
  placeholder,
  value,
  onChange,
  step,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        step={step}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#D32027] outline-none bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
