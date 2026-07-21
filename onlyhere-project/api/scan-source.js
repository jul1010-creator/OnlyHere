// /api/scan-source.js
// Server-side fetch of an external page, stripped down to readable text.
// Exists because browsers block a webpage from fetching another site's raw
// content directly (CORS) — a serverless function has no such restriction.
// Studio calls this, then sends the returned text to OpenAI to extract a
// clean list of names/dates/towns. Nothing here writes to Supabase or
// publishes anything — this only ever returns text for the founder to review.

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Provide a valid ?url=" });
  }

  try {
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GemlyxContentScan/1.0)" },
    });
    if (!pageRes.ok) {
      return res.status(pageRes.status).json({ error: `Source returned ${pageRes.status}` });
    }
    const html = await pageRes.text();

    // Strip scripts/styles, then tags, then collapse whitespace — cheap and
    // dependency-free. We don't need pretty text, just enough signal for
    // OpenAI to extract names/dates/towns from.
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20000); // keep the payload sane — plenty for a listing page

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
