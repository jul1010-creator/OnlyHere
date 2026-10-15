// ── DEAL ALERTS ─────────────────────────────────────────────────────
//
// Oliver, 14 Oct 2026: "make a notification system for users, so they can see
// whenever a new discount has popped up. Also a mail one, but make it so people
// can tick off what notifications they want from as well. So they don't get
// tons from museums, which they obviously are not interested in."
//
// His answers when asked: alerts are for members who are signed in, in the app
// and by mail, and the mail is "One daily, but if there is a 'short promotion'
// like 'We have no customers.. so for the next 3 hours we give free table'"
// then that one goes out at once.
//
// This file is the rules, with no React and nothing a server cannot load:
// every import ends in .js and none of them reads import.meta, so
// api/deal-alerts.js, the bell in the header and the suite all read the same
// rules rather than three copies of them (15 Oct 2026).
import { cleanClock, cleanDays, minutesOf, placeClock, placeDayKey } from "./offerClock.js";
import { DEAL_CATEGORIES, dealCategory } from "./dealCategories.js";
import { COUNTRY_PROFILES } from "./countries.js";
import { t as uiT } from "./uiLanguage.js";

export { DEAL_CATEGORIES };

// The deals are Klaipėda's, so every clock here is the place's.
export const ALERT_ZONE = COUNTRY_PROFILES.LT.zone;
export const ALERT_LANGS = ["en", "da", "de", "lt"];
export const SITE = "https://www.gemlyxtravel.com";
// The same limits as the table's checks in DEAL_ALERTS_15OCT.sql. The offer's
// is offer.js's OFFER_TEXT_MAX, restated because offer.js reads the browser's
// config and a server route cannot load it (the suite holds the two equal).
export const NAME_MAX = 120;
export const OFFER_MAX = 140;
// What the bell lists at most, and what one roundup carries at most.
export const MAX_PANEL = 20;
export const DIGEST_MAX = 10;
// A short promotion ends within this many hours (see isShortPromotion).
export const SHORT_HOURS = 24;
// The roundup goes at the first run at or after 09:00 in Klaipėda.
export const DIGEST_AT_MIN = 9 * 60;
// A roundup reaches back to the last one, but never further than a week, so
// somebody who turns mail back on after a month is not sent the month.
export const DIGEST_LOOKBACK_DAYS = 7;

const squash = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const toDate = (v) => {
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

// ── THE CATEGORIES A MEMBER TICKED ──────────────────────────────────
// The four, in Explore's order, each once. Anything that is not a list is the
// default, all four; an empty list is a choice (nothing) and is kept.
export const cleanCats = (v) => {
  if (!Array.isArray(v)) return [...DEAL_CATEGORIES];
  const set = new Set(v.map(String));
  return DEAL_CATEGORIES.filter(c => set.has(c));
};
export const cleanLang = (v) => (ALERT_LANGS.includes(String(v || "").toLowerCase()) ? String(v).toLowerCase() : "en");

// ── AN OFFER, READ THE WAY offer.js READS IT ────────────────────────
// The fields of payload.__offer that decide when it holds, cleaned by the
// offerClock rules. The text is the English as written in the Studio, which
// cleanOffer has already taken the dashes out of when it was saved.
export const offerParts = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const ongoing = raw.ongoing === true;
  const from = cleanClock(raw.from), to = cleanClock(raw.to);
  const hours = !!(from && to && minutesOf(to) > minutesOf(from));
  return {
    text: squash(raw.text).slice(0, OFFER_MAX),
    until: ongoing ? "" : squash(raw.until),
    ongoing,
    days: cleanDays(raw.days),
    from: hours ? from : "",
    to: hours ? to : "",
  };
};

// ── THE OFFER'S FINGERPRINT ─────────────────────────────────────────
// What makes it the same promotion: its text and when it holds. Translations
// are left out, so writing the Lithuanian later is not a new deal; a new text,
// a new last day or new hours is. cyrb53, because it is stable, quick, and the
// same in a browser and on the server with nothing to load.
const cyrb53 = (str) => {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
};
export const hashText = cyrb53;
export const offerSig = (offer) => {
  const o = offerParts(offer);
  if (!o) return "";
  return cyrb53(JSON.stringify([o.text, o.until, o.ongoing ? 1 : 0, o.days, o.from, o.to]));
};

// ── A WALL CLOCK IN KLAIPĖDA, AS A MOMENT ───────────────────────────
// The zone's offset is read at the moment itself, twice, so the night the
// clocks change still lands on the right hour.
const offsetMin = (at, zone) => {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at).map(x => [x.type, x.value]));
    const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((wall - at.getTime()) / 60000);
  } catch { return 0; }
};
export const zonedInstant = (day, minutes = 0, zone = ALERT_ZONE) => {
  const m = DAY_RE.exec(String(day || "")) && String(day).split("-").map(Number);
  if (!m) return null;
  const wall = Date.UTC(m[0], m[1] - 1, m[2]) + minutes * 60000;
  let t = wall - offsetMin(new Date(wall), zone) * 60000;
  const again = wall - offsetMin(new Date(t), zone) * 60000;
  if (again !== t) t = again;
  return new Date(t);
};
export const dayShift = (day, n) => {
  const [y, m, d] = String(day).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const weekdayOf = (day) => { const [y, m, d] = String(day).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

// ── WHEN AN OFFER STOPS ─────────────────────────────────────────────
// The last moment it can be used: its last day, at its end time, or at
// midnight when it runs all day. When it runs on some weekdays only, the last
// of those on or before its last day. null for an ongoing offer (no end) or
// one with no readable last day.
export const endsAt = (offer, zone = ALERT_ZONE) => {
  const o = offerParts(offer);
  if (!o || !o.text || o.ongoing || !DAY_RE.test(o.until)) return null;
  let day = o.until;
  if (o.days.length) {
    let k = 0;
    while (k < 7 && !o.days.includes(weekdayOf(day))) { day = dayShift(day, -1); k++; }
    if (k === 7) return null;
  }
  return zonedInstant(day, o.to ? minutesOf(o.to) : 24 * 60, zone);
};

// On at all: readable text, and either no last day by choice or a last moment
// still to come. Stricter than offer.js's offerLive by the hours: an offer
// whose last window closed at 16:00 is over at 16:00, not at midnight.
export const offerStillOn = (offer, now = new Date(), zone = ALERT_ZONE) => {
  const o = offerParts(offer);
  if (!o || !o.text) return false;
  if (o.ongoing) return true;
  const end = endsAt(o, zone);
  return !!end && end.getTime() > now.getTime();
};

// ── WHAT COUNTS AS A SHORT PROMOTION, AND SO GOES OUT AT ONCE ───────
// Oliver's example is a place with no customers giving a free table "for the
// next 3 hours". So a promotion is short when all three hold:
//   1. it is a one off: not ongoing (an offer with no last day is the
//      opposite of short, however narrow its weekly hours are);
//   2. it has a last day, and its last moment (endsAt) is still to come;
//   3. that last moment is at most SHORT_HOURS, 24, from now.
// So "today 13:00 to 16:00", "today only" and "tomorrow until 11:00" seen at
// noon are short; anything with more than a day left, and every weekly or
// ongoing offer, waits for the morning roundup.
export const isShortPromotion = (offer, now = new Date(), zone = ALERT_ZONE) => {
  const o = offerParts(offer);
  if (!o || !o.text || o.ongoing) return false;
  const end = endsAt(o, zone);
  if (!end) return false;
  const left = end.getTime() - now.getTime();
  return left > 0 && left <= SHORT_HOURS * 3600000;
};

// ── THE NEWS THE SERVER WRITES, FROM THE PUBLISHED ROWS ─────────────
// One per Klaipėda deal that is on, keyed as the partner links key a place
// (`${row.type}:${row.id}`, DealStudio's partnerLink), so a news row and the
// deal on Explore name the same place.
export const DEAL_TYPES = ["food", "night", "shop", "free"];
export const newsFromRows = (rows, now = new Date(), zone = ALERT_ZONE) => {
  const out = [];
  const seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const p = row?.payload;
    if (!p || !DEAL_TYPES.includes(row.type) || row.id === null || row.id === undefined) continue;
    if (String(p.country || "").toUpperCase() !== "LT") continue;
    const name = squash(p.name).slice(0, NAME_MAX);
    const o = offerParts(p.__offer);
    if (!name || !o || !o.text || !offerStillOn(o, now, zone)) continue;
    const deal_id = `${row.type}:${row.id}`;
    const sig = offerSig(o);
    if (!/^[a-z]{1,16}:[A-Za-z0-9_-]{1,64}$/.test(deal_id) || seen.has(`${deal_id}|${sig}`)) continue;
    seen.add(`${deal_id}|${sig}`);
    const end = endsAt(o, zone);
    out.push({
      deal_id, sig,
      category: dealCategory({ ...p, type: row.type }),
      name, offer: o.text,
      short: isShortPromotion(o, now, zone),
      ends_at: end ? end.toISOString() : null,
    });
  }
  return out;
};

// ── THE OFFER IN THE MEMBER'S LANGUAGE ──────────────────────────────
// As offer.js offerTextIn reads it: a translation written in the Studio
// counts only while it is of the text as it stands, else the English.
export const offerTextFor = (raw, lang = "en") => {
  const o = offerParts(raw);
  if (!o || !o.text) return "";
  const tr = raw?.tr;
  if (lang === "en" || !tr || typeof tr !== "object" || squash(tr.src).slice(0, OFFER_MAX) !== o.text) return o.text;
  return squash(tr[lang]).slice(0, OFFER_MAX) || o.text;
};
// A news row with its offer in `lang`, read off the live deal (`offers`,
// deal_id to payload.__offer) only while that deal still holds the same offer
// (the same fingerprint); a row about an offer since changed keeps its text.
export const newsIn = (news, offers, lang = "en") => {
  const live = offers instanceof Map ? offers.get(news?.deal_id) : null;
  if (!live || !news?.sig || offerSig(live) !== news.sig) return news;
  return { ...news, offer: offerTextFor(live, lang) || news.offer };
};

// ── WHAT ONE MEMBER SEES IN THE BELL ────────────────────────────────
// Their ticked kinds of place, nothing quiet (the deals that were already on
// the day alerts began), nothing over, newest first, one row per deal (a deal
// whose offer was changed has a newer row, and the newer one is the one that
// holds). `unread` is whether it came after they last opened the bell, and
// `unseenOnly` keeps just those, which is what the count on the bell is.
export const newsForMember = (rows, { cats = DEAL_CATEGORIES, seenAt = null, now = new Date(), unseenOnly = false, limit = MAX_PANEL } = {}) => {
  const want = new Set(cleanCats(cats));
  const seen = toDate(seenAt);
  const nowMs = toDate(now)?.getTime() ?? Date.now();
  const newest = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || r.quiet === true || !want.has(r.category)) continue;
    const made = toDate(r.created_at);
    if (!made || !r.deal_id) continue;
    const end = toDate(r.ends_at);
    if (end && end.getTime() <= nowMs) continue;
    const had = newest.get(r.deal_id);
    if (!had || toDate(had.created_at).getTime() < made.getTime()) newest.set(r.deal_id, r);
  }
  return [...newest.values()]
    .map(r => ({ ...r, unread: !seen || toDate(r.created_at).getTime() > seen.getTime() }))
    .filter(r => !unseenOnly || r.unread)
    .sort((a, b) => toDate(b.created_at) - toDate(a.created_at) || String(a.deal_id).localeCompare(String(b.deal_id)))
    .slice(0, limit);
};
export const unreadCount = (rows, member = {}, now = new Date()) =>
  newsForMember(rows, { cats: member.cats, seenAt: member.seenAt ?? member.seen_at ?? null, now, unseenOnly: true, limit: Infinity }).length;

// Whether a member's mail wants this kind of place at all.
export const wantsMail = (member, category) => !!member && member.email_on === true && cleanCats(member.cats).includes(category);

// ── WHEN THE ROUNDUP GOES ───────────────────────────────────────────
// Once a day, at the first run at or after 09:00 in Klaipėda, read on
// Klaipėda's own clock so summer time moves nothing: 09:00 is 06:00 UTC in
// summer and 07:00 UTC in winter, and both are 09:00 here. Due when it is past
// nine there and the last roundup was on an earlier Klaipėda day.
export const digestDue = (now = new Date(), lastDigestAt = null, zone = ALERT_ZONE) => {
  const at = toDate(now);
  if (!at || placeClock(at, zone).minutes < DIGEST_AT_MIN) return false;
  const last = toDate(lastDigestAt);
  if (!last) return true;
  return placeDayKey(last, zone) < placeDayKey(at, zone);
};
// Where a member's roundup starts: their last one, a week back at most, or
// the last day for somebody who has never had one.
export const digestSince = (now = new Date(), lastDigestAt = null) => {
  const at = toDate(now) || new Date();
  const last = toDate(lastDigestAt);
  const floor = at.getTime() - (last ? DIGEST_LOOKBACK_DAYS : 1) * 86400000;
  return new Date(last ? Math.max(last.getTime(), floor) : floor);
};
// The deals in one member's roundup: their kinds of place, new since `since`,
// not mailed to them already, not over, one per deal, newest first.
export const digestNews = (rows, member = {}, { now = new Date(), since = null, mailed = new Set() } = {}) => {
  const from = toDate(since) || digestSince(now, member.last_digest_at);
  return newsForMember(rows, { cats: member.cats, now, limit: Infinity })
    .filter(r => toDate(r.created_at).getTime() > from.getTime() && !mailed.has(Number(r.id)) && !mailed.has(String(r.id)))
    .slice(0, DIGEST_MAX);
};

// ── THE WORDS ───────────────────────────────────────────────────────
const fill = (s, v = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));
const say = (key, lang, vars) => fill(uiT(key, lang), vars);
const LOCALE = { en: "en-GB", da: "da-DK", de: "de-DE", lt: "lt-LT" };
const clockText = (minutes, lang) => {
  const s = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return lang === "da" ? s.replace(":", ".") : s;
};
const dateWords = (day, lang) => {
  const [y, m, d] = String(day).split("-").map(Number);
  try { return new Intl.DateTimeFormat(LOCALE[lang] || "en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d))); }
  catch { return `${d}.${m}`; }
};
// When it ends, said on Klaipėda's clock: "Ends today at 16:00", "Today
// only", "Ends tomorrow at 11:00", or "Until 31 October". "" when it has no
// end, which an ongoing offer does not.
export const endsWords = (ends, now = new Date(), lang = "en", zone = ALERT_ZONE) => {
  const end = toDate(ends);
  if (!end) return "";
  const l = cleanLang(lang);
  const minutes = placeClock(end, zone).minutes;
  const day = placeDayKey(new Date(end.getTime() - 60000), zone);
  const today = placeDayKey(toDate(now) || new Date(), zone);
  const midnight = minutes === 0;
  if (day === today) return midnight ? uiT("mail.todayOnly", l) : say("mail.endsToday", l, { time: clockText(minutes, l) });
  if (day === dayShift(today, 1)) return midnight ? uiT("mail.untilTomorrow", l) : say("mail.endsTomorrow", l, { time: clockText(minutes, l) });
  return say("mail.until", l, { date: dateWords(day, l) });
};

// "Just now", "12 min ago", "3 hours ago", "yesterday", in the reader's
// language, plurals and all, by the browser's own rules.
export const agoWords = (when, now = new Date(), lang = "en") => {
  const at = toDate(when), n = toDate(now) || new Date();
  if (!at) return "";
  const min = Math.max(0, Math.round((n.getTime() - at.getTime()) / 60000));
  const l = cleanLang(lang);
  if (min < 1) return uiT("alerts.justNow", l);
  try {
    const f = new Intl.RelativeTimeFormat(LOCALE[l], { numeric: "auto", style: "short" });
    if (min < 60) return f.format(-min, "minute");
    if (min < 24 * 60) return f.format(-Math.round(min / 60), "hour");
    return f.format(-Math.round(min / 1440), "day");
  } catch { return ""; }
};

// ── THE LINKS IN A MAIL ─────────────────────────────────────────────
// The deal opens on Explore in the app (App.jsx reads ?deal= and hands it to
// DealsNearYou), so a reader lands on the deal itself and not on a list.
export const dealLink = (dealId) => `${SITE}/lithuania?deal=${encodeURIComponent(String(dealId || ""))}`;
export const unsubLink = (token) => `${SITE}/api/deal-alerts?unsub=${encodeURIComponent(String(token || ""))}`;

// Every name and offer in a mail is somebody's typing, so it is escaped,
// including in an attribute.
export const escapeHtml = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// ── THE MAIL ITSELF ─────────────────────────────────────────────────
// Built the way SETUP_EMAIL.md settled for the signup mail: tables, every
// style inline, no images, Georgia for the heading and the system sans for the
// rest, the wordmark as letter-spaced text. In the dark theme's charcoal and
// champagne gold (theme.js THEMES.dark), restated here because theme.js cannot
// be loaded by a server route.
export const MAIL_COLOURS = { bg: "#0E0E11", card: "#17171B", border: "#27272D", gold: "#C9A46A", text: "#F3EFE7", light: "#C9C3B7", muted: "#8F897D", onGold: "#141416" };
const K = MAIL_COLOURS;
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

const shell = ({ lang, preheader, inner, unsub }) => {
  const l = cleanLang(lang);
  return `<!doctype html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Gemlyx</title>
</head>
<body style="margin:0;padding:0;background-color:${K.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${K.bg};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${K.bg};margin:0;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${K.card};border:1px solid ${K.border};border-radius:16px;">
<tr><td style="padding:26px 28px 0 28px;"><span style="font-family:${SERIF};font-size:13px;letter-spacing:4px;color:${K.gold};font-weight:bold;">&#10022; GEMLYX</span></td></tr>
${inner}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:18px 28px 0 28px;font-family:${SANS};font-size:12px;line-height:1.6;color:${K.muted};text-align:center;">
${escapeHtml(uiT("mail.why", l))}<br>
<a href="${escapeHtml(unsub)}" style="color:${K.gold};">${escapeHtml(uiT("mail.off", l))}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
};

const button = (href, label) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="${K.gold}" style="border-radius:12px;"><a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:15px;font-weight:bold;color:${K.onGold};text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a></td>
</tr></table>`;

const eyebrowCell = (text) => `<span style="font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${K.gold};font-weight:bold;">${escapeHtml(text)}</span>`;

// One deal at once: a short promotion, mailed the moment it is seen.
export const instantMail = ({ news, lang = "en", unsub = "", now = new Date() }) => {
  const l = cleanLang(lang);
  const name = squash(news?.name), offer = squash(news?.offer);
  const when = endsWords(news?.ends_at, now, l);
  const cat = uiT(`explore.cat.${news?.category}`, l);
  const href = dealLink(news?.deal_id);
  const unsubUrl = unsubLink(unsub);
  const subject = [say("mail.newAt", l, { name }), when ? when.charAt(0).toLowerCase() + when.slice(1) : ""].filter(Boolean).join(", ");
  const top = [uiT("mail.shortTime", l), cat].filter(Boolean).join(" · ");
  const inner = `<tr><td style="padding:22px 28px 0 28px;">${eyebrowCell(top)}</td></tr>
<tr><td style="padding:10px 28px 0 28px;"><h1 style="margin:0;font-family:${SERIF};font-size:26px;line-height:1.25;color:${K.text};font-weight:normal;">${escapeHtml(name)}</h1></td></tr>
<tr><td style="padding:12px 28px 0 28px;font-family:${SANS};font-size:17px;line-height:1.5;color:${K.text};font-weight:600;">${escapeHtml(offer)}</td></tr>
${when ? `<tr><td style="padding:12px 28px 0 28px;font-family:${SANS};font-size:14px;line-height:1.5;color:${K.gold};font-weight:600;">&#9679;&nbsp; ${escapeHtml(when)}</td></tr>` : ""}
<tr><td style="padding:24px 28px 0 28px;">${button(href, uiT("banner.see", l))}</td></tr>
<tr><td style="padding:16px 28px 26px 28px;font-family:${SANS};font-size:13px;line-height:1.6;color:${K.light};">${escapeHtml(uiT("mail.counter", l))}</td></tr>`;
  const text = [
    top.toUpperCase(), "", name, offer, when, "", `${uiT("banner.see", l)}: ${href}`, uiT("mail.counter", l), "", "", uiT("mail.why", l), `${uiT("mail.off", l)}: ${unsubUrl}`,
  ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n").trim();
  return { subject, html: shell({ lang: l, preheader: [offer, when].filter(Boolean).join(". "), inner, unsub: unsubUrl }), text };
};

// The morning roundup: what is new in their kinds of place since the last one.
export const digestMail = ({ items = [], lang = "en", unsub = "", now = new Date() }) => {
  const l = cleanLang(lang);
  const list = (Array.isArray(items) ? items : []).slice(0, DIGEST_MAX);
  const unsubUrl = unsubLink(unsub);
  const subject = list.length === 1 ? say("mail.newAt", l, { name: squash(list[0].name) }) : uiT("mail.digestSubject", l);
  const rows = list.map((n, i) => {
    const name = squash(n.name), offer = squash(n.offer);
    const when = endsWords(n.ends_at, now, l);
    const cat = uiT(`explore.cat.${n.category}`, l);
    return `<tr><td style="padding:${i ? 0 : 20}px 28px 0 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${K.border};">
<tr><td style="padding:18px 0 0 0;">${eyebrowCell(cat)}</td></tr>
<tr><td style="padding:6px 0 0 0;font-family:${SERIF};font-size:20px;line-height:1.3;color:${K.text};">${escapeHtml(name)}</td></tr>
<tr><td style="padding:6px 0 0 0;font-family:${SANS};font-size:15px;line-height:1.55;color:${K.light};">${escapeHtml(offer)}</td></tr>
${when ? `<tr><td style="padding:6px 0 0 0;font-family:${SANS};font-size:13px;line-height:1.5;color:${n.short ? K.gold : K.muted};font-weight:600;">${escapeHtml(when)}</td></tr>` : ""}
<tr><td style="padding:8px 0 18px 0;font-family:${SANS};font-size:14px;font-weight:bold;"><a href="${escapeHtml(dealLink(n.deal_id))}" target="_blank" style="color:${K.gold};text-decoration:none;">${escapeHtml(uiT("banner.see", l))} &#8250;</a></td></tr>
</table></td></tr>`;
  }).join("\n");
  const inner = `<tr><td style="padding:20px 28px 0 28px;"><h1 style="margin:0;font-family:${SERIF};font-size:26px;line-height:1.25;color:${K.text};font-weight:normal;">${escapeHtml(uiT("mail.digestSubject", l))}</h1></td></tr>
<tr><td style="padding:10px 28px 0 28px;font-family:${SANS};font-size:15px;line-height:1.6;color:${K.light};">${escapeHtml(uiT("mail.digestLead", l))}</td></tr>
${rows}
<tr><td style="padding:6px 28px 28px 28px;">${button(`${SITE}/lithuania`, uiT("mail.seeAll", l))}</td></tr>`;
  const text = [
    uiT("mail.digestSubject", l), uiT("mail.digestLead", l), "",
    ...list.flatMap(n => { const when = endsWords(n.ends_at, now, l); return [uiT(`explore.cat.${n.category}`, l).toUpperCase(), squash(n.name), squash(n.offer), ...(when ? [when] : []), dealLink(n.deal_id), ""]; }),
    `${uiT("mail.seeAll", l)}: ${SITE}/lithuania`, "", uiT("mail.why", l), `${uiT("mail.off", l)}: ${unsubUrl}`,
  ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n").trim();
  const preheader = list.map(n => squash(n.name)).join(", ");
  return { subject, html: shell({ lang: l, preheader, inner, unsub: unsubUrl }), text };
};

// ── THE PAGE AN UNSUBSCRIBE LINK OPENS ──────────────────────────────
// Small, in the member's language, the same charcoal and gold. `state`:
//   "off"      deal emails are off now
//   "confirm"  a visit with no sign of a person behind it (a mail scanner
//              opening every link, as Outlook's Safe Links does, SETUP_EMAIL.md
//              part 3): nothing has changed, and one button turns them off
//   "unknown"  the link matches nobody
//   "failed"   the database did not answer
export const unsubPage = ({ state = "off", lang = "en", action = "" }) => {
  const l = cleanLang(lang);
  const title = { off: uiT("unsub.title", l), confirm: uiT("mail.off", l), unknown: uiT("unsub.unknown", l), failed: uiT("unsub.failedTitle", l) }[state] || uiT("unsub.title", l);
  const body = { off: uiT("unsub.body", l), confirm: "", unknown: "", failed: uiT("unsub.failed", l) }[state] || "";
  const form = state === "confirm" && action
    ? `<form method="post" action="${escapeHtml(action)}" style="margin:22px 0 0"><input type="hidden" name="List-Unsubscribe" value="One-Click"><button type="submit" style="background:${K.gold};color:${K.onGold};border:0;border-radius:12px;padding:14px 26px;font:700 15px ${SANS};cursor:pointer">${escapeHtml(uiT("mail.off", l))}</button></form>`
    : "";
  return `<!doctype html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(title)} · Gemlyx</title>
</head>
<body style="margin:0;background:${K.bg};color:${K.text};font:400 16px/1.6 ${SANS};-webkit-font-smoothing:antialiased">
<main style="max-width:520px;margin:0 auto;padding:56px 18px">
<div style="background:${K.card};border:1px solid ${K.border};border-radius:16px;padding:28px 26px">
<div style="font:700 13px ${SERIF};letter-spacing:4px;color:${K.gold}">&#10022; GEMLYX</div>
<h1 style="font:400 26px/1.25 ${SERIF};margin:18px 0 0;color:${K.text}">${escapeHtml(title)}</h1>
${body ? `<p style="margin:12px 0 0;color:${K.light};font-size:15px">${escapeHtml(body)}</p>` : ""}
${form}
<p style="margin:24px 0 0"><a href="${SITE}/lithuania" style="color:${K.gold};font-weight:700;text-decoration:none">${escapeHtml(uiT("unsub.back", l))} &#8250;</a></p>
</div>
</main>
</body>
</html>`;
};

// The language a visitor with no row reads in: the first of the four their
// browser asks for, else English.
export const langFromHeader = (accept) => {
  for (const part of String(accept || "").toLowerCase().split(",")) {
    const code = part.trim().split(";")[0].split("-")[0];
    if (ALERT_LANGS.includes(code)) return code;
  }
  return "en";
};
