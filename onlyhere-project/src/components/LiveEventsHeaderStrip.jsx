import { useState } from "react";
import { C } from "../utils/theme";
import { getEventDate, isUpcoming, isCurrentlyLive, isInDenmark } from "../utils/helpers";

export const LiveEventsHeaderStrip = ({ liveInfo, liveInfoLoading, checkLiveInfo, nearYou, requestLocation, setEventDetail, setFreeDetail, setFoodDetail, userCoords }) => {
  const [openEvent, setOpenEvent] = useState(null);
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
  const showList = currentlyLive.length > 0 ? currentlyLive : comingSoon.slice(0, 6);
  const isLive = currentlyLive.length > 0;

  return (
    <div style={{ marginTop: 4, marginBottom: 2 }}>
      {showList.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: isLive ? "#4CAF50" : C.gold, flexShrink: 0, boxShadow: isLive ? "0 0 6px #4CAF50" : "none" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: isLive ? "#4CAF50" : C.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{isLive ? "Live Events" : isInDenmark(userCoords) ? "Coming Up Near You" : "Coming Events"}</span>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, marginBottom: 8 }}>
            {showList.map(e => (
              <button key={e.name} onClick={() => setOpenEvent(e)}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 12px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <span style={{ fontSize: 13 }}>{e.emoji}</span>
                <span style={{ fontSize: 12, color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>{e.name}</span>
                <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>{getEventDate(e.date, e.dateEnd)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!nearYou && (
        <button onClick={requestLocation} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "4px 0", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <span style={{ fontSize: 12, color: C.light, fontWeight: 600 }}>📍 What's closest to me?</span>
        </button>
      )}
      {nearYou === "loading" && <div style={{ fontSize: 12, color: C.muted, padding: "4px 0" }}>Finding your location...</div>}
      {nearYou === "denied" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Couldn't get your location.</span>
          <button onClick={requestLocation} style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Try again</button>
        </div>
      )}
      {nearYou && typeof nearYou === "object" && (
        <div style={{ marginTop: 2 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 6 }}>📍 Events near you{nearYou.matches.length > 0 ? ` — ${nearYou.matches.length} upcoming within ~30 km` : ""}</div>
          {nearYou.matches.length === 0 && (
            <div style={{ fontSize: 11, color: C.muted }}>No upcoming events near {nearYou.town} right now — browse all under Events.</div>
          )}
          {nearYou.matches.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {nearYou.matches.map(item => (
                <button key={`${item._kind}-${item.name}`}
                  onClick={() => { item._kind === "event" ? setEventDetail(item) : item._kind === "free" ? setFreeDetail(item) : setFoodDetail(item); }}
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 12px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span style={{ fontSize: 13 }}>{item.emoji}</span>
                  <span style={{ fontSize: 12, color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>{item.name}</span>
                  <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>{item._kind === "event" ? getEventDate(item.date, item.dateEnd) : `~${Math.round(item._km)} km`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {openEvent && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(5,8,16,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "70px 16px" }} onClick={() => setOpenEvent(null)}>
          <div style={{ width: "100%", maxWidth: 420, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>{openEvent.emoji} {openEvent.name}</div>
              <button onClick={() => checkLiveInfo(openEvent)} disabled={liveInfoLoading === openEvent.name}
                style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 100, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}>
                {liveInfoLoading === openEvent.name ? "Checking..." : "🔍 Check"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, marginBottom: liveInfo?.[openEvent.name] ? 12 : 4 }}>{getEventDate(openEvent.date, openEvent.dateEnd)}</div>
            {liveInfo?.[openEvent.name] && <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: 14 }}>{liveInfo[openEvent.name]}</div>}
            <button onClick={() => setOpenEvent(null)} style={{ display: "block", width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.light, borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


