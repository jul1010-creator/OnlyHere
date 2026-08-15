import { C } from "../utils/theme";
import { getEventDate } from "../utils/helpers";

// ── "Worth knowing" event-match card, shown during the loading screen ──
// PASS 27 EXTRACTION (App.jsx file-split, per Oliver: "you gotta start
// splitting files, I'm scared you end up removing all our progress again").
// Mechanical, behavior-preserving move of the exact JSX/logic that used to
// live inline in GemlyxApp's render — same matching rules, same markup,
// just out of App.jsx and into its own file. Renders nothing (returns null)
// when there's no real match, exactly as before.
//
// Built PASS 26, per Oliver: "while loading, check if one of the events
// matches the date/category of what the traveller likes... have the event
// popping up as a blog in the left or right side." Only fires when the
// traveler filled in real dates via the structured intake fields
// (intakeArrival/intakeDeparture) — those are the one reliable,
// already-parsed date signal available here; a freeform chat mention of a
// date range isn't reliably extractable client-side without another AI
// call, so this honestly no-ops rather than guessing at a date from prose.
// Matches on: the event's date range genuinely overlapping the trip's date
// range, AND at least one picked interest appearing in the event's own
// tags/type. Never invents a match — if nothing real overlaps both ways,
// nothing shows, same graceful-degradation pattern as everything else in
// this build. "Read more" opens the real event's own DetailPage (via
// setEventDetail) — this is deliberately NOT a blocking mid-pipeline
// question; it surfaces the real event one tap away instead.
export const EventMatchCard = ({ intakeArrival, intakeDeparture, intakeInterest, events, majorEvents, vikingEvents, setEventDetail }) => {
  // Matching logic returns null (no card) when there's nothing real to show,
  // but the responsive <style> rule below still renders unconditionally,
  // same as the original inline version — it's harmless dead CSS when the
  // card itself isn't in the DOM, and keeping it unconditional here matches
  // the original App.jsx layout exactly (the <style> tag was a sibling of
  // the matching IIFE, not inside its early-return branches).
  let matchedEvent = null;
  if (intakeArrival && intakeDeparture) {
    const tripStart = new Date(intakeArrival);
    const tripEnd = new Date(intakeDeparture);
    if (!isNaN(tripStart) && !isNaN(tripEnd)) {
      const interestsLower = intakeInterest.map(i => i.toLowerCase());
      const pool = [...events, ...majorEvents, ...vikingEvents];
      const overlapsTrip = (e) => {
        const eStart = new Date(e.date);
        const eEnd = e.dateEnd ? new Date(e.dateEnd) : eStart;
        if (isNaN(eStart)) return false;
        return eStart <= tripEnd && eEnd >= tripStart;
      };
      const matchesInterest = (e) => {
        if (interestsLower.length === 0) return false;
        const haystack = [e.type || "", ...(e.tags || [])].join(" ").toLowerCase();
        return interestsLower.some(i => haystack.includes(i));
      };
      matchedEvent = pool.find(e => overlapsTrip(e) && matchesInterest(e)) || null;
    }
  }
  return (
    <>
      {matchedEvent && (
        <div onClick={e => e.stopPropagation()}
          style={{ position: "fixed", top: 90, right: 20, width: 240, background: C.surface, border: `1px solid ${C.gold}55`, borderRadius: 14, padding: 14, zIndex: 951, boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}
          className="gxa-event-match-card">
          <div style={{ fontSize: 9.5, fontWeight: 700, color: C.gold, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>✦ Worth knowing</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "linear-gradient(135deg, #16233F 0%, #0A0F1E 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {matchedEvent.photo ? (
                <img src={matchedEvent.photo} alt={matchedEvent.name} onError={ev => { ev.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 18 }}>{matchedEvent.emoji || "◆"}</span>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif", lineHeight: 1.2 }}>{matchedEvent.name}</div>
          </div>
          <div style={{ fontSize: 11, color: C.light, lineHeight: 1.5, marginBottom: 10 }}>
            {matchedEvent.town} · {getEventDate(matchedEvent.date, matchedEvent.dateEnd)} · happening while you're there.
          </div>
          <button onClick={() => setEventDetail(matchedEvent)}
            style={{ width: "100%", background: "none", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 100, padding: "6px 0", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            Read more
          </button>
        </div>
      )}
      <style>{`
        @media (max-width: 899px) {
          .gxa-event-match-card { position: static !important; width: auto !important; max-width: 460px; margin: 0 auto 16px !important; }
        }
      `}</style>
    </>
  );
};
