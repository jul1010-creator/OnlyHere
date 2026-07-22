// /api/directions.js
// Server-side call to Google's real Directions API — returns the same duration
// Google Maps itself would show, not an estimate. Needs GOOGLE_MAPS_KEY set in
// Vercel's environment variables (NOT prefixed with VITE_ — this stays
// server-only, never exposed to the browser, unlike the VITE_ keys).

export default async function handler(req, res) {
  const { origin, destination, mode } = req.query;
  if (!origin || !destination) {
    return res.status(400).json({ error: "origin and destination required" });
  }
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_MAPS_KEY not set on the server" });
  }
  const travelMode = mode === "car" ? "driving" : mode === "walk" ? "walking" : mode === "transit" ? "transit" : "bicycling";

  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin + ", Denmark")}&destination=${encodeURIComponent(destination + ", Denmark")}&mode=${travelMode}&key=${key}`;
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
