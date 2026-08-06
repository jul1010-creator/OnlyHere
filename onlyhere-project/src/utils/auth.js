// ── Traveler accounts ──────────────────────────────────────────────
// Oliver's decisions, 5 Aug 2026: Google sign in AND email + password, both
// offered; accounts fully OPTIONAL (browse, plan and build a guide with no
// account, exactly as before); this first pass is accounts and saves only, no
// traveler profile and nothing touching the chat.
//
// Uses Supabase Auth, the same service the Studio login already runs on, so
// there is no new vendor and no new bill. Deliberately hand-rolled against the
// REST endpoints rather than pulling in @supabase/supabase-js: the app already
// talks to Supabase this way everywhere else, and adding the SDK for four calls
// would put a large dependency in the bundle for no benefit.
import { SUPABASE_URL, SUPABASE_KEY } from "../config";

const SESSION_KEY = "gemlyx_user_session";   // deliberately NOT the studio key

const readStored = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
};
const write = (session) => {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* private mode — the session just won't survive a reload */ }
};

const shape = (data) => (data?.access_token ? {
  token: data.access_token,
  refreshToken: data.refresh_token,
  // Supabase gives expires_in (seconds). Stored as an absolute moment so a
  // closed laptop cannot make an expired token look fresh.
  expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  email: data.user?.email || "",
  userId: data.user?.id || "",
} : null);

const post = async (path, body) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || `Sign in failed (${res.status})`);
  return data;
};

// ── Session ────────────────────────────────────────────────────────
// TOKENS EXPIRE AFTER AN HOUR. Without a refresh, saves would silently stop
// syncing mid-session and the person would have no idea anything was wrong,
// which is the worst kind of failure: no error, just quietly lost data. This
// refreshes a few minutes early and clears the session if the refresh itself
// fails, so the UI can honestly say "signed out" rather than pretend.
export const getSession = async () => {
  const stored = readStored();
  if (!stored) return null;
  if (Date.now() < stored.expiresAt - 120000) return stored;
  if (!stored.refreshToken) { write(null); return null; }
  try {
    const data = await post("token?grant_type=refresh_token", { refresh_token: stored.refreshToken });
    const next = shape(data);
    write(next);
    return next;
  } catch { write(null); return null; }
};

export const getStoredSession = readStored;   // synchronous, for first paint only

export const signUpWithPassword = async (email, password) => {
  const data = await post("signup", { email: email.trim(), password });
  // With email confirmation ON in Supabase, signup returns a user but no token.
  // That is not an error, it means "go and check your inbox", and the caller
  // needs to be able to tell the two apart.
  const session = shape(data);
  if (session) write(session);
  return { session, needsConfirmation: !session };
};

export const signInWithPassword = async (email, password) => {
  const data = await post("token?grant_type=password", { email: email.trim(), password });
  const session = shape(data);
  write(session);
  return session;
};

// Google goes through a full page redirect, so there is no promise to await:
// the browser leaves and comes back with tokens in the URL fragment, which
// captureRedirectSession picks up on the next load.
export const startGoogleSignIn = () => {
  const redirect = `${window.location.origin}${window.location.pathname}`;
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`;
};

// Supabase returns OAuth tokens in the URL HASH (#access_token=...), never as a
// query string, so they are not sent to any server. Read once, store, then
// scrub the address bar so the token is not sitting in a shareable URL or in
// browser history.
export const captureRedirectSession = () => {
  if (typeof window === "undefined" || !window.location.hash.includes("access_token")) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const session = shape({
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    expires_in: params.get("expires_in"),
  });
  if (!session) return null;
  write(session);
  history.replaceState(null, "", window.location.pathname + window.location.search);
  // The fragment carries no email, so fill it in from the user endpoint.
  fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.token}` } })
    .then(r => r.json())
    .then(u => { if (u?.email) write({ ...session, email: u.email, userId: u.id }); })
    .catch(() => { /* signed in fine, just no email shown until next load */ });
  return session;
};

export const sendPasswordReset = async (email) => {
  await post("recover", { email: email.trim() });
};

export const signOut = async () => {
  const stored = readStored();
  write(null);
  if (!stored?.token) return;
  // Best effort. The local session is already gone, which is what the person
  // asked for, so a failed server call must not resurrect it.
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${stored.token}` },
    });
  } catch { /* ignore */ }
};

// GDPR gives people a right to deletion, so this has to be a real button rather
// than an email address and a promise. Deleting the gemlyx_user_data row is
// what this key is allowed to do; removing the auth user itself needs the
// service role and therefore a server endpoint, so the caller tells the person
// plainly what happened rather than claiming more than was done.
export const deleteMyData = async (session) => {
  if (!session?.token || !session?.userId) throw new Error("Not signed in.");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_user_data?user_id=eq.${session.userId}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.token}` },
  });
  if (!res.ok) throw new Error((await res.text()).slice(0, 160));
};
