// Shared, parameterized copies of App.jsx's own askClaude/parseClaudeJSON — pure
// functions (no closures over component state), pulled out so GuidePage.jsx's new
// "Include more" / "Make it simpler" / "Gemlyx AI" help controls can call Claude the
// same way App.jsx's Detour/Studio code already does, without duplicating this logic
// or reaching into App.jsx's component internals. App.jsx now imports these too
// (its own local copies were removed) — same behavior, just defined once.
export const askClaude = async (prompt, maxTokens = 500, model = "claude-sonnet-5") => {
  try {
    const res = await fetch("/api/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
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

export const askPerplexity = async (prompt) => {
  try {
    const res = await fetch("/api/perplexity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
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

// Claude is the actual WRITER in Gemlyx's pipeline — every rewrite/rephrase/
// fix task routes through here, never OpenAI. OpenAI's role is narrowed to
// structuring research into the schema during the initial draft; once real
// prose needs to be written or fixed, it's Claude's job specifically.
// OpenAI's role is narrowed to planning + structuring — research query planning
// (Stage 1) and organizing raw research into notes (Stage 4), never final prose.
export const askOpenAI = async (prompt, maxTokens = 800) => {
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
      console.warn("OpenAI returned no text.", { finish_reason: data.choices?.[0]?.finish_reason, usage: data.usage });
      return { error: "Empty response from OpenAI" };
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
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch { /* leave unresolved — same graceful degradation as everywhere else */ }
  return null;
};
