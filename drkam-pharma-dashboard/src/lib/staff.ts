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
