import { useState, useEffect, useRef } from "react";
import { C } from "../utils/theme";
import { facetCounts, appliedChips, activeFacetCount, clearFacet, clearAllFacets, toggleFacetValue, isOptionOn } from "../utils/listControls";

// ── "THE FILTER GOTTA BE MADE LIKE THIS FILTER ON MAGASIN" ───────────
//
// Oliver, 15 Aug 2026, with a screenshot of magasin.dk beside one of his own
// Events tab. Then, on the Magasin one: "Looks more professionel."
//
// What his page was doing: three labelled rows of pills, DATE with six, TYPE
// with five, ORDER with two, all permanently expanded, for FOURTEEN events. On
// a phone that is the whole first screen spent on machinery for a list you
// could have read by scrolling twice.
//
// What Magasin does, and it is worth naming precisely rather than copying a
// vibe:
//
//   one dark Filter button, then one dropdown per facet, on a single row
//   the result count on the left, underneath, as plain text
//   "Sortér efter" on the RIGHT of that same line, away from the filters
//
// That last one is the part most rebuilds get wrong. A sort is not a filter: it
// changes the order of what you are looking at and never the contents, so
// putting it in the filter row teaches people it removes things. listControls.js
// already says this in its own words, in the comment on clearAllFacets, and the
// old ORDER row sat directly under TYPE looking exactly like one more filter.
//
// ── WHY THIS IS ITS OWN COMPONENT ───────────────────────────────────
// Events, Attractions, Food and Nightlife all carry the same rows of pills, and
// his answer on scope was "Events first, then decide". A shared component means
// deciding later costs one line per tab instead of a second rebuild, and it
// means the four cannot drift into four slightly different filters, which is
// the shape this codebase repeats more than any other.
//
// ── AND THE MACHINERY WAS ALREADY WRITTEN ───────────────────────────
// utils/listControls.js has had applyFacets, facetCounts, appliedChips and
// clearAllFacets since 9 Aug, built for exactly this, with a comment saying the
// sheet was deliberately not built yet because the page had nine items. It has
// fourteen now. This is that sheet, and nothing here re-implements a rule that
// file already owns: the counts come from facetCounts, which excludes each
// facet from its own count, so picking August does not report zero for
// September.

const btn = {
  display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
  fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0,
  borderRadius: 10, fontSize: 12.5, fontWeight: 600, transition: "all 0.16s ease",
};

// One panel open at a time, and a click anywhere else shuts it. Two open
// dropdowns overlapping each other is the thing that makes a filter row feel
// broken rather than busy.
const useCloseOnOutside = (open, close) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return ref;
};

// ── AN OPTION THAT WOULD EMPTY THE LIST SAYS SO ─────────────────────
// Disabled, never hidden. listControls.js: "an option that vanishes and
// reappears as you tap makes the sheet jump under your thumb." A zero here is a
// true statement about the data, which is worth being able to read.
// ── ONE WAY TO FILTER, ON EVERY PAGE ─────────────────────────────────
//
// Oliver, 28 Sep 2026, after the navigation review found three filter styles
// across the site: "Just fix it all". Towns, Islands and Cheap gems already
// had the shape he asked for on 27 Sep, "put filters into the position under
// the text bar": a search box, a Filters button beside it, and the panel
// opening straight underneath with every filter as a row of choices. This
// component now draws that same shape, so Attractions, Events and Food match
// the other three. The count of what is applied sits on the button, the sort
// and the removable chips stay on the line below.
const Chip = ({ label, count, active, disabled, multi, onClick }) => (
  <button onClick={disabled ? undefined : onClick} disabled={disabled} aria-pressed={active}
    style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: active ? C.text : "transparent",
      color: disabled ? C.muted : active ? C.bg : C.light,
      border: `1px solid ${active ? C.text : C.border}`,
      borderRadius: 100, padding: "7px 14px", fontSize: 12.5, fontWeight: active ? 700 : 500,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
      fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0,
    }}>
    {multi && active ? "✓ " : ""}{label}{count != null ? ` (${count})` : ""}
  </button>
);

export const FilterBar = ({
  items = [],           // everything before any facet applies
  shown = 0,            // how many survive the current facets
  noun = "results",
  facets = [],
  state = {},
  onChange = () => {},
  sort = "",
  sortOptions = [],
  onSort = () => {},
  // The page's own search, drawn in the row with the Filters button. Left
  // out, the row is the button alone.
  search = null,
  onSearch = null,
  searchPlaceholder = "Search",
}) => {
  const [openKey, setOpenKey] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const sortRef = useCloseOnOutside(openKey === "__sort", () => setOpenKey(null));
  const active = activeFacetCount(facets, state);
  const chips = appliedChips(facets, state);
  const sortLabel = (sortOptions.find(o => o.value === sort) || sortOptions[0] || {}).label || "";

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onSearch && (
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.muted, pointerEvents: "none" }}>⌕</span>
            <input value={search || ""} onChange={e => onSearch(e.target.value)} placeholder={searchPlaceholder}
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: "9px 34px 9px 30px", fontSize: 12.5, color: C.text, outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }} />
            {search && (
              <button onClick={() => onSearch("")} aria-label="Clear search"
                style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, fontSize: 15, cursor: "pointer", lineHeight: 1 }}>×</button>
            )}
          </div>
        )}
        {facets.length > 0 && (
          <button onClick={() => setPanelOpen(o => !o)} aria-expanded={panelOpen}
            style={{ background: panelOpen || active ? `${C.gold}1a` : "none", border: `1px solid ${active ? C.gold : C.border}`, color: active ? C.gold : C.light, borderRadius: 100, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "'Inter', sans-serif" }}>
            Filters{active ? ` · ${active}` : ""}
          </button>
        )}
      </div>

      {/* The panel opens straight under the row, every filter as a row of
          choices with how many each would leave, counted with the other
          filters applied. A choice that would empty the list is greyed rather
          than hidden, and All is never greyed: it is the way back out. */}
      {panelOpen && facets.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 15px", marginTop: 10 }}>
          {facets.map(f => {
            const counts = facetCounts(items, facets, state, f.key);
            return (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 7 }}>{f.label}</div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {(f.options || []).map(o => {
                    const all = o.value === "All";
                    const n = counts[o.value] ?? 0;
                    return (
                      <Chip key={o.value} label={o.label} count={all ? null : n}
                        multi={!!f.multi && !all}
                        active={isOptionOn(state, f, all ? null : o.value)}
                        disabled={!all && n === 0 && !isOptionOn(state, f, o.value)}
                        onClick={() => onChange(all ? clearFacet(state, f.key) : toggleFacetValue(state, f, o.value))} />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── THE COUNT, AND THE SORT ON THE OTHER SIDE ──────────────
          One line, count left, sort right, the way the screenshot has it. The
          sort is deliberately not in the row above: it changes the ORDER of
          what you are looking at and never the contents, and a control that
          sits among the filters teaches people it removes things. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ fontSize: 12.5, color: C.muted }}>
          {shown === items.length
            ? `${shown} ${shown === 1 ? noun.replace(/s$/, "") : noun}`
            : `${shown} of ${items.length} ${noun}`}
        </div>
        {sortOptions.length > 1 && (
          <div ref={sortRef} style={{ position: "relative" }}>
            <button onClick={() => setOpenKey(openKey === "__sort" ? null : "__sort")}
              aria-expanded={openKey === "__sort"}
              style={{ ...btn, padding: "7px 11px", background: "transparent", border: "none", color: C.text }}>
              <span style={{ color: C.muted, fontWeight: 500 }}>Sort by:</span> {sortLabel}
              <span style={{ fontSize: 9, opacity: 0.8 }}>{openKey === "__sort" ? "▲" : "▼"}</span>
            </button>
            {openKey === "__sort" && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 40, minWidth: 180, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 6, boxShadow: "0 14px 40px rgba(0,0,0,0.55)" }}>
                {sortOptions.map(o => (
                  <button key={o.value} onClick={() => { onSort(o.value); setOpenKey(null); }}
                    style={{ display: "block", width: "100%", textAlign: "left", background: o.value === sort ? `${C.gold}14` : "transparent", border: "none", borderRadius: 8, padding: "9px 11px", color: o.value === sort ? C.gold : C.text, fontSize: 12.5, fontWeight: o.value === sort ? 700 : 500, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    {o.value === sort ? "✓ " : ""}{o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── WHAT IS APPLIED, WHERE IT CAN BE READ AND REMOVED ──────
          Baymard's ninth mobile practice and the one 66% of sites miss, quoted
          in listControls.js when appliedChips was written. Without it somebody
          who has scrolled past the controls cannot tell why the list is short,
          so they reopen the panel just to look, or decide the site is empty. */}
      {chips.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {chips.map(c => (
            <button key={`${c.key}:${c.value}`}
              // ONE VALUE, not the whole facet. With three types ticked, a chip
              // that cleared the facet would remove two filters the reader never
              // pointed at.
              onClick={() => onChange(toggleFacetValue(state, facets.find(f => f.key === c.key), c.value))}
              aria-label={`Remove the ${c.facet} filter`}
              style={{ ...btn, padding: "5px 11px", background: `${C.gold}12`, border: `1px solid ${C.gold}55`, color: C.gold, fontSize: 11.5, fontWeight: 700, borderRadius: 100 }}>
              {c.label} <span style={{ opacity: 0.75 }}>✕</span>
            </button>
          ))}
          {chips.length > 1 && (
            <button onClick={() => onChange(clearAllFacets(facets, state))}
              style={{ ...btn, padding: "5px 4px", background: "none", border: "none", color: C.muted, fontSize: 11.5, textDecoration: "underline" }}>
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
};
