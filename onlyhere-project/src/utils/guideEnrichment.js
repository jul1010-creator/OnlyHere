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

// SINGLE SOURCE OF TRUTH for leg transport mode — used by the exact-duration
// fetch AND every render site that shows a route icon/label, so the fetch and
// the display can never disagree about which mode a leg actually used.
export const resolveLegMode = (how, primaryMode, originName, destName, onlyWalking = false, geo = {}) => {
  let mode = detectLegMode(how, primaryMode);
  const distKm = haversineKm(resolveStopCoords(originName, geo), resolveStopCoords(destName, geo));
  if (distKm != null) {
    const walkCapKm = onlyWalking ? Infinity : 2.5;
    if (mode === "walking" && distKm > walkCapKm) mode = distKm > 60 ? "transit" : "bicycling";
    else if (mode === "bicycling" && distKm > 60) mode = "transit";
  }
  return mode;
};
