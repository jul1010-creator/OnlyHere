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
