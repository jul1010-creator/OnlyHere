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
export const PRICES = {
  // Per million tokens, {in, out}. Null means "we do not have a rate for this",
  // which sends the call to unpriced rather than silently costing it at zero.
  models: {
    "claude-sonnet-5": { in: null, out: null },
    "claude-opus-5": { in: null, out: null },
    "gpt-5.6-sol": { in: null, out: null },
    perplexity: { in: null, out: null },
  },
  // Per request, in dollars. Same rule: null means unpriced, never free.
  perRequest: {
    tavily: null,
    directions: null,
    places: null,
    placesHours: null,
    weather: null,
    geocode: 0,        // Nominatim is free and that is a fact, not a guess
    commonsPhoto: 0,   // Wikimedia is free
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

const priceTokens = (model, tokensIn, tokensOut) => {
  const rate = PRICES.models[model];
  if (!rate || rate.in == null || rate.out == null) return null;
  return (tokensIn / 1e6) * rate.in + (tokensOut / 1e6) * rate.out;
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
  return {
    label,
    runs: runs.length,
    completeRuns: complete.length,
    avgMeasured: runs.reduce((a, r) => a + r.measured, 0) / runs.length,
    avgCalls: runs.reduce((a, r) => a + r.calls, 0) / runs.length,
    avgTokens: runs.reduce((a, r) => a + r.tokensIn + r.tokensOut, 0) / runs.length,
    // True only when EVERY run in the average was itself complete.
    complete: complete.length === runs.length,
  };
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
