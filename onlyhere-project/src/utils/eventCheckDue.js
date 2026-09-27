// ── ONLY CHECK WHAT IS DUE ───────────────────────────────────────────
//
// Oliver, 27 Sep 2026, after the date check got its Save buttons: "But it costs
// me money to update all the time though :S"
//
// It did, and mostly for nothing. Every run re-read and re-searched up to sixty
// events from scratch, including the forty that came back "the next edition is
// not announced yet" last time and will say the same thing tomorrow. The search
// (Perplexity), the page reader's fallback (Firecrawl) and the poster reader
// (a vision model) are paid per call; none of them is cheaper the second time.
//
// So each event remembers when it was last checked (`__lastCheck` on the entry,
// or this browser's memory for an event that lives in the code), and a run only
// spends on the ones that are due:
//
//   no date yet, or the date has passed   every 14 days: an announcement is
//                                          what we are waiting for, and they
//                                          do not come daily
//   on within the next 45 days            every 7 days: tickets and last
//                                          minute changes are what matter now
//   further off                           every 30 days: a date nine months
//                                          out rarely moves
//
// A waiting entry (no date, not published yet) is treated as "no date yet".
// "Check all anyway" still exists, for the day he wants it regardless.
import { parseEventDate, isPastDate, isUndated } from "./eventDates";
import { dayKey } from "./calendarDay";
import { fold } from "./danishNames";

export const RECHECK_DAYS = { waiting: 14, soon: 7, later: 30 };
export const SOON_DAYS = 45;
const DAY = 86400000;

// For an event that is in the code rather than the database, the memory has to
// live in this browser, keyed by what identifies it there.
export const checkKey = (ev) => `${fold(String(ev?.name || ""))}|${fold(String(ev?.town || ""))}`;
export const LOCAL_CHECKS_KEY = "gemlyx_event_checks";

export const lastCheckOf = (ev, local = {}) => {
  const own = ev?.__lastCheck;
  if (own && own.at) return own;
  const held = local && local[checkKey(ev)];
  return held && held.at ? held : null;
};

// { due, why, days } where `days` is how many days until it is due again.
export const dueForCheck = (ev, today = new Date(), last = null) => {
  const now = today instanceof Date ? today : new Date(today);
  const date = ev?.date;
  const noDate = isUndated(date) || isPastDate(ev?.dateEnd || date, now);
  const start = parseEventDate(date);
  const away = start ? Math.round((start.getTime() - now.getTime()) / DAY) : null;
  const gap = noDate ? RECHECK_DAYS.waiting : away != null && away <= SOON_DAYS ? RECHECK_DAYS.soon : RECHECK_DAYS.later;
  const kind = noDate ? "no date announced yet" : away != null && away <= SOON_DAYS ? "on within the next 45 days" : "further off";
  if (!last?.at) return { due: true, why: "never checked", days: 0 };
  const then = parseEventDate(last.at);
  if (!then) return { due: true, why: "never checked", days: 0 };
  const since = Math.floor((now.getTime() - then.getTime()) / DAY);
  if (since >= gap) return { due: true, why: `${kind}, last checked ${since} days ago`, days: 0 };
  return { due: false, why: `${kind}, checked ${since === 0 ? "today" : `${since} day${since === 1 ? "" : "s"} ago`}`, days: gap - since };
};

// What a run writes onto each event it looked at.
export const checkRecord = (today = new Date(), outcome = "nothing") => ({ at: dayKey(today), outcome });
