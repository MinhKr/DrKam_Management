import React, { useState } from 'react';
import { DailyReport, AffiliateChannel, UserSession } from '../types';

interface DailyReportComponentProps {
  reports: DailyReport[];
  channels: AffiliateChannel[];
  session: UserSession;
  onAddReport: (newReport: DailyReport) => void;
  onDeleteReport: (reportId: string) => void;
}

export default function DailyReportComponent({ reports, channels, session, onAddReport, onDeleteReport }: DailyReportComponentProps) {
  // Form State
  const [date, setDate] = useState('2023-10-24');
  const [selectedChannel, setSelectedChannel] = useState('drkamvn');
  const [revenueStr, setRevenueStr] = useState('');
  
  // Traffic fields
  const [views, setViews] = useState('');
  const [comments, setComments] = useState('');
  const [likes, setLikes] = useState('');
  const [shares, setShares] = useState('');
  const [saves, setSaves] = useState('');
  const [completionRate, setCompletionRate] = useState('');
  const [avgDuration, setAvgDuration] = useState('');
  const [followers, setFollowers] = useState('');

  const [notification, setNotification] = useState('');

  // Ẩn/hiện form thêm báo cáo (mặc định ẩn, chỉ hiện khi bấm "Thêm báo cáo mới")
  const [showForm, setShowForm] = useState(false);

  // Auto-deduce channel type based on list
  const currentChannel = channels.find(c => c.name === selectedChannel);
  const isBrand = currentChannel ? currentChannel.channelType === 'Brand' : true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rev = parseFloat(revenueStr.replace(/\D/g, ''));
    if (isNaN(rev) || rev < 0) {
      alert('Vui lòng nhập doanh thu hợp lệ.');
      return;
    }

    // Format Date from YYYY-MM-DD to DD/MM/YYYY
    const dateParts = date.split('-');
    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : date;

    const newReportItem: DailyReport = {
      id: "r_custom_" + Date.now(),
      date: formattedDate,
      channelName: selectedChannel,
      channelType: isBrand ? "TikTok - Thương hiệu" : "TikTok - KOC",
      revenue: rev,
      views: views ? parseInt(views) : null,
      interactions: (likes ? parseInt(likes) : 0) + (comments ? parseInt(comments) : 0) + (shares ? parseInt(shares) : 0) || null,
      source: session.role === 'Admin' ? 'Admin' : 'Nhân viên',
      isEditable: true,
      traffic: isBrand ? {
        viewsReach: views ? parseInt(views) : 0,
        comment: comments ? parseInt(comments) : 0,
        like: likes ? parseInt(likes) : 0,
        share: shares ? parseInt(shares) : 0,
        save: saves ? parseInt(saves) : 0,
        viewAllRate: completionRate ? parseFloat(completionRate) : 0,
        avgViewDuration: avgDuration ? parseFloat(avgDuration) : 0,
        followerIncr: followers ? parseInt(followers) : 0
      } : null
    };

    onAddReport(newReportItem);

    // Reset Form Fields
    setRevenueStr('');
    setViews('');
    setComments('');
    setLikes('');
    setShares('');
    setSaves('');
    setCompletionRate('');
    setAvgDuration('');
    setFollowers('');

    setShowForm(false);
    setNotification('Đã thêm báo cáo mới thành công vào hệ thống!');
    setTimeout(() => setNotification(''), 4000);
  };

  const numFormat = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val).replace('₫', 'đ');
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 text-slate-800">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#627D47] text-white px-5 py-4 rounded-xl shadow-lg border border-green-600 flex items-center gap-3 animate-fade-in transition-all">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Thanh tiêu đề + nút mở form thêm báo cáo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-2xl">edit_note</span>
            <span>Báo cáo hằng ngày</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Nhập số liệu doanh thu &amp; traffic theo từng kênh, từng ngày.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(s => !s)}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs rounded-xl shadow-soft transition-colors cursor-pointer ${
            showForm
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-[#D32027] hover:bg-[#B70F1B] active:bg-red-800 text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add_circle'}</span>
          <span>{showForm ? 'Đóng form' : 'Thêm báo cáo mới'}</span>
        </button>
      </div>

      {/* SECTION 1: Adding new daily reports — chỉ hiện khi bấm "Thêm báo cáo mới" */}
      {showForm && (
      <section className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200/60 soft-shadow">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 font-display">
          <span className="material-symbols-outlined text-[#D32027] text-2xl font-bold">add_circle</span>
          <span>Thêm báo cáo mới</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main selectors row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Report Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Ngày báo cáo
              </label>
              <input 
                type="date" 
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] outline-none transition-all text-sm font-medium bg-slate-50/30"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Select Channel */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Chọn Kênh
              </label>
              <select 
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] outline-none transition-all text-sm bg-no-repeat pr-10 cursor-pointer text-slate-800 bg-slate-50/30"
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
              >
                <optgroup label="TikTok - Thương hiệu">
                  <option value="drkamvn">drkamvn</option>
                  <option value="drkampharmaofficial">drkampharmaofficial</option>
                </optgroup>
                <optgroup label="TikTok - KOC">
                  <option value="happyy.daily">happyy.daily</option>
                  <option value="spam_clone_01">spam_clone_01</option>
                </optgroup>
              </select>
            </div>

            {/* Doanh thu */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Doanh thu (VND)
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full pl-4 pr-12 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] outline-none transition-all text-sm font-bold text-right bg-slate-50/30"
                  placeholder="Nhập doanh thu..."
                  value={revenueStr}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    setRevenueStr(cleaned ? parseInt(cleaned).toLocaleString('vi-VN') : '');
                  }}
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-slate-400 text-sm">đ</span>
              </div>
            </div>

          </div>

          {/* Traffic indicator box (Conditional depending on Brand type channels) */}
          <div className={`transition-all duration-300 ${isBrand ? 'opacity-100 max-h-[500px]' : 'opacity-60 saturate-50'}`}>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">analytics</span>
                <span>Chỉ số traffic {isBrand ? '(Bắt buộc đối với kênh Thương hiệu)' : '(KOC chỉ cần nhập Doanh thu - Đã tự động ẩn)'}</span>
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Views/Reach</label>
                  <input 
                    type="number" 
                    placeholder="VD: 50000"
                    disabled={!isBrand}
                    className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#D32027] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
                    value={views}
                    onChange={(e) => setViews(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Comment</label>
                  <input 
                    type="number" 
                    placeholder="VD: 15"
                    disabled={!isBrand}
                    className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#D32027] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Like</label>
                  <input 
                    type="number" 
                    placeholder="VD: 150"
                    disabled={!isBrand}
                    className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#D32027] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
                    value={likes}
                    onChange={(e) => setLikes(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Share</label>
                  <input 
                    type="number" 
                    placeholder="VD: 5"
                    disabled={!isBrand}
                    className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#D32027] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Lưu</label>
                  <input 
                    type="number" 
                    placeholder="VD: 20"
                    disabled={!isBrand}
                    className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#D32027] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
                    value={saves}
                    onChange={(e) => setSaves(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Tỷ lệ xem hết (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="VD: 45.2"
                    disabled={!isBrand}
                    className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#D32027] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
                    value={completionRate}
                    onChange={(e) => setCompletionRate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">TG xem TB (giây)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="VD: 18.2"
                    disabled={!isBrand}
                    className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#D32027] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
                    value={avgDuration}
                    onChange={(e) => setAvgDuration(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Số follow tăng</label>
                  <input 
                    type="number" 
                    placeholder="VD: 45"
                    disabled={!isBrand}
                    className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#D32027] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
                    value={followers}
                    onChange={(e) => setFollowers(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-slate-100 gap-4">
            <p className="text-xs text-slate-400 italic">
              * Kênh KOC chỉ cần nhập Doanh thu. Kênh thương hiệu nhập thêm các chỉ số phễu traffic cụ thể.
            </p>
            <div className="flex gap-3 justify-end w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setRevenueStr('18.500.000');
                  setViews('65000');
                  setComments('25');
                  setLikes('180');
                }}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                Nhập mẫu giả định
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#D32027] hover:bg-[#B70F1B] active:bg-red-800 text-white font-bold text-xs rounded-xl shadow-soft transition-colors cursor-pointer"
              >
                Lưu báo cáo
              </button>
            </div>
          </div>
        </form>
      </section>
      )}

      {/* SECTION 2: Filter and log tables of reports */}
      <section className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
            <span className="material-symbols-outlined text-blue-600 text-2xl font-bold">list_alt</span>
            <span>Báo cáo của tôi</span>
          </h2>

          <div className="flex gap-2">
            <select className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium text-slate-700 bg-white">
              <option>Tháng 10/2023</option>
              <option>Tháng 9/2023</option>
            </select>
            <select className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium text-slate-700 bg-white">
              <option>Mọi loại kênh</option>
              <option>TikTok - Thương hiệu</option>
              <option>TikTok - KOC</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Ngày</th>
                <th className="px-6 py-4">Kênh</th>
                <th className="px-6 py-4">Loại kênh</th>
                <th className="px-6 py-4 text-right">Doanh thu</th>
                <th className="px-6 py-4 text-right">Views</th>
                <th className="px-6 py-4 text-right">Lượt tương tác</th>
                <th className="px-6 py-4 text-center">Nguồn dữ liệu</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 font-medium">{r.date}</td>
                  <td className="px-6 py-4 font-bold text-[#D32027]">{r.channelName}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      r.channelType.includes('Thương hiệu') 
                        ? 'bg-slate-900 text-white' 
                        : 'border border-slate-900 text-slate-900'
                    }`}>
                      {r.channelType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    {numFormat(r.revenue)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 font-mono">
                    {r.views ? r.views.toLocaleString('vi-VN') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 font-mono">
                    {r.interactions ? r.interactions.toLocaleString('vi-VN') : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold text-white ${
                      r.source === 'Admin' ? 'bg-slate-900' : 'bg-green-700'
                    }`}>
                      {r.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center space-x-3 text-slate-400">
                      
                      {r.isEditable ? (
                        <>
                          <button 
                            className="hover:text-amber-600 transition-colors" 
                            title="Sửa bản ghi nháp"
                            onClick={() => alert(`Bản ghi ngày ${r.date} của ${r.channelName} đã mở khóa chỉnh sửa. Vui lòng nhập dữ liệu mới ở phần thêm báo cáo.`)}
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button 
                            className="hover:text-rose-600 transition-colors" 
                            title="Xóa bản ghi"
                            onClick={() => {
                              if (confirm(`Bạn chắc chắn muốn xóa bản ghi báo cáo của kênh "${r.channelName}" ngày ${r.date}? Thao tác này không thể hoàn tác.`)) {
                                onDeleteReport(r.id);
                              }
                            }}
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="text-slate-200 cursor-not-allowed" 
                            title="Khóa: Báo cáo cũ hơn 3 ngày đã được kiểm toán tự động, liên hệ Admin"
                            onClick={() => alert("Bản ghi này đã lưu quá 3 ngày và được hệ thống kiểm toán DrKam phê duyệt. Bạn không thể tự ý sửa đổi.")}
                          >
                            <span className="material-symbols-outlined text-[18px]">lock</span>
                          </button>
                          <button 
                            className="hover:text-rose-600 transition-colors" 
                            title="Xóa bản ghi"
                            onClick={() => {
                              if (confirm(`Bạn chắc chắn muốn xóa bản ghi báo cáo của kênh "${r.channelName}" ngày ${r.date}? Thao tác này không thể hoàn tác.`)) {
                                onDeleteReport(r.id);
                              }
                            }}
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
