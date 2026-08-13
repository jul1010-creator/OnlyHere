// /api/scan-source.js
// Server-side fetch of an external page, stripped down to readable text.
// Exists because browsers block a webpage from fetching another site's raw
// content directly (CORS), and a serverless function has no such restriction.
// Studio calls this, then sends the returned text to OpenAI to extract a clean
// list of names, dates and towns. Nothing here writes to Supabase or publishes
// anything: this only ever returns text for the founder to review.
//
// ── THIS FILE IS THE HTTP SHAPE AND NOTHING ELSE ────────────────────
// The two tier read is src/utils/readPage.js, shared with the event date
// updater, which needs the identical thing. The judgement about whether what
// came back is a page or a bot wall is src/utils/pageScan.js, pure and tested
// with no network. Same split api/tickets.js documents.
//
// ── TWO TIERS ───────────────────────────────────────────────────────
// 1. A plain fetch. Free, fast, and enough for most Danish tourist sites.
// 2. Firecrawl, ONLY when tier one came back unreadable, and ONLY when
//    FIRECRAWL_API_KEY exists. One credit per page, failed requests are not
//    charged, and the free tier is a thousand pages a month.
//
// WITH NO KEY SET THIS BEHAVES AS IT DID BEFORE, plus it now says out loud when
// a page could not be read instead of handing a challenge page back as though
// it were content. That half is free, and it is the half that tells you whether
// the paid half is worth buying: until something records WHICH domains fail,
// "sites that block AI" is a hunch with no list behind it.
import { readPage } from "../src/utils/readPage.js";
import { domainOf } from "../src/utils/pageScan.js";

const errorFor = (url, r) =>
  r.read.startsWith("http-") ? `Source returned ${r.status}`
  : r.read === "challenge-page" ? `${domainOf(url)} answered with a bot wall rather than the page. Nothing readable came back.`
  : r.read === "fetch-failed" ? `Could not reach ${domainOf(url)}: ${r.detail}`
  : r.read.startsWith("firecrawl-") ? `Could not read ${domainOf(url)}. The plain fetch gave "${r.firstTry}" and Firecrawl gave "${r.read}".`
  : `${domainOf(url)} returned almost no readable text, which usually means the page builds itself in JavaScript.`;

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Provide a valid ?url=" });
  }

  const key = process.env.FIRECRAWL_API_KEY;
  const r = await readPage(url, { key });

  if (!r.blocked) {
    // tickets: the outbound ticket links this page carries, best first. The draft
    // pipeline follows the top one or two to reach the agent that actually sells
    // them, which is where the buyable price lives. See ticketLinks in pageScan.
    return res.status(200).json({ text: r.text, via: r.via, read: r.read, credits: r.credits, tickets: r.tickets || [], ...(r.firstTry ? { firstTry: r.firstTry } : {}) });
  }

  // ── NOTHING READABLE ──────────────────────────────────────────────
  // text is deliberately EMPTY rather than the challenge page's own words. Both
  // callers gate on `scanData.text`, so an empty string is what stops a bot wall
  // being appended to a draft prompt under the heading "OFFICIAL WEBSITE
  // CONTENT ... more reliable than a search snippet for exact current prices,
  // hours, tour days and ferry times". A sample is returned separately so a
  // human can see what the site actually said.
  const httpStatus = Number(r.status) >= 400 ? Number(r.status) : 200;
  return res.status(httpStatus).json({
    text: "",
    via: r.via,
    blocked: true,
    read: r.read,
    credits: r.credits,
    sample: r.sample,
    ...(r.firstTry ? { firstTry: r.firstTry } : {}),
    error: errorFor(url, r),
    ...(key ? {} : { hint: "No FIRECRAWL_API_KEY is set, so there is no second attempt for pages like this." }),
  });
}
