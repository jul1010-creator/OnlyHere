// ── THE GEMLYX MARK, TURNING SLOWLY BEHIND EXPLORE ──────────────────
//
// Oliver, 14 Oct 2026: "make the background a spinning Gemlyx Logo", then
// "Can the background be more visible?", then "Why does background look so
// cartoonish?"
//
// It did because it was the badge-sized logo blown up to 720px: a ring as
// thick as a finger and an outline round the centre to match, all of it greyed
// down by opacity. Then a fine-line drawing of the gem, and his answer to that:
// "It looks good but.. it needs to be the Gemlyx icon." So it is the icon
// itself again (GemlyxLogo.jsx, GemlyxMark): the light ring and the gold
// points in their own colours, as in the header, with only the two outlines
// thinned to what a large drawing needs, and a soft gold glow behind it.
//
// Then, the same day, "make the spinning Gemlyx logo non-cartoonish": the
// icon is now drawn as cut gold (GemlyxMarkFine), not flat stickers, and
// quieter here, since the banner over it now shows the mark at full strength.
//
// It stays put while the page scrolls (sticky inside the page's own box, so it
// works inside the swiping pager, where a fixed one would scroll away), never
// takes a tap, and stands still for anybody whose phone asks for less motion.
//
// DESIGN REVIEW, 15 OCT 2026. Set beside hivecph.dk and lidl.dk, both of
// which put their tiles on a plain ground: at 0.22 the points of the mark ran
// between the circles and under the tile names (see
// design_before_circles_zoom.png), and its glow lit the first row of tiles
// from behind. The mark is now the strength of a watermark, 0.14, with a
// glow at half what it was. It is still there on every screen; it no longer
// argues with what is on top of it. One number to change if Oliver wants it
// stronger again.
import { C } from "../utils/theme";
import { GemlyxMarkFine } from "./GemlyxLogo";

export const SPIN_SECONDS = 90;

const Glow = ({ gold = C.gold }) => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
    <defs>
      <radialGradient id="gx-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={gold} stopOpacity="0.1" />
        <stop offset="60%" stopColor={gold} stopOpacity="0.03" />
        <stop offset="100%" stopColor={gold} stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="60" fill="url(#gx-glow)" />
  </svg>
);

export const SpinningMark = ({ opacity = 0.14 }) => (
  <div aria-hidden="true" data-testid="spinning-mark"
    style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "clip" }}>
    <style>{`@keyframes gx-spin { to { transform: rotate(360deg); } } .gx-spin { animation: gx-spin ${SPIN_SECONDS}s linear infinite; } @media (prefers-reduced-motion: reduce) { .gx-spin { animation: none; } }`}</style>
    <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="gx-spin" style={{ position: "relative", width: "min(120vw, 720px)", aspectRatio: "1 / 1", opacity }}>
        <Glow />
        <GemlyxMarkFine id="gx-bg" style={{ position: "relative" }} />
      </div>
    </div>
  </div>
);

export default SpinningMark;
