import { entryPrice } from "../utils/entryPrice";

// ── "ATTRACTIONS ALL SAY FREE" ──────────────────────────────────────
//
// Oliver, 27 Aug 2026. This chip lived inline in DetailPage and ended with a
// hardcoded "· FREE", because the attractions pool's Studio type is called
// `free` and it used to mean it. It holds Legoland now. utils/entryPrice.js has
// the whole argument.
//
// ── AND IT IS ITS OWN FILE SO IT CAN BE RENDERED ────────────────────
//
// A SURFACE THAT CANNOT BE RENDERED CANNOT BE CHECKED, and the bug here was a
// word on a page — not something a pure function or a regex over source could
// have caught. DetailPage cannot be rendered in the suite: it draws the map,
// Leaflet reads a real `document` at module scope, and standing up a fake DOM
// to get around that is the thing tests/render.mjs explicitly refuses ("a
// fuller fake would let a component depend on something this cannot
// reproduce").
//
// So the chip moves out, exactly as the costs list did on 26 August and the
// change sheet the night before. Everything it decides lives in entryPrice.js;
// this is only the drawing of it.
export const AttractionBadge = ({ item, C }) => {
  if (!item?.popularityTag) return null;
  const hidden = item.popularityTag === "Hidden Gem";
  // The row's own words, never the bucket it sits in. `null` — nobody has told
  // us — draws no price at all, which is the state this chip never had.
  const free = entryPrice(item).free === true;
  return (
    <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: hidden ? C.gold : C.muted, background: hidden ? `${C.gold}22` : C.surface, border: `1px solid ${hidden ? C.gold : C.border}`, padding: "5px 12px", borderRadius: 100, marginBottom: 18 }}>
      {hidden ? "◆ Hidden Gem" : "○ Common Attraction"}{free ? " · FREE" : ""}
    </div>
  );
};
