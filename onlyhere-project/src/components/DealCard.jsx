// ── ONE DEAL, AS A VISITOR SEES IT ──────────────────────────────────
//
// Oliver, 13 Oct 2026, with a design review that called the deals "a 2012 to
// 2016 web-design vibe": "Make the dark theme. We need to move away from the
// 2012-16 look." What the review asked of a card: fewer outlines, gold kept
// for what matters, and a clear line between the business, what the visitor
// gets, when it holds, and what to do.
//
// So, top to bottom: a small bronze line saying what kind of deal and how far,
// the business in the serif, what the visitor gets in plain off-white, when it
// holds with the gold dot only while it is on, its hours, and the action. One
// hairline border, no gold box around it.
//
// One component for Explore's list, its Upcoming section and the Studio's
// preview, so the preview is the card and not a drawing of it.
import { C } from "../utils/theme";
import { DealCornerMap } from "./DealCornerMap";

// Functions, not objects: C changes when the theme does, and an object built
// at import would keep the colours of the theme the page opened in.
export const eyebrow = () => ({ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: C.bronze || C.muted, fontFamily: "'Inter', sans-serif" });

export const DealCard = ({
  name = "", offer = "", tag = "", distance = "", when = null, hours = "", note = "",
  at = null, sign = "📍", photo = "", pin = "", onMap = null, upcoming = false,
  actions = null, children = null, testid = "deal-near",
}) => {
  const top = [tag, distance].filter(Boolean).join(" · ");
  const urgent = when?.kind === "ends" && when.left <= 30;
  return (
    <div data-testid={testid}
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "16px 16px 15px", opacity: upcoming ? 0.7 : 1, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {top && <div data-testid="deal-card-top" style={{ ...eyebrow(), color: C.bronze || C.muted, marginBottom: 6 }}>{top}</div>}
          <div style={{ fontSize: 18, fontWeight: 500, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.2, overflowWrap: "anywhere" }}>{name}</div>
          {offer && <div data-testid={upcoming ? "deal-upcoming-offer" : "deal-near-offer"} style={{ fontSize: 14.5, fontWeight: 600, color: upcoming ? C.light : C.text, lineHeight: 1.45, marginTop: 6 }}>{offer}</div>}
          {when?.text && (
            <div data-testid={upcoming ? "deal-upcoming-starts" : when.kind === "ends" ? "deal-near-ends" : "deal-near-when"}
              style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: urgent ? "#E8A35C" : upcoming ? (C.bronze || C.muted) : C.gold, marginTop: 10 }}>
              {!upcoming && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: urgent ? "#E8A35C" : C.gold, flex: "0 0 auto" }} />}
              <span>{when.text}</span>
            </div>
          )}
          {(hours || note) && (
            <div data-testid={upcoming ? "deal-upcoming-hours" : "deal-near-hours"} style={{ fontSize: 12, color: C.muted, marginTop: 3, paddingLeft: !upcoming && when?.text ? 13 : 0 }}>
              {[hours, note].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        {at && (
          <DealCornerMap lat={at.lat} lon={at.lon} name={name} sign={sign} photo={photo} pin={pin} size={upcoming ? 76 : 92} onTap={onMap} />
        )}
      </div>
      {children}
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>{actions}</div>}
    </div>
  );
};

// The two buttons a card can carry: the one thing to do, and a quiet second.
export const primaryBtn = () => ({ background: C.gold, color: C.onGold, border: "none", borderRadius: 100, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", letterSpacing: 0.2 });
export const quietBtn = () => ({ background: "transparent", color: C.light, border: `1px solid ${C.border}`, borderRadius: 100, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", textDecoration: "none", display: "inline-block" });

export default DealCard;
