// ── "A GOLDEN PERSON INSIDE A WHITE CIRCLE" ─────────────────────────
//
// Oliver, 5 Sep 2026: "Can you make the burger menu be an account icon? Like a
// golden person inside a white circle (like the Gemlyx symbol) if no profile
// picture. But if you got a profile picture, then a circle like Facebook."
//
// Two states and one rule between them, which is the whole of this file: the
// glyph is what you get whenever there is no usable picture, and "usable" has
// to mean loaded and drawn rather than merely present as a string.
//
// ── WHY A PICTURE NEEDED A FILE AT ALL ──────────────────────────────
//
// There is no profile-picture field in Gemlyx, and the one picture the app can
// already have was being thrown away three lines after it arrived. utils/auth.js
// `shape()` keeps four things off a Supabase sign-in — token, refresh, expiry,
// email, id — and drops the whole `user` object, which is where Google puts the
// account photo. So a Google sign-in has always carried an avatar and the app
// has never once been able to see it.
//
// ── AND WHY THE URL IS CHECKED RATHER THAN TRUSTED ──────────────────
//
// This value comes back from an identity provider and is written straight into
// an <img src>. That is the one place in this app where a string from outside
// becomes a request the browser makes on the reader's behalf, so it is held to
// the same bar every other outside URL in this codebase is: https, a real host,
// and nothing else. `javascript:` and `data:` are refused by construction
// rather than by a blocklist, because a blocklist is a list somebody has to
// keep complete.
const HTTPS_ONLY = (raw) => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    return u.protocol === "https:" && u.hostname ? u.href : "";
  } catch { return ""; }
};

// In order, and the order is the point: something the person chose beats
// something an identity provider handed us. The first entry is for a profile
// photo Gemlyx does not have yet, and it is here so that adding one is a field
// name rather than a rewrite of every place an avatar is drawn.
export const avatarUrl = (session = null, profile = null) => (
  HTTPS_ONLY(profile?.photo)
  || HTTPS_ONLY(session?.avatar)
  || ""
);

// Read off a Supabase user object at sign-in. Google uses `picture` on the
// OAuth claim and Supabase copies it to `avatar_url`; both are checked because
// which one is present depends on the provider rather than on us.
export const avatarFromUser = (user) => (
  HTTPS_ONLY(user?.user_metadata?.avatar_url)
  || HTTPS_ONLY(user?.user_metadata?.picture)
  || ""
);
