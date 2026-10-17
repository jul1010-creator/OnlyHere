// ── DEAL ALERTS, THE MEMBER'S OWN SIDE ──────────────────────────────
//
// 15 Oct 2026. The bell and the settings read and write here, with the
// member's own token, so row level security is what keeps one member's row
// from another (DEAL_ALERTS_15OCT.sql). The rules are in dealAlerts.js.
//
// Every answer comes back with a state, because "the tables are not there
// yet" and "the network is down" are different things to show: until Oliver
// has run the SQL the bell hides and the settings say "Not available just
// now", and nobody sees an error screen.
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { getSession } from "./auth";
import { cleanCats, cleanLang } from "./dealAlerts";

export const ALERTS = { READY: "ready", MISSING: "missing", OFFLINE: "offline", SIGNED_OUT: "signed-out" };
// Said on window when the settings change, so the bell reads them again.
export const ALERTS_CHANGED = "gx:deal-alerts-changed";

const headers = (s) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${s.token}`, "Content-Type": "application/json" });
// The token at the moment of use, not the one the page started with (see
// userSaves.js: an hour-old token is how saves once stopped syncing).
const live = async (session) => {
  if (!session?.token || !session?.userId) return null;
  const fresh = await getSession();
  return fresh?.token && fresh?.userId ? fresh : null;
};
// PostgREST answers a table that is not there with 404 and PGRST205 (42P01 on
// older versions), and a column grant that is missing with 42501.
export const tableMissing = (status, body) => status === 404 || /^(PGRST205|42P01|42501)$/.test(String(body?.code || ""));

const shapeRow = (row) => (row ? { cats: cleanCats(row.cats), email_on: row.email_on === true, lang: cleanLang(row.lang), seen_at: row.seen_at || null } : null);

export const readAlerts = async (session) => {
  const s = await live(session);
  if (!s) return { state: ALERTS.SIGNED_OUT, row: null };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_deal_alerts?select=cats,email_on,lang,seen_at&user_id=eq.${encodeURIComponent(s.userId)}`, { headers: headers(s) });
    const body = await r.json().catch(() => null);
    if (!r.ok || !Array.isArray(body)) return { state: tableMissing(r.status, body) ? ALERTS.MISSING : ALERTS.OFFLINE, row: null };
    return { state: ALERTS.READY, row: shapeRow(body[0]) };
  } catch { return { state: ALERTS.OFFLINE, row: null }; }
};

// The latest news, quiet ones left out. The member's own filter is applied
// by newsForMember, so changing a tick shows at once without a second read.
export const readNews = async (session, limit = 60) => {
  const s = await live(session);
  if (!s) return { state: ALERTS.SIGNED_OUT, rows: [] };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_deal_news?select=id,deal_id,category,name,offer,short,ends_at,quiet,created_at&quiet=eq.false&order=created_at.desc&limit=${limit}`, { headers: headers(s) });
    const body = await r.json().catch(() => null);
    if (!r.ok || !Array.isArray(body)) return { state: tableMissing(r.status, body) ? ALERTS.MISSING : ALERTS.OFFLINE, rows: [] };
    return { state: ALERTS.READY, rows: body };
  } catch { return { state: ALERTS.OFFLINE, rows: [] }; }
};

// Only the fields given are written, so opening the bell (seen_at) cannot
// undo a tick made on another device. The first write makes the row, with the
// table's defaults for the rest: all four kinds of place, mail off.
export const saveAlerts = async (session, patch = {}) => {
  const s = await live(session);
  if (!s) return { ok: false, state: ALERTS.SIGNED_OUT };
  const body = { user_id: s.userId, updated_at: new Date().toISOString() };
  if (patch.cats !== undefined) body.cats = cleanCats(patch.cats);
  if (patch.email_on !== undefined) body.email_on = patch.email_on === true;
  if (patch.lang !== undefined) body.lang = cleanLang(patch.lang);
  if (patch.seen_at !== undefined) body.seen_at = patch.seen_at;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_deal_alerts?on_conflict=user_id&select=cats,email_on,lang,seen_at`, {
      method: "POST",
      headers: { ...headers(s), Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(body),
    });
    const got = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, state: tableMissing(r.status, got) ? ALERTS.MISSING : ALERTS.OFFLINE };
    return { ok: true, state: ALERTS.READY, row: shapeRow(Array.isArray(got) ? got[0] : got) };
  } catch { return { ok: false, state: ALERTS.OFFLINE }; }
};

// ── WHEN THE BELL WAS LAST OPENED, ON THIS DEVICE TOO ───────────────
// The row holds it for every device; this holds it before there is a row, and
// keeps the count right when the row cannot be written. Per account, so two
// people sharing a laptop do not read each other's count.
const SEEN_KEY = "gx_deal_seen";
export const localSeen = (uid) => {
  try { const m = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); return typeof m?.[uid] === "string" ? m[uid] : null; } catch { return null; }
};
export const setLocalSeen = (uid, iso) => {
  try {
    const m = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {};
    m[uid] = iso;
    localStorage.setItem(SEEN_KEY, JSON.stringify(m));
  } catch { /* private mode: the row still holds it */ }
};
// The later of two moments, either of which may be missing.
export const laterOf = (a, b) => {
  const x = Date.parse(a || ""), y = Date.parse(b || "");
  if (!Number.isFinite(x)) return Number.isFinite(y) ? b : null;
  if (!Number.isFinite(y)) return a;
  return x >= y ? a : b;
};
