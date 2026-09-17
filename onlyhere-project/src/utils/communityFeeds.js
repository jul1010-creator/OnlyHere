// ── THE COMMUNITY FEEDS ─────────────────────────────────────────────
//
// Oliver, 17 Sep 2026: "I've been in contact with someone from a community at
// Sejerø that hosts events... Now, they tend to apparently put up events. How
// can we manage that on my page? Is it possible for me to put that as a link
// onto my studio, along with links from other groups from other communities?"
//
// This file is the judgement half. api/social-find.js does the fetching, on the
// mode it already has for API Direct, and the Studio panel does the showing.
// Nothing here touches the network, so every rule below is asserted in the
// suite. Same split socialAccounts.js, ticketLink.js and pageScan.js document.
//
// ── WHAT THIS CAN AND CANNOT REACH, SAID ONCE AND PLAINLY ───────────
//
// PUBLIC groups only. API Direct's own documentation says it: "only posts from
// public groups are accessible" and a private group requires membership. The
// three groups he asked to join stay unreadable by anything running on a
// server, whether or not he is let in, because his membership is his and not
// this app's. That is not a limit worth working around: a tool that logs into
// somebody's account to read a closed group is the kind of thing that gets an
// account disabled, and the app would be doing it from a datacentre in another
// country while he is asleep. For those three, the honest tool is the same one
// he uses now, which is his own eyes, and this panel can hold the link.
//
// ── AND A POST IS A LEAD, NEVER A SOURCE ────────────────────────────
//
// sourcePolicy.js has held facebook in NEVER_A_SOURCE since the beginning, and
// nothing here moves that line. A post in a village group is somebody saying
// something, and the strongest thing it can do is make the pipeline go and look.
// What is found here reaches Studio as a CANDIDATE with the post attached; the
// ordinary event pipeline then has to find it somewhere citable before a reader
// sees a date. The one thing that would break this app's promise is a Facebook
// post arriving as a fact, and the shape of this file is what stops that: it
// returns dates and links, never a finished entry.
import { MONTHS, MONTH_RE } from "./factCheckRead";
import { isPastDate } from "./eventDates";

// ── THE GROUP ID, WHICH IS THE ONLY THING THE API TAKES ─────────────
//
// GET /v1/facebook/group/posts?group_id=125246204312244
//
// A numeric id, and a group URL carries one in exactly one place. Facebook also
// serves vanity slugs, /groups/sejeroe-nyt, and NOTHING can turn one of those
// into an id without asking Facebook, so a slug is refused with a sentence that
// says what to paste instead rather than stored as a row that fails forever.
// ── AND A PAGE IS NOT A GROUP ───────────────────────────────────────
//
// Oliver, 17 Sep 2026: "https://www.facebook.com/visitsamsoe I can't use this..
// include profiles please."
//
// He is right and it is the more useful half. A tourist board, a harbour, a
// museum, a festival: those are PAGES, they are public by definition, and they
// are where a place announces itself. A village group is where people talk.
//
// Two differences, and only one of them is real work. The endpoint is
// /v1/facebook/page/posts rather than /group/posts, same parameters and the
// same response, so postsIn and everything after it is untouched. The other is
// that a page URL is a NAME, facebook.com/visitsamsoe, and the endpoint takes a
// numeric id. That is resolved once, when he adds it, through the page-details
// call this codebase already uses, and stored on the row. A lookup per sweep
// would be a second request every time for an answer that never changes.
export const FEED_KINDS = ["group", "page"];

// Everything that is not a person, a group, or one of Facebook's own routes. A
// profile URL and a page URL are the same shape, and the app cannot tell them
// apart from the address alone, which is fine: the page-details call answers it
// and a personal profile simply returns nothing to read.
const NOT_A_PAGE = new Set([
  "groups", "events", "pages", "profile.php", "people", "watch", "marketplace",
  "story.php", "photo.php", "permalink.php", "sharer", "login", "help", "settings",
]);

export const pageNameIn = (url) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const m = /(?:facebook\.com|fb\.com)\/([A-Za-z0-9._-]{3,})/i.exec(raw);
  if (!m) return "";
  const name = m[1].replace(/\/+$/, "");
  return NOT_A_PAGE.has(name.toLowerCase()) ? "" : name;
};

export const feedKindOf = (url) => {
  if (groupIdIn(url)) return "group";
  return pageNameIn(url) ? "page" : "";
};

export const groupIdIn = (url) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const m = /(?:facebook\.com|fb\.com)\/groups\/(\d{5,})/i.exec(raw);
  if (m) return m[1];
  // A bare id, which is what he will paste half the time.
  return /^\d{5,}$/.test(raw) ? raw : "";
};

export const feedUrlProblem = (url) => {
  const raw = String(url || "").trim();
  if (!raw) return "Paste the link.";
  if (groupIdIn(raw)) return "";
  if (/facebook\.com\/groups\//i.test(raw)) {
    return "That group link uses a name rather than a number. Open the group, click About, and copy the link from there: it looks like facebook.com/groups/125246204312244.";
  }
  if (pageNameIn(raw)) return "";
  if (/facebook\.com/i.test(raw)) return "That is a Facebook link, but not a page or a group. A page looks like facebook.com/visitsamsoe and a group like facebook.com/groups/125246204312244.";
  return "This reads Facebook pages and groups. A page looks like facebook.com/visitsamsoe and a group like facebook.com/groups/125246204312244.";
};

export const cleanFeed = (row) => {
  const url = String(row?.url || row?.group_url || "").trim();
  const kind = feedKindOf(url);
  if (!kind) return null;
  const groupId = kind === "group" ? groupIdIn(url) : String(row?.group_id || "").trim();
  // A page keeps its readable address and carries the numeric id separately,
  // because the id is what the endpoint wants and the name is what he typed and
  // will recognise in a list. A page whose id has not been resolved yet is a
  // real state and says so rather than being dropped.
  const handle = kind === "page" ? pageNameIn(url) : "";
  return {
    id: row?.id ?? null,
    kind,
    name: String(row?.name || "").trim().slice(0, 80),
    url: kind === "group" ? `https://www.facebook.com/groups/${groupId}` : `https://www.facebook.com/${handle}`,
    handle,
    groupId,
    needsId: kind === "page" && !/^\d{5,}$/.test(groupId),
    // The same scope vocabulary the research sources use, so "Sejerø" and the
    // Islands scope both mean here what they mean there. cleanPlace is applied
    // by the caller, which owns that import.
    place: String(row?.place || row?.applies_place || "").trim().slice(0, 60),
    note: String(row?.note || "").trim().slice(0, 160),
    enabled: row?.enabled !== false,
    lastChecked: /^\d{4}-\d{2}-\d{2}$/.test(String(row?.last_checked || "")) ? String(row.last_checked) : "",
  };
};

// ── WHAT COMES BACK, IN ONE SHAPE ───────────────────────────────────
//
// Documented fields, read defensively, for the reason api/social-find.js gives
// about its own reader: this file's history is that an assumed API shape was
// wrong in four places at once. `posts` is documented; `results` and `data` are
// what every other endpoint on this provider calls the same thing.
export const postsIn = (body) => {
  const rows = Array.isArray(body?.posts) ? body.posts
    : Array.isArray(body?.results) ? body.results
    : Array.isArray(body?.data) ? body.data
    : [];
  const out = [];
  for (const row of rows) {
    const text = String(row?.message || row?.text || "").trim();
    if (!text) continue;
    out.push({
      id: String(row?.post_id || row?.id || "").trim(),
      url: String(row?.url || row?.permalink || "").trim(),
      text,
      // timestamp is documented as seconds. `date` is documented too and its
      // format is not, so the number is preferred and the string is the fallback.
      at: postedDay(row),
      author: String(row?.author_name || "").trim(),
      externalUrl: String(row?.external_url || "").trim(),
    });
  }
  return out;
};

const iso = (d) => (d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "");

export const postedDay = (row) => {
  const ts = Number(row?.timestamp);
  // Seconds, not milliseconds: a Facebook timestamp is unix seconds, and a
  // value in the 10^9 range read as milliseconds lands in 1970.
  if (Number.isFinite(ts) && ts > 1e8 && ts < 1e11) return iso(new Date(ts * 1000));
  const s = String(row?.date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = s ? new Date(s) : null;
  return parsed ? iso(parsed) : "";
};

// ── THE DATE IN THE POST ────────────────────────────────────────────
//
// This is the whole value of the feature and it is worth being exact about why.
// A group wall is not a calendar. It is prose, in Danish, written by whoever is
// organising the thing, and his own example is the shape:
//
//   "Se Boris og den glade løve på lørdag d. 25.7. kl.15.00 i Kulturhuset."
//
// No year. No month name. A weekday that is only meaningful against the day it
// was posted. So the post's OWN date is the anchor, and that is why postedDay
// exists above: "25.7." in a post from 18 July 2026 is 25 July 2026, and the
// same string in a post from December is the following July.
//
// NAMES ARE NOT GUESSED HERE, and that is deliberate. A regex can find a date
// and cannot name a show, and this file returning "Boris og den glade" as a
// title would be a wrong fact in the one place a person skims. The date is
// deterministic and testable; the name is a judgement, so the candidate carries
// the post's own words and the drafting pipeline, which has a model, names it.
// TWO PATTERNS, NOT ONE. A named month and a numeric one are different shapes
// and one regex doing both was wrong in a way worth recording: "kl.15.00" came
// back as the first of May. The combined pattern let the day be "1", the "5"
// become a month and the "00" fall off the end, and a plausible date appeared
// out of a clock. Written apart, the numeric one has to see a separator between
// two numbers and a month of 00 is refused by arithmetic.
const NAMED = new RegExp(String.raw`(?<!\d)(\d{1,2})\s*\.?\s*(?:[-–]\s*(\d{1,2})\s*\.?\s*)?(${MONTH_RE})\b`, "gi");
const NUMERIC = /(?<!\d)(\d{1,2})\s*[./]\s*(\d{1,2})(?!\d)/g;

// ── AND A CLOCK IS NOT A DATE ───────────────────────────────────────
// "kl. 12.10" is ten past twelve and it reads exactly like the twelfth of
// October. Danish writes both with a dot, so nothing in the numbers can tell
// them apart and the only evidence is the word in front. This is why the check
// is on what PRECEDES the match rather than on the values: 12 and 10 are a
// perfectly good date, so a rule about plausible numbers would have to throw
// away real dates to catch this one.
const CLOCK_BEFORE = /\bkl\.?\s*$/i;

// A four-digit year sitting within a short distance after the day, the same
// window datesIn uses, so "25. juli 2027" keeps its year and "25. juli" does
// not borrow one from a phone number further down the post.
const YEAR_NEAR = /^[^.\n]{0,12}?((?:19|20)\d{2})\b/;

export const datesInPost = (text, postedISO) => {
  const t = String(text || "");
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(String(postedISO || "")) ? String(postedISO) : "";
  if (!t || !anchor) return [];
  const anchorYear = Number(anchor.slice(0, 4));
  const out = [];

  const take = (day, month, endDay, at, after) => {
    if (!day || !month || day > 31 || month > 12) return;
    const yearHit = YEAR_NEAR.exec(after);
    let year = yearHit ? Number(yearHit[1]) : anchorYear;
    const made = (y, d) => `${y}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    // ── THE ROLL, AND ONLY WHEN NOTHING SAID A YEAR ───────────────
    // A post in December announcing "3. januar" means next January. A post that
    // WROTE a year is never rolled, or an archive post about 2024 would be
    // quietly moved to this year, which is the invented-date failure wearing a
    // friendly face.
    if (!yearHit && made(year, day) < anchor) year += 1;
    for (const d of [day, ...(endDay && endDay >= day && endDay <= 31 ? [endDay] : [])]) {
      const day10 = made(year, d);
      // A real calendar day, so 31 February is dropped rather than normalised
      // into 3 March by Date's own arithmetic.
      const real = new Date(`${day10}T12:00:00Z`);
      if (iso(real) !== day10) continue;
      if (!out.includes(day10)) out.push(day10);
    }
  };

  NAMED.lastIndex = 0;
  let m;
  while ((m = NAMED.exec(t)) !== null) {
    take(Number(m[1]), MONTHS[m[3].toLowerCase()], Number(m[2]) || 0, m.index, t.slice(m.index + m[0].length));
  }
  NUMERIC.lastIndex = 0;
  while ((m = NUMERIC.exec(t)) !== null) {
    if (CLOCK_BEFORE.test(t.slice(Math.max(0, m.index - 6), m.index))) continue;
    take(Number(m[1]), Number(m[2]), 0, m.index, t.slice(m.index + m[0].length));
  }
  return out.sort();
};

// "kl.15.00", "kl. 15", "kl 19.30". One per post, the first, because a post
// with two times is a programme and a programme wants a person reading it.
export const timeInPost = (text) => {
  const m = /\bkl\.?\s*(\d{1,2})(?:[.:](\d{2}))?/i.exec(String(text || ""));
  if (!m) return "";
  const h = Number(m[1]);
  if (h > 23) return "";
  return `${String(h).padStart(2, "0")}:${m[2] ? m[2] : "00"}`;
};

// ── WHICH POSTS ARE WORTH A PERSON'S ATTENTION ──────────────────────
//
// His own example is the case that decides this. The post is dated 18 July and
// the event is Saturday 25 July, and he is reading it on 17 September: it
// happened seven weeks ago. A group wall is mostly the past, so a sweep that
// showed every post carrying a date would be a list of things nobody can go to.
//
// So a candidate needs a date that has not happened. A post with no date at all
// is dropped too: it is a photograph, a thank-you, or a lost cat, and there is
// nothing for the pipeline to research.
export const candidatesIn = (posts, { today = null, feed = null } = {}) => {
  const list = Array.isArray(posts) ? posts : [];
  const out = [];
  for (const post of list) {
    const days = datesInPost(post.text, post.at);
    const ahead = days.filter(d => !isPastDate(d, today));
    if (!ahead.length) continue;
    out.push({
      postId: post.id,
      postUrl: post.url,
      postedAt: post.at,
      author: post.author,
      text: post.text,
      // First upcoming day, and the rest kept: "25.-27. juli" is one event over
      // three days and the drafting pipeline wants both ends.
      date: ahead[0],
      dates: ahead,
      time: timeInPost(post.text),
      externalUrl: post.externalUrl || "",
      feedName: feed?.name || "",
      feedUrl: feed?.url || "",
      place: feed?.place || "",
    });
  }
  // Soonest first. A village group posts about next Saturday far more often than
  // about next summer, and the soonest is the one with a deadline on it.
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
};

// ── AND WHAT IS ALREADY ON THE SITE ─────────────────────────────────
//
// A community group posts about the same event four times: the announcement,
// the reminder, the weather warning and the thank-you. Two of those carry the
// date. So candidates are deduped against each other on day-plus-first-line,
// and then against what is already published, on the day.
//
// The published test is deliberately loose, a date match plus any shared
// distinctive word, because the post says "Boris og den glade løve" and the
// entry says "Boris og den glade løve i Kulturhuset, Sejerø". Being shown a
// duplicate costs him one glance; being shown nothing hides a real event.
const firstLine = (s) => String(s || "").split(/\n/)[0].trim().toLowerCase().slice(0, 60);

export const dedupeCandidates = (candidates) => {
  const seen = new Set();
  const out = [];
  for (const c of Array.isArray(candidates) ? candidates : []) {
    const key = `${c.date}|${firstLine(c.text)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
};

const WORDS = (s) => String(s || "").toLowerCase().replace(/[^a-zA-ZæøåÆØÅ0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 4);

export const alreadyPublished = (candidate, rows) => {
  const list = Array.isArray(rows) ? rows : [];
  const mine = new Set(WORDS(candidate?.text));
  return list.some(r => {
    const day = String(r?.dateStart || r?.date || "").slice(0, 10);
    if (!day || day !== candidate?.date) return false;
    return WORDS(r?.name).some(w => mine.has(w));
  });
};

export const newCandidates = (candidates, rows) =>
  dedupeCandidates(candidates).filter(c => !alreadyPublished(c, rows));

// ── WHAT A SWEEP COSTS, BEFORE HE PRESSES IT ────────────────────────
// API Direct bills the group-posts endpoint per PAGE of posts, and one page is
// what this asks for: a village group does not post fifty times a week, and the
// second page is last month. Said in the panel in his own currency, because
// "0.008 dollars" is not a number anybody feels.
export const PAGES_PER_FEED = 1;
export const CENTS_PER_PAGE = 0.8;
export const sweepCost = (feeds) => {
  const on = (Array.isArray(feeds) ? feeds : []).filter(f => f && f.enabled).length;
  const cents = on * PAGES_PER_FEED * CENTS_PER_PAGE;
  return { feeds: on, requests: on * PAGES_PER_FEED, cents: Math.round(cents * 10) / 10 };
};
