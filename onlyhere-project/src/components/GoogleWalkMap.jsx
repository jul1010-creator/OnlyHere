// ── A WALK ON GOOGLE'S OWN MAP ──────────────────────────────────────
//
// What it is now, and how it got here:
//
// 4 Oct 2026. Oliver sent a camera loop Google's AI had given him, "kind of a
// cool feature": the map turned once, slowly. The walking lines are the ones
// Google's Routes API measured (api/directions), drawn on Google's own map,
// because Google's terms want Routes content on a Google map (14.2, 19.2).
//
// 5 Oct 2026, the same day, in this order:
//   "confusing and messy map.. nobody can tell what this route is": arrows on
//   each leg, a dashed way back, smaller pins, the map lying flat.
//   With Google's photorealistic 3D not covering Klaipėda, a flight along the
//   walk; "It's a lame flying.. because it is pointless": a card at each stop;
//   a satellite view of Klaipėda he found: the flight went over Google's own
//   satellite pictures; "Like disney type?": sparkle at every arrival.
//   Then his better idea, which is what this file does now:
//
//     "Have a 'show on map'. So keep the overview at start, but no flying.
//      When someone clicks a place on the list, then the map flies to it."
//
// So the map opens flat over the whole walk and does not move by itself.
// "Show on map" on a stop glides the camera there, over the satellite
// pictures, tilted, and the place arrives with its sparkle and its card.
// "Whole walk" goes back. A touch on the map stops a glide where it is.
//
// The same map runs the walk itself (WalkMode.jsx): the walker's position is
// a blue dot, and the camera can follow it.
import { useEffect, useRef, useState } from "react";
import { C } from "../utils/theme";
import { GOOGLE_MAP_ID, googleMapsReady, loadGoogleMaps } from "../utils/googleMapsLoader";
import { t as uiT } from "../utils/uiLanguage";
import { entryWord } from "../utils/entryWords";

// The legs of a walk, start to start: [from, to] pairs of { lat, lon }.
export const walkLegs = (walk) => {
  const start = walk?.start, stops = Array.isArray(walk?.stops) ? walk.stops : [];
  const ok = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon));
  if (!ok(start) || !stops.length) return [];
  const pts = [start, ...stops.filter(ok), start];
  const legs = [];
  for (let i = 0; i < pts.length - 1; i++) legs.push([pts[i], pts[i + 1]]);
  return legs;
};

// Compass bearing from a to b, 0 to 360, north 0. Points are { lat, lon }.
export const bearingOf = (a, b) => {
  const r = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return ((Math.atan2(y, x) / r) + 360) % 360;
};
export const kmBetween = (a, b) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

// ── THE GLIDE ───────────────────────────────────────────────────────
// From one camera to another, { lat, lon, zoom, tilt, heading }, `t` from 0
// to 1. Eased at both ends; turning the short way round; and on a long hop
// it rises in the middle and comes down again, the way a camera in a film
// lifts off to cross town, so the town is seen on the way.
export const GLIDE_MS = 1700;
export const FOCUS = { zoom: 17.5, tilt: 50 };
// Walking: close in, tilted, and the camera this many metres ahead of the dot.
export const NAV = { zoom: 18, tilt: 55, ahead: 45 };
// Walking: closer than JOIN_ON_M to the place, the dotted line to it goes.
export const JOIN_ON_M = 15;
// How long a stop's card stays up while walking.
export const CARD_WALKING_MS = 6000;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
const turnBy = (from, to, t) => (((from + ((((to - from) % 360) + 540) % 360 - 180) * t) % 360) + 360) % 360;
export const glideAt = (from, to, t) => {
  const e = ease(Math.min(1, Math.max(0, t)));
  const km = kmBetween(from, to);
  const lift = km < 0.25 ? 0 : Math.min(2.5, Math.log2(km / 0.25) + 0.6);
  return {
    lat: from.lat + (to.lat - from.lat) * e,
    lon: from.lon + (to.lon - from.lon) * e,
    zoom: from.zoom + (to.zoom - from.zoom) * e - lift * Math.sin(Math.PI * e),
    tilt: from.tilt + (to.tilt - from.tilt) * e,
    heading: turnBy(from.heading, to.heading, e),
  };
};

// A walking line is the same whichever walk asks for it, so it is asked once.
const legCache = new Map();
const legLine = async (a, b) => {
  const key = `${a.lat},${a.lon}>${b.lat},${b.lon}`;
  if (legCache.has(key)) return legCache.get(key);
  let line = null;
  try {
    const r = await fetch(`/api/directions?origin=${a.lat},${a.lon}&destination=${b.lat},${b.lon}&mode=walking&country=LT`);
    const d = await r.json();
    line = Array.isArray(d?.polyline) && d.polyline.length > 1 ? d.polyline : null;
  } catch { /* drawn straight and faint below */ }
  // Only a line is kept. A failed call is asked again next time, so one
  // passing error does not leave a leg faint for the rest of the visit.
  if (line) legCache.set(key, line);
  return line;
};
export const walkLine = legLine;

// ── THE TURNS OF ONE LEG ────────────────────────────────────────────
// Oliver, 6 Oct 2026: "Turn list only". Google's own written steps for a
// leg, in the walk's language, for the walk screen's list. Asked only when
// the list is opened, once per leg and language for the visit; the line the
// same answer brings is kept for the map too.
const turnCache = new Map();
export const legTurns = async (a, b, lang = "en") => {
  const at = `${a.lat},${a.lon}>${b.lat},${b.lon}`;
  const key = `${at}:${lang}`;
  if (turnCache.has(key)) return turnCache.get(key);
  try {
    const r = await fetch(`/api/directions?origin=${a.lat},${a.lon}&destination=${b.lat},${b.lon}&mode=walking&country=LT&lang=${encodeURIComponent(lang)}`);
    const d = await r.json();
    if (!r.ok || !Array.isArray(d?.turns) || !d.turns.length) return null;
    turnCache.set(key, d.turns);
    if (Array.isArray(d.polyline) && d.polyline.length > 1 && !legCache.has(at)) legCache.set(at, d.polyline);
    return d.turns;
  } catch { return null; }
};
// The sign beside each turn, from Google's name for it.
export const turnSign = (maneuver = "") => {
  const m = String(maneuver).toUpperCase();
  if (/UTURN/.test(m)) return "↶";
  if (/ROUNDABOUT/.test(m)) return "⟳";
  if (/FERRY/.test(m)) return "⛴";
  if (/SHARP_LEFT/.test(m)) return "↙";
  if (/SHARP_RIGHT/.test(m)) return "↘";
  if (/SLIGHT_LEFT|KEEP_LEFT|FORK_LEFT|RAMP_LEFT/.test(m)) return "↖";
  if (/SLIGHT_RIGHT|KEEP_RIGHT|FORK_RIGHT|RAMP_RIGHT/.test(m)) return "↗";
  if (/LEFT/.test(m)) return "←";
  if (/RIGHT/.test(m)) return "→";
  return "↑";
};

const reducedMotion = () => {
  try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches; } catch { return false; }
};

// ── THE SPARKLE ─────────────────────────────────────────────────────
// Oliver, 5 Oct 2026: "can it fade in a little better? Maybe with bling
// bling? Like disney type?" A place arrives with a flash, a ring of light and
// a burst of gold stars from its pin; its card blurs into focus with a sweep
// of light, glows, and a star twinkles in its corner. Laid out once, the same
// every time, so nothing jumps about between runs.
export const SPARKS = Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2 + (i % 3) * 0.19;
  const d = 48 + ((i * 17) % 64);
  return { dx: Math.round(Math.cos(a) * d), dy: Math.round(Math.sin(a) * d), s: 0.8 + (i % 4) * 0.35, r: (i * 47) % 360, ch: i % 3 === 0 ? "•" : i % 5 === 0 ? "★" : "✦", white: i % 4 === 0, delay: (i % 6) * 35 };
});
const FX_CSS = `
@keyframes gxSpark { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0) rotate(0deg); } 12% { opacity: 1; } 45% { opacity: 1; transform: translate(calc(-50% + var(--dx) * .75), calc(-50% + var(--dy) * .75)) scale(var(--s)) rotate(calc(var(--r) * .6)); } 100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy) + 14px)) scale(.25) rotate(var(--r)); } }
@keyframes gxRing { 0% { opacity: 1; transform: translate(-50%, -50%) scale(.2); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(3.2); } }
@keyframes gxFlash { 0% { opacity: 0; transform: translate(-50%, -50%) scale(.3); } 25% { opacity: .95; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.6); } }
@keyframes gxCardIn { 0% { opacity: 0; filter: blur(10px); transform: translateY(18px) scale(.86); } 60% { opacity: 1; filter: blur(0); transform: translateY(-4px) scale(1.03); } 100% { opacity: 1; filter: blur(0); transform: none; } }
@keyframes gxShimmer { 0% { transform: translateX(-130%) skewX(-20deg); } 100% { transform: translateX(330%) skewX(-20deg); } }
@keyframes gxGlow { 0%, 100% { box-shadow: 0 8px 24px rgba(0,0,0,.45), 0 0 0 rgba(217,164,65,0); } 50% { box-shadow: 0 8px 24px rgba(0,0,0,.45), 0 0 22px rgba(217,164,65,.55); } }
@keyframes gxTwinkle { 0%, 100% { opacity: .15; transform: scale(.5) rotate(0deg); } 50% { opacity: 1; transform: scale(1.1) rotate(45deg); } }
@keyframes gxMePulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(3); opacity: 0; } }
`;
const Burst = ({ top = "calc(50% - 30px)", size = 1 }) => (
  <div aria-hidden="true" style={{ position: "absolute", left: "50%", top, width: 0, height: 0, pointerEvents: "none" }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 60 * size, height: 60 * size, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,226,150,0.6) 35%, rgba(217,164,65,0) 70%)", animation: "gxFlash 520ms ease-out both" }} />
    <div style={{ position: "absolute", left: 0, top: 0, width: 56 * size, height: 56 * size, borderRadius: "50%", border: `3px solid ${C.gold}`, boxShadow: `0 0 22px ${C.gold}, inset 0 0 12px ${C.gold}`, animation: "gxRing 800ms ease-out both" }} />
    {SPARKS.map((p, i) => (
      <span key={i} style={{ position: "absolute", left: 0, top: 0, fontSize: 17 * size, lineHeight: 1, color: p.white ? "#FFFFFF" : "#FFD875", textShadow: `0 0 8px ${C.gold}, 0 0 16px rgba(255,216,117,0.8)`, "--dx": `${p.dx * size}px`, "--dy": `${p.dy * size}px`, "--s": p.s, "--r": `${p.r}deg`, animation: `gxSpark 1150ms ${p.delay}ms cubic-bezier(.12,.75,.3,1) both` }}>{p.ch}</span>
    ))}
  </div>
);

const HHMM = (m) => `${String(Math.floor((((m % 1440) + 1440) % 1440) / 60)).padStart(2, "0")}:${String((((m % 60) + 60) % 60)).padStart(2, "0")}`;

// Room for the pins at the top and the card at the bottom.
const PAD = { top: 52, right: 28, bottom: 28, left: 28 };

// ── KLAIPĖDA'S OWN PINS ─────────────────────────────────────────────
// Oliver, 6 Oct 2026, of a map pin with a woman's photo inside it: "can they
// be designed cool? ... It could be cool with something similar, themed for
// Klaipeda. Then with the photos of the attractions inside." So a place is a
// gold drop with the place's own photo in a round window, its number on a
// navy badge, and a small wave across the tip for the port town. With no
// photo, the place's sign sits in the window. The start is the same drop in
// navy with the anchor. Drawn here, the same on every map.
const NAVY = "#0F1A2E";
const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
export const PLACE_PIN = { w: 44, h: 56, window: 32 };
export const placePinHtml = ({ n = null, photo = "", sign = "📍", home = false } = {}) => {
  const body = home ? NAVY : C.gold, rim = home ? C.gold : NAVY;
  const safePhoto = /^https:\/\//i.test(String(photo || "")) ? String(photo) : "";
  // The sign always sits in the window, and the photo over it, so a photo
  // that fails to load leaves the sign, not a broken picture.
  const inside = `<span style="font-size:17px;line-height:1">${escapeHtml(home ? "⚓" : sign)}</span>`
    + (safePhoto ? `<img src="${escapeHtml(safePhoto)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block" />` : "");
  return `<svg width="${PLACE_PIN.w}" height="${PLACE_PIN.h}" viewBox="0 0 44 56" style="position:absolute;inset:0;overflow:visible">`
    + `<path d="M22 55 C22 55 3 35 3 21 A19 19 0 1 1 41 21 C41 35 22 55 22 55 Z" fill="${body}" stroke="${rim}" stroke-width="2" />`
    + `<path d="M13.5 44.5 q4.25 -3 8.5 0 t8.5 0" fill="none" stroke="${home ? C.gold : "#FFFFFF"}" stroke-width="1.7" stroke-linecap="round" opacity=".9" />`
    + `</svg>`
    + `<span style="position:absolute;left:6px;top:5px;width:${PLACE_PIN.window}px;height:${PLACE_PIN.window}px;border-radius:50%;overflow:hidden;border:2px solid #FFFFFF;background:${home ? "#1C2A44" : "#FFF6E0"};display:flex;align-items:center;justify-content:center;box-sizing:border-box">${inside}</span>`
    + (n !== null ? `<span style="position:absolute;right:-5px;top:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:18px;background:${NAVY};color:${C.gold};border:1.5px solid ${C.gold};font:800 10.5px/15px Inter, sans-serif;text-align:center;box-sizing:border-box">${Number(n)}</span>` : "");
};
const placePin = (opts) => {
  const el = document.createElement("div");
  el.setAttribute("data-testid", opts?.home ? "pin-start" : "pin-place");
  el.style.cssText = `position:relative;width:${PLACE_PIN.w}px;height:${PLACE_PIN.h}px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.45));cursor:default`;
  el.innerHTML = placePinHtml(opts);
  el.querySelector("img")?.addEventListener("error", (e) => { try { e.target.remove(); } catch { /* gone */ } });
  return el;
};

// `madeAt` is the walk's start, in minutes after midnight, for the times on
// the card. `cardFor(stop)` may add { emoji, photo } for a stop. `focus` is
// { id, n }: a new n glides to the stop with that id. `me` is the walker's
// position { lat, lon }, drawn as a blue dot, and `follow` keeps it in view.
export const GoogleWalkMap = ({ walk, height = 340, madeAt = null, cardFor = null, focus = null, me = null, follow = false, round = true, lang = "en", loop = true, heading = null, activeLeg = null, lift = 0 }) => {
  const box = useRef(null);
  // ONE map for the life of the page. Google bills every map it creates, and
  // making a new one each time a visitor picks another walk would bill each
  // pick. A new walk clears the pins and lines and draws its own on this map.
  const mapRef = useRef(null);
  const moved = useRef(false);
  const api = useRef(null);
  const [failed, setFailed] = useState(false);
  // The stop on show: { stop: index, n } while focused, null over the walk.
  const [card, setCard] = useState(null);
  // Walking: the walker has panned away from the dot, so Re-centre shows.
  const [away, setAway] = useState(false);

  // A touch on the map stops a glide where it is.
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const touched = () => { moved.current = true; if (follow) setAway(true); };
    ["pointerdown", "wheel", "touchstart", "keydown"].forEach(e => el.addEventListener(e, touched, { passive: true }));
    return () => ["pointerdown", "wheel", "touchstart", "keydown"].forEach(e => el.removeEventListener(e, touched));
  }, [failed]);

  useEffect(() => {
    if (!googleMapsReady() || !walkLegs(walk).length) return undefined;
    let gone = false, raf = 0;
    const drawn = [];
    const pinEls = [];
    setCard(null);

    (async () => {
      try {
        const maps = await loadGoogleMaps();
        const { Map } = await maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await maps.importLibrary("marker");
        if (gone || !box.current) return;
        const at = (p) => ({ lat: Number(p.lat), lng: Number(p.lon) });
        const bounds = new maps.LatLngBounds();
        [walk.start, ...walk.stops].forEach(p => bounds.extend(at(p)));
        if (!mapRef.current) {
          mapRef.current = new Map(box.current, {
            mapId: GOOGLE_MAP_ID, center: bounds.getCenter(), zoom: 15,
            // Asked for in code, not left to the Map ID's own setting: a
            // raster map ignores tilt and heading (4 Oct 2026).
            renderingType: maps.RenderingType?.VECTOR || "VECTOR",
            disableDefaultUI: true, zoomControl: !follow, gestureHandling: follow ? "greedy" : "cooperative", clickableIcons: false,
          });
        }
        const map = mapRef.current;

        // Each pin sits in a box the sparkle can burst out of.
        const pinBoxes = [], stopMarkers = [];
        let startBox = null, startMarker = null;
        const holder = (el) => { const box = document.createElement("div"); box.style.cssText = "position:relative;display:inline-block;overflow:visible"; box.appendChild(el); return box; };
        // The sparkle, on the pin itself: a flash, a ring and a burst of gold
        // stars, the same as the one the glide arrives with, then gone.
        const sparkleOn = (box) => {
          if (!box || reducedMotion()) return;
          const fx = document.createElement("div");
          fx.setAttribute("aria-hidden", "true");
          fx.setAttribute("data-testid", "pin-sparkle");
          fx.style.cssText = "position:absolute;left:50%;top:35%;width:0;height:0;pointer-events:none;z-index:5";
          fx.innerHTML = `<div style="position:absolute;left:0;top:0;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,226,150,0.6) 35%, rgba(217,164,65,0) 70%);animation:gxFlash 520ms ease-out both"></div><div style="position:absolute;left:0;top:0;width:56px;height:56px;border-radius:50%;border:3px solid ${C.gold};box-shadow:0 0 22px ${C.gold}, inset 0 0 12px ${C.gold};animation:gxRing 800ms ease-out both"></div>`
            + SPARKS.map(p => `<span style="position:absolute;left:0;top:0;font-size:17px;line-height:1;color:${p.white ? "#FFFFFF" : "#FFD875"};text-shadow:0 0 8px ${C.gold}, 0 0 16px rgba(255,216,117,0.8);--dx:${p.dx}px;--dy:${p.dy}px;--s:${p.s};--r:${p.r}deg;animation:gxSpark 1150ms ${p.delay}ms cubic-bezier(.12,.75,.3,1) both">${p.ch}</span>`).join("");
          box.appendChild(fx);
          setTimeout(() => { try { fx.remove(); } catch { /* gone */ } }, 1700);
        };
        const popPin = (i) => pinEls.forEach((el, j) => { try { el.style.transform = j === i ? "scale(1.45) translateY(-4px)" : ""; } catch { /* pin gone */ } });
        // Flat, north up, on the plain map, the whole walk in view.
        const overview = () => {
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          popPin(-1); setCard(null);
          try { map.setMapTypeId("roadmap"); } catch { /* keep going */ }
          map.moveCamera({ heading: 0, tilt: 0 });
          map.fitBounds(bounds, PAD);
        };
        const cameraNow = () => {
          const c = map.getCenter();
          return { lat: c ? c.lat() : bounds.getCenter().lat(), lon: c ? c.lng() : bounds.getCenter().lng(), zoom: map.getZoom() || 15, tilt: map.getTilt?.() || 0, heading: map.getHeading?.() || 0 };
        };
        // Over the real roofs to the stop, and it arrives with its sparkle.
        const focusStop = (i, n) => {
          const s = walk.stops[i];
          if (!s) return;
          // Walking, the camera stays with the walker: the stop only lights
          // up, with its sparkle and card, where it stands.
          // Walking, the card comes up at the top for a few seconds, so it
          // never sits over the dot or the way ahead (5 Oct 2026).
          if (follow) { popPin(i); sparkleOn(pinBoxes[i]); setCard({ stop: i, n }); setTimeout(() => { if (!gone) setCard(c => (c && c.n === n ? null : c)); }, CARD_WALKING_MS); return; }
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          moved.current = false;
          popPin(-1); setCard(null);
          try { map.setMapTypeId("satellite"); } catch { /* the plain map glides too */ }
          const prev = i === 0 ? walk.start : walk.stops[i - 1];
          const to = { lat: Number(s.lat), lon: Number(s.lon), ...FOCUS, heading: bearingOf({ lat: Number(prev.lat), lon: Number(prev.lon) }, { lat: Number(s.lat), lon: Number(s.lon) }) };
          const arrive = () => { popPin(i); setCard({ stop: i, n }); };
          if (reducedMotion()) {
            map.moveCamera({ center: { lat: to.lat, lng: to.lon }, zoom: to.zoom, tilt: to.tilt, heading: to.heading });
            arrive();
            return;
          }
          const from = cameraNow();
          const t0 = performance.now();
          const step = (now) => {
            if (gone) return;
            if (moved.current) { raf = 0; return; }
            const t = (now - t0) / GLIDE_MS;
            const cam = glideAt(from, to, t);
            map.moveCamera({ center: { lat: cam.lat, lng: cam.lon }, zoom: cam.zoom, tilt: cam.tilt, heading: cam.heading });
            if (t >= 1) { raf = 0; arrive(); return; }
            raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        };
        // ── THE WALKER, THE WAY A SAT NAV SHOWS THEM ───────────────────
        // Oliver, 5 Oct 2026, of the first blue dot: "It's not possible to
        // make it more gps-like?" So, while walking: the map turns to the
        // way the walker faces and tilts, the camera sits a little ahead of
        // the dot so the street in front is what fills the screen, the dot
        // glides from fix to fix instead of jumping, a beam shows which way
        // the phone points, and a pale circle shows how sure the fix is.
        // Touch the map to look around; Re-centre puts it back.
        let meMarker = null, meBeam = null, meRing = null, meRaf = 0, mePos = null, meHeading = null;
        // Set further down, once the legs are drawn: joins the dot to the leg.
        let joinUp = () => {};
        const ahead = (p, h, m) => {
          const r = Math.PI / 180, d = m / 6371000, la = p.lat * r, lo = p.lng * r, b = h * r;
          const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
          const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
          return { lat: la2 / r, lng: lo2 / r };
        };
        const placeCamera = (pos) => {
          if (!follow || moved.current) return;
          const h = meHeading;
          map.moveCamera({ center: h === null ? pos : ahead(pos, h, NAV.ahead), zoom: NAV.zoom, tilt: NAV.tilt, heading: h === null ? (map.getHeading?.() || 0) : h });
        };
        const showMe = (p, keepInView, faceTo = null) => {
          if (!p || !Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lon))) return;
          const pos = { lat: Number(p.lat), lng: Number(p.lon) };
          meHeading = Number.isFinite(Number(faceTo)) && faceTo !== null ? Number(faceTo) : null;
          if (!meMarker) {
            const dot = document.createElement("div");
            dot.setAttribute("data-testid", "me-dot");
            dot.style.cssText = "position:relative;width:22px;height:22px";
            dot.innerHTML = '<span data-beam style="position:absolute;left:50%;top:50%;width:70px;height:70px;margin:-62px 0 0 -35px;transform-origin:50% 88%;background:radial-gradient(ellipse at 50% 100%, rgba(66,133,244,.45), rgba(66,133,244,0) 70%);clip-path:polygon(50% 88%, 12% 0, 88% 0);display:none"></span><span style="position:absolute;inset:0;border-radius:50%;background:#4285F4;animation:gxMePulse 1.8s ease-out infinite"></span><span style="position:absolute;inset:0;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45)"></span>';
            meBeam = dot.querySelector("[data-beam]");
            meMarker = new AdvancedMarkerElement({ map, position: pos, content: dot, zIndex: 200, title: "You" });
            drawn.push(meMarker);
            if (Number(p.accuracy) > 0) {
              meRing = new maps.Circle({ map, center: pos, radius: Number(p.accuracy), strokeColor: "#4285F4", strokeOpacity: 0.35, strokeWeight: 1, fillColor: "#4285F4", fillOpacity: 0.12, clickable: false, zIndex: 0 });
              drawn.push(meRing);
            }
            mePos = pos;
            placeCamera(pos);
            joinUp(pos);
          } else {
            // Glide from the last fix to this one.
            const from = mePos || pos, t0 = performance.now(), ms = reducedMotion() ? 0 : 900;
            if (meRaf) cancelAnimationFrame(meRaf);
            const step = (now) => {
              if (gone) return;
              const t = ms ? Math.min(1, (now - t0) / ms) : 1;
              const at2 = { lat: from.lat + (pos.lat - from.lat) * t, lng: from.lng + (pos.lng - from.lng) * t };
              meMarker.position = at2; mePos = at2;
              if (meRing) meRing.setCenter(at2);
              if (keepInView) placeCamera(at2);
              meRaf = t < 1 ? requestAnimationFrame(step) : 0;
              if (t >= 1) joinUp(at2);
            };
            meRaf = requestAnimationFrame(step);
            if (meRing && Number(p.accuracy) > 0) meRing.setRadius(Number(p.accuracy));
          }
          // The beam points the way the phone faces. With the map turned to
          // that same way it points straight up the screen.
          if (meBeam) {
            meBeam.style.display = meHeading === null ? "none" : "block";
            const mapH = map.getHeading?.() || 0;
            meBeam.style.transform = `rotate(${meHeading === null ? 0 : meHeading - (follow && !moved.current ? meHeading : mapH)}deg)`;
          }
        };
        const recenter = () => { moved.current = false; setAway(false); if (mePos) placeCamera(mePos); };
        // The leg being walked stands out; legs walked are grey; legs ahead
        // are pale. Over the whole walk, before walking, every leg is gold.
        const legLines = [];
        const styleLegs = (active) => {
          const walking0 = active !== null && active !== undefined;
          // ── ONE PLACE AT A TIME ──────────────────────────────────────
          // Oliver, 6 Oct 2026: "only one of the areas pop up, and it pops up
          // with a sparkle", on Start walking. While walking, the map shows
          // the place being walked to and nothing ahead of it: the other
          // pins, and the legs past it, wait for their turn. Back to the
          // start, the anchor comes up with its sparkle.
          if (follow && walking0) {
            stopMarkers.forEach((m, i) => { try { m.map = i === active ? map : null; } catch { /* gone */ } });
            const home = active >= walk.stops.length;
            try {
              if (home && !startMarker.map) { startMarker.map = map; sparkleOn(startBox); }
              if (!home) startMarker.map = null;
            } catch { /* gone */ }
          }
          legLines.forEach((l, i) => {
            if (follow && walking0) {
              const show = i <= active;
              try { l.line.setOptions({ visible: show }); l.casing?.setOptions({ visible: show }); l.dash?.setOptions({ visible: show }); } catch { /* gone */ }
            }
            const walking = active !== null && active !== undefined;
            const now = walking && i === active, done = walking && i < active;
            const color = done ? "#9AA0A6" : C.gold;
            try {
              l.line.setOptions({ strokeColor: color, strokeOpacity: l.dashed && !now ? 0 : (done ? 0.6 : now ? 1 : walking ? 0.45 : (l.measured ? 0.9 : 0.35)), strokeWeight: now ? 7 : 4, zIndex: now ? 5 : 3 });
              if (l.casing) l.casing.setOptions({ strokeOpacity: done ? 0.4 : 0.9, strokeWeight: now ? 11 : 8 });
            } catch { /* line gone */ }
          });
        };
        // ── FROM WHERE YOU STAND TO THE PLACE ────────────────────────
        // Oliver, 5 Oct 2026: "make line between the destination and current
        // position". While walking: a blue dotted line, straight from the dot
        // to the place being walked to, measured here from the two points.
        // 6 Oct 2026, after Oliver read that live GPS navigation is not
        // allowed: the line no longer joins the dot to Google's route, and
        // the route no longer greys out behind the walker. Tracking a walker
        // along Google's own route is the part of navigation Google keeps for
        // itself (Maps Platform Terms 3.2.3(d)); a dot on a Google map is
        // what Google's own geolocation tutorial shows, and the straight line
        // and the distance are Gemlyx's own.
        let joinLine = null;
        joinUp = (pos) => {
          const active = activeLegRef.current;
          const leg = follow && active !== null && active !== undefined ? legLines[active] : null;
          const to = leg ? leg.to : null;
          const far = to && pos ? kmBetween({ lat: pos.lat, lon: pos.lng }, { lat: to.lat, lon: to.lng }) * 1000 : 0;
          if (!to || !pos || far <= JOIN_ON_M) { joinLine?.setMap(null); return; }
          const path = [pos, to];
          if (!joinLine) {
            joinLine = new maps.Polyline({ map, path, strokeOpacity: 0, zIndex: 6, clickable: false, icons: [{ icon: { path: maps.SymbolPath.CIRCLE, scale: 2.6, fillColor: "#4285F4", fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 1 }, offset: "0", repeat: "11px" }] });
            drawn.push(joinLine);
          } else { joinLine.setPath(path); joinLine.setMap(map); }
        };
        // A place's photo can arrive after its pin (the published pages load
        // on their own): the window is filled again then.
        const relook = () => walk.stops.forEach((s, i) => {
          const el = pinEls[i];
          if (!el) return;
          const look = (lookRef.current && lookRef.current(s)) || {};
          el.innerHTML = placePinHtml({ n: i + 1, photo: look.photo, sign: look.emoji || "📍" });
          el.querySelector("img")?.addEventListener("error", (e) => { try { e.target.remove(); } catch { /* gone */ } });
        });
        api.current = { focusStop, overview, showMe, recenter, styleLegs, joinUp: () => joinUp(mePos), relook };

        map.moveCamera({ heading: 0, tilt: 0 });
        try { map.setMapTypeId("roadmap"); } catch { /* keep going */ }
        map.fitBounds(bounds, PAD);

        // The start, then every stop numbered in the order it is walked.
        const startPin = { element: placePin({ home: true }) };
        startBox = holder(startPin.element);
        startMarker = new AdvancedMarkerElement({ map, position: at(walk.start), content: startBox, title: walk.start.name || "Start", zIndex: 100 });
        drawn.push(startMarker);
        walk.stops.forEach((s, i) => {
          const look = (lookRef.current && lookRef.current(s)) || {};
          const pin = { element: placePin({ n: i + 1, photo: look.photo, sign: look.emoji || "📍" }) };
          try { pin.element.style.transition = "transform 280ms cubic-bezier(.2,1.6,.4,1)"; pin.element.style.transformOrigin = "50% 100%"; } catch { /* no element */ }
          pinEls.push(pin.element);
          const box = holder(pin.element);
          pinBoxes.push(box);
          const m = new AdvancedMarkerElement({ map, position: at(s), content: box, title: s.name || "", zIndex: 50 - i });
          stopMarkers.push(m);
          drawn.push(m);
        });
        // Walking, the other places are off the map before the lines come in.
        if (follow && activeLegRef.current !== null) styleLegs(activeLegRef.current);

        // The legs as Google measured them. Out and on: a gold line on a
        // white edge with an arrow halfway, so the order reads off the map.
        // Back to the start: a dashed line, so the way home never looks like
        // part of the walk.
        // A trail that ends where it ends (the sculptures) has no way back.
        const legs = loop ? walkLegs(walk) : walkLegs(walk).slice(0, -1);
        // Oliver, 6 Oct 2026: "The map at the front page (default map) should
        // not have the route. Only the places." So the legs are asked for and
        // drawn only while walking; looking at the walk, the numbered places
        // show the order.
        const lines = follow ? await Promise.all(legs.map(([a, b]) => legLine(a, b))) : [];
        if (gone) return;
        const last = loop ? legs.length - 1 : -1;
        lines.forEach((line, i) => {
          const measured = !!line;
          const path = measured ? line.map(([la, lo]) => ({ lat: la, lng: lo })) : legs[i].map(at);
          if (i === last) {
            const dash = new maps.Polyline({
              map, path, strokeOpacity: 0, zIndex: 1,
              icons: [{ icon: { path: "M 0,-1 0,1", strokeColor: C.gold, strokeOpacity: measured ? 0.85 : 0.35, strokeWeight: 3, scale: 3 }, offset: "0", repeat: "14px" }],
            });
            drawn.push(dash);
            // Walking home, the way back is the leg being walked: drawn as
            // a line then, under the dashes.
            const solid = new maps.Polyline({ map, path, strokeColor: C.gold, strokeOpacity: 0, strokeWeight: 4, zIndex: 1 });
            drawn.push(solid);
            legLines[i] = { line: solid, casing: null, measured, dashed: true, path, to: at(legs[i][1]), dash };
            return;
          }
          const casing = measured ? new maps.Polyline({ map, path, strokeColor: "#FFFFFF", strokeOpacity: 0.9, strokeWeight: 8, zIndex: 2 }) : null;
          if (casing) drawn.push(casing);
          const gold = new maps.Polyline({
            map, path, zIndex: 3,
            strokeColor: C.gold, strokeOpacity: measured ? 0.9 : 0.35, strokeWeight: measured ? 4 : 2,
            icons: [{ icon: { path: maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3.2, fillColor: C.gold, fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 1.5 }, offset: "50%" }],
          });
          drawn.push(gold);
          legLines[i] = { line: gold, casing, measured, dashed: false, path, to: at(legs[i][1]) };
        });
        if (activeLegRef.current !== null) { styleLegs(activeLegRef.current); joinUp(mePos); }
      } catch {
        if (!gone) setFailed(true);
      }
    })();

    return () => {
      gone = true;
      if (raf) cancelAnimationFrame(raf);
      api.current = null;
      setAway(false);
      drawn.forEach(d => { try { if (typeof d.setMap === "function") d.setMap(null); else d.map = null; } catch { /* already gone */ } });
    };
  }, [walk]);

  // "Show on map": glide to the stop with that id.
  useEffect(() => {
    if (!focus || !Array.isArray(walk?.stops)) return;
    const i = walk.stops.findIndex(s => s.id === focus.id);
    if (i < 0) return;
    let tries = 0;
    const go = () => {
      if (api.current) api.current.focusStop(i, focus.n);
      else if (tries++ < 40) setTimeout(go, 100);
    };
    go();
  }, [focus?.n]);

  // The walker's position, as it comes in.
  useEffect(() => {
    if (!me) return;
    let tries = 0;
    const go = () => {
      if (api.current) api.current.showMe(me, follow, heading);
      else if (tries++ < 40) setTimeout(go, 100);
    };
    go();
  }, [me?.lat, me?.lon, me?.accuracy, follow, heading === null ? null : Math.round(heading / 5)]);

  // The leg being walked, for the walk mode.
  // The place photos, as they stand: when one arrives, the pins are filled again.
  const lookRef = useRef(cardFor);
  lookRef.current = cardFor;
  const looks = Array.isArray(walk?.stops) ? walk.stops.map(s => (cardFor && cardFor(s))?.photo || "").join("|") : "";
  useEffect(() => { if (looks.replace(/\|/g, "")) api.current?.relook?.(); }, [looks]);

  const activeLegRef = useRef(activeLeg);
  useEffect(() => { activeLegRef.current = activeLeg; api.current?.styleLegs(activeLeg); api.current?.joinUp(); }, [activeLeg]);

  if (!googleMapsReady() || failed || !walkLegs(walk).length) return null;
  const stops = Array.isArray(walk?.stops) ? walk.stops : [];
  const st = card ? stops[card.stop] : null;
  const extra = st ? (cardFor && cardFor(st)) || {} : {};
  const time = st && madeAt != null && Number.isFinite(Number(st.arrive)) ? HHMM(madeAt + Number(st.arrive)) : "";
  const pill = { background: C.surface, color: C.text, border: `1px solid ${C.gold}`, borderRadius: 100, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" };
  return (
    <div style={{ position: "relative", margin: round ? "12px 0 4px" : 0, height: round ? undefined : "100%" }}>
      <div
        ref={box}
        data-testid="google-walk-map"
        role="region"
        aria-label="Map of this walk"
        style={{ height, borderRadius: round ? 14 : 0, overflow: "hidden", border: round ? `1px solid ${C.border}` : "none", background: C.surface }}
      />
      <style>{FX_CSS}</style>
      {st && (
        <>
          {!follow && !reducedMotion() && <Burst key={`burst${card.n}`} />}
          {/* Walking, the next place arrives with its full card at the top,
              for a few seconds (Oliver, 6 Oct 2026: "it pops up with a sparkle
              and the captions of it that you made earlier"). */}
          {(
          <div key={`card${card.n}`} data-testid="map-card" style={{
            position: "absolute", left: 10, right: 10, ...(follow ? { top: 10 } : { bottom: 26 }), background: C.surface, border: `1px solid ${C.gold}`, borderRadius: 14, padding: "11px 13px", overflow: "hidden", pointerEvents: "none", fontFamily: "'Inter', sans-serif",
            display: "flex", gap: 11, alignItems: "flex-start",
            animation: reducedMotion() ? "none" : "gxCardIn 560ms cubic-bezier(.2,.9,.3,1) both, gxGlow 1800ms 560ms ease-in-out infinite",
          }}>
            <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "38%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)", animation: "gxShimmer 950ms 300ms ease-out both", pointerEvents: "none" }} />
            <span aria-hidden="true" style={{ position: "absolute", top: 7, right: 9, color: C.gold, fontSize: 13, textShadow: `0 0 8px ${C.gold}`, animation: "gxTwinkle 1400ms ease-in-out infinite" }}>✦</span>
            <div style={{ position: "relative", flex: "0 0 auto" }}>
              {extra.photo
                ? <img src={extra.photo} alt="" style={{ width: 54, height: 54, borderRadius: 10, objectFit: "cover", display: "block" }} />
                : <div style={{ width: 54, height: 54, borderRadius: 10, background: `${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{extra.emoji || "📍"}</div>}
              <div style={{ position: "absolute", top: -7, left: -7, width: 22, height: 22, borderRadius: 100, background: C.gold, color: C.onGold, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{card.stop + 1}</div>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.2 }}>{st.name}</div>
              <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 700, marginTop: 3 }}>{[time, st.stay ? uiT("now.stay", lang).replace("{n}", st.stay) : ""].filter(Boolean).join(" · ")}</div>
              {st.why && <div style={{ fontSize: 12, color: C.light, lineHeight: 1.45, marginTop: 4 }}>{st.why}</div>}
              {(st.tier === "Can't Miss Out" || st.deal) && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {st.tier === "Can't Miss Out" && <span style={{ fontSize: 10.5, fontWeight: 700, background: C.gold, color: C.onGold, borderRadius: 100, padding: "2px 8px" }}>⭐ {entryWord("Can't Miss Out", lang)}</span>}
                  {st.deal && <span style={{ fontSize: 10.5, fontWeight: 700, border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 100, padding: "2px 8px" }}>● {st.deal.text}</span>}
                </div>
              )}
            </div>
          </div>
          )}
          {!follow && (
            <button onClick={() => api.current?.overview()} data-testid="map-whole-walk" style={{ ...pill, position: "absolute", top: 10, right: 10 }}>
              {uiT("map.wholeWalk", lang)}
            </button>
          )}
        </>
      )}
      {follow && away && (
        <button onClick={() => api.current?.recenter()} data-testid="map-recenter" style={{ ...pill, position: "absolute", right: 10, bottom: (st && !follow ? 150 : 26) + lift }}>
          ◎ {uiT("map.recenter", lang)}
        </button>
      )}
    </div>
  );
};

export default GoogleWalkMap;
