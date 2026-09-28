// /api/build-pass.js
// ── ASKED ONCE, BEFORE A GUIDE IS BUILT ─────────────────────────────
//
// Oliver, 28 Sep 2026: "Yes, have a cap." Guides stay free, so every build is
// his money, and this is where a build is counted before any model is called.
// The rules and the reasons for each number are in src/utils/guideAllowance.js.
//
// FAILS OPEN, on purpose. Until he runs the SQL in SETUP_GUIDE_CAP.md the
// table and function do not exist, and a cap that refused every build on a
// missing table would take the product down on deploy. Missing table, missing
// key, Supabase unreachable: the build goes ahead and the reply says why it was
// not counted, so the state is visible rather than silent.
//
// The HMAC secret is derived from the service role key and never from the anon
// key, because the anon key ships inside the page and a pass signed with a
// public secret can be forged by anybody who reads the bundle.

import { createHash, createHmac, randomBytes } from "node:crypto";
import { requestIsFromSite, NOT_FROM_SITE } from "../src/utils/apiGuard.js";
import {
  readLimits, uncappedList, isUncapped, cleanVisitor, allowanceKeys, reasonOfKey,
  refusalText, makePass, readPass, copenhagenDay, clientIp, ipKeyOf,
} from "../src/utils/guideAllowance.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://vpxfahjnerkkkoueovhl.supabase.co";

export const secretFrom = (serviceKey) =>
  serviceKey ? createHash("sha256").update(`gemlyx-guide-pass:${serviceKey}`).digest("hex") : "";

export const signerFor = (secret) => (body) =>
  createHmac("sha256", secret).update(String(body)).digest("base64url").slice(0, 32);

export const hashIp = (secret, ip) => {
  const key = ipKeyOf(ip);
  return key && secret ? createHash("sha256").update(`${secret}:ip:${key}`).digest("hex").slice(0, 24) : "";
};

// Who the bearer token belongs to, if there is one. A bad or expired token is
// not an error here: the build is counted as a visitor without an account.
const whoIs = async (headers, serviceKey, fetchImpl) => {
  const h = headers || {};
  const auth = String((typeof h.get === "function" ? h.get("authorization") : h.authorization) || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !serviceKey) return { userId: "", email: "" };
  try {
    const r = await fetchImpl(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
    if (!r.ok) return { userId: "", email: "" };
    const u = await r.json();
    return { userId: u?.id ? String(u.id) : "", email: String(u?.email || "") };
  } catch {
    return { userId: "", email: "" };
  }
};

// One round trip. The function checks every counter and only then bumps them
// all, under a lock, so two builds started in the same instant cannot both
// take the last guide of the day. Answers "ok" or the key that was full.
const take = async ({ day, keys, serviceKey, fetchImpl }) => {
  try {
    const r = await fetchImpl(`${SUPABASE_URL}/rest/v1/rpc/gemlyx_take_guide`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_day: day, p_keys: keys.map(k => k.key), p_limits: keys.map(k => k.limit) }),
    });
    if (!r.ok) return { open: r.status === 404 ? "not-set-up" : `supabase-${r.status}` };
    const answer = await r.json();
    return { answer: String(answer ?? "") };
  } catch {
    return { open: "unreachable" };
  }
};

// Pure enough to test: every outside thing comes in through `deps`.
export const decide = async ({ headers, body, env, fetchImpl, now = new Date(), nonce }) => {
  if (!requestIsFromSite(headers)) return { status: 403, json: { error: NOT_FROM_SITE } };
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "";
  const day = copenhagenDay(now);
  const limits = readLimits(env);
  const visitor = cleanVisitor(body?.visitor);

  if (!serviceKey) return { status: 200, json: { ok: true, day, open: "no-service-key" } };
  const secret = secretFrom(serviceKey);
  const sign = signerFor(secret);

  const who = await whoIs(headers, serviceKey, fetchImpl);
  if (isUncapped(uncappedList(env), who)) return { status: 200, json: { ok: true, day, uncapped: true } };

  // A retry of a build that failed: the pass it was given, shown again.
  const ipHash = hashIp(secret, clientIp(headers));
  const retry = body?.retry ? readPass(sign, body.retry, { day, visitor }) : null;
  if (retry) {
    // A retry spends the same money as a guide, so it still takes a slot from
    // the network and from the day, and the off switch stops it too.
    const keys = [{ key: `r:${retry.nonce}`, limit: limits.retries }];
    if (ipHash) keys.push({ key: `ip:${ipHash}`, limit: limits.perIp });
    keys.push({ key: "site", limit: limits.perDay });
    const got = await take({ day, keys, serviceKey, fetchImpl });
    if (got.open) return { status: 200, json: { ok: true, day, pass: body.retry, open: got.open } };
    if (got.answer === "ok") return { status: 200, json: { ok: true, day, pass: body.retry, retry: true } };
    const reason = reasonOfKey(got.answer) || "retries";
    return { status: 429, json: { ok: false, day, reason, message: refusalText(reason) } };
  }

  const keys = allowanceKeys({ visitor, ipHash, userId: who.userId }, limits);
  const got = await take({ day, keys, serviceKey, fetchImpl });
  const n = nonce || randomBytes(12).toString("hex");
  const pass = makePass(sign, { day, visitor, nonce: n });
  if (got.open) return { status: 200, json: { ok: true, day, pass, open: got.open } };
  if (got.answer === "ok") return { status: 200, json: { ok: true, day, pass } };
  const reason = reasonOfKey(got.answer);
  // An answer this file does not recognise is Supabase saying something new,
  // not a refusal: counted as not set up rather than turning travellers away.
  if (!reason) return { status: 200, json: { ok: true, day, pass, open: "unexpected-answer" } };
  return { status: 429, json: { ok: false, day, reason, message: refusalText(reason) } };
};

export default async function handler(req, res) {
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  const out = await decide({ headers: req.headers, body: req.body || {}, env: process.env, fetchImpl: fetch });
  // Visible in the Vercel logs, so a cap that is not counting is never silent.
  if (out.json?.open) console.warn("build-pass not counting:", out.json.open);
  res.setHeader("Cache-Control", "no-store");
  return res.status(out.status).json(out.json);
}
