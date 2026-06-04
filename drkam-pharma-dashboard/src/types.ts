export interface UserSession {
  isLoggedIn: boolean;
  name: string;
  email: string;
  role: 'Admin' | 'Leader' | 'Nhân viên';
  avatar: string;
}

export interface AffiliateChannel {
  id: string;
  name: string;
  brandCategory: string; // e.g. "Brand Chính thức", "Fanpage FB", "Mạng lưới AI", "Clone Hàng loạt"
  platform: 'TikTok' | 'Facebook' | 'Shopee' | 'YouTube';
  channelType: 'Brand' | 'Real KOC' | 'AI KOC';
  linkedShop: boolean | 'disconnected'; // true = check_circle, false = cancel, 'disconnected' = link_off
  auditId: string;
  managerName: string;
  managerAvatar: string;
  status: 'Đã ra số' | 'Đang nuôi' | 'Bóp TT' | 'Đã khóa';
  tracking: {
    revenueActive: boolean;
    trafficActive: boolean;
  };
}

export interface DailyReport {
  id: string;
  date: string; // dd/mm/yyyy
  channelName: string;
  channelType: string; // e.g. "TikTok - Thương hiệu", "TikTok - KOC"
  revenue: number; // in VND
  views: number | null;
  interactions: number | null;
  source: 'Admin' | 'Nhân viên';
  isEditable: boolean; // report from < 3 days is editable
  traffic: {
    viewsReach: number;
    comment: number;
    like: number;
    share: number;
    save: number;
    viewAllRate: number; // %
    avgViewDuration: number; // seconds
    followerIncr: number;
  } | null;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Leader' | 'Nhân viên';
  department: string;
  status: 'Hoạt động' | 'Đã khóa';
  channelCount: number;
  avatar: string;
}

export interface TeamTarget {
  id: string;
  employeeName: string;
  employeeRole: 'Leader' | 'NV' | 'NV Mới';
  department: string; // e.g. "Nhóm Kinh Doanh 1"
  targetRevenue: number;
  achievedRevenue: number;
  avatar: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  ipAddress: string;
  module: string;
}

// Initial Mock Data
export const INITIAL_SESSION: UserSession = {
  isLoggedIn: true, // Defaulting true to keep preview live, option to logout & login is provided in UI
  name: "Nguyễn Văn A",
  email: "an.nguyen@drkam.vn",
  role: "Admin",
  avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDzgK9VTO2bMndoGRi5mpAZPKXzXULAxwsv563Xs8ZXMdcrW3-Pbna8vcc8U__VMqWD6VaE8O6VdcWbnLWyxo8frk-2LmgwvK16JVQFKQ2D5rSsAfo51L4RdAdhfNgtiTlf6ETiigQxpYA4XcbDd944S4bWW9FZad5psxK0RQuSmIyEi7uUPGH8orkJCTm43znGIfidVW5rx6PepxvxD4tXRRUzCf7YyiGkpryh7D0IGB0pGfYKBi483cKVOTVEiTazotM1Ye5jvtUx"
};

export const INITIAL_CHANNELS: AffiliateChannel[] = [
  {
    id: "1",
    name: "drkampharmaofficial",
    brandCategory: "Brand Chính thức",
    platform: "TikTok",
    channelType: "Brand",
    linkedShop: true,
    auditId: "#AUD-1042",
    managerName: "Trần Thị B",
    managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-SRAnv3abFtWFM3gIMsUq0WlWHZvg-5eYjh9Ld5LM3AWxB4Eo_FQFHblzAV9TBdVcCG-qlVo8RvlbI1OAInNjdyEF8Iw1Scrl4i0O3bo4pYKRC6fT-3xQ4kWxOFOYEVfi_W0VyDlonh-1u89UhcB6np2PCenVdOQck1gHjR3ZaHYf0lvTHL9ND7eDIreyH2wTiZiTVB-y7KDX0uSZGr5PZSgetOisUYcb05-K74b9XqgCiUMtaYojKPMnP9Mx91p3_icBtl3e5iT-",
    status: "Đã ra số",
    tracking: { revenueActive: true, trafficActive: true }
  },
  {
    id: "2",
    name: "drkam.vn",
    brandCategory: "Fanpage FB",
    platform: "Facebook",
    channelType: "Real KOC",
    linkedShop: false,
    auditId: "#AUD-1055",
    managerName: "Lê Văn C",
    managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD5BzNWZZeWZK9cuI4Pn6-fFYq43ihqelT5Yrk2ghXnhWStSgVUDvkRlW_MibCSkImIJC6FCkw4tbVLg0IatueQvhoh9i8f_WrngqiEUXzyQqRIjX8cqSvJVak8tmxm6qL4QIXbtwAYVPKyVRLkk3WZa0Jxf2kbzPZZoIcfPvKWVScof-5BHcigdatm6XwoZiKAenqQyKPITsBb8Ra7hrNtoxhvmxb9gJGsbFHgsw6L0EdCWf0R3pZn2tdEeMtijZmfkA_ROIQl3xdf",
    status: "Đang nuôi",
    tracking: { revenueActive: false, trafficActive: true }
  },
  {
    id: "3",
    name: "happyy.daily",
    brandCategory: "Mạng lưới AI",
    platform: "TikTok",
    channelType: "AI KOC",
    linkedShop: true,
    auditId: "#AUD-1088",
    managerName: "Nguyễn Văn A",
    managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCgXxpvZh2n-qg_DKJNGb8jhEagTdnZ53WDSCsc6c0jk2Zqq1iAg8NrQoQeEVHNT8yABGn09jjlR4BaTJ7u_noFnakJMjIy08kAT-RkIRD2DLj66tV63L9dizNNZ9q9EsOhIkA7yzJ9SM4hp6IXz4wckurQJn98ZZIVDKn3Oe2PpvSgEDJvETYJd_PR4zJycjIAirppC0TvvYJwVyIcJ0HhltemmIgHdPtAKCZHzq3ZZVP7LOvs6cTwwX0of5y9H6TJyIlz10CD8s96",
    status: "Bóp TT",
    tracking: { revenueActive: true, trafficActive: false }
  },
  {
    id: "4",
    name: "spam_clone_01",
    brandCategory: "Clone Hàng loạt",
    platform: "TikTok",
    channelType: "AI KOC",
    linkedShop: "disconnected",
    auditId: "#AUD-0912",
    managerName: "Trần Thị B",
    managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBZtzB81_LDhqXYgNQBc9szCoLFmYk6xtLLvlscmKuC2OODhWGdW83_t5ejWrxhtG2sMVkh8Qyl580Ze2Q9GtQXFWQBlvFIhkgjM-6ZaPp51wqZjhbmC9KNREnbm444X3OZmAaRp9HgEZ7KjRsvPD1PJWMrUJn9BmhhKIa-2rTS_FBHTAiFLI3TmMdlbyj6kCAfoqbJWTBwHXw6YfwiGs-347AiDeCB6eBxaKOdFVHuDqvQa1qon3P9a1fHqSwQ8hyrXy48itp2bems",
    status: "Đã khóa",
    tracking: { revenueActive: false, trafficActive: false }
  }
];

export const INITIAL_REPORTS: DailyReport[] = [
  {
    id: "r1",
    date: "24/10/2023",
    channelName: "drkamvn",
    channelType: "TikTok - Thương hiệu",
    revenue: 15000000,
    views: 50000,
    interactions: 1200,
    source: "Admin",
    isEditable: true,
    traffic: {
      viewsReach: 50000,
      comment: 450,
      like: 1200,
      share: 80,
      save: 110,
      viewAllRate: 48.2,
      avgViewDuration: 24.5,
      followerIncr: 150
    }
  },
  {
    id: "r2",
    date: "20/10/2023",
    channelName: "happyy.daily",
    channelType: "TikTok - KOC",
    revenue: 8000000,
    views: null,
    interactions: null,
    source: "Nhân viên",
    isEditable: false,
    traffic: null
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "e1",
    name: "Nguyễn Văn An",
    email: "an.nguyen@drkam.vn",
    role: "Admin",
    department: "IT & Hệ thống",
    status: "Hoạt động",
    channelCount: 12,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwxcNk3h_dSy-QxPJwh7IZAx4IPd69V4i_4FlgAIlvGpHoE4f-UZIj64GPyBokv3MGwEUuU4DVvOS81ZV1ab3ZbJuSzeY9ZAUh68pyIlXV1GQlhMqsnDe9GgkijJuB1d63sf4q171JOYdQiXM5rFRPd6Hcd38tUF2isSe2BxoOEf3mcf7uun3rlRhQQb-klabcjUgssUIDmF8PD7MnjvbOichafwaOsnBSNFY1RMIRVMTjWYedKiTdu5PPWrflyzqwB9hfglsHmTZ7"
  },
  {
    id: "e2",
    name: "Trần Thị Bích",
    email: "bich.tran@drkam.vn",
    role: "Leader",
    department: "Kinh doanh HCM",
    status: "Hoạt động",
    channelCount: 5,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-SRAnv3abFtWFM3gIMsUq0WlWHZvg-5eYjh9Ld5LM3AWxB4Eo_FQFHblzAV9TBdVcCG-qlVo8RvlbI1OAInNjdyEF8Iw1Scrl4i0O3bo4pYKRC6fT-3xQ4kWxOFOYEVfi_W0VyDlonh-1u89UhcB6np2PCenVdOQck1gHjR3ZaHYf0lvTHL9ND7eDIreyH2wTiZiTVB-y7KDX0uSZGr5PZSgetOisUYcb05-K74b9XqgCiUMtaYojKPMnP9Mx91p3_icBtl3e5iT-"
  },
  {
    id: "e3",
    name: "Lê Hoàng Cường",
    email: "cuong.le@drkam.vn",
    role: "Nhân viên",
    department: "CSKH",
    status: "Đã khóa",
    channelCount: 0,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAnCR8iG2Qiq6hnSHNzrV-US3P6wj8sGPTpTmQi6csB_DinYBNAA5zGVlgVBBDl3tHZBUGGfHiAqrSnBi3VZZDFKeYGEEzvmm_ZxSzrySVVscjnSD3a_N90_luiH_msP__w2dszfDRUuo-eboxCYCBVCy3h8WT4sC4bRkXXycdW3I9D5rW0d6SaISdgLWPrLB7vXsosGdLtZhm-TwNSiJPEnmztVNsuKRFzls9jiTFhD0N9ZkTITorlZuiPkR94HOJnmuCE6KlXtVIp"
  },
  {
    id: "e4",
    name: "Phạm Minh Tâm",
    email: "tam.pham@drkam.vn",
    role: "Nhân viên",
    department: "Kinh doanh HN",
    status: "Hoạt động",
    channelCount: 2,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCA92GDkUbWvXrn22ZL-2GncLt7Id8ZSDOUJZqHbkIVe-CAKEETqOY0HWsDcQmZCwGn_pKGKFg-nexGWG2fu_xpawe2Gi3p6aAQ4EeEJpkvIDQrWFcobLYGXAEfmrqy4JWO4V-jRu9cYCYspqKYu83glAtBkmA15CEVA6BLuLzI-fYbochgbj3DXz_hAOPzfSKLb8TBzaZDMgBaM-UAwD7T4sO5CD04JuclO-qyumbM97sJh7nudS6RagQMoEmgD2cVYDjyvDuOvy6k"
  }
];

export const INITIAL_TARGETS: TeamTarget[] = [
  {
    id: "t1",
    employeeName: "Nguyễn Văn A",
    employeeRole: "NV",
    department: "Nhóm Kinh Doanh 1",
    targetRevenue: 100000000,
    achievedRevenue: 92000000,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCBd-vzveFjQnMXwRBSE5hRbjWLkVKSfLRJyEVtt3FFF-EpnkYdvqVfaEBHaP5gubL_nohHV3L6KINm_ivztrBMZpNcjFGeKNuKgtOj8q6w7dkoLBn-ALRsk1bNuygMmLjT5A5xZqGOUqecdvXPzWI9JXfJLaIbUv3-OQ11U-_TqOSzAEQIL5XYRl5EXNgSiPbmiRmihM_th8rLJLAIZYOxgRnKkD5YxTYKZGpzSPdyE4TJjFJnpVAYphV_9UpuOLyW60NiMChPDnqr"
  },
  {
    id: "t2",
    employeeName: "Trần Thị B",
    employeeRole: "Leader",
    department: "Nhóm Kinh Doanh 1",
    targetRevenue: 150000000,
    achievedRevenue: 95000000,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuA7hJqbL0fQIqlo1FE3j4-WZeqTHw9cn0ga5_nxJXHO3hwKU5C-XJqfMIYYWJjYkI9UnaG4W_mmJ7z8QUlbxQ7YEow_HLbhZYA3FV3w2VgxdzlqIp4oB7TXAhzNG7620ml3yJ0apWRP7ynDUgBVvDzYSXMjoVtTM4bxOMGeXu7QNgwLsznEorRWpcXV-0H0Dh86o59C4oVRi4urL_DCGG9BRqyHPxMAIIs4AOuvVPY6FamKTifQkXK5OQbA2dIPyVLhtinhe2InKOon"
  },
  {
    id: "t3",
    employeeName: "Lê Văn C",
    employeeRole: "NV",
    department: "Nhóm Kinh Doanh 2",
    targetRevenue: 80000000,
    achievedRevenue: 25000000,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuB7goLbziQTnC2JUBRIyeKheBShX-MRMuRKl89X27RF4umEa-_0diYtjIFGG3sZnC3EldaGqNP1k7-1zuQXN4H1Lp1KMjZLT6TWr_3xkNDHJYyejU4-5dxwmXt7r3fwNUhWrN_QfAsD-iDAXttm-1Hlr4BqzIv4TKXKnQe-EFzihR3ZwbTuzxxcSqHswDXqRk8HrclGJyKD1NdWJDhv6rrUVKpnCVfRj9HwgvTFCyghdOT70e5GbJW1Z3bWoR10XY4OwRYV-CJboViX"
  },
  {
    id: "t4",
    employeeName: "Phạm Thị D",
    employeeRole: "NV Mới",
    department: "Nhóm Kinh Doanh 3",
    targetRevenue: 50000000,
    achievedRevenue: 0,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCA92GDkUbWvXrn22ZL-2GncLt7Id8ZSDOUJZqHbkIVe-CAKEETqOY0HWsDcQmZCwGn_pKGKFg-nexGWG2fu_xpawe2Gi3p6aAQ4EeEJpkvIDQrWFcobLYGXAEfmrqy4JWO4V-jRu9cYCYspqKYu83glAtBkmA15CEVA6BLuLzI-fYbochgbj3DXz_hAOPzfSKLb8TBzaZDMgBaM-UAwD7T4sO5CD04JuclO-qyumbM97sJh7nudS6RagQMoEmgD2cVYDjyvDuOvy6k"
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "lg1",
    timestamp: "2026-06-04 14:02:18",
    operator: "Nguyễn Văn An",
    action: "Đăng nhập vào hệ thống",
    ipAddress: "192.168.1.45",
    module: "Bảo mật"
  },
  {
    id: "lg2",
    timestamp: "2026-06-04 14:15:32",
    operator: "Nguyễn Văn An",
    action: "Lưu báo cáo ngày 24/10/2023 cho kênh drkamvn",
    ipAddress: "192.168.1.45",
    module: "Báo cáo"
  },
  {
    id: "lg3",
    timestamp: "2026-06-04 14:18:44",
    operator: "Nguyễn Văn An",
    action: "Cập nhật trạng thái kênh happyy.daily thành Bóp tương tác",
    ipAddress: "192.168.1.45",
    module: "Hệ thống"
  }
];
