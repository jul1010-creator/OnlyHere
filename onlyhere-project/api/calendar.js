// /api/calendar.js
// Serverless fetch of a village calendar feed, returned as raw text.
//
// ── WHY THIS IS NOT api/scan-source.js ──────────────────────────────
//
// scan-source exists to strip a page down to readable prose for a model to
// extract facts from, and that is exactly the wrong thing to do to an .ics: the
// structure IS the content, and text extraction would throw away every DTSTART
// on the way in. This route returns what the server received, unchanged, and
// the parse happens in src/utils/calendarFeed.js where the suite can reach it.
//
// ── AND IT IS FOUNDER ONLY, FOR THE REASON EVERY URL FETCHER IS ─────
//
// An endpoint on this domain that fetches a URL a caller names is a proxy for
// whoever can reach it. Same two gates scan-source has had since 17 Aug: the
// request has to come from the site, and it has to carry a real Supabase
// session belonging to a founder. See src/utils/apiGuard.js.
import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";

// Fifteen seconds and two megabytes. A village calendar is a few kilobytes; a
// feed that needs more than this is not the thing this route is for, and an
// unbounded read on a URL somebody else chose is how a serverless function is
// turned into a download service.
const TIMEOUT_MS = 15000;
const MAX_BYTES = 2 * 1024 * 1024;

// ── AND IT ONLY EVER LEAVES THE BUILDING ────────────────────────────
//
// A serverless function sits inside a private network and can reach addresses a
// browser cannot. A caller naming http://169.254.169.254 or a 10.x host would
// be asking this route to read something on the inside and hand it back, which
// is the whole shape of a server side request forgery. https only, a public
// hostname only, and no credentials in the URL.
const PRIVATE_HOST = /^(?:localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|\[?::1\]?)/i;

export default async function handler(req, res) {
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
      return res.status(403).json({ error: "This account cannot read a calendar feed." });
    }
  }

  const raw = String(req.query.url || "").trim();
  let url;
  try { url = new URL(raw); } catch { return res.status(400).json({ error: "Provide a valid ?url=" }); }
  if (url.protocol !== "https:") return res.status(400).json({ error: "The feed has to be https." });
  if (url.username || url.password) return res.status(400).json({ error: "A feed URL may not carry credentials." });
  if (PRIVATE_HOST.test(url.hostname) || !url.hostname.includes(".")) {
    return res.status(400).json({ error: "That address is not reachable from here." });
  }

  const stop = AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
  try {
    const r = await fetch(url.toString(), {
      signal: stop,
      redirect: "follow",
      headers: { "User-Agent": "Gemlyx/1.0 (+https://www.gemlyxtravel.com)", Accept: "text/calendar, text/html;q=0.8, */*;q=0.5" },
    });
    if (!r.ok) return res.status(200).json({ text: "", status: r.status, error: `The feed answered ${r.status}.` });
    const type = String(r.headers.get("content-type") || "");
    const text = (await r.text()).slice(0, MAX_BYTES);
    // ── AND WHETHER IT IS A CALENDAR AT ALL ───────────────────────
    // Said rather than assumed. A public Google calendar that has been made
    // private answers with an HTML sign-in page and a 200, so "it came back"
    // is not the same as "it is a feed", and the panel needs to be able to say
    // which happened rather than showing nought events and no reason.
    const looksIcs = /BEGIN:VCALENDAR/i.test(text);
    return res.status(200).json({
      text,
      contentType: type,
      ics: looksIcs,
      ...(looksIcs ? {} : { error: "That URL answered, but what came back is not a calendar feed. A Google calendar that is not public answers with a sign-in page." }),
    });
  } catch (err) {
    return res.status(200).json({ text: "", error: `Could not read the feed: ${String(err?.message || err).slice(0, 200)}` });
  }
}
