// ── THE SOCIAL SWEEP ────────────────────────────────────────────────
//
// Oliver, 14 Sep 2026: "I want you to get a sweep done for everything.. a
// search for every attraction and event's own social media. This will be
// useful for later redrafts, when things need to get updated."
//
// socialAccounts.js decides what an account IS. api/social-find.js does the
// fetching. This file decides WHICH ROWS ARE WORTH ASKING ABOUT, in what order,
// and what the panel says before anything is spent. Nothing here touches the
// network, so every rule below can be asserted in the suite.
//
// ── sweeps.js's five rules, and rule two is the design ──────────────
//
//   1. Nothing writes until the whole proposal has been seen.
//   2. The cheapest resolver that can answer, answers.
//   3. A field that cannot be answered stays empty, and says so.
//   4. Every value carries its own provenance.
//   5. A sweep may only write a field shapeForLive already carries.
//
// Rule two is the whole arrangement here, because the two tiers do not cost the
// same thing. Reading a row's own website is free and the answer it gives is
// the strongest available: a business links its own accounts in its own footer,
// so what is found there is theirs by construction. A search is money and gives
// back a candidate. So the free list runs over everything it can, and the paid
// list is as short as this file can honestly make it before he presses
// anything, and the panel says how many requests that is.
//
// Rule five: `__social` and `__socialSweep` were added to shapeForLive in the
// same commit as this file. The allow-list has eaten eight fields and the
// comment above it asks for exactly that.
//
// ── AND WHY BOTH STAMPS EXPIRE ──────────────────────────────────────
//
// "This place has no Facebook page" is a fact about today. So is "its Facebook
// page is /ribevikingecenter". A venue opens an Instagram in March, a festival
// rebrands, an account is handed to a new agency and the handle changes. A
// stamp that never expired would make this sweep answer from 2026 forever,
// which is the same failure the entry price and ticket stamps were given dates
// to avoid: a record with no date on it quietly becomes a lie.
import { parseEventDate, isPastDate } from "./eventDates";

export const HAVE = "have";           // a record, still fresh. Nothing to ask.
export const ASK_PAGE = "ask-page";   // free: read the row's own website
export const ASK_SEARCH = "ask-search"; // paid: no site to read, or it linked nothing
export const ASKED = "asked";         // looked recently and found nothing
export const CANNOT = "cannot";       // no name to ask about

// A stored account is re-checked once a year. Accounts move rarely, and the
// cost of a stale one is a later check reading the wrong feed, which is caught
// by the person reading the flag rather than silently published.
export const ACCOUNT_FRESH_DAYS = 365;
// A no expires faster than a yes, on the same 120 day window the rest of the
// provenance in this app uses. A festival with no page in September has one in
// January, the week it starts selling tickets.
export const NOTHING_FOUND_DAYS = 120;

// Two requests per searched row, one Facebook page search and one Instagram
// user search, plus at most one page-details call to settle a named candidate
// against a website we hold. API Direct is priced per request, 0.002 to 0.01
// dollars depending on the endpoint, so the worst case is about two cents a
// row and the panel says so in requests rather than in a guess at a bill.
export const REQUESTS_PER_SEARCH = 2;
export const MAX_CENTS_PER_SEARCH = 3;

const dayOf = (v) => {
  const s = String(v || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};

const daysBetween = (from, today) => {
  const a = new Date(`${from}T00:00:00`);
  if (Number.isNaN(a.getTime())) return null;
  const b = today instanceof Date && !Number.isNaN(today.getTime()) ? today : new Date();
  return Math.floor((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
};

// ── WHAT A ROW ALREADY KNOWS ────────────────────────────────────────
export const socialOf = (payload) => {
  const rec = payload?.__social;
  return rec && Array.isArray(rec.accounts) && rec.accounts.length ? rec : null;
};

export const socialAge = (payload, today = new Date()) => {
  const rec = socialOf(payload);
  const at = dayOf(rec?.at);
  return at ? daysBetween(at, today) : null;
};

// The row's own website, and the two spellings of "where is this". Food and
// night entries carry `location` rather than `town`, which is why asking for
// one key would quietly search half the library with no town at all.
export const askFor = (row) => {
  const p = row?.payload || {};
  return {
    id: row?.id,
    type: row?.type || "",
    name: String(p.name || "").trim(),
    town: String(p.town || p.city || p.location || "").trim().split(",")[0].trim(),
    website: String(p.website || "").trim(),
  };
};

// ── AND WHICH TIER IT BELONGS IN ────────────────────────────────────
//
// Order matters and is the cheap question first, every time: a row that already
// has an answer is never asked, a row with a site to read is free, and only
// what is left after both is money.
export const socialVerdict = (row, today = new Date()) => {
  const p = row?.payload || {};
  const q = askFor(row);
  if (!q.name) return { verdict: CANNOT, why: "This row has no name, so there is nothing to search for." };

  const age = socialAge(p, today);
  if (age !== null && age <= ACCOUNT_FRESH_DAYS) {
    const rec = socialOf(p);
    return {
      verdict: HAVE,
      why: `Already holds ${rec.accounts.map(a => a.platform).join(" and ")}, found ${rec.at}.`,
    };
  }

  const stamp = dayOf(p.__socialSweep?.at);
  const since = stamp ? daysBetween(stamp, today) : null;
  if (stamp && p.__socialSweep?.found === false && since !== null && since <= NOTHING_FOUND_DAYS) {
    return {
      verdict: ASKED,
      why: `Looked on ${stamp} and found nothing. It goes back in the queue ${NOTHING_FOUND_DAYS} days after that, because a place with no page in one month has one in another.`,
    };
  }

  if (q.website) {
    return { verdict: ASK_PAGE, why: `Its own site is on file, so its footer is read first. That costs nothing and the answer it gives is theirs by construction.` };
  }
  return {
    verdict: ASK_SEARCH,
    why: "No website on this row, so nothing else in the pipeline can reach it. This is the only tier that can.",
  };
};

// ── THE ORDER THE PAID LIST RUNS IN ─────────────────────────────────
//
// A run can be stopped half way, so the order decides which rows got the money.
// An event still ahead is the row whose facts move, and it is the one the chat
// plans around this month. A finished or undated one is worth asking about and
// is worth asking about second.
const upcomingFirst = (today) => (a, b) => {
  const rank = (x) => {
    const d = String(x?.payload?.dateEnd || x?.payload?.date || "").trim();
    if (!d || !parseEventDate(d)) return 1;
    return isPastDate(d, today) ? 2 : 0;
  };
  return rank(a) - rank(b);
};

export const socialPlan = (rows, today = new Date()) => {
  const all = (Array.isArray(rows) ? rows : []).slice().sort(upcomingFirst(today));
  const list = all.map(r => {
    const v = socialVerdict(r, today);
    return { ...askFor(r), ...v, record: socialOf(r?.payload) };
  });
  return {
    list,
    free: list.filter(p => p.verdict === ASK_PAGE),
    paid: list.filter(p => p.verdict === ASK_SEARCH),
    have: list.filter(p => p.verdict === HAVE),
    skipped: list.filter(p => p.verdict === ASKED || p.verdict === CANNOT),
  };
};

// ── WHAT THE PANEL SAYS BEFORE A PENNY IS SPENT ─────────────────────
//
// In requests, not in a guess at a bill, and the free half named separately
// from the paid one, because the whole point of the arrangement above is that
// most of the library costs nothing and he should be able to see that.
export const describeSocialPlan = (plan) => {
  const n = (c, w) => `${c} ${c === 1 ? w : `${w}s`}`;
  const free = plan?.free?.length || 0;
  const paid = plan?.paid?.length || 0;
  const have = plan?.have?.length || 0;
  const skipped = plan?.skipped?.length || 0;
  if (!free && !paid) {
    return have
      ? `Every row that can be asked already holds an account. ${n(have, "row")} on file, nothing to run.`
      : "Nothing here can be asked about. Every row is either stamped from a recent look or has no name.";
  }
  const parts = [];
  if (free) parts.push(`${n(free, "row")} can be read off its own website, which is free and is the better answer`);
  if (paid) parts.push(`${n(paid, "row")} ${paid === 1 ? "has" : "have"} no website at all, so ${paid === 1 ? "it needs" : "they need"} a search: ${n(paid * REQUESTS_PER_SEARCH, "request")}, under ${((paid * MAX_CENTS_PER_SEARCH) / 100).toFixed(2)} dollars at the worst price on their list`);
  if (have) parts.push(`${n(have, "row")} already holds one`);
  if (skipped) parts.push(`${n(skipped, "row")} is left alone, listed below with the reason`);
  return `${parts.join(". ")}.`;
};

// ── AND WHAT GETS WRITTEN ───────────────────────────────────────────
//
// Payload keys only, and only the ones that changed, because patchRowPayload
// re-reads and merges: gemlyx_content has no versioning and writing back a
// snapshot taken before a minutes-long run is how one sweep silently undoes
// another.
//
// A row that found nothing is written too, with the stamp and nothing else.
// That stamp is what stops the next run paying for the same no, and leaving it
// off would make this sweep expensive forever. It is the same call the
// affiliate sweep makes and for the same reason.
// ── AND A FAILURE IS NOT A NO ───────────────────────────────────────
//
// The lesson the affiliate sweep wrote down after a quota ran out half way
// through a run: a call that failed looks exactly like "this place has no
// page", and stamping it as one hides the row for four months. A row from the
// free pass that has not been searched yet is the same shape: it has no answer
// because nobody asked the second question, not because the answer is no.
//
// So neither is written at all. A stamp is a record that somebody looked.
export const canWrite = (found) => !!found && !found.error && !found.needsSearch;

export const socialWriteFor = (found) => {
  if (!canWrite(found)) return null;
  const at = dayOf(found?.record?.at) || dayOf(found?.at) || "";
  if (found?.record) {
    return { id: found.id, set: { __social: found.record, __socialSweep: { at: at || found.record.at, found: true } } };
  }
  return { id: found?.id, set: { __socialSweep: { at, found: false } } };
};

// A found record is pre-ticked ONLY when it came off the place's own page.
// That one needs no opinion. A search result is a candidate, and the endpoint
// says so in its own reply: "A search found these. Open each one before you
// keep it." Pre-ticking those would turn a review into a rubber stamp.
export const preTicked = (list) =>
  (Array.isArray(list) ? list : []).filter(f => f?.record?.how === "own-page").map(f => f.id);

// One line per finished row, for the table. The reason the record carries is
// shown rather than summarised, for sweeps.js's fourth rule: a green tick over
// a row is a lie at exactly the moment somebody is deciding whether to take it.
export const HOW_WORDS = {
  "own-page": "linked from its own website, so it is theirs",
  linked: "this account's own page points back at the website we hold",
  named: "the handle carries the name, which is worth a look and nothing more",
};

export const describeFinding = (found) => {
  if (!found?.record) return "Nothing found.";
  const how = HOW_WORDS[found.record.how] || found.record.how;
  const list = found.record.accounts.map(a => `${a.platform}/${a.handle}`).join(", ");
  return `${list} (${how})`;
};
