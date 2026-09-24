import { GemlyxMark } from "./GemlyxLogo";

// ── "MY FRIEND SIGNED INTO MY WEBSITE BUT ASKED 'WHERE IS THE AI'" ──
//
// Oliver, 24 Sep 2026. The answer turned out not to be that it was hidden. The
// Detour button sits outside the scrolling nav strip and is always on screen,
// which he fixed on 5 September, and his friend looked straight at it and
// asked anyway. The label was the problem and the label was changed: see
// nav.ai in utils/uiLanguage.js.
//
// THIS IS THE OTHER HALF, and it answers the reader the header cannot. A
// visitor four screens into a town page has the header above the fold and
// nothing in front of them, and the one place this product already puts a
// plain-language door in the corner is the guide page, where it works. So the
// same door goes on every page.
//
// ── AND IT IS A DOOR, NOT A SECOND CHAT ─────────────────────────────
//
// It opens the Detour rather than starting a conversation of its own. Two chat
// surfaces on one site is two histories, two quotas and two places to ask the
// same question, and the Detour is the one with the whole library behind it.
// AskGemlyx, the per-entry asker, says the same thing in its own words: "the
// honest place for a general trip question is Gemlyx Detour, which already
// exists."
//
// ── NOT ON THE PAGE IT OPENS ────────────────────────────────────────
//
// A button that takes you where you already are is furniture. The caller
// decides, because the caller knows which tab is showing, and this stays a
// component that draws a button.
export const AskGemlyxLauncher = ({ C, onOpen, label = "Ask Gemlyx" }) => (
  <button onClick={onOpen} aria-label={label}
    /* Bottom LEFT. The right corner already belongs to the guide page's own
       chat launcher, to the preview chat, and to the cookie and quota strips,
       and a second thing appearing under a reader's thumb in the same place
       depending on which page they are on is worse than no button. */
    style={{
      position: "fixed", bottom: 16, left: 16, zIndex: 940,
      display: "flex", alignItems: "center", gap: 8,
      background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
      border: `1px solid ${C.gold}55`, color: C.text,
      borderRadius: 100, padding: "11px 17px 11px 13px",
      fontSize: 13, fontWeight: 700, cursor: "pointer",
      boxShadow: "0 8px 26px rgba(0,0,0,0.55)", fontFamily: "'Inter', sans-serif",
      maxWidth: "calc(100vw - 32px)", whiteSpace: "nowrap",
    }}>
    <GemlyxMark size={20} ring={true} ringColor={C.gold} tone="gold" />
    {label}
  </button>
);
