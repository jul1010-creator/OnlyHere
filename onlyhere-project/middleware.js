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
import { isCrawler, guideIdFromPath, injectMeta, articleHtml, structuredData, injectArticle, worthServing } from "./src/utils/linkPreview.js";
import { placeSlug, findBySlug, sitemapXml, COUNTRY, parseEntryUrl, entryUrlPath, typesForSeg } from "./src/utils/placeUrl.js";
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
// ── AND EVERY OTHER PUBLISHED PAGE, AS OF 16 AUG ────────────────────
// This asked for towns only, which is why the live sitemap listed 33 URLs while
// the site held several times that many researched entries. One query for
// everything now, and the type comes back with the payload so each row can be
// turned into the right address.
//
// TWO FILTERS, AND BOTH REFUSE RATHER THAN GUESS:
//
//   entryUrlPath returns null for a type with no page in the app (a nightlife
//   town, an essential), so those are never listed. A sitemap entry pointing at
//   an address that renders nothing is a promise the site cannot keep.
//
//   worthServing refuses a row with no real paragraph in it. Telling a search
//   engine about a hundred stubs is the "many pages without adding value" shape
//   from Google's own scaled-content policy, which is the thing this whole night
//   was about avoiding, not a step towards it.
const publishedEntries = async () => {
  const entries = hardcodedTowns.map(t => t?.name).filter(Boolean).map(name => ({ type: "town", name }));
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gemlyx_content?select=type,payload&published=eq.true&order=id.desc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout(2500) },
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) rows.forEach(r => {
        const name = r?.payload?.name;
        if (!name || !entryUrlPath(r?.type, name)) return;
        if (!worthServing(r.payload)) return;
        entries.push({ type: r.type, name });
      });
    }
  } catch { /* a short sitemap is honest; an invented one is not */ }
  return entries;
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

// order=id.desc ON BOTH FETCHES IN THIS FILE, AND IT MATTERS HERE MOST.
// findBySlug returns the FIRST match, and five towns have duplicate published
// rows today (Ribe, Samsø, Ringkøbing, Dragør, Møgeltønder). Unordered, this
// lookup and the app's own loader could each land on a different row for the
// same slug, so the WhatsApp card would describe one version of Ribe and the
// page it opened would render the other. Both now take the newest id.
const findTown = async (slug) => {
  const local = findBySlug(hardcodedTowns, slug);
  if (local) return local;
  return findEntry("", slug);
};

// ── AND THE SAME LOOKUP FOR EVERY OTHER KIND ────────────────────────
// One function, one query, whatever the segment. `types` comes from
// utils/placeUrl.js rather than from a list here, so the URL vocabulary is
// declared once: a segment can cover two Studio types (a food street is a food
// place, a bar street is a nightlife place) and PostgREST takes both in one `in`
// filter. An empty segment is a town, which keeps the two paths on one code path.
//
// order=id.desc for the reason above: five towns have duplicate published rows,
// findBySlug returns the first match, and unordered this lookup and the app's own
// loader could each land on a different row for the same slug.
const findEntry = async (seg, slug) => {
  const types = seg ? typesForSeg(seg) : ["town"];
  if (!types.length) return null;
  try {
    const filter = types.length === 1 ? `type=eq.${types[0]}` : `type=in.(${types.join(",")})`;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gemlyx_content?select=payload&${filter}&published=eq.true&order=id.desc`,
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
      return new Response(sitemapXml(SITE_ORIGIN, await publishedEntries()), {
        status: 200,
        headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
      });
    }

    // A person: hand straight back to the app. This is the overwhelming
    // majority of requests and it costs one regex.
    if (!isCrawler(request.headers.get("user-agent"))) return next();
    // ── AN ENTRY PAGE'S OWN CARD, WHATEVER KIND IT IS ─────────────────
    // Same rule as the guide branch below: an entry we cannot find gets the
    // site's card rather than a card describing a page that is not there.
    //
    // ONE BRANCH FOR ALL SIX KINDS as of 16 Aug. This matched a single path
    // segment, so it served towns and nothing else, and the five kinds that
    // gained an address that night would have fallen through to the site card
    // with the town branch sitting right here looking like it covered them.
    // parseEntryUrl reads both shapes and hands back which kind it is.
    const entryRoute = parseEntryUrl(url.pathname);
    if (entryRoute) {
      const town = entryRoute.kind === "town"
        ? await findTown(entryRoute.slug)
        : await findEntry(entryRoute.seg, entryRoute.slug);
      if (!town) return next();
      const shell = await fetchShell(url.origin);
      if (!shell) return next();
      const where = [town.region, "Denmark"].filter(Boolean).join(", ");
      // The entry's own words, never a template. With nothing to say we say the
      // plain true thing rather than inventing a description for it.
      const desc = String(town.desc || town.highlight || `${town.name} in ${where}, on Gemlyx.`).replace(/\s+/g, " ").trim();
      const townUrl = `${SITE_ORIGIN}${entryUrlPath(entryRoute.kind === "town" ? "town" : (typesForSeg(entryRoute.seg)[0] || ""), town.name) || `/${COUNTRY}/${placeSlug(town.name)}`}`;
      // A relative photo path has to become absolute: a crawler fetches the
      // image from wherever the tag says, and a bare /towns/x.jpg is nowhere.
      const townImage = /^https?:\/\//i.test(town.photo || "") ? town.photo : `${SITE_ORIGIN}${town.photo || "/og-default.jpg"}`;
      // A town's title is unchanged, because 32 of them are indexed under it. For
      // everything else the locality earns its place: "Jomfru Ane Gade, Aalborg"
      // answers where before a reader has to open anything, and a bar name on its
      // own followed by "Denmark" answers nothing.
      const locality = entryRoute.kind === "town" ? "" : String(town.town || town.city || "").trim();
      const withMeta = injectMeta(shell, {
        title: locality && locality !== town.name ? `${town.name}, ${locality}` : `${town.name}, Denmark`,
        description: desc.length > 200 ? `${desc.slice(0, 197)}...` : desc,
        url: townUrl,
        image: townImage,
      });
      // ── AND THE WORDS, WHICH THIS RESPONSE HAS NEVER CARRIED ──────
      //
      // Until tonight this was meta tags on an empty shell: a correct title and
      // a correct description over a page with no sentence about the town in it.
      // Every word of an entry arrives from Supabase after first paint, so
      // anything that reads the page without running the app, which is every
      // crawler without a renderer and every AI answer engine there now is, saw
      // nothing whatsoever. Checked against the live site before writing this: a
      // fetch of /denmark/billund contains no sentence about Billund anywhere.
      //
      // NOTHING IS ADDED HERE. The article is the row's own name, description
      // and blogBody, in their own order, which is what DetailPage renders for a
      // person out of this same payload. Google's cloaking rule is about
      // presenting DIFFERENT content to a crawler, and its named example is
      // inserting text only when the requester is a search engine. Serving the
      // same words is the opposite of that. If these two ever diverge, one of
      // them is a bug, which is why the test asserts the fields and not a string.
      //
      // It costs nothing: findTown already fetched this payload for the card.
      return cardResponse(injectArticle(withMeta, {
        article: articleHtml(town),
        jsonLd: structuredData(town, { url: townUrl, image: townImage, origin: SITE_ORIGIN, region: town.region }),
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
