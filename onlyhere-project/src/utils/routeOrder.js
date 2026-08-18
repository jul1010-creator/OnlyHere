// ── "THE ROUTE DOESN'T BECOME SILLY" ─────────────────────────────────
//
// Oliver, 15 Aug 2026, on a preview for a family landing at Billund: "Am I
// wrong, or is this route very akward? Is Ribe not under Billund?" And then the
// requirement, in one line: "the important thing is that the route doesn't
// become silly. That they follow a pattern that makes sense."
//
// He was not wrong. Measured on that run:
//
//   Billund -> Ribe       49 km
//   Billund -> Aarhus     83 km
//   Billund -> Aalborg   155 km
//
//   shown   Billund, Aarhus, Ribe, Aalborg    416 km
//   route   Billund, Ribe, Aarhus, Aalborg    279 km
//
// 137 km of driving, on a seven day trip, spent going back past the airport you
// started at and turning round again. And their brief had asked for "one base
// for the first half and another for the second", which the geography hands you
// for free: Billund and Ribe are 49 km apart, Aarhus and Aalborg are 101. Two
// clean bases, south then north. The list interleaved them.
//
// ── WHY IT HAPPENED, AND IT IS NOT A SORTING BUG ────────────────────
// previewMatch's region pass ranked on [tier, held content, interest, major
// city]. Aarhus beat Ribe because Aarhus is a major city holding three entries.
// That is a fact about the LIBRARY, not about this trip, and `held content` is
// worse than merely irrelevant here: it is a feedback loop. Aalborg already
// holds the most, so every entry published there pushes it further above the
// towns next to the airport, and researching more content makes the route worse
// rather than better.
//
// ── TWO SEPARATE QUESTIONS, KEPT SEPARATE ───────────────────────────
//   WHICH towns come back   still Gemlyx's editorial judgement, with distance
//                           as a tie-break under tier, so a "Can't miss" town
//                           is never dropped for being thirty km further
//   WHAT ORDER they show    travel order from where they land, which is the
//                           part he asked for
//
// Mixing those would mean a nearer town outranking a better one, which is the
// opposite mistake and just as easy to make.

const R = 6371;
const rad = (d) => (d * Math.PI) / 180;

// Straight line, not road distance. Deliberate: /api/directions gives real
// driving times and costs money and latency per pair, and ordering four towns
// would be twelve calls on a screen whose whole promise is that it is instant.
// A great circle is within a few percent of road distance across Denmark, which
// is flat and well connected, and it is exactly good enough to answer "does
// this order make sense". The finished guide measures the real legs.
export const haversineKm = (a, b) => {
  const [la1, lo1] = a || [], [la2, lo2] = b || [];
  if (![la1, lo1, la2, lo2].every(n => Number.isFinite(Number(n)))) return null;
  const dLa = rad(la2 - la1), dLo = rad(lo2 - lo1);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(dLo / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
};

// Towns store their coordinate as __lat/__lon (shapeForLive writes it, and
// liveContent reads it into TOWN_COORDS). An arrival carries plain lat/lon.
// Both shapes arrive here, so both are read.
export const coordsOf = (p) => {
  const la = Number(p?.__lat ?? p?.lat), lo = Number(p?.__lon ?? p?.lon);
  return Number.isFinite(la) && Number.isFinite(lo) ? [la, lo] : null;
};

export const kmBetween = (a, b) => haversineKm(coordsOf(a), coordsOf(b));

// ── HOW FAR IS TOO FAR DEPENDS ON HOW LONG THEY HAVE ────────────────
// 155 km from the airport is nothing on a seven day trip and most of a day on a
// two day one. Same principle as regionPickLimit, which already scales the
// NUMBER of towns by trip length; this scales the reach.
//
// Bands rather than raw distance, on purpose. Raw kilometres in the score would
// let a three km difference outrank Gemlyx's own editorial tier, which is the
// opposite mistake. Two towns both within comfortable reach score the same here
// and are separated by the terms underneath.
export const REACH_COMFORTABLE = 2;
export const REACH_STRETCH = 1;
export const REACH_FAR = 0;

// ── AND ON WHAT THEY ARE TRAVELLING IN ──────────────────────────────
// Oliver, 17 Aug 2026, on a guide built from "ferry into Aalborg, on a bicycle,
// tight backpacker, hidden gems":
//
//   "It gives me a random route." / "And then the route is even worse…"
//
// The picker offered him Billund, Copenhagen, Ribe and Esbjerg. Copenhagen is
// about 400 km from Aalborg. The reason nothing objected is written three lines
// above: "roughly an hour of Danish driving per day of trip". An hour of driving
// is 70 km and an hour of cycling is 15, and this function could not tell the
// difference, because it was never told which one he was doing.
//
// A DAY'S TRAVEL, BY MODE. Deliberately generous at the top of each: the number
// is what somebody CAN do in a day if the day is mostly travelling, not what is
// pleasant. The bike figure is the one that matters here and it sits just above
// the chat prompt's own rule for bike trips ("keep daily distances realistic,
// under ~50 km"), because this decides whether a place is offered at all and the
// day plan decides whether it is comfortable.
export const MODE_DAY_KM = {
  walk: 15,
  bike: 60,
  "public transport": 250,
  car: 300,
  camper: 250,
  tent: 60,
};

// The strings that reach this come from the intake chips and from free text, so
// they are folded rather than matched exactly: "🚲 Bike", "bicycle", "cycling"
// and "on a bike" are one answer.
//
// EVERY PATTERN IS BOUNDED, and the reason is a real Danish false positive:
// unbounded /car/ matches Carlsberg, and unbounded /bus/ matches Busted. This is
// handed free-form conversation text, so an unbounded pattern here would decide a
// traveller was driving because they mentioned a brewery.
//
// SLOWEST WINS ON A TIE. A message saying "we'll bring the bikes and take the
// train for the long bits" is a bike trip that uses trains, and getting that
// backwards is the expensive direction: reading a bike trip as a train trip puts
// Copenhagen back on a route out of Aalborg, while reading a train trip as a bike
// trip only offers less than it could.
// ── A NEGATED MODE IS NOT A MODE ─────────────────────────────────────
// Found 18 Aug 2026 by an adversarial review. "We have no car" returned "car" —
// the exact inversion, and the worst possible one, because it is the sentence
// somebody writes precisely to say they are NOT driving. Same for "we're not
// renting a car" and "without a car". A negation is stripped before anything is
// matched, so those sentences state no mode at all, which is the truth: knowing
// somebody has no car does not tell you whether they take trains or ride.
const NEGATED = /\b(?:no|not|without|don'?t|doesn'?t|won'?t|cannot|can'?t|never)\b[^.,;!?]{0,24}?\b(?:cars?|bikes?|bicycles?|trains?|buses|bus|driving|drive|renting|rent)\b/gi;

// And a few compounds that contain a mode word and are not about travelling. A car
// park is a place, a car museum is an attraction, a train station is a landmark as
// often as a departure.
// The plural and the possessive too: "car museums" is the sentence somebody
// actually writes, and the singular-only list missed it. And "walking distance" is
// a QUESTION about a hotel, not a statement about how a trip is travelled — it was
// filling the mode slot with "walk" and capping the offered towns at fifteen
// kilometres a day.
const NOT_TRAVEL = /\b(?:car parks?|carparks?|car museums?|bus museums?|train museums?|railway museums?|motor museums?|bike shops?|bicycle shops?|car hire desks?|car ferry terminals?|walking distance|walking tours?|bike rental shops?)\b/gi;

// Exported because tripBrief has to scrub the SAME text before it decides whether a
// sentence states a mode at all. Two copies of "no car is not a car" is two chances
// to disagree, and this one already shipped an inversion once.
export const withoutNonModes = (text) =>
  String(text || "").toLowerCase().replace(NEGATED, " ").replace(NOT_TRAVEL, " ");

export const travelModeKey = (mode) => {
  const t = withoutNonModes(mode);
  if (!t.trim()) return null;
  // SLOWEST FIRST, in speed order, which is what the rule below actually requires.
  // The first version listed bike before walk and camper before tent, so "mostly
  // walking, might rent bikes one day" planned at 60 km a day instead of 15 — the
  // expensive direction by this function's own argument. Found 18 Aug by review.
  if (/\b(?:walk\w*|on foot|hik\w*)\b/.test(t)) return "walk";
  if (/\b(?:tents?|camping)\b/.test(t)) return "tent";
  if (/\b(?:bicycles?|bikes?|biking|cycl\w*)\b/.test(t)) return "bike";
  if (/\b(?:trains?|buses|busses|bus|coach(?:es)?|public transport\w*|transit|rejseplan\w*|dsb)\b/.test(t)) return "public transport";
  if (/\b(?:campers?|campervans?|motorhomes?|caravans?)\b/.test(t)) return "camper";
  if (/\b(?:cars?|driv\w*|rental|rent a car|hire)\b/.test(t)) return "car";
  return null;
};

// How far out a place can sit and still be part of THIS trip. Half the days can
// go on getting there and getting back, which is already the generous reading.
export const modeReachKm = (days, mode) => {
  const key = travelModeKey(mode);
  const perDay = key ? MODE_DAY_KM[key] : null;
  if (!perDay) return null;                       // mode unknown: no extra ceiling
  const d = Number(days);
  const budget = Number.isFinite(d) && d > 0 ? d : 3;
  return (perDay * budget) / 2;
};

export const reachBand = (km, days, mode) => {
  if (km == null) return REACH_STRETCH;   // unknown is not far, and not near
  const d = Number(days);
  const budget = Number.isFinite(d) && d > 0 ? d : 3;
  // Roughly an hour of Danish driving per day of trip, capped so a fortnight
  // does not make the whole country "comfortable" and stop discriminating.
  let near = Math.min(90 + budget * 25, 260);
  let reach = Math.min(near * 2, 420);
  // The mode can only ever make this TIGHTER, never wider. A car does not make
  // Bornholm nearer than the existing curve says, and an unknown mode keeps
  // today's behaviour exactly, which is what stops this change from moving every
  // route in the product.
  const ceiling = modeReachKm(budget, mode);
  if (ceiling != null) {
    reach = Math.min(reach, ceiling);
    near = Math.min(near, ceiling / 2);
  }
  if (km <= near) return REACH_COMFORTABLE;
  if (km <= reach) return REACH_STRETCH;
  return REACH_FAR;
};

// ── AND FAR IS A REASON TO LEAVE IT OUT, NOT JUST TO RANK IT LOWER ──
// The band was only ever a sort key, so Copenhagen came LAST on a two day bicycle
// trip and was still offered. Sorting cannot fix "this is not possible".
//
// BUT IT MUST NOT EMPTY THE SCREEN. A two day bike trip out of Aalborg may have
// very little of ours inside 60 km, and a preview with nothing on it is a worse
// product than a preview with one honest stretch on it. So the out-of-reach ones
// are not deleted, they are demoted behind every reachable one and only used to
// top up: reachable first, always, and the far ones only if there is room left.
//
// `keepAtLeast` is what "room left" means, and the caller passes its own limit so
// this file does not need to know about regionPickLimit.
// The partition itself is general, because the same shape came up twice within the
// hour: "prefer the ones that pass, but never hand back an empty screen" is the
// rule for distance AND for a traveller's budget (see utils/budgetFit.js). One
// implementation, so the two cannot drift on the part that matters, which is what
// happens when there are not enough passing items.
export const preferPassing = (items, { keepAtLeast = 0, passes } = {}) => {
  const list = Array.isArray(items) ? items : [];
  if (typeof passes !== "function") return list;
  const good = [], rest = [];
  list.forEach(it => (passes(it) ? good : rest).push(it));
  // No early return for "enough good ones". There was one, and mutation testing
  // showed removing it changed no result: with good.length >= keepAtLeast the slice
  // below is slice(0, 0), which is empty, so the one expression already covers both
  // cases. It was reassurance rather than a guard.
  return [...good, ...rest.slice(0, Math.max(0, keepAtLeast - good.length))];
};

export const preferReachable = (items, { keepAtLeast = 0, bandOf } = {}) => {
  if (typeof bandOf !== "function") return Array.isArray(items) ? items : [];
  return preferPassing(items, { keepAtLeast, passes: (it) => bandOf(it) !== REACH_FAR });
};

// ── THE ORDER ───────────────────────────────────────────────────────
// An open path from where they land, not a loop. A loop assumes they fly home
// from the same airport and nothing in a brief says so, and guessing a return
// leg would pull the whole order toward the start for a reason nobody stated.
//
// Exact for six or fewer, which is every real case: REGION_TOWN_CAP is 6, so
// the worst case is 120 permutations and it costs nothing. Nearest neighbour
// above that, which is within a few percent on points this sparse and is the
// honest fallback rather than a wrong exact answer.
const EXACT_UP_TO = 6;

const permute = (list) => {
  if (list.length <= 1) return [list];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const rest = [...list.slice(0, i), ...list.slice(i + 1)];
    for (const p of permute(rest)) out.push([list[i], ...p]);
  }
  return out;
};

const seq = (order) => order.map(p => String(p?.name || "")).join("\u0000");

const pathKm = (start, order) => {
  let total = 0, at = start;
  for (const p of order) {
    const d = haversineKm(at, coordsOf(p));
    if (d == null) return Infinity;
    total += d;
    at = coordsOf(p);
  }
  return total;
};

// Returns { ordered, legs, totalKm, from }. `ordered` is always every place
// that came in, in a new array, with the ones carrying no coordinate at the end
// in Danish name order. A row with no coordinate must never be dropped and must
// never be able to make the answer arbitrary: that is the lesson byEventDate
// learned this afternoon, where one unparseable date scrambled thirteen good
// rows through a comparator that returned NaN.
export const routeOrder = (places, { from = null, compare = null } = {}) => {
  const list = (Array.isArray(places) ? places : []).filter(Boolean);
  const placed = list.filter(p => coordsOf(p));
  const unplaced = list.filter(p => !coordsOf(p));
  const byName = compare || ((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), "da"));
  unplaced.sort(byName);

  const start = coordsOf(from);
  // No anchor means no route. Saying so by leaving the order alone is honest;
  // inventing a start point would order the list around a place nobody named.
  if (!start || placed.length < 2) {
    const ordered = [...placed, ...unplaced];
    return { ordered, legs: [], totalKm: null, from: start ? from : null };
  }

  let best = null;
  if (placed.length <= EXACT_UP_TO) {
    for (const order of permute(placed)) {
      const km = pathKm(start, order);
      // ── A TIE MUST NOT BE DECIDED BY THE INPUT ORDER ──────────
      // Keeping the first permutation looked deterministic and was not: the
      // input arrives from the score sort, and two genuinely equidistant towns
      // then swapped depending on which the library happened to return first.
      // Caught by building a fixture with two towns 81 km either side of the
      // same airport, where feeding them in the two possible orders gave two
      // different routes. Broken on the name sequence instead, so one brief
      // always produces one route.
      if (best === null || km < best.km || (km === best.km && seq(order) < seq(best.order))) {
        best = { order, km };
      }
    }
  } else {
    const left = [...placed];
    const order = [];
    let at = start, km = 0;
    while (left.length) {
      let pick = 0, pickKm = Infinity;
      for (let i = 0; i < left.length; i++) {
        const d = haversineKm(at, coordsOf(left[i]));
        if (d != null && d < pickKm) { pickKm = d; pick = i; }
      }
      km += Number.isFinite(pickKm) ? pickKm : 0;
      at = coordsOf(left[pick]);
      order.push(left.splice(pick, 1)[0]);
    }
    best = { order, km };
  }

  const legs = [];
  let at = start, label = from?.name || "the start";
  for (const p of best.order) {
    legs.push({ from: label, to: p.name, km: haversineKm(at, coordsOf(p)) });
    at = coordsOf(p);
    label = p.name;
  }
  return { ordered: [...best.order, ...unplaced], legs, totalKm: best.km, from };
};

// ── AND THEN HOW DO THEY GET HOME ────────────────────────────────────
//
// A guide can end in Aalborg, five and a half hours from the airport it started
// at, and say nothing at all about it. The planner builds a path between the
// points a traveller named and never asks the last question, which is the one
// with a flight at the end of it.
//
// THIS DOES NOT CHANGE THE ORDER, and that is the whole design. The comment
// above routeOrder makes the case for an open path rather than a loop: a loop
// assumes they fly home from the same airport, nothing in a brief says so, and
// guessing a return leg would pull the whole order toward the start for a reason
// nobody stated. That reasoning is still right, and it is a reason not to
// REORDER. It was never a reason not to MEASURE.
//
// So the order stays exactly what it was and the distance home becomes a fact
// printed at the end, which a reader can act on and which costs them nothing if
// they are flying out of somewhere else.
//
// Straight line, like everything else in this file, and the reader is told so.
// Measuring it properly is a /api/directions call for a leg that is not part of
// the plan, and the honest version of "about 250 km, allow most of a day" beats a
// precise number for a journey nobody has committed to.
// `mode` added 18 Aug 2026 by an adversarial review: this printed "the journey home
// is a manageable half day at the end" over 84 km back to Aalborg on a trip whose
// stated mode was a bicycle — more than a full day of riding, called manageable, on
// a page whose promise is that nothing is asserted that nobody measured. The band
// was computed two-argument while overnightMove, written the same night, was given
// the mode. Absent mode leaves the previous wording exactly as it was.
export const returnLeg = ({ ordered = [], from = null, days = null, mode = null } = {}) => {
  const start = coordsOf(from);
  if (!start) return null;
  // The last place that HAS a coordinate, not the last place. routeOrder puts
  // rows it could not place at the end, and measuring from one of those would
  // silently answer a different question.
  const last = [...(Array.isArray(ordered) ? ordered : [])].reverse().find(p => coordsOf(p)) || null;
  if (!last) return null;
  const km = kmBetween(last, from);
  if (km == null) return null;
  return {
    from: String(last.name || ""),
    to: String(from.name || ""),
    km,
    band: reachBand(km, days, mode),
    // Carried so the sentence can be written in their own mode. Without it the
    // wording is a driver's wording, whatever the trip is.
    mode: travelModeKey(mode),
    // Ending where they started is not a return leg, it is no journey at all,
    // and a card saying "0 km back to Billund Airport" is noise.
    needed: km > 0,
  };
};

// The sentence, computed from the two numbers and never written by a model. Empty
// when there is nothing worth interrupting a reader for, which is the case this
// exists to distinguish: a trip ending at the airport it started from has no
// news, and one ending 250 km away has some.
export const describeReturn = (leg) => {
  if (!leg || !leg.needed) return "";
  const where = leg.to ? `back to ${leg.to}` : "back to where you landed";
  // ── AND "HALF A DAY" IS A DRIVER'S SENTENCE ────────────────────────
  // Found 18 Aug 2026 by an adversarial review. This printed "the journey home is
  // a manageable half day at the end" over 85 km back to Aalborg on a trip whose
  // stated mode was a bicycle. The band is defensible — one riding day out of
  // seven — but the WORDING is not: it names a duration, in a fixed phrase written
  // for somebody in a car, on the page whose promise is that nothing is asserted
  // that nobody measured. When the mode is known the hours are computed from it,
  // the same table describeOvernightMove uses; when it is not, the old sentence
  // stands unchanged.
  const kmh = leg.mode ? MODE_KMH[leg.mode] : null;
  if (kmh) {
    const hours = leg.km / kmh;
    const spoken = hours < 1.5 ? "under an hour and a half" : `${Math.round(hours)} hours`;
    const how = leg.mode === "public transport" ? "by train and bus" : leg.mode === "bike" ? "on a bike" : `by ${leg.mode}`;
    const weight = hours >= 5
      ? "That is a full day of travelling, so plan the last day around getting there rather than around anything else."
      : "Worth leaving real time for on your last day.";
    return `${leg.from} is about ${leg.km} km ${where}, roughly ${spoken} ${how}. ${weight}`;
  }
  if (leg.band === REACH_COMFORTABLE) {
    return `${leg.from} is about ${leg.km} km ${where}, so the journey home is a manageable half day at the end.`;
  }
  if (leg.band === REACH_STRETCH) {
    return `${leg.from} is about ${leg.km} km ${where}. Worth leaving real time for on your last day, or booking a flight out of somewhere closer.`;
  }
  return `${leg.from} is about ${leg.km} km ${where}, which is most of a day of travelling. If you are flying home from where you landed, plan the last day around getting there rather than around anything else.`;
};

// ── AND THE JOURNEY BETWEEN TWO DAYS ────────────────────────────────
//
// Oliver, 17 Aug 2026, on the guide his own conversation produced:
//
//   "The route is not true.. like the train and bus 2-3 minutes each???"
//   "And then the route is even worse…"
//
// The measured numbers on that page:
//
//   2 DAYS · 3 STOPS · 2 TOWNS · 92 KM OF TRAVEL
//   Your route: Aalborg → Skagen
//   Day 1  Arrival in Aalborg, 11:00
//   Day 2  North to Skagen, first stop 15:00
//
// Ninety-two kilometres between the end of one day and the start of the next, on a
// bicycle, and the page shows NOTHING between them. Not a bad estimate, not a
// wrong mode: no journey at all. Day 2 simply opens at three in the afternoon in a
// town five to six hours of riding away.
//
// The reason is one line in GuidePage: `const nextStop = day.stops[stopIdx + 1]`.
// A leg is the gap between two stops IN A DAY, so the largest journey in the whole
// trip was the one gap nothing was looking at. The stat bar counted the kilometres
// correctly and the itinerary never spent them.
//
// ── AND IT IS STATED AS AN ESTIMATE, BECAUSE IT IS ONE ──────────────
// Straight line, same as returnLeg above, and for the same reason: the measured
// road legs come from the Directions API per pair and this is a great circle. On a
// page where every other number is measured, an unmeasured one has to say so or it
// borrows a credibility it did not earn.
export const overnightMove = ({ from = null, to = null, fromName = "", toName = "", days = null, mode = null } = {}) => {
  const km = kmBetween(from, to);
  if (km == null || km < 1) return null;         // same place, or nothing to measure
  const key = travelModeKey(mode);
  const perDay = key ? MODE_DAY_KM[key] : null;
  return {
    km,
    mode: key,
    fromName: String(fromName || "").trim(),
    toName: String(toName || "").trim(),
    // Most of a day's travel, by the mode they actually stated. This is the test
    // that would have caught 92 km on a bicycle, and it is deliberately a fraction
    // rather than the whole day: a move that eats two thirds of the daylight is
    // the day, whatever the itinerary calls it.
    eatsTheDay: perDay != null && km >= perDay * (2 / 3),
    band: reachBand(km, days, mode),
    measured: false,
  };
};

// Hours, at the mode's own pace, and rounded the way somebody planning a morning
// rounds. Never minutes: a straight line quoted to the minute is a false precision
// and this is not a timetable.
const MODE_KMH = { walk: 4.5, bike: 15, "public transport": 60, car: 70, camper: 65, tent: 4.5 };

export const describeOvernightMove = (move) => {
  if (!move || !move.km) return "";
  const where = move.toName ? `to ${move.toName}` : "to the next day's first stop";
  const head = `About ${move.km} km ${where}`;
  const key = move.mode;
  const kmh = key ? MODE_KMH[key] : null;
  if (!kmh) {
    // No mode stated, so no duration is invented. The distance alone is still the
    // thing the page was missing.
    return `${head}. Worth planning the morning around, and worth knowing before you book anything.`;
  }
  const hours = move.km / kmh;
  const spoken = hours < 1.5 ? "under an hour and a half" : `${Math.round(hours)} hours`;
  const how = key === "public transport" ? "by train and bus" : key === "bike" ? "on a bike" : `by ${key}`;
  if (move.eatsTheDay) {
    return `${head}, roughly ${spoken} ${how}. That is most of a day of travelling, so this is the day rather than a transfer inside it.`;
  }
  return `${head}, roughly ${spoken} ${how}. Worth starting early enough that the first stop is not a rush.`;
};
