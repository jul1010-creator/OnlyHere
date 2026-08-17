// ── WHAT DID THAT ANSWER ACTUALLY REST ON ────────────────────────────
//
// Oliver, 17 Aug 2026: "Can you make the '✦ Argue with this draft' tell me what
// sources it used?"
//
// He asked a version of this once before, on 11 Aug: "Does the 'draft argument'
// section also save the sources?" It did record them and publish deleted them,
// and the answer then was to add __sources to the allow-list. This is the same
// question about the ARGUING rather than the drafting, and the answer has to be
// built differently, because of one thing that would otherwise ruin it.
//
// ── THE MODEL MUST NOT BE THE ONE ATTRIBUTING ───────────────────────
// The obvious build is to ask the assistant to name its sources. That is the
// worst option available. It is handed the entry as JSON, so it can see the
// __sources array, and it has not opened a single one of those pages. Asked
// where a claim came from it will produce "according to visitaarhus.com", which
// reads exactly like a citation and is a guess about which URL probably said the
// thing. A fabricated attribution is worse than no attribution: it is checkable,
// so it will eventually be checked, and it converts an honest answer into a
// false claim about a real company's website.
//
// So nothing here asks a model anything. Every line below is read out of the
// stored payload in code, and the payload is the only thing that knows.
//
// ── AND THE HALF THAT IS WORTH MORE THAN THE CITATIONS ──────────────
// What has NO recorded source. A price nobody traced, hours nobody fetched, a
// correction he asserted himself. Those are the fields an argument should not be
// won with, and listing them is what makes this block worth reading rather than
// decorative. The Pizza by WH draft is the case in point: eight URLs on the row,
// of which one is a Grubhub category page for New York, and a price he corrected
// by hand that no page states.
// hostOf, imported rather than written again. The suite scans for functions
// declared in more than one util and it caught this file adding a FIFTH copy of
// this one within a minute of it being written, which is the same defect
// resolveLegMode, lookupRealPlace and the two heading lists were.
import { hostOf } from "./pageScan";

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const day = (v) => clean(v).slice(0, 10);

// ── THE FIELDS THAT CARRY THEIR OWN ORIGIN ──────────────────────────
// Every one of these is written by a step that actually went and looked, and
// every one is stamped with the day it looked. Ordered by how much an argument
// tends to turn on them: money first, then time, then place.
export const fieldProvenance = (payload) => {
  const p = payload || {};
  const out = [];

  const price = p.__priceSource;
  if (price?.url || price?.price) {
    out.push({
      field: "price",
      by: hostOf(price.url) || clean(price.host) || "a page that was read",
      url: clean(price.url),
      at: day(price.at),
      how: "read off the page itself",
    });
  }

  const dates = p.__dateSource;
  if (dates?.by) {
    out.push({
      field: "dates",
      by: clean(dates.by),
      url: "",
      at: day(dates.at),
      how: Array.isArray(dates.dates) && dates.dates.length
        ? `the dates found were ${dates.dates.map(clean).filter(Boolean).join(", ")}`
        : "read off the page itself",
    });
  }

  const ticket = p.__ticket;
  if (ticket?.source) {
    out.push({
      field: "ticket status",
      by: clean(ticket.source),
      url: clean(ticket.url),
      at: day(ticket.at),
      how: clean(ticket.verdict) || "checked against the ticket seller",
    });
  }

  const hours = p.__hours;
  if (hours?.fetchedAt || (Array.isArray(hours?.hours) && hours.hours.length)) {
    out.push({
      field: "opening hours",
      // The stored marker is a machine string. Said in words, because this block
      // is read by a person deciding whether to trust a number.
      by: clean(hours.source) === "google-places" ? "Google's own business listing" : (clean(hours.source) || "a listing"),
      url: "",
      at: day(hours.fetchedAt),
      how: clean(hours.status) ? `listed status ${clean(hours.status)}` : "the operator's own listing",
    });
  }

  const journey = p.__journey;
  if (journey?.at || Number.isFinite(Number(journey?.total))) {
    out.push({
      field: "the journey from Copenhagen",
      by: "Google Maps",
      url: "",
      at: day(journey.at),
      how: "measured, not estimated",
    });
  }

  const lang = p.__language;
  if (lang?.level && lang.level !== "unknown") {
    out.push({
      field: "language",
      by: "the operator's own pages",
      url: "",
      at: day(lang.at),
      how: `read as ${clean(lang.level)}`,
    });
  }

  return out;
};

// ── A CORRECTION IS NOT A SOURCE, AND ONE OF THEM SAYS SO ───────────
// __corrections carries its own `source` string, and one of its real values is
// "asserted by the founder, not source-verified". That is the single most
// important line in this whole block: a field standing on his own say-so must
// never be mistaken for one standing on a page, least of all by him a month
// later. Printed verbatim, never summarised into something firmer.
export const correctionProvenance = (payload) => {
  const list = Array.isArray(payload?.__corrections) ? payload.__corrections : [];
  const seen = new Set();
  const out = [];
  list.forEach(c => {
    const field = clean(c?.field);
    const by = clean(c?.source);
    if (!field && !by) return;
    const key = `${field}|${by}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ field: field || "the entry", by: by || "not recorded", at: day(c?.at) });
  });
  return out;
};

// ── WHAT A READER MAY BE SHOWN, WHICH IS NOT THIS ───────────────────
//
// Oliver, 17 Aug 2026, highlighting a line on the live Aro page in the reader's own
// "How we know this" panel:
//
//   howItsMade · was: The draft incorrectly states diners can choose three, four,
//   five, or seven courses; there is no four-course option.
//
//   "People will think the draft is incorrect.. don't include this."
//
// He is right twice over.
//
// FIRST, THE LABEL IS A LIE. It says "was:" and the text is not the old value. It
// is the CHECKER'S FINDING, written in the checker's voice, for Studio. Nothing
// ever stored the previous value, so the panel has been printing an argument about
// the draft under a label promising a fact about the past.
//
// SECOND, AND WORSE, IT READS AS A CONFESSION. A visitor lands on the page,
// reads "The draft incorrectly states", and concludes the page in front of them is
// wrong. It says the opposite of what it was built to say: the correction is the
// thing that makes the page trustworthy, and printing the accusation makes it
// evidence against itself.
//
// So the checker's voice never reaches a reader. What a reader gets is the part
// that is actually a trust signal and is entirely true: which field was checked,
// against which page, on which day. Studio keeps the full text, where an argument
// about a draft is exactly what somebody needs.
const CHECKER_VOICE = /\b(?:the draft|the entry|this draft|this entry)\b|\b(?:incorrectly|wrongly|falsely)\s+(?:states|says|claims|lists)\b|\b(?:understates|overstates|omits|fails to|should be (?:specified|stated|corrected)|needs to be (?:fixed|corrected|changed)|was not published because)\b/i;

export const isCheckerVoice = (text) => CHECKER_VOICE.test(String(text || ""));

// One correction, as a reader may see it, or null when there is nothing showable.
// A correction with no source is dropped as well: an unsourced change shown to a
// visitor as evidence is not evidence, and "asserted by the founder" is a sentence
// for Studio rather than for the public page.
export const readerCorrection = (c) => {
  const field = clean(c?.field);
  const source = clean(c?.source);
  if (!field || !source) return null;
  if (!/^https?:\/\//i.test(source)) return null;
  return { field, source, at: day(c?.at) };
};

export const readerCorrections = (payload) => {
  const list = Array.isArray(payload?.__corrections) ? payload.__corrections : [];
  const out = [];
  const seen = new Set();
  list.forEach(c => {
    const r = readerCorrection(c);
    if (!r) return;
    // One line per field and source. Four separate findings about the category,
    // all traced to guide.michelin.com on the same day, is one thing that
    // happened and it read as four.
    const key = `${r.field}|${r.source}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(r);
  });
  return out;
};

// ── AND WHICH OPEN QUESTIONS A READER ACTUALLY CARES ABOUT ──────────
//
// Oliver, 17 Aug 2026, on the reader-facing "What we could not confirm":
//
//   "only include things that are very relevant.. Like 'Specific dishes,
//    techniques, or signature ingredients on the tasting menus aren't detailed in
//    the source material.' who the fk cares..."
//
// He is right, and the reason that line got there is worth naming: the drafting
// prompt asks for an uncertainty per unconfirmed fact, and the model dutifully
// reports what it could not find, INCLUDING facts nobody was going to act on. That
// list is genuinely useful in Studio, where it says where the research is thin. On
// the public page it buries the two lines that matter under five that do not, and
// the section that exists to build trust starts reading as a disclaimer.
//
// THE TEST IS WHETHER IT CHANGES A DECISION. A traveller deciding whether to go is
// deciding about money, time, getting in, getting there, and whether the thing
// exists at all. Those earn a place. "We could not find out which techniques the
// kitchen uses" does not, however true it is.
const READER_RELEVANT = [
  /\b(?:price|prices|pricing|cost|costs|dkk|kr\b|kroner|fee|entry|ticket|tickets|free)\b/i,
  /\b(?:hours|opening|closes|closed|open|season|seasonal|winter|summer|weekday|weekend)\b/i,
  // book, booked, booking: \bbook\b does not match "booked", and "whether a table
  // has to be booked ahead is unconfirmed" is exactly the line this pattern is for.
  /\b(?:book(?:ed|ing)?|reserv(?:e|ed|ation)|sold out|queue|wait(?:ing)?|capacity|full)\b/i,
  /\b(?:date|dates|when|running|runs|cancelled|postponed|permanently|still (?:open|running|operating))\b/i,
  /\b(?:address|located|location|how to get|transport|train|bus|ferry|parking|walk(?:ing)? distance|accessib|wheelchair|step-free)\b/i,
  /\b(?:danish only|in danish|language|english)\b/i,
];

// And the ones that are about OUR RESEARCH rather than about the place. These are
// the ones he pointed at: true, useful internally, and not a fact about the world.
const ABOUT_THE_RESEARCH = /\b(?:source material|the sources?|in the research|research (?:found|did not)|could not be found|no source|not source-verified|unconfirmed by a primary source|applied from your own correction|no mention|not (?:stated|detailed|specified) in)\b/i;

export const readerUncertainty = (text) => {
  const t = clean(text);
  if (!t) return "";
  if (ABOUT_THE_RESEARCH.test(t)) return "";
  return READER_RELEVANT.some(re => re.test(t)) ? t : "";
};

// Four at most. A reader scanning a page will read two and skim the rest, so a
// longer list makes the important ones less likely to be read, not more.
export const READER_UNCERTAINTY_LIMIT = 4;

export const readerUncertainties = (list, { limit = READER_UNCERTAINTY_LIMIT } = {}) => {
  const out = [];
  (Array.isArray(list) ? list : []).forEach(u => {
    const kept = readerUncertainty(u);
    if (!kept) return;
    if (out.some(x => x.toLowerCase() === kept.toLowerCase())) return;
    out.push(kept);
  });
  return out.slice(0, Math.max(0, limit));
};

// The entry's own reading list. Reported as what it is: the pages the research
// pass kept, not evidence for any particular sentence.
export const entrySources = (payload, { limit = 8 } = {}) =>
  (Array.isArray(payload?.__sources) ? payload.__sources : [])
    .map(clean)
    .filter(u => /^https?:\/\//i.test(u))
    .slice(0, Math.max(0, limit));

// ── THE FIELDS AN ARGUMENT SHOULD NOT BE WON WITH ───────────────────
// A field the entry states and nothing recorded an origin for. Only fields that
// are actually present are named, because a missing field is a different problem
// and this block is about trust, not completeness.
const TRACEABLE = [
  { field: "price", keys: ["price", "ticketInfo", "ticketsGlance"], has: (p) => !!p.__priceSource },
  { field: "dates", keys: ["date", "dateStart", "dateEnd"], has: (p) => !!p.__dateSource?.by },
  { field: "ticket status", keys: ["ticketStatus"], has: (p) => !!p.__ticket?.source },
  { field: "opening hours", keys: ["openingHours"], has: (p) => !!p.__hours },
  { field: "travel time", keys: ["travelTime"], has: (p) => !!p.__journey },
];

export const untracedFields = (payload) => {
  const p = payload || {};
  return TRACEABLE
    .filter(t => t.keys.some(k => clean(p[k])) && !t.has(p))
    .map(t => t.field);
};

// ── THE BLOCK ITSELF ────────────────────────────────────────────────
// answeredFrom is the one thing the model cannot be trusted to report and the
// one thing he most needs: an answer read out of the entry and an answer from a
// live search that happened ten seconds ago are different objects, and they look
// identical once they are both text in a chat panel.
export const describeProvenance = (payload, { answeredFrom = "entry", lookupUrls = [] } = {}) => {
  const lines = [];
  lines.push(answeredFrom === "lookup"
    ? "WHERE THIS ANSWER CAME FROM: a live search run just now, because the entry did not contain it."
    : "WHERE THIS ANSWER CAME FROM: this entry's own stored text and the automated checks on it. No new search was run, and no page was opened to answer you.");

  const fresh = (Array.isArray(lookupUrls) ? lookupUrls : []).map(clean).filter(u => /^https?:\/\//i.test(u));
  if (answeredFrom === "lookup" && fresh.length) {
    lines.push(`Pages the search returned: ${fresh.join("  ")}`);
  }

  const fields = fieldProvenance(payload);
  if (fields.length) {
    lines.push("WHAT THIS ENTRY CAN ACCOUNT FOR, field by field:");
    fields.forEach(f => lines.push(`  ${f.field}: ${f.by}${f.at ? `, ${f.at}` : ""}${f.how ? ` (${f.how})` : ""}${f.url ? ` ${f.url}` : ""}`));
  }

  const corrections = correctionProvenance(payload);
  if (corrections.length) {
    lines.push("CHANGED AFTER DRAFTING, and on whose authority:");
    corrections.forEach(c => lines.push(`  ${c.field}: ${c.by}${c.at ? `, ${c.at}` : ""}`));
  }

  const untraced = untracedFields(payload);
  if (untraced.length) {
    lines.push(`NO RECORDED SOURCE, so do not settle an argument with these: ${untraced.join(", ")}.`);
  }

  const sources = entrySources(payload);
  lines.push(sources.length
    ? `The entry kept ${sources.length} ${sources.length === 1 ? "page" : "pages"} as its reading list. These are what the research pass held onto, not evidence for any one sentence:\n  ${sources.join("\n  ")}`
    : "The entry kept no reading list at all, which means nothing it says can be traced to a page from here.");

  return lines.join("\n");
};
