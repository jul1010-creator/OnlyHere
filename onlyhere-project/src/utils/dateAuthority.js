// ── WHICH SOURCE WINS ON A DATE, AND WHAT HAPPENS TO THE LOSER ──────
//
// Oliver, 15 Sep 2026, with the scenario spelled out: "Facebook page says that
// the event is starting the 20th.. instagram says 23th, and website says 26th...
// I think we need to set a priority. Either it is the most recent update on any
// page or the Website is first priority (obviously ticket pages themselves are
// first priority..) with Facebook and Instagram fighting for second place
// depending on most recent update."
//
// He chose, after the tradeoff was laid out: OFFICIAL WINS, CONFLICT FLAGGED.
// The page keeps the date the ticket page or the official site states, the
// disagreement is recorded for him, and nothing on a live page ever shows a date
// no official source states.
//
// ── WHY NOT "MOST RECENT UPDATE ON ANY PAGE" ────────────────────────
//
// Because the timestamp on a post is when the POST changed, not when the FACT
// changed. An organiser posting a photo of last year's festival today does not
// make today the freshest evidence about next summer, and a correct website page
// may carry no last-modified at all. Recency promotes whatever is noisiest,
// which in Denmark is Facebook. So recency is the tiebreak WITHIN a tier and
// never across tiers.
//
// ── AND WHY FACEBOOK AND INSTAGRAM ARE NOT A TIE ────────────────────
//
// A Facebook EVENT is a form somebody filled in: a start field, an end field, an
// organiser. An Instagram caption is prose, and reading a date out of prose is
// the failure class this whole pipeline exists to prevent. They are different
// kinds of evidence and this file ranks them differently.
//
// THE PRACTICAL LIMIT, verified against API Direct's own docs on 15 Sep and not
// assumed, because this project has been wrong about that API once already:
// /v1/facebook/events returns event_id, title, url, count and pages. It takes
// start_date and end_date as FILTERS. No date is ever returned, and no endpoint
// takes an event id or url and gives its details. So the Facebook tier below can
// confirm or contradict a date we already hold and can never supply one. That is
// a fact about the API, not a policy, and if they add an endpoint the policy
// still has to be decided rather than assumed.
//
// ── THE SOCIAL CARVE-OUT IS NARROW ON PURPOSE ───────────────────────
//
// sourcePolicy.js refuses facebook, instagram, x, tiktok and youtube as sources
// and as the official site, and that stays true: none of them may put a sentence
// into an entry or become officialSite. This file opens one channel, for DATED
// CLAIMS ONLY, and the strongest thing a social source can do here is raise a
// flag. Nothing in this file writes a date onto a row.
import { parseEventDate } from "./eventDates";

// Higher wins. The numbers are compared, never displayed.
export const DATE_TIER = {
  TICKET: 4,        // where somebody buys. A wrong date here costs them money.
  OFFICIAL: 3,      // the venue's or organiser's own site.
  FACEBOOK_EVENT: 2, // a filled-in form. Check only: see the note above.
  SOCIAL_TEXT: 1,   // a caption. Flag only, never a date.
  UNKNOWN: 0,
};

export const DATE_TIER_LABEL = {
  [DATE_TIER.TICKET]: "the ticket page",
  [DATE_TIER.OFFICIAL]: "the official site",
  [DATE_TIER.FACEBOOK_EVENT]: "a Facebook event",
  [DATE_TIER.SOCIAL_TEXT]: "a social post",
  [DATE_TIER.UNKNOWN]: "an unnamed source",
};

// Only these two may set a date. Written as a list rather than as `>= 3` so the
// rule reads the same way it was decided.
export const CAN_SET_A_DATE = [DATE_TIER.TICKET, DATE_TIER.OFFICIAL];
export const canSetADate = (tier) => CAN_SET_A_DATE.includes(Number(tier));

const host = (u) => {
  try { return new URL(String(u)).hostname.replace(/^www\./i, "").toLowerCase(); } catch { return ""; }
};

// The ticket systems a Danish event actually sells through, plus the resellers
// this project already carries. Kept here rather than imported from tickets.js
// because that file is about BUILDING a link and this is about believing one,
// and the two lists drift for good reasons: a host can be a place to buy without
// being a host we would ever link to.
const TICKET_HOSTS = /(?:^|\.)(?:billetlugen|billetto|ticketmaster|eventim|safeticket|place2book|nemtilmeld|billetfix|tikkio|ticketbutler|queenbee|kultunaut)\.(?:dk|com|no|se)$/i;

// ── WHAT KIND OF SOURCE IS THIS URL ─────────────────────────────────
//
// `officialSite` is passed in rather than guessed: the row already knows its own
// website, and a second guess here would be a second vocabulary for the same
// question. A subdomain of the official site counts, because tickets.example.dk
// is the same organisation talking.
export const dateTierOf = (url, { officialSite = "" } = {}) => {
  const h = host(url);
  if (!h) return DATE_TIER.UNKNOWN;
  if (TICKET_HOSTS.test(h)) return DATE_TIER.TICKET;
  const own = host(officialSite);
  if (own && (h === own || h.endsWith(`.${own}`))) return DATE_TIER.OFFICIAL;
  if (/(?:^|\.)facebook\.com$/.test(h)) {
    // A Facebook EVENT url is a different object from a page url, and only the
    // event is a filled-in form. /events/<id> is the shape.
    return /\/events\//i.test(String(url)) ? DATE_TIER.FACEBOOK_EVENT : DATE_TIER.SOCIAL_TEXT;
  }
  if (/(?:^|\.)(?:instagram\.com|x\.com|twitter\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com)$/.test(h)) {
    return DATE_TIER.SOCIAL_TEXT;
  }
  return DATE_TIER.UNKNOWN;
};

const day = (v) => {
  const d = parseEventDate(String(v || "").trim());
  if (!d) return "";
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const seenAt = (c) => {
  const t = Date.parse(String(c?.at || ""));
  return Number.isFinite(t) ? t : 0;
};

// ── THE RECONCILIATION ──────────────────────────────────────────────
//
// Takes every dated claim anybody has observed for one row and answers three
// things: which date stands, where it came from, and what disagreed with it.
//
// It returns the CONFLICTS rather than swallowing them, because the decision was
// "official wins, conflict flagged" and a function that only returned a winner
// would make the second half impossible to build. A silently resolved conflict
// is the exact shape of bug this project keeps digging out.
//
// A claim is { date, dateEnd, url, at }. `tier` may be passed in, and is worked
// out from the url when it is not.
export const reconcileDate = (claims = [], { officialSite = "" } = {}) => {
  const list = (Array.isArray(claims) ? claims : [])
    .map(c => ({
      ...c,
      date: day(c?.date),
      dateEnd: day(c?.dateEnd),
      tier: Number.isFinite(Number(c?.tier)) && c?.tier !== undefined && c?.tier !== null
        ? Number(c.tier)
        : dateTierOf(c?.url, { officialSite }),
    }))
    .filter(c => c.date);

  if (!list.length) return { date: "", dateEnd: "", from: null, conflicts: [], flags: [] };

  const allowed = list.filter(c => canSetADate(c.tier));
  // Most authoritative first, then most recently seen. Sorting rather than a
  // running maximum so the tiebreak is visible rather than implied.
  const ranked = [...allowed].sort((a, b) => b.tier - a.tier || seenAt(b) - seenAt(a));
  const winner = ranked[0] || null;

  // Anything that says a different day is a conflict, whatever its tier. A
  // ticket page and an official site disagreeing is the most serious of these
  // and is not a special case in the code: it falls out of the same comparison.
  const differs = (c) => winner && (c.date !== winner.date || (c.dateEnd && winner.dateEnd && c.dateEnd !== winner.dateEnd));
  const conflicts = list.filter(c => c !== winner && differs(c));

  return {
    date: winner ? winner.date : "",
    dateEnd: winner ? winner.dateEnd : "",
    from: winner || null,
    // Split so a caller can treat them differently without re-deriving the
    // rule: a disagreement between two official sources is a blocker, and a
    // social one is a note.
    conflicts: conflicts.filter(c => canSetADate(c.tier)),
    flags: conflicts.filter(c => !canSetADate(c.tier)),
  };
};

// ── AND WHAT STUDIO SAYS ABOUT IT ───────────────────────────────────
//
// Same shape as dateClaimProblems in dateClaims.js: { severity, field, detail },
// so this can hang on the same gate rather than growing a second one. severity
// "high" is a publish blocker there; "note" is not, and the split follows the
// decision exactly. Two official sources disagreeing is a blocker because one of
// them is wrong and neither of us knows which. A social source disagreeing is a
// note, because the official date still stands and he asked to be told.
export const dateAuthorityProblems = (payload) => {
  const p = payload || {};
  const claims = Array.isArray(p.__dateClaims) ? p.__dateClaims : [];
  if (!claims.length) return [];
  const got = reconcileDate(claims, { officialSite: p.website || p.officialSite || "" });
  if (!got.from) return [];
  const out = [];
  const where = (c) => DATE_TIER_LABEL[c.tier] || DATE_TIER_LABEL[DATE_TIER.UNKNOWN];

  got.conflicts.forEach(c => {
    out.push({
      severity: "high", field: "date",
      detail: `${where(got.from)} says ${got.date} and ${where(c)} says ${c.date}. Both are sources that may set a date, so one of them is wrong. Check which before publishing: ${c.url || "no url recorded"}.`,
    });
  });

  got.flags.forEach(c => {
    out.push({
      severity: "note", field: "date",
      detail: `${where(c)} says ${c.date}, which is not the ${got.date} on this row. The official date stands. Worth a look if the organiser has announced a change: ${c.url || "no url recorded"}.`,
    });
  });

  return out;
};

// ── THE FACEBOOK PROBE ──────────────────────────────────────────────
//
// One search, filtered to the window we already believe. See the API note at the
// top for why this cannot be a date lookup.
//
// The window is padded because a multi-day festival listed on Facebook often
// carries the opening day only, and because an organiser and a ticket system
// disagree about whether the build-up day counts. Two days each side is enough
// for that and small enough that a genuinely moved date still falls outside.
export const PROBE_PAD_DAYS = 2;

const shift = (isoDay, days) => {
  const d = parseEventDate(isoDay);
  if (!d) return "";
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + days);
  const p = (x) => String(x).padStart(2, "0");
  return `${out.getFullYear()}-${p(out.getMonth() + 1)}-${p(out.getDate())}`;
};

export const probeWindow = (row = {}, { pad = PROBE_PAD_DAYS } = {}) => {
  const start = day(row.date ?? row.dateStart);
  if (!start) return null;
  const end = day(row.dateEnd) || start;
  return { from: shift(start, -pad), to: shift(end, pad) };
};

// ── READING THE ANSWER ──────────────────────────────────────────────
//
// Three outcomes and each one means something different, so none of them is
// allowed to collapse into "nothing found":
//
//   confirmed   an event by this name exists inside the window we believe.
//   moved       nothing in the window, and the same name exists outside it.
//               This is the one worth waking up for.
//   absent      nothing by this name at all. Says nothing about our date: small
//               Danish events are not all on Facebook, and this must never read
//               as a contradiction.
//
// `wide` is optional and costs a second request, which is why "moved" is only
// ever claimed when the wide search was run. Without it the honest answer to an
// empty window is "absent", not "moved".
export const readProbe = ({ inWindow = 0, wide = null } = {}) => {
  if (Number(inWindow) > 0) return "confirmed";
  if (wide === null || wide === undefined) return "absent";
  return Number(wide) > 0 ? "moved" : "absent";
};

export const probeNote = (verdict, name = "this event") => {
  if (verdict === "confirmed") return `Facebook lists ${name} inside the dates on this row.`;
  if (verdict === "moved") return `Facebook has an event called ${name}, and not in the window this row states. The row's date still stands; check whether the organiser moved it.`;
  return `Facebook has nothing under ${name}. That is not a contradiction: plenty of Danish events are not on Facebook at all.`;
};

// Only "moved" is worth his attention, and it is a note rather than a blocker
// because a Facebook title match is not strong enough to stop a publish.
export const eventCheckProblems = (payload) => {
  const p = payload || {};
  const check = p.__eventCheck;
  if (!check || check.verdict !== "moved") return [];
  return [{
    severity: "note", field: "date",
    detail: probeNote("moved", p.name || "this event") + (check.at ? ` Checked ${check.at}.` : ""),
  }];
};
