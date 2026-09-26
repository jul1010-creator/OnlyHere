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

import { tierDayBand, foodTier, cleanMeals, MEALS_A_DAY_DEFAULT } from "./mealsEstimate";
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
// The one reader of what a sommerhus costs. Priced per house per week, which is
// nothing else in this file's shape, so it keeps its own module with its own
// sources rather than being flattened into a nightly rate here.
import { houseWeek, HOUSE_NIGHTS, HOUSE_SOURCE, HOUSE_CHECKED_AT, HOUSE_SEASON_CHECK, houseSays, houseFor, houseFit, HOUSE_FIT, housePerHeadNight as housePerHead } from "./summerhouse";

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
const seasonAt = (when) => {
  const day = dayStart(when);
  if (!day) return null;
  const m = day.getMonth() + 1;
  if (BED_SEASON.high.includes(m)) return "high";
  if (BED_SEASON.winter.includes(m)) return "winter";
  return BED_SEASON.low.includes(m) ? "low" : null;
};

// ── AND A TRIP THAT CROSSES THE BOUNDARY IS NOT ONE SEASON ──────────
//
// The first version read the arrival day alone, so a trip landing on 31 May and
// staying a fortnight was priced at March rates for thirteen June nights, and
// one landing on 31 August was priced at June rates for a week of September.
// Both dates are on the same panel and only one was being read, which is the
// exact defect this change was fixing.
//
// A trip that straddles gets NO season, which puts the whole band back on screen
// rather than picking the half the arrival happened to land in. That is the
// honest answer: the traveller is paying both.
// Winter and low are the same price column, so crossing between them is not a
// straddle. June is.
const samePriceColumn = (a, b) => a === b || (a !== "high" && b !== "high");

// ── AND WHY THERE IS NO SEASON, WHICH IS TWO DIFFERENT FACTS ────────
//
// Found by a review pass hours after the straddle shipped. bedSeasonOf returns
// null for a trip with no dates AND for a trip that crosses 1 June, and the
// sentence built on it could not tell them apart, so a traveller who had filled
// in both dates was told "No arrival date was given". The same prompt carried
// their arrival date twice over in other blocks.
//
// Two facts, so two answers. Null with dates means they are paying both seasons;
// null without means nobody has said yet.
export const straddlesSeason = (arrival, departure = "") => {
  const from = seasonAt(arrival);
  const to = seasonAt(departure);
  if (!from || !to) return false;
  if (!samePriceColumn(from, to)) return true;
  // ── AND A LONG TRIP CAN CONTAIN A SEASON IT DOES NOT TOUCH ──────
  //
  // Found by a review pass. Reading the two endpoints alone priced a trip from 28
  // May to 3 September at low season, because both ends are low, while 92 of its
  // 98 nights are June to August. Rare, and false when it happens.
  const a = dayStart(arrival), b = dayStart(departure);
  if (!a || !b) return false;
  const [start, end] = a <= b ? [a, b] : [b, a];
  // Walk the months it covers rather than the days: a trip is at most a few
  // months and this is the cheapest way to ask whether it holds a June.
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const m = d.getMonth() + 1;
    if (BED_SEASON.high.includes(m) && from !== "high") return true;
    if (!BED_SEASON.high.includes(m) && from === "high") return true;
  }
  return false;
};

export const bedSeasonOf = (arrival, departure = "") => {
  const from = seasonAt(arrival);
  if (!from) return null;
  const to = seasonAt(departure);
  if (!to) return from;
  // ── AND ONE ANSWER, NOT TWO ─────────────────────────────────────
  // straddlesSeason is the one reader of "is this trip in one season". This used
  // to test the two endpoints itself and the two disagreed: a trip from 28 May to
  // 3 September came back "low" from here and "straddles" from there, so the panel
  // named March rates over a band that held both seasons.
  return straddlesSeason(arrival, departure) ? null : from;
};

// Which way a straddling trip crossed, so the sentence can say which end of its
// band is which. True where the trip begins outside summer and reaches into it.
export const intoSummer = (arrival, departure = "") =>
  seasonAt(arrival) !== "high" && straddlesSeason(arrival, departure);

// What the season does to a band whose two ends are the two seasons. A known
// season is one of them rather than a span across both; an unknown season is
// the span, which is what the panel showed before it could read a date.
//
// Winter takes the low-season figure. The seller does not publish one, and the
// alternative is refusing to price a January trip at all, which helps nobody.
//
// ── AND ONLY A BAND THAT IS TWO SEASONS MAY BE NARROWED ─────────────
//
// Found by a review pass the same night, and it was the worse half of the
// change. ROOM_KR's two ends are June and March off one published list, so
// picking one of them is reading the list. BED_TIERS.best's two ends are 1,200
// and 1,800, which the file's own comment sources as the spread between a cheap
// central double and a dear one: a price range, not a calendar. Narrowing that
// one collapsed the softest figure in the file to a single number, moved it by
// 600 kr, and told the traveller Danhostel had charged them for it.
//
// So the gate is the tier's own, not this function's guess. A tier says whether
// its band is seasonal and this refuses to narrow one that has not said so.
const inSeason = (band, season, seasonal) =>
  !seasonal || !season ? band
  : season === "high" ? { low: band.high, high: band.high }
  : { low: band.low, high: band.low };

// ── A DORM BED, PUBLISHED BY TWO SELLERS AND A PLATFORM ─────────────
//
// Next House Copenhagen publishes a bed in a six-person dorm from 145 kr and
// one in a four-person dorm from 165, on its own front page. Steel House
// Copenhagen publishes from 145 for a dorm bed on its own front page too. Two
// sellers, independently, at the same number.
//
// AND A THIRD READING AGREES, which is what makes this the hardest number in
// the file rather than the softest. Hostelworld's Copenhagen page, read on 26
// September 2026, listed six named hostels with dorms from 18.63 to 24.84 US
// dollars, about 120 to 160 kr. The sellers' own from-prices sit inside a live
// spread across six houses.
//
// ── AND NO SUMMER FIGURE, BECAUSE NOBODY PUBLISHES ONE ──────────────
//
// This had a seasonal step for about an hour and it was wrong twice over. It
// took Danhostel's published 100 kr, which that seller charges PER ROOM, and
// added it PER BED at two hostels that have nothing to do with Danhostel. Six
// beds in a room would have made that 600 kr on one room.
//
// So the step is gone and the gap is named instead. No hostel in this file's
// sources publishes a June dorm price, and the one price guide that does put
// Copenhagen dorms at 300 to 450 in summer against 200 to 280 in low season.
// Its low-season figure is the one that can be checked, and it runs about 60
// percent above the six houses Hostelworld was quoting the day it was read. A
// source that is measurably high on the season we can verify does not get to
// set the ceiling on the season we cannot, so it is quoted as a warning rather
// than folded into the figure. SUMMER_BED below carries it.
//
// The bed band is therefore the sellers' own, and it does not move with the
// season, while ROOM_KR's does: one seller publishes a calendar and the others
// do not, and pretending otherwise is how the last version got it wrong.
// ── WHOSE SEASONAL FIGURES THE STEP COMES FROM ──────────────────────
//
// One Copenhagen price guide is the only source in reach that prices a dorm bed
// by season. Its ABSOLUTE figures are not used and the reason is measurable: it
// puts low season at 200 to 280 when Hostelworld was quoting six named
// Copenhagen houses at about 120 to 160 the same day, so it is reporting what a
// typical traveller paid rather than what a bed can be had for.
//
// Its RATIO is the part worth having, because it is the only published measure of
// what a Danish summer does to a bunk. Declared above DORM_KR so the factor can
// be divided out of these two numbers in code rather than asserted in a comment:
// a step written as 1.5 with the arithmetic in prose is a number nobody can
// check, which is the whole complaint this file spent the night answering.
export const SUMMER_BED = {
  low: 300, high: 450, lowSeasonLow: 200, lowSeasonHigh: 280,
  source: "https://www.copenhagentourism.org/copenhagen-trip-cost/",
  checkedAt: "2026-09-26",
  says: "One Copenhagen price guide puts a dorm bed at 300 to 450 kr in June to August against 200 to 280 in low season. Its low-season figures run above what six named hostels were quoting the day this was read, so the summer step here is that guide's ratio applied to the sellers' own prices rather than its figures.",
};

export const DORM_KR = {
  low: 145,
  high: 165,
  // ── AND WHAT SUMMER DOES TO IT, AS A RATIO ────────────────────────
  //
  // Divided out of SUMMER_BED's own pair: 300 against 200 at the cheap end and
  // 450 against 280 at the dear one, which is half again and a little more. The
  // cheaper of the two, because a factor borrowed from somebody else's price
  // list should err downwards.
  //
  // This replaces a step that was wrong twice over: it took Danhostel's 100 kr,
  // which that seller charges PER ROOM, and added it PER BED at two hostels with
  // no connection to Danhostel. Six bunks in a room would have made it 600.
  summerFactor: SUMMER_BED.low / SUMMER_BED.lowSeasonLow,
  source: "https://www.nexthousecopenhagen.com/hostel-copenhagen",
  checkedAt: "2026-09-26",
  says: "Next House Copenhagen publishes a bed in a six-person dorm from 145 kr and a four-person dorm from 165, and Steel House Copenhagen publishes from 145 as well. Hostelworld listed six named Copenhagen hostels from about 120 to 160 kr on the same day. Some sellers charge 75 more for linen and two towels on top.",
};

// How much dearer a summer bunk is, as a whole number of percent, for the one
// sentence that has to say it. Read from the factor rather than typed beside it.
export const DORM_SUMMER_PCT = Math.round((DORM_KR.summerFactor - 1) * 100);

// ── THE BED'S OWN SEASON, WHICH IS NOT THE ROOM'S ───────────────────
//
// A dorm band's two ends are the SIZE of the room, six bunks against four, so
// the season cannot be one end of it the way it is for ROOM_KR. It moves the
// whole band instead, which is what a factor does and what a seasonal price list
// does. An unknown season spans both, which is the honest width.
//
// Held apart from inSeason on purpose. The first version pushed the bed through
// the same function as the room and the room's own logic collapsed the band to
// one figure, so a summer bunk was priced at the four-bed size and a March one at
// the six-bed size, which is a room size masquerading as a calendar.
export const dormBand = (season) => {
  const up = (n) => Math.round(n * DORM_KR.summerFactor);
  if (season === "high") return { low: up(DORM_KR.low), high: up(DORM_KR.high) };
  if (season) return { low: DORM_KR.low, high: DORM_KR.high };
  return { low: DORM_KR.low, high: up(DORM_KR.high) };
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
// ── AND 575 WAS A DIFFERENT SELLER'S NUMBER ─────────────────────────
//
// The double read 575 while the comment above it and the sentence on screen both
// said 600. A review pass found the disagreement and Danhostel's own price page,
// read again on 26 Sep 2026, settles it: 600 low season, 700 high. The 575 is
// CABINN's room price, from the prose two blocks up, and it had migrated into
// another seller's table. One list, one seller, no blending.
export const ROOM_KR = {
  1: { low: 550, high: 650 },
  2: { low: 600, high: 700 },
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

// ── EVERY ROOM SIZE THE SELLER PUBLISHES ────────────────────────────
//
// Held as a list rather than assumed to be one to five, because the two tiers
// sell different things: a hostel publishes five sizes and a hotel publishes a
// double. The arrangement search below walks whichever list the tier has, which
// is what stops a hotel being offered a five-bed room it does not sell.
export const HOSTEL_ROOM_SIZES = [1, 2, 3, 4, 5];

export const BED_TIERS = {
  cheapest: {
    roomSizes: HOSTEL_ROOM_SIZES,
    perRoom: (size) => ROOM_KR[Math.min(Math.max(1, size), ROOM_SLEEPS_MAX)],
    // The thing this tier was missing. A hostel sells beds as well as rooms,
    // and on the cheapest tier the bed is usually the answer.
    // Takes the season itself, because a bed's season is a factor on the whole
    // band and a room's is one end of it. See dormBand.
    perBed: (season) => dormBand(season),
    // ROOM_KR's two ends are Danhostel's two published seasons, so a date may
    // pick one of them. This says the ROOM half has a calendar; the bed half
    // answers its own season through dormBand. See inSeason.
    seasonal: true,
    sleeps: ROOM_SLEEPS_MAX,
    source: DORM_KR.source,
    checkedAt: "2026-09-26",
    says: `${DORM_KR.says} A room is the other way to buy it: Danhostel publishes 600 to 700 for a double, rising only 50 to 75 kr for each extra bed, so a big party is better off in one room than in separate beds. Whichever is cheaper is what this counts.`,
  },
  best: {
    // A hotel sells a double. It does not publish a five-bed room, and the
    // first version of the search offered it one.
    roomSizes: [HOTEL_SLEEPS],
    perRoom: () => ({ low: 1200, high: 1800 }),
    perBed: null,
    // ── AND THIS BAND IS NOT A CALENDAR ─────────────────────────────
    // 1,200 and 1,800 are a cheap central double and a dear one, which is a
    // spread rather than June against March. A review pass the same night found
    // the season being applied to it anyway, collapsing the softest figure in
    // the file to one number and crediting Danhostel with a 600 kr move.
    seasonal: false,
    sleeps: HOTEL_SLEEPS,
    source: "https://www.budgetyourtrip.com/denmark",
    checkedAt: "2026-09-25",
    says: "A Danish double at about 1,215 kr a room on traveller-reported spend, and a central Copenhagen mid-range room at 1,200 to 1,800. A room sleeps two, so a third person is a second room. No Danish body publishes a room rate to cite, so this is the softest figure here.",
  },
  // ── A WHOLE HOUSE, BY THE WEEK ──────────────────────────────────
  //
  // The only tier not sold by the night and not sold by the room, so it answers
  // with a party cost directly rather than going through the arrangement search:
  // there is nothing to arrange, they take the house. See utils/summerhouse.js
  // for the prices and for which season they were each read at.
  summerhouse: {
    roomSizes: [],
    perRoom: () => ({ low: 0, high: 0 }),
    perBed: null,
    // Its two ends really are two months, read at each one rather than derived,
    // so a date narrows it and narrows it a long way: roughly two and a half
    // times from January to July.
    seasonal: true,
    perParty: (heads, season) => {
      const w = houseWeek(heads, season);
      return w ? { low: Math.round(w.low / HOUSE_NIGHTS), high: Math.round(w.high / HOUSE_NIGHTS) } : null;
    },
    sleeps: 0,
    minNights: HOUSE_NIGHTS,
    source: HOUSE_SOURCE,
    checkedAt: HOUSE_CHECKED_AT,
    says: `Novasol's own booking engine, read on ${HOUSE_CHECKED_AT} for Jutland at seven nights in each season: a four-sleeper runs 1,472 to 1,643 kr the week in January, 1,755 to 2,266 in October and 3,432 to 4,014 in July, and a six-sleeper less a head again. ${HOUSE_SEASON_CHECK.says}`,
  },
  booked: {
    roomSizes: [1],
    perRoom: () => ({ low: 0, high: 0 }),
    perBed: null,
    seasonal: false,
    sleeps: 1,
    source: "",
    checkedAt: "",
    says: "You have paid for it already, so it is not in this figure.",
  },
};

// ── THE CHEAPEST WAY TO SLEEP A PARTY, NOT THE TIDIEST ──────────────
//
// Found by a review pass on the night this shipped, and it was a real
// overcharge rather than a wrinkle. The first version compared two arrangements
// and took the cheaper: every one of them in a dorm bed, or all of them in
// rooms filled largest first. Neither is the cheapest thing a party can buy,
// and the gap is money:
//
//   Six people in high season: it charged 245 to 250 a head, when a five-bed
//   room and one dorm bed is 183 to 186. The sixth person was billed 620 kr for
//   a bed that costs 145.
//   Eleven people: 214 a head against 177.
//
// The comment on the old version described the fault out loud and nobody read
// it that way: "a party of six in hostel rooms is a five and a one, and the one
// pays a single." The one should take a bunk.
//
// SO IT SEARCHES INSTEAD OF ASSUMING. Every mix of the sizes the seller
// publishes and single beds, cheapest first, which for a party of twelve is a
// few dozen sums. The plan it lands on is returned rather than described,
// because the sentence under the figure has to be able to say what the
// traveller is being quoted, and a sentence that guesses is how "one room for
// the 6 of you" came to be printed over a two-room figure.
const arrange = (people, roomAt, bedAt, sizes) => {
  const cost = [0];
  const via = [null];
  for (let n = 1; n <= people; n++) {
    let pick = null, step = null;
    if (bedAt != null) { pick = bedAt + cost[n - 1]; step = { bed: true, from: n - 1 }; }
    for (const k of sizes) {
      const from = Math.max(0, n - k);
      const c = roomAt(k) + cost[from];
      // Strictly cheaper, so a tie keeps the bed, which is the arrangement a
      // traveller on this tier asked for.
      if (pick == null || c < pick) { pick = c; step = { room: k, from }; }
    }
    cost[n] = pick; via[n] = step;
  }
  const rooms = [];
  let beds = 0;
  for (let n = people; n > 0; n = via[n].from) {
    if (via[n].bed) beds += 1; else rooms.push(via[n].room);
  }
  return { kr: cost[people], rooms: rooms.sort((x, y) => y - x), beds };
};

// What the whole party pays for its beds in a night, before anybody divides it.
//
// ── THE TWO ENDS ARE SEARCHED SEPARATELY, ON PURPOSE ────────────────
//
// Beds do not get cheaper in a crowd and a Danhostel room nearly stops rising,
// so a party crosses over from one to the other somewhere inside the band. A
// single arrangement priced at both ends would have to pick a side of that
// crossing and would be wrong on the other. Both plans come back, and the
// sentence says what each end is.
export const bedPerNight = (stay, heads = 2, season = null) => {
  const tier = BED_TIERS[clean(stay)];
  if (!tier) return null;
  const people = Math.max(1, Math.floor(Number(heads)) || 1);
  // ── A TIER THAT IS NOT ROOMS AND NOT BEDS ───────────────────────
  // A sommerhus is one price for the whole party, so there is no arrangement to
  // search: they take the house. Answered here and returned whole, with the
  // plans saying what it is so every sentence downstream can read them the same
  // way it reads a room or a bunk.
  if (typeof tier.perParty === "function") {
    const band = tier.perParty(people, tier.seasonal ? season : null);
    if (!band) return null;
    const plan = { rooms: [], beds: 0, house: houseFor(people) };
    return {
      low: band.low, high: band.high, rooms: 0,
      lowPlan: plan, highPlan: plan, lowIsBeds: false, highIsBeds: false,
      sleeps: plan.house, house: plan.house, minNights: tier.minNights || 0,
      season: (tier.seasonal && season) || null, seasonal: !!tier.seasonal,
      per: "party", source: tier.source, says: tier.says,
    };
  }
  const sizes = Array.isArray(tier.roomSizes) && tier.roomSizes.length ? tier.roomSizes : [tier.sleeps];
  // The bed is NOT put through inSeason. dormBand already answers the season for
  // a bunk, and running it through the room's logic collapsed a size spread into
  // a calendar: a summer bed came out at the four-bed price and a March one at
  // the six-bed price, which is not a season at all.
  const bed = tier.perBed ? tier.perBed(season) : null;
  const end = (which) => arrange(
    people,
    (k) => inSeason(tier.perRoom(k), season, tier.seasonal)[which],
    bed ? bed[which] : null,
    sizes,
  );
  const lowPlan = end("low");
  const highPlan = end("high");
  return {
    low: lowPlan.kr,
    high: highPlan.kr,
    // The room count is the one the dear end buys, which is the end where rooms
    // win and therefore the only end where a room count means anything.
    rooms: highPlan.rooms.length,
    // What each end actually is, reported rather than inferred. A second reader
    // working this out from the numbers is the failure this codebase keeps
    // paying for, and it printed two wrong sentences before this line existed.
    lowPlan, highPlan,
    lowIsBeds: lowPlan.rooms.length === 0,
    highIsBeds: highPlan.rooms.length === 0,
    // The biggest room this tier sells, so the sentence can say why a party
    // needed two of them without crediting a hostel with a hotel's room size.
    sleeps: tier.sleeps,
    // Which season this was priced in, and null where the tier has no calendar
    // to read. A tier that is not seasonal reports none however good the date.
    season: (tier.seasonal && season) || null,
    seasonal: !!tier.seasonal,
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

// ── AND A CROSSING, WHICH THIS DOES NOT PRICE ───────────────────────
//
// An island trip is one crossing out and one back, whatever its length, so
// folding it into a figure per day would need a trip length the panel does not
// always have and would price a fortnight on Aero as cheaper per day than a
// weekend on it.
//
// AND THE MIDDLE SCOPE IS NOT A BOAT. That option exists to keep a crossing OUT
// of the trip: see the block inside estimateDay. So nothing here adds a ferry,
// and the fare table that used to sit at this spot was deleted on 26 Sep 2026
// after a review pass found that nothing read it and the panel's ferry block
// could never render. A published figure with no reader is not evidence, it is
// furniture. costLedger.js prices the real crossing once the guide knows which
// island, which is where that number belongs.

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
// ── AND THE MIDDLE ONE IS NOT AN ISLAND ANY MORE ────────────────────
//
// This block used to read "AN ISLAND IS THE CLEAREST CASE OF THE FOUR. Taking a
// car across costs 142 kr each way on Aero against 25 for a bicycle." That was
// the reasoning behind recommending a bicycle and nothing else for the middle
// scope, and it stopped being true on 25 Sep when Oliver renamed that chip.
//
// He renamed it because the old label was wrong: "Stay on one island" meant
// Zealand and Jutland, and he asked "I mean Zealand, Jutland, and Odense.. is
// land-area better?" The scope's own sentence now says "Do not move them to
// another part... and do not put a ferry in the trip." So the recommendation was
// arguing from a ferry fare for a trip that forbids ferries, and it was telling
// somebody covering Jutland, which is 300 km end to end, that a bicycle is the
// recommended way round.
//
// A REGION IS A REGION OF TOWNS, so it wants what moving between towns wants.
// Trains reach the whole of it and a bicycle is a real answer for the days
// inside one area, which is both of them rather than one. Found by a review
// pass, 26 Sep 2026; the label changed a day earlier and this did not.
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
    modes: ["public transport", "bike"],
    why: "One part of the country is still a few towns apart: Jutland is 300 km end to end. A train or a bus links them and a bicycle is what the days inside one area are for, which is why both are marked. A car is the one that adds a cost this trip does not need, since the scope keeps you off the ferries anyway.",
  },
  explore: {
    modes: ["public transport", "car"],
    // ── AND THE THRESHOLD IS THE ONE hopCost PRODUCES ─────────────
    // This said three, and the module's own figures say two: a hop is 50 to 100
    // a head by train and 40 to 99 for two sharing a car. Said in a sentence
    // rather than read from the function, so the two drifted apart. It also
    // needs the caveat, because the car figure is petrol and the bridge with no
    // rental in it, which is why a train can still be the cheaper trip.
    why: "Crossing the country needs one of these. A train is cheaper on your own and a car is cheaper from two of you up, since the petrol and the bridge cost the same whoever is in it. That car figure is fuel and the toll, not the hire.",
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
  // Worded without a mode in it on purpose: this sentence goes into the brief,
  // the brief goes into the transcript, and travelModeKey reads the transcript.
  // "buses and metros inside a town" was read as public transport. See stayChoice.js.
  local: "local fares inside a town",
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
export const estimateDay = ({ stay = "", food = "", freeOnly = false, scope = "", transport = [], travellers = "", heads = null, meals = MEALS_A_DAY_DEFAULT, arrival = "", departure = "" } = {}) => {
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
  const season = bedSeasonOf(arrival, departure);
  // Whether the band is wide because the trip crosses the boundary or because
  // nobody has said when they are coming. See straddlesSeason.
  const straddles = straddlesSeason(arrival, departure);
  // Which way, because "crosses into summer" is false for a trip leaving it.
  const crossingIntoSummer = intoSummer(arrival, departure);
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
  // ── AND THE FOOD HALF IS READ, NOT RE-PRICED ────────────────────
  //
  // This file's own header says the food half is not re-priced here, and for a
  // day it was: a division by three for the low end and a multiplication by 1.6
  // for the high one, neither published, while mealsEstimate held the real ends
  // as STREET_MEAL.high and FLEXIBLE_MEAL.high all along. It quoted 160 for the
  // cheap tier where that file says 180, so the panel and the guide's cost block
  // disagreed about the same tier on the same trip. tierDayBand is the one reader
  // of both ends now.
  const band = tier ? tierDayBand(tier.key, meals) : null;
  const foodLow = band ? band.low : 0;
  const foodHigh = band ? band.high : 0;
  // ── AND HOW MANY TIMES A DAY THEY EAT, WHICH IS AN ASSUMPTION ────
  //
  // The panel has no control for this and the guide's cost block does, so the
  // figure rests on the default and the sentence has to say so: a third bought
  // meal is another 50 to 90 kr, which moves the cheap tier by half. Only where
  // the count changes the answer, which the self tier's own basis explains that
  // it does not: one shop lasts LONGER if you skip breakfast.
  const mealsCount = cleanMeals(meals);
  const mealsMatter = !!band && tierDayBand(tier?.key, mealsCount === 2 ? 3 : 2)?.low !== band.low;

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
  // prices the real crossing once it knows. costLedger.js does that.

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
    // Which way the beds were bought at each end of the band, and what the
    // arrangement IS. Read off the pricing rather than worked out again from the
    // numbers: a sentence that reconstructed this printed "one room for the 6 of
    // you" over a two-room figure.
    bedsLow: !!bed?.lowIsBeds,
    bedsHigh: !!bed?.highIsBeds,
    lowPlan: bed?.lowPlan ?? null,
    highPlan: bed?.highPlan ?? null,
    // How many the house sleeps, and the shortest booking it comes in. Zero on
    // every other tier, which is how the sentence tells them apart.
    house: bed?.house ?? 0,
    minNights: bed?.minNights ?? 0,
    // The biggest room the chosen tier sells, so the sentence can say why a
    // party needed two of them without crediting a hostel with a hotel's size.
    sleeps: bed?.sleeps ?? 0,
    // Which season the bed was priced in, and null where the date said nothing
    // OR the tier has no published calendar to read. bedPerNight decides, so the
    // panel cannot name a season that moved nothing.
    season: bed?.season ?? null,
    straddles,
    intoSummer: crossingIntoSummer,
    seasonal: !!bed?.seasonal,
    // Stated separately from `excludes` because it is the opposite fact: the
    // tick did not remove a cost, it settled one.
    entryFree: !!freeOnly,
    // How many bought meals a day the food half assumed, and whether saying so
    // is worth the words. The panel has no control for it, so it is an
    // assumption, and an assumption this figure rests on gets named.
    meals: mealsCount,
    mealsMatter,
    bedPaid: stayIsBooked(stay),
    moving: hops > 0 && hop ? { mode, hops } : null,
    note: movingNote(scope, transport),
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
  // ── AND WHAT IS IN IT, INCLUDING THE PART THAT MOVES ─────────────
  //
  // Found by a review pass. Both sentences named a bed and food and stopped, on a
  // figure that can also carry a hop between towns: a booked bed, cheap food and
  // a car across the country came out 140 to 279, of which 40 to 99 is petrol and
  // the bridge, and the sentence called all of it food. The excludes list was
  // correctly dropping "getting between towns" at the same time, so the reader was
  // told the figure does not leave travel out while being told it covers only food.
  const moves = !!est.moving;
  const inIt = est.bedPaid
    ? (moves ? "Food and getting between towns, since you have your bed already" : "Food only, since you have your bed already")
    : (moves ? "A bed, food and getting between towns" : "A bed and food");
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
  // ── AND ONLY PROMISE A CHANGE THAT CAN HAPPEN ────────────────────
  // A figure with nothing shared in it does not move when the headcount does, so
  // asking for the headcount there is a form asking a question it will ignore.
  // Somebody who has booked their bed and is staying in one town is paying for
  // food, and food costs what it costs each.
  const shared = est.parts.some(p => p.per === "party" && p.high > 0);
  const who = !est.headsCounted
    ? (shared
        ? "per person, reckoned on two of you sharing, so say how many you are and this changes"
        : "per person, and nothing in it is shared, so the headcount would not move it")
    : est.heads === 1
      ? (shared ? "for one, with nobody to share a room or a car with" : "for one")
      // ── AND A SPLIT IS ONLY CLAIMED WHERE ONE HAPPENED ───────────
      // Found live on the panel, 26 Sep 2026: a booked bed, cheap food and a
      // party of three read "split between the 3 of you" over a figure in which
      // every part is per person. The uncounted branch above already tested
      // this and the counted one did not, so the sentence was true for a
      // traveller who had not said how many they were and false for one who had.
      : shared
        ? `per person, split between the ${est.heads} of you`
        : `per person, the same for each of the ${est.heads} of you, since nothing in it is shared`;
  // Only once there are enough of them for the answer to be interesting, and
  // the two answers are different facts: sharing one room is WHY it is cheap,
  // and needing a second one is why the middle tier stops getting cheaper.
  // ── AND WHAT KIND OF BED IT IS, WHICH IS THE WHOLE BAND ─────────
  //
  // 26 Sep 2026. The cheapest tier buys beds or rooms or a mix, whichever costs
  // least, and the two ends of the band can be different arrangements. Saying
  // which is what turns the figure from a number into something a traveller can
  // argue with: somebody who reads "a dorm bed each" knows what they are being
  // quoted and can pick the other tier if they want a door that locks.
  //
  // It also answers the question that found the fault. The old figure said 310
  // to 410 for the cheapest bed in the country and never said it had put a
  // couple in a private room to get there.
  //
  // ── AND IT READS THE PLAN RATHER THAN GUESSING AT IT ────────────
  //
  // The first version of this reconstructed the arrangement from two booleans
  // and got it wrong twice: it told a party of six "the top is one room for the
  // 6 of you" when the figure was two rooms, and it told a party of seven in a
  // hostel "that is 2 rooms, since a hotel room sleeps two" when a hostel room
  // sleeps five. Both sentences were printed over correct figures, which is the
  // worst kind of wrong: nothing to check them against.
  const plan = (p) => {
    if (!p) return "";
    if (p.house) return `a house that sleeps ${p.house}`;
    const rooms = p.rooms || [];
    const bunks = p.beds === 1 ? "one dorm bed" : `${p.beds} dorm beds`;
    if (!rooms.length) return p.beds === 1 ? "a dorm bed" : "a dorm bed each";
    const also = p.beds ? ` and ${bunks}` : "";
    if (rooms.length === 1) {
      return p.beds
        ? `a room for ${rooms[0]}${also}`
        : (rooms[0] >= est.heads ? "one room for all of you" : `one room for ${rooms[0]}`);
    }
    return `${rooms.length} rooms${also}`;
  };
  const sameEnds = est.lowPlan && est.highPlan
    && est.lowPlan.rooms.join(",") === est.highPlan.rooms.join(",")
    && est.lowPlan.beds === est.highPlan.beds;
  // ONE ROOM AND NOBODY LEFT OVER is the only arrangement that may be called one
  // room. A party of six on the cheap tier is a five and a bunk, and the first
  // version told them they were all in one room.
  const allInOne = est.highPlan && est.highPlan.rooms.length === 1 && !est.highPlan.beds;
  // A house answers this line on its own: it is neither a room count nor a bunk,
  // and the thing worth saying about it is the week and the kitchen.
  const houseLine = est.house
    ? ` A whole house that sleeps ${est.house}, with a kitchen, booked by the week. ${houseSays(est.season)}`
    : "";
  const beds = est.bedPaid || !est.lowPlan ? ""
    : houseLine ? houseLine
    : sameEnds
      ? (est.bedsLow
          ? " A dorm bed each, which is the cheapest bed in the country."
          : allInOne
            ? " You are all in one room."
            : ` That is ${plan(est.highPlan)}, since the biggest room this kind of place sells sleeps ${est.sleeps}.`)
      : ` The bottom of that is ${plan(est.lowPlan)} and the top is ${plan(est.highPlan)}, which overtakes separate beds once there are enough of you.`;
  const free = est.entryFree ? " Entry is nothing, since you asked for free attractions only." : "";
  const eating = est.mealsMatter ? ` Food is counted at ${est.meals} bought meals a day.` : "";
  // ── AND WHICH SEASON MOVED IT, AND BY WHOSE FIGURE ───────────────
  //
  // Oliver, 26 Sep 2026: "Obviously the season also will affect the estimate.."
  //
  // Named either way, because both facts are worth having. With a date, the
  // figure is one season's prices and the traveller should know which. Without
  // one, the width of the band IS the season, and a band nobody can account for
  // is the thing that made the old figure unarguable.
  //
  // ── AND THE CREDIT GOES TO WHOEVER MOVED IT ─────────────────────
  //
  // A review pass found this sentence telling a traveller in a hotel double that
  // Danhostel had charged them 100 kr more for June, and telling a traveller in a
  // bunk the same thing when what moved their figure was a price guide's ratio.
  // The two halves of this tier have different calendars and different sources,
  // so the sentence reads which one the figure landed on. est.season is already
  // null on a tier with no published calendar at all, so a hotel is told nothing.
  // Read off the arrangement, not off the two all-or-nothing flags. A party of
  // six in a five-bed room plus one bunk has BOTH a room's season and a bed's,
  // and the first version of this credited Danhostel with the whole of it.
  const bunksIn = (p) => !!p && p.beds > 0;
  const roomsIn = (p) => !!p && p.rooms.length > 0;
  const anyBunk = bunksIn(est.lowPlan) || bunksIn(est.highPlan);
  const anyRoom = roomsIn(est.lowPlan) || roomsIn(est.highPlan);
  const whoMoved = anyBunk && !anyRoom
    ? `, which runs about ${DORM_SUMMER_PCT} percent dearer on a dorm bed`
    : anyRoom && !anyBunk
      ? `, which Danhostel charges ${BED_SEASON.step} kr a night more for`
      : "";
  // ── AND A HOUSE SAYS ITS OWN SEASON ──────────────────────────────
  //
  // houseSays already named the month in the line above, with the sommerhus's
  // own prices behind it. Letting the hostel's clause run as well printed the
  // season twice and, worse, told a traveller in a holiday house that "no Danish
  // hostel publishes a December to February rate and plenty of them are shut",
  // which is a fact about a different kind of bed. Novasol prices January and it
  // was read: see summerhouse.js.
  const when = est.bedPaid || houseLine ? ""
    : est.season === "high"
      ? ` Priced in high season, June to August${whoMoved}.`
      : est.season === "winter"
        ? " Priced at low season, since no Danish hostel publishes a December to February rate and plenty of them are shut."
        : est.season === "low"
          ? " Priced in low season, which is what Danhostel calls March to May and September to November."
          // A tier with no calendar says nothing here. The best tier's band is a
          // cheap central room against a dear one, not June against March, and
          // saying otherwise was the worst line this sentence ever printed.
          : !est.seasonal
            ? ""
            : est.straddles
              // THEY DID PUT THEIR DATES IN. Telling them to is the panel failing
              // to read its own inputs, which is the defect this whole night was
              // about.
              // WHICH WAY IT CROSSED. The first version said "crosses into summer"
              // for a trip that crosses OUT of it, and told a late-August
              // traveller their low end was the nights before June.
              ? ` Your trip spans both seasons, so the band holds both: ${est.intoSummer ? "the cheap end is the nights before June and the top is the nights after it" : "the top is the nights up to the end of August and the cheap end is the ones after it"}.`
              : " The bottom of the band is low season and the top is summer, so put your dates in and it narrows.";
  return `${inIt}, ${who}.${beds}${when}${eating}${free} It leaves out ${est.excludes.join(", ")}. The guide prices those once it knows the route.`;
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
  const moves = !!est.moving;
  const covers = est.bedPaid
    ? `a day per person for food${moves ? " and getting between towns" : ""}, with the bed already paid for`
    : `a day per person, covering ${moves ? "a bed, food and getting between towns" : "a bed and food"}`;
  // "...already paid for for 1" reads as a stammer. The count goes in front of
  // the clause on that branch instead.
  const paidFor = est.bedPaid && est.headsCounted ? `, for ${est.heads},` : "";
  // ── AND WHO IT IS DIVIDED BY, WHICH THE PLANNER NEEDS TOO ────────
  //
  // The panel says "reckoned on two of you sharing, so say how many you are" and
  // the brief said nothing, while the figure was still divided by two. A planner
  // that does not know the headcount was assumed cannot ask for it and cannot
  // caveat the number it was handed.
  // Only where something IS shared, the same test the panel makes. The brief told
  // a traveller with a paid bed and no car that their groceries were "divided by
  // an assumed two sharing", while the panel told them nothing in it was shared.
  const shared = est.parts.some(p => p.per === "party" && p.high > 0);
  const who = est.bedPaid && est.headsCounted ? ""
    : est.headsCounted ? ` for ${est.heads}`
    : shared ? ", divided by an assumed two sharing, because nobody said how many they are"
    : ", and nothing in it is shared, so the headcount does not move it";
  // ── AND WHAT KIND OF BED THAT BUYS ───────────────────────────────
  //
  // Found by a review pass, 26 Sep 2026, and it is the gap that mattered most.
  // The cheapest tier's figure is a bunk in a shared room, and the planner was
  // told only "covering a bed and food". The chip's own sentence says the
  // traveller wants "the cheaper end of the market: a little further out from the
  // centre", which is a statement about WHERE, so a guide could recommend a
  // private room further out at 600 a night and contradict the figure it was
  // handed without contradicting anything it was told.
  //
  // The panel has said this all along ("A dorm bed each, which is the cheapest
  // bed in the country"). The traveller and the planner were reading different
  // assumptions off the same number.
  const asPlan = (p) => {
    if (!p) return "";
    if (p.house) return `a whole holiday house that sleeps ${p.house}, booked by the week`;
    const rooms = p.rooms || [];
    const bunks = p.beds === 1 ? "one dorm bunk" : `${p.beds} dorm bunks`;
    if (!rooms.length) return p.beds === 1 ? "a dorm bunk in a shared room" : "a dorm bunk each in a shared room";
    const also = p.beds ? ` plus ${bunks}` : "";
    if (rooms.length === 1) return `one private room for ${rooms[0]}${also}`;
    return `${rooms.length} private rooms${also}`;
  };
  const bedKind = est.bedPaid || !est.lowPlan ? ""
    : est.house
      ? ` That bed figure is a whole holiday house that sleeps ${est.house}, booked by the week and nothing shorter, with a kitchen. Danish holiday houses sit on the coasts and in the countryside, not in town centres, so build the days around a base out there with trips in, and name the town it is near.`
    : est.lowPlan.rooms.join(",") === est.highPlan.rooms.join(",") && est.lowPlan.beds === est.highPlan.beds
      ? ` That bed figure is ${asPlan(est.highPlan)}.${est.bedsLow ? ` Do not price a private room against it: a private double runs ${ROOM_KR[2].low} to ${ROOM_KR[2].high} a night.` : ""}`
      : ` The low end of that bed figure is ${asPlan(est.lowPlan)} and the high end is ${asPlan(est.highPlan)}, so say which you are assuming if you put a price on a night.`;
  // ── AND WHAT IS NOT IN IT ────────────────────────────────────────
  //
  // The panel names these and the brief did not, while the system prompt asks the
  // planner for "a rough per-day total". So it could hand a traveller this figure
  // as their day's spending with no entry fees, no local transport and no travel
  // between towns in it.
  const out = est.excludes?.length ? ` It does NOT include ${est.excludes.join(", ")}, so add those separately rather than presenting this as a whole day's spending.` : "";
  // THE SEASON GOES WITH IT, because the planner is the half of this that can
  // act on it. A guide told the figure is a high-season one will not go looking
  // for a March price to contradict it, and one told no season was read knows
  // the band is wide for a reason.
  // A bed that is already paid for has no season in it, and neither has food.
  // The first version told a traveller who had booked their room that their
  // groceries were priced in high season.
  // A house's season comes from summerhouse.js, which priced each one, not from
  // the hostel's calendar. Same reason as estimateSays above.
  const houseSeason = est.house ? ` ${houseSays(est.season)}` : "";
  const when = est.bedPaid ? "" : est.house ? houseSeason
    : est.season === "high" ? " Priced in high season, June to August."
    : est.season === "winter" ? " Priced at low season, since Danish hostels do not publish a December to February rate."
    : est.season === "low" ? " Priced in low season, March to May and September to November."
    // ── AND THE PLANNER IS NOT TOLD A DATE IS MISSING WHEN IT IS NOT ─
    //
    // This said "No arrival date was given" for a trip that straddles the
    // boundary, while the same prompt carried the arrival date in two other
    // blocks. And it cannot see a date typed in the chat rather than the picker,
    // so it must not assert the absence of one at all: the brief has its own
    // `when` slot, which reads both, and that is the block the planner is told
    // overrides everything else.
    : !est.seasonal ? ""
    : est.straddles ? ` The trip spans both seasons, so this holds both: ${est.intoSummer ? "the cheap end is the nights before June and the top is the nights after it" : "the top is the nights up to the end of August and the cheap end is the ones after it"}.`
    : " This spans low season and summer, because the figure had no trip dates to narrow it by. Go by the trip dates in this block rather than by the width of that band.";
  return `${money} ${covers.replace(/, with the bed/, `${paidFor} with the bed`)}${who}.${bedKind}${when}${out} Estimated from what they picked rather than a figure they gave, so treat it as the shape of the trip they want rather than a limit they stated.`;
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
// ── AND WHETHER TO MARK THE SOMMERHUS ON THE ROW ────────────────────
//
// Oliver, 26 Sep 2026: "imagine at the end summerhouses (strongly recommended /
// Recommended for your trip).. if someone is a family of 4 on Jutland.."
//
// The mark is decided by the money rather than by a rule about families, and the
// comparison is against the CHEAPEST bed this panel otherwise offers, in the
// same season, for the same party. houseFit does the comparing; this hands it
// the hostel prices so summerhouse.js never has to know what a bunk costs.
//
// His family of four comes out strongly recommended in every season, which is
// what he expected. So does a party of three, which a rule written as "four or
// more" would have missed, and a pair in January, which one written as "not for
// two" would have hidden: 105 a head against 145 for a bunk.
export const bunkPerHeadIn = (season, heads) => {
  const people = Math.max(1, Math.floor(Number(heads)) || 1);
  const bed = bedPerNight("cheapest", people, season);
  return bed ? { low: Math.round(bed.low / people), high: Math.round(bed.high / people) } : null;
};

// ── AND THE MARK AND ITS REASON READ THE SAME TWO THINGS ────────────
//
// Found live on 26 Sep 2026, with 10 to 17 October in the date fields and no
// stay chip ticked: the chip was marked on OCTOBER prices and the sentence
// under it read "105 to 287 kr a head a night", which is January's cheapest
// against July's dearest, every season at once.
//
// The split: summerhouseFit derives the season from the two dates, and the
// sentence was handed budgetEstimate.season, which is a different value with
// a different job. That one is the season THE BED was priced in, and it is
// null whenever no bed was priced, which is exactly the state a traveller is
// in while they are still reading the row. Two readers of one value, the
// oldest fault in this codebase.
//
// So both read this, and neither can answer differently from the other. The
// party is here for the same reason: the verdict counted heads off the brief
// while the sentence took the panel's, so a family of four could be marked on
// four and have it explained on two.
export const houseReading = ({ travellers = "", heads = null, arrival = "", departure = "" } = {}) => {
  const said = partyOf(travellers);
  return {
    people: Math.max(1, Math.floor(Number(heads ?? said?.heads ?? 2)) || 1),
    season: bedSeasonOf(arrival, departure),
  };
};

export const summerhouseFit = ({ travellers = "", heads = null, nights = 0, arrival = "", departure = "" } = {}) => {
  const { people, season } = houseReading({ travellers, heads, arrival, departure });
  return houseFit({
    heads: people,
    nights,
    season,
    bunkPerHead: season ? bunkPerHeadIn(season, people) : null,
    bunkBySeason: { winter: bunkPerHeadIn("winter", people), low: bunkPerHeadIn("low", people), high: bunkPerHeadIn("high", people) },
  });
};

// The words on the chip, and the one under the row. Empty where it is not
// marked, because a mark on everything is a mark on nothing.
export const SUMMERHOUSE_MARK = {
  [HOUSE_FIT.strong]: "strongly recommended",
  [HOUSE_FIT.yes]: "recommended for your trip",
};
export const summerhouseWhy = (fit, { travellers = "", heads = null, arrival = "", departure = "" } = {}) => {
  if (!fit) return "";
  const { people, season } = houseReading({ travellers, heads, arrival, departure });
  const house = housePerHead(people, season);
  const bunk = bunkPerHeadIn(season, people);
  if (!house || !bunk) return "";
  // ── AND THE THING IT IS BEING COMPARED TO IS NAMED CORRECTLY ────
  //
  // This said "a hostel bunk" whatever the cheapest tier had landed on, and for
  // a family of four in July that tier is a Danhostel family ROOM at 200 a head,
  // not a bunk at all. The plan already says which it is; read it rather than
  // assuming, the same rule the bed sentence follows.
  const plan = bedPerNight("cheapest", people, season)?.highPlan;
  const against = !plan ? "the cheapest bed here"
    : plan.rooms.length && !plan.beds ? (plan.rooms.length === 1 ? "a hostel family room" : "hostel rooms")
    : plan.rooms.length ? "a hostel room and bunks"
    : "a hostel bunk";
  const band = (b) => (b.low === b.high ? `${b.low}` : `${b.low} to ${b.high}`);
  return `A whole house works out at ${band(house)} kr a head a night against ${band(bunk)} for ${against}, with a kitchen and no strangers in the room. It is booked by the week and nothing shorter.`;
};

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
// ── ROUNDED COARSELY, BUT NEVER COARSER THAN THE FIGURE ─────────────
//
// Kroner round to ten because the inputs are room rates and counter prices; a
// euro figure rounds to five for the same reason, since ten euros is seventy-five
// kroner and would be a coarser claim than the numbers behind it support.
//
// AND A SMALL FIGURE ROUNDS FINER, which a review pass found the hard way. The
// cheapest food tier is 19 to 57 kr, which is 2.22 to 6.67 pounds, and a five
// unit bucket turned both ends into 5: the panel offered a British traveller
// "5 pounds a day" for a band nearly four times wide, and before that it offered
// "0 to 5 pounds", which is the one figure a money column must never invent.
//
// So the bucket answers to the size of what it is rounding. Under twenty units
// it is one, which is the granularity the underlying kroner support anyway.
const SMALL = 20;
const step = (code, n) => {
  const big = clean(code) === "DKK" || clean(code) === "SEK" || clean(code) === "NOK" ? 10 : 5;
  return Math.abs(Number(n)) < SMALL ? 1 : big;
};
const toStep = (n, code) => {
  const v = Number(n);
  const k = step(code, v);
  const out = Math.round(v / k) * k;
  // A real cost never rounds to nothing. Every other rounding error is a small
  // lie and this one is a different claim.
  return out === 0 && v > 0 ? k : out;
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
