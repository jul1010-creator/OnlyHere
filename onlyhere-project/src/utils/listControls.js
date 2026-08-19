// ── "I AM NOT SATISFIED WITH THE FILTERS" ───────────────────────────
//
// Oliver, 9 Aug 2026, on the Attractions page: "This will become an issue down
// the line. Especially on phone. Search the internet through clothing websites,
// those often have good filters, and then come up with your suggestions."
//
// What that page was doing: six labelled groups (CITY, PRICE, CRAFT, POPULARITY,
// SPEED, SORT), around twenty-five pills, permanently expanded, roughly 430
// pixels of controls before a single card. For NINE places. On a phone that is
// the entire first screen spent on machinery for a list you could have read.
//
// ── WHAT THE CLOTHING SITES ACTUALLY DO ─────────────────────────────
// Two buttons, Filter and Sort, in a sticky bar. Everything else lives in a
// sheet. Applied filters come back as removable chips above the results, each
// option carries the count it would produce, and the apply button says how many
// items you are about to see. Baymard's benchmark backs every part of it: 66% of
// mobile sites fail to show an applied-filters overview, and horizontal toolbars
// stop scaling past six to eight filter types because users miss the "all
// filters" button that the overflow gets hidden behind.
//
// ── BUT COPYING ASOS WOULD BE THE WRONG ANSWER ──────────────────────
// ASOS has a hundred thousand products. This page has nine, and the whole site
// has 78 published rows. A filter can only ever REMOVE things from a list, so on
// a list you can read in one screen every filter control is pure cost: it takes
// space, it takes a tap, and the best case is it saves you a scroll you were
// going to do anyway. Building the full sheet today would make the nine-item
// page worse in exchange for a page that does not exist yet.
//
// So the threshold is the design. Below it, a search box and a sort, nothing
// else. Above it, the sheet. The page grows into its controls instead of wearing
// them early, and neither state needs a rewrite to become the other.
//
// ── AND IT KEYS ON THE UNFILTERED TOTAL ─────────────────────────────
// This is the one thing that must not be got wrong, and the obvious
// implementation gets it wrong. If the decision reads the FILTERED count, then
// narrowing a 40-item list down to 6 hides the controls that did the narrowing,
// stranding the user in a list they cannot widen again and cannot explain. The
// count that decides is the count before any facet applies.

export const FILTER_THRESHOLD = 14;

// totalUnfiltered, not the visible count. See above.
export const showFilters = (totalUnfiltered, threshold = FILTER_THRESHOLD) =>
  Number(totalUnfiltered) > Number(threshold);

// A facet is declared once and read by everything here:
//   { key, label, options: [{ value, label }], test: (item, value) => boolean }
// "All" and null both mean "not filtering on this", so a facet the user has not
// touched costs nothing and appears nowhere.
const isSet = (v) => Array.isArray(v)
  ? v.some(x => x != null && x !== "" && x !== "All")
  : (v != null && v !== "" && v !== "All");

// ── PICKING MORE THAN ONE ───────────────────────────────────────────
// Oliver, 19 Aug 2026, on the filter sections: "Section 2 (be able to choose
// more): type of food/attraction/town". A facet declaring `multi: true` holds an
// ARRAY, and everything in this file reads both shapes, so a page can turn one
// facet multi without touching any of the others.
//
// OR WITHIN A FACET, AND WITHIN A FACET ONLY. Ticking Harbour and Village means
// "either of those", because a town cannot be both and AND would return nothing
// every time — the classic faceted-search mistake that makes a filter look
// broken rather than empty. Across facets it stays AND: Harbour on Funen means
// both, which is what somebody picking two different questions is asking.
export const selectedValues = (v) => (Array.isArray(v) ? v : [v])
  .filter(x => x != null && x !== "" && x !== "All");

export const applyFacets = (items, facets, state) =>
  (Array.isArray(items) ? items : []).filter(item =>
    (Array.isArray(facets) ? facets : []).every(f => {
      const v = (state || {})[f.key];
      if (!isSet(v)) return true;
      return selectedValues(v).some(one => f.test(item, one));
    })
  );

// Adds or removes one value. A multi facet emptied of its last value drops out
// of the state entirely rather than sitting there as [], so `isSet`, the chips
// and the active count all agree that nothing is applied without each needing
// its own rule for an empty array.
export const toggleFacetValue = (state, facet, value) => {
  const next = { ...(state || {}) };
  if (!facet?.multi) {
    if (!isSet(value) || next[facet.key] === value) delete next[facet.key];
    else next[facet.key] = value;
    return next;
  }
  if (!isSet(value)) { delete next[facet.key]; return next; }
  const current = selectedValues(next[facet.key]);
  const after = current.includes(value) ? current.filter(x => x !== value) : [...current, value];
  if (after.length) next[facet.key] = after; else delete next[facet.key];
  return next;
};

// True when this exact option is on. One helper so the tick in the panel, the
// tick in the sheet and the chip row cannot disagree about what is selected,
// which on a multi facet is the difference between a checkbox that looks
// unchecked and a filter that is quietly applied.
export const isOptionOn = (state, facet, value) => {
  const v = (state || {})[facet.key];
  if (!isSet(value)) return !isSet(v);
  return selectedValues(v).includes(value);
};

// ── COUNTS EXCLUDE THEIR OWN FACET ──────────────────────────────────
// The standard faceted-search rule, and it is not a detail. Counting City
// options with the City filter already applied gives every unselected city a
// count of zero, which reads as "we have nothing in Aarhus" when what it means
// is "you have Copenhagen selected". So each facet's counts are computed against
// every OTHER facet only.
//
// A zero here is therefore a true statement: picking this empties the list. The
// UI disables those rather than hiding them, because an option that vanishes and
// reappears as you tap makes the sheet jump under your thumb.
export const facetCounts = (items, facets, state, key) => {
  const others = (Array.isArray(facets) ? facets : []).filter(f => f.key !== key);
  const pool = applyFacets(items, others, state);
  const facet = (Array.isArray(facets) ? facets : []).find(f => f.key === key);
  const out = {};
  if (!facet) return out;
  for (const opt of facet.options || []) {
    out[opt.value] = isSet(opt.value) ? pool.filter(i => facet.test(i, opt.value)).length : pool.length;
  }
  return out;
};

// ── THE CHIPS ───────────────────────────────────────────────────────
// Baymard's ninth mobile practice, and the one 66% of sites miss. Without it a
// user who has scrolled past the controls cannot tell why the list is short,
// so they reopen the filter panel just to look, or decide the site is empty.
// Each chip carries the key it clears, so removing one never disturbs the rest.
// ONE CHIP PER SELECTED VALUE, not one per facet. Three ticked types under a
// single chip reading "Type" cannot be undone one at a time, and the count
// beside the Filter button would say 1 while three things are filtered out.
export const appliedChips = (facets, state) =>
  (Array.isArray(facets) ? facets : []).flatMap(f => {
    const v = (state || {})[f.key];
    if (!isSet(v)) return [];
    return selectedValues(v).map(one => {
      const opt = (f.options || []).find(o => o.value === one);
      return { key: f.key, value: one, label: opt ? opt.label : String(one), facet: f.label, multi: !!f.multi };
    });
  });

export const activeFacetCount = (facets, state) => appliedChips(facets, state).length;

export const clearFacet = (state, key) => {
  const next = { ...(state || {}) };
  delete next[key];
  return next;
};

// Clears the facets, and ONLY the facets. Sort is not a filter: it changes the
// order of what you are looking at, never the contents, so "clear all" must
// leave it alone or the button quietly does two different things.
export const clearAllFacets = (facets, state) => {
  const next = { ...(state || {}) };
  for (const f of Array.isArray(facets) ? facets : []) delete next[f.key];
  return next;
};

// ── SEARCH, WHICH IS WHAT A SHORT LIST ACTUALLY NEEDS ───────────────
// Folded through the Danish letter rules so typing "aeroskobing" finds Ærøskøbing
// and typing "copenhagen" finds a place filed as København. Every word must
// appear somewhere, so a second word narrows rather than widening.
import { fold, variantsOf } from "./danishNames";

export const searchable = (item, fields) =>
  fold([
    ...variantsOf(item?.name),
    ...(Array.isArray(fields) ? fields : []).map(f => item?.[f]),
  ].filter(Boolean).join(" "));

export const matchesQuery = (item, query, fields) => {
  const q = fold(query);
  if (!q) return true;
  const hay = searchable(item, fields);
  return q.split(" ").filter(Boolean).every(w => hay.includes(w));
};
