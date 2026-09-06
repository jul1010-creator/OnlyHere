// ── "ATTRACTIONS ALL SAY FREE" ──────────────────────────────────────
//
// Oliver, 27 Aug 2026, relaying the same friend who found "middle-age man":
// "for some reason, attractions all say 'free', we gotta do something about
// that."
//
// They do, and not in one place. Six renderers said it, and every one of them
// was reading the same thing: the CATEGORY NAME.
//
// ── WHY THE CATEGORY IS CALLED "free" ───────────────────────────────
//
// Because it used to mean it. The pool started as free-entrance attractions,
// the fallback file is still called data/freeEntrance.js, and the Studio prompt
// still says "this whole category is defined by being free". When every row in
// it was free, `_kind === "free" ? "Free" : ...` was a true sentence, and six
// people wrote it independently because it kept being true.
//
// It is not true any more. The category is now the whole `attraction` segment
// and it holds Legoland, Faarup Sommerland and AROS. The renderers never
// changed, so a 419-krone theme park is published under a green chip reading
// FREE — which is the single worst direction for this app to be wrong in.
//
// ── AND THIS IS THE LEAK placeUrl.js ALREADY NAMED ──────────────────
//
// From that file, on why the URL segment is `attraction` and not `free`:
// "Studio calls these types `free` and `booking`; a person looking for
// Koldinghus is not looking for a free." The internal vocabulary leaking into
// the public one was caught for URLs in August and left standing everywhere
// else. A type name is a bucket. It is not a fact about money.
//
// ── SO: THE ROW'S OWN WORDS, OR SILENCE ─────────────────────────────
//
// A price claim may only come from a field where somebody wrote a price. The
// category may never produce one. Three answers, and the third is the one that
// matters most:
//
//   true    the row says free, and names no amount anywhere
//   false   the row names an amount, so something here is paid for
//   null    the row does not say, and we say nothing
//
// Null is not a failure state, it is the honest one. The old code had no null:
// every attraction was free because every attraction was in the free bucket,
// and a renderer that cannot say "I don't know" will say something wrong.
//
// ── AN AMOUNT BEATS THE WORD "FREE", ALWAYS ─────────────────────────
//
// The order below is the whole safety property, and it is the same order
// entryAudit's ticketPriceOn already uses on scraped pages, for the same
// reason it gives: "a page saying 'free for children, 200 kr for adults'
// reports the 200 rather than calling the whole thing free."
//
// Partly-free places are common and the Studio prompt already warns about them
// by name: "a palace's outdoor grounds might be free to walk while the indoor
// museum charges a real entry fee... Getting this wrong isn't a style issue,
// it's telling someone something is free when part of it genuinely isn't."
// "Grounds free — indoor museum 125 DKK" contains the word free and is not a
// free attraction, so the amount is read first and wins.

// The fields where a row is allowed to say what it costs. `extraCosts` is in
// the list on purpose even though it describes add-ons rather than entry: a row
// carrying "Audio guide 40 DKK" is not disqualified from being free by it, and
// the amount rule below is scoped so it cannot be.
// ── WHICH TYPES CHARGE AT A DOOR ─────────────────────────────────
// A festival, an attraction and a workshop have one gate and one admission
// price. A restaurant, a food street, a bar, a bar street, a town and a
// nightlife town do not: their prices are per dish, per pint, per venue, and
// the cheapest figure on a page is a beer rather than a fare. Every check that
// reasons about "the ticket price" belongs to this list and nothing else.
//
// LIVED IN App.jsx UNTIL 6 SEP 2026, as a module-private const, which was fine
// while the price hunt was its only reader. utils/affiliateSweep.js needs the
// same list to decide which rows an agent could even sell a ticket to, and
// journeyScope.js has already written down what happens next: "it was already a
// hand-written list copied from CONTENT_TYPES", and the copy is the one that
// drifted. So it lives here, where the rest of the admission-price judgement
// lives, and App.jsx imports it.
export const TYPES_WITH_A_DOOR = ["festival", "free", "booking"];

export const PRICE_FIELDS = ["ticketsGlance", "priceNote", "price", "ticketInfo"];
export const EXTRA_FIELDS = ["extraCosts"];

// A figure with a currency on it. A bare number is never a price — "open 10 to
// 17" and "3 floors" are not money, and reading them as money is how a free
// museum would start charging.
export const AMOUNT = /(?:^|[^\d])\d[\d.,]*\s*(?:dkk|kr\.?|kroner|kr\b|€|eur|usd|\$)|(?:dkk|kroner|€|eur|usd|\$)\s*\d/i;

// A priced range, where only the top end carries the currency: "229 to 399 DKK".
// The low figure is the one a reader plans around.
export const RANGE = /(\d[\d.,]*)\s*(?:to|–|—|-)\s*\d[\d.,]*\s*(dkk|kr\.?|kroner|€|eur|usd)/i;

// What the row says when it says free. English and Danish both, because the
// research is Danish and a value that was never translated still has to read
// correctly here rather than silently become "we don't know".
// What the row says when it says free. English and Danish both, because the
// research is Danish and a value that was never translated still has to read
// correctly here rather than silently become "we don't know".
//
// ── AND NO TRAILING \b, WHICH IS A TRAP THIS REPO HAS SPRUNG BEFORE ─
// entryAudit.js says it in one line about its own free pattern: "'fri entré'
// ends in a non-word character, so a trailing \b would refuse it." The first
// draft of this line had one and refused exactly that value. The boundary goes
// on the front, where every alternative starts with a letter, and the back is
// left open because two of them do not end with one.
export const SAYS_FREE = /\b(?:free|gratis|fri\s+entr[ée]|fri\s+adgang|gratis\s+adgang|no\s+ticket\s+required|no\s+charge|donations?\s+welcome)/i;

// ── AND A FREE CLAIM THAT IS QUALIFIED IS NOT A FREE CLAIM ──────────
//
// Read off the live site, 27 Aug 2026, from the attractions' own Tickets rows:
//
//   Legoland                  "Children under 2: free entry"
//   AROS                      "Free entry for everyone under 18"
//   Trelleborg                "Free entry year-round to the fortress ramparts"
//   Christiansborg Slotshave  "Free (garden only, palace interiors cost extra)"
//
// Every one of those is TRUE, and not one of them says the place is free.
// Legoland is a 419-krone theme park whose ticket line happens to mention the
// under-2s. This is the failure underneath the failure: fixing the renderer
// alone would have left Legoland's badge saying FREE, because the row's own
// words do contain "free entry" and a naive read of them agrees.
//
// entryAudit.js already has the concept and states it exactly: every price on a
// page being a concession rate "is NOT 'the ticket costs 100': it means the
// page we read prices members and students and never says what everyone else
// pays." A free claim scoped to WHO, to WHEN, or to WHICH PART is the same
// shape, and it answers a different question from the one a badge asks.
//
// So: an UNQUALIFIED free claim is a free attraction. Anything else is a fact
// about somebody or something else, and the honest answer is that we have not
// been told.
//
// Done by subtraction rather than by a list of qualifiers, because the
// qualifiers are open-ended (an age, a weekday, a wing of a building, a
// membership) and the words that may innocently sit beside "free" are not.
// Take those away and anything left is the qualifier.
const HARMLESS = new RegExp([
  "no ticket required", "no charge", "donations? welcome", "all year round", "year[- ]round",
  "free", "gratis", "fri", "entr[ée]e?", "entry", "entrance", "admission", "adgang", "always",
].join("|"), "gi");

export const isUnqualifiedFree = (text) => {
  const t = String(text || "");
  if (!SAYS_FREE.test(t)) return false;
  // Letters only: punctuation and spacing are not qualifiers, and a stray digit
  // left behind is (an age, a weekday, a price), so it stays in.
  const residue = t.replace(HARMLESS, " ").replace(/[^\p{L}\p{N}]+/gu, "");
  return residue === "";
};

// ── AND WHO THE QUALIFIER IS ABOUT, WHICH IS A SECOND QUESTION ──────
//
// Oliver, 4 Sep 2026, off the live Legoland page: "because of the at a glance,
// the Legoland doesn't get a 'paid'."
//
// Its ticket line is "Children under 2: free entry", which every rule above
// handles correctly and which still left the card SILENT: AMOUNT finds no
// figure, isUnqualifiedFree refuses it, the answer is `null`, and priceChip
// renders null as no chip at all. A 419-krone theme park sat on the grid saying
// nothing, between two genuinely free places both saying Free.
//
// `null` is the right answer to what this row SAYS and it is not the whole of
// what this row TELLS US. A page that prices under-twos free has a gate you pay
// at. The concession is the evidence, not the absence of it, and that is the
// same direction as the amount rule at the top: a fact about who pays less is a
// fact that somebody pays.
//
// ── BUT ONLY WHEN THE QUALIFIER IS A PERSON ─────────────────────────
//
// The four live lines listed at isUnqualifiedFree split cleanly in two, and
// only one half implies a gate:
//
//   Legoland       "Children under 2: free entry"                     WHO
//   AROS           "Free entry for everyone under 18"                 WHO
//   Trelleborg     "Free entry year-round to the fortress ramparts"   WHICH PART
//   Christiansborg "Free (garden only, palace interiors cost extra)"  WHICH PART
//
// The first two say most people pay. The last two say there is a way in that
// costs nothing, and a visitor walks the ramparts or the garden all day without
// a ticket. Calling those Paid is the same overreach pointing the other way, so
// the SCOPE decides and nothing else does. A free claim scoped to WHEN or to
// WHICH PART keeps answering "we have not been told".
//
// Two ways a page writes the same class of person, and both are needed: it
// names it ("children", "studerende", "pensionist") or it gives the age instead
// ("everyone under 18"), which is how the same fact is written when the noun
// would be redundant. AROS uses only the second.
//
// DELIBERATELY NOT SHARED WITH entryAudit.js's CONCESSION, which looks like the
// same list and answers a different question: that one reads a SCRAPED PAGE
// where an age sits in a sentence beside a figure, so it never needed the age
// half, and adding it there would change what counts as a concession on a page.
// Two lists, each with the comment saying why, rather than one quietly serving
// two questions.
export const CONCESSION_SCOPE = new RegExp([
  "medlem(?:mer|skab)?|foreningsmedlem|studerende|student|elev|pensionist|senior|efterl[øo]n",
  "b[øo]rn|barn|child|children|kid|ungdom|unge|youth",
  "handicap|ledsager|gruppe|grupper|group|klub|rabat|discount",
  "under\\s*\\d+|over\\s*\\d+|\\d+\\s*(?:[åa]r|years?)\\b|aged?\\s*\\d+",
].join("|"), "i");

const textOf = (row, fields) => fields.map(f => String(row?.[f] ?? "").trim()).filter(Boolean).join(" · ");

// ── THE ANSWER ──────────────────────────────────────────────────────
//
// `free` is true, false or null, and `says` carries the row's own words that
// decided it, so a caller can show the reader the sentence rather than a chip
// nobody can check. Never reads `type`, `_kind` or `_src`, and that omission is
// the entire point of the file.
export const entryPrice = (row) => {
  const entry = textOf(row, PRICE_FIELDS);
  const extra = textOf(row, EXTRA_FIELDS);
  // AN AMOUNT ON AN ENTRY FIELD SETTLES IT. Checked before the word, so a
  // partly-free place reports the part that costs money.
  // ── impliesPaid IS A SECOND FIELD AND NOT A FOURTH VALUE OF free ──
  //
  // Because `free` already has a consumer that reads null as WORK TO DO:
  // publishedRepair's priceProblems is gated on `free !== null` and flags
  // exactly Legoland's line as "misleading-free ... about who gets in free
  // rather than what entry costs". Folding this into `free` as a fourth answer
  // would have fixed the chip and silently emptied the repair queue of the one
  // row shape it was written for, which is the audit's own version of the leak
  // this file exists to stop.
  //
  // So: `free` keeps answering WHAT THE ROW SAYS, unchanged and with the same
  // three values. `impliesPaid` answers the separate question of whether the
  // row's words mean somebody pays, and only priceChip reads it. A row that
  // names an amount implies it trivially; a row scoped to a person implies it
  // by the concession; everything else does not imply it at all.
  if (AMOUNT.test(entry)) return { free: false, says: entry, impliesPaid: true };
  // ── AND THE FREE CLAIM HAS TO BE ABOUT THE DOOR ─────────────────
  //
  // "Children under 2: free entry" is Legoland's own ticket line. See
  // isUnqualifiedFree above: a free claim scoped to who, to when or to which
  // part of a place is not a claim that the place is free.
  //
  // This refuses some rows that really are free — Folketinget's "Free guided
  // tours; booking required" comes back as "we have not been told", and the
  // tours genuinely are free. That is the trade, taken deliberately and in the
  // safe direction: a reader told nothing goes and looks, and a reader told
  // FREE turns up with no money.
  if (isUnqualifiedFree(entry)) return { free: true, says: entry, impliesPaid: false };
  // It says free, and the rest of the sentence says who or what it is free FOR.
  // Not a free attraction, and not a price we can print either.
  if (SAYS_FREE.test(entry)) return { free: null, says: entry, impliesPaid: CONCESSION_SCOPE.test(entry) };
  // A row that says nothing about entry but prices an ADD-ON has still not told
  // us what the door costs. "Audio guide 40 DKK" is not an entry fee and is not
  // a claim that entry is free either.
  if (extra) return { free: null, says: entry || "", impliesPaid: false };
  return { free: null, says: "", impliesPaid: false };
};

// The chip. "Free" only when the row says so, the row's own short words when it
// charges and they are short enough to be a chip, and "" when it has not said —
// which renders as no chip at all rather than as a guess.
// ── AND 24 SENT REAL PRICES TO THE FALLBACK ─────────────────────────
//
// Oliver's rule, 3 Sep: "Just include the at a glance price or write paid. One
// of the two." Which means the cap decides how often a reader gets the real
// thing, and 24 was throwing away lines that fit on the card perfectly well:
//
//   "Free for kids, 9 kr adults"        26
//   "Day ticket 419 DKK, under 3 free"  32
//
// Both are the operator's own words, both answer "how much and for whom", and
// both were being replaced by "Paid" for the sake of two to eight characters.
// The chip sits on its own line at card width, so 40 is what actually fits
// rather than what was guessed. Fårup's 78-character line still does not, and
// still falls back — which is the point: the cap is now the real limit, so
// "Paid" means "genuinely too long to show" instead of "slightly over".
export const CHIP_MAX = 40;

// Not "Paid entry" or "Costs money": the shortest true thing, sitting where a
// "Free" chip sits on the row above it, so the two read as the same question
// answered two ways.
export const PAID_LABEL = "Paid";
export const priceChip = (row) => {
  const { free, says, impliesPaid } = entryPrice(row);
  if (free === true) return "Free";
  // ── TOO LONG FOR A CHIP IS NOT THE SAME AS NOTHING TO SAY ──────
  // "Day ticket 419 DKK, under 3 free" does not fit in a chip, and dropping it
  // leaves the card silent about a place that charges. The row's own figure
  // does fit, so that is what goes in.
  if (free === false) {
    if (says.length <= CHIP_MAX) return says;
    // ── AND A SUMMARY THAT DROPS THE QUALIFIER IS NOT A PRICE ────
    //
    // Oliver, 3 Sep 2026, on the Fårup Sommerland card: "writing 'from 229 kr'
    // lacks information.. from 229 kr? What do I get at 229 kr? And for who?
    // Just include the at a glance price or write paid. One of the two."
    //
    // The row's own line is "1-day ticket 229 to 399 DKK per person aged 3 to
    // 64; children aged 0 to 2 free". What stood here squeezed that into "from
    // 229 DKK", which drops the ticket, the ages, and the fact that it can be
    // 399 — and adds a "from" the source never said, implying a floor with no
    // stated basis. It is the ranking rule in a chip: a figure is only true
    // against the thing it measures, and this one was measuring nothing a
    // reader could name.
    //
    // The branch under it was worse. AMOUNT plucked the FIRST complete amount
    // out of a sentence and printed it bare, so "Guided tour 150 DKK, entry 80
    // DKK" became "150 DKK" — the wrong number, with no qualifier at all, and
    // no range for a reader to be suspicious of.
    //
    // Neither is fixable inside 24 characters, so the chip stops trying. It
    // says the honest thing it has room for, and the full line is already on
    // the page one tap away, in At a Glance, in the operator's own words.
    return PAID_LABEL;
  }
  // ── AND A CONCESSION SAYS PAID WITHOUT NAMING A FIGURE ───────
  // The row told us somebody pays and never told us how much, so this is the
  // one branch where PAID_LABEL is the WHOLE answer rather than a fallback
  // from a line too long to print. `says` is deliberately not shown: it fits
  // inside CHIP_MAX and it would sit in the slot where "Free" sits one row
  // up, answering "who gets in free" to a reader asking "how much". The
  // operator's own line is already on the page, in At a Glance, one tap away.
  if (free === null && impliesPaid) return PAID_LABEL;
  return "";
};

// ── AND THE CATEGORY GETS ITS PUBLIC WORD BACK ──────────────────────
// The same word placeUrl.js chose for the URL, for the same reason: it is what
// a reader would call the thing. One vocabulary, used everywhere a person can
// see it.
// NAMED entryKindLabel AND NOT kindLabel, because placeKind.js already exports
// a kindLabel and it answers a different question — Town, District, Area, about
// where a place sits inside another place. DetailPage imports that one. Two
// exports with one name, imported into one file, is a rename waiting to pick
// the wrong one silently.
export const ENTRY_KIND_LABEL = {
  free: "Attraction",
  craft: "Workshop",
  booking: "Workshop",
  food: "Food",
  foodStreet: "Food",
  night: "Nightlife",
  nightStreet: "Nightlife",
  nightlife: "Nightlife",
  festival: "Event",
  event: "Event",
  town: "Town",
};
export const entryKindLabel = (kind, fallback = "") => ENTRY_KIND_LABEL[String(kind || "")] || fallback;

// ── "WHAT DO WE DO ABOUT THE 'FREE' AND 'WALK IN NO BOOKING'" ───────
//
// Oliver, 1 Sep 2026, looking at the Attractions grid. The first half of that
// question was already answered — entryPrice above gives three answers and a
// qualified free prints nothing. The second half had never been asked.
//
// "Walk in, no booking" was a HARDCODED STRING. Not a wrong reading of a
// field: there is no booking field on an attraction row anywhere in the schema,
// and nothing was ever consulted. Every non-craft card in the grid carried it,
// always.
//
// It is the same fault as the FREE one and worse in two ways.
//
//   IT GOT LOUDER AS WE KNEW LESS. The ternary read `free === true ? "🆓 Walk
//   in" : "Walk in, no booking"`, so a row whose door is confirmed free got the
//   softer chip and a row we knew NOTHING about got the bolder claim. The
//   strongest sentence on the least evidence.
//
//   AND THE SITE CONTRADICTED ITSELF. The essentials Oliver asked for in August
//   tell a reader "Denmark's bigger attractions take timed entry in summer".
//   AROS Aarhus Art Museum sells timed entry in summer, and its card said "Walk
//   in, no booking".
//
// So booking gets the same three answers money already has, in the same order
// and for the same reason: an explicit "book ahead" beats an explicit "walk
// in", because being turned away at a door is the expensive mistake and being
// told to book something you did not need to is the cheap one.
//
//   true    the row says you can turn up
//   false   the row says something has to be booked or timed
//   null    the row does not say, and the card says nothing
//
// A craft workshop is not read here. It has had a real `bookingType` field
// since it was written, the card already renders it, and a second opinion about
// the same question is how two answers start disagreeing.
// ── AND NOT `desc`, WHICH IS THE FAULT I HAD JUST FIXED FOR PRICES ──
//
// Fable, 1 Sep 2026. `desc` was in this list, so the chip was a regex over the
// entry's free prose and it fired on things that are not the door:
//
//   "Free to wander. You can book online for the tower climb."  → Book ahead
//   "The café is a popular drop-in for cyclists."               → Walk in
//   "The restaurant next door needs a reservation."             → Book ahead
//
// That is exactly A_THING_INSIDE one file along: a tower climb, a café, the
// restaurant next door. I removed a hardcoded chip and replaced it with a
// prose-derived one that is wrong in both directions — and bookingProblems then
// reported those rows as ANSWERED, so they never reached the worklist either.
//
// The fields left are the ones where a row states a FACT ABOUT ADMISSION.
// bookingNote is the field the writer is asked to fill for exactly this, and it
// is told to leave it empty when the page does not say. Prose stays out.
export const BOOKING_FIELDS = ["bookingNote", "ticketsGlance", "ticketInfo"];

// Danish first, and both halves anchored on a NOUN or a full phrase rather than
// a loose verb: "book" alone appears in "book a table at the café", which is
// not a statement about the door.
export const NEEDS_BOOKING = /\b(?:timed\s+entry|timed\s+ticket|time\s?slot|tidsbestilling|tidsbestemt|book\s+(?:ahead|in\s+advance|a\s+ticket|online|your\s+ticket)|pre-?book|advance\s+booking|booking\s+(?:required|essential|necessary)|reservation\s+(?:required|essential)|forudbestilling|skal\s+bookes|skal\s+bestilles|kr[æa]ver\s+booking|kun\s+efter\s+aftale|by\s+appointment|guided\s+tour\s+only|kun\s+med\s+rundvisning)\b/i;

// The other direction, said in words rather than inferred from the absence of
// the first. That distinction is the whole point: a row that says nothing is
// not a row that says you can walk in.
export const WALK_IN = /\b(?:no\s+(?:booking|ticket|reservation)\s+(?:required|needed|necessary)|walk[\s-]?in(?:s)?\s+welcome|just\s+turn\s+up|ingen\s+booking|ingen\s+tidsbestilling|kr[æa]ver\s+ikke\s+booking|fri\s+adgang\s+uden\s+booking|drop[\s-]?in)\b/i;

const bookingText = (row) => BOOKING_FIELDS
  .map(f => String((row && row[f]) == null ? "" : row[f]))
  .filter(Boolean)
  .join(" · ");

export const entryBooking = (row) => {
  const says = bookingText(row);
  if (!says.trim()) return { walkIn: null, says: "" };
  // ── THE WALK-IN PHRASE IS CUT OUT BEFORE THE BOOKING TEST ────────
  //
  // Caught on the first probe, and it is the same trap as "free for children
  // under 18": the qualifier is the meaning. "No booking required" CONTAINS
  // "booking required", so a plain NEEDS_BOOKING test read a row that says you
  // can turn up and told the reader to book ahead — the exact opposite of what
  // the row says, which is the one direction worth being careful about here.
  //
  // A negative lookbehind would fix that one phrase. Removing the walk-in
  // statements first fixes the shape: they are complete sentences, so what is
  // LEFT is whatever else the row demands.
  //
  // And it keeps the order that matters. Booking still beats walk-in, which is
  // the mirror of "an amount beats the word free": "grounds are drop-in, the
  // tower needs a timed ticket" loses the drop-in and keeps the timed ticket,
  // so it answers false. Being turned away at a door is the expensive mistake.
  const saidWalkIn = WALK_IN.test(says);
  const rest = says.replace(new RegExp(WALK_IN.source, "gi"), " ");
  if (NEEDS_BOOKING.test(rest)) return { walkIn: false, says };
  if (saidWalkIn) return { walkIn: true, says };
  return { walkIn: null, says };
};

// What the card prints, or "" for the answer nobody has given. Kept here beside
// priceChip so the two claims on one card are written in one file.
export const bookingChip = (row) => {
  const { walkIn } = entryBooking(row);
  if (walkIn === true) return "Walk in, no booking";
  if (walkIn === false) return "Book ahead";
  return "";
};
