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
import { detectLegMode, haversineKm } from "./helpers";

// Looks up a stop name against everything real Gemlyx already knows, so a
// guide can show real price/hours/type instead of just repeating the AI's
// own prose, and so a stop can link into that place's real Gemlyx page.
export const lookupRealPlace = (name) => {
  if (!name) return null;
  const norm = name.toLowerCase();
  const pools = [
    ...freeEntrance.map(p => ({ ...p, _src: "free" })),
    ...craftItemsFallback.map(p => ({ ...p, _src: "craft" })),
    ...foodSpots.map(p => ({ ...p, _src: "food" })),
    ...nightlifeSpots.map(p => ({ ...p, _src: "nightlife" })),
    ...[...events, ...majorEvents, ...vikingEvents].map(p => ({ ...p, _src: "event" })),
    ...towns.map(p => ({ ...p, _src: "town" })),
  ];
  return pools.find(p => p.name && (norm.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(norm))) || null;
};

// BUG FIX (the "2-3 hour transit leg that's really a 5 minute walk" report):
// precise sources (a real lat/lon on file, or this guide's own fresh geocode,
// passed in via `geo`) must be checked BEFORE the crude town-center fallback,
// never folded into one `||` chain where the crude fallback's near-constant
// truthiness silently wins every time. See CHANGES_THIS_PASS.md for the full
// story of how the old ordering broke this.
export const resolveStopCoords = (name, geo = {}) => {
  const real = lookupRealPlace(name);
  if (real?.lat && real?.lon) return { lat: real.lat, lon: real.lon };
  if (geo[name]) return geo[name];
  const key = Object.keys(TOWN_COORDS).find(t => name.includes(t));
  if (key) return { lat: TOWN_COORDS[key][0], lon: TOWN_COORDS[key][1] };
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
export const resolveStopCoordsDetailed = (name, geo = {}) => {
  const real = lookupRealPlace(name);
  if (real?.lat && real?.lon) return { lat: real.lat, lon: real.lon, precise: true };
  if (geo[name]) return { ...geo[name], precise: true };
  const key = Object.keys(TOWN_COORDS).find(t => name.includes(t));
  if (key) return { lat: TOWN_COORDS[key][0], lon: TOWN_COORDS[key][1], precise: false };
  return null;
};

// Trustworthy straight-line distance, or null when the inputs can't support one.
export const legDistanceKm = (originName, destName, geo = {}) => {
  const a = resolveStopCoordsDetailed(originName, geo);
  const b = resolveStopCoordsDetailed(destName, geo);
  if (!a || !b) return null;
  const km = kmBetween(a, b);
  // Neither end is precise and they landed on (essentially) the same point:
  // that is the town-centre collapse described above, not a real short hop.
  if (!a.precise && !b.precise && km < 0.05) return null;
  return km;
};

// Oliver's explicit rule: "No walking more than 15-20 minutes." At a real
// 4.5 km/h walking pace 20 minutes is about 1.5 km, so that is the hard cap
// on any leg planned, routed, or displayed as a walk.
export const WALK_MAX_MINUTES = 20;
export const WALK_MAX_KM = 1.5;

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
    else if (mode === "transit" && distKm <= 1.5 && !/ferry|boat|færge/i.test(how || "")) mode = "walking";
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
  !/ferry|boat|færge/i.test(how || "");

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
export const estimateDurationText = (km, mode) => {
  if (km == null) return null;
  const speed = AVG_SPEED_KMH[mode] || AVG_SPEED_KMH.driving;
  const totalMinutes = Math.max(1, Math.round((km / speed) * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `~${mins} min`;
  if (mins === 0) return `~${hours} hour${hours > 1 ? "s" : ""}`;
  return `~${hours} hour${hours > 1 ? "s" : ""} ${mins} min`;
};
