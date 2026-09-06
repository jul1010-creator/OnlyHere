// ── THE AFFILIATE SWEEP ─────────────────────────────────────────────
//
// Oliver, 6 Sep 2026: "We're now missing alot of affiliates on things that
// could have had.. Basically we need an 'affiliate' sweep. So it will scan
// through published blogs and our affiliate pages to see links between."
//
// He is right and the reason is dated. A row gets a ticket link from one of two
// places:
//
//   __ticket.url   stamped by the Ticketmaster API match, since 13 August
//   ticketUrl      written by the research pipeline
//
// The first is Ticketmaster and nothing else, which is why Ticketmaster is the
// only programme he can see working. The second is where Tiqets lives, and the
// step that ASKS Tiqets (App.jsx, "Ask tiqets.com directly") was added on 3
// September. Every row published before that date has never had the question
// put to it, and nothing re-asks a published row.
//
// So Tivoli is on Tiqets and has no link. Legoland is on Tiqets and has no
// link. Neither is a gate failure: both were run through pickTicketUrl by hand
// and both are accepted. Nobody ever ran the search.
//
// ── WHAT THIS IS, AND WHAT IT REFUSES TO BE ─────────────────────────
//
// sweeps.js's four rules, unchanged, because gemlyx_content still has no
// versioning, no audit log and no soft delete:
//
//   1. Nothing writes until the whole proposal has been seen.
//   2. The cheapest resolver that can answer, answers.
//   3. A field that cannot be answered stays empty, and says so.
//   4. Every value carries its own provenance.
//
// And the fifth, which is the one that makes a sweep safe to write at all:
// A SWEEP MAY ONLY WRITE A FIELD THAT shapeForLive ALREADY CARRIES. This one
// writes `ticketUrl`, which it has carried since 15 August, and `__ticketSweep`,
// which is added to the allow-list in the same commit as this file.
//
// ── RULE 2 IS THE WHOLE DESIGN HERE, BECAUSE THIS ONE COSTS MONEY ───
//
// Every other sweep in this codebase is free or nearly so. This one spends two
// Tavily searches per row, so the classification below is arranged to make the
// paid list as short as it can honestly be BEFORE anything is spent:
//
//   already earning      nothing to find
//   bookable, unwrapped  a search cannot fix a missing template
//   a refused link       already in the panel's "one edit away" queue
//   no door              a restaurant does not sell admission. No agent lists it
//   asked recently       and the answer was no. Asking again this month buys
//                        the same no at the same price
//
// What is left is the list worth paying for, and the panel says how many
// searches that is before he presses anything.
//
// ── AND WHY THE STAMP EXPIRES ───────────────────────────────────────
//
// "No ticket page exists" is a fact about today, not about the place. A
// festival with no 2026 listing has a 2027 one the moment it goes on sale, and
// a stamp that never expires would make this sweep answer no forever, cheaply
// and wrongly. RESWEEP_DAYS puts the row back in the paid list on its own.
import { ticketQueries, pickTicketUrl, describeTicketSearch, isBookableTicketUrl, ticketAgentOf } from "./ticketLink";
import { ticketDestination } from "./affiliateAudit";
import { TYPES_WITH_A_DOOR } from "./entryPrice";
import { parentTownOf } from "./previewMatch";

const clean = (v) => String(v == null ? "" : v).trim();

// ── ONE NAME PER STATE, SO NOTHING COLLIDES ─────────────────────────
// One exported object rather than six exported constants: undatedSweep.js
// already owns MOVE and LEAVE, and the test bundle re-exports every module by
// name into one namespace, so a second bare MOVE would silently shadow the
// first. Same reason daysBetween is module-private in dateClaims.js.
export const SWEEP_STATE = {
  earning: "earning",
  unwrapped: "unwrapped",
  refused: "refused",
  noDoor: "no-door",
  asked: "asked",
  searchable: "searchable",
};

// Ninety days, which is a season. Long enough that a re-run next week costs
// nothing, short enough that next spring's listings are found.
export const RESWEEP_DAYS = 90;

const DAY = 86400000;

// ── WHEN THIS LAST ASKED, AND WHAT IT WAS TOLD ──────────────────────
// Rule 4. The stamp carries the date and the outcome, so a row that says "no
// ticket page" can be told apart from a row nobody has asked, which is the
// difference between a finished sweep and an unstarted one.
export const sweptAt = (payload) => clean(payload?.__ticketSweep?.at);

export const askedRecently = (payload, today = new Date(), days = RESWEEP_DAYS) => {
  const at = sweptAt(payload);
  if (!at) return false;
  const then = new Date(at);
  if (Number.isNaN(then.getTime())) return false;   // an unreadable stamp is not an answer
  const now = today instanceof Date ? today : new Date(today);
  if (Number.isNaN(now.getTime())) return false;
  return (now.getTime() - then.getTime()) < days * DAY;
};

// ── WHICH ROWS COULD EVER CARRY A TICKET LINK ───────────────────────
// TYPES_WITH_A_DOOR, imported rather than restated. journeyScope.js learned
// this the expensive way: "it was already a hand-written list copied from
// CONTENT_TYPES", and the copy is what drifted.
//
// `undated` is deliberately absent even though it is a festival underneath. An
// event with no confirmed edition has nothing on sale, so a ticket page found
// for it is last year's, and last year's ticket page is the one failure this
// whole file exists to avoid. It comes back the moment the date sweep promotes
// it to a festival again.
export const hasADoor = (row) => TYPES_WITH_A_DOOR.includes(clean(row?.type));

// ── ONE ROW, CLASSIFIED, FOR FREE ───────────────────────────────────
// isBookable and wrap are injected for the reason affiliateAudit gives: a
// second copy of the judgement drifts the first time either is touched.
export const rowState = (row, { today = new Date(), isBookable = isBookableTicketUrl, wrap } = {}) => {
  const payload = row?.payload || {};
  const name = clean(payload.name) || "(unnamed)";
  const base = { id: row?.id, name, type: clean(row?.type) };

  if (!hasADoor(row)) {
    return { ...base, state: SWEEP_STATE.noDoor, why: "this type has no single admission price, so no agent sells a ticket to it" };
  }

  const dest = ticketDestination(row);
  if (dest) {
    let bookable = false;
    try { bookable = !!isBookable(dest); } catch { bookable = false; }
    if (!bookable) {
      return { ...base, state: SWEEP_STATE.refused, url: dest, why: "already carries a link the gate refused, which is the panel's own work queue rather than a search" };
    }
    let wrapped = "";
    try { wrapped = typeof wrap === "function" ? clean(wrap(dest)) : ""; } catch { wrapped = ""; }
    if (wrapped && wrapped !== dest) {
      return { ...base, state: SWEEP_STATE.earning, url: dest, agent: ticketAgentOf(dest), why: "already earning" };
    }
    return { ...base, state: SWEEP_STATE.unwrapped, url: dest, agent: ticketAgentOf(dest), why: "a real product page with no template configured for that agent. A search cannot fix a missing template" };
  }

  if (askedRecently(payload, today)) {
    const found = payload?.__ticketSweep?.found;
    return {
      ...base, state: SWEEP_STATE.asked, at: sweptAt(payload),
      why: found === false
        ? `asked on ${sweptAt(payload)} and no agent listed it. It comes back into the paid list ${RESWEEP_DAYS} days after that`
        : `asked on ${sweptAt(payload)}`,
    };
  }

  return { ...base, state: SWEEP_STATE.searchable, town: parentTownOf(payload), why: "no ticket link, and nothing has ever asked an agent about it" };
};

export const rowStates = (rows, opts) => (Array.isArray(rows) ? rows : []).map(r => rowState(r, opts));

// ── THE PLAN, PRICED, BEFORE ANYTHING IS SPENT ──────────────────────
// Two queries per row, and the loop stops at the first that yields, so the real
// cost is between one and two per row. Both numbers are given rather than an
// average: he is deciding whether to press a button, and the number that
// matters to that decision is the worst case.
export const sweepPlan = (rows, opts = {}) => {
  const states = rowStates(rows, opts);
  const by = (s) => states.filter(x => x.state === s);
  const searchable = by(SWEEP_STATE.searchable);
  return {
    states,
    searchable,
    counts: {
      total: states.length,
      earning: by(SWEEP_STATE.earning).length,
      unwrapped: by(SWEEP_STATE.unwrapped).length,
      refused: by(SWEEP_STATE.refused).length,
      noDoor: by(SWEEP_STATE.noDoor).length,
      asked: by(SWEEP_STATE.asked).length,
      searchable: searchable.length,
    },
    searches: { min: searchable.length, max: searchable.length * 2 },
  };
};

export const describeSweepPlan = (plan) => {
  const c = plan?.counts;
  if (!c || !c.total) return "Nothing published yet, so there is nothing to ask an agent about.";
  if (!c.searchable) {
    const asked = c.asked ? ` ${c.asked} ${c.asked === 1 ? "was" : "were"} asked within the last ${RESWEEP_DAYS} days and told no, and ${c.asked === 1 ? "it comes" : "they come"} back on ${c.asked === 1 ? "its" : "their"} own after that.` : "";
    return `Every row that could carry a ticket link either has one or has been asked about recently.${asked} ${c.earning} of ${c.total} are earning.`;
  }
  const withADoor = c.total - c.noDoor;
  return `${c.searchable} of the ${withADoor} published rows that charge at a door have no ticket link and have never been asked about. That is ${plan.searches.min} to ${plan.searches.max} searches, two per row and it stops at the first that answers. ${c.earning} are earning today, ${c.refused} carry a link the gate refused, and ${c.noDoor} do not charge at a door at all.`;
};

// ── ONE PROPOSAL, FROM WHAT THE SEARCHES CAME BACK WITH ─────────────
//
// `results` is everything both queries returned, already flattened by the
// caller, so this stays pure and testable with no network in it. pickTicketUrl
// makes the decision, not this file: it refuses a front page, a search page and
// a category listing, and it refuses a product page that is not about this
// place, which matters more here than anywhere else in the app because a wrong
// ticket link is not a weak fact, it is a reader who paid for something else.
export const FOUND = "found";
export const NOTHING = "nothing";

// ── AN AGENT HAS A NAME, AND IT IS NOT ITS KEY ──────────────────────
// ticketAgentOf returns "tiqets" and "ticketmaster" because they are keys. Both
// the proposal line and the panel were spelling them out by hand, in a ternary
// each, which is two places to get a third agent wrong. An unknown key gets the
// honest generic rather than a capitalised key: PARTNER_MERCHANTS in
// affiliates.js already carries the comment about why "Gjhkxmoh" is the failure
// mode of capitalising whatever happens to be there.
const AGENT_LABEL = { tiqets: "Tiqets", ticketmaster: "Ticketmaster" };
export const agentLabel = (agent) => AGENT_LABEL[clean(agent)] || "a ticket agent";

export const ticketProposal = (row, results, { today = new Date() } = {}) => {
  const payload = row?.payload || {};
  const name = clean(payload.name) || "(unnamed)";
  const town = parentTownOf(payload);
  const list = (Array.isArray(results) ? results : []).filter(r => r?.url);
  const url = pickTicketUrl(list, { name, town });
  const at = (today instanceof Date ? today : new Date(today)).toISOString().slice(0, 10);
  if (!url) {
    return {
      id: row?.id, name, verdict: NOTHING, at,
      // describeTicketSearch, not a sentence written here. It already tells the
      // three cases apart: no agent page at all, only category pages, or
      // bookable pages that are about something else. Each is a different thing
      // for him to do, and "nothing found" told three times is one thing.
      why: describeTicketSearch(list, { name, town }),
      payload: { ...payload, __ticketSweep: { at, found: false } },
    };
  }
  return {
    id: row?.id, name, verdict: FOUND, at, url,
    agent: ticketAgentOf(url),
    // Quoted back rather than summarised, rule 4. This is the line he reads
    // when deciding whether to accept, and "found a page" is not evidence.
    why: `${agentLabel(ticketAgentOf(url))} has a bookable page whose own title or slug names this place${town ? ` in ${town}` : ""}.`,
    payload: { ...payload, ticketUrl: url, __ticketSweep: { at, found: true, url } },
  };
};

export const describeTicketFindings = (list) => {
  const all = Array.isArray(list) ? list : [];
  if (!all.length) return "Nothing was searched.";
  const found = all.filter(p => p?.verdict === FOUND);
  const agents = [...new Set(found.map(p => agentLabel(p.agent)).filter(Boolean))];
  if (!found.length) return `${all.length} ${all.length === 1 ? "row" : "rows"} asked, and no agent sells a ticket to any of them. Plenty of Danish places sell only through their own site, and no ticket link is the right answer for those. Each one is stamped so the next sweep skips it for ${RESWEEP_DAYS} days.`;
  return `${found.length} of ${all.length} have a bookable page${agents.length ? ` on ${agents.join(" and ")}` : ""}. Ticking one writes the plain agent URL onto the row; the tracking marker is added at render from config.js, so it is never frozen into the database.`;
};

// The write, as data rather than as a fetch, so the shape can be asserted
// without a network. Same contract as undatedSweep's writeFor, and named apart
// from it because the test bundle puts every module in one namespace.
//
// TYPE IS NOT TOUCHED. This sweep changes what a row links to, never what a row
// IS, so a PATCH carrying a type would be a whole class of mistake this cannot
// make.
export const affiliateWriteFor = (p) => ({ id: p?.id, payload: p?.payload });
