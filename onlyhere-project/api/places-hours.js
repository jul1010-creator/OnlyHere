// /api/places-hours.js
// Server-side call to Google's Places API (New) — Text Search — looks up a
// named place's REAL opening hours straight from its Google Business listing,
// rather than an AI reading web pages and inferring an answer. This is the
// most reliable source for this one specific fact type: Google's business
// hours field is maintained by the business/Google itself, not inferred.
//
// COST NOTE: regularOpeningHours/currentOpeningHours trigger Google's "Place
// Details Enterprise SKU" — billed higher per request than the basic Places
// calls already used in places.js/directions.js. Confirmed fine per Oliver's
// existing paid Google Maps Platform billing (same GOOGLE_MAPS_KEY, same
// Cloud project — no new account or key needed).

export default async function handler(req, res) {
  const { name, lat, lon } = req.query;
  if (!name) {
    return res.status(400).json({ error: "name required" });
  }
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_MAPS_KEY not set on the server" });
  }

  try {
    const body = { textQuery: name.includes("Denmark") ? name : `${name}, Denmark` };
    // Location bias narrows the search toward the right place when a name is
    // shared across towns (e.g. a chain) — optional, only added when we already
    // have real coordinates for this entry from the geocoding step.
    if (lat && lon) {
      body.locationBias = { circle: { center: { latitude: parseFloat(lat), longitude: parseFloat(lon) }, radius: 20000 } };
    }
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.businessStatus,places.regularOpeningHours,places.currentOpeningHours,places.websiteUri",
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Places (text search) error:", data);
      return res.status(200).json({ error: data.error?.message || "Places lookup failed" });
    }
    const place = data.places?.[0];
    if (!place) {
      return res.status(200).json({ error: "No matching place found" });
    }
    // weekdayDescriptions is Google's own human-readable list, e.g.
    // ["Monday: 10:00 AM – 6:00 PM", "Tuesday: Closed", ...] — real ground
    // truth, no parsing needed, hand it straight to the writer as-is.
    const openingHours = place.regularOpeningHours?.weekdayDescriptions || place.currentOpeningHours?.weekdayDescriptions || null;
    return res.status(200).json({
      name: place.displayName?.text || "",
      address: place.formattedAddress || "",
      businessStatus: place.businessStatus || "", // e.g. "OPERATIONAL", "CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY"
      openingHours,
      // THE VENUE'S OWN OFFICIAL WEBSITE, straight from Google's business
      // listing (added Aug 2026, Oliver: "how do we make sure that
      // Tavily/Perplexity in the future uses these websites?").
      //
      // This is the authoritative answer to that question for anything that is
      // a real business. It is not a search result that mentions the place and
      // it is not a model recalling a domain from memory, which is exactly how
      // plausible-looking wrong URLs get invented. It is the URL the owner
      // registered on their own Google listing.
      //
      // COSTS NOTHING EXTRA: websiteUri sits in the same Place Details
      // Enterprise SKU as regularOpeningHours, which this request already asks
      // for, so it rides along on a call we are already paying for.
      website: place.websiteUri || "",
    });
  } catch (err) {
    console.error("Places hours fetch failed:", err);
    return res.status(500).json({ error: String(err) });
  }
}
