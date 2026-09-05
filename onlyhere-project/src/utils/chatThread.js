// ── "WHEN I CLICK 'GENERATE PIPELINE' TWICE IN A ROW, THE PAGE CRASHES" ──
//
// Oliver, 18 Aug 2026. Reproduced exactly, as a sequence of the real state
// updates, before a line was changed:
//
//   start                 ["assistant"]
//   after click 1         ["assistant","user"]
//   after clicking the X  []
//   after click 2         [undefined,"user"]
//   render                TypeError: Cannot read properties of undefined
//
// THREE defects stacked, and each one alone is survivable:
//
//   1. The ✕ button is a DOM CHILD of the backdrop, and both carry
//      onClick={closePreview}. It does not stopPropagation, so one click on ✕
//      runs closePreview TWICE. Both calls read the same stale
//      pendingRandomGuideMode from their closure, so both pass the guard.
//
//   2. closePreview removed the fabricated brief BY POSITION, `slice(0, -1)`.
//      Run twice, that eats the opening greeting as well. Run after a real
//      message arrived, it would eat that instead — a position is not an
//      identity.
//
//   3. generateRandomGuide rebuilt the thread as `[prev[0], brief]`, which on
//      an empty array is `[undefined, brief]`. A hole in the messages array is
//      not a bad render, it is a crash: every consumer in the app reads
//      `m.role`, and the chat panel, the preview, sendAI's brief reader and the
//      chat report all do it without optional chaining.
//
// Defect 3 is the one that turns the other two into a white screen, and it is
// the one worth stating as a rule: THE THREAD ALWAYS OPENS WITH THE GREETING AND
// NEVER CONTAINS A HOLE. That is what this file is for. The transitions live
// here as pure functions rather than inline in a setState, because the sequence
// above is the test, and a sequence of state updates inside a component is not
// something the suite can drive.

// The opening greeting, in one place. It was written inline in a useState
// initialiser and read back through `prev[0]`, which is what made "the first
// element" load-bearing without anything guaranteeing it was still there.
export const GREETING = {
  role: "assistant",
  text: "Hi! I'm your Local Assist ◆ Tell me where you're heading — or what you're after — and I'll find you something that exists nowhere else.",
};

export const openingThread = () => [GREETING];

// The marker that makes removal an identity rather than a position. It is a
// field on the message, so it survives the array being reordered, appended to,
// or filtered, and it cannot be confused with a message the traveller typed.
export const TEST_BRIEF = "__testBrief";

// What every consumer in the app assumes a message is, in one predicate, so the
// transitions below and the invariant at the bottom cannot disagree about it.
const isMessage = (m) => !!m && typeof m === "object" && typeof m.role === "string" && m.role.length > 0;

// The Studio pipeline test replaces the thread rather than appending to it: the
// brief is a whole fabricated trip, and two of them in one conversation is two
// contradictory trips handed to the planner at once. That rule predates this fix
// and is right; what it lacked was a guarantee about the greeting.
export const withTestBrief = (messages, brief) => {
  const first = (Array.isArray(messages) ? messages : []).find(m => isMessage(m) && m.role === "assistant" && !m[TEST_BRIEF]);
  return [first || GREETING, { role: "user", text: String(brief ?? ""), [TEST_BRIEF]: true }];
};

// Remove it by identity, and be idempotent: calling this twice, which is exactly
// what one click on ✕ does today, must leave the thread where the first call put
// it. Nothing else in the thread is touched, so a real message that arrived in
// between is safe — which the position-based version could not promise.
export const withoutTestBrief = (messages) => {
  // A USABLE MESSAGE, not merely a truthy one. The first version filtered on
  // `m && !m[TEST_BRIEF]`, which keeps `{}` — an object with no role — and that is
  // the same crash as a hole wearing a different shape, because every consumer
  // reads `m.role`. Found by the invariant assertion below rather than by thinking
  // of the case, which is the argument for asserting the invariant over a set of
  // junk inputs instead of over the two cases this file happened to imagine.
  const list = (Array.isArray(messages) ? messages : []).filter(isMessage).filter(m => !m[TEST_BRIEF]);
  return list.length ? list : openingThread();
};

// The invariant itself, exported so the suite can assert it over every
// transition rather than over the two it happens to think of. A thread with a
// hole in it is a crash waiting for the next render, not a cosmetic problem.
export const threadIsSound = (messages) =>
  Array.isArray(messages) && messages.length > 0 && messages.every(isMessage);

// ── AND IT SURVIVED NOTHING AT ALL ──────────────────────────────────
//
// Oliver, 5 Sep 2026: "I can't share shit because everytime I click back.. the
// whole fking shit resets. My chat resets. My review resets. and my record
// resets."
//
// He is right and the cause is one line: the thread was `useState(openingThread)`
// and NOTHING in this codebase ever wrote it anywhere. The run log has had a
// localStorage store since it was written (runLog.js, STORE_KEY), drafts have
// studioDraftStore.js, saved trips have savedTrip.js. The conversation, which is
// the most expensive thing on the screen and the only one he cannot recreate by
// pressing a button, had nothing. Any remount and it is the greeting again.
//
// The review resets WITH it rather than separately: the preview screen is built
// from this thread, so it has never had anything of its own to lose.
//
// ── sessionStorage, AND THAT IS A DECISION ──────────────────────────
//
// Not localStorage, which is what the run log uses. The two are answering
// different questions. A run log is a record and is supposed to outlive the tab.
// A conversation is work in progress, and resurrecting last Tuesday's trip
// planning when somebody opens the site fresh is a different product, not a
// bug fix. sessionStorage is exactly the narrow thing he asked for: it survives
// back, forward, a reload and a remount inside the tab he is working in, and it
// is gone when he closes it.
//
// Widening it to localStorage is one word here, and it is his call rather than
// one to make while he is out.
export const CHAT_KEY = "gemlyx_chat_thread";

// Pure, so the suite can drive it. `streaming` is dropped on the way out: a
// message that was mid-stream when the tab reloaded would otherwise come back
// with a cursor blinking on it forever, waiting for a request that died with the
// last page. The text it had reached is kept, because it is what he read.
export const MAX_SAVED_MESSAGES = 60;
export const savableThread = (messages) => {
  const list = (Array.isArray(messages) ? messages : []).filter(isMessage)
    .map(({ streaming, ...keep }) => keep);
  // The GREETING is index 0 by the rule at the top of this file, so a thread
  // trimmed from the front would lose it. Trimmed from the middle instead: the
  // opening stays, and the newest of everything else does.
  if (list.length <= MAX_SAVED_MESSAGES) return list;
  return [list[0], ...list.slice(-(MAX_SAVED_MESSAGES - 1))];
};

// Pure. Returns a SOUND thread or null, never a half-restored one: threadIsSound
// is the invariant this whole file exists to keep, and a stored thread is
// untrusted input like any other. A hole in it is a white screen on the next
// render, which is worse than starting fresh.
export const restorableThread = (raw) => {
  let parsed = null;
  try { parsed = JSON.parse(String(raw ?? "")); } catch { return null; }
  if (!threadIsSound(parsed)) return null;
  // A thread that is only the greeting is not work, and restoring it over a
  // fresh greeting changes nothing. Treated as nothing to restore so a new tab
  // is not handed a "resumed" conversation it never had.
  if (parsed.length < 2) return null;
  return parsed;
};

export const saveThread = (messages) => {
  const list = savableThread(messages);
  try {
    if (list.length < 2) { sessionStorage.removeItem(CHAT_KEY); return false; }
    sessionStorage.setItem(CHAT_KEY, JSON.stringify(list));
    return true;
  } catch { return false; }
};

export const loadThread = () => {
  try { return restorableThread(sessionStorage.getItem(CHAT_KEY)); }
  catch { return null; }
};
