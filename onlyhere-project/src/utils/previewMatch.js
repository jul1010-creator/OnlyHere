import { fold, variantsOf, matchVariantsOf, samePlaceName, containsName, foundAt } from "./danishNames";
import { townOfLocation } from "./nightlife";
import { canonicalRegion, regionPart, regionOf, REGION_NAMES } from "./regions";
import { tierOf, THEME_LABEL } from "./placeThemes";
import { PARTS_OF_COUNTRY } from "./sourcePolicy";
// The whole word test and the row level fit test both live in interestFit.js.
// saysWord was defined in this file and is imported now for one reason: this
// file and that one both have to agree on what "the traveller said this word"
// means, and two copies of a word boundary check drift the first time either
// one of them is touched.
import { saysWord, fitsBrief, FIT_STRONG } from "./interestFit";
// Where they land, and how to order a list of towns from it. See routeOrder.js
// for the measurement that prompted both: 416 km shown against 279 km possible,
// on a brief that had asked for two bases.
import { arrivalPoint, destinationPoint } from "./arrival";
import { townPointFor } from "./guideEnrichment";
import { outOfBudget, budgetWarning } from "./budgetFit";
import { routeOrder, reachBand, kmBetween, preferReachable, REACH_STRETCH, REACH_FAR } from "./routeOrder";

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
  // `_major` so the thinning rule in tripEvents can tell the two arrays apart
  // after this flattens them. They arrive with the same `_src` on purpose, since
  // everything downstream treats an event as an event, and that is exactly why
  // "this one came out of majorEvents" had no way of surviving the join. See
  // isMajorEvent, which reads this or the `__scale` a published festival carries.
  ...majorEvents.map(p => ({ ...p, _src: "event", _major: true })),
];

// ── WHERE THIS TRIP IS, FOR CALLERS OUTSIDE THIS FILE ───────────────
// The preview screen needs the same anchor matchedPlaces uses, to ask how far
// an event is. Exported from here rather than recomputed there, because two
// answers to "where is this trip" is how the towns section and the events
// section end up planning different holidays.
export const tripAnchorFor = (convoText, saidByTraveller = "") => {
  // Their own turns for both halves, and the fallback to the whole text only
  // when the caller has not got them, which keeps an old call site working
  // rather than silently returning nothing.
  const own = String(saidByTraveller || "") || String(convoText || "");
  return arrivalPoint(own, { townPoint: townPointFor })
    || destinationPoint(own, { townPoint: townPointFor });
};

// ── AND A ROW WITHOUT A COORDINATE IS NOT A ROW WITHOUT A PLACE ─────
// coordsOf in routeOrder.js reads __lat/__lon off the row and nothing else, so
// every reach test in this file quietly stood down for any town whose
// coordinates were never filled: kmBetween returned null, reachBand answered
// STRETCH, and the distance term became the same number for every candidate.
// The same shape as the arrival that was never read, one field along.
//
// townPointFor is the library the rest of the app already uses to place a town
// by name, and asking it is free. The row's own coordinate still wins, because
// a row that carries one is more specific than a town centre.
export const placePoint = (p) => {
  const la = Number(p?.__lat ?? p?.lat), lo = Number(p?.__lon ?? p?.lon);
  if (Number.isFinite(la) && Number.isFinite(lo)) return { lat: la, lon: lo };
  return p?.name ? townPointFor(p.name) : null;
};

// The point an event actually happens at: its own coordinate when it has one,
// otherwise its town's. Null when neither resolves, and null is honest here in
// the same way `km == null` is honest inside reachBand. An event whose location
// nobody can place is not a far event, it is an unknown one, and refusing it
// would delete rows for a missing coordinate rather than for a real distance.
export const eventPoint = (e) => {
  const lat = Number(e?.__lat ?? e?.lat);
  const lon = Number(e?.__lon ?? e?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  const town = parentTownOf(e);
  return (town && townPointFor(town)) || (e?.name ? townPointFor(e.name) : null);
};

// ── AN EVENT IS A DAY, NOT A TRIP ───────────────────────────────────
// reachBand widens with the trip's length, which is right for a town: seven
// days can honestly hold a town two hundred kilometres away, because you sleep
// there. An event cannot be slept in. It is one day, and the day has to include
// getting back, so the budget passed here is one day no matter how long the
// holiday is.
//
// That single line is the difference between "Aalborg to Copenhagen is 240 km,
// which is comfortable across a week" and "Aalborg to Copenhagen is 240 km,
// which is most of a day each way for a convention". The second one is the
// question the traveller is actually being asked.
const EVENT_IS_ONE_DAY = 1;

// `from` is a point or a list of them, and the band is the BEST one: a trip
// with two bases is near everything either base is near, and measuring only
// from the first would refuse the whole second half of the holiday.
//
// Null when there is nothing to measure from or nothing to measure to, and null
// is honest in the same way `km == null` is honest inside reachBand. An event
// whose location nobody can place is not a far event, it is an unknown one.
export const eventReachBand = (e, from, mode = null) => {
  const points = (Array.isArray(from) ? from : [from]).filter(Boolean);
  if (!points.length) return null;
  const at = eventPoint(e);
  if (!at) return null;
  const bands = points.map(pt => reachBand(kmBetween(pt, at), EVENT_IS_ONE_DAY, mode));
  return Math.max(...bands);
};

// ── AND WHICH PLACES COUNT AS "WHERE THIS TRIP IS" ──────────────────
// The anchor, plus every town the TRAVELLER named. Not the towns Gemlyx named:
// that is the door the Comic Con came through, and letting a town the app
// proposed to itself widen the reach test would hand the refusal straight back.
// Takes the output of matchedPlaces, so the screen does not have to know how a
// town gets its coordinate.
export const tripPoints = (anchor, matched) => {
  const out = anchor ? [anchor] : [];
  for (const p of Array.isArray(matched) ? matched : []) {
    if (p?._src !== "town" || !p._saidByThem || p._consider) continue;
    const pt = placePoint(p);
    if (pt) out.push(pt);
  }
  return out;
};

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
// ── A COMPASS QUALIFIER MAKES IT A DIFFERENT PLACE ──────────────────
//
// Oliver, 21 Aug 2026: "I never said Billund and Aarhus.. that's odd to put on
// the review." He said "I'm starting from Southern Jutland".
//
// "Jutland" is a whole word inside "Southern Jutland", so the wide tier matched
// and every town in Jutland became a wanted town. Aarhus (Østjylland) and
// Billund (Sydvestjylland) both passed, and both arrived badged IN JUTLAND,
// which is the app honestly reporting an input it had invented.
//
// Worse, the region he DID name was lost on the way: "Southern Jutland" is a
// REGION_ALIASES spelling of Sønderjylland and this function reads PLACE_NAMES,
// which only carries "South Jutland". So the narrow request vanished and the
// wide one containing it took its place, which is the exact move the comment on
// placeIsInRegion forbids: "Containment runs ONE WAY: asking for the whole of
// Jutland reaches every region in it, asking for one region does not reach its
// neighbours." That discipline was enforced one step too late, after the
// widening had already happened here.
//
// Same shape as the New Zealand guard below, and it lives beside it on purpose.
const COMPASS_QUALIFIER = /\b(?:south|southern|north|northern|east|eastern|west|western|mid|middle|central|syd|sønder|sonder|nord|øst|ost|vest|midt)(?:ern)?[\s-]*$/i;

// ── AND ONLY WHERE A QUALIFIED VERSION IS A REAL PLACE ──────────────
// REGION_NAMES carries compass sub-regions for exactly two of the five parts:
// Jutland (Nordjylland, Vestjylland, Midtjylland, Østjylland, Sydvestjylland,
// Sydøstjylland, Sønderjylland) and Zealand (Nordsjælland, Midt- og
// Vestsjælland, Sydsjælland og Møn). Funen, Lolland-Falster and Bornholm have
// none, so "southern Funen" is a DESCRIPTION of Funen rather than the name of
// somewhere else, and suppressing it would throw away a real request to fix a
// problem that part does not have. Caught by the test that asked for southern
// Funen and got nothing back.
const QUALIFIABLE_PARTS = ["Jutland", "Zealand"];

// ── AND A PLACE YOU ARE LEAVING IS NOT A PLACE YOU ASKED FOR ────────
//
// isDeparturePlace has known since it was written that "out of Copenhagen" is
// not a request for Copenhagen. It is called on TOWN rows only, and its verb
// list is out of / outside / away from / leave / escape, so neither half of
// "I'm starting from Southern Jutland" reaches it: wrong tier, and no origin
// preposition in the vocabulary.
//
// This is the third instance of that hole. The first was towns, the second was
// "steer well clear of X" one tier down (isRejectedPlace), and this is regions,
// one tier up. Narrow on purpose: an origin preposition immediately before the
// name, nothing cleverer, because reading a wanted region as unwanted empties
// the screen in the other direction.
const FROM_ORIGIN = /\b(?:start(?:ing)?|com(?:e|ing)|mov(?:e|ing)|driv(?:e|ing)|travell?(?:ing)?|head(?:ing)?|arriv(?:e|ing)|set\s+off|depart(?:ing)?)\s+(?:up\s+|down\s+|over\s+|across\s+|out\s+)?from\s*$/i;

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
      return at.some(i => {
        const before = hay.slice(Math.max(0, i - 24), i);
        if (/\b(?:new|nya|nieuw|nouvelle)\s*$/i.test(before)) return false;
        // "Southern Jutland" is Sønderjylland, not Jutland. Only the wide tier
        // can be qualified this way: "North Jutland" and "South Jutland" are
        // regions in their own right, while a REGION_NAME is already specific
        // and "southern Funen" is still Funen.
        if (QUALIFIABLE_PARTS.includes(r) && COMPASS_QUALIFIER.test(before)) return false;
        // "I'm starting from Southern Jutland" is where they began, not where
        // they want to be taken.
        if (FROM_ORIGIN.test(before)) return false;
        return true;
      });
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

// ── AND WHAT IS WORTH A DAY EACH WAY ────────────────────────────────
// The tiers that may appear in the consider list, and two is the whole of it.
// "Worth Considering" is Gemlyx's way of saying it is fine if you are passing;
// crossing the country for one is the opposite of what the tier means. The cap
// is two because this is a footnote to a shortlist, and a footnote as long as
// the list it hangs off is a second list.
const WORTH_A_DETOUR = new Set(["must", "high"]);
export const CONSIDER_CAP = 2;

// One wording, because two of them on one screen reads as two different places.
const ANCHOR_FALLBACK_NAME = "where you are";

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
// `saidByTraveller` is THEIR turns only, and it is the fix for the failure
// this file has now had three times in three different readers. The whole
// transcript is still the right material for a place NAME, for the reason
// written above: a place Gemlyx named and the traveller kept talking about is a
// place in this trip. It is the wrong material for every question about what
// they WANT, because Gemlyx suggests things and its own suggestion must never
// become the evidence that it was asked for.
//
// Oliver, 21 Aug 2026, on a preview for "I am going to Aalborg, and I have 7
// days to play with" that came back holding Ribe, three hundred kilometres
// away: "Clearly the preview has NOTHING to do with the chat, at all."
//
// The region pass is how Ribe got in, and this is how the region pass opened.
// He named no region. GEMLYX did, in the sentence right after his:
//
//   "Aalborg's a great pick, way underrated compared to what most tourists see."
//   "Ferry into Aalborg, nice, that's proper North Jutland arrival"
//
// regionsNamed then read "Jutland" out of the app's own reply, and Ribe is in
// Jutland. The app suggested a region to itself and then filled half the screen
// from it. Same shape as the interest reader in tripBrief and the theme reader
// on the preview screen, both already fixed, both for this reason.
//
// It falls back to the whole text when the caller does not pass it, so every
// existing call site keeps today's behaviour rather than silently narrowing.
export const matchedPlaces = (convoText, pools, { days = null, wanted = null, themes = null, mode = null, budget = null, saidByTraveller = "" } = {}) => {
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
  const text = String(convoText || "");
  const ownWords = String(saidByTraveller || "") || text;
  // ── AND THE ARRIVAL IS THEIRS TO STATE TOO ──────────────────────
  //
  // This read the whole transcript, and on his Aalborg brief that produced an
  // anchor of COPENHAGEN AIRPORT, 240 km from the only town he had named. The
  // sentence it came from is Gemlyx's:
  //
  //   "Since you haven't mentioned a starting point, I'll assume you're landing
  //    at Copenhagen Airport and making your way north from there."
  //
  // Which is honest of it. It says out loud that nobody told it, and then
  // arrivalPoint read its own guess back as a fact, anchored the reach filter
  // and the route order on it, and the towns near Copenhagen were suddenly the
  // near ones. utils/arrival.js already documents this exact failure for the
  // preposition rule and calls the case that came out of Gemlyx's reply "worse
  // than the first one".
  //
  // So arrivals join interests, themes, transport, budget and regions: read
  // from the traveller's own turns. Place NAMES are still read from the whole
  // conversation, because that is a different question, and the comment on
  // `saidByTraveller` above says which is which.
  const arrivedAt = arrivalPoint(ownWords, { townPoint: townPointFor });
  // ── AND WHERE THE TRIP IS, WHICH IS NOT WHERE IT STARTS ─────────
  // arrivalPoint answers "how do you get into Denmark". His sentence answered a
  // different question: where the trip IS. Nothing read it, so `from` below was
  // null, reachBand was never called, and the distance term in the town score
  // was a flat 1 for every candidate in the country. Ranking collapsed to
  // editorial tier and a "Can't Miss Out" town wins from anywhere. See
  // destinationPoint in utils/arrival.js for the reader and the cue rules.
  //
  // Traveller's own words only, and for the sharper version of the reason
  // above: Gemlyx writes "you could spend three days in Ribe" constantly, and
  // that sentence would otherwise anchor the entire trip on a town the app
  // proposed to itself.
  const goingTo = destinationPoint(ownWords, { townPoint: townPointFor });
  // Known before the first pass runs, because the first pass needs it: a town
  // that appears ONLY in Gemlyx's replies and is out of honest reach is not in
  // this trip, and until now it went on the screen and took its whole inventory
  // with it. `from` further down is this, or the town they said they are
  // leaving, which pass one has to run before it can know.
  const anchor = arrivedAt || goingTo;
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
      // ── A REJECTED PLACE IS DROPPED, NOT BADGED ─────────────────
      // Unlike `_leaving`, which stays on the screen because it is where the
      // traveller starts and hiding it would look like a miss. A place the
      // answer told them to avoid has no such claim: showing it at all is the
      // bug, and a badge saying "we said not to" is a card that still puts the
      // wrong bar in front of somebody skimming.
      if (isRejectedPlace(text, p.name)) { seen.add(key); continue; }
      // ── AND A TOWN ONLY GEMLYX NAMED, 400 KM AWAY ───────────────
      // Oliver, 21 Aug 2026: "And Comic Con? Really?" A Copenhagen convention,
      // badged RECOMMENDED, on a seven day trip to Aalborg.
      //
      // Copenhagen reached that screen through this line. He never typed it.
      // Gemlyx did, once, in an assumption he never confirmed: "Since you
      // haven't mentioned a starting point, I'll assume you're landing at
      // Copenhagen Airport." That put Copenhagen in `matched`, the expansion
      // pass below then took every Copenhagen row Gemlyx holds, and tripEvents
      // scores events on named, interest, tier and dates with no geographic
      // term at all. The convention was never asked whether it was near him.
      //
      // A town the TRAVELLER named stays whatever the distance: they asked, and
      // refusing it would be the app arguing with the brief. A town only the app
      // named has no such claim, and out of honest reach is the honest answer.
      // Both halves are required, so this can only ever drop a row nobody asked
      // for. With no anchor it drops nothing, which is every brief before today.
      //
      // ── AND IT IS A PREFERENCE, NOT A DELETION ──────────────────
      // An adversarial pass found the first version emptying the screen: a
      // traveller whose own town has no published row, and three that Gemlyx
      // named and that are all far, left NO towns at all. Every other reach
      // decision in this app is a preference with a floor under it
      // (preferReachable in routeOrder.js, the reach partition below, the
      // thinning rule in tripEvents.js), and this one was a straight cut.
      //
      // Marked here, decided after the loop, when it is knowable whether
      // anything else survived. `seen` is not written for these either, so a
      // town that does get dropped is still free to come back through the
      // region pass on its merits rather than being blacklisted by a rule that
      // was only ever about pass one.
      const saidByThem = mentionsPlace(ownWords, p.name);
      const farFromTrip = !saidByThem && p._src === "town" && !!anchor
        && reachBand(kmBetween(anchor, placePoint(p)), days, mode) === REACH_FAR;
      const base = { ...p, ...(saidByThem ? { _saidByThem: true } : {}), ...(farFromTrip ? { _farFromTrip: true } : {}) };
      seen.add(key);
      matched.push(isDeparturePlace(text, p.name) ? { ...base, _leaving: true } : base);
    }
  }
  // ── AND NOW IT IS KNOWABLE WHETHER ANYTHING ELSE SURVIVED ────────
  // The far ones go only if the screen still has a town on it without them. The
  // floor is the rule this file has been given twice in his own words: a
  // preview with nothing on it is a worse product than one honest stretch.
  {
    const townRows = matched.filter(p => p._src === "town");
    if (townRows.some(p => !p._farFromTrip)) {
      for (let i = matched.length - 1; i >= 0; i--) {
        if (!matched[i]._farFromTrip) continue;
        seen.delete(fold(matched[i].name));
        matched.splice(i, 1);
      }
    } else {
      // Kept, and the marker goes with them: nothing downstream should treat a
      // town that is on the screen as though it were held back.
      matched.forEach(p => { delete p._farFromTrip; });
    }
  }
  // ── AND THE REGION THEY ACTUALLY ASKED FOR ────────────────────────
  // "We have heard about Jutland and would like to see some of it" named the
  // one thing this traveller wanted and matched nothing, because Jutland is not
  // a town and no row is called that. Towns in a named region are added here,
  // marked `_viaRegion` so the screen can say why they are on it, and capped
  // because Jutland is half the country.
  const wantedRegions = regionsNamed(ownWords);
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
  const from = anchor || (leavingTowns.length ? townPointFor(leavingTowns[0].name) : null);
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
      // Kept on the candidate rather than recomputed below, because the reach
      // partition needs the same answer the score used and two calls to the
      // same function is how two parts of one decision drift apart.
      const fit = fitsBrief(p, themes);
      candidates.push({
        p, hit, key, held, fit,
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
          from ? reachBand(kmBetween(from, placePoint(p)), days, mode) : 1,
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
    const bandOf = (c) => (from ? reachBand(kmBetween(from, placePoint(c.p)), days, mode) : REACH_STRETCH);
    // ── AND OUT OF REACH IS NOT A LOWER RANK, IT IS A DIFFERENT LIST ─
    //
    // Oliver, 21 Aug 2026, on Ribe offered for a seven day trip to Aalborg:
    // "Ribe? Easy to access through public transport? It's manageable. But
    // easy? Takes longer than just taking a train all the way to Copenhagen. So
    // not exactly great for a tourist."
    //
    // preferReachable was already here and already correct about its own job:
    // reachable ones first, far ones only to top up so the screen is never
    // empty. The trouble is that "never empty" and "fill the limit" are not the
    // same promise, and it was keeping the second one. Three slots to fill and
    // two reachable towns meant a third was taken from the far pile every time,
    // for no reason except that the number said three.
    //
    // So the top-up now only happens when there would otherwise be NOTHING.
    // That keeps the rule this file was given in his own words on 15 Aug, "a
    // preview with nothing on it is a worse product than one honest stretch",
    // and stops the arithmetic reaching four hundred kilometres to satisfy a
    // count.
    const inReach = candidates.filter(c => bandOf(c) !== REACH_FAR);
    const picked = inReach.length
      ? inReach.slice(0, limit)
      : preferReachable(candidates, { keepAtLeast: limit, bandOf }).slice(0, limit);
    for (const c of picked) {
      seen.add(c.key);
      // `_holds` so the card can say what is under it rather than looking like
      // a bare name, and so a screen that is all towns is visibly all towns.
      // Said out loud either way, because the card has to be able to explain
      // itself: "in Jutland, which you asked about" and "within reach of where
      // you are" are different claims and only one of them was ever asked for.
      matched.push({ ...c.p, ...(c.hit ? { _viaRegion: c.hit } : { _viaReach: true }), _holds: c.held });
    }
    // ── "IF THEY REALLY LOVE VIKINGS, THEN PUT IT INTO A CONSIDER
    //     SECTION" ─────────────────────────────────────────────────
    //
    // His answer, 21 Aug 2026, when asked what should happen to a "Can't Miss
    // Out" town that is out of reach. Not deleted and not mixed in: a third
    // state, on the screen, saying what it costs.
    //
    // The bar is deliberately the row's OWN tags against what the traveller
    // said, not a word that happens to appear in both. "viking" is a history
    // word (see THEME_WORDS in interestFit.js), so somebody who writes that they
    // love Vikings gets fit.fits on a history-tagged town, and somebody who
    // wrote nothing about it does not. Tier on top of that, because a long trip
    // has to be worth the day it takes, and Gemlyx's own "Worth Considering" is
    // not a reason to cross the country.
    //
    // Only when there is a real list to sit beside. A screen whose entire
    // content is a detour is not a shortlist with a footnote, it is the far
    // pile with a nicer heading, and that is the bug this block sits under.
    if (from && inReach.length) {
      const detours = candidates
        .filter(c => bandOf(c) === REACH_FAR)
        // FIT_STRONG, not `fits`. fitsBrief answers `{ fits: true, why: [],
        // via: "nothing stated" }` for a brief that named no interest at all,
        // which is right everywhere else on this screen: silence narrows
        // nothing. Here it would have meant the opposite of what he asked for.
        // A traveller who has said nothing yet would get a detour across the
        // country offered on the strength of having said nothing, and the
        // suite caught exactly that: Copenhagen came back for a two day
        // bicycle trip out of Aalborg, through the feature written to keep it
        // out. FIT_STRONG is the row's OWN tags answering an interest they
        // actually stated, which is "if they REALLY love vikings" in code.
        .filter(c => c.fit?.via === FIT_STRONG && WORTH_A_DETOUR.has(tierOf(c.p)?.id))
        .slice(0, CONSIDER_CAP);
      for (const c of detours) {
        seen.add(c.key);
        matched.push({
          ...c.p, ...(c.hit ? { _viaRegion: c.hit } : { _viaReach: true }), _holds: c.held,
          // The card says the cost in its own badge rather than being quietly
          // ranked last, which is what the whole of this block is about.
          _consider: true,
          _considerKm: Math.round(kmBetween(from, placePoint(c.p))),
          _considerFrom: from.name || from.said || ANCHOR_FALLBACK_NAME,
          // Labels, not theme ids. The card renders this into a sentence and
          // "you said history" is the app's own vocabulary read out loud.
          _considerWhy: c.fit.why.slice(0, 2).map(t => THEME_LABEL[t] || t),
        });
      }
    }
  }
  // A town they are LEAVING does not get expanded. This is the whole of the
  // Copenhagen report: ten Copenhagen rows on a screen for somebody whose brief
  // was "we are already in Copenhagen and want to get out of the city".
  // ── AND A DETOUR DOES NOT BRING ITS INVENTORY WITH IT ───────────
  // A town in the consider list is a suggestion the traveller has not accepted.
  // Expanding it would put its restaurants and its events into the sections
  // above as though the detour were already in the plan, which is the Comic Con
  // failure wearing the new feature's clothes.
  const matchedTowns = new Set(
    matched.filter(p => p._src === "town" && !p._leaving && !p._consider).map(p => fold(p.name)),
  );
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
  // ── AND ONE TOWN HAS A DISTANCE TOO ─────────────────────────────
  // routeOrder answers "what order do these go in", which needs two of them.
  // "How far is this from where I am" needs one, and it is the question a
  // traveller looking at a single card is actually asking. The badge existed
  // and was gated behind the ordering, so the commonest screen of all, one town
  // and the things inside it, never said a distance at all.
  //
  // It matters more now than it did yesterday: `from` used to resolve only for
  // somebody who said how they were flying in, and it now resolves for anybody
  // who said where they are going, which is almost everybody.
  if (from && towns.length === 1) {
    const only = towns[0];
    const km = kmBetween(from, placePoint(only));
    // Zero is the commonest case now, not a rare one: the anchor IS the town
    // they named, so "0 km from Aalborg" on the Aalborg card is what a naive
    // version of this prints on almost every screen. Under a kilometre is the
    // same place by any reading.
    if (km != null && Math.round(km) > 0) {
      const rest = matched.filter(p => p._src !== "town");
      return [{ ...only, _legKm: Math.round(km), _legFrom: from.name || from.said || ANCHOR_FALLBACK_NAME }, ...rest];
    }
  }
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
