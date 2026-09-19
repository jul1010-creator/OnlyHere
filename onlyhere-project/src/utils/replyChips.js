// ── "SHALL WE MAKE PEOPLE ABLE TO LITERALLY CLICK RESPONSES" ────────
//
// Oliver, 19 Sep 2026, on watching people use Gemlyx:
//
//   "Some people use it as if it is ChatGPT. They don't let it fully plan
//    anything for them. How can we avoid this? Shall we make people able to
//    literally 'click responses' to Gemlyx? So you can click a word as a
//    response to the AI?"
//
// Yes, and for a second reason he did not ask about. Every party, origin and
// hotel bug fixed in this repository is a PARSING bug: "my wife and 3 kids"
// read as three children, "Starting point: Copenhagen" read as no starting
// point, "We have booked a stay at ..." read as nothing at all. A chip carries
// a value rather than a sentence, so on the path most people take there is
// nothing to parse and nothing to get wrong.
//
// ── AND IT IS NOT THE INTAKE FORM AGAIN ─────────────────────────────
//
// He has objected to this app feeling like a form twice, in those words, and a
// row of buttons under every reply is exactly how that happens. So:
//
//   ONE SLOT AT A TIME. Chips appear only for the question the reply actually
//   asked, and only while that slot is still open. A chip under an old question
//   is a stale answer waiting to be clicked.
//
//   FOUR AT MOST, and usually fewer. A menu is a form.
//
//   THE TEXT BOX NEVER CLOSES. A chip is a shortcut past typing, never the only
//   way through. Anything a chip cannot say, and there is plenty, is typed.
//
//   NOTHING EXPLAINS THEM. His standing rule: a label and the control is the
//   whole of it, and a sentence underneath saying what a button does is clutter.
//
// ── AND A CHIP IS A SENTENCE THE READERS ALREADY UNDERSTAND ─────────
//
// `say` is posted as the traveller's own message, word for word, and goes
// through the same readers a typed answer does. Nothing here gets a private
// channel into the brief, because a second way to fill a slot is a second thing
// to keep in step with the first, and this repository's own scar is "one
// hand-written list copied four times". The suite asserts that every chip here
// fills the slot it sits under, which is a test the typed path cannot have.
import { BRIEF_SLOTS } from "./tripBrief";
import { LOCATE_LABEL } from "./locateMe";

// The one chip that runs something before it can say anything. Named here so
// the render and the chip table cannot disagree about the spelling of it.
export const LOCATE = "locate";

// Four. A fifth turns a suggestion into a menu, and the one thing this must not
// become is the intake form with rounded corners.
export const MAX_CHIPS = 4;

// ── DANISH, AND ONLY DANISH ─────────────────────────────────────────
//
// The same rule askDa follows in tripBrief.js, for the same reason, and it is
// worth repeating here rather than assumed: Denmark is where this is used, and
// Danish is the one language in this repo that the person who owns it can read.
// Six machine translations would be six strings nobody here can check, which is
// how the awkward Danish in the rest of the product happened. Everything else
// falls back to the English, which is what a traveller reading in German gets
// today from every ask in the brief.
const DANISH = "da";

export const CHIPS = {
  // ── WHERE THEY START, AND THE ONE HE ASKED FOR ────────────────────
  //
  // Oliver, same message: "Some people might be Danes. They would not begin at
  // the airport." The third chip is that traveller, and it is the only one of
  // these that does more than save typing: it sets `fromHome` on the brief,
  // which is what stops the app explaining the Copenhagen Card to somebody who
  // has lived here for forty years. See homeStartBlock.
  //
  // It says "I live in Denmark" and not a town, because it is honest about what
  // one tap can know. The reply then asks where, which is a real question with
  // a real answer rather than a guess at Kastrup.
  //
  // ── AND ONE OF THEM HAS NO SENTENCE UNTIL IT IS TAPPED ─────
  //
  // Oliver, 19 Sep 2026: "Make a starting point chip that is called 'from my
  // location'." Every other chip here is a fixed string; this one cannot be,
  // because what it says depends on an answer the browser has not given yet. So
  // it carries an ACTION and no `say`, App.jsx does the asking, and what comes
  // back is read in utils/locateMe.js, which is also where the rule that the
  // coordinate never reaches the chat is written down and enforced.
  //
  // THIRD, NOT FIRST. Most people answering this question are flying in, and a
  // fix taken at their kitchen table in Rotterdam is a true answer to a
  // different question. The two airports read first because they are the
  // common case; this is for the person who is already here or already home.
  origin: [
    { label: "Copenhagen Airport", labelDa: "Københavns Lufthavn", say: "I'm flying into Copenhagen Airport", sayDa: "Jeg flyver til Københavns Lufthavn" },
    { label: "Billund Airport", labelDa: "Billund Lufthavn", say: "I'm flying into Billund Airport", sayDa: "Jeg flyver til Billund Lufthavn" },
    { ...LOCATE_LABEL, action: LOCATE },
    { label: "I live in Denmark", labelDa: "Jeg bor i Danmark", say: "I live in Denmark, I'm starting from home", sayDa: "Jeg bor i Danmark, jeg tager hjemmefra" },
  ],
  // A length, in the shapes people say it. Not a spinner: three common answers
  // and the box for everything else.
  days: [
    { label: "A weekend", labelDa: "En weekend", say: "2 days", sayDa: "2 dage" },
    { label: "3 days", labelDa: "3 dage", say: "3 days", sayDa: "3 dage" },
    { label: "5 days", labelDa: "5 dage", say: "5 days", sayDa: "5 dage" },
    { label: "A week", labelDa: "En uge", say: "7 days", sayDa: "7 dage" },
  ],
  // ── AND `when` HAS NONE, ON PURPOSE ───────────────────────────────
  //
  // A date is a date. Every chip anybody could write here ("next month", "in
  // the summer") is the MONTH-PRECISION answer that the brief already treats as
  // vague and asks a second question about, so a chip for it would manufacture
  // the exact state this app spent September learning to avoid. The slot has no
  // entry rather than a bad one.
  party: [
    { label: "Just me", labelDa: "Kun mig", say: "Just me", sayDa: "Kun mig" },
    { label: "Me and my partner", labelDa: "Mig og min partner", say: "Me and my partner, 2 adults", sayDa: "Mig og min partner, 2 voksne" },
    { label: "Family with kids", labelDa: "Familie med børn", say: "A family with kids", sayDa: "En familie med børn" },
    { label: "Friends", labelDa: "Venner", say: "A group of friends", sayDa: "En gruppe venner" },
  ],
  // "You pick" is the door with a handle on it that made `interests` safe to
  // make hard, and it has never been visible anywhere. It is a chip now.
  interests: [
    { label: "Food", labelDa: "Mad", say: "Food", sayDa: "Mad" },
    { label: "History", labelDa: "Historie", say: "History", sayDa: "Historie" },
    { label: "Nature", labelDa: "Natur", say: "Nature", sayDa: "Natur" },
    { label: "You pick", labelDa: "Du bestemmer", say: "You pick", sayDa: "Du bestemmer" },
  ],
  transport: [
    { label: "Car", labelDa: "Bil", say: "By car", sayDa: "I bil" },
    { label: "Trains and buses", labelDa: "Tog og bus", say: "Public transport", sayDa: "Offentlig transport" },
    { label: "Bike", labelDa: "Cykel", say: "By bike", sayDa: "På cykel" },
    // ── AND NOT "A MIX" ────────────────────────────────
    // A fourth chip saying "a mix" was written and measured out again: every
    // sentence for it collapses to ONE mode in the slot ("a mix of car and
    // trains" reads as public transport and loses the car), so the chip would
    // have quietly answered a different question from the one on its face. A
    // mix is a real answer and it is one a person types, which is what the box
    // beside these is for. On foot is the fourth mode this app plans for and it
    // reads cleanly, so it gets the chip instead.
    { label: "On foot", labelDa: "Til fods", say: "Mostly on foot", sayDa: "Til fods" },
  ],
  stay: [
    { label: "Already booked", labelDa: "Allerede booket", say: "Yes, I have booked a hotel already", sayDa: "Ja, jeg har allerede booket et hotel" },
    { label: "Not yet", labelDa: "Ikke endnu", say: "No, I haven't booked anywhere to stay", sayDa: "Nej, jeg har ikke booket noget sted at bo" },
  ],
  budget: [
    { label: "Keeping it cheap", labelDa: "Holder det billigt", say: "I'm on a tight budget", sayDa: "Jeg har et stramt budget" },
    { label: "Middle of the road", labelDa: "Midt imellem", say: "A middling budget, nothing extravagant", sayDa: "Et mellemhøjt budget, ikke noget ekstravagant" },
    { label: "Not counting", labelDa: "Tæller ikke", say: "Money is no object here", sayDa: "Penge er ikke noget problem, jeg har et rummeligt budget" },
  ],
};

// ── THE SHARPENING QUESTIONS ────────────────────────────────────────
//
// A slot can be asked twice: once for the answer and once about the answer.
// "Who's coming along?" and "how many adults are with them?" share a slot and
// are different questions, so they carry different keys, and a chip set keyed
// only by the slot would put "Just me" under the second one.
export const SHARPER_CHIPS = {
  party: [
    { label: "One adult", labelDa: "Én voksen", say: "1 adult", sayDa: "1 voksen" },
    { label: "Two adults", labelDa: "To voksne", say: "2 adults", sayDa: "2 voksne" },
    { label: "Three adults", labelDa: "Tre voksne", say: "3 adults", sayDa: "3 voksne" },
  ],
};

// ── AND THERE IS NO BUILD CHIP ──────────────────────────────────────
//
// The first version of this file had one, because "Build it" is what the whole
// conversation is for. It came out after reading what is already on that
// screen: a ready brief raises a build card of its own, with a decline and a
// quiet way back if they decline, and it has been argued over in App.jsx since
// 10 August, when a friend of Oliver's could not find the button at all.
//
// Two controls in the same column offering the same thing is the mistake the
// phone choice class exists to prevent, written down there in one line: asking
// twice would be asking twice. So the chips answer questions and the card
// offers the build, and neither does the other's job.

const baseOf = (key) => String(key || "").replace(/:sharper$/, "");
const isSharper = (key) => /:sharper$/.test(String(key || ""));

// Whether a slot is still worth a chip. A question answered between the reply
// landing and the traveller reaching for it has no chips: they would fill a
// slot that is already full, and the brief would then hold two answers to one
// question with the wrong one last.
const stillOpen = (brief, key) => !!brief && (
  (brief.missing || []).includes(key)
  || (brief.declined || []).includes(key)
  || (brief.vague || []).includes(key)
  || (brief.unanswered || []).includes(key)
);

// ── WHAT SITS UNDER ONE REPLY ───────────────────────────────────────
//
// `asked` is the list of slot keys that reply put to the traveller, recorded on
// the message itself in App.jsx. `brief` is the brief as it stands NOW, which
// is what makes a stale chip impossible.
//
// ONE SET, from the first asked key that is still open, because the prompt's own
// rule is one question per turn and two rows of chips would contradict it on
// screen. A reply that asked nothing gets nothing at all, which is most
// replies.
export const chipsFor = ({ asked = [], brief = null, lang = "" } = {}) => {
  const pick = (list) => (list || []).slice(0, MAX_CHIPS).map(c => ({
    label: lang === DANISH && c.labelDa ? c.labelDa : c.label,
    say: lang === DANISH && c.sayDa ? c.sayDa : c.say,
    // An action chip has no sentence until it has run. Everything else has no
    // action, and the render branches on this one field.
    action: c.action || "",
  }));
  const keys = Array.isArray(asked) ? asked : [];
  for (const key of keys) {
    const slot = baseOf(key);
    if (!stillOpen(brief, slot)) continue;
    const set = isSharper(key) ? SHARPER_CHIPS[slot] : CHIPS[slot];
    if (set && set.length) return pick(set);
  }
  // Nothing this reply asked is still open. No chips: the build card is what a
  // ready brief raises, and it raises itself. See the block above.
  return [];
};

// Every slot that has chips, for the assertion that none of them drifts away
// from a slot that exists. BRIEF_SLOTS is imported for exactly this: a chip set
// keyed to a slot this app no longer has is a row of buttons that can never
// appear, and nothing would ever say so.
export const CHIPPED_SLOTS = Object.keys(CHIPS);
export const SLOT_KEYS = BRIEF_SLOTS.map(s => s.key);
