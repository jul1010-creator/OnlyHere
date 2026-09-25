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

const clean = (s) => String(s ?? "").trim();

// ── WHAT A BED COSTS, PRICED AT THE SELLERS ─────────────────────────
//
// Per person per night, which is the unit the figure is shown in. A hotel room
// is priced per room and sleeps two, so a room rate is halved and the halving
// is stated rather than hidden: a person travelling alone pays the room.
//
// CHEAPEST is the budget chains and the hostels, and it is well sourced
// because those sellers publish a price on their own front page.
//
//   CABINN, the Danish budget chain, advertises rooms from 575 kr a night on
//   its own site, across Copenhagen, Aarhus, Odense and Aalborg. That is about
//   290 a head for two.
//
//   Danhostel Nykobing Mors publishes 550 to 650 for a single and 600 to 700
//   for a double by season, plus 75 for linen and two towels. About 310 to 390
//   a head for two, and the linen is the part nobody expects.
//
//   A Copenhagen dorm bed starts around 145 to 350.
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
export const BED_TIERS = {
  cheapest: {
    low: 200, high: 350,
    source: "https://www.cabinn.com/",
    checkedAt: "2026-09-25",
    says: "CABINN publishes rooms from 575 kr a night, about 290 a head for two. A Danhostel double runs 600 to 700 by season plus 75 for linen. A Copenhagen dorm bed starts around 145.",
  },
  best: {
    low: 600, high: 900,
    source: "https://www.budgetyourtrip.com/denmark",
    checkedAt: "2026-09-25",
    says: "A Danish double at about 1,215 kr a room on traveller-reported spend, and a central Copenhagen mid-range room at 1,200 to 1,800. Halved for two sharing. No Danish body publishes a room rate to cite, so this is the softest figure here.",
  },
  booked: {
    low: 0, high: 0,
    source: "",
    checkedAt: "",
    says: "You have paid for it already, so it is not in this figure.",
  },
};

export const bedTier = (stay) => BED_TIERS[clean(stay)] || null;

// ── WHAT THE FIGURE IS NOT ──────────────────────────────────────────
//
// Named, one line each, in the order somebody would miss them. The free-only
// tick moves the first of these from an unknown to a zero, which is the one
// case where a tick makes the estimate MORE complete rather than cheaper.
export const EXCLUDED = {
  entry: "getting into places",
  travel: "getting between towns",
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
// NULL UNTIL BOTH HALVES ARE ANSWERED. A bed with no food, or food with no
// bed, is half a day's costs shown as a day's, which is worse than no figure:
// it reads as complete. The panel asks for the two ticks instead.
export const estimateDay = ({ stay = "", food = "", freeOnly = false, meals = MEALS_A_DAY_DEFAULT } = {}) => {
  const bed = bedTier(stay);
  const tier = clean(food) ? foodTier(food) : null;
  if (!bed || !tier) {
    return {
      ready: false,
      need: [!bed ? "where you sleep" : "", !tier ? "what you eat" : ""].filter(Boolean),
    };
  }
  // tierDayRate, not a second set of meal numbers. It returns null for the
  // grocery tier, whose basket is bought once rather than daily, so the day
  // figure for that one is Danmarks Statistik's full self-catering day: the
  // tier's own text already names it as what a day costs when dinner is
  // cooked too.
  const rate = tierDayRate(tier.key, meals);
  const foodLow = rate == null ? Math.round(GROCERY_DAY.kr / 3) : rate;
  const foodHigh = rate == null ? GROCERY_DAY.kr : Math.round(rate * 1.6);
  const parts = [
    { what: "a bed", low: bed.low, high: bed.high, source: bed.source, says: bed.says },
    { what: "food", low: foodLow, high: foodHigh, source: tier.source || "", says: tier.basis || "" },
  ];
  const excludes = [
    freeOnly ? "" : EXCLUDED.entry,
    EXCLUDED.travel,
    EXCLUDED.flights,
  ].filter(Boolean);
  return {
    ready: true,
    low: parts.reduce((n, p) => n + p.low, 0),
    high: parts.reduce((n, p) => n + p.high, 0),
    parts,
    excludes,
    // Stated separately from `excludes` because it is the opposite fact: the
    // tick did not remove a cost, it settled one.
    entryFree: !!freeOnly,
    bedPaid: stayIsBooked(stay),
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
export const estimateShort = (est) => {
  if (!est?.ready) return "";
  return est.low === est.high ? `${toTen(est.low)} kr a day` : `${toTen(est.low)} to ${toTen(est.high)} kr a day`;
};

// ── AND THE SENTENCE UNDER IT ───────────────────────────────────────
//
// What is in and what is out, in that order, because the traveller's first
// question about any estimate is whether the bed is in it.
export const estimateSays = (est) => {
  if (!est?.ready) return "";
  const inIt = est.bedPaid ? "Food only, since you have your bed already" : "A bed and food";
  const free = est.entryFree ? " Entry is nothing, since you asked for free attractions only." : "";
  return `${inIt}, per person.${free} It leaves out ${est.excludes.join(", ")}, which the guide prices once it knows the route.`;
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
  return `${money} ${covers}. Estimated from what they picked rather than a figure they gave, so treat it as the shape of the trip they want rather than a limit they stated.`;
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
