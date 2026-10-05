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
import { livePromotions } from "../utils/promotions";
import { eventOnDays } from "../utils/eventWhen";
import { rowCountry } from "../utils/countries";
import { cleanBooking, busyAt } from "../utils/dealExtras";

export const KlaipedaDemo = () => {
  const today = useMemo(() => todayInKlaipeda(), []);
  const lang = useMemo(() => currentUiLanguage(), []);
  const from = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get("from") || ""; } catch { return ""; }
  }, []);

  // ── TODAY IN KLAIPĖDA, AND THE DEALS IN TOWN ──────────────────────
  // The same published content the main site reads, loaded once.
  const [live, setLive] = useState({ onToday: [], deals: [] });
  useEffect(() => {
    let gone = false;
    ensureLiveContentLoaded().then(() => {
      if (gone) return;
      const lt = (r) => rowCountry(r) === "LT";
      const onToday = [...events, ...majorEvents, ...calendarEvents].filter(lt).filter(e => eventOnDays(e, [today])).slice(0, 6);
      const deals = livePromotions({ free: freeEntrance, food: foodSpots, nightlife: nightlifeSpots, shop: shops, town: towns, event: [...events, ...majorEvents] }).filter(lt).slice(0, 8);
      setLive({ onToday, deals });
    }).catch(() => { /* the walk stands on its own */ });
    return () => { gone = true; };
  }, [today]);

  // Linked from nowhere but the QR codes, and kept out of search (noindex)
  // until he decides it is more than a preview.
  useEffect(() => keepOutOfSearch("Klaipėda · Gemlyx"), []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 16px 64px" }}>
        {/* A visitor's page only: no switch to the business side here. */}
        <KlaipedaTop place={null} />

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
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 0.6, marginBottom: 6 }}>◈ {uiT("trips.deals", lang)}</div>
                {live.deals.map(d => {
                  const busy = busyAt(d.__busy, new Date(), "Europe/Vilnius");
                  return (
                    <div key={`${d._src}-${d.id ?? d.name}`} style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>
                      <strong style={{ color: C.text }}>{d.name}</strong>
                      {busy ? ` · ${uiT(`busy.${busy.level}`, lang)}` : ""}
                      {cleanBooking(d.__booking) ? ` · ${uiT("deal.book", lang)}` : ""}
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
