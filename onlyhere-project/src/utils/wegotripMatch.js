// ── MATCHING WEGOTRIP'S DANISH CATALOGUE TO THE PUBLISHED ROWS ──────
//
// Oliver, 6 Sep 2026: "Is it possible to do a sweep with wegotrip that is 'add
// audio to this tour' on the blogs that has the possible?"
//
// Possible, and free. src/data/wegotrip.js holds the whole Danish inventory, so
// this asks no search, no scrape and no model: it is twenty rows on one side
// and the published library on the other, matched by name.
//
// ── THE TWO HALVES WANT DIFFERENT ROWS, WHICH IS THE FINDING ────────
//
// Every one of the thirteen audio walks is about a TOWN. Not one is tied to an
// attraction: "Copenhagen: Self-Guided Audio Walk Through the Old City Heart"
// belongs on the Copenhagen page and would be an odd thing to meet at the
// bottom of a page about Glyptoteket. So the audio half only ever looks at town
// rows, and the ticket half only ever looks at the attraction the ticket admits
// you to.
//
// ── AND IT MATCHES ONE WAY ON PURPOSE ───────────────────────────────
//
// The row's name has to contain the catalogue's place name, never the reverse.
// Reversing it would match a row called "Billund" to "LEGOLAND® Billund: Entry
// Ticket", because "Billund" is a whole word inside it, and a Book tickets
// button on the town of Billund that sells Legoland admission is the wrong-link
// failure ticketLink.js was written to prevent.
//
// The cost of matching one way is a miss: a row called only "Legoland" does not
// contain "Legoland Billund". So the unmatched catalogue entries are REPORTED
// rather than dropped. A list of seven products and which rows they found is a
// thing he can read in ten seconds; a silent four-out-of-seven is not.
import { fold, containsName } from "./danishNames";
import { WEGOTRIP_DK, WEGOTRIP_TOWN_PAGE, CHECKED_ON } from "../data/wegotrip";
// isoDay rather than toISOString().slice(0, 10), for the reason written out in
// utils/affiliateSweep.js: toISOString converts to UTC first, so east of
// Greenwich a stamp written after midnight is dated the day before. This file
// was written with the same wrong line as that one, on the same evening, and
// both are fixed here.
import { isoDay } from "./eventDates";

const clean = (v) => String(v == null ? "" : v).trim();

// ── WHICH ROWS ARE A TOWN ───────────────────────────────────────────
// `town` and `nightTown`, and nothing else. A nightlife-town page is a page
// about that town, and a daytime history walk offered under a page about its
// bars is additive rather than a second version of the same thing, which is the
// test config.js sets for this programme in its own words.
export const TOWN_TYPES = ["town", "nightTown"];

// ── AND WHICH TOWN IT IS ────────────────────────────────────────────
//
// The row's NAME, compared whole, never containsName. sweeps.js paid for this
// one already: "Nørresundby (Aalborg)" contains Aalborg as a whole word and is
// not Aalborg, and an audio walk of Aalborg sold on the Nørresundby page is the
// same class of mistake as partOf collapsing a village into an island.
//
// The bracket is stripped first, because a name is allowed to carry one and
// "Aarhus (Århus)" is still Aarhus. Nothing else is: a name with words outside
// the bracket is a different place.
export const townNameOf = (row) => {
  const name = clean(row?.payload?.name).replace(/\s*\([^()]*\)\s*$/, "");
  return TOWN_TYPES.includes(clean(row?.type)) ? name : "";
};

const sameTown = (a, b) => !!fold(a) && fold(a) === fold(b);

// ── THE AUDIO HALF ──────────────────────────────────────────────────
//
// One walk: the deep link, and the card can name it.
// Several: WeGoTrip's own page for that town, and the card says how many.
//
// That second branch is the browse-versus-deep-link distinction the Tiqets
// block in config.js spends a paragraph on, landing on the other side of it,
// and the reason is worth stating rather than assuming. A reader who clicked
// "Tickets" on Rosenborg was promised Rosenborg, so a category page betrays
// them. A reader offered "self-guided audio walks in Copenhagen" was promised
// the set, so the set is the honest destination and picking one of eight on
// their behalf is the arbitrary answer.
export const audioFor = (row, catalogue = WEGOTRIP_DK, townPages = WEGOTRIP_TOWN_PAGE) => {
  const town = townNameOf(row);
  if (!town) return null;
  const walks = (Array.isArray(catalogue) ? catalogue : [])
    .filter(p => p?.kind === "audio" && sameTown(p.town, town));
  if (!walks.length) return null;
  if (walks.length === 1) {
    return { town, count: 1, url: walks[0].url, title: walks[0].title };
  }
  // No town page configured for a town with several walks means there is no
  // honest single destination, so nothing is offered. Rule three: a field that
  // cannot be answered stays empty rather than being answered badly.
  const page = clean(townPages?.[town]) || clean(townPages?.[walks[0].town]);
  if (!page) return null;
  return { town, count: walks.length, url: page, title: "" };
};

// What the card would read, shown in the proposal rather than described,
// because what you review is what you publish.
export const audioLine = (audio) => {
  if (!audio?.url) return "";
  return audio.count > 1
    ? `${audio.count} self-guided audio walks in ${audio.town}`
    : `Self-guided audio walk: ${audio.title}`;
};

// ── THE TICKET HALF ─────────────────────────────────────────────────
// Returns the catalogue entry whose place this row is about. One way, whole
// words, and the town has to agree when the row states one, because two
// attractions can share a name and only one of them is in Billund.
export const ticketFor = (row, catalogue = WEGOTRIP_DK) => {
  const payload = row?.payload || {};
  const name = clean(payload.name);
  if (!name) return null;
  const rowTown = clean(payload.town) || clean(payload.city);
  const hit = (Array.isArray(catalogue) ? catalogue : []).find(p => {
    if (p?.kind !== "ticket") return false;
    if (!containsName(name, p.place)) return false;
    // Stated and disagreeing is a refusal; stated by neither is a pass, because
    // the name already carried the evidence.
    return !rowTown || !p.town || sameTown(rowTown, p.town) || containsName(rowTown, p.town);
  });
  return hit || null;
};

// ── AND WHAT THE CATALOGUE FOUND NOTHING FOR ────────────────────────
// The other direction, reported rather than dropped. Seven admissions and which
// rows they landed on is readable in ten seconds; a silent four of seven is the
// number nobody ever learns.
export const unmatchedProducts = (rows, catalogue = WEGOTRIP_DK) => {
  const list = Array.isArray(rows) ? rows : [];
  const cat = Array.isArray(catalogue) ? catalogue : [];
  const audioTowns = new Set(list.map(r => fold(townNameOf(r))).filter(Boolean));
  const ticketPlaces = new Set();
  for (const r of list) { const t = ticketFor(r, cat); if (t) ticketPlaces.add(t.url); }
  return cat.filter(p => p?.kind === "ticket"
    ? !ticketPlaces.has(p.url)
    : !audioTowns.has(fold(p.town)));
};

export const AUDIO = "audio";
export const TICKET = "ticket";

// ── ONE PROPOSAL PER ROW ────────────────────────────────────────────
// A row can be both, in principle, and is not in practice: a town row is never
// an attraction. Written so it could not silently drop one if that changed.
export const wegotripProposals = (rows, { catalogue = WEGOTRIP_DK, townPages = WEGOTRIP_TOWN_PAGE, today = new Date() } = {}) => {
  const at = isoDay(today instanceof Date ? today : new Date(today));
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const payload = row?.payload || {};
    const name = clean(payload.name) || "(unnamed)";
    const audio = audioFor(row, catalogue, townPages);
    // Already carrying the same link is not a proposal. Re-offering what is on
    // the row is how a review table full of no-ops teaches somebody to tick
    // everything without reading it.
    if (audio && clean(payload?.__audio?.url) !== audio.url) {
      out.push({
        id: row?.id, name, kind: AUDIO, url: audio.url, count: audio.count,
        line: audioLine(audio),
        why: audio.count > 1
          ? `WeGoTrip has ${audio.count} self-guided walks in ${audio.town} and no reason to prefer one, so this links to the set rather than picking for the reader.`
          : `WeGoTrip has one self-guided walk in ${audio.town}, so this links straight to it.`,
        payload: { ...payload, __audio: { url: audio.url, count: audio.count, title: audio.title, town: audio.town, at } },
      });
      continue;
    }
    const ticket = ticketFor(row, catalogue);
    if (ticket && clean(payload.ticketUrl) !== ticket.url) {
      out.push({
        id: row?.id, name, kind: TICKET, url: ticket.url,
        line: `Book tickets · ${ticket.title}`,
        why: clean(payload.ticketUrl)
          ? `This row already links to ${clean(payload.ticketUrl)}, and accepting this would replace it. WeGoTrip sells admission to ${ticket.place}.`
          : `WeGoTrip sells admission to ${ticket.place}, and this row has no ticket link.`,
        replaces: clean(payload.ticketUrl),
        payload: { ...payload, ticketUrl: ticket.url },
      });
    }
  }
  return out;
};

export const describeWegotrip = (list, rows, catalogue = WEGOTRIP_DK) => {
  const all = Array.isArray(list) ? list : [];
  const audio = all.filter(p => p.kind === AUDIO).length;
  const tickets = all.filter(p => p.kind === TICKET).length;
  const spare = unmatchedProducts(rows, catalogue);
  if (!all.length) {
    return `Nothing to add. Every row WeGoTrip covers already carries its link, or none of your published rows matches the ${catalogue.length} Danish products they sell (checked ${CHECKED_ON}).`;
  }
  const parts = [];
  if (audio) parts.push(`${audio} town ${audio === 1 ? "page" : "pages"} can carry a self-guided audio walk`);
  if (tickets) parts.push(`${tickets} ${tickets === 1 ? "attraction" : "attractions"} can carry a WeGoTrip admission link`);
  const tail = spare.length
    ? ` ${spare.length} of their ${catalogue.length} Danish products match no published row: ${spare.slice(0, 4).map(p => p.place || p.town).join(", ")}${spare.length > 4 ? " and others" : ""}. Those are pages you could write rather than links you are missing.`
    : "";
  return `${parts.join(", and ")}. Catalogue checked ${CHECKED_ON}, and this costs nothing to run.${tail}`;
};

// Payload only. This sweep changes what a row links to, never what a row is.
export const wegotripWriteFor = (p) => ({ id: p?.id, payload: p?.payload });
