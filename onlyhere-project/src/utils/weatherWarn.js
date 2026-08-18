// ── "SURELY IT'S ABLE TO GIVE SOME WARNINGS" ────────────────────────
//
// Oliver, 18 Aug 2026:
//
//   "And I feel like the weather is not properly implemented. It shows the
//    weather forecast, but nothing else. Surely it's able to give some
//    warnings+"
//
// He is right, and the reason is worse than a missing feature. The data was
// already being fetched and then dropped on the floor.
//
// api/weather.js asks MET Norway for every day of the trip and builds this per
// day:
//
//   { date, temperature_c, wind_speed_ms, condition, precipitation_mm }
//
// utils/weather.js then reduces that to { icon, temp, risk } and throws
// wind_speed_ms, precipitation_mm and the symbol code away. `risk` is a
// BOOLEAN — "wet" means 1mm or more — so the guide badge is structurally
// incapable of distinguishing 1mm of drizzle from 18mm and a gale, and the
// single most it can ever say is "· rain likely". That is not weather being
// under-implemented, it is four measurements per day being fetched, paid for
// (nothing, as it happens: MET Norway is free) and then deleted.
//
// ── AND THERE WAS WARNING CODE. IN THE WRONG PLACE, IN DANISH ────────
// api/weather.js does build a `warnings` array. Three things are wrong with it,
// and together they explain why he has never seen one:
//
//   1. It is computed from timeseries[0] — the CURRENT HOUR at that
//      coordinate. A guide is for a trip two to twenty six weeks out. The one
//      hour it describes is the one hour nobody is travelling in.
//   2. It is in Danish, keyed `type` and `detaljer`, for a product whose
//      reader-facing text is English.
//   3. Nothing on the guide path has ever read it. The only component that
//      renders it is WeatherStrip, which is Studio-side and pinned to fixed
//      city coordinates.
//
//   And a fourth, smaller and more embarrassing: its text says "Vindstød
//   omkring X m/s" — gusts of about X — while reading
//   `details.wind_speed`, which is the ten-minute MEAN. Gusts run well above
//   the mean. It named the wrong quantity.
//
// ── SO THE RULE FOR THIS FILE ───────────────────────────────────────
// Every warning here cites the number it came from, and nothing here invents a
// number. `measured` is not decoration for the UI: it is the evidence, it is
// what the assertions check, and a warning that cannot name its own
// measurement is a warning this file will not produce.
//
// The thresholds are Beaufort boundaries and a bridge operator's own published
// table, not numbers chosen for how they read. Where nothing has been checked —
// the Little Belt bridges, the Farø bridges — this file says NOTHING, rather
// than generalising from the one crossing it does have a fact about. An
// unwarned crossing is a gap. An invented threshold is a lie, and this product
// is built on the difference.
import { FORECAST, NORMALS } from "./weather";
import { travelModeKey } from "./routeOrder";

// ── WIND, IN BEAUFORT'S BOUNDARIES ──────────────────────────────────
// Not round numbers picked by eye. These are the lower bounds of Beaufort
// force 5, 6, 7 and 8 in metres per second, which is the scale Danish forecasts
// and Danish bridge operators both speak in — "frisk vind", "hård vind", "stiv
// kuling", "hård kuling". Using 10 and 15 instead would have been tidier and
// would have put the boundary in a place nobody else's warning sits at.
//
// MET Norway's wind_speed is a TEN MINUTE MEAN at 10 metres. Gusts run above
// it, often by half again. Nothing here claims a gust, because the compact
// endpoint api/weather.js calls does not carry one.
export const WIND_FRESH = 8.0;    // force 5 — whitecaps, an umbrella stops working
export const WIND_STRONG = 10.8;  // force 6 — hard work on a bike, all day
export const WIND_GALE = 13.9;    // force 7 — a bike is no longer transport
export const WIND_STORM = 17.2;   // force 8 — twigs off trees, coast unpleasant

// ── RAIN, AND WHAT THE NUMBER ACTUALLY MEASURES ─────────────────────
// api/weather.js takes precipitation_amount from next_6_hours at the timeseries
// point NEAREST MIDDAY. So this is millimetres in a six hour window around the
// middle of the day. It is NOT a daily total and no text here calls it one:
// "4mm around the middle of the day" is what was measured, and a day whose rain
// all falls at 4am reads as dry here, correctly, because that is what the
// number says.
export const RAIN_WET = 4;    // a coat is not enough, you want a hood
export const RAIN_HEAVY = 10; // the kind that decides the day for you

// ── TEMPERATURE ─────────────────────────────────────────────────────
// COLD_WET is the specifically Danish one. Nobody needs telling that -8° is
// cold. What catches people out is 4° with rain and wind, which is most of a
// Danish November and is genuinely worse to walk around in than -8° and dry.
export const COLD_WET_C = 6;
export const FROST_C = 0;
export const HARD_FROST_C = -5;
// DMI issues heat warnings from 28°. Denmark's average July high is around 22,
// so 28 is a real event here rather than a normal summer day, and warning at 25
// would fire on every good week in July and mean nothing.
export const HEAT_C = 28;

const num = (v) => {
  // null FIRST. Number(null) is 0, and 0 is a perfectly finite temperature, a
  // perfectly finite wind speed and a perfectly finite number of millimetres.
  // This project has now been bitten by that exact coercion four times — twice
  // in accommodation.js, once in provenance.js, once in weather.js's own
  // wetDayWords — and every one of them was a missing value silently becoming
  // a confident zero. Here it would report frost on days nobody measured.
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

// The symbol code is a MET Norway string like "lightrainshowers_day",
// "heavysleet", "fog", "snowandthunder". Substring matching is the documented
// way to read them: the vocabulary is fixed and the qualifiers are prefixes and
// suffixes on a small set of stems.
const symbol = (s) => String(s || "").toLowerCase();
const hasSnow = (s) => /snow/.test(symbol(s));
const hasSleet = (s) => /sleet/.test(symbol(s));
const hasFog = (s) => /fog/.test(symbol(s));
const hasThunder = (s) => /thunder/.test(symbol(s));

const SELF_POWERED = ["walk", "bike", "tent"];
const DRIVEN = ["car", "camper"];

// ── ONE WARNING ─────────────────────────────────────────────────────
// `level`: "warn" changes what somebody does today, "watch" changes what they
// pack. Two levels and not three, because a middle level is the one nobody
// reads and every warning drifts into it.
//
// `measured` is the number this came from, in the unit it was measured in. A
// warning with no measurement cannot be produced by this file, which is checked
// rather than intended: every branch below passes one.
const warn = (id, level, text, measured) => ({ id, level, text, measured });

// ── WHAT A FORECAST DAY IS WORTH SAYING ─────────────────────────────
// `day` is a badge from weather.js carrying the measurements this file needs
// (see carryMeasurements there for how they now survive the trip through
// dayWeather instead of being dropped).
//
// Mode matters and it is not a garnish. 12 m/s is a footnote in a car and the
// whole character of a day on a bike, and this app knows which one it is
// because the traveller said so. Handing a cyclist the same wind line as a
// driver is the mode-blind failure `returnLeg` was already caught making, where
// 85 km of cycling was called "a manageable half day".
export const forecastWarnings = (day, { mode = null } = {}) => {
  if (!day || day.source !== FORECAST) return [];
  const out = [];
  const wind = num(day.windMs);
  const temp = num(day.temp);
  const mm = num(day.rainMm);
  const sym = symbol(day.symbol);
  const m = travelModeKey(mode) || "";
  const selfPowered = SELF_POWERED.includes(m);
  const driven = DRIVEN.includes(m);

  if (Number.isFinite(wind)) {
    const ms = Math.round(wind * 10) / 10;
    if (wind >= WIND_STORM) {
      out.push(warn("wind-storm", "warn",
        selfPowered
          ? `Gale force wind, ${ms} m/s. This is not a day to cycle or walk a coastline — move the outdoor part of it if you can.`
          : `Gale force wind, ${ms} m/s. Exposed coast and open bridges are unpleasant, and ferries start cancelling around this strength.`,
        { windMs: ms }));
    } else if (wind >= WIND_GALE) {
      out.push(warn("wind-gale", selfPowered ? "warn" : "watch",
        selfPowered
          ? `${ms} m/s of wind. On a bike this is the day, not a detail — expect to be slower than the plan says in whichever direction is into it.`
          : `${ms} m/s of wind. Worth knowing before an exposed walk or a coastal viewpoint.`,
        { windMs: ms }));
    } else if (wind >= WIND_STRONG && selfPowered) {
      out.push(warn("wind-strong", "watch",
        `${ms} m/s of wind — a headwind you will feel for the whole leg, not a breeze.`,
        { windMs: ms }));
    } else if (wind >= WIND_FRESH && selfPowered && Number.isFinite(mm) && mm >= RAIN_WET) {
      // Only together. 9 m/s alone is an ordinary Danish day and warning about
      // it would make this file noise; 9 m/s with rain in it is the difference
      // between a coat and a useless coat.
      out.push(warn("wind-rain", "watch",
        `${ms} m/s of wind with ${Math.round(mm * 10) / 10}mm of rain in it, so an umbrella will not survive the day.`,
        { windMs: ms, rainMm: Math.round(mm * 10) / 10 }));
    }
  }

  if (Number.isFinite(mm) && mm >= RAIN_WET) {
    const shown = Math.round(mm * 10) / 10;
    // "around the middle of the day", every time, because that is the window
    // the number came from. See RAIN_WET above.
    out.push(mm >= RAIN_HEAVY
      ? warn("rain-heavy", "warn", `${shown}mm of rain around the middle of the day. That is enough to decide the day for you — worth having the indoor stop ready.`, { rainMm: shown })
      : warn("rain", "watch", `${shown}mm of rain around the middle of the day.`, { rainMm: shown }));
  }

  // The Danish one. Deliberately its own line rather than folded into the rain
  // warning, because the pair is the thing: either number alone is ordinary.
  if (Number.isFinite(temp) && temp <= COLD_WET_C && ((Number.isFinite(mm) && mm >= 1) || day.risk === "high")) {
    const wetMm = Number.isFinite(mm) ? Math.round(mm * 10) / 10 : null;
    // BOTH numbers in the sentence when both were measured, because both are in
    // `measured` and a warning whose evidence and wording disagree is worse than
    // no warning: it looks checked. The suite asserts that agreement across every
    // rule in this file rather than trusting it rule by rule.
    //
    // When the wet vote came from the three-source merge rather than from MET's
    // millimetres there IS no mm figure, so the sentence says "wet" and `measured`
    // carries nothing it did not state.
    out.push(warn("cold-wet", "warn",
      `${Math.round(temp)}° and ${wetMm === null ? "wet" : `${wetMm}mm of rain around the middle of the day`}. Colder days are easier than this one — it is the combination that gets people, and cotton is the wrong answer to it.`,
      wetMm === null ? { tempC: Math.round(temp) } : { tempC: Math.round(temp), rainMm: wetMm }));
  }

  if (Number.isFinite(temp)) {
    if (temp <= HARD_FROST_C) {
      out.push(warn("frost-hard", "warn", `${Math.round(temp)}° at midday, so well below freezing all day.`, { tempC: Math.round(temp) }));
    } else if (temp <= FROST_C) {
      out.push(warn("frost", selfPowered ? "warn" : "watch",
        selfPowered
          ? `${Math.round(temp)}° at midday. Cycle paths ice up at this temperature and Danish ones are not all salted.`
          : `${Math.round(temp)}° at midday — around freezing.`,
        { tempC: Math.round(temp) }));
    } else if (temp >= HEAT_C) {
      out.push(warn("heat", "warn",
        `${Math.round(temp)}° — hot for Denmark, and shade is scarcer than you would expect on the coast and in the old town centres.`,
        { tempC: Math.round(temp) }));
    }
  }

  if (hasThunder(sym)) out.push(warn("thunder", "warn", "Thunder in the forecast for this day.", { symbol: sym }));
  if (hasSnow(sym) || hasSleet(sym)) {
    out.push(warn(hasSnow(sym) ? "snow" : "sleet", driven || selfPowered ? "warn" : "watch",
      `${hasSnow(sym) ? "Snow" : "Sleet"} in the forecast${driven ? ", so allow more than the stated driving times" : selfPowered ? ", which makes the surface the problem rather than the cold" : ""}.`,
      { symbol: sym }));
  }
  if (hasFog(sym)) {
    out.push(warn("fog", "watch",
      `Fog in the forecast. A viewpoint day is worth swapping with another day if the plan allows it.`,
      { symbol: sym }));
  }
  return out;
};

// ── AND WHAT A TEN YEAR AVERAGE IS WORTH SAYING ─────────────────────
// A different set of claims, and the wording carries the difference rather than
// a label doing it alone. Nothing here says "expect", nothing says "will", and
// nothing names a day of the week: this describes a time of year.
//
// There is also NO WIND WARNING on this path, and that is not an omission to be
// filled in later. The archive behind the normals — DMI's mean daily max, mean
// daily min and count of days over 1mm — carries no wind at all. A file whose
// rule is that every warning cites its measurement cannot warn about a quantity
// nobody measured.
export const normalsWarnings = (day) => {
  if (!day || day.source !== NORMALS) return [];
  const out = [];
  const hi = num(day.highC);
  const lo = num(day.lowC);
  const wetShare = num(day.wetShare);

  if (Number.isFinite(wetShare) && wetShare >= 0.5) {
    // Carried as days-in-ten and not as the raw share, because days-in-ten is
    // what the sentence says and `measured` is the evidence FOR the sentence, not
    // a second unrelated figure beside it. weather.js's wetDayWords makes the
    // same presentation choice for the same reason: "0.62" is a number and "six
    // days in ten" is a decision about a coat. The raw share is still on the
    // badge for anything that wants it.
    const inTen = Math.round(wetShare * 10);
    out.push(warn("season-wet", "watch",
      `That week is normally wet more often than dry — about ${inTen} days in ten see rain. Plan the indoor half of the trip properly rather than as a fallback.`,
      { wetDaysInTen: inTen }));
  }
  if (Number.isFinite(hi) && hi <= 8) {
    out.push(warn("season-cold", "watch",
      `Normally only ${Math.round(hi)}° at the warmest point of the day then, so the middle of the day is the cold part of what you pack for, not the mild part.`,
      { highC: Math.round(hi) }));
  }
  if (Number.isFinite(lo) && lo <= FROST_C) {
    out.push(warn("season-frost", "watch",
      `Nights normally reach ${Math.round(lo)}° then.`,
      { lowC: Math.round(lo) }));
  }
  if (Number.isFinite(hi) && hi >= 24) {
    out.push(warn("season-warm", "watch",
      `Normally around ${Math.round(hi)}° in the afternoon then — warm for Denmark, and worth booking anything with a garden or a harbour early.`,
      { highC: Math.round(hi) }));
  }
  return out;
};

// ── THE CROSSING ────────────────────────────────────────────────────
//
// The one warning here that changes a plan rather than a coat, and the only one
// that needs to know something about the trip.
//
// Denmark is islands, and a Zealand-to-Funen day has exactly one fixed road
// link: the Great Belt. Its own operator publishes what wind does to it, and
// the numbers below are theirs rather than mine
// (storebaelt.dk/en/traffic-weather/vehicles-and-vulnerability-to-wind,
// read 18 Aug 2026):
//
//   10–15 m/s   trailers under 750 kg restricted, limit drops to 110
//   15–20 m/s   trailers under 2.5 t restricted, limit drops to 90
//   20–25 m/s   limit drops to 70
//   over 25 m/s CLOSED to all vehicles
//
// Which makes this specifically a CAMPER warning, and this app has camper as a
// real travel mode with its own daily range. A caravan or a camper crossing the
// Great Belt in 16 m/s is the exact vehicle that table is about, and a driver
// who finds that out at the toll booth has lost the day.
//
// ── AND WHERE THIS FILE SAYS NOTHING ────────────────────────────────
// The Little Belt bridges between Funen and Jutland, and the Farø and
// Storstrøm bridges down to Lolland-Falster, get no warning. Not because they
// are never windy — because nothing has been checked about them, there are two
// Little Belt bridges so a closure behaves differently, and generalising the
// Great Belt's table onto a different structure would be inventing a number
// with a citation attached to it. That is the worse failure of the two, and it
// is the one this codebase exists to avoid.
export const GREAT_BELT_TRAILER_MS = 15;   // their "fresh gale" band begins
export const GREAT_BELT_CLOSED_MS = 25;    // their storm threshold, all vehicles

// Which crossing a move between two landmasses actually is. Returns "" for
// every pair with no verified fact behind it, including a pair that never moves.
export const beltCrossing = (fromPart, toPart) => {
  const a = String(fromPart || "").trim();
  const b = String(toPart || "").trim();
  if (!a || !b || a === b) return "";
  const pair = [a, b].sort().join("|");
  if (pair === "Funen|Zealand") return "great-belt";
  // Zealand to Jutland crosses BOTH belts and the Great Belt is the exposed
  // one, so it is the one named.
  if (pair === "Jutland|Zealand") return "great-belt";
  if (a === "Bornholm" || b === "Bornholm") return "bornholm-ferry";
  return "";
};

// Which day of the trip crosses what. `parts` is one landmass name per day, or
// null for a day nothing could be placed on, and the crossing belongs to the day
// the drive happens on — the END of day N, not the morning of day N+1, which is
// the same rule overnightMove already uses for where somebody sleeps.
//
// A null part breaks the chain rather than guessing through it. Two days either
// side of an unplaceable day are not evidence of a crossing: they are two days
// with a hole between them, and inventing the crossing in the hole is how a
// warning ends up on a trip that never leaves Jutland.
export const dayCrossings = (parts) => {
  const list = Array.isArray(parts) ? parts : [];
  const out = {};
  for (let i = 0; i < list.length - 1; i++) {
    const id = beltCrossing(list[i], list[i + 1]);
    if (id) out[i] = id;
  }
  return out;
};

export const crossingWarning = ({ crossing, windMs, mode = null } = {}) => {
  const wind = num(windMs);
  if (!crossing || !Number.isFinite(wind)) return null;
  const ms = Math.round(wind * 10) / 10;
  const m = travelModeKey(mode) || "";

  if (crossing === "bornholm-ferry") {
    // No threshold is stated because none has been checked for these
    // sailings. What is true without a number: it is the only way across, so a
    // cancellation is not a delay, it is the day.
    if (wind < WIND_GALE) return null;
    return warn("crossing-bornholm", "warn",
      `${ms} m/s of wind on a day that crosses to Bornholm. There is no bridge — the ferry is the whole plan, and strong wind cancels sailings. Check the operator the evening before rather than on the morning.`,
      { windMs: ms, crossing });
  }

  if (crossing !== "great-belt") return null;
  if (wind >= GREAT_BELT_CLOSED_MS) {
    return warn("crossing-closed", "warn",
      `${ms} m/s of wind on a day that crosses the Great Belt. Above 25 m/s the bridge closes to all vehicles, and this forecast is at that strength. Have the day without the crossing in it ready.`,
      { windMs: ms, crossing });
  }
  if (wind >= GREAT_BELT_TRAILER_MS) {
    const camper = m === "camper";
    return warn("crossing-restricted", camper ? "warn" : "watch",
      camper
        ? `${ms} m/s of wind on the day you cross the Great Belt. From 15 m/s the bridge restricts trailers and caravans and drops the speed limit, and a camper is exactly the vehicle those rules are written for. Check Storebælt's own traffic page before you set off.`
        : `${ms} m/s of wind on the day you cross the Great Belt. Restrictions on trailers and high-sided vehicles start at this strength; an ordinary car is fine but slower.`,
      { windMs: ms, crossing });
  }
  return null;
};

// ── EVERYTHING FOR ONE DAY, IN THE ORDER IT MATTERS ─────────────────
// Sorted so a UI that shows only the first one shows the one worth showing.
// "warn" before "watch", and within a level the order the rules produced, which
// runs wind, then rain, then temperature, then what the sky is doing — roughly
// the order in which a thing ruins a day.
export const dayWarnings = (day, { mode = null, crossing = "" } = {}) => {
  if (!day) return [];
  const base = day.source === NORMALS ? normalsWarnings(day) : forecastWarnings(day, { mode });
  const cross = day.source === FORECAST ? crossingWarning({ crossing, windMs: day.windMs, mode }) : null;
  const all = cross ? [cross, ...base] : base;
  return all.filter(Boolean).sort((a, b) => (a.level === b.level ? 0 : a.level === "warn" ? -1 : 1));
};

// ── ONE LINE FOR THE WHOLE TRIP ─────────────────────────────────────
// The essentials card gets a sentence, not eleven chips. Deduplicated by rule
// id — five rainy days is one fact about the trip and five chips is a wall —
// and it names the days, because "rain at some point" is not something anybody
// can pack for.
//
// Returns "" rather than a filler line when nothing crossed a threshold. A
// "conditions look fine" sentence is the generic-filler failure the forecast
// note above it already refuses to commit.
export const tripWeatherWarning = (days, { mode = null, crossings = {} } = {}) => {
  const list = Array.isArray(days) ? days : [];
  const byId = new Map();
  list.forEach((day, i) => {
    dayWarnings(day, { mode, crossing: crossings[i] || "" }).forEach(w => {
      if (w.level !== "warn") return;         // the trip line carries only the ones that change a day
      const seen = byId.get(w.id);
      if (seen) { seen.days.push(i + 1); return; }
      byId.set(w.id, { ...w, days: [i + 1] });
    });
  });
  if (!byId.size) return "";
  // ── AND THERE IS NO SEASONAL BRANCH HERE ──────────────────────────
  // There was one, and it was dead code. It read "a normals warning is about a
  // week, not about Day 3, so it never gets a day number" — true, and
  // unreachable, because every seasonal rule above is a "watch" and this line
  // carries only "warn". Mutation testing proved it: replacing the branch with
  // `if (false)` changed no assertion, which is the signature of code nothing
  // runs.
  //
  // Deleted rather than propped up, the same call made about preferAffordable in
  // budgetFit.js on 17 Aug. Seasonal facts are not lost: they render as watch
  // chips on the day cards, and weather.js's normalsNote already carries the
  // trip-level sentence about a wet stretch, which is the one this branch would
  // have duplicated. If a seasonal rule is ever promoted to "warn", it will need
  // the day-number suppression written back — and the assertion that a seasonal
  // trip line carries no day number is in the suite waiting for it.
  const parts = [...byId.values()].map(w => {
    const d = w.days;
    const which = d.length === 1 ? `Day ${d[0]}` : `Days ${d.slice(0, -1).join(", ")} and ${d[d.length - 1]}`;
    return `${which}: ${w.text}`;
  });
  return parts.join(" ");
};
