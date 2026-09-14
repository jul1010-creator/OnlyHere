// ── THE VECTOR BASEMAP'S MACHINERY, LOADED ONLY WHEN A MAP MOUNTS ───
//
// This module is reached ONLY through the dynamic import in mapTiles.js, and
// that is the whole reason it is a separate file. MapLibre GL and the plugin
// are 1,024 kB of minified JavaScript (279 kB gzipped) plus a 508 kB worker,
// measured by vite build on 13 Sep 2026, against a main bundle that was
// already 2,148 kB and being warned about. Imported statically it would ride
// along with the landing page, the studio and every article whether or not a
// map is on the screen. Behind an import() it is its own chunk, fetched the
// first time addTileLayer asks for a vector style and cached after that.
//
// It is also why the test suite never sees this file: tests/run.mjs bundles
// the utilities under plain Node, where maplibre-gl reaches for window and
// `?worker&url` is a Vite spelling esbuild cannot resolve. The harness marks
// this one module external so the import() stays a string it never runs.
//
// ── THE WORKER IS A SEPARATE FILE IN MAPLIBRE 6 ────────────────────
// Earlier MapLibre releases inlined their worker as a blob. Version 6 ships it
// as dist/maplibre-gl-worker.mjs, which imports dist/maplibre-gl-shared.mjs,
// and works out its own URL from import.meta.url at runtime. Under Vite that
// URL would point at a file the build never emitted. So the worker is handed
// to Vite as a worker entry (?worker&url bundles it, shared module included,
// and returns the hashed URL) and MapLibre is told where it landed before any
// map exists. setWorkerUrl is MapLibre's own API for exactly this.
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { MaplibreGL } from "@maplibre/maplibre-gl-leaflet";
import "./vectorBasemap.css";

setWorkerUrl(workerUrl);

// ── A LAYER WHOSE GL MAP NEVER STARTED MUST STILL COME OFF THE MAP ──
//
// MapLibre 6 needs WebGL2 and its Map constructor throws when it cannot get a
// context. The plugin creates that Map inside onAdd, after it has already put
// its container into the tile pane and bound its move and zoom handlers to the
// Leaflet map. The stock onRemove then calls remove() on a GL map that does not
// exist, throws, and leaves the layer registered: every pan after that hits a
// handler reaching for the missing map, and the React cleanup's map.remove()
// throws its way out of the effect.
//
// So the one branch is added: no GL map, take the empty container out and stop.
// Everything else is the plugin's own onRemove.
const GemlyxGL = MaplibreGL.extend({
  onRemove(map) {
    if (this._glMap) return MaplibreGL.prototype.onRemove.call(this, map);
    const pane = map.getPane(this.getPaneName());
    if (pane && this._container && pane.contains(this._container)) pane.removeChild(this._container);
  },
});

// The Leaflet layer for a vector style. `cfg` is what tileConfig returns, so
// the style, the zoom ceiling and the attribution all come from the one table
// in mapTiles.js rather than being restated here.
//
// WHAT THE OPTIONS MEAN, because the plugin hands every one of them to
// MapLibre's Map constructor as well:
//   style             the inline style object. A URL here would be a second
//                     request that could fail on its own.
//   maxZoom           Leaflet reads it to cap the map's zoom, same as it does
//                     for a tile layer. MapLibre reads it too, and since the
//                     plugin drives MapLibre one zoom level below Leaflet the
//                     GL map never reaches its own ceiling.
//   attributionControl the plugin's spelling for "credit this": its
//                     getAttribution returns customAttribution to Leaflet's
//                     attribution control the moment the layer is added,
//                     rather than after the style has loaded (and never, if the
//                     TileJSON was refused). MapLibre's own control is switched
//                     off by the plugin.
//   interactive       false: Leaflet owns every gesture, the canvas is a
//                     picture. The plugin's default, stated because it matters.
//   className         the gemlyx-tiles classes, so the canvas can be styled or
//                     found the same way a raster layer's tiles can.
export const vectorLayer = (cfg) => new GemlyxGL({
  style: cfg.glStyle,
  maxZoom: cfg.maxZoom,
  attributionControl: { customAttribution: cfg.attribution },
  interactive: false,
  className: cfg.className,
});
