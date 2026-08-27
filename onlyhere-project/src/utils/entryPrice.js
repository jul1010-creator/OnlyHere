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
  if (AMOUNT.test(entry)) return { free: false, says: entry };
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
  if (isUnqualifiedFree(entry)) return { free: true, says: entry };
  // It says free, and the rest of the sentence says who or what it is free FOR.
  // Not a free attraction, and not a price we can print either.
  if (SAYS_FREE.test(entry)) return { free: null, says: entry };
  // A row that says nothing about entry but prices an ADD-ON has still not told
  // us what the door costs. "Audio guide 40 DKK" is not an entry fee and is not
  // a claim that entry is free either.
  if (extra) return { free: null, says: entry || "" };
  return { free: null, says: "" };
};

// The chip. "Free" only when the row says so, the row's own short words when it
// charges and they are short enough to be a chip, and "" when it has not said —
// which renders as no chip at all rather than as a guess.
export const CHIP_MAX = 24;
export const priceChip = (row) => {
  const { free, says } = entryPrice(row);
  if (free === true) return "Free";
  // ── TOO LONG FOR A CHIP IS NOT THE SAME AS NOTHING TO SAY ──────
  // "Day ticket 419 DKK, under 3 free" does not fit in a chip, and dropping it
  // leaves the card silent about a place that charges. The row's own figure
  // does fit, so that is what goes in.
  if (free === false) {
    if (says.length <= CHIP_MAX) return says;
    // ── AND A RANGE IS SHOWN FROM ITS BOTTOM, NOT ITS TOP ────────
    // Faarup Sommerland's own line is "1-day ticket 229 to 399 DKK". Only the
    // 399 carries the currency, so reading the first complete amount picks the
    // most expensive end of a range and prints it as the price. entryAudit
    // settled this question already, for the same reason: "what a reader plans
    // around is the cheapest way through the gate."
    const r = RANGE.exec(says);
    if (r) return `from ${r[1]} ${r[2]}`.replace(/\s+/g, " ").trim();
    const m = AMOUNT.exec(says);
    return m ? m[0].replace(/^[^\d]+/, "").trim() : "";
  }
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
