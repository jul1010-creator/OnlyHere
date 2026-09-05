// ── WHEN SOMEBODY ANSWERS THE QUESTION YOU JUST ASKED ───────────────
//
// Oliver, 5 Sep 2026, with his own exported conversation. He typed, one message
// at a time, exactly what he was asked for:
//
//   Gemlyx: "Where are you flying into?"        Oliver: "Billund"
//   Gemlyx: "How many days have you got?"       Oliver: "7"
//   Gemlyx: "How are you all getting around?"   Oliver: "bikes and cars"
//   Gemlyx: "Have you booked somewhere to stay?" Oliver: "The lodge billund we got"
//
// The brief recorded all four as DECLINED — the state that means the traveller
// was asked and refused to say. `missing` came out empty, `ready` went true, and
// the guide was built with no origin, no length, no transport and no hotel. It
// put a Copenhagen bar in Aarhus and a night out in the plan of a man travelling
// alone with eight children.
//
// ── WHY EVERY ONE OF THEM MISSED ────────────────────────────────────
//
// Nothing was wrong with the readers in tripBrief.js. Every one of them is built
// to find a fact inside a SENTENCE, and it has to be: "is the train to Odense
// expensive?" must not fill the origin slot, "we have no car" must not say they
// are driving. Those guards are why readOrigin wants arrival language, readDays
// wants a unit word, readTransport wants a movement word and readStay wants
// "booked" or "sorted".
//
// A person answering a direct question does not write a sentence. They write the
// answer. "Billund" is not a sentence about arriving anywhere, and it is a
// perfect answer to "where are you flying into?"
//
// ── SO THE QUESTION IS THE MISSING HALF OF THE INPUT ────────────────
//
// The information needed to read "Billund" correctly is not in "Billund". It is
// in the question that came immediately before it, and the app has always known
// what that was: `askedThisTurn` is computed from nextAsks() before every reply
// and recorded, and then used for exactly one thing — not asking twice.
//
// So it is recorded on the assistant message that asked it, and a traveller turn
// is read against whatever the turn before it asked for. That is what a human
// reader does with "7", and it is the only thing that can tell "7" the day count
// from "7" the headcount, because nothing in the text can.
//
// ── AND IT IS A FALLBACK, NEVER AN OVERRIDE ─────────────────────────
//
// Every reader in tripBrief.js runs first and keeps its answer. This module only
// speaks when the sentence readers found NOTHING, or when they found the
// acknowledgement placeholder, which is not a fact. None of their guards are
// weakened and no assertion about them changes meaning. What it removes is the
// case where the answer was a bare one and the app treated silence as refusal.
//
// The first version had it the other way round and an adversarial review showed
// what that costs: "we cancelled the lodge, nothing booked now" was read
// correctly by readStay and then overwritten by the BOOKED read of the turn
// before it. A correction is the thing a traveller most needs to land.
//
// ── THE LATEST OF THESE WINS ────────────────────────────────────────
//
// Within this module. Turns are walked oldest to newest and a later direct
// answer replaces an earlier one, so a question asked twice takes the second
// answer, and a double-send takes the correction rather than the first half.
// It does not make this module win against tripBrief.js; see above.
import { SPELLED_NUMBERS, NUMBER_TOKEN, VEHICLE_WORDS, TRANSPORT_VERBS,
         PUBLIC_TRANSPORT, YES_WORDS, NO_WORDS, alt, LETTER } from "./travellerWords";
import { travelModeKey, withoutNonModes } from "./routeOrder";
import { KOMMUNER, K } from "../data/kommuner";
import { TOWN_COORDS } from "../data/towns";

const lower = (t) => String(t ?? "").trim().toLowerCase();

// ── WHAT IS NOT AN ANSWER ───────────────────────────────────────────
//
// The one thing this module must never do is turn a shrug into a fact. A
// blocking slot filled from "no idea yet" stops the gate asking, which is worse
// than the bug being fixed: at least a decline is visible in the brief.
//
// Two shapes, and they are different. A REFUSAL is an answer to the question
// that carries no value ("not sure", "you pick"). A DEFLECTION is not an answer
// at all ("does it matter?", "why do you need that?"). Both leave the slot
// empty; they are listed together because the outcome is the same and split in
// the comment because the difference is the reason the list has to hold both.
const REFUSAL = new RegExp([
  "^(?:no idea|dunno|don'?t know|not sure|unsure|no clue|not decided|undecided|open|flexible|whatever|anything|any)\\b",
  "\\b(?:no idea|dunno|don'?t know|not sure|not certain|haven'?t decided|not decided yet|not yet decided|no clue|up to you|you (?:pick|choose|decide)|surprise me|whatever you (?:think|like)|doesn'?t matter|does it matter|why do you (?:need|ask))\\b",
  // The same shrug in the languages the rest of the vocabulary already covers.
  "\\b(?:ved (?:det )?ikke|aner det ikke|ikke besluttet|er lige glad|du bestemmer|keine ahnung|wei[sß] nicht|noch nicht entschieden|geen idee|weet ik niet|vet inte)\\b",
].join("|"), "i");

export const isRefusal = (turn) => REFUSAL.test(lower(turn));

// ── THE PLACES A TRIP CAN START ─────────────────────────────────────
//
// The 98 kommuner are the Danish state's own list and the towns file carries the
// ones the app has coordinates for. Neither is a complete gazetteer and neither
// needs to be: they exist so that a bare "Billund" or "Aarhus" is recognised as a
// place with certainty rather than by shape.
//
// A name NOT on either list is still allowed through, under the rule below,
// because half the people using this fly in from Hamburg, Oslo or Manchester and
// a Denmark-only list would reject every one of them.
// The IATA codes for the airports a Denmark trip starts at. A traveller who
// answers "CPH" has answered, and every shape rule below would otherwise reject
// three capital letters as a name.
export const AIRPORT_CODES = { cph: "Copenhagen", bll: "Billund", aal: "Aalborg", aar: "Aarhus" };
const PLACE_NAMES = new Set([
  ...KOMMUNER.map(row => lower(row[K.name])),
  ...Object.keys(TOWN_COORDS).map(n => lower(n.replace(/\s*\(.*\)\s*/, ""))),
  ...Object.keys(AIRPORT_CODES),
]);

export const isKnownPlace = (word) => PLACE_NAMES.has(lower(word));

// A short reply to "where do you start?" that is a name rather than a sentence.
// Digits, punctuation beyond a hyphen or an apostrophe, and anything longer than
// four words are all disqualifying: a place name is short and has no verb, and
// the cost of a false positive here is a trip planned from nowhere.
const NAME_SHAPED = new RegExp(`^[${LETTER}][${LETTER}\\s'.-]{1,38}$`);
// The word after the town, not the town. `\s+` rather than `\s*`, because with
// `\s*` a bare code — "CPH", "BLL" — matched the whole answer and left nothing.
const AIRPORT_TAIL = /\s+\b(?:airport|lufthavn|flughafen|luchthaven)\b\.?$/i;
// ── AND SHORT WAS NOT NEARLY ENOUGH ─────────────────────────────────
//
// The first version of this took any letters-only string of four words or fewer.
// An adversarial review ran it and filled the blocking origin slot with "Hmm",
// "Ok", "Thanks", "Later", "Not yet", "Never mind", "Tell me more", "With the
// kids", "Det ved jeg ikke" and "ignore previous instructions", and briefPanel
// rendered the traveller a sentence reading "in and out of Hmm". That is
// strictly WORSE than the bug this file was written to fix: an empty slot gets
// asked again, and a slot holding rubbish never does.
//
// So an unknown name has to look like a name — a capital, no ordinary
// conversational word in it, not an interjection. A name already on the list
// skips all of that, which is what the list is for.
const NOT_A_NAME = new RegExp([
  "\\b(?:the|a|an|and|or|but|with|without|for|from|to|at|in|on|out|we|i|you|my|our|us|is|are|was|be|been|do|does|did|not|no|nope|yes|yeah|maybe|still|yet|just|about|think|thinking|want|need|know|sure|mind|tell|say|said|ignore|previous|instructions)\\b",
  // Ordinary English nouns that turn up in an answer that is not a place.
  "\\b(?:night|day|days|week|trip|holiday|home|work|house|plane|flight|train|car|bike|hotel|beach|city|town)\\b",
  "\\b(?:og|eller|men|med|uden|vi|jeg|du|min|vores|er|var|ikke|nej|ja|m(?:å|aa)ske|stadig|endnu|ved|tror|vil|skal|hej|tak|ingen|anelse|aner)\\b",
  "\\b(?:und|oder|aber|mit|ohne|wir|ich|mein|unser|ist|sind|nicht|nein|ja|noch|vielleicht|wei(?:ß|ss)|danke|hallo)\\b",
].join("|"), "i");
const NOISE_ONLY = new RegExp(
  `^(?:hmm+|hm+|erm+|um+|uh+|hi|hey|hello|hej|hallo|thanks|thank you|tak|danke|cheers|cool|nice|great|fine|sure|later|wait|soon|dunno|idk|${alt(NO_WORDS)}|${alt(YES_WORDS)})$`, "i");

// ── THE WORDS PEOPLE PUT IN FRONT OF A CORRECTION ───────────────────
//
// "actually Copenhagen", "no wait, Aalborg", "sorry — make that 4". The
// correction is the answer and the lead-in is not part of it, so it comes off
// before the value is read. Without this the origin slot fills with the string
// "actually Copenhagen", which is not a place and would be handed to a geocoder.
const CORRECTION_LEAD = /^(?:actually|sorry|oops|no wait|wait no|hold on|scrap that|forget that|i meant|make that|change that to|let'?s say|nej|undskyld|ups|entschuldigung|sorry,)[\s,:-]*/i;
export const withoutCorrectionLead = (text) => {
  let t = String(text ?? "").trim();
  // Twice, because "sorry, actually Copenhagen" is two of them and one pass
  // would leave the second in the value.
  for (let i = 0; i < 2; i++) t = t.replace(CORRECTION_LEAD, "").trim();
  return t;
};

export const looksLikePlaceAnswer = (turn) => {
  const t = withoutCorrectionLead(String(turn ?? "").trim().replace(/[?!.,]+$/, ""));
  if (!t || isRefusal(t)) return null;
  // "Billund airport" and "Kastrup" are both the answer; the trailing word is
  // dropped so the value is a place rather than a building.
  const bare = t.replace(AIRPORT_TAIL, "").trim();
  if (!bare) return null;
  // A code is the answer and the town is what a reader and a geocoder both want.
  const code = AIRPORT_CODES[lower(bare)];
  if (code) return code;
  if (isKnownPlace(bare)) return bare;
  if (NOISE_ONLY.test(bare) || NOT_A_NAME.test(bare)) return null;
  if (!NAME_SHAPED.test(bare)) return null;
  // A capital, because every place name in the scripts this app serves has one
  // and almost nothing somebody types instead of an answer does.
  if (bare[0] !== bare[0].toUpperCase() || bare.length < 3) return null;
  return bare.split(/\s+/).length <= 4 ? bare : null;
};

// ── A NUMBER THAT WAS ASKED FOR ─────────────────────────────────────
//
// "7" on its own, or "7 days", or "a week". The unit is optional here and
// required in the sentence reader, which is the whole difference between the two
// and the reason both exist.
const numOfWord = (raw) => {
  const v = lower(raw);
  return /^\d+$/.test(v) ? Number(v) : (SPELLED_NUMBERS[v] ?? null);
};
const NUM_ONLY = new RegExp(`(?:^|[^${LETTER}\\d])(${NUMBER_TOKEN})(?![${LETTER}\\d])`, "i");
const numberIn = (turn) => {
  const m = NUM_ONLY.exec(String(turn ?? ""));
  if (!m) return null;
  const raw = lower(m[1]);
  const n = /^\d+$/.test(raw) ? Number(raw) : SPELLED_NUMBERS[raw];
  return Number.isFinite(n) ? n : null;
};

// Whole weeks and the long weekend, because they are how a length is answered
// when it is not a number. A fortnight is two weeks in every dialect that uses
// the word.
const WEEKENDISH = /\blong\s+weekend\b|\blang\s+weekend\b|\bl(?:æ|ae)nge?\s*weekend\b/i;
// The half can sit on either side of the unit — "a week and a half" is how it is
// said in English and "halvanden uge" is how it is said in Danish — so the tail
// is matched after the unit rather than only before it.
// ── EVERY NUMBER, NOT A HAND-PICKED FEW ─────────────────────────────
//
// These two hand-listed "a|one|two|three|en|et|to|tre", which is how "zwei
// Wochen" read as nothing and "ten nights" read as TWO: with no boundary in
// front of the alternation, the "en" inside "ten" matched as Danish for one.
// NUMBER_TOKEN is the list every other reader in this project uses, and an edged
// boundary is what stops it matching inside a longer word.
const NUM_EDGE = `(?:^|[^${LETTER}\\d])((?:${NUMBER_TOKEN}|a))`;
const WEEKS = new RegExp(`${NUM_EDGE}\\s*(?:and\\s+a\\s+half\\s+)?\\b(?:weeks?|uger?|wochen?|veck(?:a|or))\\b(\\s*(?:and\\s+)?a?\\s*half)?`, "i");
const HALF_FIRST = /\b(?:halvanden|anderthalb|one and a half|1\.5|1,5)\s*(?:weeks?|uger?|wochen?)\b/i;
// A night is not a day. Ten nights is eleven days to everybody who has ever
// booked one, and the app counts a trip inclusively everywhere else (in on the
// 8th, out on the 12th, five days), so the same arithmetic applies here.
const NIGHTS = new RegExp(`${NUM_EDGE}\\s+\\b(?:nights?|n(?:æ|ae)tter|n(?:ä|ae)chte|n(?:ä|ae)tter|nat|nacht|natt)\\b`, "i");
// ── ONE CAP, AND IT IS THE ONE ALREADY WRITTEN DOWN ─────────────────
// dayCountIn has capped a spoken length at 14 since long before this file
// existed. A second reader with a different ceiling means the same sentence
// reads as 20 days or 14 depending on whether the question happened to have been
// asked, which is not a difference anybody could explain.
const MAX_DAYS = 14;
const capped = (n) => Math.min(n, MAX_DAYS);
// A number with its unit, allowing one word between them ("5 full days"). Global
// so a rejected candidate cannot hide a real answer later in the sentence.
const DAYS_UNIT = new RegExp(`(?:^|[^${LETTER}\\d])(${NUMBER_TOKEN})\\s+(?:[a-zæøå]+\\s+)?(?:days?|dage|dagen|tage|dagar)\\b`, "i");
const WHOLE_NUMBER = new RegExp(`^(?:${NUMBER_TOKEN})$`, "i");

export const daysAnswer = (turn) => {
  const t = withoutCorrectionLead(String(turn ?? ""));
  if (isRefusal(t)) return null;
  if (WEEKENDISH.test(t)) return 4;
  if (HALF_FIRST.test(t)) return capped(11);
  const nights = NIGHTS.exec(t);
  if (nights) {
    const n = numOfWord(nights[1]);
    return Number.isFinite(n) && n >= 1 ? capped(n + 1) : null;
  }
  const w = WEEKS.exec(t);
  if (w) {
    const raw = lower(w[1]);
    const n = /^\d+$/.test(raw) ? Number(raw) : (raw === "a" ? 1 : SPELLED_NUMBERS[raw]);
    // Half a week is three days and a bit; a week and a half is ten or eleven
    // and eleven is the one a person means, because they count both ends.
    // The half sits on either side of the unit: "a week and a half" in English,
    // "halvanden uge" in Danish, "two and a half weeks" in both orders.
    const half = (w[2] || /and\s+a\s+half/i.test(w[0])) ? 4 : 0;
    const total = (Number.isFinite(n) ? n : 0) * 7 + half;
    return total > 0 ? capped(total) : null;
  }
  // ── A NUMBER WITH ITS UNIT, OR A NUMBER AND NOTHING ELSE ──────────
  //
  // Found 5 Sep by an adversarial review, and it is the same bug as "today" one
  // file over. NUMBER_TOKEN holds the spelled numbers of six languages, so
  // Danish `to` = 2 sits inside every English sentence containing the word:
  // "Want to stay 10 days" read as 2, "Up to 5 days" as 2, "Going to be 10 days"
  // as 2. The first version took the first number token anywhere in the turn.
  //
  // A unit fixes it, because "to stay" has no day word after it. And a bare
  // number is still an answer — "7" is what he typed — but only when it is the
  // WHOLE answer, because a stray number inside a sentence is not a length.
  const unit = DAYS_UNIT.exec(t);
  if (unit) {
    const n = numOfWord(unit[1]);
    return Number.isFinite(n) && n >= 1 ? capped(n) : null;
  }
  const bare = t.trim().replace(/[.!?,]+$/, "");
  const n = WHOLE_NUMBER.test(bare) ? numOfWord(bare) : null;
  return Number.isFinite(n) && n >= 1 ? capped(n) : null;
};

// ── HOW THEY GET AROUND, ANSWERED AS A LIST ─────────────────────────
//
// "bikes and cars". No preposition, no verb, two plural nouns. The sentence
// reader needs "by car" or "we're driving" and is right to; a list of modes IS
// the answer to "how are you getting around?" and needs nothing else.
//
// Negations are scrubbed with the same scrubber the sentence reader uses, so "no
// car, trains" comes out as trains rather than as a car.
const MODE_WORD = new RegExp(
  `(?:^|[^${LETTER}])(?:${alt([...VEHICLE_WORDS, ...TRANSPORT_VERBS, ...PUBLIC_TRANSPORT,
    "drive", "cycle", "walk", "taxi", "taxis", "cab", "cabs", "public transport", "public transportation"])})(?![${LETTER}])`, "i");

// ── "BIKES AND CARS" IS BOTH, AND THE CAR DECIDES THE REACH ─────────
//
// travelModeKey resolves SLOWEST FIRST, deliberately: "mostly walking, might
// rent bikes one day" must plan at 15 km a day and not 60, because guessing
// fast is the expensive direction. That rule is right for a HEDGE.
//
// It is wrong for a CONJUNCTION. "bikes and cars" says both are available, and
// nobody cycles from Billund to Aarhus because the bikes were mentioned first.
// Before this module existed the slot stayed empty on that answer and an unknown
// mode means no ceiling at all, so reading it as a bicycle would newly break a
// route that used to work — a fix that makes the guide worse is not a fix.
//
// So: a hedge keeps the slow answer, a plain list takes the one that reaches
// furthest. The split is on conjunctions and the pieces go back through
// travelModeKey rather than through a second copy of its vocabulary, because two
// lists of what a bil is are how two parts of an app come to disagree about what
// somebody said.
const HEDGE = /\b(?:mostly|mainly|might|maybe|perhaps|probably|possibly|or|either|prefer|ideally|hoping|thinking of|primært|måske|maaske|vielleicht|eventuell|misschien)\b/i;
const REACH_ORDER = ["walk", "tent", "bike", "public transport", "camper", "car"];

export const widestMode = (text) => {
  const parts = String(text ?? "").split(/\s*(?:,|\/|&|\+|\band\b|\bog\b|\bund\b|\ben\b|\boch\b)\s*/i)
    .map(p => p.trim()).filter(Boolean);
  const modes = [...new Set(parts.map(p => travelModeKey(p)).filter(Boolean))];
  if (!modes.length) return null;
  return modes.reduce((best, m) =>
    REACH_ORDER.indexOf(m) > REACH_ORDER.indexOf(best) ? m : best, modes[0]);
};

export const transportAnswer = (turn) => {
  const t = String(turn ?? "");
  if (isRefusal(t)) return null;
  const said = withoutNonModes(t);
  if (!MODE_WORD.test(said)) return null;
  const mode = HEDGE.test(t) ? travelModeKey(said) : (widestMode(said) || travelModeKey(said));
  // A mode or nothing, exactly as the sentence reader decides it. "we have no
  // car" scrubs to a sentence with no mode in it, and not-a-mode is not an
  // answer to this question.
  return mode ? { value: String(turn).trim(), mode } : null;
};

// ── WHETHER THERE IS A BED BOOKED ───────────────────────────────────
//
// "The lodge billund we got." No booking verb, so the sentence reader sees
// nothing. Asked directly, this is unambiguous.
//
// NOT-BOOKED IS TESTED FIRST, the same order the sentence reader uses and for
// the same reason: "we haven't booked anything" contains "booked".
// ── AND "NEED A HOTEL" IS NOT A BOOKED HOTEL ────────────────────────
//
// Found 5 Sep by an adversarial review, and it is the 18 August BOOKED_RE
// failure arriving through a second vocabulary: this list had the word "hotel"
// as a yes and no way to say "looking for one". "Need a hotel", "Which hotel
// would you recommend?" and "We have not" all came back BOOKED, and because a
// direct answer used to outrank a sentence match it overrode the correct read.
//
// Not-booked is tested first, the same order tripBrief's readStay uses and for
// the same reason: "we haven't booked anything" contains "booked".
const STAY_NO = new RegExp([
  `^(?:${alt(NO_WORDS)})\\b`,
  "\\b(?:not (?:yet|booked|sorted)|no(?:t|thing)? booked|haven'?t booked|have not|still looking|looking for|searching for|need (?:a|an|to|somewhere)|nothing yet|need(?: to)? (?:book|find)|not sorted|to be (?:booked|sorted)|open to suggestions)\\b",
  "\\b(?:ikke booket|ikke endnu|mangler|har ikke|s(?:ø|oe)ger|leder efter|suchen|noch nicht)\\b",
].join("|"), "i");
const STAY_YES = new RegExp([
  `^(?:${alt(YES_WORDS)})\\b`,
  "\\b(?:booked|sorted|reserved|got it|we got|got a|got the|staying (?:at|in)|sleeping at)\\b",
  // A word for the thing itself is an answer to "have you booked somewhere?" —
  // unless the turn is a QUESTION, in which case it is somebody asking for a
  // recommendation and the slot is emphatically not filled.
  "\\b(?:hotel|hostel|lodge|cabin|apartment|airbnb|b&b|campsite|guesthouse|kro|hytte|sommerhus|ferienwohnung|pension)\\b",
  "\\b(?:booket|reserveret|har vi|bor (?:på|pa|i))\\b",
].join("|"), "i");

export const stayAnswer = (turn) => {
  const t = String(turn ?? "");
  if (isRefusal(t)) return null;
  if (STAY_NO.test(t)) return { value: "not booked", said: t.trim() };
  // A question is not an answer. "Which hotel would you recommend?" names a
  // hotel and books nothing.
  if (/\?\s*$/.test(t.trim())) return null;
  if (STAY_YES.test(t)) return { value: "booked", said: t.trim() };
  return null;
};

// ── WHO IS COMING, WITH THE NUMBERS INTACT ──────────────────────────
//
// Oliver, 5 Sep 2026: "I'm alone with 8 kids", recorded as the literal string
// "said in the conversation". His earlier report, 4 Sep: "this review was after a
// chat where I mentioned travelling with 7 kids.. yet it puts me on a bar/club
// for 21+".
//
// The slot has always been a BOOLEAN wearing a value's clothes. PARTY_RE tests
// whether anything about a party was said and the reader returns a sentence
// saying so, so every consumer downstream — the route builder, the place
// filter, the guide writer — receives a string that says a thing was mentioned
// and cannot say what. There is no age gate anywhere in this app, and this is
// why one could not be written: nothing downstream has ever known there were
// children, let alone how many or how old.
//
// So it reads a shape. adults, kids, ages, or a bare total when that is all that
// was said. Every field is null when it was not stated: an unknown number of
// children is not zero children, and a party of "2 adults" with kids: null is a
// different fact from a party of "2 adults" with kids: 0.
const KID_WORD = "kids?|children|child|toddlers?|bab(?:y|ies)|teens?|teenagers?|grandkids?|grandchildren|b(?:ø|o)rn|kinder|barn";
const ADULT_WORD = "adults?|grown[- ]?ups?|voksne|erwachsene|volwassenen|vuxna";
const N = NUMBER_TOKEN;
const numOf = (raw) => {
  const s = lower(raw);
  return /^\d+$/.test(s) ? Number(s) : (SPELLED_NUMBERS[s] ?? null);
};
const firstNum = (re, text) => {
  const m = new RegExp(re, "i").exec(String(text ?? ""));
  return m ? numOf(m[1]) : null;
};
// "alone", "just me", "solo" — one adult, said plainly. Kept apart from the
// counts because it is a word rather than a number and it is how most solo
// travellers answer.
// A word for a child with no number in front of it. Kept apart from KID_WORD,
// which is the counted form, because "our son" and "2 kids" are different facts
// and only one of them has an arithmetic.
const NAMES_A_CHILD = /\b(?:kids?|child|children|toddlers?|bab(?:y|ies)|teens?|teenagers?|son|daughter|grandkids?|grandchildren|b(?:ø|o)rn|barnet|kinder|sohn|tochter)\b|\b(?:1[0-7]|[1-9])\s*(?:year|yr|år|jahre)s?[- ]?old\b/i;
const SOLO = /\b(?:alone|just me|only me|solo|by myself|on my own|alene|kun mig|allein(?:e)?|alleen|ensam|da solo)\b/i;
const COUPLE = /\b(?:me and (?:my|the) (?:wife|husband|partner|girlfriend|boyfriend|missus|other half)|(?:my|the) (?:wife|husband|partner) and (?:me|i)|a couple|just the two of us|us two|os to|zu zweit|z'n twee(?:ë|e)n|vi to)\b/i;

export const partyAnswer = (turn) => {
  const t = String(turn ?? "").trim();
  if (!t || isRefusal(t)) return null;
  const kids = firstNum(`(${N})\\s+(?:${KID_WORD})`, t);
  const adults = firstNum(`(${N})\\s+(?:${ADULT_WORD})`, t);
  // "a group of 12", "we are 4", "4 of us" — a headcount with no split.
  const saidTotal = firstNum(`(?:group|party|team|klasse|class)\\s+of\\s+(${N})`, t)
    ?? firstNum(`(?:we are|we're|there are|vi er|vi är|wir sind|we zijn(?:\\s+met)?)\\s+(${N})`, t)
    ?? firstNum(`(${N})\\s+(?:of us|people|persons?|personer|personen|folk|pax)`, t);
  // Ages, when they were given. "aged 4 and 11", "a 4 year old and an 11 year
  // old", "4 and 11". Only read when children were established, because a bare
  // pair of numbers is a pair of numbers.
  const ages = (kids || NAMES_A_CHILD.test(t))
    ? (t.match(/\b(\d{1,2})\s*(?:year|yr|år|jahre|jahr)s?[- ]?old\b|\b(?:aged?|(?:kids?|children|b(?:ø|o)rn|kinder|they)\s+(?:are|er|sind))\s+(\d{1,2}(?:\s*(?:,|and|og|und)\s*\d{1,2})*)\b/gi) || [])
        .join(" ").match(/\d{1,2}/g)?.map(Number).filter(n => n >= 0 && n <= 19) ?? []
    : [];
  const solo = SOLO.test(t) ? 1 : null;
  const couple = COUPLE.test(t) ? 2 : null;
  const adultCount = adults ?? solo ?? couple ?? null;
  // ── CHILDREN WITH NO NUMBER ARE STILL CHILDREN ────────────────────
  //
  // Found 5 Sep by an adversarial review. "Two adults and our son, he's 7." came
  // back as "2 adults" and the son vanished, on the one slot where the presence
  // of a child changes what may be planned. A count is better than a flag and a
  // flag is very much better than silence.
  const hasKids = kids !== null || NAMES_A_CHILD.test(t);
  // ── AND A HEADCOUNT MAY NOT CONTRADICT THE PARTS ──────────────────
  //
  // Same review: "We are 2 adults and 2 kids" came back with total 2, because
  // "we are 2" matched before the split was read and won. Four people were
  // reported as two, and the line read "2 adults and 2 children, 2 in total".
  // When they disagree the parts are the more specific statement.
  const stated = (adultCount ?? 0) + (kids ?? 0);
  // A total is only computed when BOTH halves are known. "me, my wife and our 3
  // kids" knows the children and not the adults, and adding what is known gives
  // 3 for a party of five — a number worse than no number, because everything
  // downstream would believe it.
  const complete = adultCount !== null && (kids !== null || !hasKids);
  const total = saidTotal !== null && saidTotal >= stated ? saidTotal
    : (complete && stated ? stated : (saidTotal || null));
  // Nothing numeric and no group word means this is not an answer about a party
  // at all. PARTY_RE in tripBrief.js still catches the wordy ones; this returns
  // null and leaves them to it rather than inventing a headcount.
  if (adultCount === null && kids === null && total === null && !hasKids) return null;
  return {
    adults: adultCount,
    kids: kids ?? null,
    hasKids,
    kidAges: ages.length ? [...new Set(ages)].sort((a, b) => a - b) : null,
    total: total || null,
    said: t,
  };
};

// The line a person would write, from the shape. This is what briefBlock prints
// at the model and what the guide builder reads, so it has to be a sentence
// about a party rather than a note that a party was mentioned.
export const partyLine = (p) => {
  if (!p) return "";
  const bits = [];
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  if (p.adults != null) bits.push(plural(p.adults, "adult", "adults"));
  if (p.kids != null) {
    const ages = p.kidAges?.length ? ` (aged ${p.kidAges.join(", ")})` : "";
    bits.push(plural(p.kids, "child", "children") + ages);
  } else if (p.hasKids) {
    // Said without a number. "children" rather than a made-up count, and rather
    // than nothing, which is what it used to say.
    bits.push(p.kidAges?.length ? `children (aged ${p.kidAges.join(", ")})` : "children");
  }
  if (!bits.length && p.total != null) return plural(p.total, "person", "people");
  const head = bits.join(" and ");
  // The total is only worth saying when it is not simply the sum of the parts.
  return p.total != null && p.total !== (p.adults ?? 0) + (p.kids ?? 0)
    ? `${head}, ${p.total} in total`
    : head;
};

// ── THE ONE ENTRY POINT ─────────────────────────────────────────────
//
// `turns` are the traveller's messages, oldest first. `answering[i]` is the list
// of slot keys Gemlyx asked for in the reply immediately before turns[i], which
// is recorded on the assistant message that asked them.
//
// Returns one entry per slot that a direct answer settled, latest answer winning.
// A slot with no entry is simply not spoken for here, and the sentence readers
// keep whatever they found.
export const directAnswers = (turns, answering) => {
  const out = {};
  const list = Array.isArray(turns) ? turns : [];
  const asks = Array.isArray(answering) ? answering : [];
  list.forEach((turn, i) => {
    const keys = Array.isArray(asks[i]) ? asks[i] : [];
    if (!keys.length || !String(turn ?? "").trim()) return;
    // ── ONE QUESTION PER ANSWER ───────────────────────────────────
    //
    // MAX_ASKS_AT_ONCE is 1 today, so in production `keys` always holds one slot
    // and this guard never fires. It is here because that number is a product
    // decision that has already been changed once, and the day it goes back to
    // two a bare "7" after "how many days, and who's coming?" is genuinely
    // ambiguous — guessing which one it meant is how "7 kids" became a seven-day
    // trip. So a bare answer only settles a slot when ONE was asked; with two on
    // the table the slot-specific readers still run, because "2 adults and 2
    // kids" says which question it is answering and "7" does not.
    const only = keys.length === 1 ? keys[0] : null;
    for (const key of keys) {
      if (key === "origin") {
        const v = only === "origin" ? looksLikePlaceAnswer(turn) : null;
        if (v) out.origin = { value: v, source: "said" };
      } else if (key === "days") {
        const v = only === "days" ? daysAnswer(turn) : null;
        if (v) out.days = { value: v, source: "said" };
      } else if (key === "transport") {
        const v = transportAnswer(turn);
        if (v) out.transport = { value: v.value, mode: v.mode, source: "said" };
      } else if (key === "stay") {
        const v = stayAnswer(turn);
        if (v) out.stay = { value: v.value, said: v.said, source: "said" };
      } else if (key === "party") {
        const v = partyAnswer(turn);
        if (v) out.party = { value: partyLine(v), ...v, source: "said" };
      }
    }
  });
  return out;
};

// ── AND WHAT THE ASSISTANT ASKED, PER TURN ──────────────────────────
//
// Walks the thread and returns, for each TRAVELLER turn in order, the slot keys
// the assistant asked for immediately before it. Pure, so the alignment can be
// asserted without a browser, and kept here rather than in App.jsx because an
// off-by-one in this function is the difference between reading "7" as a day
// count and reading it as a headcount.
//
// Error bubbles are skipped on both sides: a reply that failed to send asked
// nothing, and the traveller never saw it.
export const askedBeforeTurns = (messages) => {
  const out = [];
  let pending = [];
  for (const m of Array.isArray(messages) ? messages : []) {
    if (!m || m.isError) continue;
    if (m.role === "assistant") {
      // The LAST assistant message before the turn is the one that asked. A
      // question two replies old was already answered or already dropped.
      pending = Array.isArray(m.asked) ? m.asked : [];
    } else if (m.role === "user") {
      // ── AND THE QUESTION STAYS LIVE UNTIL IT IS REPLIED TO ──────
      //
      // `pending` is NOT cleared here. Two traveller turns in a row means they
      // double-sent while Gemlyx was still thinking, and that is nearly always
      // one answer in two messages: "Billund" then "sorry, Billund airport", or
      // "3" then "actually 4". Clearing would take the first and throw away the
      // correction, which is the same bug this file exists to fix pointing the
      // other way — Gemlyx has not replied, so it has not accepted an answer yet.
      //
      // The cost is real and smaller: a fact volunteered mid-wait ("and we're 3
      // of us") is read against the question that is still open. It takes a
      // double-send AND an unprompted change of subject to reach it, where the
      // correction case takes only a double-send.
      out.push(pending);
    }
  }
  return out;
};

// The question still on screen, which is what the message being typed right now
// is answering. The send path needs it because that message is not in the thread
// yet, so askedBeforeTurns cannot see it.
export const lastAskedOnScreen = (messages) => {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    if (!m || m.isError) continue;
    // ── A TRAVELLER TURN DOES NOT CLOSE THE QUESTION ────────────────
    //
    // This used to return [] on the first user message it walked back past, on
    // the reasoning that a turn since the question means the question has been
    // answered. askedBeforeTurns twelve lines up says the opposite, and an
    // adversarial review found a real thread where the two disagreed: an error
    // bubble between two traveller turns made the send path and the progress bar
    // read different briefs from the same conversation.
    //
    // askedBeforeTurns is the one that is right — Gemlyx has not replied, so it
    // has not accepted an answer — so this follows it. One rule, in two
    // functions, stated once.
    if (m.role === "assistant") return Array.isArray(m.asked) ? m.asked : [];
  }
  return [];
};
