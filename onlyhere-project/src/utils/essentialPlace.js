// ── "WE NEED TO INPUT ESSENTIALS ON THE BLOG PAGES" ─────────────────
//
// Oliver, 11 Sep 2026: "we need to input 'essentials' on the blog pages. So
// essentials or tips for Odense. Could be put into the Odense Blog."
//
// On his Essentials page, between Rejsekort and MobilePay, sit "Odense Letbane"
// and "FynBus Tourist". One is a single city's light rail; the other is Funen's
// regional bus. A reader planning a week in Jutland scrolls past both, and a
// reader on the Odense blog never sees either.
//
// ── AN ESSENTIAL HAS NO PLACE FIELD AT ALL ──────────────────────────
// shapeForLive's essential branch is name, category, emoji, desc, howTo, price,
// link, linkAndroid, tip, visitorNote, kind. Nothing on the row says where it
// applies, so no page can sort them even in principle. essentialsForTrip picks
// rows by THEME, read out of the row's own words, and never by place.
//
// ── ONE FIELD, AND IT IS NOT A TOWN ─────────────────────────────────
// `town` is the obvious field and it is wrong on the second of the two rows he
// showed me. FynBus is not Odense's bus, it is Funen's, and it belongs on
// Svendborg's page and Kerteminde's exactly as much. Odense Letbane belongs to
// Odense and nowhere else. One field has to answer both, so the field is a
// SCOPE: the place this row applies to, at whatever size that place is.
//
//   "Odense"       one town
//   "Funen"        a part of the country
//   "Ærø"          an island, which is why utils/geography.js learned to say
//   "Kalundborg"   a kommune, so Sejerø is covered by the kommune's row
//   ""             the whole country
//
// EMPTY IS THE HONEST DEFAULT AND THE CURRENT STATE. Every published row has no
// scope, so every published row is national, which is precisely where all of
// them are today. Nothing moves until somebody says where it belongs.
//
// ── WHY NOT MATCH ON THE ROW'S OWN WORDS ────────────────────────────
// That was the first idea, and it fails on both rows that prompted the request.
// "Odense Letbane" contains the word Odense, so it works. "FynBus Tourist" does
// not contain the name of a single town it serves, so a word match finds
// nothing at all. The other direction is worse: a national row that mentions
// Odense once as an example would be filed as an Odense row. "ABOUT Odense" and
// "MENTIONS Odense" are two different facts, and a substring cannot tell them
// apart — which is the Præstø-and-Køge failure one level down, a machine
// answering a question nobody asked it.

import { cleanRelation } from "./placeEdit";
import { samePlaceName } from "./danishNames";
import { partOfCountry, islandOf } from "./geography";
import { kommuneOf } from "./regions";
import { kindOf } from "./essentialKind";

export const scopeOf = (row) => cleanRelation(row && row.scope);

// Is this row about one place, or about the country? Asked by name rather than
// by testing the string at four call sites, because "has a scope" and "is
// national" are the same question and should not be spelled two ways.
export const isNational = (row) => !scopeOf(row);

// ── EVERY NAME THIS TOWN ANSWERS TO, NARROWEST FIRST ────────────────
// The order is the ranking: a row scoped to Odense outranks one scoped to Funen
// on Odense's own page, because it is about exactly where the reader is
// standing. Deduped, because islandOf falls back to the part of the country and
// a town on the mainland would otherwise list Funen twice.
export const placeScopes = (town) => {
  const out = [];
  const name = String(town?.name || "").trim();
  if (name) out.push(name);
  const kommune = kommuneOf(town);
  if (kommune) out.push(kommune);
  // The stated island first, then the kommune table, then the landmass. See
  // islandOf in utils/geography.js: this is what lets a row scoped to Ærø reach
  // Ærøskøbing's page without anybody writing Ærøskøbing on the row.
  const island = islandOf(town, kommune);
  if (island) out.push(island);
  const part = partOfCountry(town);
  if (part) out.push(part);
  return [...new Set(out.filter(Boolean))];
};

// samePlaceName and not a string compare, so a scope typed "København" reaches
// the town published as Copenhagen, and either spelling of Ærø matches.
export const scopeFits = (row, town) => {
  const scope = scopeOf(row);
  // ── A FAST PATH, STATED RATHER THAN HIDDEN ────────────────────────
  // This cannot be isolated by a mutation and that is said out loud rather than
  // left for the next person to rediscover: samePlaceName builds its haystack
  // from variantsOf(scope) and filters the empties out, so an empty needle
  // matches nothing and deleting this line changes no answer. Measured, not
  // assumed — the assertion below the fixtures says so.
  //
  // IT EARNS ITS PLACE ON COST. Most rows on the Essentials page are national
  // and always will be, and placeScopes geocodes twice per call: once through
  // the kommune boxes and once through the landmass outlines. Without this, a
  // town page would run both for every national row it is never going to show.
  // Same trade partOfCountry states for its own NaN guard one file over.
  if (!scope) return false;
  return placeScopes(town).some(s => samePlaceName(s, scope));
};

// ── WHAT GOES ON THIS TOWN'S PAGE ───────────────────────────────────
// Essentials before tips, because that split is the whole point of the two
// tabs: an essential is something that costs money or strands you, a tip only
// makes the trip better. Then narrowest scope first. A town row beats a Funen
// row beats a Zealand row, and a national row is not here at all — it is on the
// Essentials page, where every reader sees it anyway.
export const essentialsForPlace = (rows, town, { limit = 4 } = {}) => {
  const order = placeScopes(town);
  // ── NO "NOT FOUND" BRANCH, BECAUSE THERE CANNOT BE ONE ────────────
  // The first version read `i < 0 ? order.length : i`, and a mutation deleting
  // that guard changed no answer: the filter below has ALREADY established that
  // every row reaching here matches one of these scopes, through this same
  // predicate on this same list. So -1 was a branch no input could produce, and
  // defensive code a mutation cannot reach is code the next reader has to work
  // out is dead. The property is asserted in the suite instead, which is the
  // rule this file follows the third time it has come up.
  const at = (r) => order.findIndex(s => samePlaceName(s, scopeOf(r)));
  const weight = (r) => (kindOf(r) === "essential" ? 0 : 1);
  const cap = Math.max(0, Number(limit) || 0);
  return (Array.isArray(rows) ? rows : [])
    .filter(r => r && r.name && scopeFits(r, town))
    .sort((a, b) => weight(a) - weight(b) || at(a) - at(b))
    .slice(0, cap);
};


// ── AND A PUBLISHED ROW CAN BE PLACED WITHOUT REDRAFTING IT ─────────
// The same shape as kindPatch and placePatch, deliberately, and for the same
// stated reason: "A PATCH that resends the whole payload is how an unrelated
// field gets clobbered by whatever the panel happened to be holding." Only the
// field that changed, and only ever a place name.
//
// This is the half that matters today. The drafting prompt reaches entries
// written from now on; Odense Letbane and FynBus Tourist are already published,
// and without a box they could never be placed at all.
export const scopePatch = (row, next) => {
  const want = cleanRelation(next);
  return want === scopeOf(row) ? {} : { scope: want };
};

export const hasScopeChange = (row, next) => Object.keys(scopePatch(row, next)).length > 0;
