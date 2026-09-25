// ── THE CARD LINE IS THE FOUNDING DATE, ON EVERY SINGLE TOWN ─────────
//
// Oliver, 15 Aug 2026, looking at a preview built for somebody who wrote "we
// like markets and modern design":
//
//   Copenhagen  "has held city rights since 1254 and became Denmark's capital
//                in 1443, grown out of a fish..."
//   Aarhus      "began as a Viking-age trading settlement called Aros at the
//                mouth of the Aarhus River in the ..."
//   Ribe        "was already a trading settlement by around 705 AD according
//                to tree-ring dating on its oldest t..."
//   Aalborg     "'s name shows up on coins minted around 1040, and the town
//                got formal city rights recorded in..."
//
// His words: "where is the description of history? I don't see the person
// wrote that?"
//
// Four towns, four founding dates, and not one of them asked for. That is not
// four entries that happen to be written the same way, it is the prompt. See
// utils/studioPrompts.js, the town draft, paragraph 1:
//
//   "Must start immediately with the town's name and a real concrete anchor
//    from the search context (founding date, a defining physical feature, its
//    region), then say honestly who this town actually suits and who it
//    doesn't. This also serves as the short card-preview text shown in
//    listings"
//
// Founding date is FIRST on that list of three, and a model takes the first
// option it is offered, so every town entry opens with one. The half after the
// comma is the half a traveller needs, it is written on every published row,
// and it has never once reached a screen: the card printed
// desc.slice(0, 100), and a hundred characters does not get past the anchor.
//
// So this is a READ, not a rewrite. Nothing published changes and no model is
// called. The card asks the entry for the sentence that answers "is this for
// me", and only falls back to the opening when the entry has not got one.
//
// ── AND IT FALLS BACK TWICE, ON PURPOSE ─────────────────────────────
// Every rule here can be wrong about a sentence, and the cost of being wrong
// has to be a worse line rather than a missing one. Level 3 is character for
// character what this card showed before this file existed, so the worst case
// is today.
import { PLACE_THEMES } from "./placeThemes";
// The words a theme is recognised by, and the whole-word test that matches
// them. One vocabulary, in the file that owns it.
import { rowThemeWords, saysWord } from "./interestFit";

const fold = (s) => String(s ?? "").toLowerCase();

// A sentence end is a stop followed by a capital, and Danish capitals count.
// The length floor is the abbreviation guard: "705 AD according" and "kr. 180"
// do not split, because neither leaves a fragment worth calling a sentence.
const SENTENCE_END = /(?<=[.!?])\s+(?=["'“]?[A-ZÆØÅ0-9])/;
const MIN_SENTENCE = 16;

export const sentencesOf = (text) => {
  const raw = String(text ?? "").trim();
  if (!raw) return [];
  const out = [];
  for (const piece of raw.split(SENTENCE_END)) {
    const s = piece.trim();
    if (!s) continue;
    // A fragment shorter than the floor is an abbreviation that split wrongly,
    // so it rejoins the sentence in front of it rather than becoming one.
    if (s.length < MIN_SENTENCE && out.length) out[out.length - 1] = `${out[out.length - 1]} ${s}`;
    else out.push(s);
  }
  return out;
};


// ── LEVEL 0: THE SENTENCE ABOUT THE THING THEY CAME FOR ─────────────
//
// Oliver, 25 Sep 2026, on a Skagen pin during a trip he had told Gemlyx was a
// nature loop. The card read:
//
//   "It suits people who want coastal walking and real art history away from a
//    city; it's not for anyone after nightlife or…"
//
// "I like it but.. it should just explain why it's good for someone looking
// for nature."
//
// The rule below picked that sentence because it says "suits people who", and
// on a card with no reader in mind it is the right sentence. But there IS a
// reader here: they said nature, the entry has its own sentences about the
// dunes and the two seas meeting, and the card handed them art history and a
// warning about nightlife they never asked about.
//
// So a level above the fit rule, and only where the traveller has said what
// they came for. Same discipline as everything under it: a READ, not a
// rewrite. Nothing published changes and no model is called. It asks the entry
// which of its OWN sentences is about the thing this person is here for.
//
// ── AND THE VOCABULARY IS NOT WRITTEN HERE ──────────────────────────
//
// The first version of this file typed out a regex per theme, which is a
// second answer to a question utils/interestFit.js already answers, and by
// this codebase's own count the most expensive mistake available. That file
// holds the nine themes' words, filters the ones that only ever describe
// getting somewhere, and matches them whole rather than inside other words.
// briefThemes reads what the traveller said, chips AND free text, in the same
// vocabulary. All three are imported.
//
// ── AND IT STAYS SILENT WHEN NOBODY SAID ANYTHING ───────────────────
//
// No stated interests means no level 0, and the card is character for
// character what it was before. A preference nobody stated must not reorder
// anybody's card.

// The entry's own sentence about one of the themes they asked for. In THEIR
// order, so somebody who said nature and then history gets the nature sentence
// out of a place that is both.
//
// AND IT MUST STILL BE A SENTENCE WORTH SHOWING. The same 25 character floor
// the fit rule uses: a four word clause mentioning birds is a worse card than
// the general sentence it would displace.
const MIN_THEME_SENTENCE = 25;

// ── THE BEST SENTENCE, NOT THE FIRST ────────────────────────────────
//
// The first version took the earliest sentence containing any word of the
// theme, and on Skagen it returned the generic one every time: "coastal
// walking and real art history" carries a word from nature, coast, art and
// history at once, so it won whatever the traveller had asked for. The card
// changed its reason and never changed its sentence.
//
// So it is scored by how many DISTINCT words of that theme a sentence carries.
// A sentence that names the dunes, the sandspit and the two seas is more about
// the coast than one that uses the word "coastal" once on its way past.
const themeScore = (sentence, words) => {
  const hay = fold(sentence);
  let n = 0;
  for (const w of words) if (saysWord(hay, w)) n += 1;
  return n;
};

export const themeSentence = (parts, want) => {
  if (!want || !want.size) return "";
  const list = (parts || []).filter(x => String(x).length >= MIN_THEME_SENTENCE);
  // ── AND NEVER THE FIT SENTENCE ITSELF ─────────────────────────
  //
  // Level 1 already shows that one, so returning it here would change which
  // rule gets the credit in the report and nothing a reader sees. Worse, it
  // hides the case this level exists for: if the only sentence about nature IS
  // the one that also mentions art history and nightlife, the entry has
  // nothing specific to say and the honest answer is the general sentence,
  // reached by the rule that owns it.
  const general = list.find(x => FIT_WORDS.test(x));
  const candidates = list.filter(x => x !== general);
  if (!candidates.length) return "";
  for (const theme of PLACE_THEMES) {
    if (!want.has(theme)) continue;
    const words = rowThemeWords(theme);
    if (!words.length) continue;
    let best = "", bestScore = 0;
    for (const x of candidates) {
      const n = themeScore(x, words);
      if (n > bestScore) { best = x; bestScore = n; }
    }
    if (best) return best;
  }
  return "";
};

// ── LEVEL 1: THE SENTENCE THAT ANSWERS "IS THIS FOR ME" ─────────────
// The town prompt asks for it by name ("who this town actually suits and who
// it doesn't"), the food prompt asks for "the actual reason locals go there",
// and both come out sounding like this. Whichever type the row is, if a
// sentence in it is addressed to the reader's decision, that is the sentence
// the card wants.
const FIT_WORDS = /\b(?:suits?|suited|good for|great for|right for|perfect for|ideal for|best for|made for|worth it if|worth a|worth the|if you|unless you|not for|no good if|skip (?:it|this|here)|come here for|go for|draws?|appeals? to|anyone who|people who|those who|travellers who|travelers who|locals? (?:go|come|flock))\b/i;

// ── LEVEL 2: DROP THE ORIGIN CLAIM AND KEEP THE REST ────────────────
// Both halves are required, and that is the whole safety of this rule. A year
// on its own is in "the harbour is busiest in July 2026" and an origin word on
// its own is in "the oldest bar on the street". Together they are a founding
// sentence and close to nothing else.
const A_YEAR = /\b(?:\d{3,4}\s*(?:AD|BC|BCE|CE)\b|1[0-9]{3}\b|20[0-2][0-9]\b|\d{3,4}s\b|\d{1,2}(?:st|nd|rd|th)\s+century\b)/i;
const ORIGIN_WORDS = /\b(?:founded|foundation|began as|begun as|started as|dates? back|going back|grew out of|grown out of|grew from|city rights|market town|charter|first mentioned|first recorded|recorded in|trading settlement|settlement|minted|coins|viking[\s-]age|medieval|oldest)\b/i;

export const isOriginSentence = (s) => A_YEAR.test(String(s || "")) && ORIGIN_WORDS.test(String(s || ""));

// Break on a word, not mid-word. "a restored building on Stormga…" was the old
// behaviour and there is no reason for it beyond nobody having looked.
const clip = (text, max) => {
  const t = String(text ?? "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(" ");
  const kept = at > max * 0.6 ? cut.slice(0, at) : cut;
  return `${kept.replace(/[,;:.\s]+$/, "")}…`;
};

export const CARD_LINE_MAX = 120;

// `place` rather than a string, because level 2 only makes sense for a row
// whose prose is built around an anchor, and knowing the row is how this can
// ever be told apart from an attraction that opens with a real fact about
// itself. Returns "" for an empty desc, same as before.
export const cardLine = (place, max = CARD_LINE_MAX, { want = null } = {}) => {
  const raw = String(place?.desc ?? "").trim();
  if (!raw) return "";
  const parts = sentencesOf(raw);
  if (parts.length < 2) return clip(raw, max);

  // Level 0, and only where they have said what they came for.
  const mine = themeSentence(parts, want);
  if (mine) return clip(mine, max);

  const fit = parts.find(s => FIT_WORDS.test(s));
  if (fit && fit.length >= 25) return clip(fit, max);

  if (isOriginSentence(parts[0])) {
    const rest = parts.slice(1).join(" ").trim();
    // A floor, because trading one founding date for four words is not an
    // improvement and the opening at least says where you are.
    if (rest.length >= 40) return clip(rest, max);
  }

  return clip(raw, max);
};

// Which of the three levels answered, for the report. Never rendered: this
// exists so a screenshot of a bad line can be traced to the rule that produced
// it without anybody having to guess which branch ran.
export const cardLineSource = (place, { want = null } = {}) => {
  const raw = String(place?.desc ?? "").trim();
  if (!raw) return "empty";
  const parts = sentencesOf(raw);
  if (parts.length < 2) return "whole";
  if (themeSentence(parts, want)) return "theme";
  const fit = parts.find(s => FIT_WORDS.test(s));
  if (fit && fit.length >= 25) return "fit";
  if (isOriginSentence(parts[0]) && parts.slice(1).join(" ").trim().length >= 40) return "afterOrigin";
  return "opening";
};

// Exported so the suite can assert the vocabulary this file reasons about is
// the same one placeThemes.js publishes, rather than a copy that drifts.
export const KNOWN_THEMES = PLACE_THEMES;
