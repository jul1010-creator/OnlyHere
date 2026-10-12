// /api/partner-stats.js
//
// Real numbers for a partner's place, with no account (Oliver, 12 Oct 2026).
// See src/utils/partnerStats.js for what is counted and src/utils/partnerLink.js
// for the private link.
//
//   POST { e: "walk", c, ids, deals }  a walk was shown         (the QR walk)
//   POST { e: "reach", c, id }         a place on it was reached (walking it)
//   POST { make: { id, name } }        Studio makes a partner link (founder only)
//   GET  ?k=<link>                     the partner page reads its numbers
//
// The counts go into the daily counter table through the same function as the
// guide limits, which also caps how many one network can send in a day, so a
// script cannot inflate a place's numbers without limit.
import { requestIsFromSite, NOT_FROM_SITE, resolveUser, isFounder } from "../src/utils/apiGuard.js";
import { takeDaily, visitorKey, SUPABASE_FALLBACK_URL } from "../src/utils/aiGate.js";
import { copenhagenDay } from "../src/utils/guideAllowance.js";
import { COUNTRY_PROFILES } from "../src/utils/countries.js";
import { placeClock } from "../src/utils/offerClock.js";
import { eventKeys, readKeysFor, statsFrom, partnerPath, PARTNER_STATS_DAYS } from "../src/utils/partnerStats.js";
import { partnerSecret, makePartnerToken, readPartnerToken } from "../src/utils/partnerLink.js";

// One network: a ship's wifi can carry many walkers, so this is generous.
export const PER_NETWORK = 400;
export const PER_SITE = 50000;
const COUNTED = 1e9;

export const daysBack = (day, n) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  const env = process.env;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "";
  const supabaseUrl = env.SUPABASE_URL || SUPABASE_FALLBACK_URL;
  if (!serviceKey) return res.status(503).json({ error: "Not available just now." });

  // ── THE PARTNER PAGE READS ──────────────────────────────────────
  if (req.method === "GET") {
    const who = readPartnerToken(req.query?.k, partnerSecret(env));
    if (!who) return res.status(404).json({ error: "This link is not valid." });
    const today = copenhagenDay(new Date());
    const keys = readKeysFor(who.id).map(k => `"${k}"`).join(",");
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/gemlyx_guide_allowance?select=day,key,n&day=gte.${daysBack(today, PARTNER_STATS_DAYS - 1)}&key=in.(${encodeURIComponent(keys)})`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) { console.error("partner-stats read:", r.status); return res.status(503).json({ error: "Not available just now." }); }
      return res.status(200).json({ id: who.id, name: who.name, days: PARTNER_STATS_DAYS, ...statsFrom(await r.json(), who.id) });
    } catch (e) {
      console.error("partner-stats read:", e);
      return res.status(503).json({ error: "Not available just now." });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST." });
  const body = req.body || {};

  // ── STUDIO MAKES A LINK ─────────────────────────────────────────
  if (body.make) {
    const who = await resolveUser(req.headers, { supabaseUrl, serviceKey });
    if (!who.ok) return res.status(who.status).json({ error: who.error });
    if (!isFounder(who.userId, env.GEMLYX_FOUNDER_IDS)) return res.status(403).json({ error: "Only Studio can make partner links." });
    const token = makePartnerToken({ id: body.make.id, name: body.make.name }, partnerSecret(env));
    if (!token) return res.status(400).json({ error: "That place cannot have a link." });
    return res.status(200).json({ path: partnerPath(token) });
  }

  // ── A VISITOR'S WALK IS COUNTED ─────────────────────────────────
  const profile = COUNTRY_PROFILES[String(body.c || "")];
  if (!profile) return res.status(400).json({ error: "Unknown country." });
  const hour = Math.floor(placeClock(new Date(), profile.zone).minutes / 60);
  const keys = eventKeys(body, hour);
  if (!keys.length) return res.status(400).json({ error: "Nothing to count." });
  const took = await takeDaily({
    day: copenhagenDay(new Date()),
    keys: [
      { key: visitorKey(req.headers, serviceKey.slice(-16)).replace(/^ai:v:/, "pst:v:"), limit: PER_NETWORK },
      { key: "pst:site", limit: PER_SITE },
      ...keys.map(key => ({ key, limit: COUNTED })),
    ],
    supabaseUrl, serviceKey,
  });
  // Over the limit or a slow counter: the walk is unaffected, it is simply
  // not counted. Never an error a visitor could see.
  return res.status(200).json({ ok: !!took.ok });
}
