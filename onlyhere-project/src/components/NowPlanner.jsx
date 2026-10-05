// ── "I HAVE X HOURS", ON THE PAGE ───────────────────────────────────
//
// The walk made for this moment (Oliver, 2 Oct 2026). How it is made is in
// utils/nowPlanner.js and api/plan-now.js; this only asks and draws.
//
// Times on the page run from the reader's own "now" at the place, rounded up
// to five minutes, since the walk itself was checked for the whole half hour
// it is served in.
import { useEffect, useMemo, useRef, useState } from "react";
import { C } from "../utils/theme";
import { t as uiT, resolveUiLanguage, UI_LANGUAGE_KEY } from "../utils/uiLanguage";
import { countryProfile } from "../utils/countries";
import { placeClock } from "../utils/offerClock";
import { NOW_HOURS, NOW_STARTS, NOW_STYLES, STROLL, STORM_WIND, HERE, NOW_AREAS, snapPos, inNowArea, slotOf, walkMapsUrl, rideApp, MUST_SEE, STAY_STEP, replanWalk, canStayLonger } from "../utils/nowPlanner";
import { entryWord } from "../utils/entryWords";
import { ferryOf } from "../utils/walkable";
import { WalkMode, askForCompass } from "./WalkMode";
import { inPortNow, hoursBeforeSailing } from "../utils/cruiseDays";

const fill = (s, vars) => Object.entries(vars).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v)), s);
const clock = (m, lang) => {
  const mm = ((Math.round(m) % 1440) + 1440) % 1440;
  const s = `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
  return lang === "da" ? s.replace(":", ".") : s;
};

// A leg that crosses the strait, said in its parts, with the operator's
// timetable one tap away: the wait is the longest it can be, and the page
// should not pretend to know today's departures.
const FerryLeg = ({ ferry, lang, country }) => {
  const host = ferryOf(country)?.timetable || "";
  return (
    <span data-testid="now-ferry">
      {fill(uiT("now.ferry", lang), { a: ferry.walkTo, w: ferry.wait, c: ferry.crossing, b: ferry.walkFrom })}
      {host && <>{" · "}<a href={`https://www.${host}/`} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none", fontWeight: 700 }}>{uiT("now.ferryTimes", lang)} ↗</a></>}
    </span>
  );
};

const readerLang = () => {
  let stored = null;
  try { stored = window.localStorage.getItem(UI_LANGUAGE_KEY); } catch { stored = null; }
  return resolveUiLanguage(stored, typeof navigator !== "undefined" ? navigator.language : "");
};

// The walk itself, drawn from what the route answers with. Also used by the
// examples page (pages/KlaipedaExamples.jsx), which runs the same rules on
// made-up partners, and passes `tag` to mark them as made up.
export const WalkView = ({ walk, madeAt, lang, country = "LT", tag = null, onOpen = null, edit = null, onShow = null, cardFor = null }) => {
  const app = rideApp(country);
  // Walking it inside Gemlyx (WalkMode.jsx), from the Start walking button.
  const [walking, setWalking] = useState(false);
  const small = { background: "transparent", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, width: 26, height: 26, fontSize: 14, fontWeight: 700, lineHeight: 1, cursor: "pointer", fontFamily: "'Inter', sans-serif", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 };
  return (
    <div data-testid="now-walk" style={{ marginTop: 16 }}>
      {(walk.weather?.snow || walk.weather?.wet) && <div data-testid="now-weather" style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{uiT(walk.weather?.snow ? "now.snow" : "now.wet", lang)}</div>}
      {Number(walk.weather?.wind) >= STORM_WIND && <div data-testid="now-wind" style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{uiT("now.windy", lang)}</div>}
      {walk.stops.length === 0 ? (
        <div style={{ fontSize: 13, color: C.muted }}>{uiT("now.empty", lang)}</div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            {clock(madeAt, lang)} · {uiT("now.start", lang)}: {walk.start.id === HERE ? uiT("now.whereYouAre", lang) : walk.start.name}
          </div>
          {walk.stops.map(s => (
            <div key={s.id}>
              <div style={{ fontSize: 11.5, color: C.muted, padding: "6px 0 6px 12px", borderLeft: `1px solid ${C.gold}55`, marginLeft: 4 }}>
                {s.ferry ? <FerryLeg ferry={s.ferry} lang={lang} country={country} />
                  : s.ride && app
                  ? <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none", fontWeight: 700 }}>{fill(uiT("now.ride", lang), { app: app.name, n: s.leg })} ↗</a>
                  : fill(uiT("now.walk", lang), { n: s.leg })}
              </div>
              <div data-testid="now-stop" style={{ display: "flex", gap: 12, padding: "8px 0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, minWidth: 44 }}>{clock(madeAt + s.arrive, lang)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>
                    {onOpen
                      ? <button onClick={() => onOpen(s)} data-testid="now-open" style={{ background: "none", border: "none", padding: 0, color: C.text, font: "inherit", cursor: "pointer", textAlign: "left", borderBottom: `1px dotted ${C.muted}` }}>{s.name}</button>
                      : s.name}
                    {s.tier === MUST_SEE && <span data-testid="now-must-see" style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: C.onGold, background: C.gold, borderRadius: 100, padding: "2px 8px", fontFamily: "'Inter', sans-serif", verticalAlign: "middle", whiteSpace: "nowrap" }}>⭐ {entryWord(MUST_SEE, lang)}</span>}
                    {tag && tag(s) && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 100, padding: "2px 7px", fontFamily: "'Inter', sans-serif", verticalAlign: "middle" }}>{tag(s)}</span>}
                  </div>
                  {edit ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <button onClick={() => edit.shorter(s.id)} disabled={s.stay <= 15} aria-label={uiT("now.shorter", lang)} title={uiT("now.shorter", lang)} data-testid="now-shorter" style={{ ...small, opacity: s.stay <= 15 ? 0.35 : 1 }}>−</button>
                      <span style={{ fontSize: 11.5, color: C.muted, minWidth: 74, textAlign: "center" }}>{fill(uiT("now.stay", lang), { n: s.stay })}</span>
                      <button onClick={() => edit.longer(s.id)} disabled={!edit.canLonger(s.id)} aria-label={uiT("now.longer", lang)} title={uiT("now.longer", lang)} data-testid="now-longer" style={{ ...small, opacity: edit.canLonger(s.id) ? 1 : 0.35 }}>+</button>
                      <button onClick={() => edit.remove(s.id)} aria-label={uiT("now.remove", lang)} title={uiT("now.remove", lang)} data-testid="now-remove" style={{ ...small, marginLeft: 6 }}>×</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{fill(uiT("now.stay", lang), { n: s.stay })}</div>
                  )}
                  {s.deal && (
                    <div style={{ display: "inline-block", marginTop: 6, fontSize: 11.5, fontWeight: 700, borderRadius: 100, padding: "3px 10px", background: C.gold, color: C.onGold }}>
                      ● {uiT("now.partner", lang)}: {s.deal.text}{s.deal.to ? ` · ${fill(uiT("offer.onNowUntil", lang), { time: clock(Number(s.deal.to.slice(0, 2)) * 60 + Number(s.deal.to.slice(3)), lang) })}` : ""}
                    </div>
                  )}
                  {s.why && <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.5, marginTop: 6 }}>{s.why}</div>}
                  {/* Oliver, 5 Oct 2026: "Have a 'show on map'... When someone
                      clicks a place on the list, then the map flies to it." */}
                  {onShow && (
                    <button onClick={() => onShow(s)} data-testid="now-show-on-map" style={{ marginTop: 7, background: "transparent", border: `1px solid ${C.gold}88`, color: C.gold, borderRadius: 100, padding: "4px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                      📍 {uiT("now.showOnMap", lang)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: C.muted, padding: "6px 0 6px 12px", borderLeft: `1px solid ${C.gold}55`, marginLeft: 4 }}>
            {walk.back.ferry ? <FerryLeg ferry={walk.back.ferry} lang={lang} country={country} />
              : walk.back.ride && app
              ? <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none", fontWeight: 700 }}>{fill(uiT("now.ride", lang), { app: app.name, n: walk.back.leg })} ↗</a>
              : fill(uiT("now.walk", lang), { n: walk.back.leg })}
          </div>
          <div data-testid="now-back" style={{ fontSize: 13, fontWeight: 700, color: C.text, padding: "8px 0 4px" }}>
            {walk.start.ship
              ? fill(uiT("now.backShip", lang), { time: clock(madeAt + walk.back.at, lang), n: Math.max(walk.margin, walk.deadline + walk.margin - walk.back.at) })
              : fill(uiT(walk.start.id === HERE ? "now.backHere" : "now.backCentre", lang), { time: clock(madeAt + walk.back.at, lang) })}
          </div>
          <button onClick={() => { askForCompass(); setWalking(true); }} data-testid="now-start-walk"
            style={{ display: "block", width: "100%", marginTop: 12, background: C.gold, color: C.onGold, border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            ▶ {uiT("now.startWalk", lang)}
          </button>
          <a href={walkMapsUrl(walk.start, walk.stops)} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", textAlign: "center", marginTop: 8, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 700, color: C.light, textDecoration: "none" }}>
            {uiT("now.route", lang)} ↗
          </a>
          {walking && <WalkMode walk={walk} madeAt={madeAt} lang={lang} country={country} cardFor={cardFor} onClose={() => setWalking(false)} />}
        </>
      )}
      {/* Outside the walk, so taking out every stop still leaves the way to
          put them back. Found in review, 2 Oct 2026. */}
      {edit && edit.removed.length > 0 && (
        <div data-testid="now-taken-out" style={{ fontSize: 12, color: C.muted, padding: "8px 0 2px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span>{uiT("now.takenOut", lang)}:</span>
          {edit.removed.map(r => (
            <button key={r.id} onClick={() => edit.putBack(r.id)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "3px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              {r.name} · {uiT("now.putBack", lang)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── THE WALK, CHANGED BY THE READER ─────────────────────────────────
// Oliver, 2 Oct 2026: "If we make a time for how long we want to be each
// place, then make able to remove one from their listing." Each stop gets a
// shorter and a longer and a take out, and the walk is run again on the phone
// by the same rules from the places the server sent with it (walk.places), so
// every time and every open door stays checked. Longer is offered only while
// it pushes nothing else out.
export const EditableWalk = ({ walk, madeAt, lang, country = "LT", tag = null, onOpen = null, onShow = null, cardFor = null, onWalk = null }) => {
  const [edits, setEdits] = useState({ stays: {}, removed: [] });
  useEffect(() => { setEdits({ stays: {}, removed: [] }); }, [walk]);
  const ctx = useMemo(() => ({ country, start: walk.start, startClock: walk.clock, budget: walk.budget, margin: walk.margin || 0, weather: walk.weather || null, style: walk.style || "" }), [walk, country]);
  const usable = !!(walk?.clock && walk?.budget && Array.isArray(walk?.places) && walk.places.length);
  const changed = Object.keys(edits.stays).length > 0 || edits.removed.length > 0;
  const shown = useMemo(() => (usable && changed ? { ...walk, ...replanWalk(walk, edits, ctx) } : walk), [walk, edits, ctx, usable, changed]);
  // The map beside the list shows the walk as the reader has changed it.
  useEffect(() => { if (onWalk) onWalk(shown); }, [shown]);
  if (!usable) return <WalkView walk={walk} madeAt={madeAt} lang={lang} country={country} tag={tag} onOpen={onOpen} onShow={onShow} cardFor={cardFor} />;
  const stayOf = (id) => shown.stops.find(x => x.id === id)?.stay;
  const edit = {
    longer: (id) => { if (canStayLonger(walk, edits, id, ctx)) setEdits(e => ({ ...e, stays: { ...e.stays, [id]: stayOf(id) + STAY_STEP } })); },
    shorter: (id) => setEdits(e => ({ ...e, stays: { ...e.stays, [id]: Math.max(15, stayOf(id) - STAY_STEP) } })),
    canLonger: (id) => canStayLonger(walk, edits, id, ctx),
    remove: (id) => setEdits(e => ({ ...e, removed: [...e.removed, id] })),
    putBack: (id) => setEdits(e => ({ ...e, removed: e.removed.filter(x => x !== id) })),
    removed: edits.removed.map(id => ({ id, name: walk.stops.find(x => x.id === id)?.name || id })),
  };
  return <WalkView walk={shown} madeAt={madeAt} lang={lang} country={country} tag={tag} onOpen={onOpen} edit={edit} onShow={onShow} cardFor={cardFor} />;
};

// Which way round this phone walks, kept so a reload does not flip it. See
// reversedWalk in utils/nowPlanner.js for why there are two.
const WALK_SIDE_KEY = "gemlyx:walkSide";
export const walkSide = () => {
  try {
    let v = window.localStorage.getItem(WALK_SIDE_KEY);
    if (v !== "0" && v !== "1") { v = Math.random() < 0.5 ? "0" : "1"; window.localStorage.setItem(WALK_SIDE_KEY, v); }
    return v;
  } catch { return Math.random() < 0.5 ? "0" : "1"; }
};

export const NowPlanner = ({ country = "LT", lang: langProp = "", defaultFrom = "" }) => {
  const lang = langProp || readerLang();
  const starts = NOW_STARTS[country] || {};
  const firstFrom = starts[defaultFrom] ? defaultFrom : Object.keys(starts)[0];
  const [from, setFrom] = useState(firstFrom);
  const [hours, setHours] = useState(3);
  // From where I am (Oliver, 5 Oct 2026). The position is asked for only when
  // that button is tapped, kept on the 200 metre grid the route caches on,
  // and never stored.
  const [pos, setPos] = useState(null);
  const [posNote, setPosNote] = useState("");
  const canLocate = typeof navigator !== "undefined" && !!navigator.geolocation && !!NOW_AREAS[country];
  const useHere = () => {
    setPosNote("");
    try {
      navigator.geolocation.getCurrentPosition((p) => {
        const at = { lat: snapPos(p.coords.latitude), lon: snapPos(p.coords.longitude) };
        if (!inNowArea(country, at)) { setPosNote(uiT("now.notHere", lang)); return; }
        setPos(at); setFrom(HERE);
      }, () => setPosNote(uiT("now.noLocation", lang)), { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
    } catch { setPosNote(uiT("now.noLocation", lang)); }
  };
  // The start part of the address, the same spelling the route insists on.
  const fromQuery = from === HERE && pos ? `from=${HERE}&h=${hours}&lang=${lang}&lat=${pos.lat}&lon=${pos.lon}` : `from=${from}&h=${hours}&lang=${lang}`;
  // A walk of one kind (Oliver, 5 Oct 2026: "anything possible in Klaipeda.
  // But Only if the timing fits"). `kinds` is what the route says fits this
  // start, this length and this half hour; nothing is offered until it says.
  const [style, setStyle] = useState("");
  const [kinds, setKinds] = useState([]);
  const [state, setState] = useState({ busy: false, walk: null, error: "", madeAt: 0 });
  // Which choice the newest request was for. An answer for an older choice,
  // arriving after the reader tapped another button, is dropped.
  const asked = useRef("");
  const side = useMemo(() => walkSide(), []);

  // A new choice clears the old walk, so a 2 hour walk is never shown under
  // a 4 hour button.
  useEffect(() => { asked.current = ""; setState({ busy: false, walk: null, error: "", madeAt: 0 }); }, [from, hours, style, pos]);

  // Which kinds fit, asked again when the start or the length changes. A kind
  // that no longer fits is let go of rather than left pressed.
  useEffect(() => {
    if (!starts[from] && !(from === HERE && pos)) return undefined;
    let gone = false;
    const ask = (slot) => fetch(`/api/plan-now?c=${country}&${fromQuery}&slot=${encodeURIComponent(slot)}&styles=1`);
    (async () => {
      try {
        let r = await ask(slotOf(new Date()));
        if (r.status === 409) { const j = await r.json().catch(() => ({})); if (j.slot) r = await ask(j.slot); }
        const got = r.ok ? await r.json() : null;
        const fit = Array.isArray(got?.styles) ? got.styles.filter(k => NOW_STYLES.includes(k)) : [];
        if (gone) return;
        setKinds(fit);
        setStyle(cur => (cur && !fit.includes(cur) ? "" : cur));
      } catch { if (!gone) setKinds([]); }
    })();
    return () => { gone = true; };
  }, [country, fromQuery]);

  // ── WHEN THE SHIP SAILS ────────────────────────────────────────
  // Oliver, 5 Oct 2026, "Sure" to the cruise ships and the time to be back
  // on board. From the ship, on a day a ship is in (data/klaipedaCruises.js),
  // only the walk lengths that end before it sails are offered; with more
  // than one ship in, the latest to sail decides, and every ship is named.
  const ships = from === "terminal" && country === "LT" ? inPortNow(new Date()) : [];
  const sailing = ships.length ? (() => {
    const last = Math.max(...ships.map(c => c.to));
    return { ships, fit: hoursBeforeSailing(NOW_HOURS, placeClock(new Date(), countryProfile(country).zone).minutes, last) };
  })() : null;
  const noTime = !!sailing && sailing.fit.length === 0;
  useEffect(() => {
    if (sailing && sailing.fit.length && !sailing.fit.includes(hours)) setHours(sailing.fit[sailing.fit.length - 1]);
  }, [from, sailing?.fit.join(",")]);

  if (!firstFrom) return null;
  const zone = countryProfile(country).zone;

  const make = async () => {
    const mine = `${fromQuery}|${style}`;
    asked.current = mine;
    setState({ busy: true, walk: null, error: "", madeAt: 0 });
    const ask = (slot) => fetch(`/api/plan-now?c=${country}&${fromQuery}&slot=${encodeURIComponent(slot)}${style ? `&style=${style}` : ""}`);
    try {
      let r = await ask(slotOf(new Date()));
      if (r.status === 409) { const j = await r.json().catch(() => ({})); if (j.slot) r = await ask(j.slot); }
      if (!r.ok) throw new Error(String(r.status));
      const got = await r.json();
      const walk = side === "1" && got.alt ? { ...got, ...got.alt } : got;
      if (asked.current !== mine) return;
      const nowMin = placeClock(new Date(), zone).minutes;
      setState({ busy: false, walk, error: "", madeAt: Math.ceil(nowMin / 5) * 5 });
    } catch {
      if (asked.current !== mine) return;
      setState({ busy: false, walk: null, error: uiT("now.error", lang), madeAt: 0 });
    }
  };

  const pill = (on) => ({
    background: on ? C.gold : "transparent", color: on ? C.onGold : C.light,
    border: `1px solid ${on ? C.gold : C.border}`, borderRadius: 100, padding: "7px 13px",
    fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif",
  });
  const { walk, madeAt } = state;

  return (
    <div data-testid="now-planner" style={{ background: C.surface, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: "16px 16px 18px", marginBottom: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", marginBottom: 12 }}>{uiT("now.title", lang)}</div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {Object.keys(starts).map(k => (
          <button key={k} onClick={() => setFrom(k)} aria-pressed={k === from} style={pill(k === from)}>
            {uiT(k === "terminal" ? "now.fromShip" : "now.fromCentre", lang)}
          </button>
        ))}
        {canLocate && (
          <button onClick={useHere} aria-pressed={from === HERE} style={pill(from === HERE)} data-testid="now-from-here">
            {uiT("now.fromHere", lang)}
          </button>
        )}
      </div>
      {posNote && <div data-testid="now-pos-note" style={{ fontSize: 12, color: "#FFB347", margin: "-4px 0 12px" }}>{posNote}</div>}

      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>{uiT("now.howLong", lang)}</div>
      {sailing && (
        <div data-testid="now-sailing" style={{ fontSize: 12.5, color: C.gold, fontWeight: 700, marginBottom: 8 }}>
          🚢 {sailing.ships.map(c => fill(uiT("now.sails", lang), { ship: c.ship, time: c.leaves })).join(" · ")}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {NOW_HOURS.map(h => {
          const off = !!sailing && !sailing.fit.includes(h);
          return (
            <button key={h} onClick={() => !off && setHours(h)} disabled={off} aria-pressed={h === hours} style={{ ...pill(h === hours && !off), opacity: off ? 0.35 : 1, cursor: off ? "default" : "pointer" }} data-testid={`now-hours-${h}`}>
              {fill(uiT("now.hours", lang), { n: h })}
            </button>
          );
        })}
      </div>

      {kinds.length > 0 && (
        <div data-testid="now-kinds" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {kinds.map(k => (
            <button key={k} onClick={() => setStyle(cur => (cur === k ? "" : k))} aria-pressed={style === k} style={pill(style === k)}
              data-testid={k === STROLL ? "now-old-town" : `now-style-${k}`}>
              {uiT(k === STROLL ? "now.oldTown" : `now.style.${k}`, lang)}
            </button>
          ))}
        </div>
      )}

      <button onClick={make} disabled={state.busy || noTime} data-testid="now-make"
        style={{ width: "100%", background: C.gold, color: C.onGold, border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 700, cursor: state.busy ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: state.busy ? 0.7 : 1 }}>
        {state.busy ? uiT("now.making", lang) : uiT("now.make", lang)}
      </button>

      {state.error && <div style={{ fontSize: 12.5, color: "#FFB347", marginTop: 12 }}>{state.error}</div>}

      {walk && <EditableWalk walk={walk} madeAt={madeAt} lang={lang} country={country} />}
    </div>
  );
};

export default NowPlanner;
