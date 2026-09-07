// ── "ALREADY BEEN" ─────────────────────────────────────────────────
//
// Oliver, 6 Sep 2026: "I'd also like to have a 'already been' feature. So if
// someone has been somewhere, then it'll say on the different places, and it
// won't include them in a new guide."
//
// ── THE RULE HE CHOSE, AND WHY IT IS NOT ONE RULE ───────────────────
//
// Shown the collision, he picked it himself: "a town keeps its place, its stops
// change." Marking Copenhagen cannot exclude Copenhagen. That is the airport,
// the hotel, the Great Belt crossing and a third of the published content, and
// a traveller who has been once and is going back is the most ordinary case
// there is. Marking Tivoli removes Tivoli.
//
// So a been mark means two different things depending on what was marked, and
// this file keeps them apart rather than making the callers remember:
//
//   A PLACE      is excluded. It is a specific thing you have done.
//   A TOWN       stays, and becomes context: they know this city, so prefer
//                what a returning visitor would not already have done.
//   AN EVENT     stays, and becomes context too, for a reason he has not been
//                asked about yet and should be. A festival is a different thing
//                each year: somebody who went to Aalborg Karneval in 2025 has
//                not been to the 2026 one, and excluding it forever because
//                they ticked it once is a bug that would take a year to show
//                up. Treated as "they have seen this before" rather than
//                "never plan this", which is recoverable in the direction that
//                matters. If he wants it excluded outright, EVENT_IS_A_PLACE
//                below is the one line to change.
//
// ── AND IT IS A THIRD LIST, BESIDE SAVES AND GUIDES ─────────────────
//
// Same shape as savedPlaces, deliberately: same { kind, id, name, town } record,
// same local-storage-plus-account sync, same cap discipline. A second shape for
// the same idea is how the saved-guide list ended up needing savedGuideRow and
// guideFromSavedRow to translate between two versions of itself.
//
// The cap is much higher than the saves' forty. A saved list is a shortlist
// somebody curates; a been list only grows, and somebody on their fourth trip
// to Denmark has done a lot. Capped anyway, because this rides in one jsonb
// column and an unbounded list in a row is a row that eventually will not save.
import { isoDay } from "./eventDates";

export const BEEN_CAP = 300;

// Kinds that can be marked at all. craft and product are objects to buy rather
// than places to stand, and "I have been to a smoked herring" is not a fact
// about anybody's trip.
export const BEEN_KINDS = ["town", "free", "food", "nightlife", "event"];

// Kinds a mark does NOT exclude. See the block above: a town is where you sleep
// and an event is a different event next year.
export const CONTEXT_KINDS = ["town", "event"];
export const EVENT_IS_A_PLACE = false;

const clean = (v) => String(v ?? "").trim();
const kindOf = (b) => clean(b?.kind);

export const isContextKind = (kind) => {
  const k = clean(kind);
  if (k === "event") return !EVENT_IS_A_PLACE;
  return CONTEXT_KINDS.includes(k);
};

export const canBeMarked = (kind) => BEEN_KINDS.includes(clean(kind));

// ── ONE KEY, MADE IN ONE PLACE ──────────────────────────────────────
// isPlaceSaved compares kind and id inline at every call site. That works and
// it is also how the saved list and the entry page can start disagreeing about
// what "the same place" means. One function, used by every reader here.
export const sameEntry = (a, kind, id) =>
  !!a && kindOf(a) === clean(kind) && String(a.id) === String(id);

export const isBeen = (list, kind, id) =>
  (Array.isArray(list) ? list : []).some(b => sameEntry(b, kind, id));

// The record. `at` is the day it was marked, not a timestamp: nothing reads the
// hour, and a bare day is the same thing this codebase stamps everywhere else.
// isoDay rather than toISOString, for the reason written in affiliateSweep.js.
export const beenRecord = (kind, item, townName, today = new Date()) => ({
  kind: clean(kind),
  id: item?.id,
  name: clean(item?.name),
  emoji: clean(item?.emoji),
  town: clean(townName || item?.town || item?.city || item?.location || ""),
  at: isoDay(today),
});

// Toggling, not setting, because the button is a toggle and a mistake has to be
// undoable. Newest first, same as the saved list, and capped from the end so
// the oldest marks are the ones that fall off.
export const toggleBeen = (list, kind, item, townName, today = new Date()) => {
  const prev = Array.isArray(list) ? list : [];
  if (!canBeMarked(kind) || item?.id === undefined || item?.id === null) return prev;
  if (prev.some(b => sameEntry(b, kind, item.id))) {
    return prev.filter(b => !sameEntry(b, kind, item.id));
  }
  return [beenRecord(kind, item, townName, today), ...prev].slice(0, BEEN_CAP);
};

// ── AND MARKING MANY AT ONCE, WHICH IS THE AUTOMATIC HALF ───────────
//
// "if it has been in the guide before, and someone has finished that day, then
// it should automatically be put into the 'already been'."
//
// Additive only, and it never marks anything twice. A day finished twice, or a
// day whose stops overlap another day's, must not produce two records or move
// an existing one's date: the date on a record is when they FIRST said they had
// been, and rewriting it on a re-tick would quietly relabel a trip from two
// years ago as this week's.
export const markMany = (list, items, today = new Date()) => {
  let out = Array.isArray(list) ? [...list] : [];
  for (const it of (Array.isArray(items) ? items : [])) {
    const kind = clean(it?.kind);
    if (!canBeMarked(kind) || it?.id === undefined || it?.id === null) continue;
    if (out.some(b => sameEntry(b, kind, it.id))) continue;
    out = [beenRecord(kind, it, it.town, today), ...out];
  }
  return out.slice(0, BEEN_CAP);
};

// ── A DAY OF A GUIDE, TURNED INTO RECORDS ───────────────────────────
//
// The stop-to-record mapping, in one place. It was written twice within an
// hour, once in App.jsx and once in GuidePage, which is how two readers of the
// same question start disagreeing about it — the fault this codebase has now
// found six times over "where is this row".
//
// `resolve` is injected rather than imported, for the reason railPlaces gives:
// what has a bug in it if anything does is the MAPPING, and injecting the
// lookup makes this testable with no published rows at all.
//
// previewPools tags every row with the same strings this file uses for `kind`,
// so `_src` IS the kind and there is nothing to translate. A stop with no
// published page produces nothing: a record with no id is one the pool filter
// cannot use, and a plan can name somewhere Gemlyx has no page for.
export const dayVisitRows = (stops, resolve) => {
  if (typeof resolve !== "function") return [];
  return (Array.isArray(stops) ? stops : []).map(st => {
    const real = resolve(st?.name);
    if (!real || !canBeMarked(real._src) || real.id === undefined || real.id === null) return null;
    return { kind: real._src, id: real.id, name: real.name, emoji: real.emoji, town: clean(st?.town || real.town || "") };
  }).filter(Boolean);
};

// ── WHAT THE GUIDE MAY NOT PLAN ─────────────────────────────────────
//
// The excluded half only. A caller asking "what is off the table" gets places
// and never a town, which is the rule the whole feature turns on.
export const excludedBeen = (list) =>
  (Array.isArray(list) ? list : []).filter(b => clean(b?.name) && !isContextKind(b?.kind));

// The other half: places they know rather than places to skip.
export const knownBeen = (list) =>
  (Array.isArray(list) ? list : []).filter(b => clean(b?.name) && isContextKind(b?.kind));

// ── THE POOL FILTER ─────────────────────────────────────────────────
//
// Matched on kind AND id, not on name. Two Danish towns can hold a Strøget and
// a Torvet each, the guide pipeline has a whole file about that, and a been
// list keyed on names alone would remove somebody's Aarhus street because they
// had walked Copenhagen's.
//
// Rows with no id survive, because an unidentifiable row cannot be the one that
// was marked and dropping it would silently thin the pool.
export const withoutBeen = (pool, list, kind) => {
  const gone = excludedBeen(list).filter(b => !kind || kindOf(b) === clean(kind));
  if (!gone.length) return Array.isArray(pool) ? pool : [];
  // ── KIND AND ID, WHICH IS WHAT THE COMMENT ALWAYS SAID ────────────
  //
  // Found by an adversarial review: this compared ids alone and filtered `gone`
  // by kind only when the caller passed one. Ids are per-kind sequences here,
  // so a cross-kind collision is the NORMAL case, not an edge: having eaten at
  // food row 12 removed free-entry row 12, a completely different place.
  //
  // previewPools tags every row with the same `_src` strings the been list uses
  // for `kind` (town, free, food, nightlife, craft, event), so the two sides
  // already speak the same vocabulary and this just has to read it.
  //
  // A row with no id or no kind survives: it cannot be the one that was marked,
  // and dropping it would silently thin the pool.
  const key = (k, id) => `${clean(k)}:${id}`;
  const goneKeys = new Set(gone.map(b => key(b.kind, b.id)));
  return (Array.isArray(pool) ? pool : []).filter(p => {
    if (p?.id === undefined || p?.id === null) return true;
    const k = clean(p?._src || p?.kind);
    if (!k) return true;
    return !goneKeys.has(key(k, p.id));
  });
};

// ── AND THE LINE THE PLANNER READS ──────────────────────────────────
//
// Names, because the planner works in names: the skeleton prompt says "use only
// real place names actually mentioned in the conversation" and this has to
// speak the same language.
//
// Two sentences for two rules, never one combined list, because a planner given
// one list will apply one rule to it and the whole point is that the two halves
// are treated differently.
export const beenNote = (list) => {
  const skip = excludedBeen(list).map(b => b.name);
  const known = knownBeen(list).map(b => b.name);
  const lines = [];
  if (skip.length) {
    lines.push(`THEY HAVE ALREADY DONE THESE AND DO NOT WANT THEM AGAIN. Never put one on a day, never mention it as a suggestion: ${[...new Set(skip)].join(", ")}.`);
  }
  if (known.length) {
    // Deliberately not an exclusion, and it says so, because a planner told
    // somebody "knows Copenhagen" will otherwise route around it.
    lines.push(`THEY HAVE BEEN TO THESE BEFORE AND ARE HAPPY TO GO BACK: ${[...new Set(known)].join(", ")}. Keep them in the route and keep sleeping there. What changes is WHAT they do there: prefer things a returning visitor would not already have done, and skip the obvious first-visit landmarks unless they ask.`);
  }
  return lines.join("\n");
};
