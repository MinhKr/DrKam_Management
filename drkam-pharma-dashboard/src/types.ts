export interface UserSession {
  isLoggedIn: boolean;
  name: string;
  email: string;
  role: 'Admin' | 'Leader' | 'Nhân viên';
  avatar: string;
  department?: string; // 'Media' = tài khoản team Media (chỉ thấy màn Media)
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
  videoCount?: number | null; // số video đăng trong ngày (nhập tay)
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

// Checklist công việc ngày — Team Content.
// Mỗi nhân viên tự điền số lượng đầu việc cần làm trong ngày (SEO WEB, kịch bản/quay,
// từng kênh TikTok AI/KOC, fanpage...). Mỗi dòng thuộc về 1 nhân viên + 1 ngày.
export interface ChecklistItem {
  id: string;
  date: string;         // dd/mm/yyyy
  employeeId: string;   // = profile id (chủ sở hữu dòng — chỉ người này/Admin sửa được)
  employeeName: string; // tên hiển thị (denormalize, giống channels.managerName)
  label: string;        // nhãn đầu việc, vd "[TIKTOK AI] haidang0136", "SEO WEB"
  quantity: number;     // số lượng cần làm trong ngày
  note?: string;        // mô tả bằng chữ (dùng cho đầu việc "Khác" — điều text/paragraph, không đo bằng số)
  createdBy?: string;   // uid người tạo (chế độ DB)
}

// ════════════════════════════════════════════════════════════════
//  TEAM MEDIA — 4 thực thể (tách biệt hoàn toàn với Content)
//  Nhân sự: Nguyễn Trọng Khải (Leader) · Vũ Văn Sơn (Nhân viên)
//  6 loại video: Branding · BS Nguyên · Bán hàng · Xào KOC · ADS FB · FB Daily
// ════════════════════════════════════════════════════════════════

// Báo cáo ngày = bảng công việc chi tiết theo từng người (MediaTaskLog bên dưới).
// Số lượng video theo loại được TỰ ĐẾM từ các dòng công việc có Content là loại video
// (không tính "Khác") — dùng cho Tổng quan & bảng tổng hợp KPI.

// 6 loại video — dùng chung cho báo cáo ngày, chip nhật ký, tổng hợp KPI.
export const MEDIA_VIDEO_TYPES = [
  { key: 'branding', label: 'Branding',   color: '#6366F1' },
  { key: 'bsNguyen', label: 'BS Nguyên',  color: '#0EA5E9' },
  { key: 'banHang',  label: 'Bán hàng',   color: '#F59E0B' },
  { key: 'xaoKoc',   label: 'Xào KOC',    color: '#EC4899' },
  { key: 'adsFb',    label: 'ADS FB',     color: '#10B981' },
  { key: 'fbDaily',  label: 'FB Daily',   color: '#64748B' },
] as const;
export type MediaVideoKey = typeof MEDIA_VIDEO_TYPES[number]['key'];

// B. Nhật ký công việc — chi tiết đầu việc (nhiều dòng/người/ngày).
export interface MediaTaskLog {
  id: string;
  date: string;          // dd/mm/yyyy
  employeeId: string;
  employeeName: string;
  contentType: string;   // loại video / "Khác"
  scriptNo?: string;     // KB (số kịch bản)
  task: string;          // Công việc
  quantity?: number | null; // Số lượng
  progress: 'Hoàn thành' | 'Đang làm' | 'Chưa làm';
  productLink?: string;  // Link sản phẩm
  note?: string;         // Ghi chú
  approval?: string;     // TT Duyệt
}

// C. KPI tháng — mỗi chỉ số 1 dòng (đổi theo tháng).
export interface MediaKpiEntry {
  id: string;
  period: string;        // 'yyyy-mm'
  employeeId: string;
  employeeName: string;
  roleScope: 'Leader' | 'NV';
  stt: number;
  groupName: string;     // Nhóm KPI
  metric: string;        // Chỉ số
  targetValue: number;   // Mục tiêu (số)
  unit: 'number' | 'currency' | 'percent';
  weight: number;        // Trọng số %
  actualValue: number;   // Thực tế
  /**
   * % hoàn thành — CHỈ dùng cho chỉ số nhập tay (không tự nối dữ liệu).
   * Mặc định 100 (coi như hoàn thành); Leader sửa xuống ở popup "Sửa KPI".
   */
  completionPct?: number;
  note?: string;
  // đạt% = actual/target*100 (chỉ số tự động) hoặc = completionPct (nhập tay);
  // điểm = weight × min(đạt,120)/100 (tính client)
}

// D. Đề xuất cải tiến.
export interface MediaImprovement {
  id: string;
  period: string;        // 'yyyy-mm'
  stt: number;
  issue: string;         // Vấn đề / Hiện trạng
  proposal: string;      // Đề xuất cải tiến
  benefit: string;       // Lợi ích kỳ vọng
  priority: 'Cao' | 'Trung bình' | 'Thấp';
}

// ════════════════════════════════════════════════════════════════
//  TEAM ADS FACEBOOK — 2 thực thể (tách biệt hoàn toàn)
//  Nhân sự: Nguyễn Thị Hà (Nhân viên) …
//  Báo cáo ngày = metrics nhập tay; KPI (ROAS/CPA/…) + điểm 3 trục
//  tính runtime trong src/lib/adsFacebook.ts (không lưu DB).
// ════════════════════════════════════════════════════════════════

// Hình thức chạy — quyết định nhánh chấm điểm phễu (Trục A).
export type AdsFbFormType = 'Chuyển đổi' | 'Sỉ' | 'Mess';

// A. Báo cáo ngày — metrics nhập tay (1 dòng/người/ngày/hình thức).
export interface AdsFbTaskLog {
  id: string;
  date: string;              // dd/mm/yyyy
  employeeId: string;
  employeeName: string;
  formType: AdsFbFormType;   // Hình thức
  spend: number;             // Tổng chi tiêu (đ)
  revenue: number;           // Doanh thu đơn thực (đ)
  orders: number;            // Số đơn
  dataCount: number;         // Số data
  messages: number;          // Số tin nhắn (Mess)
  impressions: number;       // Impressions
  clicks: number;            // Clicks
  addToCart: number;         // Add to cart (CĐ)
  campsRunning: number;      // Camp đang chạy
  campsTest: number;         // Camp test mới
  contentTest: number;       // Content test mới
  optimizeActions: number;   // Số hành động tối ưu
  tpRating?: number | null;  // Đánh giá TP (1–5★)
  note?: string;             // Ghi chú tối ưu
}

// B. Target tháng theo nhân viên (÷ days_in_month → target/ngày).
export interface AdsFbTarget {
  id: string;
  period: string;            // 'yyyy-mm'
  employeeId: string;
  employeeName: string;
  spendTarget: number;       // Chi tiêu / tháng (đ)
  revenueTarget: number;     // Doanh thu / tháng (đ)
  ordersTarget: number;      // Đơn / tháng
  daysInMonth: number;       // Số ngày dùng để chia (mặc định 30)
  note?: string;
}

// ════════════════════════════════════════════════════════════════
//  MODULE ORDER — 2 luồng đặt việc giữa các team (migration 0013)
//   • ContentMediaOrder — Team Content đặt team Media
//   • AdsContentOrder   — Team Ads Facebook đặt team Content
//  Cảnh báo hạn (gấp / quá hạn) tính runtime trong src/lib/orders.ts.
// ════════════════════════════════════════════════════════════════

export type OrderPriority = 'CAO' | 'TRUNG BÌNH' | 'THẤP';
export const ORDER_PRIORITIES: OrderPriority[] = ['CAO', 'TRUNG BÌNH', 'THẤP'];

// Trạng thái order Content → Media (theo sheet "Tháng MM.YYYY - Media").
export type ContentMediaStatus = 'Chờ nhận' | 'Đang làm' | 'Hoàn thành' | 'Delay' | 'Hủy';
export const CONTENT_MEDIA_STATUSES: ContentMediaStatus[] = ['Chờ nhận', 'Đang làm', 'Hoàn thành', 'Delay', 'Hủy'];

// Trạng thái order Ads → Content (theo sheet order kịch bản của team Ads).
export type AdsContentStatus = 'Chờ nhận' | 'Đang viết KB' | 'Xong KB' | 'Đang dựng' | 'Hoàn thành' | 'Hủy';
export const ADS_CONTENT_STATUSES: AdsContentStatus[] = ['Chờ nhận', 'Đang viết KB', 'Xong KB', 'Đang dựng', 'Hoàn thành', 'Hủy'];

// A. Team Content ĐẶT team Media — 1 dòng = 1 video/ảnh giao cho 1 nhân sự Media.
export interface ContentMediaOrder {
  id: string;
  orderDate: string;          // dd/mm/yyyy — NGÀY ORDER
  category: string;           // LOẠI (Bán hàng, Bs Nguyên daily, Facebook…)
  title: string;              // TITLE
  orderLink?: string;         // LINK ORDER (kịch bản / brief)
  note?: string;              // NOTE
  priority: OrderPriority;    // ƯU TIÊN
  requesterId?: string | null;  // ORDER — người đặt (team Content)
  requesterName: string;
  assigneeId?: string | null;   // PICK — người làm (team Media)
  assigneeName: string;
  deadline?: string;          // dd/mm/yyyy — trống = chưa đặt hạn
  status: ContentMediaStatus;
  resultLink?: string;        // LINK VIDEO trả về
}

// B. Team Ads Facebook ĐẶT team Content — Ads brief → Content viết KB →
//    Editor dựng video → Ads chạy và ghi kết quả.
export interface AdsContentOrder {
  id: string;
  orderDate: string;          // dd/mm/yyyy
  postCode?: string;          // ID - BÀI VIẾT
  topic: string;              // LOẠI KỊCH BẢN
  adsOwnerId?: string | null; // ADS đặt
  adsOwnerName: string;
  size?: string;              // KÍCH THƯỚC (9:16, 3:4, 1:1…)
  sampleLink?: string;        // Link bài mẫu
  brief?: string;             // KHUNG KỊCH BẢN VIDEO
  priority: OrderPriority;
  deadline?: string;          // dd/mm/yyyy
  status: AdsContentStatus;
  // Team Content điền
  scriptLink?: string;        // KỊCH BẢN EDIT VIDEO
  contentOwnerId?: string | null;
  contentOwnerName: string;   // CONTENT phụ trách
  videoFinal?: string;        // VIDEO FINAL
  commentContent?: string;    // COMMENT SỬA NỘI DUNG (Content ghi)
  commentAds?: string;        // COMMENT NỘI DUNG SỬA (Ads ghi)
  // Team Ads điền sau khi chạy
  isRunning: boolean;         // TÌNH TRẠNG CHẠY
  runOwnerName: string;       // TEAM ADS (người chạy)
  airDate?: string;           // NGÀY LÊN — dd/mm/yyyy
  spend: number;              // SỐ TIỀN TIÊU (đ)
  dataCount: number;          // SỐ LƯỢNG SỐ
  explanation?: string;       // GIẢI TRÌNH
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
  },
  // Facebook — Facebook Ads: CHỈ nhập doanh thu (không traffic). trafficActive:false
  // để không lọt vào danh sách "Kênh thương hiệu" (view chỉ traffic). Tên phải khớp
  // đúng "Facebook Ads" để báo cáo gắn được kênh (findChannelId theo tên) và để dòng
  // "Facebook Ads" ở Tổng quan cộng đúng doanh thu.
  {
    id: "fbads",
    name: "Facebook Ads",
    brandCategory: "Facebook Ads",
    platform: "Facebook",
    channelType: "Brand",
    linkedShop: false,
    auditId: "facebook-ads",
    managerName: "Nguyễn Văn An",
    managerAvatar: AV,
    status: "Đã ra số",
    tracking: { revenueActive: true, trafficActive: false }
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
  },
  // ── TEAM MEDIA ──
  {
    id: "m1",
    name: "Nguyễn Trọng Khải",
    email: "khaint@drkam.vn",
    role: "Nhân viên",
    department: "Media",
    status: "Hoạt động",
    channelCount: 0,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-SRAnv3abFtWFM3gIMsUq0WlWHZvg-5eYjh9Ld5LM3AWxB4Eo_FQFHblzAV9TBdVcCG-qlVo8RvlbI1OAInNjdyEF8Iw1Scrl4i0O3bo4pYKRC6fT-3xQ4kWxOFOYEVfi_W0VyDlonh-1u89UhcB6np2PCenVdOQck1gHjR3ZaHYf0lvTHL9ND7eDIreyH2wTiZiTVB-y7KDX0uSZGr5PZSgetOisUYcb05-K74b9XqgCiUMtaYojKPMnP9Mx91p3_icBtl3e5iT-"
  },
  {
    id: "m2",
    name: "Vũ Văn Sơn",
    email: "sonvv@drkam.vn",
    role: "Nhân viên",
    department: "Media",
    status: "Hoạt động",
    channelCount: 0,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCA92GDkUbWvXrn22ZL-2GncLt7Id8ZSDOUJZqHbkIVe-CAKEETqOY0HWsDcQmZCwGn_pKGKFg-nexGWG2fu_xpawe2Gi3p6aAQ4EeEJpkvIDQrWFcobLYGXAEfmrqy4JWO4V-jRu9cYCYspqKYu83glAtBkmA15CEVA6BLuLzI-fYbochgbj3DXz_hAOPzfSKLb8TBzaZDMgBaM-UAwD7T4sO5CD04JuclO-qyumbM97sJh7nudS6RagQMoEmgD2cVYDjyvDuOvy6k"
  }
];

// Media employee ids (dùng chung cho seed + component).
export const MEDIA_KHAI = { id: "m1", name: "Nguyễn Trọng Khải" };
export const MEDIA_SON  = { id: "m2", name: "Vũ Văn Sơn" };

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

// Checklist Team Content bắt đầu rỗng — mỗi nhân viên tự thêm đầu việc của mình theo ngày.
export const INITIAL_CHECKLISTS: ChecklistItem[] = [];

// ════════════════════════════════════════════════════════════════
//  SEED TEAM MEDIA — dữ liệu THẬT tháng 6/2026 (từ sheet báo cáo Media)
// ════════════════════════════════════════════════════════════════

// Báo cáo ngày = các dòng công việc chi tiết (MediaTaskLog) của từng người.
// Dữ liệu THẬT tháng 6/2026 trích từ 2 sheet "Khải - Lead Media" và "Sơn Media".
// Mã loại: br=Branding · bs=BS Nguyên · bh=Bán hàng · xk=Xào KOC · ad=ADS FB · fb=FB Daily · kh=Khác
// Tiến độ: 'x'=Hoàn thành · 'd'=Đang làm. Dòng: [loại, KB, công việc, SL, tiến độ, link].
type SeedRow = [string, string, string, number | null, 'x' | 'd', string];
const CONTENT_CODE: Record<string, string> = {
  br: 'Branding', bs: 'BS Nguyên', bh: 'Bán hàng', xk: 'Xào KOC', ad: 'ADS FB', fb: 'FB Daily', kh: 'Khác',
};

const KHAI_JUNE: Array<[number, SeedRow[]]> = [
  [1, [
    ['kh', '', 'Họp team MKT', null, 'x', ''],
    ['kh', '', 'Đồng bộ, cắt ghép lại toàn bộ tài nguyên video BLV Quang Huy', null, 'x', ''],
    ['bh', '', 'Fix video combo NSM - KĐR', 1, 'x', ''],
    ['kh', '', 'Họp toàn công ty', null, 'x', ''],
    ['bh', '', 'Edit video xào BLV Quang Huy KĐR post', 1, 'x', ''],
  ]],
  [2, [
    ['bh', '', 'Edit video xào BLV Quang Huy 9', 1, 'x', ''],
    ['ad', '', 'Thu voice và edit video ADS Tuyển sỉ nha khoa', 1, 'x', ''],
    ['bh', '', 'Set up quay video bán hàng ngày 06/06', null, 'x', ''],
    ['bh', '', 'Edit video xào BLV Quang Huy 16', 1, 'x', ''],
    ['bh', '', 'Edit video xào BLV Quang Huy 18', null, 'x', ''],
  ]],
  [3, [
    ['bh', '', 'Edit video xào BLV Quang Huy 18', 1, 'x', ''],
    ['bh', '', 'Edit video xào BLV Quang Huy 25', 1, 'x', ''],
    ['kh', '', 'Set up quay video Nhi', null, 'x', ''],
    ['ad', '', 'Fix lại video ADS Tuyển sỉ nha khoa', null, 'x', ''],
    ['kh', '', 'Họp nhận KPIs tháng 6', null, 'x', ''],
  ]],
  [4, [
    ['xk', '', 'Edit video xào BLV Quang Huy 18', null, 'x', ''],
    ['xk', '', 'Edit video xào BLV Quang Huy 25', null, 'x', ''],
    ['bh', '', 'Set up quay 13 video nhi bán hàng', null, 'x', ''],
    ['kh', '', 'Họp nhận KPIs tháng 6', null, 'x', ''],
  ]],
  [5, [
    ['xk', '', 'Fix video Quang Huy xào 18', null, 'x', ''],
    ['kh', '', 'Design 3 ảnh frame live', null, 'x', ''],
    ['kh', '', 'Họp Team Leader', null, 'x', ''],
    ['kh', '', 'Đánh giá thử việc Sơn', null, 'x', ''],
  ]],
  [9, [
    ['bs', '', 'Edit video BS Nguyên dẫn dắt 1', null, 'x', ''],
    ['bs', '', 'Edit video BS Nguyên dẫn dắt 2', null, 'x', ''],
    ['kh', '', 'Set up phòng live', null, 'x', ''],
    ['bs', '331', 'Edit video BS Nguyên 331', 1, 'x', ''],
  ]],
  [10, [
    ['kh', '', 'Họp Team Leader về xây dựng Quy trình công việc, lộ trình đào tạo', null, 'x', ''],
    ['bh', '', 'Edit video bán hàng Quang Huy x DrKam', 1, 'x', ''],
    ['ad', '', 'Edit video ADS kịch bản 1', 1, 'x', ''],
    ['bh', '', 'Edit video xào Quang Huy', 1, 'x', ''],
  ]],
  [11, [
    ['ad', '', 'Edit video ADS kịch bản 1', 1, 'x', ''],
    ['ad', '', 'Edit video ADS kịch bản 5', 1, 'x', ''],
    ['br', '', 'Edit video Branding WC kênh chính', 1, 'x', ''],
    ['br', '', 'Edit video Branding WC kênh DrKamvn', 1, 'x', ''],
    ['kh', '', 'Thu voice 2 kịch bản video bán hàng', null, 'x', ''],
  ]],
  [12, [
    ['bs', '330', 'Edit video BS Nguyên kb 330', 1, 'x', ''],
    ['bs', '331', 'Edit video BS Nguyên kb 331', 1, 'x', ''],
    ['bs', '332', 'Edit video BS Nguyên kb 332', 1, 'x', ''],
    ['bh', '', 'Set up quay 4 video bán hàng', null, 'x', ''],
    ['bs', '333', 'Edit video BS Nguyên kb 333', null, 'd', ''],
  ]],
  [13, [
    ['bs', '333', 'Edit video BS Nguyên kb 333', 1, 'x', ''],
    ['bs', '334', 'Edit video BS Nguyên kb 334', 1, 'x', ''],
    ['kh', '', 'Sửa 1 ảnh Sale off tặng quà nha khoa', null, 'x', ''],
    ['kh', '', 'Sửa 3 ảnh sản phẩm sắp xếp tại nha khoa', null, 'x', ''],
  ]],
  [16, [
    ['kh', '', 'Họp Team Content x Media', null, 'x', ''],
    ['xk', '', 'Edit video MPB 1', 1, 'x', ''],
    ['xk', '', 'Edit video MPB 2', 1, 'x', ''],
    ['bs', '', 'Fix video BS Nguyên 334', null, 'x', ''],
    ['bs', '', 'Fix video BS Nguyên 335', null, 'x', ''],
  ]],
  [19, [
    ['xk', '', 'Edit video MPB 2', 1, 'x', ''],
    ['bs', '338', 'Edit video BS Nguyên 338', 1, 'x', ''],
    ['bs', '339', 'Edit video BS Nguyên 339', 1, 'x', ''],
    ['bs', '340', 'Edit video BS Nguyên 340', 1, 'x', ''],
    ['bs', '341', 'Edit video BS Nguyên 341', 1, 'x', ''],
    ['bs', '342', 'Edit video BS Nguyên 342', null, 'd', ''],
  ]],
  [30, [
    ['kh', '', 'Quay 4 video dẫn live chạy', null, 'x', ''],
    ['xk', '', 'Edit video Quang Huy x DrKam 1', 1, 'x', ''],
    ['xk', '', 'Edit video Quang Huy x DrKam 2', 1, 'x', ''],
    ['xk', '', 'Edit video Quang Huy x DrKam 3', null, 'x', ''],
    ['xk', '', 'Edit video Quang Huy x DrKam 4', 1, 'x', ''],
    ['bh', '', 'Edit video dẫn live 3', 1, 'x', ''],
    ['bh', '', 'Edit video dẫn live 5', 1, 'x', ''],
  ]],
];

const SON_JUNE: Array<[number, SeedRow[]]> = [
  [1, [
    ['kh', '', 'Họp team MKT', 1, 'x', ''],
    ['kh', '', 'Cắt chỉnh lại tài nguyên video BLV Quang Huy', 1, 'x', ''],
    ['bh', '3', 'Edit và sửa video xào BLV Quang Huy 3', 1, 'x', 'BLV QUANG HUY 3 - xào kênh vn.mp4'],
    ['bh', '4', 'Edit và sửa video xào BLV Quang Huy 4', 1, 'x', 'BLV QUANG HUY 4 - xào kênh chính.mp4'],
    ['kh', '', 'Họp toàn công ty', 1, 'x', ''],
  ]],
  [2, [
    ['bh', '7', 'Edit video xào BLV Quang Huy 7', 1, 'x', 'BLV Quang Huy xào 7.mp4'],
    ['bh', '10', 'Edit video xào BLV Quang Huy 10', 1, 'x', 'BLV Quang Huy xào 10 - Kịch bản dẫn live.mp4'],
  ]],
  [3, [
    ['bh', '12', 'Edit và sửa video xào BLV Quang Huy 12', 1, 'x', 'BLV Quang Huy xào 12.mp4'],
    ['bh', '13', 'Edit và sửa video xào BLV Quang Huy 13', 1, 'x', 'BLV Quang Huy xào 13.mp4'],
    ['bh', '14', 'Edit và sửa video xào BLV Quang Huy 14', 1, 'x', 'BLV Quang Huy xào 14.mp4'],
    ['xk', '1', 'Edit video KOC Khánh T6 1', 1, 'x', 'T6 CKhanh 1.mp4'],
    ['xk', '2', 'Edit video KOC Khánh T6 2', 1, 'x', 'T6CKhanh 2.mp4'],
    ['xk', '1', 'Edit video KOC C Thư 1', 1, 'x', 'T6 CThư 1.mp4'],
  ]],
  [4, [
    ['bh', '1', 'Edit video deal kênh VN 1', 1, 'x', 'Deal đầu tháng 6 - kênh VN 1.mp4'],
    ['bh', '1', 'Edit video deal kênh chính 1', 1, 'x', 'Deal đầu tháng 6 - kênh chính 1.mp4'],
    ['bh', '2', 'Edit video deal kênh VN 2', 1, 'x', 'Deal đầu tháng 6 - kênh vn 2.mp4'],
    ['bh', '2', 'Edit video deal kênh chính 2', 1, 'x', 'Deal đầu tháng 6 - kênh chính 2.mp4'],
    ['xk', '3', 'Edit video KOC Khánh T6 3', 1, 'x', 'T6CKhanh 3.mp4'],
    ['xk', '2', 'Edit video KOC C Thư 2', 1, 'x', 'T6 CThư 2.mp4'],
  ]],
  [5, [
    ['bh', '3', 'Edit video deal kênh VN 3', 1, 'x', 'Deal đầu tháng 6 - kênh vn 3.mp4'],
    ['bh', '3', 'Edit video deal kênh chính 3', 1, 'x', 'Deal đầu tháng 6 - kênh chính 3.mp4'],
    ['bh', '257', 'Edit video DrKamVN 257', 1, 'x', 'DRKAMVN 257.mp4'],
    ['fb', '90', 'Edit video bán hàng FB 90', 1, 'x', 'Bán hàng FB90.mp4'],
    ['xk', '4', 'Edit video KOC Khánh T6 4', 1, 'x', 'T6CKhanh 4.mp4'],
    ['xk', '3', 'Edit video KOC C Thư 3', 1, 'x', 'T6 CThư 3.mp4'],
  ]],
  [6, [
    ['bh', '258', 'Edit video DrKamVN 258', 1, 'x', 'DRKAMVN 258.mp4'],
    ['fb', '91', 'Edit video bán hàng FB 91', 1, 'x', 'Bán hàng FB91.mp4'],
    ['xk', '5', 'Edit video KOC Khánh T6 5', 1, 'x', 'T6CKhanh 5.mp4'],
    ['xk', '4', 'Edit video KOC C Thư 4', 1, 'x', 'T6 CThư 4.mp4'],
  ]],
  [8, [
    ['bh', '259', 'Edit video DrKamVN 259', 1, 'x', 'DRKAMVN 259.mp4'],
    ['fb', '92', 'Edit video bán hàng FB 92', 1, 'x', 'Bán hàng FB92.mp4'],
    ['xk', '6', 'Edit video KOC Khánh T6 6', 1, 'x', 'T6CKhanh 6.mp4'],
    ['xk', '5', 'Edit video KOC C Thư 5', 1, 'x', 'T6 CThư 5.mp4'],
    ['bh', '19', 'Edit và sửa video xào BLV Quang Huy 19', 1, 'x', 'BLV Quang Huy xào 19.mp4'],
  ]],
  [9, [
    ['bh', '261', 'Edit video DrKamVN 261', 1, 'x', 'DRKAMVN 261.mp4'],
    ['fb', '93', 'Edit video bán hàng FB 93', 1, 'x', 'Bán hàng FB93.mp4'],
    ['xk', '7', 'Edit video KOC Khánh T6 7', 1, 'x', 'T6CKhanh 7.mp4'],
    ['xk', '6', 'Edit video KOC C Thư 6', 1, 'x', 'T6 CThư 6.mp4'],
    ['kh', '', 'Set up phòng live', 1, 'x', ''],
  ]],
  [10, [
    ['bh', '262', 'Edit video DrKamVN 262', 1, 'x', 'DRKAMVN 262.mp4'],
    ['fb', '94', 'Edit video bán hàng FB 94', 1, 'x', 'Bán hàng FB94.mp4'],
    ['xk', '8', 'Edit video KOC Khánh T6 8', 1, 'x', 'T6CKhanh 8.mp4'],
    ['xk', '7', 'Edit video KOC C Thư 7', 1, 'x', 'T6 CThư 7.mp4'],
    ['bh', '2', 'Edit video ADS Quang Huy 2', 1, 'x', 'Order Ads KB2.mp4'],
    ['kh', '', 'Tạo bảng báo cáo cho team Media', 1, 'x', ''],
  ]],
  [11, [
    ['bh', '1', 'Edit video deal giữa tháng', 1, 'x', 'KB 37 DEAL 13-15/6 kênh chính.mp4'],
    ['ad', '1', 'Edit video ADS order by anh Tuân', 1, 'x', 'Order ADS Tuân 1.mp4'],
    ['xk', '9', 'Edit video KOC Khánh T6 9', 1, 'x', 'T6CKhanh 9.mp4'],
    ['xk', '10', 'Edit video KOC Khánh T6 10', 1, 'x', 'T6CKhanh 10.mp4'],
    ['xk', '8', 'Edit video KOC C Thư 8', 1, 'x', 'T6 CThư 8.mp4'],
  ]],
  [30, [
    ['kh', '4', 'Quay 4 video live chạy', 1, 'x', ''],
    ['bh', '268', 'Edit video DrKamVN 268', 1, 'x', 'DRKAMVN 268.mp4'],
    ['xk', '25', 'Edit video KOC Khánh T6 25', 1, 'x', 'T6CKhanh 25.mp4'],
    ['xk', '32', 'Edit video KOC C Thư 32', 1, 'x', 'T6 CThư 32.mp4'],
    ['xk', '16', 'Edit video MPB 16', 1, 'x', 'Mai Phương Bùi 16.mp4'],
    ['xk', '17', 'Edit video MPB 17', 1, 'x', 'Mai Phương Bùi 17.mp4'],
    ['bh', '1', 'Edit video dẫn live 1', 1, 'x', '0630 dẫn live 1 drkamvn.mp4'],
    ['bh', '2', 'Edit video dẫn live 2', 1, 'x', '0630 dẫn live 2 drkamvn.mp4'],
  ]],
];

// Sinh danh sách MediaTaskLog từ bảng nén cho 1 người.
function genMediaLogs(emp: { id: string; name: string }, data: Array<[number, SeedRow[]]>): MediaTaskLog[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const out: MediaTaskLog[] = [];
  for (const [day, rows] of data) {
    rows.forEach(([code, kb, task, qty, prog, link], i) => {
      out.push({
        id: `ml_${emp.id}_2026-06-${pad(day)}_${i}`,
        date: `${pad(day)}/06/2026`,
        employeeId: emp.id,
        employeeName: emp.name,
        contentType: CONTENT_CODE[code] ?? 'Khác',
        scriptNo: kb || undefined,
        task,
        quantity: qty,
        progress: prog === 'd' ? 'Đang làm' : 'Hoàn thành',
        productLink: link || undefined,
        approval: prog === 'x' ? 'Đã duyệt' : '',
      });
    });
  }
  return out;
}

export const INITIAL_MEDIA_LOGS: MediaTaskLog[] = [
  ...genMediaLogs(MEDIA_KHAI, KHAI_JUNE),
  ...genMediaLogs(MEDIA_SON, SON_JUNE),
];

// C. KPI tháng 6/2026 — số thật từ sheet.
export const INITIAL_MEDIA_KPI: MediaKpiEntry[] = [
  // A. Leader — Nguyễn Trọng Khải (6 chỉ số)
  { id: 'mk_k1', period: '2026-06', employeeId: 'm1', employeeName: 'Nguyễn Trọng Khải', roleScope: 'NV', stt: 1, groupName: 'Hiệu suất', metric: 'Số lượng video sản xuất trong tháng', targetValue: 180, unit: 'number', weight: 50, actualValue: 210 },
  { id: 'mk_k2', period: '2026-06', employeeId: 'm1', employeeName: 'Nguyễn Trọng Khải', roleScope: 'NV', stt: 2, groupName: 'Hiệu quả', metric: 'Tổng lượt reach đa kênh', targetValue: 15000000, unit: 'number', weight: 10, actualValue: 8023259 },
  { id: 'mk_k3', period: '2026-06', employeeId: 'm1', employeeName: 'Nguyễn Trọng Khải', roleScope: 'NV', stt: 3, groupName: 'Hiệu quả', metric: 'Doanh thu TikTok Seller (video inhouse)', targetValue: 400000000, unit: 'currency', weight: 20, actualValue: 355551750 },
  { id: 'mk_k4', period: '2026-06', employeeId: 'm1', employeeName: 'Nguyễn Trọng Khải', roleScope: 'NV', stt: 4, groupName: 'Hiệu quả', metric: 'Doanh thu Facebook ADS (video team)', targetValue: 150000000, unit: 'currency', weight: 10, actualValue: 311687517 },
  { id: 'mk_k5', period: '2026-06', employeeId: 'm1', employeeName: 'Nguyễn Trọng Khải', roleScope: 'NV', stt: 5, groupName: 'Nhân sự', metric: 'Tỷ lệ nhân sự đạt KPI', targetValue: 90, unit: 'percent', weight: 5, actualValue: 100 },
  { id: 'mk_k6', period: '2026-06', employeeId: 'm1', employeeName: 'Nguyễn Trọng Khải', roleScope: 'NV', stt: 6, groupName: 'Nhân sự', metric: 'Hoàn thành khóa đào tạo', targetValue: 100, unit: 'percent', weight: 5, actualValue: 100 },
  // B. Nhân viên — Vũ Văn Sơn (2 chỉ số)
  { id: 'mk_s1', period: '2026-06', employeeId: 'm2', employeeName: 'Vũ Văn Sơn', roleScope: 'NV', stt: 1, groupName: 'Branding', metric: 'Số lượng video sản xuất trong tháng', targetValue: 90, unit: 'number', weight: 90, actualValue: 129, note: 'Tự đếm từ sheet Sơn, lọc T6/2026' },
  { id: 'mk_s2', period: '2026-06', employeeId: 'm2', employeeName: 'Vũ Văn Sơn', roleScope: 'NV', stt: 2, groupName: 'Doanh số', metric: 'Doanh thu từ video trên TikTok Seller + ADS Facebook', targetValue: 200000000, unit: 'currency', weight: 10, actualValue: 333619633 },
];

// D. Đề xuất cải tiến tháng 6/2026 — 7 mục từ sheet.
export const INITIAL_MEDIA_IMPROVEMENTS: MediaImprovement[] = [
  { id: 'mi_1', period: '2026-06', stt: 1, issue: 'Team chỉ 2 người nhưng gánh 6 đầu việc (branding, BS Nguyên, bán hàng, xào KOC, ADS, FB daily) → dễ quá tải, khó đạt 180 + 90 video/tháng.', proposal: 'Phân vai rõ: Khải tập trung video doanh thu cao (TikTok Seller, ADS FB); Sơn tập trung branding + FB daily. Lập lịch sản xuất tuần cố định.', benefit: 'Giảm nghẽn cổ chai, ổn định sản lượng, mỗi người chuyên sâu 1 mảng.', priority: 'Cao' },
  { id: 'mi_2', period: '2026-06', stt: 2, issue: 'Doanh thu TikTok Seller & ADS FB là KPI trọng số lớn (20% + 10%) nhưng phụ thuộc nhiều yếu tố ngoài Media.', proposal: 'Bám KOC/sản phẩm đang ra đơn tốt để nhân bản; phối hợp Marketing chọn sản phẩm hot trước khi quay; review video win hàng tuần.', benefit: 'Tăng tỷ lệ video ra đơn, nâng điểm 2 KPI doanh thu.', priority: 'Cao' },
  { id: 'mi_3', period: '2026-06', stt: 3, issue: 'Thiếu thư viện template & quy trình edit chuẩn → mỗi video edit lại từ đầu, tốn thời gian.', proposal: 'Xây thư viện preset (intro/outro, sub, hiệu ứng, nhạc), checklist edit chuẩn DrKam, kho B-roll dùng chung.', benefit: 'Rút ngắn 20–30% thời gian edit, tăng sản lượng.', priority: 'Trung bình' },
  { id: 'mi_4', period: '2026-06', stt: 4, issue: 'Sản xuất video AI (KPI Doanh số AI của Sơn) còn mới, chưa có quy trình.', proposal: 'Chuẩn hóa pipeline AI (prompt ảnh → Veo3 → edit) dựa trên các skill video AI sẵn có; mỗi tuần ra 2–3 video AI test.', benefit: 'Mở thêm nguồn doanh thu, đạt KPI Doanh số AI 200tr.', priority: 'Trung bình' },
  { id: 'mi_5', period: '2026-06', stt: 5, issue: 'Đo lường reach đa kênh thủ công, dễ sai lệch, khó tổng hợp 15M lượt.', proposal: 'Lập sheet tracking reach tự động theo ngày/kênh; chốt số liệu mỗi cuối ngày từ sheet Báo cáo ngày.', benefit: 'Số liệu reach minh bạch, báo cáo nhanh.', priority: 'Trung bình' },
  { id: 'mi_6', period: '2026-06', stt: 6, issue: 'Chưa có buổi review nội bộ định kỳ để rút kinh nghiệm video không hiệu quả.', proposal: 'Họp Media 30 phút/tuần: chấm điểm video tuần trước, chọn 1 video win để nhân bản, 1 video fail để tránh.', benefit: 'Cải thiện chất lượng liên tục, tăng % video ra đơn.', priority: 'Thấp' },
  { id: 'mi_7', period: '2026-06', stt: 7, issue: 'Đào tạo & phát triển năng lực (KPI 5%) chưa có lộ trình cụ thể.', proposal: 'Mỗi tháng hoàn thành tối thiểu 1 khóa (dựng phim, AI video, storytelling bán hàng); ghi nhận chứng chỉ.', benefit: 'Đạt KPI đào tạo, nâng tay nghề cả team.', priority: 'Thấp' },
];
