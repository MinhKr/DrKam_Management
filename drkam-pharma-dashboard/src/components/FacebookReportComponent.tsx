import React, { useState, useEffect } from 'react';
import { DailyReport, AffiliateChannel, UserSession, FbPage } from '../types';
import ConfirmDialog from './ConfirmDialog';

type ConfirmState = { message: string; onConfirm: () => void } | null;

export type BrandDayRecord = {
  date: string; // dd/mm/yyyy
  viewsReach: number; like: number; comment: number; share: number;
  save: number; completionRate: number; avgDuration: number; followerIncr: number;
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
  view: 'koc' | 'brand'; // chọn từ dropdown sidebar
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
   VIEW 2 — KÊNH THƯƠNG HIỆU: mỗi page 1 khối riêng, báo cáo theo NGÀY qua modal
   ════════════════════════════════════════════════════════════════ */
function BrandView({ reports, channels, session, onDeleteReport, onReportDay, onUpdateChannel }: FacebookReportComponentProps) {
  const fbBrandChannels = channels.filter(
    (c) => c.platform === 'Facebook' && c.channelType === 'Brand' && c.tracking.trafficActive,
  );

  const isoToday = () => new Date().toISOString().slice(0, 10);
  const toDdmmyyyy = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const toIso = (d: string) => { const [dd, mm, yy] = d.split('/'); return `${yy}-${mm}-${dd}`; };
  const todayDdmmyyyy = toDdmmyyyy(isoToday());

  const [modal, setModal] = useState<{ channel: AffiliateChannel; date: string } | null>(null);
  const [notification, setNotification] = useState('');
  const [dialog, setDialog] = useState<ConfirmState>(null);
  const notify = (m: string) => { setNotification(m); setTimeout(() => setNotification(''), 4000); };

  // Báo cáo của 1 kênh (mới → cũ)
  const reportsOf = (ch: AffiliateChannel) =>
    reports
      .filter((r) => r.channelName === ch.name && (r.channelType === 'Facebook - Thương hiệu' || !!r.traffic))
      .sort((a, b) => toIso(b.date).localeCompare(toIso(a.date)));
  const reportedToday = (ch: AffiliateChannel) => reportsOf(ch).some((r) => r.date === todayDdmmyyyy);

  const handleSubmit = (channelName: string, rec: BrandDayRecord) => {
    onReportDay(channelName, rec);
    setModal(null);
    notify(`Đã lưu báo cáo ngày ${rec.date}!`);
  };

  // 2 màu nhận diện để TÁCH BIỆT 2 page (đỏ DrKam & teal)
  const ACCENTS = [
    { bar: 'from-[#D32027] to-[#B70F1B]', soft: 'bg-rose-50', text: 'text-[#D32027]', btn: 'bg-[#D32027] hover:bg-[#B70F1B]' },
    { bar: 'from-[#0F766E] to-[#115E59]', soft: 'bg-teal-50', text: 'text-teal-700', btn: 'bg-teal-600 hover:bg-teal-700' },
  ];

  return (
    <div className="space-y-6">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#627D47] text-white px-5 py-4 rounded-xl shadow-lg border border-green-600 flex items-center gap-3">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-2xl">verified</span>
            <span>Facebook — Kênh thương hiệu</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Báo cáo traffic <span className="font-semibold text-blue-600">theo từng page, mỗi ngày</span> (thường 17:00). 6 chỉ số tự lấy từ Facebook; Views &amp; Lưu nhập tay.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200/60 rounded-xl soft-shadow text-slate-600 self-start">
          <span className="material-symbols-outlined text-[18px] text-[#D32027]">event</span>
          <span className="text-sm font-bold">Hôm nay {todayDdmmyyyy}</span>
        </div>
      </div>

      {fbBrandChannels.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow py-12 text-center text-slate-400 font-medium px-6">
          Chưa có kênh Facebook thương hiệu nào bật theo dõi traffic. Tạo kênh Facebook (Brand) ở mục <b>Quản lý kênh</b>.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {fbBrandChannels.map((ch, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            const list = reportsOf(ch);
            const latest = list[0];
            const done = reportedToday(ch);
            const linked = /^\d+$/.test(ch.auditId);
            const fmt = (n: number | undefined) => (n != null ? n.toLocaleString('vi-VN') : '—');
            return (
              <section key={ch.id} className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden flex flex-col">
                <div className={`h-1.5 bg-gradient-to-r ${accent.bar}`} />

                {/* Nhận diện page */}
                <div className="p-5 flex items-start gap-3 border-b border-slate-100">
                  <div className={`w-12 h-12 rounded-xl ${accent.soft} ${accent.text} flex items-center justify-center flex-shrink-0`}>
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-slate-900 font-display text-base truncate" title={ch.name}>{ch.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] text-slate-400">Phụ trách {ch.managerName}</span>
                      {linked ? (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ID {ch.auditId}</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">chưa gắn Page ID</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trạng thái hôm nay + CTA */}
                <div className="px-5 py-4 flex items-center justify-between gap-3 bg-slate-50/40">
                  <div className="flex items-center gap-2">
                    {done ? (
                      <>
                        <span className="material-symbols-outlined text-green-600 text-xl">task_alt</span>
                        <span className="text-sm font-semibold text-green-700">Đã báo cáo hôm nay</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-amber-500 text-xl">pending_actions</span>
                        <span className="text-sm font-semibold text-amber-600">Chưa báo cáo hôm nay</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setModal({ channel: ch, date: isoToday() })}
                    className={`flex items-center gap-1.5 px-4 py-2 text-white font-bold text-xs rounded-xl shadow-soft transition-colors ${accent.btn}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{done ? 'edit' : 'add_chart'}</span>
                    <span>{done ? 'Cập nhật' : 'Báo cáo hôm nay'}</span>
                  </button>
                </div>

                {/* Tóm tắt ngày gần nhất */}
                {latest?.traffic && (
                  <div className="px-5 py-3 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gần nhất · {latest.date}</p>
                    <div className="grid grid-cols-4 gap-2">
                      <Stat label="Views" value={fmt(latest.traffic.viewsReach)} accent={accent.text} />
                      <Stat label="Like" value={fmt(latest.traffic.like)} />
                      <Stat label="Cmt" value={fmt(latest.traffic.comment)} />
                      <Stat label="Share" value={fmt(latest.traffic.share)} />
                      <Stat label="Lưu" value={fmt(latest.traffic.save)} accent={accent.text} />
                      <Stat label="Xem hết" value={(latest.traffic.viewAllRate ?? 0) + '%'} />
                      <Stat label="TG xem" value={(latest.traffic.avgViewDuration ?? 0) + 's'} />
                      <Stat label="Follow+" value={fmt(latest.traffic.followerIncr)} />
                    </div>
                  </div>
                )}

                {/* Lịch sử */}
                <div className="flex-1 flex flex-col">
                  <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">history</span>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lịch sử ({list.length})</h3>
                  </div>
                  <div className="overflow-y-auto max-h-[260px]">
                    {list.length === 0 ? (
                      <p className="py-8 text-center text-slate-400 text-sm">Chưa có báo cáo nào.</p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-100 text-slate-400 uppercase tracking-wider">
                          <tr>
                            <th className="px-5 py-2">Ngày</th>
                            <th className="px-2 py-2 text-right">Views</th>
                            <th className="px-2 py-2 text-right">Tương tác</th>
                            <th className="px-2 py-2 text-right">Follow+</th>
                            <th className="px-3 py-2 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {list.map((r) => {
                            const t = r.traffic;
                            const eng = (t?.like || 0) + (t?.comment || 0) + (t?.share || 0);
                            return (
                              <tr key={r.id} className="hover:bg-slate-50/50">
                                <td className="px-5 py-2 font-medium text-slate-700 whitespace-nowrap">{r.date}</td>
                                <td className="px-2 py-2 text-right font-mono text-slate-700">{fmt(t?.viewsReach)}</td>
                                <td className="px-2 py-2 text-right font-mono text-slate-500">{eng.toLocaleString('vi-VN')}</td>
                                <td className="px-2 py-2 text-right font-mono text-green-700">{fmt(t?.followerIncr)}</td>
                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                  <button onClick={() => setModal({ channel: ch, date: toIso(r.date) })} className="text-slate-300 hover:text-blue-600 transition-colors align-middle" title="Sửa">
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                  </button>
                                  <button onClick={() => setDialog({ message: `Xóa báo cáo ngày ${r.date} của "${ch.name}"?`, onConfirm: () => onDeleteReport(r.id) })} className="text-slate-300 hover:text-rose-600 transition-colors align-middle ml-1" title="Xóa">
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Page ID */}
                <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2 bg-slate-50/30">
                  <span className="material-symbols-outlined text-slate-400 text-[14px]">key</span>
                  <span className="text-[11px] text-slate-500">Page ID</span>
                  <EditablePageId value={ch.auditId} onSave={(v) => onUpdateChannel(ch.id, { auditId: v })} />
                </div>
              </section>
            );
          })}
        </div>
      )}

      {modal && (
        <BrandReportModal
          channel={modal.channel}
          initialDate={modal.date}
          accentIndex={fbBrandChannels.findIndex((c) => c.id === modal.channel.id) % 2}
          existing={reportsOf(modal.channel).find((r) => r.date === toDdmmyyyy(modal.date))}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
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

/* Modal báo cáo traffic 1 ngày cho 1 page: tự lấy 6 chỉ số, bắt nhập Views & Lưu */
function BrandReportModal({ channel, initialDate, accentIndex, existing, onClose, onSubmit }: {
  channel: AffiliateChannel;
  initialDate: string;
  accentIndex: number;
  existing?: DailyReport;
  onClose: () => void;
  onSubmit: (channelName: string, rec: BrandDayRecord) => void;
}) {
  const accent = accentIndex === 1
    ? { btn: 'bg-teal-600 hover:bg-teal-700', text: 'text-teal-700', soft: 'bg-teal-50', bar: 'from-[#0F766E] to-[#115E59]' }
    : { btn: 'bg-[#D32027] hover:bg-[#B70F1B]', text: 'text-[#D32027]', soft: 'bg-rose-50', bar: 'from-[#D32027] to-[#B70F1B]' };
  const maxDate = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(initialDate);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [postsScanned, setPostsScanned] = useState<number | null>(null);
  // Chỉ số tự động (page-level, cả ngày cả kênh) — điền sẵn, SỬA ĐƯỢC
  const [viewsReach, setViewsReach] = useState('');
  const [like, setLike] = useState('');
  const [comment, setComment] = useState('');
  const [share, setShare] = useState('');
  const [completionRate, setCompletionRate] = useState('');
  const [avgDuration, setAvgDuration] = useState('');
  const [followerIncr, setFollowerIncr] = useState('');
  // Bắt buộc nhập tay
  const [save, setSave] = useState('');

  // Sửa bản ghi đã có → prefill Lưu (giữ giá trị cũ)
  useEffect(() => {
    if (existing?.traffic) setSave(existing.traffic.save ? String(existing.traffic.save) : '');
  }, [existing]);

  // Tự lấy số cả-ngày-cả-kênh mỗi khi đổi ngày / bấm thử lại
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetch(`/api/sync-facebook?pageId=${encodeURIComponent(channel.auditId)}&from=${date}&to=${date}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!alive) return;
        if (!ok) throw new Error(d.error || 'Lỗi không rõ');
        const rec = (d.records || [])[0] || {};
        setViewsReach(String(rec.viewsReach ?? 0));
        setLike(String(rec.like ?? 0));
        setComment(String(rec.comment ?? 0));
        setShare(String(rec.share ?? 0));
        setCompletionRate(String(rec.completionRate ?? 0));
        setAvgDuration(String(rec.avgDuration ?? 0));
        setFollowerIncr(String(rec.followerIncr ?? 0));
        setPostsScanned(typeof d.postsScanned === 'number' ? d.postsScanned : null);
        setLoading(false);
      })
      .catch((e) => { if (!alive) return; setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
    return () => { alive = false; };
  }, [date, channel.auditId, refresh]);

  const toDdmmyyyy = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const intF = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0;
  const numF = (s: string) => parseFloat(s.replace(/[^\d.]/g, '')) || 0;
  const canSubmit = !loading && !error && save.trim() !== '';

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(channel.name, {
      date: toDdmmyyyy(date),
      viewsReach: intF(viewsReach),
      like: intF(like), comment: intF(comment), share: intF(share),
      save: intF(save),
      completionRate: numF(completionRate), avgDuration: numF(avgDuration), followerIncr: intF(followerIncr),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className={`h-1.5 bg-gradient-to-r ${accent.bar}`} />
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Báo cáo traffic ngày</p>
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

          {/* Chỉ số tự động — cả ngày cả kênh, sửa được nếu cần */}
          <div className={`rounded-xl p-4 mb-5 ${accent.soft}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`material-symbols-outlined text-[18px] ${accent.text} ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'cloud_done'}</span>
              <span className="text-xs font-bold text-slate-700">{loading ? 'Đang lấy số cả ngày từ Facebook...' : 'Số tự động (cả ngày cả kênh) — sửa được nếu cần'}</span>
            </div>
            {error ? (
              <div className="text-xs bg-white/70 rounded-lg p-3">
                <p className="font-semibold text-rose-600 mb-1">⚠️ Không lấy được số tự động</p>
                <p className="text-rose-500 mb-2 break-words">{error}</p>
                <button onClick={() => setRefresh((x) => x + 1)} className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-lg text-[11px]">Thử lại</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <NumField label="Views (cả ngày)" value={viewsReach} onChange={setViewsReach} disabled={loading} />
                  <NumField label="Like (reactions)" value={like} onChange={setLike} disabled={loading} />
                  <NumField label="Follow+" value={followerIncr} onChange={setFollowerIncr} disabled={loading} />
                  <NumField label="Comment" value={comment} onChange={setComment} disabled={loading} />
                  <NumField label="Share" value={share} onChange={setShare} disabled={loading} />
                  <NumField label="Xem hết (%)" value={completionRate} onChange={setCompletionRate} disabled={loading} decimal />
                  <NumField label="TG xem (s)" value={avgDuration} onChange={setAvgDuration} disabled={loading} decimal />
                </div>
                {!loading && postsScanned !== null && (
                  <p className="text-[11px] mt-2 text-slate-500">
                    {postsScanned === 0
                      ? 'Hôm nay chưa đăng bài → Comment/Share = 0; Views/Like/Follow vẫn tính cả ngày.'
                      : `Comment & Share lấy từ ${postsScanned} bài đăng trong ngày; còn lại tính cả ngày cả kênh.`}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Bắt buộc nhập tay */}
          <div className="mb-5">
            <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-amber-500">edit</span>
              Nhập tay — bắt buộc
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Lưu (Save)" value={save} onChange={setSave} required />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-amber-600 font-medium">
              {!loading && !error && !canSubmit ? 'Điền ô Lưu để gửi.' : ''}
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Hủy</button>
              <button onClick={submit} disabled={!canSubmit}
                className={`flex items-center gap-1.5 px-5 py-2 text-white text-xs font-bold rounded-xl shadow-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${accent.btn}`}>
                <span className="material-symbols-outlined text-[16px]">send</span>
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Ô tóm tắt 1 chỉ số (card mỗi page) */
function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide truncate">{label}</p>
      <p className={`text-sm font-bold font-mono ${accent || 'text-slate-700'}`}>{value}</p>
    </div>
  );
}

/* Ô số trong modal: auto điền sẵn (sửa được) hoặc bắt buộc nhập tay (required) */
function NumField({ label, value, onChange, disabled, required, decimal }: {
  label: string; value: string; onChange: (v: string) => void;
  disabled?: boolean; required?: boolean; decimal?: boolean;
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
        value={disabled ? (value || '…') : value}
        disabled={disabled}
        placeholder="Nhập số..."
        onChange={(e) => onChange(clean(e.target.value))}
        className={`w-full px-3 py-2 text-sm text-right font-mono rounded-lg border outline-none transition-colors disabled:opacity-60 disabled:cursor-wait ${
          required && empty ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white'
        } focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027]`}
      />
    </div>
  );
}

/* Ô nhập Page ID Facebook cho 1 kênh thương hiệu */
function EditablePageId({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  const commit = () => { const t = v.trim(); if (t !== value) onSave(t); };
  return (
    <input
      type="text"
      value={v}
      placeholder="Page ID (số)..."
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className="w-44 px-2 py-1 text-xs font-mono rounded-md border border-slate-200 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027]"
    />
  );
}
