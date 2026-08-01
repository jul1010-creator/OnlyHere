// /api/perplexity.js
// Server-side proxy for Perplexity's Sonar chat completions API — replaces
// api/gemini.js as Gemlyx's fact-checker. Same reasoning as every other proxy
// here: the real key lives only server-side, never in the browser.
//
// WHY THE SWAP (Aug 2026): Gemini's role in this pipeline was NEVER writing —
// every single call site used it purely to verify claims against live search
// (pre-draft fact grounding, the manual "fact-check this draft" button, the
// post-draft invented-claim check, and Detour's guide-build place/price check).
// Independent comparisons found Perplexity structurally stronger at exactly
// that job: it searches first and grounds every answer in per-claim inline
// citations, versus Gemini bundling citations at the end (or dropping them)
// and leaning more on trained knowledge. Reported hallucination rates back
// this up (~7% for Perplexity vs. meaningfully higher for Gemini in
// search-grounded answers). Gemini has been fully removed from the pipeline
// per Oliver's call — api/gemini.js is left in the repo unwired in case he
// ever wants it back, but nothing calls it anymore.
//
// SETUP: Vercel env var named exactly PERPLEXITY_API_KEY (already set,
// per Oliver — get a key at https://www.perplexity.ai/settings/api if you
// ever need to regenerate it).
//
// MODEL CHOICE: "sonar" (not "sonar-pro" or "sonar-deep-research") — this is
// a fact-CHECKING task (verify specific claims: dates, prices, venue names),
// not open-ended deep research, so the cheaper/faster base model is the right
// fit. If fact-check quality ever seems weak, "sonar-pro" is a one-line swap
// below — it does a deeper multi-source search per query at higher cost.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "PERPLEXITY_API_KEY not set on the server" });
  }
  const { prompt, model = "sonar", max_tokens = 1024 } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing 'prompt' string in request body" });
  }
  try {
    const r = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Perplexity error:", data);
      return res.status(r.status).json({ error: data.error?.message || "Perplexity request failed", detail: data });
    }
    const text = data.choices?.[0]?.message?.content || "";
    // Perplexity returns citations as a flat array of URLs (not titled), and
    // separately a richer "search_results" array with title+url+date when
    // available — prefer the richer one, fall back to bare citation URLs.
    const citations = (data.search_results || []).map(s => ({ title: s.title || s.url, url: s.url }))
      .concat((data.citations || []).map(u => ({ title: u, url: u })))
      .filter((c, i, arr) => c.url && arr.findIndex(x => x.url === c.url) === i);
    return res.status(200).json({ text, citations, usage: data.usage });
  } catch (err) {
    console.error("Perplexity fetch failed:", err);
    return res.status(500).json({ error: String(err) });
  }
}
