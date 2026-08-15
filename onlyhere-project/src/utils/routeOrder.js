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

export const reachBand = (km, days) => {
  if (km == null) return REACH_STRETCH;   // unknown is not far, and not near
  const d = Number(days);
  const budget = Number.isFinite(d) && d > 0 ? d : 3;
  // Roughly an hour of Danish driving per day of trip, capped so a fortnight
  // does not make the whole country "comfortable" and stop discriminating.
  const near = Math.min(90 + budget * 25, 260);
  const reach = Math.min(near * 2, 420);
  if (km <= near) return REACH_COMFORTABLE;
  if (km <= reach) return REACH_STRETCH;
  return REACH_FAR;
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
