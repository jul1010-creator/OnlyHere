// ── "IT SHOULD HAVE RECALCULATED THE TRIP" ──────────────────────────
//
// Oliver, 19 Sep 2026, of his own guide 9vkdc564l13:
//
//   "the moment I said 'can I also go to Jutland?', it should have recalculated
//    the trip and realised that there probably wasn't time for Northern
//    Zealand. It should tell that to the user. And if the user then agree, then
//    the AI should remove Northern Zealand from its route."
//
// What happened instead was worse than ignoring him: Jutland was never put in
// the guide at all, so the app neither refused the request nor honoured it. The
// traveller asked a reasonable question about a 7 day trip and got a guide that
// behaved as though the question had not been asked.
//
// ── WHY THE QUESTION WAS INVISIBLE, AND WHY THAT WAS RIGHT ──────────
//
// previewMatch.regionsNamed strips question sentences before it reads regions,
// and it has to: on 19 Sep the preview screen offered Aalborg to a traveller
// whose only mention of the north was "is Aalborg worth it?". Asking about a
// place is not asking to be taken there, and a picker that cannot tell the
// difference fills a screen with things nobody requested.
//
// So this file reads the OTHER half. A question naming a region is not a request
// to plan it and it is not nothing either: it is a question about the shape of
// the trip, and the honest answer is usually arithmetic. Two readers, two jobs,
// and the distinction is the feature rather than a duplication.
//
// ── AND THE ANSWER IS MEASURED, NOT COMPOSED ────────────────────────
//
// Every figure here comes from something the app already holds. A region's
// position is the mean of the centres of the kommuner that define it, from
// data/kommuner.js, which is where regions.js already gets its borders, so
// nothing is a shape drawn by eye. The travel between two of them is
// estimateMinutes over kmBetween, the one km-to-time reader in the app, at the
// mode this traveller said they were using. The day a long journey costs is
// EATS_THE_DAY_MINUTES, which routeOrder.js already defends as the length of
// journey that takes a day off a trip.
//
// Nothing here decides what a traveller wants. It reports what the days will
// not hold, names the one region whose removal frees the most road, and says
// how much. The traveller answers.
import { KOMMUNER, K } from "../data/kommuner";
import { canonicalRegion, regionPart, regionOf, regionAt, REGION_NAMES } from "./regions";
import { PARTS_OF_COUNTRY } from "./sourcePolicy";
import { kmBetween, EATS_THE_DAY_MINUTES, travelModeKey, spokenDuration, routeOrder } from "./routeOrder";
import { estimateMinutes, GOOGLE_MODE, townPointFor } from "./guideEnrichment";
import { TOWN_COORDS } from "../data/towns";

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// ── WHERE A REGION IS ───────────────────────────────────────────────
//
// The mean of its kommune centres. A region here is a LIST OF KOMMUNER and
// regions.js is explicit about why ("a region border is a FACT and I should not
// be the one inventing it"), so its position is the same fact averaged rather
// than a second table of points that would drift from the first.
//
// A PART works the same way over every kommune on that landmass, which is what
// makes "can I also go to Jutland" answerable at all: the question names no
// town, and the middle of Jutland is the only honest reading of where it is.
const POINTS = new Map();
export const regionPoint = (name) => {
  const key = clean(name);
  if (!key) return null;
  if (POINTS.has(key)) return POINTS.get(key);
  const part = PARTS_OF_COUNTRY.includes(key) ? key : "";
  const region = part ? "" : canonicalRegion(key);
  let rows = [];
  if (part) rows = KOMMUNER.filter(r => r[K.part] === part);
  else if (region) rows = KOMMUNER.filter(r => r[K.region] === region);
  const point = rows.length
    ? {
        lat: rows.reduce((a, r) => a + r[K.lat], 0) / rows.length,
        lon: rows.reduce((a, r) => a + r[K.lon], 0) / rows.length,
      }
    : null;
  POINTS.set(key, point);
  return point;
};

// ── A REGION NAMED INSIDE A QUESTION ────────────────────────────────
//
// The mirror of regionsNamed, reading only what that one throws away. Whole
// word, because "also" contains Als and "New Zealand" is not Zealand, and both
// of those were real bugs in the other reader; the same variant list is used so
// the two cannot come to disagree about what naming a region means.
//
// A sentence counts as a question when it ends in a question mark or opens with
// an asking auxiliary. Danish and English both, because the traveller types in
// either and a Danish question is the same question.
const SENTENCES = /[^.!?]+[.!?]*/g;
const ASK_OPENERS = /^(?:can|could|would|will|should|may|might|is|are|do|does|did|what|where|how|which|kan|kunne|vil|ville|skal|er|hvad|hvor|hvordan|hvilke[nt]?|må)\b/i;
export const isAQuestion = (sentence) => {
  const s = clean(sentence);
  if (!s) return false;
  return /\?$/.test(s) || ASK_OPENERS.test(s);
};

const NAME_EDGE = "a-z\\u00e6\\u00f8\\u00e5\\u00c6\\u00d8\\u00c5";
const saysRegion = (text, name) => {
  const hay = clean(text).toLowerCase();
  const needle = clean(name).toLowerCase();
  if (!hay || !needle) return false;
  const re = new RegExp(`(?:^|[^${NAME_EDGE}])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![${NAME_EDGE}])`, "i");
  if (!re.test(hay)) return false;
  // "New Zealand" is not Zealand. regionsNamed learned this from a brief that
  // put six Sjælland towns on the screen for somebody reminiscing about a trip
  // to the other hemisphere.
  const at = hay.indexOf(needle);
  return !/\b(?:new|nya|nieuw|nouvelle)\s*$/i.test(hay.slice(Math.max(0, at - 24), at));
};

// Every spelling of a region, so a question typed as "North Zealand" and one
// typed as "Nordsjælland" are the same question. Built off canonicalRegion
// rather than a list here: it already holds every alias and it is what stores
// the canonical form everywhere else in the app.
const SPELLINGS = (() => {
  const out = new Map();
  for (const name of [...PARTS_OF_COUNTRY, ...REGION_NAMES]) out.set(name, new Set([name]));
  // The aliases are private to regions.js, so they are recovered the one way it
  // exposes them: anything that canonicalises to a region is a spelling of it.
  for (const guess of [
    "North Zealand", "Northern Zealand", "Nordsjaelland",
    "South Zealand", "Southern Zealand", "Sydsjælland",
    "West Zealand", "Central Zealand", "Vestsjælland", "Midtsjælland",
    "Greater Copenhagen", "Copenhagen area",
    "North Jutland", "Northern Jutland", "South Jutland", "Southern Jutland",
    "East Jutland", "Eastern Jutland", "West Jutland", "Western Jutland",
    "Central Jutland", "Mid Jutland", "South East Jutland", "South West Jutland",
  ]) {
    const canon = canonicalRegion(guess);
    if (canon && out.has(canon)) out.get(canon).add(guess);
  }
  return out;
})();

export const regionsAsked = (convoText) => {
  const asked = (String(convoText || "").match(SENTENCES) || []).filter(isAQuestion).join(" ");
  if (!clean(asked)) return [];
  const out = [];
  for (const [name, spellings] of SPELLINGS) {
    if ([...spellings].some(v => saysRegion(asked, v))) out.push(name);
  }
  // A part and one of its own regions asked in the same breath is one request
  // for the wider thing, which is what PARTS_OF_COUNTRY means.
  const parts = out.filter(r => PARTS_OF_COUNTRY.includes(r));
  return out.filter(r => PARTS_OF_COUNTRY.includes(r) || !parts.includes(regionPart(r)));
};

// ── WHICH REGIONS THE CONVERSATION IS ABOUT ─────────────────────────
//
// Before a guide exists there is no plan to read, and his question was asked in
// the chat: "the moment I said 'can I also go to Jutland?'". So the regions in
// play have to come out of what has been said, and they can, because by that
// point both sides have been naming places for several turns.
//
// TWO TABLES, BOTH REAL. A Danish town mostly shares its name with its kommune,
// and data/kommuner.js carries all 98 of them with the region each sits in, so
// "Hillerød" answers Nordsjælland and "Roskilde" answers Midt- og Vestsjælland
// without a table of towns written for this. TOWN_COORDS covers the rest, which
// is where the English exonyms live: "Copenhagen" is not a kommune name and
// København is.
//
// AND IT READS THE WHOLE CONVERSATION, both sides, deliberately. A place Gemlyx
// put forward and the traveller did not object to is in the trip as far as this
// question goes: the thing being measured is what the days are already spoken
// for, not who said it first. regionsNamed made the opposite choice for the
// opposite job and its comment says why, which is the distinction this file
// opened with.
// THE PLACES, NOT ONLY THEIR REGIONS, and the difference decides the answer.
// Measuring a detour between region centroids put North Zealand 32 km off the
// route and West Zealand 29, a three kilometre margin, which is not a basis for
// taking a day off somebody's holiday. The same measurement over the places
// actually named, Hillerød against Roskilde, is 38 against 25. A centroid is a
// mean of a whole region and the trip is in specific towns in it.
//
// So this returns the places with their coordinates and their region, and the
// region list is derived from it below. One reader, two answers, and they
// cannot come to disagree about which regions are in play.
export const spokenPlaces = (text) => {
  const said = clean(text);
  if (!said) return [];
  const out = [];
  const seen = new Set();
  const add = (name, lat, lon) => {
    const region = canonicalRegion(regionAt(lat, lon) || "");
    const key = `${region}|${clean(name).toLowerCase()}`;
    if (!region || seen.has(key)) return;
    seen.add(key);
    out.push({ name: clean(name), lat, lon, region });
  };
  for (const row of KOMMUNER) {
    if (saysRegion(said, row[K.name])) add(row[K.name], row[K.lat], row[K.lon]);
  }
  // The exonyms and the handful of towns whose kommune is named after something
  // else. townPointFor already folds the spellings, and regionAt measures the
  // region off the point rather than trusting a second label.
  for (const name of Object.keys(TOWN_COORDS)) {
    if (!saysRegion(said, name)) continue;
    const pt = townPointFor(name);
    if (pt) add(name, pt.lat, pt.lon);
  }
  return out;
};

export const regionsSpokenOf = (text) => {
  const out = [];
  for (const p of spokenPlaces(text)) if (!out.includes(p.region)) out.push(p.region);
  return out;
};

// The same reader over a built plan's stops, so the chat and the finished guide
// answer this question the same way. A stop with no coordinate is left out
// rather than guessed at, which is what keeps this quiet on a plan nothing has
// geocoded yet.
export const planPlaces = (stops, { pointFor = null } = {}) => {
  const out = [];
  for (const s of Array.isArray(stops) ? stops : []) {
    let lat = Number(s?.__lat ?? s?.lat), lon = Number(s?.__lon ?? s?.lon);
    // A guide's stops carry no coordinates of their own: the build keeps them in
    // a geo map keyed by name, and the town is what the stop itself says. So the
    // caller may hand in its own resolver, and the town is the fallback, because
    // a stop with no readable position at all must not silently count as being
    // in no region on a check that reports absence.
    if ((!Number.isFinite(lat) || !Number.isFinite(lon)) && typeof pointFor === "function") {
      const pt = pointFor(s) || null;
      lat = Number(pt?.lat); lon = Number(pt?.lon);
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      const pt = townPointFor(clean(s?.town) || clean(s?.name));
      if (!pt) continue;
      lat = pt.lat; lon = pt.lon;
    }
    const region = canonicalRegion(regionAt(lat, lon) || "");
    if (region) out.push({ name: clean(s?.name), lat, lon, region });
  }
  return out;
};

// ── "JUTLAND WASN'T EVEN INCLUDED IN THE GUIDE" ─────────────────────
//
// Oliver, 19 Sep 2026, the second half of the same message. He asked about a
// region and the finished guide contained nothing in it, and nothing anywhere
// in a 22 step build log said so. The question was neither refused nor honoured.
//
// This is the smallest true statement about that: a region the traveller asked
// about, and no stop in the finished plan inside it. It does not say what
// should have happened, because the right answer depends on the trade above and
// on what they said to it. It says the question went unanswered, which is the
// part that was invisible.
//
// A region already dropped by agreement is NOT absent by accident, so the
// caller passes what was agreed and it is excluded. Otherwise honouring the
// traveller's own decision would file a complaint about it.
export const regionsAskedButAbsent = (convoText, stops, { agreed = "", pointFor = null } = {}) => {
  const asked = regionsAsked(convoText);
  if (!asked.length) return [];
  const inPlan = planPlaces(stops, { pointFor });
  const drop = canonicalRegion(agreed);
  const covers = (want) => inPlan.some(p => p.region === want || regionPart(p.region) === want);
  return asked.filter(r => r !== drop && !covers(r));
};

// ── HOW LONG IT TAKES TO GET THERE ──────────────────────────────────
export const minutesBetweenRegions = (a, b, mode) => {
  const from = regionPoint(a), to = regionPoint(b);
  if (!from || !to) return null;
  const key = travelModeKey(mode) || "car";
  return estimateMinutes(kmBetween(from, to), GOOGLE_MODE[key] || "driving");
};

// The whole days a return trip out to a region costs, over and above the day
// spent there. EATS_THE_DAY_MINUTES is routeOrder's own figure for a journey
// that takes a day off a trip, and each direction is asked separately: a
// four hour hop out and four hours back is two days gone, not one.
export const travelDaysTo = (region, from, mode) => {
  const mins = minutesBetweenRegions(from, region, mode);
  if (mins == null) return 0;
  const oneWay = mins >= EATS_THE_DAY_MINUTES ? 1 : mins >= EATS_THE_DAY_MINUTES / 2 ? 0.5 : 0;
  return oneWay * 2;
};

// ── HOW FAR OUT OF THE WAY A REGION SITS ────────────────────────────
//
// The measurement that decides WHICH region to offer up, and the reason his
// answer was North Zealand rather than Roskilde. Once Jutland is on the route
// the trip runs west, and a region to the north is a detour off it. So: the
// road from the arrival point out to the newly asked region, through each
// region in the plan, and for each one the kilometres the route loses by
// leaving it out. The biggest saving is the region most out of the way.
//
// Nothing about this reasons from what a place is worth. It reasons about
// kilometres, which is the only thing this file can be certain about, and the
// traveller is told the number so they can disagree with the conclusion.
// THROUGH routeOrder, AND THE FIRST VERSION WAS NOT. It measured the path in
// whatever order the regions happened to be read out of the conversation, and
// on his own case that gave the wrong answer: it offered up Roskilde's region,
// which sits between Copenhagen and Jutland and is the one part of the trip
// that IS on the way. Removing a waypoint from an arbitrary order measures the
// order, not the detour. routeOrder solves the ordering exactly at this size
// and is the function the preview screen already uses to decide a route, so the
// two cannot come to disagree about what "out of the way" means.
//
// Found by running the function against his conversation rather than by reading
// it. Both answers looked reasonable on the page.
const asPlace = (r) => {
  const p = regionPoint(r);
  return p ? { name: r, lat: p.lat, lon: p.lon } : null;
};

// `stops` are the places on the route, each carrying the region it is in, plus
// the new region as a destination of its own. The detour of a region is the
// kilometres the whole route loses when every stop in it is left out.
//
// ROUTE ORDER IS SOLVED BOTH TIMES, so the comparison is between two best
// routes rather than between two orderings. routeOrder permutes exactly up to
// its own limit and falls back to nearest neighbour above it, which is the same
// behaviour the preview screen's route already has.
export const detourKmOf = (region, { from, stops = [] } = {}) => {
  const all = (Array.isArray(stops) ? stops : []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
  if (!from || all.length < 2) return null;
  const rest = all.filter(p => p.region !== region);
  if (!rest.length || rest.length === all.length) return null;
  const withIt = routeOrder(all, { from });
  const withoutIt = routeOrder(rest, { from });
  if (withIt.totalKm == null || withoutIt.totalKm == null) return null;
  const saved = withIt.totalKm - withoutIt.totalKm;
  return Number.isFinite(saved) ? Math.max(0, Math.round(saved)) : null;
};

// ── THE VERDICT ─────────────────────────────────────────────────────
//
// `days` is the trip's length, from tripEvents.tripDays, and it is the budget.
// Each region in play needs a day on the ground at the very least, and the
// journey out to the new one costs whatever it costs. When the sum is over the
// budget, something has to go, and this says which and by how much.
//
// IT REFUSES RATHER THAN GUESSES, in every case where the arithmetic is not
// there to do: no days, no mode, nothing asked, nothing in the plan, or a
// region whose point could not be read. A warning built on a missing number is
// the thing this app spends most of its code avoiding.
// ── AND A THIN MARGIN IS NOT AN ANSWER ──────────────────────────────
//
// Between two regions 32 km and 29 km off the route, naming one is a coin flip
// with a number printed beside it, and what it decides is which part of a
// family's week gets deleted. So a pick has to WIN: clear of the runner up by
// this much road and this share of it, or the conflict is reported with both
// named and the traveller chooses. Reporting a tie honestly is a feature, and
// dressing one up as a measurement is the failure this whole codebase is
// written against.
export const CLEAR_BY_KM = 12;
export const CLEAR_BY_SHARE = 1.25;

export const scopeConflict = ({ days = null, mode = "", from = null, inPlan = [], asked = [], stops = [] } = {}) => {
  const budget = Number(days);
  if (!Number.isFinite(budget) || budget < 1) return null;
  const want = (Array.isArray(asked) ? asked : []).filter(r => regionPoint(r));
  if (!want.length) return null;
  const have = (Array.isArray(inPlan) ? inPlan : []).filter(r => regionPoint(r));
  if (!have.length) return null;
  // Already in the plan is not a new request. Asking "can we also do Jutland"
  // on a trip that is already in Jutland is a question about the days, not about
  // the scope, and this file has nothing to say about it.
  const adding = want.filter(r => !have.includes(r) && !have.some(h => regionPart(h) === r));
  if (!adding.length) return null;
  const add = adding[0];

  const arrival = from && Number.isFinite(from.lat) && Number.isFinite(from.lon)
    ? from
    : regionPoint(have[0]);
  if (!arrival) return null;

  // ── WHAT IT COSTS, AND WHY THAT IS THE QUESTION ─────────────────
  //
  // The first version asked whether the new region FITS and stayed silent when
  // it did. Run against his own case, that was the wrong question and answered
  // nothing: seven days can hold Copenhagen, Roskilde, North Zealand and
  // Jutland, if Jutland is given three of the seven. So "it fits" was true and
  // useless, and he would have got the same silence he complained about.
  //
  // What he asked for is the arithmetic out loud: recalculate, say what it
  // costs, offer the trade. So the trigger is the COST and not impossibility. A
  // region whose road takes a day or more off the trip is a trade whatever the
  // total says, and one the days cannot hold at all is that same trade with a
  // harder number on it. Nothing here calls anything impossible on arithmetic
  // this rough.
  const travelDays = travelDaysTo(add, have[0], mode);
  const needed = have.length + 1 + travelDays;
  const overflows = needed > budget;
  if (!overflows && travelDays < 1) return null;

  // WHICH ONE GOES. Not the region they are arriving into, and not the one they
  // have just asked for: those two are the trip. Of the rest, the one whose
  // removal saves the most road once the new region is on the route.
  const arrivalRegion = canonicalRegion(regionOf(arrival) || "") || have[0];
  const droppable = have.filter(r => r !== arrivalRegion);
  if (!droppable.length) return null;
  // The route the detour is measured against: every stop that is NOT in the
  // arrival region, because that is where they start, plus the new region as a
  // destination. Real stops where the caller has them, and the region's own
  // centroid as the fallback, so this still answers on a conversation that has
  // named a region and no town in it.
  const named = (Array.isArray(stops) ? stops : []).filter(p => p?.region && p.region !== arrivalRegion);
  const byRegion = new Set(named.map(p => p.region));
  const route = [
    ...named,
    // A droppable region nobody named a place in still needs a point on the
    // route, or leaving it out would measure as costing nothing.
    ...droppable.filter(r => !byRegion.has(r)).map(r => { const pt = regionPoint(r); return pt ? { name: r, lat: pt.lat, lon: pt.lon, region: r } : null; }).filter(Boolean),
    ...(() => { const pt = regionPoint(add); return pt ? [{ name: add, lat: pt.lat, lon: pt.lon, region: add }] : []; })(),
  ];
  const scored = droppable
    .map(r => ({ region: r, km: detourKmOf(r, { from: arrival, stops: route }) }))
    .filter(x => x.km != null)
    .sort((a, b) => b.km - a.km || a.region.localeCompare(b.region));
  if (!scored.length) return null;

  // Does the top one win, or is this a tie being presented as a finding?
  const top = scored[0], next = scored[1] || null;
  const clear = !next || (top.km - next.km >= CLEAR_BY_KM && top.km >= next.km * CLEAR_BY_SHARE);
  const mins = minutesBetweenRegions(have[0], add, mode);
  return {
    add,
    drop: clear ? top.region : "",
    // Named either way, so the sentence can offer the choice rather than
    // inventing a winner, and so a reader of the log can see the margin.
    candidates: scored.map(x => ({ region: x.region, km: x.km })),
    detourKm: top.km,
    clear,
    keep: clear ? have.filter(r => r !== top.region) : have,
    days: budget,
    needed,
    travelDays,
    overflows,
    minutesEachWay: mins,
    // Days left for everything else once the new region is paid for. Negative
    // is the case the trip cannot hold at all.
    spare: Math.round((budget - needed) * 10) / 10,
  };
};

// ── AND IT SAYS SO, IN THE ONE PLACE A TRAVELLER IS LOOKING ─────────
//
// Written as a question, because it is one: the traveller decides. Every figure
// in it is one this file measured, so a traveller who thinks it is wrong has
// something to argue with rather than a verdict.
//
// No dash anywhere, and no "unfortunately". A trip that has to choose between
// two good regions is not bad news, it is a seven day trip in a country with
// more than seven days of things in it.
// AND IT IS WRITTEN AS AN INSTRUCTION, not as a finished sentence. Every other
// conflict in briefConflicts.js hands the model what to raise and lets it word
// the turn, which is what keeps a Danish conversation in Danish and stops the
// chat reading like two different products. The figures are fixed because they
// are measurements; the wording is not.
export const scopeWarning = (conflict, { spoken = spokenDuration } = {}) => {
  if (!conflict) return "";
  const each = conflict.minutesEachWay ? spoken(conflict.minutesEachWay) : "";
  const cost = each ? ` It is about ${each} each way from where they are based` : "";
  const road = conflict.travelDays >= 1
    ? `, so the road alone takes ${conflict.travelDays === 1 ? "a day" : `${conflict.travelDays} days`} out of their ${conflict.days}`
    : "";
  const tight = conflict.overflows
    ? ` On these dates that does not leave a day for each of the rest, so one of them has to come out.`
    : ` It fits, with about ${conflict.spare === 1 ? "one day" : `${conflict.spare} days`} spare, and only by giving ${conflict.add} most of that.`;
  const offer = conflict.clear
    ? `Offer to take ${conflict.drop} out and say why: once they are heading for ${conflict.add} it is the part furthest off the route, about ${conflict.detourKm} km of driving that stops being on the way. Say what stays: ${conflict.keep.join(" and ")}.`
    : `Do NOT pick for them. ${conflict.candidates.map(c => `${c.region} (${c.km} km off the route)`).join(" and ")} are within a few kilometres of each other, so there is no measured reason to prefer one. Name both and ask which they would rather keep.`;
  return `They have asked about ${conflict.add} on a trip that is already spoken for.${cost}${road}.${tight} `
    + `${offer} Ask before changing anything, and if they would rather keep everything as it is, leave ${conflict.add} for another trip and say so without arguing.`;
};

// ── AND WHETHER THEY SAID YES ───────────────────────────────────────
//
// Read narrowly and on purpose. This answer removes a region from somebody's
// holiday, so an ambiguous reply has to mean no: the cost of asking again is a
// sentence, and the cost of guessing wrong is a trip with the wrong half of it
// missing.
//
// A NEGATION ANYWHERE WINS, which is what makes "yes, but not North Zealand"
// and "no, keep it" both read as no rather than as the yes their first word
// suggests. Danish and English, because the traveller types in either.
const YES = /(?:^|[^a-zæøå])(?:yes|yeah|yep|sure|ok|okay|okey|do it|go ahead|sounds good|please do|that works|fine by me|agreed|deal|ja|jo|jep|okay|gerne|det lyder godt|gør det|goer det|ja tak)(?![a-zæøå])/i;
// `not` on its own is in this list because it was not, and "yes but not North
// Zealand" read as a yes, which would have deleted the very part of the trip
// that sentence was defending. Found by running the function rather than by
// reading it, which is the only way that one shows up.
const NO = /(?:^|[^a-zæøå])(?:no|nope|nah|not|don't|dont|doesn't|doesnt|cannot|keep|instead|prefer|rather|nej|ikke|behold|hellere|hverken)(?![a-zæøå])/i;

export const agreesToDrop = (said) => {
  const s = clean(said);
  if (!s) return false;
  if (NO.test(s)) return false;
  return YES.test(s);
};

// ── AND WHETHER THEY SAID YES TO THIS QUESTION ──────────────────────
//
// The answer only counts as an answer to THIS question. A traveller who typed
// "yes" three turns before the trade was put to them agreed to something else,
// and reading a whole conversation for a yes is how a region gets removed on
// the strength of a sentence about a hotel.
//
// So: find the reply that raised it, and read only what was said next. The
// assistant message carries `raised` for this, written beside `asked`, which
// the brief has used for the same purpose since August.
//
// AND THE REGION COMES OFF THAT MESSAGE, NOT OUT OF A SECOND CALCULATION. The
// reply that made the offer stamps what it offered, so what is removed is what
// the traveller agreed to. Measuring it again at build time would be a second
// answer to a question already settled, and the plan has changed by then, so
// the two could name different regions and the traveller would find the wrong
// half of their trip missing.
//
// THE KEY IS PASSED IN rather than named here: briefConflicts owns it, and a
// second copy of that string is the drift this file keeps warning about.
export const agreedDrop = (messages, key, { agrees = agreesToDrop } = {}) => {
  const list = Array.isArray(messages) ? messages : [];
  let at = -1;
  list.forEach((m, i) => {
    if (m?.role === "assistant" && (Array.isArray(m?.raised) ? m.raised : []).includes(key)) at = i;
  });
  if (at < 0) return "";
  const offered = clean(list[at]?.scopeOffer?.drop || "");
  if (!offered) return "";
  const after = list.slice(at + 1).filter(m => m?.role === "user").map(m => String(m?.text || ""));
  // The FIRST thing they said after being asked, not any of them. A later turn
  // about something else that happens to contain "ok" is not this answer, and a
  // traveller who said no and then carried on talking has still said no.
  if (!after.length || !agrees(after[0])) return "";
  return canonicalRegion(offered) || "";
};

// ── AND THEN IT IS DONE, WHICH IS THE HALF THAT WAS MISSING ─────────
//
// "then the AI should remove Northern Zealand from its route." A warning the
// traveller agrees with and nothing acts on is worse than no warning at all: it
// has asked them to make a decision and then overruled them.
//
// THE PLACES, NOT THE REGION. The app already has one way to keep somewhere out
// of a guide, and it is a good one: ruledOutFor feeds the plan prompt, the plan
// gate, the retry, the finished-guide audit and the swap gate on the page, all
// off one list. It matches on a stop's town or name, so a region name reaches
// none of it, and the towns are what a traveller recognises anyway: "I have
// taken out Hillerød and Helsingør" is an answer, and "I have taken out
// Nordsjælland" is a map reference.
//
// Only the places the conversation NAMED. Ruling out every kommune in the
// region would exclude a dozen towns nobody mentioned, including several that
// read as Copenhagen to anybody standing in them, and the excluded note printed
// back to the traveller would list places they had never heard suggested.
export const droppedPlaces = (text, region) => {
  const want = canonicalRegion(region);
  if (!want) return [];
  const out = [];
  for (const p of spokenPlaces(text)) {
    if (p.region === want && p.name && !out.includes(p.name)) out.push(p.name);
  }
  return out;
};
