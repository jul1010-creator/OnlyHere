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
    return { status: r.status, text: stripToText(html), tickets: ticketLinks(html, url).slice(0, 6), err: "" };
  } catch (err) {
    return { status: 0, text: "", tickets: [], err: String(err) };
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
export const readPage = async (url, { key = "", fetchImpl = fetch } = {}) => {
  const plain = await readPlain(url, fetchImpl);
  const first = pageReadVerdict(plain.status, plain.text, plain.err);
  if (first.usable) {
    return { text: plain.text, via: "fetch", read: first.reason, blocked: false, credits: 0, sample: "", tickets: plain.tickets };
  }
  if (!key || !worthDeepRead(first)) {
    return {
      text: "", via: "fetch", read: first.reason, blocked: true, credits: 0,
      sample: plain.text.slice(0, 200), status: plain.status, detail: first.detail || "",
      escalated: false,
    };
  }
  const deep = await readFirecrawl(url, key, fetchImpl);
  const second = pageReadVerdict(200, deep.text);
  if (deep.ok && second.usable) {
    // Firecrawl returns markdown rather than HTML, so no hrefs come back on this
    // path. Empty rather than absent, so a caller never has to check which read
    // it got, and stated here rather than discovered later.
    return { text: deep.text, via: "firecrawl", read: second.reason, blocked: false, credits: 1, firstTry: first.reason, escalated: true, tickets: [] };
  }
  // Paid for and still nothing. Both halves are reported, because "the wall
  // won" and "the scraper is misconfigured" need different actions from a human.
  return {
    text: "", via: "firecrawl", read: deep.ok ? second.reason : deep.reason, blocked: true,
    credits: deep.ok ? 1 : 0, firstTry: first.reason, detail: deep.detail || "",
    sample: plain.text.slice(0, 200), status: plain.status, escalated: true,
  };
};
