import { fold, variantsOf } from "./danishNames";

// ── WHICH PART OF THE COUNTRY IS THIS ───────────────────────────────
// Oliver, 8 Aug 2026, looking at the towns page: "the filters gotta change. We
// need more modern filtering. This is just a long mess."
//
// The mess was not the layout. The Region row was built from
// `[...new Set(towns.map(t => t.region))]`, and `region` is FREE TEXT written by
// whatever drafted each entry, so every spelling of the same place became its
// own pill. On screen at the time:
//
//   "Langeland, Region Syddanmark"   and   "Langeland, Southern Denmark"
//
// One region. Two pills. Plus "Himmerland, Region Nordjylland", which mixes a
// sub-area with the region containing it, and "Capital Region of Denmark" beside
// a bare "Central Denmark". Denmark has five regions and the page was showing
// twelve and a scrollbar. No control redesign fixes that: a beautiful dropdown
// built on the same field still lists Langeland twice.
//
// ── SO THE AXIS CHANGED, NOT THE WIDGET ─────────────────────────────
// Every entry already stores __lat/__lon, and the app already ships DK_SHAPES,
// the five landmass outlines its own card thumbnails are drawn from. Which part
// of the country a place is in is therefore DERIVABLE, from a coordinate, with
// no free text anywhere in it. It cannot disagree with itself, it cannot grow a
// thirteenth value because somebody typed a region name differently, and it is
// how people actually plan: you do Jutland, or you do Bornholm, which is its own
// trip. The written region stays on the card, where detail belongs.
//
// ── THE SHAPES ARE IDENTIFIED BY ANCHOR, NOT BY INDEX ───────────────
// DK_SHAPES is a bare array with no labels. Reading it positionally would mean a
// single reordering silently relabels the entire country, and every page would
// still look completely fine. So each landmass is identified by a town anybody
// can check: Aarhus is in Jutland, Rønne is on Bornholm. See "NEAREST, NOT
// CONTAINING" below for why the anchor is matched by distance rather than by
// containment, and what the test actually asserts.

import { DK_SHAPES, KM_LAT, KM_LON } from "../data/mapShapes";
import { kommuneAt, K as KCOL } from "./regions";

// Ordered as a traveller would think about the country, west to east, with the
// island that is its own trip last.
export const PART_ANCHORS = [
  { name: "Jutland", anchor: [56.1629, 10.2039], of: "Aarhus" },
  { name: "Funen", anchor: [55.4038, 10.4024], of: "Odense" },
  { name: "Zealand", anchor: [55.6761, 12.5683], of: "Copenhagen" },
  { name: "Lolland-Falster", anchor: [54.7691, 11.8743], of: "Nykøbing Falster" },
  { name: "Bornholm", anchor: [55.0999, 14.7016], of: "Rønne" },
];
export const PARTS = PART_ANCHORS.map(p => p.name);

// Ray casting. DK_SHAPES holds [lat, lon] pairs, so latitude is the y axis here.
export const pointInPoly = (lat, lon, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0], xi = poly[i][1];
    const yj = poly[j][0], xj = poly[j][1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

// The same flat projection dkProject uses, so distances here agree with the map
// the shapes are drawn on rather than being a second, slightly different idea of
// where things are.
// Lives in data/mapShapes.js, beside the shapes it projects, because regions.js
// measures kommune distances with the same numbers and importing them from here
// would make geography and regions import each other. Re-exported so every
// existing caller keeps working.
export { KM_LAT, KM_LON };
const kmToSegment = (lat, lon, a, b) => {
  const py = (lat - a[0]) * KM_LAT, px = (lon - a[1]) * KM_LON;
  const vy = (b[0] - a[0]) * KM_LAT, vx = (b[1] - a[1]) * KM_LON;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * vx + py * vy) / len2));
  const dx = px - t * vx, dy = py - t * vy;
  return Math.sqrt(dx * dx + dy * dy);
};
export const kmToPoly = (lat, lon, poly) => {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    best = Math.min(best, kmToSegment(lat, lon, poly[j], poly[i]));
  }
  return best;
};

// ── THE ISLANDS ARE THE WHOLE POINT OF THIS SITE ────────────────────
// DK_SHAPES is five coarse outlines of twenty-odd points each. It does not
// contain Ærø, Samsø, Fanø, Læsø, Møn, Anholt or Christiansø, and those are
// exactly the places Gemlyx exists to write about. A plain point-in-polygon test
// would have answered "nowhere" for most of the best entries on the site.
//
// So a point outside every outline takes the NEAREST landmass, which is the
// honest answer to the question actually being asked: Ærø is in the Funen part
// of the country, Fanø is in the Jutland part. It is not a claim about
// administrative geography and it is not stated as one.
//
// The cap stops that becoming a guess about somewhere that is not Denmark at
// all. Anholt, the furthest offshore place with an entry, sits around 40 km from
// the Jutland coast.
//
// KNOWN LIMIT, written down rather than discovered later: Malmö is about 25 km
// from Zealand and would come back "Zealand". Gemlyx is a Denmark site and no
// such entry exists, so this is a note, not a guard.
export const MAX_OFFSHORE_KM = 45;

// ── NEAREST, NOT CONTAINING ─────────────────────────────────────────
// The first version required the anchor to be INSIDE its shape, and Bornholm
// failed its own test: Rønne is on the west coast and the five-point outline
// cuts about three kilometres east of it, so Bornholm dropped out of the list
// entirely and every Bornholm entry came back "nowhere".
//
// The outlines are coarse by design, so containment is the wrong question to
// ask of them. Nearest is the right one, and it stays a real check because the
// five landmasses are hundreds of kilometres apart: no anchor is ambiguous, and
// two anchors resolving to the SAME shape is the failure worth catching, which
// is what the test asserts.
const shapeNearest = (lat, lon) => {
  let best = -1, bestKm = Infinity;
  DK_SHAPES.forEach((shape, i) => {
    const d = pointInPoly(lat, lon, shape) ? 0 : kmToPoly(lat, lon, shape);
    if (d < bestKm) { bestKm = d; best = i; }
  });
  return best;
};

const LANDMASSES = PART_ANCHORS.map(p => {
  const i = shapeNearest(p.anchor[0], p.anchor[1]);
  return { name: p.name, shapeIndex: i, poly: i >= 0 ? DK_SHAPES[i] : null };
}).filter(m => m.poly);

// Exported so a test can say which anchors failed, rather than the map silently
// losing a landmass while every page still looks completely fine.
export const RESOLVED_PARTS = LANDMASSES.map(m => m.name);
// Two names on one shape means the map has been reordered or a shape has been
// lost, and half the country is quietly mislabelled. Asserted in tests.
export const RESOLVED_SHAPE_INDEXES = LANDMASSES.map(m => m.shapeIndex);

// Returns null when there is genuinely no answer: no coordinate stored, or a
// coordinate too far from Denmark to place. NULL IS NOT A BUCKET. The caller
// must keep those entries visible under "All" and count them, because a filter
// that quietly removes an entry from every view is the blank-page failure this
// page already shipped once.
export const partOfCountry = (entry) => {
  // ── __lat FIRST, THEN lat. ONE INSTRUMENT, NOT TWO. ───────────────
  // Oliver, 19 Aug 2026: "it keeps saying I don't have any content in South
  // Jutland.. while I clearly have some."
  //
  // This read `__lat` and nothing else, while its sibling regionOf in regions.js
  // has always read `entry?.__lat ?? entry?.lat`. So the two functions that answer
  // "where is this row" disagreed about any row carrying a plain `lat`, and
  // coverageByTarget — which asks THIS one — counted those rows as nowhere. A
  // region with entries in it reported zero, and the Studio chip then told him to
  // go and write content he already had.
  //
  // Measured: a Ribe row with { lat, lon } counts 0 in south-jutland and the same
  // row with { __lat, __lon } counts 1. Same place, same numbers, different key.
  //
  // `__lat` still wins where both exist, because that is the stored, frozen,
  // coordinate-checked one and `lat` may be the model's original guess.
  const lat = Number(entry?.__lat ?? entry?.lat), lon = Number(entry?.__lon ?? entry?.lon);
  // A fast path and a plain statement of intent. It cannot be isolated by a
  // mutation and that is stated rather than hidden: a NaN falls through every
  // comparison below and a null coordinate reads as (0, 0), which is in the Gulf
  // of Guinea and refused by the cap anyway. Kept because arriving at the right
  // answer through five polygon-distance computations on a coordinate that does
  // not exist is not the same as saying so.
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  // ── THE KOMMUNE ANSWERS FIRST, BECAUSE IT KNOWS ──────────────────
  // Added 13 Aug 2026 after a test asserting the region and the landmass could
  // not disagree found that they did, twice, and both were already live.
  //
  // SAMSØ GAVE A DIFFERENT ANSWER DEPENDING ON WHERE ON IT YOU STOOD: its north
  // tip is 23.0 km from the Jutland outline, its centre 26.2 km from the FUNEN
  // one, its south tip 23.7 km from Funen. One island, three points twenty-six
  // kilometres apart, two answers, and the towns page was filing Samsø under
  // Funen. Samsø Kommune is in Region Midtjylland and its ferry leaves from Hou
  // in Jutland.
  //
  // ANHOLT CAME BACK null. The comment on MAX_OFFSHORE_KM above says Anholt
  // "sits around 40 km from the Jutland coast", and the cap was sized at 45 on
  // the strength of it. It measures 49.7. So the island fell past a cap set from
  // an estimate that was ten kilometres short, and was invisible in every
  // geography filter and counted among the unplaced, with nothing saying so.
  //
  // Neither is a bug in the outlines. It is a bug in ASKING THEM: five coarse
  // shapes cannot say which landmass an island twenty-five kilometres offshore
  // belongs to, and no redrawing fixes that, because the answer is not about
  // distance. Samsø is Jutland's because of its ferry and its kommune, not
  // because of which coast is nearest. The kommune map is not coarse and every
  // Danish island is in a kommune, so the kommune says.
  //
  // The outlines stay as the fallback rather than being deleted: they cover the
  // country continuously, so a point just off a coast that falls outside every
  // kommune box is still placed by them exactly as before.
  const k = kommuneAt(lat, lon);
  if (k) return k[KCOL.part];
  for (const m of LANDMASSES) if (pointInPoly(lat, lon, m.poly)) return m.name;
  let best = null, bestKm = Infinity;
  for (const m of LANDMASSES) {
    const d = kmToPoly(lat, lon, m.poly);
    if (d < bestKm) { bestKm = d; best = m.name; }
  }
  return bestKm <= MAX_OFFSHORE_KM ? best : null;
};

// Only the parts something is actually published in. A pill that returns nothing
// is a filter offering an empty room, which is how the nine hardcoded region
// strings went wrong in the first place.
export const partsPresent = (entries) => {
  const found = new Set((Array.isArray(entries) ? entries : []).map(partOfCountry).filter(Boolean));
  return PARTS.filter(p => found.has(p));
};

// How many published entries this cannot place. Surfaced in Studio rather than
// left as a silent hole in every geography filter: it is almost always a missing
// coordinate, which "📍 Add missing coordinates" already fixes.
export const unplaced = (entries) =>
  (Array.isArray(entries) ? entries : []).filter(e => e && e.name && !partOfCountry(e));

// ── SEARCH ──────────────────────────────────────────────────────────
// Danish names are the whole index, so folding is not a nicety: nobody types
// Ærøskøbing with the letters. Matches the name, the written region, the tag and
// the one-line description, so "Himmerland" still finds its towns even though it
// is no longer a pill.
// Lives in danishNames.js now, next to the rest of what this app knows about
// Danish spelling, and re-exported here so every existing import keeps working.
// It had a real bug: NFD ran before the å→"aa" rule and å decomposes, so "Århus"
// and "Aarhus" folded differently and could not find each other.
export { fold };

export const matchesSearch = (entry, query) => {
  const q = fold(query);
  if (!q) return true;
  // Both spellings of the entry's own name go into the haystack, so typing
  // Copenhagen finds a place filed as København and the other way round.
  const hay = fold([...variantsOf(entry?.name), entry?.region, entry?.tag, entry?.desc, entry?.partOf, entry?.dayTripFrom].filter(Boolean).join(" "));
  // Every word must appear somewhere, so "fyn harbour" narrows rather than
  // widening the way a single OR match would.
  return q.split(" ").every(w => hay.includes(w));
};

// ── WHICH ISLAND, WHICH IS NOT THE SAME QUESTION AS WHICH PART ──────
// Oliver, 19 Aug 2026: "Section 3: Island."
//
// PARTS is the wrong answer to that question on its own, and the difference
// matters on a site whose whole subject is the small islands. partOfCountry
// answers "which of the five landmasses is this nearest", so Ærø comes back
// "Funen", Fanø comes back "Jutland" and Samsø comes back "Jutland". A filter
// labelled Island offering those five would tell a reader that Ærøskøbing is on
// Funen, which is not true and is the kind of quiet wrongness this project keeps
// digging out.
//
// THE KOMMUNE ALREADY KNOWS. Every Danish island belongs to a kommune, regions.js
// says so in its own words, and for the islands that ARE their own kommune the
// kommune's name IS the island's name. That is data he already has, checked, in
// data/kommuner.js — not a list I would be inventing here. So an entry in Ærø
// Kommune is on Ærø, full stop, and nothing has to be guessed.
//
// AND JUTLAND STAYS IN THE LIST, labelled for what it is. It is a peninsula, not
// an island, but a reader filtering by island still has to be able to say "the
// mainland" — leaving it out would make every Jutland entry unreachable from this
// control. Naming it "Jutland (mainland)" is the honest way to include it.
//
// WHAT THIS DOES NOT DO: islands that share a kommune with the mainland or with
// another island are not resolved. Møn is in Vordingborg Kommune, Langeland is
// its own kommune but Strynø beside it is not, Anholt is in Norddjurs. Those come
// back as their part of the country, which is true but coarser. Inventing
// per-island polygons to fix it would be inventing borders, which is exactly what
// data/kommuner.js exists to avoid.
// Kommune name in, island name out. A TABLE and not a list plus a special case:
// the first version was a list containing "Morsø" followed by an `if (k ===
// "Morsø") return "Mors"`, and the list matched first, so the rename was
// unreachable and Mors would have been filed under the kommune's name instead of
// the island's. Morsø Kommune is the island of Mors; the kommune carries the
// genitive and the island does not.
export const ISLAND_BY_KOMMUNE = {
  "Ærø": "Ærø", "Samsø": "Samsø", "Fanø": "Fanø", "Læsø": "Læsø",
  "Langeland": "Langeland", "Bornholm": "Bornholm", "Morsø": "Mors",
};
export const ISLAND_LABEL = { Jutland: "Jutland (mainland)" };

export const islandOf = (entry, kommuneName) =>
  ISLAND_BY_KOMMUNE[(kommuneName || "").trim()] || partOfCountry(entry) || "";
