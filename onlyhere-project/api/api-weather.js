// /api/weather.js
// Vercel Serverless Function — current weather + multi-day forecast from Yr.no / MET Norway
// (100% free, no API key — just a proper User-Agent header, required by their terms)
//
// USAGE:
// fetch('/api/weather?lat=55.6761&lon=12.5683')
// Returns current conditions + a daily forecast for the coming days.

export default async function handler(req, res) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing 'lat' or 'lon' query params" });
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
    const forecast = Object.entries(byDay).slice(0, 7).map(([date, point]) => ({
      date,
      temperature_c: point.data.instant.details.air_temperature,
      wind_speed_ms: point.data.instant.details.wind_speed,
      condition: point.data.next_6_hours?.summary?.symbol_code || point.data.next_1_hours?.summary?.symbol_code || null,
      precipitation_mm: point.data.next_6_hours?.details?.precipitation_amount ?? point.data.next_1_hours?.details?.precipitation_amount ?? null,
    }));

    res.status(200).json({
      temperature_c: details.air_temperature,
      wind_speed_ms: details.wind_speed,
      humidity_percent: details.relative_humidity,
      condition: next1h,
      warnings,
      forecast,
      updated_at: now.time,
    });
  } catch (err) {
    console.error("Weather fetch failed:", err);
    res.status(500).json({ error: "Internal error fetching weather" });
  }
}
