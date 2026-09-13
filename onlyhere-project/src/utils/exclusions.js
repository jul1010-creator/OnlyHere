import { straighten } from "./travellerWords";

// ── A "NO" IS A CONSTRAINT AND NOBODY WAS READING IT ────────────────
//
// Oliver, 26 Aug 2026, looking at the preview screen for his own test brief:
// "Well.. someone is gonna be pissed off when they see this guide."
//
// He had written, in the sentence Gemlyx read perfectly well:
//
//   "Please don't send us to Legoland. He's had enough of it and it's not why
//    we're coming."
//
// The preview offered him **Legoland**, top of ATTRACTIONS, with a picture.
//
// ── AND THE AUDIT FOR THIS ALREADY EXISTED ──────────────────────────
//
// constraintCheck.js, written the same afternoon, has `checkExcluded`: it walks
// every stop in a built guide and reports any that sits in a place the traveller
// ruled out. It is correct and it has never fired, because `constraints.excluded`
// is read from an object that **nothing in this app constructs**. The audit
// audits a field with no writer. `guide._constraints` does not exist either, so
// the swap gate added tonight has been comparing null against null.
//
// This project's signature failure, and I built this instance of it myself: a
// finished, tested, correct check with nothing feeding it. The Layla complaint it
// was written for — "asked for Faro, repeatedly got Lisbon" — is now our own
// screenshot.
//
// ── WHY IT HAS TO BE NARROW ─────────────────────────────────────────
//
// A false exclusion is worse than a missed one. Reading "not why we're coming"
// as ruling out coming, or "no car" as ruling out a town called Carlsberg, drops
// real places off a plan for a reason nobody stated and with no way to see why.
// So this matches the SHAPES people use to rule a place out, and takes the
// proper noun out of them — never a bare "no" anywhere near a capital letter.

// EVERY apostrophe folded to the one the patterns below are written with. See
// straighten in travellerWords.js for what was measured: the curly apostrophe a
// phone types made "I don't want to go to Aarhus" read as nothing at all.
// Here rather than in readExclusions alone, because isExcluded compares an
// extracted name against a database row and both sides have to fold the same
// way or "Harry's Place" stops matching itself.
const clean = (v) => straighten(v).replace(/\s+/g, " ").trim();

// A Danish/English place name as written: capitalised, possibly hyphenated or
// multi-word, possibly carrying æøå. Stops at a lowercase word so "Legoland. He's"
// does not swallow the next sentence.
const NAME = "[A-ZÆØÅ][\\wÆØÅæøå'’-]*(?:\\s+[A-ZÆØÅ][\\wÆØÅæøå'’-]*){0,3}";

// The shapes. Each is a way a person actually says it, and each one puts the
// place in group 1.
// ── THE KEYWORDS ARE CASE-INSENSITIVE, THE NAME IS NOT ──────────────
//
// And they cannot share a flag. Adding `i` to the whole pattern would make
// `[A-ZÆØÅ]` in NAME match lowercase too, and "the real earthworks, not a theme
// park" would become an exclusion of "a theme park". Found immediately: "Avoid
// Tivoli please." and "No Legoland." both read as nothing, because the sentence
// starts with a capital and the keywords were written lowercase.
//
// So the first letter of every keyword is spelled both ways and the capital in
// NAME stays load-bearing.
// ── AND A FILLER WORD IS NEVER A SKIP VERB ─────────────────
//
// The gap between the keyword and the name exists for "don't send US TO Aarhus"
// and "not interested IN Aarhus". It let a second negation through: after the
// intensifier scrub, "I don't really want to skip Aarhus" reads as "don't want
// to skip Aarhus", the gap swallows "to skip", and the sentence asking to KEEP
// Aarhus ruled it out. Measured by a Fable review on 12 Sep.
//
// Lowercase as well, so a capitalised word cannot be eaten as filler: the gap
// used to take \w+, which turned "We don't want Copenhagen Zoo" into a rule
// against every zoo in the country and "not interested in Legoland Billund"
// into a rule against the airport town.
const FILLER = `(?:(?!(?:skip|avoid|miss|leave|remove|drop)[^a-zæøå])[a-zæøå]+\\s+)`;

const either = (word) => `[${word[0].toUpperCase()}${word[0].toLowerCase()}]${word.slice(1)}`;
const anyOf = (words) => words.map(either).join("|");

const PATTERNS = [
  // "don't send us to X", "please don't take us to X"
  new RegExp(`\\b(?:${anyOf(["don't", "dont", "do not"])}|${anyOf(["no need to", "rather not", "would rather not", "please no"])})\\s+${FILLER}{0,3}(?:to|into|near)\\s+(${NAME})`, "g"),
  // "we don't want X", "we're not interested in X"
  new RegExp(`\\b(?:${anyOf(["don't want", "dont want", "do not want", "don't include", "dont include", "do not include", "no interest in", "not interested in", "not keen on", "had enough of", "sick of", "tired of"])})\\s+${FILLER}{0,2}(${NAME})`, "g"),
  // "skip X", "avoid X", "leave out X", "nothing in X"
  // ── AND THE WORDS PEOPLE USE AT A MAP ───────────────────────────
  // "remove Aarhus", "take out Ribe". Nobody said these to a chat before there
  // was a map beside it; now the map is the thing they are editing, and the verb
  // they reach for is the one they would use on a list.
  new RegExp(`\\b(?:${anyOf(["skip", "avoid", "leave out", "leave off", "steer clear of", "stay away from", "keep away from", "remove", "take out"])})\\s+(?:[Tt]he\\s+)?(${NAME})`, "g"),
  // "no X" only where X is a named place AND the sentence is about the trip.
  // Deliberately requires "please"/"and"/"but" or a sentence start, so "no car"
  // and "no budget" cannot reach it — those name no place.
  new RegExp(`(?:^|[.;!?]\\s+|\\b[Bb]ut\\s+|\\b[Aa]nd\\s+)(?:[Pp]lease\\s+)?[Nn]o\\s+(${NAME})\\b(?!\\s+(?:car|budget|rush|hurry|problem|worries|idea))`, "g"),

  // Danish: "ikke til X", "undgå X", "vi vil ikke til X"
  new RegExp(`\\b(?:[Ii]kke\\s+(?:til|i|ind\\s+til)|[Uu]ndg[åa])\\s+${FILLER}{0,2}(${NAME})`, "g"),
  // ── AND "SPRING" NEEDS ITS "OVER" ───────────────────────
  // The Danish for skip is "spring over", and this matched the bare verb, which
  // is also an English season and an English noun. Measured by a Fable review on
  // 12 Sep: "We are coming in spring to Copenhagen" ruled out Copenhagen, and
  // "Spring break in Copenhagen with the kids" did the same. The particle is not
  // optional in Danish and it is what separates the two languages here.
  new RegExp(`\\b[Ss]pring\\s+over\\s+${FILLER}{0,2}(${NAME})`, "g"),
  new RegExp(`\\b[Ss]pring\\s+${FILLER}{0,2}(${NAME})\\s+over\\b`, "g"),
];

// ── AND THE PLAINEST SENTENCE THERE IS ──────────────────────────────
//
// Oliver, 12 Sep 2026: the map "fails to delete markers when you say things
// like 'I'm not going to Aarhus'."
//
// Six patterns above, and none of them could see it. The first wants a "don't",
// the second a "don't want", the third a skip verb, the fourth a bare "no" at a
// sentence start, the fifth a capital directly after "not" — "not going" is
// lowercase — and the sixth is Danish. previewMatch's REJECT_BEFORE missed it
// too, for its own reason: it requires the refusal to sit hard against the name
// and "going" is in the way.
//
// So the single most ordinary way in English to say you are not going somewhere
// was invisible to both readers of "did they rule this out", and the pin it
// names was not merely kept — it was ADDED, by the very sentence refusing it,
// because the map pins from the traveller's turns as well as Gemlyx's.
//
// ── ITS OWN LOOP, BECAUSE IT NEEDS ITS OWN GUARD ────────────────────
//
// "I'm not going to Copenhagen first" is not a refusal, it is an order of
// events, and the six above have never had to care because none of them can
// reach that sentence. Reading it as an exclusion would drop the city the
// traveller is flying into, which is the expensive half of "a false exclusion
// is worse than a missed one".
//
// The guard is on the TAIL rather than inside the pattern on purpose: a
// lookahead there lets NAME backtrack to a shorter name to satisfy it, so
// "not going to Copenhagen Airport first" would quietly exclude "Copenhagen"
// instead of nothing. Checked after the match, against the whole run, it cannot.
//
// "this time" and "this trip" are deliberately NOT on that list. "Not going to
// Ribe this trip" IS this trip's exclusion, and this trip is the only one being
// planned. Nor is "after all", which is the refusal rather than a condition on
// it.
// ── AND A MODE OF TRANSPORT IS NOT A REFUSAL ────────────────────────
// Found by an adversarial review before this shipped. "We're not flying into
// Billund, we're driving" ruled out Billund — the airport they are landing at —
// because `flying` was on the verb list. `driving`, `flying` and `sailing` say
// HOW, and how is a thing you can change about a place you are still going to.
// Only the verbs that mean going at all.
const NOT_GOING = new RegExp(
  `\\b[Nn]ot\\s+(?:${anyOf(["going", "heading", "coming", "travelling", "traveling", "stopping", "visiting"])})` +
  `\\s+(?:back\\s+)?(?:up\\s+|down\\s+|out\\s+|over\\s+|across\\s+)?(?:to|into|in|near)\\s+(${NAME})`, "g");
// An ordering word ("first") or a condition ("until spring") after the name says
// WHEN, not whether. A short run before it rather than a hard anchor, because
// the name can carry a word the gazetteer does not: "not going to Copenhagen
// Airport first". Bounded, and it cannot cross a full stop.
// ── IN SIX LANGUAGES, NOT ONE ──────────────────────────
//
// English only until 12 Sep, when a Fable review ran the Danish equivalents of
// the sentences this guard exists for. "Vi skal ikke til Aarhus først, vi starter
// i Aalborg" and "Vi kommer ikke til Aarhus før om aftenen" both ruled Aarhus
// out of a trip that goes there, while their English twins were correctly kept.
// A guard that works in one language and not the others is worse than none,
// because it makes the English tests look like proof.
export const ORDERING_AFTER = /^[^.!?]{0,24}?\b(?:first|firstly|straight|straightaway|right away|yet|initially|to begin with|at first|until|till|unless|before|after(?!\s+all)|først|forst|før(?!st)|endnu|indtil|inden|medmindre|först|tills|innan|zuerst|erst|bis|bevor|außer|ausser|eerst|tot|voordat|tenzij)\b/i;

// ── AND THE TWO THAT PUT THE NAME FIRST ─────────────────────────────
// "Take Aarhus off", "Aarhus is out". Both are somebody editing a list they can
// see, which is what the map made possible. Every pattern above puts the verb
// first, so neither could be reached by widening one of them.
// "out of" is excluded because "Aarhus is out of the way" is a reason, not a
// refusal, and the difference is two characters.
// ── AND THESE TWO MUST KNOW IT IS A PLACE ──────────────────────────
//
// Found by an adversarial review before this shipped. "Take Mum out for dinner
// in Copenhagen" ruled out Mum, and every sentence of that shape would have
// ruled out a person. The verb-first patterns above can afford not to care,
// because "skip Mum" is not a sentence anybody writes; these two are ordinary
// English about ordinary people.
//
// So they are the only patterns in this file that consult the GAZETTEER, and
// with no gazetteer they do nothing at all. The map and the preview both have
// one for free, and a silent no is the right answer where there is nothing to
// check against.
//
// The conjunction is consumed rather than left for NAME, which is greedy and
// capitalised: "And Skagen is out" was reading as an exclusion of "And Skagen",
// and the note under it said "Leaving out And Skagen, as you asked."
const NAME_FIRST = [
  new RegExp(`\\b(?:[Tt]ake|[Tt]aking|[Ll]eave|[Ll]eaving|[Cc]ross|[Kk]nock)\\s+(${NAME})\\s+(?:off|out)\\b(?!\\s+(?:for|to|with))`, "g"),
  // ── AND "NOT X", WHICH MOVED IN HERE ─────────────────────
  //
  // "the real earthworks, not Legoland" is the sentence it was written for, and
  // it is the loosest shape in the file: two words, one of them capitalised.
  // A Fable review measured what else it caught on 12 Sep, each of which printed
  // "Leaving out X, as you asked" at the traveller and removed rows:
  //
  //   "Not Sure yet, maybe Aarhus"   -> ruled out Sure
  //   "Not Yet"                      -> ruled out Yet
  //   "not Peter, he stays home"     -> ruled out Peter, and with him every
  //                                     Peter Beier Chokolade in the country
  //
  // NOT_A_PLACE cannot answer this, because the thing it would have to list is
  // every capitalised word that is not a town, which is most of them. So the
  // sentence has to name a place the app has heard of before it can take one
  // away. The map and the preview both hand one over for free.
  new RegExp(`\\b[Nn]ot\\s+(${NAME})\\b`, "g"),
  new RegExp(`(?:^|[.;!?]\\s+|,\\s+)(?:[Bb]ut\\s+|[Aa]nd\\s+|[Ss]o\\s+|[Tt]hen\\s+)*(${NAME})\\s+(?:is|are)\\s+out\\b(?!\\s+of)`, "g"),
];

// Words that are capitalised in ordinary prose and are never a place somebody
// ruled out. Without this "not Danish" and "not English" become exclusions, and a
// brief saying "one of us reads Danish" would rule out Denmark.
const NOT_A_PLACE = new Set([
  "danish", "english", "german", "dutch", "swedish", "norwegian", "french", "italian", "spanish",
  "i", "we", "he", "she", "they", "it", "you", "my", "our", "his", "her", "their",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "denmark", "danmark",   // ruling out the country is never what they meant
  "gemlyx", "google", "airbnb", "booking",
  "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag",
]);

// A trailing word that got swept in by the capitalised run: "Legoland He" from
// "Legoland. He's had enough". Trimmed rather than the name dropped.
const trimTail = (name) => {
  const parts = clean(name).split(/\s+/);
  while (parts.length > 1 && NOT_A_PLACE.has(parts[parts.length - 1].toLowerCase())) parts.pop();
  return parts.join(" ");
};


// ── AND A REFUSAL CAN POINT BACK AT THE NAME ────────────────────────
//
// Oliver, 9 Sep 2026, looking at his own Detour map with Copenhagen pinned on a
// brief that had ruled it out: "Copenhagn shouldn't be on the map at all in this
// case." He had written, and Gemlyx's own reply had understood perfectly:
//
//   "I've been to Copenhagen already, so I don't want to go there."
//
// Every pattern above wants the name to FOLLOW the refusal within a word or
// two: "don't want Copenhagen", "skip Legoland". Here the name comes first and
// the refusal points back at it with a pronoun, which is one of the most
// ordinary ways a person rules a place out, and it read as nothing at all.
//
// Not only on the map. readExclusions feeds `_constraints.excluded` on the
// build, so the guide could have planned the one city he said he was done with,
// which is the Legoland screenshot again in a different sentence shape.
//
// ── AND IT RESOLVES ONLY WHERE THERE IS NOTHING TO GUESS ────────────
//
// "A false exclusion is worse than a missed one" is the rule this file opens
// with, and a pronoun is exactly where it gets tested, because a pronoun
// pointing at a list points at nothing in particular. So four narrow guards,
// each of which came from a sentence that broke an earlier version:
//
//   ONE CANDIDATE ONLY. "We stayed at Ruths Hotel in Skagen and don't want to go
//   back there" holds two names and "there" is the hotel. Two candidates in
//   scope is ambiguous, and ambiguous yields nothing rather than the nearer one.
//
//   A VERB OF TRAVELLING. "The cafe at ARoS in Aarhus was awful, we don't want
//   to eat there again" is one candidate and a refusal, and it rules out
//   nothing. Going is ruled out; eating, staying, driving and parking are not.
//
//   NOTHING SMALLER IN BETWEEN. "There is a fish restaurant on the harbour in
//   Aalborg where we got food poisoning, and we don't want to go back there"
//   passes both of the above and means the restaurant. A venue word between the
//   name and the refusal is a closer antecedent than the town.
//
//   NO QUALIFIER AFTER IT. "We don't want to go there in winter", "on the
//   Monday", "without booking first". A refusal with a condition on it is a
//   preference about WHEN or HOW, and the place is still wanted.
//
// What it still cannot tell: who is refusing. "He's had enough of it" rules a
// place out and "my mother-in-law never wants to go back there, but she isn't
// coming" does not, and nothing in the sentence separates them. The patterns
// above already carry that exposure, so this adds no new one, and a wrong
// exclusion there is at least one somebody can see in the note.

// A capitalised word that only got its capital from starting a sentence. The
// list above is English; a Danish sentence opens with Jeg, Vi, Der, Hun, Det
// just as often, and every one of them clears the three-letter minimum.
const NOT_A_PLACE_DA = new Set([
  // Danish, where a sentence opens with a pronoun as often as not
  "jeg", "vi", "du", "han", "hun", "de", "den", "det", "der", "dette", "disse",
  "min", "mit", "mine", "vores", "hans", "hendes", "deres", "sidste", "første",
  "men", "og", "så", "hvis", "når", "jo", "ærligt", "faktisk", "desværre",
  "vil", "skal", "gider", "har", "havde", "var", "kan", "kunne", "nu", "her",
  "nej", "ja", "tak", "ok", "okay", "hvad", "hvor", "hvorfor", "alt", "intet",
  // English openers the list above does not carry. Every one of these has stood
  // at the front of a sentence in the corpus this was built against.
  "been", "we", "us", "our", "ours", "that", "this", "these", "those", "there",
  "here", "last", "first", "next", "but", "and", "so", "if", "when", "then",
  "honestly", "obviously", "please", "sorry", "well", "also", "anyway", "though",
  "no", "yes", "ok", "okay", "maybe", "actually", "really", "both", "either",
  "everything", "nothing", "something", "anything", "what", "where", "why",
  "the", "and", "a", "an", "it", "its", "one", "two", "both",
]);

// "I've" and "Peter's" are one token to NAME and neither is in a stoplist
// spelled without the contraction, which is how "I've been to Copenhagen"
// arrived carrying two candidates and resolved to neither.
const stem = (name) => clean(name).toLowerCase().split(/['’]/)[0];

// A word that names something INSIDE a town rather than the town. Between the
// name and the refusal, it is the closer antecedent; on the end of the name, it
// says the name is a venue, and isExcluded matches both ways, so letting
// "Roskilde Festival" through would take the whole of Roskilde with it.
const VENUE_WORD = new RegExp(
  "\\b(?:restaurant|restauranten|cafe|café|caféen|bar|baren|pub|hotel|hotellet|hostel|kro|kroen|"
  + "museum|museet|galleri|gallery|park|parken|zoo|slot|slottet|kirke|kirken|butik|shop|"
  + "festival|festivalen|marked|market|rollercoaster|rutsjebane|lejlighed|flat|apartment|"
  + "place|plads|beach|strand|havn|havnen|harbour|harbor)\\b", "i");

// Going, and only going. Eating, staying, driving, parking and spending the day
// are all things you can refuse in a place you still want to visit.
const TRAVEL_VERB = "go|going|goes|went|return|returning|head|heading|travel|travelling|traveling|hen|derhen|dertil|tilbage|derop|derned";

// The shapes that refuse without naming. Each says "not that place" and none of
// them says which, so every one of them needs the scope search below.
const ANAPHORS = [
  // "I don't want to go there", "we won't go back", "not going there again"
  new RegExp(`\\b(?:${anyOf(["don't", "dont", "do not", "won't", "wont", "will not", "never want", "never wants", "not"])})\\s+${FILLER}{0,2}(?:${TRAVEL_VERB})\\s+(?:back\\s+)?(?:there|again)\\b`, "g"),
  // "we don't want to go back.", "not going back."
  new RegExp(`\\b(?:${anyOf(["don't", "dont", "do not", "won't", "wont", "will not"])})\\s+${FILLER}{0,2}(?:go|going|head|heading|travel)\\s+back\\b`, "g"),
  // "been there, done that", "we'd rather give it a miss", "please leave it out"
  new RegExp(`\\b${either("been")}\\s+there,?\\s+(?:${anyOf(["done that", "we'd rather", "so"])})`, "g"),
  new RegExp(`\\b(?:${anyOf(["give it a miss", "gave it a miss", "leave it out", "leave that out", "had enough of it", "had enough of that", "sick of it", "tired of it", "not that one", "skip it", "skip that"])})`, "g"),
  // Danish: "der gider vi ikke hen igen", "vil ikke derhen", "vil aldrig derhen igen"
  new RegExp(`\\b(?:${anyOf(["vil ikke", "vil aldrig", "skal ikke", "gider ikke", "gider vi ikke", "vil vi ikke", "skal vi ikke"])})\\s+${FILLER}{0,2}(?:derhen|dertil|tilbage|derop|derned|hen)\\b`, "g"),
  new RegExp(`\\b[Dd]er(?:hen|ned|op|over)?\\s+(?:${anyOf(["gider vi ikke", "vil vi ikke", "skal vi ikke", "har vi ikke"])})\\s+${FILLER}{0,2}(?:hen|tilbage|igen)?`, "g"),
  // "vi vil helst ikke derhen igen", "vi skal ikke derover igen"
  new RegExp(`\\b(?:${anyOf(["vil helst ikke", "skal ikke", "gider ikke", "behøver ikke", "behøver vi ikke"])})\\s+${FILLER}{0,2}(?:derhen|dertil|derover|derned|derop|tilbage|igen)\\b`, "g"),
  // "det dropper vi", "den springer vi over", "den by springer vi over"
  new RegExp(`\\b(?:[Dd]et|[Dd]en)(?:\\s+\\w+){0,2}\\s+(?:${anyOf(["dropper vi", "springer vi over", "står vi over", "skipper vi"])})`, "g"),
  new RegExp(`\\b(?:${anyOf(["kan vi godt springe over", "kan vi springe over", "vil vi gerne undgå", "vil vi undgå", "gider vi ikke"])})`, "g"),
  // "we have no wish to go back there", "we're not interested in it"
  new RegExp(`\\b(?:${anyOf(["no wish to", "no desire to", "no interest in", "not interested in", "no plans to"])})\\s+${FILLER}{0,3}(?:${TRAVEL_VERB}|it|there)\\b`, "g"),
  // "keep us well away from that place", "that one can come off the list"
  new RegExp(`\\b(?:${anyOf(["away from that", "away from it", "off the list", "come off the list", "give that a miss", "give that one a miss"])})`, "g"),
];

// A refusal with a condition on it is a preference about when or how, not a
// place ruled out. "at" stays off the list so "not there at all" still counts.
const QUALIFIED = /^\s*(?:in|on|during|before|after|without|until|unless|because|since|when|if|med|uden|hvis|når)\b/i;

// A negative in front of the idioms turns them inside out: "obviously we don't
// want to skip it" is the opposite of "skip it".
const NEGATED_BEFORE = /(?:don't|dont|do not|can't|cant|cannot|won't|wont|never|not)\s+(?:\w+\s+){0,2}$/i;

const SENTENCE_SPLIT = /(?<=[.!?;])\s+/;

// Every capitalised run that could be a place, INCLUDING the venue-named ones.
// Dropping "Ruths Hotel" here rather than counting it is what let "Ruths Hotel
// in Skagen" resolve to Skagen: removing the competing name made an ambiguous
// sentence look like a clear one. The venue itself is refused by the
// whole-sentence check in antecedent, which fires on the same word.
const candidatesIn = (chunk) => {
  const re = new RegExp(NAME, "g");
  const out = [];
  let m;
  while ((m = re.exec(chunk)) !== null) {
    const name = trimTail(m[0]);
    if (!name || name.length < 3) continue;
    const low = name.toLowerCase();
    if (NOT_A_PLACE.has(low) || NOT_A_PLACE_DA.has(low)) continue;
    if (NOT_A_PLACE.has(stem(name)) || NOT_A_PLACE_DA.has(stem(name))) continue;
    out.push({ name, at: m.index + m[0].length });
  }
  return out;
};

// ── THE NAME A PRONOUN POINTS BACK AT ───────────────────────────────
//
// Walks back a sentence at a time until it reaches one that names something,
// because the refusal is often two sentences after the name: "Aarhus was our
// base last time. It rained all week. We don't want to go there again."
// Three back, and it stops at the FIRST sentence carrying a name rather than
// gathering them, so a name further away can never outvote a nearer one.
//
// `known` is the list of places Gemlyx publishes, when the caller has it. It is
// what separates "We went to Ribe with Anna and Peter" from a genuinely
// ambiguous sentence: three capitalised words, one of which is a town, and no
// amount of grammar can tell you that and a gazetteer can.
const LOOK_BACK = 3;
const antecedent = (text, hitAt, known) => {
  const parts = text.slice(0, hitAt).split(SENTENCE_SPLIT);
  let found = [], scope = "";
  for (let back = 0; back < LOOK_BACK && back < parts.length; back++) {
    scope = parts[parts.length - 1 - back] || "";
    found = candidatesIn(scope);
    if (found.length) break;
  }
  if (!found.length) return "";
  // A venue anywhere in the sentence is a closer antecedent than the town it is
  // in. "There is a fish restaurant on the harbour in Aalborg where we got food
  // poisoning, and we don't want to go back there" is about the restaurant, and
  // the only thing saying so is the word restaurant.
  if (VENUE_WORD.test(scope)) return "";
  if (found.length > 1 && known && known.size) {
    const real = found.filter(c => known.has(c.name.toLowerCase()));
    if (real.length === 1) return real[0].name;
    return "";
  }
  if (found.length !== 1) return "";
  return found[0].name;
};

// ── AND SOMEBODY WHO IS NOT COMING RULES NOTHING OUT ────────────────
// "My mother-in-law hated Skagen and never wants to go back there, but she
// isn't coming with us." The refusal is real, the refuser is not on the trip,
// and the sentence says so in as many words.
const NOT_COMING = /\b(?:is\s?n[o']t|are\s?n[o']t|wo\s?n[o']t\s+be|not)\s+(?:coming|joining|with\s+us|travelling|traveling)\b|\bskal\s+ikke\s+med\b|\bkommer\s+ikke\s+med\b/i;

// ── WHAT THEY RULED OUT, IN THEIR OWN WORDS ─────────────────────────
//
// Reads the TRAVELLER's turns only. A place Gemlyx mentioned and they did not
// object to is not an exclusion, and reading the whole transcript is how the
// arrival anchor once resolved to Copenhagen Airport on an Aalborg brief.
// ── AND AN ADVERB IS NOT ONE OF THE WORDS ───────────────────────────
//
// Oliver, 12 Sep 2026 at 18:22: "I don't rally want to go to Aarhus actually..
// I want to go to Aalborg". Aarhus stayed in the guide, and so did the pin.
//
// The typo is not the reason. "I don't really want to go to Aarhus", spelled
// correctly, missed too: the first pattern allows three words between the
// "don't" and the "to", and "really want to go" is four. An intensifier is the
// commonest word there is in a sentence like this and it was spending the whole
// budget.
//
// Removed rather than counted, and only where it sits directly after a
// negation, so it cannot change any sentence that is not already a refusal.
// ── AND "JUST" AND "EVEN" ARE NOT INTENSIFIERS, THEY ARE THE OPPOSITE ─
//
// They were on this list for one night. A Fable review measured what that did:
// "Not just Copenhagen, we want to see Jutland too" had its "just" scrubbed,
// became "Not Copenhagen", and ruled out the city the sentence was asking for
// MORE of. Same for "It's not just Legoland we're after, the kids want Tivoli
// too", and for "I don't really want to skip Aarhus", where the scrub turned a
// double negative into a single one.
//
// "Not really X" means less of X. "Not just X" means X and more. The first
// belongs here and the second reverses the sentence, which is the one thing
// this file may never do: a false exclusion is worse than a missed one.
const INTENSIFIER_AFTER_NO = /\b(don't|dont|do not|not|won't|wont|can't|cant|never|no)\s+(?:really|rally|actually|particularly|especially|honestly|truly|quite|much|super|overly)\s+/gi;

// The verbs that say "leave it out" without saying "not", which is what makes a
// negation in front of them invisible to the pattern itself.
const SKIP_VERB_FIRST = /^(?:skip|avoid|leave\s+out|leave\s+off|steer\s+clear\s+of|stay\s+away\s+from|keep\s+away\s+from|remove|take\s+out|undg[åa]|spring)\b/i;

export const readExclusions = (travellerText, { known = [] } = {}) => {
  const t = clean(travellerText).replace(INTENSIFIER_AFTER_NO, "$1 ");
  if (!t) return [];
  const out = [];
  const gazetteer = new Set((Array.isArray(known) ? known : []).map(x => clean(x).toLowerCase()).filter(Boolean));
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t)) !== null) {
      // ── AND "DON'T SKIP TIVOLI" IS NOT SKIPPING TIVOLI ────────
      //
      // The skip verbs carry no negation of their own, so anything in front of
      // them was invisible. Measured by a Fable review on 12 Sep: "Don't skip
      // Tivoli, it's great", "Please don't leave out Tivoli", "Don't remove
      // Aarhus, I still want it" and "Never skip Ribe" all ruled the place out
      // and told the traveller so. Every one of those sentences is somebody
      // asking for the place.
      //
      // The same guard the anaphors have used since they were written, pointed
      // at the other family of patterns.
      if (SKIP_VERB_FIRST.test(m[0])
          && NEGATED_BEFORE.test(t.slice(Math.max(0, m.index - 40), m.index))) continue;
      // ── AND THE ORDERING GUARD BELONGS TO EVERY PATTERN ───────
      //
      // It was written for NOT_GOING and applied only there, so "We are not
      // going to Aarhus first, we start in Aalborg" was correctly kept while
      // its Danish twin "Vi skal ikke til Aarhus først" ruled Aarhus out. Same
      // sentence, same trip, two answers, decided by which pattern happened to
      // match. A guard that holds in one language is not a guard.
      if (ORDERING_AFTER.test(t.slice(m.index + m[0].length))) continue;
      const name = trimTail(m[1]);
      if (!name) continue;
      const low = name.toLowerCase();
      if (NOT_A_PLACE.has(low)) continue;
      // One word and two letters is not a place name, it is an initial.
      if (name.length < 3) continue;
      if (!out.some(x => x.toLowerCase() === low)) out.push(name);
    }
  }
  // "I'm not going to Aarhus". Separate because of the tail guard above.
  NOT_GOING.lastIndex = 0;
  let g;
  while ((g = NOT_GOING.exec(t)) !== null) {
    if (ORDERING_AFTER.test(t.slice(g.index + g[0].length))) continue;
    const name = trimTail(g[1]);
    if (!name || name.length < 3) continue;
    const low = name.toLowerCase();
    if (NOT_A_PLACE.has(low)) continue;
    if (!out.some(x => x.toLowerCase() === low)) out.push(name);
  }
  // "Take Aarhus off", "Aarhus is out". Gazetteer-gated, so a person is never
  // mistaken for a town.
  if (gazetteer.size) {
    for (const re of NAME_FIRST) {
      re.lastIndex = 0;
      let n;
      while ((n = re.exec(t)) !== null) {
        const name = trimTail(n[1]);
        if (!name || name.length < 3) continue;
        const low = name.toLowerCase();
        if (NOT_A_PLACE.has(low) || !gazetteer.has(low)) continue;
        if (!out.some(x => x.toLowerCase() === low)) out.push(name);
      }
    }
  }
  for (const re of ANAPHORS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t)) !== null) {
      if (NEGATED_BEFORE.test(t.slice(Math.max(0, m.index - 40), m.index))) continue;
      const after = t.slice(m.index + m[0].length);
      if (/^\s*(?:to|into|near|til|i)\s/i.test(after)) continue;
      if (QUALIFIED.test(after)) continue;
      if (NOT_COMING.test(t)) continue;
      const name = antecedent(t, m.index, gazetteer);
      if (!name) continue;
      const low = name.toLowerCase();
      if (NOT_A_PLACE.has(low) || NOT_A_PLACE_DA.has(low)) continue;
      if (!out.some(x => x.toLowerCase() === low)) out.push(name);
    }
  }
  return out;
};

// ── AND THE FILTER, WHICH IS THE POINT ──────────────────────────────
//
// Applied to anything offered to the traveller: the preview pools, the matched
// places, the swap candidates. A row is out if its name or its town matches
// something ruled out, in either direction — "Legoland" rules out "Legoland
// Billund Resort", and "Billund" rules out everything in Billund.
export const isExcluded = (row, excluded) => {
  const list = (Array.isArray(excluded) ? excluded : []).map(x => clean(x).toLowerCase()).filter(Boolean);
  if (!list.length) return false;
  const fields = [row?.name, row?.town, row?.city, row?.location, row?.region]
    .map(x => clean(x).toLowerCase()).filter(Boolean);
  // ── ONE DIRECTION, NOT TWO ─────────────────────────
  //
  // `x.includes(f)` was the third test and it runs the rule backwards: a row
  // whose name is a SUBSTRING of the thing ruled out. Measured by a Fable review
  // on 12 Sep. Rule out "Copenhagen Zoo" and every row whose town is Copenhagen
  // goes with it, Tivoli included, because "copenhagen zoo".includes(
  // "copenhagen"). Rule out "Aarhus Domkirke" and the city of Aarhus disappears.
  //
  // The two cases this function is documented to cover both run the other way:
  // "Legoland" rules out "Legoland Billund Resort" through f.includes(x), and
  // "Billund" rules out everything whose town is Billund through f === x.
  // Nothing needed the third test, and what it did was delete a city because
  // somebody skipped one attraction in it.
  return fields.some(f => list.some(x => f === x || f.includes(x)));
};

export const withoutExcluded = (rows, excluded) =>
  (Array.isArray(rows) ? rows : []).filter(r => !isExcluded(r, excluded));

// ── AND A REFUSAL MADE WITH A TAP JOINS THE ONES MADE IN WORDS ──────
//
// Oliver, 13 Sep 2026, on the zoomed-in chat map: "a short description of the
// places (like at the final guide), and then a 'Is this interesting?' Yes/No."
//
// A No there is a refusal with no sentence behind it. readExclusions reads the
// traveller's WORDS and that is the right rule: writing "skip Legoland" into the
// conversation on their behalf would put words in their mouth, and the brief is
// never read from anything but what they typed. So the tap lives in its own
// list (App.jsx holds it beside pickedExtras, the list of Yeses) and is merged
// with the typed refusals HERE, once, so the preview pools, the guide's
// constraints and the note under the preview title all read one answer to
// "what did they rule out".
//
// Names only. A tap holds the row's own name, which is what isExcluded folds a
// row against, so a No on "Legoland" takes "Legoland Billund Resort" with it
// exactly as the sentence would have. Deduplicated case-blind, and the typed
// ones first because they are the ones with a sentence a person can point at.
export const ruledOutFor = (ownWords, tapped = [], { known = [] } = {}) => {
  const out = readExclusions(ownWords, { known });
  for (const raw of (Array.isArray(tapped) ? tapped : [])) {
    // A tap holds a string. Anything else in the list is a bug upstream, and
    // coercing it would turn a stray number into a place ruled out.
    if (typeof raw !== "string") continue;
    const name = clean(raw);
    if (!name) continue;
    if (out.some(x => x.toLowerCase() === name.toLowerCase())) continue;
    out.push(name);
  }
  return out;
};

// ── AND SAY IT OUT LOUD ─────────────────────────────────────────────
//
// A place silently dropped is indistinguishable from a place we do not have, and
// the traveller has no way to tell that their "no" was heard. Layla's whole
// problem is a constraint that vanishes without a word.
export const excludedNote = (excluded) => {
  const list = (Array.isArray(excluded) ? excluded : []).map(clean).filter(Boolean);
  if (!list.length) return "";
  const names = list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
  return `Leaving out ${names}, as you asked.`;
};
