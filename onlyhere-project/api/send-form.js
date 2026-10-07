// /api/send-form.js
// The three visitor forms (reports and feedback, suggestions, workshop
// requests), written by the server and counted per network.
//
// Security review, 7 Oct 2026: the tables took rows straight from the public
// key, any size, any column and any number, so a script could bury the
// reports inbox or mark reports handled before Oliver saw them.
import { requestIsFromSite, NOT_FROM_SITE } from "../src/utils/apiGuard.js";
import { takeDaily, visitorKey, SUPABASE_FALLBACK_URL } from "../src/utils/aiGate.js";
import { copenhagenDay } from "../src/utils/guideAllowance.js";

// The table a form writes, and the only columns it may set. handled,
// created_at and id are the database's.
export const FORMS = {
  gemlyx_support: ["reference", "topic", "email", "name", "message", "url", "good_faith"],
  gemlyx_suggestions: ["name", "type", "note"],
  craft_requests: ["craft", "location", "name", "email", "interest", "visit"],
};
const FIELD_MAX = 6000;

export const formRow = (form, sent) => {
  const cols = FORMS[form];
  if (!cols) return null;
  const row = {};
  for (const c of cols) {
    const v = sent?.[c];
    if (v === undefined || v === null) continue;
    row[c] = typeof v === "boolean" ? v : String(v).slice(0, FIELD_MAX);
  }
  return row;
};

export default async function handler(req, res) {
  if (!requestIsFromSite(req.headers)) {
    return res.status(403).json({ error: NOT_FROM_SITE });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const form = String(req.body?.form || "");
  const row = formRow(form, req.body?.row);
  if (!row) return res.status(400).json({ error: "Unknown form." });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_FALLBACK_URL;
  if (!serviceKey) return res.status(503).json({ error: "Could not send just now." });
  const took = await takeDaily({
    day: copenhagenDay(new Date()),
    keys: [
      { key: visitorKey(req.headers, serviceKey.slice(-16)).replace(/^ai:v:/, "form:v:"), limit: 30 },
      { key: "form:site", limit: 1000 },
    ],
    supabaseUrl, serviceKey,
  });
  if (took.closed) return res.status(503).json({ error: "Could not send just now." });
  if (!took.ok) return res.status(429).json({ error: "Too many messages today. Try again tomorrow." });

  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/${form}`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      console.error("send-form:", form, r.status, (await r.text().catch(() => "")).slice(0, 300));
      // 400 is passed on: SupportPage retries once without `name` when the
      // column is missing (src/components/SupportPage.jsx lines 210-214).
      return res.status(r.status === 400 ? 400 : 502).json({ error: "Could not send just now." });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("send-form:", form, e);
    return res.status(502).json({ error: "Could not send just now." });
  }
}
