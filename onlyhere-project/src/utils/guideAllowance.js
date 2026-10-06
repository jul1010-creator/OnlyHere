// ── ONE GUIDE A DAY, AND A CEILING ON THE WHOLE DAY ─────────────────
//
// Oliver, 28 Sep 2026, after deciding the guide stays free and affiliates have
// to pay for it: "Yes, have a cap. And on the review, when someone clicks to
// build the guide, ask 'are you sure? You can only generate one guide a day.'"
//
// A free guide is money out of his pocket on every build, so two things are
// counted, per Danish calendar day:
//
//   each visitor      one guide (a random id kept in their browser)
//   each account      one guide, so signing in on a second device is not a
//                     second guide
//   each IP address   a few guides, not one. Danish mobile carriers put many
//                     phones behind one address, and so does hotel and campus
//                     wifi, so one per IP would refuse real people who never
//                     built anything. The IP count is only the backstop for
//                     somebody clearing their browser to get a fresh visitor id.
//   the whole site    GEMLYX_GUIDES_PER_DAY, the spending ceiling. 0 pauses the
//                     builder for everyone who is not on the uncapped list.
//
// A build that fails halfway is not their fault, so the pass it was given can
// be shown again for a small number of retries rather than being spent.
//
// This file is shared by the browser and by api/build-pass.js, so it imports
// nothing: the server hands in its own HMAC and hash functions.

export const ALLOWANCE_DEFAULTS = Object.freeze({
  perVisitor: 1,
  perAccount: 1,
  perIp: 4,
  perDay: 40,
  // One more try for a build that failed halfway. Each retry still takes a
  // slot from the network and from the day, because it spends the same money.
  retries: 1,
  // Builds a visitor may stop and get back in one day. Stopping still spends
  // what the build spent so far, so the day's total keeps it, and this caps
  // how often one browser can start and stop on his money.
  refunds: 2,
});

// The day a guide counts against is Denmark's, so the allowance comes back at
// midnight in Copenhagen whatever the visitor's own clock says. en-CA formats
// as YYYY-MM-DD, which is also what a Postgres date column takes.
export const copenhagenDay = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

// A whole number from an env var, or the default. A typo in Vercel must not
// turn into NaN, because NaN compares false against everything and a limit
// that compares false is no limit at all.
const wholeOr = (value, fallback) => {
  const s = String(value ?? "").trim();
  if (!/^\d+$/.test(s)) return fallback;
  return Number(s);
};

export const readLimits = (env = {}) => ({
  perVisitor: Math.max(1, wholeOr(env.GEMLYX_GUIDES_PER_VISITOR, ALLOWANCE_DEFAULTS.perVisitor)),
  perAccount: Math.max(1, wholeOr(env.GEMLYX_GUIDES_PER_ACCOUNT, ALLOWANCE_DEFAULTS.perAccount)),
  perIp: Math.max(1, wholeOr(env.GEMLYX_GUIDES_PER_IP, ALLOWANCE_DEFAULTS.perIp)),
  // 0 is allowed here and only here: it is the off switch. Unset is the
  // default; set to anything that is not a whole number, it is off, not the
  // default (security review, 5 Oct 2026, finding 12), the way the AI limits
  // read since 4 Oct.
  perDay: String(env.GEMLYX_GUIDES_PER_DAY ?? "").trim() === "" ? ALLOWANCE_DEFAULTS.perDay : wholeOr(env.GEMLYX_GUIDES_PER_DAY, 0),
  retries: wholeOr(env.GEMLYX_GUIDE_RETRIES, ALLOWANCE_DEFAULTS.retries),
  refunds: wholeOr(env.GEMLYX_GUIDE_REFUNDS, ALLOWANCE_DEFAULTS.refunds),
});

// Who builds without counting: Oliver, testing. An explicit list only, by
// Supabase user id or by email. Unset means NOBODY, never "any signed in
// account", because the Studio endpoints read an empty GEMLYX_FOUNDER_IDS as
// "anyone with a login" and on a cap that would uncap every traveller who made
// an account.
export const uncappedList = (env = {}) =>
  String(env.GEMLYX_UNCAPPED || env.GEMLYX_FOUNDER_IDS || "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

// An email on the list counts only once that email is confirmed: anybody can
// sign up with an address they do not own, and an unconfirmed one on the list
// would build uncapped (security review, 6 Oct 2026, finding 9). An id counts
// as it is, because Supabase gave it.
export const isUncapped = (list, { userId = "", email = "", confirmed = false } = {}) => {
  const l = Array.isArray(list) ? list : [];
  if (!l.length) return false;
  const id = String(userId || "").trim().toLowerCase();
  const mail = String(email || "").trim().toLowerCase();
  return (!!id && l.includes(id)) || (!!mail && !!confirmed && l.includes(mail));
};

// The id a browser keeps for itself. Anything else is ignored rather than
// trusted, because it becomes part of a database key.
export const VISITOR_RE = /^[a-z0-9-]{8,64}$/i;
export const cleanVisitor = (v) => (VISITOR_RE.test(String(v || "")) ? String(v).toLowerCase() : "");

// The counters one build takes, in the order they are checked. The site
// ceiling is last so that a visitor who already had today's guide is told
// that, rather than that the site is full.
export const allowanceKeys = ({ visitor = "", ipHash = "", userId = "" } = {}, limits = ALLOWANCE_DEFAULTS) => {
  const keys = [];
  const v = cleanVisitor(visitor);
  if (v) keys.push({ key: `v:${v}`, limit: limits.perVisitor });
  if (userId) keys.push({ key: `u:${String(userId).toLowerCase()}`, limit: limits.perAccount });
  if (ipHash) keys.push({ key: `ip:${ipHash}`, limit: limits.perIp });
  keys.push({ key: "site", limit: limits.perDay });
  return keys;
};

// The database answers with the key that was full, or "ok".
export const reasonOfKey = (key) => {
  const k = String(key || "");
  if (k === "ok") return "ok";
  if (k.startsWith("v:") || k.startsWith("u:")) return "used";
  if (k.startsWith("ip:")) return "network";
  if (k.startsWith("r:")) return "retries";
  if (k === "site") return "site";
  return "";
};

// What the traveller reads. His own wording for the rule, and somewhere to go
// instead of a dead end.
export const REFUSAL_TEXT = Object.freeze({
  used: "You have already built today's guide. You can build a new one tomorrow.",
  account: "Sign in to plan a trip. It is free with an account.",
  confirm: "Confirm your email first. The link is in your inbox.",
  network: "Several guides have already been built from this network today. You can build a new one tomorrow.",
  retries: "This guide could not be finished today. You can build a new one tomorrow.",
  site: "Gemlyx has built all the guides it can for today. You can build one tomorrow.",
});
export const refusalText = (reason) => REFUSAL_TEXT[reason] || REFUSAL_TEXT.site;

// ── THE PASS ────────────────────────────────────────────────────────
// day.visitor.nonce.signature. The signature is what lets a failed build ask
// again without counting as a second guide, and what stops a visitor inventing
// a pass for a nonce of their choosing. `sign` is the server's HMAC.
export const PASS_RE = /^(\d{4}-\d{2}-\d{2})\.([a-z0-9-]{0,64})\.([a-z0-9]{8,40})\.([A-Za-z0-9_-]{16,128})$/;

export const passBody = (day, visitor, nonce) => `${day}.${cleanVisitor(visitor)}.${nonce}`;

export const makePass = (sign, { day, visitor, nonce }) => {
  const body = passBody(day, visitor, nonce);
  return `${body}.${sign(body)}`;
};

// A pass is good for a retry only on the day it was issued, from the visitor it
// was issued to, with a signature the server itself made.
export const readPass = (sign, pass, { day, visitor } = {}) => {
  const m = PASS_RE.exec(String(pass || ""));
  if (!m) return null;
  const [, pDay, pVisitor, nonce, sig] = m;
  if (pDay !== day) return null;
  if (pVisitor !== cleanVisitor(visitor)) return null;
  const expected = sign(`${pDay}.${pVisitor}.${nonce}`);
  if (!sameString(expected, sig)) return null;
  return { day: pDay, visitor: pVisitor, nonce };
};

// Constant time for equal lengths, so the comparison does not leak how many
// leading characters of a guessed signature were right.
const sameString = (a, b) => {
  const x = String(a), y = String(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
};

// ── WHICH PART OF THE ADDRESS IS ONE HOUSEHOLD ──────────────────────
// An IPv4 address is one network. An IPv6 client owns a whole /64 and its
// phone rotates through it on its own, so hashing the full address would hand
// every request a fresh counter. The first four groups are the household.
export const ipKeyOf = (ip) => {
  const raw = String(ip || "").trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (!raw) return "";
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(raw);
  if (mapped) return mapped[1];
  if (!raw.includes(":")) return raw;
  const [head, tail = null] = raw.split("::");
  const h = head ? head.split(":") : [];
  const t = tail === null ? [] : (tail ? tail.split(":") : []);
  const fill = tail === null ? [] : Array(Math.max(0, 8 - h.length - t.length)).fill("0");
  const groups = [...h, ...fill, ...t].map(g => g.replace(/^0+(?=.)/, ""));
  return `${groups.slice(0, 4).join(":")}::/64`;
};

// The address a request came from, as Vercel reports it. Vercel sets both of
// these itself and overwrites what a client sends, so neither can be used to
// pose as somebody else's address.
export const clientIp = (headers) => {
  const h = headers || {};
  const get = (k) => String((typeof h.get === "function" ? h.get(k) : h[k]) || "");
  const real = get("x-real-ip").trim();
  if (real) return real;
  return get("x-forwarded-for").split(",")[0].trim();
};

// ── IN THE BROWSER ──────────────────────────────────────────────────
// What this browser knows about today. Only a convenience: the server decides,
// and this only lets the review screen say so before anybody clicks.
export const VISITOR_KEY = "gx_visitor";
export const TODAY_KEY = "gx_guide_today";

const safeGet = (storage, key) => { try { return storage?.getItem(key) ?? null; } catch { return null; } };
const safeSet = (storage, key, value) => { try { storage?.setItem(key, value); } catch { /* private window */ } };

export const visitorIdIn = (storage, makeId) => {
  const kept = cleanVisitor(safeGet(storage, VISITOR_KEY));
  if (kept) return kept;
  const fresh = cleanVisitor(typeof makeId === "function" ? makeId() : "");
  if (fresh) safeSet(storage, VISITOR_KEY, fresh);
  return fresh;
};

export const todayRecord = (storage, day) => {
  const raw = safeGet(storage, TODAY_KEY);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw);
    return r && typeof r === "object" && r.day === day ? r : null;
  } catch { return null; }
};

export const writeToday = (storage, record) => safeSet(storage, TODAY_KEY, JSON.stringify(record));

// Built, or refused as already built. A pass that has not yet finished a guide
// is not "used": the build may have failed, and that visitor may try again.
export const guideUsedToday = (record) => !!(record && record.finished);
// Why today is used, for the review screen: built, or tried and failed until
// the retries ran out. Empty when it is not used.
export const usedTodayReason = (record) => (guideUsedToday(record) ? (record.reason === "retries" ? "retries" : "used") : "");

// Asked at the start of a build, before any model call. Anything that is not a
// clear refusal lets the build go ahead: the server fails open for the same
// reason, and a traveller must never be turned away by a cap that is not there.
export const askForGuidePass = async ({ fetchImpl, storage, token = "", makeId, now = new Date() } = {}) => {
  const day = copenhagenDay(now);
  const visitor = visitorIdIn(storage, makeId);
  const kept = todayRecord(storage, day);
  const retry = kept && !kept.finished && kept.pass ? kept.pass : undefined;
  let res, data;
  try {
    res = await fetchImpl("/api/build-pass", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ visitor, ...(retry ? { retry } : {}) }),
    });
    data = await res.json().catch(() => null);
  } catch {
    return { ok: true, open: "unreachable" };
  }
  if ((res.status === 429 || res.status === 401) && data && data.ok === false) {
    // Already built today is remembered, so the review screen can say so
    // before the next click rather than after it.
    if (data.reason === "used" || data.reason === "retries") writeToday(storage, { day, finished: true, reason: data.reason });
    return { ok: false, reason: data.reason || "site", message: data.message || refusalText(data.reason) };
  }
  if (!res.ok || !data || data.ok !== true) return { ok: true, open: `status-${res.status}` };
  if (data.uncapped) return { ok: true, uncapped: true };
  if (data.pass) writeToday(storage, { day, pass: data.pass, finished: false });
  return { ok: true, open: data.open || "" };
};

// ── STOPPED IS NOT SPENT ─────────────────────────────────────────────
// Oliver, 28 Sep 2026: "make sure that if people cancel the making of the
// guide, then it doesn't count as their daily limit." The pass is handed back
// and the server takes the build off their browser, account and network. It
// stays on the day's total, because what the build spent before it stopped
// was spent. Only said to the traveller when the server confirms it.
export const cancelGuidePass = async ({ fetchImpl, storage, token = "", now = new Date() } = {}) => {
  const day = copenhagenDay(now);
  const kept = todayRecord(storage, day);
  if (!kept || !kept.pass || kept.finished) return { refunded: false };
  const visitor = cleanVisitor(safeGet(storage, VISITOR_KEY));
  try {
    const res = await fetchImpl("/api/build-pass", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ visitor, cancel: kept.pass }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && data.refunded === true) {
      writeToday(storage, { day });
      return { refunded: true };
    }
    return { refunded: false };
  } catch {
    return { refunded: false };
  }
};

// Once the guide exists, today's is spent.
export const markGuideBuilt = (storage, now = new Date()) => {
  const day = copenhagenDay(now);
  const kept = todayRecord(storage, day);
  if (!kept) return;
  writeToday(storage, { ...kept, finished: true });
};
