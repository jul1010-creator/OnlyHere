// /api/anthropic.js
// Server-side proxy for Claude — same pattern as openai.js/gemini.js. Claude is
// the actual PROSE WRITER in Gemlyx's pipeline (drafting rewrites, fixing
// fact-check findings) — OpenAI's role is structuring/research-organizing only,
// never the final human-facing wording. Keeping this on its own key/proxy keeps
// that separation real in the code, not just in intent.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set on the server" });
  }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
