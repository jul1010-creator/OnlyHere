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
export const PLACE_THEMES = ["nature", "coast", "history", "food", "nightlife", "art", "family"];

export const THEME_LABEL = {
  nature: "Nature",
  coast: "Coast",
  history: "History",
  food: "Food",
  nightlife: "Nightlife",
  art: "Art & design",
  family: "Family",
};

export const THEME_EMOJI = {
  nature: "🌿", coast: "🌊", history: "🏛", food: "🍽", nightlife: "🍺", art: "🎨", family: "🧸",
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
export const TIERS = [
  { id: "must", match: /can'?t\s*miss/i, label: "Can't miss", mark: "★" },
  { id: "high", match: /highly\s*recommend/i, label: "Highly recommended", mark: "◆" },
  { id: "worth", match: /worth\s*considering/i, label: "Worth a look", mark: "" },
  { id: "nearby", match: /already\s*nearby/i, label: "If you're nearby", mark: "" },
];

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
