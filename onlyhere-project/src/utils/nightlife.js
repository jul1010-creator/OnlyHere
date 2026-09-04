// ── "WHY IS MY NIGHTLIFE TOWN NOT PUBLISHED IN NIGHTLIFE?" ──────────
//
// Oliver, 8 Aug 2026, having just published Copenhagen as a Nightlife (Town)
// entry and found the Nightlife tab still empty.
//
// Because the tab's town list was built from VENUES and nothing else:
//
//   const townGroups = {};
//   nightlifeSpots.forEach(s => (townGroups[townOf(s.location)] ||= []).push(s));
//   const townList = Object.keys(townGroups).sort(daCompare);
//
// and the published town entry was only ever read by a `.find()` further down,
// to hang a photo and a blurb on a row that a BAR had already put on the page.
// So the "Nightlife (Town)" content type had a Studio form, a JSON schema, a
// shapeForLive branch, a publish path, a merge into `nightlifeTowns` and a
// render lookup, and not one line anywhere that could put it on the page by
// itself. Publish a town before any of its bars and the Studio says done while
// the page says "No nightlife spots published yet".
//
// That is this project's recurring failure in its purest form: a feature that
// looks finished from every angle except the one that matters. It is the same
// shape as the tier chips that landed in a grid which renders nothing, and the
// source list that reached every prompt and no search.
//
// SO THE LIST IS A UNION. A town belongs on that page if it has venues, or a
// scene guide, or both. Pulled out of App.jsx into its own module for one
// reason: a regex assertion on the JSX would have passed against the broken
// version too, because `townList` and `nightlifeTowns.find` both existed in it.
// This can be given spots and towns and asked what it returns.

import { samePlaceName, variantsOf, fold, containsName } from "./danishNames";

// The cities a venue's free-text location is matched against, ahead of the
// comma-splitting fallback, because "Copenhagen city centre" has no comma.
export const NIGHTLIFE_CITIES = [
  "Copenhagen", "Aarhus", "Aalborg", "Odense", "Esbjerg",
  "Randers", "Kolding", "Horsens", "Vejle", "Roskilde",
];

// Every spelling of every known city, folded once. A venue filed at "Københavns
// Nordvest" or "Århus C" groups with one filed in English, and the group is
// keyed on the canonical name so the page cannot show the same town twice.
const cityForms = (cities) => cities.flatMap(c => variantsOf(c).map(v => [fold(v), c]));

export const townOfLocation = (loc, cities = NIGHTLIFE_CITIES) => {
  const raw = String(loc ?? "").trim();
  if (!raw) return "";
  const l = fold(raw);
  const hit = cityForms(cities).find(([form]) => form && l.includes(form));
  if (hit) return hit[1];
  return raw.includes(",") ? raw.split(",").pop().trim() : raw;
};

export const groupSpotsByTown = (spots, cities = NIGHTLIFE_CITIES) => {
  const groups = {};
  for (const s of Array.isArray(spots) ? spots : []) {
    const t = townOfLocation(s?.location, cities);
    if (!t) continue;
    (groups[t] = groups[t] || []).push(s);
  }
  return groups;
};

// Never undefined. The old code indexed the map directly and called .filter on
// the result, so opening a town that had a scene guide and no bars threw and
// took the page down with it. That is the crash he would have hit one click
// after the one he reported.
export const spotsForTown = (groups, town) => {
  const g = groups || {};
  if (Array.isArray(g[town])) return g[town];
  const near = Object.entries(g).find(([k]) => samePlaceName(k, town));
  return near ? near[1] : [];
};

export const townPageFor = (townPages, town) =>
  (Array.isArray(townPages) ? townPages : []).find(p => p?.name && samePlaceName(p.name, town));

// Which town a bar street belongs to. `town` is its own stored field precisely
// so this question never has to parse an address, and the fallback is only for
// a street published before that field existed. Shared with nightlifeForTown
// below, which asked the same question in the same words: two copies of one
// resolution is how a street ends up on the town list and not on the town page,
// or the reverse.
export const townOfStreet = (st, cities = NIGHTLIFE_CITIES) =>
  String(st?.town || "").trim() || townOfLocation(st?.location, cities) || "";

// ── A TOWN WHOSE ONLY NIGHTLIFE IS A STREET ─────────────────────────
//
// Venue towns first, then any town that has only a scene guide, then any town
// that has only a BAR STREET, deduped across spellings so København and
// Copenhagen are one row. Order within the result is left to the caller, which
// sorts it with the Danish collator.
//
// The third source is the one that was missing. Bar streets shipped 15 Aug as a
// type of their own, nightlifeForTown was taught to read them the same day, and
// this function was not: it took spots and town pages and nothing else. So a
// town whose nightlife is one published street and no individual bars had NO
// ROW on the Nightlife page at all, and the street behind it could only be
// reached by typing its URL. Publishing an entry and having it appear nowhere
// is the exact failure nightlifeTownList was written to stop, one type later.
//
// `streets` sits third to match nightlifeForTown, which has taken it in that
// position since the day streets existed. A different order between two
// functions in one file that take the same four things is how a caller ends up
// passing the city list as the street list.
export const nightlifeTownList = (spots, townPages, streets = [], cities = NIGHTLIFE_CITIES) => {
  const groups = groupSpotsByTown(spots, cities);
  const all = [
    ...Object.keys(groups),
    ...(Array.isArray(townPages) ? townPages : []).map(p => p?.name).filter(Boolean),
    ...(Array.isArray(streets) ? streets : []).map(st => townOfStreet(st, cities)).filter(Boolean),
  ];
  return all.filter((t, i, a) => a.findIndex(x => samePlaceName(x, t)) === i);
};

// ── AND WHAT A TOWN WITH NO VENUES ACTUALLY HAS ─────────────────────
//
// The row for a town with no published bars said "Scene guide, no venues
// published yet", which was true while the only two ways onto this list were a
// venue and a scene guide. Bar streets became a third way on 3 Sep 2026, and
// the sentence went on claiming a guide that does not exist while saying
// nothing about the street that does.
//
// Named rather than counted, because "1 street" and "a bar street" cost the
// same to render and only one of them tells the reader what they are about to
// open. The empty string is not reachable from the list (a town is on it
// because of one of these three) and is returned rather than invented anyway.
export const nightlifeSummaryFor = (town, { townPages = [], streets = [], cities = NIGHTLIFE_CITIES } = {}) => {
  const guide = !!townPageFor(townPages, town);
  const mine = (Array.isArray(streets) ? streets : [])
    .filter(st => { const t = townOfStreet(st, cities); return t && town && samePlaceName(t, town); });
  const streetPart = mine.length === 1
    ? `${mine[0]?.name || "One street"}, no venues published yet`
    : mine.length > 1
      ? `${mine.length} bar streets, no venues published yet`
      : "";
  if (guide && streetPart) return `Scene guide · ${streetPart}`;
  if (streetPart) return streetPart;
  if (guide) return "Scene guide, no venues published yet";
  return "Nothing published here yet";
};

// ── COPENHAGEN, THEN GOTHERSGADE, THEN THE BARS ─────────────────────
//
// Oliver, 15 Aug 2026: "I don't know how to recommend Gothersgade. Because it's
// technically in Copenhagen.. but it's a bar street with bars.. same with
// Jomfru Ane Gade." And then the shape he wanted, exactly: "So Copenhagen ->
// Gothersgade -> List of bars.. like that."
//
// A street sits between a town and its venues, and the venues are NOT stored on
// it. Each bar keeps its own published row with its own location, and the match
// happens here, at render time. That way publishing one more bar on Gothersgade
// needs no edit to the street entry, and deleting a bar cannot leave a name
// behind on a list that nothing would ever correct.
//
// The match is the street's own name inside the venue's location, boundary
// aware and Danish-letter aware, because "Gothersgade 8B, Copenhagen" and
// "Gothersgade" are the same street written two ways and neither is wrong.

// LONGEST NAME FIRST, and this is the whole subtlety. "Store Kongensgade" and
// "Kongensgade" are two different streets in the same country, and a venue on
// the first contains the name of the second. Testing the longer name first
// means a bar is claimed by the most specific street that fits it, which is
// the only answer that can be right for both.
const byLengthDesc = (a, b) => String(b?.name || "").length - String(a?.name || "").length;

// ── "Noerregade 40" AND "Nørregade" ARE THE SAME STREET ─────────────
// fold() maps ø to o, so "Nørregade" becomes norregade, while the ASCII
// transliteration people and scraped pages actually write, "Noerregade",
// becomes noerregade. Neither contains the other and the bar falls off its own
// street in silence, which is the exact shape of miss this project keeps
// finding on a screenshot weeks later.
//
// Deliberately NOT a change to fold(). A lossier global fold would make every
// comparison in the app slightly more willing to say yes, and the streets are
// not worth that. This spells the ONE name a few ways and asks containsName
// about each, which loosens nothing anybody else relies on.
const SWAPS = [["ø", "oe"], ["æ", "ae"], ["å", "aa"]];
export const spellingVariants = (name) => {
  const base = String(name || "").trim();
  if (!base) return [];
  const out = new Set([base]);
  for (const [danish, ascii] of SWAPS) {
    for (const v of [...out]) {
      if (v.toLowerCase().includes(danish)) out.add(v.replace(new RegExp(danish, "gi"), ascii));
      if (v.toLowerCase().includes(ascii)) out.add(v.replace(new RegExp(ascii, "gi"), danish));
    }
  }
  return [...out];
};
const nameIsIn = (haystack, name) => spellingVariants(name).some(v => containsName(haystack, v));

// ── AND THE STREET IS NOT IN THE FIELD I FIRST LOOKED IN ────────────
//
// Caught reviewing my own work the same day. This read `location`, and the
// night schema asks for `location` as "Neighbourhood, City": the example in the
// prompt is literally "Indre By, Copenhagen". A bar filed that way carries no
// street name at all, so Gothersgade would have listed nothing, for every bar
// already published, and the whole feature would have looked broken while every
// test passed.
//
// `mapHint` is where the street actually lives, on every type, and it always
// has: "Train, Toldbodgade 6c, 8000 Aarhus C, Denmark". Reading both means this
// works on the rows that exist today rather than only on ones drafted after the
// schema changed, which is the difference between a feature and a plan.
const whereIsIt = (spot) => [spot?.street, spot?.location, spot?.mapHint]
  .map(v => String(v || "").trim()).filter(Boolean).join(", ");

// ── AND THE STUDIO ASKS FOR THE NAME THAT BREAKS THIS ───────────────
//
// Found by Fable, 3 Sep 2026, auditing the bar-street path. The Studio's own
// placeholder for a bar street reads "Street name + city, e.g. Gothersgade
// Copenhagen", the schema pins the typed value as the row's name, and nothing
// strips the town. So the row publishes as "Gothersgade Copenhagen" — and
// nameIsIn then looks for that whole phrase inside a venue's address, which no
// address contains. Probed: a bar at "Jomfru Ane Gade 15, Aalborg" matches the
// street "Jomfru Ane Gade" and matches NONE of "Jomfru Ane Gade Aalborg",
// "Jomfru Ane Gade, Aalborg" or "Jomfru Ane Gade (Aalborg)".
//
// The result is a street page that says "No individual venues on X are
// published yet" while its bars sit published one table away — which is the
// sentence Oliver read as a content gap and it was a naming convention.
//
// STRIPPED HERE RATHER THAN AT DRAFT TIME, because the rows are already named
// this way and a render-time fix repairs all of them at once. The town is not
// guessed: it is taken from the street's OWN town field, so nothing is removed
// unless the row itself says that word is where the street is.
const bareStreetName = (st, cities) => {
  const name = String(st?.name || "").trim();
  const town = String(st?.town || "").trim() || townOfLocation(st?.location, cities) || "";
  if (!name || !town) return name;
  // ", Aalborg" / " (Aalborg)" / " Aalborg", at the end and nowhere else: a
  // street genuinely called "Aalborggade" keeps its name.
  const tail = new RegExp(`[\\s,(]+${town.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)?\\s*$`, "i");
  const bare = name.replace(tail, "").trim();
  return bare && bare.length >= 3 ? bare : name;
};

export const streetForSpot = (spot, streets, cities = NIGHTLIFE_CITIES) => {
  const where = whereIsIt(spot);
  if (!where) return null;
  const town = townOfLocation(String(spot?.location || spot?.mapHint || ""), cities);
  const list = (Array.isArray(streets) ? streets : []).filter(s => s?.name).slice().sort(byLengthDesc);
  for (const st of list) {
    // A street in another town with the same name is a different street.
    // Nørregade exists in a dozen Danish towns.
    const stTown = String(st.town || "").trim() || townOfLocation(st.location, cities);
    if (stTown && town && !samePlaceName(stTown, town)) continue;
    // The typed name first, then the same name without the town the row itself
    // says it is in. Both, so a street named either way finds its venues.
    if (nameIsIn(where, st.name)) return st;
    const bare = bareStreetName(st, cities);
    if (bare !== st.name && nameIsIn(where, bare)) return st;
  }
  return null;
};

// ── AND IT HAS TO BE ASKED AGAINST ALL THE STREETS ──────────────────
// Fable's catch. This tested each bar against a ONE-street list, so longest-
// wins never ran, while the town page awards each bar to the most specific
// street. With Kongensgade and Store Kongensgade both published in Copenhagen,
// the town row said "1 bar published here" and opening it showed 2, and a bar
// on Store Kongensgade appeared on both streets' pages. `allStreets` defaults
// to the one street for a caller that genuinely has no others, and the page
// passes the full list.
export const barsOnStreet = (street, spots, allStreets = null, cities = NIGHTLIFE_CITIES) => {
  const list = Array.isArray(allStreets) && allStreets.length ? allStreets : [street];
  return (Array.isArray(spots) ? spots : []).filter(s => streetForSpot(s, list, cities) === street);
};

// The town page, as one answer rather than three lookups that can disagree.
// `streets` carries each street with the venues on it, `loose` is everything in
// that town on no published street, and a street with nothing on it is still
// returned: it has its own writing and its own page, and hiding it the moment
// its bars are unpublished would make it flicker in and out of existence.
export const nightlifeForTown = (town, spots, streets, cities = NIGHTLIFE_CITIES) => {
  const inTown = (Array.isArray(spots) ? spots : []).filter(s => {
    const t = townOfLocation(s?.location || s?.mapHint, cities);
    return t && town && samePlaceName(t, town);
  });
  const townStreets = (Array.isArray(streets) ? streets : []).filter(st => {
    const t = townOfStreet(st, cities);
    return t && town && samePlaceName(t, town);
  }).slice().sort(byLengthDesc);
  const claimed = new Set();
  const withBars = townStreets.map(st => {
    const bars = inTown.filter(s => {
      if (claimed.has(s)) return false;
      // Asked against the FULL street list, not just this one, so a bar on
      // Store Kongensgade is claimed by Store Kongensgade even while the
      // shorter street is the one being filled.
      const owner = streetForSpot(s, townStreets, cities);
      return owner === st;
    });
    bars.forEach(b => claimed.add(b));
    return { street: st, bars };
  });
  return { streets: withBars, loose: inTown.filter(s => !claimed.has(s)) };
};
