import { useState } from "react";
import { C } from "../utils/theme";
import { getEventDate, isUpcoming, isCurrentlyLive, isInDenmark } from "../utils/helpers";
import { events, majorEvents, vikingEvents } from "../data/events";
import { TOWN_COORDS } from "../data/towns";

export const LiveEventsHeaderStrip = ({ liveInfo, liveInfoLoading, checkLiveInfo, nearYou, requestLocation, setEventDetail, setFreeDetail, setFoodDetail, userCoords }) => {
  const [segment, setSegment] = useState(null); // null = default (live if any, else coming); "live" or "coming" once the person picks
  const allTracked = [...events, ...majorEvents, ...vikingEvents];
  const currentlyLive = allTracked.filter(e => isCurrentlyLive(e.date, e.dateEnd));
  const kmFromUserToTown = (locStr) => {
    if (!isInDenmark(userCoords) || !locStr) return null;
    const key = Object.keys(TOWN_COORDS).find(t => locStr.includes(t));
    if (!key) return null;
    const [tLat, tLon] = TOWN_COORDS[key];
    const dLat = (tLat - userCoords.lat) * 111.32;
    const dLon = (tLon - userCoords.lon) * 62.06;
    return Math.sqrt(dLat * dLat + dLon * dLon);
  };
  const comingSoon = allTracked.filter(e => isUpcoming(e.date) && !isCurrentlyLive(e.date, e.dateEnd))
    .sort((a, b) => {
      if (isInDenmark(userCoords)) {
        const kmA = kmFromUserToTown(a.town) ?? 9999, kmB = kmFromUserToTown(b.town) ?? 9999;
        if (kmA !== kmB) return kmA - kmB;
      }
      return new Date(a.date) - new Date(b.date);
    });
  const showBoth = currentlyLive.length > 0 && comingSoon.length > 0;
  const activeSegment = segment || (currentlyLive.length > 0 ? "live" : "coming");
  const showList = activeSegment === "live" ? currentlyLive : comingSoon.slice(0, 6);
  const isLive = activeSegment === "live";
  const comingLabel = isInDenmark(userCoords) ? "Coming Up Near You" : "Coming Events";

  return (
    <div style={{ marginTop: 4, marginBottom: 2 }}>
      {(currentlyLive.length > 0 || comingSoon.length > 0) && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            {currentlyLive.length > 0 && <style>{`@keyframes gemlyxLiveDotPulse { 0% { box-shadow: 0 0 0 0 rgba(76,175,80,0.6); } 70% { box-shadow: 0 0 0 6px rgba(76,175,80,0); } 100% { box-shadow: 0 0 0 0 rgba(76,175,80,0); } }`}</style>}
            {currentlyLive.length > 0 && (
              <button onClick={() => setSegment("live")} disabled={!showBoth}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: showBoth ? "pointer" : "default", fontFamily: "'Inter', sans-serif" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4CAF50", flexShrink: 0, boxShadow: "0 0 6px #4CAF50", animation: "gemlyxLiveDotPulse 1.6s ease-in-out infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#4CAF50", textTransform: "uppercase", letterSpacing: 0.5, opacity: showBoth && !isLive ? 0.5 : 1 }}>Live Events</span>
              </button>
            )}
            {showBoth && <span style={{ fontSize: 11, color: C.border, fontWeight: 700 }}>|</span>}
            {comingSoon.length > 0 && (
              <button onClick={() => setSegment("coming")} disabled={!showBoth}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: showBoth ? "pointer" : "default", fontFamily: "'Inter', sans-serif" }}>
                {currentlyLive.length === 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.gold, flexShrink: 0 }} />}
                <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 0.5, opacity: showBoth && isLive ? 0.5 : 1 }}>{comingLabel}</span>
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, marginBottom: 8, WebkitOverflowScrolling: "touch" }}>
            {showList.map(e => (
              <button key={e.name} onClick={() => setEventDetail(e)}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                <span style={{ fontSize: 13 }}>{e.emoji}</span>
                <span style={{ fontSize: 12, color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>{e.name}</span>
                <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>{getEventDate(e.date, e.dateEnd)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!nearYou && (
        <button onClick={requestLocation} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "4px 0", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          <span style={{ fontSize: 12, color: C.light, fontWeight: 600 }}>📍 What's closest to me?</span>
        </button>
      )}
      {nearYou === "loading" && <div style={{ fontSize: 12, color: C.muted, padding: "4px 0" }}>Finding your location...</div>}
      {nearYou === "denied" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Couldn't get your location.</span>
          <button onClick={requestLocation} style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Try again</button>
        </div>
      )}
      {nearYou && typeof nearYou === "object" && (
        <div style={{ marginTop: 2 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 6 }}>📍 Events near you{nearYou.matches.length > 0 ? ` — ${nearYou.matches.length} upcoming within ~30 km` : ""}</div>
          {nearYou.matches.length === 0 && (
            <div style={{ fontSize: 11, color: C.muted }}>No upcoming events near {nearYou.town} right now — browse all under Events.</div>
          )}
          {nearYou.matches.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
              {nearYou.matches.map(item => (
                <button key={`${item._kind}-${item.name}`}
                  onClick={() => { item._kind === "event" ? setEventDetail(item) : item._kind === "free" ? setFreeDetail(item) : setFoodDetail(item); }}
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                  <span style={{ fontSize: 13 }}>{item.emoji}</span>
                  <span style={{ fontSize: 12, color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>{item.name}</span>
                  <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>{item._kind === "event" ? getEventDate(item.date, item.dateEnd) : `~${Math.round(item._km)} km`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


