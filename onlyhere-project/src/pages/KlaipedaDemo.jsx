// ── KLAIPĖDA, FROM THE QR CODES ─────────────────────────────────────
//
// Oliver, 29 Sep 2026: a page for Klaipėda's tourism centre, living inside
// Gemlyx so it looks like the product it is, and linked from nowhere but the
// QR codes at the terminal and the centre.
//
// 2 Oct 2026, of the two walks first written for it by hand: "that's just
// some ChatGPT crap.. we need a system built so we can mix these studio
// generated guides with the businesses who joins us". So the page is now the
// walk made for this moment from the places published in the Studio
// (components/NowPlanner.jsx), with partners on merit and labelled, and what
// is on in town today. The hand-written walks are gone.
import { useEffect, useMemo, useState } from "react";
import { C } from "../utils/theme";
import { KlaipedaTop, keepOutOfSearch } from "../components/KlaipedaTop";
import { NowPlanner } from "../components/NowPlanner";
import { LOCAL_TIPS, todayInKlaipeda } from "../data/klaipedaDemo";
import { currentUiLanguage, t as uiT } from "../utils/uiLanguage";
import { ensureLiveContentLoaded } from "../utils/liveContent";
import { events, majorEvents, calendarEvents } from "../data/events";
import { freeEntrance } from "../data/freeEntrance";
import { foodSpots } from "../data/food";
import { nightlifeSpots } from "../data/nightlife";
import { shops } from "../data/shops";
import { towns } from "../data/towns";
import { livePromotions, promoCard } from "../utils/promotions";
import { eventOnDays } from "../utils/eventWhen";
import { rowCountry } from "../utils/countries";
import { cleanBooking, busyAt } from "../utils/dealExtras";
import { examplePromotionPools, KLAIPEDA_SKY } from "../data/klaipedaExamples";
import { weatherIcon } from "../utils/helpers";

const SKY_EVERY_MS = 10 * 60 * 1000;

export const KlaipedaDemo = () => {
  const today = useMemo(() => todayInKlaipeda(), []);
  const lang = useMemo(() => currentUiLanguage(), []);
  const from = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get("from") || ""; } catch { return ""; }
  }, []);

  // ── TODAY IN KLAIPĖDA, AND THE DEALS IN TOWN ──────────────────────
  // The same published content the main site reads, loaded once.
  const [live, setLive] = useState({ onToday: [], deals: [], examples: false });
  useEffect(() => {
    let gone = false;
    ensureLiveContentLoaded().then(() => {
      if (gone) return;
      const lt = (r) => rowCountry(r) === "LT";
      const onToday = [...events, ...majorEvents, ...calendarEvents].filter(lt).filter(e => eventOnDays(e, [today])).slice(0, 6);
      const real = livePromotions({ free: freeEntrance, food: foodSpots, nightlife: nightlifeSpots, shop: shops, town: towns, event: [...events, ...majorEvents] }).filter(lt);
      // The made-up partners until the first real Klaipėda deal, the same
      // rule as the Special deals page (App.jsx exampleDeals), 7 Oct 2026.
      const examples = real.length === 0;
      // A visitor off a ship has today, so only what is on today: on now
      // first, then later today, then the ones on whenever the door is open.
      const at = new Date();
      const RANK = { now: 0, later: 1, always: 2 };
      const deals = (examples ? livePromotions(examplePromotionPools()) : real)
        .map(d => ({ d, card: promoCard(d, { today: at, lang }) }))
        .filter(x => x.card.timing in RANK)
        .sort((a, b) => RANK[a.card.timing] - RANK[b.card.timing] || String(a.d.__offer?.from || "").localeCompare(String(b.d.__offer?.from || "")))
        .slice(0, 5)
        .map(x => ({ ...x.d, _hours: x.card.timing === "always" ? "" : x.card.hours, _on: x.card.timing === "now" }));
      setLive({ onToday, deals, examples });
    }).catch(() => { /* the walk stands on its own */ });
    return () => { gone = true; };
  }, [today, lang]);

  // ── THE WEATHER IN KLAIPĖDA NOW, IN THE CORNER ────────────────────
  // Oliver, 7 Oct 2026: "implement up in the corner 'current weather' on the
  // QR guide", "live weather". Read from MET Norway the way the walk reads it
  // (/api/weather?mode=walk, utils/walkWeather.js), and again every ten
  // minutes while the page is open. Nothing is drawn until it is known. The
  // temperature is the one for now; the wind in that reading is the strongest
  // of the coming hours, which the walk needs, so it is not shown as "now".
  const [sky, setSky] = useState(null);
  useEffect(() => {
    let gone = false;
    const read = () => fetch(`/api/weather?lat=${KLAIPEDA_SKY.lat}&lon=${KLAIPEDA_SKY.lon}&mode=walk`)
      .then(r => (r.ok ? r.json() : null))
      .then(w => { if (!gone && w && w.known && Number.isFinite(Number(w.temp))) setSky(w); })
      .catch(() => { /* the corner stays empty */ });
    read();
    const every = setInterval(read, SKY_EVERY_MS);
    return () => { gone = true; clearInterval(every); };
  }, []);
  const corner = sky ? (
    <div data-testid="trips-weather" title={uiT("trips.weatherNow", lang)} aria-label={`${uiT("trips.weatherNow", lang)}: ${Math.round(sky.temp)}°`}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: "5px 12px 5px 9px" }}>
      <span style={{ fontSize: 17, lineHeight: 1 }}>{weatherIcon(sky.symbol)}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{Math.round(sky.temp)}°</span>
    </div>
  ) : null;

  // Linked from nowhere but the QR codes, and kept out of search (noindex)
  // until he decides it is more than a preview.
  useEffect(() => keepOutOfSearch("Klaipėda · Gemlyx"), []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 16px 64px" }}>
        {/* A visitor's page only: no switch to the business side here. */}
        <KlaipedaTop place={null} corner={corner} />

        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 8 }}>Lithuania</div>
        <h1 style={{ fontSize: 38, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.1, margin: "0 0 12px" }}>Klaipėda</h1>
        <p style={{ fontSize: 13, lineHeight: 1.65, color: C.muted, margin: "0 0 26px" }}>
          {uiT("trips.intro", lang)}
        </p>

        {/* The walk made for this moment. The QR at the terminal carries
            ?from=terminal, the one at the centre ?from=centre. */}
        <NowPlanner country="LT" lang={lang} defaultFrom={from} />

        {/* The ships and their guests are for businesses, not for the people
            on them (Oliver, 5 Oct 2026), so they are on /lithuania/business.
            A passenger still sees when their own ship sails, in the walk. */}
        {(live.onToday.length > 0 || live.deals.length > 0) && (
          <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
            {live.onToday.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "13px 15px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 0.6, marginBottom: 8 }}>{uiT("trips.onToday", lang)}</div>
                {live.onToday.map(e => (
                  <div key={`${e.id ?? e.name}`} style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>
                    <strong style={{ color: C.text }}>{e.name}</strong>{e.venue || e.town ? ` · ${e.venue || e.town}` : ""}
                  </div>
                ))}
              </div>
            )}
            {live.deals.length > 0 && (
              <a href="/lithuania#promotions" style={{ display: "block", textDecoration: "none", background: `${C.gold}14`, border: `1px solid ${C.gold}55`, borderRadius: 14, padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 0.6, marginBottom: 6 }}>
                  ◈ {uiT("trips.deals", lang)}
                  {live.examples && <span data-testid="trips-deals-examples" style={{ fontSize: 10, fontWeight: 700, color: C.text, border: `1px solid ${C.border}`, borderRadius: 100, padding: "2px 8px", letterSpacing: 0.4 }}>{uiT("deals.example", lang)}</span>}
                </div>
                {live.deals.map(d => {
                  const busy = busyAt(d.__busy, new Date(), "Europe/Vilnius");
                  return (
                    <div key={`${d._src}-${d.id ?? d.name}`} style={{ fontSize: 13, color: C.light, lineHeight: 1.5, padding: "5px 0" }}>
                      <strong style={{ color: C.text }}>{d.name}</strong>
                      {d._hours && <span data-testid="trips-deal-hours" style={{ fontSize: 11, fontWeight: 700, color: d._on ? C.gold : C.muted }}>{` · ${d._on ? "● " : ""}${d._hours}`}</span>}
                      {busy ? ` · ${uiT(`busy.${busy.level}`, lang)}` : ""}
                      {cleanBooking(d.__booking) ? ` · ${uiT("deal.book", lang)}` : ""}
                      {/* What the visitor gets, not only who gives it (7 Oct 2026). */}
                      {String(d.__offer?.text || "").trim() && <div data-testid="trips-deal-offer" style={{ fontSize: 12.5, color: C.light }}>{String(d.__offer.text).trim()}</div>}
                    </div>
                  );
                })}
              </a>
            )}
          </div>
        )}

        <h2 style={{ fontSize: 22, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.2, margin: "0 0 14px" }}>What a local would tell you</h2>
        <div style={{ display: "grid", gap: 10, marginBottom: 40 }}>
          {LOCAL_TIPS.map(t => (
            <div key={t.title} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "13px 15px" }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 4 }}>{t.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: C.light }}>{t.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KlaipedaDemo;
