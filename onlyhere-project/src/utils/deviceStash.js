// ── WHAT SIGNING OUT LEAVES BEHIND, AND FOR WHOM ────────────────────
//
// Two rules of Oliver's collided on 14 Sep 2026 and this file is the place they
// stop colliding.
//
//   "The saved items should ONLY be for the account that saves it!!!!"
//   "when you delete / log out, the saved should be gone too"
//
// against the plain fact that if the last push to the account failed, the copy
// on the device is the ONLY copy, and clearing it destroys trips rather than
// moving them.
//
// The first version of the fix kept the copy whenever the sync had failed. That
// is the leak he named: cloudSyncOk is false for an offline moment, a refused
// write AND a fresh reload that has not pushed yet, so the safe-looking branch
// is the one that runs and the next person on a shared laptop gets handed
// somebody else's trips. The second version cleared unconditionally and told
// the person their unsynced saves were not in their account, which is honest
// and still loses them.
//
// ── THE THIRD ANSWER, WHICH IS THE ONE HE CHOSE ─────────────────────
//
// Both rules are about WHO, not about whether. So the unsynced copy is kept,
// under a key that names the account it belongs to, and handed back only when
// that same account signs in on this device again. The next person to use the
// browser sees nothing, because nothing they can reach is keyed to them.
//
// THE USER ID IS THE KEY AND NOTHING ELSE. Not the email, which somebody can
// type, and not a single shared key with an owner field, which is one `if` away
// from being read by the wrong person. A reader who does not know the id cannot
// name the key, so the isolation does not depend on any code here being right.
//
// ── ONE SHOT ────────────────────────────────────────────────────────
//
// take() reads and removes in the same call. A stash that survived being
// restored would come back after a later, deliberate clear, which is the bug
// this whole area started as.
//
// NOT A SYNC MECHANISM. This holds what one device could not send, until that
// device sees its owner again. It is not a second source of truth, and the
// merge on the way back in treats it exactly like the local list it came from.
const PREFIX = "gemlyx_held_";

// 40 days. Long enough to cover a laptop somebody comes back to after a trip,
// short enough that a browser does not accumulate the saves of every account
// that ever signed in on it. Checked on the way OUT rather than swept, because
// a sweep needs to enumerate keys and this needs to know one.
const KEEP_MS = 40 * 24 * 60 * 60 * 1000;

const keyFor = (userId) => {
  const id = String(userId || "").trim();
  return id ? `${PREFIX}${id}` : "";
};

const isList = (v) => Array.isArray(v) ? v : [];

// Returns true if anything was actually written, so the caller can tell the
// person the truth about what happened rather than guessing.
export const stashUnsynced = (userId, { places, guides, been } = {}) => {
  const key = keyFor(userId);
  if (!key) return false;
  const body = { places: isList(places), guides: isList(guides), been: isList(been), at: Date.now() };
  // Nothing to hold is not a failure, and writing an empty record would mean a
  // later sign in reports "restored" over nothing.
  if (!body.places.length && !body.guides.length && !body.been.length) {
    try { localStorage.removeItem(key); } catch { /* private mode */ }
    return false;
  }
  try {
    localStorage.setItem(key, JSON.stringify(body));
    return true;
  } catch {
    // Private mode, or the quota is full. The caller must not claim the saves
    // were kept, which is why this reports rather than swallowing.
    return false;
  }
};

// Reads AND removes. See the note above: a stash that survives being restored
// comes back after a later deliberate clear.
export const takeStash = (userId) => {
  const key = keyFor(userId);
  if (!key) return null;
  let raw = null;
  try { raw = localStorage.getItem(key); } catch { return null; }
  try { localStorage.removeItem(key); } catch { /* it will be overwritten */ }
  if (!raw) return null;
  let held = null;
  try { held = JSON.parse(raw); } catch { return null; }
  if (!held || typeof held !== "object") return null;
  // Old enough that handing it back would be a surprise rather than a rescue.
  if (Number(held.at) && Date.now() - Number(held.at) > KEEP_MS) return null;
  const out = { places: isList(held.places), guides: isList(held.guides), been: isList(held.been) };
  if (!out.places.length && !out.guides.length && !out.been.length) return null;
  return out;
};

// Deleting the account takes this with it. Without this line the stash is the
// one place a deleted account's trips survive, on the machine most likely to be
// shared, which is the opposite of what the delete button promises.
export const dropStash = (userId) => {
  const key = keyFor(userId);
  if (!key) return;
  try { localStorage.removeItem(key); } catch { /* private mode */ }
};
