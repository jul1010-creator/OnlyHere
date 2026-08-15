// ── WHAT A GUIDE ACTUALLY COSTS ─────────────────────────────────────
//
// Oliver, 10 Aug 2026: "This product will cost me money to advertise and sell.
// But I have no idea how to." And then, the sentence this file exists for: "It
// also costs me ALOT of money if I just have 3 users."
//
// He is about to sit in front of a CEO who runs pick and pack, a business whose
// whole discipline is cost per order. The first question he will be asked is
// what one guide costs, and "a lot" is not an answer that gets useful advice
// back. This measures it.
//
// ── THE RULE THIS FILE IS BUILT AROUND ──────────────────────────────
// The project's first standing rule is that nothing states a number the
// pipeline did not verify. A cost meter is the easiest possible place to break
// that: adding up the calls that happen to report their usage, calling the
// result "cost", and quietly leaving out the ones that do not. That number
// would be too low, it would look precise, and it would be the number he
// repeats out loud in a meeting.
//
// So this is ALL-OR-NOTHING, the same way the trip totals are. Every call is
// recorded in exactly one of three states:
//
//   measured   the API told us its real token usage, and we have a price for
//              that model. This is a fact.
//   counted    the service charges per request rather than per token, so the
//              count IS the measurement. Also a fact, at whatever the
//              per-request price is set to below.
//   unpriced   the call happened and we cannot cost it, because the API
//              reported no usage or nothing has told us the price.
//
// A run with even one unpriced call reports `complete: false`, and every
// display of it has to say so. A partial total presented as a total is the
// misleading kind of wrong, and it is worse here than anywhere else in the app,
// because the whole point is to carry this figure into a conversation about
// money.
//
// ── PRICES ARE INPUTS, NOT FACTS ────────────────────────────────────
// The rates below are NOT verified by this codebase and will drift. They are a
// starting point to be replaced with the real numbers off his own provider
// dashboards, which is the only place the true rate exists. Everything is in
// US dollars per million tokens, or per request where a service bills that way.
// Change them here and every figure in the app follows, because there is one
// table and it is read rather than copied.
//
// ── FILLED IN 15 AUG 2026 ───────────────────────────────────────────
// Oliver: "Can you give me an estimate on how much it costs to generate a post?
// Because I feel like I am really paying alot of money."
//
// Every rate here was null, so the panel printed "no rates set" and the meter
// he already had could not answer the one question it was built for. These come
// off the providers' own published pages on 15 Aug 2026, listed per line, and
// they are still INPUTS: a published list price is not his invoice. Discounts,
// batch, caching and the free monthly allowances below all move it. When he
// checks a dashboard, the real number replaces the number here and every figure
// in the app follows.
//
// ── AND THE FREE TIERS ARE WHY GOOGLE IS NOT THE PROBLEM ────────────
// Maps Platform gives a monthly allowance per SKU: 10,000 Routes Essentials,
// 5,000 Text Search Pro, 1,000 Place Details Enterprise, 10,000 Geocoding. At
// tens of drafts a month every Google call is inside it, so the list prices
// below OVERSTATE what those lines actually cost him. Deliberately not modelled:
// a meter that tracks a monthly allowance has to know the month, the account and
// what else spent it, and a number that pretends to know is worse than a ceiling
// that says so. Treat the Google lines as an upper bound.
export const PRICES = {
  // Per million tokens, {in, out}. Null means "we do not have a rate for this",
  // which sends the call to unpriced rather than silently costing it at zero.
  // `perCall` is a flat fee charged on TOP of the tokens, which is not an edge
  // case: it is most of what Perplexity costs, and leaving it out would have
  // made the cheapest-looking line on the bill the second most expensive one.
  models: {
    // platform.claude.com/docs/en/about-claude/pricing, 15 Aug 2026
    "claude-sonnet-5": { in: 2, out: 10 },
    "claude-opus-5": { in: 5, out: 25 },
    // developers.openai.com/api/docs/models/gpt-5.6-sol, 15 Aug 2026
    "gpt-5.6-sol": { in: 5, out: 30 },
    // docs.perplexity.ai/docs/getting-started/pricing, 15 Aug 2026. api/perplexity.js
    // sends model "sonar", which is $1/$1 per million PLUS a search fee of $5 to
    // $12 per 1000 requests depending on context size. Medium taken here, and it
    // dwarfs the tokens: a sonar call is roughly 90% fee and 10% tokens.
    perplexity: { in: 1, out: 1, perCall: 0.008 },
  },
  // Per request, in dollars. Same rule: null means unpriced, never free.
  perRequest: {
    // Tavily basic search is 1 credit (api/search.js sends search_depth "basic"),
    // and pay as you go is $0.008 a credit. A paid plan is cheaper, down to
    // $0.005 on Growth, so this is the ceiling.
    tavily: 0.008,
    // Google Maps Platform list prices, developers.google.com/maps/billing-and-pricing/pricing,
    // 15 Aug 2026. Free allowance per month noted; not modelled, see above.
    directions: 0.005,      // Routes Compute Routes Essentials, $5/1000, 10k free
    places: 0.032,          // Nearby Search Pro, $32/1000, 5k free
    placesLocate: 0.032,    // Text Search Pro, $32/1000, 5k free
    placesHours: 0.020,     // Place Details Enterprise, $20/1000, 1k free
    weather: 0,             // MET Norway, free, and that is a fact not a guess
    tickets: 0,             // Ticketmaster Discovery, free tier
    scanSource: 0,          // our own fetch, no third party bills for it
    geocode: 0,             // Nominatim is free and that is a fact, not a guess
    commonsPhoto: 0,        // Wikimedia is free
  },
};

const emptyRun = (label) => ({
  label,
  startedAt: null,
  endedAt: null,
  calls: [],
  measured: 0,     // dollars we can stand behind
  unpriced: 0,     // number of calls we cannot cost at all
  tokensIn: 0,
  tokensOut: 0,
});

let current = null;
const finished = [];
const MAX_KEPT = 25;

// A run is one thing a person asked for: a guide build, or one Studio draft.
// Costing anything smaller tells him nothing he can price against, and costing
// anything larger hides which of the two is expensive.
export const startRun = (label) => {
  if (current) endRun();          // a run left open by a thrown build is closed, not merged
  current = emptyRun(label);
  return current;
};

export const endRun = () => {
  if (!current) return null;
  const run = current;
  current = null;
  finished.unshift(run);
  if (finished.length > MAX_KEPT) finished.length = MAX_KEPT;
  return run;
};

// ── A FLAT FEE ON TOP OF THE TOKENS IS STILL THE BILL ───────────────
// Perplexity charges $1 per million each way and then $5 to $12 per THOUSAND
// requests for the search itself. Pricing sonar on tokens alone reports about a
// tenth of what it costs, and it would have reported it as `measured`, which is
// this file's word for "this is a fact". A rate with no perCall is unaffected.
const priceTokens = (model, tokensIn, tokensOut) => {
  const rate = PRICES.models[model];
  if (!rate || rate.in == null || rate.out == null) return null;
  return (tokensIn / 1e6) * rate.in + (tokensOut / 1e6) * rate.out + (rate.perCall || 0);
};

// ── RECORDING A CALL ────────────────────────────────────────────────
// `usage` is whatever the provider sent back. Anthropic and OpenAI both return
// {input_tokens, output_tokens} or {prompt_tokens, completion_tokens} depending
// on the endpoint, and the proxies in api/ pass the upstream body through
// untouched, so both shapes arrive here. Reading both is not defensive
// programming, it is two real shapes.
export const recordModelCall = (service, model, usage) => {
  if (!current) return;
  const tokensIn = Number(usage?.input_tokens ?? usage?.prompt_tokens ?? NaN);
  const tokensOut = Number(usage?.output_tokens ?? usage?.completion_tokens ?? NaN);
  // NOT `|| 0`. Number(null) is 0 and 0 is a perfectly finite number of tokens,
  // so a missing usage block would record as a real, free call and quietly pull
  // the average down. This is the trap named in the 10 Aug handoff, met in the
  // one file where it would do the most damage.
  const known = Number.isFinite(tokensIn) && Number.isFinite(tokensOut);
  const cost = known ? priceTokens(model, tokensIn, tokensOut) : null;
  current.calls.push({ service, model, tokensIn: known ? tokensIn : null, tokensOut: known ? tokensOut : null, cost, state: cost == null ? "unpriced" : "measured" });
  if (known) { current.tokensIn += tokensIn; current.tokensOut += tokensOut; }
  if (cost == null) current.unpriced += 1; else current.measured += cost;
};

export const recordRequestCall = (service) => {
  if (!current) return;
  const rate = PRICES.perRequest[service];
  const cost = rate == null ? null : rate;
  current.calls.push({ service, model: null, tokensIn: null, tokensOut: null, cost, state: cost == null ? "unpriced" : "counted" });
  if (cost == null) current.unpriced += 1; else current.measured += cost;
};

// ── WHAT IT ADDS UP TO, HONESTLY ────────────────────────────────────
// `complete` is the whole point. False means there are calls in this run that
// nothing can cost, so `measured` is a FLOOR and not a total, and anything
// showing it has to say so rather than rounding the doubt away.
export const summarise = (run) => {
  if (!run) return null;
  const byService = {};
  run.calls.forEach(c => {
    const b = byService[c.service] || (byService[c.service] = { calls: 0, cost: 0, unpriced: 0, tokensIn: 0, tokensOut: 0 });
    b.calls += 1;
    if (c.cost == null) b.unpriced += 1; else b.cost += c.cost;
    b.tokensIn += c.tokensIn || 0;
    b.tokensOut += c.tokensOut || 0;
  });
  return {
    label: run.label,
    calls: run.calls.length,
    tokensIn: run.tokensIn,
    tokensOut: run.tokensOut,
    measured: run.measured,
    unpriced: run.unpriced,
    complete: run.unpriced === 0 && run.calls.length > 0,
    byService,
  };
};

export const currentRun = () => current;
export const recentRuns = () => finished.slice();

// The average across finished runs of one kind. Deliberately refuses to average
// incomplete runs together with complete ones: mixing a floor with a total
// produces a number that is neither, and this is the figure most likely to be
// said out loud.
export const averageFor = (label) => {
  const runs = finished.filter(r => r.label === label).map(summarise);
  if (!runs.length) return null;
  const complete = runs.filter(r => r.complete);
  const totalCalls = runs.reduce((a, r) => a + r.calls, 0);
  const totalUnpriced = runs.reduce((a, r) => a + r.unpriced, 0);
  return {
    label,
    runs: runs.length,
    completeRuns: complete.length,
    avgMeasured: runs.reduce((a, r) => a + r.measured, 0) / runs.length,
    avgCalls: totalCalls / runs.length,
    avgTokens: runs.reduce((a, r) => a + r.tokensIn + r.tokensOut, 0) / runs.length,
    // ── "at least $0.0000 · 51 calls · 104.525 tok" ─────────────────
    // Oliver pasted that line back on 11 Aug, and it is nonsense. At least zero
    // dollars is true of everything anyone has ever done, and read at a glance
    // it says the run was free. It happens because every rate in PRICES is
    // still null, so `measured` is 0 and the panel printed the floor anyway.
    //
    // describe() has handled exactly this since it was written ("none of them
    // priced yet") and the panel never called it, because describe() takes a
    // summarise() and the panel holds an averageFor(). One describer, two
    // shapes, so the correct one was unreachable: the written-and-never-wired
    // failure this codebase keeps finding. These two fields are what make an
    // average describable, and describeAverage below is the single sentence.
    unpriced: totalUnpriced,
    priced: totalCalls - totalUnpriced,
    // True only when EVERY run in the average was itself complete.
    complete: complete.length === runs.length,
  };
};

// ── THE SENTENCE, IN ONE PLACE ──────────────────────────────────────
// Three states, and the middle one is the whole reason this exists:
//
//   every call priced   a real total, said plainly
//   some priced         a genuine floor, and "at least" earns its place
//   none priced         there is NO money figure. Not a small one. None.
//
// The token count prints in all three, because tokens are measured off the real
// API responses and stay true whatever the rates say. Somebody who wants to know
// what a run costs can multiply those by his own dashboard rate today, which is
// strictly more useful than a dollar sign in front of a zero.
export const describeAverage = (a) => {
  if (!a) return "";
  const calls = `${Math.round(a.avgCalls)} calls`;
  const tok = `${Math.round(a.avgTokens).toLocaleString()} tok`;
  if (a.priced === 0) return `${calls} · ${tok} · no rates set`;
  const money = `$${a.avgMeasured.toFixed(4)}`;
  return a.complete ? `${money} · ${calls} · ${tok}` : `at least ${money} · ${calls} · ${tok}`;
};

// One line a person can read, and which never overstates what it knows.
export const describe = (s) => {
  if (!s) return "Nothing measured yet.";
  if (!s.calls) return "No API calls recorded.";
  const money = `$${s.measured.toFixed(4)}`;
  if (s.complete) return `${money} across ${s.calls} calls`;
  const priced = s.calls - s.unpriced;
  if (priced === 0) return `${s.calls} calls, none of them priced yet. Set the rates in utils/apiCost.js.`;
  return `at least ${money} across ${s.calls} calls, and ${s.unpriced} of them have no price set, so the real figure is higher`;
};

// Test seam. The module keeps state on purpose (a build is spread over dozens of
// call sites and threading a recorder through all of them would be its own
// class of bug), and state that cannot be reset cannot be tested twice.
export const __reset = () => { current = null; finished.length = 0; };

// ── ONE PLACE, NOT TWENTY ───────────────────────────────────────────
// /api/search, /api/directions, /api/places, /api/weather and the rest are
// called from roughly twenty sites across App.jsx alone. Recording each by hand
// is the same shape as the content-type registration problem: about twenty
// hand-maintained sites, no way to notice a missed one, and the missed one is
// invisible because its only symptom is a total that is slightly too low.
//
// So the meter wraps fetch once and reads the endpoint out of the URL. A call
// site added next month is counted without anybody remembering to add it, and
// there is nothing to keep in sync.
//
// The three model endpoints are skipped here because aiClient records them with
// their real token usage, which is strictly better information. Counting them
// in both places would double them.
const MODEL_ENDPOINTS = new Set(["anthropic", "openai", "perplexity"]);
let installed = false;

export const installFetchMeter = () => {
  if (installed || typeof window === "undefined" || typeof window.fetch !== "function") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      const url = typeof input === "string" ? input : input?.url || "";
      const m = /^\/api\/([a-z0-9-]+)/i.exec(url);
      if (m && !MODEL_ENDPOINTS.has(m[1])) {
        // camelCase so "places-hours" matches the key in PRICES.perRequest.
        recordRequestCall(m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase()));
      }
    } catch { /* metering must never be able to break a request */ }
    return original(input, init);
  };
};
