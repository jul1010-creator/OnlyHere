// ── 🎲 RANDOM QR WALK, A TEST FOR THE STUDIO ────────────────────────
//
// Oliver, 7 Oct 2026, of the Random guide button on the Lithuanian page:
// "it's highly unlike people will use such a guide. Make it for QR codes."
// So on another country's page the Studio's test button makes a QR walk
// instead of a multi-day guide: a random start (the ship, the tourist centre,
// or a random corner of town as "From where I am"), a random length, a random
// day and half hour in the coming week, and random weather. The walk is made
// by the same rules the live walk route uses when the AI is not asked
// (api/plan-now.js), from the same published rows, with the examples filling
// in while there are few (data/klaipedaExampleRows.js).
//
// What it is for is the one thing he asked to be sure of the night before:
// "saving time is incredibly important". Under the walk, a test card says
// how far it walks against the shortest order of the same places, whether it
// works the other way round, how many minutes are spare, and anything that
// looks wrong: a ride inside town, a walk of one place, a closed door.
//
// Founder only. Nothing here reaches a visitor, and it asks no AI.
import { useMemo, useRef, useState } from "react";
import { C } from "../utils/theme";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from "../utils/supabasePublic";
import { withExampleRows, isExamplePartner } from "../data/klaipedaExampleRows";
import {
  NOW_STARTS, NOW_HOURS, NOW_AREAS, SHIP_MARGIN, hereStart, nowCandidates, ruleOrder, withMustSee, tidyWalk,
  reversedWalk, placesOf, slotOf, slotDate, MUST_SEE, scheduleWalk,
} from "../utils/nowPlanner";
import { kmApart, ferryWait } from "../utils/walkable";
import { placeClock } from "../utils/offerClock";
import { countryProfile } from "../utils/countries";
import { EditableWalk, placeLook } from "./NowPlanner";
import { GoogleWalkMap } from "./GoogleWalkMap";

// Klaipėda's autumn, roughly: mostly dry, often wet, now and then a gale.
export const TEST_SKIES = [
  { id: "dry", label: "dry", weight: 55, weather: { wet: false, snow: false, wind: 5, temp: 11 } },
  { id: "rain", label: "rain", weight: 28, weather: { wet: true, snow: false, wind: 7, temp: 9 } },
  { id: "storm", label: "storm wind", weight: 12, weather: { wet: true, snow: false, wind: 16, temp: 8 } },
  { id: "snow", label: "snow", weight: 5, weather: { wet: true, snow: true, wind: 6, temp: -1 } },
];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HHMM = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(((m % 60) + 60) % 60).padStart(2, "0")}`;

// A random moment: a day in the coming week and a half hour from 09:00 to
// 19:00 at the place, as the slot the live route would be asked for.
export const randomMoment = (zone, rand = Math.random, now = new Date()) => {
  const base = slotDate(slotOf(now));
  const clock = placeClock(base, zone);
  const day = 1 + Math.floor(rand() * 7);
  const want = 9 * 60 + 30 * Math.floor(rand() * 21);
  return new Date(base.getTime() + (day * 1440 + want - clock.minutes) * 60000);
};

export const randomStart = (country, rand = Math.random) => {
  const starts = NOW_STARTS[country] || {};
  const r = rand();
  if (r < 0.45 && starts.terminal) return starts.terminal;
  if (r < 0.75 && starts.centre) return starts.centre;
  // From where I am: a random corner within a kilometre of the middle of town.
  const area = NOW_AREAS[country];
  if (!area) return Object.values(starts)[0];
  const d = Math.sqrt(rand()) * 1, a = rand() * Math.PI * 2;
  const lat = area.lat + (d * Math.cos(a)) / 111.32, lon = area.lon + (d * Math.sin(a)) / (111.32 * Math.cos(area.lat * Math.PI / 180));
  return hereStart(country, lat, lon) || Object.values(starts)[0];
};

const pickSky = (rand) => {
  let r = rand() * TEST_SKIES.reduce((n, s) => n + s.weight, 0);
  for (const s of TEST_SKIES) { if ((r -= s.weight) < 0) return s; }
  return TEST_SKIES[0];
};

const loopKm = (start, pts) => {
  let km = 0, here = start;
  for (const p of pts) { km += kmApart(here, p); here = p; }
  return km + kmApart(here, start);
};
// The shortest order of the walk's own places for the test card, among the
// orders that keep every place open while it is visited (`fits`). Up to
// eight places, every order; past that it is not worked out. A walk that
// closes a museum by going the short way round is not a shorter walk.
export const shortestKm = (start, pts, fits = () => true) => {
  if (pts.length > 8) return null;
  let best = Infinity;
  const go = (done, left) => {
    if (!left.length) { const km = loopKm(start, done); if (km < best && fits(done)) best = km; return; }
    left.forEach((p, i) => go([...done, p], [...left.slice(0, i), ...left.slice(i + 1)]));
  };
  go([], pts);
  return Number.isFinite(best) ? best : null;
};

// The walk and its test card, from the rows, made the way the live route makes
// it without the AI.
export const testWalk = (rows, { country = "LT", start, at, hours, sky }) => {
  const zone = countryProfile(country).zone;
  const filled = withExampleRows(rows, country);
  const candidates = nowCandidates(filled.rows, { country, zone, now: at });
  const startClock = placeClock(at, zone);
  const month = (() => { try { return Number(new Intl.DateTimeFormat("en", { timeZone: zone, month: "numeric" }).format(at)); } catch { return 0; } })();
  const ctx = { country, start, startClock, budget: hours * 60, margin: start.ship ? SHIP_MARGIN : 0, wet: sky.weather.wet, temp: sky.weather.temp, weather: sky.weather, style: "", lang: "en", ferryWait: ferryWait(country, month) };
  const walk = tidyWalk(withMustSee(ruleOrder(candidates, ctx), candidates, ctx), candidates, ctx);
  const alt = reversedWalk(walk, candidates, ctx);
  const byId = new Map(candidates.map(c => [c.id, c]));
  const pts = walk.stops.map(s => byId.get(s.id));
  const km = loopKm(start, pts);
  const stays = new Map(walk.stops.map(s => [s.id, s.stay]));
  const best = shortestKm(start, pts, (order) => scheduleWalk(order.map(p => ({ id: p.id, stay: stays.get(p.id) })), candidates, ctx).stops.length === pts.length);
  const centre = NOW_AREAS[country] || start;
  const flags = [];
  if (walk.stops.length < (hours <= 2 ? 1 : 2)) flags.push(`only ${walk.stops.length} place${walk.stops.length === 1 ? "" : "s"} in ${hours} hours`);
  walk.stops.forEach(s => { if (s.ride && kmApart(byId.get(s.id), centre) < 1.5) flags.push(`a ride to ${s.name}, inside town`); });
  if (walk.back.ride && kmApart(pts[pts.length - 1] || start, centre) < 1.5) flags.push("a ride back, inside town");
  if (best && km > best * 1.1) flags.push(`walks ${Math.round((km / best - 1) * 100)}% more than the shortest order`);
  const mustOpen = candidates.filter(c => c.tier === MUST_SEE).length;
  // As the walk itself says it: minutes left of the time they have.
  const spare = ctx.budget - walk.back.at;
  return {
    walk: { ...walk, start: { id: start.id, name: start.name, lat: start.lat, lon: start.lon, ship: !!start.ship }, weather: sky.weather, margin: ctx.margin, places: placesOf(walk, candidates), clock: startClock, budget: ctx.budget, alt: alt ? { stops: alt.stops, back: alt.back, deadline: alt.deadline } : null },
    card: {
      when: `${DAY_NAMES[startClock.day]} ${HHMM(startClock.minutes)}`,
      from: start.ship ? "from the ship" : start.id === "centre" ? "from the tourist centre" : `from a corner of town (${start.lat.toFixed(3)}, ${start.lon.toFixed(3)})`,
      hours, sky: sky.label,
      places: walk.stops.length,
      // A published row's id ends in its number; an example's in a word.
      published: walk.stops.filter(s => /:\d+$/.test(s.id)).length,
      examples: walk.stops.filter(s => isExamplePartner(s.id)).length,
      candidates: candidates.length, mustOpen,
      km, best, bothWays: !!alt, spare, flags,
      madeAt: startClock.minutes,
    },
  };
};

export const RandomWalkTest = ({ country = "LT", lang = "en" }) => {
  const [run, setRun] = useState(null);
  const [state, setState] = useState("idle");
  const rowsRef = useRef(null);
  const zone = useMemo(() => countryProfile(country).zone, [country]);

  const go = async () => {
    setState("busy");
    try {
      // The rows the walk route reads, read the way it reads them. Kept for
      // the next click, so a run of tests reads them once.
      if (!rowsRef.current) {
        const r = await fetch(
          `${PUBLIC_SUPABASE_URL}/rest/v1/gemlyx_content?select=id,type,payload&published=eq.true&type=in.(free,food,booking,festival,nightlife)&payload->>country=eq.${encodeURIComponent(country)}`,
          { headers: { apikey: PUBLIC_SUPABASE_KEY, Authorization: `Bearer ${PUBLIC_SUPABASE_KEY}` } },
        );
        if (!r.ok) throw new Error(`content ${r.status}`);
        rowsRef.current = await r.json();
      }
      const start = randomStart(country);
      const at = randomMoment(zone);
      const hours = NOW_HOURS[Math.floor(Math.random() * NOW_HOURS.length)];
      const sky = pickSky(Math.random);
      setRun({ ...testWalk(rowsRef.current, { country, start, at, hours, sky }), n: Date.now() });
      setState("idle");
    } catch {
      setState("failed");
    }
  };

  const c = run?.card;
  const line = { fontSize: 12, color: C.light, lineHeight: 1.6 };
  return (
    <div data-testid="random-walk-test" style={{ marginBottom: 12 }}>
      <button onClick={go} disabled={state === "busy"} data-testid="random-walk-go"
        style={{ width: "100%", background: "none", border: `1px dashed ${C.gold}66`, color: C.gold, borderRadius: 10, padding: "9px 14px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
        {state === "busy" ? "Making a walk…" : run ? "🎲 Another random QR walk" : "🎲 Random QR walk (test the walks)"}
      </button>
      {state === "failed" && <div style={{ ...line, color: "#FFB347", marginTop: 8 }}>Could not read the published places just now. Try again in a moment.</div>}
      {run && (
        <div style={{ marginTop: 10 }}>
          <div data-testid="random-walk-card" style={{ background: C.surface, border: `1px solid ${c.flags.length ? "#FFB347" : C.border}`, borderRadius: 12, padding: "11px 13px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", marginBottom: 5 }}>Walk test · made by the rules, no AI</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>{c.when}, {c.from}, {c.hours} h, {c.sky}</div>
            <div style={line}>
              {c.places} places: {c.published} published, {c.places - c.published} from the examples ({c.examples} made-up partner{c.examples === 1 ? "" : "s"}), out of {c.candidates} that could go in
            </div>
            <div style={line}>
              Walks {c.km.toFixed(2)} km{c.best != null ? ` · the shortest order of the same places that keeps every door open ${c.best.toFixed(2)} km` : ""}
              {" · "}{c.bothWays ? "works the other way round too" : "no other way round"}
              {" · "}{c.spare} min spare
            </div>
            {c.flags.length > 0
              ? <div data-testid="random-walk-flags" style={{ ...line, color: "#FFB347", fontWeight: 700, marginTop: 4 }}>⚠ {c.flags.join(" · ")}</div>
              : <div style={{ ...line, color: C.gold, fontWeight: 700, marginTop: 4 }}>✓ Nothing looks wrong</div>}
          </div>
          <GoogleWalkMap key={`map${run.n}`} walk={run.walk} madeAt={c.madeAt} cardFor={(s) => placeLook(run.walk, s)} lang={lang} />
          <EditableWalk key={`walk${run.n}`} walk={run.walk} madeAt={c.madeAt} lang={lang} country={country} cardFor={(s) => placeLook(run.walk, s)}
            tag={(s) => (isExamplePartner(s.id) ? "Example" : null)} />
        </div>
      )}
    </div>
  );
};

export default RandomWalkTest;
