// ============================================================================
//  PROBE REELS: dò xem Reels của page trả về chỉ số nào (page đăng chủ yếu Reels).
//  Liệt kê reels gần đây + thử nhiều metric cho reel mới nhất → biết metric nào dùng.
//
//  CHẠY (token còn hạn):
//     $env:FB_TOKEN="EAA..."; node scripts/fb-reels-test.mjs
//  hoặc đọc từ .env.local:
//     $env:FB_TOKEN=$(Select-String '^FB_ACCESS_TOKEN' .env.local).Line.Split('"')[1]; node scripts/fb-reels-test.mjs
// ============================================================================

const API = 'https://graph.facebook.com/v23.0';
const TOKEN = process.env.FB_TOKEN || process.argv[2];
if (!TOKEN) { console.error('\n❌ Thiếu token.\n'); process.exit(1); }

async function call(token, path, params = {}) {
  const url = new URL(`${API}/${path}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return (await fetch(url)).json();
}

// Metric ứng viên cho Reels — dùng endpoint /{id}/video_insights, họ total_video_*
const REEL_METRICS = [
  'blue_reels_play_count',
  'blue_reels_aggregated_play_count',
  'post_video_avg_time_watched',
  'total_video_avg_time_watched',
  'post_video_view_time',
  'total_video_view_total_time',
  'post_video_social_actions',
  'post_video_likes_by_reaction_type',
];

(async () => {
  const me = await call(TOKEN, 'me/accounts', { fields: 'name,id,access_token', limit: '50' });
  const pages = me.data || [];
  if (!pages.length) { console.error('❌ Token không quản lý page nào.\n'); process.exit(1); }

  for (const page of pages) {
    const pt = page.access_token || (await call(TOKEN, page.id, { fields: 'access_token' })).access_token || TOKEN;
    console.log(`\n════════════════════════════════════════════════════════════`);
    console.log(`PAGE: ${page.name}  (id ${page.id})`);
    console.log(`════════════════════════════════════════════════════════════`);

    // 1) Liệt kê reels
    const reelsResp = await call(pt, `${page.id}/video_reels`, { fields: 'id,created_time,description', limit: '10' });
    if (reelsResp.error) { console.log(`   ⛔ /video_reels lỗi: ${reelsResp.error.message}`); continue; }
    const reels = reelsResp.data || [];
    console.log(`\n   📹 Tìm thấy ${reels.length} reels gần đây:`);
    reels.slice(0, 5).forEach((r) => {
      const day = (r.created_time || '').slice(0, 10);
      const desc = (r.description || '(không mô tả)').replace(/\s+/g, ' ').slice(0, 40);
      console.log(`      • ${day}  id ${r.id}  "${desc}"`);
    });

    if (!reels.length) { console.log('   (Page không có reels)'); continue; }

    // 2) Probe metric trên reel mới nhất qua /video_insights
    const reel = reels[0];
    console.log(`\n   🔎 video_insights cho reel mới nhất (${reel.id}):`);
    for (const metric of REEL_METRICS) {
      const r = await call(pt, `${reel.id}/video_insights`, { metric });
      if (r.error) { console.log(`      ⛔ ${metric.padEnd(36)} = LỖI: ${r.error.message.slice(0, 50)}`); continue; }
      const v = r.data?.[0]?.values?.[0]?.value;
      console.log(`      ✅ ${metric.padEnd(36)} = ${JSON.stringify(v)}`);
    }

    // 3) Đọc reel object: like/comment/share/views trực tiếp
    console.log(`\n   🔎 Đọc trực tiếp reel object (like/comment/share/views):`);
    const obj = await call(pt, reel.id, { fields: 'views,length,likes.summary(true).limit(0),comments.summary(true).limit(0),shares' });
    if (obj.error) console.log(`      ⛔ object: ${obj.error.message.slice(0, 90)}`);
    else console.log(`      views=${obj.views ?? '?'}  length=${obj.length ?? '?'}s  like=${obj.likes?.summary?.total_count ?? '?'}  comment=${obj.comments?.summary?.total_count ?? '?'}  share=${obj.shares?.count ?? '?'}`);
  }

  console.log(`\n  → Dòng ✅ cho biết metric nào lấy được số reels. Gửi kết quả này lại.\n`);
})();
