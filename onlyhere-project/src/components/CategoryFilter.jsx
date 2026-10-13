// ── THE ROUND FILTERS, THE WAY LIDL SHOWS ITS DEPARTMENTS ───────────
//
// Oliver, 14 Oct 2026, with lidl.dk's row of coloured circles: "Make it like
// this. With nightlife, attractions, renting, and restaurants." And "we need
// 'ticking off' filters": each circle is ticked on or off, more than one at a
// time, and none ticked shows everything. A ticked circle gets a ring and a
// tick; the others fade while something is ticked, so it is plain what is
// being shown.
//
// The drawings are simple line icons in white on the category's colour, drawn
// here rather than emoji so they look the same on every phone. Functions, so
// nothing is drawn when the file is only imported.
import { C } from "../utils/theme";
import { DEAL_CATEGORIES, CATEGORY_COLOUR } from "../utils/dealCategories";

const stroke = { fill: "none", stroke: "#FFFFFF", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
export const CATEGORY_ICON = {
  // Fork and knife.
  restaurants: () => (
    <g {...stroke}>
      <path d="M9 4v7a2 2 0 0 0 2 2v7" /><path d="M7 4v5" /><path d="M11 4v5" /><path d="M13 4v5" />
      <path d="M18 20V4c-1.8 0-3 2.2-3 5.5V12h3" />
    </g>
  ),
  // A cocktail glass.
  nightlife: () => (
    <g {...stroke}>
      <path d="M4 5h16l-8 8z" /><path d="M12 13v7" /><path d="M8 20h8" /><path d="M15 3l2 2" />
    </g>
  ),
  // A landmark with columns.
  attractions: () => (
    <g {...stroke}>
      <path d="M3 9l9-5 9 5" /><path d="M4 9h16" /><path d="M6 9v8" /><path d="M10 9v8" /><path d="M14 9v8" /><path d="M18 9v8" /><path d="M3 20h18" /><path d="M4 17h16" />
    </g>
  ),
  // A key.
  rentals: () => (
    <g {...stroke}>
      <circle cx="8" cy="12" r="4" /><path d="M12 12h9" /><path d="M18 12v3" /><path d="M21 12v2" />
    </g>
  ),
};

export const CategoryFilter = ({ picked, onToggle, onClear = null, label = (k) => k, clearLabel = "Clear" }) => {
  const any = picked.size > 0;
  return (
    <div data-testid="deals-categories">
      <div role="group" aria-label="Kinds of place" style={{ display: "grid", gridTemplateColumns: `repeat(${DEAL_CATEGORIES.length}, minmax(0, 1fr))`, gap: 8 }}>
        {DEAL_CATEGORIES.map(k => {
          const on = picked.has(k);
          return (
            <button key={k} type="button" role="checkbox" aria-checked={on} onClick={() => onToggle(k)} data-testid={`deals-cat-${k}`}
              style={{ background: "none", border: "none", padding: "4px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: "'Inter', sans-serif", opacity: any && !on ? 0.42 : 1, transition: "opacity .15s" }}>
              <span style={{ position: "relative", width: 64, height: 64, borderRadius: "50%", background: CATEGORY_COLOUR[k], display: "flex", alignItems: "center", justifyContent: "center", boxShadow: on ? `0 0 0 3px ${C.bg}, 0 0 0 5px ${C.text}` : "none", transition: "box-shadow .15s" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">{CATEGORY_ICON[k]()}</svg>
                {on && (
                  <span aria-hidden="true" data-testid={`deals-cat-${k}-tick`} style={{ position: "absolute", right: -3, bottom: -3, width: 22, height: 22, borderRadius: "50%", background: C.gold, color: C.onGold, border: `2px solid ${C.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, lineHeight: 1 }}>✓</span>
                )}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? C.text : C.light, textAlign: "center", lineHeight: 1.25 }}>{label(k)}</span>
            </button>
          );
        })}
      </div>
      {any && onClear && (
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <button type="button" onClick={onClear} data-testid="deals-cat-clear" style={{ background: "none", border: "none", color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline", fontFamily: "'Inter', sans-serif" }}>{clearLabel}</button>
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
