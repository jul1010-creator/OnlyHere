// /api/openai.js
// Server-side proxy for OpenAI's chat completions — the real key now lives ONLY
// here, never in the browser. Every client-side call used to hit OpenAI directly
// with VITE_OPENAI_KEY, which Vite bundles straight into public JS (visible to
// anyone via dev tools) — that's why VITE_ was removed everywhere. This is a thin
// pass-through: the client sends the exact same body it always built (model,
// messages, max_tokens, response_format), this just injects the real key and
// forwards it untouched, so no prompt-construction logic anywhere else had to change.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set on the server" });
  }
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
