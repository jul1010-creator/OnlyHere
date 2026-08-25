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
// ── "OUR" WAS NOT IN THE LIST ───────────────────────────────────────
//
// 25 Aug 2026. Oliver's own test brief opened "Two adults and our son, he's 7."
// `party` is a BLOCKING slot, and it came back empty. "my son" filled it; "our
// son" did not, because this list held every first-person SINGULAR possessive in
// five languages and no plural one.
//
// A couple travelling together says "our son". That is not an edge case, it is
// the normal way two people describe a third, and it is the exact sentence this
// slot exists to catch.
export const PARTY_POSSESSIVES = [
  "my", "our", "ours",
  "min", "mit", "mine", "vores", "vor", "vore",
  "mein", "meine", "unser", "unsere", "unseren", "unserem",
  "mijn", "m'n", "onze", "ons",
  "vår", "vårt", "våra", "var", "vart",
  "mi", "nuestro", "nuestra",
];

// Safe on their own: none of these is a common word in another sense.
export const PARTY_BARE = [
  // "adults" was missing from the ENGLISH list while voksne, erwachsene,
  // volwassenen and vuxna were all present below — the one language the product
  // is written in was the one this word was left out of. Found 25 Aug 2026 on
  // "Two adults and our son", which filled nothing.
  // ── EVERY ENTRY HERE IS A LITERAL WORD, NOT A PATTERN ────────────
  //
  // `alt` escapes regex metacharacters, correctly — this list also holds "m'n"
  // and "b&b" and a word list that silently compiled as a pattern would be far
  // worse. But that means "kids?" has always meant the LITERAL STRING "kids?",
  // question mark included, and "friends?" likewise.
  //
  // So "we have kids" and "travelling with friends" — the two most ordinary
  // English answers there are — have never filled this slot, on a BLOCKING slot,
  // for as long as it has existed. "family", "children", "solo" and "alone" carry
  // no metacharacter and work, which is why nobody noticed: the list looked like
  // it covered English and covered four words of it.
  //
  // Found 25 Aug 2026 while adding "adults", by writing the assertion for the
  // word rather than for the count in front of it. Both forms are spelled out
  // now, and the suite asserts that no entry in these lists contains a quantifier
  // so nobody writes "kids?" again expecting it to mean something.
  "adults", "adult", "grown-ups", "grown ups", "grownups", "grown-up",
  "grandkids", "grandkid", "grandchildren", "grandchild", "teenagers", "teenager", "teens",
  "kids", "kid", "children", "child", "toddler", "baby", "family", "friends", "friend",
  "solo", "alone", "just me",
  "børn", "børnene", "barnebarn", "børnebørn", "familie", "familien", "venner", "vennerne", "alene", "os to", "kun mig", "voksne",
  "kinder", "kindern", "enkelkinder", "enkelkindern", "enkel", "familie", "freunde", "freunden", "allein", "alleine", "zu zweit", "erwachsene", "erwachsenen",
  "kinderen", "kleinkinderen", "gezin", "familie", "vrienden", "vriendin", "vriend", "alleen", "z'n tweeën", "met z'n tweeën", "volwassenen",
  "barn", "barnen", "barnbarn", "familj", "familjen", "vänner", "vännerna", "ensam", "vuxna",
  "bambini", "famiglia", "amici", "da solo",
];
// "we are 4", "vi er 4", "wir sind 4", "we zijn met 4", "vi är 4", plus "4 adults".
// A NUMBER PEOPLE WRITE AS A WORD IS STILL A NUMBER. This read `\d+` only, so
// "two adults" and "four of us" — which is how anybody actually types it — filled
// nothing, while "2 adults" filled it. Same list serves the day count.
export const SPELLED_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  en: 1, et: 1, to: 2, tre: 3, fire: 4, fem: 5, seks: 6, syv: 7, otte: 8, ni: 9, ti: 10,
  ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  twee: 2, drie: 3, vijf: 5, zes: 6, zeven: 7, negen: 9, tien: 10,
  två: 2, tva: 2, fyra: 4, sex: 6, sju: 7, åtta: 8, atta: 8, nio: 9, tio: 10,
};
const NUM_WORD = Object.keys(SPELLED_NUMBERS).join("|");
export const NUMBER_TOKEN = `(?:\\d+|${NUM_WORD})`;
export const PARTY_COUNT = [
  `${NUMBER_TOKEN}\\s+(?:of us|people|adults?|grown[- ]?ups?|voksne|erwachsene|volwassenen|vuxna|personer|personen|persones)`,
  `(?:we are|we're|vi er|vi är|wir sind|we zijn(?:\\s+met)?|siamo)\\s+${NUMBER_TOKEN}`,
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

// ── LEAVING, AND THE VERBS AN ANSWER IS ALLOWED TO CONTAIN ──────────
//
// Oliver, 23 Aug 2026, six photographs. Replayed through readBrief his six
// Danish turns produced this:
//
//     known   : days, interests
//     missing : origin, when, party, transport, stay
//
// He had said "jeg rejser fra Faxe by", "jeg kører i bil" and "jeg rejser i
// dag". Three answers, given plainly, to Gemlyx's own questions, and the app
// heard none of them. The readers were English: fly, land, arrive, come,
// start, drive, by car, on foot.
//
// TRAVEL_VERBS is the shared list. relativeAnswerIn uses it to decide whether a
// turn is an ANSWER about a date or a sentence that merely contains one, which
// is why "jeg rejser i dag" was rejected while a bare "i dag" was accepted: the
// residue held the word "rejser" and nothing allowed it. readOrigin uses it for
// the other half, a departure stated as a verb plus "from".
export const TRAVEL_VERBS = [
  // English
  "travel", "travels", "travelling", "traveling", "leave", "leaves", "leaving",
  "go", "goes", "going", "head", "heading", "set off", "setting off", "depart", "departing",
  "fly", "flies", "flying", "drive", "drives", "driving", "sail", "sailing",
  // Danish and Norwegian
  "rejser", "rejse", "rejste", "tager", "tage", "kører", "køre", "flyver", "flyve",
  "sejler", "sejle", "drar", "dra", "reiser", "reise", "afsted", "af sted", "sted",
  // Swedish
  "reser", "resa", "åker", "åka", "aker", "flyger",
  // German
  "reise", "reisen", "reist", "fahre", "fahren", "fährt", "fahrt", "fliege", "fliegen", "fliegt",
  "losfahren", "abreise",
  // Dutch
  "reis", "reizen", "reist", "vertrek", "vertrekken", "vertrekt", "rijd", "rijden", "vlieg", "vliegen",
];

// ── FROM, IN SIX LANGUAGES ──────────────────────────────────────────
// The preposition that turns a travel verb into a departure. Kept separate from
// the verbs because "til Ribe" and "fra Ribe" are opposite facts and only one of
// them says where the trip starts.
export const FROM_WORDS = ["from", "fra", "frå", "von", "ab", "aus", "uit", "vanuit", "da", "di"];

// ── HOW THEY GET AROUND ─────────────────────────────────────────────
// Two shapes, because a mode is answered two ways: a preposition and a vehicle
// ("i bil", "med tog", "by car", "mit dem Auto"), or a verb on its own
// ("cykler", "kører", "driving").
//
// The vehicle nouns carry their definite forms, because Danish glues the article
// on: bil, bilen, tog, toget, cykel, cyklen. A list without them reads "med
// toget" as no answer at all, which is how a traveller who said how they were
// getting around was asked again.
export const TRANSPORT_PREPS = ["by", "on", "in", "with", "i", "med", "på", "pa", "til", "mit", "per", "zu", "met", "te"];
export const VEHICLE_WORDS = [
  "car", "cars", "bil", "bilen", "bilkørsel", "auto", "wagen", "pkw", "leiebil", "lejebil", "udlejningsbil",
  "bike", "bikes", "bicycle", "cycle", "cykel", "cyklen", "cykler", "fiets", "fahrrad", "rad", "sykkel",
  "train", "trains", "tog", "toget", "zug", "trein", "tåg", "tag",
  "bus", "busses", "buses", "bussen", "bussar", "coach",
  "camper", "campervan", "motorhome", "autocamper", "wohnmobil",
  "scooter", "moped", "motorcykel", "motorcycle",
  "foot", "fods", "fod", "fuß", "fuss", "voet",
  "færge", "faerge", "ferry", "fähre", "veerboot",
];
// Verbs that state a mode on their own, with no vehicle noun after them.
export const TRANSPORT_VERBS = [
  "cycling", "biking", "driving", "walking", "hitchhiking",
  "cykler", "cykle", "kører", "køre", "går", "gå", "vandrer", "sejler",
  "fahre", "fahren", "radle", "radeln", "laufe", "laufen", "wandern",
  "fiets", "fietsen", "loop", "lopen", "rijd", "rijden",
  "cyklar", "kör", "gar", "sykler",
];
// Public transport, which is a mode and names no vehicle.
export const PUBLIC_TRANSPORT = [
  // ── A LIST OF MODES IS AN ANSWER ─────────────────────────────────
  // "Trains, buses and ferries only" filled nothing, because every transport
  // pattern required a movement word or a preposition beside the vehicle, and a
  // person answering "how are you getting around?" answers with the modes. The
  // plurals are listed as their own words rather than left to VEHICLE_WORDS,
  // which needs "by"/"on"/"taking" in front of it to avoid matching "is the train
  // to Odense expensive?" — a bare plural in a list does not have that problem.
  "trains", "buses", "busses", "ferries", "coaches", "trams",
  "tog", "toge", "busser", "færger", "faerger",
  "züge", "zuge", "busse", "fähren", "fahren",
  "treinen", "bussen", "veerboten",
  "tåg", "tag", "bussar", "färjor", "farjor",
  "public transport", "public transportation",
  "offentlig transport", "offentlige transportmidler", "kollektiv trafik", "kollektiv transport",
  "öffentliche verkehrsmittel", "offentliche verkehrsmittel", "öpnv", "opnv",
  "openbaar vervoer", "kollektivtrafik", "kollektivtrafikk",
];

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
