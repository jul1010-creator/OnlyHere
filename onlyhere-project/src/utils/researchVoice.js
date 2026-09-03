// ── THE PIPELINE TALKING TO ITSELF, IN FRONT OF A TRAVELLER ─────────
//
// Found by reading the live Towns page on 1 Sep 2026. Hyllested Skovgårde's
// card, published, in the slot where the town's pitch goes:
//
//   "The claim is not confirmed by the checked sources. It suits someone
//    already driving through…"
//
// That first sentence is a VERIFICATION NOTE. It is about our research, not
// about the village, and a reader has no idea what claim is meant or who
// checked what. It reads as the town being dubious.
//
// ── NOT THE SAME FAULT AS launderedAbsence ──────────────────────────
//
// entryAudit's launderedAbsence catches the opposite direction: prose that
// states an absence the research only failed to confirm — "no single big annual
// festival" about a city with the largest carnival in Scandinavia. There the
// hedge is MISSING and should be there. Here the hedge IS the sentence, in a
// field that should be describing a place. Same family, opposite sign, and
// neither detector sees the other's case.
//
// ── CLEANED ON THE WAY IN, WHICH THIS FILE ALREADY ARGUED FOR ───────
//
// liveContent.js on stripDashesDeep: "Cleaning on the way IN fixes all 55
// without touching the database and holds for anything published later,
// including anything published by a path that forgets." Exactly the same shape,
// so exactly the same place. The stored row is untouched and the audit still
// reports it, so the row gets properly rewritten rather than quietly patched
// forever.
import { PROSE_FIELDS } from "./entryAudit";
// The budget and the word list live beside fillerWordCounts, which is where
// the rule was written down in August. A second copy here would drift from it.
import { trimFillerRuns } from "./helpers";

// ── BOTH HALVES REQUIRED, AND THAT IS THE WHOLE SAFETY ──────────────
//
// This DELETES READER CONTENT, so a false positive costs more than a miss. A
// verification verb alone is not enough: "Historians dispute the founding date"
// and "the date could not be established from the timbers" are sentences about
// the WORLD, and a place's own history is full of them. What makes a sentence
// ours is naming the checking as the actor — our sources, our research, our
// search — so both patterns have to match the same sentence.
// ── NARROWED, BECAUSE IT WAS DELETING REAL HISTORY ──────────────────
//
// Fable, 1 Sep 2026. "the sources", "the search" and "the research" are
// ORDINARY WORDS in the history of a Danish town, and this was cutting true
// sentences off published pages:
//
//   "Ribe is first mentioned in the sources in 854, and its market rights were
//    confirmed by the king in 1269."
//   "The sources of the Gudenå river have been confirmed as lying in Tinnet Krat."
//
// Both deleted, silently, at render. My own safety argument — that a research
// ACTOR is what makes a sentence ours — was right and the actor list was not:
// it included phrases a chronicler uses. What is unmistakably ours is the
// CHECKING, named as ours: sources we checked, the research context, our search.
const RESEARCH_ACTOR = /\b(?:checked sources|sources checked|available sources|source(?:s)? (?:we |that we )?(?:checked|read|found)|our (?:research|sources|search)|this research|the research note|research context|the checked sources)\b/i;
const VERIFY_VERB = /\b(?:un)?confirmed?\b|\bverif(?:y|ies|ied|ication)\b|\bcould ?n[o']?t (?:be )?(?:confirm|verify|find|establish)\w*\b|\bnot (?:been )?(?:able to )?(?:confirm|verify)\w*\b|\bno (?:source|evidence)\b/i;

// One independent tell, and it needs no second half. A sentence describing a
// place does not open "The claim" — that is the pipeline referring to its own
// input, and it is how the Hyllested row begins.
// ── AND "THE CLAIM TO FAME" IS NOT A CLAIM ──────────────────────────
// Fable again: "The claim to fame here is the light that drew the Skagen
// painters" was being deleted. The opener is only ours when the sentence is
// ABOUT the claim's standing, so the verification verb is required after it.
const OPENS_AS_A_CLAIM = /^\s*(?:the|this)\s+claim\s+(?:is|was|could|cannot|can ?not|has|have)\b/i;

export const isResearchVoice = (sentence) => {
  const s = String(sentence || "");
  if (!s.trim()) return false;
  if (OPENS_AS_A_CLAIM.test(s)) return true;
  return RESEARCH_ACTOR.test(s) && VERIFY_VERB.test(s);
};

// Kept as its own export so the audit can NAME the sentence rather than report
// that something somewhere was wrong.
export const researchVoiceSentences = (text) =>
  String(text || "").split(/(?<=[.!?])\s+/).filter(isResearchVoice).map(s => s.trim());

// ── AND IT NEVER EMPTIES A FIELD ────────────────────────────────────
//
// A blank description is worse than a bad one: the card renders as a place with
// nothing to say about it, which is indistinguishable from a broken row. So if
// removing the research sentences would leave nothing, the original stands and
// the audit is left to report it.
export const stripResearchVoice = (text) => {
  const raw = String(text ?? "");
  if (!raw.trim()) return text;
  const kept = raw.split(/(?<=[.!?])\s+/).filter(s => !isResearchVoice(s));
  const out = kept.join(" ").trim();
  return out ? out : text;
};

// Only the fields a reader actually reads, which is the list entryAudit already
// keeps for exactly this question. A second list here would drift from it.
export const cleanReaderProse = (payload) => {
  if (!payload || typeof payload !== "object") return payload;
  let touched = false;
  const out = { ...payload };
  for (const key of PROSE_FIELDS) {
    const val = out[key];
    if (typeof val !== "string" || !val.trim()) continue;
    const next = stripResearchVoice(val);
    if (next !== val) { out[key] = next; touched = true; }
  }
  // ── AND THE BODY, WHICH IS WHERE MOST OF THE PROSE LIVES ──────────
  // blogBody paragraphs are the long-form half of an entry and are not in
  // PROSE_FIELDS, so cleaning only the short fields would leave the same
  // sentence live one scroll further down.
  if (Array.isArray(out.blogBody)) {
    const body = out.blogBody.map(b => {
      if (!b || typeof b !== "object" || typeof b.text !== "string") return b;
      const next = stripResearchVoice(b.text);
      if (next === b.text) return b;
      touched = true;
      return { ...b, text: next };
    });
    if (touched) out.blogBody = body;
  }

  // ── AND THE VERBAL TIC, WHICH IS A PER-ENTRY QUESTION ─────────────
  //
  // Oliver, 8 Aug 2026, on "actually": "it's such a nerd word to be using so
  // much." Oliver, 3 Sep 2026: "tell the AI to stop using the term 'actually'
  // so much.. fk me.."
  //
  // Between those two dates the app gained a counter and a LOW audit finding
  // and nothing that removed a single one, while STUDIO_VOICE grew a paragraph
  // explaining precisely why the word is filler. Both halves were advice. This
  // is the half that acts, and it is the same move as stripResearchVoice above:
  // done at READ time, so every published row is fixed without a redraft.
  //
  // ACROSS THE WHOLE ENTRY, IN READING ORDER, which is why it cannot live in
  // the per-field loop above. helpers.js already settled the budget — "twice in
  // one entry is the signal, once can be doing real work" — and a budget spent
  // field by field would leave one in each of eight fields, which is eight on
  // the page and is exactly the complaint.
  const fields = PROSE_FIELDS.filter(k => typeof out[k] === "string" && out[k].trim());
  const bodyIdx = Array.isArray(out.blogBody)
    ? out.blogBody.map((b, i) => (b && typeof b === "object" && typeof b.text === "string" ? i : -1)).filter(i => i >= 0)
    : [];
  const trimmed = trimFillerRuns([...fields.map(k => out[k]), ...bodyIdx.map(i => out.blogBody[i].text)]);
  let cut = false;
  fields.forEach((k, i) => { if (trimmed[i] !== out[k]) { out[k] = trimmed[i]; cut = true; } });
  if (bodyIdx.length) {
    const body = [...out.blogBody];
    bodyIdx.forEach((bi, i) => {
      const next = trimmed[fields.length + i];
      if (next !== body[bi].text) { body[bi] = { ...body[bi], text: next }; cut = true; }
    });
    if (cut) out.blogBody = body;
  }
  return touched || cut ? out : payload;
};

// What the founder needs: which rows are doing it and what they say, so the row
// gets rewritten rather than living on a render-time patch forever.
export const researchVoiceIn = (payload) => {
  const found = [];
  for (const key of PROSE_FIELDS) {
    researchVoiceSentences(payload?.[key]).forEach(s => found.push({ field: key, says: s }));
  }
  (Array.isArray(payload?.blogBody) ? payload.blogBody : []).forEach(b => {
    researchVoiceSentences(b?.text).forEach(s => found.push({ field: b?.heading || "blogBody", says: s }));
  });
  return found;
};
