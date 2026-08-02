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
// are module-level singletons (declared once in their data/ files) — mutating
// them in place here means every existing .map()/lookup across the WHOLE app,
// regardless of which component asked for the fetch, picks the new items up
// for free. mergedIds is ALSO module-level (not per-component) specifically so
// that whichever component happens to call this first "wins" the merge and a
// second caller (e.g. GuidePage mounting after App.jsx already merged) can't
// push the same published row in twice.
import { events, majorEvents } from "../data/events";
import { towns, TOWN_COORDS } from "../data/towns";
import { freeEntrance } from "../data/freeEntrance";
import { nightlifeSpots } from "../data/nightlife";
import { nightlifeTowns } from "../data/nightlifeTowns";
import { foodSpots } from "../data/food";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";

const mergedIds = new Set();
let fetchStarted = false;

// onBookingRow: optional callback for "booking"-type rows, which don't have a
// module-level singleton array of their own (App.jsx keeps them in real React
// state, craftItems, seeded from craftItemsFallback) — passed through instead
// of pushed anywhere, so the caller decides how to hold onto them.
export const ensureLiveContentLoaded = async (onBookingRow) => {
  if (fetchStarted) return;
  fetchStarted = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?select=*&published=eq.true`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return;
    const bookingRows = [];
    rows.forEach(row => {
      if (mergedIds.has(row.id)) return; // already merged this row, skip
      const item = row.payload;
      if (!item || !item.name) return;
      mergedIds.add(row.id);
      const id = 100000 + row.id; // offset keeps live IDs clear of hardcoded ones
      if (row.type === "town") {
        towns.push({ id, ...item });
        if (Number(item.__lat) && Number(item.__lon)) TOWN_COORDS[item.name] = [item.__lat, item.__lon];
      } else if (row.type === "festival") (item.__scale === "Major" ? majorEvents : events).push({ id, ...item });
      else if (row.type === "free") freeEntrance.push({ id, ...item });
      else if (row.type === "food" || row.type === "foodStreet") foodSpots.push({ id, ...item });
      else if (row.type === "night") nightlifeSpots.push({ id, ...item });
      else if (row.type === "nightTown") nightlifeTowns.push({ id, ...item });
      else if (row.type === "booking") bookingRows.push({ id, ...item });
    });
    if (bookingRows.length > 0 && onBookingRow) onBookingRow(bookingRows);
  } catch (err) {
    console.warn("gemlyx_content fetch failed:", err);
  }
};
