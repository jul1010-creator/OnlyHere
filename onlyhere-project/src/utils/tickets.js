// ── WHAT A TICKETING API CAN AND CANNOT TELL YOU ─────────────────────
//
// Oliver, 11 Aug 2026: "I have Ticketmaster."
//
// ── WHAT THIS REPLACES ──────────────────────────────────────────────
// ticketStatus has been a model guess since the field was added, and nothing
// downstream treats it as one. studioContent.js stores `t.ticketStatus ||
// "on_sale"`, so a festival the writer said nothing about is filed as ON SALE.
// The guide prompt then acts on the value: an event marked sold_out is written
// up as sold out and the reader is told not to count on it. A guessed sold-out
// is the worse of the two directions, because it talks somebody out of a trip
// that would have worked, and no reader can tell a guess from a fact once it is
// rendered as a red badge.
//
// ── THE ONE THING THAT DECIDES THE SHAPE OF THIS FILE ────────────────
// TICKETMASTER CANNOT SAY "SOLD OUT". Verified against their own reference on
// 11 Aug 2026, not from memory: `dates.status.code` has exactly five values,
// onsale, offsale, canceled, postponed and rescheduled. There is no sold-out
// code, and `offsale` means only "not on sale right now", which is three
// different real situations at once:
//
//   the last ticket went          → sold out
//   sales have not opened yet     → come back in March
//   sales closed before the event → the door, or nothing
//
// Mapping offsale onto sold_out is the obvious three-line integration and it is
// a lie one third of the time in the direction that costs a trip. So this file
// carries `off_sale` as its own value and says all three possibilities out
// loud. Same rule classifyFerry and reconcileHours already follow: a source
// that cannot settle a question returns the question, never a confident guess.
//
// ── WHAT IT CAN SAY, WHICH IS WORTH THE KEY ─────────────────────────
//   canceled                 the event is not happening. Nothing else in this
//                            pipeline can find that out, and sending a reader
//                            to a cancelled festival is the worst failure here.
//   postponed / rescheduled  the date on file is wrong.
//   onsale                   tickets are genuinely on sale, from the operator's
//                            own ticketing system rather than a search result.
//   dates.start.localDate    the real date, free, on every matched event.
//   priceRanges              a real price, so ticketInfo stops being a field
//                            the prompt has to say "never invent prices" about.
//   url                      where a reader actually buys it.
//
// ── THE COVERAGE PROBLEM, STATED RATHER THAN HIDDEN ──────────────────
// Ticketmaster's own docs put Denmark under the INTERNATIONAL Discovery API
// (app.ticketmaster.eu), and that API "no longer accepts new API key requests",
// with new integrations pointed at the standard Discovery API. The standard
// API's country parameter documents only US, CA, AU, NZ and MX by name while
// claiming coverage of "other European countries". Whether a key issued today
// returns Danish events is therefore the one thing that could not be settled
// from documentation, and guessing it is how the DMI mistake happened twice.
//
// So it is measured instead: api/tickets.js has a probe that asks for Danish
// events with no keyword at all. If the answer is zero, EVERY per-festival
// lookup would come back empty, and "no coverage" and "this festival is not
// listed" would be indistinguishable while quietly downgrading all of them.
// The probe makes that one visible answer instead of sixty invisible ones.
//
// And a miss is expected even with coverage. Danish festivals worth a Gemlyx
// entry sell through Billetto, Ticketbutler, or a form on their own site, and
// Ticketmaster skews to the big commercial venues. A miss must leave the field
// as a model guess AND say that it is one, which is the whole difference
// between this and an integration that silently blanks half the library.

import { fold, samePlaceName, containsName } from "./danishNames";
import { citationUrls } from "./aiClient";

// ── ONE VOCABULARY, BECAUSE THERE WERE THREE ────────────────────────
// Found while wiring this up, and it is the same failure as every other one
// this month: one idea written down in three places that never agreed.
//
//   studioPrompts.js asks the model for   free / on_sale / limited / sold_out
//   App.jsx renders badges for            sold_out / selling_fast / available / free
//   guideReading.js reads                 sold_out / limited
//
// So "on_sale", the value stored on every festival by default, renders NO badge
// at all, and "selling_fast" and "available" are badges nothing can ever
// produce. "limited" changes the booking advice and shows nothing on the card.
// Two of the four badges have been dead since they were written.
export const TICKET_STATUS = ["free", "on_sale", "limited", "sold_out", "off_sale", "cancelled", "unknown"];

// The spellings that already exist in stored rows and in old prompt output,
// mapped onto the vocabulary once so that no caller has to know about them.
// Deliberately NOT a general fuzzy match: an unrecognised value becomes
// "unknown", because a status nobody wrote down is not a status.
const ALIASES = {
  available: "on_sale", on_sale: "on_sale", onsale: "on_sale", "on sale": "on_sale",
  selling_fast: "limited", limited: "limited", "few left": "limited",
  sold_out: "sold_out", soldout: "sold_out", "sold out": "sold_out",
  off_sale: "off_sale", offsale: "off_sale", "off sale": "off_sale",
  cancelled: "cancelled", canceled: "cancelled",
  free: "free",
};

export const normaliseTicketStatus = (s) => ALIASES[fold(s).replace(/[-]+/g, "_")] || "unknown";

// ── HOW A STATUS IS SHOWN, IN ONE PLACE ─────────────────────────────
// The badge table lives here rather than inline in App.jsx so that adding a
// value cannot leave a card silently blank the way off_sale and cancelled would
// have. `label` is what a traveller reads, and it never overstates: off_sale
// says what is true, which is that this is not buyable right now.
export const TICKET_BADGE = {
  free: { label: "Free entry", tone: "good" },
  on_sale: { label: "Tickets on sale", tone: "good" },
  limited: { label: "Selling fast", tone: "warn" },
  sold_out: { label: "Sold out", tone: "bad" },
  off_sale: { label: "Not on sale right now", tone: "warn" },
  cancelled: { label: "Cancelled", tone: "bad" },
  unknown: { label: "", tone: "" },
};

export const ticketBadge = (status) => TICKET_BADGE[normaliseTicketStatus(status)] || TICKET_BADGE.unknown;

// ── WHERE DID THIS STATUS COME FROM ─────────────────────────────────
//
// Oliver, 11 Aug 2026: "considering some events are ticketmaster.com and some
// aren't, how do we differentiate that?"
//
// Today, nothing does. ticketStatus is one field with no memory. An event whose
// status was measured against Ticketmaster's own listing and an event where the
// writer had a feeling both render the identical green badge, and no screen,
// prompt or audit can tell them apart afterwards.
//
// That is the SAME failure travelTime had and that the run log fixed for it: a
// measured figure and a written one that look alike are worse than the written
// one alone, because the measured ones teach you to trust the written ones.
//
// So the source travels with the status. Not as a nice-to-have label: as the
// thing that decides whether the guide is allowed to state it as fact.
export const TICKET_SOURCES = ["ticketmaster", "billetto", "official-site", "writer", "none"];

export const TICKET_SOURCE_LABEL = {
  ticketmaster: "Ticketmaster",
  billetto: "Billetto",
  "official-site": "the festival's own site",
  // Deliberately not "Gemlyx" or "our research". The whole point of the field is
  // that this one was NOT measured, so it says so in a word he cannot misread.
  writer: "not checked against a ticket seller",
  none: "",
};

// Can a status from this source be stated to a reader as fact? Only the two
// that are a ticket seller's own record of its own listing.
export const MEASURED_SOURCES = ["ticketmaster", "billetto"];
export const isMeasured = (source) => MEASURED_SOURCES.includes(String(source || ""));

// ── STORED ON THE ROW, WITH A DATE ──────────────────────────────────
// Same shape and the same reason as __hours: a ticket status with no date is a
// claim that quietly ages into a lie, and a status with no source is one that
// cannot be re-checked or argued with. `checkedOn` is what a reader is shown.
export const stampTicketSource = (payload, rec) => ({
  ...(payload || {}),
  __ticket: {
    source: rec?.confidence === "strong" && rec?.event ? "ticketmaster"
      : rec?.confidence === "none" ? "writer"
      : rec?.confidence === "weak" ? "writer"
      : "none",
    at: new Date().toISOString(),
    verdict: rec?.verdict || "",
    // The listing itself, so a person checking does not have to search for it.
    url: rec?.confidence === "strong" ? (rec?.event?.url || "") : "",
  },
});

// One line a reader can act on, or "" when there is nothing honest to say.
export const ticketProvenance = (payload) => {
  const t = payload?.__ticket;
  if (!t?.source || t.source === "none") return "";
  const when = t.at ? String(t.at).slice(0, 10) : "";
  if (isMeasured(t.source)) {
    return `Ticket status checked against ${TICKET_SOURCE_LABEL[t.source]}${when ? ` on ${when}` : ""}.`;
  }
  return "Ticket status has not been checked against a ticket seller. Confirm on the official site before you count on it.";
};

// ── READING TICKETMASTER'S OWN FIELDS ───────────────────────────────
// Field names taken from the live reference, and every one of them optional,
// because a partial event object is normal rather than an error.
export const readTicketmasterEvent = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const venue = raw._embedded?.venues?.[0] || {};
  const price = Array.isArray(raw.priceRanges) ? raw.priceRanges[0] : null;
  return {
    id: raw.id || "",
    name: raw.name || "",
    url: raw.url || "",
    statusCode: raw.dates?.status?.code || "",
    localDate: raw.dates?.start?.localDate || "",
    localEndDate: raw.dates?.end?.localDate || "",
    venue: venue.name || "",
    city: venue.city?.name || "",
    country: venue.country?.countryCode || "",
    saleStart: raw.sales?.public?.startDateTime || "",
    saleEnd: raw.sales?.public?.endDateTime || "",
    saleTBD: !!raw.sales?.public?.startTBD,
    priceMin: price && Number.isFinite(Number(price.min)) ? Number(price.min) : null,
    priceMax: price && Number.isFinite(Number(price.max)) ? Number(price.max) : null,
    currency: price?.currency || "",
  };
};

// ── STATUS, MAPPED HONESTLY ─────────────────────────────────────────
// The only place the five codes are interpreted. `certain` marks whether the
// resulting status is a statement about ticket availability at all: offsale is
// a statement about Ticketmaster, not about whether tickets exist.
export const statusFromCode = (code) => {
  switch (String(code || "").toLowerCase()) {
    case "onsale":
      return { status: "on_sale", certain: true, detail: "Ticketmaster's listing is on sale now." };
    case "offsale":
      return {
        status: "off_sale", certain: false,
        // The sentence this whole file exists for.
        detail: "Ticketmaster shows this as off sale, which means one of three things and their data does not say which: sold out, sales not open yet, or sales already closed. It is NOT a confirmation that it is sold out.",
      };
    case "canceled":
    case "cancelled":
      return { status: "cancelled", certain: true, detail: "Ticketmaster's listing says this event is cancelled." };
    case "postponed":
      return { status: "unknown", certain: false, detail: "Ticketmaster shows this as postponed, so the date on file is no longer the date." };
    case "rescheduled":
      return { status: "unknown", certain: false, detail: "Ticketmaster shows this as rescheduled, so the date on file needs replacing with the new one." };
    default:
      return { status: "unknown", certain: false, detail: "" };
  }
};

// ── MATCHING, WHICH IS WHERE THESE INTEGRATIONS ACTUALLY GO WRONG ────
// A keyword search returns whatever the search engine felt like. Accepting the
// first result is how a guide ends up reporting the ticket status of a tribute
// act in Aarhus as the status of a folk festival on Bornholm.
//
// Two independent gates, and both have to pass for anything to be written:
// the NAME has to be the same event, and the DATE has to be the same edition.
// A name-only match is kept but marked weak, and a weak match is reported to a
// human and never applied. That distinction is the entire safety margin.

const STOPWORDS = new Set(["the", "festival", "festivalen", "de", "den", "det", "og", "and", "i", "in", "of", "a"]);

// ── THE THING SOLD ALONGSIDE THE EVENT IS NOT THE EVENT ─────────────
//
// Found in Oliver's own probe output, 12 Aug 2026, the first time the key
// worked. Five Danish events came back and TWO of them were this:
//
//   "Wonderfestiwall 2026 - Natbus, natten til fredag"   Allinge, 13 Aug
//   "Wonderfestiwall 2026 - Shuttlebus"                  Allinge, 13 Aug
//
// Bus tickets. Same name, same town, same days as the festival, and the
// matcher would have taken either one: the on-file name is "Wonderfestiwall",
// every carrying word of it is present, and the date is inside the tolerance.
// A STRONG match, on a coach.
//
// What that writes onto the festival is the sale status of a night bus. Sold
// out buses on a festival with tickets left reads as SOLD OUT, which is the
// exact direction that talks somebody out of a trip, and it would have been
// stamped ticketmaster and shown with a tick as measured.
//
// These words never appear in a Danish festival's own name and always appear
// in the add-on sold beside it. Anything matching is refused as the event
// itself rather than merely ranked lower, because "the only listing I found is
// a shuttle bus" and "there is no listing" are both correctly no-match, and
// ranking would have picked the bus whenever it was the only thing there.
// Matched against ONE TOKEN at a time, which is why every entry here is a
// single word. The first version carried "vip[-\s]?tillæg" and could never
// fire: nameTokens folds æ to ae and splits on the hyphen, so what actually
// arrives is "vip" and then "tillaeg". A pattern written for the raw string and
// applied to the tokenised one is a rule that reads correctly and never runs.
const ANCILLARY = /^(?:shuttlebus|natbus|bus|busser|transport|parkering|parking|camping|campingvogn|garderobe|cloakroom|merch|merchandise|tillaeg|opgradering|upgrade|afhentning|billetforsikring|insurance)$/i;

// True when a Ticketmaster listing is a product sold FOR an event rather than
// admission TO it. Checked against the part of the name the on-file name does
// not account for, so a festival genuinely called something with "bus" in it
// cannot rule itself out.
export const isAncillaryListing = (onFileName, candidateName) => {
  const own = new Set(nameTokens(onFileName));
  const extra = nameTokens(candidateName).filter(w => !own.has(w));
  return extra.some(w => ANCILLARY.test(w));
};

// The words that carry the identity. "Roskilde Festival 2026" and "Roskilde
// Festival, 7 Day Ticket" both reduce to {roskilde}, which is correct: the
// distinguishing word in a Danish festival name is nearly always the place.
export const nameTokens = (s) => fold(s)
  .replace(/[^a-z0-9\s]/g, " ")
  .split(/\s+/)
  .filter(w => w && w.length > 1 && !STOPWORDS.has(w) && !/^(19|20)\d{2}$/.test(w));

// Every carrying word of the shorter name present in the longer one. Not a
// character-similarity score: those rate "Skagen Festival" and "Skanderborg
// Festival" as close, and they are two different weeks in two different parts
// of the country.
export const nameOverlap = (a, b) => {
  const A = nameTokens(a), B = new Set(nameTokens(b));
  if (!A.length || !B.size) return 0;
  const hit = A.filter(w => B.has(w)).length;
  return hit / A.length;
};

const dayMs = 86400000;
export const daysApart = (a, b) => {
  const x = new Date(String(a || "").slice(0, 10)), y = new Date(String(b || "").slice(0, 10));
  if (Number.isNaN(x.getTime()) || Number.isNaN(y.getTime())) return null;
  return Math.round(Math.abs(x - y) / dayMs);
};

// A festival moves a day or two between editions and keeps its identity. Beyond
// a fortnight it is a different edition of the same festival, which is a
// different set of tickets and a different answer to every question here.
export const SAME_EDITION_DAYS = 14;
// Enough overlap to be the same event. Below this the two names simply are not
// about the same thing.
export const MIN_NAME_OVERLAP = 0.6;

// ── WHAT A LISTING'S OWN DATES ARE WORTH ────────────────────────────
// Only reached when the draft has NO date, which is the one case where an
// unconfirmed date beats an empty field. Three things have to hold:
//
//   1. THE LISTING MUST BE UPCOMING. Ticketmaster keeps last year's editions,
//      and a 2025 date written onto a 2026 draft is worse than no date: it
//      would publish, and then read as a festival that has already happened.
//   2. THE RANGE COMES FROM THE LISTINGS THEMSELVES. A festival sells a day
//      ticket per day, so several listings under one name ARE the run. Earliest
//      to latest is the festival's dates, which is how "Kaløvig Havnefestival
//      2026 - Dagsbillet" on the 14th, 15th and 16th describes a three day
//      festival that the draft's own prose already called three days.
//   3. ONE DAY IS ONE DAY. A single listing gives a start and no end, rather
//      than a range of zero length, because the row's dateEnd means "and it
//      runs until", not "and here is the start again".
//
// It returns null rather than a guess when none of that holds, and the caller
// treats null the way it treats every other absence.
const DAY = 86400000;
const asDay = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ""));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
};

// ── ONE READER FOR "IS THIS THE RIGHT CITY" ─────────────────────────
//
// Hoisted out of matchEvent because datesFromListings needs the same answer and
// a second opinion about what counts as the same city is exactly how the two
// drift apart. Three answers, not two: 0 the cities agree, 2 they are known to
// differ, 1 there is nothing to compare. The neutral answer is the important
// one — a listing with no city on it is not evidence of a mismatch, and a venue
// in a suburb may not name the city the entry does.
export const CITY_MATCH = 0, CITY_UNKNOWN = 1, CITY_DIFFERENT = 2;
// ── AND "COPENHAGEN" IS "KØBENHAVN", WHICH fold ALONE CANNOT SEE ────
//
// Fable, 1 Sep 2026. fold maps ø to o, so "København" becomes "kobenhavn" and
// "Copenhagen" stays "copenhagen": neither contains the other, and every
// Copenhagen event went WEAK against its own Ticketmaster listing. No
// Copenhell, Distortion or Strøm row could take a measured status or the
// affiliate ticket URL, and in the no-date branch every København listing
// counted as known-wrong — which put the invented multi-city "run" straight
// back, the exact bug the city filter was added to stop.
//
// It is an EXONYM, not a spelling: no character mapping reaches it. This repo
// already solved that — samePlaceName knows the pairs — and I reached for fold
// because it was the function nearest to hand.
//
// ── AND THE TWO-WAY includes WAS THE OTHER HALF ─────────────────────
// "does either contain the other" is the unbounded-substring trap this codebase
// names in five separate comments, and it fires here: Ry matched Ryslinge, Als
// matched Aalsgaarde. containsName is the bounded reader everything else uses,
// and a venue city like "Aarhus C" or "København V" still matches its town
// because the suffix is its own word.
export const cityWanted = (onFile) => String(onFile?.city || onFile?.town || "").trim();
export const cityRankOf = (e, wantCity) => {
  const got = String(e?.city || "").trim();
  const want = String(wantCity || "").trim();
  if (!want || !got) return CITY_UNKNOWN;
  // ── AND THE POSTAL LETTER COMES OFF BEFORE THE COMPARISON ───────
  //
  // The two halves have to compose, and on the first attempt they did not:
  // "København S" is the exonym AND a postal district at once, so
  // samePlaceName could not see past the " S" and containsName could not see
  // past the exonym. Copenhell — the case this was fixed for — still failed.
  //
  // Ticketmaster writes venue cities as "København S", "København V",
  // "Aarhus C", "Odense C", "København NV". One or two capitals on the end is a
  // postal district, never a town, so it is dropped before either test runs.
  const bare = (v) => String(v).replace(/\s+[A-ZÆØÅ]{1,2}$/, "").trim();
  const g = bare(got), w = bare(want);
  if (samePlaceName(g, w)) return CITY_MATCH;
  // Bounded both ways, for the plain cases the exonym list does not cover.
  // containsName is what stops Ry matching Ryslinge.
  if (containsName(g, w) || containsName(w, g)) return CITY_MATCH;
  return CITY_DIFFERENT;
};

export const datesFromListings = (named, today = new Date(), onFile = null) => {
  const floor = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  // ── AND A TOUR IS NOT A FESTIVAL ────────────────────────────────
  //
  // This read every listing carrying the name and fused anything within a
  // fortnight into one run with a start and an end. On a festival that is the
  // right answer and the reason the function exists: Roskilde's day tickets are
  // eight listings in one city across eight days, and one run is what they are.
  //
  // On a TOUR it invents a festival. "Vanvittig Verdenshistorie" plays Aarhus
  // on one night and Odense the next week; both listings carry the name, both
  // are within the window, and the offer this made was "12 Sep – 19 Sep" — a
  // week-long run that does not exist, written straight into dateStart and
  // dateEnd by the caller, because the no-date branch is exactly the branch
  // that has nothing else to check it against.
  //
  // The city is the thing that separates them, and it was on every listing all
  // along. When the entry names a city and any listing agrees with it, only
  // those listings are this entry's; the rest are other stops. When nothing
  // agrees, or nothing has a city, every listing stays in — refusing to offer a
  // date because a venue did not name its town would lose the Kaløvig case this
  // function was written for.
  // EXCLUDE THE KNOWN-WRONG, rather than keep only the known-right, and the
  // difference is a listing whose venue names no city. Danish venues often
  // don't, and "keep only what matches" would throw those away — losing the
  // Kaløvig case this function exists for, where not one listing carried a city.
  // A mismatch is evidence; an absence is not.
  const wantCity = cityWanted(onFile);
  const rows = (Array.isArray(named) ? named : []).filter(Boolean);
  const mine = rows.filter(x => cityRankOf(x?.e, wantCity) !== CITY_DIFFERENT);
  // And if that empties the list, every listing is in a city this entry is not
  // in, and we have learned nothing about which are ours. Offering what there is
  // beats offering nothing: the confidence is already weak, the caller only ever
  // fills an empty field, and a festival's stated town and its venue's city
  // genuinely differ (Kaløvig's harbour is in Egå).
  const use = mine.length ? mine : rows;
  const all = [...new Set(use
    .map(x => String(x?.e?.localDate || "").slice(0, 10))
    .filter(d => asDay(d) != null))].sort();
  if (!all.length) return null;
  // The edition has to be a coming one. Ticketmaster keeps last year's, and a
  // 2025 date written onto a 2026 draft would publish and then read as a
  // festival that has already happened.
  const upcoming = all.filter(d => asDay(d) >= floor);
  if (!upcoming.length) return null;
  // ── BUT A FESTIVAL IN PROGRESS STARTED YESTERDAY ─────────────────
  // Anchored rather than filtered, and this is the Kaløvig case exactly: he was
  // reading it on the Saturday of a run that began on the Friday. Dropping every
  // past day would have offered a start of Saturday for a festival that starts
  // Friday, which is a wrong date rather than a missing one. So the earliest
  // COMING day anchors the edition, and every listing within a fortnight of it
  // belongs to that edition, in either direction. Last year's listing is three
  // hundred and sixty five days out and cannot reach.
  const anchor = asDay(upcoming[0]);
  const run = all.filter(d => Math.abs(asDay(d) - anchor) <= SAME_EDITION_DAYS * DAY);
  const start = run[0], end = run[run.length - 1];
  return { start, end: end === start ? "" : end, listings: run.length };
};

export const matchEvent = (onFile, candidates) => {
  const list = (Array.isArray(candidates) ? candidates : []).map(readTicketmasterEvent).filter(Boolean);
  if (!list.length) return { event: null, confidence: "none", why: "Ticketmaster returned no events for this search." };

  // Refused before ranking, not after: see isAncillaryListing. When the shuttle
  // bus is the ONLY listing carrying the name, the honest answer is that the
  // event was not found, and ranking would have handed back the bus.
  const buses = list.filter(e => isAncillaryListing(onFile?.name, e.name));
  const named = list
    .filter(e => !buses.includes(e))
    .map(e => ({ e, overlap: nameOverlap(onFile?.name, e.name) }))
    .filter(x => x.overlap >= MIN_NAME_OVERLAP);
  if (!named.length && buses.length) {
    return {
      event: null, confidence: "none",
      why: `Ticketmaster has ${buses.length} listing${buses.length === 1 ? "" : "s"} under this name and ${buses.length === 1 ? "it is" : "they are"} travel or add-on tickets rather than admission (${buses.slice(0, 2).map(e => e.name).join(", ")}). The status of a shuttle bus is not the status of the festival, so nothing was read from ${buses.length === 1 ? "it" : "them"}.`,
    };
  }
  if (!named.length) {
    return {
      event: null, confidence: "none",
      why: `Ticketmaster returned ${list.length} ${list.length === 1 ? "event" : "events"} but none whose name is this event: ${list.slice(0, 3).map(e => e.name).join(", ")}.`,
    };
  }

  const today = onFile?.today instanceof Date ? onFile.today : new Date();
  const onFileDate = String(onFile?.date || "").slice(0, 10);
  if (!onFileDate) {
    // A name match with nothing to confirm the edition against. Real, useful to
    // show a human, and not something to write into a published row.
    const best = named.sort((a, b) => b.overlap - a.overlap)[0];
    return {
      event: best.e, confidence: "weak",
      why: "The name matches, but there is no date on file to confirm this is the same edition, so nothing was written from it.",
      // ── BUT THE LISTING KNOWS WHEN IT IS ────────────────────────
      // Oliver, 15 Aug 2026, holding the run log for Kaløvig Havnefestival:
      // "dates are left out... An event must NEVER be published without a
      // date." The log printed the answer and threw it away. Step 19 read
      // "match: weak · The name matches, but there is no date on file to
      // confirm this is the same edition", and the decision line underneath it
      // said: Ticketmaster's nearest listing is "Kaløvig Havnefestival 2026 -
      // Dagsbillet" on 2026-08-16 and it reads on sale.
      //
      // The pipeline had deleted the date itself minutes earlier, then used the
      // absence it had created as the reason to reject the source that would
      // have restored it. A loop that can only ever confirm a date it already
      // has is no use to the one draft that needs a date.
      //
      // So the no-date branch now OFFERS what the listing says, and offering is
      // the whole of it: confidence stays weak, ticketStatus is still not
      // written from a weak match, and the caller decides whether an offered
      // date is better than an empty field. See datesFromListings for the three
      // things that have to hold before a listing is worth offering.
      dateOffer: datesFromListings(named, today, onFile),
    };
  }

  // ── AND THE CITY, WHICH WAS ON EVERY CANDIDATE ALL ALONG ────────
  //
  // Oliver, 31 Aug 2026, on the Aarhus run log: "rule: Ticketmaster has no
  // confirmed listing for this festival? It most certainly does."
  //
  // It does, and the log said so eleven steps earlier: "2 Danish listings".
  // What it could not do was tell which of them was the AARHUS one, because
  // this function ranked on name overlap and date gap and nothing else — while
  // readTicketmasterEvent has been reading `city` and `venue` off every
  // candidate since it was written.
  //
  // That is the wrong axis for the thing this app publishes most. "Vanvittig
  // Verdenshistorie - Aarhus" is one date of a touring show, the name is
  // identical in every city it plays, and the date gap between two cities on
  // one tour is arbitrary: 77 days apart said "probably a different edition",
  // which was true and useless. The entry names its city in its own title. The
  // listing carries one. Nothing compared them.
  //
  // A CITY MATCH IS A STRONG SIGNAL AND A MISMATCH IS A HARD DEMOTION, but
  // neither is a veto: a listing with no city on it is not evidence of
  // anything, and a venue in a suburb may not name the city the entry does. So
  // a known mismatch sorts last and still gets reported rather than deleted.
  const wantCity = cityWanted(onFile);
  const dated = named
    .map(x => ({ ...x, gap: daysApart(onFileDate, x.e.localDate), city: cityRankOf(x.e, wantCity) }))
    .filter(x => x.gap !== null)
    // City first, then date. A listing in the right city three weeks out beats
    // one in the wrong city on the right day, because a tour plays one city
    // once and the date on file is the thing most likely to be approximate.
    .sort((a, b) => a.city - b.city || a.gap - b.gap);

  if (!dated.length) {
    const best = named.sort((a, b) => b.overlap - a.overlap)[0];
    return { event: best.e, confidence: "weak", why: "The name matches but Ticketmaster's listing carries no readable date, so the edition could not be confirmed." };
  }

  const best = dated[0];
  // The city agreeing is worth as much as the date agreeing, and on a touring
  // show it is worth more. Said in the reason, because "name and date match" on
  // a show that plays twelve cities is not the sentence a reader needs.
  const cityWord = best.city === CITY_MATCH ? ` in ${best.e.city}` : "";
  // ── A WRONG CITY IS NOT A STRONG MATCH, WHATEVER THE DATE SAYS ──
  //
  // The city rank was added to the SORT and never to this gate, so it changed
  // which listing was chosen and not what the pipeline was willing to claim
  // about it. `strong` is not a label: it is what puts `source: "ticketmaster"`
  // and the listing's own URL onto the row, so a fortnight's coincidence between
  // two stops of one tour would have published Copenhagen's ticket link on the
  // Aarhus page and called it confirmed.
  //
  // best is dated[0] and the sort puts city first, so reaching here with
  // CITY_DIFFERENT means EVERY listing is in a city this entry is not in. There
  // is no reading of that which confirms an edition. It stays reported — the
  // listing is real and worth a human's eye — but at weak, which is the
  // confidence that does not write.
  if (best.gap <= SAME_EDITION_DAYS && best.city === CITY_DIFFERENT) {
    return {
      event: best.e, confidence: "weak",
      why: `Ticketmaster's nearest listing under this name is in ${best.e.city}, not ${onFile?.city || onFile?.town || "this entry's town"}, on ${best.e.localDate} — ${best.gap === 0 ? "the same day as" : `${best.gap} ${best.gap === 1 ? "day" : "days"} from`} the date on file. On a touring show the dates of two cities line up by coincidence, so nothing was written from it. Worth a look by hand.`,
    };
  }
  if (best.gap <= SAME_EDITION_DAYS) {
    return { event: best.e, confidence: "strong", why: `Name and date both match: Ticketmaster has it${cityWord} on ${best.e.localDate}, ${best.gap === 0 ? "the same day as" : `${best.gap} ${best.gap === 1 ? "day" : "days"} from`} the date on file.` };
  }
  // A RIGHT-CITY LISTING IS NOT A DIFFERENT EDITION JUST BECAUSE THE DATE MOVED.
  // A tour plays a given city once, so the city agreeing while the date does
  // not is far more likely to be a date we have wrong than a second show.
  if (best.city === CITY_MATCH) {
    return {
      event: best.e, confidence: "weak",
      why: `Ticketmaster has this in ${best.e.city} on ${best.e.localDate}, which is ${best.gap} days from the date on file (${onFileDate}). The city matches, so this is very likely the same show on a date one of the two has wrong rather than a different edition. Worth checking by hand before publishing either date.`,
    };
  }
  // ── AND SAY WHAT IS ACTUALLY TRUE ───────────────────────────────
  // The old sentence became "Ticketmaster has no confirmed listing for this
  // festival", which is false whenever this branch runs: there ARE listings,
  // and they are named right here. Naming them is the difference between a
  // founder trusting the check and going to look for himself.
  const others = dated.slice(0, 3).map(x => `${x.e.name}${x.e.city ? ` (${x.e.city})` : ""} on ${x.e.localDate}`).join("; ");
  return {
    event: best.e, confidence: "weak",
    why: `Ticketmaster has ${dated.length} listing${dated.length === 1 ? "" : "s"} under this name and none of them is in ${onFile?.city || onFile?.town || "this entry's town"} near ${onFileDate}: ${others}. Nothing was written from ${dated.length === 1 ? "it" : "them"}.`,
  };
};

// ── THE ANSWER, AND WHO IS ALLOWED TO WRITE IT ──────────────────────
// Mirrors reconcileHours deliberately: one object, `verdict` is the field to
// read, and a disagreement is reported rather than resolved.
//
// `status` is what should be stored, and it is only ever different from what is
// on file when the match was STRONG and Ticketmaster said something it is
// actually able to say. Everything else comes back as a finding for a person.
export const reconcileTickets = (onFile, match) => {
  const filed = normaliseTicketStatus(onFile?.ticketStatus);
  const base = { status: filed, changed: false, findings: [], event: match?.event || null, confidence: match?.confidence || "none" };

  if (!match || match.confidence === "none") {
    return {
      ...base, verdict: "no-match",
      // Said out loud, because this is the common case and a silent one would
      // leave a guess looking like a measurement.
      detail: `${match?.why || "No Ticketmaster search was made."} The ticket status on this entry is still the writer's own, not a measured one.`,
      findings: filed === "unknown" ? [] : [{ severity: "low", field: "ticketInfo", detail: `Ticket status "${filed}" is the model's, not Ticketmaster's: this event is not in their listings, which is normal for a Danish festival that sells through its own site.` }],
    };
  }

  const st = statusFromCode(match.event.statusCode);

  if (match.confidence === "weak") {
    return {
      ...base, verdict: "weak-match",
      detail: `${match.why} Ticketmaster's nearest listing is "${match.event.name}"${match.event.localDate ? ` on ${match.event.localDate}` : ""} and it reads ${st.status.replace("_", " ")}. Nothing was written from it.`,
      findings: [{ severity: "low", field: "ticketInfo", detail: `A Ticketmaster listing looks like this event but could not be confirmed as the same edition. Open it before trusting it: ${match.event.url || "no link"}` }],
    };
  }

  // ── STRONG MATCH ──────────────────────────────────────────────────
  const findings = [];
  const ev = match.event;

  if (st.status === "cancelled") {
    findings.push({ severity: "critical", field: "ticketInfo", detail: `Ticketmaster's own listing for this event says CANCELLED. ${ev.url ? `Check it: ${ev.url}. ` : ""}A guide that plans a day around a cancelled event is the worst thing this pipeline can ship, so confirm and pull the entry rather than publishing it.` });
    return { ...base, status: "cancelled", changed: filed !== "cancelled", verdict: "cancelled", detail: st.detail, findings };
  }

  const gap = daysApart(onFile?.date, ev.localDate);
  if (gap !== null && gap > 0) {
    findings.push({ severity: gap > 2 ? "high" : "medium", field: "date", detail: `The date on file is ${String(onFile?.date).slice(0, 10)} and Ticketmaster's listing is ${ev.localDate}. A multi-day festival legitimately has several listings, so this is a check rather than a correction.` });
  }

  // The model claimed a definite state and the operator's own ticketing system
  // says otherwise. Same rule as travelTime: a measurement beats a sentence.
  if (st.certain && st.status !== filed) {
    if (filed === "sold_out" && st.status === "on_sale") {
      findings.push({ severity: "high", field: "ticketInfo", detail: "This entry says sold out and Ticketmaster has it on sale. A wrong sold-out talks a reader out of a trip that would have worked." });
    }
    if (filed === "free") {
      // Not overwritten: a free festival with one paid concert inside is a real
      // thing, and both statements can be true at once.
      findings.push({ severity: "medium", field: "ticketInfo", detail: `This entry says free entry, and Ticketmaster is selling tickets for it${ev.priceMin != null ? ` from ${ev.priceMin} ${ev.currency}` : ""}. Both can be true if the grounds are free and one stage is not, so say which.` });
      return { ...base, verdict: "contradiction", detail: "Filed as free while a paid Ticketmaster listing exists.", findings };
    }
    return { ...base, status: st.status, changed: true, verdict: "corrected", detail: st.detail, findings };
  }

  if (!st.certain && st.status === "off_sale") {
    // ── THE AMBIGUOUS ONE, AND ON_SALE IS NOT A DEFAULT ────────────
    //
    // This line read `filed === "on_sale" || filed === "unknown"` under a
    // comment saying "It replaces a DEFAULT, never a stated sold_out or free" —
    // and on_sale is not a default. normaliseTicketStatus("") is "unknown";
    // anything that normalises to on_sale is something a writer actually wrote,
    // off the operator's own page, saying tickets are being sold.
    //
    // So the ambiguous value was overwriting the certain one. offsale means, in
    // Ticketmaster's own data and this file's own words, "one of three things
    // and their data does not say which: sold out, sales not open yet, or sales
    // already closed" — and it is one reseller's allocation, not the event. A
    // Danish festival that sells through its own site with a small Ticketmaster
    // allocation reads offsale there and on sale everywhere else.
    //
    // The direction matters and this file already chose it, two branches up: "A
    // wrong sold-out talks a reader out of a trip that would have worked."
    // Turning "Tickets on sale" into "Not on sale right now" on evidence that
    // explicitly does not say which of three things it means is that same
    // mistake wearing a milder badge.
    //
    // Only `unknown` is replaced now. A stated on_sale is kept and CONTRADICTED
    // — raised as a finding a person reads, at the severity of something worth
    // opening rather than the "low" it used to share with routine notes.
    const replaceable = filed === "unknown";
    const contradicts = filed === "on_sale";
    findings.push(contradicts
      ? { severity: "medium", field: "ticketInfo", detail: `This entry says tickets are on sale and Ticketmaster's listing reads off sale. ${st.detail} It is also one seller's allocation rather than the event's, so a festival selling through its own site can be both at once. The entry was left as it is — check the operator's own ticket page${ev.url ? ` against ${ev.url}` : ""} and set it by hand if it has genuinely closed.` }
      : { severity: "low", field: "ticketInfo", detail: st.detail });
    return {
      ...base,
      status: replaceable ? "off_sale" : filed,
      changed: replaceable && filed !== "off_sale",
      verdict: "off-sale",
      // NOT a new verdict string. Renaming it silently dropped both consumers —
      // the prompt block below and the decision line in App.jsx, which each
      // compare against the literal "off-sale" — and the suite caught it. What
      // happened is the same thing in both cases: Ticketmaster reads off sale.
      // Whether we WROTE it is already carried by `changed`. The contradiction
      // is its own field so the prompt can say the harder sentence.
      contradicts,
      detail: st.detail, findings,
    };
  }

  if (!st.certain && st.status === "unknown") {
    findings.push({ severity: "high", field: "date", detail: st.detail || "Ticketmaster shows this event as moved." });
    return { ...base, verdict: "moved", detail: st.detail, findings };
  }

  return { ...base, verdict: "confirmed", detail: `${st.detail} ${match.why}`, findings };
};

// ── ASKING OUTRIGHT WHERE THE TICKETS ARE SOLD ──────────────────────
//
// Oliver, 13 Aug 2026: "Is it possible to get to perplexity to actively seek
// out the ticket agents? Like DEMAND that it finds it?"
//
// Yes, and the shape is the whole safety of it. A model returning a URL that is
// then believed moves surface INTO the stochastic column, which is the opposite
// of the lever: the pipeline has 14 deterministic gates and 7 stochastic steps
// and every complaint this month came from the right-hand column.
//
// So this asks for a LEAD and never for a fact. The answer is a list of URLs;
// the caller fetches them, ticketPriceOn reads them, and a page that does not
// price this event is discarded with a line in the log. What can reach a draft
// is a figure read off a page the pipeline opened. The model finds the door, the
// code checks it opens. App.jsx already says this about aggregators in its own
// words: treated as a lead, not as truth.
//
// AND IT IS AN ESCALATION, not a step. It runs only when the operator's own
// ticket link, the founder's vouched sources and Ticketmaster have all failed to
// produce a page that prices the event, which after the link-following fix
// should be the minority. readPage escalates to Firecrawl on exactly this
// reasoning: paying to re-read nothing is quiet waste.
//
// The other reason to escalate rather than always ask is that it keeps the run
// log honest. "Perplexity was asked" then MEANS the cheap paths failed on this
// event, which is a measurement worth having as the source list grows. Ask every
// time and that signal disappears.
// ── AND AN ATTRACTION IS NOT AN EVENT ───────────────────────────────
//
// 27 Aug 2026. This hunt was gated to festivals and has just been opened to
// attractions, and sending the event-shaped question about Legoland would have
// been the half-wired version of that: it asks after "the Danish event", warns
// about last year's edition, and lists the ticket AGENTS Danish events sell
// through. A museum uses none of them.
//
// Checked against the two operators that prompted this, the same day:
// glyptoteket.dk's own visitor page states the free last Wednesday and no
// price at all, because its prices live on billet.glyptoteket.dk — a ticket
// SUBDOMAIN of the museum itself, which is the commonest shape here and one
// nothing in the event wording would have gone looking for. legoland.dk keeps
// its fares on /billetter-saesonpas/billetter/, a section of its own site.
//
// So the branch is about where each kind actually sells, and both halves keep
// the rule that made this worth having: URLs it has really seen, never one
// built from a pattern.
const HUNT_RULES = `
RULES:
- Only URLs you have actually seen in your search results. Do not construct a URL from a pattern, and do not guess an id. A made-up link is worse than no link, because somebody will follow it.
- If you cannot find one, say NONE. That is a real and useful answer.

Answer with ONLY a JSON array of URL strings, best first, at most 4. No other text. If there are none, answer exactly: []`;

export const TICKET_HUNT_PROMPT = (name, town, kind = "festival") => {
  const where = town ? ` in ${town}` : "";
  if (kind === "free" || kind === "attraction") {
    return `Using real, current web search, find WHERE THE ADMISSION PRICE IS STATED for the Danish attraction "${name}"${where}.

I do not want a price in your answer and I do not want a description. I want the URLs of the pages that state what it costs to get in, or where a person can buy a ticket.

Look on the attraction's OWN site first. Danish museums and attractions usually keep fares on a page called billetter, priser, entré, besøg, praktisk info, plan your visit or tickets, and very often on a separate ticket subdomain of their own domain, like billet.<their-domain>. A great many of them state a free day or a free age band on their main visitor page and put the actual fare only on the ticket page, which is exactly the gap this search exists to close. If the attraction genuinely sells through a reseller, that page counts too.

The page must be for THIS attraction and must be current, not an archived price list.
${HUNT_RULES}`;
  }
  return `Using real, current web search, find WHERE TICKETS ARE SOLD for the Danish event "${name}"${where}.

I do not want a price and I do not want a description. I want the URLs of the pages where a person can actually buy a ticket, or where the ticket price is stated.

Look for the event's own ticket page and for whichever Danish ticket agent it uses. Danish events sell through many different ones: Billetto, Billetlugen, Billetexpressen, Madbillet, Ticketmaster, Safeticket, Ticketbutler, Place2Book, NemTilmeld, or a shop on the organiser's own domain. Do not assume it is any particular one.

The page must be for THIS event, not the venue's front page and not last year's edition.
${HUNT_RULES}`;
};

// Perplexity is asked for JSON and does not always give it. The citations come
// back on every call regardless, so they are the fallback: a URL it cited is a
// page it actually saw, which is a stronger guarantee than one it typed into
// prose. Deduped by URL without the fragment, and capped by the caller.
export const ticketHuntUrls = (result) => {
  const out = [];
  const add = (u) => {
    const s = String(u || "").trim().split("#")[0];
    if (!/^https?:\/\//i.test(s)) return;
    if (!out.includes(s)) out.push(s);
  };
  const text = String(result?.text || "").trim();
  try {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) { const arr = JSON.parse(m[0]); if (Array.isArray(arr)) arr.forEach(add); }
  } catch { /* not JSON: the citations below are the fallback, not an error */ }
  // Only if it gave nothing usable. A citation list is every page it read,
  // including the ones it read and rejected, so it is a wider and weaker net
  // than the answer and is used as such.
  // citationUrls: these are {title, url} objects, and String(object) is
  // "[object Object]", so this fallback silently found nothing every time.
  if (!out.length) citationUrls(result).forEach(add);
  return out;
};

// ── A REAL PRICE, OR NOTHING ────────────────────────────────────────
// The festival prompt has to carry the words "never invent prices" because
// there was no source for one. There is now, and an absent priceRanges returns
// an empty string rather than a range built from one number.
export const priceText = (ev) => {
  if (!ev || ev.priceMin == null) return "";
  const cur = ev.currency || "DKK";
  if (ev.priceMax != null && ev.priceMax !== ev.priceMin) return `${ev.priceMin} to ${ev.priceMax} ${cur}`;
  return `${ev.priceMin} ${cur}`;
};

// ── WHAT THE MODEL IS TOLD ──────────────────────────────────────────
// Only ever facts, and the ambiguity of off sale is passed on intact rather
// than flattened into something easier to write a sentence about.
export const ticketsForPrompt = (reconciled) => {
  const ev = reconciled?.event;
  if (!ev || reconciled.verdict === "no-match") return "";
  const parts = [];
  if (reconciled.confidence === "weak") {
    parts.push(`A TICKETMASTER LISTING MAY BE THIS EVENT AND IT IS NOT CONFIRMED: "${ev.name}"${ev.localDate ? ` on ${ev.localDate}` : ""}. Do NOT state anything from it as fact. If ticket availability matters here, say it should be checked on the official site.`);
    return parts.join("\n");
  }
  parts.push(`VERIFIED FROM TICKETMASTER'S OWN LISTING (the operator's ticketing system, not a web page reading): "${ev.name}"${ev.localDate ? `, ${ev.localDate}` : ""}${ev.venue ? `, ${ev.venue}` : ""}${ev.city ? `, ${ev.city}` : ""}.`);
  const price = priceText(ev);
  if (price) parts.push(`REAL TICKET PRICE, so this one may be stated plainly: ${price}. Do not round it or add a currency it did not come with.`);
  if (reconciled.verdict === "cancelled") {
    parts.push("THIS EVENT IS CANCELLED according to Ticketmaster. Do not write it up as something to attend.");
  } else if (reconciled.verdict === "off-sale") {
    parts.push(`TICKETS ARE NOT ON SALE THROUGH TICKETMASTER RIGHT NOW, AND THAT IS NOT THE SAME AS SOLD OUT. ${statusFromCode("offsale").detail} Write it as "not on sale at the moment, check the official site", never as sold out.`);
    // The entry states on sale and was NOT overwritten, so the model is holding
    // two sources that disagree. Told plainly, because the alternative is a
    // sentence that picks one of them and does not say it picked.
    if (reconciled.contradicts) parts.push("THIS ENTRY SAYS TICKETS ARE ON SALE AND IT WAS LEFT THAT WAY: one reseller being off sale is not the event being off sale, and a Danish festival selling through its own site is routinely both at once. Do not write that tickets are unavailable. Say where to buy them and let the reader see for themselves.");
  } else if (reconciled.status === "on_sale") {
    parts.push("Tickets are on sale now, which is a fact and may be stated.");
  } else if (reconciled.verdict === "moved") {
    parts.push(`THE DATE ON FILE IS WRONG: ${reconciled.detail} Leave the date empty rather than repeating the old one.`);
  }
  (reconciled.findings || []).filter(f => f.field === "date").forEach(f => parts.push(`DATE CHECK: ${f.detail}`));
  return parts.join("\n");
};

// ── "IT DOESN'T JUST GO ON AT ONE DATE" ─────────────────────────────
//
// Oliver, 1 Sep 2026, after we both went through the Vanvittig Verdenshistorie
// draft by hand: "we need to somehow make it able to investigate all its
// dates.. because it doesn't just go on at one date. It goes on in multiple
// cities, with multiple dates."
//
// That is the root of every fault in that run, and the two nights of fixes
// above are all symptoms of it. The row is one event. The thing is a tour.
//
// THE REAL DATA, from his own Ticketmaster screenshot:
//
//   5 Sep 2026   Vejle · Bygningen Vejle          paid
//   5 Sep 2026   Aarhus · Festugeparken           gratis   ← the row
//  20 Nov 2026   Slagelse · Slagelse Musikhus     paid
//  21 Nov 2026   Aarhus C · Hermans               paid
//  24 Mar 2027   Odense C · Magasinet             paid
//  27 Mar 2027   København V · Bremen Teater      paid
//
// Two appearances on 5 September in different cities, and two in Aarhus eleven
// weeks apart at different venues and different prices. Every single-date
// assumption in this pipeline breaks on that, and it broke silently: the 30
// August code picked Vejle on a zero-day date match and called it CONFIRMED.
//
// ── WHAT THIS DOES, AND WHAT IT DELIBERATELY DOES NOT ───────────────
//
// It does not restructure the row. Oliver's call, asked directly, was to report
// every date and let him pick, because one row still meaning one date keeps
// every date check in the codebase working while the honest picture reaches
// him. This is the reporting half, and a dates[] on the row can be built on top
// of it later without any of this being wrong.
//
// So: everything found under this name, in date order, with the two facts that
// tell them apart — which city, and what it costs.
const sameCity = (a, b) => {
  const x = fold(String(a || "").trim()), y = fold(String(b || "").trim());
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
};

export const appearances = (candidates, onFile = null) => {
  const list = (Array.isArray(candidates) ? candidates : []).map(readTicketmasterEvent).filter(Boolean);
  const named = list.filter(e => !isAncillaryListing(onFile?.name, e.name) && nameOverlap(onFile?.name, e.name) >= MIN_NAME_OVERLAP);
  const want = cityWanted(onFile);
  const onFileDate = String(onFile?.date || "").slice(0, 10);
  return named
    .filter(e => e.localDate)
    .map(e => ({
      date: e.localDate,
      city: e.city || "",
      venue: e.venue || "",
      url: e.url || "",
      price: priceText(e),
      status: e.statusCode || "",
      // Marked rather than filtered, so the list a person reads is the whole
      // list and the row's own date is findable in it rather than missing.
      here: cityRankOf(e, want) === CITY_MATCH,
      isThisRow: !!onFileDate && e.localDate === onFileDate && cityRankOf(e, want) === CITY_MATCH,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.city).localeCompare(String(b.city))));
};

// ── THE OTHER DATES IN THIS ROW'S OWN CITY ──────────────────────────
//
// The ones that make a reader's decision different. A show playing Odense in
// March is not this entry's business; the same show playing this city again in
// eleven weeks is, and on the Vanvittig row it is the difference between a
// free daytime slot somebody missed and a ticketed evening they can still book.
export const otherDatesHere = (rows, onFile = null) => {
  const onFileDate = String(onFile?.date || "").slice(0, 10);
  return (Array.isArray(rows) ? rows : []).filter(r => r.here && r.date !== onFileDate);
};

// ── "BOTH, SIDE BY SIDE" ────────────────────────────────────────────
//
// Oliver's call on what a reader should see when a free programme slot and a
// paid ticketed date both exist in one city: both. "A reader who missed the
// free one still gets a way to see the show, and it never reads as one price
// contradicting itself."
//
// Written in code rather than asked of a model, because it is arithmetic over
// measured listings — a date, a venue, a price — and the one thing this whole
// pipeline has learned is that a model asked to summarise facts it was handed
// will smooth two of them into one.
export const alsoPlayingLine = (rows, onFile = null) => {
  const others = otherDatesHere(rows, onFile);
  if (!others.length) return "";
  const where = onFile?.city || onFile?.town || "the same city";
  const one = (r) => `${r.date}${r.venue ? ` at ${r.venue}` : ""}${r.price ? `, ${r.price}` : ""}`;
  return others.length === 1
    ? `Also playing ${where} on ${one(others[0])}.`
    : `Also playing ${where} on ${others.map(one).join("; ")}.`;
};

// One line for the run log, naming every appearance so a founder can see the
// tour rather than infer it from a match that came back weak.
export const describeAppearances = (rows) => {
  if (!Array.isArray(rows) || !rows.length) return "";
  return rows
    .map(r => `${r.date} ${r.city || "city not stated"}${r.venue ? ` · ${r.venue}` : ""}${r.price ? ` · ${r.price}` : " · no price on the listing"}${r.isThisRow ? "  ← this row" : r.here ? "  (same city)" : ""}`)
    .join("\n");
};
