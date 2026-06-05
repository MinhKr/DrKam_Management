import React, { useState } from 'react';
import { AffiliateChannel, Employee } from '../types';

interface ChannelManagementProps {
  channels: AffiliateChannel[];
  employees: Employee[];
  onAddChannel: (newChannel: AffiliateChannel) => void;
  onDeleteChannel: (channelId: string) => void;
}

export default function ChannelManagementComponent({ channels, employees, onAddChannel, onDeleteChannel }: ChannelManagementProps) {
  // Filter States
  const [platformFilter, setPlatformFilter] = useState('Tất cả');
  const [typeFilter, setTypeFilter] = useState('Tất cả');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Channel Modal Simulator state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBrandCategory, setNewBrandCategory] = useState('Mạng lưới AI');
  const [newPlatform, setNewPlatform] = useState<'TikTok' | 'Facebook'>('TikTok');
  const [newChannelType, setNewChannelType] = useState<'Brand' | 'Real KOC' | 'AI KOC'>('AI KOC');
  const [newManager, setNewManager] = useState(employees[0]?.name || 'Trần Thị Bích');
  // ID nguồn doanh thu: TikTok = ID kênh; Facebook = ID affiliate của người sở hữu
  const [newRefId, setNewRefId] = useState('');

  // Triggering the channel creation
  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Vui lòng nhập tên kênh.');
      return;
    }

    if (!newRefId.trim()) {
      alert(newPlatform === 'Facebook'
        ? 'Vui lòng nhập ID affiliate của người sở hữu.'
        : 'Vui lòng nhập ID kênh.');
      return;
    }

    const matchedEmp = employees.find(emp => emp.name === newManager) || employees[0];
    const newChan: AffiliateChannel = {
      id: "chan_" + Date.now(),
      name: newName.toLowerCase().replace(/\s+/g, ''),
      brandCategory: newBrandCategory,
      platform: newPlatform,
      channelType: newChannelType,
      linkedShop: true,
      auditId: newRefId.trim(),
      managerName: matchedEmp ? matchedEmp.name : newManager,
      managerAvatar: matchedEmp ? matchedEmp.avatar : "https://lh3.googleusercontent.com/aida-public/AB6AXuAvqJKpHKezzQeT0c5p9z5xzRq6_R69ArReHe2aFA6ElOEqKZLiWw2-9K9XRRoKxixAAPSJSue43GQJZu_s6ytWBJ3OCCaFy1Q1sScVv-mriaZAlXUBQqFgThiny60AD-MLPfJnuwZVHRC9NRHVp75Hz1of22zCkPsE_UyBaGaAo228gVorilPln-8EjQEe83LKg90YstOEt1mG7epsMzDUrPYX5pnmZN5jd106Tauu0aNwCfsm65fLd-qyRdMZiRqlbBIVKCl3lGbL",
      status: "Đang nuôi",
      tracking: { revenueActive: true, trafficActive: true }
    };

    onAddChannel(newChan);
    setIsModalOpen(false);
    setNewName('');
    setNewRefId('');
    alert(`Đã đăng ký kênh affiliate "${newChan.name}" thành công vào nhóm hệ thống!`);
  };

  // Perform filtering
  const filteredChannels = channels.filter(channel => {
    // Platform filter
    if (platformFilter !== 'Tất cả' && channel.platform !== platformFilter) return false;
    // Type filter
    if (typeFilter !== 'Tất cả' && channel.channelType !== typeFilter) return false;
    // Status filter
    if (statusFilter !== 'Tất cả' && channel.status !== statusFilter) return false;
    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!channel.name.toLowerCase().includes(q) && 
          !channel.managerName.toLowerCase().includes(q) &&
          !channel.auditId.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 text-slate-800">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 font-display">Quản lý kênh</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý, cấu hình phân phối liên kết và theo dõi trạng thái kênh affiliate.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#D32027] hover:bg-[#B70F1B] text-white px-5 py-2.5 rounded-xl shadow-soft font-bold text-sm transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>Thêm kênh mới</span>
        </button>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-soft">
        
        {/* Deep search bar */}
        <div className="flex-1 min-w-[280px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            search
          </span>
          <input 
            type="text" 
            placeholder="Tìm kiếm kênh, ID hoặc nhân viên..."
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] focus:bg-white transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter: Platform */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nền tảng</label>
          <select 
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="Tất cả">Tất cả nền tảng</option>
            <option value="TikTok">TikTok</option>
            <option value="Facebook">Facebook</option>
          </select>
        </div>

        {/* Filter: Channel Type */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loại hình</label>
          <select 
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="Tất cả">Tất cả loại hình</option>
            <option value="Brand">Kênh Brand</option>
            <option value="Real KOC">Real KOC</option>
            <option value="AI KOC">AI KOC</option>
          </select>
        </div>

        {/* Filter: Status */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</label>
          <select 
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Đã ra số">Đã ra số</option>
            <option value="Đang nuôi">Đang nuôi</option>
            <option value="Bóp TT">Bóp tương tác (Bóp TT)</option>
            <option value="Đã khóa">Đã khóa</option>
          </select>
        </div>

        {/* Action utility buttons */}
        <div className="flex gap-2 w-full sm:w-auto sm:ml-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <button 
            onClick={() => alert("Xuất báo cáo hệ thống: Tải xuống file channels_report.xlsx hoàn tất!")}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors cursor-pointer text-sm font-semibold flex items-center gap-1"
            title="Xuất dữ liệu"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            <span className="inline sm:hidden text-xs">Tải Excel</span>
          </button>
          <button 
            onClick={() => alert("Tùy chọn hiển thị cột dữ liệu: Tất cả thông số đã được xuất bản.")}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors cursor-pointer text-sm font-semibold flex items-center gap-1"
            title="Tùy chỉnh cột hiển thị"
          >
            <span className="material-symbols-outlined text-lg">view_column</span>
            <span className="inline sm:hidden text-xs">Cột</span>
          </button>
        </div>

      </div>

      {/* CHANNELS TABLE CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200/60 soft-shadow overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-6 w-[240px]">Kênh / Liên kết</th>
                <th className="py-4 px-4">Nền tảng</th>
                <th className="py-4 px-4">Phân loại</th>
                <th className="py-4 px-4 text-center">LK Shop</th>
                <th className="py-4 px-4">ID Kênh / Affiliate</th>
                <th className="py-4 px-4">Mã phụ trách</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-4">Đồng bộ tracking</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredChannels.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy kênh phù hợp với điều kiện lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredChannels.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/40 transition-colors group">
                    
                    {/* Channel name & Category */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
                          {c.linkedShop === 'disconnected' ? (
                            <span className="material-symbols-outlined text-slate-400">broken_image</span>
                          ) : (
                            <img alt="avatar" className="w-full h-full object-cover" src={c.managerAvatar} />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <a 
                            href={`https://tiktok.com/@${c.name}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="font-bold text-slate-950 hover:text-[#D32027] transition-colors flex items-center gap-1 text-sm truncate"
                          >
                            <span>{c.name}</span>
                            <span className="material-symbols-outlined text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                          </a>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">{c.brandCategory}</span>
                        </div>
                      </div>
                    </td>

                    {/* Platform Tag */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                        c.platform === 'TikTok'
                          ? 'bg-slate-950 text-white'
                          : c.platform === 'Facebook'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'bg-orange-50 text-orange-600 border border-orange-200'
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {c.platform === 'TikTok' ? 'music_note' : c.platform === 'Facebook' ? 'dns' : 'storefront'}
                        </span>
                        <span>{c.platform}</span>
                      </span>
                    </td>

                    {/* Phân loại Type tag */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        c.channelType === 'Brand'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : c.channelType === 'Real KOC'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {c.channelType}
                      </span>
                    </td>

                    {/* LK Shop */}
                    <td className="py-4 px-4 text-center">
                      {c.linkedShop === true && (
                        <span className="material-symbols-outlined text-emerald-600 font-bold" title="Liên kết chính hoạt động">check_circle</span>
                      )}
                      {c.linkedShop === false && (
                        <span className="material-symbols-outlined text-slate-300" title="Chưa kích hoạt liên kết">cancel</span>
                      )}
                      {c.linkedShop === 'disconnected' && (
                        <span className="material-symbols-outlined text-red-600 font-bold" title="Mất kết nối API liên kết">link_off</span>
                      )}
                    </td>

                    {/* Audit ID */}
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200/50">
                        {c.auditId}
                      </span>
                    </td>

                    {/* Manager name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <img alt="Manager" className="w-6 h-6 rounded-full object-cover border border-slate-200" src={c.managerAvatar} />
                        <span className="font-medium text-slate-700 text-xs">{c.managerName}</span>
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        c.status === 'Đã ra số'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : c.status === 'Đang nuôi'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : c.status === 'Bóp TT'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          c.status === 'Đã ra số' ? 'bg-green-500' : c.status === 'Đang nuôi' ? 'bg-blue-500' : c.status === 'Bóp TT' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        <span>{c.status}</span>
                      </span>
                    </td>

                    {/* Tracking simulation toggles */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-1.5 text-[11px]">
                          <span className="text-slate-400">Doanh thu</span>
                          <span className={`w-6 h-3.5 rounded-full relative transition-colors ${c.tracking.revenueActive ? 'bg-green-600' : 'bg-slate-300'}`}>
                            <span className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all ${c.tracking.revenueActive ? 'right-0.5' : 'left-0.5'}`} />
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1.5 text-[11px]">
                          <span className="text-slate-400">Lưu lượng</span>
                          <span className={`w-6 h-3.5 rounded-full relative transition-colors ${c.tracking.trafficActive ? 'bg-green-600' : 'bg-slate-300'}`}>
                            <span className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all ${c.tracking.trafficActive ? 'right-0.5' : 'left-0.5'}`} />
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Delete actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => alert(`Lấy lý lịch hiệu suất: Kênh "${c.name}" có chỉ số lưu lượng và doanh thu tích hợp đạt tiêu chuẩn phê duyệt.`)}
                          className="p-1.5 text-[#D32027] hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hiển thị thêm"
                        >
                          <span className="material-symbols-outlined text-lg">info</span>
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Hủy đăng ký kênh "${c.name}" khỏi hệ thống phễu DrKam?`)) {
                              onDeleteChannel(c.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hủy liên kết"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW CHANNEL DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 relative animate-fade-in">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4 font-display">Đăng ký kênh affiliate mới</h3>
            
            <form onSubmit={handleCreateChannel} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tên Kênh (Ví dụ: drkam_official)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nhập nick của kênh..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nhãn mô tả kênh</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Kênh Vệ Tinh, AI Clone..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  value={newBrandCategory}
                  onChange={(e) => setNewBrandCategory(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nền tảng</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as 'TikTok' | 'Facebook')}
                  >
                    <option value="TikTok">TikTok</option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1 font-sans">Kiểu phân phối</label>
                  <select 
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                    value={newChannelType}
                    onChange={(e) => setNewChannelType(e.target.value as any)}
                  >
                    <option value="AI KOC">AI KOC</option>
                    <option value="Real KOC">Real KOC</option>
                    <option value="Brand">Brand</option>
                  </select>
                </div>
              </div>

              {/* ID nguồn doanh thu — đổi nhãn theo nền tảng */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  {newPlatform === 'Facebook' ? 'ID Affiliate của người sở hữu' : 'ID Kênh'}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    {newPlatform === 'Facebook' ? 'badge' : 'tag'}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder={newPlatform === 'Facebook' ? 'Nhập ID affiliate của KOC sở hữu...' : 'Nhập ID kênh...'}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    value={newRefId}
                    onChange={(e) => setNewRefId(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  {newPlatform === 'Facebook'
                    ? 'Dùng để đối chiếu doanh thu từ Shopee Seller theo ID KOC inhouse.'
                    : 'Dùng để đối chiếu doanh thu từ TikTok Shop Seller theo ID kênh.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Người vận hành quản trị</label>
                <select 
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                  value={newManager}
                  onChange={(e) => setNewManager(e.target.value)}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#D32027] hover:bg-[#B70F1B] text-white text-xs font-bold rounded-lg"
                >
                  Xác nhận lưu
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
