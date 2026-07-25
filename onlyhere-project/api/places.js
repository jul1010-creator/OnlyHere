// /api/places.js
// Server-side call to Google's Places API (New) — Nearby Search — finds the
// REAL nearest place of a given type (e.g. a transit station) to a coordinate,
// via Google's own places index rather than a guess. Needs "Places API (New)"
// enabled in Google Cloud Console (the old "Places API" is Legacy and can no
// longer be enabled for new setups — this uses the current one) and the same
// GOOGLE_MAPS_KEY already used by directions.js.

export default async function handler(req, res) {
  const { lat, lon, type } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon required" });
  }
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_MAPS_KEY not set on the server" });
  }
  const placeType = type || "transit_station";

  try {
    // Places API (New) Nearby Search — POST with a JSON body, unlike every other
    // endpoint in this project. A FieldMask header is REQUIRED (New API has no
    // default field set — omitting it errors instead of returning everything).
    // maxResultCount:1 keeps this to "give me the single nearest candidate" —
    // the real walking-time check happens client-side afterward via
    // /api/directions, since straight-line/radius proximity alone is exactly
    // what caused the Rosenborg garden-wall problem.
    const r = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.location",
      },
      body: JSON.stringify({
        includedTypes: [placeType],
        maxResultCount: 1,
        locationRestriction: {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
            radius: 1500,
          },
        },
      }),
    });
    const data = await r.json();
    const place = data.places?.[0];
    if (!place) {
      return res.status(200).json({ error: data.error?.message || "No nearby place found" });
    }
    return res.status(200).json({
      name: place.displayName?.text || "",
      lat: place.location?.latitude,
      lon: place.location?.longitude,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
