// ── DOES THIS LINK STILL GO WHERE IT WENT ────────────────────────────
//
// Oliver, 9 Sep 2026, of the GetYourGuide activities: "make sure that there is
// an update feature that checks if this activity even still exists anymore..
// because over time, these activities might get removed."
//
// A dead link on a public page is the failure this codebase minds most, and it
// is written down as such in data/wegotrip.js. Nothing until tonight could
// notice one.
//
// ── WHY THIS IS A FUNCTION AND NOT A FETCH IN THE BROWSER ───────────
//
// A page cannot read the status of a cross-origin request, and it cannot see
// where a redirect landed. Both are exactly what the question needs. So the
// fetch happens here, where the answer is readable, and the JUDGEMENT happens
// in utils/tourSweep.tourAliveVerdict, which is pure and tested with no network
// at all. Same split api/tickets.js documents and readPage.js repeats.
//
// ── AND THE JUDGEMENT IS NOT HERE ───────────────────────────────────
//
// This returns what happened: the status, where it landed, or the error. It
// does not decide whether that means the activity is gone, because "200 and a
// redirect to the city page" is how a marketplace retires a listing and telling
// that from a live page is a rule with a reason attached, which belongs beside
// its tests rather than inside a network call.
//
// Vercel is on the PRO plan, so the old twelve-function ceiling that several
// stale comments in this repo still quote does not apply.
import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";

export default async function handler(req, res) {
  // ── BOTH HALVES, BECAUSE ONLY THE STUDIO CALLS THIS ───────────────
  //
  // src/utils/apiGuard.js opens with an audit finding: of fourteen serverless
  // functions, exactly one checked anything. Adding a fifteenth that answers
  // anybody would be adding the problem back, and this one makes the server
  // fetch a URL, which is the shape somebody would want to abuse.
  //
  // So it gets what api/tickets.js gets: the request has to come from the site,
  // and it has to carry a real session belonging to the founder.
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
      return res.status(403).json({ error: "This account cannot run Studio checks." });
    }
  }
  const { url } = req.query;
  const raw = String(url || "").trim();
  if (!/^https?:\/\//i.test(raw)) {
    return res.status(400).json({ error: "A url is required." });
  }
  // ── AN ALLOW-LIST, NOT AN OPEN PROXY ──────────────────────────────
  //
  // Without this, anything that can call this endpoint can make the server
  // fetch any address on the internet, including one inside the hosting
  // network, and read back the status. That is a server-side request forgery
  // and it is the standard way a "just check if this link works" endpoint goes
  // wrong. The only links this feature checks are activity pages on hosts we
  // hold a programme with, so that is the whole of what it will fetch.
  let host = "";
  try { host = new URL(raw).hostname.toLowerCase().replace(/^www\./, ""); } catch { host = ""; }
  const ALLOWED = ["getyourguide.com", "getyourguide.dk", "tiqets.com", "wegotrip.com"];
  if (!host || !ALLOWED.some(d => host === d || host.endsWith(`.${d}`))) {
    return res.status(400).json({ error: "That host is not one this check covers." });
  }

  try {
    // GET rather than HEAD: marketplaces routinely answer HEAD with a 405 or a
    // status that does not match the page, and a wrong answer here deletes a
    // working link. `redirect: follow` is the default and is the point, since
    // where it LANDS is the question.
    const r = await fetch(raw, {
      method: "GET",
      redirect: "follow",
      headers: {
        // A plain fetch is refused by most marketplaces. This says what it is
        // rather than pretending to be a person, which is the honest version
        // and the one that survives a look at their logs.
        "User-Agent": "GemlyxLinkCheck/1.0 (+https://www.gemlyxtravel.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    // ── AND THE ALLOW-LIST COVERS THE LANDING, NOT ONLY THE TAKEOFF ──
    //
    // Found by an adversarial review, 9 Sep 2026. The host check above runs on
    // the address given; `redirect: follow` then goes wherever it is sent, so
    // an allowed host redirecting off-list would have been fetched anyway. The
    // comment above claimed otherwise.
    //
    // The response is already in hand by the time this can be checked, which is
    // the nature of following redirects, so what this buys is that the caller is
    // never TOLD about a page on a host this endpoint does not cover.
    let landed = "";
    try { landed = new URL(r.url || raw).hostname.toLowerCase().replace(/^www\./, ""); } catch { landed = ""; }
    if (landed && !ALLOWED.some(d => landed === d || landed.endsWith(`.${d}`))) {
      return res.status(200).json({ url: raw, status: r.status, finalUrl: "", offSite: landed });
    }
    return res.status(200).json({ url: raw, status: r.status, finalUrl: r.url || "" });
  } catch (e) {
    // Reported rather than swallowed. "We could not ask" and "it is gone" are
    // different facts and the verdict function tells them apart.
    return res.status(200).json({ url: raw, status: 0, finalUrl: "", error: String(e?.message || e).slice(0, 200) });
  }
}
