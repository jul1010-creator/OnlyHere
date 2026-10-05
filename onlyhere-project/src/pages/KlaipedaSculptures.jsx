// ── KLAIPĖDA'S TALKING SCULPTURES, A WORKING SKETCH ─────────────────
//
// Oliver, 3 Oct 2026: "try build some ideas and examples for how the
// sculpture structure could function". What it adds and why is in
// data/klaipedaSculptures.js; this page draws it. Same shell as the examples
// page, linked from it, kept out of search.
import { useEffect, useMemo, useState } from "react";
import { C } from "../utils/theme";
import { KlaipedaTop, keepOutOfSearch } from "../components/KlaipedaTop";
import {
  SCULPTURES, STORY_LANGS, EXAMPLE_WEEK, FERRY, KLAIPEDA_SCULPTURES_PATH, progressLine, nextFrom, trailFrom, ferryFrom, walkLink, trailWalk,
} from "../data/klaipedaSculptures";
import { GoogleWalkMap } from "../components/GoogleWalkMap";
import { WalkMode, askForCompass } from "../components/WalkMode";
import { KLAIPEDA_BUSINESS_PATH } from "../data/klaipedaExamples";

const Tag = ({ children, strong = false, dashed = false }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", borderRadius: 100, padding: "2px 8px", whiteSpace: "nowrap",
    color: strong ? C.gold : C.muted, background: strong ? `${C.gold}16` : "transparent",
    border: `1px ${dashed ? "dashed" : "solid"} ${strong ? `${C.gold}44` : C.border}`,
  }}>{children}</span>
);
const H2 = ({ children }) => (
  <h2 style={{ fontSize: 24, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.2, margin: "0 0 8px" }}>{children}</h2>
);
const Lead = ({ children }) => (
  <p style={{ fontSize: 13.5, lineHeight: 1.65, color: C.light, margin: "0 0 16px" }}>{children}</p>
);

const TRAIL_MINUTES = [30, 60, 90];

export const KlaipedaSculptures = () => {
  const [scanned, setScanned] = useState("kiss");
  const [found, setFound] = useState(["kiss"]);
  const [minutes, setMinutes] = useState(30);
  const here = SCULPTURES.find(s => s.id === scanned) || SCULPTURES[0];
  const next = useMemo(() => nextFrom(scanned, found), [scanned, found]);
  const trail = useMemo(() => trailFrom(scanned, minutes, found), [scanned, minutes, found]);
  const ferry = ferryFrom(scanned);
  // The trail as a route on the map, walked with the phone's GPS (5 Oct 2026).
  const route = useMemo(() => trailWalk(trail), [trail]);
  const [walking, setWalking] = useState(false);
  const across = SCULPTURES.filter(s => s.side !== here.side);

  useEffect(() => keepOutOfSearch("Talking sculptures · Gemlyx"), []);

  const scan = (id) => { setScanned(id); setFound(f => (f.includes(id) ? f : [...f, id])); };

  const pill = (active) => ({
    background: active ? C.gold : "transparent", color: active ? C.onGold : C.light,
    border: `1px solid ${active ? C.gold : C.border}`, borderRadius: 100, padding: "7px 12px",
    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif",
  });
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 15px" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 16px 64px" }}>
        <KlaipedaTop side="visitors" />

        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 8 }}>For visitors</div>
        <h1 style={{ fontSize: 34, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.1, margin: "0 0 12px" }}>The talking sculptures</h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: C.light, margin: "0 0 18px", fontFamily: "'Fraunces', serif" }}>
          Thirteen sculptures around Klaipėda tell their stories when you scan the sign. After the story: the next one, how many are left, and a trail that fits the time you have.
        </p>

        <div data-testid="sculptures-banner" style={{ border: `1px solid ${C.gold}88`, background: `${C.gold}12`, borderRadius: 14, padding: "12px 15px", marginBottom: 34 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 4 }}>A working sketch</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: C.light }}>
            The sculptures and where they stand are real. Their stories are the tourism centre's own recordings, which this page does not play.
          </div>
        </div>

        {/* ── WHAT A VISITOR SEES ─────────────────────────────── */}
        <H2>After you scan</H2>
        <Lead>Pick the sign you are standing at. The page counts each one you scan, the way your phone would.</Lead>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }} role="tablist" aria-label="Sculptures">
          {SCULPTURES.map(s => (
            <button key={s.id} role="tab" aria-selected={s.id === scanned} onClick={() => scan(s.id)} data-testid={`scan-${s.id}`}
              style={{ ...pill(s.id === scanned), opacity: found.includes(s.id) || s.id === scanned ? 1 : 0.75 }}>
              {found.includes(s.id) ? "✓ " : ""}{s.name}
            </button>
          ))}
        </div>

        <div data-testid="sculpture-page" style={{ ...card, border: `1px solid ${C.gold}55`, borderRadius: 18, padding: "18px 16px", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
            <Tag strong>Talking sculpture</Tag>
            <span style={{ fontSize: 11.5, color: C.muted }}>{here.where}</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, fontFamily: "'Fraunces', serif", lineHeight: 1.15 }}>{here.name}</div>
          {here.lt !== here.name && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{here.lt}</div>}

          <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginTop: 14 }}>
            <span aria-hidden style={{ width: 38, height: 38, borderRadius: 38, background: C.gold, color: C.onGold, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>▶</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>The centre's recording</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                {STORY_LANGS.today.map(l => <Tag key={l}>{l}</Tag>)}
                {STORY_LANGS.next.map(l => <Tag key={l} dashed>+ {l}</Tag>)}
              </div>
            </div>
          </div>
          {here.line && <div style={{ fontSize: 13.5, lineHeight: 1.65, color: C.light, marginTop: 12 }}>{here.line}</div>}

          <div data-testid="sculpture-progress" style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginTop: 16 }}>{progressLine(found.length)}</div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }} aria-hidden>
            {SCULPTURES.map(s => <span key={s.id} style={{ flex: 1, height: 5, borderRadius: 5, background: found.includes(s.id) ? C.gold : C.border }} />)}
          </div>

          {next ? (
            <div data-testid="sculpture-next" style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>Next</div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>{next.name}</span>
                <a href={walkLink(here, next)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: C.gold, textDecoration: "none" }}>{next.minutes} min on foot ↗</a>
              </div>
            </div>
          ) : (
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 14, fontSize: 13, color: C.light }}>Every sculpture on this side of the water is found.</div>
          )}

          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: C.muted, marginTop: 12 }}>
            {ferry
              ? `${across.length} more across the water in Smiltynė, with the Sea Museum: ${ferry.walk} min on foot to the old ferry, then ${ferry.crossing} minutes over. Check today's departures on keltas.lt.`
              : `${across.length} more on the mainland, ${FERRY.crossing} minutes back by the old ferry.`}
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>A trail from here</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {TRAIL_MINUTES.map(m => (
                <button key={m} onClick={() => setMinutes(m)} aria-pressed={m === minutes} style={{ ...pill(m === minutes), padding: "5px 11px" }} data-testid={`trail-${m}`}>{m} min</button>
              ))}
            </div>
            <div data-testid="sculpture-trail">
              {trail.stops.map((s, i) => (
                <div key={s.id} style={{ display: "flex", gap: 12, padding: "5px 0", fontSize: 13 }}>
                  <span style={{ color: C.gold, fontWeight: 700, minWidth: 54 }}>{i === 0 ? "Here" : `+${s.arrive} min`}</span>
                  <span style={{ color: i === 0 ? C.muted : C.text }}>{s.name}</span>
                </div>
              ))}
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{trail.stops.length} sculptures in about {trail.used} minutes, a few minutes at each.</div>
            </div>
            {route && (
              <>
                <GoogleWalkMap walk={route} loop={false} height={280} cardFor={() => ({ emoji: "🗿" })} />
                <button onClick={() => { askForCompass(); setWalking(true); }} data-testid="trail-start-walk"
                  style={{ display: "block", width: "100%", marginTop: 10, background: C.gold, color: C.onGold, border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                  ▶ Walk this trail
                </button>
                {walking && <WalkMode walk={route} madeAt={null} lang="en" loop={false} cardFor={() => ({ emoji: "🗿" })} onClose={() => setWalking(false)} />}
              </>
            )}
          </div>
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.6, color: C.muted, margin: "0 0 40px" }}>
          The next sculpture and the trail come from where the sculptures stand, so they work the moment you scan.
        </div>

        <div style={{ fontSize: 11.5, lineHeight: 1.7, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          Sculpture positions from OpenStreetMap, read on 3 October 2026. The list of talking sculptures and their languages from the tourism centre and Lithuania Travel. Walking times are estimates.
        </div>
      </div>
    </div>
  );
};


// ── WHAT THE TOURISM CENTRE WOULD SEE ───────────────────────────────
// Its own page since 5 Oct 2026, so a visitor scanning a sign never lands on
// the centre's numbers, and the centre's pitch is not a visitor's page.
export const KlaipedaSculpturesCentre = () => {
  useEffect(() => keepOutOfSearch("Talking sculptures for the centre · Gemlyx"), []);
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 15px" };
  const top = Math.max(...Object.values(EXAMPLE_WEEK.scans));
  const ranked = SCULPTURES.map(s => ({ s, n: EXAMPLE_WEEK.scans[s.id] || 0 })).sort((a, b) => b.n - a.n);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 16px 64px" }}>
        <KlaipedaTop side="business" />

        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 8 }}>For the tourism centre</div>
        <h1 style={{ fontSize: 34, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.1, margin: "0 0 12px" }}>The talking sculptures, joined up</h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: C.light, margin: "0 0 18px", fontFamily: "'Fraunces', serif" }}>
          The signs already tell the stories. This adds what comes after the story, and shows the centre which sculptures are found, when, and in what language.
        </p>
        <a href={KLAIPEDA_SCULPTURES_PATH} data-testid="centre-visitor-link"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, ...card, textDecoration: "none", marginBottom: 34 }}>
          <span>
            <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text }}>What a visitor sees</span>
            <span style={{ display: "block", fontSize: 12, color: C.muted, marginTop: 2 }}>The page after a scan, with the next sculpture and a trail</span>
          </span>
          <span style={{ color: C.gold, fontWeight: 700 }}>›</span>
        </a>

        {/* ── WHAT THE CENTRE SEES ────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <H2>What the centre would see</H2>
          <Tag strong>Made-up numbers</Tag>
        </div>
        <Lead>Every scan that opens a page is counted, with no names and no accounts: which sculpture, when, and in what language the phone is set to.</Lead>

        <div data-testid="sculpture-week" style={{ ...card, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>Scans this week</div>
          {ranked.map(({ s, n }) => (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 150px) 1fr 40px", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: C.light, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
              <span style={{ height: 8, borderRadius: 8, background: C.border, overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${Math.round((n / top) * 100)}%`, background: s.side === "smiltyne" ? `${C.gold}88` : C.gold, borderRadius: 8 }} />
              </span>
              <span style={{ fontSize: 11.5, color: C.muted, textAlign: "right" }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold }}>{EXAMPLE_WEEK.finished}</div>
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>found all 13</div>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold, lineHeight: 1.3 }}>{EXAMPLE_WEEK.busiest}</div>
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>busiest hour</div>
          </div>
        </div>
        <div style={{ ...card, marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>Phone language of the people scanning</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {EXAMPLE_WEEK.langs.map(([l, p]) => <Tag key={l} strong={STORY_LANGS.today.includes(l)} dashed={!STORY_LANGS.today.includes(l)}>{l} {p}%</Tag>)}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.55 }}>The dashed ones hear the story in a language that is not theirs today.</div>
        </div>

        {/* ── HOW IT WOULD WORK ───────────────────────────────── */}
        <H2>How it would work</H2>
        <ol style={{ margin: "0 0 40px", paddingLeft: 20, display: "grid", gap: 10, fontSize: 13.5, lineHeight: 1.6, color: C.light }}>
          <li>The signs stay as they are. Each QR code points at a page for that sculpture, or the centre's current address forwards there.</li>
          <li>The page plays the centre's own recording, in the phone's language when there is one.</li>
          <li>Under the story: how many the visitor has found, and the nearest one still to find.</li>
          <li>"A trail from here" lists the sculptures that fit the minutes the visitor has, from where they stand.</li>
          <li>The centre sees scans by sculpture, hour and language. Nothing about who scanned.</li>
        </ol>

        {/* ── IDEAS ───────────────────────────────────────────── */}
        <H2>Ideas worth trying</H2>
        <div style={{ display: "grid", gap: 10, marginBottom: 40 }}>
          {[
            ["Find all 13", "Show the finished page at the tourist centre for a postcard. Cheap, and it brings people through the centre's door."],
            ["Trails by theme", "Legends: the Black Ghost, Neringa, Ännchen, the Mermaid. The sea: the Fisherman, the Albatross, the fishing vessels. People: Vydūnas, Mažvydas, Klaipėdietis."],
            ["Off the ship", "A Kiss stands by the cruise terminal, so a passenger's first scan can start a trail that is back at the ship in time."],
            ["A family voice", "The same stories told for children, chosen on the same page."],
            ["A stop on the way", "A café near the middle of a trail shows its offer, marked as a partner."],
            ["Weak signal", "The page and the recording load once and are kept, so the next sculpture plays without data."],
          ].map(([t, d]) => (
            <div key={t} style={card}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: C.light }}>{d}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11.5, lineHeight: 1.7, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          The numbers on this page are made up, to show how it would work. Sculpture positions from OpenStreetMap, read on 3 October 2026. The list of talking sculptures and their languages from the tourism centre and Lithuania Travel. <a href={KLAIPEDA_BUSINESS_PATH} style={{ color: C.gold }}>For businesses ›</a>
        </div>
      </div>
    </div>
  );
};

export default KlaipedaSculptures;
