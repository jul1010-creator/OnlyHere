import { useEffect } from "react";
import { C } from "../utils/theme";
import { outboundLink } from "../utils/affiliates";
import { PARTNER_OPENER, PARTNER_INTRO } from "../utils/partnerSheet";

// ── THE PANEL THE PAID DOORS MOVED INTO ─────────────────────────────
//
// Oliver, 21 Sep 2026: "When you click it, it then pops out into the side of
// the panel." A drawer from the right, over the guide rather than instead of
// it, closed by the button, the backdrop or Escape. Full width on a phone,
// where a side panel narrower than the screen is a panel nobody can read.
//
// THE SENTENCES ABOUT MONEY ARE AT THE FOOT, ONCE EACH. Read off the doors in
// the panel, so it can never say "this pays us" over links that do not, and
// never stays silent over ones that do. Same rule every paid link on the site
// keeps, said once instead of once per button.
export const PartnerSheet = ({ open, sections = [], onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const notes = [...new Set(sections.flatMap(s => s.items.map(i => outboundLink(i.href).note)).filter(Boolean))];
  return (
    <div role="dialog" aria-modal="true" aria-label={PARTNER_OPENER}
      style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(5,8,16,0.55)" }} />
      <div style={{ position: "relative", width: "min(440px, 100vw)", height: "100%", overflowY: "auto", background: C.bg, borderLeft: `1px solid ${C.border}`, padding: "18px 18px 28px", boxShadow: "-12px 0 32px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ flex: 1, fontSize: 19, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text }}>{PARTNER_OPENER}</div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, width: 32, height: 32, fontSize: 15, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 14 }}>{PARTNER_INTRO}</div>
        {sections.map(s => (
          <div key={s.key} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>{s.title}</div>
            {s.items.map((it, i) => {
              const o = outboundLink(it.href);
              return (
                <div key={`${s.key}-${i}`} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{it.title}</div>
                  {it.detail && <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 2 }}>{it.detail}</div>}
                  <a href={o.href || it.href} target="_blank" rel={o.rel}
                    style={{ display: "inline-flex", alignItems: "center", marginTop: 8, background: `${C.gold}1a`, border: `1px solid ${C.gold}66`, color: C.gold, borderRadius: 100, padding: "6px 13px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                    {it.label} ↗
                  </a>
                </div>
              );
            })}
          </div>
        ))}
        {notes.map(n => (
          <div key={n} style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 6 }}>{n}</div>
        ))}
      </div>
    </div>
  );
};

// The way in. A pill rather than a link in prose, so it reads as the thing a
// reader chooses to open, and gold-outlined like every other control on the
// guide so it does not shout louder than the guide it sits in.
export const PartnerOpener = ({ count = 0, onOpen, label = PARTNER_OPENER, style = null }) => {
  if (!count) return null;
  return (
    <button onClick={onOpen}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: `1px solid ${C.gold}66`, color: C.gold, borderRadius: 100, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", ...(style || {}) }}>
      {label} <span style={{ color: C.muted, fontWeight: 600 }}>· {count}</span> ›
    </button>
  );
};
