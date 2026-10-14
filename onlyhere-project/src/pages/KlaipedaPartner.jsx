// ── A PARTNER'S OWN NUMBERS, FROM A PRIVATE LINK ────────────────────
//
// Oliver, 12 Oct 2026: real numbers for a business, with no account. Studio
// makes the link (the offer editor, "Partner link"); whoever has it sees what
// their place brought in the last 30 days. Nothing here names a visitor.
// See utils/partnerStats.js for what is counted.
import { useEffect, useState } from "react";
import { C } from "../utils/theme";
import { KlaipedaTop, keepOutOfSearch } from "../components/KlaipedaTop";
import { currentUiLanguage } from "../utils/uiLanguage";
import { BUSINESS_LANGS, businessLang } from "./KlaipedaBusiness";

export const PARTNER_TEXT = {
  en: {
    title: "Your place on Gemlyx · Gemlyx",
    eyebrow: "Your numbers",
    lead: "The last 30 days, counted with no names and no accounts.",
    walks: "walks it was in", deals: "times your offer was shown", reached: "visitors who walked to you", redeemed: "times a visitor opened your offer to redeem it",
    busiest: "your busiest hour", hour: "{from} to {to}",
    byDay: "Day by day", walksShort: "walks", dealsShort: "offer shown", reachedShort: "came", redeemedShort: "opened to redeem",
    none: "No walks with your place yet. The numbers fill in as visitors walk.",
    loading: "Loading your numbers.",
    bad: "This link does not work. Ask Gemlyx for a new one.",
    error: "The numbers could not be loaded just now. Try again in a moment.",
    keep: "Keep this link to yourself: anyone who has it can see these numbers.",
    foot: "A walk counts when a visitor is shown it with your place in it. A visit counts when their phone says they reached you, or, without GPS, when they move on from your place. An opened offer counts when a visitor taps Redeem offer to show it at your counter. The counts are approximate: they are not checked against a booking or a payment, and a day is a Copenhagen day. Counts are kept for 30 days.",
  },
  lt: {
    title: "Jūsų vieta Gemlyx · Gemlyx",
    eyebrow: "Jūsų skaičiai",
    lead: "Paskutinės 30 dienų, suskaičiuota be vardų ir be paskyrų.",
    walks: "maršrutų su jūsų vieta", deals: "kartų parodytas jūsų pasiūlymas", reached: "lankytojų atėjo pas jus", redeemed: "kartų lankytojas atidarė jūsų pasiūlymą, kad juo pasinaudotų",
    busiest: "judriausia jūsų valanda", hour: "nuo {from} iki {to}",
    byDay: "Pagal dienas", walksShort: "maršrutai", dealsShort: "pasiūlymas parodytas", reachedShort: "atėjo", redeemedShort: "atidarė pasinaudoti",
    none: "Maršrutų su jūsų vieta dar nėra. Skaičiai atsiras, kai lankytojai vaikščios.",
    loading: "Kraunami jūsų skaičiai.",
    bad: "Ši nuoroda neveikia. Paprašykite Gemlyx naujos.",
    error: "Šiuo metu skaičių įkelti nepavyko. Pabandykite po akimirkos.",
    keep: "Šią nuorodą laikykite sau: kas ją turi, gali matyti šiuos skaičius.",
    foot: "Maršrutas skaičiuojamas, kai jis su jūsų vieta parodomas lankytojui. Apsilankymas skaičiuojamas, kai lankytojo telefonas rodo, kad jis pasiekė jūsų vietą, arba, be GPS, kai jis eina toliau. Atidarytas pasiūlymas skaičiuojamas, kai lankytojas paspaudžia „Pasinaudoti pasiūlymu“, kad parodytų jį prie jūsų kasos. Skaičiai apytiksliai: jie netikrinami pagal užsakymą ar mokėjimą, o diena skaičiuojama Kopenhagos laiku. Skaičiai saugomi 30 dienų.",
  },
};

const fill = (t, v) => String(t).replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));
const two = (h) => `${String(h % 24).padStart(2, "0")}:00`;
const DAY_LOCALE = { en: "en-GB", lt: "lt-LT" };
const dayLabel = (day, lang) => {
  try { return new Intl.DateTimeFormat(DAY_LOCALE[lang] || "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`)); } catch { return day; }
};

export const KlaipedaPartner = () => {
  const [lang, setLang] = useState(() => businessLang(typeof window !== "undefined" ? window.location.search : "", currentUiLanguage()));
  const T = PARTNER_TEXT[lang] || PARTNER_TEXT.en;
  useEffect(() => keepOutOfSearch(T.title), [lang]);
  const pick = (l) => {
    setLang(l);
    try { const u = new URL(window.location.href); u.searchParams.set("lang", l); window.history.replaceState(null, "", u.toString()); } catch { /* old browser */ }
  };
  const [state, setState] = useState({ phase: "loading", data: null });
  useEffect(() => {
    let gone = false;
    const k = (() => { try { return new URLSearchParams(window.location.search).get("k") || ""; } catch { return ""; } })();
    if (!k) { setState({ phase: "bad", data: null }); return undefined; }
    (async () => {
      try {
        const r = await fetch(`/api/partner-stats?k=${encodeURIComponent(k)}`);
        if (gone) return;
        if (r.status === 404) { setState({ phase: "bad", data: null }); return; }
        if (!r.ok) { setState({ phase: "error", data: null }); return; }
        const data = await r.json();
        if (!gone) setState({ phase: "ok", data });
      } catch { if (!gone) setState({ phase: "error", data: null }); }
    })();
    return () => { gone = true; };
  }, []);

  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 15px" };
  const d = state.data;
  const totals = { walks: 0, deals: 0, reached: 0, redeemed: 0, ...(d?.totals || {}) };
  const days = Array.isArray(d?.byDay) ? [...d.byDay].reverse() : [];

  return (
    <div lang={lang} style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 16px 64px" }}>
        <KlaipedaTop side="business" lang={lang} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.6, textTransform: "uppercase" }}>{T.eyebrow}</div>
          <div role="group" aria-label="Language" style={{ display: "inline-flex", border: `1px solid ${C.border}`, borderRadius: 100, padding: 2, flex: "0 0 auto" }}>
            {BUSINESS_LANGS.map(l => (
              <button key={l} onClick={() => pick(l)} aria-pressed={l === lang}
                style={{ background: l === lang ? C.gold : "transparent", color: l === lang ? C.onGold : C.light, border: "none", borderRadius: 100, padding: "4px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {state.phase === "loading" && <p data-testid="partner-loading" style={{ fontSize: 14, color: C.muted }}>{T.loading}</p>}
        {state.phase === "bad" && <p data-testid="partner-bad" style={{ fontSize: 15, color: C.light, lineHeight: 1.6 }}>{T.bad}</p>}
        {state.phase === "error" && <p data-testid="partner-error" style={{ fontSize: 15, color: C.light, lineHeight: 1.6 }}>{T.error}</p>}

        {state.phase === "ok" && (
          <>
            <h1 style={{ fontSize: 34, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.12, margin: "0 0 10px", overflowWrap: "anywhere" }}>{d.name || d.id}</h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.light, margin: "0 0 22px" }}>{T.lead}</p>

            <div data-testid="partner-totals" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 14 }}>
              {[[totals.walks, T.walks], [totals.deals, T.deals], [totals.redeemed, T.redeemed], [totals.reached, T.reached]].map(([n, what]) => (
                <div key={what}>
                  <div style={{ fontSize: 26, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold }}>{n}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{what}</div>
                </div>
              ))}
            </div>

            {d.busiest && (
              <div data-testid="partner-busiest" style={{ ...card, marginBottom: 14 }}>
                <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold }}>{fill(T.hour, { from: two(d.busiest.hour), to: two(d.busiest.hour + 1) })}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{T.busiest}</div>
              </div>
            )}

            {totals.walks === 0 && totals.reached === 0 && totals.deals === 0 && totals.redeemed === 0 ? (
              <p data-testid="partner-none" style={{ fontSize: 13.5, color: C.light, lineHeight: 1.6, margin: "6px 0 24px" }}>{T.none}</p>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: "8px 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>{T.byDay}</div>
                <div data-testid="partner-days" style={{ ...card, padding: "4px 15px" }}>
                  {days.map((x, i) => (
                    <div key={x.day} style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", alignItems: "baseline", padding: "9px 0", borderBottom: i < days.length - 1 ? `1px solid ${C.border}` : "none", fontSize: 13 }}>
                      <span style={{ minWidth: 92, fontWeight: 700, color: C.text }}>{dayLabel(x.day, lang)}</span>
                      <span style={{ color: C.light }}>{x.walks} {T.walksShort}</span>
                      {x.deals > 0 && <span style={{ color: C.light }}>{x.deals} {T.dealsShort}</span>}
                      {x.redeemed > 0 && <span style={{ color: C.light }}>{x.redeemed} {T.redeemedShort}</span>}
                      <span style={{ color: C.gold, fontWeight: 700 }}>{x.reached} {T.reachedShort}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: "0 0 8px" }}>{T.keep}</p>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: 0 }}>{T.foot}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default KlaipedaPartner;
