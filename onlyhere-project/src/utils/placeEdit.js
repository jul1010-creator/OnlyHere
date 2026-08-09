// ── "HELLERUP AN AREA? AND DRAGØR A VILLAGE? I WANNA BE ABLE TO
//     CHANGE THIS MANUALLY" ────────────────────────────────────────
//
// Oliver, 9 Aug 2026. Checked against the live table, and he is right about both
// of them for a reason worth writing down: ALL 31 published towns carry a STORED
// placeKind. Not one of them is derived.
//
//   stored:town     14
//   stored:village   9
//   stored:city      5
//   stored:area      3
//
// placeKindOf() honours a stated value above everything else, on purpose, so a
// wrong one is not a bug in the derivation. It is a judgement a model made once,
// at draft time, that then became permanent, because the only way to change a
// published field was to redraft the whole entry. That is the gap.
//
// The three real cases in his data, all of them stored, none of them fixable:
//   Hellerup  placeKind "area", partOf null      → renders "AREA · NO PARENT SET"
//   Dragør    placeKind "village"                → its own municipality, ~14k people
//   Samsø     placeKind "area", partOf null      → an island, inside nothing
//
// ── AND A FIELD THAT HOLDS A SENTENCE ───────────────────────────────
// One Dragør row stores dayTripFrom: "Day trip from Copenhagen". The field IS
// the phrase "day trip from", so the value should be "Copenhagen". Anything
// reading it as a place name gets a string that matches no town. Same failure as
// the region pills and the event types: prose in a field meant for a key.
//
// ── AN AREA IS INSIDE SOMETHING, BY DEFINITION ──────────────────────
// That is what makes "area" different from "village": it is the only kind that
// makes a claim about a SECOND place. An area with no parent is not a small
// mistake, it is a value that contradicts its own meaning, and it is why the
// card prints "NO PARENT SET" rather than anything a reader can use.
//
// So this file is the rules, checkable, and the Studio panel is one editor on
// top of them. Validation lives here rather than in the JSX because the same
// checks have to run on a bulk sweep later without being retyped.

import { PLACE_KINDS } from "./placeKind";
import { samePlaceName } from "./danishNames";

const clean = (v) => String(v == null ? "" : v).trim();

export const cleanPlaceKind = (v) => {
  const t = clean(v).toLowerCase();
  return PLACE_KINDS.includes(t) ? t : "";
};

// ── A RELATION FIELD HOLDS A PLACE NAME, NOT A SENTENCE ─────────────
// Strips the phrase the field already means. "Day trip from Copenhagen" is the
// label and the value welded together, and the value is the half that belongs
// here. Anything still sentence-shaped after that is refused rather than stored,
// because a relation nothing can match is worse than an empty one: an empty
// field renders nothing, a wrong one renders a link to a town that does not
// exist.
const LEAD = /^(a\s+)?(day\s*[- ]?\s*trip|trip|excursion|visit|excursions?)\s+from\s+/i;
const NEAR = /^(near|close to|next to|just outside|outside|from|within|inside|part of|in)\s+/i;

export const cleanRelation = (v) => {
  let t = clean(v).replace(/[.,;:!?]+$/, "");
  if (!t) return "";
  t = t.replace(LEAD, "").replace(NEAR, "").trim();
  if (!t) return "";
  // A place name is a name. More than four words, or any sentence punctuation
  // left in the middle, means somebody wrote prose here.
  if (t.split(/\s+/).length > 4 || /[.;:]/.test(t)) return "";
  return t;
};

// ── WHAT IS WRONG WITH THIS PLACE, IN PLAIN WORDS ───────────────────
// Every check is a fact about the stored payload, phrased so the panel can print
// it without rewording. No check is a matter of taste: each one describes a
// value that contradicts another value on the same entry.
export const placeIssues = (entry) => {
  const out = [];
  const name = clean(entry?.name);
  const kind = cleanPlaceKind(entry?.placeKind);
  const partOf = clean(entry?.partOf);
  const trip = clean(entry?.dayTripFrom);

  if (!kind) out.push("No kind set, so this is shown as a town by default.");
  if (kind === "area" && !partOf) {
    out.push("Marked as an area but nothing says what it is inside, which is the only thing 'area' claims. The card prints NO PARENT SET.");
  }
  if (kind === "city" && partOf) out.push("A city that is inside another place is an area or a district, not a city.");
  if (partOf && name && samePlaceName(partOf, name)) out.push("Set as being inside itself.");
  if (trip && name && samePlaceName(trip, name)) out.push("Set as a day trip from itself.");
  if (partOf && trip) {
    out.push("Has both a parent and a day-trip base. If it is inside somewhere, that is where you sleep, so the day-trip base is noise.");
  }
  if (trip && cleanRelation(trip) !== trip) {
    out.push(`The day-trip base reads as a sentence, not a place name: "${trip}".`);
  }
  if (partOf && cleanRelation(partOf) !== partOf) {
    out.push(`The parent reads as a sentence, not a place name: "${partOf}".`);
  }
  return out;
};

// The patch that goes to Supabase: only the three fields, cleaned, and only the
// ones that changed. A PATCH that resends the whole payload is how an unrelated
// field gets clobbered by whatever the panel happened to be holding.
export const placePatch = (entry, next) => {
  const kind = cleanPlaceKind(next?.placeKind);
  const partOf = cleanRelation(next?.partOf);
  const trip = cleanRelation(next?.dayTripFrom);
  const patch = {};
  if (kind !== cleanPlaceKind(entry?.placeKind)) patch.placeKind = kind;
  if (partOf !== clean(entry?.partOf)) patch.partOf = partOf;
  if (trip !== clean(entry?.dayTripFrom)) patch.dayTripFrom = trip;
  return patch;
};

export const hasPlaceChange = (entry, next) => Object.keys(placePatch(entry, next)).length > 0;

// ── THE SAME PLACE PUBLISHED TWICE ──────────────────────────────────
// Found while checking his data: Dragør exists as row 50 (village) AND row 72
// (town), and Samsø as 24 and 79. liveContent.js dedupes by type and name and
// keeps whichever comes first, so the site silently shows one of them and the
// other is invisible, including any edit made to it.
//
// That is worth surfacing next to the editor, because editing the invisible copy
// looks exactly like editing not working.
export const duplicateNames = (rows) => {
  const seen = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const name = clean(r?.payload?.name || r?.name);
    if (!name) continue;
    const key = `${clean(r?.type)}::${name.toLowerCase()}`;
    seen.set(key, [...(seen.get(key) || []), r]);
  }
  return [...seen.values()].filter(list => list.length > 1);
};
