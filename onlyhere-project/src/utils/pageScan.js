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

// One line, for the run log and for the founder reading it. Names the domain,
// because "a source was blocked" is not something anyone can act on and
// "visitodense.dk was blocked" is.
export const domainOf = (url) => {
  try { return new URL(String(url)).hostname.replace(/^www\./, ""); } catch { return String(url || "").slice(0, 60); }
};
export const describeRead = (url, verdict, via) =>
  `${domainOf(url)}: ${verdict?.usable ? `read via ${via}` : `not readable (${verdict?.reason || "unknown"})`}`;
