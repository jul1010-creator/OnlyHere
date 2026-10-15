// /api/deal-alerts.js
//
// Deal alerts, 15 Oct 2026. The rules are in src/utils/dealAlerts.js; this is
// the part that needs the service key and sends mail.
//
//   GET   from Vercel Cron, every 10 minutes, with Authorization: Bearer
//         CRON_SECRET: writes a news row for every new Klaipėda deal, mails a
//         short promotion at once to the members who want its kind of place,
//         and sends the morning roundup when it is due.
//   POST  from the Studio after a deal is saved and shown (founder only): the
//         same scan and the mails that go at once, not the roundup.
//   GET or POST ?unsub=<uuid>   turns that member's deal emails off. GET
//         answers a small page in their language, POST (one click from the
//         mail app) answers 200.
//
// It fails closed: a key that is missing is a 503 and nothing is read or sent.
// No upstream error and no key is ever echoed; the log gets a status number.
import { createHash, timingSafeEqual } from "node:crypto";
import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";
import { SUPABASE_FALLBACK_URL } from "../src/utils/aiGate.js";
import { placeDayKey } from "../src/utils/offerClock.js";
import {
  newsFromRows, newsIn, wantsMail, digestDue, digestNews, digestSince, instantMail, digestMail, unsubPage, unsubLink,
  langFromHeader, cleanLang, hashText, zonedInstant, ALERT_ZONE, DEAL_TYPES, DIGEST_LOOKBACK_DAYS,
} from "../src/utils/dealAlerts.js";

export const FROM = "Gemlyx <deals@gemlyxtravel.com>";
// Replies reach the address the site already answers, not a sending address.
export const REPLY_TO = "hello@gemlyxtravel.com";
// One run sends at most this many, inside this much time, two a second at
// most (Resend's default rate). What is left over goes on the next run, ten
// minutes later.
export const MAX_MAILS_PER_RUN = 40;
export const RUN_BUDGET_MS = 45000;
export const SEND_GAP_MS = 550;
// A short promotion is mailed by any run within this long of being seen, so
// one cut short by the budget or a slow reply is finished by the next.
export const INSTANT_WINDOW_MS = 2 * 3600000;
// The mail log is kept this long (privacy.html says so).
export const MAIL_LOG_DAYS = 90;
const FETCH_MS = 5000;
const SEND_MS = 8000;

const header = (headers, k) => {
  const h = headers || {};
  return String((typeof h.get === "function" ? h.get(k) : h[k]) || "");
};

// ── ONLY VERCEL'S CRON ──────────────────────────────────────────────
// Vercel sends Authorization: Bearer <CRON_SECRET> when the variable is set.
// Compared in constant time, over two hashes of equal length, so neither the
// secret nor its length can be read off the timing. No secret, no run.
export const cronAllowed = (headers, secret) => {
  const want = String(secret || "");
  if (!want) return false;
  const a = createHash("sha256").update(header(headers, "authorization")).digest();
  const b = createHash("sha256").update(`Bearer ${want}`).digest();
  return timingSafeEqual(a, b);
};

// ── A PERSON, OR A MAIL SCANNER ─────────────────────────────────────
// Outlook's Safe Links and other scanners open every link in a mail before
// anybody reads it (SETUP_EMAIL.md part 3, where it spent one-use tokens). A
// browser opening the unsubscribe link says it is a top-level navigation to a
// page; a scanner says nothing of the kind. So a visit that does not say so
// changes nothing and gets one button instead (unsubPage "confirm").
export const personOpened = (headers) =>
  header(headers, "sec-fetch-mode").toLowerCase() === "navigate" && header(headers, "sec-fetch-dest").toLowerCase() === "document";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const cleanToken = (v) => (UUID.test(String(v ?? "").trim()) ? String(v).trim().toLowerCase() : "");

// Only a confirmed address is mailed, and never a banned account.
export const mailableAddress = (u, now = new Date()) => {
  const email = String(u?.email || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  if (!(u.email_confirmed_at || u.confirmed_at)) return "";
  const ban = u.banned_until ? Date.parse(u.banned_until) : NaN;
  if (Number.isFinite(ban) && ban > now.getTime()) return "";
  return email;
};

// What goes to Resend for one mail, with the one-click unsubscribe headers
// Gmail and Yahoo ask a sender for (RFC 8058).
export const resendPayload = ({ to, mail, unsubUrl }) => ({
  from: FROM, to: [to], reply_to: REPLY_TO,
  subject: mail.subject, html: mail.html, text: mail.text,
  headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
});

class Failure extends Error {
  constructor(where, status) { super(where); this.where = where; this.status = status; }
}

const contextOf = (env) => {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "";
  const resendKey = env.RESEND_API_KEY || "";
  return { supabaseUrl: env.SUPABASE_URL || SUPABASE_FALLBACK_URL, serviceKey, resendKey };
};

const sb = (ctx, path, { method = "GET", body, prefer } = {}) => fetch(`${ctx.supabaseUrl}/rest/v1/${path}`, {
  method,
  headers: {
    apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}`,
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(prefer ? { Prefer: prefer } : {}),
  },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  signal: AbortSignal.timeout(FETCH_MS),
});
const readJson = async (r) => { try { return await r.json(); } catch { return null; } };
const listOf = async (r, where) => {
  if (!r.ok) throw new Failure(where, r.status);
  const rows = await readJson(r);
  if (!Array.isArray(rows)) throw new Failure(where, r.status);
  return rows;
};
const NEWS_COLUMNS = "id,deal_id,sig,category,name,offer,short,ends_at,quiet,created_at";

// ── 1. THE NEW DEALS ────────────────────────────────────────────────
// Every published Klaipėda deal that is on, written as a news row unless its
// offer has been seen before (on conflict do nothing). The very first run
// writes them all quietly: the deals that existed before alerts began are
// known from then on, and nobody is told about them.
// `offers` is every live deal's offer by deal_id, so a mail can give the
// offer in the member's language (newsIn).
export const scanDeals = async (ctx, now = new Date()) => {
  const rows = await listOf(await sb(ctx, `gemlyx_content?select=id,type,payload&published=eq.true&type=in.(${DEAL_TYPES.join(",")})&payload->>country=eq.LT&limit=2000`), "content");
  const offers = new Map(rows.filter(r => r?.payload?.__offer).map(r => [`${r.type}:${r.id}`, r.payload.__offer]));
  const fresh = newsFromRows(rows, now);
  if (!fresh.length) return { added: 0, quiet: false, offers };
  const quiet = (await listOf(await sb(ctx, "gemlyx_deal_news?select=id&limit=1"), "news")).length === 0;
  const made = await listOf(await sb(ctx, `gemlyx_deal_news?on_conflict=deal_id,sig&select=${NEWS_COLUMNS}`, {
    method: "POST", body: fresh.map(n => ({ ...n, quiet })), prefer: "resolution=ignore-duplicates,return=representation",
  }), "news insert");
  return { added: made.length, quiet, offers };
};

const membersWithMail = async (ctx, extra = "") =>
  listOf(await sb(ctx, `gemlyx_deal_alerts?select=user_id,cats,lang,unsub,last_digest_at,email_on&email_on=eq.true${extra}&order=user_id.asc&limit=2000`), "members");

// Which of these news rows each member has been mailed already.
const mailedFor = async (ctx, ids) => {
  const out = new Map();
  if (!ids.length) return out;
  const rows = await listOf(await sb(ctx, `gemlyx_deal_mail_log?select=user_id,news_id&news_id=in.(${ids.map(Number).filter(Number.isFinite).join(",")})&limit=100000`), "mail log");
  for (const r of rows) {
    if (!out.has(r.user_id)) out.set(r.user_id, new Set());
    out.get(r.user_id).add(Number(r.news_id));
  }
  return out;
};

const memberAddress = async (ctx, userId) => {
  try {
    const r = await fetch(`${ctx.supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` },
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (r.status === 404) return { email: "" };
    if (!r.ok) return { failed: true, email: "" };
    return { email: mailableAddress(await readJson(r)) };
  } catch { return { failed: true, email: "" }; }
};

const newRun = () => ({ started: Date.now(), sent: 0, last: 0 });
const hasRoom = (run) => run.sent < MAX_MAILS_PER_RUN && Date.now() - run.started < RUN_BUDGET_MS;
const send = async (ctx, run, payload, key) => {
  const wait = run.last + SEND_GAP_MS - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  run.last = Date.now();
  run.sent++;
  try {
    // The Idempotency-Key makes a retry of the same mail a no-op at Resend
    // for a day, so two runs that meet cannot send it twice.
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${ctx.resendKey}`, "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(SEND_MS),
    });
    if (!r.ok) console.error("deal-alerts send:", r.status);
    return r.ok;
  } catch { console.error("deal-alerts send: no answer"); return false; }
};
const logMail = async (ctx, rows) => {
  try {
    const r = await sb(ctx, "gemlyx_deal_mail_log?on_conflict=user_id,news_id", { method: "POST", body: rows, prefer: "resolution=ignore-duplicates,return=minimal" });
    if (!r.ok) console.error("deal-alerts log:", r.status);
  } catch { console.error("deal-alerts log: no answer"); }
};

// ── 2. A SHORT PROMOTION GOES OUT AT ONCE ───────────────────────────
// Every short one seen in the last two hours that is still on, to every member
// with mail on who ticked its kind of place and has not had it yet.
export const sendInstant = async (ctx, run, now = new Date(), offers = new Map()) => {
  const since = new Date(now.getTime() - INSTANT_WINDOW_MS).toISOString();
  const news = (await listOf(await sb(ctx, `gemlyx_deal_news?select=${NEWS_COLUMNS}&short=eq.true&quiet=eq.false&created_at=gt.${encodeURIComponent(since)}&order=created_at.asc&limit=50`), "short news"))
    .filter(n => !n.ends_at || Date.parse(n.ends_at) > now.getTime());
  if (!news.length) return 0;
  const members = await membersWithMail(ctx);
  if (!members.length) return 0;
  const mailed = await mailedFor(ctx, news.map(n => n.id));
  let count = 0;
  for (const n of news) {
    for (const m of members) {
      if (!wantsMail(m, n.category) || mailed.get(m.user_id)?.has(Number(n.id))) continue;
      if (!hasRoom(run)) return count;
      const who = await memberAddress(ctx, m.user_id);
      if (!who.email) continue;
      const mail = instantMail({ news: newsIn(n, offers, cleanLang(m.lang)), lang: cleanLang(m.lang), unsub: m.unsub, now });
      if (!(await send(ctx, run, resendPayload({ to: who.email, mail, unsubUrl: unsubLink(m.unsub) }), `instant:${m.user_id}:${n.id}`))) continue;
      count++;
      await logMail(ctx, [{ user_id: m.user_id, news_id: n.id, kind: "instant" }]);
    }
  }
  return count;
};

// ── 3. THE MORNING ROUNDUP ──────────────────────────────────────────
// Once a day from 09:00 in Klaipėda (digestDue), one mail per member at
// most: what is new in their kinds of place since their last roundup, not
// mailed to them already and not over. With nothing to say, nothing is sent
// and the day is still marked done.
export const sendDigests = async (ctx, run, now = new Date(), offers = new Map()) => {
  if (!digestDue(now, null)) return 0;
  const today = placeDayKey(now, ALERT_ZONE);
  const dayStart = zonedInstant(today, 0, ALERT_ZONE).toISOString();
  const members = await membersWithMail(ctx, `&or=${encodeURIComponent(`(last_digest_at.is.null,last_digest_at.lt."${dayStart}")`)}`);
  if (!members.length) return 0;
  const back = new Date(now.getTime() - DIGEST_LOOKBACK_DAYS * 86400000).toISOString();
  const news = await listOf(await sb(ctx, `gemlyx_deal_news?select=${NEWS_COLUMNS}&quiet=eq.false&created_at=gt.${encodeURIComponent(back)}&order=created_at.desc&limit=500`), "news");
  const mailed = await mailedFor(ctx, news.map(n => n.id));
  let count = 0;
  for (const m of members) {
    if (!hasRoom(run)) break;
    if (!digestDue(now, m.last_digest_at)) continue;
    const items = digestNews(news, m, { now, since: digestSince(now, m.last_digest_at), mailed: mailed.get(m.user_id) || new Set() });
    if (items.length) {
      const who = await memberAddress(ctx, m.user_id);
      // Supabase did not answer: tried again on the next run.
      if (who.failed) continue;
      if (who.email) {
        const mail = digestMail({ items: items.map(i => newsIn(i, offers, cleanLang(m.lang))), lang: cleanLang(m.lang), unsub: m.unsub, now });
        const key = `digest:${m.user_id}:${today}:${hashText(items.map(i => i.id).join(","))}`;
        if (!(await send(ctx, run, resendPayload({ to: who.email, mail, unsubUrl: unsubLink(m.unsub) }), key))) continue;
        count++;
        await logMail(ctx, items.map(i => ({ user_id: m.user_id, news_id: i.id, kind: "digest" })));
      }
    }
    try {
      const r = await sb(ctx, `gemlyx_deal_alerts?user_id=eq.${encodeURIComponent(m.user_id)}`, { method: "PATCH", body: { last_digest_at: now.toISOString() }, prefer: "return=minimal" });
      if (!r.ok) console.error("deal-alerts digest mark:", r.status);
    } catch { console.error("deal-alerts digest mark: no answer"); }
  }
  return count;
};

// The mail log older than 90 days goes, once a run; a failure here is retried
// on the next run and stops nothing.
const pruneLog = async (ctx, now) => {
  try {
    const before = new Date(now.getTime() - MAIL_LOG_DAYS * 86400000).toISOString();
    const r = await sb(ctx, `gemlyx_deal_mail_log?sent_at=lt.${encodeURIComponent(before)}`, { method: "DELETE", prefer: "return=minimal" });
    if (!r.ok) console.error("deal-alerts prune:", r.status);
  } catch { console.error("deal-alerts prune: no answer"); }
};

// ── UNSUBSCRIBE ─────────────────────────────────────────────────────
const unsubscribe = async (req, res, ctx) => {
  const token = cleanToken(req.query?.unsub);
  const wantsPage = req.method === "GET" || /text\/html/i.test(header(req.headers, "accept"));
  const answer = (status, state, lang) => {
    if (!wantsPage) return res.status(status).json(status === 200 ? { ok: true } : { error: "Not available just now." });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Robots-Tag", "noindex");
    return res.status(status).send(unsubPage({ state, lang, action: `/api/deal-alerts?unsub=${token}` }));
  };
  const browserLang = langFromHeader(header(req.headers, "accept-language"));
  if (!ctx.serviceKey) return answer(503, "failed", browserLang);
  if (!token) return answer(404, "unknown", browserLang);
  let row;
  try {
    const rows = await listOf(await sb(ctx, `gemlyx_deal_alerts?select=user_id,lang&unsub=eq.${token}&limit=1`), "unsub read");
    row = rows[0];
  } catch (e) {
    console.error("deal-alerts unsub:", e?.where || "read", e?.status || "");
    return answer(503, "failed", browserLang);
  }
  if (!row) return answer(404, "unknown", browserLang);
  const lang = cleanLang(row.lang);
  if (req.method === "GET" && !personOpened(req.headers)) return answer(200, "confirm", lang);
  try {
    const r = await sb(ctx, `gemlyx_deal_alerts?unsub=eq.${token}`, { method: "PATCH", body: { email_on: false }, prefer: "return=minimal" });
    if (!r.ok) { console.error("deal-alerts unsub:", r.status); return answer(503, "failed", lang); }
  } catch { console.error("deal-alerts unsub: no answer"); return answer(503, "failed", lang); }
  return answer(200, "off", lang);
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const env = process.env;
  const ctx = contextOf(env);

  // A mail app's one-click POST and a reader's tap come from outside the site,
  // so the unsubscribe link carries its own secret and needs nothing else.
  if (req.query?.unsub !== undefined) {
    if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Use GET or POST." });
    return unsubscribe(req, res, ctx);
  }

  if (req.method === "GET") {
    if (!env.CRON_SECRET) return res.status(503).json({ error: "Not set up yet." });
    if (!cronAllowed(req.headers, env.CRON_SECRET)) return res.status(401).json({ error: "Not allowed." });
    if (!ctx.serviceKey || !ctx.resendKey) return res.status(503).json({ error: "Not set up yet." });
    try {
      const now = new Date();
      const run = newRun();
      const scan = await scanDeals(ctx, now);
      const instant = await sendInstant(ctx, run, now, scan.offers);
      const digests = await sendDigests(ctx, run, now, scan.offers);
      await pruneLog(ctx, now);
      return res.status(200).json({ ok: true, added: scan.added, quiet: scan.quiet, instant, digests });
    } catch (e) {
      console.error("deal-alerts:", e?.where || "run", e?.status || "");
      return res.status(503).json({ error: "Not available just now." });
    }
  }

  if (req.method === "POST") {
    if (!requestIsFromSite(req.headers)) {
      return res.status(403).json({ error: NOT_FROM_SITE });
    }
    if (!ctx.serviceKey || !ctx.resendKey) return res.status(503).json({ error: "Not set up yet." });
    const who = await resolveUser(req.headers, { supabaseUrl: ctx.supabaseUrl, serviceKey: ctx.serviceKey });
    if (!who.ok) return res.status(who.status).json({ error: who.error });
    if (!isFounder(who.userId, env.GEMLYX_FOUNDER_IDS)) return res.status(403).json({ error: "Only Studio can send deal alerts." });
    try {
      const now = new Date();
      const scan = await scanDeals(ctx, now);
      const instant = await sendInstant(ctx, newRun(), now, scan.offers);
      return res.status(200).json({ ok: true, added: scan.added, instant });
    } catch (e) {
      console.error("deal-alerts studio:", e?.where || "run", e?.status || "");
      return res.status(503).json({ error: "Not available just now." });
    }
  }

  return res.status(405).json({ error: "Use GET or POST." });
}
