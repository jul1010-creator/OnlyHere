// ── "THE GUIDE HAS BEGUN TO LOOK LIKE A MASSIVE ADVERTISEMENT PAGE" ─
//
// Oliver, 19 Sep 2026, relaying an outside read and agreeing with it.
//
// MEASURED BEFORE CHANGING ANYTHING, because "it feels like a lot" and "it is
// a lot" are different claims and only one of them is fixable. The stay card
// renders inside the day loop, gated on needsABed, and it carries up to three
// outbound buttons: a named property when one is known, the Booking door, and
// the Trip.com comparison. So a seven night trip renders it seven times.
//
//   7 nights x 3 buttons = up to 21 hotel links on one page,
//
// before the costs list adds a ticket link per published stop. He is right,
// and so is whoever told him. That is not a guide with affiliate links on it,
// it is a page of affiliate links with a guide between them.
//
// ── AND THE REASON IT IS SAFE TO CUT ────────────────────────────────
//
// Nineteen of those twenty-one were never worth anything to a reader either.
// A trip that sleeps in Odense on nights three, four and five is ONE booking.
// The second and third buttons on that stay do not offer a second room, they
// offer the same search again, and a reader who did not press it the first
// time is not more likely to press it the third.
//
// So nothing here is about showing less advertising for its own sake. The door
// appears once per PLACE THEY SLEEP rather than once per night, which is once
// per decision the reader actually makes.
//
// ── WHAT THIS DOES NOT TOUCH ────────────────────────────────────────
//
// THE CARD AND THE SENTENCE STAY ON EVERY NIGHT. GuidePage carries a standing
// rule in capitals, from Oliver on 7 Aug 2026 after it had gone missing twice:
// "why does the accommodation/booking affiliation keep getting removed", and
// the answer is that it must survive every rebuild. It does. Where to stay is
// guide writing and it is written per day for good reasons, including the
// relocation days where the bed changes. What moves is the BUTTONS.
//
// AND AT LEAST ONE DOOR ALWAYS RENDERS. A guide with a night in it shows a way
// to book that night. That is the half of the rule this file must not break
// while fixing the other half, and it is asserted rather than trusted.
import { fold } from "./danishNames";

// The place a night is spent, as a comparable key. stayArea is what the
// enrichment pass wrote and is the most specific thing there is; the day's own
// town is the fallback, because a day with no stayArea still sleeps somewhere.
export const baseKey = (day) => {
  const area = String(day?.glance?.stayArea || "").trim();
  const town = (Array.isArray(day?.stops) ? day.stops : []).map(s => s?.town).find(Boolean) || "";
  const said = area || String(town || "").trim();
  return said ? fold(said) : "";
};

// ── ONE DOOR PER STAY, NOT PER NIGHT ────────────────────────────────
//
// `nights` is the day numbers that need a bed, in order, which the caller
// works out with needsABed so this file does not have to know about booked
// nights or the last day of a trip.
//
// CONSECUTIVE, and that word is doing work: a trip that sleeps in Aarhus,
// goes to Skagen for two nights and comes back to Aarhus is two separate
// bookings in Aarhus, and collapsing them onto one key would hide the second.
// So a base change opens a new stay even when the base has been seen before.
//
// A NIGHT WITH NO BASE AT ALL still gets a door. It is a night in a guide and
// the reader still has to sleep; what it cannot do is be merged with the night
// before it, because nothing says they are the same place.
export const staysIn = (days, nights = []) => {
  const list = Array.isArray(days) ? days : [];
  const wanted = new Set((Array.isArray(nights) ? nights : []).map(Number));
  const out = [];
  let last = null;
  list.forEach((d, i) => {
    const dayNo = Number(d?.day || i + 1);
    if (!wanted.has(dayNo)) { last = null; return; }
    const key = baseKey(d);
    if (key && last && last.key === key) { last.nights.push(dayNo); return; }
    last = { key, nights: [dayNo], first: dayNo };
    out.push(last);
  });
  return out;
};

// ── WHICH BUTTONS EACH NIGHT GETS ───────────────────────────────────
//
// `door` is the first night of each stay. `compare` is the FIRST DOOR OF THE
// WHOLE GUIDE and nowhere else, which is the other half of the cut: a second
// booking site beside the first on every card is the thing that reads as
// advertising rather than as help. Offered once, it reads as what it is, which
// is a second price to check.
//
// `featured` rides with the door for the same reason, so a named property and
// a search door cannot stack on a night that already has both.
export const doorsFor = (days, nights = []) => {
  const stays = staysIn(days, nights);
  const map = {};
  stays.forEach((s, i) => {
    map[s.first] = { door: true, compare: i === 0, featured: true, nights: s.nights.length };
  });
  return map;
};

export const doorOn = (map, dayNo) => map?.[Number(dayNo)] || { door: false, compare: false, featured: false, nights: 0 };

// ── AND THE NIGHTS THAT LOST THEIR BUTTON SAY WHY ───────────────────
//
// Without this a reader on night four sees a card with no way to book and
// reads it as broken. With it they read the true thing, which is that this is
// the same room as the night before and there is nothing to book twice.
//
// Written as guide content and not as an apology for a missing button, because
// that is what it is: how many nights in one place is a real fact about a trip
// and one a reader uses when they book.
export const sameBaseLine = (map, dayNo, days) => {
  const list = Array.isArray(days) ? days : [];
  const dayAt = (n) => list.find((d, i) => Number(d?.day || i + 1) === Number(n));
  const here = baseKey(dayAt(dayNo));
  if (!here) return "";
  // The nearest earlier night that HAS a door is the booking this night sits
  // under. If its base is the same, this is the same room.
  const first = Object.keys(map || {})
    .map(Number)
    .filter(n => n < Number(dayNo))
    .sort((a, b) => b - a)[0];
  if (!first || baseKey(dayAt(first)) !== here) return "";
  return `Same bed as night ${first}, so there is nothing new to book tonight.`;
};
