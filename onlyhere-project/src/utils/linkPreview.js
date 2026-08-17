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

// ── AND THE PAGE ITSELF, WHICH A CRAWLER HAS NEVER SEEN ──────────────
//
// Oliver, 16 Aug 2026: "Google hides pages that are too 'AI-generated'... my
// blogs are not safe from this."
//
// Checked before building anything on it, the premise is narrower than the
// worry. Google's spam policy names SCALED CONTENT ABUSE, "many pages generated
// for the primary purpose of manipulating search rankings and not helping
// users", and its generative-AI page says how content was made is not the test.
//
// What the audit found instead is worse and more fixable. Every entry on this
// site is fetched from Supabase by JavaScript after first paint, and the crawler
// response built above is META TAGS ONLY. So a reader that does not run the app
// gets a correct title, a correct description, a correct canonical, and a page
// with no words in it. Verified against the live site: a fetch of
// /denmark/billund comes back with no sentence about Billund in it anywhere.
//
// Googlebot does render JavaScript, so this is not "invisible". It is the
// weakest form of visible there is: rendering is a second, slower, best-effort
// pass, and everything else that reads pages now, every AI answer engine and
// every crawler without a renderer, sees the empty version.
//
// ── THE ONE RULE THIS OBEYS, AND IT IS THE ONLY REASON IT IS SAFE ────
// Cloaking, in Google's own words, is "presenting different content to users and
// search engines with the intent to manipulate search rankings and mislead
// users", and its named example is "inserting text or keywords into a page only
// when the user agent that is requesting the page is a search engine".
//
// So this adds NOTHING. Not a keyword, not a summary, not a sentence written for
// a crawler. It emits the entry's own name, its own description and its own
// blogBody, in their own order, which is exactly what DetailPage renders for a
// person from the same payload. If those two ever diverge, this is the bug and
// not the feature, which is why the test asserts the fields rather than the
// output. Serving the same HTML to everybody would remove the question entirely
// and is the follow-up: it needs the middleware to stop falling through for
// people, and that file's safety rule says a person always gets the app.
const BODY_CAP = 24000;      // an entry is a few thousand characters; this is a runaway guard

// The blocks a page is made of, in order, in the shape a renderer wants. Kept
// separate from the HTML so the ordering can be tested without parsing tags.
export const articleBlocks = (payload) => {
  const out = [];
  const name = String(payload?.name || "").trim();
  if (name) out.push({ tag: "h1", text: name });
  const desc = String(payload?.desc || "").trim();
  if (desc) out.push({ tag: "p", text: desc });
  (Array.isArray(payload?.blogBody) ? payload.blogBody : []).forEach(b => {
    if (!b || typeof b !== "object") return;
    if (b.type === "heading" && String(b.content || "").trim()) out.push({ tag: "h2", text: String(b.content).trim() });
    else if (b.type === "paragraph" && String(b.content || "").trim()) out.push({ tag: "p", text: String(b.content).trim() });
    else if (b.type === "bullets" && Array.isArray(b.items)) {
      const items = b.items.map(i => String(i || "").trim()).filter(Boolean);
      if (items.length) out.push({ tag: "ul", items });
    }
    // An image block carries a caption a person sees, and the picture itself
    // cannot be reproduced here without also reproducing its credit, which the
    // licence requires and this function has no room for. So images are left
    // out entirely rather than half-included.
  });
  return out;
};

// A page needs to be worth reading before it is worth serving. One heading and
// nothing else is the empty shell with extra steps, and publishing that to a
// crawler is how a site earns the "thin" it is trying to avoid.
export const worthServing = (payload) => {
  const blocks = articleBlocks(payload);
  const words = blocks.reduce((n, b) => n + (b.items ? b.items.join(" ") : b.text).split(/\s+/).filter(Boolean).length, 0);
  return blocks.some(b => b.tag === "p" || b.tag === "ul") && words >= 60;
};

export const articleHtml = (payload) => {
  if (!worthServing(payload)) return "";
  const parts = articleBlocks(payload).map(b => {
    if (b.tag === "ul") return `<ul>${b.items.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
    return `<${b.tag}>${escapeHtml(b.text)}</${b.tag}>`;
  });
  const body = parts.join("\n");
  return `<article>\n${body.length > BODY_CAP ? `${body.slice(0, BODY_CAP)}\n` : body}\n</article>`;
};

// ── AND WHAT THE PAGE IS, IN A FORM A MACHINE READS ──────────────────
// Google's generative-AI guidance asks for quality and accuracy "across all
// content elements, including metadata and structured data", and this site has
// none at all: zero occurrences of application/ld+json anywhere.
//
// EVERY FIELD IS SOMETHING THE ROW ACTUALLY KNOWS. No dates, and that is
// deliberate: the middleware selects `payload` and nothing else, so nobody here
// knows when the row was created or last changed, and a datePublished invented
// from today's clock would be the same class of lie as an undated timetable. Add
// created_at to that select and the dates can follow honestly.
export const structuredData = (payload, { url, image, origin, region } = {}) => {
  const name = String(payload?.name || "").trim();
  if (!name || !url) return "";
  const desc = String(payload?.desc || "").replace(/\s+/g, " ").trim();
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: name,
    ...(desc ? { description: desc.length > 300 ? `${desc.slice(0, 297)}...` : desc } : {}),
    ...(image ? { image } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: "Gemlyx", ...(origin ? { url: origin } : {}) },
    publisher: { "@type": "Organization", name: "Gemlyx", ...(origin ? { url: origin } : {}) },
    about: {
      "@type": "Place",
      name,
      address: { "@type": "PostalAddress", addressCountry: "DK", ...(region ? { addressRegion: String(region) } : {}) },
    },
  };
  // </script> inside a JSON string would end the block early and put the rest of
  // the payload on the page as text. Escaping the slash is the standard fix and
  // leaves the JSON valid.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
};

// ── PUTTING IT IN THE SHELL ──────────────────────────────────────────
// The article goes INSIDE #root, not beside it. ReactDOM.createRoot().render()
// replaces the container's children on mount, so a person who does run the app
// sees this for the moment before React takes over and never sees it twice.
// Anywhere else on the page it would still be there afterwards, and text that a
// person cannot see but a crawler can is hidden text, which is its own spam
// policy and a worse problem than the one this solves.
export const injectArticle = (html, { article = "", jsonLd = "" } = {}) => {
  let out = String(html || "");
  if (jsonLd && out.includes("</head>")) out = out.replace("</head>", () => `  ${jsonLd}\n  </head>`);
  if (article) {
    // The built shell's own div, exactly as Vite emits it. Matched loosely on
    // attribute order and whitespace, because a build tool is free to change
    // either, and an empty-container match only: a shell that already has
    // children is not this file's to overwrite.
    const empty = /<div\s+id="root"\s*>\s*<\/div>/;
    if (empty.test(out)) out = out.replace(empty, () => `<div id="root">${article}</div>`);
  }
  return out;
};
