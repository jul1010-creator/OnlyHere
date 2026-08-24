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
import { fold } from "./danishNames";

// ── "HAVING TO SEARCH FOR 'AARHUS FESTUGE' ALL THE TIME IS ANNOYING" ─
//
// Oliver, 15 Aug 2026. Grouping fixed the ninety row list as a LIBRARY and did
// nothing for the other half of the job, which is going straight back to the
// one row he was working on twenty minutes ago. Today that is: work out which
// category it is, open that group, scroll it.
//
// EVERY WORD HAS TO LAND, anywhere in the row. That is what makes "aarhus fest"
// work, which is how somebody actually types when they know what they want, and
// it is why this is not a substring test on the whole query.
//
// FOLDED, because this is Denmark. "Aarhus" and "Århus" are one town, and a
// search box that cannot find Ærøskøbing unless you own the keyboard for it is
// the same bug the preview matcher had four times. fold maps æøå the way the
// whole codebase does.
const HAYSTACK = ["name", "town", "city", "location", "type"];

export const rowHaystack = (row) => {
  const p = row?.payload || {};
  return fold([...HAYSTACK.map(f => p[f]), row?.type, groupLabel(row?.type)]
    .filter(Boolean).map(String).join(" "));
};

// NAMED rowMatchesQuery, NOT matchesQuery. utils/listControls.js next door
// already exports a matchesQuery, for the public browse filters, and two
// exports one word apart answering different questions is the collision
// placeThemes.js documents having already had once with THEMES. esbuild caught
// this one the same way.
export const rowMatchesQuery = (row, query) => {
  const words = fold(String(query || "")).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = rowHaystack(row);
  return words.every(w => hay.includes(w));
};

// Returns the rows unchanged for an empty query, deliberately the same object
// rather than a copy, so "no search" costs nothing on every render.
export const filterRows = (rows, query) => {
  const list = Array.isArray(rows) ? rows : [];
  if (!String(query || "").trim()) return list;
  return list.filter(r => rowMatchesQuery(r, query));
};

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
// ── WHEN WAS THIS TOUCHED ───────────────────────────────────────────
//
// Oliver, 24 Aug 2026: "We need a 'latest updated'."
//
// `gemlyx_content` has `created_at` and NO `updated_at`, so today the honest
// answer to "latest updated" is "latest published". This reads `updated_at`
// first and falls back, which means the day the column exists every row starts
// telling the truth with no code change and no migration of the app.
//
// THE COLUMN SHOULD BE MAINTAINED BY THE DATABASE, NOT BY THIS APP. There are
// several PATCH paths in App.jsx (publish, edit, media, credits, backfill, the
// correction pass) and a rule that has to be remembered at six call sites is
// this repo's signature failure with a timestamp on it. A trigger cannot be
// forgotten:
//
//   ALTER TABLE gemlyx_content ADD COLUMN updated_at timestamptz DEFAULT now();
//   UPDATE gemlyx_content SET updated_at = created_at WHERE updated_at IS NULL;
//   CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
//     BEGIN NEW.updated_at = now(); RETURN NEW; END;
//   $$ LANGUAGE plpgsql;
//   CREATE TRIGGER gemlyx_content_touch BEFORE UPDATE ON gemlyx_content
//     FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
//
// Until that runs, every stamp below is a created date and says so.
export const rowStamp = (row) => {
  const v = row?.updated_at || row?.created_at || null;
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

export const rowStampIsEdit = (row) => !!row?.updated_at;

// Short, and in Danish collation order elsewhere, but a date is a date. The
// year is dropped inside the current year, because twelve rows all saying 2026
// is twelve pixels of nothing.
export const stampLabel = (row, today = new Date()) => {
  const d = rowStamp(row);
  if (!d) return "";
  const sameYear = d.getFullYear() === today.getFullYear();
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return sameYear ? `${day} ${mon}` : `${day} ${mon} ${d.getFullYear()}`;
};

// ── AND WHETHER IT CAN SHOW ITS WORKING ─────────────────────────────
//
// Measured on the live table, 24 Aug 2026: 77 of 148 published entries carry no
// __sources at all. Towns are the worst, 29 of 39, and towns are the front of
// the product. `free` is nearly clean at 25 of 29.
//
// The cause is recorded in HowWeKnow.jsx: __sources was not on the
// shapeForLive allow-list, so publish dropped it and "zero of 79 rows carried
// the list". The fix stops new ones. It cannot recover the old ones, because
// the URLs were never written down.
//
// Nothing false is printed on those pages: HowWeKnow renders nothing at all
// rather than an empty panel. But the promise this product is built on is that
// every place was checked against its own sources, and on half the library the
// page cannot show it. That is a content debt, so it is counted here where the
// content is managed rather than left as a thing somebody notices.
export const hasSources = (row) =>
  Array.isArray(row?.payload?.__sources) && row.payload.__sources.length > 0;

export const SORTS = [
  { id: "name", label: "Name" },
  { id: "recent", label: "Newest" },
];

const byName = (a, b) =>
  String(a?.payload?.name || "").localeCompare(String(b?.payload?.name || ""), "da");

// Newest first. A row with no stamp sorts last rather than first, because an
// unknown date pretending to be the newest is the kind of small wrongness that
// makes somebody stop trusting the order.
const byRecent = (a, b) => {
  const da = rowStamp(a), db = rowStamp(b);
  if (!da && !db) return byName(a, b);
  if (!da) return 1;
  if (!db) return -1;
  return db.getTime() - da.getTime() || byName(a, b);
};

export const sortRows = (rows, sort = "name") =>
  (Array.isArray(rows) ? rows : []).slice().sort(sort === "recent" ? byRecent : byName);


// ── COUNT THE PROBLEMS, NOT JUST THE ROWS ───────────────────────────
// "Towns (31)" is a fact. "Towns (31, 12 to look at)" is a decision. The second
// number is the whole reason to open a group, so the caller passes in whatever
// per-row finding function it already has rather than this file growing its own
// idea of what a problem is. Seventh duplicated detector avoided.
export const groupRows = (rows, problemsFor, { sort = "name" } = {}) => {
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
      rows: sortRows(list, sort),
      count: list.length,
      flagged: flagged.length,
      // A group with nothing wrong in it can stay shut and never be opened,
      // which is most of the value: it turns ninety rows into a handful of
      // groups and a short list of the ones that need him.
      clean: flagged.length === 0,
      unpublished: list.filter(r => !r?.published).length,
      noPhoto: list.filter(r => !r?.payload?.photo).length,
      noSources: list.filter(r => !hasSources(r)).length,
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
