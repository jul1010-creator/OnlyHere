// ── THE TWO TIER PAGE READ, IN ONE PLACE ────────────────────────────
//
// api/scan-source.js had this inline. api/update-events-check.js now needs the
// identical thing, and a second copy of it would be the seventh duplicated
// function found in this codebase in a week. So it lives here, once.
//
// It sits in src/utils/ rather than api/ ON PURPOSE. Vercel turns every file in
// api/ into a serverless function, api/ is already at thirteen files against a
// documented ceiling of twelve, and a build that trips that ceiling fails while
// the previous deployment keeps serving, so the site looks completely fine. A
// helper in src/ is bundled into whichever function imports it and counts for
// nothing. api/commons-photo.js already imports ../src/utils/danishNames.js
// this way, which is the proof the pattern deploys.
//
// The JUDGEMENT is not here either: that is pageScan.js, which is pure and
// tested with no network at all. This file is the network and nothing else,
// which is the split api/tickets.js documents.
import {
  stripToText, ticketLinks, pageReadVerdict, worthDeepRead, firecrawlBody, firecrawlText, FIRECRAWL_URL,
  bannerImages, bannerImagesFromMarkdown, MAX_BANNERS,
} from "./pageScan.js";

const UA = "Mozilla/5.0 (compatible; GemlyxContentScan/1.0)";

export const readPlain = async (url, f = fetch) => {
  try {
    const r = await f(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return { status: r.status, text: "", tickets: [], err: "" };
    // ── THE HTML IS READ ONCE AND ASKED TWO QUESTIONS ─────────────
    // stripToText deletes every tag, so the hrefs have to come out here, before
    // it runs, or they are gone. That deletion is why no draft has ever followed
    // an operator's "Køb billetter" button to the agent that actually sells
    // them. See ticketLinks in pageScan.js.
    const html = await r.text();
    // banners: the same HTML asked a third question, and for the same reason as
    // the second. stripToText deletes every src and every alt, so a poster is
    // unreachable one line later. See bannerImages in pageScan.js, and the
    // Distortion measurement written up there: a front page whose text says a
    // date that has already passed while the real one exists only as pixels.
    return { status: r.status, text: stripToText(html), tickets: ticketLinks(html, url).slice(0, 6), banners: bannerImages(html, url).slice(0, MAX_BANNERS), err: "" };
  } catch (err) {
    return { status: 0, text: "", tickets: [], banners: [], err: String(err) };
  }
};

export const readFirecrawl = async (url, key, f = fetch) => {
  try {
    const r = await f(FIRECRAWL_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(firecrawlBody(url)),
    });
    // A refusal carries a body worth reading, so this does not throw on !ok.
    const json = await r.json().catch(() => null);
    if (!r.ok) return { text: "", ok: false, reason: `firecrawl-http-${r.status}`, detail: String(json?.error || "").slice(0, 200) };
    return firecrawlText(json);
  } catch (err) {
    return { text: "", ok: false, reason: "firecrawl-unreachable", detail: String(err).slice(0, 200) };
  }
};

// ── THE WHOLE READ, INCLUDING WHAT IT COST ──────────────────────────
// `credits` is returned rather than inferred, because the caller of this in the
// event updater is an endpoint that until today spent nothing at all, and an
// endpoint that starts spending needs to be able to say how much in the same
// breath as what it found. One Firecrawl page is one credit, and a request that
// failed is not charged, so only a successful escalation counts.
//
// The escalation is narrow and stays narrow: a 404, a 410 and a 401 are never
// retried, because a dead link is not a wall and Firecrawl does not have the
// login either. Paying to re-read nothing is the quiet waste this project keeps
// finding in other forms.
// ── AND THE ADDRESS GOOGLE HANDS US IS OFTEN THE OLD ONE ────────────
//
// Oliver, 15 Aug 2026, on a Farfar's Bodega draft: the operator's own site came
// back empty, so the hours reconciliation had nothing, both price traces were
// SKIPPED "because the official site's text was not available", and the entry
// published with no price. He then asked Gemini, which read farfarbodega.dk and
// found a 1,500 DKK karaoke package, the DJ nights, and a 19+ door policy. His
// verdict: "This wouldn't have been a big issue if the AI had paid more
// attention to the home website."
//
// The URL the pipeline was given was `http://www.farfarbodega.dk/`, because
// that is the string in Google's business profile, and Google's copy of a
// website is frequently the one the owner typed in 2016. A plain http fetch of
// a host that now serves https, or a www host that no longer resolves, comes
// back empty and is indistinguishable from a site with nothing on it.
//
// Four spellings of one address, tried in order, before anything is called
// blocked. No key needed, no credit spent, and it is the difference between an
// entry with a price and an entry without one.
const addressVariants = (url) => {
  const out = [url];
  try {
    const u = new URL(url);
    const bare = u.host.replace(/^www\./i, "");
    for (const proto of ["https:", "http:"]) {
      for (const host of [bare, `www.${bare}`]) {
        const v = `${proto}//${host}${u.pathname}${u.search}`;
        if (!out.includes(v)) out.push(v);
      }
    }
  } catch { /* not a parseable URL, so there is nothing to vary */ }
  return out.slice(0, 4);
};

export const readPage = async (url, { key = "", fetchImpl = fetch } = {}) => {
  let plain = await readPlain(url, fetchImpl);
  let first = pageReadVerdict(plain.status, plain.text, plain.err);
  // Only when the first attempt found NOTHING. A bot wall is not an address
  // problem and retrying three spellings of it wastes three requests to be told
  // the same thing, so the retry is for empty and unreachable only.
  if (!first.usable && /^(?:empty|thin|fetch-failed|http-40[34]|http-5\d\d)$/.test(String(first.reason))) {
    for (const alt of addressVariants(url).slice(1)) {
      const again = await readPlain(alt, fetchImpl);
      const verdict = pageReadVerdict(again.status, again.text, again.err);
      if (verdict.usable) {
        return { text: again.text, via: "fetch", read: verdict.reason, blocked: false, credits: 0, sample: "", tickets: again.tickets, banners: again.banners || [], reachedAt: alt, firstTry: first.reason };
      }
    }
  }
  if (first.usable) {
    return { text: plain.text, via: "fetch", read: first.reason, blocked: false, credits: 0, sample: "", tickets: plain.tickets, banners: plain.banners || [] };
  }
  if (!key || !worthDeepRead(first)) {
    return {
      text: "", via: "fetch", read: first.reason, blocked: true, credits: 0,
      sample: plain.text.slice(0, 200), status: plain.status, detail: first.detail || "",
      escalated: false,
      // ── A BLOCKED PAGE CAN STILL HAND OVER ITS POSTER ─────────
      // The banners survive a verdict of unusable ON PURPOSE, and this is the
      // case the whole feature exists for. "almost-no-text" is precisely what a
      // festival front page looks like when the announcement is artwork: the
      // read failed and the answer was on the page the whole time. Throwing the
      // image addresses away here because the TEXT was thin would rebuild the
      // exact wall this is meant to get past.
      banners: plain.banners || [],
    };
  }
  const deep = await readFirecrawl(url, key, fetchImpl);
  const second = pageReadVerdict(200, deep.text);
  if (deep.ok && second.usable) {
    // Firecrawl returns markdown rather than HTML, so no hrefs come back on this
    // path. Empty rather than absent, so a caller never has to check which read
    // it got, and stated here rather than discovered later.
    return { text: deep.text, via: "firecrawl", read: second.reason, blocked: false, credits: 1, firstTry: first.reason, escalated: true, tickets: [], banners: bannerImagesFromMarkdown(deep.text, url).slice(0, MAX_BANNERS) };
  }
  // Paid for and still nothing. Both halves are reported, because "the wall
  // won" and "the scraper is misconfigured" need different actions from a human.
  return {
    text: "", via: "firecrawl", read: deep.ok ? second.reason : deep.reason, blocked: true,
    credits: deep.ok ? 1 : 0, firstTry: first.reason, detail: deep.detail || "",
    sample: plain.text.slice(0, 200), status: plain.status, escalated: true,
    // The plain read's pictures, not Firecrawl's: this branch is the one where
    // Firecrawl returned nothing, so there is no markdown to look in. The first
    // fetch usually did return HTML, and that HTML is where the poster is.
    banners: plain.banners || [],
  };
};
