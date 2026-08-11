// ── NINETY ROWS IS A LIBRARY, NOT A LIST ─────────────────────────────
//
// Oliver, 11 Aug 2026: "in manage published, I'd like to put them by categories
// now.. it's not very 'manageble' having a list of 90 different blogs to
// change."
//
// This is the second complaint about the same panel in two days. The first was
// "the blogs in manage published have started looking like a massive mess",
// which was three report blocks stacked above a 320px scroll box. That got
// fixed by collapsing the reports into one line. The list underneath was left
// exactly as it was: every published row, one after another, in whatever order
// Supabase returned them.
//
// ── WHY GROUPING IS NOT JUST TIDINESS HERE ──────────────────────────
// The work he actually does in this panel is per-TYPE, not per-row:
//
//   the old-heading repair only ever fires on towns, because shapeForLive is
//   the only writer that emitted "Good to Know"
//   the coordinate checks matter most on towns, since a town coordinate becomes
//   the reference frame every other entry in that town is measured against
//   the ticket rules only exist on festivals
//   a missing photo is a food and nightlife problem far more than a town one
//
// So a flat list forces him to re-decide what kind of thing he is looking at on
// every row, ninety times, while the actual task is "fix the towns". Grouping is
// what makes a category a unit of work instead of a label on a line.
//
// DELIBERATELY PURE AND DETERMINISTIC. No model, no network, no cost, same
// order every time. The panel renders what this returns and decides nothing.

import { CONTENT_TYPES, TYPE_LABEL } from "./sourcePolicy";

// ── THE ORDER, AND WHY IT IS NOT ALPHABETICAL ───────────────────────
// Most consequential first. A wrong town coordinate replaces the reference
// frame for everything else in that town (see coordCheck.js), a wrong festival
// date or ticket status sends somebody on a specific day, and a wrong opening
// time on a restaurant costs an evening. Alphabetical would put booking first
// and town seventh, which is precisely backwards.
// PRIORITY names only the ones whose order actually matters, and the rest of
// CONTENT_TYPES follows in its own order. Writing all nine out by hand would be
// a second copy of the type list, which is the failure this codebase repeats
// more than any other, and the first draft of this line did exactly that: it
// invented "nightlife" and "craft", neither of which is a real type, and
// silently dropped "night" and "nightTown" to the bottom. A test walks
// CONTENT_TYPES so a tenth type cannot go missing here.
const PRIORITY = ["town", "festival", "free", "food"];
export const GROUP_ORDER = [...PRIORITY, ...CONTENT_TYPES.filter(t => !PRIORITY.includes(t))];

const rank = (type) => {
  const i = GROUP_ORDER.indexOf(type);
  return i < 0 ? GROUP_ORDER.length : i;
};

// A row whose type is not in CONTENT_TYPES is not dropped. It is the eighth
// content type somebody added and half-registered, which is a real thing this
// codebase has done before, and it belongs at the bottom where it is visible
// rather than filtered into nothing.
export const groupLabel = (type) => TYPE_LABEL?.[type] || type || "(no type)";

// ── COUNT THE PROBLEMS, NOT JUST THE ROWS ───────────────────────────
// "Towns (31)" is a fact. "Towns (31, 12 to look at)" is a decision. The second
// number is the whole reason to open a group, so the caller passes in whatever
// per-row finding function it already has rather than this file growing its own
// idea of what a problem is. Seventh duplicated detector avoided.
export const groupRows = (rows, problemsFor) => {
  const by = new Map();
  (Array.isArray(rows) ? rows : []).forEach(r => {
    const type = r?.type || "";
    if (!by.has(type)) by.set(type, []);
    by.get(type).push(r);
  });

  const groups = [...by.entries()].map(([type, list]) => {
    const flagged = typeof problemsFor === "function"
      ? list.filter(r => { try { return (problemsFor(r) || []).length > 0; } catch { return false; } })
      : [];
    return {
      type,
      label: groupLabel(type),
      rows: list.slice().sort((a, b) =>
        String(a?.payload?.name || "").localeCompare(String(b?.payload?.name || ""), "da")),
      count: list.length,
      flagged: flagged.length,
      // A group with nothing wrong in it can stay shut and never be opened,
      // which is most of the value: it turns ninety rows into a handful of
      // groups and a short list of the ones that need him.
      clean: flagged.length === 0,
      unpublished: list.filter(r => !r?.published).length,
      noPhoto: list.filter(r => !r?.payload?.photo).length,
    };
  });

  groups.sort((a, b) => rank(a.type) - rank(b.type) || a.label.localeCompare(b.label));
  return groups;
};

// ── WHICH ONE TO OPEN FIRST ─────────────────────────────────────────
// Opening every group by default reproduces the flat list with extra headings.
// Opening none makes him click before he can see anything. So the groups that
// have something wrong start open, and the clean ones start shut, which means
// the panel opens showing exactly the work and nothing else.
export const initiallyOpen = (groups) =>
  new Set((Array.isArray(groups) ? groups : []).filter(g => g.flagged > 0).map(g => g.type));

// One line above the groups. Says the shape of the library rather than
// repeating the health report that already sits above it.
export const describeGroups = (groups) => {
  const list = Array.isArray(groups) ? groups : [];
  if (!list.length) return "";
  const total = list.reduce((a, g) => a + g.count, 0);
  const dirty = list.filter(g => g.flagged > 0);
  if (!dirty.length) return `${total} entries across ${list.length} ${list.length === 1 ? "category" : "categories"}, nothing flagged.`;
  return `${total} entries across ${list.length} categories. ${dirty.map(g => `${g.label}: ${g.flagged}`).join(", ")}.`;
};

// ── A TYPE THAT EXISTS AND HAS NOTHING IN IT ────────────────────────
// Registered in CONTENT_TYPES and never published. Worth showing as a zero
// rather than being absent, because "booking is missing from the picker" is a
// real bug this codebase has had, and an absent group looks identical to a
// group nobody has filled in yet.
export const emptyTypes = (groups) => {
  const present = new Set((Array.isArray(groups) ? groups : []).map(g => g.type));
  return (CONTENT_TYPES || []).filter(t => !present.has(t));
};
