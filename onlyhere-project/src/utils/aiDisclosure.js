// ── "YOU ARE TALKING TO AN AI", WHICH IS NOW THE LAW ─────────────────
//
// Regulation (EU) 2024/1689, the AI Act. Article 50 took effect on
// 2 August 2026 with no grace period for systems already running, which is
// three weeks before this file was written.
//
// Article 50(1), the one that binds this product:
//
//   AI systems intended to interact directly with natural persons must be
//   designed so that the individuals concerned are informed that they are
//   interacting with an AI system, UNLESS THIS IS OBVIOUS to a reasonably
//   well-informed person. The information has to arrive "from the start of the
//   first interaction", "in a clear and distinguishable manner", and it has to
//   meet accessibility requirements.
//
// ── WHY NOT LEAN ON "UNLESS THIS IS OBVIOUS" ────────────────────────
//
// It is arguable here. The panel is headed "Ask Gemlyx", the composer says
// "Tell me about your trip", and a 2026 traveller opening a chat box on a
// travel site can reasonably be assumed to know. The Commission's own guidance
// treats the exemption as narrow and objective rather than a judgement the
// deployer makes about their own interface.
//
// The deciding argument is not the legal one. This product's whole position is
// that it says what it knows and how it knows it. "Uncertainty is displayed,
// not hidden" is written into the guide, the map, the weather strip and the
// ticket refusals. A product that prints "we could not verify this stop" and
// then leaves a reader to work out for themselves whether they are talking to
// a person would be inconsistent with itself before it was non-compliant.
//
// So it says so, once, at the top, quietly, and then gets out of the way. The
// 8 August rule about this panel still holds and is not weakened: do not
// explain the retrieval architecture to somebody who has not asked. One line.
//
// ── ARTICLE 50(4) AND WHY THE GUIDES ARE NOT LABELLED ───────────────
//
// 50(4) makes a DEPLOYER label AI-generated text "published with the purpose of
// informing the public on matters of public interest", and exempts text that
// has undergone "human review or editorial control" where a person holds
// editorial responsibility.
//
// Both halves point the same way here:
//
//   THE PUBLISHED ENTRIES are drafted by a model and then fact-checked, edited
//   and published by one named person through the Studio, who decides what
//   ships. That is editorial control in the ordinary sense of the phrase, and
//   it is the thing this entire repository is built to perform. entryAudit,
//   the uncertainties panel, the source policy and the publish gates are the
//   record of it.
//
//   A GENERATED GUIDE is not published to inform the public. It is written for
//   one traveller about their own trip and it is not addressed to anybody else.
//
// Neither conclusion is free: if guides ever become public pages, or if
// publishing ever stops going through a person, 50(4) has to be looked at
// again. Both are written into COMPLIANCE notes rather than left as an
// assumption nobody wrote down.
//
// NOT LEGAL ADVICE. This is a reading of the text and the Commission's
// guidance by somebody who is not a lawyer, recorded so the reasoning can be
// checked by one rather than rediscovered.
import { readerLanguage } from "./readerLanguage";

// ── THE SENTENCE, IN THE LANGUAGES THE PRODUCT ALREADY READS ────────
//
// Article 50(1) says the information must be clear, and a clear sentence in a
// language the reader does not speak is not clear. The six here are the same
// six travellerWords.js parses on the way in, chosen from Denmark's 2024
// inbound market: Germany 6.0m, Netherlands 2.0m, United States 1.1m, United
// Kingdom 0.9m, Sweden 0.8m.
//
// A seventh language is a line in this object, exactly as it is a list entry in
// travellerWords.js. That is the shape that stops a seventh copy of the same
// idea appearing somewhere else.
//
// ── AND CHINESE, BECAUSE THE CHAT ALREADY ANSWERS IN IT ─────────────
//
// Oliver, 25 Aug 2026: "I think we should at least have German, Danish, and
// Chinese covered."
//
// The other two were already here. Chinese is the one that was not, and it is
// not a nice-to-have on this particular surface: readerLanguage.js has kept the
// zh-Hans / zh-Hant script subtag since 15 August, deliberately, because
// answering a Simplified reader in Traditional is answering in a script they may
// not read. Which means the chat ALREADY replies to a Mandarin speaker in
// Mandarin, today, in production, and 50(1) says the disclosure has to reach
// that reader "in a clear and distinguishable manner". A sentence in a language
// they do not read is not clear, by this file's own argument four lines up.
//
// Both scripts, because that distinction is already made upstream and dropping
// it here would throw away the one thing readerLanguage.js went out of its way
// to keep. Bare "zh" resolves to Simplified: a browser that gave no script gave
// no answer, and Simplified is the larger readership by a wide margin.
export const AI_DISCLOSURE = {
  en: "You are talking to an AI. Gemlyx writes these answers.",
  da: "Du taler med en AI. Det er Gemlyx, der skriver svarene her.",
  de: "Sie sprechen mit einer KI. Gemlyx schreibt diese Antworten.",
  nl: "Je praat met een AI. Gemlyx schrijft deze antwoorden.",
  sv: "Du pratar med en AI. Det är Gemlyx som skriver svaren.",
  no: "Du snakker med en AI. Det er Gemlyx som skriver svarene.",
  zh: "您正在与 AI 对话。这些回答由 Gemlyx 撰写。",
  "zh-hans": "您正在与 AI 对话。这些回答由 Gemlyx 撰写。",
  "zh-hant": "您正在與 AI 對話。這些回答由 Gemlyx 撰寫。",
};

// nb and nn are what a Norwegian browser actually sends. The key is "no", and
// an alias is cheaper than a second copy of the same sentence.
const BASE_ALIAS = { nb: "no", nn: "no" };

// English is the fallback and not an error: an unrecognised language gets a
// disclosure it may not read rather than no disclosure at all, because the
// obligation is to inform and a sentence in the wrong language is closer to
// informing than silence.
//
// ── SIX TRANSLATIONS AND NOT ONE OF THEM COULD BE REACHED ───────────
//
// 25 Aug 2026, found by running the thing rather than reading it. This shipped
// on 24 August in six languages and EVERY reader got the English one.
//
// `aiDisclosureFor` handed this function `readerLanguage(nav)`, which returns an
// OBJECT, `{ tag, name }`. `String({...})` is "[object Object]", the lookup
// missed, and the `|| AI_DISCLOSURE.en` fallback one line down, which exists so
// an unknown language still gets informed, quietly absorbed it. A fallback that
// catches a bug is a fallback that hides one, and this one hid the entire
// feature.
//
// TWO MORE MISSES IN THE SAME EXPRESSION, both of them things a real browser
// sends rather than edge cases:
//
//   navigator.language is "de-DE", not "de". Raw indexing missed every
//   region-tagged browser in Europe even when it was handed a string.
//   "nb-NO" is Norwegian Bokmal and the key is "no".
//
// So it normalises now instead of indexing raw: alias, then script, then base.
// The script step is the one that matters and it is not symmetry for its own
// sake, it is the whole reason readerLanguage.js keeps the subtag.
//
// ── AND THE SUITE WATCHED IT HAPPEN ─────────────────────────────────
//
// Three assertions covered this yesterday: the table has six entries, all three
// surfaces call aiDisclosureFor, and an unknown language falls back to English.
// All three were true. None of them asks WHAT A GERMAN READER SEES, which is the
// only question Article 50 actually asks, so all three stayed green through a
// feature that did not work at all. Same defect this repository keeps finding in
// itself: finished, correct, tested code that nothing can reach. The assertions
// below call the function the way the render sites call it.
// ── ONE NORMALISER, FOR EVERY SENTENCE THIS LAW REQUIRES ────────────
//
// Pulled out of aiDisclosure on 26 Sep 2026, when the image duty needed a
// second sentence in the same nine languages. The alias, the script step and
// the English fallback are the part that was hard to get right, and the bug
// this file's own comment describes, six translations that no reader could
// reach, happened once already. A second copy of this logic is how it happens
// again in a table nobody is watching.
export const inReaderLanguage = (table, lang) => {
  const raw = typeof lang === "string" ? lang : String(lang?.tag ?? "");
  const parts = String(raw || "").trim().split("-").filter(Boolean);
  if (!parts.length) return table.en;
  const base = parts[0].toLowerCase();
  const keyBase = BASE_ALIAS[base] || base;
  // A script subtag is four letters (Hans, Hant). A region is two letters or
  // three digits and is not a language, which is the same reduction
  // languageName() makes one file over and for the same reason.
  const script = parts.slice(1).find(p => /^[A-Za-z]{4}$/.test(p));
  if (script) {
    const scripted = table[`${keyBase}-${script.toLowerCase()}`];
    if (scripted) return scripted;
  }
  return table[keyBase] || table.en;
};

export const aiDisclosure = (lang) => inReaderLanguage(AI_DISCLOSURE, lang);

// For a component that has a navigator rather than a resolved tag, so no render
// site has to know how the language is worked out. Same reason languageBlock
// wraps answerInLanguage in readerLanguage.js.
//
// `?.tag` and not the object, which is the bug above stated in one character.
export const aiDisclosureFor = (nav) => aiDisclosure(readerLanguage(nav)?.tag || "en");

// ── WHERE IT HAS TO APPEAR ──────────────────────────────────────────
// Named so the assertion and the render agree about the list rather than each
// keeping its own. Every surface where a person types something and a model
// answers is on it; a surface that only PRINTS model output they did not
// address is not an interaction under 50(1) and is not here.
export const AI_CHAT_SURFACES = [
  "src/components/AskGemlyx.jsx",
  "src/pages/GuidePage.jsx",
  "src/App.jsx",
];


// ── AND THE SAME DUTY, FOR A PAGE FULL OF PICTURES ──────────────────
//
// Oliver, 26 Sep 2026: "you probably also have to make it clear on the 'event'
// navigation that many pictures are AI that adopts the vibe and atmosphere of
// the events."
//
// Every AI picture already carries its own "AI impression" label, per image,
// through utils/aiImages.js, and that is what Article 50(4) asks for. This is
// the other half of his sentence and the part a label cannot do: WHY there are
// so many of them here. A festival that has not happened yet has no
// photographs of itself, so the picture is an impression of the atmosphere
// rather than a record of the event, and a reader scrolling a grid of them
// deserves to be told that once at the top rather than deducing it from a
// caption repeated forty times.
//
// SAID AS A REASON, NOT AS A WARNING. It is not a disclaimer about quality: it
// is what the picture IS, which is the same standard the per-image label is
// held to.
export const AI_IMAGE_NOTE = {
  en: "Many pictures here are AI impressions of the atmosphere rather than photographs of the event. An event that has not happened yet has no photographs of itself.",
  da: "Mange billeder her er AI-indtryk af stemningen frem for fotos af selve begivenheden. En begivenhed, der ikke har fundet sted endnu, har ingen billeder af sig selv.",
  de: "Viele Bilder hier sind KI-Eindrücke der Atmosphäre und keine Fotos der Veranstaltung. Eine Veranstaltung, die noch nicht stattgefunden hat, hat keine Fotos von sich.",
  nl: "Veel beelden hier zijn AI-impressies van de sfeer en geen foto's van het evenement zelf. Een evenement dat nog niet heeft plaatsgevonden, heeft geen foto's van zichzelf.",
  sv: "Många bilder här är AI-intryck av stämningen snarare än foton av evenemanget. Ett evenemang som ännu inte ägt rum har inga foton av sig själv.",
  no: "Mange bilder her er AI-inntrykk av stemningen framfor bilder av selve arrangementet. Et arrangement som ikke har funnet sted ennå, har ingen bilder av seg selv.",
  zh: "此处许多图片是对现场氛围的 AI 呈现，而非活动照片。尚未举办的活动没有自己的照片。",
  "zh-hans": "此处许多图片是对现场氛围的 AI 呈现，而非活动照片。尚未举办的活动没有自己的照片。",
  "zh-hant": "此處許多圖片是對現場氛圍的 AI 呈現，而非活動照片。尚未舉辦的活動沒有自己的照片。",
};

export const aiImageNote = (lang) => inReaderLanguage(AI_IMAGE_NOTE, lang);
export const aiImageNoteFor = (nav) => aiImageNote(readerLanguage(nav)?.tag || "en");
