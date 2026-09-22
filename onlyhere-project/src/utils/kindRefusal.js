// ── A KIND OF PLACE THEY SAID NO TO ─────────────────────────────────
//
// Oliver, 22 Sep 2026, testing the chat himself. He typed:
//
//   "We mostly care about food and shopping, not museums"
//
// and the next reply offered Louisiana, described as a walk through a
// sculpture park by the sea. The sentence was read, in the sense that the
// interests slot filled with food and shopping and left museums out. Nothing
// carried the other half of it: that museums had been REFUSED, not merely
// left unsaid. So the refusal narrowed what he wanted and narrowed nothing
// about what he would be offered, and the one place it should have stopped
// came back wearing a different description.
//
// exclusions.js answers this question for PLACES and has since August. It
// reads "skip Copenhagen" and hands both build prompts a list of names that
// may not appear. A category is the same refusal at a different level, and it
// had no reader at all.
//
// WHY IT IS NOT A THEME. interestFit.js maps "museums" onto history AND art,
// which is right for somebody ASKING: a person who likes museums likes both
// kinds. Run backwards it is wrong twice over, because a person who is tired
// of museums has said nothing about Kronborg, and nothing about the street art
// in Nørrebro. A refusal is narrower than a preference, so this file keeps its
// own small vocabulary of the things people say no to, one entry per thing,
// and never widens one into a theme.
//
// AND IT REUSES THE CLAUSE, NOT THE SENTENCE. tripBrief.js has known where a
// refusal starts and ends since 5 September: a clause, stopping at a comma, a
// full stop, a contrast word or the end of the turn. withoutRefused deletes
// exactly that span. This file reads the same spans through refusedClauses, so
// the two readers cannot disagree about what was refused. Everything outside a
// refusal clause is untouched, which is the whole reason "food and shopping"
// in the sentence above survives.
import { fold } from "./danishNames";
import { saysWord } from "./interestFit";
import { refusedClauses } from "./tripBrief";

// ── THE THINGS PEOPLE SAY NO TO, AND WHAT THEY LOOK LIKE ON A ROW ───
//
// `said` is what a traveller writes; `row` is what the published entry calls
// itself. They are kept apart for the same reason interestFit keeps its two
// sides apart: "art gallery" is how somebody refuses one, and "Gallery" is how
// a row is labelled, and folding the two lists into one makes the wider of
// them do both jobs.
//
// Deliberately short. A kind earns a line here when somebody has been heard to
// refuse it, not because it exists, because every entry is a chance to rule
// out more of Denmark than a person asked to.
export const REFUSABLE_KINDS = {
  museum: {
    label: "museums",
    said: ["museum", "museums", "museer", "museet", "musee", "musees", "museen"],
    row: ["museum", "museums", "museet", "museer"],
  },
  gallery: {
    label: "art galleries",
    said: ["gallery", "galleries", "galleri", "gallerier", "galerie"],
    row: ["gallery", "galleries", "galleri", "kunsthal"],
  },
  castle: {
    label: "castles and palaces",
    said: ["castle", "castles", "palace", "palaces", "slot", "slotte", "schloss"],
    row: ["castle", "palace", "slot"],
  },
  church: {
    label: "churches and cathedrals",
    said: ["church", "churches", "cathedral", "cathedrals", "kirke", "kirker", "domkirke", "kirche"],
    row: ["church", "cathedral", "kirke", "domkirke", "abbey", "kloster"],
  },
  nightlife: {
    label: "bars, pubs and clubs",
    said: ["nightlife", "bar", "bars", "pub", "pubs", "club", "clubs", "clubbing", "bodega", "natteliv"],
    row: ["bar", "pub", "club", "nightclub", "cocktail", "bodega", "brewery", "brewpub"],
  },
  shopping: {
    label: "shopping",
    said: ["shopping", "shops", "mall", "malls", "boutique", "boutiques", "shoppe", "butikker"],
    row: ["shop", "shops", "shopping", "mall", "boutique", "department store"],
  },
  beach: {
    label: "beaches",
    said: ["beach", "beaches", "sunbathing", "strand", "strande"],
    row: ["beach", "strand", "dunes", "bathing"],
  },
  hiking: {
    label: "hiking and long walks",
    said: ["hiking", "hike", "hikes", "trekking", "vandring"],
    row: ["hike", "hiking", "trail", "trek"],
  },
  themepark: {
    label: "theme parks",
    said: ["theme park", "theme parks", "amusement park", "amusement parks", "funfair", "rollercoaster", "rollercoasters", "forlystelsespark"],
    row: ["theme park", "amusement park", "funfair", "rollercoaster", "rides"],
  },
  zoo: {
    label: "zoos and aquariums",
    said: ["zoo", "zoos", "aquarium", "aquariums", "akvarium", "zoologisk"],
    row: ["zoo", "aquarium", "akvarium", "zoologisk"],
  },
  boat: {
    label: "boat trips and canal tours",
    said: ["boat trip", "boat trips", "boat tour", "boat tours", "canal tour", "canal tours", "cruise", "cruises", "kanalrundfart"],
    row: ["boat trip", "boat tour", "canal tour", "canal boat", "cruise", "kanalrundfart"],
  },
};

export const KIND_KEYS = Object.keys(REFUSABLE_KINDS);

// ── "NOT JUST MUSEUMS" IS A REQUEST FOR MORE, NOT FOR NONE ──────────
//
// The same trap exclusions.js documents for places, where "It's not just
// Legoland we're after" ruled Legoland out. A negation followed by a word
// meaning ONLY reverses the sentence, and this reader may not run on it: a
// category wrongly ruled out empties a whole afternoon of the trip and the
// traveller is never told why.
const NOT_ONLY = /\b(?:no|not|don'?t|dont|never|ikke|nicht|kein(?:e|en)?)\s+(?:just|only|merely|solely|exclusively|kun|bare|nur)\b/i;

// ── AND A NAMED MUSEUM IS ONE MUSEUM ────────────────────────────────
//
// "I don't want to do the National Museum" refuses a building. "I don't want
// to do museums" refuses a category, and treating the first as the second
// takes Kronborg, Louisiana and the Viking Ship Museum out of a trip on the
// strength of a sentence about one of them. exclusions.js already reads the
// name out of that sentence and rules it out by name, which is the right
// answer to it and the whole answer to it.
//
// The evidence is the capital letter, on the traveller's own keyboard. A
// capitalised token touching the word makes it part of a name: "Louisiana
// Museum", "National Museum", "Museum Jorn". The first word of the clause is
// exempt, because a sentence starts with a capital and that says nothing.
const capitalised = (tok) => !!tok && /^[A-ZÆØÅ]/.test(tok) && tok !== "I";

const partOfAName = (clause, word) => {
  const re = new RegExp(`(^|[^\\p{L}])(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![\\p{L}])`, "giu");
  let m;
  while ((m = re.exec(clause)) !== null) {
    const before = clause.slice(0, m.index + m[1].length).trim().split(/\s+/);
    const after = clause.slice(m.index + m[0].length).trim().split(/\s+/);
    const prev = before[before.length - 1] || "";
    const next = after[0] || "";
    // A capitalised word in front of it, and something in front of THAT, so the
    // first word of the clause never counts as evidence of anything.
    if (before.length > 1 && capitalised(prev)) return true;
    if (capitalised(next)) return true;
  }
  return false;
};

// ── WHAT THEY RULED OUT, IN THEIR OWN WORDS ─────────────────────────
//
// Their own turns only, and for the reason the rest of the brief reads them
// that way: Gemlyx's replies name museums constantly, and a reader over the
// whole transcript would rule out a category off Gemlyx's own sentence. The
// keys come back in the order this file lists them so two runs of the same
// conversation produce the same block.
export const ruledOutKinds = (travellerText) => {
  const text = String(travellerText || "");
  if (!text.trim()) return [];
  const out = [];
  for (const clause of refusedClauses(text)) {
    if (NOT_ONLY.test(clause)) continue;
    const hay = fold(clause);
    for (const key of KIND_KEYS) {
      if (out.includes(key)) continue;
      const words = REFUSABLE_KINDS[key].said;
      const hit = words.find(w => saysWord(hay, w));
      if (!hit) continue;
      if (partOfAName(clause, hit)) continue;
      out.push(key);
    }
  }
  return out;
};

export const kindLabels = (keys) =>
  (Array.isArray(keys) ? keys : []).map(k => REFUSABLE_KINDS[k]?.label).filter(Boolean);

// ── AND SAY IT TO BOTH PROMPTS, WHICH IS WHERE IT WAS LOST ──────────
//
// The reframing is the part worth spelling out. Gemlyx did not offer him a
// museum; it offered him a sculpture park by the sea, with a café, and the
// museum was the building in the middle of it. A rule that says "no museums"
// and stops there is answered by describing one differently, so the rule has
// to close that door by name: the garden, the café, the shop and the view of
// the building are all the place itself.
export const refusedKindsBlock = (keys) => {
  const labels = kindLabels(keys);
  if (!labels.length) return "";
  return `\n\nKINDS OF PLACE THE TRAVELER RULED OUT, in their own words in the conversation below:\n${labels.map(l => `- ${l}`).join("\n")}\nNone of these may be offered, planned, or named as a suggestion, in any wording. A place of a ruled-out kind stays ruled out when it is described as something else: its garden, its park, its café, its shop, the walk around it or the view of the building are the same place. Do not offer one as an exception because it is famous or highly rated, and do not ask whether they would make an exception. Everything else they asked for is unaffected: a refusal of one kind says nothing about any other.`;
};

// ── AND THE CARDS, BECAUSE A PROMPT RULE IS NOT A FILTER ────────────
//
// The block above is an instruction to a model. The preview pool is a list,
// and a list can be filtered, which is the stronger answer where one exists.
//
// NAME, TYPE AND TAG ONLY. The description is prose about the place and a town
// whose description mentions the museum on its main square is not a museum;
// filtering on it would take the town out of the trip. A row says what it IS
// in its type and its tag, and the name carries it often enough to be worth
// reading.
const ROW_FIELDS = ["name", "type", "tag", "what", "category"];

export const rowIsKind = (row, key) => {
  const words = REFUSABLE_KINDS[key]?.row;
  if (!words || !row) return false;
  const hay = fold(ROW_FIELDS.map(f => row[f]).filter(v => typeof v === "string").join(" "));
  if (!hay) return false;
  return words.some(w => saysWord(hay, w));
};

export const isRefusedKind = (row, keys) =>
  (Array.isArray(keys) ? keys : []).some(k => rowIsKind(row, k));

