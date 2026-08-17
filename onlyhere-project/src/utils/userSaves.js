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

export const fetchCloudSaves = async (session) => {
  if (!session?.token || !session?.userId) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gemlyx_user_data?user_id=eq.${session.userId}&select=saved_places,saved_guides`,
      { headers: headers(session) }
    );
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;   // table missing, or an error object
    if (rows.length === 0) return { places: [], guides: [], isNew: true };
    return {
      places: Array.isArray(rows[0].saved_places) ? rows[0].saved_places : [],
      guides: Array.isArray(rows[0].saved_guides) ? rows[0].saved_guides : [],
      isNew: false,
    };
  } catch { return null; }
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
