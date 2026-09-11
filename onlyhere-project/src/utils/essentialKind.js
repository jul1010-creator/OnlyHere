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
// ── AND THE EIGHT ARE NO LONGER ALL OF THEM ─────────────────────────
//
// Oliver, 11 Sep 2026: "make me able to choose category or let me make a new
// category. But only for Essentials."
//
// ESSENTIAL_CATEGORIES lives in sourcePolicy.js and is eight entries long, each
// with an anchor, an icon and a colour. Its comment is the strictest warning in
// that file: "A CATEGORY THE PAGE DOES NOT LOOP OVER IS A ROW THAT VANISHES",
// written after a published essential filed under a category the loop never
// asked for wrote to the database, merged cleanly, and appeared nowhere.
//
// So a new category cannot simply be typed into a field. Three things have to
// be true of it or that is the same bug again, deliberately this time:
//
//   IT MUST SURVIVE WITHOUT A DEPLOY.  Studio writes to Supabase and the eight
//     live in code. A category he can only add by editing a file is not a
//     category he can add. So the live vocabulary is DERIVED: the fixed eight,
//     plus every category the published rows are already using.
//   IT MUST HAVE AN ANCHOR, AN ICON AND A COLOUR.  He asked to type only a
//     name, so the other three are computed from it.
//   A ROW MUST NEVER FALL OUT OF THE LIST.  A row whose category is empty, or
//     filed under something later renamed, lands in Unsorted rather than
//     nowhere. Unsorted exists only while something is in it.
const clean1 = (v) => String(v == null ? "" : v).trim().replace(/\s+/g, " ");

// A category is a LABEL. Not a sentence, not a description, and not the entry's
// own name pasted into the wrong box. Same discipline as cleanIsland in
// placeEdit.js: refuse prose rather than store it and render it as a heading.
export const MAX_CATEGORY_WORDS = 4;
export const cleanCategory = (v) => {
  const t = clean1(v).slice(0, 40);
  if (!t) return "";
  if (t.split(" ").length > MAX_CATEGORY_WORDS || /[.;:!?]/.test(t)) return "";
  return t;
};

export const UNSORTED_CATEGORY = "Unsorted";

// ── THE ANCHOR IS NAMESPACED, AND THAT IS NOT COSMETIC ──────────────
//
// The Essentials page hand-writes three anchors that are NOT categories:
// ess-weather, ess-faq and ess-safety, the last being the fine warning drawn
// above everything else. A category called "Safety" would derive "ess-safety",
// two elements would share one id, and the chip would scroll to whichever the
// browser found first. Deriving into a namespace of its own makes that
// collision impossible rather than unlikely, so nobody has to remember the list
// of hand-written anchors when adding the next one.
const CATEGORY_ANCHOR_PREFIX = "ess-c-";
export const categoryAnchor = (cat) => {
  const slug = clean1(cat).toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? CATEGORY_ANCHOR_PREFIX + slug : "";
};

// One emoji for every category he makes, because he asked to type only a name.
// Deliberately a filing icon rather than a guess at the subject: an icon picked
// by keyword would be right about "Ferries" and silently wrong about everything
// it had no rule for, and a wrong icon is worse than a neutral one.
export const NEW_CATEGORY_ICON = "📌";

// A colour from the name, so a category he invents looks like the eight rather
// than like a bug. Stable, because the same name has to draw the same colour on
// every device and every reload, so it cannot be random or index-based: a
// category added later would then repaint the ones before it.
//
// Hue only. Saturation and lightness are fixed in the range the eight already
// sit in, which is what keeps a derived chip readable on the dark surface and
// against its own 22-alpha background. A colour picker was the other option and
// he said name only.
const hueOf = (cat) => {
  const t = clean1(cat).toLowerCase();
  let h = 0;
  for (let i = 0; i < t.length; i += 1) h = (h * 31 + t.charCodeAt(i)) % 360;
  return h;
};
export const categoryColor = (cat) => {
  const h = hueOf(cat) / 360, s = 0.55, l = 0.38;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const ch = (t0) => {
    const t = t0 < 0 ? t0 + 1 : t0 > 1 ? t0 - 1 : t0;
    const v = t < 1 / 6 ? p + (q - p) * 6 * t
      : t < 1 / 2 ? q
      : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6
      : p;
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${ch(h + 1 / 3)}${ch(h)}${ch(h - 1 / 3)}`;
};

// The category a row is IN, which is the question the chip row and the render
// loop both have to answer the same way or a row sits under a heading that does
// not list it. One function, exported, so there is one answer to it.
export const categoryOf = (row) => cleanCategory(row?.category) || UNSORTED_CATEGORY;

export const rowsInCategory = (rows, cat) =>
  (Array.isArray(rows) ? rows : []).filter(r => categoryOf(r) === cat);

// Every category that may be OFFERED: the fixed eight in their own order, then
// whatever the published rows have grown, alphabetically so the list stays
// stable as rows come and go, then Unsorted last and only when something is
// unfiled.
//
// Fed the WHOLE pool rather than one tab's rows, so a category he made on the
// Tips side is offered when he files an Essential, which is the point of being
// able to make one at all.
export const categoryVocabulary = (rows, fixed) => {
  const base = Array.isArray(fixed) ? fixed : [];
  const known = new Set(base.map(c => c.cat));
  const all = Array.isArray(rows) ? rows : [];
  const grown = [...new Set(all.map(r => cleanCategory(r?.category)).filter(c => c && !known.has(c)))].sort();
  const out = [...base, ...grown.map(cat => ({ cat, anchor: categoryAnchor(cat), icon: NEW_CATEGORY_ICON, color: categoryColor(cat) }))];
  if (all.some(r => categoryOf(r) === UNSORTED_CATEGORY)) {
    out.push({ cat: UNSORTED_CATEGORY, anchor: categoryAnchor(UNSORTED_CATEGORY), icon: "🗂", color: "#5F6672" });
  }
  return out;
};

export const categoriesPresent = (rows, allCategories) => {
  const list = Array.isArray(rows) ? rows : [];
  return (Array.isArray(allCategories) ? allCategories : []).filter(c => list.some(r => categoryOf(r) === c.cat));
};

// One field, one PATCH, the same shape as kindPatch above and for the same
// stated reason. "" is a real value here and means unfiled, which is why
// cleanCategory returning "" on prose is safe: the row goes to Unsorted where he
// can see it, rather than under a heading made out of a sentence.
export const categoryPatch = (row, next) => {
  const want = cleanCategory(next);
  return want === cleanCategory(row && row.category) ? {} : { category: want };
};

export const hasCategoryChange = (row, next) => Object.keys(categoryPatch(row, next)).length > 0;

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
