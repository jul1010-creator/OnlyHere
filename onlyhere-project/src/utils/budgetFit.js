// ── "GERANIUM IS NOT MID-RANGE" ──────────────────────────────────────
//
// Oliver, 17 Aug 2026:
//
//   "geranium is NOT mid-range.. so remember to make food places include in
//    budget."
//
// Two things in one line, and they are different sizes.
//
// The small one: a three Michelin star tasting menu in Copenhagen is not a
// mid-range restaurant, and priceBand landing it in the middle tab was fixed
// earlier tonight — it averaged every digit in a price sentence, so a course count
// and a thousands separator dragged four-figure menus into 100-250. That fix is in
// utils/helpers.js with the four real price sentences asserted.
//
// The large one is what this file is for: NOTHING HAS EVER READ A PRICE WHEN
// CHOOSING WHAT TO OFFER. previewMatch ranks towns on tier, reach, held content and
// interest, and it puts every food row in a matched town on the screen without once
// asking what a meal costs. So a traveller whose own words were "it's a tight
// backpacker to be honest" gets handed the most expensive restaurant in the
// country, and the screen has no idea it has done anything odd.
//
// ── WHAT A BUDGET RULES OUT, NOT WHAT IT DEMANDS ─────────────────────
// Same principle accommodation.js already uses for hotels, and it is worth
// restating because the tempting version is wrong. A generous budget does not
// oblige anybody to eat at Geranium, and plenty of people with money eat at a
// harbour shack on purpose — so `generous` rules out nothing at all. A tight budget
// is the one with a real exclusion in it, because being handed a 2,500 kr menu when
// you said you were counting kroner is not a suggestion, it is being ignored.
//
// AND AN UNKNOWN PRICE IS NOT AN EXPENSIVE ONE. priceBand returns null for "See
// website" and for anything with no figure in it, and a null must never be treated
// as over-250: that would quietly hide every entry whose price nobody has checked
// yet, which is a large part of the library and the opposite of the fix.
import { priceBand } from "./helpers";

// The bands a level will not be handed. Keyed by the same ids priceBand returns.
export const BUDGET_RULES_OUT = {
  tight: ["over-250"],
  middling: [],
  generous: [],
};

// Which content types this applies to. Food and nightlife carry a price a person
// pays per visit; a town does not, and an attraction's ticket is a different and
// much smaller decision.
export const PRICED_KINDS = ["food", "nightlife"];

export const outOfBudget = (row, level) => {
  const rules = BUDGET_RULES_OUT[String(level || "")] || [];
  if (!rules.length) return false;
  const kind = String(row?._src || row?.kind || "");
  if (kind && !PRICED_KINDS.includes(kind)) return false;
  const band = priceBand(row?.price);
  if (!band) return false;              // unknown is not expensive
  return rules.includes(band);
};

// preferAffordable was here and is GONE. It was written on 17 Aug alongside
// outOfBudget, on the assumption the matcher would want to rank a section by
// affordability — and then the matcher used outOfBudget directly, because holding
// an over-budget place behind the door is a better answer than reordering it, and
// nothing ever called this. Exported, tested, unreachable: the same pattern this
// file's neighbours keep being caught by, and deleting it is the same call made
// about a redundant filter and a redundant early return the same night.
//
// preferPassing in routeOrder.js is still the shared top-up rule and is still used
// by the distance filter. If a section ever does need ranking by price, it is two
// lines against that, written the day it is needed.

// ── AND IF IT IS SHOWN ANYWAY, IT SAYS SO ────────────────────────────
// The top-up above means an expensive place can still reach a tight budget's
// screen, when there is nothing else in that town. That is the right call — an
// empty Food & Drink section tells a traveller less than one honest line does — but
// it must not arrive looking like an ordinary recommendation. This is the line that
// goes on the card.
export const budgetWarning = (row, level) => {
  if (!outOfBudget(row, level)) return "";
  return "Above the budget you mentioned";
};
