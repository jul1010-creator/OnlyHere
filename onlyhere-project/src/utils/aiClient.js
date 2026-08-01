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

export const parseClaudeJSON = async (rawText, maxTokens = 8192) => {
  const cleaned = rawText.replace(/^```json\s*|\s*```$/g, "").trim();
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
