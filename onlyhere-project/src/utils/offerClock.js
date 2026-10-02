// ── AN OFFER'S CLOCK ────────────────────────────────────────────────
//
// The weekday and hours rules for an offer (see OFFER HOURS in offer.js),
// in a file that imports nothing, so a server route can load it too: the
// "I have X hours" planner (api/plan-now.js) reads an offer's window by the
// same rules the Special deals page does, rather than by a copy.
//
// THE CLOCK IS THE PLACE'S, NOT THE READER'S. A cruise passenger's phone may
// still be on ship time or home time, and "until 16:00" means 16:00 at the
// counter in Klaipėda. Callers pass the zone of the row's country.
//
// Days use Date.getDay numbering (0 is Sunday), Monday first in the Studio.
export const OFFER_WEEK = [1, 2, 3, 4, 5, 6, 0];

export const cleanDays = (v) => [...new Set((Array.isArray(v) ? v : [])
  .map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))]
  .sort((a, b) => OFFER_WEEK.indexOf(a) - OFFER_WEEK.indexOf(b));

// "13", "13.00", "13:00" and "9:30" all read; anything else is "".
export const cleanClock = (v) => {
  const m = /^([01]?\d|2[0-3])(?:[:.]([0-5]\d))?$/.exec(String(v ?? "").trim());
  return m ? `${m[1].padStart(2, "0")}:${m[2] || "00"}` : "";
};
export const minutesOf = (hhmm) => { const c = cleanClock(hhmm); return c ? Number(c.slice(0, 2)) * 60 + Number(c.slice(3)) : null; };

// The weekday and minute of the day at the place. Falls back to the device
// clock only where Intl cannot do zones, which no current browser lacks.
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export const placeClock = (now = new Date(), zone = "") => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone || undefined, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const get = (type) => parts.find(p => p.type === type)?.value;
    const day = WD[get("weekday")];
    const minutes = Number(get("hour")) * 60 + Number(get("minute"));
    if (day !== undefined && Number.isFinite(minutes)) return { day, minutes };
  } catch { /* fall through */ }
  return { day: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() };
};

// The window of a cleaned offer ({ days, from, to }), or null for an all
// day, every day one.
export const windowOf = (o) => {
  if (!o) return null;
  const from = minutesOf(o.from), to = minutesOf(o.to);
  const hours = from !== null && to !== null && to > from;
  const days = cleanDays(o.days);
  if (!days.length && !hours) return null;
  return { days, from: hours ? cleanClock(o.from) : "", to: hours ? cleanClock(o.to) : "", fromMin: hours ? from : 0, toMin: hours ? to : 24 * 60 };
};

// Where a window stands at a { day, minutes } on the place's clock:
//   "always"  no window          "now"  inside it
//   "later"   today, not yet     "off"  not today, or over for today
export const timingAt = (w, { day, minutes }) => {
  if (!w) return "always";
  if (w.days.length && !w.days.includes(day)) return "off";
  if (minutes < w.fromMin) return "later";
  if (minutes >= w.toMin) return "off";
  return "now";
};

// The calendar day at the place, as YYYY-MM-DD, for comparing with an
// offer's end date or an event's dates on a server that runs on UTC.
export const placeDate = (now = new Date(), zone = "") => {
  try {
    const s = new Intl.DateTimeFormat("en-CA", { timeZone: zone || undefined, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  } catch { /* fall through */ }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
