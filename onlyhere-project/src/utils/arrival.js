// ── WHERE THEY LAND, WHICH NOTHING HAS EVER READ ─────────────────────
//
// Oliver, 15 Aug 2026, on a preview for a family flying into Billund that came
// back with Aarhus above Ribe: "Am I wrong, or is this route very akward? Is
// Ribe not under Billund?"
//
// He was not wrong. Ribe is 49 km from Billund, Aarhus is 83 in the opposite
// direction, and the screen listed Aarhus first.
//
// ── THREE PARTS OF THE APP KNOW AND THE MATCHER DID NOT ─────────────
// The intake form's own placeholder reads "e.g. Billund Airport, Aarhus, or
// leave blank". The random-guide generator writes "We fly into Billund" into
// its own test briefs. The guide planner has a whole paragraph on it: "Billund
// is Jutland's real international airport and implies a totally different
// starting region than Copenhagen/Kastrup."
//
// utils/previewMatch.js mentioned a coordinate exactly once in the entire file,
// in a comment. So the planner downstream knew to start the trip in Jutland and
// the screen in front of it could not order four Jutland towns sensibly.
//
// Lifted into its own file so previewMatch.js and previewCoverage.js can both
// read it without one importing the other. Same reason saysWord moved this
// morning: two copies of "where do they land" would drift the first time either
// was touched.
import { foundAt } from "./danishNames";

// Coordinates are the airports themselves, so anything derived from them (the
// region a coverage finding names, the distance a route is ordered by) falls
// out of the position rather than being hand assigned in two places.
export const AIRPORTS = [
  { code: "CPH", name: "Copenhagen Airport", lat: 55.618, lon: 12.656, also: ["Kastrup", "Copenhagen airport", "Copenhagen", "CPH"] },
  { code: "BLL", name: "Billund Airport", lat: 55.740, lon: 9.152, also: ["Billund", "BLL"] },
  { code: "AAL", name: "Aalborg Airport", lat: 57.093, lon: 9.849, also: ["Aalborg airport", "Aalborg", "AAL"] },
  { code: "AAR", name: "Aarhus Airport", lat: 56.300, lon: 10.619, also: ["Aarhus airport", "Tirstrup", "Aarhus", "AAR"] },
  { code: "EBJ", name: "Esbjerg Airport", lat: 55.526, lon: 8.553, also: ["Esbjerg airport", "Esbjerg", "EBJ"] },
  { code: "RNN", name: "Bornholm Airport", lat: 55.063, lon: 14.760, also: ["Ronne airport", "Rønne airport", "RNN"] },
  { code: "SGD", name: "Sønderborg Airport", lat: 54.964, lon: 9.792, also: ["Sonderborg airport", "SGD"] },
];

// ── AN ARRIVAL CUE IS REQUIRED, AND THAT IS DELIBERATE ──────────────
// Half these airports are named after towns. "We skipped Billund" and "we do
// not want Billund" both contain an airport name and neither is an arrival, and
// reading one as an arrival anchors the whole route at the wrong end of the
// country. Same discipline as isDeparturePlace in previewMatch.js, which
// requires a leaving VERB rather than treating being somewhere as leaving it.
//
// ── AND THE BARE TOWN NAME IS A SPELLING, BECAUSE THE CUE IS THE
//     THING DOING THE WORK ─────────────────────────────────────────
// The first version left bare town names out and required the word "airport",
// on the reasoning that Aarhus Airport is at Tirstrup forty km from Aarhus. It
// was over-cautious in a way that broke the commonest phrasing there is:
// "We fly into Aalborg" silently returned no arrival, and the whole route went
// unanchored. Found by building a fixture rather than by reading the rule.
//
// The CUE already draws the line. "Three days in Aarhus" is a town because
// nothing in front of it says they landed there. "We fly into Aarhus" is an
// arrival because the traveller said so, and it does not matter that the runway
// is forty km away: they are starting the trip from that point either way.
//
// `into` on its own is deliberately NOT a cue. "We want to go into Aarhus" is
// not an arrival, and every real phrasing pairs it with a verb that is listed.
const ARRIVAL_CUE = /\b(?:fly(?:ing)?\s+into|flies\s+into|fly\s+in\s+to|land(?:ing|s)?\s+(?:at|in|into)|arriv(?:e|ing|es)\s+(?:at|in|into)|we\s+land|touch\s+down\s+(?:at|in))\s*$/i;
const NEAR = 42;   // characters before the name that the cue may sit in

// ── AND NOT EVERYBODY FLIES ─────────────────────────────────────────
//
// Oliver's report, 15 Aug 2026: "We are coming up by train from Hamburg." No
// airport in the brief, so arrivalPoint returned nothing, so the route went
// unanchored and the coverage finding could not name a region. And yet that
// sentence says exactly where they enter the country: a train from Hamburg
// crosses at Padborg and runs up through South Jutland.
//
// Denmark has four land and sea doors and they are not interchangeable. A
// traveller coming from Malmö starts on Zealand, one coming from Oslo lands in
// North Jutland, and one coming from Puttgarden arrives on Lolland. Guessing
// Copenhagen for all of them is the "don't assume a Copenhagen start" mistake
// the guide planner already warns about in its own prompt.
//
// The coordinate is the DANISH side of each crossing, not the foreign city, so
// everything downstream (the region a finding names, the distance a route is
// ordered by) is measured from where they actually stand in Denmark.
export const ENTRY_POINTS = [
  { code: "PAD", name: "the German border at Padborg", lat: 54.830, lon: 9.362,
    from: ["Hamburg", "Germany", "Flensburg", "Berlin", "Kiel", "Tyskland"] },
  { code: "ROD", name: "the Rødby ferry from Puttgarden", lat: 54.653, lon: 11.353,
    from: ["Puttgarden", "Fehmarn"] },
  { code: "ORE", name: "the Øresund bridge from Malmö", lat: 55.618, lon: 12.656,
    from: ["Malmo", "Malmö", "Sweden", "Stockholm", "Lund", "Sverige"] },
  { code: "HIR", name: "the Hirtshals ferry from Norway", lat: 57.588, lon: 9.960,
    from: ["Oslo", "Norway", "Larvik", "Kristiansand", "Stavanger", "Norge"] },
];

// A travelling cue, and then "from". "We are coming up by train from Hamburg"
// and "driving up from Germany" are arrivals; "we loved Hamburg last year" is
// not, and neither is "the pastries are better than in Sweden".
const OVERLAND_CUE = /\b(?:by\s+(?:train|car|bus|coach|ferry|road|rail)|driv(?:e|ing)|com(?:e|ing)\s+(?:up|down|over|across|in)|travell?ing|head(?:ing)?\s+(?:up|north)|take\s+the\s+(?:train|ferry|bus))[^.!?]{0,30}\bfrom\s+$/i;

// ── EVERY MENTION, AND THE TEXT THE INDICES BELONG TO ───────────────
// This read `fold(text).indexOf(...)` and then sliced the RAW text at that
// index, and it took the first occurrence only. One "Ærø" in the conversation,
// or one blank line, and "We land at Billund Airport" found no arrival at all.
// See foundAt in danishNames.js for the measurement. Both faults live in that
// one helper now, shared with isDeparturePlace and regionsNamed, which had
// written the same two lines and inherited the same two bugs.
const cuedMention = (text, spelling, cue, near) => {
  const { hay, at } = foundAt(text, spelling);
  return at.some(i => cue.test(hay.slice(Math.max(0, i - near), i)));
};


// ── A TRAVELLING VERB, THEN "INTO", THEN A CAPITALISED PLACE ─────────
// Narrow on purpose. "into" and "to" after a mode of travel is how somebody says
// where they land; a bare place name is not, and reading every capitalised word as
// an arrival is how a plan starts in the wrong half of the country. The mode is
// carried out with the name so the result can say HOW they arrive, which the
// return leg and the first day both want to know.
// ── AND "INTO", NOT "TO" ─────────────────────────────────────────────
// Found 18 Aug 2026 by an adversarial review, on the pass written hours earlier.
// The first version accepted `in|into|to|at`, and "to" is how people describe a
// journey INSIDE a trip:
//
//   "On day 3 we will take the bus to Skagen"     -> arrival: Skagen
//   "you could take the train to Ribe"            -> arrival: Ribe
//
// The second one is worse than the first, because it came out of GEMLYX'S OWN
// REPLY. The whole route order, the reach filter and the reader-facing distance
// badges were then anchored on a town Gemlyx had suggested and nobody had said
// they were arriving at — the exact mistake previewMatch.js documents for
// interests and themes, arriving through the arrival reader instead.
//
// "into" is the discriminator, and it is not a trick: English marks arrival at a
// destination with it. "Ferry into Aalborg" is where the trip begins; "bus to
// Skagen" is a leg of it. His own sentence used "into", which is why this pass
// exists at all. A trip that only ever says "to" gets no arrival, which is where
// this stood yesterday and is the safe direction.
const DANISH_ARRIVAL_RE = /\b(?:ferry|ferries|sail(?:ing)?|cruis(?:e|ing)|train|bus|coach|driv(?:e|ing)|flight|fly(?:ing)?)\b[^.!?]{0,24}?\binto\s+([A-ZÆØÅ][\wÆØÅæøå'’-]*(?:\s+[A-ZÆØÅ][\wÆØÅæøå'’-]*)?)/g;

const ARRIVAL_BY = [
  [/\b(?:ferry|ferries|sail|sailing|cruise|cruising)\b/i, "sea"],
  [/\b(?:flight|fly|flying)\b/i, "air"],
];

const danishArrivalMentions = (text) => {
  const out = [];
  const hay = String(text || "");
  for (const m of hay.matchAll(DANISH_ARRIVAL_RE)) {
    const name = String(m[1] || "").trim();
    if (!name) continue;
    const how = ARRIVAL_BY.find(([re]) => re.test(m[0]));
    out.push({ name, cue: how ? how[1] : "land" });
  }
  return out;
};

export const arrivalPoint = (convoText, { townPoint = null } = {}) => {
  const text = String(convoText || "");
  if (!text.trim()) return null;
  for (const air of AIRPORTS) {
    for (const spelling of [air.name, ...air.also]) {
      if (!cuedMention(text, spelling, ARRIVAL_CUE, NEAR)) continue;
      return { code: air.code, name: air.name, lat: air.lat, lon: air.lon, said: spelling, by: "air" };
    }
  }
  // Airports first, because a brief naming both ("fly into Billund, then the
  // train from Hamburg for the second week") means they LANDED at the airport.
  for (const door of ENTRY_POINTS) {
    for (const city of door.from) {
      if (!cuedMention(text, city, OVERLAND_CUE, 60)) continue;
      return { code: door.code, name: door.name, lat: door.lat, lon: door.lon, said: city, by: "land" };
    }
  }
  // ── AND A FERRY INTO A DANISH PORT IS AN ARRIVAL ──────────────────
  //
  // Oliver, 17 Aug 2026, first line of the conversation he sent back:
  //
  //   "I'm taking the ferry into Aalborg"
  //
  // and then, of the guide it produced: "It gives me a random route."
  //
  // This is the deepest cause of that, deeper than the reach filter or the mode.
  // The two passes above answer "which airport" and "which foreign city did you
  // come FROM", and his sentence is neither: a ferry arriving at a DANISH town.
  // So arrivalPoint returned null, `from` was null, and every piece of reasoning
  // in the product that starts from where they land stood down — the route order,
  // the reach band, the return leg. The route was not badly ordered. It had no
  // start.
  //
  // Third time this exact gap has turned up tonight, in three files: tripBrief's
  // ORIGIN_RE knew flying and driving but not sailing, the interests vocabulary
  // did not contain "hidden gems", and here. Denmark is reached by sea from
  // Norway, Sweden and Germany constantly, and the arrival that looks least like
  // Copenhagen is the one every reader of a sentence missed.
  //
  // THE COORDINATE IS LOOKED UP, NEVER INVENTED. `townPoint` is injected so this
  // file keeps no library of its own and cannot drift from the one the rest of the
  // app uses; with no resolver, or a town nobody has a coordinate for, this
  // returns null exactly as before rather than guessing a point.
  if (typeof townPoint === "function") {
    for (const { name, cue } of danishArrivalMentions(text)) {
      const pt = townPoint(name);
      if (!pt) continue;
      return { code: null, name, lat: pt.lat, lon: pt.lon, said: name, by: cue };
    }
  }
  return null;
};

// ── AND WHERE THE TRIP IS, WHICH IS NOT WHERE IT STARTS ──────────────
//
// Oliver, 21 Aug 2026, on a preview built from a chat whose first traveller
// sentence was "I am going to Aalborg, and I have 7 days to play with":
//
//   "Clearly the preview has NOTHING to do with the chat, at all. Because the
//    chat sounds somewhat reasonable. However the preview? Absolute made up
//    chaos."
//
// It offered Ribe, three hundred kilometres away, described as easy by public
// transport, and a Copenhagen Comic Con.
//
// Everything above this line reads an ARRIVAL: which airport, which foreign
// city they came from, which Danish port the ferry docked at. His sentence is
// none of those. He did not say how he gets to Denmark, he said where the trip
// IS, and the app has never had a reader for that. So arrivalPoint returned
// null, `from` was null in previewMatch, reachBand was never called, and the
// distance term in the town ranking scored a flat 1 for every candidate in the
// country. Ranking then collapsed to editorial tier, and a "Can't Miss Out"
// town wins from anywhere.
//
// Gemlyx even said the quiet part out loud in its own reply: "Since you haven't
// mentioned a starting point, I'll assume you're landing at Copenhagen Airport."
// It had to assume, because nothing was reading the town he had named in the
// sentence before.
//
// ── A DESTINATION IS AS GOOD AN ANCHOR AS AN ARRIVAL ─────────────────
// For every question this coordinate is used to answer (is that town a sane
// distance, which order do these towns go in, is this event near enough to be
// worth a ticket) it makes no difference whether they flew in or are already
// standing there. What matters is where they will be. So this returns the same
// shape arrivalPoint does and the caller can use either.
//
// ── AND THE CUE DOES THE WORK, EXACTLY AS ABOVE ──────────────────────
// The same discipline as ARRIVAL_CUE and the same reason. A bare capitalised
// word is not a destination: "We loved Ribe last year" and "is Skagen worth
// it?" both name a town and neither says the trip is there. And "to" on its own
// is the trap utils/arrival.js already documents, because "take the bus to
// Skagen" is a leg of a trip rather than the trip:
//
//   going to Aalborg           destination
//   heading to Skagen          destination
//   7 days in Aalborg          destination
//   staying in Aarhus          destination
//   we are in Copenhagen       destination, and the departure test may then
//                              mark it `_leaving`, which does not stop it being
//                              where they physically are
//   take the bus to Skagen     NOT a destination, no destination verb
//   the train to Ribe          NOT a destination, same
//
// TRAVELLER TEXT ONLY. This must never be handed the whole transcript. Gemlyx
// suggests places constantly, and "you could spend three days in Ribe" out of
// its own reply would anchor the entire trip on a town the app itself proposed.
// previewMatch.js holds this rule for interests and themes already, and the
// parameter is named to make a mistake visible at the call site.
const DESTINATION_CUE = new RegExp("(?:" + [
  // A destination verb, then "to". The verb is what separates "going to Ribe"
  // from "the bus to Ribe".
  /\b(?:go(?:ing)?|goes|head(?:ing|ed|s)?|off|travell?ing|flying up|driving up)\s+to/.source,
  // "a trip to Aalborg", "our holiday in Skagen"
  /\b(?:trip|trips|holiday|holidays|vacation|honeymoon)\s+(?:to|in)/.source,
  // "7 days in Aalborg", "a week in Ribe", "two nights in Aarhus"
  /\b(?:days?|nights?|weeks?|weekend|fortnight)\s+in/.source,
  // "staying in Aarhus", "based in Aalborg", "we are already in Copenhagen".
  // The adverb gap is not decoration: his own brief read "We are already in
  // Copenhagen and want to get out of the city", and one word between the verb
  // and the preposition is enough to lose the only town in the sentence.
  /\b(?:stay(?:ing)?|based|we(?:'re|’re| are)|i(?:'m|’m| am)|are)\s+(?:already\s+|currently\s+|now\s+)?in/.source,
  // "visiting Aalborg" needs no preposition, and the verb is unambiguous.
  /\bvisit(?:ing|s)?/.source,
].join("|") + ")\\s*$", "i");

const DESTINATION_NEAR = 34;   // characters before the name the cue may sit in

// Every capitalised run in the text, with the index it starts at, so the cue can
// be tested against what stands in front of it. Two words at most, which is the
// same shape DANISH_ARRIVAL_RE captures and covers every Danish town name that
// is not a sentence.
//
// ── AND NO LEADING \b, WHICH WOULD LOSE Æ, Ø AND Å ──────────────────
// Found by an adversarial pass. Without the `u` flag, \b is defined by ASCII
// \w, so there is no word boundary between a space and Æ: "going to Ærøskøbing"
// matched nothing, and neither did Århus or Ålborg, which are the declared
// spellings of two of the largest towns in the country (see danishNames.js).
// DANISH_ARRIVAL_RE above has no leading \b either, which is exactly why
// arrivals kept working while this did not.
//
// The boundary is enforced by looking at the character in front instead, which
// is a test this code was already doing anyway to read the cue.
const CAPITALISED = /[A-ZÆØÅ][\wÆØÅæøå'’-]*(?:\s+[A-ZÆØÅ][\wÆØÅæøå'’-]*)?/g;
const IS_LETTER = /[\wÆØÅæøå]/;

// THE COORDINATE IS LOOKED UP, NEVER INVENTED, exactly as in the ferry pass
// above. A capture nothing can resolve is skipped rather than guessed at, so a
// sentence about a person, a hotel or a country costs nothing.
export const destinationPoint = (travellerText, { townPoint = null } = {}) => {
  const text = String(travellerText || "");
  if (!text.trim() || typeof townPoint !== "function") return null;
  const all = destinationsNamed(text, { townPoint });
  return all.length ? all[0] : null;
};

// Every destination in the text, in the order they were said, deduped by name.
// A trip can honestly have two bases ("three days in Aarhus, then Skagen"), and
// a reach test that only knows the first one refuses the second half of the
// trip. The primary is still first, because that is the one a single-anchor
// caller wants.
export const destinationsNamed = (travellerText, { townPoint = null } = {}) => {
  const text = String(travellerText || "");
  if (!text.trim() || typeof townPoint !== "function") return [];
  const out = [];
  const seen = new Set();
  for (const m of text.matchAll(CAPITALISED)) {
    const name = String(m[0] || "").trim();
    if (!name) continue;
    // The boundary \b cannot express here: a capital in the middle of a word is
    // not the start of a name.
    if (m.index > 0 && IS_LETTER.test(text[m.index - 1])) continue;
    const before = text.slice(Math.max(0, m.index - DESTINATION_NEAR), m.index);
    if (!DESTINATION_CUE.test(before)) continue;
    // The two word capture is greedy, so "going to Aalborg Airport" arrives here
    // as one name. Both are tried, longest first, because the longer one is the
    // more specific answer when the resolver knows it.
    const tries = name.includes(" ") ? [name, name.split(/\s+/)[0]] : [name];
    for (const t of tries) {
      const key = t.toLowerCase();
      if (seen.has(key)) break;
      const pt = townPoint(t);
      if (!pt) continue;
      seen.add(key);
      out.push({ code: null, name: t, lat: pt.lat, lon: pt.lon, said: t, by: "destination" });
      break;
    }
  }
  return out;
};

// ── ONE ANSWER TO "WHERE IS THIS TRIP", FOR CALLERS THAT WANT ONE ────
// Arrival first, because a brief that says both ("we fly into Billund and spend
// the week in Ribe") has told us where they land and that is the point every
// journey is measured from on day one. A destination is the fallback, and it is
// the commoner sentence by far: most people say where they are going long
// before they say how they get there.
export const tripAnchor = (convoText, travellerText, { townPoint = null } = {}) =>
  arrivalPoint(convoText, { townPoint }) || destinationPoint(travellerText, { townPoint });
