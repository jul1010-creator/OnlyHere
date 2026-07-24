import { C } from "../utils/theme";

export const GemlyxFindCard = ({ text }) => {
  if (!text) return null;
  return (
    <div style={{ background: `linear-gradient(135deg, ${C.gold}14, ${C.accent}0A)`, border: `1px solid ${C.gold}44`, borderRadius: 14, padding: "16px", marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>✦ Gemlyx Find</div>
      <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
};

// A real, public reviews section attachable to any detail page — same trust
// pattern as the Suggestions feature (anonymous, public insert, publicly
// readable — genuine visitor opinion, not a factual claim Gemlyx is vouching for).