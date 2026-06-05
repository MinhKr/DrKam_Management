'use client';

import React, { useState, useEffect } from 'react';
import {
  INITIAL_SESSION,
  INITIAL_CHANNELS,
  INITIAL_REPORTS,
  INITIAL_EMPLOYEES,
  INITIAL_TARGETS,
  INITIAL_AUDIT_LOGS,
  INITIAL_FB_PAGES,
  UserSession,
  AffiliateChannel,
  DailyReport,
  Employee,
  TeamTarget,
  AuditLog,
  FbPage
} from './types';

import LoginComponent from './components/LoginComponent';
import DashboardComponent from './components/DashboardComponent';
import DailyReportComponent from './components/DailyReportComponent';
import FacebookReportComponent from './components/FacebookReportComponent';
import ChannelManagementComponent from './components/ChannelManagementComponent';
import EmployeeManagementComponent from './components/EmployeeManagementComponent';
import TargetKPIComponent from './components/TargetKPIComponent';
import DetailedStatisticsComponent from './components/DetailedStatisticsComponent';
import AuditLogsComponent from './components/AuditLogsComponent';

import { isSupabaseConfigured } from '@/lib/supabase/client';
import * as repo from './data/repositories';
import { getCurrentSession, getCurrentUserId, signOut } from './data/auth';

// Phiên bản dữ liệu mẫu (demo). Tăng giá trị này mỗi khi đổi dữ liệu INITIAL_* để
// tự nạp lại trên trình duyệt cũ (xóa localStorage demo cũ), không cần xóa cache thủ công.
const SEED_VERSION = '2026-06-05-fb-koc-5';
let demoMigrated = false;
function migrateDemoData() {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem('drkam_seed_version') !== SEED_VERSION) {
      ['drkam_session', 'drkam_channels', 'drkam_reports', 'drkam_employees', 'drkam_targets', 'drkam_logs', 'drkam_fb_pages']
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('drkam_seed_version', SEED_VERSION);
    }
  } catch {
    /* bỏ qua */
  }
}

export default function App() {
  // Bật chế độ DB thật khi đã cấu hình .env.local; ngược lại chạy demo localStorage.
  const cloud = isSupabaseConfigured;
  // Nạp lại dữ liệu mẫu nếu phiên bản seed thay đổi (chạy 1 lần, trước khi đọc localStorage).
  if (!demoMigrated) {
    demoMigrated = true;
    migrateDemoData();
  }
  // ----------------------------------------------------
  // Persistent State Handlers (Sync with LocalStorage)
  // ----------------------------------------------------
  const [session, setSession] = useState<UserSession>(() => {
    // Chế độ DB thật: luôn bắt đầu ở trạng thái chưa đăng nhập, chờ xác thực Supabase.
    if (cloud) return { ...INITIAL_SESSION, isLoggedIn: false };
    // Chế độ demo: bắt đầu ở màn đăng nhập; nếu đã đăng nhập trước đó thì khôi phục từ localStorage.
    try {
      const stored = localStorage.getItem('drkam_session');
      return stored ? JSON.parse(stored) : { ...INITIAL_SESSION, isLoggedIn: false };
    } catch {
      return { ...INITIAL_SESSION, isLoggedIn: false };
    }
  });

  const [channels, setChannels] = useState<AffiliateChannel[]>(() => {
    try {
      const stored = localStorage.getItem('drkam_channels');
      return stored ? JSON.parse(stored) : INITIAL_CHANNELS;
    } catch {
      return INITIAL_CHANNELS;
    }
  });

  const [reports, setReports] = useState<DailyReport[]>(() => {
    try {
      const stored = localStorage.getItem('drkam_reports');
      return stored ? JSON.parse(stored) : INITIAL_REPORTS;
    } catch {
      return INITIAL_REPORTS;
    }
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const stored = localStorage.getItem('drkam_employees');
      return stored ? JSON.parse(stored) : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  });

  const [targets, setTargets] = useState<TeamTarget[]>(() => {
    try {
      const stored = localStorage.getItem('drkam_targets');
      return stored ? JSON.parse(stored) : INITIAL_TARGETS;
    } catch {
      return INITIAL_TARGETS;
    }
  });

  const [logs, setLogs] = useState<AuditLog[]>(() => {
    try {
      const stored = localStorage.getItem('drkam_logs');
      return stored ? JSON.parse(stored) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  // Fanpage Facebook theo ID Shopee KOC inhouse.
  // (Tạm lưu localStorage; mô hình DB cho phần này sẽ bổ sung cùng bước Admin gắn ID — để sau.)
  const [fbPages, setFbPages] = useState<FbPage[]>(() => {
    try {
      const stored = localStorage.getItem('drkam_fb_pages');
      return stored ? JSON.parse(stored) : INITIAL_FB_PAGES;
    } catch {
      return INITIAL_FB_PAGES;
    }
  });

  // Active view tab state ("overview", "daily-report", "channels", "employees", "chi-tieu", "stats", "logs")
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  // ID user Supabase đang đăng nhập (dùng cho created_by khi ghi dữ liệu).
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Sync to localStorage — chỉ ở chế độ demo (không nối Supabase).
  useEffect(() => {
    if (cloud) return;
    localStorage.setItem('drkam_session', JSON.stringify(session));
  }, [session, cloud]);

  useEffect(() => {
    if (cloud) return;
    localStorage.setItem('drkam_channels', JSON.stringify(channels));
  }, [channels, cloud]);

  useEffect(() => {
    if (cloud) return;
    localStorage.setItem('drkam_reports', JSON.stringify(reports));
  }, [reports, cloud]);

  useEffect(() => {
    if (cloud) return;
    localStorage.setItem('drkam_employees', JSON.stringify(employees));
  }, [employees, cloud]);

  useEffect(() => {
    if (cloud) return;
    localStorage.setItem('drkam_targets', JSON.stringify(targets));
  }, [targets, cloud]);

  useEffect(() => {
    if (cloud) return;
    localStorage.setItem('drkam_logs', JSON.stringify(logs));
  }, [logs, cloud]);

  // fbPages: luôn lưu localStorage (chưa có bảng DB cho phần này).
  useEffect(() => {
    localStorage.setItem('drkam_fb_pages', JSON.stringify(fbPages));
  }, [fbPages]);

  // Chế độ DB thật: khôi phục phiên đăng nhập + nạp toàn bộ dữ liệu khi mở app.
  useEffect(() => {
    if (!cloud) return;
    let active = true;
    (async () => {
      try {
        const restored = await getCurrentSession();
        if (active && restored) setSession(restored);
        else if (active) setSession({ ...INITIAL_SESSION, isLoggedIn: false });
        setCurrentUserId(await getCurrentUserId());
      } catch {
        if (active) setSession({ ...INITIAL_SESSION, isLoggedIn: false });
      }
    })();
    return () => {
      active = false;
    };
  }, [cloud]);

  // Tải dữ liệu từ Supabase mỗi khi đăng nhập thành công (chế độ cloud).
  useEffect(() => {
    if (!cloud || !session.isLoggedIn) return;
    let active = true;
    (async () => {
      try {
        // Đảm bảo có ID người dùng (dùng cho created_by khi ghi dữ liệu).
        const uid = await getCurrentUserId();
        if (active) setCurrentUserId(uid);
        const [ch, rp, emp, tg] = await Promise.all([
          repo.loadChannels(),
          repo.loadReports(),
          repo.loadEmployees(),
          repo.loadTargets(),
        ]);
        if (!active) return;
        setChannels(ch);
        setReports(rp);
        setEmployees(emp);
        setTargets(tg);
        // Nhật ký chỉ Admin xem được (RLS) — bỏ qua lỗi với vai trò khác.
        try {
          const lg = await repo.loadLogs();
          if (active) setLogs(lg);
        } catch {
          if (active) setLogs([]);
        }
      } catch (err) {
        console.error('Tải dữ liệu Supabase thất bại:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [cloud, session.isLoggedIn]);

  // Handle Logout
  const handleLogout = async () => {
    addAuditLog('Bảo mật', `Nhân sự ${session.name} đăng xuất khỏi hệ thống.`);
    if (cloud) await signOut();
    setSession({ ...session, isLoggedIn: false });
  };

  // Login Success
  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    addAuditLog('Bảo mật', `Nhân sự ${newSession.name} đăng nhập thành công với vai trò ${newSession.role}.`);
  };

  // Helper helper to write audit logs cleanly
  const addAuditLog = (module: string, action: string) => {
    const operator = session ? session.name : 'Unknown User';
    // Chế độ DB thật: ghi nhật ký vào Supabase (RLS cho phép mọi user INSERT).
    if (cloud) {
      void repo.insertLog({ operator, operatorId: currentUserId, action, module });
      return;
    }
    const now = new Date();
    const formattedTimestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    const newLog: AuditLog = {
      id: "lg_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      timestamp: formattedTimestamp,
      operator,
      action,
      ipAddress: '192.168.1.' + Math.floor(10 + Math.random() * 90),
      module
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // ----------------------------------------------------
  // Action handlers passed to child components
  // ----------------------------------------------------

  // Thông báo lỗi gọn
  const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

  // Reports
  const handleAddReport = async (newRep: DailyReport) => {
    if (cloud) {
      try {
        if (!currentUserId) throw new Error('Chưa xác định người dùng đăng nhập.');
        const saved = await repo.createReport(newRep, currentUserId);
        setReports(prev => [saved, ...prev]);
        addAuditLog('Báo cáo', `Đã thêm báo cáo ngày ${saved.date} cho kênh "${saved.channelName}" (Doanh thu: ${saved.revenue.toLocaleString('vi-VN')} đ)`);
      } catch (e) {
        alert('Lưu báo cáo thất bại: ' + errMsg(e));
      }
      return;
    }
    setReports(prev => [newRep, ...prev]);
    addAuditLog('Báo cáo', `Đã thêm báo cáo ngày ${newRep.date} cho kênh "${newRep.channelName}" (Doanh thu: ${newRep.revenue.toLocaleString('vi-VN')} đ)`);
  };

  const handleDeleteReport = async (id: string) => {
    const target = reports.find(r => r.id === id);
    if (cloud) {
      try {
        await repo.deleteReport(id);
      } catch (e) {
        alert('Xóa báo cáo thất bại: ' + errMsg(e));
        return;
      }
    }
    setReports(prev => prev.filter(r => r.id !== id));
    if (target) {
      addAuditLog('Báo cáo', `Đã xóa báo cáo ngày ${target.date} của kênh "${target.channelName}"`);
    }
  };

  // Channels
  const handleAddChannel = async (newChan: AffiliateChannel) => {
    if (cloud) {
      try {
        const saved = await repo.createChannel(newChan);
        setChannels(prev => [saved, ...prev]);
        addAuditLog('Hệ thống', `Đăng ký kênh affiliate mới: "${saved.name}" phân loại [${saved.channelType}] do ${saved.managerName} phụ trách.`);
      } catch (e) {
        alert('Tạo kênh thất bại: ' + errMsg(e));
      }
      return;
    }
    setChannels(prev => [newChan, ...prev]);
    // update manager's channelCount
    setEmployees(prev => prev.map(emp => {
      if (emp.name === newChan.managerName) {
        return { ...emp, channelCount: emp.channelCount + 1 };
      }
      return emp;
    }));
    addAuditLog('Hệ thống', `Đăng ký kênh affiliate mới: "${newChan.name}" phân loại [${newChan.channelType}] do ${newChan.managerName} phụ trách.`);
  };

  const handleDeleteChannel = async (id: string) => {
    const target = channels.find(c => c.id === id);
    if (cloud) {
      try {
        await repo.deleteChannel(id);
      } catch (e) {
        alert('Xóa kênh thất bại: ' + errMsg(e));
        return;
      }
      setChannels(prev => prev.filter(c => c.id !== id));
      if (target) addAuditLog('Hệ thống', `Hủy liên kết kênh affiliate: "${target.name}" khỏi hệ thống DrKam.`);
      return;
    }
    setChannels(prev => prev.filter(c => c.id !== id));
    if (target) {
      setEmployees(prev => prev.map(emp => {
        if (emp.name === target.managerName) {
          return { ...emp, channelCount: Math.max(0, emp.channelCount - 1) };
        }
        return emp;
      }));
      addAuditLog('Hệ thống', `Hủy liên kết kênh affiliate: "${target.name}" khỏi hệ thống phẫu DrKam.`);
    }
  };

  // Employees
  const handleAddEmployee = (newEmp: Employee) => {
    if (cloud) {
      // Tạo nhân sự mới cần tạo tài khoản qua Supabase Auth (quyền admin/service role),
      // không thực hiện trực tiếp từ trình duyệt — sẽ bổ sung ở bước sau.
      alert('Thêm nhân sự ở chế độ DB thật cần tạo tài khoản qua Supabase Auth (Admin). Tính năng này sẽ được bổ sung sau.');
      return;
    }
    setEmployees(prev => [...prev, newEmp]);
    addAuditLog('Bảo mật', `Đã tuyển dụng/phân quyền tài khoản mới cho: "${newEmp.name}" (${newEmp.role})`);
  };

  const handleToggleEmployeeStatus = async (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const nextStatus = emp.status === 'Hoạt động' ? 'Đã khóa' : 'Hoạt động';
    if (cloud) {
      try {
        await repo.setEmployeeStatus(empId, nextStatus);
      } catch (e) {
        alert('Cập nhật trạng thái thất bại: ' + errMsg(e));
        return;
      }
    }
    setEmployees(prev => prev.map(x => (x.id === empId ? { ...x, status: nextStatus } : x)));
    addAuditLog('Bảo mật', `Cập nhật trạng thái nhân viên "${emp.name}" chuyển sang: ${nextStatus}.`);
  };

  const handleDeleteEmployee = async (empId: string) => {
    const target = employees.find(e => e.id === empId);
    if (cloud) {
      try {
        await repo.deleteEmployee(empId);
      } catch (e) {
        alert('Xóa nhân sự thất bại: ' + errMsg(e));
        return;
      }
    }
    setEmployees(prev => prev.filter(e => e.id !== empId));
    if (target) {
      addAuditLog('Bảo mật', `Xóa vĩnh viễn quyền truy cập tài khoản của: "${target.name}".`);
    }
  };

  // KPI Targets
  const handleUpdateTarget = async (id: string, newTarget: number, newAchieved: number) => {
    const t = targets.find(x => x.id === id);
    if (cloud) {
      try {
        await repo.updateTarget(id, newTarget, newAchieved);
      } catch (e) {
        alert('Cập nhật KPI thất bại: ' + errMsg(e));
        return;
      }
    }
    setTargets(prev => prev.map(x => (x.id === id ? { ...x, targetRevenue: newTarget, achievedRevenue: newAchieved } : x)));
    if (t) addAuditLog('Chỉ tiêu', `Cập nhật KPI ${t.employeeName}: Chỉ tiêu mới: ${newTarget.toLocaleString('vi-VN')} đ, Đạt được: ${newAchieved.toLocaleString('vi-VN')} đ`);
  };

  const handleAddTarget = async (newTarget: TeamTarget) => {
    if (cloud) {
      try {
        const saved = await repo.createTarget(newTarget, currentUserId);
        setTargets(prev => [...prev, saved]);
        addAuditLog('Chỉ tiêu', `Thiết lập KPI mục tiêu mới cho ${saved.employeeName} nhóm ${saved.department}: ${saved.targetRevenue.toLocaleString('vi-VN')} đ`);
      } catch (e) {
        alert('Tạo KPI thất bại: ' + errMsg(e));
      }
      return;
    }
    setTargets(prev => [...prev, newTarget]);
    addAuditLog('Chỉ tiêu', `Thiết lập KPI mục tiêu mới cho ${newTarget.employeeName} nhóm ${newTarget.department}: ${newTarget.targetRevenue.toLocaleString('vi-VN')} đ`);
  };

  // Clear log history
  const handleClearLogs = async () => {
    if (cloud) {
      try {
        await repo.clearLogs();
      } catch (e) {
        alert('Xóa nhật ký thất bại: ' + errMsg(e));
        return;
      }
    }
    setLogs([]);
    addAuditLog('Bảo mật', 'Người vận hành xóa sạch nhật ký dấu vết rà soát hệ thống.');
  };

  // Fanpage Facebook (theo ID Shopee KOC inhouse)
  const handleAddFbPage = (page: FbPage) => {
    setFbPages(prev => [...prev, page]);
    addAuditLog('Hệ thống', `Thêm fanpage Facebook "${page.name}" vào nhóm ID Shopee.`);
  };

  const handleDeleteFbPage = (id: string) => {
    const target = fbPages.find(p => p.id === id);
    setFbPages(prev => prev.filter(p => p.id !== id));
    if (target) addAuditLog('Hệ thống', `Gỡ fanpage Facebook "${target.name}" khỏi nhóm ID Shopee.`);
  };

  // Role permissions checking helper
  const canAccessTab = (tab: string) => {
    if (session.role === 'Nhân viên') {
      // Employees cannot access logs, employee target listing, or modify employees
      return !['employees', 'chi-tieu', 'logs'].includes(tab);
    }
    return true;
  };

  // Safe navigation wrapper
  const navigateToTab = (tabId: string) => {
    if (canAccessTab(tabId)) {
      setActiveTab(tabId);
      setIsMobileMenuOpen(false);
    } else {
      alert(`Vai trò "${session.role}" hạn chế quyền hạn truy cập phân hệ này.`);
    }
  };

  // If user session is not logged in, render the login page directly
  if (!session || !session.isLoggedIn) {
    return <LoginComponent onLoginSuccess={handleLoginSuccess} />;
  }

  // Render main tab view based on selection
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardComponent reports={reports} targets={targets} onNavigateToTab={navigateToTab} />;
      case 'daily-report':
        return (
          <DailyReportComponent
            reports={reports}
            channels={channels}
            session={session}
            onAddReport={handleAddReport}
            onDeleteReport={handleDeleteReport}
          />
        );
      case 'fb-report':
        return (
          <FacebookReportComponent
            reports={reports}
            channels={channels}
            session={session}
            fbPages={fbPages}
            onAddReport={handleAddReport}
            onDeleteReport={handleDeleteReport}
            onAddFbPage={handleAddFbPage}
            onDeleteFbPage={handleDeleteFbPage}
          />
        );
      case 'channels':
        return (
          <ChannelManagementComponent
            channels={channels}
            employees={employees}
            onAddChannel={handleAddChannel}
            onDeleteChannel={handleDeleteChannel}
          />
        );
      case 'employees':
        return (
          <EmployeeManagementComponent
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onToggleEmployeeStatus={handleToggleEmployeeStatus}
            onDeleteEmployee={handleDeleteEmployee}
          />
        );
      case 'chi-tieu':
        return (
          <TargetKPIComponent
            targets={targets}
            onUpdateTarget={handleUpdateTarget}
            onAddTarget={handleAddTarget}
          />
        );
      case 'stats':
        return (
          <DetailedStatisticsComponent
            reports={reports}
            channels={channels}
          />
        );
      case 'logs':
        return (
          <AuditLogsComponent
            logs={logs}
            onClearLogs={handleClearLogs}
          />
        );
      default:
        return <DashboardComponent reports={reports} targets={targets} onNavigateToTab={navigateToTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col antialiased text-slate-800">
      
      {/* ----------------------------------------------------
          TOP NAVBAR HEADER 
         ---------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        
        {/* Left: Brand logo & Mobile Toggle Button */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D32027]/10"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32027] text-3xl font-extrabold">medication</span>
            <div className="flex flex-col">
              <span className="font-display font-black text-xl tracking-tight text-[#111827] uppercase leading-none">
                DrKam <span className="text-[#D32027] text-xs font-bold font-sans lowercase">Pharma</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Portal v2.5
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Simulated global search and profile panel */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Internal Search box (Hidden on small mobile) */}
          <div className="hidden md:flex relative w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#D32027]/20 focus:border-[#D32027] focus:bg-white transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  alert(`Đang tìm kiếm thông tin tương ứng...`);
                }
              }}
            />
          </div>

          {/* Simulated Notification Bell widget */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotificationPopup(!showNotificationPopup);
                setNotificationCount(0);
              }}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors relative focus:outline-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#D32027] text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Popup */}
            {showNotificationPopup && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 text-xs text-slate-700 dropdown-shadow">
                <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">Thông báo gần đây</span>
                  <button className="text-[10px] text-[#D32027] hover:underline font-bold" onClick={() => setShowNotificationPopup(false)}>Đóng</button>
                </div>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  <div className="p-3 hover:bg-slate-50 transition-colors flex gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-[16px] mt-0.5">warning</span>
                    <div>
                      <p className="font-semibold text-slate-900">Mất kết nối Shop API</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Kênh "spam_clone_01" vừa mất tín hiệu đồng bộ linkage shop.</p>
                    </div>
                  </div>
                  <div className="p-3 hover:bg-slate-50 transition-colors flex gap-2">
                    <span className="material-symbols-outlined text-green-600 text-[16px] mt-0.5">task_alt</span>
                    <div>
                      <p className="font-semibold text-slate-900">Chi tiêu KPI Hoàn thành</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Leader Nguyễn Văn A đạt vượt ngưỡng 120% kịch khung doanh thu tháng.</p>
                    </div>
                  </div>
                  <div className="p-3 hover:bg-slate-50 transition-colors flex gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-[16px] mt-0.5">info</span>
                    <div>
                      <p className="font-semibold text-slate-900">Phiên bản hoạt động</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Đã làm sạch mốc kiểm toán tự động, lịch sử log đã bật ghi đè rà soát.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200"></div>

          {/* Logged User Info Panel */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D32027]/20 flex-shrink-0">
              <img alt="User avatar" className="w-full h-full object-cover" src={session.avatar} />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-3">{session.name}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
                session.role === 'Admin' 
                  ? 'text-[#D32027]' 
                  : session.role === 'Leader' 
                  ? 'text-amber-700' 
                  : 'text-green-700'
              }`}>{session.role}</span>
            </div>
          </div>

          {/* Quick logout */}
          <button 
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none cursor-pointer"
            title="Đăng xuất hệ thống"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>

        </div>
      </header>

      {/* ----------------------------------------------------
          MAIN APP CANVAS (SIDEBAR + MAIN CONTENT WORKSPACE)
         ---------------------------------------------------- */}
      <div className="flex-1 flex relative">
        
        {/* SIDE BAR NAVIGATION (Desktop persistent, Mobile sliding Drawer) */}
        <aside className={`
          fixed lg:sticky top-0 lg:top-[61px] bottom-0 left-0 z-30 lg:z-10
          w-64 bg-white border-r border-slate-200/80 p-5 flex flex-col justify-between
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `} style={{ height: 'calc(100vh - 61px)' }}>
          
          <div className="space-y-6">
            
            {/* Quick overview of channels / status indicator */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Thời gian máy chủ</p>
              <p className="text-xs font-mono font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                <span>04/06/2026 14:20 GMT+7</span>
              </p>
            </div>

            {/* Navigation Tab options */}
            <nav className="flex flex-col gap-1">
              
              <button 
                onClick={() => navigateToTab('overview')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'overview' 
                    ? 'bg-rose-50 text-[#D32027]' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                <span>Tổng quan</span>
              </button>

              <button
                onClick={() => navigateToTab('daily-report')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'daily-report'
                    ? 'bg-rose-50 text-[#D32027]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">music_note</span>
                <span>TikTok</span>
              </button>

              <button
                onClick={() => navigateToTab('fb-report')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'fb-report'
                    ? 'bg-rose-50 text-[#D32027]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">dns</span>
                <span>Facebook</span>
              </button>

              <button 
                onClick={() => navigateToTab('channels')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'channels' 
                    ? 'bg-rose-50 text-[#D32027]' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">hub</span>
                <span>Quản lý kênh</span>
              </button>

              <button 
                onClick={() => navigateToTab('stats')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'stats' 
                    ? 'bg-rose-50 text-[#D32027]' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                <span>Thống kê chi tiết</span>
              </button>

              {/* Protected HR Tabs for Admin / Leader roles */}
              <div className="pt-4 border-t border-slate-100 my-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">Nhóm & Quản trị</p>
                
                <button 
                  onClick={() => navigateToTab('employees')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    !canAccessTab('employees') ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeTab === 'employees' 
                      ? 'bg-rose-50 text-[#D32027]' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  disabled={!canAccessTab('employees')}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">contacts</span>
                    <span>Quản lý nhân sự</span>
                  </div>
                  {!canAccessTab('employees') && <span className="material-symbols-outlined text-[14px]">lock</span>}
                </button>

                <button 
                  onClick={() => navigateToTab('chi-tieu')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    !canAccessTab('chi-tieu') ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeTab === 'chi-tieu' 
                      ? 'bg-rose-50 text-[#D32027]' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  disabled={!canAccessTab('chi-tieu')}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">target</span>
                    <span>Thiết lập KPI</span>
                  </div>
                  {!canAccessTab('chi-tieu') && <span className="material-symbols-outlined text-[14px]">lock</span>}
                </button>

                <button 
                  onClick={() => navigateToTab('logs')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    !canAccessTab('logs') ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeTab === 'logs' 
                      ? 'bg-rose-50 text-[#D32027]' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  disabled={!canAccessTab('logs')}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">security</span>
                    <span>Nhật ký hệ thống</span>
                  </div>
                  {!canAccessTab('logs') && <span className="material-symbols-outlined text-[14px]">lock</span>}
                </button>

              </div>
              
            </nav>
          </div>

          {/* Quick Stats Summary Footer in Sidebar */}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
              <span>Đang kết nối:</span>
              <span className="text-green-600 font-bold flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>{channels.filter(c => c.linkedShop === true).length}/{channels.length} Kênh</span>
              </span>
            </div>
            <div className="text-[10px] text-slate-400 text-center">
              Bảo mật SSL 256-bit hoạt động
            </div>
          </div>
        </aside>

        {/* Backdrop filter overlay for mobile menu drawer */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-20 bg-slate-950/20 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* MAIN DISPLAY WORKSPACE CANVAS CONTAINER */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-full">
          {renderTabContent()}
        </main>

      </div>

    </div>
  );
}
