// ── GEMLYX PROMOTIONS, THE PAGE ─────────────────────────────────────
//
// Every live Gemlyx offer in one list. See utils/promotions.js for why it
// reads the entries rather than keeping a list of its own, and utils/offer.js
// for the locked state on the Danish page.
import { C } from "../utils/theme";
import { PhotoPlate } from "./PhotoPlate";
import { promoCard, untilLabel } from "../utils/promotions";
import { OFFER_LOCKED_LABEL, OFFER_LOCKED_NOTE, OFFER_NOTE } from "../utils/offer";

export const PromotionsPage = ({ promos = [], title = "Special deals", paid = false, onOpen, lang = "en" }) => {
  const today = new Date();
  return (
    <div data-testid="promotions-page" style={{ padding: "16px", maxWidth: 1120, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.text }}>◈ {title}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>What Gemlyx gets you at the places it recommends.</div>
      </div>
      {promos.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
          No offers running right now.
        </div>
      ) : (
        <div className="products-grid">
          {promos.map(p => {
            const card = promoCard(p, { paid, today, lang });
            return (
              <button key={`${p._src}-${p.id ?? p.name}`} onClick={() => onOpen?.(p)}
                style={{ textAlign: "left", background: C.surface, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: 0, overflow: "hidden", cursor: "pointer", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
                <div style={{ height: 130, position: "relative" }}>
                  <PhotoPlate photo={p.photo} name={p.name} color={p.color || C.gold} />
                </div>
                <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>
                    {[card.kind, card.where].filter(Boolean).join(" · ")}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif", lineHeight: 1.2 }}>{p.name}</div>
                  {card.hours && (
                    <div data-testid="offer-hours" style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 700, borderRadius: 100, padding: "3px 9px", ...(card.timing === "now" ? { background: C.gold, color: C.onGold } : { border: `1px solid ${C.border}`, color: C.light }) }}>
                      {card.timing === "now" ? "● " : ""}{card.hours}
                    </div>
                  )}
                  <div style={{ background: `${C.gold}14`, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: "9px 11px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 0.4, marginBottom: 3 }}>◈ {OFFER_LOCKED_LABEL}</div>
                    <div style={{ fontSize: card.locked ? 12 : 13, color: card.locked ? C.muted : C.text, lineHeight: 1.5 }}>
                      {card.locked ? OFFER_LOCKED_NOTE : card.text}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.light, fontWeight: 600 }}>{untilLabel(card.until, today)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {promos.length > 0 && (
        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 14 }}>{OFFER_NOTE}</div>
      )}
    </div>
  );
};
