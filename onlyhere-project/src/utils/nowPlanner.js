// ── "I HAVE X HOURS" ────────────────────────────────────────────────
//
// Oliver, 2 Oct 2026, asking which AI feature to build, and answering "Sure do
// that" to this one: a cruise passenger scans the QR at the terminal, taps how
// long they have, and gets one walk made for that moment. Open now, deals on
// now, the weather, back at the ship with time to spare.
//
// The AI only puts in order what this file hands it. Every place comes from
// Gemlyx's own published rows, every time on the page is worked out here, and
// a plan the model writes that does not fit is cut down or replaced by the
// one these rules make on their own. So the model can make the walk better
// and can never make it wrong: a closed door, a walk out to greater Klaipėda,
// a missed ship.
//
// IMPORTS ONLY FILES THAT IMPORT NOTHING, with their .js extension, because
// api/plan-now.js loads this on the server, where Node cannot follow the
// extensionless imports the rest of src/ uses.
import { kmApart, offTownWalk, acrossWater, WALK_RULES } from "./walkable.js";
import { RIDE_APPS } from "./rideHail.js";
import { COUNTRY_PROFILES } from "./countries.js";
import { dayStart } from "./calendarDay.js";
import { windowOf, timingAt, cleanClock, cleanDays, placeDate } from "./offerClock.js";

// Where a walk starts and ends. Read off Google Maps and OpenStreetMap on
// 2 Oct 2026: the terminal from its Maps listing, the tourist centre from
// Turgaus g. 7.
export const NOW_STARTS = {
  LT: {
    terminal: { id: "terminal", name: "Klaipėda Cruise Ship Terminal", lat: 55.70526, lon: 21.12217, ship: true },
    centre: { id: "centre", name: "Tourist Information Centre, Turgaus g. 7", lat: 55.70837, lon: 21.13358, ship: false },
  },
};

export const NOW_HOURS = [2, 3, 4, 6];
export const NOW_LANGS = ["en", "da", "de", "lt"];

// Everybody leaving in the same half hour gets the same walk, so it is made
// once per half hour per choice and then served from Vercel's cache.
export const SLOT_MINUTES = 30;

// Back at the ship this long before their time is up. Nothing for the
// tourist centre, where nobody sails without them.
export const SHIP_MARGIN = 30;

// Walking: the straight line times a detour factor at 80 metres a minute,
// the same figures busStop.js uses for the walk to a stop.
export const WALK_DETOUR = 1.3;
export const WALK_M_PER_MIN = 80;
export const walkMinutes = (a, b) => Math.max(1, Math.round((kmApart(a, b) * 1000 * WALK_DETOUR) / WALK_M_PER_MIN));

// A Bolt across town: a few minutes to arrive, then about 25 km an hour.
export const RIDE_WAIT = 5;
export const rideMinutes = (a, b) => RIDE_WAIT + Math.max(3, Math.round((kmApart(a, b) * WALK_DETOUR / 25) * 60));

// The half hour a moment falls in, written the way the URL carries it.
export const slotOf = (now = new Date()) => {
  const ms = SLOT_MINUTES * 60 * 1000;
  const d = new Date(Math.floor(now.getTime() / ms) * ms);
  return d.toISOString().slice(0, 16) + "Z";
};
export const slotDate = (slot) => {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})Z$/.exec(String(slot || ""));
  if (!m) return null;
  const d = new Date(`${m[1]}:00Z`);
  return Number.isFinite(d.getTime()) ? d : null;
};
// The server takes this half hour or the last one, nothing else, so the
// cache cannot be walked through by asking for every half hour of the year.
export const slotAccepted = (slot, now = new Date()) => {
  const d = slotDate(slot);
  if (!d) return false;
  return slot === slotOf(now) || slot === slotOf(new Date(now.getTime() - SLOT_MINUTES * 60 * 1000));
};

// ── OPEN AT A GIVEN MINUTE ──────────────────────────────────────────
// Google's weekday lines, "Tuesday: 10:00 – 18:00", "Monday: Closed",
// "Sunday: Open 24 hours", as stored on an entry in __hours. true, false, or
// null for "cannot tell", and null is never read as open or shut: the same
// rule utils/openingHours.js keeps.
const DAY_WORDS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const toMin = (h, m, ampm) => {
  let hh = Number(h);
  if (ampm) { const pm = /p/i.test(ampm); if (hh === 12) hh = pm ? 12 : 0; else if (pm) hh += 12; }
  return hh * 60 + Number(m || 0);
};
export const windowsFor = (lines, day) => {
  const line = (Array.isArray(lines) ? lines : []).map(String).find(l => new RegExp(`^\\s*${DAY_WORDS[day]}\\b`, "i").test(l));
  if (!line) return null;
  const rest = line.replace(/^[^:]*:/, "");
  if (/open 24 hours/i.test(rest)) return [[0, 24 * 60]];
  const raw = [...rest.matchAll(/(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?/gi)]
    .filter(t => t[2] !== undefined || t[3]);
  // Google writes the meridiem once for a range inside one half of the day:
  // "5:00 – 10:00 PM" is 17:00 to 22:00. A start with none takes its end's,
  // unless that would put the start after the end ("11:00 – 2:30 PM").
  const times = raw.map((t, i) => {
    let ampm = t[3];
    if (!ampm && i % 2 === 0 && raw[i + 1]?.[3]) {
      const end = toMin(raw[i + 1][1], raw[i + 1][2], raw[i + 1][3]);
      ampm = toMin(t[1], t[2], raw[i + 1][3]) <= end ? raw[i + 1][3] : "am";
    }
    return toMin(t[1], t[2], ampm);
  });
  if (!times.length) return /closed|lukket|uždaryta/i.test(rest) ? [] : null;
  if (times.length % 2) return null;
  const out = [];
  for (let i = 0; i < times.length; i += 2) {
    let to = times[i + 1];
    if (to <= times[i]) to += 24 * 60;
    out.push([times[i], to]);
  }
  return out;
};
export const openBetween = (lines, day, fromMin, toMinute) => {
  const w = windowsFor(lines, day);
  if (w === null) return null;
  return w.some(([a, b]) => fromMin >= a && toMinute <= b);
};

// ── WHAT IS IN THE RUNNING ──────────────────────────────────────────
const KIND = { free: "Attraction", food: "Food", booking: "Workshop", festival: "Event" };
const STAY = { Attraction: 40, Museum: 55, Food: 60, Workshop: 60, Event: 45 };
const TIER_SCORE = { "Can't Miss Out": 3, "Highly Recommended": 2, "Worth Considering": 1 };
const INDOOR = /museum|muziejus|gallery|galerija|church|bažnyčia|cathedral|aquarium|clock|laikrodžių|exhibition|indoor|café|cafe|restaurant|bakery|\bbar\b/i;
// A name that says outdoors wins over a word that says indoors: Theatre
// Square is a square.
const OUTDOOR = /square|aikštė|park|parkas|beach|paplūdimys|dune|kopa|promenade|quay|krantinė|street|gatvė|sculpture|skulptūr|monument|paminklas|viewpoint/i;

const pointOf = (p) => {
  const lat = Number(p?.__lat ?? p?.lat), lon = Number(p?.__lon ?? p?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
};
const words = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);

// The offer on a row, as the planner needs it: its text, whether its dates
// cover today at the place, and its window.
const offerOf = (raw, today) => {
  if (!raw || typeof raw !== "object" || !String(raw.text || "").trim()) return null;
  const end = dayStart(raw.until);
  if (!end) return null;
  const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  if (endIso < today) return null;
  return { text: words(raw.text, 140), window: windowOf({ days: cleanDays(raw.days), from: cleanClock(raw.from), to: cleanClock(raw.to) }) };
};

// rows: [{ id, type, payload }] as gemlyx_content returns them.
export const nowCandidates = (rows, { country = "LT", zone = "", now = new Date() } = {}) => {
  const today = placeDate(now, zone);
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const p = r?.payload || {};
    const kind = KIND[r?.type];
    if (!kind || !p.name) continue;
    if (String(p.country || "DK").toUpperCase() !== country) continue;
    const at = pointOf(p);
    if (!at) continue;
    // Across the strait needs the ferry, which a walk made for a few hours does
    // not plan around yet.
    if (acrossWater(country, at)) continue;
    if (kind === "Event") {
      const a = dayStart(p.date), b = dayStart(p.dateEnd || p.date);
      const iso = (d) => d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!a || !(iso(a) <= today && iso(b) >= today)) continue;
    }
    const text = `${p.name} ${p.type || ""} ${p.category || ""}`;
    const museum = /museum|muziejus/i.test(text);
    out.push({
      id: `${r.type}:${r.id}`,
      name: words(p.name, 80),
      kind: museum ? "Museum" : kind,
      lat: at.lat, lon: at.lon,
      tier: p.tier || "",
      indoor: kind === "Food" || kind === "Workshop" || (INDOOR.test(text) && !OUTDOOR.test(p.name)),
      hours: Array.isArray(p.__hours?.hours) ? p.__hours.hours : null,
      offer: offerOf(p.__offer, today),
      about: words(p.desc || p.description || p.popularityTag || "", 160),
      stay: STAY[museum ? "Museum" : kind] || 40,
    });
  }
  return out;
};

// ── PUTTING A WALK TOGETHER ─────────────────────────────────────────
//
// `order` is a list of { id, stay?, why? }. Each stop is walked to (or ridden
// to, when the leg leaves the walkable centre), stayed at, and only kept when
// it is open for the whole visit at both ends of the half hour the walk is
// served for, and when the way back still fits. What does not fit is dropped,
// never squeezed.
//
// ── A PARTNER IS PICKED ON MERIT, AND SHOWN AS A PARTNER ────────────
// Oliver, 2 Oct 2026, choosing between partners first and partners on merit:
// "Partners on merit, labelled." So a deal never decides whether a place is in
// the walk, where it goes, or when the walker gets there: the model is not
// told about deals, the rules do not score them, and nobody waits for one to
// start. A place that earns its stop and has a deal on for the whole visit
// shows the deal, marked as a Gemlyx partner. Terms clause 14 and OFFER_NOTE
// promise exactly this, and this is where the promise is kept.
const SPREAD = SLOT_MINUTES;

export const scheduleWalk = (order, candidates, ctx) => {
  const { country = "LT", start, startClock, budget, margin = 0 } = ctx;
  const byId = new Map(candidates.map(c => [c.id, c]));
  const deadline = budget - margin;
  const stops = [];
  let here = start, t = 0, foods = 0;
  const legOf = (a, b) => {
    const far = offTownWalk({ country, from: a, to: b });
    return far ? { minutes: rideMinutes(a, b), ride: true } : { minutes: walkMinutes(a, b), ride: false };
  };
  for (const pick of Array.isArray(order) ? order : []) {
    const c = byId.get(pick?.id);
    if (!c || stops.some(s => s.id === c.id)) continue;
    if (c.kind === "Food" && foods >= Math.max(1, Math.floor(budget / 180))) continue;
    const leg = legOf(here, c);
    const arrive = t + leg.minutes;
    const stay = Math.min(120, Math.max(15, Math.round(Number(pick.stay) || c.stay)));
    // The deal shows only when it is on for the whole of the visit's start,
    // for a walker leaving at either end of the half hour.
    let dealNow = false;
    if (c.offer) {
      const w = c.offer.window;
      const timing = timingAt(w, { day: startClock.day, minutes: startClock.minutes + arrive });
      dealNow = timing === "now" || timing === "always";
      if (dealNow && w && startClock.minutes + arrive + SPREAD >= w.toMin) dealNow = false;
    }
    const leave = arrive + stay;
    // Open for the whole visit, for a walker leaving at the start or the end
    // of the half hour. Unknown hours pass for a square or a park, never for
    // a door that needs to be open.
    if (c.hours) {
      const a = openBetween(c.hours, startClock.day, startClock.minutes + arrive, startClock.minutes + leave);
      const b = openBetween(c.hours, startClock.day, startClock.minutes + arrive + SPREAD, startClock.minutes + leave + SPREAD);
      if (a === false || b === false) continue;
      if ((a === null || b === null) && (c.kind === "Food" || c.kind === "Museum" || c.kind === "Workshop")) continue;
    } else if (c.kind === "Food" || c.kind === "Museum" || c.kind === "Workshop") {
      continue;
    }
    const back = legOf(c, start);
    if (leave + back.minutes > deadline) continue;
    stops.push({
      id: c.id, name: c.name, kind: c.kind, lat: c.lat, lon: c.lon,
      leg: leg.minutes, ride: leg.ride, arrive, leave, stay,
      deal: c.offer && dealNow ? { text: c.offer.text, to: c.offer.window?.to || "" } : null,
      why: words(stripDashes(pick.why), 160),
    });
    if (c.kind === "Food") foods++;
    here = c; t = leave;
  }
  const home = legOf(here, start);
  return { stops, back: { leg: home.minutes, ride: home.ride, at: t + home.minutes }, deadline };
};

// ── THE WALK WITHOUT ANY AI ─────────────────────────────────────────
// What is served when the model is off, slow, or writes something that does
// not survive scheduleWalk. Best first: the tier, indoors when
// it is wet, and lunch when the walk crosses it, weighed against the walk.
export const ruleOrder = (candidates, ctx) => {
  const { start, startClock, budget, wet = false } = ctx;
  const lunch = startClock.minutes < 14 * 60 + 30 && startClock.minutes + budget > 11 * 60 + 30;
  const left = [...candidates];
  const order = [];
  let here = start;
  while (left.length && order.length < 8) {
    let best = null, bestScore = -Infinity;
    for (const c of left) {
      const score = (TIER_SCORE[c.tier] || 0) + (wet && c.indoor ? 2 : 0) + (wet && !c.indoor ? -1 : 0)
        + (c.kind === "Food" ? (lunch && !order.some(o => o.kind === "Food") ? 3 : -3) : 0)
        - walkMinutes(here, c) / 8;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    order.push({ id: best.id, kind: best.kind });
    left.splice(left.indexOf(best), 1);
    here = best;
  }
  return order;
};

// ── WHAT THE MODEL IS GIVEN ─────────────────────────────────────────
const LANG_NAMES = { en: "English", da: "Danish", de: "German", lt: "Lithuanian" };
const HHMM = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(((m % 60) + 60) % 60).padStart(2, "0")}`;

export const planPrompt = (candidates, ctx) => {
  const { country = "LT", start, startClock, budget, margin = 0, wet = false, temp = null, lang = "en" } = ctx;
  const list = candidates.slice(0, 40).map(c => {
    const far = offTownWalk({ country, from: start, to: c }) ? " | OUTSIDE THE WALKABLE CENTRE, needs a Bolt" : ` | ${walkMinutes(start, c)} min walk from the start`;
    return `${c.id} | ${c.name} | ${c.kind}${c.tier ? ` | ${c.tier}` : ""}${c.indoor ? " | indoors" : ""}${far}${c.about ? ` | ${c.about}` : ""}`;
  }).join("\n");
  return `You plan one walk for a visitor in ${COUNTRY_PROFILES[country]?.name || country} who has ${budget} minutes, starting now at ${HHMM(startClock.minutes)} local time from ${start.name}${margin ? `, and who must be back there ${margin} minutes before their time is up (they are off a cruise ship)` : ""}.
Weather now: ${wet ? "wet, so favour places indoors" : "dry"}${temp !== null ? `, ${Math.round(temp)} °C` : ""}.

PLACES YOU MAY USE, and no others. Use the id exactly as written:
${list}

RULES
- Pick an order of 3 to 7 places that makes a good walk: few backtracks, the best places first, one meal around lunch time if the walk crosses it.
- Opening hours and walking times are checked after you, so a place you pick that does not fit is dropped. Do not pad the list.
- ${(WALK_RULES[country] || "").replace(/\n/g, " ")}
- For each place, one short sentence on why it is in the walk, in ${LANG_NAMES[lang] || "English"}, in plain words, with no dashes of any kind and no exclamation marks. Name nothing that is not in its own line above.

Answer with JSON only, in this shape:
{"order":[{"id":"free:12","stay":40,"why":"..."}]}`;
};

// The model's answer, read leniently: the first JSON object in the text.
export const readOrder = (text) => {
  const s = String(text || "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    const j = JSON.parse(s.slice(a, b + 1));
    return Array.isArray(j?.order) ? j.order.filter(o => o && typeof o.id === "string").slice(0, 10) : null;
  } catch { return null; }
};

// No dashes from any model, his standing rule: a dash between words becomes a
// comma, and one inside a number range stays.
export const stripDashes = (v) => String(v || "")
  .replace(/(\d)\s*[–—-]\s*(\d)/g, "$1-$2")
  .replace(/\s*[—–]\s*/g, ", ")
  .replace(/\s+-\s+/g, ", ")
  .replace(/,\s*,/g, ",")
  .trim();

// A walk worth serving: at least two places, or one when time is short.
export const goodWalk = (walk, budget) => walk && walk.stops.length >= (budget <= 120 ? 1 : 2);

// The Maps link for the whole walk, on foot, start to start.
export const walkMapsUrl = (start, stops) => {
  const pt = (p) => `${p.lat},${p.lon}`;
  const way = stops.slice(0, 9).map(pt).join("|");
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${pt(start)}&destination=${pt(start)}${way ? `&waypoints=${encodeURIComponent(way)}` : ""}`;
};

export const rideApp = (country) => RIDE_APPS[String(country || "").toUpperCase()] || null;
