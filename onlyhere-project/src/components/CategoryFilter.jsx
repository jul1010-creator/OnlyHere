// ── THE ROUND FILTERS, THE WAY LIDL SHOWS ITS DEPARTMENTS ───────────
//
// Oliver, 14 Oct 2026, with lidl.dk's row of coloured circles: "Make it like
// this. With nightlife, attractions, renting, and restaurants."
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

// ── ONE AT A TIME, NO TICKS ─────────────────────────────────────────
// Oliver, 14 Oct 2026: "Don't have those tick-offs. Let it be seperate
// navigations. And let change be fades", then "keep the round ones like
// before. Just avoid having them be tick-offs. So it's filters/navigations."
// So the row of circles stays where it was, and a tap shows that one kind of
// place on its own (a ring says which); tapping it again shows them all.
export const CategoryNav = ({ active = null, onPick, label = (k) => k }) => (
  <nav aria-label="Kinds of place" data-testid="deals-categories"
    style={{ display: "grid", gridTemplateColumns: `repeat(${DEAL_CATEGORIES.length}, minmax(0, 1fr))`, gap: 8 }}>
    {DEAL_CATEGORIES.map(k => {
      const on = active === k;
      return (
        <button key={k} type="button" onClick={() => onPick(k)} aria-current={on ? "page" : undefined} data-testid={`deals-cat-${k}`}
          style={{ background: "none", border: "none", padding: "4px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: "'Inter', sans-serif" }}>
          <span style={{ borderRadius: "50%", boxShadow: on ? `0 0 0 3px ${C.bg}, 0 0 0 5px ${C.text}` : "none", transition: "box-shadow .2s ease" }}>
            <CategoryCircle k={k} size={64} />
          </span>
          <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 600, color: on ? C.text : C.light, textAlign: "center", lineHeight: 1.25, textShadow: `0 1px 6px ${C.bg}, 0 0 2px ${C.bg}` }}>{label(k)}</span>
        </button>
      );
    })}
  </nav>
);

export const CategoryCircle = ({ k, size = 64 }) => (
  <span aria-hidden="true" style={{ width: size, height: size, flex: "0 0 auto", borderRadius: "50%", background: CATEGORY_COLOUR[k], display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
    <svg width={Math.round(size * 0.47)} height={Math.round(size * 0.47)} viewBox="0 0 24 24">{CATEGORY_ICON[k]()}</svg>
  </span>
);

export default CategoryNav;
