import { venueStyleOf, VENUE_STYLE_LABEL } from "../utils/venueStyle";

// ── "HIGH-END" AND "CASUAL" ─────────────────────────────────────────
//
// Oliver, 27 Aug 2026, relaying his friend. The chip that answers the question
// somebody actually asks before going out, which none of the fields on a
// nightlife row answered: do I need to change out of my trainers.
//
// ── ITS OWN FILE SO IT CAN BE RENDERED ──────────────────────────────
//
// A SURFACE THAT CANNOT BE RENDERED CANNOT BE CHECKED. DetailPage draws the
// map, Leaflet reads a real `document` at module scope, and standing up a fake
// DOM is what tests/render.mjs refuses by name — so anything on that page that
// needs checking comes out into a file of its own. Same move as AttractionBadge
// this morning and the costs list yesterday.
//
// ── AND IT DRAWS NOTHING WHEN NOBODY HAS SAID ───────────────────────
//
// venueStyleOf returns null for a row whose register is genuinely unknown —
// "Nightclub" says nothing about a door policy, and Hive and a student club are
// both nightclubs. Null renders no chip at all, which is the honest shape and
// the one this morning's FREE badge did not have.
export const VenueStyleChip = ({ item, C, size = 11 }) => {
  const style = venueStyleOf(item);
  if (!style) return null;
  // High-end earns the gold; casual is quiet. The colour is doing the same job
  // as the word, so it may only come from the same answer.
  const gold = style === "highend";
  return (
    <span style={{ display: "inline-block", fontSize: size, fontWeight: 700, color: gold ? C.gold : C.muted, background: gold ? `${C.gold}18` : C.surface, border: `1px solid ${gold ? `${C.gold}55` : C.border}`, padding: "5px 12px", borderRadius: 100 }}>
      {gold ? "🍸" : "🍺"} {VENUE_STYLE_LABEL[style]}
    </span>
  );
};
