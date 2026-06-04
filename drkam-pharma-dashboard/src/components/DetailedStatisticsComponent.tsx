import React, { useState } from 'react';
import { DailyReport, AffiliateChannel } from '../types';

interface StatisticsProps {
  reports: DailyReport[];
  channels: AffiliateChannel[];
}

export default function DetailedStatisticsComponent({ reports, channels }: StatisticsProps) {
  const [selectedChannel, setSelectedChannel] = useState('Tất cả');
  const [selectedMonth, setSelectedMonth] = useState('10');

  // Excel template downloader simulation
  const handleExportExcel = () => {
    alert(`Bắt đầu kết xuất DrKam Ledger: Đang kết nối API và tạo tệp EXCEL mẫu cho Kênh: "${selectedChannel}" thuộc Tháng: ${selectedMonth}/2023. Tải xuống sẽ bắt đầu sau ít giây!`);
  };

  // Printing simulation
  const handlePrint = () => {
    window.print();
  };

  // Dynamically sum traffic indexes based on choices
  const filteredReports = reports.filter(r => {
    if (selectedChannel !== 'Tất cả' && r.channelName !== selectedChannel) return false;
    if (selectedMonth !== 'Tất cả') {
      const monthPart = r.date.split('/')[1];
      if (monthPart !== selectedMonth) return false;
    }
    return true;
  });

  const aggregateMetrics = () => {
    let totRevenue = 0;
    let totViews = 0;
    let totComments = 0;
    let totLikes = 0;
    let totShares = 0;
    let totSaves = 0;
    let totFollowers = 0;

    filteredReports.forEach(r => {
      totRevenue += r.revenue;
      if (r.traffic) {
        totViews += r.traffic.viewsReach;
        totComments += r.traffic.comment;
        totLikes += r.traffic.like;
        totShares += r.traffic.share;
        totSaves += r.traffic.save;
        totFollowers += r.traffic.followerIncr;
      } else if (r.views) {
        totViews += r.views;
      }
    });

    return {
      totRevenue,
      totViews,
      totComments,
      totLikes,
      totShares,
      totSaves,
      totFollowers,
      avgCompletion: filteredReports.length > 0 ? 46.5 : 0,
      avgDuration: filteredReports.length > 0 ? 21.2 : 0
    };
  };

  const metrics = aggregateMetrics();

  const numFormat = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val).replace('₫', 'đ');
  };

  return (
    <div className="flex flex-col gap-6 text-slate-800">
      
      {/* Page Title & Interactive Utilities */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 font-display">Báo cáo thống kê</h1>
          <p className="text-sm text-slate-500 mt-1">
            Báo cáo chi tiết và tổng hợp hiệu suất tương tác cho các kênh phễu tiếp thị DrKam.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-[#627D47] hover:bg-green-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-soft transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            <span>Xuất file excel</span>
          </button>
          
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>In báo cáo</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-wrap gap-4 items-center shadow-soft">
        
        <div className="flex flex-col gap-1 w-full sm:w-[240px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lọc theo kênh</span>
          <select 
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-red-500"
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
          >
            <option value="Tất cả">Tất cả các kênh</option>
            {channels.map(c => (
              <option key={c.id} value={c.name}>{c.name} ({c.platform})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-[180px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Khoảng thời gian</span>
          <select 
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-red-500"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="Tất cả">Tất cả thời gian</option>
            <option value="10">Tháng 10/2023</option>
            <option value="09">Tháng 09/2023</option>
          </select>
        </div>

        <p className="text-xs text-slate-400 italic sm:ml-auto">
          * Đang xem tập chỉ số tổng hợp của {filteredReports.length} bản ghi khớp.
        </p>
      </div>

      {/* AGGREGATED TRAFFIC SUMMARY GRID */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-soft">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 font-display flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-600 text-xl">insights</span>
          <span>Chỉ số tổng hợp phễu lưu lượng</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          
          {/* Item 1 */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
            <span className="text-slate-400 text-xs font-semibold">Doanh thu phễu</span>
            <div className="text-sm font-extrabold text-[#D32027] mt-1 truncate">{numFormat(metrics.totRevenue)}</div>
          </div>

          {/* Item 2 */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
            <span className="text-slate-400 text-xs font-semibold">Tổng views</span>
            <div className="text-sm font-extrabold text-slate-950 mt-1">{metrics.totViews ? metrics.totViews.toLocaleString('vi-VN') : '-'}</div>
          </div>

          {/* Item 3 */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
            <span className="text-slate-400 text-xs font-semibold">Comments</span>
            <div className="text-sm font-extrabold text-slate-950 mt-1">{metrics.totComments ? metrics.totComments.toLocaleString('vi-VN') : '-'}</div>
          </div>

          {/* Item 4 */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
            <span className="text-slate-400 text-xs font-semibold">Likes</span>
            <div className="text-sm font-extrabold text-slate-950 mt-1">{metrics.totLikes ? metrics.totLikes.toLocaleString('vi-VN') : '-'}</div>
          </div>

          {/* Item 5 */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
            <span className="text-slate-400 text-xs font-semibold">Shares</span>
            <div className="text-sm font-extrabold text-slate-950 mt-1">{metrics.totShares ? metrics.totShares.toLocaleString('vi-VN') : '-'}</div>
          </div>

          {/* Item 6 */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
            <span className="text-slate-400 text-xs font-semibold">Tỷ lệ xem (%)</span>
            <div className="text-sm font-extrabold text-emerald-700 mt-1">{metrics.avgCompletion}%</div>
          </div>

          {/* Item 7 */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center col-span-2 sm:col-span-1">
            <span className="text-slate-400 text-xs font-semibold">Follow Tăng</span>
            <div className="text-sm font-extrabold text-slate-950 mt-1">+{metrics.totFollowers}</div>
          </div>

        </div>
      </div>

      {/* DOUBLE GRAPH COMPARISON SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TikTok line chart plot */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/60 shadow-soft">
          <h3 className="text-md font-bold text-slate-950 mb-4 font-display">Biểu đồ đối sánh tăng trưởng theo ngày</h3>
          <div className="h-64 relative bg-slate-50/50 rounded-xl border border-slate-200 p-4 overflow-hidden">
            <div className="absolute left-2 top-2 bottom-6 flex flex-col justify-between text-[10px] text-slate-400 font-mono">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            
            <div className="absolute inset-x-12 bottom-2 text-[10px] text-slate-400 font-mono flex justify-between">
              <span>05/10/2023</span>
              <span>15/10/2023</span>
              <span>25/10/2023</span>
            </div>

            <svg className="absolute inset-0 left-12 right-4 top-4 bottom-8 w-11/12 h-4/5" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path 
                d="M 0 90 L 20 70 L 40 85 L 60 40 L 80 50 L 100 10" 
                fill="none" 
                stroke="#D32027" 
                strokeWidth="3"
                strokeLinecap="round" 
              />
              <path 
                d="M 0 95 L 20 82 L 40 70 L 60 65 L 80 50 L 100 42" 
                fill="none" 
                stroke="#627D47" 
                strokeWidth="2.5" 
                strokeDasharray="4,3"
                strokeLinecap="round" 
              />
            </svg>
          </div>
          <div className="flex gap-4 justify-center mt-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#D32027] rounded-full inline-block"></span>Kênh của tôi đạt số</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#627D47] rounded-full inline-block border border-dashed"></span>Mục tiêu kế hoạch trung bình</span>
          </div>
        </div>

        {/* Informative ledger suggestions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-soft flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-md font-bold text-slate-950 mb-3 font-display">Tối ưu hóa kênh đề xuất</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Dựa vào thuật toán xếp hạng liên kết DrKam, các video có thời lượng xem trung bình trên 18 giây có tỷ lệ chuyển đổi đơn hàng cao hơn 3.5 lần.
            </p>
            
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold">
                <span className="material-symbols-outlined text-lg">hotel_class</span>
                <span>Khuyến cáo vận hành</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Các kênh có trạng thái <strong>Bóp tương tác</strong> nên chuyển đổi kịch bản đính kèm mô hình AI giọng đọc để khôi phục chất lượng lưu lượng.
              </p>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-mono">AUTOMATED ADV-BOT DATA SYSTEM</span>
          </div>
        </div>

      </div>

    </div>
  );
}
