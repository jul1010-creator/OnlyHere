import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { C } from "../utils/theme";
import { weatherIcon } from "../utils/helpers";
import { WEATHER_CITIES } from "../data/mapShapes";
import { WeatherStrip } from "./WeatherStrip";

export const WeatherHeaderStrip = ({ weather, weatherLoading, checkWeather, compact }) => {
  const [openCity, setOpenCity] = useState(null);
  useEffect(() => {
    WEATHER_CITIES.forEach(c => { if (!weather[c.key] && weatherLoading !== c.key) checkWeather(c.key, c.lat, c.lon); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCityData = WEATHER_CITIES.find(c => c.key === openCity);

  return (
    <div style={{ position: "relative", flex: compact ? 1 : "none", minWidth: 0 }}>
      {/* Modernized (the "less 2010" pass): each city is a proper pill chip
          instead of bare emoji+number floating in a row. */}
      <div style={{ display: "flex", gap: compact ? 6 : 8, overflowX: "auto", padding: compact ? "0 4px" : "2px 0", marginTop: 0, scrollbarWidth: "none" }}>
        {WEATHER_CITIES.map(c => {
          const d = weather[c.key];
          return (
            <button key={c.key} onClick={() => setOpenCity(c.key)}
              style={{ display: "flex", alignItems: "center", gap: compact ? 4 : 6, flexShrink: 0, background: "rgba(33,44,68,0.45)", border: `1px solid ${C.border}`, borderRadius: 100, padding: compact ? "4px 9px" : "6px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              <span style={{ fontSize: compact ? 11 : 13 }}>{d && !d.error ? weatherIcon(d.condition) : "–"}</span>
              {!compact && <span style={{ fontSize: 11, color: C.light, fontWeight: 600 }}>{c.label}</span>}
              <span style={{ fontSize: compact ? 11 : 12.5, color: C.text, fontWeight: 700 }}>{d && !d.error ? `${Math.round(d.temperature_c)}°` : "--"}</span>
            </button>
          );
        })}
      </div>
      {compact && WEATHER_CITIES.length > 1 && (
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 14, background: `linear-gradient(to right, transparent, ${C.bg})`, pointerEvents: "none" }} />
      )}

      {/* This strip renders inside a swipeable page tab, and the tab pager
          wraps every tab in a `transform: translateX(...)` strip for the
          slide animation — a transform on any ancestor becomes the
          containing block for a `position: fixed` descendant instead of the
          real viewport, so this popup would land pinned to that giant
          multi-tab strip and get clipped to a sliver, same root cause as the
          filter sheets. Portal straight to document.body to escape it. */}
      {openCityData && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(5,8,16,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "70px 16px" }} onClick={() => setOpenCity(null)}>
          <div style={{ width: "100%", maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <WeatherStrip label={openCityData.label} weatherKey={openCityData.key} lat={openCityData.lat} lon={openCityData.lon} weather={weather} weatherLoading={weatherLoading} checkWeather={checkWeather} />
            <button onClick={() => setOpenCity(null)} style={{ display: "block", width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

