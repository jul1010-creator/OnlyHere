// ── THE WEATHER A WALK IS MADE FOR, READ ONE WAY ────────────────────
//
// MET Norway's compact forecast, read the way the walk planner has read it
// since 2 Oct 2026: the next three hours, wet if half a millimetre falls or
// the sky says rain, sleet or snow, and the strongest wind in those hours.
// One reader for two callers: api/plan-now.js, which makes the real walk, and
// api/weather.js?mode=walk, which the examples page asks so it can show the
// walk for the weather in Klaipėda right now (Oliver, 4 Oct 2026: "make it, so
// the default one is how it is currently. So we know that it does detect it").
//
// An empty forecast is no forecast: null, never a calm dry day (security
// review, 4 Oct 2026, finding 12).
export const walkWeatherFrom = (json) => {
  const series = Array.isArray(json?.properties?.timeseries) ? json.properties.timeseries : [];
  const next = series.slice(0, 3);
  if (!next.length) return null;
  const rain = next.reduce((n, t) => n + (Number(t?.data?.next_1_hours?.details?.precipitation_amount) || 0), 0);
  const symbol = String(next[0]?.data?.next_1_hours?.summary?.symbol_code || "");
  const temp = Number(next[0]?.data?.instant?.details?.air_temperature);
  const wind = Math.max(0, ...next.map(t => Number(t?.data?.instant?.details?.wind_speed) || 0));
  return {
    known: true,
    wet: rain >= 0.5 || /rain|sleet|snow/.test(symbol),
    snow: /snow|sleet/.test(symbol),
    wind: Math.round(wind),
    temp: Number.isFinite(temp) ? temp : null,
    symbol,
    at: String(next[0]?.time || ""),
  };
};
