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
import { arrivalDateIn, dateRangeIn, departureDateIn, monthOnlyIn, latestRelativeAnswer, daysBetween, tripDays, daysTheySaidFor, latestSpokenLength, isIntakeTurn, MAX_TRIP_DAYS } from "./tripEvents";
import { PARTY_BARE, PARTY_POSSESSIVE, PARTY_POSSESSIVES, PARTY_COUNT, TRAVEL_VERBS, FROM_WORDS, TRANSPORT_PREPS, VEHICLE_WORDS, TRANSPORT_VERBS, PUBLIC_TRANSPORT, alt, LETTER, INTEREST_ALL_WORDS, INTEREST_WORD_TERM, NAMES_A_CHILD } from "./travellerWords";
import { dayStart } from "./calendarDay";
import { travelModeKey, withoutNonModes, tickedTravelMode } from "./routeOrder";
import { directAnswers, isRefusal } from "./directAnswer";

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
  // ── HARD, AS OF 12 SEP ───────────────────────────────
  //
  // It was blocking and not hard, so asking it once satisfied it: a traveller
  // who answered a different question sent it to `declined`, `missing` emptied,
  // `ready` went true, and a guide could be built with no length at all. The
  // model filled the hole out loud ("I'll plan for around 4 days") and the
  // builder read that number back out of the conversation and sized the whole
  // document to it. Oliver chose hard, with dates and party.
  //
  // A side-step now keeps it blocking and it is asked again. A real refusal
  // fills it as an open length, in directAnswer.js, so this cannot become the
  // loop that would make it worse than what it replaced.
  { key: "days", label: "how long", tier: "blocking", hard: true,
    ask: "How many days have you got?",
    askDa: "Hvor mange dage har du?",
    reask: "I still need the length before I can build anything: how many days are you here for?",
    reaskDa: "Jeg mangler stadig længden, før jeg kan bygge noget: hvor mange dage er I her?" },
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
  // ── AND HOW FAR THEY WANT TO GO ───────────────────
  //
  // Oliver, 25 Sep 2026: "'Stay at one town' 'Stay at one Island' 'Explore
  // Denmark'." A tick row rather than a question, and OPTIONAL, because a trip
  // is planned perfectly well without it and always has been.
  //
  // IT IS A SLOT RATHER THAN A FORM FIELD THE GUIDE READS, and that is the
  // whole reason it is here. Without a slot the guide build could honour it
  // while the chat could not, so Gemlyx would cheerfully offer a second island
  // to somebody who had ticked one town. See utils/tripScopeChoice.js.
  { key: "scope", label: "how far they want to go", tier: "optional",
    ask: "Do you want to stay in one place, or move around the country?",
    askDa: "Vil I blive \u00e9t sted, eller rundt i landet?" },
  // ── AND WHETHER THEY SPEAK DANISH ────────────────────
  //
  // Optional, and never asked unprompted. It is a tick box on the advanced
  // panel, and the ask exists for the one case where it would change an answer:
  // somewhere with an island calendar that is mostly talks and theatre. The
  // safe default without it is no Danish, which is the reading that cannot send
  // anybody to an evening they cannot follow. See readDanish above.
  { key: "danish", label: "whether they speak Danish", tier: "optional",
    ask: "Do you speak Danish? It changes which local evenings are worth pointing you at.",
    askDa: "Taler du dansk? Det afgør hvilke lokale aftener der er værd at pege på." },
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

const readDays = (text, intakeArrival, intakeDeparture, today = new Date(), turns = null, answering = null) => {
  // ── THROUGH THE ONE READER, 19 SEP 2026 ─────────────────────────
  // This used daysBetween, which is calendar inclusive, while the form the
  // traveller filled in printed the elapsed figure and the guide builder read
  // that printed line back as prose. One question, four answers, and a guide
  // built for seven days over a brief that said eight. See tripDays.
  // ── AND THE FORM IS NOT THE LAST WORD ──────────────────────
  //
  // Oliver, 18 Sep 2026: "It knows from the start it has to be 8 days, but
  // yet it asks again and gets stuck on it. This is a reoccuring problem."
  // The line above used to return here, before a single turn was read, so a
  // traveller who counted the 23rd to the 30th as eight and said so could not
  // move the brief. Every turn the model was handed "THE TRIP IS 7 DAYS" by
  // code and "take their new number" in the same block, and it was left to
  // argue, or to ask again, which is what he saw. The rule this file has
  // written down three times now, "a correction is the one thing the
  // traveller most needs to land", stopped at the form.
  //
  // So the turns are read, the form's own printed line excepted, and what
  // they said is put to daysTheySaidFor: the other reading of the same dates
  // lands as theirs, and the dates keep the slot otherwise.
  //
  // A NUMBER LARGER THAN THE DATES HOLD is carried as `said`, for
  // briefConflicts to ask about once: "we have 10 days" over a week of
  // timestamps means one of the two is wrong, and before 19 Sep the brief kept
  // seven in silence while the prompt told the model to take the ten. A
  // SMALLER number is left alone, as it always was over a form. "2 days in
  // Copenhagen and 4 in Jutland" and "the festival runs 3 days" are parts of
  // the trip and not its length, and a question about either would be the
  // form arguing with a sentence that never contradicted it.
  const said = Array.isArray(turns) && turns.length ? turns : [String(text || "")];
  const both = tripDays(intakeArrival, intakeDeparture);
  if (both && both > 0) {
    const spoken = latestSpokenLength(said, { today, answering, skip: isIntakeTurn, bare: true });
    if (!spoken || spoken.value === both) return { value: both, source: "intake" };
    const theirs = daysTheySaidFor(intakeArrival, intakeDeparture, spoken.value);
    if (theirs) return { value: theirs, source: "said" };
    const calendar = daysBetween(intakeArrival, intakeDeparture);
    return spoken.value > calendar ? { value: both, source: "intake", said: spoken.value } : { value: both, source: "intake" };
  }
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
  // It removes ONLY what was matched, so a turn that answers both keeps both:
  // "we fly in in 2 days and we're staying 5 days" reads five.
  //
  // WHAT IT DOES NOT REACH, stated rather than claimed away: the second number
  // has to carry its own day word. "we're staying 5" and "staying for 5 nights"
  // both leave a residue the answer test rejects, nothing is removed, and the
  // ARRIVAL number is read as the length. A review found the first version of
  // this comment asserting otherwise.
  // And a sentence where "in 3 days" really is a length — "we want to see
  // Denmark in 3 days" — names no travelling, so relativeAnswerIn returns
  // nothing, nothing is removed, and the count stands.
  // ── AND A NUMBER OF NIGHTS IS NOT A NUMBER OF DAYS ───────────
  //
  // Oliver's own session, 13 Sep 2026 at 03:04. He said "I'm gonna be in
  // Denmark for 7 days" at turn 3. At turn 8 he was asked which nights his
  // booking covers and answered "It's just one-two days probably." The brief
  // came out holding TWO, because this reader is last-wins per turn and that
  // sentence has a number and a day word in it.
  //
  // A seven day trip became a two day trip, on the slot that sizes the whole
  // guide, from an answer about a hotel. Nothing on screen said so.
  //
  // The discriminator is the one this file already uses twice: the question
  // that was on the table. A turn answering `stayWhen` or `stay` is about the
  // booking, so its numbers belong to the booking. Every other turn is read as
  // it always was, including a turn that corrects the length while answering
  // nothing in particular.
  //
  // THE SCAN ITSELF LIVES IN tripEvents.js NOW (latestSpokenLength), because
  // the event window has to take the same correction the brief takes or the
  // two disagree about how many days there are to put an event on. The rules
  // above are the rules it applies; the code moved and the reasons stayed.
  const spoken = latestSpokenLength(said, { today, answering });
  if (spoken && spoken.kind === "range") return { value: spoken.value, source: "said" };
  if (spoken) {
    const raw = spoken.value;
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
  // the 12th, and they will tell you that is five days. A spoken range carries
  // no hour, so tripDays counts it the same way for the intake pickers above
  // and the two paths cannot disagree. The pickers differ only when a departure
  // time is given and it is before the afternoon.
  // A range with no spoken count anywhere is the ordinary case, "I'm here the
  // 14th till 17th" and nothing else, and latestSpokenLength returns it above.
  // departureDateIn below cannot reach it, because that one needs a leaving
  // word ("out of Aalborg on the 12th") and a range has none.
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
  // ── AND THE LINE THE APP WRITES ITSELF ──────────────────────────
  //
  // Oliver's own export, 19 Sep 2026. The intake form sends a hidden first
  // message, built in App.jsx, and it reads:
  //
  //   "... | Exact trip length: 3 days | Starting point: Copenhagen"
  //
  // Every branch above is a shape a PERSON types, and none of them is a label
  // with a colon after it, so the brief reported `origin` missing on a trip
  // whose starting point was the first thing the traveller filled in. His
  // guide then told him "Built assuming a Copenhagen/Kastrup start, say if
  // that's wrong" about a fact he had stated.
  //
  // AND IT WAS EXACTLY BACKWARDS. When the field is left blank the same builder
  // writes "Starting point: not specified, assume Copenhagen Airport", and the
  // airport branch above matches the word "Airport", so the slot filled. Saying
  // nothing answered the question and answering it did not.
  //
  // English only, because the label is a hardcoded English string in App.jsx
  // rather than a translated one. If it is ever translated, this branch and
  // that line have to move together.
  `(?:^|[^${LETTER}])starting point:\\s*(?!not specified)\\S`,
].join("|"), "i");
// ── AND SOME OF THEM ARE NOT ARRIVING AT ALL ──────────────────
//
// Oliver, 19 Sep 2026: "Some people might be Danes. They would not begin at the
// airport."
//
// Every branch of ORIGIN_RE above is a shape about ARRIVING IN the country, and
// the whole app downstream assumes it. The intake form writes "Starting point:
// not specified, assume Copenhagen Airport" when the field is blank; the chat
// prompt says that whenever the start is Copenhagen Airport it must weave in a
// Copenhagen Card or a ticket-app tip; the guide's Getting Around section opens
// with the Metro from the airport. All of that is written for somebody who has
// just landed, and it is read by somebody who has lived here their whole life.
//
// EXPLICIT WORDS ONLY, and this is the line that matters. "Driving from Aarhus"
// is a Dane and also a German who parked at the airport, and guessing which
// would put a stranger in a country with no arrival advice at all. So it is
// read off a person saying they live here, are from here, or are leaving from
// home, and off the one chip under the question that says exactly that. Silence
// is not a Dane.
const LIVES_HERE = new RegExp([
  // English, including the way somebody who lives here answers "where are you
  // starting from": "I live in Aarhus", "we're based in Odense".
  // ── AND A LOCATIVE AFTER IT, OR IT IS NOT ABOUT LIVING SOMEWHERE ──
  // "I live for a good museum" filled this on the first draft, and `origin` is
  // a BLOCKING slot: a sentence about museums would have answered the question
  // about where the trip starts and stopped it being asked. The word that
  // follows is what makes it a place.
  /\b(?:i|we)\s*(?:'m|'re|\s+am|\s+are)?\s*(?:live|living|based|lives)\s+(?:in|here|at|near|just outside|outside|on)\b/.source,
  /\b(?:i|we)\s*(?:'m|'re|\s+am|\s+are)\s+(?:danish|a dane|danes|local|locals|from denmark|from here)\b/.source,
  /\b(?:live|living)\s+(?:in denmark|here)\b/.source,
  /\b(?:from|starting from|leaving from|driving from)\s+home\b/.source,
  /\bmy own home\b|\bat home in\b/.source,
  // Danish. "jeg bor i Aarhus", "vi bor her", "hjemmefra", "jeg er dansker".
  `(?:^|[^${LETTER}])(?:jeg|vi)\\s+bor\\s+(?:i|her|p\\u00e5|paa|ved|lige|t\\u00e6t|taet|uden)(?![${LETTER}])`,
  `(?:^|[^${LETTER}])(?:bor\\s+i\\s+danmark|bor\\s+her|hjemmefra|hjemme\\s+fra|fra\\s+mit\\s+hjem)(?![${LETTER}])`,
  `(?:^|[^${LETTER}])(?:jeg|vi)\\s+er\\s+(?:dansker|danskere|danske|lokale?)(?![${LETTER}])`,
].join("|"), "i");

const readOrigin = (text, intakeStartPoint) => {
  // ── THE SAME TEXT EITHER WAY ─────────────────────────
  // `fromHome` is read off what they TYPED even when the form answered the slot,
  // because a Dane fills in "Aarhus" on the form and then says "I live here" in
  // the chat, and the form has no box for it. The form filling the slot must not
  // stop the conversation being read.
  const fromHome = LIVES_HERE.test(String(text || ""));
  if (has(intakeStartPoint)) return { value: clean(intakeStartPoint), source: "intake", fromHome };
  return ORIGIN_RE.test(String(text || "")) || fromHome
    ? { value: ACKNOWLEDGED_VALUE, source: "said", fromHome }
    : null;
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
// ── AND IT SAYS WHETHER THERE ARE CHILDREN ─────────────────
//
// `hasKids` gates the nightlife inventory out of the prompt and flags a night
// out nobody asked for, and until 12 Sep the ONLY writer of it was the direct
// answer path in directAnswer.js. So it was true for "2 adults and 2 kids"
// typed straight under "who is coming?", and false for the same words said in
// a sentence, false for the intake form's family tick-box, and false for the
// intake form's own "2 adults and 2 kids" field. Measured by a Fable review:
// all three gave hasKids false and then planned a night out.
//
// A REFUSAL IS SCRUBBED FIRST, for the same reason readInterests scrubs one:
// "no kids this time" says there are none.
const readParty = (text, intakeTravelers, familyMode) => {
  const kidsIn = (v) => NAMES_A_CHILD.test(withoutRefused(String(v || "")));
  if (has(intakeTravelers)) return { value: clean(intakeTravelers), source: "intake", hasKids: kidsIn(intakeTravelers) };
  if (familyMode) return { value: "family", source: "intake", hasKids: true };
  return PARTY_RE.test(String(text || ""))
    ? { value: ACKNOWLEDGED_VALUE, source: "said", hasKids: kidsIn(text) }
    : null;
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
// "lodge" was in directAnswer.js's list and not in this one, so "The lodge
// billund we got" was read by the direct path and invisible to the sentence
// path. Same word, two lists, one of them short.
const SLEEPS = "hotel|hostel|room|rooms|place|places|apartment|flat|airbnb|bnb|b&b|guesthouse|guest house|kro|inn|lodge|cabin|cottage|campsite|camping spot|sommerhus|ferienwohnung|værelse|vaerelse|zimmer|kamer|somewhere to stay|accommodation|lodging";
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
const NOT_BOOKED_RE = /\b(?:not (?:booked|yet|decided|sorted)|nothing booked|no hotel|haven'?t (?:booked|decided|sorted|got)|have not (?:booked|decided)|still (?:looking|deciding)|in mind|need (?:a hotel|somewhere)|looking for (?:a hotel|somewhere)|open to suggestions on (?:hotels?|where to stay)|ikke booket|ikke bestemt|noch nicht gebucht|nog niet geboekt)\b/i;
// ── A BOOKING IN THE OTHER FIVE LANGUAGES ──────────────────
// "Vi har booket et hotel", "Wir haben ein Hotel gebucht" and "We hebben een
// hotel geboekt" all read as nothing until 12 Sep, on a BLOCKING slot, so a
// Danish traveller with a hotel was asked whether they had one and then planned
// around not having one. The verbs here are unambiguous, so a word for the place
// anywhere in the same sentence is enough.
const BOOKED_ELSEWHERE = new RegExp(`\\b(?:booket|reserveret|gebucht|reserviert|geboekt|gereserveerd|bokat|bokad|reservert)\\b`, "i");
// A completed booking verb with a proper noun behind it: "we booked the
// Radisson", "vi har booket Hotel Phoenix". namedStayIn cannot see these,
// because it wants a lodging word inside the name and a hotel is usually just
// its own name.
const BOOKED_PROPER = /\b(?:booked|reserved|booket|reserveret|gebucht|geboekt|bokat)\s+(?:the\s+|a\s+|an\s+|our\s+|my\s+|et\s+|en\s+|ein\s+|een\s+)?[A-ZÆØÅ]/;
// ── AND A QUESTION BOOKS NOTHING ──────────────────────
//
// "Do you have a hotel to recommend?" and "Have you got a hotel tip for Aarhus?"
// both read as a BOOKED hotel, because `have ... hotel` is one of the shapes
// above and this reader was handed the whole conversation as one string. The
// direct-answer reader in directAnswer.js has guarded this since it was written;
// this one never did, and the cost is a guide that suppresses every word about
// where to stay for somebody who was asking exactly that.
//
// Split rather than tested at the end, because the text here is every traveller
// turn joined together and the question is usually not the last thing in it.
const SENTENCES = /[^.!?\n]+[.!?]*/g;
const withoutQuestions = (text) =>
  (String(text || "").match(SENTENCES) || []).filter(x => !/\?\s*$/.test(x.trim())).join(" ");
const readStay = (text, intakeStayBooked) => {
  if (intakeStayBooked === true) return { value: "booked", source: "intake" };
  if (intakeStayBooked === false) return { value: "not booked", source: "intake" };
  const s = withoutQuestions(text);
  // Not-booked is tested FIRST: "haven't booked" contains "booked".
  if (NOT_BOOKED_RE.test(s)) return { value: "not booked", source: "said" };
  if (BOOKED_RE.test(s)) return { value: "booked", source: "said" };
  // A completed booking verb and a named property in the same text. The name is
  // found by namedStayIn, which is the same reader that takes it OUT of the
  // interests slot, so a run of words is a hotel in both directions or in
  // neither. Last, because it is the widest.
  if (BOOKED_DONE.test(s) && namedStayIn(s)) return { value: "booked", source: "said" };
  if (BOOKED_ELSEWHERE.test(s) && new RegExp(`\\b(?:${SLEEPS})\\b`, "i").test(s)) return { value: "booked", source: "said" };
  if (BOOKED_PROPER.test(s)) return { value: "booked", source: "said" };
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
// ── THE LIST MOVED, AND WHY ─────────────────────────────
// It was thirty-odd English words sitting in this file. `interests` became HARD
// on 12 Sep, so a word this list did not hold stopped being a missed theme and
// became a build nobody could start, and the list held no Danish, German, Dutch,
// Swedish or Norwegian at all. It lives in travellerWords.js now, beside every
// other thing a traveller might type, keyed by the English term the rest of the
// app reads. See the comment there for what the Danish question could not read
// back.
const INTEREST_WORDS = INTEREST_ALL_WORDS;
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
  // ── AND "DO NOT MIND" IS NOT A REFUSAL ───────────────────
  //
  // It is the opposite: it is somebody saying yes without enthusiasm. Found
  // 12 Sep, when this scrub was wired into the second reader of interests and a
  // brief saying "we do not mind paying for one or two good meals" came back
  // with no food in it. The negation swallowed the clause that was the answer.
  //
  // Same for "no objection to". The pattern is a negation followed by a word
  // that turns it back into an agreement, and there are only a few of them.
  "(?!\\s+(?:mind|minds|minding|object|objects|objecting|objection))" +
  // ── AND IT STOPS AT A COMMA ─────────────────────────────────────
  // Found 5 Sep by an adversarial review. Running to the full stop swallowed the
  // answer in "No problem, we love food and history" and "Skip Copenhagen, we
  // want nature and food" — a blocking slot sent to `declined` on a plain
  // answer, which is the same failure this whole night is about. A refusal is a
  // clause, and a clause ends at a comma.
  // ── AND IT STOPS AT THE END OF THE TURN ─────────────────────────
  //
  // Oliver, 13 Sep 2026: "the chat got stuck because I said 'kid's trip'". His
  // session, turn by turn:
  //
  //   Gemlyx  Have you got somewhere booked to stay already?
  //   Oliver  nope i dont
  //   Gemlyx  I still do not know what kind of trip this is. Name one thing.
  //   Oliver  for kids
  //   Gemlyx  I still do not know what kind of trip this is. Name one thing.
  //   Oliver  history
  //   Gemlyx  I still do not know what kind of trip this is. Name one thing.
  //
  // He typed a word the question itself offers and was asked the question again.
  //
  // The traveller's turns are joined with a newline and read as one text, and
  // this window ran forty-eight characters past a negation, stopping at a full
  // stop, a comma or a contrast word. A NEWLINE WAS NOT ON THAT LIST. So "dont"
  // in an answer about a hotel swallowed the next two turns whole:
  //
  //   withoutRefused("nope i dont\nfor kids\nhistory")  ->  "nope i  "
  //
  // A blocking slot the traveller had answered twice stayed empty, the gate kept
  // asking, and he could not get out of it by answering correctly.
  //
  // THIS IS THE WHOLE CLASS, NOT ONE TURN. Any "no", "not", "don't", "ikke" or
  // "nicht" anywhere in a conversation made the next one to three turns
  // invisible to this reader, and to every reader built on it: the interests
  // slot, briefThemes (which decides what goes in the prompt) and the check for
  // children with no adult. A refusal is a clause, a clause ends at a comma, and
  // a turn ends harder than a comma does.
  "(?:(?!\\b(?:but|though|however|instead|rather|men|dog|aber|sondern|maar)\\b)[^.,;:!?\\n\\r]){0,48}",
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
  // Newline-stopped as well, and for the mirror reason: this window runs
  // BACKWARDS, so without it "keder" in one turn reached back and deleted the
  // answers in the turns before it.
  "(?:(?![.,;:!?])[^.,;:!?\\n\\r]){0,48}\\b(?:bores?|bored|boring|isn'?t for (?:me|us)|are not for (?:me|us)|not for (?:me|us)|no thanks|keder|langweilig)\\b",
  "gi");
// Backward first: a post-position verdict names the theme in front of it, and a
// forward scrub reaching that verdict would delete the verdict and leave the
// theme standing.
export const withoutRefused = (text) =>
  String(text || "").replace(REFUSED_AFTER, " ").replace(NOT_WANTED, " ");

// ── AND THE OTHER HALF OF THE SAME READING ──────────────────────────
//
// withoutRefused answers "what is left once the refusals are gone", which is
// the question the interests slot asks. utils/kindRefusal.js asks the opposite
// one: what was refused. Both are the same spans, so the spans are returned
// from here rather than matched a second time somewhere else with a second
// copy of the window rules, which is how two readers of one sentence start
// disagreeing about where a clause ends.
//
// Both patterns run over the ORIGINAL text. withoutRefused runs the backward
// one first and the forward one over what it left, because a scrub has to
// avoid deleting the verdict it is looking for; nothing is being deleted here,
// so each pattern sees the whole sentence and an overlap costs nothing worse
// than the same clause twice.
export const refusedClauses = (text) => {
  const t = String(text || "");
  if (!t.trim()) return [];
  const out = [];
  for (const re of [REFUSED_AFTER, NOT_WANTED]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t)) !== null) {
      const hit = m[0].trim();
      if (hit) out.push(hit);
      // A zero-length match would otherwise sit on the same index forever.
      if (m.index === re.lastIndex) re.lastIndex += 1;
    }
    re.lastIndex = 0;
  }
  return out;
};

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

const readInterests = (text, intakeInterest, turns = null, answering = null) => {
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
  // EDGED, not \b. JavaScript's word boundary is ASCII only, so `\b\u00f8l\b` and
  // `\bsev\u00e6rdigheder\b` never match the words they are written for: the boundary
  // sits between two characters it does not think are letters. Every other
  // multilingual reader in this project already uses the LETTER class for this,
  // and the interests reader was the one still on \b.
  //
  // THE ENGLISH SUFFIXES STAY AND NOTHING IS ADDED. Plurals and definite forms
  // in the other five languages are listed as their own entries rather than
  // generated, because a generated Danish suffix turns "art" into "arter" and
  // "slot" into "slots" and there is no way to tell which of those a sentence
  // meant. A listed word is a decision somebody made; a generated one is a
  // guess, and this slot has been filled by a guess twice.
  // IN THE ORDER THEY SAID THEM, which is neither the order of the word list nor
  // the order this loop happens to walk. The list is sorted longest first so a
  // two-word term is read before a one-word one inside it, and reporting in that
  // order turned "food and history" into "history, food": true, and not what
  // they wrote. What a traveller puts first is usually what they care about
  // most, and the guide prompt reads this string top to bottom.
  const at = new Map();
  for (const w of INTEREST_WORDS) {
    const term = INTEREST_WORD_TERM.get(w) || w;
    const pat = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp(`(?:^|[^${LETTER}])(?:${pat})(?:s|es|ing|ed)?(?![${LETTER}])`, "i").exec(s);
    if (!m) continue;
    if (!at.has(term) || m.index < at.get(term)) at.set(term, m.index);
  }
  const found = [...at.entries()].sort((a, b) => a[1] - b[1]).map(([term]) => term);
  if (found.length) return { value: found.slice(0, 6).join(", "), source: "said" };

  // ── AND "JUST A KIDS TRIP" IS WHAT KIND OF TRIP IT IS ──────────────
  //
  // Oliver, 13 Sep 2026: "the chat got stuck because I said 'kid's trip'". Asked
  // what kind of trip it was, he answered "jusr a kids trip", then "for kids",
  // and the slot stayed empty both times.
  //
  // The list above has no word for it, and putting one there would be the bug
  // the list's own comment is about. This reader runs over the WHOLE
  // conversation, and "kids" is the most common word in an answer to a
  // completely different question: "9 kids" answering WHO IS COMING would fill
  // what kind of trip it is, without him ever saying. A hard slot filled by a
  // guess is the thing this slot was made hard to prevent.
  //
  // WHAT MAKES IT AN ANSWER IS THE QUESTION IN FRONT OF IT, which is the
  // argument directAnswer.js makes for every other slot. So it is read ONLY
  // from a turn that was answering this question, and never from the join.
  //
  // "family" rather than a new word: it is already the term THEME_WORDS and
  // PLACE_THEMES use, so the reader that picks places, the map's own labels and
  // the guide prompt all knew what a family trip was before this line existed.
  // Only the slot that gates the build could not hear it said.
  const rows = Array.isArray(turns) ? turns : [];
  const asks = Array.isArray(answering) ? answering : [];
  let family = false;
  rows.forEach((turn, i) => {
    const keys = Array.isArray(asks[i]) ? asks[i] : [];
    if (keys.length !== 1 || keys[0] !== "interests") return;
    if (NAMES_A_CHILD.test(withoutRefused(String(turn || "")))) family = true;
  });
  return family ? { value: "family", source: "said" } : null;
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
    // Ticked boxes move them by the fastest one ticked. See tickedTravelMode.
    return { value: joined, mode: tickedTravelMode(`Getting around: ${joined}`) || travelModeKey(joined), source: "intake" };
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
// ── WHETHER THEY SPEAK DANISH ─────────────────────────
//
// Oliver, 19 Sep 2026: "add an option called Danish-speaker and Non-Danish
// speaker. Because that can play a vital role in destinations for people."
//
// It decides whether half of an island's calendar is worth pointing at. A
// foredrag, a revy and a læsekreds are three good evenings to a Dane and three
// hours of incomprehension to anybody else, so the same island is busier for
// one traveller than the other. See utils/eventAccess.js.
//
// OPTIONAL, AND NOT A QUESTION THE CHAT ASKS. It is a tick box on the advanced
// panel and it is read out of the conversation when they say it themselves.
// Making it blocking would put a question about language in front of somebody
// who came here to plan a holiday, and the safe default is already the right
// one: without an answer, the app assumes no Danish, which is the reading that
// cannot send anybody to an evening they cannot follow.
const SPEAKS_DANISH = /\b(?:speaks? danish|i speak danish|we speak danish|jeg taler dansk|vi taler dansk|taler dansk|dansktalende|p\u00e5 dansk er fint|dansk er fint)\b/i;
const NO_DANISH = /\b(?:no danish|don'?t speak danish|do not speak danish|does not speak danish|not a danish speaker|ingen dansk|taler ikke dansk|jeg taler ikke dansk)\b/i;

export const readDanish = (text, intakeDanish) => {
  const said = String(intakeDanish || "").trim().toLowerCase();
  if (said === "yes") return { value: "speaks Danish", source: "intake", speaks: true };
  if (said === "no") return { value: "no Danish", source: "intake", speaks: false };
  const t = String(text || "");
  // The refusal is read FIRST, because "I do not speak Danish" contains
  // "speak danish" and a reader that asked the other question first would have
  // answered the opposite of what was typed.
  if (NO_DANISH.test(t)) return { value: "no Danish", source: "said", speaks: false };
  if (SPEAKS_DANISH.test(t)) return { value: "speaks Danish", source: "said", speaks: true };
  return null;
};

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
  set("days", readDays(t, intake.arrival, intake.departure, today, turns, answering));
  set("when", readWhen(t, turns, intake.arrival, intake.departure, today));
  set("party", readParty(t, intake.travelers, intake.familyMode));
  set("interests", readInterests(t, intake.interest, turns, answering));
  set("transport", readTransport(t, intake.transport));
  // Straight from the tick row: there is no sentence to read it out of, and
  // inventing one would be a second reader of a value the form already holds.
  if (clean(intake.scope)) set("scope", { value: clean(intake.scope), source: "intake" });
  set("stay", readStay(t, intake.stayBooked));
  // AFTER the stay slot and BEFORE the direct-answer pass, so a name and a span
  // written in the same sentence as the booking are both read from the sentence
  // first and a bare answer can only fill what the sentence left empty. Same
  // rule, same reason, as every other slot here.
  set("stayWhen", readStayNights(t, { arrival: known.when?.value || null, today }));
  set("budget", readBudget(t, intake.budgetText));
  set("danish", readDanish(t, intake.danish));

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
    // ── EXCEPT A BARE NUMBER AGAINST THE FORM'S LENGTH ─────────
    //
    // The "asks again" half of Oliver's 18 Sep report. When the model does
    // ask about the length over a filled form ("seven or eight?") and he types
    // "8", that turn has no day word for the sentence scan in readDays to find,
    // and the rule above keeps the form's number. Asked, answered, and still
    // seven: the loop he described. Same door as readDays, same two readings,
    // so the two paths cannot land on different numbers for one answer.
    else if (key === "days" && held.source === "intake" && typeof res.value === "number") {
      const theirs = daysTheySaidFor(intake.arrival, intake.departure, res.value);
      if (theirs) known.days = { value: theirs, source: "said" };
      else if (res.value !== held.value) known.days = { ...held, said: res.value };
    }
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
  // ── AND A TURN THAT TRIED AND LANDED NOWHERE ──────────────────────
  //
  // Oliver, 13 Sep 2026: "I'd rather have the model asks 'do you mean public
  // transport'". He had typed "public transpor", one letter short, and Gemlyx
  // wrote back "Good to know, that's the main piece settled" while every reader
  // in this file saw nothing at all. The trip went on with no mode, which means
  // no distance ceiling, which is how somebody on buses is offered a town four
  // hours away.
  //
  // NO LIST OF TYPOS. His second message: "if we must go to a bunch of typos".
  // A dictionary of misspellings only ever covers the ones somebody thought of,
  // in one language, and this app reads six. What the app knows for certain
  // needs no dictionary: WHICH QUESTION WAS ON THE TABLE, and WHETHER ANYTHING
  // AT ALL CAME OUT OF THE ANSWER. That pair is true for a typo, for a phrasing
  // nobody anticipated, and for a seventh language, so it is the thing recorded.
  //
  // THREE GUARDS, and each of them is a turn that must NOT be queried:
  //   A REFUSAL is a deliberate non-answer. "Not sure yet" landing nowhere is
  //     the traveller being clear, and asking them to rephrase it is rude.
  //   A TURN THAT FILLED SOMETHING ELSE is a change of subject, not a miss.
  //     "We are going in September" to the transport question is September.
  //   THE ACKNOWLEDGEMENT PLACEHOLDER is not something filled. Its own value
  //     says "said in the conversation", which carries no information, and a
  //     turn that produced only that produced nothing.
  //
  // It never fills a slot. All it does is say, to the one part of the system
  // that can put it into words, that a question was answered and the answer did
  // not land. The brief is still never read from Gemlyx's own replies.
  const answeringKeys = Array.isArray(answering) ? answering : [];
  const filledSomething = (turn) => {
    const one = String(turn || "");
    const res = [
      readOrigin(one, null), readDays(one, null, null, today, [one], null),
      readWhen(one, [one], null, null, today), readParty(one, null, null),
      readInterests(one, null), readTransport(one, null), readStay(one, null),
      readStayNights(one, { arrival: null, today }), readBudget(one, null),
    ];
    return res.some(r => r && r.value !== ACKNOWLEDGED_VALUE);
  };
  const unread = [];
  turns.forEach((turn, i) => {
    const keys = Array.isArray(answeringKeys[i]) ? answeringKeys[i] : [];
    if (keys.length !== 1) return;
    const key = keys[0];
    const held = known[key];
    if (held && held.value !== ACKNOWLEDGED_VALUE) return;
    const said = String(turn || "").trim();
    if (!said || isRefusal(said)) return;
    if (filledSomething(said)) return;
    // LAST ONE WINS, per slot. If they tried twice, the words to quote back are
    // the ones they typed most recently.
    // `turn` is carried because the build gate needs to know WHEN it was said,
    // not only that it was said. See unreadOpen below.
    const at = unread.findIndex(u => u.key === key);
    const row = { key, said: said.replace(/\s+/g, " ").slice(0, 120), turn: i };
    if (at >= 0) unread[at] = row; else unread.push(row);
  });

  // A sharpening question carries its own key, `when:sharper`, so that asking it
  // once does not mark the base question asked. Everything that reasons about
  // the SLOT has to fold it back, and doing that in one place is why this is a
  // function rather than a regex written out three times.
  const baseSlotOf = (key) => String(key || "").replace(/:sharper$/, "");
  const wasAsked = new Set((Array.isArray(asked) ? asked : []).map(clean).filter(Boolean));
  // A slot with a `needs` predicate only applies to some trips. Nobody is asked
  // which nights their booking covers when they have not booked anything, and
  // nothing is blocked by an unanswered question that was never worth asking.
  const unfilled = BRIEF_SLOTS
    .filter(s => s.tier === "blocking" && !known[s.key])
    .filter(s => (typeof s.needs === "function" ? !!s.needs(known) : true))
    .map(s => s.key);
  // ── AND A REFUSAL HAS TO BE A REFUSAL, 19 SEP 2026 ────────────────
  //
  // This was `unfilled.filter(k => wasAsked.has(k))`: asked and still empty was
  // enough to call a slot refused, and refused does not block a build and is
  // never asked again. Oliver's own transcript of this morning shows what that
  // costs. At turn 18 the brief said to ask whether a hotel was booked, the
  // reply asked for the travel dates instead, App.jsx recorded `stay` as asked
  // anyway, and he answered the question he had been put. The hotel question
  // was then marked asked and refused, for a ten day trip with three children,
  // and Gemlyx would never have put it again.
  //
  // The same thing happened to `when` at turn 7: asked for dates, answered with
  // "10 days", marked refused. ANSWERING A DIFFERENT QUESTION IS NOT A REFUSAL.
  // It is the most ordinary thing a person does in a conversation.
  //
  // So `declined` now needs the refusal itself, read off the turn that was put
  // to that slot. Nothing else changes about what declined MEANS: it still does
  // not block, it is still never asked twice, and it is still reported to the
  // writer as an assumption rather than a fact.
  //
  // ── AND THE REASON IT WAS EVER THIS LOOSE IS GONE ─────────────────
  //
  // The comment above readBrief has said since 5 Sep: "Nothing reads a bare
  // 'no' as an answer about a hotel booking, so a blocking slot with no answer
  // would block forever." That was true when it was written and has not been
  // true since the direct-answer readers landed the same week. Measured today:
  // "no", "nope", "not yet", "no we haven't" and "nej" all fill the stay slot
  // with "not booked". The case this looseness existed for is answered by the
  // reader that should answer it, and what was left was a rule that called
  // every unanswered question a no.
  const saidTo = new Map();
  turns.forEach((turn, i) => {
    const said = String(turn || "").trim();
    if (!said) return;
    for (const k of (Array.isArray(answeringKeys[i]) ? answeringKeys[i] : [])) {
      const base = baseSlotOf(k);
      if (!base) continue;
      if (!saidTo.has(base)) saidTo.set(base, []);
      saidTo.get(base).push(said);
    }
  });
  // ── AND A CALLER THAT DOES NOT TRACK IT KEEPS THE OLD RULE ────────
  //
  // `answering` says which turn was put to which slot, and App.jsx has passed
  // it since 5 Sep. A caller without it cannot say what they replied to the
  // question, so this falls back to what it has always done rather than
  // silently calling every asked slot unanswered. Same shape as `travellerTurns`
  // at the top of this function, and for the same reason: every existing caller
  // and every existing assertion keeps working unchanged, and the rule that
  // changed is the one the app runs.
  const putToThem = (k) => (saidTo.get(k) || []).length > 0;
  // ── AND A QUESTION STILL ON THE SCREEN IS NOT A REFUSAL ──────────
  //
  // 22 Sep 2026, a live test with two travellers from Germany. They had said
  // where and when and "Public transport", the bar read "6 of 7, and I still
  // need whether a hotel is booked", and the very next reply asked "Have you got
  // somewhere booked to stay yet?" while the bar beside it read "Everything I
  // need, 7 of 7" and the build button said "Ready to build". Nobody had said a
  // word about a hotel.
  //
  // App.jsx records a slot as asked the moment the reply that asks it lands,
  // and the brief is read again in that same render. `answering` was passed,
  // as it always is from the app, but it holds one entry per TRAVELLER turn and
  // the traveller had not typed anything yet, so no turn was put to `stay`. The
  // line below then read "no turn put to it" as "turned it down", which is the
  // fallback written for a caller that never passes `answering` at all, and a
  // slot that was asked one second ago went to `declined`, which does not block.
  //
  // So the fallback applies only when the caller cannot say what they replied
  // to: no `answering` array at all. A caller that tracks it, and has no reply
  // yet, has an open question, and an open question is MISSING until a turn
  // refuses it or fills it.
  const tracksAnswers = Array.isArray(answering);
  const turnedItDown = (k) => (!tracksAnswers && !putToThem(k)) || (saidTo.get(k) || []).some(said => isRefusal(said));
  const declined = unfilled.filter(k => wasAsked.has(k) && turnedItDown(k));
  // Everything else that is empty is still MISSING, which is the state that
  // gets it asked. A question they have not answered yet and a question that
  // was never actually put look the same from here, and both want the same
  // thing to happen next.
  const missing = unfilled.filter(k => !declined.includes(k));
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
  // ── AND ONLY WHERE SOMEBODY COUNTED ────────────────────
  //
  // "children travelling on their own" is a reading of a COUNT: the direct
  // answer reader worked out how many adults and how many children and came back
  // with children and no adults. A party read out of a sentence has no count by
  // construction, so the moment readParty started reporting `hasKids` on 12 Sep
  // every ordinary family sentence ("me, my wife and the kids") began reporting
  // itself as unaccompanied children and asking for the adult headcount.
  //
  // `adults` is present on the counted reading and absent on the other, which is
  // the difference itself rather than a flag describing it.
  const uncountedAdults = !!party && party.hasKids && "adults" in party && party.adults == null;
  // ── AND "NOT COUNTED" IS NOT "NOT THERE" ──────────────────────────
  //
  // Oliver, 19 Sep 2026: "my wife and 3 kids" landed here as children with no
  // adults, and the block below told the model the party reads as children
  // travelling on their own. He had named an adult in the sentence.
  //
  // Both states are worth the same ONE question, because the headcount reaches
  // the cost estimate and the number of beds either way. They are not worth the
  // same sentence: one is a party nobody has counted and the other is a party
  // with no grown-up in it, and saying the second about the first is the app
  // telling a traveller it did not read what he wrote. `adultsNamed` is the
  // difference, and it is asked of the reading rather than guessed at here.
  const childrenAlone = uncountedAdults && !party.adultsNamed;
  const vague = [
    ...(known.when?.precision === "month" ? ["when"] : []),
    ...(uncountedAdults ? ["party"] : []),
  ];
// ── AND THE SHARPENING QUESTION COULD NEVER BE ASKED ────
  //
  // Found 19 Sep 2026 by a review of one of his real exports. The traveller said
  // "5 kids around 5-10 years old", the brief read five children and no adults,
  // childrenAlone fired, `vague` held party, and the next question was about
  // interests. Then the block said "YOU HAVE EVERYTHING YOU NEED. Do not ask
  // another question." over a plan for five unaccompanied children.
  //
  // The reason is one line: this filtered on the SLOT key, and the slot had been
  // asked. "Who's coming along?" is the base question and it was asked at turn
  // 2; "how many adults are with them" is a different question about the answer
  // to it. Sharing one key meant the second could only ever be asked when the
  // party was volunteered BEFORE being asked, which is the abnormal path. The
  // machinery `when` uses had the same hole for the same reason.
  //
  // So a sharpening ask carries a key of its own. It is still asked once, and
  // App.jsx records THAT key rather than the slot's, so the base question does
  // not come back and this one does not repeat.
  const vagueToAsk = vague.filter(k => !wasAsked.has(sharperAsk(k)));
  // Asked, unanswered, and required anyway. Kept apart from `missing` so the
  // asking cadence is unchanged and only the BUILD is gated.
  const unanswered = HARD_SLOTS.filter(k => !known[k] && wasAsked.has(k));
  // ── AND AN ANSWER NOTHING COULD READ IS NOT AN ANSWER ─────────────
  //
  // `unread` is keyed by the question that was put, so a sharpening question
  // carries `when:sharper` and there is no `known["when:sharper"]` to clear it
  // against. Left alone it would sit in the list for the rest of the
  // conversation, including after a later turn answered the same question
  // properly, because that turn returns early rather than replacing the row.
  //
  // So two things narrow it, and both are needed.
  //
  // THE BASE SLOT DECIDES whether it still matters. An unreadable answer counts
  // only while the slot it was about is still loose. Once `when` reads as a
  // day, the stale row means nothing.
  //
  // AND IT HAS TO BE THE THING THEY JUST SAID. Without that this deadlocks, and
  // the deadlock is not hypothetical: in his own 19 Sep transcript "they're
  // 8-14" leaves an unreadable row against the party question, the party reads
  // as children with no adult counted, and `vague` holds `party` for the rest
  // of the conversation. That would have blocked the build for good, over a
  // sentence eight turns back that Gemlyx had already moved on from. An answer
  // nothing could read holds the build for one turn, which is the turn the
  // question gets asked again in.
  const lastTurnAt = turns.reduce((last, t, i) => (String(t || "").trim() ? i : last), -1);
  const unreadOpen = [...new Set(unread.filter(u => u.turn === lastTurnAt).map(u => baseSlotOf(u.key)))]
    .filter(k => vague.includes(k));
  const brief = { known, missing, declined, vague, vagueToAsk, unanswered, unread, unreadOpen, cappedDays, childrenAlone };
  return { ...brief, ready: briefReady(brief) };
};

// The key a sharpening question is recorded under. Exported because App.jsx
// writes it and the suite pins the pair: a question recorded under the wrong
// key is either asked forever or never asked at all, and this file has shipped
// both.
export const sharperAsk = (key) => `${key}:sharper`;

// ── AND NOBODY EXPLAINS DENMARK TO A DANE ──────────────────
//
// Oliver, 19 Sep 2026: "Some people might be Danes. They would not begin at the
// airport."
//
// The arrival advice in this app is not one sentence, it is a habit. The chat
// prompt says that whenever the start is Copenhagen Airport it must weave in a
// Copenhagen Card or a ticket-app tip. The intake form writes "assume Copenhagen
// Airport" over a blank field. The guide's Getting Around section opens with the
// Metro in from the terminal. Every one of those is right for somebody who has
// just landed and faintly insulting to somebody who has lived here for forty
// years, and the difference is one fact nothing downstream was ever told.
//
// EMPTY UNLESS THEY SAID SO. `fromHome` is read off explicit words and off the
// chip under the origin question, never inferred from a Danish town: "driving
// from Aarhus" is a Dane and also a German who parked at the airport, and
// guessing wrong leaves a stranger in a country with no arrival advice at all.
// So an empty string here means the app behaves exactly as it did before, which
// is the right default for everybody it cannot place.
export const homeStartBlock = (brief) => {
  if (!brief?.known?.origin?.fromHome) return "";
  return `── THEY LIVE HERE ──
`
    + `This traveller is starting from home in Denmark. They are not arriving, so there is no airport, no transfer and no first day spent getting into the country.
`
    + `DO NOT EXPLAIN DENMARK TO THEM. No Copenhagen Card pitch, no how to buy a ticket, no warning about checking out of the bus, no note that Danish towns are small or that the trains are easy. They have lived with all of it. A sentence teaching a local their own country is the fastest way to lose them, and it is the exact sentence this app has been writing by default.
`
    + `WHAT THEY CAME FOR INSTEAD is the thing they have not already seen, which is a higher bar than it is for a visitor: the obvious sights of their own country are not a recommendation. Go further down the list than you otherwise would, and say plainly when something is well known.
`
    + `AND THE TRAVEL IS DOMESTIC. Distances are from where they live rather than from Kastrup, they may well drive, and a day that starts at home starts whenever they want it to.`;
};


// ── READY, AND THE DATE HAS TO BE A DATE ────────────────────────────
//
// Oliver, 19 Sep 2026, reading his own transcript. The traveller had said
// "start December", the screen said "Everything I need, 7 of 7" with the build
// card under it, and Gemlyx in the same breath asked "What dates exactly are
// you thinking within December?"
//
// His words: "It needed an exact date. Which is correct. The card should not
// have been generated in the first place. The card knew it was december, but
// the AI didn't know when in December. That's why it was considered
// fulfilled."
//
// That is the hole exactly. `vague` has always been TRUE about the brief and
// has never been allowed to mean anything: a month filled the slot, `missing`
// emptied, and ready went true over an eight day window that no event, no
// opening hour and no ferry time can be checked against.
//
// AND IT IS `vagueToAsk`, NOT `vague`, so nothing deadlocks. A month blocks the
// build until the sharpening question has been PUT. Answer it and the brief
// sharpens; ignore it or answer it loosely and the build opens anyway, which is
// the bargain `vague` was written under on 21 Aug ("asks once, and lets the trip
// go ahead either way") and the one the party check got on 6 Sep. The only
// change is that the one question now comes BEFORE the card rather than beside
// it.
//
// ONE DEFINITION. readBrief used to carry its own copy of this expression and
// this function carried the other. Two readers of "is it ready" is how the
// screen came to say 7 of 7 over a question, and it is the failure this file's
// own comments name about four other pairs.
export const briefReady = (brief) => !!brief
  && brief.missing.length === 0
  && !(brief.unanswered || []).length
  && !(brief.vagueToAsk || []).length
  && !(brief.unreadOpen || []).length;

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
  // ── AND THE SORT USED TO UNDO THE SENTENCE ABOVE IT ──────────
  //
  // `pick` put the unanswered ones last and then a single sort by slot order
  // shuffled them back in among the rest, so the comment has described the
  // opposite of the behaviour since it was written. Nobody noticed while `when`
  // sat third in the list. `days` is first, and hard since 12 Sep, so a
  // traveller who answered a different question got the length asked again on
  // every turn ahead of five things nobody had raised yet.
  //
  // TWO SORTED GROUPS, each in slot order. Everything nobody has been asked
  // comes first; a question they have already had once comes back when there is
  // nothing new left to ask, which is what "come back to it once, plainly" in
  // the block means.
  const fresh = [...brief.missing, ...(brief.vagueToAsk || [])].filter((k, i, a) => a.indexOf(k) === i);
  const again = (brief.unanswered || []).filter(k => !fresh.includes(k));
  const pick = [
    ...fresh.sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    ...again.sort((a, b) => order.indexOf(a) - order.indexOf(b)),
  ];
  // A SHARPENING ASK IS MARKED AS ONE, so the caller records it under its own
  // key. Same slot, same question text, different thing being asked: the slot
  // is answered and what is wanted is one missing part of the answer.
  const sharpening = new Set((brief.vagueToAsk || []).filter(k => brief.known?.[k]));
  return pick
    .slice(0, Math.max(0, limit))
    .map(k => {
      const slot = BRIEF_SLOTS.find(s => s.key === k);
      return slot && sharpening.has(k) ? { ...slot, sharpen: true } : slot;
    })
    .filter(Boolean);
};

// ── WHAT THIS TURN ACTUALLY ASKS FOR ────────────────────────────────
//
// nextAsks says what is OPEN. This says what the reply will be told to ask,
// which is not the same list, and the difference is what App.jsx records as
// "asked" afterwards. Two conditions take slots off it, and both are about a
// question that is better than the stock one being put instead:
//
//   A CONFLICT. Already true since 5 Sep, and the comment on it is the reason
//     this function exists: recording a slot as asked when the question was
//     never put is how a slot becomes "asked and refused" with nobody ever
//     having been asked.
//   AN ANSWER NOBODY COULD READ. Added 13 Sep. The block raises their own
//     words instead of the stock question, so the stock question is not asked
//     and must not be recorded as asked.
//
// ONE READER, BECAUSE THIS WENT WRONG THE MOMENT IT WAS TWO. briefBlock
// filtered the unreadable slots out and App.jsx did not, so the block asked
// about "public transpor" while App.jsx wrote the transport slot down as asked
// and refused. The suite caught it on the assertion that pins the pair, which
// is the assertion that exists because the conflict half went the same way.
export const asksThisTurn = (brief, conflicts = []) => {
  if (!brief) return [];
  if ((Array.isArray(conflicts) ? conflicts : []).filter(c => c?.question).length) return [];
  const queried = new Set((brief.unread || []).filter(u => u && u.key && u.said).map(u => u.key));
  return nextAsks(brief).filter(s => !queried.has(s.key));
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
const SPELLED = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight"];
const spelled = (n) => SPELLED[n] || String(n);
const SPELLED_DA = ["ingen", "én", "to", "tre", "fire", "fem", "seks", "syv", "otte"];
const spelledDa = (n) => SPELLED_DA[n] || String(n);
// Both spelled lists are lowercase, which was invisible while the count sat
// mid-sentence and is not now that it opens one.
const sentence = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export const buildBlockedNote = (brief, lang = null) => {
  const next = nextAsks(brief)[0];
  if (!next) return "";
  const again = (brief?.declined || []).includes(next.key);
  const left = stillOpenCount(brief);
  const base = String(lang?.tag || "").split("-")[0].toLowerCase();
  if (base === "da" && next.askDa) {
    if (again && next.reaskDa) return next.reaskDa;
    return left > 1
      ? sentence(`${spelledDa(left)} ting ved jeg stadig ikke. Den her mangler jeg, før jeg kan bygge: ${next.askDa}`)
      : `Lige en ting mere, så bygger jeg den: ${next.askDa}`;
  }
  if (again && next.reask) return next.reask;
  // ── AND THE COUNT IS OF WHAT IS UNKNOWN, NOT OF QUESTIONS COMING ──
  //
  // "Two things still to go, and this is the first" was printed on a brief where
  // one of the two was a declined soft slot that will never be asked again. The
  // traveller was promised a second question and got one. The number itself is
  // right and is the same one the progress bar and the prompt rule use, so it
  // stays; what goes is the clause that turned a count of unknowns into a
  // promise about the rest of the conversation.
  return left > 1
    ? sentence(`${spelled(left)} things I still don't know. This is the one I need before I can build: ${next.ask}`)
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
// How many blocking slots are still open, counted from the same list the
// progress bar counts, so the note, the prompt rule and the bar agree.
// ── AND A SLOT THAT ONLY APPLIES SOMETIMES STILL COUNTS ────────
//
// BLOCKING_SLOTS drops every slot carrying a `needs` predicate, because nobody
// is asked which nights their booking covers when they have not booked
// anything. That is right for the LIST and wrong for the COUNT: once somebody
// says they have booked, `stayWhen` is a real open question, and this counted it
// as nothing. Measured by a Fable review on 12 Sep on a brief with a booking and
// no nights: the block printed "There are 0 things still open" directly above
// "STILL MISSING: which nights does that booking cover?", and the bar beside it
// said 7 of 7 and 99% with no reason given.
//
// One definition, exported, so the prompt line, the blocked-build note and the
// progress bar cannot drift apart. They have twice.
export const openBlocking = (brief) => BRIEF_SLOTS
  .filter(s => s.tier === "blocking" && !brief?.known?.[s.key])
  .filter(s => (typeof s.needs === "function" ? !!s.needs(brief?.known || {}) : true))
  .map(s => s.key);
// And the denominator moves with it, or the bar reads 8 of 7.
export const blockingTotal = (brief) => BRIEF_SLOTS
  .filter(s => s.tier === "blocking")
  .filter(s => (typeof s.needs === "function" ? !!s.needs(brief?.known || {}) : true))
  .length;
const stillOpenCount = (brief) => openBlocking(brief).length;

// ── AND THE THIRD ARGUMENT IS WHAT THEY TAPPED, NOT WHAT THEY TYPED ──
//
// Oliver, 13 Sep 2026, on the zoomed-in map: "a short description of the
// places (like at the final guide), and then a 'Is this interesting?' Yes/No."
//
// Everything else in this block is read out of the traveller's own words, and
// that rule stands: a tap is never written into the conversation as though
// they had said it. But a tap IS a decision they made, and a No that reached
// the map and the preview and never reached the model would have Gemlyx
// offering Legoland in the reply after the tap, which is worse than never
// having asked. So the two lists arrive here as names, which is what a tap
// holds, and the model is told what they are and where they came from.
//
// Both default to nothing, so every caller that does not have a map keeps the
// block it had.
export const briefBlock = (brief, conflicts = [], { picked = [], turnedDown = [] } = {}) => {
  if (!brief) return "";
  const lines = [];
  const knownKeys = BRIEF_SLOTS.filter(s => brief.known[s.key]);
  if (knownKeys.length) {
    lines.push("WHAT YOU ALREADY KNOW. Never ask about any of these again, in any wording:");
    knownKeys.forEach(s => {
      const k = brief.known[s.key];
      lines.push(`  ${s.label}: ${k.value}${k.source === "intake" ? " (from the form they filled in)" : ""}`);
    });
    // ── AND THE FORM CAN BE FILLED IN TWICE ─────────────────
    //
    // Oliver, 25 Sep 2026, on a five day preview: "I did not mention public
    // transport at all. So why would it talk about the 750 public transport
    // fine?"
    //
    // Because a re-filled intake APPENDS. Every "Build my trip" adds another
    // hidden turn and none of the earlier ones are removed, so a conversation
    // that was filled in three times carries three "Getting around:" lines and
    // the model reads all of them. The slots above hold the CURRENT answer,
    // resolved properly, and printing them was never the same as saying they
    // win.
    //
    // THIS ALREADY HAPPENED ONCE, TO THE LENGTH. An 8 day brief was previewed
    // as a one day Aalborg food trip because Gemlyx's own "Applied: Aalborg
    // for one day" echo from the first intake outranked the second. That was
    // fixed for `days` alone, in the preview's own prompt. Every other slot
    // beside it had the same exposure and no guard, which is why this sits
    // HERE, on the block every slot already goes through, rather than as a
    // second sentence about a second field.
    const fromForm = knownKeys.filter(s => brief.known[s.key]?.source === "intake");
    if (fromForm.length) {
      lines.push(`THE LINES MARKED (from the form they filled in) ARE WHAT THE TRAVELLER LAST TOLD THE FORM, and they beat anything earlier in this conversation that says otherwise, including a line Gemlyx itself wrote. A form filled in twice leaves the first echo standing in the transcript and that echo is not a correction of anything: it is an older answer to the same question. Never describe the trip by an earlier value of ${fromForm.map(s => s.label).join(", ")}, and never mention something that only follows from one, such as a fare, a fine, a pass or a hire, when the current answer does not call for it.`);
    }
  }
  // ── AND WHAT THEY TICKED IS A BRIEF, NOT A RECORD ───────────────
  //
  // Oliver, 22 Sep 2026, testing the chat himself with Food and Shopping
  // ticked on the form. Neither word appeared in either of the first two
  // replies, and the second one offered a museum. The slot was filled, the
  // line above printed it, and printing it under a heading that says NEVER ASK
  // ABOUT THESE AGAIN is a rule about questions. Nothing said the answer was
  // supposed to steer what came back.
  //
  // So the one thing they told us about the trip gets a line of its own,
  // saying what to do with it. Named in the next reply, because the failure
  // was at the start of the conversation, where somebody who has just filled
  // in a form is waiting to see whether it was read.
  //
  // NOT A FENCE. A person who ticks Food has not ruled out a castle, and a
  // reply that can only name food is a worse conversation than one that leads
  // with it. The refusals are the fence, and they are their own block: see
  // utils/kindRefusal.js and utils/exclusions.js.
  if (brief.known?.interests?.value) {
    lines.push(`WHAT THEY CAME FOR IS ${brief.known.interests.value}. That is the trip, so the first real thing you put on the table in your next reply is one of those, by name, and every list of places you offer leads with them. Anything outside them is worth offering when it is on the way or too good to leave out, never as the main thing and never instead.`);
  }
  // ── AND NOBODY SAID THERE WERE CHILDREN ─────────────────────────
  //
  // Oliver, 22 Sep 2026, on a test conversation where no child was ever
  // mentioned: places offered because they suit kids, and a pace built around
  // one. The nightlife inventory has had a line like this since 12 September,
  // written for the mirror image of the same fault, where the whole published
  // bar list went into every prompt and Gemlyx raised a night out in four
  // conversations out of four.
  //
  // TWO DIFFERENT SILENCES, and the line says which one this is. A party that
  // is known and has no child in it is an answer; a party nobody has stated is
  // not, and telling the model to plan for adults there would be the same
  // invention in the other direction. `hasKids` is read by readParty from
  // their own words and from the form, so both routes reach this.
  if (brief.known?.party) {
    lines.push(brief.known.party.hasKids
      ? `THERE ARE CHILDREN ON THIS TRIP. Say what a place is like with them along when it matters, and never plan a night out.`
      : `NO CHILDREN HAVE BEEN MENTIONED ON THIS TRIP. Do not offer a place because it suits kids, do not call anything family friendly, and do not build the day around a child's pace. If they name one later, that is the moment it changes.`);
  } else {
    lines.push(`NOBODY HAS SAID WHO IS COMING. Do not assume children either way: nothing is offered because it suits kids, and nothing is left out for the same reason.`);
  }
  // Names only, folded once, with the empties out. A tap holds a name and
  // nothing else, and a name repeated is one decision, not two.
  const tapped = (list) => [...new Set((Array.isArray(list) ? list : []).filter(x => typeof x === "string").map(clean).filter(Boolean))];
  const saidYes = tapped(picked);
  // App.jsx keeps the two lists disjoint, so this only matters to a caller
  // that does not. A name on both is read as a Yes: a place kept in is a place
  // the traveller can see in the plan and take out, and a place kept out on a
  // contradiction is the silent drop this file keeps finding.
  const saidNo = tapped(turnedDown).filter(n => !saidYes.some(y => y.toLowerCase() === n.toLowerCase()));
  if (saidYes.length) {
    lines.push(`THEY TAPPED YES ON THESE PLACES ON THE MAP, SO THEY ARE IN THE TRIP: ${saidYes.join(", ")}. Plan around them, and do not offer any of them again as though it were new.`);
  }
  // The stronger of the two, and the one this block exists for. A place they
  // turned down and are then offered again is the mechanism working against
  // the person it was built for.
  if (saidNo.length) {
    lines.push(`THEY TAPPED NO ON THESE PLACES ON THE MAP: ${saidNo.join(", ")}. Never offer, recommend or plan any of them again, in any wording, and never ask whether they have changed their mind. If they ask about one of them directly, answer the question and still leave it out of the plan.`);
  }
  // ── AND SAY IT WHEN THE NUMBER IS NOT THEIRS ──────────────────────
  // He said fifteen days and the plan is built for fourteen. The reply agreed
  // with him in words while the data disagreed, which is the worst of both:
  // he had no reason to check and no way to find the missing day.
  if (brief.cappedDays) {
    lines.push(`THEY SAID ${brief.cappedDays} DAYS AND THE PLAN COVERS ${MAX_TRIP_DAYS}. Say so plainly, once, in the same reply you first use the length: you are planning their first ${MAX_TRIP_DAYS} days and the rest is theirs. Never repeat their number back as though the whole trip were planned, and never write "${brief.cappedDays} days" about what you have built.`);
  }
  // ── AND THE LENGTH THEY GAVE IS NOT RE-DESCRIBED ────────────────
  //
  // Same transcript, turn 16: "That's a full week", written about a trip this
  // brief holds as five days. Nothing in the conversation said week. The model
  // added the sailing day to the five, rounded up, and handed the traveller two
  // different trip lengths in one reply, one of them from the machine that was
  // about to build the thing. A span is not a summary of a number, it is a
  // second number, and a second number is the bug this file keeps finding.
  // A NUMBER, not whatever is in the slot. A length handed over to Gemlyx sits
  // here as a sentence, and this line would have printed "THE TRIP IS open,
  // Gemlyx picks the length DAYS".
  // ── AND NOT "TAKE THEIR NEW NUMBER" WHEN THE CODE WILL NOT ──
  //
  // The sentence below promised the traveller's correction would be taken,
  // and readDays could not take one over a filled form until 19 Sep. A
  // number the dates cannot hold is still not taken (see daysTheySaidFor),
  // and this line has to say so, or the model is told two things at once
  // and argues the number every turn: Oliver's "gets stuck on it".
  if (typeof brief.known?.days?.value === "number" && Number.isFinite(brief.known.days.said)) {
    lines.push(`THE DATES THEY GAVE HOLD ${brief.known.days.value} DAYS AND THEY HAVE SAID ${brief.known.days.said}. The plan follows the dates. Say so once, plainly, and use ${brief.known.days.value}; a different length needs different dates in the form, so never plan ${brief.known.days.said} days and never argue the number a second time.`);
  } else if (typeof brief.known?.days?.value === "number") {
    lines.push(`THE TRIP IS ${brief.known.days.value} DAYS AND THAT IS THE ONLY LENGTH. Use the number. Never restate it as "a week", "a fortnight", "about ten days" or any other span, and never add a travel day to it to reach a rounder one. If they say something later that changes the length, take their new number, not your arithmetic on the old one.`);
  }
  // Asked, and they did not answer. Named so it is not asked again, and named as
  // an assumption so the reply does not speak as if it knew.
  // The hard ones are pulled out first: they are asked and unanswered too, and
  // the line above tells the model to assume, which is the one thing it must not
  // do with these.
  const hardOpen = BRIEF_SLOTS.filter(s => (brief.unanswered || []).includes(s.key));
  // ── AND A TRIP LENGTH IS NEVER ASSUMED OUT LOUD ─────────────────
  //
  // Oliver, 12 Sep 2026, turn 14 of his own transcript: "I'll plan for around
  // 4 days between the two towns since you haven't said otherwise." Nobody had
  // said four. He had answered the length question at turn 4 by answering a
  // different one, which is the case the line below is worst at: it tells the
  // model to say out loud what it is assuming, and a day count is the one slot
  // where saying it out loud MAKES it true. The builder reads this same
  // conversation back, finds "around 4 days", and sizes the guide to it. That
  // is the whole path from a guessed number to "only 3 days? Where is the rest
  // of the guide?".
  //
  // So `days` comes out of the assume-out-loud list and gets its own rule. It
  // IS a hard slot, as of later the same night. The first version of this note
  // argued the opposite, on the grounds that a hard slot asked and side-stepped
  // blocks the build for good. That was true and the conclusion was wrong: not
  // blocking meant a guide was built with no length at all, which is worse. The
  // deadlock is answered by a handle on the door (directAnswer.js), not by
  // leaving the door open.
  // NOT while it is in `unanswered`. `days` is hard now, so asked-and-unfilled
  // is printed by the ASKED, NOT ANSWERED block above, which already says not to
  // assume a value. Two lines telling the model the same thing is the bug this
  // file keeps finding, so this one covers only the state that block does not:
  // never asked, and therefore never yet forbidden.
  // `missing` IS the whole state. For a hard slot, unknown-and-asked lands in
  // `unanswered` (the block above owns it) and unknown-and-not-asked lands in
  // `missing`, so the `declined` half of the first version could never be true
  // while the `unanswered` guard held. Dead logic in a prompt builder reads as a
  // third case that does not exist.
  const daysOpen = !brief.known?.days && (brief.missing || []).includes("days");
  const declinedSlots = BRIEF_SLOTS.filter(s => (brief.declined || []).includes(s.key) && !(brief.unanswered || []).includes(s.key));
  if (declinedSlots.length) {
    lines.push("ALREADY ASKED AND NOT ANSWERED. Do not ask about these again. If one of them changes what you would plan, say out loud what you are assuming:");
    declinedSlots.forEach(s => lines.push(`  ${s.label}`));
  }
  // ── AND A LENGTH THEY HANDED OVER IS SAID OUT LOUD ────────────
  //
  // The one case where naming a number nobody gave is right, because they asked
  // for it. It has to be SAID, in the reply, in plain words: the builder reads
  // this conversation back to size the guide, so a number the model only thought
  // is a number the builder cannot find.
  if (brief.known?.days?.open) {
    const said = brief.known.days.said;
    const theirs = said && said !== "they have not decided"
      ? ` They put it as "${said}", so pick a length that matches that and not a longer one.`
      : "";
    // ONCE, like the capped-days rule above it. The first version printed this
    // on every turn after the handover, including the turn that says everything
    // is known, which is how a rule stops being read.
    // AND DATES OUTRANK IT. `days` sorts before `when`, so the ordinary order is
    // handover first and dates second, and a range like "the 14th to the 17th"
    // is a length. Without this the block flips to "THE TRIP IS 4 DAYS" a turn
    // after telling the model its own number was final.
    lines.push(`THEY HAVE LEFT THE LENGTH TO YOU.${theirs} Choose one and write the number in plain words, once, the first time you use it. If they later give dates that fix the length, their dates win and you say so rather than keeping your number.`);
  }
  if (daysOpen) {
    lines.push('THEY HAVE NOT SAID HOW LONG THE TRIP IS, SO THERE IS NO LENGTH TO PLAN TO. Do not name a count of days, do not write "around N days", do not size a route to a number you picked, and do not offer one for them to correct. A day count you say out loud becomes the guide\'s length, because the builder reads this conversation back. Ask for it, or say nothing at all about how long the trip is.');
  }
  // ── AND THESE TWO ARE NOT ASSUMED, EVER ───────────────────────────
  // "I never said the dates to it. Despite it asking me. It assumed October. It
  // cannot make a build without dates." The guide that came out of that carried
  // a weather forecast for every day and an event dated 9 October.
  if (hardOpen.length) {
    // ── THE LABEL, NOT THE QUESTION ───────────────────────
    //
    // This printed `s.ask` and so did STILL MISSING further down, so a hard slot
    // that had been side-stepped put the identical sentence in front of the
    // model twice in one block, once under "come back to it ONCE, plainly" and
    // once under "ask for THIS ONE and nothing else in this reply". Two
    // instructions about one question, disagreeing about urgency. Measured by a
    // Fable review on 12 Sep, on the 21:24 transcript, where it would have asked
    // "How many days have you got?" at five consecutive turns.
    //
    // One place asks, and it is the one whose whole job is to say what to ask.
    lines.push("ASKED, NOT ANSWERED, AND STILL REQUIRED. Nothing can be built until you have these, so do not assume a value, do not pick a likely one, and never say you are ready to build:");
    hardOpen.forEach(s => lines.push(`  ${s.label}`));
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
  // ── AND AN ANSWER THAT LANDED NOWHERE IS QUERIED, NOT REPEATED ────
  //
  // Oliver, 13 Sep 2026: "I'd rather have the model asks 'do you mean public
  // transport'". He typed "public transpor" and nothing could read it, so the
  // question would simply come round again, which is the same insult as being
  // asked what kind of trip it is three times after typing "history".
  //
  // The app has worked out THAT the answer did not land and cannot work out
  // WHAT they meant: guessing that is a dictionary of typos in six languages,
  // which is the thing he did not want. So the model is handed the fact and
  // their exact words, and does the one part it is good at.
  //
  // ITS GUESS NEVER FILLS THE SLOT. Nothing in this app reads the brief out of
  // Gemlyx's own replies, which is what stops it inventing a trip, and that
  // holds here too: the confirmation has to come back in the traveller's own
  // words, so the question is worded to get the word back rather than a yes.
  const unreadable = (brief.unread || []).filter(u => u && u.key && u.said);
  if (unreadable.length) {
    lines.push("THEY ANSWERED, AND NOTHING IN THE APP COULD READ WHAT THEY TYPED. Do not ask the question again as though they had said nothing, and never treat it as settled. Build your question out of their own words. Where it reads as a typo or a word you can nearly make out, say what you think they meant and ask them to confirm it IN WORDS rather than with a yes, because a yes on its own does not reach the plan. Where you cannot tell at all, say so warmly and ask them to put it another way:");
    unreadable.forEach(u => {
      const slot = BRIEF_SLOTS.find(x => x.key === u.key);
      lines.push(`  ${slot?.label || u.key}: they typed "${u.said}"`);
    });
  }
  // Those slots are being asked about above, in better words than the stock
  // question. Asking both in one reply is two questions about one thing, which
  // is the shape this file keeps finding and removing.
  const asks = asksThisTurn(brief, clash);
  if (!asks.length) {
    // AND "everything you need" is not true while a question is standing. The
    // conflict branch already knew this; an unreadable answer is the same
    // shape, and without this line the block would raise their own words and
    // then tell the model to stop asking questions in the same breath.
    lines.push(clash.length || unreadable.length
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
    // Two sentences for two states, because "children travelling on their own"
    // said to somebody who wrote "my wife and 3 kids" is the app telling him it
    // did not read his message. The question is the same either way.
    lines.push(brief.childrenAlone
      ? "They have told you about children and not about the adults, so the party currently reads as children travelling on their own. Ask how many adults are coming, once, and never again. Do not guess a number and do not plan a single day until you have it or they have declined to say."
      : "They have named an adult and given no headcount, so nobody knows how many adults are coming. Ask that, once, and never again, and never suggest the children are travelling alone: they told you somebody is with them. Do not guess a number, and do not put a figure on costs or beds until you have it or they have declined to say.");
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
  // THE SAME COUNT THE NOTE AND THE PROGRESS BAR USE. The first version added a
  // second reckoning here (missing + unanswered), and a review caught the two
  // landing on the model's screen in one turn saying seven and six. A counting
  // rule that cannot count is worse than no rule, and two readers of one
  // question is the bug this whole night keeps finding.
  const openNow = stillOpenCount(brief);
  lines.push(`NEVER OPEN WITH "ONE MORE THING", "ONE THING FIRST", "ONE QUICK CHECK", "JUST ONE MORE" OR ANY COUNTED VARIANT OF THEM, and never end a reply with one either. There ${openNow === 1 ? "is 1 thing" : `are ${openNow} things`} still open, so counting down to one is not true, and the traveller reads the same opener every turn as a form with a fixed number of rounds. Say the thing, then ask the question, with no counter in front of either.`);
  // ── AND AN UNKNOWN START MAY NOT BE FILLED IN FOR THEM ─────
  //
  // Oliver, 12 Sep 2026: "So I said I went to Aalborg. It instantly assumed I
  // took the plane to Copenhagen and it was stuck in the data as I was in
  // Copenhagen." The reply, at turn 4, before he had been asked anything about
  // it: "I'll plan you both starting from Copenhagen Airport unless you're
  // setting off from somewhere else." He was sailing in from Norway.
  //
  // The prompt already forbids this twice over: NEVER ANNOUNCE AN ASSUMPTION FOR
  // APPROVAL says that exact sentence is a checkbox with a paragraph around it,
  // and the Copenhagen Airport default is scoped in writing to the tick-box
  // flow. The model read the default anyway and announced it anyway. So it moves
  // out of the prompt's prose and into the block, where it is a fact about THIS
  // conversation rather than a rule to be weighed: nobody has said, so there is
  // nothing to assume.
  if ((brief.missing || []).includes("origin") || (brief.declined || []).includes("origin")) {
    lines.push("THEY HAVE NOT SAID WHERE THEY START, SO THERE IS NO DEFAULT. Do not name Copenhagen Airport or anywhere else as where they are landing, do not plan from one, and do not offer an assumption for them to correct. The Copenhagen Airport default belongs to the tick-box form and to nothing else. Ask, or say nothing about it.");
  }
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
// ── AND WHO THE WORD UNDER A PIN IS ACTUALLY FOR ─────────────
//
// Oliver, 13 Sep 2026, on the map in the chat: "the categories under each town
// should only be for people being uncertain of their decisions. It's awkward to
// have on all the time. Nobody will understand what it means."
//
// The map was using enoughToRecommend, which is true when interests OR party is
// known, so it was on for nearly everybody. It answers a different question:
// that one asks whether there is enough to MATCH a town on, and this one asks
// whether the traveller needs telling what a town is for.
//
// Somebody who has said "history and nature" has already decided. The word
// under the pin tells them what they just said. Somebody who has said nothing,
// or who has handed the choice to Gemlyx, is being shown a shape they did not
// pick, and then the word is the whole point of the pin.
//
// This is the same instinct as 10 Sep, when the label read "Best if you want
// history" and he said "that is only for when someone is in doubt". That fix
// took the prefix off. This one takes the word off too, for the people who are
// not in doubt.
export const unsureWhatTheyWant = (brief) => {
  const v = clean((brief?.known || {}).interests?.value);
  if (!v || v === ACKNOWLEDGED_VALUE) return true;
  // The handover reads "open to anything, Gemlyx chooses". They answered the
  // question, and the answer was that they do not know.
  return /Gemlyx chooses/i.test(v);
};

export const enoughToRecommend = (brief) => {
  const said = (key) => {
    const v = clean((brief?.known || {})[key]?.value);
    return !!v && v !== ACKNOWLEDGED_VALUE;
  };
  return said("interests") || said("party");
};
