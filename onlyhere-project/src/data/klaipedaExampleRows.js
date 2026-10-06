// ── KLAIPĖDA'S EXAMPLE PLACES, AS ROWS ──────────────────────────────
//
// Moved out of data/klaipedaExamples.js on 7 Oct 2026 so the walk route
// (api/plan-now.js) can read them too. That file imports the translation and
// planner code for the examples page; this one imports nothing, so a server
// route can load it as it is.
//
// Oliver, 7 Oct 2026, before the trip to Klaipėda: "Right now, we're not
// trying to build it all. We're getting the examples in play." Few Klaipėda
// places are published in the Studio yet, so a walk from the QR page came out
// as two places and two taxi rides. Until enough are published (EXAMPLE_FILL_UNDER),
// the QR walk is made from these as well: the real museums, squares and
// sculptures, checked against their own websites, and the made-up partners,
// each marked Example wherever it shows. A published place with the same name
// wins over its example. The first real places push the examples out by
// themselves, with no switch to remember.
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
export const UNTIL = "2027-12-31";

// ── THE PARTNERS, ALL MADE UP ───────────────────────────────────────
// `street` only, never a house number, so no real door is pointed at.
// Each partner also reads in Lithuanian (`lt`), for the business page in
// Lithuanian (6 Oct 2026). A native speaker should read these over.
export const EXAMPLE_PARTNERS = [
  {
    key: "bakery", stay: 25, type: "food", name: "Kepyklėlė Rūta", what: "Bakery café", street: "Turgaus g.",
    lat: 55.70870, lon: 21.13390,
    hours: lines({ ...every("08:00", "18:00"), 0: ["09:00", "15:00"] }),
    offer: { text: "Free refill of filter coffee with any pastry", days: [1, 2, 3, 4, 5], from: "14:00", to: "16:00" },
    idea: "Their quiet hour, filled.",
    lt: { what: "Kepyklėlė kavinė", offer: "Nemokamai papildome filtruotos kavos puodelį perkant bet kokį kepinį", idea: "Ramiausia jų valanda, užpildyta." },
  },
  {
    key: "fish", stay: 40, type: "food", name: "Rūkykla Marios", what: "Smokehouse kitchen", street: "Žvejų g.",
    lat: 55.70890, lon: 21.13120,
    hours: lines(every("11:00", "22:00")),
    offer: { text: "Lunch of the day with a glass of kvass, €9", days: [1, 2, 3, 4, 5], from: "12:00", to: "15:00" },
    idea: "A fixed lunch price, the thing a passenger with three hours wants to know.",
    lt: { what: "Rūkykla ir virtuvė", offer: "Dienos pietūs su stikline giros, 9 €", idea: "Fiksuota pietų kaina: būtent tai, ką nori žinoti keleivis, turintis tris valandas." },
  },
  {
    key: "amber", stay: 25, type: "booking", name: "Gintaro dirbtuvė Lašas", what: "Amber workshop", street: "Kurpių g.",
    lat: 55.70850, lon: 21.13260,
    hours: lines({ 2: ["10:00", "17:00"], 3: ["10:00", "17:00"], 4: ["10:00", "17:00"], 5: ["10:00", "17:00"], 6: ["10:00", "17:00"], 0: ["11:00", "16:00"] }),
    offer: { text: "Polish a raw piece of Baltic amber yourself in 20 minutes and keep it, €6" },
    idea: "Something to do, not a discount: twenty minutes and a souvenir they made.",
    lt: { what: "Gintaro dirbtuvė", offer: "Per 20 minučių patys nušlifuokite žalio Baltijos gintaro gabalėlį ir pasilikite jį, 6 €", idea: "Užsiėmimas, o ne nuolaida: dvidešimt minučių ir pačių pagamintas suvenyras." },
  },
  {
    key: "tea", stay: 30, type: "food", name: "Arbatinė Debesis", what: "Tea room", street: "Tiltų g.",
    lat: 55.70720, lon: 21.13650,
    hours: lines(every("10:00", "20:00")),
    offer: { text: "A pot of herbal tea for two at the price of one cup", days: [6, 0], from: "11:00", to: "14:00" },
    idea: "Weekend mornings, when the room is half empty.",
    lt: { what: "Arbatinė", offer: "Žolelių arbatos arbatinukas dviem už vieno puodelio kainą", idea: "Savaitgalio rytai, kai salė pustuštė." },
  },
  {
    key: "beer", stay: 40, type: "food", name: "Alaus baras Inkaras", what: "Beer bar", street: "Daržų g.",
    lat: 55.70640, lon: 21.13900,
    hours: lines({ 1: ["16:00", "00:00"], 2: ["16:00", "00:00"], 3: ["16:00", "00:00"], 4: ["16:00", "00:00"], 5: ["14:00", "02:00"], 6: ["14:00", "02:00"], 0: ["14:00", "22:00"] }),
    offer: { text: "Three Lithuanian beers, 0.1 l each, for the price of a large one", days: [1, 2, 3, 4, 5], from: "16:00", to: "19:00" },
    idea: "A tasting, so a visitor tries three local breweries instead of one.",
    lt: { what: "Alaus baras", offer: "Trys lietuviško alaus po 0,1 l už didelio bokalo kainą", idea: "Degustacija: lankytojas paragauja trijų vietinių bravorų, o ne vieno." },
  },
  {
    key: "post", stay: 15, type: "free", name: "Atvirukų krautuvėlė", what: "Postcard shop", street: "Tomo g.",
    lat: 55.70760, lon: 21.13390,
    hours: lines({ ...every("10:00", "18:00"), 0: ["11:00", "16:00"] }),
    offer: { text: "Write a postcard at our table and we post it for you, stamp included" },
    idea: "A service. The visitor leaves with nothing to carry and the post office found for them.",
    lt: { what: "Atvirukų parduotuvėlė", offer: "Parašykite atviruką prie mūsų stalo, o mes jį išsiųsime, pašto ženklas įskaičiuotas", idea: "Paslauga. Lankytojui nereikia nieko nešiotis ir ieškoti pašto." },
  },
  {
    key: "jazz", stay: 60, type: "booking", name: "Rūsys", what: "Jazz cellar", street: "Sukilėlių g.",
    lat: 55.70800, lon: 21.13550,
    hours: lines({ 3: ["18:00", "01:00"], 4: ["18:00", "01:00"], 5: ["18:00", "01:00"], 6: ["18:00", "01:00"] }),
    offer: { text: "No cover charge before 21:00, live music from 20:00", days: [5, 6], from: "18:00", to: "21:00" },
    idea: "The early hour sold on the music, so the room is not empty when the band starts.",
    lt: { what: "Džiazo rūsys", offer: "Iki 21:00 įėjimas nemokamas, gyva muzika nuo 20:00", idea: "Ankstyva valanda patraukia muzika, tad salė nebūna tuščia, kai pradeda groti grupė." },
  },
  // These two never fit a short walk, so they are only in the list of offers.
  {
    key: "bike", stay: 120, type: "booking", name: "Dviračių nuoma Vėjas", what: "Bike hire", street: "Naujoji Uosto g.",
    lat: 55.70600, lon: 21.12500, inWalks: false,
    hours: lines(every("09:00", "19:00")),
    offer: { text: "Two hours with helmet and lock, €8. Hand the bike back at the cruise terminal" },
    idea: "Takes away the one worry: getting back to the ship on time.",
    lt: { what: "Dviračių nuoma", offer: "Dvi valandos su šalmu ir spyna, 8 €. Dviratį grąžinkite kruizinių laivų terminale", idea: "Nuima vienintelį rūpestį: laiku grįžti į laivą." },
  },
  {
    key: "bags", stay: 15, type: "free", name: "Bagažinė", what: "Luggage room", street: "Danės g.",
    lat: 55.70950, lon: 21.13700, inWalks: false,
    hours: lines(every("08:00", "21:00")),
    offer: { text: "Leave a bag while you walk, €3 a bag for the day" },
    idea: "For the people between a hotel and a late bus or ferry.",
    lt: { what: "Bagažo saugykla", offer: "Palikite krepšį, kol vaikštote, 3 € už krepšį visai dienai", idea: "Tiems, kurie laukia tarp viešbučio ir vėlyvo autobuso ar kelto." },
  },
];

// ── THE REAL PLACES ─────────────────────────────────────────────────
const REAL = [
  { key: "castle", stay: 40, type: "free", name: "Castle Museum", lat: 55.70592, lon: 21.12891, hours: LM_WINTER, tier: "Can't Miss Out" },
  { key: "history", stay: 45, type: "free", name: "History Museum of Lithuania Minor", lat: 55.70734, lon: 21.13471, hours: LM_WINTER, tier: "Worth Considering" },
  { key: "clock", stay: 45, type: "free", name: "Clock and Watch Museum", lat: 55.71221, lon: 21.13416, hours: CLOCK, tier: "Highly Recommended" },
  { key: "ghost", stay: 15, type: "free", name: "The Black Ghost", lat: 55.70660, lon: 21.12682, tier: "Highly Recommended", desc: "A dark figure rising out of the water of the old castle harbour." },
  { key: "theatre", stay: 15, type: "free", name: "Theatre Square", lat: 55.70780, lon: 21.13163, tier: "Can't Miss Out" },
  { key: "meridianas", stay: 15, type: "free", name: "Meridianas", lat: 55.71034, lon: 21.13491, tier: "Highly Recommended", desc: "The sailing ship moored by Biržos Bridge." },
  { key: "friedrich", stay: 20, type: "free", name: "Friedrich Passage", lat: 55.70699, lon: 21.13789, tier: "Worth Considering", desc: "A lane of cafés and restaurants off Tiltų street." },
  { key: "sculpture", stay: 30, type: "free", name: "Sculpture Park", lat: 55.71690, lon: 21.14016, tier: "Highly Recommended" },
  { key: "dane", stay: 15, type: "free", name: "Danė Square", lat: 55.71149, lon: 21.13744, tier: "Worth Considering" },
];

// The rows as gemlyx_content would return them, so the planner reads these
// exactly as it reads published places.
export const exampleRows = () => [
  ...REAL.map(p => ({ id: p.key, type: p.type, payload: { name: p.name, country: "LT", __lat: p.lat, __lon: p.lon, __stay: p.stay, tier: p.tier, ...(p.desc ? { desc: p.desc } : {}), ...(p.hours ? { __hours: { hours: p.hours } } : {}) } })),
  ...EXAMPLE_PARTNERS.filter(p => p.inWalks !== false).map(p => ({
    id: p.key, type: p.type,
    payload: { name: p.name, country: "LT", __lat: p.lat, __lon: p.lon, __stay: p.stay, __hours: { hours: p.hours }, __offer: { ...p.offer, until: UNTIL } },
  })),
];

export const isExamplePartner = (id) => EXAMPLE_PARTNERS.some(p => id === `${p.type}:${p.key}`);

// ── MIXED INTO THE LIVE WALK, WHILE THERE ARE FEW REAL PLACES ───────
// Below this many published Klaipėda places the QR walk also reads the
// examples. Eight is about what a six hour walk can use.
export const EXAMPLE_FILL_UNDER = 8;
const nameKey = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// rows: what gemlyx_content returned for the country. Returns the rows to plan
// from, and whether examples are among them.
export const withExampleRows = (rows, country) => {
  const real = Array.isArray(rows) ? rows : [];
  if (country !== "LT") return { rows: real, examples: false };
  const placed = real.filter(r => r?.payload?.name && Number.isFinite(Number(r.payload.__lat ?? r.payload.lat)));
  if (placed.length >= EXAMPLE_FILL_UNDER) return { rows: real, examples: false };
  const taken = new Set(placed.map(r => nameKey(r.payload.name)));
  const extra = exampleRows().filter(r => !taken.has(nameKey(r.payload.name)));
  return { rows: [...real, ...extra], examples: extra.length > 0 };
};
