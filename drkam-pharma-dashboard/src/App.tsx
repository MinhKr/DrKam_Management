'use client';

import React, { useState, useEffect } from 'react';
import {
  INITIAL_SESSION,
  INITIAL_CHANNELS,
  INITIAL_REPORTS,
  INITIAL_EMPLOYEES,
  INITIAL_TARGETS,
  INITIAL_AUDIT_LOGS,
  UserSession,
  AffiliateChannel,
  DailyReport,
  Employee,
  TeamTarget,
  AuditLog
} from './types';

import LoginComponent from './components/LoginComponent';
import DashboardComponent from './components/DashboardComponent';
import DailyReportComponent from './components/DailyReportComponent';
import ChannelManagementComponent from './components/ChannelManagementComponent';
import EmployeeManagementComponent from './components/EmployeeManagementComponent';
import TargetKPIComponent from './components/TargetKPIComponent';
import DetailedStatisticsComponent from './components/DetailedStatisticsComponent';
import AuditLogsComponent from './components/AuditLogsComponent';

export default function App() {
  // ----------------------------------------------------
  // Persistent State Handlers (Sync with LocalStorage)
  // ----------------------------------------------------
  const [session, setSession] = useState<UserSession>(() => {
    try {
      const stored = localStorage.getItem('drkam_session');
      return stored ? JSON.parse(stored) : INITIAL_SESSION;
    } catch {
      return INITIAL_SESSION;
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

  // Active view tab state ("overview", "daily-report", "channels", "employees", "chi-tieu", "stats", "logs")
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('drkam_session', JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    localStorage.setItem('drkam_channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    localStorage.setItem('drkam_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('drkam_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('drkam_targets', JSON.stringify(targets));
  }, [targets]);

  useEffect(() => {
    localStorage.setItem('drkam_logs', JSON.stringify(logs));
  }, [logs]);

  // Handle Logout
  const handleLogout = () => {
    const updatedSession = { ...session, isLoggedIn: false };
    setSession(updatedSession);
    addAuditLog('Bảo mật', `Nhân sự ${session.name} đăng xuất khỏi hệ thống.`);
  };

  // Login Success
  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    addAuditLog('Bảo mật', `Nhân sự ${newSession.name} đăng nhập thành công với vai trò ${newSession.role}.`);
  };

  // Helper helper to write audit logs cleanly
  const addAuditLog = (module: string, action: string) => {
    const now = new Date();
    const formattedTimestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    const newLog: AuditLog = {
      id: "lg_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      timestamp: formattedTimestamp,
      operator: session ? session.name : 'Unknown User',
      action,
      ipAddress: '192.168.1.' + Math.floor(10 + Math.random() * 90),
      module
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // ----------------------------------------------------
  // Action handlers passed to child components
  // ----------------------------------------------------

  // Reports
  const handleAddReport = (newRep: DailyReport) => {
    setReports(prev => [newRep, ...prev]);
    addAuditLog('Báo cáo', `Đã thêm báo cáo ngày ${newRep.date} cho kênh "${newRep.channelName}" (Doanh thu: ${newRep.revenue.toLocaleString('vi-VN')} đ)`);
  };

  const handleDeleteReport = (id: string) => {
    const target = reports.find(r => r.id === id);
    setReports(prev => prev.filter(r => r.id !== id));
    if (target) {
      addAuditLog('Báo cáo', `Đã xóa báo cáo ngày ${target.date} của kênh "${target.channelName}"`);
    }
  };

  // Channels
  const handleAddChannel = (newChan: AffiliateChannel) => {
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

  const handleDeleteChannel = (id: string) => {
    const target = channels.find(c => c.id === id);
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
    setEmployees(prev => [...prev, newEmp]);
    addAuditLog('Bảo mật', `Đã tuyển dụng/phân quyền tài khoản mới cho: "${newEmp.name}" (${newEmp.role})`);
  };

  const handleToggleEmployeeStatus = (empId: string) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === empId) {
        const nextStatus = emp.status === 'Hoạt động' ? 'Đã khóa' : 'Hoạt động';
        addAuditLog('Bảo mật', `Cập nhật trạng thái nhân viên "${emp.name}" chuyển sang: ${nextStatus}.`);
        return { ...emp, status: nextStatus };
      }
      return emp;
    }));
  };

  const handleDeleteEmployee = (empId: string) => {
    const target = employees.find(e => e.id === empId);
    setEmployees(prev => prev.filter(e => e.id !== empId));
    if (target) {
      addAuditLog('Bảo mật', `Xóa vĩnh viễn quyền truy cập tài khoản của: "${target.name}".`);
    }
  };

  // KPI Targets
  const handleUpdateTarget = (id: string, newTarget: number, newAchieved: number) => {
    setTargets(prev => prev.map(t => {
      if (t.id === id) {
        addAuditLog('Chỉ tiêu', `Cập nhật KPI ${t.employeeName}: Chỉ tiêu mới: ${newTarget.toLocaleString('vi-VN')} đ, Đạt được: ${newAchieved.toLocaleString('vi-VN')} đ`);
        return { ...t, targetRevenue: newTarget, achievedRevenue: newAchieved };
      }
      return t;
    }));
  };

  const handleAddTarget = (newTarget: TeamTarget) => {
    setTargets(prev => [...prev, newTarget]);
    addAuditLog('Chỉ tiêu', `Thiết lập KPI mục tiêu mới cho ${newTarget.employeeName} nhóm ${newTarget.department}: ${newTarget.targetRevenue.toLocaleString('vi-VN')} đ`);
  };

  // Clear log history
  const handleClearLogs = () => {
    setLogs([]);
    addAuditLog('Bảo mật', 'Người vận hành xóa sạch nhật ký dấu vết rà soát hệ thống.');
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
                <span className="material-symbols-outlined text-[18px]">add_task</span>
                <span>Báo cáo ngày mới</span>
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
