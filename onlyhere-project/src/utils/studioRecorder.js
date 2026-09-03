// ── "SO YOU CAN SEE A FILE ABOUT HOW IT WORKED" ─────────────────────
//
// Oliver, 3 Sep 2026: "you can make a studio button, that records everything I
// do. So when I click it, it records every action I take, and when I click it
// again, it stops recording."
//
// He is asking for this because of the delete bug, and he is right to. He said
// "it still refreshes the page", which is a true and complete description of
// what he saw, and it was not enough for me to fix it: I read the handler,
// probed the removal function against real arrays, traced two effects and still
// could not tell whether the code had taken the branch I wrote or whether he
// was running a build that predated it. I ended up shipping a guess plus a
// better error message, which is not the same as knowing.
//
// ── WHAT MAKES THIS DIFFERENT FROM A CONSOLE LOG ────────────────────
//
// Three things, and the first is the one that matters:
//
//   1. IT SURVIVES THE RELOAD. The bug being chased IS a page reload, which
//      empties the console and destroys every in-memory buffer. So every event
//      is written to localStorage as it happens, and the recording FLAG is
//      stored too, so the recorder is still running on the other side. A
//      recorder that stops at the moment of interest records everything except
//      the thing you wanted.
//   2. The code can leave its own breadcrumbs. A click log says what was
//      pressed; it cannot say which branch the handler took. record() lets the
//      handler say so, and that is the difference between "it refreshed" and
//      "removeLiveRow returned false for a nightStreet".
//   3. It comes out as a file he can hand over.
//
// ── AND IT MUST NEVER RECORD A SECRET ───────────────────────────────
//
// This runs inside the founder tool, which holds a Supabase service key, a
// session and a login form, and the whole point of the file is that it gets
// SENT to somebody. So the rules below are not defensive style, they are the
// feature working correctly: no header values, no request or response bodies,
// no input values of any kind, and any query parameter that looks like a
// credential is replaced rather than trimmed, so the file says a value was
// removed instead of quietly looking like there was none.

const EVENTS_KEY = "gemlyx_studio_recording";
const FLAG_KEY = "gemlyx_studio_recording_on";

// Enough for a long session of clicking through Manage, small enough that
// writing the whole array on every event stays cheap and localStorage stays
// well inside its quota.
export const MAX_EVENTS = 500;

// A limit hit is not a limit reported — this codebase's own rule, six times
// over. When the cap bites, the OLDEST events go, because the question is
// always "what did I just do", and the file says how many were dropped rather
// than silently beginning in the middle.
export const DROP_MARKER = "recorder.dropped";

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
};

export const isRecording = () => read(FLAG_KEY, false) === true;
export const recordedEvents = () => {
  const list = read(EVENTS_KEY, []);
  return Array.isArray(list) ? list : [];
};

// ── WHAT COUNTS AS A CREDENTIAL ─────────────────────────────────────
// Matched on the NAME of the thing, not on its value, because a key is just a
// long string and so is a description. Deliberately wide: a false positive
// costs one redacted parameter in a debug file and a false negative costs a
// leaked key.
const SECRET_NAME = /key|token|secret|password|passwd|auth|bearer|apikey|signature|session|credential|cookie/i;
export const REDACTED = "[redacted]";

// Keeps the host and path, which is what identifies the call, and replaces the
// VALUE of any parameter whose name reads like a credential. `id=eq.412` is the
// most useful thing in a Supabase URL and is kept; `apikey=...` is not.
export const safeUrl = (url) => {
  const raw = String(url || "");
  if (!raw) return "";
  try {
    const u = new URL(raw, typeof location !== "undefined" ? location.href : "https://gemlyxtravel.com");
    for (const name of [...u.searchParams.keys()]) {
      if (SECRET_NAME.test(name)) u.searchParams.set(name, REDACTED);
    }
    // searchParams re-encodes on the way out, so the marker comes back as
    // %5Bredacted%5D. A person reads this file; put it back in words.
    return `${u.host}${u.pathname}${u.search}`.replace(/%5Bredacted%5D/gi, REDACTED);
  } catch {
    // Not a parseable URL. Returning it whole could carry a token in a fragment
    // nobody parsed, so it is reported as unreadable rather than passed through.
    return "[unparseable url]";
  }
};

// One event. `what` is a short label, `detail` is a plain object of small
// values. Anything that is not a string, number or boolean is dropped rather
// than serialised, because a nested object is where a payload — and a key —
// hides.
const SCALAR = (v) => ["string", "number", "boolean"].includes(typeof v) || v === null;
export const safeDetail = (detail) => {
  const out = {};
  if (!detail || typeof detail !== "object") return out;
  for (const [k, v] of Object.entries(detail)) {
    if (SECRET_NAME.test(k)) { out[k] = REDACTED; continue; }
    if (!SCALAR(v)) { out[k] = `[${Array.isArray(v) ? "array" : typeof v}, not recorded]`; continue; }
    out[k] = typeof v === "string" ? v.slice(0, 300) : v;
  }
  return out;
};

// Safe to call at any time: it is a no-op when nothing is recording, so a
// breadcrumb can sit permanently in a handler without costing anything.
export const record = (kind, what, detail) => {
  if (!isRecording()) return false;
  const list = recordedEvents();
  list.push({ at: Date.now(), kind: String(kind || "note"), what: String(what || "").slice(0, 200), ...(Object.keys(safeDetail(detail)).length ? { detail: safeDetail(detail) } : {}) });
  let dropped = 0;
  while (list.length > MAX_EVENTS) {
    // The marker is never the thing dropped, or the file loses the one line
    // saying it is incomplete and starts in the middle looking whole.
    list.splice(list[0]?.kind === DROP_MARKER ? 1 : 0, 1);
    dropped += 1;
  }
  if (dropped) {
    if (list[0]?.kind === DROP_MARKER) {
      list[0].detail = { ...list[0].detail, events: (list[0].detail?.events || 0) + dropped };
    } else {
      // The marker needs a slot of its own, and the cap is the cap. One more
      // event goes to pay for it, and it is counted, because a marker that
      // undercounts by one is a marker nobody can arithmetic against.
      list.shift();
      dropped += 1;
      list.unshift({ at: Date.now(), kind: DROP_MARKER, what: `the recorder is full at ${MAX_EVENTS} events, so the oldest were dropped`, detail: { events: dropped } });
    }
  }
  return write(EVENTS_KEY, list);
};

export const startRecording = () => {
  write(EVENTS_KEY, []);
  write(FLAG_KEY, true);
  // Written AFTER the flag, or record() would see a recorder that is not yet on
  // and drop the first line of its own file.
  record("recorder", "recording started", { url: safeUrl(typeof location !== "undefined" ? location.href : ""), agent: typeof navigator !== "undefined" ? String(navigator.userAgent).slice(0, 160) : "" });
  return true;
};

export const stopRecording = () => {
  record("recorder", "recording stopped");
  write(FLAG_KEY, false);
  return recordedEvents();
};

export const clearRecording = () => { write(EVENTS_KEY, []); write(FLAG_KEY, false); };

// ── THE FILE ────────────────────────────────────────────────────────
//
// Readable top to bottom by a person, and still parseable, because both of us
// read it: he skims it to see whether it caught the thing, and it is handed to
// me to work from. Times are relative to the first event, since "what happened
// 0.4s after the click" is the question and a wall-clock stamp is not.
export const recordingText = (events = recordedEvents()) => {
  const list = Array.isArray(events) ? events : [];
  if (!list.length) return "Nothing was recorded.";
  const t0 = list[0]?.at || Date.now();
  const lines = list.map(e => {
    const s = ((Number(e.at) - t0) / 1000).toFixed(2).padStart(7);
    const det = e.detail && Object.keys(e.detail).length
      ? "  " + Object.entries(e.detail).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ")
      : "";
    return `${s}s  ${String(e.kind).padEnd(16)} ${e.what}${det}`;
  });
  return [
    `Gemlyx Studio recording — ${list.length} event${list.length === 1 ? "" : "s"}`,
    `Started ${new Date(t0).toISOString()}`,
    "Times are seconds since the first event. No header values, request bodies or typed values are recorded.",
    "",
    ...lines,
  ].join("\n");
};

export const recordingFileName = (now = new Date()) =>
  `gemlyx-studio-recording-${now.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
