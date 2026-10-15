// /api/save-guide.js
// A saved guide, written by the server and counted.
//
// Security review, 7 Oct 2026: gemlyx_guides took inserts straight from the
// public key, 800 KB a row with no count, so a script could fill the database
// and publish its own pages under gemlyxtravel.com/guide/<id>. Saving still
// needs no account (the Lithuanian page, App.jsx OPEN_ABROAD).
import { Buffer } from "node:buffer";
import { requestIsFromSite, NOT_FROM_SITE } from "../src/utils/apiGuard.js";
import { takeDaily, visitorKey, SUPABASE_FALLBACK_URL } from "../src/utils/aiGate.js";
import { copenhagenDay, cleanVisitor } from "../src/utils/guideAllowance.js";

const ID_RE = /^[a-z0-9]{16}$/;

// ── NAMES ARE TEXT, NEVER MARKUP ────────────────────────────────────
// Security review, 9 Oct 2026. A stop name in a saved guide reached the route
// map as HTML. The map escapes it now; this refuses the guide that tried. Only
// the fields that NAME things are judged, because they are never prose. Any
// other field carrying a tag is logged, so a wider rule can be judged on what
// real guides contain before it refuses anything.
const TAG = /<[a-z!\/?]/i;
export const guideShapeOk = (p) => {
  const days = p?.days;
  if (!Array.isArray(days) || days.length > 21) return false;
  if (days.some(d => !d || typeof d !== "object" || (d.stops != null && !Array.isArray(d.stops)))) return false;
  const named = [
    p.title,
    ...days.flatMap(d => [d.title, ...(d.stops || []).flatMap(s => [s?.name, s?.town])]),
    ...Object.keys(p._geo && typeof p._geo === "object" ? p._geo : {}),
  ];
  if (named.some(v => v != null && TAG.test(String(v)))) return false;
  try { if (TAG.test(JSON.stringify(p))) console.warn("save-guide: a tag in a field that is not a name"); } catch { /* size check already ran */ }
  return true;
};
const MAX_BYTES = 800_000;

export default async function handler(req, res) {
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const id = String(req.body?.id || "");
  const guide = req.body?.payload;
  if (!ID_RE.test(id) || !guide || typeof guide !== "object" || Array.isArray(guide)) {
    return res.status(400).json({ error: "That guide could not be saved." });
  }
  // The same four fields the page strips, stripped again here.
  const { _testProfile, _testPlan, _planProblems, _convoText, ...payload } = guide;
  let size = Infinity;
  try { size = Buffer.byteLength(JSON.stringify(payload)); } catch { /* stays Infinity */ }
  if (size > MAX_BYTES) return res.status(413).json({ error: "That guide is too large to save." });
  if (!guideShapeOk(payload)) return res.status(400).json({ error: "That guide could not be saved." });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_FALLBACK_URL;
  if (!serviceKey) return res.status(503).json({ error: "Could not save just now." });
  // Per browser, per network and for the site. A ship's or a hotel's wifi is
  // one network, so the network figure is generous and the browser one small.
  const visitor = cleanVisitor(req.body?.visitor);
  const took = await takeDaily({
    day: copenhagenDay(new Date()),
    keys: [
      ...(visitor ? [{ key: `save:v:${visitor}`, limit: 5 }] : []),
      { key: visitorKey(req.headers, serviceKey.slice(-16)).replace(/^ai:v:/, "save:ip:"), limit: 60 },
      { key: "save:site", limit: 1500 },
    ],
    supabaseUrl, serviceKey,
  });
  if (took.closed) return res.status(503).json({ error: "Could not save just now." });
  if (!took.ok) return res.status(429).json({ error: "Too many guides saved today. Try again tomorrow." });

  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/gemlyx_guides`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ id, payload }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      console.error("save-guide:", r.status, (await r.text().catch(() => "")).slice(0, 300));
      return res.status(502).json({ error: "Could not save just now." });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("save-guide:", e);
    return res.status(502).json({ error: "Could not save just now." });
  }
}
