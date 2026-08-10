// ── EDGE MIDDLEWARE: LINK PREVIEW CARDS FOR SHARED GUIDES ────────────
//
// Oliver, 8 Aug 2026: "Aight, let's try!" — sharing, the first of the four
// things the competitor research said were worth taking from the rest of the
// category. Wanderlog's most praised feature is collaboration; G8Trip won its
// own comparison for coordinating four travellers. Almost nobody plans a trip
// alone, and a shared Gemlyx link arrived in WhatsApp as a bare grey URL because
// index.html carried no og: tags and none of those apps run JavaScript.
//
// WHY MIDDLEWARE AND NOT api/guide-preview.js, which is what this was first:
//
//   "No more than 12 Serverless Functions can be added to a Deployment on the
//    Hobby plan."
//
// api/ holds exactly 12. Edge Middleware is counted separately, so this costs
// no slot. It is also simply better: the crawler list is real JavaScript with a
// real /i flag, unit tested, rather than a regex string inside vercel.json that
// could only be verified by deploying and squinting at a WhatsApp preview.
//
// ── THE SAFETY RULE THIS FILE LIVES BY ───────────────────────────────
// A person's browser must always get the app. This runs in front of every
// /guide/ URL on the site, which is the one place a first impression happens, so
// EVERY path that is not "a crawler asked for a guide that exists" ends in
// next() — not an error page, not a stub, not a redirect. Wrong user-agent,
// Supabase down, a missing guide, a shell that would not fetch: all of them fall
// through to exactly what shipped before this file existed.
//
// ── HOW TO CHECK IT IS ACTUALLY WORKING ──────────────────────────────
// Not by pasting a link into WhatsApp; WhatsApp caches previews for hours and
// will happily show you a stale card. One command:
//
//   curl -sA "WhatsApp/2.23.20" https://only-here-three.vercel.app/guide/<id> | head -30
//
// og:title with the guide's real name means it works. Plain index.html means
// either the id was not found or the crawler gate did not match.

import { next } from "@vercel/edge";
import { SUPABASE_URL, SUPABASE_KEY, SITE_ORIGIN } from "./src/config.js";
import { isCrawler, guideIdFromPath, injectMeta } from "./src/utils/linkPreview.js";
import { placeSlug, findBySlug, sitemapXml, COUNTRY } from "./src/utils/placeUrl.js";
import { towns as hardcodedTowns } from "./src/data/towns.js";

// Guide URLs, town pages, and the sitemap. Everything else on the site keeps
// index.html's own card and never pays for this to run.
//
// THE SITEMAP IS HERE AND NOT IN api/ ON PURPOSE. The Hobby plan allows twelve
// serverless functions and api/ already holds exactly twelve, which is why the
// preview injection lives in middleware at all. Edge middleware is counted
// separately, so the sitemap costs no slot.
// ── LITERAL STRINGS ONLY, AND THIS IS NOT A STYLE CHOICE ────────────
// This was `/${COUNTRY}/:path*`, which failed the Vercel build outright:
//
//   Error: Unhandled type: "TemplateExpression" `/${COUNTRY}/:path*`
//
// Vercel reads this config by PARSING the file, never by running it, so it has
// no way to know what COUNTRY holds. Every entry has to be a plain literal.
//
// That is a real constraint and it costs the thing the constant was for: the
// country now appears here AND in utils/placeUrl.js, and two copies drift. The
// guard moves to where it can still run, so tests/run.mjs asserts this matcher
// contains exactly the COUNTRY placeUrl exports. Change the country and the
// suite names this line rather than the site quietly serving nothing at the new
// paths.
export const config = { matcher: ["/guide/:path*", "/denmark/:path*", "/sitemap.xml"] };

// Every published town. The hardcoded array is empty since 5 Aug, when all
// content moved to Supabase, so in practice this is entirely the live list and
// hardcodedTowns is here to keep working if anything is ever put back.
//
// A FAILED LOOKUP RETURNS A SHORT SITEMAP, NOT A GUESS. If Supabase is down the
// feed lists the country page and nothing else, which is true. The alternative,
// serving a cached or assumed list, would tell a search engine that pages exist
// which we could not confirm exist, and that is the same rule this project
// applies to every Places and Directions lookup: never conclude a fact from a
// failed lookup.
const townNames = async () => {
  const names = hardcodedTowns.map(t => t?.name).filter(Boolean);
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gemlyx_content?select=payload&type=eq.town&published=eq.true`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout(2500) },
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) rows.forEach(r => { if (r?.payload?.name) names.push(r.payload.name); });
    }
  } catch { /* a short sitemap is honest; an invented one is not */ }
  return names;
};

// The real built index.html, so a crawler response is a working page and not a
// stub. /index.html does not match this file's matcher, so it cannot loop.
// fetch only rejects on a network failure, so a 404 or a deployment-protection
// login page arrives here as a perfectly resolved response, which is why .ok
// and the </head> check are both required before it is used.
const fetchShell = async (origin) => {
  try {
    const res = await fetch(new URL("/index.html", origin), { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const html = await res.text();
    return html.includes("</head>") ? html : null;
  } catch { return null; }
};

const cardResponse = (html) => new Response(html, {
  status: 200,
  headers: {
    "content-type": "text/html; charset=utf-8",
    // Without Vary a CDN is free to hand one link's HTML to the next person
    // who opens a different one.
    vary: "User-Agent",
    "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
  },
});

const findTown = async (slug) => {
  const local = findBySlug(hardcodedTowns, slug);
  if (local) return local;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gemlyx_content?select=payload&type=eq.town&published=eq.true`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return findBySlug((Array.isArray(rows) ? rows : []).map(r => r?.payload).filter(Boolean), slug);
  } catch { return null; }
};

export default async function middleware(request) {
  try {
    const url = new URL(request.url);

    // ── THE SITEMAP ───────────────────────────────────────────────────
    // Served BEFORE the crawler gate below, deliberately. A sitemap exists for
    // crawlers, and gating it on a user-agent allowlist would hide it from
    // every bot not on that list, which is most of them.
    //
    // This is the piece without which town pages achieve nothing. The Towns
    // page renders each place as a <button onClick>, so there is no href
    // anywhere in the app for a crawler to follow. Making the URLs exist does
    // not make them discoverable; something has to list them, and this is it.
    if (url.pathname === "/sitemap.xml") {
      return new Response(sitemapXml(SITE_ORIGIN, await townNames()), {
        status: 200,
        headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
      });
    }

    // A person: hand straight back to the app. This is the overwhelming
    // majority of requests and it costs one regex.
    if (!isCrawler(request.headers.get("user-agent"))) return next();
    // ── A TOWN PAGE'S OWN CARD ────────────────────────────────────────
    // Same rule as the guide branch below: a town we cannot find gets the
    // site's card rather than a card describing a page that is not there.
    const townMatch = new RegExp(`^/${COUNTRY}/([^/]+)/?$`).exec(url.pathname);
    if (townMatch) {
      const town = await findTown(decodeURIComponent(townMatch[1]));
      if (!town) return next();
      const shell = await fetchShell(url.origin);
      if (!shell) return next();
      const where = [town.region, "Denmark"].filter(Boolean).join(", ");
      // The entry's own words, never a template. With nothing to say we say the
      // plain true thing rather than inventing a description for it.
      const desc = String(town.desc || town.highlight || `${town.name} in ${where}, on Gemlyx.`).replace(/\s+/g, " ").trim();
      return cardResponse(injectMeta(shell, {
        title: `${town.name}, Denmark`,
        description: desc.length > 200 ? `${desc.slice(0, 197)}...` : desc,
        url: `${SITE_ORIGIN}/${COUNTRY}/${placeSlug(town.name)}`,
        // A relative photo path has to become absolute: a crawler fetches the
        // image from wherever the tag says, and a bare /towns/x.jpg is nowhere.
        image: /^https?:\/\//i.test(town.photo || "") ? town.photo : `${SITE_ORIGIN}${town.photo || "/og-default.jpg"}`,
      }));
    }

    const id = guideIdFromPath(url.pathname);
    if (!id) return next();

    // NO GUIDE MEANS NO GUIDE-SPECIFIC TAGS. Three outcomes, and only one of
    // them gets a card about a trip:
    //   • a real payload          → the guide's own title and counted summary
    //   • Supabase says zero rows → this id does not exist. The link is dead,
    //     and a card headed "A Denmark guide" over a dead URL would make a
    //     broken link look valid to the person it was sent to. They get the
    //     site's own card, and the app's "Guide not found" screen on tapping it.
    //   • the lookup failed       → we do not know, so we claim nothing. The
    //     same rule this project applies to every Places and Directions lookup:
    //     never conclude a fact from a failed lookup.
    // TIMEOUTS ON BOTH FETCHES. The catch below turns any throw into next(),
    // but a hang is not a throw: a degraded Supabase would run the invocation
    // past Vercel's Edge wall-clock limit, and Vercel's own error page would go
    // out instead — which Facebook and WhatsApp then cache against that URL for
    // hours. A timeout converts the one failure mode catch cannot see into one
    // it can.
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gemlyx_guides?select=payload&id=eq.${encodeURIComponent(id)}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return next();
    const rows = await res.json();
    const guide = (Array.isArray(rows) && rows[0]?.payload) || null;
    if (!guide) return next();

    // The real built index.html, so the response is a working page and not a
    // stub. /index.html does not match this file's matcher, so it cannot loop.
    const shell = await fetch(new URL("/index.html", url.origin), { signal: AbortSignal.timeout(2500) });
    // fetch only rejects on a network failure, so a 404 or a deployment-
    // protection login page arrives here as a perfectly resolved response.
    if (!shell.ok) return next();
    const html = await shell.text();
    if (!html.includes("</head>")) return next();

    return new Response(
      injectMeta(html, {
        guide,
        url: `${url.origin}/guide/${encodeURIComponent(id)}`,
        // Deliberately SITE_ORIGIN and not url.origin: a preview deployment's
        // card should still show a real image rather than one behind that
        // deployment's protection.
        image: `${SITE_ORIGIN}/og-default.jpg`,
      }),
      {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          // Without Vary a CDN is free to hand one link's HTML to the next
          // person who opens a different one.
          vary: "User-Agent",
          "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    // Anything at all. The app is what a person came for.
    return next();
  }
}
