// /api/gemini.js
// Server-side proxy for Gemini's generateContent — same reasoning as openai.js:
// the real key now lives only here, never in the browser. Thin pass-through —
// client sends the exact same body it always built (contents/tools), this just
// injects the real key as the x-goog-api-key header and forwards it untouched.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "GEMINI_API_KEY not set on the server" });
  }
  try {
    // CONFIRMED BUG (from live console error): "gemini-3.1-pro" 404s — Google's
    // v1beta generateContent endpoint wants the "-preview" suffix per their own
    // current docs. If Google renames/promotes this again, check
    // https://ai.google.dev/gemini-api/docs/generate-content/gemini-3 for the
    // current model ID.
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
