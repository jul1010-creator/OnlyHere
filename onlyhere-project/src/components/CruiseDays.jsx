// ── SHIPS COMING IN ─────────────────────────────────────────────────
// The next cruise days in Klaipėda, each with its ships, their hours and
// about how many guests they carry (utils/cruiseDays.js). On the QR walk page
// for visitors, and in the Lithuanian Studio, where it is the line Oliver can
// show a café: "Friday morning, about 2,600 people come off the ships."
import { C } from "../utils/theme";
import { t as uiT } from "../utils/uiLanguage";
import { cruiseDaysAhead, aboutGuests } from "../utils/cruiseDays";
import { CRUISE_ZONE } from "../data/klaipedaCruises";
import { placeDate } from "../utils/offerClock";

const LOCALE = { en: "en-GB", da: "da-DK", de: "de-DE", lt: "lt-LT" };
const dayWords = (day, lang) => {
  try {
    return new Intl.DateTimeFormat(LOCALE[lang] || "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
  } catch { return day; }
};

export const CruiseDays = ({ lang = "en", count = 4, compact = false }) => {
  const days = cruiseDaysAhead(new Date(), count);
  if (!days.length) return null;
  const today = placeDate(new Date(), CRUISE_ZONE);
  const fill = (s, v) => Object.entries(v).reduce((o, [k, x]) => o.split(`{${k}}`).join(String(x)), s);
  return (
    <div data-testid="cruise-days" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: compact ? "10px 12px" : "13px 15px", marginBottom: compact ? 8 : 28 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 0.6, marginBottom: 8 }}>🚢 {uiT("ships.title", lang)}</div>
      {days.map(d => (
        <div key={d.day} data-testid="cruise-day" style={{ display: "flex", gap: 10, fontSize: 13, color: C.light, lineHeight: 1.55, padding: "3px 0" }}>
          <div style={{ minWidth: 92, fontWeight: 700, color: d.day === today ? C.gold : C.text }}>{d.day === today ? uiT("ships.today", lang) : dayWords(d.day, lang)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {d.calls.map(c => <div key={`${c.ship}${c.arrives}`}><strong style={{ color: C.text }}>{c.ship}</strong> · {c.arrives}-{c.leaves}</div>)}
            {d.guests > 0 && <div style={{ fontSize: 12, color: C.muted }}>{fill(uiT("ships.guests", lang), { n: aboutGuests(d.guests, lang) })}</div>}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 6 }}>{uiT("ships.source", lang)}</div>
    </div>
  );
};

export default CruiseDays;
