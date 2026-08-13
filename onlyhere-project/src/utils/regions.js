// ── THE TIER BETWEEN A TOWN AND A LANDMASS ──────────────────────────
//
// Oliver, 13 Aug 2026, from notes he took at work:
//
//   "We need to have regions of Denmark in 'specific' regions. So I can put
//    'visitsønderjylland.dk' as a source for Sønderjylland."
//
// The Studio source panel scopes a source two ways and neither is the one he
// needs. Scoped to Jutland, VisitSønderjylland rides along on a Skagen draft
// three hundred kilometres north. Scoped to Tønder, it fires on Tønder and on
// nothing else: not Sønderborg, not Aabenraa, not Haderslev, not Rømø, not
// Møgeltønder, and not on whatever he publishes down there next month. One row
// per town is not a scope, it is a chore that silently falls behind.
//
// ── WHY TWELVE, AND WHY THESE TWELVE ────────────────────────────────
// A region here has to earn its place by being a thing a Danish tourism site
// covers, because that is the only reason this axis exists. Denmark's five
// ADMINISTRATIVE regions do not do that job: Region Syddanmark is Esbjerg and
// Sønderborg and Odense in one bucket, and no visit-site covers that shape.
// The everyday areas do, and they are what a Dane says out loud.
//
// So: twelve areas, covering Jutland and Zealand.
//
// FUNEN, LOLLAND-FALSTER AND BORNHOLM GET NO SUBDIVISION, on purpose. The
// landmass already answers for them, VisitFyn and Visit Lolland-Falster and
// Destination Bornholm each cover their whole island, and inventing "Nordfyn"
// as a scope nobody has a source for would be a filter offering an empty room.
// That is the exact failure the towns page shipped once, with twelve region
// pills for a country that has five.
//
// ── ONE NAME CLASH, STATED RATHER THAN HIDDEN ───────────────────────
// "Midtjylland" here means the middle of Jutland: Viborg, Skive, Silkeborg,
// Herning, Ikast-Brande. Region Midtjylland, the administrative one, also
// contains Aarhus, Randers, Djursland and the whole west coast, and nobody
// standing in Aarhus says they are in Midtjylland. The everyday reading is the
// useful one and it is the one danishNames.js already pairs with "Central
// Jutland". Written down because a reader who knows the administrative map
// deserves to know which of the two this is, rather than finding out from a
// draft that searched the wrong site.
//
// ── A REGION IS A LIST OF KOMMUNER, NOT A SHAPE I DREW ──────────────
// Destination Sønderjylland's own site names its four kommuner: Haderslev,
// Aabenraa, Sønderborg, Tønder. That sentence IS the border. A polygon drawn
// by eye would be my approximation of that line, wrong by some kilometres
// along the Kongeå, with nothing anywhere saying so. See data/kommuner.js for
// where the kommune geometry came from and why the bbox does the filtering.

import { KOMMUNER, K } from "../data/kommuner";
import { fold, samePlaceName } from "./danishNames";
import { KM_LAT, KM_LON } from "../data/mapShapes";

// Built FROM the kommune table rather than written beside it, so there is one
// statement of which kommune is where. A second list would be the fifth
// duplicated thing this codebase has found: it would agree on the day it was
// written and drift the first time a row changed.
const build = () => {
  const m = new Map();
  for (const row of KOMMUNER) {
    const name = row[K.region];
    if (!name) continue;
    if (!m.has(name)) m.set(name, []);
    m.get(name).push(row[K.name]);
  }
  return m;
};
const REGION_KOMMUNER = build();

// Ordered as the country reads, north to south then east, so the picker is not
// alphabetical noise.
export const REGION_NAMES = [
  "Nordjylland", "Vestjylland", "Midtjylland", "Østjylland", "Djursland",
  "Sydvestjylland", "Sydøstjylland", "Sønderjylland",
  "Nordsjælland", "Storkøbenhavn", "Midt- og Vestsjælland", "Sydsjælland og Møn",
];

// Which landmass each region sits on. This is what lets a source scoped to
// Jutland still reach a Sønderjylland draft: the wider scope contains the
// narrower one, and a containment chain is the whole reason to have tiers.
export const REGION_PART = {
  Nordjylland: "Jutland", Vestjylland: "Jutland", Midtjylland: "Jutland",
  Østjylland: "Jutland", Djursland: "Jutland", Sydvestjylland: "Jutland",
  Sydøstjylland: "Jutland", Sønderjylland: "Jutland",
  Nordsjælland: "Zealand", Storkøbenhavn: "Zealand",
  "Midt- og Vestsjælland": "Zealand", "Sydsjælland og Møn": "Zealand",
};

// ── SPELLINGS, NOT SUB-AREAS ────────────────────────────────────────
// Only other ways of writing the SAME area. Vendsyssel is inside Nordjylland
// and is deliberately NOT listed: aliasing it would silently widen a source he
// scoped to Vendsyssel across the whole of the north, which is the wrong-city
// error one tier up. danishNames.PLACE_NAMES already carries the four that are
// real one-to-one pairs; these are the rest, and they live here rather than
// there because samePlaceName is also what decides whether two TOWNS are the
// same, and a loose entry in that table is a source escaping its town.
const REGION_ALIASES = {
  Nordjylland: ["North Jutland", "Northern Jutland", "Region Nordjylland"],
  Vestjylland: ["West Jutland", "Western Jutland"],
  Midtjylland: ["Central Jutland", "Mid Jutland", "Midtjylland"],
  Østjylland: ["East Jutland", "Eastern Jutland"],
  Djursland: ["Djurs"],
  Sydvestjylland: ["South West Jutland", "Southwest Jutland", "South-West Jutland"],
  Sydøstjylland: ["South East Jutland", "Southeast Jutland", "South-East Jutland"],
  Sønderjylland: ["South Jutland", "Southern Jutland", "Nordslesvig", "North Schleswig"],
  Nordsjælland: ["North Zealand", "Northern Zealand"],
  Storkøbenhavn: ["Greater Copenhagen", "Copenhagen area", "Hovedstadsområdet"],
  "Midt- og Vestsjælland": ["Vestsjælland", "West Zealand", "Midtsjælland", "Central Zealand", "Midt og Vestsjælland"],
  "Sydsjælland og Møn": ["Sydsjælland", "South Zealand", "Southern Zealand", "Sydsjælland og Moen"],
};

const ALIAS_INDEX = (() => {
  const m = new Map();
  for (const name of REGION_NAMES) {
    m.set(fold(name), name);
    for (const a of REGION_ALIASES[name] || []) m.set(fold(a), name);
  }
  return m;
})();

// The canonical spelling of a region, or "" when the input is not one. Used by
// sourcePolicy.cleanPlace, so a scope typed as "South Jutland" is STORED as
// "Sønderjylland" and lands in the region branch of the matcher rather than
// being filed as a town nobody has an entry for.
export const canonicalRegion = (input) => ALIAS_INDEX.get(fold(input)) || "";
export const isRegion = (input) => !!canonicalRegion(input);
export const regionPart = (name) => REGION_PART[canonicalRegion(name)] || "";
export const kommunerIn = (name) => (REGION_KOMMUNER.get(canonicalRegion(name)) || []).slice();

// ── FINDING THE KOMMUNE: BBOX FIRST, CENTRE ONLY TO BREAK A TIE ─────
// Nearest-centre on its own is a Voronoi diagram over points, and Danish
// kommuner are nowhere near equal in size, so the cell boundaries land nowhere
// near the real borders. Measured on the case that matters: pure Voronoi puts
// the Sønderjylland line about fifteen kilometres south of the Kongeå, which
// files Christiansfeld under the wrong tourist board.
//
// A bbox is data rather than an inference, so it filters. Boxes overlap for
// anything that is not a rectangle, so it narrows rather than decides, and the
// centre distance settles whatever is left. The centre is the register's
// "visuelt center", a point guaranteed to be inside the kommune, which a
// centroid is not for the several Danish kommuner shaped like a C.
const inBox = (lat, lon, r) =>
  lat >= r[K.south] && lat <= r[K.north] && lon >= r[K.west] && lon <= r[K.east];

const kmFromPoint = (lat, lon, rLat, rLon) => {
  const dy = (lat - rLat) * KM_LAT, dx = (lon - rLon) * KM_LON;
  return Math.sqrt(dy * dy + dx * dx);
};

// Distance to the BOX, not to the centre, which is why this is the thing the
// cap is applied to. Ringkøbing-Skjern is big enough that a point well inside
// it is further from its centre than the offshore cap allows, and refusing to
// place a coordinate that sits squarely inside a kommune would be absurd.
const kmToBox = (lat, lon, r) => {
  const dLat = Math.max(r[K.south] - lat, 0, lat - r[K.north]) * KM_LAT;
  const dLon = Math.max(r[K.west] - lon, 0, lon - r[K.east]) * KM_LON;
  return Math.sqrt(dLat * dLat + dLon * dLon);
};

// ── AND THE OUTSIDE-EVERY-BOX BRANCH IS FOR ROUNDING, NOT FOR SWEDEN ─
// geography.js carries MAX_OFFSHORE_KM = 45 because its five landmass outlines
// are coarse and do not contain Ærø, Fanø, Læsø, Anholt or Christiansø at all,
// so a real Danish island can sit forty kilometres outside every shape.
//
// The kommune boxes are not coarse. Every Danish island belongs to a kommune
// and its box is drawn round it: Anholt is inside Norddjurs, Læsø is its own
// kommune, Christiansø is its own row. So a genuine Danish coordinate is
// INSIDE a box, and the outside branch exists only for a point sitting a
// rounding error beyond an edge.
//
// Sizing it at 45 km would inherit a cap built for a different instrument, and
// it costs something real: Malmö is ten kilometres past Tårnby's eastern edge,
// so a 45 km cap answers "Storkøbenhavn" for a Swedish city. geography.js
// records the same Malmö case as a known limit and leaves it, which is right
// for a filter pill and wrong here, because this decides which tourist board
// gets searched and paid for.
const EDGE_TOLERANCE_KM = 5;

// Returns the kommune row, or null when the coordinate is not near Denmark.
// NULL IS NOT A BUCKET, the same rule partOfCountry follows: a caller must be
// able to tell "we could not place this" apart from "it is in Odense".
export const kommuneAt = (lat, lon) => {
  const la = Number(lat), lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  const inside = KOMMUNER.filter(r => inBox(la, lo, r));
  const pool = inside.length ? inside : KOMMUNER;
  let best = null, bestKm = Infinity;
  for (const r of pool) {
    const d = inside.length ? kmFromPoint(la, lo, r[K.lat], r[K.lon]) : kmToBox(la, lo, r);
    if (d < bestKm) { bestKm = d; best = r; }
  }
  if (!best) return null;
  // Only the outside-every-box branch can be too far away. A point INSIDE a box
  // is in Denmark by definition, however far it sits from that kommune's
  // centre, and Ringkøbing-Skjern is wide enough that the difference matters.
  if (!inside.length && bestKm > EDGE_TOLERANCE_KM) return null;
  return best;
};

export const kommuneNameAt = (lat, lon) => kommuneAt(lat, lon)?.[K.name] || "";

// "" rather than null, because a region genuinely can be absent for a
// coordinate that IS in Denmark: Funen, Lolland-Falster and Bornholm have no
// subdivision, and that is an answer rather than a failure. A caller that needs
// to know whether the point was placeable at all asks kommuneAt.
export const regionAt = (lat, lon) => kommuneAt(lat, lon)?.[K.region] || "";

// Reads __lat/__lon, the fields every published payload actually stores.
// resolveStopCoordsDetailed spent weeks reading `real.lat` while every writer
// in the app wrote `__lat`, so the good branch never once fired in production;
// `lat` is accepted as a fallback here for the same reason placeCoords does.
export const regionOf = (entry) => regionAt(entry?.__lat ?? entry?.lat, entry?.__lon ?? entry?.lon);
export { K };

export const kommuneOf = (entry) => kommuneNameAt(entry?.__lat ?? entry?.lat, entry?.__lon ?? entry?.lon);

// Two region names that mean the same area. Goes through the canonical form
// first, so "South Jutland" and "Sønderjylland" match, and falls back to
// samePlaceName so the four pairs already in danishNames keep working.
export const sameRegion = (a, b) => {
  const A = canonicalRegion(a), B = canonicalRegion(b);
  if (A && B) return A === B;
  return samePlaceName(a, b);
};

// Only the regions something is actually published in, for a filter that must
// never offer an empty room.
export const regionsPresent = (entries) => {
  const found = new Set((Array.isArray(entries) ? entries : []).map(regionOf).filter(Boolean));
  return REGION_NAMES.filter(r => found.has(r));
};

// One line for a run log or the Studio panel: what we decided and from what.
// A region derived from a coordinate that was itself a town-centre fallback is
// a different quality of answer from one derived from a real geocode, and the
// caller knows which it has, so it passes `precise` in rather than this
// guessing.
export const describeRegion = (lat, lon, precise) => {
  const k = kommuneAt(lat, lon);
  if (!k) return "no coordinate near Denmark, so no region";
  const where = k[K.region] ? `${k[K.region]} (${k[K.name]} Kommune)` : `${k[K.name]} Kommune, which has no sub-region`;
  return precise === false ? `${where}, from an approximate coordinate` : where;
};
