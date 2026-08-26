// ── Saved places and guides, synced to an account ──────────────────
// Until now these lived only in the browser's local storage, on one device.
// Clear your browser data and a trip you planned was gone; open the site on a
// laptop and your phone's saves were not there.
//
// SHAPE: ONE ROW PER USER holding both arrays as jsonb, not one row per saved
// item. The plan doc proposed per-item rows and this is a deliberate departure.
// The app never queries an individual save; it always reads and writes the whole
// list, both are already capped (40 places, 20 guides), and per-item rows would
// mean insert/delete reconciliation, orphan rows and partial-sync states for no
// benefit any screen can use. One row makes a save atomic.
//
// LOCAL STORAGE IS NOT REPLACED, it stays as the offline cache and the store for
// signed-out users. The account is a sync layer on top, so nothing breaks when
// someone is offline, signed out, or in private mode.
import { SUPABASE_URL, SUPABASE_KEY } from "../config";

const headers = (session) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${session.token}`,
  "Content-Type": "application/json",
});

// ── "SAVES DON'T SYNC. I HAVEN'T SAVED RIGHT NOW BUT" ───────────────
//
// Oliver, 26 Aug 2026, with a screenshot of "Signed in, but your saves could
// not sync right now" printed over the entrance art — on a sign-in where he had
// saved nothing at all.
//
// This function returned a bare `null` for FOUR different things, and the call
// site had one sentence for all four:
//
//   no session          a token or a user id missing
//   not an array        the table is not there, or Supabase returned an ERROR
//                       object — a denied row policy, a bad key, an expired JWT
//   a thrown fetch      the network is down
//   and, correctly, an empty table is NOT null — a new account is { isNew }
//
// A missing table is a migration nobody has run. A denied policy is a
// configuration fault. Neither is "your saves could not sync", and both are
// FOUNDER problems being reported to a traveller as though their data were at
// risk. The network case is the only one that sentence describes.
//
// It is the same shape as five other things found this week and written up in
// HANDOFF_25AUG_NIGHT: A LIMIT HIT IS NOT A LIMIT REPORTED. Four causes, one
// message, and the message names none of them.
//
// So the answer comes back with a REASON. Nothing about the merge below
// changes: `ok: false` is still "keep working from local storage", which was
// always the right behaviour and is the half this had right.
export const SYNC = {
  OK: "ok",
  NO_SESSION: "no-session",   // signed in without a usable token or user id
  NO_TABLE: "no-table",       // gemlyx_user_data is not there, or the read was refused
  OFFLINE: "offline",         // the request never completed
};

export const fetchCloudSaves = async (session) => {
  if (!session?.token || !session?.userId) return { ok: false, why: SYNC.NO_SESSION };
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gemlyx_user_data?user_id=eq.${session.userId}&select=saved_places,saved_guides`,
      { headers: headers(session) }
    );
    const rows = await res.json();
    // PostgREST answers an error with an OBJECT carrying `message` and `code`,
    // and a missing table with 42P01. Both arrive here as "not an array", which
    // is why they used to be indistinguishable — the detail is kept so a founder
    // reading the console can tell a migration from a policy.
    if (!Array.isArray(rows)) {
      return { ok: false, why: SYNC.NO_TABLE, detail: String(rows?.message || rows?.code || res.status || "") };
    }
    if (rows.length === 0) return { ok: true, places: [], guides: [], isNew: true };
    return {
      ok: true,
      places: Array.isArray(rows[0].saved_places) ? rows[0].saved_places : [],
      guides: Array.isArray(rows[0].saved_guides) ? rows[0].saved_guides : [],
      isNew: false,
    };
  } catch (e) { return { ok: false, why: SYNC.OFFLINE, detail: String(e?.message || e).slice(0, 120) }; }
};

// ── AND WHETHER TO SAY ANYTHING AT ALL ──────────────────────────────
//
// The half that answers Oliver's sentence directly. A warning is worth showing
// when something a person made might not be safe. On a sign-in with nothing
// saved locally, nothing is at risk, nothing was lost, and a banner about a
// failure with no consequence is the thing that teaches somebody to ignore
// banners — which this repository has now watched happen twice in one week.
//
// Returns "" for silence, so a call site can print it unconditionally.
export const syncFailureNote = (result, { localPlaces = 0, localGuides = 0 } = {}) => {
  if (!result || result.ok) return "";
  const held = Number(localPlaces) + Number(localGuides);
  if (!held) return "";     // nothing of theirs is at stake
  if (result.why === SYNC.OFFLINE) {
    return "Signed in. Your saves are on this device and will sync when the connection is back.";
  }
  // A missing table or a refused read is not going to fix itself by waiting, so
  // it must not promise that it will. It says what is true — the saves are safe
  // where they are — and does not invite them to keep retrying.
  return "Signed in. Your saves are kept on this device; syncing to your account is not available right now.";
};

export const pushCloudSaves = async (session, places, guides) => {
  if (!session?.token || !session?.userId) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_user_data?on_conflict=user_id`, {
      method: "POST",
      headers: { ...headers(session), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: session.userId,
        saved_places: places,
        saved_guides: guides,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch { return false; }
};

// ── ONE SHAPE FOR A SAVED GUIDE, WRITTEN ONCE AND READ ONCE ─────────
//
// The saved-guide list held four fields, and opening a row rebuilt a guide from
// two of them. So a person planned a trip, saved it, came back the next morning
// and got the days back with everything measured in them gone: the weather, the
// geocodes, the exact durations, the arrival date, how many travellers, whether
// they were walking. The save shape and the render shape were two different
// shapes and the translation between them was a `{ title, days }` object literal
// written inline in a click handler.
//
// These two functions are that translation, in one place, as a pair. The point
// is not tidiness. It is that a shape mismatch is invisible until somebody
// reopens a trip and reads it carefully, and a pair of functions can be tested
// against each other in a second: put a guide in, take the same guide out.
//
// THE ROW IS THE GUIDE, plus three fields belonging to the list rather than to
// the trip. Nothing is hand-picked, so a field added to a guide tomorrow
// survives a save without anybody remembering this file exists.
//
// SCAFFOLDING IS NOT PART OF A TRIP. _testProfile and _testPlan describe a
// Random-guide pipeline run, which is for the founder and nobody else, and
// _planProblems are the logistics gates' findings written in the pipeline's own
// voice ("this suggests a bus for the last leg, and the last leg was MEASURED at
// 8 minutes on foot"). The same three are stripped from a shared link's payload
// in GuidePage's saveGuide, and this list is read by the same page, so the two
// strips are deliberately identical.
export const GUIDE_SCAFFOLDING = ["_testProfile", "_testPlan", "_planProblems"];

export const savedGuideRow = (guide, { id, savedAt } = {}) => {
  if (!guide || typeof guide !== "object" || Array.isArray(guide)) return null;
  // An id is the row's identity: the list keys on it, the delete matches on it,
  // and mergeSaves above drops any row without one. A save with no id is not a
  // save, so it is refused here rather than written and lost later.
  if (id == null || id === "") return null;
  const row = {};
  Object.keys(guide).forEach(k => { if (!GUIDE_SCAFFOLDING.includes(k)) row[k] = guide[k]; });
  row.id = id;
  row.savedAt = savedAt || new Date().toISOString();
  // ALSO on the row and not only inside the trip, because this is the one field
  // the LIST reads rather than the guide: checkSavedGuidesWeather walks the
  // saved rows and lines each day up against the forecast from it.
  row.arrivalDate = guide._arrivalDate || null;
  return row;
};

export const guideFromSavedRow = (row) => {
  if (!row || typeof row !== "object" || !Array.isArray(row.days) || row.days.length === 0) return null;
  const { id, savedAt, arrivalDate, ...trip } = row;
  // A ROW SAVED BEFORE THE FULL SHAPE EXISTED still opens, and this is the only
  // thing worth carrying across for it: arrivalDate and _arrivalDate are the
  // same value written under two names, and without it the day dates, the event
  // run-date check and the return leg all have nothing to measure from. The
  // trip's own value wins where it has one, since that is the one the guide was
  // built with.
  if (!trip._arrivalDate && arrivalDate) trip._arrivalDate = arrivalDate;
  return trip;
};

// A STRING ID MEANS THERE IS A REAL ROW BEHIND IT, in gemlyx_guides, holding the
// complete payload with a shareable link. GuidePage's own comment said the id
// was what told this list to route straight to /guide/:id, and nothing ever read
// it, so the one kind of saved guide that had everything was reopened from four
// local fields. A number id is Date.now() from the button on the guide itself,
// and nothing but the row has that trip.
export const savedGuideHasLink = (row) => typeof row?.id === "string" && !!row.id.trim();

// MERGE, NEVER OVERWRITE, on first login.
//
// The failure this exists to prevent: somebody plans a trip on their phone, then
// signs in on a laptop that has an older, emptier list, and a naive "cloud wins"
// or "local wins" rule silently destroys one side. Neither list is more correct
// than the other, so both are kept and duplicates are dropped.
//
// Identity: places are (kind, id), guides are their id. Where the same thing
// exists on both sides the CLOUD copy is kept, since it is the one that has been
// through a sync before. Order puts local first so a just-hearted place does not
// fall off the end of the cap.
export const mergeSaves = (localPlaces, cloudPlaces, localGuides, cloudGuides) => {
  const seenPlace = new Set();
  const places = [];
  [...(cloudPlaces || []), ...(localPlaces || [])].forEach(p => {
    if (!p || p.id == null) return;
    const k = `${p.kind}::${p.id}`;
    if (seenPlace.has(k)) return;
    seenPlace.add(k);
    places.push(p);
  });
  const seenGuide = new Set();
  const guides = [];
  [...(cloudGuides || []), ...(localGuides || [])].forEach(g => {
    if (!g || g.id == null) return;
    if (seenGuide.has(String(g.id))) return;
    seenGuide.add(String(g.id));
    guides.push(g);
  });
  // Newest first, then the same caps the app already applies, so a merge can
  // never grow a list past what the rest of the code expects.
  guides.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  return { places: places.slice(0, 40), guides: guides.slice(0, 20) };
};
