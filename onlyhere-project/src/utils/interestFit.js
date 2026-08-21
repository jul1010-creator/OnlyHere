// ── A CATEGORY GATE IS NOT A FIT TEST ────────────────────────────────
//
// Oliver, 15 Aug 2026, on the preview for this brief:
//
//   "I'm planning 6 days in Denmark. It is just me. We land at Copenhagen
//    airport late in the evening. Trains mostly, but we might rent a car for a
//    day. We want to move on most nights and see as much as possible. WE LIKE
//    MARKETS AND MODERN DESIGN. Mid range, we do not mind paying for one or
//    two good meals."
//
// ATTRACTIONS came back as Amalienborg Slot, Københavns Museum and the Ny
// Carlsberg Glyptotek. A palace, a city museum and a classical sculpture
// gallery, for somebody who asked for markets and modern design. His words:
// "Don't put up a bunch of random attractions just to have something."
//
// The narrowing added yesterday was working exactly as written, and that is
// the finding. wantedCategories put `free` in the wanted set because "design"
// sits in its word list, next to "castle", "viking" and "church". Once `free`
// is wanted, previewMatch's second pass adds EVERY `free` row whose town is
// Copenhagen, in database order, capped at six. There is no test anywhere in
// that path that asks whether the ROW matches what they said. The gate is on
// the content type and nothing else.
//
// So there are two questions and the code only ever asked the first:
//
//   1. Did they ask for attractions at all?          wantedCategories
//   2. Is THIS attraction one of the ones they meant?  this file
//
// ── AND THE FIELD THAT ANSWERS IT WAS ALREADY ON EVERY ROW ──────────
// utils/placeThemes.js has been a closed vocabulary since 8 Aug, written for
// this exact question ("What is this place actually FOR?"), validated on the
// way in, filled by the sweep, and shown as chips on the browse page. The
// preview is the one screen in the app whose entire job is to match places to
// a person, and it was the one screen that never read it. Fifth time on this
// screen that the helper already existed and the call did not.
import { fold } from "./danishNames";
import { themesOf, PLACE_THEMES, THEME_LABEL, tierOf } from "./placeThemes";

// Whole words, folded. Same discipline and the same reason as previewMatch's
// name matcher: a bare .includes() on a topic word is how "Vejlebrovej" became
// Vejle, and "art" must not fire on "Aarhus" or "design" on "designated".
// previewMatch.js imports this one rather than keeping its own, because two
// copies of a word boundary test drift the first time either is touched.
export const saysWord = (hay, word) => {
  const w = fold(word);
  if (!w) return false;
  let from = 0;
  for (;;) {
    const i = hay.indexOf(w, from);
    if (i < 0) return false;
    const before = hay[i - 1], after = hay[i + w.length];
    if (!/[a-z0-9]/.test(before || " ") && !/[a-z0-9]/.test(after || " ")) return true;
    from = i + 1;
  }
};

// ── WHAT A TRAVELLER SAYS, IN THE VOCABULARY A ROW IS TAGGED IN ─────
// Deliberately the traveller's words on the left and the closed vocabulary on
// the right, rather than one shared list. People do not write "coast", they
// write "beaches"; nobody types "market" when they mean "flea markets and food
// halls". A row is tagged from a list of nine and a brief is written in
// English, and this is the only place those two meet.
//
// A word may point at two themes and that is correct, not a bug to tidy up:
// somebody who says "museums" has asked for history AND art, and holding back
// half of what they meant is the failure this file exists to fix.
export const THEME_WORDS = {
  nature: ["nature", "forest", "forests", "woods", "hike", "hikes", "hiking", "walk", "walks", "walking",
    "trail", "trails", "park", "parks", "garden", "gardens", "wildlife", "birds", "birdwatching", "lake",
    "lakes", "countryside", "outdoors", "outdoor", "cycling", "cycle", "bike", "bikes", "biking", "green"],
  coast: ["coast", "coastal", "beach", "beaches", "sea", "seaside", "shore", "harbour", "harbor", "island",
    "islands", "ferry", "ferries", "sailing", "swim", "swimming", "dunes", "fjord", "fjords", "lighthouse"],
  history: ["history", "historic", "historical", "heritage", "castle", "castles", "palace", "palaces",
    "viking", "vikings", "medieval", "ruins", "church", "churches", "cathedral", "old town", "monument",
    "monuments", "museum", "museums", "archaeology", "ancient", "runes"],
  food: ["food", "eat", "eating", "restaurant", "restaurants", "dining", "dine", "cuisine", "foodie",
    "cafe", "cafes", "café", "cafés", "coffee", "bakery", "bakeries", "meal", "meals", "lunch", "dinner",
    "breakfast", "brunch", "street food", "smorrebrod", "smørrebrød", "seafood", "michelin", "gastronomy"],
  nightlife: ["nightlife", "night out", "nights out", "bar", "bars", "pub", "pubs", "club", "clubs",
    "clubbing", "party", "parties", "partying", "drink", "drinks", "drinking", "beer", "beers", "cocktail",
    "cocktails", "wine", "brewery", "breweries", "karaoke", "live music", "gig", "gigs", "dj", "djs"],
  art: ["art", "arts", "gallery", "galleries", "exhibition", "exhibitions", "sculpture", "sculptures",
    "painting", "paintings", "street art", "modern art", "contemporary art", "photography", "museum",
    "museums", "installation"],
  design: ["design", "designer", "designers", "architecture", "architectural", "interiors", "interior",
    "furniture", "ceramics", "pottery", "craft", "crafts", "workshop", "workshops", "textiles", "modern",
    "minimalist", "scandinavian design", "danish design", "bauhaus", "midcentury"],
  market: ["market", "markets", "flea market", "flea markets", "food market", "food markets", "market hall",
    "market halls", "stall", "stalls", "bazaar", "farmers market", "farmer's market", "antiques", "vintage",
    "thrift", "loppemarked", "torvehallerne"],
  family: ["family", "families", "kids", "kid", "children", "child", "toddler", "toddlers", "teenagers",
    "playground", "zoo", "aquarium", "amusement", "pushchair", "buggy", "stroller"],
};

// ── EVERY THEME HAS TO BE REACHABLE ─────────────────────────────────
// A value in the vocabulary with no words pointing at it can be tagged onto a
// row and can never be asked for, which is a filter that quietly excludes.
// Asserted in the suite rather than trusted here.
export const THEMES_WITHOUT_WORDS = () => PLACE_THEMES.filter(t => !THEME_WORDS[t]?.length);

// null means they named no interest at all, and null narrows nothing. Same
// contract as wantedCategories, deliberately, because the two are read side by
// side and a different empty value in each is how one of them gets forgotten.
// ── AND HOW THEY GET HERE IS NOT WHAT THEY LIKE ─────────────────────
//
// Oliver, 21 Aug 2026, on a Studio pipeline test whose content gap panel read
// "They asked for Coast and Nature": "Don't know why it keep saying this."
//
// The brief was "We arrive by ferry from Germany with a car. We are renting a
// car... We like cycling... Somewhere away from the obvious tourist places
// would be ideal." Cycling is a nature interest and that is deliberate, written
// out at ARRIVAL_WORDS below. COAST came from the word FERRY, which is in the
// coast list beside beach, dunes and lighthouse, and which in that sentence is
// how they cross the German border.
//
// The asymmetry above already saw half of this. It says THEME_WORDS does two
// jobs, keeps the full list on the traveller's side and strips access words on
// the row's side, on the reasoning that "we like cycling" is a preference while
// "a short cycle from the station" is a distance. True, and it assumed the
// traveller's side is always preference. It is not: a brief states how they
// arrive and what they have rented, in the same paragraph and often the same
// sentence as what they enjoy.
//
// So the frame decides, not the word. A mode word inside a travel frame is
// logistics; the same word anywhere else is still an interest, which is why
// nothing is removed from any list. "We arrive by ferry" states no interest.
// "We'd love a ferry out to an island" still asks for coast.
//
// Fourth instance tonight of one shape: a word doing a job other than stating a
// preference, read as a preference. The others were "out of Copenhagen" read as
// a request for Copenhagen, "starting from Southern Jutland" read as a request
// for Jutland, and Gemlyx's own question naming bike read as the traveller
// choosing a bike.
export const MODE_WORDS = new Set([
  "ferry", "ferries", "sailing", "bike", "bikes", "biking", "cycle", "cycling",
  "walk", "walks", "walking",
]);

// The frames that mean "this is how we move", immediately before the word: "by
// ferry", "arriving by ferry", "renting a bike", "we have a car and a bike",
// "got here on foot". Narrow on purpose, because reading a real interest as
// logistics empties the screen in the other direction, which is the failure the
// row-side comment above already records once.
const TRAVEL_FRAME = /\b(?:by|via|aboard|on\s+the|renting|rented|rent|hiring|hired|hire|took|take|taking|catch(?:ing)?|board(?:ing)?)\s+(?:an?\s+|the\s+|our\s+|my\s+)?$/i;

// Does this word, everywhere it appears, sit in a travel frame? One appearance
// outside one is enough to make it an interest, because somebody who mentions a
// ferry twice has probably said something about it the second time.
const onlyLogistics = (hay, word) => {
  const w = fold(word);
  if (!MODE_WORDS.has(w)) return false;
  let from = 0, seen = false;
  for (;;) {
    const i = hay.indexOf(w, from);
    if (i < 0) return seen;
    const before = hay[i - 1], after = hay[i + w.length];
    const whole = !/[a-z0-9]/.test(before || " ") && !/[a-z0-9]/.test(after || " ");
    if (whole) {
      seen = true;
      if (!TRAVEL_FRAME.test(hay.slice(Math.max(0, i - 24), i))) return false;
    }
    from = i + w.length;
  }
};

export const briefThemes = (text, interests = []) => {
  const hay = fold([String(text || ""), ...(Array.isArray(interests) ? interests : [])].join(" "));
  if (!hay.trim()) return null;
  const want = new Set();
  for (const [theme, words] of Object.entries(THEME_WORDS)) {
    if (words.some(w => saysWord(hay, w) && !onlyLogistics(hay, w))) want.add(theme);
  }
  return want.size ? want : null;
};

// ── A ROW WITH NO TAGS CANNOT BE JUDGED BY ITS TAGS ─────────────────
// This is the part that decides whether this change is an improvement or an
// empty screen on the day it ships. `market` and `design` were added to the
// vocabulary today, so NOT ONE published row carries either of them yet, and a
// pure theme test would send every attraction in the country behind the door
// for the very brief that prompted this.
//
// So: tags win when a row has them, and a row with none is read on its own
// words instead. That is not a softer rule, it is the null case. An untagged
// row is missing data, and answering "does not fit" for missing data is a
// guess dressed as a decision. The sweep in utils/sweeps.js builds its prompt
// from PLACE_THEMES, so re-tagging is a run rather than a project, and this
// fallback stops mattering the moment it happens.
const WORD_FIELDS = ["desc", "type", "highlight", "tag", "what", "name"];

// ── HOW YOU GET THERE IS NOT WHAT THE PLACE IS ──────────────────────
//
// Oliver, 19 Aug 2026, on a card reading "Hooked Kødbyen — Closest thing here to
// the nature you mentioned": "Doesn't sound like 'the best for the nature he
// mentioned'."
//
// Two real rows from his own run report, both offered to a traveller who asked
// for nature:
//
//   Hive, a VIP nightclub on Skindergade. Its description opens "sits about five
//   minutes' WALK from Rådhuspladsen station". `walk` is in the nature list.
//   Hooked Kødbyen, a seafood place in the meatpacking district. "right next to
//   Halmtorvet's GREEN area". `green` is in the nature list.
//
// Neither sentence is about nature. The first is a logistics clause, and "five
// minutes' walk from the station" is close to the most common sentence in travel
// copy; the second is a passing mention of a lawn next to a concrete yard. So the
// nightclub and the fish restaurant became the two things in the library closest
// to nature, and the card said so in Gemlyx's own voice.
//
// ── THE CAUSE IS ONE LIST DOING TWO JOBS ────────────────────────────
// THEME_WORDS is read against the TRAVELLER's own sentence, to work out what
// they like, and against a ROW, to work out what a place is about. Those want
// different vocabularies and the difference is not cosmetic:
//
//   "we like cycling"        the traveller saying what they enjoy       KEEP
//   "a short cycle from the  the row saying how far it is               DROP
//    station"
//
// Same word, opposite meaning, decided by which side of the match it is on. So
// the traveller side keeps the full list and the row side drops the words that
// describe ACCESS rather than subject. Nothing is removed from THEME_WORDS
// itself, because that would stop "we like cycling" being read as a nature
// interest at all, which is the opposite mistake and a worse one.
//
// `park` deliberately STAYS: a deer park and a castle park are what those places
// are, and "car park" is two words in which the first is the qualifier. `green`
// goes, because a green door, a green area next door and Grøn Koncert are all
// incidental, and no row is ABOUT being green.
export const ARRIVAL_WORDS = new Set([
  "walk", "walks", "walking", "bike", "bikes", "biking", "cycle", "cycling", "green",
]);

// The words that may decide a ROW carries a theme. One derivation, so a word
// added to THEME_WORDS tomorrow is filtered here without anybody remembering to.
export const rowThemeWords = (theme) =>
  (THEME_WORDS[theme] || []).filter(w => !ARRIVAL_WORDS.has(w));

const rowWords = (place) => {
  const bits = [];
  for (const f of WORD_FIELDS) {
    const v = place?.[f];
    if (Array.isArray(v)) bits.push(v.join(" "));
    else if (v) bits.push(String(v));
  }
  if (Array.isArray(place?.tags)) bits.push(place.tags.join(" "));
  return fold(bits.join(" "));
};

export const FIT_STRONG = "themes";
export const FIT_WEAK = "words";
export const FIT_OPEN = "nothing stated";
export const FIT_NONE = "";

// { fits, why: [theme ids], via } and never a bare boolean, because the report
// and the card reason both need to say WHICH interest a row was kept for, and a
// boolean makes that a second guess at a question already answered here.
export const fitsBrief = (place, want) => {
  if (!want || !want.size) return { fits: true, why: [], via: FIT_OPEN };
  const mine = themesOf(place);
  if (mine.length) {
    const why = mine.filter(t => want.has(t));
    return { fits: why.length > 0, why, via: why.length ? FIT_STRONG : FIT_NONE };
  }
  const hay = rowWords(place);
  // rowThemeWords, not THEME_WORDS. See ARRIVAL_WORDS above: this is the row
  // side, where "five minutes' walk from the station" is a bus timetable and not
  // a country ramble.
  const why = [...want].filter(t => rowThemeWords(t).some(w => saysWord(hay, w)));
  return { fits: why.length > 0, why, via: why.length ? FIT_WEAK : FIT_NONE };
};

// ── WHO IS THIS PERSON, WHERE THEY HAVE SAID ────────────────────────
// Oliver, 15 Aug 2026, on what should sit behind the door: "I think you should
// be able to have 3 shown that 'most likely' fits the person. Like if the
// person is 18, then it probably shouldn't be a bar for elderly.. and then a
// 'or ask Gemlyx'. If the person has an account, then Gemlyx and the cards
// should be able to recommend even easier."
//
// utils/profile.js already stores ageBand, company and pace, typed by the
// person themselves. This reads those three and nothing else. `sex` is on that
// row and is not read here on purpose: profile.js says plainly that almost
// nothing in a Danish travel guide turns on it, and a venue ranked by it would
// be the app inventing a claim about somebody from a field they were told was
// optional.
//
// ── AND THE SIGNAL IS THE ROW'S OWN WORDS, WHICH IS THE WEAK PART ───
// There is no crowd field on a nightlife entry. Not one. So "not a bar for the
// elderly" is read off how the entry describes itself, and an entry that never
// mentions its crowd scores zero rather than being guessed at. This is the
// roughest rule in this file and it is honest about that: the real fix is a
// closed `crowd` value on the night schema, tagged by the sweep like themes
// are. Until then this sorts, and it never excludes.
const CROWD_WORDS = {
  young: ["student", "students", "young", "youthful", "cheap", "budget", "dive bar", "late", "late-night",
    "dancing", "dance floor", "dancefloor", "club", "clubbing", "djs", "backpacker", "hostel", "loud",
    "queue", "queues", "party", "shots"],
  grownUp: ["quiet", "calm", "classic", "traditional", "old-school", "old school", "bodega", "cosy", "cozy",
    "refined", "elegant", "jazz", "wine bar", "institution", "seated", "candlelit", "unhurried"],
  family: ["family", "families", "kids", "children", "child-friendly", "playground", "high chairs",
    "pushchair", "all ages", "daytime"],
};

const crowdScore = (hay, kind) => (CROWD_WORDS[kind] || []).reduce((n, w) => n + (saysWord(hay, w) ? 1 : 0), 0);

export const profilePull = (place, profile) => {
  const p = profile || {};
  if (!p.ageBand && !p.company && !p.pace) return 0;
  const hay = rowWords(place);
  const young = crowdScore(hay, "young");
  const grownUp = crowdScore(hay, "grownUp");
  const family = crowdScore(hay, "family");
  let n = 0;
  if (p.ageBand === "Under 25") n += young * 2 - grownUp;
  else if (p.ageBand === "25-34") n += young;
  else if (p.ageBand === "50-64") n += grownUp;
  else if (p.ageBand === "65+") n += grownUp * 2 - young;
  if (p.company === "With kids" || p.company === "With family") n += family * 2 - young;
  if (p.company === "With friends") n += young;
  if (p.pace === "Slow, few things a day") n += grownUp;
  return n;
};

const TIER_RANK = { must: 3, high: 2, worth: 1, nearby: 0 };

// ── THREE, RANKED, NOT NINE IN A LIST ───────────────────────────────
// Oliver, 15 Aug 2026, on the "Add nightlife" door opening onto six tickable
// cards: "having a list of things you can click is overwhelming. AI is there
// to help for a reason. You can have 'recommendations' to add. But not a
// massive overwhelming list."
//
// The old door was not a recommendation, it was the query result. It showed
// whatever the second pass had already collected, in the order the database
// returned it, capped at six only because six is where the cap happened to sit.
// Nothing in it was chosen.
// ── "WILL PEOPLE COME FOR NIGHTLIFE BE TOLD ABOUT THAT" ─────────────
//
// Oliver, 16 August 2026, having published Nightpay as an Essential: a Denmark
// only app for nightlife discounts and payment across 80-plus bars and clubs.
// The answer was no, and not because it was filed wrong. The published Essentials
// array is read in exactly three places, the Essentials page and the two Studio
// type maps, and NO GUIDE OR CHAT PROMPT HAS EVER READ IT. The word "essentials"
// appears in the guide because guide.essentials is a different thing with the
// same name: three fields the model writes itself.
//
// So the type his own codegen calls "the type that goes stale fastest" was
// page-only, and a traveller who came for the nightlife was told nothing about
// the app that pays for it.
//
// ── SELECTED, NOT DUMPED ─────────────────────────────────────────────
// Nine categories of essential in a guide prompt is a wall of text that pushes
// the trip out of the model's attention, and most of it is irrelevant to any one
// trip. So it matches the ROW'S OWN WORDS against the themes the brief asks for,
// through THEME_WORDS, which already exists and already has "nightlife" pointing
// at bar, bars, club, clubs, drinks and the rest. Nightpay's own desc says
// "nightlife discounts and payment, covering more than 80 bars and clubs", so it
// matches on its own text without needing a tag, a new category or a field.
//
// AND THE CATEGORY IS NOT THE MATCHER, deliberately. Nightpay is filed under
// Transport, which is the wrong shelf and renders fine, and there is no Nightlife
// category to move it to: the seven are fixed and an essential filed outside them
// renders nowhere. Matching on category would have made this feature depend on a
// taxonomy that cannot express the thing being matched.
export const ESSENTIALS_IN_GUIDE = 4;

export const essentialsForTrip = (rows, { convoText = "", interests = [], limit = ESSENTIALS_IN_GUIDE } = {}) => {
  const want = briefThemes(convoText, interests);
  if (!want) return [];
  const list = (Array.isArray(rows) ? rows : []).filter(r => r && r.name);
  const hit = [];
  for (const r of list) {
    // The row's own words, plus the two fields only an essential has. howTo and
    // tip are where the useful specifics live: "80-plus venues", "49 DKK".
    const hay = fold([r.name, r.desc, r.howTo, r.tip, r.category, r.price].filter(Boolean).join(" "));
    if (!hay.trim()) continue;
    const themes = [...want].filter(t => rowThemeWords(t).some(w => saysWord(hay, w)));
    if (themes.length) hit.push({ row: r, themes });
  }
  // Most themes matched first, so a row answering two of the traveller's stated
  // interests outranks one answering a single word in passing. Name as the
  // tie-break, so one brief always produces one list.
  hit.sort((a, b) => (b.themes.length - a.themes.length)
    || String(a.row.name).localeCompare(String(b.row.name), "da"));
  return hit.slice(0, Math.max(0, Number(limit) || 0));
};

// ── AS FROZEN FACTS, IN THE ROW'S OWN WORDS ──────────────────────────
// The block quotes what he published rather than describing it, for the reason
// the transport facts are frozen: a model asked to summarise a payment system
// invents a payment system. It is also told plainly not to invent a second one,
// because the failure mode here is a helpful-sounding app that does not exist.
export const essentialsBlock = (picked) => {
  const list = (Array.isArray(picked) ? picked : []).filter(p => p?.row?.name);
  if (!list.length) return "";
  const lines = list.map(({ row, themes }) => {
    const bits = [
      row.price ? `costs ${row.price}` : "",
      row.howTo ? `how: ${row.howTo}` : "",
      row.tip ? `worth knowing: ${row.tip}` : "",
      row.link ? `link: ${row.link}` : "",
    ].filter(Boolean);
    return `- ${row.name} (${row.category || "practical"}, relevant because this trip is about ${themes.join(" and ")}): ${row.desc || ""} ${bits.join(". ")}`.trim();
  });
  return `\nFROZEN PRACTICAL FACTS, PUBLISHED BY GEMLYX AND CHOSEN FOR THIS TRIP'S OWN INTERESTS. Every one of these is already verified, so USE THE WORDS BELOW and do not restate, improve, price or extend them. Work whichever genuinely helps into keepInMind or transportTip, naming the thing and what it costs. If none of them fits the trip you have written, leave them out rather than forcing one in. NEVER invent a Danish app, card, pass or payment system that is not in this list: an app that sounds plausible and does not exist is the single worst thing this guide can tell somebody, and these are here so there is no reason to reach for one.\n${lines.join("\n")}`;
};

export const OFFER_LIMIT = 3;

export const rankOffers = (rows, { want = null, profile = null, limit = OFFER_LIMIT } = {}) => {
  const list = (Array.isArray(rows) ? rows : []).filter(r => r?.name);
  const scored = list.map(place => {
    const fit = fitsBrief(place, want);
    return {
      place,
      fit,
      score: [
        fit.why.length,
        profilePull(place, profile),
        TIER_RANK[tierOf(place)?.id] ?? 0,
        String(place.photo || "") ? 1 : 0,
      ],
    };
  });
  scored.sort((a, b) => {
    for (let i = 0; i < a.score.length; i++) if (b.score[i] !== a.score[i]) return b.score[i] - a.score[i];
    // Name last, so two runs of one brief produce the same three cards. A
    // recommendation that reshuffles on reload is not a recommendation.
    return String(a.place.name).localeCompare(String(b.place.name));
  });
  return scored.slice(0, Math.max(0, limit));
};

// ── THE REASON IS ABOUT THE PLACE, NEVER ABOUT THE PERSON ───────────
// "Picked because you are under 25" is the same sentence as "we think you are
// young", and profile.js promises the model never repeats a stored field back
// as though it were a discovery. The card keeps that promise: the profile
// changes the ORDER and the words on screen describe the venue.
export const offerReason = (entry) => {
  const { place, fit } = entry || {};
  if (!place) return "";
  // ── MONEY FIRST, BECAUSE IT IS WHY THIS ONE IS HERE ────────────────
  // Oliver, 17 Aug 2026: "geranium is NOT mid-range.. so remember to make food
  // places include in budget." previewMatch holds an over-budget place behind the
  // door rather than deleting it — a tight budget in Copenhagen still wants to
  // know Geranium exists — and it set `_overBudget` on the row so the card could
  // say why. Nothing read it, so the row appeared among "places you did not ask
  // for", which is not what happened to it: they did ask, and it costs more than
  // they said they had. That is a different sentence and the honest one.
  if (place._overBudget) return place._overBudget;
  const named = (fit?.why || []).map(t => THEME_LABEL[t]).filter(Boolean);
  if (named.length) {
    const list = named.length === 1 ? named[0].toLowerCase() : `${named.slice(0, -1).map(s => s.toLowerCase()).join(", ")} and ${named[named.length - 1].toLowerCase()}`;
    return `Closest thing here to the ${list} you mentioned`;
  }
  const tier = tierOf(place);
  if (tier && (tier.id === "must" || tier.id === "high")) return `Gemlyx rates this ${tier.label.toLowerCase()}`;
  const town = String(place.city || place.town || place.location || "").split(",")[0].trim();
  return town ? `Gemlyx's own pick in ${town}` : "Gemlyx's own pick here";
};
