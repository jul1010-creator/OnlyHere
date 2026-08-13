import { MONTHS } from "./factCheckRead";
// fold, because a Danish ticket button says "Køb billetter" and JavaScript's \b
// cannot sit beside ø. See ticketLinks.
import { fold } from "./danishNames";

// ── WAS THAT A PAGE, OR A WALL? ─────────────────────────────────────
//
// Oliver, 12 Aug 2026: "Implementation of Firecrawl to get information from
// websites that block AI. Hopefully it will fix logistic issues and tickets."
//
// Before any of that is worth paying for, the app has to be able to TELL. It
// could not. api/scan-source.js checked `pageRes.ok`, which catches a 403 and
// is genuinely right as far as it goes, but the two failures that matter most
// both answer HTTP 200:
//
//   A CLOUDFLARE INTERSTITIAL, whose whole body strips down to something like
//   "Just a moment... Enable JavaScript and cookies to continue".
//
//   A JAVASCRIPT RENDERED PAGE, which is most modern venue and festival sites,
//   and which strips down to a nav bar, a cookie notice and nothing else.
//
// Both came back as { text } with a 200, so a bot wall was indistinguishable
// from a successful scrape of a thin page. That is the silent failure that
// looks like a working feature, which is the single most repeated shape in this
// codebase, and here it is worse than usual: the draft pipeline appends that
// text to the prompt under the heading "OFFICIAL WEBSITE CONTENT ... more
// reliable than a search snippet for exact current prices, hours, tour days and
// ferry times". So a challenge page was being handed to the writer as the most
// trustworthy source in the room.
//
// It also means the Firecrawl question could not be answered. Nobody knew
// whether it would fix two sites or forty, because nothing recorded which ones
// failed. Measuring that is free. Buying a scraper on a hunch is not.
//
// Pure and dependency free on purpose, so the whole judgement is testable
// without a network. Same split api/tickets.js already documents: the
// judgement lives here, api/scan-source.js is the network and nothing else.

// A challenge page is SHORT and says so at the TOP. Both halves matter, because
// a real article about online security can contain the word captcha and must
// not be accused of being one. So a marker only counts inside the opening of a
// body that is itself too small to be a real page.
export const MARKER_WINDOW = 1500;
export const CHALLENGE_MAX_CHARS = 3000;

// Every one of these is the visible text of a real bot wall, not a guess at
// one. Lowercased at the point of comparison.
export const CHALLENGE_MARKERS = [
  "just a moment",
  "enable javascript and cookies to continue",
  "checking your browser before accessing",
  "attention required!",
  "please verify you are a human",
  "verify you are human",
  "ddos protection by",
  "request unsuccessful. incapsula",
  "pardon our interruption",
  "you have been blocked",
  "access to this page has been denied",
  "please enable js and disable any ad blocker",
];

// A STARTING NUMBER, AND IT IS MEANT TO BE TUNED once the log has real domains
// in it. Chosen deliberately on the high side: too high means we call a genuine
// but thin page unreadable, which costs one fallback attempt and says so
// honestly. Too low means we go back to feeding nav bars to the writer as
// official content, which is the bug. Missing a block is the expensive mistake
// here, not over-reporting one.
export const MIN_USEFUL_CHARS = 800;

// Keeps the payload sane, and plenty for a listing page. Was inline in
// api/scan-source.js.
export const TEXT_CAP = 20000;

// Cheap and dependency free. We do not need pretty text, only enough signal for
// the model to pull names, dates, prices and hours out of.
// ── AND THE LINKS, WHICH THIS USED TO THROW AWAY ────────────────────
//
// Oliver, 13 Aug 2026, reading the sources on his Food Festival Aarhus draft:
// "while the official page was indeed found. The live ticket agent weren't
// (madbillet.dk)."
//
// He is right and it is the first line of stripToText that does it:
// `.replace(/<[^>]+>/g, " ")` deletes every tag, and every href with them. The
// operator's own "Køb billetter" button is destroyed before anything in this
// pipeline can see where it points.
//
// That is the whole gap. A Danish festival does not sell its own tickets, it
// links to an agent, and WHICH agent is different every time: madbillet,
// billetto, billetexpressen, safeticket, ticketbutler, place2book, nemtilmeld,
// or something nobody has heard of. Enumerating them is a losing game and
// LISTING_DOMAINS trying to is why madbillet.dk reads as a blog. Following the
// link is not: the operator always says who sells its tickets, in a href, on
// the page we already fetched and already paid for.
//
// What that cost on his run, exactly. The draft said 110, 170 and 130 DKK and
// the trace reported "NOT FROM THE OFFICIAL SITE", because those figures live
// on madbillet.dk. They were the REAL presale prices, accused of being invented
// because the one page that could confirm them was one unfollowed link away.
//
// Kept as {href, text} pairs, because the link TEXT is the strongest signal
// there is: a button saying "Køb billetter" is the operator telling us in its
// own words. The host is the weaker second opinion, and the path a third.
const A_TAG = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s">]+))[^>]*>([\s\S]*?)<\/a>/gi;

export const linksIn = (html, baseUrl = "") => {
  const out = [];
  const seen = new Set();
  A_TAG.lastIndex = 0;
  let m;
  while ((m = A_TAG.exec(String(html || ""))) !== null) {
    const raw = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (!raw || /^(?:#|mailto:|tel:|javascript:)/i.test(raw)) continue;
    let href = raw;
    if (baseUrl) { try { href = new URL(raw, baseUrl).toString(); } catch { continue; } }
    if (!/^https?:\/\//i.test(href)) continue;
    const text = String(m[4] || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
    const key = href.split("#")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ href: key, text });
    if (out.length >= 400) break;   // a nav-heavy page is not worth walking twice
  }
  return out;
};

export const stripToText = (html) =>
  String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TEXT_CAP);

// ── THE VERDICT ─────────────────────────────────────────────────────
// `usable` answers one question only: is this worth handing to a model as if it
// were the page. The reason is separate and is deliberately NOT phrased as an
// accusation, because "almost no text came back" and "this is definitely a bot
// wall" are different claims and only one of them is safe to make from here.
//
// Returns a reason on the good path too, so a caller logging every read gets a
// line either way rather than only on failure. A log that speaks only when
// something breaks cannot tell you how often things worked.
export const pageReadVerdict = (status, text, err = "") => {
  if (err) return { usable: false, reason: "fetch-failed", detail: String(err).slice(0, 200) };
  const s = Number(status);
  if (!Number.isFinite(s) || s < 200 || s >= 400) return { usable: false, reason: `http-${Number.isFinite(s) ? s : "unknown"}` };
  const t = String(text || "");
  if (!t.length) return { usable: false, reason: "empty" };
  const head = t.slice(0, MARKER_WINDOW).toLowerCase();
  if (t.length < CHALLENGE_MAX_CHARS && CHALLENGE_MARKERS.some(m => head.includes(m))) {
    return { usable: false, reason: "challenge-page" };
  }
  if (t.length < MIN_USEFUL_CHARS) return { usable: false, reason: "almost-no-text" };
  return { usable: true, reason: "read" };
};

// Worth escalating to a paid scraper? A 404 is not a wall, it is a dead link,
// and paying to re-read nothing is the kind of quiet waste this project keeps
// finding. Same for a 401: that is a login, and Firecrawl does not have the
// password either.
export const NOT_WORTH_RETRYING = new Set(["http-404", "http-410", "http-401", "empty"]);
export const worthDeepRead = (verdict) =>
  !!verdict && verdict.usable === false && !NOT_WORTH_RETRYING.has(verdict.reason);

// ── FIRECRAWL, AS A REQUEST BODY ────────────────────────────────────
// Built here rather than in the handler so the shape is testable without a key
// and without a network. Checked against their v2 reference on 12 Aug 2026:
// POST https://api.firecrawl.dev/v2/scrape, Bearer auth, one credit per page,
// failed requests not charged.
export const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";

// The same URLs come back repeatedly: gemlyx_research stores a place's source
// URLs and reuses them on redraft, and they pre-fill the "sites to open first"
// box, so a redraft an hour later asks for the identical pages. maxAge lets
// Firecrawl answer those from its own cache. A day is long enough to cover a
// drafting session and short enough that "being current is the product here"
// still holds for the essentials type.
export const FIRECRAWL_CACHE_MS = 24 * 60 * 60 * 1000;
export const FIRECRAWL_TIMEOUT_MS = 30000;

export const firecrawlBody = (url) => ({
  url,
  // markdown, not html: onlyMainContent already drops the nav, the cookie
  // banner and the footer, which is the half of every scrape we were paying
  // OpenAI to read past.
  formats: ["markdown"],
  onlyMainContent: true,
  // Escalates to a heavier proxy only when the light one fails, which is the
  // whole reason we are here.
  proxy: "auto",
  blockAds: true,
  maxAge: FIRECRAWL_CACHE_MS,
  timeout: FIRECRAWL_TIMEOUT_MS,
});

// Their response nests the content, and a shape change there must not read as
// an empty page: that is the difference between "the scraper moved a field" and
// "the site had nothing on it", and only one of those is worth a second credit.
export const firecrawlText = (json) => {
  const md = json?.data?.markdown ?? json?.data?.content ?? null;
  if (typeof md === "string" && md.trim()) return { text: md.trim().slice(0, TEXT_CAP), ok: true };
  return { text: "", ok: false, reason: json?.success === false ? "firecrawl-refused" : "firecrawl-shape" };
};

// ── A CALENDAR THAT LISTS THE EVENT IS NOT THE EVENT'S OWN SITE ─────
//
// From Oliver's Ribelund run of 12 Aug 2026. The log said, in two places,
// "Prices against the official site" and "confirmed on the site itself". The
// only pages read were kultunaut.dk, including its BARE HOMEPAGE, a national
// calendar carrying 139,020 events. The official-site picker had a blocklist,
// AGGREGATOR_HOSTS, and it was written against international travel sites:
// tripadvisor, booking.com, expedia, viator, yelp. In a Denmark-only events
// product it contained not one Danish event aggregator, so every Danish
// calendar and every ticket reseller counted as an operator's own website.
//
// These are NOT dropped. A Danish festival's price genuinely does live on
// KultuNaut or Billetto far more often than on the festival's own site, and
// dropping them would throw away the 400 kr that this same run finally found.
// They are TIERED: read, quoted, and credited by name, but never allowed to be
// the thing the log calls "the official site".
//
// MATCHED ON THE REGISTRABLE DOMAIN, NOT AS A SUBSTRING, and that is
// load-bearing: domainVariants deliberately searches billet.<site> because a
// festival's own ticket shop lives there, so a substring test for "billet"
// would classify billet.frugtfestival.dk, the operator's own shop, as a
// reseller.
export const LISTING_DOMAINS = [
  "kultunaut.dk",
  "billetto.dk", "billetto.com",
  "billetlugen.dk", "billetten.dk", "billetfix.dk",
  "ticketmaster.dk", "ticketmaster.com",
  "unitedtickets.dk", "eventim.dk", "safeticket.dk", "ticketbutler.io",
  "place2book.com", "nemtilmeld.dk",
  // madbillet.dk was missing and it is the one Oliver caught, 13 Aug 2026, on
  // Food Festival Aarhus. Without it, the agent holding the real price table
  // ranked as a BLOG, below an encyclopedia, on the one question it is the
  // authority for. The rest are the Danish agents that turned up beside it.
  "madbillet.dk", "ticketbutler.dk", "billetexpressen.dk", "billethuset.dk",
  "tikkio.com", "eventbooking.dk",
  "evently.se", "evently.dk", "musikevent.dk", "livejazz.dk",
  "eventbrite.com", "eventbrite.dk", "songkick.com", "bandsintown.com", "ra.co",
];

export const isListingHost = (url) => {
  let h;
  try { h = new URL(String(url)).hostname.toLowerCase().replace(/^www\./, ""); } catch { return false; }
  return LISTING_DOMAINS.some(d => h === d || h.endsWith(`.${d}`));
};

// ── A PAGE THAT ONLY TALKS ABOUT 2022 CANNOT PRICE A 2026 TICKET ────
//
// Also from the Ribelund draft. Its gemlyxFind told the reader to phone
// 76168405, and its ticketInfo said a companion "gets in free". Both are real
// and both are sourced: they come from the Ritzau press release sitting in
// __sources, which is dated 24 August 2022. RESEARCH_SOURCE_RULES already says
// "anything priced or timed from before 2025 should be treated as stale". That
// is a PROMPT, and the first standing rule here is that anything the system
// already knows is enforced in code, because a request has a failure rate.
//
// STALE_BEFORE_YEAR is exported so the prompt and the gate cannot drift apart;
// there is a test asserting the prompt names this same year.
export const STALE_BEFORE_YEAR = 2025;

// The newest year the page mentions anywhere. Newest rather than first, because
// an archive page carrying "2019, 2020, 2021, 2026" is a live page with history
// on it, and only the most recent year says how current the page is.
export const newestYearIn = (text, maxYear = STALE_BEFORE_YEAR + 25) => {
  const years = (String(text || "").match(/\b(?:19|20)\d{2}\b/g) || [])
    .map(Number)
    .filter(y => y >= 1990 && y <= maxYear);
  return years.length ? Math.max(...years) : null;
};

// A page with NO year on it is NOT called stale. We cannot date it, and
// accusing a source of being old when we could not read a date is the same
// mistake tracePrices refuses to make when the site text is missing: it returns
// checked:false rather than flagging every price. Undatable is its own answer.
export const pageEra = (text, maxYear) => {
  const year = newestYearIn(text, maxYear);
  if (year === null) return { year: null, stale: false, why: "no year on the page, so it cannot be dated" };
  return year < STALE_BEFORE_YEAR
    ? { year, stale: true, why: `the newest year on this page is ${year}` }
    : { year, stale: false, why: `the page carries ${year}` };
};

// ── WHICH OF THE THREE STRINGS A SCRAPED PAGE IS ALLOWED INTO ───────
// The routing itself, as a function, because the first version of it lived as
// an if/else inside the draft loop and a mutation that ALSO wrote a 2022 page
// into the operator's string left every test green. A branch in a 1 MB file
// can only be asserted by regex, and a regex checks that a line is present,
// never that another line is absent. Here the answer is a value.
//
//   operator  the place's own site. May confirm a price or a date.
//   listing   a calendar or ticket shop. May price and date, never confirm.
//   old       too old to carry either. Background only.
// nowMs is threaded through because the age gate is six MONTHS as of 12 Aug
// 2026, and six months cannot be answered by a year. Omitting it falls back to
// the year comparison rather than failing, so an older caller still works.
export const scrapeTier = (url, text, nowMs) => {
  const age = factAge(text, nowMs);
  const era = pageEra(text);
  // "old" here means old FOR A PRICE OR A TIMETABLE. The page still reaches the
  // writer; it is demoted to history, which is exactly the split he drew:
  // "History is fine. But NOT logistics and prices."
  if (!age.perishableOk) return { tier: "old", era, age };
  return { tier: isListingHost(url) ? "listing" : "operator", era, age };
};

// One line, for the run log and for the founder reading it. Names the domain,
// because "a source was blocked" is not something anyone can act on and
// "visitodense.dk was blocked" is.
export const domainOf = (url) => {
  try { return new URL(String(url)).hostname.replace(/^www\./, ""); } catch { return String(url || "").slice(0, 60); }
};
export const describeRead = (url, verdict, via) =>
  `${domainOf(url)}: ${verdict?.usable ? `read via ${via}` : `not readable (${verdict?.reason || "unknown"})`}`;

// ── THE ORDER, IN HIS WORDS ─────────────────────────────────────────
//
// Oliver, 12 Aug 2026, after a draft came back with six flagged items and five
// more uncertainties: "This is ridiculous." Then the rule, in two messages:
//
//   "If something is written in 2020 and something else is contradicting in
//    2026, then choose the 2026."
//   "It goes Website > Wiki/Encyclopedia/other history pages > Blogs > Old
//    Blogs."
//
// This is the fix for the NOISE, not only for the accuracy, and that is worth
// being explicit about because it is the opposite of everything else built
// today. Every gate so far turns a doubt into a line in uncertainties. A
// hierarchy turns a doubt into a DECISION: when two sources disagree and one
// outranks the other, there is no uncertainty to report, there is an answer.
// "One listing shows 400 kr, another calls it free" stops being a sentence a
// reader has to resolve, because the 2022 press release loses to the current
// listing and never reaches the draft.
//
// TWO AXES, AND RECENCY CUTS ACROSS THE CLASSES. A blog from this year beats a
// blog from 2020; it does not beat the operator's own page. An old official
// site still owns the history and no longer owns the price, which is what
// RESEARCH_SOURCE_RULES has always said in prose.
export const SOURCE_CLASS = {
  official: { rank: 1, label: "the place's own website" },
  listing: { rank: 2, label: "a ticket site or event calendar" },
  reference: { rank: 3, label: "an encyclopedia or history page" },
  blog: { rank: 4, label: "a blog or a write-up" },
};

// Encyclopedias and reference works, which he groups together and which are
// good for history and bad for a price. Matched on the registrable domain for
// the same reason isListingHost is.
export const REFERENCE_DOMAINS = [
  "wikipedia.org", "wikivoyage.org", "wikidata.org", "britannica.com",
  "denmark.dk", "denstoredanske.lex.dk", "lex.dk", "kulturarv.dk",
  "danmarkshistorien.dk", "natmus.dk", "arkiv.dk",
];

// Exported because utils/affiliates.js needs the same answer to decide whether
// a link is Ticketmaster's, and a second copy would have made this the FOURTH
// declaration of hostOf in the codebase. resolveLegMode, lookupRealPlace, the
// two heading lists and studioTypes.js are all the same story: two copies agree
// on the day they are written and drift the first time one is touched.
export const hostOf = (url) => {
  try { return new URL(String(url)).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
};
const inList = (host, list) => list.some(d => host === d || host.endsWith(`.${d}`));

export const isReferenceHost = (url) => inList(hostOf(url), REFERENCE_DOMAINS);

// ── WHICH LINK IS THE ONE THAT SELLS THE TICKETS ────────────────────
// Three signals, deliberately in this order of trust:
//
//   the link TEXT      the operator saying "Køb billetter" in its own words
//   the HOST           a ticket agent already known by name
//   the PATH           /billetter, /tickets, /shop
//
// Text first, because it is the only one that cannot go stale. LISTING_DOMAINS
// will always be missing somebody's agent, which is exactly how madbillet.dk
// came to read as a blog, and a path is a convention rather than a statement.
//
// FOLDED, because a Danish button says "Køb billetter" and JavaScript's \b
// cannot sit beside ø. That trap has now bitten this codebase four times.
const TICKET_LINK_TEXT = /\b(?:kob|koeb|bestil|book|buy)\s+(?:din\s+|dine\s+|your\s+)?(?:billet|billetter|ticket|tickets)\b|\bbillet(?:ter|salg|shop)?\b|\btickets?\b|\bentrebillet\b/;
const TICKET_PATH = /\/(?:billet|billetter|billetsalg|tickets?|ticket-shop|entre|kob-billet)/i;
// Never followed, however ticket-shaped the text is. A cookie policy mentioning
// "billetter" is not where a price lives, and following it costs a page read.
const NEVER_FOLLOW = /\/(?:cookie|privatliv|privacy|persondata|betingelser|terms|handelsbetingelser|kontakt|contact|om-os|about)/i;

// Ranked best first. CAPPED BY THE CALLER rather than here, because how many
// pages are worth reading is a money question and belongs where the money is.
// How many of those links are worth a page read. Two: the agent, and the
// operator's own /billetter page when it links onward rather than pricing
// anything itself. It is a page read each and it is his money, so the number
// lives here beside the picker and the caller slices with it, rather than being
// a bare 2 buried in a loop where nobody can find it to change.
export const MAX_TICKET_PAGES = 2;

export const ticketLinks = (html, baseUrl = "") => {
  const scored = [];
  for (const l of linksIn(html, baseUrl)) {
    if (NEVER_FOLLOW.test(l.href)) continue;
    const said = TICKET_LINK_TEXT.test(fold(l.text));
    const known = isListingHost(l.href);
    const pathy = TICKET_PATH.test(l.href);
    if (!said && !known && !pathy) continue;
    // A link that BOTH says tickets and points at a known agent is the button.
    // One matching only the path is a maybe.
    const score = (said ? 4 : 0) + (known ? 2 : 0) + (pathy ? 1 : 0);
    scored.push({ href: l.href, text: l.text, score, said, known, pathy, offsite: hostOf(l.href) !== hostOf(baseUrl) });
  }
  // Off-site wins ties, because the agent is where the live buyable price is
  // while the operator's own /billetter page often just links onward to it.
  // That is the exact shape of the Food Festival case: foodfestival.dk carried a
  // members-only rate, madbillet.dk carried the real table.
  scored.sort((a, b) => b.score - a.score || (b.offsite ? 1 : 0) - (a.offsite ? 1 : 0));
  return scored;
};

// officialHosts is what the pipeline has already decided is the operator's own
// site, rather than a guess made here. Passing none is fine: nothing is ranked
// official, which is honest rather than optimistic.
export const rankSource = (url, text, { officialHosts = [] } = {}) => {
  const host = hostOf(url);
  const era = pageEra(text);
  const cls = officialHosts.map(h => String(h).toLowerCase().replace(/^www\./, "")).some(h => h && (host === h || host.endsWith(`.${h}`)))
    ? "official"
    : isListingHost(url) ? "listing"
    : isReferenceHost(url) ? "reference"
    : "blog";
  const base = SOURCE_CLASS[cls];
  return {
    url, host, cls, year: era.year,
    stale: era.stale,
    // A stale source keeps its class for stable facts and drops below every
    // current source of the same class for anything current. One number, so
    // sorting is a sort and not a special case.
    rank: base.rank + (era.stale ? 10 : 0),
    label: era.stale ? `${base.label}, and it is from ${era.year}` : base.label,
  };
};

// Highest authority first, and within a class the newest first. Returns the
// same objects rankSource made, so a caller can print the reason beside the URL.
export const rankSources = (sources, opts) =>
  (Array.isArray(sources) ? sources : [])
    .map(s => rankSource(s?.url ?? s, s?.text ?? "", opts))
    .sort((a, b) => a.rank - b.rank || (b.year || 0) - (a.year || 0));

// ── WHAT THE WRITER IS TOLD, AND WHY IT IS SHORT ────────────────────
// A hierarchy is only useful if it settles things. This states the order, names
// each source's place in it, and then says the part that removes the noise: a
// source that loses does not become an uncertainty.
export const sourceOrderBlock = (ranked) => {
  const list = (Array.isArray(ranked) ? ranked : []).filter(Boolean);
  if (!list.length) return "";
  const lines = list.map((r, i) => `${i + 1}. ${r.host} — ${r.label}${r.year ? ` (${r.year})` : ""}`);
  return `SOURCE ORDER FOR THIS ENTRY, HIGHEST AUTHORITY FIRST:
${lines.join("\n")}

WHEN TWO OF THESE DISAGREE, THE HIGHER ONE WINS AND THE LOWER ONE IS NOT MENTIONED. Not in the prose, not in uncertainties, not as "some sources say". A disagreement you can settle by this order is settled, and reporting it anyway hands the reader a decision that was already made for them.
The order is: the place's own website, then a ticket site or calendar, then an encyclopedia or history page, then a blog. A source from before ${STALE_BEFORE_YEAR} sits below every current source for anything that changes, so an old page may still carry history and may not carry ${perishableSentence()}.
${EXISTENCE_RULE}
Only say sources disagree when they are at the SAME level and you cannot separate them by date.

EVERY SNIPPET IN THE RESEARCH BELOW CARRIES THE HOST IT CAME FROM, in square brackets at the start of the line, like "[kultunaut.dk] Pris: Entré: 400 kr." Look the host up in the order above before you use the sentence. A line marked [tavily, ...] or [openai, ...] is a SYNTHESISED answer with no single page behind it: it ranks below every named host here, and it may not be the only thing supporting a price, a date or a policy.
A LINE WHOSE HOST IS MARKED OLD ABOVE MAY NOT PRICE OR TIME ANYTHING, however confidently it is worded. That is the rule that keeps catching this entry: a press release from 2022 saying companions get in free is not evidence about 2026, and a current page from the organiser saying otherwise beats it without the older line being mentioned at all.`;
};

// ── SIX MONTHS, AND ONLY FOR THE THINGS THAT CHANGE ─────────────────
//
// Oliver, 12 Aug 2026: "Make a rule.. everything about price and logistics that
// are older than 6 months SHOULD NOT BE INCLUDED. History is fine. But NOT
// logistics and prices."
//
// STALE_BEFORE_YEAR was a year, and a year is the wrong instrument for this.
// From August, "before 2025" lets a page from January of the current year
// through as though it were current, and it is seven months old. Six months
// needs a date, so this reads one.
//
// The split he draws is the one the pipeline already half-implements: an old
// page keeps its history and loses its prices. That is why a page over the
// limit is not dropped, it is DEMOTED to background, exactly as the scrape tier
// already does. What changes is the line, and that the line is now measured in
// months against a date rather than in years against a year.
export const MAX_FACT_AGE_MONTHS = 6;

// ── AND "STILL BEING THERE" IS A FACT THAT GOES OFF ─────────────────
//
// Oliver, 13 Aug 2026: "I noticed a source about Esbjerg was taken from 2017.
// Now, while I assume it only talked about history and experiences, I need to
// point out that this is 10 years ago. If such a source starts talking about a
// restaurant that no longer exists, then that can become an issue."
//
// He has found the hole in the split above, and it is a real one. The rule was
// PERISHABLE against HISTORY, and the line that used to sit here said everything
// not on the list "is history and has no shelf life". A restaurant existing is
// not on the list. So a 2017 page saying the harbour has three fish restaurants
// was treated as a permanent fact, reached the draft unchallenged, and the
// reader walks to a closed door.
//
// The distinction the old rule was missing is not old against new. It is A FACT
// ABOUT THE PAST against A FACT ABOUT THE PRESENT THAT HAPPENS TO BE WRITTEN IN
// THE PAST. "Founded in 1868" was true in 2017 and is true now. "The harbour
// has three fish restaurants" was a claim about 2017 the whole time, and it
// only reads as timeless because of the shape of the sentence. That second kind
// is the dangerous one precisely because none of it looks like a number.
//
// ── AND THIS LIST HAD FOUR COPIES, ALREADY DRIFTING ─────────────────
// PERISHABLE was exported and read by NOTHING: a written-and-never-wired list,
// the same shape as geocodeOne and unplaced and tripCharacter. The rule it
// describes was restated in prose three other times, in sourceOrderBlock below,
// in the scraped-page label in App.jsx, and in the run-log line beside it. Three
// hand-written sentences, and they had already disagreed: this list carries
// booking, transport and timetable, and sourceOrderBlock named none of them.
//
// So this is the list, perishableSentence is how it is said out loud, and every
// prose site says it by calling that. A rule the writer is never told is not a
// rule, so a test asserts the sentence reaches all three prompts.
export const PERISHABLE = ["price", "date", "opening hours", "phone number", "booking", "transport", "timetable", "existence"];

// One phrase per entry, keyed rather than positional, so adding to PERISHABLE
// and forgetting the phrase fails a test instead of producing a silently
// shorter sentence. That is this codebase's most repeated bug in miniature: the
// list grew and the thing reading it did not.
const PERISHABLE_PHRASE = {
  price: "a price",
  date: "a date",
  "opening hours": "an opening hour",
  "phone number": "a phone number",
  booking: "a booking detail",
  transport: "a transport claim",
  timetable: "a timetable",
  existence: "a named business, shop, café or restaurant still being there",
};

export const perishableSentence = () =>
  PERISHABLE.map(p => PERISHABLE_PHRASE[p] || p).join(", ").replace(/, ([^,]*)$/, " or $1");

// The existence half is worth saying twice and at length, because it is the one
// that does not look like a fact. Everything else on the list is a number or a
// time, which a model recognises as something that changes. A venue name reads
// as scenery.
export const EXISTENCE_RULE = `AND A PLACE STILL BEING THERE IS A FACT THAT EXPIRES TOO. This is the one that reads as history and is not. A page from 2017 describing the three fish restaurants along the harbour is describing 2017, and one of them has closed since. Naming a restaurant, café, shop, bar, hotel or venue as somewhere the reader can GO is a claim about today, and an old page is not evidence for it however confidently it is written. What the place IS stays fine: its history, its landscape, its architecture, what happened there, what it was built for. Who is trading there now does not. If an old page is the only thing naming a business, either leave the name out or say plainly that it was open as of that page's date.`;

const MONTH_NAMES = Object.keys(MONTHS).join("|");
// A full date, either order, Danish or English: "19. august 2026" and
// "August 19, 2026" are the same day. Also plain ISO, which is what a CMS emits.
const DMY = new RegExp(`\\b(\\d{1,2})\\s*\\.?\\s*(${MONTH_NAMES})\\s+((?:19|20)\\d{2})`, "gi");
const MDY = new RegExp(`\\b(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+((?:19|20)\\d{2})`, "gi");
const ISO = /\b((?:19|20)\d{2})-(\d{2})-(\d{2})\b/g;

// The newest date the page states, as a UTC timestamp, or null. Newest rather
// than first for the same reason newestYearIn is: an archive page listing every
// edition since 2011 is a live page with history on it.
export const newestDateIn = (text) => {
  const t = String(text || "");
  let best = null;
  const take = (y, mo, d) => {
    if (!(y >= 1990 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return;
    const ms = Date.UTC(y, mo - 1, d);
    if (best === null || ms > best) best = ms;
  };
  let m;
  DMY.lastIndex = 0; while ((m = DMY.exec(t)) !== null) take(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]));
  MDY.lastIndex = 0; while ((m = MDY.exec(t)) !== null) take(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2]));
  ISO.lastIndex = 0; while ((m = ISO.exec(t)) !== null) take(Number(m[1]), Number(m[2]), Number(m[3]));
  return best;
};

// nowMs is passed in rather than read, so this is pure and so a test can sit on
// a fixed day. Returns what the page may be used FOR, which is the whole point
// of his rule: nothing here ever says "drop this page".
export const factAge = (text, nowMs) => {
  const now = Number(nowMs);
  if (!Number.isFinite(now)) return { ageMonths: null, perishableOk: true, why: "no clock was given, so nothing can be aged", dated: false };
  const newest = newestDateIn(text);
  if (newest !== null) {
    const ageMonths = (now - newest) / (1000 * 60 * 60 * 24 * 30.44);
    return ageMonths > MAX_FACT_AGE_MONTHS
      ? { ageMonths, perishableOk: false, dated: true, why: `its newest date is about ${Math.round(ageMonths)} months old` }
      : { ageMonths, perishableOk: true, dated: true, why: `dated within the last ${MAX_FACT_AGE_MONTHS} months` };
  }
  // No full date. A YEAR still settles it in one direction: from any month of
  // 2026, a page whose newest year is 2025 is at least seven months old. The
  // current year alone cannot settle it either way, and a page that cannot be
  // dated is not a page caught being old, which is the discipline every gate in
  // this codebase follows. It passes, and it is marked undated so the caller
  // can say so rather than implying it was checked.
  const year = newestYearIn(text);
  const nowYear = new Date(now).getUTCFullYear();
  if (year === null) return { ageMonths: null, perishableOk: true, dated: false, why: "no date and no year on the page, so it cannot be aged" };
  if (year < nowYear) return { ageMonths: (nowYear - year) * 12, perishableOk: false, dated: false, why: `the newest year on this page is ${year}, so nothing on it can be inside ${MAX_FACT_AGE_MONTHS} months` };
  return { ageMonths: null, perishableOk: true, dated: false, why: `the page carries ${year} but states no day, so its exact age is unknown` };
};
