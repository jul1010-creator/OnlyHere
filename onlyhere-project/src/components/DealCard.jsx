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
import { googleMapsReady } from "../utils/googleMapsLoader";

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

// ── THE TILE, THE WAY LIDL PLUS SHOWS AN OFFER ──────────────────────
// Oliver, 13 Oct 2026, with a screenshot of lidl.dk's offers: "Maybe this
// type?" Then: a photo, or the map when there is none, and two to a row on
// a phone. So the picture carries the tile: the date badge in its corner, the
// name over a dark fade at its foot, and under it only what the visitor gets.
// Tapping it opens the whole deal (DealDetail.jsx), where Redeem is.
// A web address, or a picture deployed with the site ("/food/x.jpg").
export const safePhoto = (v) => { const s = String(v || "").trim(); return /^https:\/\//i.test(s) || /^\/[A-Za-z0-9_\-./]+$/.test(s) ? s : ""; };
export const DealPicture = ({ photo = "", at = null, name = "", sign = "📍", pin = "", ratio = "4 / 5", radius = 0, onMapTap = null }) => {
  const src = safePhoto(photo);
  if (src) return <img src={src} alt="" loading="lazy" data-testid="deal-photo" style={{ display: "block", width: "100%", aspectRatio: ratio, objectFit: "cover", borderRadius: radius, background: C.bg }} />;
  if (at && googleMapsReady()) return <DealCornerMap fill ratio={ratio} radius={radius} lat={at.lat} lon={at.lon} name={name} sign={sign} pin={pin} onTap={onMapTap} />;
  // No photo and no map: the place's sign on a quiet ground, so the tile keeps
  // its shape and the badge and name still sit on a picture.
  return (
    <div data-testid="deal-picture-blank" style={{ width: "100%", aspectRatio: ratio, borderRadius: radius, background: `radial-gradient(circle at 50% 42%, ${C.border}, ${C.bg} 75%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>
      <span aria-hidden="true">{sign}</span>
    </div>
  );
};
export const DealTile = ({ name = "", offer = "", badge = "", distance = "", photo = "", at = null, sign = "📍", pin = "", upcoming = false, onOpen = null, testid = "deal-tile" }) => (
  <button type="button" onClick={onOpen || undefined} data-testid={testid}
    style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "stretch", width: "100%", height: "100%", padding: 0, textAlign: "left", background: C.surface, border: "none", borderRadius: 16, overflow: "hidden", cursor: onOpen ? "pointer" : "default", fontFamily: "'Inter', sans-serif", color: C.text, opacity: upcoming ? 0.62 : 1, filter: upcoming ? "saturate(0.6)" : "none" }}>
    <div style={{ position: "relative", pointerEvents: "none" }}>
      <DealPicture photo={photo} at={at} name={name} sign={sign} pin={pin} />
      {badge && (
        <span data-testid="deal-tile-badge" style={{ position: "absolute", top: 8, left: 8, background: "#FFFFFF", color: "#16161A", borderRadius: 7, padding: "4px 8px", fontSize: 11, fontWeight: 700, lineHeight: 1.2, boxShadow: "0 1px 4px rgba(0,0,0,0.25)", maxWidth: "calc(100% - 16px)" }}>{badge}</span>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "34px 10px 9px", background: "linear-gradient(to top, rgba(10,10,12,0.88), rgba(10,10,12,0))" }}>
        <div data-testid="deal-tile-name" style={{ fontSize: 14.5, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, overflowWrap: "anywhere", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{name}</div>
      </div>
    </div>
    <div style={{ padding: "9px 10px 11px" }}>
      {offer && <div data-testid="deal-tile-offer" style={{ fontSize: 12.5, fontWeight: 600, color: upcoming ? C.light : C.text, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{offer}</div>}
      {distance && <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{distance}</div>}
    </div>
  </button>
);

// The two buttons a card can carry: the one thing to do, and a quiet second.
export const primaryBtn = () => ({ background: C.gold, color: C.onGold, border: "none", borderRadius: 100, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", letterSpacing: 0.2 });
export const quietBtn = () => ({ background: "transparent", color: C.light, border: `1px solid ${C.border}`, borderRadius: 100, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", textDecoration: "none", display: "inline-block" });

export default DealCard;
