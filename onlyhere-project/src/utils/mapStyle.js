// ── THE DARK BASEMAP, DRAWN RATHER THAN INVERTED ─────────────────────
//
// Oliver, 13 Sep 2026, on the map behind every pin in the app: it "does look
// kinda old school... how it reads the countries".
//
// What he was looking at was OpenStreetMap's standard raster tiles run through
// a CSS invert (see TILE_STYLES.dark in mapTiles.js). Inverting removes nothing.
// Rendered from the live domain the same day, a Denmark trip map carried Agder,
// Arendal, Kristiansand, Goteborg, Boras, Halmstad, Helsingborg, "Vastra
// Gotalands lan" and "Region Nordjylland", every one of them as loud as
// Copenhagen, and the land came out a muddy green. Gemlyx's own town chips are
// meant to be the only words on the map, and a raster tile cannot be told to
// leave its words out.
//
// A vector tile can, because the words are a layer the style chooses to draw
// or not. This file is that style: MapLibre style spec version 8, against
// OpenFreeMap's OpenMapTiles-schema planet tiles. It drew NO symbol layer of any
// kind until 25 Sep 2026, which is why the default went back to the raster: a
// map with no words on it is not a detailed map. It now draws place names, in
// Danish first, and no road names, because a road name is not what a traveller
// reads off a map of a country.
//
// ── WHY OPENFREEMAP ─────────────────────────────────────────────────
// Measured from the live origin on 13 Sep 2026, in the same session:
//
//   OpenStreetMap  the raster tiles the app used. Their tile usage policy says
//                  commercial services "should be especially aware that access
//                  may be withdrawn at any point" and that access "may be
//                  blocked without prior notice". Gemlyx is commercial, and the
//                  failure has already been seen once: a grid of "Access
//                  blocked, App is not following the tile usage policy" images
//                  tiled across Denmark.
//   CARTO          200s, but every tile watermarked "API KEY REQUIRED".
//   Stadia         clean from the registered domain, but the free tier states
//                  commercial use is not allowed, and the dark style is grey.
//   OpenFreeMap    "completely free: there are no limits on the number of map
//                  views or requests", "no registration, no user database, no
//                  API keys, and no cookies", commercial use allowed. The style
//                  URL and a planet .pbf tile both returned 200 from the origin.
//
// Their one condition is the credit below, which is why it is exported from
// here next to the URL it belongs to rather than typed again in mapTiles.js.
//
// ── ONE URL, READ IN TWO PLACES, DEFINED ONCE ──────────────────────
// The TileJSON describes the tileset: it carries the versioned tile path
// (OpenFreeMap rebuilds the planet and the path under /planet/ changes with
// it), the zoom range and the bounds. A style has to point at the description
// rather than at a tile path, or the first rebuild after deploy breaks every
// map. mapTiles.js also reports this as the style's `url`, so the constant
// lives here and both read it.
export const OPENFREEMAP_TILEJSON = "https://tiles.openfreemap.org/planet";
// The font endpoint from the same host, taken from OpenFreeMap's own style
// rather than assumed. {fontstack} and {range} are MapLibre's placeholders and
// are filled in by the renderer.
export const OPENFREEMAP_GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

// The credit OpenFreeMap asks for, in their own words: "OpenFreeMap © OpenMapTiles
// Data from OpenStreetMap". The links are theirs too. Rendered through Leaflet's
// attribution control like every other provider in TILE_STYLES, so the HTML
// entity is the same one the OSM and Stadia strings use.
export const OPENFREEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>'
  + ' <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">&copy; OpenMapTiles</a>'
  + ' Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

// ── THE PALETTE, AND WHERE EACH COLOUR COMES FROM ───────────────────
// Every colour here is a token of the dark theme in theme.js or a stated blend
// of two of them, so the map sits inside the same family as the cards around it
// instead of arriving from another product. The dark theme is used whichever
// theme the reader chose, because the map has always been a dark panel in all
// three (the inverted raster never followed the theme either).
//
//   WATER  bg, #0A0F1E. The sea is the page.
//   LAND   halfway between surface (#0F1628) and border (#212C44): #182136.
//          Surface itself measures 1.06:1 against the water by the WCAG
//          formula, which is next to no difference; the midpoint measures
//          1.20:1. Whether that, with the coast line below, makes Denmark's
//          islands read at national zoom in a 240px box is one of the things
//          only a browser can confirm.
//   BUILT  border, #212C44, at partial opacity: towns as slightly lifted patches
//          so the map says where the towns are without a single name.
//   WOOD   land with a whisper of green (#1B2E36, opacity 0.55). Forest and
//          grass are the only landcover drawn: farmland is most of Denmark and
//          painting it would tint the whole country, which is the muddy green
//          the inversion produced.
//   SAND   gold (#D9A441) at 0.08 over land: the dunes at Skagen and Rømø as a
//          faint warm edge.
//   COAST  fieldBorder, #5A6A8C, at 0.35. The one line the map cannot do
//          without; see LAND.
//   ROADS  muted, #7C88A6, at low opacity, thinner and fainter as they matter
//          less; the small ones in fieldBorder. Subdued on purpose: the gold
//          route line has to win.
//   RAIL   light, #A6B0C6, dashed so it is never mistaken for a road.
//   BORDER the country border in muted, dashed, land only: the maritime halves
//          of an admin boundary would draw box lines across the Kattegat.
const WATER = "#0A0F1E";
// ── AND THEN WE LOOKED AT IT ────────────────────────────────────────
// 14 Sep 2026, 01:20, on Oliver's own dev server with the real tiles up. The
// land against the water was calculated at a ratio and never looked at, and on
// a 240px rail Denmark was a shape you had to hunt for: measured at 1.15:1
// against the water by the WCAG formula, which is below the point where an
// edge reads at a glance. #303F62 is 1.70:1, which is still a dark map and is
// a country you can see the shape of.
const LAND = "#303F62";
// Lifted ABOVE the land, which is the whole idea of it, so it moved with LAND.
const BUILT = "#3E5080";
const WOOD = "#1B2E36";
const SAND = "#D9A441";
const COAST = "#5A6A8C";
const ROAD = "#7C88A6";
const MINOR = "#5A6A8C";
const RAIL = "#A6B0C6";
const BORDER = "#7C88A6";
// ── AND THE WORDS, WHICH THE STYLE DID NOT HAVE ────────────
//
// Oliver, 14 Sep 2026, on the drawn map: "I don't like that map though.. I do
// like a detailed map." The style answered a complaint about foreign region
// names shouting over Danish ones by removing every label, which answers it by
// removing the map. This is the other half, added 25 Sep.
//
// Light enough to read off LAND at 1.7:1, with a halo in the land colour so a
// name crossing a road or a coastline still has an edge. Towns sit a step
// quieter than cities so a national view reads as a hierarchy rather than a
// wall of equal words.
const LABEL = "#E8ECF6";
const LABEL_QUIET = "#B9C2D8";
const HALO = "#1B2440";

// Line widths grow with the zoom the way MapLibre's own styles do, base 1.4
// per zoom level, so a road is a hairline at national zoom and a real stroke
// at street zoom rather than one or the other.
const grows = (z1, w1, z2, w2) => ["interpolate", ["exponential", 1.4], ["zoom"], z1, w1, z2, w2];
const road = (id, classes, minzoom, color, opacity, width) => ({
  id,
  type: "line",
  source: "openmaptiles",
  "source-layer": "transportation",
  minzoom,
  filter: ["in", ["get", "class"], ["literal", classes]],
  layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-color": color, "line-opacity": opacity, "line-width": width },
});

// ── SOURCE LAYERS ARE THE OPENMAPTILES SCHEMA, AND NOTHING ELSE ─────
// water, waterway, landcover, landuse, boundary, aeroway, transportation and
// building are OpenMapTiles layer names, which is the schema OpenFreeMap
// publishes. A layer name that is not in the schema is not an error MapLibre
// can raise loudly: the layer draws nothing and the map looks like the data is
// missing. The suite pins every source-layer below to this list.
export const OPENMAPTILES_LAYERS = [
  "water", "waterway", "landcover", "landuse", "park", "boundary", "aeroway",
  "transportation", "building", "mountain_peak", "water_name",
  "transportation_name", "place", "housenumber", "poi", "aerodrome_label",
];

// ── A PLACE NAME, IN DANISH FIRST ─────────────────────
//
// OpenFreeMap's own positron style writes its city labels as
// `coalesce(name_en, name)`, English first. That is precisely the thing Oliver
// objected to when the labels came off: foreign names over Danish ones. So the
// order is reversed here, `name:da` and then `name`, and in Denmark `name` is
// already the Danish one because OSM's `name` is the local name. An English
// exonym can only appear where nothing Danish exists at all.
const placeName = ["coalesce", ["get", "name:da"], ["get", "name"]];
const label = (id, classes, minzoom, color, size, extra = {}) => ({
  id,
  type: "symbol",
  source: "openmaptiles",
  "source-layer": "place",
  minzoom,
  filter: ["in", ["get", "class"], ["literal", classes]],
  layout: {
    "text-field": placeName,
    "text-font": ["Noto Sans Regular"],
    "text-size": size,
    "text-max-width": 7,
    "text-padding": 4,
    ...(extra.layout || {}),
  },
  paint: {
    "text-color": color,
    // A halo in the land colour rather than black: a name crossing the coast
    // keeps its edge without a dark smear following it out over the water.
    "text-halo-color": HALO,
    "text-halo-width": 1.3,
    "text-halo-blur": 0.4,
  },
});

export const BASEMAP_STYLE = {
  version: 8,
  name: "Gemlyx navy",
  // ── WITHOUT THIS, EVERY LABEL BELOW DRAWS NOTHING ─────────
  // A symbol layer with no glyphs endpoint is not an error MapLibre raises: the
  // text simply never appears, which looks exactly like the data missing. Read
  // off OpenFreeMap's own published style rather than guessed, along with the
  // font name, which has to be one they actually serve.
  glyphs: OPENFREEMAP_GLYPHS,
  sources: {
    openmaptiles: { type: "vector", url: OPENFREEMAP_TILEJSON },
  },
  // Fills first, then water over them, then the lines, so a landcover polygon
  // that runs out over the Wadden Sea is painted sea and not shore.
  //
  // fill-antialias is off on every translucent fill. With it on, MapLibre draws
  // each polygon's outline in the fill colour as well, and two translucent
  // neighbours then show a darker seam where their outlines overlap.
  layers: [
    { id: "land", type: "background", paint: { "background-color": LAND } },
    {
      id: "wood",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["in", ["get", "class"], ["literal", ["wood", "grass"]]],
      paint: { "fill-color": WOOD, "fill-opacity": 0.55, "fill-antialias": false },
    },
    {
      id: "sand",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["==", ["get", "class"], "sand"],
      paint: { "fill-color": SAND, "fill-opacity": 0.08, "fill-antialias": false },
    },
    {
      id: "built-up",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      minzoom: 8,
      filter: ["in", ["get", "class"], ["literal", ["residential", "suburb", "quarter", "neighbourhood", "commercial", "industrial", "retail"]]],
      // Fainter as the zoom comes in: at national zoom the patch IS the town, at
      // street zoom the buildings below take over and the patch would only
      // grey the streets.
      paint: { "fill-color": BUILT, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.55, 14, 0.3], "fill-antialias": false },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": WATER },
    },
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      minzoom: 11,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": WATER, "line-opacity": 0.8, "line-width": grows(11, 0.6, 16, 1.6) },
    },
    // A line layer over water POLYGONS: MapLibre draws a polygon's rings when a
    // line layer reads them, which is the only coastline OpenMapTiles has. Tile
    // clip edges sit in the tile buffer, outside the drawn area, so they do not
    // show.
    {
      id: "coast",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": COAST, "line-opacity": 0.55, "line-width": grows(5, 0.5, 14, 1.2) },
    },
    {
      id: "runway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "aeroway",
      minzoom: 11,
      filter: ["in", ["get", "class"], ["literal", ["runway", "taxiway"]]],
      paint: { "line-color": MINOR, "line-opacity": 0.35, "line-width": grows(11, 1, 16, 4) },
    },
    // Ferries are how the islands connect and a traveller's route crosses
    // them, so they are drawn, but only just: a dotted thread, not a road.
    {
      id: "ferry",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 7,
      filter: ["==", ["get", "class"], "ferry"],
      paint: { "line-color": RAIL, "line-opacity": 0.16, "line-width": 1, "line-dasharray": [1, 4] },
    },
    {
      id: "rail",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 10,
      filter: ["in", ["get", "class"], ["literal", ["rail", "transit"]]],
      paint: { "line-color": RAIL, "line-opacity": 0.18, "line-width": grows(10, 0.6, 16, 1.6), "line-dasharray": [3, 3] },
    },
    {
      id: "path",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 15,
      filter: ["in", ["get", "class"], ["literal", ["path", "track"]]],
      paint: { "line-color": MINOR, "line-opacity": 0.18, "line-width": 0.8, "line-dasharray": [2, 2] },
    },
    road("road-minor", ["minor", "service"], 13, MINOR, 0.28, grows(13, 0.5, 18, 3)),
    road("road-secondary", ["secondary", "tertiary"], 10, ROAD, 0.32, grows(10, 0.5, 18, 4)),
    road("road-primary", ["primary"], 8, ROAD, 0.38, grows(8, 0.5, 18, 5)),
    road("road-motorway", ["motorway", "trunk"], 6, ROAD, 0.46, grows(6, 0.6, 18, 6)),
    {
      id: "building",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: { "fill-color": BUILT, "fill-opacity": 0.6, "fill-antialias": false },
    },
    {
      id: "country-border",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      // admin_level and maritime are numbers in the schema, but a string would
      // be the kind of thing that makes the border vanish rather than fail, so
      // both are coerced before the comparison. A missing maritime coerces to
      // 0, which is the land side, which is the side that is drawn.
      filter: ["all",
        ["==", ["to-number", ["get", "admin_level"]], 2],
        ["!=", ["to-number", ["get", "maritime"]], 1]],
      paint: { "line-color": BORDER, "line-opacity": 0.3, "line-width": grows(4, 0.8, 12, 1.6), "line-dasharray": [3, 2] },
    },
    // ── THE WORDS, LAST, SO THEY SIT OVER EVERYTHING ────────
    //
    // Four steps rather than one, so zooming out thins the list instead of
    // piling every village on top of Copenhagen. minzoom is what does the
    // thinning: a village only earns a name once the reader is close enough
    // for it to mean something.
    label("place-city", ["city"], 4, LABEL, grows(4, 11, 10, 17), {
      layout: { "text-font": ["Noto Sans Bold"], "text-transform": "none" },
    }),
    label("place-town", ["town"], 7, LABEL, grows(7, 10, 12, 14)),
    label("place-village", ["village"], 10, LABEL_QUIET, grows(10, 9.5, 14, 12)),
    // Neighbourhoods only at street zoom, where they are the thing a traveller
    // is standing in rather than a word on a country.
    label("place-suburb", ["suburb", "neighbourhood"], 13, LABEL_QUIET, grows(13, 9.5, 17, 12)),
  ],
};
