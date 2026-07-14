// /api/weather.js
// Vercel Serverless Function — fetches weather from Yr.no / MET Norway (100% free, no API key)
//
// IMPORTANT: Yr.no requires a proper, identifying User-Agent header.
// Missing or generic User-Agents get rate-limited or blocked — this is not optional.
// Replace the email below with a real contact address before deploying.
//
// USAGE (from your frontend):
// fetch('/api/weather?lat=55.6761&lon=12.5683')

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
          // REQUIRED by Yr.no's terms — identify your app + a real contact
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
    const now = timeseries[0];

    if (!now) {
      return res.status(404).json({ error: "No forecast data available" });
    }

    const details = now.data.instant.details;
    const next1h = now.data.next_1_hours?.summary?.symbol_code || null;
    const precipitation = now.data.next_1_hours?.details?.precipitation_amount ?? null;

    const warnings = [];
    if (details.wind_speed >= 14) {
      warnings.push({
        type: "Kraftig vind",
        detaljer: `Vindstød omkring ${details.wind_speed} m/s. Kør forsigtigt, særligt på broer som Storebælt.`,
      });
    }
    if (precipitation !== null && precipitation >= 5) {
      warnings.push({
        type: "Kraftig nedbør",
        detaljer: `Forventet nedbør omkring ${precipitation} mm den kommende time.`,
      });
    }

    res.status(200).json({
      temperature_c: details.air_temperature,
      wind_speed_ms: details.wind_speed,
      humidity_percent: details.relative_humidity,
      condition: next1h,
      warnings,
      updated_at: now.time,
    });
  } catch (err) {
    console.error("Weather fetch failed:", err);
    res.status(500).json({ error: "Internal error fetching weather" });
  }
}
