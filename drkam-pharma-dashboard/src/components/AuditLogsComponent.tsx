import React from 'react';
import { AuditLog } from '../types';

interface AuditLogsProps {
  logs: AuditLog[];
  onClearLogs: () => void;
}

export default function AuditLogsComponent({ logs, onClearLogs }: AuditLogsProps) {
  return (
    <div className="flex flex-col gap-6 text-slate-800">
      
      {/* Page Title & Interactive Utilities */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 font-display">Nhật ký hệ thống</h1>
          <p className="text-sm text-slate-500 mt-1">
            Nhật ký kiểm toán bảo mật, lưu vết các thao tác thay đổi giá trị báo cáo doanh số, cấu trúc tài khoản.
          </p>
        </div>

        <button 
          onClick={() => {
            if (confirm("Chắc chắn muốn làm sạch lịch sử thao tác? Hành động này chỉ áp dụng trên bộ nhớ đệm.")) {
              onClearLogs();
            }
          }}
          className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-stone-50 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">clear_all</span>
          <span>Dọn dẹp nhật ký</span>
        </button>
      </div>

      {/* Logs table list */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-6 w-52">Thời gian</th>
                <th className="py-4 px-4">Nhân sự thực hiện</th>
                <th className="py-4 px-4">Thao tác</th>
                <th className="py-4 px-4">Phân hệ</th>
                <th className="py-4 px-6 text-right">Địa chỉ IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    Nhật ký trống rỗng.
                  </td>
                </tr>
              ) : (
                logs.map((lg) => (
                  <tr key={lg.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">{lg.timestamp}</td>
                    <td className="py-4 px-4 font-semibold text-slate-900">{lg.operator}</td>
                    <td className="py-4 px-4 text-slate-700">{lg.action}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        lg.module === 'Bảo mật' 
                          ? 'bg-rose-50 text-[#D32027]' 
                          : lg.module === 'Báo cáo'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {lg.module}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-slate-400 text-xs">{lg.ipAddress}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
