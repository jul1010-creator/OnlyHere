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
export const TILE_STYLES = {
  // What the app has always used: OpenStreetMap, inverted to dark so it sits in
  // the dark brand. Kept as the default for the Studio map and the little map on
  // a place page, where a dark panel is the right answer.
  dark: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    // The dark inversion, moved here from the single `.gemlyx-tiles` rule in
    // App.jsx so the filter travels with the tiles it was written for. A style
    // whose tiles are already painted must NOT inherit it.
    filter: "invert(1) hue-rotate(189deg) brightness(0.92) contrast(1.12) saturate(0.35)",
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
  },
};

export const DEFAULT_TILE_STYLE = "dark";

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
  const asked = TILE_STYLES[style] ? style : DEFAULT_TILE_STYLE;
  const name = refused.has(asked) ? DEFAULT_TILE_STYLE : asked;
  const s = TILE_STYLES[name];
  return {
    url: s.url,
    maxZoom: s.maxZoom,
    attribution: s.attribution,
    className: `gemlyx-tiles gemlyx-tiles-${name}`,
    // Which style actually resolved, so a caller that cares can tell whether it
    // got what it asked for rather than having to guess.
    style: name,
  };
};

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
export const addTileLayer = (L, map, style = DEFAULT_TILE_STYLE) => {
  const cfg = tileConfig(style);
  const layer = L.tileLayer(cfg.url, cfg);
  layer.addTo(map);
  // Already on the basemap that always works: there is nothing to fall back to,
  // and attaching a handler that removes it is a way to end up with no tiles at
  // all on a bad connection.
  if (cfg.style === DEFAULT_TILE_STYLE) return layer;
  let errors = 0;
  layer.on("tileerror", () => {
    if (++errors < TILE_ERROR_LIMIT) return;
    // Recorded BEFORE the swap, so tileConfig stops handing this style out
    // immediately and a second map on the same page never repeats the 401s.
    refused.add(cfg.style);
    writeRefusedMemo();
    try { map.removeLayer(layer); } catch { /* a map already torn down is fine */ }
    const fb = tileConfig(DEFAULT_TILE_STYLE);
    L.tileLayer(fb.url, fb).addTo(map);
  });
  return layer;
};

// The CSS for every style, built FROM the table so a new style cannot be added
// without its filter arriving with it. Dropped into the same <style> block in
// App.jsx that the old single `.gemlyx-tiles` rule was in.
export const tileCss = () => Object.entries(TILE_STYLES)
  .filter(([, s]) => s.filter)
  .map(([name, s]) => `.gemlyx-tiles-${name} { filter: ${s.filter}; }`)
  .join("\n");
