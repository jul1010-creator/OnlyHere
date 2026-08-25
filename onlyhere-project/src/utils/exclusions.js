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

// ── WHAT THEY RULED OUT, IN THEIR OWN WORDS ─────────────────────────
//
// Reads the TRAVELLER's turns only. A place Gemlyx mentioned and they did not
// object to is not an exclusion, and reading the whole transcript is how the
// arrival anchor once resolved to Copenhagen Airport on an Aalborg brief.
export const readExclusions = (travellerText) => {
  const t = clean(travellerText);
  if (!t) return [];
  const out = [];
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
