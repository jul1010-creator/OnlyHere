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
import { kmApart, offTownWalk, acrossWater, WALK_RULES, ferryOf, ferryWait } from "./walkable.js";
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

// ── OR FROM WHERE THE VISITOR STANDS ────────────────────────────────
// Oliver, 5 Oct 2026: "also, make from my position as well." The phone's
// position, snapped to a grid of about 200 metres, so everybody on the same
// corner in the same half hour shares one walk from the cache, and the
// address never carries a position more exact than a block. Only inside the
// area a walk is made for: Klaipėda and what is around it (Smiltynė,
// Melnragė, Giruliai), 12 km from Theatre Square.
export const HERE = "here";
export const POS_GRID = 0.002;
export const snapPos = (v) => (Math.round(Number(v) / POS_GRID) * POS_GRID).toFixed(3);
export const NOW_AREAS = { LT: { lat: 55.7078, lon: 21.1316, km: 12 } };
export const inNowArea = (country, p) => {
  const a = NOW_AREAS[String(country || "").toUpperCase()];
  const lat = Number(p?.lat), lon = Number(p?.lon);
  return !!a && Number.isFinite(lat) && Number.isFinite(lon) && kmApart(a, { lat, lon }) <= a.km;
};
// The start a position makes, or null when it is not one a walk is made from.
export const hereStart = (country, lat, lon) => {
  const p = { lat: Number(snapPos(lat)), lon: Number(snapPos(lon)) };
  return inNowArea(country, p) ? { id: HERE, name: "Where you are", lat: p.lat, lon: p.lon, ship: false } : null;
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

// ── ACROSS THE STRAIT ON THE OLD FERRY ──────────────────────────────
// Oliver, 4 Oct 2026, from the work list: a walk may take the ferry to
// Smiltynė. A leg that crosses is on foot to the landing, the longest wait for
// the next ferry, the crossing, and on foot from the other landing (FERRIES in
// walkable.js says where each figure comes from). Two places on the far side
// are a walk between them. A crossing that would also need a Bolt at one end
// is not planned at all: that is a trip, not a walk.
const NOT_A_LEG = 9999;
export const crossesWater = (country, a, b) => !!ferryOf(country) && acrossWater(country, a) !== acrossWater(country, b);
const waitOf = (ctx) => (Number.isFinite(Number(ctx?.ferryWait)) && ctx?.ferryWait !== null ? Number(ctx.ferryWait) : ferryWait(ctx?.country || "LT"));
export const legBetween = (a, b, ctx = {}) => {
  const country = ctx.country || "LT";
  const slow = Number(ctx.walkFactor) || 1;
  const plain = (x, y) => {
    if (acrossWater(country, x) && acrossWater(country, y)) return { minutes: Math.round(walkMinutes(x, y) * slow), ride: false };
    return offTownWalk({ country, from: x, to: y })
      ? { minutes: rideMinutes(x, y), ride: true }
      : { minutes: Math.round(walkMinutes(x, y) * slow), ride: false };
  };
  if (!crossesWater(country, a, b)) return plain(a, b);
  const ferry = ferryOf(country);
  const back = acrossWater(country, a);
  const to = plain(a, back ? ferry.far : ferry.near);
  const from = plain(back ? ferry.near : ferry.far, b);
  if (to.ride || from.ride) return { minutes: NOT_A_LEG, ride: false };
  const wait = waitOf(ctx);
  return { minutes: to.minutes + wait + ferry.crossing + from.minutes, ride: false, ferry: { walkTo: to.minutes, wait, crossing: ferry.crossing, walkFrom: from.minutes } };
};
// The ferry as a distance, for the planner's sums that count kilometres: the
// wait and the crossing, as the walk they take the time of.
const ferryKm = (ctx) => ((waitOf(ctx) || 0) + (ferryOf(ctx?.country || "LT")?.crossing || 0)) * WALK_M_PER_MIN / 1000 / WALK_DETOUR;

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
const KIND = { free: "Attraction", food: "Food", booking: "Workshop", festival: "Event", nightlife: "Nightlife" };
const STAY = { Attraction: 40, Museum: 55, Food: 60, Workshop: 60, Event: 45, Nightlife: 50 };
const TIER_SCORE = { "Can't Miss Out": 3, "Highly Recommended": 2, "Worth Considering": 1 };
const INDOOR = /museum|muziejus|gallery|galerija|church|bažnyčia|cathedral|aquarium|clock|laikrodžių|exhibition|indoor|café|cafe|restaurant|bakery|\bbar\b/i;
// A name that says outdoors wins over a word that says indoors: Theatre
// Square is a square.
const OUTDOOR = /square|aikštė|park|parkas|beach|paplūdimys|dune|kopa|promenade|quay|krantinė|street|gatvė|sculpture|skulptūr|monument|paminklas|viewpoint/i;

// Out on open water, where a storm wind is felt first: the harbour, the quays,
// the bridges, the beach. Read off the name and the description.
const EXPOSED = /harbou?r|uostas|quay|krantin|beach|paplūdim|pier|molas|bridge|tiltas|seafront|waterfront|lagoon|marios|spit|nerija/i;

// ── THE OLD TOWN ────────────────────────────────────────────────────
// Oliver, 2 Oct 2026: "Shall there also be a 'walk around in old town'?" A
// box around Klaipėda's Old Town as OpenStreetMap draws it, between the Danė,
// the castle and the old harbour, read on 2 Oct 2026. Generous by a street on
// each side, so a café on the edge is not left out by a few metres.
export const OLD_TOWN = {
  LT: { s: 55.7035, n: 55.7108, w: 21.1255, e: 21.1415 },
};
export const inOldTown = (country, p) => {
  const b = OLD_TOWN[String(country || "").toUpperCase()];
  return !!b && !!p && p.lat >= b.s && p.lat <= b.n && p.lon >= b.w && p.lon <= b.e;
};
// The Old Town walk takes the places inside the box, no museums, and short
// stops: a walk to look around, not a walk to go inside.
export const STROLL = "oldtown";
export const STROLL_STAY = 20;
export const strollCandidates = (candidates, country) =>
  candidates.filter(c => inOldTown(country, c) && c.kind !== "Museum" && c.kind !== "Nightlife");

// ── WALKS OF ONE KIND ───────────────────────────────────────────────
// Oliver, 5 Oct 2026, of a six hour walk made at 03:20 that had only Melnragė
// Park and Danė Square in it: "Perhaps different categories?", then "anything
// possible in Klaipeda. But Only if the timing fits", and only that category
// in the walk. So a walk can be of one kind, and a kind is offered only when
// the rules can make a walk of it from that start, for that time, in that
// half hour (styleFits). The Old Town walk is one of them.
export const NOW_STYLES = [STROLL, "food", "museums", "outdoors", "workshops", "events", "nightlife"];
export const styleCandidates = (candidates, style, country) => {
  const list = Array.isArray(candidates) ? candidates : [];
  switch (style) {
    case STROLL: return strollCandidates(list, country);
    case "food": return list.filter(c => c.kind === "Food");
    case "museums": return list.filter(c => c.kind === "Museum");
    case "outdoors": return list.filter(c => c.kind === "Attraction" && !c.indoor);
    case "workshops": return list.filter(c => c.kind === "Workshop");
    case "events": return list.filter(c => c.kind === "Event");
    case "nightlife": return list.filter(c => c.kind === "Nightlife");
    // The everyday walk leaves the bars to their own: a pub is not a sight.
    default: return list.filter(c => c.kind !== "Nightlife");
  }
};

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
    // Across the strait needs the ferry. Kept where the country has one
    // (legBetween times it), left out where it does not.
    const across = acrossWater(country, at);
    if (across && !ferryOf(country)) continue;
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
      ...(across ? { across: true } : {}),
      tier: p.tier || "",
      indoor: kind === "Food" || kind === "Workshop" || (INDOOR.test(text) && !OUTDOOR.test(p.name)),
      // The name and the first sentence only. A square described further down
      // as "a few minutes from the harbour" is not on the harbour, and a storm
      // should not take it out. Found in review, 2 Oct 2026.
      exposed: EXPOSED.test(`${p.name} ${String(p.desc || p.description || "").split(/[.!?]\s/)[0]}`),
      hours: Array.isArray(p.__hours?.hours) ? p.__hours.hours : null,
      offer: offerOf(p.__offer, today),
      about: words(p.desc || p.description || p.popularityTag || "", 160),
      // A row can say how long a visit takes (__stay, in minutes): the
      // Klaipėda examples do, so the Black Ghost is a quarter of an hour and
      // not the forty minutes of a museum (7 Oct 2026).
      stay: (Number.isFinite(Number(p.__stay)) && Number(p.__stay) >= 10 && Number(p.__stay) <= 120 ? Math.round(Number(p.__stay)) : 0) || STAY[museum ? "Museum" : kind] || 40,
      // The place's own photo, for its pin on the walk map (6 Oct 2026).
      ...(/^https:\/\/\S+$/i.test(String(p.photo || "").trim()) ? { photo: String(p.photo).trim().slice(0, 600) } : {}),
    });
  }
  return out;
};

// ── WHAT THE WEATHER CHANGES ────────────────────────────────────────
// Oliver, 2 Oct 2026, asking to see "how it transforms during snow", "during
// rain", "when very windy". The model is told the weather and picks for it,
// and these rules then hold whatever it picked:
//   rain   every stop outdoors is kept short
//   snow   the same, and walking takes longer, on slush and ice
//   storm  a place out on open water is left out altogether
// `weather` is { wet, snow, wind } as api/plan-now.js reads it from MET Norway,
// wind in metres a second. 14 m/s is a near gale on the Beaufort scale: the
// point where walking out along a quay stops being pleasant.
export const STORM_WIND = 14;
export const weatherRules = (weather = {}) => {
  const snow = !!weather.snow;
  const wet = snow || !!weather.wet;
  const storm = Number(weather.wind) >= STORM_WIND;
  return {
    walk: snow ? 1.3 : storm ? 1.1 : 1,
    outdoorMax: wet ? 15 : storm ? 20 : 0,
    dropExposed: storm,
  };
};
// The same rules in words, for a page that shows what changed.
export const weatherChanges = (weather = {}) => {
  const r = weatherRules(weather);
  return [
    r.walk > 1 ? `Walking takes ${Math.round((r.walk - 1) * 100)}% longer` : "",
    r.outdoorMax ? `Outdoor stops kept to ${r.outdoorMax} minutes` : "",
    r.dropExposed ? "Places out on open water left out" : "",
  ].filter(Boolean);
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
  const { country = "LT", start, startClock, budget, margin = 0, weather = null, style = "" } = ctx;
  const rules = weatherRules(weather || { wet: ctx.wet });
  const byId = new Map(candidates.map(c => [c.id, c]));
  const deadline = budget - margin;
  const stops = [];
  let here = start, t = 0, foods = 0;
  const legOf = (a, b) => legBetween(a, b, { ...ctx, country, walkFactor: rules.walk });
  for (const pick of Array.isArray(order) ? order : []) {
    const c = byId.get(pick?.id);
    if (!c || stops.some(s => s.id === c.id)) continue;
    // A food walk is several stops of food; any other walk has one meal in it.
    if (c.kind === "Food" && foods >= (style === "food" ? Math.max(2, Math.floor(budget / 75)) : Math.max(1, Math.floor(budget / 180)))) continue;
    if (rules.dropExposed && c.exposed && !c.indoor) continue;
    const leg = legOf(here, c);
    const arrive = t + leg.minutes;
    let stay = Math.min(120, Math.max(15, Math.round(Number(pick.stay) || c.stay)));
    if (rules.outdoorMax && !c.indoor) stay = Math.min(stay, rules.outdoorMax);
    if (style === STROLL) stay = Math.min(stay, STROLL_STAY);
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
      if ((a === null || b === null) && (c.kind === "Food" || c.kind === "Museum" || c.kind === "Workshop" || c.kind === "Nightlife")) continue;
    } else if (c.kind === "Food" || c.kind === "Museum" || c.kind === "Workshop" || c.kind === "Nightlife") {
      continue;
    }
    const back = legOf(c, start);
    if (leave + back.minutes > deadline) continue;
    stops.push({
      id: c.id, name: c.name, kind: c.kind, lat: c.lat, lon: c.lon,
      leg: leg.minutes, ride: leg.ride, ...(leg.ferry ? { ferry: leg.ferry } : {}), arrive, leave, stay,
      deal: c.offer && dealNow ? { text: c.offer.text, to: c.offer.window?.to || "" } : null,
      tier: c.tier || "",
      why: words(stripDashes(pick.why), 160),
    });
    if (c.kind === "Food") foods++;
    here = c; t = leave;
  }
  const home = legOf(here, start);
  return { stops, back: { leg: home.minutes, ride: home.ride, ...(home.ferry ? { ferry: home.ferry } : {}), at: t + home.minutes }, deadline };
};

// ── THE WALK WITHOUT ANY AI ─────────────────────────────────────────
// What is served when the model is off, slow, or writes something that does
// not survive scheduleWalk. Best first: the tier, indoors when
// it is wet, and lunch when the walk crosses it, weighed against the walk.
export const ruleOrder = (candidates, ctx) => {
  const { start, startClock, budget } = ctx;
  const wet = !!(ctx.wet || ctx.weather?.wet || ctx.weather?.snow);
  const storm = weatherRules(ctx.weather || {}).dropExposed;
  const lunch = startClock.minutes < 14 * 60 + 30 && startClock.minutes + budget > 11 * 60 + 30;
  const left = [...candidates];
  const order = [];
  let here = start;
  while (left.length && order.length < 8) {
    let best = null, bestScore = -Infinity;
    for (const c of left) {
      const score = (TIER_SCORE[c.tier] || 0) + (wet && c.indoor ? 2 : 0) + (wet && !c.indoor ? -1 : 0)
        + (c.kind === "Food" ? (lunch && !order.some(o => o.kind === "Food") ? 3 : -3) : 0)
        + (storm && c.exposed && !c.indoor ? -5 : 0)
        - (walkMinutes(here, c) + (crossesWater(ctx.country || "LT", here, c) ? waitOf(ctx) + ferryOf(ctx.country || "LT").crossing : 0)) / 8;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    order.push({ id: best.id, kind: best.kind });
    left.splice(left.indexOf(best), 1);
    here = best;
  }
  return order;
};

// ── WHAT THE MODEL IS GIVEN ─────────────────────────────────────────
// What a walk of one kind is for, said to the model in one sentence.
const STYLE_ASK = {
  [STROLL]: "The visitor wants an easy walk around the Old Town: streets, squares, the river and somewhere to sit, no museums, short stops.",
  food: "The visitor wants a walk for food and drink: cafés, bakeries and a meal, with short walks between them.",
  museums: "The visitor wants a walk of museums.",
  outdoors: "The visitor wants to be outdoors: squares, parks, the river, the sea and the sculptures.",
  workshops: "The visitor wants to make or try something: the workshops.",
  events: "The visitor wants what is on today: the events.",
  nightlife: "The visitor wants a night out: bars and live music.",
};
const LANG_NAMES = { en: "English", da: "Danish", de: "German", lt: "Lithuanian" };
const HHMM = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(((m % 60) + 60) % 60).padStart(2, "0")}`;

export const planPrompt = (candidates, ctx) => {
  const { country = "LT", start, startClock, budget, margin = 0, temp = null, lang = "en", style = "" } = ctx;
  const w = ctx.weather || { wet: ctx.wet };
  const sky = w.known === false ? "unknown, the forecast could not be read, so mix places indoors and out"
    : w.snow ? "snowing, so favour places indoors, keep outdoor stops short and expect slow walking"
    : w.wet ? "wet, so favour places indoors" : "dry";
  const gale = Number(w.wind) >= STORM_WIND ? ", and a storm wind, so keep away from the harbour, the quays and anywhere out on open water" : "";
  const list = candidates.slice(0, 40).map(c => {
    const cross = crossesWater(country, start, c) ? legBetween(start, c, ctx) : null;
    const far = cross ? (cross.ferry ? ` | ACROSS THE WATER, by ${ferryOf(country).name}: about ${cross.minutes} min from the start with the wait, the same back, so keep these together` : " | ACROSS THE WATER, out of reach on this walk")
      : offTownWalk({ country, from: start, to: c }) ? " | OUTSIDE THE WALKABLE CENTRE, needs a Bolt" : ` | ${walkMinutes(start, c)} min walk from the start`;
    return `${c.id} | ${c.name} | ${c.kind}${c.tier ? ` | ${c.tier}` : ""}${c.indoor ? " | indoors" : ""}${c.exposed && !c.indoor ? " | out on open water" : ""}${far}${c.about ? ` | ${c.about}` : ""}`;
  }).join("\n");
  return `You plan one walk for a visitor in ${COUNTRY_PROFILES[country]?.name || country} who has ${budget} minutes, starting now at ${HHMM(startClock.minutes)} local time from ${start.name}${margin ? `, and who must be back there ${margin} minutes before their time is up (they are off a cruise ship)` : ""}.
Weather now: ${sky}${gale}${temp !== null ? `, ${Math.round(temp)} °C` : ""}.${STYLE_ASK[style] ? `\n${STYLE_ASK[style]}` : ""}

PLACES YOU MAY USE, and no others. Use the id exactly as written:
${list}

RULES
- Pick an order of 3 to 7 places that makes a good walk: few backtracks, the best places first, one meal around lunch time if the walk crosses it.
- Opening hours and walking times are checked after you, so a place you pick that does not fit is dropped. Do not pad the list.
- ${(WALK_RULES[country] || "").replace(/\n/g, " ")}
- A place marked Can't Miss Out belongs in the walk whenever it is open and the time allows.
- Write each sentence about the place itself, never about where it falls in the walk ("first", "to finish", "on the way back"): half the visitors walk it the other way round.
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

// Whether a walk of this kind can be made right now: the rules alone, no
// model, make it from the places of that kind, and it must be a walk worth
// serving. A kind with nothing open, or nothing that fits the time and the
// way back, is not offered.
export const styleFits = (candidates, style, ctx) => {
  const list = styleCandidates(candidates, style, ctx.country);
  if (!list.length) return false;
  const c = { ...ctx, style };
  return !!goodWalk(scheduleWalk(ruleOrder(list, c), list, c), c.budget);
};
export const stylesThatFit = (candidates, ctx) => NOW_STYLES.filter(st => styleFits(candidates, st, ctx));

// The Maps link for the whole walk, on foot, start to start.
export const walkMapsUrl = (start, stops) => {
  const pt = (p) => `${p.lat},${p.lon}`;
  const way = stops.slice(0, 9).map(pt).join("|");
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${pt(start)}&destination=${pt(start)}${way ? `&waypoints=${encodeURIComponent(way)}` : ""}`;
};

export const rideApp = (country) => RIDE_APPS[String(country || "").toUpperCase()] || null;

// ── CAN'T MISS OUT ──────────────────────────────────────────────────
// Oliver, 2 Oct 2026: "perhaps include the 'cannot miss out on' feature.
// Because missing out the castle museum is absolute sadness." A place the
// Studio rated Can't Miss Out goes into the order whichever way the order was
// made, at the point where it adds the least walking, before the rules check
// it. The rules still decide: a closed door is still left out, and the page
// then says when it opens next rather than leaving it out in silence.
export const MUST_SEE = "Can't Miss Out";
// One on a walk of two hours or less, so a short walk is not all museum.
const mustSeeMax = (budget) => (budget <= 120 ? 1 : 2);
export const withMustSee = (order, candidates, ctx) => {
  const { country = "LT", start, budget = 180 } = ctx;
  const out = (Array.isArray(order) ? order : []).filter(o => o && o.id);
  const byId = new Map(candidates.map(c => [c.id, c]));
  const missing = candidates
    .filter(c => c.tier === MUST_SEE && !out.some(o => o.id === c.id) && !offTownWalk({ country, from: start, to: c }))
    .sort((a, b) => walkMinutes(start, a) - walkMinutes(start, b))
    .slice(0, Math.max(0, mustSeeMax(budget) - candidates.filter(c => c.tier === MUST_SEE && out.some(o => o.id === c.id)).length));
  for (const c of missing) {
    const pts = [start, ...out.map(o => byId.get(o.id) || start), start];
    let best = 0, bestCost = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const cost = walkMinutes(pts[i], c) + walkMinutes(c, pts[i + 1]) - walkMinutes(pts[i], pts[i + 1]);
      if (cost < bestCost) { bestCost = cost; best = i; }
    }
    out.splice(best, 0, { id: c.id });
  }
  return out;
};

// When a place opens next after a { day, minutes }, within the coming week:
// { day, minutes } or null.
export const nextOpen = (lines, { day, minutes }) => {
  for (let d = 0; d < 8; d++) {
    const w = windowsFor(lines, (day + d) % 7);
    if (!w) return null;
    const first = w.map(([a]) => a).filter(a => d > 0 || a > minutes).sort((a, b) => a - b)[0];
    if (first !== undefined) return { day: (day + d) % 7, minutes: first };
  }
  return null;
};

// ── NO WALKING THE SAME STREET TWICE ────────────────────────────────
// Oliver, 3 Oct 2026, of the centre walk opened in Google Maps: "we're going
// in the right direction. But it looks messy". It went from the centre to
// Theatre Square, down to the castle, back up to the ship and back to the
// centre, so the same streets were walked twice. Whoever made the order, the
// model or the rules, it is then made shorter, start to start, two ways until
// neither helps: two legs that cross are uncrossed, and a place sitting out of
// the way is moved to where it adds the least. The new order is used only
// when the rules keep every place the first one kept and no meal moves more
// than MEAL_SHIFT minutes, so an opening hour or a band starting at 20:00
// still wins over a tidier line on the map.
// A crossing counts as the walk its wait and crossing take, so tidying the
// order never sends a walker over the strait and back twice.
const loopKm = (start, pts, ctx = null) => {
  const step = (a, b) => kmApart(a, b) + (ctx && crossesWater(ctx.country || "LT", a, b) ? ferryKm(ctx) : 0);
  let km = 0, here = start;
  for (const p of pts) { km += step(here, p); here = p; }
  return km + step(here, start);
};

// `accept`, when given, is asked of every shorter order before it is taken,
// so a step that would break the walk is passed over and the search goes on
// to the next one, instead of the whole tidier order being thrown away at the
// end. Oliver, 7 Oct 2026, of the walk off the ship: "wouldn't theatre square
// be more convinient to walk to? Is that the closest one to #1 and #2?" It
// was: Castle, amber, Theatre Square walked about a hundred metres more than
// Castle, Theatre Square, amber, and the only tidier order found moved the
// lunch, so none was used.
export const untangle = (order, candidates, ctx, accept = null) => {
  const { start } = ctx;
  const byId = new Map(candidates.map(c => [c.id, c]));
  let list = (Array.isArray(order) ? order : []).filter(o => o && byId.has(o.id));
  // Two places or fewer make the same loop either way round.
  if (list.length < 3) return list;
  const length = (l) => loopKm(start, l.map(o => byId.get(o.id)), ctx);
  let best = length(list);
  for (let round = 0, better = true; better && round < 50; round++) {
    better = false;
    const tries = [];
    for (let i = 0; i < list.length - 1; i++) {
      for (let j = i + 1; j < list.length; j++) {
        // Uncross: the places from i to j walked the other way.
        if (!(i === 0 && j === list.length - 1)) tries.push([...list.slice(0, i), ...list.slice(i, j + 1).reverse(), ...list.slice(j + 1)]);
      }
    }
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        // Move one place from i to j.
        const l = list.slice();
        const [o] = l.splice(i, 1);
        l.splice(j, 0, o);
        tries.push(l);
      }
    }
    for (const l of tries) {
      const km = length(l);
      if (km < best - 0.005 && (!accept || accept(l))) { best = km; list = l; better = true; }
    }
  }
  return list;
};

export const MEAL_SHIFT = 45;
// Lunch 11:30 to 14:30 and dinner 17:30 to 20:30, at the place.
export const mealTime = (m) => (m >= 690 && m <= 870) || (m >= 1050 && m <= 1230);
// At most 8 places, 40,320 orders, measured in a few milliseconds.
export const EXACT_MAX = 8;
export const REVERSE_SLACK = 1.03;
const orders = function* (list) {
  if (list.length <= 1) { yield list; return; }
  for (let i = 0; i < list.length; i++) {
    const rest = [...list.slice(0, i), ...list.slice(i + 1)];
    for (const tail of orders(rest)) yield [list[i], ...tail];
  }
};
const walkedKm = (w, start, ctx = null) => loopKm(start, w.stops, ctx);

export const tidyWalk = (order, candidates, ctx) => {
  const first = scheduleWalk(order, candidates, ctx);
  // Whether a reordered walk is as good as the first one: every place kept,
  // no meal moved more than MEAL_SHIFT minutes, and a partner's offer the
  // first order reached in time still reached. A tidier line is not worth a
  // deal the walker would have had.
  const holds = (second) => {
    const kept = new Map(second.stops.map(s => [s.id, s]));
    const keepsAll = first.stops.every(s => kept.has(s.id));
    // Only a meal at a mealtime is held in place. A café at 14:00 is not
    // lunch, and holding it there made one random walk 37% longer than it
    // had to be (7 Oct 2026).
    const atMeal = (s) => mealTime(ctx.startClock.minutes + s.arrive);
    const mealStays = keepsAll && first.stops.every(s => s.kind !== "Food" || !atMeal(s) || Math.abs(kept.get(s.id).arrive - s.arrive) <= MEAL_SHIFT);
    return mealStays && first.stops.every(s => !s.deal || !!kept.get(s.id)?.deal);
  };
  // ── A WALK OF A FEW PLACES IS SOLVED OUTRIGHT ──────────────────────
  // Oliver, 7 Oct 2026: "Try generate different random places, and figure
  // out if it makes the trip convinient or bugs out ... saving time is
  // incredibly important." 400 random walks found the tidying above 2%
  // longer than the shortest on average, and one in twenty more than 10%
  // longer: uncrossing and moving one place at a time can get stuck. Up to
  // EXACT_MAX places, every order of the places the walk kept is tried, and
  // the shortest the rules accept whole is the walk.
  if (first.stops.length >= 3 && first.stops.length <= EXACT_MAX) {
    const byId = new Map(candidates.map(c => [c.id, c]));
    const kept = first.stops.map(s => (Array.isArray(order) ? order.find(o => o && o.id === s.id) : null) || { id: s.id, stay: s.stay, why: s.why });
    let best = first, bestKm = walkedKm(first, ctx.start, ctx);
    for (const p of orders(kept)) {
      const km = loopKm(ctx.start, p.map(o => byId.get(o.id)), ctx);
      if (km >= bestKm - 0.005) continue;
      const w = scheduleWalk(p, candidates, ctx);
      if (w.stops.length === first.stops.length && holds(w)) { best = w; bestKm = km; }
    }
    // Half of a ship walks each walk the other way round (reversedWalk), so
    // within 3% of the shortest, an order that also works backwards wins.
    // Without it the shortest walk off the ship had no other way round: the
    // smokehouse came before it opened.
    if (best.stops.length && reversedWalk(best, candidates, ctx)) return best;
    let both = null, bothKm = Infinity;
    for (const p of orders(kept)) {
      const km = loopKm(ctx.start, p.map(o => byId.get(o.id)), ctx);
      if (km > bestKm * REVERSE_SLACK || km >= bothKm) continue;
      const w = scheduleWalk(p, candidates, ctx);
      if (w.stops.length === first.stops.length && holds(w) && reversedWalk(w, candidates, ctx)) { both = w; bothKm = km; }
    }
    return both || best;
  }
  const tidy = untangle(order, candidates, ctx, (l) => holds(scheduleWalk(l, candidates, ctx)));
  const same = tidy.length === (order || []).length && tidy.every((o, i) => o.id === order[i].id);
  if (same) return first;
  const second = scheduleWalk(tidy, candidates, ctx);
  return holds(second) && walkedKm(second, ctx.start, ctx) < walkedKm(first, ctx.start, ctx) - 0.005 ? second : first;
};

// ── THE SAME PLACES THE OTHER WAY ROUND ─────────────────────────────
// Oliver, 2 Oct 2026, of the QR codes: "Can you imagine 30 people use on, and
// they walk on top of oneanother". Everybody in a half hour gets the same
// places, so the walk is made twice, once each way round, and each phone keeps
// one of the two. Half a ship goes clockwise and half the other way, so they
// share each place at different times and meet only once on the way. The
// second one costs no model call: it is the first one's order, reversed, run
// through the same rules.
export const reversedWalk = (walk, candidates, ctx) => {
  const order = [...(walk?.stops || [])].reverse().map(s => ({ id: s.id, stay: s.stay, why: s.why }));
  const alt = scheduleWalk(order, candidates, ctx);
  return alt.stops.length === (walk?.stops || []).length ? alt : null;
};

// ── THE READER'S OWN CHANGES ────────────────────────────────────────
// Oliver, 2 Oct 2026: "If we make a time for how long we want to be each
// place, then make able to remove one from their listing." The walk is run
// again from the places it was made of, with the reader's stays and without
// the places they took out, so every time and every open door is checked
// again. Nothing is added: a stop that no longer fits is dropped by the same
// rule as before, and the page will not lengthen a stay that would do that.
export const STAY_STEP = 10;
export const replanWalk = (walk, { stays = {}, removed = [] } = {}, ctx) => {
  const order = (walk?.stops || []).filter(s => !removed.includes(s.id)).map(s => ({ id: s.id, stay: stays[s.id] ?? s.stay, why: s.why }));
  return scheduleWalk(order, walk?.places || [], ctx);
};
// Whether a stay can grow by a step without pushing another stop out.
export const canStayLonger = (walk, edits, id, ctx) => {
  const now = replanWalk(walk, edits, ctx);
  const s = now.stops.find(x => x.id === id);
  if (!s || s.stay + STAY_STEP > 120) return false;
  const next = replanWalk(walk, { ...edits, stays: { ...(edits?.stays || {}), [id]: s.stay + STAY_STEP } }, ctx);
  // And only when the stay grows at all: in rain, or on the Old Town walk, an
  // outdoor stop is held at its cap, and a + that does nothing is a broken
  // button. Found in review, 2 Oct 2026.
  const grown = next.stops.find(x => x.id === id);
  return next.stops.length === now.stops.length && !!grown && grown.stay > s.stay;
};

// What the reader's phone needs to run those again: each kept place as the
// rules read it.
export const placesOf = (walk, candidates) => {
  const ids = new Set((walk?.stops || []).map(s => s.id));
  return candidates.filter(c => ids.has(c.id)).map(c => ({ id: c.id, name: c.name, kind: c.kind, lat: c.lat, lon: c.lon, tier: c.tier, indoor: c.indoor, exposed: c.exposed, hours: c.hours, offer: c.offer, stay: c.stay, ...(c.photo ? { photo: c.photo } : {}) }));
};
