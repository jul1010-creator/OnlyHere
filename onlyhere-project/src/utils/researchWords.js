// ── THE RESEARCH VOICE, WITH NOTHING BEHIND IT ──────────────────────
//
// Split out of researchVoice.js on 8 Sep 2026, unchanged. That file needs
// entryAudit for PROSE_FIELDS and blockText, which drags a third of the utils
// graph behind it, and one caller cannot afford that: middleware.js runs on the
// edge and serves the words a CRAWLER sees.
//
// Until tonight it served them uncleaned. An entry whose prose carries a
// sentence about our own checking reached WhatsApp previews and every AI answer
// engine with that sentence in it, while a person opening the same page saw it
// removed, because liveContent cleans on read and the middleware fetches the
// row itself. The middleware's own comment says "if these two ever diverge, one
// of them is a bug".
//
// Nothing here has any imports, which is the point.

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
