import { useState } from "react";
import { alertCountLine } from "../utils/weatherAlerts";

// ── A BELL, NOT A CARD OVER THE PAGE ────────────────────────────────
//
// Oliver, 5 Sep 2026: "this tip in the right corner keeps popping up... Let it
// be a notification like this", with a bell carrying a red count.
//
// What was there was a 300px card sitting over the front page, for something
// that is by definition not urgent: it is about a day that has not happened
// yet, on a trip that is not today. A bell is the right weight for that. It is
// visible, it is countable, and it says nothing until it is asked.
//
// Closed it is one button. Open it is the list, and each notice closes for good
// rather than until the next render.
export const WeatherBell = ({ alerts, onDismiss, C }) => {
  const [open, setOpen] = useState(false);
  if (!alerts.length) return null;

  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 600, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={alertCountLine(alerts.length)}
        aria-expanded={open}
        title={alertCountLine(alerts.length)}
        style={{
          position: "relative", width: 40, height: 40, borderRadius: "50%",
          background: C.surface, border: `1px solid ${C.border}`,
          boxShadow: "0 6px 20px rgba(0,0,0,0.35)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
        }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* The count, which is the whole reason a bell reads as a notification
            rather than as a settings icon. */}
        <span style={{
          position: "absolute", top: -3, right: -3, minWidth: 17, height: 17,
          borderRadius: 100, background: "#E5484D", color: "#fff",
          fontSize: 10.5, fontWeight: 700, lineHeight: "17px", textAlign: "center",
          padding: "0 4px", fontFamily: "'Inter', sans-serif",
          border: `2px solid ${C.bg}`, boxSizing: "content-box",
        }}>{alerts.length}</span>
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
          {alerts.map(a => (
            <div key={a.id} style={{ background: C.surface, border: `1px solid ${a.newRisk === "high" ? "#FFB347" : C.border}`, borderRadius: 12, padding: "12px 14px", boxShadow: "0 8px 28px rgba(0,0,0,0.4)", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2 }}>{a.guideTitle}</div>
                {/* The numbers, rather than a comparative adjective. See
                    describeWeatherChange in utils/weatherAlerts.js. */}
                <div style={{ fontSize: 11.5, color: C.light, lineHeight: 1.5 }}>{a.line}</div>
              </div>
              {/* Closes for good: the key is written to storage, so the next
                  mount does not rebuild the same notice. */}
              <button onClick={() => onDismiss(a.id)} aria-label="Dismiss"
                style={{ background: "none", border: "none", color: C.muted, fontSize: 14, cursor: "pointer", padding: 0, flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
