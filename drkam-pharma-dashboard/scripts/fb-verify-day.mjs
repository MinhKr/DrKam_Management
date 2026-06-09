// ============================================================================
//  KIỂM CHỨNG THEO NGÀY: in từng Reel của 1 ngày + số liệu, rồi cộng TỔNG
//  (đúng bằng số modal "Báo cáo" hiển thị) → mở từng link đếm tay để đối chiếu.
//
//  CHẠY (token còn hạn trong .env.local):
//    node scripts/fb-verify-day.mjs 2026-06-06
//    node scripts/fb-verify-day.mjs 2026-06-06 1029716813565392   (1 page cụ thể)
//    $env:FB_TOKEN="EAA..."; node scripts/fb-verify-day.mjs 2026-06-06
// ============================================================================

const API = 'https://graph.facebook.com/v23.0';
const ARGS = process.argv.slice(2);
const TOKEN = process.env.FB_TOKEN || ARGS.find((a) => a.startsWith('EAA'));
const DATE = ARGS.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) || new Date().toISOString().slice(0, 10);
const ONLY_PAGE = ARGS.find((a) => /^\d{6,}$/.test(a));
if (!TOKEN) { console.error('\n❌ Thiếu token.\n'); process.exit(1); }

async function fb(token, path, params = {}) {
  const url = new URL(`${API}/${path}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const j = await (await fetch(url)).json();
  if (j.error) throw new Error(j.error.message);
  return j;
}
const sec = (ms) => Math.round((ms / 1000) * 10) / 10;

(async () => {
  console.log(`\n🔎 KIỂM CHỨNG NGÀY ${DATE}\n`);
  const acc = await fb(TOKEN, 'me/accounts', { fields: 'name,id,access_token', limit: '50' });
  let pages = acc.data || [];
  if (ONLY_PAGE) pages = pages.filter((p) => p.id === ONLY_PAGE);

  for (const page of pages) {
    const pt = page.access_token || (await fb(TOKEN, page.id, { fields: 'access_token' })).access_token;
    console.log(`════════════════════════════════════════════════════════════`);
    console.log(`PAGE: ${page.name}`);
    console.log(`════════════════════════════════════════════════════════════`);

    // Follower mới của ngày (page-level, end_time = D+1)
    let follow = 0;
    try {
      const f = await fb(pt, `${page.id}/insights`, { metric: 'page_daily_follows', period: 'day', since: DATE, until: addDay(DATE) });
      const hit = (f.data?.[0]?.values || []).find((v) => (v.end_time || '').startsWith(addDay(DATE)));
      follow = Number(hit?.value) || 0;
    } catch {}

    const rr = await fb(pt, `${page.id}/video_reels`, { fields: 'id,created_time,length,description', limit: '50' });
    const reels = (rr.data || []).filter((r) => (r.created_time || '').slice(0, 10) === DATE);

    if (!reels.length) {
      console.log(`   (Ngày ${DATE} không có reel nào) — Follow+ = ${follow}\n`);
      continue;
    }

    let tLike = 0, tCmt = 0, tShare = 0, tAvgSum = 0, tAvgN = 0, tCompSum = 0, tCompN = 0;
    console.log(`   ${reels.length} reel trong ngày — mở link đếm tay rồi so với số dưới:\n`);
    for (const reel of reels) {
      let like = 0, cmt = 0, share = 0, avg = 0;
      try {
        const vi = await fb(pt, `${reel.id}/video_insights`, {
          metric: 'post_video_likes_by_reaction_type,post_video_social_actions,post_video_avg_time_watched',
        });
        for (const m of vi.data || []) {
          const val = m.values?.[0]?.value;
          if (m.name === 'post_video_likes_by_reaction_type' && val) like = Object.values(val).reduce((s, n) => s + (Number(n) || 0), 0);
          else if (m.name === 'post_video_social_actions' && val) { cmt = Number(val.COMMENT) || 0; share = Number(val.SHARE) || 0; }
          else if (m.name === 'post_video_avg_time_watched') avg = sec(Number(val) || 0);
        }
      } catch (e) { console.log(`   ⚠️ reel ${reel.id}: ${e.message}`); }

      let views = '?';
      try { const o = await fb(pt, reel.id, { fields: 'views' }); views = o.views ?? '?'; } catch {}

      tLike += like; tCmt += cmt; tShare += share;
      if (avg > 0) { tAvgSum += avg; tAvgN++; }
      const comp = reel.length ? Math.min(100, Math.round((avg / reel.length) * 1000) / 10) : null;
      if (comp != null) { tCompSum += comp; tCompN++; }

      const desc = (reel.description || '').replace(/\s+/g, ' ').slice(0, 38);
      console.log(`   • 👍 ${like}  💬 ${cmt}  ↪ ${share}  ⏱ ${avg}s  (views ${views}, dài ${reel.length ?? '?'}s, xem hết ~${comp ?? '?'}%)`);
      console.log(`     "${desc}"`);
      console.log(`     https://www.facebook.com/reel/${reel.id}\n`);
    }

    console.log(`   ─────────── TỔNG NGÀY ${DATE} (= số modal hiển thị) ───────────`);
    console.log(`   Like ${tLike} | Comment ${tCmt} | Share ${tShare} | TG xem TB ${tAvgN ? Math.round(tAvgSum / tAvgN * 10) / 10 : 0}s | Xem hết ~${tCompN ? Math.round(tCompSum / tCompN * 10) / 10 : 0}% | Follow+ ${follow}`);
    console.log(`   (Views & Lưu: nhập tay)\n`);
  }
})();

function addDay(iso) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }
