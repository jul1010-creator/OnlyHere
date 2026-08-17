// ── SWEEPS: a small change, applied to many rows, reviewed before it lands ──
//
// Oliver, 8 Aug 2026: "is there a possibility we can create something where we
// just add on these minor changes to all of them? Like in studio clicking
// 'research for bla bla bla' or talking to an AI that are able to do tiny
// changes with them all."
//
// The problem is real and it is not laziness. Seventy-one published entries need
// `placeKind`, `partOf` and `dayTripFrom`, and the only path that can put a
// field into a published row today is a full redraft: research the whole place
// again, rewrite every paragraph, re-verify every figure, to set one word. The
// cost of the change had nothing to do with the size of the change.
//
// A SWEEP is one field, one question, asked of many rows, proposed as a table,
// and written only after he has said yes.
//
// ── WHY THIS IS BUILT MORE CAREFULLY THAN IT LOOKS ──────────────────
// Every bulk operation Studio has today is DETERMINISTIC. backfillPhotos asks
// whether an image 404s. backfillCoordinates asks a geocoder for a coordinate.
// Neither can be confidently wrong; they can only fail to answer.
//
// A sweep can put a model in that loop, and a model can be confidently wrong
// seventy-one times in a row. gemlyx_content has no versioning, no audit log,
// no soft delete and no updated_at: every write is a whole-payload PATCH that
// overwrites without keeping a copy. Before this file existed, a bad bulk pass
// was simply unrecoverable.
//
// So four rules shape everything below, and none of them are negotiable:
//
//   1. NOTHING WRITES UNTIL THE WHOLE PROPOSAL HAS BEEN SEEN. The same rule the
//      assistant already holds (what you review is what you publish), scaled to
//      N rows. A sweep produces proposals; a separate, explicit act writes them.
//
//   2. THE CHEAPEST RESOLVER THAT CAN ANSWER, ANSWERS. Code before the entry,
//      the entry before the internet. Most of these fields never need research.
//
//   3. A FIELD THAT CANNOT BE ANSWERED STAYS EMPTY, AND SAYS SO. The
//      all-or-nothing rule. An unresolved row is reported, never guessed, and
//      never written as "".
//
//   4. EVERY VALUE CARRIES ITS OWN PROVENANCE, PER FIELD. A row is only as
//      trustworthy as its weakest value, and one green tick over a row holding
//      one value read from the entry and one from a web search is a lie told at
//      exactly the moment somebody is deciding whether to accept it.
//
// ── AND THE RULE THAT STOPS THIS BECOMING THE NEXT SILENT FAILURE ───
// Publishing an EDIT bypasses shapeForLive (App.jsx: the stored payload is
// already shaped, and re-shaping it would mangle the built blogBody). So a
// sweep CAN write a field that shapeForLive's allow-list omits. It would save,
// render, and look completely fine, right up until that row is redrafted, at
// which point the allow-list quietly drops it again.
//
// That is bug #2 from 8 Aug with a three-week fuse on it. So:
//
//   A SWEEP MAY ONLY WRITE A FIELD THAT shapeForLive ALREADY CARRIES.
//
// This is not a comment, it is `tests/run.mjs` asserting it for every sweep in
// the registry against the real shapeForLive output.

import { enforceScope } from "./correction";
import { PLACE_KINDS } from "./placeKind";
import { PLACE_THEMES, cleanThemes, MAX_THEMES } from "./placeThemes";
import { citationUrls } from "./aiClient";

const clean = (v) => String(v == null ? "" : v).trim();
const lower = (v) => clean(v).toLowerCase();

// ── the registry ────────────────────────────────────────────────────
// `fields` is the whole safety model. It is handed straight to enforceScope, so
// a resolver that returns anything else has it put back and NAMED, exactly as
// the correction pass does. Adding a field here without adding it to
// shapeForLive fails the build.
export const SWEEPS = [
  {
    id: "taxonomy",
    label: "Place kind, parent and base",
    blurb: "Fills placeKind, partOf and dayTripFrom on town entries that have none. Derives what the data already states, reads the entry for the rest, and only looks things up when neither settles it.",
    types: ["town"],
    fields: ["placeKind", "partOf", "dayTripFrom"],
    // A row is a candidate when it is missing ANY of these. A town with partOf
    // set but no placeKind still has work to do.
    missing: ["placeKind"],
    cap: 40,
    question: "What kind of place is this (city, town, village or area), is it INSIDE a bigger place, and if it is too small to sleep in, where would a visitor actually base themselves?",
  },
  {
    id: "themes",
    label: "What it is for",
    blurb: "Fills the theme chips on entries that have none, so a card says whether somewhere is about nature, history, food or nightlife before anybody clicks it. Read out of the entry's own words.",
    types: ["town"],
    fields: ["themes"],
    missing: ["themes"],
    cap: 40,
    // No research tier: what a place is FOR is a judgement about writing that
    // already exists, not a fact to look up. If the entry does not say it, a web
    // search saying "Ribe is historic" is the model's opinion with a citation
    // stapled on, and it would arrive marked as researched, which is worse than
    // arriving not at all.
    noResearch: true,
    question: `What is this place actually FOR? Choose 1 to ${MAX_THEMES} from EXACTLY this list and nothing else: ${PLACE_THEMES.join(", ")}. Pick only what the entry gives a real reason to go for. Almost every Danish town has a church and a bakery, so history and food belong here only when the entry treats them as a reason to visit rather than as scenery. Fewer is better than more.`,
  },
];

export const sweepById = (id) => SWEEPS.find(s => s.id === id) || null;

// A relationship names a place. `partOf` in particular must name a place GEMLYX
// PUBLISHES, and that is not tidiness: `areasInside` and `dayTripsFrom` match on
// the stored name, and `collapseToParent` counts a route through a place and its
// parent as one stop. A partOf pointing at something with no entry produces a
// dead "Inside X" line and a route count that silently loses a town.
export const RELATION_FIELDS = ["partOf", "dayTripFrom"];

// ── selection ───────────────────────────────────────────────────────
// Pure. `rows` are Supabase rows ({id, type, payload}), not merged live items,
// because a live item carries id = 100000 + the row id and PATCHing that number
// would write to a row that does not exist or, worse, to the wrong one.
export const selectRows = (rows, sweep) => {
  if (!sweep) return [];
  const types = new Set(sweep.types || []);
  return (Array.isArray(rows) ? rows : []).filter(r => {
    if (!r || !r.payload || !clean(r.payload.name)) return false;
    if (types.size && !types.has(r.type)) return false;
    const need = sweep.missing || sweep.fields;
    return need.some(f => !clean(r.payload[f]));
  });
};

// The published places of the types this sweep works on, keyed by lowercase name
// so a proposal can be checked against them and written in THEIR spelling rather
// than whatever case the model or a parenthetical happened to use.
export const knownPlacesFor = (rows, sweep) => {
  const types = new Set(sweep?.types || []);
  const out = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const n = clean(r?.payload?.name);
    if (!n) continue;
    if (types.size && !types.has(r.type)) continue;
    if (!out.has(n.toLowerCase())) out.set(n.toLowerCase(), n);
  }
  return out;
};

// ── NO SILENT CAPS ──────────────────────────────────────────────────
// backfillPhotos established this and it is worth keeping literal: a capped run
// that reports "40 done" when 71 were waiting reads as finished. The number
// skipped is returned, not logged.
export const applyCap = (selected, cap) => {
  const list = Array.isArray(selected) ? selected : [];
  const n = Math.floor(Number(cap));
  if (!Number.isFinite(n) || n <= 0 || list.length <= n) return { batch: list, skipped: 0 };
  return { batch: list.slice(0, n), skipped: list.length - n };
};

// ── tier 1: derived in code, never guessed ──────────────────────────
// placeKind.js:42 is emphatic about the limit here, and it is the right limit:
// "A place is only a village if somebody SAID it is a village." Inferring
// smallness from a name invents the one thing a traveller uses that word to
// decide.
//
// ── WHAT A PARENTHETICAL IS NOT ─────────────────────────────────────
// The first version of this read "Nørresundby (Aalborg)" and wrote
// partOf: "Aalborg", which is right. It also read "Ballen (Samsø)" and wrote
// partOf: "Samsø", which is wrong in the most expensive available way: Ballen
// is a village ON an island, not a district INSIDE a city, and partOf is the
// one relationship that COLLAPSES, so a route through Ballen and Tranebjerg
// would have counted as one stop and quietly lost a town out of a shared trip.
//
// Nothing in the name distinguishes the two. "X (Y)" says these are related; it
// does not say how. So the parenthetical is no longer evidence, it is a PLACE
// TO LOOK: it becomes a hint handed to the tier that can read the entry and
// quote the sentence that settles it.
export const parentheticalHint = (payload, knownPlaces) => {
  const m = clean(payload?.name).match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (!m) return null;
  const bare = clean(m[1]);
  const paren = clean(m[2]);
  if (!paren || !bare || paren.toLowerCase() === bare.toLowerCase()) return null;
  const canonical = knownPlaces?.get?.(paren.toLowerCase());
  if (!canonical) return null;
  return { bare, parent: canonical };
};

// Returns a patch, or null when it has nothing honest to say. The two safe
// derivations only, in placeKind.js's own order.
export const deterministicTaxonomy = (payload, knownPlaces) => {
  const p = payload || {};
  const out = {};
  const notes = [];

  const hint = parentheticalHint(p, knownPlaces);
  if (hint) {
    // Reported, and NOT acted on. The name is also not rewritten: `photo` is
    // slugified from the name at publish, and every other entry pointing at
    // this one does so BY NAME, so a rename inside a bulk pass would break the
    // photo and orphan the references.
    notes.push(`The name carries "(${hint.parent})", which says these two are related but not how: a district inside a city and a village on an island look identical here. Left for the entry to settle. If ${hint.parent} really is the parent, the name should also lose the bracket, which is a separate job because the photo path is slugified from it.`);
  }

  if (!clean(p.placeKind)) {
    if (p.isMajorCity) out.placeKind = "city";
    else if (clean(p.partOf)) out.placeKind = "area";
  }

  return Object.keys(out).length || notes.length ? { patch: Object.keys(out).length ? out : null, notes, hint } : null;
};

// ── A FIELD CAN BE SETTLED WITHOUT BEING FILLED ─────────────────────
// Copenhagen has no partOf and no dayTripFrom, and that is not a gap in the
// data, it is what being a city means. Asking a model "which bigger place is
// Copenhagen inside" invites exactly one kind of answer: a wrong one, delivered
// confidently, because the question presupposes there is one. A real run
// produced "Capital Region of Denmark", which is a region, is not published,
// and would have rendered as "Inside Capital Region of Denmark".
//
// An area's dayTripFrom is closed only once partOf is ACTUALLY THERE. The first
// version closed it on the kind alone, so an entry that came back "area" with
// no parent was never asked where to sleep and ended up with neither.
export const openFields = (sweep, payload, patch) => {
  const merged = { ...(payload || {}), ...(patch || {}) };
  const kind = lower(merged.placeKind);
  return (sweep?.fields || []).filter(f => {
    if (clean(merged[f])) return false;
    if (sweep.id === "taxonomy") {
      if (kind === "city" && (f === "partOf" || f === "dayTripFrom")) return false;
      if (kind === "area" && f === "dayTripFrom" && clean(merged.partOf)) return false;
    }
    return true;
  });
};

// ── tier 2: read out of the entry itself ────────────────────────────
// THE QUOTE IS THE WHOLE POINT. A model asked "is this a village?" will answer
// from its memory of Denmark and dress the answer as a reading of the entry,
// and there is no way to tell the two apart from the outside. So it must return
// the words it read, verbatim, and code checks they are actually in the payload
// before the answer counts.
export const FROM_ENTRY_PROMPT = (payload, question, fields, hint) => `You are reading ONE published Gemlyx entry and answering a question about it USING ONLY WHAT THE ENTRY ITSELF SAYS.

THE ENTRY:
${JSON.stringify(readableEntry(payload), null, 2)}

THE QUESTION:
${question}
${hint ? `\nSOMETHING TO CHECK, NOT TO ASSUME: this entry's name carries "(${hint.parent})" in brackets. That says the two places are related. It does NOT say one is inside the other: a district of a city and a village on an island are written the same way. Only answer partOf if the entry's own words say it is INSIDE ${hint.parent}. A place ON an island, or a short drive away, is not inside anything, and that answer belongs in dayTripFrom instead.\n` : ""}
Fill in only these fields: ${fields.join(", ")}.

THE RULE THAT MATTERS MORE THAN ANSWERING: you may not use anything you know about Denmark. Not the population of a place, not where it is, not whether it is inside a city. If the entry does not say it, you do not know it, however obvious it feels. A confident answer sourced from your own memory is exactly what this tool exists to stop, and it is indistinguishable from a real reading unless you follow the next rule.

FOR EVERY FIELD YOU FILL IN, you must return "quote": the exact words from the entry that told you, copied character for character from the JSON above. Not a paraphrase, not a summary, not a sentence you have tidied up. This is checked automatically against the entry text and an answer whose quote is not literally present is thrown away, so a quote you had to write yourself is worth nothing.

Leave a field as null when the entry does not settle it. Leaving a field null is a correct answer and it is expected to be the common one. Guessing is the only wrong answer available to you.

Reply with ONLY this JSON object, nothing before or after it:
{
${fields.map(f => (f === "themes" ? `  "${f}": ["one to ${MAX_THEMES} of: ${PLACE_THEMES.join(", ")}"],` : `  "${f}": "value or null",`)).join("\n")}
  "quote": "the exact words from the entry that settled it, or null",
  "evidence": "one short sentence saying which field of the entry you read it in"
}`;

// ── WHAT COUNTS AS "THE ENTRY" ──────────────────────────────────────
// Not everything in the payload is prose somebody wrote about the place.
// `__corrections` is the log of things that were WRONG and got fixed, and
// `uncertainties` is the list of things nobody could confirm. Both are stored
// inside the payload. A model quoting either of those passes the quote check
// while citing, literally, a claim recorded because it was false.
//
// The machine fields go too: a quote of "/towns/dragor.jpg" or "Dragør,
// Denmark" is not a reading of anything.
const NOT_PROSE = new Set(["photo", "mapHint", "website", "src", "url", "sourceUrl", "color", "emoji", "uncertainties", "__corrections"]);
const readableEntry = (payload) => {
  const p = payload || {};
  return Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith("__") && !NOT_PROSE.has(k)));
};

// Every prose string in a payload, so a quote can be checked against what
// somebody actually wrote about the place.
//
// JOINED WITH A SENTINEL, NOT A SPACE. With a space, a quote spanning the end of
// one field and the start of the next ("airport approach. Applied from your
// own") matched, and that sentence exists in no field: it is the model
// assembling evidence out of the seam between two of them.
// Written as an escape rather than the literal character: a raw control byte
// in the source makes grep call this a binary file and skip it.
const FIELD_SEAM = "\u0001";
export const entryText = (payload) => {
  const parts = [];
  // Filtered HERE and only here, at every depth. An earlier version also
  // pre-filtered the top level with readableEntry, and the two were doing the
  // same job, so neither could be isolated by a mutation and either could have
  // been deleted silently.
  const walk = (v) => {
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => { if (!k.startsWith("__") && !NOT_PROSE.has(k)) walk(x); });
  };
  walk(payload);
  return parts.join(FIELD_SEAM);
};

// Whitespace and case are allowed to differ, because a model re-wrapping a
// quote across lines is not the failure being guarded against. Everything else
// must match, and it must sit inside one field. A quote under 12 characters is
// rejected outright: "town" appears in almost every entry and proves nothing.
export const quoteIsInEntry = (payload, quote) => {
  const q = lower(quote).replace(/\s+/g, " ");
  if (q.length < 12) return false;
  // ONE mechanism, not two. Whitespace is collapsed so a re-wrapped quote still
  // matches; the seam is deliberately NOT whitespace, so it survives that
  // collapse and a quote reaching across two fields cannot match anything. An
  // earlier version ALSO split on the seam, which did the same job twice and
  // meant neither half could be isolated by a mutation.
  return entryText(payload).toLowerCase().replace(/\s+/g, " ").includes(q);
};

// ── proposals ───────────────────────────────────────────────────────
//   ⚙  derived in code from what the entry already states
//   ✅  read out of the entry, with the words that said so
//   🔎  looked up, with the source
//   ❓  nothing settled it. LEFT ALONE, and reported.
export const MARKS = { deterministic: "⚙", entry: "✅", research: "🔎", unresolved: "❓" };
// Least certain first. A row's summary mark is the weakest of its values,
// because a row is only as trustworthy as the worst thing in it.
const MARK_ORDER = [MARKS.unresolved, MARKS.research, MARKS.entry, MARKS.deterministic];
export const weakestMark = (marks) => {
  const used = (marks || []).filter(Boolean);
  if (!used.length) return MARKS.unresolved;
  return MARK_ORDER.find(m => used.includes(m)) || MARKS.unresolved;
};

// A relationship is a place name, not a sentence. Perplexity answers in prose
// however it is asked, and a real run returned partOf: "None, it is not inside a
// larger place", which passed every check the first version had and would have
// rendered as "Inside None, it is not inside a larger place".
export const looksLikePlaceName = (v) => {
  const s = clean(v);
  if (!s || s.length > 42) return false;
  if (/[,;:.!?"()/]|\d/.test(s)) return false;
  return s.split(/\s+/).length <= 4;
};

// Only real values survive. An empty string is not an answer, a model's idea of
// null is not a value, a placeKind outside the four kinds is a typo the render
// sites would silently swallow, and anything that is not a string is not
// something a human wrote: `{partOf: {name: "Copenhagen"}}` used to become the
// literal text "[object Object]".
export const cleanPatch = (raw, fields, knownPlaces) => {
  const out = {};
  for (const f of fields || []) {
    const val = raw?.[f];
    // Checked BEFORE the string guard below, because this one is legitimately an
    // array. cleanThemes takes an array, a comma-separated string or a single
    // word, keeps only the seven real values, dedupes, and caps the list.
    if (f === "themes") {
      const kept = cleanThemes(val);
      if (kept.length) out[f] = kept;
      continue;
    }
    if (typeof val !== "string" && typeof val !== "number") continue;
    const v = clean(val);
    if (!v || /^(null|none|n\/a|na|unknown|unclear|not applicable|nothing)\.?$/i.test(v)) continue;
    if (f === "placeKind") {
      if (!PLACE_KINDS.includes(v.toLowerCase())) continue;
      out[f] = v.toLowerCase();
      continue;
    }
    if (RELATION_FIELDS.includes(f)) {
      if (!looksLikePlaceName(v)) continue;
      // partOf COLLAPSES route counting and drives `areasInside`, both of which
      // match on the stored name. A parent Gemlyx does not publish is a dead
      // line on the page and a lost stop in a shared trip, so it must name a
      // real one, in that entry's own spelling.
      if (f === "partOf") {
        const canonical = knownPlaces?.get?.(v.toLowerCase());
        if (!canonical) continue;
        out[f] = canonical;
        continue;
      }
      // dayTripFrom renders as plain text, so somewhere unpublished is still a
      // useful answer. Its spelling is normalised when we do know the place.
      out[f] = knownPlaces?.get?.(v.toLowerCase()) || v;
      continue;
    }
    out[f] = v;
  }
  return out;
};

// Nowhere is inside itself and nowhere is a day trip from itself. Both are
// reachable answers for a model filling in "where would you actually sleep" on
// a town that IS the base, and both produce the same visible nonsense the
// 8 Aug review already caught once: a "Where to base yourself: Ribe" line on
// Ribe's own page.
export const dropSelfReferences = (patch, name) => {
  const out = { ...(patch || {}) };
  const self = lower(name);
  for (const f of RELATION_FIELDS) {
    if (lower(out[f]) === self) delete out[f];
  }
  return out;
};

// ── the scope lock, and the audit trail that cannot be written through ──
// enforceScope is given ONLY the sweep's declared fields. __corrections is
// appended afterwards, on purpose: if the audit trail were inside the allowed
// set, a resolver could write its own history.
export const applySweepPatch = (payload, rawPatch, sweep, meta = {}) => {
  const base = payload || {};
  const merged = { ...base, ...(rawPatch || {}) };
  const { patched, reverted } = enforceScope(base, merged, sweep.fields);

  const changed = sweep.fields.filter(f => JSON.stringify(base[f]) !== JSON.stringify(patched[f]));
  if (!changed.length) return { patched: base, changed: [], reverted };

  // Same shape correctEntry writes (correction.js), so one trail records every
  // way a published row has ever been changed rather than two half-trails.
  patched.__corrections = [
    ...(Array.isArray(base.__corrections) ? base.__corrections : []),
    ...changed.map(f => ({
      at: meta.at || "",
      field: f,
      was: base[f] == null || base[f] === "" ? "(empty)" : String(base[f]),
      source: meta.source || `sweep: ${sweep.id}`,
    })),
  ];
  return { patched, changed, reverted };
};

// ── snapshots, which gate everything else ───────────────────────────
// Forty lines, no migration, no new table, and it is the only reason a 71-row
// write is something anyone is allowed to run. `at` is passed in rather than
// read from the clock so this stays pure and testable.
//
// Take the snapshot even when the sweep looks harmless. The passes that need
// undo are the ones that looked harmless.
export const SNAPSHOT_VERSION = 1;

export const buildSnapshot = (sweepId, rows, at) => ({
  gemlyxSnapshot: SNAPSHOT_VERSION,
  sweep: String(sweepId || ""),
  at: String(at || ""),
  rows: (Array.isArray(rows) ? rows : []).map(r => ({ id: r.id, type: r.type, payload: r.payload })),
});

export const snapshotFilename = (sweepId, at) =>
  `gemlyx-snapshot-${String(sweepId || "sweep")}-${String(at || "").replace(/[:.]/g, "-")}.json`;

// Throws rather than returning a half-understood file. A restore that silently
// skipped the rows it could not read would be worse than no restore at all: it
// would report success while leaving the damage in place.
//
// The id check is an INTEGER check, not Number.isFinite, because the restore
// interpolates this value straight into a PostgREST filter. `null`, `""`,
// `false` and `[]` all coerce to 0 and used to sail through, producing
// `?id=eq.null` per row.
const isRowId = (v) => (typeof v === "number" || typeof v === "string") && /^\d+$/.test(String(v).trim());

export const readSnapshot = (text) => {
  let data;
  try { data = typeof text === "string" ? JSON.parse(text) : text; }
  catch (err) { throw new Error(`That file is not valid JSON: ${err.message}`); }
  if (!data || data.gemlyxSnapshot !== SNAPSHOT_VERSION) throw new Error("That is not a Gemlyx snapshot file.");
  if (!Array.isArray(data.rows) || !data.rows.length) throw new Error("That snapshot has no rows in it.");
  const bad = data.rows.findIndex(r => !r || !isRowId(r.id) || !r.payload || typeof r.payload !== "object" || Array.isArray(r.payload));
  if (bad !== -1) throw new Error(`Row ${bad + 1} in that snapshot has no usable id or no payload, so it cannot be restored.`);
  return data;
};

// ── the orchestrator ────────────────────────────────────────────────
// Async because tiers 2 and 3 talk to the network, but it writes NOTHING. It
// returns proposals. The write pass is a separate, explicit act in App.jsx, and
// keeping them apart is what makes rule 1 structural rather than a habit.
//
// deps: { askClaude, askPerplexity, parseJSON, onProgress, allowResearch, isCancelled }
export const proposeSweep = async ({ sweep, rows, knownPlaces, deps = {} }) => {
  const { askClaude, askPerplexity, parseJSON, onProgress, allowResearch = true, isCancelled } = deps;
  const proposals = [];
  const places = knownPlaces instanceof Map ? knownPlaces : new Map();

  for (let i = 0; i < rows.length; i++) {
    if (isCancelled?.()) break;
    const row = rows[i];
    const p = row.payload || {};
    onProgress?.({ done: i, total: rows.length, name: p.name });

    let patch = {};
    const marks = {};       // field -> mark. Rule 4: provenance is per value.
    const evidence = {};    // field -> why
    const sources = {};     // field -> url
    const notes = [];
    let hint = null;

    // Tier 1. Free, instant, and either right or absent.
    if (sweep.id === "taxonomy") {
      const det = deterministicTaxonomy(p, places);
      if (det?.notes?.length) notes.push(...det.notes);
      hint = det?.hint || null;
      if (det?.patch) {
        const found = cleanPatch(det.patch, sweep.fields, places);
        for (const f of Object.keys(found)) { patch[f] = found[f]; marks[f] = MARKS.deterministic; evidence[f] = "Derived from what the entry already states."; }
      }
    }

    // Tier 2. Cheap, and the quote is checked before it counts. Recomputed
    // rather than filtered, because tier 1 may have closed a field instead of
    // filling it.
    const stillNeed = openFields(sweep, p, patch);
    if (stillNeed.length && askClaude) {
      const res = await askClaude(FROM_ENTRY_PROMPT(p, sweep.question, stillNeed, hint), 700, "claude-sonnet-5", true);
      if (!res.error && res.text) {
        let parsed = null;
        try { parsed = parseJSON ? await parseJSON(res.text) : JSON.parse(res.text); } catch { parsed = null; }
        const found = cleanPatch(parsed, stillNeed, places);
        if (Object.keys(found).length) {
          if (quoteIsInEntry(p, parsed?.quote)) {
            const why = [clean(parsed?.evidence), `"${clean(parsed.quote).slice(0, 140)}"`].filter(Boolean).join(" ");
            for (const f of Object.keys(found)) { patch[f] = found[f]; marks[f] = MARKS.entry; evidence[f] = why; }
          } else {
            // Reported, not silently dropped. This is the single most useful
            // line in the whole run: it is the model answering from memory,
            // caught, and it should be visible when it happens often.
            notes.push(`Answered ${Object.keys(found).join(", ")} without a quote that is actually in the entry, so it was not used.`);
          }
        }
      }
    }

    // Tier 3. Paid, and only for what is genuinely left. Recomputed again: a
    // partOf that arrived from the entry has just closed dayTripFrom.
    const lastNeed = openFields(sweep, p, patch);
    if (lastNeed.length && allowResearch && !sweep.noResearch && askPerplexity) {
      const res = await askPerplexity(RESEARCH_PROMPT(p.name, sweep.question, lastNeed));
      if (!res.error && res.text) {
        const found = cleanPatch(parseLooseFields(res.text, lastNeed), lastNeed, places);
        // citationUrls, not a string filter: the citations are objects and this
        // line recorded an empty source for every researched sweep value.
        const url = citationUrls(res)[0] || "";
        for (const f of Object.keys(found)) { patch[f] = found[f]; marks[f] = MARKS.research; evidence[f] = clean(res.text).slice(0, 200); sources[f] = url; }
      }
    }

    patch = dropSelfReferences(cleanPatch(patch, sweep.fields, places), p.name);
    for (const f of Object.keys(marks)) { if (!(f in patch)) { delete marks[f]; delete evidence[f]; delete sources[f]; } }

    const fieldList = Object.keys(patch);
    proposals.push({
      rowId: row.id,
      type: row.type,
      name: p.name,
      before: Object.fromEntries(sweep.fields.map(f => [f, p[f] ?? ""])),
      patch,
      detail: fieldList.map(f => ({ field: f, value: patch[f], mark: marks[f] || MARKS.research, evidence: evidence[f] || "", sourceUrl: sources[f] || "" })),
      mark: weakestMark(fieldList.map(f => marks[f])),
      notes,
      // Unresolved rows are never pre-ticked. A row nothing could answer must
      // take a deliberate act to write, if it can be written at all.
      accepted: fieldList.length > 0,
    });
  }
  onProgress?.({ done: rows.length, total: rows.length });
  return proposals;
};

export const RESEARCH_PROMPT = (name, question, fields) => `Using real, current web search, answer this about ${name || "this place"} in Denmark.

${question}

Answer ONLY these: ${fields.join(", ")}.

placeKind must be exactly one of: city, town, village, area. Use "area" only for somewhere INSIDE a larger place, like a district or a quarter or a named waterfront. A town twelve kilometres outside a city is not inside it, and a village on an island is not inside the island.
partOf is only for a place that is genuinely within another place's boundary. A region, a municipality and a province are NOT parents: nobody says they are staying "in the Capital Region".
dayTripFrom is where a visitor would actually sleep, and only when the place itself is too small to stay in.

Every answer must be a plain place name and nothing else. Do not explain, do not qualify, do not write a sentence. If a source does not settle one of these, write exactly "unknown" for it. "unknown" is a correct answer here and a guess is not.

Reply as plain lines, one per field, nothing else:
${fields.map(f => `${f}: value`).join("\n")}`;

// Perplexity answers in prose whatever the format asked for, so this reads
// "field: value" lines out of whatever came back rather than demanding JSON
// from a model that is not reliably going to produce it. The field name is
// escaped before it becomes a pattern: it is data here, not a regex, and a
// future sweep declaring a field with a bracket in it would otherwise throw
// and discard the whole run.
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const parseLooseFields = (text, fields) => {
  const out = {};
  const t = String(text || "");
  for (const f of fields || []) {
    const m = t.match(new RegExp(`^\\s*[*-]?\\s*\\**${escapeRe(f)}\\**\\s*[:=]\\s*(.+)$`, "im"));
    if (m) out[f] = m[1].replace(/[*_`]/g, "").replace(/\.$/, "").trim();
  }
  return out;
};
