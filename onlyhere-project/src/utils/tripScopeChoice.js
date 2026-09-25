// ── HOW FAR THE TRIP GOES, ASKED RATHER THAN GUESSED ────────────────
//
// Oliver, 25 Sep 2026, proposing the budget panel: "make more options ... 'Stay
// at one town' 'Stay at one Island' 'Explore Denmark'."
//
// ── WHY THIS IS THE FIX FOR A QUESTION THAT HAD NO GOOD ANSWER ──────
//
// The preview had spent a day getting this wrong in both directions. First it
// stuck: a form-filled start point was read by none of the origin readers, so
// the screen was the start town and its own restaurants and nothing else. Then
// it overshot: with the origin wired in, an eight day brief opened the reach
// door and a five day family trip on 200 DKK a day out of Aalborg was offered
// Odense at 185 km and Copenhagen at 326.
//
// Every fix for the overshoot was a formula I would have had to invent: a
// budget-to-distance curve, a slower reading of the ticked modes, a cap on how
// many towns. All of them guess at a thing the traveller knows and was never
// asked. His answer is to ask, and it is better than any constant I could have
// picked, because a two day trip that wants to roam and a ten day trip that
// wants one base are both real and no formula separates them.
//
// ── AND IT IS A PREFERENCE, NEVER A FACT ABOUT THE WORLD ────────────
//
// Nothing here measures anything. It says which SHAPE of trip was asked for,
// and the reach pass in utils/previewMatch.js is the one place that turns that
// into which towns reach the screen. A scope nobody chose is "", and "" means
// exactly what it meant before this file existed.

const clean = (s) => String(s ?? "").trim();

// ── THE THREE, IN HIS WORDS ─────────────────────────────────────────
//
// `label` is what the chip says and `said` is what the intake line tells the
// model, which are different jobs: the chip is read by somebody choosing and
// the sentence is read by something planning.
//
// ONE ISLAND MEANS NO CROSSING, which is the only reading that works for a
// country where most people start on a peninsula. A traveller in Aalborg who
// picks it is saying Jutland; one in Copenhagen is saying Zealand; one in
// Ærøskøbing is saying Ærø. All three are the same sentence: do not put a boat
// in my trip. The label says island because that is the word a visitor to
// Denmark reaches for, and the app knows what it means from where they start.
export const TRIP_SCOPES = [
  {
    key: "town",
    label: "Stay in one town",
    said: "They want the whole trip in ONE town. Do not move them between towns, and do not offer a second one: a day trip out and back is fine, an overnight move is not.",
  },
  {
    key: "island",
    label: "Stay on one island",
    said: "They want to stay on the landmass they start on, so no ferry crossings and no islands they would have to sail to. Moving between towns is fine as long as the trip never needs a boat.",
  },
  {
    key: "explore",
    label: "Explore Denmark",
    said: "They are happy to move around the country, so towns further out are worth offering when the days and the way they are getting around allow it.",
  },
];

export const TRIP_SCOPE_KEYS = TRIP_SCOPES.map(s => s.key);
export const scopeOf = (key) => TRIP_SCOPES.find(s => s.key === clean(key)) || null;

// The line the intake writes into the brief. Empty for a scope nobody chose,
// because a sentence about a preference they did not state is the app filling
// in the traveller's answer, which is the failure this whole day was spent
// removing.
export const scopeSaid = (key) => {
  const s = scopeOf(key);
  return s ? `How far they want to go: ${s.label}. ${s.said}` : "";
};

// ── WHAT THE PREVIEW DOES WITH IT ───────────────────────────────────
//
// Two questions, asked separately because they have different answers.
//
// `scopeOffersOtherTowns` gates the reach door. "One town" shuts it outright:
// a screen that offers a second town to somebody who asked for one is arguing
// with them, and it is the exact complaint that opened this thread.
//
// `scopeAllowsTown` is asked of each candidate once the door is open, and it
// is where "one island" lives. Both default to letting everything through, so
// a brief with no scope behaves as every brief did before.
export const scopeOffersOtherTowns = (key) => clean(key) !== "town";

// `partOf` is injected rather than imported, the same way this codebase hands
// costLines its distances and placeContainer its town reader: which landmass a
// town sits on is geography, and geography stays out of the vocabulary.
export const scopeAllowsTown = (key, { from, to } = {}) => {
  if (clean(key) !== "island") return true;
  const a = clean(from), b = clean(to);
  // Nothing known about one end is not a reason to refuse. An unplaced town is
  // the app's own gap and the traveller should not pay for it with a shorter
  // list; the ferry gate in utils/journey.js errs the same way on purpose.
  if (!a || !b) return true;
  return a.toLowerCase() === b.toLowerCase();
};
