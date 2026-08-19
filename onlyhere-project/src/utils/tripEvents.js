import { tierOf } from "./placeThemes";

// ── WHICH EVENTS BELONG ON A TRIP, AND HOW MANY OF THEM ─────────────
//
// Oliver, 14 Aug 2026: "every single event is for some reason shown in the
// preview instead of just the one that the visitor will explore".
//
// He is describing GuidePreviewScreen's Events section, and the cause is its
// SECOND matching pass. Pass one takes every place whose name appears in the
// conversation, which for an event is exactly right: the traveller named it.
// Pass two then adds every row whose own city/town field points at a town
// already matched, and it makes no distinction by type.
//
// For a standing place that pass is the whole point of the screen. A museum in
// Copenhagen is in Copenhagen whichever week you go, so "here is what we hold
// on Copenhagen" is a true and useful thing to show somebody who typed
// Copenhagen. For an EVENT it is a category error. An event is a place plus a
// date, and dropping the date half turns a real row into a false suggestion.
//
// Measured on the real matcher with a live-shaped pool, "Four days in
// Copenhagen in March, we want the Copenhagen Light Festival" returned six
// events: the one he named, then Jazz Festival (July), Distortion (June),
// Kulturnatten (last October), Copenhagen Cooking (August) and CPH:DOX. Five
// he never mentioned, four in the wrong season, one already over, and a sixth
// silently dropped by the cap. Every one of them presented identically to the
// festival he had actually asked for.
//
// So the rule this file exists to make impossible to break: a dated row may
// only be offered for a trip it can actually be attended on.
//
// Nothing here touches the network, React or the clock unless a caller passes
// a date in. `today` is a parameter everywhere for the same reason
// utils/eventDates.js takes one, so every rule can be tested against a fixed
// calendar instead of whatever day the suite happens to run.

const MS_DAY = 86400000;

// ── AND THIS WAS THE FIFTH COPY OF THE SAME HELPER ──────────────────
//
// It read:
//
//   const d = value instanceof Date ? new Date(value.getTime()) : new Date(value);
//   d.setHours(0, 0, 0, 0);
//
// The intent was right, and its comment said so: "date only, local, so an
// arrival at 22:00 and a departure at 09:00 four days later is a five day trip
// rather than three and a bit". The implementation carried the mistake this
// codebase has now found FIVE separate times. `new Date("2027-06-24")` is UTC
// midnight, and setHours then pins it to local midnight of whatever local day
// that INSTANT falls on. West of Greenwich, that is the day before.
//
// Measured under TZ=America/New_York: eventWindow({ date: "2027-06-24" }) came
// back as 23 June. A festival's whole window sat a day early, so overlapsTrip
// decided whether to offer an event against dates that were wrong for every
// reader in the Americas.
//
// One shared reader now. calendarDay.dayStart treats the date-only ISO form as
// the calendar day it names and falls back to the local day for anything else,
// which is what the two lines above were reaching for. Date instances still
// work, and they matter here: arrivalDateIn returns one and tripWindow is
// handed them.
import { dayStart } from "./calendarDay";

export const daysBetween = (start, end) => {
  const a = dayStart(start), b = dayStart(end);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / MS_DAY) + 1;
};

// ── THE TWO PARSERS generateGuide ALREADY HAD ───────────────────────
// Lifted out of App.jsx unchanged in behaviour, because the preview screen now
// needs the same two answers and a second copy of a parser is this project's
// signature bug: utils/danishNames.js existed for weeks while the preview
// screen did its own substring match, and that is how "also" became an island.
// One definition, two callers.
const MONTH_NAMES = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };
const MONTH_PATTERN = Object.keys(MONTH_NAMES).join("|");
const DATE_RE = new RegExp(`\\b(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_PATTERN})|(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?)\\b`, "i");

export const arrivalDateIn = (text, today = new Date()) => {
  const m = String(text || "").match(DATE_RE);
  if (!m) return null;
  const day = parseInt(m[1] || m[4], 10);
  const monthIdx = MONTH_NAMES[(m[2] || m[3]).toLowerCase()];
  if (!(day >= 1 && day <= 31) || monthIdx === undefined) return null;
  let candidate = new Date(today.getFullYear(), monthIdx, day);
  // Already gone this year means they mean next year, same call generateGuide
  // has always made.
  if (candidate < new Date(today.toDateString())) candidate = new Date(today.getFullYear() + 1, monthIdx, day);
  return candidate;
};

// ── AND A MONTH ON ITS OWN, WHICH IS WHAT PEOPLE ACTUALLY WRITE ─────
//
// Oliver, 17 Aug 2026, reading a Detour chat he had just had: "It also showed me
// comic con in November.. even after talking about Tivoli in december.."
//
// The traveller wrote "I'm going to Denmark in December" and "we're here for 7
// days". DATE_RE above requires a DAY NUMBER beside the month, so "in December"
// matched nothing, arrivalDateIn returned null, and tripWindow came back
// `{ days: 7, dated: false }`. dated false means "we do not know when they are
// here", overlapsTrip then returns null for every event, and the whole date
// filter stands down. A November convention for a December trip is not the
// matcher being wrong. It is the matcher being told nothing.
//
// A bare month is not a date and it is a hard constraint, which is exactly the
// argument the lone-date branch below already makes for itself: it rules out an
// event in a different month, and that is most of the damage. So it produces a
// window covering the whole month, and it says `precision: "month"` so nothing
// downstream can present it as a known arrival day.
//
// A month already gone means next year, the same call arrivalDateIn makes: in
// August, "in December" is this December, and in December, "in March" is next
// March.
export const monthOnlyIn = (text, today = new Date()) => {
  const s = String(text || "");
  // The day-and-month form is handled above and must win, or "12 December"
  // would be flattened into the whole of December by this function.
  if (DATE_RE.test(s)) return null;
  const m = s.match(new RegExp(`\\b(${MONTH_PATTERN})\\b`, "i"));
  if (!m) return null;
  const monthIdx = MONTH_NAMES[m[1].toLowerCase()];
  if (monthIdx === undefined) return null;
  const now = dayStart(today) || new Date(today.getFullYear(), today.getMonth(), 1);
  let year = now.getFullYear();
  // Compared on the month rather than the day, so somebody writing "in August"
  // on the 17th of August means this month and not next year.
  if (monthIdx < now.getMonth()) year += 1;
  const start = new Date(year, monthIdx, 1);
  // Day 0 of the next month is the last day of this one, and it gets February
  // and leap years right without a table.
  const end = new Date(year, monthIdx + 1, 0);
  return { start, end, month: monthIdx, year };
};

export const dayCountIn = (text) => {
  const s = String(text || "");
  const digits = s.match(/\b(\d{1,2})\s*(?:-|–|to)?\s*(?:day|days)\b/i);
  if (digits) return Math.min(parseInt(digits[1], 10), 14);
  const weeks = s.match(/\b(\d{1,2})\s*(?:-|–)?\s*weeks?\b/i);
  if (weeks) return Math.min(parseInt(weeks[1], 10) * 7, 14);
  if (/\b(?:a|an|the|one)\s+(?:whole|entire|full)?\s*week\b/i.test(s)) return 7;
  if (/\b(?:a|an|the|one)\s+fortnight\b/i.test(s)) return 14;
  return null;
};

// ── HOW LONG THEY ARE HERE, AND WHEN ────────────────────────────────
// Two separate questions with two separate best sources, so they are answered
// separately rather than bundled. The structured intake fields are exact when
// they are filled in. The conversation is all there is when they are not, and
// it can easily give a length with no dates ("four days somewhere quiet"),
// which is enough to set the limit and not enough to test an overlap. Saying
// so is the point: `dated` false means we do not know when they are here, and
// nothing downstream may pretend otherwise.
export const tripWindow = ({ arrival, departure, convoText, today = new Date() } = {}) => {
  const start = dayStart(arrival);
  const end = dayStart(departure);
  if (start && end && end.getTime() >= start.getTime()) {
    return { start, end, days: daysBetween(start, end), dated: true, source: "intake" };
  }
  const spoken = dayCountIn(convoText);
  const from = dayStart(arrivalDateIn(convoText, today));
  if (from && spoken) {
    const to = new Date(from.getTime() + (spoken - 1) * MS_DAY);
    return { start: from, end: to, days: spoken, dated: true, source: "conversation" };
  }
  // One lone date and no length is still a real anchor: it rules out an event
  // in a different month, which is most of the damage.
  if (from) return { start: from, end: from, days: null, dated: true, source: "conversation", precision: "day" };
  // A BARE MONTH, which is what people write. `days` stays the length they
  // spoke, NOT the length of the month: those are two different facts and
  // conflating them would hand a seven day trip the event budget of a
  // thirty-one day one. precision says how much of this to trust.
  const month = monthOnlyIn(convoText, today);
  if (month) {
    return { start: month.start, end: month.end, days: spoken || null, dated: true, source: "conversation", precision: "month" };
  }
  if (spoken) return { start: null, end: null, days: spoken, dated: false, source: "conversation" };
  return null;
};

// ── ONE EVENT PER THREE DAYS ────────────────────────────────────────
// Oliver's rule, in his words: "If the person has chosen like 4 days, then
// obviously he should be limited to only one. If the person is there for 10 on
// the other hand.. then he can easily make 3 or 4."
//
// A count and not a budget of days, deliberately. Counting the days an event
// eats would be more accurate for an eight day festival and would also mean
// the number on screen changes as you tick, which makes the limit impossible
// to state in one line before anyone has ticked anything.
export const MAX_EVENT_PICKS = 4;
export const eventPickLimit = (days) => {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.max(1, Math.min(MAX_EVENT_PICKS, Math.floor(n / 3)));
};

// ── AN EVENT'S OWN DATES, WITH THE ROW 62 GUARD ─────────────────────
// TinderBox is stored with date 2027-06-24 and dateEnd 2026-06-26: somebody
// bumped the start to the next edition and left the end on the last one.
// getEventDate already refuses to print that as a range. An overlap test has
// to make the same call, because a backwards range spans a whole year and
// would collide with every trip there is.
export const eventWindow = (e) => {
  const start = dayStart(e?.date);
  if (!start) return null;
  const end = dayStart(e?.dateEnd);
  return { start, end: end && end.getTime() >= start.getTime() ? end : start };
};

// true, false, or null for "this cannot be decided". Null is not a soft yes:
// callers treat it as unknown and fall back to the undated rules below.
export const overlapsTrip = (e, win) => {
  const ev = eventWindow(e);
  if (!ev) return null;
  if (!win || !win.dated || !win.start) return null;
  const tripEnd = win.end || win.start;
  return ev.start.getTime() <= tripEnd.getTime() && ev.end.getTime() >= win.start.getTime();
};

export const hasEnded = (e, today = new Date()) => {
  const ev = eventWindow(e);
  if (!ev) return false;
  const now = dayStart(today);
  return !!now && ev.end.getTime() < now.getTime();
};

// ── WHAT MAKES ONE OF THEM THE RECOMMENDATION ───────────────────────
// Three signals, all already on the row or already collected from the
// traveller, and no model call: what they said they were into, what Gemlyx
// itself rated the event, and how much of it lands inside the trip. Ordered
// that way on purpose, since a "Can't miss" event they have no interest in is
// a worse recommendation than a merely good one they came for.
const TIER_RANK = { must: 3, high: 2, worth: 1, nearby: 0 };

export const interestScore = (e, interests) => {
  const wanted = (Array.isArray(interests) ? interests : []).map(i => String(i || "").toLowerCase().trim()).filter(Boolean);
  if (!wanted.length) return 0;
  const hay = [e?.type || "", ...(Array.isArray(e?.tags) ? e.tags : [])].join(" ").toLowerCase();
  return wanted.filter(i => hay.includes(i)).length;
};

export const overlapDays = (e, win) => {
  const ev = eventWindow(e);
  if (!ev || !win || !win.dated || !win.start) return 0;
  const tripEnd = win.end || win.start;
  const from = Math.max(ev.start.getTime(), win.start.getTime());
  const to = Math.min(ev.end.getTime(), tripEnd.getTime());
  return to < from ? 0 : Math.round((to - from) / MS_DAY) + 1;
};

// ── THE LIST THE PREVIEW SCREEN SHOWS ───────────────────────────────
//
// Every returned row says what it is and why, so the screen renders decisions
// rather than making them, and so each rule can be asserted without a browser.
//
//   named       the traveller wrote this event's name in the conversation
//   overlaps    true / false / null, straight from overlapsTrip
//   tickable    may be added to the trip
//   recommended the pick, at most `limit` of them, never an untickable one
//   note        the reason, for anything shown but not tickable
//
// A NAMED EVENT THAT DOES NOT OVERLAP IS SHOWN ANYWAY, and that is the one
// piece of this worth arguing for: somebody who wrote "we want the Copenhagen
// Light Festival" and picked March dates has a plan that cannot happen, and
// hiding the row leaves them to find that out at the gate. It is shown, it
// cannot be ticked, and it says which dates it actually runs.
export const MAX_EVENTS_SHOWN = 6;
export const tripEvents = (candidates, { window: win = null, interests = [], named = null, today = new Date(), maxShown = MAX_EVENTS_SHOWN } = {}) => {
  const isNamed = typeof named === "function" ? named : (e) => !!(named && named.has && named.has(e));
  const rows = [];
  for (const e of Array.isArray(candidates) ? candidates : []) {
    if (!e || !e.name) continue;
    const wasNamed = !!isNamed(e);
    const overlaps = overlapsTrip(e, win);
    const ended = hasEnded(e, today);
    let tickable = false;
    let note = "";
    if (overlaps === true) tickable = true;
    else if (overlaps === false) {
      // Not hidden only when they asked for it by name.
      if (!wasNamed) continue;
      note = "Not on while you are there";
    } else if (ended) {
      if (!wasNamed) continue;
      note = "This edition has finished";
    } else if (!eventWindow(e)) {
      // No confirmed dates at all. Offering it as a plannable day is the exact
      // thing isConfirmedUpcoming exists to stop, so it is shown for a named
      // event and never ticked.
      if (!wasNamed) continue;
      note = "Dates not confirmed yet";
    } else {
      // Upcoming, and we do not know the trip's dates. Tickable, because the
      // traveller knows their own calendar even when this screen does not.
      tickable = true;
    }
    rows.push({
      event: e,
      named: wasNamed,
      overlaps,
      tickable,
      note,
      recommended: false,
      score: [
        wasNamed ? 1 : 0,
        interestScore(e, interests),
        TIER_RANK[tierOf(e)?.id] ?? 0,
        overlapDays(e, win),
      ],
    });
  }
  // Deterministic all the way down, name last, because a list that reorders
  // itself between two renders of the same data is its own bug.
  rows.sort((a, b) => {
    for (let i = 0; i < a.score.length; i++) if (b.score[i] !== a.score[i]) return b.score[i] - a.score[i];
    return String(a.event.name).localeCompare(String(b.event.name));
  });
  const limit = eventPickLimit(win?.days);
  // WITHOUT DATES, ONE SUGGESTION AND NO MORE. The screen cannot say any of
  // these is on while they are there, so it stops at the strongest one rather
  // than filling a section with maybes. Anything they named is theirs to keep.
  const undated = !win || !win.dated;
  // A NAMED EVENT IS NEVER CUT. The cap exists so a long trip in Copenhagen
  // does not turn this section into a directory, and it applies to the rows
  // Gemlyx chose, never to the row the traveller asked for by name.
  const keep = Math.max(1, Number(maxShown) || MAX_EVENTS_SHOWN);
  const suggested = rows.filter(r => !r.named).slice(0, undated ? 1 : keep);
  const list = rows.filter(r => r.named).concat(suggested);
  // The recommendation IS the default tick, which is what stops a traveller
  // who taps straight through from getting a guide with no event in it while
  // an event they came for was running that week.
  let given = 0;
  for (const r of list) {
    if (given >= limit) break;
    if (!r.tickable) continue;
    r.recommended = true;
    given++;
  }
  return { rows: list, limit, dated: !undated, picks: list.filter(r => r.recommended).map(r => r.event.name) };
};

// One line for the screen, so the limit is stated before anybody wonders why a
// checkbox stopped responding.
//
// ── AND ROOM IS NOT THE SAME THING AS SUPPLY ────────────────────────
//
// Oliver, 19 Aug 2026, with the line circled: "And it says 1 of 2 is added.. yet
// you can't add one more."
//
// Both halves were true and the sentence was still wrong. A six day trip has
// room for two events, `eventPickLimit` says so, and one was added. What the
// line did not know is that only ONE event in the whole library was running
// during his dates, so there was no second one to tick. "A trip this long has
// room for 2" reads as an instruction to go and add another, and the only thing
// to do with it is hunt for a checkbox that does not exist.
//
// The fix is to say which constraint is actually binding. When the trip has room
// the traveller cannot use, the limit is not the interesting number and the
// supply is: what is on while they are here. `tickable` is the count of rows
// that CAN be added, which the caller already has, and passing it is what lets
// this sentence tell the difference between "you may add another" and "there
// isn't another".
//
// Defaults to Infinity so an older caller that passes two arguments keeps its
// old behaviour rather than silently claiming nothing is available.
export const describePicks = (limit, picked, tickable = Infinity) => {
  const n = Number(picked) || 0;
  const avail = Number.isFinite(Number(tickable)) ? Number(tickable) : Infinity;
  // Nothing left to add, whatever the room. Said first, because it is the
  // sentence that answers the question the traveller is actually about to ask.
  if (avail <= n) {
    if (n === 0) return "Nothing in Gemlyx is running while you are here.";
    return n === 1
      ? "One event added, and it is the only one running while you are here."
      : `${n} added, which is everything running while you are here.`;
  }
  if (limit <= 1) return n >= 1 ? "One event added. Untick it to choose a different one." : "Pick one event to build the trip around.";
  return n >= limit
    ? `${n} of ${limit} added, which is the most this trip has room for.`
    : `${n} of ${limit} added. A trip this long has room for ${limit}.`;
};
