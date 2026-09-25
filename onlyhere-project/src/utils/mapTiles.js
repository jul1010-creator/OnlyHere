// ── WHERE THE TILE URL LIVES ─────────────────────────────────────────
//
// Oliver, 18 Aug 2026, holding the Stamen Watercolor endpoint: "so where do I
// put this then?"
//
// In three places, as it turned out, which is the answer this file exists to
// stop being true. `L.tileLayer("https://tile.openstreetmap.org/...")` was
// written out verbatim in GuideRouteMap.jsx, PlaceMiniMap.jsx and
// LeafletMap.jsx, each with its own maxZoom and its own attribution string.
// Three copies of one decision is the exact habit that has already cost this
// codebase two disagreeing walking-time estimates, two event-type lists, four
// coordinate lookups and a `daysUntil`. Swapping a basemap by hand-editing three
// files works once and then one of them gets missed.
//
// So: one style table, read by all three.
//
// ── AND A BASEMAP IS THREE THINGS, NOT ONE ──────────────────────────
// This is the part that bites if you only change the URL. A tile layer is a URL
// AND a maximum zoom AND an attribution, and all three are properties of the
// provider rather than of the map showing it:
//
//   maxZoom      Watercolor tops out at 16 and the original tileset has gaps
//                above that. Leaving 19 in place makes Leaflet request tiles
//                nobody has, and you get grey holes when somebody zooms in —
//                which reads as "this map is broken", not "this map is antique".
//
//   attribution  Stadia require three credits: Stadia Maps, Stamen Design and
//                OpenStreetMap contributors. That is a licence condition, not a
//                courtesy, and it is on a paid product.
//
//   filter       See the note on `filter` below. This is the one that will make
//                you think Watercolor looks terrible when it does not.
//
// ── AND SINCE 13 SEP 2026, A FOURTH THING: HOW IT IS DRAWN ─────────
// A raster provider sends pictures and the URL is the whole request. A vector
// provider sends geometry and the picture is drawn here, from a style. So a
// style row carries EITHER a tile URL for L.tileLayer OR a `glStyle` for
// MapLibre, and addTileLayer reads which by whether glStyle is present. That
// one field is the reader; there is no separate "kind" flag to fall out of
// step with it.
//
// ── AND A FIFTH: WHAT TO SHOW WHEN IT FAILS ────────────────────────
// `fallback` names the next row to try when this one is refused. Before the
// vector style there was one fallback for everything, the OSM raster, and it
// was spelled DEFAULT_TILE_STYLE. Now the chain is chart, then navy, then dark:
// a guide whose Watercolor is refused gets the drawn navy map, and a night when
// OpenFreeMap is down degrades to the inverted OSM raster the app shipped with
// rather than to a dark box. The last row has no fallback, on purpose: see
// addTileLayer for why the layer that always works gets no handler.
import { BASEMAP_STYLE, OPENFREEMAP_TILEJSON, OPENFREEMAP_ATTRIBUTION } from "./mapStyle";

export const TILE_STYLES = {
  // ── THE DEFAULT: DRAWN, DARK, AND WORDLESS ─────────────────────
  // Oliver, 13 Sep 2026: the inverted map "does look kinda old school... how it
  // reads the countries". OpenFreeMap's vector tiles drawn by the style in
  // mapStyle.js: land and sea in the dark theme's own colours, a coastline,
  // subdued roads, and not one place name, because the app's town chips are
  // meant to be the only words on the map. See mapStyle.js for the whole
  // reasoning, including why OpenFreeMap and not the three others measured.
  //
  // `url` is the TileJSON the style points at, reported here so that "where do
  // these tiles come from" has the same answer for every row in this table.
  navy: {
    url: OPENFREEMAP_TILEJSON,
    glStyle: BASEMAP_STYLE,
    maxZoom: 19,
    attribution: OPENFREEMAP_ATTRIBUTION,
    filter: "",
    fallback: "dark",
  },

  // What the app used from the start: OpenStreetMap, inverted to dark so it sits
  // in the dark brand. The end of every fallback chain now rather than the
  // default, because OSM's tile usage policy says commercial access "may be
  // blocked without prior notice" and the "Access blocked" grid has already
  // been seen once, from a page with no Referer.
  dark: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    // The dark inversion, moved here from the single `.gemlyx-tiles` rule in
    // App.jsx so the filter travels with the tiles it was written for. A style
    // whose tiles are already painted must NOT inherit it.
    filter: "invert(1) hue-rotate(189deg) brightness(0.92) contrast(1.12) saturate(0.35)",
    fallback: null,
  },

  // ── THE CHART ─────────────────────────────────────────────────────
  // Stamen Watercolor, hosted by Stadia Maps. Their own description: "reminiscent
  // of hand drawn maps... raster effect area washes and organic edges over a
  // paper texture."
  //
  // ── AND HOW IT AUTHENTICATES, GOT WRONG TWICE ─────────────────────
  // First mistake, 18 Aug: I read Stadia's "an API key is not strictly required
  // for tile access" and shipped with no auth at all. His screen came back a grid
  // of "401 Error — Invalid Authentication" tiles where Denmark should be.
  //
  // Second mistake, 19 Aug: I fixed that by reading the key from
  // VITE_STADIA_KEY. Oliver, immediately: "Why VITE stadia key?? So others can
  // use my key too..?"
  //
  // He is right, and Stadia's own authentication page says it in as many words:
  // "You should take care not to expose your API key unnecessarily. That's why we
  // recommend domain-based authentication for web browser applications... We
  // recommend only using API keys in cases where it is not likely to be leaked to
  // an end user (ex: server-side and mobile applications)."
  //
  // Vite inlines every VITE_-prefixed variable into the bundle at build time. It
  // is not a secret store, it is a find-and-replace. The key would have sat in a
  // public JS file and in the query string of every tile request, readable by
  // anyone who opened the network tab, and billable to him.
  //
  // ── DOMAIN-BASED AUTHENTICATION, WHICH NEEDS NO KEY ───────────────
  // Stadia validate the Origin and Referer headers the browser already sends.
  // The domain is registered once in their dashboard and the plain URL below
  // works: nothing in the bundle, nothing to leak, nothing to rotate. And, from
  // the same page: "As long as you're running via a development server accessed
  // via localhost or 127.0.0.1, you don't need an API key!" — which is what that
  // "not strictly required" sentence actually meant, and why nothing looked
  // wrong until it was deployed.
  //
  // SO THERE IS NO KEY IN THIS FILE AND THERE SHOULD NEVER BE ONE.
  // What has to happen instead, once, by hand:
  //   client.stadiamaps.com/dashboard -> Manage Properties -> Authentication
  //   Configuration -> add the domain. Per their docs a site on a.b.example.com
  //   registers subdomain `a` and domain `b.example.com`, so gemlyxtravel.com and
  //   its www subdomain are two entries.
  chart: {
    url: "https://tiles-eu.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg",
    maxZoom: 16,
    attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a>'
      + ' &copy; <a href="https://stamen.com/" target="_blank" rel="noreferrer">Stamen Design</a>'
      + ' &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    filter: "",
    // The guide keeps the chart Oliver chose for it. When Stadia declines, the
    // drawn navy map is the next best thing and the raster comes after that.
    fallback: "navy",
  },
};

// What a component gets when it does not ask for anything, and where an
// unknown name lands. Not the end of the fallback chain any more: that is
// whichever row has no `fallback`.
// ── AND HE LOOKED AT IT AND WANTED THE DETAIL BACK ──────────────────
//
// Oliver, 14 Sep 2026, 01:30, on the navy map running on his own dev server:
// "I don't like that map though.. I do like a detailed map."
//
// Fair, and the fault is upstream of the style. The brief I wrote for it said
// Denmark as a shape with no words on it, because his complaint the hour before
// was foreign region names shouting over Danish ones. Stripping every label and
// most of the detail answers that complaint by removing the map, and a travel
// app wants the opposite: roads, towns, the places around the places.
//
// So the default goes back to the raster he already had while that gets built
// properly. NOTHING ELSE IS TORN OUT. The navy row, the style, the MapLibre
// loader and the whole vector path stay exactly where they are, because the
// detailed version is that style with layers added rather than a different
// mechanism, and OpenFreeMap is still the only source that is free, keyless and
// allowed commercially. This line is the switch.
// ── AND IT GOES BACK, 25 SEP 2026 ──────────────────────────────────
//
// Oliver, on the raster: "I also hate this.. it looks so dull and dead." He is
// right, and the cause was one value: the inversion carries saturate(0.35),
// which throws away two thirds of the colour of an already darkened image, so
// the land comes out near-black and the water grey. Nothing was broken. It was
// tuned to be unobtrusive and it overshot.
//
// The paragraph above says the raster was a holding position "while that gets
// built properly", and what was missing is now built: the drawn style has place
// names, in Danish first, and roads that read at a glance rather than at 0.2
// opacity. So the switch goes back, and the raster stays exactly where it was
// designed to be, at the end of the fallback chain for the day OpenFreeMap
// declines.
export const DEFAULT_TILE_STYLE = "navy";

// ── WHAT DECIDES WHETHER THE CHART IS AVAILABLE ─────────────────────
//
// Nothing in the bundle can know, and that is the whole lesson of the last two
// days. I decided from a docs sentence and got 401s; I decided from a build-time
// env var and exposed a key. A domain either is registered with Stadia or it is
// not, and the only thing that knows is Stadia's answer to a real tile request.
//
// Vercel preview deployments make it concrete: they get a random *.vercel.app
// hostname nobody will ever register, so a build-time flag would be wrong on
// every preview while being right in production.
//
// So the server is asked and its answer is believed. A style whose tiles come
// back refused is recorded here and stops being handed out. Module-level rather
// than per-map, because the answer is about the DOMAIN — once one map has learned
// it, every map opened afterwards already knows.
const refused = new Set();

// ── AND IT IS REMEMBERED ACROSS RELOADS, WITH AN EXPIRY ─────────────
//
// Learning from the server costs three refused tiles, which render for a moment
// before the swap. Once per session is tolerable; once per page load, on the
// guide a reader has paid for, is not — so the answer is memoed.
//
// THE EXPIRY IS THE WHOLE POINT AND NOT A DETAIL. Without it, the first browser
// to see a 401 would keep the plain basemap forever, including after the domain
// is registered and the chart starts working. That is the same failure shape as
// deciding at build time, just slower to notice. One day: at worst one brief
// flash a day while it is broken, and it picks itself up within a day of being
// fixed.
const REFUSED_KEY = "gemlyx_tiles_refused";
export const REFUSED_TTL_MS = 24 * 60 * 60 * 1000;

// localStorage is absent in Node, blocked in some privacy modes, and full on some
// phones. Every read and write here is best-effort: the feature degrades to
// learning once per session, which is what it did before the memo existed.
//
// Resolved through globalThis AT CALL TIME rather than closed over at module load.
// That is what makes it testable: this suite runs under plain Node with no
// localStorage, so a memo that read a captured reference would be dead code no
// assertion could reach — and the first version of it was exactly that, with a
// mutation removing the whole expiry surviving as proof.
const store = () => {
  try { return globalThis.localStorage || null; } catch { return null; }
};

export const readRefusedMemo = () => {
  const st = store();
  if (!st) return;
  try {
    const raw = JSON.parse(st.getItem(REFUSED_KEY) || "{}");
    // Date.now() against a stored stamp, so a clock moved BACKWARDS shortens the
    // memo rather than extending it forever, which a stored expiry would.
    //
    // THE AGE IS RANGE-CHECKED IN BOTH DIRECTIONS, and the second half is the one
    // that matters. `age < TTL` alone accepts a NEGATIVE age — a stamp in the
    // future, from a clock that has since been set back or from anything that has
    // written to this key — and a negative age never expires, so one bad stamp
    // would turn the chart off indefinitely. Mutation testing is what surfaced
    // this: removing the isFinite guard changed nothing, because NaN fails the
    // comparison anyway, and an equivalent mutant is the shape of a guard that is
    // not guarding what it looks like it guards.
    // Number.isFinite CANNOT BE ISOLATED BY A MUTATION and that is stated rather
    // than hidden, the same way geography.js states it about its own fast path: a
    // NaN age fails `age >= 0` on its own, so removing the check changes nothing
    // today. It stays as the statement of intent — a stamp that is not a number is
    // not a time — and the mutation suite does not pretend to cover it.
    Object.entries(raw).forEach(([name, at]) => {
      const age = Date.now() - Number(at);
      if (Number.isFinite(age) && age >= 0 && age < REFUSED_TTL_MS) refused.add(name);
    });
  } catch { /* no storage, or junk in it: learn from the server again */ }
};

export const writeRefusedMemo = () => {
  const st = store();
  if (!st) return;
  try {
    const now = Date.now();
    st.setItem(REFUSED_KEY, JSON.stringify(
      Object.fromEntries([...refused].map(n => [n, now]))));
  } catch { /* a blocked or full localStorage is never worth failing a map over */ }
};
readRefusedMemo();

export const styleRefused = (name) => refused.has(name);
// Tests only. Exported rather than having the suite reach into module state, so
// the test does not depend on this staying a Set. Clears the memo too, or a test
// would leak its refusal into the next one.
export const __resetRefusedStyles = () => {
  refused.clear();
  try { store()?.removeItem(REFUSED_KEY); } catch { /* nothing to clear */ }
};

// ── ONE MISSING TILE IS NOT A REFUSAL ───────────────────────────────
// `tileerror` fires for an ordinary gap too: a tile past the edge of coverage, a
// dropped connection, one 504. Swapping the basemap on the first one would make a
// flaky network look like a broken product. Three tells a refusal — which fails
// EVERY tile in a viewport, and a viewport holds a dozen — from a hole, which
// fails one.
export const TILE_ERROR_LIMIT = 3;

// One call site shape for all three components. Returns exactly the object
// L.tileLayer's options want, plus the className the filter hangs off.
//
// An unknown style name falls back to the default rather than returning
// undefined and blanking the map: a typo in a prop should cost you the styling
// you asked for, not the basemap.
export const tileConfig = (style = DEFAULT_TILE_STYLE) => {
  let name = TILE_STYLES[style] ? style : DEFAULT_TILE_STYLE;
  // Down the chain past every row the server has refused, stopping at the
  // first that has not been, or at the row with nowhere further to go. Bounded
  // by the size of the table so a fallback typed as a loop can never spin.
  for (let hops = 0; refused.has(name) && TILE_STYLES[name].fallback && hops < Object.keys(TILE_STYLES).length; hops++) {
    name = TILE_STYLES[name].fallback;
  }
  const s = TILE_STYLES[name];
  return {
    url: s.url,
    maxZoom: s.maxZoom,
    attribution: s.attribution,
    className: `gemlyx-tiles gemlyx-tiles-${name}`,
    // Which style resolved in the end, so a caller that cares can tell whether
    // it got what it asked for rather than having to guess.
    style: name,
    // Present for a drawn style, absent for a raster one. addTileLayer reads
    // this and nothing else to choose its path.
    glStyle: s.glStyle || null,
    fallback: s.fallback || null,
  };
};

// ── THE MAPLIBRE CHUNK, REACHED THROUGH ONE SEAM ───────────────────
// vectorBasemap.js is where maplibre-gl, its worker and the Leaflet plugin are
// imported, and it is loaded on demand: see that file for the bundle arithmetic.
// The import() is behind a function so the suite can stand in a fake, the way
// it already stands in a fake L. Under plain Node the real import would fail,
// which is a fine way to test the path where the chunk never arrives and a poor
// way to test every other one.
const loadVector = () => import("./vectorBasemap.js");
let vectorLoader = loadVector;
// Tests only, like __resetRefusedStyles. Passing nothing restores the real one.
export const __setVectorLoader = (fn) => { vectorLoader = fn || loadVector; };

// ── ADD THE LAYER, AND FALL BACK IF IT IS REFUSED ───────────────────
//
// The three components each called `L.tileLayer(tileConfig(x).url, tileConfig(x))`
// directly, which is fine right up to the moment the tiles 401 — and then there
// is nowhere to put the recovery except in three places. So the wiring lives here
// with the table it belongs to.
//
// L is a parameter rather than an import for two reasons: this file is bundled by
// the test suite under plain Node, where `leaflet` reaches for `window`; and
// injecting it is the only way to test a path that otherwise needs a real 401
// from a real unregistered domain to fire.
//
// ── AND SINCE THE VECTOR STYLE, TWO PATHS INTO ONE RECOVERY ────────
// A raster row is L.tileLayer, synchronous, and returns the layer, as it
// always did. A drawn row needs maplibre-gl, which arrives in its own chunk,
// so that path is asynchronous and returns a promise of the layer (null once
// it has fallen back or the map went away first). No component reads the
// return value; the suite does.
//
// Whatever fails, the recovery is the same function: remember what was
// refused, take the failed layer off, and ask for the next row down the
// chain. The raster path has done that since August; the drawn path adds two
// ways to fail before a single tile is asked for and one after, listed at
// each site below.
export const addTileLayer = (L, map, style = DEFAULT_TILE_STYLE) => {
  const cfg = tileConfig(style);
  // ── THE CREDIT IS THE PROVIDER'S CONDITION, NOT THE MAP'S CHOICE ──
  // ChatMiniMap builds its map with attributionControl off, and a map with
  // no control renders no credit whichever layer is on it. OpenFreeMap's terms
  // are the credit and nothing else, and OSM's tile policy asks for the same,
  // so a map that arrives without a control gets one here, from the file that
  // owns the provider. Leaflet's own default corner, like the other maps.
  if (!map.attributionControl && cfg.attribution && L.control?.attribution) {
    L.control.attribution().addTo(map);
  }
  // ── A MAP THAT HAS BEEN TORN DOWN IS NOT ADDED TO ──────────────
  // React unmounts the component, the effect cleanup calls map.remove(), and
  // some time later the chunk arrives or a third refused tile lands. Leaflet
  // empties its panes on remove(), so adding a layer then throws from inside
  // a promise callback or an image error handler, with nobody to catch it.
  // remove() fires `unload` first, which is the one signal Leaflet gives.
  let gone = false;
  map.once?.("unload", () => { gone = true; });
  let done = false;
  const giveUp = (layer, remember, why) => {
    if (done) return null;
    done = true;
    // Recorded BEFORE the swap, so tileConfig stops handing this style out
    // immediately and a second map on the same page never repeats the refusal.
    // Recorded even when this map has gone, because the server's answer is
    // about the server. Not recorded at all for a chunk that never arrived:
    // see below.
    if (remember) { refused.add(cfg.style); writeRefusedMemo(); }
    if (gone) return null;
    if (layer) { try { map.removeLayer(layer); } catch { /* a map already torn down is fine */ } }
    if (!cfg.fallback) return null;
    // Said out loud, because with a listener on MapLibre's error event its own
    // console line goes quiet, and "why is my map the old one today" is a
    // question Oliver will ask with the console open.
    console.warn(`Gemlyx basemap: ${cfg.style} ${why}, showing ${tileConfig(cfg.fallback).style} instead`);
    // The NEXT row, asked for by name, whether or not this one was recorded.
    // Asking for `style` again would work for a recorded refusal (tileConfig
    // walks past it) and loop for an unrecorded one (it would hand this same
    // row straight back). One call shape that is right both times.
    return addTileLayer(L, map, cfg.fallback);
  };

  if (!cfg.glStyle) {
    const layer = L.tileLayer(cfg.url, cfg);
    layer.addTo(map);
    // Already on the basemap that always works: there is nothing to fall back
    // to, and attaching a handler that removes it is a way to end up with no
    // tiles at all on a bad connection.
    if (!cfg.fallback) return layer;
    let errors = 0;
    layer.on("tileerror", () => {
      if (++errors < TILE_ERROR_LIMIT) return;
      giveUp(layer, true, "refused its tiles");
    });
    return layer;
  }

  return vectorLoader().then((chunk) => {
    if (gone) return null;
    // FAILURE ONE: no WebGL2. MapLibre 6 throws from its constructor, which the
    // plugin runs inside addTo. An answer about the device rather than the
    // domain, remembered the same way: it will not change before the memo
    // expires, and remembering it saves the next map the chunk download.
    let layer;
    try {
      layer = chunk.vectorLayer(cfg);
      layer.addTo(map);
    } catch (err) {
      if (layer) { try { map.removeLayer(layer); } catch { /* the plugin's own onRemove is guarded for this */ } }
      return giveUp(null, true, `could not start (${err?.message || err})`);
    }
    // Same rule as the raster path: the last row gets no handler.
    if (!cfg.fallback) return layer;
    // FAILURE TWO: the server says no. MapLibre reports every failed request
    // as one `error` event, the way Leaflet reports one `tileerror`, so the
    // same limit tells a refusal from a hole. With one difference: a refused
    // TILESET DESCRIPTION (the TileJSON) means no tile will ever be asked for,
    // so that one event is the whole answer and counts as the whole limit. A
    // tile failure carries the tile; the description's failure does not.
    // Whether the failure is an HTTP status or the network is `status` either
    // way: MapLibre wraps a blocked or unreachable host as status 0.
    let errors = 0;
    layer.getMaplibreMap().on("error", (e) => {
      const whole = !e?.tile && Number.isFinite(e?.error?.status);
      errors += whole ? TILE_ERROR_LIMIT : 1;
      if (errors < TILE_ERROR_LIMIT) return;
      giveUp(layer, true, `was refused (${e?.error?.message || "tile errors"})`);
    });
    return layer;
  }, (err) => {
    // FAILURE THREE: the chunk itself did not arrive. NOT remembered, and this
    // is deliberate: the memo records what the SERVER said about a style, and
    // a chunk that failed to load says nothing about OpenFreeMap. The common
    // cause is a tab left open across a deploy, asking for a chunk hash the
    // new build no longer has; a reload fixes that, and a memo would have kept
    // the raster for a day after the reload.
    return giveUp(null, false, `did not load (${err?.message || err})`);
  });
};

// The CSS for every style, built FROM the table so a new style cannot be added
// without its filter arriving with it. Dropped into the same <style> block in
// App.jsx that the old single `.gemlyx-tiles` rule was in.
export const tileCss = () => Object.entries(TILE_STYLES)
  .filter(([, s]) => s.filter)
  .map(([name, s]) => `.gemlyx-tiles-${name} { filter: ${s.filter}; }`)
  .join("\n");
