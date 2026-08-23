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
  // ── AND IT REPAIRS WHAT THE OLD BUG LEFT BEHIND ─────────────────
  // Anybody who signed in with Google before the fix above has a stored session
  // with a valid token and an empty userId, so every cloud call refuses it
  // forever and no amount of reloading helps. Filled in here rather than making
  // them sign out and back in to mend something they cannot see.
  if (!stored.userId && Date.now() < stored.expiresAt - 120000) return await withUser(stored);
  if (Date.now() < stored.expiresAt - 120000) return stored;
  if (!stored.refreshToken) { write(null); return null; }
  try {
    const data = await post("token?grant_type=refresh_token", { refresh_token: stored.refreshToken });
    // The refresh response may or may not carry a user object. Keeping what we
    // already knew means an hour-old Google session does not lose its id at the
    // exact moment it renews.
    const fresh = shape(data);
    if (!fresh) { write(null); return null; }
    const next = { ...fresh, userId: fresh.userId || stored.userId, email: fresh.email || stored.email };
    write(next);
    return next.userId ? next : await withUser(next);
  } catch { write(null); return null; }
};

export const getStoredSession = readStored;   // synchronous, for first paint only

// ── THE NAME TRAVELS WITH THE SIGNUP, FOR THE EMAIL ─────────────────
//
// Oliver, 22 Aug 2026, wanting the confirmation mail to open "Hi [Name],".
//
// Supabase's confirm-signup template can only interpolate what the auth row
// itself holds: {{ .Email }}, {{ .ConfirmationURL }}, {{ .SiteURL }} and
// {{ .Data }}, which is the user metadata sent at signup. Nothing else is
// reachable from there. The profile answers go to gemlyx_user_data, a table the
// email templating cannot see and will never be able to see, so a name that only
// lives there can never appear in the mail.
//
// So the name is passed here as well. DUPLICATED ON PURPOSE, which this codebase
// normally treats as a fault: the copy in gemlyx_user_data is the one the app
// reads and the one somebody can edit, and this copy exists solely so the
// greeting has something to greet. It is written once, at signup, and never
// updated, because an email template is the only thing that reads it.
//
// Trimmed and capped at the same 60 characters the form allows, and omitted
// entirely when empty rather than sent as "", so the template's own
// {{ if .Data.name }} check has something honest to test.
export const signUpWithPassword = async (email, password, name = "") => {
  const clean = String(name || "").trim().slice(0, 60);
  const data = await post("signup", { email: email.trim(), password, ...(clean ? { data: { name: clean } } : {}) });
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

// ── SIGNING IN WITH GOOGLE DID NOT WORK, AND SAID NOTHING ────────────
//
// Oliver, 21 Aug 2026: "let's fix the login auth now."
//
// Three separate faults, and the first one made the account useless rather than
// merely awkward.
//
// ONE: THE SESSION CAME BACK WITHOUT A USER ID. Supabase returns OAuth tokens
// in the URL fragment and the fragment carries NO user object, so shape() set
// `userId: ""`. The old code filled it in from /auth/v1/user in a floating
// promise that called write() and nothing else, so localStorage was eventually
// right and React state was wrong for the whole visit.
//
// Every single cloud call is gated on that field:
//
//     userSaves.js:25   if (!session?.token || !session?.userId) return null;
//     userSaves.js:43   if (!session?.token || !session?.userId) return false;
//     profile.js:327    if (!session?.token || !session?.userId) return null;
//     profile.js:343    if (!session?.token || !session?.userId) return { ok: false };
//
// So somebody who signed in with Google was signed in, saw their email, and had
// no saves sync, no profile load and no profile save until they reloaded the
// page. The one visible symptom was the "Signed in, but your saves could not
// sync right now" toast, which reads as a passing network problem rather than
// as the account not working.
//
// It is the same shape as the bug in the Instagram embed fixed an hour earlier:
// something was awaited in the wrong place, so a later step ran against a value
// that was not there yet.
//
// TWO: A FAILED SIGN IN WAS COMPLETELY SILENT. When a provider is disabled, a
// redirect URL is not on the allow list, or somebody presses Cancel on Google's
// own screen, Supabase sends them back with #error=...&error_description=... and
// no token. The old capture checked only for access_token, found none, returned
// null, and the person landed on the home page with no account and nothing on
// screen saying why. Read and surfaced now, because "nothing happened" is the
// least debuggable failure there is.
//
// THREE: IT THREW AWAY WHERE YOU WERE. redirect_to was origin + pathname, and
// this is a hash router, so signing in from #/guide/abc returned you to the
// landing page. The route is carried across in a QUERY parameter rather than the
// fragment, because the fragment is where Supabase puts the tokens and a URL has
// only one of those.

// Only a route of ours, never anything else that might be sitting in the bar.
// An open redirect is a real risk here even when the destination is same-origin:
// the value survives a round trip through a third party.
export const RETURN_PARAM = "gx_return";
export const isOwnRoute = (h) => /^#(\/[a-z0-9/-]*|studio)$/i.test(String(h || ""));

// Google goes through a full page redirect, so there is no promise to await:
// the browser leaves and comes back with tokens in the URL fragment, which
// captureRedirectSession picks up on the next load.
export const startGoogleSignIn = () => {
  const url = new URL(`${window.location.origin}${window.location.pathname}`);
  const back = window.location.hash;
  if (isOwnRoute(back)) url.searchParams.set(RETURN_PARAM, back);
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(url.toString())}`;
};

// Fills in the half of the session the fragment cannot carry. Separate and
// exported because it is also the repair path in getSession: anybody who signed
// in with Google BEFORE this fix has a stored session with an empty userId, and
// they should not have to work out that signing out and back in is what mends
// it.
const withUser = async (session) => {
  if (!session?.token || session.userId) return session;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.token}` },
    });
    if (!r.ok) return session;
    const u = await r.json();
    if (!u?.id) return session;
    const full = { ...session, email: u.email || session.email || "", userId: u.id };
    write(full);
    return full;
  } catch { return session; }
};

// Supabase returns OAuth tokens in the URL HASH (#access_token=...), never as a
// query string, so they are not sent to any server. Read once, store, then
// scrub the address bar so the token is not sitting in a shareable URL or in
// browser history.
//
// ASYNC NOW, and the caller must await it. See fault one above: returning before
// the user id has arrived is what broke every cloud call for the whole visit.
export const captureRedirectSession = async () => {
  if (typeof window === "undefined") return { session: null, error: null, recovery: false };
  const hash = window.location.hash || "";
  const isToken = hash.includes("access_token");
  const isError = hash.includes("error=") || hash.includes("error_description=");
  if (!isToken && !isError) return { session: null, error: null, recovery: false };

  const params = new URLSearchParams(hash.slice(1));
  // ── AND IT IS NOT ONLY GOOGLE THAT COMES BACK THIS WAY ───────────
  // Written as the Google return path and named after it, but nothing in here
  // is provider specific: it reads a fragment. Supabase sends somebody back
  // through exactly the same shape after they confirm a signup email and after
  // they follow a password reset link, tagging which is which in `type`. So the
  // missing user id fixed above was never a Google-only fault; it broke email
  // confirmation too, on the only sign-in path that exists today.
  const type = params.get("type") || "";

  // The address bar is cleaned in both cases, success and failure, so a token
  // never sits in history and an error never survives a refresh.
  const search = new URLSearchParams(window.location.search);
  const back = search.get(RETURN_PARAM) || "";
  search.delete(RETURN_PARAM);
  const q = search.toString();
  const restore = isOwnRoute(back) ? back : "";
  history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : "") + restore);

  if (isError) {
    const desc = params.get("error_description") || params.get("error") || "";
    // A reset link that has already been used or has expired is the commonest
    // error anybody will see here, and "otp_expired" is not a sentence.
    if (/expired|invalid/i.test(desc) && /recovery/i.test(type + desc)) {
      return { session: null, recovery: false, error: "That password reset link has expired or has already been used. Ask for a new one." };
    }
    // Supabase sends these URL-encoded with plus signs for spaces.
    const said = desc.replace(/\+/g, " ").trim();
    return {
      session: null,
      recovery: false,
      error: said
        ? `Google sign in did not complete: ${said}`
        : "Google sign in did not complete. Nothing was changed on your account.",
    };
  }

  const session = shape({
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    expires_in: params.get("expires_in"),
  });
  if (!session) return { session: null, recovery: false, error: "That sign in link came back without a usable session." };
  write(session);

  const full = await withUser(session);
  if (!full.userId) {
    // Signed in, and nothing that matters would work. Said out loud rather than
    // left to show up later as saves that quietly never sync.
    // ── recovery IS KNOWN FROM THE FRAGMENT, NOT FROM THE LOOKUP ──
    // This hardcoded false, and withUser swallows every failure, so one flaky
    // moment on mobile data turned a password reset into an ordinary sign in:
    // the new-password screen never opened, the one-use token had already been
    // spent, and the person was left "signed in" with a session every cloud call
    // refuses. They then need a second reset link, from a sender that allows two
    // an hour. `type` said what this was before the network was involved.
    return { session: full, recovery: type === "recovery", error: "Signed in, but your account could not be identified. Reload the page and try again." };
  }
  // RECOVERY IS NOT A SIGN IN, even though it arrives as one. The token is real
  // and the person is authenticated, but they got here by saying they had
  // forgotten their password, so handing them a signed-in home page and nothing
  // else leaves the thing they came to do undone. Flagged for the caller to open
  // the set-a-new-password screen.
  return { session: full, recovery: type === "recovery", error: null };
};

// ── AND THEN ACTUALLY SETTING ONE ───────────────────────────────────
//
// "Forgot password" has existed since the account work in August and has never
// been able to finish. It sent the email, Supabase sent the person back with a
// real session in the fragment, captureRedirectSession read it as an ordinary
// sign in, and they landed on the home page signed in with the same password
// they could not remember. Nothing in src/ mentioned recovery at all.
//
// That was survivable while Google was the easy path. It is not survivable now
// that email and password is the ONLY path: the one way back into a locked
// account was a button that promised something the app could not do.
//
// PUT /auth/v1/user is the whole of it. The recovery token authorises exactly
// this, which is why the flow hands one over.
export const updatePassword = async (session, password) => {
  if (!session?.token) throw new Error("That reset link is no longer valid. Ask for a new one.");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || `Could not set the new password (${res.status})`);
  return true;
};

// ── WHICH WAY THEY GET IN, WHICH DECIDES WHAT WE MAY OFFER ──────────
//
// Oliver, 23 Aug 2026, asked for a change-password control on the account page.
// The trap is that not everybody has a password. Somebody who signed up through
// Google has an identity and no password at all, and a "Change password" box
// offered to them is a control that cannot work: the same fault as the front
// page that said "Accounts are coming soon" while accounts existed, and as the
// old Google button that was the most prominent thing on the auth sheet while
// being a dead end.
//
// ── ASKED FRESH, NOT CACHED ON THE SESSION ──────────────────────────
//
// The obvious implementation is to record the provider in withUser and read it
// off the stored session. That is wrong for everybody who is ALREADY signed in:
// withUser returns early once a session has a userId, so it never runs again,
// and every existing session in localStorage would carry no provider forever.
// The page would then either hide a real control from password users or offer a
// dead one to Google users, permanently, and only for the people who had been
// here longest.
//
// So it is one request when the page opens. Supabase returns `identities`, and
// `app_metadata.providers` alongside it; identities is the authoritative list
// and the other is read as a fallback for an older shape.
//
// AN EMPTY LIST IS NOT AN ANSWER. A failed request returns null rather than [],
// because [] would read as "they have no password" and quietly hide the control
// from somebody who does have one. The page renders nothing while it does not
// know, which is the honest state: a control that might be dead is worse than a
// control that arrives a moment later.
export const accountProviders = async (session) => {
  if (!session?.token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.token}` },
    });
    if (!res.ok) return null;
    const u = await res.json();
    const fromIdentities = Array.isArray(u?.identities)
      ? u.identities.map(i => String(i?.provider || "").trim().toLowerCase()).filter(Boolean)
      : [];
    const fromMeta = Array.isArray(u?.app_metadata?.providers)
      ? u.app_metadata.providers.map(x => String(x || "").trim().toLowerCase()).filter(Boolean)
      : [];
    const all = [...new Set([...fromIdentities, ...fromMeta])];
    return all.length ? all : null;
  } catch { return null; }
};

// Supabase names the email and password identity "email". Read through a
// function rather than compared inline at the call site, so the one place that
// knows Supabase's word for it is this file and not a component.
export const hasPassword = (providers) => Array.isArray(providers) && providers.includes("email");

// ── SENDING THE CONFIRMATION AGAIN ──────────────────────────────────
//
// Needed the moment there is a screen that waits for an email, because the
// commonest thing that happens to a confirmation mail is nothing: it lands in
// spam, or the address had a typo, or it is simply slow.
//
// NOT a second signUpWithPassword call, which is what this is easy to reach for.
// That path creates or re-touches an account and returns a shape the caller then
// has to interpret; /auth/v1/resend does exactly one thing and says whether it
// worked.
//
// AND IT WILL BE REFUSED SOMETIMES, WHICH IS NOT A BUG. Supabase's built-in
// email service allows TWO messages an hour, and only a custom SMTP provider
// raises that. So "email rate limit exceeded" is the expected answer to an
// impatient third press, and the error has to reach the screen rather than being
// swallowed into a spinner that stops.
export const resendConfirmation = async (email) => {
  await post("resend", { type: "signup", email: String(email || "").trim() });
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
