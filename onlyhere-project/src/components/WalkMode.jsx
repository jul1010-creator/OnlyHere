// ── WALKING IT, INSIDE GEMLYX ───────────────────────────────────────
//
// Oliver, 5 Oct 2026, asked whether Gemlyx should keep its walkers instead
// of sending them to the Google Maps app: "Yes, build it. But make it so it
// works like google maps. Distance, which way to go, how long, etc."
//
// So the walk opens full screen on the walk's own map. The walker is a blue
// dot. At the top: the stop you are walking to, how far it is, about how long,
// and an arrow that points at it, turned with the phone where the phone has a
// compass. Arriving (within ARRIVE_M) brings the stop's card up with its
// sparkle, and "On to the next stop" moves on; the last leg is the way back.
//
// WHAT IT DOES NOT DO, ON PURPOSE. Distance, time and the arrow are worked
// out here from the walker's position and the stop's own coordinates, the
// way the planner times its legs (WALK_DETOUR, WALK_M_PER_MIN). It does not
// read Google's walking route against the position and speak turns street by
// street: Google's terms forbid re-creating Google Maps' own real-time
// navigation from its APIs (Google Maps Platform Terms 3.2.3(d), read 5 Oct
// 2026), and that is the one thing the Navigation SDK, for apps, is for. For a
// street by street turn, "Street directions" opens that leg in Google Maps.
//
// The position never leaves the phone: it is drawn on the map and measured
// here, and nothing is sent anywhere.
import { useEffect, useMemo, useRef, useState } from "react";
import { C } from "../utils/theme";
import { t as uiT } from "../utils/uiLanguage";
import { WALK_DETOUR, WALK_M_PER_MIN } from "../utils/nowPlanner";
import { GoogleWalkMap, bearingOf, kmBetween } from "./GoogleWalkMap";
import { googleMapsReady } from "../utils/googleMapsLoader";

// Close enough to say you are there: GPS on a phone in a street is good to
// twenty or thirty metres.
export const ARRIVE_M = 35;

// How far, how long and which way, from where you stand to where you are
// going. Points are { lat, lon }.
export const guideTo = (pos, target) => {
  if (!pos || !target) return null;
  const straight = kmBetween(pos, target) * 1000;
  const metres = Math.round(straight * WALK_DETOUR);
  return {
    straight: Math.round(straight),
    metres,
    minutes: Math.max(1, Math.round(metres / WALK_M_PER_MIN)),
    bearing: bearingOf(pos, target),
    here: straight <= ARRIVE_M,
  };
};

// The eight points of the compass, for "Head north-west".
export const COMPASS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
export const compassOf = (bearing) => COMPASS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];

// "450 m", "1.2 km": rounded the way a sign rounds.
export const distanceWords = (m) => (m >= 1000 ? `${(Math.round(m / 100) / 10).toFixed(1)} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`);

const fill = (s, vars) => Object.entries(vars).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v)), s);
const HHMM = (m) => `${String(Math.floor((((m % 1440) + 1440) % 1440) / 60)).padStart(2, "0")}:${String((((m % 60) + 60) % 60)).padStart(2, "0")}`;

// iOS asks before it gives a page the compass, and only from a tap. Called
// from the Start button for that reason.
export const askForCompass = async () => {
  try {
    const D = typeof window !== "undefined" ? window.DeviceOrientationEvent : null;
    if (D && typeof D.requestPermission === "function") await D.requestPermission();
  } catch { /* no compass, the arrow points with north up */ }
};

// `loop` false for a trail that ends at its last stop: no way back, and the
// last stop's button finishes the walk.
export const WalkMode = ({ walk, madeAt, lang = "en", country = "LT", onClose, cardFor = null, loop = true }) => {
  const stops = Array.isArray(walk?.stops) ? walk.stops : [];
  // 0..stops.length-1 are the stops; stops.length is the way back.
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState(null);
  const [gpsOff, setGpsOff] = useState(false);
  const [heading, setHeading] = useState(null);
  // The way the walker is moving, from the GPS itself, where the phone gives
  // it: steadier than the compass while walking, absent when standing still.
  const [course, setCourse] = useState(null);
  const [focus, setFocus] = useState(null);
  const n = useRef(0);
  const back = idx >= stops.length;
  const target = back ? walk.start : stops[idx];
  const plannedAt = madeAt != null ? (back ? walk.back?.at : target?.arrive) : null;

  // Where the walker is, as often as the phone says.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGpsOff(true); return undefined; }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGpsOff(false);
        setPos({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy });
        const h = p.coords.heading;
        if (typeof h === "number" && Number.isFinite(h) && (p.coords.speed ?? 1) > 0.5) setCourse(h);
      },
      () => setGpsOff(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => { try { navigator.geolocation.clearWatch(id); } catch { /* gone */ } };
  }, []);

  // Which way the phone faces, where it has a compass.
  useEffect(() => {
    const read = (e) => {
      const h = typeof e.webkitCompassHeading === "number" ? e.webkitCompassHeading : (e.absolute && typeof e.alpha === "number" ? (360 - e.alpha) % 360 : null);
      if (h !== null && Number.isFinite(h)) setHeading(h);
    };
    window.addEventListener("deviceorientationabsolute", read);
    window.addEventListener("deviceorientation", read);
    return () => { window.removeEventListener("deviceorientationabsolute", read); window.removeEventListener("deviceorientation", read); };
  }, []);

  // The screen stays on while walking, where the phone allows it.
  useEffect(() => {
    let lock = null;
    (async () => { try { lock = await navigator.wakeLock?.request("screen"); } catch { /* not allowed, fine */ } })();
    return () => { try { lock?.release(); } catch { /* gone */ } };
  }, []);

  // The map shows the stop you are walking to.
  useEffect(() => { if (!back && target) setFocus({ id: target.id, n: ++n.current }); }, [idx]);

  const g = useMemo(() => guideTo(pos, target ? { lat: Number(target.lat), lon: Number(target.lon) } : null), [pos, target]);
  // Arriving brings the stop up again, sparkle and all, once per stop.
  const arrived = useRef(-1);
  useEffect(() => {
    if (g?.here && !back && arrived.current !== idx && target) { arrived.current = idx; setFocus({ id: target.id, n: ++n.current }); }
  }, [g?.here, idx]);
  const arrow = g ? (heading === null ? g.bearing : g.bearing - heading) : 0;
  const streets = target ? `https://www.google.com/maps/dir/?api=1&travelmode=walking${pos ? `&origin=${pos.lat},${pos.lon}` : ""}&destination=${Number(target.lat)},${Number(target.lon)}` : "";
  const done = back && g?.here;

  const btn = (primary) => ({
    background: primary ? C.gold : "transparent", color: primary ? C.onGold : C.text, border: `1px solid ${primary ? C.gold : C.border}`,
    borderRadius: 12, padding: "11px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", textDecoration: "none", textAlign: "center",
  });

  return (
    <div data-testid="walk-mode" role="dialog" aria-label={uiT("walk.title", lang)} style={{ position: "fixed", inset: 0, zIndex: 3000, background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      {/* Where to, how far, how long, which way. */}
      <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>
            {back ? uiT("walk.wayBack", lang) : fill(uiT("walk.stopOf", lang), { i: idx + 1, n: stops.length })}
          </div>
          <button onClick={onClose} data-testid="walk-end" style={{ ...btn(false), padding: "6px 12px", fontSize: 12 }}>{uiT("walk.end", lang)}</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
          <div aria-hidden="true" data-testid="walk-arrow" style={{ flex: "0 0 auto", width: 58, height: 58, borderRadius: "50%", background: `${C.gold}22`, border: `2px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {heading === null && g && <span style={{ position: "absolute", top: 2, fontSize: 9, fontWeight: 800, color: C.muted }}>N</span>}
            <svg width="30" height="30" viewBox="0 0 24 24" style={{ transform: `rotate(${arrow}deg)`, transition: "transform 300ms ease-out", opacity: g ? 1 : 0.3 }}>
              <path d="M12 2 L19 20 L12 16 L5 20 Z" fill={C.gold} stroke={C.onGold} strokeWidth="1" />
            </svg>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.15 }}>
              {back ? (walk.start?.name || uiT("walk.start", lang)) : target?.name}
            </div>
            {g ? (
              <div data-testid="walk-distance" style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginTop: 4 }}>
                {g.here ? uiT("walk.here", lang) : `${distanceWords(g.metres)} · ${fill(uiT("walk.minutes", lang), { n: g.minutes })} · ${fill(uiT("walk.head", lang), { dir: uiT(`walk.dir.${compassOf(g.bearing)}`, lang) })}`}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: gpsOff ? "#FFB347" : C.muted, marginTop: 4 }}>{uiT(gpsOff ? "walk.noGps" : "walk.finding", lang)}</div>
            )}
            {plannedAt != null && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{fill(uiT("walk.planned", lang), { time: HHMM(madeAt + plannedAt) })}</div>}
          </div>
        </div>
      </div>

      {/* The walk's own map, following the walker like a sat nav: turned the
          way the walker faces, the leg being walked lit up. */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {googleMapsReady()
          ? <GoogleWalkMap walk={walk} height="100%" round={false} madeAt={madeAt} cardFor={cardFor} focus={focus} me={pos} follow heading={heading ?? course} activeLeg={idx} lang={lang} loop={loop} />
          : <div style={{ padding: 20, fontSize: 13, color: C.muted }}>{uiT("walk.noMap", lang)}</div>}
      </div>

      {/* What to do next. */}
      <div style={{ padding: "12px 16px 18px", borderTop: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 8 }}>
        {done ? (
          <button onClick={onClose} style={{ ...btn(true), flex: 1 }} data-testid="walk-finish">{uiT("walk.finished", lang)}</button>
        ) : (
          <>
            <a href={streets} target="_blank" rel="noopener noreferrer" style={{ ...btn(false), flex: 1 }}>{uiT("walk.streets", lang)} ↗</a>
            {!back && (!loop && idx + 1 >= stops.length ? (
              <button onClick={onClose} style={{ ...btn(!!g?.here), flex: 1 }} data-testid="walk-finish">{uiT("walk.finished", lang)}</button>
            ) : (
              <button onClick={() => setIdx(i => i + 1)} style={{ ...btn(!!g?.here), flex: 1 }} data-testid="walk-next">
                {uiT(idx + 1 >= stops.length ? "walk.headBack" : "walk.nextStop", lang)}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default WalkMode;
