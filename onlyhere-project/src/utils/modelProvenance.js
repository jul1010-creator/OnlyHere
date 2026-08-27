// ── "AREN'T NIGHTLIFE BEING WRITTEN BY OPENAI?" ─────────────────────
//
// Oliver, 27 Aug 2026, and then: "nightlife was clearly written by OpenAI and
// not claude.. so fix any [content] that happens to be written by ChatGPT."
//
// He was reading entries and inferring the model from the voice. That he had to
// is the actual problem this file fixes: the split is real, it is deliberate,
// it is documented at length in glanceExtract.js — and it is invisible from
// anywhere a person can stand. Every other origin in this app is recorded and
// shown. A price carries __priceSource, a date carries __dateSource, a travel
// time carries __journey, and provenance.js prints them. WHICH MODEL WROTE THIS
// SENTENCE was the one origin nobody could answer without reading App.jsx.
//
// ── AND THE ANSWER, FOR THE RECORD ──────────────────────────────────
//
// The draft pipeline runs three model stages and they are not equal:
//
//   1. OpenAI plans the search queries        (no reader ever sees this)
//   2. OpenAI STRUCTURES the raw research into point-form notes
//   3. CLAUDE writes every paragraph from those notes
//   then OpenAI extracts the At a Glance data values, and OpenAI FLAGS
//   awkward phrasing which CLAUDE then rewrites.
//
// So: the prose is Claude's. Two glance VALUES on a nightlife entry are
// OpenAI's — priceNote and accessibility — and they are extraction rather than
// writing, which is the argument glanceExtract.js makes at length and which
// this file does not reopen.
//
// BUT STAGE 2 IS THE ONE THAT MATTERS AND IT IS THE ONE NOBODY SEES. Claude
// writes from notes OpenAI chose. It cannot put back a fact the organiser threw
// away, so on any entry whose research is mostly about something other than the
// subject, the organiser has already decided what the entry is about. That is
// exactly the hostel-bar failure in utils/venueSubject.js, and it is why the
// steer there had to go into BOTH prompts rather than only the writer's.
//
// ── DERIVED, NEVER WRITTEN DOWN TWICE ───────────────────────────────
//
// glanceExtract.js states the rule it lives by: "Every list in this codebase
// that was written down twice has drifted, three of them found in one night."
// So this file computes its answer from THAT file's own constants. A field that
// moves between models moves here in the same commit, or it does not move.
import { EXTRACTABLE_GLANCE, EDITORIAL_GLANCE, NEVER_EXTRACT, CLOSED_OR_DERIVED } from "./glanceExtract";

export const WRITER = "claude";
export const EXTRACTOR = "openai";
export const MEASURED = "measured";

// The prose fields, by the only definition that cannot drift: a string field on
// the draft that is not a glance field of any kind. Those are the paragraphs,
// and Claude writes all of them.
const isGlanceField = (f) =>
  EXTRACTABLE_GLANCE.includes(f) || EDITORIAL_GLANCE.includes(f) ||
  NEVER_EXTRACT.includes(f) || CLOSED_OR_DERIVED.includes(f);

// Machinery, not content. Anything the pipeline stamps on for its own use.
const isMachinery = (f) => String(f).startsWith("__") || f === "id" || f === "name";

// ── WHO WROTE WHAT, FOR ONE DRAFT ───────────────────────────────────
//
// Reads the draft's own keys rather than a table of types, for the same reason
// glanceFieldsFor does: a type that gains a field is answered correctly here
// with no edit, and a type that never had one is never claimed.
export const whoWrote = (draft) => {
  const d = draft && typeof draft === "object" ? draft : {};
  const out = { [WRITER]: [], [EXTRACTOR]: [], [MEASURED]: [] };
  for (const f of Object.keys(d)) {
    if (isMachinery(f)) continue;
    // A field the draft carries but has not filled says nothing about who would
    // have filled it, and listing it would credit a model with an empty string.
    const v = d[f];
    const filled = Array.isArray(v) ? v.length > 0 : String(v ?? "").trim() !== "";
    if (!filled) continue;
    if (NEVER_EXTRACT.includes(f)) { out[MEASURED].push(f); continue; }
    if (EXTRACTABLE_GLANCE.includes(f)) { out[EXTRACTOR].push(f); continue; }
    // EDITORIAL_GLANCE, CLOSED_OR_DERIVED and every prose field alike: the
    // writer's. glanceExtract sends all three back to the writer by name.
    out[WRITER].push(f);
  }
  return out;
};

// ── THE LINE A FOUNDER READS ────────────────────────────────────────
//
// Names the fields rather than the counts, because "3 fields by OpenAI" is a
// statistic and "priceNote and accessibility came from the extractor" is
// something he can go and check. Same reason literalNote quotes the phrase.
export const modelProvenanceNote = (draft) => {
  const w = whoWrote(draft);
  const openai = w[EXTRACTOR];
  if (!openai.length) return "WHO WROTE THIS: every word of it is Claude's, working from research notes OpenAI organised.";
  return `WHO WROTE THIS: the prose is Claude's. ${openai.length === 1 ? "One value was" : `${openai.length} values were`} read out of the research by OpenAI rather than written — ${openai.join(", ")} — and OpenAI also chose which facts survived into the notes Claude wrote from, which is the stage that decides what an entry ends up being about.`;
};

// ── AND THE STAGES THEMSELVES, DECLARED ONCE ────────────────────────
//
// So the suite can assert that the pipeline still does what this file says it
// does, rather than this file becoming a comment that used to be true. Each
// entry names the call the stage is made with, and the test looks for it.
export const DRAFT_STAGES = [
  { id: "plan", model: EXTRACTOR, call: "askOpenAI", what: "plans the search queries", readerFacing: false },
  { id: "structure", model: EXTRACTOR, call: "askOpenAI", what: "organises the raw research into notes", readerFacing: false },
  { id: "write", model: WRITER, call: "askClaude", what: "writes every paragraph, from those notes", readerFacing: true },
  { id: "polish-flag", model: EXTRACTOR, call: "askOpenAI", what: "flags awkward phrasing", readerFacing: false },
  { id: "polish-rewrite", model: WRITER, call: "askClaude", what: "rewrites what was flagged", readerFacing: true },
  { id: "glance", model: EXTRACTOR, call: "askOpenAI", what: "reads the At a Glance values out of the research", readerFacing: true },
];

// The reader-facing stages, which are the only ones a voice complaint can be
// about. Two of the three are Claude; the third writes values, not sentences.
export const readerFacingStages = () => DRAFT_STAGES.filter(s => s.readerFacing);
