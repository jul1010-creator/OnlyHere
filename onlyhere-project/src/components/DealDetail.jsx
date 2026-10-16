// ── ONE DEAL, OPENED FROM ITS TILE ──────────────────────────────────
//
// Oliver, 13 Oct 2026: the deals as tiles, the way Lidl Plus shows its offers
// ("Maybe this type?"). A tile is the picture and the offer; tapping it opens
// this, the whole deal: the picture large, what the visitor gets, when it
// holds, and the three things to do, Redeem, Show directions and Book.
//
// The map is here too. Tapping it glides down onto the building as it did on
// the card (DealPlaceView.jsx, "like the google earth frame from earlier").
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { C } from "../utils/theme";
import { DealPicture, eyebrow, primaryBtn, quietBtn } from "./DealCard";
import { DealCornerMap } from "./DealCornerMap";
import { DealPlaceView } from "./DealPlaceView";

export const DealDetail = ({
  name = "", offer = "", tag = "", distance = "", when = null, hours = "", note = "",
  photo = "", at = null, sign = "📍", pin = "", upcoming = false, lang = "en", labels = {},
  onRedeem = null, onDirections = null, book = null, onClose = null, startOnMap = false,
}) => {
  // Opened from the small map in a photo tile's corner (16 Oct 2026): the
  // sheet starts on the view from above and brings it into sight.
  const [above, setAbove] = useState(!!startOnMap && !!at);
  const mapBox = useRef(null);
  useEffect(() => {
    if (!startOnMap || !at || !mapBox.current) return undefined;
    const t = setTimeout(() => { try { mapBox.current?.scrollIntoView({ block: "center", behavior: "smooth" }); } catch { /* old browser */ } }, 120);
    return () => clearTimeout(t);
  }, [startOnMap]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const top = [tag, distance].filter(Boolean).join(" · ");
  const urgent = when?.kind === "ends" && when.left <= 30;
  const sheet = (
    <div role="dialog" aria-label={name} data-testid="deal-detail"
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", position: "relative" }}>
          <DealPicture photo={photo} at={at} name={name} sign={sign} pin={pin} ratio="4 / 3" />
          <button onClick={onClose} aria-label={labels.close || "Close"} data-testid="deal-detail-close"
            style={{ position: "absolute", top: "calc(12px + env(safe-area-inset-top, 0px))", right: 12, width: 38, height: 38, borderRadius: "50%", border: "none", background: "rgba(14,14,17,0.72)", color: "#FFFFFF", fontSize: 16, cursor: "pointer", backdropFilter: "blur(6px)" }}>✕</button>
          <div style={{ padding: "20px 18px 28px" }}>
            {top && <div style={{ ...eyebrow(), marginBottom: 8 }}>{top}</div>}
            <h2 style={{ fontSize: 28, fontWeight: 500, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.15, letterSpacing: -0.2, margin: 0, overflowWrap: "anywhere" }}>{name}</h2>
            {offer && <div data-testid="deal-detail-offer" style={{ fontSize: 17, fontWeight: 600, color: C.text, lineHeight: 1.45, marginTop: 12 }}>{offer}</div>}
            {when?.text && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: urgent ? "#E8A35C" : upcoming ? (C.bronze || C.muted) : C.gold, marginTop: 14 }}>
                {!upcoming && <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: urgent ? "#E8A35C" : C.gold }} />}
                <span>{when.text}</span>
              </div>
            )}
            {(hours || note) && <div style={{ fontSize: 13, color: C.muted, marginTop: 4, paddingLeft: !upcoming && when?.text ? 15 : 0 }}>{[hours, note].filter(Boolean).join(" · ")}</div>}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              {onRedeem && !upcoming && <button onClick={onRedeem} data-testid="deal-near-redeem" style={{ ...primaryBtn(), padding: "12px 22px", fontSize: 14 }}>{labels.redeem || "Redeem offer"}</button>}
              {onDirections && at && <button onClick={onDirections} data-testid="deal-detail-directions" style={{ ...quietBtn(), padding: "11px 18px", fontSize: 14 }}>▶ {labels.directions || "Show directions"}</button>}
              {book && <a href={book.href} target={book.kind === "web" ? "_blank" : undefined} rel="noopener noreferrer" style={{ ...quietBtn(), padding: "11px 18px", fontSize: 14 }}>{labels.book || "Book a table"}</a>}
            </div>

            {at && (
              <div ref={mapBox} data-testid="deal-detail-map" style={{ marginTop: 24 }}>
                {above ? (
                  <DealPlaceView lat={at.lat} lon={at.lon} name={name} sign={sign} photo={photo} pin={pin} lang={lang}
                    onDirections={onDirections} onClose={() => setAbove(false)} />
                ) : (
                  <DealCornerMap fill ratio="16 / 9" radius={16} lat={at.lat} lon={at.lon} name={name} sign={sign} pin={pin} onTap={() => setAbove(true)} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  return typeof document !== "undefined" && document.body ? createPortal(sheet, document.body) : sheet;
};

export default DealDetail;
