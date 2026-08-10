import { recordModelCall, recordRequestCall } from "./apiCost";
// Shared, parameterized copies of App.jsx's own askClaude/parseClaudeJSON — pure
// functions (no closures over component state), pulled out so GuidePage.jsx's new
// "Include more" / "Make it simpler" / "Gemlyx AI" help controls can call Claude the
// same way App.jsx's Detour/Studio code already does, without duplicating this logic
// or reaching into App.jsx's component internals. App.jsx now imports these too
// (its own local copies were removed) — same behavior, just defined once.
// `expectJson` (optional 4th arg): callers that need a JSON reply set this so
// a conversational answer gets ONE automatic strict re-ask instead of killing
// the caller's whole pipeline. HISTORY, DO NOT REPEAT IT: the first attempt at
// solving the chatty-opening problem ("Got it — 4 days...", "Sounds like...")
// used assistant-message PREFILL — and the models this app runs on rejected it
// with a live 400 ("This model does not support assistant message prefill"),
// breaking every guide and Studio build in production until this replacement
// shipped. Never re-add prefill here without verifying against the real API
// first; this re-ask approach is plain user-messages only, so no model can
// reject it.
export const askClaude = async (prompt, maxTokens = 500, model = "claude-sonnet-5", expectJson = false) => {
  const callOnce = async (p, budget = maxTokens) => {
    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: budget,
          messages: [{ role: "user", content: p }],
        }),
      });
      const data = await res.json();
      // Recorded before the ok check on purpose: a call that failed after the
      // model had already read the prompt still costs money, and a cost meter
      // that only counts successes flatters the number it exists to report.
      recordModelCall("claude", model, data?.usage);
      if (!res.ok) { console.warn("Claude call failed:", res.status, data.error?.message || data); return { error: data.error?.message || `Request failed (${res.status})` }; }
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("").trim();
      if (!text) {
        console.warn("Claude returned no text block.", { stop_reason: data.stop_reason, blockTypes: data.content?.map(b => b.type), usage: data.usage });
        const hint = data.stop_reason === "max_tokens" ? " (response was cut off — ran out of tokens)" : "";
        return { error: `Empty response from Claude${hint}` };
      }
      return { text };
    } catch (err) {
      return { error: "Couldn't reach Claude — check the API key and your connection." };
    }
  };
  let out = await callOnce(prompt, maxTokens);
  // ── AN EMPTY REPLY ON A TIGHT BUDGET IS NOT A FAILURE, IT IS A
  //    BUDGET PROBLEM, AND IT HAS AN OBVIOUS ANSWER ─────────────────
  // Oliver's console, 7 Aug 2026: "Claude returned no text block. Claude won't
  // rewrite after fact-checking." That call asks for the ENTIRE corrected draft
  // back as JSON, on a hardcoded 3000 tokens, while the draft going in is
  // routinely bigger than that. There was nothing wrong with the request and
  // nothing wrong with the model. It ran out of room.
  //
  // Warning about it in the console, which is what happened before, means the
  // only person who ever finds out is someone who had devtools open at the
  // time. Retrying once with double the room costs one call and fixes the
  // entire class, including every future call whose budget someone guesses too
  // low. Only ONE retry, and only when the reply was genuinely empty: an empty
  // response for any other reason will be empty again and there is no point
  // paying twice to learn that.
  if (out.error && /Empty response from Claude/.test(out.error) && maxTokens < 16000) {
    const bigger = Math.min(16000, maxTokens * 2);
    console.warn(`Claude came back empty on ${maxTokens} tokens. Retrying once with ${bigger}.`);
    out = await callOnce(prompt, bigger);
  }
  // JSON-expected reply came back as pure prose (no object anywhere in it) —
  // one strict re-ask. The preamble guard in parseClaudeJSON already handles
  // the milder case of chit-chat FOLLOWED by intact JSON; this catches the
  // rarer all-prose reply that used to end as "Guide build failed: empty".
  if (expectJson && !out.error && out.text && !out.text.includes("{")) {
    console.warn("Claude replied with prose instead of JSON — re-asking once with a stricter instruction.");
    out = await callOnce(`${prompt}\n\nIMPORTANT: Your previous attempt replied with conversational text instead of JSON. Respond with ONLY the JSON object itself, starting immediately with the { character, no greeting, no explanation, nothing before or after the JSON.`, Math.min(16000, maxTokens * 2));
  }
  return out;
};

export const askPerplexity = async (prompt) => {
  try {
    const res = await fetch("/api/perplexity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    recordModelCall("perplexity", "perplexity", data?.usage);
    // Log the REAL error to console even though every call site here treats a
    // Perplexity failure as non-fatal (silent skip) — otherwise a broken model
    // name or bad key just reads as "Perplexity found nothing", never as
    // "Perplexity is broken".
    if (!res.ok) { console.warn("Perplexity call failed:", res.status, data.error || data); return { error: data.error || `Request failed (${res.status})` }; }
    return { text: data.text || "No response text.", citations: data.citations || [] };
  } catch (err) {
    return { error: "Couldn't reach Perplexity — check the API key and your connection." };
  }
};

// RETRY-BEFORE-FAIL: the hard-fail policy in generateArea() (in App.jsx) is
// deliberate — a genuine outage should stop a draft rather than silently
// publishing on partial research. But a single flaky request isn't the same
// as a real outage, and nuking an entire draft attempt over one transient
// blip is needless friction. This retries the SAME API up to 2 extra times
// (3 attempts total, short pause between) before actually giving up — no
// fallback to a different/weaker model (that was considered and rejected:
// it would silently swap in a less reliable source with no visible sign it
// happened, which defeats the point of the hard-fail rule). `isFailure`
// inspects each attempt's result to decide whether to retry.
export const withRetry = async (fn, isFailure, label, attempts = 3) => {
  let lastResult;
  for (let i = 0; i < attempts; i++) {
    try {
      lastResult = await fn();
      if (!isFailure(lastResult)) return lastResult;
      console.warn(`${label}: attempt ${i + 1}/${attempts} failed${i < attempts - 1 ? ", retrying..." : ", giving up."}`, lastResult);
    } catch (err) {
      lastResult = { error: String(err) };
      console.warn(`${label}: attempt ${i + 1}/${attempts} threw${i < attempts - 1 ? ", retrying..." : ", giving up."}`, err);
    }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 600));
  }
  return lastResult;
};

// THE WRITER RULE, and it is a rule, not a preference:
//
//   Perplexity and Tavily research. OpenAI PLANS and STRUCTURES. Claude WRITES.
//
// OpenAI's entire job is research query planning, organizing raw findings into
// notes, extracting named candidates out of search results, and flagging bad
// prose it is never allowed to rewrite itself. Every sentence that reaches a
// traveler is Claude's, including short ones: a 40-word loading-screen fact is
// published prose exactly like a 400-word blog section is.
//
// HISTORY, so this does not rot again: this comment already said all of the
// above, twice, in slightly different words, while the Studio fact generator
// two files away called askOpenAI to write the fact text itself. It had done so
// since PASS 40. A comment cannot fail a build, so the rule is now enforced in
// tests/run.mjs ("OPENAI NEVER WRITES PROSE"), which reads App.jsx as text and
// fails if a new askOpenAI call site appears without a human signing off on it.
// If that test fails, do not raise its expected count to make it green. Read
// the new call site and ask whether OpenAI is planning or writing.
export const askOpenAI = async (prompt, maxTokens = 800) => {
  const out = await openAIOnce(prompt, maxTokens);
  // One retry, tripled, for the same reason as askClaude above, and see the
  // comment on the empty branch for why tripled and not doubled.
  if (out.empty && maxTokens < 12000) {
    const bigger = Math.min(12000, maxTokens * 3);
    console.warn(`OpenAI came back empty on ${maxTokens} tokens. Retrying once with ${bigger}.`);
    return await openAIOnce(prompt, bigger);
  }
  return out;
};

const openAIOnce = async (prompt, maxTokens) => {
  try {
    const res = await fetch("/api/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.6-sol",
        messages: [{ role: "user", content: prompt }],
        // CONFIRMED BUG (from live console error): "gpt-5.6-sol" rejects
        // max_tokens with "Unsupported parameter... Use 'max_completion_tokens'
        // instead" — this is the real OpenAI reasoning-model behavior (o1/o3-style
        // models dropped max_tokens entirely). This was silently killing Stage 1
        // (research planning) and Stage 4 (note structuring) on every single draft.
        max_completion_tokens: maxTokens,
      }),
    });
    const data = await res.json();
    recordModelCall("openai", "gpt-5.6-sol", data?.usage);
    // Same reasoning as askGemini: planning (Stage 1) and structuring (Stage 4)
    // both swallow OpenAI failures silently by design (a miss here just degrades
    // to raw research, never blocks the draft) — but that means a genuinely
    // broken OpenAI call (wrong model string, a param the model doesn't accept)
    // could fail on EVERY single draft forever without ever surfacing anywhere.
    // Logging it here is the only way to actually notice that.
    if (!res.ok) { console.warn("OpenAI call failed:", res.status, data.error?.message || data.error || data); return { error: data.error?.message || `Request failed (${res.status})` }; }
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      // DIAGNOSTIC: "gpt-5.6-sol" is a reasoning-tier model — max_completion_tokens
      // is shared between its INTERNAL reasoning tokens and the actual visible
      // reply, unlike older models where every token you pay for shows up in the
      // response. On a tight budget (this project's smaller calls were 300-500),
      // it can burn the entire budget thinking and leave zero left to write the
      // actual answer, which reads as "Empty response" even though nothing
      // actually failed — finish_reason: "length" with reasoning_tokens > 0 in
      // usage is the fingerprint of exactly this. Logging both here so a future
      // empty-response report shows which cause it actually was.
      // ── AND THE SAME FOR THE REASONING MODEL, WHICH IS WORSE ──
      // max_completion_tokens is shared between the model's internal reasoning
      // and the reply you actually see, so a budget that would be generous on
      // an older model can be spent entirely on thinking, leaving nothing to
      // write with. finish_reason "length" with reasoning_tokens in usage is
      // the fingerprint. Tripled rather than doubled, because that is the shape
      // of the problem: it is not slightly short, it is short by however much
      // it decided to think.
      console.warn("OpenAI returned no text.", { finish_reason: data.choices?.[0]?.finish_reason, usage: data.usage });
      return { error: "Empty response from OpenAI", empty: true };
    }
    return { text };
  } catch (err) {
    return { error: "Couldn't reach OpenAI — check the API key and your connection." };
  }
};

export const parseClaudeJSON = async (rawText, maxTokens = 8192) => {
  let cleaned = rawText.replace(/^```json\s*|\s*```$/g, "").trim();
  // PREAMBLE GUARD (from Oliver's real console error: `Unexpected token 'G',
  // "Got it — 4"... is not valid JSON` followed by a failed build): despite
  // every "respond with ONLY the JSON" instruction, the model occasionally
  // writes a short conversational lead-in ("Got it — 4 days coming up: ...")
  // before the object. That's not a JSON syntax error, so the repair pass
  // (which is prompted to fix ONE syntax problem) was the wrong tool and the
  // whole guide build died on a reply whose JSON was sitting intact right
  // after the chit-chat. Slice from the first "{" to the last "}" before
  // parsing — and before ever spending a repair call.
  if (cleaned && cleaned[0] !== "{" && cleaned[0] !== "[") {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last > first) cleaned = cleaned.slice(first, last + 1);
  }
  try {
    return JSON.parse(cleaned || "{}");
  } catch (parseErr) {
    console.warn("Claude JSON failed to parse — attempting one repair pass.", parseErr.message);
    const repairResult = await askClaude(
      `The JSON below is invalid. A strict parser reports this exact error: "${parseErr.message}". This is almost always ONE unescaped double-quote or stray control character inside a prose string value — find it and fix ONLY that syntax problem. Do not reword, shorten, or otherwise change any content, facts, or structure. Respond with ONLY the corrected, complete, valid JSON — no markdown fences, no explanation before or after.\n\n${cleaned}`,
      maxTokens
    );
    if (repairResult.error) throw new Error(`${parseErr.message} (repair attempt also failed: ${repairResult.error})`);
    const repairedCleaned = repairResult.text.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      return JSON.parse(repairedCleaned || "{}");
    } catch (secondErr) {
      throw new Error(`Invalid JSON even after a repair attempt: ${secondErr.message}`);
    }
  }
};

// Free, no-API-key geocoding for a single place name — same service App.jsx's own
// geocodeStopsForGuide uses, kept slow/polite (no batching) since this is only ever
// called for the handful of NEW stops "Include more" adds, not a whole guide's worth.
export const geocodeOne = async (name, town) => {
  try {
    const query = town ? `${name}, ${town}, Denmark` : `${name}, Denmark`;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=dk`);
    // Free, and recorded anyway. A run's call count is part of what it costs to
    // serve, even where the money is zero, and a geocode that is free today is
    // a rate limit tomorrow.
    recordRequestCall("geocode");
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch { /* leave unresolved — same graceful degradation as everywhere else */ }
  return null;
};
