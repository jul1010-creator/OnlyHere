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

// Only guide URLs. Everything else on the site keeps index.html's own card and
// never pays for this to run.
export const config = { matcher: "/guide/:path*" };

export default async function middleware(request) {
  try {
    // A person: hand straight back to the app. This is the overwhelming
    // majority of requests and it costs one regex.
    if (!isCrawler(request.headers.get("user-agent"))) return next();

    const url = new URL(request.url);
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
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gemlyx_guides?select=payload&id=eq.${encodeURIComponent(id)}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!res.ok) return next();
    const rows = await res.json();
    const guide = (Array.isArray(rows) && rows[0]?.payload) || null;
    if (!guide) return next();

    // The real built index.html, so the response is a working page and not a
    // stub. /index.html does not match this file's matcher, so it cannot loop.
    const shell = await fetch(new URL("/index.html", url.origin));
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
