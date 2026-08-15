// /api/weather.js
// Vercel Serverless Function — current weather + multi-day forecast from Yr.no / MET Norway
// (100% free, no API key — just a proper User-Agent header, required by their terms)
//
// USAGE:
// fetch('/api/weather?lat=55.6761&lon=12.5683')
// Returns current conditions + a daily forecast for the coming days.

// ── "WE ARE ABLE TO PREDICT HOW THE WEATHER IS GONNA BE" ────────────
//
// Oliver, 9 Aug 2026: "weather icons need to be more prominent. I have two
// different weather APIs that are useful here."
//
// Only one was ever wired: MET Norway above, which is a real forecast and runs
// out at about nine days. That is not a shortcoming of the API, it is how far
// ahead weather can be forecast at all. Nobody can tell you whether it will
// rain in Odense on 3 November.
//
// AND THAT LIMIT JUST BECAME THE NORMAL CASE. The guide's arrival dates now sit
// two to twenty six weeks out (see App.jsx, the "WHY NO DATE PUT UP" block), and
// fetchGuideWeather bails with `if (forecastIdx > 8) return`. So making dates
// real would have made the weather badge vanish from almost every guide. Two
// correct changes, one silent hole between them.
//
// ── SO THE SECOND SOURCE IS A DIFFERENT QUESTION ────────────────────
// Beyond the forecast horizon the honest answer is not a worse forecast, it is
// a different kind of statement: what that place is normally LIKE at that time
// of year. That is a fact, it comes from measurements, and it is genuinely what
// somebody planning in August for October wants to know.
//
// Open-Meteo's archive is the source: real recorded observations, free, no key.
// This averages the same calendar week across the last ten years, which is what
// a climate normal is. It is never called a forecast anywhere it is shown.
//
// One file, two modes, because Vercel Hobby caps this project at twelve
// functions in api/ and there are exactly twelve.
// ── "OPENWEATHERMAP I HAVE THIS AND WEATHER API" ────────────────────
//
// Oliver, 9 Aug 2026. Both keys are real and both are now wired. What they do
// is worth stating precisely, because the obvious assumption is wrong.
//
// THEY DO NOT EXTEND THE FORECAST MUCH. OpenWeatherMap's daily forecast reaches
// about 16 days on a paid plan and 5 on the free one; WeatherAPI reaches 14.
// MET Norway, already here, reaches about 9. So the horizon moves from roughly
// nine days to roughly fourteen, and no further, because past a fortnight the
// atmosphere is not predictable by anyone. WeatherAPI does sell a "future"
// endpoint covering 14 to 365 days, and that endpoint returns a climate
// estimate rather than a forecast, which is the same thing the normals mode
// below already does honestly and with the label attached.
//
// WHAT THEY ACTUALLY BUY IS AGREEMENT. Two independent models saying 14 degrees
// is worth more than one model asserting it, and two models disagreeing by six
// degrees is a real fact about how confident anybody should be. A single source
// can only ever sound certain. Oliver's own instinct here was right, he just
// had the mechanism slightly off: the value is not a longer forecast, it is a
// checkable one.
//
// Every source is optional. A missing key is not an error, it is one fewer
// opinion, and the merge downstream is built to work with one, two or three.
// ── THE NAMES HAVE TO MATCH WHAT IS ACTUALLY SET ────────────────────
// Both keys were in Vercel since 29 July and both came back null anyway,
// because I guessed at the variable names instead of looking. His are
// OPENWEATHERMAP and WEATHER_API_KEY. I read OPENWEATHER_API_KEY and
// OPENWEATHERMAP_API_KEY, so the OpenWeatherMap one could never match.
// Every spelling either of us would plausibly use is accepted now, since the
// cost of an extra name in this list is nothing and the cost of a miss is a
// feature that silently does not exist.
const OWM_KEY = process.env.OPENWEATHERMAP || process.env.OPENWEATHER_API_KEY
  || process.env.OPENWEATHERMAP_API_KEY || process.env.OPENWEATHER_KEY || "";
const WAPI_KEY = process.env.WEATHER_API_KEY || process.env.WEATHERAPI_KEY
  || process.env.WEATHERAPI || process.env.WEATHERAPI_COM_KEY || "";

// ── AND A FAILURE HAS TO SAY WHY ────────────────────────────────────
// Both sources returned null and the response could not tell me whether that
// meant no key, a rejected key, or a plan limit. `catch { return null }` is
// the same silent-failure shape this project keeps finding, and I wrote a
// fresh one. Each source now records its own reason, which is reported in the
// response. The key itself never appears here.
// PER REQUEST, not module scope. As a module-level object on a warm Vercel
// container this outlived the handler: one rate-limited request left
// {openweathermap: "HTTP 429"} in every later response on that container, even
// while that source was returning good data, and under concurrency it reported
// request A's failure inside request B's answer for a different coordinate. A
// diagnostic field that lies is worse than no diagnostic field.

// One shape for every source, so the client merge never branches on provider:
// { date: "2026-09-14", temp_c, wet } where wet means 1mm or more that day.
const dayKey = (t) => String(t).slice(0, 10);

async function openWeatherSeries(lat, lon, sourceErrors) {
  if (!OWM_KEY) { sourceErrors.openweathermap = "no key set"; return null; }
  try {
    const r = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`);
    if (!r.ok) { sourceErrors.openweathermap = `HTTP ${r.status}`; return null; }
    const j = await r.json();
    // 3-hourly. Collapse to a day by taking the slot nearest midday, which is
    // what somebody planning a day out is asking about, and summing the rain
    // across the whole day rather than that one slot.
    const byDay = {};
    for (const p of j.list || []) {
      const d = dayKey(p.dt_txt || "");
      if (!d) continue;
      const hour = Number(String(p.dt_txt).slice(11, 13));
      const rain = (p.rain && p.rain["3h"]) || 0;
      if (!byDay[d]) byDay[d] = { date: d, temp_c: null, _hour: 99, rain: 0 };
      byDay[d].rain += rain;
      if (Math.abs(hour - 12) < Math.abs(byDay[d]._hour - 12)) {
        byDay[d]._hour = hour;
        byDay[d].temp_c = p.main?.temp ?? null;
      }
    }
    return Object.values(byDay).map(d => ({ date: d.date, temp_c: d.temp_c, wet: d.rain >= 1 }));
  } catch (e) { sourceErrors.openweathermap = String(e.message || e).slice(0, 80); return null; }
}

async function weatherApiSeries(lat, lon, sourceErrors) {
  if (!WAPI_KEY) { sourceErrors.weatherapi = "no key set"; return null; }
  // PLAN LIMIT, RETRIED RATHER THAN SWALLOWED. WeatherAPI's free tier serves 3
  // days and rejects a request for 14 outright, so asking for the maximum and
  // giving up on the error means a perfectly good key looks like a missing one.
  // Ask for the most, fall back to the least.
  const call = async (days) => {
    const r = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${WAPI_KEY}&q=${lat},${lon}&days=${days}&aqi=no&alerts=no`);
    return r.ok ? r.json() : null;
  };
  try {
    const j = (await call(14)) || (await call(3));
    if (!j) { sourceErrors.weatherapi = "rejected at 14 and 3 days, check the key"; return null; }
    return (j.forecast?.forecastday || []).map(d => ({
      date: d.date,
      // avgtemp is the honest single number for a whole day here; maxtemp
      // would systematically read warmer than the other two sources and the
      // spread between sources would then be measuring the units, not the
      // weather.
      temp_c: d.day?.avgtemp_c ?? null,
      wet: (d.day?.totalprecip_mm ?? 0) >= 1,
    }));
  } catch (e) { sourceErrors.weatherapi = String(e.message || e).slice(0, 80); return null; }
}

const NORMALS_YEARS = 10;
const WINDOW_DAYS = 3; // either side, so a 7 day window centred on the date

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const iso = (d) => d.toISOString().slice(0, 10);

// ── THE DANISH NATIONAL RECORD, NOT A GLOBAL MODEL'S GUESS AT IT ────
//
// Oliver, 11 Aug 2026, sending DMI's own page after I twice told him their free
// data needed an API key: it does not. Authentication was dropped on 2 Dec 2025.
// "You can now access all endpoints directly, neither registration, nor API key
// are needed." I had been reading a stale FAQ on a different host. Two copies of
// one fact and I read the wrong one, which is the exact failure this codebase
// has spent two days removing.
//
// WHY DMI RATHER THAN WHAT WAS HERE. The ten year averages below come from
// Open-Meteo's archive, which is ERA5: a global reanalysis, interpolated to a
// point. Perfectly respectable, and not Danish. DMI's climate data is the
// national record, quality controlled by DMI's climatologists, and it publishes
// EXACTLY the three numbers this function computes by hand:
//
//   mean_daily_max_temp    the high
//   mean_daily_min_temp    the low
//   no_days_acc_precip_1   days with 1mm or more, which is the wet-day rule
//                          the comment below already defines by hand
//
// For a Denmark-only product answering "what is late September usually like in
// Ribe", the Danish national record is the right source and a global model
// standing in for it is not.
//
// MUNICIPALITY LEVEL, NOT STATIONS. Verified against the live API: a bounding
// box around Ribe returns Esbjerg, the municipality it is in. That avoids the
// nearest-station problem entirely, which for small Danish towns is the whole
// difficulty. 10kmGridValue was tried first and returns nothing for these
// parameters.
//
// THREE CALLS, NOT THIRTY. One request per parameter covering the whole ten
// years at monthly resolution, then filtered to the target month in code.
const DMI_CLIMATE = "https://dmigw.govcloud.dk/v2/climateData/collections/municipalityValue/items";
const DMI_BOX = 0.35;   // degrees either side; wide enough to catch a municipality centroid

const dmiSeries = async (lat, lon, parameterId, fromYear, toYear) => {
  const bbox = [ (lon - DMI_BOX).toFixed(3), (lat - DMI_BOX).toFixed(3),
                 (lon + DMI_BOX).toFixed(3), (lat + DMI_BOX).toFixed(3) ].join(",");
  const url = `${DMI_CLIMATE}?parameterId=${parameterId}&timeResolution=month`
    + `&bbox=${bbox}&datetime=${fromYear}-01-01T00:00:00Z/${toYear}-12-31T23:59:59Z&limit=1000`;
  const r = await fetch(url, { headers: { "User-Agent": "Gemlyx/1.0 (gemlyxtravel.com)" } });
  if (!r.ok) throw new Error(`DMI ${parameterId} ${r.status}`);
  const j = await r.json();
  return Array.isArray(j.features) ? j.features : [];
};

// A bbox can straddle several municipalities. Pick the one whose point is
// nearest the town, rather than whichever the API happened to list first.
const nearestMunicipality = (features, lat, lon) => {
  let best = null, bestD = Infinity;
  features.forEach(f => {
    const c = f?.geometry?.coordinates;
    if (!Array.isArray(c) || c.length < 2) return;
    const d = ((c[1] - lat) * 111.32) ** 2 + ((c[0] - lon) * 62.06) ** 2;
    if (d < bestD) { bestD = d; best = f?.properties?.municipalityId || null; }
  });
  return best;
};

async function dmiNormals(lat, lon, dateStr) {
  const target = new Date(`${dateStr}T12:00:00Z`);
  if (!Number.isFinite(target.getTime())) return null;
  const month = target.getUTCMonth() + 1;
  const latestYear = new Date().getUTCFullYear() - 1;
  const fromYear = latestYear - (NORMALS_YEARS - 1);

  const [hi, lo, wet] = await Promise.all([
    dmiSeries(lat, lon, "mean_daily_max_temp", fromYear, latestYear),
    dmiSeries(lat, lon, "mean_daily_min_temp", fromYear, latestYear),
    dmiSeries(lat, lon, "no_days_acc_precip_1", fromYear, latestYear),
  ]);

  const muni = nearestMunicipality([...hi, ...lo, ...wet], lat, lon);
  if (!muni) return null;
  // One municipality, one month, and only real numbers. `from` carries a
  // timezone offset, so the month is read off the string rather than parsed
  // into a Date that could tip into the previous month at midnight.
  const pick = (features) => features
    .filter(f => f?.properties?.municipalityId === muni)
    .filter(f => Number(String(f?.properties?.from || "").slice(5, 7)) === month)
    .map(f => Number(f?.properties?.value))
    .filter(Number.isFinite);

  const highs = pick(hi), lows = pick(lo), wets = pick(wet);
  // Same rule as the Open-Meteo path: a normal built from two years is not a
  // normal, and refusing beats printing an average of noise as a climate.
  if (highs.length < 5 || lows.length < 5) return null;

  const daysInMonth = new Date(Date.UTC(latestYear, month, 0)).getUTCDate();
  const name = [...hi, ...lo, ...wet].find(f => f?.properties?.municipalityId === muni)?.properties?.municipalityName || "";
  return {
    kind: "normals",
    date: dateStr,
    years: highs.length,
    high_c: Math.round(mean(highs)),
    low_c: Math.round(mean(lows)),
    // DMI publishes the count of wet days directly, so this is their number
    // divided by the month's length rather than a share computed from dailies.
    wet_day_share: wets.length ? Math.min(1, mean(wets) / daysInMonth) : null,
    source: `DMI, the Danish national climate record${name ? ` (${name} municipality)` : ""}`,
  };
}

async function climateNormals(lat, lon, dateStr) {
  const target = new Date(`${dateStr}T12:00:00Z`);
  if (!Number.isFinite(target.getTime())) return null;
  // The archive lags real time by several days, so the most recent year is the
  // one BEFORE the target's year rather than the current one.
  const latestYear = new Date().getUTCFullYear() - 1;
  const years = Array.from({ length: NORMALS_YEARS }, (_, i) => latestYear - i);

  const perYear = await Promise.all(years.map(async (year) => {
    const from = new Date(Date.UTC(year, target.getUTCMonth(), target.getUTCDate() - WINDOW_DAYS));
    const to = new Date(Date.UTC(year, target.getUTCMonth(), target.getUTCDate() + WINDOW_DAYS));
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}`
      + `&start_date=${iso(from)}&end_date=${iso(to)}`
      + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FCopenhagen`;
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      const j = await r.json();
      const d = j.daily || {};
      return {
        max: (d.temperature_2m_max || []).filter(v => typeof v === "number"),
        min: (d.temperature_2m_min || []).filter(v => typeof v === "number"),
        rain: (d.precipitation_sum || []).filter(v => typeof v === "number"),
      };
    } catch { return null; }
  }));

  const good = perYear.filter(Boolean);
  // A normal built from two years is not a normal. Refusing is better than
  // printing an average of noise as though it described a climate.
  if (good.length < 5) return null;

  const maxes = good.flatMap(y => y.max);
  const mins = good.flatMap(y => y.min);
  const rains = good.flatMap(y => y.rain);
  if (!maxes.length || !mins.length) return null;

  // A WET DAY is 1mm or more. A trace of drizzle is not the thing somebody
  // packing a coat is asking about, and counting it makes every Danish month
  // look like a washout.
  const wet = rains.filter(v => v >= 1).length;
  return {
    kind: "normals",
    date: dateStr,
    years: good.length,
    high_c: Math.round(mean(maxes)),
    low_c: Math.round(mean(mins)),
    wet_day_share: rains.length ? wet / rains.length : null,
    source: "Open-Meteo archive, recorded observations",
  };
}

export default async function handler(req, res) {
  const { lat, lon, mode, date } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing 'lat' or 'lon' query params" });
  }

  if (mode === "normals") {
    if (!date) return res.status(400).json({ error: "Missing 'date' for normals" });
    try {
      // ── DMI FIRST, OPEN-METEO AS THE FALLBACK ──────────────────
      // Not a replacement. DMI covers Denmark and Greenland only, and a
      // national service can be down like any other, so the global archive
      // stays as the second answer rather than being deleted. Which one
      // answered is named in `source`, because "ten year average" from the
      // Danish national record and from a global reanalysis are not the same
      // claim and the page should not pretend they are.
      let normals = null;
      try {
        normals = await dmiNormals(lat, lon, String(date));
      } catch (e) {
        // A DMI outage must not cost the traveller the figure entirely.
        console.warn("DMI normals unavailable, falling back to the global archive:", e.message);
      }
      if (!normals) normals = await climateNormals(lat, lon, String(date));
      // Not an error. Not enough archive coverage to state a normal honestly is
      // a real answer, and the caller shows nothing rather than a guess.
      if (!normals) return res.status(200).json({ kind: "normals", available: false });
      // A climate normal does not change day to day, so it caches hard.
      res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400");
      return res.status(200).json({ ...normals, available: true });
    } catch (err) {
      console.error("Normals fetch failed:", err);
      return res.status(200).json({ kind: "normals", available: false });
    }
  }

  try {
    const yrRes = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
      {
        headers: {
          "User-Agent": "Gemlyx/1.0 (https://gemlyx.app; hello@gemlyx.com)",
        },
      }
    );

    if (!yrRes.ok) {
      const errText = await yrRes.text();
      console.error("Yr.no error:", errText);
      return res.status(502).json({ error: "Weather service failed", detail: errText });
    }

    const data = await yrRes.json();
    const timeseries = data.properties?.timeseries || [];
    if (timeseries.length === 0) {
      return res.status(404).json({ error: "No forecast data available" });
    }

    const now = timeseries[0];
    const details = now.data.instant.details;
    const next1h = now.data.next_1_hours?.summary?.symbol_code || null;
    const precipNow = now.data.next_1_hours?.details?.precipitation_amount ?? null;

    const warnings = [];
    if (details.wind_speed >= 14) {
      warnings.push({ type: "Kraftig vind", detaljer: `Vindstød omkring ${details.wind_speed} m/s. Kør forsigtigt, særligt på broer som Storebælt.` });
    }
    if (precipNow !== null && precipNow >= 5) {
      warnings.push({ type: "Kraftig nedbør", detaljer: `Forventet nedbør omkring ${precipNow} mm den kommende time.` });
    }

    const byDay = {};
    for (const point of timeseries) {
      const d = point.time.slice(0, 10);
      const hour = new Date(point.time).getUTCHours();
      if (!byDay[d] || Math.abs(hour - 12) < Math.abs(byDay[d]._hour - 12)) {
        byDay[d] = { ...point, _hour: hour };
      }
    }
    // ── DO NOT THROW AWAY THREE DAYS OF FORECAST ────────────────────
    // This was slice(0, 7), and utils/weather.js then set its own horizon to 6
    // to match it, so a trip nine days out was told "too far out for a real
    // forecast" about weather MET Norway had already sent us. locationforecast
    // 2.0 runs hourly for about two and a half days and then six-hourly out to
    // ten, so ten buckets is what the response contains rather than a number
    // picked here. FORECAST_HORIZON_DAYS in utils/weather.js is the client half
    // of this one decision and moves with it: offsets 0 through 9.
    //
    // The last bucket can be a partial day, which is why it is ten and not
    // eleven, and the other two sources run out earlier (OpenWeatherMap's free
    // forecast is five days, WeatherAPI's is three). The merge already treats a
    // source that has no entry for a date as one fewer opinion, so days seven
    // to ten arrive single-source and honestly labelled rather than absent.
    const forecast = Object.entries(byDay).slice(0, 10).map(([date, point]) => ({
      date,
      temperature_c: point.data.instant.details.air_temperature,
      wind_speed_ms: point.data.instant.details.wind_speed,
      condition: point.data.next_6_hours?.summary?.symbol_code || point.data.next_1_hours?.summary?.symbol_code || null,
      precipitation_mm: point.data.next_6_hours?.details?.precipitation_amount ?? point.data.next_1_hours?.details?.precipitation_amount ?? null,
    }));

    // The other two opinions, fetched alongside rather than instead. Both
    // resolve to null without a key or on any failure, and the merge treats a
    // null as one fewer source rather than an error, so this endpoint degrades
    // to exactly the single-source behaviour it had before.
    const sourceErrors = {};
    const [owm, wapi] = await Promise.all([openWeatherSeries(lat, lon, sourceErrors), weatherApiSeries(lat, lon, sourceErrors)]);

    res.status(200).json({
      temperature_c: details.air_temperature,
      wind_speed_ms: details.wind_speed,
      humidity_percent: details.relative_humidity,
      condition: next1h,
      warnings,
      forecast,
      // MET Norway restated in the shared shape so the merge can treat all
      // three identically. `forecast` above is untouched for existing callers.
      sources: {
        met: forecast.map(f => ({ date: f.date, temp_c: f.temperature_c, wet: (f.precipitation_mm ?? 0) >= 1 })),
        openweathermap: owm,
        weatherapi: wapi,
      },
      // Why a source is absent, so a missing forecast is diagnosable from the
      // response instead of by reading the code. Never contains a key.
      source_errors: sourceErrors,
      updated_at: now.time,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Weather fetch failed:", err);
    res.status(500).json({ error: "Internal error fetching weather" });
  }
}
