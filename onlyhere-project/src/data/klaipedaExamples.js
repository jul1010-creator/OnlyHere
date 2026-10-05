// ── KLAIPĖDA, A PAGE OF EXAMPLES FOR THE TOURISM CENTRE ─────────────
//
// Oliver, 2 Oct 2026: "Can you make a set of examples on the page that I can
// show for the tourism center?", and then "Guides and Offers alike. Make up
// anything. Be clever. Have ideas that are realistic. So not 40% discount on
// everything.."
//
// THE PLACES ARE REAL, THE PARTNERS ARE MADE UP. The museums, the square, the
// sculptures and the park are the ones on data/klaipedaDemo.js, with the hours
// and facts checked there, and coordinates read off OpenStreetMap on 2 Oct
// 2026. Every business with an offer is invented, and the page says so at the
// top and on each one, so nobody walks down Žvejų street looking for them.
//
// THE WALKS ARE MADE BY THE REAL RULES. Each example is a moment (a weekday, a
// time, a start, how long, the weather) and an order, written here the way the
// model would write it. The order is then run through the same nowCandidates
// and scheduleWalk the live planner uses, so the times, the closed doors left
// out and the offers shown or not shown are the code's, not this file's.
//
// THE OFFERS ARE THE KIND A SMALL PLACE CAN AFFORD. Something extra in a quiet
// hour, a price for a thing they already do, a service a visitor needs. No
// percentage off everything.

import { NOW_STARTS, SHIP_MARGIN, MUST_SEE, STROLL, STORM_WIND, nowCandidates, tidyWalk, windowsFor, withMustSee, nextOpen, reversedWalk, placesOf, styleCandidates, weatherRules } from "../utils/nowPlanner";
import { fingerprint, proseOf } from "../utils/entryTranslate";
import { ferryWait } from "../utils/walkable";

export const KLAIPEDA_EXAMPLES_PATH = "/lithuania/examples";
// The side for cafés, restaurants and shops, apart from the visitor's.
// Oliver, 5 Oct 2026: "even the owner of the restaurant is seeing the same as
// the customers and reverse.. we need a seperation.. because obviously the
// tourist is not gonna care about how many people are coming in thursday with
// the ship.. so seperate it."
export const KLAIPEDA_BUSINESS_PATH = "/lithuania/business";

// Google's weekday lines, the shape the planner reads from a published row.
const WEEK_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const lines = (spans) => WEEK_NAMES.map((d, i) => spans[i] ? `${d}: ${spans[i][0]} to ${spans[i][1]}` : `${d}: Closed`);
const every = (from, to) => ({ 0: [from, to], 1: [from, to], 2: [from, to], 3: [from, to], 4: [from, to], 5: [from, to], 6: [from, to] });

// Winter hours, from 17 September, the season these examples fall in.
//
// ── THE ROMAN NUMERALS, READ ONE DAY OFF ────────────────────────────
// Oliver, 3 Oct 2026: "Castle museum is closed monday you know". It is. The
// museum writes its days in Roman numerals, and in Lithuania I is Monday:
// "II-VI" in winter is Tuesday to Saturday and "III-VII" in summer is
// Wednesday to Sunday. The first reading, on 29 Sep, had each one a day
// early, which put the castle open on winter Mondays and shut on winter
// Saturdays. Read again off mlimuziejus.lt on 3 Oct 2026, for the Castle
// Museum, the History Museum of Lithuania Minor and the Blacksmith's Museum.
const LM_WINTER = lines({ 2: ["10:00", "18:00"], 3: ["10:00", "18:00"], 4: ["10:00", "18:00"], 5: ["10:00", "18:00"], 6: ["10:00", "18:00"] });
const CLOCK = lines({ 2: ["10:00", "18:00"], 3: ["10:00", "18:00"], 4: ["12:00", "20:00"], 5: ["10:00", "18:00"], 6: ["10:00", "18:00"], 0: ["10:00", "16:00"] });

// An offer runs until a date, like one set in the Studio.
const UNTIL = "2027-12-31";

// ── THE PARTNERS, ALL MADE UP ───────────────────────────────────────
// `street` only, never a house number, so no real door is pointed at.
export const EXAMPLE_PARTNERS = [
  {
    key: "bakery", type: "food", name: "Kepyklėlė Rūta", what: "Bakery café", street: "Turgaus g.",
    lat: 55.70870, lon: 21.13390,
    hours: lines({ ...every("08:00", "18:00"), 0: ["09:00", "15:00"] }),
    offer: { text: "Free refill of filter coffee with any pastry", days: [1, 2, 3, 4, 5], from: "14:00", to: "16:00" },
    idea: "Their quiet hour, filled.",
  },
  {
    key: "fish", type: "food", name: "Rūkykla Marios", what: "Smokehouse kitchen", street: "Žvejų g.",
    lat: 55.70890, lon: 21.13120,
    hours: lines(every("11:00", "22:00")),
    offer: { text: "Lunch of the day with a glass of kvass, €9", days: [1, 2, 3, 4, 5], from: "12:00", to: "15:00" },
    idea: "A fixed lunch price, the thing a passenger with three hours wants to know.",
  },
  {
    key: "amber", type: "booking", name: "Gintaro dirbtuvė Lašas", what: "Amber workshop", street: "Kurpių g.",
    lat: 55.70850, lon: 21.13260,
    hours: lines({ 2: ["10:00", "17:00"], 3: ["10:00", "17:00"], 4: ["10:00", "17:00"], 5: ["10:00", "17:00"], 6: ["10:00", "17:00"], 0: ["11:00", "16:00"] }),
    offer: { text: "Polish a raw piece of Baltic amber yourself in 20 minutes and keep it, €6" },
    idea: "Something to do, not a discount: twenty minutes and a souvenir they made.",
  },
  {
    key: "tea", type: "food", name: "Arbatinė Debesis", what: "Tea room", street: "Tiltų g.",
    lat: 55.70720, lon: 21.13650,
    hours: lines(every("10:00", "20:00")),
    offer: { text: "A pot of herbal tea for two at the price of one cup", days: [6, 0], from: "11:00", to: "14:00" },
    idea: "Weekend mornings, when the room is half empty.",
  },
  {
    key: "beer", type: "food", name: "Alaus baras Inkaras", what: "Beer bar", street: "Daržų g.",
    lat: 55.70640, lon: 21.13900,
    hours: lines({ 1: ["16:00", "00:00"], 2: ["16:00", "00:00"], 3: ["16:00", "00:00"], 4: ["16:00", "00:00"], 5: ["14:00", "02:00"], 6: ["14:00", "02:00"], 0: ["14:00", "22:00"] }),
    offer: { text: "Three Lithuanian beers, 0.1 l each, for the price of a large one", days: [1, 2, 3, 4, 5], from: "16:00", to: "19:00" },
    idea: "A tasting, so a visitor tries three local breweries instead of one.",
  },
  {
    key: "post", type: "free", name: "Atvirukų krautuvėlė", what: "Postcard shop", street: "Tomo g.",
    lat: 55.70760, lon: 21.13390,
    hours: lines({ ...every("10:00", "18:00"), 0: ["11:00", "16:00"] }),
    offer: { text: "Write a postcard at our table and we post it for you, stamp included" },
    idea: "A service. The visitor leaves with nothing to carry and the post office found for them.",
  },
  {
    key: "jazz", type: "booking", name: "Rūsys", what: "Jazz cellar", street: "Sukilėlių g.",
    lat: 55.70800, lon: 21.13550,
    hours: lines({ 3: ["18:00", "01:00"], 4: ["18:00", "01:00"], 5: ["18:00", "01:00"], 6: ["18:00", "01:00"] }),
    offer: { text: "No cover charge before 21:00, live music from 20:00", days: [5, 6], from: "18:00", to: "21:00" },
    idea: "The early hour sold on the music, so the room is not empty when the band starts.",
  },
  // These two never fit a short walk, so they are only in the list of offers.
  {
    key: "bike", type: "booking", name: "Dviračių nuoma Vėjas", what: "Bike hire", street: "Naujoji Uosto g.",
    lat: 55.70600, lon: 21.12500, inWalks: false,
    hours: lines(every("09:00", "19:00")),
    offer: { text: "Two hours with helmet and lock, €8. Hand the bike back at the cruise terminal" },
    idea: "Takes away the one worry: getting back to the ship on time.",
  },
  {
    key: "bags", type: "free", name: "Bagažinė", what: "Luggage room", street: "Danės g.",
    lat: 55.70950, lon: 21.13700, inWalks: false,
    hours: lines(every("08:00", "21:00")),
    offer: { text: "Leave a bag while you walk, €3 a bag for the day" },
    idea: "For the people between a hotel and a late bus or ferry.",
  },
];

// ── THE REAL PLACES ─────────────────────────────────────────────────
const REAL = [
  { key: "castle", type: "free", name: "Castle Museum", lat: 55.70592, lon: 21.12891, hours: LM_WINTER, tier: "Can't Miss Out" },
  { key: "history", type: "free", name: "History Museum of Lithuania Minor", lat: 55.70734, lon: 21.13471, hours: LM_WINTER, tier: "Worth Considering" },
  { key: "clock", type: "free", name: "Clock and Watch Museum", lat: 55.71221, lon: 21.13416, hours: CLOCK, tier: "Highly Recommended" },
  { key: "ghost", type: "free", name: "The Black Ghost", lat: 55.70660, lon: 21.12682, tier: "Highly Recommended", desc: "A dark figure rising out of the water of the old castle harbour." },
  { key: "theatre", type: "free", name: "Theatre Square", lat: 55.70780, lon: 21.13163, tier: "Can't Miss Out" },
  { key: "meridianas", type: "free", name: "Meridianas", lat: 55.71034, lon: 21.13491, tier: "Highly Recommended", desc: "The sailing ship moored by Biržos Bridge." },
  { key: "friedrich", type: "free", name: "Friedrich Passage", lat: 55.70699, lon: 21.13789, tier: "Worth Considering", desc: "A lane of cafés and restaurants off Tiltų street." },
  { key: "sculpture", type: "free", name: "Sculpture Park", lat: 55.71690, lon: 21.14016, tier: "Highly Recommended" },
  { key: "dane", type: "free", name: "Danė Square", lat: 55.71149, lon: 21.13744, tier: "Worth Considering" },
];

// The rows as gemlyx_content would return them, so the planner reads these
// exactly as it reads published places.
export const exampleRows = () => [
  ...REAL.map(p => ({ id: p.key, type: p.type, payload: { name: p.name, country: "LT", __lat: p.lat, __lon: p.lon, tier: p.tier, ...(p.desc ? { desc: p.desc } : {}), ...(p.hours ? { __hours: { hours: p.hours } } : {}) } })),
  ...EXAMPLE_PARTNERS.filter(p => p.inWalks !== false).map(p => ({
    id: p.key, type: p.type,
    payload: { name: p.name, country: "LT", __lat: p.lat, __lon: p.lon, __hours: { hours: p.hours }, __offer: { ...p.offer, until: UNTIL } },
  })),
];

export const isExamplePartner = (id) => EXAMPLE_PARTNERS.some(p => id === `${p.type}:${p.key}`);

// ── FOUR MOMENTS ────────────────────────────────────────────────────
// `at` is a real date in October 2026, Klaipėda time, so the season and the
// weekday are the ones the hours were checked for. `why` is what the model
// would write; everything else on the card is worked out by the rules.
export const EXAMPLE_WALKS = [
  {
    id: "tuesday", chip: "Off the ship",
    title: "Off the ship, four hours",
    moment: "Tuesday 10:30, dry",
    at: "2026-10-13T10:30", from: "terminal", hours: 4, wet: false,
    order: [
      { id: "free:ghost", stay: 15, why: "Five minutes from the gangway, rising out of the old castle harbour." },
      { id: "free:castle", stay: 40, why: "The model of the old town in here makes the streets outside easier to read." },
      { id: "booking:amber", stay: 25, why: "Twenty minutes with a piece of Baltic amber, and you take it home." },
      { id: "free:theatre", stay: 15, why: "Ännchen of Tharau in the middle. Scan the sign and she tells her story." },
      { id: "food:fish", stay: 40, why: "Fish smoked that morning, on Fishermen's Street." },
      { id: "free:meridianas", stay: 15, why: "The town's ship, best seen from the bridge." },
    ],
  },
  {
    id: "saturday", chip: "Wet Saturday",
    title: "A wet Saturday, six hours",
    moment: "Saturday 11:00, raining",
    at: "2026-10-17T11:00", from: "terminal", hours: 6, wet: true,
    order: [
      { id: "free:castle", stay: 40, why: "The castle site and its finds." },
      { id: "free:ghost", stay: 15, why: "Worth the rain for a few minutes. He looks better wet." },
      { id: "free:theatre", stay: 15, why: "Ännchen of Tharau, quickly, under an umbrella." },
      { id: "food:tea", stay: 40, why: "Somewhere warm while the worst of the shower passes." },
      { id: "free:post", stay: 20, why: "Write home from a dry table." },
      { id: "free:clock", stay: 60, why: "Clocks from the Renaissance on, and the best room in town for a wet afternoon." },
      { id: "free:meridianas", stay: 15, why: "The town's ship, moored on the Danė." },
      { id: "booking:amber", stay: 25, why: "Twenty minutes with a piece of Baltic amber, and you take it home." },
      { id: "food:fish", stay: 50, why: "Smoked fish at a long table, a short walk from the ship." },
    ],
  },
  {
    id: "thursday", chip: "From the centre",
    title: "From the tourist centre, two hours",
    moment: "Thursday 14:00, dry",
    at: "2026-10-15T14:00", from: "centre", hours: 2, wet: false,
    order: [
      { id: "food:bakery", stay: 20, why: "Coffee a few doors up the street from the centre." },
      { id: "free:theatre", stay: 15, why: "Ännchen of Tharau in the middle. Scan the sign and she tells her story." },
      { id: "free:castle", stay: 40, why: "The model of the old town in here makes the streets outside easier to read." },
      { id: "free:meridianas", stay: 15, why: "The town's ship, best seen from the bridge." },
    ],
  },
  {
    id: "friday", chip: "Friday evening",
    title: "A Friday evening, four hours",
    moment: "Friday 17:00, dry",
    at: "2026-10-16T17:00", from: "centre", hours: 4, wet: false,
    order: [
      { id: "free:theatre", stay: 15, why: "The square as the Old Town lights come on." },
      { id: "free:ghost", stay: 15, why: "He is at his best after dark." },
      { id: "food:beer", stay: 60, why: "Three local breweries in one sitting." },
      { id: "booking:jazz", stay: 120, why: "A brick cellar, and the band starts at 20:00." },
    ],
  },
  {
    // Oliver, 3 Oct 2026: "Castle museum is closed monday you know..
    // friday is definetely the lively part of the week where one can grab a
    // beer, but monday is literally dead silent". The same morning off the
    // ship as Tuesday's, on the day the museums are shut: the rules leave them
    // out and say when they open, and the walk is made of what is open.
    id: "monday", chip: "A quiet Monday",
    title: "A quiet Monday, four hours",
    moment: "Monday 10:30, dry",
    at: "2026-10-12T10:30", from: "terminal", hours: 4, wet: false,
    order: [
      { id: "free:ghost", stay: 15, why: "Five minutes from the gangway, rising out of the old castle harbour." },
      { id: "free:castle", stay: 40, why: "The model of the old town in here makes the streets outside easier to read." },
      { id: "free:theatre", stay: 15, why: "Ännchen of Tharau in the middle. Scan the sign and she tells her story." },
      { id: "free:post", stay: 20, why: "Write one home and they post it." },
      { id: "food:fish", stay: 45, why: "Fish smoked that morning, on Fishermen's Street." },
      { id: "free:clock", stay: 45, why: "Clocks from the Renaissance on, in a villa across the river." },
      { id: "free:sculpture", stay: 25, why: "116 sculptures in what was the town's cemetery until 1959." },
      { id: "free:meridianas", stay: 15, why: "The town's ship, best seen from the bridge." },
    ],
  },
  {
    // Oliver, 2 Oct 2026: "Shall there also be a 'walk around in old town'?"
    id: "oldtown", chip: "Old Town only",
    title: "Just the Old Town, two hours",
    moment: "Sunday 11:00, dry",
    at: "2026-10-18T11:00", from: "centre", hours: 2, wet: false, style: STROLL,
    order: [
      { id: "food:bakery", stay: 20, why: "A coffee to carry, a few doors up the street." },
      { id: "free:theatre", stay: 15, why: "Ännchen of Tharau in the middle of the square." },
      { id: "free:post", stay: 15, why: "Write one home and they post it." },
      { id: "booking:amber", stay: 20, why: "Look in at the bench where the amber is polished." },
      { id: "free:friedrich", stay: 15, why: "The lane of cafés off Tiltų street." },
      { id: "free:meridianas", stay: 15, why: "The town's ship on the Danė." },
    ],
  },
];

// ── ONE MORNING, FOUR KINDS OF WEATHER ──────────────────────────────
// Oliver, 2 Oct 2026: "this is how it transforms during snow", "during rain",
// "when very windy". The same Tuesday morning off the ship, in each. The order
// is what the model writes once it is told the weather; the rules in
// weatherRules (utils/nowPlanner.js) then shorten, slow and leave out on their
// own, and the page lists what they did.
const TUESDAY = { at: "2026-10-13T10:30", from: "terminal", hours: 4 };
export const WEATHER_WALKS = [
  { ...TUESDAY, id: "dry", label: "Dry", title: "A dry morning", moment: "Tuesday 10:30, dry, 11 °C", weather: { wet: false, snow: false, wind: 4 },
    order: EXAMPLE_WALKS[0].order },
  { ...TUESDAY, id: "rain", label: "Rain", title: "Rain all morning", moment: "Tuesday 10:30, rain, 9 °C", weather: { wet: true, snow: false, wind: 6 },
    order: [
      { id: "free:castle", stay: 40, why: "Indoors and dry, with the town model to read." },
      { id: "free:history", stay: 45, why: "Dry inside, and the story of Memel and Lithuania Minor." },
      { id: "booking:amber", stay: 25, why: "Twenty minutes at a warm bench with a piece of amber." },
      { id: "free:theatre", stay: 15, why: "Ännchen of Tharau, quickly, under an umbrella." },
      { id: "food:fish", stay: 45, why: "Lunch somewhere warm, close to the ship." },
    ] },
  { ...TUESDAY, id: "snow", label: "Snow", title: "Snow on the ground", moment: "Tuesday 10:30, snow, minus 3 °C", weather: { wet: true, snow: true, wind: 5 },
    order: [
      { id: "free:ghost", stay: 15, why: "Snow on the dark water of the castle harbour, for a few minutes." },
      { id: "free:castle", stay: 45, why: "Inside and warm, with the town model to read." },
      { id: "free:history", stay: 45, why: "Indoors again, with the story of Memel and Lithuania Minor." },
      { id: "free:theatre", stay: 20, why: "Ännchen of Tharau with snow on her shoulders." },
      { id: "food:fish", stay: 45, why: "Hot soup and smoked fish before the walk back." },
    ] },
  { ...TUESDAY, id: "storm", label: "Storm wind", title: "A storm off the Baltic", moment: "Tuesday 10:30, wind 17 m/s, 8 °C", weather: { wet: false, snow: false, wind: 17 },
    order: [
      { id: "free:ghost", stay: 15, why: "Rising out of the castle harbour." },
      { id: "free:castle", stay: 40, why: "Out of the wind, with the town model to read." },
      { id: "free:history", stay: 45, why: "Out of the wind again, with the story of Memel." },
      { id: "booking:amber", stay: 25, why: "Twenty minutes at the bench with a piece of amber." },
      { id: "free:theatre", stay: 15, why: "Sheltered by the theatre and the houses around it." },
      { id: "food:fish", stay: 40, why: "Lunch on Fishermen's Street." },
      { id: "free:meridianas", stay: 15, why: "The town's ship on the Danė." },
    ] },
];

// Klaipėda's weather point, the one the weather card uses (data/mapShapes.js).
export const KLAIPEDA_SKY = { lat: 55.7033, lon: 21.1443 };
const clockOf = (iso) => {
  try { return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Vilnius" }); } catch { return ""; }
};
export const nowSkyWords = (w) => [
  Number.isFinite(Number(w?.temp)) && w?.temp !== null ? `${Math.round(Number(w.temp))} °C` : "",
  w?.snow ? "snow" : w?.wet ? "rain" : "dry",
  `wind ${Math.round(Number(w?.wind) || 0)} m/s`,
].filter(Boolean).join(", ");
// The Tuesday morning, in today's weather. The order comes from the weather
// example nearest to it; the weather itself is today's.
export const walkForNow = (w) => {
  const base = Number(w?.wind) >= STORM_WIND ? "storm" : w?.snow ? "snow" : w?.wet ? "rain" : "dry";
  const b = WEATHER_WALKS.find(x => x.id === base) || WEATHER_WALKS[0];
  const at = clockOf(w?.at);
  return {
    ...b, id: "now", label: "Right now", title: "In Klaipėda's weather right now",
    moment: `Tuesday 10:30, in the weather forecast for Klaipėda${at ? ` at ${at}` : ""}: ${nowSkyWords(w)}`,
    weather: { wet: !!w?.wet, snow: !!w?.snow, wind: Math.round(Number(w?.wind) || 0) },
  };
};

// ── GUIDES IN FOUR LANGUAGES ────────────────────────────────────────
// What a published entry reads like, in the reader's language. The three
// museums and the park say only what data/klaipedaDemo.js checked. The fourth
// is a partner's own page, made up like the partner.
export const GUIDE_LANGS = ["en", "lt", "de", "da"];
export const GUIDE_LANG_NAMES = { en: "English", lt: "Lietuvių", de: "Deutsch", da: "Dansk" };
export const GUIDE_LABELS = {
  en: { find: "Gemlyx find", tip: "Good to know", offer: "Gemlyx partner", example: "Example", open: "Open the page", page: "Example page", madeUp: "Example page · made-up business" },
  lt: { find: "Gemlyx atradimas", tip: "Verta žinoti", offer: "Gemlyx partneris", example: "Pavyzdys", open: "Atverti puslapį", page: "Puslapio pavyzdys", madeUp: "Puslapio pavyzdys · išgalvotas verslas" },
  de: { find: "Gemlyx-Fund", tip: "Gut zu wissen", offer: "Gemlyx-Partner", example: "Beispiel", open: "Seite öffnen", page: "Beispielseite", madeUp: "Beispielseite · erfundenes Geschäft" },
  da: { find: "Gemlyx-fund", tip: "Godt at vide", offer: "Gemlyx-partner", example: "Eksempel", open: "Åbn siden", page: "Eksempelside", madeUp: "Eksempelside · opdigtet virksomhed" },
};

export const EXAMPLE_GUIDES = [
  {
    id: "town", page: "town", name: "Klaipėda", meta: { en: "Port town · Lithuania", lt: "Uostamiestis · Lietuva", de: "Hafenstadt · Litauen", da: "Havneby · Litauen" },
    about: {
      en: "A port town on the Baltic, with a half-timbered Old Town and the Curonian Spit a short ferry ride away.",
      lt: "Uostamiestis prie Baltijos jūros su fachverkiniais senamiesčio namais. Kuršių nerija vos už trumpos kelionės keltu.",
      de: "Eine Hafenstadt an der Ostsee mit einer Altstadt aus Fachwerkhäusern, und die Kurische Nehrung ist eine kurze Fährfahrt entfernt.",
      da: "En havneby ved Østersøen med en gammel bydel af bindingsværk, og Den Kuriske Landtange et kort stykke med færgen.",
    },
    find: {
      en: "Over ten sculptures and sights around town tell their own story when you scan the QR code beside them. Bring headphones.",
      lt: "Daugiau nei dešimt miesto skulptūrų ir lankytinų vietų papasakoja savo istoriją, kai nuskenuojate šalia esantį QR kodą. Pasiimkite ausines.",
      de: "Über zehn Skulpturen und Sehenswürdigkeiten in der Stadt erzählen ihre eigene Geschichte, wenn du den QR-Code daneben scannst. Kopfhörer mitnehmen.",
      da: "Over ti skulpturer og seværdigheder i byen fortæller deres egen historie, når du scanner QR-koden ved siden af. Tag høretelefoner med.",
    },
    tip: {
      en: "Cruise ships dock right by the Old Town, so there is no tender and no bus to catch. The walk in is flat.",
      lt: "Kruiziniai laivai švartuojasi visai prie senamiesčio, tad nereikia nei valčių, nei autobuso. Kelias į miestą lygus.",
      de: "Kreuzfahrtschiffe legen direkt an der Altstadt an, also kein Tenderboot und kein Bus. Der Weg in die Stadt ist flach.",
      da: "Krydstogtskibe lægger til lige ved den gamle bydel, så der er ingen tenderbåd og ingen bus. Turen ind er flad.",
    },
  },
  {
    id: "castle", page: "free:castle", name: "Castle Museum", meta: "Priešpilio g. 2 · €6",
    about: {
      en: "On the site of Klaipėda's old castle. Archaeological finds, the town's old seals, and scale models of the castle and the town.",
      lt: "Senosios Klaipėdos pilies vietoje. Archeologiniai radiniai, senieji miesto antspaudai, pilies ir miesto maketai.",
      de: "Auf dem Gelände der alten Burg von Klaipėda. Archäologische Funde, die alten Stadtsiegel und Modelle der Burg und der Stadt.",
      da: "Hvor Klaipėdas gamle borg lå. Arkæologiske fund, byens gamle segl og modeller af borgen og byen.",
    },
    find: {
      en: "The model of the old town makes the streets outside easier to read afterwards.",
      lt: "Senamiesčio maketas padeda lengviau suprasti gatves, kai išeini į lauką.",
      de: "Das Modell der Altstadt macht die Straßen draußen danach leichter lesbar.",
      da: "Modellen af den gamle by gør gaderne udenfor lettere at forstå bagefter.",
    },
    tip: {
      en: "The combined ticket with the History Museum of Lithuania Minor and the Blacksmith's Museum is €9 for adults.",
      lt: "Bendras bilietas su Mažosios Lietuvos istorijos muziejumi ir Kalvystės muziejumi suaugusiesiems kainuoja 9 €.",
      de: "Das Kombiticket mit dem Geschichtsmuseum Kleinlitauens und dem Schmiedemuseum kostet für Erwachsene 9 €.",
      da: "Den samlede billet med museet for Lille Litauens historie og smedemuseet koster 9 € for voksne.",
    },
  },
  {
    id: "clock", page: "free:clock", name: "Clock and Watch Museum", meta: "Liepų g. 12 · €5",
    about: {
      en: "Clocks by old European masters, from the Renaissance to modern times, in a 19th century villa on Liepų street.",
      lt: "Senųjų Europos meistrų laikrodžiai nuo Renesanso iki mūsų dienų, 19-ojo amžiaus viloje Liepų gatvėje.",
      de: "Uhren alter europäischer Meister, von der Renaissance bis heute, in einer Villa aus dem 19. Jahrhundert in der Liepų gatvė.",
      da: "Ure fra gamle europæiske mestre, fra renæssancen til i dag, i en villa fra det 19. århundrede på Liepų gatvė.",
    },
    find: {
      en: "The sundial garden outside the villa.",
      lt: "Saulės laikrodžių sodas prie vilos.",
      de: "Der Sonnenuhrengarten vor der Villa.",
      da: "Solurshaven foran villaen.",
    },
    tip: {
      en: "Open until 20:00 on Thursdays, so it works for an evening. Closed on Mondays.",
      lt: "Ketvirtadieniais dirba iki 20:00, tad tinka ir vakarui. Pirmadieniais uždaryta.",
      de: "Donnerstags bis 20:00 geöffnet, also auch etwas für den Abend. Montags geschlossen.",
      da: "Åbent til 20:00 om torsdagen, så det kan bruges om aftenen. Lukket om mandagen.",
    },
  },
  {
    id: "sculpture", page: "free:sculpture", name: "Sculpture Park", meta: { en: "Free · open at all hours", lt: "Nemokamai · atvira visą parą", de: "Eintritt frei · immer offen", da: "Gratis · altid åbent" },
    about: {
      en: "116 modern sculptures by 67 Lithuanian artists, among old trees north of the Old Town.",
      lt: "116 šiuolaikinių skulptūrų, kurias sukūrė 67 Lietuvos menininkai, tarp senų medžių į šiaurę nuo senamiesčio.",
      de: "116 moderne Skulpturen von 67 litauischen Künstlern, zwischen alten Bäumen nördlich der Altstadt.",
      da: "116 moderne skulpturer af 67 litauiske kunstnere, mellem gamle træer nord for den gamle bydel.",
    },
    find: {
      en: "From 1820 to 1959 this was the town's main cemetery, which is worth knowing as you walk through it.",
      lt: "Nuo 1820 iki 1959 metų čia buvo pagrindinės miesto kapinės, tai verta žinoti vaikštant po parką.",
      de: "Von 1820 bis 1959 war hier der Hauptfriedhof der Stadt, gut zu wissen, wenn man hindurchgeht.",
      da: "Fra 1820 til 1959 var her byens største kirkegård, og det er værd at vide, når man går igennem.",
    },
    tip: {
      en: "About a quarter of an hour on foot from the Old Town, and quiet when the centre is full of ship passengers.",
      lt: "Apie ketvirtį valandos pėsčiomis nuo senamiesčio. Ramu net tada, kai centre pilna kruizinių laivų keleivių.",
      de: "Etwa eine Viertelstunde zu Fuß von der Altstadt, und ruhig, wenn das Zentrum voller Kreuzfahrtgäste ist.",
      da: "Omkring et kvarter til fods fra den gamle bydel, og stille når centrum er fyldt med krydstogtgæster.",
    },
  },
  {
    id: "fish", page: "food:fish", name: "Rūkykla Marios", meta: { en: "Žvejų g. · lunch from €9", lt: "Žvejų g. · pietūs nuo 9 €", de: "Žvejų g. · Mittag ab 9 €", da: "Žvejų g. · frokost fra 9 €" }, partner: true,
    about: {
      en: "A small smokehouse kitchen by the Danė. Fish smoked on the spot in the morning, served with rye bread and pickles.",
      lt: "Nedidelė rūkykla prie Danės. Žuvis rūkoma vietoje rytais ir patiekiama su rugine duona ir raugintais agurkais.",
      de: "Eine kleine Räucherküche an der Danė. Fisch, morgens vor Ort geräuchert, mit Roggenbrot und sauren Gurken.",
      da: "Et lille røgeri ved Danė. Fisk røget på stedet om morgenen, serveret med rugbrød og syltede agurker.",
    },
    find: {
      en: "Smoked bream from the Curonian Lagoon, on the days the boats bring it in.",
      lt: "Rūkyti karšiai iš Kuršių marių, tomis dienomis, kai juos atveža žvejai.",
      de: "Geräucherte Brasse aus dem Kurischen Haff, an den Tagen, an denen die Boote sie bringen.",
      da: "Røget brasen fra Det Kuriske Haff, de dage bådene bringer den ind.",
    },
    offer: {
      en: "Lunch of the day with a glass of kvass, €9 · Mon to Fri, 12:00 to 15:00",
      lt: "Dienos pietūs su stikline giros, 9 € · pirm. iki penkt., 12:00 iki 15:00",
      de: "Mittagstisch mit einem Glas Kwass, 9 € · Mo. bis Fr., 12:00 bis 15:00",
      da: "Dagens frokost med et glas kvas, 9 € · man. til fre., 12:00 til 15:00",
    },
  },
];

// ── WHAT A PARTNER WOULD SEE ────────────────────────────────────────
// Not built. Shown as the next step, with made-up numbers, because it is what
// Oliver heard restaurants want: "many of these restaurants might desperately
// want to know when cruise ships come".
export const PARTNER_WEEK = [
  { day: "Mon", ships: 0, guests: 0 },
  { day: "Tue", ships: 1, guests: 2400, hours: "08:00 to 17:00" },
  { day: "Wed", ships: 0, guests: 0 },
  { day: "Thu", ships: 2, guests: 3900, hours: "07:00 to 18:30" },
  { day: "Fri", ships: 0, guests: 0 },
  { day: "Sat", ships: 1, guests: 1100, hours: "09:00 to 20:00" },
  { day: "Sun", ships: 0, guests: 0 },
];

// ── RUNNING AN EXAMPLE ──────────────────────────────────────────────
// The walk the rules make from an example's order, in the shape the live
// route answers with, plus the places in the order that did not make it and
// why: closed that day, or no time for it and the way back.
const DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_OF = { 0: "Sundays", 1: "Mondays", 2: "Tuesdays", 3: "Wednesdays", 4: "Thursdays", 5: "Fridays", 6: "Saturdays" };
export const exampleClock = (at) => {
  const [date, time] = String(at).split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return { day: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), minutes: hh * 60 + mm };
};

export const runExample = (ex) => {
  const start = NOW_STARTS.LT[ex.from];
  const startClock = exampleClock(ex.at);
  // Klaipėda is three hours ahead of UTC until the last Sunday of October.
  const now = new Date(`${ex.at}:00+03:00`);
  const all = nowCandidates(exampleRows(), { country: "LT", zone: "Europe/Vilnius", now });
  const style = ex.style || "";
  const candidates = styleCandidates(all, style, "LT");
  const weather = ex.weather || { wet: !!ex.wet, snow: false, wind: 0 };
  const budget = ex.hours * 60;
  const margin = start.ship ? SHIP_MARGIN : 0;
  const ctx = { country: "LT", start, startClock, budget, margin, weather, style, ferryWait: ferryWait("LT", Number(String(ex.at).slice(5, 7))) };
  // The order as the route makes it: the model's, then every Can't Miss Out
  // place it left out put in where it costs least, then untangled so no
  // street is walked twice.
  const order = withMustSee(ex.order, candidates, ctx);
  const made = tidyWalk(order, candidates, ctx);
  const alt = reversedWalk(made, candidates, ctx);
  const kept = new Set(made.stops.map(s => s.id));
  const left = order.filter(o => !kept.has(o.id)).map(o => {
    const c = candidates.find(x => x.id === o.id);
    const today = c?.hours ? windowsFor(c.hours, startClock.day) : null;
    const shut = Array.isArray(today) && today.length === 0;
    const next = shut ? nextOpen(c.hours, startClock) : null;
    const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const closes = Array.isArray(today) && today.length ? Math.max(...today.map(([, b]) => b)) : null;
    const blown = weatherRules(weather).dropExposed && c?.exposed && !c?.indoor;
    const reason = blown ? "Out on open water, in a storm wind"
      : shut
      ? `Closed on ${DAY_OF[startClock.day]} at this time of year${next ? `. Opens ${DAY_NAME[next.day]} ${hhmm(next.minutes)}` : ""}`
      : closes !== null && closes < startClock.minutes + budget
        ? `Closes at ${hhmm(closes)} today, before there is time for it`
        : "Left out to keep time for the way back";
    return { id: o.id, name: c?.name || o.id, mustSee: c?.tier === MUST_SEE, reason };
  });
  const base = { start: { name: start.name, lat: start.lat, lon: start.lon, ship: !!start.ship }, weather, style, margin, clock: startClock, budget, places: placesOf(made, candidates) };
  return {
    walk: { ...base, ...made },
    alt: alt ? { ...base, ...alt } : null,
    left, startClock,
  };
};

// ── THE PAGES BEHIND THE LISTINGS ───────────────────────────────────
//
// Oliver, 2 Oct 2026: "The listings should maybe open a tiny window of their
// page?" and "A pop up window explaining the town from them". So each listing
// opens its own page in the window the Danish app opens from the chat: the
// real DetailPage, with rows shaped like published ones.
//
// The real places say only what data/klaipedaDemo.js checked, with its sources
// on them. Klaipėda itself and the four places that have a guide card are also
// in Lithuanian, German and Danish, stored the way translations are stored on
// a published row (__i18n, fingerprinted over the English), so the page reads
// them through the same localizedEntry the live app uses. The rest are English
// only, which is what a reader sees on a live row that has not been translated
// yet.
const OTHER_LANGS = ["lt", "de", "da"];

// One language's text for a page: the fields, and `body` as a list of blocks
// in the same order in every language. Headings are written once, in English:
// entryWords.js already has every standard heading in four languages.
const bodyBlocks = (body) => (body || []).map(([t, v]) => t === "h" ? { type: "heading", content: v } : t === "p" ? { type: "paragraph", content: v } : { type: "bullets", items: v });
const pathsOf = (doc) => {
  const out = {};
  ["desc", "gemlyxFind", "ticketsGlance", "extraCosts", "priceNote", "tip"].forEach(k => { if (doc[k]) out[k] = doc[k]; });
  (doc.body || []).forEach(([t, v], i) => {
    if (t === "p") out[`blogBody.${i}.content`] = v;
    if (t === "b") v.forEach((it, j) => { out[`blogBody.${i}.items.${j}`] = it; });
  });
  return out;
};

const page = ({ kind, row, en, tr = {} }) => {
  const item = { country: "LT", ...row, ...Object.fromEntries(Object.entries(en).filter(([k]) => k !== "body")), blogBody: bodyBlocks(en.body) };
  const langs = OTHER_LANGS.filter(l => tr[l]);
  if (langs.length) {
    // The other languages' body has no headings, so they are filled in from the
    // English, then every field is laid on the same paths proseOf reads.
    const i18n = { fp: fingerprint(proseOf(item)), at: "2026-10-02" };
    langs.forEach(l => {
      const doc = { ...tr[l], body: (en.body || []).map(([t, v], i) => t === "h" ? [t, v] : tr[l].body[i]) };
      i18n[l] = pathsOf(doc);
    });
    item.__i18n = i18n;
  }
  return { kind, item };
};

const GUIDE = Object.fromEntries(EXAMPLE_GUIDES.map(g => [g.id, g]));
const fromGuide = (id, l) => ({ desc: GUIDE[id].about[l], gemlyxFind: GUIDE[id].find[l] });

export const EXAMPLE_PAGES = {
  town: page({
    kind: "town",
    row: { id: "x-town", name: "Klaipėda", region: "Lithuania", emoji: "⚓", __lat: 55.7078, __lon: 21.1316, mapHint: "Klaipėda Old Town", __sources: ["https://klaipedatravel.lt/en/structure-and-contacts/", "https://cruisinginthewake.com/ports/klaipeda.html", "https://keltas.lt/senosios-perkelos-tvarkarastis/"] },
    en: {
      ...fromGuide("town", "en"),
      body: [
        ["h", "Being There"],
        ["p", GUIDE.town.tip.en],
        ["h", "Things to Know"],
        ["b", [
          "Lithuania uses the euro, and cards work almost everywhere, including small cafés.",
          "Buy bus tickets in the e.Ticket Klaipėda app. It is cheaper than paying the driver.",
          "Bolt works in Klaipėda, so you can order a car in the app and see the price first.",
          "The Curonian Spit is ten minutes across the water on the ferry. Check today's departures on keltas.lt, because the timetable changes with the season.",
        ]],
      ],
    },
    tr: {
      lt: {
        ...fromGuide("town", "lt"),
        body: [null, ["p", GUIDE.town.tip.lt], null,
          ["b", [
            "Lietuvoje atsiskaitoma eurais, o kortelės priimamos beveik visur, net mažose kavinėse.",
            "Autobuso bilietus pirkite programėlėje e.Ticket Klaipėda. Tai pigiau nei mokėti vairuotojui.",
            "Klaipėdoje veikia Bolt, tad automobilį galite užsisakyti programėlėje ir iš anksto matyti kainą.",
            "Iki Kuršių nerijos keltu vos dešimt minučių. Šios dienos išvykimo laikus pasitikrinkite keltas.lt, nes tvarkaraštis keičiasi pagal sezoną.",
          ]],
        ],
      },
      de: {
        ...fromGuide("town", "de"),
        body: [null, ["p", GUIDE.town.tip.de], null,
          ["b", [
            "Litauen hat den Euro, und Karten gehen fast überall, auch in kleinen Cafés.",
            "Bustickets kaufst du in der App e.Ticket Klaipėda. Das ist günstiger als beim Fahrer.",
            "Bolt fährt in Klaipėda, du kannst also ein Auto in der App bestellen und siehst den Preis vorher.",
            "Die Kurische Nehrung liegt zehn Minuten mit der Fähre über das Wasser. Prüf die heutigen Abfahrten auf keltas.lt, denn der Fahrplan wechselt mit der Saison.",
          ]],
        ],
      },
      da: {
        ...fromGuide("town", "da"),
        body: [null, ["p", GUIDE.town.tip.da], null,
          ["b", [
            "Litauen bruger euro, og kort virker næsten overalt, også på små caféer.",
            "Køb busbilletter i appen e.Ticket Klaipėda. Det er billigere end at betale chaufføren.",
            "Bolt kører i Klaipėda, så du kan bestille en bil i appen og se prisen først.",
            "Den Kuriske Landtange ligger ti minutter over vandet med færgen. Tjek dagens afgange på keltas.lt, for køreplanen skifter med sæsonen.",
          ]],
        ],
      },
    },
  }),

  "free:castle": page({
    kind: "free",
    row: { id: "x-castle", name: "Castle Museum", city: "Klaipėda", type: "Museum", emoji: "🏰", __lat: 55.70592, __lon: 21.12891, mapHint: "Klaipėda Castle Museum, Priešpilio g. 2", website: "https://www.mlimuziejus.lt/en/information-for-visitors/", __sources: ["https://www.mlimuziejus.lt/en/ticket-prices/", "https://www.mlimuziejus.lt/en/information-for-visitors/"] },
    en: {
      ...fromGuide("castle", "en"),
      ticketsGlance: "Adults €6, students, pupils and seniors €3",
      extraCosts: "Combined ticket with the History Museum of Lithuania Minor and the Blacksmith's Museum, €9 for adults",
      body: [
        ["h", "Being There"],
        ["p", "The museum stands where the castle stood, at the edge of the Old Town beside the old castle harbour."],
        ["p", "From mid September to mid June it opens Tuesday to Saturday, 10:00 to 18:00, and is closed on Sundays and Mondays. In summer it opens Wednesday to Sunday instead. Last tickets at 17:30."],
        ["h", "Things to Know"],
        ["b", ["The Black Ghost sculpture rises out of the castle harbour a few minutes' walk away."]],
      ],
    },
    tr: {
      lt: { ...fromGuide("castle", "lt"), ticketsGlance: "Suaugusiesiems 6 €, studentams, moksleiviams ir senjorams 3 €", extraCosts: "Bendras bilietas su Mažosios Lietuvos istorijos muziejumi ir Kalvystės muziejumi suaugusiesiems 9 €",
        body: [null,
          ["p", "Muziejus stovi ten, kur stovėjo pilis, senamiesčio pakraštyje prie senojo pilies uosto."],
          ["p", "Nuo rugsėjo vidurio iki birželio vidurio muziejus dirba nuo antradienio iki šeštadienio, nuo 10:00 iki 18:00, o sekmadieniais ir pirmadieniais uždarytas. Vasarą jis dirba nuo trečiadienio iki sekmadienio. Paskutiniai bilietai parduodami 17:30."],
          null,
          ["b", ["Skulptūra „Juodasis vaiduoklis“ kyla iš pilies uosto vandens, vos kelios minutės pėsčiomis nuo čia."]]] },
      de: { ...fromGuide("castle", "de"), ticketsGlance: "Erwachsene 6 €, Studierende, Schüler und Senioren 3 €", extraCosts: "Kombiticket mit dem Geschichtsmuseum Kleinlitauens und dem Schmiedemuseum, 9 € für Erwachsene",
        body: [null,
          ["p", "Das Museum steht dort, wo die Burg stand, am Rand der Altstadt neben dem alten Burghafen."],
          ["p", "Von Mitte September bis Mitte Juni ist es dienstags bis samstags von 10:00 bis 18:00 geöffnet, sonntags und montags geschlossen. Im Sommer öffnet es stattdessen mittwochs bis sonntags. Die letzten Tickets gibt es um 17:30."],
          null,
          ["b", ["Die Skulptur des Schwarzen Geistes ragt ein paar Gehminuten entfernt aus dem Burghafen."]]] },
      da: { ...fromGuide("castle", "da"), ticketsGlance: "Voksne 6 €, studerende, elever og pensionister 3 €", extraCosts: "Samlet billet med museet for Lille Litauens historie og smedemuseet, 9 € for voksne",
        body: [null,
          ["p", "Museet ligger, hvor borgen lå, i udkanten af den gamle bydel ved den gamle borghavn."],
          ["p", "Fra midten af september til midten af juni har det åbent tirsdag til lørdag fra 10:00 til 18:00 og er lukket søndag og mandag. Om sommeren har det i stedet åbent onsdag til søndag. Sidste billetter sælges 17:30."],
          null,
          ["b", ["Skulpturen Det Sorte Spøgelse rejser sig op af borghavnen få minutters gang derfra."]]] },
    },
  }),

  "free:clock": page({
    kind: "free",
    row: { id: "x-clock", name: "Clock and Watch Museum", city: "Klaipėda", type: "Museum", emoji: "🕰️", __lat: 55.71221, __lon: 21.13416, mapHint: "Clock and Watch Museum, Liepų g. 12, Klaipėda", website: "https://www.lndm.lt/lm/paslaugos-ir-darbo-laikas/", __sources: ["https://www.lndm.lt/lm/paslaugos-ir-darbo-laikas/"] },
    en: {
      ...fromGuide("clock", "en"),
      ticketsGlance: "€5, reduced €2.50",
      body: [
        ["h", "Being There"],
        ["p", "Tuesday to Saturday 10:00 to 18:00, but Thursday 12:00 to 20:00. Sunday 10:00 to 16:00. Closed on Mondays. Last entry 30 minutes before closing."],
        ["h", "Things to Know"],
        ["b", ["A good one for a rainy hour.", "Under ten minutes on foot north of Theatre Square, across the river."]],
      ],
    },
    tr: {
      lt: { ...fromGuide("clock", "lt"), ticketsGlance: "5 €, su nuolaida 2,50 €",
        body: [null, ["p", "Nuo antradienio iki šeštadienio dirba nuo 10:00 iki 18:00, ketvirtadieniais nuo 12:00 iki 20:00, sekmadieniais nuo 10:00 iki 16:00. Pirmadieniais uždaryta. Paskutiniai lankytojai įleidžiami likus 30 minučių iki uždarymo."],
          null, ["b", ["Gera vieta lietingai valandai.", "Mažiau nei dešimt minučių pėsčiomis į šiaurę nuo Teatro aikštės, kitapus upės."]]] },
      de: { ...fromGuide("clock", "de"), ticketsGlance: "5 €, ermäßigt 2,50 €",
        body: [null, ["p", "Dienstag bis Samstag 10:00 bis 18:00, donnerstags aber 12:00 bis 20:00. Sonntag 10:00 bis 16:00. Montags geschlossen. Letzter Einlass 30 Minuten vor Schluss."],
          null, ["b", ["Gut für eine Regenstunde.", "Keine zehn Minuten zu Fuß nördlich vom Theaterplatz, auf der anderen Seite des Flusses."]]] },
      da: { ...fromGuide("clock", "da"), ticketsGlance: "5 €, nedsat pris 2,50 €",
        body: [null, ["p", "Tirsdag til lørdag 10:00 til 18:00, men torsdag 12:00 til 20:00. Søndag 10:00 til 16:00. Lukket mandag. Sidste indgang 30 minutter før lukketid."],
          null, ["b", ["Et godt sted en regnvejrstime.", "Under ti minutters gang nord for Teaterpladsen, på den anden side af floden."]]] },
    },
  }),

  "free:sculpture": page({
    kind: "free",
    row: { id: "x-sculpture", name: "Sculpture Park", city: "Klaipėda", type: "Park", emoji: "🗿", __lat: 55.71690, __lon: 21.14016, mapHint: "Klaipėda Sculpture Park", __sources: ["https://en.wikipedia.org/wiki/Klaip%C4%97da_Sculpture_Park"] },
    en: {
      ...fromGuide("sculpture", "en"),
      ticketsGlance: "Free",
      body: [
        ["h", "Being There"],
        ["p", GUIDE.sculpture.tip.en],
        ["p", "Open at all hours, so it works early in the morning, before the museums open."],
      ],
    },
    tr: {
      lt: { ...fromGuide("sculpture", "lt"), ticketsGlance: "Nemokamai", body: [null, ["p", GUIDE.sculpture.tip.lt], ["p", "Atvira visą parą, tad čia galima užsukti ir anksti ryte, kol muziejai dar uždaryti."]] },
      de: { ...fromGuide("sculpture", "de"), ticketsGlance: "Eintritt frei", body: [null, ["p", GUIDE.sculpture.tip.de], ["p", "Rund um die Uhr offen, also auch etwas für den frühen Morgen, bevor die Museen öffnen."]] },
      da: { ...fromGuide("sculpture", "da"), ticketsGlance: "Gratis", body: [null, ["p", GUIDE.sculpture.tip.da], ["p", "Åbent døgnet rundt, så det kan også bruges tidligt om morgenen, før museerne åbner."]] },
    },
  }),

  "food:fish": page({
    kind: "food",
    row: { id: "x-fish", name: "Rūkykla Marios", location: "Žvejų g., Klaipėda", category: "Smokehouse", price: "Lunch €9", emoji: "🐟", __lat: 55.70890, __lon: 21.13120, mapHint: "Žvejų g., Klaipėda", __offer: { ...EXAMPLE_PARTNERS.find(p => p.key === "fish").offer, until: UNTIL } },
    en: {
      ...fromGuide("fish", "en"),
      tip: "Ask what came in that morning.",
      body: [["h", "Being There"], ["p", "Smoked fish by weight from the counter, or the lunch of the day at one of the long tables, with rye bread, pickles and a glass of kvass."]],
    },
    tr: {
      lt: { ...fromGuide("fish", "lt"), tip: "Paklauskite, ką atvežė šį rytą.", body: [null, ["p", "Rūkyta žuvis sveriama prie prekystalio, o dienos pietūs patiekiami prie ilgų stalų su rugine duona, raugintais agurkais ir stikline giros."]] },
      de: { ...fromGuide("fish", "de"), tip: "Frag, was heute Morgen reingekommen ist.", body: [null, ["p", "Räucherfisch nach Gewicht an der Theke oder der Mittagstisch an einem der langen Tische, mit Roggenbrot, sauren Gurken und einem Glas Kwass."]] },
      da: { ...fromGuide("fish", "da"), tip: "Spørg, hvad der kom ind i morges.", body: [null, ["p", "Røget fisk efter vægt fra disken, eller dagens frokost ved et af de lange borde, med rugbrød, syltede agurker og et glas kvas."]] },
    },
  }),

  // These five read in four languages too, so every window follows the
// language buttons. Only the made-up partners below stay in English.
  "free:history": page({
    kind: "free",
    row: { id: "x-history", name: "History Museum of Lithuania Minor", city: "Klaipėda", type: "Museum", emoji: "🏛️", __lat: 55.70734, __lon: 21.13471, mapHint: "Didžioji Vandens g. 2, Klaipėda", website: "https://www.mlimuziejus.lt/en/information-for-visitors/", __sources: ["https://www.mlimuziejus.lt/en/ticket-prices/", "https://www.mlimuziejus.lt/en/information-for-visitors/"] },
    en: {
      desc: "The story of Lithuania Minor, the Lithuanian part of old Prussia that Klaipėda, then called Memel, belonged to.",
      ticketsGlance: "Adults €4, students, pupils and seniors €2",
      extraCosts: "Combined ticket with the Castle Museum and the Blacksmith's Museum, €9 for adults",
      body: [["h", "Being There"], ["p", "Same hours as the Castle Museum: from mid September to mid June, Tuesday to Saturday 10:00 to 18:00, closed on Sundays and Mondays. Last tickets at 17:30."]],
    },
    tr: {
      "lt": {
        "desc": "Mažosios Lietuvos, lietuviškos senosios Prūsijos dalies, istorija. Klaipėda, tada vadinta Memeliu, priklausė jai.",
        "ticketsGlance": "Suaugusiesiems 4 €, studentams, moksleiviams ir senjorams 2 €",
        "extraCosts": "Bendras bilietas su Pilies muziejumi ir Kalvystės muziejumi suaugusiesiems 9 €",
        "body": [
          null,
          [
            "p",
            "Darbo laikas toks pat kaip Pilies muziejaus: nuo rugsėjo vidurio iki birželio vidurio nuo antradienio iki šeštadienio, nuo 10:00 iki 18:00, sekmadieniais ir pirmadieniais uždaryta. Paskutiniai bilietai parduodami 17:30."
          ]
        ]
      },
      "de": {
        "desc": "Die Geschichte Kleinlitauens, des litauischen Teils des alten Preußens, zu dem Klaipėda, damals Memel, gehörte.",
        "ticketsGlance": "Erwachsene 4 €, Studierende, Schüler und Senioren 2 €",
        "extraCosts": "Kombiticket mit dem Burgmuseum und dem Schmiedemuseum, 9 € für Erwachsene",
        "body": [
          null,
          [
            "p",
            "Gleiche Zeiten wie das Burgmuseum: von Mitte September bis Mitte Juni dienstags bis samstags von 10:00 bis 18:00, sonntags und montags geschlossen. Die letzten Tickets gibt es um 17:30."
          ]
        ]
      },
      "da": {
        "desc": "Historien om Lille Litauen, den litauiske del af det gamle Preussen, som Klaipėda, dengang Memel, hørte til.",
        "ticketsGlance": "Voksne 4 €, studerende, elever og pensionister 2 €",
        "extraCosts": "Samlet billet med borgmuseet og smedemuseet, 9 € for voksne",
        "body": [
          null,
          [
            "p",
            "Samme åbningstider som borgmuseet: fra midten af september til midten af juni tirsdag til lørdag fra 10:00 til 18:00, lukket søndag og mandag. Sidste billetter sælges 17:30."
          ]
        ]
      }
    },
  }),
  "free:ghost": page({
    kind: "free",
    row: { id: "x-ghost", name: "The Black Ghost", city: "Klaipėda", type: "Sculpture", emoji: "👻", __lat: 55.70660, __lon: 21.12682, mapHint: "Black Ghost sculpture, Klaipėda", __sources: ["https://lithuania.travel/en/where-to-visit/major-cities/klaipeda-major-cities/top-10-places-to-visit-in-klaipeda/the-black-ghost-sculpture"] },
    en: {
      desc: "A dark figure rising out of the water of the old castle harbour. The legend says he appeared to a castle guard in the 16th century with a warning about grain and firewood.",
      ticketsGlance: "Free",
      body: [["h", "Things to Know"], ["b", ["One of the talking sculptures: scan the QR code beside it and it tells the legend.", "Five minutes on foot from the cruise terminal."]]],
    },
    tr: {
      "lt": {
        "desc": "Tamsi figūra, kylanti iš senojo pilies uosto vandens. Legenda pasakoja, kad 16-ajame amžiuje jis pasirodė pilies sargybiniui ir įspėjo dėl grūdų ir malkų.",
        "ticketsGlance": "Nemokamai",
        "body": [
          null,
          [
            "b",
            [
              "Viena iš kalbančių skulptūrų: nuskenuokite šalia esantį QR kodą ir išgirsite legendą.",
              "Penkios minutės pėsčiomis nuo kruizinių laivų terminalo."
            ]
          ]
        ]
      },
      "de": {
        "desc": "Eine dunkle Gestalt, die aus dem Wasser des alten Burghafens aufsteigt. Der Legende nach erschien er im 16. Jahrhundert einem Burgwächter mit einer Warnung zu Getreide und Brennholz.",
        "ticketsGlance": "Kostenlos",
        "body": [
          null,
          [
            "b",
            [
              "Eine der sprechenden Skulpturen: Scanne den QR-Code daneben, und sie erzählt die Legende.",
              "Fünf Minuten zu Fuß vom Kreuzfahrtterminal."
            ]
          ]
        ]
      },
      "da": {
        "desc": "En mørk skikkelse, der rejser sig op af vandet i den gamle borghavn. Ifølge sagnet viste han sig for en borgvagt i det 16. århundrede med en advarsel om korn og brænde.",
        "ticketsGlance": "Gratis",
        "body": [
          null,
          [
            "b",
            [
              "En af de talende skulpturer: scan QR-koden ved siden af, så fortæller den sagnet.",
              "Fem minutters gang fra krydstogtterminalen."
            ]
          ]
        ]
      }
    },
  }),
  "free:theatre": page({
    kind: "free",
    row: { id: "x-theatre", name: "Theatre Square", city: "Klaipėda", type: "Square", emoji: "🎭", __lat: 55.70780, __lon: 21.13163, mapHint: "Teatro aikštė, Klaipėda", __sources: ["https://lithuania.travel/en/where-to-visit/major-cities/klaipeda-major-cities/top-10-places-to-visit-in-klaipeda/theatre-square"] },
    en: {
      desc: "The square in front of the theatre, with Ännchen of Tharau in the middle, the girl from Simon Dach's 17th century love poem.",
      ticketsGlance: "Free",
      body: [
        ["h", "Being There"],
        ["p", "She first stood here in 1912, went missing in the war, and a new one was put back in 1989. On 23 March 1939 Hitler spoke from the balcony of the theatre behind her."],
        ["h", "Things to Know"],
        ["b", ["She is one of the talking sculptures: scan the QR code on the sign next to her and she tells her story."]],
      ],
    },
    tr: {
      "lt": {
        "desc": "Aikštė priešais teatrą, jos viduryje stovi Taravos Anikė, mergina iš Simono Dacho 17-ojo amžiaus meilės eilėraščio.",
        "ticketsGlance": "Nemokamai",
        "body": [
          null,
          [
            "p",
            "Pirmą kartą ji čia pastatyta 1912 metais, per karą dingo, o nauja skulptūra sugrąžinta 1989 metais. 1939 metų kovo 23 dieną Hitleris kalbėjo nuo teatro balkono už jos."
          ],
          null,
          [
            "b",
            [
              "Ji yra viena iš kalbančių skulptūrų: nuskenuokite QR kodą ant lentelės šalia jos ir ji papasakos savo istoriją."
            ]
          ]
        ]
      },
      "de": {
        "desc": "Der Platz vor dem Theater, in der Mitte Ännchen von Tharau, das Mädchen aus Simon Dachs Liebesgedicht aus dem 17. Jahrhundert.",
        "ticketsGlance": "Kostenlos",
        "body": [
          null,
          [
            "p",
            "Sie stand hier zuerst 1912, verschwand im Krieg, und 1989 wurde eine neue aufgestellt. Am 23. März 1939 sprach Hitler vom Balkon des Theaters hinter ihr."
          ],
          null,
          [
            "b",
            [
              "Sie ist eine der sprechenden Skulpturen: Scanne den QR-Code auf dem Schild neben ihr, und sie erzählt ihre Geschichte."
            ]
          ]
        ]
      },
      "da": {
        "desc": "Pladsen foran teatret med Ännchen von Tharau i midten, pigen fra Simon Dachs kærlighedsdigt fra det 17. århundrede.",
        "ticketsGlance": "Gratis",
        "body": [
          null,
          [
            "p",
            "Hun stod her første gang i 1912, forsvandt under krigen, og en ny blev sat op i 1989. Den 23. marts 1939 talte Hitler fra balkonen på teatret bag hende."
          ],
          null,
          [
            "b",
            [
              "Hun er en af de talende skulpturer: scan QR-koden på skiltet ved siden af hende, så fortæller hun sin historie."
            ]
          ]
        ]
      }
    },
  }),
  "free:friedrich": page({
    kind: "free",
    row: { id: "x-friedrich", name: "Friedrich Passage", city: "Klaipėda", type: "Lane", emoji: "🍽️", __lat: 55.70699, __lon: 21.13789, mapHint: "Friedricho pasažas, Tiltų g. 26A, Klaipėda", __sources: ["https://www.mzirafos.lt/vieta/friedricho-pasazas/"] },
    en: {
      desc: "A lane of cafés and restaurants off Tiltų street, the easiest place in the Old Town to sit down for a proper meal.",
      ticketsGlance: "Free to walk through",
      body: [["h", "Things to Know"], ["b", ["Each restaurant keeps its own hours.", "Lithuanian dishes worth trying: cepelinai, the big potato dumplings, and šaltibarščiai, cold pink beetroot soup, when it is warm."]]],
    },
    tr: {
      "lt": {
        "desc": "Kavinių ir restoranų pasažas prie Tiltų gatvės, lengviausia vieta senamiestyje sočiai pavalgyti.",
        "ticketsGlance": "Praeiti nemokamai",
        "body": [
          null,
          [
            "b",
            [
              "Kiekvienas restoranas dirba savo darbo laiku.",
              "Verta paragauti lietuviškų patiekalų: cepelinų ir, kai šilta, šaltibarščių."
            ]
          ]
        ]
      },
      "de": {
        "desc": "Eine Passage mit Cafés und Restaurants an der Tiltų gatvė, der einfachste Ort in der Altstadt für ein richtiges Essen.",
        "ticketsGlance": "Frei zugänglich",
        "body": [
          null,
          [
            "b",
            [
              "Jedes Restaurant hat eigene Öffnungszeiten.",
              "Litauische Gerichte zum Probieren: Cepelinai, die großen Kartoffelklöße, und Šaltibarščiai, kalte rosa Rote-Bete-Suppe, wenn es warm ist."
            ]
          ]
        ]
      },
      "da": {
        "desc": "En passage med caféer og restauranter ud til Tiltų gatvė, det letteste sted i den gamle bydel at sætte sig til et ordentligt måltid.",
        "ticketsGlance": "Gratis at gå igennem",
        "body": [
          null,
          [
            "b",
            [
              "Hver restaurant har sine egne åbningstider.",
              "Litauiske retter, der er værd at smage: cepelinai, de store kartoffelboller, og šaltibarščiai, kold lyserød rødbedesuppe, når det er varmt."
            ]
          ]
        ]
      }
    },
  }),
  "free:meridianas": page({
    kind: "free",
    row: { id: "x-meridianas", name: "Meridianas", city: "Klaipėda", type: "Landmark", emoji: "⛵", __lat: 55.71034, __lon: 21.13491, mapHint: "Meridianas, Klaipėda", __sources: ["https://klaipedatravel.lt/en/place/sailing-vessel-meridianas/"] },
    en: {
      desc: "The sailing ship moored by Biržos Bridge is the town's symbol. Built in Turku in 1948, it trained cadets of the Klaipėda maritime school until 1967.",
      ticketsGlance: "Free to see from the quay",
      body: [["h", "Things to Know"], ["b", ["Best seen from the bridge."]]],
    },
    tr: {
      "lt": {
        "desc": "Prie Biržos tilto prišvartuotas burlaivis yra miesto simbolis. Pastatytas Turku 1948 metais, iki 1967 metų jame mokėsi Klaipėdos jūreivystės mokyklos kursantai.",
        "ticketsGlance": "Nemokamai, žiūrint nuo krantinės",
        "body": [
          null,
          [
            "b",
            [
              "Geriausiai matyti nuo tilto."
            ]
          ]
        ]
      },
      "de": {
        "desc": "Das Segelschiff an der Biržos-Brücke ist das Wahrzeichen der Stadt. 1948 in Turku gebaut, bildete es bis 1967 Kadetten der Seefahrtsschule von Klaipėda aus.",
        "ticketsGlance": "Vom Kai aus kostenlos zu sehen",
        "body": [
          null,
          [
            "b",
            [
              "Am besten von der Brücke aus zu sehen."
            ]
          ]
        ]
      },
      "da": {
        "desc": "Sejlskibet, der ligger fortøjet ved Biržos-broen, er byens vartegn. Bygget i Turku i 1948 uddannede det kadetter fra søfartsskolen i Klaipėda indtil 1967.",
        "ticketsGlance": "Gratis at se fra kajen",
        "body": [
          null,
          [
            "b",
            [
              "Ses bedst fra broen."
            ]
          ]
        ]
      }
    },
  }),
};

// The made-up partners' own pages, short, English only, each with its offer.
const PARTNER_PAGE = {
  bakery: { kind: "food", emoji: "🥐", category: "Bakery café", price: "Pastries from €2", desc: "A small bakery café round the corner from the tourist centre. Rye bread, cinnamon buns and filter coffee.", tip: "The afternoon is quiet, which is when the refill runs." },
  amber: { kind: "shop", emoji: "🟠", desc: "A workshop where Baltic amber is cut and polished by hand. Visitors can try it at the bench.", tip: "" },
  tea: { kind: "food", emoji: "🫖", category: "Tea room", price: "Tea from €3", desc: "A tea room with low tables and a long list of herbal teas.", tip: "Weekend mornings are the quiet ones." },
  beer: { kind: "nightlife", emoji: "🍺", category: "Beer bar", priceNote: "Beer from €4", crowd: "Locals after work, visitors later", desc: "Lithuanian beer on tap from small breweries around the country." },
  post: { kind: "shop", emoji: "✉️", desc: "Postcards of Klaipėda old and new, and a table to write them at." },
  jazz: { kind: "nightlife", emoji: "🎷", category: "Jazz cellar", priceNote: "Cover €8 after 21:00", crowd: "Mixed, quiet until the band starts", desc: "A brick cellar with live jazz from Wednesday to Saturday." },
  bike: { kind: "shop", emoji: "🚲", desc: "Bikes, helmets and locks for the day. A bike can be handed back at the cruise terminal." },
  bags: { kind: "shop", emoji: "🧳", desc: "A staffed room for bags near the river, for people between a hotel and a later bus or ferry." },
};
EXAMPLE_PARTNERS.forEach(p => {
  const id = `${p.type}:${p.key}`;
  if (EXAMPLE_PAGES[id] || !PARTNER_PAGE[p.key]) return;
  const { kind, desc, tip, ...rest } = PARTNER_PAGE[p.key];
  EXAMPLE_PAGES[id] = page({
    kind,
    row: { id: `x-${p.key}`, name: p.name, location: `${p.street}, Klaipėda`, town: "Klaipėda", __lat: p.lat, __lon: p.lon, mapHint: `${p.street}, Klaipėda`, __offer: { ...p.offer, until: UNTIL }, ...rest },
    en: { desc, ...(tip ? { tip } : {}), body: [["h", "Being There"], ["p", `${p.what} on ${p.street}${p.street.endsWith(".") ? "" : "."} Made up for this page, like its offer.`]] },
  });
});

// Which page a listing opens. A walk stop, an offer and a guide card all
// carry the same id the walk uses ("free:castle"); the town is "town".
export const pageFor = (id) => EXAMPLE_PAGES[id] || null;

// ── THE SAME PARTNERS ON THE SPECIAL DEALS PAGE ────────────────────
// Oliver, 4 Oct 2026, of /lithuania: "it's not updated to 'special deals'",
// then "Put in a few examples I can show". The gold button only turns into
// Special deals when a deal is live, and no Klaipėda business has one yet. So
// until one does, the page shows these made-up partners, each one marked
// Example, under a line that says they are made up. The first real deal
// replaces all of them (App.jsx). The rows are the example pages' own rows,
// so a card opens the same page the examples page opens.
// Which list each kind of page opens from, as utils/promotions.js names them.
const PROMO_SRC = { food: "food", nightlife: "nightlife", shop: "shop", free: "free", craft: "craft" };
export const examplePromotionPools = () => {
  const pools = {};
  EXAMPLE_PARTNERS.forEach(p => {
    const id = `${p.type}:${p.key}`;
    const pg = pageFor(id);
    const src = pg && PROMO_SRC[pg.kind];
    if (!src) return;
    (pools[src] = pools[src] || []).push({ ...pg.item, _exampleId: id, _kind: pg.kind });
  });
  return pools;
};
