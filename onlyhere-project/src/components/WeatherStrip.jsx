import { C } from "../theme.js";
import { weatherIcon } from "../utils/weatherIcon.js";

export const WeatherStrip = ({ label, weatherKey, lat, lon, weather, weatherLoading, checkWeather }) => {
  const data = weather[weatherKey];
  useEffect(() => {
    if (!data && weatherLoading !== weatherKey) checkWeather(weatherKey, lat, lon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherKey]);

  return (
    <div style={{ background: C.surface, borderRadius: 16, padding: "16px", border: `1px solid ${C.border}`, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>{label}</div>
        {weatherLoading === weatherKey && <span style={{ fontSize: 11, color: C.muted }}>Loading...</span>}
      </div>

      {data && !data.error ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <span style={{ fontSize: 40 }}>{weatherIcon(data.condition)}</span>
            <div>
              <div style={{ fontSize: 30, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>{Math.round(data.temperature_c)}°C</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Wind {data.wind_speed_ms} m/s · Humidity {data.humidity_percent}%</div>
            </div>
          </div>

          {data.warnings?.length > 0 && data.warnings.map((w, i) => (
            <div key={i} style={{ background: "#3D2A0A", border: "1px solid #FFB347", borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#FFB347", lineHeight: 1.5 }}>
              ◷ {w.type}: {w.detaljer}
            </div>
          ))}

          {data.forecast?.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {data.forecast.map((day, i) => {
                const d = new Date(day.date);
                const label = i === 0 ? "Today" : d.toLocaleDateString("en", { weekday: "short" });
                return (
                  <div key={day.date} style={{ flexShrink: 0, background: C.bg, borderRadius: 10, padding: "8px 10px", textAlign: "center", minWidth: 56 }}>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{weatherIcon(day.condition)}</div>
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{Math.round(day.temperature_c)}°</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : data?.error ? (
        <div style={{ fontSize: 12, color: C.muted }}>Couldn't fetch weather — check /api/weather.js is deployed with a working User-Agent.</div>
      ) : (
        <div style={{ fontSize: 12, color: C.muted }}>Loading forecast...</div>
      )}
    </div>
  );
};

