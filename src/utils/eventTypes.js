// ── "EVENTS HAVE TWO 'MUSICS'" ──────────────────────────────────────
//
// Oliver, 9 Aug 2026, pasting the Major tab's type row back at me exactly as it
// rendered: "CultureFestivalMusicMusic / Festival / CultureMusic Festival".
//
// Those are six pills with no space between them. The row was built like this:
//
//   const eventTypeOptions = [...new Set(upcomingInTab.map(e => e.type))]
//
// off `type`, which is FREE TEXT written by whatever drafted each entry. Here is
// what 26 published festivals actually store, counted from the live table:
//
//   "Music"                        12
//   "Festival"                      6
//   "Culture"                       2
//   "Music Festival"                2
//   "Music / Festival"              1
//   "Music / Festival / Culture"    1
//   "Viking Market"                 1
//   "Viking Festival"               1
//
// Six pills for four ideas, two of which begin with the word Music. This is the
// region-pills bug again, in a different room: a filter built by de-duplicating
// a free-text field can only ever be as consistent as the least careful draft,
// and no two drafts write it the same way.
//
// ── SO IT IS A CLOSED VOCABULARY, LIKE PLACE_THEMES ─────────────────
// Same reasoning as utils/placeThemes.js. A value that is not on this list does
// not exist, so the row cannot grow a seventh pill because a model felt
// descriptive, and two events about the same kind of thing always say it with
// the same word.
//
// ── AND IT IS MULTI-VALUED, BECAUSE THE DATA ALREADY IS ─────────────
// "Music / Festival / Culture" is one event making two real claims. Forcing it
// into a single bucket means either losing one or inventing a combined pill,
// which is what produced the mess above. An event carries a SET.
//
// ── "FESTIVAL" IS NOT A TYPE ────────────────────────────────────────
// It is the noun. Every single row on this page is a festival, so a Festival
// pill selects everything and tells a reader nothing, and it was one of the six.
// It maps to no type at all. Six events store only that word, and they are
// reachable under All and under nothing else, which is the honest outcome: the
// filter says what it knows and does not invent a category to hide a gap.

// ── EVERY BOUNDARY HERE IS A DECISION ───────────────────────────────
// The first version of this list wrote `/\bmusic|rock|...|metal|dj\b/i`, which
// reads as though it anchors both ends and does not: in an alternation the \b
// binds to the branch it touches, so only `music` had a start boundary and only
// `dj` had an end one. Everything between them was an unanchored substring.
// Checked against real strings, that classified "Metalworking workshop" as MUSIC
// and "Remarked" as a MARKET.
//
// Danish is why this cannot just be `\b...\b` everywhere. Danish compounds glue
// the words together, so the category is a SUFFIX with no boundary in front of
// it: Vikingemarked, Julemarked, Kunstfestival, Kulturnat, Rockfestival. A rule
// anchored at both ends misses every one of them.
//
// So each word is anchored on the side that is real:
//   \bword     the word starts a compound, or stands alone (viking, kultur)
//   word\b     the word ENDS a Danish compound (marked)
//   \bword\b    an English word that is a substring of unrelated ones (metal,
//              art, fair), where a loose match is a wrong pill on somebody's page
const RULES = [
  // Order matters only for readability of the pill row, not for matching: an
  // event can and does match several.
  { id: "music", label: "🎵 Music", match: /\b(music|musik|rock|jazz|blues|concert|koncert|techno|electronic)|\b(metal|dj)\b/i },
  // One rule covers viking, vikinge and vikingemarked.
  { id: "viking", label: "⚔️ Viking", match: /\bviking/i },
  // "marked" ends Danish compounds, so it cannot take a leading boundary. The
  // lookbehind is the one English word that ruins it: "remarked" is a verb, and
  // it was matching. Known limit, written down rather than discovered: an
  // "earmarked" would still match, and is not a thing anybody types here.
  { id: "market", label: "🛍 Market", match: /\b(market|markt|fair)\b|(?<!re)marked\b/i },
  { id: "food", label: "🍽 Food", match: /\b(food|gastro|beer|wine|mad|vin|øl)\b|\bmadmarked|\bstreet ?food/i },
  // \bart\b so "artisan" is a craft and not an art festival. \bkunst loose at the
  // end for Kunstfestival, Kunsthal.
  { id: "art", label: "🎨 Art & design", match: /\b(art|arts|design|film|theatre|theater|teater)\b|\b(kunst|teater)/i },
  { id: "culture", label: "🏛 Culture", match: /\b(culture|heritage)\b|\b(kultur|histor)/i },
  { id: "family", label: "🧸 Family", match: /\bfamil|\b(children|kids)\b|\bbørn/i },
];

export const EVENT_TYPES = RULES.map(r => r.id);
export const EVENT_TYPE_LABEL = Object.fromEntries(RULES.map(r => [r.id, r.label]));

// THE WORD THAT CARRIES NO INFORMATION.
//
// Mutation testing caught this guard doing nothing: no rule above matches
// "Festival" today, so removing the guard changed no behaviour and no assertion
// died. That is exactly the shape this suite exists to refuse, and the answer is
// not to delete it. The guard is here for the version of this file where
// somebody adds a `festival` rule, or loosens `culture` to catch "Kulturfest",
// and quietly resurrects the pill that selects everything.
//
// So it is load-bearing as an INVARIANT rather than as a branch, and the test
// asserts the invariant: no id in the vocabulary may itself be an uninformative
// word. Add `{ id: "festival" }` above and the suite goes red before the pill
// ever reaches a page.
export const UNINFORMATIVE = /^\s*(festival|event|arrangement|other|misc)\s*$/i;

// Reads the whole stored string, not a split on separators, because "Music
// Festival" is one phrase carrying one real claim and splitting it on spaces
// would find a Festival that is not there.
export const eventTypesOf = (event) => {
  const raw = String(event?.type ?? "").trim();
  if (!raw || UNINFORMATIVE.test(raw)) return [];
  return RULES.filter(r => r.match.test(raw)).map(r => r.id);
};

export const hasEventType = (event, type) => !type || eventTypesOf(event).includes(type);

// Only types something upcoming actually carries, in the fixed order above, so
// the row never offers a pill that leads to an empty grid and never reorders
// itself as the calendar moves.
export const eventTypesPresent = (list) => {
  const found = new Set();
  for (const e of Array.isArray(list) ? list : []) eventTypesOf(e).forEach(t => found.add(t));
  return EVENT_TYPES.filter(t => found.has(t));
};

// ── HOW MANY ARE BEHIND EACH PILL ───────────────────────────────────
// "Why are they the only ones that have no numbers." Same complaint, same fix:
// a count beside every option, computed on the list the other filters have
// already narrowed, so a zero means picking it empties the grid.
export const eventTypeCounts = (list, types) => {
  const out = {};
  for (const t of Array.isArray(types) ? types : []) {
    out[t] = (Array.isArray(list) ? list : []).filter(e => hasEventType(e, t)).length;
  }
  return out;
};

// Events whose stored type says nothing we can file. Not rendered to visitors,
// read by the audit, because six of twenty-six is a content gap worth seeing
// rather than a silence to live with.
export const untypedEvents = (list) =>
  (Array.isArray(list) ? list : []).filter(e => eventTypesOf(e).length === 0);
