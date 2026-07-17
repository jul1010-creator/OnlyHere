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
  const { q } = req.query;

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
        max_results: 4,
        include_answer: true, // Tavily gives a short synthesized answer, cheap to use directly
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
