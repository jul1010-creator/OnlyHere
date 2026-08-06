import { nextWeekdayTimestamp } from "./helpers";

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

// Finds the REAL nearest station via Google Places (not a straight-line/radius
// guess) then confirms the actual WALKING time via Directions — straight-line
// distance alone is exactly what breaks for a site like Rosenborg, walled off
// by its own gardens, where the geometrically-closest station isn't the one a
// pedestrian can actually reach quickly.
export const findRealNearestStation = async (lat, lon) => {
  try {
    const placeRes = await fetch(`/api/places?lat=${lat}&lon=${lon}&type=transit_station`);
    const place = await placeRes.json();
    if (place.error || !place.name) return null;
    // BUG FIX: this was sending mode=walk, which isn't one of api/directions.js's
    // validModes (driving/walking/bicycling/transit) — an invalid mode silently
    // fell back to "transit", so every "walking distance to nearest station"
    // shown across the app (Studio's frozen facts, Detour's highlight-distance
    // check) was actually a TRANSIT time mislabeled as a walk — real source of
    // wildly-off-looking estimates.
    // ── IS THIS ACTUALLY A STATION? ──────────────────────────────
    // Oliver, 6 Aug 2026: the At a Glance row read "Tranekær Slot (Langeland
    // Kommune) (9 mins walk)" as the nearest STATION. Tranekær Slot is a castle.
    //
    // Google's transit_station search does not reliably return transit in rural
    // Denmark; where there is no station nearby it hands back the most prominent
    // point of interest instead. The old code trusted whatever came back and put
    // it under a train icon, which is a confident wrong answer in a field a
    // traveler plans around.
    //
    // A name carrying a "(... Kommune)" suffix is a giveaway: that is how the
    // Places API formats a general locality or landmark, never a station. Same
    // for an explicitly non-transit Danish noun. NULL when unsure, because "we
    // do not know the nearest station" is a true statement and naming a castle
    // is not.
    const NOT_TRANSIT = /\(.*kommune\)|\bslot\b|\bkirke\b|\bmuseum\b|\bkro\b|\bcamping\b|\bstrand\b|\bfyr\b|\bmølle\b|\bcastle\b|\bchurch\b/i;
    const LOOKS_TRANSIT = /\bst\.?\b|station|banegård|banegaard|havn|terminal|færge|faerge|ferry|holdeplads|busstop|bus stop|rutebil|lufthavn|airport|metro|letbane/i;
    if (NOT_TRANSIT.test(place.name) && !LOOKS_TRANSIT.test(place.name)) return null;

    // The walk time is deliberately NOT folded into the name. The At a Glance row
    // renders this value after a label, so appending it produced
    // "Nearest Station: X (9 mins walk)", which reads as part of the station's
    // name. It is returned separately for any caller that wants it.
    const dirRes = await fetch(`/api/directions?origin=${lat},${lon}&destination=${place.lat},${place.lon}&mode=walking`);
    const dir = await dirRes.json();
    return { name: place.name, walk: dir.error ? null : dir.durationText };
  } catch { return null; }
};

// Back-compatible string form: the plain station name, nothing appended.
export const nearestStationName = async (lat, lon) => {
  const r = await findRealNearestStation(lat, lon);
  return r?.name || null;
};
