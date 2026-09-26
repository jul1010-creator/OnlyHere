import { useState } from "react";
import { C } from "../utils/theme";
import { figureAges, figureAgeNote, FIGURE_LIFE } from "../utils/figureAge";

// ── WHICH CHECKED FIGURES ARE GOING OLD ─────────────────────────────
//
// The Studio half of utils/figureAge.js. Reads nothing and writes nothing: a
// stale figure is fixed by opening its source and changing the number and its
// date in the file together, which is a person's job, because the whole point
// of the figure is that a person read it.
//
// `today` is a prop rather than a clock read, so tests/render.mjs can draw the
// panel on the day the figures were checked and again a year later.
export const FigureAgePanel = ({ today = new Date() }) => {
  const [open, setOpen] = useState(false);
  const rows = figureAges(today);
  const stale = rows.filter(r => r.stale !== false);
  const shown = open ? rows : stale;
  return (
    <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12, padding: "14px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>📅 How old the checked figures are</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{figureAgeNote(today)}</div>
        </div>
        <button onClick={() => setOpen(o => !o)}
          style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 10, padding: "8px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
          {open ? "Only the old ones" : `All ${rows.length}`}
        </button>
      </div>
      {shown.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {shown.map(r => (
            <div key={r.id} style={{ fontSize: 11.5, color: C.text, display: "flex", justifyContent: "space-between", gap: 10, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
              <div>
                <div style={{ fontWeight: 700, color: r.stale ? "#FFB347" : C.text }}>{r.label}</div>
                <div style={{ color: C.muted, fontSize: 10.5 }}>
                  {r.days == null ? "No readable date" : `Checked ${r.checkedAt}, ${r.days} ${r.days === 1 ? "day" : "days"} ago, holds ${FIGURE_LIFE[r.kind]}`} · {r.where}
                </div>
              </div>
              {r.source && (
                <a href={r.source} target="_blank" rel="noopener noreferrer"
                  style={{ color: C.gold, fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>Source</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
