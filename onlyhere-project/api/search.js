// /api/search.js
// Vercel Serverless Function — real web search for the AI Guide, via Tavily
// (Tavily is built specifically for AI agents — genuine free tier, no billing card required)
//
// SETUP REQUIRED:
// 1. Sign up free at https://tavily.com (no card needed for free tier)
// 2. Get your API key from the dashboard
// 3. In Vercel: Project Settings → Environment Variables → add TAVILY_API_KEY = your_key
// 4. Redeploy
//
// USAGE (from your frontend):
// fetch('/api/search?q=Den Gamle By opening hours 2026')

import { requestIsFromSite, NOT_FROM_SITE } from "../src/utils/apiGuard.js";

export default async function handler(req, res) {
  // ── SECURITY, 17 AUG 2026 ─────────────────────────────────────────
  // This endpoint answered anybody until tonight. See src/utils/apiGuard.js for
  // what that meant in practice and why a login gate would break the product.
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  const { q, domains, n } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Missing 'q' query param" });
  }

  if (!process.env.TAVILY_API_KEY) {
    return res.status(500).json({ error: "Search not configured — missing TAVILY_API_KEY" });
  }

  try {
    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: q,
        search_depth: "basic",
        // ── "IF I PUT IN TICKETMASTER.DK, DOES IT GO THROUGH ALL OF
        //     TICKETMASTER? OR ONLY THE FRONT PAGE?" ────────────────
        // Oliver, 9 Aug 2026. The whole site: include_domains restricts the
        // RESULTS to that domain and Tavily searches its index of every page it
        // has, so a deep event page can and does come back. It is not a fetch of
        // the front page.
        //
        // The real limit is here, not there. Four results is plenty for an open
        // web search, where the job is to find the best few pages anywhere. It is
        // tight for a search pinned to ONE site, where four is all you will ever
        // see of it, and a ticketing site's four best pages for "Copenhagen" are
        // unlikely to include the one event you wanted. So a caller that has
        // narrowed to a domain can ask for more.
        max_results: Math.min(Math.max(Number(n) || (domains ? 8 : 4), 1), 20),
        include_answer: true, // Tavily gives a short synthesized answer, cheap to use directly
        // Optional: restrict this specific call to a fixed set of domains (e.g. Wikipedia).
        // Backward compatible — omitted entirely when the caller doesn't pass ?domains=.
        ...(domains ? { include_domains: domains.split(",").map(d => d.trim()).filter(Boolean) } : {}),
      }),
    });

    if (!tavilyRes.ok) {
      const errText = await tavilyRes.text();
      console.error("Tavily error:", errText);
      return res.status(502).json({ error: "Search service failed", detail: errText });
    }

    const data = await tavilyRes.json();

    // ── AND A CONSTRAINT SENT IS NOT A CONSTRAINT HONOURED ───────────
    //
    // 24 Aug 2026. The ferry check asked Google for a route with ferries banned,
    // was handed a route with a ferry on it, and believed it, which called every
    // Danish island mainland for weeks. The general shape of that bug is: a
    // request carries a restriction and the response is trusted without being
    // measured against it.
    //
    // include_domains is the same shape here. It is sent, and until now every
    // result came back unchecked. When a caller pins a search to a founder
    // source, the run report says "8 pages from that site", and nothing had ever
    // confirmed the pages were from that site.
    //
    // Filtered rather than warned about, because a result outside the pin is not
    // what was asked for and passing it on means a draft can be researched from a
    // page the founder never chose. `offPin` says how many were dropped, so the
    // Studio can show a silent narrowing instead of a mystery.
    //
    // A subdomain counts as inside: pinning loekkenkoncert.dk has to reach
    // billet.loekkenkoncert.dk, which is where a small Danish event sells.
    const pinned = domains ? domains.split(",").map(d => d.trim().toLowerCase().replace(/^www\./, "")).filter(Boolean) : [];
    const hostOf = (u) => { try { return new URL(String(u)).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
    const inside = (u) => { const h = hostOf(u); return !!h && pinned.some(d => h === d || h.endsWith(`.${d}`)); };
    const all = (data.results || []);
    const kept = pinned.length ? all.filter(r => inside(r.url)) : all;

    // Compact, clean shape — exactly what we feed back into the AI's context
    res.status(200).json({
      query: q,
      answer: data.answer || null,
      ...(pinned.length ? { pinnedTo: pinned, offPin: all.length - kept.length } : {}),
      results: kept.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 300) || "",
      })),
    });
  } catch (err) {
    console.error("Search failed:", err);
    res.status(500).json({ error: "Internal error during search" });
  }
}
