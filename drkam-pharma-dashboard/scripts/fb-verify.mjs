// ============================================================================
//  KIỂM CHỨNG: đối chiếu số API trả về với số bạn TỰ ĐẾM trên Facebook.
//
//  Script in ra MỖI BÀI: link trực tiếp + số like/comment/share + video mà API
//  báo. Bạn click từng link, nhìn bằng mắt rồi so sánh. Nếu khớp → API đúng.
//
//  CHẠY (dùng lại token cũ còn hạn):
//     node scripts/fb-verify.mjs
//  Hoặc:  $env:FB_TOKEN="EAA...token..."; node scripts/fb-verify.mjs
// ============================================================================

const API = "https://graph.facebook.com/v23.0";
const TOKEN = process.env.FB_TOKEN || process.argv[2];
if (!TOKEN) { console.error("\n❌ Thiếu token: node scripts/fb-verify.mjs <TOKEN>\n"); process.exit(1); }

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
const since = new Date(today); since.setDate(today.getDate() - 14);

async function call(token, path, params = {}) {
  const url = new URL(`${API}/${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await (await fetch(url)).json();
  if (r.error) throw new Error(`${r.error.message} (code ${r.error.code})`);
  return r;
}

(async () => {
  const me = await call(TOKEN, "me/accounts", { fields: "name,id,access_token", limit: "50" });
  const pages = me.data || [];
  if (!pages.length) { console.error("❌ Token không quản lý page nào.\n"); process.exit(1); }

  for (const page of pages) {
    const pt = page.access_token || (await call(TOKEN, page.id, { fields: "access_token" })).access_token;
    console.log(`\n════════════════════════════════════════════════════════════════════`);
    console.log(`PAGE: ${page.name}`);
    console.log(`════════════════════════════════════════════════════════════════════`);

    // ── A. KIỂM CHỨNG MỨC PAGE: Reach & Follow theo TỪNG NGÀY ──
    //    Đối chiếu với: Meta Business Suite → Số liệu chi tiết (Insights) cùng ngày.
    console.log(`\n📊 REACH & FOLLOW theo ngày  (đối chiếu trong Meta Business Suite > Insights)`);
    try {
      const reach = await call(pt, `${page.id}/insights`, {
        metric: "page_impressions_unique", period: "day", since: ymd(since), until: ymd(today),
      });
      const follows = await call(pt, `${page.id}/insights`, {
        metric: "page_daily_follows", period: "day", since: ymd(since), until: ymd(today),
      });
      const reachByDay = reach.data?.[0]?.values || [];
      const folByDay = follows.data?.[0]?.values || [];
      console.log(`   ${"Ngày".padEnd(12)} ${"Reach".padStart(8)} ${"Follow+".padStart(8)}`);
      reachByDay.forEach((v, i) => {
        const day = (v.end_time || "").slice(0, 10);
        console.log(`   ${day.padEnd(12)} ${String(v.value ?? "").padStart(8)} ${String(folByDay[i]?.value ?? "").padStart(8)}`);
      });
    } catch (e) { console.log(`   ⚠️ ${e.message}`); }

    // ── B. KIỂM CHỨNG MỨC BÀI: mỗi bài 1 link + số API báo ──
    //    Đối chiếu: click link → đếm tay like/comment/share hiển thị trên bài.
    console.log(`\n🔗 TỪNG BÀI (mở link rồi đếm tay so với số API):`);
    let posts = [];
    try {
      const pr = await call(pt, `${page.id}/posts`, {
        fields: "id,created_time,permalink_url,message", since: ymd(since), limit: "25",
      });
      posts = pr.data || [];
    } catch (e) { console.log(`   ⚠️ Không lấy được bài: ${e.message}`); }

    for (const p of posts) {
      let act = {};
      try {
        const r = await call(pt, `${p.id}/insights`, { metric: "post_activity_by_action_type" });
        act = r.data?.[0]?.values?.[0]?.value || {};
      } catch {}
      const day = (p.created_time || "").slice(0, 10);
      const like = act.like ?? 0, cmt = act.comment ?? 0, share = act.share ?? 0;
      const text = (p.message || "(ảnh/video không có chữ)").replace(/\s+/g, " ").slice(0, 35);
      console.log(`\n   • ${day}  👍 ${like}   💬 ${cmt}   ↪ ${share}`);
      console.log(`     "${text}..."`);
      console.log(`     ${p.permalink_url || "(không có link)"}`);
    }

    console.log(`\n   → Mở vài link bất kỳ ở trên, đếm số like/comment thực tế trên bài,`);
    console.log(`     so với 👍/💬/↪ mà API báo. Khớp = API đúng.`);
  }

  console.log(`\n`);
})();
