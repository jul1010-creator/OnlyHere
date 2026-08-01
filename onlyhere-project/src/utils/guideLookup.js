import { TOWN_COORDS } from "../data/towns";
import { towns } from "../data/towns";
import { freeEntrance } from "../data/freeEntrance";
import { craftItemsFallback } from "../data/craft";
import { foodSpots } from "../data/food";
import { nightlifeSpots } from "../data/nightlife";
import { events, majorEvents, vikingEvents } from "../data/events";
import { detectLegMode, haversineKm } from "./helpers";

// Shared, parameterized version of App.jsx's own lookupRealPlace/resolveStopCoords/
// resolveLegMode/kmBetween helpers — used by GuidePage.jsx's new preview/essentials/
// roadmap steps so a guide stop can link back to Gemlyx's own real content (photo,
// short desc, price) the exact same way the in-chat guide popup already does, without
// duplicating App.jsx's giant component or its closures over local state. App.jsx's
// own copies of these functions are untouched on purpose (lowest-risk path — nothing
// about the existing guide popup changes), this is purely additive for the new page.
//
// The place pools are built once, at module load, from the same data files App.jsx
// already imports — identical content, computed fresh on every call in App.jsx's
// version too, so behavior matches exactly.
const PLACE_POOLS = [
  ...freeEntrance.map(p => ({ ...p, _src: "free" })),
  ...craftItemsFallback.map(p => ({ ...p, _src: "craft" })),
  ...foodSpots.map(p => ({ ...p, _src: "food" })),
  ...nightlifeSpots.map(p => ({ ...p, _src: "nightlife" })),
  ...[...events, ...majorEvents, ...vikingEvents].map(p => ({ ...p, _src: "event" })),
  ...towns.map(p => ({ ...p, _src: "town" })),
];

export const lookupRealPlace = (name) => {
  if (!name) return null;
  const norm = name.toLowerCase();
  return PLACE_POOLS.find(p => p.name && (norm.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(norm))) || null;
};

export const resolveStopCoords = (name, geocodedCoords = {}) => {
  const real = lookupRealPlace(name);
  if (real?.lat && real?.lon) return { lat: real.lat, lon: real.lon };
  if (geocodedCoords[name]) return geocodedCoords[name];
  const key = Object.keys(TOWN_COORDS).find(t => name.includes(t));
  if (key) return { lat: TOWN_COORDS[key][0], lon: TOWN_COORDS[key][1] };
  return null;
};

export const kmBetween = (a, b) => {
  const dLat = (a.lat - b.lat) * 111.32;
  const dLon = (a.lon - b.lon) * 62.06;
  return Math.sqrt(dLat * dLat + dLon * dLon);
};

export const resolveLegMode = (how, primaryMode, originName, destName, onlyWalking, geocodedCoords = {}, extraGeo = {}) => {
  let mode = detectLegMode(how, primaryMode);
  const distKm = haversineKm(
    resolveStopCoords(originName, geocodedCoords) || extraGeo[originName] || null,
    resolveStopCoords(destName, geocodedCoords) || extraGeo[destName] || null
  );
  if (distKm != null) {
    const walkCapKm = onlyWalking ? Infinity : 2.5;
    if (mode === "walking" && distKm > walkCapKm) mode = distKm > 60 ? "transit" : "bicycling";
    else if (mode === "bicycling" && distKm > 60) mode = "transit";
  }
  return mode;
};

export const legModeIcon = (mode, how) => mode === "bicycling" ? "🚲" : mode === "driving" ? "🚗" : mode === "walking" ? "🚶" : /ferry|boat/i.test(how || "") ? "⛴" : "🚆";
export const legModeLabel = (mode) => mode === "bicycling" ? "by bike" : mode === "driving" ? "by car" : mode === "walking" ? "on foot" : "by train/bus";
