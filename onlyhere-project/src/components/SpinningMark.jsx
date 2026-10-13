// ── THE GEMLYX MARK, TURNING SLOWLY BEHIND EXPLORE ──────────────────
//
// Oliver, 14 Oct 2026: "make the background a spinning Gemlyx Logo." The mark
// sits behind the page, large and faint, turning once a minute and a half, so
// it reads as the room the deals are in rather than as something to look at.
// It stays put while the page scrolls (sticky inside the page's own box, so it
// works inside the swiping pager, where a fixed one would scroll away), never
// takes a tap, and stands still for anybody whose phone asks for less motion.
import { C } from "../utils/theme";
import { GemlyxMark } from "./GemlyxLogo";

export const SPIN_SECONDS = 90;

export const SpinningMark = ({ opacity = 0.07 }) => (
  <div aria-hidden="true" data-testid="spinning-mark"
    style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "clip" }}>
    <style>{`@keyframes gx-spin { to { transform: rotate(360deg); } } .gx-spin { animation: gx-spin ${SPIN_SECONDS}s linear infinite; } @media (prefers-reduced-motion: reduce) { .gx-spin { animation: none; } }`}</style>
    <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="gx-spin" style={{ width: "min(120vw, 720px)", aspectRatio: "1 / 1", opacity }}>
        <GemlyxMark size="100%" ringColor={C.text} />
      </div>
    </div>
  </div>
);

export default SpinningMark;
