// ── YOU CANNOT FACT-CHECK AN OPINION AGAINST WEB SNIPPETS ───────────
//
// Oliver, 15 Aug 2026, on an Old Irish Pub draft that came back with fourteen
// flagged claims and was auto-corrected: "this amount of unverified is
// unacceptable."
//
// He is right, and nine or ten of the fourteen were not inventions. Read them
// against the field each one came from:
//
//   "a full concert happens most weekends"        desc         the official page
//                                                              says "koncert hver
//                                                              weekend". A paraphrase.
//   "football goes up on the big screens"         desc         the page says football
//                                                              on a big screen. A paraphrase.
//   "Show up after 9pm on a Friday or Saturday"   bestTime     the schema ASKS for
//                                                              "when to actually show up".
//   "Mostly tourists ducking in after Tivoli"     beforeDark   the schema ASKS for
//                                                              "what it's like earlier".
//   "pub crawl groups and bachelor parties"       afterDark    the sources mention both.
//   "it empties out fast even late at night"      bestTime     a crowd read.
//   "Service and door staff get mixed reviews"    realityCheck a summary of the review
//                                                              snippets in the research.
//
// Every one of those fields is a field the draft prompt explicitly asks the
// writer to CHARACTERISE. `beforeDark` is literally "what it's like earlier in
// the day/evening". `whoFor` is "who this genuinely suits, real and specific,
// not generic positivity". `realityCheck` is "2-3 blunt sentences, the honest
// verdict". `gemlyxFind` is "ONE specific curated recommendation only Gemlyx
// would flag".
//
// Atmosphere never appears in research, because research is pages and
// atmosphere is a judgement about a room. So a checker asked "does this claim
// appear in the research" answers no to every atmospheric sentence, every time,
// by construction. It is not being unlucky. It cannot answer anything else.
//
// And then the auto-corrector runs, and its rule is that "anything still
// unverifiable was removed rather than guessed". So the pipeline deletes the
// atmosphere: the exact thing that makes an entry worth reading, removed by a
// gate that was never looking at a factual claim.
//
// THE SAME LESSON IS ALREADY IN THIS CODEBASE, ONE STEP SHORT. App.jsx says it
// about measured fields: "a measured field is not a claim to fact-check ...
// asking a text-search model whether a measurement appears in a pile of web
// snippets is a category error". Correct, and it was applied to the six
// measured fields and stopped there. An editorial field is the same category
// error from the other direction.
//
// So a field has a MODE, and the mode decides which findings are admissible:
//
//   report          a claim about the world: a price, a date, an address, an
//                   opening time, a website. CONTRADICTED and UNVERIFIED both
//                   apply. Absence of support is a real finding here, because
//                   these fields are supposed to be reporting something.
//
//   characterisation a judgement about a place: atmosphere, crowd, who it
//                   suits, when to go, the honest verdict. ONLY CONTRADICTED
//                   applies. A page that disagrees is a finding. A page that
//                   is silent is not, because it was never going to speak.
//
// The prompt is told the rule, and then the rule is enforced in code on the way
// back, because a request has a failure rate while code does not.

// Field names are shared across the content types by design, so this is keyed
// on the name rather than on type plus name. A name that appears in no schema
// costs nothing; a name missing from here defaults to `report`, which is the
// safe direction: a new field is checked until somebody decides it is
// editorial, rather than silently exempted the day it is added.
export const CHARACTERISATION_FIELDS = [
  // What the place is like.
  "desc", "atmosphere", "special", "beforeDark", "afterDark", "whenEnter",
  "vibeLocation", "walkIt", "bestNights", "crowd",
  // Who it is for, and the verdict.
  "whoFor", "whoItsFor", "realityCheck", "tip", "gemlyxFind", "highlight",
  // When to turn up. A recommendation, not a timetable: the timetable is
  // `openingHours`, which stays a report field.
  "bestTime", "timeNeeded", "recommendedStay",
  // Bullets that characterise rather than state. thingsToKnow is asked to
  // include "at least one real downside", which is a judgement by definition.
  "thingsToKnow", "tags",
];

export const REPORT_FIELDS = [
  "name", "town", "city", "location", "mapHint", "address", "region",
  "date", "dateStart", "dateEnd", "openingHours", "season",
  "price", "priceNote", "ticketInfo", "ticketsGlance", "extraCosts", "budgetLevel",
  "website", "link", "linkAndroid", "category", "type", "scale",
  "camping", "accommodationTip", "accessibility", "howTo", "howItWorks", "howItsMade",
  "visitorNote", "capacity", "founded",
];

export const checkModeOf = (field) => {
  const f = String(field || "");
  if (CHARACTERISATION_FIELDS.includes(f)) return "characterisation";
  return "report";
};

// ── A NUMBER INSIDE A JUDGEMENT IS STILL A NUMBER ───────────────────
//
// "3 mins on foot from the centre" sat in `location`, and it was a real catch.
// "The official site runs a 2-for-1 cocktail deal in summer" sat in
// `gemlyxFind`, and tying an offer to a season is a real claim. Exempting a
// whole field would lose both, which is why the mode governs which VERDICTS are
// admissible rather than which fields are shown.
//
// A characterisation field is still sent, and a page that CONTRADICTS it is
// still a finding. What cannot happen any more is UNVERIFIED on a sentence that
// was never reporting anything.
//
// This helper is for the run log and for the prompt: it says which sentences in
// a characterisation field carry something checkable at all, so the note can
// report honestly how much of a draft was even in scope.
const CHECKABLE_TOKEN = /\d|\b(?:kr|dkk|eur|euro|free|gratis)\b|\b(?:mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b|\b(?:only|oldest|largest|biggest|first|last|nearest|closest|cheapest)\b/i;
export const hasCheckableClaim = (text) => CHECKABLE_TOKEN.test(String(text || ""));

// Split a draft into the two groups, dropping nothing. Both are sent; they are
// labelled so the checker knows which rule applies to which.
export const splitForCheck = (draft) => {
  const report = {}, characterisation = {};
  for (const [k, v] of Object.entries(draft && typeof draft === "object" ? draft : {})) {
    if (k.startsWith("_")) continue;
    (checkModeOf(k) === "characterisation" ? characterisation : report)[k] = v;
  }
  return { report, characterisation };
};

// The block that goes into the prompt. States the rule in the terms the
// checker's own output format already uses, so there is nothing to translate.
export const CHECK_SCOPE_BLOCK = `TWO KINDS OF FIELD, AND THEY ARE NOT CHECKED THE SAME WAY. This overrides the general instruction above.

REPORTED FIELDS claim something about the world: an address, a price, a date, an opening time, a website, a category. Check these as normal. Both CONTRADICTED and UNVERIFIED apply.

CHARACTERISATION FIELDS are the writer's judgement about the place: what it feels like, who it suits, when to turn up, the honest verdict, what to be aware of. These are ASKED FOR by the brief. They are not reports and they are not supposed to appear in the research, because research is pages and this is a judgement about a room.

So, for a characterisation field:
- REPORT IT ONLY IF A PAGE YOU REACHED SAYS OTHERWISE. That is CONTRADICTED, and it is a real and useful finding: if the page says the place is dead at weekends and the draft says it is packed, say so.
- NEVER WRITE UNVERIFIED ABOUT ONE. "The sources do not support this crowd breakdown" is not a finding, it is a description of what research is. A sentence about atmosphere that no page mentions is the writer doing the job they were given.
- A PARAPHRASE IS NOT AN INVENTION. If the page says "koncert hver weekend" and the draft says "a concert most weekends", that is the same claim in English. Do not flag the wording.
- A SPECIFIC FIGURE INSIDE ONE IS STILL FAIR GAME. "3 minutes on foot", "2-for-1 in summer", "open until 4am" are claims wherever they sit, and UNVERIFIED applies to the FIGURE, not to the sentence around it. Quote the figure alone when you flag it.`;

// ── AND THE ENFORCEMENT, BECAUSE A PROMPT HAS A FAILURE RATE ────────
// Every finding names the field it came from. A finding labelled UNVERIFIED
// against a characterisation field is dropped here whatever the model decided,
// unless it quotes something with a real figure in it. That last clause is what
// keeps "3 mins on foot" while dropping "run by a group".
export const admissible = (finding, fieldOf = null) => {
  const label = String(finding?.label || "").toUpperCase();
  const text = String(finding?.text || "");
  if (label !== "UNVERIFIED") return true;              // CONTRADICTED always stands
  // TYPE-CHECKED, and this was a real bug in the first version. The natural
  // way to call this is `findings.filter(admissible)`, and filter passes the
  // INDEX as the second argument, so `fieldOf` arrived as the number 0 and was
  // called. Caught by the test that reruns Oliver's fourteen findings, which is
  // the whole reason that test replays real data rather than a fixture.
  const field = typeof fieldOf === "function" ? fieldOf(finding) : fieldIn(text);
  if (!field) return true;                              // cannot tell, so keep it
  if (checkModeOf(field) !== "characterisation") return true;
  // The quoted claim, not the whole explanation: the model's reasoning after
  // the semicolon routinely contains the research's own numbers, and matching
  // on those would keep every finding it explains well.
  const quoted = text.match(/[“"']([^”"']{2,200})[”"']/);
  return hasCheckableClaim(quoted ? quoted[1] : "");
};

// ── AND IT MUST READ THE CLAIM, NOT THE EXPLANATION ────────────────
//
// The first version scanned the whole finding for any known field name, and
// two of Oliver's nine survived because of it:
//
//   "run by a group" in the description; the opened sources identify The Old
//   Irish Pub and its LOCATION, but not a separate group behind it
//
// `location` is a report field, so the finding was admitted on the strength of
// a word in the model's own reasoning. And the other one named "the
// description", which is what a person calls `desc`, and matched nothing.
//
// So it reads the field out of the CLAIM half only, the phrase that follows the
// quoted text, and it knows what a human calls each field.
const FIELD_WORDS = {
  description: "desc", desc: "desc", intro: "desc",
  "reality check": "realityCheck", realitycheck: "realityCheck",
  "gemlyx find": "gemlyxFind",
  "who it's for": "whoFor", "who its for": "whoFor", "who for": "whoFor",
  "things to know": "thingsToKnow", "what to be aware of": "thingsToKnow",
  "best time": "bestTime", "best time to go": "bestTime",
  "before dark": "beforeDark", "after dark": "afterDark",
  "opening hours": "openingHours", hours: "openingHours",
  address: "location", "the location field": "location",
};
export const fieldIn = (text) => {
  const t = String(text || "");
  // The claim half: everything up to the first semicolon, which is where the
  // checker's own format puts the break between the claim and its reasoning.
  // No semicolon means the whole line is the claim.
  const claim = t.includes(";") ? t.slice(0, t.indexOf(";")) : t;
  // Prefer the phrase right after the quoted claim, which is where the field is
  // actually named: `“…” in the bestTime field`.
  const after = claim.match(/[”"']\s*(?:in|from|under)\s+(?:the\s+)?([A-Za-z' ]{2,30}?)(?:\s+field)?\s*$/);
  const candidates = [];
  if (after) candidates.push(after[1].trim());
  candidates.push(claim);
  const all = [...CHARACTERISATION_FIELDS, ...REPORT_FIELDS];
  for (const c of candidates) {
    const low = c.toLowerCase().trim();
    if (FIELD_WORDS[low]) return FIELD_WORDS[low];
    // Longest first, so `whoItsFor` is not read as `whoFor` and `dateEnd` is
    // not read as `date`.
    for (const f of all.slice().sort((a, b) => b.length - a.length)) {
      if (new RegExp(`\\b${f}\\b`, "i").test(c)) return f;
    }
    for (const [word, field] of Object.entries(FIELD_WORDS)) {
      if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(c)) return field;
    }
  }
  return "";
};
