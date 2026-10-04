// ── A DAILY LIMIT ON GOOGLE'S MAP CALLS ─────────────────────────────
//
// Security review, 4 Oct 2026, finding 5. api/places.js and api/directions.js
// each spend Oliver's Google money on every call, and the only check was the
// Origin header, which a script can send as easily as a browser. A loop from
// one machine could run the Google bill up all night.
//
// Now every call is counted, the same way the AI calls are (aiGate.js): once
// against the visitor's address and once against the whole site, in one step
// in Supabase. Past either, or with the counter out of reach, the call is
// refused and Google is never asked. A refused leg is drawn faint on the walk
// map and left out of a guide's timing, which is what a failed call already did.
//
// The address limit is generous on purpose. A guide with its route map asks
// for some tens of legs, the Studio asks more while drafting, and an office or
// a hotel shares one address among many people. Both limits are set in Vercel
// without a code change: GEMLYX_MAPS_PER_VISITOR and GEMLYX_MAPS_PER_DAY, with
// 0 switching the maps off.
//
// Not cached at the CDN, though that would be cheaper: Google's terms allow
// only coordinates to be kept, for at most 30 days, and a walking time or a
// station's name is not a coordinate.
import { takeDaily, visitorKey, limitOf, SUPABASE_FALLBACK_URL } from "./aiGate.js";
import { copenhagenDay } from "./guideAllowance.js";

export const readMapsLimits = (env = {}) => ({
  perVisitor: limitOf(env.GEMLYX_MAPS_PER_VISITOR, 400),
  perDay: limitOf(env.GEMLYX_MAPS_PER_DAY, 6000),
});

export const MAPS_BUSY = "Maps are not available just now.";
export const MAPS_DONE = "Maps have reached today's limit. Try again tomorrow.";

// Returns { ok: true } or { ok: false, status, error }.
export const gateMaps = async ({ headers, env = {}, fetchImpl = fetch, now = new Date() }) => {
  const limits = readMapsLimits(env);
  if (limits.perVisitor === 0 || limits.perDay === 0) return { ok: false, status: 503, error: MAPS_BUSY };
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "";
  if (!serviceKey) return { ok: false, status: 503, error: MAPS_BUSY };
  const visitor = visitorKey(headers, serviceKey.slice(-16)).replace(/^ai:v:/, "maps:v:");
  const got = await takeDaily({
    day: copenhagenDay(now),
    keys: [{ key: visitor, limit: limits.perVisitor }, { key: "maps:site", limit: limits.perDay }],
    supabaseUrl: env.SUPABASE_URL || SUPABASE_FALLBACK_URL,
    serviceKey, fetchImpl,
  });
  if (got.closed) return { ok: false, status: 503, error: MAPS_BUSY };
  if (!got.ok) return { ok: false, status: 429, error: MAPS_DONE };
  return { ok: true };
};
