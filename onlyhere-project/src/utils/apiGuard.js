// ── WHO IS ALLOWED TO SPEND HIS MONEY ────────────────────────────────
//
// Oliver, 17 Aug 2026, going for a nap: "perhaps install some security while I'm
// black out."
//
// The audit that prompted this file: of fourteen serverless functions, exactly
// ONE checked anything. api/ask.js resolves a Supabase bearer token before it
// answers. The other thirteen answer anybody.
//
// That is not a theoretical exposure. `curl -X POST https://gemlyxtravel.com/api/anthropic
// -d '{"prompt":"...","maxTokens":8192}'` is a working request to Claude on his
// card, from anywhere, with no account, at 8192 tokens a call, in a loop. The same
// is true of /api/openai, /api/perplexity, /api/search (Tavily), /api/scan-source
// (Firecrawl credits) and /api/places-hours, which is the Places Details
// Enterprise SKU and the most expensive call in the app. He has said in almost
// every conversation that cost is what worries him, and there is no rate limit and
// no login gate anywhere in front of any of it.
//
// ── AND WHY THE OBVIOUS FIX WOULD BREAK THE PRODUCT ─────────────────
// "Require a login" is wrong for most of them. A visitor builds a guide without an
// account, deliberately: shouldOfferAccount exists precisely because the guide
// works first and the account is offered afterwards. That guide build calls
// anthropic, openai, perplexity, search, directions and weather. Gating those on a
// session would turn the front door into a signup wall.
//
// So this file draws the line where it actually falls:
//
//   sameOrigin   every endpoint. A browser on gemlyxtravel.com sends an Origin or
//                a Referer. curl sends neither, and a script pointed at the domain
//                sends the wrong one. This is the cheap half and it costs a
//                legitimate visitor nothing.
//   studioOnly   the five endpoints only Studio ever calls. Those get the ask.js
//                treatment: a real Supabase token, resolved by Supabase rather than
//                decoded here, because a decoded JWT proves the shape of a string
//                and not that the session still exists.
//
// NEITHER IS A RATE LIMIT, and this file does not pretend to be one. A real
// limiter needs shared storage, which on the Hobby plan means a Supabase table and
// his SQL, and that is written up rather than half-built here: a per-instance
// counter in a serverless function resets whenever the platform feels like it and
// would read as protection while providing close to none.

// The origins a browser can legitimately be on. Preview deployments are included
// deliberately: he tests on them, and a blocked preview reads as a broken app
// rather than as a security control.
export const ALLOWED_ORIGINS = [
  "https://gemlyxtravel.com",
  "https://www.gemlyxtravel.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

// A vercel.app preview host for THIS PROJECT, and nothing else on vercel.app.
//
// The first version of this line was /^https:\/\/[a-z0-9-]+\.vercel\.app$/, which
// is a hole rather than a convenience: anybody can deploy a page to vercel.app in
// two minutes, and a browser on it could then call these endpoints all day. The
// response would be unreadable to them, because nothing here sends CORS headers,
// but the request still lands and the call is still billed, which is the exact
// thing this file exists to stop.
//
// So the host has to begin with one of his own project names. only-here-three is
// the original deployment, still resolving, and the one his friend tested on.
//
// ── AND NOW NOT EVEN THAT ───────────────────────────────────────────
// Security review, 3 Oct 2026, finding 12: "begins with onlyhere" still let in
// anybody who named their own Vercel project onlyhere-anything. So a vercel.app
// host is allowed in two cases only: the original deployment by its
// exact name, or the address of THIS deployment as Vercel itself reports it to
// the function (VERCEL_URL, VERCEL_BRANCH_URL). A preview calling its own API
// carries exactly that address, so testing on a preview still works.
const VERCEL_ALIASES = ["https://only-here-three.vercel.app"];
const envOf = () => { try { return (typeof process !== "undefined" && process.env) || {}; } catch { return {}; } };
export const ownDeployments = (env = envOf()) =>
  [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
    .map(h => String(h || "").trim().toLowerCase())
    .filter(Boolean)
    .map(h => `https://${h.replace(/^https?:\/\//, "")}`);

export const originOf = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  try { return new URL(v).origin; } catch { return ""; }
};

export const isAllowedOrigin = (value, env = envOf()) => {
  const o = originOf(value).toLowerCase();
  if (!o) return false;
  return ALLOWED_ORIGINS.includes(o) || VERCEL_ALIASES.includes(o) || ownDeployments(env).includes(o);
};

// ── THE CHECK ITSELF ────────────────────────────────────────────────
// Origin first, because a browser sends it on every cross-origin request and on
// same-origin POSTs, and it cannot be set by page JavaScript. Referer second,
// because a same-origin GET may send only that.
//
// PRESENCE IS REQUIRED, and that is the whole point. Allowing a request with
// neither header would leave curl working, which is the case this exists for. The
// cost is that a browser stripping its own Referer on a same-origin GET is refused,
// which is why the message says what happened rather than just failing.
export const requestIsFromSite = (headers) => {
  const h = headers || {};
  const get = (k) => String((typeof h.get === "function" ? h.get(k) : h[k]) || "");
  const origin = get("origin");
  if (origin) return isAllowedOrigin(origin);
  const referer = get("referer") || get("referrer");
  if (referer) return isAllowedOrigin(referer);
  return false;
};

export const NOT_FROM_SITE = "This endpoint only answers requests from the Gemlyx site.";

// ── AND THE FIVE THAT ARE STUDIO'S ALONE ────────────────────────────
// Checked by CALLER, not by guesswork: these five appear nowhere in GuidePage,
// GuideRouteMap, WeatherStrip or any reader path. They run while a draft is being
// researched, which only ever happens behind the Studio login.
export const STUDIO_ONLY_ENDPOINTS = [
  "scan-source",     // Firecrawl credits
  "places-hours",    // Places Details Enterprise SKU, the dearest call in the app
  "places-locate",
  "tickets",
  "commons-photo",
  // 14 Sep 2026. Added in the same commit as the social sweep, because this
  // list is not documentation: five blocks of the suite are driven off it, and
  // an endpoint that spends money and is left off is one that gets none of
  // them. It is founder-gated in its own file either way; being named here is
  // what makes the suite check that the gate is still there next month.
  "social-find",    // API Direct requests, priced per call
  // 28 Sep 2026. Free to run, since it only makes plain page reads, but it
  // fetches any address it is handed, so it is gated like scan-source rather
  // than left as an open proxy.
  "find-email",
  // 1 Oct 2026. BestTime forecasts, paid per request, for the busyness line
  // on an entry. Studio fetches it about once a month per place.
  "busyness",
];

// Resolve a bearer token with Supabase. Lifted from api/ask.js rather than
// rewritten, including the reason it is done this way: Supabase is asked who the
// token belongs to, because decoding it locally proves the string is well formed
// and nothing else.
//
// `fetchImpl` is injectable so this is testable without a network.
export const resolveUser = async (headers, { supabaseUrl, serviceKey, fetchImpl } = {}) => {
  const h = headers || {};
  const get = (k) => String((typeof h.get === "function" ? h.get(k) : h[k]) || "");
  const auth = get("authorization");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "Sign in to Studio to use this." };
  if (!supabaseUrl || !serviceKey) return { ok: false, status: 503, error: "Could not verify your session just now." };
  const f = fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!f) return { ok: false, status: 503, error: "Could not verify your session just now." };
  try {
    const who = await f(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
    });
    if (!who.ok) return { ok: false, status: 401, error: "Your Studio session has expired. Log out and back in." };
    const u = await who.json();
    const id = u?.id ? String(u.id) : "";
    if (!id) return { ok: false, status: 401, error: "Sign in to Studio to use this." };
    return { ok: true, userId: id, email: String(u?.email || "") };
  } catch {
    return { ok: false, status: 503, error: "Could not verify your session just now." };
  }
};

// ── ONLY HIM ────────────────────────────────────────────────────────
// GEMLYX_FOUNDER_IDS names the accounts that count as the founder. It used to
// be that an EMPTY list let every signed-in account through, which was safe
// only while nobody else could sign up. Travellers have accounts now, so a
// deploy that lost the variable would have opened every Studio endpoint to all
// of them (Fable's audit, 30 Sep 2026). An empty list now means Oliver's own
// account and nobody else: never wider than intended, and still not a lockout
// on a four in the morning deploy.
export const FOUNDER_FALLBACK_ID = "467fb712-e3e9-4d43-b1b8-e4e1bb32b76d";
export const isFounder = (userId, allowList) => {
  const list = String(allowList || "").split(",").map(s => s.trim()).filter(Boolean);
  const ids = list.length ? list : [FOUNDER_FALLBACK_ID];
  return !!userId && ids.includes(String(userId));
};
