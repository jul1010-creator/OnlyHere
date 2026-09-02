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

// ── THE SPLIT, WRITTEN DOWN ONCE ────────────────────────────────────
//
// Said in one place because three readers need the same sentence: the model
// drafting a new row, the founder placing a published one, and whoever changes
// this next. The test above the code is Oliver's own: "some things are
// essentials while others are tips."
//
// An ESSENTIAL is something a visitor has to get right or they are fined,
// stranded, or unable to pay. A TIP makes the trip better and costs nothing to
// skip. The reader arriving the night before their flight wants the first list
// and is reading past the second.
export const KIND_RULE = 'An ESSENTIAL is something a visitor has to sort out or they are fined, stranded, or unable to pay for something. A TIP makes the trip better but nothing goes wrong if they skip it. Ask which list a person reading the night before their flight needs: if missing this costs them money or strands them, it is an essential; if it only means a slightly worse trip, it is a tip.';

// NAMED ESSENTIAL_KIND_LABEL, not KIND_LABEL, because placeKind.js already
// exports that name for a different question — Town, District, Area, about
// where a place sits inside another one. App.jsx imports both, and the build
// refused the collision outright. entryPrice.js hit exactly this and wrote the
// rule down: "Two exports with one name, imported into one file, is a rename
// waiting to pick the wrong one."
export const ESSENTIAL_KIND_LABEL = { essential: "Essential — goes wrong if they miss it", tip: "Tip — makes the trip better" };

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

// ── AND A PUBLISHED ROW CAN BE MOVED WITHOUT REDRAFTING IT ──────────
//
// Oliver, 1 Sep 2026: "Nightpay is more of a tip though.." — about a row
// published through Studio months ago, which has no `kind` on it at all and so
// takes the default. There was no way for him to move it: `kind` was not in
// shapeForLive's allow-list, so even editing it would have been stripped on the
// way to the database, and redrafting the whole entry to change one word is not
// an edit, it is a rewrite.
//
// The same shape as placePatch, deliberately, and for the same stated reason:
// "A PATCH that resends the whole payload is how an unrelated field gets
// clobbered by whatever the panel happened to be holding." Only the field that
// changed, and only a value in the vocabulary.
//
// EMPTY IS A REAL CHOICE and it is not the same as "essential". It puts the row
// back among the unplaced ones, where unsortedEssentials can find it, rather
// than asserting a judgement nobody made. The reader sees the same tab either
// way — that is what the default is for — but the founder view can tell them
// apart, which is the whole reason kindStated exists.
export const cleanKind = (v) => (ESSENTIAL_KINDS.includes(clean(v)) ? clean(v) : "");

export const kindPatch = (row, next) => {
  const want = cleanKind(next);
  return want === cleanKind(row && row.kind) ? {} : { kind: want };
};

export const hasKindChange = (row, next) => Object.keys(kindPatch(row, next)).length > 0;

// ── "ASK IF THE BARS TAKE NIGHTPAY" ─────────────────────────────────
//
// Oliver, 1 Sep 2026, asking for a tip at the top of Nightlife. A tip a reader
// can act on needs somewhere to go: "Nightpay" means nothing to somebody who
// has just landed, and the row explaining it is already published.
//
// WHICH TAB IT IS ON IS NOT KNOWABLE AT WRITE TIME. Nightpay is a Studio row,
// its kind is his to set, and he is moving it from Essentials to Tips. A
// hardcoded tab would be wrong the moment he does, and wrong silently — the
// link would land on the right page with the row nowhere on it.
//
// So the tab is read from the row itself, through the same kindOf every other
// reader uses. Returns "" when nothing matches, and the caller shows the tip
// without a link rather than sending somebody to a page that cannot answer.
export const tabForEssential = (rows, name) => {
  const want = clean(name);
  if (!want) return "";
  const hit = (Array.isArray(rows) ? rows : []).find(r => clean(r?.name).includes(want));
  if (!hit) return "";
  return kindOf(hit) === "tip" ? "tips" : "essentials";
};
