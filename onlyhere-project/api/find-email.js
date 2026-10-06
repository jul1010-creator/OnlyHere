// /api/find-email.js
// ── THE ADDRESS A PLACE PUBLISHES, FOR THE PHOTO REQUEST MAIL ───────
//
// Oliver, 28 Sep 2026: "I guess the AI will already have the mail of the
// company ready, yes?" It reads the place's own front page and the contact
// and press pages it links to, and returns the addresses written there with
// the page each came from. Plain fetches only, never Firecrawl, so it costs
// nothing. See src/utils/contactEmail.js.
//
// Studio only, like scan-source: an endpoint that fetches any address it is
// given must not be a free proxy for the rest of the internet.

import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";
import { findContactEmails } from "../src/utils/contactEmail.js";
// Public internet only (security review, 6 Oct 2026, finding 1).
import { safeFetch } from "../src/utils/safeFetch.js";

const UA = "Mozilla/5.0 (compatible; GemlyxContentScan/1.0)";
const TIMEOUT_MS = 8000;

const fetchHtml = async (url) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await safeFetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    if (!r.ok) return "";
    return (await r.text()).slice(0, 2000000);
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
};

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
      return res.status(403).json({ error: "This account cannot run Studio research." });
    }
  }
  const url = String(req.query.url || "");
  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Provide a valid ?url=" });
  }
  const out = await findContactEmails(url, fetchHtml);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(out);
}
