import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hộp thoại xác nhận hiện giữa màn hình (thay cho window.confirm mặc định). */
export default function ConfirmDialog({
  open,
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <span
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              danger ? 'bg-rose-50 text-[#D32027]' : 'bg-blue-50 text-blue-600'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">{danger ? 'warning' : 'help'}</span>
          </span>
          <h3 className="text-lg font-bold text-slate-900 font-display">{title}</h3>
          <p className="text-sm text-slate-500">{message}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition-colors ${
              danger ? 'bg-[#D32027] hover:bg-[#B70F1B]' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
