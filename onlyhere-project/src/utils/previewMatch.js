import { fold, variantsOf, samePlaceName, containsName } from "./danishNames";
import { townOfLocation } from "./nightlife";
import { canonicalRegion, regionPart, regionOf, REGION_NAMES } from "./regions";
import { tierOf } from "./placeThemes";
import { PARTS_OF_COUNTRY } from "./sourcePolicy";

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

export const isDeparturePlace = (convoText, name) => {
  const text = String(convoText || "");
  const variants = variantsOf(name, { includeSights: true }).filter(Boolean);
  let found = 0, leaving = 0;
  for (const v of variants) {
    const re = new RegExp(`(?<![\\w])${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "gi");
    let m;
    while ((m = re.exec(text))) {
      found++;
      const before = text.slice(Math.max(0, m.index - 40), m.index);
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 60);
      const directly = LEAVING_DIRECT.test(before) && !NOT_LEAVING.test(before.replace(LEAVING_DIRECT, ""));
      const intent = LEAVING_AT.test(after) && !NOT_LEAVING.test(after.slice(0, 40));
      if (directly || intent) leaving++;
    }
  }
  return found > 0 && leaving === found;
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
    const named = variantsOf(r).some(v => {
      if (!v) return false;
      if (!containsName(text, v)) return false;
      const at = fold(text).indexOf(fold(v));
      return !/\b(?:new|nya|nieuw|nouvelle)\s*$/i.test(fold(text).slice(Math.max(0, at - 12), at));
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
export const matchedPlaces = (convoText, pools) => {
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
  if (wantedRegions.length) {
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
    const wanted = String(text).toLowerCase();
    const interestHit = (p) => {
      // `topics`, not `hay`: a plain substring test is exactly right for a
      // topic word and exactly wrong for a place name, and the suite guards the
      // NAME matcher against `hay.includes(` by that name. Different question,
      // different variable, so the guard keeps meaning what it means.
      const topics = [p.highlight, p.desc, p.region, ...(Array.isArray(p.tags) ? p.tags : [])].join(" ").toLowerCase();
      let n = 0;
      for (const w of ["history", "historic", "walk", "walks", "quiet", "beach", "coast", "art", "museum", "food", "hike", "nature", "castle", "viking", "old town"]) {
        if (wanted.includes(w) && topics.includes(w)) n++;
      }
      return n;
    };
    const candidates = [];
    for (const p of list) {
      if (!p?.name || p._src !== "town") continue;
      const key = fold(p.name);
      if (!key || seen.has(key)) continue;
      const hit = wantedRegions.find(r => placeIsInRegion(p, r));
      if (!hit) continue;
      candidates.push({ p, hit, key, score: [TIER_RANK[tierOf(p)?.id] ?? 0, interestHit(p), p.isMajorCity ? 1 : 0] });
    }
    candidates.sort((a, b) => {
      for (let i = 0; i < a.score.length; i++) if (b.score[i] !== a.score[i]) return b.score[i] - a.score[i];
      return String(a.p.name).localeCompare(String(b.p.name));
    });
    for (const c of candidates.slice(0, REGION_TOWN_CAP)) {
      seen.add(c.key);
      matched.push({ ...c.p, _viaRegion: c.hit });
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
      if ([...matchedTowns].some(t => samePlaceName(parent, t))) { seen.add(key); matched.push(p); }
    }
  }
  return matched;
};
