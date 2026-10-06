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
import { GoogleWalkMap, bearingOf, kmBetween, walkLegs, legTurns, turnSign } from "./GoogleWalkMap";
import { googleMapsReady } from "../utils/googleMapsLoader";
import { GemlyxCompass } from "./GemlyxLogo";

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
// Further than this, the walker is not in town yet: Oliver opened a Klaipėda
// walk in Aalborg on 7 Oct 2026 and read "918.6 km · about 11483 min". Past it
// the bar says how far, and that the walk starts in town.
export const FAR_M = 20000;
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
  // ── FULL SCREEN ───────────────────────────────────────────────────
  // Oliver, 6 Oct 2026: "And maybe make a 'full screen' tab". The map takes
  // the whole screen, and where the phone allows it so does the page, with
  // the browser's own bars gone. What is left is one slim strip at the foot:
  // the arrow, where to and how far, and the way back out.
  const [full, setFull] = useState(false);
  // ── THE TURNS, AS A LIST ──────────────────────────────────────────
  // Oliver, 6 Oct 2026, of three ways to give directions: "Turn list only".
  // Google's written steps for the leg being walked, opened from the map. The
  // list is read like a written route: nothing ticks it off or moves it on
  // with the walker's position (see the note at the top of this file). It
  // turns over to the next leg when the walker taps on to the next place.
  const [turnsOpen, setTurnsOpen] = useState(false);
  const [turns, setTurns] = useState({ idx: -1, state: "idle", list: [] });
  const shell = useRef(null);
  const goFull = async (on) => {
    setFull(on);
    try {
      if (on && !document.fullscreenElement) await shell.current?.requestFullscreen?.();
      if (!on && document.fullscreenElement) await document.exitFullscreen?.();
    } catch { /* the phone does not allow it: the map still fills the page */ }
  };
  // Leaving the browser's full screen by a swipe or the back key leaves ours too.
  useEffect(() => {
    const left = () => { if (!document.fullscreenElement) setFull(false); };
    document.addEventListener("fullscreenchange", left);
    return () => { document.removeEventListener("fullscreenchange", left); try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch { /* gone */ } };
  }, []);
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

  // The leg's turns, asked for when the list is open and the leg is new.
  const legs = useMemo(() => {
    const all = walkLegs(walk);
    return loop ? all : all.slice(0, -1);
  }, [walk, loop]);
  useEffect(() => {
    if (!turnsOpen || turns.idx === idx) return undefined;
    const leg = legs[idx];
    if (!leg) { setTurns({ idx, state: "none", list: [] }); return undefined; }
    let gone = false;
    setTurns({ idx, state: "loading", list: [] });
    legTurns(leg[0], leg[1], lang).then(list => { if (!gone) setTurns({ idx, state: list ? "ok" : "none", list: list || [] }); });
    return () => { gone = true; };
  }, [turnsOpen, idx]);

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

  const mapPill = { background: C.surface, color: C.text, border: `1px solid ${C.gold}`, borderRadius: 100, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" };
  const btn = (primary) => ({
    background: primary ? C.gold : "transparent", color: primary ? C.onGold : C.text, border: `1px solid ${primary ? C.gold : C.border}`,
    borderRadius: 12, padding: "9px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", textDecoration: "none", textAlign: "center",
  });

  return (
    <div ref={shell} data-testid="walk-mode" role="dialog" aria-label={uiT("walk.title", lang)} style={{ position: "fixed", inset: 0, zIndex: 3000, background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      {/* Where to, how far, how long, which way, in one slim bar, so the map
          has the screen (Oliver, 6 Oct 2026: "do you think the display of the
          attraction takes up too much of the screen? Making the GPS annoying"). */}
      {!full && <div data-testid="walk-bar" style={{ padding: "calc(8px + env(safe-area-inset-top, 0px)) 12px 8px", borderBottom: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "center", gap: 11 }}>
        <div aria-hidden="true" data-testid="walk-arrow" style={{ flex: "0 0 auto", width: 46, height: 46 }}>
          <GemlyxCompass size={46} angle={arrow} dim={!g} north={heading === null && !!g} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, color: C.muted, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {back ? uiT("walk.wayBack", lang) : fill(uiT("walk.stopOf", lang), { i: idx + 1, n: stops.length })}
            {plannedAt != null ? ` · ${fill(uiT("walk.planned", lang), { time: HHMM(madeAt + plannedAt) })}` : ""}
          </div>
          <div style={{ fontSize: 16.5, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {back ? (walk.start?.name || uiT("walk.start", lang)) : target?.name}
          </div>
          {g ? (
            <div data-testid="walk-distance" style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {g.here ? uiT("walk.here", lang) : g.metres > FAR_M ? fill(uiT("walk.far", lang), { dist: distanceWords(g.metres) }) : `${distanceWords(g.metres)} · ${fill(uiT("walk.minutes", lang), { n: g.minutes })} · ${fill(uiT("walk.head", lang), { dir: uiT(`walk.dir.${compassOf(g.bearing)}`, lang) })}`}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: gpsOff ? "#FFB347" : C.muted, marginTop: 1 }}>{uiT(gpsOff ? "walk.noGps" : "walk.finding", lang)}</div>
          )}
        </div>
        <button onClick={onClose} data-testid="walk-end" style={{ ...btn(false), flex: "0 0 auto", padding: "6px 11px", fontSize: 12 }}>{uiT("walk.end", lang)}</button>
      </div>}

      {/* The walk's own map, following the walker like a sat nav: turned the
          way the walker faces, the leg being walked lit up. */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {googleMapsReady()
          ? <GoogleWalkMap walk={walk} height="100%" round={false} madeAt={madeAt} cardFor={cardFor} focus={focus} me={pos} follow heading={heading ?? course} activeLeg={idx} lang={lang} loop={loop} lift={full ? 62 : 0} />
          : <div style={{ padding: 20, fontSize: 13, color: C.muted }}>{uiT("walk.noMap", lang)}</div>}
        {!full ? (
          !turnsOpen && (
            <div style={{ position: "absolute", left: 10, bottom: 26, display: "flex", gap: 6 }}>
              <button onClick={() => goFull(true)} data-testid="walk-full" aria-label={uiT("walk.fullScreen", lang)} style={mapPill}>
                ⛶ {uiT("walk.fullScreen", lang)}
              </button>
              <button onClick={() => setTurnsOpen(true)} data-testid="walk-turns-open" style={mapPill}>
                ↱ {uiT("walk.turns", lang)}
              </button>
            </div>
          )
        ) : (
          <div data-testid="walk-full-strip" style={{ position: "absolute", left: 10, right: 10, bottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: C.surface, border: `1px solid ${C.gold}`, borderRadius: 100, padding: "5px 5px 5px 6px", display: "flex", alignItems: "center", gap: 9, boxShadow: "0 3px 12px rgba(0,0,0,0.4)" }}>
            <span aria-hidden="true" style={{ flex: "0 0 auto", width: 34, height: 34 }}>
              <GemlyxCompass size={34} angle={arrow} dim={!g} />
            </span>
            <span style={{ minWidth: 0, flex: 1, fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {back ? (walk.start?.name || uiT("walk.start", lang)) : target?.name}
              {g && <span style={{ color: C.gold }}> · {g.here ? uiT("walk.here", lang) : g.metres > FAR_M ? fill(uiT("walk.far", lang), { dist: distanceWords(g.metres) }) : `${distanceWords(g.metres)} · ${fill(uiT("walk.minutes", lang), { n: g.minutes })}`}</span>}
            </span>
            {g?.here && !back && !(!loop && idx + 1 >= stops.length) && (
              <button onClick={() => setIdx(i => i + 1)} data-testid="walk-full-next" style={{ ...btn(true), flex: "0 0 auto", borderRadius: 100, padding: "7px 12px", fontSize: 12 }}>
                {uiT(idx + 1 >= stops.length ? "walk.headBack" : "walk.nextStop", lang)}
              </button>
            )}
            {!turnsOpen && (
              <button onClick={() => setTurnsOpen(true)} data-testid="walk-full-turns" aria-label={uiT("walk.turns", lang)}
                style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: "50%", border: `1px solid ${C.gold}`, background: "transparent", color: C.gold, fontSize: 16, cursor: "pointer" }}>↱</button>
            )}
            <button onClick={() => goFull(false)} data-testid="walk-exit-full" aria-label={uiT("walk.exitFull", lang)}
              style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: "50%", border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontSize: 15, cursor: "pointer" }}>✕</button>
          </div>
        )}
        {turnsOpen && (
          <div data-testid="walk-turns" style={{ position: "absolute", left: 0, right: 0, bottom: full ? "calc(62px + env(safe-area-inset-bottom, 0px))" : 0, maxHeight: "45%", display: "flex", flexDirection: "column", background: C.surface, borderTop: `2px solid ${C.gold}`, borderRadius: "16px 16px 0 0", boxShadow: "0 -6px 20px rgba(0,0,0,0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px 8px 16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {fill(uiT("walk.wayTo", lang), { place: back ? (walk.start?.name || uiT("walk.start", lang)) : (target?.name || "") })}
              </div>
              <button onClick={() => setTurnsOpen(false)} data-testid="walk-turns-close" aria-label="✕"
                style={{ flex: "0 0 auto", width: 30, height: 30, borderRadius: "50%", border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontSize: 14, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", padding: "4px 0 8px" }}>
              {turns.state === "loading" && <div style={{ padding: "12px 16px", fontSize: 13, color: C.muted }}>{uiT("walk.turnsLoading", lang)}</div>}
              {turns.state === "none" && <div style={{ padding: "12px 16px", fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{uiT("walk.turnsNone", lang)}</div>}
              {turns.state === "ok" && turns.list.map((tn, i) => (
                <div key={i} data-testid="walk-turn" style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderBottom: i < turns.list.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <span aria-hidden="true" style={{ flex: "0 0 auto", width: 30, height: 30, borderRadius: 8, background: `${C.gold}1F`, color: C.gold, fontSize: 17, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{turnSign(tn.maneuver)}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: C.text, lineHeight: 1.4 }}>{tn.text}</span>
                  {tn.meters > 0 && <span style={{ flex: "0 0 auto", fontSize: 12, fontWeight: 700, color: C.muted }}>{distanceWords(tn.meters)}</span>}
                </div>
              ))}
              {turns.state === "ok" && <div style={{ padding: "8px 16px 0", fontSize: 10.5, color: C.muted }}>{uiT("walk.turnsBy", lang)}</div>}
            </div>
          </div>
        )}
      </div>

      {/* What to do next. */}
      {!full && <div style={{ padding: "8px 12px calc(10px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 8 }}>
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
      </div>}
    </div>
  );
};

export default WalkMode;
