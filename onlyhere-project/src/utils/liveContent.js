// ── Shared Content Studio loader ──────────────────────────────────
// Extracted so both the main app (App.jsx, on "/") and the standalone guide
// page (pages/GuidePage.jsx, on "/guide/*") can fold in whatever's been
// published via Content Studio, not just the main app. Before this, GuidePage
// never called this at all, so a guide reached via a direct/shared link (no
// visit to "/" first in this browser tab) would miss any Studio-published
// town/food/nightlife/event/free-entrance item when matching a stop name to
// its real Gemlyx entry.
//
// towns/majorEvents/events/freeEntrance/foodSpots/nightlifeSpots/nightlifeTowns
// are module-level singletons (declared once in their data/ files). Mutating
// them in place here means every existing .map()/lookup across the WHOLE app,
// regardless of which component asked for the fetch, picks the new items up
// for free.
//
// ══ THE DUPLICATION BUG THIS FILE NOW OWNS (found Aug 5 2026) ══
//
// Symptom Oliver reported with screenshots: the same festival appearing three
// times in the Live Events strip, the same three free-entrance places filling
// the Attractions grid twice over, "Bork Vikingemarked" listed three times on
// the Events tab.
//
// It was NOT duplicated data. A direct query of gemlyx_content returned 55
// published rows with exactly one genuine duplicate in the whole table (the
// town "Dragoer", published twice, which Oliver can delete in Studio).
//
// The real cause: App.jsx used to carry its OWN private copy of this loader,
// and its "have I already merged this row" registry was a React
// `useRef(new Set())`, which is per COMPONENT MOUNT. The arrays it pushes
// into are module-level and live for the whole page session. GemlyxApp
// unmounts the instant you navigate to /guide/new (already documented as a
// standing architecture fact), so coming back mounted it fresh: empty guard,
// still-full arrays, and all 55 rows got pushed in AGAIN. Two guide round
// trips = three copies of every published place. A hard refresh "fixed" it
// until the next guide, which is exactly why it looked random.
//
// The fix is structural, not a patch: the dedupe registry must have the SAME
// lifetime as the arrays it protects. Both are module-level now, there is only
// ONE loader in the codebase, and the in-flight promise is cached so a second
// caller awaits the first fetch instead of starting a competing one.
//
// RULE FOR ANY FUTURE WORK HERE: never guard a mutation of a module-level
// array with component-scoped state (useRef/useState). If the data outlives
// the component, so must the guard.
import { events, majorEvents } from "../data/events";
import { towns, TOWN_COORDS } from "../data/towns";
import { freeEntrance } from "../data/freeEntrance";
import { nightlifeSpots } from "../data/nightlife";
import { nightlifeTowns } from "../data/nightlifeTowns";
import { foodSpots } from "../data/food";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";

const mergedIds = new Set();      // Supabase row ids already folded in
const mergedKeys = new Set();     // type + normalised name, second net (see below)
let loadPromise = null;           // cached so concurrent callers share one fetch
const bookingRowsCache = [];      // "booking" rows have no singleton array of their own

const keyOf = (type, name) => `${type}::${String(name || "").trim().toLowerCase()}`;

const doLoad = async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?select=*&published=eq.true`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const rows = await res.json();
    if (!Array.isArray(rows)) { console.warn("gemlyx_content fetch did not return an array:", rows); return; }
    if (rows.length === 0) return;
    const dupeNames = [];
    rows.forEach(row => {
      if (mergedIds.has(row.id)) return; // already merged this exact row
      const item = row.payload;
      if (!item || !item.name) return;
      // Second net, deliberately separate from the id guard above: two
      // DIFFERENT rows carrying the same type + name are a genuine duplicate
      // publish in Studio (a real one exists today: the town "Dragoer"). We
      // skip the second one so visitors never see a place listed twice, and
      // warn once in the console so the duplicate row still gets cleaned up
      // rather than quietly living forever.
      const k = keyOf(row.type, item.name);
      if (mergedKeys.has(k)) { dupeNames.push(`${row.type} "${item.name}" (row id ${row.id})`); return; }
      mergedIds.add(row.id);
      mergedKeys.add(k);
      const id = 100000 + row.id; // offset keeps live IDs clear of hardcoded ones
      if (row.type === "town") {
        towns.push({ id, ...item });
        if (Number(item.__lat) && Number(item.__lon)) TOWN_COORDS[item.name] = [item.__lat, item.__lon];
      } else if (row.type === "festival") (item.__scale === "Major" ? majorEvents : events).push({ id, ...item });
      else if (row.type === "free") freeEntrance.push({ id, ...item });
      else if (row.type === "food" || row.type === "foodStreet") foodSpots.push({ id, ...item });
      else if (row.type === "night") nightlifeSpots.push({ id, ...item });
      else if (row.type === "nightTown") nightlifeTowns.push({ id, ...item });
      else if (row.type === "booking") bookingRowsCache.push({ id, ...item });
    });
    if (dupeNames.length > 0) {
      console.warn(`gemlyx_content: skipped ${dupeNames.length} duplicate published row(s), delete them in Studio: ${dupeNames.join(", ")}`);
    }
  } catch (err) {
    console.warn("gemlyx_content fetch failed:", err);
  }
};

// Always safe to call, from anywhere, any number of times, on every mount.
// The fetch happens at most once per page session; every later caller just
// awaits the same promise and gets the booking rows handed back.
//
// onBookingRow: optional callback for "booking"-type rows, which don't have a
// module-level singleton array of their own (App.jsx keeps them in real React
// state, craftItems, seeded from craftItemsFallback). Because that state DOES
// reset on remount while this module's cache does not, the callback fires for
// every caller, with the full cached set, and the caller is responsible for
// merging it into its own state idempotently (App.jsx filters by id).
export const ensureLiveContentLoaded = async (onBookingRow) => {
  if (!loadPromise) loadPromise = doLoad();
  await loadPromise;
  if (onBookingRow && bookingRowsCache.length > 0) onBookingRow(bookingRowsCache.slice());
  return bookingRowsCache.slice();
};

// Deliberate, explicit re-fetch: the ONLY supported way to pull newly published
// content into a session that has already loaded. Used by Content Studio right
// after a successful publish, so a new entry shows up without a page reload.
//
// It clears the cached promise but deliberately KEEPS mergedIds/mergedKeys, so
// the re-fetch merges only rows that are genuinely new. That is the whole point:
// a refresh must never be able to re-add the 54 rows already in the arrays. If
// you ever need a true reset, the honest answer is window.location.reload().
export const refreshLiveContent = async (onBookingRow) => {
  loadPromise = null;
  return ensureLiveContentLoaded(onBookingRow);
};
