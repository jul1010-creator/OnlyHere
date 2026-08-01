// ─── GEMLYX BRAND MARK ───────────────────────────────────────────
// Oliver's logo (Aug 2026): an eight-point compass-rose gem in aurora teal,
// inside a thin ring, with a custom geometric GEMLYX wordmark. Extracted from
// his animated hero file (gemlyxhero_2.html) so every part of the app renders
// the identical artwork: nav, hero, footer, favicon, and the loader.
//
// Components:
//   <GemlyxMark size ring />        — the compass gem, optionally with ring
//   <GemlyxWordmark height color /> — the GEMLYX letter paths
//   <GemlyxLogo size />             — mark + wordmark lockup (nav / footer)
//   <GemlyxLoader size />           — the mark as a loading icon: gem spins,
//                                     ring runs as a chasing arc
const TEAL_BRIGHT = "#2DD4BF";
const TEAL_MID = "#14B8A6";
const TEAL_DEEP = "#0E9384";

// The gem itself, drawn in the logo file's 120×120 coordinate space.
const GemCore = () => (
  <g transform="translate(12,12) scale(0.8)">
    {[45, 135, 225, 315].map(r => (
      <g key={r} transform={`rotate(${r} 60 60)`}>
        <path d="M 60 30 L 70 60 L 60 60 Z" fill={TEAL_DEEP} />
        <path d="M 60 30 L 50 60 L 60 60 Z" fill={TEAL_DEEP} opacity="0.55" />
      </g>
    ))}
    {[0, 90, 180, 270].map(r => (
      <g key={r} transform={`rotate(${r} 60 60)`}>
        <path d="M 60 8 L 75 60 L 60 60 Z" fill={TEAL_BRIGHT} />
        <path d="M 60 8 L 45 60 L 60 60 Z" fill={TEAL_MID} />
      </g>
    ))}
    <g transform="rotate(45 60 60)">
      <rect x="51.5" y="51.5" width="17" height="17" fill="rgba(10,15,30,0.5)" stroke={TEAL_BRIGHT} strokeWidth="3" />
    </g>
  </g>
);

export const GemlyxMark = ({ size = 24, ring = true, ringColor = "#EDF0F7", style }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }} aria-label="Gemlyx">
    {ring && <circle cx="60" cy="60" r="54" fill="none" stroke={ringColor} strokeWidth="4" opacity="0.9" />}
    <GemCore />
  </svg>
);

// Oliver's custom GEMLYX letterforms, verbatim from the logo file.
export const GemlyxWordmark = ({ height = 13, color = "#EDF0F7", style }) => (
  <svg height={height} viewBox="0 -52 390 54" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }} aria-label="GEMLYX" fill={color}>
    <path d="M45.36 -35.64Q43.199999999999996 -40.608 38.77199999999999 -43.452Q34.343999999999994 -46.296 28.368 -46.296Q22.752 -46.296 18.287999999999997 -43.70399999999999Q13.823999999999998 -41.111999999999995 11.232 -36.324Q8.639999999999999 -31.535999999999998 8.639999999999999 -25.2Q8.639999999999999 -18.863999999999997 11.232 -14.04Q13.823999999999998 -9.216 18.287999999999997 -6.624Q22.752 -4.032 28.368 -4.032Q33.623999999999995 -4.032 37.836 -6.3Q42.047999999999995 -8.568 44.604 -12.779999999999998Q47.16 -16.991999999999997 47.519999999999996 -22.607999999999997H26.351999999999997V-26.712H52.848V-23.04Q52.488 -16.416 49.248 -11.052Q46.007999999999996 -5.688 40.571999999999996 -2.5919999999999996Q35.135999999999996 0.504 28.368 0.504Q21.383999999999997 0.504 15.695999999999998 -2.7719999999999994Q10.008 -6.047999999999999 6.731999999999999 -11.915999999999999Q3.4559999999999995 -17.784 3.4559999999999995 -25.2Q3.4559999999999995 -32.616 6.731999999999999 -38.483999999999995Q10.008 -44.352 15.695999999999998 -47.628Q21.383999999999997 -50.903999999999996 28.368 -50.903999999999996Q36.431999999999995 -50.903999999999996 42.48 -46.872Q48.528 -42.839999999999996 51.263999999999996 -35.64Z" />
    <path d="M91.58399999999999 -46.224V-27.432H110.66399999999999V-23.255999999999997H91.58399999999999V-4.175999999999999H112.82399999999998V0.0H86.544V-50.4H112.82399999999998V-46.224Z" />
    <path d="M196.416 -49.68V0.0H191.37599999999998V-39.672L173.664 0.0H169.992L152.28 -39.528V0.0H147.23999999999998V-49.68H152.56799999999998L171.79199999999997 -6.624L191.016 -49.68Z" />
    <path d="M237.38400000000001 -4.104H255.456V0.0H232.344V-50.327999999999996H237.38400000000001Z" />
    <path d="M320.4 -50.327999999999996 304.272 -19.584V0.0H299.23199999999997V-19.584L282.96 -50.327999999999996H288.64799999999997L301.75199999999995 -24.191999999999997L314.784 -50.327999999999996Z" />
    <path d="M370.36799999999994 -25.127999999999997 385.63199999999995 0.0H380.01599999999996L367.19999999999993 -21.023999999999997L355.0319999999999 0.0H349.41599999999994L364.60799999999995 -25.343999999999998L349.41599999999994 -50.327999999999996H355.0319999999999L367.77599999999995 -29.375999999999998L380.08799999999997 -50.327999999999996H385.70399999999995Z" />
  </svg>
);

// Nav / footer lockup: gem + wordmark side by side.
export const GemlyxLogo = ({ size = 20, color = "#EDF0F7", gap = 8, style }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap, ...style }}>
    <GemlyxMark size={size} ring={true} ringColor={color} />
    <GemlyxWordmark height={size * 0.62} color={color} />
  </span>
);

// The loading icon — Oliver's ask: the logo IS the loader. The gem spins with
// the same easing feel as his hero intro, and the ring becomes a chasing arc.
// Keyframes are injected once per mount under gx- names to avoid collisions.
export const GemlyxLoader = ({ size = 40, label, style }) => (
  <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10, ...style }}>
    <style>{`
      @keyframes gxGemSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes gxRingChase { 0% { transform: rotate(-90deg); } 100% { transform: rotate(270deg); } }
      @media (prefers-reduced-motion: reduce) { .gx-spin, .gx-chase { animation: none !important; } }
    `}</style>
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ display: "block" }} aria-label={label || "Loading"} role="img">
      <circle cx="60" cy="60" r="54" fill="none" stroke="#EDF0F7" strokeWidth="4" opacity="0.15" />
      <g className="gx-chase" style={{ transformOrigin: "60px 60px", animation: "gxRingChase 1.4s linear infinite" }}>
        <circle cx="60" cy="60" r="54" fill="none" stroke={TEAL_BRIGHT} strokeWidth="4" strokeLinecap="round" strokeDasharray="90 249.3" />
      </g>
      <g className="gx-spin" style={{ transformOrigin: "60px 60px", animation: "gxGemSpin 2.8s cubic-bezier(0.45, 0.05, 0.35, 0.95) infinite" }}>
        <GemCore />
      </g>
    </svg>
    {label && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "#64708C" }}>{label}</span>}
  </span>
);

export default GemlyxLogo;
