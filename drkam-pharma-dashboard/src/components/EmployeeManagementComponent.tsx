import React, { useState } from 'react';
import { Employee } from '../types';

interface EmployeeManagementProps {
  employees: Employee[];
  onAddEmployee: (newEmp: Employee) => void;
  onToggleEmployeeStatus: (empId: string) => void;
  onDeleteEmployee: (empId: string) => void;
}

export default function EmployeeManagementComponent({ employees, onAddEmployee, onToggleEmployeeStatus, onDeleteEmployee }: EmployeeManagementProps) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Add Employee form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Leader' | 'Nhân viên'>('Nhân viên');
  const [groupVal, setGroupVal] = useState('Kinh doanh HN');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Vui lòng nhập đầy đủ tên và email.');
      return;
    }

    const newEmp: Employee = {
      id: "emp_" + Date.now(),
      name: name,
      email: email.toLowerCase().trim(),
      role: role,
      department: groupVal,
      status: 'Hoạt động',
      channelCount: 0,
      avatar: role === 'Admin'
        ? "https://lh3.googleusercontent.com/aida-public/AB6AXuAwxcNk3h_dSy-QxPJwh7IZAx4IPd69V4i_4FlgAIlvGpHoE4f-UZIj64GPyBokv3MGwEUuU4DVvOS81ZV1ab3ZbJuSzeY9ZAUh68pyIlXV1GQlhMqsnDe9GgkijJuB1d63sf4q171JOYdQiXM5rFRPd6Hcd38tUF2isSe2BxoOEf3mcf7uun3rlRhQQb-klabcjUgssUIDmF8PD7MnjvbOichafwaOsnBSNFY1RMIRVMTjWYedKiTdu5PPWrflyzqwB9hfglsHmTZ7"
        : "https://lh3.googleusercontent.com/aida-public/AB6AXuCA92GDkUbWvXrn22ZL-2GncLt7Id8ZSDOUJZqHbkIVe-CAKEETqOY0HWsDcQmZCwGn_pKGKFg-nexGWG2fu_xpawe2Gi3p6aAQ4EeEJpkvIDQrWFcobLYGXAEfmrqy4JWO4V-jRu9cYCYspqKYu83glAtBkmA15CEVA6BLuLzI-fYbochgbj3DXz_hAOPzfSKLb8TBzaZDMgBaM-UAwD7T4sO5CD04JuclO-qyumbM97sJh7nudS6RagQMoEmgD2cVYDjyvDuOvy6k"
    };

    onAddEmployee(newEmp);
    setIsModalOpen(false);
    setName('');
    setEmail('');
    alert(`Đã thêm thành viên mới "${newEmp.name}" thành công!`);
  };

  // Reset Filters
  const handleClearFilters = () => {
    setSearch('');
    setGroupFilter('');
    setRoleFilter('');
  };

  // Perform dynamic client filtering
  const filteredEmployees = employees.filter(emp => {
    // Search query matched with Name or Email
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      if (!emp.name.toLowerCase().includes(q) && !emp.email.toLowerCase().includes(q)) {
        return false;
      }
    }
    // Group department matching
    if (groupFilter !== '') {
      // mapping text checks
      const dept = emp.department.toLowerCase();
      if (groupFilter === 'sales' && !dept.includes('kinh doanh')) return false;
      if (groupFilter === 'marketing' && !dept.includes('marketing')) return false;
      if (groupFilter === 'support' && !dept.includes('cskh')) return false;
      if (groupFilter === 'it' && !dept.includes('hệ thống')) return false;
    }
    // Privilege Tier Roles matching
    if (roleFilter !== '') {
      if (roleFilter === 'admin' && emp.role !== 'Admin') return false;
      if (roleFilter === 'leader' && emp.role !== 'Leader') return false;
      if (roleFilter === 'staff' && emp.role !== 'Nhân viên') return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 text-slate-800">
      
      {/* Page Title & Add action button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 font-display">Quản lý nhân viên</h1>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            Quản lý danh sách tài khoản, giám sát phân quyền và vai trò xử lý báo cáo trong hệ thống.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#D32027] hover:bg-red-800 active:bg-red-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-soft cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>Thêm nhân viên mới</span>
        </button>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-soft flex flex-wrap gap-4 items-center">
        
        {/* Name / Email Query */}
        <div className="relative flex-1 min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
            search
          </span>
          <input 
            type="text" 
            placeholder="Tìm theo họ tên, email nhân sự..."
            className="w-full border border-slate-250 bg-slate-50/50 rounded-lg py-2 pl-10 pr-3 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:bg-white transition-all outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* select: Nhóm/Department */}
        <div className="w-[180px]">
          <select 
            className="w-full border border-slate-250 bg-white rounded-lg py-2 px-3 text-xs font-semibold text-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none appearance-none cursor-pointer"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">Tất cả Nhóm</option>
            <option value="sales">Kinh doanh (Sales)</option>
            <option value="marketing">Marketing</option>
            <option value="support">Bộ phận CSKH</option>
            <option value="it">IT &amp; Hệ thống</option>
          </select>
        </div>

        {/* select: Vai Trò */}
        <div className="w-[185px]">
          <select 
            className="w-full border border-slate-250 bg-white rounded-lg py-2 px-3 text-xs font-semibold text-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none appearance-none cursor-pointer"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Tất cả Vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="leader">Trưởng bộ phận (Leader)</option>
            <option value="staff">Chuyên viên Nhân sự</option>
          </select>
        </div>

        {/* Clear Filters Call */}
        <button 
          onClick={handleClearFilters}
          className="text-slate-500 hover:text-[#D32027] p-2 rounded-lg hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100 flex items-center gap-1 text-xs font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">filter_list_off</span>
          <span>Xóa bộ lọc</span>
        </button>
      </div>

      {/* DETAILED STAFF TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-soft overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-6 w-[35%]">Nhân viên</th>
                <th className="py-4 px-6">Phần quyền Hệ Thống</th>
                <th className="py-4 px-6">Thuộc Nhóm</th>
                <th className="py-4 px-6">Trạng thái khóa</th>
                <th className="py-4 px-6 text-center">Số Kênh affiliate QL</th>
                <th className="py-4 px-6 text-right">Lệnh hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className={`hover:bg-slate-50/40 transition-colors group ${emp.status === 'Đã khóa' ? 'bg-slate-50/30' : ''}`}>
                  
                  {/* Name and Email */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img 
                        alt={emp.name} 
                        className={`w-10 h-10 rounded-full border border-slate-200 object-cover ${emp.status === 'Đã khóa' ? 'grayscale opacity-60' : ''}`}
                        src={emp.avatar} 
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{emp.name}</div>
                        <div className="text-xs text-slate-400">{emp.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role with precise themed badges matching mockup */}
                  <td className="py-4 px-6">
                    {emp.role === 'Admin' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                        Admin
                      </span>
                    )}
                    {emp.role === 'Leader' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-amber-700 text-white text-[10px] font-bold uppercase tracking-wider">
                        Leader
                      </span>
                    )}
                    {emp.role === 'Nhân viên' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-[#627D47] text-white text-[10px] font-bold uppercase tracking-wider">
                        Chuyên viên
                      </span>
                    )}
                  </td>

                  {/* Department */}
                  <td className="py-4 px-6 text-slate-700 font-medium">{emp.department}</td>

                  {/* Lock indicators */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${emp.status === 'Hoạt động' ? 'bg-[#627D47]' : 'bg-slate-400'}`} />
                      <span className={`font-semibold ${emp.status === 'Hoạt động' ? 'text-[#627D47]' : 'text-slate-400'}`}>
                        {emp.status}
                      </span>
                    </div>
                  </td>

                  {/* Channel managers */}
                  <td className="py-4 px-6 text-center text-slate-900 font-bold font-mono">
                    {emp.channelCount}
                  </td>

                  {/* Active Simulation Actions */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      
                      <button 
                        onClick={() => alert(`Reset quyền khóa token cho nhân viên "${emp.name}": Đã gửi mã cấp quyền OTP về ${emp.email}`)}
                        className="p-1.5 text-slate-400 hover:text-[#D32027] hover:bg-rose-50 rounded-lg transition-colors" 
                        title="Phân quyền khóa bảo mật"
                      >
                        <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                      </button>
                      
                      <button 
                        onClick={() => alert(`Chức năng chỉnh sửa hồ sơ nhân sự "${emp.name}": Đang được phát triển.`)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Chỉnh sửa hồ sơ"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>

                      {/* Lock Toggle */}
                      <button 
                        onClick={() => {
                          const action = emp.status === 'Hoạt động' ? 'khóa' : 'kích hoạt lại';
                          if (confirm(`Bạn chắc chắn muốn ${action} tài khoản hoạt động của nhân sự "${emp.name}"?`)) {
                            onToggleEmployeeStatus(emp.id);
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          emp.status === 'Hoạt động'
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-amber-600 hover:text-[#627D47] hover:bg-green-50'
                        }`}
                        title={emp.status === 'Hoạt động' ? "Vô hiệu hóa" : "Kích hoạt lại"}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {emp.status === 'Hoạt động' ? 'block' : 'lock_open'}
                        </span>
                      </button>

                      <button 
                        onClick={() => {
                          if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn nhân sự "${emp.name}" khỏi cơ sở dữ liệu DrKam? Thao tác này sẽ giải phóng tất cả các kênh rảnh.`)) {
                            onDeleteEmployee(emp.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa nhân viên"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>

                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info counts */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span className="text-slate-500 font-medium">
            Hiển thị 1 - {filteredEmployees.length} của {filteredEmployees.length} nhân sự
          </span>
          <div className="flex gap-1.5">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 cursor-not-allowed bg-white" disabled>
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#D32027] text-white font-bold text-xs">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs">2</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 cursor-not-allowed bg-white" disabled>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* CREATE NEW EMPLOYEE DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 relative animate-fade-in">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4 font-display">Đăng ký thành viên mới</h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Họ và Tên</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nhập họ tên nhân viên..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Địa chỉ Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="VD: name@drkam.vn"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Vai trò</label>
                  <select 
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                  >
                    <option value="Nhân viên">Chuyên viên</option>
                    <option value="Leader">Trưởng nhóm</option>
                    <option value="Admin">Quản trị viên</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nhóm Công Tác</label>
                  <select 
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                    value={groupVal}
                    onChange={(e) => setGroupVal(e.target.value)}
                  >
                    <option value="Kinh doanh HN">Kinh doanh Hà Nội</option>
                    <option value="Kinh doanh HCM">Kinh doanh HCM</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Customer Support">CSKH</option>
                    <option value="IT & Hệ thống">IT &amp; Hệ thống</option>
                  </select>
                </div>
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
