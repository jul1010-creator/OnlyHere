// ── REDEEM OFFER: THE SCREEN A VISITOR SHOWS AT THE COUNTER ─────────
//
// Oliver, 13 Oct 2026: "the 'Walk There' gotta be changed out with 'redeem
// offer'. Because i want these business to understand that if they want this
// advertisement, then they gotta advetise for me."
//
// So every redemption puts Gemlyx in front of the person behind the counter:
// the visitor opens the offer and shows this screen, with Gemlyx's mark, the
// place, the offer and until when it holds. Not a code (he dropped codes on 5
// Oct 2026: "nobody will agree to that at start"), only the offer, shown. The
// clock in the corner runs, so a screenshot from yesterday is plain to see.
//
// Show directions under it walks there from where the phone is, the same walk
// as before (WalkMode.jsx). Each opening is counted for the partner's own page
// as "opened to redeem" (utils/partnerStats.js), which is what a visitor did,
// not proof the counter accepted it.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { C } from "../utils/theme";
import { t as uiT } from "../utils/uiLanguage";
import { GemlyxMark, GemlyxWordmark } from "./GemlyxLogo";

const clockNow = (zone) => {
  try { return new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date()); } catch { return ""; }
};

export const RedeemSheet = ({ name = "", offer = "", when = "", lang = "en", zone = "Europe/Vilnius", onDirections = null, onClose = null }) => {
  const [now, setNow] = useState(() => clockNow(zone));
  useEffect(() => { const t = setInterval(() => setNow(clockNow(zone)), 1000); return () => clearInterval(t); }, [zone]);
  // Back closes it, the way a sheet on a phone closes.
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const btn = (primary) => ({
    flex: 1, background: primary ? C.gold : "transparent", color: primary ? C.onGold : C.light,
    border: `1px solid ${primary ? C.gold : C.border}`, borderRadius: 14, padding: "13px", fontSize: 14, fontWeight: 800,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
  });
  // On the body, not in the card: the Explore pager slides its pages with a
  // transform, and a fixed screen inside a transform is pinned to the page
  // rather than the phone.
  const sheet = (
    <div role="dialog" aria-label={uiT("offer.redeem", lang)} data-testid="redeem-sheet"
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "calc(24px + env(safe-area-inset-top, 0px)) 20px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", color: C.bronze || C.muted, marginBottom: 18 }}>{uiT("redeem.show", lang)}</div>
        <div style={{ width: "100%", maxWidth: 380, border: `1px solid ${C.gold}66`, borderRadius: 24, background: `linear-gradient(180deg, ${C.gold}14 0%, ${C.surface} 45%)`, padding: "28px 22px 24px", boxSizing: "border-box", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 18 }}>
            <GemlyxMark size={34} />
            <GemlyxWordmark height={12} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.15, letterSpacing: -0.2, overflowWrap: "anywhere" }}>{name}</div>
          <div data-testid="redeem-offer" style={{ fontSize: 19, fontWeight: 600, color: C.text, lineHeight: 1.4, margin: "14px 0 0" }}>{offer}</div>
          {when && <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: C.gold, marginTop: 14 }}><span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold }} />{when}</div>}
          <div aria-hidden="true" data-testid="redeem-clock" style={{ marginTop: 20, fontSize: 34, fontWeight: 600, letterSpacing: 3, color: C.text, fontVariantNumeric: "tabular-nums" }}>{now}</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>{uiT("redeem.via", lang)}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "12px 16px calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${C.border}`, background: C.surface }}>
        {onDirections && <button onClick={onDirections} data-testid="redeem-directions" style={btn(true)}>▶ {uiT("explore.directions", lang)}</button>}
        {onClose && <button onClick={onClose} data-testid="redeem-close" style={btn(false)}>{uiT("explore.closeMap", lang)}</button>}
      </div>
    </div>
  );
  return typeof document !== "undefined" && document.body ? createPortal(sheet, document.body) : sheet;
};

export default RedeemSheet;
