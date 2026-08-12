// /api/update-events-check.js
// Walks the published events and asks whether each one is still true: still
// happening, still on that date, still that ticket status. Read only. It reports
// what changed and never writes anything back.
//
// PROTECTED: requires ?key=<UPDATE_EVENTS_SECRET>, or an x-update-events-key
// header with the same value, matching the env var of that exact name. Set it
// in Vercel before this goes live or every call 401s.
//
// ── IT HAD CHECKED ZERO EVENTS SINCE 5 AUGUST ───────────────────────
// Found 12 Aug 2026. It opened with:
//
//     import { events, majorEvents, vikingEvents } from "../src/data/events.js";
//     const allUpcoming = [...events, ...majorEvents, ...vikingEvents].filter(...)
//
// All three of those arrays became `export const x = []` on 5 August, when the
// content moved to Supabase. liveContent.js refills them at runtime IN THE
// BROWSER. A serverless function has no browser and never calls it, so
// allUpcoming was empty, the batch was empty, the loop never executed, and this
// endpoint returned a clean 200 reporting no changes. It never cost a single
// Perplexity call and it never updated a single event.
//
// The same shape as gemlyx_research never existing and tripCharacter never
// firing: a silent failure that looks exactly like a working feature. It reads
// gemlyx_content now, which is where the events actually live.
//
// ── SO THIS ENDPOINT NOW SPENDS MONEY, HAVING SPENT NONE ────────────
// Per event: one Perplexity call, plus at most one read of the event's own site
// (free unless that site is walled, then one Firecrawl credit). Both are counted
// and returned, because an endpoint going from zero spend to real spend has to
// say how much in the same breath as what it found.
//
// ?dry=1 reports exactly what it WOULD check and what that would cost, and
// makes no paid call at all. Run that first.
import { readPage } from "../src/utils/readPage.js";
import { domainOf } from "../src/utils/pageScan.js";
import { parseEventDate, isPastDate } from "../src/utils/eventDates.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://vpxfahjnerkkkoueovhl.supabase.co";

// The END date decides whether a multi day festival is over, which is the rule
// eventDateIssues already follows. An event with no date at all is still worth
// asking about: an undated row is the one most likely to be wrong.
const stillWorthChecking = (p, today) => {
  const start = p?.date || p?.dateStart || "";
  const end = p?.dateEnd || "";
  const last = end && parseEventDate(end) ? end : start;
  if (!last) return true;
  return !isPastDate(last, today);
};

export default async function handler(req, res) {
  const secret = process.env.UPDATE_EVENTS_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "UPDATE_EVENTS_SECRET not set on the server. Add it in Vercel before this endpoint can be used." });
  }
  const provided = req.query.key || req.headers["x-update-events-key"];
  if (provided !== secret) {
    return res.status(401).json({ error: "Missing or wrong key" });
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not set on the server, so there is no way to read the published events." });
  }

  const dry = req.query.dry === "1" || req.query.dry === "true";
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 20);

  // ── THE ROWS, FROM WHERE THEY ACTUALLY LIVE ───────────────────────
  // res.ok is checked, not just the catch. fetch only rejects on a network
  // fault, so a missing table, a mis-scoped key or an RLS refusal all arrive as
  // a RESOLVED response, and reading rows off that gives an empty list that
  // looks exactly like "there are no events on file". That is the api/ask.js
  // quota bug, and it is deliberately not repeated here.
  let rows;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?select=id,type,payload&type=eq.festival`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return res.status(502).json({ error: `Supabase refused the read (${r.status}). This is NOT "no events on file".`, detail: body.slice(0, 300) });
    }
    rows = await r.json();
    if (!Array.isArray(rows)) {
      return res.status(502).json({ error: "Supabase answered with something that is not a list of rows.", detail: String(rows).slice(0, 200) });
    }
  } catch (err) {
    return res.status(502).json({ error: `Could not reach Supabase: ${String(err).slice(0, 200)}` });
  }

  const today = new Date();
  const upcoming = rows
    .map(r => ({ id: r.id, p: r.payload || {} }))
    .filter(r => r.p.name && stillWorthChecking(r.p, today));
  const batch = upcoming.slice(offset, offset + limit);

  if (dry) {
    return res.status(200).json({
      dryRun: true,
      published: rows.length,
      stillUpcoming: upcoming.length,
      wouldCheck: batch.map(b => ({ name: b.p.name, town: b.p.town || "", date: b.p.date || "", website: b.p.website || "" })),
      wouldCost: {
        perplexityCalls: batch.length,
        pageReads: batch.filter(b => b.p.website).length,
        firecrawlCreditsWorstCase: batch.filter(b => b.p.website).length,
        note: "A page read is free unless the site is walled. Only an escalation costs a credit, and a failed request is not charged.",
      },
      nextOffset: offset + batch.length,
      done: offset + batch.length >= upcoming.length,
    });
  }

  const pplxKey = process.env.PERPLEXITY_API_KEY;
  if (!pplxKey) {
    return res.status(500).json({ error: "PERPLEXITY_API_KEY not set on the server" });
  }
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;

  const changed = [];
  const failed = [];
  const reads = [];
  let credits = 0;

  for (const { p } of batch) {
    // ── THE OFFICIAL SITE FIRST, WHICH IS THE WHOLE POINT ──────────
    // Oliver, 12 Aug: "the tickets on the official website HAS TO BE
    // PRIORITISED. Otherwise Tavily and Perplexity might take some 2024 blog
    // and put in their ticket prices." Perplexity searches; it does not
    // guarantee it opened the operator's own page. Handing it that page's own
    // words FIRST is what makes the priority real rather than requested.
    let siteText = "";
    if (p.website) {
      const r = await readPage(p.website, { key: firecrawlKey });
      credits += r.credits || 0;
      siteText = r.text || "";
      reads.push({ name: p.name, domain: domainOf(p.website), via: r.via, read: r.read, blocked: !!r.blocked, credits: r.credits || 0 });
    }

    const onFile = [
      `date ${p.date || "unknown"}`,
      p.dateEnd ? `end date ${p.dateEnd}` : "",
      p.ticketInfo ? `ticket info "${String(p.ticketInfo).slice(0, 200)}"` : "",
      p.ticketStatus ? `ticket status "${p.ticketStatus}"` : "",
    ].filter(Boolean).join(", ");

    const prompt = `Using real, current web search, check the current real status of the Danish event "${p.name}"${p.town ? ` in ${p.town}` : ""}. Currently on file: ${onFile}.

${siteText ? `THE EVENT'S OWN WEBSITE SAYS THIS. It was fetched directly from ${p.website} just now, and it OUTRANKS anything you find in a search result, a blog or a listing site. A price, a date or a ticket status that contradicts this text is wrong, no matter how many other pages repeat it. If this text settles a question, answer from it and do not go looking for a second opinion:

${siteText.slice(0, 6000)}

` : `The event's own website could not be read this time, so everything below comes from search. Treat a price or a date from a blog, a listing site or an article as UNCONFIRMED rather than current: a price or date from a previous edition is the single most common way this goes wrong.

`}Check: (1) is it still genuinely scheduled to happen, or was it cancelled or postponed, (2) has the date actually changed from what is on file, (3) is ticket availability different from what is on file.

A PRICE OR A TICKET STATUS IS ONLY WORTH REPORTING IF YOU CAN SAY WHERE IT CAME FROM. Danish festival tickets are tiered, dated and age banded, so several different real prices exist at once and a sold out early tier is not the price. Anything priced or timed from before 2025 is stale, not current.

Respond with ONLY strict JSON: {"stillHappening": true, "dateChanged": "", "ticketStatusChanged": "", "source": "", "notes": ""}. dateChanged is the new real date ONLY if it genuinely changed from what is on file, else an empty string. ticketStatusChanged is the new real status ONLY if genuinely different, else an empty string. source names where a reported change came from, either "official site" or the domain you read it on, and is empty if nothing changed. notes is one short sentence explaining what changed, ONLY if something else in this response is non-default, else an empty string.`;

    try {
      const r = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${pplxKey}` },
        body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: prompt }], max_tokens: 500 }),
      });
      const data = await r.json();
      if (!r.ok) {
        failed.push({ name: p.name, error: data.error?.message || `Request failed (${r.status})` });
        continue;
      }
      const text = data.choices?.[0]?.message?.content || "";
      const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch { failed.push({ name: p.name, error: "Couldn't parse Perplexity's response" }); continue; }
      const hasChange = parsed.stillHappening === false || parsed.dateChanged || parsed.ticketStatusChanged;
      if (hasChange) {
        changed.push({
          name: p.name, town: p.town || "", currentDate: p.date || "", ...parsed,
          // Whether the operator's own words were in front of it when it
          // answered. A reported change backed by the official page and one
          // backed by a search result are not the same claim, and merging them
          // loses the only thing that tells them apart.
          sawOfficialSite: !!siteText,
        });
      }
    } catch (err) {
      failed.push({ name: p.name, error: String(err) });
    }
  }

  const nextOffset = offset + batch.length;
  return res.status(200).json({
    published: rows.length,
    stillUpcoming: upcoming.length,
    checked: batch.length,
    changed,
    failed,
    // Named, not counted: "3 sites were blocked" is not something anyone can
    // act on and "visitodense.dk was blocked" is.
    reads,
    spend: { perplexityCalls: batch.length, firecrawlCredits: credits },
    nextOffset,
    done: nextOffset >= upcoming.length,
  });
}
