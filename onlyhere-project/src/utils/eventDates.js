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

const clean = (v) => String(v == null ? "" : v).trim();

// Tolerant on purpose: drafts store "2026-06-17", "17 June 2026", "June 2026".
// Returns null rather than a guess, because an unparseable date must not be
// treated as either past or future.
export const parseEventDate = (v) => {
  const t = clean(v);
  if (!t) return null;
  const d = new Date(t);
  return Number.isFinite(d.getTime()) ? d : null;
};

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
