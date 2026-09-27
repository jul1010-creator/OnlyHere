// ── A TRIP FROM ONE HOLIDAY HOUSE ───────────────────────────────────
//
// Oliver, 27 Sep 2026, of guide bh99oe98lje: "this guide chose a
// summerhouse, yet filled a bunch of booking.com affiliates in." Nine days
// from one house on Rømø, and every night's card carried "Find a room on
// Booking.com", seven of them, because the page split the stay wherever a
// day ended in a different town and offered a hotel for each piece.
//
// A sommerhus is one booking for the whole stay with a holiday-house agency.
// So a guide that is one needs to know it is one, and everything that offers
// a bed reads this instead of guessing: one stay covering every night, one
// link to houses near the base on the trip's dates, and no hotel search.
//
// ── HOW A GUIDE SAYS IT IS ONE ──────────────────────────────────────
//
// New guides carry the traveller's own pick as `_stay.kind`, set at build time
// in App.jsx. Guides built before that carry nothing, and the one he sent is
// one of them, so a guide with no pick recorded is read from its own first
// night: the where-to-stay text names a holiday house. A guide whose recorded
// pick is anything else is never read as a house, whatever its text says.
import { HOUSE_AREAS } from "../data/stayPlaces";
import { containsName } from "./danishNames";
import { dayStart } from "./calendarDay";
import { houseSearchUrl } from "./summerhouse";

const HOUSE_WORDS = /\b(?:sommerhus\w*|summer ?houses?|holiday (?:house|home|cottage)s?|feriehus\w*)\b/i;

const firstNightOf = (guide) => (Array.isArray(guide?.days) ? guide.days : []).find(d => d?.glance?.accommodation || d?.glance?.recommendedStay) || null;

export const houseTripOf = (guide) => {
  const kind = String(guide?._stay?.kind || "");
  if (guide?._stay?.booked) return null;
  if (kind && kind !== "summerhouse") return null;
  const night = firstNightOf(guide);
  const text = [night?.glance?.recommendedStay, night?.glance?.stayArea, night?.glance?.accommodation].filter(Boolean).join(" ");
  if (!kind && !HOUSE_WORDS.test(text)) return null;
  // The base: the one the build recorded, else a checked coast the first
  // night names, the recommended stay first because the day card is told to
  // return the base's name there.
  const named = String(guide?._stay?.house || "");
  const said = [named, night?.glance?.recommendedStay, night?.glance?.stayArea, night?.glance?.accommodation].filter(Boolean);
  const area = said.map(t => HOUSE_AREAS.find(a => containsName(t, a.name))).find(Boolean) || null;
  return { name: area?.name || named || String(night?.glance?.recommendedStay || "").trim(), area };
};

// Who the search is for, off what the guide carries: the counted party first,
// then a number in what they typed, else two.
const partyFor = (guide) => {
  const p = guide?._party || null;
  const typed = String(guide?._travelers || "").match(/\d+/);
  const total = Number(p?.total) || (typed ? Number(typed[0]) : 0) || 2;
  const kids = Number(p?.kids) || 0;
  const adults = Number(p?.adults) || Math.max(1, total - kids);
  return { adults, kids };
};

// The one link, for the nights that still need a bed.
export const houseDoor = (guide, nights = []) => {
  const trip = houseTripOf(guide);
  if (!trip) return null;
  const list = (Array.isArray(nights) ? nights : []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!list.length) return null;
  const start = dayStart(guide?._arrivalDate);
  const arrival = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + list[0] - 1) : null;
  const { adults, kids } = partyFor(guide);
  const href = houseSearchUrl({ area: trip.area?.name || "", arrival, nights: list.length, adults, kids });
  return {
    href,
    place: trip.name,
    // Only a search IN the area may carry the area's name.
    area: !!trip.area,
    label: trip.area ? `Houses near ${trip.area.name} on Novasol` : "Holiday houses on Novasol",
    nights: list,
  };
};

// What the later nights say, in place of "Same bed as night 1".
export const sameHouseLine = (first) => `Same house as night ${first}, so there is nothing new to book tonight.`;
