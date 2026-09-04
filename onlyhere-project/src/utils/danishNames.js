// ── "I TYPE COPENHAGEN, BUT COPENHAGEN IN DANISH IS KØBENHAVN" ──────
//
// Oliver, 8 Aug 2026, immediately after asking whether his source list was
// actually reaching the research: "So it has to go over those sources too. Not
// sure if it already translates."
//
// It did not. Every research query this app has ever built is a template of the
// form `${name} Denmark ...`, in English, with the name spelled however it was
// typed into Studio. A Danish tourist board's page about the capital is filed
// under København, a municipality's opening hours are on a /da/ page, and a
// harbour's own timetable is written entirely in Danish. Searching "Copenhagen
// Denmark travel guide" and then asking a model to check visitdenmark.dk is
// asking it to find a page that is not phrased anything like the question.
//
// This is worse for exactly the sources he cares about. An international
// aggregator writes in English and ranks for English queries, which is why the
// research kept coming back with cntraveler and bontraveler. The Danish primary
// sources, the ones that actually know the opening hours, mostly do not.
//
// ── WHAT THIS FILE WILL AND WILL NOT DO ─────────────────────────────
// It holds the real name pairs, the ones where the Danish and international
// names are DIFFERENT WORDS rather than different spellings, and it is short
// because that list genuinely is short. It does NOT try to translate arbitrary
// Danish, and that restraint is the point: a guessed translation is not a
// neutral miss, it is a search query spent asking about a place that does not
// exist under that name, and a model told to look for it will find something.
//
// The open-ended half is handled where translation actually belongs, in the
// prompt (DANISH_LANGUAGE_RULES in App.jsx), by models that can read Danish.
// Code handles what code can check.

// ── THE FOLD, AND A BUG IN IT ───────────────────────────────────────
// This moved here from geography.js because it is a fact about Danish letters,
// and because it was wrong. It ran NFD normalisation FIRST, and å decomposes
// (a + ring) while ø and æ do not. So the å→"aa" line never fired: "Århus"
// folded to "arhus" and "Aarhus" folded to "aarhus", which are not equal.
//
// That is not academic. Both spellings are in live use, the 1948 reform swapped
// aa for å and the 2011 city-council decision swapped Aarhus back, so Danish
// pages use both. Searching "Aarhus" in the Studio search bar could not find a
// place filed as "Århus", and vice versa. The Danish letters are now replaced
// BEFORE decomposition, so the rule reaches them.
export const fold = (s) => String(s ?? "").toLowerCase()
  .replace(/ø/g, "o").replace(/æ/g, "ae").replace(/å/g, "aa")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\s+/g, " ").trim();

// ── A NAME INSIDE A LONGER STRING, WITHOUT THE ACCIDENTS ────────────
// `fold(hay).includes(fold(name))` was written in two separate places and is
// wrong in both, for the same reason: Danish place names are short, and a short
// string is inside a great many longer ones.
//
//   "Als"  is inside "also" and inside "Falster"
//   "Møn"  folds to "mon" and is inside "money", "month", "Monday", "common"
//   "Fur"  is inside "Furesø"
//   "Ærø"  folds to "aero" and is inside "Ærøskøbing"
//
// On the preview screen that meant a card for an island the traveller never
// mentioned. On the discovery side it meant a real candidate silently binned as
// "already covered". Both are the same missing rule: a name matches when it is
// there as a WHOLE WORD, not when its letters happen to appear.
//
// Punctuation is a gap rather than a letter, so "Reffen, Copenhagen" still
// contains "Reffen" and "Nørresundby (Aalborg)" still contains "Aalborg".
// Padding both sides is what makes the first and last word reachable.
const spaced = (s) => ` ${fold(s).replace(/[^a-z0-9]+/g, " ").trim()} `;
export const containsName = (haystack, name) => {
  const needle = spaced(name);
  if (needle === "  ") return false;
  return spaced(haystack).includes(needle);
};

// ── EVERY PLACE A NAME APPEARS, AND WHAT SITS AROUND IT ──────────────
//
// containsName answers "is it in there". Three callers needed the next question,
// "is there a CUE in front of it": arrivalPoint asking whether they landed at an
// airport or merely mentioned the town, isDeparturePlace asking whether they are
// leaving a place or sitting in it, regionsNamed asking whether Zealand is New
// Zealand. All three wrote the same two lines by hand and all three got them
// wrong in the same two ways.
//
//     const at = fold(text).indexOf(fold(name));
//     const before = text.slice(Math.max(0, at - 42), at);
//
// ONE: THE INDEX IS INTO THE FOLDED STRING AND THE SLICE IS OFF THE RAW ONE.
// fold does not preserve length. æ becomes ae and å becomes aa, each adding a
// character; runs of whitespace collapse to one, removing several. So a single
// Danish letter or one blank line earlier in the conversation slides the window
// and the cue test reads the wrong forty characters. Measured, on the real
// function:
//
//   "We land at Billund Airport at 21:00."                    -> BLL
//   "We want to see Ærø. We land at Billund Airport at 21:00." -> nothing
//
// and nothing means the route goes unanchored, which is the "Is Ribe not under
// Billund?" screen all over again. convoText is built by joining the assistant's
// replies too, so blank lines and Danish names are in every real one.
//
// TWO: indexOf RETURNS THE FIRST OCCURRENCE ONLY. "Aarhus looks great. We fly
// into Aarhus on the 3rd" tests the first Aarhus, finds no cue in front of it,
// and gives up before reaching the one that says they land there.
//
// Both go away by working in folded space throughout and returning EVERY
// occurrence. `hay` comes back so the caller slices the same string the indices
// were measured in; slicing anything else is the bug this replaces.
//
// Punctuation is a gap for finding the name, exactly as in containsName, and is
// KEPT in `hay` for the cue test, because "don't want to leave" and "fly into"
// are read from it and one of them has an apostrophe in it. The two are made to
// agree by replacing punctuation one character at a time rather than collapsing
// runs, so both strings are the same length and one set of indices fits both.
const gapped = (s) => s.replace(/[^a-z0-9]/g, " ");

// The walk is bounded by the length of the needle rather than by a guard on it.
// `indexOf("")` returns the search position rather than -1, so an empty needle
// with a `for(;;)` never terminates: caught when a mutation removed the empty
// check and the suite hung instead of failing. A hang is worse than a wrong
// answer, because it looks like the machine and not like the code.
export const foundAt = (haystack, name) => {
  const hay = fold(haystack);
  const needle = gapped(fold(name)).trim();
  const at = [], len = needle.length;
  const marks = gapped(hay);
  for (let from = 0; len > 0 && from <= marks.length - len;) {
    const i = marks.indexOf(needle, from);
    if (i < 0) break;
    const before = marks[i - 1], after = marks[i + len];
    if ((before === undefined || before === " ") && (after === undefined || after === " ")) at.push(i);
    from = i + 1;
  }
  return { hay, at, len };
};

// ── PLACES ──────────────────────────────────────────────────────────
// Names that a matcher may treat as the same place. Kept to real one-to-one
// pairs: a town, an island, a region, the country. Anything ambiguous stays out,
// because this table decides whether a source scoped to one city gets sent along
// on a draft about another, and that is the mistake the scoping exists to stop.
// ── "FESTIVAL" IS NOT WHICH FESTIVAL ────────────────────────────────
//
// Oliver, 12 Aug 2026, from a real run. Drafting "Ribelund Festival", the
// pipeline picked these as the place's own website and read them:
//
//   keramikfestival.dk/en/practical-information     a ceramics festival
//   festivalabroad.com/festivals/nibe-festival      a different festival
//   ribemetalfestival.dk                            a different event
//
// The selection matched a candidate domain when its hostname contained any word
// of the place's name of four letters or more. For "Ribelund Festival" those
// words are "ribelund" and "festival", and every festival domain on earth
// contains "festival". So the filter that exists to find the operator's own site
// admitted three unrelated operators, and then the whole draft was measured
// against them: the price trace reported every figure as "NOT FROM THE OFFICIAL
// SITE" while comparing against a ceramics festival, and the date check found no
// announcement because it was reading the wrong announcement.
//
// A word identifies a place only if it is not the CATEGORY the place belongs to.
// "ribelund" identifies. "festival" classifies. The distinction is the whole fix.
//
// The list is Danish and English because the domains are: a Danish venue writes
// "marked" and an aggregator writes "market". It is deliberately about categories
// of PLACE, not adjectives, so it cannot swallow a real name. Where a name is
// nothing but category words the answer is an empty list, which is honest: we
// cannot identify that place from its hostname and should not pretend to.
export const GENERIC_PLACE_WORDS = new Set([
  "festival", "festivalen", "festspil", "marked", "markedet", "market",
  "museum", "museet", "musem", "galleri", "gallery", "bibliotek", "library",
  "slot", "slottet", "castle", "borg", "kirke", "kirken", "church", "kloster",
  "teater", "teatret", "theatre", "theater", "scene", "spillested",
  "center", "centret", "centre", "centrum", "forum", "hallen", "arena",
  "plads", "pladsen", "torv", "torvet", "square", "park", "parken", "garden",
  "havn", "havnen", "harbour", "harbor", "strand", "stranden", "beach",
  "hotel", "hotellet", "kro", "kroen", "vandrerhjem", "hostel", "camping",
  "restaurant", "restauranten", "cafe", "cafeen", "kaffe", "bar", "baren",
  "klub", "klubben", "club", "diskotek", "vinstue", "bodega", "brewery",
  "bryggeri", "bageri", "bakery", "butik", "shop", "store", "gaard", "gard",
  "forsamlingshus", "festsal", "kulturhus", "medborgerhus", "events", "event",
  "koncert", "concert", "tour", "tours", "billetter", "billet", "tickets",
  "visit", "oplev", "guide", "travel", "rejse", "denmark", "danmark",
  // ── THE TWO NEWEST TYPES ARE NAMED AFTER WHAT THEY ARE ──────────
  // Bar streets and food streets shipped in August and this set was written
  // before either existed, so the words that make those names ordinary were
  // missing and every one of them counted as distinctive.
  //
  // The cost, found 3 Sep: "Copenhagen Street Food" shares the words "street"
  // and "food" with street-food.dk, so an unrelated site was accepted as that
  // entry's OWN OPERATOR, which is the strongest source class this pipeline
  // has. Its prices and its opening hours would have gone in as the operator's.
  //
  // Compound Danish street names are unaffected and that is the point:
  // "vestergade" is one ten-letter word, not "vester" plus "gade", so a street
  // still has its own distinctive name. What comes off is the word "gade"
  // standing alone, as in "Jomfru Ane Gade", where it says no more about which
  // street this is than "museum" says about which museum.
  "gade", "gaden", "gagade", "strade", "stradet", "alle", "boulevard",
  "street", "streets", "streetfood", "food", "foods", "mad", "madmarked",
  "hall", "halls", "haller", "hallerne",
]);

// Fold first, so Ærø and Aero are the same word here as everywhere else in this
// file. Four letters is the existing threshold and is kept: it is what stops
// "of", "the" and "og" counting.
export const distinctiveWords = (name) =>
  fold(name)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 4 && !GENERIC_PLACE_WORDS.has(w));

export const PLACE_NAMES = [
  ["Denmark", "Danmark"],
  ["Copenhagen", "København"],
  ["Elsinore", "Helsingør"],
  ["Zealand", "Sjælland"],
  ["Jutland", "Jylland"],
  ["Funen", "Fyn"],
  ["North Jutland", "Nordjylland"],
  ["South Jutland", "Sønderjylland"],
  ["West Jutland", "Vestjylland"],
  ["East Jutland", "Østjylland"],
  ["Central Jutland", "Midtjylland"],
  ["Greater Copenhagen", "Storkøbenhavn"],
  // Not translations, competing spellings of the same name, both current and
  // both used by real Danish sites. They belong here for the same reason.
  ["Aarhus", "Århus"],
  ["Aalborg", "Ålborg"],
  ["Aabenraa", "Åbenrå"],
  ["Faaborg", "Fåborg"],
  ["Graasten", "Gråsten"],
  ["Nykoebing", "Nykøbing"],
];

// ── SIGHTS ──────────────────────────────────────────────────────────
// Deliberately a SEPARATE list, and deliberately not used for place matching. A
// source scoped to "Copenhagen" must not start applying to every draft that
// mentions Tivoli. These exist for one job: adding the Danish name to a search
// so the Danish page can be found at all. Amalienborg is the reason the list
// starts here, since a Commons search for "Amalienborg Slot" is what surfaced
// how differently the two languages file the same building.
export const SIGHT_NAMES = [
  ["The Little Mermaid", "Den Lille Havfrue"],
  ["Tivoli Gardens", "Tivoli"],
  ["The Round Tower", "Rundetårn"],
  ["Amalienborg Palace", "Amalienborg Slot"],
  ["Rosenborg Castle", "Rosenborg Slot"],
  ["Kronborg Castle", "Kronborg Slot"],
  ["Frederiksborg Castle", "Frederiksborg Slot"],
  ["Christiansborg Palace", "Christiansborg Slot"],
  ["Egeskov Castle", "Egeskov Slot"],
  ["The Old Town", "Den Gamle By"],
  ["Copenhagen Airport", "Københavns Lufthavn"],
  ["Copenhagen Central Station", "København H"],
  ["Aarhus Central Station", "Aarhus H"],
];

const index = (pairs) => {
  const m = new Map();
  for (const pair of pairs) {
    for (const n of pair) {
      const k = fold(n);
      if (!k) continue;
      const bucket = m.get(k) || [];
      for (const other of pair) if (!bucket.includes(other)) bucket.push(other);
      m.set(k, bucket);
    }
  }
  return m;
};

const PLACE_INDEX = index(PLACE_NAMES);
const ALL_INDEX = index([...PLACE_NAMES, ...SIGHT_NAMES]);

// Every way this place is written, the given spelling first so a caller can use
// it as-is. Returns a single-element array when nothing is known, which is the
// honest answer and keeps every call site free of null checks.
//
// includeSights is off by default. Matching must not walk the sight table (see
// above); searching should.
// ── "The Latin Quarter (Latinerkvarteret)" IS TWO SPELLINGS ─────────
//
// Oliver's Latin Quarter run, 1 Sep. The entry published with ONE usable
// source out of about seventy pages, under a heading that promises the reader
// how we know. Every one of the others was refused because the source filter
// folded the whole typed name into the single contiguous phrase
// "the latin quarter latinerkvarteret" and looked for it. No page on earth
// writes that. Not the English one, not the Danish one, not the page that
// helpfully says "The Latin Quarter (Danish: Latinerkvarteret)".
//
// A founder typing "X (Y)" is writing down two names for one place — the
// second is what the local pages call it, which is exactly the spelling the
// research most needs to match. placeChoice.js already knew: its subjectCore
// strips the parenthetical and its comment calls it "his own disambiguator".
// That made two matchers with one rule between them, and only one of them had
// it. So the split lives here, where every matcher already comes for its
// spellings.
//
// NESTED OR EMPTY PARENTHESES ARE LEFT ALONE: "(" with nothing usable either
// side is not a disambiguator, it is punctuation, and splitting on it would
// hand back a fragment that matches everything.
const PARENTHETICAL = /^([^()]+?)\s*\(([^()]+)\)\s*$/;
export const spellingsIn = (name) => {
  const given = String(name ?? "").trim();
  if (!given) return [];
  const m = PARENTHETICAL.exec(given);
  if (!m) return [given];
  const outside = m[1].trim(), inside = m[2].trim();
  if (!outside || !inside) return [given];
  // The typed form first, so a page that really does write it out still matches
  // on the strongest spelling before either half is tried.
  return [given, outside, inside];
};

// DELIBERATELY NOT FOLDED INTO variantsOf. That function is read by matchers
// and by searches alike, and its own comment already draws one line through the
// middle of that ("matching must not walk the sight table; searching should").
// Adding half-names to it would loosen every gate in the app that asks it what
// a place is called, including ones nobody is looking at tonight. The callers
// that want the halves ask for them, and pay for them at their own gate.
export const variantsOf = (name, { includeSights = false } = {}) => {
  const given = String(name ?? "").trim();
  if (!given) return [];
  const known = (includeSights ? ALL_INDEX : PLACE_INDEX).get(fold(given)) || [];
  const out = [given];
  for (const n of known) if (!out.some(x => fold(x) === fold(n))) out.push(n);
  return out;
};

// The other name, or "" when there is only one. Callers that want to say "and
// in Danish it is X" need to know whether there IS an X.
export const otherNameFor = (name, opts) => {
  const v = variantsOf(name, opts);
  return v.length > 1 ? v[1] : "";
};

// ── AND ONE OF THE SIGHT ALIASES IS AN ORDINARY ENGLISH PHRASE ──────
//
// The rule three functions up says matching must not walk the sight table, and
// previewMatch's mentionsPlace walks it anyway, with `includeSights: true`. That
// is mostly harmless and in places useful: somebody who writes "Amalienborg
// Palace" has named the row filed as "Amalienborg Slot", and losing that is a
// real loss. One entry is not like the others.
//
// "The Old Town" is the English name of Den Gamle By, an open air museum in
// AARHUS, and it is also a phrase every traveller in Europe uses about every
// town they visit. This app lists "old town" in its own topic word lists twice,
// in CATEGORY_WORDS.free and in THEME_WORDS.history. Measured:
//
//   "Three days in Ribe. We love the old town."
//     -> town Ribe, and a card for Den Gamle By, 180 km away in Aarhus
//
// And because it comes back from the NAMED pass it is exempt from the theme and
// category gate, so it renders as a full attraction card and the report labels
// its pass "named", which is the one label that means the traveller asked for
// it. They did not.
//
// So the table keeps the alias, because a search for Den Gamle By should still
// look for "The Old Town", and matching skips it. Folded, and a `some` rather
// than a `has`, so a future entry can be listed once and caught in either
// spelling.
export const GENERIC_ALIASES = ["The Old Town"];
const isGeneric = (n) => GENERIC_ALIASES.some(g => fold(g) === fold(n));

// The spellings that may decide "the traveller named this place". Every variant
// except the ones that are ordinary words, and the given name is always kept:
// a row genuinely called "The Old Town" must still match its own name.
export const matchVariantsOf = (name) => {
  const given = String(name ?? "").trim();
  return variantsOf(given, { includeSights: true }).filter(v => v === given || !isGeneric(v));
};

// ── THE MATCHER ─────────────────────────────────────────────────────
// Two names are the same place when any spelling of one folds to any spelling of
// the other. Place pairs only. Handles the case he named, a source scoped to
// Copenhagen on an entry called København, in both directions.
export const samePlaceName = (a, b) => {
  const A = variantsOf(a).map(fold).filter(Boolean);
  if (!A.length) return false;
  const B = new Set(variantsOf(b).map(fold).filter(Boolean));
  return A.some(x => B.has(x));
};

// ── A NAME AS A SEARCH ENGINE SHOULD SEE IT ─────────────────────────
// Both spellings in one string, so a single query can reach an English page and
// a Danish one. Sights included here on purpose: this output is never used to
// decide whether two places are the same, only to widen a search.
//
// Deduped by fold, so a place whose name is identical in both languages, which
// is most of Denmark, costs nothing extra.
export const searchNames = (name) => variantsOf(name, { includeSights: true }).join(" ");
