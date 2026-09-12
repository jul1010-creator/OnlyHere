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
import { arrivalDateIn, dateRangeIn, departureDateIn, dayCountIn, monthOnlyIn, latestRelativeAnswer, relativeAnswerIn, daysBetween, MAX_TRIP_DAYS } from "./tripEvents";
import { PARTY_BARE, PARTY_POSSESSIVE, PARTY_POSSESSIVES, PARTY_COUNT, TRAVEL_VERBS, FROM_WORDS, TRANSPORT_PREPS, VEHICLE_WORDS, TRANSPORT_VERBS, PUBLIC_TRANSPORT, alt, LETTER } from "./travellerWords";
import { dayStart } from "./calendarDay";
import { travelModeKey, withoutNonModes } from "./routeOrder";
import { directAnswers } from "./directAnswer";

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const has = (v) => !!clean(v);

// ── THE SLOTS ───────────────────────────────────────────────────────
// One line each, in the order a person would naturally give them. `ask` is the
// question in Gemlyx's own voice, short, one thing at a time, because the whole
// complaint was the wall of text.
// ── askDa, AND WHY ONE LANGUAGE AND NOT ALL OF THEM ──────────────────
//
// These asks are normally handed to the MODEL, which puts them into the
// traveller's own language along with everything else it was told. One of them
// is not: buildBlockedNote appends its sentence in code, after the reply, when
// Gemlyx has claimed to be ready and the brief disagrees. That sentence reached
// a Danish reader in English, which is recorded at the bottom of this file as a
// known limit shipped on 22 August.
//
// It is Danish that gets the second string, and only Danish, because Denmark is
// where this product is used and Danish is the one language in this repo that
// can be checked by the person who owns it. A machine translation into six more
// would be six sentences nobody here can read, which is how the awkward Danish
// in the rest of the product happened in the first place. Everything else falls
// back to `ask`, in English, which is the behaviour that shipped yesterday.
export const BRIEF_SLOTS = [
  { key: "origin", label: "where they start", tier: "blocking",
    ask: "Where are you flying into, or starting from?",
    askDa: "Hvor rejser du fra?" },
  { key: "days", label: "how long", tier: "blocking",
    ask: "How many days have you got?",
    askDa: "Hvor mange dage har du?" },
  { key: "when", label: "when", tier: "blocking", hard: true,
    ask: "Which dates? Even roughly is fine, it decides which events are on while you are here.",
    askDa: "Hvilke datoer rejser du? Cirka er fint, det afgør hvilke begivenheder der er noget af mens du er der.",
    reask: "I still have not got your dates in a form I can plan from. A day and a month does it: \"14 September\", or \"the 14th to the 17th\".",
    reaskDa: "Jeg har stadig ikke dine datoer i en form jeg kan planlægge ud fra. En dag og en måned er nok: \"14. september\", eller \"den 14. til den 17.\"." },
  { key: "party", label: "who is coming", tier: "blocking", hard: true,
    ask: "Who is coming? Ages of any kids matter more than you would think.",
    askDa: "Hvem skal med? Børns alder betyder mere for planen, end man skulle tro.",
    reask: "I still do not have who is coming. Just the number of adults and the ages of any children.",
    reaskDa: "Jeg mangler stadig, hvem der skal med. Bare antal voksne og alderen på eventuelle børn." },
  // ── AND THE THIRD ONE, WHICH IS WHY THIS FILE EXISTS ──────────────
  //
  // Oliver, 17 Aug 2026, the sentence this whole bucket was built from: "it
  // wrote a damn lot, and it didn't even know what I was interested in... It
  // didn't know what kind of trip we were looking for. Which is extremely poor
  // design."
  //
  // It was blocking and not HARD, so being asked once satisfied it and the build
  // went ahead on nothing. 12 Sep 2026 is what that costs: a family week with
  // children, an empty interests slot, and a preview themed on nightlife —
  // which GEMLYX had suggested, four turns earlier, and then planned around.
  // "No attractions, but a shit ton of night life for a family trip with kids?"
  //
  // Asked what to do about it he chose the same bar as dates and party: hard,
  // nothing builds until it is answered. A plan with no idea what kind of trip
  // it is will invent one, and an invented one is what he was looking at.
  //
  // THE DOOR HAS A HANDLE ON IT, which is the half that makes hard safe here.
  // "You pick" is an ANSWER, not silence, and directAnswer.js reads it as one,
  // so the traveller who wants Gemlyx to choose says so once and moves on. That
  // is the prompt's own rule about deciding for people who are unsure, made
  // reachable instead of blocked.
  { key: "interests", label: "what kind of trip", tier: "blocking", hard: true,
    ask: "What kind of trip is this? Food, history, design, nature, nightlife, or something else entirely.",
    askDa: "Hvad er det for en tur? Mad, historie, design, natur, natteliv eller noget helt andet.",
    reask: "I still do not know what kind of trip this is, and it decides the whole plan. Name one thing you are after, or say \"you pick\" and I will choose.",
    reaskDa: "Jeg ved stadig ikke, hvad det er for en tur, og det afgør hele planen. Nævn én ting, du er ude efter, eller sig \"du bestemmer\", så vælger jeg." },
  { key: "transport", label: "how they get around", tier: "blocking",
    ask: "How are you getting around once you're here? Car, bike, trains and buses, or a mix of them.",
    askDa: "Hvordan kommer du rundt undervejs? Bil, cykel, tog og bus, eller en blanding." },
  { key: "stay", label: "whether a hotel is booked", tier: "blocking",
    ask: "Have you booked somewhere to stay already? If you have, the whole plan should sit around it.",
    askDa: "Har du allerede booket et sted at bo? Hvis du har, bygger jeg hele planen op omkring det." },
  // ── AND A BOOKING WITH NO DATES IS NOT A FIXED POINT ──────────────
  //
  // Oliver, 12 Sep 2026, on his own ten-day guide: "It didn't ask what date I
  // booked it for. It just assumed it was the first day."
  //
  // He had written "We have booked a stay at \" 25hours Hotel Paper Island\"".
  // The stay slot filled with the word booked, which is everything that slot has
  // ever held, and the guide then checked him in on Day 1 at 16:00, recommended
  // somewhere different to sleep on Days 2 through 9, and still told him in WHAT
  // YOU PAY that he had "10 nights in the plan with no bed booked yet".
  //
  // The slot above already promises the right thing — "If you have, the whole
  // plan should sit around it" — and a plan cannot sit around a point with no
  // date on it. So this is the second half of that question, and it is asked
  // ONLY when there is a booking to ask about: `needs` is what makes a slot
  // conditional, and every slot without one applies to every trip, exactly as
  // before.
  { key: "stayWhen", label: "which nights the booking covers", tier: "blocking",
    needs: (known) => known?.stay?.value === "booked",
    ask: "Which nights does that booking cover? The whole trip, or only part of it?",
    askDa: "Hvilke nætter dækker den booking? Hele turen, eller kun en del af den?" },
  { key: "budget", label: "budget", tier: "optional",
    ask: "Roughly what are you happy to spend a day?",
    askDa: "Hvad vil du cirka bruge om dagen?" },
];

// ── EVERY TRIP NEEDS THESE, WHICH IS NOT THE SAME LIST ──────────────
//
// A conditional slot is blocking for the trips it applies to and does not
// exist for the rest, so it cannot be in the denominator of "how much of the
// brief is filled". With it counted, a traveller who has booked nothing was
// told they were six sevenths of the way through a seven-slot brief and shown
// 75% of an eight-slot one, for a question they were never going to be asked.
//
// So this stays the UNCONDITIONAL set, unchanged, and readBrief works out what
// actually applies to the trip in front of it.
export const BLOCKING_SLOTS = BRIEF_SLOTS.filter(s => s.tier === "blocking" && !s.needs).map(s => s.key);

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

// ── THE VALUE THAT MEANS "SOMETHING WAS SAID" AND NOTHING ELSE ──────
//
// Three readers produce it when they can tell that a subject came up and cannot
// tell what was said about it. It is an acknowledgement, not a fact, and nothing
// downstream can plan from it — which is why a direct answer is allowed to
// replace it and is allowed to replace nothing else.
//
// briefPanel.js holds the same string as ACKNOWLEDGED and reads it for the same
// reason. It is spelled once here rather than three times, so the two files can
// be checked against each other instead of hoping.
export const ACKNOWLEDGED_VALUE = "said in the conversation";

// ── READERS, ONE PER SLOT ───────────────────────────────────────────
// Each returns a value or null. Every one of them is a fact about what was
// SAID, never an inference about what was meant.

// A month with no day is a real answer and an imprecise one. Both states are
// reported, because the difference is exactly what the event filter needs.
const readWhen = (text, turns, intakeArrival, intakeDeparture, today) => {
  const from = dayStart(intakeArrival);
  const to = dayStart(intakeDeparture);
  if (from) return { value: from, precision: "day", source: "intake", end: to || null };
  // ── A RANGE ANSWERS THIS SLOT AND THE NEXT ONE ──────────────
  // Oliver, 12 Sep 2026, stuck: "I'm here the 14th till 17th" left `when` null,
  // so he was asked again and the brief could not finish. See dateRangeIn in
  // utils/tripEvents.js. Asked FIRST and kept whole, because the end is a fact
  // he stated and `end: null` on the line below threw it away even on the forms
  // that did parse.
  const spokenRange = dateRangeIn(text, today);
  if (spokenRange) return { value: spokenRange.start, precision: "day", source: "said", end: spokenRange.end };
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

const readDays = (text, intakeArrival, intakeDeparture, today = new Date(), turns = null) => {
  const both = daysBetween(intakeArrival, intakeDeparture);
  if (both && both > 0) return { value: both, source: "intake" };
  // ── THE LAST NUMBER THEY SAID, NOT THE FIRST ──────────────────────
  //
  // Oliver, 10 Sep 2026, on a guide built for nine days: he said nine at turn
  // 5, was told at turn 8 that his own dates were six, answered "It's 6 days.."
  // at turn 9, and the reply agreed with him. The brief held 9 to the end and
  // the guide was built for 9.
  //
  // dayCountIn scans and RETURNS ON THE FIRST MATCH, and the text it was handed
  // is every traveller turn joined together, so the first number anyone says is
  // the only number that can ever be read. A correction is unreachable by
  // construction.
  //
  // This file has already settled this argument once, three hundred lines down,
  // where a direct answer was overwriting a corrected one: "A correction is the
  // one thing the traveller most needs to land, and the override was quietly
  // eating them." That fix guarded the direct-answer path. The sentence path
  // still read first-wins, and this is the same rule reaching it.
  //
  // PER TURN, not per match. Last wins across the conversation, and inside one
  // turn dayCountIn's own first-match rule stands, so "2 days in Copenhagen and
  // 4 in Jutland" behaves exactly as it did rather than quietly becoming 4.
  //
  // WHAT THIS DOES NOT FIX, stated rather than papered over: a late sentence
  // that names days without being a trip length ("the festival runs 3 days")
  // now wins where before it was ignored. Both rules are wrong on that sentence
  // and only one of them is wrong on a correction, which is the common case and
  // the one that reaches the builder.
  // ── AND A STATED RANGE IS AN ANSWER TO THIS SLOT TOO ────────
  //
  // Oliver, 12 Sep 2026. He said "2 days" early, then "I'm here the 14th till
  // 17th", which is four. The brief held 2, because the count loop below runs
  // first and returns, so a range could never be reached on a conversation that
  // had ever named a number.
  //
  // THE RULE IS THE ONE THIS SLOT ALREADY HAS, applied across both kinds of
  // answer rather than only within one. The comment above is about exactly this:
  // he said nine, was corrected to six, and the brief kept nine, because a
  // correction was unreachable by construction. A first "2 days" outranking a
  // later pair of real dates is the same fault with the two readers swapped.
  //
  // WHICHEVER CAME LAST, by turn index. Not "dates always win": somebody who
  // gives dates and then says "actually just 2 days" has corrected themselves,
  // and the count is the correction. Within ONE turn the dates win, because two
  // stated endpoints are a harder fact than a number in the same breath.
  // ── AND "IN 2 DAYS" IS WHEN THEY LAND, NOT HOW LONG THEY STAY ─────
  //
  // Oliver, 12 Sep 2026. He said "3 days" at turn 5 and "I'm flying into
  // Denmark in 2 days" at turn 7, and the brief came out of that conversation
  // holding TWO days. Nobody had shortened the trip. dayCountIn sees a number
  // followed by a day word and cannot tell "for 2 days" from "in 2 days", so
  // an answer about WHEN quietly overwrote the answer about HOW LONG, and the
  // guide would have been built a day short with nothing on screen saying so.
  //
  // The discriminator is not a new one: relativeAnswerIn has already decided
  // whether this turn is an arrival, and when it is, it says which words it
  // read. Those words are taken out before the count is looked for, so the same
  // number cannot answer both slots, and the decision is made in exactly one
  // place rather than in two that can disagree.
  //
  // It removes ONLY what was matched. "I fly in in 2 days and we're staying 5"
  // still reads five, which a blanket skip of the turn would have lost.
  // And a sentence where "in 3 days" really is a length — "we want to see
  // Denmark in 3 days" — names no travelling, so relativeAnswerIn returns
  // nothing, nothing is removed, and the count stands.
  const said = Array.isArray(turns) && turns.length ? turns : [String(text || "")];
  let raw = null, rawAt = -1, span = null, spanAt = -1;
  for (let i = 0; i < said.length; i += 1) {
    const arrival = relativeAnswerIn(said[i], today);
    // CASE-INSENSITIVELY. relativeDayIn matches on a lowercased copy, so
    // `matched` comes back lowercase and a plain String.replace would miss
    // "In 2 days" at the start of a sentence and silently do nothing.
    const forCount = arrival && arrival.matched
      ? String(said[i]).replace(new RegExp(arrival.matched.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ")
      : said[i];
    const n = dayCountIn(forCount, { cap: Infinity });
    if (n) { raw = n; rawAt = i; }
    const r = dateRangeIn(said[i], today);
    if (r) {
      const len = Math.round((r.end - r.start) / 86400000) + 1;
      if (len > 0 && len <= MAX_TRIP_DAYS) { span = len; spanAt = i; }
    }
  }
  if (span !== null && spanAt >= rawAt) return { value: span, source: "said" };
  if (raw) {
    const value = Math.min(raw, MAX_TRIP_DAYS);
    return raw > value
      ? { value, source: "said", askedFor: raw }
      : { value, source: "said" };
  }
  // ── AND TWO DATES IN A SENTENCE ARE A LENGTH ──────────────────────
  // Oliver's test brief opened "flying into Billund on Thursday 8 October 2026
  // ... and out of Aalborg on Monday the 12th at 11:00", and this slot came back
  // empty. The next question Gemlyx would have asked him was "How many days have
  // you got?" — which he had answered twice in his first sentence.
  //
  // Counted INCLUSIVELY, the way a person counts a trip: in on the 8th, out on
  // the 12th, and they will tell you that is five days. daysBetween does the same
  // for the intake pickers above, so the two paths cannot disagree.
  // A range that lost the last-wins comparison above still answers this slot
  // when no count was ever spoken at all, which is the ordinary case: "I'm here
  // the 14th till 17th" and nothing else. departureDateIn below cannot reach it,
  // because that one needs a leaving word ("out of Aalborg on the 12th") and a
  // range has none.
  if (span !== null) return { value: span, source: "said" };
  const start = arrivalDateIn(text, today);
  const end = start ? departureDateIn(text, start) : null;
  if (start && end) {
    const span = Math.round((end - start) / 86400000) + 1;
    if (span > 0 && span <= 30) return { value: span, source: "said" };
  }
  return null;
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
// ── AND THEN IT ONLY EVER LISTENED IN ENGLISH ───────────────────────
//
// 23 Aug 2026. "jeg rejser fra Faxe by" filled nothing. The list was fly, land,
// arrive, come, start, drive, and Oliver's own transcript shows Gemlyx asking
// where he was starting from, being told, and asking again.
//
// TWO SHAPES ARE ADDED AND A THIRD IS DELIBERATELY NOT.
//
// A travel verb plus a from-word is unambiguous in every language on the list:
// "rejser fra", "fahre von", "vertrek uit", "driving from". Nothing that means
// "leaving X" can mean anything else.
//
// The arrival verbs get their own short list with "til" and "i", because
// "flyver til Billund" and "lander i Kastrup" are how a Dane says where the
// trip starts. `kommer` is NOT on it, on purpose: "det kommer i august" is an
// ordinary sentence about anything at all, and filling a blocking slot from it
// would stop the gate asking the one question it must ask.
//
// A bare place name is still not an origin, which is the rule this reader was
// built around and the reason it stays narrow.
const ORIGIN_TRAVEL = alt(TRAVEL_VERBS.filter(w => !w.includes(" ")));
const ORIGIN_FROM = alt(FROM_WORDS);
const ORIGIN_RE = new RegExp([
  /\b(?:fly(?:ing)?|land(?:ing)?|arriv(?:e|ing)|com(?:e|ing)|start(?:ing)?|driv(?:e|ing))\s+(?:in|into|to|from|at)\b/.source,
  `(?:^|[^${LETTER}])(?:${ORIGIN_TRAVEL})\\s+(?:${ORIGIN_FROM})(?![${LETTER}])`,
  `(?:^|[^${LETTER}])(?:flyver|flyve|lander|lande|ankommer|ankomme|sejler|sejle|fliege|fliegen|fliegt|vlieg|vliegen)\\s+(?:til|i|fra|in|naar|naar|nach|aus)(?![${LETTER}])`,
  /\b(?:ferry|ferries|sail(?:ing)?|cruis(?:e|ing)|train|bus|coach)\s+into\b/.source,
  /\b(?:airport|lufthavn|kastrup|billund airport)\b/.source,
].join("|"), "i");
const readOrigin = (text, intakeStartPoint) => {
  if (has(intakeStartPoint)) return { value: clean(intakeStartPoint), source: "intake" };
  return ORIGIN_RE.test(String(text || "")) ? { value: ACKNOWLEDGED_VALUE, source: "said" } : null;
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
  return PARTY_RE.test(String(text || "")) ? { value: ACKNOWLEDGED_VALUE, source: "said" } : null;
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
// ── AND A HOTEL NAMES ITSELF BEFORE IT IS BOOKED ────────────────────
//
// 26 Aug 2026. "We have 71 Nyhavn Hotel booked for the first two nights" filled
// nothing, on a BLOCKING slot, and the next question would have been "have you
// booked somewhere to stay already?"
//
// Every branch here wanted the booking word BEFORE the sleep word — "booked a
// hotel", "hotel is booked" — and the way a person naturally writes it puts the
// NAME in between: "<name> Hotel booked". Two words apart, in the wrong order,
// and the whole sentence was invisible.
//
// The new branch allows a name of up to four words between them, which is what a
// Danish hotel name actually is, and still requires both halves so an ordinary
// "the hotel" cannot fill it on its own.
const BOOKED_RE = new RegExp(
  `\\b(?:book(?:ed)?|reserved|got|have|sorted)\\s+(?:a\\s+|an\\s+|our\\s+|the\\s+|my\\s+)?(?:${SLEEPS})\\b`
  + `|\\b(?:${SLEEPS})\\s+(?:is|are)\\s+(?:already\\s+)?(?:booked|sorted|reserved)\\b`
  + `|\\b(?:${SLEEPS})\\s+(?:booked|reserved|sorted)\\b`
  + `|\\b(?:book(?:ed)?|reserved|got|have)\\s+(?:[\\wÆØÅæøå'’-]+\\s+){0,4}(?:${SLEEPS})\\s+(?:booked|reserved|sorted)\\b`
  + `|\\bstaying (?:at|in) (?:the|a|an)\\b`
  // ── AND THE SENTENCE THAT STARTED ALL OF THIS FILLED NOTHING ─────
  //
  // Oliver, 12 Sep 2026, first message of the conversation that produced the
  // ten-day guide: "We have booked a stay at \" 25hours Hotel Paper Island\"".
  //
  // Not one branch above it matched. "stay" is not in SLEEPS on its own — the
  // list has "somewhere to stay" — and the name sits behind a quote mark, so
  // even the four-word-name branch added on 26 August could not reach it. The
  // most structural fact in the brief, written in the plainest possible words,
  // read as nothing at all, and every downstream failure he reported that night
  // followed from it.
  //
  // Two more branches, both narrow. A COMPLETED booking verb with "a stay" or a
  // count of nights after it; and a completed booking verb anywhere in a
  // sentence that also names a property, which namedStayIn already identifies
  // by the same two signals the interests reader uses to throw it away.
  //
  // COMPLETED forms only, never a bare "book": "I want to book somewhere like
  // the Admiral Hotel" is a sentence about an intention, and reading it as a
  // booking is the false positive this slot cannot afford.
  + `|\\b(?:book(?:ed)?|reserved)\\s+(?:a\\s+|our\\s+|the\\s+|my\\s+)?(?:stay|\\d+\\s+nights?|nights?)\\b`, "i");
const BOOKED_DONE = /\b(?:booked|reserved|sorted|staying)\b/i;
const NOT_BOOKED_RE = /\b(?:not (?:booked|yet)|nothing booked|no hotel|haven'?t booked|need (?:a hotel|somewhere)|looking for (?:a hotel|somewhere)|open to suggestions on (?:hotels?|where to stay))\b/i;
const readStay = (text, intakeStayBooked) => {
  if (intakeStayBooked === true) return { value: "booked", source: "intake" };
  if (intakeStayBooked === false) return { value: "not booked", source: "intake" };
  const s = String(text || "");
  // Not-booked is tested FIRST: "haven't booked" contains "booked".
  if (NOT_BOOKED_RE.test(s)) return { value: "not booked", source: "said" };
  if (BOOKED_RE.test(s)) return { value: "booked", source: "said" };
  // A completed booking verb and a named property in the same text. The name is
  // found by namedStayIn, which is the same reader that takes it OUT of the
  // interests slot, so a run of words is a hotel in both directions or in
  // neither. Last, because it is the widest.
  if (BOOKED_DONE.test(s) && namedStayIn(s)) return { value: "booked", source: "said" };
  return null;
};

// ── WHICH NIGHTS THE BOOKING COVERS ─────────────────────────────────
//
// Three shapes, and no fourth. A traveller answering "which nights does that
// booking cover?" says the whole trip, says the first or last few, or gives the
// dates. Anything else stays UNREAD and the slot stays open, which is the point:
// the failure being fixed here is an assumption, so a reader that guesses when
// it is unsure is the same bug wearing a different hat.
//
// "for 3 nights" is deliberately NOT read. It says how many and not which, and
// a three-night booking on a ten-day trip could start on any of eight days.
// Reading it as the first three is precisely what Gemlyx already did.
//
// ── AND IT HAS TO BE THE SENTENCE ABOUT THE HOTEL ───────────────────
//
// "The whole trip is about food" contains every word WHOLE_TRIP looks for, and
// filling a blocking slot off it would be this file's oldest bug — "spa" out of
// "Spain", "island" out of "Paper Island". So a span is only read out of a
// sentence that is also about somewhere to sleep, unless the traveller is
// answering this exact question, where the whole sentence is the answer.
const WORD_COUNT = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const countOf = (s) => {
  const t = String(s || "").trim().toLowerCase();
  if (WORD_COUNT[t]) return WORD_COUNT[t];
  const n = parseInt(t, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const WHOLE_TRIP = /\b(?:whole|entire|full)\s+(?:trip|stay|time|holiday|visit|week|thing)\b|\ball\s+(?:of\s+)?(?:the\s+)?(?:trip|stay|time|nights)\b|\ball\s+\d+\s+nights\b|\bevery\s+night\b|\bhele\s+(?:turen|tiden|opholdet)\b/i;
const FIRST_RUN = /\bfirst\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+nights?\b|\b(first)\s+night\b/i;
const LAST_RUN = /\blast\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+nights?\b|\b(last)\s+night\b/i;
// A booking word, a place to sleep, or the act of arriving at one. Wider than
// BOOKED_RE on purpose: that one has to decide whether a booking EXISTS, which
// is a claim; this one only has to decide whether a sentence is on the subject.
const BOOKING_TALK = new RegExp(`\\b(?:book(?:ed|ing)?|reserved|reservation|check[\\s-]?in|checking\\s+in|nights?|${SLEEPS})\\b`, "i");

// A DIRECT ANSWER DROPS THE NOUN. Asked "which nights does that booking cover?"
// a person replies "the whole trip", "just the first two", "all of it" — and
// "the first two" has no "nights" in it because the question supplied it. The
// bare forms are reachable ONLY from a direct answer, because "the first two"
// in open prose is about anything at all.
const WHOLE_TRIP_BARE = /\ball\s+of\s+(?:it|them)\b|\bthe\s+lot\b|\bevery\s+one\b|\bthe\s+whole\s+lot\b/i;
const FIRST_BARE = /\bfirst\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i;
const LAST_BARE = /\blast\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i;

const spanIn = (sentence, direct = false) => {
  if (WHOLE_TRIP.test(sentence) || (direct && WHOLE_TRIP_BARE.test(sentence))) return { value: "the whole trip", all: true, nights: null };
  const f = FIRST_RUN.exec(sentence) || (direct ? FIRST_BARE.exec(sentence) : null);
  if (f) {
    const n = f[2] ? 1 : countOf(f[1]);
    if (n) return { value: n === 1 ? "the first night" : `the first ${n} nights`, all: false, nights: Array.from({ length: n }, (_, i) => i + 1) };
  }
  const l = LAST_RUN.exec(sentence) || (direct ? LAST_BARE.exec(sentence) : null);
  if (l) {
    const n = l[2] ? 1 : countOf(l[1]);
    // Counted BACK from the end of the trip, which nothing here knows yet, so it
    // is carried as a count and resolved by bookedDayNumbers against the real
    // day count. A trip whose length changes later must not keep the old nights.
    if (n) return { value: n === 1 ? "the last night" : `the last ${n} nights`, all: false, nights: null, fromEnd: n };
  }
  return null;
};

// ── AND A DANE SAYS WHICH NIGHTS BY NAMING THE DAYS ─────────────────
//
// From the intake brief the suite has run since 10 September: "We've already
// booked Hotel Phønix in Aalborg for the Saturday and Sunday nights, so those
// two are fixed." That is a person telling you exactly which nights, in the way
// people actually tell you, and it is worthless to a plan until it is day
// numbers.
//
// It needs the arrival date, so it lives here rather than in spanIn, which is
// the half that works without one.
//
// THE WEEKDAY MUST BE WEARING THE WORD "NIGHT". A sentence can hold both a
// booking and a flight — "we booked the hotel, we land Thursday" — and reading
// the arrival as a booked night would be worse than reading nothing. So the run
// of weekday names has to END in "night" or "nights", which is how somebody
// says which nights and is not how they say when they land.
const DAY_WORD = "(?:mon|tues|wednes|thurs|fri|satur|sun)day";
// DOUBLE backslashes, because this is a TEMPLATE LITERAL: \\s reaches the
// regex as \s, while a single \b would reach it as an actual backspace and
// the pattern would then require one. BOOKING_TALK above is written the same
// way for the same reason.
const NIGHT_RUN = new RegExp(`(${DAY_WORD}(?:\\s*(?:,|and|&|to|until|till|[-\u2013\u2014])\\s*${DAY_WORD})*)\\s+nights?\\b`, "i");
const WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
// A range word rather than a list word means every night between the two, which
// is what "Friday to Sunday nights" means and "Friday and Sunday nights" does
// not.
const RANGE_WORD = /\b(?:to|until|till)\b|[-\u2013\u2014]/i;

const weekdayNights = (sentence, arrival) => {
  const m = NIGHT_RUN.exec(sentence);
  if (!m || !arrival) return null;
  const run = m[1];
  const names = (run.match(new RegExp(DAY_WORD, "gi")) || []).map(x => x.toLowerCase());
  if (!names.length) return null;
  // The FIRST occurrence of each weekday on or after the arrival day. Inside a
  // week every weekday happens once, so this is unambiguous for any trip and is
  // the only sane reading of a longer one: somebody saying "the Saturday" on a
  // sixteen-day trip means the one coming, not the second.
  const start = new Date(arrival.getFullYear(), arrival.getMonth(), arrival.getDate());
  const dayFor = (name) => {
    const want = WEEK.indexOf(name);
    if (want < 0) return null;
    const shift = (want - start.getDay() + 7) % 7;
    return shift + 1;
  };
  let nights = names.map(dayFor).filter(n => n != null);
  if (!nights.length) return null;
  if (nights.length > 1 && RANGE_WORD.test(run)) {
    const lo = Math.min(...nights), hi = Math.max(...nights);
    nights = [];
    for (let d = lo; d <= hi; d += 1) nights.push(d);
  }
  nights = [...new Set(nights)].sort((a, b) => a - b);
  const label = names.map(n => n[0].toUpperCase() + n.slice(1)).join(RANGE_WORD.test(run) ? " to " : " and ");
  return { value: `the ${label} night${nights.length === 1 ? "" : "s"}`, all: false, nights };
};

export const readStayNights = (text, { arrival = null, today = new Date(), direct = false } = {}) => {
  const s = String(text || "");
  if (!s.trim()) return null;
  // A direct answer to this question is an answer whatever it looks like, so the
  // on-the-subject guard is dropped for it and the sentence is read whole.
  const parts = direct ? [s] : s.split(/(?<=[.!?\n])\s+/);
  // ── LAST WINS, WHICH IS readDays' RULE AND FOR ITS REASON ─────────
  //
  // "We booked the whole trip. Actually we only booked the first two nights."
  // A reader that returns the first hit answers with the sentence the traveller
  // has just corrected, and readDays in this file learned the same lesson in
  // August: a correction is the single thing a traveller most needs to land,
  // and the earlier answer is the one they are trying to get rid of.
  let hit = null;
  for (const sentence of parts) {
    if (!direct && !BOOKING_TALK.test(sentence)) continue;
    const span = spanIn(sentence, direct);
    if (span) { hit = { ...span, source: "said" }; continue; }
    // Named days of the week, which is how somebody tells you which nights they
    // have without ever writing a date.
    const named = weekdayNights(sentence, arrival);
    if (named) { hit = { ...named, source: "said" }; continue; }
    // The dates themselves. dateRangeIn is the same reader the `when` slot uses,
    // so "the 14th till 17th" means the same thing in both questions.
    const range = arrival ? dateRangeIn(sentence, today) : null;
    if (range?.start) {
      const from = daysBetween(arrival, range.start);
      const to = range.end ? daysBetween(arrival, range.end) : from;
      // daysBetween is INCLUSIVE — daysBetween(x, x) is 1 — so it already
      // answers "which day of the trip is this", and the first draft added one
      // on top. "Booked from the 14th till the 16th" on a trip arriving the
      // 14th came back as nights 2 to 4. The suite caught it.
      if (from != null && to != null && from >= 1 && to >= from && to - from < MAX_TRIP_DAYS) {
        const nights = [];
        for (let d = from; d <= to; d += 1) nights.push(d);
        hit = { value: nights.length === 1 ? `night ${nights[0]}` : `nights ${nights[0]} to ${nights[nights.length - 1]}`, all: false, nights, source: "said" };
      }
    }
  }
  return hit;
};

// ── AND THE DAY NUMBERS, ONCE THE TRIP HAS A LENGTH ─────────────────
//
// "The whole trip" and "the last two nights" are both answers that only become
// day numbers when the number of days is final, and the number of days moves:
// it is a blocking slot of its own, and the traveller can change it in the next
// sentence. So the slot stores what they SAID and this resolves it, at the
// point of use, against the plan that actually exists.
export const bookedDayNumbers = (stayWhen, dayCount) => {
  const n = Math.max(0, Math.floor(Number(dayCount) || 0));
  if (!stayWhen || !n) return [];
  if (stayWhen.all) return Array.from({ length: n }, (_, i) => i + 1);
  if (stayWhen.fromEnd) {
    const take = Math.min(stayWhen.fromEnd, n);
    return Array.from({ length: take }, (_, i) => n - take + i + 1);
  }
  return (Array.isArray(stayWhen.nights) ? stayWhen.nights : []).filter(d => d >= 1 && d <= n);
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
// ── AND A THEME THEY DO NOT WANT IS NOT A THEME ─────────────────────
//
// Found 5 Sep 2026 by an adversarial review. "I don't want to do museums or
// castles, none of that" filled this blocking slot with `museum, castle`, and
// "definitely not nature, we hate hiking" filled it with `nature, hiking`. The
// brief block then prints them under "Never ask about any of these again", so the
// trip is built around the two things the traveller opened by refusing.
//
// readTransport has had this guard since 18 August — withoutNonModes, because "we
// have no car" says they are NOT driving. Interests never got one, and it is the
// same class of error with a worse outcome: a wrong mode makes the days too long,
// a wrong theme makes the whole guide about the wrong thing.
//
// THE SCOPE ENDS AT A CONTRAST WORD, not only at a full stop. "not nature, but
// food and history" is one sentence holding a refusal and an answer, and a
// scrubber that ran to the end of it would throw away the half that was the
// answer.
const NOT_WANTED = new RegExp(
  "\\b(?:no|not|don'?t|doesn'?t|won'?t|can'?t|never|hate|hates|hating|avoid|skip|forget|rather not|not into|no interest in|ikke|hader|nicht|kein(?:e|en)?|hasse|geen|haat)\\b" +
  // ── AND IT STOPS AT A COMMA ─────────────────────────────────────
  // Found 5 Sep by an adversarial review. Running to the full stop swallowed the
  // answer in "No problem, we love food and history" and "Skip Copenhagen, we
  // want nature and food" — a blocking slot sent to `declined` on a plain
  // answer, which is the same failure this whole night is about. A refusal is a
  // clause, and a clause ends at a comma.
  "(?:(?!\\b(?:but|though|however|instead|rather|men|dog|aber|sondern|maar)\\b)[^.,;:!?]){0,48}",
  "gi");
// ── AND SOME REFUSALS COME AFTER THE THING ──────────────────────────
// "christmas markets bore us", "museums are not for me", "hiking, hated it".
// The forward scrub cannot see these: the theme is said first and the verdict
// second. Same window, same punctuation stops, running the other way.
const REFUSED_AFTER = new RegExp(
  // No word appears in both lists. A word in both would be matched by whichever
  // scrub ran first and would take the wrong half of the sentence with it: "we
  // hate hiking" is a forward refusal and "hiking, hated it" is a backward one,
  // and one pattern cannot be both.
  "(?:(?![.,;:!?])[^.,;:!?]){0,48}\\b(?:bores?|bored|boring|isn'?t for (?:me|us)|are not for (?:me|us)|not for (?:me|us)|no thanks|keder|langweilig)\\b",
  "gi");
// Backward first: a post-position verdict names the theme in front of it, and a
// forward scrub reaching that verdict would delete the verdict and leave the
// theme standing.
export const withoutRefused = (text) =>
  String(text || "").replace(REFUSED_AFTER, " ").replace(NOT_WANTED, " ");

// ── AND A WORD INSIDE A HOTEL NAME IS NOT AN INTEREST ──────────
//
// Oliver, 12 Sep 2026: "it also went bananas with 'islands'." He never asked for
// islands. He said:
//
//   We have booked a stay at " 25hours Hotel Paper Island"
//
// "Island" is in INTEREST_WORDS, it matched as a whole word, and the blocking
// interests slot filled with "island". The chat then wrote "Given you mentioned
// wanting an island-focused trip", the preview picked Ærøskøbing, and the finished
// guide came out titled "Copenhagen, Kids & the Islands: Ten Days Across
// Zealand". A ten day trip was rebuilt around the name of his hotel.
//
// His own diagnosis, in the document he sent: "I think it misunderstood that the
// hotel was an actual hotel."
//
// THE COMMENT ABOVE THIS FUNCTION IS ABOUT THE SAME CLASS OF BUG, fixed on
// 18 Aug: "spa" out of "Spain", "bar" out of "Barcelona". That one was a prefix
// and was fixed by anchoring the end of the word. This one IS a whole word, and
// no amount of anchoring reaches it, because the word is real and the sentence
// is simply not about it.
//
// WHAT SEPARATES THEM IS THAT A NAME IS A NAME. Two signals, and both are the
// traveller's own writing rather than a guess:
//
//   QUOTES.  He typed them. Somebody quoting a phrase is naming a thing, not
//     describing what they like. Anything in quotes is out.
//   A CAPITALISED RUN HOLDING A LODGING WORD.  "25hours Hotel Paper Island" is
//     a proper noun with "Hotel" inside it. "Staying at the Island Hotel" is
//     the same shape. "I want to see the islands" is not a run at all and is
//     untouched, which is the case this must not break.
//
// STRIPPED BEFORE THE LOWERCASE, which is why this function no longer lowercases
// on its first line: capitalisation is the evidence, and the old order threw it
// away before anything could read it.
const LODGING_WORD = /\b(?:hotel|hostel|motel|inn|apartments?|aparthotel|b&b|bed\s*&\s*breakfast|guesthouse|airbnb|resort|kro|vandrerhjem|badehotel|pension|camping|cabin|hytte)\b/i;
// A run of names: tokens that start with a capital or a digit, joined by spaces
// and the small words a property name carries. Two tokens minimum, so a single
// capitalised word at the start of a sentence is never a "name".
const NAME_RUN = /\b(?:[A-Z\u00c0-\u00de][\w\u00c0-\u00ff&'.-]*|\d+[a-z]*)(?:\s+(?:of|the|by|at|on|og|paa|p\u00e5)\s+|\s+)(?:[A-Z\u00c0-\u00de][\w\u00c0-\u00ff&'.-]*|\d+[a-z]*)(?:(?:\s+(?:of|the|by|at|on|og|paa|p\u00e5)\s+|\s+)(?:[A-Z\u00c0-\u00de][\w\u00c0-\u00ff&'.-]*|\d+[a-z]*))*/g;

export const withoutNamedStay = (text) => {
  // Quotes first, straight and curly, single and double. A quoted phrase is a
  // name being reported, whatever it happens to contain.
  let s = String(text || "").replace(/["\u201c\u201d\u00ab\u00bb][^"\u201c\u201d\u00ab\u00bb\n]{0,120}["\u201c\u201d\u00ab\u00bb]/g, " ")
    .replace(/[\u2018\u2019][^\u2018\u2019\n]{0,120}[\u2018\u2019]/g, " ");
  // Then any capitalised run that carries a lodging word. Only the run goes, so
  // the rest of the sentence still speaks for itself.
  s = s.replace(NAME_RUN, (run) => (LODGING_WORD.test(run) ? " " : run));
  return s;
};

// ── AND THE SAME TWO SIGNALS, READ FORWARDS ─────────────────────────
//
// withoutNamedStay throws the name away because the interests reader must not
// see it. Everything downstream of the booking wants the opposite: the guide
// writer has to be told what they booked by name, or it recommends somewhere
// else on top of it. One definition of "this run of words is a property name",
// read in both directions, rather than two lists that drift.
//
// The quoted branch is checked for a lodging word too. He typed
// `" 25hours Hotel Paper Island"`, and quotes alone would also return the title
// of a festival or a dish — a quoted phrase is a name being reported, and only
// some names are somewhere to sleep.
export const namedStayIn = (text) => {
  const s = String(text || "");
  const quoted = s.match(/["\u201c\u201d\u00ab\u00bb]([^"\u201c\u201d\u00ab\u00bb\n]{0,120})["\u201c\u201d\u00ab\u00bb]/g) || [];
  for (const q of quoted) {
    const inner = q.slice(1, -1).trim();
    if (inner && LODGING_WORD.test(inner)) return inner;
  }
  NAME_RUN.lastIndex = 0;
  const runs = s.match(NAME_RUN) || [];
  const hit = runs.find(r => LODGING_WORD.test(r));
  return hit ? hit.trim() : "";
};

const readInterests = (text, intakeInterest) => {
  const ticked = (Array.isArray(intakeInterest) ? intakeInterest : []).map(clean).filter(Boolean);
  if (ticked.length) return { value: ticked.join(", "), source: "intake" };
  const s = withoutRefused(withoutNamedStay(String(text || "")).toLowerCase());
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
// ── AND THIS ONE ONLY LISTENED IN ENGLISH TOO ───────────────────────
//
// "jeg kører i bil" filled nothing, on the turn immediately after Gemlyx asked
// how he was getting around. Three shapes, because a mode is answered three
// ways: a preposition and a vehicle ("i bil", "med toget", "by car"), a verb on
// its own ("cykler", "driving"), or the words for public transport.
//
// THE DEFINITE FORMS ARE NOT OPTIONAL. Danish glues the article on: bil becomes
// bilen, tog becomes toget, cykel becomes cyklen. A vehicle list without them
// reads "med toget" as no answer at all.
const TR_PREP = alt(TRANSPORT_PREPS);
const TR_ART = "(?:a|an|the|my|our|en|et|den|det|min|mit|vores|dem|der|das|einem|einer|de|het|een)\\s+";
const TRANSPORT_RE = new RegExp([
  /\b(?:by|on|in|with|got|have|rent(?:ing|ed)?|hir(?:e|ing|ed)|tak(?:e|ing)|using)\s+(?:a\s+|an\s+|the\s+|my\s+|our\s+)?(?:car|bike|bicycle|cycle|train|bus|coach|camper(?:van)?|motorhome|scooter|foot)\b/.source,
  `(?:^|[^${LETTER}])(?:${TR_PREP})\\s+(?:${TR_ART})?(?:${alt(VEHICLE_WORDS)})(?![${LETTER}])`,
  `(?:^|[^${LETTER}])(?:${alt(TRANSPORT_VERBS)})(?![${LETTER}])`,
  `(?:^|[^${LETTER}])(?:${alt(PUBLIC_TRANSPORT)})(?![${LETTER}])`,
  /\bpublic transport(?:ation)?\b/.source,
  /\bon foot\b/.source,
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
  return BUDGET_RE.test(String(text || "")) ? { value: ACKNOWLEDGED_VALUE, source: "said" } : null;
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
export const readBrief = ({ travellerText = "", travellerTurns = null, intake = {}, today = new Date(), asked = [], answering = null } = {}) => {
  const t = String(travellerText || "");
  // Turns, not the join, for anything that has to know whether ONE turn was an
  // answer. Falls back to splitting the join so every existing caller and every
  // existing assertion keeps working unchanged.
  const turns = Array.isArray(travellerTurns) ? travellerTurns : t.split("\n");
  const known = {};
  const set = (key, res) => { if (res) known[key] = res; };

  set("origin", readOrigin(t, intake.startPoint));
  set("days", readDays(t, intake.arrival, intake.departure, today, turns));
  set("when", readWhen(t, turns, intake.arrival, intake.departure, today));
  set("party", readParty(t, intake.travelers, intake.familyMode));
  set("interests", readInterests(t, intake.interest));
  set("transport", readTransport(t, intake.transport));
  set("stay", readStay(t, intake.stayBooked));
  // AFTER the stay slot and BEFORE the direct-answer pass, so a name and a span
  // written in the same sentence as the booking are both read from the sentence
  // first and a bare answer can only fill what the sentence left empty. Same
  // rule, same reason, as every other slot here.
  set("stayWhen", readStayNights(t, { arrival: known.when?.value || null, today }));
  set("budget", readBudget(t, intake.budgetText));

  // ── AND THEN WHAT THEY SAID WHEN THEY WERE ASKED ──────────────────
  //
  // Oliver, 5 Sep 2026. He answered four questions in a row with the answer and
  // nothing else — "Billund", "7", "bikes and cars", "The lodge billund we got"
  // — and all four were recorded as REFUSALS, which is the state that stops the
  // gate asking and lets `ready` go true on an empty brief.
  //
  // The readers above are not wrong. Every one of them is built to find a fact
  // inside a SENTENCE and has to be, or "is the train to Odense expensive?"
  // fills the origin slot. A person answering a direct question does not write a
  // sentence, and the information that makes "Billund" an origin is not in
  // "Billund" — it is in the question before it. See utils/directAnswer.js.
  //
  // ── IT FILLS A HOLE. IT DOES NOT OVERRULE A FACT ──────────────────
  //
  // The first version let a direct answer beat a sentence match, and an
  // adversarial review found what that costs. "We cancelled the lodge, nothing
  // booked now" was read correctly by readStay and then overwritten with the
  // BOOKED read of the turn before it. "Actually we've got 10 days now" lost to
  // an earlier "7". A correction is the one thing the traveller most needs to
  // land, and the override was quietly eating them.
  //
  // So the rule is narrow and says exactly what it does: a direct answer fills a
  // slot the sentence readers left EMPTY, and it replaces the acknowledgement
  // placeholder, which carries no information at all — "said in the
  // conversation" is not a fact anything downstream can use, which is the whole
  // reason eight children reached the guide builder as a sentence about a
  // conversation. It never replaces a real value, from the form or from a
  // sentence.
  const direct = directAnswers(turns, answering);
  for (const [key, res] of Object.entries(direct)) {
    const held = known[key];
    if (!held || held.value === ACKNOWLEDGED_VALUE) known[key] = res;
  }

  // ── AND THE BARE ANSWER TO THE NIGHTS QUESTION ────────────────────
  //
  // "The whole trip." "Just the first two." Neither carries a booking word or a
  // place to sleep, so the sentence reader above cannot see them, and they are
  // answers only because of the question in front of them — which is the entire
  // argument directAnswer.js makes for every other slot.
  //
  // Read HERE rather than there because the reader lives in this file, and
  // directAnswer.js is imported BY this file: putting it on the other side of
  // that line would be a cycle. Same rule as the rest of the direct pass — it
  // fills an empty slot and never overrules a sentence.
  if (!known.stayWhen) {
    const asks = Array.isArray(answering) ? answering : [];
    // LAST ANSWER WINS, which is directAnswers' own rule two blocks up: it
    // walks every turn and a later one overwrites an earlier one, because a
    // correction is the thing a traveller most needs to land. An inner "first
    // answer wins" guard stood here and a mutation run found it did nothing at
    // all — the `if (!known.stayWhen)` above already stops a direct answer
    // beating a sentence, so the two were redundant and the redundant one was
    // the one pointing the wrong way.
    turns.forEach((turn, i) => {
      const keys = Array.isArray(asks[i]) ? asks[i] : [];
      if (keys.length !== 1 || keys[0] !== "stayWhen") return;
      const v = readStayNights(turn, { arrival: known.when?.value || null, today, direct: true });
      if (v) known.stayWhen = v;
    });
  }
  const wasAsked = new Set((Array.isArray(asked) ? asked : []).map(clean).filter(Boolean));
  // A slot with a `needs` predicate only applies to some trips. Nobody is asked
  // which nights their booking covers when they have not booked anything, and
  // nothing is blocked by an unanswered question that was never worth asking.
  const unfilled = BRIEF_SLOTS
    .filter(s => s.tier === "blocking" && !known[s.key])
    .filter(s => (typeof s.needs === "function" ? !!s.needs(known) : true))
    .map(s => s.key);
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
  // ── AND CHILDREN WITH NOBODY TO TRAVEL WITH THEM ──────────────────
  //
  // 6 Sep 2026, from Oliver's own run. "I'm with my gay husband and 2 kids"
  // came back as adults: null, kids: 2, and partyLine printed "2 children" —
  // the string its own comment says the guide builder reads. A fifteen-day
  // Denmark trip was planned for two unaccompanied children and NOTHING
  // ANYWHERE OBJECTED, because a party is a party once anything at all is
  // known about it.
  //
  // The regex that missed it is fixed in directAnswer.js, and that is the
  // narrow half. This is the general one: a party of children and no adult is
  // not an underspecified party, it is an impossible one, and the brief should
  // say so rather than plan for it.
  //
  // VAGUE, NOT MISSING, and the difference is deliberate. `missing` blocks the
  // build; a traveller who has told you about their children has answered the
  // question and being refused a plan over a headcount would be the intake
  // form he has objected to twice. `vague` asks once, through the machinery
  // `when` already uses, and lets the trip go ahead either way.
  // Carried out of `known` so briefBlock can say it without re-deriving the
  // cap, and so a screen can print "15 days, planned as 14" rather than 14.
  const cappedDays = known.days?.askedFor || null;
  const party = known.party;
  const childrenAlone = !!party && party.hasKids && party.adults == null;
  const vague = [
    ...(known.when?.precision === "month" ? ["when"] : []),
    ...(childrenAlone ? ["party"] : []),
  ];
  const vagueToAsk = vague.filter(k => !wasAsked.has(k));
  // Asked, unanswered, and required anyway. Kept apart from `missing` so the
  // asking cadence is unchanged and only the BUILD is gated.
  const unanswered = HARD_SLOTS.filter(k => !known[k] && wasAsked.has(k));
  return { known, missing, declined, vague, vagueToAsk, unanswered, cappedDays, ready: missing.length === 0 && unanswered.length === 0 };
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
// KNOWN LIMIT, NARROWED ON 23 AUGUST. This sentence used to be English in every
// conversation, including the Danish ones, which is the language this product is
// actually read in. It is Danish now when the reader is Danish, from askDa on
// the slot, and English everywhere else. The rest of the languages are still on
// the same list as the other hardcoded strings, and English and honest still
// beats silent.
// ── AND THE SECOND TIME IT MAY NOT BE THE SAME SENTENCE ─────────────
//
// Oliver's transcript of 12 Sep 2026, four replies in a row, each ending:
//
//   "One thing first, and then I can build it: Which dates? Even roughly is
//    fine, it decides which events are on while you are here."
//
// Word for word, four times, because this function is deterministic and had no
// idea it had ever been called before. He answered every time. His fourth reply
// was "I said in 2 days!!!" and his fifth was "for fuck sakes mate.. I'm here
// the 14th till 17th."
//
// The parsers that could not read those answers are fixed above, and they will
// miss something else eventually, because a parser always does. What must not
// survive that is the LOOP: an identical sentence repeating at a traveller who
// has spoken in between tells them they have not been heard, which is the one
// thing a conversation cannot come back from.
//
// `declined` is exactly this state and the brief has always computed it:
// unfilled AND already asked. So the second time the wording changes, says
// plainly that the answer did not land, and gives the shape of one that will —
// which is the honest version of what happened, and the only one the traveller
// can act on.
//
// A slot with no `reask` keeps the first sentence: the point is not novelty,
// it is admitting the miss, and inventing a variation here for every slot would
// be copy nobody wrote. The two HARD slots have one, because those are the two
// that can block a build forever.
// ── AND "ONE THING" HAS TO BE ONE THING ─────────────────────────────
//
// Oliver, 12 Sep 2026: "it's annoying that it says 'one more thing.. one more
// thing'.. constantly, despite it still needing 5 more stages of information."
//
// The screen he is looking at says "2 of 7 — 5 still to go" directly underneath
// a sentence promising the build is one answer away. The sentence was written
// for the end of a brief and gets used at the start of one, so it is not a
// figure of speech that has worn thin, it is a false statement about how much
// longer this will take, printed beside the number that contradicts it.
//
// So it counts, from the SAME list the progress bar counts — BLOCKING_SLOTS
// minus what is known — rather than from a second reckoning that could disagree
// with the number on screen. One left keeps the promise, because then it is
// true. More than one says how many.
const stillOpenCount = (brief) => BLOCKING_SLOTS.filter(k => !brief?.known?.[k]).length;
const SPELLED = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight"];
const spelled = (n) => SPELLED[n] || String(n);
const SPELLED_DA = ["ingen", "én", "to", "tre", "fire", "fem", "seks", "syv", "otte"];
const spelledDa = (n) => SPELLED_DA[n] || String(n);

export const buildBlockedNote = (brief, lang = null) => {
  const next = nextAsks(brief)[0];
  if (!next) return "";
  const again = (brief?.declined || []).includes(next.key);
  const left = stillOpenCount(brief);
  const base = String(lang?.tag || "").split("-")[0].toLowerCase();
  if (base === "da" && next.askDa) {
    if (again && next.reaskDa) return next.reaskDa;
    return left > 1
      ? `${spelledDa(left)} ting mangler jeg endnu, og det her er den første: ${next.askDa}`
      : `Lige en ting mere, så bygger jeg den: ${next.askDa}`;
  }
  if (again && next.reask) return next.reask;
  return left > 1
    ? `${spelled(left)} things still to go, and this is the first: ${next.ask}`
    : `One thing first, and then I can build it: ${next.ask}`;
};

// ── THE BLOCK THE MODEL SEES ────────────────────────────────────────
// It states what is already known, so nothing is asked twice, which is the other
// half of his complaint: it asked about budget in two separate turns and asked
// "mix of both?" after being told.
// `conflicts` are two facts that are both true and do not fit — eight children
// and a night out. They arrive as data rather than being computed here, so this
// file does not have to import the checks that read it back. See
// utils/briefConflicts.js.
export const briefBlock = (brief, conflicts = []) => {
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
  // ── AND SAY IT WHEN THE NUMBER IS NOT THEIRS ──────────────────────
  // He said fifteen days and the plan is built for fourteen. The reply agreed
  // with him in words while the data disagreed, which is the worst of both:
  // he had no reason to check and no way to find the missing day.
  if (brief.cappedDays) {
    lines.push(`THEY SAID ${brief.cappedDays} DAYS AND THE PLAN COVERS ${MAX_TRIP_DAYS}. Say so plainly, once, in the same reply you first use the length: you are planning their first ${MAX_TRIP_DAYS} days and the rest is theirs. Never repeat their number back as though the whole trip were planned, and never write "${brief.cappedDays} days" about what you have built.`);
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
  // ── AND A CONFLICT IS RAISED EVEN WHEN NOTHING IS MISSING ─────────
  //
  // Above the "you have everything you need" line, because that sentence is
  // exactly what silenced this in Oliver's transcript: the brief was full, the
  // model was told not to ask another question, and it quietly decided a night
  // out for a man travelling alone with eight children.
  const clash = (Array.isArray(conflicts) ? conflicts : []).filter(c => c?.question);
  if (clash.length) {
    lines.push("TWO THINGS THEY HAVE SAID DO NOT FIT TOGETHER. Raise this before you plan around either of them, in your own words, as one question. Do not decide it for them and do not build until they answer:");
    clash.forEach(c => lines.push(`  ${c.question}`));
  }
  // ── AND A CONFLICT IS THE ONLY QUESTION THIS TURN ─────────────────
  //
  // Found 5 Sep by an adversarial review. When a conflict fired AND a slot was
  // missing, the block printed the conflict and then "STILL MISSING. Ask for
  // THIS ONE and nothing else in this reply" — two instructions, each saying to
  // ask a different thing and nothing else. A model obeying the second one never
  // raises the conflict, and App.jsx records it as put to them anyway, so it is
  // silenced for the rest of the conversation.
  //
  // The conflict wins, because it is about facts already given and the missing
  // slot will still be missing next turn. nextAsks is not consulted at all in
  // that case, which is the same thing App.jsx does with askedThisTurn.
  const asks = clash.length ? [] : nextAsks(brief);
  if (!asks.length) {
    lines.push(clash.length
      ? "ASK THE QUESTION ABOVE AND NOTHING ELSE IN THIS REPLY, then wait for their answer. Whatever else is missing can wait a turn."
      : "YOU HAVE EVERYTHING YOU NEED. Do not ask another question. Say in one short line what you are about to plan, and offer to build it.");
    return lines.join("\n");
  }
  lines.push(asks.length === 1
    ? "STILL MISSING. Ask for THIS ONE and nothing else in this reply, whatever else is missing:"
    : `STILL MISSING, and you may ask for AT MOST ${MAX_ASKS_AT_ONCE} of them in this reply:`);
  asks.forEach(s => lines.push(`  ${s.label}: ${s.ask}`));
  if ((brief.vagueToAsk || []).includes("when")) {
    lines.push("They named a month but not a date. That is enough to rule out an event in another month and not enough to place a day, so ask for the dates once and never again.");
  }
  if ((brief.vagueToAsk || []).includes("party")) {
    lines.push("They have told you about children and not about the adults, so the party currently reads as children travelling on their own. Ask how many adults are coming, once, and never again. Do not guess a number and do not plan a single day until you have it or they have declined to say.");
  }
  // ── AND ASKING IS NOT THE WHOLE TURN ──────────────────────────────
  // The old line ended "One short paragraph, then the question or questions",
  // which describes a turn made entirely of asking. That is the intake form
  // Oliver read back on 21 August, and no ban on preamble fixes it, because the
  // problem is what the turn is FOR rather than how it is padded. See the turn
  // shape block in the chat prompt: one thing given, then one thing asked.
  // ── AND NOT "ONE MORE THING" ──────────────────────────────────────
  //
  // Oliver, 12 Sep 2026: "it's annoying that it says 'one more thing.. one more
  // thing'.. constantly, despite it still needing 5 more stages of information."
  //
  // Two separate sentences on his screen were saying it. buildBlockedNote's is
  // fixed above by counting. This one is the model's own — "One more thing on
  // Aalborg if it appeals" — and it is worse, because it is not even about the
  // brief: it was introducing a beer walk. Every turn opening the same way reads
  // as an interview with a fixed number of rounds, which is the intake form he
  // has objected to three times.
  lines.push(`NEVER OPEN WITH "ONE MORE THING", "ONE THING FIRST", "ONE QUICK CHECK", "JUST ONE MORE" OR ANY COUNTED VARIANT OF THEM, and never end a reply with one either. There are ${asks.length ? (brief.missing || []).length + (brief.unanswered || []).length : 0} things still open, so counting down to one is not true, and the traveller reads the same opener every turn as a form with a fixed number of rounds. Say the thing, then ask the question, with no counter in front of either.`);
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

// ── "NOT YET" HAS TO MEAN NOT YET ───────────────────────────────────
//
// Oliver, 26 Aug 2026: "I clicked 'Not yet' because I wanted to say something.
// It then said 'no rush at all'. It then popped up almost immediately again like
// 'wanna build a guide? Yes/no'."
//
// The card's own comment explains exactly why, and the reasoning was sound:
//
//   "NO IS NOT A DISMISS. It sends a turn, so Gemlyx keeps talking and asks what
//    to change. A No that silently closed the card would be another dead end."
//
// True, and it produced a card that cannot be declined. "Not yet" sends a turn,
// Gemlyx replies, aiLoading goes false, and `everReadyToBuild` — which LATCHES
// on purpose, so a follow-up question cannot take the button away — is still
// true. The card re-renders one line under the reply that just acknowledged the
// decline. Press no, be told "no rush at all", and be asked again immediately.
//
// That is "constant bills floating on the screen" — his words about Layla,
// eleven hours ago — in a different costume. A prompt you cannot say no to.
//
// ── SO WHAT BRINGS IT BACK ──────────────────────────────────────────
//
// Not a timer, and not the next reply. The honest trigger is that THE BRIEF
// CHANGED: they added a date, a place, a constraint, anything the plan would be
// built from. Offering again then is responsive. Offering again because they
// said "no rush" is nagging.
//
// The signature is the filled slots and their values, so a turn that merely
// chats leaves it identical and a turn that answers something does not.
export const briefSignature = (brief) => {
  const known = brief?.known && typeof brief.known === "object" ? brief.known : {};
  return BRIEF_SLOTS
    .map(s => {
      const v = known[s.key];
      if (!v) return `${s.key}:`;
      const val = v.value instanceof Date ? v.value.toISOString() : String(v.value ?? "");
      return `${s.key}:${val}`;
    })
    .join("|");
};

// True when the card should be offered again after a decline. Only when
// something the plan is built from has actually moved.
export const briefMovedOn = (declinedAt, brief) =>
  !!declinedAt && briefSignature(brief) !== declinedAt;

// ── ENOUGH TO SAY WHAT A PLACE IS FOR ───────────────────────────────
//
// Oliver, 10 Sep 2026, on a map that had labelled five towns by theme on a turn
// where the traveller had written only "I can't pick between Aalborg, Aarhus,
// Odense, and Ribe": "I didn't even mention my interests.. and now it just
// mentioned nightlife.." And then the rule itself:
//
//   "If you know enough about a person, then you can help the user make a
//    decision."
//
// Which is the whole of it. "Best if you want history" answers a question they
// asked, once they have said what they want, and invents the question before
// that. Six of the seven blocking slots were empty on that turn and the app made
// its strongest steer anyway.
//
// TWO FACTS OPEN IT, and neither of them is everything. What kind of trip, or
// who is coming: a family that has said nothing about interests can still be
// matched, because "with my kids" is a real thing to match on, and it is the
// fact with the most riding on it when the theme is nightlife.
//
// ── AND THE PLACEHOLDER DOES NOT COUNT ──────────────────────────────
//
// Which is why this is here rather than written as `!!brief.known.party` at the
// call site. readParty fills the slot from a sentence with ACKNOWLEDGED_VALUE,
// meaning "they said something about who is coming", carrying no count and no
// ages. That is enough to stop the brief asking again and it is nowhere near
// enough to recommend a town on. Eight children once reached the guide builder
// as a sentence about a conversation through exactly this value.
export const enoughToRecommend = (brief) => {
  const said = (key) => {
    const v = clean((brief?.known || {})[key]?.value);
    return !!v && v !== ACKNOWLEDGED_VALUE;
  };
  return said("interests") || said("party");
};
