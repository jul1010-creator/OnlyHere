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

import { samePlaceName, variantsOf, fold } from "./danishNames";

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

// Venue towns first, then any town that has only a scene guide, deduped across
// spellings so København and Copenhagen are one row. Order within the result is
// left to the caller, which sorts it with the Danish collator.
export const nightlifeTownList = (spots, townPages, cities = NIGHTLIFE_CITIES) => {
  const groups = groupSpotsByTown(spots, cities);
  const all = [
    ...Object.keys(groups),
    ...(Array.isArray(townPages) ? townPages : []).map(p => p?.name).filter(Boolean),
  ];
  return all.filter((t, i, a) => a.findIndex(x => samePlaceName(x, t)) === i);
};
