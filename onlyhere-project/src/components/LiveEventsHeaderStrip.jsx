import { useState } from "react";
import { C } from "../theme.js";
import { isCurrentlyLive, isUpcoming } from "../utils/dateHelpers.js";
import { events } from "../data/events.js";
import { majorEvents } from "../data/majorEvents.js";
import { vikingEvents } from "../data/vikingEvents.js";

export const LiveEventsHeaderStrip = ({ liveInfo, liveInfoLoading, checkLiveInfo }) => {
  const [open, setOpen] = useState(false);
  const allTracked = [...events, ...majorEvents, ...vikingEvents];
  const currentlyLive = allTracked.filter(e => isCurrentlyLive(e.date, e.dateEnd));
  const comingSoon = allTracked.filter(e => isUpcoming(e.date) && !isCurrentlyLive(e.date, e.dateEnd)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const headline = currentlyLive[0] || comingSoon[0];
  if (!headline) return null;

  const EventRow = (e) => (
    <div key={e.name} style={{ borderTop: `1px solid ${C.border}`, padding: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: liveInfo?.[e.name] ? 8 : 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{e.emoji} {e.name}</div>
        <button onClick={() => checkLiveInfo(e)} disabled={liveInfoLoading === e.name}
          style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 100, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}>
          {liveInfoLoading === e.name ? "Checking..." : "🔍 Check"}
        </button>
      </div>
      {liveInfo?.[e.name] && <div style={{ fontSize: 12, color: C.light, lineHeight: 1.5 }}>{liveInfo[e.name]}</div>}
    </div>
  );

  return (
    <div style={{ marginTop: 2 }}>
      <button onClick={() => setOpen(true)}
        style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", padding: "6px 0", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", width: "100%", textAlign: "left" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: currentlyLive.length ? "#4CAF50" : C.gold, flexShrink: 0, boxShadow: currentlyLive.length ? "0 0 6px #4CAF50" : "none" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: currentlyLive.length ? "#4CAF50" : C.gold, textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>{currentlyLive.length ? "Live" : "Coming"}</span>
        <span style={{ fontSize: 13, color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{headline.emoji} {headline.name}</span>
        <span style={{ marginLeft: "auto", color: C.muted, fontSize: 13, flexShrink: 0 }}>›</span>
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(5,8,16,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "70px 16px" }} onClick={() => setOpen(false)}>
          <div style={{ width: "100%", maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            {currentlyLive.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4CAF50", flexShrink: 0 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>Current Live Events</div>
                </div>
                {currentlyLive.slice(0, 4).map(EventRow)}
              </div>
            )}
            {comingSoon.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, flexShrink: 0 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>Coming Events</div>
                </div>
                {comingSoon.slice(0, 4).map(EventRow)}
              </div>
            )}
            <button onClick={() => setOpen(false)} style={{ display: "block", width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

