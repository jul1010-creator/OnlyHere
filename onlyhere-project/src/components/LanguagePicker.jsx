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

// ── THE PICKER, IN THE RIGHT CORNER ─────────────────────────────────
//
// Oliver, 4 Sep 2026: "Put flags in the right corner as 'languages' for the
// interface."
//
// Sits at the head of the header's right cluster, so the order reads
// [flag][search][menu] and the burger keeps the corner it has always had. Above
// the language's own breakpoint the pages are along the top; below it they are
// in the burger, and this control is in the same place either way, which is why
// it is in the cluster rather than in the nav.
export const LanguagePicker = ({ lang, onChange, C }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const current = uiLanguageMeta(lang);

  // Closing on an outside press, because this opens on click rather than on
  // hover and a dropdown you can only close with the control that opened it is
  // the one people tap twice and give up on.
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      {/* aria-label carries the word "Language" in the language being rendered,
          so a screen reader in Danish does not announce an English label for the
          one control whose whole job is to change the language. */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={t("header.language", lang)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t("header.language", lang)}
        style={{
          display: "flex", alignItems: "center", gap: 5, background: "none",
          border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8,
          padding: "6px 8px", cursor: "pointer", lineHeight: 1,
          fontFamily: "'Inter', sans-serif",
        }}>
        <Flag code={current.code} />
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="3" strokeLinecap="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div role="listbox" aria-label={t("header.chooseLanguage", lang)}
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 300,
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
            boxShadow: "0 18px 50px rgba(0,0,0,0.55)", overflow: "hidden", minWidth: 168,
          }}>
          {UI_LANGUAGES.map(l => (
            <button key={l.code} role="option" aria-selected={l.code === current.code}
              onClick={() => { onChange(l.code); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 9, width: "100%",
                background: l.code === current.code ? `${C.gold}14` : "none",
                border: "none", borderBottom: `1px solid ${C.border}`,
                color: l.code === current.code ? C.text : C.light,
                padding: "10px 13px", fontSize: 13, cursor: "pointer",
                fontWeight: l.code === current.code ? 700 : 500,
                fontFamily: "'Inter', sans-serif", textAlign: "left",
              }}>
              <Flag code={l.code} size={17} />
              <span style={{ flex: 1 }}>{l.name}</span>
              {/* The tick, so the current one is readable without relying on the
                  weight and the tint alone. */}
              {l.code === current.code && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
