// ── DRAFTS THAT SURVIVE CLOSING THE TAB ────────────────────────────
// Oliver, 19 Aug 2026: "I'd actually like if we could make it possible for my
// drafts not to disappear when I close the site. It's wasted money when my page
// just resets."
//
// He is describing a real cost, not an inconvenience. A queued draft is the
// output of the full generateArea pipeline: OpenAI planning, Tavily searches,
// Perplexity reads, Firecrawl scrapes, Google Places and Directions calls. Every
// one of those is billed. Until now the finished drafts lived in `queueResults`,
// which is React state and nothing else, so a closed tab, a crashed renderer, a
// stray refresh or a Vercel deploy landing mid-session burned the whole batch and
// the only way back was to pay for it again.
//
// ── WHAT THIS MODULE IS AND IS NOT ────────────────────────────────
// It is pure. It does no storage IO of its own: every function takes what it
// needs and hands back a value, so the whole thing is testable with no browser,
// no localStorage shim and no React. `readStore` and `writeStore` take the
// storage object as an argument for the same reason.
//
// ── THE RULE THAT SHAPES EVERY DECISION BELOW ─────────────────────
// A RESTORED DRAFT MUST NEVER LOOK BETTER THAN THE ONE THAT WAS SAVED.
//
// This is not a general principle borrowed from somewhere, it is the specific
// failure this codebase keeps finding: a value gets dropped somewhere in the
// middle of a chain and what comes out the far end is cleaner, more confident
// and less qualified than what went in. The map pin drawn solid when the
// coordinate was a town-centre guess. The queued draft that arrived in the
// editor with its identity warning wiped by the next background item. The leg
// chip that read "no direct route" when the truth was "nobody checked".
//
// Serialising a draft is exactly that kind of chain, so three things ride with
// the draft or the draft does not get stored at all:
//
//   frozenGeo          publishDraft FORCE-OVERRIDES the published coordinates
//                      and nearest station with this. Restore the draft without
//                      it and the row publishes against whatever the live
//                      lookup says today, which is a different place from the
//                      one the draft was written about and reviewed against.
//   identityWarning    "this may not be the place you meant"
//   inventedWarning    "the correction pass changed something"
//
// The last two are the reason a draft gets a second look. A draft that comes
// back from storage with them missing is a flagged draft wearing a clean face,
// which is worse than no restore at all, because he would have no reason to
// look. `packResult` refuses rather than partially storing, and the round trip
// is asserted in both directions in the suite.
//
// ── AND ONE THING THAT DELIBERATELY DOES NOT RIDE ALONG ───────────
// editingId. It is not stored, it is not restored, and `storedKeys` asserts it
// never appears in the serialised text.
//
// editingId is what turns publishDraft from an INSERT into a PATCH of one
// specific published row. Restoring it across a session means restoring a
// pointer to a row that may since have been edited from another tab, deleted in
// Manage Published, or renumbered. There is nothing in the store that could
// tell the difference, and the failure is silent and destructive: an overwrite
// of live content with a draft from last week.
//
// So a restored draft is always a FRESH draft, and `restoreNote` says so in
// words rather than leaving it to be discovered. If he was mid-edit of a
// published row, reopening that row from Manage Published is one click and
// loses nothing.
//
// ── WHY IT EXPIRES ───────────────────────────────────────────────
// A draft is a snapshot of opening hours, ticket prices, event dates and ferry
// times on the day it was researched. The whole product is the claim that
// nothing is printed that nobody checked. A month-old draft restored silently
// and published is that promise broken by the storage layer, quietly, with the
// run log still saying every field was measured.
//
// Fourteen days, and the expiry is LOUD: `readStore` returns a named problem, so
// the panel can say the drafts were dropped and why, rather than opening on an
// empty queue that looks like nothing was ever saved.

export const DRAFT_STORE_KEY = "gemlyx_studio_drafts";

// Bumped when the stored shape changes in a way an older reader would
// misinterpret. A mismatch is refused, not migrated and not guessed at: a
// wrongly-read draft publishes wrong content, and the cost of refusing is one
// re-research, which is the exact cost of the bug this module exists to fix.
export const STORE_VERSION = 1;

// See the expiry note above.
export const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

// The queue has never held more than a couple of dozen names in practice. The
// cap is here so a runaway Discover pick-list cannot fill the origin's storage
// and take the reader-facing saved places and guides down with it, since those
// share the same 5 MB and were there first.
export const MAX_RESULTS = 40;
export const MAX_QUEUE = 100;

// Roughly 2 MB of the ~5 MB an origin gets, leaving room for gemlyx_saved_places,
// gemlyx_saved_guides and the session. Measured on the serialised string rather
// than assumed from the object, because a draft's blogBody is the big field and
// its size varies by an order of magnitude between an essential and a town.
export const MAX_BYTES = 2_000_000;

// ── PROBLEMS ARE NAMED ────────────────────────────────────────────
// Every refusal below returns one of these rather than a bare null. A silent
// null is indistinguishable from "there was nothing saved", and those two need
// different words on screen: one is normal, the other means work was lost and
// he should know why before he assumes the feature is broken.
export const STORE_PROBLEMS = {
  EMPTY: "empty",
  UNREADABLE: "unreadable",
  WRONG_VERSION: "wrong-version",
  EXPIRED: "expired",
  QUOTA: "quota",
};

const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);

// A finished draft, reduced to exactly what loadQueueResult reads and nothing
// else. Keeping this in step with that function is what stops a restore from
// being a second, worse door into the editor: the codebase already paid for
// that lesson with clearPreviousEntry, where five call sites each cleared their
// own hand-picked subset and every one of them was missing something different.
export const packResult = (r) => {
  if (!isObj(r)) return null;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;
  if (typeof r.type !== "string" || !r.type) return null;
  // NO DRAFT, NOTHING TO RESTORE. A failed queue item is a record of a name that
  // did not work, and re-listing it after a reload as if it were pending would
  // invite a second paid attempt at something that already failed.
  if (!isObj(r.draft)) return null;
  return {
    name,
    type: r.type,
    draft: r.draft,
    code: typeof r.code === "string" ? r.code : null,
    // The three that must ride along. Written unconditionally, including when
    // null, so the shape is the same either way and a missing key can only ever
    // mean the writer was older than this version, never "there was no warning".
    frozenGeo: isObj(r.frozenGeo) ? r.frozenGeo : null,
    identityWarning: r.identityWarning ?? null,
    inventedWarning: r.inventedWarning ?? null,
    opened: !!r.opened,
  };
};

// The open editor, packed in the SAME shape as a queue result, so the restore
// path can hand it straight to loadQueueResult. One shape, one door.
//
// It takes the editor's TEXT, not its parsed object: the text is what he has
// been typing into and what publishDraft parses, and a half-finished edit that
// does not parse yet is exactly the state most worth not losing. It is stored
// as `text` alongside the last-good `draft` so neither is invented from the
// other.
export const packEditor = (e) => {
  if (!isObj(e)) return null;
  const base = packResult({ ...e, opened: true });
  if (!base) return null;
  return {
    ...base,
    text: typeof e.text === "string" ? e.text : null,
    photoName: typeof e.photoName === "string" ? e.photoName : null,
  };
};

// A queued NAME, not a draft: nothing has been researched or paid for yet, so
// this is cheap to store and cheap to lose. It is here because retyping
// eighteen names is the annoyance that made him queue them in the first place.
export const packQueueItem = (q) => {
  if (!isObj(q)) return null;
  const name = typeof q.name === "string" ? q.name.trim() : "";
  if (!name || typeof q.type !== "string" || !q.type) return null;
  return { name, type: q.type };
};

// DROPS THE OLDEST, AND SAYS HOW MANY. Not the newest: the queue appends, so the
// tail is the most recently finished and the most likely to still be wanted.
// The count comes back so the caller can put it on screen. A cap that trims in
// silence reads as "everything was saved" when it was not, which is the same
// failure shape as the review panel slicing to MAX_PER_SECTION without saying so.
export const capResults = (results, max = MAX_RESULTS) => {
  const list = (Array.isArray(results) ? results : []).map(packResult).filter(Boolean);
  if (list.length <= max) return { results: list, dropped: 0 };
  return { results: list.slice(list.length - max), dropped: list.length - max };
};

export const packStore = (state, now) => {
  const { results, dropped } = capResults(state?.results);
  const queue = (Array.isArray(state?.queue) ? state.queue : [])
    .map(packQueueItem).filter(Boolean).slice(0, MAX_QUEUE);
  const editor = packEditor(state?.editor);
  return {
    store: { v: STORE_VERSION, at: Number(now) || 0, queue, results, editor },
    dropped,
  };
};

// True when there is nothing worth writing. Used so an idle Studio does not
// rewrite an identical blob on every render, and so clearing the queue actually
// clears the key rather than leaving an empty husk that reads as a saved session.
export const isEmptyStore = (s) =>
  !s || ((!s.queue || !s.queue.length) && (!s.results || !s.results.length) && !s.editor);

// ── READING ───────────────────────────────────────────────────────
// Returns { store, problem, age }. Exactly one of store and problem is set.
export const readStore = (raw, now) => {
  if (typeof raw !== "string" || !raw.trim()) return { store: null, problem: STORE_PROBLEMS.EMPTY };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { store: null, problem: STORE_PROBLEMS.UNREADABLE }; }
  if (!isObj(parsed)) return { store: null, problem: STORE_PROBLEMS.UNREADABLE };
  if (parsed.v !== STORE_VERSION) return { store: null, problem: STORE_PROBLEMS.WRONG_VERSION };
  const at = Number(parsed.at);
  if (!Number.isFinite(at) || at <= 0) return { store: null, problem: STORE_PROBLEMS.UNREADABLE };
  const age = Number(now) - at;
  // A stamp in the FUTURE is not fresh, it is a clock that moved. Treating a
  // negative age as "well within the TTL" is how a draft outlives its expiry
  // forever, which is the same hole found in the tile-refusal memo on 19 Aug:
  // there, `Number.isFinite(age)` sat beside `age >= 0` and was dead because NaN
  // fails the comparison anyway, and chasing why it was dead found the real bug.
  if (age < 0 || age > DRAFT_TTL_MS) return { store: null, problem: STORE_PROBLEMS.EXPIRED, age };
  const { results } = capResults(parsed.results);
  const queue = (Array.isArray(parsed.queue) ? parsed.queue : []).map(packQueueItem).filter(Boolean);
  const editor = packEditor(parsed.editor);
  const store = { v: STORE_VERSION, at, queue, results, editor };
  if (isEmptyStore(store)) return { store: null, problem: STORE_PROBLEMS.EMPTY, age };
  return { store, problem: null, age };
};

// Every key this module will ever write. The suite reads this list and asserts
// the serialised text contains nothing outside it, which is how "editingId is
// never stored" stays true after somebody spreads a bigger object in here by
// accident. Asserting on the OUTPUT rather than on the pack function is
// deliberate: a spread three levels down would pass a test of packResult's
// declared fields and still land in the string.
export const storedKeys = () => [
  "v", "at", "queue", "results", "editor",
  "name", "type", "draft", "code", "frozenGeo",
  "identityWarning", "inventedWarning", "opened", "text", "photoName",
];

export const FORBIDDEN_KEYS = ["editingId", "access_token", "refresh_token", "password"];

// ── WRITING ───────────────────────────────────────────────────────
// Takes the storage object so this stays pure and testable. Returns a named
// outcome rather than a boolean: "it did not save" and "it did not save because
// the browser is full" need different words, and the second one is the only
// warning he will get before the next crash costs him a batch.
//
// THE OVER-BUDGET PATH SHEDS RESULTS RATHER THAN GIVING UP. A single enormous
// blogBody should not mean nothing at all is saved; the newest drafts are the
// ones he is working on. It halves until it fits, and reports how many it let go.
export const writeStore = (storage, store, { maxBytes = MAX_BYTES } = {}) => {
  if (!storage) return { ok: false, problem: STORE_PROBLEMS.QUOTA, dropped: 0 };
  if (isEmptyStore(store)) {
    try { storage.removeItem(DRAFT_STORE_KEY); return { ok: true, cleared: true, dropped: 0 }; }
    catch { return { ok: false, problem: STORE_PROBLEMS.QUOTA, dropped: 0 }; }
  }
  let results = store.results || [];
  let dropped = 0;
  for (;;) {
    const body = JSON.stringify({ ...store, results });
    if (body.length <= maxBytes) {
      try { storage.setItem(DRAFT_STORE_KEY, body); return { ok: true, dropped, bytes: body.length }; }
      catch {
        // QuotaExceededError, or Safari private mode refusing every write. Shed
        // and retry: the same ladder as the size check, because the browser's
        // real limit is not knowable from here and MAX_BYTES is only an estimate.
        if (!results.length) return { ok: false, problem: STORE_PROBLEMS.QUOTA, dropped };
        const keep = Math.floor(results.length / 2);
        dropped += results.length - keep;
        results = results.slice(results.length - keep);
        continue;
      }
    }
    if (!results.length) {
      // The editor alone is over budget. Store it without the draft body rather
      // than storing nothing: the name, type and warnings still tell him what he
      // had, and re-researching one entry beats re-researching the batch.
      try { storage.setItem(DRAFT_STORE_KEY, JSON.stringify({ ...store, results: [], editor: null })); }
      catch { return { ok: false, problem: STORE_PROBLEMS.QUOTA, dropped }; }
      return { ok: true, dropped, editorDropped: true };
    }
    const keep = Math.floor(results.length / 2);
    dropped += results.length - keep;
    results = results.slice(results.length - keep);
  }
};

// ── WHAT THE PANEL SAYS ───────────────────────────────────────────
// A restore is announced, never silent. Two reasons, and the second is the one
// that matters: a draft restored without a word is a draft he can publish
// believing it was researched minutes ago, when its prices and hours are from
// whenever the tab was last open. The age is in the sentence for that reason.
export const ageWords = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) return "an unknown time ago";
  const mins = Math.round(ms / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const restoreNote = (store, age) => {
  if (!store) return null;
  const parts = [];
  if (store.results?.length) parts.push(plural(store.results.length, "finished draft"));
  if (store.editor) parts.push("the draft you had open");
  if (store.queue?.length) parts.push(`${plural(store.queue.length, "name")} still queued`);
  if (!parts.length) return null;
  const list = parts.length === 1 ? parts[0]
    : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  const tail = store.editor
    // Said out loud because it changes what the Publish button does. See the
    // editingId note at the top.
    ? " It comes back as a fresh draft, not as an edit of a published row, so check the prices and hours before publishing."
    : " Check the prices and hours before publishing.";
  return `Restored ${list} from ${ageWords(age)}.${tail}`;
};

export const problemNote = (problem) => {
  switch (problem) {
    case STORE_PROBLEMS.EXPIRED:
      return "Saved drafts were more than two weeks old, so they were dropped rather than restored: their prices, hours and dates are no longer what anybody checked.";
    case STORE_PROBLEMS.UNREADABLE:
      return "There were saved drafts but the stored text could not be read, so nothing was restored.";
    case STORE_PROBLEMS.WRONG_VERSION:
      return "Saved drafts were written by an older version of Studio and were not restored.";
    case STORE_PROBLEMS.QUOTA:
      return "Drafts could not be saved: this browser's storage is full. Publish or clear some finished drafts, or the next reload will lose them.";
    default:
      return null;
  }
};

// Seeds the runner's never-pay-twice set from what came back. Without this a
// restored draft is not in doneRef, so pressing Start re-researches something
// already sitting finished on the screen, which is the exact spend this module
// exists to prevent and the exact complaint he has already made twice about Open.
export const doneKeysFrom = (results) =>
  (Array.isArray(results) ? results : [])
    .filter(r => r && r.name && r.type)
    .map(r => `${r.type}::${String(r.name).toLowerCase()}`);
