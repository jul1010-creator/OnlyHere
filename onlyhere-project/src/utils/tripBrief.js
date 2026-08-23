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
import { arrivalDateIn, dayCountIn, monthOnlyIn, latestRelativeAnswer, daysBetween } from "./tripEvents";
import { PARTY_BARE, PARTY_POSSESSIVE, PARTY_POSSESSIVES, PARTY_COUNT, alt, LETTER } from "./travellerWords";
import { dayStart } from "./calendarDay";
import { travelModeKey, withoutNonModes } from "./routeOrder";

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
  { key: "when", label: "when", tier: "blocking", hard: true,
    ask: "Which dates? Even roughly is fine, it decides which events are on while you are here." },
  { key: "party", label: "who is coming", tier: "blocking", hard: true,
    ask: "Who is coming? Ages of any kids matter more than you would think." },
  { key: "interests", label: "what kind of trip", tier: "blocking",
    ask: "What kind of trip is this? Food, history, design, nature, nightlife, or something else entirely." },
  { key: "transport", label: "how they get around", tier: "blocking",
    ask: "How are you getting around once you're here? Car, bike, trains and buses, or a mix of them." },
  { key: "stay", label: "whether a hotel is booked", tier: "blocking",
    ask: "Have you booked somewhere to stay already? If you have, the whole plan should sit around it." },
  { key: "budget", label: "budget", tier: "optional",
    ask: "Roughly what are you happy to spend a day?" },
];

export const BLOCKING_SLOTS = BRIEF_SLOTS.filter(s => s.tier === "blocking").map(s => s.key);

// ── AND TWO OF THEM ARE NOT SATISFIED BY HAVING BEEN ASKED ───────────
//
// Oliver, 21 Aug 2026, on a guide that had just been built: "I never said the
// dates to it. Despite it asking me. It assumed October. It cannot make a build
// without dates."
//
// He is describing `declined` below working exactly as written. Gemlyx asked for
// the dates, he answered a different question, the slot was recorded as ASKED,
// and asked-and-unanswered stops blocking. The guide then went out with a real
// weather forecast per day and an event on 9 October in it.
//
// This is the second time he has said it. 20 Aug, on the party slot: "it asked
// how many people we were, but I only answered arrival. It NEEDS to know how
// many and who they are. It cannot build a guide around a trip without knowing
// the people."
//
// So these two are HARD. Being asked does not satisfy them, and nothing builds
// until they are answered. The rest keep the old behaviour, which is right for
// them: a plan is still worth having when nobody said whether a hotel is booked.
//
// The reason `declined` exists is still real and is preserved: a hard slot that
// went unanswered does not get asked again immediately, it goes to the BACK of
// the queue (see nextAsks), so it is raised once everything else is settled
// rather than becoming a door the traveller cannot get past.
export const HARD_SLOTS = BRIEF_SLOTS.filter(s => s.hard).map(s => s.key);

// ── READERS, ONE PER SLOT ───────────────────────────────────────────
// Each returns a value or null. Every one of them is a fact about what was
// SAID, never an inference about what was meant.

// A month with no day is a real answer and an imprecise one. Both states are
// reported, because the difference is exactly what the event filter needs.
const readWhen = (text, turns, intakeArrival, intakeDeparture, today) => {
  const from = dayStart(intakeArrival);
  const to = dayStart(intakeDeparture);
  if (from) return { value: from, precision: "day", source: "intake", end: to || null };
  const spokenDay = arrivalDateIn(text, today);
  if (spokenDay) return { value: spokenDay, precision: "day", source: "said", end: null };
  const month = monthOnlyIn(text, today);
  if (month) return { value: month.start, precision: "month", source: "said", end: month.end };
  // ── AND "TODAY" IS AN ANSWER, WHEN THE TURN IS ONE ────────────────
  // 22 Aug 2026: his father answered this question with "today" and "7 days",
  // in Danish, and was asked again, because arrivalDateIn wants a day number
  // and an English month name and dayCountIn wanted the English word for a day.
  //
  // LAST, not before the month, and per TURN rather than over the whole
  // conversation. The first version ran relativeDayIn over every traveller turn
  // joined together and took anything it found, which read "talk tomorrow!" as
  // an arrival and beat a stated October with it. A month mention is nearly
  // always the trip; a time word in the middle of a sentence nearly never is.
  // relativeAnswerIn holds the other half of that rule: the turn has to be an
  // answer and not a sentence containing a date. See tripEvents.js.
  //
  // Latest qualifying turn wins, because a second answer supersedes a first.
  // Through latestRelativeAnswer, which tripWindow also calls, so the brief and
  // the event filter cannot disagree about which turn counted. Here the
  // newline split is safe and useful: `text` on this path is the traveller's
  // own turns and nothing of Gemlyx's.
  const list = Array.isArray(turns) ? turns : (text ? String(text).split("\n") : []);
  const rel = latestRelativeAnswer(list, today);
  return rel ? { value: rel.start, precision: "day", source: "said", end: rel.end } : null;
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
// A FERRY IS AN ARRIVAL. Added 17 Aug 2026 after replaying his own conversation:
// he opened with "I'm taking the ferry into Aalborg", Gemlyx's reply read it back
// correctly ("Ferry into Aalborg, nice, that's proper North Jutland arrival"), and
// this reader did not fill the slot, because the list held only flying, landing,
// arriving, coming, starting and driving. Denmark is reached by sea from Norway,
// Sweden and Germany constantly, and the arrival that is least like Copenhagen is
// exactly the one this missed.
// ── AND THE VEHICLE WORDS ONLY COUNT WITH "INTO" ─────────────────────
// Found 18 Aug 2026 by an adversarial review. Adding ferry/train/bus to the verb
// list also let "How long is the bus to Skagen from Aalborg?" and "Is the train to
// Odense expensive?" fill the origin slot — an ordinary question about getting
// around, satisfying the one slot the system prompt calls NON-NEGOTIABLE, so the
// gate stopped asking where the trip starts.
//
// The verbs (fly, land, arrive, come, start, drive) are already arrival language
// and keep their looser preposition set. The NOUNS are not: a bus is a bus whether
// you are arriving on one or asking what it costs, so they need "into", which is
// the word English uses for arriving somewhere. Same discriminator as
// utils/arrival.js, for the same reason, found by the same review.
const ORIGIN_RE = /\b(?:fly(?:ing)?|land(?:ing)?|arriv(?:e|ing)|com(?:e|ing)|start(?:ing)?|driv(?:e|ing))\s+(?:in|into|to|from|at)\b|\b(?:ferry|ferries|sail(?:ing)?|cruis(?:e|ing)|train|bus|coach)\s+into\b|\b(?:airport|lufthavn|kastrup|billund airport)\b/i;
const readOrigin = (text, intakeStartPoint) => {
  if (has(intakeStartPoint)) return { value: clean(intakeStartPoint), source: "intake" };
  return ORIGIN_RE.test(String(text || "")) ? { value: "said in the conversation", source: "said" } : null;
};

// Who is coming. A count, a family word, or the intake field. "2 kids and my
// wife" is the real shape of this answer and it carries no number for the adults,
// so the reader reports that somebody said something about the party rather than
// pretending to a headcount.
// ── AND IT ONLY EVER LISTENED IN ENGLISH ────────────────────────────
//
// 23 Aug 2026. This was `kids|children|wife|husband|family|friends|solo|alone`
// and nothing else, and `party` is a HARD slot: being asked does not satisfy
// it, and nothing builds until it is answered. So Oliver's father could answer
// "min kone og mig", watch Gemlyx reply in Danish about his wife, and be asked
// who was coming again, forever. The 22 August work taught `when` Danish and
// left this one exactly as it was, which is why he still could not reach a
// build the next morning.
//
// Three shapes, because people answer this three ways: a group word on its own
// ("familien", "alene", "vrienden"), a relation with its possessive ("min
// kone", "meine Frau"), and a headcount ("vi er 4", "4 Erwachsene"). The
// vocabulary is in travellerWords.js so adding a language is a list entry.
//
// THE POSSESSIVE IS NOT DECORATION. Bare "man" is husband in Danish, Swedish
// and Norwegian and also the impersonal pronoun in all three, so "man kan tage
// toget til Ribe" would otherwise report that he had said who was coming.
const PARTY_RE = new RegExp(
  `(?:^|[^${LETTER}])(?:` +
    `(?:${alt(PARTY_BARE)})` +
    `|(?:${alt(PARTY_POSSESSIVES)})\\s+(?:${alt(PARTY_POSSESSIVE)})` +
    `|(?:${PARTY_COUNT.join("|")})` +
  `)(?![${LETTER}])`, "i");
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
// ── AND "BOOKED" HAS TO BE ABOUT SOMEWHERE TO SLEEP ──────────────────
// Found 18 Aug 2026 by an adversarial review. This matched a bare "booked", so
// "We booked our flights already" and "Roskilde Festival is fully booked, sadly"
// both filled the hotel slot — and because the slot is BLOCKING and the brief block
// says "Never ask about any of these again, in any wording", the gate then refused
// to ask about a hotel that did not exist and anchored the plan on it. The most
// common sentence in travel chat, satisfying the slot he added specifically because
// "that is quite an important factor".
//
// A booking word now needs a place to sleep next to it, or the phrasing that can
// only be about lodging ("staying at", "we have a place"). Everything else is not
// an answer about accommodation, and not-an-answer is the honest state: the gate
// asks once and then stops (see `asked`), so a false positive costs a wrong plan
// while a miss costs one short question.
const SLEEPS = "hotel|hostel|room|rooms|place|places|apartment|flat|airbnb|bnb|b&b|guesthouse|guest house|kro|inn|cabin|cottage|campsite|camping spot|somewhere to stay|accommodation|lodging";
const BOOKED_RE = new RegExp(
  `\\b(?:book(?:ed)?|reserved|got|have|sorted)\\s+(?:a\\s+|an\\s+|our\\s+|the\\s+|my\\s+)?(?:${SLEEPS})\\b`
  + `|\\b(?:${SLEEPS})\\s+(?:is|are)\\s+(?:already\\s+)?(?:booked|sorted|reserved)\\b`
  + `|\\bstaying (?:at|in) (?:the|a|an)\\b`, "i");
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
//
// ── AND "HIDDEN GEMS" IS THE MOST OBVIOUS ONE THERE IS ──────────────
// Added 17 Aug 2026. He typed "I'd love to see some hidden gems!" and this filled
// nothing, on the one product whose stated differentiator is hidden gems. The list
// was written from the app's theme vocabulary and not from what a person types.
//
// "cycling" and "biking" came OUT for the same reason "kids" did. "I'm on a
// bicycle" is a sentence about HOW SOMEBODY GETS AROUND, and letting it fill the
// interests slot means a trip whose shape nobody ever stated reads as specified.
// Transport has its own slot below, and its own reader.
const INTEREST_WORDS = [
  "food", "eat", "restaurant", "history", "historic", "viking", "museum", "design",
  "architecture", "nature", "hiking", "beach", "island", "nightlife", "bar",
  "beer", "art", "shopping", "castle", "christmas market",
  "relax", "quiet", "photography", "music", "festival", "hygge", "spa",
  "hidden gem", "off the beaten", "local spot", "surf", "wildlife", "birdwatch",
];
const readInterests = (text, intakeInterest) => {
  const ticked = (Array.isArray(intakeInterest) ? intakeInterest : []).map(clean).filter(Boolean);
  if (ticked.length) return { value: ticked.join(", "), source: "intake" };
  const s = String(text || "").toLowerCase();
  // ── AND A PREFIX IS NOT A WORD ─────────────────────────────────────
  // Found 18 Aug 2026 by an adversarial review. This anchored the START of a word
  // and not the end, so "We are coming from Spain" filled the blocking interests
  // slot with "spa", and "we flew home via Barcelona" with "bar" — printed into the
  // brief block as "what kind of trip: spa", after which the gate stops asking. The
  // exact failure the slot exists to prevent, arriving through the reader.
  //
  // An ordinary English suffix is still the same interest ("eat"/"eating",
  // "castle"/"castles"), so those are allowed and nothing else is.
  const found = INTEREST_WORDS.filter(w => new RegExp(`\\b${w}(?:s|es|ing|ed)?\\b`, "i").test(s));
  return found.length ? { value: found.slice(0, 6).join(", "), source: "said" } : null;
};

// ── HOW THEY GET AROUND ─────────────────────────────────────────────
// Added 17 Aug 2026, and it is the slot his broken guide argues hardest for. The
// route it built put 92 km between the end of day one and the start of day two,
// with no journey written between them, for a man who had said he was on a
// bicycle; then the Where to stay line recommended a hotel with "easy bus access"
// to the next stop. The chat's own prompt has said all along that this must be
// known "before proposing a route, since it changes everything". It just was not
// on any list, so nothing checked.
//
// A MODE NEEDS A VERB. "The train museum" is not a statement about how somebody
// travels, and a bare mode word would fill this slot from a sentence about an
// attraction — the same mistake "kids" made in the interests list. So the pattern
// wants a movement or possession word next to the mode, or a word that can only
// be about travelling.
const TRANSPORT_RE = new RegExp([
  /\b(?:by|on|in|with|got|have|rent(?:ing|ed)?|hir(?:e|ing|ed)|tak(?:e|ing)|using)\s+(?:a\s+|an\s+|the\s+|my\s+|our\s+)?(?:car|bike|bicycle|cycle|train|bus|coach|camper(?:van)?|motorhome|scooter|foot)\b/.source,
  /\bpublic transport(?:ation)?\b/.source,
  /\bon foot\b/.source,
  /\b(?:cycling|biking|driving|walking|hitchhiking)\b/.source,
  // "no car" was an alternative here and is gone: the text is scrubbed of negations
  // before this pattern runs (withoutNonModes), so it could never match, and a
  // branch that cannot fire is reassurance rather than a rule.
  /\brental car\b/.source,
].join("|"), "i");
// `mode` is the folded key, and it is the field everything downstream actually
// wants: previewMatch will not offer a place 400 km away to somebody on a
// bicycle, and it cannot ask that question of the string "said in the
// conversation". travelModeKey is imported rather than rewritten here — a second
// copy of this vocabulary is how two parts of the app end up disagreeing about
// what a traveller said.
const readTransport = (text, intakeTransport) => {
  const ticked = (Array.isArray(intakeTransport) ? intakeTransport : []).map(clean).filter(Boolean);
  if (ticked.length) {
    const joined = ticked.join(", ");
    return { value: joined, mode: travelModeKey(joined), source: "intake" };
  }
  // ── SCRUBBED FIRST, AND A MODE OR NOTHING ──────────────────────────
  // Found 18 Aug 2026 by an adversarial review. Three sentences filled this
  // blocking slot wrongly: "we have no car" (which says they are NOT driving),
  // "we are not renting a car" (the negation sat outside the match), and "does the
  // hotel have a car park?" (a place, not a journey). Filling a blocking slot is
  // what stops the gate asking, so a false positive here means the trip is planned
  // on a mode nobody stated — and in the first two cases, on the opposite of what
  // they said.
  //
  // The same scrubber travelModeKey uses, on the text, BEFORE the pattern runs. And
  // the slot only fills when a real mode comes out of it: "we have no car" is a
  // true statement that names no mode, and not-a-mode is not an answer to "how are
  // you getting around".
  const said = withoutNonModes(text);
  if (!TRANSPORT_RE.test(said)) return null;
  // Read the mode from the SENTENCE that stated it, not from the whole
  // conversation: a message about a train museum three turns earlier must not
  // decide the mode of the trip. TRANSPORT_RE already requires a movement word
  // next to the mode, so its own match is the honest place to read from.
  const stated = (said.match(TRANSPORT_RE) || [])[0] || said;
  const mode = travelModeKey(stated);
  return mode ? { value: mode, mode, source: "said" } : null;
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
// ── AND A SLOT THAT WAS ASKED FOR IS NOT ASKED FOR AGAIN ─────────────
// `asked` is the slots Gemlyx has already put a question about, recorded at the
// call site from what this file told it to ask, never parsed back out of the
// model's own words.
//
// It exists because the strict version of this is worse than the bug. Nothing
// reads a bare "no" as an answer about a hotel booking, so a blocking slot with
// no answer would block forever: the traveller says no, the slot stays empty, and
// the button never appears again. That is the failure he already reported once
// ("perhaps it wasn't visible to him that he could click turn this into a guide")
// and it is a worse one than planning on a thin brief.
//
// So the obligation is the one he actually stated: "then it is Gemlyx'
// responsibility to ASK." Asked and unanswered is a third state. It does not
// block, it is never asked twice, and it is reported to the writer as an
// assumption rather than a fact, which is the honest way to carry a gap.
export const readBrief = ({ travellerText = "", travellerTurns = null, intake = {}, today = new Date(), asked = [] } = {}) => {
  const t = String(travellerText || "");
  // Turns, not the join, for anything that has to know whether ONE turn was an
  // answer. Falls back to splitting the join so every existing caller and every
  // existing assertion keeps working unchanged.
  const turns = Array.isArray(travellerTurns) ? travellerTurns : t.split("\n");
  const known = {};
  const set = (key, res) => { if (res) known[key] = res; };

  set("origin", readOrigin(t, intake.startPoint));
  set("days", readDays(t, intake.arrival, intake.departure));
  set("when", readWhen(t, turns, intake.arrival, intake.departure, today));
  set("party", readParty(t, intake.travelers, intake.familyMode));
  set("interests", readInterests(t, intake.interest));
  set("transport", readTransport(t, intake.transport));
  set("stay", readStay(t, intake.stayBooked));
  set("budget", readBudget(t, intake.budgetText));

  const wasAsked = new Set((Array.isArray(asked) ? asked : []).map(clean).filter(Boolean));
  const unfilled = BRIEF_SLOTS.filter(s => s.tier === "blocking" && !known[s.key]).map(s => s.key);
  const declined = unfilled.filter(k => wasAsked.has(k));
  const missing = unfilled.filter(k => !wasAsked.has(k));
  // Known, and not precisely enough. Only `when` can be vague today, and it is
  // the one that costs a wrong event.
  // ── AND ASKING DOES NOT SHARPEN A MONTH ───────────────────────────
  // This carried `&& !wasAsked.has("when")`, so a month-precision answer stopped
  // being reported as vague the moment the question had been asked. Oliver, 21
  // Aug 2026: "I only said October. It didn't know when in October." A month is
  // still a month after somebody has asked about it, and the guide built off it
  // dated eight days and pinned an event to one of them.
  //
  // TWO LISTS, because they answer two different questions. `vague` is what is
  // TRUE about the brief and never stops being true; `vagueToAsk` is what is
  // still worth a question, which asking once uses up. Folding them into one
  // was the bug: it let "we asked" quietly mean "it is precise now".
  const vague = known.when?.precision === "month" ? ["when"] : [];
  const vagueToAsk = vague.filter(k => !wasAsked.has(k));
  // Asked, unanswered, and required anyway. Kept apart from `missing` so the
  // asking cadence is unchanged and only the BUILD is gated.
  const unanswered = HARD_SLOTS.filter(k => !known[k] && wasAsked.has(k));
  return { known, missing, declined, vague, vagueToAsk, unanswered, ready: missing.length === 0 && unanswered.length === 0 };
};

export const briefReady = (brief) => !!brief && brief.missing.length === 0 && !(brief.unanswered || []).length;

// ── WHAT TO ASK NEXT, AND HOW MANY ──────────────────────────────────
// Two at a time, hard. The conversation he read asked three things in one
// paragraph twice, which is what made it a wall.
//
// ── AND THEN ONE, BECAUSE TWO IS STILL A FORM ───────────────────────
// Oliver, 21 Aug 2026, on a turn that asked when he was going and who was
// coming: "notice how it asked how many people we were, but I only answered
// arrival."
//
// That is what a person does with two questions in one paragraph. They answer
// the one they have an answer to. And the cost is not only the missing answer:
// the half they did not answer is recorded as ASKED (see `asked` below), so it
// stops blocking and is handed to the writer as an assumption. Two questions
// per turn is therefore a machine for turning one honest answer into one wrong
// assumption.
//
// One is also the shape of the conversation he wants. Asking one thing leaves
// room in the turn for something to be given back, which is the other half of
// the rule the chat prompt now carries: a turn that only asks is an intake
// form. Two questions fill a turn on their own and leave no room for it.
export const MAX_ASKS_AT_ONCE = 1;

export const nextAsks = (brief, { limit = MAX_ASKS_AT_ONCE } = {}) => {
  if (!brief) return [];
  const order = BRIEF_SLOTS.map(s => s.key);
  // Hard slots that were asked and not answered go LAST, so they are raised once
  // everything else is settled rather than blocking the conversation at the point
  // the traveller changed the subject.
  const pick = [...brief.missing, ...(brief.vagueToAsk || []), ...(brief.unanswered || [])].filter((k, i, a) => a.indexOf(k) === i);
  return pick
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .slice(0, Math.max(0, limit))
    .map(k => BRIEF_SLOTS.find(s => s.key === k))
    .filter(Boolean);
};

// ── AND A REFUSAL NOBODY CAN SEE IS A DEAD END ──────────────────────
//
// 22 Aug 2026. Oliver's father, using Gemlyx in Danish, was handed a plan that
// ended "Den er klar." and then nothing. He wrote back "der er ikke noget der
// er poppet op", and Gemlyx told him to press a button called "Turn this into a
// guide", by its English name, which was not on his screen.
//
// NOTHING WAS BROKEN. Every part worked as written. He never gave dates and
// never said who was coming, both HARD slots, so brief.ready was false, so
// App.jsx stripped the model's ready marker exactly as it is supposed to since
// "it cannot make a build without dates". What the code did not do was SAY SO.
// It removed Gemlyx's claim to be ready and put nothing in its place, which
// leaves somebody reading a finished-sounding plan with no button, no reason
// and no next step. A silent refusal is worse than a refusal.
//
// So the strip gets a voice, and the voice is the ask that was already written
// for that slot rather than a new sentence invented here. One question, because
// MAX_ASKS_AT_ONCE is 1 and the reason for that rule applies twice over to a
// traveller who has just been told a plan is ready.
//
// KNOWN LIMIT, written down rather than left to be discovered: this sentence is
// English, and the reply it is appended to is in the traveller's language. It
// is on the same list as the rest of the hardcoded strings. English and honest
// beats silent, so it ships now and gets translated with the others.
export const buildBlockedNote = (brief) => {
  const next = nextAsks(brief)[0];
  if (!next) return "";
  return `One thing first, and then I can build it: ${next.ask}`;
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
  // Asked, and they did not answer. Named so it is not asked again, and named as
  // an assumption so the reply does not speak as if it knew.
  // The hard ones are pulled out first: they are asked and unanswered too, and
  // the line above tells the model to assume, which is the one thing it must not
  // do with these.
  const hardOpen = BRIEF_SLOTS.filter(s => (brief.unanswered || []).includes(s.key));
  const declinedSlots = BRIEF_SLOTS.filter(s => (brief.declined || []).includes(s.key) && !(brief.unanswered || []).includes(s.key));
  if (declinedSlots.length) {
    lines.push("ALREADY ASKED AND NOT ANSWERED. Do not ask about these again. If one of them changes what you would plan, say out loud what you are assuming:");
    declinedSlots.forEach(s => lines.push(`  ${s.label}`));
  }
  // ── AND THESE TWO ARE NOT ASSUMED, EVER ───────────────────────────
  // "I never said the dates to it. Despite it asking me. It assumed October. It
  // cannot make a build without dates." The guide that came out of that carried
  // a weather forecast for every day and an event dated 9 October.
  if (hardOpen.length) {
    lines.push("ASKED, NOT ANSWERED, AND STILL REQUIRED. Nothing can be built until you have these, so do not assume a value, do not pick a likely one, and never say you are ready to build:");
    hardOpen.forEach(s => lines.push(`  ${s.label}: ${s.ask}`));
    lines.push("They changed the subject rather than refusing, so this is not a decline. Answer whatever they did ask, then come back to it once, plainly.");
  }
  const asks = nextAsks(brief);
  if (!asks.length) {
    lines.push("YOU HAVE EVERYTHING YOU NEED. Do not ask another question. Say in one short line what you are about to plan, and offer to build it.");
    return lines.join("\n");
  }
  lines.push(asks.length === 1
    ? "STILL MISSING. Ask for THIS ONE and nothing else in this reply, whatever else is missing:"
    : `STILL MISSING, and you may ask for AT MOST ${MAX_ASKS_AT_ONCE} of them in this reply:`);
  asks.forEach(s => lines.push(`  ${s.label}: ${s.ask}`));
  if ((brief.vagueToAsk || []).includes("when")) {
    lines.push("They named a month but not a date. That is enough to rule out an event in another month and not enough to place a day, so ask for the dates once and never again.");
  }
  // ── AND ASKING IS NOT THE WHOLE TURN ──────────────────────────────
  // The old line ended "One short paragraph, then the question or questions",
  // which describes a turn made entirely of asking. That is the intake form
  // Oliver read back on 21 August, and no ban on preamble fixes it, because the
  // problem is what the turn is FOR rather than how it is padded. See the turn
  // shape block in the chat prompt: one thing given, then one thing asked.
  lines.push("ASK, DO NOT LECTURE. No preamble, no restating what they told you, no explaining why you need the answer, and no volunteering prices or opening dates nobody asked for. Give one real thing first, then ask, then stop. The one real thing is about a PLACE they named, not a price band and not a budget: volunteering money at somebody who has not raised it is the lecture this rule exists to stop, and it does not become a gift by being first.");
  // ── AND DO NOT DECIDE THE THING YOU ARE ABOUT TO ASK ABOUT ────────
  //
  // Oliver, 20 Aug 2026, on a Copenhagen nightlife answer. It recommended the
  // bars, which was the question, and then wrote:
  //
  //   "Copenhagen covers your nightlife well on its own, so I wouldn't build a
  //    second city into the plan just for that side of things."
  //
  // and only after that:
  //
  //   "One thing before I map out the two bases properly: have you already
  //    booked anywhere to stay, in Copenhagen or elsewhere? If so I'll build the
  //    whole route around that instead of picking locations for you."
  //
  // His verdict: "I think it would have been better to ask." The answer to the
  // question asked was fine. Ruling out a second city was a routing decision
  // taken one sentence before admitting that the answer to the unasked question
  // would replace it. If they say they have booked a place in Aarhus, the
  // sentence about not building a second city was wrong when it was written, and
  // a traveller who reads it and stops there never finds that out.
  //
  // So the rule is narrow and it is not "say less": answer what they asked, in
  // full, and hold the decisions that the missing answer would overturn.
  lines.push("ANSWER WHAT THEY ASKED, THEN ASK. Do not settle anything that the question you are about to ask would change. Recommending places is answering. Deciding where they sleep, how many bases there are, which towns are in or out, or what the route looks like is not, while any of the above is still missing. If it would be a different plan depending on their answer, ask first and plan after.");
  return lines.join("\n");
};
