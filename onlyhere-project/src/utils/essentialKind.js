// ── "SOME THINGS ARE ESSENTIALS WHILE OTHERS ARE TIPS" ───────────────
//
// Oliver, 30 Aug 2026: "I find that essentials is a long list and could be put
// into categories better. Perhaps, we should have one more navi called 'tips'
// instead? Because some things are essentials while others are tips."
//
// The list was already categorised, and that is exactly why categorising it
// harder would not have helped: fourteen rows across EIGHT categories is two
// items a heading. The structure was there and it was not reducing anything,
// because the problem is not that the rows are unsorted. It is that two
// different documents are living in one list.
//
// One of them is: sort this out or you will be fined, stranded or unable to
// pay. The other is: this will make the trip better. A reader arriving the
// night before their flight wants the first and is reading past the second.
//
// ── AND AN UNCLASSIFIED ROW IS AN ESSENTIAL ─────────────────────────
//
// utils/liveContent.js pushes rows published through Studio into the same array
// as the hardcoded ones, and those rows have no `kind` on them. A row this file
// cannot place must not vanish and must not be demoted: an essential shown as a
// tip is a warning somebody missed, while a tip shown as an essential is only
// noise. So the default is the safe direction, and the rows that took it are
// listable, the same way unstyledVenues makes the gap in venueStyle readable.
const clean = (v) => String(v == null ? "" : v).trim().toLowerCase();

export const ESSENTIAL_KINDS = ["essential", "tip"];

export const kindOf = (row) => {
  const k = clean(row && row.kind);
  return ESSENTIAL_KINDS.includes(k) ? k : "essential";
};

// Stated, rather than defaulted. The difference matters for the founder view
// and not at all for a reader.
export const kindStated = (row) => ESSENTIAL_KINDS.includes(clean(row && row.kind));

export const essentialsOnly = (rows) => (Array.isArray(rows) ? rows : []).filter(r => kindOf(r) === "essential");
export const tipsOnly = (rows) => (Array.isArray(rows) ? rows : []).filter(r => kindOf(r) === "tip");

// The rows nobody has placed, so a published essential landing in the wrong tab
// is findable rather than merely wrong.
export const unsortedEssentials = (rows) => (Array.isArray(rows) ? rows : []).filter(r => !kindStated(r));

// ── AND THE CATEGORY ROW SHRINKS WITH THE LIST ──────────────────────
//
// The chips are built from ESSENTIAL_CATEGORIES, which is a fixed list of
// eight. Split across two tabs, most of those categories are empty on any given
// tab, and a chip that scrolls a reader to nothing is worse than no chip. So
// each tab offers only the categories its own rows actually use.
//
// The same rule the food Type dropdown already states: "with nothing published
// as a food street, 'Restaurants' means everything and the control is a tap
// that does nothing."
export const categoriesPresent = (rows, allCategories) => {
  const used = new Set((Array.isArray(rows) ? rows : []).map(r => String(r?.category || "").trim()).filter(Boolean));
  return (Array.isArray(allCategories) ? allCategories : []).filter(c => used.has(c.cat));
};

// ── ONE CARD CAN HOLD TWO OPERATORS ─────────────────────────────────
//
// Oliver: "Kombardo Expressen and Flixbus could technically be in same
// 'apartment'." They could, and they are the clearest case: two budget coach
// lines, one question ("how do I cross the country cheaply"), two cards.
//
// A merged row carries `links`, and every existing row carries `link`. Both
// shapes render, because rewriting twelve rows that are already correct to
// introduce a field they do not need is how a tidy-up breaks published content.
// linksOf gives the render one shape to draw whichever it was handed.
export const linksOf = (row) => {
  const many = Array.isArray(row?.links) ? row.links.filter(l => l && l.url) : [];
  if (many.length) return many.map(l => ({ label: String(l.label || "").trim(), url: String(l.url).trim(), note: String(l.note || "").trim() }));
  const one = String(row?.link || "").trim();
  return one ? [{ label: "", url: one, note: "" }] : [];
};

export const isMerged = (row) => linksOf(row).length > 1;
