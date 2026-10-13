// ── THE GEMLYX MARK, TURNING SLOWLY BEHIND EXPLORE ──────────────────
//
// Oliver, 14 Oct 2026: "make the background a spinning Gemlyx Logo", then
// "Can the background be more visible?", then "Why does background look so
// cartoonish?"
//
// It did because it was the badge-sized logo blown up to 720px: solid flat
// facets, a ring as thick as a finger, all of it greyed down by opacity. A
// small icon's boldness turns into clip art at that size. So the background is
// now the same compass gem drawn the way a watermark or an engraving is: hair-
// thin champagne lines along every edge of the facets, the facets themselves
// only a breath of gold, two fine rings, and a soft glow behind the centre.
// Same shape, no fill-and-outline cartoon.
//
// It stays put while the page scrolls (sticky inside the page's own box, so it
// works inside the swiping pager, where a fixed one would scroll away), never
// takes a tap, and stands still for anybody whose phone asks for less motion.
import { C } from "../utils/theme";

export const SPIN_SECONDS = 90;

// The logo file's gem (GemlyxLogo.jsx, GemCore), in its 120 by 120 space.
const LONG = [0, 90, 180, 270];
const SHORT = [45, 135, 225, 315];

export const MarkLines = ({ gold = C.gold }) => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
    <defs>
      <radialGradient id="gx-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={gold} stopOpacity="0.22" />
        <stop offset="55%" stopColor={gold} stopOpacity="0.05" />
        <stop offset="100%" stopColor={gold} stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="58" fill="url(#gx-glow)" />
    <circle cx="60" cy="60" r="54" fill="none" stroke={gold} strokeWidth="0.35" strokeOpacity="0.9" />
    <circle cx="60" cy="60" r="51.5" fill="none" stroke={gold} strokeWidth="0.15" strokeOpacity="0.6" />
    <g transform="translate(12,12) scale(0.8)" stroke={gold} strokeWidth="0.32" strokeLinejoin="round">
      {SHORT.map(r => (
        <g key={r} transform={`rotate(${r} 60 60)`}>
          <path d="M 60 30 L 70 60 L 60 60 Z" fill={gold} fillOpacity="0.05" />
          <path d="M 60 30 L 50 60 L 60 60 Z" fill={gold} fillOpacity="0.02" />
        </g>
      ))}
      {LONG.map(r => (
        <g key={r} transform={`rotate(${r} 60 60)`}>
          <path d="M 60 8 L 75 60 L 60 60 Z" fill={gold} fillOpacity="0.09" />
          <path d="M 60 8 L 45 60 L 60 60 Z" fill={gold} fillOpacity="0.03" />
        </g>
      ))}
      <g transform="rotate(45 60 60)">
        <rect x="51.5" y="51.5" width="17" height="17" fill="none" />
      </g>
    </g>
  </svg>
);

export const SpinningMark = ({ opacity = 0.55 }) => (
  <div aria-hidden="true" data-testid="spinning-mark"
    style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "clip" }}>
    <style>{`@keyframes gx-spin { to { transform: rotate(360deg); } } .gx-spin { animation: gx-spin ${SPIN_SECONDS}s linear infinite; } @media (prefers-reduced-motion: reduce) { .gx-spin { animation: none; } }`}</style>
    <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="gx-spin" style={{ width: "min(120vw, 720px)", aspectRatio: "1 / 1", opacity }}>
        <MarkLines />
      </div>
    </div>
  </div>
);

export default SpinningMark;
