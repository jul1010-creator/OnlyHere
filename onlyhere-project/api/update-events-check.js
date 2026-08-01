// /api/update-events-check.js
// Server-side, callable version of Studio's "Update current events" button —
// built specifically so the weekly Monday event check can run on its own
// schedule, without needing your browser, your PC, or the app open at all.
// Same exact Perplexity re-verification logic and prompt as the in-app
// button (updateCurrentEvents in src/App.jsx), just running here as a plain
// API call a scheduled job can hit directly and get a JSON report back from.
//
// PROTECTED: requires ?key=<UPDATE_EVENTS_SECRET> (or an
// x-update-events-key header with the same value) matching a new env var of
// that exact name — set UPDATE_EVENTS_SECRET in Vercel (any random string
// you pick) before this goes live, or every call 401s. This exists purely so
// a random visitor who stumbles on this URL can't rack up Perplexity calls
// on your key by hitting it repeatedly — it costs a small bit of Perplexity
// credit per event checked, same as clicking the button in-app does.
//
// PAGINATION, ON PURPOSE: this only processes up to `limit` events per call
// (default 10, capped at 20 — same cap the in-app button uses) starting at
// `offset`, and returns `nextOffset`/`done` in the response. A single big
// sweep of every upcoming event risks running past Vercel's function time
// limit on some plans; looping a few smaller calls is safer and the actual
// weekly job (a scheduled Claude session) is what does that looping, not a
// human clicking a button repeatedly.
//
// NOTHING GETS AUTO-EDITED: exactly like the in-app version, this only
// FLAGS what changed (cancelled, date moved, ticket status changed) — it
// never touches src/data/events.js itself. A wrong auto-edit there is worse
// than a manual one; you still update the real data by hand from the report.

import { events, majorEvents, vikingEvents } from "../src/data/events.js";

const isUpcoming = (d) => !d || new Date(d) >= new Date();

export default async function handler(req, res) {
  const secret = process.env.UPDATE_EVENTS_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "UPDATE_EVENTS_SECRET not set on the server — add it in Vercel before this endpoint can be used." });
  }
  const provided = req.query.key || req.headers["x-update-events-key"];
  if (provided !== secret) {
    return res.status(401).json({ error: "Missing or wrong key" });
  }

  const pplxKey = process.env.PERPLEXITY_API_KEY;
  if (!pplxKey) {
    return res.status(500).json({ error: "PERPLEXITY_API_KEY not set on the server" });
  }

  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 20);

  const allUpcoming = [...events, ...majorEvents, ...vikingEvents].filter(e => isUpcoming(e.date));
  const batch = allUpcoming.slice(offset, offset + limit);

  const changed = [];
  const failed = [];
  for (const ev of batch) {
    // Identical prompt to the in-app button, so a scheduled run and a manual
    // click always ask Perplexity the exact same question about an event.
    const prompt = `Using real, current web search, check the current real status of the Danish event "${ev.name}"${ev.town ? ` in ${ev.town}` : ""}. Currently on file: date ${ev.date || "unknown"}${ev.ticketInfo ? `, ticket info "${ev.ticketInfo}"` : ""}${ev.ticketStatus ? `, ticket status "${ev.ticketStatus}"` : ""}. Check: (1) is it still genuinely scheduled to happen, or was it cancelled/postponed, (2) has the date actually changed from what's on file, (3) is ticket availability different from what's on file (now sold out, now on sale, now limited). Respond with ONLY strict JSON: {"stillHappening": true, "dateChanged": "", "ticketStatusChanged": "", "notes": ""} — dateChanged is the new real date if it genuinely changed from what's on file, else empty string; ticketStatusChanged is the new real status ONLY if genuinely different from what's on file, else empty string; notes is one short sentence explaining what changed, ONLY if something in this response is non-empty/non-default, else empty string. If nothing has changed, all fields should be empty/true/default and notes empty.`;
    try {
      const r = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${pplxKey}` },
        body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: prompt }], max_tokens: 400 }),
      });
      const data = await r.json();
      if (!r.ok) {
        failed.push({ name: ev.name, error: data.error?.message || `Request failed (${r.status})` });
        continue;
      }
      const text = data.choices?.[0]?.message?.content || "";
      const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch { failed.push({ name: ev.name, error: "Couldn't parse Perplexity's response" }); continue; }
      const hasChange = parsed.stillHappening === false || parsed.dateChanged || parsed.ticketStatusChanged;
      if (hasChange) changed.push({ name: ev.name, town: ev.town, currentDate: ev.date, ...parsed });
    } catch (err) {
      failed.push({ name: ev.name, error: String(err) });
    }
  }

  const nextOffset = offset + batch.length;
  const done = nextOffset >= allUpcoming.length;
  return res.status(200).json({
    changed, failed, checked: batch.length, totalUpcoming: allUpcoming.length,
    offset, nextOffset, done,
  });
}
