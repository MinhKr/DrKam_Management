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
  note?: string | null; // ghi chú (dùng cho nhập tay doanh thu Shopee...)
  synced?: boolean; // true = 6 chỉ số traffic lấy tự động từ Facebook (Views/Lưu vẫn nhập tay)
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

// Kênh Facebook (fanpage) thuộc một ID Shopee KOC inhouse.
// Mỗi ID Shopee (1 thành viên) sở hữu nhiều fanpage; thành viên tự thêm để kiểm soát.
export interface FbPage {
  id: string;
  shopeeChannelId: string; // = AffiliateChannel.id của nhóm ID Shopee (KOC inhouse)
  name: string;            // tên / đường dẫn fanpage
  addedBy: string;         // tên người thêm
}

// Initial Mock Data
export const INITIAL_SESSION: UserSession = {
  isLoggedIn: true, // Defaulting true to keep preview live, option to logout & login is provided in UI
  name: "Nguyễn Văn A",
  email: "an.nguyen@drkam.vn",
  role: "Admin",
  avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDzgK9VTO2bMndoGRi5mpAZPKXzXULAxwsv563Xs8ZXMdcrW3-Pbna8vcc8U__VMqWD6VaE8O6VdcWbnLWyxo8frk-2LmgwvK16JVQFKQ2D5rSsAfo51L4RdAdhfNgtiTlf6ETiigQxpYA4XcbDd944S4bWW9FZad5psxK0RQuSmIyEi7uUPGH8orkJCTm43znGIfidVW5rx6PepxvxD4tXRRUzCf7YyiGkpryh7D0IGB0pGfYKBi483cKVOTVEiTazotM1Ye5jvtUx"
};

// Avatar dùng chung cho các kênh demo (rút gọn seed).
const AV = "https://lh3.googleusercontent.com/aida-public/AB6AXuD-SRAnv3abFtWFM3gIMsUq0WlWHZvg-5eYjh9Ld5LM3AWxB4Eo_FQFHblzAV9TBdVcCG-qlVo8RvlbI1OAInNjdyEF8Iw1Scrl4i0O3bo4pYKRC6fT-3xQ4kWxOFOYEVfi_W0VyDlonh-1u89UhcB6np2PCenVdOQck1gHjR3ZaHYf0lvTHL9ND7eDIreyH2wTiZiTVB-y7KDX0uSZGr5PZSgetOisUYcb05-K74b9XqgCiUMtaYojKPMnP9Mx91p3_icBtl3e5iT-";

export const INITIAL_CHANNELS: AffiliateChannel[] = [
  // ── TIKTOK — Kênh thương hiệu (gắn shop): doanh thu + traffic ──
  { id: "1",  name: "drkampharmaofficial", brandCategory: "Kênh thương hiệu", platform: "TikTok", channelType: "Brand", linkedShop: true, auditId: "drkampharmaofficial", managerName: "Trần Thị Bích", managerAvatar: AV, status: "Đã ra số", tracking: { revenueActive: true, trafficActive: true } },
  { id: "t2", name: "drkamvn",             brandCategory: "Kênh thương hiệu", platform: "TikTok", channelType: "Brand", linkedShop: true, auditId: "drkamvn",             managerName: "Trần Thị Bích", managerAvatar: AV, status: "Đã ra số", tracking: { revenueActive: true, trafficActive: true } },
  { id: "t3", name: "drkamvnofficial",     brandCategory: "Kênh thương hiệu", platform: "TikTok", channelType: "Brand", linkedShop: true, auditId: "drkamvnofficial",     managerName: "Nguyễn Văn An", managerAvatar: AV, status: "Đã ra số", tracking: { revenueActive: true, trafficActive: true } },
  // ── TIKTOK — KOC inhouse (không gắn shop) · Người thật: chỉ doanh thu ──
  { id: "t4", name: "happyy.daily",    brandCategory: "KOC Người thật", platform: "TikTok", channelType: "Real KOC", linkedShop: false, auditId: "happyy.daily",    managerName: "Nguyễn Văn An", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: true, trafficActive: false } },
  { id: "t5", name: "giadinhminhhee",  brandCategory: "KOC Người thật", platform: "TikTok", channelType: "Real KOC", linkedShop: false, auditId: "giadinhminhhee",  managerName: "Phạm Minh Tâm", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: true, trafficActive: false } },
  { id: "t6", name: "nhacuacamcam",    brandCategory: "KOC Người thật", platform: "TikTok", channelType: "Real KOC", linkedShop: false, auditId: "nhacuacamcam",    managerName: "Phạm Minh Tâm", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: true, trafficActive: false } },
  { id: "t7", name: "bao_chau_day",    brandCategory: "KOC Người thật", platform: "TikTok", channelType: "Real KOC", linkedShop: false, auditId: "bao_chau_day",    managerName: "Trần Thị Bích", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: true, trafficActive: false } },
  // ── TIKTOK — KOC inhouse (không gắn shop) · Kênh AI: chỉ doanh thu ──
  { id: "t8",  name: "koi_928tramtram", brandCategory: "KOC AI", platform: "TikTok", channelType: "AI KOC", linkedShop: false, auditId: "koi_928tramtram", managerName: "Nguyễn Văn An", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: true,  trafficActive: false } },
  { id: "t9",  name: "tinh642002",     brandCategory: "KOC AI", platform: "TikTok", channelType: "AI KOC", linkedShop: false, auditId: "tinh642002",     managerName: "Nguyễn Văn An", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: true,  trafficActive: false } },
  { id: "t10", name: "doisongsuckhoe86", brandCategory: "KOC AI", platform: "TikTok", channelType: "AI KOC", linkedShop: false, auditId: "doisongsuckhoe86", managerName: "Phạm Minh Tâm", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: false, trafficActive: false } },
  { id: "t11", name: "ngoc.huong259",  brandCategory: "KOC AI", platform: "TikTok", channelType: "AI KOC", linkedShop: false, auditId: "ngoc.huong259",  managerName: "Phạm Minh Tâm", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: true,  trafficActive: false } },
  { id: "t12", name: "haidang0136",    brandCategory: "KOC AI", platform: "TikTok", channelType: "AI KOC", linkedShop: false, auditId: "haidang0136",    managerName: "Trần Thị Bích", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: true,  trafficActive: false } },
  { id: "t13", name: "minhquan8046",   brandCategory: "KOC AI", platform: "TikTok", channelType: "AI KOC", linkedShop: false, auditId: "minhquan8046",   managerName: "Trần Thị Bích", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: true,  trafficActive: false } },
  { id: "t14", name: "quinchana82",    brandCategory: "KOC AI", platform: "TikTok", channelType: "AI KOC", linkedShop: false, auditId: "quinchana82",    managerName: "Nguyễn Văn An", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: true,  trafficActive: false } },
  { id: "t15", name: "anhquan9684",    brandCategory: "KOC AI", platform: "TikTok", channelType: "AI KOC", linkedShop: false, auditId: "anhquan9684",    managerName: "Nguyễn Văn An", managerAvatar: AV, status: "Đang nuôi", tracking: { revenueActive: true,  trafficActive: false } },
  // Facebook — KOC inhouse (fanpage, theo dõi doanh thu qua ID Affiliate / nguồn Shopee): chỉ doanh thu
  {
    id: "5",
    name: "conghaing",
    brandCategory: "KOC AI",
    platform: "Facebook",
    channelType: "AI KOC",
    linkedShop: false,
    auditId: "conghaing",
    managerName: "Nguyễn Công Hải",
    managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-SRAnv3abFtWFM3gIMsUq0WlWHZvg-5eYjh9Ld5LM3AWxB4Eo_FQFHblzAV9TBdVcCG-qlVo8RvlbI1OAInNjdyEF8Iw1Scrl4i0O3bo4pYKRC6fT-3xQ4kWxOFOYEVfi_W0VyDlonh-1u89UhcB6np2PCenVdOQck1gHjR3ZaHYf0lvTHL9ND7eDIreyH2wTiZiTVB-y7KDX0uSZGr5PZSgetOisUYcb05-K74b9XqgCiUMtaYojKPMnP9Mx91p3_icBtl3e5iT-",
    status: "Đang nuôi",
    tracking: { revenueActive: true, trafficActive: false }
  },
  {
    id: "6",
    name: "ynni1809",
    brandCategory: "KOC AI",
    platform: "Facebook",
    channelType: "AI KOC",
    linkedShop: false,
    auditId: "ynni1809",
    managerName: "Hoàng Yến Nhi",
    managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCA92GDkUbWvXrn22ZL-2GncLt7Id8ZSDOUJZqHbkIVe-CAKEETqOY0HWsDcQmZCwGn_pKGKFg-nexGWG2fu_xpawe2Gi3p6aAQ4EeEJpkvIDQrWFcobLYGXAEfmrqy4JWO4V-jRu9cYCYspqKYu83glAtBkmA15CEVA6BLuLzI-fYbochgbj3DXz_hAOPzfSKLb8TBzaZDMgBaM-UAwD7T4sO5CD04JuclO-qyumbM97sJh7nudS6RagQMoEmgD2cVYDjyvDuOvy6k",
    status: "Đang nuôi",
    tracking: { revenueActive: true, trafficActive: false }
  },
  {
    id: "7",
    name: "duocsikhanh",
    brandCategory: "KOC AI",
    platform: "Facebook",
    channelType: "AI KOC",
    linkedShop: false,
    auditId: "duocsikhanh",
    managerName: "Đặng Kim Khánh",
    managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAnCR8iG2Qiq6hnSHNzrV-US3P6wj8sGPTpTmQi6csB_DinYBNAA5zGVlgVBBDl3tHZBUGGfHiAqrSnBi3VZZDFKeYGEEzvmm_ZxSzrySVVscjnSD3a_N90_luiH_msP__w2dszfDRUuo-eboxCYCBVCy3h8WT4sC4bRkXXycdW3I9D5rW0d6SaISdgLWPrLB7vXsosGdLtZhm-TwNSiJPEnmztVNsuKRFzls9jiTFhD0N9ZkTITorlZuiPkR94HOJnmuCE6KlXtVIp",
    status: "Đang nuôi",
    tracking: { revenueActive: true, trafficActive: false }
  },
  // Facebook — Kênh thương hiệu: chỉ traffic (không doanh thu)
  {
    id: "8",
    name: "DrKam - Sống khỏe cùng Chuyên gia",
    brandCategory: "Kênh thương hiệu",
    platform: "Facebook",
    channelType: "Brand",
    linkedShop: false,
    auditId: "1029716813565392",
    managerName: "Trần Thị Bích",
    managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-SRAnv3abFtWFM3gIMsUq0WlWHZvg-5eYjh9Ld5LM3AWxB4Eo_FQFHblzAV9TBdVcCG-qlVo8RvlbI1OAInNjdyEF8Iw1Scrl4i0O3bo4pYKRC6fT-3xQ4kWxOFOYEVfi_W0VyDlonh-1u89UhcB6np2PCenVdOQck1gHjR3ZaHYf0lvTHL9ND7eDIreyH2wTiZiTVB-y7KDX0uSZGr5PZSgetOisUYcb05-K74b9XqgCiUMtaYojKPMnP9Mx91p3_icBtl3e5iT-",
    status: "Đang nuôi",
    tracking: { revenueActive: false, trafficActive: true }
  },
  {
    id: "9",
    name: "DrKam - Bác sĩ Răng Miệng Họng của mọi gia đình",
    brandCategory: "Kênh thương hiệu",
    platform: "Facebook",
    channelType: "Brand",
    linkedShop: false,
    auditId: "1048478565015781",
    managerName: "Nguyễn Văn An",
    managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwxcNk3h_dSy-QxPJwh7IZAx4IPd69V4i_4FlgAIlvGpHoE4f-UZIj64GPyBokv3MGwEUuU4DVvOS81ZV1ab3ZbJuSzeY9ZAUh68pyIlXV1GQlhMqsnDe9GgkijJuB1d63sf4q171JOYdQiXM5rFRPd6Hcd38tUF2isSe2BxoOEf3mcf7uun3rlRhQQb-klabcjUgssUIDmF8PD7MnjvbOichafwaOsnBSNFY1RMIRVMTjWYedKiTdu5PPWrflyzqwB9hfglsHmTZ7",
    status: "Đang nuôi",
    tracking: { revenueActive: false, trafficActive: true }
  }
];

// Sinh báo cáo TikTok mẫu nhiều ngày (để xem UI khi danh sách lịch sử dài).
// Số liệu tất định theo (seed, i) — trông thật mà không cần Math.random, ổn định giữa các lần tải.
function genTikTokSampleReports(): DailyReport[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateBack = (days: number) => {
    const d = new Date(2026, 5, 8); // mốc 08/06/2026 lùi dần
    d.setDate(d.getDate() - days);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const wave = (seed: number, i: number, base: number, amp: number) =>
    Math.max(0, Math.round(base + amp * Math.sin((i + seed) * 1.3) + amp * 0.4 * ((i * (seed + 3)) % 5)));

  const out: DailyReport[] = [];

  // Kênh thương hiệu: doanh thu + 8 chỉ số traffic
  const brand = [
    { name: 'drkamvn',             days: 20, seed: 1, rev: 14_000_000, views: 52_000 },
    { name: 'drkampharmaofficial', days: 17, seed: 4, rev: 11_000_000, views: 41_000 },
    { name: 'drkamvnofficial',     days: 13, seed: 7, rev: 8_500_000,  views: 33_000 },
  ];
  brand.forEach((ch) => {
    for (let i = 0; i < ch.days; i++) {
      const views = wave(ch.seed, i, ch.views, ch.views * 0.22);
      const like = wave(ch.seed, i, ch.views * 0.03, ch.views * 0.008);
      const comment = wave(ch.seed, i, 120, 60);
      const share = wave(ch.seed, i, 60, 35);
      const save = wave(ch.seed, i, 90, 45);
      out.push({
        id: `r_tt_${ch.name.replace(/\W+/g, '')}_${i}`,
        date: dateBack(i),
        channelName: ch.name,
        channelType: 'TikTok - Thương hiệu',
        revenue: wave(ch.seed, i, ch.rev, ch.rev * 0.3),
        views,
        interactions: like + comment + share,
        source: i % 3 === 0 ? 'Admin' : 'Nhân viên',
        isEditable: true,
        traffic: {
          viewsReach: views, comment, like, share, save,
          viewAllRate: Math.round((38 + (i % 7) * 1.6) * 10) / 10,
          avgViewDuration: Math.round((18 + (i % 5) * 1.4) * 10) / 10,
          followerIncr: wave(ch.seed, i, 140, 90),
        },
        note: null,
      });
    }
  });

  // KOC inhouse (Người thật + AI): chỉ doanh thu.
  // Phủ HẾT kênh (trừ doisongsuckhoe86 — cố ý để trống thể hiện trạng thái "Chưa bật DT")
  // để xem bảng + dashboard khi nhiều kênh có dễ nhìn không.
  const koc = [
    // ── Người thật ──
    { name: 'happyy.daily',    days: 16, seed: 2,  rev: 5_200_000 },
    { name: 'giadinhminhhee',  days: 13, seed: 5,  rev: 3_800_000 },
    { name: 'nhacuacamcam',    days: 11, seed: 8,  rev: 2_900_000 },
    { name: 'bao_chau_day',    days: 15, seed: 10, rev: 4_600_000 },
    // ── Kênh AI ──
    { name: 'koi_928tramtram', days: 14, seed: 3,  rev: 4_100_000 },
    { name: 'tinh642002',      days: 12, seed: 6,  rev: 3_300_000 },
    { name: 'ngoc.huong259',   days: 9,  seed: 9,  rev: 2_400_000 },
    { name: 'haidang0136',     days: 13, seed: 11, rev: 3_100_000 },
    { name: 'minhquan8046',    days: 10, seed: 12, rev: 2_050_000 },
    { name: 'quinchana82',     days: 14, seed: 13, rev: 3_700_000 },
    { name: 'anhquan9684',     days: 8,  seed: 14, rev: 1_500_000 },
  ];
  koc.forEach((ch) => {
    for (let i = 0; i < ch.days; i++) {
      out.push({
        id: `r_tt_${ch.name.replace(/\W+/g, '')}_${i}`,
        date: dateBack(i),
        channelName: ch.name,
        channelType: 'TikTok - KOC',
        revenue: wave(ch.seed, i, ch.rev, ch.rev * 0.35),
        views: null,
        interactions: null,
        source: i % 4 === 0 ? 'Admin' : 'Nhân viên',
        isEditable: true,
        traffic: null,
        note: null,
      });
    }
  });

  return out;
}

// Sinh báo cáo TRAFFIC mẫu cho Facebook — Kênh thương hiệu (nhập tay, KHÔNG doanh thu).
// Cùng cách dựng sóng tất định như TikTok để dashboard có dữ liệu xem ngay.
function genFacebookBrandSampleReports(): DailyReport[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateBack = (days: number) => {
    const d = new Date(2026, 5, 9); // mốc 09/06/2026 lùi dần
    d.setDate(d.getDate() - days);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const wave = (seed: number, i: number, base: number, amp: number) =>
    Math.max(0, Math.round(base + amp * Math.sin((i + seed) * 1.3) + amp * 0.4 * ((i * (seed + 3)) % 5)));

  const pages = [
    { name: 'DrKam - Sống khỏe cùng Chuyên gia', days: 18, seed: 2, views: 26_000 },
    { name: 'DrKam - Bác sĩ Răng Miệng Họng của mọi gia đình', days: 15, seed: 6, views: 19_000 },
  ];
  const out: DailyReport[] = [];
  pages.forEach((pg) => {
    for (let i = 0; i < pg.days; i++) {
      const viewsReach = wave(pg.seed, i, pg.views, pg.views * 0.25);
      const like = wave(pg.seed, i, pg.views * 0.025, pg.views * 0.007);
      const comment = wave(pg.seed, i, 80, 45);
      const share = wave(pg.seed, i, 40, 25);
      const save = wave(pg.seed, i, 55, 30);
      out.push({
        id: `r_fbbrand_${pg.name.replace(/\s+/g, '')}_${i}`,
        date: dateBack(i),
        channelName: pg.name,
        channelType: 'Facebook - Thương hiệu',
        revenue: 0,
        views: viewsReach,
        interactions: like + comment + share,
        source: i % 3 === 0 ? 'Admin' : 'Nhân viên',
        isEditable: true,
        traffic: {
          viewsReach, comment, like, share, save,
          viewAllRate: Math.round((34 + (i % 7) * 1.5) * 10) / 10,
          avgViewDuration: Math.round((12 + (i % 5) * 1.2) * 10) / 10,
          followerIncr: wave(pg.seed, i, 90, 60),
        },
        note: null,
      });
    }
  });
  return out;
}

export const INITIAL_REPORTS: DailyReport[] = [
  ...genTikTokSampleReports(),
  ...genFacebookBrandSampleReports(),
  // Doanh thu Shopee mẫu cho Facebook KOC inhouse (gộp theo ID)
  { id: "rfb1", date: "03/06/2026", channelName: "conghaing",   channelType: "Facebook - KOC", revenue: 4200000, views: null, interactions: null, source: "Nhân viên", isEditable: true,  traffic: null, note: "12 đơn" },
  { id: "rfb2", date: "04/06/2026", channelName: "conghaing",   channelType: "Facebook - KOC", revenue: 5100000, views: null, interactions: null, source: "Nhân viên", isEditable: true,  traffic: null, note: "" },
  { id: "rfb3", date: "03/06/2026", channelName: "ynni1809",    channelType: "Facebook - KOC", revenue: 2750000, views: null, interactions: null, source: "Nhân viên", isEditable: true,  traffic: null, note: "" },
  { id: "rfb4", date: "04/06/2026", channelName: "ynni1809",    channelType: "Facebook - KOC", revenue: 3300000, views: null, interactions: null, source: "Nhân viên", isEditable: true,  traffic: null, note: "Chạy quà tặng" },
  { id: "rfb5", date: "04/06/2026", channelName: "duocsikhanh", channelType: "Facebook - KOC", revenue: 6800000, views: null, interactions: null, source: "Nhân viên", isEditable: true,  traffic: null, note: "" },
  // Thêm nhiều ngày để xem cuộn (ynni1809 — nhóm của tài khoản demo Nhân viên)
  { id: "rfb6",  date: "05/06/2026", channelName: "ynni1809",    channelType: "Facebook - KOC", revenue: 3800000, views: null, interactions: null, source: "Nhân viên", isEditable: true, traffic: null, note: "" },
  { id: "rfb7",  date: "02/06/2026", channelName: "ynni1809",    channelType: "Facebook - KOC", revenue: 2400000, views: null, interactions: null, source: "Nhân viên", isEditable: true, traffic: null, note: "" },
  { id: "rfb8",  date: "01/06/2026", channelName: "ynni1809",    channelType: "Facebook - KOC", revenue: 1950000, views: null, interactions: null, source: "Nhân viên", isEditable: true, traffic: null, note: "" },
  { id: "rfb9",  date: "31/05/2026", channelName: "ynni1809",    channelType: "Facebook - KOC", revenue: 2100000, views: null, interactions: null, source: "Nhân viên", isEditable: true, traffic: null, note: "" },
  { id: "rfb10", date: "30/05/2026", channelName: "ynni1809",    channelType: "Facebook - KOC", revenue: 1700000, views: null, interactions: null, source: "Nhân viên", isEditable: true, traffic: null, note: "" },
  { id: "rfb11", date: "05/06/2026", channelName: "conghaing",   channelType: "Facebook - KOC", revenue: 4600000, views: null, interactions: null, source: "Nhân viên", isEditable: true, traffic: null, note: "" },
  { id: "rfb12", date: "02/06/2026", channelName: "conghaing",   channelType: "Facebook - KOC", revenue: 3900000, views: null, interactions: null, source: "Nhân viên", isEditable: true, traffic: null, note: "" },
  { id: "rfb13", date: "01/06/2026", channelName: "conghaing",   channelType: "Facebook - KOC", revenue: 3100000, views: null, interactions: null, source: "Nhân viên", isEditable: true, traffic: null, note: "" },
  { id: "rfb14", date: "05/06/2026", channelName: "duocsikhanh", channelType: "Facebook - KOC", revenue: 5200000, views: null, interactions: null, source: "Nhân viên", isEditable: true, traffic: null, note: "" },
  { id: "rfb15", date: "03/06/2026", channelName: "duocsikhanh", channelType: "Facebook - KOC", revenue: 4800000, views: null, interactions: null, source: "Nhân viên", isEditable: true, traffic: null, note: "" },
  { id: "rfb16", date: "02/06/2026", channelName: "duocsikhanh", channelType: "Facebook - KOC", revenue: 3500000, views: null, interactions: null, source: "Nhân viên", isEditable: true, traffic: null, note: "" }
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

// Fanpage Facebook mẫu, gắn theo ID Shopee KOC inhouse (shopeeChannelId = AffiliateChannel.id)
export const INITIAL_FB_PAGES: FbPage[] = [
  // conghaing (id 5) — Nguyễn Công Hải
  { id: "fp1", shopeeChannelId: "5", name: "DrKam Sức Khỏe Mỗi Ngày", addedBy: "Nguyễn Công Hải" },
  { id: "fp2", shopeeChannelId: "5", name: "Mẹo Vặt Răng Miệng", addedBy: "Nguyễn Công Hải" },
  { id: "fp3", shopeeChannelId: "5", name: "Cẩm Nang Nha Khoa DrKam", addedBy: "Nguyễn Công Hải" },
  // ynni1809 (id 6) — Hoàng Yến Nhi
  { id: "fp4", shopeeChannelId: "6", name: "Góc Làm Đẹp Ynni", addedBy: "Hoàng Yến Nhi" },
  { id: "fp5", shopeeChannelId: "6", name: "Ynni Beauty & Health", addedBy: "Hoàng Yến Nhi" },
  // duocsikhanh (id 7) — Đặng Kim Khánh
  { id: "fp6", shopeeChannelId: "7", name: "Dược Sĩ Khánh Tư Vấn", addedBy: "Đặng Kim Khánh" },
  { id: "fp7", shopeeChannelId: "7", name: "Khỏe Đẹp Cùng Khánh", addedBy: "Đặng Kim Khánh" },
  { id: "fp8", shopeeChannelId: "7", name: "Sống Khỏe 360", addedBy: "Đặng Kim Khánh" }
];
