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

// ── AND THE SHORT FORMS, WHICH ARE MOST OF HOW DATES ARE WRITTEN ────
//
// Measured 12 Sep 2026: "14 Sep" read as no date at all, and so did "Jan 5",
// "3 Oct" and every abbreviated month in every language above. The table held
// full names only.
//
// The sharpest version of it is in this file's own comments: the range pattern
// for a booking confirmation is annotated "which is how a booking confirmation
// prints it: 'Sep 28 - Oct 3'" — an example it could never have matched.
//
// ── AND THEY ARE DELIBERATELY NOT ALLOWED TO STAND ALONE ────────────
//
// Jan is one of the commonest male first names in Denmark, Germany and the
// Netherlands. Mar, Mai and Max are names, "dec" ends words, and a bare
// three-letter token is inside a great many longer ones. So this list is for
// patterns where a DAY NUMBER sits against the month and settles it, and the
// bare-month reader keeps the full names: "Jan is coming with us" must never
// become January, which is the trip built for the wrong season all over again.
// May is left empty on purpose: "may", "maj", "mai" and "mei" are three letters
// already and are in the full table above.
export const MONTH_ABBR = {
  0:  ["jan"],
  1:  ["feb", "febr"],
  2:  ["mar", "mrz", "mär"],
  3:  ["apr"],
  4:  [],
  5:  ["jun"],
  // July has no entry. "jul" is Christmas in Danish, Swedish and Norwegian, and
  // this is a Danish app: "vi holder jul 24. december" read as 24 July 2027 —
  // seven months and a year wrong, on a sentence that spells December out.
  6:  [],
  7:  ["aug"],
  8:  ["sep", "sept"],
  9:  ["oct", "okt", "ott"],
  10: ["nov"],
  // "des" is left out for the same reason one level down: it is the German
  // genitive article, so "Anfang des 3 Monats" became 3 December.
  11: ["dec", "dez", "dic"],
};
// Which entries are short forms rather than full names, so the trailing-only
// rule below can tell "maj" (a real Danish month name) from "jan" (a short form
// that happens to be one).
const MONTH_ABBR_WORDS = new Set(Object.values(MONTH_ABBR).flat());
export const MONTH_INDEX_ABBR = Object.fromEntries(
  Object.entries(MONTHS).concat(Object.entries(MONTH_ABBR))
    .flatMap(([i, names]) => names.map(n => [n, Number(i)]))
);
export const MONTH_PATTERN_ABBR = Object.keys(MONTH_INDEX_ABBR)
  .sort((a, b) => b.length - a.length)
  .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

// ── AND NOT ALL OF THEM MAY COME FIRST ──────────────────────────────
//
// "Sep 28 - Oct 3" needs the month-then-day order. "Jan 3 af os kommer" is
// three of us and a man called Jan, and it read as 3 January 2027.
//
// The difference is not the pattern, it is the word: a short form that is also
// a common first name may only appear AFTER its day number, where "14 jan" has
// nothing else it could mean. Jan is among the commonest male names in Denmark,
// Germany and the Netherlands; Mar and Mai are names too. The full month names
// keep both orders, so "May 3" is untouched.
const NAME_LIKE_MONTHS = new Set(["jan", "mar", "mai", "maj", "mei", "may"]);
export const MONTH_PATTERN_ABBR_TRAILING = Object.keys(MONTH_INDEX_ABBR)
  .filter(w => !(NAME_LIKE_MONTHS.has(w) && MONTH_ABBR_WORDS.has(w)))
  .sort((a, b) => b.length - a.length)
  .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

// ── HOW LONG ────────────────────────────────────────────────────────
// PLAIN WORDS, NOT PATTERNS. These go through `alt`, which escapes regex
// characters, so a "days?" shorthand became the literal string "days?" and
// "7 days" stopped parsing in English while "7 dagen" carried on working. Every
// form is spelled out instead.
// "dager" is Norwegian and was the one gap: "5 dager" read as nothing in a
// language this app claims to read, which since 12 Sep means a blocked build
// rather than a wrong number.
export const DAY_WORDS = ["day", "days", "dag", "dage", "dagen", "dagar", "dager", "tag", "tage", "giorno", "giorni"];
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
// ── THE SPOUSE WORDS ON THEIR OWN, WHICH IS A DIFFERENT QUESTION ────
//
// 6 Sep 2026. Oliver's own run: "I'm with my gay husband and 2 kids" came back
// as a party of 2 CHILDREN and no adults, and partyLine's comment says that
// line "is what the guide builder reads". A guide was planned for two
// unaccompanied children.
//
// PARTY_POSSESSIVE above is the list for "did they say who is coming", so it
// holds children and parents too, and it is the wrong list for "are they a
// couple": a man travelling with his parents is three people, not two. This is
// the subset that means exactly one other adult.
//
// Bare "man" and "mand" are in here because they are husband in Dutch and
// Danish. They are only ever matched behind a possessive, which is the same
// guard PARTY_RE uses and for the same reason: "man kan tage toget til Ribe"
// must not report that somebody said who was coming.
export const PARTNER_WORDS = [
  "wife", "husband", "spouse", "partner", "girlfriend", "boyfriend", "missus", "other half",
  "kone", "mand", "kæreste", "ægtefælle",
  "frau", "mann", "ehefrau", "ehemann", "freundin", "freund",
  "vrouw", "vriendin", "vriend",
  "fru", "make", "maka", "sambo", "flickvän", "pojkvän",
  "kjæreste", "ektefelle",
];

// The words that put a person BESIDE the traveller rather than listing them.
// "me and my husband" was read and "I'm with my husband" was not, which is one
// preposition between a correct party and a party of children on their own.
export const WITH_WORDS = [
  "with", "together with", "along with",
  "med", "sammen med", "tillsammans med", "ilag med",
  "mit", "zusammen mit", "met", "samen met", "con",
];

// First person singular, for "<possessive> <partner> and me".
export const ME_WORDS = ["me", "i", "mig", "jeg", "ich", "mir", "ik", "jag", "mi", "meg"];

export const PARTY_POSSESSIVES = [
  "my", "our", "ours",
  "min", "mit", "mine", "vores", "vor", "vore",
  // The German dative forms too: "mit meiner Frau" is how the preposition shape
  // below is actually written, and "meine" alone never matches it.
  "mein", "meine", "meiner", "meinem", "meinen", "unser", "unsere", "unserer", "unseren", "unserem",
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
// \u2500\u2500 AND DANISH "i" IS NOT THE DANISH FOR "in" HERE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Danish marks a future point with "om": "om 3 dage" is in three days. "i 3
// dage" is FOR three days, the length of the stay, and it is the commonest way
// a Dane says it. With "i" on this list "Vi bliver i 3 dage" read as an arrival
// three days from now AND lost the day count, in the app's primary language.
// Found by a review on 12 Sep 2026. Swedish and Norwegian use "om" too.
export const IN_N_DAYS = ["in", "om", "over", "binnen", "fra", "tra"];

// ── AND THE VERBS FOR THE OTHER END OF THE JOURNEY ──────────────────
//
// TRAVEL_VERBS below is about LEAVING: travel, go, fly, drive, rejser, fahren.
// Every one of them is a verb you apply to yourself before you set off, and the
// list has no word for getting there.
//
// 12 Sep 2026, measured on relativeAnswerIn: "we land tomorrow" and "I'm coming
// today" both read as NOT an answer about dates, while "I arrive tomorrow"
// read as one — because `arrive` had been added by hand to one stoplist in
// tripEvents.js and `land` and `come` had not. That is this repo's signature
// bug in a five-word sentence, and the fix is the list rather than a sixth
// hand-patch of the stoplist.
//
// Separate from TRAVEL_VERBS rather than merged into it, because readOrigin
// treats the two differently on purpose: "flying from Oslo" says where they
// START and "landing in Billund" says where they ARRIVE, and one list would
// make those the same sentence.
export const ARRIVAL_VERBS = [
  // English
  "arrive", "arrives", "arriving", "arrival", "land", "lands", "landing", "landed",
  "come", "comes", "coming", "get in", "getting in", "fly in", "flying in", "touch down",
  // Danish and Norwegian
  "ankommer", "ankomme", "ankomst", "kommer", "komme", "lander", "lande",
  // Swedish
  "anländer", "anlander", "landar",
  // German and Dutch
  "ankommen", "ankommt", "kommt", "landet", "aankomen", "aankomst", "landen",
];

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

// ── THE APOSTROPHE THE PHONE TYPES, NOT THE ONE WE WROTE ────────────
//
// Oliver, 12 Sep 2026: "the map fails to delete markers when you say things
// like 'I'm not going to Aarhus' or 'I don't want to go to Aarhus'."
//
// Measured before fixing, against the shipped readers:
//
//   "I don't want to go to Aarhus"   read, and the pin came off
//   "I don't want to go to Aarhus"   read nothing at all, and the pin stayed
//
// The two strings differ in one character. The second carries U+2019, the
// apostrophe every iPhone, every Android keyboard and Word substitute as you
// type, and the one this codebase has never once spelled: previewMatch.js holds
// 75 straight apostrophes and no curly one, beenThere.js 11 and none, and the
// files that read what a traveller wrote are the whole of that list.
//
// So a phone is not a minority case, it is most of them, and every "don't",
// "won't", "isn't" and "I've" in every traveller-facing pattern in this project
// has been quietly unreachable from a phone since the day it was written.
//
// ── NORMALISE AT THE DOOR, NOT IN SEVENTY-FIVE PATTERNS ─────────────
//
// Spelling both apostrophes in every pattern is the hand-copied list this repo
// has already paid for four times, and the next pattern anybody adds would be
// straight-only again. One call at each reader's entry, and everything written
// downstream of it is safe by construction.
//
// The reverse direction (curly to straight) rather than the other way round,
// because straight is what the patterns already say. Grave and acute accents
// come too: they are what a keyboard set to a different layout produces for the
// same keystroke. Double quotes are folded for the same reason — the stay reader
// missed 25hours Hotel Paper Island last night partly for sitting behind one.
export const straighten = (s) =>
  String(s ?? "").replace(/[‘’‛ʼ´`]/g, "'").replace(/[“”‟]/g, '"');

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
// ── WHAT KIND OF TRIP, IN THE LANGUAGES THE APP READS ───────────
//
// `interests` became a HARD slot on 12 Sep 2026: nothing builds until it is
// answered. The list it was read from lived in tripBrief.js and was ENGLISH
// ONLY, which a Fable review measured the same night with the app's own Danish
// question in hand. `askDa` offers "Mad, historie, design, natur, natteliv
// eller noget helt andet", and of those five only "design" could be read back.
//
//   "Mad og natur"        -> nothing      "Natur"     -> nothing
//   "Historie"            -> nothing      "Natteliv"  -> nothing
//   "Essen und Geschichte" -> nothing     "Natuur"    -> nothing
//
// So a Danish traveller answered the question honestly, was told the answer did
// not land, answered again, and could never build a guide. Oliver's father uses
// this in Danish. Making the slot hard is what turned a wrong theme into a
// locked door, and the door was locked for every language but one.
//
// KEYED BY THE ENGLISH TERM, which is what the value carries downstream: the
// brief block, briefThemes, the nightlife gate and the guide prompt all read
// these words, so a Danish answer has to arrive as "food, nature" rather than
// as "mad, natur". The key is the canonical term and never appears in a list.
//
// English gaps are fixed here too, found in the same sweep: culture, theme
// parks, sightseeing, cycling and the outdoors all read as nothing, and two of
// them are in the system prompt's own example question.
//
// WHAT IS DELIBERATELY NOT HERE: bare "park" ("we parked the car"), bare "bike"
// and "cykel" (that is the transport slot's word and this reader runs over the
// whole conversation), and place names. A hotel called Paper Island filled this
// slot with "island" on 11 Sep and rebuilt a ten day trip around it; a reader
// that takes proper nouns would do that again on purpose.
// ── SOMEBODY UNDER EIGHTEEN IS ON THIS TRIP ─────────────────
//
// Spelled three times before 12 Sep: `NAMES_A_CHILD` in directAnswer.js,
// `NAMES_CHILDREN` in briefConflicts.js, and nothing at all in tripBrief.js,
// which is the file that reads a party out of a sentence. They differed. The
// first knew about sons and daughters and ages, the second knew about families
// and the Danish "barn", and the slot that decides whether a night out is
// planned for a trip with children read whichever one it happened to reach.
//
// FAMILY COUNTS. It is how the intake form spells it and it is how people say
// it, and where it is wrong the cost is a night out not suggested to two adults,
// which they can ask for. The other direction is a bar crawl planned around
// somebody's seven year old.
export const NAMES_A_CHILD = /(?:^|[^A-Za-z\u00c0-\u00ff])(?:kids?|child|children|toddlers?|bab(?:y|ies)|teens?|teenagers?|son|daughter|grandkids?|grandchildren|famil(?:y|ies)|b(?:\u00f8|o)rn|barn|barnet|kinder|sohn|tochter|familie|gezin|kind(?:eren)?)(?![A-Za-z\u00c0-\u00ff])|(?:^|[^A-Za-z\u00c0-\u00ff])(?:1[0-7]|[1-9])\s*(?:year|yr|\u00e5r|jahre)s?[- ]?old(?![A-Za-z\u00c0-\u00ff])/i;

export const INTEREST_TERMS = {
  food: ["food", "eat", "restaurant", "cuisine", "dining", "foodie",
         "mad", "spisesteder", "gastronomi", "smagsoplevelser",
         "essen", "speisen", "gastronomie", "kulinarisch",
         "eten", "restaurants",
         "mat", "restauranger"],
  history: ["history", "historic", "historical", "heritage",
            "historie", "historisk", "historiske", "kulturarv",
            "geschichte", "historisch", "geschichtlich",
            "geschiedenis", "erfgoed",
            "historia", "historisk"],
  viking: ["viking", "vikings", "vikinge", "vikinger", "wikinger", "vikingar"],
  museum: ["museum", "museums", "museer", "museet", "museen", "musea", "muse\u00e9"],
  design: ["design", "designs"],
  architecture: ["architecture", "arkitektur", "architektur", "architectuur"],
  nature: ["nature", "outdoors", "countryside", "wilderness",
           "natur", "naturen", "friluftsliv",
           "natuur",
           "naturens"],
  hiking: ["hiking", "hike", "trekking", "vandring", "vandreture", "vandretur",
           "wandern", "wanderung", "wandelen", "vandra", "fottur"],
  cycling: ["cycling", "bike ride", "bike rides", "biking", "cykelferie",
            "cykelture", "cykeltur", "radfahren", "fietsen", "fietstocht", "cykling"],
  beach: ["beach", "beaches", "seaside", "coast", "coastal",
          "strand", "strande", "kyst", "kysten",
          "str\u00e4nde", "kuste", "k\u00fcste", "stranden", "kust",
          "str\u00e4nder", "kusten"],
  island: ["island", "islands", "\u00f8er", "\u00f8erne", "insel", "inseln", "eiland", "eilanden", "\u00f6ar"],
  nightlife: ["nightlife", "night out", "clubbing",
              "natteliv", "nattelivet", "g\u00e5 i byen", "ud i byen",
              "nachtleben", "ausgehen",
              "nachtleven", "uitgaan",
              "nattliv", "uteliv"],
  bar: ["bar", "bars", "pub", "pubs", "barer", "v\u00e6rtshus", "kneipe", "kneipen", "kroeg", "krogen"],
  beer: ["beer", "brewery", "breweries", "craft beer",
         "\u00f8l", "bryggeri", "bryggerier", "mikrobryggeri",
         "bier", "brauerei", "brouwerij", "\u00f6l", "bryggeri"],
  wine: ["wine", "vin", "wein", "wijn"],
  art: ["art", "gallery", "galleries", "street art",
        "kunst", "galleri", "gallerier", "kunstmuseum",
        "galerie", "galerij", "konst", "galleri"],
  culture: ["culture", "cultural", "kultur", "kulturelle", "kulturliv",
            "kulturell", "cultuur", "cultureel"],
  shopping: ["shopping", "shops", "boutiques", "indk\u00f8b", "butikker",
             "einkaufen", "winkelen", "shoppa"],
  castle: ["castle", "castles", "palace", "palaces", "manor",
           "slot", "slotte", "slottet", "herreg\u00e5rd", "borg",
           "schloss", "schl\u00f6sser", "burg", "kasteel", "kastelen", "slott"],
  church: ["church", "churches", "cathedral", "abbey",
           "kirke", "kirker", "domkirke", "katedral",
           "kirche", "kirchen", "kerk", "kerken", "kyrka", "kyrkor"],
  "theme park": ["theme park", "theme parks", "amusement park", "amusement parks",
                 "forlystelsespark", "forlystelsesparker", "tivolier",
                 "freizeitpark", "vergn\u00fcgungspark", "pretpark", "attractiepark",
                 "n\u00f6jespark", "tivolipark"],
  zoo: ["zoo", "zoos", "aquarium", "zoologisk", "dyrepark", "dierentuin", "djurpark"],
  sightseeing: ["sightseeing", "sights", "landmarks",
                "sev\u00e6rdigheder", "sev\u00e6rdighederne",
                "sehensw\u00fcrdigkeiten", "bezienswaardigheden", "sev\u00e4rdheter"],
  "christmas market": ["christmas market", "christmas markets", "julemarked",
                       "julemarkeder", "weihnachtsmarkt", "weihnachtsm\u00e4rkte",
                       "kerstmarkt", "julmarknad"],
  relax: ["relax", "relaxing", "slow", "unwind", "chill",
          "afslapning", "slappe af", "rolige dage",
          "entspannen", "entspannung", "ontspannen", "koppla av", "avslappning"],
  quiet: ["quiet", "peaceful", "stille", "fredeligt", "ruhig", "rustig", "lugnt"],
  photography: ["photography", "photo spots", "fotografering", "fotografie", "fotografi"],
  music: ["music", "live music", "concert", "concerts", "gig",
          "musik", "koncert", "koncerter", "livemusik",
          "konzert", "muziek", "concert", "musik", "konsert"],
  festival: ["festival", "festivals", "festivaler", "festivals", "festivaler"],
  hygge: ["hygge", "hyggelig", "hyggeligt", "cosy", "cozy", "gem\u00fctlich", "gezellig", "mysigt"],
  spa: ["spa", "wellness", "kurbad", "badeland", "sauna"],
  "hidden gem": ["hidden gem", "hidden gems", "off the beaten", "local spot",
                 "local spots", "skjulte perler", "perler", "lokale steder",
                 "geheimtipp", "geheimtipps", "verborgen parels", "dolda p\u00e4rlor"],
  surf: ["surf", "surfing", "surfen", "surfa"],
  wildlife: ["wildlife", "birdwatching", "birding", "dyreliv", "fugle", "fuglekiggeri",
             "tierwelt", "vogelbeobachtung", "dieren", "djurliv"],
};
// Flattened once, word -> canonical term, longest first so "christmas market"
// is read before "market" would be if it were ever added.
export const INTEREST_WORD_TERM = (() => {
  const out = new Map();
  Object.entries(INTEREST_TERMS).forEach(([term, words]) => {
    words.forEach(w => { if (!out.has(w)) out.set(w, term); });
  });
  return out;
})();
export const INTEREST_ALL_WORDS = [...INTEREST_WORD_TERM.keys()].sort((a, b) => b.length - a.length);

export const edged = (pattern) => new RegExp(`(?:^|[^${LETTER}])(?:${pattern})(?![${LETTER}])`, "i");
