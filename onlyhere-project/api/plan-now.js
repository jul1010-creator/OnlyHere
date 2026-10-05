// /api/plan-now.js
// GET ?c=LT&from=terminal&h=3&lang=en&slot=2026-10-06T10:30Z
//
// The "I have X hours" walk (Oliver, 2 Oct 2026). See src/utils/nowPlanner.js
// for the rules; this file only fetches what they need and asks the model to
// put the places in order.
//
// ── WHY IT COSTS ALMOST NOTHING ─────────────────────────────────────
// The answer is cached by Vercel for the half hour it was made in, keyed on
// the whole URL. Everybody leaving the terminal in the same half hour, with
// the same hours and language, gets the walk made for the first of them. The
// slot must be this half hour or the last one, so the cache cannot be walked
// through, and at most 2 starts x 4 lengths x 4 languages are made per half
// hour, and in practice a handful.
//
// No account and no gate: a cruise passenger off the ship for three hours is
// not signing up for anything, which was the point of the QR codes.
import { requestIsFromSite, NOT_FROM_SITE } from "../src/utils/apiGuard.js";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from "../src/utils/supabasePublic.js";
import { COUNTRY_PROFILES } from "../src/utils/countries.js";
import { placeClock } from "../src/utils/offerClock.js";
import { walkWeatherFrom } from "../src/utils/walkWeather.js";
import { ferryWait } from "../src/utils/walkable.js";
import { takeDaily, visitorKey, SUPABASE_FALLBACK_URL } from "../src/utils/aiGate.js";
import { copenhagenDay } from "../src/utils/guideAllowance.js";
import {
  NOW_STARTS, NOW_HOURS, NOW_LANGS, SHIP_MARGIN, slotAccepted, slotOf, slotDate,
  nowCandidates, ruleOrder, planPrompt, readOrder, goodWalk,
  withMustSee, tidyWalk, reversedWalk, placesOf, NOW_STYLES, styleCandidates, stylesThatFit,
  HERE, hereStart, snapPos,
} from "../src/utils/nowPlanner.js";

const json = (res, status, body, cache = "no-store") => {
  res.setHeader("Cache-Control", cache);
  return res.status(status).json(body);
};

// The model writes the order only between these hours at the place. Outside
// them the rules make the walk on their own: almost nothing is open, and the
// call would be paid for nobody.
const AI_FROM = 7 * 60, AI_TO = 21 * 60;

// A forecast that could not be read is said to be unknown, not dry: the
// model is told so, and the page does not promise sunshine. Security review,
// 3 Oct 2026, finding 16.
const UNKNOWN_WEATHER = { known: false, wet: false, snow: false, wind: 0, temp: null };
const weatherAt = async (p) => {
  try {
    const r = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${p.lat.toFixed(3)}&lon=${p.lon.toFixed(3)}`,
      { headers: { "User-Agent": "Gemlyx/1.0 (gemlyxtravel.com)" }, signal: AbortSignal.timeout(2500) });
    if (!r.ok) return UNKNOWN_WEATHER;
    const w = walkWeatherFrom(await r.json());
    if (!w) return UNKNOWN_WEATHER;
    return { wet: w.wet, snow: w.snow, wind: w.wind, temp: w.temp };
  } catch { return UNKNOWN_WEATHER; }
};

// NOT FROM src/config.js. That file reads import.meta for the browser build,
// and Vercel loads these routes as CommonJS, where import.meta is a syntax
// error and the whole route fails to start (the first deploy of this one,
// 2 Oct 2026). Published rows are public, so they are read with the public
// key, which reads nothing else (security review, 3 Oct 2026, finding 16).
const SUPABASE_URL = process.env.SUPABASE_URL || PUBLIC_SUPABASE_URL;

const rowsFor = async (country) => {
  const key = PUBLIC_SUPABASE_KEY;
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/gemlyx_content?select=id,type,payload&published=eq.true&type=in.(free,food,booking,festival,nightlife)&payload->>country=eq.${encodeURIComponent(country)}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(4000) },
  );
  if (!r.ok) throw new Error(`content ${r.status}`);
  return r.json();
};

const askModel = async (prompt) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(20000),
    });
    const d = await r.json();
    if (!r.ok) return null;
    return (d.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  } catch { return null; }
};

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "GET only." });
  if (!requestIsFromSite(req.headers)) {
    return json(res, 403, { error: NOT_FROM_SITE });
  }

  // ONE SPELLING PER WALK. The cache is keyed on the whole URL, so "h=3.0",
  // "c=lt", an extra "&x=1" or "from=toString" would each be a fresh, paid
  // model call. Only the exact canonical query is answered. Found in review,
  // 2 Oct 2026.
  const q = req.query || {};
  const keys = Object.keys(q).sort().join(",");
  const country = String(q.c || "");
  const starts = Object.prototype.hasOwnProperty.call(NOW_STARTS, country) ? NOW_STARTS[country] : null;
  // From where the visitor stands (5 Oct 2026): a position on the 200 metre
  // grid, spelled exactly as snapPos spells it, inside the walk's area.
  const here = q.from === HERE;
  const posOk = here && /^-?\d{1,3}\.\d{3}$/.test(String(q.lat || "")) && /^-?\d{1,3}\.\d{3}$/.test(String(q.lon || ""))
    && snapPos(q.lat) === String(q.lat) && snapPos(q.lon) === String(q.lon);
  const start = here
    ? (posOk && starts ? hereStart(country, q.lat, q.lon) : null)
    : starts && Object.prototype.hasOwnProperty.call(starts, String(q.from || "")) ? starts[String(q.from)] : null;
  const hours = /^[0-9]$/.test(String(q.h || "")) ? Number(q.h) : NaN;
  const lang = NOW_LANGS.includes(String(q.lang)) ? String(q.lang) : "";
  const now = new Date();
  // A walk of one kind adds one key with one of a few values, so it is one
  // more spelling per walk and no more. "styles=1" asks instead which kinds
  // fit this start, this length and this half hour (5 Oct 2026), made by the
  // rules alone and cached the same way.
  const style = NOW_STYLES.includes(String(q.style || "")) ? String(q.style) : "";
  const listing = q.styles === "1";
  const base = here ? "c,from,h,lang,lat,lon,slot" : "c,from,h,lang,slot";
  if (keys !== (listing ? `${base},styles` : style ? `${base},style` : base)) return json(res, 400, { error: "Unexpected query." });
  if (here && posOk && !start) return json(res, 400, { error: "Outside the area.", outside: true });
  if (!start || !NOW_HOURS.includes(hours) || !lang) return json(res, 400, { error: "Unknown start, length or language." });
  // ── AND ONE SPELLING OF THE ADDRESS ITSELF ────────────────────────
  // Security review, 3 Oct 2026, finding 6: the check above sorts the keys
  // and reads decoded values, while the CDN keys its cache on the address as
  // sent. "h=3&c=LT..." or "%4Cang" passed the check and missed the cache,
  // a fresh paid call each time. So the raw query must be the exact string
  // NowPlanner builds, in its order and its encoding.
  const raw = String(req.url || "").split("?").slice(1).join("?");
  const canonical = `c=${country}&from=${start.id}&h=${hours}&lang=${lang}${here ? `&lat=${q.lat}&lon=${q.lon}` : ""}&slot=${encodeURIComponent(String(q.slot || ""))}${listing ? "&styles=1" : style ? `&style=${style}` : ""}`;
  if (raw !== canonical) return json(res, 400, { error: "Unexpected query." });
  if (!slotAccepted(String(q.slot || ""), now)) return json(res, 409, { error: "Stale half hour.", slot: slotOf(now) });

  const zone = COUNTRY_PROFILES[country].zone;
  const at = slotDate(String(q.slot));
  const startClock = placeClock(at, zone);
  const budget = hours * 60;
  const margin = start.ship ? SHIP_MARGIN : 0;

  let rows;
  try { rows = await rowsFor(country); }
  catch { return json(res, 503, { error: "Could not read the places just now." }); }

  const weather = await weatherAt(start);
  const all = nowCandidates(rows, { country, zone, now: at });
  const candidates = styleCandidates(all, style, country);
  // The ferry's wait by the month in Klaipėda (walkable.js, FERRIES).
  const month = (() => { try { return Number(new Intl.DateTimeFormat("en", { timeZone: zone, month: "numeric" }).format(at)); } catch { return 0; } })();
  const ctx = { country, start, startClock, budget, margin, wet: weather.wet, temp: weather.temp, weather, style, lang, ferryWait: ferryWait(country, month) };

  if (listing) {
    return json(res, 200, { slot: q.slot, country, from: start.id, hours, styles: stylesThatFit(all, ctx) }, "public, s-maxage=1800, stale-while-revalidate=120");
  }

  let walk = null, made = "rules", refused = false;
  // Every walk the model makes is counted: 30 a day from one address and
  // 1000 for the site. Past either, or with the counter out of reach, the
  // rules make the walk alone. Until 5 Oct 2026 the two fixed starts were not
  // counted, on the grounds that the CDN shares one walk per half hour; the
  // security review that day showed a request with an Authorization header is
  // never cached, so a script could make every call a fresh paid one
  // (finding 1). A walk only reaches this line on a cache miss, so the count
  // is per fresh walk, not per reader.
  const modelAllowed = async () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!serviceKey) return false;
    const got = await takeDaily({
      day: copenhagenDay(new Date()),
      keys: [{ key: visitorKey(req.headers, serviceKey.slice(-16)).replace(/^ai:v:/, "walk:v:"), limit: 30 }, { key: "walk:site", limit: 1000 }],
      supabaseUrl: process.env.SUPABASE_URL || SUPABASE_FALLBACK_URL, serviceKey,
    });
    refused = !got.ok;
    return !!got.ok;
  };
  if (candidates.length && startClock.minutes >= AI_FROM && startClock.minutes < AI_TO && await modelAllowed()) {
    const order = readOrder(await askModel(planPrompt(candidates, ctx)));
    const tried = order ? tidyWalk(withMustSee(order, candidates, ctx), candidates, ctx) : null;
    if (goodWalk(tried, budget)) { walk = tried; made = "ai"; }
  }
  if (!walk) walk = tidyWalk(withMustSee(ruleOrder(candidates, ctx), candidates, ctx), candidates, ctx);
  // The other way round, for half the phones, and what a phone needs to run
  // the walk again when the reader changes a stay or takes a stop out.
  const alt = reversedWalk(walk, candidates, ctx);

  return json(res, 200, {
    slot: q.slot, country, from: start.id, hours, lang, made, style,
    start: { id: start.id, name: start.name, lat: start.lat, lon: start.lon, ship: !!start.ship },
    weather, margin, ...walk,
    alt: alt ? { stops: alt.stops, back: alt.back, deadline: alt.deadline } : null,
    places: placesOf(walk, candidates), clock: startClock, budget,
  // A walk the rules made only because the counter said no is kept for five
  // minutes, not the half hour, so one refusal is not what everybody gets.
  }, refused ? "public, s-maxage=300, stale-while-revalidate=60" : "public, s-maxage=1800, stale-while-revalidate=120");
}
