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
//
// 6 Oct 2026: in English and in Lithuanian, for the owners it is written
// for. ?lang=lt opens it in Lithuanian, as does a phone set to Lithuanian.
import { useEffect, useMemo, useState } from "react";
import { C } from "../utils/theme";
import { KlaipedaTop, keepOutOfSearch } from "../components/KlaipedaTop";
import { CruiseDays } from "../components/CruiseDays";
import { cruiseDaysAhead, aboutGuests, seasonOf } from "../utils/cruiseDays";
import { CRUISE_ZONE } from "../data/klaipedaCruises";
import { placeDate } from "../utils/offerClock";
import { offerHoursLabel } from "../utils/offer";
import { windowOf, timingAt, cleanDays, cleanClock } from "../utils/offerClock";
import { openBetween } from "../utils/nowPlanner";
import { currentUiLanguage } from "../utils/uiLanguage";
import { EXAMPLE_WALKS, EXAMPLE_PARTNERS, runExample } from "../data/klaipedaExamples";
import { KLAIPEDA_CENTRE_PATH } from "../data/klaipedaSculptures";

const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fill = (s, v) => Object.entries(v).reduce((o, [k, x]) => o.split(`{${k}}`).join(String(x)), s);

export const BUSINESS_LANGS = ["en", "lt"];
export const BUSINESS_TEXT = {
  en: {
    title: "Klaipėda for businesses · Gemlyx",
    eyebrow: "For cafés, restaurants and shops",
    h1: "Know when the town fills up, and be on the way",
    lead: "Gemlyx makes walks for visitors from the time they have. Your place goes in when it fits the walk, and your offer shows when it is on.",
    shipsH: "Who is coming to town",
    shipsLead: "Cruise ships due in Klaipėda, from the port's own schedule, with about how many guests each one carries.",
    inPortToday: "In port today", nextDay: "Next ship day", about: "about", onBoard: "guests on board", inPort: "in port {from} to {to}",
    noShips: "No more ships are due this season. The port lists the next season over the winter, and it shows here then.",
    calls: "ship calls in {year}", ships: "different ships", guests: "guests on board (about)",
    howH: "How it works for you",
    steps: [
      ["You set the offer", "Write what a visitor gets and pick the days and hours it is on. A coffee refill in the quiet hour, a lunch plate until three."],
      ["Places earn their stop", "A walk is made from what is open, close by and worth the time. An offer never moves a place up the walk."],
      ["The visitor sees it when it is on", "When your place is in the walk and the offer is on for the whole visit, it shows on the stop, marked as a partner."],
      ["You see what it brought", "How often your place was in a walk, how often it was opened, and when the ships are in."],
    ],
    offersH: "Offers, the way you set them", examples: "Examples", example: "Example",
    offersLead: "The businesses and offers below are made up, to show how it works. Each one is shown as it stands on {moment}.",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    whenOpen: "Whenever they are open",
    timing: { now: "On at this moment", always: "On at this moment", later: "Later that day", off: "Not that day", shut: "Closed at this moment" },
    seeH: "What you would see",
    seeLead: "Your own page, with no names and no accounts behind the numbers: only how often your place came up and was opened.",
    stats: [["46", "walks it was in this month"], ["19", "visitors opened your page"], ["Tue 12:00", "your busiest half hour"]],
    joinH: "Want your place on the walks?",
    joinLead: "Write to us with the name of your place and what you would like to offer.",
    joinSubject: "Klaipėda: my place on Gemlyx",
    centreH: "For the tourism centre", centreLead: "The talking sculptures: what the centre would see",
    foot: "Ship days are from the Port of Klaipėda's schedule, copied on 5 October 2026. Guests are each ship's normal passenger count, which is how many are on board, not how many come ashore. The businesses, offers and partner numbers on this page are examples.",
  },
  lt: {
    title: "Klaipėda verslui · Gemlyx",
    eyebrow: "Kavinėms, restoranams ir parduotuvėms",
    h1: "Žinokite, kada miestas prisipildo, ir būkite pakeliui",
    lead: "Gemlyx sudaro pasivaikščiojimus lankytojams pagal jų turimą laiką. Jūsų vieta įtraukiama, kai tinka maršrutui, o jūsų pasiūlymas rodomas, kai jis galioja.",
    shipsH: "Kas atvyksta į miestą",
    shipsLead: "Į Klaipėdą atplaukiantys kruiziniai laivai pagal uosto tvarkaraštį ir apytikslis svečių skaičius kiekviename laive.",
    inPortToday: "Šiandien uoste", nextDay: "Kita laivų diena", about: "apie", onBoard: "svečių laive", inPort: "uoste nuo {from} iki {to}",
    noShips: "Šį sezoną daugiau laivų nebeatplauks. Kito sezono tvarkaraštį uostas paskelbia žiemą, ir jis atsiras čia.",
    calls: "laivų apsilankymų {year} m.", ships: "skirtingų laivų", guests: "svečių laive (apytiksliai)",
    howH: "Kaip tai veikia jums",
    steps: [
      ["Jūs nustatote pasiūlymą", "Parašykite, ką gauna lankytojas, ir pasirinkite dienas bei valandas, kada jis galioja. Kavos papildymas ramią valandą, pietų patiekalas iki trečios."],
      ["Vietos atrenkamos pagal vertę", "Maršrutas sudaromas iš to, kas atidaryta, netoli ir verta laiko. Pasiūlymas niekada nepakelia vietos aukščiau maršrute."],
      ["Lankytojas jį mato, kai jis galioja", "Kai jūsų vieta yra maršrute, o pasiūlymas galioja visą apsilankymo laiką, jis rodomas prie vietos, pažymėtas kaip partnerio."],
      ["Matote, ką tai davė", "Kaip dažnai jūsų vieta pateko į maršrutą, kaip dažnai ji buvo atidaryta ir kada uoste stovi laivai."],
    ],
    offersH: "Pasiūlymai, kaip juos nustatote jūs", examples: "Pavyzdžiai", example: "Pavyzdys",
    offersLead: "Žemiau pateiktos įmonės ir pasiūlymai yra išgalvoti, kad parodytų, kaip tai veikia. Kiekvienas rodomas toks, koks yra {moment}.",
    days: ["sekmadienį", "pirmadienį", "antradienį", "trečiadienį", "ketvirtadienį", "penktadienį", "šeštadienį"],
    whenOpen: "Visą darbo laiką",
    timing: { now: "Galioja dabar", always: "Galioja dabar", later: "Vėliau tą dieną", off: "Tą dieną negalioja", shut: "Šiuo metu uždaryta" },
    seeH: "Ką matytumėte jūs",
    seeLead: "Jūsų puslapis, už skaičių nėra jokių vardų ar paskyrų: tik kaip dažnai jūsų vieta pasirodė ir buvo atidaryta.",
    stats: [["46", "maršrutai šį mėnesį"], ["19", "lankytojų atidarė jūsų puslapį"], ["Antr. 12:00", "judriausias jūsų pusvalandis"]],
    joinH: "Norite, kad jūsų vieta būtų maršrutuose?",
    joinLead: "Parašykite mums savo vietos pavadinimą ir ką norėtumėte pasiūlyti.",
    joinSubject: "Klaipėda: mano vieta Gemlyx",
    centreH: "Turizmo centrui", centreLead: "Kalbančios skulptūros: ką matytų centras",
    foot: "Laivų dienos paimtos iš Klaipėdos uosto tvarkaraščio, nukopijuoto 2026 m. spalio 5 d. Svečių skaičius yra įprastas laivo keleivių skaičius, tai yra kiek jų laive, o ne kiek išlipa į krantą. Šiame puslapyje pateiktos įmonės, pasiūlymai ir partnerių skaičiai yra pavyzdžiai.",
  },
};

const DAY_LOCALE = { en: "en-GB", lt: "lt-LT" };
const dayWords = (day, lang) => {
  try { return new Intl.DateTimeFormat(DAY_LOCALE[lang] || "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`)); } catch { return day; }
};
// The page's language: ?lang= first, then the phone's, then English.
export const businessLang = (search = "", phone = "en") => {
  try {
    const asked = new URLSearchParams(search).get("lang");
    if (BUSINESS_LANGS.includes(asked)) return asked;
  } catch { /* no address */ }
  return BUSINESS_LANGS.includes(phone) ? phone : "en";
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

export const KlaipedaBusiness = () => {
  const [lang, setLang] = useState(() => businessLang(typeof window !== "undefined" ? window.location.search : "", currentUiLanguage()));
  const T = BUSINESS_TEXT[lang] || BUSINESS_TEXT.en;
  useEffect(() => keepOutOfSearch(T.title), [lang]);
  const pick = (l) => {
    setLang(l);
    try { const u = new URL(window.location.href); u.searchParams.set("lang", l); window.history.replaceState(null, "", u.toString()); } catch { /* old browser */ }
  };
  const now = useMemo(() => new Date(), []);
  const today = placeDate(now, CRUISE_ZONE);
  const next = useMemo(() => cruiseDaysAhead(now, 1)[0] || null, [now]);
  const season = useMemo(() => seasonOf(Number(today.slice(0, 4))), [today]);
  // The offers are shown as they stand at the moment of the first example walk.
  const run = useMemo(() => runExample(EXAMPLE_WALKS[0]), []);
  const momentLabel = `${T.days[run.startClock.day]} ${hhmm(run.startClock.minutes)}`;
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 15px" };

  return (
    <div lang={lang} style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 16px 64px" }}>
        <KlaipedaTop side="business" lang={lang} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase" }}>{T.eyebrow}</div>
          <div role="group" aria-label="Language" data-testid="business-lang" style={{ display: "inline-flex", border: `1px solid ${C.border}`, borderRadius: 100, padding: 2, flex: "0 0 auto" }}>
            {BUSINESS_LANGS.map(l => (
              <button key={l} onClick={() => pick(l)} aria-pressed={l === lang} data-testid={`business-lang-${l}`}
                style={{ background: l === lang ? C.gold : "transparent", color: l === lang ? C.onGold : C.light, border: "none", borderRadius: 100, padding: "4px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.1, margin: "0 0 12px" }}>{T.h1}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: C.light, margin: "0 0 34px", fontFamily: "'Fraunces', serif" }}>{T.lead}</p>

        {/* ── THE SHIPS, REAL ─────────────────────────────────── */}
        <H2>{T.shipsH}</H2>
        <Lead>{T.shipsLead}</Lead>

        {next ? (
          <div data-testid="business-next-ship" style={{ ...card, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: "16px 16px", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.muted }}>{next.day === today ? T.inPortToday : T.nextDay}</div>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "'Fraunces', serif", marginTop: 4 }}>{dayWords(next.day, lang)}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: C.muted }}>{T.about}</span>
              <span style={{ fontSize: 30, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold, lineHeight: 1 }}>{aboutGuests(next.guests, lang)}</span>
              <span style={{ fontSize: 13, color: C.muted }}>{T.onBoard}</span>
            </div>
            <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginTop: 8 }}>
              {next.calls.map(c => <div key={`${c.ship}${c.arrives}`}><strong style={{ color: C.text }}>{c.ship}</strong> · {fill(T.inPort, { from: c.arrives, to: c.leaves })}</div>)}
            </div>
          </div>
        ) : (
          <div data-testid="business-no-ships" style={{ ...card, marginBottom: 10, fontSize: 13, lineHeight: 1.6, color: C.light }}>{T.noShips}</div>
        )}
        <CruiseDays lang={lang} count={6} compact />
        {season.calls > 0 && (
          <div data-testid="business-season" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, margin: "2px 0 40px" }}>
            {[[String(season.calls), fill(T.calls, { year: season.year })], [String(season.ships), T.ships], [aboutGuests(season.guests, lang), T.guests]].map(([n, what]) => (
              <div key={what}>
                <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold }}>{n}</div>
                <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{what}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── HOW IT WORKS ────────────────────────────────────── */}
        <H2>{T.howH}</H2>
        <div style={{ display: "grid", gap: 10, margin: "10px 0 40px" }}>
          {T.steps.map(([t, d], i) => (
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
        <H2 tag={T.examples}>{T.offersH}</H2>
        <Lead>{fill(T.offersLead, { moment: momentLabel })}</Lead>
        <div style={{ display: "grid", gap: 10, marginBottom: 40 }}>
          {EXAMPLE_PARTNERS.map(p => {
            // An offer is only on while the door is open: an all-day offer at a
            // workshop that has closed for the day is not on. Found in review,
            // 2 Oct 2026.
            const inWindow = timingAt(windowOf({ days: cleanDays(p.offer.days), from: cleanClock(p.offer.from), to: cleanClock(p.offer.to) }), run.startClock);
            const doorShut = (inWindow === "now" || inWindow === "always") && openBetween(p.hours, run.startClock.day, run.startClock.minutes, run.startClock.minutes + 1) === false;
            const timing = doorShut ? "shut" : inWindow;
            const set = offerHoursLabel({ ...p.offer, until: "2027-12-31" }, { lang }) || T.whenOpen;
            const on = timing === "now" || timing === "always";
            const words = lang === "lt" && p.lt ? p.lt : { what: p.what, offer: p.offer.text, idea: p.idea };
            return (
              <div key={p.key} data-testid="example-offer" style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15.5, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold }}>{p.name}</span>
                  <Tag>{T.example}</Tag>
                </div>
                <div style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1.1, marginTop: 4 }}>{words.what} · {p.street}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, lineHeight: 1.5, marginTop: 9 }}>{words.offer}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                  <Tag strong>{set}</Tag>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: on ? C.light : C.muted }}>
                    <span style={{ width: 7, height: 7, borderRadius: 7, background: on ? C.gold : C.border }} />
                    {T.timing[timing]}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: C.muted, marginTop: 9, fontStyle: "italic" }}>{words.idea}</div>
              </div>
            );
          })}
        </div>

        {/* ── WHAT A PARTNER SEES, MADE UP ────────────────────── */}
        <H2 tag={T.example}>{T.seeH}</H2>
        <Lead>{T.seeLead}</Lead>
        <div data-testid="business-partner-stats" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 40 }}>
          {T.stats.map(([n, what]) => (
            <div key={what}>
              <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold }}>{n}</div>
              <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{what}</div>
            </div>
          ))}
        </div>

        {/* ── JOIN ────────────────────────────────────────────── */}
        <div data-testid="business-join" style={{ ...card, border: `1px solid ${C.gold}88`, background: `${C.gold}12`, borderRadius: 16, padding: "18px 16px", marginBottom: 40 }}>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>{T.joinH}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: C.light, margin: "6px 0 14px" }}>{T.joinLead}</div>
          <a href={`mailto:hello@gemlyxtravel.com?subject=${encodeURIComponent(T.joinSubject)}`} data-testid="business-join-mail"
            style={{ display: "inline-block", background: C.gold, color: C.onGold, borderRadius: 12, padding: "11px 16px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            hello@gemlyxtravel.com
          </a>
        </div>

        <a href={KLAIPEDA_CENTRE_PATH} data-testid="business-centre-link"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, ...card, textDecoration: "none", marginBottom: 34 }}>
          <span>
            <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text }}>{T.centreH}</span>
            <span style={{ display: "block", fontSize: 12, color: C.muted, marginTop: 2 }}>{T.centreLead}</span>
          </span>
          <span style={{ color: C.gold, fontWeight: 700 }}>›</span>
        </a>

        <div style={{ fontSize: 11.5, lineHeight: 1.7, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>{T.foot}</div>
      </div>
    </div>
  );
};

export default KlaipedaBusiness;
