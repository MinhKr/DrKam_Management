// ============================================================================
//  THÍ NGHIỆM: Dò xem Meta Graph API trả về những chỉ số traffic nào cho
//  2 fanpage "Kênh thương hiệu" của DrKam — TRƯỚC khi quyết định code nút Đồng bộ.
//
//  CHẠY:
//    1. Lấy token tạm theo hướng dẫn (xem scripts/README-FB-TEST.md).
//    2. Dán token vào biến môi trường rồi chạy:
//         PowerShell:  $env:FB_TOKEN="EAAB...token..."; node scripts/fb-insights-test.mjs
//         (hoặc truyền thẳng: node scripts/fb-insights-test.mjs EAAB...token... )
//
//  Script CHỈ ĐỌC (read-only), không ghi gì lên Facebook hay database.
// ============================================================================

const API = "https://graph.facebook.com/v23.0";
const TOKEN = process.env.FB_TOKEN || process.argv[2];

if (!TOKEN) {
  console.error("\n❌ Chưa có token. Chạy:  node scripts/fb-insights-test.mjs <TOKEN>\n");
  process.exit(1);
}

// 8 chỉ số trong Google Sheet và (các) tên metric ứng viên ở Meta API.
// Vì Meta hay đổi tên/khai tử, mỗi chỉ số thử NHIỀU tên — cái nào trả số thì lấy.
const PAGE_METRICS = {
  "Views/Reach (page/ngày)": ["page_impressions_unique", "page_impressions", "page_views_total"],
  "Số follow tăng (page/ngày)": ["page_fan_adds", "page_fan_adds_unique", "page_daily_follows", "page_follows"],
};
const POST_METRICS = {
  "Tỷ lệ xem hết video": ["post_video_complete_views_organic", "post_video_views_organic", "post_video_views"],
  "Thời gian xem TB": ["post_video_avg_time_watched", "post_video_view_time"],
  "Lưu (Save)": ["post_saves", "post_saved"],
};

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
const since = new Date(today); since.setDate(today.getDate() - 14); // dò 14 ngày gần nhất

async function call(path, params = {}) {
  const url = new URL(`${API}/${path}`);
  url.searchParams.set("access_token", TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.message} (code ${json.error.code})`);
  return json;
}

// Thử lần lượt các tên metric ứng viên, trả về tên + giá trị đầu tiên có số.
async function tryMetrics(path, names, params) {
  for (const name of names) {
    try {
      const r = await call(path, { metric: name, ...params });
      const data = r.data?.[0];
      let val;
      if (data?.values?.length) {
        // page metric: mảng values theo ngày → lấy số khác 0 gần nhất
        const nonZero = data.values.filter((v) => v.value && v.value !== 0);
        val = nonZero.length ? nonZero[nonZero.length - 1].value : data.values[data.values.length - 1].value;
      } else if (data?.value !== undefined) {
        val = data.value;
      }
      if (val !== undefined && val !== null) return { name, val, ok: true };
    } catch (e) {
      // thử tên tiếp theo
    }
  }
  return { ok: false };
}

function show(label, r) {
  if (r.ok) console.log(`   ✅ ${label.padEnd(28)} = ${JSON.stringify(r.val)}   [metric: ${r.name}]`);
  else console.log(`   ⛔ ${label.padEnd(28)} = (không có / lỗi tất cả tên thử)`);
}

(async () => {
  console.log(`\n🔎 Khoảng dò: ${ymd(since)} → ${ymd(today)}  (API ${API})\n`);

  // 1) Token này quản lý những page nào?
  let pages = [];
  try {
    const me = await call("me/accounts", { fields: "name,id,access_token", limit: "50" });
    pages = me.data || [];
  } catch (e) {
    console.error("❌ Không lấy được danh sách page (/me/accounts):", e.message);
    console.error("   → Kiểm tra token còn hạn & đã cấp quyền pages_show_list / pages_read_engagement / read_insights.\n");
    process.exit(1);
  }

  if (!pages.length) {
    console.error("❌ Token hợp lệ nhưng không quản lý page nào. Đăng nhập bằng tài khoản admin của 2 page DrKam.\n");
    process.exit(1);
  }

  console.log(`📄 Token quản lý ${pages.length} page:`);
  pages.forEach((p) => console.log(`   • ${p.name}  (id ${p.id})`));
  console.log("");

  // 2) Dò chỉ số cho từng page
  for (const page of pages) {
    console.log(`\n══════════════════════════════════════════════════════════════`);
    console.log(`PAGE: ${page.name}  (id ${page.id})`);
    console.log(`══════════════════════════════════════════════════════════════`);
    // Lấy PAGE TOKEN cho chắc: đọc reactions/comments của bài cần Page token,
    // nếu dùng User token sẽ bị đòi "Page Public Content Access".
    let pageToken = page.access_token;
    if (!pageToken) {
      try {
        const pt = await call(page.id, { fields: "access_token" });
        pageToken = pt.access_token;
      } catch {}
    }
    if (pageToken && pageToken !== TOKEN) console.log("   (Đang dùng PAGE token ✓)");
    else { pageToken = TOKEN; console.log("   (⚠️ Không lấy được PAGE token — dùng tạm USER token)"); }

    const callPage = (path, params) => {
      const url = new URL(`${API}/${path}`);
      url.searchParams.set("access_token", pageToken);
      for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
      return fetch(url).then((r) => r.json());
    };
    const tryPage = async (names, params) => {
      for (const name of names) {
        try {
          const r = await callPage(`${page.id}/insights`, { metric: name, ...params });
          if (r.error) continue;
          const d = r.data?.[0];
          if (d?.values?.length) {
            const nz = d.values.filter((v) => v.value && v.value !== 0);
            const val = nz.length ? nz[nz.length - 1].value : d.values.at(-1).value;
            if (val !== undefined) return { ok: true, name, val };
          }
        } catch {}
      }
      return { ok: false };
    };

    console.log("\n  ── Chỉ số mức PAGE / ngày (lấy thẳng) ──");
    for (const [label, names] of Object.entries(PAGE_METRICS)) {
      show(label, await tryPage(names, { period: "day", since: ymd(since), until: ymd(today) }));
    }

    // 3) Lấy vài bài đăng gần nhất → đo engagement + video (cộng dồn)
    console.log("\n  ── Chỉ số mức BÀI ĐĂNG (phải cộng dồn các bài) ──");
    let posts = [];
    try {
      const pr = await callPage(`${page.id}/posts`, {
        fields: "id,created_time,message",
        since: ymd(since),
        limit: "10",
      });
      if (pr.error) throw new Error(pr.error.message);
      posts = pr.data || [];
    } catch (e) {
      console.log(`   ⚠️ Không lấy được danh sách bài đăng: ${e.message}`);
    }
    console.log(`   (Tìm thấy ${posts.length} bài trong 14 ngày — đo trên bài mới nhất làm mẫu)`);

    if (posts.length) {
      const p = posts[0];
      console.log(`   Bài mẫu: ${p.id}  "${(p.message || "(không có text)").slice(0, 40)}..."`);

      // Engagement: GỌI RIÊNG TỪNG TRƯỜNG để biết chính xác cái nào lỗi, in lỗi thật.
      const tryField = async (label, fields, pick) => {
        const r = await callPage(p.id, { fields });
        if (r.error) {
          console.log(`   ⛔ ${label.padEnd(28)} = LỖI: ${r.error.message} (code ${r.error.code})`);
          return;
        }
        const val = pick(r);
        if (val !== undefined && val !== null)
          console.log(`   ✅ ${label.padEnd(28)} = ${val}   [field: ${fields}]`);
        else
          console.log(`   ⛔ ${label.padEnd(28)} = (trả về rỗng) raw: ${JSON.stringify(r).slice(0, 120)}`);
      };
      await tryField("Like (reactions)", "reactions.summary(true)", (r) => r.reactions?.summary?.total_count);
      await tryField("Comment", "comments.summary(true)", (r) => r.comments?.summary?.total_count);
      await tryField("Share", "shares", (r) => r.shares?.count ?? 0);

      // Phương án dự phòng: đọc tương tác qua /insights (endpoint này đang chạy tốt)
      console.log("   ── (dự phòng) đọc tương tác qua /insights ──");
      const tryPostInsight = async (label, metric) => {
        const r = await callPage(`${p.id}/insights`, { metric });
        if (r.error) { console.log(`   ⛔ ${label.padEnd(26)} = LỖI: ${r.error.message}`); return; }
        const v = r.data?.[0]?.values?.[0]?.value;
        console.log(`   ✅ ${label.padEnd(26)} = ${JSON.stringify(v)}   [metric: ${metric}]`);
      };
      await tryPostInsight("Reactions (insight)", "post_reactions_by_type_total");
      await tryPostInsight("Hoạt động theo loại", "post_activity_by_action_type");

      // Lưu + video: qua post insights
      const tryPost = async (names) => {
        for (const name of names) {
          try {
            const r = await callPage(`${p.id}/insights`, { metric: name });
            if (r.error) continue;
            const d = r.data?.[0];
            const val = d?.values?.[0]?.value;
            if (val !== undefined && val !== null && Object.keys(val).length !== 0) return { ok: true, name, val };
            if (typeof val === "number") return { ok: true, name, val };
          } catch {}
        }
        return { ok: false };
      };
      for (const [label, names] of Object.entries(POST_METRICS)) {
        show(label, await tryPost(names));
      }
    }
  }

  console.log(`\n\n✅ Xong. Nhìn cột ✅/⛔ ở trên để biết chỉ số nào kéo tự động được, chỉ số nào phải nhập tay.\n`);
})();
