// ── "HIDDEN, BUT PRESENT" ───────────────────────────────────────────
//
// Oliver, 19 Sep 2026, after reading every Danish island's own calendar:
//
//   "all the islands are actually very 'alive' in terms of events if you dig
//    deep enough. However, having all their small 30 participants-events on our
//    event line seems silly. I think we somehow need to keep these events
//    hidden, but present. So if it puts you onto Sejerø, it will include a small
//    local event happening at Sejerø, but not something published."
//
// sejero.dk/arrangementer is the page. Asked what to call the tier: "consider it
// a community event. So along with the facebook ones."
//
// The hiding is done by the ARRAY, in data/events.js and liveContent.js: a
// community row is never in `events` or `majorEvents`, so the Events page, the
// month chips, the front page line and the chat prompt cannot reach it, and no
// reader has to remember to exclude it. This file is the other half, the one
// door that opens.
//
// ── AND THE DOOR IS NARROW ON PURPOSE ───────────────────────────────
//
// Asked whether a community event should also reach somebody passing nearby:
//
//   "Anything within reach is only for events that genuinely is major events.
//    Community events are more local people getting together, which is
//    something you can find many places. But is an interesting thing to be part
//    of if you're there."
//
// So there is no reach band here, no day trip, no nearest town. The plan has a
// stop in that place, on a day the thing is on, or the traveller never hears
// about it. A harbour night on Sejerø is worth knowing about when you are on
// Sejerø and is noise anywhere else, which is the whole difference between this
// tier and the two that publish.
import { communityEvents } from "../data/events";
import { fold } from "./danishNames";
import { KEEP_THE_NAME, accessBlock } from "./eventAccess";

// The town a row is about, under the several field names published rows use.
// Not the description: "the ferry from Havnsø" names a mainland harbour and a
// row matched on it would surface on the wrong side of the water.
const townOf = (row) => String(row?.town || row?.__town || row?.location || "").trim();

// ── AND A SOURCE CAN COVER TWO PLACES ─────────────────────
//
// Oliver, 19 Sep 2026: "make it able to cover two places.. because the Askø
// group covers Lilleø as well."
//
// His own screenshot of that group says it: "For personer med tilknytning til
// Askø & Lilleø." One association, one noticeboard, two islands joined by a
// causeway. This is not a reach band and it is not a guess about distance: it
// is the SOURCE saying which places it is the noticeboard for, which is a fact
// somebody typed rather than something this file worked out.
//
// One row with two places rather than two rows, so a day that stands on both
// does not offer the same evening twice.
export const townsOf = (row) => {
  const many = Array.isArray(row?.towns) ? row.towns : [];
  return [...new Set([townOf(row), ...many].map(v => String(v || "").trim()).filter(Boolean))];
};

// What somebody typed in the place box, as places. Comma or slash, because
// "Askø, Lilleø" and "Askø/Lilleø" are both how that group names itself.
export const placesIn = (said) => [...new Set(String(said || "")
  .split(/[,/;]|\s+&\s+|\s+og\s+|\s+and\s+/i)
  .map(v => v.trim())
  .filter(Boolean))].slice(0, MOST_PLACES);

// Two. A noticeboard for three islands is a region, and a region is what the
// published tiers are for.
export const MOST_PLACES = 2;

// ── THE SAME PLACE, AND NOTHING LOOSER ──────────────────────────────
//
// Folded, because Sejerø, Sejeroe and SEJERØ are one island and a Danish letter
// is not a reason to miss it. Whole string, not a substring: "Nyborg" inside
// "Nyborg Strand" is the same town, but "Hou" inside "Houlbjerg" is not, and a
// substring rule cannot tell those apart. danishNames.fold is the reader the
// rest of the app matches Danish place names with.
// AND ONE COLLAPSE fold DOES NOT DO. It maps ø to o, so "Sejerø" folds to
// "sejero", and a page that spells the island "Sejeroe" folds to "sejeroe" and
// misses. The oe spelling is what Danish keyboards abroad and half of these
// village pages use, so the two are collapsed onto each other here. Applied to
// both sides, so it can only ever merge two spellings of one name; it is done
// in this file rather than in fold itself, which has a great many callers and
// its own assertions.
const loose = (v) => fold(String(v || "").trim()).replace(/oe/g, "o");

export const samePlace = (a, b) => {
  const x = loose(a), y = loose(b);
  return !!x && !!y && x === y;
};

// ── ON A DAY THEY ARE THERE ─────────────────────────────────────────
//
// Dates only, with the time of day thrown away, because a guide's day is a date
// and an event that runs from the 4th to the 6th is on for all three of them.
// A row with no start date is not offered at all: an undated event is what
// undatedEvents exists for, and a community row with nothing to test is a claim
// that it is on today.
const dayOf = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};

export const runsOn = (row, date) => {
  const day = dayOf(date);
  const from = dayOf(row?.date);
  if (day == null || from == null) return false;
  const to = dayOf(row?.dateEnd) ?? from;
  return day >= from && day <= Math.max(from, to);
};

// ── WHAT A DAY OF THE PLAN EARNS ────────────────────────────────────
//
// `stops` is that day's stops, each carrying the town the planner gave it, and
// `date` is the date that day falls on. Returns the community rows for a place
// the day actually stands in, on a day they are on. Empty is the normal answer.
//
// The pool is injected so this can be run on a fixture, and defaults to the live
// array, which is the same shape every other reader in this app uses.
// ── AND A PLACE HAS MORE THAN ONE NAME AT MORE THAN ONE SCALE ──
//
// Oliver, 19 Sep 2026, testing his first imported calendars: "being on Sejerø I
// didn't get notification about Sejerø event."
//
// Traced through the real shapes. The row is filed under the ISLAND, because
// the calendar belongs to the island and because an address on one of these
// names the postal town, which for Endelave is on the mainland. The plan's stop
// carries the TOWN the planner named, and the planner is asked for "the real
// Danish town/city it's in", so a stop on Sejerø comes back as Sejerby or
// Kongstrup. Two correct answers about the same patch of ground, and a string
// comparison between them fails.
//
// THIS IS NOT THE REACH BAND HE REFUSED. He was clear: "Anything within reach
// is only for events that genuinely is major events." A reach band is a ferry
// ride away and a different place. Sejerby IS Sejerø: standing in it you are on
// the island, a few kilometres from the harbour, which is the whole of what he
// asked this tier to catch. The day still has to STAND there.
//
// `islandOf` is injected rather than imported, for the reason everything in
// this file is: it answers from the published entries, and this file is a leaf
// that the suite runs with no content behind it. A caller that passes nothing
// gets exactly the behaviour this had before.
export const communityOnDay = ({ stops = [], date = null, pool = communityEvents, islandOf = null, limit = MOST_IN_A_DAY } = {}) => {
  const ask = typeof islandOf === "function" ? islandOf : () => "";
  const towns = [...new Set((Array.isArray(stops) ? stops : [])
    .flatMap(s => {
      const town = String(s?.town || "").trim();
      const name = String(s?.name || "").trim();
      // The island each of them sits on, when Gemlyx holds a page that says so.
      // Both, because a stop can name a venue whose town is the village.
      return [town, name, ask(town), ask(name)];
    })
    .map(v => String(v || "").trim())
    .filter(Boolean))];
  if (!towns.length || !date) return [];
  return (Array.isArray(pool) ? pool : [])
    .filter(row => row && row.name
      && townsOf(row).some(where => towns.some(t => samePlace(t, where)))
      && runsOn(row, date))
    // Two of these in a village on one day is already more than a traveller
    // wants, and a plan that surfaces four has stopped being a find.
    // `limit` is null only from communityDay, which needs the whole day to
    // count what it is not naming. Every other caller gets the cap.
    .slice(0, limit == null ? Infinity : limit);
};

// ── AND SOME ISLANDS ARE NOT VILLAGES ────────────────────
//
// Oliver, 19 Sep 2026, with govisit.dk's Læsø calendar open: "læsø is clearly
// not a small community.. what to do about that? We can't have a billion events
// popping up.. I guess we can do a 'multiple events' currently going on."
//
// Read: fifty seven events, and five or more of them on one day. The cap above
// already stops a plan printing five, and on its own it stops silently, so a
// day on Læsø and a day on Sejerø look identical to a reader when one has one
// thing on and the other has seven.
//
// So the count comes back with the rows. Two named and the rest counted is the
// honest shape of a busy day: the traveller learns the island is alive without
// being handed a calendar, which is the thing he did not want on the event line
// in the first place.
export const communityDay = (args) => {
  const all = communityOnDay({ ...(args || {}), pool: (args || {}).pool, limit: null });
  const rows = all.slice(0, MOST_IN_A_DAY);
  return { rows, more: Math.max(0, all.length - rows.length) };
};

// The line under a day that has more on it than it can name. Empty for a day
// with nothing left over, which is almost every day.
// ── AND THE SAME PROBLEM ON THE NOTICE SIDE ───────────────
//
// A guide day is capped at two by the reader above. A NOTICE is not: adding
// Læsø's calendar would put seven separate notices under Near you for one
// Saturday, which is the billion he does not want.
//
// So a day with more than the cap becomes ONE notice for that day. Named, not
// counted, in the body: somebody standing on the island wants to know what is
// on, and the headline is what stops it being a list.
export const noticeGroups = (rows, { most = MOST_IN_A_DAY } = {}) => {
  const byKey = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || !r.name || !r.date) continue;
    const key = `${fold(String(r.town || ""))}|${r.date}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(r);
  }
  const out = [];
  for (const group of byKey.values()) {
    if (group.length <= most) { out.push(...group.map(r => ({ rows: [r], rolled: false }))); continue; }
    out.push({ rows: group, rolled: true });
  }
  return out;
};

// What a rolled up day is called. The count is in the headline because that is
// the whole of what it says: the island is busy today.
export const rolledHeadline = (rows) => {
  const list = Array.isArray(rows) ? rows.filter(r => r && r.name) : [];
  if (!list.length) return "";
  const place = String(list[0]?.town || "").trim();
  return `${list.length} things on${place ? ` on ${place}` : ""} today`;
};

export const rolledBody = (rows) => {
  const list = Array.isArray(rows) ? rows.filter(r => r && r.name) : [];
  return list.map(r => `${r.name}${r.time ? `, ${r.time}` : ""}${r.venue ? `, ${r.venue}` : ""}`).join(". ");
};

export const moreOnLine = (more, place = "") => {
  const n = Math.max(0, Math.floor(Number(more) || 0));
  if (!n) return "";
  return `and ${n} more on${String(place || "").trim() ? ` in ${String(place).trim()}` : ""} that day`;
};

// Two. A community event is a find and a list of them is a calendar, which is
// the thing he did not want on the event line in the first place.
export const MOST_IN_A_DAY = 2;

// ── AND WHAT THE GUIDE IS TOLD ──────────────────────────────────────
//
// The block, in the writer's prompt, for the one day it belongs to. It is
// deliberately not a sentence to reproduce: a line written here and read out
// would be the same line under every village in the country, which is the
// brochure voice the rest of this app spends its rules avoiding.
//
// WHAT IT CANNOT DO IS AS IMPORTANT AS WHAT IT CAN. These rows are scraped off a
// village's own page and nobody has fact-checked them the way a published entry
// is checked, so the writer may say what the row says and may not build a day
// around it, promise it will happen, or price it.
// `byDay` is keyed by day number and each value is what communityDay returned:
// the rows this day names and the count of what it is not naming. An array is
// still accepted, because that is what this took before the count existed.
const rowsOf = (v) => (Array.isArray(v) ? v : (v?.rows || []));
const moreOf = (v) => (Array.isArray(v) ? 0 : Math.max(0, Number(v?.more) || 0));

export const communityBlock = (byDay, opts = {}) => {
  const days = Object.entries(byDay || {}).filter(([, v]) => rowsOf(v).length);
  if (!days.length) return "";
  const lines = days.map(([day, v]) => [
    ...rowsOf(v).map(r => `  Day ${day}, ${townOf(r)}: ${r.name}${r.date ? ` on ${String(r.date).slice(0, 10)}` : ""}${r.desc ? `. ${String(r.desc).slice(0, 180)}` : ""}`),
    ...(moreOf(v) ? [`  Day ${day}: ${moreOnLine(moreOf(v), townOf(rowsOf(v)[0]))}, which the page says and you do not have to.`] : []),
  ].join("\n")).join("\n");
  return `── SOMETHING LOCAL ON WHILE THEY ARE THERE ──\n`
    + `These are community events: a village hall, a harbour night, a market somebody in the place organised. They are not published anywhere on Gemlyx and they reach this traveller only because the plan stands in that place on that day.\n${lines}\n`
    + `THE GUIDE PAGE ALREADY PRINTS THESE ON THAT DAY, so do not write them out again: a date and a place said twice on one screen reads as a machine. Do not contradict one either, and never build the day around it, promise it is on, or give it a price or a ticket. Write the day as though somebody might walk into it.\n`
    // ── AND NOT ALL OF THEM ARE FOR A VISITOR ───────────────
    //
    // Oliver, 19 Sep 2026: "these islands are going to depend on a lot on your
    // language. Læsø's calender doesn't seem very foreigner friendly.." and
    // then, on the clearest case: "Anything about 'theater' should be a clear
    // nono as a foreigner."
    //
    // Two rules, and the first is about the NAME. See utils/eventAccess.js.
    + `${KEEP_THE_NAME}\n${accessBlock(rows(byDay), opts)}`;
};

// Every row in the block, for the two rules above to be computed over.
const rows = (byDay) => Object.values(byDay || {}).flatMap(v => rowsOf(v));
