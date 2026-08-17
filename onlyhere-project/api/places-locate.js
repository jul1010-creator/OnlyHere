// /api/places-locate.js
// Google Places Text Search, asking for ONE thing: where is this.
//
// ── WHY THIS IS NOT A PARAMETER ON places-hours.js ──────────────────
// Oliver, 13 Aug 2026: "make maps be one of the first things to be searched,
// so tavily/perplexity will know which area to search."
//
// The Studio draft already calls /api/places-hours, and that route asks for
// regularOpeningHours and currentOpeningHours, which is what puts a request on
// Google's Place Details ENTERPRISE SKU: the most expensive per-request tier
// this app touches, and its own file says so at the top.
//
// Running the expensive call at the START of every draft, purely to find out
// which region a place is in, would be paying enterprise rates for a latitude.
// The field mask below asks for a display name, an address and a location,
// which are the basic fields, so this is a cheap call that happens early and
// leaves the expensive one exactly where it was.
//
// ── AND IT ONLY RUNS WHEN NOMINATIM MISSED ──────────────────────────
// Which is the case it exists for. Nominatim indexes ADDRESSES, so it answers
// for towns and museums and fails on events: "Ribelund Festival" is a business
// listing, not an address, and Google holds it. That miss is what left every
// festival draft choosing its sources with nothing but a name and a paragraph
// of research snippets to go on.

// The town, from the address Google returns. A Danish formatted address reads
// "Pile Alle 2, 6760 Ribe, Denmark", so the town is the part after the postcode
// in the second-to-last component. Returned as a bonus rather than as the
// answer: the caller wants the coordinate, and the region is derived from that
// rather than from any string parsed here.
const townFromAddress = (address) => {
  const parts = String(address || "").split(",").map(s => s.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const m = parts[i].match(/^\d{4}\s+(.+)$/);
    if (m) return m[1].trim();
  }
  return "";
};

import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";

export default async function handler(req, res) {
  // ── SECURITY, 17 AUG 2026 ─────────────────────────────────────────
  // Studio calls this and nothing else does, so it gets both halves: the request
  // has to come from the site, and it has to carry a real Supabase session.
  // See src/utils/apiGuard.js.
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
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
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: "name required" });
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) return res.status(500).json({ error: "GOOGLE_MAPS_KEY not set on the server" });

  try {
    const textQuery = String(name).includes("Denmark") ? String(name) : `${name}, Denmark`;
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        // Basic fields only. Adding an opening-hours field here would silently
        // move every call in this file onto the enterprise tier, which is the
        // whole reason the route is separate.
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
      },
      // ── FIVE INSTEAD OF ONE, AND IT COSTS THE SAME ────────────────
      // Oliver, 17 Aug 2026: "you can also make it ask me, if it's not sure, 'do
      // you mean..' like if multiple searches pop up."
      //
      // Text Search is billed per REQUEST on this basic field mask, not per
      // result, so asking for five candidates is the same call at the same price
      // as asking for one. The single result was not a cost decision, it was an
      // assumption that the first hit is the right one, and his Heidi's draft is
      // what that assumption costs when it is wrong: a full research pass, 167
      // seconds, on a bar whose name the searches could not match.
      body: JSON.stringify({ textQuery, languageCode: "da", regionCode: "DK", maxResultCount: 5 }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "Places text search failed" });
    const p = (data.places || [])[0];
    // NOT AN ERROR, AND IT MATTERS THAT IT IS NOT. Plenty of real places have
    // no Google listing, and a 404 here would be read by the caller as a broken
    // route rather than as "Google does not know this one". The caller falls
    // back to the town centre and says so in the run log.
    if (!p?.location) return res.status(200).json({ found: false });
    // ── THE TOP HIT STAYS EXACTLY WHERE IT WAS ────────────────────────
    // Every caller of this route reads name/lat/lon/address/town off the top
    // level, so those keep meaning what they meant. `candidates` is additive: a
    // caller that does not know about it behaves as it did before, and the one
    // that does can ask which place was meant.
    const candidates = (data.places || [])
      .filter(x => x?.location)
      .map(x => ({
        name: x.displayName?.text || "",
        address: x.formattedAddress || "",
        town: townFromAddress(x.formattedAddress),
        lat: x.location.latitude,
        lon: x.location.longitude,
      }))
      .filter(x => x.name);
    return res.status(200).json({
      found: true,
      name: p.displayName?.text || "",
      address: p.formattedAddress || "",
      town: townFromAddress(p.formattedAddress),
      lat: p.location.latitude,
      lon: p.location.longitude,
      candidates,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
