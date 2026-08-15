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
import { nightlifeStreets } from "../data/nightlifeStreets";
import { foodSpots } from "../data/food";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { essentials } from "../data/essentials";
import { craftItemsFallback } from "../data/craft";
import { stripDashesDeep } from "./helpers";

const mergedIds = new Set();      // Supabase row ids already folded in
const mergedKeys = new Set();     // type + normalised name, second net (see below)
let loadPromise = null;           // cached so concurrent callers share one fetch
const bookingRowsCache = [];      // "booking" rows have no singleton array of their own

const keyOf = (type, name) => `${type}::${String(name || "").trim().toLowerCase()}`;

const doLoad = async () => {
  try {
    // ── order=id.desc IS LOAD-BEARING, NOT TIDINESS ─────────────────
    // The dedupe below keeps the FIRST row it meets for a given type + name.
    // Without an explicit order, PostgREST makes no promise about which row
    // that is, so on the five towns that genuinely have duplicates today
    // (Ribe, Samsø, Ringkøbing, Dragør, Møgeltønder) WHICH VERSION A READER
    // SEES COULD CHANGE BETWEEN TWO LOADS OF THE SAME PAGE. Found 12 Aug 2026;
    // the console has been naming those duplicates for a week and the
    // nondeterminism underneath them was the part nobody had looked at.
    //
    // Newest id wins, because a duplicate is a redraft: the higher row is the
    // one that was written second. middleware.js orders its own two lookups
    // the same way, so the share card describes the row the page renders.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?select=*&published=eq.true&order=id.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const rows = await res.json();
    if (!Array.isArray(rows)) { console.warn("gemlyx_content fetch did not return an array:", rows); return; }
    if (rows.length === 0) return;
    const dupeNames = [];
    rows.forEach(row => {
      if (mergedIds.has(row.id)) return; // already merged this exact row
      // ── THE DASH BAN FINALLY REACHES PUBLISHED CONTENT ────────────
      // 55 en and em dashes were live on 12 Aug, in gemlyxFind, ticketInfo,
      // budgetLevel and prose, on entries drafted before stripDashes existed:
      // "The EKKO Stage is a new addition—dedicated to electronic music
      // lovers" was on the Skanderborg page. stripDashesDeep was written for
      // GUIDES and never ran over content rows, so every one of those entries
      // would have needed a redraft to clean a character.
      //
      // Cleaning on the way IN fixes all 55 without touching the database and
      // holds for anything published later, including anything published by a
      // path that forgets. It skips keys beginning with _ by design, so
      // __lat/__lon and the cached durations arrive untouched.
      const item = stripDashesDeep(row.payload);
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
      else if (row.type === "nightStreet") nightlifeStreets.push({ id, ...item });
      else if (row.type === "nightTown") nightlifeTowns.push({ id, ...item });
      // ── THE ONE TYPE WITH NO MODULE ARRAY, AND WHAT IT COST ────
      // Every other type is pushed into a module-level singleton that any
      // module can import. Booking rows went only into this local cache and
      // out through the onBookingRow callback into React state, so the two
      // places that read craft OUTSIDE a component read the hardcoded
      // craftItemsFallback, which has been empty since content moved to
      // Supabase: utils/guideEnrichment.js lookupRealPlace, which is how a
      // guide stop becomes a clickable published entry, and
      // utils/previewMatch.js previewPools, which is the preview screen.
      // Every published workshop was invisible to both.
      //
      // Filled here as well, so booking behaves like the other eight rather
      // than needing every reader to know it is special. The React state path
      // stays exactly as it was.
      else if (row.type === "booking") { bookingRowsCache.push({ id, ...item }); craftItemsFallback.push({ id, ...item }); }
      // Published essentials sit alongside the hardcoded ones rather than
      // replacing the file. Day one, nothing disappears; each hardcoded entry
      // can then be retired one at a time as a researched version replaces it.
      else if (row.type === "essential") essentials.push({ id, ...item });
      // AND NOTHING FALLS OFF THE END SILENTLY. Every branch above is a hand
      // registration, and a published row whose type nobody registered used to
      // be fetched, deduped, marked merged, and then dropped with no warning:
      // the row exists in the database and renders nowhere, which is this
      // project's signature bug shape. It says so now.
      else console.warn(`gemlyx_content: published row ${row.id} has type "${row.type}", which nothing in liveContent.js merges. It is in the database and will render nowhere.`);
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

// ── AND THE ROW THAT IS ALREADY IN THERE ────────────────────────────
//
// Oliver, 15 Aug 2026: "clicking 'save' just to be put all the way back to the
// front page is also very annoying."
//
// Saving an edit called window.location.reload(). The comment above it said
// "simplest correct way to reflect an in-place field change", and it was
// correct, because refreshLiveContent CANNOT do it: it keeps mergedIds on
// purpose, so a row already folded in is skipped on the way back through, and
// the paragraph above says as much. Publishing something new had a no-reload
// path since the day it was written. Editing never got one, so every save threw
// away the Studio panel, the open group, the scroll position and the search, to
// change one field.
//
// So this is the missing operation: replace a row that is already merged. It
// touches the same module singletons doLoad pushes into, at the SAME INDEX, so
// nothing reorders on a browse page just because a description was fixed.
//
// RETURNS FALSE RATHER THAN GUESSING. A row that was never merged (skipped as a
// duplicate, or a type nothing registers) is not in any array to replace, and
// pretending otherwise would leave the reader looking at the old text with no
// sign anything failed. The caller reloads on false, which is exactly the old
// behaviour, so the worst case is today.
const ARRAY_FOR = {
  town: towns,
  free: freeEntrance,
  food: foodSpots,
  foodStreet: foodSpots,
  night: nightlifeSpots,
  nightStreet: nightlifeStreets,
  nightTown: nightlifeTowns,
  essential: essentials,
};

export const LIVE_ID_OFFSET = 100000;

export const applyEditedRow = (rowId, type, payload) => {
  const id = LIVE_ID_OFFSET + Number(rowId);
  if (!Number.isFinite(id)) return false;
  // Same clean on the way in as doLoad, for the same reason. An edit is a
  // second door into the arrays and a dash typed by hand in the Studio editor
  // must not walk through it.
  const item = stripDashesDeep(payload);
  if (!item || !item.name) return false;

  // Booking lives in two places by design (see the note in doLoad), and a
  // festival can change which of the two event arrays it belongs in, because
  // __scale is an editable field.
  const homes = type === "festival" ? [events, majorEvents]
    : type === "booking" ? [craftItemsFallback, bookingRowsCache]
    : ARRAY_FOR[type] ? [ARRAY_FOR[type]] : [];
  if (!homes.length) return false;

  const wanted = type === "festival" ? (item.__scale === "Major" ? majorEvents : events) : null;
  let oldName = null;
  for (const list of homes) {
    const i = list.findIndex(x => x?.id === id);
    if (i < 0) continue;
    if (oldName === null) oldName = String(list[i]?.name || "");
    // A festival promoted to Major, or demoted, leaves the array it was in.
    if (wanted && list !== wanted) { list.splice(i, 1); continue; }
    list[i] = { id, ...item };
  }
  if (oldName === null) return false;
  if (wanted && !wanted.some(x => x?.id === id)) wanted.push({ id, ...item });

  // ── AND THE TWO REGISTRIES THAT OUTLIVE THE ROW ──────────────────
  // mergedKeys is type + name, so a RENAME leaves the old name claimed
  // forever. Publish a new entry under that name afterwards and the loader
  // silently skips it as a duplicate of a row that no longer has that name,
  // which is this project's signature bug: in the database, rendering nowhere.
  if (oldName && oldName !== item.name) {
    mergedKeys.delete(keyOf(type, oldName));
    mergedKeys.add(keyOf(type, item.name));
  }
  // A town coordinate is the reference frame every other entry in that town is
  // measured against (see coordCheck.js), so a corrected one has to land here
  // too or the map keeps the old point until the next full load.
  if (type === "town") {
    if (oldName && oldName !== item.name) delete TOWN_COORDS[oldName];
    if (Number(item.__lat) && Number(item.__lon)) TOWN_COORDS[item.name] = [item.__lat, item.__lon];
  }
  return true;
};
