-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Seed Team Media tháng 6/2026                          ║
-- ║  Chạy SAU migration 0007 và SAU khi đã tạo tài khoản Auth cho  ║
-- ║  Khải & Sơn (Authentication > Add user).                       ║
-- ║  Việc làm: gán phòng Media + vai trò Nhân viên cho 2 hồ sơ,    ║
-- ║  seed KPI T6 và Đề xuất cải tiến T6. Chạy lại nhiều lần an toàn.║
-- ╚══════════════════════════════════════════════════════════════╝
do $$
declare
  khai uuid;
  son  uuid;
begin
  select id into khai from public.profiles where email = 'khaint@drkam.vn';
  select id into son  from public.profiles where email = 'sonvv@drkam.vn';
  if khai is null or son is null then
    raise exception 'Chưa có tài khoản Khải/Sơn trong profiles. Hãy tạo qua Authentication > Add user trước (khaint@drkam.vn, sonvv@drkam.vn).';
  end if;

  -- 1) Gán phòng Media + vai trò Nhân viên + tên hiển thị.
  update public.profiles set name = 'Nguyễn Trọng Khải', role = 'Nhân viên', department = 'Media' where id = khai;
  update public.profiles set name = 'Vũ Văn Sơn',        role = 'Nhân viên', department = 'Media' where id = son;

  -- 2) KPI tháng 6 (xóa cũ rồi thêm — chạy lại an toàn).
  delete from public.media_kpi_entries where period = '2026-06' and employee_id in (khai, son);
  insert into public.media_kpi_entries
    (period, employee_id, employee_name, role_scope, stt, group_name, metric, target_value, unit, weight, actual_value, note, created_by) values
    -- Khải (6 chỉ số)
    ('2026-06', khai, 'Nguyễn Trọng Khải', 'NV', 1, 'Hiệu suất', 'Số lượng video sản xuất trong tháng', 180,        'number',   50, 210,       null, khai),
    ('2026-06', khai, 'Nguyễn Trọng Khải', 'NV', 2, 'Hiệu quả',  'Tổng lượt reach đa kênh',              15000000,   'number',   10, 8023259,   null, khai),
    ('2026-06', khai, 'Nguyễn Trọng Khải', 'NV', 3, 'Hiệu quả',  'Doanh thu TikTok Seller (video inhouse)', 400000000, 'currency', 20, 355551750, null, khai),
    ('2026-06', khai, 'Nguyễn Trọng Khải', 'NV', 4, 'Hiệu quả',  'Doanh thu Facebook ADS (video team)',  150000000,  'currency', 10, 311687517, null, khai),
    ('2026-06', khai, 'Nguyễn Trọng Khải', 'NV', 5, 'Nhân sự',   'Tỷ lệ nhân sự đạt KPI',                90,         'percent',   5, 100,       null, khai),
    ('2026-06', khai, 'Nguyễn Trọng Khải', 'NV', 6, 'Nhân sự',   'Hoàn thành khóa đào tạo',              100,        'percent',   5, 100,       null, khai),
    -- Sơn (2 chỉ số)
    ('2026-06', son,  'Vũ Văn Sơn', 'NV', 1, 'Branding', 'Số lượng video sản xuất trong tháng',                       90,        'number',   90, 129,       'Tự đếm từ sheet Sơn, lọc T6/2026', son),
    ('2026-06', son,  'Vũ Văn Sơn', 'NV', 2, 'Doanh số', 'Doanh thu từ video trên TikTok Seller + ADS Facebook',      200000000, 'currency', 10, 333619633, null, son);

  -- 3) Đề xuất cải tiến tháng 6 (7 mục).
  delete from public.media_improvements where period = '2026-06';
  insert into public.media_improvements (period, stt, issue, proposal, benefit, priority, created_by) values
    ('2026-06', 1, 'Team chỉ 2 người nhưng gánh 6 đầu việc (branding, BS Nguyên, bán hàng, xào KOC, ADS, FB daily) → dễ quá tải, khó đạt 180 + 90 video/tháng.', 'Phân vai rõ: Khải tập trung video doanh thu cao (TikTok Seller, ADS FB); Sơn tập trung branding + FB daily. Lập lịch sản xuất tuần cố định.', 'Giảm nghẽn cổ chai, ổn định sản lượng, mỗi người chuyên sâu 1 mảng.', 'Cao', khai),
    ('2026-06', 2, 'Doanh thu TikTok Seller & ADS FB là KPI trọng số lớn (20% + 10%) nhưng phụ thuộc nhiều yếu tố ngoài Media.', 'Bám KOC/sản phẩm đang ra đơn tốt để nhân bản; phối hợp Marketing chọn sản phẩm hot trước khi quay; review video win hàng tuần.', 'Tăng tỷ lệ video ra đơn, nâng điểm 2 KPI doanh thu.', 'Cao', khai),
    ('2026-06', 3, 'Thiếu thư viện template & quy trình edit chuẩn → mỗi video edit lại từ đầu, tốn thời gian.', 'Xây thư viện preset (intro/outro, sub, hiệu ứng, nhạc), checklist edit chuẩn DrKam, kho B-roll dùng chung.', 'Rút ngắn 20–30% thời gian edit, tăng sản lượng.', 'Trung bình', khai),
    ('2026-06', 4, 'Sản xuất video AI (KPI Doanh số AI của Sơn) còn mới, chưa có quy trình.', 'Chuẩn hóa pipeline AI (prompt ảnh → Veo3 → edit) dựa trên các skill video AI sẵn có; mỗi tuần ra 2–3 video AI test.', 'Mở thêm nguồn doanh thu, đạt KPI Doanh số AI 200tr.', 'Trung bình', khai),
    ('2026-06', 5, 'Đo lường reach đa kênh thủ công, dễ sai lệch, khó tổng hợp 15M lượt.', 'Lập sheet tracking reach tự động theo ngày/kênh; chốt số liệu mỗi cuối ngày từ sheet Báo cáo ngày.', 'Số liệu reach minh bạch, báo cáo nhanh.', 'Trung bình', khai),
    ('2026-06', 6, 'Chưa có buổi review nội bộ định kỳ để rút kinh nghiệm video không hiệu quả.', 'Họp Media 30 phút/tuần: chấm điểm video tuần trước, chọn 1 video win để nhân bản, 1 video fail để tránh.', 'Cải thiện chất lượng liên tục, tăng % video ra đơn.', 'Thấp', khai),
    ('2026-06', 7, 'Đào tạo & phát triển năng lực (KPI 5%) chưa có lộ trình cụ thể.', 'Mỗi tháng hoàn thành tối thiểu 1 khóa (dựng phim, AI video, storytelling bán hàng); ghi nhận chứng chỉ.', 'Đạt KPI đào tạo, nâng tay nghề cả team.', 'Thấp', khai);

  raise notice 'Seed Team Media T6/2026 xong. Khải=% | Sơn=%', khai, son;
end $$;
