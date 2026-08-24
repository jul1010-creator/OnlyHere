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
export const AI_DISCLOSURE = {
  en: "You are talking to an AI. Gemlyx writes these answers.",
  da: "Du taler med en AI. Det er Gemlyx, der skriver svarene her.",
  de: "Sie sprechen mit einer KI. Gemlyx schreibt diese Antworten.",
  nl: "Je praat met een AI. Gemlyx schrijft deze antwoorden.",
  sv: "Du pratar med en AI. Det är Gemlyx som skriver svaren.",
  no: "Du snakker med en AI. Det er Gemlyx som skriver svarene.",
};

// English is the fallback and not an error: an unrecognised language gets a
// disclosure it may not read rather than no disclosure at all, because the
// obligation is to inform and a sentence in the wrong language is closer to
// informing than silence.
export const aiDisclosure = (lang) => AI_DISCLOSURE[String(lang || "").toLowerCase()] || AI_DISCLOSURE.en;

// For a component that has a navigator rather than a resolved tag, so no render
// site has to know how the language is worked out. Same reason languageBlock
// wraps answerInLanguage in readerLanguage.js.
export const aiDisclosureFor = (nav) => aiDisclosure(readerLanguage(nav));

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
