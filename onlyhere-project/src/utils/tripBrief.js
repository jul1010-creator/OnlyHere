// ── THE BUCKET IT HAS TO FILL BEFORE IT CAN PLAN ─────────────────────
//
// Oliver, 17 Aug 2026, after reading back a real Detour conversation:
//
//   "it wrote a damn lot, and it didn't even know what I was interested in.
//    There needs to be a certain 'bucket' of things it needs to know. Like a
//    certain 'check'. It didn't know what kind of trip we were looking for.
//    Which is extremely poor design."
//
// And then, on the November event that reached a December trip:
//
//   "then it is Gemlyx' responsibility to ask."
//
// He is right on both, and they are the same point. The date filter stood down
// because the trip had no dates, and the reason it had no dates is that nothing
// ever asked for them. A parser that reads a bare month is a mitigation. Asking
// is the product.
//
// ── WHAT THE CONVERSATION ACTUALLY DID ──────────────────────────────
// Five rounds of questions. It asked for the airport and the length, got them,
// asked for budget twice, asked "mix of both?" twice, volunteered a price band
// nobody asked for, and then started planning. It never once asked what kind of
// trip they wanted, and it never knew whether a hotel was already booked, which
// decides where every day of the itinerary is anchored.
//
// That is not the model being careless. There was no list. Readiness was a marker
// the model chose to emit when it felt ready, so "ready" meant "has said enough
// to sound ready". This file is the list, in code, and nothing in it is a matter
// of opinion: each slot is either filled or it is not.
//
// ── TWO TIERS, BECAUSE ONE WOULD MAKE IT A FORM ──────────────────────
// He also said, this morning, that the chat asking a question it could have
// answered is the paperwork feeling that makes him stop reading. So:
//
//   blocking   a guide cannot honestly be built without it.
//   vague      known, but not precisely enough to be relied on. Worth one
//              question, never worth blocking. A month is the case this exists
//              for: it is enough to rule out a November convention and not
//              enough to say which Tuesday they land.
//
// ── AND WHERE A SLOT MAY BE READ FROM ────────────────────────────────
// The intake form, and THE TRAVELLER'S OWN TURNS. Never from Gemlyx's replies.
// previewMatch.js already holds this rule for interests and the reason is worth
// repeating: the app suggests things, so one sentence back from it reading
// "Copenhagen has excellent museums" would otherwise become evidence that the
// traveller asked for museums.
import { arrivalDateIn, dayCountIn, monthOnlyIn, daysBetween } from "./tripEvents";
import { dayStart } from "./calendarDay";

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const has = (v) => !!clean(v);

// ── THE SLOTS ───────────────────────────────────────────────────────
// One line each, in the order a person would naturally give them. `ask` is the
// question in Gemlyx's own voice, short, one thing at a time, because the whole
// complaint was the wall of text.
export const BRIEF_SLOTS = [
  { key: "origin", label: "where they start", tier: "blocking",
    ask: "Where are you flying into, or starting from?" },
  { key: "days", label: "how long", tier: "blocking",
    ask: "How many days have you got?" },
  { key: "when", label: "when", tier: "blocking",
    ask: "Which dates? Even roughly is fine, it decides which events are actually on." },
  { key: "party", label: "who is coming", tier: "blocking",
    ask: "Who is coming? Ages of any kids matter more than you would think." },
  { key: "interests", label: "what kind of trip", tier: "blocking",
    ask: "What kind of trip is this? Food, history, design, nature, nightlife, or something else entirely." },
  { key: "stay", label: "whether a hotel is booked", tier: "blocking",
    ask: "Have you booked somewhere to stay already? If you have, the whole plan should sit around it." },
  { key: "budget", label: "budget", tier: "optional",
    ask: "Roughly what are you happy to spend a day?" },
];

export const BLOCKING_SLOTS = BRIEF_SLOTS.filter(s => s.tier === "blocking").map(s => s.key);

// ── READERS, ONE PER SLOT ───────────────────────────────────────────
// Each returns a value or null. Every one of them is a fact about what was
// SAID, never an inference about what was meant.

// A month with no day is a real answer and an imprecise one. Both states are
// reported, because the difference is exactly what the event filter needs.
const readWhen = (text, intakeArrival, intakeDeparture, today) => {
  const from = dayStart(intakeArrival);
  const to = dayStart(intakeDeparture);
  if (from) return { value: from, precision: "day", source: "intake", end: to || null };
  const spokenDay = arrivalDateIn(text, today);
  if (spokenDay) return { value: spokenDay, precision: "day", source: "said", end: null };
  const month = monthOnlyIn(text, today);
  if (month) return { value: month.start, precision: "month", source: "said", end: month.end };
  return null;
};

const readDays = (text, intakeArrival, intakeDeparture) => {
  const both = daysBetween(intakeArrival, intakeDeparture);
  if (both && both > 0) return { value: both, source: "intake" };
  const spoken = dayCountIn(text);
  return spoken ? { value: spoken, source: "said" } : null;
};

// Deliberately narrow. An airport, a city, or "starting from" phrasing. A place
// name on its own is NOT read as an origin, because every trip names places and
// treating the first one as the arrival point is how a plan starts in the wrong
// half of the country.
const ORIGIN_RE = /\b(?:fly(?:ing)?|land(?:ing)?|arriv(?:e|ing)|com(?:e|ing)|start(?:ing)?|driv(?:e|ing))\s+(?:in|into|to|from|at)\b|\b(?:airport|lufthavn|kastrup|billund airport)\b/i;
const readOrigin = (text, intakeStartPoint) => {
  if (has(intakeStartPoint)) return { value: clean(intakeStartPoint), source: "intake" };
  return ORIGIN_RE.test(String(text || "")) ? { value: "said in the conversation", source: "said" } : null;
};

// Who is coming. A count, a family word, or the intake field. "2 kids and my
// wife" is the real shape of this answer and it carries no number for the adults,
// so the reader reports that somebody said something about the party rather than
// pretending to a headcount.
const PARTY_RE = /\b(?:kids?|children|child|toddler|baby|wife|husband|partner|girlfriend|boyfriend|family|friends?|solo|alone|just me|my (?:son|daughter|mum|mom|dad|parents)|\d+\s+(?:of us|people|adults?))\b/i;
const readParty = (text, intakeTravelers, familyMode) => {
  if (has(intakeTravelers)) return { value: clean(intakeTravelers), source: "intake" };
  if (familyMode) return { value: "family", source: "intake" };
  return PARTY_RE.test(String(text || "")) ? { value: "said in the conversation", source: "said" } : null;
};

// ── THE ONE THAT WAS NEVER ASKED AT ALL ─────────────────────────────
// Oliver: "we need to know if they have already ordered hotel or not. Because
// that is quite an important factor."
//
// It is the most structural fact in the whole brief. A booked hotel is a fixed
// point every day has to work around; no booking means the plan may move them
// and the Where to stay lines are worth writing. The conversation he read
// recommended a budget hostel to a family who had just said they had plenty of
// money, and it had no idea whether they had already booked anything.
const BOOKED_RE = /\b(?:already |we(?:'ve| have) )?(?:booked|reserved|got a (?:hotel|room|place)|staying at|airbnb (?:booked|sorted)|hotel is (?:booked|sorted))\b/i;
const NOT_BOOKED_RE = /\b(?:not (?:booked|yet)|nothing booked|no hotel|haven'?t booked|need (?:a hotel|somewhere)|looking for (?:a hotel|somewhere)|open to suggestions on (?:hotels?|where to stay))\b/i;
const readStay = (text, intakeStayBooked) => {
  if (intakeStayBooked === true) return { value: "booked", source: "intake" };
  if (intakeStayBooked === false) return { value: "not booked", source: "intake" };
  const s = String(text || "");
  // Not-booked is tested FIRST: "haven't booked" contains "booked".
  if (NOT_BOOKED_RE.test(s)) return { value: "not booked", source: "said" };
  if (BOOKED_RE.test(s)) return { value: "booked", source: "said" };
  return null;
};

// Interests. The intake tick boxes, or a theme word in their own turns. The
// vocabulary is deliberately the everyday one rather than the app's internal
// theme list, because this reads what a person typed.
// ── AND "KIDS" IS NOT AN INTEREST ───────────────────────────────────
// The first version of this list held "kids", "family" and "playground", and his
// own conversation opens with "going to Denmark in December with 2 kids and my
// wife". That filled the interests slot from a sentence about WHO IS COMING, so
// the bucket read as complete and the test asserting "it does NOT know what kind
// of trip this is" went red, which is exactly the failure he reported. Who is in
// the party is its own slot and it is read by its own reader.
const INTEREST_WORDS = [
  "food", "eat", "restaurant", "history", "historic", "viking", "museum", "design",
  "architecture", "nature", "hiking", "beach", "island", "nightlife", "bar",
  "beer", "art", "shopping", "castle", "cycling", "biking", "christmas market",
  "relax", "quiet", "photography", "music", "festival", "hygge", "spa",
];
const readInterests = (text, intakeInterest) => {
  const ticked = (Array.isArray(intakeInterest) ? intakeInterest : []).map(clean).filter(Boolean);
  if (ticked.length) return { value: ticked.join(", "), source: "intake" };
  const s = String(text || "").toLowerCase();
  const found = INTEREST_WORDS.filter(w => new RegExp(`\\b${w}`, "i").test(s));
  return found.length ? { value: found.slice(0, 6).join(", "), source: "said" } : null;
};

const BUDGET_RE = /\b(?:budget|cheap|tight|afford|splash|plenty of money|money is no|expensive|luxur|\d+\s*(?:dkk|kr|kroner|eur|usd|£|\$))\b/i;
const readBudget = (text, intakeBudgetText) => {
  if (has(intakeBudgetText)) return { value: clean(intakeBudgetText), source: "intake" };
  return BUDGET_RE.test(String(text || "")) ? { value: "said in the conversation", source: "said" } : null;
};

// ── THE WHOLE BRIEF, IN ONE OBJECT ──────────────────────────────────
// travellerText is THEIR turns joined, never the assistant's. The caller builds
// it; this file cannot tell whose words it was handed, and a comment is not a
// guard, so the parameter is named to make a mistake visible at the call site.
export const readBrief = ({ travellerText = "", intake = {}, today = new Date() } = {}) => {
  const t = String(travellerText || "");
  const known = {};
  const set = (key, res) => { if (res) known[key] = res; };

  set("origin", readOrigin(t, intake.startPoint));
  set("days", readDays(t, intake.arrival, intake.departure));
  set("when", readWhen(t, intake.arrival, intake.departure, today));
  set("party", readParty(t, intake.travelers, intake.familyMode));
  set("interests", readInterests(t, intake.interest));
  set("stay", readStay(t, intake.stayBooked));
  set("budget", readBudget(t, intake.budgetText));

  const missing = BRIEF_SLOTS.filter(s => s.tier === "blocking" && !known[s.key]).map(s => s.key);
  // Known, and not precisely enough. Only `when` can be vague today, and it is
  // the one that costs a wrong event.
  const vague = known.when?.precision === "month" ? ["when"] : [];
  return { known, missing, vague, ready: missing.length === 0 };
};

export const briefReady = (brief) => !!brief && brief.missing.length === 0;

// ── WHAT TO ASK NEXT, AND HOW MANY ──────────────────────────────────
// Two at a time, hard. The conversation he read asked three things in one
// paragraph twice, which is what made it a wall.
export const MAX_ASKS_AT_ONCE = 2;

export const nextAsks = (brief, { limit = MAX_ASKS_AT_ONCE } = {}) => {
  if (!brief) return [];
  const order = BRIEF_SLOTS.map(s => s.key);
  const pick = [...brief.missing, ...brief.vague].filter((k, i, a) => a.indexOf(k) === i);
  return pick
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .slice(0, Math.max(0, limit))
    .map(k => BRIEF_SLOTS.find(s => s.key === k))
    .filter(Boolean);
};

// ── THE BLOCK THE MODEL SEES ────────────────────────────────────────
// It states what is already known, so nothing is asked twice, which is the other
// half of his complaint: it asked about budget in two separate turns and asked
// "mix of both?" after being told.
export const briefBlock = (brief) => {
  if (!brief) return "";
  const lines = [];
  const knownKeys = BRIEF_SLOTS.filter(s => brief.known[s.key]);
  if (knownKeys.length) {
    lines.push("WHAT YOU ALREADY KNOW. Never ask about any of these again, in any wording:");
    knownKeys.forEach(s => {
      const k = brief.known[s.key];
      lines.push(`  ${s.label}: ${k.value}${k.source === "intake" ? " (from the form they filled in)" : ""}`);
    });
  }
  const asks = nextAsks(brief);
  if (!asks.length) {
    lines.push("YOU HAVE EVERYTHING YOU NEED. Do not ask another question. Say in one short line what you are about to plan, and offer to build it.");
    return lines.join("\n");
  }
  lines.push(`STILL MISSING, and you may ask for AT MOST ${MAX_ASKS_AT_ONCE} of them in this reply:`);
  asks.forEach(s => lines.push(`  ${s.label}: ${s.ask}`));
  if (brief.vague.includes("when")) {
    lines.push("They named a month but not a date. That is enough to rule out an event in another month and not enough to place a day, so ask for the dates once and never again.");
  }
  lines.push("ASK, DO NOT LECTURE. No preamble, no restating what they told you, no volunteering prices or opening dates nobody asked for. One short paragraph, then the question or questions.");
  return lines.join("\n");
};
