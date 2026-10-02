// ── "I HAVE X HOURS", ON THE PAGE ───────────────────────────────────
//
// The walk made for this moment (Oliver, 2 Oct 2026). How it is made is in
// utils/nowPlanner.js and api/plan-now.js; this only asks and draws.
//
// Times on the page run from the reader's own "now" at the place, rounded up
// to five minutes, since the walk itself was checked for the whole half hour
// it is served in.
import { useEffect, useRef, useState } from "react";
import { C } from "../utils/theme";
import { t as uiT, resolveUiLanguage, UI_LANGUAGE_KEY } from "../utils/uiLanguage";
import { countryProfile } from "../utils/countries";
import { placeClock } from "../utils/offerClock";
import { NOW_HOURS, NOW_STARTS, slotOf, walkMapsUrl, rideApp } from "../utils/nowPlanner";

const fill = (s, vars) => Object.entries(vars).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v)), s);
const clock = (m, lang) => {
  const mm = ((Math.round(m) % 1440) + 1440) % 1440;
  const s = `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
  return lang === "da" ? s.replace(":", ".") : s;
};

const readerLang = () => {
  let stored = null;
  try { stored = window.localStorage.getItem(UI_LANGUAGE_KEY); } catch { stored = null; }
  return resolveUiLanguage(stored, typeof navigator !== "undefined" ? navigator.language : "");
};

export const NowPlanner = ({ country = "LT", lang: langProp = "", defaultFrom = "" }) => {
  const lang = langProp || readerLang();
  const starts = NOW_STARTS[country] || {};
  const firstFrom = starts[defaultFrom] ? defaultFrom : Object.keys(starts)[0];
  const [from, setFrom] = useState(firstFrom);
  const [hours, setHours] = useState(3);
  const [state, setState] = useState({ busy: false, walk: null, error: "", madeAt: 0 });
  // Which choice the newest request was for. An answer for an older choice,
  // arriving after the reader tapped another button, is dropped.
  const asked = useRef("");

  // A new choice clears the old walk, so a 2 hour walk is never shown under
  // a 4 hour button.
  useEffect(() => { asked.current = ""; setState({ busy: false, walk: null, error: "", madeAt: 0 }); }, [from, hours]);

  if (!firstFrom) return null;
  const zone = countryProfile(country).zone;

  const make = async () => {
    const mine = `${from}|${hours}`;
    asked.current = mine;
    setState({ busy: true, walk: null, error: "", madeAt: 0 });
    const ask = (slot) => fetch(`/api/plan-now?c=${country}&from=${from}&h=${hours}&lang=${lang}&slot=${encodeURIComponent(slot)}`);
    try {
      let r = await ask(slotOf(new Date()));
      if (r.status === 409) { const j = await r.json().catch(() => ({})); if (j.slot) r = await ask(j.slot); }
      if (!r.ok) throw new Error(String(r.status));
      const walk = await r.json();
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
  const app = rideApp(country);

  return (
    <div data-testid="now-planner" style={{ background: C.surface, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: "16px 16px 18px", marginBottom: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", marginBottom: 12 }}>{uiT("now.title", lang)}</div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {Object.keys(starts).map(k => (
          <button key={k} onClick={() => setFrom(k)} aria-pressed={k === from} style={pill(k === from)}>
            {uiT(k === "terminal" ? "now.fromShip" : "now.fromCentre", lang)}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>{uiT("now.howLong", lang)}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {NOW_HOURS.map(h => (
          <button key={h} onClick={() => setHours(h)} aria-pressed={h === hours} style={pill(h === hours)} data-testid={`now-hours-${h}`}>
            {fill(uiT("now.hours", lang), { n: h })}
          </button>
        ))}
      </div>

      <button onClick={make} disabled={state.busy} data-testid="now-make"
        style={{ width: "100%", background: C.gold, color: C.onGold, border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 700, cursor: state.busy ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: state.busy ? 0.7 : 1 }}>
        {state.busy ? uiT("now.making", lang) : uiT("now.make", lang)}
      </button>

      {state.error && <div style={{ fontSize: 12.5, color: "#FFB347", marginTop: 12 }}>{state.error}</div>}

      {walk && (
        <div data-testid="now-walk" style={{ marginTop: 16 }}>
          {walk.weather?.wet && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{uiT("now.wet", lang)}</div>}
          {walk.stops.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted }}>{uiT("now.empty", lang)}</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                {clock(madeAt, lang)} · {uiT("now.start", lang)}: {walk.start.name}
              </div>
              {walk.stops.map(s => (
                <div key={s.id}>
                  <div style={{ fontSize: 11.5, color: C.muted, padding: "6px 0 6px 12px", borderLeft: `1px solid ${C.gold}55`, marginLeft: 4 }}>
                    {s.ride && app
                      ? <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none", fontWeight: 700 }}>{fill(uiT("now.ride", lang), { app: app.name, n: s.leg })} ↗</a>
                      : fill(uiT("now.walk", lang), { n: s.leg })}
                  </div>
                  <div data-testid="now-stop" style={{ display: "flex", gap: 12, padding: "8px 0" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, minWidth: 44 }}>{clock(madeAt + s.arrive, lang)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{fill(uiT("now.stay", lang), { n: s.stay })}</div>
                      {s.deal && (
                        <div style={{ display: "inline-block", marginTop: 6, fontSize: 11.5, fontWeight: 700, borderRadius: 100, padding: "3px 10px", background: C.gold, color: C.onGold }}>
                          ● {uiT("now.partner", lang)}: {s.deal.text}{s.deal.to ? ` · ${fill(uiT("offer.onNowUntil", lang), { time: clock(Number(s.deal.to.slice(0, 2)) * 60 + Number(s.deal.to.slice(3)), lang) })}` : ""}
                        </div>
                      )}
                      {s.why && <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.5, marginTop: 6 }}>{s.why}</div>}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: C.muted, padding: "6px 0 6px 12px", borderLeft: `1px solid ${C.gold}55`, marginLeft: 4 }}>
                {walk.back.ride && app
                  ? <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none", fontWeight: 700 }}>{fill(uiT("now.ride", lang), { app: app.name, n: walk.back.leg })} ↗</a>
                  : fill(uiT("now.walk", lang), { n: walk.back.leg })}
              </div>
              <div data-testid="now-back" style={{ fontSize: 13, fontWeight: 700, color: C.text, padding: "8px 0 4px" }}>
                {walk.start.ship
                  ? fill(uiT("now.backShip", lang), { time: clock(madeAt + walk.back.at, lang), n: Math.max(walk.margin, walk.deadline + walk.margin - walk.back.at) })
                  : fill(uiT("now.backCentre", lang), { time: clock(madeAt + walk.back.at, lang) })}
              </div>
              <a href={walkMapsUrl(walk.start, walk.stops)} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", marginTop: 12, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 700, color: C.light, textDecoration: "none" }}>
                {uiT("now.route", lang)} ↗
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NowPlanner;
