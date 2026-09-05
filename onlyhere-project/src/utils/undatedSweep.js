// ── THE FOURTEEN ENTRIES NOBODY CAN SEE ─────────────────────────────
//
// Read off gemlyx_content on 5 Sep 2026: 52 event rows, 28 upcoming, 10 with no
// date, and 14 whose dates have finished. Those 14 are not broken. They are
// correct, fully researched entries that no visitor will ever meet, and
// eventDates.js has said so in those words since 15 August:
//
//   "This edition has already finished. The entry is correct and INVISIBLE:
//    every events grid shows upcoming events only, so no visitor will ever see
//    it. If this is an annual festival, the entry wants the ${year} dates."
//
// Oliver has been told that one row at a time, in a founder note, for three
// weeks. Nothing has ever offered to do anything about it.
//
// ── WHAT THIS PROPOSES, AND WHAT IT REFUSES TO ──────────────────────
//
// A festival with no usable future date belongs in the memory, under "No
// confirmed date yet", where a reader can at least learn it exists and the date
// sweep keeps looking for its next edition. That is the whole loop: finished →
// memory → the sweep finds a date → published again.
//
// The one thing that decides whether a row may go is whether the event HAPPENS
// AGAIN, and the only honest source for that is the entry's own prose.
// recurrenceIn reads it. A row that never claims to recur is left exactly where
// it is and reported, because telling a reader "the next dates are not
// announced yet" about a one-off is a promise nobody made.
//
// ── AND IT IS FREE ──────────────────────────────────────────────────
//
// No model calls, no searches, no Firecrawl. Every question here is answered by
// reading the row: has this date passed, does this text claim it recurs, what
// year would the next edition fall in. sweeps.js's second rule, "the cheapest
// resolver that can answer, answers", and this is the cheapest there is.
import { isPastDate, parseEventDate } from "./eventDates";
import { recurrenceIn, prose, waitingPayload, waitingLine, WAITING_TYPE } from "./undatedEvents";

export const MOVE = "move";
export const LEAVE = "leave";

// ── WHICH ROWS ARE EVEN ASKED ABOUT ─────────────────────────────────
//
// A festival whose last day has gone, or that never had a readable date at all.
// Nothing else: a row with a future date is doing its job, and a row already in
// the memory is already where this would put it.
//
// The END decides, not the start. A festival that opened yesterday and runs all
// week has not finished, and it is the single week it is most worth showing.
// Same reading eventDateIssues uses.
export const isFinished = (payload, today) => {
  const start = String(payload?.date ?? "").trim();
  if (!start) return true;                       // never had one
  if (!parseEventDate(start)) return true;       // has one nobody can read
  const end = String(payload?.dateEnd ?? "").trim();
  return isPastDate(parseEventDate(end) ? end : start, today);
};

export const candidates = (rows, today = new Date()) =>
  (Array.isArray(rows) ? rows : []).filter(r => r?.type === "festival" && isFinished(r?.payload, today));

// ── ONE PROPOSAL, WITH ITS REASON ATTACHED ──────────────────────────
//
// `says` is the sentence out of the entry that justifies the move, quoted back
// rather than summarised, because sweeps.js's fourth rule is that every value
// carries its own provenance and a green tick over a row is a lie at exactly
// the moment somebody is deciding whether to accept it.
//
// `line` is what the card would actually read afterwards. Showing the outcome
// rather than describing it is the same call the trip-change notice made: what
// you review is what you publish.
export const proposeWaiting = (row, today = new Date()) => {
  const payload = row?.payload || {};
  const name = String(payload.name || "").trim();
  const had = String(payload.date || "").trim();
  const hadEnd = String(payload.dateEnd || "").trim();
  const rec = recurrenceIn(prose(payload));
  if (!rec) {
    return {
      id: row?.id, name, verdict: LEAVE, had, hadEnd,
      why: had
        ? `Nothing in this entry says it happens again, so it is left alone. It ran ${had}${hadEnd && hadEnd !== had ? ` to ${hadEnd}` : ""} and reads as a one-off. If it is annual, say so in the entry and run this again.`
        : "Nothing in this entry says it happens again, and it has no date to have finished. That is a draft the research did not land rather than an event waiting for an announcement.",
    };
  }
  // The dates go WITH it. This is the whole reason a finished row is a better
  // candidate than a dateless one: it knows when it last ran, so the card can
  // say so instead of only that the next date is unknown.
  const next = waitingPayload(payload, {
    past: had ? { dateStart: had, dateEnd: hadEnd } : null,
    recurrence: rec,
    at: today,
  });
  return {
    id: row?.id, name, verdict: MOVE, had, hadEnd,
    says: rec.says,
    period: rec.period,
    payload: next,
    line: waitingLine(next, today),
    why: `The entry says so itself: "${rec.says}".`,
  };
};

export const proposals = (rows, today = new Date()) =>
  candidates(rows, today).map(r => proposeWaiting(r, today));

// ── WHAT THE PANEL SAYS BEFORE ANYTHING IS WRITTEN ──────────────────
//
// The count of each, in one sentence, so the size of the change is legible
// before the table is read rather than after.
export const describeProposals = (list, today = new Date()) => {
  const all = Array.isArray(list) ? list : [];
  const move = all.filter(p => p?.verdict === MOVE);
  const leave = all.filter(p => p?.verdict === LEAVE);
  if (!all.length) return "No finished or undated festivals. Every event on the site has a date that is still ahead.";
  const one = (n, w) => `${n} ${n === 1 ? w : `${w}s`}`;
  const parts = [`${one(all.length, "festival")} on the site cannot be seen by a reader`];
  parts.push(move.length
    ? `${move.length} of them say in their own words that they happen again, so they can wait under "No confirmed date yet"`
    : `none of them says in its own words that it happens again`);
  if (leave.length) parts.push(`${one(leave.length, "row")} stays where it is, listed below with the reason`);
  return `${parts.join(". ")}.`;
};

// The write, as data rather than as a fetch, so the shape can be asserted
// without a network. The caller does the request.
export const writeFor = (p) => ({ id: p?.id, type: WAITING_TYPE, payload: p?.payload });
