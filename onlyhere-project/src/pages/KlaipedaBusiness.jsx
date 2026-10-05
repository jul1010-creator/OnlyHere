// ── KLAIPĖDA, FOR BUSINESSES ────────────────────────────────────────
//
// Oliver, 5 Oct 2026: "even the owner of the restaurant is seeing the same as
// the customers and reverse.. we need a seperation.. because obviously the
// tourist is not gonna care about how many people are coming in thursday with
// the ship.. so seperate it. Polish it a bit, so we can move on from there."
//
// So this is the owner's side, and the only Klaipėda page with the ships and
// their guests on it. What is real: the ship days, from the port's own
// schedule (data/klaipedaCruises.js). What is made up and marked so: the
// partners, their offers and their numbers (data/klaipedaExamples.js), moved
// here from the visitor examples page, where they were mixed in.
import { useEffect, useMemo } from "react";
import { C } from "../utils/theme";
import { KlaipedaTop, keepOutOfSearch } from "../components/KlaipedaTop";
import { CruiseDays } from "../components/CruiseDays";
import { cruiseDaysAhead, aboutGuests, seasonOf } from "../utils/cruiseDays";
import { CRUISE_ZONE } from "../data/klaipedaCruises";
import { placeDate } from "../utils/offerClock";
import { offerHoursLabel } from "../utils/offer";
import { windowOf, timingAt, cleanDays, cleanClock } from "../utils/offerClock";
import { openBetween } from "../utils/nowPlanner";
import { EXAMPLE_WALKS, EXAMPLE_PARTNERS, runExample } from "../data/klaipedaExamples";
import { KLAIPEDA_CENTRE_PATH } from "../data/klaipedaSculptures";

const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const TIMING_TEXT = { now: "On at this moment", always: "On at this moment", later: "Later that day", off: "Not that day", shut: "Closed at this moment" };
const dayWords = (day) => {
  try { return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`)); } catch { return day; }
};

const Tag = ({ children, strong = false }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", borderRadius: 100, padding: "2px 8px", whiteSpace: "nowrap",
    color: strong ? C.gold : C.muted, background: strong ? `${C.gold}16` : "transparent", border: `1px solid ${strong ? `${C.gold}44` : C.border}`,
  }}>{children}</span>
);
const H2 = ({ children, tag = null }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "0 0 8px" }}>
    <h2 style={{ fontSize: 24, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.2, margin: 0 }}>{children}</h2>
    {tag && <Tag strong>{tag}</Tag>}
  </div>
);
const Lead = ({ children }) => (
  <p style={{ fontSize: 13.5, lineHeight: 1.65, color: C.light, margin: "0 0 16px" }}>{children}</p>
);

const STEPS = [
  ["You set the offer", "Write what a visitor gets and pick the days and hours it is on. A coffee refill in the quiet hour, a lunch plate until three."],
  ["Places earn their stop", "A walk is made from what is open, close by and worth the time. An offer never moves a place up the walk."],
  ["The visitor sees it when it is on", "When your place is in the walk and the offer is on for the whole visit, it shows on the stop, marked as a partner."],
  ["You see what it brought", "How often your place was in a walk, how often it was opened, and when the ships are in."],
];

export const KlaipedaBusiness = () => {
  useEffect(() => keepOutOfSearch("Klaipėda for businesses · Gemlyx"), []);
  const now = useMemo(() => new Date(), []);
  const today = placeDate(now, CRUISE_ZONE);
  const next = useMemo(() => cruiseDaysAhead(now, 1)[0] || null, [now]);
  const season = useMemo(() => seasonOf(Number(today.slice(0, 4))), [today]);
  // The offers are shown as they stand at the moment of the first example walk.
  const run = useMemo(() => runExample(EXAMPLE_WALKS[0]), []);
  const momentLabel = `${DAY_LONG[run.startClock.day]} ${hhmm(run.startClock.minutes)}`;
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 15px" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 16px 64px" }}>
        <KlaipedaTop side="business" />

        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 8 }}>For cafés, restaurants and shops</div>
        <h1 style={{ fontSize: 36, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.1, margin: "0 0 12px" }}>Know when the town fills up, and be on the way</h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: C.light, margin: "0 0 34px", fontFamily: "'Fraunces', serif" }}>
          Gemlyx makes walks for visitors from the time they have. Your place goes in when it fits the walk, and your offer shows when it is on.
        </p>

        {/* ── THE SHIPS, REAL ─────────────────────────────────── */}
        <H2>Who is coming to town</H2>
        <Lead>Cruise ships due in Klaipėda, from the port's own schedule, with about how many guests each one carries.</Lead>

        {next ? (
          <div data-testid="business-next-ship" style={{ ...card, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: "16px 16px", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.muted }}>{next.day === today ? "In port today" : "Next ship day"}</div>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "'Fraunces', serif", marginTop: 4 }}>{dayWords(next.day)}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: C.muted }}>about</span>
              <span style={{ fontSize: 30, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold, lineHeight: 1 }}>{aboutGuests(next.guests)}</span>
              <span style={{ fontSize: 13, color: C.muted }}>guests on board</span>
            </div>
            <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginTop: 8 }}>
              {next.calls.map(c => <div key={`${c.ship}${c.arrives}`}><strong style={{ color: C.text }}>{c.ship}</strong> · in port {c.arrives} to {c.leaves}</div>)}
            </div>
          </div>
        ) : (
          <div data-testid="business-no-ships" style={{ ...card, marginBottom: 10, fontSize: 13, lineHeight: 1.6, color: C.light }}>
            No more ships are due this season. The port lists the next season over the winter, and it shows here then.
          </div>
        )}
        <CruiseDays lang="en" count={6} compact />
        {season.calls > 0 && (
          <div data-testid="business-season" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, margin: "2px 0 40px" }}>
            {[[String(season.calls), `ship calls in ${season.year}`], [String(season.ships), "different ships"], [aboutGuests(season.guests), "guests on board (about)"]].map(([n, what]) => (
              <div key={what}>
                <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold }}>{n}</div>
                <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{what}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── HOW IT WORKS ────────────────────────────────────── */}
        <H2>How it works for you</H2>
        <div style={{ display: "grid", gap: 10, margin: "10px 0 40px" }}>
          {STEPS.map(([t, d], i) => (
            <div key={t} style={{ ...card, display: "flex", gap: 12 }}>
              <span style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: 26, background: C.gold, color: C.onGold, fontSize: 13, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 }}>{t}</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: C.light }}>{d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── OFFERS, MADE UP ─────────────────────────────────── */}
        <H2 tag="Examples">Offers, the way you set them</H2>
        <Lead>The businesses and offers below are made up, to show how it works. Each one is shown as it stands on {momentLabel}.</Lead>
        <div style={{ display: "grid", gap: 10, marginBottom: 40 }}>
          {EXAMPLE_PARTNERS.map(p => {
            // An offer is only on while the door is open: an all-day offer at a
            // workshop that has closed for the day is not on. Found in review,
            // 2 Oct 2026.
            const inWindow = timingAt(windowOf({ days: cleanDays(p.offer.days), from: cleanClock(p.offer.from), to: cleanClock(p.offer.to) }), run.startClock);
            const doorShut = (inWindow === "now" || inWindow === "always") && openBetween(p.hours, run.startClock.day, run.startClock.minutes, run.startClock.minutes + 1) === false;
            const timing = doorShut ? "shut" : inWindow;
            const set = offerHoursLabel({ ...p.offer, until: "2027-12-31" }, { lang: "en" }) || "Whenever they are open";
            const on = timing === "now" || timing === "always";
            return (
              <div key={p.key} data-testid="example-offer" style={card}>
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

        {/* ── WHAT A PARTNER SEES, MADE UP ────────────────────── */}
        <H2 tag="Example">What you would see</H2>
        <Lead>Your own page, with no names and no accounts behind the numbers: only how often your place came up and was opened.</Lead>
        <div data-testid="business-partner-stats" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 40 }}>
          {[["46", "walks it was in this month"], ["19", "visitors opened your page"], ["Tue 12:00", "your busiest half hour"]].map(([n, what]) => (
            <div key={what}>
              <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold }}>{n}</div>
              <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{what}</div>
            </div>
          ))}
        </div>

        {/* ── JOIN ────────────────────────────────────────────── */}
        <div data-testid="business-join" style={{ ...card, border: `1px solid ${C.gold}88`, background: `${C.gold}12`, borderRadius: 16, padding: "18px 16px", marginBottom: 40 }}>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>Want your place on the walks?</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: C.light, margin: "6px 0 14px" }}>Write to us with the name of your place and what you would like to offer.</div>
          <a href={`mailto:hello@gemlyxtravel.com?subject=${encodeURIComponent("Klaipėda: my place on Gemlyx")}`} data-testid="business-join-mail"
            style={{ display: "inline-block", background: C.gold, color: C.onGold, borderRadius: 12, padding: "11px 16px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            hello@gemlyxtravel.com
          </a>
        </div>

        <a href={KLAIPEDA_CENTRE_PATH} data-testid="business-centre-link"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, ...card, textDecoration: "none", marginBottom: 34 }}>
          <span>
            <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text }}>For the tourism centre</span>
            <span style={{ display: "block", fontSize: 12, color: C.muted, marginTop: 2 }}>The talking sculptures: what the centre would see</span>
          </span>
          <span style={{ color: C.gold, fontWeight: 700 }}>›</span>
        </a>

        <div style={{ fontSize: 11.5, lineHeight: 1.7, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          Ship days are from the Port of Klaipėda's schedule, copied on 5 October 2026. Guests are each ship's normal passenger count, which is how many are on board, not how many come ashore. The businesses, offers and partner numbers on this page are examples.
        </div>
      </div>
    </div>
  );
};

export default KlaipedaBusiness;
