// ── WHAT'S ON FOR YOU ───────────────────────────────────────────────
//
// Oliver, 29 Sep 2026, looking at Klaipėda's own calendar: "I guess our app can
// also quickly find what interests the person specifically? Because looking
// through their page.. those events are overwhelming.." Twenty events a day is
// a list a visitor scrolls past. A day, an interest and whether the kids are
// coming turns it into three.
//
// This file is the day half, pure so the suite can ask it about any date. The
// interest half is the Type facet the Events page already has, and "with kids"
// is its family type (see utils/eventTypes.js).
import { parseEventDate } from "./eventDates";

export const WHEN_CHOICES = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekend", label: "This weekend" },
  { id: "week", label: "Next 7 days" },
];

const at = (d, add = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + add);

// The days a choice means, counted from `today`. "This weekend" on a Saturday
// is today and tomorrow, on a Sunday is today, and on a weekday is the coming
// Saturday and Sunday.
export const daysFor = (id, today = new Date()) => {
  const t = at(today);
  if (id === "today") return [t];
  if (id === "tomorrow") return [at(t, 1)];
  if (id === "week") return Array.from({ length: 7 }, (_, i) => at(t, i));
  if (id === "weekend") {
    const dow = t.getDay();
    if (dow === 6) return [t, at(t, 1)];
    if (dow === 0) return [t];
    return [at(t, 6 - dow), at(t, 7 - dow)];
  }
  return [];
};

// Is the event on, on any of those days. A run counts on every day it spans;
// an event with no readable date is on none of them, because "we do not know
// when" is not "today".
export const eventOnDays = (event, days) => {
  const start = parseEventDate(event?.date);
  if (!start) return false;
  const end = parseEventDate(event?.dateEnd) || start;
  const s = at(start).getTime(), e = at(end).getTime();
  return (Array.isArray(days) ? days : []).some(d => { const x = at(d).getTime(); return x >= s && x <= e; });
};
