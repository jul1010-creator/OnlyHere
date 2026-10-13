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
//
// 13 Oct 2026, the deals come first: "changing the concept so the deals is the
// focus. Because some places shot down because of lack of visitors", and
// "People will just use the chat bots for" the travelling. So the page opens
// on what local places offer right now and how far each is on foot
// (components/DealsNearYou.jsx); the walk planner is underneath, for a
// visitor with more time.
import { useEffect, useMemo, useState } from "react";
import { C } from "../utils/theme";
import { KlaipedaTop, keepOutOfSearch } from "../components/KlaipedaTop";
import { NowPlanner } from "../components/NowPlanner";
import { DealsNearYou } from "../components/DealsNearYou";
import { LOCAL_TIPS, todayInKlaipeda } from "../data/klaipedaDemo";
import { currentUiLanguage, t as uiT } from "../utils/uiLanguage";
import { KLAIPEDA_SKY } from "../data/klaipedaExamples";
import { useKlaipedaDeals } from "../utils/useKlaipedaDeals";
import { weatherIcon } from "../utils/helpers";

const SKY_EVERY_MS = 10 * 60 * 1000;

export const KlaipedaDemo = () => {
  const today = useMemo(() => todayInKlaipeda(), []);
  const lang = useMemo(() => currentUiLanguage(), []);
  const from = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get("from") || ""; } catch { return ""; }
  }, []);

  // ── TODAY IN KLAIPĖDA, AND THE DEALS IN TOWN ──────────────────────
  // One loader for this page and the Explore tab of /lithuania, so the two
  // always show the same deals (utils/useKlaipedaDeals.js, 13 Oct 2026).
  const live = useKlaipedaDeals(today);

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

        {/* App-like, 13 Oct 2026: a short title and straight to the deals,
            not a website's hero. */}
        <h1 style={{ fontSize: 28, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.1, margin: "0 0 4px" }}>Klaipėda</h1>
        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: C.muted, margin: "0 0 18px" }}>
          {uiT("trips.introDeals", lang)}
        </p>

        {/* Deals first. The QR at the terminal carries ?from=terminal, the
            one at the centre ?from=centre, and both lists start there. */}
        <DealsNearYou deals={live.deals} examples={live.examples} lang={lang} defaultFrom={from} country="LT" />

        <h2 style={{ fontSize: 22, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.2, margin: "0 0 12px" }}>{uiT("trips.walkH", lang)}</h2>
        <NowPlanner country="LT" lang={lang} defaultFrom={from} />

        {/* The ships and their guests are for businesses, not for the people
            on them (Oliver, 5 Oct 2026), so they are on /lithuania/business.
            A passenger still sees when their own ship sails, in the walk. */}
        {live.onToday.length > 0 && (
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
