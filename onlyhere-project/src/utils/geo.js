import { nextWeekdayTimestamp, arrivalRow } from "./helpers";

// Empirically checks real late-night transit — not the AI's guess — for both a
// weekday and a weekend night, since Danish night transport genuinely differs
// between them (same reason UK transport stops earlier on weeknights than
// Fri/Sat). Runs BEFORE the draft is written, so the model's own first output
// is grounded in real data instead of something that needs correcting after.
export const checkNightTransport = async (originLat, originLon, destLat, destLon) => {
  const origin = `${originLat},${originLon}`;
  const destination = `${destLat},${destLon}`;
  const checks = {
    weekday: nextWeekdayTimestamp(3, 1), // next Wednesday, 1am — representative weeknight
    weekend: nextWeekdayTimestamp(6, 3), // next Saturday, 3am — the real peak-nightlife night
  };
  const results = {};
  for (const [key, ts] of Object.entries(checks)) {
    try {
      const res = await fetch(`/api/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=transit&departure_time=${ts}`);
      const data = await res.json();
      results[key] = data.error ? "no real transit route found at this hour" : `real route exists — ${data.durationText}`;
    } catch {
      results[key] = "check failed — could not confirm either way";
    }
  }
  return results;
};

// Geocodes a place name to real coordinates — the "immutable data" anchor from
// Gemini's pipeline report. This gets computed ONCE, programmatically, and never
// touched by OpenAI, instead of asking the model to state a lat/lon in its own
// JSON (which is exactly where coordinate hallucination happens — it "smooths"
// a real number into something that reads naturally but isn't the real one).
export const geocodePlace = async (query) => {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Denmark")}&format=json&limit=1&countrycodes=dk`);
    const data = await r.json();
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch { return null; }
};

// ── THE NEAREST STOP, NOT THE NEAREST STATION ───────────────────────
// Two complaints, one day apart, and they turn out to be the same bug.
//
// Oliver, 7 Aug 2026: "the draft now just made a 'nearestStation' a bus stop. I
// thought we fixed that."
// Oliver, minutes later: "Maybe it shouldn't be nearest station, but nearest
// stop. If it's an Island, this will often be awkward."
//
// What was fixed before was the LABEL. arrivalRow() reads the value and calls
// the row Nearest Bus Stop, Terminal, Airport or Station to match, so nothing
// on screen was lying. But the VALUE is chosen here, and it was simply "the
// nearest thing Google files under transit_station", which includes bus
// shelters. In a Danish town that is very often a shelter 200 m away while the
// railway station is 900 m down the road, and the railway station is what a
// traveler is planning around.
//
// His island point is the sharper one, and it kills the whole idea of a
// "nearest station". Ærøskøbing has no station and never will. Sønderho on Fanø
// is two kilometres from Esbjerg Station in a straight line, across open water:
// a radius search finds it, and putting it in a field a traveler plans around
// is a confident wrong answer. The way you reach a Danish island is a FERRY.
//
// So three tiers, asked in the order a traveler actually thinks in:
//   1. RAIL, in a wide search. Where rail exists it is nearly always the answer.
//   2. FERRY TERMINAL, wider still. On an island it IS the arrival point, and
//      the berth can sit several kilometres from the village it serves.
//   3. ANY transit stop, close only. A bus shelter is a fine answer when it is
//      the only one; it just must not outrank a station or a harbour.
//
// AND EVERY CANDIDATE MUST BE WALKABLE FROM THE PLACE. That single gate is what
// fixes the island case: there is no footpath from Sønderho to Esbjerg Station,
// so Google returns ZERO_RESULTS and the rail tier is rejected, and the ferry
// terminal at Nordby wins instead. A routing engine's own index saying "no path"
// is real evidence. An API key error is not, so only an explicit no-route
// verdict rejects a candidate; any other failure keeps it and drops the walk
// time. (That distinction is the same rule this project already applies to
// Places lookups: never conclude a fact from a failed lookup.)
const TIERS = [
  { kind: "rail",  types: "train_station,subway_station,light_rail_station", radius: 3000 },
  { kind: "ferry", types: "ferry_terminal",                                  radius: 6000 },
  { kind: "any",   types: "transit_station",                                 radius: 1500 },
];

// Google's own status strings for "I looked and there is no route", as opposed
// to "I could not look". Only these are allowed to rule a candidate out.
const NO_ROUTE = /ZERO_RESULTS|NOT_FOUND|No route found/i;

// ── IS THIS ACTUALLY TRANSIT? ────────────────────────────────
// Oliver, 6 Aug 2026: the At a Glance row read "Tranekær Slot (Langeland
// Kommune) (9 mins walk)" as the nearest STATION. Tranekær Slot is a castle.
//
// Google's transit search does not reliably return transit in rural Denmark;
// where there is nothing nearby it hands back the most prominent point of
// interest instead. A name carrying a "(... Kommune)" suffix is the giveaway:
// that is how the Places API formats a locality or landmark, never a stop.
const NOT_TRANSIT = /\(.*kommune\)|\bslot\b|\bkirke\b|\bmuseum\b|\bkro\b|\bcamping\b|\bstrand\b|\bfyr\b|\bmølle\b|\bcastle\b|\bchurch\b/i;
const LOOKS_TRANSIT = /\bst\.?\b|station|banegård|banegaard|havn|terminal|færge|faerge|ferry|holdeplads|busstop|bus stop|rutebil|lufthavn|airport|metro|letbane/i;
// ── ASK GOOGLE WHAT IT IS, DO NOT READ THE NAME ─────────────────────
// Oliver, 8 Aug 2026: a published draft carried
//   "nearestStation": "Logistik-Optimering v/Bo Trygve Mortensen"
// which is a freight consultancy named after the man who runs it.
//
// It passed because looksLikeTransit is a BLOCKLIST: it only rejects a name
// that matches a known non-transit word (slot, kirke, museum, kommune). A
// company name, a person's name, a shop, a car park, anything not on that list
// walks straight through. The list can never be finished, because the space of
// things that are not a bus stop is infinite.
//
// Google already answers this properly. api/places.js asks for `types` and
// `primaryType` in its FieldMask, and every real stop carries one of these.
// That is authoritative and the name is not, so the type decides and the name
// is only consulted when the types are missing, which is the honest fallback
// rather than rejecting something we simply were not told about.
const TRANSIT_TYPES = new Set(["transit_station", "train_station", "subway_station",
  "light_rail_station", "bus_station", "bus_stop", "ferry_terminal", "airport",
  "international_airport", "heliport", "park_and_ride", "transit_depot"]);

export const hasTransitType = (place) => {
  const types = Array.isArray(place?.types) ? place.types : [];
  const primary = place?.primaryType;
  if (!types.length && !primary) return null;      // not told, so not concluded
  if (primary && TRANSIT_TYPES.has(primary)) return true;
  return types.some(t => TRANSIT_TYPES.has(t));
};

export const looksLikeTransit = (name) => {
  const n = String(name || "");
  if (!n.trim()) return false;
  return !(NOT_TRANSIT.test(n) && !LOOKS_TRANSIT.test(n));
};

// A name alone can tell us a bus shelter from a harbour often enough to be
// worth doing, for the tier that asked for "anything".
//
// DELIBERATELY BUILT ON arrivalRow RATHER THAN ITS OWN REGEXES. The first draft
// of this duplicated the patterns and immediately disagreed with the label the
// user would see: it called "Rutebilstation" rail, because its own rail test
// matched the word "station" inside a Danish word meaning coach station, while
// arrivalRow correctly said bus stop. Two lists of Danish transport nouns will
// always drift. One list, read twice, cannot.
const LABEL_TO_KIND = {
  "Ferry Terminal": "ferry",
  "Nearest Bus Stop": "bus",
  "Nearest Airport": "air",
  "Nearest Metro": "rail",
  "Nearest Station": "rail",
  "Nearest Stop": "other",
};
export const kindFromName = (name) => LABEL_TO_KIND[arrivalRow(name).label] || "other";

// The walking check. Returns null when there is genuinely no footpath, which is
// how an island is detected without ever having to know it is an island.
const walkTo = async (lat, lon, place) => {
  // BUG FIX kept from before: this once sent mode=walk, which isn't one of
  // api/directions.js's validModes (driving/walking/bicycling/transit). An
  // invalid mode silently fell back to "transit", so every "walking distance to
  // nearest station" in the app was actually a TRANSIT time mislabeled.
  try {
    const dirRes = await fetch(`/api/directions?origin=${lat},${lon}&destination=${place.lat},${place.lon}&mode=walking`);
    const dir = await dirRes.json();
    if (dir.error) return NO_ROUTE.test(String(dir.error)) ? null : { walk: null };
    return { walk: dir.durationText || null, minutes: dir.durationMinutes ?? null };
  } catch {
    return { walk: null };   // the lookup failed, which says nothing about the path
  }
};

export const findRealNearestStop = async (lat, lon) => {
  for (const tier of TIERS) {
    let place = null;
    try {
      const r = await fetch(`/api/places?lat=${lat}&lon=${lon}&type=${tier.types}&radius=${tier.radius}`);
      const d = await r.json();
      if (!d.error && d.name) place = d;
    } catch { continue; }          // this tier is unavailable, try the next one
    if (!place) continue;
    // The type is the real answer. The name is the fallback for a response that
    // did not carry one, and a second opinion is never needed when Google has
    // already said what the thing is.
    const byType = hasTransitType(place);
    if (byType === false) continue;
    if (byType === null && !looksLikeTransit(place.name)) continue;

    const reach = await walkTo(lat, lon, place);
    if (reach === null) continue;  // no footpath: across water, or otherwise cut off

    // The walk time is deliberately NOT folded into the name. The At a Glance
    // row renders this value after a label, so appending it produced
    // "Nearest Station: X (9 mins walk)", which reads as part of the name.
    return {
      name: place.name,
      walk: reach.walk,
      walkMinutes: reach.minutes ?? null,
      kind: tier.kind === "any" ? kindFromName(place.name) : tier.kind,
    };
  }
  return null;   // "we do not know" is a true statement; naming a castle is not
};

// The old name, kept because App.jsx and the Detour code both call it and a
// rename across a 700 KB file buys nothing.
export const findRealNearestStation = findRealNearestStop;

// Back-compatible string form: the plain station name, nothing appended.
export const nearestStationName = async (lat, lon) => {
  const r = await findRealNearestStation(lat, lon);
  return r?.name || null;
};
