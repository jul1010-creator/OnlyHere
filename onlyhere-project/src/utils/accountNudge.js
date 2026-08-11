// ── WHEN GEMLYX IS ALLOWED TO MENTION AN ACCOUNT ─────────────────────
//
// Oliver, 11 Aug 2026: "You should also be able to sign up casually. I don't
// wanna be one of those annoying apps that are like 'wanna save it? Sign up
// now!'"
//
// That app was Gemlyx. saveCurrentGuide read:
//
//     if (!userSession) {
//       localStorage.setItem(PENDING_SAVE_KEY, ...)
//       setAuthReason("guide"); setAuthOpen(true);
//       return;                        // <- the save never happened
//     }
//
// A modal, over the thing they made, at the exact moment they reached for it,
// and the save withheld until they complied. The heart on a place has never
// worked that way: it writes to local storage and says nothing. Two ways to
// save, one of them polite.
//
// AND THE POLITE ONE WAS ALREADY THE DOCUMENTED RULE. userSaves.js says it in
// its own header: "LOCAL STORAGE IS NOT REPLACED, it stays as the offline cache
// and THE STORE FOR SIGNED-OUT USERS. The account is a sync layer on top." The
// guide path was the single place that broke the rule its own module declares.
//
// ── THE GATE WAS ALSO WHERE THE DATA LOSS CAME FROM ──────────────────
// Because the guide could not be saved normally it went into a PENDING slot,
// claimed later by an effect keyed on the session. Two effects then raced over
// the same list, and the comment above the merge describes the result: "the
// claim added the guide, this landed 300ms later with the list as it was BEFORE
// the claim, and the guide vanished... the trip was destroyed on every device
// the account touches." Both fixes were correct and neither was the cause. The
// cause was a save that could not just be a save. Remove the gate and the
// pending slot, the second write path, and the race all go with it.
//
// ── SO WHAT IS LEFT FOR AN ACCOUNT TO DO ─────────────────────────────
// Exactly what it always did, minus the hostage-taking: carry saves to another
// device. That is a real benefit and it is worth mentioning ONCE. This file is
// the rules for when mentioning it is fair.

export const NUDGE_KEY = "gemlyx_account_nudge";

// ── RULE 1: NEVER BEFORE THERE IS SOMETHING TO LOSE ─────────────────
// One saved thing is not a reason to open an account, and treating it as one is
// what makes a prompt feel like a toll gate rather than an offer. Three is the
// point where a person has actually started building something.
export const MIN_SAVES = 3;

// ── RULE 2: DISMISS MEANS DISMISS ───────────────────────────────────
// A month, not a session. The existing profile ask used a useRef, which resets
// on every cold load, so a signed-in person with a blank profile met the same
// "optional" sheet every single time they opened the site. The comment above it
// says "an optional step that reappears on every refresh is not optional, it is
// nagging", and then a ref made it reappear on every refresh.
export const COOLDOWN_DAYS = 30;

// ── RULE 3: TWO NOS AND IT STOPS ────────────────────────────────────
// Not a cooldown, an ending. Somebody who has said no twice has told us.
export const MAX_ASKS = 2;

const DAY_MS = 86400000;

export const EMPTY_NUDGE = { asks: 0, lastAt: null };

export const readNudge = (raw) => {
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!v || typeof v !== "object") return { ...EMPTY_NUDGE };
    return {
      asks: Number.isFinite(Number(v.asks)) ? Math.max(0, Math.floor(Number(v.asks))) : 0,
      lastAt: typeof v.lastAt === "string" && v.lastAt ? v.lastAt : null,
    };
  } catch { return { ...EMPTY_NUDGE }; }
};

const daysSince = (iso, now) => {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;   // unreadable is the same as never
  return (now - t) / DAY_MS;
};

// ── THE ANSWER, WITH ITS REASON ─────────────────────────────────────
// `why` is filled in on a NO as well as a yes, for the same reason runLog treats
// "skipped" as a first-class outcome: "it did not show" and "it showed and was
// ignored" are different facts, and a bare false flattens them.
export const shouldOfferAccount = ({ saveCount = 0, signedIn = false, state, now = Date.now() } = {}) => {
  const s = readNudge(state);
  if (signedIn) return { show: false, why: "Already signed in, so there is nothing to offer." };
  if (saveCount < MIN_SAVES) return { show: false, why: `Only ${saveCount} saved. Nothing worth an account yet.` };
  if (s.asks >= MAX_ASKS) return { show: false, why: `Dismissed ${s.asks} times. That is an answer, so it is not asked again.` };
  const since = daysSince(s.lastAt, now);
  if (since < COOLDOWN_DAYS) return { show: false, why: `Dismissed ${Math.floor(since)} days ago, and the cooldown is ${COOLDOWN_DAYS}.` };
  return { show: true, why: `${saveCount} saved on this device and no account to carry them.` };
};

export const noteDismiss = (state, now = Date.now()) => {
  const s = readNudge(state);
  return { asks: s.asks + 1, lastAt: new Date(now).toISOString() };
};

// ── WHAT IT SAYS ────────────────────────────────────────────────────
// A statement of fact with an offer attached, not a demand with a benefit
// attached. The difference is whether the sentence still makes sense to
// somebody who then does nothing: "these are on this device" does, "sign up to
// save!" does not, because they already saved it.
export const nudgeCopy = (saveCount = 0) => ({
  headline: `Your ${saveCount} saved ${saveCount === 1 ? "thing lives" : "things live"} on this device`,
  detail: "Clear your browser or pick up your phone instead, and they are not there. An account carries them across. Nothing else changes.",
  accept: "Add an account",
  decline: "Not now",
});

// ── THE SAME RULE, FOR THE QUESTIONS AFTER THE ACCOUNT ──────────────
// A separate counter from the one above, because they are separate asks and
// answering one should not silence the other. Same shape, same cooldown, same
// hard stop, so the profile sheet cannot become the second nag that replaces
// the first.
export const PROFILE_NUDGE_KEY = "gemlyx_profile_nudge";

export const shouldAskProfile = ({ signedIn = false, hasProfile = false, state, now = Date.now() } = {}) => {
  const s = readNudge(state);
  if (!signedIn) return { show: false, why: "No account, so there is nothing to attach answers to." };
  if (hasProfile) return { show: false, why: "They have already filled it in." };
  if (s.asks >= MAX_ASKS) return { show: false, why: `Skipped ${s.asks} times. Asking a third time is nagging.` };
  const since = daysSince(s.lastAt, now);
  if (since < COOLDOWN_DAYS) return { show: false, why: `Skipped ${Math.floor(since)} days ago, and the cooldown is ${COOLDOWN_DAYS}.` };
  return { show: true, why: "Signed in, no profile yet, and not skipped recently." };
};
