// ── "990 DKK? THINK ABOUT GAS PRICES.. THAT NEEDS TO BE CALCULATED" ──
//
// Oliver, 24 Sep 2026, looking at a six day Jutland loop whose whole trip
// figure read "from 990 DKK" with "Not in it: meals, the car and 2 nights
// with no room price found" underneath it.
//
// He is right, and the car is the worst of the three to leave out. A meal is a
// choice and a room is a choice, and a traveller knows they will be paying for
// both. The fuel to drive a route the guide itself chose is not a choice: the
// plan put Ribe on day 5 and Aarhus on day 6, and the 129 km between them get
// burned whatever anybody decides. Leaving it out of the estimate makes the
// one unavoidable cost the one cost nobody mentions.
//
// ── WHAT THIS FILE MAY AND MAY NOT KNOW ─────────────────────────────
//
// Two figures decide a fuel cost and neither is derivable from a map: what the
// car drinks, and what the pump charges. Both are looked up, both are stored
// with the day they were checked and the page they came off, and both are
// exported so the Studio can show him how old they are. That is the same
// standard a cheap gem is held to, and a fuel figure is a price like any
// other: see utils/cheapGems.js.
//
// GEOGRAPHY STAYS OUT, the way it does in accommodation.js and founderNotes.js.
// This file is handed kilometres. It has no library, no geocoder and no
// opinion about where Ribe is.
import { ROUTE_FACTOR } from "./guideEnrichment";

// ── WHAT THE PUMP CHARGES ───────────────────────────────────────────
//
// detkoster.dk publishes a national average across the major chains, updated
// every morning from the chains' own APIs, so it is an OBSERVED street price
// rather than a posted list price. That is the right one: a list price is what
// a sign says and a street price is what comes off the card.
//
// CHECKED AGAINST A SECOND SOURCE AND THEY DISAGREE, which is said here rather
// than hidden. fuel-prices.eu put Denmark at about 2.56 EUR for petrol on 14
// September, near 19 DKK, against detkoster's 17.83 for the same week. Roughly
// seven per cent apart, and nothing found settles which basket each is
// averaging. detkoster is used because it says what it measures and where it
// gets it; the disagreement is the reason the number below is rounded rather
// than carried to the øre.
//
// PETROL AND NOT DIESEL. A visitor drives what the rental desk hands them and
// that is overwhelmingly petrol, and the two are close enough this month that
// picking the wrong one moves a six day trip by a few tens of kroner. Diesel
// is stored beside it so a later intake question can use it without a second
// lookup. Worth knowing when reading these: detkoster's own page says diesel
// normally sits 0.50 to 1.50 below petrol here, and right now it is above, so
// this pair is not the usual shape and should not be assumed to hold.
export const FUEL_PRICE = {
  petrol95: 17.8,
  diesel: 18.6,
  checkedAt: "2026-09-24",
  source: "https://www.detkoster.dk/benzin",
  says: "National average across the major chains, read off their own daily feeds.",
};

// ── AND WHAT THE CAR DRINKS ─────────────────────────────────────────
//
// Danmarks Statistik: new petrol cars registered in Denmark in 2025 came in at
// 4.78 litres per 100 km under WLTP. That is the official test figure and it
// is not what a car uses on a road. The ICCT measures the gap across more than
// a million European cars and put it at 14 per cent for conventional cars in
// 2022, which takes 4.78 to about 5.45.
//
// 6.0 IS CHOSEN, NOT DERIVED, and the reasoning is the one ROUTE_FACTOR states
// a few files over: one adjustment on one average is not a study, so what
// matters is which way the error points.
//
// Two reasons it points up. The 4.78 is the average of cars registered NEW in
// a year when 69 per cent of new registrations were electric, so the petrol
// half of it is a shrinking slice skewed toward small hybrids, and it is not
// the car a family of four hires in Aarhus. And a traveller told fuel will
// cost less than it does is a traveller short of money at a pump on a Sunday
// in West Jutland, while one told it will cost more arrives with change. Those
// two mistakes are not equal.
export const FUEL_USE = {
  petrol95: 6.0,
  diesel: 5.5,
  checkedAt: "2026-09-24",
  source: "https://www.dst.dk/da/Statistik/udgivelser/NytHtml?cid=51537",
  says: "New Danish petrol cars ran 4.78 l/100km on the WLTP test in 2025, lifted for the real-world gap and rounded up.",
};

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };

// ── STRAIGHT LINE IS NOT A ROAD ─────────────────────────────────────
//
// Every distance printed on a guide day says so out loud: "The distance is
// straight line, the time is the real route." Fuel is burned on the road, so a
// straight line figure has to be lifted before it can be multiplied by
// anything. ROUTE_FACTOR.driving is 1.25 and is already the app's one answer
// to that question, imported rather than retyped so a change to it reaches
// here too.
//
// A leg that WAS measured by Directions needs no lifting at all, which is why
// this takes the two kinds apart rather than a single total. Google returns
// the real road distance on a measured leg, and inflating one would charge a
// traveller for a detour nobody drives.
export const roadKm = ({ measuredKm = 0, straightKm = 0 } = {}) => {
  const m = num(measuredKm) ?? 0;
  const s = num(straightKm) ?? 0;
  if (!m && !s) return null;
  return m + s * (ROUTE_FACTOR.driving ?? 1.25);
};

// Litres and kroner for a distance, or null when there is no distance to cost.
// `fuel` names which column of the two tables above to read, so a later intake
// question ("petrol or diesel?") changes one argument and nothing else.
export const fuelCost = ({ measuredKm = 0, straightKm = 0, fuel = "petrol95" } = {}) => {
  const km = roadKm({ measuredKm, straightKm });
  if (km == null || km <= 0) return null;
  const perHundred = FUEL_USE[fuel] ?? FUEL_USE.petrol95;
  const perLitre = FUEL_PRICE[fuel] ?? FUEL_PRICE.petrol95;
  const litres = (km * perHundred) / 100;
  return {
    km: Math.round(km),
    litres: Math.round(litres * 10) / 10,
    // Rounded to the nearest ten kroner. The inputs are a national average and
    // a chosen consumption figure, and printing 451 off those two would claim a
    // precision neither has. Same reason the guide never prints a fare to the
    // øre.
    kr: Math.round((litres * perLitre) / 10) * 10,
    fuel,
    perHundred,
    perLitre,
    checkedAt: FUEL_PRICE.checkedAt,
  };
};

// How stale the pair is, for the Studio rather than for a reader. A pump price
// is the fastest-moving figure in this app: a gem's discount can hold for a
// year and this one moves every morning.
export const FUEL_STALE_DAYS = 30;
export const fuelAge = (today = new Date()) => {
  const then = Date.parse(`${FUEL_PRICE.checkedAt}T00:00:00Z`);
  if (!Number.isFinite(then)) return null;
  const days = Math.floor((today.getTime() - then) / 86400000);
  return { days, stale: days > FUEL_STALE_DAYS };
};

// ── AND THE SENTENCE UNDER IT ───────────────────────────────────────
//
// Says what it assumed, because a reader whose car is a thirsty old estate has
// to be able to see WHY the figure is wrong for them and scale it themselves.
// A number with no assumptions printed is a number nobody can correct.
export const describeFuel = (cost, { today = new Date() } = {}) => {
  if (!cost) return "";
  const what = cost.fuel === "diesel" ? "diesel" : "petrol";
  // ── AND WHETHER THE PRICE IS STILL A PRICE ────────────────────────
  //
  // Every other figure in this app is checked once and holds for months: a
  // gem's discount, a museum's entry, a ferry's crossing time. A pump price is
  // not like those. It moves every morning, and a guide built in November off
  // a September average would state a figure with a date on it that nobody had
  // looked at since. So when it is past its window the sentence says so, and
  // says it to the reader rather than only to the Studio, because the reader is
  // the one standing at the pump.
  const age = fuelAge(today);
  const old = age?.stale
    ? ` That price was last checked ${age.days} days ago and fuel moves daily, so treat it as the shape of the cost rather than the cost.`
    : "";
  return `About ${cost.kr} DKK of ${what} for the ${cost.km} km this route drives, at ${cost.perHundred} l/100km and ${cost.perLitre} DKK a litre, the national average on ${cost.checkedAt}.${old} A bigger car or a heavier right foot costs more.`;
};


// ── AND THE DISTANCE THAT GETS BURNED ───────────────────────────────
//
// Oliver, 24 Sep 2026, on a six day Jutland loop whose whole trip figure read
// "from 990 DKK": "990 dkk? Think about gas prices.. that needs to be
// calculated."
//
// tripShape in pages/GuidePage.jsx answers a different question and answers it strictly: it
// withholds `km` entirely the moment ONE leg cannot be measured, because a
// headline stat that silently drops a leg is a lie about the shape of the
// trip. Both guides built that afternoon had a leg it could not place, so both
// printed no distance at all.
//
// A fuel figure wants the other stance, and it is the one estimateFrom already
// takes for tickets: a FLOOR. "At least this much petrol" off the legs we can
// measure is worth having and is never an overstatement, where silence is
// worth nothing. So this sums what is known, counts what is not, and hands
// both to the caller so the sentence can say which it is.
//
// MEASURED AND STRAIGHT LINE ARE KEPT APART, because only one of them needs
// lifting to a road distance. See roadKm in utils/fuel.js: Google returns the
// real road for a measured leg, and inflating one would charge a traveller for
// a detour nobody drives.
// The ways of getting around that burn fuel a traveller pays for by the litre.
// A camper does; a bus fare is a fare and is already its own cost line. Keyed
// on what travelModeKey returns, the same vocabulary MODE_DAY_KM uses.
export const DRIVEN_MODES = new Set(["car", "camper"]);

export const drivingLegs = (guide, legKm) => {
  const days = guide?.days || [];
  const stops = days.flatMap(d => d.stops || []).filter(s => s && s.name);
  const geo = guide?._geo || {};
  const durations = guide?._exactDurations || {};
  let measuredKm = 0, straightKm = 0, legs = 0, unknown = 0;
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i].name, b = stops[i + 1].name;
    // A measured leg carries Google's own road distance. Preferred over the
    // straight line for the same pair, never added to it.
    const hit = Object.keys(durations).find(k => k.startsWith(`${a}|${b}|`));
    const roadM = Number(durations[hit]?.distanceMeters);
    if (hit && Number.isFinite(roadM) && roadM > 0) { measuredKm += roadM / 1000; legs += 1; continue; }
    const d = legKm(a, b, geo);
    if (d == null) { unknown += 1; continue; }
    straightKm += d; legs += 1;
  }
  if (!legs) return null;
  return { measuredKm, straightKm, legs, unknown };
};
