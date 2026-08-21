// ── "WE ARE ABLE TO PREDICT HOW THE WEATHER IS GONNA BE" ────────────
//
// Oliver, 9 Aug 2026: "weather icons need to be more prominent. I have two
// different weather APIs that are useful here."
//
// ── THE HOLE THIS FILE EXISTS TO CLOSE ──────────────────────────────
// Found while building it, and it is the kind that only appears when two
// correct changes meet. fetchGuideWeather ends with:
//
//   if (forecastIdx > 8) return;
//
// which is right: MET Norway forecasts about nine days and no further, and
// showing day 12 of a trip booked months out would be invention. But the guide
// arrival date now lands two to twenty six weeks ahead, because that was fixed
// an hour earlier in the same pass. So that guard, which used to fire almost
// never, now fires almost always, and the weather badge would have quietly
// disappeared from nearly every guide he built.
//
// ── A FORECAST AND A NORMAL ARE DIFFERENT CLAIMS ────────────────────
// The answer is not a longer forecast, because there is no such thing. Past
// about ten days the atmosphere is not predictable, and any site showing you a
// specific day in November is showing you a climate average with a sun icon on
// it. That is the actual dishonesty in most travel weather, and it is worth
// not copying.
//
// What IS knowable is what that place is normally like then, from recorded
// observations. "Odense is normally 8 to 13 degrees in early November and it
// rains about four days in ten" is a fact, it is checkable, and for somebody
// deciding what coat to pack in August it is more useful than a fake forecast
// would be.
//
// So the two sources answer two questions, and the UI must never let them look
// like the same one:
//   within nine days   MET Norway, a real forecast, says "forecast"
//   beyond that        Open-Meteo archive, ten years of observations,
//                      says "normally" and never once says forecast
//
// The label is not decoration. It is the difference between a promise this app
// can keep and one it cannot.

// THE NUMBER IS NOT ARBITRARY, AND IT IS HALF OF ONE DECISION. api/weather.js
// builds its daily buckets from MET Norway's timeseries, so this constant and
// that slice have to name the same horizon or a guide claims a forecastable day
// the API has no bucket for and dayWeather returns null: that is how a trip
// arriving exactly a week out once showed no weather at all.
//
// It was 6, because the slice was 7. Oliver, 15 Aug 2026, reading "too far out
// for a real forecast" and asking "Really? With all the APIs?" — and on a trip
// ten weeks out he had a point about the wording rather than the number, since
// nothing forecasts October in August. But six was wrong on its own terms:
// locationforecast 2.0 carries about ten days and we were slicing three of them
// off, so a trip nine days away was told no forecast existed for weather we had
// already been sent. Ten buckets, offsets 0 through 9.
export const FORECAST_HORIZON_DAYS = 9;

export const FORECAST = "forecast";
export const NORMALS = "normals";

// Which question can be answered for a day this far out. There is no third
// option: the archive covers any date, so something honest is always sayable.
export const weatherSourceFor = (daysOut) => {
  const n = Number(daysOut);
  if (!Number.isFinite(n) || n < 0) return NORMALS;
  return n <= FORECAST_HORIZON_DAYS ? FORECAST : NORMALS;
};

// ── HOW OFTEN IT RAINS, IN WORDS SOMEBODY PACKS BY ──────────────────
// A share between 0 and 1 of days in the window that saw 1mm or more. Phrased
// as days in ten because "0.38" is a number and "about four days in ten" is a
// decision about a coat.
export const wetDayWords = (share) => {
  // null FIRST, before Number(), because Number(null) is 0 and 0 is a perfectly
  // finite share meaning "it never rains". Caught by the test on its first run:
  // an unknown share was reporting "rain is rare then" about a place nobody had
  // any data for. Same trap as Number("") and Number([]), all of which are 0.
  if (share === null || share === undefined || share === "") return "";
  const s = Number(share);
  if (!Number.isFinite(s) || s < 0 || s > 1) return "";
  const inTen = Math.round(s * 10);
  if (inTen <= 0) return "rain is rare then";
  if (inTen === 1) return "about one day in ten sees rain";
  if (inTen >= 9) return "it rains most days then";
  return `about ${inTen} days in ten see rain`;
};

// The icon for a normal. Deliberately coarser than a forecast icon, because a
// ten year average has no weather in it: there is no "showers on Tuesday" in a
// climate normal, only a place that is warm and mostly dry or cold and often
// wet. A precise-looking icon would overstate what the number knows.
export const normalsIcon = ({ high_c, wet_day_share } = {}) => {
  const wet = Number(wet_day_share);
  const hi = Number(high_c);
  if (Number.isFinite(wet) && wet >= 0.5) return Number.isFinite(hi) && hi <= 2 ? "🌨️" : "🌧️";
  if (Number.isFinite(wet) && wet >= 0.3) return "🌦️";
  if (Number.isFinite(hi) && hi >= 20) return "☀️";
  return "⛅";
};

// ── THE SENTENCE ────────────────────────────────────────────────────
// Returns null rather than a partial sentence when the numbers are not there.
// A weather line missing its temperatures is worse than no weather line.
export const normalsLine = (n) => {
  if (!n || n.available === false) return null;
  const hi = Number(n.high_c), lo = Number(n.low_c);
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return null;
  const rain = wetDayWords(n.wet_day_share);
  // "Normally", never "expect", and never a day of the week. The wording is
  // the honesty: this describes a time of year, not a date.
  return `Normally ${lo}° to ${hi}°${rain ? `, and ${rain}` : ""}.`;
};

// What the badge carries, for either source, in one shape so the render site
// does not branch on which API answered.
// ── AND IT CARRIES WHAT WAS MEASURED, NOT JUST WHAT WAS DECIDED ─────
// Added 18 Aug 2026. Oliver: "it shows the weather forecast, but nothing else.
// Surely it's able to give some warnings+"
//
// The reason it could not was here. api/weather.js sends wind_speed_ms,
// precipitation_mm and a MET symbol code for every day, and this function
// reduced all three to `risk`, a BOOLEAN meaning "1mm or more". So 1mm of
// drizzle and 18mm with a gale behind it produced the identical badge, and the
// most any warning downstream could have said is the "rain likely" that was
// already there.
//
// `measured` is those numbers, passed through untouched in the units they
// arrived in. Nothing in this file interprets them — utils/weatherWarn.js does
// that, against Beaufort boundaries and a bridge operator's published table —
// and nothing in this file may invent one: an absent measurement stays absent,
// because null coerces to a confident zero and this project has been bitten by
// that four times.
export const weatherBadge = ({ source, forecast, normals, agreement, measured } = {}) => {
  if (source === FORECAST && forecast) {
    return {
      source: FORECAST,
      icon: forecast.icon,
      temp: forecast.temp,
      risk: forecast.risk,
      // The three MET measurements the warnings are built from. Undefined
      // rather than 0 when the API did not send one.
      windMs: measured?.windMs,
      rainMm: measured?.rainMm,
      symbol: measured?.symbol,
      // Shown on the badge itself. He could not tell before whether a number
      // was measured or assumed, and neither could a traveler.
      label: "forecast",
      // The agreement line replaces the bare "rain likely" when there is one,
      // because how much the models agree is the more useful of the two and
      // both on one badge is clutter.
      detail: agreement || (forecast.risk === "high" ? "rain likely" : ""),
      agreement: agreement || "",
    };
  }
  if (source === NORMALS && normals && normals.available !== false) {
    const line = normalsLine(normals);
    if (!line) return null;
    const hi = Number(normals.high_c), lo = Number(normals.low_c);
    return {
      source: NORMALS,
      icon: normalsIcon(normals),
      temp: Number.isFinite(hi) && Number.isFinite(lo) ? Math.round((hi + lo) / 2) : null,
      risk: Number(normals.wet_day_share) >= 0.5 ? "high" : "none",
      label: "typical",
      detail: line,
      // The real range, kept alongside the midpoint, so the trip note can
      // state what the badge states rather than re-deriving it wrongly.
      lowC: lo,
      highC: hi,
      // Carried for the same reason as the forecast measurements above:
      // normalsWarnings states "about N days in ten see rain" and has to cite
      // the share it read rather than re-deriving it from the risk boolean,
      // which has already thrown the number away.
      // The null check comes FIRST and it is not paranoia: api/weather.js ends
      // its normals with `wet_day_share: wets.length ? mean/days : null`, so a
      // place with no wet-day record sends a real null — and Number(null) is 0,
      // which is finite, and 0 is a share meaning IT NEVER RAINS THERE. Written
      // the coercion-last way this would have reported "rain is rare then"
      // about every town whose archive had no precipitation rows. Fifth time
      // this trap has come up in this codebase, second time in this file.
      wetShare: (normals.wet_day_share === null || normals.wet_day_share === undefined || normals.wet_day_share === ""
        || !Number.isFinite(Number(normals.wet_day_share))) ? undefined : Number(normals.wet_day_share),
      years: normals.years,
    };
  }
  return null;
};

// ── THE ESSENTIALS NOTE ─────────────────────────────────────────────
// One line for the whole trip. The existing forecast version names the rainy
// days by number, which only works when there is a forecast. This is the other
// half, and it says plainly that no forecast exists yet, because "we do not
// know" stated is far better than a confident icon that was never checked.
// ── AND IT LEADS WITH WHAT IT KNOWS ─────────────────────────────────
// Oliver, 15 Aug 2026: "Really? With all the APIs?", under a line whose first
// eleven words were an apology for not having a forecast. The apology was true
// and it was still the wrong thing to put first: he is holding a trip in late
// October read in mid-August, and no API on earth forecasts that. What this
// line knows is ten years of recorded October weather for those exact places,
// which is the fact somebody deciding what coat to pack wants.
//
// So the temperatures come first and the caveat comes after them, and three
// smaller things go with it:
//
//   "before you fly" is dropped. This guide's own transport note says he
//   arrives by train from Hamburg, and a weather line has no business assuming
//   an aeroplane. "before you leave" is true of every trip.
//
//   "a week before" was hardcoded next to a horizon of six days, so it was
//   wrong even then. It reads off FORECAST_HORIZON_DAYS now and cannot drift.
//
//   "on the days planned" claimed the whole trip while describing whichever
//   days resolved to a coordinate. On the guide he was reading that was two
//   days out of five. `totalDays` lets it say so.
// ── AND WHETHER IT KNOWS THE WEEK IT IS TALKING ABOUT ───────────────
//
// Oliver, 21 Aug 2026, on a guide titled "…in October": "I only said October.
// It didn't know when in October."
//
// The last sentence of this note said "ten years of recorded weather for this
// week", which is a precise claim about a week nobody had named. On a
// month-precision trip the figures ARE real, they are simply normals for a
// mid-month sample rather than for a week the traveller chose, and saying so
// costs one clause and keeps the sentence true.
//
// Defaulted to true so every existing caller keeps the sentence it had.
export const normalsNote = (badges, whenWords, totalDays = null, precise = true) => {
  const list = Array.isArray(badges) ? badges : [];
  const real = list.filter(b => b && b.source === NORMALS);
  if (!real.length) return null;
  // b.temp is the MIDPOINT of the normal range, not its high. Using it as the
  // range printed "expect 6° to 7°" directly under badges whose own line said
  // "Normally 3° to 8°": narrower and colder than the same data one line above.
  const lows = real.map(b => Number(b.lowC)).filter(Number.isFinite);
  const his = real.map(b => Number(b.highC)).filter(Number.isFinite);
  if (!lows.length || !his.length) return null;
  const lo = Math.min(...lows), hi = Math.max(...his);
  const wetDays = real.filter(b => b.risk === "high").length;
  const range = lo === hi ? `around ${lo}°` : `${lo}° to ${hi}°`;
  // list.length counts every day the trip has, including the ones that returned
  // no badge; real.length counts the ones this sentence is about.
  const total = Number(totalDays) || list.length || real.length;
  const scope = real.length >= total ? "on the days planned" : `on ${real.length} of your ${total} days`;
  const wet = wetDays
    ? `, and ${wetDays === real.length ? "every one of them falls" : `${wetDays} of them fall`} in a stretch that is wet more often than not`
    : "";
  const basis = precise
    ? "That is ten years of recorded weather for this week rather than a prediction, because nothing forecasts this far ahead."
    : `That is ten years of recorded weather for${whenWords ? ` ${whenWords}` : " that time of year"} rather than a prediction, and you have not said which days you are travelling, so it describes the month rather than your week. Name the dates and this gets sharper.`;
  return `${whenWords ? `In ${whenWords} you` : "You"} can expect ${range} ${scope}${wet}. ${basis} A real forecast appears here on its own about ${FORECAST_HORIZON_DAYS} days before you leave.`;
};

// ── "BOTH SHOULD BE ABLE TO SERVE A PURPOSE" ────────────────────────
//
// Oliver, 9 Aug 2026, on his OpenWeatherMap and WeatherAPI keys. They are both
// wired now, and what they buy is not a longer forecast. All three sources run
// out somewhere between nine and fourteen days, because that is where weather
// forecasting itself runs out.
//
// What three sources buy is AGREEMENT, which a single source can never offer.
// One model saying 14° sounds exactly as confident when it is about to be right
// as when it is about to be wrong. Three models within a degree of each other
// is evidence. Three models spread across six degrees is also evidence, of
// something different and worth saying out loud.
//
// So the merge does not pick a winner and it does not silently average away a
// disagreement. It reports the middle AND the spread, and the badge says when
// the spread is wide enough that the number should not be trusted.

// Above this, the sources are telling different stories about the same day.
// 3°C is chosen as roughly the point where it changes what somebody wears, not
// from any statistical property: two models a degree apart are agreeing, two
// models four degrees apart mean one of them has a front in a different place.
export const SPREAD_DISAGREES_C = 3;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// MEDIAN, not mean, and the reason matters with three sources: one provider
// having a bad day drags a mean and cannot move a median. With two sources they
// are the same thing, which is fine, and with one there is nothing to defend
// against anyway.
export const mergeForecasts = (sources, dateStr) => {
  const picked = [];
  for (const [id, series] of Object.entries(sources || {})) {
    if (!Array.isArray(series)) continue;
    const hit = series.find(d => d && d.date === dateStr);
    if (!hit || typeof hit.temp_c !== "number" || !Number.isFinite(hit.temp_c)) continue;
    picked.push({ id, temp_c: hit.temp_c, wet: !!hit.wet });
  }
  if (!picked.length) return null;
  const temps = picked.map(p => p.temp_c);
  const spread = Math.max(...temps) - Math.min(...temps);
  const wetVotes = picked.filter(p => p.wet).length;
  return {
    temp_c: Math.round(median(temps)),
    spread_c: Math.round(spread * 10) / 10,
    sourceCount: picked.length,
    sources: picked.map(p => p.id),
    // A wet day needs a MAJORITY, not one vote. One source out of three
    // predicting rain is a disagreement, not a forecast of rain, and marking
    // the day wet on that basis is how a dry week grows umbrellas.
    wet: picked.length === 1 ? picked[0].wet : wetVotes * 2 > picked.length,
    agree: picked.length < 2 ? null : spread <= SPREAD_DISAGREES_C,
  };
};

// What the badge says about its own confidence. Empty when there is nothing
// honest to add, because "1 source" on every badge is noise.
export const agreementNote = (merged) => {
  if (!merged || merged.sourceCount < 2) return "";
  if (merged.agree) return `${merged.sourceCount} forecasts agree`;
  return `forecasts disagree by ${merged.spread_c}°, so treat this loosely`;
};

// ── "IT SHOULD BE TRACKING EVERYDAY FOR THEM" ───────────────────────
//
// Oliver's ask, and the shape it takes here is refresh-on-open rather than a
// server job. A saved guide's weather is frozen at the moment it was built, so
// a trip saved in August still shows August's answer in October. Re-checking
// when somebody opens it fixes that with no cron, no stored subscriber list and
// no notification channel, none of which exist in this codebase yet.
//
// It also makes the forecast arrive on its own. A trip saved fourteen weeks out
// shows ten year averages; the same guide opened the week before departure has
// crossed into the forecast window, and the badge changes from "typical" to a
// real forecast without anybody doing anything.
//
// WHAT THIS HONESTLY DOES NOT DO: tell somebody who never opens the app. That
// needs a scheduled job and somewhere to send it, and both are real work rather
// than an oversight.
export const WEATHER_STALE_HOURS = 20;

export const weatherIsStale = (fetchedAt, now) => {
  if (!fetchedAt) return true;
  const t = new Date(fetchedAt).getTime();
  if (!Number.isFinite(t)) return true;
  const ref = now ? new Date(now).getTime() : Date.now();
  return (ref - t) / 3600000 >= WEATHER_STALE_HOURS;
};

// ── WHAT CHANGED SINCE THEY LAST LOOKED ─────────────────────────────
// Only the changes worth interrupting somebody for. A degree of drift is not
// news; a dry day turning wet is, because it is the one that changes whether
// they take the walking day or the museum day. Returns [] when nothing material
// moved, so the page shows nothing rather than a "no change" banner.
export const weatherChanges = (before, after) => {
  const out = [];
  const a = Array.isArray(before) ? before : [];
  const b = Array.isArray(after) ? after : [];
  for (let i = 0; i < b.length; i++) {
    const was = a[i], now = b[i];
    if (!was || !now) continue;
    // A day that only just gained a forecast is not a change, it is the trip
    // getting close enough to have one, and that is said elsewhere.
    if (was.source !== now.source) continue;
    if (was.risk !== "high" && now.risk === "high") out.push(`Day ${i + 1} now looks wet`);
    else if (was.risk === "high" && now.risk !== "high") out.push(`Day ${i + 1} has dried up`);
    else if (Number.isFinite(was.temp) && Number.isFinite(now.temp) && Math.abs(now.temp - was.temp) >= 4) {
      out.push(`Day ${i + 1} is now ${now.temp}°, was ${was.temp}°`);
    }
  }
  return out;
};

// ── ONE IMPLEMENTATION, TWO CALL SITES ──────────────────────────────
// The build path (App.jsx) and the refresh-on-open path (GuidePage) both need
// "what is the weather for this day at this point". Writing that twice is how
// this project got two disagreeing walking-time estimates and two disagreeing
// event-type lists, so it is written once here and handed a fetcher.
//
// `fetchJson` is injected rather than imported so this stays testable without a
// network: the suite passes a function returning canned responses.
export const dayWeather = async ({ point, date, daysOut, fetchJson }) => {
  if (!point || typeof fetchJson !== "function") return null;
  const source = weatherSourceFor(daysOut);
  const iso = date instanceof Date ? date.toISOString().slice(0, 10) : String(date || "").slice(0, 10);
  if (source === NORMALS) {
    const n = await fetchJson(`/api/weather?lat=${point.lat}&lon=${point.lon}&mode=normals&date=${iso}`);
    return weatherBadge({ source: NORMALS, normals: n });
  }
  const data = await fetchJson(`/api/weather?lat=${point.lat}&lon=${point.lon}`);
  if (!data) return null;
  // ── THE MEASUREMENTS COME OFF MET, WHICHEVER PATH SETS THE TEMPERATURE ──
  // Read BEFORE the merge branch, on purpose, and this is the whole reason the
  // warnings can exist at all.
  //
  // `data.sources` reduces all three providers to { date, temp_c, wet }, because
  // that is the shape the merge needs to compare them. Wind and millimetres are
  // NOT in it and cannot be: OpenWeatherMap and WeatherAPI report different
  // quantities differently, and a median across three definitions of "wind"
  // would be measuring the definitions. MET's own `data.forecast` carries
  // wind_speed_ms, precipitation_mm and the symbol code, so that is where they
  // come from on both paths.
  //
  // So: temperature and agreement from the merge, because three opinions beat
  // one. Physical measurements from MET, because it is the only one that sent
  // them. Nothing is averaged that should not be, and nothing is invented when
  // MET has no bucket for that date — the slot is simply absent and every
  // warning that would have cited it is not produced.
  const slot = (data.forecast || []).find(f => f.date === iso);
  const measured = slot ? {
    windMs: slot.wind_speed_ms,
    rainMm: slot.precipitation_mm,
    symbol: slot.condition,
  } : undefined;
  // Prefer the merge across every source that answered. Fall back to the single
  // MET Norway slot only when `sources` is absent, which is what an older
  // deployed API returns, so a stale function never blanks the badge.
  const merged = data.sources ? mergeForecasts(data.sources, iso) : null;
  if (merged) {
    return weatherBadge({
      source: FORECAST,
      forecast: {
        icon: merged.wet ? "🌧️" : merged.temp_c >= 20 ? "☀️" : "⛅",
        temp: merged.temp_c,
        risk: merged.wet ? "high" : "none",
      },
      agreement: agreementNote(merged),
      measured,
    });
  }
  if (!slot) return null;
  const cond = String(slot.condition || "").toLowerCase();
  return weatherBadge({
    source: FORECAST,
    forecast: {
      icon: /rain|sleet|thunder|snow/.test(cond) ? "🌧️" : /cloud|fog/.test(cond) ? "☁️" : "☀️",
      temp: Math.round(slot.temperature_c),
      risk: /rain|sleet|thunder|snow/.test(cond) ? "high" : "none",
    },
    measured,
  });
};
