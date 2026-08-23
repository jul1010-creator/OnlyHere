// ── "TYPE, AREA, FASTFOOD/FINE DINING, BUDGET" ──────────────────────
//
// Oliver, 22 Aug 2026: "The filters are different on everything. That bothers
// me. Especially food is horrible. You need the drop down of like type, area,
// fastfood/fine dining, budget. Like that."
//
// Three of those four already had a field behind them. Type is isFoodStreet,
// area is cityFromLocation, budget is priceBand. The fourth had nothing, and
// that is the interesting one, because placeKind.js already settled how this
// codebase is allowed to answer a question with no field behind it:
//
//   "A place is only a village if somebody SAID it is a village. Inferring it
//    from a population figure the entry does not carry, or from a name that
//    'sounds small', is exactly the invention this codebase exists to refuse."
//
// So this file does not read the description, and it does not read the price.
// It reads two things that already MEAN what is being asked, plus a field the
// author can state outright:
//
//   diningStyle   stated on the entry, and it wins over everything
//   isFoodStreet  a market or a food street is eaten standing up. That is not
//                 a guess about the place, it is what the field means.
//   category      a stated categorical field ("Hot dog stand", "Bakery",
//                 "Bistro"). ATTRACTION_FACETS already keyword-matches a
//                 stated field this way through kindKeys, so this is the
//                 established move here rather than a new liberty.
//
// AND PRICE IS DELIBERATELY NOT ONE OF THEM. Budget is its own dropdown two
// controls along. If style were derived from price the two would be one filter
// wearing two labels, and a reader who set both would think they had narrowed
// twice.
//
// ── AN UNCLASSIFIED ROW BELONGS TO NO STYLE ─────────────────────────
// The same answer priceBand gives, in its own words: "an unpriced row must not
// vanish. Null does that better. It belongs to no band, so it shows under All
// and is claimed by nothing." A row this cannot classify returns null, shows
// under All, and is never handed to somebody who asked for a quick bite. The
// count beside each option is therefore a true statement about what is known,
// not a guess dressed as one.

import { alt, LETTER } from "./travellerWords";

const clean = (v) => String(v == null ? "" : v).trim();

export const DINING_STYLES = ["quick", "casual", "fine"];

// Traveller words, not trade words. "Quick bite" rather than "Fast food",
// because a bakery and a pølsevogn are neither of them fast food and both of
// them are the thing somebody with twenty minutes is looking for.
export const DINING_STYLE_LABEL = {
  quick: "Quick bite",
  casual: "Sit-down",
  fine: "Fine dining",
};

// ── ORDER MATTERS, AND IT IS FINE FIRST ─────────────────────────────
// "Michelin-starred restaurant" contains "restaurant". "Gastropub" contains
// "pub". Checking the most specific bucket first is what stops a two-star
// kitchen being filed as a casual dinner by the last word in its own category.
//
// Nothing short and ambiguous is on these lists. Danish "is" is ice cream and
// English "is" is everywhere, so ice cream is spelled out as "isbar" and
// "ishus" instead.
//
// ── AND IT MATCHES THE END OF A COMPOUND, NOT THE WHOLE WORD ────────
// Danish builds a compound by welding the modifier onto the front and putting
// the HEAD last: a fiskerestaurant is a restaurant, a madmarked is a market, a
// havnebryggeri is a brewery. A plain word boundary on the left finds none of
// them, which on a Danish food guide is most of the list. So the left edge is
// open and the RIGHT edge does the work, with the definite and plural endings
// allowed after it, because kroen and kroer are both the inn and kroner is
// money.
const CATEGORY_WORDS = {
  fine: ["fine dining", "finedining", "michelin", "gastronomic", "gastronomique",
         "tasting menu", "haute cuisine", "gourmet", "chef's table", "chefs table",
         "degustation", "stjerne", "michelinstjerne"],
  quick: ["hot dog", "hotdog", "pølsevogn", "polsevogn", "pølsebod", "grillbar",
          "street food", "streetfood", "food market", "food hall", "market hall",
          "madmarked", "marked", "market", "torvehal", "torvehaller", "torvehallerne",
          "bakery", "bageri",
          "konditori", "café", "cafe", "kaffebar", "coffee", "kiosk", "takeaway",
          "take-away", "take away", "sandwich", "burger", "shawarma", "kebab",
          "falafel", "food truck", "foodtruck", "food stall", "stall", "stand",
          "cart", "vogn", "deli", "isbar", "ishus", "ice cream", "smoothie",
          "juice", "pizzeria", "slice", "canteen", "kantine", "smørrebrødsforretning"],
  casual: ["restaurant", "bistro", "brasserie", "brasseri", "gastropub", "pub",
           "kro", "inn", "tavern", "værtshus", "brewery", "bryggeri", "bryghus",
           "steakhouse", "diner", "eatery", "spisested", "spisehus", "trattoria",
           "osteria", "sushi", "tapas", "ramen", "izakaya", "buffet", "grillhouse",
           "seafood", "fiskerestaurant", "smørrebrød", "smorrebrod", "frokostrestaurant"],
};

// Built once. `alt` escapes the regex characters, so the apostrophe in "chef's
// table" is a literal apostrophe rather than a quantifier, and it sorts longest
// first so "market hall" is tried before "market".
const ENDINGS = "(?:erne|ene|en|et|er|ne|e)?";
const CATEGORY_RE = Object.fromEntries(
  DINING_STYLES.map(s => [s, new RegExp(`(?:${alt(CATEGORY_WORDS[s])})${ENDINGS}(?![${LETTER}])`, "i")])
);

// ── THE ONE FUNCTION EVERYTHING ELSE READS ──────────────────────────
// The facet test, the counts and the card badge all come through here, so a
// count and the filter it applies cannot disagree by construction. That is the
// same argument eventFacets makes for declaring `test` once.
export const diningStyleOf = (entry) => {
  const stated = clean(entry && entry.diningStyle).toLowerCase();
  if (DINING_STYLES.includes(stated)) return stated;
  if (entry && entry.isFoodStreet) return "quick";
  const cat = clean(entry && entry.category);
  if (!cat) return null;
  // fine, then quick, then casual. See the note above CATEGORY_WORDS.
  for (const s of ["fine", "quick", "casual"]) if (CATEGORY_RE[s].test(cat)) return s;
  return null;                                   // not guessed, and that is an answer
};

export const diningStyleLabel = (entry) => DINING_STYLE_LABEL[diningStyleOf(entry)] || "";

// ── WHICH ROWS THIS CANNOT ANSWER FOR ───────────────────────────────
// So the gap is readable rather than merely absent. A category this file has
// never seen is not a bug in the reader, it is a row whose author should state
// `diningStyle` outright, and the only way anybody finds out which rows those
// are is by being able to list them.
export const unstyledEntries = (entries) =>
  (Array.isArray(entries) ? entries : []).filter(e => diningStyleOf(e) == null);

export const styleCoverage = (entries) => {
  const all = Array.isArray(entries) ? entries : [];
  if (!all.length) return 1;
  return (all.length - unstyledEntries(all).length) / all.length;
};

// ── THE FACET DOES NOT RENDER UNTIL IT CAN ANSWER ───────────────────
// This is the part that makes the keyword read safe to ship against data
// nobody has audited. The word lists above were written against the categories
// this pipeline produces, not against a table anybody read row by row, so the
// honest possibility is that they classify very little of what is really
// published.
//
// If that happens, the dropdown must not appear. Three controls whose counts
// describe the whole page, plus a fourth whose counts describe a fifth of it,
// is worse than three controls: the reader has no way to tell which one is
// which, and the one that lies looks exactly like the three that do not.
//
// Half is the line. Below it the control would be removing more by ignorance
// than by intent. Above it the unclassified remainder behaves the way an
// unpriced row already behaves on this same page: it shows under All and is
// claimed by nothing.
export const STYLE_COVERAGE_MIN = 0.5;

export const showStyleFacet = (entries, min = STYLE_COVERAGE_MIN) =>
  (Array.isArray(entries) ? entries : []).length > 0 && styleCoverage(entries) >= min;

// ── THE FACETS THEMSELVES LIVE HERE, NOT IN App.jsx ─────────────────
//
// Same argument that moved layoutBody out of DetailPage.jsx into
// utils/articleLayout.js: this decides what a reader sees, and a decision that
// lives in App.jsx can only be tested by running a regex over its own source.
// Declared here, the suite can build a pool of rows, apply the facets and read
// what really comes back, which is the difference between checking that a
// filter EXISTS and checking that it filters.
//
// The page keeps the state, because the page already had three of these four
// pieces of state under names other code reads.

import { cityFromLocation } from "./guideEnrichment";
import { daCompare, PRICE_BANDS, priceBand } from "./helpers";

export const foodCitiesIn = (entries) =>
  [...new Set((Array.isArray(entries) ? entries : [])
    .map(f => cityFromLocation(f.location || f.city))
    .filter(Boolean))].sort(daCompare);

// ── A DROPDOWN WITH ONE REAL ANSWER CANNOT CHANGE ANYTHING ──────────
// The old city row already refused to render below two towns. The same rule
// belongs on Type: with nothing published as a food street, "Restaurants"
// means everything and the control is a tap that does nothing. Budget is
// unconditional because its bands are fixed rather than derived, and an empty
// band renders disabled with a truthful zero beside it.
export const buildFoodFacets = (entries) => {
  const all = Array.isArray(entries) ? entries : [];
  const cities = foodCitiesIn(all);
  const hasStreets = all.some(f => f.isFoodStreet);
  const hasPlaces = all.some(f => !f.isFoodStreet);
  return [
    ...(hasStreets && hasPlaces ? [{
      key: "kind", label: "Type", primary: true,
      options: [
        { value: "All", label: "All" },
        { value: "Restaurants", label: "Restaurants" },
        { value: "Food Streets", label: "Food streets" },
      ],
      test: (f, v) => (v === "Food Streets" ? !!f.isFoodStreet : !f.isFoodStreet),
    }] : []),
    // BY CITY, NOT BY NEIGHBOURHOOD. Oliver, 17 Aug 2026: "Fix filters.. that
    // is ridiculous.." The old row read the raw `location`, which is
    // "Neighbourhood, City", so it offered three chips for Copenhagen and grew
    // by one with every entry published. See cityFromLocation.
    ...(cities.length > 1 ? [{
      key: "city", label: "Area", primary: true,
      options: [{ value: "All", label: "All" }, ...cities.map(c => ({ value: c, label: c }))],
      test: (f, v) => cityFromLocation(f.location || f.city) === v,
    }] : []),
    // The one he asked for that had no field behind it. Absent rather than
    // wrong when the category words do not match what is really published.
    ...(showStyleFacet(all) ? [{
      key: "style", label: "Style", primary: true,
      options: [{ value: "All", label: "All" },
                ...DINING_STYLES.map(s => ({ value: s, label: DINING_STYLE_LABEL[s] }))],
      test: (f, v) => diningStyleOf(f) === v,
    }] : []),
    // REAL MONEY, NOT A DANISH-RELATIVE ADJECTIVE. Oliver, 16 Aug 2026: "the
    // average traveller doesn't know what mid-budget is in Denmark." An
    // unpriced row bands to null, shows under All and is claimed by nothing.
    {
      key: "price", label: "Budget", primary: true,
      options: [{ value: "All", label: "All" }, ...PRICE_BANDS.map(b => ({ value: b.id, label: b.label }))],
      test: (f, v) => priceBand(f.price) === v,
    },
  ];
};

export const FOOD_SORTS = [{ value: "az", label: "Name" }, { value: "price", label: "Price" }];

// Price low to high reads the BAND, not the raw string, because the raw string
// is a sentence: "3-course lunch menu 795 DKK; 4-course 1,095 DKK". priceBand
// already knows which numbers in that are money. A row it cannot band sorts
// LAST rather than sorting as zero, which would put every unpriced place at
// the top of a list somebody opened to find the cheap end.
export const byFoodPrice = (a, b) => {
  const rank = (f) => {
    const i = PRICE_BANDS.findIndex(x => x.id === priceBand(f && f.price));
    return i === -1 ? PRICE_BANDS.length : i;
  };
  return rank(a) - rank(b);
};
