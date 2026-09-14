// ── THE PLACE'S OWN SOCIAL ACCOUNTS ─────────────────────────────────
//
// Oliver, 14 Sep 2026, two messages apart:
//
//   "API direct key should also be used for attractions own social media.. it's
//    often the place they announce seasonal things."
//   "I want you to get a sweep done for everything.. a search for every
//    attraction and event's own social media. This will be useful for later
//    redrafts, when things need to get updated."
//
// He is right about where the information is. A castle announces its winter
// hours on Facebook and gets round to the website in March. A festival that
// moves its dates posts on Instagram the same afternoon. The events audit found
// that the Naestved row is stuck because an annual festival whose next edition
// falls in a different month can only be updated through the site read tier,
// and a row with no website on file is refused every single run. A festival
// with no website still has a Facebook page.
//
// ── WHAT THIS FILE IS, AND WHAT IT REFUSES TO BE ────────────────────
//
// It finds the ACCOUNT. It never reads a post, never quotes one, and nothing it
// produces reaches a traveller. The output is a handle and a URL stored against
// a row, which is a fact with a source rather than a claim about the world, and
// it makes every later check cheap and aimed: ask that account, rather than ask
// the internet about this name.
//
// The rule for everything downstream of it, written here because this is where
// the path starts: SOCIAL IS A SIGNAL AND NEVER A SOURCE. A caption saying "see
// you in June!" is a reason to look, not a date. Every stated fact in this app
// carries who said it and when (see statedAsFact in tickets.js and the 120 day
// window beside it), and a stranger's caption cannot carry either.
//
// ── THE CHEAPEST TIER IS FREE AND IT IS ALSO THE BEST ───────────────
//
// A business links its own accounts in its own footer. So the first tier is the
// page we already hold a URL for, read through readPage.js, which every other
// lookup in this app already uses. No search, no key, no cost, and the account
// is the place's own BY CONSTRUCTION rather than by a judgement somebody made
// about a name. API Direct is the second tier, for the rows with no website,
// which is exactly the case that is stuck today.
//
// ── AND NOT EVERY SOCIAL LINK ON A PAGE IS THE PLACE'S ──────────────
//
// Three kinds of link are not an account at all, and each of them is on almost
// every page in Denmark:
//
//   A SHARE BUTTON.   facebook.com/sharer, twitter.com/intent/tweet. The
//                     visitor's own account is the subject, not the venue's.
//   A PIECE OF CONTENT rather than a profile: instagram.com/p/, a youtube
//                     watch URL, a hashtag feed. Real, and not an account.
//   SOMEBODY ELSE'S.  The web agency in the credit line, the ticket seller, the
//                     tourist board, the platform's own help page.
//
// Each is refused by SHAPE rather than by a guess: the path says what it is.
// What is deliberately NOT refused is the account that names a parent
// organisation (a museum group, a municipality running four sites), because
// that account does announce the seasonal things, and refusing it would throw
// away the signal to protect a tidier record.

import { fold } from "./danishNames";

// Every platform worth asking, with the shape of a PROFILE url and the paths
// that are not one. The handle is what the later check needs; the url is what a
// person opens to disagree with us.
//
// The `bad` lists are paths that exist on that platform and are not a profile.
// They are listed rather than guessed at because each one turns up on real
// Danish venue pages: sharer and intent are the share buttons, /p/ and /reel/
// are Instagram posts, /watch and /playlist are YouTube content, /hashtag and
// /explore are feeds, and the rest are the platform talking about itself.
const PLATFORMS = [
  { key: "facebook", host: /(?:^|\.)facebook\.com$|(?:^|\.)fb\.com$|(?:^|\.)fb\.me$/,
    bad: ["sharer", "share", "sharer.php", "dialog", "plugins", "tr", "login", "help",
          "policies", "privacy", "terms", "events", "groups", "watch", "marketplace",
          "profile.php", "people", "hashtag", "search", "business", "ads"] },
  { key: "instagram", host: /(?:^|\.)instagram\.com$/,
    bad: ["p", "reel", "reels", "tv", "stories", "explore", "accounts", "about",
          "legal", "developer", "directory", "s"] },
  { key: "x", host: /(?:^|\.)twitter\.com$|(?:^|\.)x\.com$/,
    bad: ["intent", "share", "home", "search", "hashtag", "i", "settings", "login",
          "privacy", "tos", "explore", "notifications", "messages"] },
  { key: "tiktok", host: /(?:^|\.)tiktok\.com$/,
    bad: ["tag", "music", "discover", "legal", "about", "embed", "share", "login"] },
  { key: "youtube", host: /(?:^|\.)youtube\.com$|(?:^|\.)youtu\.be$/,
    bad: ["watch", "playlist", "embed", "shorts", "results", "feed", "about", "t",
          "howyoutubeworks", "redirect", "hashtag"] },
  { key: "linkedin", host: /(?:^|\.)linkedin\.com$/,
    bad: ["shareArticle", "sharing", "feed", "legal", "help", "login", "uas", "pulse", "posts"] },
];

// Somebody else's account, however it got onto the page. These are the ones
// that turn up in a footer or a credit line beside the venue's own, and every
// name here is a real organisation rather than a word that might be part of a
// venue's name: the check below is against the HANDLE, and a handle is a whole
// token.
const NOT_THEIRS = /^(?:visitdenmark|visitaarhus|visitcopenhagen|visitodense|visitnordjylland|wonderfulcopenhagen|dansketurist\w*|billetlugen|ticketmaster\w*|tiqets|getyourguide|viator|booking\w*|tripadvisor|google\w*|facebook|instagram|meta|youtube|tiktok|linkedin|wordpress|wix|squarespace|shopify|mailchimp|siteimprove|umbraco|dandomain|wannafind|scannet)$/i;

const stripW = (h) => String(h || "").replace(/^www\./i, "").toLowerCase();

// A url or nothing. Everything below reads a parsed URL rather than a string,
// so a malformed href is one `null` here and never a half parsed guess later.
export const asUrl = (raw) => {
  const t = String(raw || "").trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/\//, "")}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch { return null; }
};

// ── ONE ACCOUNT, OR NOTHING ─────────────────────────────────────────
//
// The whole judgement about whether a link is a profile lives here, in the
// shape of the path, so the sweep and anything written later cannot disagree
// about what an account is.
//
// A YouTube channel has three spellings (@handle, /c/name, /channel/UC...) and
// all three are the same kind of thing, so all three are read. A bare
// youtube.com/name is the old spelling and still resolves.
export const accountIn = (raw) => {
  const u = asUrl(raw);
  if (!u) return null;
  const host = stripW(u.hostname);
  const p = PLATFORMS.find(x => x.host.test(host));
  if (!p) return null;
  const segs = u.pathname.split("/").map(s => s.trim()).filter(Boolean);
  if (!segs.length) return null;
  let handle = segs[0];
  // YouTube's three spellings, and LinkedIn's company prefix, are containers
  // rather than the name: the handle is the segment after them.
  if (p.key === "youtube" && /^(?:c|channel|user)$/i.test(handle)) handle = segs[1] || "";
  if (p.key === "linkedin" && /^(?:company|school|showcase|in)$/i.test(handle)) handle = segs[1] || "";
  handle = handle.replace(/^@/, "").split("?")[0].trim();
  if (!handle) return null;
  // Not a profile at all: a share button, a post, a feed, or the platform
  // talking about itself.
  if (p.bad.some(b => b.toLowerCase() === handle.toLowerCase())) return null;
  // A handle is a handle. Anything with a dot other than a trailing page
  // extension, or a space, is a path fragment somebody linked by accident.
  if (!/^[A-Za-z0-9._-]{2,60}$/.test(handle)) return null;
  if (NOT_THEIRS.test(handle)) return null;
  return { platform: p.key, handle, url: `https://${host}/${u.pathname.split("/").filter(Boolean).join("/")}` };
};

// Every social link in a page's markup, deduplicated by platform and handle, in
// the order they appear. Reads href values rather than text, because a footer
// icon has no text at all.
const HREF = /href\s*=\s*["']([^"']+)["']/gi;

export const accountsOnPage = (html) => {
  const s = String(html || "");
  const out = [];
  const seen = new Set();
  HREF.lastIndex = 0;
  let m;
  while ((m = HREF.exec(s))) {
    const a = accountIn(m[1]);
    if (!a) continue;
    const key = `${a.platform}:${a.handle.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
};

// ── AND WHETHER IT IS PLAUSIBLY THIS PLACE'S ────────────────────────
//
// Only ever asked of an account that did NOT come off the place's own page,
// which is the API Direct tier: a search can hand back any account in Denmark
// whose name is close, and a wrong handle is worse than no handle, because
// every later check would then read a different business's posts and flag
// nonsense about this one.
//
// Three readings, and the caller is told which one it got rather than a score,
// because a number invites a threshold and a threshold invites tuning:
//
//   own-page   it was linked from the place's own website. Nothing to judge.
//   linked     the account's own bio or link field points back at the website
//              we hold for this place. This is the only remote signal that
//              needs no opinion, and it is the one to trust.
//   named      the handle or the account name folds to the place's name. Worth
//              showing to a person and worth nothing on its own.
//
// Anything weaker is not returned at all.
export const OWN_PAGE = "own-page", LINKED = "linked", NAMED = "named";

const squash = (v) => fold(String(v || "")).replace(/[^a-z0-9]/g, "");

export const accountFits = (account, { name = "", website = "", bioLinks = [] } = {}) => {
  if (!account || !account.handle) return null;
  const site = asUrl(website);
  const siteHost = site ? stripW(site.hostname) : "";
  // The account says where it lives and it is where we already know this place
  // lives. No judgement involved.
  if (siteHost) {
    const points = (Array.isArray(bioLinks) ? bioLinks : [])
      .map(l => asUrl(l)).filter(Boolean)
      .some(u => stripW(u.hostname) === siteHost);
    if (points) return LINKED;
  }
  // The handle carries the name. "ribevikingecenter" against "Ribe
  // VikingeCenter" folds to the same run of letters; "ribe" alone does not,
  // because a town name is not a venue and half this country would match.
  const n = squash(name);
  const h = squash(account.handle);
  if (n.length >= 6 && h.length >= 6 && (h.includes(n) || n.includes(h))) return NAMED;
  return null;
};

// What gets written on the row. A list, because a place has a Facebook page and
// an Instagram and they announce different things, and one object per platform
// so a later check can ask for the one it wants.
//
// `found` is the day the sweep ran, for the same reason every ticket stamp
// carries one: an account that moved or closed is a fact that ages, and a
// record with no date on it quietly becomes a lie. `how` is which of the three
// readings above it came from, kept so a person reviewing a hundred rows can
// sort the ones that needed an opinion to the top.
export const socialRecord = (accounts, { how = OWN_PAGE, at = new Date() } = {}) => {
  const list = (Array.isArray(accounts) ? accounts : []).filter(a => a && a.platform && a.handle);
  if (!list.length) return null;
  const d = at instanceof Date && !Number.isNaN(at.getTime()) ? at : new Date();
  const p = (x) => String(x).padStart(2, "0");
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const byPlatform = new Map();
  // First one wins per platform: the page lists the account it considers its
  // main one first, and a second Facebook page on the same site is a campaign.
  list.forEach(a => { if (!byPlatform.has(a.platform)) byPlatform.set(a.platform, a); });
  return { at: day, how, accounts: [...byPlatform.values()] };
};

// ── WHAT A SEARCH HANDS BACK, IN ONE SHAPE ──────────────────────────
//
// Added 14 Sep 2026, after the request shape was READ rather than guessed. The
// first version of api/social-find.js asked `api.apidirect.io/v1/search?q=`,
// which was my reading of their docs and was wrong in four places at once: the
// host, the path, the parameter name and the paging. The handoff said it was
// unverified. It was.
//
// What is there is better than one generic search, and it is the
// reason this reader exists: API Direct has an endpoint per platform, so a
// Facebook PAGE search returns pages rather than posts that mention a name.
// Verified, from their own docs:
//
//   GET /v1/facebook/pages?query=   -> { results: [{ name, url, profile_url,
//                                        facebook_id, image_url, is_verified }] }
//   GET /v1/instagram/users?query=  -> { users:   [{ username, full_name, url,
//                                        user_id, is_verified, is_private }] }
//   GET /v1/facebook/page?url=      -> { page: { name, website, address, ... } }
//
// Two list shapes, `results` and `users`, and neither carries the account's own
// outbound link. So this normalises both into the one thing accountFits reads,
// and the bio link arrives separately from the page-details call, which is the
// only call in the chain that can turn a guess into a fact.
//
// A PRIVATE ACCOUNT IS DROPPED. Not because it is not theirs, but because the
// whole point of storing a handle is that a later check can read what it posts,
// and a private account announces its winter hours to nobody we can ask. A
// record holding one would promise a check that can never run.
export const searchCandidates = (body) => {
  const rows = Array.isArray(body?.results) ? body.results
    : Array.isArray(body?.users) ? body.users
    : Array.isArray(body?.data) ? body.data
    : [];
  const out = [];
  for (const row of rows) {
    if (row?.is_private === true) continue;
    const account = accountIn(row?.url || row?.profile_url || row?.link || "");
    if (!account) continue;
    out.push({
      account,
      // The name the platform holds, which is not the handle and is often the
      // readable one: "Ribe VikingeCenter" against a handle of "ribevc".
      name: String(row?.name || row?.full_name || row?.title || row?.username || "").trim(),
      // Carried, never a reason. Verified says the platform checked WHO runs
      // this account, not that it is the business on this row, and a tick that
      // decided anything would be a score wearing a badge. It is shown, and a
      // person decides with it.
      verified: row?.is_verified === true || row?.verified === true,
      bioLinks: [row?.website, row?.external_url, row?.bio_link, row?.link_in_bio].filter(Boolean),
    });
  }
  return out;
};

// The page-details call takes a page URL and gives back the website that page
// says it has. That is the one field in the whole search tier that needs no
// opinion: if it points at the site we already hold for this row, the account
// is theirs. Pulled out here so the shape is asserted without a network.
export const websiteInPageDetails = (body) => {
  const w = body?.page?.website ?? body?.website ?? "";
  const u = asUrl(w);
  return u ? u.toString() : "";
};
