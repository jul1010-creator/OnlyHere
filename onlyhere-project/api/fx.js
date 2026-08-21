// /api/fx.js
// What 100 DKK is worth, once, on the day a guide is built.
//
// ── WHY THIS EXISTS, AND WHY IT IS THIS SMALL ────────────────────────
//
// Oliver, 21 Aug 2026, having read a line in one of his own guides: "Stay near
// Nyhavn in central Copenhagen at a budget hostel, since hostels here run around
// DKK 600/night while central hotels start near $200." His verdict: "That's just
// not true at all.." Then: "In the create an account, ask what country they're
// from. Because then the guide can probably write in their currency."
//
// The obvious reading of that request is the one that caused the bug. Converting
// every price means a model doing arithmetic in prose, and every bracket it
// fills is a figure nothing read off a page. That is how $45, $182 and $200 got
// into a guide about a country that prices everything in kroner.
//
// So the prices stay in DKK, which is what the sign and the ticket app say, and
// this endpoint answers ONE question, ONCE, for the whole guide: what is 100 DKK
// worth where you live, today. One rate, fetched rather than reasoned, stamped
// with its date. A reader can do the rest of the arithmetic themselves and will
// do it better, because they know whether they care.
//
// ── THE SOURCE ───────────────────────────────────────────────────────
//
// frankfurter.dev publishes the European Central Bank's daily reference rates.
// No key, no account, no per-call cost, and the underlying numbers are the ECB's
// own, which is about as citable as a retail traveller needs. Rates update on
// working days around 16:00 CET; a weekend or a holiday returns the last working
// day's, and the response says which date it is giving, so that is what gets
// stamped rather than "today".
//
// ── AND IT FAILS BY SAYING NOTHING ───────────────────────────────────
//
// Every other route in this folder that could not answer honestly now refuses
// rather than guessing: api/ask.js returns 503 instead of serving an unmetered
// answer, and the comment there is the rule this follows too, that a thing which
// cannot be read must not become a thing that does not apply. A rate is a
// convenience. If it cannot be fetched, the guide simply carries no rate line,
// and every price in it is still correct, because every price in it is in DKK.
// There is no fallback table and there must never be one: a hardcoded rate is a
// number that is wrong by a little at first and by a lot later, silently.

import { requestIsFromSite, NOT_FROM_SITE } from "../src/utils/apiGuard.js";

// The currencies the account picker can produce. Kept as a list rather than
// passed straight through, because this value goes into a URL and an unchecked
// one is an open redirect of somebody else's API on our origin's behalf.
const ALLOWED = new Set([
  "SEK", "NOK", "EUR", "GBP", "USD", "CAD", "PLN", "CHF",
  "ISK", "CZK", "AUD", "JPY", "CNY", "INR", "BRL",
]);

// A hundred kroner rather than one, because one krone converts to a number with
// a leading zero in every currency on the list and nobody holds a sense of scale
// from "0.11". A hundred is also roughly a lunch, so the figure lands on
// something a traveller can picture.
const BASE_AMOUNT = 100;

// Two decimals for the small ones, none for the currencies where a decimal is
// noise. JPY has no minor unit in practice, and 1,600 ISK does not need a
// fractional part any more than 1,600 kroner would.
const WHOLE_UNITS = new Set(["JPY", "ISK", "INR", "CZK"]);

export default async function handler(req, res) {
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  const to = String(req.query?.to || "").toUpperCase();
  if (!to) return res.status(400).json({ error: "Which currency?" });
  // DKK to DKK is not a conversion and a Danish reader is not asking for one.
  if (to === "DKK") return res.status(400).json({ error: "DKK needs no conversion." });
  if (!ALLOWED.has(to)) return res.status(400).json({ error: `No rate is offered for ${to}.` });

  try {
    const r = await fetch(`https://api.frankfurter.dev/v1/latest?base=DKK&symbols=${to}`, {
      headers: { Accept: "application/json" },
    });
    if (!r.ok) {
      // Named rather than swallowed, so a rate that stops arriving is visible in
      // the function log instead of just quietly never appearing on a guide.
      console.warn(`fx: frankfurter answered ${r.status} for DKK->${to}`);
      return res.status(502).json({ error: "No rate available just now." });
    }
    const data = await r.json();
    const rate = Number(data?.rates?.[to]);
    // A response that parsed but carries no number is not a rate. The same shape
    // as api/ask.js reading a missing content-range header as zero: the honest
    // reading of a missing value is that the value is unknown.
    if (!Number.isFinite(rate) || rate <= 0) {
      console.warn(`fx: no usable rate in the response for DKK->${to}`);
      return res.status(502).json({ error: "No rate available just now." });
    }
    const amount = rate * BASE_AMOUNT;
    return res.status(200).json({
      base: "DKK",
      baseAmount: BASE_AMOUNT,
      to,
      amount: WHOLE_UNITS.has(to) ? Math.round(amount) : Math.round(amount * 100) / 100,
      // THE DATE THE ECB PUBLISHED, not the date we asked. A guide saved today
      // and read in March should say which day its rate is from, and saying
      // "today" would make it lie the moment it was saved.
      on: String(data?.date || "").slice(0, 10),
      source: "European Central Bank, via frankfurter.dev",
    });
  } catch (err) {
    console.warn("fx: rate lookup threw", err);
    return res.status(502).json({ error: "No rate available just now." });
  }
}
