import { fold, variantsOf, matchVariantsOf, samePlaceName, containsName, foundAt } from "./danishNames";
import { townOfLocation } from "./nightlife";
import { canonicalRegion, regionPart, regionOf, REGION_NAMES } from "./regions";
import { tierOf } from "./placeThemes";
import { PARTS_OF_COUNTRY } from "./sourcePolicy";
// The whole word test and the row level fit test both live in interestFit.js.
// saysWord was defined in this file and is imported now for one reason: this
// file and that one both have to agree on what "the traveller said this word"
// means, and two copies of a word boundary check drift the first time either
// one of them is touched.
import { saysWord, fitsBrief } from "./interestFit";
// Where they land, and how to order a list of towns from it. See routeOrder.js
// for the measurement that prompted both: 416 km shown against 279 km possible,
// on a brief that had asked for two bases.
import { arrivalPoint } from "./arrival";
import { townPointFor } from "./guideEnrichment";
import { outOfBudget, budgetWarning } from "./budgetFit";
import { routeOrder, reachBand, kmBetween, preferReachable, REACH_STRETCH } from "./routeOrder";

// ── WHAT THE PREVIEW SCREEN ACTUALLY HOLDS ON A CONVERSATION ────────
//
// Lifted out of components/GuidePreviewScreen.jsx unchanged in behaviour apart
// from the one bug named below, for two reasons.
//
// First, it could not be tested. The rules it carries have been wrong four
// times now (a raw substring match, an unused padding, a three character
// guard, and the field name below), every one of them found by Oliver looking
// at a screenshot, because a matcher living inside a component's render can
// only be exercised by rendering it.
//
// Second, App.jsx's previewWhy effect needs the same answer. It writes the
// italic line at the top of that screen, and it was writing it from the
// conversation alone while the list underneath came from here. Two halves of
// one screen, built from different material, neither able to see the other:
//
//     "it builds in the markets and cycling you love"
//     TOWNS: Copenhagen
//     ATTRACTIONS: Amalienborg Slot, Kobenhavns Museum, Ny Carlsberg Glyptotek
//
// Nothing was broken in either half. They were answering different questions.

// ── THE TOWN FIELD IS NOT CALLED THE SAME THING TWICE ───────────────
// Oliver, 15 Aug 2026: "same attraction and same town that are always shown.
// Nothing else."
//
//     free rows      city
//     festival rows  town
//     food rows      location
//     night rows     location
//     craft rows     location
//
// The second pass skips a row whose parent town comes back empty, so reading
// only `city` and `town` made every restaurant, food market, bar, club and
// workshop permanently ineligible for this screen, whatever anybody typed.
// townOfLocation has parsed a town out of those strings since the nightlife
// pages were built, including the ones written as a full street address.
export const parentTownOf = (p) => String(p?.city || p?.town || townOfLocation(p?.location) || "").trim();

// The pool, in one place, so a content type cannot be added to the app and
// quietly left off this screen. Craft keeps its own _src even though it is
// DISPLAYED under Attractions: openStopDetail routes "Read more" by _src, and
// renaming it here would send a craft click to the wrong detail page.
export const previewPools = ({ towns = [], freeEntrance = [], foodSpots = [], nightlifeSpots = [], craftItemsFallback = [], events = [], majorEvents = [] } = {}) => [
  ...towns.map(p => ({ ...p, _src: "town" })),
  ...freeEntrance.map(p => ({ ...p, _src: "free" })),
  ...foodSpots.map(p => ({ ...p, _src: "food" })),
  ...nightlifeSpots.map(p => ({ ...p, _src: "nightlife" })),
  ...craftItemsFallback.map(p => ({ ...p, _src: "craft" })),
  ...events.map(p => ({ ...p, _src: "event" })),
  ...majorEvents.map(p => ({ ...p, _src: "event" })),
];

// Craft is DISPLAYED under Attractions but keeps its own _src for click
// routing, so the display grouping is a second, separate question. It lived in
// the component and the matcher could not see it, which meant the matcher could
// not reason about categories at all. One function, both files.
export const groupKeyOf = (p) => (p?._src === "craft" ? "free" : p?._src);

// ── "THEY ARE ONLY ASKING FOR EVENTS" ───────────────────────────────
// Oliver, 15 Aug 2026, on a preview built from this brief:
//
//   7 days, arriving 12 September, just me, we land at Copenhagen airport late
//   in the evening, we are renting a car, we would rather stay in one place and
//   take day trips, INTO FESTIVALS AND LIVE EVENTS, we are on a tight budget
//
// and it came back with Københavns Museum, Ny Carlsberg Glyptotek, Amalienborg
// Slot, Farfar's bodega and Hooked. His words: "these people do NOT sound like
// the people who would visit Amalienborg Slot."
//
// The second pass adds EVERY row whose town points at a town they named. That
// is the right rule for proving Gemlyx knows the ground and the wrong rule for
// a screen headed "Here's what's coming up", because it turns one stated
// interest into a full default itinerary of things nobody asked about.
//
// So: when a brief names interests, a category outside them is not FILLED. It
// is not deleted either, which is the part that matters. The rows are still
// matched and still travel to the screen carrying `_notAsked`, so the section
// can stand there empty with an honest count and an invitation to add them.
// A traveller who says "surprise us" gets to choose the surprise.
//
// NIGHTLIFE RIDES WITH EVENTS, on his explicit call: "I get the nightlife..
// nightlife always have events somehow." A bar with a lineup is the same
// interest wearing a different content type.
//
// AND A BRIEF THAT NAMES NOTHING NARROWS NOTHING. wantedCategories returns null
// there, and null means fill everything, which is the behaviour this screen has
// always had for somebody who has not said what they are into yet.
const CATEGORY_WORDS = {
  event: ["festival", "festivals", "event", "events", "live event", "live events", "concert", "concerts",
    "gig", "gigs", "live music", "music", "show", "shows", "lineup", "line-up", "dj", "rave", "carnival"],
  nightlife: ["nightlife", "night out", "nights out", "bar", "bars", "pub", "pubs", "club", "clubs",
    "clubbing", "party", "parties", "partying", "drink", "drinks", "drinking", "beer", "beers",
    "cocktail", "cocktails", "wine", "brewery", "breweries", "karaoke"],
  food: ["food", "eat", "eating", "restaurant", "restaurants", "dining", "dine", "cuisine", "foodie",
    "cafe", "cafes", "café", "cafés", "coffee", "bakery", "bakeries", "meal", "meals", "lunch",
    "dinner", "breakfast", "brunch", "street food", "smorrebrod", "seafood"],
  free: ["museum", "museums", "gallery", "galleries", "art", "history", "historic", "historical",
    "castle", "castles", "palace", "palaces", "attraction", "attractions", "sightseeing", "sights",
    "viking", "vikings", "architecture", "church", "churches", "cathedral", "old town", "landmark",
    "landmarks", "monument", "monuments", "exhibition", "exhibitions", "craft", "crafts", "ceramics",
    "pottery", "design", "workshop", "workshops", "garden", "gardens", "park", "parks", "culture"],
};

// Whole words, folded, so "art" does not fire on "Aarhus" and "bar" does not
// fire on "Barcelona". Same discipline as every other matcher in this file: a
// bare .includes() on a topic word is how "Vejlebrovej" became Vejle. The
// function itself now lives in interestFit.js and is imported at the top,
// because that file asks the same question of the same string.

// ── FOOD IS OFFERED, NOT PLANNED, UNLESS IT IS A FOOD TRIP ──────────
//
// Oliver, 20 Aug 2026: "maybe we should get rid of food all together. Unless
// it's actually a food trip. Because who knows.. maybe you feel like eating
// pizza instead of smørbrød that day. Let that instead be something Gemlyx has
// ready for the person."
//
// He is describing a real difference between food and everything else on this
// screen, and it is not a matter of taste. A castle is open at a time, an event
// happens on a date, a town is two hours away: those are constraints, and a plan
// that ignores them is wrong. Lunch is not a constraint. Nobody knows on Tuesday
// which of Saturday's meals they will want, and a plan that books Saturday lunch
// is not being helpful, it is spending a slot on the one decision the traveller
// is best placed to make on the day and worst placed to make now.
//
// So food stops being a thing the plan fills and becomes a thing Gemlyx HOLDS.
// The machinery for that already exists and is the `_notAsked` door below: those
// rows still travel to the screen, the section can still say Gemlyx holds nine
// places to eat in Copenhagen, and they are one click away. Nothing is deleted
// and nothing is hidden. It stops occupying the itinerary.
//
// THE ONE EXCEPTION IS HIS: a trip that is about food. Then the meals ARE the
// plan, they book up, and holding them behind a door would be the mistake in the
// other direction.
//
// EXPLICIT MEANS EXPLICIT. Everywhere else on this screen, a brief that names
// nothing narrows nothing, because silence is not a preference. Food is the one
// category where that reading is wrong: silence about food is the normal state
// of every traveller who is not on a food trip, so an unstated interest cannot
// be what puts restaurants in the itinerary.
export const foodIsPlanned = (wanted) => !!wanted && wanted.has("food");

export const wantedCategories = (convoText, interests = []) => {
  const hay = fold([String(convoText || ""), ...(Array.isArray(interests) ? interests : [])].join(" "));
  if (!hay.trim()) return null;
  const want = new Set();
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) {
    if (words.some(w => saysWord(hay, w))) want.add(cat);
  }
  // Nothing stated is not the same as nothing wanted.
  if (!want.size) return null;
  if (want.has("event")) want.add("nightlife");
  return want;
};

// ── "WHY DOES IT ONLY SHOW COPENHAGEN" ────────────────────────────
// Oliver, 9 Aug 2026, looking at a preview with one city on it.
//
// The matcher was `convoText.toLowerCase().includes(place.name.toLowerCase())`,
// and it has two holes that both hit Denmark specifically.
//
// 1. IT IS A RAW SUBSTRING TEST, SO SPELLING IS THE MATCH. He raised this
//    himself a few hours earlier about a different screen: "I type
//    copenhagen, but Copenhagen on Danish is Kobenhavn." Same problem here,
//    and worse, because the Danish letters break it even when the traveler is
//    writing the Danish name correctly: "Aeroskobing" never matches
//    "Ærøskøbing", "Odense" is fine but "Møn" is three characters and was
//    being skipped by the length guard anyway.
//
//    utils/danishNames.js exists for exactly this and was not being used
//    here. That is the same failure as the last several: a helper that
//    exists, and a site that matters where it was never called.
//
// 2. IT ONLY EVER SHOWS PLACES HE TYPED. Somebody who writes "four days in
//    Copenhagen" has named one place, so this screen showed one card, and
//    the screen's whole job is to prove Gemlyx knows the ground. Gemlyx knows
//    dozens of things IN Copenhagen. Those are not a guess, they are rows
//    with a `city`/`town` field pointing at a town he did name.
// 3. AND THE FIX FOR 1 BROUGHT ITS OWN HOLE. `hay` was built with a space on
//    each side, which is exactly the right idea, and then never used as one:
//    the test was a bare `hay.includes(f)`, so the padding did nothing and any
//    fold that appeared ANYWHERE inside the conversation counted.
//
//    Danish place names are short, so that is not a rare accident:
//
//      "we would ALSO like a beach"     -> Als
//      "not much MONey to spend"        -> Møn
//      "arriving MONday"                -> Møn
//      "somewhere with a COMMON room"   -> Møn
//
//    Each one puts a card for an island the traveller never mentioned onto a
//    screen whose only job is to prove Gemlyx knows the ground. The 3-char
//    minimum was standing in for a boundary check and cannot do that job:
//    "Als" and "Møn" are three characters, so the guard let precisely the
//    worst offenders through while blocking nothing.
//
//    containsName does the padding properly and treats punctuation as a gap,
//    so "Copenhagen." and "Aarhus," still match. Shared with discovery.js so
//    the two cannot drift.
// ── AND NOT EVERY ALIAS MAY DECIDE THIS ─────────────────────────────
// matchVariantsOf, not variantsOf with includeSights. "The Old Town" is Den
// Gamle By's English name and also the phrase everybody uses about every town
// in Europe, so "Three days in Ribe, we love the old town" put a card for an
// Aarhus museum 180 km away on the screen, out of the NAMED pass, exempt from
// the theme gate. See GENERIC_ALIASES in danishNames.js.
export const mentionsPlace = (convoText, name) =>
  matchVariantsOf(name).some(v => containsName(convoText, v));

// ── "HE SAID HE WANTED TO GO OUT OF COPENHAGEN" ─────────────────────
//
// Oliver, 15 Aug 2026, on a preview built from this brief:
//
//   "We are already in Copenhagen and want to get out of the city ... We have
//    heard about Jutland and would like to see some of it"
//
// The screen came back with Copenhagen, three Copenhagen attractions, five
// Copenhagen restaurants and a Copenhagen pub. Nothing from Jutland. And the
// line above it read "This route keeps you and your partner rooted in
// Copenhagen's quieter historic corners", which is the italic line correctly
// describing a list that was wrong.
//
// TWO SEPARATE FAULTS, and they compound.
//
// 1. A NAMED PLACE IS NOT A WANTED PLACE. The matcher asks whether the name
//    appears, and Copenhagen appears in a sentence that REJECTS it. There is no
//    polarity anywhere in this file, so "we are already in Copenhagen and want
//    to get out" reads exactly like "four days in Copenhagen".
//
// 2. A REGION MATCHES NOTHING. Jutland is the one thing they asked for. It is
//    not a town, so no row has that name, so the pool never had a candidate.
//    utils/regions.js has known which towns are in Jutland since it was
//    written, and this screen never asked it. Fourth time on this screen that
//    the helper already existed and the call did not.
//
// The departure test is deliberately narrow. "Already in X" and "out of X" are
// unambiguous; "three days in Copenhagen" is not a departure and must not read
// as one, because treating a wanted town as unwanted empties the screen in the
// other direction.
// ── AND THE FIRST VERSION OF THIS WAS WORSE THAN THE BUG ────────────
// Fable, reviewing it the same day: LEAVING_BEFORE accepted "we are in X",
// "staying in X" and "based in X" with no leaving verb anywhere, so
// "We are staying in Copenhagen for four days, what should we see?" came back
// as a DEPARTURE. The screen then showed one Copenhagen card badged "Where you
// start" and nothing else, and told the italic line not to promise the town the
// traveller had just asked about. That is the same emptiness as the bug, aimed
// at the opposite traveller, and it is the exact false positive the comment
// above claims to avoid.
//
// A leaving VERB is the signal. Being somewhere is not, and never was: "we are
// already in Copenhagen" is a fact about where they stand, and only the "and
// want to get out" after it makes it a departure.
//
// A leaving preposition or verb immediately before the name: "out of X",
// "away from X", "leave X".
const LEAVING_DIRECT = /\b(?:out\s+of|outside(?:\s+of)?|away\s+from|leave|leaving|escaping|escape)\s*$/i;
// Or a leaving intent just after it: "X, and we want to get out of the city".
const LEAVING_AT = /^[^.!?]{0,40}?\b(?:would like to|want to|wanna|need to|hoping to|hope to|plan to)\s*(?:get\s+)?(?:out|away|off|going)\b|^[^.!?]{0,40}?\b(?:and|but)\s+(?:get|head|move)\s+(?:out|on|away)\b/i;
// ── AND NEITHER COUNTS INSIDE A NEGATION ────────────────────────────
// "we never want to leave Copenhagen, we love it" and "we do not want to leave
// Aarhus without seeing the harbour" both read as departures without this, and
// both are somebody saying the opposite.
const NOT_LEAVING = /\b(?:never|not|don'?t|do\s+not|didn'?t|won'?t|wouldn'?t|can'?t|cannot|hate\s+to|no\s+need\s+to|rather\s+not)\b[^.!?]{0,30}$/i;

// ── AND IT HAS TO READ THE NAME THE WAY EVERYTHING ELSE DOES ────────
// This built a regex out of the RAW variant and ran it against the RAW text,
// while mentionsPlace one screen up folds. So the two disagreed on the same
// sentence: "We are already in Kobenhavn and want to get out of the city"
// mentioned Copenhagen and was not leaving it, because neither "Copenhagen" nor
// "København" is spelled "Kobenhavn". _leaving never got set, the town stayed
// in matchedTowns, and pass 2 expanded every Copenhagen attraction, restaurant
// and bar underneath it. That is precisely the ten-Copenhagen-rows screen this
// function was written to stop, still happening, for the spelling Oliver
// himself used when he asked for the fold in the first place.
export const isDeparturePlace = (convoText, name) => {
  const text = String(convoText || "");
  let found = 0, leaving = 0;
  for (const v of matchVariantsOf(name)) {
    const { hay, at, len } = foundAt(text, v);
    for (const i of at) {
      found++;
      const before = hay.slice(Math.max(0, i - 40), i);
      const after = hay.slice(i + len, i + len + 60);
      const directly = LEAVING_DIRECT.test(before) && !NOT_LEAVING.test(before.replace(LEAVING_DIRECT, ""));
      const intent = LEAVING_AT.test(after) && !NOT_LEAVING.test(after.slice(0, 40));
      if (directly || intent) leaving++;
    }
  }
  return found > 0 && leaving === found;
};

// ── AND A NAME SAID IN ORDER TO REJECT IT IS NOT A PICK ─────────────
//
// Oliver, 20 Aug 2026, on a Copenhagen nightlife answer. Gemlyx wrote:
//
//   "For your kind of trip, I'd steer well clear of Old Irish Pub near
//    Rådhuspladsen, that's stag-do and pub-crawl territory, not what two old
//    friends looking for design and quiet want."
//
// And then put a card for Old Irish Pub on the screen, in the NIGHTLIFE row,
// beside the two it had recommended. His words: "adding in Old Irish Pub when it
// says they shouldn't go there is just a wild bug".
//
// He is right and it is the same hole isDeparturePlace was written to plug, one
// tier down. That function knows "out of Copenhagen" is not a request for
// Copenhagen. Nothing knew that "steer well clear of X" is not a request for X.
// The matcher asks only whether the name APPEARS, and a name appears just as
// plainly in the sentence rejecting it, so the more carefully the answer
// explains what to avoid, the more confidently the screen recommends it.
//
// This is worse than the Copenhagen case in one specific way: the conversation
// text includes GEMLYX'S OWN REPLY. So the product reads its own advice back,
// takes the thing it warned against, and shows it as a suggestion. A reader who
// scrolls past the prose sees three bars and no way to tell which one the answer
// told them to skip.
//
// ── NARROW, AND IT MUST NOT SWING THE OTHER WAY ─────────────────────
// Same discipline as the departure test, and for the same reason: reading a
// wanted place as unwanted empties the screen in the opposite direction, which
// is the failure that replaced the first version of that function. So a
// rejection has to be stated close to the name, and a name recommended anywhere
// is kept even if it is also warned about, because "go on a weeknight, avoid it
// on a Saturday" is advice about a place being recommended.
const REJECT_BEFORE = /\b(?:steer\s+(?:well\s+)?clear\s+of|stay\s+(?:well\s+)?away\s+from|avoid|skip|skipping|not|no|never|forget|ignore|rather\s+than|instead\s+of|as\s+opposed\s+to|other\s+than|except|apart\s+from|besides|wouldn'?t\s+(?:go|bother|recommend|suggest|send\s+you\s+to)|would\s+not\s+(?:go|bother|recommend|suggest)|do\s*n'?t\s+(?:go|bother|recommend|suggest)?)\s*(?:to\s+|the\s+)?$/i;
// Or the verdict lands just after the name: "X, that's stag-do territory, not
// what you want", "X is a tourist trap".
// ── AND ONLY A VERDICT ON THE PLACE ITSELF ──────────────────────────
// "avoid it" and "would skip" are NOT here, and that is deliberate. "Hive is
// great, though avoid it on a Saturday when it fills up" is a caveat about a
// place being recommended, and reading it as a rejection loses a real pick,
// which is the failure mode this whole function is written to stay away from.
// Those words still count in REJECT_BEFORE, where they sit directly against the
// name and cannot be about a Saturday.
const REJECT_AFTER = /^[^.!?]{0,80}?\b(?:not\s+(?:what|for|your|really|the)|is\s*n'?t\s+(?:what|for|your|really|the)|tourist\s+trap|overpriced|steer\s+clear|not\s+worth|nothing\s+special|wrong\s+(?:fit|crowd|vibe)|too\s+(?:loud|rowdy|touristy|crowded))\b/i;
// What actually bounds these is the ANCHOR, not the window: REJECT_BEFORE ends
// in `$`, so the rejection word has to sit immediately against the name, and
// REJECT_AFTER's `[^.!?]` cannot cross into the next sentence. The windows are
// there to keep the regex cheap over a long conversation, and widening either
// one changes nothing, which is worth knowing before somebody tunes them
// expecting it to.
const REJECT_WINDOW_BEFORE = 44;
const REJECT_WINDOW_AFTER = 90;

export const isRejectedPlace = (convoText, name) => {
  const text = String(convoText || "");
  let found = 0, rejected = 0;
  for (const v of matchVariantsOf(name)) {
    const { hay, at, len } = foundAt(text, v);
    for (const i of at) {
      found++;
      const before = hay.slice(Math.max(0, i - REJECT_WINDOW_BEFORE), i);
      const after = hay.slice(i + len, i + len + REJECT_WINDOW_AFTER);
      if (REJECT_BEFORE.test(before) || REJECT_AFTER.test(after)) rejected++;
    }
  }
  // EVERY mention, not any. One recommendation outweighs one warning, because a
  // place worth a caveat is still a place being suggested.
  return found > 0 && rejected === found;
};

// Every part of the country and every named region, as one list to test the
// conversation against. REGION_NAMES is the specific tier ("Sønderjylland"),
// PARTS_OF_COUNTRY the wide one ("Jutland"); both are things a traveller says.
export const regionsNamed = (convoText) => {
  const text = String(convoText || "");
  const out = [];
  for (const r of [...PARTS_OF_COUNTRY, ...REGION_NAMES]) {
    // ── "NEW ZEALAND" IS NOT ZEALAND ────────────────────────────
    // Fable's catch. containsName sees the whole word Zealand inside "New
    // Zealand", so "we loved our trip around New Zealand last year" put six
    // Sjælland towns on a screen for a brief that named no Danish place at all.
    // Same shape as "also" matching Als, one list up.
    // ── AND IT ONLY EVER CHECKED THE FIRST ONE ──────────────────
    // "We loved our trip around New Zealand last year, now we want to see
    // Zealand and Funen" returned Funen alone. indexOf found the Zealand
    // inside New Zealand, the guard correctly rejected it, and nothing
    // looked at the Zealand they actually asked for. A guard that drops the
    // real request while blocking the false one is worse than no guard.
    const named = variantsOf(r).some(v => {
      const { hay, at } = foundAt(text, v);
      return at.some(i => !/\b(?:new|nya|nieuw|nouvelle)\s*$/i.test(hay.slice(Math.max(0, i - 12), i)));
    });
    if (named) out.push(r);
  }
  return out;
};

// Is this row in one of them? A town row carries `region` as free text and
// coordinates as __lat/__lon, so both are asked: the stored region first
// because it is what the drafter wrote, then the measured one.
// ── AND A NARROW REQUEST MAY NOT WIDEN ITSELF ──────────────────────
// The first version took the wanted region, looked up which landmass it sits
// on, and matched anything on that landmass. So "we want to see Sønderjylland"
// matched Skagen, which is four hours north and a different country as far as
// a two day trip is concerned. Containment runs ONE WAY: asking for the whole
// of Jutland reaches every region in it, asking for one region does not reach
// its neighbours. Caught by the assertion that a narrow request stays narrow,
// which is the one worth writing whenever a match is widened at all.
export const placeIsInRegion = (place, regionName) => {
  const askedForPart = PARTS_OF_COUNTRY.includes(regionName);
  const want = askedForPart ? "" : canonicalRegion(regionName);
  const wantPart = askedForPart ? regionName : "";
  if (!want && !wantPart) return false;
  const stated = canonicalRegion(place?.region || "");
  const measured = canonicalRegion(regionOf(place) || "");
  for (const got of [stated, measured]) {
    if (!got) continue;
    if (want && got === want) return true;
    if (wantPart && regionPart(got) === wantPart) return true;
  }
  return false;
};

// Two passes, and the order is the meaning. Pass one is what the traveller
// named. Pass two is what Gemlyx holds inside the places they named, which is
// the difference between "you said Copenhagen" and "here is what we have on
// Copenhagen", and the only reason the screen exists.
// Gemlyx's own editorial rank, the same one the cards already badge.
const TIER_RANK = { must: 3, high: 2, worth: 1, nearby: 0 };
export const REGION_TOWN_CAP = 6;

// ── A FOUR DAY TRIP CANNOT VISIT SIX TOWNS ──────────────────────────
// Oliver, 15 Aug 2026, on a four day family trip with two kids: six Jutland
// towns, Esbjerg and Viborg and Asaa among them. Same principle he set for
// events, in his words: "If the person has chosen like 4 days, then obviously
// he should be limited to only one. If the person is there for 10 on the other
// hand.. then he can easily make 3 or 4."
//
// A town is a bigger unit than an event, so this is more generous than the
// event limit and still nowhere near six: two for a short trip, four for a
// fortnight. An unknown length gets three, because the screen still has to show
// something and three is the number that reads as a shortlist.
export const regionPickLimit = (days) => {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return 3;
  return Math.max(2, Math.min(REGION_TOWN_CAP, Math.floor(n / 2)));
};

// ── AND "BEST IF YOU'RE ALREADY NEARBY" SAYS IT ITSELF ──────────────
// Asaa is tier "Best If You're Already Nearby", which is Gemlyx's own way of
// saying do not plan around this. It has no business being offered to somebody
// who named a region and is deciding where to go, and it was on that screen
// twice. A traveller who is already nearby finds it by browsing.
const TOO_WEAK_FOR_A_REGION_PICK = "nearby";

// `themes` is the second half of `wanted` and arrives beside it rather than
// being derived here, for the same reason the trip window is computed by the
// screen: the italic line, the cards and the report all have to be describing
// one answer, and two callers each deriving their own is how the line at the
// top of this screen ended up describing a different trip from the list under
// it. See interestFit.js for what a theme is and why a category gate on its
// own put a palace in front of somebody who asked for markets.
// `mode` is how they are getting around, folded to a key by travelModeKey, and it
// arrives from the caller for the same reason `days` does: the screen already
// reads it off the traveller's own turns and the intake chips, and two callers
// deriving it separately is how one part of the app ends up planning a bicycle
// trip while another plans a drive. Null means unknown, and unknown changes
// nothing about today's behaviour.
export const matchedPlaces = (convoText, pools, { days = null, wanted = null, themes = null, mode = null, budget = null } = {}) => {
  // ── WHERE THEY LAND ─────────────────────────────────────────────
  // Read once, at the top, because two things below need it: the region pass
  // ranks by how reachable a town is from here, and the towns are handed back
  // in travel order from here. Null for a brief that names no arrival, and null
  // changes nothing, which is every brief before today.
  // townPoint injected, so a ferry into a Danish port resolves to a real
  // coordinate. Without it "I'm taking the ferry into Aalborg" returned no arrival
  // at all, and every piece of reasoning that starts from where they land — the
  // route order, the reach band, the return leg — quietly stood down. See the
  // Danish-arrival pass in utils/arrival.js.
  const arrivedAt = arrivalPoint(convoText, { townPoint: townPointFor });
  const text = String(convoText || "");
  const seen = new Set();
  const matched = [];
  const list = Array.isArray(pools) ? pools : [];
  for (const p of list) {
    if (!p?.name) continue;
    const key = fold(p.name);
    if (!key || seen.has(key)) continue;
    // `_leaving` rather than dropped: it IS a place they named, it is their
    // starting point, and hiding it would make the screen look like it missed
    // the one town in the brief. What it does not get is its contents.
    if (mentionsPlace(text, p.name)) {
      seen.add(key);
      // ── A REJECTED PLACE IS DROPPED, NOT BADGED ─────────────────
      // Unlike `_leaving`, which stays on the screen because it is where the
      // traveller starts and hiding it would look like a miss. A place the
      // answer told them to avoid has no such claim: showing it at all is the
      // bug, and a badge saying "we said not to" is a card that still puts the
      // wrong bar in front of somebody skimming.
      if (isRejectedPlace(text, p.name)) continue;
      matched.push(isDeparturePlace(text, p.name) ? { ...p, _leaving: true } : p);
    }
  }
  // ── AND THE REGION THEY ACTUALLY ASKED FOR ────────────────────────
  // "We have heard about Jutland and would like to see some of it" named the
  // one thing this traveller wanted and matched nothing, because Jutland is not
  // a town and no row is called that. Towns in a named region are added here,
  // marked `_viaRegion` so the screen can say why they are on it, and capped
  // because Jutland is half the country.
  const wantedRegions = regionsNamed(text);
  // ── AND "OUT OF THE CITY" NAMES NOWHERE TO GO ─────────────────────
  //
  // Oliver, 20 Aug 2026, on this brief: "6 days, arriving 26 December, just me,
  // We are already in Copenhagen and want to get out of the city, We are renting
  // a car, We would rather stay in one place and take day trips, into cycling and
  // craft and workshops and museums."
  //
  // The screen came back with ONE card. Copenhagen, badged "Where you start".
  // His verdict: "This is just wild.."
  //
  // Every part of that is a rule working. He said he wants out, so
  // isDeparturePlace marks Copenhagen `_leaving` and it is correctly not
  // expanded. He named no other town, so pass one had nothing else to match. He
  // named no region either, so the region pass never ran. Four correct decisions
  // and an empty screen, which is the exact failure this file warned about in its
  // own words while building the departure test: "That is the same emptiness as
  // the bug, aimed at the opposite traveller."
  //
  // A traveller who says where they are LEAVING has told us as much as one who
  // says where they are going. They have given us an origin, six days and a car.
  // The machinery to answer that already exists twenty lines below and was
  // reachable only by naming a region: rank by Gemlyx's own tier, then by whether
  // it is a sane distance for the days and the mode, then by what is held there,
  // then by what they said they were into.
  //
  // So the region pass gets a second door. Same ranking, same cap, same reach
  // rule, and it opens only when the traveller named somewhere and is leaving all
  // of it, which is the one state where the screen would otherwise be empty.
  const leavingTowns = matched.filter(p => p._src === "town" && p._leaving);
  const stayingTowns = matched.filter(p => p._src === "town" && !p._leaving);
  const fillFromReach = !wantedRegions.length && leavingTowns.length > 0 && stayingTowns.length === 0;
  // ── AND THE TOWN THEY ARE LEAVING IS WHERE THEY ARE ───────────────
  // arrivalPoint reads "flying into X" and "the ferry into X", which is the
  // shape of an arrival and not the shape of "we are already in Copenhagen".
  // Without this the reach ranking has no origin at all on exactly the brief
  // that needs it most, and every distance band collapses to the same value.
  // Their own words put them in a town; that town has a coordinate; it is the
  // most reliable origin on the screen and it was being ignored.
  const from = arrivedAt || (leavingTowns.length ? townPointFor(leavingTowns[0].name) : null);
  if (wantedRegions.length || fillFromReach) {
    // ── AND WHICH SIX, WHICH IS THE WHOLE QUESTION ────────────────
    // Oliver's screenshot, 15 Aug 2026. The region pass worked, and for a two
    // day trip out of Copenhagen wanting "quiet walks and history" it returned
    // Sparkær, "a small railway town of 616 inhabitants built around a railway
    // junction", Asaa, and Øster Hurup: three villages in north Jutland, four
    // and five hours away, chosen for no reason except that they came first in
    // the array, which is Supabase id order. His reaction to the trip that
    // implies was "IN 3 days!? Damn.. good luck."
    //
    // Appending in database order is the same defect the second pass has for
    // attractions, and here it is worse: pass two at least holds places inside
    // a town the traveller named, while this one is free to reach anywhere in
    // half a country.
    //
    // Ranked, then capped. Gemlyx's own tier first, because that is the
    // editorial judgement the whole app is built on and a 616-person railway
    // junction is not "Can't miss". Then what they said they were into, read
    // off the town's own words. Then name, so two runs of the same brief give
    // the same screen.
    // RENAMED from `wanted`, which is the name of this function's own option
    // three lines up. The inner one shadowed the outer one completely, and it
    // only ever worked because nothing in this block read the option. Adding
    // one line that did would have read the lowercased conversation as a Set
    // of categories, silently, with no error anywhere.
    const briefText = String(text).toLowerCase();
    const interestHit = (p) => {
      // ── A TOWN IS RANKED BY INTEREST AND NEVER FILTERED BY IT ─────
      // This is the difference between a town and everything under it, and it
      // is deliberate. A traveller who wants markets still has to sleep
      // somewhere, so a town that matches nothing they said is a worse
      // suggestion rather than a wrong one. An ATTRACTION that matches nothing
      // they said is just the wrong attraction, and that one is filtered, in
      // the second pass below.
      const fit = fitsBrief(p, themes);
      let n = fit.why.length * 2;
      // `topics`, not `hay`: a plain substring test is exactly right for a
      // topic word and exactly wrong for a place name, and the suite guards the
      // NAME matcher against `hay.includes(` by that name. Different question,
      // different variable, so the guard keeps meaning what it means.
      const topics = [p.highlight, p.desc, p.region, ...(Array.isArray(p.tags) ? p.tags : [])].join(" ").toLowerCase();
      for (const w of ["history", "historic", "walk", "walks", "quiet", "beach", "coast", "art", "museum", "food", "hike", "nature", "castle", "viking", "old town"]) {
        if (briefText.includes(w) && topics.includes(w)) n++;
      }
      return n;
    };
    // ── "ALL IT DOES NOW IS SHOW TOWNS" ──────────────────────────
    // Oliver, 15 Aug 2026, on the screen this produced: six town cards and
    // nothing else. Two things met to cause that. The town he named was the one
    // he was LEAVING, so it is correctly not expanded, and it is also the only
    // town in the database with attractions and restaurants under it. The six
    // that replaced it were picked without ever asking whether Gemlyx holds
    // anything in them, and it holds nothing in Asaa or Viborg.
    //
    // So a town Gemlyx can actually fill out beats one it cannot. This is not a
    // quality judgement about the town, it is about what this screen is FOR:
    // proving Gemlyx knows the ground. A town card on its own proves nothing.
    // ── AND THE COUNT HAS TO ASK THE SAME QUESTION AS THE EXPANSION ──
    // This keyed on fold(parent) and looked it up with fold(town.name), which
    // is exact string equality after folding. Sixty lines below, the pass that
    // actually expands a town under its rows asks samePlaceName, with the
    // comment saying why: "a row can store 'Kobenhavn' while the town row is
    // called 'Copenhagen', and they are one place."
    //
    // So the two disagreed. Nine Copenhagen rows filed under `city: "København"`
    // counted as zero holdings for the town row called "Copenhagen", and were
    // then expanded under it anyway. Wrong twice over: the "9 places inside"
    // badge never rendered, and `held` scored the richest town in the country as
    // empty, so a town Gemlyx holds nothing in could outrank it. That is the
    // exact term this score was rebalanced around this afternoon.
    //
    // Counted into whichever key already means the same place, so the two names
    // are one bucket rather than two halves.
    const holdings = new Map();
    for (const q of list) {
      if (!q?.name || q._src === "town") continue;
      const parent = parentTownOf(q);
      if (!parent) continue;
      const k = [...holdings.keys()].find(x => samePlaceName(x, parent)) || fold(parent);
      holdings.set(k, (holdings.get(k) || 0) + 1);
    }
    const heldFor = (name) => {
      const k = [...holdings.keys()].find(x => samePlaceName(x, name));
      return k ? holdings.get(k) : 0;
    };
    const candidates = [];
    for (const p of list) {
      if (!p?.name || p._src !== "town") continue;
      const key = fold(p.name);
      if (!key || seen.has(key)) continue;
      // With a region named, being IN it is the filter. Without one, reach is,
      // and reach is already in the score below rather than being a second,
      // differently-worded opinion about the same distance.
      const hit = wantedRegions.length ? wantedRegions.find(r => placeIsInRegion(p, r)) : "";
      if (wantedRegions.length && !hit) continue;
      // Gemlyx's own bottom tier is a statement that this is not worth planning
      // around, so it is never offered to somebody choosing where to go.
      if (tierOf(p)?.id === TOO_WEAK_FOR_A_REGION_PICK) continue;
      const held = heldFor(p.name);
      candidates.push({
        p, hit, key, held,
        // Held content sits SECOND, under the editorial tier: a "Can't miss"
        // town with nothing under it yet is still the better recommendation
        // than a "Worth a look" one with three restaurants.
        // ── REACH SITS UNDER TIER AND OVER HELD CONTENT ────────
        // Under tier, because Gemlyx's own editorial judgement is the thing
        // this whole app is built on and a "Can't miss" town must never be
        // dropped for being thirty km further away.
        //
        // OVER held content, and that is the fix. `held` was second, so the
        // town with the most published entries won, which is a fact about the
        // library rather than about this trip AND a feedback loop: Aalborg
        // already held the most, so every entry published there pushed it
        // further above the towns beside the airport. Researching more content
        // was making the route worse.
        //
        // Bands, not raw kilometres, so a three km difference can never outrank
        // a tier. See reachBand: the bands widen with trip length, because 155
        // km is nothing on seven days and most of a day on two.
        score: [
          TIER_RANK[tierOf(p)?.id] ?? 0,
          from ? reachBand(kmBetween(from, p), days, mode) : 1,
          Math.min(held, 5),
          interestHit(p),
          p.isMajorCity ? 1 : 0,
        ],
      });
    }
    candidates.sort((a, b) => {
      for (let i = 0; i < a.score.length; i++) if (b.score[i] !== a.score[i]) return b.score[i] - a.score[i];
      return String(a.p.name).localeCompare(String(b.p.name));
    });
    // ── AND OUT OF REACH IS A REASON TO LEAVE IT OUT ────────────────
    // Oliver, 17 Aug 2026, on a two day bicycle trip from a ferry into Aalborg:
    // the screen offered Billund, Copenhagen, Ribe and Esbjerg. Copenhagen is
    // about 400 km away. Everything above this line was working: the band ranked
    // it last. Ranking cannot express "this is not possible", and with four slots
    // to fill, last still gets offered.
    //
    // NOT A DELETION. A limit's worth of reachable towns wins outright; the far
    // ones are only used to top up when there are not enough, because a preview
    // with nothing on it is a worse product than one honest stretch. See
    // preferReachable in routeOrder.js.
    const limit = regionPickLimit(days);
    const reachable = preferReachable(candidates, {
      keepAtLeast: limit,
      bandOf: (c) => (from ? reachBand(kmBetween(from, c.p), days, mode) : REACH_STRETCH),
    });
    for (const c of reachable.slice(0, limit)) {
      seen.add(c.key);
      // `_holds` so the card can say what is under it rather than looking like
      // a bare name, and so a screen that is all towns is visibly all towns.
      // Said out loud either way, because the card has to be able to explain
      // itself: "in Jutland, which you asked about" and "within reach of where
      // you are" are different claims and only one of them was ever asked for.
      matched.push({ ...c.p, ...(c.hit ? { _viaRegion: c.hit } : { _viaReach: true }), _holds: c.held });
    }
  }
  // A town they are LEAVING does not get expanded. This is the whole of the
  // Copenhagen report: ten Copenhagen rows on a screen for somebody whose brief
  // was "we are already in Copenhagen and want to get out of the city".
  const matchedTowns = new Set(matched.filter(p => p._src === "town" && !p._leaving).map(p => fold(p.name)));
  if (matchedTowns.size) {
    for (const p of list) {
      if (!p?.name || p._src === "town") continue;
      const key = fold(p.name);
      if (!key || seen.has(key)) continue;
      const parent = parentTownOf(p);
      if (!parent) continue;
      // samePlaceName, not equality: a row can store "Kobenhavn" while the
      // town row is called "Copenhagen", and they are one place.
      if (![...matchedTowns].some(t => samePlaceName(parent, t))) continue;
      seen.add(key);
      // `_notAsked` rather than dropped, and the difference is the whole point.
      // These rows still travel to the screen, so the section can say "Gemlyx
      // holds 9 attractions in Copenhagen" and offer them, instead of being
      // absent and looking like Gemlyx knows nothing there. See
      // wantedCategories: null means the brief named no interests, and then
      // nothing is held back.
      // Food asks a different question from everything else, and only food.
      // See foodIsPlanned above: silence narrows nothing anywhere on this screen
      // except here, because not mentioning food is what almost every traveller
      // does and it cannot be the thing that fills their days with restaurants.
      const askedCategory = groupKeyOf(p) === "food"
        ? foodIsPlanned(wanted)
        : (!wanted || wanted.has(groupKeyOf(p)));
      // ── AND THE CATEGORY BEING RIGHT IS NOT THE ROW BEING RIGHT ───
      // Oliver, 15 Aug 2026, on a brief that said markets and modern design and
      // got Amalienborg Slot, Københavns Museum and the Glyptotek: "Don't put
      // up a bunch of random attractions just to have something."
      //
      // Every one of those three passed the category gate, because "design" is
      // in wantedCategories' `free` word list next to "castle" and "viking".
      // Once `free` was wanted this loop took every `free` row in the town, in
      // database order, and the first six won. Nothing asked what the row was
      // about. interestFit.js asks, off the closed vocabulary already stamped
      // on the row by the sweep.
      //
      // Same treatment as a category nobody asked for, on purpose: it is
      // offered, not deleted. Behind the door it is ranked and cut to three
      // (see rankOffers), because the door was the other half of the same
      // complaint.
      const fit = fitsBrief(p, themes);
      // ── AND WHAT IT COSTS IS PART OF WHETHER IT FITS ──────────────
      // Oliver, 17 Aug 2026: "geranium is NOT mid-range.. so remember to make
      // food places include in budget."
      //
      // Nothing in this function had ever read a price. Towns are ranked on tier,
      // reach, held content and interest, and then every food row in a matched
      // town went on the screen without once asking what a meal costs. So a
      // traveller whose own words were "it's a tight backpacker to be honest" was
      // handed the most expensive restaurant in the country, and the screen had no
      // idea it had done anything strange.
      //
      // BEHIND THE DOOR, NOT DELETED, and that is deliberate rather than lazy: it
      // is the same treatment a category they did not ask about gets, ten lines
      // above. A tight budget in Copenhagen still wants to know Geranium exists;
      // it just must not be offered as if it were tonight's dinner. An unknown
      // price is never treated as an expensive one — see utils/budgetFit.js.
      const overBudget = outOfBudget(p, budget);
      const held = !askedCategory || !fit.fits || overBudget;
      matched.push(held
        ? { ...p, _notAsked: true, _held: overBudget ? "budget" : (askedCategory ? "fit" : "category"), _fit: fit, ...(overBudget ? { _overBudget: budgetWarning(p, budget) } : {}) }
        : { ...p, _fit: fit });
    }
  }
  // ── AND THE ORDER THEY COME BACK IN ─────────────────────────────
  // Oliver, 15 Aug 2026: "the important thing is that the route doesn't become
  // silly. That they follow a pattern that makes sense."
  //
  // Selection above is Gemlyx's judgement about WHICH towns. This is a separate
  // question about what order to read them in, and answering both with one
  // score is what put Aarhus above Ribe for somebody standing at Billund
  // airport. Towns only: a restaurant is read under its town, not driven to
  // from the airport, and reordering the food section by distance would break
  // the grouping the sections rely on.
  //
  // No arrival means no anchor, and routeOrder leaves the order untouched
  // rather than inventing a start point.
  const towns = matched.filter(p => p._src === "town");
  if (from && towns.length > 1) {
    const { ordered, legs } = routeOrder(towns, { from });
    const byName = new Map(legs.map(l => [l.to, l]));
    const inOrder = ordered.map(p => {
      const leg = byName.get(p.name);
      // Stamped so the card can say "49 km from Billund Airport" and the order
      // is legible rather than merely correct. A silent reordering is a change
      // nobody can check.
      return leg ? { ...p, _legKm: leg.km, _legFrom: leg.from } : p;
    });
    const rest = matched.filter(p => p._src !== "town");
    return [...inOrder, ...rest];
  }
  return matched;
};
