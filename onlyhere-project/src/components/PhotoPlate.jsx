import { useState } from "react";
import { C } from "../utils/theme";

// ── PhotoPlate ────────────────────────────────────────────────────
// One shared media plate for every place card in the app.
//
// WHY THIS EXISTS (Aug 5 2026, from Oliver's screenshots of the live site).
// Card photos used to be a bare `<img src={item.photo}>` with an onError that
// hid the element. That failed in two different ways at once, and both were
// visible on the deployed site at the same time:
//
//  1. A row with NO photo field at all. The craft_items table has no photo
//     column, so `item.photo` is undefined, React omits the src attribute
//     entirely, and a src-less <img> never attempts a load, which means
//     onError NEVER FIRES. Chrome then draws its own broken-image icon plus
//     the alt text right on top of the card. That was the literal
//     "Bornholm Ceramics" text sitting over the picture area.
//
//  2. A row WITH a photo path pointing at a file that was never added to
//     public/. Content Studio assigns "/towns/<slug>.jpg", "/events/<slug>.jpg"
//     and so on to every row it publishes, whether or not the image exists yet
//     (that is deliberate: the picture appears the moment the file is dropped
//     in). Measured against the live site, 54 of 55 published rows 404ed.
//     onError fired and hid the image, leaving a faint 44px emoji floating in
//     an empty box.
//
// So the app had no real "this place has no photo yet" design state, and fell
// into two different accidental ones. PhotoPlate makes it deliberate: the same
// Fraunces monogram plate the Food cards already used. The <img> is only
// rendered when there is a genuinely non-empty path, and a failed load falls
// back TO THE MONOGRAM rather than to nothing.
//
// Usage: the parent must be position:relative and own its own size; PhotoPlate
// fills it absolutely so existing badge/heart overlays keep working untouched.
export const PhotoPlate = ({ photo, name, color }) => {
  const [failed, setFailed] = useState(false);
  const src = typeof photo === "string" ? photo.trim() : "";
  const tint = typeof color === "string" && color.startsWith("#") ? color : C.gold;
  const initial = String(name || "◆").trim().charAt(0).toUpperCase() || "◆";
  return (
    <>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        // One soft tint from the item's own colour in the top-left, over a gentle
        // vertical fall. Kept deliberately simple: the two-radial recipe the Food
        // cards use renders a visible hard-edged blob in the taller 210px plates
        // (caught on a static replica screenshot before this shipped).
        background: `radial-gradient(130% 100% at 20% 0%, ${tint}26 0%, transparent 62%), linear-gradient(165deg, #131A2C 0%, ${C.bg} 72%)`,
      }}>
        <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 500, fontSize: 48, lineHeight: 1, color: "rgba(148,163,199,0.3)" }}>{initial}</span>
      </div>
      {src.length > 0 && !failed && (
        <img src={src} alt={name || ""} onError={() => setFailed(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}
    </>
  );
};
