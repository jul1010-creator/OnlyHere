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

import { NOW_STARTS, SHIP_MARGIN, nowCandidates, scheduleWalk, windowsFor } from "../utils/nowPlanner";

export const KLAIPEDA_EXAMPLES_PATH = "/lithuania/examples";

// Google's weekday lines, the shape the planner reads from a published row.
const WEEK_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const lines = (spans) => WEEK_NAMES.map((d, i) => spans[i] ? `${d}: ${spans[i][0]} to ${spans[i][1]}` : `${d}: Closed`);
const every = (from, to) => ({ 0: [from, to], 1: [from, to], 2: [from, to], 3: [from, to], 4: [from, to], 5: [from, to], 6: [from, to] });

// Winter hours, from 17 September, the season these examples fall in.
const LM_WINTER = lines({ 1: ["10:00", "18:00"], 2: ["10:00", "18:00"], 3: ["10:00", "18:00"], 4: ["10:00", "18:00"], 5: ["10:00", "18:00"] });
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
  { key: "castle", type: "free", name: "Castle Museum", lat: 55.70592, lon: 21.12891, hours: LM_WINTER, tier: "Highly Recommended" },
  { key: "history", type: "free", name: "History Museum of Lithuania Minor", lat: 55.70734, lon: 21.13471, hours: LM_WINTER, tier: "Worth Considering" },
  { key: "clock", type: "free", name: "Clock and Watch Museum", lat: 55.71221, lon: 21.13416, hours: CLOCK, tier: "Highly Recommended" },
  { key: "ghost", type: "free", name: "The Black Ghost", lat: 55.70660, lon: 21.12682, tier: "Highly Recommended" },
  { key: "theatre", type: "free", name: "Theatre Square", lat: 55.70780, lon: 21.13163, tier: "Can't Miss Out" },
  { key: "meridianas", type: "free", name: "Meridianas", lat: 55.71034, lon: 21.13491, tier: "Highly Recommended" },
  { key: "sculpture", type: "free", name: "Sculpture Park", lat: 55.71690, lon: 21.14016, tier: "Highly Recommended" },
  { key: "dane", type: "free", name: "Danė Square", lat: 55.71149, lon: 21.13744, tier: "Worth Considering" },
];

// The rows as gemlyx_content would return them, so the planner reads these
// exactly as it reads published places.
export const exampleRows = () => [
  ...REAL.map(p => ({ id: p.key, type: p.type, payload: { name: p.name, country: "LT", __lat: p.lat, __lon: p.lon, tier: p.tier, ...(p.hours ? { __hours: { hours: p.hours } } : {}) } })),
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
    id: "tuesday",
    title: "Off the ship, four hours",
    moment: "Tuesday 10:30, dry",
    at: "2026-10-13T10:30", from: "terminal", hours: 4, wet: false,
    order: [
      { id: "free:ghost", stay: 15, why: "Five minutes from the gangway, rising out of the old castle harbour." },
      { id: "free:castle", stay: 40, why: "The model of the old town in here makes the streets outside easier to read." },
      { id: "booking:amber", stay: 25, why: "Twenty minutes with a piece of Baltic amber, and you take it home." },
      { id: "free:theatre", stay: 15, why: "Ännchen of Tharau in the middle. Scan the sign and she tells her story." },
      { id: "food:fish", stay: 40, why: "Fish smoked that morning, on Fishermen's Street." },
      { id: "free:meridianas", stay: 15, why: "The town's ship, a last look from the bridge on the way back." },
    ],
  },
  {
    id: "saturday",
    title: "A wet Saturday, six hours",
    moment: "Saturday 11:00, raining",
    at: "2026-10-17T11:00", from: "terminal", hours: 6, wet: true,
    order: [
      { id: "free:castle", stay: 40, why: "The castle site and its finds." },
      { id: "free:ghost", stay: 15, why: "Worth the rain for a few minutes. He looks better wet." },
      { id: "food:tea", stay: 40, why: "Somewhere warm while the worst of the shower passes." },
      { id: "free:history", stay: 45, why: "The story of Lithuania Minor, from when Klaipėda was Memel." },
      { id: "free:post", stay: 20, why: "Write home from a dry table." },
      { id: "free:clock", stay: 60, why: "Clocks from the Renaissance on, and the best room in town for a wet afternoon." },
      { id: "free:meridianas", stay: 15, why: "The town's ship, on the way back down to the river." },
      { id: "booking:amber", stay: 25, why: "Twenty minutes with a piece of Baltic amber, and you take it home." },
      { id: "food:fish", stay: 50, why: "A late lunch, a short walk from the ship." },
    ],
  },
  {
    id: "thursday",
    title: "From the tourist centre, two hours",
    moment: "Thursday 14:00, dry",
    at: "2026-10-15T14:00", from: "centre", hours: 2, wet: false,
    order: [
      { id: "food:bakery", stay: 20, why: "Coffee first, a few doors up the street." },
      { id: "free:clock", stay: 40, why: "Open until 20:00 on Thursdays, so there is no rush." },
      { id: "free:sculpture", stay: 20, why: "116 sculptures in what was the town's cemetery until 1959." },
    ],
  },
  {
    id: "friday",
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
];

// ── GUIDES IN FOUR LANGUAGES ────────────────────────────────────────
// What a published entry reads like, in the reader's language. The three
// museums and the park say only what data/klaipedaDemo.js checked. The fourth
// is a partner's own page, made up like the partner.
export const GUIDE_LANGS = ["en", "lt", "de", "da"];
export const GUIDE_LANG_NAMES = { en: "English", lt: "Lietuvių", de: "Deutsch", da: "Dansk" };
export const GUIDE_LABELS = {
  en: { find: "Gemlyx find", tip: "Good to know", offer: "Gemlyx partner", example: "Example" },
  lt: { find: "Gemlyx atradimas", tip: "Verta žinoti", offer: "Gemlyx partneris", example: "Pavyzdys" },
  de: { find: "Gemlyx-Fund", tip: "Gut zu wissen", offer: "Gemlyx-Partner", example: "Beispiel" },
  da: { find: "Gemlyx-fund", tip: "Godt at vide", offer: "Gemlyx-partner", example: "Eksempel" },
};

export const EXAMPLE_GUIDES = [
  {
    id: "castle", name: "Castle Museum", meta: "Priešpilio g. 2 · €6",
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
    id: "clock", name: "Clock and Watch Museum", meta: "Liepų g. 12 · €5",
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
    id: "sculpture", name: "Sculpture Park", meta: { en: "Free · open at all hours", lt: "Nemokamai · atvira visą parą", de: "Eintritt frei · immer offen", da: "Gratis · altid åbent" },
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
    id: "fish", name: "Rūkykla Marios", meta: { en: "Žvejų g. · lunch from €9", lt: "Žvejų g. · pietūs nuo 9 €", de: "Žvejų g. · Mittag ab 9 €", da: "Žvejų g. · frokost fra 9 €" }, partner: true,
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
  const candidates = nowCandidates(exampleRows(), { country: "LT", zone: "Europe/Vilnius", now });
  const budget = ex.hours * 60;
  const margin = start.ship ? SHIP_MARGIN : 0;
  const walk = scheduleWalk(ex.order, candidates, { country: "LT", start, startClock, budget, margin });
  const kept = new Set(walk.stops.map(s => s.id));
  const left = ex.order.filter(o => !kept.has(o.id)).map(o => {
    const c = candidates.find(x => x.id === o.id);
    const shut = c?.hours && Array.isArray(windowsFor(c.hours, startClock.day)) && windowsFor(c.hours, startClock.day).length === 0;
    return { id: o.id, name: c?.name || o.id, reason: shut ? `Closed on ${DAY_OF[startClock.day]} at this time of year` : "Left out to keep time for the way back" };
  });
  return {
    walk: { start: { name: start.name, lat: start.lat, lon: start.lon, ship: !!start.ship }, weather: { wet: !!ex.wet }, margin, ...walk },
    left, startClock,
  };
};
