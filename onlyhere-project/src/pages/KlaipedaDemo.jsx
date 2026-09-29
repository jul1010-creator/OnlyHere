// ── KLAIPĖDA, TWO READY-MADE TRIPS ──────────────────────────────────
//
// Oliver, 29 Sep 2026: a demo for Klaipėda's tourism centre, living inside
// Gemlyx so it looks like the product it is, and linked from nowhere. The
// reasoning, the facts and where each one came from are in
// data/klaipedaDemo.js; this file only draws them.
//
// Same shell as AffiliatesPage (one column, the theme's own colours, Fraunces
// for names), with the guide's stop cards borrowed in spirit: a time, a name
// in gold, what it is, and the line a visitor needs before walking in.
//
// THE ONE LIVE THING ON IT is the day picker. Two of the museums keep summer
// hours and winter hours that close them on different days, and a trip that
// sends somebody to a shut door is the mistake Gemlyx exists to not make. So
// the page asks which day you are going and says, per stop, whether it is
// open then, in the season that day falls in.
import { useEffect, useMemo, useState } from "react";
import { C } from "../utils/theme";
import { GemlyxLogo } from "../components/GemlyxLogo";
import {
  PLACES, TRIPS, LOCAL_TIPS, CHECKED_ON,
  openOn, dayName, nextWeekday, todayInKlaipeda, stopTime, mapsSearchUrl, mapsRouteUrl,
} from "../data/klaipedaDemo";

const WARN = "#FFB347";
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const SHORT = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };

const fmtDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
const fmtChecked = () => new Date(`${CHECKED_ON}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const ExtLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer"
    style={{ fontSize: 12, fontWeight: 700, color: C.gold, textDecoration: "none", borderBottom: `1px solid ${C.gold}55`, paddingBottom: 1 }}>
    {children} ↗
  </a>
);

const Status = ({ state }) => {
  const colour = state.open === false ? WARN : state.open ? C.light : C.muted;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10 }}>
      <span style={{ width: 7, height: 7, borderRadius: 7, flexShrink: 0, background: state.open === false ? WARN : state.open ? C.gold : C.border }} />
      <span style={{ fontSize: 12, fontWeight: state.open === false ? 700 : 500, color: colour }}>{state.text}</span>
    </div>
  );
};

const Walk = ({ text }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0 8px 21px" }}>
    <span style={{ width: 1, height: 22, background: `${C.gold}55` }} />
    <span style={{ fontSize: 11.5, color: C.muted, letterSpacing: 0.3 }}>{text}</span>
  </div>
);

const StopCard = ({ trip, stop, date }) => {
  const p = PLACES[stop.place];
  const state = openOn(p.hours, date);
  const stay = stop.stay || p.stay;
  const meta = [p.address, stay && `${stay} here`].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ width: 44, flexShrink: 0, textAlign: "center", paddingTop: 14 }}>
        <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: C.gold, background: `${C.gold}16`, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "4px 0", width: 44 }}>
          {stopTime(trip, stop.at)}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0, background: C.surface, border: `1px solid ${stop.optional ? `${C.border}` : C.border}`, borderStyle: stop.optional ? "dashed" : "solid", borderRadius: 14, padding: "14px 15px" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.gold, fontFamily: "'Fraunces', serif", lineHeight: 1.25 }}>
          {stop.back ? "Back at the ship" : p.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginTop: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: C.gold, background: `${C.gold}16`, border: `1px solid ${C.gold}33`, borderRadius: 100, padding: "2px 8px" }}>
            {stop.back ? "Finish" : p.kind}
          </span>
          {meta && <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.1 }}>{meta}</span>}
        </div>
        {!stop.back && <div style={{ fontSize: 13, lineHeight: 1.65, color: C.light, marginTop: 9 }}>{p.note}</div>}
        {!stop.back && p.price && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginTop: 9 }}>{p.price}</div>
        )}
        {!stop.back && !p.hours?.always && <Status state={state} />}
        {!stop.back && p.hours?.lastEntry && state.open && (
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, paddingLeft: 14 }}>{p.hours.lastEntry}</div>
        )}
        {!stop.back && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
            <ExtLink href={mapsSearchUrl(p.maps)}>Map</ExtLink>
            <ExtLink href={p.hoursSource || p.source}>Source</ExtLink>
          </div>
        )}
      </div>
    </div>
  );
};

export const KlaipedaDemo = () => {
  const today = useMemo(() => todayInKlaipeda(), []);
  const [tripId, setTripId] = useState(TRIPS[0].id);
  const [dow, setDow] = useState(today.getDay());
  const trip = TRIPS.find(t => t.id === tripId) || TRIPS[0];
  const date = nextWeekday(today, dow);
  const isToday = date.getTime() === today.getTime();

  // Linked from nowhere, and kept out of search too, until he decides it is
  // more than a demo.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Klaipėda · Gemlyx";
    // index.html already carries a robots tag for the whole site, so this
    // rewrites that one rather than adding a second that contradicts it.
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

  const closed = trip.stops
    .filter(s => s.place && !s.back && !s.optional)
    .map(s => ({ s, p: PLACES[s.place] }))
    .filter(({ p }) => openOn(p.hours, date).open === false);
  const closedNames = [...new Set(closed.map(({ p }) => p.name))];

  const pill = (active) => ({
    background: active ? C.gold : "transparent",
    color: active ? C.onGold : C.light,
    border: `1px solid ${active ? C.gold : C.border}`,
    borderRadius: 100, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 16px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 30 }}>
          <GemlyxLogo size={18} color={C.text} />
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted }}>Preview</span>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 8 }}>Lithuania</div>
        <h1 style={{ fontSize: 38, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.1, margin: "0 0 12px" }}>Klaipėda</h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: C.light, margin: "0 0 8px", fontFamily: "'Fraunces', serif" }}>
          A port town on the Baltic, with a half-timbered Old Town and the Curonian Spit a short ferry ride away.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.65, color: C.muted, margin: "0 0 26px" }}>
          Two ready-made trips you can follow on foot. Gemlyx is opening Lithuania, starting here.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }} role="tablist" aria-label="Trips">
          {TRIPS.map(t => (
            <button key={t.id} role="tab" aria-selected={t.id === trip.id} onClick={() => setTripId(t.id)} style={pill(t.id === trip.id)}>
              {t.title}
            </button>
          ))}
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 15px", marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>Which day are you going?</div>
          <div style={{ display: "flex", gap: 5 }}>
            {WEEK.map(d => (
              <button key={d} onClick={() => setDow(d)} aria-pressed={d === dow}
                style={{ ...pill(d === dow), padding: "6px 0", flex: "1 1 0", minWidth: 0, maxWidth: 56, fontSize: 12 }}>
                {SHORT[d]}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 12, color: closedNames.length ? WARN : C.light, fontWeight: closedNames.length ? 700 : 500 }}>
            {closedNames.length
              ? `${isToday ? "Today" : `On ${dayName(date)} ${fmtDate(date)}`}, ${closedNames.join(" and ")} ${closedNames.length === 1 ? "is" : "are"} closed. Pick another day, or skip ${closedNames.length === 1 ? "it" : "them"}.`
              : `${isToday ? "Today" : `On ${dayName(date)} ${fmtDate(date)}`}, everything on this trip is open.`}
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.2, margin: "0 0 8px" }}>{trip.title}</h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: C.light, margin: "0 0 12px" }}>{trip.lead}</p>
        <div style={{ marginBottom: 22 }}>
          <ExtLink href={mapsRouteUrl(trip)}>Open the whole walk in Google Maps</ExtLink>
        </div>

        <div>
          {trip.stops.map((s, i) => s.walk
            ? <Walk key={i} text={s.walk} />
            : <StopCard key={i} trip={trip} stop={s} date={date} />)}
        </div>

        {trip.closing && (
          <div style={{ fontSize: 13, lineHeight: 1.65, color: C.light, borderLeft: `2px solid ${C.gold}`, padding: "2px 0 2px 14px", margin: "26px 0 40px" }}>
            {trip.closing}
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

        <div style={{ fontSize: 11.5, lineHeight: 1.7, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          Hours and prices checked on {fmtChecked()} against each place's own website, and klaipedatravel.lt, the Klaipėda Tourism Information Centre, where a place has none. Every stop links to where its details came from. Walking times are estimates.
        </div>
      </div>
    </div>
  );
};

export default KlaipedaDemo;
