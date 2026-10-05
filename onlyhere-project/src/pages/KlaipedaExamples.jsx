// ── KLAIPĖDA, EXAMPLES FOR THE TOURISM CENTRE ───────────────────────
//
// Oliver, 2 Oct 2026: "Can you make a set of examples on the page that I can
// show for the tourism center?" and "Guides and Offers alike. Make up
// anything. Be clever. Have ideas that are realistic."
//
// What is real and what is made up, and why the walks are worked out by the
// live rules rather than written as text, is in data/klaipedaExamples.js.
// Same shell as KlaipedaDemo: one column, the theme's colours, Fraunces for
// names. Linked from nowhere and kept out of search, like that page.
import { useEffect, useMemo, useRef, useState } from "react";
import { C } from "../utils/theme";
import { KlaipedaTop, keepOutOfSearch } from "../components/KlaipedaTop";
import { EditableWalk } from "../components/NowPlanner";
import { DetailPage } from "../components/DetailPage";
import { MUST_SEE, weatherChanges } from "../utils/nowPlanner";
import { entryWord } from "../utils/entryWords";
import {
  EXAMPLE_WALKS, WEATHER_WALKS, KLAIPEDA_SKY, walkForNow, EXAMPLE_GUIDES, GUIDE_LANGS, GUIDE_LANG_NAMES, GUIDE_LABELS,
  runExample, isExamplePartner, pageFor,
} from "../data/klaipedaExamples";
import { KLAIPEDA_SCULPTURES_PATH } from "../data/klaipedaSculptures";
import { GoogleWalkMap } from "../components/GoogleWalkMap";

const WARN = "#FFB347";

const Tag = ({ children, strong = false }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", borderRadius: 100, padding: "2px 8px",
    color: strong ? C.gold : C.muted, background: strong ? `${C.gold}16` : "transparent", border: `1px solid ${strong ? `${C.gold}44` : C.border}`,
  }}>{children}</span>
);

const H2 = ({ children }) => (
  <h2 style={{ fontSize: 24, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.2, margin: "0 0 8px" }}>{children}</h2>
);
const Lead = ({ children }) => (
  <p style={{ fontSize: 13.5, lineHeight: 1.65, color: C.light, margin: "0 0 16px" }}>{children}</p>
);

export const KlaipedaExamples = () => {
  const [walkId, setWalkId] = useState(EXAMPLE_WALKS[0].id);
  const [lang, setLang] = useState("en");
  const ex = EXAMPLE_WALKS.find(w => w.id === walkId) || EXAMPLE_WALKS[0];
  const run = useMemo(() => runExample(ex), [ex]);
  // Which of the two ways round is shown. See reversedWalk in utils/nowPlanner.js.
  const [way, setWay] = useState("a");
  useEffect(() => { setWay("a"); }, [walkId]);
  const shownWalk = way === "b" && run.alt ? run.alt : run.walk;
  // ── THE SAME MORNING, IN THE WEATHER KLAIPĖDA HAS RIGHT NOW ────────
  // Oliver, 4 Oct 2026: "Make an example that changes depending on the
  // current weather. And make it, so the default one is how it is currently.
  // So we know that it does detect it." The forecast is read the way the walk
  // planner reads it (utils/walkWeather.js), and the morning is walked in it:
  // the order is the one written for the nearest kind of weather, and the
  // rules then do what they do to any walk.
  const [live, setLive] = useState({ state: "loading" });
  useEffect(() => {
    let gone = false;
    fetch(`/api/weather?lat=${KLAIPEDA_SKY.lat}&lon=${KLAIPEDA_SKY.lon}&mode=walk`)
      .then(r => (r.ok ? r.json() : null))
      .then(w => { if (!gone) setLive(w && w.known ? { state: "ok", w } : { state: "failed" }); })
      .catch(() => { if (!gone) setLive({ state: "failed" }); });
    return () => { gone = true; };
  }, []);
  const nowWalk = useMemo(() => (live.state === "ok" ? walkForNow(live.w) : null), [live]);
  // The same morning in other weather. See WEATHER_WALKS. "Right now" first.
  const [skyId, setSkyId] = useState("now");
  const sky = skyId === "now" ? nowWalk : (WEATHER_WALKS.find(w => w.id === skyId) || WEATHER_WALKS[0]);
  const skyRun = useMemo(() => (sky ? runExample(sky) : null), [sky]);
  // The page a listing opens, in the window. See EXAMPLE_PAGES.
  const [open, setOpen] = useState(null);
  const openPage = (id) => { const p = pageFor(id); if (p) setOpen({ id, ...p }); };
  // Show on map (5 Oct 2026): the stop the map glides to, and the walk as
  // the reader has changed it, so the map and the list agree.
  const [mapFocus, setMapFocus] = useState(null);
  const [mapWalk, setMapWalk] = useState(null);
  const mapBox = useRef(null);
  const cardOf = (st) => { const pg = pageFor(st.id); return pg ? { emoji: pg.item.emoji, photo: pg.item.photo } : null; };

  // Kept out of search (noindex), like every Klaipėda page.
  useEffect(() => keepOutOfSearch("Klaipėda for visitors · Gemlyx"), []);

  const pill = (active) => ({
    background: active ? C.gold : "transparent", color: active ? C.onGold : C.light,
    border: `1px solid ${active ? C.gold : C.border}`, borderRadius: 100, padding: "8px 14px",
    fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif",
  });
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 15px" };
  const L = GUIDE_LABELS[lang];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 16px 64px" }}>
        <KlaipedaTop side="visitors" />

        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 8 }}>For visitors</div>
        <h1 style={{ fontSize: 36, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.1, margin: "0 0 12px" }}>Klaipėda, in the time you have</h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: C.light, margin: "0 0 18px", fontFamily: "'Fraunces', serif" }}>
          A walk made for the hours you have, a guide in your own language, and the places worth stopping at on the way.
        </p>

        <div data-testid="examples-banner" style={{ border: `1px solid ${C.gold}88`, background: `${C.gold}12`, borderRadius: 14, padding: "12px 15px", marginBottom: 34 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 4 }}>These are examples</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: C.light }}>
            The museums, squares and sculptures are real, with hours as they are this autumn. Every business, every offer and every number about them is made up, to show how it would work. What a business sees is on the other side, For businesses.
          </div>
        </div>

        <a href={KLAIPEDA_SCULPTURES_PATH} data-testid="examples-sculptures-link"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "13px 15px", margin: "-18px 0 34px", textDecoration: "none" }}>
          <span>
            <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text }}>The talking sculptures</span>
            <span style={{ display: "block", fontSize: 12, color: C.muted, marginTop: 2 }}>Scan one, find the next, walk a trail of them</span>
          </span>
          <span style={{ color: C.gold, fontWeight: 700 }}>›</span>
        </a>

        {/* ── WALKS ───────────────────────────────────────────── */}
        <H2>A walk for the time they have</H2>
        <Lead>Scan the QR code at the terminal or the tourist centre and tap how long you have. Gemlyx makes one walk from what is open then, with the offers that are on then, and gets you back in time. Places rated Can't Miss Out go in whenever they are open, and the stops are put in the order that walks least, so you never double back.</Lead>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }} role="tablist" aria-label="Example walks">
          {EXAMPLE_WALKS.map(w => (
            <button key={w.id} role="tab" aria-selected={w.id === ex.id} onClick={() => setWalkId(w.id)} style={pill(w.id === ex.id)} data-testid={`example-walk-${w.id}`}>
              {w.chip}
            </button>
          ))}
        </div>

        <div style={{ ...card, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: "16px 16px 18px", marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>{ex.title}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{ex.moment}</div>
          {run.alt && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }} role="tablist" aria-label="Way round">
              {[["a", "This way round"], ["b", "The other way round"]].map(([k, label]) => (
                <button key={k} role="tab" aria-selected={way === k} onClick={() => setWay(k)} data-testid={`example-way-${k}`}
                  style={{ ...pill(way === k), padding: "5px 12px", fontSize: 11.5 }}>{label}</button>
              ))}
            </div>
          )}
          {/* Google's own map, turning once. Left out until its key is set. */}
          <div ref={mapBox}>
            <GoogleWalkMap walk={mapWalk || shownWalk} madeAt={run.startClock.minutes} cardFor={cardOf} focus={mapFocus} />
          </div>
          <EditableWalk walk={shownWalk} madeAt={run.startClock.minutes} lang="en" country="LT" tag={(s) => isExamplePartner(s.id) ? "Example" : null} onOpen={(s) => openPage(s.id)}
            cardFor={cardOf} onWalk={setMapWalk}
            onShow={(s) => { setMapFocus({ id: s.id, n: Date.now() }); try { mapBox.current?.scrollIntoView({ behavior: "smooth", block: "center" }); } catch { /* old browser */ } }} />
          {run.left.length > 0 && (
            <div data-testid="example-left" style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Left out of this walk</div>
              {run.left.map(l => (
                <div key={l.id} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5, lineHeight: 1.55, marginBottom: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 6, background: WARN, flexShrink: 0, transform: "translateY(-1px)" }} />
                  <span>
                    <button onClick={() => openPage(l.id)} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, color: C.text, cursor: "pointer", borderBottom: `1px dotted ${C.muted}` }}>{l.name}</button>
                    {l.mustSee && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: C.onGold, background: C.gold, borderRadius: 100, padding: "1px 7px", whiteSpace: "nowrap" }}>⭐ {entryWord(MUST_SEE, "en")}</span>}
                    {" "}<span style={{ color: WARN }}>{l.reason}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.6, color: C.muted, margin: "0 0 40px" }}>
          The AI picks the order. Every time, opening hour and offer on the card is then checked by fixed rules, so a closed door or a missed ship cannot get through.
        </div>

        {/* ── WEATHER ─────────────────────────────────────────── */}
        <H2>The same morning, in other weather</H2>
        <Lead>The forecast for the next three hours comes from the Norwegian Meteorological Institute. Gemlyx picks for it, and fixed rules then hold the walk to it.</Lead>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }} role="tablist" aria-label="Weather">
          {[{ id: "now", label: "Right now" }, ...WEATHER_WALKS].map(w => (
            <button key={w.id} role="tab" aria-selected={w.id === skyId} onClick={() => setSkyId(w.id)} style={pill(w.id === skyId)} data-testid={`example-sky-${w.id}`}>
              {w.label}
            </button>
          ))}
        </div>

        <div data-testid="example-weather" style={{ ...card, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: "16px 16px 18px", marginBottom: 40 }}>
          {!sky ? (
            <div data-testid="example-sky-now-state" style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
              {live.state === "loading" ? "Reading the forecast for Klaipėda…" : "The forecast for Klaipėda could not be read just now, so there is no walk for right now. The other weathers still show how it changes."}
            </div>
          ) : (<>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>{sky.title}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sky.moment}</div>
          {weatherChanges(sky.weather).length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {weatherChanges(sky.weather).map(t => <Tag key={t} strong>{t}</Tag>)}
            </div>
          )}
          <EditableWalk walk={skyRun.walk} madeAt={skyRun.startClock.minutes} lang="en" country="LT" tag={(s) => isExamplePartner(s.id) ? "Example" : null} onOpen={(s) => openPage(s.id)} />
          {skyRun.left.length > 0 && (
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Left out of this walk</div>
              {skyRun.left.map(l => (
                <div key={l.id} style={{ fontSize: 12.5, lineHeight: 1.55, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: C.text }}>{l.name}</span> <span style={{ color: WARN }}>{l.reason}</span>
                </div>
              ))}
            </div>
          )}
          </>)}
        </div>

        {/* ── GUIDES ──────────────────────────────────────────── */}
        <H2>Guides in the visitor's language</H2>
        <Lead>Each place is written once and read in English, Lithuanian, German or Danish. Names, prices and times are never translated, and a translation that changes a number is thrown out.</Lead>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }} role="tablist" aria-label="Language">
          {GUIDE_LANGS.map(l => (
            <button key={l} role="tab" aria-selected={l === lang} onClick={() => setLang(l)} style={pill(l === lang)} data-testid={`example-lang-${l}`}>
              {GUIDE_LANG_NAMES[l]}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 12, marginBottom: 40 }}>
          {EXAMPLE_GUIDES.map(g => (
            <div key={g.id} data-testid="example-guide" role="button" tabIndex={0} onClick={() => openPage(g.page)} onKeyDown={(e) => { if (e.key === "Enter") openPage(g.page); }} style={{ ...card, padding: "15px 16px", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 18, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold, lineHeight: 1.25 }}>{g.name}</span>
                {g.partner && <Tag>{L.example}</Tag>}
              </div>
              <div style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1.1, marginTop: 5 }}>{typeof g.meta === "object" ? g.meta[lang] : g.meta}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.65, color: C.light, marginTop: 10 }}>{g.about[lang]}</div>
              {g.offer && (
                <div style={{ display: "inline-block", marginTop: 10, fontSize: 12, fontWeight: 700, borderRadius: 100, padding: "4px 11px", background: C.gold, color: C.onGold }}>
                  ● {L.offer}: {g.offer[lang]}
                </div>
              )}
              <div style={{ borderLeft: `2px solid ${C.gold}`, padding: "1px 0 1px 12px", marginTop: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: C.gold, marginBottom: 3 }}>{L.find}</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: C.text }}>{g.find[lang]}</div>
              </div>
              {g.tip && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: C.muted, marginBottom: 3 }}>{L.tip}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: C.light }}>{g.tip[lang]}</div>
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginTop: 12 }}>{L.open} ›</div>
            </div>
          ))}
        </div>

        {open && (
          <DetailPage windowed item={open.item} kind={open.kind} onClose={() => setOpen(null)} lang={lang} paid
            sample={isExamplePartner(open.id) ? L.madeUp : L.page} />
        )}

        <div style={{ fontSize: 11.5, lineHeight: 1.7, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          Museum hours and prices were checked on 29 September 2026 against each museum's own website. Coordinates are from OpenStreetMap. The businesses and offers on this page are examples.
        </div>
      </div>
    </div>
  );
};

export default KlaipedaExamples;
