// ── HOW OLD EVERY CHECKED FIGURE IS ─────────────────────────────────
//
// Oliver, 26 Sep 2026, on his own idea of an AI pass over the prices every
// week: "Go with Claude's view." The view was that the figures in this app are
// sourced and dated, and a weekly AI pass over them replaces a checked number
// with an estimated one. The smaller version of the same idea is worth more:
// SAY WHICH ONES ARE GOING OLD, and let a person re-read the page.
//
// Every figure below carries a `checkedAt` and a `source`, and until this file
// exactly one of them was ever read (fuel.js asks its own pump price how old it
// is). The rest had a date nobody looked at, which is a date that cannot go
// stale because nothing would notice.
//
// ── ONE LIFETIME PER KIND, NOT ONE FOR EVERYTHING ───────────────────
//
// A pump price moves every morning. A hostel bed moves with the season. A
// national statistic moves once a year. A list of where hostels are moves when
// one closes. So each figure says what KIND of thing it is and the kind says
// how long it holds:
//
//   pump       30 days    FUEL_STALE_DAYS, the rule fuel.js already had
//   price      90 days    a shop's or a hostel's own price list
//   statistic  365 days   Danmarks Statistik and the like, published yearly
//   directory  180 days   which hostels exist, which coasts the agencies let
//
// ── AND IT IS A REGISTRY, SO THE NEXT FIGURE CANNOT BE FORGOTTEN ────
//
// Every figure is listed here by hand, which is exactly the rot the content
// type registry went through. So tests/run.mjs walks the modules that hold
// figures and fails on any exported object carrying a `checkedAt` that this
// list does not name. A figure added tomorrow is either registered or red.
import { BED_SEASON, SUMMER_BED, DORM_KR, BED_TIERS, STOREBAELT, TRAIN_HOP } from "./budgetEstimate";
import { SHOP_BASKET, GROCERY_DAY, STREET_MEAL } from "./mealsEstimate";
import { FUEL_PRICE, FUEL_USE, FUEL_STALE_DAYS } from "./fuel";
import { HOUSE_CHECKED_AT, HOUSE_SOURCE, HOUSE_SEASON_CHECK } from "./summerhouse";
import { STAY_PLACES_CHECKED_AT, HOSTEL_LIST_SOURCE } from "../data/stayPlaces";

export const FIGURE_LIFE = { pump: FUEL_STALE_DAYS, price: 90, statistic: 365, directory: 180 };

export const FIGURES = [
  { id: "fuel-price", label: "Pump prices, petrol and diesel", kind: "pump", checkedAt: FUEL_PRICE.checkedAt, source: FUEL_PRICE.source, where: "utils/fuel.js FUEL_PRICE" },
  { id: "fuel-use", label: "What a car drinks, l/100km", kind: "statistic", checkedAt: FUEL_USE.checkedAt, source: FUEL_USE.source, where: "utils/fuel.js FUEL_USE" },
  { id: "dorm-kr", label: "A Copenhagen dorm bed", kind: "price", checkedAt: DORM_KR.checkedAt, source: DORM_KR.source, where: "utils/budgetEstimate.js DORM_KR" },
  { id: "summer-bed", label: "A dorm bed in summer against low season", kind: "price", checkedAt: SUMMER_BED.checkedAt, source: SUMMER_BED.source, where: "utils/budgetEstimate.js SUMMER_BED" },
  { id: "bed-season", label: "Danhostel's own seasons", kind: "price", checkedAt: BED_SEASON.checkedAt, source: BED_SEASON.source, where: "utils/budgetEstimate.js BED_SEASON" },
  { id: "tier-hostel", label: "The hostel chip's figure", kind: "price", checkedAt: BED_TIERS.cheapest.checkedAt, source: BED_TIERS.cheapest.source, where: "utils/budgetEstimate.js BED_TIERS.cheapest" },
  { id: "tier-hotel", label: "The hotel chip's figure", kind: "price", checkedAt: BED_TIERS.best.checkedAt, source: BED_TIERS.best.source, where: "utils/budgetEstimate.js BED_TIERS.best" },
  { id: "house-week", label: "A sommerhus week, by season", kind: "price", checkedAt: HOUSE_CHECKED_AT, source: HOUSE_SOURCE, where: "utils/summerhouse.js HOUSE_WEEK" },
  { id: "house-season", label: "Holiday-home season ratio", kind: "statistic", checkedAt: HOUSE_SEASON_CHECK.checkedAt, source: HOUSE_SEASON_CHECK.source, where: "utils/summerhouse.js HOUSE_SEASON_CHECK" },
  { id: "storebaelt", label: "Storebælt bridge toll", kind: "price", checkedAt: STOREBAELT.checkedAt, source: STOREBAELT.source, where: "utils/budgetEstimate.js STOREBAELT" },
  { id: "train-hop", label: "A long DSB train hop", kind: "price", checkedAt: TRAIN_HOP.checkedAt, source: TRAIN_HOP.source, where: "utils/budgetEstimate.js TRAIN_HOP" },
  { id: "shop-basket", label: "A supermarket lunch basket", kind: "price", checkedAt: SHOP_BASKET.checkedAt, source: SHOP_BASKET.source, where: "utils/mealsEstimate.js SHOP_BASKET" },
  { id: "grocery-day", label: "A self-catering day", kind: "statistic", checkedAt: GROCERY_DAY.checkedAt, source: GROCERY_DAY.source, where: "utils/mealsEstimate.js GROCERY_DAY" },
  { id: "street-meal", label: "A street meal", kind: "price", checkedAt: STREET_MEAL.checkedAt, source: STREET_MEAL.source, where: "utils/mealsEstimate.js STREET_MEAL" },
  { id: "stay-places", label: "Where the hostels and sommerhus coasts are", kind: "directory", checkedAt: STAY_PLACES_CHECKED_AT, source: HOSTEL_LIST_SOURCE, where: "data/stayPlaces.js" },
];

const DAY_MS = 86400000;
export const figureAge = (figure, today = new Date()) => {
  const then = Date.parse(`${String(figure?.checkedAt || "").slice(0, 10)}T00:00:00Z`);
  const life = FIGURE_LIFE[figure?.kind];
  if (!Number.isFinite(then) || !life) return { ...figure, days: null, life: life || null, stale: null };
  const days = Math.floor((today.getTime() - then) / DAY_MS);
  return { ...figure, days, life, stale: days > life, dueIn: life - days };
};

// Oldest relative to its own lifetime first, so a pump price three weeks old
// sits above a statistic eleven months old: the pump price is nearer its end.
// A figure with no readable date sorts to the top, because an undated figure
// is the one that can never be checked.
export const figureAges = (today = new Date(), figures = FIGURES) =>
  figures.map(f => figureAge(f, today))
    .sort((a, b) => {
      if (a.days == null) return -1;
      if (b.days == null) return 1;
      return (b.days / b.life) - (a.days / a.life);
    });

// The one line the Studio shows above the list.
export const figureAgeNote = (today = new Date(), figures = FIGURES) => {
  const all = figureAges(today, figures);
  const stale = all.filter(f => f.stale !== false);
  if (!stale.length) {
    const next = all.filter(f => f.dueIn != null).sort((a, b) => a.dueIn - b.dueIn)[0];
    return next
      ? `All ${all.length} checked figures are inside their lifetime. The next to go old is ${next.label.toLowerCase()}, in ${next.dueIn} ${next.dueIn === 1 ? "day" : "days"}.`
      : `All ${all.length} checked figures are inside their lifetime.`;
  }
  return `${stale.length} of ${all.length} checked figures ${stale.length === 1 ? "is" : "are"} past ${stale.length === 1 ? "its" : "their"} lifetime. Open the source, read the figure again, and change the number and its date together.`;
};
