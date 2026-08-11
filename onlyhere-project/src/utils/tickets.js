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

import { fold } from "./danishNames";

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

  const onFileDate = String(onFile?.date || "").slice(0, 10);
  if (!onFileDate) {
    // A name match with nothing to confirm the edition against. Real, useful to
    // show a human, and not something to write into a published row.
    const best = named.sort((a, b) => b.overlap - a.overlap)[0];
    return {
      event: best.e, confidence: "weak",
      why: "The name matches, but there is no date on file to confirm this is the same edition, so nothing was written from it.",
    };
  }

  const dated = named
    .map(x => ({ ...x, gap: daysApart(onFileDate, x.e.localDate) }))
    .filter(x => x.gap !== null)
    .sort((a, b) => a.gap - b.gap);

  if (!dated.length) {
    const best = named.sort((a, b) => b.overlap - a.overlap)[0];
    return { event: best.e, confidence: "weak", why: "The name matches but Ticketmaster's listing carries no readable date, so the edition could not be confirmed." };
  }

  const best = dated[0];
  if (best.gap <= SAME_EDITION_DAYS) {
    return { event: best.e, confidence: "strong", why: `Name and date both match: Ticketmaster has it on ${best.e.localDate}, ${best.gap === 0 ? "the same day as" : `${best.gap} ${best.gap === 1 ? "day" : "days"} from`} the date on file.` };
  }
  return {
    event: best.e, confidence: "weak",
    why: `The nearest Ticketmaster listing with this name is ${best.gap} days from the date on file (${best.e.localDate} against ${onFileDate}), so it is probably a different edition and nothing was written from it.`,
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
    // The ambiguous one. It replaces a DEFAULT, never a stated sold_out or free.
    const replaceable = filed === "on_sale" || filed === "unknown";
    findings.push({ severity: "low", field: "ticketInfo", detail: st.detail });
    return {
      ...base,
      status: replaceable ? "off_sale" : filed,
      changed: replaceable && filed !== "off_sale",
      verdict: "off-sale",
      detail: st.detail, findings,
    };
  }

  if (!st.certain && st.status === "unknown") {
    findings.push({ severity: "high", field: "date", detail: st.detail || "Ticketmaster shows this event as moved." });
    return { ...base, verdict: "moved", detail: st.detail, findings };
  }

  return { ...base, verdict: "confirmed", detail: `${st.detail} ${match.why}`, findings };
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
  } else if (reconciled.status === "on_sale") {
    parts.push("Tickets are on sale now, which is a fact and may be stated.");
  } else if (reconciled.verdict === "moved") {
    parts.push(`THE DATE ON FILE IS WRONG: ${reconciled.detail} Leave the date empty rather than repeating the old one.`);
  }
  (reconciled.findings || []).filter(f => f.field === "date").forEach(f => parts.push(`DATE CHECK: ${f.detail}`));
  return parts.join("\n");
};
