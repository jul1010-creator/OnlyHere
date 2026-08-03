import { C } from "../utils/theme";

// Redesign pass: one chip language everywhere. Quiet outline when idle,
// solid ink fill when active (dark text on light) — no colored dots, no
// per-chip tint. The `color` prop is kept for API compatibility but now
// only subtly tints the active fill's border when provided.
// NOTE, found while extracting this to its own file: the comment above says
// `color` tints the active border, but the border line below never actually
// reads the `color` prop — it's a dead/unused parameter today. Left exactly
// as-is here (not a behavior change this pass), flagging for a real fix later.
export const Pill = ({ label, active, onClick, color }) => (
  <button onClick={onClick} style={{
    display: "inline-flex", alignItems: "center", gap: 7,
    background: active ? C.text : "transparent",
    color: active ? C.bg : C.light,
    border: `1px solid ${active ? C.text : C.border}`,
    borderRadius: 100, padding: "7px 15px", fontSize: 12.5, fontWeight: active ? 700 : 500,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
    whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.16s ease",
  }}>
    {label}
  </button>
);
