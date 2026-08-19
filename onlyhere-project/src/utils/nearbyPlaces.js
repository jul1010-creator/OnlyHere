// ── WHAT IS ACTUALLY NEAR THIS PIN ───────────────────────────────────
//
// Oliver, 17 Aug 2026, on the guide map:
//
//   "Can you make a design that when you click on one of them, you instantly fly
//    down to the area? And then it pops up in the right corner where you read
//    shortly about its location or something. An example can be 'Amalienborg Slot
//    is located close to... very convinient when you... bla bla bla..' just
//    shortly. Also make the map look a little more realistic. Having some of our
//    written tourism attractions written down. It's close to King's Garden. So
//    that could be shown on the map."
//
// The card and the extra map labels are the same question asked once: what else
// of ours is near this point. So one function answers it, and everything on
// screen is built from that answer.
//
// ── AND NOT ONE WORD OF IT IS WRITTEN BY A MODEL ─────────────────────
// This is the part that decides whether the feature belongs in this product. "It
// is close to King's Garden" is a claim about the world, and the obvious build is
// to ask a model for a sentence. That would put an unsourced geographic assertion
// on a map, which is the most trusted surface in the app, in the same week the
// chat was caught quoting a restaurant and a price band out of a model's memory.
//
// So the sentence is arithmetic. Every distance is haversine between two stored
// coordinates, every name is a row he published himself, and if there is nothing
// near the pin it says the town and stops. The output can be dull. It cannot be
// wrong.
//
// He noted "(I obviously haven't written King's Garden in yet..)", which is
// exactly right and is the point: as his library grows this gets better on its
// own, with no prompt to tune, and until then it says less.
import { haversineKm } from "./helpers";
import { placeCoords } from "./guideEnrichment";

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// ── HOW FAR IS NEAR ─────────────────────────────────────────────────
// 1.2 km. Two reasons for that number rather than a rounder one: it is about
// fifteen minutes on foot, which is the distance at which "close to" stops being
// true for somebody carrying a toddler, and Copenhagen's whole medieval core fits
// inside it, so a pin in the centre gets neighbours without collecting the entire
// city.
export const NEAR_KM = 1.2;

// A comfortable walking pace, and it is stated as an assumption rather than
// dressed up as a measurement. 4.5 km/h is the slow end of normal, because a
// number that turns out to be optimistic is worse than one that turns out to be
// generous when somebody is deciding whether to walk it with children.
export const WALK_KMH = 4.5;
export const walkMinutes = (km) => {
  const n = Number(km);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.max(1, Math.round((n / WALK_KMH) * 60));
};

// ── HOW FAR IS "WORTH THE SAME TRIP" ────────────────────────────────
// A second radius, for a second question, and the two are not interchangeable.
// NEAR_KM answers "can I walk to it from this pin". This one answers "is there
// anything else around here at all", which is what the map on an entry's page is
// for: orientation, not routing. 30 km is about a day's realistic detour by car
// or regional train in Denmark and still narrow enough that it does not mean "in
// the region".
//
// It lives here rather than in DetailPage.jsx because that is where the copy of
// this whole function used to live. See the note on nearbyEntries below.
export const SAME_VISIT_KM = 30;
// Five. The map's job is orientation; a dozen pins is a different feature.
export const SAME_VISIT_LIMIT = 5;

// ── THE LIBRARY, FLATTENED ──────────────────────────────────────────
// Only rows that carry a real coordinate, because a row without one cannot be
// said to be near anything.
//
// ── AND THERE WAS A SECOND COPY OF ALL OF THIS ──────────────────────
// DetailPage.jsx had its own `nearbyEntries`: same question, own flat-earth
// distance formula, own radius, own limit, own self-exclusion rule, and NO TESTS.
// It read `__lat` and nothing else, so every row in his library carrying a plain
// `lat` was invisible to it — the identical fault that made partOfCountry report
// no content in South Jutland on 19 Aug, in a function nobody had connected to
// that bug. A published entry could get a map with the pin on it and not one
// neighbour, and the page would say "the pale dots are other Gemlyx entries
// nearby" over an empty map.
//
// Worse than the blindness: the pin and the dots resolved the place DIFFERENTLY.
// The pin fell back to the town centre when a coordinate was missing, this did
// not. Two instruments, one question, disagreeing — which is the habit that has
// already cost this codebase two walking-time estimates and four coordinate
// lookups. So there is now one, it is this one, and it is under test.
//
// A TOWN ROW IS EXCLUDED BY DEFAULT and included on request. For the guide-map
// card, "close to Copenhagen" is not a fact worth printing on a pin already in
// Copenhagen. For the mini-map on an entry's page, a nearby town is the single
// most useful dot on it. Same data, opposite answers, so the caller says which.
export const placedLibrary = (pools = {}, { includeTowns = false } = {}) => {
  const out = [];
  Object.entries(pools).forEach(([kind, rows]) => {
    if ((kind === "town" && !includeTowns) || !Array.isArray(rows)) return;
    rows.forEach(r => {
      const c = placeCoords(r);
      const name = clean(r?.name);
      if (!c || !name) return;
      // `row` carries the original through, so a caller that opens a neighbour
      // opens the real entry rather than this flattened shadow of it. Nothing
      // reads it here; DetailPage's tap handler needs it.
      out.push({ name, kind, lat: c.lat, lon: c.lon, id: r?.id ?? null, type: clean(r?.type || r?.category || ""), row: r });
    });
  });
  return out;
};

// ── WHAT IS NEAR, NEAREST FIRST ─────────────────────────────────────
// The pin itself is excluded by NAME as well as by distance, because a stop and
// the published row it came from are the same place and "Amalienborg is 0 minutes
// from Amalienborg" is the kind of sentence that makes a reader stop trusting a
// page.
export const nearbyPublished = (point, library, { maxKm = NEAR_KM, limit = 3, exclude = "" } = {}) => {
  const lat = Number(point?.lat), lon = Number(point?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
  const skip = clean(exclude).toLowerCase();
  return (Array.isArray(library) ? library : [])
    .map(r => ({ ...r, km: haversineKm({ lat, lon }, { lat: r.lat, lon: r.lon }) }))
    .filter(r => Number.isFinite(r.km) && r.km <= maxKm)
    .filter(r => r.name.toLowerCase() !== skip && r.km > 0.02)
    .sort((a, b) => a.km - b.km)
    .slice(0, Math.max(0, limit))
    .map(r => ({ ...r, walk: walkMinutes(r.km) }));
};

// A distance a person can act on. Under a kilometre nobody wants three decimal
// places, and over it nobody wants metres.
export const distanceWords = (km) => {
  const n = Number(km);
  if (!Number.isFinite(n)) return "";
  if (n < 1) return `${Math.round(n / 0.05) * 50} m`;
  return `${n.toFixed(1)} km`;
};

// ── THE CARD'S SENTENCE ─────────────────────────────────────────────
// Short, as he asked. At most two neighbours, because three is a list and a list
// is not a sentence.
//
// AN APPROXIMATE PIN GETS NO DISTANCES AT ALL. A stop plotted at the middle of its
// town is not at a known point, so every metre measured from it would be measured
// from somewhere the place is not. It says which town and says that plainly, which
// is the whole of what is known.
export const describeLocation = (stop, nearby, { town = "" } = {}) => {
  const name = clean(stop?.name);
  const where = clean(town || stop?.town);
  const head = where ? `In ${where}.` : "";
  if (stop?.approx) {
    return [head, "This pin is the middle of the town rather than the door, so nothing here is measured from the place itself."]
      .filter(Boolean).join(" ");
  }
  const list = (Array.isArray(nearby) ? nearby : []).slice(0, 2);
  if (!list.length) {
    return [head, `Nothing else in our own guides is within a ${Math.round(NEAR_KM * 1000)} m walk of ${name || "this stop"} yet.`]
      .filter(Boolean).join(" ");
  }
  const bit = (r) => `${r.name}, ${distanceWords(r.km)} away${r.walk ? ` (about ${r.walk} min on foot)` : ""}`;
  const tail = list.length === 1
    ? `Closest thing of ours: ${bit(list[0])}.`
    : `Closest of ours: ${bit(list[0])}, then ${bit(list[1])}.`;
  return [head, tail].filter(Boolean).join(" ");
};

// One line for the map itself, under the pin, when a reader has flown down to it.
// Deliberately shorter than the card: on the map there is no room for a sentence.
export const nearbyLabel = (r) => `${r.name} · ${distanceWords(r.km)}`;
