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
import { useEffect, useMemo, useState } from "react";
import { C } from "../utils/theme";
import { GemlyxLogo } from "../components/GemlyxLogo";
import { EditableWalk } from "../components/NowPlanner";
import { DetailPage } from "../components/DetailPage";
import { MUST_SEE } from "../utils/nowPlanner";
import { entryWord } from "../utils/entryWords";
import { offerHoursLabel } from "../utils/offer";
import { windowOf, timingAt, cleanDays, cleanClock } from "../utils/offerClock";
import {
  EXAMPLE_WALKS, EXAMPLE_PARTNERS, EXAMPLE_GUIDES, GUIDE_LANGS, GUIDE_LANG_NAMES, GUIDE_LABELS, PARTNER_WEEK,
  runExample, isExamplePartner, pageFor,
} from "../data/klaipedaExamples";

const WARN = "#FFB347";
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

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

const TIMING_TEXT = { now: "On at this moment", always: "On at this moment", later: "Later that day", off: "Not that day" };

export const KlaipedaExamples = () => {
  const [walkId, setWalkId] = useState(EXAMPLE_WALKS[0].id);
  const [lang, setLang] = useState("en");
  const ex = EXAMPLE_WALKS.find(w => w.id === walkId) || EXAMPLE_WALKS[0];
  const run = useMemo(() => runExample(ex), [ex]);
  // Which of the two ways round is shown. See reversedWalk in utils/nowPlanner.js.
  const [way, setWay] = useState("a");
  useEffect(() => { setWay("a"); }, [walkId]);
  const shownWalk = way === "b" && run.alt ? run.alt : run.walk;
  // The page a listing opens, in the window. See EXAMPLE_PAGES.
  const [open, setOpen] = useState(null);
  const openPage = (id) => { const p = pageFor(id); if (p) setOpen({ id, ...p }); };

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Klaipėda examples · Gemlyx";
    const existing = document.querySelector('meta[name="robots"]');
    const meta = existing || document.createElement("meta");
    const prevContent = existing ? existing.content : null;
    meta.name = "robots";
    meta.content = "noindex, nofollow, noai, noimageai";
    if (!existing) document.head.appendChild(meta);
    return () => {
      document.title = prevTitle;
      if (existing) existing.content = prevContent; else meta.remove();
    };
  }, []);

  const pill = (active) => ({
    background: active ? C.gold : "transparent", color: active ? C.onGold : C.light,
    border: `1px solid ${active ? C.gold : C.border}`, borderRadius: 100, padding: "8px 14px",
    fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif",
  });
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 15px" };
  const L = GUIDE_LABELS[lang];
  const busiest = Math.max(...PARTNER_WEEK.map(d => d.guests), 1);
  const momentLabel = `${DAY_LONG[run.startClock.day]} ${hhmm(run.startClock.minutes)}`;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 16px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 30 }}>
          <GemlyxLogo size={18} color={C.text} />
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted }}>Examples</span>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 8 }}>Klaipėda</div>
        <h1 style={{ fontSize: 36, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.1, margin: "0 0 12px" }}>What a visitor would see</h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: C.light, margin: "0 0 18px", fontFamily: "'Fraunces', serif" }}>
          Walks made for the time a visitor has, guides in their own language, and local businesses showing up where they fit.
        </p>

        <div data-testid="examples-banner" style={{ border: `1px solid ${C.gold}88`, background: `${C.gold}12`, borderRadius: 14, padding: "12px 15px", marginBottom: 34 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 4 }}>These are examples</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: C.light }}>
            The museums, squares and sculptures are real, with hours as they are this autumn. Every business, every offer and every number about them is made up, to show how it would work.
          </div>
        </div>

        {/* ── WALKS ───────────────────────────────────────────── */}
        <H2>A walk for the time they have</H2>
        <Lead>A visitor scans the QR code at the terminal or the tourist centre and taps how long they have. Gemlyx makes one walk from what is open then, shows the offers that are on then, and gets them back in time. Places rated Can't Miss Out go in whenever they are open. Each phone gets one of two ways round, so a full ship splits in half instead of moving as one crowd.</Lead>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }} role="tablist" aria-label="Example walks">
          {EXAMPLE_WALKS.map(w => (
            <button key={w.id} role="tab" aria-selected={w.id === ex.id} onClick={() => setWalkId(w.id)} style={pill(w.id === ex.id)} data-testid={`example-walk-${w.id}`}>
              {w.moment.split(",")[0]}
            </button>
          ))}
        </div>

        <div style={{ ...card, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: "16px 16px 18px", marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>{ex.title}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{ex.moment}</div>
          {run.alt && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }} role="tablist" aria-label="Way round">
              {[["a", "Route A"], ["b", "Route B"]].map(([k, label]) => (
                <button key={k} role="tab" aria-selected={way === k} onClick={() => setWay(k)} data-testid={`example-way-${k}`}
                  style={{ ...pill(way === k), padding: "5px 12px", fontSize: 11.5 }}>{label}</button>
              ))}
            </div>
          )}
          <EditableWalk walk={shownWalk} madeAt={run.startClock.minutes} lang="en" country="LT" tag={(s) => isExamplePartner(s.id) ? "Example" : null} onOpen={(s) => openPage(s.id)} />
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

        {/* ── OFFERS ──────────────────────────────────────────── */}
        <H2>Offers, the way a business sets them</H2>
        <Lead>A business writes what the visitor gets and picks the days and hours. Places are picked for a walk on merit. An offer is shown only when the place has earned its stop and the offer is on for the whole visit, and it is always marked as a partner's.</Lead>

        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Shown as they stand on {momentLabel}, the moment of the walk above.</div>
        <div style={{ display: "grid", gap: 10, marginBottom: 40 }}>
          {EXAMPLE_PARTNERS.map(p => {
            const timing = timingAt(windowOf({ days: cleanDays(p.offer.days), from: cleanClock(p.offer.from), to: cleanClock(p.offer.to) }), run.startClock);
            const set = offerHoursLabel({ ...p.offer, until: "2027-12-31" }, { lang: "en" }) || "Whenever they are open";
            const on = timing === "now" || timing === "always";
            return (
              <div key={p.key} data-testid="example-offer" role="button" tabIndex={0} onClick={() => openPage(`${p.type}:${p.key}`)} onKeyDown={(e) => { if (e.key === "Enter") openPage(`${p.type}:${p.key}`); }} style={{ ...card, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15.5, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold }}>{p.name}</span>
                  <Tag>Example</Tag>
                </div>
                <div style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1.1, marginTop: 4 }}>{p.what} · {p.street}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, lineHeight: 1.5, marginTop: 9 }}>{p.offer.text}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                  <Tag strong>{set}</Tag>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: on ? C.light : C.muted }}>
                    <span style={{ width: 7, height: 7, borderRadius: 7, background: on ? C.gold : C.border }} />
                    {TIMING_TEXT[timing]}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: C.muted, marginTop: 9, fontStyle: "italic" }}>{p.idea}</div>
              </div>
            );
          })}
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

        {/* ── WHAT A PARTNER WOULD SEE ─────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <H2>What a partner would see</H2>
          <Tag strong>Next step</Tag>
        </div>
        <Lead>The question every café and restaurant in the Old Town asks: when are the ships in? A partner would see the week ahead, and how often their place made it into a walk.</Lead>

        <div data-testid="example-partner-week" style={{ ...card, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12 }}>Ships in port this week</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, alignItems: "end", height: 96 }}>
            {PARTNER_WEEK.map(d => (
              <div key={d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 5 }}>
                {d.ships > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold }}>{(d.guests / 1000).toFixed(1)}k</span>}
                <div style={{ width: "100%", maxWidth: 34, borderRadius: 6, background: d.ships ? C.gold : C.border, height: d.ships ? Math.max(10, Math.round((d.guests / busiest) * 56)) : 4 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, marginTop: 6 }}>
            {PARTNER_WEEK.map(d => <div key={d.day} style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>{d.day}</div>)}
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 12, display: "grid", gap: 6 }}>
            {PARTNER_WEEK.filter(d => d.ships).map(d => (
              <div key={d.day} style={{ fontSize: 12.5, color: C.light }}>
                <span style={{ fontWeight: 700, color: C.text }}>{d.day}</span> · {d.ships} {d.ships === 1 ? "ship" : "ships"}, about {d.guests.toLocaleString("en-GB")} guests ashore, {d.hours}
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 40 }}>
          {[["46", "walks it was in"], ["19", "opened the map"], ["Tue 12:00", "busiest half hour"]].map(([n, what]) => (
            <div key={what}>
              <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold }}>{n}</div>
              <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{what}</div>
            </div>
          ))}
        </div>

        {open && (
          <DetailPage windowed item={open.item} kind={open.kind} onClose={() => setOpen(null)} lang={lang} paid
            sample={isExamplePartner(open.id) ? L.madeUp : L.page} />
        )}

        <div style={{ fontSize: 11.5, lineHeight: 1.7, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          Museum hours and prices were checked on 29 September 2026 against each museum's own website. Coordinates are from OpenStreetMap. The businesses, offers, ship days and numbers on this page are examples.
        </div>
      </div>
    </div>
  );
};

export default KlaipedaExamples;
