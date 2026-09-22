// ── ONE DOOR TO NOMINATIM, AT THE PACE IT ASKS FOR ──────────────────
//
// Oliver, 21 Sep 2026, before a first beta tester: the question was whether
// the app is ready, and this was one of the three things standing between it
// and a stranger using it. Nominatim's usage policy
// (operations.osmfoundation.org/policies/nominatim) asks for an absolute
// maximum of one request per second and for results to be cached. Guide builds
// sent one every 250 ms and cached nothing, from six call sites that each
// wrote their own fetch. A tester building two guides in a row would ask the
// same questions twice, four times faster than allowed, and a blocked referer
// means every map in the app stops placing pins at once.
//
// So every search goes through here:
//
//   ONE QUEUE for the whole tab, at least NOMINATIM_GAP_MS between requests,
//   however many callers ask at the same moment. Promise.all over two lookups
//   is still two requests a second apart.
//
//   A CACHE, in memory and in localStorage, keyed by the exact URL. A place
//   does not move in a month, and a cached answer costs the service nothing
//   and the traveller no wait. An empty answer is cached too, because "nothing
//   by that name" asked again is the same question with the same answer. An
//   HTTP error is never cached: a 429 today is not a fact about the place.
//
// localStorage can throw or come back empty (private windows, blocked site
// data), so every read and write is wrapped and the memory cache carries on.
export const NOMINATIM_GAP_MS = 1100;
export const NOMINATIM_CACHE_DAYS = 30;
export const NOMINATIM_CACHE_MAX = 400;
const STORE_KEY = "gemlyx.nominatim.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

const browserStore = {
  read() {
    try { return JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || "{}") || {}; } catch { return {}; }
  },
  write(obj) {
    try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(obj)); } catch { /* full or blocked: memory still holds it */ }
  },
};

// Built as a factory so the tests can hand it a clock, a fetch and a store,
// and the app uses the one instance below.
export const makeNominatim = ({
  fetchImpl = (...a) => fetch(...a),
  now = () => Date.now(),
  wait = (ms) => new Promise(r => setTimeout(r, ms)),
  store = browserStore,
  gapMs = NOMINATIM_GAP_MS,
} = {}) => {
  const mem = new Map();
  let loaded = false;
  let chain = Promise.resolve();
  let last = -Infinity;
  const inflight = new Map();

  const load = () => {
    if (loaded) return;
    loaded = true;
    let saved = {};
    try { saved = store.read() || {}; } catch { saved = {}; }
    const fresh = now() - NOMINATIM_CACHE_DAYS * DAY_MS;
    for (const [k, v] of Object.entries(saved || {})) {
      if (v && typeof v.at === "number" && v.at >= fresh) mem.set(k, v);
    }
  };
  const save = () => {
    const rows = [...mem.entries()].sort((a, b) => b[1].at - a[1].at).slice(0, NOMINATIM_CACHE_MAX);
    try { store.write(Object.fromEntries(rows)); } catch { /* memory still holds it */ }
  };

  // `cache: false` for a question that carries the traveller's own position:
  // a reverse lookup's URL is their coordinates, and those do not go into
  // localStorage. It still waits its turn in the queue.
  const json = async (url, { cache = true } = {}) => {
    const key = String(url || "");
    if (!/^https:\/\/nominatim\.openstreetmap\.org\//.test(key)) throw new Error("not a Nominatim URL");
    load();
    const held = cache ? mem.get(key) : null;
    if (held) return held.data;
    // The same question asked twice at once is one request.
    if (cache && inflight.has(key)) return inflight.get(key);
    const turn = chain.then(async () => {
      const gap = last + gapMs - now();
      if (gap > 0) await wait(gap);
      last = now();
      const res = await fetchImpl(key);
      if (!res?.ok) return null;
      const data = await res.json();
      if (cache) { mem.set(key, { at: now(), data }); save(); }
      return data;
    });
    chain = turn.catch(() => null);
    if (!cache) return turn;
    inflight.set(key, turn);
    try { return await turn; } finally { inflight.delete(key); }
  };
  return { json, size: () => mem.size };
};

const shared = makeNominatim();
// The one every caller uses. Resolves to the parsed JSON, or null on an HTTP
// error; throws only where fetch itself would have, which every caller
// already catches.
export const nominatimJson = (url, opts) => shared.json(url, opts);
