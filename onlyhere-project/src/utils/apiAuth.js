// ── THE ACCOUNT, ON EVERY AI CALL ───────────────────────────────────
//
// 30 Sep 2026. The four AI routes (/api/anthropic, /api/openai,
// /api/perplexity, /api/search) now refuse a call without a signed-in account
// (see src/utils/aiGate.js). They are called from about thirty places, some
// through helpers handed a fetch, and a header added at each one is a header
// forgotten at one. So the token is added here, once, on the way out: any
// same-site request to one of those four paths that does not already carry an
// Authorization header gets the Studio token when the founder is signed in to
// Studio, and otherwise the member's own.
//
// A Studio token is refreshed by App.jsx, which registers how; a refused call
// is tried once more after a refresh. Nothing else about any request changes.
import { getSession } from "./auth";

export const AI_PATHS = /^\/api\/(anthropic|openai|perplexity|search)(\?|$)/;
// The paths the token is added to: the AI routes, and /api/places, which is
// Studio's only since the security review of 5 Oct 2026 (finding 4).
export const TOKEN_PATHS = /^\/api\/(anthropic|openai|perplexity|search|places)(\?|$)/;

let studioRefresher = null;
export const setStudioRefresher = (fn) => { studioRefresher = typeof fn === "function" ? fn : null; };

const studioToken = () => {
  try { return JSON.parse(localStorage.getItem("gemlyx_studio_session") || "null")?.access_token || ""; }
  catch { return ""; }
};

// When a token runs out, in milliseconds; 0 when it cannot be read.
export const tokenExpiresAt = (jwt) => {
  try { return JSON.parse(atob(String(jwt).split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000 || 0; }
  catch { return 0; }
};

export const aiToken = async () => {
  let studio = studioToken();
  // The AI routes treat a lapsed token as a visitor's, without a 401, so the
  // retry below never fires for it. Renewed here, two minutes early, the way
  // App.jsx renews it for the guide pass (security review, 4 Oct 2026).
  if (studio && studioRefresher && tokenExpiresAt(studio) - Date.now() < 120000) {
    const fresh = await studioRefresher().catch(() => null);
    if (fresh?.access_token) studio = fresh.access_token;
  }
  if (studio) return { token: studio, studio: true };
  try {
    const s = await getSession();
    return s?.token ? { token: s.token, studio: false } : { token: "", studio: false };
  } catch { return { token: "", studio: false }; }
};

// The path of a request, if it is to this site; "" otherwise.
export const sitePath = (input, origin) => {
  try {
    const raw = typeof input === "string" ? input : input?.url;
    if (!raw) return "";
    const u = new URL(raw, origin);
    return u.origin === origin ? `${u.pathname}${u.search}` : "";
  } catch { return ""; }
};

const hasAuth = (headers) => {
  if (!headers) return false;
  if (typeof headers.has === "function") return headers.has("authorization");
  return Object.keys(headers).some(k => k.toLowerCase() === "authorization");
};

export const installApiAuth = () => {
  if (typeof window === "undefined" || window.__gemlyxApiAuth) return;
  window.__gemlyxApiAuth = true;
  const plain = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const path = sitePath(input, window.location.origin);
    if (!path || !TOKEN_PATHS.test(path) || hasAuth(init.headers) || (typeof input !== "string" && hasAuth(input?.headers))) {
      return plain(input, init);
    }
    const send = (token) => plain(input, {
      ...init,
      headers: { ...(init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : (init.headers || {})), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const who = await aiToken();
    const res = await send(who.token);
    if (res.status === 401 && who.studio && studioRefresher) {
      const fresh = await studioRefresher().catch(() => null);
      if (fresh?.access_token) return send(fresh.access_token);
    }
    return res;
  };
};
