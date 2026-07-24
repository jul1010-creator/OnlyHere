import { C } from "../utils/theme";

export const AtAGlanceCard = ({ rows }) => {
  const present = rows.filter(r => r.value);
  if (present.length === 0) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>📍 At a Glance</div>
      {present.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < present.length - 1 ? 10 : 0 }}>
          <span style={{ flexShrink: 0, width: 20 }}>{r.icon}</span>
          <div><span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{r.label}: </span><span style={{ fontSize: 12, color: C.light }}>{r.value}</span></div>
        </div>
      ))}
    </div>
  );
};

// Gemlyx Find — a distinct, branded callout for the one curated recommendation
// per entry, set apart visually from the rest of the writeup so it reads as
// "we picked this specifically for you," not just another paragraph.