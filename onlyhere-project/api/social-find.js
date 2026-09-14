// /api/social-find.js
// Finds the social accounts a place or an event runs ITSELF, so a later check
// can ask that account rather than ask the internet about a name.
//
// Oliver, 14 Sep 2026: "API direct key should also be used for attractions own
// social media.. it's often the place they announce seasonal things", and then
// "I want you to get a sweep done for everything.. a search for every attraction
// and event's own social media. This will be useful for later redrafts, when
// things need to get updated."
//
// ── THIS FILE IS THE HTTP SHAPE AND NOTHING ELSE ────────────────────
// Every judgement about what counts as an account, and whether one plausibly
// belongs to this row, is src/utils/socialAccounts.js, pure and tested with no
// network. Same split api/tickets.js and api/scan-source.js document, and the
// reason is the same: the judgement is where the bugs are, and a judgement
// behind an HTTP call cannot be tested.
//
// IT WRITES NOTHING. It returns what it found and the founder decides, exactly
// as api/scan-source.js does. A wrong handle stored silently is worse than no
// handle, because every later check would then read a different business's
// posts and flag nonsense about this row.
//
// ── TWO TIERS, AND THE FREE ONE IS THE BETTER ONE ───────────────────
//
// 1. THE PLACE'S OWN PAGE. A business links its own accounts in its own footer,
//    so an account read off that page is theirs by construction rather than by
//    an opinion about a name. Free, no key, and the strongest answer available.
// 2. API DIRECT, for a row with no website on file. That is not an edge case:
//    the events audit found the Naestved row stuck precisely because a festival
//    with no site is refused by every existing tier on every run, and a festival
//    with no site still has a Facebook page. Costs a fraction of a penny, and
//    the answer needs a reason attached (see accountFits), because a search can
//    hand back any account in Denmark whose name is close.
import { accountsOnPage, accountIn, accountFits, socialRecord, asUrl, OWN_PAGE } from "../src/utils/socialAccounts.js";
import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";

// The markup, not the readable text. readPage.js strips tags, and a footer icon
// linking a Facebook page has no text at all: the account is in the href and
// nowhere else, so this is the one lookup in the app that wants the raw page.
const RAW_TIMEOUT_MS = 12000;
const rawPage = async (url) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), RAW_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        // The same identification every other outbound call in this app sends.
        // A site that answers a nameless client with a bot wall is not refusing
        // us, it is refusing an anonymous one.
        "User-Agent": "GemlyxBot/1.0 (+https://gemlyxtravel.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!r.ok) return { ok: false, why: `site returned ${r.status}` };
    const html = await r.text();
    return { ok: true, html };
  } catch (e) {
    return { ok: false, why: e?.name === "AbortError" ? "site did not answer in time" : String(e?.message || e) };
  } finally { clearTimeout(t); }
};

// ── THE SECOND TIER ─────────────────────────────────────────────────
// One search, its results read through the same account reader as the page
// tier, and every candidate given a reason by accountFits or dropped. `link` is
// whatever the result carries as the account's own outbound link, which is the
// field that turns a guess into a fact when it points at the site we hold.
const API_DIRECT = "https://api.apidirect.io/v1/search";
const askApiDirect = async (key, { name, town }) => {
  const q = [name, town, "official"].filter(Boolean).join(" ");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), RAW_TIMEOUT_MS);
  try {
    const r = await fetch(`${API_DIRECT}?q=${encodeURIComponent(q)}&limit=20`, {
      signal: ctrl.signal,
      headers: { "X-API-Key": key, "Accept": "application/json" },
    });
    if (!r.ok) return { ok: false, why: `API Direct returned ${r.status}` };
    const body = await r.json();
    const rows = Array.isArray(body?.results) ? body.results : Array.isArray(body?.data) ? body.data : [];
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, why: e?.name === "AbortError" ? "API Direct did not answer in time" : String(e?.message || e) };
  } finally { clearTimeout(t); }
};

export default async function handler(req, res) {
  // Studio calls this and nothing else does, so it gets both halves of the
  // guard, exactly as api/scan-source.js does.
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
      return res.status(403).json({ error: "This account cannot run the social sweep." });
    }
  }

  const name = String(req.query.name || "").trim();
  const town = String(req.query.town || "").trim();
  const website = String(req.query.website || "").trim();
  if (!name) return res.status(400).json({ error: "Provide a ?name=" });

  const tried = [];

  // TIER ONE: the place's own page.
  const site = asUrl(website);
  if (site) {
    const page = await rawPage(site.toString());
    if (!page.ok) {
      tried.push({ tier: "own-page", host: site.hostname, failed: page.why });
    } else {
      const found = accountsOnPage(page.html);
      tried.push({ tier: "own-page", host: site.hostname, found: found.length });
      if (found.length) {
        return res.status(200).json({ record: socialRecord(found, { how: OWN_PAGE }), tried });
      }
    }
  } else {
    // Said out loud rather than passed over. A row with no website is the case
    // the second tier exists for, and knowing which rows took that path is how
    // anybody later judges whether the paid tier is earning its keep.
    tried.push({ tier: "own-page", skipped: "no website on this row" });
  }

  // TIER TWO: a search, only where the first tier had nothing to read.
  const key = process.env.API_DIRECT_KEY;
  if (!key) {
    tried.push({ tier: "api-direct", skipped: "API_DIRECT_KEY is not set" });
    return res.status(200).json({ record: null, tried });
  }
  const hit = await askApiDirect(key, { name, town });
  if (!hit.ok) {
    tried.push({ tier: "api-direct", failed: hit.why });
    return res.status(200).json({ record: null, tried });
  }

  // Every result through the same reader as the page tier, then a reason or
  // nothing. `how` is the weakest reason among the accounts kept, so a record
  // is never described as stronger than its softest part.
  const kept = [];
  let how = null;
  for (const row of hit.rows) {
    const a = accountIn(row?.url || row?.link || "");
    if (!a) continue;
    const bioLinks = [row?.website, row?.external_url, row?.bio_link, row?.link_in_bio].filter(Boolean);
    const fits = accountFits(a, { name, website, bioLinks });
    if (!fits) continue;
    kept.push(a);
    // "named" is weaker than "linked", so it wins the label whenever it appears.
    if (!how || fits === "named") how = fits;
  }
  tried.push({ tier: "api-direct", results: hit.rows.length, kept: kept.length });
  return res.status(200).json({
    record: kept.length ? socialRecord(kept, { how }) : null,
    tried,
    // NEVER STORED WITHOUT A LOOK. The first tier is the place's own page and
    // needs no opinion; this tier is a search, and a search is a candidate.
    review: kept.length ? "A search found these. Open each one before you keep it." : "",
  });
}
