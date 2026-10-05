// ── A WALK ON GOOGLE'S MAP, FLOWN ONCE ─────────────────────────────
//
// The turn below became the fly-along on 5 Oct 2026 (see THE FLY-ALONG); what
// it kept from the turn is the clock timing, the stop on a touch and the
// stillness for reduced motion.
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

// ── THE FLY-ALONG ───────────────────────────────────────────────────
// Oliver, 5 Oct 2026, asking whether the map before a walk could be 3D, then,
// with Google's photorealistic 3D not covering Klaipėda, choosing this: the
// camera tilts down over the town's buildings, flies from the start to each
// stop in walking order, facing the way the walk goes, and then lies flat with
// the whole walk in view. It replaces the one slow turn of 4 Oct. A touch ends
// it at once, flat with the walk in view, and it never moves for a phone set
// to reduce motion. "Fly the walk" plays it again.
export const FLY_TILT = 55;
export const FLY_LEG_MS = 2200;
export const FLY_HOLD_MS = 500;

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

// The points the camera flies through: the start, then each stop in order.
const okPoint = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon));
export const flightPoints = (walk) => {
  const stops = Array.isArray(walk?.stops) ? walk.stops.filter(okPoint) : [];
  return okPoint(walk?.start) && stops.length ? [walk.start, ...stops].map(p => ({ lat: Number(p.lat), lon: Number(p.lon) })) : [];
};
export const flightMs = (pts) => (pts.length < 2 ? 0 : (pts.length - 1) * (FLY_LEG_MS + FLY_HOLD_MS));

// Compass bearing from a to b, 0 to 360, north 0.
export const bearingOf = (a, b) => {
  const r = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return ((Math.atan2(y, x) / r) + 360) % 360;
};
const kmBetween = (a, b) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
// Close enough to see the buildings as buildings, far enough out that the
// longest leg does not race past.
export const flightZoom = (pts) => {
  let far = 0;
  for (let i = 0; i < pts.length - 1; i++) far = Math.max(far, kmBetween(pts[i], pts[i + 1]));
  return far < 0.6 ? 17 : far < 1.5 ? 16.5 : far < 3 ? 16 : 15;
};
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
// Turning the short way round, so 350 to 10 is twenty degrees, not 340.
const turn = (from, to, t) => (((from + ((((to - from) % 360) + 540) % 360 - 180) * t) % 360) + 360) % 360;

// Where the camera is `ms` into the flight, or null once it has landed. Each
// leg glides from one point to the next and holds there a moment; the
// heading swings to face the new leg in its first third.
export const cameraAt = (pts, ms) => {
  if (pts.length < 2 || ms >= flightMs(pts)) return null;
  const per = FLY_LEG_MS + FLY_HOLD_MS;
  const at = Math.max(0, ms);
  const i = Math.min(pts.length - 2, Math.floor(at / per));
  const t = Math.min(1, (at - i * per) / FLY_LEG_MS);
  const a = pts[i], b = pts[i + 1], e = ease(t);
  const now = bearingOf(a, b);
  const before = i === 0 ? now : bearingOf(pts[i - 1], a);
  return { lat: a.lat + (b.lat - a.lat) * e, lng: a.lon + (b.lon - a.lon) * e, heading: turn(before, now, Math.min(1, t / 0.35)) };
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

const reducedMotion = () => {
  try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches; } catch { return false; }
};

// ── A MAP YOU CAN READ AS A ROUTE ───────────────────────────────────
// Oliver, 5 Oct 2026, of the four hour walk from the ship: "confusing and
// messy map.. you don't look at this and think 'looks like a good route'..
// nobody can tell what this route is". What made it so: every leg the same
// gold line with nothing to say which way it ran, the way back drawn over the
// way out, the map left tilted after the turn so the start fell off the
// bottom, and pins large enough to cover each other on Theatre Square. Now
// each leg carries an arrow halfway along it, on a white edge so it reads on
// water and on streets, the way back is a dashed line, the map lies flat
// again after its one turn with the whole walk in view, and the pins are
// smaller. Google's own labels (museums, bars) are hidden by the map style
// set on the Map ID in Google Cloud, not here: a vector map with a Map ID
// takes no style from code.
const PAD = { top: 52, right: 28, bottom: 28, left: 28 };
const PIN_SCALE = 0.85;

export const GoogleWalkMap = ({ walk, height = 340 }) => {
  const box = useRef(null);
  // ONE map for the life of the page. Google bills every map it creates, and
  // making a new one each time a visitor picks another walk would bill each
  // pick. A new walk clears the pins and lines and draws its own on this map.
  const mapRef = useRef(null);
  // It flies once per page, on the first walk shown, and not again by itself
  // when the visitor picks another: by then they are reading, not watching.
  // "Fly the walk" plays it whenever they ask.
  const turned = useRef(false);
  const moved = useRef(false);
  const flyRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [canFly, setCanFly] = useState(false);

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
      try { mapRef.current?.moveCamera({ heading: 0, tilt: 0 }); } catch { /* map gone */ }
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
            disableDefaultUI: true, zoomControl: true, gestureHandling: "cooperative", clickableIcons: false,
          });
        }
        const map = mapRef.current;

        // ── THE TURN WAITS FOR THE MAP, NOT FOR THE LINES ──────────────
        // The first version listened for "idle" only after the walking lines
        // had come back from api/directions. By then the map had usually
        // already gone idle, the event never came again, and it neither tilted
        // nor turned. The listener goes on before anything slow is asked.
        const pts = flightPoints(walk);
        const zoom = flightZoom(pts);
        // Flat, north up, the whole walk in view: where every flight ends.
        const settle = () => { map.moveCamera({ heading: 0, tilt: 0 }); map.fitBounds(bounds, PAD); };
        const flyNow = () => {
          if (gone || pts.length < 2 || reducedMotion()) return;
          if (raf) cancelAnimationFrame(raf);
          moved.current = false;
          const first = cameraAt(pts, 0);
          map.moveCamera({ center: { lat: first.lat, lng: first.lng }, zoom, tilt: FLY_TILT, heading: first.heading });
          const t0 = performance.now();
          const fly = (now) => {
            if (gone) return;
            // Touched: the flight ends at once, with the walk in view.
            if (moved.current) { raf = 0; settle(); return; }
            const cam = cameraAt(pts, now - t0);
            if (!cam) { raf = 0; settle(); return; }
            map.moveCamera({ center: { lat: cam.lat, lng: cam.lng }, zoom, tilt: FLY_TILT, heading: cam.heading });
            raf = requestAnimationFrame(fly);
          };
          raf = requestAnimationFrame(fly);
        };
        flyRef.current = flyNow;
        setCanFly(pts.length >= 2 && !reducedMotion());
        idle = maps.event.addListenerOnce(map, "idle", () => {
          if (gone) return;
          if (turned.current || moved.current || reducedMotion()) return;
          turned.current = true;
          flyNow();
        });
        map.moveCamera({ heading: 0, tilt: 0 });
        map.fitBounds(bounds, PAD);

        // The start, then every stop numbered in the order it is walked.
        const startPin = new PinElement({ glyph: "⚓", background: C.surface, borderColor: C.gold, glyphColor: C.gold, scale: PIN_SCALE });
        drawn.push(new AdvancedMarkerElement({ map, position: at(walk.start), content: startPin.element, title: walk.start.name || "Start", zIndex: 100 }));
        walk.stops.forEach((s, i) => {
          const pin = new PinElement({ glyph: String(i + 1), background: C.gold, borderColor: C.onGold, glyphColor: C.onGold, scale: PIN_SCALE });
          drawn.push(new AdvancedMarkerElement({ map, position: at(s), content: pin.element, title: s.name || "", zIndex: 50 - i }));
        });

        // The legs as Google measured them.
        const legs = walkLegs(walk);
        const lines = await Promise.all(legs.map(([a, b]) => legLine(a, b)));
        if (gone) return;
        // Out and on: a gold line on a white edge with an arrow halfway, so the
        // order reads off the map. Back to the start: a dashed line, so the way
        // home never looks like part of the walk.
        const last = legs.length - 1;
        lines.forEach((line, i) => {
          const measured = !!line;
          const path = measured ? line.map(([la, lo]) => ({ lat: la, lng: lo })) : legs[i].map(at);
          if (i === last) {
            drawn.push(new maps.Polyline({
              map, path, strokeOpacity: 0, zIndex: 1,
              icons: [{ icon: { path: "M 0,-1 0,1", strokeColor: C.gold, strokeOpacity: measured ? 0.85 : 0.35, strokeWeight: 3, scale: 3 }, offset: "0", repeat: "14px" }],
            }));
            return;
          }
          if (measured) drawn.push(new maps.Polyline({ map, path, strokeColor: "#FFFFFF", strokeOpacity: 0.9, strokeWeight: 8, zIndex: 2 }));
          drawn.push(new maps.Polyline({
            map, path, zIndex: 3,
            strokeColor: C.gold, strokeOpacity: measured ? 0.9 : 0.35, strokeWeight: measured ? 4 : 2,
            icons: [{ icon: { path: maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3.2, fillColor: C.gold, fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 1.5 }, offset: "50%" }],
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
    <div style={{ position: "relative", margin: "12px 0 4px" }}>
      <div
        ref={box}
        data-testid="google-walk-map"
        role="region"
        aria-label="Map of this walk"
        style={{ height, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, background: C.surface }}
      />
      {canFly && (
        <button onClick={() => flyRef.current?.()} data-testid="fly-walk"
          style={{ position: "absolute", left: 10, bottom: 30, background: C.gold, color: C.onGold, border: "none", borderRadius: 100, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}>
          ▶ Fly the walk
        </button>
      )}
    </div>
  );
};

export default GoogleWalkMap;
