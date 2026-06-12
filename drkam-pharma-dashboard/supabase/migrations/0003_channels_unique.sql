-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam — Migration 0003                                        ║
-- ║  Chống TRÙNG kênh: UNIQUE(platform, name).                    ║
-- ║   • Cùng nền tảng KHÔNG được 2 kênh trùng tên (chặn 2 người   ║
-- ║     claim cùng 1 ID Shopee; chặn chạy seed nhiều lần).        ║
-- ║   • TikTok và Facebook trùng tên vẫn được (khác nền tảng).    ║
-- ║  Chạy SAU 0002. Idempotent.                                   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1. Dọn trùng sẵn có (nếu lỡ seed nhiều lần): với mỗi (platform, name) giữ
--    bản tạo SỚM NHẤT, xóa các bản trùng CHƯA bị tham chiếu (không có báo cáo
--    & không có fanpage). Bản trùng nào đang có dữ liệu sẽ KHÔNG bị đụng tới
--    → nếu còn sót, bước 2 sẽ báo lỗi rõ để xử lý tay (tránh xóa nhầm số liệu).
delete from public.channels c
using (
  select id,
         row_number() over (partition by platform, name order by created_at, id) as rn
  from public.channels
) d
where c.id = d.id
  and d.rn > 1
  and not exists (select 1 from public.daily_reports r where r.channel_id = c.id)
  and not exists (select 1 from public.fb_pages p where p.channel_id = c.id);

-- 2. Ràng buộc duy nhất theo (platform, name).
alter table public.channels drop constraint if exists channels_platform_name_uniq;
alter table public.channels add constraint channels_platform_name_uniq unique (platform, name);
