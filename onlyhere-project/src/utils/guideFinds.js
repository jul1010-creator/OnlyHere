// ── "AN EVENT NEARBY YOUR PATH WAS JUST DISCOVERED" ─────────────────
//
// Oliver, 19 Sep 2026:
//
//   "we have the live weather being rendered. I also believe we need these
//    notifications added onto the guide. Like 'an event nearby your path was
//    just discovered!' And then you can click it, and add or make slight
//    changes to your route."
//
// The weather half of this already exists and is the pattern: the guide page
// re-fetches the forecast on open, weatherChanges says what moved, and a banner
// reports it. A guide is not a document, it is a thing somebody opens again the
// week before they travel, and by then the world has moved.
//
// This is the same shape for community events. A guide built in August stands
// on Sejerø on 4 July, and the harbour night on 4 July was added to Gemlyx in
// June. Nothing told the traveller, because the guide's own copy of what was on
// was frozen the moment it was written.
//
// ── WHAT COUNTS AS "JUST DISCOVERED" ────────────────────────────────
//
// Added to Gemlyx AFTER this guide was built. Not "on a day of the trip", which
// is every community row the guide already carries, and not "new to the
// traveller", which nothing can know. Every community row carries `fetchedAt`
// from the calendar import, and every guide carries `_gid`, which is the
// millisecond it was built. The comparison is that, and it is the only claim
// this file makes: this was not here when your guide was written.
//
// AND IT IS STILL THE SAME NARROW DOOR. A find has to be on a day the plan
// STANDS in that place, which is the rule the whole tier turns on and the one
// Oliver set himself: "Community events are more local people getting together
// ... But is an interesting thing to be part of if you're there." "Nearby your
// path" means the path, not a radius around it.
import { communityOnDay, townsOf } from "./communityEvents";

// The moment a guide was built. `_gid` is Date.now() at handoff in App.jsx.
// A guide with no gid is one from before that existed, and nothing can be
// called new to it, which is the safe answer rather than calling everything new.
export const builtAt = (guide) => {
  const n = Number(guide?._gid);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const at = (v) => {
  const t = Date.parse(String(v || ""));
  return Number.isFinite(t) ? t : null;
};

// Already on the guide, from the build or from an earlier open he accepted.
// Keyed by name and date, which is what communityOnDay dedupes on everywhere
// else in this app.
const keyOf = (r) => `${String(r?.name || "").trim().toLowerCase()}|${String(r?.date || "").slice(0, 10)}`;
export const alreadyOn = (guide) => {
  const cells = Object.values(guide?._community || {});
  const rows = cells.flatMap(c => (Array.isArray(c) ? c : (c?.rows || [])));
  return new Set(rows.map(keyOf));
};

// ── THE FINDS ───────────────────────────────────────────────────────
//
// `dayDateFor(dayNumber)` is the guide page's own day-to-date reader, injected
// rather than recomputed, because a second copy of that arithmetic is how a day
// once drifted across a month boundary in this codebase.
//
// Returns one row per find, carrying the day it belongs to, so a card can say
// "day 3" rather than a date the reader has to count to.
export const newFinds = ({ guide, pool = [], dayDateFor = () => null, islandOf = null } = {}) => {
  const since = builtAt(guide);
  if (!since) return [];
  const have = alreadyOn(guide);
  const days = Array.isArray(guide?.days) ? guide.days : [];
  const out = [];
  const seen = new Set();
  days.forEach((d, i) => {
    const dayNo = d?.day || i + 1;
    const date = dayDateFor(dayNo);
    if (!date) return;
    // The same reader the build used, with no cap: a find that would have been
    // third on a busy day is still a find, and the cap is about what a day
    // PRINTS rather than about what is on.
    const rows = communityOnDay({ stops: d?.stops || [], date, pool, islandOf, limit: null });
    for (const r of rows) {
      const k = keyOf(r);
      if (have.has(k) || seen.has(k)) continue;
      const found = at(r.fetchedAt);
      // No fetchedAt is not a new row. A row with no stamp is one this app
      // cannot date, and calling it new would put an old harbour night on a
      // banner that says it was just discovered.
      if (found == null || found <= since) continue;
      seen.add(k);
      out.push({ ...r, day: dayNo });
    }
  });
  return out.sort((a, b) => a.day - b.day || String(a.date).localeCompare(String(b.date)));
};

// ── AND WHAT THE BANNER SAYS ────────────────────────────────────────
//
// His words are the right words and they are not a promise this file can keep
// twice over: "just discovered" is true of the row reaching Gemlyx, which is
// what it says, rather than of the event being new. Named rather than counted,
// because a traveller cannot act on "2 new things" and can act on a name.
export const findsLine = (rows) => {
  const list = Array.isArray(rows) ? rows.filter(r => r && r.name) : [];
  if (!list.length) return "";
  if (list.length === 1) {
    const r = list[0];
    return `${r.name} is on in ${townsOf(r)[0] || "a place on your route"} on day ${r.day}, and it was not in Gemlyx when this guide was written.`;
  }
  return `${list.length} things are on along this route that were not in Gemlyx when this guide was written.`;
};

// The one line under a single find, for the card. Empty when there is nothing
// to add to the name, which is most village entries.
export const findDetail = (row) => [
  row?.time ? `from ${row.time}` : "",
  row?.venue ? `at ${row.venue}` : "",
].filter(Boolean).join(", ");

// ── ACCEPTING ONE ───────────────────────────────────────────────────
//
// Oliver: "then you can click it, and add or make slight changes to your
// route." Adding a community row as a STOP is the one thing this tier forbids,
// because nothing here has been checked the way a published entry is and the
// writer is told never to build a day around one. So accepting a find PINS it
// to its day, which is exactly what the day card already prints, and the route
// is untouched.
//
// Returns a NEW guide. The caller decides whether to save it, the same way the
// stop swap on this page does.
export const withFind = (guide, row) => {
  if (!guide || !row?.name) return guide;
  const day = Number(row.day) || 0;
  if (!day) return guide;
  const cells = { ...(guide._community || {}) };
  const cell = cells[day];
  const rows = Array.isArray(cell) ? cell : (cell?.rows || []);
  const more = Array.isArray(cell) ? 0 : (cell?.more || 0);
  if (rows.some(r => keyOf(r) === keyOf(row))) return guide;
  // `more` comes down by one when the find was part of what that day was not
  // naming, and never below zero.
  const { day: _day, ...kept } = row;
  return { ...guide, _community: { ...cells, [day]: { rows: [...rows, kept], more: Math.max(0, more - 1) } } };
};

// And turning one down. Kept on the guide so an opened guide does not offer the
// same thing every week, which is the failure the notice tier already avoids by
// expiring rather than by remembering.
export const withoutFind = (guide, row) => {
  if (!guide || !row?.name) return guide;
  const turned = [...new Set([...(guide._findsTurnedDown || []), keyOf(row)])];
  return { ...guide, _findsTurnedDown: turned };
};

export const wasTurnedDown = (guide, row) => (guide?._findsTurnedDown || []).includes(keyOf(row));
