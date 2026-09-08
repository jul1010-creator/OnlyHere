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
import { PROSE_FIELDS, blockText, withBlockText } from "./entryAudit";
// The budget and the word list live beside fillerWordCounts, which is where
// the rule was written down in August. A second copy here would drift from it.
import { trimFillerRuns } from "./helpers";

// The sentence-level half lives in researchWords.js, with no imports, because
// middleware.js runs on the edge and cannot carry this file's graph. Re-exported
// rather than re-implemented: every existing importer of this module keeps
// working, and there is still exactly one definition of what our own voice
// sounds like.
export { isResearchVoice, researchVoiceSentences, stripResearchVoice } from "./researchWords";
import { stripResearchVoice, researchVoiceSentences } from "./researchWords";

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
      // blockText, not b.text. shapeForLive writes { type, content } and
      // DetailPage renders block.content; `text` is a key nothing has ever
      // written, so this walked every block and changed none. See
      // entryAudit.blockText for the whole story, which is its second telling.
      const was = blockText(b);
      if (!was) return b;
      const next = stripResearchVoice(was);
      if (next === was) return b;
      touched = true;
      return withBlockText(b, next);
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
    ? out.blogBody.map((b, i) => (blockText(b) ? i : -1)).filter(i => i >= 0)
    : [];
  const trimmed = trimFillerRuns([...fields.map(k => out[k]), ...bodyIdx.map(i => blockText(out.blogBody[i]))]);
  let cut = false;
  fields.forEach((k, i) => { if (trimmed[i] !== out[k]) { out[k] = trimmed[i]; cut = true; } });
  if (bodyIdx.length) {
    const body = [...out.blogBody];
    bodyIdx.forEach((bi, i) => {
      const next = trimmed[fields.length + i];
      if (next !== blockText(body[bi])) { body[bi] = withBlockText(body[bi], next); cut = true; }
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
    researchVoiceSentences(blockText(b)).forEach(s => found.push({ field: b?.heading || "blogBody", says: s }));
  });
  return found;
};
