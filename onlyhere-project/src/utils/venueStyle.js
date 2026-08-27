// ── "HIGH-END" AND "CASUAL" ─────────────────────────────────────────
//
// Oliver, 27 Aug 2026, relaying the friend who found "middle-age man" and the
// FREE badge: for nightlife, "high-end" and "casual".
//
// It is the right axis. Everything the nightlife entries already carry answers
// WHAT FORMAT a place is — "Bodega with a dance floor", "Party pub",
// "Nightclub" — and nothing answers the question somebody actually asks before
// going out, which is whether they need to change out of their trainers.
//
// ── AND IT IS foodStyle.js, DELIBERATELY ────────────────────────────
//
// The same axis already exists one tab across. Oliver, 22 Aug 2026: "You need
// the drop down of like type, area, fastfood/fine dining, budget. Like that."
// That built utils/foodStyle.js, and this file follows it rule for rule rather
// than inventing a second way to answer the same shape of question:
//
//   a stated field wins outright
//   a stated CATEGORICAL field is keyword-matched, never the prose
//   the price is not an input
//   an unclassifiable row returns null, shows under All, is claimed by nothing
//   the control does not render until it can actually answer
//
// ── PRICE IS NOT AN INPUT, AND HERE THAT MATTERS MORE ───────────────
//
// foodStyle's reason: "If style were derived from price the two would be one
// filter wearing two labels, and a reader who set both would think they had
// narrowed twice."
//
// Nightlife has a second reason on top of it. A bodega charges 30 kroner for a
// beer and Danish clubs charge tourist prices for a bad one; cheap is not the
// same as casual, and expensive is emphatically not the same as high-end. A
// 45-krone pint in a brown bar and a 45-krone pint in an airport bar are the
// same number about two different evenings.
//
// ── WHAT THE LIVE DATA SAYS, AND THE ONE IT REFUSES ─────────────────
//
// All six published nightlife rows, read off the site 27 Aug 2026:
//
//   Heidi's Bier Bar     "Party bar (Alpine/après-ski)"   casual
//   Jomfru Ane Gade      "Bar street"                     casual
//   Gothersgade          "Bar street"                     casual
//   Farfar's Bodega      "Bodega with a dance floor"      casual
//   Old Irish Pub        "Party pub"                      casual
//   Hive                 "Nightclub"                      — nothing
//
// FIVE OF SIX, AND THE SIXTH IS THE ONE THAT MATTERS. Hive is Copenhagen's
// dressy club and the only high-end venue in the pool, and its category says
// "Nightclub", which settles nothing: a sticky-floored student club is also a
// nightclub. So "nightclub" is deliberately on neither list.
//
// That is not the reader failing. It is placeKind.js's rule, which this
// codebase has applied since August: "A place is only a village if somebody
// SAID it is a village. Inferring it from a population figure the entry does
// not carry, or from a name that 'sounds small', is exactly the invention this
// codebase exists to refuse." A club's register is a real fact about a door
// policy, and it belongs in `venueStyle` on the row, stated.
import { alt, LETTER } from "./travellerWords";

const clean = (v) => String(v == null ? "" : v).trim();

export const VENUE_STYLES = ["highend", "casual"];

// Traveller words. "Dressed up" rather than "High-end" was considered and
// dropped: the friend said high-end, Oliver relayed it in those words, and the
// label a reader taps should be the one the person asking for it used.
export const VENUE_STYLE_LABEL = {
  highend: "High-end",
  casual: "Casual",
};

// ── HIGH-END FIRST, FOR THE SAME REASON foodStyle CHECKS fine FIRST ─
// "Cocktail bar" contains "bar". "Champagne pub" would contain "pub". The most
// specific bucket has to be tried first or the last generic word in a category
// files a champagne room as a boozer.
//
// Nothing short and ambiguous is on these lists. "Club" alone is absent on
// purpose — a nightclub, a jazz club and a members' club are three different
// evenings, and the bare word picks none of them.
const CATEGORY_WORDS = {
  highend: ["cocktail bar", "cocktailbar", "cocktail lounge", "champagne", "champagnebar",
            "wine bar", "vinbar", "vinbaren", "speakeasy", "rooftop bar", "rooftop",
            "whisky bar", "whiskybar", "cigar", "supper club", "members club",
            "members' club", "upscale", "high-end", "fine drinking"],
  casual: ["bodega", "brown bar", "brun bar", "brune bar", "værtshus", "vaertshus",
           "pub", "irish pub", "party pub", "party bar", "sports bar", "sportsbar",
           "dive bar", "dive", "beer bar", "bier bar", "bierbar", "ølbar", "olbar",
           "brewpub", "bryggeri", "bryghus", "student bar", "studenterbar",
           "karaoke", "bar street", "barstreet", "bargade", "pool bar", "biker bar"],
};

// Built once. `alt` escapes the regex characters and sorts longest first, so
// "cocktail bar" is tried before "bar" would be if it were ever on a list, and
// "party pub" before "pub".
//
// Danish welds the modifier onto the front and puts the HEAD last — a vinbar is
// a bar, a studenterbar is a bar — so the left edge is open and the RIGHT edge
// does the work, with the definite and plural endings allowed after it. Exactly
// foodStyle's compound rule, and for exactly the same language.
const ENDINGS = "(?:erne|ene|en|et|er|ne|e)?";
const CATEGORY_RE = Object.fromEntries(
  VENUE_STYLES.map(s => [s, new RegExp(`(?:${alt(CATEGORY_WORDS[s])})${ENDINGS}(?![${LETTER}])`, "i")])
);

// ── THE ONE FUNCTION EVERYTHING ELSE READS ──────────────────────────
// The badge, the facet test and the counts all come through here, so a count
// and the filter it applies cannot disagree by construction rather than by an
// assertion watching two copies. Same argument eventFacets makes for declaring
// `test` once.
export const venueStyleOf = (entry) => {
  const stated = clean(entry && entry.venueStyle).toLowerCase().replace(/[\s-]+/g, "");
  if (VENUE_STYLES.includes(stated)) return stated;
  const cat = clean(entry && entry.category);
  if (!cat) return null;
  for (const s of ["highend", "casual"]) if (CATEGORY_RE[s].test(cat)) return s;
  return null;                                   // not guessed, and that is an answer
};

export const venueStyleLabel = (entry) => VENUE_STYLE_LABEL[venueStyleOf(entry)] || "";

// ── WHICH ROWS THIS CANNOT ANSWER FOR ───────────────────────────────
// So the gap is readable rather than merely absent. A category this file has
// never seen — or "Nightclub", which it refuses on purpose — is not a bug in
// the reader. It is a row whose author should state `venueStyle` outright, and
// the only way anybody finds out which rows those are is by listing them.
export const unstyledVenues = (entries) =>
  (Array.isArray(entries) ? entries : []).filter(e => venueStyleOf(e) == null);

export const venueStyleCoverage = (entries) => {
  const all = Array.isArray(entries) ? entries : [];
  if (!all.length) return 1;
  return (all.length - unstyledVenues(all).length) / all.length;
};

export const stylesPresent = (entries) =>
  VENUE_STYLES.filter(s => (Array.isArray(entries) ? entries : []).some(e => venueStyleOf(e) === s));

// ── THE CONTROL DOES NOT RENDER UNTIL IT CAN CHANGE SOMETHING ───────
//
// TWO GATES, AND THE SECOND IS THE ONE THAT BITES TODAY.
//
// Coverage first, foodStyle's gate and its reasoning: below half, "the control
// would be removing more by ignorance than by intent", and a control that lies
// looks exactly like the ones that do not.
//
// Then: at least two styles actually present. foodStyle states this one too, on
// its Type dropdown — "with nothing published as a food street, 'Restaurants'
// means everything and the control is a tap that does nothing."
//
// On today's six rows that is exactly the situation. Five classify as casual
// and Hive classifies as nothing, so a Style control would offer Casual (5) and
// nothing else: a filter whose only option is the list you are already looking
// at. It stays hidden until a second style exists, which happens the moment
// somebody states venueStyle on Hive — and Hive's register is a real fact about
// its door, so a person stating it is the right way for that to arrive.
// NAMED VENUE_STYLE_COVERAGE_MIN AND NOT STYLE_COVERAGE_MIN, because
// foodStyle.js already exports that name for the same idea on a different pool.
// Two modules exporting one constant is how a later import silently picks the
// wrong threshold, and the suite caught it the moment both were exported into
// one namespace.
export const VENUE_STYLE_COVERAGE_MIN = 0.5;

export const showVenueStyleFacet = (entries, min = VENUE_STYLE_COVERAGE_MIN) => {
  const all = Array.isArray(entries) ? entries : [];
  return all.length > 0 && venueStyleCoverage(all) >= min && stylesPresent(all).length >= 2;
};

// ── THE FACET ITSELF LIVES HERE, NOT IN App.jsx ─────────────────────
// Same argument that moved the food facets out and layoutBody before them: this
// decides what a reader sees, and a decision that lives in App.jsx can only be
// tested by running a regex over its own source. Declared here, the suite can
// build a pool of rows, apply it, and read what really comes back — the
// difference between checking that a filter EXISTS and checking that it filters.
export const buildNightlifeStyleFacet = (entries) => {
  const all = Array.isArray(entries) ? entries : [];
  if (!showVenueStyleFacet(all)) return [];
  return [{
    key: "style", label: "Style", primary: true,
    options: [{ value: "All", label: "All" },
              ...stylesPresent(all).map(s => ({ value: s, label: VENUE_STYLE_LABEL[s] }))],
    test: (v, value) => venueStyleOf(v) === value,
  }];
};
