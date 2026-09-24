import { PAGER_MODES, pagerLabel, canStep } from "../utils/dayPager";

// ── THE CONTROL, AND THE CONTROL ONLY ───────────────────────────────
//
// Oliver, 24 Sep 2026: "Make a 'swipe through' option. Because some people
// might hate a long page of days and trips."
//
// The days themselves stay where they are. This draws the switch above them
// and the arrows beneath, and the page decides which day to render: a
// component that owned the days would have to own their weather, their legs,
// their stay cards and their add-in panels, which is the whole of the page.
//
// NO SENTENCE UNDER EITHER BUTTON. Oliver, 21 Aug 2026: "No reason to explain
// why we need country and gender and what not." A pair of labelled buttons is
// the whole of this control, and "switch between views" under it would be the
// page reading its own interface aloud.
export const GuideDayPager = ({ mode = "all", onMode, C, count = 0, at = 0, dayNo = null, onStep }) => {
  if (!count) return null;
  const one = mode === "one";
  const pill = (on) => ({
    background: on ? `${C.gold}26` : C.bg,
    border: `1px solid ${on ? C.gold : `${C.gold}55`}`,
    color: on ? C.gold : C.text,
    borderRadius: 100, padding: "7px 14px", fontSize: 12.5, fontWeight: 700,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
  });
  const arrow = (live) => ({
    background: "none", border: `1px solid ${live ? `${C.gold}66` : C.border}`,
    color: live ? C.gold : C.muted, borderRadius: 100, width: 38, height: 38,
    fontSize: 15, cursor: live ? "pointer" : "default", fontFamily: "'Inter', sans-serif",
  });
  const back = canStep(at, -1, count);
  const on = canStep(at, 1, count);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PAGER_MODES.map(m => (
          <button key={m.key} onClick={() => onMode && onMode(m.key)} style={pill(mode === m.key)}
            aria-pressed={mode === m.key}>
            {m.label}
          </button>
        ))}
      </div>
      {/* ── AND THE ARROWS, BECAUSE A DESKTOP HAS NO THUMB ──────────
          The swipe is the point of this view and it only exists on a
          touchscreen. A reader on a laptop gets the same view and no way
          through it unless the arrows are here, so they are not a fallback,
          they are the other half of the control. */}
      {one && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <button onClick={() => back && onStep && onStep(-1)} disabled={!back} style={arrow(back)} aria-label="Previous day">‹</button>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.light, minWidth: 92, textAlign: "center" }}>
            {pagerLabel(at, count, { dayNo })}
          </div>
          <button onClick={() => on && onStep && onStep(1)} disabled={!on} style={arrow(on)} aria-label="Next day">›</button>
        </div>
      )}
    </div>
  );
};
