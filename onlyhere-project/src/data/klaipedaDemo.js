// ── KLAIPĖDA, THE FIRST PLACE OUTSIDE DENMARK ───────────────────────
//
// Oliver, 29 Sep 2026. He worked for Klaipėda's tourism centre and wants to
// show them what Gemlyx would add to klaipedatravel.lt: not another list of
// places, which their site already has, but ready-made trips a visitor can
// follow. He chose two: a cruise stop of four hours, and a full day.
//
// WRITTEN BY HAND, NOT BY THE PIPELINE. The pipeline assumes Denmark all the
// way down (DKK, kommuner, Danish sources, Copenhagen time), and rebuilding
// it is only worth doing if the tourism centre wants this. So the demo is
// data in this file, rendered by pages/KlaipedaDemo.jsx, and nothing in the
// Danish app reads it.
//
// EVERY FACT HERE CAME OFF A PAGE, and the page is on the stop as `source`.
// Hours and prices were read on 29 Sep 2026 from each place's own website,
// or from klaipedatravel.lt where the place has none. Where the two
// disagreed, the place's own site won. Walking times are estimates and are
// the first thing the local check should correct.
//
// ── THE ROMAN NUMERALS, READ ONE DAY OFF ────────────────────────────
// Oliver, 3 Oct 2026: "Castle museum is closed monday you know". It is. The
// museum writes its days in Roman numerals, and in Lithuania I is Monday:
// "II-VI" in winter is Tuesday to Saturday and "III-VII" in summer is
// Wednesday to Sunday. The first reading, on 29 Sep, had each one a day
// early (Monday to Friday, Tuesday to Sunday), which put the castle open on
// winter Mondays and shut on winter Saturdays, the opposite of the truth on
// both. klaipedatravel.lt's Wednesday to Sunday for the summer was right all
// along. Read again off mlimuziejus.lt on 3 Oct 2026, for all three museums.

// Moved on 29 Sep 2026 from /lithuania/klaipeda, which is now Klaipėda's real
// town page (Phase 2 of LITHUANIA_PLAN_29SEP.md). A literal path, so it wins
// over the /lithuania/:townSlug route.
export const KLAIPEDA_DEMO_PATH = "/lithuania/trips";
export const CHECKED_ON = "2026-09-29";

// ── OPENING HOURS AS RULES, SO THE PAGE CAN ANSWER FOR A DAY ─────────
//
// Days are 0 Sunday to 6 Saturday, as Date#getDay counts them. A season is
// a month-day window, inclusive; the first season whose window holds the date
// wins, and one with no window is the rest of the year.
const LM_MUSEUMS = {
  seasons: [
    { from: "06-15", to: "09-16", days: { 3: "10:00", 4: "10:00", 5: "10:00", 6: "10:00", 0: "10:00" }, close: "18:00" },
    { days: { 2: "10:00", 3: "10:00", 4: "10:00", 5: "10:00", 6: "10:00" }, close: "18:00" },
  ],
  lastEntry: "Last tickets 17:30",
  holidays: true,
};

const CLOCK_MUSEUM = {
  seasons: [
    { hours: { 2: ["10:00", "18:00"], 3: ["10:00", "18:00"], 4: ["12:00", "20:00"], 5: ["10:00", "18:00"], 6: ["10:00", "18:00"], 0: ["10:00", "16:00"] } },
  ],
  lastEntry: "Last entry 30 minutes before closing",
  holidays: true,
};

const TOURIST_CENTRE = {
  seasons: [
    { hours: { 1: ["09:00", "18:00"], 2: ["09:00", "18:00"], 3: ["09:00", "18:00"], 4: ["09:00", "18:00"], 5: ["09:00", "18:00"], 6: ["10:00", "16:00"], 0: ["09:00", "16:00"] } },
  ],
};

export const ALWAYS_OPEN = { always: true };

// ── THE PLACES ──────────────────────────────────────────────────────
export const PLACES = {
  terminal: {
    name: "Klaipėda Cruise Terminal",
    kind: "Start",
    maps: "Klaipėda Cruise Terminal",
    hours: ALWAYS_OPEN,
    note: "Ships dock right by the Old Town, so there is no tender and no bus to catch. The walk in is flat.",
    source: "https://cruisinginthewake.com/ports/klaipeda.html",
  },
  touristCentre: {
    name: "Tourist Information Centre",
    kind: "Info",
    address: "Turgaus g. 7",
    maps: "Turgaus g. 7, Klaipėda",
    hours: TOURIST_CENTRE,
    note: "Pick up a map and ask what is on in town today.",
    source: "https://klaipedatravel.lt/en/structure-and-contacts/",
  },
  theatreSquare: {
    name: "Theatre Square and Ännchen of Tharau",
    kind: "Square",
    address: "Teatro aikštė",
    maps: "Teatro aikštė, Klaipėda",
    hours: ALWAYS_OPEN,
    note: "The statue in the middle is Ännchen of Tharau, the girl from Simon Dach's 17th century love poem. She first stood here in 1912, went missing in the war, and a new one was put back in 1989. On 23 March 1939 Hitler spoke from the balcony of the theatre behind her. She is one of the talking sculptures: scan the QR code on the sign next to her and she tells her story.",
    source: "https://klaipedatravel.lt/en/place/ta/",
  },
  blackGhost: {
    name: "The Black Ghost",
    kind: "Sculpture",
    maps: "Black Ghost sculpture, Klaipėda",
    hours: ALWAYS_OPEN,
    note: "A dark figure rising out of the water of the old castle harbour. The legend says he appeared to a castle guard in the 16th century with a warning about grain and firewood. Another talking sculpture, so have your phone ready.",
    source: "https://klaipedatravel.lt/en/place/jv/",
  },
  castleMuseum: {
    name: "Castle Museum",
    kind: "Museum",
    address: "Priešpilio g. 2",
    maps: "Klaipėda Castle Museum, Priešpilio g. 2",
    hours: LM_MUSEUMS,
    price: "Adults €6 · students, pupils and seniors €3",
    stay: "45 min",
    note: "On the site of the old castle. Archaeological finds, the town's old seals and scale models of the castle and the town, which make the Old Town outside easier to read.",
    source: "https://www.mlimuziejus.lt/en/ticket-prices/",
    hoursSource: "https://www.mlimuziejus.lt/en/information-for-visitors/",
  },
  historyMuseum: {
    name: "History Museum of Lithuania Minor",
    kind: "Museum",
    address: "Didžioji Vandens g. 2",
    maps: "Didžioji Vandens g. 2, Klaipėda",
    hours: LM_MUSEUMS,
    price: "Adults €4 · students, pupils and seniors €2",
    stay: "45 min",
    note: "The story of Lithuania Minor, the Lithuanian part of old Prussia that Klaipėda, then called Memel, belonged to. The combined ticket for this, the Blacksmith's Museum and the Castle Museum is €9 for adults, cheaper than two of them bought apart.",
    source: "https://www.mlimuziejus.lt/en/ticket-prices/",
    hoursSource: "https://www.mlimuziejus.lt/en/information-for-visitors/",
  },
  friedrich: {
    name: "Friedrich Passage",
    kind: "Lunch",
    address: "Tiltų g. 26A",
    maps: "Friedricho pasažas, Tiltų g. 26A, Klaipėda",
    hours: { varies: "Each restaurant keeps its own hours" },
    stay: "1 hour",
    note: "A lane of cafés and restaurants off Tiltų street, the easiest place in the Old Town to sit down for a proper meal. Lithuanian dishes worth trying: cepelinai, the big potato dumplings, and šaltibarščiai, cold pink beetroot soup, when it is warm.",
    source: "https://www.mzirafos.lt/vieta/friedricho-pasazas/",
  },
  meridianas: {
    name: "Meridianas",
    kind: "Landmark",
    maps: "Meridianas, Klaipėda",
    hours: ALWAYS_OPEN,
    note: "The sailing ship moored by Biržos Bridge is the town's symbol. Built in Turku in 1948, it trained cadets of the Klaipėda maritime school until 1967. Best seen from the bridge.",
    source: "https://klaipedatravel.lt/en/place/sailing-vessel-meridianas/",
  },
  clockMuseum: {
    name: "Clock and Watch Museum",
    kind: "Museum",
    address: "Liepų g. 12",
    maps: "Clock and Watch Museum, Liepų g. 12, Klaipėda",
    hours: CLOCK_MUSEUM,
    price: "€5 · reduced €2.50",
    stay: "1 hour",
    note: "Rare clocks by old European masters, from the Renaissance to modern times, in a 19th century villa with a sundial garden outside. Better than it sounds, and a good one for rain.",
    source: "https://www.lndm.lt/lm/paslaugos-ir-darbo-laikas/",
  },
  sculpturePark: {
    name: "Sculpture Park",
    kind: "Park",
    maps: "Klaipėda Sculpture Park",
    hours: ALWAYS_OPEN,
    price: "Free",
    stay: "45 min",
    note: "116 modern sculptures by 67 Lithuanian artists. The park was the town's main cemetery from 1820 to 1959, which is worth knowing as you walk through it.",
    source: "https://en.wikipedia.org/wiki/Klaip%C4%97da_Sculpture_Park",
  },
  oldFerry: {
    name: "Old Ferry to Smiltynė",
    kind: "If you have time",
    maps: "Senoji perkėla, Klaipėda",
    hours: { varies: "Timetable changes by season" },
    note: "Ten minutes across the water and you are on the Curonian Spit. Check today's departures on keltas.lt before you go, because the timetable changes with the season.",
    source: "https://keltas.lt/senosios-perkelos-tvarkarastis/",
  },
};

// ── THE TRIPS ───────────────────────────────────────────────────────
//
// A cruise stop has no clock time of its own, because every ship arrives at a
// different hour, so the cruise trip counts from stepping off: "+0:15". The
// day trip has a clock, because a day has one.
export const TRIPS = [
  {
    id: "cruise",
    title: "Four hours off the ship",
    lead: "The Old Town, two talking sculptures, the castle and lunch, all on foot, and back with time to spare.",
    clock: "relative",
    stops: [
      { place: "terminal", at: 0 },
      { walk: "10 to 15 min walk" },
      { place: "touristCentre", at: 15 },
      { walk: "2 min walk" },
      { place: "theatreSquare", at: 25, stay: "20 min" },
      { walk: "5 min walk" },
      { place: "blackGhost", at: 50, stay: "10 min" },
      { walk: "3 min walk" },
      { place: "castleMuseum", at: 65 },
      { walk: "8 min walk" },
      { place: "friedrich", at: 120 },
      { walk: "5 min walk" },
      { place: "meridianas", at: 185, stay: "10 min" },
      { walk: "10 to 15 min walk" },
      { place: "terminal", at: 210, back: true },
    ],
    closing: "That puts you back at the ship half an hour before the four hours are up. Your ship's all aboard time is the one that counts, so work back from it.",
  },
  {
    id: "day",
    title: "A day in Klaipėda",
    lead: "Old Town in the morning, the castle before lunch, then across the river for clocks, sculptures and, if you have the energy, the ferry to the Spit.",
    clock: "day",
    stops: [
      { place: "touristCentre", at: "10:00", stay: "10 min" },
      { walk: "2 min walk" },
      { place: "theatreSquare", at: "10:15", stay: "15 min" },
      { walk: "5 min walk" },
      { place: "historyMuseum", at: "10:35" },
      { walk: "5 min walk" },
      { place: "castleMuseum", at: "11:30" },
      { walk: "2 min walk" },
      { place: "blackGhost", at: "12:20", stay: "10 min" },
      { walk: "8 min walk" },
      { place: "friedrich", at: "12:45" },
      { walk: "8 min walk" },
      { place: "meridianas", at: "14:00", stay: "10 min" },
      { walk: "12 min walk" },
      { place: "clockMuseum", at: "14:30" },
      { walk: "5 min walk" },
      { place: "sculpturePark", at: "15:45" },
      { walk: "20 min walk" },
      { place: "oldFerry", at: "17:00", optional: true },
    ],
    closing: "Buy the combined museum ticket at the first museum. It covers the History Museum and the Castle Museum on this trip, and the Blacksmith's Museum if you want a third.",
  },
];

// ── WHAT A LOCAL WOULD TELL YOU ─────────────────────────────────────
export const LOCAL_TIPS = [
  { title: "Euro and cards", text: "Lithuania uses the euro, and cards work almost everywhere, including small cafés." },
  { title: "Buses", text: "Buy tickets in the e.Ticket Klaipėda app. It is cheaper than paying the driver." },
  { title: "Taxis", text: "Bolt works in Klaipėda, so you can order a car in the app and see the price first." },
  { title: "Talking sculptures", text: "Over ten sculptures and sights around town tell their own story when you scan the QR code beside them. Bring your phone and headphones." },
];

// ── IS IT OPEN ON THAT DAY ──────────────────────────────────────────
//
// Pure, so the tests can ask it about any date. Returns
// { open: bool|null, text } where null means "we cannot say", which is the
// honest answer for a lane of restaurants with ten different owners.
const md = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const openOn = (hours, date) => {
  if (!hours || hours.always) return { open: true, text: "Always open" };
  if (hours.varies) return { open: null, text: hours.varies };
  const key = md(date);
  const season = (hours.seasons || []).find(s => !s.from || (key >= s.from && key <= s.to));
  if (!season) return { open: null, text: "Check the hours" };
  const dow = date.getDay();
  let span = null;
  if (season.hours) span = season.hours[dow] || null;
  else if (season.days && season.days[dow]) span = [season.days[dow], season.close];
  if (!span) return { open: false, text: `Closed on ${DAY_NAMES[dow]}s${(hours.seasons || []).length > 1 ? " at this time of year" : ""}` };
  return { open: true, text: `Open ${span[0]} to ${span[1]}` };
};

export const dayName = (date) => DAY_NAMES[date.getDay()];

// The date of the next given weekday on or after `from`, so picking "Monday"
// asks about the coming Monday, in the season it falls in.
export const nextWeekday = (from, dow) => {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7));
  return d;
};

// Today as it is in Klaipėda, which is an hour ahead of Denmark. A visitor
// reading this at 23:30 in Copenhagen is already on tomorrow there.
export const todayInKlaipeda = (now = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const [y, m, d] = parts.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  } catch { /* fall through */ }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// "+1:05" for the cruise trip, the clock time for the day trip.
export const stopTime = (trip, at) => {
  if (trip.clock !== "relative") return String(at);
  const h = Math.floor(at / 60), m = at % 60;
  return `+${h}:${String(m).padStart(2, "0")}`;
};

export const mapsSearchUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

// The whole trip as one walking route. Google takes up to nine waypoints on
// this link, and both trips fit, with the ferry left off because it is a
// maybe.
export const mapsRouteUrl = (trip) => {
  const pts = trip.stops.filter(s => s.place && !s.optional).map(s => PLACES[s.place].maps);
  const dedup = pts.filter((p, i) => i === 0 || p !== pts[i - 1]);
  const origin = dedup[0], destination = dedup[dedup.length - 1];
  const waypoints = dedup.slice(1, -1).slice(0, 9);
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints.length ? `&waypoints=${encodeURIComponent(waypoints.join("|"))}` : ""}`;
};
