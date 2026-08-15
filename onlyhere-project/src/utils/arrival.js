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
import { fold, containsName } from "./danishNames";

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

export const arrivalPoint = (convoText) => {
  const text = String(convoText || "");
  if (!text.trim()) return null;
  for (const air of AIRPORTS) {
    for (const spelling of [air.name, ...air.also]) {
      if (!containsName(text, spelling)) continue;
      const at = fold(text).indexOf(fold(spelling));
      if (at < 0) continue;
      const before = text.slice(Math.max(0, at - NEAR), at);
      if (!ARRIVAL_CUE.test(before)) continue;
      return { code: air.code, name: air.name, lat: air.lat, lon: air.lon, said: spelling, by: "air" };
    }
  }
  // Airports first, because a brief naming both ("fly into Billund, then the
  // train from Hamburg for the second week") means they LANDED at the airport.
  for (const door of ENTRY_POINTS) {
    for (const city of door.from) {
      if (!containsName(text, city)) continue;
      const at = fold(text).indexOf(fold(city));
      if (at < 0) continue;
      const before = text.slice(Math.max(0, at - 60), at);
      if (!OVERLAND_CUE.test(before)) continue;
      return { code: door.code, name: door.name, lat: door.lat, lon: door.lon, said: city, by: "land" };
    }
  }
  return null;
};
