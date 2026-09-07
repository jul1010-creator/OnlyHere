// ── THE BEEN LIST, SYNCED TO THE ACCOUNT ────────────────────────────
//
// Oliver, 6 Sep 2026, choosing where it lives: a button beside Save, and it
// follows the account.
//
// ── ITS OWN REQUEST, NOT A THIRD FIELD ON THE SAVES READ ────────────
//
// The obvious move is to add `been` to userSaves' existing
// `select=saved_places,saved_guides`. It is also the one that breaks the app on
// the way in: PostgREST answers a SELECT naming a column that does not exist
// with an ERROR, fetchCloudSaves reads any non-array as "the table is not
// there", and every traveller loses their saves between this deploy and Oliver
// running the migration. A feature nobody is using yet must not be able to do
// that to a feature everybody is.
//
// So it reads and writes on its own, exactly the way profile.js does, and a
// missing column can only ever cost the been list.
//
// The column, when he adds it:
//   alter table gemlyx_user_data add column if not exists been jsonb;
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { getSession } from "./auth";
import { BEEN_CAP, BEEN_KINDS } from "./beenThere";

const headers = (session) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${session.token}`,
  "Content-Type": "application/json",
});

// Same as utils/userSaves.js and utils/profile.js, and for the same reason:
// App.jsx reads the session once at mount and holds it, so by the time somebody
// marks a place the token in that object can be hours old.
const live = async (session) => {
  if (!session?.token || !session?.userId) return null;
  const fresh = await getSession();
  return fresh?.token && fresh?.userId ? fresh : null;
};

// PostgREST names a missing column two ways depending on whether the schema
// cache or the database answered first. Both, because which one you get is a
// race and a feature that only works on one of them works intermittently.
export const missingBeenColumn = (body) => {
  const code = String(body?.code || "");
  if (code === "42703" || code === "PGRST204") return true;
  const msg = `${body?.message || ""} ${body?.hint || ""}`;
  return /\bbeen\b/i.test(msg) && /column|does not exist|schema cache/i.test(msg);
};

// ── WHAT COMES BACK IS DATA, NOT A LIST WE WROTE ────────────────────
//
// It is our own row, but it has been through a jsonb column and a network, and
// a row edited by hand in the Supabase console is a real thing that happens.
// Anything that is not a usable record is dropped rather than reaching the
// pool filter, where a `{ id: null }` would match every entry with no id.
export const cleanBeen = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const r of raw) {
    const kind = String(r?.kind ?? "").trim();
    if (!BEEN_KINDS.includes(kind)) continue;
    if (r?.id === undefined || r?.id === null || r?.id === "") continue;
    const key = `${kind}:${r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      kind, id: r.id,
      name: String(r?.name ?? "").trim(),
      emoji: String(r?.emoji ?? "").trim(),
      town: String(r?.town ?? "").trim(),
      at: String(r?.at ?? "").slice(0, 10),
    });
    if (out.length >= BEEN_CAP) break;
  }
  return out;
};

// { been } on success, { missingColumn: true } when the migration has not been
// run, or null when the call simply failed. Three situations a bare null would
// flatten into one, which is the fault userSaves.js has a whole comment about.
export const fetchBeen = async (session) => {
  const now = await live(session);
  if (!now) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gemlyx_user_data?user_id=eq.${now.userId}&select=been`,
      { headers: headers(now) },
    );
    const body = await res.json();
    if (!Array.isArray(body)) {
      if (missingBeenColumn(body)) return { missingColumn: true };
      return null;
    }
    return { been: body.length ? cleanBeen(body[0].been) : [] };
  } catch { return null; }
};

export const pushBeen = async (session, been) => {
  const now = await live(session);
  if (!now) return { ok: false };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_user_data?on_conflict=user_id`, {
      method: "POST",
      headers: { ...headers(now), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: now.userId,
        been: cleanBeen(been),
        updated_at: new Date().toISOString(),
      }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    if (missingBeenColumn(body)) return { ok: false, missingColumn: true };
    return { ok: false, error: String(body?.message || body?.hint || "") || `Save failed (${res.status})` };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
};

// ── AND THE TWO LISTS HAVE TO MEET ──────────────────────────────────
//
// Somebody marks three places on their phone with no signal, opens a laptop,
// and the account has two others on it. Neither list is the truth on its own.
//
// UNION, NEVER THE LONGER ONE. mergeSaves in userSaves.js takes the same
// position and its comment says why: picking a side loses whichever side is
// newer, and a been mark is cheap to add and annoying to lose. The local
// record wins a tie, because it is the one whose date was written on the device
// that made it.
export const mergeBeen = (local, cloud) => {
  const out = [];
  const seen = new Set();
  for (const r of [...cleanBeen(local), ...cleanBeen(cloud)]) {
    const key = `${r.kind}:${r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out.slice(0, BEEN_CAP);
};
