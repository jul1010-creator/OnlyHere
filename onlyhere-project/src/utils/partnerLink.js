// ── A PRIVATE LINK INSTEAD OF AN ACCOUNT ────────────────────────────
//
// Oliver, 12 Oct 2026: a partner sees its own numbers from a link only it
// has, with no sign-up and no password. The link carries the place's id and
// name, signed, so it cannot be changed to read another place, and nothing
// has to be stored to look it up.
//
// THE SECRET. PARTNER_LINK_SECRET in Vercel if it is set; otherwise one made
// from the Supabase service key, which never leaves the server. So nothing
// new has to be set up, and rotating the service key also retires every link
// (Studio makes new ones in a click). Server only: this file uses node:crypto
// and is imported by api/partner-stats.js and nothing in src/.
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { cleanStatId } from "./partnerStats.js";

export const partnerSecret = (env = {}) => {
  const own = String(env.PARTNER_LINK_SECRET || "");
  // Set but too short is a mistake to fix, not a reason to sign with another
  // secret (security review, 13 Oct 2026): every link reads as not valid
  // until it is fixed.
  if (own) return own.length >= 16 ? own : "";
  const service = String(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "");
  return service ? createHmac("sha256", service).update("gemlyx:partner-link:v1").digest("hex") : "";
};

const sign = (payload, secret) => createHmac("sha256", secret).update(payload).digest("base64url").slice(0, 32);

export const NAME_MAX = 80;

export const makePartnerToken = ({ id, name }, secret) => {
  const clean = cleanStatId(id);
  if (!clean || !secret) return "";
  const payload = Buffer.from(JSON.stringify({ i: clean, n: String(name || "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX) })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
};

export const readPartnerToken = (token, secret) => {
  const raw = String(token || "");
  if (!secret || raw.length > 600) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot), sig = raw.slice(dot + 1);
  const want = sign(payload, secret);
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const got = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const id = cleanStatId(got?.i);
    return id ? { id, name: String(got?.n || "").slice(0, NAME_MAX) } : null;
  } catch { return null; }
};
