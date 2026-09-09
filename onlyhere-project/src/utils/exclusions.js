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

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

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
const either = (word) => `[${word[0].toUpperCase()}${word[0].toLowerCase()}]${word.slice(1)}`;
const anyOf = (words) => words.map(either).join("|");

const PATTERNS = [
  // "don't send us to X", "please don't take us to X"
  new RegExp(`\\b(?:${anyOf(["don't", "dont", "do not"])}|${anyOf(["no need to", "rather not", "would rather not", "please no"])})\\s+(?:\\w+\\s+){0,3}(?:to|into|near)\\s+(${NAME})`, "g"),
  // "we don't want X", "we're not interested in X"
  new RegExp(`\\b(?:${anyOf(["don't want", "dont want", "do not want", "no interest in", "not interested in", "not keen on", "had enough of", "sick of", "tired of"])})\\s+(?:\\w+\\s+){0,2}(${NAME})`, "g"),
  // "skip X", "avoid X", "leave out X", "nothing in X"
  new RegExp(`\\b(?:${anyOf(["skip", "avoid", "leave out", "leave off", "steer clear of", "stay away from", "keep away from"])})\\s+(?:[Tt]he\\s+)?(${NAME})`, "g"),
  // "no X" only where X is a named place AND the sentence is about the trip.
  // Deliberately requires "please"/"and"/"but" or a sentence start, so "no car"
  // and "no budget" cannot reach it — those name no place.
  new RegExp(`(?:^|[.;!?]\\s+|\\b[Bb]ut\\s+|\\b[Aa]nd\\s+)(?:[Pp]lease\\s+)?[Nn]o\\s+(${NAME})\\b(?!\\s+(?:car|budget|rush|hurry|problem|worries|idea))`, "g"),
  // "not X", where X is capitalised: "the real earthworks, not Legoland"
  new RegExp(`\\b[Nn]ot\\s+(${NAME})\\b`, "g"),
  // Danish: "ikke til X", "undgå X", "spring X over", "vi vil ikke til X"
  new RegExp(`\\b(?:[Ii]kke\\s+(?:til|i|ind\\s+til)|[Uu]ndg[åa]|[Ss]pring)\\s+(?:\\w+\\s+){0,2}(${NAME})`, "g"),
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
  new RegExp(`\\b(?:${anyOf(["don't", "dont", "do not", "won't", "wont", "will not", "never want", "never wants", "not"])})\\s+(?:\\w+\\s+){0,2}(?:${TRAVEL_VERB})\\s+(?:back\\s+)?(?:there|again)\\b`, "g"),
  // "we don't want to go back.", "not going back."
  new RegExp(`\\b(?:${anyOf(["don't", "dont", "do not", "won't", "wont", "will not"])})\\s+(?:\\w+\\s+){0,2}(?:go|going|head|heading|travel)\\s+back\\b`, "g"),
  // "been there, done that", "we'd rather give it a miss", "please leave it out"
  new RegExp(`\\b${either("been")}\\s+there,?\\s+(?:${anyOf(["done that", "we'd rather", "so"])})`, "g"),
  new RegExp(`\\b(?:${anyOf(["give it a miss", "gave it a miss", "leave it out", "leave that out", "had enough of it", "had enough of that", "sick of it", "tired of it", "not that one", "skip it", "skip that"])})`, "g"),
  // Danish: "der gider vi ikke hen igen", "vil ikke derhen", "vil aldrig derhen igen"
  new RegExp(`\\b(?:${anyOf(["vil ikke", "vil aldrig", "skal ikke", "gider ikke", "gider vi ikke", "vil vi ikke", "skal vi ikke"])})\\s+(?:\\w+\\s+){0,2}(?:derhen|dertil|tilbage|derop|derned|hen)\\b`, "g"),
  new RegExp(`\\b[Dd]er(?:hen|ned|op|over)?\\s+(?:${anyOf(["gider vi ikke", "vil vi ikke", "skal vi ikke", "har vi ikke"])})\\s+(?:\\w+\\s+){0,2}(?:hen|tilbage|igen)?`, "g"),
  // "vi vil helst ikke derhen igen", "vi skal ikke derover igen"
  new RegExp(`\\b(?:${anyOf(["vil helst ikke", "skal ikke", "gider ikke", "behøver ikke", "behøver vi ikke"])})\\s+(?:\\w+\\s+){0,2}(?:derhen|dertil|derover|derned|derop|tilbage|igen)\\b`, "g"),
  // "det dropper vi", "den springer vi over", "den by springer vi over"
  new RegExp(`\\b(?:[Dd]et|[Dd]en)(?:\\s+\\w+){0,2}\\s+(?:${anyOf(["dropper vi", "springer vi over", "står vi over", "skipper vi"])})`, "g"),
  new RegExp(`\\b(?:${anyOf(["kan vi godt springe over", "kan vi springe over", "vil vi gerne undgå", "vil vi undgå", "gider vi ikke"])})`, "g"),
  // "we have no wish to go back there", "we're not interested in it"
  new RegExp(`\\b(?:${anyOf(["no wish to", "no desire to", "no interest in", "not interested in", "no plans to"])})\\s+(?:\\w+\\s+){0,3}(?:${TRAVEL_VERB}|it|there)\\b`, "g"),
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
export const readExclusions = (travellerText, { known = [] } = {}) => {
  const t = clean(travellerText);
  if (!t) return [];
  const out = [];
  const gazetteer = new Set((Array.isArray(known) ? known : []).map(x => clean(x).toLowerCase()).filter(Boolean));
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t)) !== null) {
      const name = trimTail(m[1]);
      if (!name) continue;
      const low = name.toLowerCase();
      if (NOT_A_PLACE.has(low)) continue;
      // One word and two letters is not a place name, it is an initial.
      if (name.length < 3) continue;
      if (!out.some(x => x.toLowerCase() === low)) out.push(name);
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
  return fields.some(f => list.some(x => f === x || f.includes(x) || x.includes(f)));
};

export const withoutExcluded = (rows, excluded) =>
  (Array.isArray(rows) ? rows : []).filter(r => !isExcluded(r, excluded));

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
