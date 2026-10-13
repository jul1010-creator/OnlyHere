// ── "BEING REWORKED" ────────────────────────────────────────────────
// What the Danish pages show while DENMARK_REWORK in config.js is true
// (Oliver, 13 Oct 2026). Short on purpose: no country, no plans, nothing to
// explain. Nothing on the Danish site is deleted; the switch brings it back.
import { C } from "../utils/theme";
import { GemlyxMark, GemlyxWordmark } from "../components/GemlyxLogo";

export const ReworkPage = () => (
  <div data-testid="rework-page" style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", boxSizing: "border-box" }}>
    <div style={{ maxWidth: 420, textAlign: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <GemlyxMark size={56} />
        <GemlyxWordmark height={15} />
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.15, margin: "0 0 12px" }}>We are reworking Gemlyx</h1>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: C.light, margin: "0 0 26px" }}>Back soon.</p>
      <a href="mailto:hello@gemlyxtravel.com" style={{ fontSize: 13, fontWeight: 700, color: C.gold, textDecoration: "none" }}>hello@gemlyxtravel.com</a>
    </div>
  </div>
);

export default ReworkPage;
