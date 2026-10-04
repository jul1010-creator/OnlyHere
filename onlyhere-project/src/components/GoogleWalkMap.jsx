// ── A WALK ON GOOGLE'S MAP, TURNING ONCE ───────────────────────────
//
// Oliver, 4 Oct 2026, sending a camera loop Google's AI had given him:
//
//   function rotateCamera(bearing) {
//     if (bearing > 360) return;
//     map.moveCamera({heading: bearing});
//     requestAnimationFrame(() => rotateCamera(bearing + 0.1));
//   }
//
// "kind of a cool feature". Kept, with three changes. It is timed by the clock
// rather than by the frame, so a phone that draws thirty frames a second turns
// as fast as a laptop that draws a hundred and twenty. It stops the moment the
// visitor touches, scrolls or types, so it never fights a finger. And it does
// not move at all for anyone whose phone is set to reduce motion.
//
// The stops are numbered pins in walking order, the start is its own pin, and
// each leg is the walking line Google's Routes API measured (api/directions),
// drawn on Google's own map. A leg Google could not measure is drawn as a
// faint straight line, never as a confident one.
import { useEffect, useRef, useState } from "react";
import { C } from "../utils/theme";
import { GOOGLE_MAP_ID, googleMapsReady, loadGoogleMaps } from "../utils/googleMapsLoader";

// One full turn, and the tilt it is seen at.
export const SPIN_MS = 36000;
export const SPIN_TILT = 45;

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

// Where the camera points after `ms` of turning, or null once it has gone
// round once.
export const headingAt = (ms) => (ms >= SPIN_MS ? null : (Math.max(0, ms) / SPIN_MS) * 360);

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
  legCache.set(key, line);
  return line;
};

const reducedMotion = () => {
  try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches; } catch { return false; }
};

export const GoogleWalkMap = ({ walk, height = 300 }) => {
  const box = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!googleMapsReady() || !walkLegs(walk).length) return undefined;
    let gone = false, raf = 0, map = null, moved = false;
    const drawn = [];
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const el = box.current;
    // A touch before the map has settled counts too: it never starts turning.
    const touched = () => { moved = true; stop(); };
    ["pointerdown", "wheel", "touchstart", "keydown"].forEach(e => el?.addEventListener(e, touched, { passive: true }));

    (async () => {
      try {
        const maps = await loadGoogleMaps();
        const { Map } = await maps.importLibrary("maps");
        const { AdvancedMarkerElement, PinElement } = await maps.importLibrary("marker");
        if (gone || !box.current) return;
        const at = (p) => ({ lat: Number(p.lat), lng: Number(p.lon) });
        const bounds = new maps.LatLngBounds();
        [walk.start, ...walk.stops].forEach(p => bounds.extend(at(p)));
        map = new Map(box.current, {
          mapId: GOOGLE_MAP_ID, center: bounds.getCenter(), zoom: 15,
          disableDefaultUI: true, zoomControl: true, gestureHandling: "cooperative",
        });
        map.fitBounds(bounds, 36);

        // The start, then every stop numbered in the order it is walked.
        const startPin = new PinElement({ glyph: "⚓", background: C.surface, borderColor: C.gold, glyphColor: C.gold });
        drawn.push(new AdvancedMarkerElement({ map, position: at(walk.start), content: startPin.element, title: walk.start.name || "Start" }));
        walk.stops.forEach((s, i) => {
          const pin = new PinElement({ glyph: String(i + 1), background: C.gold, borderColor: C.onGold, glyphColor: C.onGold });
          drawn.push(new AdvancedMarkerElement({ map, position: at(s), content: pin.element, title: s.name || "" }));
        });

        // The legs as Google measured them.
        const legs = walkLegs(walk);
        const lines = await Promise.all(legs.map(([a, b]) => legLine(a, b)));
        if (gone) return;
        lines.forEach((line, i) => {
          const measured = !!line;
          drawn.push(new maps.Polyline({
            map,
            path: measured ? line.map(([la, lo]) => ({ lat: la, lng: lo })) : legs[i].map(at),
            strokeColor: C.gold, strokeOpacity: measured ? 0.9 : 0.35, strokeWeight: measured ? 4 : 2,
          }));
        });

        // Once the map has settled on the walk, tilt it and turn once.
        maps.event.addListenerOnce(map, "idle", () => {
          if (gone) return;
          map.moveCamera({ tilt: SPIN_TILT, heading: 0 });
          if (moved || reducedMotion()) return;
          const t0 = performance.now();
          const turn = (now) => {
            if (gone) return;
            const heading = headingAt(now - t0);
            if (heading === null) { map.moveCamera({ heading: 0 }); raf = 0; return; }
            map.moveCamera({ heading });
            raf = requestAnimationFrame(turn);
          };
          raf = requestAnimationFrame(turn);
        });
      } catch {
        if (!gone) setFailed(true);
      }
    })();

    return () => {
      gone = true;
      stop();
      ["pointerdown", "wheel", "touchstart", "keydown"].forEach(e => el?.removeEventListener(e, touched));
      drawn.forEach(d => { try { if ("setMap" in d) d.setMap(null); else d.map = null; } catch { /* already gone */ } });
    };
  }, [walk]);

  if (!googleMapsReady() || failed || !walkLegs(walk).length) return null;
  return (
    <div
      ref={box}
      data-testid="google-walk-map"
      role="region"
      aria-label="Map of this walk"
      style={{ height, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, margin: "12px 0 4px", background: C.surface }}
    />
  );
};

export default GoogleWalkMap;
