import { dayStart } from "./calendarDay";
// ── TWO SOURCES FOR OPENING HOURS, AND NEITHER WINS BY DEFAULT ───────
//
// Oliver, 11 Aug 2026: "Website opening hours of course should be prioritised.
// Right?" The instinct is right in principle and wrong in practice, and the
// reasoning is worth keeping because it decides the shape of this file.
//
// FOR the website: it is the operator's own publication.
// AGAINST it, for the small Danish venues that are the whole differentiator:
//
//   Website hours rot silently. A footer written in 2019 says "Åbent 11-22" and
//   nobody has touched it. A Google Business Profile is nudged by the owner,
//   corrected from user reports, and flagged when it drifts.
//
//   Google's field is STRUCTURED (weekdayDescriptions, a clean array). A scraped
//   page is prose: api/scan-source.js strips every tag and truncates to 20000
//   characters, so reading hours out of it means a model interpreting stripped
//   HTML. That is precisely the thing the pipeline's own wording already
//   contrasts unfavourably: "from Google's real business listing, not a guess or
//   a web page reading".
//
//   And the page fetched is often not the hours page at all. The scrape list is
//   built from name-matched hosts and top non-aggregator results, so a marketing
//   front page with a hero image and no hours is a common outcome.
//
// SO THE SPLIT IS NOT A CONTEST, IT IS A DIVISION OF LABOUR:
//
//   Google owns the WEEKLY PATTERN. It is structured and maintained.
//   The website owns what that shape CANNOT HOLD. weekdayDescriptions is seven
//   lines, one per weekday, and it physically cannot say "closed January to
//   March", "by appointment", "last admission 45 minutes before closing" or
//   "closed 24 to 26 December". Those are real, they change whether a trip
//   works, and they are invisible to the structured field.
//
//   And when the two disagree ABOUT THE WEEKLY PATTERN, that is a FINDING, not
//   something to resolve. A venue whose site and listing disagree is a venue
//   where a traveller will get it wrong, and the honest output is to say so.
//   Same rule classifyFerry already follows: only real evidence counts, and
//   everything else returns unknown rather than a claim.
//
// DELIBERATELY DETERMINISTIC. No model call, so this runs on every draft and
// every published row for nothing, and the same page always gives the same
// answer.

const DA_MONTHS = "januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december";
const EN_MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december";
const MONTH = `(?:${DA_MONTHS}|${EN_MONTHS})`;

// ── WHAT GOOGLE'S SHAPE CANNOT HOLD ─────────────────────────────────
// Each of these is a real thing a Danish venue writes on its own site and that
// weekdayDescriptions has nowhere to put. The label is what it is; the pattern
// is how it is said, in both languages.
const EXCEPTIONS = [
  {
    kind: "seasonal",
    label: "Only open part of the year",
    // "open May to September", "åbent maj-september", "open from April"
    re: new RegExp(`(?:open|åben(?:t|)|åbnings\\w*)[^.\\n]{0,40}?\\b${MONTH}\\b[^.\\n]{0,20}?(?:to|til|-|–|until)\\s*\\b${MONTH}\\b`, "i"),
  },
  {
    kind: "seasonal-closure",
    label: "Closed for part of the year",
    // "closed in January", "lukket i januar", "closed January to March"
    re: new RegExp(`(?:closed|lukket)[^.\\n]{0,25}?\\b(?:in|i|during|fra|from)?\\s*\\b${MONTH}\\b`, "i"),
  },
  {
    kind: "appointment",
    label: "By appointment only",
    re: /\b(?:by (?:prior )?appointment|efter aftale|kun efter aftale|by arrangement)\b/i,
  },
  {
    kind: "last-entry",
    label: "Last admission is before closing",
    // The one that most often ruins an afternoon, and Google never says it.
    re: /\b(?:last (?:entry|admission|entrance)|sidste ind(?:gang|lukning|ladelse))\b/i,
  },
  {
    kind: "holiday",
    label: "Closed on specific holidays",
    re: /\b(?:closed[^.\n]{0,30}(?:christmas|easter|public holidays?|bank holidays?)|lukket[^.\n]{0,30}(?:jul|juleaften|påske|helligdag))/i,
  },
];

// One sentence of context around a match, so a person can judge it without
// opening the page. Bounded, because this ends up in a prompt.
const sentenceAround = (text, index) => {
  const from = Math.max(0, text.lastIndexOf(".", index) + 1);
  const dot = text.indexOf(".", index);
  const to = dot === -1 ? Math.min(text.length, index + 160) : Math.min(dot + 1, index + 200);
  return text.slice(from, to).replace(/\s+/g, " ").trim().slice(0, 180);
};

// What the site says that Google structurally could not have told us.
export const seasonalNotes = (siteText) => {
  const t = String(siteText || "");
  if (!t.trim()) return [];
  const out = [];
  EXCEPTIONS.forEach(ex => {
    const m = ex.re.exec(t);
    if (!m) return;
    out.push({ kind: ex.kind, label: ex.label, quote: sentenceAround(t, m.index) });
  });
  return out;
};

// ── COMPARING THE WEEKLY PATTERN ────────────────────────────────────
// Deliberately NOT a full parse of the site's hours. Parsing prose opening
// hours reliably is its own project, and a half-working parser that
// occasionally invents a disagreement would get this switched off within a week.
//
// Instead: the set of CLOCK TIMES each side states. If the site states a
// closing time that appears nowhere in Google's week, the two are saying
// different things and that is worth a human glance. It cannot say which is
// right, and it does not try.
const TIME_RE = /\b([01]?\d|2[0-3])[.:]([0-5]\d)\b/g;

export const timesIn = (text) => {
  const out = new Set();
  const t = String(text || "");
  let m;
  const re = new RegExp(TIME_RE.source, "g");   // fresh, because /g is stateful
  while ((m = re.exec(t)) !== null) out.add(`${String(m[1]).padStart(2, "0")}:${m[2]}`);
  return [...out];
};

export const NO_HOURS_ON_PAGE = "no-hours-on-page";

// The whole answer in one object. `verdict` is the field to read.
export const reconcileHours = (googleHours, siteText) => {
  const google = Array.isArray(googleHours) ? googleHours.filter(Boolean) : [];
  const notes = seasonalNotes(siteText);
  const siteTimes = timesIn(siteText);
  const googleTimes = timesIn(google.join(" "));

  if (!google.length) {
    return { verdict: "google-silent", notes, extraTimes: [], detail: "Google's listing has no opening hours for this place, so there is nothing to compare the site against." };
  }
  if (!String(siteText || "").trim() || siteTimes.length === 0) {
    // The common case, and not a problem: the page we fetched was a front page.
    return {
      verdict: NO_HOURS_ON_PAGE, notes, extraTimes: [],
      detail: notes.length
        ? "The site states no clock times, but it does say things Google's weekly pattern cannot hold."
        : "The site states no clock times on the page that was fetched, which is usually because it was a front page rather than an opening-hours page.",
    };
  }

  // A time on the site that Google never mentions anywhere in its week.
  const extraTimes = siteTimes.filter(x => !googleTimes.includes(x));
  if (extraTimes.length === 0) {
    return { verdict: "agree", notes, extraTimes: [], detail: "Every clock time on the site also appears in Google's weekly hours." };
  }
  return {
    verdict: "disagree", notes, extraTimes,
    // Never resolved. Named, quoted, and handed over.
    detail: `The site states ${extraTimes.join(", ")}, which appears nowhere in Google's weekly hours. One of the two is out of date and there is no way to tell which from here, so this is a "check before you go", not a correction.`,
  };
};

// ── WHAT THE MODEL IS TOLD ──────────────────────────────────────────
// Google's pattern as the baseline, the site's exceptions as the things that
// change whether a trip works, and a disagreement stated as a disagreement.
export const hoursForPrompt = (googleHours, reconciled) => {
  const google = Array.isArray(googleHours) ? googleHours.filter(Boolean) : [];
  const parts = [];
  if (google.length) {
    parts.push(`VERIFIED OPENING HOURS (Google's business listing, which is the operator's own maintained record, not a web page reading): ${google.join("; ")}. Use these as the weekly pattern.`);
  }
  (reconciled?.notes || []).forEach(n => {
    parts.push(`FROM THE PLACE'S OWN SITE, and Google's weekly hours CANNOT express this, so it is not a contradiction: ${n.label}. They write: "${n.quote}". If this affects whether a visit works, say it plainly in the entry.`);
  });
  if (reconciled?.verdict === "disagree") {
    parts.push(`THE TWO SOURCES DISAGREE ABOUT THE WEEKLY HOURS. ${reconciled.detail} Do NOT pick one and state it as fact. Give Google's pattern, and add an uncertainty saying the official site shows different times and should be checked before travelling.`);
  }
  return parts.join("\n");
};


// ── IS IT OPEN ON THE DAY THE GUIDE SENDS SOMEBODY THERE ────────────
//
// Oliver, 11 Aug 2026, passing on Google's own architecture advice: "Hvis din AI
// foreslår et museum, der er lukket om mandagen, skal din pipeline fange det
// her."
//
// They are right that it is a hole, and it was worse than they could know from
// outside: the GUIDE builder never calls Places at all. Not once. The Studio
// draft pipeline does, so a published entry has been near Google's hours, but
// the thing that actually plans a traveller's Monday had no idea what was shut.
//
// THEIR FIX WOULD HAVE COST MONEY PER GUIDE. The advice is to call Places
// during the build, which is one Place Details request per stop, per guide, on
// the Enterprise SKU. For a five day trip with four stops a day that is twenty
// paid calls to re-learn something already bought once.
//
// This reads the hours already stored on the published row instead (see __hours
// in studioContent.js). Every stop in a guide is already matched against those
// rows by lookupRealPlace, so the answer is sitting in memory. No call, no key,
// no cost, and it works offline.
//
// WHAT IT DELIBERATELY WILL NOT DO: guess. If the row has no stored hours, or
// the day cannot be read, it says nothing. A guide that warns about half its
// stops and stays silent on the other half, with no way to tell which is which,
// is worse than one that never warns at all.

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Google writes weekdayDescriptions as "Monday: 10:00 – 17:00" or
// "Monday: Closed", one line per day, in the language of the request.
export const closedDays = (hours) => {
  const out = new Set();
  (Array.isArray(hours) ? hours : []).forEach(line => {
    const t = String(line || "");
    const day = DAY_NAMES.findIndex(d => new RegExp(`^\\s*${d}\\b`, "i").test(t));
    if (day < 0) return;
    // "Closed" with no times after it. A line carrying clock times is open,
    // even if it also says something was closed earlier in the string.
    if (/\bclosed\b|\blukket\b/i.test(t) && timesIn(t).length === 0) out.add(day);
  });
  return [...out].sort((a, b) => a - b);
};

// Which real calendar day is day N of this trip.
//
// ── AND IT WAS A DAY EARLY FOR HALF THE READERS ─────────────────────
// This did `new Date(arrivalDate)` and then `.getDay()`. The date-only ISO form
// parses as UTC midnight while getDay reads LOCAL, so in New York an arrival of
// "2026-08-09" is 20:00 on the 8th and this returned Saturday for a Sunday
// arrival. Every later day of the trip inherited the shift.
//
// THIS IS THE ONE THAT COSTS AN AFTERNOON. shutOnVisit below is what warns a
// reader that a museum is closed on the day they mean to go. Off by one, it
// clears a Monday visit as fine and flags the Tuesday instead, so somebody
// crosses a city to stand outside a locked door having been told it was open.
// Every other bug in this family cost a click.
//
// Measured before the fix, under TZ=America/New_York:
//   "a Monday museum visit is caught"   expected Monday, got Sunday
//   "a Tuesday visit is fine"           expected null, got a Monday warning
//
// dayStart reads a stored date as the calendar day it names, and returns null
// rather than an Invalid Date, which is why the two guards collapse into one.
// See utils/calendarDay.js.
export const dayOfVisit = (arrivalDate, dayNumber) => {
  const d = dayStart(arrivalDate);
  if (!d) return null;
  d.setDate(d.getDate() + Math.max(0, (Number(dayNumber) || 1) - 1));
  return d.getDay();
};

// The answer, per stop. Returns null when it does not know, which is most of
// the time and is the correct answer then.
export const shutOnVisit = (storedHours, arrivalDate, dayNumber) => {
  const hours = storedHours?.hours;
  if (!Array.isArray(hours) || !hours.length) return null;   // nothing stored, so nothing to say
  const day = dayOfVisit(arrivalDate, dayNumber);
  if (day === null) return null;                             // no trip date, so no weekday
  if (!closedDays(hours).includes(day)) return null;
  return {
    day,
    dayName: DAY_NAMES[day].replace(/^./, c => c.toUpperCase()),
    // The date the hours were true on, never dropped. An hours array with no
    // date is a claim that quietly ages into a lie.
    checkedOn: storedHours.fetchedAt ? String(storedHours.fetchedAt).slice(0, 10) : "",
  };
};

// ── AND THE HOUR, WHICH IS THE HALF NOBODY CHECKED ──────────────────
//
// Oliver, 6 Sep 2026, on a guide built from his own conversation: "it's quite
// odd to go to Hive at 20:30 and then to a bar at Gothersgade 22:30... that
// makes no logical sense."
//
// HIVE OPENS AT 23:00, and only Thursday to Saturday. The plan had him outside
// a locked door two and a half hours early, and then put the bar AFTER the
// club, which is the evening backwards.
//
// Nothing in the app could have caught it. `arrivalTime` is written entirely by
// the model, the plan prompt tells it to build "roughly 9am-9pm", and a
// nightclub does not fit in a window that ends at nine, so it got squeezed into
// the one it was given. shutOnVisit above answers "is this place shut that DAY"
// and has never been called by anything. Neither half of the question reached a
// reader.
//
// This is the other half: is it open at that HOUR.
//
// ── PAST MIDNIGHT IS THE WHOLE POINT ────────────────────────────────
//
// "23:00 – 05:00" closes BEFORE it opens by the clock, and reading it as a
// plain interval says a club is shut at one in the morning and open at noon,
// which is worse than not checking. A window whose end is at or before its
// start wraps into the next day.
const DAY_TITLE = (d) => DAY_NAMES[d].replace(/^./, c => c.toUpperCase());
const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h >= 0 && h <= 23 && mi >= 0 && mi <= 59 ? h * 60 + mi : null;
};

// The windows on one weekday's line, as minute pairs. Google writes them as
// "Friday: 11:00 – 17:00" and sometimes "Friday: 11:00 – 14:00, 17:00 – 22:00",
// so the times come out in order and are paired off. An odd count means the
// line is not something this can read, and an unreadable line is NOT a closed
// venue: it returns nothing and the caller stays silent.
export const windowsOn = (hours, day) => {
  const line = (Array.isArray(hours) ? hours : [])
    .find(l => new RegExp(`^\\s*${DAY_NAMES[day]}\\b`, "i").test(String(l || "")));
  if (!line) return null;
  const times = timesIn(line).map(toMinutes).filter(n => n !== null);
  // timesIn dedupes through a Set, so a genuine "09:00 – 09:00" collapses. That
  // is unreadable rather than closed, same rule as an odd count.
  if (!times.length || times.length % 2 !== 0) return null;
  const out = [];
  for (let i = 0; i < times.length; i += 2) {
    const from = times[i];
    let to = times[i + 1];
    // Wraps past midnight. 23:00 to 05:00 is six hours of the next morning, not
    // a negative eighteen.
    if (to <= from) to += 24 * 60;
    out.push([from, to]);
  }
  return out;
};

export const HHMM = (mins) => {
  const m = ((Number(mins) || 0) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// ── THE ANSWER, PER STOP ────────────────────────────────────────────
//
// null whenever it does not know, which is most of the time and is the right
// answer then: no stored hours, no trip date, no readable clock time on the
// stop, or a line this cannot parse. The one thing it must never do is guess,
// because the output of this is a sentence telling somebody their evening is
// wrong.
//
// A stop on a day the place is SHUT is left to shutOnVisit, which says that
// better. This answers only the open-day-wrong-hour case.
export const openAtVisit = (storedHours, arrivalDate, dayNumber, arrivalTime) => {
  const hours = storedHours?.hours;
  if (!Array.isArray(hours) || !hours.length) return null;
  const day = dayOfVisit(arrivalDate, dayNumber);
  if (day === null) return null;
  if (closedDays(hours).includes(day)) return null;   // shutOnVisit's job
  const at = toMinutes(String(arrivalTime || "").replace(/[^\d:.]/g, "").replace(".", ":"));
  if (at === null) return null;
  const windows = windowsOn(hours, day);
  if (!windows || !windows.length) return null;
  // Inside any window, including one that ran over from the night before: a
  // 01:00 arrival at a place open 23:00 to 05:00 is open, and the window is
  // stored on the previous day's line.
  const yesterday = windowsOn(hours, (day + 6) % 7) || [];
  const inAny = windows.some(([f, t]) => at >= f && at < t)
    || yesterday.some(([f, t]) => t > 24 * 60 && at + 24 * 60 >= f && at + 24 * 60 < t);
  if (inAny) return null;
  const opens = Math.min(...windows.map(w => w[0]));
  const closes = Math.max(...windows.map(w => w[1]));
  // ── AND A LUNCH GAP IS NOT "AFTER CLOSING" ────────────────────────
  // Caught in test rather than in reasoning. A kitchen open 11:00 to 14:00 and
  // again 17:00 to 22:00, visited at 15:00, was reported as "closes at 22:00",
  // which is true of the day and false of the moment and reads as nonsense to
  // anybody holding the opening times. Three cases, not two.
  const sorted = [...windows].sort((a, b) => a[0] - b[0]);
  const after = sorted.find(w => w[0] > at);
  const before = [...sorted].reverse().find(w => w[1] <= at);
  const inGap = at > opens && at < closes;
  return {
    day,
    dayName: DAY_TITLE(day),
    at: HHMM(at),
    opensAt: HHMM(opens),
    closesAt: HHMM(closes),
    // Which side of the window they landed on, because "too early", "too late"
    // and "in the gap" are three different mistakes and a planner fixes each
    // one differently.
    early: at < opens,
    gap: inGap && !!after && !!before ? { shutFrom: HHMM(before[1]), backAt: HHMM(after[0]) } : null,
    checkedOn: storedHours.fetchedAt ? String(storedHours.fetchedAt).slice(0, 10) : "",
  };
};

// The sentence, for a reader and for the planner's retry. Written here so the
// two cannot describe the same finding differently.
export const describeClosedAt = (v, name = "this stop") => {
  if (!v) return "";
  const head = `${name} is planned for ${v.at} on a ${v.dayName}`;
  if (v.early) return `${head} and does not open until ${v.opensAt}.`;
  if (v.gap) return `${head}, and it shuts from ${v.gap.shutFrom} until ${v.gap.backAt}.`;
  return `${head} and closes at ${v.closesAt}.`;
};
