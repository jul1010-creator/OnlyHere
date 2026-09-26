// ── THREE OPTIONS YOU CAN CLICK ON ──────────────────────────────────
//
// Oliver, 24 Sep 2026: "At the estimate budget, make 3 options you can click
// on. Make a cheapest (grocery stores) cheap food (kebab/hotdog stands/
// McDonalds) normal restaurants (restaurants and danish food)."
//
// The idea is right and the reason is better than the tiers: the single figure
// this replaced carried a hidden assumption about how somebody eats, and a
// hidden assumption is a guess. Three buttons turn it into a question the
// traveller answers. "Ask is better than hallucination", his own words, from
// the add-in panel.
//
// ── AND THE FIRST VERSION OF THIS FILE WAS WRONG ────────────────────
//
// It took the median of the published food library. He caught it on one row:
// "the 'Prinsen's Pizza' one has no 30 dkk. The lowest Pizza is 55. And that's
// a kid's meal." Every part of that was worse than it looked.
//
//   Prinsens stores price "30-90 DKK" and __priceSource NULL. Nothing ever
//   checked it. readPrice in costLedger.js refuses a row with no price source
//   for exactly this reason, and the reader here read the raw field and
//   skipped that gate: a second reader of one value, disagreeing with the
//   app's own, which is the failure this codebase has named more than once.
//
//   Restaurant Surt & Sødt stores "19-58 DKK for small plates, up to 135 DKK
//   for mains" and the reader took 19, which the same sentence calls a small
//   plate. Chickie's 59 is a dessert waffle. Sømods Bolcher is a sweet shop
//   whose stored string says 66-265 while its own checked source says 139.
//
// So the cheap band was a kid's pizza, a waffle, a small plate and a bag of
// boiled sweets. Not one of them was a meal.
//
// ── AND FIXING THE ROWS WOULD NOT HAVE FIXED IT ─────────────────────
//
// This is the part that settles the design. Twenty-one entries is a sample of
// places Oliver found interesting, not a sample of Danish food prices. Even
// with every figure correct, the median of an editorial choice is not what a
// meal costs in this country.
//
// THE LIBRARY SAYS WHAT A PARTICULAR PLACE COSTS. A BUDGET SAYS WHAT A COUNTRY
// COSTS. Those are different questions and one is not computed from the other.
//
// ── WHICH LEAVES ONE TIER SOURCEABLE AND TWO NOT ────────────────────
//
// Searched on 24 Sep 2026: Danmarks Statistik, HORESTA, Landbrug & Fødevarer,
// and McDonald's Denmark's own site. No Danish body publishes an average
// restaurant main course price, and McDonald's does not publish a national
// menu price at all, because its prices vary by restaurant.
//
// So this file states a figure for the one tier that has a real source and
// states none for the two that do not. A tier with no figure is not a broken
// tier: it says what it is, says why there is no national number, and shows
// the priced places this guide actually sends them to. That is more use than a
// confident average nobody measured, and it is the same choice the price
// fields already make when they render empty rather than guessing.

// ── THE SHOP, PRICED AT THE SHOPS ───────────────────────────────────
//
// Oliver, 24 Sep 2026, twice. First: "Danish Rugbrød can last the entire trip
// for one person." Then: "Look up Netto, Lidl, and Rema 1000."
//
// Both corrections land on the same thing, and it is the UNIT rather than the
// number. This tier used to carry Danmarks Statistik's 57 kr a head a day,
// which is a resident's whole grocery life: coffee, snacks, dinner, every day
// of the year. A visitor doing rugbrød and pålæg buys a loaf, some pålæg and
// butter ONCE, and it lasts. A rate that accrues daily was the wrong shape for
// a basket that does not.
//
// So it is priced at the shops, which is the standard everything else here is
// held to: the price a named seller charges, on a stated day.
//
//   Rugbrød, 24 Sep 2026. Rema 1000's own shop: Barbaras 850g at 20,00 and
//   Kohberg 600g at 21,50. Lidl's own brand Madværket 500g at 4,95 and 5,95.
//   Branded loaves elsewhere run 15 to 25.
//
//   Pålæg, Rema 1000, same day: kogt skinke 140g at 12,13, kyllingebryst 120g
//   at 12,95, kalkunbryst 120g at 14,95, pålægsmix 400g at 20,09. Leverpostej
//   from about 8.
//
// A loaf, two packs of pålæg and butter comes to roughly 50 at a discounter
// and roughly 65 on branded goods. 60 is the middle of that and is stated as
// what it is: ONE SHOP, not a daily rate.
//
// WHAT IT DOES NOT COVER is dinner, and the sentence says so rather than
// letting a reader think sixty kroner feeds them for a week. Danmarks
// Statistik's 57 a day is kept for exactly that: it is what a full
// self-catering day costs when dinner is cooked too.
// ── AND HOW LONG ONE SHOP LASTS ─────────────────────────────────────
//
// Oliver, 24 Sep 2026: "it is to be assumed that someone is probably only in
// Denmark for a week at most."
//
// That turns a phrase into a bound. "A loaf lasts the trip" is true of a trip
// of a few days and false of a fortnight, and a flat basket would have
// understated a two week stay by half without ever saying so. So the basket
// is bought PER WEEK, which is his assumption used as the limit of its own
// validity rather than as a silent cap: inside a week it is one shop, and past
// one it buys another loaf, as anybody would.
export const BASKET_DAYS = 7;

export const SHOP_BASKET = {
  kr: 60,
  low: 50, high: 65,
  source: "https://shop.rema1000.dk/brod-bavinchi/rugbrod",
  checkedAt: "2026-09-24",
  says: "A loaf of rugbrød, two packs of pålæg and butter: about 50 DKK on discounter own brands, about 65 on branded. Rugbrød was 20,00 to 21,50 at Rema 1000 and 4,95 for Lidl's own, and pålæg 12 to 15 a pack.",
};

// A full self-catering day, dinner cooked as well. Danmarks Statistik,
// Forbrugsundersøgelsen 2024: 41,851 kr a year per household on food and soft
// drinks at 2.0 people a household, which is 57 a head a day. The population
// is right for this one: somebody cooking every meal fills a resident's
// trolley.
export const GROCERY_DAY = {
  kr: 57,
  source: "https://www.dst.dk/da/Statistik/udgivelser/NytHtml?cid=52886",
  checkedAt: "2026-09-24",
  says: "Danmarks Statistik, Forbrugsundersøgelsen 2024: 41,851 kr a year per household on food and soft drinks, at 2.0 people a household.",
};

// ── AND WHY THE AREA DOES NOT DECIDE THE PRICE ──────────────────────
//
// Oliver, 24 Sep 2026, retiring his own earlier idea and giving the better
// reason: "outside strøget, much of Copenhagen is not much different from
// outside Copenhagen. You can go to Nørrebro and find extremely cheap food. So
// it's difficult to estimate restaurants."
//
// That settles what the regional numbers actually mean. Danmarks Statistik
// reports household restaurant spend from 14,504 kr a year in Hovedstaden to
// 5,249 in Midtjylland, and it is tempting to read a three times price
// difference into it. It is not one. It is how OFTEN people eat out, and a
// capital eats out more. The kebab shop on Nørrebrogade prices like the kebab
// shop in Randers.
//
// So no tier here is scaled by region, and the tourist strips are the real
// axis rather than the map: Strøget and Nyhavn are dear because of who walks
// past, not because of which city they are in.
export const REGION_SPREAD_NOTE = "Danmarks Statistik's regional spread on eating out is how often people eat out, not what a meal costs. A kebab on Nørrebrogade prices like a kebab in Randers, and the expensive places are the tourist strips rather than the expensive towns.";

// ── WHAT THE CHEAP TIER COSTS, PRICED AT THE COUNTER ────────────────
//
// 50 to 90 DKK for a kebab, a hot dog from a pølsevogn or a burger chain meal,
// and anything above that is a sit-down.
//
// CHECKED AGAINST PUBLISHED MENUS ON 24 SEP 2026, and the band holds exactly,
// including where it breaks:
//
//   Kösk Kebab's own menu: shawarma durum 54, kylling durum 53, falafel durum
//   54, adana kebab i durum 87, kebab box 65. All inside the band. The set
//   menu with fries and a drink is 99 and a sit-down plate is 112 to 162, both
//   over it, which is the tier above doing its job.
//
//   McDonald's: a cheeseburger is 17. That is a RECOMMENDED price and the
//   article that reports it says so plainly, franchise owners decide for
//   themselves, which is why no single national McDonald's figure exists to
//   cite and why this tier is a band rather than a price.
//
// SAID FLATLY, with nobody credited. Oliver, 24 Sep 2026: "Don't write
// according to locals. This is the truth." The rule already existed in
// NOTE_PROMPT: a line no page backs is said plainly, without the hedging you
// would use for something you were unsure of, and never credited to one
// person.
export const STREET_MEAL = {
  low: 50, high: 90,
  cheapest: 17,
  cheapestOf: "a McDonald's cheeseburger",
  source: "https://koskkebab.resto.dk/menu",
  checkedAt: "2026-09-24",
  // TWO BOUGHT MEALS A DAY, stated rather than folded in. Somebody living off
  // street food is not buying breakfast from a pølsevogn: the picture is a
  // bakery or the hotel in the morning and two paid meals after it.
  mealsADay: 2,
};

// ── AND THE ONE ABOVE IT, WHICH IS A WAY OF EATING NOT A PLACE ──────
//
// Oliver's own framing and his own band: "Flexible (150-300 dkk)". The name is
// the useful part. "Restaurants" named a kind of building and invited the
// question he could not answer, which is what an average Danish main costs.
// Flexible names a way of travelling: eat what you feel like, sit down when
// you want to, without counting.
//
// A DAY IS ONE SIT-DOWN AND ONE CHEAP MEAL, which is what flexible means in
// practice and is stated so a reader who does otherwise can scale it. Two
// restaurant meals a day is a different trip and this band would understate it.
//
// Cross-checked against the food entries Gemlyx has published, which is what
// that library IS good for: SanGiovanni 165, Catch Me Sushi 209, Flammen 239,
// Seoul BBQ 249, Tony's 250. His band sits over the middle of them.
export const FLEXIBLE_MEAL = { low: 150, high: 300 };

// ── "THAT ALSO HAS TO BE A WARNING" ─────────────────────────────────
//
// Oliver, 24 Sep 2026, and this is the sentence the whole section was missing:
// "The fixed prices are for the guide. The estimates are for what people
// decide to buy when they're off. It's likely we do not decide what they eat
// and where they stay. So it's estimates for them."
//
// That is the cleanest statement of the split this block already renders, and
// it is a stronger claim than "inevitable versus chosen". The two halves have
// different EPISTEMIC standing, not just different payers:
//
//   Everything above is a thing this guide put in front of them. A ticket for
//   a stop on day 4, read off that attraction's own page. The petrol for a
//   route this plan chose, measured. Somebody checked each of those.
//
//   Everything below is a guess about what a stranger will feel like eating.
//   Nobody checked it, because there is nothing to check: the number depends
//   on a decision they have not made yet.
//
// A figure carrying a kroner sign looks the same in both halves, which is
// exactly why this is said out loud rather than implied by a heading.
export const BUDGET_WARNING = "An estimate, not a price we checked. Gemlyx does not decide what you eat or where you sleep, so this half of the page is a guess at the choices you have not made yet. The prices above it are the ones this plan puts in front of you.";

// ── AND HOW MANY TIMES A DAY THEY ACTUALLY EAT ──────────────────────
//
// Oliver, 24 Sep 2026: "when I travel, I usually only eat twice a day. No
// breakfast. Just lunch and dinner. Should we consider that as well?"
//
// Yes, and it is the biggest single lever in this whole section: it moves
// every eating-out figure by half again, which is more than the gap between
// two of the tiers. It had been sitting in the module as a constant and in the
// prose as a disclosure, which is the shape of an assumption that should have
// been a question. Same argument as the tiers themselves: ask rather than
// guess.
//
// TWO IS THE DEFAULT, because it is what somebody travelling does. A hotel
// breakfast is usually already paid for with the room, a bakery on the way out
// is not a bought meal in the sense this counts, and the traveller who eats
// three restaurant meals a day is the rarer one.
//
// ONE PAIR OF BUTTONS AND NOT A SECOND ROW OF THREE. It applies to every tier
// at once, so it is one control, which is the difference between a choice and
// a configurator.
export const MEALS_A_DAY_OPTIONS = [2, 3];
export const MEALS_A_DAY_DEFAULT = 2;
export const cleanMeals = (n) => (MEALS_A_DAY_OPTIONS.includes(Math.floor(Number(n))) ? Math.floor(Number(n)) : MEALS_A_DAY_DEFAULT);

// ── THE THREE TIERS ─────────────────────────────────────────────────
//
// A tier carries either `perTrip`, a basket bought once, or `dayRate(meals)`,
// a rate that answers to how often they eat. That split is the whole of his
// rugbrød correction, and the function is the whole of his two-meal one: a
// fixed `perDay` could not answer a question the reader is now asked.
export const FOOD_TIERS = [
  {
    key: "self",
    label: "Cheapest",
    what: "Grocery store. Rugbrød and pålæg, and one loaf lasts one person most of a short trip.",
    perTrip: SHOP_BASKET.kr,
    // ── AND WHAT ONE DAY OF IT COSTS, AT BOTH ENDS ────────────────
    //
    // Added 26 Sep 2026. budgetEstimate.js was inventing this: it divided
    // GROCERY_DAY by three for a low end and multiplied a day rate by 1.6 for a
    // high one, neither of which anybody published, while the real high ends sat
    // in this file as STREET_MEAL.high and FLEXIBLE_MEAL.high. Its own header
    // says the food half is not re-priced there, and it was.
    //
    // A DAY OF THIS TIER IS A BASKET STRETCHED OR A KITCHEN USED. The cheap end
    // is the one shop spread over the week it lasts; the dear end is a full
    // self-catering day with dinner cooked, which is the household figure.
    dayBand: () => ({ low: Math.round(SHOP_BASKET.kr / BASKET_DAYS), high: GROCERY_DAY.kr }),
    source: SHOP_BASKET.source,
    checkedAt: SHOP_BASKET.checkedAt,
    // The basket does not answer to meals a day, and that is not an oversight:
    // skipping breakfast makes a loaf last LONGER, so the one shop covers the
    // same trip either way.
    basis: `${SHOP_BASKET.says} Bought once rather than daily, so eating twice a day rather than three times makes it last longer rather than cost more. It covers the meals you make yourself: a full self-catering day with dinner cooked too runs to about ${GROCERY_DAY.kr} DKK a head, on Danmarks Statistik's household figures.`,
  },
  {
    key: "cheap",
    label: "Cheap",
    what: "Kebab and hot dog stands, McDonald's, a pizza slice.",
    dayRate: (meals) => STREET_MEAL.low * cleanMeals(meals),
    // The same meals counted at the other end of the published durum band, which
    // is what "the high end is nearly double" in the basis text means. A panel
    // that multiplied the low end by 1.6 was quoting 160 where this says 180.
    dayBand: (meals) => ({ low: STREET_MEAL.low * cleanMeals(meals), high: STREET_MEAL.high * cleanMeals(meals) }),
    source: STREET_MEAL.source,
    checkedAt: STREET_MEAL.checkedAt,
    basis: `A kebab, a hot dog from a pølsevogn or a burger chain meal runs ${STREET_MEAL.low} to ${STREET_MEAL.high} DKK: published durum prices sit at 53 to 87, and ${STREET_MEAL.cheapestOf} is ${STREET_MEAL.cheapest}, though that is a price McDonald's recommends and each franchise sets its own. Counted at the low end of the band, so the high end is nearly double.`,
  },
  {
    key: "flex",
    label: "Flexible",
    what: `Eat what you feel like. A sit-down meal runs ${FLEXIBLE_MEAL.low} to ${FLEXIBLE_MEAL.high} DKK.`,
    // ONE SIT-DOWN A DAY AND THE REST CHEAP, whatever the count. That is what
    // eating flexibly looks like: the extra meal is a sandwich, not a second
    // restaurant, and treating it as a second restaurant would make this tier
    // the "two restaurants a day" trip it explicitly is not.
    dayRate: (meals) => FLEXIBLE_MEAL.low + STREET_MEAL.low * (cleanMeals(meals) - 1),
    // One sit-down and the rest cheap, priced at both ends of both bands. Still
    // one sit-down at the top: two restaurant meals a day is the other trip and
    // the basis text prices it separately.
    dayBand: (meals) => ({
      low: FLEXIBLE_MEAL.low + STREET_MEAL.low * (cleanMeals(meals) - 1),
      high: FLEXIBLE_MEAL.high + STREET_MEAL.high * (cleanMeals(meals) - 1),
    }),
    basis: `One sit-down meal at ${FLEXIBLE_MEAL.low} DKK and the rest of the day's eating cheap, which is what eating flexibly looks like rather than a restaurant every time. Two sit-down meals a day is a different trip and would run to about ${FLEXIBLE_MEAL.high * 2} DKK a head. Where you eat decides this far more than which town you are in: the dear places are the tourist strips, and Nørrebro is as cheap as anywhere outside the capital.`,
  },
];

export const FOOD_TIER_DEFAULT = "cheap";
export const foodTier = (key) => FOOD_TIERS.find(t => t.key === key) || FOOD_TIERS.find(t => t.key === FOOD_TIER_DEFAULT);

// The rate to print on a tier's own button, at whatever count is showing.
export const tierDayRate = (key, meals = MEALS_A_DAY_DEFAULT) => {
  const t = foodTier(key);
  return typeof t?.dayRate === "function" ? t.dayRate(meals) : null;
};

// ── AND BOTH ENDS OF A DAY, FOR ANYBODY SHOWING A BAND ──────────────
//
// The one reader of what a day of a tier costs from cheap end to dear end. It
// exists because budgetEstimate.js was working it out for itself off a division
// and a multiplier nobody published, so the budget panel and the guide's cost
// block quoted different figures for the same tier on the same trip.
export const tierDayBand = (key, meals = MEALS_A_DAY_DEFAULT) => {
  const t = foodTier(key);
  if (typeof t?.dayBand !== "function") return null;
  const b = t.dayBand(meals);
  return b && Number.isFinite(b.low) && Number.isFinite(b.high) ? b : null;
};

// What a tier costs over a trip. Rounded to the nearest ten: the inputs are a
// shop basket and a stated number of meals a day, and printing either to the
// krone would claim more.
export const tierCost = (key, { days = 0, heads = 1, meals = MEALS_A_DAY_DEFAULT } = {}) => {
  const t = foodTier(key);
  const n = Math.floor(Number(days));
  const people = Math.max(1, Math.floor(Number(heads)) || 1);
  if (!t || !Number.isFinite(n) || n <= 0) return null;
  const perTrip = Number(t.perTrip);
  const perDay = tierDayRate(key, meals);
  // A basket bought once does not multiply by the nights.
  // A basket is bought per week, not per night and not once forever. See
  // BASKET_DAYS: a loaf lasts a short trip, which is the assumption, so past a
  // week it buys another one.
  const shops = Math.max(1, Math.ceil(n / BASKET_DAYS));
  const raw = Number.isFinite(perTrip) && perTrip > 0 ? perTrip * people * shops
    : (Number.isFinite(perDay) && perDay > 0 ? perDay * people * n : null);
  if (raw == null) return null;
  return {
    key: t.key,
    from: Math.round(raw / 10) * 10,
    perDay: Number.isFinite(perDay) && perDay > 0 ? perDay : null,
    perTrip: Number.isFinite(perTrip) && perTrip > 0 ? perTrip : null,
    shops: Number.isFinite(perTrip) && perTrip > 0 ? shops : null,
    meals: cleanMeals(meals), people, days: n, checkedAt: t.checkedAt || "",
  };
};

export const describeTier = (key, cost) => {
  const t = foodTier(key);
  if (!t) return "";
  if (!cost) return t.basis;
  const who = cost.people > 1 ? `${cost.people} of you` : "one";
  const rate = cost.perTrip
    ? `About ${cost.perTrip} DKK a head for the shop, for ${who}${cost.shops > 1 ? `, bought ${cost.shops} times across ${cost.days} days` : ""}`
    : `${cost.perDay} DKK a head a day for ${who}, ${cost.meals} bought meals a day across ${cost.days} ${cost.days === 1 ? "day" : "days"}`;
  return `${rate}. ${t.basis}`;
};
