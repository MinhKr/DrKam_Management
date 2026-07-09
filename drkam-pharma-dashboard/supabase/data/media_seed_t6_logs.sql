-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Seed BÁO CÁO NGÀY Team Media tháng 6/2026             ║
-- ║  121 dòng công việc THẬT (Khải 63 · Sơn 58) trích 2 sheet:     ║
-- ║   "Khải - Lead Media" và "Sơn Media".                          ║
-- ║  Số lượng video TỰ ĐẾM từ các dòng có Content là loại video    ║
-- ║  (không tính "Khác") → Tổng quan Media tháng 6 hiện đúng chart.║
-- ║                                                                ║
-- ║  Chạy SAU migration 0007 và SAU khi đã tạo tài khoản Auth cho  ║
-- ║  Khải & Sơn (khaint@drkam.vn, sonvv@drkam.vn). Nên chạy SAU    ║
-- ║  media_seed_t6.sql (đã gán department='Media'). Chạy lại nhiều ║
-- ║  lần AN TOÀN — xóa dữ liệu T6 cũ của 2 người rồi seed lại.     ║
-- ╚══════════════════════════════════════════════════════════════╝
do $$
declare
  khai uuid;
  son  uuid;
  khai_name text;
  son_name  text;
begin
  select id, name into khai, khai_name from public.profiles where email = 'khaint@drkam.vn';
  select id, name into son,  son_name  from public.profiles where email = 'sonvv@drkam.vn';
  if khai is null or son is null then
    raise exception 'Chưa có tài khoản Khải/Sơn trong profiles. Hãy tạo qua Authentication > Add user và chạy media_seed_t6.sql trước.';
  end if;
  -- Phòng trường hợp name còn trống (chưa chạy media_seed_t6.sql): đặt tên hiển thị.
  khai_name := coalesce(nullif(khai_name, ''), 'Nguyễn Trọng Khải');
  son_name  := coalesce(nullif(son_name,  ''), 'Vũ Văn Sơn');

  -- Xóa báo cáo ngày T6/2026 cũ của 2 người (idempotent).
  delete from public.media_task_logs
    where log_date >= date '2026-06-01' and log_date <= date '2026-06-30'
      and employee_id in (khai, son);

  insert into public.media_task_logs
    (log_date, employee_id, employee_name, content_type, script_no, task, quantity, progress, product_link, approval, created_by) values
    ('2026-06-01', khai, khai_name, 'Khác', null, 'Họp team MKT', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-01', khai, khai_name, 'Khác', null, 'Đồng bộ, cắt ghép lại toàn bộ tài nguyên video BLV Quang Huy', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-01', khai, khai_name, 'Bán hàng', null, 'Fix video combo NSM - KĐR', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-01', khai, khai_name, 'Khác', null, 'Họp toàn công ty', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-01', khai, khai_name, 'Bán hàng', null, 'Edit video xào BLV Quang Huy KĐR post', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-02', khai, khai_name, 'Bán hàng', null, 'Edit video xào BLV Quang Huy 9', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-02', khai, khai_name, 'ADS FB', null, 'Thu voice và edit video ADS Tuyển sỉ nha khoa', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-02', khai, khai_name, 'Bán hàng', null, 'Set up quay video bán hàng ngày 06/06', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-02', khai, khai_name, 'Bán hàng', null, 'Edit video xào BLV Quang Huy 16', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-02', khai, khai_name, 'Bán hàng', null, 'Edit video xào BLV Quang Huy 18', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-03', khai, khai_name, 'Bán hàng', null, 'Edit video xào BLV Quang Huy 18', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-03', khai, khai_name, 'Bán hàng', null, 'Edit video xào BLV Quang Huy 25', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-03', khai, khai_name, 'Khác', null, 'Set up quay video Nhi', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-03', khai, khai_name, 'ADS FB', null, 'Fix lại video ADS Tuyển sỉ nha khoa', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-03', khai, khai_name, 'Khác', null, 'Họp nhận KPIs tháng 6', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-04', khai, khai_name, 'Xào KOC', null, 'Edit video xào BLV Quang Huy 18', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-04', khai, khai_name, 'Xào KOC', null, 'Edit video xào BLV Quang Huy 25', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-04', khai, khai_name, 'Bán hàng', null, 'Set up quay 13 video nhi bán hàng', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-04', khai, khai_name, 'Khác', null, 'Họp nhận KPIs tháng 6', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-05', khai, khai_name, 'Xào KOC', null, 'Fix video Quang Huy xào 18', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-05', khai, khai_name, 'Khác', null, 'Design 3 ảnh frame live', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-05', khai, khai_name, 'Khác', null, 'Họp Team Leader', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-05', khai, khai_name, 'Khác', null, 'Đánh giá thử việc Sơn', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-09', khai, khai_name, 'BS Nguyên', null, 'Edit video BS Nguyên dẫn dắt 1', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-09', khai, khai_name, 'BS Nguyên', null, 'Edit video BS Nguyên dẫn dắt 2', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-09', khai, khai_name, 'Khác', null, 'Set up phòng live', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-09', khai, khai_name, 'BS Nguyên', '331', 'Edit video BS Nguyên 331', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-10', khai, khai_name, 'Khác', null, 'Họp Team Leader về xây dựng Quy trình công việc, lộ trình đào tạo', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-10', khai, khai_name, 'Bán hàng', null, 'Edit video bán hàng Quang Huy x DrKam', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-10', khai, khai_name, 'ADS FB', null, 'Edit video ADS kịch bản 1', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-10', khai, khai_name, 'Bán hàng', null, 'Edit video xào Quang Huy', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-11', khai, khai_name, 'ADS FB', null, 'Edit video ADS kịch bản 1', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-11', khai, khai_name, 'ADS FB', null, 'Edit video ADS kịch bản 5', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-11', khai, khai_name, 'Branding', null, 'Edit video Branding WC kênh chính', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-11', khai, khai_name, 'Branding', null, 'Edit video Branding WC kênh DrKamvn', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-11', khai, khai_name, 'Khác', null, 'Thu voice 2 kịch bản video bán hàng', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-12', khai, khai_name, 'BS Nguyên', '330', 'Edit video BS Nguyên kb 330', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-12', khai, khai_name, 'BS Nguyên', '331', 'Edit video BS Nguyên kb 331', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-12', khai, khai_name, 'BS Nguyên', '332', 'Edit video BS Nguyên kb 332', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-12', khai, khai_name, 'Bán hàng', null, 'Set up quay 4 video bán hàng', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-12', khai, khai_name, 'BS Nguyên', '333', 'Edit video BS Nguyên kb 333', null, 'Đang làm', null, null, khai),
    ('2026-06-13', khai, khai_name, 'BS Nguyên', '333', 'Edit video BS Nguyên kb 333', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-13', khai, khai_name, 'BS Nguyên', '334', 'Edit video BS Nguyên kb 334', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-13', khai, khai_name, 'Khác', null, 'Sửa 1 ảnh Sale off tặng quà nha khoa', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-13', khai, khai_name, 'Khác', null, 'Sửa 3 ảnh sản phẩm sắp xếp tại nha khoa', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-16', khai, khai_name, 'Khác', null, 'Họp Team Content x Media', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-16', khai, khai_name, 'Xào KOC', null, 'Edit video MPB 1', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-16', khai, khai_name, 'Xào KOC', null, 'Edit video MPB 2', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-16', khai, khai_name, 'BS Nguyên', null, 'Fix video BS Nguyên 334', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-16', khai, khai_name, 'BS Nguyên', null, 'Fix video BS Nguyên 335', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-19', khai, khai_name, 'Xào KOC', null, 'Edit video MPB 2', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-19', khai, khai_name, 'BS Nguyên', '338', 'Edit video BS Nguyên 338', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-19', khai, khai_name, 'BS Nguyên', '339', 'Edit video BS Nguyên 339', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-19', khai, khai_name, 'BS Nguyên', '340', 'Edit video BS Nguyên 340', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-19', khai, khai_name, 'BS Nguyên', '341', 'Edit video BS Nguyên 341', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-19', khai, khai_name, 'BS Nguyên', '342', 'Edit video BS Nguyên 342', null, 'Đang làm', null, null, khai),
    ('2026-06-30', khai, khai_name, 'Khác', null, 'Quay 4 video dẫn live chạy', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-30', khai, khai_name, 'Xào KOC', null, 'Edit video Quang Huy x DrKam 1', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-30', khai, khai_name, 'Xào KOC', null, 'Edit video Quang Huy x DrKam 2', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-30', khai, khai_name, 'Xào KOC', null, 'Edit video Quang Huy x DrKam 3', null, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-30', khai, khai_name, 'Xào KOC', null, 'Edit video Quang Huy x DrKam 4', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-30', khai, khai_name, 'Bán hàng', null, 'Edit video dẫn live 3', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-30', khai, khai_name, 'Bán hàng', null, 'Edit video dẫn live 5', 1, 'Hoàn thành', null, 'Đã duyệt', khai),
    ('2026-06-01', son, son_name, 'Khác', null, 'Họp team MKT', 1, 'Hoàn thành', null, 'Đã duyệt', son),
    ('2026-06-01', son, son_name, 'Khác', null, 'Cắt chỉnh lại tài nguyên video BLV Quang Huy', 1, 'Hoàn thành', null, 'Đã duyệt', son),
    ('2026-06-01', son, son_name, 'Bán hàng', '3', 'Edit và sửa video xào BLV Quang Huy 3', 1, 'Hoàn thành', 'BLV QUANG HUY 3 - xào kênh vn.mp4', 'Đã duyệt', son),
    ('2026-06-01', son, son_name, 'Bán hàng', '4', 'Edit và sửa video xào BLV Quang Huy 4', 1, 'Hoàn thành', 'BLV QUANG HUY 4 - xào kênh chính.mp4', 'Đã duyệt', son),
    ('2026-06-01', son, son_name, 'Khác', null, 'Họp toàn công ty', 1, 'Hoàn thành', null, 'Đã duyệt', son),
    ('2026-06-02', son, son_name, 'Bán hàng', '7', 'Edit video xào BLV Quang Huy 7', 1, 'Hoàn thành', 'BLV Quang Huy xào 7.mp4', 'Đã duyệt', son),
    ('2026-06-02', son, son_name, 'Bán hàng', '10', 'Edit video xào BLV Quang Huy 10', 1, 'Hoàn thành', 'BLV Quang Huy xào 10 - Kịch bản dẫn live.mp4', 'Đã duyệt', son),
    ('2026-06-03', son, son_name, 'Bán hàng', '12', 'Edit và sửa video xào BLV Quang Huy 12', 1, 'Hoàn thành', 'BLV Quang Huy xào 12.mp4', 'Đã duyệt', son),
    ('2026-06-03', son, son_name, 'Bán hàng', '13', 'Edit và sửa video xào BLV Quang Huy 13', 1, 'Hoàn thành', 'BLV Quang Huy xào 13.mp4', 'Đã duyệt', son),
    ('2026-06-03', son, son_name, 'Bán hàng', '14', 'Edit và sửa video xào BLV Quang Huy 14', 1, 'Hoàn thành', 'BLV Quang Huy xào 14.mp4', 'Đã duyệt', son),
    ('2026-06-03', son, son_name, 'Xào KOC', '1', 'Edit video KOC Khánh T6 1', 1, 'Hoàn thành', 'T6 CKhanh 1.mp4', 'Đã duyệt', son),
    ('2026-06-03', son, son_name, 'Xào KOC', '2', 'Edit video KOC Khánh T6 2', 1, 'Hoàn thành', 'T6CKhanh 2.mp4', 'Đã duyệt', son),
    ('2026-06-03', son, son_name, 'Xào KOC', '1', 'Edit video KOC C Thư 1', 1, 'Hoàn thành', 'T6 CThư 1.mp4', 'Đã duyệt', son),
    ('2026-06-04', son, son_name, 'Bán hàng', '1', 'Edit video deal kênh VN 1', 1, 'Hoàn thành', 'Deal đầu tháng 6 - kênh VN 1.mp4', 'Đã duyệt', son),
    ('2026-06-04', son, son_name, 'Bán hàng', '1', 'Edit video deal kênh chính 1', 1, 'Hoàn thành', 'Deal đầu tháng 6 - kênh chính 1.mp4', 'Đã duyệt', son),
    ('2026-06-04', son, son_name, 'Bán hàng', '2', 'Edit video deal kênh VN 2', 1, 'Hoàn thành', 'Deal đầu tháng 6 - kênh vn 2.mp4', 'Đã duyệt', son),
    ('2026-06-04', son, son_name, 'Bán hàng', '2', 'Edit video deal kênh chính 2', 1, 'Hoàn thành', 'Deal đầu tháng 6 - kênh chính 2.mp4', 'Đã duyệt', son),
    ('2026-06-04', son, son_name, 'Xào KOC', '3', 'Edit video KOC Khánh T6 3', 1, 'Hoàn thành', 'T6CKhanh 3.mp4', 'Đã duyệt', son),
    ('2026-06-04', son, son_name, 'Xào KOC', '2', 'Edit video KOC C Thư 2', 1, 'Hoàn thành', 'T6 CThư 2.mp4', 'Đã duyệt', son),
    ('2026-06-05', son, son_name, 'Bán hàng', '3', 'Edit video deal kênh VN 3', 1, 'Hoàn thành', 'Deal đầu tháng 6 - kênh vn 3.mp4', 'Đã duyệt', son),
    ('2026-06-05', son, son_name, 'Bán hàng', '3', 'Edit video deal kênh chính 3', 1, 'Hoàn thành', 'Deal đầu tháng 6 - kênh chính 3.mp4', 'Đã duyệt', son),
    ('2026-06-05', son, son_name, 'Bán hàng', '257', 'Edit video DrKamVN 257', 1, 'Hoàn thành', 'DRKAMVN 257.mp4', 'Đã duyệt', son),
    ('2026-06-05', son, son_name, 'FB Daily', '90', 'Edit video bán hàng FB 90', 1, 'Hoàn thành', 'Bán hàng FB90.mp4', 'Đã duyệt', son),
    ('2026-06-05', son, son_name, 'Xào KOC', '4', 'Edit video KOC Khánh T6 4', 1, 'Hoàn thành', 'T6CKhanh 4.mp4', 'Đã duyệt', son),
    ('2026-06-05', son, son_name, 'Xào KOC', '3', 'Edit video KOC C Thư 3', 1, 'Hoàn thành', 'T6 CThư 3.mp4', 'Đã duyệt', son),
    ('2026-06-06', son, son_name, 'Bán hàng', '258', 'Edit video DrKamVN 258', 1, 'Hoàn thành', 'DRKAMVN 258.mp4', 'Đã duyệt', son),
    ('2026-06-06', son, son_name, 'FB Daily', '91', 'Edit video bán hàng FB 91', 1, 'Hoàn thành', 'Bán hàng FB91.mp4', 'Đã duyệt', son),
    ('2026-06-06', son, son_name, 'Xào KOC', '5', 'Edit video KOC Khánh T6 5', 1, 'Hoàn thành', 'T6CKhanh 5.mp4', 'Đã duyệt', son),
    ('2026-06-06', son, son_name, 'Xào KOC', '4', 'Edit video KOC C Thư 4', 1, 'Hoàn thành', 'T6 CThư 4.mp4', 'Đã duyệt', son),
    ('2026-06-08', son, son_name, 'Bán hàng', '259', 'Edit video DrKamVN 259', 1, 'Hoàn thành', 'DRKAMVN 259.mp4', 'Đã duyệt', son),
    ('2026-06-08', son, son_name, 'FB Daily', '92', 'Edit video bán hàng FB 92', 1, 'Hoàn thành', 'Bán hàng FB92.mp4', 'Đã duyệt', son),
    ('2026-06-08', son, son_name, 'Xào KOC', '6', 'Edit video KOC Khánh T6 6', 1, 'Hoàn thành', 'T6CKhanh 6.mp4', 'Đã duyệt', son),
    ('2026-06-08', son, son_name, 'Xào KOC', '5', 'Edit video KOC C Thư 5', 1, 'Hoàn thành', 'T6 CThư 5.mp4', 'Đã duyệt', son),
    ('2026-06-08', son, son_name, 'Bán hàng', '19', 'Edit và sửa video xào BLV Quang Huy 19', 1, 'Hoàn thành', 'BLV Quang Huy xào 19.mp4', 'Đã duyệt', son),
    ('2026-06-09', son, son_name, 'Bán hàng', '261', 'Edit video DrKamVN 261', 1, 'Hoàn thành', 'DRKAMVN 261.mp4', 'Đã duyệt', son),
    ('2026-06-09', son, son_name, 'FB Daily', '93', 'Edit video bán hàng FB 93', 1, 'Hoàn thành', 'Bán hàng FB93.mp4', 'Đã duyệt', son),
    ('2026-06-09', son, son_name, 'Xào KOC', '7', 'Edit video KOC Khánh T6 7', 1, 'Hoàn thành', 'T6CKhanh 7.mp4', 'Đã duyệt', son),
    ('2026-06-09', son, son_name, 'Xào KOC', '6', 'Edit video KOC C Thư 6', 1, 'Hoàn thành', 'T6 CThư 6.mp4', 'Đã duyệt', son),
    ('2026-06-09', son, son_name, 'Khác', null, 'Set up phòng live', 1, 'Hoàn thành', null, 'Đã duyệt', son),
    ('2026-06-10', son, son_name, 'Bán hàng', '262', 'Edit video DrKamVN 262', 1, 'Hoàn thành', 'DRKAMVN 262.mp4', 'Đã duyệt', son),
    ('2026-06-10', son, son_name, 'FB Daily', '94', 'Edit video bán hàng FB 94', 1, 'Hoàn thành', 'Bán hàng FB94.mp4', 'Đã duyệt', son),
    ('2026-06-10', son, son_name, 'Xào KOC', '8', 'Edit video KOC Khánh T6 8', 1, 'Hoàn thành', 'T6CKhanh 8.mp4', 'Đã duyệt', son),
    ('2026-06-10', son, son_name, 'Xào KOC', '7', 'Edit video KOC C Thư 7', 1, 'Hoàn thành', 'T6 CThư 7.mp4', 'Đã duyệt', son),
    ('2026-06-10', son, son_name, 'Bán hàng', '2', 'Edit video ADS Quang Huy 2', 1, 'Hoàn thành', 'Order Ads KB2.mp4', 'Đã duyệt', son),
    ('2026-06-10', son, son_name, 'Khác', null, 'Tạo bảng báo cáo cho team Media', 1, 'Hoàn thành', null, 'Đã duyệt', son),
    ('2026-06-11', son, son_name, 'Bán hàng', '1', 'Edit video deal giữa tháng', 1, 'Hoàn thành', 'KB 37 DEAL 13-15/6 kênh chính.mp4', 'Đã duyệt', son),
    ('2026-06-11', son, son_name, 'ADS FB', '1', 'Edit video ADS order by anh Tuân', 1, 'Hoàn thành', 'Order ADS Tuân 1.mp4', 'Đã duyệt', son),
    ('2026-06-11', son, son_name, 'Xào KOC', '9', 'Edit video KOC Khánh T6 9', 1, 'Hoàn thành', 'T6CKhanh 9.mp4', 'Đã duyệt', son),
    ('2026-06-11', son, son_name, 'Xào KOC', '10', 'Edit video KOC Khánh T6 10', 1, 'Hoàn thành', 'T6CKhanh 10.mp4', 'Đã duyệt', son),
    ('2026-06-11', son, son_name, 'Xào KOC', '8', 'Edit video KOC C Thư 8', 1, 'Hoàn thành', 'T6 CThư 8.mp4', 'Đã duyệt', son),
    ('2026-06-30', son, son_name, 'Khác', '4', 'Quay 4 video live chạy', 1, 'Hoàn thành', null, 'Đã duyệt', son),
    ('2026-06-30', son, son_name, 'Bán hàng', '268', 'Edit video DrKamVN 268', 1, 'Hoàn thành', 'DRKAMVN 268.mp4', 'Đã duyệt', son),
    ('2026-06-30', son, son_name, 'Xào KOC', '25', 'Edit video KOC Khánh T6 25', 1, 'Hoàn thành', 'T6CKhanh 25.mp4', 'Đã duyệt', son),
    ('2026-06-30', son, son_name, 'Xào KOC', '32', 'Edit video KOC C Thư 32', 1, 'Hoàn thành', 'T6 CThư 32.mp4', 'Đã duyệt', son),
    ('2026-06-30', son, son_name, 'Xào KOC', '16', 'Edit video MPB 16', 1, 'Hoàn thành', 'Mai Phương Bùi 16.mp4', 'Đã duyệt', son),
    ('2026-06-30', son, son_name, 'Xào KOC', '17', 'Edit video MPB 17', 1, 'Hoàn thành', 'Mai Phương Bùi 17.mp4', 'Đã duyệt', son),
    ('2026-06-30', son, son_name, 'Bán hàng', '1', 'Edit video dẫn live 1', 1, 'Hoàn thành', '0630 dẫn live 1 drkamvn.mp4', 'Đã duyệt', son),
    ('2026-06-30', son, son_name, 'Bán hàng', '2', 'Edit video dẫn live 2', 1, 'Hoàn thành', '0630 dẫn live 2 drkamvn.mp4', 'Đã duyệt', son);

  raise notice 'Seed báo cáo ngày Media T6/2026 xong: Khải=% | Sơn=% (121 dòng).', khai, son;
end $$;
