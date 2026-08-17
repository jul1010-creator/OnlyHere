// /api/anthropic.js
// Server-side proxy for Claude — same pattern as openai.js/gemini.js. Claude is
// the actual PROSE WRITER in Gemlyx's pipeline (drafting rewrites, fixing
// fact-check findings) — OpenAI's role is structuring/research-organizing only,
// never the final human-facing wording. Keeping this on its own key/proxy keeps
// that separation real in the code, not just in intent.

import { requestIsFromSite, NOT_FROM_SITE } from "../src/utils/apiGuard.js";

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
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set on the server" });
  }

  // STREAMING PATH — used by Detour's chat so replies arrive token-by-token
  // the same way Claude/Cowork itself streams text, instead of appearing all
  // at once. Only taken when the caller explicitly asks for it
  // (body.stream === true); every other caller (Studio's drafting pipeline,
  // the fact-check/rewrite tools) still gets the original buffered JSON
  // response below, unchanged — those all `await res.json()` a single object
  // and would break if this endpoint always streamed.
  if (req.body?.stream === true) {
    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(req.body),
      });

      if (!upstream.ok || !upstream.body) {
        // Anthropic rejected the request itself (bad key, bad model, etc) —
        // this is still JSON, not an event stream, so read and forward it
        // as a normal error response rather than piping nothing.
        let errBody;
        try { errBody = await upstream.json(); } catch { errBody = { error: { message: `Anthropic request failed (${upstream.status})` } }; }
        return res.status(upstream.status).json(errBody);
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
      if (!res.headersSent) return res.status(500).json({ error: String(err) });
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
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
