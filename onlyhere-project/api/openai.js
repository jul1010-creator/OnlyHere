// /api/openai.js
// Server-side proxy for OpenAI's chat completions — the real key now lives ONLY
// here, never in the browser. Every client-side call used to hit OpenAI directly
// with VITE_OPENAI_KEY, which Vite bundles straight into public JS (visible to
// anyone via dev tools) — that's why VITE_ was removed everywhere. This is a thin
// pass-through: the client sends the exact same body it always built (model,
// messages, max_tokens, response_format), this just injects the real key and
// forwards it untouched, so no prompt-construction logic anywhere else had to change.

import { requestIsFromSite, NOT_FROM_SITE } from "../src/utils/apiGuard.js";
import { gateAi, shapeOpenAI } from "../src/utils/aiGate.js";
import { safeUpstreamError } from "../src/utils/upstreamError.js";

export default async function handler(req, res) {
  // ── SECURITY, 17 AUG 2026 ─────────────────────────────────────────
  // This endpoint answered anybody until tonight. See src/utils/apiGuard.js for
  // what that meant in practice and why a login gate would break the product.
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set on the server" });
  }
  // 30 Sep 2026: a signed-in, confirmed account or the founder, counted per
  // day, with the model and length decided here. See src/utils/aiGate.js.
  const gate = await gateAi({ headers: req.headers, body: req.body, endpoint: "openai", env: process.env });
  if (!gate.ok) return res.status(gate.status).json({ error: { message: gate.error }, gate: true });
  const body = shapeOpenAI(req.body || {}, { founder: gate.founder, anon: gate.anon });
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) return res.status(r.status).json(safeUpstreamError(data, r.status, "OpenAI"));
    return res.status(r.status).json(data);
  } catch (err) {
    console.error("OpenAI fetch failed:", err);
    return res.status(500).json({ error: "OpenAI request failed" });
  }
}
