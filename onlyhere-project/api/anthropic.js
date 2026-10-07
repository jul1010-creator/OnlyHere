// /api/anthropic.js
// Server-side proxy for Claude — same pattern as openai.js/gemini.js. Claude is
// the actual PROSE WRITER in Gemlyx's pipeline (drafting rewrites, fixing
// fact-check findings) — OpenAI's role is structuring/research-organizing only,
// never the final human-facing wording. Keeping this on its own key/proxy keeps
// that separation real in the code, not just in intent.

import { requestIsFromSite, NOT_FROM_SITE } from "../src/utils/apiGuard.js";
import { gateAi, shapeAnthropic } from "../src/utils/aiGate.js";
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
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // The variable is named in the log only (security review, 4 Oct 2026).
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "This is not available just now." });
  }
  // 30 Sep 2026: a signed-in, confirmed account or the founder, counted per
  // day, with the model and length decided here. See src/utils/aiGate.js.
  const gate = await gateAi({ headers: req.headers, body: req.body, endpoint: "anthropic", env: process.env });
  if (!gate.ok) return res.status(gate.status).json({ error: { message: gate.error }, gate: true });
  const body = shapeAnthropic(req.body || {}, { founder: gate.founder, anon: gate.anon });

  // STREAMING PATH — used by Detour's chat so replies arrive token-by-token
  // the same way Claude/Cowork itself streams text, instead of appearing all
  // at once. Only taken when the caller explicitly asks for it
  // (body.stream === true); every other caller (Studio's drafting pipeline,
  // the fact-check/rewrite tools) still gets the original buffered JSON
  // response below, unchanged — those all `await res.json()` a single object
  // and would break if this endpoint always streamed.
  if (body.stream === true) {
    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!upstream.ok || !upstream.body) {
        // Anthropic rejected the request itself (bad key, bad model, etc) —
        // this is still JSON, not an event stream, so read and forward it
        // as a normal error response rather than piping nothing.
        let errBody = null;
        try { errBody = await upstream.json(); } catch { errBody = null; }
        return res.status(upstream.status).json(safeUpstreamError(errBody, upstream.status, "Anthropic"));
      }

      // Pipe Anthropic's Server-Sent Events straight through to the browser,
      // chunk by chunk, as they arrive — no buffering the whole reply first.
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
        if (typeof res.flush === "function") res.flush();
      }
      return res.end();
    } catch (err) {
      // If headers haven't gone out yet, respond normally; if streaming had
      // already started, just end the connection — a half-sent SSE stream
      // is the best we can do, the client's reader loop will simply stop.
      console.error("Anthropic stream failed:", err);
      if (!res.headersSent) return res.status(500).json({ error: { message: "Anthropic request failed" } });
      return res.end();
    }
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) return res.status(r.status).json(safeUpstreamError(data, r.status, "Anthropic"));
    return res.status(r.status).json(data);
  } catch (err) {
    console.error("Anthropic fetch failed:", err);
    return res.status(500).json({ error: { message: "Anthropic request failed" } });
  }
}
