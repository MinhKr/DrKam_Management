import React, { useState } from 'react';
import { DailyReport, TeamTarget } from '../types';

interface DashboardComponentProps {
  reports: DailyReport[];
  targets: TeamTarget[];
  onNavigateToTab: (tabId: string) => void;
}

type TimePeriod = 'today' | 'week' | 'month';

export default function DashboardComponent({ reports, targets, onNavigateToTab }: DashboardComponentProps) {
  const [period, setPeriod] = useState<TimePeriod>('month');

  // Dynamically calculate KPIs based on current period selected
  const getPeriodMultiplier = () => {
    if (period === 'today') return 0.08; // 8% of data
    if (period === 'week') return 0.35; // 35% of data
    return 1.0; // full month data
  };

  const multiplier = getPeriodMultiplier();

  // Basic stats matching the main design image
  const rawRevenueTotal = Math.round(1250000000 * multiplier);
  const rawRevenueTikTok = Math.round(850000000 * multiplier);
  const rawRevenueShopee = Math.round(400000000 * multiplier);
  const rawViews = period === 'today' ? "350K" : period === 'week' ? "1.8M" : "5.2M";

  const numFormat = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val).replace('₫', 'đ');
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header & Filter Controls bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1F1F1F]">Tổng quan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Báo cáo phân tích doanh thu bán hàng và chỉ số tương tác kênh phễu.
          </p>
        </div>
        
        {/* Dynamic Period Filter Buttons */}
        <div className="flex bg-white rounded-2xl border border-slate-200 p-1 soft-card-shadow">
          <button 
            onClick={() => setPeriod('today')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              period === 'today' 
                ? 'bg-rose-50 text-[#D32027] border border-rose-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Hôm nay
          </button>
          <button 
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              period === 'week' 
                ? 'bg-rose-50 text-[#D32027] border border-rose-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tuần này
          </button>
          <button 
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              period === 'month' 
                ? 'bg-rose-50 text-[#D32027] border border-rose-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tháng này
          </button>
          
          <div className="w-px bg-slate-200 mx-1 my-1"></div>
          
          <button 
            onClick={() => alert("Chức năng lọc tùy chọn lịch ngày: Vui lòng kết nối cơ sở dữ liệu để lọc phạm vi tùy ý.")}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            Tùy chọn ngày
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Tổng Doanh Thu */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 soft-card-shadow flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Tổng doanh thu</h3>
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-[#D32027]">
              <span className="material-symbols-outlined">payments</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#1F1F1F] tracking-tight">{numFormat(rawRevenueTotal)}</div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-green-700 mt-2 bg-green-50 px-2 py-0.5 rounded-full w-max">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              <span>15%</span>
              <span className="text-slate-500 font-normal ml-1">so với kỳ trước</span>
            </div>
          </div>
        </div>

        {/* Card 2: Doanh thu TikTok */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 soft-card-shadow flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Doanh thu TikTok</h3>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
              <span className="material-symbols-outlined">smart_display</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#1F1F1F] tracking-tight">{numFormat(rawRevenueTikTok)}</div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-green-700 mt-2 bg-green-50 px-2 py-0.5 rounded-full w-max">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              <span>12%</span>
              <span className="text-slate-500 font-normal ml-1">so với kỳ trước</span>
            </div>
          </div>
        </div>

        {/* Card 3: Doanh thu Shopee */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 soft-card-shadow flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Doanh thu Shopee (FB)</h3>
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
              <span className="material-symbols-outlined">storefront</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#1F1F1F] tracking-tight">{numFormat(rawRevenueShopee)}</div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-green-700 mt-2 bg-green-50 px-2 py-0.5 rounded-full w-max">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              <span>8%</span>
              <span className="text-slate-500 font-normal ml-1">so với kỳ trước</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tổng Lượt Xem */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 soft-card-shadow flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Lượt xem (kênh TH)</h3>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined">visibility</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#1F1F1F] tracking-tight">{rawViews}</div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-green-700 mt-2 bg-green-50 px-2 py-0.5 rounded-full w-max">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              <span>20%</span>
              <span className="text-slate-500 font-normal ml-1">so với kỳ trước</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Sections split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TikTok vs Shopee Line graph widget */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/60 soft-card-shadow flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <h3 className="text-lg font-bold text-gray-900 font-display">Xu hướng doanh thu theo ngày</h3>
            
            {/* Color indicators */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-3 h-3 rounded-full bg-[#D32027]"></span> 
                <span>Kênh TikTok</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-3 h-3 rounded-full border border-dashed border-[#C05530] bg-[#C05530]/20"></span>
                <span>Kênh Shopee (qua phễu FB)</span>
              </div>
            </div>
          </div>

          {/* SVG Line Graph wrapper */}
          <div className="flex-1 relative min-h-[280px] w-full bg-slate-50/50 rounded-xl border border-slate-200/60 overflow-hidden p-4">
            
            {/* Y Axis Grid Labeling */}
            <div className="absolute left-3 top-4 bottom-8 flex flex-col justify-between text-[11px] text-slate-400 font-mono">
              <span>100M</span>
              <span>75M</span>
              <span>50M</span>
              <span>25M</span>
              <span>0</span>
            </div>

            {/* Grid Line Visuals */}
            <div className="absolute inset-0 left-12 right-4 top-4 bottom-8 flex flex-col justify-between pointer-events-none">
              <div className="w-full h-px bg-slate-200/75"></div>
              <div className="w-full h-px bg-slate-200/75"></div>
              <div className="w-full h-px bg-slate-200/75"></div>
              <div className="w-full h-px bg-slate-200/75"></div>
              <div className="w-full h-px bg-slate-300 border-b border-dashed"></div>
            </div>

            {/* SVGs plotting */}
            <div className="absolute inset-0 left-12 right-4 bottom-8 top-4">
              
              {/* Solid line - TikTok */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="solidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D32027" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#D32027" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path 
                  d="M 0 80 C 10 75, 20 68, 30 50 C 40 45, 50 65, 60 30 C 70 25, 80 40, 90 20 L 100 10" 
                  fill="none" 
                  stroke="#D32027" 
                  strokeWidth="3.2" 
                  strokeLinecap="round"
                />
                <path 
                  d="M 0 80 C 10 75, 20 68, 30 50 C 40 45, 50 65, 60 30 C 70 25, 80 40, 90 20 L 100 10 L 100 100 L 0 100 Z" 
                  fill="url(#solidGrad)"
                />
              </svg>

              {/* Dashed line - Shopee */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path 
                  d="M 0 92 C 15 88, 25 80, 40 75 C 50 72, 60 62, 70 65 C 80 64, 88 52, 100 48" 
                  fill="none" 
                  stroke="#C05530" 
                  strokeWidth="2.5" 
                  strokeDasharray="5,4" 
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* X Axis Grid Labeling */}
            <div className="absolute left-12 right-4 bottom-2 flex justify-between text-[11px] text-slate-400 font-mono">
              <span>01/10</span>
              <span>05/10</span>
              <span>10/10</span>
              <span>15/10</span>
              <span>20/10</span>
              <span>25/10</span>
              <span>30/10</span>
            </div>
          </div>
        </div>

        {/* Channel Share donut widget */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 soft-card-shadow flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 font-display mb-4">Tỷ trọng kênh bán hàng</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-2">
            {/* Radial circular progress diagram */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Track */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#E2E8F0" strokeWidth="3.2" />
                {/* Green - KOC AI (15%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#425b29" strokeWidth="3.2" strokeDasharray="15 85" strokeDashoffset="0" />
                {/* Orange - KOC Người thật (30%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#C05530" strokeWidth="3.2" strokeDasharray="30 70" strokeDashoffset="-15" />
                {/* Red - Thương Hiệu (55%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#D32027" strokeWidth="3.2" strokeDasharray="55 45" strokeDashoffset="-45" />
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">100%</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tổng sản lượng</span>
              </div>
            </div>

            {/* Percentages Table Legend */}
            <div className="w-full flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-[#D32027]"></span>
                  <span>Kênh thương hiệu</span>
                </div>
                <span className="font-bold text-slate-800">55%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-[#C05530]"></span>
                  <span>KOC người thật</span>
                </div>
                <span className="font-bold text-slate-800">30%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-[#425b29]"></span>
                  <span>KOC sử dụng AI</span>
                </div>
                <span className="font-bold text-slate-800">15%</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Sales Leaderboard Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/60 soft-card-shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 font-display">Bảng xếp hạng nhân viên theo doanh thu</h3>
          <button 
            onClick={() => onNavigateToTab('chi-tieu')}
            className="text-xs font-bold text-[#D32027] hover:underline flex items-center gap-1"
          >
            <span>Quản lý KPI</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium uppercase tracking-wider">
                <th className="py-4 px-4 text-center w-16">Hạng</th>
                <th className="py-4 px-4 text-left">Nhân viên</th>
                <th className="py-4 px-4 text-left">Nhóm</th>
                <th className="py-4 px-4 text-right">Doanh thu đạt được</th>
                <th className="py-4 px-4 text-left w-64">% hoàn thành chỉ tiêu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              
              {/* Row 1 */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold">1</span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <img 
                      alt="Nguyen Van A" 
                      className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBd-vzveFjQnMXwRBSE5hRbjWLkVKSfLRJyEVtt3FFF-EpnkYdvqVfaEBHaP5gubL_nohHV3L6KINm_ivztrBMZpNcjFGeKNuKgtOj8q6w7dkoLBn-ALRsk1bNuygMmLjT5A5xZqGOUqecdvXPzWI9JXfJLaIbUv3-OQ11U-_TqOSzAEQIL5XYRl5EXNgSiPbmiRmihM_th8rLJLAIZYOxgRnKkD5YxTYKZGpzSPdyE4TJjFJnpVAYphV_9UpuOLyW60NiMChPDnqr" 
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Nguyễn Văn A</div>
                      <div className="text-xs text-slate-500">Leader</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700">Team TikTok</span>
                </td>
                <td className="py-4 px-4 text-right font-bold text-slate-900">
                  {numFormat(350000000)}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#D32027] rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    <span className="text-xs font-bold text-[#D32027]">120%</span>
                  </div>
                </td>
              </tr>

              {/* Row 2 */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold">2</span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <img 
                      alt="Tran Thi B" 
                      className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7hJqbL0fQIqlo1FE3j4-WZeqTHw9cn0ga5_nxJXHO3hwKU5C-XJqfMIYYWJjYkI9UnaG4W_mmJ7z8QUlbxQ7YEow_HLbhZYA3FV3w2VgxdzlqIp4oB7TXAhzNG7620ml3yJ0apWRP7ynDUgBVvDzYSXMjoVtTM4bxOMGeXu7QNgwLsznEorRWpcXV-0H0Dh86o59C4oVRi4urL_DCGG9BRqyHPxMAIIs4AOuvVPY6FamKTifQkXK5OQbA2dIPyVLhtinhe2InKOon" 
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Trần Thị B</div>
                      <div className="text-xs text-slate-500">Chuyên viên</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700">Team FB</span>
                </td>
                <td className="py-4 px-4 text-right font-bold text-slate-900">
                  {numFormat(280000000)}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-700">95%</span>
                  </div>
                </td>
              </tr>

              {/* Row 3 */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold">3</span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <img 
                      alt="Le Van C" 
                      className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7goLbziQTnC2JUBRIyeKheBShX-MRMuRKl89X27RF4umEa-_0diYtjIFGG3sZnC3EldaGqNP1k7-1zuQXN4H1Lp1KMjZLT6TWr_3xkNDHJYyejU4-5dxwmXt7r3fwNUhWrN_QfAsD-iDAXttm-1Hlr4BqzIv4TKXKnQe-EFzihR3ZwbTuzxxcSqHswDXqRk8HrclGJyKD1NdWJDhv6rrUVKpnCVfRj9HwgvTFCyghdOT70e5GbJW1Z3bWoR10XY4OwRYV-CJboViX" 
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Lê Văn C</div>
                      <div className="text-xs text-slate-500">Chuyên viên</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700">Team TikTok</span>
                </td>
                <td className="py-4 px-4 text-right font-bold text-slate-900">
                  {numFormat(210000000)}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-700">70%</span>
                  </div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-center">
          <button 
            onClick={() => onNavigateToTab('nhan-vien')}
            className="px-6 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold text-slate-600 transition-colors text-xs"
          >
            Xem tất cả nhân sự
          </button>
        </div>
      </div>

    </div>
  );
}
