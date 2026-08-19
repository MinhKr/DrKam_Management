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

/** Phòng ban này có thuộc team Content không. */
export const isContentDept = (dept: string) => {
  const d = norm(dept);
  return !NON_CONTENT_DEPT_KEYS.some((k) => d.includes(k));
};

/**
 * Nhân sự team Content đang hoạt động, xếp theo tên.
 * `includeAdmin` = false (mặc định) để bỏ tài khoản Admin hệ thống ra khỏi các
 * danh sách "người làm việc" (checklist, người phụ trách kênh).
 */
export function contentStaff(employees: Employee[], includeAdmin = false): Employee[] {
  return employees
    .filter((e) => e.status === 'Hoạt động'
      && (includeAdmin || e.role !== 'Admin')
      && isContentDept(e.department))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}
