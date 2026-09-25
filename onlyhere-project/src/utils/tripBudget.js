// ── A DAILY BUDGET THAT HAS TO COVER A BED ──────────────────────────
//
// Oliver, 25 Sep 2026, after asking what the field even meant: "make it limit.
// So you can't write under like 300. Because if we're planning their trip,
// then it's unlikely they have booked a hotel somewhere (unless it's in
// Copenhagen), so we have to include that in the price too. Write that it
// includes accomodation. And make people able to write in other currencies
// too."
//
// The reasoning is the part worth keeping. Gemlyx plans trips for people who
// have not booked anywhere, and the intake asks whether a hotel is booked
// precisely because the usual answer is no. A daily figure that quietly leaves
// the bed out is therefore a figure about a trip nobody is taking, and it was
// being read that way: a traveller typed 200 and got a plan that could not
// house them for one night.
//
// ── WHAT THE FIELD MEANT BEFORE THIS, WHICH WAS NOTHING ─────────────
//
// `travellerBudget` turns whatever is typed into a TIER, and outOfBudget uses
// that tier to hold one expensive place back. Nothing added anything up, so
// "does 200 include a bed" had no answer in the code at all. It has one now,
// it is written on the field, and the floor enforces it.
//
// ── AND THE RATE IS NEVER HARDCODED ─────────────────────────────────
//
// api/fx.js states the rule in its own words: "There is no fallback table and
// there must never be one: a hardcoded rate is a number that is wrong by a
// little at first and by a lot later, silently." So this file holds no rates.
// It takes a reader, the same way costLines takes its distances and
// placeContainer takes its town lookup, and the ONE place that knows how to
// fetch a rate stays the one place that fetches it.
//
// A currency nothing can convert does not block anybody. Refusing to plan a
// trip because a rate call failed is a worse answer than planning it, and the
// floor exists to catch an impossible figure rather than to police the form.

// ── THE FLOOR ───────────────────────────────────────────────────────
//
// 300 DKK a day, his number. Deliberately below what the trip will really cost
// most people, because this is a floor and not an estimate: it exists to stop a
// figure that cannot buy a night anywhere in the country, not to argue with
// somebody who travels cheaply. The guide's own bed search is what produces a
// real number, per trip, later. See tripEstimate in utils/costLedger.js.
export const MIN_DAY_DKK = 300;

// ── WHAT THE FIELD SAYS IT IS ───────────────────────────────────────
//
// One string, shared by the form and by the tests, because a label that
// promises one thing while the check enforces another is how this question got
// confusing in the first place. "Where you sleep" rather than "accommodation":
// the reader is an ordinary traveller and not a booking system, and the voice
// rules ask for the simpler word every time.
export const BUDGET_LABEL = "Budget a day, including where you sleep";
export const BUDGET_PLACEHOLDER = "e.g. 450 kr, 60 EUR, 70 USD";

// ── THE CURRENCIES SOMEBODY MIGHT TYPE ──────────────────────────────
//
// The codes api/fx.js already allows, plus the ways people write them by hand.
// Kroner first and by several spellings, because this is a Danish form and
// "kr", "kr.", "DKK" and "kroner" are one answer.
const CURRENCIES = [
  { code: "DKK", words: ["dkk", "kr", "kr.", "kroner", "krone", "danish kroner", "danske kroner"], symbol: "" },
  { code: "EUR", words: ["eur", "euro", "euros"], symbol: "\u20ac" },
  { code: "USD", words: ["usd", "dollar", "dollars", "us dollars"], symbol: "$" },
  { code: "GBP", words: ["gbp", "pound", "pounds", "quid"], symbol: "\u00a3" },
  { code: "SEK", words: ["sek", "swedish kronor", "svenske kroner"], symbol: "" },
  { code: "NOK", words: ["nok", "norwegian kroner", "norske kroner"], symbol: "" },
  { code: "CHF", words: ["chf", "franc", "francs"], symbol: "" },
  { code: "PLN", words: ["pln", "zloty", "z\u0142oty"], symbol: "" },
  { code: "CAD", words: ["cad", "canadian dollars"], symbol: "" },
  { code: "AUD", words: ["aud", "australian dollars"], symbol: "" },
];
export const BUDGET_CURRENCIES = CURRENCIES.map(c => c.code);

const clean = (s) => String(s ?? "").trim();
const lower = (s) => clean(s).toLowerCase();

// ── READING WHAT THEY TYPED ─────────────────────────────────────────
//
// A number, and a currency if they named one. "200", "200 dkk", "40 eur",
// "\u20ac40", "$50 a day", "300 kr/dag", "500 kroner pr. dag" are all answers to
// the same question.
//
// A RANGE TAKES ITS LOW END, because a floor is about the worst case the
// traveller is planning for: somebody who writes "300-500" is telling us 300 is
// a day they expect to have.
//
// NO CURRENCY MEANS KRONER, and that is the one guess in this file. It is safe
// here for a reason that does not generalise: the field now says what it wants
// and the form is about a trip to Denmark, so a bare number is a Danish number.
// It is also the STRICTEST reading, since kroner are the smallest of the
// plausible units, so guessing wrong can only ever let somebody through rather
// than stop them wrongly.
const NUM = "\\d[\\d.,\\u00a0 ]*";
export const readDailyBudget = (text) => {
  const raw = clean(text);
  if (!raw) return null;
  const hay = lower(raw);
  // The symbol can lead the number and the word can follow it, so both shapes
  // are tried before the bare one.
  let currency = "";
  for (const c of CURRENCIES) {
    if (c.symbol && raw.includes(c.symbol)) { currency = c.code; break; }
    // Whole words, so "kroner" does not match inside another word and "kr"
    // does not match inside "kroner" first and lose the longer spelling.
    const words = [...c.words].sort((a, b) => b.length - a.length);
    if (words.some(w => new RegExp(`(?:^|[^a-z\u00e6\u00f8\u00e5])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z\u00e6\u00f8\u00e5])`, "i").test(hay))) { currency = c.code; break; }
  }
  const nums = hay.match(new RegExp(NUM, "g")) || [];
  // A thousands separator is not a decimal point here: nobody budgets 1.5 kr a
  // day, and "1.500" is fifteen hundred in Danish. Separators come out and the
  // figure is read whole.
  const amounts = nums
    .map(n => Number(String(n).replace(/[^\d]/g, "")))
    .filter(n => Number.isFinite(n) && n > 0);
  if (!amounts.length) return null;
  return { amount: Math.min(...amounts), currency: currency || "DKK", said: raw, assumedCurrency: !currency };
};

// ── AND WHAT THAT IS IN KRONER ──────────────────────────────────────
//
// `rateToDkk` is injected and answers one question: how many kroner is one unit
// of this currency. Null from it means nobody could convert, and null out of
// here means the same thing, which the caller reads as "do not block".
export const dailyInDkk = (read, rateToDkk) => {
  if (!read || !Number.isFinite(read.amount)) return null;
  if (read.currency === "DKK") return read.amount;
  if (typeof rateToDkk !== "function") return null;
  let rate = null;
  try { rate = rateToDkk(read.currency); } catch { rate = null; }
  return Number.isFinite(rate) && rate > 0 ? read.amount * rate : null;
};

// ── THE ANSWER THE FORM ACTS ON ─────────────────────────────────────
//
// A problem, or null. Null covers three different states and that is
// deliberate: nothing typed, a figure that clears the floor, and a figure
// nobody could convert. Only the middle one is an approval, and the form does
// not need to tell them apart because all three mean "carry on".
export const budgetProblem = (text, rateToDkk) => {
  const read = readDailyBudget(text);
  if (!read) return null;
  const dkk = dailyInDkk(read, rateToDkk);
  if (dkk == null || dkk >= MIN_DAY_DKK) return null;
  const inOwn = read.currency === "DKK"
    ? `${read.amount} DKK`
    : `${read.amount} ${read.currency}, about ${Math.round(dkk)} DKK,`;
  return {
    dkk: Math.round(dkk),
    currency: read.currency,
    amount: read.amount,
    // Says what is wrong, what the floor is, and why the floor exists. No
    // sentence explaining what the control does: this only appears once a
    // figure has been typed that the trip cannot be built on.
    say: `${inOwn} a day does not cover a bed anywhere in Denmark, and this figure has to, because Gemlyx plans for people who have not booked one. ${MIN_DAY_DKK} DKK a day is the lowest it can work with.`,
  };
};
