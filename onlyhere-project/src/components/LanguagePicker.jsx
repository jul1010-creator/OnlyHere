import { useState, useRef, useEffect } from "react";
import { UI_LANGUAGES, uiLanguageMeta, t } from "../utils/uiLanguage";

// ── THE FLAGS, DRAWN RATHER THAN TYPED ──────────────────────────────
//
// Oliver asked for flags. The first version used the emoji, 🇬🇧 🇩🇰 🇩🇪, and on
// his own screen they rendered as "GB", "DK", "DE".
//
// That is not a bug in the emoji. WINDOWS HAS NO FLAG GLYPHS. A flag emoji is
// two regional-indicator letters, and every platform except Windows ships a font
// that draws the pair as a flag; Windows ships none, so Chrome falls back to
// drawing the letters themselves. Nothing in CSS or in a font stack fixes it,
// and it is not a fallback that can be detected and worked around either.
//
// So they are SVG. Three rectangles and some lines, no network, no font, and
// they render identically on his laptop, on a phone and on a Mac. The endonym
// beside each one is what carries the meaning anyway: a flag is a country and a
// language is not, and 🇩🇪 is not read as "German" by an Austrian.
const FLAGS = {
  // Dannebrog: the cross sits toward the hoist rather than centred.
  da: (
    <>
      <rect width="20" height="14" fill="#C8102E" />
      <rect x="6" width="2.6" height="14" fill="#fff" />
      <rect y="5.7" width="20" height="2.6" fill="#fff" />
    </>
  ),
  // Schwarz-Rot-Gold, in thirds.
  de: (
    <>
      <rect width="20" height="4.67" fill="#000" />
      <rect y="4.67" width="20" height="4.66" fill="#DD0000" />
      <rect y="9.33" width="20" height="4.67" fill="#FFCE00" />
    </>
  ),
  // The Union Flag, simplified to what reads at twenty pixels: the saltires
  // drawn as strokes, then the cross of St George over them.
  en: (
    <>
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#C8102E" strokeWidth="1.4" />
      <rect x="7.6" width="4.8" height="14" fill="#fff" />
      <rect y="4.6" width="20" height="4.8" fill="#fff" />
      <rect x="8.7" width="2.6" height="14" fill="#C8102E" />
      <rect y="5.7" width="20" height="2.6" fill="#C8102E" />
    </>
  ),
};

export const Flag = ({ code, size = 15 }) => {
  const art = FLAGS[code];
  if (!art) return null;
  return (
    // A border, because two of the three are white at an edge and the header is
    // dark. Without it the Dannebrog loses its right side into the background.
    <svg width={size} height={size * 0.7} viewBox="0 0 20 14" aria-hidden="true"
      style={{ display: "block", borderRadius: 2, border: "1px solid rgba(255,255,255,0.18)", flexShrink: 0 }}>
      {art}
    </svg>
  );
};

// ── AND IT BELONGS IN THE MENU, NOT THE BAR ─────────────────────────
//
// Oliver, 5 Sep 2026: "Why did you move it from the top header to the burger
// menu? I prefer the header.. just put the language options into the burger
// menu under the theme option. And then put back the navigations to the header."
//
// He is right and the trade was mine to notice rather than his. A picker in the
// header cost about fifty-six pixels of the one row that was already the tightest
// thing on the page, and paying for it with the eight page links was paying with
// the wrong thing: the nav is what people use on every visit and the language is
// what they set once.
//
// So it is a row in the menu, under Theme, and it is built like the theme
// swatches rather than as a dropdown. Same reason that block gives for showing
// three colours instead of a select: the choice is small, closed and visual, so
// showing all of it IS the control. A dropdown inside a dropdown would also be
// the second one on that panel to need opening.
export const LanguageChoice = ({ lang, onChange, C }) => (
  <div style={{ display: "flex", gap: 6, padding: "0 12px 10px" }}>
    {UI_LANGUAGES.map(l => {
      const on = l.code === lang;
      return (
        <button key={l.code} onClick={() => onChange(l.code)} aria-pressed={on} title={l.name}
          style={{
            flex: 1, background: "transparent", border: `1px solid ${on ? C.gold : C.border}`,
            borderRadius: 10, padding: "7px 6px 6px", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 5,
          }}>
          <Flag code={l.code} size={18} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: on ? C.gold : C.muted }}>{l.name}</span>
        </button>
      );
    })}
  </div>
);
