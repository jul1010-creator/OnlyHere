// ── Shared guide geo/matching helpers ─────────────────────────────
// Extracted out of App.jsx so pages/GuidePage.jsx (the guide's only real view
// now that the old in-app "little book" modal is gone) can compute the exact
// same route icons/distances/real-place matches the guide-BUILDING pipeline
// in App.jsx already relies on, without duplicating this logic by hand and
// risking the two copies drifting apart the next time one of them gets a bug
// fix (this exact drift is how the "2-3 hour transit that's really a 5
// minute walk" class of bug happened in the first place).
//
// These are plain functions, not React state/hooks, so they work identically
// whether called from App.jsx (while a guide is being built) or GuidePage.jsx
// (while a finished guide is being viewed/enriched). A `geo` dict — real
// coordinates freshly resolved for THIS specific guide's stops, keyed by stop
// name — is always passed in explicitly rather than read from component
// state, so there's exactly one source of truth for "what do we know about
// this stop's location" per call, not two that can disagree.
import { craftItemsFallback } from "../data/craft";
import { events, majorEvents, vikingEvents } from "../data/events";
import { towns, TOWN_COORDS } from "../data/towns";
import { freeEntrance } from "../data/freeEntrance";
import { nightlifeSpots } from "../data/nightlife";
import { nightlifeStreets } from "../data/nightlifeStreets";
import { foodSpots } from "../data/food";
import { detectLegMode, haversineKm, isFerryText } from "./helpers";
import { containsName, variantsOf, distinctiveWords } from "./danishNames";

// Looks up a stop name against everything real Gemlyx already knows, so a
// guide can show real price/hours/type instead of just repeating the AI's
// own prose, and so a stop can link into that place's real Gemlyx page.
// ── THE COORDINATE A PUBLISHED ROW ACTUALLY CARRIES ─────────────────
// Published payloads store __lat and __lon (see shapeForLive in
// utils/studioContent.js and the TOWN_COORDS assignment in liveContent.js).
// Nothing stores a bare `lat`. Every other reader in the app already knows
// this: correction.js reads `entry?.__lat ?? entry?.lat`, geography.js,
// DetailPage and entryAudit all read __lat.
//
// This file read `real.lat`, so it was always undefined, and the ENTIRE
// "we have a real coordinate on file" tier of the resolution chain has never
// once fired in production. Every stop in every guide fell through to Nominatim
// or to the crude town-centre fallback, which is why fixes in this area kept
// half-working: the good branch was never the branch being taken.
export const placeCoords = (row) => {
  const lat = Number(row?.__lat ?? row?.lat);
  const lon = Number(row?.__lon ?? row?.lon);
  // Number.isFinite, not truthiness. A row with no coordinate gives NaN, and
  // `0` is a real number that happens not to occur in Denmark; conflating the
  // two is how a missing coordinate becomes a point in the Gulf of Guinea.
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
};

// ── MATCHING A STOP NAME TO A PUBLISHED PLACE ───────────────────────
// This was a bare, bidirectional, unbounded substring test, and it sits at the
// HEAD of the resolution chain, outranking both the geocode and the town
// fallback. Every failure mode this codebase has fixed elsewhere was live here:
//
//   "Vejlebrovej viewpoint" contained "Vejle"        -> the wrong town
//   "Marselisborg" contained "Als"                    -> the wrong island
//   the stop "Møn" was contained by "Møns Klint"      -> a cliff, not an island
//   the stop "Ribe" was contained by "Ribe VikingeCenter" -> 3 km out of town
//
// The comment forty lines below describes exactly this bug and fixes it in
// townInName, which guards the LOW-precedence fallback. The high-precedence
// path kept the broken test. containsName has existed and been tested since
// this morning and is used in four other files; it was never used here.
//
// Boundaries in both directions, and then THREE TIERS, because the two
// directions of containment mean opposite things and ranking them together
// picks the wrong entry either way round.
//
//   exact      the stop names the place. Nothing beats this.
//   narrowing  the STOP contains the entry's name, so the stop is the more
//              specific of the two: "Ribe VikingeCenter" contains "Ribe".
//              Longest wins, because the longest entry name is the closest
//              thing to what the stop actually says.
//   widening   the ENTRY contains the stop's name, so the entry is more
//              specific than the stop was: the stop "Kronborg" against an
//              entry "Kronborg Slot". Shortest wins here, and this tier is
//              last, because answering a broad stop with a narrow entry is
//              over-reaching. It is the tier that turned the stop "Ribe",
//              which means the town, into Ribe VikingeCenter three km outside
//              it, taking its coordinate with it.
// ── A TOWN IS WHERE A STOP IS, NOT WHAT A STOP IS ───────────────────
// Oliver, 15 Aug 2026, on a live five day Jutland guide: "~1 min on foot"
// between ARoS and Aarhus Ø, which Google puts at 1.3 km and 20 minutes, and
// "~24 mins by train/bus" between Den Gamle By and ARoS, which is a 700 metre
// walk. Both legs, and three wrong type badges and three wrong links on the
// same page, are this one line.
//
// `towns` is in the pools, and the narrowing tier says "the stop contains the
// entry's name, so the stop is the more specific of the two". That is right
// for every pool except this one. A stop called "Aarhus Ø" contains "Aarhus",
// so it matched the TOWN of Aarhus, at the top of the resolution chain, and
// took the town centre coordinate with it — flagged `precise: true`, because
// the flag describes where the coordinate came from and a published row is
// normally the most precise thing there is.
//
// Everything downstream then behaved correctly on a false premise:
//   - geocodeStopsForGuide skipped it, because it already had a precise coord
//     (this guide's _geo has no entry for Aarhus H, Aarhus Street Food, ARoS,
//     Aarhus Ø or Kolding City Centre — every stop naming its own town)
//   - directionsEndpoint sent a bare coordinate pair, so Google measured a
//     real journey to the middle of Aarhus instead of to ARoS
//   - legDistanceKm's collapse guard needs BOTH ends imprecise, and these were
//     both "precise", so two stops on the identical point gave 0 km and
//     estimateMinutes' Math.max(1, …) printed it as "~1 min"
//   - the card showed the type "Town" and linked to the Aarhus town page
//
// The rule is the one this file already applies one tier down in townInName,
// and it is the same judgement: a town name inside a longer stop name tells
// you the AREA, and an area is the fallback, never the identity. So a town row
// may answer an EXACT match ("Aarhus" the stop is Aarhus the town) and nothing
// else. Every other tier drops it, the stop reaches Nominatim like any other
// unplaced venue, and if that fails it still lands on the town centre through
// townFallbackFor, which says out loud that it is approximate.
const TOWN_ROW = (p) => p?._src === "town";
export const lookupRealPlace = (name) => {
  if (!name) return null;
  const pools = [
    ...freeEntrance.map(p => ({ ...p, _src: "free" })),
    ...craftItemsFallback.map(p => ({ ...p, _src: "craft" })),
    ...foodSpots.map(p => ({ ...p, _src: "food" })),
    ...nightlifeSpots.map(p => ({ ...p, _src: "nightlife" })),
    // ── A BAR STREET IS PUBLISHED AND WAS NOT IN HERE ─────────────
    // The guide's plan gate asks `isPublished(name)`, which is this function,
    // and this list was written before bar streets existed. So a street live on
    // the site since 15 Aug read as unpublished to the one check that decides
    // whether a guide may name a stop: Gemlyx would not put Jomfru Ane Gade in
    // an Aalborg night out, on the grounds that it does not have an entry for
    // it, while the entry sat there.
    //
    // Its own _src, not "nightlife". A street is not a bar, stopKind labels it
    // separately, and the click routing in App.jsx opens the two differently.
    ...nightlifeStreets.map(p => ({ ...p, _src: "nightlifeStreet" })),
    ...[...events, ...majorEvents, ...vikingEvents].map(p => ({ ...p, _src: "event" })),
    ...towns.map(p => ({ ...p, _src: "town" })),
  ].filter(p => p?.name);
  // Mutual containment is equality once both sides are folded and spaced, so
  // this is a Danish-letter-aware exact match without a second comparison rule.
  const narrowing = pools.filter(p => containsName(name, p.name));
  const exact = narrowing.filter(p => containsName(p.name, name));
  if (exact.length) return exact.sort((a, b) => String(b.name).length - String(a.name).length)[0];
  const narrowed = narrowing.filter(p => !TOWN_ROW(p));
  if (narrowed.length) return narrowed.sort((a, b) => String(b.name).length - String(a.name).length)[0];
  // NARROWING ONLY. Towns stay in the widening tier on purpose, and the two
  // directions are why: narrowing means the stop is MORE specific than the town
  // it names, which is the bug above. Widening means the stop is LESS specific
  // than the entry, so a stop reading "Nørresundby" against a row spelled
  // "Nørresundby (Aalborg)" is one place under two spellings, and answering it
  // with the town is right. Dropping towns here too was tried and no assertion
  // could be written that justified it, which is its own answer.
  const widening = pools.filter(p => containsName(p.name, name));
  if (widening.length) return widening.sort((a, b) => String(a.name).length - String(b.name).length)[0];
  return null;
};

// BUG FIX (the "2-3 hour transit leg that's really a 5 minute walk" report):
// precise sources (a real lat/lon on file, or this guide's own fresh geocode,
// passed in via `geo`) must be checked BEFORE the crude town-center fallback,
// never folded into one `||` chain where the crude fallback's near-constant
// truthiness silently wins every time. See CHANGES_THIS_PASS.md for the full
// story of how the old ordering broke this.

// ── "Vejlebrovej" IS NOT VEJLE ──────────────────────────────────────
// Found 7 Aug 2026 while writing the regression test for the "1 min on bike"
// report, in a real published guide. A stop called "Vejlebrovej coast
// viewpoint", which the plan placed in Svendborg, was resolving to Vejle:
// 55.709, 9.536, about eighty kilometres away on the other side of the Belt.
//
// Because this fallback asked `name.includes(town)` and "Vejlebrovej" contains
// "Vejle". A bare substring test means any stop whose name happens to spell a
// town inside a longer word silently inherits that town's coordinates, and the
// result looks completely ordinary: a real pin, in a real Danish town, on the
// wrong side of the country. Danish street names ending in -vej make this far
// from a freak case.
//
// A town counts only when it stands as its own word. `\b` is no good here
// because Æ, Ø and Å are not word characters to JavaScript, so an Ærøskøbing
// or a Nykøbing would break in a different direction. This checks the
// characters on either side for being letters, in any alphabet.
//
// LONGEST MATCH WINS, separately: with plain .find(), "Nykøbing" could answer
// for a stop in "Nykøbing Falster" purely by key order.
const isLetter = (ch) => !!ch && /\p{L}/u.test(ch);
export const townInName = (name, town) => {
  const n = String(name || "").toLowerCase(), t = String(town || "").toLowerCase();
  if (!n || !t) return false;
  let from = 0;
  for (;;) {
    const i = n.indexOf(t, from);
    if (i < 0) return false;
    if (!isLetter(n[i - 1]) && !isLetter(n[i + t.length])) return true;
    from = i + 1;
  }
};
export const townKeyFor = (name) =>
  Object.keys(TOWN_COORDS)
    .filter(t => townInName(name, t))
    .sort((a, b) => b.length - a.length)[0] || null;


// ── A COORDINATE IS A CLAIM ABOUT WHICH TOWN YOU ARE IN ─────────────
// Oliver, 12 Aug 2026, on a live guide: "the maps go all the way to
// Amalienborg in Billund.. which is a lego castle.. that is embarassing." The
// header of that guide said 4 DAYS, 6 STOPS, 1 TOWN and described a trip that
// "stays in one place, mostly by bike". The map crossed the country, and the
// chip between Nyhavn and Amalienborg, which are a ten minute walk apart, read
// "13 hours 52 mins by bike".
//
// utils/coordCheck.js already does this arithmetic and does it well, but it
// runs in one place only: against a STORED __lat, at PUBLISH time. Two other
// coordinates reach a reader and neither was ever checked.
//
//   1. THE FRESH GEOCODE. geocodeStopsForGuide takes Nominatim's top hit at
//      limit=1 and keeps it with no test of any kind, and the resolvers below
//      then mark it precise: true. A Danish place name is not unique, and
//      Miniland at Legoland Billund holds scale models of Danish landmarks
//      carrying their real names.
//   2. THE STORED COORDINATE, AT READ TIME. The publish gate added 11 Aug
//      stops a bad coordinate going IN. Every row published before it existed
//      went in unchecked, and is still trusted at the top of the chain on
//      every render.
//
// So the check has to live where the resolution happens and not only where the
// publishing happens, and it has to cover both tiers, because from the map's
// point of view they produce the identical wrong pin. Which of the two put
// Amalienborg in Billund is not knowable from here, and does not need to be:
// covering both is correct either way.
//
// THE RULE IS DELIBERATELY ONE-SIDED. All it can do is DEMOTE a coordinate to
// the town-centre fallback, which is already drawn as a dashed ring, labelled
// "(somewhere in X)", counted under the map, and sent to Google Directions as
// the stop's NAME rather than a bare pair. So the worst a false positive can
// do is turn a confident pin into an honest approximate one. It cannot delete
// a stop, cannot invent a coordinate, and cannot make the map shorter. A check
// that could do more than that has no business running unattended.
//
// And it refuses to judge when it has nothing to judge against: no town on the
// stop, or a town we hold no coordinate for, and the coordinate stands
// untouched. Same discipline as coordProblems, which never accuses an entry it
// cannot actually check.
export const MAX_TOWN_KM = 50;

// The town the STOP says it is in, resolved to a point. Tries the Danish and
// English spellings, because a stop in "Kobenhavn" and a stop in "Copenhagen"
// are the same claim and TOWN_COORDS is keyed on one of them.
export const townPointFor = (town) => {
  for (const v of variantsOf(String(town || ""))) {
    const key = townKeyFor(v);
    if (key && TOWN_COORDS[key]) return { key, lat: TOWN_COORDS[key][0], lon: TOWN_COORDS[key][1] };
  }
  return null;
};

// Returns a verdict rather than a boolean, because the caller has to be able
// to say WHY in the run log. A silent rejection would be the same class of bug
// as the one it exists to fix.
export const coordFitsTown = (coord, town) => {
  const lat = Number(coord?.lat), lon = Number(coord?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { ok: false, why: "not-a-coordinate" };
  const t = townPointFor(town);
  // ── WHAT THIS CHECK CANNOT SEE, WRITTEN DOWN RATHER THAN CHANGED ──
  // 17 Aug 2026, tracing a guide whose first leg was measured from Copenhagen
  // Airport to a bus stop at BELLA CENTER: a real Google route, at the right
  // time, to the wrong place. The destination had been stamped precise and sent
  // as a bare lat,lon.
  //
  // Two limits let that through, and neither is fixed here on purpose:
  //
  //   1. MAX_TOWN_KM is 50. Bella Center is about 4 km from Copenhagen's town
  //      point, so a coordinate several kilometres from the intended venue is
  //      "near-town" and passes. Inside one city this check cannot see an error
  //      at all.
  //   2. An unknown town returns ok. "Kastrup" is not a TOWN_COORDS key, so for
  //      that stop any coordinate is accepted.
  //
  // Refusing on an unknown town was tried and reverted: it turns 14 existing
  // assertions red, and those assertions encode the 10 August fix that made the
  // precise tier fire at all. Undoing that unattended would trade a wrong point
  // inside one city for no measured coordinates anywhere. The right fix is a
  // radius that means "in this town" plus a separate, tighter rule for the one
  // decision that sends a bare coordinate to Google, and that is his call to
  // make rather than a 2 am edit.
  if (!t) return { ok: true, why: "nothing-to-check-against" };
  const km = haversineKm({ lat, lon }, { lat: t.lat, lon: t.lon });
  return km > MAX_TOWN_KM
    ? { ok: false, why: "far-from-town", km, town: t.key }
    : { ok: true, why: "near-town", km, town: t.key };
};

// THE FALLBACK, IN ONE PLACE. The pin, the "(somewhere in X)" label under it
// and the town centre the coordinate actually comes from have to agree, and
// they only agree by construction if one function decides all three. They did
// not before: the resolver fell back on townKeyFor(name) while GuidePage
// labelled the same pin with a separate townKeyFor(name) call, so any change
// to one silently disagreed with the other.
//
// The stop's own town is tried first because it is a stated fact about the
// stop, and the name is a guess: townKeyFor("Amalienborg") is null, which is
// why a pin that WAS being approximated to a town centre could still be
// labelled only "(approximate)" with no town named.
export const townFallbackFor = (town, name) => townPointFor(town) || townPointFor(name);

export const resolveStopCoords = (name, geo = {}, town = "") => {
  const real = placeCoords(lookupRealPlace(name));
  if (real && coordFitsTown(real, town).ok) return { lat: real.lat, lon: real.lon };
  if (geo[name] && coordFitsTown(geo[name], town).ok) return geo[name];
  const t = townFallbackFor(town, name);
  if (t) return { lat: t.lat, lon: t.lon };
  return null;
};

export const kmBetween = (a, b) => {
  const dLat = (a.lat - b.lat) * 111.32;
  const dLon = (a.lon - b.lon) * 62.06;
  return Math.sqrt(dLat * dLat + dLon * dLon);
};

// PRECISION-AWARE resolution — the fix for the longest-running bug in this
// project (Oliver, at least four separate reports ending with "it still does
// these 1 min walk when it's really 30").
//
// ROOT CAUSE, finally stated exactly: resolveStopCoords' last resort is a
// SUBSTRING match against TOWN_COORDS. Two different stops in the same town
// ("Samsø" and "Samsø Island Distillery"; "Faxe Kalkbrud" and "Faxe Kirke")
// therefore resolve to the IDENTICAL town-centre point. kmBetween then returns
// ~0, and estimateDurationText turns that into a confident "~1 min" — a number
// invented out of two coordinates that were never about those stops at all.
// Worse, resolveLegMode's distance overrides all saw 0 km, so a genuinely
// 4.5km leg kept whatever mode it started with (walking) and the Directions
// API dutifully returned a real 1 hour 15 minute WALK, which then rendered as
// a suggested leg. Both of Oliver's screenshots are this single bug.
//
// The honest answer when both ends only resolved to the same town centre is
// "we do not know this distance" — not zero. legDistanceKm returns null there,
// and every caller already handles null by showing the AI's own leg text or
// "Check route" instead of a fabricated figure.
export const resolveStopCoordsDetailed = (name, geo = {}, town = "") => {
  const real = placeCoords(lookupRealPlace(name));
  if (real && coordFitsTown(real, town).ok) return { lat: real.lat, lon: real.lon, precise: true };
  if (geo[name] && coordFitsTown(geo[name], town).ok) return { ...geo[name], precise: true };
  const t = townFallbackFor(town, name);
  if (t) return { lat: t.lat, lon: t.lon, precise: false };
  return null;
};

// ── HOW CLOSE IS TOO CLOSE TO BELIEVE ───────────────────────────────
// The guard below asked for BOTH ends to be imprecise, which is the narrowest
// possible reading of a collapse and left two holes open:
//
//   1. ONE end precise, the other a town centre. The distance is then
//      "from this venue to the middle of its town", which is a real number
//      about a question nobody asked, and it prints with full confidence.
//   2. BOTH ends "precise" and identical, which is what the town-row bug
//      above produced: `precise` was true, the guard never ran, 0 km survived
//      and reached the reader as "~1 min on foot" for a 1.3 km walk.
//
// So the threshold is on the DISTANCE as well as on the provenance. Two stops
// a guide bothered to list separately, and wrote a leg between, are not 150
// metres apart; that figure is a collapse signature every time it appears, and
// the honest answer to a collapse is that we do not know. Every caller already
// handles null by falling back to the model's own leg text or "Check route".
export const COLLAPSE_KM = 0.15;
// Trustworthy straight-line distance, or null when the inputs can't support one.
export const legDistanceKm = (originName, destName, geo = {}, originTown = "", destTown = "") => {
  const a = resolveStopCoordsDetailed(originName, geo, originTown);
  const b = resolveStopCoordsDetailed(destName, geo, destTown);
  if (!a || !b) return null;
  const km = kmBetween(a, b);
  // Anything under the threshold is a collapse, whatever the flags claim: two
  // separately named stops with a leg between them are never this close.
  if (km < COLLAPSE_KM) return null;
  // And a town centre standing in for a venue cannot support a SHORT distance
  // either. Half a kilometre of slop is normal in a town centre point, so a
  // sub-kilometre figure built on one is noise wearing a number.
  if ((!a.precise || !b.precise) && km < 1) return null;
  return km;
};

// ── WHAT GOOGLE SHOULD BE ASKED ABOUT ───────────────────────────────
// Third reader of the `precise` flag, and the one that costs money.
//
// A coordinate is only worth sending as a coordinate when it is ABOUT THIS
// STOP. resolveStopCoordsDetailed answers with a town centre when nothing
// placed the stop, and says so in `precise` — but the Directions fetch tested
// the coordinate for truthiness, so "somewhere in Samsø" was shipped to Google
// as a bare "55.87,10.60". api/directions.js then correctly refuses to append
// ", Denmark" to a coordinate pair (a real fix: the country hint used to
// corrupt genuine pairs), so the venue name never reached Google at all. The
// leg came back measured, confident and about the wrong point, and disagreed
// with the "Open in Maps" link on the same page, which is deliberately built
// from names.
//
// The name is the better input in that case, not a worse one. Google's
// geocoder is far better at Danish venue names than our substring matcher, so
// either it finds the venue and the leg is genuinely measured, or it finds
// nothing and the leg falls back to an estimate that is labelled as one. A
// town centre guarantees a confident wrong answer instead of an honest miss.
// ── WHICH CITY A LOCATION STRING IS IN ───────────────────────────────
//
// Oliver, 17 Aug 2026, with a screenshot of the Food page: "Fix filters.. that is
// ridiculous.."
//
// He is right and it is worse than untidy. The row was built as
//
//   [...new Set(foodSpots.map(f => f.location || f.city))]
//
// and a food entry's `location` is "Neighbourhood, City". So the filter offered
// one chip per NEIGHBOURHOOD, named the variable `cities`, and the row he
// photographed reads: Amagerbro Copenhagen, Christianshavn Copenhagen, City centre
// Aarhus, Frederiksberg Copenhagen, Hald Viborg, Klostertorvet Aarhus C. Three
// separate chips for Copenhagen, two for Aarhus under different sub-labels, a
// horizontal scrollbar, and one more chip for every entry he ever publishes.
// Nobody browsing dinner in Aarhus can find it, which is the one job the filter has.
//
// So it groups by city. The last comma-separated part is the city in every Danish
// address shape the app produces, and the postal-district letter has to come off or
// "Aarhus C" and "Aarhus" are two cities. townKeyFor then folds København and
// Copenhagen onto one chip, which is the same reason it exists everywhere else in
// this file.
//
// ONE definition, used by the food filter AND the attractions filter, which had its
// own KNOWN_CITIES list of ten hardcoded names beside a lookalike cityOf. A second
// copy of this is how "also" became an island.
const POSTAL_SUFFIX = /\s+(?:C|K|N|NV|NØ|S|SV|SØ|V|Ø)$/i;

export const cityFromLocation = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  // ── AND THE COUNTRY IS NOT A CITY ────────────────────────────────
  // A mapHint is a full address: "Café Broløs, Klostertorvet 10, 8000 Aarhus C,
  // Denmark". Taking the last segment gave a chip labelled Denmark, on a Danish
  // travel guide, which is the funniest possible version of this bug.
  const parts = raw.split(",").map(x => x.trim()).filter(Boolean)
    .filter(x => !/^(?:denmark|danmark|dk)$/i.test(x));
  const last = (parts.length ? parts[parts.length - 1] : raw).trim();
  // "8000 Aarhus C" and "1456 København K" both arrive here from a mapHint.
  const withoutCode = last.replace(/^\d{4}\s+/, "").trim();
  const bare = withoutCode.replace(POSTAL_SUFFIX, "").trim();
  // ── AND KØBENHAVN AND COPENHAGEN ARE ONE CHIP ────────────────────
  // townKeyFor alone answers "København" with "København", so the filter would
  // have offered both spellings as separate cities, which is the same bug one
  // spelling along. variantsOf is what townPointFor uses ten lines above for the
  // identical reason.
  for (const v of [bare, withoutCode]) {
    for (const spelling of variantsOf(v)) {
      const key = townKeyFor(spelling);
      if (key) return key;
    }
  }
  return bare || withoutCode;
};

// ── AND WHERE A STOP IS, SAID OUT LOUD ───────────────────────────────
//
// Oliver, 17 Aug 2026, reading a guide of his own:
//
//   "I think you need to make it explicit where these places are.. like 'JOJO'..
//    nobody knows that is in Aarhus.."
//
// He is right, and the maddening part is that the app already knows. The guide
// writer fills `town` on a stop when it happens to, and when it does not, the card
// printed the bare name — while the published row that stop resolves to, a row he
// wrote himself, carries the location in one of four different fields depending on
// the content type: `town` on an event, `city` on an attraction, `location` on a
// restaurant or bar, and a full postal address in `mapHint`. Nothing read any of
// them.
//
// So this asks in order: what did the plan say, then what does our own row say. It
// never guesses from the name, and it never returns a country — cityFromLocation
// above throws Denmark away for exactly this reason.
//
// AN ADDRESS IS NOT A LABEL. `location` on a food row is a street address, so it
// goes through cityFromLocation instead of being printed raw: "Klostertorvet 10,
// 8000 Aarhus C" under a card name is noise, "Aarhus" is the answer.
export const stopTown = (stop, row) => {
  const said = String(stop?.town || "").trim();
  if (said) return said;
  for (const field of ["town", "city"]) {
    const v = String(row?.[field] || "").trim();
    if (v) return v;
  }
  for (const field of ["location", "mapHint"]) {
    const v = cityFromLocation(row?.[field]);
    if (v) return v;
  }
  return "";
};

// ── TWO STOPS THAT ARE ONE PLACE ─────────────────────────────────────
//
// Oliver, 17 Aug 2026, with a screenshot of "Tivoli Gardens" and "Tivoli
// Christmas market" on one day and a chip between them reading "No direct route,
// check Rome2Rio". They are the same grounds; the market is Tivoli after dark,
// and the entry's own words are "the same grounds transform once the light drops".
//
// Google was asked to route from a place to itself, found no transit itinerary,
// and the no-route branch printed the most alarming line in the file.
//
// 300 metres, and the number has a reason: a large site legitimately carries two
// stops with coordinates a couple of hundred metres apart (a park entrance and a
// stage inside it), and the shortest walk anybody would ever describe as a leg is
// longer than that. Under it, there is nothing to travel.
// ── 300 METRES IS A WALK, NOT "THE SAME PLACE" ──────────────────────
//
// 23 Aug 2026, from the same guide. Day 4 read "Design Museum Denmark 10:00 ...
// Same place, nothing to travel ... 12:15 Amalienborg". They are two separate
// paid attractions about 350 metres apart on Bredgade, and the reader is told
// there is nothing between them.
//
// This constant is meant to say "the same site": two stops inside one complex,
// a harbour and the café on it, a museum and its annexe. At 300 metres it was
// saying "close", and close is a four minute walk that a person planning a day
// needs to see. Telling somebody there is nothing to travel and then making
// them cross a district is the small lie that makes a whole document feel
// careless.
//
// 120 metres is a courtyard. Anything past it gets a leg, and the leg is a walk
// because of the rule added to resolveLegMode the same evening.
export const SAME_SPOT_KM = 0.12;

// The distance decides when there is one. NOT through legDistanceKm, which is
// where the first version of this went wrong: that function deliberately returns
// null under COLLAPSE_KM, because a sub-50-metre gap between two named stops is
// its definition of a collapse. The tiny case is precisely the case here, so the
// points are read directly.
//
// Two IMPRECISE points are never called the same spot, however close they look:
// both fell back to a town centre, the zero is an artefact, and the existing
// collapse guard already owns that path. Not knowing is not the same as knowing
// they are one place.
//
// With no coordinates at all the name is the only signal, and the rule has to
// separate two cases that look identical: "Tivoli Gardens" beside "Tivoli
// Christmas market" is one site, and "Aarhus Domkirke" beside "Aarhus Ø" is a
// cathedral and a harbour 3 km apart. What tells them apart is what the shared
// word IS. A shared word that is a TOWN name says nothing, because every stop in
// a town can carry it. A shared word that is neither a town nor generic is a
// venue, and two stops naming the same venue are the same place. Louisiana Museum
// and Louisiana Cafe are one site by the same reasoning.
export const isSameSpot = (aName, bName, geo, aTown, bTown) => {
  const a = String(aName || "").trim(), b = String(bName || "").trim();
  if (!a || !b) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  const pa = resolveStopCoordsDetailed(a, geo, aTown);
  const pb = resolveStopCoordsDetailed(b, geo, bTown);
  if (pa && pb) {
    if (!pa.precise || !pb.precise) return false;
    return kmBetween(pa, pb) <= SAME_SPOT_KM;
  }
  // ── AND THE TOWN FILTER HERE WAS DEAD CODE ────────────────────────
  // It read `.filter(w => !townKeyFor(w))`, to stop "Aarhus Domkirke" beside
  // "Aarhus Ø" being called one place on the shared word Aarhus. Mutating it away
  // changed no test, which is how it was found, and then the reason was plain:
  // this branch only runs when NEITHER name resolved to a coordinate, and
  // resolveStopCoordsDetailed falls back on townKeyFor(name), so a name
  // containing a known town always resolves and never reaches here. The filter
  // could not fire. Removed rather than left in as reassurance, and the case it
  // was worried about is handled where it actually happens: two names that both
  // fall back to one town centre are refused above, on the precise flag.
  const wa = distinctiveWords(a), wb = distinctiveWords(b);
  if (!wa.length || !wb.length) return false;
  return wa.some(w => wb.includes(w));
};

export const directionsEndpoint = (name, coord, town = "") => {
  if (coord && coord.precise && Number.isFinite(Number(coord.lat)) && Number.isFinite(Number(coord.lon))) {
    return { param: `${coord.lat},${coord.lon}`, fromCoords: true };
  }
  const t = String(town || "").trim();
  return { param: `${name}${t ? `, ${t}` : ""}, Denmark`, fromCoords: false };
};

// The companion rule, and the half that makes the above a fix rather than
// half of one. The Directions fetch threw away any answer whose two ends had
// both collapsed onto the same town centre — correct while those collapsed
// coordinates were what we sent, and wrong the moment we started sending
// names, because then Google geocoded two distinct venues and the answer is
// about them, not about our collapse. So the rule has to know what was sent.
export const collapsedRoute = (a, b, sentAsCoords) =>
  !!sentAsCoords && !!a && !!b && !a.precise && !b.precise && kmBetween(a, b) < 0.05;

// Oliver's explicit rule: "No walking more than 15-20 minutes." At a real
// 4.5 km/h walking pace 20 minutes is about 1.5 km, so that is the hard cap
// on any leg planned, routed, or displayed as a walk.
export const WALK_MAX_MINUTES = 20;
// DERIVED, not typed. This was a hardcoded 1.5, documented as "20 minutes at
// 4.5 km/h", and adding ROUTE_FACTOR silently broke that: with a 1.35 detour a
// 1.5 km straight line is 27 minutes, so resolveLegMode kept calling legs
// walkable that walkEstimateTooFar then rejected as "Too far to walk". A
// 1.2 km stroll rendered as a routing failure. Two constants describing one
// rule will always drift, so there is now only one.
export const WALK_MAX_KM = (WALK_MAX_MINUTES / 60) * 4.5 / 1.35;

// SINGLE SOURCE OF TRUTH for leg transport mode — used by the exact-duration
// fetch AND every render site that shows a route icon/label, so the fetch and
// the display can never disagree about which mode a leg actually used.
export const resolveLegMode = (how, primaryMode, originName, destName, onlyWalking = false, geo = {}) => {
  let mode = detectLegMode(how, primaryMode);
  // legDistanceKm, not raw kmBetween — a town-centre collapse must read as
  // "unknown" here too, otherwise every distance override below silently sees
  // 0 km and leaves a 4.5 km leg marked as a walk (see the comment on
  // legDistanceKm; this is exactly the "1 hour 15 min on foot" screenshot).
  const distKm = legDistanceKm(originName, destName, geo);
  if (distKm != null) {
    // 2.5 km was ~33 minutes on foot — over Oliver's stated 15-20 minute
    // ceiling, and the reason a 27 minute walk shipped as a suggested leg.
    const walkCapKm = onlyWalking ? Infinity : WALK_MAX_KM;
    if (mode === "walking" && distKm > walkCapKm) {
      // Too far to walk, so fall back to how this traveler is ACTUALLY getting
      // around on this trip rather than guessing from distance alone (the old
      // rule turned every 3-60 km walk into "bicycling", which is nonsense on
      // a public-transport trip). The 60 km bike sanity cap is kept.
      const primary = primaryMode === "bike" ? "bicycling" : primaryMode === "car" ? "driving" : "transit";
      mode = (primary === "bicycling" && distKm > 60) ? "transit" : primary;
    }
    else if (mode === "bicycling" && distKm > 60) mode = "transit";
    // BUG FIX (Oliver: "there is no route from Ærøskøbing to Ærøskøbing havn.
    // You need to seek out Rome2Rio for that"): on a public-transport trip,
    // every leg defaulted to transit — including two stops a few hundred
    // meters apart in the same small town. Google's transit routing quite
    // reasonably has no bus between a village center and its own harbour, so
    // the leg came back ZERO_RESULTS and rendered as the "No direct route,
    // check Rome2Rio" chip — for what is in reality a five minute walk. Any
    // transit leg this short is a walk; the only exception is an explicit
    // ferry/boat leg (a 1km harbour crossing is genuinely not walkable).
    else if (mode === "transit" && distKm <= 1.5 && !isFerryText(how)) mode = "walking";
    // ── AND THE SAME RULE FOR A CAR, WHICH IT NEVER HAD ──────────────
    //
    // Oliver, 23 Aug 2026, on a live guide: four days in Copenhagen where every
    // leg read "5 mins by car", "12 mins by car", "15 mins by car", while the
    // guide's OWN essentials told him "lad bilen stå: parkering er dyrt og
    // svært". Danish Architecture Center to Strøget is about a kilometre. The
    // document contradicted itself inside two screens.
    //
    // The transit branch above has had this rule since Ærøskøbing and the
    // comment beside it gives the reason: a leg that short is a walk. Nothing
    // about that reasoning is specific to trains. It is stronger for a car,
    // because the car also has to be parked at the other end, in the city this
    // product keeps telling people not to drive in.
    //
    // WALK_MAX_KM rather than the transit branch's flat 1.5, deliberately. It is
    // the distance this product already defends as how far it will ask anybody
    // to walk, derived from WALK_MAX_MINUTES, so the ceiling moves in one place.
    // That makes this branch STRICTER than the transit one, which is the right
    // way round: somebody who chose a car may have luggage in it.
    else if (mode === "driving" && distKm <= WALK_MAX_KM && !isFerryText(how)) mode = "walking";
  }
  return mode;
};

// SAME-TOWN RULE (Oliver, second report of this class: "It still does it..
// Ribe Vikingecenter to Ribe Old Town.. No direct route, check Rome2Rio"):
// the distance-based short-leg rule in resolveLegMode needs COORDINATES, and
// when neither stop resolves to a precise point the leg can still end up
// queried as transit and dead-end. But the guide itself already knows both
// stops' towns (every stop carries a `town` field) — two stops in the SAME
// town on a transit trip are a walk, coordinates or not, unless the leg text
// explicitly says ferry/boat. Used by fetch AND render so cache keys agree.
export const isSameTownWalk = (mode, originTown, destTown, how) =>
  mode === "transit" &&
  !!originTown && !!destTown &&
  originTown.trim().toLowerCase() === destTown.trim().toLowerCase() &&
  !isFerryText(how);

// FALLBACK TIME ESTIMATE (Oliver's report: legs without a real Google Directions
// result were showing a bare "~34 km by car" instead of any actual time, which
// reads as broken — "put a random time estimate" was the ask). This only fires
// when the real API result is missing (no key, quota, or a leg Google's
// Directions API genuinely can't route) — it's never used once an exact
// duration exists. Speeds are rough real-world Danish averages (not
// straight-line theoretical max), not precise, but genuinely in the right
// ballpark and far more useful than a raw distance figure.
// Transit lowered 55 → 35 (Oliver: "Public transport says 19 minutes... you
// then check maps, and it's 27"): 55 km/h straight-line was close to raw
// intercity train speed with zero allowance for getting to the station,
// waiting, stops, or transfers — systematically optimistic versus what Google
// Maps then shows for the real door-to-door journey. 35 km/h straight-line is
// a much better real-world average for Danish regional transit door to door.
export const AVG_SPEED_KMH = { walking: 4.5, bicycling: 14, driving: 70, transit: 35 };

// ── "MAPS STILL SEEM TO GET THINGS WRONG" ───────────────────────────
// Oliver, 9 Aug 2026, with two legs off one guide and Google Maps open beside
// them. Both were measured rather than argued about:
//
//   Christiania → Reffen      guide "~24 min on foot"   Google 3.2 km, 44 min
//   Odense → H.C. Andersens Hus  guide "11 mins on foot"  Google 1.3 km, 18 min
//
// Two different labels, and the difference between them is the whole diagnosis.
// The one WITH a tilde came from here. The one WITHOUT came from the Directions
// API. So only the first is this function's fault, and it is a big fault.
//
// ── A STRAIGHT LINE IS NOT A WALK ───────────────────────────────────
// Every number this file produces starts as kmBetween: great-circle distance,
// the length of a line drawn through buildings, across the harbour, and over
// the fjord. Nobody walks that line. Christiania to Reffen is 2.12 km as the
// crow flies and 3.2 km on the pavement, because Copenhagen's harbour is in the
// way and you go around it. Dividing the crow-flies figure by a walking speed
// answers a question no traveler asked.
//
// The ratio has a name in transport geography, circuity, and a well-worn
// planning default of about 1.3 for a normal street grid. Denmark is worse than
// a normal street grid: Copenhagen has a harbour through the middle of it,
// Aalborg has a fjord, and half the interesting places are on islands. The one
// leg here that was measured against a real route came out at 1.51.
//
// 1.35 is chosen as a default, not derived — one measurement is not a study.
// The direction of the error is the part that is deliberate: this now
// OVERSTATES a short flat walk by a couple of minutes and understates a
// harbour detour, and those two mistakes are not equal. A traveler given four
// minutes too many arrives early. A traveler given twenty too few is standing
// on the wrong side of a body of water watching a booking time pass.
export const ROUTE_FACTOR = { walking: 1.35, bicycling: 1.35, driving: 1.25, transit: 1 };

// ── AND THERE WAS A SECOND SPEED TABLE, WHICH DISAGREED ─────────────
//
// claimCheck.js has a test headed "ONE SET OF SPEEDS, NOT TWO" that forbids one,
// and it checks claimCheck.js. routeOrder.js had one anyway:
//
//               here (effective, after circuity)   routeOrder's MODE_KMH
//   walking     4.5 / 1.35 = 3.3 km/h              4.5 km/h
//   bike        14  / 1.35 = 10.4                  15
//   transit     35  / 1     = 35                   60
//   car         70  / 1.25 = 56                    70
//
// Every row disagrees and the transit row is the one that matters, because the 35
// above is not a guess: it was 55 until Oliver measured it — "Public transport
// says 19 minutes... you then check maps, and it's 27" — and 55 was already too
// optimistic. routeOrder was quoting 60.
//
// It compounds, because MODE_KMH divided a GREAT-CIRCLE distance with no circuity
// factor at all. On the leg Oliver actually complained about, Aalborg to Skagen,
// 92 km on a bike: routeOrder said "6 hours", this model says 8.9. Two numbers for
// one journey, on two screens of the same guide.
//
// So there is one answer now and this is it. A gate over every file in src/ keeps
// it that way — the old one was scoped to the file the bug was found in rather
// than to the rule.
//
// The two vocabularies are the reason it happened. routeOrder speaks the app's own
// mode words (travelModeKey produces walk / bike / public transport / car / camper
// / tent) and this file speaks Google's, so neither table could read the other.
// Both are mapped here rather than either being renamed, because the Google words
// are what the Directions API returns and the app's words are what a traveller
// typed.
export const GOOGLE_MODE = {
  walk: "walking",
  // A tent trip is walked. That is what routeOrder's `tent: 4.5` meant.
  tent: "walking",
  bike: "bicycling",
  "public transport": "transit",
  car: "driving",
  // A camper is slower than a car, and 65 against 70 is well inside the precision
  // of a straight-line estimate. Mapping it to driving is honest; a fifth number
  // pretending to know the difference is not.
  camper: "driving",
  // Google's own words pass through, so a caller holding either vocabulary works.
  walking: "walking", bicycling: "bicycling", transit: "transit", driving: "driving",
};

// Hours for a STRAIGHT-LINE distance at a mode's real-world pace, circuity
// included. Returns null rather than 0 for a mode nobody stated, because "no
// duration" and "no time at all" are different claims and only one of them is
// safe to print.
export const straightLineHours = (km, mode) => {
  const d = Number(km);
  const g = GOOGLE_MODE[String(mode || "").trim().toLowerCase()];
  const kmh = g ? AVG_SPEED_KMH[g] : null;
  if (!Number.isFinite(d) || d < 0 || !kmh) return null;
  return (d * (ROUTE_FACTOR[g] ?? 1)) / kmh;
};

// Transit keeps a factor of 1 on purpose and is NOT missing one: its 35 km/h is
// already a door-to-door figure covering the walk to the stop, the wait, and
// the transfers, tuned against real Maps answers the last time this was wrong.
// Multiplying a detour into it as well would double-count the same slack.
export const estimateMinutes = (km, mode) => {
  if (km == null) return null;
  const speed = AVG_SPEED_KMH[mode] || AVG_SPEED_KMH.driving;
  const factor = ROUTE_FACTOR[mode] || 1;
  return Math.max(1, Math.round(((km * factor) / speed) * 60));
};

// ── AND THE CAP HAS TO APPLY TO THE GUESS TOO ───────────────────────
// WALK_MAX_MINUTES was enforced in exactly two places, both of which need a
// Google answer to fire: the re-route in fetchExactDurations, and the
// plausibility check on a stored result in legChip. The fallback estimate, the
// branch that runs precisely WHEN there is no Google answer, had no cap at all.
//
// That is how "~24 min on foot" reached a page under a rule that says 20. The
// cap was guarding the path that already had real data and leaving the guessing
// path alone, which is backwards: a guess deserves MORE suspicion than a
// measurement, not less. With the detour factor above the same leg estimates at
// 38 minutes, so it now fails this check loudly instead of rendering as a
// stroll.
export const walkEstimateTooFar = (km) => {
  const mins = estimateMinutes(km, "walking");
  return mins != null && mins > WALK_MAX_MINUTES;
};

// ── AN UPGRADE HAS TO BE AN IMPROVEMENT ─────────────────────────────
// The walk-is-over-the-cap re-route in fetchExactDurations asked Google for
// transit and then took whatever came back, with no test that the answer was
// any better than the walk it replaced. On this guide that stored a 32 minute
// bus journey in place of a 33 minute walk, and the bus journey contained 18
// minutes of walking: the reader was handed a ticket, a timetable and a change
// of vehicle to save one minute, and the leg list said so out loud.
//
// The cap exists to stop the app PLANNING absurd walks, not to make it hide
// them. When nothing beats the walk, the walk is the fact, and the render has
// its own honest way of saying a leg is longer on foot than it should be.
//
// Five minutes rather than zero, because a saving inside the noise of when you
// happen to reach the stop is not a saving. Below it, two options are the same
// journey and the simpler one wins.
export const MIN_UPGRADE_SAVING = 5;

// Minutes inside a stored Directions answer that are spent on foot. Google
// itemises them and nothing read them, which is how "24 mins by train/bus"
// could be 16 minutes of walking without anything noticing.
export const onFootMinutes = (data) => {
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  if (!steps.length) return null;
  return steps
    .filter(s => String(s?.mode || "").toLowerCase() === "walking")
    .reduce((n, s) => n + (Number(s?.mins) || 0), 0);
};

export const upgradeWorthIt = (walkMinutes, upgrade) => {
  const w = Number(walkMinutes);
  const u = Number(upgrade?.durationMinutes);
  if (upgrade?.error) return false;
  if (!Number.isFinite(u) || u < 1) return false;
  // No walk to compare against means the re-route is all we have, so it stands.
  if (!Number.isFinite(w) || w < 1) return true;
  return w - u >= MIN_UPGRADE_SAVING;
};

export const estimateDurationText = (km, mode) => {
  if (km == null) return null;
  const totalMinutes = estimateMinutes(km, mode);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `~${mins} min`;
  if (mins === 0) return `~${hours} hour${hours > 1 ? "s" : ""}`;
  return `~${hours} hour${hours > 1 ? "s" : ""} ${mins} min`;
};
