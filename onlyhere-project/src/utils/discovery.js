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
import { monthsInText } from "./eventDates";
import { samePlaceName, fold, containsName } from "./danishNames";
import { KOMMUNER, K } from "../data/kommuner";
import { TOWN_COORDS } from "../data/towns";

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
  return (Array.isArray(existingNames) ? existingNames : []).some(n => {
    const have = clean(n);
    if (!have) return false;
    if (samePlaceName(have, want)) return true;
    // And a containment fallback for the everyday case a name list produces:
    // "Reffen" published, "Reffen Street Food" offered.
    //
    // containsName, not `.includes` on the folded strings. The plain version
    // read "Falster" as covered because "Als" is published, and "Furesø" as
    // covered because "Fur" is. Two real islands binned for sharing letters
    // with a shorter one. See the note on containsName in danishNames.js.
    return containsName(have, want) || containsName(want, have);
  });
};

// ── AND THE LIST VERSION, WHICH IS THE ONE THAT GETS CALLED ─────────
// isAlreadyCovered was written, tested, and then imported by nothing, while the
// discovery run kept calling a separate helper in helpers.js that folded Danish
// letters away entirely (normName deleted æ, ø and å outright, so "Ærø" became
// the single letter "r" and every candidate containing an r was thrown out).
// Two answers to one question, and the wrong one was wired up.
//
// So there is one now, and it returns the drops rather than swallowing them.
// The screen above this says "Never a silently shorter list" and it was only
// half true: the finished-edition drops were counted and these were not.
export const splitAlreadyCovered = (candidates, existingNames) => {
  const kept = [], dropped = [];
  (Array.isArray(candidates) ? candidates : []).forEach(c => {
    if (!c?.name) return;
    (isAlreadyCovered(c.name, existingNames) ? dropped : kept).push(c);
  });
  return { kept, dropped };
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
      // Same fallback as partOfCountry above it, and it has to be the same or the
      // two halves of this one filter disagree: the part would resolve off `lat`
      // and the latitude band would then read `undefined` and reject the row.
      const lat = Number(p?.__lat ?? p?.lat);
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

  // ── AND THIS SENTENCE NAMED ODENSE IN A SØNDERJYLLAND BRIEF ───────
  // It read "Aarhus, Odense and Aalborg are the ${t.label} equivalents of
  // Copenhagen here", from a fixed trio, whatever the region. For South Jutland
  // that is three towns none of which are in it, and one of them is the capital
  // of Funen, printed in a brief whose whole job is to keep the search out of
  // Funen. The instruction meant "do not let the biggest town eat the list",
  // which is true everywhere and needs no names to say.
  return `SEARCH THIS REGION: ${t.label}, which Danes call ${t.danish}. Every one of the five queries must be aimed there, and the Danish ones must use ${t.danish} rather than the English name, because that is what local pages are written under. Name specific municipalities, islands or towns inside it rather than searching the region as one blob: ${t.hint}. Whichever town inside ${t.label} is the biggest will have absorbed most of the English writing about the region, the way Copenhagen has for the country, so do not let any single town take more than one of the five queries. Nowhere outside ${t.label} counts, however good a find it is.

${withoutGap}`;
};

// ── "RIGHT NOW, IT'S FILLED WITH EVENTS IN AUGUST" ──────────────────
//
// Oliver, 16 August 2026, asking to search for events in a specific month.
//
// It is filled with August because it is August. The search returns what is
// current and splitFinishedCandidates correctly drops what has ended, so a button
// pressed today can only reach the next few weeks. Every Christmas market, every
// February light festival and the whole of spring is unreachable, and those are
// exactly the things worth writing up MONTHS before somebody travels.
//
// ── AND THE YEAR IS NOT A DETAIL ─────────────────────────────────────
// Asking for "December" in August means this December. Asking for "February"
// means NEXT February. Getting that wrong sends the search after an edition that
// has already happened, which is the one failure splitFinishedCandidates then
// silently cleans up, so the run comes back empty and nothing says why.
export const DISCOVERY_MONTHS = [
  { id: "any", label: "Any month", month: null, danish: "" },
  { id: "jan", label: "January", month: 0, danish: "januar" },
  { id: "feb", label: "February", month: 1, danish: "februar" },
  { id: "mar", label: "March", month: 2, danish: "marts" },
  { id: "apr", label: "April", month: 3, danish: "april" },
  { id: "may", label: "May", month: 4, danish: "maj" },
  { id: "jun", label: "June", month: 5, danish: "juni" },
  { id: "jul", label: "July", month: 6, danish: "juli" },
  { id: "aug", label: "August", month: 7, danish: "august" },
  { id: "sep", label: "September", month: 8, danish: "september" },
  { id: "oct", label: "October", month: 9, danish: "oktober" },
  { id: "nov", label: "November", month: 10, danish: "november" },
  { id: "dec", label: "December", month: 11, danish: "december" },
];

export const monthById = (id) => DISCOVERY_MONTHS.find(m => m.id === id) || DISCOVERY_MONTHS[0];

// The next occurrence of that month, so December asked for in August is this year
// and February is next. `today` is a parameter for the reason every date helper in
// this codebase takes one: a function that reads the clock cannot be tested
// against a fixed calendar.
export const yearForMonth = (month, today = new Date()) => {
  // null BEFORE Number(), because Number(null) is 0 and 0 is January. The
  // no-month choice would have come back as "next January", which is the same
  // trap as new Date(null) landing on the epoch: an absent value coerced into a
  // real one and then treated as a measurement. Caught by the test on its first
  // run, on the one input the whole "Any month" option produces.
  if (month === null || month === undefined || month === "") return null;
  const m = Number(month);
  if (!Number.isInteger(m) || m < 0 || m > 11) return null;
  const now = today instanceof Date && Number.isFinite(today.getTime()) ? today : new Date();
  // The CURRENT month counts as now rather than a year away: asking for August on
  // 16 August means the edition running this week.
  return m >= now.getMonth() ? now.getFullYear() : now.getFullYear() + 1;
};

// Appended to the brief, in Danish as well as English, for the reason the rest of
// this file gives at length: a Danish what's-on page is where a Danish event first
// appears in writing, and it is filed under "julemarked", not "Christmas market".
export const framingForMonth = (monthId, today = new Date()) => {
  const m = monthById(monthId);
  if (m.month === null) return "";
  const year = yearForMonth(m.month, today);
  const now = today instanceof Date ? today : new Date();
  const soon = m.month === now.getMonth();
  return `\nAIM EVERY QUERY AT ONE MONTH: ${m.label} ${year}. Not the next few weeks, ${m.label} ${year} specifically, and say the month and the year in the queries themselves. Use the Danish month name ${m.danish} in the Danish ones, because a Danish what's-on page files it under ${m.danish} and under ${year}, never under the English name. ${soon ? `That month is the one running now, so the current edition is the right one.` : `That month has not happened yet, so anything you find describing a ${m.label} edition that has already finished is the WRONG YEAR: look for ${year}, and if a source only describes an earlier edition, say the name and let the research pass confirm the new dates rather than reporting the old ones.`} Seasonal wording reaches this better than a date does: for a winter month try julemarked, juletræstænding, lysfest, vinterbadning; for spring, forårsmarked, påske; for late summer, høstmarked, æblefestival. An event that runs all year is not an answer to this question.`;
};

// ── AND THE THIRD DETERMINISTIC FILTER, FOR THE THIRD TIME ──────────
//
// The month goes in the brief above, and a brief is not a filter. That sentence
// has now been written three times in this one file: splitAlreadyCovered,
// splitFinishedCandidates, splitOffTarget. This is the fourth, and by now it is
// the default rather than a lesson.
//
// It reads the candidate's OWN stated dates, the way splitOffTarget reads its own
// stated region. The extraction prompt is asked for a `when` for exactly this, and
// a candidate that names no month is KEPT: not knowing when something runs is not
// evidence it runs at the wrong time, which is the discipline every other check
// here follows.
export const splitOffMonth = (candidates, monthId) => {
  const m = monthById(monthId);
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (m.month === null) return { kept: list, dropped: [] };
  const kept = [], dropped = [];
  for (const c of list) {
    const said = clean(c?.when || c?.dates || "");
    const months = monthsInText(said);
    // A range naming several months counts if the wanted one is among them: "late
    // November to 23 December" is a December answer.
    if (!months.length || months.includes(m.month)) kept.push(c);
    else dropped.push({ ...c, _saidMonths: months.map(i => DISCOVERY_MONTHS[i + 1].label) });
  }
  return { kept, dropped };
};

export const describeOffMonth = (dropped, monthId) => {
  const list = Array.isArray(dropped) ? dropped.filter(Boolean) : [];
  if (!list.length) return "";
  const m = monthById(monthId);
  const when = [...new Set(list.flatMap(d => d._saidMonths || []))];
  return `${list.length} ${list.length === 1 ? "was" : "were"} left out for running in a different month than ${m.label}${when.length ? `, by their own dates: ${when.join(", ")}` : ""}. The search was aimed at ${m.label} and answered with another month, which is worth knowing about the run rather than about the events.`;
};

// ── "BUT THIS IS NOT SOUTH JUTLAND" ─────────────────────────────────
//
// Oliver, 16 August 2026: "On the guide it told me that more content was needed
// for south jutland. I then clicked it.. but this is not south jutland."
//
// Seven candidates came back. Hindsgavl Halvøen, Odense Havnebad, the twelve
// Langeland art towers, Øhavsstien and De Vilde Heste are on FUNEN. Randers is
// East Jutland, 130 km north of the band. One of the seven said nothing about
// where it is. Not one was in Sønderjylland.
//
// EVERYTHING ABOVE THIS LINE IS A PROMPT. framingForTarget writes a clear
// instruction, a model turns it into five queries, a web search answers them,
// and a SECOND model reads that raw text and pulls names out of it. An
// instruction that has to survive two models and a search engine is not a
// filter, and this pass already knows that about itself twice over:
// splitAlreadyCovered exists because "do not include these" was in the prompt,
// and splitFinishedCandidates exists because "skip finished editions" was in the
// prompt. This is the third instance of one pattern, which is the count at which
// this codebase stops treating it as a coincidence.
//
// AND THE MODEL ALREADY TOLD US. The extraction prompt asks for "the
// town/region it's in", every candidate carries it, and the row prints it in
// grey next to the name. Six of the seven declared, in writing, on screen, a
// place that contradicts the ask. Nobody read the field.
//
// THE TEST IS THE TARGET'S OWN TEST. coverageByTarget already decides whether a
// PUBLISHED row is in a target: the part of the country must match, and the
// latitude band must hold. A candidate is measured the same way, off the same
// two fields, so the chip's count and this filter can never disagree about where
// a region is. That disagreement is the failure mode this file's neighbours have
// spent two days removing.
// A landmass named as a WHOLE TOKEN OR A TOKEN'S TAIL, which is a different
// rule from the one containsName enforces and deliberately so. "Nordjylland" is
// one token, so a whole-word test for "jylland" does not find it, and the whole
// point here is that Nordjylland, Sønderjylland and Midtjylland are all Jutland.
// A tail is safe for these three because nothing in Danish ends in "jylland" or
// "sjælland" except a name for part of Jutland or Zealand.
//
// The short ones stay EXACT, because a tail is exactly how this project got
// bitten before: "møn" folds to "mon", and "common", "Salomon" and "månen" all
// end in it. Nordfyn and Sydfyn are kommuner, so tier one below reaches them
// without needing "fyn" to match a tail.
const PART_TAILS = [["Jutland", ["jylland", "jutland"]], ["Zealand", ["sjaelland"]]];
const PART_EXACT = [
  ["Funen", ["fyn", "funen"]],
  ["Zealand", ["zealand"]],
  ["Bornholm", ["bornholm"]],
  ["Lolland-Falster", ["lolland", "falster", "mon"]],
];

const tokensOf = (text) => fold(text).replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);

// ── WHERE DOES A CANDIDATE SAY IT IS ────────────────────────────────
// Four tiers, most specific first, and null rather than a guess when none of
// them resolve. Null is the common and correct answer for a candidate whose
// region field the model left empty, and it must never be read as a refusal:
// "we could not place it" and "it is somewhere else" are different findings and
// only one of them is grounds for dropping a real result.
export const placeFromText = (text) => {
  const t = clean(text);
  if (!t) return null;
  // ONE: a kommune. It carries its own part, its own region and a point the
  // Danish address register guarantees is inside it, so this tier answers the
  // latitude band as well as the landmass.
  for (const r of KOMMUNER) {
    if (containsName(t, r[K.name])) {
      return { part: r[K.part], lat: r[K.lat], region: r[K.region], how: `${r[K.name]} Kommune` };
    }
  }
  // TWO: a town we hold a coordinate for, run through the same partOfCountry
  // every published row goes through.
  for (const [name, pair] of Object.entries(TOWN_COORDS)) {
    if (!containsName(t, name)) continue;
    const lat = Number(pair?.[0]), lon = Number(pair?.[1]);
    const part = partOfCountry({ __lat: lat, __lon: lon });
    if (part) return { part, lat, region: "", how: name };
  }
  // THREE and FOUR: a landmass, by name or by the tail of a region name. No
  // point, so a latitude band cannot be answered from here, and the caller
  // treats that as unmeasured rather than as a pass.
  const tokens = tokensOf(t);
  for (const [part, words] of PART_EXACT) {
    if (tokens.some(tok => words.includes(tok))) return { part, lat: null, region: "", how: part };
  }
  for (const [part, tails] of PART_TAILS) {
    if (tokens.some(tok => tails.some(tail => tok.endsWith(tail)))) return { part, lat: null, region: "", how: part };
  }
  return null;
};

// "fits", "elsewhere" or "unknown". Only "elsewhere" is a finding.
export const candidateFitsTarget = (candidate, targetId) => {
  const t = targetById(targetId);
  // "Wherever it is thinnest" makes no regional claim to break, and the small
  // islands are not a latitude band or a landmass, so neither is checkable here.
  // Saying so is better than inventing a verdict for them.
  if (!t.part) return { verdict: "unknown", where: "", target: t.label };
  const found = placeFromText(candidate?.region || candidate?.town || candidate?.location || "");
  if (!found) return { verdict: "unknown", where: "", target: t.label };
  if (found.part !== t.part) return { verdict: "elsewhere", where: found.how, target: t.label };
  if (!t.lat) return { verdict: "fits", where: found.how, target: t.label };
  // Same landmass, band untestable: Sønderjylland named as a bare region gives
  // Jutland and no point. Unmeasured, so it stays in the list.
  if (!Number.isFinite(found.lat)) return { verdict: "unknown", where: found.how, target: t.label };
  return { verdict: t.lat(found.lat) ? "fits" : "elsewhere", where: found.how, target: t.label };
};

// Hands back what it dropped, and WHY each one went, because the panel already
// promises a list is never silently shorter and a third reason needs its own
// sentence rather than being folded into one of the other two.
export const splitOffTarget = (candidates, targetId) => {
  const kept = [], dropped = [];
  for (const c of Array.isArray(candidates) ? candidates : []) {
    const v = candidateFitsTarget(c, targetId);
    if (v.verdict === "elsewhere") dropped.push({ ...c, _where: v.where, _target: v.target });
    else kept.push(c);
  }
  return { kept, dropped };
};

// The sentence the panel prints. Names the places it refused, because "3 were
// left out" invites the question this line exists to answer, and because a
// count on its own hides the case worth knowing about: the search returning
// nothing in the region at all.
export const describeOffTarget = (dropped, targetId) => {
  const list = Array.isArray(dropped) ? dropped.filter(Boolean) : [];
  if (!list.length) return "";
  const t = targetById(targetId);
  const where = [...new Set(list.map(d => clean(d._where)).filter(Boolean))];
  const named = where.length ? ` They are in ${where.length === 1 ? where[0] : `${where.slice(0, -1).join(", ")} and ${where[where.length - 1]}`}.` : "";
  return `${list.length} ${list.length === 1 ? "was" : "were"} left out for not being in ${t.label} at all.${named} The search was aimed there and answered somewhere else, which is worth knowing about the run rather than about the places.`;
};
