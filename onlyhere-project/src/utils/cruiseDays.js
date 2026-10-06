// ── CRUISE DAYS: WHO IS IN PORT, AND WHEN THEY SAIL ─────────────────
//
// Oliver, 5 Oct 2026: "Can the AI track 'expected visitors' in klaipda?" and
// "Sure" to the cruise ships first. No model is needed: the port publishes
// its schedule (data/klaipedaCruises.js says where and when it was copied).
// These read it for one day or the days ahead, in Klaipėda time, and say
// how many guests the ships carry. A guest count is what is on board, not
// what comes ashore, so the page says "about".
import { CRUISE_CALLS, SHIPS, CRUISE_ZONE } from "../data/klaipedaCruises";
import { placeClock, placeDate } from "./offerClock";

const minutesOf = (stamp) => {
  const m = String(stamp || "").match(/\s(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const dayOf = (stamp) => String(stamp || "").slice(0, 10);

// One call, as the pages need it.
export const callView = (c) => ({
  ship: c.ship,
  day: dayOf(c.arrive),
  from: minutesOf(c.arrive),
  to: dayOf(c.leave) === dayOf(c.arrive) ? minutesOf(c.leave) : 24 * 60,
  leaves: String(c.leave).slice(11, 16),
  arrives: String(c.arrive).slice(11, 16),
  guests: SHIPS[c.ship]?.guests || 0,
});

export const callsOn = (day, calls = CRUISE_CALLS) => calls.filter(c => dayOf(c.arrive) === day).map(callView);

// The ships in port at this moment, Klaipėda time.
export const inPortNow = (now = new Date(), calls = CRUISE_CALLS) => {
  const day = placeDate(now, CRUISE_ZONE);
  const { minutes } = placeClock(now, CRUISE_ZONE);
  return callsOn(day, calls).filter(c => c.from !== null && c.to !== null && minutes >= c.from && minutes < c.to);
};

// The next days with ships, today first if a ship is still due or in.
export const cruiseDaysAhead = (now = new Date(), count = 4, calls = CRUISE_CALLS) => {
  const today = placeDate(now, CRUISE_ZONE);
  const { minutes } = placeClock(now, CRUISE_ZONE);
  const byDay = new Map();
  for (const c of calls.map(callView)) {
    if (c.day < today) continue;
    if (c.day === today && c.to !== null && c.to <= minutes) continue;
    if (!byDay.has(c.day)) byDay.set(c.day, []);
    byDay.get(c.day).push(c);
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, count)
    .map(([day, list]) => ({ day, calls: list, guests: list.reduce((n, c) => n + c.guests, 0) }));
};

// "about 1,900": rounded to the hundred, because it is an estimate.
// Written the way the reader's language writes a number: "1,900", "1 900".
const NUMBER_LOCALE = { en: "en-GB", da: "da-DK", de: "de-DE", lt: "lt-LT" };
export const aboutGuests = (n, lang = "en") => (n >= 100 ? (Math.round(n / 100) * 100).toLocaleString(NUMBER_LOCALE[lang] || "en-GB") : String(n));

// Which walk lengths still get a passenger back before the ship sails. The
// walk itself keeps SHIP_MARGIN in hand before its end (utils/nowPlanner.js),
// so a length fits when it ends by the time the ship leaves.
export const hoursBeforeSailing = (hoursList, nowMinutes, leavesMinutes) =>
  hoursList.filter(h => nowMinutes + h * 60 <= leavesMinutes);

// A season in one line, for the business page: how many calls, how many
// ships, and about how many guests on board across the year.
export const seasonOf = (year, calls = CRUISE_CALLS) => {
  const mine = calls.filter(c => String(c.arrive).startsWith(`${year}-`));
  return {
    year,
    calls: mine.length,
    ships: new Set(mine.map(c => c.ship)).size,
    guests: mine.reduce((n, c) => n + (SHIPS[c.ship]?.guests || 0), 0),
  };
};
