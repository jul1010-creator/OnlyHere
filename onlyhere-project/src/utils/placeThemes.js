// ── WHAT IS THIS PLACE ACTUALLY FOR ─────────────────────────────────
// Oliver, 8 Aug 2026: "I would also like the 'tier' to be showing on the
// captions before clicking the blog. OH, and what category it fits into. Like
// 'nature, history, nightlife, food, etc.'"
//
// The card already carried a `tag`, and Asaa's said "small harbor town". That is
// a nice line and it answers nothing: it is free text, so it cannot be filtered,
// cannot be compared between two entries, and no two drafts write it the same
// way. It is the `region` problem again in a smaller box.
//
// So this is a CLOSED VOCABULARY, for exactly the reason placeKind is one. Seven
// values, written down here, validated on the way in. A theme that is not on
// this list does not exist, which means the filter can never grow an eighth pill
// because a model felt creative, and two entries about the same kind of place
// always say it with the same word.
//
// Kept to seven on purpose. A vocabulary big enough to describe everything
// describes nothing, and every extra value is another chip on a page he has
// already told me is too busy.
// NAMED PLACE_THEMES, NOT THEMES. `utils/theme.js` next door already exports a
// THEMES, for the colour palettes, and this file was briefly called themes.js
// exporting THEMES beside it. Two files one letter apart exporting the same
// symbol is a collision that esbuild caught immediately and a human reviewer
// would not have, so neither the filename nor the export is ambiguous now.
// ── AND SEVEN COULD NOT SAY WHAT THIS TRAVELLER ASKED FOR ───────────
// Oliver, 15 Aug 2026, on a preview built from "We like markets and modern
// design", which came back holding Amalienborg Slot, Københavns Museum and the
// Ny Carlsberg Glyptotek: "Don't put up a bunch of random attractions just to
// have something."
//
// The narrowing is meant to stop exactly that and it could not, because the
// vocabulary had no word for either thing he asked for. "market" appeared
// nowhere in the app at all, and "design" was folded into `art`, whose label
// was literally "Art & design", so a classical sculpture gallery and a design
// shop carried the same tag and were therefore the same recommendation.
//
// Two values added, and the cap above is still the rule that governs: each one
// is here because a real brief named it and this list could not answer. `art`
// keeps every row already tagged with it and loses only the half of its label
// that now has a value of its own.
export const PLACE_THEMES = ["nature", "coast", "history", "food", "nightlife", "art", "design", "market", "family"];

export const THEME_LABEL = {
  nature: "Nature",
  coast: "Coast",
  history: "History",
  food: "Food",
  nightlife: "Nightlife",
  art: "Art",
  design: "Design",
  market: "Markets",
  family: "Family",
};

export const THEME_EMOJI = {
  nature: "🌿", coast: "🌊", history: "🏛", food: "🍽", nightlife: "🍺", art: "🎨", design: "🪑", market: "🧺", family: "🧸",
};

// Three is the cap, and it is a real limit rather than a display truncation.
// A place that is about five things is not about anything, and a card with five
// chips on it is unreadable at the size these render.
export const MAX_THEMES = 3;

const clean = (v) => String(v == null ? "" : v).trim().toLowerCase();

// Accepts what a model actually returns: an array, or a comma-separated string,
// or a single word. Everything outside the vocabulary is dropped silently here
// and reported by the sweep, never coerced into the nearest-looking value.
export const cleanThemes = (raw) => {
  const list = Array.isArray(raw) ? raw
    : typeof raw === "string" ? raw.split(/[,;/|]/)
    : [];
  const out = [];
  for (const item of list) {
    const v = clean(item);
    if (!PLACE_THEMES.includes(v) || out.includes(v)) continue;
    out.push(v);
    if (out.length >= MAX_THEMES) break;
  }
  return out;
};

export const themesOf = (entry) => cleanThemes(entry?.themes);
export const hasTheme = (entry, theme) => !theme || themesOf(entry).includes(theme);

// Only the themes something published actually carries. A chip that returns an
// empty grid is a filter offering an empty room.
export const themesPresent = (entries) => {
  const found = new Set();
  for (const e of Array.isArray(entries) ? entries : []) themesOf(e).forEach(t => found.add(t));
  return PLACE_THEMES.filter(t => found.has(t));
};

// ── HOW WELL KNOWN, SHOWN ON THE CARD ───────────────────────────────
// The tier was already stored and already filtered on, and the only place a
// reader could see it was a "Top Pick" badge on the photo of the very top tier.
// Everything else looked identical, so "Can't Miss Out" and "Best If You're
// Already Nearby" were the same card.
//
// The stored strings are long and inconsistently cased across 71 rows written
// over weeks ("Can't Miss Out", "Can't miss out"), so they are matched loosely
// and rendered from ONE list rather than printed raw.
// ── THE GATE OFFERED WORDS THE GATE REFUSES ─────────────────────────
//
// 25 Aug 2026. Oliver could not publish a Copenhagen draft: "it said couldn't
// publish, and it was because tier wasn't showing."
//
// The publish gate is right to refuse an unranked entry, and the comment above
// it in App.jsx explains at length why the silent "Worth Considering" default
// was removed. What the gate then TELLS him to do is
// `TIERS.map(t => t.label)`, and two of those four labels do not pass the
// matcher standing beside them:
//
//   "Can't miss"          accepted
//   "Highly recommended"  accepted
//   "Worth a look"        REJECTED by /worth\s*considering/
//   "If you're nearby"    REJECTED by /already\s*nearby/
//
// So a founder who does exactly what the refusal says is refused again, by the
// same sentence, with no way to tell which half was wrong. That is the failure
// this file's neighbour already has a name for, written above the festival date
// gate: "A gate whose instructions cannot be followed is not a gate, it is a
// wall."
//
// TWO FIELDS NOW, BECAUSE THEY ARE TWO JOBS. `label` is what a card prints and
// is free to be short. `value` is what belongs in the draft, and it is the
// wording the drafting prompt already asks the model for, so the gate can quote
// the strings it accepts instead of the strings it displays. The suite asserts
// both directions: every label and every value passes tierOf, and every value
// appears in the prompt.
//
// AND PUNCTUATION IS NOT A DIFFERENT JUDGEMENT. "Can't-miss" is the same ranking
// as "Can't miss", and a model writes the hyphen often enough that refusing it
// costs a research run to fix a dash. `[\s-]*` is tolerance of typography, not
// of meaning: nothing here accepts a tier nobody wrote, and "Must-see" and
// "Essential" are still refused, because those are the model inventing a scale
// Gemlyx does not use.
export const TIERS = [
  { id: "must", match: /can'?t[\s-]*miss/i, label: "Can't miss", value: "Can't Miss Out", mark: "★" },
  { id: "high", match: /highly[\s-]*recommend/i, label: "Highly recommended", value: "Highly Recommended", mark: "◆" },
  { id: "worth", match: /worth[\s-]*(?:considering|a[\s-]*look)/i, label: "Worth a look", value: "Worth Considering", mark: "" },
  { id: "nearby", match: /(?:already|if[\s-]*you'?re)[\s-]*nearby/i, label: "If you're nearby", value: "Best If You're Already Nearby", mark: "" },
];

// What the gate quotes. The strings the DRAFT must carry, never the display
// labels, which is the whole bug above.
export const TIER_VALUES = TIERS.map(t => t.value);

export const tierOf = (entry) => {
  const t = String(entry?.tier ?? "").trim();
  if (!t) return null;
  return TIERS.find(x => x.match.test(t)) || null;
};

// Returns null rather than a guess when the stored tier matches nothing on the
// list. A card showing an invented rank is worse than a card showing none, and
// an unrecognised tier is a data problem the audit should surface, not something
// the renderer papers over.
export const tierLabel = (entry) => {
  const t = tierOf(entry);
  return t ? `${t.mark ? `${t.mark} ` : ""}${t.label}` : null;
};

// ── "IT HAS TO BE MORE EXPOSED" ─────────────────────────────────────
//
// Oliver, 15 Aug 2026: "I think the 'worth considering' 'only if you're nearby'
// has to be more exposed. I know it's there, but many users probably will
// overlook it. And it's quite important to see. Perhaps having it in the right
// or left corner of the picture?"
//
// He is right and it is worse than a visibility problem. The tier rendered as a
// gold pill in the SAME row, the SAME shape and the SAME size as the theme
// chips, so "Worth a look, Coast, History, Art" reads as one row of categories.
// The tier is a VERDICT and the themes are LABELS, and they were written in one
// visual language.
//
// AND THE PHOTO CORNER WAS ALREADY TAKEN, BY THE WRONG THING. It carried
// `nomiPotential === "Very High"` as "Top Pick" and `popularityTag === "Common
// Attraction"`, two legacy free text fields, while `tier`, the closed
// vocabulary the whole app filters on, sat buried in the chip row. Two
// competing rank systems on one card, with the weaker one in the prominent slot.
//
// ── AND THE CAUTIOUS TIERS ARE THE ONES THAT MATTER MOST ────────────
// "Can't miss" on a photo is nice to have. "If you're nearby" on a photo is the
// one that saves somebody a four hour drive to Lundeborg. The old design
// promoted the tier that costs nothing to miss and hid the tier that costs a
// day, which is exactly backwards.
//
// So the badge is TONED by what it is telling you: gold for a recommendation,
// plain for a caution. A caution painted in the same celebratory gold as a
// recommendation is the same mistake in a new place.
export const TIER_TONE = {
  must: { bg: "rgba(212,175,55,0.92)", fg: "#1A1206", caution: false },
  high: { bg: "rgba(212,175,55,0.82)", fg: "#1A1206", caution: false },
  worth: { bg: "rgba(10,15,30,0.82)", fg: "#E8E4DC", caution: true },
  nearby: { bg: "rgba(10,15,30,0.88)", fg: "#FFB347", caution: true },
};

export const tierBadge = (entry) => {
  const t = tierOf(entry);
  if (!t) return null;
  const tone = TIER_TONE[t.id] || TIER_TONE.worth;
  return { id: t.id, label: `${t.mark ? `${t.mark} ` : ""}${t.label}`, ...tone };
};
