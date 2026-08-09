// ── "GIVE THE SEARCHING A PRIORITY" ─────────────────────────────────
//
// Oliver, 9 Aug 2026, answering my point that his content skews to Copenhagen:
// "I am doing my job getting more content.. I am clicking 'search the web'.
// Then give the searching a priority.. so tavily/perplexity will search for
// hidden gems or content on another island."
//
// He is right and my framing was wrong. Telling a founder to publish more is
// not advice, it is a restatement of the problem. The button he actually
// presses should aim somewhere useful on its own.
//
// ── WHY THE SEARCH KEEPS RETURNING COPENHAGEN ───────────────────────
// Two causes, and neither is the model being lazy.
//
// 1. IT SEARCHES IN ENGLISH. The query planner is given no language
//    instruction, so it writes English queries, and English-language writing
//    about Denmark is the tourist canon: the same ten listicles, ranked by how
//    many people already read them. "Hidden gems Denmark" in English returns
//    Nyhavn, Tivoli and the Round Tower, because that is what is written down
//    in English. A search optimised for findability cannot find the
//    unfindable, and the whole brand is the unfindable.
//
//    DANISH IS THE LEVER. "Skjulte perler Langeland" reaches a different
//    internet: municipality pages, regional tourism boards, local blogs,
//    Danish forum threads, the stuff Danes write for each other. That is
//    where a place with one good source lives, and one good source is exactly
//    what a hidden gem has.
//
// 2. IT DOES NOT KNOW WHAT IT ALREADY HAS. The planner is told which names to
//    avoid, which stops duplicates, and nothing about WHERE the gaps are. So
//    every search competes on the same ground the existing content already
//    covers, and the ground that is already covered is the ground that is
//    easiest to write about, which is why it was covered first.
//
// ── SO THE PRIORITY IS COMPUTED, NOT TYPED ──────────────────────────
// Same lesson as the Rudkobing one, applied on purpose this time rather than
// after a bug. A hand-written list of "islands to prioritise" would be one
// more curated field to keep true. The gap is derivable: the app already knows
// every published row's coordinates and which part of the country each falls
// in. Ask the data where it is thin and aim there.
import { PARTS, partOfCountry } from "./geography";
import { samePlaceName, fold } from "./danishNames";

const clean = (v) => String(v == null ? "" : v).trim();

// ── WHERE IS THE MAP THIN ───────────────────────────────────────────
// Counts published entries per part of the country. A part with nothing in it
// is not an error, it is the next thing to write about.
export const coverageByPart = (rows) => {
  const out = Object.fromEntries(PARTS.map(p => [p, 0]));
  for (const r of Array.isArray(rows) ? rows : []) {
    const part = partOfCountry(r?.payload || r);
    if (part && part in out) out[part] += 1;
  }
  return out;
};

// The thinnest parts, emptiest first. Ties keep PARTS order so the result is
// stable between calls rather than reshuffling on every render.
export const thinnestParts = (rows, n = 3) => {
  const counts = coverageByPart(rows);
  return [...PARTS]
    .sort((a, b) => (counts[a] - counts[b]) || (PARTS.indexOf(a) - PARTS.indexOf(b)))
    .slice(0, Math.max(1, n));
};

// How lopsided the coverage is, for the line shown above the button. A founder
// deciding where to spend an evening wants the number, not a nudge.
export const coverageSummary = (rows) => {
  const counts = coverageByPart(rows);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return null;
  const ranked = [...PARTS].sort((a, b) => counts[b] - counts[a]);
  const top = ranked[0];
  return {
    total,
    counts,
    heaviest: top,
    heaviestShare: counts[top] / total,
    empty: PARTS.filter(p => counts[p] === 0),
  };
};

// ── THE FRAMING HANDED TO THE QUERY PLANNER ─────────────────────────
// Appended to the existing prompt rather than replacing it, so the five angles
// it already varies across (forum, roundup, local tourism, recent listings,
// broad) all survive and simply get pointed somewhere.
//
// The Danish instruction is deliberately specific about WHY, because a model
// told merely to "write some queries in Danish" writes English queries with
// Danish place names in them, which reaches the same English internet.
export const discoveryFraming = (rows, { typeLabel = "places" } = {}) => {
  const parts = thinnestParts(rows, 3);
  const summary = coverageSummary(rows);
  const gapLine = parts.length
    ? `COVERAGE GAP, COMPUTED FROM WHAT IS ALREADY PUBLISHED: the thinnest parts of the country right now are ${parts.join(", ")}. ${summary && summary.empty.length ? `Nothing at all is published in ${summary.empty.join(" or ")}. ` : ""}Aim at least three of your five queries at those, naming the region, island or municipality explicitly. Do not aim any query at Copenhagen unless the type genuinely only exists there.`
    : "";

  return `${gapLine}

SEARCH IN DANISH FOR AT LEAST THREE OF THE FIVE. This is the single most important instruction here and it is not about politeness. English-language writing about Denmark is the tourist canon: the same roundups, ranked by how many people already read them, which is the precise opposite of what this guide is for. Danish-language pages are written by Danes for Danes, and that is where a place with one good local source lives. Write those queries as a Dane would actually type them, fully in Danish, not an English sentence with Danish place names dropped into it: "skjulte perler", "hvad laver man i", "lokale anbefalinger", "seværdigheder", "bedste sted at", "ikke turistet". Include the Danish spelling of the place, with its real letters, so Ærø is Ærø and not Aero.

FAMOUS IS A DISQUALIFIER, NOT A RECOMMENDATION. If a candidate appears in every "top 10 Denmark" list, this guide does not need it and neither does its reader. Prefer ${typeLabel} that a well-travelled Dane would name and a guidebook would not.`.trim();
};

// ── WHAT NOT TO BRING BACK ──────────────────────────────────────────
// The existing-names list already stops exact duplicates. This also catches a
// candidate that IS something published under its other language name, which
// the plain string compare misses: Copenhagen and Kobenhavn are one place and
// were being offered twice.
// samePlaceName, not a folded string compare. Folding gets "kobenhavn" and
// "copenhagen", which are two different strings and neither contains the
// other, so a plain compare cannot know they are one city. danishNames.js
// already holds that mapping and this is exactly what it is for. Caught by the
// test on its first run, using the one pair that matters most here.
export const isAlreadyCovered = (name, existingNames) => {
  const want = clean(name);
  if (!want) return false;
  const wantFolded = fold(want);
  return (Array.isArray(existingNames) ? existingNames : []).some(n => {
    const have = clean(n);
    if (!have) return false;
    if (samePlaceName(have, want)) return true;
    // And a containment fallback for the everyday case a name list produces:
    // "Reffen" published, "Reffen Street Food" offered.
    const haveFolded = fold(have);
    return haveFolded === wantFolded || haveFolded.includes(wantFolded) || wantFolded.includes(haveFolded);
  });
};

// ── "GIVE ME OPTIONS" ───────────────────────────────────────────────
//
// Oliver, 9 Aug 2026: "South Jutland, North Jutland, Central Jutland, Odense,
// North Zealand, Islands, etc. and with events, the same, hell, make me able
// to search for town-specific events perhaps."
//
// The computed priority above aims at the thinnest part on its own. This is
// the override, because a founder who has just found a lead, or who is filming
// on Fyn next weekend, knows something the coverage numbers do not.
//
// ── WHY THIS IS NOT JUST PARTS ──────────────────────────────────────
// geography.js has five parts: Jutland, Funen, Zealand, Lolland-Falster,
// Bornholm. They exist to answer "which landmass is this coordinate on", and
// they are right for that. They are far too coarse to aim a search: "Jutland"
// is a third of the country and searching it returns Aarhus every time, which
// is the Copenhagen problem again one level down.
//
// So targeting has its own vocabulary. Same reasoning as event types and place
// kinds: the list a human picks from and the list a coordinate falls into are
// different lists, and welding them together makes both worse.
//
// ── EVERY TARGET CARRIES ITS DANISH NAME ────────────────────────────
// Load-bearing, not decoration. The queries are Danish now, and a Dane writing
// about the region does not call it South Jutland. Handing the planner
// "Sønderjylland" is the difference between reaching Danish local writing and
// reaching an English page about Danish local writing.
const band = (lo, hi) => (lat) => lat > lo && lat <= hi;

export const DISCOVERY_TARGETS = [
  { id: "anywhere", label: "Wherever it is thinnest", danish: "", part: null, hint: "Uses the coverage gap computed from what you have published." },
  { id: "north-jutland", label: "North Jutland", danish: "Nordjylland", part: "Jutland", lat: band(56.8, 90), hint: "Skagen, Læsø, the Limfjord" },
  { id: "central-jutland", label: "Central Jutland", danish: "Midtjylland", part: "Jutland", lat: band(55.9, 56.8), hint: "Djursland, the lake district, the west coast" },
  { id: "south-jutland", label: "South Jutland", danish: "Sønderjylland", part: "Jutland", lat: band(-90, 55.9), hint: "Ribe, Tønder, the Wadden Sea, Als" },
  { id: "funen", label: "Funen", danish: "Fyn", part: "Funen", lat: null, hint: "Odense, Svendborg, the south Funen archipelago" },
  { id: "north-zealand", label: "North Zealand", danish: "Nordsjælland", part: "Zealand", lat: band(55.75, 90), hint: "The castles, Kattegat coast, Isefjord" },
  { id: "south-zealand", label: "South Zealand", danish: "Sydsjælland", part: "Zealand", lat: band(-90, 55.75), hint: "Stevns, Præstø, Køge Bugt" },
  { id: "lolland-falster", label: "Lolland, Falster and Møn", danish: "Lolland-Falster og Møn", part: "Lolland-Falster", lat: null, hint: "Møns Klint, Nykøbing, Marielyst" },
  { id: "bornholm", label: "Bornholm", danish: "Bornholm", part: "Bornholm", lat: null, hint: "The whole island" },
  // Deliberately last and deliberately vague about which islands: naming a
  // fixed set here would be a curated list going stale the moment a route
  // changes, and there are around 70 inhabited ones.
  { id: "small-islands", label: "The small islands", danish: "de danske småøer", part: null, lat: null, hint: "Ærø, Samsø, Fanø, Langeland, Endelave and the rest" },
];

export const targetById = (id) => DISCOVERY_TARGETS.find(t => t.id === id) || DISCOVERY_TARGETS[0];

// ── HOW MUCH IS PUBLISHED IN EACH ONE ───────────────────────────────
// Shown on the chip, so the choice is made against a number rather than a
// hunch. The latitude split is rough and that is fine for "is this thin":
// nobody needs to know whether a place is in Midtjylland or Nordjylland to
// see that one of them has two entries and the other has eleven.
//
// The small islands cannot be counted this way at all, because an island is
// not a latitude band, so that target reports null rather than a wrong number.
// A count that is quietly false is worse than no count.
export const coverageByTarget = (rows) => {
  const out = {};
  for (const t of DISCOVERY_TARGETS) {
    if (!t.part) { out[t.id] = null; continue; }
    out[t.id] = (Array.isArray(rows) ? rows : []).filter(r => {
      const p = r?.payload || r;
      if (partOfCountry(p) !== t.part) return false;
      if (!t.lat) return true;
      const lat = Number(p?.__lat);
      return Number.isFinite(lat) && t.lat(lat);
    }).length;
  }
  return out;
};

// ── THE FRAMING FOR A CHOSEN TARGET ─────────────────────────────────
// Replaces the computed gap line when a target is picked, and keeps every
// other instruction, because the Danish rule and the famous-is-a-disqualifier
// rule apply no matter where he is aiming.
//
// `town` is the free text box: "town-specific events perhaps". A named town
// beats a region, because he only types one when he already knows something.
export const framingForTarget = (targetId, rows, { typeLabel = "places", town = "" } = {}) => {
  const named = clean(town);
  const base = discoveryFraming(rows, { typeLabel });
  // Strip the computed gap paragraph, which is what an explicit choice overrides.
  const withoutGap = base.replace(/^COVERAGE GAP[\s\S]*?exists there\.\s*/m, "").trim();

  if (named) {
    return `SEARCH THIS PLACE AND ONLY THIS PLACE: ${named}. Every one of the five queries must name it. Include its Danish spelling exactly as Danes write it, with the real letters. Look for what is on there specifically, not what is on in the nearest big city, and do not substitute a better known place nearby if this one turns up little: returning three real results for ${named} is the answer, and five results for somewhere else is not.

${withoutGap}`;
  }

  const t = targetById(targetId);
  if (!t.part && t.id === "small-islands") {
    return `SEARCH THE SMALL DANISH ISLANDS. Not Zealand, not Funen, not Jutland, and not Bornholm: the small inhabited ones, ${t.hint}. Use the Danish collective term ${t.danish} as well as individual island names. These are the least written about places in the country in English and among the best covered in Danish, which is exactly the gap this guide exists to fill.

${withoutGap}`;
  }
  if (!t.part) return base; // "anywhere", so the computed gap stands

  return `SEARCH THIS REGION: ${t.label}, which Danes call ${t.danish}. Every one of the five queries must be aimed there, and the Danish ones must use ${t.danish} rather than the English name, because that is what local pages are written under. Name specific municipalities, islands or towns inside it rather than searching the region as one blob: ${t.hint}. Aarhus, Odense and Aalborg are the ${t.label} equivalents of Copenhagen here, so do not let them absorb more than one of the five queries.

${withoutGap}`;
};
