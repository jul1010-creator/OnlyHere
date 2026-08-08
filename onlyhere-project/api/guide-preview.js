// /api/guide-preview.js
// ── WHAT A SHARED GUIDE LOOKS LIKE BEFORE ANYBODY CLICKS IT ──────────
//
// The share button was the visible half of this feature. This is the half that
// decides whether it works, and it is the kind of bug this project keeps
// finding: a silent failure that looks like a working feature.
//
// Gemlyx is a Vite single-page app. Every URL, including /guide/81peftd1w67,
// serves the same static index.html and the app then paints the page with
// JavaScript. WhatsApp, iMessage, Slack, Discord, Facebook and Signal do not
// run JavaScript. They fetch the URL once, read the <meta> tags in the HTML
// they get back, and render a card from those. index.html carried no og: tags
// at all, so every Gemlyx link ever pasted anywhere — a guide, the front page,
// a town — arrived as a bare grey URL with no title, no picture and no
// description. The Copy link button worked perfectly. The link did not.
//
// A person deciding whether to open a travel link their partner sent them is
// looking at that card and nothing else.
//
// ── WHY THE CRAWLER GATE IS IN vercel.json AND NOT IN HERE ───────────
// This function only ever runs for a request whose User-Agent matches a known
// preview crawler; see the rewrite in vercel.json. A human's browser goes
// straight to the static app exactly as it does today and never touches this
// code. That is deliberate, and it is about failure modes:
//
//   • if this function breaks, crawlers get no card, which is today's
//     behaviour — nothing a person can reach gets worse
//   • if the crawler list misses a new app, that app gets no card, which is
//     again today's behaviour
//   • a human never waits on a Supabase round trip or a function cold start to
//     open a link somebody sent them
//
// Every failure here degrades to what shipped before it, which is the only
// acceptable shape for a feature that sits in front of a first impression.
//
// ── HOW TO CHECK IT IS ACTUALLY WORKING ──────────────────────────────
// Not by pasting a link into WhatsApp and squinting; WhatsApp caches previews
// aggressively and will show you a stale card for hours. One command, and the
// answer is in the output:
//
//   curl -sA "WhatsApp/2.23.20" https://only-here-three.vercel.app/guide/<id> | head -30
//
// Real og:title and og:description in that output means it works. The plain
// index.html means the rewrite did not match, and the first thing to check is
// the user-agent regex in vercel.json.

import { SUPABASE_URL, SUPABASE_KEY, SITE_ORIGIN } from "../src/config.js";
import { shareTitle, metaDescription, escapeHtml } from "../src/utils/share.js";

// LAST RESORT ONLY. Every normal response from this function is the real built
// index.html with the tags folded in (see injectMeta and the handler); this
// bare version is what goes out when the app shell itself could not be fetched.
//
// It used to be the primary response for anything matching the crawler list,
// which was a genuine trap: "Pinterest", "Tumblr", "Flipboard", "Viber",
// "Line/" and "Signal" all appear in the user-agent of the browser EMBEDDED IN
// those apps, which is exactly where a link opens when a friend taps it. A
// person tapping a guide inside LINE — the default messenger across much of
// Asia — got this page: no app, no script, and an "open this guide" link
// pointing back at the same URL that served it. Unopenable, and it looked like
// a broken site rather than an error. Those tokens are gone from the lists
// below, and this page can no longer be the thing a person lands on.
export const buildPreviewHtml = ({ guide, url, image, siteName = "Gemlyx" }) => {
  const title = shareTitle(guide);
  const desc = metaDescription(guide);
  const t = escapeHtml(title), d = escapeHtml(desc), u = escapeHtml(url), i = escapeHtml(image);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${t} — Gemlyx</title>
    <link rel="canonical" href="${u}" />
    <meta name="description" content="${d}" />
    <meta property="og:site_name" content="${escapeHtml(siteName)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${u}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:image" content="${i}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Gemlyx" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${i}" />
  </head>
  <body>
    <h1>${t}</h1>
    <p>${d}</p>
    <p><a href="${u}">Open this guide on Gemlyx</a></p>
  </body>
</html>`;
};

// The tags, folded into the real built index.html. THIS IS THE NORMAL PATH, for
// crawlers and people alike: one response shape means there is no way to serve
// somebody the wrong one. A crawler reads the tags and ignores the script; a
// browser boots the app exactly as it would have from the static file.
export const injectMeta = (html, { guide, url, image }) => {
  const built = buildPreviewHtml({ guide, url, image });
  const tags = built
    .split("\n")
    .filter((l) => /<meta (property="og:|name="twitter:|name="description")|<link rel="canonical"/.test(l))
    .join("\n");
  if (!html.includes("</head>")) return html;
  // ── EVERY REPLACEMENT HERE IS A FUNCTION, NOT A STRING ────────────
  // String.replace expands $&, $1, $` and $' inside a replacement STRING. The
  // tags carry a guide title, so a guide called "$100 a day in Odense" or one
  // with a stray $& in it would have had the matched "</head>" spliced into its
  // own og:title. escapeHtml cannot help: $ is not HTML-special, the expansion
  // happens in the replace call afterwards. A function replacement is never
  // scanned for those patterns, which removes the whole class rather than
  // escaping one instance of it.
  let out = html.replace("</head>", () => `${tags}\n  </head>`);
  // The document title is what a browser tab and some crawlers show, and the
  // static shell's is the site's, not this guide's.
  const title = /<title>([\s\S]*?)<\/title>/.exec(built)?.[1];
  if (title) out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${title}</title>`);
  return out;
};

export default async function handler(req, res) {
  const id = String(req.query?.id || "").trim();
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const origin = host ? `https://${host}` : SITE_ORIGIN;
  const url = `${origin}/guide/${encodeURIComponent(id)}`;
  const image = `${SITE_ORIGIN}/og-default.jpg`;

  // NO GUIDE MEANS NO GUIDE-SPECIFIC TAGS. Three outcomes, and only one of them
  // gets a card about a trip:
  //   • a real payload            → the guide's own title and counted summary
  //   • Supabase says zero rows   → this id does not exist. The link is dead,
  //     and a card headed "A Denmark guide" would make a broken URL look valid
  //     to the person it was sent to. They get the site's own card instead, and
  //     the app's "Guide not found" screen when they tap it.
  //   • the lookup failed         → we do not know, so we claim nothing. Same
  //     rule this project applies everywhere else: never conclude a fact from a
  //     failed lookup.
  let guide = null;
  if (id) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/gemlyx_guides?select=payload&id=eq.${encodeURIComponent(id)}`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      const rows = r.ok ? await r.json() : null;
      guide = (Array.isArray(rows) && rows[0]?.payload) || null;
    } catch {
      guide = null;
    }
  }

  // Vary matters: without it a CDN is free to hand one link's HTML to the next
  // person who opens a different one. The short s-maxage is for the crawlers
  // that re-fetch a link every time it is pasted.
  res.setHeader("Vary", "User-Agent");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  try {
    const shell = await fetch(`${origin}/index.html`);
    // fetch only rejects on a network failure, so a 404 or a deployment-
    // protection login page arrives here as a perfectly resolved response. Left
    // unchecked, that page would be injected with og tags and returned as a 200
    // under somebody's guide URL.
    if (!shell.ok) throw new Error(`shell ${shell.status}`);
    const html = await shell.text();
    if (!html.includes("</head>")) throw new Error("shell has no head");
    // No guide, no injection: index.html's own baseline card stands, which is
    // true of every page of the site.
    return res.status(200).send(guide ? injectMeta(html, { guide, url, image }) : html);
  } catch {
    return res.status(200).send(buildPreviewHtml({ guide, url, image }));
  }
}
