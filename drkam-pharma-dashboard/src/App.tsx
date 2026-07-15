'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { withMediaActuals } from './lib/media';
import {
  INITIAL_SESSION,
  INITIAL_CHANNELS,
  INITIAL_REPORTS,
  INITIAL_EMPLOYEES,
  INITIAL_TARGETS,
  INITIAL_AUDIT_LOGS,
  INITIAL_FB_PAGES,
  INITIAL_CHECKLISTS,
  INITIAL_MEDIA_LOGS,
  INITIAL_MEDIA_KPI,
  INITIAL_MEDIA_IMPROVEMENTS,
  UserSession,
  AffiliateChannel,
  DailyReport,
  Employee,
  TeamTarget,
  AuditLog,
  FbPage,
  ChecklistItem,
  MediaTaskLog,
  MediaKpiEntry,
  MediaImprovement
} from './types';

import LoginComponent from './components/LoginComponent';
import DashboardComponent from './components/DashboardComponent';
import TikTokReportComponent, { TikTokDayRecord, TikTokView } from './components/TikTokReportComponent';
import FacebookReportComponent from './components/FacebookReportComponent';
import FacebookAdsComponent from './components/FacebookAdsComponent';
import ChannelManagementComponent from './components/ChannelManagementComponent';
import EmployeeManagementComponent from './components/EmployeeManagementComponent';
import TargetKPIComponent from './components/TargetKPIComponent';
import DetailedStatisticsComponent from './components/DetailedStatisticsComponent';
import AuditLogsComponent from './components/AuditLogsComponent';
import ContentChecklistComponent from './components/ContentChecklistComponent';
import MediaOverviewComponent from './components/MediaOverviewComponent';
import MediaDailyReportComponent from './components/MediaDailyReportComponent';
import MediaImprovementComponent from './components/MediaImprovementComponent';
import { FacebookIcon, TikTokIcon } from './components/BrandIcons';

import { isSupabaseConfigured } from '@/lib/supabase/client';
import * as repo from './data/repositories';
import { getCurrentSession, getCurrentUserId, signOut } from './data/auth';

// Phiên bản dữ liệu mẫu (demo). Tăng giá trị này mỗi khi đổi dữ liệu INITIAL_* để
// tự nạp lại trên trình duyệt cũ (xóa localStorage demo cũ), không cần xóa cache thủ công.
const SEED_VERSION = '2026-07-09-media-all-nhanvien';
let demoMigrated = false;
function migrateDemoData() {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem('drkam_seed_version') !== SEED_VERSION) {
      ['drkam_session', 'drkam_channels', 'drkam_reports', 'drkam_employees', 'drkam_targets', 'drkam_logs', 'drkam_fb_pages',
       'drkam_checklists', 'drkam_media_daily', 'drkam_media_logs', 'drkam_media_kpi', 'drkam_media_improvements']
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

  // Checklist công việc ngày — Team Content (cloud: bảng content_checklists; demo: localStorage).
  const [checklists, setChecklists] = useState<ChecklistItem[]>(() => {
    try {
      const stored = localStorage.getItem('drkam_checklists');
      return stored ? JSON.parse(stored) : INITIAL_CHECKLISTS;
    } catch {
      return INITIAL_CHECKLISTS;
    }
  });

  // ── TEAM MEDIA (giai đoạn 1: localStorage; cloud để giai đoạn 2) ──
  // Báo cáo ngày = các dòng công việc (mediaLogs). Số video tự đếm từ đây.
  const [mediaLogs, setMediaLogs] = useState<MediaTaskLog[]>(() => {
    try {
      const stored = localStorage.getItem('drkam_media_logs');
      return stored ? JSON.parse(stored) : INITIAL_MEDIA_LOGS;
    } catch { return INITIAL_MEDIA_LOGS; }
  });
  const [mediaKpi, setMediaKpi] = useState<MediaKpiEntry[]>(() => {
    try {
      const stored = localStorage.getItem('drkam_media_kpi');
      return stored ? JSON.parse(stored) : INITIAL_MEDIA_KPI;
    } catch { return INITIAL_MEDIA_KPI; }
  });
  // KPI Media với "Thực tế" tự tính từ team Content (số video + doanh thu TikTok/FB Ads).
  const mediaKpiWithActuals = useMemo(
    () => withMediaActuals(mediaKpi, mediaLogs, channels, reports),
    [mediaKpi, mediaLogs, channels, reports],
  );
  const [mediaImprovements, setMediaImprovements] = useState<MediaImprovement[]>(() => {
    try {
      const stored = localStorage.getItem('drkam_media_improvements');
      return stored ? JSON.parse(stored) : INITIAL_MEDIA_IMPROVEMENTS;
    } catch { return INITIAL_MEDIA_IMPROVEMENTS; }
  });

  // Active view tab state ("overview", "tiktok-brand"/"tiktok-real-koc"/"tiktok-ai-koc", "fb-koc"/"fb-brand", "channels", "employees", "chi-tieu", "stats", "logs")
  // Mặc định luôn mở mục Tổng quan mỗi khi vào app.
  const [activeTab, setActiveTab] = useState('overview');
  const [ttMenuOpen, setTtMenuOpen] = useState(true); // dropdown TikTok ở sidebar (mở sẵn)
  const [fbMenuOpen, setFbMenuOpen] = useState(false); // dropdown Facebook ở sidebar
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

  // fbPages: chỉ lưu localStorage ở chế độ demo (cloud dùng bảng fb_pages).
  useEffect(() => {
    if (cloud) return;
    localStorage.setItem('drkam_fb_pages', JSON.stringify(fbPages));
  }, [fbPages, cloud]);

  // checklists: chỉ lưu localStorage ở chế độ demo (cloud dùng bảng content_checklists).
  useEffect(() => {
    if (cloud) return;
    localStorage.setItem('drkam_checklists', JSON.stringify(checklists));
  }, [checklists, cloud]);

  // Team Media (giai đoạn 1: chỉ localStorage).
  useEffect(() => {
    if (cloud) return;
    localStorage.setItem('drkam_media_logs', JSON.stringify(mediaLogs));
  }, [mediaLogs, cloud]);
  useEffect(() => {
    if (cloud) return;
    localStorage.setItem('drkam_media_kpi', JSON.stringify(mediaKpi));
  }, [mediaKpi, cloud]);
  useEffect(() => {
    if (cloud) return;
    localStorage.setItem('drkam_media_improvements', JSON.stringify(mediaImprovements));
  }, [mediaImprovements, cloud]);

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
        // Fanpage Facebook — tách riêng để nếu bảng fb_pages chưa tạo (chưa chạy 0002)
        // thì các dữ liệu khác vẫn nạp bình thường.
        try {
          const pages = await repo.loadFbPages();
          if (active) setFbPages(pages);
        } catch (e) {
          console.warn('Tải fanpage Facebook thất bại (có thể chưa chạy migration 0002):', errMsg(e));
        }
        // Checklist Team Content — tách riêng để nếu bảng content_checklists chưa tạo
        // (chưa chạy migration 0004) thì các dữ liệu khác vẫn nạp bình thường.
        try {
          const cl = await repo.loadChecklists();
          if (active) setChecklists(cl);
        } catch (e) {
          console.warn('Tải checklist thất bại (có thể chưa chạy migration 0004):', errMsg(e));
        }
        // Team Media — tách riêng để nếu chưa chạy migration 0007 thì phần khác vẫn nạp.
        try {
          const [ml, mk, mi] = await Promise.all([
            repo.loadMediaLogs(),
            repo.loadMediaKpi(),
            repo.loadMediaImprovements(),
          ]);
          if (active) { setMediaLogs(ml); setMediaKpi(mk); setMediaImprovements(mi); }
        } catch (e) {
          console.warn('Tải dữ liệu Media thất bại (có thể chưa chạy migration 0007):', errMsg(e));
        }
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
  const handleLoginSuccess = async (newSession: UserSession) => {
    setSession(newSession);
    // Nick Media → vào thẳng "Tổng quan Media"; còn lại về "Tổng quan".
    const mediaLogin = newSession.department === 'Media' && newSession.role !== 'Admin';
    setActiveTab(mediaLogin ? 'media-overview' : 'overview');
    // Ghi log với danh tính NGƯỜI VỪA ĐĂNG NHẬP (không lấy session cũ — lúc này
    // setSession chưa kịp cập nhật nên session.name vẫn là tên mặc định cũ).
    const uid = cloud ? await getCurrentUserId() : null;
    if (cloud) setCurrentUserId(uid);
    addAuditLog('Bảo mật', `Nhân sự ${newSession.name} đăng nhập thành công với vai trò ${newSession.role}.`, newSession.name, uid);
  };

  // Helper helper to write audit logs cleanly.
  // operatorOverride / operatorIdOverride: dùng khi session state chưa kịp cập nhật (vd lúc login).
  const addAuditLog = (module: string, action: string, operatorOverride?: string, operatorIdOverride?: string | null) => {
    const operator = operatorOverride ?? (session ? session.name : 'Unknown User');
    const operatorId = operatorIdOverride !== undefined ? operatorIdOverride : currentUserId;
    // Chế độ DB thật: ghi nhật ký vào Supabase (RLS cho phép mọi user INSERT).
    if (cloud) {
      void repo.insertLog({ operator, operatorId, action, module });
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

  // Thông báo lỗi gọn. Lỗi Supabase là object {message, code,...} (không phải Error)
  // → phải đọc .message, nếu không sẽ ra "[object Object]".
  const errMsg = (e: unknown) => {
    if (e instanceof Error) return e.message;
    if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
    return String(e);
  };
  const errCode = (e: unknown) =>
    e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';

  // Tìm id kênh (UUID ở chế độ DB) theo tên kênh — báo cáo cần gắn channel_id.
  const findChannelId = (name: string) => channels.find(c => c.name === name)?.id;

  // Gộp 1 báo cáo (đã upsert) vào state: thay bản cũ cùng (kênh + ngày) nếu có.
  const mergeReport = (saved: DailyReport) =>
    setReports(prev => [saved, ...prev.filter(r => !(r.channelName === saved.channelName && r.date === saved.date))]);

  // Reports
  const handleAddReport = async (newRep: DailyReport) => {
    if (cloud) {
      try {
        if (!currentUserId) throw new Error('Chưa xác định người dùng đăng nhập.');
        const channelId = findChannelId(newRep.channelName);
        if (!channelId) throw new Error(`Không tìm thấy kênh "${newRep.channelName}" để gắn báo cáo.`);
        const saved = await repo.upsertReport(newRep, currentUserId, channelId);
        mergeReport(saved);
        addAuditLog('Báo cáo', `Đã lưu báo cáo ngày ${saved.date} cho kênh "${saved.channelName}" (Doanh thu: ${saved.revenue.toLocaleString('vi-VN')} đ)`);
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

  // Cập nhật kênh (dùng để gắn Page ID Facebook cho kênh thương hiệu)
  const handleUpdateChannel = (id: string, patch: Partial<AffiliateChannel>) => {
    setChannels(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
    // (Chế độ DB: lưu lên Supabase sẽ bổ sung sau — hiện chạy demo localStorage.)
  };

  // Báo cáo traffic 1 NGÀY cho 1 kênh thương hiệu (modal): upsert theo (kênh + ngày).
  // Ghi đủ 8 chỉ số (6 tự động + Views & Lưu nhập tay).
  type BrandDayRecord = {
    date: string; viewsReach: number; like: number; comment: number; share: number;
    save: number; completionRate: number; avgDuration: number; followerIncr: number;
    videoCount: number;
  };
  const handleReportDay = async (channelName: string, rec: BrandDayRecord) => {
    const traffic = {
      viewsReach: rec.viewsReach, comment: rec.comment, like: rec.like, share: rec.share,
      save: rec.save, viewAllRate: rec.completionRate, avgViewDuration: rec.avgDuration,
      followerIncr: rec.followerIncr,
    };
    const interactions = rec.like + rec.comment + rec.share || null;
    if (cloud) {
      try {
        if (!currentUserId) throw new Error('Chưa xác định người dùng đăng nhập.');
        const channelId = findChannelId(channelName);
        if (!channelId) throw new Error(`Không tìm thấy kênh "${channelName}" để gắn báo cáo.`);
        const rep: DailyReport = {
          id: '', date: rec.date, channelName, channelType: 'Facebook - Thương hiệu', revenue: 0,
          views: rec.viewsReach || null, interactions,
          source: session.role === 'Admin' ? 'Admin' : 'Nhân viên',
          isEditable: true, synced: false, traffic, note: null, videoCount: rec.videoCount ?? null,
        };
        const saved = await repo.upsertReport(rep, currentUserId, channelId);
        mergeReport(saved);
        addAuditLog('Báo cáo', `Báo cáo traffic Facebook ngày ${rec.date} — kênh "${channelName}"`);
      } catch (e) {
        alert('Lưu báo cáo thất bại: ' + errMsg(e));
      }
      return;
    }
    setReports(prev => {
      const idx = prev.findIndex(r => r.channelName === channelName && r.date === rec.date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], synced: false, views: rec.viewsReach || null, interactions, traffic, videoCount: rec.videoCount ?? null };
        return next;
      }
      return [{
        id: 'r_fbbrand_' + channelName.replace(/\s+/g, '') + '_' + rec.date.replace(/\//g, ''),
        date: rec.date, channelName, channelType: 'Facebook - Thương hiệu', revenue: 0,
        views: rec.viewsReach || null, interactions,
        source: session.role === 'Admin' ? 'Admin' : 'Nhân viên',
        isEditable: true, synced: false, traffic, note: null, videoCount: rec.videoCount ?? null,
      }, ...prev];
    });
    addAuditLog('Báo cáo', `Báo cáo traffic Facebook ngày ${rec.date} — kênh "${channelName}"`);
  };

  // Báo cáo TikTok 1 NGÀY cho 1 kênh (nhập tay): upsert theo (kênh + ngày).
  // Kênh thương hiệu ghi doanh thu + 8 chỉ số traffic; KOC chỉ ghi doanh thu.
  const handleTikTokReportDay = async (channelName: string, channelType: string, rec: TikTokDayRecord) => {
    const interactions = rec.traffic
      ? (rec.traffic.like + rec.traffic.comment + rec.traffic.share) || null
      : null;
    if (cloud) {
      try {
        if (!currentUserId) throw new Error('Chưa xác định người dùng đăng nhập.');
        const channelId = findChannelId(channelName);
        if (!channelId) throw new Error(`Không tìm thấy kênh "${channelName}" để gắn báo cáo.`);
        const rep: DailyReport = {
          id: '', date: rec.date, channelName, channelType, revenue: rec.revenue,
          views: rec.traffic ? (rec.traffic.viewsReach || null) : null,
          interactions, traffic: rec.traffic,
          source: session.role === 'Admin' ? 'Admin' : 'Nhân viên',
          isEditable: true, note: null, videoCount: rec.videoCount ?? null,
        };
        const saved = await repo.upsertReport(rep, currentUserId, channelId);
        mergeReport(saved);
        addAuditLog('Báo cáo', `Báo cáo TikTok ngày ${rec.date} — kênh "${channelName}" (Doanh thu: ${rec.revenue.toLocaleString('vi-VN')} đ)`);
      } catch (e) {
        alert('Lưu báo cáo thất bại: ' + errMsg(e));
      }
      return;
    }
    setReports(prev => {
      const idx = prev.findIndex(r => r.channelName === channelName && r.date === rec.date);
      const base = {
        date: rec.date, channelName, channelType, revenue: rec.revenue,
        views: rec.traffic ? (rec.traffic.viewsReach || null) : null,
        interactions, traffic: rec.traffic, note: null as string | null,
        videoCount: rec.videoCount ?? null,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...base };
        return next;
      }
      return [{
        id: 'r_tt_' + channelName.replace(/\W+/g, '') + '_' + rec.date.replace(/\//g, ''),
        source: session.role === 'Admin' ? 'Admin' : 'Nhân viên',
        isEditable: true, ...base,
      }, ...prev];
    });
    addAuditLog('Báo cáo', `Báo cáo TikTok ngày ${rec.date} — kênh "${channelName}" (Doanh thu: ${rec.revenue.toLocaleString('vi-VN')} đ)`);
  };

  // Channels
  const handleAddChannel = async (newChan: AffiliateChannel) => {
    if (cloud) {
      try {
        const saved = await repo.createChannel(newChan, currentUserId);
        setChannels(prev => [saved, ...prev]);
        addAuditLog('Hệ thống', `Đăng ký kênh affiliate mới: "${saved.name}" phân loại [${saved.channelType}] do ${saved.managerName} phụ trách.`);
      } catch (e) {
        if (errCode(e) === '23505') {
          alert(`Kênh "${newChan.name}" đã tồn tại trên ${newChan.platform}. Vui lòng dùng tên/ID khác.`);
        } else {
          alert('Tạo kênh thất bại: ' + errMsg(e));
        }
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
  const handleAddFbPage = async (page: FbPage) => {
    if (cloud) {
      try {
        const saved = await repo.createFbPage(page, currentUserId);
        setFbPages(prev => [...prev, saved]);
        addAuditLog('Hệ thống', `Thêm fanpage Facebook "${saved.name}" vào nhóm ID Shopee.`);
      } catch (e) {
        alert('Thêm fanpage thất bại: ' + errMsg(e));
      }
      return;
    }
    setFbPages(prev => [...prev, page]);
    addAuditLog('Hệ thống', `Thêm fanpage Facebook "${page.name}" vào nhóm ID Shopee.`);
  };

  const handleDeleteFbPage = async (id: string) => {
    const target = fbPages.find(p => p.id === id);
    if (cloud) {
      try {
        await repo.deleteFbPage(id);
      } catch (e) {
        alert('Gỡ fanpage thất bại: ' + errMsg(e));
        return;
      }
    }
    setFbPages(prev => prev.filter(p => p.id !== id));
    if (target) addAuditLog('Hệ thống', `Gỡ fanpage Facebook "${target.name}" khỏi nhóm ID Shopee.`);
  };

  // Checklist Team Content — mỗi nhân viên tự điền số lượng đầu việc/ngày.
  // Quyền: RLS + component chỉ cho sửa dòng của chính mình (employee_id = mình) hoặc Admin.
  const handleAddChecklistItem = async (item: ChecklistItem) => {
    if (cloud) {
      try {
        if (!currentUserId) throw new Error('Chưa xác định người dùng đăng nhập.');
        const saved = await repo.createChecklistItem(item, currentUserId);
        setChecklists(prev => [...prev, saved]);
        addAuditLog('Checklist', `Thêm đầu việc "${item.label}" (SL ${item.quantity}) — ${item.employeeName}, ngày ${item.date}`);
      } catch (e) {
        alert('Lưu checklist thất bại: ' + errMsg(e));
      }
      return;
    }
    setChecklists(prev => [...prev, item]);
    addAuditLog('Checklist', `Thêm đầu việc "${item.label}" — ${item.employeeName}, ngày ${item.date}`);
  };

  const handleUpdateChecklistItem = async (id: string, patch: { label?: string; quantity?: number; note?: string }) => {
    if (cloud) {
      try {
        await repo.updateChecklistItem(id, patch);
      } catch (e) {
        alert('Cập nhật checklist thất bại: ' + errMsg(e));
        return;
      }
    }
    setChecklists(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleDeleteChecklistItem = async (id: string) => {
    const target = checklists.find(c => c.id === id);
    if (cloud) {
      try {
        await repo.deleteChecklistItem(id);
      } catch (e) {
        alert('Xóa checklist thất bại: ' + errMsg(e));
        return;
      }
    }
    setChecklists(prev => prev.filter(c => c.id !== id));
    if (target) addAuditLog('Checklist', `Xóa đầu việc "${target.label}" — ${target.employeeName}, ngày ${target.date}`);
  };

  // ══════════════════════════════════════════════════════════════
  //  TEAM MEDIA handlers (giai đoạn 1: chỉ cập nhật state + localStorage)
  // ══════════════════════════════════════════════════════════════
  // A. Báo cáo ngày = các dòng công việc chi tiết (cloud: media_task_logs; demo: state).
  const handleAddMediaLog = async (log: MediaTaskLog) => {
    if (cloud) {
      try {
        if (!currentUserId) throw new Error('Chưa xác định người dùng đăng nhập.');
        const saved = await repo.createMediaLog(log, currentUserId);
        setMediaLogs(prev => [saved, ...prev]);
        addAuditLog('Media', `Thêm công việc "${log.task}" — ${log.employeeName}, ngày ${log.date}.`);
      } catch (e) { alert('Lưu báo cáo Media thất bại: ' + errMsg(e)); }
      return;
    }
    setMediaLogs(prev => [log, ...prev]);
    addAuditLog('Media', `Thêm công việc "${log.task}" — ${log.employeeName}, ngày ${log.date}.`);
  };
  const handleUpdateMediaLog = async (id: string, patch: Partial<MediaTaskLog>) => {
    if (cloud) {
      try { await repo.updateMediaLog(id, patch); }
      catch (e) { alert('Cập nhật báo cáo Media thất bại: ' + errMsg(e)); return; }
    }
    setMediaLogs(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  };
  const handleDeleteMediaLog = async (id: string) => {
    if (cloud) {
      try { await repo.deleteMediaLog(id); }
      catch (e) { alert('Xóa báo cáo Media thất bại: ' + errMsg(e)); return; }
    }
    setMediaLogs(prev => prev.filter(l => l.id !== id));
  };

  // C. KPI tháng (cloud: media_kpi_entries).
  const handleAddMediaKpi = async (entry: MediaKpiEntry) => {
    if (cloud) {
      try {
        if (!currentUserId) throw new Error('Chưa xác định người dùng đăng nhập.');
        const saved = await repo.createMediaKpi(entry, currentUserId);
        setMediaKpi(prev => [...prev, saved]);
        addAuditLog('Media', `Thêm chỉ số KPI "${entry.metric}" (${entry.period}) — ${entry.employeeName}.`);
      } catch (e) { alert('Lưu KPI Media thất bại: ' + errMsg(e)); }
      return;
    }
    setMediaKpi(prev => [...prev, entry]);
    addAuditLog('Media', `Thêm chỉ số KPI "${entry.metric}" (${entry.period}) — ${entry.employeeName}.`);
  };
  const handleUpdateMediaKpi = async (id: string, patch: Partial<MediaKpiEntry>) => {
    if (cloud) {
      try { await repo.updateMediaKpi(id, patch); }
      catch (e) { alert('Cập nhật KPI Media thất bại: ' + errMsg(e)); return; }
    }
    setMediaKpi(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
  };
  const handleDeleteMediaKpi = async (id: string) => {
    if (cloud) {
      try { await repo.deleteMediaKpi(id); }
      catch (e) { alert('Xóa KPI Media thất bại: ' + errMsg(e)); return; }
    }
    setMediaKpi(prev => prev.filter(e => e.id !== id));
  };

  // D. Đề xuất cải tiến (cloud: media_improvements).
  const handleAddMediaImprovement = async (item: MediaImprovement) => {
    if (cloud) {
      try {
        if (!currentUserId) throw new Error('Chưa xác định người dùng đăng nhập.');
        const saved = await repo.createMediaImprovement(item, currentUserId);
        setMediaImprovements(prev => [...prev, saved]);
        addAuditLog('Media', `Thêm đề xuất cải tiến "${item.issue.slice(0, 40)}…" (${item.period}).`);
      } catch (e) { alert('Lưu đề xuất Media thất bại: ' + errMsg(e)); }
      return;
    }
    setMediaImprovements(prev => [...prev, item]);
    addAuditLog('Media', `Thêm đề xuất cải tiến "${item.issue.slice(0, 40)}…" (${item.period}).`);
  };
  const handleUpdateMediaImprovement = async (id: string, patch: Partial<MediaImprovement>) => {
    if (cloud) {
      try { await repo.updateMediaImprovement(id, patch); }
      catch (e) { alert('Cập nhật đề xuất Media thất bại: ' + errMsg(e)); return; }
    }
    setMediaImprovements(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
  };
  const handleDeleteMediaImprovement = async (id: string) => {
    if (cloud) {
      try { await repo.deleteMediaImprovement(id); }
      catch (e) { alert('Xóa đề xuất Media thất bại: ' + errMsg(e)); return; }
    }
    setMediaImprovements(prev => prev.filter(i => i.id !== id));
  };

  // Cờ phân quyền hiển thị Media.
  const isMediaUser = session.department === 'Media' && session.role !== 'Admin';
  const isAdmin = session.role === 'Admin';

  // Danh sách tab của module Media.
  const MEDIA_TABS = ['media-overview', 'media-daily', 'media-improve'];

  // Role permissions checking helper
  const canAccessTab = (tab: string) => {
    // Nick Media (Khải/Sơn): CHỈ truy cập được các màn Media.
    if (isMediaUser) return MEDIA_TABS.includes(tab);

    // TẠM KHOÁ mọi mục ngoài TikTok & Facebook cho MỌI vai trò (giữ nguyên code, chỉ chặn truy cập).
    // Mở lại sau: thêm tab vào ALLOWED_TABS hoặc bỏ chặn này.
    const ALLOWED_TABS = ['overview', 'tiktok-brand', 'tiktok-real-koc', 'tiktok-ai-koc', 'fb-koc', 'fb-brand', 'fb-ads', 'checklist'];
    // Admin xem thêm cả module Media.
    const allowed = isAdmin ? [...ALLOWED_TABS, ...MEDIA_TABS] : ALLOWED_TABS;
    if (!allowed.includes(tab)) return false;

    // (Phân quyền theo vai trò trước đây — giữ lại để khôi phục khi mở khoá:)
    // if (session.role === 'Nhân viên') {
    //   return !['employees', 'chi-tieu', 'logs'].includes(tab);
    // }
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

  // Sidebar module Media (flat). Dùng làm sidebar duy nhất cho nick Media,
  // và là 1 mục nhóm phụ cho Admin.
  const MEDIA_NAV = [
    { tab: 'media-overview', label: 'Tổng quan Media',  icon: 'space_dashboard', accent: 'text-[#D32027] bg-rose-50' },
    { tab: 'media-daily',    label: 'Báo cáo ngày',     icon: 'bar_chart',       accent: 'text-indigo-600 bg-indigo-50' },
    { tab: 'media-improve',  label: 'Đề xuất cải tiến', icon: 'lightbulb',       accent: 'text-violet-600 bg-violet-50' },
  ];
  const renderMediaNav = () => (
    <div className={isMediaUser ? '' : 'pt-4 border-t border-slate-100 my-2'}>
      {!isMediaUser && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">Team Media</p>
      )}
      {MEDIA_NAV.map((item) => (
        <button
          key={item.tab}
          onClick={() => navigateToTab(item.tab)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
            activeTab === item.tab ? 'bg-rose-50 text-[#D32027]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.accent}`}>
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );

  // If user session is not logged in, render the login page directly
  if (!session || !session.isLoggedIn) {
    return <LoginComponent onLoginSuccess={handleLoginSuccess} />;
  }

  // Render main tab view based on selection
  const renderTabContent = () => {
    // Nick Media mở nhầm tab ngoài Media (vd sau khi reload demo) → về Tổng quan Media.
    if (isMediaUser && !MEDIA_TABS.includes(activeTab)) {
      return (
        <MediaOverviewComponent
          logs={mediaLogs}
          kpiEntries={mediaKpiWithActuals}
          employees={employees}
          session={session}
          onNavigateToTab={navigateToTab}
          onAddKpi={handleAddMediaKpi}
          onUpdateKpi={handleUpdateMediaKpi}
          onDeleteKpi={handleDeleteMediaKpi}
        />
      );
    }
    switch (activeTab) {
      case 'overview':
        return (
          <DashboardComponent
            reports={reports}
            channels={channels}
            employees={employees}
            checklists={checklists}
            session={session}
            currentUserId={currentUserId}
            onNavigateToTab={navigateToTab}
            onAddChecklistItem={handleAddChecklistItem}
            onUpdateChecklistItem={handleUpdateChecklistItem}
            onDeleteChecklistItem={handleDeleteChecklistItem}
          />
        );
      case 'tiktok-brand':
      case 'tiktok-real-koc':
      case 'tiktok-ai-koc': {
        const ttView: TikTokView =
          activeTab === 'tiktok-brand' ? 'brand' : activeTab === 'tiktok-real-koc' ? 'real-koc' : 'ai-koc';
        return (
          <TikTokReportComponent
            reports={reports}
            channels={channels}
            session={session}
            onReportDay={handleTikTokReportDay}
            onDeleteReport={handleDeleteReport}
            onAddChannel={handleAddChannel}
            view={ttView}
          />
        );
      }
      case 'fb-koc':
      case 'fb-brand':
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
            onReportDay={handleReportDay}
            onUpdateChannel={handleUpdateChannel}
            onAddChannel={handleAddChannel}
            view={activeTab === 'fb-brand' ? 'brand' : 'koc'}
          />
        );
      case 'fb-ads':
        return (
          <FacebookAdsComponent
            reports={reports}
            session={session}
            onAddReport={handleAddReport}
            onDeleteReport={handleDeleteReport}
          />
        );
      case 'checklist':
        return (
          <ContentChecklistComponent
            checklists={checklists}
            employees={employees}
            session={session}
            currentUserId={currentUserId}
            onAddItem={handleAddChecklistItem}
            onUpdateItem={handleUpdateChecklistItem}
            onDeleteItem={handleDeleteChecklistItem}
          />
        );
      case 'media-overview':
        return (
          <MediaOverviewComponent
            logs={mediaLogs}
            kpiEntries={mediaKpiWithActuals}
            employees={employees}
            session={session}
            onNavigateToTab={navigateToTab}
            onAddKpi={handleAddMediaKpi}
            onUpdateKpi={handleUpdateMediaKpi}
            onDeleteKpi={handleDeleteMediaKpi}
          />
        );
      case 'media-daily':
        return (
          <MediaDailyReportComponent
            logs={mediaLogs}
            employees={employees}
            session={session}
            onAdd={handleAddMediaLog}
            onUpdate={handleUpdateMediaLog}
            onDelete={handleDeleteMediaLog}
          />
        );
      case 'media-improve':
        return (
          <MediaImprovementComponent
            items={mediaImprovements}
            session={session}
            onAdd={handleAddMediaImprovement}
            onUpdate={handleUpdateMediaImprovement}
            onDelete={handleDeleteMediaImprovement}
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
        return (
          <DashboardComponent
            reports={reports}
            channels={channels}
            employees={employees}
            checklists={checklists}
            session={session}
            currentUserId={currentUserId}
            onNavigateToTab={navigateToTab}
            onAddChecklistItem={handleAddChecklistItem}
            onUpdateChecklistItem={handleUpdateChecklistItem}
            onDeleteChecklistItem={handleDeleteChecklistItem}
          />
        );
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
          
          <div className="space-y-6 flex-1 overflow-y-auto min-h-0 -mr-3 pr-3">

            {/* Navigation Tab options */}
            <nav className="flex flex-col gap-1">
              {isMediaUser ? renderMediaNav() : (<>
              <button
                onClick={() => navigateToTab('overview')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  !canAccessTab('overview') ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  activeTab === 'overview'
                    ? 'bg-rose-50 text-[#D32027]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                disabled={!canAccessTab('overview')}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-600 bg-indigo-50 flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px]">space_dashboard</span>
                  </span>
                  <span>Tổng quan</span>
                </div>
                {!canAccessTab('overview') && <span className="material-symbols-outlined text-[14px]">lock</span>}
              </button>

              {/* TikTok — nhóm dropdown 3 loại hình kênh */}
              <div>
                <button
                  onClick={() => setTtMenuOpen((o) => !o)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeTab.startsWith('tiktok-')
                      ? 'bg-rose-50 text-[#D32027]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900 text-white flex-shrink-0">
                      <TikTokIcon className="w-[17px] h-[17px]" />
                    </span>
                    <span>TikTok</span>
                  </div>
                  <span className={`material-symbols-outlined text-[18px] transition-transform ${ttMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {ttMenuOpen && (
                  <div className="mt-1 ml-4 pl-3 border-l border-slate-200 flex flex-col gap-1">
                    <button
                      onClick={() => navigateToTab('tiktok-brand')}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                        activeTab === 'tiktok-brand' ? 'bg-rose-50 text-[#D32027]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] text-fuchsia-500">verified</span>
                      <span>Kênh thương hiệu</span>
                    </button>
                    <button
                      onClick={() => navigateToTab('tiktok-real-koc')}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                        activeTab === 'tiktok-real-koc' ? 'bg-rose-50 text-[#D32027]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] text-fuchsia-500">face</span>
                      <span>KOC inhouse · Người thật</span>
                    </button>
                    <button
                      onClick={() => navigateToTab('tiktok-ai-koc')}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                        activeTab === 'tiktok-ai-koc' ? 'bg-rose-50 text-[#D32027]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] text-fuchsia-500">smart_toy</span>
                      <span>KOC inhouse · Kênh AI</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Facebook — nhóm dropdown 2 mục con */}
              <div>
                <button
                  onClick={() => setFbMenuOpen((o) => !o)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeTab === 'fb-koc' || activeTab === 'fb-brand' || activeTab === 'fb-ads'
                      ? 'bg-rose-50 text-[#D32027]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-[#1877F2] flex-shrink-0">
                      <FacebookIcon className="w-[19px] h-[19px]" />
                    </span>
                    <span>Facebook</span>
                  </div>
                  <span className={`material-symbols-outlined text-[18px] transition-transform ${fbMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {fbMenuOpen && (
                  <div className="mt-1 ml-4 pl-3 border-l border-slate-200 flex flex-col gap-1">
                    <button
                      onClick={() => navigateToTab('fb-koc')}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                        activeTab === 'fb-koc'
                          ? 'bg-rose-50 text-[#D32027]'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] text-blue-500">groups</span>
                      <span>KOC inhouse</span>
                    </button>
                    <button
                      onClick={() => navigateToTab('fb-brand')}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                        activeTab === 'fb-brand'
                          ? 'bg-rose-50 text-[#D32027]'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] text-blue-500">verified</span>
                      <span>Kênh thương hiệu</span>
                    </button>
                    <button
                      onClick={() => navigateToTab('fb-ads')}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                        activeTab === 'fb-ads'
                          ? 'bg-rose-50 text-[#D32027]'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] text-blue-500">ads_click</span>
                      <span>Facebook Ads</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigateToTab('checklist')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  !canAccessTab('checklist') ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  activeTab === 'checklist'
                    ? 'bg-rose-50 text-[#D32027]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                disabled={!canAccessTab('checklist')}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-teal-600 bg-teal-50 flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px]">checklist</span>
                  </span>
                  <span>Checklist</span>
                </div>
                {!canAccessTab('checklist') && <span className="material-symbols-outlined text-[14px]">lock</span>}
              </button>

              <button
                onClick={() => navigateToTab('stats')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  !canAccessTab('stats') ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  activeTab === 'stats'
                    ? 'bg-rose-50 text-[#D32027]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                disabled={!canAccessTab('stats')}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-600 bg-amber-50 flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px]">insights</span>
                  </span>
                  <span>Thống kê chi tiết</span>
                </div>
                {!canAccessTab('stats') && <span className="material-symbols-outlined text-[14px]">lock</span>}
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
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-600 bg-violet-50 flex-shrink-0">
                      <span className="material-symbols-outlined text-[18px]">badge</span>
                    </span>
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
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 bg-emerald-50 flex-shrink-0">
                      <span className="material-symbols-outlined text-[18px]">target</span>
                    </span>
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
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-cyan-600 bg-cyan-50 flex-shrink-0">
                      <span className="material-symbols-outlined text-[18px]">security</span>
                    </span>
                    <span>Nhật ký hệ thống</span>
                  </div>
                  {!canAccessTab('logs') && <span className="material-symbols-outlined text-[14px]">lock</span>}
                </button>

              </div>

              {/* Module Media — chỉ Admin thấy thêm ở đây (nick Media đã render riêng ở trên) */}
              {isAdmin && renderMediaNav()}
              </>)}
            </nav>
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
