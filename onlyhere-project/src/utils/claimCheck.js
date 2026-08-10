// ── DOES THE ENTRY AGREE WITH ITSELF ABOUT DISTANCE AND TIME ────────
//
// Oliver, 10 Aug 2026, passing on a review of the pipeline: an entry claiming a
// 42 minute walk where the real walk is about 6.
//
// The advice was to check stated times against a routing API. The app already
// does that, and has since the guide pipeline was built: legDistanceKm,
// ROUTE_FACTOR, real Google Directions through fetchExactDurations, and a rule
// that withholds a figure rather than guessing one.
//
// It just does it in the wrong place for this bug. Every one of those checks
// operates on a guide LEG, a structured pair of stops with coordinates. The 42
// minutes was in a SENTENCE. entryAudit scans an entry's prose for dashes,
// filler, unqualified rankings, bare years, crossed costs and a malformed
// nearest-stop field, and for no claim about distance or time at all. So the
// one number in the paragraph that can be checked by arithmetic was the one
// number nothing looked at.
//
// ── WHAT THIS CAN CHECK WITHOUT ASKING ANYBODY ──────────────────────
// It needs no API and no coordinates, which is the point: it runs on every
// published entry, offline, for nothing.
//
// When a sentence states BOTH a distance and a duration for the same journey,
// those two numbers are a claim about speed, and speed is arithmetic. "A 42
// minute walk from the harbour, about 500 metres away" is not a matter of
// opinion. It is 500 metres at walking pace, which is six or seven minutes, and
// the sentence is wrong by a factor of six.
//
// SPEEDS COME FROM guideEnrichment, NEVER FROM A SECOND COPY. That module
// already owns walking pace, the circuity factor that turns a straight line
// into a real route, and the ceiling on what counts as a walk. A second set of
// speeds here would drift from it, and then the guide page and the audit would
// disagree about the same journey. One list, read twice.
import { estimateMinutes, WALK_MAX_MINUTES } from "./guideEnrichment";

// The modes a sentence names, mapped onto the modes the estimator knows.
const MODE_WORDS = [
  [/\b(walk|walking|on foot|by foot|stroll|strolling)\b/i, "walking"],
  [/\b(cycle|cycling|bike|biking|by bicycle)\b/i, "bicycling"],
  [/\b(drive|driving|by car|car ride)\b/i, "driving"],
  [/\b(train|bus|ferry|metro|transit|by rail)\b/i, "transit"],
];

const modeIn = (text) => {
  for (const [re, mode] of MODE_WORDS) if (re.test(text)) return mode;
  return null;
};

// ── READING A NUMBER OUT OF A SENTENCE ──────────────────────────────
// Ranges resolve to their MIDPOINT rather than their lower bound. "10 to 15
// minutes" against a distance is a claim centred on 12 or 13, and taking the
// low end would manufacture disagreements out of honest ranges, which is the
// fastest way to get a check like this switched off.
const num = (a, b) => (b == null ? Number(a) : (Number(a) + Number(b)) / 2);

const DURATION = /(\d+(?:[.,]\d+)?)\s*(?:to|-|–|—)?\s*(\d+(?:[.,]\d+)?)?\s*(hours?|hrs?|h|minutes?|mins?|min)\b/gi;
const DISTANCE = /(\d+(?:[.,]\d+)?)\s*(?:to|-|–|—)?\s*(\d+(?:[.,]\d+)?)?\s*(kilometres?|kilometers?|km|metres?|meters?|m)\b/gi;

const dec = (s) => Number(String(s).replace(",", "."));

export const durationsIn = (text) => {
  const out = [];
  const re = new RegExp(DURATION.source, "gi");   // fresh: a /g/ regex is stateful
  let m;
  while ((m = re.exec(String(text || ""))) !== null) {
    const unit = m[3].toLowerCase();
    const value = num(dec(m[1]), m[2] == null ? null : dec(m[2]));
    out.push({ minutes: /^h/.test(unit) ? value * 60 : value, at: m.index, raw: m[0] });
  }
  return out;
};

export const distancesIn = (text) => {
  const out = [];
  const re = new RegExp(DISTANCE.source, "gi");
  let m;
  while ((m = re.exec(String(text || ""))) !== null) {
    const unit = m[3].toLowerCase();
    const value = num(dec(m[1]), m[2] == null ? null : dec(m[2]));
    // A bare "m" is metres. Not stripped to zero and not assumed to be km: a
    // 500 km walk and a 500 m walk are different sentences.
    out.push({ km: /^k/.test(unit) ? value : value / 1000, at: m.index, raw: m[0] });
  }
  return out;
};

// One sentence is the unit, because two numbers in the same sentence are about
// the same journey and two numbers in different sentences usually are not.
// Splitting on paragraph would pair a distance in one line with a duration in
// the next and invent a contradiction between two correct statements.
const sentences = (text) => String(text || "").split(/(?<=[.!?])\s+/).filter(Boolean);

// How wrong is wrong. Generous on purpose, because the aim is to catch the 42
// against 6, not to argue about whether a walk is 11 or 14 minutes. Real routes
// bend, people stop, and an entry saying "about ten minutes" for an eight
// minute walk is being helpful rather than inaccurate.
export const TOLERANCE = 2.5;
// And a floor, because on very short journeys the ratio explodes for no real
// reason: a 2 minute estimate against a stated 5 is a factor of 2.5 and a
// difference nobody could notice.
export const MIN_GAP_MINUTES = 8;

// ── THE CHECK ───────────────────────────────────────────────────────
// Returns one finding per sentence that contradicts itself. An entry with
// nothing checkable returns nothing, and that is not the same as passing: see
// checkable() below, which is what lets a caller say "nothing to check here"
// instead of implying it was verified.
export const claimConflicts = (text) => {
  const out = [];
  sentences(text).forEach(s => {
    const mode = modeIn(s);
    if (!mode) return;                       // no mode named, no speed to check against
    const times = durationsIn(s);
    const dists = distancesIn(s);
    // Exactly one of each. Two distances and one time in a sentence is a
    // comparison ("400 m from the harbour and 2 km from the church"), and
    // guessing which one the duration belongs to would invent findings.
    if (times.length !== 1 || dists.length !== 1) return;
    const stated = times[0].minutes;
    const expected = estimateMinutes(dists[0].km, mode);
    if (expected == null || !(stated > 0)) return;
    const ratio = stated > expected ? stated / expected : expected / stated;
    if (ratio < TOLERANCE || Math.abs(stated - expected) < MIN_GAP_MINUTES) return;
    out.push({
      sentence: s.trim(),
      mode,
      statedMinutes: stated,
      statedKm: dists[0].km,
      expectedMinutes: expected,
      ratio: Math.round(ratio * 10) / 10,
      // Which of the two numbers is more likely to be the wrong one. Not a
      // certainty and not presented as one: a caller shows both and lets a
      // person decide, because either could be the typo.
      direction: stated > expected ? "time looks too long for the distance" : "time looks too short for the distance",
    });
  });
  return out;
};

// A walk nobody would call a walk. Separate from the conflict check because it
// needs only ONE number: an entry saying "a 90 minute walk" is suspect without
// any distance to compare it to, since past about twenty minutes a Dane would
// name a bus. Uses the ceiling the guide side already applies.
export const implausibleWalks = (text) =>
  sentences(text)
    .filter(s => modeIn(s) === "walking")
    .flatMap(s => durationsIn(s).map(d => ({ sentence: s.trim(), minutes: d.minutes })))
    .filter(d => d.minutes > WALK_MAX_MINUTES * 3);

// ── AND WHETHER THERE WAS ANYTHING TO CHECK ─────────────────────────
// The honest counterpart. Zero findings from an entry that stated no numbers is
// not a clean bill of health, and an audit that reports both the same way is
// telling a person something it does not know.
export const checkable = (text) =>
  sentences(text).some(s => modeIn(s) && durationsIn(s).length === 1 && distancesIn(s).length === 1);
