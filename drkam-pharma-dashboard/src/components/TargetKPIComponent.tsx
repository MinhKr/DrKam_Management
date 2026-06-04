import React, { useState } from 'react';
import { TeamTarget } from '../types';

interface TargetKPIProps {
  targets: TeamTarget[];
  onUpdateTarget: (id: string, newTarget: number, newAchieved: number) => void;
  onAddTarget: (newTarget: TeamTarget) => void;
}

export default function TargetKPIComponent({ targets, onUpdateTarget, onAddTarget }: TargetKPIProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTargetVal, setEditTargetVal] = useState('');
  const [editAchievedVal, setEditAchievedVal] = useState('');

  // Add target states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'Leader' | 'NV' | 'NV Mới'>('NV');
  const [newDept, setNewDept] = useState('Nhóm Kinh Doanh 1');
  const [newTargetRevenue, setNewTargetRevenue] = useState('100000000');

  const startEdit = (t: TeamTarget) => {
    setEditingId(t.id);
    setEditTargetVal(t.targetRevenue.toString());
    setEditAchievedVal(t.achievedRevenue.toString());
  };

  const handleSaveEdit = (id: string) => {
    const tg = parseFloat(editTargetVal);
    const ac = parseFloat(editAchievedVal);
    if (isNaN(tg) || isNaN(ac)) {
      alert('Vui lòng nhập giá trị số hợp lệ.');
      return;
    }
    onUpdateTarget(id, tg, ac);
    setEditingId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const tVal = parseFloat(newTargetRevenue);
    const newTargetObj: TeamTarget = {
      id: "tgt_" + Date.now(),
      employeeName: newName,
      employeeRole: newRole,
      department: newDept,
      targetRevenue: isNaN(tVal) ? 100000000 : tVal,
      achievedRevenue: 0,
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwxcNk3h_dSy-QxPJwh7IZAx4IPd69V4i_4FlgAIlvGpHoE4f-UZIj64GPyBokv3MGwEUuU4DVvOS81ZV1ab3ZbJuSzeY9ZAUh68pyIlXV1GQlhMqsnDe9GgkijJuB1d63sf4q171JOYdQiXM5rFRPd6Hcd38tUF2isSe2BxoOEf3mcf7uun3rlRhQQb-klabcjUgssUIDmF8PD7MnjvbOichafwaOsnBSNFY1RMIRVMTjWYedKiTdu5PPWrflyzqwB9hfglsHmTZ7"
    };

    onAddTarget(newTargetObj);
    setNewName('');
    setShowAddForm(false);
    alert(`Đã thiết lập chỉ tiêu cho nhân sự ${newTargetObj.employeeName} thành công vĩnh viễn!`);
  };

  const numFormat = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val).replace('₫', 'đ');
  };

  return (
    <div className="flex flex-col gap-6 text-slate-800">
      
      {/* Target Title Headings */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 font-display">Chỉ tiêu kinh doanh</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý và cập nhật chỉ tiêu doanh số chi tiết cho từng cá nhân và nhóm công tác.</p>
        </div>
        
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-2 bg-[#D32027] hover:bg-red-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-soft transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">settings_suggest</span>
          <span>Thiết lập chỉ tiêu mới</span>
        </button>
      </div>

      {/* NEW TARGET CONFIG DIALOG */}
      {showAddForm && (
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-6 relative animate-fade-in shadow-sm">
          <button 
            onClick={() => setShowAddForm(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 font-display">Giao chỉ tiêu mới</h3>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tên nhân sự</label>
              <input 
                type="text" 
                required
                placeholder="Ví dụ: Nguyễn Văn Hải"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Vai trò</label>
              <select 
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white cursor-pointer"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
              >
                <option value="NV">Nhân viên chính thức</option>
                <option value="Leader">Trưởng nhóm</option>
                <option value="NV Mới">Nhân viên mới</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Doanh số kì hạn (VND)</label>
              <input 
                type="number" 
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                value={newTargetRevenue}
                onChange={(e) => setNewTargetRevenue(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="submit" 
                className="flex-1 text-xs font-bold py-2 bg-[#D32027] hover:bg-red-800 text-white rounded-lg transition-colors cursor-pointer"
              >
                Xác nhận
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="px-3 py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg bg-white hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BENTO GRID ENTRIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {targets.map((t) => {
          const rawPercentage = t.targetRevenue > 0 ? (t.achievedRevenue / t.targetRevenue) * 100 : 0;
          const percentage = Math.round(rawPercentage);
          
          // Color styles dependent on progress
          // > 90% is Red matching brand, 50-90 is amber, < 50 is dark Slate
          const progressColorClass = percentage >= 90 
            ? 'bg-[#D32027]' 
            : percentage >= 50 
            ? 'bg-amber-600' 
            : 'bg-slate-800';

          const pillBgClass = percentage >= 90
            ? 'bg-rose-50 text-[#D32027]'
            : percentage >= 50
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-100 text-slate-700';

          const isEditing = editingId === t.id;

          return (
            <div key={t.id} className="bg-white rounded-2xl p-6 border border-slate-200/60 soft-card-shadow flex flex-col justify-between gap-5 relative group transition-all hover:scale-[1.01] hover:shadow-md">
              
              {/* Card Header Info */}
              <div>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img alt="User" className="w-11 h-11 rounded-full object-cover border border-slate-100" src={t.avatar} />
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 group-hover:text-[#D32027] transition-colors truncate text-sm">{t.employeeName}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">{t.employeeRole}</span>
                        <span className="text-[10px] text-slate-400 truncate">{t.department}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* % Complete Pill indicator */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono shrink-0 ${pillBgClass}`}>
                    {percentage}%
                  </span>
                </div>

                {/* KPI details values */}
                <div className="mt-6 flex flex-col gap-3">
                  {isEditing ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Chỉ tiêu (VND)</label>
                        <input 
                          type="number" 
                          className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
                          value={editTargetVal}
                          onChange={(e) => setEditTargetVal(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Đạt được (VND)</label>
                        <input 
                          type="number" 
                          className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
                          value={editAchievedVal}
                          onChange={(e) => setEditAchievedVal(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        <button 
                          onClick={() => handleSaveEdit(t.id)}
                          className="flex-1 py-1 bg-green-700 hover:bg-green-800 text-white text-[10px] font-bold rounded"
                        >
                          Lưu
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="flex-1 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Only show target values */}
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Doanh thu chỉ tiêu</span>
                        <span className="font-bold text-slate-800">{numFormat(t.targetRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Thành quả đã đạt</span>
                        <span className="font-extrabold text-slate-950">{numFormat(t.achievedRevenue)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar & Actions Footer */}
              <div className="mt-4 pt-4 border-t border-slate-100/60">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${progressColorClass}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }} 
                  />
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lịch kiểm tra: Hàng tuần</span>
                  
                  {!isEditing && (
                    <button 
                      onClick={() => startEdit(t)}
                      className="text-[11px] font-bold text-[#D32027] hover:underline flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit_note</span>
                      <span>Sửa</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
