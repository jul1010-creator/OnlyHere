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
import { foodSpots } from "../data/food";
import { detectLegMode, haversineKm, isFerryText } from "./helpers";
import { containsName, variantsOf } from "./danishNames";

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
export const lookupRealPlace = (name) => {
  if (!name) return null;
  const pools = [
    ...freeEntrance.map(p => ({ ...p, _src: "free" })),
    ...craftItemsFallback.map(p => ({ ...p, _src: "craft" })),
    ...foodSpots.map(p => ({ ...p, _src: "food" })),
    ...nightlifeSpots.map(p => ({ ...p, _src: "nightlife" })),
    ...[...events, ...majorEvents, ...vikingEvents].map(p => ({ ...p, _src: "event" })),
    ...towns.map(p => ({ ...p, _src: "town" })),
  ].filter(p => p?.name);
  // Mutual containment is equality once both sides are folded and spaced, so
  // this is a Danish-letter-aware exact match without a second comparison rule.
  const narrowing = pools.filter(p => containsName(name, p.name));
  const exact = narrowing.filter(p => containsName(p.name, name));
  if (exact.length) return exact.sort((a, b) => String(b.name).length - String(a.name).length)[0];
  if (narrowing.length) return narrowing.sort((a, b) => String(b.name).length - String(a.name).length)[0];
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

// Trustworthy straight-line distance, or null when the inputs can't support one.
export const legDistanceKm = (originName, destName, geo = {}, originTown = "", destTown = "") => {
  const a = resolveStopCoordsDetailed(originName, geo, originTown);
  const b = resolveStopCoordsDetailed(destName, geo, destTown);
  if (!a || !b) return null;
  const km = kmBetween(a, b);
  // Neither end is precise and they landed on (essentially) the same point:
  // that is the town-centre collapse described above, not a real short hop.
  if (!a.precise && !b.precise && km < 0.05) return null;
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
const AVG_SPEED_KMH = { walking: 4.5, bicycling: 14, driving: 70, transit: 35 };

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

export const estimateDurationText = (km, mode) => {
  if (km == null) return null;
  const totalMinutes = estimateMinutes(km, mode);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `~${mins} min`;
  if (mins === 0) return `~${hours} hour${hours > 1 ? "s" : ""}`;
  return `~${hours} hour${hours > 1 ? "s" : ""} ${mins} min`;
};
