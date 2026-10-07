// ── WHO MAY SPEND THE AI ACCOUNTS ───────────────────────────────────
//
// Oliver, 30 Sep 2026, after Fable's audit: "absolutely secure our work", and
// in the same breath "require account-making for enabling all the perks".
//
// Until tonight /api/anthropic, /api/openai, /api/perplexity and /api/search
// checked one thing, the Origin header, which a script outside a browser types
// in one line. Whatever body came with it was passed through, so anybody who
// found the address could run their own requests on his Claude, OpenAI,
// Perplexity and Tavily accounts, with any model and any length.
//
// Now a call has to carry a Supabase token, and the token has to be either the
// founder's (Studio) or a member's whose email is confirmed. A member's calls
// are counted per account per Copenhagen day in the same table the guide cap
// uses (gemlyx_take_guide), with a ceiling for the whole site on top. The body
// is not trusted: the model, the length and the tools are decided here.
//
// FAILS CLOSED for members. If the counter cannot be reached, a member's call
// is refused rather than let through uncounted; the founder is never counted.
//
// ── OPEN, BUT CAPPED ────────────────────────────────────────────────
// Oliver, 3 Oct 2026, choosing between this gate as it was (no account, no
// AI) and keeping the app open until accounts come with the new terms on
// 1 November: "Open, but capped". So a visitor without an account, or with a
// session that has lapsed or an email not yet confirmed, still gets an
// answer, on the tightest terms of all: the model and the length are decided
// here, no paid server tools, a smaller body, and three counters a day, one
// for the visitor (a salted hash of their address, never the address), one
// for every visitor together, and the whole site's. The security review of
// 3 Oct 2026 (finding 1) is closed by the caps and the counters, not by the
// sign-in.
//
// Pure apart from the fetch it is handed, so the suite can drive it.
import { createHash } from "node:crypto";
import { requestIsFromSite, NOT_FROM_SITE, isFounder } from "./apiGuard.js";
import { copenhagenDay } from "./guideAllowance.js";

export const SUPABASE_FALLBACK_URL = "https://vpxfahjnerkkkoueovhl.supabase.co";

// What a member's request may ask for. The founder gets the wider column.
export const AI_CEILINGS = {
  anthropic: {
    models: ["claude-sonnet-5", "claude-opus-4-8"],
    defaultModel: "claude-sonnet-5",
    // A visitor's guide is written by Opus at up to 6000 tokens (App.jsx), so
    // 8192 lets that through with room and nothing much bigger.
    anonTokens: 8192,
    memberTokens: 16000,
    founderTokens: 64000,
  },
  openai: {
    models: ["gpt-5.6-sol"],
    defaultModel: "gpt-5.6-sol",
    anonTokens: 8000,
    memberTokens: 12000,
    founderTokens: 16000,
  },
  perplexity: {
    models: ["sonar"],
    founderModels: ["sonar", "sonar-pro"],
    defaultModel: "sonar",
    anonTokens: 1024,
    memberTokens: 1024,
    founderTokens: 4096,
  },
  search: { anonResults: 6, memberResults: 8, founderResults: 20, maxQuery: 400 },
};

// Bytes of JSON a request may carry. A guide build's longest prompt (the
// writer with the published inventory) is well under the member figure.
// 5 Oct 2026, security review finding 2: the member figure was 1 MB, which
// let one call carry a very long and costly prompt. 500 KB still holds the
// writer's longest prompt with room over.
// An Opus call is the dearest per token, so it may carry less (security
// review, 5 Oct 2026, finding 2, the part still open on 7 Oct). 250 KB, not
// the review's 200 KB: the guide writer's prompt could not be measured on a
// live build, and a member's guide refused for size would be a failed guide.
export const BODY_LIMIT = { anon: 400_000, member: 500_000, founder: 4_000_000, opus: 250_000 };

// Calls per member per day, and for all members together. A whole guide build
// is some tens of calls, and a member gets one guide a day.
// A visitor without an account: 120 calls a day, about three guides, and all
// such visitors together 1500. All are set in Vercel without a code change.
// ── 0 IS OFF, AND A TYPO IS NOT A DEFAULT ───────────────────────────
// Security review, 4 Oct 2026, finding 3. Each limit read Number(x) || default,
// so 0, the obvious emergency off switch, came back as the default, and so did
// any typo: setting GEMLYX_AI_PER_DAY to 0 left the site at 8000 calls. Now an
// unset limit is the default, 0 is off, and anything that is not a whole
// number of 0 or more is off too, because a limit nobody can read must not
// open the door.
export const limitOf = (value, fallback) => {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const n = Number(String(value).trim());
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};
export const readAiLimits = (env = {}) => ({
  perUser: limitOf(env.GEMLYX_AI_PER_USER, 400),
  perDay: limitOf(env.GEMLYX_AI_PER_DAY, 8000),
  perVisitor: limitOf(env.GEMLYX_AI_PER_VISITOR, 120),
  anonPerDay: limitOf(env.GEMLYX_AI_ANON_PER_DAY, 1500),
  // The dearest model, for visitors only (finding 4): a guide uses it once or
  // twice, so a visitor gets a few a day and all visitors together a ceiling.
  opusPerVisitor: limitOf(env.GEMLYX_AI_OPUS_PER_VISITOR, 6),
  anonOpusPerDay: limitOf(env.GEMLYX_AI_ANON_OPUS_PER_DAY, 150),
  // A member had no Opus ceiling at all (security review, 5 Oct 2026, finding
  // 2). 120 a day is above what a long guide's writer uses, retries included.
  opusPerUser: limitOf(env.GEMLYX_AI_OPUS_PER_USER, 120),
  // And all members together (security review, 6 Oct 2026, still open High):
  // a crowd of throwaway accounts each under their own 120 is still a ceiling
  // the site sets, not the crowd.
  membersOpusPerDay: limitOf(env.GEMLYX_AI_MEMBERS_OPUS_PER_DAY, 1000),
});
export const AI_OFF = "Gemlyx's AI is switched off just now.";

// The visitor's address as Vercel reports it. x-real-ip is set by Vercel
// itself; the first x-forwarded-for entry is the fallback.
const headerOf = (headers, name) => {
  const h = headers || {};
  return String((typeof h.get === "function" ? h.get(name) : h[name]) || "");
};
// ── ONE IPv6 MACHINE IS ONE VISITOR ─────────────────────────────────
// Security review, 4 Oct 2026, finding 4. An IPv6 connection usually holds a
// whole /64 of addresses, so counting the full address let one machine count
// as endless visitors. An IPv6 address is counted by its first four groups,
// the /64 a home or a phone is given; IPv4 is counted whole.
export const addressBlock = (addr) => {
  const a = String(addr || "").trim().replace(/^\[|\]$/g, "").split("%")[0];
  if (!a.includes(":")) return a;
  if (/^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(a)) return a.slice(7);
  const [head, tail = ""] = a.split("::");
  const h = head ? head.split(":") : [];
  const t = a.includes("::") ? (tail ? tail.split(":") : []) : [];
  const groups = a.includes("::") ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t] : h;
  return groups.slice(0, 4).map(g => (g || "0").toLowerCase().replace(/^0+(?=.)/, "")).join(":") + "::/64";
};
export const visitorAddress = (headers) =>
  addressBlock((headerOf(headers, "x-real-ip") || headerOf(headers, "x-forwarded-for").split(",")[0] || "").trim()) || "unknown";
// Kept only as a salted hash, so the counter table never holds an address.
export const visitorKey = (headers, salt = "") =>
  `ai:v:${createHash("sha256").update(`${salt}|${visitorAddress(headers)}`).digest("hex").slice(0, 24)}`;

const tokenOf = (headers) => {
  const h = headers || {};
  const raw = String((typeof h.get === "function" ? h.get("authorization") : (h.authorization || h.Authorization)) || "");
  return raw.startsWith("Bearer ") ? raw.slice(7).trim() : "";
};

// A Supabase user: id, email, and whether the email is confirmed.
const whoIs = async (token, { supabaseUrl, apiKey, fetchImpl }) => {
  try {
    const r = await fetchImpl(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: apiKey, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u?.id) return null;
    return { id: String(u.id), email: String(u.email || ""), confirmed: !!(u.email_confirmed_at || u.confirmed_at) };
  } catch { return null; }
};

const takeCalls = ({ day, userId = "", visitor = "", opus = false, limits, supabaseUrl, serviceKey, fetchImpl }) => takeDaily({
  day, supabaseUrl, serviceKey, fetchImpl,
  keys: visitor
    ? [
      { key: visitor, limit: limits.perVisitor }, { key: "ai:anon", limit: limits.anonPerDay }, { key: "ai:site", limit: limits.perDay },
      ...(opus ? [{ key: `${visitor}:opus`, limit: limits.opusPerVisitor }, { key: "ai:anon:opus", limit: limits.anonOpusPerDay }] : []),
    ]
    : [
      { key: `ai:u:${userId.toLowerCase()}`, limit: limits.perUser }, { key: "ai:site", limit: limits.perDay },
      ...(opus ? [{ key: `ai:u:${userId.toLowerCase()}:opus`, limit: limits.opusPerUser }, { key: "ai:members:opus", limit: limits.membersOpusPerDay }] : []),
    ],
});
// The model a visitor's Anthropic call will run on, after shapeAnthropic.
const asksForOpus = (endpoint, body) => endpoint === "anthropic" && /opus/i.test(String(body?.model || "")) && AI_CEILINGS.anthropic.models.includes(body.model);

// ── A DAILY COUNT, TAKEN IN ONE STEP ────────────────────────────────
// gemlyx_take_guide checks every key against its limit and counts them all
// under one lock, so two calls arriving together cannot both pass the last
// place. Used by the AI routes, /api/ask and /api/report-problem.
// { ok } when counted, { over: key } when a limit is reached, { closed } when
// the counter could not be reached, which every caller treats as a no.
export const takeDaily = async ({ day, keys, supabaseUrl, serviceKey, fetchImpl = fetch }) => {
  try {
    const r = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/gemlyx_take_guide`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_day: day, p_keys: keys.map(k => k.key), p_limits: keys.map(k => k.limit) }),
      // A slow counter is a closed one, not a wait (security review, 5 Oct
      // 2026, finding 8). Every caller already treats { closed } as a no.
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return { closed: true };
    const answer = String((await r.json()) ?? "");
    return answer === "ok" ? { ok: true } : { over: answer };
  } catch { return { closed: true }; }
};

// ── THE GATE ────────────────────────────────────────────────────────
// Returns { ok: true, founder, userId } or { ok: false, status, error }.
export const gateAi = async ({ headers, body, endpoint, env = {}, fetchImpl = fetch, now = new Date() }) => {
  if (!requestIsFromSite(headers)) return { ok: false, status: 403, error: NOT_FROM_SITE };
  const supabaseUrl = env.SUPABASE_URL || SUPABASE_FALLBACK_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "";
  const apiKey = serviceKey || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  const size = (() => { try { return JSON.stringify(body ?? {}).length; } catch { return Infinity; } })();
  const token = tokenOf(headers);
  const who = token && apiKey ? await whoIs(token, { supabaseUrl, apiKey, fetchImpl }) : null;
  const limits = readAiLimits(env);
  const day = copenhagenDay(now);
  if (who) {
    const founder = isFounder(who.id, env.GEMLYX_FOUNDER_IDS);
    if (size > (founder ? BODY_LIMIT.founder : asksForOpus(endpoint, body) ? BODY_LIMIT.opus : BODY_LIMIT.member)) return { ok: false, status: 413, error: "That request is too large." };
    if (founder) {
      // A ceiling even for the founder (security review, 5 Oct 2026): one
      // stolen Studio token was unlimited spend. Far above a working day.
      const got = await takeDaily({ day, keys: [{ key: "ai:founder", limit: limitOf(env.GEMLYX_AI_FOUNDER_PER_DAY, 3000) }], supabaseUrl, serviceKey, fetchImpl });
      if (!got.ok) return { ok: false, status: got.closed ? 503 : 429, error: got.closed ? "This is not available just now. Try again in a moment." : "Studio has reached today's AI ceiling. It resets at midnight, Danish time." };
      return { ok: true, founder: true, anon: false, userId: who.id };
    }
    if (who.confirmed) {
      if (limits.perUser === 0 || limits.perDay === 0) return { ok: false, status: 503, error: AI_OFF };
      if (!serviceKey) return { ok: false, status: 503, error: "This is not available just now." };
      const got = await takeCalls({ day, userId: who.id, opus: asksForOpus(endpoint, body), limits, supabaseUrl, serviceKey, fetchImpl });
      if (got.closed) return { ok: false, status: 503, error: "This is not available just now. Try again in a moment." };
      if (!got.ok) return { ok: false, status: 429, error: ["ai:site", "ai:members:opus"].includes(got.over) ? "Gemlyx has used its AI for today. Try again tomorrow." : "You have used today's allowance. It resets at midnight, Danish time." };
      return { ok: true, founder: false, anon: false, userId: who.id, endpoint };
    }
  }
  // No account, a lapsed session or an unconfirmed email: the visitor's terms.
  if (size > BODY_LIMIT.anon) return { ok: false, status: 413, error: "That request is too large." };
  const opus = asksForOpus(endpoint, body);
  if (limits.perVisitor === 0 || limits.anonPerDay === 0 || limits.perDay === 0) return { ok: false, status: 503, error: AI_OFF };
  if (!serviceKey) return { ok: false, status: 503, error: "This is not available just now." };
  const got = await takeCalls({ day, visitor: visitorKey(headers, serviceKey.slice(-16)), opus, limits, supabaseUrl, serviceKey, fetchImpl });
  if (got.closed) return { ok: false, status: 503, error: "This is not available just now. Try again in a moment." };
  if (!got.ok) return { ok: false, status: 429, error: ["ai:site", "ai:anon", "ai:anon:opus"].includes(got.over) ? "Gemlyx has used its AI for today. Try again tomorrow." : "You have used today's allowance. It resets at midnight, Danish time." };
  return { ok: true, founder: false, anon: true, userId: "", endpoint };
};

// ── THE BODY, AS THE SERVER ALLOWS IT ───────────────────────────────
// Anthropic: an allowed model, a capped length, and only the app's own
// (client-side) tools. A server tool, such as web search, has a `type` and is
// billed per use, so it is taken off a member's request.
// ── ONLY WHAT THE APP ITSELF SENDS ──────────────────────────────────
// Security review, 5 Oct 2026, finding 2: everybody but the founder had the
// request body copied on whole, so a caller could add a priority service
// tier, cache writes, or PDF and image links that are billed per page, past
// the size check. Now a member's or visitor's request keeps the fields the
// app sends and the block types the chat sends back on each tool round
// (thinking and redacted_thinking among them, or the chat breaks), at most
// two images by address, and no cache_control anywhere.
export const ANTHROPIC_FIELDS = ["model", "max_tokens", "messages", "system", "tools", "tool_choice", "temperature", "top_p", "top_k", "stop_sequences", "stream", "thinking"];
const BLOCK_TYPES = new Set(["text", "image", "tool_use", "tool_result", "thinking", "redacted_thinking"]);
export const MAX_IMAGES = 2;
const noCache = (b) => { if (!b || typeof b !== "object") return b; const { cache_control, ...rest } = b; return rest; };
const cleanBlocks = (blocks, seen) => (Array.isArray(blocks) ? blocks : []).filter(b => b && BLOCK_TYPES.has(b.type)).filter(b => {
  if (b.type !== "image") return true;
  if (b.source?.type !== "url" || !/^https?:\/\//i.test(String(b.source?.url || ""))) return false;
  seen.images += 1;
  return seen.images <= MAX_IMAGES;
}).map(b => {
  const out = noCache(b);
  if (out.type === "tool_result" && Array.isArray(out.content)) out.content = cleanBlocks(out.content, seen).filter(x => x.type === "text" || x.type === "image");
  return out;
});
export const keepAnthropicFields = (body = {}) => {
  const out = {};
  for (const k of ANTHROPIC_FIELDS) if (body[k] !== undefined) out[k] = body[k];
  const seen = { images: 0 };
  if (Array.isArray(out.messages)) out.messages = out.messages.filter(m => m && (m.role === "user" || m.role === "assistant")).map(m => ({ role: m.role, content: typeof m.content === "string" ? m.content : cleanBlocks(m.content, seen) }));
  if (Array.isArray(out.system)) out.system = out.system.filter(b => b && b.type === "text").map(noCache);
  if (Array.isArray(out.tools)) out.tools = out.tools.map(noCache);
  return out;
};

export const shapeAnthropic = (body = {}, { founder = false, anon = false } = {}) => {
  const c = AI_CEILINGS.anthropic;
  const out = founder ? { ...body } : keepAnthropicFields(body);
  if (!founder) {
    out.model = c.models.includes(out.model) ? out.model : c.defaultModel;
    if (Array.isArray(out.tools)) out.tools = out.tools.filter(t => t && !t.type).slice(0, 12);
  }
  const cap = founder ? c.founderTokens : anon ? c.anonTokens : c.memberTokens;
  out.max_tokens = Math.min(Math.max(1, Number(out.max_tokens) || 1024), cap);
  return out;
};

// ── AND OPENAI, THE SAME WAY ────────────────────────────────────────
// Security review, 6 Oct 2026, the High still open: the OpenAI body was still
// copied whole for everybody but the founder, so a priority service tier,
// stored completions, audio or image parts, or many answers could ride along.
// Now it keeps the fields the app sends, text parts only, and the roles a chat
// has.
export const OPENAI_FIELDS = ["model", "messages", "response_format", "max_completion_tokens", "max_tokens", "reasoning_effort", "temperature", "top_p", "tools", "tool_choice", "stop"];
const OPENAI_ROLES = new Set(["system", "developer", "user", "assistant", "tool"]);
export const keepOpenAIFields = (body = {}) => {
  const out = {};
  for (const k of OPENAI_FIELDS) if (body[k] !== undefined) out[k] = body[k];
  if (Array.isArray(out.messages)) {
    out.messages = out.messages.filter(m => m && OPENAI_ROLES.has(m.role)).map(m => {
      const keep = { role: m.role, content: Array.isArray(m.content) ? m.content.filter(p => p && p.type === "text" && typeof p.text === "string").map(p => ({ type: "text", text: p.text })) : (typeof m.content === "string" || m.content === null ? m.content : "") };
      if (m.role === "tool" && m.tool_call_id) keep.tool_call_id = String(m.tool_call_id);
      if (m.role === "assistant" && Array.isArray(m.tool_calls)) keep.tool_calls = m.tool_calls;
      if (m.name) keep.name = String(m.name).slice(0, 64);
      return keep;
    });
  }
  if (out.response_format && !["json_object", "text", "json_schema"].includes(out.response_format?.type)) delete out.response_format;
  return out;
};

export const shapeOpenAI = (body = {}, { founder = false, anon = false } = {}) => {
  const c = AI_CEILINGS.openai;
  const out = founder ? { ...body } : keepOpenAIFields(body);
  if (!founder) out.model = c.models.includes(out.model) ? out.model : c.defaultModel;
  // No server tools on OpenAI either: web search there is billed per call.
  if (!founder && Array.isArray(out.tools)) out.tools = out.tools.filter(t => t && t.type === "function").slice(0, 12);
  const cap = founder ? c.founderTokens : anon ? c.anonTokens : c.memberTokens;
  const asked = Number(out.max_completion_tokens ?? out.max_tokens) || 800;
  delete out.max_tokens;
  out.max_completion_tokens = Math.min(Math.max(1, asked), cap);
  // Never more than one answer per call.
  delete out.n;
  return out;
};

export const shapePerplexity = (body = {}, { founder = false, anon = false } = {}) => {
  const c = AI_CEILINGS.perplexity;
  const models = founder ? c.founderModels : c.models;
  return {
    prompt: body.prompt,
    model: models.includes(body.model) ? body.model : c.defaultModel,
    max_tokens: Math.min(Math.max(1, Number(body.max_tokens) || 1024), founder ? c.founderTokens : anon ? c.anonTokens : c.memberTokens),
  };
};

export const searchCeiling = ({ q, n, domains }, { founder = false, anon = false } = {}) => {
  const c = AI_CEILINGS.search;
  const max = founder ? c.founderResults : anon ? c.anonResults : c.memberResults;
  return {
    q: String(q || "").slice(0, c.maxQuery),
    n: Math.min(Math.max(Number(n) || (domains ? 8 : 4), 1), max),
  };
};
