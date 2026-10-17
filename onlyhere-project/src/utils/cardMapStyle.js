// ── THE DEAL TILES' MAP, DARK LIKE THE PAGE ─────────────────────────
//
// Oliver, 16 Oct 2026, of a design review he had made of the Lithuanian page:
// "try out the ideas that google and you agreed on". The one that needed
// building: the deal tiles were bright light Google maps, the lightest thing
// on a dark page. So the tile and the deal sheet's map are drawn here in the
// page's own browns (theme.js: bg #12100B, surface #1C1912), with water a
// deep blue and parks a dark green so the old town's moats and squares still
// read, and the gold pin on top.
//
// Google's older style rules, not the Map ID. The Map ID carries the tourism
// guide's light style (13 Oct 2026: "Look at our map in the tourism guide..
// use that."), which the walk map and the place view keep. Google's styling
// page asks that one map not mix the two; no map here does.
//
// Shops, cafes and bars nearby are left off: a partner's tile should not show
// the place next door. Streets, water, parks and sights stay.
//
// Rules apply in order, so a later rule turns a part back on: every place of
// interest goes off, then parks and sights come back.
export const CARD_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1C1912" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#968C76" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#12100B" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#221E17" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", elementType: "labels.text", stylers: [{ visibility: "on" }] },
  { featureType: "poi.attraction", elementType: "labels.text.fill", stylers: [{ color: "#B49A63" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1C281D" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#3A3328" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8E8573" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#463E31" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#50463A" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#10232F" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4A6573" }] },
];

// The same rules in the Static Maps spelling: one style= per rule, in the
// same order, as feature:...|element:...|rule:value, colours as 0xRRGGBB, and
// each value encoded so its | and : travel safely in the address.
export const staticStyleParams = (rules = CARD_MAP_STYLE) => rules.map((r) => {
  const parts = [];
  if (r.featureType) parts.push(`feature:${r.featureType}`);
  if (r.elementType) parts.push(`element:${r.elementType}`);
  for (const s of r.stylers || []) {
    for (const [k, v] of Object.entries(s)) parts.push(`${k}:${String(v).replace(/^#/, "0x")}`);
  }
  return `style=${encodeURIComponent(parts.join("|"))}`;
}).join("&");
