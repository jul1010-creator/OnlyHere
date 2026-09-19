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
import { accountsOnPage, accountFits, socialRecord, asUrl, searchCandidates, websiteInPageDetails, OWN_PAGE } from "../src/utils/socialAccounts.js";
import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";

// The markup, not the readable text. readPage.js strips tags, and a footer icon
// linking a Facebook page has no text at all: the account is in the href and
// nowhere else, so this is the one lookup in the app that wants the raw page.
const RAW_TIMEOUT_MS = 12000;

// ── "AVERNAKOE: API DIRECT DID NOT ANSWER IN TIME ON /POSTS" ────────
//
// Oliver, 19 Sep 2026, mid sweep. Not a bug in the reading: the call ran out of
// time and said so, which is the right thing for it to do and the wrong amount
// of time for it to do it in.
//
// TWO DIFFERENT CALLS SHARED ONE BUDGET. A name search returns a short list and
// answers in a second or two; /v1/facebook/page/posts pulls a page of a page's
// posts, which is the heaviest thing this route asks for, and twelve seconds is
// a number that fits the first and not the second.
//
// AND THE FUNCTION ITSELF WAS THE TIGHTER LIMIT. This route set no maxDuration,
// so it took Vercel's default, which on the Pro plan this runs on is fifteen
// seconds. A twelve second inner budget inside that leaves three seconds of
// headroom for everything else in the request, so the inner abort was firing
// with almost nothing to spare and the ceiling was never stated anywhere.
//
// NO RETRY. API Direct bills per call, and a second attempt at an endpoint that
// has already spent forty five seconds costs twice for the same wait. The
// answer to a slow endpoint is enough time on the first try, not two tries.
const POSTS_TIMEOUT_MS = 45000;
const isPostsCall = (path) => /\/posts\b/.test(String(path || ""));
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

// ── THE SECOND TIER, WITH THE SHAPE READ RATHER THAN GUESSED ────────
//
// The first version of this file asked `api.apidirect.io/v1/search?q=`. That
// was my reading of their docs and the handoff said so in those words: "the API
// Direct request shape is my reading of their docs and is unverified". It was
// wrong in four places at once, the host, the path, the parameter name and the
// paging, so the tier would have returned nothing forever and looked like a
// country with no Facebook pages in it.
//
// Read off their documentation on 14 Sep 2026, and it is better than what was
// guessed at: there is an endpoint PER PLATFORM, so a page search returns pages
// rather than posts that mention a name. Base https://apidirect.io, one
// X-API-Key header, `query` as the parameter, and a list under `results` for
// Facebook and under `users` for Instagram.
//
//   GET /v1/facebook/pages?query=      pages, with is_verified
//   GET /v1/instagram/users?query=     profiles, with is_private
//   GET /v1/facebook/page?url=         one page's own details, including the
//                                      website it says it has
//
// Facebook and Instagram only, deliberately. Those two are where a Danish
// venue announces a season, and every extra platform is another request per row
// on a sweep that runs over the whole library. X, TikTok and YouTube can be
// added in one line each if a row ever turns out to need them.
const API_DIRECT = "https://apidirect.io";
const askApiDirect = async (key, path, params) => {
  const qs = new URLSearchParams(params).toString();
  const ctrl = new AbortController();
  const budget = isPostsCall(path) ? POSTS_TIMEOUT_MS : RAW_TIMEOUT_MS;
  const t = setTimeout(() => ctrl.abort(), budget);
  try {
    const r = await fetch(`${API_DIRECT}${path}?${qs}`, {
      signal: ctrl.signal,
      headers: { "X-API-Key": key, "Accept": "application/json" },
    });
    if (!r.ok) return { ok: false, why: `API Direct returned ${r.status} on ${path}` };
    return { ok: true, body: await r.json() };
  } catch (e) {
    // The number is IN the message, so a slow endpoint and a dead one read
    // differently: "did not answer in 45s" is a finding and "did not answer" is
    // a shrug.
    return { ok: false, why: e?.name === "AbortError" ? `API Direct did not answer in ${Math.round(budget / 1000)}s on ${path}` : String(e?.message || e) };
  } finally { clearTimeout(t); }
};

// ── AND THE ONE CALL THAT TURNS A GUESS INTO A FACT ──────────────────
//
// Neither list endpoint carries the account's own outbound link, and that link
// is the whole of the `linked` reason: an account whose own page says it lives
// at the website we already hold for this row is theirs, with nothing to judge.
// So a candidate that got only as far as `named`, on a row where we DO hold a
// website, is worth one more request to settle.
//
// ONE, and only on Facebook, and only for the first candidate. Two reasons.
// The cost is per request and this sweep runs over a whole library, and a row
// with no website on file, which is the case this tier exists for, has nothing
// to compare a bio link against, so the call cannot answer anything there and
// is never made.
const settleByWebsite = async (key, candidate, website) => {
  if (!website || candidate.account.platform !== "facebook") return null;
  const got = await askApiDirect(key, "/v1/facebook/page", { url: candidate.account.url });
  if (!got.ok) return null;
  const site = websiteInPageDetails(got.body);
  return site ? [site] : null;
};

// The function's own ceiling, stated rather than inherited. Vercel's default on
// the Pro plan this runs on is fifteen seconds, which is under the budget the
// posts call needs, so the inner timeout could never have been raised without
// this line. Sixty rather than the maximum: a request that has been running a
// minute is one nobody is still waiting for.
export const config = { maxDuration: 60 };

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

  // ── THE EVENT WINDOW PROBE ──────────────────────────────────────
  //
  // Oliver, 15 Sep 2026, on conflicting dates: ticket page first, official site
  // second, and he asked what Facebook can add. This is the honest answer.
  //
  // /v1/facebook/events takes a query and FILTERS on start_date and end_date.
  // It returns event_id, title, url, count and pages. NO DATE COMES BACK, and
  // no documented endpoint takes an event id or url and returns its details, so
  // this can confirm or contradict a window we already believe and can never
  // supply a date. Checked against their docs on 15 Sep rather than assumed,
  // because this file's own history is that the assumed shape was wrong in four
  // places at once.
  //
  // It is a separate mode on this function rather than a new file: api/ is a
  // function count, and a thirteenth serverless function is a deploy decision
  // rather than a feature.
  // ── THE COMMUNITY GROUPS, 17 SEP 2026 ─────────────────────────────
  //
  // Oliver: "I've been in contact with someone from a community at Sejerø that
  // hosts events... they tend to apparently put up events. How can we manage
  // that on my page?"
  //
  // GET /v1/facebook/group/posts?group_id=<id>&pages=1, read from their docs
  // rather than guessed, which is the standing rule on this file after the
  // first version's shape was wrong in four places at once. Documented: a
  // `posts` array carrying post_id, url, message, date, timestamp, author_name
  // and external_url, a `count`, and paging of 1 to 15 pages billed per page.
  //
  // PUBLIC GROUPS ONLY, and their docs say so outright. The three groups he has
  // asked to join are private and stay unreadable here whatever happens to his
  // membership, because his membership is his and not this app's.
  //
  // A MODE ON THIS FUNCTION, not a file. api/ is a serverless function count
  // and the event-window mode below carries the same note for the same reason.
  //
  // IT RETURNS POSTS AND NOTHING ELSE. Every judgement about what is an event,
  // what date it is on and whether it already happened is
  // src/utils/communityFeeds.js, pure and tested with no network.
  // ── AND THE ID BEHIND A PAGE'S NAME ───────────────────────────────
  //
  // Oliver, 17 Sep 2026: "https://www.facebook.com/visitsamsoe I can't use
  // this.. include profiles please."
  //
  // /v1/facebook/page/posts takes a NUMERIC page id and a page URL carries a
  // name. The page-details call is the documented way across, and it runs ONCE,
  // when he adds the page, because the answer never changes. A lookup per sweep
  // would be a second request every time for the same number.
  if (String(req.query.check || "") === "page-id") {
    const url = String(req.query.url || "").trim();
    if (!/^https?:\/\/(?:www\.)?facebook\.com\//i.test(url)) {
      return res.status(400).json({ error: "Provide ?url= as a facebook.com page address." });
    }
    const idKey = process.env.API_DIRECT_KEY;
    if (!idKey) return res.status(200).json({ url, id: "", skipped: "API_DIRECT_KEY is not set" });
    const got = await askApiDirect(idKey, "/v1/facebook/page", { url });
    if (!got.ok) return res.status(200).json({ url, id: "", failed: got.why });
    const page = got.body?.page || got.body || {};
    // Read defensively across the names this provider uses for the same number.
    const id = String(page.facebook_id || page.page_id || page.id || "").trim();
    return res.status(200).json({
      url, id: /^\d{5,}$/.test(id) ? id : "",
      name: String(page.name || "").trim(),
      failed: /^\d{5,}$/.test(id) ? "" : "that page has no readable id, which usually means it is a personal profile rather than a page",
    });
  }

  if (String(req.query.check || "") === "group-posts") {
    const group = String(req.query.group || "").trim();
    if (!/^\d{5,}$/.test(group)) {
      return res.status(400).json({ error: "Provide ?group= as the numeric group id." });
    }
    // Which of the two endpoints, decided by the caller rather than guessed
    // here. Same parameters and the same response shape, so everything after
    // this line is identical and postsIn reads one thing.
    const asPage = String(req.query.kind || "") === "page";
    const feedKey = process.env.API_DIRECT_KEY;
    if (!feedKey) return res.status(200).json({ group, posts: [], skipped: "API_DIRECT_KEY is not set" });
    // One page. A village group does not post fifty times a week, and page two
    // is last month, which candidatesIn would drop anyway for being in the past.
    const got = asPage
      ? await askApiDirect(feedKey, "/v1/facebook/page/posts", { page_id: group, pages: 1 })
      : await askApiDirect(feedKey, "/v1/facebook/group/posts", { group_id: group, pages: 1 });
    if (!got.ok) return res.status(200).json({ group, posts: [], failed: got.why });
    const body = got.body || {};
    const posts = Array.isArray(body.posts) ? body.posts
      : Array.isArray(body.results) ? body.results
      : Array.isArray(body.data) ? body.data : [];
    // Passed through in the provider's own shape, so postsIn owns the reading
    // and one reader can be asserted against a fixture. The count is theirs.
    return res.status(200).json({ group, posts, count: Number(body.count) || posts.length });
  }

  if (String(req.query.check || "") === "event-window") {
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const day = /^\d{4}-\d{2}-\d{2}$/;
    if (!name) return res.status(400).json({ error: "Provide a ?name=" });
    if (!day.test(from) || !day.test(to)) {
      return res.status(400).json({ error: "Provide ?from= and ?to= as YYYY-MM-DD." });
    }
    const probeKey = process.env.API_DIRECT_KEY;
    if (!probeKey) return res.status(200).json({ checked: { from, to }, inWindow: null, skipped: "API_DIRECT_KEY is not set" });

    // The shape of the list is read defensively on purpose. `count` is
    // documented and the array's name is not, so this counts whichever of the
    // three it finds and reports which one answered. A wrong guess here would
    // read as "no event found", which is the reading that must never be
    // invented.
    const countIn = (body) => {
      if (!body || typeof body !== "object") return { n: 0, via: "nothing" };
      for (const field of ["events", "results", "data"]) {
        if (Array.isArray(body[field])) return { n: body[field].length, via: field };
      }
      if (Number.isFinite(Number(body.count))) return { n: Number(body.count), via: "count" };
      return { n: 0, via: "unrecognised" };
    };

    const q = [name, town].filter(Boolean).join(" ");
    const inside = await askApiDirect(probeKey, "/v1/facebook/events", { query: q, start_date: from, end_date: to, pages: 1 });
    if (!inside.ok) return res.status(200).json({ checked: { from, to }, inWindow: null, failed: inside.why });
    const got = countIn(inside.body);

    // The wide search is the difference between "moved" and "not on Facebook at
    // all", and it costs a second request, so it is only run when it can change
    // the answer: the window was empty AND the caller asked for it.
    let wide = null, wideVia = null;
    if (got.n === 0 && String(req.query.wide || "") === "1") {
      const all = await askApiDirect(probeKey, "/v1/facebook/events", { query: q, pages: 1 });
      if (all.ok) { const w = countIn(all.body); wide = w.n; wideVia = w.via; }
    }
    return res.status(200).json({
      checked: { from, to, query: q },
      inWindow: got.n,
      wide,
      // Named so a future reading of an unexpected payload is a fact in the
      // response rather than a silent zero.
      read: { inWindow: got.via, wide: wideVia },
      requests: 1 + (wide === null ? 0 : 1),
    });
  }

  const website = String(req.query.website || "").trim();
  // ── A FREE RUN MUST NOT BE ABLE TO SPEND ────────────────────────
  //
  // Without this, a row WITH a website whose footer links nothing falls
  // straight through into the paid tier, and the panel that promised "this
  // half is free" would have bought searches nobody was asked about. The whole
  // arrangement in socialSweep.js is that the cost is said out loud before it
  // is spent, and a fall-through defeats it silently, which is the worst way to
  // defeat it. `tier=page` stops at the free tier and reports what happened, so
  // the rows whose page had nothing come back as a SECOND, priced press.
  const only = String(req.query.tier || "").trim();
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

  if (only === "page") {
    tried.push({ tier: "api-direct", skipped: "this run was the free tier only" });
    return res.status(200).json({ record: null, tried, needsSearch: true });
  }

  // TIER TWO: a search, only where the first tier had nothing to read.
  const key = process.env.API_DIRECT_KEY;
  if (!key) {
    tried.push({ tier: "api-direct", skipped: "API_DIRECT_KEY is not set" });
    return res.status(200).json({ record: null, tried });
  }

  // The town is in the query because two Danish venues share a name more often
  // than a search engine expects, and it is left OUT of the Instagram query
  // because a handle rarely carries one and the extra word costs recall.
  const q = [name, town].filter(Boolean).join(" ");
  const asked = [
    { platform: "facebook", path: "/v1/facebook/pages", params: { query: q } },
    { platform: "instagram", path: "/v1/instagram/users", params: { query: name } },
  ];

  const kept = [];
  let how = null;
  let anyAnswered = false;
  for (const a of asked) {
    const hit = await askApiDirect(key, a.path, a.params);
    if (!hit.ok) { tried.push({ tier: "api-direct", platform: a.platform, failed: hit.why }); continue; }
    anyAnswered = true;
    const candidates = searchCandidates(hit.body);
    let keptHere = 0;
    for (const c of candidates) {
      let fits = accountFits(c.account, { name, website, bioLinks: c.bioLinks });
      // A candidate the search named but could not link is worth one more
      // request, and only where there is a website to settle it against.
      if (fits === "named" && website && !keptHere) {
        const links = await settleByWebsite(key, c, website);
        if (links) fits = accountFits(c.account, { name, website, bioLinks: links }) || fits;
      }
      if (!fits) continue;
      // The platform's own display name, kept beside the handle, because
      // "ribevc" is unreadable and "Ribe VikingeCenter" is the thing a person
      // recognises in a table of a hundred rows. The tick is carried the same
      // way and decides nothing: verified says the platform checked who runs
      // the account, not that it is the business on this row.
      kept.push({ ...c.account, ...(c.name ? { title: c.name } : {}), ...(c.verified ? { verified: true } : {}) });
      keptHere += 1;
      if (!how || fits === "named") how = fits;
      // One per platform. A search hands back every account in Denmark whose
      // name is close, and a table offering a person four Facebook pages to
      // choose between is a table nobody finishes.
      break;
    }
    tried.push({ tier: "api-direct", platform: a.platform, results: candidates.length, kept: keptHere });
  }
  if (!anyAnswered) return res.status(200).json({ record: null, tried });

  return res.status(200).json({
    record: kept.length ? socialRecord(kept, { how }) : null,
    tried,
    // NEVER STORED WITHOUT A LOOK. The first tier is the place's own page and
    // needs no opinion; this tier is a search, and a search is a candidate.
    review: kept.length ? "A search found these. Open each one before you keep it." : "",
  });
}
