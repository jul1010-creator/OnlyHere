// /api/directions.js
// Server-side call to Google's real Directions API — returns the same duration
// Google Maps itself would show, not an estimate. Needs GOOGLE_MAPS_KEY set in
// Vercel's environment variables (NOT prefixed with VITE_ — this stays
// server-only, never exposed to the browser, unlike the VITE_ keys).

// A bare "lat,lon" pair (e.g. "55.6761,12.5683") — the client sends this when
// it already has real, resolved coordinates for a stop.
const isCoordPair = (s) => /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(s.trim());

export default async function handler(req, res) {
  const { origin, destination, mode, departure_time } = req.query;
  if (!origin || !destination) {
    return res.status(400).json({ error: "origin and destination required" });
  }
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_MAPS_KEY not set on the server" });
  }
  // BUG FIX: this used to check mode === "car"/"walk", but the client actually
  // sends "driving"/"walking"/"bicycling"/"transit" (Google's own mode names) —
  // the mismatch meant walking AND driving requests both silently fell through
  // to the else branch and were sent to Google as bicycling every time.
  const validModes = ["driving", "walking", "bicycling", "transit"];
  const travelMode = validModes.includes(mode) ? mode : "transit";

  // BUG FIX: previously ", Denmark" was appended unconditionally, including to
  // an already-resolved coordinate pair like "55.6761,12.5683" — turning it into
  // "55.6761,12.5683, Denmark", which is no longer a valid coordinate and forces
  // Google to fall back to fuzzy text geocoding, silently resolving to a
  // completely different, sometimes very distant point. Only append the country
  // hint to genuine place-name text, never to coordinates.
  const originParam = isCoordPair(origin) ? origin : `${origin}, Denmark`;
  const destinationParam = isCoordPair(destination) ? destination : `${destination}, Denmark`;

  try {
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destinationParam)}&mode=${travelMode}&key=${key}`;
    // departure_time is optional — only transit/driving use it (transit for real
    // schedule-based predictions like late-night checks, driving for live traffic).
    // Must be a future Unix timestamp in seconds; Google rejects a past one.
    if (departure_time && (travelMode === "transit" || travelMode === "driving")) {
      url += `&departure_time=${departure_time}`;
    }
    const r = await fetch(url);
    const data = await r.json();
    if (data.status !== "OK" || !data.routes?.[0]) {
      return res.status(200).json({ error: data.status || "No route found" });
    }
    const leg = data.routes[0].legs[0];
    return res.status(200).json({
      durationText: leg.duration.text,   // e.g. "24 mins" — Google's own real number
      durationMinutes: Math.round(leg.duration.value / 60),
      distanceText: leg.distance.text,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
