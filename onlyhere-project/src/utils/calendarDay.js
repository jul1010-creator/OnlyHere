// ── A DAY IS NOT AN INSTANT ──────────────────────────────────────────
//
// Found on 16 August 2026, by the suite going red overnight on a test that had
// passed for days. The fixture was a festival running 10 to 16 August, and the
// assertion was that it is currently live. On the 16th it was not.
//
//     export const isCurrentlyLive = (start, end) => {
//       const now = new Date();
//       const s = new Date(start);
//       const e = end ? new Date(end) : s;
//       return s <= now && now <= e;
//     };
//
// TWO FAULTS, ONE LINE, AND THE SAME ROOT.
//
// ONE: THE END DATE IS TREATED AS A MOMENT. `new Date("2026-08-16")` is midnight
// at the START of the 16th, so from the first minute of a festival's last day it
// reads as over. The last day of a festival is a day people go to it. Roskilde
// on its closing Saturday is not finished.
//
// TWO: THAT MOMENT IS IN UTC, WHILE `new Date()` IS LOCAL. The date-only ISO
// form is defined by the spec as UTC and every other form as local, which is the
// same trap parseEventDate had until yesterday. Two hours of Danish summer time
// where the two disagree, on top of the whole missing day.
//
// AND THE APP ALREADY DISAGREED WITH ITSELF ABOUT IT. hasFinished, forty lines
// up in the same file, compares against LOCAL midnight today and correctly says
// a festival ending today has not finished. So on 16 August the site would tell
// you a festival had not finished and refuse to show it as happening, both at
// once, from two functions about the same event.
//
// ── WHY ITS OWN FILE ────────────────────────────────────────────────
// helpers.js needs this and so does eventDates.js, and eventDates.js already
// imports daCompare FROM helpers.js. Putting it in either one makes a cycle.
// Putting it in both makes the copy that drifts, which is the thing this
// codebase keeps paying for: this is the SECOND independent instance of the
// ISO-is-UTC bug found in two days.

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// The local calendar day a value names, at 00:00:00.000, or null when it cannot
// be read. Null rather than a guess, because a date nobody can parse must not
// become either past or future by accident.
export const dayStart = (v) => {
  const t = String(v ?? "").trim();
  if (!t) return null;
  const iso = ISO_DAY.exec(t);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    const out = new Date(y, m - 1, d);
    // The constructor rolls a bad value over in silence, so the result is read
    // back: "2026-13-01" becomes January 2027 and must come back null instead.
    return out.getMonth() === m - 1 && out.getDate() === d ? out : null;
  }
  const parsed = new Date(t);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

// The same day at 23:59:59.999. This is the one the bug was about: "runs until
// the 16th" means through the 16th, not up to the moment it began.
export const dayEnd = (v) => {
  const d = dayStart(v);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
};

// ── STORING A DAY, WHICH IS WHERE THE WHOLE FAMILY STARTS ───────────
//
// Everything above reads a stored value. This is how one should be WRITTEN, and
// getting it wrong at this end is the root of the last remaining case.
//
// A guide's arrival was stored with `arrivalDate.toISOString()`. arrivalDateIn
// builds LOCAL midnight of the day the traveller named, so that produced, from
// Denmark in September, "2026-09-05T22:00:00.000Z". The intended day is the
// 6th. The string says the 5th. It only reads back as the 6th in the timezone
// that wrote it, which is fine while the person who made a guide is the person
// reading it, and wrong the moment they share the link.
//
// An arrival is a CALENDAR DAY. "I arrive on 6 September" is true in every
// timezone there is, so it is stored as the day and not as an instant. Read
// back by dayStart, "2026-09-06" is the 6th everywhere.
//
// LEGACY ROWS STILL WORK, which is why this ships without a migration: saved
// guides written before today hold a full timestamp, and dayStart falls back to
// reading those as a local day, exactly as the old code did. New guides are
// unambiguous, old ones are no worse than they were.
export const dayKey = (v) => {
  const d = dayStart(v);
  if (!d) return null;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// ── COUNTING FORWARD FROM A DAY ──────────────────────────────────────
//
// "Day 3 of the trip" is arithmetic on a calendar day, and GuidePage was doing
// it inline, in one place, on a value it had just built:
//
//     const dayDate = dayStart(guide._arrivalDate);
//     if (dayDate) dayDate.setDate(dayDate.getDate() + ((day.day || dayIdx + 1) - 1));
//
// That is correct. It is also a private day calculation living in the same file
// the sixth copy of the overlap test was found in, and the moment a second
// reader needs the same number it becomes the copy that drifts. Every previous
// member of this family began exactly here: one correct inline calculation that
// never looked for siblings.
//
// Built through the constructor rather than setDate, so nothing is mutated and
// the month rollover is the platform's problem: 30 August plus 3 is 2 September
// without this file knowing how long August is.
export const dayPlus = (v, n) => {
  const d = dayStart(v);
  if (!d) return null;
  const step = Number(n);
  if (!Number.isFinite(step)) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + Math.trunc(step));
};

// ── AND PRINTING ONE ─────────────────────────────────────────────────
//
// "16 Aug 2026". Third member of this family and the first that a reader sees,
// so it is here for the reason the file already gives twice: HowWeKnow.jsx had
// its own copy, journey.js needed the same thing for the "measured on" stamp
// under a timetable, and a component cannot be imported by a util. Two
// formatters is the copy that drifts.
//
// Formatted from the LOCAL parts dayStart built, which is what makes a stored
// day print as the same day everywhere. The alternative, toLocaleDateString on a
// raw parse, prints the day before for every reader west of Greenwich, and that
// is not hypothetical: it is finding five of the five that created this file.
//
// An INSTANT still prints the local calendar day it fell on, which is correct
// for a "last checked at" line and is deliberately not the same in every
// timezone. Only a day-only value is invariant, because only a day-only value
// names a day.
export const dayLabel = (v) => {
  const d = dayStart(v);
  if (!d) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

// Is this calendar day within the range, inclusive at both ends. `today` is a
// parameter rather than a call to the clock, for the reason eventDates.js
// already states in its own words: a date helper that reads the clock cannot be
// tested against a fixed calendar, and this whole bug is one that only appears
// on one specific day of the year.
export const dayWithin = (start, end, today = new Date()) => {
  const s = dayStart(start);
  if (!s) return false;
  const e = dayEnd(end) || dayEnd(start);
  if (!e) return false;
  const now = today instanceof Date ? today : new Date(today);
  if (!Number.isFinite(now.getTime())) return false;
  return s.getTime() <= now.getTime() && now.getTime() <= e.getTime();
};
