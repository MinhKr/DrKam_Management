import React, { useState } from 'react';
import { UserSession } from '../types';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { signIn } from '../data/auth';

interface LoginComponentProps {
  onLoginSuccess: (session: UserSession) => void;
}

// Avatar demo dùng chung (khớp INITIAL_EMPLOYEES).
const AV_ADMIN = "https://lh3.googleusercontent.com/aida-public/AB6AXuAwxcNk3h_dSy-QxPJwh7IZAx4IPd69V4i_4FlgAIlvGpHoE4f-UZIj64GPyBokv3MGwEUuU4DVvOS81ZV1ab3ZbJuSzeY9ZAUh68pyIlXV1GQlhMqsnDe9GgkijJuB1d63sf4q171JOYdQiXM5rFRPd6Hcd38tUF2isSe2BxoOEf3mcf7uun3rlRhQQb-klabcjUgssUIDmF8PD7MnjvbOichafwaOsnBSNFY1RMIRVMTjWYedKiTdu5PPWrflyzqwB9hfglsHmTZ7";
const AV_LEADER = "https://lh3.googleusercontent.com/aida-public/AB6AXuA7hJqbL0fQIqlo1FE3j4-WZeqTHw9cn0ga5_nxJXHO3hwKU5C-XJqfMIYYWJjYkI9UnaG4W_mmJ7z8QUlbxQ7YEow_HLbhZYA3FV3w2VgxdzlqIp4oB7TXAhzNG7620ml3yJ0apWRP7ynDUgBVvDzYSXMjoVtTM4bxOMGeXu7QNgwLsznEorRWpcXV-0H0Dh86o59C4oVRi4urL_DCGG9BRqyHPxMAIIs4AOuvVPY6FamKTifQkXK5OQbA2dIPyVLhtinhe2InKOon";
const AV_NV = "https://lh3.googleusercontent.com/aida-public/AB6AXuCA92GDkUbWvXrn22ZL-2GncLt7Id8ZSDOUJZqHbkIVe-CAKEETqOY0HWsDcQmZCwGn_pKGKFg-nexGWG2fu_xpawe2Gi3p6aAQ4EeEJpkvIDQrWFcobLYGXAEfmrqy4JWO4V-jRu9cYCYspqKYu83glAtBkmA15CEVA6BLuLzI-fYbochgbj3DXz_hAOPzfSKLb8TBzaZDMgBaM-UAwD7T4sO5CD04JuclO-qyumbM97sJh7nudS6RagQMoEmgD2cVYDjyvDuOvy6k";

// Các tài khoản mô phỏng ở chế độ demo (không nối Supabase).
type DemoAccount = { key: string; label: string; name: string; email: string; role: UserSession['role']; department?: string; avatar: string; active: string };
const DEMO_ACCOUNTS: DemoAccount[] = [
  { key: 'admin',      label: 'Admin',      name: 'Nguyễn Văn An',       email: 'an.nguyen@drkam.vn',   role: 'Admin',      avatar: AV_ADMIN,  active: 'bg-slate-900 text-white border-slate-900' },
  { key: 'leader',     label: 'Leader',     name: 'Trần Thị Bích',       email: 'bich.tran@drkam.vn',   role: 'Leader',     avatar: AV_LEADER, active: 'bg-amber-600 text-white border-amber-600' },
  { key: 'nv',         label: 'Nhân Viên',  name: 'Hoàng Yến Nhi',       email: 'nhi.hoang@drkam.vn',   role: 'Nhân viên',  avatar: AV_NV,     active: 'bg-green-700 text-white border-green-700' },
  { key: 'media-lead', label: 'Media · Khải', name: 'Nguyễn Trọng Khải', email: 'khaint@drkam.vn', role: 'Nhân viên', department: 'Media', avatar: AV_LEADER, active: 'bg-[#D32027] text-white border-[#D32027]' },
  { key: 'media-nv',   label: 'Media · Sơn',  name: 'Vũ Văn Sơn',        email: 'sonvv@drkam.vn',      role: 'Nhân viên', department: 'Media', avatar: AV_NV,     active: 'bg-[#D32027] text-white border-[#D32027]' },
];

export default function LoginComponent({ onLoginSuccess }: LoginComponentProps) {
  const cloud = isSupabaseConfigured;
  const [email, setEmail] = useState(cloud ? '' : 'an.nguyen@drkam.vn');
  const [password, setPassword] = useState(cloud ? '' : '••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [demoKey, setDemoKey] = useState('admin');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false); // popup hướng dẫn quên mật khẩu
  const account = DEMO_ACCOUNTS.find((a) => a.key === demoKey) ?? DEMO_ACCOUNTS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }

    // Chế độ DB thật: đăng nhập qua Supabase Auth
    if (cloud) {
      setLoading(true);
      setError('');
      try {
        const session = await signIn(email.trim(), password);
        onLoginSuccess(session);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Chế độ demo: tự đăng nhập theo tài khoản mô phỏng đã chọn.
    onLoginSuccess({
      isLoggedIn: true,
      name: account.name,
      email: email,
      role: account.role,
      avatar: account.avatar,
      department: account.department,
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F7F7F8] antialiased text-slate-800">
      
      {/* Left Section: Cover & Brand Branding (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[45%] bg-[#D32027] relative flex-col justify-center items-center p-12 overflow-hidden text-white">
        {/* Subtle grid accent background */}
        <div className="absolute inset-0 z-0 bg-opacity-[0.05] mix-blend-overlay bg-repeat" 
             style={{ 
               backgroundImage: `radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.3) 100%)`,
               backgroundSize: 'cover'
             }} 
        />
        
        {/* Background image mockup with dark overlay */}
        <div className="absolute inset-0 z-10 opacity-30 mix-blend-multiply">
          <img 
            alt="Healthcare professionals in clinic" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5igk1oXKPlBSdcWwB_ua7-CpUlrUjZCU6treF-zhjzdwUYSpmzrvXWVzAPOXFZya1lNIhzmA_ylPiym3SNOlZMV5fGim-jveIjyc8Drk4300qseWq7FR6xxT6xiExrFyVJiMBlZz4ukmis7_9m6IzwLDCBScnmvhz5o82uZm9GNHN7815hrBQgcLC341WtxgwE997enzpA3F2JZrcn-Bh9KKFaGDpd394ovujauQPZLsZbJZXxlioGSZwCzVsv25xBlxrcTw46c9g" 
          />
        </div>

        {/* Corporate welcome copy */}
        <div className="relative z-20 max-w-md text-center flex flex-col gap-6">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-4xl text-white">medication</span>
            <span className="font-display text-4xl font-extrabold tracking-tight">DrKam</span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-extrabold leading-tight text-white">
            Quản lý hiệu quả -<br/> Tăng trưởng doanh thu
          </h1>
          <p className="text-lg text-rose-100 font-light leading-relaxed max-w-sm mx-auto">
            Hệ thống quản trị toàn diện dành cho các kênh kinh doanh và affiliate của DrKam.
          </p>
          <div className="pt-8 border-t border-white/20 mt-4 flex items-center justify-center gap-4 text-xs font-mono text-rose-200">
            <span>DRKAM PHARMA MANAGEMENT SYSTEM v2.5</span>
          </div>
        </div>
      </div>

      {/* Right Section: Interactive Login Portal */}
      <div className="w-full md:w-1/2 lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-gradient-to-tr from-rose-50/50 to-white">
        
        {/* Decorative background light orb */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D32027]/[0.03] rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-400/[0.02] rounded-full blur-3xl pointer-events-none"></div>

        {/* Card Frame */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft border border-gray-100 p-8 sm:p-10 relative z-10 transition-all">
          
          <div className="text-center mb-8">
            {/* Soft Branding Wordmark */}
            <div className="inline-flex items-center gap-2 text-[#D32027] font-bold text-xl uppercase tracking-wider mb-2 font-display">
              <span className="material-symbols-outlined text-3xl">medication_liquid</span>
              <span>DrKam</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">Đăng nhập hệ thống</h2>
            <p className="text-sm text-gray-500 mt-1">Cổng thông tin báo cáo & tối ưu hóa hiệu suất</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2" htmlFor="email">
                Email nhân viên
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
                  mail
                </span>
                <input
                  type="email"
                  id="email"
                  className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] focus:bg-white transition-all text-sm"
                  placeholder="Nhập email của bạn..."
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  required
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2" htmlFor="password">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] focus:bg-white transition-all text-sm"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
              <div className="mt-2 text-right">
                <a href="#reset" className="text-xs font-semibold text-[#D32027] hover:underline" onClick={(e) => {
                  e.preventDefault();
                  setShowForgot(true);
                }}>
                  Quên mật khẩu?
                </a>
              </div>
            </div>

            {/* Role Simulation Sandbox — chỉ hiện ở chế độ demo (chưa nối Supabase) */}
            {!cloud && (
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mt-6">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Mô phỏng phân quyền đăng nhập:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => {
                      setDemoKey(a.key);
                      setEmail(a.email);
                    }}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all ${
                      demoKey === a.key
                        ? `${a.active} shadow-sm`
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2 italic text-center">
                * 2 nút <b className="text-[#D32027]">Media</b> đăng nhập vào màn riêng của team Media
              </p>
            </div>
            )}

            {/* Remember Me Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 text-[#D32027] focus:ring-[#D32027]/20 border-gray-300 rounded cursor-pointer"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-700 cursor-pointer select-none">
                Ghi nhớ đăng nhập trên thiết bị này
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md font-bold text-white bg-[#D32027] hover:bg-[#B70F1B] active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D32027] transition-colors cursor-pointer text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập hệ thống'}
            </button>
          </form>

        </div>
      </div>

      {/* Popup hướng dẫn khi quên mật khẩu */}
      {showForgot && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          onClick={() => setShowForgot(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <span className="w-12 h-12 rounded-full flex items-center justify-center bg-rose-50 text-[#D32027]">
                <span className="material-symbols-outlined text-2xl">lock_reset</span>
              </span>
              <h3 className="text-lg font-bold text-slate-900 font-display">Quên mật khẩu</h3>
              <p className="text-sm text-slate-500">
                Tiện ích đặt lại mật khẩu: Vui lòng liên hệ <b className="text-slate-700">Minh - phòng Marketing</b> để được trợ giúp.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="mt-6 w-full px-4 py-2.5 bg-[#D32027] hover:bg-[#B70F1B] text-white text-sm font-bold rounded-xl transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
