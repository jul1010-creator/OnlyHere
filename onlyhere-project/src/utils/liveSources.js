// ── THE FOUNDER'S SOURCE LIST, LOADED ONCE ──────────────────────────
// Same shape as liveFacts.js and liveContent.js, and for the same reason: the
// list has to be readable from a module-level function that every research
// prompt calls, including the ones on the traveller-facing guide pipeline where
// no Studio state exists. Threading it through React state would mean the guide
// fact-check silently ran without it.
//
// The array is MUTATED IN PLACE and exported, so `researchRules()` reads
// whatever is currently loaded without importing anything that could go stale.
// The guard is module-level, not a useRef: liveContent.js earned that rule the
// hard way when a per-mount guard let 55 rows get pushed in again on every
// remount.
//
// Anon-readable on purpose. The rules land in prompts the guide pipeline builds
// for visitors, so a list that only Studio could read would apply to half the
// research and not the other half, which is worse than not having one.
import { SUPABASE_URL, SUPABASE_KEY } from "../config";

export const founderSources = [];
let promise = null;

const doLoad = async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_sources?select=*&order=id.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const rows = await res.json();
    // A missing table returns an error object, not an array. That is the normal
    // state until the SQL is run, and everything must keep working: no list
    // simply means the hardcoded research rules stand on their own, exactly as
    // they did before this existed.
    if (!Array.isArray(rows)) { console.warn("gemlyx_sources not readable yet (run the SQL in the Studio panel):", rows); return; }
    founderSources.length = 0;
    rows.forEach(r => founderSources.push(r));
  } catch (e) {
    console.warn("gemlyx_sources load failed, research runs on the built-in rules alone:", e);
  }
};

// Caches its promise, so calling it on every mount costs one request per page
// session.
export const ensureSourcesLoaded = () => (promise = promise || doLoad());

// After an edit in Studio. The loader caches, so ensureSourcesLoaded alone would
// be a no-op here.
export const refreshSources = () => { promise = null; return ensureSourcesLoaded(); };
