// /api/places.js
// Server-side call to Google's Places API (New) — Nearby Search — finds the
// REAL nearest place of a given type (e.g. a transit station) to a coordinate,
// via Google's own places index rather than a guess. Needs "Places API (New)"
// enabled in Google Cloud Console (the old "Places API" is Legacy and can no
// longer be enabled for new setups — this uses the current one) and the same
// GOOGLE_MAPS_KEY already used by directions.js.

import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";
import { gateMaps } from "../src/utils/mapsGate.js";

export default async function handler(req, res) {
  // ── SECURITY, 17 AUG 2026 ─────────────────────────────────────────
  // This endpoint answered anybody until tonight. See src/utils/apiGuard.js for
  // what that meant in practice and why a login gate would break the product.
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  // ── STUDIO ONLY ───────────────────────────────────────────────────
  // Security review, 5 Oct 2026, finding 4: this is Google's dearer search
  // (about six directions calls each) and it answered anybody from the site,
  // with the caller choosing the types and a 20 km radius. Only Studio's
  // drafts call it (utils/geo.js, from generateArea), so it is the founder's,
  // like /api/places-hours. The token travels with it from utils/apiAuth.js.
  {
    const who = await resolveUser(req.headers, {
      supabaseUrl: process.env.SUPABASE_URL || "https://vpxfahjnerkkkoueovhl.supabase.co",
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "",
    });
    if (!who.ok) return res.status(who.status).json({ error: who.error });
    if (!isFounder(who.userId, process.env.GEMLYX_FOUNDER_IDS)) {
      return res.status(403).json({ error: "This account cannot run Studio research." });
    }
  }
  const { lat, lon, type } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon required" });
  }
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_MAPS_KEY not set on the server" });
  }
  // ── TYPES, PLURAL, AND A RADIUS ────────────────────────────────────
  // Oliver, 7 Aug: "the draft now just made a 'nearestStation' a bus stop. I
  // thought we fixed that."
  //
  // What was fixed in PASS 41 was the LABEL: the At a Glance row works out from
  // the value whether to say Station, Bus Stop, Terminal or Airport. The VALUE
  // was never fixed, and this is where it comes from. "transit_station" in
  // Google's taxonomy includes bus stops, so in a Danish town the nearest
  // transit_station is very often a bus shelter 200 m away while the actual
  // railway station sits 900 m down the road. Both are true answers to the
  // question this endpoint was asked. Only one is the answer a traveler wants.
  //
  // So the caller can now ask for several types at once and a wider radius.
  // Deciding which of the results wins is deliberately NOT done here: this
  // endpoint stays a thin lookup, and geo.js does the choosing where the rule
  // can be read next to the rest of the transport logic.
  // The ceiling is 20 km rather than Google's own 50 km because nothing this
  // app asks about is further than a ferry berth from the village it serves,
  // and a country-wide radius would return a "nearest stop" in another region.
  const placeTypes = String(type || "transit_station").split(",").map(t => t.trim()).filter(Boolean);
  const radius = Math.min(Math.max(parseInt(req.query.radius, 10) || 1500, 200), 20000);
  const want = Math.min(Math.max(parseInt(req.query.limit, 10) || 1, 1), 10);
  if (!Number.isFinite(parseFloat(lat)) || !Number.isFinite(parseFloat(lon))) {
    return res.status(400).json({ error: "lat and lon must be numbers" });
  }
  // ── COUNTED BEFORE GOOGLE IS ASKED ────────────────────────────────
  // Security review, 4 Oct 2026, finding 5: see src/utils/mapsGate.js.
  const counted = await gateMaps({ headers: req.headers, env: process.env });
  if (!counted.ok) return res.status(counted.status).json({ error: counted.error });

  try {
    // Places API (New) Nearby Search — POST with a JSON body, unlike every other
    // endpoint in this project. A FieldMask header is REQUIRED (New API has no
    // default field set — omitting it errors instead of returning everything).
    // rankPreference DISTANCE makes "nearest" mean nearest rather than most
    // prominent, which for a bare radius search is otherwise Google's default.
    // The real walking check still happens afterward in geo.js, since
    // straight-line proximity alone is exactly what caused the Rosenborg
    // garden-wall problem, and what puts a mainland station on an island.
    const r = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.location,places.types,places.primaryType",
      },
      body: JSON.stringify({
        includedTypes: placeTypes,
        maxResultCount: want,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
            radius,
          },
        },
      }),
    });
    const data = await r.json();
    const places = Array.isArray(data.places) ? data.places : [];
    if (!places.length) {
      return res.status(200).json({ error: data.error?.message || "No nearby place found" });
    }
    const shape = (p) => ({
      name: p.displayName?.text || "",
      lat: p.location?.latitude,
      lon: p.location?.longitude,
      types: p.types || [],
      primaryType: p.primaryType || "",
    });
    // The single-place shape is kept at the top level so the existing callers,
    // which read .name/.lat/.lon, keep working untouched.
    return res.status(200).json({ ...shape(places[0]), results: places.map(shape) });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
