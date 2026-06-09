import { NextRequest, NextResponse } from 'next/server';

/**
 * API ĐỒNG BỘ TRAFFIC FACEBOOK (Kênh thương hiệu) — MÔ HÌNH PAGE-LEVEL/NGÀY
 * ------------------------------------------------------------------------
 * Tính theo CẢ NGÀY, CẢ KÊNH (khớp Meta Business Suite), KHÔNG bị 0 khi ngày
 * đó không đăng bài (vẫn đếm view/tương tác của reel cũ).
 *
 * Trả về mỗi ngày:
 *   viewsReach     = page_video_views        (lượt xem video cả ngày, cả kênh)
 *   reach          = page_posts_impressions_unique
 *   like           = page_actions_post_reactions_total (cộng mọi reaction)
 *   comment, share = cộng từ reels/bài ĐĂNG trong ngày (page-level KHÔNG tách
 *                    riêng comment/share → lấy theo bài để điền sẵn, sửa được)
 *   completionRate = page_video_complete_views_30s / page_video_views * 100
 *   avgDuration    = page_video_view_time / page_video_views (giây)
 *   followerIncr   = page_daily_follows
 * (Views headline & Lưu: người dùng tự nhập/sửa.)
 *
 * Token: FB_ACCESS_TOKEN (server-only). ?pageId=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
 * pageId không phải số → fallback page đầu tiên của token (tiện test).
 *
 * Bẫy múi giờ: insights gắn end_time = 0h ngày D+1 (Pacific) → data ngày D nằm
 * ở value end_time = D+1. Số theo ngày sẽ lệch vài % so với Business Suite (giờ VN).
 */

const API = 'https://graph.facebook.com/v23.0';

interface FbError { message: string; code?: number }
async function fb(token: string, path: string, params: Record<string, string>) {
  const url = new URL(`${API}/${path}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const json = await (await fetch(url)).json();
  if (json.error) {
    const e = json.error as FbError;
    throw new Error(`${e.message}${e.code ? ` (code ${e.code})` : ''}`);
  }
  return json;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
};
const toDdmmyyyy = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const sumObj = (o: unknown) =>
  o && typeof o === 'object' ? Object.values(o as Record<string, unknown>).reduce((s: number, n) => s + (Number(n) || 0), 0) : (Number(o) || 0);

export async function GET(req: NextRequest) {
  const token = process.env.FB_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'Chưa cấu hình FB_ACCESS_TOKEN trong .env.local (xem scripts/README-FB-TEST.md).' },
      { status: 500 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const from = sp.get('from');
  const to = sp.get('to');
  const pageIdParam = (sp.get('pageId') || '').trim();
  if (!from || !to) {
    return NextResponse.json({ error: 'Thiếu tham số from/to (YYYY-MM-DD).' }, { status: 400 });
  }

  try {
    // 1) Page + page token
    const accounts = await fb(token, 'me/accounts', { fields: 'name,id,access_token', limit: '50' });
    const pages: Array<{ id: string; name: string; access_token?: string }> = accounts.data || [];
    if (!pages.length) {
      return NextResponse.json({ error: 'Token không quản lý page nào. Đăng nhập bằng tài khoản admin page.' }, { status: 400 });
    }
    const isNumeric = /^\d+$/.test(pageIdParam);
    const page = (isNumeric && pages.find((p) => p.id === pageIdParam)) || pages[0];
    const pageToken = page.access_token
      || (await fb(token, page.id, { fields: 'access_token' })).access_token
      || token;
    const usedFallback = !isNumeric || page.id !== pageIdParam;

    const until = addDays(to, 1);

    // 2) Lấy 1 chuỗi metric page-level theo ngày → map { dayIso(D): value }.
    //    end_time = D+1 (Pacific) → lùi 1 ngày.
    const daySeries = async (metric: string): Promise<Record<string, unknown>> => {
      try {
        const r = await fb(pageToken, `${page.id}/insights`, { metric, period: 'day', since: from, until });
        const map: Record<string, unknown> = {};
        for (const v of r.data?.[0]?.values || []) {
          const dayIso = addDays((v.end_time || '').slice(0, 10), -1);
          map[dayIso] = v.value;
        }
        return map;
      } catch { return {}; }
    };

    const [reactions, videoViews, reach, viewTime, complete30, follows] = await Promise.all([
      daySeries('page_actions_post_reactions_total'),
      daySeries('page_video_views'),
      daySeries('page_posts_impressions_unique'),
      daySeries('page_video_view_time'),
      daySeries('page_video_complete_views_30s'),
      daySeries('page_daily_follows'),
    ]);

    // 3) Comment & Share: page-level KHÔNG tách → cộng từ reels + bài đăng trong ngày.
    const cs: Record<string, { comment: number; share: number; posts: number }> = {};
    const bump = (dayIso: string) => (cs[dayIso] ??= { comment: 0, share: 0, posts: 0 });

    let reels: Array<{ id: string; created_time: string }> = [];
    try {
      const rr = await fb(pageToken, `${page.id}/video_reels`, { fields: 'id,created_time', limit: '50' });
      reels = rr.data || [];
    } catch { /* */ }
    for (const reel of reels) {
      const dayIso = (reel.created_time || '').slice(0, 10);
      if (dayIso < from || dayIso > to) continue;
      const a = bump(dayIso); a.posts++;
      try {
        const vi = await fb(pageToken, `${reel.id}/video_insights`, { metric: 'post_video_social_actions' });
        const v = vi.data?.[0]?.values?.[0]?.value || {};
        a.comment += Number(v.COMMENT) || 0;
        a.share += Number(v.SHARE) || 0;
      } catch { /* */ }
    }
    try {
      const postsResp = await fb(pageToken, `${page.id}/posts`, { fields: 'id,created_time', since: from, until, limit: '100' });
      for (const post of postsResp.data || []) {
        const dayIso = (post.created_time || '').slice(0, 10);
        if (!cs[dayIso] && (dayIso < from || dayIso > to)) continue;
        const a = bump(dayIso); a.posts++;
        try {
          const act = await fb(pageToken, `${post.id}/insights`, { metric: 'post_activity_by_action_type' });
          const v = act.data?.[0]?.values?.[0]?.value || {};
          a.comment += Number(v.comment) || 0;
          a.share += Number(v.share) || 0;
        } catch { /* */ }
      }
    } catch { /* */ }

    // 4) Đóng gói theo ngày
    let postsScanned = 0;
    const records = [];
    for (let iso = to; iso >= from; iso = addDays(iso, -1)) {
      const vv = Number(videoViews[iso]) || 0;
      const vt = Number(viewTime[iso]) || 0;
      const c30 = Number(complete30[iso]) || 0;
      const c = cs[iso] || { comment: 0, share: 0, posts: 0 };
      postsScanned += c.posts;
      records.push({
        date: toDdmmyyyy(iso),
        viewsReach: vv,
        reach: Number(reach[iso]) || 0,
        like: sumObj(reactions[iso]),
        comment: c.comment,
        share: c.share,
        completionRate: vv > 0 ? Math.round((c30 / vv) * 1000) / 10 : 0,
        avgDuration: vv > 0 ? Math.round((vt / vv / 1000) * 10) / 10 : 0,
        followerIncr: Number(follows[iso]) || 0,
      });
    }

    return NextResponse.json({ page: { id: page.id, name: page.name }, usedFallback, postsScanned, records });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
