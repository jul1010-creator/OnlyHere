// ── "IT'S FOR JUNE 2026" ────────────────────────────────────────────
//
// Oliver, 9 Aug 2026: "So I searched up Copenhell.. and I have done the draft..
// but it's for June 2026."
//
// Copenhell 2026 ran in June 2026. Today is August. The draft is correct and
// completely useless, and those two facts together are the whole problem.
//
// Nothing in the pipeline is lying. The research asked for "the dates" of
// Copenhell, and the most findable dates for any annual festival in August are
// the ones from the edition that just finished: that is what the official site
// still shows, what the news wrote about, and what the aggregators ranked. The
// writer wrote what it was given. The draft passed the fact-check, because every
// date in it is real.
//
// And then the page filters it out. Every events grid runs isUpcoming, so an
// entry with a past date is published, correct, and invisible. He spent a draft
// on something no visitor can ever see, and nothing told him.
//
// ── SO THE QUESTION IS NOT "IS THIS DATE REAL" ──────────────────────
// It is "is this date USEFUL", and that is a different check that nothing was
// doing. A past date on a recurring festival is not an error to correct, it is
// the wrong edition to have researched.
//
// Two halves, and both are needed:
//   in the prompt   ask for the NEXT edition, and say what to do when next
//                   year's dates are not announced yet, which in August is the
//                   normal case for a June festival
//   in code         refuse to let a past date reach publish quietly

// daCompare, not localeCompare: Æ, Ø and Å sort after Z in Danish, and the name
// tie-break below is on a page about Denmark.
import { daCompare } from "./helpers";
import { dayStart } from "./calendarDay";

const clean = (v) => String(v == null ? "" : v).trim();

// Tolerant on purpose: drafts store "2026-06-17", "17 June 2026", "June 2026".
// Returns null rather than a guess, because an unparseable date must not be
// treated as either past or future.
// ── AND THE TWO FORMATS LANDED ON DIFFERENT DAYS ────────────────────
//
// `new Date("2026-09-01")` is UTC midnight. `new Date("1 September 2026")` is
// LOCAL midnight. That is the ECMAScript spec, not a quirk: the date-only ISO
// form is defined as UTC and every other form as local. Both are stored in this
// database, because the drafts write both, and everything downstream then reads
// them back in local time.
//
// Measured, on a reader in New York, on 15 August 2026:
//
//   eventMonthShort("2026-09-01")        "Aug"      <- a September festival
//   eventMonthShort("1 September 2026")  "Sep"         filed under August
//   isPastDate("2026-08-15", today)      true       <- today's event, finished
//
// The public Events tab builds its month chips and its month filter from
// eventMonthShort, so for a visitor west of Greenwich a 1 September festival is
// listed under Aug and is MISSING from Sep, which is the month they are
// searching. Denmark is east of it and never saw this.
//
// And it is not only the Americas. Two rows storing the same day in the two
// supported formats are two hours apart even in Copenhagen, so byEventDate
// orders them by a difference that does not exist.
//
// The fix is to read the ISO form as a local date, matching the worded form,
// because none of these values is a moment in time. "2026-09-01" is a day on a
// calendar; the day a festival opens is the same day whatever timezone the
// reader is sitting in.
// ── AND THE SAME BUG WAS IN helpers.js TOO ──────────────────────────
// This was fixed here on 15 August and found again on the 16th in
// isCurrentlyLive, which had its own copy of new Date(isoString) and its own
// version of the consequences. The reading of a calendar day now lives in one
// place, utils/calendarDay.js, which both files import. It is in a file of its
// own rather than here because helpers.js needs it and eventDates.js already
// imports daCompare from helpers.js, so either direction would be a cycle.
export const parseEventDate = (v) => dayStart(clean(v));

// ── "HOW IS THIS 'BY NAME'" ─────────────────────────────────────────
//
// Oliver, 15 Aug 2026, on the Events tab with the order set and the list in no
// order at all: October above August, June below September.
//
// The list was sorted with `new Date(a.date) - new Date(b.date)`, and the
// evidence was already in his own screenshot before anybody read a line of
// code. The month chips said: All 14, Jun 1, Jul 1, Aug 2, Sep 4, Oct 1. Those
// add up to NINE. Five of the fourteen events are in no month at all, which
// means new Date() cannot parse their date field.
//
// AND ONE OF THOSE BREAKS THE WHOLE LIST, not just its own position. Subtracting
// two Invalid Dates gives NaN, a comparator that returns NaN is inconsistent,
// and V8 does not respond to that by leaving one row out of place: the ordering
// it produces is arbitrary. Measured on fourteen rows with five unparseable:
//
//   as shipped   Aug19 Sep04 UNDATED Jun06 Jul03 Aug30 Sep05 ... Oct12 UNDATED…
//   fixed        Jun06 Jul03 Aug19 Aug30 Sep04 Sep05 Sep12 Sep19 Oct12 UNDATED…
//
// So one dateless row scrambles thirteen good ones. That is why the page can
// look unsorted under a control that says it is sorted, and why "by date" and
// "by name" both looked wrong: the date sort was not producing an order to
// disagree with.
//
// parseEventDate has returned null for an unparseable date since it was
// written, three functions up, and this comparator never called it. Same shape
// as the four holes in previewMatch: the helper existed, the site that needed
// it did not use it.
export const eventTime = (v) => {
  const d = parseEventDate(v);
  return d ? d.getTime() : null;
};

// Undated LAST and never NaN. Last rather than first because a row with no date
// is a row nobody can plan around, and by the project's own publish gate it
// should not exist at all: "An event must NEVER be published without a date."
// It stays visible so it can be found and fixed rather than hidden.
export const byEventDate = (a, b) => {
  const x = eventTime(a?.date), y = eventTime(b?.date);
  if (x === null && y === null) return daCompare(a?.name, b?.name);
  if (x === null) return 1;
  if (y === null) return -1;
  // Danish name as the tie-break, so two events on one day do not swap places
  // between renders. An order that reshuffles is not an order.
  return x - y || daCompare(a?.name, b?.name);
};

// ── AND THE MONTH CHIPS HAVE TO ADD UP ──────────────────────────────
// The same five rows fall out of every month bucket, so "All 14" sat above
// chips totalling 9 and nothing said where the other five went. A filter whose
// parts do not sum to its whole is telling the reader the list is smaller than
// it is. Returns "" for an unparseable date, and the caller gives those their
// own chip rather than dropping them.
export const UNDATED = "Undated";

export const eventMonthShort = (v) => {
  const d = parseEventDate(v);
  return d ? d.toLocaleString("en", { month: "short" }) : "";
};

// ── AN EVENT IS IN EVERY MONTH IT RUNS IN ───────────────────────────
//
// Oliver, 19 Aug 2026, looking at the Date filter on the Events page: "please..
// expand event dates for all dates. You got several dates missing."
//
// The month facet bucketed an event by eventMonthShort(e.date), which reads the
// FIRST DAY and nothing else. So a festival running 30 July to 2 August was
// filed under Jul alone, and a reader filtering August did not see it, on the
// days it was actually running. The end date has been on the shape the whole
// time and the facet never read it.
//
// This is the same fault as the month buckets he reported on 15 August, where
// five events were in no bucket at all: a filter whose parts do not sum to its
// whole tells the reader the list is smaller than it is. That one was about rows
// falling out; this one is about rows appearing in one place when they belong in
// two.
//
// THE CAP IS NOT DEFENSIVE PADDING. Both ends come from stored content, and a
// dateEnd earlier than date, or a typo putting the year in 2126, would spin this
// loop until the tab died. Twelve months is longer than any real festival and
// the wrong answer is one bucket, not a hung page. An end before the start is
// treated as no end at all, which is what a single bad field should cost.
export const MAX_EVENT_MONTHS = 12;

export const eventMonthsShort = (start, end) => {
  const a = parseEventDate(start);
  if (!a) return [];
  const b = parseEventDate(end);
  const first = a.toLocaleString("en", { month: "short" });
  if (!b || b.getTime() < a.getTime()) return [first];
  const out = [];
  const cur = new Date(a.getFullYear(), a.getMonth(), 1);
  const last = new Date(b.getFullYear(), b.getMonth(), 1);
  while (cur.getTime() <= last.getTime() && out.length < MAX_EVENT_MONTHS) {
    out.push(cur.toLocaleString("en", { month: "short" }));
    cur.setMonth(cur.getMonth() + 1);
  }
  // NOT DEDUPED, AND THAT IS NOT AN OVERSIGHT. The first version ended
  // `[...new Set(out)]` against a January-to-January event listing Jan twice.
  // Mutation testing then killed the cap and the dedupe with the same stone: at
  // twelve months the loop cannot reach a repeat, so the Set removed nothing and
  // the cap made it unreachable. Two guards for one hazard, each hiding whether
  // the other worked. The cap stays because it bounds the loop on a typo'd year;
  // the Set is gone because it could not fire.
  return out;
};

// Reads the row rather than two loose arguments, so a caller cannot pass the
// start and forget the end, which is exactly how the facet came to read one
// field. Both spellings of the end field, because the published shape uses
// dateEnd and the raw draft uses the same, but a town row carries neither.
export const eventMonths = (e) => eventMonthsShort(e?.date ?? e?.dateStart, e?.dateEnd);

// ── A PROPOSED DATE THAT GOES BACKWARDS IS NOT A CORRECTION ─────────
//
// Oliver, 19 Aug 2026, running the event check and then searching the festival
// himself. The panel said:
//
//   Rock under broen, Middelfart
//   Date on file: 2027-06-11  ->  possibly now: 2026-06-12
//
// The operator's own site is titled "Rock Under Broen 2027". The date on file
// was RIGHT, and the check proposed replacing it with a date in the past.
//
// That is the most expensive kind of wrong this panel can be. A checker that
// misses a change costs an out-of-date row; a checker that proposes a wrong
// change costs the row that was correct, and it spends his attention arguing
// with him about a fact he had already got right. His own standing rule covers
// it: before correcting one of his facts, verify it is actually wrong.
//
// TWO REFUSALS, AND NEITHER NEEDS A MODEL TO ADJUDICATE.
//
//   In the past.   An event checker exists to find the NEXT edition. A proposal
//                  earlier than today is not one, whatever the page it came from
//                  said, and the most likely explanation is that the model read
//                  last year's listing, which is exactly what EXISTENCE_RULE
//                  warns about in the drafting prompt and nothing enforced here.
//   Backwards.     An annual event's next edition is later than the one on file
//                  or the same. A proposal that moves it earlier is reading an
//                  older page than the one already believed.
//
// Returns a REASON rather than a boolean, so the panel can say why it ignored
// something instead of quietly dropping it. A silent refusal here would be the
// same fault as the silent slice on the review screen: he would have no way to
// tell a checked event from an unchecked one.
export const datePropositionProblem = (proposed, onFile, today, { labelled = false } = {}) => {
  const next = parseEventDate(proposed);
  if (!next) return "unreadable";
  const now = parseEventDate(today) || (today instanceof Date ? today : null);
  if (now && next.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    return "in-the-past";
  }
  const have = parseEventDate(onFile);
  if (have && next.getTime() < have.getTime()) return "earlier-than-the-one-on-file";
  // ── AN ANNUAL FESTIVAL KEEPS ITS SLOT IN THE YEAR ─────────────────
  //
  // Oliver, 20 Aug 2026, on a run that fixed two events and broke two others:
  // Skanderborg Festival, on file as 2026-08-02, proposed as 2026-11-04, read
  // off smukfest.dk. Smukfest is the first week of August and has been for forty
  // years. A November date is not that festival moving; it is some other dated
  // thing on the same page.
  //
  // So a proposal that lands in a different month from the one on file has to be
  // LABELLED as the event's dates on the page it came from. A site announcing a
  // genuine move says so in words: "Datoer", "afholdes", "finder sted". A number
  // scraped from a programme grid says nothing at all, and that is the difference
  // between a change and a coincidence.
  //
  // Only ever applies when there IS a date on file. An undated event has no slot
  // to keep, which is the whole reason it is being looked up.
  if (have && !labelled && (next.getMonth() !== have.getMonth() || next.getFullYear() - have.getFullYear() > 1)) {
    return "a-different-month-from-the-one-on-file";
  }
  return "";
};

export const DATE_PROPOSITION_WHY = {
  "unreadable": "the suggested date could not be read as a date",
  "in-the-past": "the suggested date is in the past, so it is not the next edition",
  "earlier-than-the-one-on-file": "the suggested date is earlier than the one already on file, which means it came from an older page",
  "a-different-month-from-the-one-on-file": "the suggested date is in a different month from the one on file and the page never says it is the event's own date, so it is far more likely to be another date printed on the same page",
};

export const isUndated = (v) => parseEventDate(v) === null;

// `today` is always passed in. A date helper that reads the clock cannot be
// tested against a fixed calendar, and this one has to be: the whole point is
// what it says on a specific day of the year.
export const isPastDate = (v, today) => {
  const d = parseEventDate(v);
  if (!d || !today) return false;
  // The END of the day it names, so an event happening today is not past.
  return d.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
};

// The edition a visitor is actually looking for. In August, a June festival's
// next edition is next year's.
// A TERNARY WHOSE TWO BRANCHES WERE THE SAME (found 12 Aug). It read:
//
//     today.getFullYear() + (d.getMonth() < today.getMonth() ? 1 : 1)
//
// Somebody wrote the condition that matters and then answered it identically
// both ways, so this always said "next year" no matter what it was given. It
// is right for the common case, a festival whose edition finished earlier this
// same year, which is why it survived: Copenhell ran in June, we are in August,
// and 2027 is correct. It is wrong for any row whose stored date is more than a
// year stale, and those are exactly the rows nobody has looked at. A September
// 2025 festival, read in August 2026, was told its next edition is 2027 when
// the real one is a month away.
//
// The next edition falls on the same month and day. If that has already gone by
// this year it is next year, and if it is still ahead it is this year.
export const nextEditionYear = (v, today) => {
  const d = parseEventDate(v);
  if (!d || !today) return null;
  if (!isPastDate(v, today)) return d.getFullYear();
  const year = today.getFullYear();
  const sameDayThisYear = new Date(year, d.getMonth(), d.getDate());
  const midnightToday = new Date(year, today.getMonth(), today.getDate());
  return sameDayThisYear >= midnightToday ? year : year + 1;
};

// ── WHAT IS WRONG WITH THIS DATE, IN PLAIN WORDS ────────────────────
// Phrased for a founder looking at a finished draft, and phrased to say the
// thing that is genuinely surprising: the entry is not wrong, it is invisible.
export const eventDateIssues = (entry, today) => {
  const out = [];
  const start = clean(entry?.date || entry?.dateStart);
  const end = clean(entry?.dateEnd);
  if (!start) {
    out.push("No date at all, so this never appears in the events list, which only shows upcoming ones.");
    return out;
  }
  if (!parseEventDate(start)) {
    out.push(`The start date cannot be read as a date: "${start}".`);
    return out;
  }
  // The end date is what decides whether a multi-day festival is over.
  const last = end && parseEventDate(end) ? end : start;
  if (isPastDate(last, today)) {
    const year = nextEditionYear(start, today);
    out.push(`This edition has already finished. The entry is correct and INVISIBLE: every events grid shows upcoming events only, so no visitor will ever see it. If this is an annual festival, the entry wants the ${year} dates.`);
  }
  if (end && parseEventDate(end) && parseEventDate(start) && parseEventDate(end) < parseEventDate(start)) {
    out.push("The end date is before the start date.");
  }
  return out;
};

// Published rows whose dates have run out, for the audit. Separate from the
// draft-time check because these are already live and already invisible, and
// the number is the thing worth seeing.
export const staleEvents = (rows, today) =>
  (Array.isArray(rows) ? rows : []).filter(r => {
    const p = r?.payload || r;
    const last = clean(p?.dateEnd) || clean(p?.date);
    return !!last && isPastDate(last, today);
  });

// ── "REMOVE ANYTHING 2026.. IT'S SILLY I CAN SEARCH FOR THAT" ───────
// Oliver, 9 Aug 2026, looking at five Discover candidates, two of which finished
// in June. He is right that offering them is silly, and the reason they are
// there is the same as the Copenhell one: in August, the search results about an
// annual festival are about the edition that just ended.
//
// The candidate list has no date field. It has a one-sentence hook written by
// the extractor, and the date is sitting inside it in prose: "Held 27-28 June
// 2026", "from 11-13 June 2026", "spans 8-16 August".
//
// DROPS ONLY ON CONFIDENCE, and the asymmetry is deliberate. A candidate wrongly
// dropped is a real event he never hears about. A candidate wrongly kept is one
// line on a screen he is already reading. So an unparseable hook is KEPT, and
// nothing is dropped without a month and a year.
// ── AND THE MONTH TABLE THAT DROPPED EVERY DANISH CHRISTMAS MARKET ──
// Found 13 Aug 2026 while scouting for bugs, not reported by anyone, because
// this failure removes a line from a list and nothing is left behind to look at.
//
// The table was twelve ENGLISH month names matched on their first three letters
// with an open tail, `\bjul[a-z]*\b`. That was a trick to read Danish pages for
// free and ten of the twelve do fall out by accident: "jan" catches "januar",
// "feb" catches "februar", "aug" catches "august". Only maj and oktober are
// missed, and a miss is the harmless direction here.
//
// What is not harmless is what an open tail matches BESIDES a month:
//
//     jul[a-z]*   ->  julemarked, julemarkeder, julefrokost, juletraesfest
//     mar[a-z]*   ->  marked, markedet, and English "market" too
//
// "Jul" is Danish for Christmas and "marked" is Danish for market, so on a
// Danish travel site those two prefixes match the name of an entire category of
// event. And the month was picked with `.find` over an array in CALENDAR order,
// so whenever a string named two months the earlier one won regardless of which
// one the sentence was about:
//
//     "Et af Danmarks stoerste julemarkeder, december 2026"
//        julemarkeder matched july; july beat december because july is
//        earlier in the array; no day number, so "the whole of July, over
//        on the 31st"  ->  DROPPED as an event that already happened
//
// A Christmas market, stating December in its own sentence, silently removed
// from the tab he uses to find events. The comment above says why that is the
// expensive direction: a candidate wrongly dropped is a real event he never
// hears about.
//
// So EXACT names now, Danish and English, never a prefix with an open tail.
// Exactness alone also fixes "Augustenborg" reading as August and "Marked"
// reading as March, because a boundary is required at the END as well.
//
// ONE CARVE-OUT, and it is the whole reason this bug existed: bare "jul" is not
// accepted as July, because in Danish it is Christmas and "Jul i Tivoli" is a
// real event. "juli", "july" and the abbreviation "jul." are all still read as
// the month, since a full stop is what marks it as an abbreviation.
//
// factCheckRead.js keeps a month table of its own and that is deliberate rather
// than the duplication defect this codebase keeps hitting. This one carries
// abbreviations and is zero-based for Date(); that one is 1-based and must stay
// strict, because there a loose match CONFIRMS a date rather than hiding a
// candidate. Same words, opposite risk, so they must not be merged.
const MONTH_WORDS = [
  "januar|january|jan",
  "februar|february|feb",
  "marts|march|mar",
  "april|apr",
  "maj|may",
  "juni|june|jun",
  "juli|july|jul(?=\\.)",
  "august|aug",
  "september|sept|sep",
  "oktober|october|okt|oct",
  "november|nov",
  "december|dec",
];
// Longest spelling first in each alternation, so the full name is tried before
// its own abbreviation.
const MONTH_RE = MONTH_WORDS.map((alts, i) => [new RegExp(`\\b(?:${alts})\\b`, "i"), i]);

// ── WHICH MONTHS DOES A PIECE OF TEXT NAME ──────────────────────────
//
// Oliver, 16 August 2026: "In Studio, I'd like to be able to search for events
// specifically happening in a specific month. Like, right now, it's filled with
// events in August."
//
// Of course it is. It is the 16th of August, the search returns what is current,
// and splitFinishedCandidates correctly drops what has ended. So discovery can
// only ever find the next few weeks, and the Christmas markets, the February
// light festivals and the whole spring are unreachable from a button that is
// pressed in August.
//
// Reads MONTH_RE, the table already in this file, rather than a second list of
// month spellings. The one above it is 1-based and strict on purpose and these
// two must not be merged, which is written down there; a THIRD copy for a filter
// is exactly the drift that comment is warning about.
//
// Returns every month named, not the first, because a candidate's own words are
// often a range: "late November to 23 December" names both, and a December run
// should not be refused for having started in November.
export const monthsInText = (text) => {
  const t = String(text || "");
  if (!t.trim()) return [];
  const found = [];
  for (const [re, monthIndex] of MONTH_RE) {
    if (re.test(t)) found.push(monthIndex);
  }
  return found.sort((a, b) => a - b);
};

// The LAST day the text mentions for that month, because a festival is over when
// it ends. "8-16 August 2026" is not finished on the 9th.
export const lastDateInText = (text) => {
  const t = String(text || "");
  // The month that appears FIRST IN THE TEXT, not the earliest in the calendar.
  let best = null;
  for (const [re, monthIndex] of MONTH_RE) {
    const at = t.search(re);
    if (at >= 0 && (best === null || at < best.at)) best = { at, re, monthIndex };
  }
  if (!best) return null;
  const { at, re, monthIndex } = best;
  const year = (t.slice(at).match(/\b(20\d{2})\b/) || t.match(/\b(20\d{2})\b/) || [])[1];
  if (!year) return null;
  // Any day numbers immediately before the month name, which is how both
  // "27-28 June" and "8 June" are written. A four-digit run is blanked first:
  // "Copenhell 2026, august" was reading the 26 out of the year and calling it
  // the 26th, which is a day this event may already be past.
  const before = t.slice(Math.max(0, at - 14), at).replace(/\d{4}/g, " ");
  const days = (before.match(/\d{1,2}/g) || []).map(Number).filter(d => d >= 1 && d <= 31);
  // No day at all means the whole month, which is only finished once it is over.
  if (!days.length) return new Date(Number(year), monthIndex + 1, 0);
  return new Date(Number(year), monthIndex, Math.max(...days));
};

export const looksFinished = (text, today) => {
  const d = lastDateInText(text);
  if (!d || !today) return false;
  return d.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
};

// Candidates whose stated edition has already run. Returns both halves, because
// the panel has to say how many it removed and why rather than quietly showing
// a shorter list.
export const splitFinishedCandidates = (candidates, today) => {
  const kept = [], dropped = [];
  for (const c of Array.isArray(candidates) ? candidates : []) {
    (looksFinished(`${c?.hook || ""} ${c?.name || ""}`, today) ? dropped : kept).push(c);
  }
  return { kept, dropped };
};

// ── FINDING AN EDITION IN A PAGE, WHICH IS THE OTHER HALF ───────────
//
// Oliver, 19 Aug 2026: "You need to make it Deeply try to find the event date of
// unconfirmed dates. I refuse to have distortion.. one of the most popular
// festivals of Denmark, being shown as unknown date.. my product will not sell."
//
// He is right, and the reason it never found one is not that the search was
// shallow. It is that the check asked the wrong question. For an event with no
// date on file the prompt said "Currently on file: date unknown" and then asked
// "has the date actually CHANGED from what's on file". Nothing changed, because
// there was nothing to change from, so the honest answer was an empty field and
// the row stayed unknown forever. "Did it move" and "when is it" are different
// questions and only the first was ever asked.
//
// This is the reading half: given the text of a page, what edition does it name.
// It runs over the operator's own site and the ticket page, which is where the
// answer actually is, rather than over a model's summary of them.
//
// ── THE FORM DANISH TICKET PAGES ACTUALLY USE ───────────────────────
// Rock Under Broen's own ticket page states its dates as "11.06.27-12.06.27".
// No month name anywhere, so MONTH_RE and lastDateInText below cannot see it,
// and neither could anything else in this repo. That format is everywhere on
// Danish ticketing and it is dd.mm.yy, never mm.dd.yy: 11.06.27 is the 11th of
// June, and reading it the American way gives the 6th of November, which is a
// real date in the right year and therefore the kind of wrong nobody catches.
const DK_NUMERIC = /\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})\b/g;
const fullYear = (y) => { const n = Number(y); return n >= 100 ? n : 2000 + n; };

// A day range against one month name: "11.-12. juni 2027", "27-28 June 2026".
// EVERY DASH A DESIGNER MIGHT USE. Distortion's own poster reads "2-6 JUNE
// 2027" with an EN dash, Rock Under Broen uses a hyphen, and an em dash turns up
// in copy written in Word. The first version of this listed the hyphen and the
// en dash and silently read an em-dashed range as a single date, which is the
// end of the festival presented as the whole of it.
const DASHES = "\\u002d\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015";
const DAY_RANGE = new RegExp(`\\b(\\d{1,2})\\s*[.]?\\s*(?:[${DASHES}]|til|to)\\s*(\\d{1,2})\\s*[.]?\\s*(?:${MONTH_WORDS.map(a => a).join("|")})\\b[^0-9]{0,12}((?:19|20)\\d{2})`, "gi");

export const dateRangesInText = (text) => {
  const t = String(text || "");
  const out = [];
  // 1. The numeric pairs, taken two at a time when they sit next to each other.
  const nums = [...t.matchAll(DK_NUMERIC)].map(m => ({
    at: m.index,
    d: Number(m[1]), mo: Number(m[2]), y: fullYear(m[3]),
    raw: m[0],
  })).filter(x => x.d >= 1 && x.d <= 31 && x.mo >= 1 && x.mo <= 12);
  for (let i = 0; i < nums.length; i++) {
    const a = nums[i], b = nums[i + 1];
    const start = new Date(a.y, a.mo - 1, a.d);
    // A second numeric date within a few characters is the other end of a range.
    // Further away it is a different fact on the page and not this event's end.
    const near = b && b.at - (a.at + a.raw.length) <= 3;
    const end = near ? new Date(b.y, b.mo - 1, b.d) : null;
    if (end && end.getTime() >= start.getTime()) { out.push({ start, end, via: "numeric", at: a.at }); i++; }
    else out.push({ start, end: start, via: "numeric", at: a.at });
  }
  // 2. A day range against a month name, which is how a festival writes it in
  //    prose. EVERY one of them, not the first.
  //
  //    This was `t.match(DAY_RANGE)` on a non-global regex, which returns the
  //    FIRST match and stops. A festival page that opens with last year's recap
  //    and states this year's dates further down therefore lost the real answer
  //    to the recap, every time, and the loss was invisible: one date came back
  //    and it looked like the only one on the page. Found 20 Aug 2026 while
  //    writing a fixture for the Distortion page, which is exactly that shape:
  //    "Distortion 3-7 June 2026 was the last one ... Dates: 2-6 June 2027".
  DAY_RANGE.lastIndex = 0;
  for (const m of t.matchAll(DAY_RANGE)) {
    const monthIdx = MONTH_RE.findIndex(([re]) => re.test(m[0]));
    if (monthIdx < 0) continue;
    const y = Number(m[3]);
    const d1 = Number(m[1]), d2 = Number(m[2]);
    if (d1 < 1 || d1 > 31 || d2 < 1 || d2 > 31) continue;
    out.push({ start: new Date(y, monthIdx, Math.min(d1, d2)), end: new Date(y, monthIdx, Math.max(d1, d2)), via: "month-name", at: m.index });
  }
  // 3. And the single date lastDateInText already knows how to read, which
  //    covers "8 June 2026" and the bare-month case. Reused rather than
  //    re-parsed: a seventh date parser in this repo is how they disagree.
  // at: -1, because lastDateInText answers WHICH date and not WHERE, and an
  // invented position would let the anchoring below treat a date it cannot
  // locate as if it had been found beside a label.
  const single = lastDateInText(t);
  if (single) out.push({ start: single, end: single, via: "single", at: -1 });
  return out;
};

// THE NEXT ONE, not the first one found. A festival's page carries its history:
// last year's recap, the year before's photos, and the edition being sold. Only
// one of those is a date a traveller can go to, and it is the earliest that has
// not already finished.
export const nextEdition = (text, today) => {
  const now = parseEventDate(today) || (today instanceof Date ? today : null);
  const floor = now ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() : -Infinity;
  const future = dateRangesInText(text)
    .filter(r => r.end.getTime() >= floor)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  return future[0] || null;
};

// ISO, because that is what the rest of the pipeline stores and compares.
export const isoDay = (d) => d instanceof Date && !isNaN(d)
  ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  : "";

// ── SAYING WHICH STEP ENDED THE CHAIN ───────────────────────────────
//
// The date check now has four tiers: the operator's own page, its ticket page,
// the poster on either of them, and a web search. It reports one sentence for
// all four, "Nothing changed. Everything checked still matches what is on
// file.", and Oliver has read that sentence three times on runs where the event
// he was watching came out still saying "Dates not confirmed".
//
// That sentence is true and it is useless. It reports the OUTCOME of a chain
// without naming the step that ended it, so a page with no date on it, a page
// that could not be reached, and a date that was found and refused for being in
// the past are all reported identically: as nothing.
//
// Pure and here rather than inline in the panel, because it is the wording of a
// claim about what was checked, and this codebase has already been bitten by a
// sentence that said more than the code had measured.
export const CHECK_STEP_WORDS = {
  "no-website-on-file": "no website is stored on this entry, so there was nothing of its own to read",
  "no-ticket-link": "its page carried no ticket link to follow",
  "no-date-in-text": "the page was read and states no date a parser can see",
  // NOT "nothing found". On a venue's concert calendar there was plenty found
  // and none of it was this event, and reporting that as an empty page sends
  // somebody to check a site that is working perfectly.
  "many-dates-none-labelled": "the page lists several future dates and never says which one is this event's, so none of them was used",
  "no-text": "the page returned almost no readable text",
  "unreadable": "the page could not be read",
  // NOT A PAGE PROBLEM AT ALL. This one is our own endpoint refusing the request
  // before any site was contacted, and it was being reported as a broken
  // festival website on forty rows at once. The status and the endpoint's own
  // words are appended by stepWords, because "403" and "401" point at two
  // completely different fixes and neither of them is the festival's.
  "endpoint-refused": "Gemlyx's own reader refused the request, so the site was never contacted",
  "challenge-page": "the site answered with a bot wall rather than the page",
  "almost-no-text": "the page returned almost no readable text, which on a festival front page usually means the dates are in the artwork",
  "no-banner-to-scan": "there was no banner or poster on the page to scan",
  "no-date-printed": "the poster was read and has no date printed on it",
  "image-cap-reached": "the poster reader had already used its budget for this run",
  "image-empty": "the poster reader came back with nothing",
  "image-unreachable": "the poster reader could not be reached",
  "image-not-an-image-url": "the picture had no address that could be opened",
  "search-found-nothing": "a web search found no date it could stand behind",
  "search-failed": "the web search itself failed",
  "search-unreadable": "the web search answered in a shape that could not be read",
};

// A refusal is not a miss and must not read as one. "refused-in-the-past" is the
// tool doing its job on a page that names last year's edition, and it is the
// single most useful line in the whole trace: it says the page WAS read, a date
// WAS found, and here is why it was not used.
export const stepWords = (step) => {
  if (!step || typeof step !== "object") return "";
  const why = String(step.why || "");
  if (step.found) return `found ${step.found}`;
  // ── QUOTE THE DOOR THAT REFUSED US ──────────────────────────────
  // A guard's own sentence is already written for a human and already says what
  // to do: "Your Studio session has expired. Log out and back in." Paraphrasing
  // it into "the page could not be read" is how a one click fix spent an evening
  // looking like forty broken websites.
  if (step.detail) {
    const base = CHECK_STEP_WORDS[why] || (why ? why : "nothing came back");
    return step.status ? `${base} (${step.status}: ${step.detail})` : `${base} (${step.detail})`;
  }
  if (why.startsWith("refused-")) {
    const key = why.slice("refused-".length);
    const because = DATE_PROPOSITION_WHY[key] || key;
    return step.refused ? `found ${step.refused} and refused it, because ${because}` : `found a date and refused it, because ${because}`;
  }
  if (why.startsWith("http-")) return `the page answered ${why.replace("http-", "")}`;
  if (why.startsWith("firecrawl-")) return "the paid reader could not get the page either";
  return CHECK_STEP_WORDS[why] || (why ? why : "nothing came back");
};

export const STEP_LABELS = { site: "Its own site", ticket: "Ticket page", poster: "Poster", search: "Web search" };

// The rows worth showing. An event that came out of the run with a date is not
// a question anybody has; an event still undated or still in the past is the row
// rendering "Dates not confirmed" to a reader right now.
export const unresolvedTraces = (traces, today) =>
  (Array.isArray(traces) ? traces : []).filter(t => !t?.resolved && (isUndated(t?.date) || isPastDate(t?.date, today)));

// ── WHICH OF THE DATES ON THIS PAGE IS THE EVENT'S ──────────────────
//
// Oliver, 20 Aug 2026, on a run that fixed two events and broke two others:
//
//   Sommer på Tobakken, Esbjerg     none        -> 2026-10-29
//   Skanderborg Festival            2026-08-02  -> 2026-11-04
//
// Both read off the operator's own site, and both wrong. A summer season
// proposed for late October, and a festival that has run in the first week of
// August for forty years proposed for November.
//
// nextEdition takes the EARLIEST FUTURE date range anywhere in the text, and on
// these two pages that is not the event. tobakken.dk is a venue: its front page
// is a concert calendar, so the first future date is whoever is playing next.
// smukfest.dk carries a programme, ticket releases and news, all dated. The
// parser was right about every date it found and wrong about which one it was
// looking for, which is the same shape as the unbounded matching this codebase
// has now fixed seven times: a rule that answers "is there one" when the
// question is "is it this one".
//
// His instruction, verbatim: "And don't assume a date. If you have found a
// date, make sure it's actually the right date."
//
// So a page with more than one future date has to SAY which one is the event's,
// and a page with exactly one has nothing to be confused with.

// The words a page uses when it is telling you the event's own dates, in the
// three languages this app reads: Danish, English and German. Ordinary prose
// about a date does not use these; a programme grid never does.
const DATE_LABEL = /(?:datoer?|dato|hvorn[aå]r|afholdes|finder\s+sted|l[oø]ber\s+af\s+stablen|foreg[aå]r|dates?|takes?\s+place|running\s+from|held\s+(?:on|from)|when|termin(?:e)?|findet\s+statt|stattfinden|vom)\W{0,12}$/i;

// How far before a date the label may sit. What actually bounds this is the
// ANCHOR: DATE_LABEL ends in `\W{0,12}$`, so the label word has to sit within a
// dozen punctuation characters of the date and cannot be separated from it by
// any other words. The window only keeps the slice cheap over a long page, and
// widening it changes nothing, which is worth knowing before somebody tunes it
// expecting it to.
export const DATE_LABEL_WINDOW = 40;

// A page with this many future dates is a calendar, whatever else it is.
export const CALENDAR_DATES = 2;

export const labelledAt = (text, at) => {
  if (!Number.isFinite(at) || at < 0) return false;
  const t = String(text || "");
  return DATE_LABEL.test(t.slice(Math.max(0, at - DATE_LABEL_WINDOW), at));
};

// Returns the same shape nextEdition does, plus WHY, because a refusal that
// cannot explain itself is the sentence this whole trace was built to replace.
//
// `onFile` is passed through rather than checked here: one guard, in
// datePropositionProblem, for whoever proposes a date. Two functions refusing
// dates by different rules is exactly the fault above wearing a different hat.
export const anchoredEdition = (text, today) => {
  const t = String(text || "");
  const now = parseEventDate(today) || (today instanceof Date ? today : null);
  const floor = now ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() : -Infinity;
  const future = dateRangesInText(t)
    .filter(r => r.end.getTime() >= floor)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (!future.length) return { found: null, why: "no-date-in-text", labelled: false, candidates: 0 };

  const labelled = future.filter(r => labelledAt(t, r.at));
  // A labelled date wins outright, however many others are on the page. This is
  // the Distortion case: cphdistortion.dk/tickets says "Dates: 2-6 June 2027"
  // in the middle of a page that also carries last year's recap.
  if (labelled.length) return { found: labelled[0], why: "", labelled: true, candidates: future.length };

  // One future date and nothing to confuse it with. Most festival pages.
  if (future.length < CALENDAR_DATES) return { found: future[0], why: "", labelled: false, candidates: 1 };

  // Several, and the page never says which. REFUSED, and the count is carried so
  // the trace can say what it saw rather than "nothing found": on a venue's
  // concert calendar there was plenty found and none of it was this event.
  return { found: null, why: "many-dates-none-labelled", labelled: false, candidates: future.length };
};

// ── AN OFFICE IS NOT WHERE THE FESTIVAL HAPPENS ─────────────────────
//
// Oliver, 20 Aug 2026, with a Danish fact-check of a Copenhagen Cooking draft
// attached, and his own instruction beside it:
//
//   "make OpenAI structure the research so the official website/ticket place,
//    is immediately found. And put in their location. Because places API might
//    be less reliable here. However, MAKE SURE that the location is never the
//    Office.. but the actual event."
//
// What went wrong, in the fact-checker's words: the pipeline read the FOOTER of
// copenhagencooking.dk, found Vigerslev Allé 18, 2500 Valby, and used it as the
// festival's location. That is the secretariat. No public activity happens
// there. Everything downstream then behaved perfectly on a wrong input:
// nearestStation came back "Sjælør Boulevard" and travelTime "15min", both
// correctly measured, both to an office nobody is going to. The real hub is
// Festivalpladsen in Kødbyen, and the real stations are København H and
// Dybbølsbro.
//
// The fact-checker's own summary of why: "Fordi en computeralgoritme ikke
// automatisk ved, at man ikke kan holde en stor madfestival for 80.000
// mennesker inde på et administrativt kontor." A footer address is the cheapest
// address on a website to find and the least likely to be the venue.
//
// So this is a REFUSAL, not a ranking. His words: "If anything indicates an
// 'office', then DO NOT consider it the event location." A refused address
// leaves the field empty and the entry says the location is unconfirmed, which
// is a state this product already handles honestly. A wrong address is
// published as a fact and sends somebody to Valby.
export const OFFICE_WORDS = [
  "kontor", "kontoradresse", "hovedkontor", "sekretariat", "sekretariatet",
  "administration", "administrativ", "administrative", "adm.",
  "postadresse", "postboks", "att.", "c/o",
  "cvr", "cvr-nr", "ean", "ean-nr", "faktura", "fakturaadresse", "regnskab",
  "office", "head office", "headquarters", "hq", "registered office",
  "press office", "presse", "pressekontakt",
  "büro", "geschäftsstelle",
];

// Folded and bounded, because "kontor" sits inside "kontorhotel" and "presse"
// inside "pressefotograf", and an unbounded test here would refuse addresses
// that are perfectly good. Same discipline as every other matcher in this repo.
const OFFICE_RE = new RegExp(`(?:^|[^a-z0-9æøå])(?:${OFFICE_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")).join("|")})(?:[^a-z0-9æøå]|$)`, "i");

// How much text around an address counts as its context. An address stated in a
// footer beside a CVR number is an office whether or not the word "kontor"
// appears in the address line itself, and that is the Copenhagen Cooking case
// exactly: the giveaway was the company registration beside it, not the street.
export const OFFICE_CONTEXT_WINDOW = 160;

export const looksLikeOffice = (address, context = "") => {
  const a = String(address || "");
  if (!a.trim()) return false;
  if (OFFICE_RE.test(a)) return true;
  const c = String(context || "");
  if (!c) return false;
  // Only the text AROUND this address, not the whole page: a site with a contact
  // page somewhere is not thereby an office, and testing the whole document
  // would refuse every address on every site that has a footer.
  const at = c.indexOf(a);
  if (at < 0) return false;
  const near = c.slice(Math.max(0, at - OFFICE_CONTEXT_WINDOW), at + a.length + OFFICE_CONTEXT_WINDOW);
  return OFFICE_RE.test(near);
};

// The order he asked for, stated once so nothing has to guess it again:
//
//   1. what the event's OWN site says the venue is
//   2. Places, second, and only when the site said nothing
//
// and an office is refused at BOTH tiers rather than only the first, because
// Places will happily return the secretariat too when that is what is
// registered under the festival's name.
export const EVENT_LOCATION_ORDER = ["official-site", "places", "none"];

export const eventLocation = ({ fromSite = "", fromPlaces = "", siteText = "", placesText = "" } = {}) => {
  const site = String(fromSite || "").trim();
  if (site && !looksLikeOffice(site, siteText)) return { address: site, from: "official-site", why: "" };
  const refusedSite = site ? "the address on the event's own site reads as an office rather than a venue" : "";
  const places = String(fromPlaces || "").trim();
  if (places && !looksLikeOffice(places, placesText)) {
    return { address: places, from: "places", why: refusedSite ? `${refusedSite}, so Places answered instead` : "" };
  }
  // Nothing usable. Said plainly rather than falling back to the office, because
  // an unconfirmed location is a state this product handles and a wrong one is
  // not.
  return {
    address: "", from: "none",
    why: refusedSite && places ? "both the site and Places gave an administrative address"
      : refusedSite ? refusedSite
      : places ? "the address Places returned reads as an office rather than a venue"
      : "no address was found",
  };
};
