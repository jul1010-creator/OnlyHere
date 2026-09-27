// ── APPLY WHAT THE DATE CHECK FOUND, FROM THE CHECK ITSELF ──────────
//
// Oliver, 27 Sep 2026, scrolling a long "Update current events" run: "I don't
// want to go in and individually change every draft", then "make me able to
// directly change the drafts from there", and "Of course, keep the link. So I
// can see where it got the source from."
//
// Every row the check proposed ended with "This only flags it, update the
// real entry in your events data file by hand once you've verified." That was
// written when events lived in a file in the code. They have lived in the
// database for weeks, so the sentence sent him to edit, one entry at a time,
// something one button can write.
//
// So a row the check can stand behind carries the exact fields it would
// write, and the panel offers it per row and all at once. The link it was
// read off stays on the row in the panel, and is also written onto the entry
// as `__checked`, so the source survives after the panel is closed.
//
// WHAT IS NEVER WRITTEN FROM HERE:
//   - "may no longer be happening": that is a judgement about a cancellation,
//     and unpublishing is his call, not a button's.
//   - an entry that lives in the code rather than the database: there is no
//     row to write to.
//   - a waiting entry: it has its own button (publish it now), with its own
//     gate, and two doors for one write is how rules drift apart.
//   - a date that has already passed, or ends before it starts: the check
//     refuses those upstream too, and this refuses them again because it is
//     a second door into the same field.
import { LIVE_ID_OFFSET } from "./liveContent";
import { parseEventDate, isPastDate } from "./eventDates";
import { normaliseTicketStatus } from "./tickets";
import { dayKey } from "./calendarDay";

export const liveRowIdOf = (ev) => {
  const id = Number(ev?.id);
  return Number.isFinite(id) && id > LIVE_ID_OFFSET ? id - LIVE_ID_OFFSET : null;
};

// A row that only says what was IGNORED has nothing to apply. Those are
// listed apart, because forty of them between the real changes is the wall of
// text he scrolled through.
export const onlyRefusals = (c) => !!c && !c.dateChanged && !c.ticketStatusChanged && c.stillHappening !== false;

// { set, why }: the fields to merge into the entry, or null and the reason.
export const changeToApply = (c, today = new Date()) => {
  if (!c) return { set: null, why: "Nothing to apply." };
  if (c.waitingRow) return { set: null, why: "" };
  if (c.stillHappening === false && !c.dateChanged) {
    return { set: null, why: "It may be cancelled. Check the link, and unpublish it in Manage Published if it is." };
  }
  const rowId = liveRowIdOf(c.row);
  if (!rowId) return { set: null, why: "This event is written into the app's code, not the database, so it cannot be changed from here." };
  const set = {};
  if (c.dateChanged) {
    const start = parseEventDate(c.dateChanged);
    const end = c.dateEndChanged ? parseEventDate(c.dateEndChanged) : null;
    if (!start) return { set: null, why: `"${c.dateChanged}" cannot be read as a date.` };
    if (c.dateEndChanged && !end) return { set: null, why: `The end date "${c.dateEndChanged}" cannot be read as a date.` };
    if (end && end < start) return { set: null, why: "The end date is before the start date." };
    if (isPastDate(c.dateEndChanged || c.dateChanged, today)) return { set: null, why: "That date has already passed." };
    set.date = c.dateChanged;
    // The end goes with the start, empty when none was found. Keeping last
    // year's end beside this year's start would put the end before the start.
    set.dateEnd = c.dateEndChanged || "";
  }
  if (c.ticketStatusChanged) {
    const status = normaliseTicketStatus(c.ticketStatusChanged);
    if (status) set.ticketStatus = status;
  }
  if (!Object.keys(set).length) return { set: null, why: "Nothing to apply." };
  const from = (Array.isArray(c.evidence) ? c.evidence : []).filter(Boolean);
  set.__checked = { at: dayKey(today), from, note: String(c.notes || "").slice(0, 300) };
  return { set, why: "", rowId };
};
