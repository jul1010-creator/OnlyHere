// ── THE BUDGET IS COMPUTED NOW, NOT TYPED ───────────────────────────
//
// Oliver, 25 Sep 2026: "remove this and put up the budget thing on the right
// side that I told you earlier. Make a darkening of everything that can change
// the budget. So you have to click on the screen 'enable budget-estimate' or
// something. Like a lockout."
//
// That retires the field he asked for this morning, and it is the better half
// of his own earlier idea: "make more options and make Gemlyx predict the
// budget WHILE they tick off." A typed figure asked a traveller to price a
// country they have not been to. The ticks ask them what they want, which is a
// question they can answer, and the pricing is ours.
//
// It also answers the floor. The field needed a minimum of 300 kr because
// somebody could type 200 and get a plan that could not house them for a
// night. Nothing needs refusing here: the bed is IN the figure by
// construction, so the number can no longer be one that cannot buy one.
//
// ── EVERY NUMBER BELOW IS SOMEBODY ELSE'S, AND SAYS WHOSE ───────────
//
// The standard is the one mealsEstimate.js set and it is not negotiable here:
// a price a named seller charges, on a stated day, or a body that publishes
// the figure. No averages of Gemlyx's own library, which is a sample of places
// Oliver found interesting rather than a sample of Danish prices.
//
// THE FOOD HALF IS NOT RE-PRICED HERE. tierDayRate already answers what a day
// of each tier costs, with its own sources and its own answer to how many
// times a day somebody eats. A second set of meal numbers in this file is the
// two-readers failure that has cost this codebase more than anything else.
//
// ── AND WHAT IT DOES NOT COVER IS NAMED ─────────────────────────────
//
// A bed and food are the two costs that fall every day whatever the trip does.
// Getting between towns and getting into places do not: one depends on a route
// that has not been built yet and the other on stops nobody has chosen. The
// guide prices both later, per trip, off real figures. See tripEstimate in
// utils/costLedger.js.
//
// So this states its own edges rather than quietly bundling a guess into the
// total. An estimate that says what it leaves out is worth more than a bigger
// one that does not.

import { tierDayRate, foodTier, GROCERY_DAY, MEALS_A_DAY_DEFAULT } from "./mealsEstimate";
import { stayIsBooked } from "./stayChoice";
// The one reader of what a kilometre costs. fuel.js holds the pump price and
// the consumption figure with their own sources, and a second copy of either
// here is how two halves of one app come to disagree about the same drive.
import { fuelCost } from "./fuel";
import { travelModeKey, MODE_DAY_KM } from "./routeOrder";
// The one reader of how many people are coming. costLedger.js already parses
// that free-text box, refuses a number that is not a headcount, and caps the
// party. A second parse of the same sentence here is the failure this codebase
// keeps paying for.
import { partyOf } from "./costLedger";
// The one reader of what day a string names. It returns null rather than a
// guess for anything it cannot parse, which is what a season needs: a date
// nobody can read must not quietly become July.
import { dayStart } from "./calendarDay";

const clean = (s) => String(s ?? "").trim();

// ── WHAT A BED COSTS, PRICED AT THE SELLERS ─────────────────────────
//
// Per person per night, which is the unit the figure is shown in.
//
// ── AND THE CHEAPEST BED IN DENMARK IS A BUNK, NOT A ROOM ───────────
//
// Oliver, 26 Sep 2026, on the panel reading 310 to 410 kr a day for one town,
// public transport, cheapest bed, cheapest food and free attractions only:
// "you can get hostels for 110 dkk.. and we put food at 60 dkk. And I clicked
// only free attractions.. how is that 310-410 dkk? I get you can say 200-300..
// but 310-410? Who is calculating this???"
//
// The arithmetic was right and the input was wrong, which is the worse of the
// two faults. This tier priced every party of two or more at a private room
// split between them: CABINN's 575 a room became 288 a head, and that is what
// a couple pays for a door that locks. Two backpackers on the cheapest tier
// take two dorm beds, and a dorm bed is published at 145.
//
// The one-person row had already been bent to admit this. Its low end was set
// to 200 rather than the 550 Danhostel charges for a single, with a comment
// saying a solo traveller on this tier takes a dorm. That was the right fact
// in the wrong place: it fixed one row and left the same untruth in the other
// four. A dorm bed is now its own price and every row can reach it.
//
// CHEAPEST NOW BUYS WHICHEVER IS CHEAPER, beds one at a time or the smallest
// room that holds the party, and the band is that cheaper option across the
// season. See bedPerNight. Which of the two it lands on is worth reading and
// is reported rather than hidden: a pair is dorm beds at both ends of the
// band, and a family of four is dorm beds at the bottom and one family room at
// the top, because a room stops rising once the beds keep going.
//
// BEST LOCATION is a real room in the middle of town, and it is the softer of
// the two. No Danish body publishes an average room rate a traveller can cite:
// HORESTA's market figures sit inside embedded charts and Danmarks Statistik
// publishes nights sold rather than what they sold for. So it rests on two
// independent estimates that agree: traveller-reported spend putting a Danish
// double at about 1,215 a room, and a Copenhagen price guide putting a central
// mid-range room at 1,200 to 1,800. That is 600 to 900 a head.
//
// ALREADY BOOKED is nothing, and it is the only certain number in this file.

// ── AND WHICH SEASON THEY ARE COMING IN ─────────────────────────────
//
// Oliver, 26 Sep 2026: "Obviously the season also will affect the estimate.."
//
// It already did, and that is the fault. Every bed figure in this file is a
// band because Danhostel publishes two prices for the same room, and the two
// ends of that band are June and March. So the panel was showing a season
// without saying it was showing one, which is the same fault the dorm was: a
// number nobody can argue with because nothing on screen says what moved it.
//
// THE MONTHS ARE THE SELLER'S OWN, not a guess about Danish weather. Danhostel
// Nykobing Mors publishes its seasons on the same price page the room curve
// came from: high season 1 June to 31 August, low season 1 March to 31 May and
// 1 September to 30 November, 100 kr apart on every room size.
//
// AND DECEMBER TO FEBRUARY IS NOT ON THAT LIST AT ALL, which is a fact rather
// than a gap. A Danish hostel in January is shut, or open on request, and the
// ones that do open are not charging a June price. Priced at low season and
// said out loud, because the honest answer to "what does a bed cost in
// January" is that the seller will not quote you one.
export const BED_SEASON = {
  high: [6, 7, 8],
  low: [3, 4, 5, 9, 10, 11],
  winter: [12, 1, 2],
  step: 100,
  source: "https://danhostelmors.dk/priser/",
  checkedAt: "2026-09-26",
  says: "Danhostel Nykobing Mors publishes its own seasons: high is 1 June to 31 August and low is 1 March to 31 May and 1 September to 30 November, with 100 kr between them on every room size. Its list does not price December to February at all, which is what a Danish winter does to a hostel.",
};

// ── AND THIS IS NOT seasonFit's seasonOf, ON PURPOSE ────────────────
//
// seasonFit.js already answers a season question and it is a different one:
// whether the place somebody is being offered will be open and worth the trip,
// which in Denmark is May to September because that is when seasonal venues
// open and close. This one is what a bed costs, and the seller publishes June
// to August for that. Two facts that both sound like "the season" and do not
// share a boundary, so they are named apart rather than made to share a reader.
// Collapsing them would put a May price on an August bed.
//
// Which of the three a date falls in, or null when there is no date to read.
// Null is the answer that keeps the whole band on screen, and it is the right
// one: a traveller who has not said when they are coming should see June and
// March at once rather than whichever the code picked for them.
export const bedSeasonOf = (when) => {
  const day = dayStart(when);
  if (!day) return null;
  const m = day.getMonth() + 1;
  if (BED_SEASON.high.includes(m)) return "high";
  if (BED_SEASON.winter.includes(m)) return "winter";
  return BED_SEASON.low.includes(m) ? "low" : null;
};

// What the season does to a band whose two ends are the two seasons. A known
// season is one of them rather than a span across both; an unknown season is
// the span, which is what the panel showed before it could read a date.
//
// Winter takes the low-season figure. The seller does not publish one, and the
// alternative is refusing to price a January trip at all, which helps nobody.
const inSeason = (band, season) =>
  season === "high" ? { low: band.high, high: band.high }
  : season ? { low: band.low, high: band.low }
  : band;

// ── A DORM BED, PUBLISHED BY TWO SELLERS WHO AGREE ──────────────────
//
// Next House Copenhagen publishes a bed in a six-person dorm from 145 kr and
// one in a four-person dorm from 165, on its own front page. Steel House
// Copenhagen publishes from 145 for a dorm bed on its own front page too. Two
// sellers, independently, at the same number.
//
// THE TOP OF THE BAND IS BUILT FROM PUBLISHED FIGURES RATHER THAN GUESSED. The
// 145 is the six-bed low-season price, so the dear end is the four-bed one at
// 165 plus the 100 kr Danhostel's own price list puts between its low and high
// season on its cheapest room. Danhostel also charges 75 for linen and two
// towels, which is the part nobody expects and which sits on top of this.
// THE BAND HAS TWO DIMENSIONS AND THEY ARE KEPT APART. 145 to 165 is the size
// of the room, six beds against four. The 100 on top is the season, and it is
// Danhostel's published step rather than a markup invented here. Holding them
// separately is what lets a known arrival date narrow the figure instead of
// widening it: see seasonOf and bedPerNight.
export const DORM_KR = {
  low: 145,
  high: 165,
  peak: BED_SEASON.step,
  source: "https://www.nexthousecopenhagen.com/hostel-copenhagen",
  checkedAt: "2026-09-26",
  says: "Next House Copenhagen publishes a bed in a six-person dorm from 145 kr and a four-person dorm from 165, and Steel House Copenhagen publishes from 145 as well. Those are low-season prices, so high season adds the 100 kr Danhostel puts between its own two seasons, and some sellers charge 75 more for linen and two towels on top of that.",
};

// The dorm band for a season. Low and winter are what the two sellers publish;
// high season adds the step, to both ends, because a season moves a price list
// rather than stretching it.
export const dormBand = (season) => {
  const up = season === "high" ? DORM_KR.peak : 0;
  const band = { low: DORM_KR.low + up, high: DORM_KR.high + up };
  // An unknown season is both seasons at once, which is the honest span and is
  // what the panel shows until a date exists.
  return season ? band : { low: DORM_KR.low, high: DORM_KR.high + DORM_KR.peak };
};

// ── AND A ROOM IS NEARLY STATIC ─────────────────────────────────────
//
// Oliver, 25 Sep 2026, on the car: "if you're 3 people, then obviously car
// won't move in price.. It's static.."
//
// Right, and once said out loud it is the wrong assumption in two places, not
// one. A room is bought by the ROOM, and Danhostel Nykobing Mors publishes what
// that really means by size, which is the clearest evidence in this file:
//
//   Low season  550 (1p)  600 (2p)  675 (3p)  700 (4p)  750 (5p)
//   High season 650       700       775       800       850
//
// A third person adds 75 kr to a room, not half of it again. So the per-head
// figure falls off a cliff as the party grows, 550 alone against 150 for five,
// and a panel that divided one fixed "per person" number by nothing was telling
// a family of four almost twice what their beds cost.
//
// PRICED PER ROOM HERE, DIVIDED AT THE END. The whole point of his correction
// is that some costs do not answer to the headcount, so they are held as party
// costs for as long as possible and turned into a per-person figure once, in
// one place, where the division can be seen.
//
// Danhostel's published figures, unbent. The single is 550 because that is what
// a single costs; a solo traveller who wants a bed rather than a room gets one
// from DORM_KR above, which is where that fact belongs.
export const ROOM_KR = {
  1: { low: 550, high: 650 },
  2: { low: 575, high: 700 },
  3: { low: 675, high: 775 },
  4: { low: 700, high: 800 },
  5: { low: 750, high: 850 },
};
// Past five, another room. A Danish hostel's largest published room is five,
// and pretending a party of eight fits in one would price them at nothing.
export const ROOM_SLEEPS_MAX = 5;

// A hotel room sleeps two, so a party of three takes two of them and pays for
// four beds. That is what makes the middle tier behave differently from the
// hostel one: the hostel's curve rewards a big party and the hotel's does not.
export const HOTEL_SLEEPS = 2;

export const BED_TIERS = {
  cheapest: {
    perRoom: (heads) => ROOM_KR[Math.min(Math.max(1, heads), ROOM_SLEEPS_MAX)],
    // The thing this tier was missing. A hostel sells beds as well as rooms,
    // and on the cheapest tier the bed is usually the answer.
    perBed: (heads, season) => dormBand(season),
    sleeps: ROOM_SLEEPS_MAX,
    source: DORM_KR.source,
    checkedAt: "2026-09-26",
    says: `${DORM_KR.says} A room is the other way to buy it: Danhostel publishes 600 to 700 for a double, rising only 50 to 75 kr for each extra bed, so a big party is better off in one room than in separate beds. Whichever is cheaper is what this counts.`,
  },
  best: {
    perRoom: () => ({ low: 1200, high: 1800 }),
    sleeps: HOTEL_SLEEPS,
    source: "https://www.budgetyourtrip.com/denmark",
    checkedAt: "2026-09-25",
    says: "A Danish double at about 1,215 kr a room on traveller-reported spend, and a central Copenhagen mid-range room at 1,200 to 1,800. A room sleeps two, so a third person is a second room. No Danish body publishes a room rate to cite, so this is the softest figure here.",
  },
  booked: {
    perRoom: () => ({ low: 0, high: 0 }),
    sleeps: 1,
    source: "",
    checkedAt: "",
    says: "You have paid for it already, so it is not in this figure.",
  },
};

// What the whole party pays for its beds in a night, before anybody divides it.
//
// ── THE CHEAPER OF THE TWO WAYS TO BUY IT, AT EACH END ──────────────
//
// A tier that sells beds as well as rooms is priced at whichever costs less,
// because that is what somebody asking for the cheapest bed in the country
// buys. The two ends can land on different arrangements and that is the
// interesting part rather than a wrinkle: beds do not get cheaper in a crowd
// and a room nearly stops rising, so a big party crosses over from one to the
// other somewhere inside the band. Both ends say which they are, so the
// sentence under the figure can tell the traveller.
export const bedPerNight = (stay, heads = 2, season = null) => {
  const tier = BED_TIERS[clean(stay)];
  if (!tier) return null;
  const people = Math.max(1, Math.floor(Number(heads)) || 1);
  const rooms = Math.ceil(people / tier.sleeps);
  // Everybody in full rooms but the last, which takes whoever is left. A party
  // of six in hostel rooms is a five and a one, and the one pays a single.
  const inLast = people - (rooms - 1) * tier.sleeps;
  // ── AND THE ROOM TABLE'S TWO ENDS ARE THE TWO SEASONS ─────────
  // 550 and 650 are not a spread around a single room's price, they are March
  // and July off the same published list. So a known season picks one of them
  // and an unknown season keeps both, which is inSeason's whole job.
  const full = inSeason(tier.perRoom(tier.sleeps), season);
  const last = inSeason(tier.perRoom(inLast), season);
  const byRoom = {
    low: (rooms - 1) * full.low + last.low,
    high: (rooms - 1) * full.high + last.high,
  };
  const bed = tier.perBed ? tier.perBed(people, season) : null;
  const byBed = bed ? { low: bed.low * people, high: bed.high * people } : null;
  return {
    low: byBed ? Math.min(byRoom.low, byBed.low) : byRoom.low,
    high: byBed ? Math.min(byRoom.high, byBed.high) : byRoom.high,
    rooms,
    // Which arrangement each end landed on, reported rather than inferred by
    // whoever writes the sentence. A second reader working this out from the
    // numbers is the failure this codebase keeps paying for.
    lowIsBeds: !!byBed && byBed.low <= byRoom.low,
    highIsBeds: !!byBed && byBed.high <= byRoom.high,
    // Which season this was priced in, or null for both at once. Carried out
    // rather than worked out again by whoever writes the sentence.
    season: season || null,
    per: "party",
    source: tier.source,
    says: tier.says,
  };
};





// ── AND GETTING THERE, WHICH TWO ROWS DECIDE BETWEEN THEM ───────────
//
// Oliver, 25 Sep 2026, looking at the panel: "Shouldn't this change too? If you
// decide to travel to another part of Zealand, then you might add.. no?
// Calculating flixbus/kombardo/orange, that will be a small extra." Then, a
// minute later: "Bike Walking Public transport Car this also changes budget.."
//
// Both right, and together they catch something worse than a missing number.
// Those two rows sat inside a lockout whose whole promise is "everything that
// can change the budget", and neither of them changed it. A control behind
// that switch that moves nothing is the switch lying about what it covers.
//
// THE COST IS A PRODUCT OF THE TWO ROWS AND NEITHER ALONE. How far they want
// to go says how OFTEN they move. How they get around says what a move COSTS.
// Exploring by bike is nearly free and exploring by car crosses a toll bridge,
// and no single row can tell those apart.
//
// ── HOW OFTEN, WHICH IS THE ASSUMPTION AND IS SAID OUT LOUD ─────────
//
// Staying in one town, never. Exploring, a hop every second day: that is what
// the word means, and a figure resting on it should say so rather than present
// itself as measured. An island is the one that does not fit a daily rate at
// all, and it is handled below.
export const HOPS_PER_DAY = { town: 0, explore: 0.5 };

// ── WHAT ONE HOP COSTS, PER PERSON ──────────────────────────────────
//
// PUBLIC TRANSPORT is the best sourced thing in this file, because DSB
// publishes it. Copenhagen to Aarhus, the longest hop anybody makes here, is
// an Orange ticket from 119 kr on DSB's own route page and 99 to 199 in
// practice, against 400 to 500 walking up on the day. Flixbus and Kombardo
// Expressen undercut the train on the same route, so the low end is if
// anything generous. Most hops are shorter than this one.
//
// A CAR is priced rather than quoted, off fuel.js and a toll. A hop between
// two Danish regions runs about 150 km, which fuel.js turns into litres and
// kroner at the pump price it already holds.
//
// AND THE BRIDGE IS THE PART NOBODY EXPECTS. Storebælt is 205 kr one way with
// a BroBizz and 235 paying by card, per CAR, in 2026. A trip that crosses
// between Zealand and the rest of the country pays it twice, and a traveller
// who has budgeted petrol has almost never budgeted that.
//
// A CAR COST IS PER CAR AND THE FIGURE IS PER PERSON, so it is halved for two
// sharing, the same halving the hotel rows already make and for the same
// reason. Somebody driving alone pays the whole car, and the sentence says so.
export const STOREBAELT = {
  bizz: 205, cash: 235,
  source: "https://storebaelt.dk/priser-rabatter/privat/",
  checkedAt: "2026-09-25",
  says: "205 kr one way with a BroBizz and 235 by card in 2026, per car. A trip between Zealand and the rest of Denmark pays it both ways.",
};

export const TRAIN_HOP = {
  low: 99, high: 199, walkUp: 450,
  source: "https://www.dsb.dk/togture-i-danmark/kobenhavn-aarhus/",
  checkedAt: "2026-09-25",
  says: "DSB sells Copenhagen to Aarhus, the longest hop in the country, as an Orange ticket from 119 kr, and 99 to 199 in practice against 400 to 500 walking up on the day. Flixbus and Kombardo Expressen undercut it on the same route.",
};

// A typical hop between two Danish regions. Not a measured route: the panel
// knows nothing about where they are going yet, and the guide measures the
// real one later. Stated as the assumption it is.
export const HOP_KM = 150;

// ── AND A CROSSING, WHICH IS NOT A DAILY RATE ───────────────────────
//
// An island trip is one crossing out and one back, whatever its length, so
// folding it into a figure per day would need a trip length the panel does not
// always have and would price a fortnight on Aero as cheaper per day than a
// weekend on it. It is named as an extra on top instead, with what a crossing
// really costs.
//
// PUBLISHED, BOTH OF THEM, on the operators' own 2026 price pages. Aero is 68
// for a foot passenger, 25 for a bicycle and 142 for a car under six metres.
// The Aarhus to Samso fast ferry is 112 on foot and 37 with a bike. Bornholm
// and the long crossings run higher, which is why this is a band and why the
// guide prices the real one once it knows which island.
export const FERRY_FARE = {
  footLow: 68, footHigh: 112, bikeLow: 25, bikeHigh: 37, carLow: 142,
  source: "https://aeroe-ferry.dk/en/prices",
  checkedAt: "2026-09-25",
  says: "Aero charges 68 kr for a foot passenger, 25 for a bicycle and 142 for a car under six metres. The Aarhus to Samso fast ferry is 112 on foot. Bornholm and the long crossings run higher.",
};

// travelModeKey, not a set of strings written here: the chips read "🚗 Car"
// and free text reads "jeg korer i bil", and that function is already the one
// thing in this app that knows they are the same answer.
//
// SEVERAL TICKED MEANS THE DEAREST ONE PAYS, which is the opposite of how
// routeOrder picks a mode for distance and is right for the same reason.
// Somebody with a car and a bike drives the long hops, so the car is what the
// hops cost, and tickedTravelMode already picks the fastest, which here is
// also the dearest.
const MODE_ORDER = ["car", "camper", "public transport", "bike", "walk"];
export const movingMode = (transport) => {
  const list = Array.isArray(transport) ? transport : [transport];
  const keys = [...new Set(list.map(t => travelModeKey(t)).filter(Boolean))];
  if (!keys.length) return null;
  return MODE_ORDER.find(k => keys.includes(k)) || keys[0];
};

// Per person, for one hop between towns. Null when the mode cannot make one:
// nobody walks between Danish towns, and pricing it at nothing would say a
// walking tour of the country is free rather than that it is not a trip.
// ── HELD AS WHAT IT IS, NOT DIVIDED HERE ────────────────────────────
//
// A train ticket is bought per person and a tank of petrol is bought per car,
// and the difference is the whole of Oliver's correction. So each cost says
// which it is and the division happens once, at the end, where it can be seen.
// The first version divided inside this function and defaulted to two, which
// is how a party of three got told a car cost them more than it does.
export const hopCost = (mode) => {
  const key = travelModeKey(mode) || mode;
  if (key === "walk") return null;
  if (key === "bike") {
    return { low: 0, high: 0, per: "person", says: "Your own legs, so a hop costs nothing but the day it takes." };
  }
  if (key === "public transport") {
    return { low: TRAIN_HOP.low, high: TRAIN_HOP.high, per: "person", says: TRAIN_HOP.says, source: TRAIN_HOP.source };
  }
  if (key === "car" || key === "camper") {
    const fuel = fuelCost({ measuredKm: HOP_KM });
    const petrol = fuel?.kr ?? 0;
    return {
      low: petrol,
      // The dear end of a car hop is the one that crosses the belt, and it is
      // the whole reason this branch is worth having.
      high: petrol + STOREBAELT.cash,
      per: "party",
      says: `About ${petrol} kr of petrol for a ${HOP_KM} km hop. ${STOREBAELT.says} A car costs the same whoever is in it, so this is the one that gets cheaper the more of you there are.`,
      source: STOREBAELT.source,
    };
  }
  return null;
};

// ── AND EXPLORING NEEDS SOMETHING THAT COVERS THE DISTANCE ──────────
//
// Oliver, 25 Sep 2026: "if someone picks 'explore Denmark' then transport HAS
// TO ADD public transport or car. You can still include bicycle. But you need
// one of those two."
//
// Half of that is right and the half that is not is worth writing down,
// because he asked the question himself a minute later: "You can't bicycle
// from Copenhagen to Aalborg.. do you think? Or I guess some might want to do
// that?"
//
// They can, and it is not a fringe thing. VisitDenmark promotes eleven signed
// NATIONAL cycle routes, and N2 is literally "Hanstholm - Kobenhavn", 439 km
// from north-west Jutland to the capital. N3, the Haervejsruten, runs 449 km
// up the spine of Jutland from Padborg to Frederikshavn. This app already
// plans for it: MODE_DAY_KM puts a bike at 60 km a day, so a route like that
// is a week of riding rather than an impossibility, and modeReachKm already
// stops a cyclist being offered somewhere 400 km away for an afternoon.
//
// So a hard rule would have refused one of the more Danish trips there is.
//
// ── WHICH LEAVES THE HALF THAT IS RIGHT ─────────────────────────────
//
// Exploring with NOTHING ticked is the real problem, and it is a different
// one: the planner has no idea how fast this person moves, so it cannot build
// a route at all and cannot cost one. That gets asked.
//
// Bike only gets a SENTENCE rather than a refusal. It is a cycle tour, it
// covers less ground, and saying so is worth more than a wrong "no".
export const LONG_HAUL_MODES = ["public transport", "car", "camper"];

export const movingProblem = (scope, transport) => {
  if (clean(scope) !== "explore") return null;
  const keys = (Array.isArray(transport) ? transport : [transport])
    .map(t => travelModeKey(t)).filter(Boolean);
  if (keys.length) return null;
  return { say: "Exploring Denmark means moving between towns, so say how: public transport, a car, or a bike if you are riding it." };
};

// Not a problem, and not shown as one. A cyclist reading a warning about their
// own plan learns nothing; a cyclist reading how far a day's riding goes can
// decide whether the trip they want fits the days they have.
export const movingNote = (scope, transport) => {
  if (clean(scope) !== "explore") return null;
  const keys = (Array.isArray(transport) ? transport : [transport])
    .map(t => travelModeKey(t)).filter(Boolean);
  if (!keys.length || keys.some(k => LONG_HAUL_MODES.includes(k))) return null;
  if (!keys.includes("bike")) return null;
  return {
    say: `A cycle tour, then. Denmark has eleven signed national routes and the long ones run 400 km and more, so reckon on about ${MODE_DAY_KM.bike} km a day and a trip that covers less ground than the same days in a car. Add public transport as well if you would rather ride some days and train the others.`,
  };
};


// ── AND WHICH OF THEM FITS THE TRIP THEY JUST DESCRIBED ─────────────
//
// Oliver, 25 Sep 2026: "transport has to be under 'How far do you want to
// go'.. what transport is recommended. Public transport and Bike is obviously
// recommended most places. And staying in one place is always a major place
// like Aalborg, Copenhagen, Aarhus, or Odense."
//
// The second half is the part that makes this answerable. A one-town trip is
// not a trip to any of the 31 towns Gemlyx publishes: somebody who wants a
// whole holiday in one place picks a city with enough in it, which in Denmark
// is a very short list. And in those four a car is the worst answer available.
// Copenhagen's centre is a zone system with paid street parking, the other
// three are compact enough to cross on foot, and every one of them has a metro,
// a letbane or a bus network a visitor can use from their phone.
//
// AN ISLAND IS THE CLEAREST CASE OF THE FOUR. Taking a car across costs 142 kr
// each way on Aero against 25 for a bicycle, and the islands worth a week are
// the ones people cycle.
//
// EXPLORING IS THE ONLY ONE THAT WANTS A CAR OR A TRAIN, and it wants one of
// them rather than preferring either: movingProblem already says so.
//
// ── A RECOMMENDATION, NOT A RESTRICTION ─────────────────────────────
//
// Every chip stays pickable in every scope. Somebody driving to Copenhagen
// with a boot full of camping gear has a reason this panel cannot see, and a
// form that greys out their answer has stopped asking and started deciding.
// The mark says what most people do; the tick is still theirs.
export const RECOMMENDED = {
  town: {
    modes: ["public transport", "bike"],
    why: "A one-town trip means somewhere with enough in it for the week, so Copenhagen, Aarhus, Odense or Aalborg. All four are walkable in the middle and have a metro, a letbane or buses you can use from your phone, and a car in any of them is parking charges and a zone map you did not come here for.",
  },
  island: {
    modes: ["bike"],
    why: "Islands are what Denmark does best on two wheels, and the ferry agrees: Aero charges 25 kr for a bicycle and 142 for a car.",
  },
  explore: {
    modes: ["public transport", "car"],
    why: "Crossing the country needs one of these. A train is cheaper on your own and a car is cheaper once there are three of you, since the petrol and the bridge cost the same whoever is in it.",
  },
};

export const recommendedModes = (scope) => RECOMMENDED[clean(scope)]?.modes || [];
export const recommendedWhy = (scope) => RECOMMENDED[clean(scope)]?.why || "";

// Whether a particular chip is one of them. Takes the chip's own label, so the
// panel does not have to know that "🚆 Public transport" is a mode key.
export const isRecommended = (scope, chip) => {
  const key = travelModeKey(chip);
  return !!key && recommendedModes(scope).includes(key);
};

// ── WHAT THE FIGURE IS NOT ──────────────────────────────────────────
//
// Named, one line each, in the order somebody would miss them. The free-only
// tick moves the first of these from an unknown to a zero, which is the one
// case where a tick makes the estimate MORE complete rather than cheaper.
export const EXCLUDED = {
  entry: "getting into places",
  travel: "getting between towns",
  // Buses and metros inside one town, which is the one travel cost this cannot
  // reach: a Copenhagen City Pass is 160 kr a day and most Danish town centres
  // are walkable, and the panel does not know which town yet.
  local: "buses and metros inside a town",
  flights: "flights",
};

// ── THE ESTIMATE ────────────────────────────────────────────────────
//
// A BAND, never a single number, and that is the honest shape rather than a
// hedge. Every part of it is a band at the source: a room is 600 to 700 by
// season, a durum is 53 to 87. Collapsing those into one figure would invent a
// precision nobody measured, and a traveller who budgets to a midpoint and
// meets the top of the band is the person this whole panel exists to protect.
//
// AND IT COUNTS UP FROM ZERO. `ready` says whether it is a whole day yet;
// the figure is there from the first tick either way, so somebody can see what
// their clicking is doing. See the block inside.
export const estimateDay = ({ stay = "", food = "", freeOnly = false, scope = "", transport = [], travellers = "", heads = null, meals = MEALS_A_DAY_DEFAULT, arrival = "" } = {}) => {
  // ── HOW MANY OF THEM, READ ONCE ─────────────────────────────────
  //
  // partyOf, not a second parse of the same sentence: it already refuses a
  // number that is not a headcount ("2 weeks with friends" is not two people)
  // and caps the party. An unreadable box falls back to two and the sentence
  // says so, because two is the commonest trip and a silent assumption is the
  // thing this whole panel exists to stop.
  const said = partyOf(travellers);
  const people = Math.max(1, Math.floor(Number(heads ?? said?.heads ?? 2)) || 1);
  const counted = !!(heads ?? said?.heads);

  // ── AND WHEN THEY ARE COMING, WHICH THE PANEL ALREADY KNOWS ─────
  //
  // Oliver, 26 Sep 2026: "Obviously the season also will affect the estimate.."
  //
  // The arrival date is two rows up the same panel, so there was nothing to
  // ask for: it just was not being read. A date that says June prices June, a
  // date that says March prices March, and no date at all keeps both ends of
  // the band on screen with the sentence saying which is which.
  //
  // Only the BED takes a season. A durum costs the same in February, and
  // tierDayRate's band is a counter price rather than a seasonal one, so
  // pushing a season through the food half would invent a movement nobody
  // published.
  const season = bedSeasonOf(arrival);
  const bed = clean(stay) ? bedPerNight(stay, people, season) : null;
  const tier = clean(food) ? foodTier(food) : null;
  // ── A CONTRADICTION IS NOT A FIGURE ─────────────────────────────
  // Asked before anything is added up. Exploring with no way to cross the
  // country is a trip nobody can take, and putting a confident daily cost on
  // it would be the panel agreeing to plan it. This is the ONE state with no
  // number at all, because the number would be about a trip nobody can take.
  const cannot = movingProblem(scope, transport);
  if (cannot) return { ready: false, need: [], problem: cannot, low: null, high: null, parts: [] };

  // ── AND EVERYTHING ELSE COUNTS FROM ZERO UPWARDS ────────────────
  //
  // Oliver, 25 Sep 2026: "remember budget has pop up instantly like 0. So it
  // doesn't pop up after it's all picked."
  //
  // The first version showed nothing until both halves were answered, on the
  // argument that half a day's costs shown as a day's reads as complete. He is
  // right that the cure was worse: a figure that appears out of nowhere on the
  // fourth click never shows anybody what their clicking is doing, which is
  // the whole reason the panel replaced a typed field.
  //
  // So it counts up from zero and SAYS what is still missing. Both facts are
  // on screen at once, which is what the first version could not manage.
  const rate = tier ? tierDayRate(tier.key, meals) : null;
  const foodLow = !tier ? 0 : (rate == null ? Math.round(GROCERY_DAY.kr / 3) : rate);
  const foodHigh = !tier ? 0 : (rate == null ? GROCERY_DAY.kr : Math.round(rate * 1.6));

  const raw = [];
  if (bed) raw.push({ what: "a bed", low: bed.low, high: bed.high, per: "party", rooms: bed.rooms, source: bed.source, says: bed.says });
  if (tier) raw.push({ what: "food", low: foodLow, high: foodHigh, per: "person", source: tier.source || "", says: tier.basis || "" });

  // ── GETTING BETWEEN TOWNS ───────────────────────────────────────
  // Only where the scope says they move at all, and only priced where the
  // mode is known. Staying in one town adds nothing, which is the honest
  // answer rather than a small number for the look of it.
  const mode = movingMode(transport);
  const hops = HOPS_PER_DAY[clean(scope)];
  const hop = mode ? hopCost(mode) : null;
  if (hops > 0 && hop) {
    raw.push({
      what: "getting between towns",
      low: hop.low * hops,
      high: hop.high * hops,
      per: hop.per,
      source: hop.source || "",
      says: `${hop.says} Counted at a hop every second day, which is what exploring means here.`,
    });
  }

  // ── AND THE ONE DIVISION, WHERE IT CAN BE SEEN ──────────────────
  // A party cost becomes a person cost exactly here and nowhere else.
  const parts = raw.map(p => ({
    ...p,
    low: p.per === "party" ? Math.round(p.low / people) : Math.round(p.low),
    high: p.per === "party" ? Math.round(p.high / people) : Math.round(p.high),
    partyLow: p.low, partyHigh: p.high,
  }));

  // ── AND NO CROSSING, WHICH IS THE WHOLE POINT OF THAT OPTION ────
  //
  // 25 Sep 2026. This used to add a return ferry fare whenever the scope was
  // the middle one, on the strength of its old label, "Stay on one island".
  // That was backwards: the option exists to keep a boat OUT of the trip, and
  // its own sentence says so. The estimate was charging a traveller for the
  // one thing they had just asked not to do.
  //
  // Caught by Oliver asking what the label meant rather than by anything here,
  // which is the argument for a label that says what it does: the code read
  // the word on the chip and the word was wrong.
  //
  // A ferry a traveller chooses anyway is not free, and it is not this
  // panel's to guess at either: it depends on which island, and the guide
  // prices the real crossing once it knows. FERRY_FARE stays, because that is
  // what it is for.

  const excludes = [
    freeOnly ? "" : EXCLUDED.entry,
    // Named only where it is not already in the figure. Saying a total leaves
    // out what it just added is how an honest list stops being read.
    hops > 0 && hop ? "" : EXCLUDED.travel,
    EXCLUDED.local,
    EXCLUDED.flights,
  ].filter(Boolean);

  return {
    // READY MEANS COMPLETE, not "has a number". The figure is always there and
    // this says whether it is the whole of a day yet, so the panel can show
    // both at once instead of choosing between them.
    ready: !!bed && !!tier,
    need: [!bed ? "where you sleep" : "", !tier ? "what you eat" : ""].filter(Boolean),
    problem: null,
    low: parts.reduce((n, p) => n + p.low, 0),
    high: parts.reduce((n, p) => n + p.high, 0),
    parts,
    excludes,
    heads: people,
    // Whether the headcount was read or assumed, because a figure resting on
    // an assumption has to say which one.
    headsCounted: counted,
    rooms: bed?.rooms ?? 0,
    // Which way the beds were bought at each end of the band. Read off the
    // pricing rather than worked out again from the numbers: see bedPerNight.
    bedsLow: !!bed?.lowIsBeds,
    bedsHigh: !!bed?.highIsBeds,
    // Which season the bed was priced in, and null when no date said. Read off
    // the pricing, so the panel and the sentence cannot disagree about it.
    season,
    // Stated separately from `excludes` because it is the opposite fact: the
    // tick did not remove a cost, it settled one.
    entryFree: !!freeOnly,
    bedPaid: stayIsBooked(stay),
    moving: hops > 0 && hop ? { mode, hops } : null,
    note: movingNote(scope, transport),
    ferry: null,
  };
};

// Rounded to the nearest ten on the way out and nowhere before it. The inputs
// are room rates and counter prices, and printing either to the krone would
// claim a precision neither has.
const toTen = (n) => Math.round(Number(n) / 10) * 10;

// ── THE FIGURE IN THE CORNER ────────────────────────────────────────
//
// Short enough to sit beside a heading, and it says "a day" every time: a
// number in a corner with no unit is the thing somebody reads as the trip
// total and budgets a week against.
export const estimateShort = (est, code = "DKK", rate = null) => {
  if (!est || est.low == null) return "";
  const lo = showMoney(est.low, code, rate);
  const hi = showMoney(est.high, code, rate);
  if (lo === hi) return `${lo} a day`;
  // ── THE UNIT ONCE, NOT TWICE ────────────────────────────────────
  // "50 kr to 100 kr a day" says kroner twice for one band. The symbol stays
  // on whichever end carries it: kroner trail the number so the first one goes
  // ("50 to 100 kr"), and a euro sign leads it so the second one stays
  // ("€60 to €80"), because "€60 to 80" reads as a different kind of figure.
  const c = currencyOf(code);
  const live = code === "DKK" || Number.isFinite(typeof rate === "function" ? rate(code) : rate);
  const trailing = live ? c.after : true;
  return trailing
    ? `${lo.replace(/\s*\S+$/, "")} to ${hi} a day`
    : `${lo} to ${hi} a day`;
};

// ── AND THE SENTENCE UNDER IT ───────────────────────────────────────
//
// What is in and what is out, in that order, because the traveller's first
// question about any estimate is whether the bed is in it.
export const estimateSays = (est) => {
  if (!est?.ready) return "";
  const inIt = est.bedPaid ? "Food only, since you have your bed already" : "A bed and food";
  // ── WHO IT IS DIVIDED BY, AND WHETHER WE KNEW ───────────────────
  //
  // The figure is per person and some of what is in it is not. A room and a
  // car cost the same whoever is in them, so the headcount moves the answer a
  // long way: a Danhostel room rises 75 kr for a third person and a tank of
  // petrol does not rise at all. Saying "per person" without saying per how
  // many people is how a family of four reads a figure that is nearly double
  // what their beds cost.
  // Travelling alone is not a division, and "split between the 1 of you" is
  // the sentence a template writes when nobody checked. It is also the case
  // where the figure is highest, so it is the one worth getting right.
  const who = !est.headsCounted
    ? "per person, reckoned on two of you sharing, so say how many you are and this changes"
    : est.heads === 1
      ? "for one, with nobody to share a room or a car with"
      : `per person, split between the ${est.heads} of you`;
  // Only once there are enough of them for the answer to be interesting, and
  // the two answers are different facts: sharing one room is WHY it is cheap,
  // and needing a second one is why the middle tier stops getting cheaper.
  // ── AND WHAT KIND OF BED IT IS, WHICH IS THE WHOLE BAND ─────────
  //
  // 26 Sep 2026. The cheapest tier buys beds or a room, whichever costs less,
  // and the two ends of the band can be different things. Saying which is what
  // turns the figure from a number into something a traveller can argue with:
  // somebody who reads "a dorm bed each" knows exactly what they are being
  // quoted and can pick the other tier if they want a door that locks.
  //
  // It also answers the question that found the fault. The old figure said 310
  // to 410 for the cheapest bed in the country and never said it had put a
  // couple in a private room to get there.
  const beds = est.bedPaid ? ""
    : est.bedsLow && est.bedsHigh
      ? " A dorm bed each, which is the cheapest bed in the country."
      : est.bedsLow
        ? ` The bottom of that is a dorm bed each and the top is one room for the ${est.heads} of you, which overtakes separate beds once there are enough of you.`
        : est.heads < 3 ? ""
          : (est.rooms === 1 ? " You are all in one room." : ` That is ${est.rooms} rooms, since a hotel room sleeps two.`);
  const free = est.entryFree ? " Entry is nothing, since you asked for free attractions only." : "";
  // ── AND WHICH SEASON MOVED IT ────────────────────────────────────
  //
  // Oliver, 26 Sep 2026: "Obviously the season also will affect the estimate.."
  //
  // Named either way, because both facts are worth having. With a date, the
  // figure is one season's prices and the traveller should know which. Without
  // one, the width of the band IS the season, and a band nobody can account
  // for is the thing that made the old figure unarguable.
  const when = est.bedPaid ? ""
    : est.season === "high"
      ? " Priced in high season, which Danhostel puts at June to August and charges 100 kr a night more for."
      : est.season === "winter"
        ? " Priced at low season, since no Danish hostel publishes a December to February rate and plenty of them are shut."
        : est.season === "low"
          ? " Priced in low season, which is what Danhostel calls March to May and September to November."
          : " The bottom of the band is low season and the top is June to August, so put your dates in and it narrows.";
  return `${inIt}, ${who}.${beds}${when}${free} It leaves out ${est.excludes.join(", ")}. The guide prices those once it knows the route.`;
};

// ── WHAT THE PLANNER IS TOLD ────────────────────────────────────────
//
// The same figure, written the way a person would say it, because it goes into
// the brief as the traveller's budget and everything downstream already reads
// a sentence rather than a number. One value, one reader: the panel and the
// brief cannot disagree about what was estimated because there is nothing to
// disagree with.
export const estimateForBrief = (est) => {
  if (!est?.ready) return "";
  const money = est.low === est.high ? `about ${toTen(est.low)} kr` : `about ${toTen(est.low)} to ${toTen(est.high)} kr`;
  const covers = est.bedPaid
    ? "a day per person for food, with the bed already paid for"
    : "a day per person, covering a bed and food";
  const who = est.headsCounted ? ` for ${est.heads}` : "";
  // THE SEASON GOES WITH IT, because the planner is the half of this that can
  // act on it. A guide told the figure is a high-season one will not go looking
  // for a March price to contradict it, and one told no season was read knows
  // the band is wide for a reason.
  const when = est.season === "high" ? " Priced in high season, June to August."
    : est.season === "winter" ? " Priced at low season, since Danish hostels do not publish a December to February rate."
    : est.season === "low" ? " Priced in low season, March to May and September to November."
    : " No arrival date was given, so this spans low and high season rather than picking one.";
  return `${money} ${covers}${who}.${when} Estimated from what they picked rather than a figure they gave, so treat it as the shape of the trip they want rather than a limit they stated.`;
};

// ── THE LOCKOUT ─────────────────────────────────────────────────────
//
// His words, and the reason is his too: a panel of controls that silently
// change a number is a configurator, and a traveller who never meant to set a
// budget should not acquire one by brushing past it. So nothing in here counts
// until it is switched on, and switching it on is one deliberate act.
//
// The label says budget AND preferences because that is what is behind it.
// "Enable budget estimate" over a panel that also decides how far the trip
// goes would be a button that does more than it says.
export const ENABLE_LABEL = "Enable my budget and preferences";
export const ENABLE_SAYS = "Nothing in here changes your trip until you turn it on.";


// ── AND THE FIGURE IN THEIR OWN MONEY ───────────────────────────────
//
// Oliver, 25 Sep 2026: "enable multiple currencies."
//
// He asked for this on the typed field this morning and it went out with the
// field. The figure is where it belonged anyway: a traveller typing a budget
// in euros was telling us something, and this is Gemlyx quoting a price, which
// is the thing a visitor actually needs converting.
//
// THE CODES api/fx ALREADY ANSWERS FOR, and nothing else. A currency in this
// list that the endpoint cannot price is a menu entry that produces kroner,
// which is confusing; a currency missing from it is one a traveller cannot
// ask for at all.
export const BUDGET_CURRENCIES = [
  { code: "DKK", symbol: "kr", after: true },
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "SEK", symbol: "kr", after: true },
  { code: "NOK", symbol: "kr", after: true },
  { code: "CHF", symbol: "CHF" },
  { code: "PLN", symbol: "zł", after: true },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
];

export const currencyOf = (code) =>
  BUDGET_CURRENCIES.find(c => c.code === clean(code)) || BUDGET_CURRENCIES[0];

// ── ROUNDED IN THE CURRENCY IT IS SHOWN IN ──────────────────────────
//
// Not converted from an already-rounded kroner figure, which would round
// twice and drift. Kroner round to ten because the inputs are room rates and
// counter prices; a euro figure rounds to five for the same reason, since ten
// euros is seventy-five kroner and would be a coarser claim than the numbers
// behind it support.
const step = (code) => (clean(code) === "DKK" || clean(code) === "SEK" || clean(code) === "NOK" ? 10 : 5);
const toStep = (n, code) => {
  const k = step(code);
  return Math.round(Number(n) / k) * k;
};

// `rate` is injected and answers one question: how many of this currency is
// one krone. Null from it means nobody could convert, and the answer is then
// kroner rather than a guess, which is the honest failure. api/fx forbids a
// fallback table in its own words.
export const showMoney = (dkk, code = "DKK", rate = null) => {
  const n = Number(dkk);
  if (!Number.isFinite(n)) return "";
  const want = clean(code) || "DKK";
  const r = want === "DKK" ? 1 : (typeof rate === "function" ? rate(want) : rate);
  const live = Number.isFinite(r) && r > 0;
  const c = currencyOf(live ? want : "DKK");
  const value = toStep(live ? n * r : n, c.code);
  return c.after ? `${value} ${c.symbol}` : `${c.symbol}${value}`;
};
