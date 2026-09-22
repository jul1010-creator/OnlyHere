// ── WHICH OF THE THREE STREETS, AND WHAT HAPPENS ON IT ──────────────
//
// Oliver, 22 Sep 2026: "I think it's unfortunate that on the bar streets,
// there is no tier or popularity rating.. like at Aalborg, we both know what
// street is the most popular and who goes there. But a tourist might pick
// between 3 streets, not knowing that Jomfru Ane Gade is by far the most
// popular." And a minute later: "There should be a 'party street' 'local
// street' 'Quiet street' kind of vibe on them like with the tiers on towns and
// attractions."
//
// TWO QUESTIONS, SO TWO FIELDS, which is the same reasoning placeKind.js
// already uses for what a place IS against what it hangs off. A visitor with
// one night and three streets in front of them is asking:
//
//   WHICH ONE TONIGHT   the vibe, his three words, answered inside this town
//   IS IT WORTH IT      the tier, the same four values every other type carries
//
// One field cannot answer both. The busiest street in Aalborg is not where
// somebody who wants to hear their friend talk should be sent, and the main
// strip of a town of nine thousand is its main strip and is still not a reason
// to cross the country. Collapsing the two would mean ranking every street on
// a scale that has somebody else's night at the top of it.
//
// AND THE TIER IS NOT A SECOND VOCABULARY. It is TIERS, unchanged, so tierOf,
// the card badge, the preview ranking and the publish gate all keep working on
// a street exactly as they do on a town, with no new case anywhere.
import { TIERS } from "./placeThemes";

const clean = (v) => String(v == null ? "" : v).trim();

// ── HIS THREE, AND NO FOURTH ────────────────────────────────────────
//
// Oliver's own set, and it is sharper than the one I offered him: "Main
// street, pre-drinking street, quite street.. no?" Where my three named a
// taste, his three name a ROLE IN ONE EVENING, and an evening has an order.
// You start on one street, the night happens on another, and the third is
// where you go when you want neither. That is a fact about the town that a
// visitor cannot see from outside and a local never has to think about.
//
// Three, because three is what he named. placeThemes.js says why a vocabulary
// may not quietly grow: a value nobody wrote is a scale the app invented, and
// the model will reach for "vibrant" the moment the list stops being closed.
// A street that fits none of these leaves the field empty and the card says
// nothing, which is honest and is what an unresearched street deserves.
//
// `value` is what the draft must carry and `label` is what a card prints,
// which is the split TIERS was given the day a founder followed the gate's own
// instructions and was refused for it.
export const STREET_VIBES = [
  {
    id: "main",
    value: "Main strip",
    label: "Main strip",
    emoji: "🎉",
    color: "#E23B4E",
    meaning: "the street the town's night happens ON. Doors every few metres, people moving between them, queues at the weekend, and it is still full at two. Somebody with one night, a group and no plan belongs here. Named MAIN STRIP rather than main street on purpose: hovedgaden in a Danish town is where the shops are.",
  },
  {
    id: "start",
    value: "Where the evening starts",
    label: "Where the evening starts",
    emoji: "🍺",
    color: "#D4AF37",
    meaning: "where people drink first and then leave. Cheaper, earlier, busy from eight and thinning out towards midnight as the crowd moves to the main strip. Worth knowing precisely because nobody stays: arriving here at one in the morning is arriving at an empty street. EVENING, not night, because Denmark is not Spain: the strip fills around ten or eleven and somebody reading NIGHT as two in the morning would arrive after it had emptied.",
  },
  {
    id: "quiet",
    value: "Quiet street",
    label: "Quiet street",
    emoji: "🕯",
    color: "#6FA8A0",
    meaning: "a few good doors and no crowd. You can hear the person across the table. Somewhere to drink without shouting, and never where a big night happens.",
  },
];

export const STREET_VIBE_VALUES = STREET_VIBES.map(v => v.value);

// Matched loosely, for the reason TIERS is: these rows are written over weeks
// by a model that will capitalise differently, write "party" without "street",
// or hyphenate. Tolerance of typography, never of meaning: nothing outside the
// three is accepted, so "Vibrant" and "Mixed" are refused rather than guessed
// at, and the field stays empty until somebody writes one of the three.
const VIBE_MATCH = {
  // "Main strip", and the wordings a model reaches for when it is describing
  // one: main street, the strip, hovedgaden. Nothing outside the three is
  // accepted, so "Vibrant" and "Mixed" are refused rather than guessed at.
  main: /\bmain\b|\bstrip\b|\bhovedgade/i,
  // His "pre-drinking street", under a name that does not collide with
  // pre-drinks at home, plus the words a draft is likely to use for it.
  // Oliver, 22 Sep 2026, on the word itself: "change to 'evening'.. because
  // some countries go to main streets at 02.00.. which is NOT the case in
  // Denmark." So the matcher takes either word and the stored value is the
  // honest one, which also repairs any row drafted before the change.
  start: /\bstarts?\b|\bpre.?drink/i,
  quiet: /\bquiet\b|\bcalm\b/i,
};

export const vibeOf = (street) => {
  const raw = clean(street && (typeof street === "string" ? street : street.vibe));
  if (!raw) return null;
  return STREET_VIBES.find(v => VIBE_MATCH[v.id].test(raw)) || null;
};


// ── AND WHAT EACH ONE MEANS, WHERE THE MODEL CAN READ IT ────────────
//
// placeThemes.js has the case at length: `tier` was four labels and a slash
// list while `themes` beside it got a paragraph of judgement, and the field
// that decides whether somebody drives four hours was the one with no
// criteria. A vibe with no criteria would be the same mistake on a smaller
// field, so the meanings above are written for a reader and printed here.
//
// Built from the list rather than typed beside it, so a vibe cannot exist with
// no rule and a rule cannot survive its vibe being removed.
export const STREET_VIBE_RULE = `WHAT KIND OF STREET THIS IS. Pick EXACTLY one of ${STREET_VIBE_VALUES.join(" / ")}, and pick it on what the research says rather than on how the street markets itself:
${STREET_VIBES.map(v => `- ${v.value}: ${v.meaning}`).join("\n")}
A street that the research does not place in one of these three leaves the field an empty string. Never invent a fourth kind, and never soften a main strip into a quiet street because the entry would read better.`;

// ── AND THE TIER GOES BACK TO MEANING WHAT IT MEANS ─────────────────
//
// The first cut of this file read the four tiers as "which of the streets in
// this town", because that was his question. His own vibe set answers it
// better: Main strip IS the street the town's night happens on, and it says so
// in two words on the card.
//
// So the tier is left doing the job it does everywhere else in the app, which
// is the one a second field was wanted for: how this street ranks against bar
// streets ANYWHERE IN DENMARK. The pair is what a traveller reads:
//
//   Jomfru Ane Gade        Main strip · Can't Miss Out
//   a small town's own     Main strip · Worth Considering
//
// Both are the main strip of their town and only one is worth crossing the
// country for, which one field could never have said. TIERS unchanged, so
// tierOf, the badge, the preview ranking and the publish gate need no new case
// for a street.
//
// Keyed off TIERS so a fifth tier cannot appear here with no rule, exactly as
// TIER_MEANING is keyed off it in placeThemes.js.
const STREET_TIER_MEANING = {
  must: "worth going out of your way for while you are in Denmark. A street somebody would move a night in another town to reach. There are a handful in the country.",
  high: "worth an evening if they are in this town or the next one. A real night out that stands up next to the famous strips.",
  worth: "worth it if they are here anyway and want to go out. The honest middle, and where most of a country's bar streets belong.",
  nearby: "only worth it if they are staying on it or beside it. A handful of doors that nobody travels for.",
};

export const STREET_TIER_RULE = `HOW THIS STREET RANKS AGAINST BAR STREETS ANYWHERE IN DENMARK, not against the other streets in its own town, which the vibe below already answers:
${TIERS.map(t => `- ${t.value}: ${STREET_TIER_MEANING[t.id]}`).join("\n")}
Rank it on what the research shows, never on how much you liked writing about it. Being the busiest street in a small town makes it that town's main strip and does not make it a reason to travel, so those two fields often disagree and both are right.`;

// Every tier has a street reading, or the rule above prints an undefined.
// Asserted in the suite rather than trusted here.
export const TIERS_WITHOUT_STREET_MEANING = () => TIERS.filter(t => !STREET_TIER_MEANING[t.id]);
