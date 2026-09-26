// ── A HOUSE, NOT A BED ──────────────────────────────────────────────
//
// Oliver, 26 Sep 2026: "I want you to create one specifically for summerhouses,
// perhaps? Like imagine at the end summerhouses (strongly recommended /
// Recommended for your trip).. if someone is a family of 4 on Jutland.."
//
// He had already put the argument in one line, about Skagen: "It's not cheap
// cheap.. but for what you get, it's cheap." He was righter than that. Measured
// against the beds this app already prices, a sommerhus is not merely good
// value for a family. In every season it is the CHEAPEST way for four people to
// sleep in Denmark, and in the busiest week of the year it undercuts a dorm bunk.
//
// ── PRICED PER HOUSE, PER WEEK, WHICH NOTHING ELSE HERE IS ──────────
//
// Every other bed in this app is a price per night. A sommerhus is a price for
// SEVEN NIGHTS, for the whole house, and there is no shorter booking. Both facts
// change what the panel can say: the per-head figure falls hard with the party,
// harder than the Danhostel curve, and a trip of three nights cannot use one at
// all. Held in the unit it is sold in and divided once, at the end, the same
// discipline ROOM_KR follows.
//
// ── READ FROM THE SELLER'S OWN BOOKING ENGINE ───────────────────────
//
// Novasol, searched on 26 Sep 2026 for Jutland, seven nights, sorted cheapest
// first, at three arrival dates chosen to land in each of the seasons this app
// already knows. These are the prices payable on the day, not list prices:
//
//   9 Jan 2027    4 sleeps  1,472 to 1,643     6 sleeps  1,513 to 1,807
//   16 Oct 2027   4 sleeps  1,755 to 2,266     6 sleeps  2,029 to 2,260
//   10 Jul 2027   4 sleeps  3,432 to 4,014     6 sleeps  3,696 to 4,184
//
// Availability is not the constraint: 3,638 houses for that January week, 4,479
// in October, 4,654 in July, of which 2,304 had a wood burner or an open fire.
//
// ── AND THE SEASON HERE IS REAL, UNLIKE THE ONE I INVENTED ──────────
//
// Twice in two days I have built a summer price by taking somebody's published
// ratio and applying it to a figure that was not the ratio's base. The first
// time it was Danhostel's per-ROOM step added to a single bunk. The second time
// it was Danmarks Statistik's "131 percent dearer in high season" applied to
// Novasol's late-September prices, which produced 342 kr a head for a July week
// when the real answer is 123 to 143. I was out by nearly three times, in the
// direction that would have killed this whole feature before it was built.
//
// The ratio was never the problem. DST is right: these figures come out at 2.3
// times from January to July, which is its 131 percent almost exactly. The base
// was the problem. September is not the cheapest month. January is.
//
// So every figure below was READ, at the date it applies to, and the national
// statistic is kept as the cross-check it should have been all along rather than
// as the source of a number.
export const HOUSE_SOURCE = "https://www.novasol.dk/danmark/jylland";
export const HOUSE_CHECKED_AT = "2026-09-26";

// The only length a sommerhus is sold in, and the reason a short trip cannot
// have one whatever the price says.
export const HOUSE_NIGHTS = 7;

// By how many the house sleeps. Two sizes, because two sizes were measured; see
// houseWeek for what happens to a party bigger than the biggest of them.
export const HOUSE_WEEK = {
  4: { winter: { low: 1472, high: 1643 }, low: { low: 1755, high: 2266 }, high: { low: 3432, high: 4014 } },
  6: { winter: { low: 1513, high: 1807 }, low: { low: 2029, high: 2260 }, high: { low: 3696, high: 4184 } },
};
export const HOUSE_SIZES = Object.keys(HOUSE_WEEK).map(Number).sort((a, b) => a - b);

// Danmarks Statistik, 28 Jun 2023, on holiday-home rents: high season runs 131
// percent above the cheapest month, and July was the dearest month every year
// from 2018 to 2022. Kept as the cross-check, not as a source: the figures above
// come out at 2.3 times from January to July, which agrees with it.
export const HOUSE_SEASON_CHECK = {
  says: "Danmarks Statistik puts a high-season holiday home 131 percent above the cheapest month, with July dearest every year from 2018 to 2022. The prices here were read at each season rather than derived from that, and they come out at 2.3 times January to July, which agrees with it.",
  source: "https://www.dst.dk/da/Statistik/nyheder-analyser-publ/bagtal/2023/2023-06-28-feriehuse-priser-kvm",
  checkedAt: "2026-09-26",
};

// An unknown season spans the cheapest month and the dearest, which is the
// honest width when nobody has said when they are coming. Winter and low are
// separate columns here, unlike the hostel's, because a sommerhus in January is
// genuinely cheaper than one in October rather than the same price.
const seasonKey = (season) => (season === "high" || season === "low" || season === "winter" ? season : null);

// The smallest published house that sleeps the party. A party larger than the
// biggest measured size takes that one's rate: the curve keeps falling past it
// (an eight-sleeper came out at 33 a head that January week against 36 for six),
// so this errs high, which is the safe direction for a figure somebody budgets
// against.
export const houseFor = (heads) => {
  const n = Math.max(1, Math.floor(Number(heads)) || 1);
  return HOUSE_SIZES.find(s => s >= n) || HOUSE_SIZES[HOUSE_SIZES.length - 1];
};

// What the whole house costs for its week, before anybody divides it.
export const houseWeek = (heads, season = null) => {
  const size = houseFor(heads);
  const row = HOUSE_WEEK[size];
  if (!row) return null;
  const key = seasonKey(season);
  const band = key ? row[key] : { low: row.winter.low, high: row.high.high };
  return { ...band, sleeps: size, season: key };
};

// And per person per night, which is the unit the panel shows. The division is
// by the PARTY, not by what the house sleeps: four people in a six-sleeper pay
// for the house, not for four sixths of it.
export const housePerHeadNight = (heads, season = null) => {
  const week = houseWeek(heads, season);
  if (!week) return null;
  const people = Math.max(1, Math.floor(Number(heads)) || 1);
  return {
    low: Math.round(week.low / people / HOUSE_NIGHTS),
    high: Math.round(week.high / people / HOUSE_NIGHTS),
    sleeps: week.sleeps,
    week,
  };
};

// ── AND WHETHER TO RECOMMEND IT, WHICH THE FIGURE DECIDES ───────────
//
// The first draft of this rule was a headcount and a season written by hand:
// four or more, outside July. Both were wrong. A house for TWO in January is 105
// a head against 145 for a Copenhagen bunk, so the headcount rule would have
// hidden it from the people it suits; and July turned out to be the season where
// it wins by the most, so the season rule was backwards.
//
// So nothing is hardcoded. It is recommended when it beats the cheapest bed this
// app otherwise offers, and strongly recommended when it beats that bed at its
// cheapest. The number makes the argument, which means the rule cannot drift
// away from the prices the way a sentence about "a family of four" would.
//
// THE ONE HARD GATE IS THE WEEK. A sommerhus is not sold by the night, so a trip
// shorter than seven nights cannot have one at any price.
export const HOUSE_FIT = { strong: "strong", yes: "yes" };

// One season, compared end for end. Both bands must be the SAME season or the
// comparison is a January house against a July bunk, which is the mistake this
// whole file exists downstream of.
// ── AND "YES" MEANS CHEAPER, NOT "CHEAPER IF EVERYTHING GOES RIGHT" ─
//
// The first rule here was house.low <= bunk.high: the CHEAPEST house against
// the DEAREST bunk. That is the same mixing this file refuses across seasons,
// committed inside one season across the price spread, and it showed. A pair
// in July is 245 to 287 a head in a house against 218 to 248 in a dorm, and it
// came out "recommended for your trip" on a three-kroner overlap between the
// two extremes, over a sentence printing both bands. A traveller who can read
// sees the recommendation argued against by its own numbers.
//
// So the middle of one band against the middle of the other: the house a
// traveller is likely to get against the bunk they are likely to get. The
// strong verdict is unchanged and is the strict one it always was, cheaper at
// its dearest than a bunk at its cheapest.
const fitInSeason = (heads, season, bunkPerHead) => {
  const house = housePerHeadNight(heads, season);
  if (!house || !bunkPerHead) return null;
  const lo = Number(bunkPerHead.low), hi = Number(bunkPerHead.high);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  if (house.high <= lo) return HOUSE_FIT.strong;
  return (house.low + house.high) <= (lo + hi) ? HOUSE_FIT.yes : null;
};

// ── AND WITH NO DATES, IT HAS TO WIN IN EVERY SEASON ────────────────
//
// The first version compared the undated house band against the undated bunk
// band, which is a January house against a July bunk: it recommended a house to
// a SOLO traveller, who is worse off in all three seasons (210 against 145 in
// January, 490 against 218 in July). The wide band said yes because its cheap
// end and the other band's dear end were ten months apart.
//
// So an unknown season is every season, and the weakest verdict is the answer.
// It cannot flatter and it cannot mix.
const SEASONS = ["winter", "low", "high"];
const WEAKEST = [null, HOUSE_FIT.yes, HOUSE_FIT.strong];
export const houseFit = ({ heads, nights, season = null, bunkPerHead = null, bunkBySeason = null } = {}) => {
  const n = Math.floor(Number(nights));
  if (!Number.isFinite(n) || n < HOUSE_NIGHTS) return null;
  const key = seasonKey(season);
  if (key) return fitInSeason(heads, key, bunkPerHead);
  // Every season, each against its own bunk price. bunkBySeason is injected so
  // this file never learns what a hostel costs: see budgetEstimate.js.
  if (!bunkBySeason) return null;
  const verdicts = SEASONS.map(s => fitInSeason(heads, s, bunkBySeason[s]));
  return verdicts.reduce((worst, v) =>
    (WEAKEST.indexOf(v) < WEAKEST.indexOf(worst) ? v : worst), HOUSE_FIT.strong);
};

// ── AND WHAT A DANISH WINTER IN ONE IS ACTUALLY LIKE ────────────────
//
// Oliver, 26 Sep 2026: "remember, it's september. And some people might use this
// app to plan something in winter."
//
// The right warning, and the cheapest season is the one that needs it. A price
// of 53 kr a head will sell itself; what it does not say is that the beach it
// sits on is dark by four in the afternoon and the wind comes off the North Sea.
// That is not a reason to hide the option, because 2,304 of the houses free that
// week had a wood burner and this is what Danes themselves do in January. It is
// a reason to say what they are buying, so nobody books a beach house expecting
// a beach.
export const houseSays = (season) => {
  const key = seasonKey(season);
  if (key === "winter") return "January is the cheapest week of the sommerhus year and it is not a beach holiday: dark by four, wind off the sea, and a wood burner in most of them. That is what Danes do with the season rather than a compromise.";
  // ── AND THIS SENTENCE DOES NOT COMPARE ─────────────────────────
  // It used to end "and it is still cheaper a head than a hostel bunk", which is
  // true for four people and FALSE for two: a pair in July is 245 to 287 a head
  // against 218 to 248 for a bunk. This line knows the season and not the party,
  // so the comparison belongs where the party is known, in summerhouseWhy.
  if (key === "high") return "July is the dearest week of the sommerhus year, roughly two and a half times January, and still the week everyone wants.";
  if (key === "low") return "Spring and autumn are the quiet middle: about half the July price, and the coast to yourselves.";
  return "A sommerhus is quoted by the week and the price swings more with the season than anything else in this estimate, roughly two and a half times from January to July. Put your dates in and this narrows a long way.";
};
