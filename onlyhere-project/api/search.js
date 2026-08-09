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

export default async function handler(req, res) {
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

    // Compact, clean shape — exactly what we feed back into the AI's context
    res.status(200).json({
      query: q,
      answer: data.answer || null,
      results: (data.results || []).map(r => ({
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
