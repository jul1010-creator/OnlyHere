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
const OptionRow = ({ label, count, active, disabled, multi, onClick }) => (
  <button onClick={disabled ? undefined : onClick} disabled={disabled}
    aria-pressed={active}
    style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      width: "100%", textAlign: "left", background: active ? `${C.gold}14` : "transparent",
      border: "none", borderRadius: 8, padding: "9px 11px",
      color: disabled ? C.muted : active ? C.gold : C.text,
      fontSize: 12.5, fontWeight: active ? 700 : 500,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
      fontFamily: "'Inter', sans-serif",
    }}>
    {/* A BOX FOR A MULTI FACET, A TICK FOR A SINGLE ONE. They behave
        differently — one adds to a selection, the other replaces it — and the
        control has to say which before it is pressed, not after. */}
    <span>{multi ? (active ? "\u2611 " : "\u2610 ") : (active ? "\u2713 " : "")}{label}</span>
    <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{count}</span>
  </button>
);

const Panel = ({ children, width = 240 }) => (
  <div style={{
    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 40,
    minWidth: width, maxWidth: "min(92vw, 340px)", maxHeight: 320, overflowY: "auto",
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: 6, boxShadow: "0 14px 40px rgba(0,0,0,0.55)",
  }}>
    {children}
  </div>
);

const Dropdown = ({ facet, items, facets, state, onChange, openKey, setOpenKey }) => {
  const open = openKey === facet.key;
  const ref = useCloseOnOutside(open, () => setOpenKey(null));
  const counts = facetCounts(items, facets, state, facet.key);
  const chips = appliedChips([facet], state);
  const isOn = chips.length > 0;
  // One value shows its own label; several show the facet plus a count, because
  // "Harbour, Village, Major city" does not fit on a phone and truncating it
  // hides which ones are on.
  const buttonLabel = !isOn ? facet.label
    : chips.length === 1 ? chips[0].label
    : `${facet.label} · ${chips.length}`;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpenKey(open ? null : facet.key)}
        aria-expanded={open}
        style={{ ...btn, padding: "9px 13px", background: "transparent",
          border: `1px solid ${isOn ? C.gold : C.border}`, color: isOn ? C.gold : C.text }}>
        {buttonLabel}
        <span style={{ fontSize: 9, opacity: 0.8 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <Panel>
          {(facet.options || []).map(o => (
            <OptionRow key={o.value} label={o.label} count={counts[o.value] ?? 0}
              multi={!!facet.multi && o.value !== "All"}
              active={isOptionOn(state, facet, o.value)}
              // "All" is never disabled: it is the way back out of a filter that
              // emptied the list, and disabling it would strand somebody there.
              disabled={o.value !== "All" && (counts[o.value] ?? 0) === 0}
              // A MULTI PANEL STAYS OPEN. Closing it after each tick makes
              // picking three types three round trips through the same button,
              // which is the thing "be able to choose more" is asking to avoid.
              onClick={() => {
                onChange(o.value === "All" ? clearFacet(state, facet.key) : toggleFacetValue(state, facet, o.value));
                if (!facet.multi || o.value === "All") setOpenKey(null);
              }} />
          ))}
        </Panel>
      )}
    </div>
  );
};

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
}) => {
  const [openKey, setOpenKey] = useState(null);
  const sortRef = useCloseOnOutside(openKey === "__sort", () => setOpenKey(null));
  const active = activeFacetCount(facets, state);
  const chips = appliedChips(facets, state);
  const sortLabel = (sortOptions.find(o => o.value === sort) || sortOptions[0] || {}).label || "";

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* The dark solid button, first, exactly as on Magasin. It carries the
            active count so a filtered list explains itself from the one control
            that is always on screen. */}
        {/* ── ONE CONTROL PER FACET, AND NO FILTER BUTTON ──────────
            Oliver, 19 Aug 2026, with the panel open over the row: "it makes no
            sense. you made it on multiple. Just remove the white filter thing
            and keep the two other sections."

            He is right and this is my second attempt at the same complaint. The
            first version put the sections INSIDE the Filter button and left the
            per-facet dropdowns on the row, so Date existed twice on one screen
            and tapping either moved the other. I then removed the dropdowns and
            kept the button, which is the other way of having one of each, and it
            buried Date and Type behind a tap for no gain.

            This is the version he asked for: Date and Type are the controls, on
            the row, where a tap opens the thing it is labelled with. The Filter
            button and its sheet are gone entirely, and with them the duplicated
            Order section, since the sort already lives on the line below and is
            not a filter.

            AND THE ROW STAYS SHORT. Oliver, in the same breath: "As long as
            there aren't 10.000 buttons and it is all filtered easily into
            drop-down." So a page declares which facets earn a control, with
            `primary`, and a page that declares none gets the first two rather
            than all of them: the long row is the thing being fixed, and a
            default should not quietly reintroduce it. */}
        {(facets.some(f => f.primary) ? facets.filter(f => f.primary) : facets.slice(0, 2)).map(f => (
          <Dropdown key={f.key} facet={f} items={items} facets={facets} state={state}
            onChange={onChange} openKey={openKey} setOpenKey={setOpenKey} />
        ))}
      </div>

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
