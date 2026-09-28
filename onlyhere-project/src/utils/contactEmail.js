// ── THE ADDRESS A PLACE PUBLISHES FOR ITSELF ────────────────────────
//
// Oliver, 28 Sep 2026, of the photo request mail: "I guess the AI will already
// have the mail of the company ready, yes?" It did not. Studio reads a place's
// own site for its facts and skips mailto links on purpose, so no entry
// carries an address.
//
// No model is asked. An address is read off the place's own pages: its front
// page, and the contact and press pages that page links to. Only addresses
// written there count, and each one says which page it came from, so he can
// check it before sending. Plain fetches only, never Firecrawl, so a search
// costs nothing.

import { hostOf } from "./pageScan";

// A real address, and not a retina image name like logo@2x.png, which has the
// same shape.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}/g;
const FILE_END = /\.(?:png|jpe?g|gif|webp|svg|avif|css|js)$/i;
// Addresses that sit in page code rather than belonging to the place: error
// trackers, site builders, placeholders.
const NOT_THEIRS = /(?:^|\.)(?:sentry\.io|sentry-next\.wixpress\.com|wixpress\.com|example\.(?:com|org|dk)|domain\.(?:com|dk)|email\.com|yourdomain\.\w+)$/i;
const NO_REPLY = /^(?:no-?reply|do-?not-?reply|mailer-daemon|postmaster|webmaster|wordpress)@/i;

const decode = (s) => String(s || "")
  .replace(/&#64;|&commat;/gi, "@")
  .replace(/&#46;|&period;/gi, ".")
  .replace(/%40/g, "@");

export const cleanEmail = (raw) => {
  const e = decode(raw).trim().replace(/^mailto:/i, "").split("?")[0].replace(/[.,;:]+$/, "").toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}$/.test(e)) return "";
  if (FILE_END.test(e) || NO_REPLY.test(e)) return "";
  if (NOT_THEIRS.test(e.split("@")[1])) return "";
  return e;
};

// Every address on a page: the mailto links first, since a link is an address
// the place chose to make clickable, then any written in the text.
export const emailsIn = (html) => {
  const src = decode(html);
  const out = [];
  const add = (e) => { const c = cleanEmail(e); if (c && !out.includes(c)) out.push(c); };
  for (const m of src.matchAll(/href\s*=\s*["']mailto:([^"'?]+)/gi)) add(m[1]);
  const text = src.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  for (const m of text.matchAll(EMAIL_RE)) add(m[0]);
  return out;
};

// The contact and press pages a site links to, on the same site. Danish and
// English words, because most of these sites are Danish first.
const PAGE_WORDS = /\b(?:kontakt\w*|contact\w*|presse\w*|press\w*|pressebilleder|media|om[-\s]?os|about(?:[-\s]?us)?)\b/i;
export const contactPagesIn = (html, baseUrl) => {
  const own = hostOf(baseUrl);
  if (!own) return [];
  const out = [];
  for (const m of String(html || "").matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const [, href, inner] = m;
    const label = inner.replace(/<[^>]+>/g, " ");
    if (!PAGE_WORDS.test(href) && !PAGE_WORDS.test(label)) continue;
    let abs = "";
    try { abs = new URL(href, baseUrl).href.split("#")[0]; } catch { continue; }
    if (!/^https?:/i.test(abs)) continue;
    const h = hostOf(abs);
    if (!(h === own || h.endsWith(`.${own}`) || own.endsWith(`.${h}`))) continue;
    if (!out.includes(abs) && abs !== baseUrl) out.push(abs);
  }
  // Press before contact before the rest: a press page is where photos and
  // the address for asking about them usually live together.
  const rank = (u) => (/press/i.test(u) ? 0 : /kontakt|contact/i.test(u) ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b)).slice(0, 4);
};

// Which address to offer first: one on the place's own domain over one
// somewhere else, and a press or marketing box over a general one.
const KIND = [
  [/^(?:presse|press|pr|media|marketing|kommunikation|communications?)@/i, 0],
  [/^(?:info|kontakt|contact|hej|hello|mail|post|office|kontor)@/i, 1],
];
export const rankEmails = (found, siteUrl) => {
  const own = hostOf(siteUrl);
  const score = (f) => {
    const dom = String(f.email).split("@")[1] || "";
    const ownDomain = own && (dom === own || dom.endsWith(`.${own}`) || own.endsWith(`.${dom}`)) ? 0 : 1;
    const kind = (KIND.find(([re]) => re.test(f.email)) || [null, 2])[1];
    return ownDomain * 10 + kind;
  };
  const seen = new Set();
  return found
    .filter(f => f && f.email && !seen.has(f.email) && seen.add(f.email))
    .map((f, i) => ({ ...f, _s: score(f), _i: i }))
    .sort((a, b) => a._s - b._s || a._i - b._i)
    .map(({ _s, _i, ...f }) => f);
};

// The server's whole job, with the fetching handed in so it can be tested.
// Front page first; then the contact and press pages it links to, up to four.
export const findContactEmails = async (siteUrl, fetchHtml, { maxPages = 4 } = {}) => {
  const checked = [];
  const found = [];
  const read = async (url) => {
    checked.push(url);
    const html = await fetchHtml(url).catch(() => "");
    for (const email of emailsIn(html)) found.push({ email, from: url });
    return html;
  };
  const front = await read(siteUrl);
  for (const page of contactPagesIn(front, siteUrl).slice(0, maxPages)) await read(page);
  return { emails: rankEmails(found, siteUrl).slice(0, 6), checked };
};
