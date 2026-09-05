// ── "NO, BUT IT SHOULD BE IN A MEMORY" ──────────────────────────────
//
// Oliver, 5 Sep 2026, holding the Bork Vikingemarked draft that could not
// publish. I had asked him one question: should a festival be allowed to
// publish with no date when the entry itself says it runs every summer?
//
//   "No, but it should be in a memory. So basically, when there is a date, and
//    you do a 'date sweep' then it appears. OR we can a section under
//    navigation called 'no confirmed date yet'"
//
// and then, on where that section goes: "Not a new navigation.. but under the
// event navigation."
//
// So the 15 August rule stands exactly as he wrote it — AN EVENT MUST NEVER BE
// PUBLISHED WITHOUT A DATE — and the thing that was wrong was never the rule.
// It was that the gate had one exit. A draft that had been researched, fact
// checked, priced, coordinate checked and tier checked was refused on the one
// field nobody on earth could fill in yet, and the only thing to do with it was
// close the tab. The research died with the draft, and the next time the name
// came up it would be researched again from nothing.
//
// ── WHAT THE MEMORY IS, AND WHAT IT IS NOT ──────────────────────────
//
// It is a row in gemlyx_content with `type: "undated"`. That one word is the
// whole safety model, and it is deliberately not a flag on a festival row.
//
// A flag would have to be honoured by the events grid, the month chips, the
// type chips, DetailPage's "other events", LiveEventsHeaderStrip, the front
// page rows, the chat's UPCOMING EVENTS block, the guide builder and
// tripEvents — nine readers, each of which would have to remember. This
// codebase has already catalogued what happens when one of them forgets: "the
// list can only shrink", "a kind added here and forgotten there is the one way
// this can drift", and the dateless rows that reached the front page in the
// first place got there because isUpcoming reads `!d ||` and counts a missing
// date as upcoming.
//
// A TYPE cannot be forgotten. liveContent.js branches on row.type and every one
// of those nine readers takes its rows from `events` and `majorEvents`. A row
// that is not in those arrays is invisible to all of them by construction, not
// by nine separate acts of remembering. It is visible to exactly one new array
// and exactly one new section, which is the section he asked for.
//
// So: not published as an event, in no events grid, in no month filter, in no
// prompt, in no guide. Published as what it actually is, which is a thing
// Gemlyx knows about and cannot date yet, said out loud under the Events page
// rather than hidden in a drawer.
import { parseEventDate, isPastDate, nextEditionYear, isoDay } from "./eventDates";
import { getEventDate } from "./helpers";

export const WAITING_TYPE = "undated";

const clean = (v) => String(v == null ? "" : v).trim();

// ── THE YEAR IS THE HALF THAT MATTERS HERE ──────────────────────────
//
// getEventDate drops the year when the date falls in the current one, which is
// right on an events card (a reader browsing September does not need to be told
// it is 2026) and wrong on every sentence in this file. "It ran 25 Jul" could be
// six weeks ago or six years ago, and which of those it is decides whether the
// entry is worth waiting for at all.
//
// So the year is put back when the formatter has left it out, rather than a
// second date formatter being written beside the one every other card in the
// app already uses. Both the founder's sentence in Studio and the visitor's
// sentence on the card read it from here, so they cannot drift apart.
export const lastRunWords = (start, end, today = new Date()) => {
  const s = clean(start);
  if (!s || !parseEventDate(s)) return "";
  const span = getEventDate(s, clean(end), today);
  const year = parseEventDate(s).getFullYear();
  return /\d{4}/.test(span) ? span : `${span} ${year}`;
};

// ── DOES THIS THING HAPPEN AGAIN ────────────────────────────────────
//
// The question the whole feature turns on, and the one that stops the memory
// becoming a bin.
//
// A festival with no date and a sentence saying it runs every summer is waiting
// for an announcement. A draft with no date and nothing saying it recurs is
// something else entirely: research that did not land. Putting the second one
// in a waiting room hides a bad draft behind a hopeful label, and it would be
// found months later by the same route everything else in this file was found
// by, which is Oliver reading the live site.
//
// Read from THE ENTRY'S OWN WORDS. Same principle as the map blurb he asked for
// yesterday — "the guide's own words" — and for the same reason: a claim the
// entry makes is a claim somebody has already fact checked, and a claim this
// file infers is a new one nobody has.
const RECURRENCE = [
  // English. `annual` on its own counts: "the annual Viking market" is a claim
  // about recurrence and it is the commonest way an entry makes it.
  { re: /\b(?:annual|annually|yearly)\b/i, period: "annual" },
  { re: /\b(?:every|each)\s+(?:year|summer|winter|spring|autumn|fall|january|february|march|april|may|june|july|august|september|october|november|december)\b/i, period: "annual" },
  { re: /\b(?:returns?|runs?|held|takes?\s+place|happens?)\s+(?:again\s+)?(?:every|each)\s+\w+/i, period: "annual" },
  { re: /\b(?:biennial|biennially|every\s+other\s+year|every\s+second\s+year)\b/i, period: "biennial" },
  // Danish. The entries are written in English but the research quotes Danish
  // pages and the ticket lines carry them through.
  { re: /\bhvert\s+andet\s+år\b/i, period: "biennial" },
  { re: /\bhvert\s+år\b/i, period: "annual" },
  { re: /\bhver\s+(?:sommer|vinter|forår|efterår|juli|august|juni)\b/i, period: "annual" },
  { re: /\bårlig(?:e|t)?\b/i, period: "annual" },
];

// ── AND WHICH PATTERN MATCHED DOES NOT DECIDE HOW OFTEN ─────────────
//
// "Runs every other year in Ribe" is matched by the RUNS EVERY rule above,
// whose captured phrase is "Runs every other" — the word `year` is one
// character past the end of it. Testing the PHRASE for biennial therefore
// called it annual, which is the difference between telling a reader to plan
// for next summer and telling them to plan for the one after.
//
// Tested against the surrounding words instead, which is the same text the card
// quotes back, so what the reader is shown and what the period says come from
// one reading rather than two.
const BIENNIAL = /\b(?:biennial|biennially|other\s+year|second\s+year|andet\s+år)\b/i;

// ── AND A SENTENCE SAYING IT DOES NOT ───────────────────────────────
//
// entryAudit.js has the case written down already: Aalborg shipped "no single
// big annual festival" about the city with the largest carnival in Scandinavia.
// That sentence contains the word `annual` and asserts the opposite of what
// this file is looking for.
//
// A window BEFORE the match rather than a whole-sentence parse, because the
// negation is always in front of the claim in both languages: "no longer held
// annually", "the annual market ended in 2019", "ikke længere årlig". 60
// characters is about a clause, which is as far as a "no" reaches.
//
// ── AND IT RUNS FORWARDS TOO, WHICH THE FIRST VERSION DID NOT ───────
//
// "The annual market ended in 2019" put a dead festival straight into the
// waiting room, because every negation this file knew about sat in front of the
// claim and that one sits behind it. tripBrief.js already had the answer and I
// did not reuse it: withoutRefused runs REFUSED_AFTER backwards and NOT_WANTED
// forwards, for exactly this, and its own note says no word appears in both
// lists.
//
// The forward list is deliberately narrower than the backward one. Backwards, a
// bare "no" is decisive. Forwards, a bare "ended" is not: a parade ends at the
// harbour and a market day ends at four, and neither says the festival stopped
// existing. So forwards only takes the phrases that can only mean the event is
// over, and "ended in 2019" needs its year to qualify.
export const NEGATION_WINDOW = 60;
const NEGATED = /\b(?:no|not|never|nor|none|ended|ceased|stopped|discontinued|cancelled|canceled|final|last|former|formerly|defunct|used\s+to|no\s+longer|ikke|aflyst|ophørt|sidste|tidligere)\b/i;
const ENDED = /\b(?:no\s+longer|ended\s+(?:in|after)\s+\d{4}|last\s+(?:held|ran|took\s+place)|ceased|discontinued|(?:was|has\s+been|is)\s+cancell?ed|ikke\s+længere|oph\u00f8rt|aflyst)\b/i;

// Every field a reader would meet, joined, because a recurrence claim can be in
// the description, in a body paragraph or in the ticket line, and which one it
// landed in is an accident of the drafting pass.
export const prose = (entry) => {
  if (!entry || typeof entry !== "object") return "";
  const parts = [entry.desc, entry.ticketInfo, entry.gemlyxFind, entry.camping, entry.accommodationTip];
  const body = Array.isArray(entry.blogBody) ? entry.blogBody : [];
  for (const b of body) {
    if (!b || typeof b !== "object") continue;
    if (typeof b.content === "string") parts.push(b.content);
    if (Array.isArray(b.items)) parts.push(b.items.filter(x => typeof x === "string").join(" "));
  }
  return parts.filter(x => typeof x === "string" && x).join("  ");
};

export const recurrenceIn = (text) => {
  const s = clean(text);
  if (!s) return null;
  for (const rule of RECURRENCE) {
    // Every occurrence, not the first. "There is no annual festival here, but
    // the herring market runs every July" contains both, and stopping at the
    // first would report the entry as not recurring on the strength of a
    // sentence about something else.
    const re = new RegExp(rule.re.source, rule.re.flags.includes("g") ? rule.re.flags : `${rule.re.flags}g`);
    let m;
    while ((m = re.exec(s)) !== null) {
      const before = s.slice(Math.max(0, m.index - NEGATION_WINDOW), m.index);
      if (NEGATED.test(before)) continue;
      const after = s.slice(m.index + m[0].length, m.index + m[0].length + NEGATION_WINDOW);
      if (ENDED.test(after)) continue;
      const says = s.slice(Math.max(0, m.index - 40), Math.min(s.length, m.index + m[0].length + 60)).trim();
      return { says, period: BIENNIAL.test(says) ? "biennial" : rule.period, phrase: m[0] };
    }
  }
  return null;
};

// ── WHO IS ALLOWED TO WAIT ──────────────────────────────────────────
//
// Two ways in, and both of them are evidence rather than hope.
//
//   STRIPPED  the past-date guard removed a real date, which it does when the
//             run it found has already finished. Bork's case exactly: the entry
//             HAD 25 to 26 July 2026, that edition is over, and an event that
//             ran two months ago is an event that exists.
//
//   SAID      the entry's own prose states it recurs.
//
// Anything else is refused, and the refusal is the useful half: a draft with no
// date, no stripped date and no recurrence claim is not an event waiting for an
// announcement, it is research that came back empty, and the honest thing to do
// with it is drop it rather than file it.
export const CAN_WAIT = "can-wait";
export const HAS_DATE = "has-date";
export const NO_EVIDENCE = "no-evidence";

export const waitingReason = (entry, { stripped = false, past = null, today = new Date() } = {}) => {
  const start = clean(entry?.date || entry?.dateStart);
  if (start && parseEventDate(start)) {
    return { ok: false, code: HAS_DATE, why: "This entry has a readable date, so it publishes as an event." };
  }
  // ── THE STRIP IS THE EVIDENCE, NOT THE RECORD OF IT ───────────────
  //
  // This asked for `stripped && had`, and Oliver's own Bork draft failed it:
  // `_dateWasStripped` true, `_datePast` absent, because the draft was written
  // by a build from before the strip started keeping what it removed.
  //
  // The two are not the same claim. `_dateWasStripped` is only ever set by a
  // strip that found a real date and worked out it had passed, so on its own it
  // already proves the event ran. `_datePast` is our note of WHICH date, and it
  // only changes the sentence. Refusing on a missing note is refusing an event
  // for a gap in our bookkeeping, which is the shape of every gate in this file
  // that had to be widened later.
  const had = clean(past?.dateStart);
  if (stripped) {
    return {
      ok: true, code: CAN_WAIT, from: "stripped",
      why: had
        ? `It ran ${lastRunWords(had, clean(past?.dateEnd), today)}, and the past-date check removed those dates because that edition has finished. An event that ran is an event that exists.`
        : `A date was found for it and the past-date check removed it, which it does when that edition has finished. The dates themselves were not kept, so the card will say only that the next ones are not announced. An event that ran is an event that exists.`,
    };
  }
  const rec = recurrenceIn(prose(entry));
  if (rec) {
    return {
      ok: true, code: CAN_WAIT, from: "said", recurrence: rec,
      why: `The entry says so itself: "${rec.says}".`,
    };
  }
  return {
    ok: false, code: NO_EVIDENCE,
    why: "Nothing in this draft says the event happens again. There is no date, no date was removed, and the entry never claims it recurs, so there is no next edition to wait for. That is a draft the research did not land, not an event without an announcement.",
  };
};

// ── WHAT IS STORED ──────────────────────────────────────────────────
//
// The whole shaped entry, unchanged, plus one bookkeeping key. Unchanged
// matters: the research, the prose, the coordinate, the tier and the photo are
// the reason this exists at all, and the day a date arrives the row has to be
// publishable without anybody rewriting a word.
//
// `date` and `dateEnd` are written as empty strings rather than left off. A key
// that is absent and a key that is empty read the same to every consumer here,
// but only one of them survives a JSON round trip into a shape somebody later
// spreads into a festival — and the failure mode of the missing one is a
// festival row with no date field at all, which is the exact shape the 15
// August gate cannot see.
//
// `__` prefix, like `__scale` and `__lat`: readerFields strips it out of
// anything sent to a model, and cleanReaderProse skips it on the way in.
export const waitingPayload = (entry, { past = null, recurrence = null, at = new Date() } = {}) => {
  const lastStart = clean(past?.dateStart);
  const lastEnd = clean(past?.dateEnd);
  const rec = recurrence || recurrenceIn(prose(entry));
  return {
    ...entry,
    date: "",
    dateEnd: "",
    __waiting: {
      since: isoDay(at) || "",
      lastStart,
      lastEnd,
      recurrence: rec ? { says: rec.says, period: rec.period } : null,
      // The year a reader is actually waiting for, worked out once, at the
      // moment it goes in, from the edition that finished. nextEditionYear is
      // the same function the gate's own message uses, so the sentence he reads
      // in Studio and the sentence a visitor reads on the site cannot disagree.
      expectYear: lastStart ? nextEditionYear(lastStart, at) : null,
      checked: [],
    },
  };
};

export const isWaiting = (row) => !!(row && typeof row === "object" && row.__waiting && typeof row.__waiting === "object");

// ── WHAT THE READER IS TOLD ─────────────────────────────────────────
//
// The card cannot say a date and must not imply one. What it CAN say is the two
// true things: when it last ran, and that the next dates are not out. Both are
// useful to somebody planning next summer in a way that silence is not, and
// "we know about this and it has not been announced" is a different message
// from "we have never heard of it".
//
// It never names a month it was not given. A festival that ran in July will
// almost certainly run in July again and this file does not say so, because
// almost certainly is how a guess gets printed beside a flight booking.
export const waitingLine = (row, today = new Date()) => {
  const w = row?.__waiting;
  if (!w) return "";
  const span = lastRunWords(w.lastStart, w.lastEnd, today);
  const ran = span ? `Last ran ${span}.` : "";
  const period = w.recurrence?.period;
  const runs = period === "biennial" ? "It runs every other year."
    : period === "annual" ? "It runs every year."
    : "";
  const year = w.expectYear && Number(w.expectYear) >= today.getFullYear() ? Number(w.expectYear) : null;
  const wait = year
    ? `The ${year} dates are not announced yet.`
    : "The next dates are not announced yet.";
  return [ran, runs, wait].filter(Boolean).join(" ");
};

// ── AND HOW LONG IT HAS BEEN SITTING THERE ──────────────────────────
//
// For Studio, not for the reader. A row that has been waiting through eleven
// date sweeps is telling you something about itself: either nobody is
// announcing it, or the sweep is looking at the wrong page. Both are worth
// seeing, and neither is visible from a list that only shows names.
export const waitingDays = (row, today = new Date()) => {
  const since = parseEventDate(row?.__waiting?.since);
  if (!since || !today) return null;
  return Math.max(0, Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - since) / 86400000));
};

// ── THE ONE THAT PUTS IT ON THE SITE ────────────────────────────────
//
// "when there is a date, and you do a 'date sweep' then it appears."
//
// Its own gate, and not because the sweep's gate is weak. The sweep refuses a
// past date, a backwards date and an unlabelled date on a programme page, and
// all three refusals are good. This is a SECOND DOOR into the events grid, and
// this codebase's most repeated finding is that a rule enforced on one path is
// not enforced: the coordinate check "has carried coordinate checks since 6 Aug
// and gated NOTHING", the tier default was removed on the strength of a block
// that was never built, and the date gate itself named a key it did not read.
//
// So promotion asks the question again, in this file, about the value actually
// being written: can it be read as a date, and is it still ahead. A festival
// that arrives here with last year's date would otherwise become a published
// event that every grid hides, which is the invisible-row bug the memory exists
// to end rather than to reproduce.
export const promoted = (row, { start = "", end = "", source = "", today = new Date() } = {}) => {
  if (!isWaiting(row)) return { ok: false, why: "This row is not a waiting entry, so there is nothing to promote." };
  const s = clean(start);
  if (!s) return { ok: false, why: "No date was given, and a date is the only thing this row is missing." };
  if (!parseEventDate(s)) return { ok: false, why: `"${s}" cannot be read as a date, so publishing it would put an unreadable date on a public card.` };
  const e = clean(end);
  if (e && !parseEventDate(e)) return { ok: false, why: `The end date "${e}" cannot be read as a date.` };
  if (e && parseEventDate(e) < parseEventDate(s)) return { ok: false, why: "The end date is before the start date." };
  // The END of the run decides whether it is over, exactly as eventDateIssues
  // reads it: a festival that opened yesterday and runs all week has not
  // finished, and it is the single week it is most worth publishing.
  const last = e || s;
  if (isPastDate(last, today)) {
    return { ok: false, why: `${lastRunWords(s, e, today)} has already finished, so this would publish an event no grid can show. That is the state this entry is waiting to leave, not the one to put it back into.` };
  }
  // `id` goes with it. Every row in these arrays carries the SYNTHETIC id
  // liveContent stamps on at load time (LIVE_ID_OFFSET + the real row id), and
  // no stored payload has ever had an id field. Promoting straight from the
  // in-memory row would write 100047 into the payload of row 47, where it would
  // sit forever looking like a real identifier to whoever read it next.
  const { __waiting, id, ...rest } = row;
  return {
    ok: true,
    payload: {
      ...rest,
      date: s,
      dateEnd: e,
      // Kept, not discarded. The row is about to stop being a waiting entry and
      // the only record of how long it waited and what settled it would go with
      // it. `__waited` is what an audit reads six months from now when somebody
      // asks where this date came from.
      __waited: {
        ...__waiting,
        settled: isoDay(today) || "",
        settledFrom: clean(source),
        waited: waitingDays(row, today),
      },
    },
  };
};

// ── THE ORDER THEY ARE SHOWN IN ─────────────────────────────────────
//
// By the month the last edition ran, from the current month forward, so a
// reader in September meets the ones whose season is coming rather than the
// ones that just finished. Rows with no last edition sort last, because there
// is nothing to place them by and putting them first would be an invention.
export const waitingOrder = (rows, today = new Date()) => {
  const m0 = today instanceof Date && !isNaN(today) ? today.getMonth() : 0;
  const key = (r) => {
    const d = parseEventDate(r?.__waiting?.lastStart);
    if (!d) return 99;
    return (d.getMonth() - m0 + 12) % 12;
  };
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const ka = key(a), kb = key(b);
    if (ka !== kb) return ka - kb;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
};
