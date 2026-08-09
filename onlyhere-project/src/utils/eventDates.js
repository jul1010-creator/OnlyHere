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
export const nextEditionYear = (v, today) => {
  const d = parseEventDate(v);
  if (!d || !today) return null;
  return isPastDate(v, today) ? today.getFullYear() + (d.getMonth() < today.getMonth() ? 1 : 1) : d.getFullYear();
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
