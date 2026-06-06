// ============================================================================
//  DÒ METRIC: tìm đúng tên metric cho "Lượt xem" (Views) và "Follower mới".
//  In giá trị của NHIỀU metric ứng viên cho 1 NGÀY cụ thể → bạn so với
//  Business Suite (Lượt xem = 20.930 ngày 24/05) để biết metric nào đúng.
//
//  CHẠY:
//     node scripts/fb-find-metric.mjs            (mặc định ngày 2026-05-24)
//     node scripts/fb-find-metric.mjs 2026-05-30 (đổi ngày khác)
//     $env:FB_TOKEN="EAA..."; node scripts/fb-find-metric.mjs 2026-05-24
// ============================================================================

const API = "https://graph.facebook.com/v23.0";
const TOKEN = process.env.FB_TOKEN || (process.argv[2]?.startsWith("EAA") ? process.argv[2] : process.argv[3]);
const TARGET = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) || "2026-05-24";
if (!TOKEN) { console.error("\n❌ Thiếu token.\n"); process.exit(1); }

// ngày kế tiếp (để until)
const next = new Date(TARGET + "T00:00:00Z"); next.setUTCDate(next.getUTCDate() + 1);
const UNTIL = next.toISOString().slice(0, 10);

// Các metric ứng viên cho "Lượt xem / hiển thị" và "Follower mới"
const VIEW_CANDIDATES = [
  "page_posts_impressions",           // hiển thị bài feed = 16777 (đã biết)
  "page_posts_impressions_organic",
  "page_posts_impressions_paid",
  "page_impressions_unique",          // = REACH (tham chiếu) = 14858
  // --- video / reels: phần nghi ngờ còn thiếu để ra 20.930 ---
  "page_video_views",
  "page_video_views_organic",
  "page_video_views_paid",
  "page_video_views_unique",
  "page_video_repeat_views",
  "page_video_views_autoplayed",
  "page_video_views_click_to_play",
];
const FOLLOW_CANDIDATES = [
  "page_daily_follows",               // follow mới/ngày (đang dùng)
  "page_daily_follows_unique",
  "page_fan_adds",                    // lượt thích mới (like ≠ follow ở FB mới)
  "page_fan_adds_unique",
];

async function call(token, path, params = {}) {
  const url = new URL(`${API}/${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return (await fetch(url)).json();
}

(async () => {
  const me = await call(TOKEN, "me/accounts", { fields: "name,id,access_token", limit: "50" });
  const pages = me.data || [];
  if (!pages.length) { console.error("❌ Token không quản lý page nào.\n"); process.exit(1); }

  for (const page of pages) {
    const pt = page.access_token || (await call(TOKEN, page.id, { fields: "access_token" })).access_token || TOKEN;
    console.log(`\n════════════════════════════════════════════════════════════`);
    console.log(`PAGE: ${page.name}   —   NGÀY: ${TARGET}`);
    console.log(`════════════════════════════════════════════════════════════`);

    const probe = async (metric) => {
      const r = await call(pt, `${page.id}/insights`, { metric, period: "day", since: TARGET, until: UNTIL });
      if (r.error) return `LỖI: ${r.error.message}`;
      const vals = r.data?.[0]?.values || [];
      // tìm value có end_time đúng ngày kế (FB gắn end_time = đầu ngày hôm sau)
      const hit = vals.find((v) => (v.end_time || "").startsWith(UNTIL)) || vals[0];
      return hit ? `${hit.value}   (end_time ${(hit.end_time || "").slice(0, 10)})` : "(rỗng)";
    };

    console.log(`\n  🔎 LƯỢT XEM — so với Business Suite "Lượt xem" (vd 24/05 = 20.930):`);
    for (const m of VIEW_CANDIDATES) console.log(`     ${m.padEnd(34)} = ${await probe(m)}`);

    console.log(`\n  🔎 FOLLOWER MỚI — so với "Người theo dõi mới" ngày đó:`);
    for (const m of FOLLOW_CANDIDATES) console.log(`     ${m.padEnd(34)} = ${await probe(m)}`);
  }

  console.log(`\n  → Tìm dòng có số = số trong Business Suite. Đó là metric đúng để dùng.\n`);
})();
