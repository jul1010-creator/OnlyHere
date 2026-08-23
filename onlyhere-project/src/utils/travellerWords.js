// ── WHAT A TRAVELLER SAYS, IN THE LANGUAGES THEY SAY IT IN ───────────
//
// 23 August 2026, after an adversarial pass on Oliver's father's dead end found
// that the fix shipped the night before had only ever repaired half of it.
//
// THE SHAPE OF THE BUG, because it will happen again otherwise. Gemlyx REPLIES
// in the traveller's language and READS only English. Every reader in
// tripBrief.js runs over the traveller's own words with an English pattern, so
// a Danish speaker can answer a blocking question correctly, watch the model
// acknowledge the answer in Danish, and have the slot stay empty. `when` was
// taught Danish on 22 August. `party` was not, and `party` is equally HARD, so
// his father could still never reach a build: he answers "min kone og mig",
// Gemlyx says "lovely, you and your wife", and then asks who is coming again.
//
// So the vocabulary comes out of the parsers and lives here, once, and every
// reader pulls from it. Adding a language becomes a list entry rather than six
// regexes in four files drifting apart.
//
// ── WHICH LANGUAGES, AND WHY THESE ──────────────────────────────────
// Denmark's inbound market in 2024, by visitors: Germany 6.0m, Netherlands
// 2.0m, United States 1.1m, United Kingdom 0.9m, Sweden 0.8m. Germany alone is
// three times the next country. Danish comes first regardless because it is the
// domestic traveller and because it is the language the product is about, and
// Norwegian rides along with Swedish and Danish for almost nothing.
//
// Deliberately NOT every language. A half learned vocabulary is worse than an
// honest English one: it fills a blocking slot from a word it half recognised
// and then never asks again. Six, done properly, then measure.
export const LANGUAGES = ["da", "de", "nl", "en", "sv", "no"];

// ── MONTHS ──────────────────────────────────────────────────────────
// The Danish written form is "15. maj", with a period after the day number and
// a lower case month. The English pattern wanted "15th May" and matched neither
// half, so the single most ordinary way a Dane writes a date failed twice.
export const MONTHS = {
  0:  ["january", "januar", "januari", "jänner", "gennaio"],
  1:  ["february", "februar", "februari", "febbraio"],
  2:  ["march", "marts", "mars", "märz", "maart", "marzo"],
  3:  ["april", "aprile"],
  4:  ["may", "maj", "mai", "mei", "maggio"],
  5:  ["june", "juni", "giugno"],
  6:  ["july", "juli", "luglio"],
  7:  ["august", "augustus", "augusti", "agosto"],
  8:  ["september", "septembre", "settembre"],
  9:  ["october", "oktober", "ottobre"],
  10: ["november", "novembre"],
  11: ["december", "dezember", "desember", "dicembre"],
};

// One flat lookup, longest first so "augustus" is not eaten by "august".
export const MONTH_INDEX = Object.fromEntries(
  Object.entries(MONTHS).flatMap(([i, names]) => names.map(n => [n, Number(i)]))
);
export const MONTH_PATTERN = Object.keys(MONTH_INDEX)
  .sort((a, b) => b.length - a.length)
  .join("|");

// ── HOW LONG ────────────────────────────────────────────────────────
// PLAIN WORDS, NOT PATTERNS. These go through `alt`, which escapes regex
// characters, so a "days?" shorthand became the literal string "days?" and
// "7 days" stopped parsing in English while "7 dagen" carried on working. Every
// form is spelled out instead.
export const DAY_WORDS = ["day", "days", "dag", "dage", "dagen", "dagar", "tag", "tage", "giorno", "giorni"];
export const WEEK_WORDS = ["week", "weeks", "uge", "uger", "ugen", "vecka", "veckor", "veckan", "uke", "uker", "woche", "wochen", "weken", "settimana", "settimane"];
// "a week" in each: en, da/no, de, nl, sv, it.
export const ONE_WEEK = ["a week", "one week", "en uge", "hele ugen", "eine woche", "een week", "en vecka", "una settimana"];

// ── WHO IS COMING ───────────────────────────────────────────────────
// The one that was still English only, and the one that blocked him.
//
// SPOUSE AND PARENT WORDS NEED THEIR POSSESSIVE. Bare "man" is husband in
// Danish, Swedish and Norwegian AND the impersonal pronoun in all three ("man
// kan tage toget"), and it is an ordinary noun in Dutch and English. Requiring
// "min mand", "mijn man", "meine Frau" costs nothing a real answer contains and
// removes the whole class of false positive.
export const PARTY_POSSESSIVE = [
  "wife", "husband", "partner", "girlfriend", "boyfriend", "son", "daughter", "mum", "mom", "dad", "parents",
  "kone", "mand", "kæreste", "søn", "datter", "mor", "far", "forældre", "svigermor",
  "frau", "mann", "sohn", "tochter", "mutter", "vater", "eltern",
  "vrouw", "man", "zoon", "dochter", "moeder", "vader", "ouders",
  "fru", "sambo", "son", "dotter", "mamma", "pappa", "föräldrar",
  "kjæreste", "sønn", "mi datter", "foreldre",
];
export const PARTY_POSSESSIVES = ["my", "min", "mit", "mine", "mein", "meine", "mijn", "m'n", "mi"];

// Safe on their own: none of these is a common word in another sense.
export const PARTY_BARE = [
  "kids?", "children", "child", "toddler", "baby", "family", "friends?", "solo", "alone", "just me",
  "børn", "børnene", "barnebarn", "børnebørn", "familie", "familien", "venner", "vennerne", "alene", "os to", "kun mig", "voksne",
  "kinder", "kindern", "enkelkinder", "enkelkindern", "enkel", "familie", "freunde", "freunden", "allein", "alleine", "zu zweit", "erwachsene", "erwachsenen",
  "kinderen", "kleinkinderen", "gezin", "familie", "vrienden", "vriendin", "vriend", "alleen", "z'n tweeën", "met z'n tweeën", "volwassenen",
  "barn", "barnen", "barnbarn", "familj", "familjen", "vänner", "vännerna", "ensam", "vuxna",
  "bambini", "famiglia", "amici", "da solo",
];
// "we are 4", "vi er 4", "wir sind 4", "we zijn met 4", "vi är 4", plus "4 adults".
export const PARTY_COUNT = [
  "\\d+\\s+(?:of us|people|adults?|voksne|erwachsene|volwassenen|vuxna|personer|personen|persones)",
  "(?:we are|vi er|vi är|wir sind|we zijn(?:\\s+met)?|siamo)\\s+\\d+",
];

// ── RELATIVE DAYS ───────────────────────────────────────────────────
// Offsets in days from today. Longest key first at the point of use, or
// "i overmorgen" is read as the "i morgen" inside it and they arrive a day early.
export const RELATIVE_DAYS = {
  0: ["today", "tonight", "i dag", "idag", "i aften", "iaften", "heute", "vandaag", "vanavond", "idag", "oggi"],
  1: ["tomorrow", "i morgen", "imorgen", "morgen", "i morgon", "imorgon", "domani"],
  2: ["the day after tomorrow", "day after tomorrow", "i overmorgen", "overmorgen", "übermorgen", "overmorgen", "i övermorgon", "dopodomani"],
};
// German "morgen" is tomorrow and Dutch "morgen" is also tomorrow, but Danish
// "morgen" alone is the morning: only "i morgen" and "imorgen" mean tomorrow.
// Handled by the table above listing the Danish forms explicitly and by the
// two letter language hint at the point of use.
export const THIS_WEEKEND = [
  "this weekend", "the weekend", "i weekenden", "denne weekend", "her i weekenden",
  "dieses wochenende", "am wochenende", "dit weekend", "in het weekend",
  "i helgen", "denna helg", "questo weekend",
];
export const NEXT_WEEK = [
  "next week", "næste uge", "naeste uge", "nächste woche", "naechste woche",
  "volgende week", "nästa vecka", "neste uke", "la prossima settimana",
];
export const IN_N_DAYS = ["in", "om", "i", "over", "binnen", "fra", "tra"];

// ── YES AND NO ──────────────────────────────────────────────────────
// Oliver, 23 Aug 2026: "Instead of writing 'yes' when it asks to build, let it
// pop up as yes and no, right where the guide will be. So you can click it.
// Then you won't miss it."
//
// The buttons are the answer to that. This list is the belt to their braces:
// somebody who types the word anyway should not be ignored, and somebody
// reading a machine translated page may see a translated button and type
// instead of clicking.
export const YES_WORDS = [
  "yes", "yeah", "yep", "yup", "sure", "ok", "okay", "go", "go ahead", "do it", "build it", "please do",
  "ja", "jo", "jatak", "ja tak", "gør det", "byg den", "kør", "kør på",
  "klar", "mach", "mach es", "los", "bitte",
  "oké", "doe maar", "graag", "ga je gang",
  "okej", "kör", "kör på", "gärna",
  "sì", "si", "certo", "vai",
];
export const NO_WORDS = [
  "no", "nope", "not yet", "wait", "hold on", "not now", "later",
  "nej", "ikke endnu", "ikke lige nu", "vent", "senere",
  "nein", "noch nicht", "warte", "später",
  "nee", "nog niet", "wacht", "later",
  "inte än", "vänta", "senare",
  "nei", "ikke ennå",
  "no", "non ancora", "aspetta",
];

// One escaped alternation from a list, longest first, for building a pattern.
export const alt = (words) =>
  [...new Set(words)]
    .sort((a, b) => b.length - a.length)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

// A word boundary that understands the letters these languages actually use.
// \b is ASCII only in JavaScript, so \bén never matches and \balene\b breaks on
// a preceding å. This is the same trap that made "én uge" fail on 22 August.
export const LETTER = "A-Za-zÀ-ÖØ-öø-ÿ";
export const edged = (pattern) => new RegExp(`(?:^|[^${LETTER}])(?:${pattern})(?![${LETTER}])`, "i");
