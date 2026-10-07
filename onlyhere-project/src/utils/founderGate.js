// ── A CEILING ON STUDIO'S PAID LOOKUPS ──────────────────────────────
// Security review, 6 Oct 2026. The founder check says who may call; this
// says how much one day may cost if the token is ever copied. Limits leave
// about three times Studio's busiest real day. 0 or a typo in Vercel is off.
import { takeDaily, limitOf, SUPABASE_FALLBACK_URL } from "./aiGate.js";
import { copenhagenDay } from "./guideAllowance.js";

export const FOUNDER_DEFAULTS = { "places-hours": 300, "places-locate": 400, "social-find": 400, busyness: 100, firecrawl: 200, places: 1500, all: 3000 };
const envName = (route) => `GEMLYX_FOUNDER_${String(route).toUpperCase().replace(/-/g, "_")}`;
export const FOUNDER_BUSY = "Studio's counter could not be reached, so this paid lookup did not run.";
export const FOUNDER_DONE = "Studio has reached today's limit for this lookup. It starts again at midnight, Copenhagen time.";

export const gateFounder = async ({ route, env = {}, fetchImpl = fetch, now = new Date() }) => {
  const limit = limitOf(env[envName(route)], FOUNDER_DEFAULTS[route] ?? 100);
  const all = limitOf(env.GEMLYX_FOUNDER_ALL, FOUNDER_DEFAULTS.all);
  if (limit === 0 || all === 0) return { ok: false, status: 503, error: FOUNDER_BUSY };
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "";
  if (!serviceKey) return { ok: false, status: 503, error: FOUNDER_BUSY };
  const got = await takeDaily({
    day: copenhagenDay(now),
    keys: [{ key: `founder:${route}`, limit }, { key: "founder:all", limit: all }],
    supabaseUrl: env.SUPABASE_URL || SUPABASE_FALLBACK_URL,
    serviceKey, fetchImpl,
  });
  if (got.closed) return { ok: false, status: 503, error: FOUNDER_BUSY };
  if (!got.ok) return { ok: false, status: 429, error: FOUNDER_DONE };
  return { ok: true };
};
