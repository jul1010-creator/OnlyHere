// ── WHAT A SHARED GUIDE LOOKS LIKE BEFORE ANYBODY CLICKS IT ──────────
//
// The share button was the visible half of sharing. This is the half that
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
// ── WHY THIS IS EDGE MIDDLEWARE AND NOT AN api/ FUNCTION ─────────────
// It was written as api/guide-preview.js first and could not deploy:
//
//   "No more than 12 Serverless Functions can be added to a Deployment on the
//    Hobby plan."
//
// api/ already holds exactly 12. Edge Middleware is counted separately from
// that limit, so ../middleware.js costs no slot and leaves all 12 free for
// real API work. It turned out to be the better design anyway: the crawler
// list below is ordinary JavaScript with a real /i flag, tested in
// tests/run.mjs, instead of a regex string buried in vercel.json whose flavour
// and case-sensitivity could only be verified by deploying and squinting.
//
// Everything in this file is pure. Nothing here touches the network; the
// middleware does that and hands the results in.

import { shareTitle, metaDescription, escapeHtml } from "./share.js";

// ── WHO GETS THE TAGS ────────────────────────────────────────────────
// BOT TOKENS ONLY, and that distinction is load-bearing. The first version of
// this list also carried "Pinterest", "Tumblr", "Flipboard", "Viber", "Line/",
// "Signal" and "Mastodon" — every one of which appears in the user-agent of the
// browser EMBEDDED IN those apps, which is exactly where a link opens when a
// friend taps it. A person tapping a guide inside LINE, the default messenger
// across much of Asia, would have been handed a preview stub instead of the app.
//
// Where a crawler has a distinctly named bot, the bot name is used and the app
// name is not: FlipboardProxy rather than Flipboard, "Mastodon/" with the slash
// that only its server-side fetcher carries.
//
// KNOWN GAP, written down rather than quietly hoped about: iMessage's preview
// fetcher sends a user-agent indistinguishable from desktop Safari, so it
// cannot be detected. iMessage shares get index.html's site-level card instead
// of the guide's own. That is a real card with a real picture, just not the
// per-trip one.
export const CRAWLERS = /facebookexternalhit|whatsapp|twitterbot|slackbot|slack-imgproxy|discordbot|telegrambot|linkedinbot|redditbot|skypeuripreview|applebot|bingbot|googlebot|google-inspectiontool|embedly|iframely|quora link preview|vkshare|bitlybot|flipboardproxy|mastodon\/|yahoo link preview|discourse forum onebox|whatsapp\/|pinterestbot/i;

export const isCrawler = (userAgent) => CRAWLERS.test(String(userAgent || ""));

// "/guide/81peftd1w67" → "81peftd1w67". Anything that is not a saved guide's id
// returns null, which means "no guide-specific card", which means index.html's
// own card stands. /guide/new is the confirm-before-saving screen: it has no id,
// it is nobody's shared link, and there is nothing in the database to describe.
export const guideIdFromPath = (pathname) => {
  const m = /^\/guide\/([^/?#]+)\/?$/.exec(String(pathname || ""));
  const id = m && decodeURIComponent(m[1]).trim();
  if (!id || id === "new") return null;
  return id;
};

// LAST RESORT ONLY. Every normal response is the real built index.html with the
// tags folded in (see injectMeta). This bare version goes out only when the app
// shell itself could not be fetched, and it must never be what a person lands
// on — hence the crawler gate above, and hence the middleware falling through
// to the ordinary app on every error path rather than to this.
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

// The tags, folded into the real built index.html. THIS IS THE NORMAL PATH: one
// response shape means there is no way to serve somebody the wrong one. A
// crawler reads the tags and ignores the script; a browser boots the app exactly
// as it would have from the static file.
export const injectMeta = (html, { guide, url, image }) => {
  const built = buildPreviewHtml({ guide, url, image });
  const tags = built
    .split("\n")
    .filter((l) => /<meta (property="og:|name="twitter:|name="description")|<link rel="canonical"/.test(l))
    .join("\n");
  if (!html.includes("</head>")) return html;
  // ── THE SHELL'S OWN TAGS COME OUT FIRST ───────────────────────────
  // index.html now carries a site-level card of its own (added the same day as
  // this file), and these were being APPENDED after it. Every crawler that
  // matters — Facebook, WhatsApp, Slack — takes the FIRST occurrence of a
  // singular og property, so the guide's title, description and image all lost
  // to the site's, and og:url plus rel=canonical pointed a shared trip at the
  // home page. The feature looked like it worked because <title> is the one
  // thing that was being replaced rather than added, and `curl | head -30` shows
  // the title.
  //
  // Only the four kinds this function re-emits are removed. theme-color,
  // viewport, charset and the icon are left exactly where they are.
  html = html
    .replace(/[ \t]*<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*"|name="description")[^>]*>\r?\n?/g, "")
    .replace(/[ \t]*<link\s+rel="canonical"[^>]*>\r?\n?/g, "");
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
