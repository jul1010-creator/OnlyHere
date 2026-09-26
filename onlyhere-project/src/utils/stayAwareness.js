// ── KNOWING WHERE THE BEDS ARE ──────────────────────────────────────
//
// Oliver, 26 Sep 2026: "I think we should program it, so it has awareness of
// where the hostels are located and where summerhouses are located."
//
// Until this file, the only thing the guide knew about a bed was what one web
// search per day happened to return, which on a small town is a booking
// aggregator with nothing in it. The hostel chip then carried one hand-written
// sentence about Aalborg, because that was the town he had looked up.
//
// Now the app holds the two lists in data/stayPlaces.js, read from each
// hostel's own site and each agency's own area page, and this file answers the
// questions the guide build asks of them:
//
//   which towns sell a dorm bed at all          hostelChipSays
//   which hostels are near this day's stops     hostelsNear, hostelBlock
//   which sommerhus coasts suit this whole trip houseAreasFor, houseAreaBlock
//   what a family could do from each coast      familyPlacesNear
//
// Everything here is a pure function of (data, points, places, date). The
// published places come IN as an argument rather than being imported, for the
// reason CostsBlock takes its rows: so a test can hand it three places, and so
// this file never decides which places exist.
import { HOSTELS, HOUSE_AREAS, STAY_TOWN_POINTS, STAY_PLACES_CHECKED_AT, DORM } from "../data/stayPlaces";
import { haversineKm } from "./helpers";
import { containsName } from "./danishNames";
import { hasTheme } from "./placeThemes";
import { placeCoords } from "./guideEnrichment";

const clean = (v) => String(v == null ? "" : v).trim();
const km = (a, b) => {
  const d = haversineKm(a, b);
  return Number.isFinite(d) ? d : null;
};
const round = (n) => Math.round(Number(n) || 0);
const uniq = (xs) => [...new Set(xs)];
const listed = (names) => {
  const xs = names.filter(Boolean);
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
};

// ── THE THREE ANSWERS A HOSTEL PAGE CAN GIVE ────────────────────────
export const sellsDorm = (h) => h?.dorm === DORM.yes;
// A child cannot take a bunk in a dorm whose own rule says adults only, which
// is most of Copenhagen's. A family room in the same building is still open to
// them, so this is about the BED, never about the hostel.
export const dormForKids = (h) => sellsDorm(h) && !h?.dormAdultsOnly;

// ── AND WHETHER IT IS OPEN THAT DAY ─────────────────────────────────
//
// Only for a row whose page prints ONE window. null means the page did not
// settle it, and null is never read as "closed": a hostel open all year prints
// no window either.
// A calendar day, read the way the rest of the app reads one: an ISO key as
// written, a Date by its LOCAL parts (see utils/calendarDay.js, whose dayKey
// formats from local parts). Reading a Date by UTC parts would put a Danish
// midnight on the previous day.
const mmdd = (d) => {
  if (!d) return null;
  if (d instanceof Date) {
    if (Number.isNaN(d.getTime())) return null;
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const m = /^\d{4}-(\d\d)-(\d\d)/.exec(clean(d));
  return m ? `${m[1]}-${m[2]}` : null;
};
export const hostelOpenOn = (h, date) => {
  if (!h?.season) return null;
  const on = mmdd(date);
  if (!on) return null;
  return on >= h.season.from && on <= h.season.to;
};
const windowWords = (s) => {
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const w = (x) => `${Number(x.slice(3))} ${M[Number(x.slice(0, 2)) - 1]}`;
  return `${w(s.from)} to ${w(s.to)}`;
};

// ── THE TOWNS, FROM THE DATA ────────────────────────────────────────
export const dormTowns = () => uniq(HOSTELS.filter(sellsDorm).map(h => h.town));
export const hostelTowns = () => uniq(HOSTELS.map(h => h.town));
// A town where Gemlyx found hostels and EVERY one of them sells rooms only.
// "unclear" keeps a town off this list, because a page that did not settle it
// has not said no.
export const roomsOnlyTowns = () => hostelTowns().filter(t => {
  const here = HOSTELS.filter(h => h.town === t);
  return here.length > 0 && here.every(h => h.dorm === DORM.no);
});

// ── WHAT THE HOSTEL CHIP TELLS THE PLANNER ──────────────────────────
//
// This replaces a sentence written by hand on the day he looked up Aalborg.
// Same three things, now answered by the list rather than by one town: where a
// dorm bed exists, that most Danish hostels sell rooms, and what to do in a
// town without one. The towns it names cannot drift from the rows, because it
// is the rows.
//
// NO TRAVEL MODE WORD in any of it. This goes into the transcript as a hidden
// turn, and travelModeKey reads a sentence for its slowest mode. tests/run.mjs
// holds this against every mode reader.
export const hostelChipSays = () => {
  const dorms = dormTowns();
  const roomsOnly = roomsOnlyTowns();
  const named = ["Aalborg", "Skagen", "Esbjerg", "Odense"].filter(t => roomsOnly.includes(t) || !hostelTowns().includes(t));
  const without = named.filter(t => !hostelTowns().includes(t));
  const rooms = named.filter(t => roomsOnly.includes(t));
  return [
    "IMPORTANT: not every Danish town has a hostel with dormitories.",
    `Gemlyx has checked every Danhostel and the private hostels on their own sites, and a bed in a shared room is sold only in ${listed(dorms)}.`,
    "Most Danish hostels sell whole rooms, family rooms included, rather than single beds.",
    rooms.length ? `${listed(rooms)} ${rooms.length > 1 ? "have" : "has"} hostels with private rooms only.` : "",
    without.length ? `Gemlyx has no checked hostel at all in ${listed(without)}.` : "",
    "Most dormitories in Copenhagen are for adults only, so a family takes a room.",
    "If the town you are proposing has no hostel dorm, say so plainly and price the cheapest real bed there instead of repeating the figure in their budget.",
  ].filter(Boolean).join(" ");
};

// ── WHERE A DAY IS ──────────────────────────────────────────────────
//
// `resolve` is the app's own stop resolver, injected (published coordinate,
// then the town centre). This adds one fallback it does not have: the ~55 town
// centres read for this file, which cover towns TOWN_COORDS never listed. Exact
// name matches only, both directions, the same rule lookupRealPlace uses for a
// town, so "Vejlebrovej" is not Vejle.
export const stayPointFor = (name) => {
  const n = clean(name);
  if (!n) return null;
  const key = Object.keys(STAY_TOWN_POINTS).find(k => containsName(n, k) && containsName(k, n));
  if (key) return { lat: STAY_TOWN_POINTS[key][0], lon: STAY_TOWN_POINTS[key][1] };
  const area = HOUSE_AREAS.find(a => containsName(n, a.name) && containsName(a.name, n));
  return area ? { lat: area.lat, lon: area.lon } : null;
};
export const dayPoints = (day, resolve = null) => {
  const out = [];
  for (const st of (day?.stops || [])) {
    const name = clean(st?.name);
    const town = clean(st?.town);
    let p = null;
    try { p = resolve ? resolve(name, town) : null; } catch { p = null; }
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) p = stayPointFor(town) || stayPointFor(name);
    if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) out.push({ lat: p.lat, lon: p.lon });
  }
  return out;
};

const nearestTo = (points, target) => {
  let best = null;
  for (const p of points) {
    const d = km(p, target);
    if (d != null && (best == null || d < best)) best = d;
  }
  return best;
};

// ── THE HOSTELS NEAR A DAY ──────────────────────────────────────────
export const HOSTEL_NEAR_KM = 25;
export const HOSTEL_LINES = 5;
export const hostelsNear = (points, { within = HOSTEL_NEAR_KM } = {}) =>
  HOSTELS.map(h => ({ ...h, km: nearestTo(points || [], h) }))
    .filter(h => h.km != null && h.km <= within)
    .sort((a, b) => a.km - b.km);
export const nearestDorm = (points, { kids = false } = {}) =>
  HOSTELS.filter(kids ? dormForKids : sellsDorm)
    .map(h => ({ ...h, km: nearestTo(points || [], h) }))
    .filter(h => h.km != null)
    .sort((a, b) => a.km - b.km)[0] || null;

export const hostelLine = (h, { kids = false, date = null } = {}) => {
  const what = h.dorm === DORM.yes ? "sells a bed in a shared room"
    : h.dorm === DORM.no ? "sells whole rooms only, no dorm beds"
    : "its own page does not say whether it sells single beds";
  const parts = [`${h.name}, ${h.town}, about ${round(h.km)} km from this day's stops: ${what} (its page: "${h.dormSays}").`];
  if (kids && sellsDorm(h) && h.dormAdultsOnly) parts.push(`Its dorms are adults only ("${h.ageSays}"), so for this family it is a room or nothing.`);
  const open = hostelOpenOn(h, date);
  if (open === false) parts.push(`Its page lists it open ${windowWords(h.season)}, which this night falls outside, so do not recommend it for this night.`);
  if (h.note) parts.push(h.note);
  return parts.join(" ");
};

// ── THE BLOCK THE PER-DAY CALL READS ────────────────────────────────
//
// Shaped exactly like the island directory block beside it, and for the same
// reason: that call may only name a property the context names, and this is
// context it can trust, because every name here was read on its own site.
//
// `wantsDorm` is the hostel chip. With it ticked, a day with no dorm bed near
// it has to SAY so rather than let a room pass for a bunk; that is the
// Aalborg rule, now answered for every town rather than one.
export const hostelBlock = (points, { wantsDorm = false, kids = false, date = null, within = HOSTEL_NEAR_KM } = {}) => {
  if (!Array.isArray(points) || !points.length) return "";
  const near = hostelsNear(points, { within });
  const openNear = near.filter(h => hostelOpenOn(h, date) !== false);
  const usable = openNear.filter(h => (kids ? dormForKids(h) : sellsDorm(h)));
  const lines = [];
  if (near.length) {
    // ── AND NOT TEN OF THEM ─────────────────────────────────────
    // Central Copenhagen has ten checked hostels within four km of any stop,
    // and a block that long is read as a list to work through rather than as
    // context. The ones that answer THIS traveller go first (a bed a child may
    // take, for a family; a bed at all, for anybody on the hostel chip), then
    // the nearest, and the block says how many it left out.
    const fits = (h) => (kids ? dormForKids(h) || h.dorm === DORM.no : sellsDorm(h));
    const ordered = [...near].sort((a, b) => (fits(b) - fits(a)) || (a.km - b.km));
    const shown = ordered.slice(0, HOSTEL_LINES);
    lines.push(`HOSTELS GEMLYX HAS CHECKED within about ${within} km of this day's stops, each read on its own site on ${STAY_PLACES_CHECKED_AT}${near.length > shown.length ? ` (${shown.length} of ${near.length} shown)` : ""}:`);
    shown.forEach(h => lines.push(`- ${hostelLine(h, { kids, date })}`));
    lines.push("THIS LIST COUNTS AS CONTEXT FOR recommendedStay: a hostel on it may be returned there, spelled exactly as it is here. Never call a hostel that sells whole rooms a dorm, and never put a price on one that is not in the search context.");
  } else {
    lines.push(`GEMLYX HAS CHECKED EVERY DANHOSTEL AND THE PRIVATE HOSTELS, and none is within about ${within} km of this day's stops.`);
  }
  if (wantsDorm && !usable.length) {
    const far = nearestDorm(points, { kids });
    lines.push(`THEY ASKED FOR A HOSTEL BED AND THERE IS NO ${kids ? "DORM THAT TAKES CHILDREN" : "DORM BED"} NEAR THIS DAY. Say so plainly in 'accommodation', in one clause, and then recommend the cheapest real bed here${near.length ? ", which may be a hostel room from the list above" : ""}. Do not write hostel dorm, bunk or backpacker bed for this night.${far ? ` The nearest ${kids ? "dorm that takes children" : "dorm bed"} Gemlyx knows is ${far.name} in ${far.town}, about ${round(far.km)} km away; mention it only if the route passes that way.` : ""}`);
  }
  return lines.join("\n");
};

// ── WHAT A FAMILY COULD DO FROM A COAST ─────────────────────────────
//
// WORKED OUT, NEVER STORED. A published place with the Family theme, or one
// whose own name says what it is (a sommerland, a zoo, a waterpark), within
// reach of the area. His example was a family near the amusement parks on
// Jutland; the parks are published entries, so this reads them from the app
// rather than from a second list that would go stale beside the first.
const FAMILY_NAME = /\b(?:sommerland|legoland|lalandia|zoo|dyrepark|akvarium|aquarium|badeland|vandland|waterpark|water park|forlystelsespark|amusement park|theme park|legeland|legepark|tivoli)\b/i;
export const isFamilyPlace = (p) =>
  hasTheme(p, "family") || FAMILY_NAME.test(`${clean(p?.name)} ${clean(p?.category)}`);
export const FAMILY_NEAR_KM = 35;
export const familyPlacesNear = (point, places = [], { within = FAMILY_NEAR_KM } = {}) => {
  const seen = new Set();
  return (Array.isArray(places) ? places : [])
    .filter(isFamilyPlace)
    .map(p => ({ name: clean(p.name), c: placeCoords(p) }))
    .filter(p => p.name && p.c)
    .map(p => ({ name: p.name, km: km(point, p.c) }))
    .filter(p => p.km != null && p.km <= within)
    .sort((a, b) => a.km - b.km)
    .filter(p => (seen.has(p.name) ? false : (seen.add(p.name), true)));
};

// ── WHICH COAST SUITS THE WHOLE TRIP ────────────────────────────────
//
// A sommerhus is one base for the week, so it is measured against EVERY stop
// of the trip, not one day's. The first version ranked by the FURTHEST stop,
// and the first real build showed why that is wrong: a north Jutland family
// week with Fårup Sommerland on two of its days and Skagen on one got
// Skallerup, 29 km from the park, because Skagen pulled the answer north. The
// chat, reading the same trip, had already said Blokhus. The furthest stop is
// one day; the AVERAGE drive is every day, so that is what ranks now.
//
// With children on the trip, the nearest family place pulls the area in, by
// up to FAMILY_PULL_KM when the park is on the doorstep and nothing when it
// is at the edge of reach. A park is worth a few kilometres of driving a day,
// not a coast on the wrong side of the country.
export const HOUSE_AREA_PICKS = 5;
export const FAMILY_PULL_KM = 15;
export const houseAreasFor = (points, { places = [], kids = false, limit = HOUSE_AREA_PICKS } = {}) => {
  const pts = (Array.isArray(points) ? points : []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
  if (!pts.length) return [];
  const scored = HOUSE_AREAS.map(a => {
    const each = pts.map(p => km(p, a)).filter(d => d != null);
    if (!each.length) return null;
    const meanKm = each.reduce((x, y) => x + y, 0) / each.length;
    const family = familyPlacesNear(a, places);
    const pull = kids && family.length ? FAMILY_PULL_KM * Math.max(0, 1 - family[0].km / FAMILY_NEAR_KM) : 0;
    return { ...a, meanKm, worstKm: Math.max(...each), family, score: meanKm - pull };
  }).filter(Boolean);
  return scored.sort((a, b) => a.score - b.score || a.meanKm - b.meanKm).slice(0, limit);
};

// ── AND ONE HOUSE, NOT SEVEN GUESSES AT WHERE IT IS ─────────────────
//
// The same build: day one chose Skallerup, and the six nights after it put the
// house "near Skagen", "near Løkken", "near Aalborg" and "around Saltum",
// because each night is its own call and none of them could see day one's
// answer. They run in parallel, so they cannot be told it either. So the CODE
// picks the base, once, and every night is told the same name.
export const houseBase = (points, opts = {}) => houseAreasFor(points, opts)[0] || null;
export const houseNightSays = (base) => base
  ? `THE HOUSE IS AT ${base.name.toUpperCase()}, on the ${base.coast} coast near ${base.nearTown}, the base day one recommended. Say they drive back to the house at ${base.name}, and never place it anywhere else.`
  : "";

// A trip whose stops are further apart than this cannot share one house. It is
// the far end of a day trip out and back by car, and past it the honest answer
// is that a sommerhus does not suit the route rather than a coast in the middle.
export const ONE_BASE_KM = 90;
const spreadOf = (points) => {
  let most = 0;
  for (const a of points) for (const b of points) { const d = km(a, b); if (d != null && d > most) most = d; }
  return most;
};

export const houseAreaLine = (a) => {
  const coast = a.coast ? ` on the ${a.coast} coast` : "";
  const town = a.kmToTown ? `, ${a.kmToTown} km from ${a.nearTown}` : `, near ${a.nearTown}`;
  const who = a.agencies?.length ? ` Houses there are let by ${listed(a.agencies)}.` : "";
  const fam = a.family?.length
    ? ` Family places Gemlyx has published within ${FAMILY_NEAR_KM} km: ${a.family.slice(0, 3).map(f => `${f.name} (about ${round(f.km)} km)`).join(", ")}.`
    : "";
  return `${a.name}${coast}${town}; the trip's stops average about ${round(a.meanKm)} km from it.${who}${fam}`;
};

export const houseAreaBlock = (points, { places = [], kids = false } = {}) => {
  const pts = (Array.isArray(points) ? points : []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
  if (!pts.length) return "";
  const picks = houseAreasFor(pts, { places, kids });
  if (!picks.length) return "";
  const [base, ...others] = picks;
  const spread = spreadOf(pts);
  const lines = [`THE SOMMERHUS BASE GEMLYX HAS PICKED for this trip, from the areas a holiday-house agency's own page confirmed on ${STAY_PLACES_CHECKED_AT}:`];
  lines.push(`- ${houseAreaLine(base)}`);
  lines.push(`Return '${base.name}' as 'recommendedStay', spelled exactly so, and say in 'accommodation' which town it is near and that it is booked by the week through a holiday-house agency. Every other night of this guide is told the house is at ${base.name}, so do not suggest a different area.`);
  if (others.length) lines.push(`Other checked areas near this trip, for context only: ${others.map(a => `${a.name} (near ${a.nearTown})`).join(", ")}.`);
  lines.push("Name a family place only if it is on this list. Write no dashes: commas and full stops only.");
  if (kids && base.family?.length) lines.push("There are children on this trip and the base was chosen partly for the family place in reach: say which, and how far.");
  if (spread > ONE_BASE_KM) lines.push(`THIS TRIP'S STOPS ARE ABOUT ${round(spread)} KM APART, too far for one house to be the base for all of them. Say so plainly in 'accommodation': the house suits the part of the trip near it, and the rest is a long day out or a night elsewhere.`);
  return lines.join("\n");
};
