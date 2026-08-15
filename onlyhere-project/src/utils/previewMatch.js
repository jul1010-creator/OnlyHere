import { fold, variantsOf, samePlaceName, containsName } from "./danishNames";
import { townOfLocation } from "./nightlife";

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
export const mentionsPlace = (convoText, name) =>
  variantsOf(name, { includeSights: true }).some(v => containsName(convoText, v));

// Two passes, and the order is the meaning. Pass one is what the traveller
// named. Pass two is what Gemlyx holds inside the places they named, which is
// the difference between "you said Copenhagen" and "here is what we have on
// Copenhagen", and the only reason the screen exists.
export const matchedPlaces = (convoText, pools) => {
  const text = String(convoText || "");
  const seen = new Set();
  const matched = [];
  const list = Array.isArray(pools) ? pools : [];
  for (const p of list) {
    if (!p?.name) continue;
    const key = fold(p.name);
    if (!key || seen.has(key)) continue;
    if (mentionsPlace(text, p.name)) { seen.add(key); matched.push(p); }
  }
  const matchedTowns = new Set(matched.filter(p => p._src === "town").map(p => fold(p.name)));
  if (matchedTowns.size) {
    for (const p of list) {
      if (!p?.name || p._src === "town") continue;
      const key = fold(p.name);
      if (!key || seen.has(key)) continue;
      const parent = parentTownOf(p);
      if (!parent) continue;
      // samePlaceName, not equality: a row can store "Kobenhavn" while the
      // town row is called "Copenhagen", and they are one place.
      if ([...matchedTowns].some(t => samePlaceName(parent, t))) { seen.add(key); matched.push(p); }
    }
  }
  return matched;
};
