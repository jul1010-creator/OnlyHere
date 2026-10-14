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
import { takeDaily, visitorKey, visitorKey48, limitOf, SUPABASE_FALLBACK_URL } from "../src/utils/aiGate.js";
import { copenhagenDay } from "../src/utils/guideAllowance.js";
import { COUNTRY_PROFILES } from "../src/utils/countries.js";
import { placeClock } from "../src/utils/offerClock.js";
import { eventKeys, readKeysFor, statsFrom, partnerPath, PARTNER_STATS_DAYS, cleanStatId } from "../src/utils/partnerStats.js";
import { partnerSecret, makePartnerToken, readPartnerToken } from "../src/utils/partnerLink.js";

// One network: a ship's wifi can carry many walkers, so this is generous.
export const PER_NETWORK = 400;
export const PER_SITE = 50000;
// One network adds at most this much to one place in a day (security review,
// 13 Oct 2026): a visitor re-plans a handful of times, and a family shares a
// hotspot, but a script on one connection cannot move a place's numbers far.
export const PER_PLACE_WALKS = 12;
export const PER_PLACE_REACH = 3;
const COUNTED = 1e9;

// ── ONLY PLACES THAT HAVE A PARTNER LINK ARE COUNTED ────────────────
// Security review, 13 Oct 2026: any well-formed id was counted, so a script
// could write rows for invented places until the database filled. The list is
// written when Studio makes a link; revoked=true in Supabase ends that link.
// A list that cannot be read counts nothing and reads nothing (fail closed).
const PARTNERS_TTL_MS = 5 * 60 * 1000;
let partnersCache = { at: 0, ids: null };
export const resetPartnersCache = () => { partnersCache = { at: 0, ids: null }; };
export const partnerIds = async ({ supabaseUrl, serviceKey, fetchImpl = fetch, now = Date.now() }) => {
  if (partnersCache.ids && now - partnersCache.at < PARTNERS_TTL_MS) return partnersCache.ids;
  try {
    const r = await fetchImpl(`${supabaseUrl}/rest/v1/gemlyx_partners?select=id&revoked=eq.false`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    const rows = await r.json().catch(() => null);
    if (!Array.isArray(rows)) return null;
    partnersCache = { at: now, ids: new Set(rows.map(x => String(x?.id || "")).filter(Boolean)) };
    return partnersCache.ids;
  } catch { return null; }
};
// The place inside a stat key: st:w:food:7 and st:rh:food:7:13 both give food:7.
export const idOfStatKey = (k) => String(k).split(":").slice(2, 4).join(":");

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
    const partners = await partnerIds({ supabaseUrl, serviceKey });
    if (!partners) return res.status(503).json({ error: "Not available just now." });
    if (!partners.has(who.id)) return res.status(404).json({ error: "This link is not valid." });
    const today = copenhagenDay(new Date());
    try {
      // Through a function that returns this place's own keys and nothing
      // else (security review, 13 Oct 2026): the table also holds every
      // member's counts, and a public read should never be able to reach them.
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/gemlyx_partner_stats`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_id: who.id, p_from: daysBack(today, PARTNER_STATS_DAYS - 1) }),
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) { console.error("partner-stats read:", r.status); return res.status(503).json({ error: "Not available just now." }); }
      // And only this place's keys are passed on, whatever came back.
      const mine = new Set(readKeysFor(who.id));
      const rows = await r.json().catch(() => null);
      if (!Array.isArray(rows)) return res.status(503).json({ error: "Not available just now." });
      return res.status(200).json({ id: who.id, name: who.name, days: PARTNER_STATS_DAYS, ...statsFrom(rows.filter(x => mine.has(String(x?.key || ""))), who.id) });
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
    try {
      const up = await fetch(`${supabaseUrl}/rest/v1/gemlyx_partners?on_conflict=id`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: cleanStatId(body.make.id), name: String(body.make.name || "").replace(/\s+/g, " ").trim().slice(0, 80), revoked: false }),
        signal: AbortSignal.timeout(3000),
      });
      if (!up.ok) {
        console.error("partner-stats make:", up.status);
        return res.status(503).json({ error: up.status === 404 ? "The gemlyx_partners table is not in the database yet. Run the partner SQL, then make the link again." : "The link could not be made just now." });
      }
    } catch (e) {
      console.error("partner-stats make:", e);
      return res.status(503).json({ error: "The link could not be made just now." });
    }
    resetPartnersCache();
    return res.status(200).json({ path: partnerPath(token) });
  }

  // ── A VISITOR'S WALK IS COUNTED ─────────────────────────────────
  const c = String(body.c || "");
  const profile = Object.hasOwn(COUNTRY_PROFILES, c) ? COUNTRY_PROFILES[c] : null;
  if (!profile) return res.status(400).json({ error: "Unknown country." });
  const hour = Math.floor(placeClock(new Date(), profile.zone).minutes / 60);
  const all = eventKeys(body, hour);
  if (!all.length) return res.status(400).json({ error: "Nothing to count." });
  const perNetwork = limitOf(env.GEMLYX_PARTNER_PER_NETWORK, PER_NETWORK);
  const perSite = limitOf(env.GEMLYX_PARTNER_PER_SITE, PER_SITE);
  if (perNetwork === 0 || perSite === 0) return res.status(200).json({ ok: false });
  const partners = await partnerIds({ supabaseUrl, serviceKey });
  const keys = partners ? all.filter(k => partners.has(idOfStatKey(k))) : [];
  // Not a partner's place, or the list could not be read: nothing is counted
  // and the walk is unaffected. The same answer either way, so the list
  // cannot be probed.
  if (!keys.length) return res.status(200).json({ ok: false });
  const salt = serviceKey.slice(-16);
  const net = visitorKey(req.headers, salt).replace(/^ai:v:/, "pst:v:");
  const net48 = visitorKey48(req.headers, salt).replace(/^ai:v48:/, "pst:v48:");
  const perPlace = [...new Set(keys.map(idOfStatKey))].map(id => (body.e === "reach"
    ? { key: `${net}:r:${id}`, limit: PER_PLACE_REACH }
    : { key: `${net}:w:${id}`, limit: PER_PLACE_WALKS }));
  const took = await takeDaily({
    day: copenhagenDay(new Date()),
    keys: [
      { key: net, limit: perNetwork },
      { key: net48, limit: perNetwork * 10 },
      { key: "pst:site", limit: perSite },
      ...perPlace,
      ...keys.map(key => ({ key, limit: COUNTED })),
    ],
    supabaseUrl, serviceKey,
  });
  // Over a limit or a slow counter: the walk is unaffected, it is simply
  // not counted. Never an error a visitor could see.
  return res.status(200).json({ ok: !!took.ok });
}
