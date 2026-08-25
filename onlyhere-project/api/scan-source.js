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

import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";

export default async function handler(req, res) {
  // ── SECURITY, 17 AUG 2026 ─────────────────────────────────────────
  // Studio calls this and nothing else does, so it gets both halves: the request
  // has to come from the site, and it has to carry a real Supabase session.
  // See src/utils/apiGuard.js.
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  {
    const who = await resolveUser(req.headers, {
      supabaseUrl: process.env.SUPABASE_URL || "https://vpxfahjnerkkkoueovhl.supabase.co",
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "",
    });
    if (!who.ok) return res.status(who.status).json({ error: who.error });
    if (!isFounder(who.userId, process.env.GEMLYX_FOUNDER_IDS)) {
      return res.status(403).json({ error: "This account cannot run Studio research." });
    }
  }
  const url = req.query.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Provide a valid ?url=" });
  }

  const key = process.env.FIRECRAWL_API_KEY;
  // fresh=1 on a redraft. A redraft is started because somebody suspects the
  // page changed, so serving it from a copy taken before the suspicion is the
  // one answer it must not give. See FIRECRAWL_CACHE_MS in utils/pageScan.js.
  const fresh = String(req.query.fresh || "") === "1";
  const r = await readPage(url, { key, fresh });

  if (!r.blocked) {
    // tickets: the outbound ticket links this page carries, best first. The draft
    // pipeline follows the top one or two to reach the agent that actually sells
    // them, which is where the buyable price lives. See ticketLinks in pageScan.
    return res.status(200).json({ text: r.text, via: r.via, read: r.read, credits: r.credits, tickets: r.tickets || [], banners: r.banners || [], ...(r.firstTry ? { firstTry: r.firstTry } : {}) });
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
    // tickets: returned on the BLOCKED path too, and this is the one that fixes
    // Distortion. Its front page is 285 characters of text, so it is blocked, and
    // its /tickets page states "2-6 June 2027" in plain characters. The link
    // between the two was being dropped here because the prose was thin.
    tickets: r.tickets || [],
    // banners: returned on the BLOCKED path too, and that is the point of them.
    // A festival front page that strips to 285 characters is "almost no readable
    // text" by every measure this file has, and the announcement is sitting in
    // the artwork on that same page. Handing back an empty text and no pictures
    // would be reporting a dead end that is not one. See bannerImages.
    banners: r.banners || [],
    ...(r.firstTry ? { firstTry: r.firstTry } : {}),
    error: errorFor(url, r),
    ...(key ? {} : { hint: "No FIRECRAWL_API_KEY is set, so there is no second attempt for pages like this." }),
  });
}
