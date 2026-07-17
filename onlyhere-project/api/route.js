// /api/route.js
// Vercel Serverless Function — calculates a driving route using OpenRouteService (OSM-based, free tier)
//
// SETUP REQUIRED:
// 1. Sign up free at https://openrouteservice.org/dev/#/signup
// 2. Get your API key from the dashboard
// 3. In Vercel: Project Settings → Environment Variables → add ORS_API_KEY = your_key
// 4. Redeploy
//
// USAGE (from your frontend):
// fetch('/api/route?from=55.6761,12.5683&to=55.4038,10.4024')
//   from/to format: "lat,lon"

export default async function handler(req, res) {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "Missing 'from' or 'to' query params. Format: lat,lon" });
  }

  const [fromLat, fromLon] = from.split(",").map(Number);
  const [toLat, toLon] = to.split(",").map(Number);

  if ([fromLat, fromLon, toLat, toLon].some(isNaN)) {
    return res.status(400).json({ error: "Invalid coordinates. Use format: lat,lon (e.g. 55.6761,12.5683)" });
  }

  try {
    const orsRes = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        "Authorization": process.env.ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // ORS wants [lon, lat] order — opposite of how we usually write coordinates
        coordinates: [
          [fromLon, fromLat],
          [toLon, toLat],
        ],
      }),
    });

    if (!orsRes.ok) {
      const errText = await orsRes.text();
      console.error("ORS error:", errText);
      return res.status(502).json({ error: "Route service failed", detail: errText });
    }

    const data = await orsRes.json();
    const feature = data.features?.[0];
    if (!feature) {
      return res.status(404).json({ error: "No route found" });
    }

    const summary = feature.properties.summary; // { distance: meters, duration: seconds }
    const distanceKm = (summary.distance / 1000).toFixed(1);
    const durationMin = Math.round(summary.duration / 60);
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;

    // Clean, compact response — exactly the shape a frontend (or an AI summary) wants
    res.status(200).json({
      distance_km: Number(distanceKm),
      duration_minutes: durationMin,
      duration_readable: hours > 0 ? `${hours}t ${mins}min` : `${mins}min`,
      geometry: feature.geometry, // GeoJSON LineString — feed this straight into Leaflet.js to draw the route
      from: { lat: fromLat, lon: fromLon },
      to: { lat: toLat, lon: toLon },
    });
  } catch (err) {
    console.error("Route calculation failed:", err);
    res.status(500).json({ error: "Internal error calculating route" });
  }
}
