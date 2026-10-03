// /api/busyness.js
// ── HOW BUSY A PLACE USUALLY IS, FOR STUDIO ─────────────────────────
//
// Oliver, 1 Oct 2026: "it could be cool if it's possible to track how busy
// the place is". Google's official API does not give popular times, so this
// asks BestTime (besttime.app) for a weekly forecast: how busy the place
// usually is, hour by hour, on each day of the week.
//
// FOUNDER ONLY, and only from Studio, about once a month per place. A forecast
// barely changes week to week, so it is stored on the entry (payload.__busy)
// and every reader is shown the stored copy: one paid request per place per
// month rather than one per visitor. The key stays on the server as
// BESTTIME_API_KEY_PRIVATE, set in Vercel; without it this says so.
import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";
import { busyFromBestTime } from "../src/utils/dealExtras.js";

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
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.BESTTIME_API_KEY_PRIVATE;
  if (!key) return res.status(503).json({ error: "BESTTIME_API_KEY_PRIVATE is not set in Vercel. Create a BestTime account, copy the private key, add it, and redeploy." });

  const name = String(req.body?.name || "").trim().slice(0, 160);
  const address = String(req.body?.address || "").trim().slice(0, 240);
  if (!name || !address) return res.status(400).json({ error: "A name and an address are both needed. BestTime finds the place by the two together." });

  try {
    const q = new URLSearchParams({ api_key_private: key, venue_name: name, venue_address: address });
    const r = await fetch(`https://besttime.app/api/v1/forecasts?${q.toString()}`, { method: "POST" });
    const json = await r.json().catch(() => null);
    if (!r.ok || !json || json.status !== "OK") {
      // BestTime's own reason, which is the useful part ("not enough data"),
      // and nothing else from its body.
      const why = String(json?.message || "").slice(0, 200);
      return res.status(200).json({ ok: false, error: why || "BestTime has no forecast for this place." });
    }
    const busy = busyFromBestTime(json);
    if (!busy) return res.status(200).json({ ok: false, error: "BestTime answered, but with no hours busy enough to show." });
    return res.status(200).json({ ok: true, busy });
  } catch {
    return res.status(502).json({ error: "Could not reach BestTime just now." });
  }
}
