import { useState } from "react";
import { C } from "../theme.js";
import { weatherIcon } from "../utils/weatherIcon.js";
import { WEATHER_CITIES } from "../data/weatherCities.js";
import { WeatherStrip } from "./WeatherStrip.jsx";

export const WeatherHeaderStrip = ({ weather, weatherLoading, checkWeather }) => {
  const [openCity, setOpenCity] = useState(null);
  useEffect(() => {
    WEATHER_CITIES.forEach(c => { if (!weather[c.key] && weatherLoading !== c.key) checkWeather(c.key, c.lat, c.lon); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCityData = WEATHER_CITIES.find(c => c.key === openCity);

  return (
    <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "10px 0", marginTop: 4 }}>
      {WEATHER_CITIES.map(c => {
        const d = weather[c.key];
        return (
          <button key={c.key} onClick={() => setOpenCity(c.key)}
            style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span style={{ fontSize: 15 }}>{d && !d.error ? weatherIcon(d.condition) : "⏳"}</span>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{c.label}</span>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{d && !d.error ? `${Math.round(d.temperature_c)}°` : "--"}</span>
          </button>
        );
      })}

      {openCityData && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(5,8,16,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "70px 16px" }} onClick={() => setOpenCity(null)}>
          <div style={{ width: "100%", maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <WeatherStrip label={`🌤 ${openCityData.label}`} weatherKey={openCityData.key} lat={openCityData.lat} lon={openCityData.lon} weather={weather} weatherLoading={weatherLoading} checkWeather={checkWeather} />
            <button onClick={() => setOpenCity(null)} style={{ display: "block", width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

