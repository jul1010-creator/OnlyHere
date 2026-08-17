import { C } from "../utils/theme";
import { storedJourney, journeyReach, journeyChanges, journeyBreakdown, journeyDriving, journeyStamp, legSteps, arrivalStop } from "../utils/journey";

// ── HOW YOU ACTUALLY GET THERE ────────────────────────────────────────
//
// Oliver, 16 Aug 2026, asking what the page needs. This is the thing that was
// already paid for and never shown to anybody.
//
// The drafting pipeline asks Google Directions for a full transit itinerary from
// central Copenhagen to every place it writes about, and since 13 August it has
// stored the whole measured shape of that trip on the row: every leg in order
// with its vehicle, its line and its two stops, the named interchange stations,
// the walk at both ends, the waiting, and the same trip by car. The comment on
// the writer says it is "reader-facing only when something chooses to render
// it". Nothing ever chose. Every entry drafted in the last three days has been
// carrying a real answer to the most common question a visitor to Denmark has,
// and showing it costs no API call, no research pass and no new data.
//
// WHAT THIS IS NOT. It is not live departures and it never claims to be. It is
// one measurement, on a named day, printed with that day attached, which is the
// same footing __hours and __ticket are stored on. A timetable stated as current
// without a date is the exact failure this codebase keeps finding in drafts:
// something true when it was written, quietly aging into something false.
//
// EVERY SENTENCE IS BUILT IN utils/journey.js AND ONLY LAID OUT HERE. The step
// list is legSteps, which the guide has used since 13 August off its own live
// measurement, so a leg reads the same in a guide and on a page. A figure that
// was not measured produces an empty string and simply has no line, so an entry
// with a thin journey looks thin rather than padded.
export const JourneyCard = ({ item }) => {
  const parts = storedJourney(item?.__journey);
  if (!parts) return null;

  const reach = journeyReach(parts);
  const stamp = journeyStamp(parts);
  // The stamp is the licence to print any of this, and storedJourney refuses a
  // journey with no date, so this is belt and braces on the one thing that must
  // not slip: no date, no card.
  if (!reach || !stamp) return null;

  const changes = journeyChanges(parts);
  const breakdown = journeyBreakdown(parts);
  const driving = journeyDriving(parts);
  const getOff = arrivalStop(parts);
  const steps = legSteps(parts);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
        Getting there
      </div>

      {/* The headline figure, with what it measures attached to it. A number
          this size reading as a train time is the misreading utils/journey.js
          exists because of. */}
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.5 }}>{reach}</div>
      {/* Joined with a separator rather than a full stop, because the change
          sentence can legitimately end in one: "Odense St." is the station's
          name and journeyChanges prints a name exactly as it was measured. */}
      <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginTop: 3 }}>
        {changes}
        {driving ? <span style={{ color: C.muted }}>{changes ? " · " : ""}About {driving}</span> : null}
      </div>
      {breakdown && (
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginTop: 3 }}>{breakdown}</div>
      )}

      {/* WHERE YOU GET OFF, which is the single most useful line here and the
          one a reader cannot get from a duration. It is the last leg's
          destination, so it is where the journey actually puts you down, not
          the nearest transit stop by distance: see arrivalStop for the ferry
          slip to two islands that answer once produced. */}
      {getOff && (
        <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.6, marginTop: 8 }}>
          You get off at <span style={{ fontWeight: 700 }}>{getOff}</span>.
        </div>
      )}

      {steps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
          {steps.map((st, i) => (
            <div key={`${st.kind}-${i}`} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12, lineHeight: 1.55 }}>
              <span style={{ fontSize: 11, opacity: 0.75 }}>
                {st.kind === "walk" ? "🚶" : st.kind === "wait" ? "⏱" : st.vehicle === "ferry" ? "⛴" : st.vehicle === "bus" ? "🚌" : st.vehicle === "metro" ? "🚇" : st.vehicle === "tram" ? "🚊" : "🚆"}
              </span>
              <span style={{ color: st.kind === "ride" ? C.light : C.muted, flex: 1 }}>
                {st.text}
                {st.mins ? <span style={{ color: C.muted }}> · {st.mins} min</span> : null}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* THE DATE, AND WHY IT IS THE LAST THING RATHER THAN THE FIRST. It is not
          a disclaimer to bury: it is what makes everything above it publishable,
          and a reader who has just read a route is standing exactly where they
          need to be told when somebody measured it. */}
      <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>{stamp}</div>
    </div>
  );
};
