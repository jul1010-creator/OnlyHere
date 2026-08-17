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
