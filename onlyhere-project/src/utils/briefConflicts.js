import { withoutRefused } from "./tripBrief";
// ── TWO THINGS THAT ARE BOTH TRUE AND DO NOT FIT ────────────────────
//
// Oliver, 5 Sep 2026, reporting his own guide through the Studio report button:
// "It put nightlife to Kødbyen... if I tell the AI that I got kids with me, and
// I also tell it I wanna go drinking, then the AI gotta solve it somehow."
//
// He had said, in this order: "I'm alone with 8 kids", and then "I was thinking
// of nightlife, a couple of beers, and then some nature". Both are facts about
// the same trip and they pull in opposite directions, and Gemlyx did what a
// system with no notion of a conflict does — it filled both slots, said "YOU
// HAVE EVERYTHING YOU NEED. Do not ask another question", and quietly decided
// for him. The guide sent a man travelling alone with eight children on an
// evening out in a bar an hour and a half away.
//
// Asked what solving it should look like, his answer was not a rule about bars:
//
//   "Try to get a better understanding of what the customer is looking for, in
//   such scenarios."
//
// So this file does not resolve anything. It notices, and it turns the noticing
// into a question, which is the one thing the brief machinery already knows how
// to carry.
//
// ── WHY IT IS NOT A SLOT ────────────────────────────────────────────
//
// A slot is a fact that is missing. A conflict is two facts that are present.
// Nothing in readBrief can express that, because every reader looks at one slot
// and none of them look at each other — which is exactly why eight children and
// a night out could both be true and nobody noticed.
//
// It does NOT block the build, for the same reason `declined` exists: a question
// that can never be satisfied is a conversation that can never finish, and
// Oliver has already reported that failure once. It is asked once, like
// everything else here, and then the answer is whatever the traveller said.
// ── THE WINTER MONTHS, WHICH ARE A FACT ABOUT DENMARK ───────────────
// November to March. A Danish beach in December is not a beach day, and a
// traveller asking for one has almost always pictured a different country.
const COLD_MONTHS = new Set([10, 11, 0, 1, 2]);

// tripBrief.js does not import this file — the conflicts arrive at briefBlock as
// data — so reading one function out of it is a one-way dependency and not a
// cycle. The alternative was a second negation list here, and a second list is
// how "no kids" comes to mean kids in one file and not in the other.

const has = (v) => typeof v === "string" && !!v.trim();
const saysAny = (text, words) =>
  words.some(w => new RegExp(`\\b${w}\\b`, "i").test(String(text || "")));

// The number of children, or 0 for "there are children and nobody said how
// many", or null for "nothing here is about children". Three states, because a
// party of two adults and a party whose children were never counted are
// different facts and only one of them is a conflict.
const NAMES_CHILDREN = /\b(?:kids?|child|children|toddlers?|bab(?:y|ies)|teens?|teenagers?|grandkids?|grandchildren|family|b(?:ø|o)rn|kinder|barn|familie)\b/i;
const kidsIn = (b) => {
  const p = b?.known?.party;
  if (!p) return null;
  if (Number.isFinite(p.kids) && p.kids > 0) return p.kids;
  // ── AND "NO KIDS" IS NOT KIDS ─────────────────────────────────────
  //
  // Found 5 Sep by an adversarial review. A party of "2 adults, no kids" fired
  // this, because the word was there and nothing read the word in front of it,
  // and "2 adults, 0 kids" fired it too and then rendered "2 adults and 0
  // children" into the question. A counted zero is an answer, and the answer is
  // no.
  if (Number.isFinite(p.kids) && p.kids === 0) return null;
  // The placeholder the old reader produced ("said in the conversation") names
  // nobody, so it falls out here rather than being tested for by name: a branch
  // that cannot fire is reassurance rather than a rule, and this one was written
  // as an explicit guard first and shown by mutation to be unreachable.
  // The same scrub readInterests uses, so "no kids" and "ingen børn" read as the
  // refusals they are. One negation rule, in one place, rather than a second
  // list here that would drift from it.
  return NAMES_CHILDREN.test(withoutRefused(String(p.value || ""))) ? 0 : null;
};

// Each conflict is a `when` that reads the brief and a `question` that a person
// would actually ask. The question is the whole output: it is what Gemlyx says
// out loud, so it has to sound like somebody being helpful rather than like a
// validator refusing a form.
export const CONFLICTS = [
  {
    key: "kids-nightlife",
    // The one he reported. Children in the party AND drinking in the interests.
    //
    // A COUNT OR THE WORD, and both are needed. The count is what the direct
    // answer reader now produces ("I'm alone with 8 kids" is adults 1, kids 8),
    // and it is the better fact: eight is a different question from one
    // teenager. But a party can also arrive from the intake form as free text
    // that names children and counts none of them, and a rule that only read the
    // number would sit silent on exactly that party.
    //
    // The placeholder the old reader produced is deliberately NOT a match: "said
    // in the conversation" names nobody, and a conflict raised about a party
    // nothing is known about is a question with no content in it.
    when: (b) => kidsIn(b) !== null && saysAny(b.known?.interests?.value, ["nightlife", "bar", "beer"]),
    question: (b) => {
      const n = kidsIn(b);
      const who = n === 1 ? "child" : "children";
      const count = n > 0 ? `${n} ${who}` : `children`;
      const ages = b.known.party.kidAges?.length ? ` (${b.known.party.kidAges.join(" and ")})` : "";
      return `They want nightlife and they are travelling with ${count}${ages}. Ask which they are picturing before you plan either: somewhere they can have a beer with the ${who} there — a food hall, a brewery taproom, a harbour bar early in the evening — or a real night out, which needs somebody to watch them. Do not choose for them and do not plan the evening until they say.`;
    },
  },
  {
    key: "beach-in-winter",
    // Denmark in December is 3°C and dark at four. A beach day is not a thing
    // that exists, and the traveller has pictured somewhere else.
    when: (b) => {
      const m = b.known?.when?.value ? new Date(b.known.when.value).getMonth() : null;
      return m !== null && COLD_MONTHS.has(m)
        && saysAny(b.known?.interests?.value, ["beach", "swim", "swimming", "sunbath", "surf"]);
    },
    question: () => "They have asked for beach or swimming on a trip in the Danish winter, when it is a few degrees and dark by four. Say so plainly and ask what they were picturing — a winter beach walk and a harbour bath with a sauna are real and good, and are not the same thing as a beach day.",
  },
  {
    key: "walking-a-region",
    // A trip planned on foot cannot cross a region. modeReachKm already stops a
    // walker being offered somewhere 400 km away; nothing tells the TRAVELLER
    // that their nature day is unreachable, so they get a thin guide and no
    // explanation for why.
    when: (b) => b.known?.transport?.mode === "walk"
      && saysAny(b.known?.interests?.value, ["nature", "hiking", "hike", "island", "wildlife", "birdwatch"]),
    question: () => "They are on foot and have asked for nature. Most of what they mean is an hour or more out of any town by road. Ask whether they will have a car or the train for those days, or whether they would rather it stayed inside walking distance of where they are staying.",
  },
  {
    key: "budget-and-fine-dining",
    when: (b) => saysAny(b.known?.budget?.value, ["tight", "cheap", "budget"])
      && saysAny(b.known?.interests?.value, ["michelin", "fine dining", "tasting menu", "noma"]),
    question: () => "They have named a tight budget and a Michelin-level meal. Both are plannable and not in the same week. Ask whether the meal is the one thing they are spending on, or whether they would rather it stayed everyday.",
  },
];

// ── WHAT THE BRIEF ACTUALLY CONFLICTS ON ────────────────────────────
//
// `settled` is the conflict keys already put to the traveller, recorded the same
// way `asked` is for slots and for the same reason: a question that keeps coming
// back is worse than one that was never asked.
export const briefConflicts = (brief, settled = []) => {
  if (!brief) return [];
  const done = new Set(Array.isArray(settled) ? settled : []);
  return CONFLICTS.filter(c => !done.has(c.key) && safely(() => c.when(brief)))
    .map(c => ({ key: c.key, question: safely(() => c.question(brief)) || "" }))
    .filter(c => has(c.question));
};

// A conflict rule reads several slots and any of them can be missing or a shape
// this file did not expect. A thrown error inside a check must not take the
// whole conversation down, so every rule runs inside this.
const safely = (fn) => { try { return fn(); } catch { return null; } };

// The lines the model sees are written by briefBlock in tripBrief.js, beside the
// rest of what it is told, rather than here. One file decides what that block
// says; a second one appending to it is how two halves of an instruction end up
// contradicting each other.

// Named for the report and for the panel, so a person reading an exported
// conversation can see what was noticed and when.
export const conflictLabel = (key) => ({
  "kids-nightlife": "nightlife with children",
  "beach-in-winter": "a beach in the Danish winter",
  "walking-a-region": "nature without a way to reach it",
  "budget-and-fine-dining": "a tight budget and a tasting menu",
}[key] || key);

// The slots a conflict is about, so the panel can point at them. Kept as a
// lookup rather than derived, because a rule reads whatever it reads and
// guessing from the function body is how a label ends up lying.
//
// tripBrief.js is deliberately NOT imported here. It is the file that would have
// to import this one back, and a cycle between the brief and the checks on the
// brief is how a module ends up half-initialised at first render. The slot keys
// are strings on both sides and the suite asserts they are the same strings.
export const conflictSlots = (key) => ({
  "kids-nightlife": ["party", "interests"],
  "beach-in-winter": ["when", "interests"],
  "walking-a-region": ["transport", "interests"],
  "budget-and-fine-dining": ["budget", "interests"],
}[key] || []);
