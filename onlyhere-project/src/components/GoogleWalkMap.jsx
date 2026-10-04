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
  // Only a line is kept. A failed call is asked again next time, so one
  // passing error does not leave a leg faint for the rest of the visit.
  if (line) legCache.set(key, line);
  return line;
};

const reducedMotion = () => {
  try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches; } catch { return false; }
};

export const GoogleWalkMap = ({ walk, height = 300 }) => {
  const box = useRef(null);
  // ONE map for the life of the page. Google bills every map it creates, and
  // making a new one each time a visitor picks another walk would bill each
  // pick. A new walk clears the pins and lines and draws its own on this map.
  const mapRef = useRef(null);
  // It turns once per page, on the first walk shown, and not again when the
  // visitor picks another: by then they are reading, not watching.
  const turned = useRef(false);
  const moved = useRef(false);
  const [failed, setFailed] = useState(false);

  // A touch anywhere on the map, before or during the turn, ends it for good.
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const touched = () => { moved.current = true; };
    ["pointerdown", "wheel", "touchstart", "keydown"].forEach(e => el.addEventListener(e, touched, { passive: true }));
    return () => ["pointerdown", "wheel", "touchstart", "keydown"].forEach(e => el.removeEventListener(e, touched));
  }, [failed]);

  useEffect(() => {
    if (!googleMapsReady() || !walkLegs(walk).length) return undefined;
    let gone = false, raf = 0, idle = null;
    const drawn = [];
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf); raf = 0;
      // Stopped part way round, it is set back to north rather than left at
      // whatever angle it had reached.
      try { mapRef.current?.moveCamera({ heading: 0 }); } catch { /* map gone */ }
    };

    (async () => {
      try {
        const maps = await loadGoogleMaps();
        const { Map } = await maps.importLibrary("maps");
        const { AdvancedMarkerElement, PinElement } = await maps.importLibrary("marker");
        if (gone || !box.current) return;
        const at = (p) => ({ lat: Number(p.lat), lng: Number(p.lon) });
        const bounds = new maps.LatLngBounds();
        [walk.start, ...walk.stops].forEach(p => bounds.extend(at(p)));
        if (!mapRef.current) {
          mapRef.current = new Map(box.current, {
            mapId: GOOGLE_MAP_ID, center: bounds.getCenter(), zoom: 15,
            // ASKED FOR IN CODE, not left to the Map ID's own setting. Read off
            // the live page, 4 Oct 2026: the Map ID was set up as a raster map,
            // getRenderingType() said RASTER, and a raster map ignores tilt and
            // heading, so the walk neither tilted nor turned. The option wins
            // over the cloud setting.
            renderingType: maps.RenderingType?.VECTOR || "VECTOR",
            disableDefaultUI: true, zoomControl: true, gestureHandling: "cooperative",
          });
        }
        const map = mapRef.current;

        // ── THE TURN WAITS FOR THE MAP, NOT FOR THE LINES ──────────────
        // The first version listened for "idle" only after the walking lines
        // had come back from api/directions. By then the map had usually
        // already gone idle, the event never came again, and it neither tilted
        // nor turned. The listener goes on before anything slow is asked.
        idle = maps.event.addListenerOnce(map, "idle", () => {
          if (gone) return;
          map.moveCamera({ tilt: SPIN_TILT, heading: 0 });
          if (turned.current || moved.current || reducedMotion()) return;
          turned.current = true;
          const t0 = performance.now();
          const turn = (now) => {
            if (gone) return;
            if (moved.current) { raf = 0; return; }
            const heading = headingAt(now - t0);
            if (heading === null) { map.moveCamera({ heading: 0 }); raf = 0; return; }
            map.moveCamera({ heading });
            raf = requestAnimationFrame(turn);
          };
          raf = requestAnimationFrame(turn);
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
      } catch {
        if (!gone) setFailed(true);
      }
    })();

    return () => {
      gone = true;
      stop();
      try { idle?.remove(); } catch { /* already fired */ }
      drawn.forEach(d => { try { if (typeof d.setMap === "function") d.setMap(null); else d.map = null; } catch { /* already gone */ } });
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
