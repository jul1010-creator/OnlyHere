// ── IS THIS COORDINATE ABOUT THIS PLACE ─────────────────────────────
//
// Oliver, 10 Aug 2026: "The most important is getting maps sorted. Because if
// we get maps wrong, then the Gemlyx guide will become ruined."
//
// He is right, and the reason is structural rather than a matter of degree.
//
// THE PROVENANCE OF A STORED COORDINATE, traced end to end:
//
//   1. The model returns "lat" and "lon" in its draft JSON.
//   2. shapeForLive stores them as `__lat: Number(t.lat) || null`, with no
//      check of any kind. Not a range, not a country, not a comparison with
//      the town the entry names.
//   3. On a fresh draft, publishDraft overrides them with studioFrozenGeo when
//      real geocoding produced one. When it did not, the model's number stands.
//   4. liveContent.js line 87 then writes a published TOWN's coordinate
//      straight into TOWN_COORDS on every page load.
//   5. TOWN_COORDS is the fallback reference for every stop in that town, and
//      townKeyFor resolves against it.
//
// So one invented town coordinate does not misplace one pin. It replaces the
// reference frame that every other entry in that town is measured against, on
// every load, silently. That is the mechanism behind "the guide will become
// ruined", and it is worth saying plainly that he identified it before I did.
//
// AND IT GOT MORE DANGEROUS THIS MORNING, WHICH IS MY DOING. Until today the
// tier that reads __lat was dead code: resolveStopCoordsDetailed looked at
// `real.lat`, a field nothing writes, so every stop fell through to Nominatim.
// Fixing that made __lat the TOP of the chain. A stored coordinate now beats
// the geocode, is marked precise: true, draws as a solid pin with no dashed
// ring, is trusted by legDistanceKm, skips geocoding entirely via
// hasPreciseCoords, and as of this afternoon is sent to Google Directions as a
// bare pair instead of the place's name. Every one of those is right for a good
// coordinate and an amplifier for a bad one. Promoting an unvalidated number to
// the top of a chain without validating it is half a fix.
//
// This file is the other half. Every check is arithmetic on data already in the
// payload: no model, no API, no cost, same answer every run. Same discipline as
// entryAudit, which is where these findings surface.

import { isInDenmark, haversineKm } from "./helpers";
import { TOWN_COORDS } from "../data/towns";
import { townKeyFor, MAX_TOWN_KM } from "./guideEnrichment";

// Denmark is small. Copenhagen to Odense is about 140 km, so 50 km is roughly a
// third of the way across the country: nothing legitimately described as being
// in a town is that far from it. The documented failure was 130 km.
//
// THE NUMBER MOVED TO guideEnrichment.js ON 12 AUG and is re-exported here, so
// every existing importer of it keeps working unchanged. It moved because the
// guide's own coordinate resolvers need the identical threshold at READ time
// (see coordFitsTown), guideEnrichment sits below this file in the import
// graph so it cannot import upward, and a threshold declared in two files is
// the failure this codebase repeats more than any other. One declaration, two
// names for it, no second value that can drift.
export { MAX_TOWN_KM };
// Not wrong on its own, but far enough to be worth opening. An attraction can
// honestly sit 20 km outside the town it is listed under (Ribe VikingeCenter is
// about 3 km out, Møns Klint about 15 from Møn town), so this is a look-at-it
// line and never a block.
export const ODD_TOWN_KM = 20;

// Printed in the town prompt's own JSON schema as an example, and copied
// verbatim by drafts (PASS 45). Kept here beside the other coordinate rules;
// entryAudit has carried the same pair since that pass and imports it now
// rather than declaring a second copy, because a threshold in two files is the
// failure this codebase repeats more than any other.
export const SCHEMA_EXAMPLE = { lat: 56.09, lon: 8.24 };

export const storedCoord = (payload) => {
  const lat = Number(payload?.__lat), lon = Number(payload?.__lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
};

// Which town does this entry SAY it is in. Deliberately not a per-type field
// map: adding a content type already means registering it at about a dozen
// sites, and a thirteenth that fails silently is exactly how booking ended up
// missing from the type picker. Every field that can name a place is tried, and
// the first that resolves to a town we have a coordinate for wins.
//
// townKeyFor's longest-match rule prefers the parent city ("Indre By,
// Copenhagen" resolves to Copenhagen rather than the district). For this check
// that bias is safe in the right direction: it can only make the comparison
// more forgiving, never more likely to accuse a correct entry.
export const claimedTown = (payload) => {
  for (const field of [payload?.city, payload?.town, payload?.location, payload?.name]) {
    const key = townKeyFor(String(field || ""));
    if (key && TOWN_COORDS[key]) return key;
  }
  return null;
};

export const distanceFromClaimedTown = (payload) => {
  const c = storedCoord(payload);
  const town = claimedTown(payload);
  if (!c || !town) return null;
  const [lat, lon] = TOWN_COORDS[town];
  return { town, km: haversineKm(c, { lat, lon }) };
};

// ── THE FINDINGS ────────────────────────────────────────────────────
// Severity is not decoration here: "critical" is what blocks a fresh publish
// below, so anything that could fire on a correct entry must not be one.
export const coordProblems = (payload, type = "") => {
  const out = [];
  const c = storedCoord(payload);

  if (!c) {
    // A town with no coordinate has no map and no distance maths. Other types
    // degrade to the town centre, which is worse than it sounds but is not
    // nothing, so it is not raised to the same level.
    if (type === "town") out.push({ severity: "high", kind: "missing", detail: "No coordinate stored, so this town has no map pin and cannot be measured against anything." });
    return out;
  }

  if (Math.abs(c.lat - SCHEMA_EXAMPLE.lat) < 0.005 && Math.abs(c.lon - SCHEMA_EXAMPLE.lon) < 0.005) {
    out.push({ severity: "critical", kind: "schema-example", detail: "This is the coordinate printed as an example in the old draft prompt, copied verbatim. The pin is in a field near Ringkøbing Fjord, roughly 130 km from the real place." });
    return out;
  }

  // The check that never existed. isInDenmark has been in helpers since the
  // beginning and was applied only to the browser's own location, never once to
  // a coordinate that reaches a reader.
  if (!isInDenmark(c)) {
    out.push({ severity: "critical", kind: "outside-denmark", detail: `Stored at ${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}, which is outside Denmark. A model that does not know a place tends to answer with a plausible-looking number rather than nothing.` });
    return out;
  }

  const d = distanceFromClaimedTown(payload);
  if (d && d.km > MAX_TOWN_KM) {
    out.push({ severity: "critical", kind: "far-from-town", km: d.km, town: d.town, detail: `Sits ${Math.round(d.km)} km from ${d.town}, which is the town this entry names. Nothing in a town is ${Math.round(d.km)} km from it, so this coordinate is about somewhere else.` });
  } else if (d && d.km > ODD_TOWN_KM) {
    out.push({ severity: "low", kind: "far-from-town", km: d.km, town: d.town, detail: `Sits ${Math.round(d.km)} km from ${d.town}. That can be honest for somewhere genuinely outside the town, but it is worth opening the map once.` });
  }
  return out;
};

// Blocking is reserved for what cannot be right, and the message always names
// the field to change, because the draft JSON is editable in the same panel.
export const blockingCoordProblems = (payload, type = "") =>
  coordProblems(payload, type).filter(p => p.severity === "critical");

// ── TWO ENTRIES CANNOT BE IN THE SAME SPOT ──────────────────────────
// A cross-row check, so it lives beside the audit rather than in the per-entry
// pass. An exact match between two different places is never a coincidence: it
// means one was copied, or both fell back to the same town centre and that
// fallback was then stored as though it were measured.
const coordKey = (c) => `${c.lat.toFixed(4)},${c.lon.toFixed(4)}`;
const sameName = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
export const sharedCoords = (rows) => {
  const byPoint = new Map();
  (Array.isArray(rows) ? rows : []).forEach(r => {
    const c = storedCoord(r?.payload);
    if (!c) return;
    const k = coordKey(c);
    if (!byPoint.has(k)) byPoint.set(k, []);
    byPoint.get(k).push({ id: r.id, name: r?.payload?.name || "(unnamed)", type: r?.type });
  });
  return [...byPoint.values()]
    .filter(list => list.length > 1)
    // ── "SAME POINT: COPENHAGEN, COPENHAGEN" ──────────────────────
    // Oliver's screenshot, 11 Aug, five lines of it. He is right that it reads
    // as nonsense, and the nonsense was hiding the actual finding.
    //
    // Two rows on one point with DIFFERENT names is a coordinate error: one of
    // them is in the wrong place. Two rows on one point with the SAME name is
    // not a coordinate error at all, it is THE SAME PLACE PUBLISHED TWICE, and
    // it is the worse problem: liveContent dedupes by type and name and keeps
    // whichever comes first, so the site silently shows one copy and every edit
    // made to the other one does nothing.
    //
    // placeEdit.js has detected exactly that since 8 Aug, with the explanation
    // written out. This was re-detecting it and mislabelling it, which is the
    // sixth duplicated detector found this week. Handed back to duplicateNames
    // where it belongs, so this reports only what it is actually for.
    .filter(list => !list.every(x => sameName(x.name, list[0].name)));
};

export const coordAudit = (rows) => {
  const list = (Array.isArray(rows) ? rows : [])
    .map(r => ({ id: r?.id, name: r?.payload?.name || "(unnamed)", type: r?.type, problems: coordProblems(r?.payload, r?.type) }))
    .filter(r => r.problems.length > 0);
  const shared = sharedCoords(rows);
  return {
    rows: list,
    critical: list.filter(r => r.problems.some(p => p.severity === "critical")),
    shared,
    total: list.length,
  };
};

export const describeCoordAudit = (a) => {
  if (!a) return "";
  const bits = [];
  if (a.critical.length) bits.push(`${a.critical.length} with a coordinate that cannot be right`);
  const soft = a.total - a.critical.length;
  if (soft > 0) bits.push(`${soft} worth opening the map on`);
  if (a.shared.length) bits.push(`${a.shared.length} ${a.shared.length === 1 ? "spot has" : "spots have"} two or more entries on the exact same point`);
  if (!bits.length) return "Every stored coordinate is inside Denmark and near the town its entry names.";
  return `Coordinates: ${bits.join("; ")}.`;
};
