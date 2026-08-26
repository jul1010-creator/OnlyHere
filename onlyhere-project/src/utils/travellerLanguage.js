// ── "NEITHER OF US HAS A WORD OF DANISH" ────────────────────────────
//
// 26 Aug 2026. The Winter Light brief said that sentence in the first message,
// in English, and the guide came back in Danish: every stop note, every
// essentials block, the money paragraph, all of it. Two travellers in their
// sixties who cannot read a word of it were handed ten days of instructions in
// a language they had just ruled out, with the leg lines and the weather still
// in English so the document changes language twice a page.
//
// It is the second time. The Limfjord brief on 25 August said "one of us reads
// Danish, the other doesn't at all" and came back Danish too, and that one was
// written off as ambiguous. This one is not ambiguous by construction: the
// sentence exists in the brief for the sole purpose of removing the ambiguity.
//
// ── THE BUG IS NOT IN THE PROMPT. IT IS IN WHO DECIDES ──────────────
//
// readerLanguage.js has carried the right rule since 17 August, in capitals:
// "MATCH THE TRAVELLER'S OWN LANGUAGE. Read their most recent message and reply
// in the language THEY wrote it in." The guide's version says the same thing.
//
// And then the same block appends nativeBlock(), which is fifteen hundred words
// of instruction written entirely in Danish, headed SKRIV DANSK SOM EN DANSKER.
// A model handed one English sentence saying "use their language" and fifteen
// hundred Danish ones saying how to write Danish well writes Danish. That is
// not a model being disobedient, it is a prompt whose weight is all on one side.
//
// readerLanguage.js has already caught itself doing exactly this once, and says
// so in its own comments: "the block opened with ANSWER IN DANISH in capitals
// and put match the language THEY used in a subordinate clause after it, so the
// browser setting won a fight it was never meant to be in." That was fixed for
// the chat by reordering the sentences. Reordering was never going to hold for
// the guide, because the guide block does not merely put the wrong rule first,
// it attaches an entire manual in the wrong language.
//
// So the fix is not a better sentence. THE DECISION COMES OUT OF THE PROMPT AND
// INTO CODE. The traveller's own words are sitting in a variable at the call
// site — saidByTravellerForGuide, which App.jsx already computes for exactly
// this kind of reason. Read them here, decide here, and hand the prompt either
// a language block or nothing at all. A block that is never sent cannot be
// misread.
//
// ── WHY ONLY ENGLISH AND DANISH ─────────────────────────────────────
//
// Same reason nativeBlock is Danish only, and readerLanguage.js says it better
// than I can: "a native block is only worth having if somebody can read it, and
// Danish is the one language in this repo that its owner can check."
//
// A detector for six languages that nobody here speaks is six ways to be
// confidently wrong. So this answers exactly one question — did they write
// English, did they write Danish, or can I not tell — and when the answer is "I
// cannot tell", the browser tag decides exactly as it does today. A German
// traveller's experience is unchanged by this file.
//
// ── AND THE ASYMMETRY IS THE WHOLE ARGUMENT ─────────────────────────
//
// The two ways to get this wrong do not cost the same, and pretending they do
// is how the tie kept getting broken in the wrong direction.
//
//   ENGLISH GUIDE FOR A DANISH READER: mildly worse. Every Danish traveller
//   this app has ever had reads English, and a browser can translate a page.
//
//   DANISH GUIDE FOR A NON-DANISH READER: total loss. The document cannot be
//   read at all, and the traveller paid for it and is standing in the rain.
//
// So every genuinely uncertain case in this file resolves toward English, and
// any statement anywhere in the brief that somebody cannot read a language is
// treated as final. That is deliberate, it is not a hedge, and it is why the
// negative patterns below are allowed to be a little greedy.

// Function words, and only the ones that belong to exactly one of the two
// languages. Everything shared is left out on purpose, because a marker that
// fires for both sides is not a marker:
//
//   "at"  — Danish "at" is English "to"/"that", and English "at" is a
//           preposition. Same string, both languages, useless.
//   "i"   — Danish "i" is English "in", and English "I" is the first person.
//   "for" — the same word in both.
//   "men" — Danish "but", English plural of man.
//   "man" — Danish "one", English "man".
//   "en"  — Danish "a", and common enough inside English words that a
//           whole-word match earns little.
//
// "to" IS kept even though Danish "to" means two, and "is" even though Danish
// "is" means ice. Both are rare enough as whole words in a travel brief that
// the margin rule below absorbs them, and both are among the strongest English
// signals there are.
export const EN_MARKERS = [
  "the", "and", "of", "to", "we", "you", "your", "our", "they", "their",
  "is", "are", "was", "were", "have", "has", "had", "not", "but", "with",
  "from", "this", "that", "there", "what", "would", "could", "should",
  "about", "into", "over", "been", "will", "it's", "don't", "doesn't",
  "can't", "we're", "we've", "i'm", "i've", "please", "just", "both",
];

export const DA_MARKERS = [
  "og", "ikke", "jeg", "vi", "er", "det", "til", "med", "på", "af",
  "den", "som", "har", "kan", "hvor", "hvis", "ved", "eller", "også",
  "meget", "gerne", "tak", "skal", "være", "godt", "vores", "jeres",
  "hverken", "ingen", "noget", "nogle", "man", "sammen", "dage", "uge",
];

// Whole words, lowercased rather than folded. Folding ø to o would make "på"
// and "pa" the same string, and this list is about spelling — the same reason
// languageBarrier.js gives for its own list.
const countWords = (text, words) => {
  const t = ` ${String(text || "").toLowerCase().replace(/[^\p{L}\p{N}'’]+/gu, " ")} `;
  let n = 0;
  for (const w of words) {
    const needle = ` ${w.replace(/’/g, "'")} `;
    let from = 0;
    for (;;) {
      const i = t.replace(/’/g, "'").indexOf(needle, from);
      if (i < 0) break;
      n++;
      from = i + needle.length - 1;
    }
  }
  return n;
};

// ── THE FLOOR AND THE MARGIN, AND WHY BOTH ──────────────────────────
//
// A margin alone says "English" on a two-word message containing "the", which
// is not evidence of anything. A floor alone says "English" on a Danish
// paragraph that happens to quote an English hotel name.
//
// Two markers is deliberately low. The message that started this said "We're
// landing at Copenhagen Airport on Friday 12 February 2027 at 09:15, and flying
// home from Copenhagen on Sunday the 21st at 18:00" in its first line, which is
// four before you reach the second sentence. Anything shorter than that really
// is closer to the tick-box case, and the tick-box case is the one place the
// browser tag is the right instrument.
export const MARKER_FLOOR = 2;
export const MARKER_MARGIN = 2;

// "en", "da", or null for "I cannot tell". Null is a real answer here, not a
// failure: it hands the decision back to the browser tag, unchanged.
export const languageOfProse = (text) => {
  const en = countWords(text, EN_MARKERS);
  const da = countWords(text, DA_MARKERS);
  if (en >= MARKER_FLOOR && en >= da * MARKER_MARGIN) return "en";
  if (da >= MARKER_FLOOR && da >= en * MARKER_MARGIN) return "da";
  return null;
};

// ── A STATED INABILITY IS A CONSTRAINT, NOT A HINT ──────────────────
//
// Read sentence by sentence rather than by matching phrase shapes, because the
// two real examples have almost nothing in common as strings:
//
//   "Neither of us has a word of Danish."
//   "One of us reads Danish, the other doesn't at all."
//
// A list of shapes would need one entry per way of saying it and would miss the
// third. What they share is structural: one sentence, naming a language, with a
// negation attached to the act of understanding it. That is two questions, and
// both are cheap.
//
// THE SECOND ONE SAYS SOMEBODY DOES READ DANISH, and it still bars Danish. A
// guide is one document for a party, and a document half the party cannot read
// has failed for that half. Writing it in English costs the Danish reader
// nothing at all. This is the asymmetry in the header, applied.
const LANGUAGE_WORDS = {
  danish: "da", dansk: "da",
  english: "en", engelsk: "en",
  german: "de", tysk: "de", deutsch: "de",
  swedish: "sv", svensk: "sv",
  norwegian: "no", norsk: "no",
  french: "fr", fransk: "fr",
  spanish: "es", spansk: "es",
  dutch: "nl", hollandsk: "nl",
  italian: "it", italiensk: "it",
};

// The negation and the comprehension have to be in the same sentence as the
// language name. Splitting on sentence enders keeps "we don't drive" in one
// brief from barring the Danish named in the next.
const NEGATION = /\b(?:not|no|never|neither|none|nor|don'?t|dont|doesn'?t|doesnt|didn'?t|can'?t|cant|cannot|won'?t|without|zero|ikke|hverken|ingen|uden)\b/i;
const COMPREHENSION = /\b(?:speak|speaks|spoken|read|reads|reading|understand|understands|know|knows|word|words|fluent|grasp|taler|læser|forstår|kan)\b/i;

// NAMED briefSentences, NOT sentencesOf, and that is not fussiness. There are
// already three exported functions called sentencesOf in src/utils — in
// draftShape.js, in cardLine.js, and nearly a fourth here — plus `sentences` in
// journey.js, which is the good one: it carries an abbreviation list so
// "Aalborg St." does not split in the middle. A fourth identical name is how a
// test file ends up importing the wrong splitter and nobody notices.
//
// journey.js's is not reached for because it would drag claimCheck, danishNames,
// calendarDay and pageScan behind it into a file that answers one question about
// one string. What is split here is one person's own message, where the
// abbreviation case barely arises, and the worst a bad split can do is put a
// language name and its negation in different halves of one sentence.
export const briefSentences = (text) =>
  String(text || "").split(/(?<=[.!?;\n])\s+/).map(s => s.trim()).filter(Boolean);

// ── AND A SENTENCE MAY NAME TWO LANGUAGES ──────────────────────────
//
// Found by mutation testing on the day this was written, from the case that
// matters most to a Danish user: "Min mand forstår ikke dansk, så guiden skal
// være på engelsk." One sentence, one negation, two languages — and a rule that
// barred every language in the sentence would bar the one they just asked for.
//
// Splitting on clauses instead would fix that and break the other real example,
// "One of us reads Danish, the other doesn't at all", where the negation and
// the language sit in different clauses on purpose. So the scope stays the
// sentence, and when a sentence names more than one language the negation is
// attributed to the NEAREST — which is how a reader would attribute it too.
const NEGATION_G = new RegExp(NEGATION.source, "gi");

// Every language the traveller has said, in their own words, that they cannot
// read. Returns base tags: ["da"].
export const ruledOutLanguages = (travellerText) => {
  const out = new Set();
  for (const s of briefSentences(travellerText)) {
    if (!NEGATION.test(s) || !COMPREHENSION.test(s)) continue;
    const low = s.toLowerCase();
    const named = [];
    for (const [word, tag] of Object.entries(LANGUAGE_WORDS)) {
      const at = low.search(new RegExp(`\\b${word}\\b`, "i"));
      if (at >= 0) named.push({ tag, at });
    }
    if (!named.length) continue;
    // One language named: the sentence is about that language, wherever in it
    // the negation happens to sit.
    if (named.length === 1) { out.add(named[0].tag); continue; }
    // Several: the one the negation is closest to.
    const negs = [];
    NEGATION_G.lastIndex = 0;
    for (let m; (m = NEGATION_G.exec(low)); ) negs.push(m.index);
    if (!negs.length) continue;
    let best = null, bestGap = Infinity;
    for (const n of named) {
      const gap = Math.min(...negs.map(i => Math.abs(i - n.at)));
      if (gap < bestGap) { bestGap = gap; best = n; }
    }
    if (best) out.add(best.tag);
  }
  return [...out];
};

// ── THE DECISION, IN ONE PLACE ──────────────────────────────────────
//
// `lang` is whatever readerLanguage() returned — the browser tag as an object,
// or null for English. It is INJECTED rather than read here, so this function
// is pure and the suite can put a German browser in front of an English brief
// without a jsdom.
//
// Returns the same shape, or null, and null means exactly what it means
// everywhere else in readerLanguage.js: add no block, and the guide is English.
//
// The order is: what they were unable to read, then what they actually wrote,
// then the device. Only the last of those three was ever consulted before.
export const guideLanguage = ({ said = "", lang = null } = {}) => {
  const base = String(lang?.tag || "").split("-")[0].toLowerCase();
  const prose = String(said || "").trim();

  // 1. A stated inability wins outright, and it wins even against a brief the
  //    traveller wrote in that same language — somebody can write "vi taler
  //    ikke dansk" and mean it about the other person coming.
  if (base && ruledOutLanguages(prose).includes(base)) return null;

  // 2. What they typed. English wins outright; Danish is returned even when the
  //    browser says English, which closes the other half of the same bug —
  //    "browser English, traveller wrote German. The guide is English. The bug
  //    survives its own fix." (readerLanguage.js, on the rewrite passes.)
  const wrote = languageOfProse(prose);
  if (wrote === "en") return null;
  if (wrote === "da") return lang && base === "da" ? lang : { tag: "da", name: "Danish" };

  // 3. Undecidable, which includes the tick-box case readerLanguage.js already
  //    carves out: somebody who has only ticked the app's own English labels has
  //    not written anything, and there the device is the only evidence there is.
  //    The device decides, exactly as it did before this file existed.
  //
  //    THIS IS ALSO WHY THERE IS NO EARLY RETURN FOR AN EMPTY BRIEF. There was
  //    one, and mutation testing on 26 Aug showed it could be deleted with the
  //    suite still green — languageOfProse("") is null and the line below
  //    already answered it. A branch no test can distinguish from its fallback
  //    is a branch that will drift out of step with the fallback unnoticed.
  return lang || null;
};

// ── WHAT THE GUIDE STILL OWES A READER WITH NO DANISH ───────────────
//
// Writing the guide in English is half the job. The other half is that some of
// this trip cannot be done in English: a phone booking to a Bornholm hotel out
// of season, a Rejseplanen page, a ferry line that answers in Danish. The pass
// condition for this trap was "English throughout, with Danish-only steps
// flagged as needing help", and a note is what makes the difference between a
// translated document and an honest one.
//
// Kept short and unconditional. It says the thing is in Danish; it does not
// promise the traveller a solution this app cannot deliver.
export const NO_DANISH_NOTE =
  "THE TRAVELLER HAS SAID THEY CANNOT READ DANISH. Write every word of this guide in English. Where a step genuinely requires Danish — a phone number that will be answered in Danish, an operator page with no English version, a timetable or a booking form published only in Danish — say so plainly in the note for that stop, in one short clause, so they can plan for it. Do not translate the name of the page, the line or the company: they have to match it against what is on the screen.";

// The block to append for a brief that ruled a language out. Empty when nothing
// was ruled out, so a call site can splice it unconditionally.
export const languageBarNote = (travellerText) =>
  ruledOutLanguages(travellerText).includes("da") ? `\n${NO_DANISH_NOTE}` : "";
