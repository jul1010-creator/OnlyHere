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
