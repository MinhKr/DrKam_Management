import React, { useState, useEffect } from 'react';
import { DailyReport, AffiliateChannel, UserSession } from '../types';
import ConfirmDialog from './ConfirmDialog';
import BrandTrafficDashboard from './BrandTrafficDashboard';
import KocRevenueDashboard from './KocRevenueDashboard';

type ConfirmState = { message: string; onConfirm: () => void } | null;

// Bản ghi 1 ngày của 1 kênh TikTok (nhập tay toàn bộ).
export type TikTokDayRecord = {
  date: string; // dd/mm/yyyy
  revenue: number;
  traffic: {
    viewsReach: number; comment: number; like: number; share: number;
    save: number; viewAllRate: number; avgViewDuration: number; followerIncr: number;
  } | null;
};

export type TikTokView = 'brand' | 'real-koc' | 'ai-koc';

interface TikTokReportComponentProps {
  reports: DailyReport[];
  channels: AffiliateChannel[];
  session: UserSession;
  onReportDay: (channelName: string, channelType: string, rec: TikTokDayRecord) => void;
  onDeleteReport: (reportId: string) => void;
  onAddChannel: (chan: AffiliateChannel) => void; // người dùng tự thêm kênh
  view: TikTokView;
}

const numFormat = (val: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val).replace('₫', 'đ');
const intFmt = (n: number) => n.toLocaleString('vi-VN');

const VIEW_CONFIG: Record<TikTokView, {
  title: string; subtitle: string; icon: string; channelType: AffiliateChannel['channelType']; hasTraffic: boolean; reportType: string;
}> = {
  'brand':    { title: 'TikTok — Kênh thương hiệu',          subtitle: 'Kênh gắn shop',       icon: 'verified',  channelType: 'Brand',    hasTraffic: true,  reportType: 'TikTok - Thương hiệu' },
  'real-koc': { title: 'TikTok — KOC inhouse · Người thật',  subtitle: 'Kênh không gắn shop', icon: 'face',      channelType: 'Real KOC', hasTraffic: false, reportType: 'TikTok - KOC' },
  'ai-koc':   { title: 'TikTok — KOC inhouse · Kênh AI',     subtitle: 'Kênh không gắn shop', icon: 'smart_toy', channelType: 'AI KOC',   hasTraffic: false, reportType: 'TikTok - KOC' },
};

// Ngày hôm nay theo MÚI GIỜ MÁY (GMT+7 ở VN), KHÔNG dùng toISOString() vì nó trả UTC
// → tránh lệch 1 ngày trong khung 00:00–07:00 sáng giờ Việt Nam.
const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const toDdmmyyyy = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const toIso = (d: string) => { const [dd, mm, yy] = d.split('/'); return `${yy}-${mm}-${dd}`; };
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

type Agg = {
  days: number; revenue: number; viewsReach: number; comment: number; like: number;
  share: number; save: number; followerIncr: number; viewAllRate: number; avgViewDuration: number;
};
function aggregate(rs: DailyReport[]): Agg {
  const traf = rs.map((r) => r.traffic).filter(Boolean) as NonNullable<DailyReport['traffic']>[];
  const sumT = (f: (t: NonNullable<DailyReport['traffic']>) => number) => traf.reduce((s, t) => s + (f(t) || 0), 0);
  const avgT = (f: (t: NonNullable<DailyReport['traffic']>) => number) => (traf.length ? sumT(f) / traf.length : 0);
  return {
    days: rs.length,
    revenue: rs.reduce((s, r) => s + r.revenue, 0),
    viewsReach: sumT((t) => t.viewsReach), comment: sumT((t) => t.comment), like: sumT((t) => t.like),
    share: sumT((t) => t.share), save: sumT((t) => t.save), followerIncr: sumT((t) => t.followerIncr),
    viewAllRate: Math.round(avgT((t) => t.viewAllRate) * 10) / 10,
    avgViewDuration: Math.round(avgT((t) => t.avgViewDuration) * 10) / 10,
  };
}

const CATEGORY_BY_TYPE: Record<AffiliateChannel['channelType'], string> = {
  'Brand': 'Kênh thương hiệu',
  'Real KOC': 'KOC người thật',
  'AI KOC': 'KOC AI',
};

export default function TikTokReportComponent({
  reports, channels, session, onReportDay, onDeleteReport, onAddChannel, view,
}: TikTokReportComponentProps) {
  const cfg = VIEW_CONFIG[view];
  const list = channels.filter((c) => c.platform === 'TikTok' && c.channelType === cfg.channelType);
  const isMine = (ch: AffiliateChannel) => ch.managerName === session.name;
  const sorted = [...list].sort((a, b) => Number(isMine(b)) - Number(isMine(a)));

  const today = isoToday();
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
  const [dialog, setDialog] = useState<ConfirmState>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const notify = (m: string) => { setNotification(m); setTimeout(() => setNotification(''), 4000); };

  // Người dùng tự thêm kênh TikTok vào đúng mục đang xem (kênh dùng chung → cả team báo cáo).
  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newChannelName.trim();
    if (!id) { alert('Vui lòng nhập tên / ID kênh.'); return; }
    if (list.some((c) => c.name === id || c.auditId === id)) {
      alert(`Kênh "${id}" đã tồn tại trong mục này.`);
      return;
    }
    onAddChannel({
      id: 'ch_tt_' + Date.now(),
      name: id,
      brandCategory: CATEGORY_BY_TYPE[cfg.channelType],
      platform: 'TikTok',
      channelType: cfg.channelType,
      linkedShop: cfg.channelType === 'Brand',
      auditId: id,
      managerName: session.name,
      managerAvatar: session.avatar,
      status: 'Đang nuôi',
      tracking: { revenueActive: true, trafficActive: cfg.hasTraffic },
    });
    setNewChannelName('');
    setShowAddForm(false);
    notify('Đã thêm kênh mới!');
  };

  // Khối "Thêm kênh" — chỉ 1 nút bên phải; bấm mới hiện form.
  const addBar = (
    <div className="flex flex-col items-end gap-3">
      <button
        type="button"
        onClick={() => setShowAddForm((s) => !s)}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D32027] hover:bg-[#B70F1B] text-white font-bold text-xs rounded-xl shadow-soft transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">{showAddForm ? 'close' : 'add'}</span>
        <span>{showAddForm ? 'Đóng' : `Thêm kênh ${CATEGORY_BY_TYPE[cfg.channelType]}`}</span>
      </button>
      {showAddForm && (
        <form onSubmit={handleAddChannel} className="w-full bg-white border border-slate-200/60 rounded-2xl p-4 soft-shadow flex flex-wrap gap-2 items-center">
          <input
            type="text"
            autoFocus
            placeholder="Nhập tên / ID kênh TikTok (vd: drkamvn)..."
            className="flex-1 min-w-[220px] px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#D32027] bg-white"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
          />
          <button type="submit" className="px-4 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-xs font-bold rounded-lg">Lưu</button>
          <p className="w-full text-[11px] text-slate-400">Kênh vào đúng mục đang xem; cả team đều nhập báo cáo cho kênh này được.</p>
        </form>
      )}
    </div>
  );

  const inRange = (r: DailyReport) => { const iso = toIso(r.date); return iso >= range.from && iso <= range.to; };
  const reportsInRange = (ch: AffiliateChannel) =>
    reports
      .filter((r) => r.channelName === ch.name && r.channelType.startsWith('TikTok') && inRange(r))
      .sort((a, b) => toIso(b.date).localeCompare(toIso(a.date)));

  const rows = sorted.map((ch) => { const rs = reportsInRange(ch); return { ch, rs, agg: aggregate(rs) }; });
  const totals = aggregate(rows.flatMap((r) => r.rs));

  // Toàn bộ báo cáo TikTok của nhóm kênh đang xem (KHÔNG lọc ngày — dashboard tự lọc + cần dữ liệu kỳ trước để so sánh).
  const scopeNames = new Set(list.map((c) => c.name));
  const scopedReports = reports.filter((r) => scopeNames.has(r.channelName) && r.channelType.startsWith('TikTok'));

  const handleSubmit = (channelName: string, rec: TikTokDayRecord) => {
    onReportDay(channelName, cfg.reportType, rec);
    setModal(null);
    notify(`Đã lưu báo cáo ngày ${rec.date}!`);
  };

  const fmtRangeLabel = `${toDdmmyyyy(range.from)}${single ? '' : ' → ' + toDdmmyyyy(range.to)}`;

  // Lớp dùng lại cho header / footer / ô số
  const thNum = 'px-3 py-2.5 font-bold text-right whitespace-nowrap';
  const tdNum = 'px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap';

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 text-slate-800">
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
            <span className="material-symbols-outlined text-slate-900 text-2xl">music_note</span>
            <span>{cfg.title}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">{cfg.subtitle}</p>
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
                Cộng dồn {dayCount} ngày{cfg.hasTraffic ? ' · tỉ lệ là TB' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {addBar}

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow py-12 text-center text-slate-400 font-medium px-6">
          Chưa có kênh loại này. Bấm <b>“Thêm kênh”</b> ở trên để thêm — cả team đều nhập báo cáo cho kênh đó được.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full text-xs border-collapse ${cfg.hasTraffic ? 'min-w-[920px]' : 'min-w-[560px]'}`}>
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="sticky left-0 z-20 bg-slate-100 px-5 py-3 font-bold text-left border-b border-slate-200">Tên kênh</th>
                  <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Doanh thu</th>
                  {cfg.hasTraffic ? (
                    <>
                      <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Views/Reach</th>
                      <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Comment</th>
                      <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Like</th>
                      <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Share</th>
                      <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Lưu</th>
                      <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Xem hết</th>
                      <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>TG xem</th>
                      <th className={`${thNum} bg-slate-100 border-b border-slate-200`}>Follow+</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2.5 font-bold text-left bg-slate-100 border-b border-slate-200 whitespace-nowrap">Gần nhất</th>
                    </>
                  )}
                  <th className="px-3 py-3 bg-slate-100 border-b border-slate-200 text-center w-[1%]"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map(({ ch, rs, agg }) => {
                  const has = rs.length > 0;
                  const tracked = cfg.hasTraffic || ch.tracking.revenueActive;
                  const reportDate = single ? range.from : today;
                  const muted = !has ? 'text-slate-300' : '';
                  return (
                    <tr key={ch.id} className="group hover:bg-rose-50/40 transition-colors">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-rose-50 px-5 py-2.5 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-slate-800 truncate max-w-[200px]" title={ch.name}>{ch.name}</span>
                          {!tracked && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded whitespace-nowrap">Chưa bật DT</span>}
                        </div>
                      </td>
                      <td className={`${tdNum} font-bold ${has ? 'text-slate-900' : 'text-slate-300'}`}>{has ? numFormat(agg.revenue) : '—'}</td>
                      {cfg.hasTraffic ? (
                        <>
                          <td className={`${tdNum} ${has ? 'text-slate-700' : muted}`}>{has ? intFmt(agg.viewsReach) : '—'}</td>
                          <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? intFmt(agg.comment) : '—'}</td>
                          <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? intFmt(agg.like) : '—'}</td>
                          <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? intFmt(agg.share) : '—'}</td>
                          <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? intFmt(agg.save) : '—'}</td>
                          <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? agg.viewAllRate + '%' : '—'}</td>
                          <td className={`${tdNum} ${has ? 'text-slate-600' : muted}`}>{has ? agg.avgViewDuration + 's' : '—'}</td>
                          <td className={`${tdNum} ${has ? 'text-green-700' : muted}`}>{has ? '+' + intFmt(agg.followerIncr) : '—'}</td>
                        </>
                      ) : (
                        <>
                          <td className={`px-3 py-2.5 whitespace-nowrap tabular-nums ${has ? 'text-slate-500' : 'text-slate-300'}`}>{has ? rs[0].date : '—'}</td>
                        </>
                      )}
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => setModal({ channel: ch, date: reportDate })}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-[#D32027] transition-colors"
                          title={single ? `Báo cáo ngày ${toDdmmyyyy(range.from)}` : 'Báo cáo hôm nay'}
                        >
                          <span className="material-symbols-outlined text-[18px]">{has ? 'edit' : 'add_chart'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Dòng tổng — cộng dồn toàn bộ kênh trong khoảng đang lọc */}
              <tfoot>
                <tr className="text-[11px]">
                  <td className="sticky left-0 z-10 bg-slate-50 px-5 py-3 font-bold text-slate-500 uppercase tracking-wider border-t-2 border-slate-200">Tổng {rows.length} kênh</td>
                  <td className={`${tdNum} font-extrabold text-[#D32027] bg-slate-50 border-t-2 border-slate-200`}>{numFormat(totals.revenue)}</td>
                  {cfg.hasTraffic ? (
                    <>
                      <td className={`${tdNum} font-bold text-slate-700 bg-slate-50 border-t-2 border-slate-200`}>{intFmt(totals.viewsReach)}</td>
                      <td className={`${tdNum} font-bold text-slate-600 bg-slate-50 border-t-2 border-slate-200`}>{intFmt(totals.comment)}</td>
                      <td className={`${tdNum} font-bold text-slate-600 bg-slate-50 border-t-2 border-slate-200`}>{intFmt(totals.like)}</td>
                      <td className={`${tdNum} font-bold text-slate-600 bg-slate-50 border-t-2 border-slate-200`}>{intFmt(totals.share)}</td>
                      <td className={`${tdNum} font-bold text-slate-600 bg-slate-50 border-t-2 border-slate-200`}>{intFmt(totals.save)}</td>
                      <td className={`${tdNum} text-slate-300 bg-slate-50 border-t-2 border-slate-200`}>—</td>
                      <td className={`${tdNum} text-slate-300 bg-slate-50 border-t-2 border-slate-200`}>—</td>
                      <td className={`${tdNum} font-bold text-green-700 bg-slate-50 border-t-2 border-slate-200`}>+{intFmt(totals.followerIncr)}</td>
                    </>
                  ) : (
                    <>
                      <td className="bg-slate-50 border-t-2 border-slate-200"></td>
                    </>
                  )}
                  <td className="bg-slate-50 border-t-2 border-slate-200"></td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}

      {/* DASHBOARD — đặt ngay dưới bảng, dùng chung bộ lọc ngày ở trên */}
      {list.length > 0 && (
        cfg.hasTraffic
          ? <BrandTrafficDashboard reports={scopedReports} from={range.from} to={range.to} />
          : <KocRevenueDashboard reports={scopedReports} from={range.from} to={range.to} channelCount={list.length} />
      )}

      {modal && (
        <TikTokReportModal
          channel={modal.channel}
          initialDate={modal.date}
          hasTraffic={cfg.hasTraffic}
          existing={reportsInRange(modal.channel).find((r) => r.date === toDdmmyyyy(modal.date))
            || reports.find((r) => r.channelName === modal.channel.name && r.date === toDdmmyyyy(modal.date) && r.channelType.startsWith('TikTok'))}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={!!dialog}
        message={dialog?.message || ''}
        confirmText="Xóa"
        onConfirm={() => { dialog?.onConfirm(); setDialog(null); }}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MODAL — báo cáo tay 1 ngày cho 1 kênh TikTok
   ════════════════════════════════════════════════════════════════ */
function TikTokReportModal({ channel, initialDate, hasTraffic, existing, onClose, onSubmit }: {
  channel: AffiliateChannel;
  initialDate: string;
  hasTraffic: boolean;
  existing?: DailyReport;
  onClose: () => void;
  onSubmit: (channelName: string, rec: TikTokDayRecord) => void;
}) {
  const accent = { btn: 'bg-[#D32027] hover:bg-[#B70F1B]', text: 'text-[#D32027]', soft: 'bg-rose-50', bar: 'from-[#D32027] to-[#B70F1B]' };
  const maxDate = isoToday();

  const [date, setDate] = useState(initialDate);
  const [revenueStr, setRevenueStr] = useState('');
  const [viewsReach, setViewsReach] = useState('');
  const [comment, setComment] = useState('');
  const [like, setLike] = useState('');
  const [share, setShare] = useState('');
  const [save, setSave] = useState('');
  const [viewAllRate, setViewAllRate] = useState('');
  const [avgDuration, setAvgDuration] = useState('');
  const [followerIncr, setFollowerIncr] = useState('');

  useEffect(() => {
    setRevenueStr(existing?.revenue ? existing.revenue.toLocaleString('vi-VN') : '');
    const t = existing?.traffic;
    setViewsReach(t?.viewsReach ? String(t.viewsReach) : '');
    setComment(t?.comment ? String(t.comment) : '');
    setLike(t?.like ? String(t.like) : '');
    setShare(t?.share ? String(t.share) : '');
    setSave(t?.save ? String(t.save) : '');
    setViewAllRate(t?.viewAllRate ? String(t.viewAllRate) : '');
    setAvgDuration(t?.avgViewDuration ? String(t.avgViewDuration) : '');
    setFollowerIncr(t?.followerIncr ? String(t.followerIncr) : '');
  }, [existing, date]);

  const intF = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0;
  const numF = (s: string) => parseFloat(s.replace(/[^\d.]/g, '')) || 0;
  const canSubmit = revenueStr.trim() !== '';

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(channel.name, {
      date: toDdmmyyyy(date),
      revenue: intF(revenueStr),
      traffic: hasTraffic ? {
        viewsReach: intF(viewsReach), comment: intF(comment), like: intF(like), share: intF(share),
        save: intF(save), viewAllRate: numF(viewAllRate), avgViewDuration: numF(avgDuration), followerIncr: intF(followerIncr),
      } : null,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className={`h-1.5 bg-gradient-to-r ${accent.bar}`} />
        <div className="p-6 overflow-y-auto">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Báo cáo TikTok ngày</p>
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
              <span className={`material-symbols-outlined text-[18px] ${accent.text}`}>payments</span>
              <span className="text-xs font-bold text-slate-700">Doanh thu (VND)</span>
            </div>
            <input
              type="text" inputMode="numeric" placeholder="Nhập doanh thu..." value={revenueStr}
              onChange={(e) => { const c = e.target.value.replace(/\D/g, ''); setRevenueStr(c ? parseInt(c, 10).toLocaleString('vi-VN') : ''); }}
              className={`w-full px-3 py-2 text-sm text-right font-bold rounded-lg border outline-none transition-colors ${
                revenueStr.trim() === '' ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-white'
              } focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027]`}
            />
          </div>

          {hasTraffic && (
            <div className="mb-5">
              <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-blue-600">analytics</span>
                Chỉ số traffic
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <NumField label="Views / Reach" value={viewsReach} onChange={setViewsReach} />
                <NumField label="Comment" value={comment} onChange={setComment} />
                <NumField label="Like" value={like} onChange={setLike} />
                <NumField label="Share" value={share} onChange={setShare} />
                <NumField label="Lưu (Save)" value={save} onChange={setSave} />
                <NumField label="Số follow tăng" value={followerIncr} onChange={setFollowerIncr} />
                <NumField label="Tỷ lệ xem hết (%)" value={viewAllRate} onChange={setViewAllRate} decimal />
                <NumField label="TG xem TB (giây)" value={avgDuration} onChange={setAvgDuration} decimal />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-amber-600 font-medium">{!canSubmit ? 'Điền ô Doanh thu để gửi.' : ''}</p>
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

/* Ô nhập số nhập tay */
function NumField({ label, value, onChange, decimal }: {
  label: string; value: string; onChange: (v: string) => void; decimal?: boolean;
}) {
  const clean = (s: string) => (decimal ? s.replace(/[^\d.]/g, '') : s.replace(/\D/g, ''));
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1">{label}</label>
      <input
        type="text" inputMode={decimal ? 'decimal' : 'numeric'} value={value} placeholder="Nhập số..."
        onChange={(e) => onChange(clean(e.target.value))}
        className="w-full px-3 py-2 text-sm text-right font-mono rounded-lg border border-slate-200 bg-white outline-none transition-colors focus:ring-1 focus:ring-[#D32027] focus:border-[#D32027]"
      />
    </div>
  );
}
