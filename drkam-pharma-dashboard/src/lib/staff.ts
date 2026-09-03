/**
 * NHÂN SỰ TEAM CONTENT — nguồn dùng chung.
 *
 * Nhiều màn cần đúng một danh sách "người của team Content": checklist công việc
 * ngày, ô chọn người phụ trách kênh (tab Quản lý kênh), tiến độ doanh thu theo
 * nhân viên ở Tổng quan. Để 3 chỗ không lệch nhau, quy tắc nằm ở đây.
 *
 * QUY TẮC: team Content = mọi nhân sự KHÔNG thuộc các khối bên dưới (đúng quy
 * ước toàn hệ thống — Media / Ads Facebook có màn riêng, HR · Nhân sự · Hành
 * chính không làm nội dung). So khớp trên tên phòng ban đã chuẩn hoá (bỏ dấu,
 * viết thường) nên "Nhân sự", "HR", "Hành chính - Nhân sự"… đều khớp.
 */
import { Employee } from '../types';
import { norm } from './contentKpi';

/** Từ khoá phòng ban KHÔNG thuộc team Content. */
export const NON_CONTENT_DEPT_KEYS = ['media', 'adsfacebook', 'hr', 'nhansu', 'hanhchinh'];

/**
 * Tài khoản CHỨC NĂNG, không phải người làm nội dung — lọc theo TÊN vì mấy tài
 * khoản này thường để trống phòng ban (vd tài khoản "hr", "admin" dùng chung).
 * So khớp CHÍNH XÁC cả tên đã chuẩn hoá, không so "chứa", để không loại nhầm
 * người thật có tên gần giống.
 */
export const NON_CONTENT_ACCOUNT_NAMES = ['hr', 'admin', 'administrator', 'nhansu', 'hanhchinh', 'ketoan'];

/** Phòng ban này có thuộc team Content không. */
export const isContentDept = (dept: string) => {
  const d = norm(dept);
  return !NON_CONTENT_DEPT_KEYS.some((k) => d.includes(k));
};

/**
 * Nhân sự này có phải người của team Content không (dùng cho checklist, ô chọn
 * người phụ trách kênh, tiến độ theo nhân viên).
 * `includeAdmin` = false (mặc định): bỏ tài khoản Admin hệ thống.
 */
export function isContentStaff(e: Employee, includeAdmin = false): boolean {
  if (e.status !== 'Hoạt động') return false;
  if (!includeAdmin && e.role === 'Admin') return false;
  if (NON_CONTENT_ACCOUNT_NAMES.includes(norm(e.name))) return false;
  return isContentDept(e.department);
}

/** Nhân sự team Content đang hoạt động, xếp theo tên. */
export function contentStaff(employees: Employee[], includeAdmin = false): Employee[] {
  return employees
    .filter((e) => isContentStaff(e, includeAdmin))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

// ════════════════════════════════════════════════════════════════════════════
//  PHÂN NHÓM & TẠO TÀI KHOẢN — dùng cho màn "Quản lý nhân sự" (chỉ Admin)
// ════════════════════════════════════════════════════════════════════════════

export type TeamKey = 'content' | 'media' | 'adsfb' | 'other';

/** Nhóm hiển thị ở màn Quản lý nhân sự — thứ tự trong mảng là thứ tự hiện. */
export const TEAMS: { key: TeamKey; label: string; icon: string; tone: string }[] = [
  { key: 'content', label: 'Team Content', icon: 'edit_note', tone: 'text-[#D32027] bg-rose-50' },
  { key: 'media', label: 'Team Media', icon: 'videocam', tone: 'text-indigo-600 bg-indigo-50' },
  { key: 'adsfb', label: 'Team Ads Facebook', icon: 'campaign', tone: 'text-blue-600 bg-blue-50' },
  { key: 'other', label: 'Khác / tài khoản hệ thống', icon: 'groups', tone: 'text-slate-500 bg-slate-100' },
];

/** Phòng ban chuẩn để chọn khi thêm/sửa nhân sự (khớp đúng chuỗi app đang dùng). */
export const DEPARTMENTS = ['Content', 'Media', 'Ads Facebook'];

/**
 * Nhân sự này thuộc team nào. Media / Ads Facebook khớp theo tên phòng ban;
 * tài khoản chức năng ("hr", "admin"…) và phòng ban ngoài marketing xếp vào
 * "Khác" để không lẫn vào danh sách người làm nội dung.
 */
export function teamOf(e: Employee): TeamKey {
  const d = norm(e.department);
  if (d.includes('media')) return 'media';
  if (d.includes('adsfacebook') || d.includes('adsfb')) return 'adsfb';
  if (NON_CONTENT_ACCOUNT_NAMES.includes(norm(e.name))) return 'other';
  return isContentDept(e.department) ? 'content' : 'other';
}

/**
 * Email theo quy ước công ty: <tên gọi><chữ đầu họ và đệm>@drkam.vn, bỏ dấu.
 *   Nguyễn Công Hải  → hainc@drkam.vn
 *   Hoàng Yến Nhi    → nhihy@drkam.vn
 *   Lê Đắc Nhật Minh → minhldn@drkam.vn
 */
export function suggestEmail(fullName: string, domain = 'drkam.vn'): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const given = norm(words[words.length - 1]);
  const initials = words.slice(0, -1).map((w) => norm(w).charAt(0)).join('');
  return given ? `${given}${initials}@${domain}` : '';
}

/** Mật khẩu tạm khi tạo tài khoản mới (quy ước công ty — nhắc nhân sự đổi sau). */
export const DEFAULT_PASSWORD = '123456';
