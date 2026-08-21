import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { C } from "../utils/theme";
import { weatherIcon } from "../utils/helpers";
import { WEATHER_CITIES } from "../data/mapShapes";
import { WeatherStrip } from "./WeatherStrip";

// ── TODAY IN DENMARK ─────────────────────────────────────────────────
// Oliver, 7 Aug 2026: "I also find the weather in the middle of explore page
// looking kinda boring.. Everything else looks modern, except that."
//
// He is right, and the reason is not the styling. Four grey pills reading
// 19° 19° 18° 20° is a WIDGET: it presents data and stops. Nobody planning a
// trip needs to be told it is 19 degrees in Aarhus, and nothing about it is
// Gemlyx rather than any weather app.
//
// What it should be is the thing weather is actually for on a travel guide: a
// reason to change your plans. So the numbers stay, they get room to breathe
// and a colour that comes from the sky rather than from the theme, and above
// them sits ONE honest sentence about what today is good for. That sentence is
// computed from the real forecast the app already fetches, never written by a
// model, and it says nothing at all when the weather has nothing to say.
//
// THE RULE THAT KEEPS IT HONEST: readTheDay only speaks when every city it is
// summarising has actually loaded. A verdict built from two cities out of four
// while the others are still in flight would be wrong roughly as often as it
// was right, and a confident wrong line about rain is worse than no line.

// Colour from the condition, not from the palette: a clear day should look
// different from a wet one at a glance, and this is the one place in the app
// where the data has a natural colour of its own.
const skyOf = (code) => {
  const c = String(code || "");
  if (/thunder/.test(c)) return { a: "#4A3B6B", b: "#2A2340", ink: "#E8E2F5" };
  if (/rain|sleet/.test(c)) return { a: "#33506B", b: "#1F3242", ink: "#DDE9F5" };
  if (/snow/.test(c)) return { a: "#5B6D80", b: "#33404E", ink: "#F0F5FA" };
  if (/cloudy|fog/.test(c)) return { a: "#4C5460", b: "#2C323A", ink: "#E6EAF0" };
  if (/clearsky|fair/.test(c)) return { a: "#B5762A", b: "#5E3B14", ink: "#FFF3DE" };
  return { a: "#3E4A5C", b: "#252E3A", ink: "#E4E9F1" };
};

// One sentence, or nothing. Deliberately built from counts rather than from a
// single city, because "Today in Denmark" is a claim about the country.
export const readTheDay = (weather, cities) => {
  const loaded = cities.map(c => weather[c.key]).filter(d => d && !d.error);
  if (loaded.length < cities.length) return null;          // see the honesty rule above
  const codes = loaded.map(d => String(d.condition || ""));
  const temps = loaded.map(d => d.temperature_c).filter(t => typeof t === "number");
  if (!temps.length) return null;
  const wet = codes.filter(c => /rain|sleet|thunder/.test(c)).length;
  const clear = codes.filter(c => /clearsky|fair/.test(c)).length;
  const warmest = Math.round(Math.max(...temps));
  const coldest = Math.round(Math.min(...temps));

  if (wet >= Math.ceil(cities.length / 2)) {
    return { line: "Wet across most of the country today.", hint: "A good day for the indoor half of a plan.", mood: "wet" };
  }
  if (wet > 0) {
    const wetCity = cities.find(c => /rain|sleet|thunder/.test(String(weather[c.key]?.condition || "")));
    return { line: `Rain around ${wetCity?.label || "parts of Denmark"} today.`, hint: "Dry elsewhere, so it is worth checking before you commit to a day outside.", mood: "mixed" };
  }
  if (clear === cities.length && warmest >= 18) {
    return { line: "Clear everywhere, and warm.", hint: "The kind of day the coast and the open-air places are for.", mood: "clear" };
  }
  if (clear === cities.length) {
    return { line: "Clear everywhere.", hint: `Bright but only ${warmest} degrees, so take a layer.`, mood: "clear" };
  }
  if (warmest - coldest >= 6) {
    return { line: `${warmest} degrees in one corner, ${coldest} in another.`, hint: "Denmark is small but today is not uniform.", mood: "mixed" };
  }
  return null;   // an ordinary grey day says nothing, rather than saying something empty
};

export const WeatherHeaderStrip = ({ weather, weatherLoading, checkWeather, compact }) => {
  const [openCity, setOpenCity] = useState(null);
  useEffect(() => {
    WEATHER_CITIES.forEach(c => { if (!weather[c.key] && weatherLoading !== c.key) checkWeather(c.key, c.lat, c.lon); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCityData = WEATHER_CITIES.find(c => c.key === openCity);
  const day = compact ? null : readTheDay(weather, WEATHER_CITIES);

  // The compact form lives in a header where there is genuinely no room for
  // anything more, so it stays as pills. Only the Explore band gets the cards.
  if (compact) {
    return (
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 4px", scrollbarWidth: "none" }}>
          {WEATHER_CITIES.map(c => {
            const d = weather[c.key];
            return (
              <button key={c.key} onClick={() => setOpenCity(c.key)}
                style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: "4px 9px", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                <span style={{ fontSize: 11 }}>{d && !d.error ? weatherIcon(d.condition) : "·"}</span>
                <span style={{ fontSize: 11, color: C.text, fontWeight: 700 }}>{d && !d.error ? `${Math.round(d.temperature_c)}°` : "--"}</span>
              </button>
            );
          })}
        </div>
        {openCityData && createPortal(<CityPopup city={openCityData} onClose={() => setOpenCity(null)} {...{ weather, weatherLoading, checkWeather }} />, document.body)}
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {day && (
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text, fontFamily: "'Fraunces', serif", lineHeight: 1.3 }}>{day.line}</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>{day.hint}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, justifyContent: "center", flexWrap: "wrap" }}>
        {WEATHER_CITIES.map(c => {
          const d = weather[c.key];
          const ready = d && !d.error;
          const sky = skyOf(ready ? d.condition : null);
          const rain = ready && typeof d.forecast?.[0]?.precipitation_mm === "number" ? d.forecast[0].precipitation_mm : null;
          const wind = ready && typeof d.wind_speed_ms === "number" ? Math.round(d.wind_speed_ms) : null;
          return (
            <button key={c.key} onClick={() => setOpenCity(c.key)}
              style={{ position: "relative", flexShrink: 0, width: 132, textAlign: "left", border: `1px solid ${C.border}`, borderRadius: 14, padding: "11px 12px 10px", cursor: "pointer", overflow: "hidden", fontFamily: "'Inter', sans-serif",
                background: ready ? `linear-gradient(158deg, ${sky.a} 0%, ${sky.b} 78%)` : C.surface }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: ready ? `${sky.ink}b0` : C.muted }}>{c.label}</span>
                <span style={{ fontSize: 17, lineHeight: 1 }}>{ready ? weatherIcon(d.condition) : "·"}</span>
              </div>
              <div style={{ fontSize: 27, fontWeight: 600, fontFamily: "'Fraunces', serif", color: ready ? sky.ink : C.muted, lineHeight: 1.1, marginTop: 6 }}>
                {ready ? `${Math.round(d.temperature_c)}°` : "--"}
              </div>
              {/* Only ever shown when the number is genuinely there. An empty
                  line is better than a zero standing in for "not loaded". */}
              <div style={{ fontSize: 10.5, color: ready ? `${sky.ink}9a` : C.muted, marginTop: 3, minHeight: 13 }}>
                {rain != null && rain > 0 ? `${rain} mm rain` : wind != null ? `${wind} m/s wind` : ""}
              </div>
            </button>
          );
        })}
      </div>
      {openCityData && createPortal(<CityPopup city={openCityData} onClose={() => setOpenCity(null)} {...{ weather, weatherLoading, checkWeather }} />, document.body)}
    </div>
  );
};

// Portalled to document.body deliberately. This strip renders inside a
// swipeable page tab, and the pager wraps every tab in a transform for the
// slide animation, which makes that strip the containing block for a fixed
// descendant instead of the viewport. Without the portal the popup lands pinned
// to a giant multi-tab strip and gets clipped to a sliver.
const CityPopup = ({ city, onClose, weather, weatherLoading, checkWeather }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 900, background: C.scrim || "rgba(5,8,16,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "70px 16px" }} onClick={onClose}>
    <div style={{ width: "100%", maxWidth: 420 }} onClick={e => e.stopPropagation()}>
      <WeatherStrip label={city.label} weatherKey={city.key} lat={city.lat} lon={city.lon} weather={weather} weatherLoading={weatherLoading} checkWeather={checkWeather} />
      <button onClick={onClose} style={{ display: "block", width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
        Close
      </button>
    </div>
  </div>
);
