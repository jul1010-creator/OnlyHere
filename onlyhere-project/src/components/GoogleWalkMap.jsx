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
//
// ── AND SOMETHING TO SEE AT EVERY STOP ──────────────────────────────
// Oliver, 5 Oct 2026, of that first flight: "It's a lame flying.. because it
// is pointless. If we do flying, it has to be because of something cool to
// see.. or some 'bling bling' popping up with the place." So the flight is a
// preview of the walk now: at each stop the pin jumps and a card pops up with
// the place, the time you get there, why it is in the walk, and a star or a
// partner's offer where there is one. It ends pulled back over the whole walk
// with when you are back. The legs are quick; the stops are where it stays.
export const FLY_TILT = 55;
export const FLY_LEG_MS = 1300;
export const FLY_HOLD_MS = 2400;
export const FLY_END_MS = 3200;

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

// Which stop the flight is at `ms` in, and whether it has arrived there and
// is holding (when its card shows), or null once it has landed.
export const flightPhase = (pts, ms) => {
  if (pts.length < 2 || ms >= flightMs(pts)) return null;
  const per = FLY_LEG_MS + FLY_HOLD_MS;
  const at = Math.max(0, ms);
  const stop = Math.min(pts.length - 2, Math.floor(at / per));
  return { stop, holding: at - stop * per >= FLY_LEG_MS };
};

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

// ── THE SPARKLE ─────────────────────────────────────────────────────
// Oliver, 5 Oct 2026, of the cards: "can it fade in a little better? Maybe
// with bling bling? Like disney type?" So each arrival is a small burst of
// gold stars from the pin with a ring of light, the card blurs into focus
// with a sweep of light across it and a slow glow, a star twinkles in its
// corner, and it fades out again before the next leg. The flight opens out
// of a dark curtain with a burst in the middle, and the landing gets the
// biggest burst. Laid out once, the same every time, so nothing jumps
// about between runs.
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
@keyframes gxCardOut { 0% { opacity: 1; filter: blur(0); transform: none; } 100% { opacity: 0; filter: blur(6px); transform: translateY(8px) scale(.96); } }
@keyframes gxShimmer { 0% { transform: translateX(-130%) skewX(-20deg); } 100% { transform: translateX(330%) skewX(-20deg); } }
@keyframes gxGlow { 0%, 100% { box-shadow: 0 8px 24px rgba(0,0,0,.45), 0 0 0 rgba(217,164,65,0); } 50% { box-shadow: 0 8px 24px rgba(0,0,0,.45), 0 0 22px rgba(217,164,65,.55); } }
@keyframes gxTwinkle { 0%, 100% { opacity: .15; transform: scale(.5) rotate(0deg); } 50% { opacity: 1; transform: scale(1.1) rotate(45deg); } }
@keyframes gxCurtain { 0% { opacity: 1; } 100% { opacity: 0; } }
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

// `madeAt` is the walk's start, in minutes after midnight, for the times on
// the cards. `cardFor(stop)` may add { emoji, photo } for a stop.
export const GoogleWalkMap = ({ walk, height = 340, madeAt = null, cardFor = null }) => {
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
  // What pops up during the flight: { stop: index } or { end: true }.
  const [card, setCard] = useState(null);
  // Bumped at each flight, so the curtain and its burst play again.
  const [intro, setIntro] = useState(0);

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
    const pinEls = [];
    setCard(null);
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
        // ── OVER THE REAL TOWN ────────────────────────────────────────
        // Oliver, 5 Oct 2026, sending a satellite view of Klaipėda from a
        // third-party site: "how do we use this?" That site shows Google's own
        // satellite pictures, and this map can show them too, on the same key
        // and under Google's terms. So the flight is over the real roofs, the
        // castle ruins and the harbour, and the map goes back to the plain one
        // when it lands, because the plain one is the one you read a route on.
        const settle = () => { try { map.setMapTypeId("roadmap"); } catch { /* keep going */ } map.moveCamera({ heading: 0, tilt: 0 }); map.fitBounds(bounds, PAD); };
        let endTimer = 0;
        const popPin = (i) => pinEls.forEach((el, j) => { try { el.style.transform = j === i ? "scale(1.45) translateY(-4px)" : ""; } catch { /* pin gone */ } });
        const flyNow = () => {
          if (gone || pts.length < 2 || reducedMotion()) return;
          if (raf) cancelAnimationFrame(raf);
          clearTimeout(endTimer);
          moved.current = false;
          let shown = "";
          try { map.setMapTypeId("satellite"); } catch { /* the plain map flies too */ }
          // A card going away fades out first; the next one replaces it.
          const show = (key, value, pin) => {
            if (shown === key) return;
            shown = key; popPin(pin);
            if (value) { setCard(value); return; }
            setCard(c => (c && !c.out ? { ...c, out: true } : c));
            setTimeout(() => { if (!gone) setCard(c => (c && c.out ? null : c)); }, 320);
          };
          setIntro(n => n + 1);
          const first = cameraAt(pts, 0);
          map.moveCamera({ center: { lat: first.lat, lng: first.lng }, zoom, tilt: FLY_TILT, heading: first.heading });
          const t0 = performance.now();
          const fly = (now) => {
            if (gone) return;
            // Touched: the flight ends at once, with the walk in view.
            if (moved.current) { raf = 0; show("", null, -1); settle(); return; }
            const cam = cameraAt(pts, now - t0);
            // Landed: pulled back over the whole walk, with when you are back.
            if (!cam) {
              raf = 0; settle(); show("end", { end: true }, -1);
              endTimer = setTimeout(() => { if (!gone) setCard(null); }, FLY_END_MS);
              return;
            }
            const phase = flightPhase(pts, now - t0);
            if (phase?.holding) show(`s${phase.stop}`, { stop: phase.stop }, phase.stop);
            else show("", null, -1);
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
          try { pin.element.style.transition = "transform 280ms cubic-bezier(.2,1.6,.4,1)"; pin.element.style.transformOrigin = "50% 100%"; } catch { /* no element */ }
          pinEls.push(pin.element);
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
      <style>{FX_CSS}</style>
      {intro > 0 && (
        <div key={`curtain${intro}`} aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: 14, background: C.bg, animation: "gxCurtain 900ms ease-out both", pointerEvents: "none" }}>
          <Burst top="50%" size={1.6} />
        </div>
      )}
      {card && (() => {
        const stops = Array.isArray(walk?.stops) ? walk.stops : [];
        const box = {
          position: "absolute", left: 10, right: 10, bottom: 26, background: C.surface, border: `1px solid ${C.gold}`, borderRadius: 14, padding: "11px 13px", overflow: "hidden", pointerEvents: "none", fontFamily: "'Inter', sans-serif",
          animation: card.out ? "gxCardOut 300ms ease-in both" : "gxCardIn 560ms cubic-bezier(.2,.9,.3,1) both, gxGlow 1800ms 560ms ease-in-out infinite",
        };
        // A sweep of light across the card once it is in, and a star that
        // twinkles in its corner while it stays.
        const shine = (
          <>
            <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "38%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)", animation: "gxShimmer 950ms 300ms ease-out both", pointerEvents: "none" }} />
            <span aria-hidden="true" style={{ position: "absolute", top: 7, right: 9, color: C.gold, fontSize: 13, textShadow: `0 0 8px ${C.gold}`, animation: "gxTwinkle 1400ms ease-in-out infinite" }}>✦</span>
          </>
        );
        if (card.end) {
          const back = madeAt != null && walk?.back?.at != null ? HHMM(madeAt + walk.back.at) : "";
          return (
            <>
              {!card.out && <Burst key="burst-end" top="45%" size={2} />}
              <div key="end" data-testid="fly-card-end" style={box}>
                {shine}
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.text }}>{stops.length} stops{back ? `, back by ${back}` : ""}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>⚓ {walk?.start?.name || "Start"} and back</div>
              </div>
            </>
          );
        }
        const st = stops[card.stop];
        if (!st) return null;
        const extra = (cardFor && cardFor(st)) || {};
        const time = madeAt != null && Number.isFinite(Number(st.arrive)) ? HHMM(madeAt + Number(st.arrive)) : "";
        return (
          <>
          {!card.out && <Burst key={`burst${card.stop}`} />}
          <div key={`s${card.stop}`} data-testid="fly-card" style={{ ...box, display: "flex", gap: 11, alignItems: "flex-start" }}>
            {shine}
            <div style={{ position: "relative", flex: "0 0 auto" }}>
              {extra.photo
                ? <img src={extra.photo} alt="" style={{ width: 54, height: 54, borderRadius: 10, objectFit: "cover", display: "block" }} />
                : <div style={{ width: 54, height: 54, borderRadius: 10, background: `${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{extra.emoji || "📍"}</div>}
              <div style={{ position: "absolute", top: -7, left: -7, width: 22, height: 22, borderRadius: 100, background: C.gold, color: C.onGold, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{card.stop + 1}</div>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.2 }}>{st.name}</div>
              <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 700, marginTop: 3 }}>{[time, st.stay ? `${st.stay} min here` : ""].filter(Boolean).join(" · ")}</div>
              {st.why && <div style={{ fontSize: 12, color: C.light, lineHeight: 1.45, marginTop: 4 }}>{st.why}</div>}
              {(st.tier === "Can't Miss Out" || st.deal) && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {st.tier === "Can't Miss Out" && <span style={{ fontSize: 10.5, fontWeight: 700, background: C.gold, color: C.onGold, borderRadius: 100, padding: "2px 8px" }}>⭐ Can't Miss Out</span>}
                  {st.deal && <span style={{ fontSize: 10.5, fontWeight: 700, border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 100, padding: "2px 8px" }}>● {st.deal.text}</span>}
                </div>
              )}
            </div>
          </div>
          </>
        );
      })()}
      {canFly && !card && (
        <button onClick={() => flyRef.current?.()} data-testid="fly-walk"
          style={{ position: "absolute", left: 10, bottom: 30, background: C.gold, color: C.onGold, border: "none", borderRadius: 100, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}>
          ▶ Fly the walk
        </button>
      )}
    </div>
  );
};

export default GoogleWalkMap;
