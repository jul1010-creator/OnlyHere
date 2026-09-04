import { useState, useRef, useEffect } from "react";
import { UI_LANGUAGES, uiLanguageMeta, t } from "../utils/uiLanguage";

// ── THE FLAGS, IN THE RIGHT CORNER ──────────────────────────────────
//
// Oliver, 4 Sep 2026: "Put flags in the right corner as 'languages' for the
// interface."
//
// Sits at the head of the header's right cluster, so the order reads
// [flags][search][menu] and the burger keeps the corner it has always had.
// Above 1080px the pages are along the top; below it they are in the burger,
// and this control is in the same place either way, which is the point of
// putting it in the cluster rather than in the nav.
//
// ── A FLAG IS A COUNTRY AND A LANGUAGE IS NOT ───────────────────────
//
// Worth writing down rather than discovering later: 🇩🇪 is not read as "German"
// by an Austrian and 🇬🇧 is not read as "English" by an American. The endonym
// beside it is what carries the meaning, and the flag is what makes it findable
// at a glance in a header full of words. So the closed button shows the flag
// alone, and every row in the open list shows FLAG PLUS THE LANGUAGE'S OWN NAME.
// Somebody who cannot read the interface cannot read "Danish" either, and can
// read "Dansk".
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
          padding: "6px 9px", fontSize: 14, cursor: "pointer", lineHeight: 1,
          fontFamily: "'Inter', sans-serif",
        }}>
        <span style={{ fontSize: 15 }}>{current.flag}</span>
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
              <span style={{ fontSize: 15 }}>{l.flag}</span>
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
