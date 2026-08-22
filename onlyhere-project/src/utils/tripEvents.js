import { tierOf } from "./placeThemes";
// The band vocabulary, imported rather than restated. A copy of "2 means
// comfortable" in this file is a number that has to be kept in step with
// another file by hand, which is the drift this codebase keeps finding.
import { REACH_COMFORTABLE, REACH_FAR } from "./routeOrder";
// The town a row belongs to, read the one way this app reads it. Five content
// types store it under five different field names and previewMatch.js has the
// function that knows all five; a second ordering of the same question here is
// the drift this codebase keeps finding.
import { parentTownOf } from "./previewMatch";

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

// ── AND IT ONLY EVER LISTENED IN ENGLISH ────────────────────────────
//
// 22 Aug 2026. Oliver's father told Gemlyx "today" and "7 days", in Danish, and
// got no button. Every reader in tripBrief runs on the traveller's own words,
// and every pattern in this file is English, so a Danish speaker can answer the
// two questions that block a build and fill neither slot. Gemlyx replies in
// their language and reads only ours, and the gap between those two is a person
// answering correctly and being asked again.
//
// Danish first because it is the country the product is about and the one
// language we know is in use. The rest follow the day they are needed, and the
// shape here is built so that adding one is a list entry rather than a rewrite.
export const dayCountIn = (text) => {
  const s = String(text || "");
  const digits = s.match(/\b(\d{1,2})\s*(?:-|–|to)?\s*(?:days?|dage?)\b/i);
  if (digits) return Math.min(parseInt(digits[1], 10), 14);
  const weeks = s.match(/\b(\d{1,2})\s*(?:-|–)?\s*(?:weeks?|uger?)\b/i);
  if (weeks) return Math.min(parseInt(weeks[1], 10) * 7, 14);
  if (/\b(?:a|an|the|one)\s+(?:whole|entire|full)?\s*week\b/i.test(s)) return 7;
  // "en uge", "hele ugen". `uge` alone is not enough: "i ugen" and "ugens" turn
  // up in ordinary sentences that are not an answer about length.
  // NOT \b before the alternation: é is not an ASCII word character, so a word
  // boundary in front of "én" never matches and that spelling fell through.
  if (/(?:^|[^\wÆØÅæøå])(?:én|en|hele|den ene)\s+(?:hel\s+)?uge[nr]?\b/i.test(s)) return 7;
  if (/\b(?:a|an|the|one)\s+fortnight\b/i.test(s)) return 14;
  if (/\b(?:to|2)\s+uger\b/i.test(s)) return 14;
  return null;
};

// ── "TODAY" IS AN ANSWER, AND NOTHING COULD READ IT ─────────────────
//
// The date reader above wants a day number and a month name. It has never had
// any concept of a relative day, in any language, so the most ordinary answer
// there is to "which dates?" filled nothing: today, tomorrow, this weekend,
// next week. His father said "today" and was asked again.
//
// Returns a start and an end rather than a bare date, because a weekend is two
// days and claiming it is one is the kind of quiet overstatement this codebase
// exists to refuse. `end` is null wherever the answer really is a single day.
const DK_DAYS = { "i dag": 0, "idag": 0, "i aften": 0, "iaften": 0, "i morgen": 1, "imorgen": 1, "i overmorgen": 2, "overmorgen": 2 };
const EN_DAYS = { "today": 0, "tonight": 0, "tomorrow": 1, "the day after tomorrow": 2, "day after tomorrow": 2 };

export const relativeDayIn = (text, today = new Date()) => {
  const s = String(text || "").toLowerCase();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const plus = (n) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);

  // "in 3 days" / "om 3 dage". Checked first: it carries a number, so it is the
  // most specific thing in here, and "om 3 dage" also contains no day word the
  // entries below would catch.
  const inN = s.match(/\b(?:in|om)\s+(\d{1,2})\s+(?:days?|dage?)\b/);
  if (inN) return { start: plus(parseInt(inN[1], 10)), end: null };

  // Longest key first, so "i overmorgen" is not read as "i morgen" inside it.
  const table = { ...EN_DAYS, ...DK_DAYS };
  const keys = Object.keys(table).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (new RegExp(`\\b${k.replace(/ /g, "\\s+")}\\b`, "i").test(s)) return { start: plus(table[k]), end: null };
  }

  // A weekend is Saturday and Sunday, and saying so is two days rather than one.
  // Already inside one means this one, not the next.
  if (/\b(?:this|the)\s+weekend\b|\bi\s+weekenden\b|\bdenne\s+weekend\b|\bher\s+i\s+weekenden\b/i.test(s)) {
    const dow = base.getDay();                       // 0 Sunday, 6 Saturday
    const toSat = dow === 0 ? -1 : (6 - dow);        // Sunday belongs to the weekend that began yesterday
    const sat = plus(toSat);
    return { start: sat, end: new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 1) };
  }
  // Next week starts on its Monday. Denmark counts the week from Monday.
  if (/\bnext\s+week\b|\bn(?:æ|ae)ste\s+uge\b/i.test(s)) {
    const dow = base.getDay();
    return { start: plus(((8 - dow) % 7) || 7), end: null };
  }
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

// ── AND NOTHING FURTHER OUT THAN TWO MONTHS ─────────────────────────
//
// Oliver, 21 Aug 2026: "Showing events on our drafts are great, but they
// shouldn't be showing events happening later than 2 months ahead."
//
// The screen had no upper bound at all. Every date test in this file is
// one-sided: overlapsTrip asks whether an event lands inside a KNOWN trip
// window, hasEnded asks whether it is over, and the branch that runs when the
// trip has no dates yet made every upcoming event tickable, so a convention in
// 2031 was a live recommendation.
//
// His answer to "two months from when": from the trip's own dates when we know
// them, and from today when we do not. Which is what this is. A dated trip
// never reaches this test, because overlapsTrip has already answered with the
// trip's real window and that is a better bound than any constant. This is the
// undated case only, and there the horizon is the honest one: a traveller who
// has not said when they are coming is planning something soon.
//
// A NAMED EVENT IS EXEMPT, exactly as it is exempt from the cap and from the
// overlap test. Somebody who writes "we want Roskilde" is told about Roskilde,
// whenever it is. The horizon is a rule about what Gemlyx VOLUNTEERS.
export const EVENT_HORIZON_MONTHS = 2;

export const beyondHorizon = (e, today = new Date(), months = EVENT_HORIZON_MONTHS) => {
  const ev = eventWindow(e);
  if (!ev) return false;
  const now = dayStart(today);
  if (!now) return false;
  // 31 December plus two months is 31 February, which JS silently rolls into 3
  // March, so an event on 2 March would have been inside a two month horizon
  // taken on New Year's Eve. Clamped to the last real day of the target month,
  // which is what a person means by "two months from today".
  const y = now.getFullYear(), m = now.getMonth() + months;
  const lastDayOfThatMonth = new Date(y, m + 1, 0).getDate();
  const edge = new Date(y, m, Math.min(now.getDate(), lastDayOfThatMonth));
  return ev.start.getTime() > edge.getTime();
};

// ── AND IN A TOWN WITH A LOT OF THEM, ONLY THE BIG ONES ─────────────
//
// The second half of the same sentence: "And with places where there are alot
// of events (like Copenhagen), limit it to only major ones."
//
// The field for this already existed and nothing had ever read it. Every
// festival published through Studio carries `__scale`, written as "Major" or
// "Local" from the drafting prompt (see shapeForLiveFields in
// utils/studioContent.js), and the app also keeps a separate `majorEvents`
// array which previewPools flattens in beside the ordinary ones with the same
// `_src`. So "major" was recorded twice over and conferred nothing.
//
// It only bites where he said it should. A town with three events shows all
// three, because there is nothing to thin out and dropping the local one would
// just make the section emptier. A town with a dozen is Copenhagen, and that is
// the case the rule is for.
export const MANY_EVENTS_IN_A_TOWN = 4;

export const isMajorEvent = (e) => e?._major === true
  || String(e?.__scale || "").trim().toLowerCase() === "major";

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
// ── AND THINNING RUNS ON THE SURVIVORS, NOT ON THE CANDIDATES ───────
// The first version of this ran before the date tests, and an adversarial pass
// found what that costs on the exact brief this file was written for: four days
// in Copenhagen in March, six Copenhagen festivals in the pool, one of them
// running that week and filed as local, one Major in July. The local one was
// dropped for not being major and the Major one was then dropped for not being
// on, and the events section went EMPTY on a trip that had an event in it.
// Publishing one major festival in Copenhagen deleted the section.
//
// So the question is asked of the rows that are actually still on the screen: is
// THIS town crowded on this trip, and is there a major one among what survived.
// Both halves are required, because "limit it to only major ones" needs major
// ones to limit it TO, and a town whose events are all local has nothing to thin
// to. Same discipline as preferReachable in routeOrder.js: prefer the ones that
// pass, never hand back an empty screen.
const townKeyOf = (e) => String(parentTownOf(e) || "").trim().toLowerCase();

export const thinCrowdedTowns = (rows) => {
  const list = Array.isArray(rows) ? rows : [];
  const per = new Map(), majors = new Map();
  for (const r of list) {
    const t = townKeyOf(r?.event);
    if (!t) continue;
    per.set(t, (per.get(t) || 0) + 1);
    if (isMajorEvent(r.event)) majors.set(t, (majors.get(t) || 0) + 1);
  }
  return list.filter(r => {
    const t = townKeyOf(r?.event);
    if (!t) return true;
    if ((per.get(t) || 0) <= MANY_EVENTS_IN_A_TOWN) return true;
    if (!(majors.get(t) || 0)) return true;
    return isMajorEvent(r.event);
  });
};

export const MAX_EVENTS_SHOWN = 6;
// `reachOf` returns a reach band for an event, or null when the caller has no
// anchor to measure from. Injected rather than computed here for the reason
// arrival.js injects townPoint: this file would otherwise need a coordinate
// library of its own, and a second one is how two parts of the app end up
// disagreeing about how far away something is. Null changes nothing, which is
// every caller that has not been given an anchor.
export const tripEvents = (candidates, { window: win = null, interests = [], named = null, today = new Date(), maxShown = MAX_EVENTS_SHOWN, reachOf = null } = {}) => {
  const isNamed = typeof named === "function" ? named : (e) => !!(named && named.has && named.has(e));
  const bandOf = typeof reachOf === "function" ? reachOf : () => null;
  // ── HOW CROWDED THIS EVENT'S OWN TOWN IS ──────────────────────────
  // Counted over the candidates that could actually be shown, so a town whose
  // events have all finished is not treated as busy on the strength of last
  // year's.
  const rows = [];
  for (const e of Array.isArray(candidates) ? candidates : []) {
    if (!e || !e.name) continue;
    const wasNamed = !!isNamed(e);
    // ── AND AN EVENT IS A PLACE AND A DAY, NOT JUST A DAY ─────────
    // Oliver, 21 Aug 2026: "And Comic Con? Really?" A Copenhagen convention on
    // a seven day trip to Aalborg, badged RECOMMENDED.
    //
    // The score below had four terms and not one of them was geographic, so
    // nothing in this file had ever asked where an event was. A town is a
    // suggestion about where to go and can honestly stretch; an event is a
    // fixed place on a fixed day, and one you cannot get to is not a weaker
    // recommendation, it is not a recommendation. Refused rather than ranked
    // last, because ranking last is exactly how the Comic Con got a badge.
    if (!wasNamed && bandOf(e) === REACH_FAR) continue;
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
    } else if (!wasNamed && beyondHorizon(e, today)) {
      // Upcoming, no trip dates, and further out than the horizon. Not shown at
      // all rather than shown untickable: an untickable row is a message about
      // a plan the traveller has, and there is no plan here to be wrong about.
      continue;
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
        // Reach sits directly under "they asked for it by name" and above
        // everything else, including what they are into. An event two hundred
        // kilometres further away is a different day of the trip, and no
        // interest match is worth spending it on when a nearer one answers the
        // same interest. Null when there is no anchor, and then this term is
        // the same number for every row and decides nothing.
        bandOf(e) ?? 1,
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
  const suggested = thinCrowdedTowns(rows.filter(r => !r.named)).slice(0, undated ? 1 : keep);
  const list = rows.filter(r => r.named).concat(suggested);
  // The recommendation IS the default tick, which is what stops a traveller
  // who taps straight through from getting a guide with no event in it while
  // an event they came for was running that week.
  let given = 0;
  for (const r of list) {
    if (given >= limit) break;
    if (!r.tickable) continue;
    // ── AND GEMLYX ONLY RECOMMENDS WHAT IS NEAR ───────────────────
    // A stretch is a real option and stays on the screen, tickable, because the
    // traveller may well decide a four hour train is worth it. What it does not
    // get is Gemlyx's own badge. "And Comic Con? Really?" was not a complaint
    // about the row existing, it was a complaint about the word RECOMMENDED
    // sitting on a convention on the other side of the country.
    //
    // Null means we could not measure, and an unmeasured event is treated as it
    // was before any of this existed rather than being quietly demoted.
    const band = bandOf(r.event);
    if (band != null && band < REACH_COMFORTABLE) continue;
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
