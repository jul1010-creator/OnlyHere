// ── AT A GLANCE IS DATA, SO IT IS EXTRACTED RATHER THAN WRITTEN ─────
//
// Oliver, 13 Aug 2026: "in the 'at a glance' section, there is not requirement
// for Claude to write it all friendly.. 'at a glance' is important data."
// And then: "Perhaps let OpenAI use all the data to setup the 'at a glance'
// section. And then Claude writes everything else."
//
// He is right, and the cost of the old split is measurable. entryAudit.js
// carries about eleven thousand characters of machinery whose entire job is
// cleaning up after a prose model writing into data fields: glanceLeak,
// cleanGlance, repairGlance, glanceProblems and the SEARCH_REPORT patterns.
// Sentences leak in because a writer writes sentences. "not found on the
// official site". "at the time of writing". "check rejseplanen".
//
// An extractor does not write sentences. It returns the value that is on the
// page, or it returns nothing. Most of those leak classes stop being POSSIBLE
// rather than being repaired afterwards.
//
// ── THREE TIERS, NOT TWO, AND THIS FILE IS THE MIDDLE ONE ───────────
//
//   MEASURED    travelTime, nearestStation, lat, lon, ticketStatus, the
//               journey, the hours. Code writes these. No model of any kind
//               touches them, and handing them to an extractor would be a step
//               BACKWARDS from what the pipeline already does. Never in here.
//
//   EXTRACTED   a value that already exists verbatim in the research and needs
//               FINDING, not composing. A price, a duration, an accessibility
//               note. This file.
//
//   WRITTEN     the three paragraphs, desc, and gemlyxFind. Claude.
//
// gemlyxFind sits inside the At a Glance block and is deliberately NOT here.
// "ONE specific curated recommendation only Gemlyx would flag" is judgement,
// not data, and an extractor would return the first thing on the page. Same for
// tag and highlight: those are the entry's voice in three words.

// ── THE FIELD LIST IS DERIVED, NOT WRITTEN DOWN TWICE ───────────────
// Every list in this codebase that was written down twice has drifted, three of
// them found in one night. So the extractable set is GLANCE_FIELDS minus the
// two exclusions, computed once, and the fields asked for on any given draft
// are the intersection with the keys the draft ACTUALLY HAS. A type that gains
// a glance field gets it extracted with no edit here, and a type that never had
// one is never asked about it.
import { GLANCE_FIELDS } from "./entryAudit";
import { MEASURED_FIELDS } from "./correction";
import { looksUntranslated, danishWordsIn } from "./languageBarrier";

// Measured elsewhere, by code, from an API. Listed beyond MEASURED_FIELDS
// because ticketStatus and the coordinates are owned the same way even though
// they are not glance fields on every type.
export const NEVER_EXTRACT = [...MEASURED_FIELDS, "ticketStatus", "lat", "lon"];

// The entry's voice rather than its data. An extractor handed "tag" returns
// whatever noun phrase the page used about itself, which is a tourism board
// writing Gemlyx's card for it.
export const EDITORIAL_GLANCE = ["tag", "highlight", "crowd", "gemlyxFind"];

// ── AND A THIRD KIND, WHICH I MISSED FIRST TIME ─────────────────────
//
// Found reviewing my own file on 14 Aug, before it had run on these types.
// Two of the sixteen fields the derivation produced are CLOSED VOCABULARIES and
// one has a composed shape, and an extractor returns none of those. It returns
// what a page says.
//
//   bookingType   'online' or 'contact', and nothing else. The prompt asks for
//                 "'online' ONLY if you can book/buy tickets on a website".
//                 That is a determination about a website, not a phrase lying
//                 on one, and an extractor handed it returns "Book online at
//                 billetto" or "kontakt os". The UI FILTERS on this field.
//   budgetLevel   'Budget', 'Mid-range' or 'Splurge', and the prompt says it in
//                 as many words: "YOUR HONEST READ given the real price info".
//                 A judgement derived from prices. No page states it, so an
//                 extractor either returns nothing or invents one, and
//                 numbersTraceable cannot catch an invented WORD.
//   location      "Neighbourhood, City". A shape assembled from two facts, not
//                 a string to be found. An address lands here otherwise, and
//                 the town matching and travel labels read this field.
//
// This is the same wound the 12 August audit already recorded, where "Local
// Favourite" was an offered answer the UI rendered as its near-opposite and
// which matched no filter anywhere. A closed vocabulary filled from free text
// stops being closed, and nothing downstream is built to notice.
//
// They go back to the writer, which is where a judgement belongs.
export const CLOSED_OR_DERIVED = ["bookingType", "location"];

export const EXTRACTABLE_GLANCE = GLANCE_FIELDS
  .filter(f => !NEVER_EXTRACT.includes(f))
  .filter(f => !EDITORIAL_GLANCE.includes(f))
  .filter(f => !CLOSED_OR_DERIVED.includes(f));

// Only what this draft actually carries. `undefined` means the type has no such
// field and asking for it invites an answer to a question nobody asked.
export const glanceFieldsFor = (draft) =>
  EXTRACTABLE_GLANCE.filter(f => typeof (draft || {})[f] !== "undefined");

// ── THE PROMPT ──────────────────────────────────────────────────────
// Short on purpose, and that is the point of the whole change. The writing
// brief is four thousand words because prose needs a voice, a structure and a
// list of things not to say. Extraction needs none of that. It needs the
// research, the field names, and one rule about silence.
//
// EMPTY IS A RESULT. Every field this returns is one a reader plans around, and
// the failure that produced glanceLeak in the first place was a model filling a
// box because the box was there. So the instruction that carries the most
// weight here is the permission to return nothing, said first and said plainly.
export const GLANCE_EXTRACT_PROMPT = (name, type, fields, research) =>
  `Read the research below about "${name}" in Denmark and pull out the At a Glance values for a ${type} entry.

You are EXTRACTING, not writing. Every value must already be stated in the research. Do not compose, do not summarise across sources, do not infer, and never smooth two different figures into one.

IF THE RESEARCH DOES NOT STATE A FIELD, RETURN AN EMPTY STRING FOR IT. That is a correct and expected answer, not a failure, and it is always better than a plausible guess. A reader plans around these values.

Each value is a VALUE, not a sentence about a search. Never write "not found", "not listed", "could not be confirmed", "at the time of writing", "see website" or "check rejseplanen". If you would write any of those, return an empty string instead.

WRITE EVERY VALUE IN ENGLISH. The research is usually in Danish and the entry is read in English, so translating is part of extracting, not a liberty you are taking: "Dagsbillet 395 kr" is "Day ticket 395 DKK", "gratis adgang" is "free entry", "2-3 timer" is "2 to 3 hours", "priser er eks. gebyrer" is "prices exclude booking fees". Danish proper nouns stay exactly as they are spelled, because a hotel, a street or a stage is called what it is called. A value left in Danish is a value that was not finished and it will be refused.

Keep the wording the source used for numbers and units. A price stays the price the page charges: never round it, never convert it, never turn a list of ticket tiers into an average. If the page states a range across tiers, give the range.

Where a figure is conditional (a members' rate, a child ticket, an early-bird), the value is the ORDINARY adult price, and the condition belongs in the same string only if it cannot be separated.

Respond with ONLY strict JSON, no markdown fence and no commentary, with exactly these keys:
${JSON.stringify(Object.fromEntries(fields.map(f => [f, ""])), null, 0)}

Research:
${research}`;

// ── READING IT BACK ─────────────────────────────────────────────────
// Strict about shape and forgiving about wrapping, because the failure mode
// that matters is a value reaching a field, not a fence reaching a parser.
//
// A key that was not asked for is DROPPED rather than kept. A model that
// invents a field name has invented a field, and this pipeline has been eaten
// four times by a value that existed in one place and nowhere else.
export const readGlanceExtract = (text, fields) => {
  const t = String(text || "").trim();
  if (!t) return { ok: false, values: {}, why: "no text came back" };
  const fenced = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = fenced.indexOf("{"), end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return { ok: false, values: {}, why: "no JSON object in the reply" };
  let obj;
  try { obj = JSON.parse(fenced.slice(start, end + 1)); }
  catch { return { ok: false, values: {}, why: "the reply was not valid JSON" }; }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, values: {}, why: "the reply was not an object" };
  }
  const values = {};
  for (const f of fields) {
    const v = obj[f];
    // A number is a legitimate answer to a price and it must not be coerced
    // into "45" and then read back as a string that happens to look numeric.
    if (typeof v === "string") values[f] = v.trim();
    else if (typeof v === "number" && Number.isFinite(v)) values[f] = String(v);
    else values[f] = "";
  }
  return { ok: true, values, why: "" };
};

// ── AND WHAT IS ALLOWED TO CHANGE ───────────────────────────────────
//
// Three rules, and the second is the one that keeps this safe to turn on.
//
//   1. A MEASURED FIELD IS NEVER TOUCHED. Not by this and not by anything.
//      The list is imported rather than retyped.
//   2. AN EMPTY EXTRACTION NEVER BLANKS A FIELD. The extractor reads the same
//      research the writer read, so "I did not find it" is a statement about
//      this call and not about the research. Silence loses to anything.
//   3. Otherwise the extraction wins, because that is the entire point: for a
//      value that is on the page, finding it beats phrasing it.
//
// Returns what changed as well as the payload, so a run log can say which
// fields an extractor took over and a person can see it happening rather than
// inferring it from a diff.
// ── AND EXTRACTION IS CHECKED, NOT REQUESTED ────────────────────────
//
// The prompt above tells the model it is extracting rather than writing. That
// is a REQUEST, and this codebase's own rule is that a request has a failure
// rate while code does not. So the claim is verified.
//
// Not by string equality, which would be wrong here on purpose. The research is
// in Danish and the entry is in English: a page saying "gratis adgang" should
// absolutely become "free entry", and a rule demanding the characters match
// would reject the correct answer on every Danish source. Translation IS
// extraction.
//
// WHAT CANNOT CHANGE IN TRANSLATION IS THE NUMBERS. 180 kr is 180 DKK in any
// language, "2-3 timer" is "2 to 3 hours", and a figure the research does not
// contain was not found, it was composed. That is the failure worth catching
// and it is the only one a reader plans around.
//
// Digits are compared with separators removed, because a Danish page writes
// 1.500 kr for one thousand five hundred and an English field writes 1,500 or
// 1500. Three spellings of one number must not read as an invention.
const digitsOf = (s) => (String(s || "").match(/\d[\d.,]*/g) || [])
  .map(n => n.replace(/[.,](?=\d{3}\b)/g, "").replace(/[.,]$/, ""))
  .filter(Boolean);

export const numbersTraceable = (value, research) => {
  const want = digitsOf(value);
  if (!want.length) return { ok: true, missing: [] };
  const have = new Set(digitsOf(research));
  const missing = want.filter(n => !have.has(n));
  return { ok: missing.length === 0, missing };
};

export const mergeGlance = (draft, values, fields, research = "") => {
  const before = draft || {};
  const out = { ...before };
  const changed = [], kept = [], blocked = [], rejected = [];
  for (const f of fields) {
    if (NEVER_EXTRACT.includes(f)) { blocked.push(f); continue; }
    const next = String(values?.[f] ?? "").trim();
    const prev = String(before[f] ?? "").trim();
    if (!next) { if (prev) kept.push(f); continue; }
    if (next === prev) continue;
    // Only when there is research to check AGAINST. With none, refusing every
    // value would be accusing an extraction of something unknowable, which is
    // the same discipline tracePrices and coordProblems already follow.
    // ── AND ENGLISH IS CHECKED, NOT REQUESTED EITHER ─────────────
    // Oliver, 15 Aug 2026: "Why is some written in Danish?" ticketInfo read
    // "Dagsbillet 395.00,- DKK; Partoutbillet 695.00,- DKK. Priser er eks.
    // gebyrer." on a festival card, and the run log presented it as a success:
    // "believed the research (extracted), overruled the writer", whose own
    // English version, "Day tickets 395 DKK (Fri/Sat/Sun), festival pass 695
    // DKK, all excluding booking fees. Under-12s enter free", was thrown away.
    //
    // The comment forty lines above already said translation IS extraction and
    // that only the numbers are checked. Both halves were true and together
    // they are the bug: a value that skipped the translation passed the only
    // test there was, and beat a correct English sentence on the strength of
    // being "extracted".
    //
    // Refused rather than translated here. This is a merge, not a writer, and
    // the writer's value is still sitting in `prev` having been written in
    // English by a model that read the same research. Falling back to it is
    // both the safer answer and the better one.
    if (looksUntranslated(next)) {
      rejected.push({ field: f, value: next, untranslated: danishWordsIn(next) });
      continue;
    }
    if (research) {
      const trace = numbersTraceable(next, research);
      if (!trace.ok) {
        rejected.push({ field: f, value: next, missing: trace.missing });
        continue;
      }
    }
    out[f] = next;
    changed.push({ field: f, was: prev, now: next });
  }
  return { patched: out, changed, kept, blocked, rejected };
};

// ── AND THE UNCERTAINTY THAT SAID THE FIELD WAS EMPTY ────────────────
//
// Oliver's Gothersgade draft, 16 August 2026. Its DECISIONS block reads:
//
//   priceNote: believed the research (extracted), overruled an empty field
//     value: Free entry
//     rule:  A value stated on a page beats one composed by a writer
//
// The rule is right and it was applied correctly. What nobody did was go back for
// the SENTENCE THE WRITER HAD ALREADY WRITTEN ABOUT THAT FIELD BEING EMPTY:
//
//   "No cover charge or typical beer price for the street was found in research,
//    so priceNote is left empty"
//
// So the published row says priceNote is "Free entry" and says in its own
// uncertainties that priceNote is empty. Both in front of a reader, contradicting
// each other, and STUDIO_VOICE's first reasoning check is "every field must agree
// with every other field in the same response".
//
// This is the same failure the invented-claim correction has one file over: a
// stage fixes something and nothing re-reads what the fix made false. An
// uncertainty is the honesty channel, so a FALSE one costs more than a missing
// one: it teaches a reader that the caveats are decoration.
//
// ── DELIBERATELY CONSERVATIVE ABOUT WHAT IT REMOVES ──────────────────
// The emptiness phrase has to sit NEAR the field name, so "so priceNote is left
// empty" goes and "priceNote covers entry only, drink prices unconfirmed" stays.
// When the two are far apart the line is kept, because a stale uncertainty is a
// smaller wrong than a deleted true one, and this returns what it would remove so
// the caller can report it rather than doing it silently.
const EMPTINESS = /(left empty|is empty|left blank|left out|not found|no value|could not be found|was not found|none was found|nothing was found|unconfirmed, so|omitted)/i;
const NEAR_FIELD = 60;

export const staleUncertainties = (uncertainties, changed) => {
  const lines = (Array.isArray(uncertainties) ? uncertainties : []).map(u => String(u ?? ""));
  const fields = (Array.isArray(changed) ? changed : [])
    .map(c => String(c?.field ?? c ?? "")).filter(Boolean);
  if (!fields.length) return { kept: lines, stale: [] };
  const kept = [], stale = [];
  for (const line of lines) {
    const hit = fields.find(f => {
      const at = line.toLowerCase().indexOf(f.toLowerCase());
      if (at < 0) return false;
      // A window either side of the field name, because both orders occur in
      // real drafts: "so priceNote is left empty" and "left empty: priceNote".
      const from = Math.max(0, at - NEAR_FIELD);
      return EMPTINESS.test(line.slice(from, at + f.length + NEAR_FIELD));
    });
    if (hit) stale.push({ line, field: hit }); else kept.push(line);
  }
  return { kept, stale };
};

// The founder note. Never silent, for the reason the discovery panel is never
// silent: a list that got shorter without saying so is how a filter becomes a
// thing nobody trusts.
export const describeStale = (stale) => {
  const list = Array.isArray(stale) ? stale.filter(Boolean) : [];
  if (!list.length) return "";
  const which = [...new Set(list.map(s => s.field))].join(", ");
  return `${list.length} uncertaint${list.length === 1 ? "y was" : "ies were"} removed for having gone false: the extraction filled ${which}, and ${list.length === 1 ? "this line" : "these lines"} still said the field was left empty. A row cannot state a value and state in its own uncertainties that it has none. Removed rather than kept, because a false caveat teaches a reader the caveats are decoration, and reported here rather than dropped quietly: ${list.map(s => `"${s.line.slice(0, 90)}"`).join("; ")}`;
};

// One line for the run log. Says what it took over and what it left alone,
// because a stage that silently rewrites six fields is the kind of thing that
// is discovered a month later by somebody reading a diff.
export const describeGlance = (r) => {
  if (!r) return "";
  const parts = [];
  if (r.changed?.length) parts.push(`${r.changed.length} field${r.changed.length === 1 ? "" : "s"} taken from the research: ${r.changed.map(c => c.field).join(", ")}`);
  if (r.kept?.length) parts.push(`${r.kept.length} left as the writer had ${r.kept.length === 1 ? "it" : "them"}, because the extraction came back empty: ${r.kept.join(", ")}`);
  // Said out loud rather than swallowed. A refused extraction means a figure
  // was composed rather than found, and that is the single most useful thing
  // this stage can report about itself.
  if (r.rejected?.length) parts.push(`${r.rejected.length} refused, because ${r.rejected.length === 1 ? "a figure in it is" : "figures in them are"} not in the research at all: ${r.rejected.map(x => `${x.field} (${x.missing.join(", ")})`).join(", ")}`);
  return parts.join(". ") || "nothing to change";
};
