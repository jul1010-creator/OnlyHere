import { tierOf } from "./placeThemes";
// ── ONE VOCABULARY, SIX LANGUAGES, READ BY EVERY PARSER BELOW ───────
import { MONTH_INDEX, MONTH_PATTERN, MONTH_INDEX_ABBR, MONTH_PATTERN_ABBR, MONTH_PATTERN_ABBR_TRAILING, DAY_WORDS, WEEK_WORDS, ONE_WEEK, RELATIVE_DAYS, THIS_WEEKEND, NEXT_WEEK, WEEKDAYS, WEEKDAY_LEAD, WEEKDAY_INDEX, IN_N_DAYS, TRAVEL_VERBS, ARRIVAL_VERBS, SPELLED_NUMBERS, NUMBER_TOKEN, alt, LETTER } from "./travellerWords";
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
import { dayStart, eventLastDay } from "./calendarDay";

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
// ── AND THE MONTHS WERE ENGLISH ONLY ────────────────────────────────
// 23 Aug 2026. By lexical accident april, august, september, november and
// december matched a Danish sentence and januar, februar, marts, maj, juni,
// juli and oktober did not, so half the year silently worked. The standard
// Danish written form is "15. maj", and the pattern wanted an English ordinal
// and no period, so the most ordinary way a Dane writes a date failed on both
// halves at once. Now from travellerWords.js, in six languages.
//
// PURELY NUMERIC DATES ARE STILL NOT READ, deliberately. "5/6" is 5 June to a
// Dane, a German and a Dutchman and 6 May to an American, and five of Denmark's
// top six inbound markets are European while the sixth is the United States.
// Guessing costs a guide built for the wrong month; not guessing costs one more
// question, which Gemlyx now asks out loud, beside a date picker.
// The lookup for patterns that carry a day number beside the month, which is
// every pattern in this file bar monthOnlyIn. Abbreviations are safe here and
// nowhere else: see MONTH_ABBR in travellerWords.js for why a bare "Jan" may
// never be January.
const MONTH_NAMES = MONTH_INDEX_ABBR;
// Kept for monthOnlyIn, the one reader with no digit to settle it.
const MONTH_NAMES_FULL = MONTH_INDEX;
// ── AND A DATE MAY NOT BE BUILT OUT OF TWO MESSAGES ─────────────────
//
// Found 5 Sep 2026 by an adversarial review. readBrief hands these readers the
// traveller's turns JOINED WITH A NEWLINE, and `\s` matches a newline. So:
//
//   "It's in december"   then   "2 adults"      ->  2 December, day precision
//   "in june"            then   "4 of us"       ->  4 June, day precision
//   "3"                  then   "october"       ->  3 October, day precision
//
// A fabricated exact date on a hard slot, and worse than a missing one: day
// precision means `vague` is empty, so nobody asks which day, and the guide
// dates its weather and its events to it.
//
// The space between a day and its month is a SAME-LINE space. Nothing else about
// this pattern changes, so a date written in one message reads exactly as it did.
const SP = "[^\\S\\n]";
const DATE_RE = new RegExp(
  `(?:^|[^${LETTER}])(?:` +
    `(?:d\\.${SP}*)?(\\d{1,2})(?:st|nd|rd|th|\\.)?${SP}*(?:of${SP}+|den${SP}+|de${SP}+)?(${MONTH_PATTERN_ABBR})` +
    `|(${MONTH_PATTERN_ABBR_TRAILING})${SP}+(\\d{1,2})(?:st|nd|rd|th|\\.)?` +
  `)(?![${LETTER}])`, "i");

// \u2500\u2500 A TRIP IS A RANGE, AND NOTHING HERE COULD READ ONE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
//
// Oliver, 12 Sep 2026, stuck in his own Detour chat. He had been asked for his
// dates and answered "for fuck sakes mate.. I'm here the 14th till 17th." The
// brief\u2019s `when` slot stayed null, so Gemlyx asked again, and the conversation
// could not finish. His exported report: stillMissing ["party","stay"],
// askedAndUnanswered ["when"].
//
// TWO BUGS, ONE CAUSE, and the second is worse than the one he hit.
//
//   "I'm here the 14th till 17th"              -> null
//   "I'm here the 14th till 17th of September" -> 17 September
//   "14-17 September"                          -> 17 September
//
// DATE_RE looks for one day number sitting beside one month name, and `.match`
// with no /g returns the FIRST place that pattern fits. In a range written with
// the month at the end, "14" is followed by "-17", which is not a month, so the
// only number that can match is the SECOND one. Every such trip was read as
// arriving on its own departure day. The first bug is loud and asks again; this
// one is silent and dates the whole guide to the day he goes home.
//
// So the reader learns what a range is. The START is the arrival, the END is the
// departure, and the length falls out of the two instead of being asked for
// separately.
//
// \u2500\u2500 AND A BARE RANGE HAS TO PICK ITS OWN MONTH \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
//
// "the 14th till 17th" names no month, and a person reading it on the 12th
// knows exactly what it means. The rule is the one already written above for a
// lone date and for a bare month: the nearest one that has not gone. If the
// start day is still ahead this month it is this month, otherwise next, and the
// year rolls with it.
//
// THIS IS NOT THE NUMERIC-DATE GUESS THIS FILE REFUSES. The comment above
// DATE_RE refuses "5/6" because it is 5 June to a Dane and 6 May to an American,
// and the two readings are both plausible. "the 14th till 17th" has no second
// reading: both numbers are days, in the same month, in that order. What is
// missing is which month, and that is inferred from today rather than guessed
// between two candidates.
//
// \u2500\u2500 AND A NUMBER RANGE IS USUALLY NOT A DATE AT ALL \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
//
// "400 to 600 DKK a day", "2-3 days", "80-plus bars", "between 14 to 17 people".
// Reading any of those as a trip would be worse than reading nothing, so the
// bare form demands date-shaped writing: an ordinal on at least one end, or a
// leading "the" or "from", and NEVER a unit word after it. A month on either
// end says date by itself and needs no such proof.
// Flattened to phrase -> offset and read longest first, or "i overmorgen" is
// read as the "i morgen" inside it and they arrive a day early.
// Up here rather than beside relativeDayIn, because dateRangeIn below needs it
// too: "tomorrow through the 20th" is a range whose start is one of these.
const REL_TABLE = Object.fromEntries(
  Object.entries(RELATIVE_DAYS).flatMap(([off, list]) => list.map(w => [w, Number(off)]))
);
const REL_ALT = Object.keys(REL_TABLE).sort((a, b) => b.length - a.length).map(k => k.replace(/ /g, "\\s+")).join("|");

// ── IN SIX LANGUAGES, LIKE EVERY OTHER LIST IN THIS PROJECT ─────
// English and the Danish "til" only, until a Fable review on 12 Sep ran the
// German and Dutch forms: "vom 14. bis 17. September" and "14 t/m 17 september"
// both lost the range and came back as the 17th, which is the DEPARTURE date
// read as the arrival. A trip starting three days late, with no length.
const RANGE_JOIN = "(?:\\s*(?:to|till|til|until|through|thru|bis|tot|t/m|-|\\u2013|\\u2014)\\s*|\\s+(?:to|till|til|until|through|thru|bis|tot|t/m|frem til|fram till)\\s+)";
// ── AND THE LITTLE WORD IN FRONT OF A DATE ─────────────────
//
// "the" and "from" were spelled into five patterns each and "den" into none, so
// "fra den 14. til den 17. september" could not be read while "fra 14. til 17.
// september" could. Worse than a miss: the Danish re-ask this app appends when
// it has asked for the dates once and not got them offers "den 14. til den 17."
// as its own worked example, so a Dane who followed the instruction on screen
// was told again that the answer did not land.
//
// One definition of each, used by every pattern below, because five hand-copied
// spellings of the same three words is how "den" came to be missing from all of
// them at once.
const LEAD = `(?:(?:the|from|on|fra|frem${SP}+til|vom|von|van|fr(?:å|a)n|den)${SP}+)`;
const ART = `(?:(?:the|den|de|der)${SP}+)?`;
// What a number range means when it is not a trip. If one of these follows, the
// numbers were never days.
const NOT_A_DATE_AFTER = /^\s*(?:days?|nights?|d\u00f8gn|dage|n\u00e6tter|weeks?|uger?|hours?|timer?|minutes?|min|people|persons?|adults?|kids?|children|b\u00f8rn|voksne|pax|kr|kroner|dkk|eur|euros?|usd|%|percent|procent|km|kilometers?|kilometres?|m|miles?|degrees?|grader|bars?|stops?|places?|plus)\b/i;
const ORDINAL = "(?:st|nd|rd|th|\\.)";
// \u2500\u2500 AND A FULL STOP IS NOT AN ORDINAL \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// ORDINAL carries "\\." because Danish writes "15. maj", and that is right where
// a month follows. It is wrong as the proof that a bare number is a DATE: a
// review found "I'm at work today till 5." reading as a 24 day trip, because
// the sentence ended. Every fixture written for that guard passed only because
// none of them had a final period. The relative-range branch below needs a real
// ordinal or a leading "the", which is what a date is written with and what a
// clock never is.
const REAL_ORDINAL = "(?:st|nd|rd|th)";
// day + month, month + day, or a bare day, at either end of the join.
const R_BOTH_THEN_MONTH = new RegExp(
  `(?:^|[^${LETTER}\\d])${LEAD}?(\\d{1,2})${ORDINAL}?${RANGE_JOIN}${ART}(\\d{1,2})${ORDINAL}?${SP}*(?:of${SP}+|den${SP}+|de${SP}+)?(${MONTH_PATTERN_ABBR})(?![${LETTER}])`, "i");
const R_MONTH_THEN_BOTH = new RegExp(
  `(?:^|[^${LETTER}])(${MONTH_PATTERN_ABBR_TRAILING})${SP}+(\\d{1,2})${ORDINAL}?${RANGE_JOIN}${ART}(\\d{1,2})${ORDINAL}?(?![${LETTER}\\d])`, "i");
// ── AND THE MONTH IN THE MIDDLE, WHICH IS HOW HE WROTE IT ─────────
//
// Oliver, 12 Sep 2026 at 18:22: "It's from the 13th of september till the
// 20th....." — a range, written the way an English sentence puts it, with the
// month attached to the FIRST date instead of the last.
//
// The two above cover the month at the end ("14th till 17th of September") and
// the month at the front ("Sep 28 - Oct 3"). Between them they had the two
// orderings a booking confirmation uses and not the one a person types. His
// brief came out of that conversation with no trip length at all.
const R_DAY_MONTH_THEN_DAY = new RegExp(
  `(?:^|[^${LETTER}\\d])${LEAD}?(\\d{1,2})${ORDINAL}?${SP}*(?:of${SP}+|den${SP}+|de${SP}+)?(${MONTH_PATTERN_ABBR})${RANGE_JOIN}${ART}(\\d{1,2})${ORDINAL}?(?![${LETTER}\\d])`, "i");
const R_BARE = new RegExp(
  `(?:^|[^${LETTER}\\d])${LEAD}(\\d{1,2})${ORDINAL}?${RANGE_JOIN}${ART}(\\d{1,2})${ORDINAL}?(?![${LETTER}\\d])`, "i");
const R_BARE_ORDINALS = new RegExp(
  `(?:^|[^${LETTER}\\d])(\\d{1,2})${ORDINAL}${RANGE_JOIN}${ART}(\\d{1,2})${ORDINAL}(?![${LETTER}\\d])`, "i");

const dayOk = (n) => Number.isFinite(n) && n >= 1 && n <= 31;

// Two full dates, one on each side, which is the only form that can legitimately
// cross a month: "14 September to 2 October".
const R_TWO_FULL = new RegExp(
  `(?:^|[^${LETTER}\\d])(\\d{1,2})${ORDINAL}?${SP}*(?:of${SP}+)?(${MONTH_PATTERN_ABBR})${RANGE_JOIN}${ART}(\\d{1,2})${ORDINAL}?${SP}*(?:of${SP}+)?(${MONTH_PATTERN_ABBR})(?![${LETTER}])`, "i");
// And the same thing written the other way round, which is how a booking
// confirmation prints it: "Sep 28 - Oct 3". Found by testing rather than by
// reading, which is why it is here and not in the pattern above.
const R_TWO_FULL_MD = new RegExp(
  `(?:^|[^${LETTER}])(${MONTH_PATTERN_ABBR_TRAILING})${SP}+(\\d{1,2})${ORDINAL}?${RANGE_JOIN}(${MONTH_PATTERN_ABBR})${SP}+(\\d{1,2})${ORDINAL}?(?![${LETTER}\\d])`, "i");

export const dateRangeIn = (text, today = new Date()) => {
  const s = String(text || "");
  if (!s.trim()) return null;
  const floor = new Date(today.toDateString());
  const rollFrom = (monthIdx, day) => {
    let d = new Date(today.getFullYear(), monthIdx, day);
    if (d < floor) d = new Date(today.getFullYear() + 1, monthIdx, day);
    return d;
  };
  const tailFrom = (m) => s.slice(m.index + m[0].length);

  // Two full dates first: it is the only form that says its own months, so it
  // must not be flattened into one month by a looser pattern below. Both
  // orderings, because "14 September to 2 October" and "Sep 28 - Oct 3" are the
  // same sentence to a reader.
  for (const [re, order] of [[R_TWO_FULL, "dmdm"], [R_TWO_FULL_MD, "mdmd"]]) {
    const two = s.match(re);
    if (!two) continue;
    const d1 = parseInt(order === "dmdm" ? two[1] : two[2], 10);
    const d2 = parseInt(order === "dmdm" ? two[3] : two[4], 10);
    const m1 = MONTH_NAMES[(order === "dmdm" ? two[2] : two[1]).toLowerCase()];
    const m2 = MONTH_NAMES[(order === "dmdm" ? two[4] : two[3]).toLowerCase()];
    if (!dayOk(d1) || !dayOk(d2) || m1 === undefined || m2 === undefined) continue;
    const start = rollFrom(m1, d1);
    let end = new Date(start.getFullYear(), m2, d2);
    // A December start and a January end is a year boundary, not an error.
    if (end < start) end = new Date(start.getFullYear() + 1, m2, d2);
    return { start, end, precision: "day", monthStated: true };
  }

  for (const [re, order] of [[R_BOTH_THEN_MONTH, "ddm"], [R_MONTH_THEN_BOTH, "mdd"], [R_DAY_MONTH_THEN_DAY, "dmd"]]) {
    const m = s.match(re);
    if (!m) continue;
    const d1 = parseInt(order === "mdd" ? m[2] : m[1], 10);
    const d2 = parseInt(order === "ddm" ? m[2] : m[3], 10);
    const monthIdx = MONTH_NAMES[(order === "ddm" ? m[3] : order === "mdd" ? m[1] : m[2]).toLowerCase()];
    if (!dayOk(d1) || !dayOk(d2) || monthIdx === undefined) continue;
    // Backwards is not a trip. "the 17th to the 14th" is somebody writing
    // something else, and inventing a month boundary to make it parse would be
    // the invention this file exists to refuse.
    if (d2 < d1) continue;
    const start = rollFrom(monthIdx, d1);
    return { start, end: new Date(start.getFullYear(), monthIdx, d2), precision: "day", monthStated: true };
  }

  // Bare, so it has to look like a date and not like a quantity.
  for (const re of [R_BARE, R_BARE_ORDINALS]) {
    const m = s.match(re);
    if (!m) continue;
    if (NOT_A_DATE_AFTER.test(tailFrom(m))) continue;
    const d1 = parseInt(m[1], 10), d2 = parseInt(m[2], 10);
    if (!dayOk(d1) || !dayOk(d2) || d2 < d1) continue;
    // The nearest month that still holds the start, which is how a person reads
    // it. Said on the 12th, "the 14th till 17th" is this month; said on the
    // 20th, it is next.
    let monthIdx = today.getMonth(), year = today.getFullYear();
    if (d1 < today.getDate()) {
      monthIdx += 1;
      if (monthIdx > 11) { monthIdx = 0; year += 1; }
    }
    const start = new Date(year, monthIdx, d1);
    return { start, end: new Date(year, monthIdx, d2), precision: "day", monthStated: false };
  }

  // ── AND A RANGE CAN START WITHOUT A NUMBER ────────────────────────
  //
  // Oliver, 12 Sep 2026, 19:18, on the live site. Gemlyx's own reply read
  // "Tomorrow through the 20th keeps you clear of Oktoberfest in Aalborg" and
  // the same reply closed with "One thing first, and then I can build it: Which
  // dates?", with the progress bar on 1 of 7.
  //
  // The model understood it perfectly. Nothing else could: every pattern above
  // needs a DIGIT on the left of the join, and latestRelativeAnswer refuses a
  // turn that also states a date, which "the 20th" is. So a relative start with
  // a dated end fell down the crack between the two readers — and it is one of
  // the most ordinary ways there is to answer "which dates".
  //
  // Here rather than in readWhen, for the reason the comment at the top of
  // arrivalDateIn gives: six callers read an arrival through these functions and
  // a parallel path that some of them forget is the hand-copied list this
  // codebase has paid for four times.
  //
  // The end rolls to the next month when the number has already gone, which is
  // how a person reads it: said on the 30th, "tomorrow to the 3rd" ends in
  // October. NOT_A_DATE_AFTER still applies, so "tomorrow to 6 people" is not a
  // trip, and the start has to be a relative day word rather than any word at
  // all, so there is no bare-number guessing here.
  // ── AND THE END HAS TO BE WRITTEN AS A DATE ───────────────────────
  //
  // Found by an adversarial review before this shipped. Without it, "I'm at
  // work today till 5" was a 24-day trip, "we're out tonight until 11" a
  // 30-day one, and "Museet har åbent i dag til 17" five days — and tripWindow
  // runs this over the WHOLE transcript, Gemlyx's own replies included, so an
  // opening-hours sentence in a reply set the trip window.
  //
  // The same rule R_BARE already states for the numeric forms: the bare shape
  // demands date-shaped writing. An ordinal, or a leading "the". A clock never
  // has either, and "the 20th" has both.
  const mixed = s.match(new RegExp(
    `(?:^|[^${LETTER}])(?:from${SP}+)?(${REL_ALT})${RANGE_JOIN}(?:the${SP}+(\\d{1,2})${ORDINAL}?|(\\d{1,2})${REAL_ORDINAL})(?![${LETTER}\\d])`, "i"));
  if (mixed && !NOT_A_DATE_AFTER.test(tailFrom(mixed))) {
    const off = REL_TABLE[mixed[1].toLowerCase().replace(/\s+/g, " ")];
    const d2 = parseInt(mixed[2] ?? mixed[3], 10);
    if (off !== undefined && dayOk(d2)) {
      const start = new Date(floor.getFullYear(), floor.getMonth(), floor.getDate() + off);
      let end = new Date(start.getFullYear(), start.getMonth(), d2);
      if (end < start) end = new Date(start.getFullYear(), start.getMonth() + 1, d2);
      return { start, end, precision: "day", monthStated: false };
    }
  }
  return null;
};

export const arrivalDateIn = (text, today = new Date()) => {
  // THE RANGE FIRST, because its start is the arrival and DATE_RE below would
  // return its end. See dateRangeIn: this is the whole of the 12 Sep fix, and
  // putting it here rather than in each caller is deliberate. Six callers read
  // an arrival through this function, and a parallel path that some of them
  // forget is the hand-copied list this codebase has paid for four times.
  const range = dateRangeIn(text, today);
  if (range) return range.start;
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
  // FULL NAMES ONLY, here and nowhere else. This is the one reader with no day
  // number beside the month to settle it, and "Jan is coming with us" becoming
  // January is a trip planned for the wrong season. See MONTH_ABBR.
  const m = s.match(new RegExp(`\\b(${MONTH_PATTERN})\\b`, "i"));
  if (!m) return null;
  const monthIdx = MONTH_NAMES_FULL[m[1].toLowerCase()];
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
// ── AND A NUMBER WRITTEN AS A WORD IS STILL A NUMBER ────────────────
//
// 25 Aug 2026. "We have four days." read nothing; "We have 4 days." read four.
// The reader had been taught five languages and never taught that English
// writes small numbers as words — which is how almost everybody types this.
//
// The same list serves the party count, so "two adults" and "four days" cannot
// disagree about what the word two means.
const spelledNumber = (word) => {
  const n = SPELLED_NUMBERS[String(word || "").toLowerCase()];
  return Number.isFinite(n) ? n : null;
};
const numFrom = (token) => {
  const t = String(token || "").trim();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  return spelledNumber(t);
};

// ── AND "TODAY" IS NOT TWO DAYS ─────────────────────────────────────
//
// Found 5 Sep 2026 by an adversarial review. `to` is Danish for 2 and `day` is
// an English day word, so "today" satisfied this pattern end to end: the number
// token took "to", the separator matched nothing at all, and the day word took
// "day". Every English sentence containing the word built a two-day trip, and
// because this is a single exec over the joined conversation, "we land today,
// staying 10 days" never reached the 10.
//
// A DIGIT may be glued to its unit — "7days" is a typo, not an ambiguity. A
// SPELLED number may not, because a spelled number glued to a day word is not a
// length, it is a longer word. So the separator is optional after digits and
// required after letters.
//
// And the scan no longer stops at the first match: a rejected candidate must not
// hide a real answer later in the same sentence.
// ── THE CAP, NAMED, BECAUSE IT USED TO EAT A DAY IN SILENCE ─────────
//
// 6 Sep 2026. Oliver said "No I mean 15 days" and the brief recorded 14. The
// reply said "15 days total, that's a proper trip", the preview said "your 15
// days", and the plan prompt built `requestedDays` days. Every screen agreed
// with him and the number underneath them did not, so one day of a fortnight
// had no plan and nothing said which day or why.
//
// The ceiling itself is fine and directAnswer.js already aligned its own to
// this one on purpose. What was wrong is that `Math.min` is not an answer, it
// is a silent edit of what somebody told you. A caller that wants to KNOW they
// were told more can now pass `cap: Infinity` and compare, which is what
// readBrief does so Gemlyx can say it out loud.
export const MAX_TRIP_DAYS = 14;

export const dayCountIn = (text, { cap = MAX_TRIP_DAYS } = {}) => {
  const s = String(text || "");
  const lid = (n) => Math.min(n, cap);
  const re = new RegExp(`(?:^|[^${LETTER}])(${NUMBER_TOKEN})(\\s*(?:-|–|to|til|bis|tot)?\\s*)(?:${alt(DAY_WORDS)})(?![${LETTER}])`, "gi");
  let m = null;
  while ((m = re.exec(s)) !== null) {
    if (/^[^\d]/.test(m[1]) && !m[2]) continue;   // "today", "todage", and their kind
    const n = numFrom(m[1]);
    if (n) return lid(n);
  }
  const weeks = new RegExp(`(?:^|[^${LETTER}])(${NUMBER_TOKEN})\\s*(?:-|–)?\\s*(?:${alt(WEEK_WORDS)})(?![${LETTER}])`, "i").exec(s);
  if (weeks) { const n = numFrom(weeks[1]); if (n) return lid(n * 7); }
  if (new RegExp(`(?:^|[^${LETTER}])(?:${alt(ONE_WEEK)})(?![${LETTER}])`, "i").test(s)) return lid(7);
  // "en uge", "hele ugen". `uge` alone is not enough: "i ugen" and "ugens" turn
  // up in ordinary sentences that are not an answer about length.
  // NOT \b before the alternation: é is not an ASCII word character, so a word
  // boundary in front of "én" never matches and that spelling fell through.
  if (/(?:^|[^\wÆØÅæøå])(?:én|en|hele|den ene)\s+(?:hel\s+)?uge[nr]?\b/i.test(s)) return lid(7);
  if (new RegExp(`(?:^|[^${LETTER}])(?:to|2|zwei|twee|två)\\s+(?:${alt(WEEK_WORDS)})(?![${LETTER}])`, "i").test(s)) return lid(14);
  if (/\b(?:a|an|the|one)\s+fortnight\b/i.test(s)) return lid(14);
  if (/\b(?:to|2)\s+uger\b/i.test(s)) return lid(14);
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
// From travellerWords.js, so adding a language is one list entry. Flattened to
// phrase -> offset and read longest first, or "i overmorgen" is read as the
// "i morgen" inside it and they arrive a day early.
export const relativeDayIn = (text, today = new Date()) => {
  const s = String(text || "").toLowerCase();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const plus = (n) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);

  // "in 3 days" / "om 3 dage". Checked first: it carries a number, so it is the
  // most specific thing in here, and "om 3 dage" also contains no day word the
  // entries below would catch.
  const inN = new RegExp(`(?:^|[^${LETTER}])((?:${alt(IN_N_DAYS)})\\s+(\\d{1,2})\\s+(?:${alt(DAY_WORDS)}))(?![${LETTER}])`, "i").exec(s);
  if (inN) return { start: plus(parseInt(inN[2], 10)), end: null, matched: inN[1] };

  // Longest key first, so "i overmorgen" is not read as "i morgen" inside it.
  const keys = Object.keys(REL_TABLE).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const hit = new RegExp(`(?:^|[^${LETTER}])(${k.replace(/ /g, "\\s+")})(?![${LETTER}])`, "i").exec(s);
    if (hit) return { start: plus(REL_TABLE[k]), end: null, matched: hit[1] };
  }

  // A weekend is Saturday and Sunday, and saying so is two days rather than one.
  // Already inside one means this one, not the next.
  const wk = new RegExp(`(?:^|[^${LETTER}])(${alt(THIS_WEEKEND)})(?![${LETTER}])`, "i").exec(s);
  if (wk) {
    const dow = base.getDay();                       // 0 Sunday, 6 Saturday
    const toSat = dow === 0 ? -1 : (6 - dow);        // Sunday belongs to the weekend that began yesterday
    const sat = plus(toSat);
    return { start: sat, end: new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 1), matched: wk[1] };
  }
  // ── AND A DAY OF THE WEEK, WHICH IS HOW PEOPLE SAY IT ───────
  //
  // Oliver, 13 Sep 2026, a Sunday: "It doesn't understand 'next week' and 'on
  // monday'. In fact, it calculated it as the 19th of September." He typed
  // "Maybe next week? Monday" and the answer should have been the 14th, the
  // very next day. "next week" was already understood here; the day name was
  // not, so the word that made his answer precise was invisible and the model
  // filled a HARD slot with a date it made up.
  //
  // STRICTLY AFTER TODAY. Somebody who means today says today. Somebody saying
  // "Monday" on a Monday means the one coming, which is the reading every diary
  // uses.
  const day = new RegExp(`(?:^|[^${LETTER}])(?:(?:${alt(WEEKDAY_LEAD)})\\s+)?(${alt(Object.values(WEEKDAYS).flat())})(?![${LETTER}])`, "i").exec(s);
  const nw = new RegExp(`(?:^|[^${LETTER}])(${alt(NEXT_WEEK)})(?![${LETTER}])`, "i").exec(s);
  const nextMonday = () => ((8 - base.getDay()) % 7) || 7;
  if (day) {
    const want = WEEKDAY_INDEX[String(day[1]).toLowerCase()];
    if (Number.isInteger(want)) {
      // WITH "next week" BESIDE IT, the day belongs to that week rather than to
      // this one: "Friday next week" is not this Friday. Without it, the next
      // one to come round.
      const from = nw ? nextMonday() : 0;
      const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() + from);
      const ahead = ((want - start.getDay()) + 7) % 7;
      const total = from + ahead + (!nw && ahead === 0 ? 7 : 0);
      // THE CONTIGUOUS PHRASE, because `matched` exists to be REMOVED from the
      // turn, by the answer test below and by readDays one file over. "Maybe
      // next week? Monday" holds the two halves ten characters apart, and a
      // matched value of "Monday next week" is a string that appears nowhere in
      // it: the replace did nothing, the whole turn stayed as residue, and the
      // answer was thrown away. The other half is stripped as filler instead.
      return { start: plus(total), end: null, matched: day[0].trim() };
    }
  }
  // Next week starts on its Monday. Denmark counts the week from Monday.
  if (nw) return { start: plus(nextMonday()), end: null, matched: nw[1] };
  return null;
};

// ── AND A TIME WORD IS NOT AN ANSWER ────────────────────────────────
//
// relativeDayIn on its own reads "Great, thanks, talk tomorrow!" as an arrival
// date and fills the hard `when` slot with it, which is worse than the silence
// it was written to fix. It is the 21 August failure back again: a guide built
// confidently for dates nobody gave. It also beat a stated month, so "we are
// thinking October, I will confirm tomorrow" arrived as tomorrow.
//
// The discriminator is not the words, it is whether the TURN is an answer. Take
// the date phrase out, take any trip length out, and look at what a person still
// said. "i dag" leaves nothing. "i dag, 7 dage" leaves nothing. "talk tomorrow"
// leaves "talk", and "is the weekend market good?" leaves most of a sentence.
//
// Deliberately strict. A missed answer costs one more question, which Gemlyx
// now asks out loud. A wrong date costs a guide built for the wrong week.
// ── AND A TRAVEL VERB IS NOT NOISE, IT IS THE ANSWER ────────────────
//
// 23 Aug 2026. This list held "jeg" and not "rejser", so "jeg rejser i dag" was
// rejected as a sentence that merely mentions a date, while a bare "i dag" was
// accepted. Oliver answered the date question in a full Danish sentence and the
// brief recorded nothing, which is one of the three reasons the button was
// unreachable. Measured, not guessed: latestRelativeAnswer(["jeg rejser i dag"])
// returned null and latestRelativeAnswer(["i dag"]) returned the right day.
//
// The rule it protects still holds. "Talk tomorrow!" is still rejected, because
// "talk" is not a travel verb and never will be. What changes is that the verbs
// somebody actually uses to say when they are leaving no longer disqualify the
// sentence they are leaving in.
// ── AND A CONTRACTION LEAVES A LETTER BEHIND ────────────────────────
// The split below breaks on anything that is not a word character, so "I'm"
// arrives here as ["i", "m"] and "we've" as ["we", "ve"]. Neither tail was on
// this list, which means ANY sentence carrying a contraction failed the test on
// a single orphaned letter: measured 12 Sep 2026, "coming today" and "I'm
// coming today" disagreed, and the only difference was the "m".
const CONTRACTION_TAIL = "m|re|ve|ll|s|d|t";
// Somebody repeating an answer is still answering it. "I said in 2 days!!!" is
// the turn Oliver typed when Gemlyx asked him a third time, and it read as
// nothing, because "said" was not on this list.
const RE_ASSERTION = "said|say|saying|told|already|again|mentioned|literally|just|sagde|sagt|jo|altså|alts";
const ANSWER_FILLER = new RegExp(
  `^(?:and|og|men|but|vi|we|i|jeg|du|man|ich|wir|ik|wij|je|jag|han|hun|hij|zij|to|til|for|on|om|about|ca|omkring|ish` +
  `|start|starts|starting|starter|please|thanks|tak|ja|yes|yep|ok|okay` +
  // ── AND THE WORD THAT MEANS THEY ARE NOT CERTAIN ──────────────
  // "Maybe next week? Monday" is an answer with a shrug on it, and the shrug
  // was the only word left over, so the whole answer was thrown away and a HARD
  // slot stayed empty. Somebody who is not sure yet has still told you when.
  `|maybe|probably|perhaps|possibly|likely|m(?:å|aa)ske|nok|vielleicht|wahrscheinlich|misschien|kanske|forse` +
  `|the|a|an|den|det|er|is|it` +
  // Where they will be, which is half of what a date answer says: "I'm here
  // today", "we're there from the 14th", "back then". None of them narrows
  // anything, and all of them were disqualifying a perfectly plain answer.
  `|here|there|back|then|now|herovre|derovre|hjemme` +
  // The words that point at the destination without naming it. The NAME itself
  // can never be on a list — see below — but "into", "over" and "from" can, and
  // leaving them off meant "flying into Denmark" had two unknowns rather than
  // the one the rule allows.
  `|into|in|at|from|over|via|home|hjem|ud|op|ned|naar|nach|aus` +
  // And how long they are there, which sits in the same breath as when: "we fly
  // in in 2 days and we're staying 5 days" answers both, and rejecting the turn
  // threw the five away.
  `|stay|stays|staying|stayed|bliver|bor|blive` +
  // ── AND THE SCAFFOLDING OF AN ORDINARY SENTENCE ─────────
  //
  // Oliver, 12 Sep 2026 at 22:43: "I'm going in 3 days, and I'll be in Denmark
  // for 7 days total." Read as a THREE day trip with no dates at all. Both
  // halves wrong from one cause: the turn was rejected as an answer over the
  // words "be" and "total", so "in 3 days" was never taken out before the
  // length was counted, and the arrival was never read either.
  //
  // These are not interests, subjects or objections. They are the words a
  // sentence is built out of, and the words for the trip itself. A rule that
  // lets a destination through and trips on "be" is not narrow, it is
  // arbitrary. Every rejection this guard exists for still fails on its own
  // content word: "talk", "market", "confirm", "check", "like".
  `|be|is|am|are|was|were|been|will|would|shall|going|gonna|got|have|has|had` +
  `|total|altogether|trip|holiday|vacation|tur|ferie|rejse|reise|urlaub|vakantie` +
  `|${CONTRACTION_TAIL}|${RE_ASSERTION}` +
  `|${ARRIVAL_VERBS.filter(w => !w.includes(" ")).join("|")}` +
  `|${TRAVEL_VERBS.filter(w => !w.includes(" ")).join("|")})$`, "i");

// ── AND THE ONE WORD A STOPLIST CAN NEVER HOLD ──────────────────────
//
// Oliver, 12 Sep 2026. His own transcript, seven turns, and Gemlyx closing all
// four of its replies with the identical sentence "One thing first, and then I
// can build it: Which dates?" — ending in "for fuck sakes mate".
//
// He had answered. Turn 4 was "I'm flying into Denmark in 2 days", which is a
// date, carries its own number, and says in as many words that it is about
// flying somewhere. The test above rejected it, because after taking out "in 2
// days" what is left is "i m flying into denmark", and "into" and "denmark" are
// not on a stoplist — nor could they be, because the destination is a different
// word every time.
//
// The stoplist can hold every word a person uses to say WHEN. It can never hold
// the word for WHERE, because the destination is a different word every time,
// and that single word is all that stood between this sentence and the answer
// inside it.
//
// So the residue is allowed exactly one kind of unknown word: a proper noun.
// Denmark, Billund, Nørresundby — a place is capitalised, and nothing else in a
// sentence of this shape is.
//
// ── AND NOT THE FIRST WORD, WHICH IS CAPITALISED BY GRAMMAR ─────────
//
// "Talk tomorrow!" opens with a capital because every sentence does, and
// counting it would let the exact sentence this guard was written to reject
// back in. So the capital only counts away from a sentence start, where it
// means something. That also keeps "we want to see Denmark in 3 days" out: it
// has a proper noun, but "want" and "see" are two more unknowns beside it, and
// the allowance is for the destination alone.
//
// Deliberately NOT a list of travel verbs. That was the first version and it was
// far too loose: TRAVEL_VERBS holds "going", so "I'm going to check with my wife
// tomorrow" became an arrival date, and "leave" and "come" did the same for "I'll
// leave it until tomorrow" and "can we come back to this tomorrow". A wrong date
// is the most expensive thing this file can produce.
//
// A COMPETING DATE STILL OUTRANKS IT. "We fly in on 14 September, I'll confirm
// tomorrow" is not tomorrow, and the month and the written date are read by the
// callers above this one.
const STATES_A_DATE = (text) => DATE_RE.test(text) || new RegExp(`(?:^|[^${LETTER}])(?:${MONTH_PATTERN})(?![${LETTER}])`, "i").test(text);
// Capitalised, and not at the start of the turn or of a sentence inside it.
const properNounsIn = (raw) => {
  const out = new Set();
  const re = new RegExp(`([^${LETTER}]|^)\\s*([A-ZÆØÅÄÖÜ][${LETTER}]{2,})`, "g");
  let m;
  while ((m = re.exec(raw)) !== null) {
    const lead = raw.slice(0, m.index + m[1].length).trim();
    // Nothing before it, or a full stop before it, means grammar put the
    // capital there rather than the writer.
    if (!lead || /[.!?]$/.test(lead)) continue;
    out.add(m[2].toLowerCase());
  }
  return out;
};
const MAX_PROPER_WORDS = 3;      // "Nørresundby", "Copenhagen Airport", "Sankt Hans Torv"

export const relativeAnswerIn = (turn, today = new Date()) => {
  const raw = String(turn || "");
  const rel = relativeDayIn(raw, today);
  if (!rel || !rel.matched) return null;
  let rest = raw.toLowerCase().replace(rel.matched.toLowerCase(), " ");
  rest = rest.replace(/\b\d{1,2}\s*(?:-|–|to)?\s*(?:days?|dage?|weeks?|uger?)\b/gi, " ");
  rest = rest.replace(/(?:^|[^\wÆØÅæøå])(?:én|en|hele|den ene|a|an|one)\s+(?:hel\s+)?(?:uge[nr]?|week)\b/gi, " ");
  // ── AND THE OTHER HALF OF A SPLIT ANSWER ────────────────────────
  // "Maybe next week? Monday" says one thing twice. relativeDayIn reads the day
  // and reports the day; the week phrase is left behind and would count as a
  // person saying something else. Same for "this weekend, Saturday".
  rest = rest.replace(new RegExp(`(?:^|[^${LETTER}])(?:${alt([...NEXT_WEEK, ...THIS_WEEKEND])})(?![${LETTER}])`, "gi"), " ");
  // And the little words a day name carries, which say nothing on their own.
  rest = rest.replace(new RegExp(`(?:^|[^${LETTER}])(?:${alt(WEEKDAY_LEAD)})(?![${LETTER}])`, "gi"), " ");
  // A day NAME is always part of a date answer and never something else the
  // person said, so it is filler here whichever branch above actually matched.
  // "this weekend, saturday" says one thing twice, like the week phrase above.
  rest = rest.replace(new RegExp(`(?:^|[^${LETTER}])(?:${alt(Object.values(WEEKDAYS).flat())})(?![${LETTER}])`, "gi"), " ");
  const words = rest.split(/[^\wÆØÅæøåéèü]+/).filter(Boolean);
  const unknown = words.filter(w => !ANSWER_FILLER.test(w));
  if (!unknown.length) return rel;
  if (STATES_A_DATE(rest)) return null;
  const proper = properNounsIn(raw);
  if (unknown.length > MAX_PROPER_WORDS) return null;
  return unknown.every(w => proper.has(w)) ? rel : null;
};

// ── LATEST ANSWER WINS, AND BOTH READERS USE THIS ONE ───────────────
// A second answer supersedes a first, so the scan runs backwards. One
// definition because tripBrief's readWhen and tripWindow below both need it,
// and two copies of "which turn counts" is how the brief and the event filter
// came to disagree about the same conversation in the first place.
//
// AN ARRAY, NEVER A JOINED STRING. tripWindow's convoText is both halves of
// the conversation with a "role: " prefix on every line, so splitting it here
// would read Gemlyx's own replies as the traveller's answers AND leave the
// word "user" in the residue, which relativeAnswerIn then rejects. A caller
// that has no turns passes none and gets null.
export const latestRelativeAnswer = (turns, today = new Date()) => {
  const list = Array.isArray(turns) ? turns : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const rel = relativeAnswerIn(list[i], today);
    if (rel) return rel;
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
export const tripWindow = ({ arrival, departure, convoText, convoTurns, today = new Date() } = {}) => {
  // ── THE DATES COME FROM THEIR TURNS, NOT FROM OURS ──────────
  //
  // Both callers hand this function `convoText`, which is BOTH halves of the
  // conversation with a role prefix on every line, and both of them carry a
  // comment saying that reading a date out of the app's own words is the
  // mistake to avoid. It was reading them anyway. Measured by a Fable review on
  // 12 Sep against three of Oliver's real exports:
  //
  //   20:43  window 14..17 Sep, from the code-appended re-ask for the dates,
  //          whose own example text is 'the 14th to the 17th'. The app read its
  //          own worked example back as the trip. The brief said 15..22 Sep.
  //          That window excludes 19 and 20 September, which is where the
  //          festival he asked about and did not get on the preview sat.
  //   21:24  window 21..24 Sep, four days, taken from Gemlyx's own "I'll plan
  //          for around 4 days". The traveller had said five.
  //   02:54  window 15..25 Sep, from an echo Gemlyx got wrong and the traveller
  //          corrected to 14..24 in the next turn.
  //
  // `convoTurns` is already the traveller's turns as an array at both call
  // sites, passed in August so a relative answer like "i dag" could be read.
  // Every other read in here is pointed at the same words now. `convoText`
  // stays a parameter because a caller with no turns to give is still better
  // served by a date than by nothing.
  const said = Array.isArray(convoTurns) && convoTurns.length
    ? convoTurns.filter(x => String(x || "").trim()).join("\n")
    : convoText;
  const start = dayStart(arrival);
  const end = dayStart(departure);
  if (start && end && end.getTime() >= start.getTime()) {
    return { start, end, days: daysBetween(start, end), dated: true, source: "intake" };
  }
  // ── A STATED RANGE BEATS A COUNTED ONE ──────────────────
  // Both ends said out loud, so neither is derived from the other. Before
  // 12 Sep this function could only build a window from one date plus a spoken
  // day count, and a traveller who gave two dates and no count got the lone
  // date branch below: a window one day wide, on what was often their
  // departure. See dateRangeIn.
  const stated = dateRangeIn(said, today);
  if (stated) {
    return { start: stated.start, end: stated.end, days: daysBetween(stated.start, stated.end), dated: true, source: "conversation" };
  }
  const spoken = dayCountIn(said);
  const from = dayStart(arrivalDateIn(said, today));
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
  const month = monthOnlyIn(said, today);
  if (month) {
    return { start: month.start, end: month.end, days: spoken || null, dated: true, source: "conversation", precision: "month" };
  }
  // ── AND "I DAG", WHICH IS WHAT HIS FATHER SAID ──────────────────
  //
  // 22 Aug 2026 taught the trip BRIEF to read a relative day, in six
  // languages, and stopped there. This function feeds the event filter, and it
  // was still reading only a written date and a bare month, so his father's
  // conversation left the brief saying "I know when you are here" while the
  // event window said `dated: false` and could not rule out a festival in a
  // different month. Two parts of one screen disagreeing about one trip, which
  // is the failure this codebase keeps naming, made WIDER by the six-language
  // work rather than narrower.
  //
  // Last, after the month, and through the same latestRelativeAnswer the brief
  // calls, so the precedence cannot drift: a stated month beats "I will
  // confirm tomorrow", and a stated date beats both.
  const rel = latestRelativeAnswer(convoTurns, today);
  if (rel && rel.start) {
    // The length they spoke, if they spoke one. "i dag" plus "7 dage" is a
    // whole window; "i dag" alone anchors the month and nothing more.
    if (spoken) {
      return { start: rel.start, end: new Date(rel.start.getTime() + (spoken - 1) * MS_DAY),
               days: spoken, dated: true, source: "conversation", precision: "day" };
    }
    // A weekend is the one relative answer that carries its own end.
    if (rel.end) {
      return { start: rel.start, end: rel.end, days: daysBetween(rel.start, rel.end),
               dated: true, source: "conversation", precision: "day" };
    }
    return { start: rel.start, end: rel.start, days: null, dated: true, source: "conversation", precision: "day" };
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
  // Through eventLastDay rather than an inline comparison, because this was one
  // of four readers making the same call and two of them were making it wrong.
  return { start, end: eventLastDay(e?.date, e?.dateEnd) || start };
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

// ── TWO DATES IN ONE SENTENCE IS A TRIP LENGTH ──────────────────────
//
// Oliver's own test brief, 25 Aug 2026, first sentence:
//
//   "We're flying into Billund on Thursday 8 October 2026, landing 14:25, and
//    out of Aalborg on Monday the 12th at 11:00."
//
// The chat report he exported: `days` — a BLOCKING slot — empty, and the next
// question Gemlyx would have asked him is "How many days have you got?" He had
// answered it in his opening sentence, twice over.
//
// arrivalDateIn reads the FIRST date and stops. readDays then looks for a spoken
// count ("four days") and for the intake date pickers, and finds neither, so a
// brief that states its own start and end to the minute cannot produce a length.
//
// The second date is the hard half, because of how people write it: "out of
// Aalborg on Monday the 12th" carries a day number and NO MONTH. A bare "the
// 12th" is only a date at all because the sentence before it named October, so
// it is resolved against the start rather than guessed at — and when there is no
// start to resolve against, it stays null instead of picking a month.
const LEAVING = /\b(?:out|leaving|leave|departing|depart|departure|fly(?:ing)? (?:out|home|back)|back (?:home|on)|home on|返|hjem|afrejse|rejser hjem|tilbage)\b/i;
// A day number with an ordinal suffix, or a plain one after "the".
const BARE_DAY = /\bthe\s+(\d{1,2})(?:st|nd|rd|th)?\b|\b(\d{1,2})(?:st|nd|rd|th)\b/i;

export const departureDateIn = (text, start) => {
  const t = String(text || "");
  if (!start || !(start instanceof Date) || !Number.isFinite(start.getTime())) return null;
  // Only look at the part of the sentence AFTER the leaving word: "in on the 8th
  // and out on the 12th" has both numbers, and taking the first one back would
  // report a trip that ends before it begins.
  const at = t.search(LEAVING);
  if (at < 0) return null;
  // ── AND ONLY WITHIN THE SAME SENTENCE ─────────────────────────────
  // "flying out eventually. The Christmas market on the 6th is lovely." has a
  // leaving word and a day number, and they are about different things. Taking
  // the tail of the whole text let any later date in the conversation become a
  // departure, and an invented trip length is worse than no trip length. The
  // 31-day cap below caught the far cases and this catches the near ones.
  const tail = t.slice(at).split(/(?<=[.!?])\s+/)[0] || "";

  // A full date wins outright — it names its own month and needs no resolving.
  const full = tail.match(DATE_RE);
  if (full) {
    const day = parseInt(full[1] || full[4], 10);
    const monthIdx = MONTH_NAMES[(full[2] || full[3]).toLowerCase()];
    if (day >= 1 && day <= 31 && monthIdx !== undefined) {
      let d = new Date(start.getFullYear(), monthIdx, day);
      // December in, January out: the year rolls, and a trip that appears to end
      // before it starts is the tell.
      if (d < start) d = new Date(start.getFullYear() + 1, monthIdx, day);
      return d;
    }
  }

  // A bare day number, resolved against the start's month. Rolls to the next
  // month when the number is smaller, because "in on the 29th, out on the 2nd"
  // is a trip across a month end and not a trip backwards in time.
  const bare = tail.match(BARE_DAY);
  if (!bare) return null;
  const day = parseInt(bare[1] || bare[2], 10);
  if (!(day >= 1 && day <= 31)) return null;
  let d = new Date(start.getFullYear(), start.getMonth(), day);
  if (d.getDate() !== day) return null;          // the 31st of a 30-day month
  if (d < start) d = new Date(start.getFullYear(), start.getMonth() + 1, day);
  // A "departure" more than a month out is not this sentence's second date. It is
  // some other date that happened to follow the word, and a length invented from
  // it would be worse than no length.
  const span = Math.round((d - start) / 86400000);
  return span >= 0 && span <= 31 ? d : null;
};
