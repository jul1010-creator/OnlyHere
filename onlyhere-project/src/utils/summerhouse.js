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
// SEVEN NIGHTS, for the whole house, and a shorter booking costs about the same
// (see HOUSE_SHORT). Both facts
// change what the panel can say: the per-head figure falls hard with the party,
// harder than the Danhostel curve, and a trip of three nights pays for seven.
// Held in the unit it is sold in and divided once, at the end, the same
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
import { fold } from "./danishNames";

export const HOUSE_SOURCE = "https://www.novasol.dk/danmark/jylland";
export const HOUSE_CHECKED_AT = "2026-09-26";

// The length a sommerhus is priced in. It used to say "the only length", and
// it is not: see HOUSE_SHORT below.
export const HOUSE_NIGHTS = 7;

// ── A WEEKEND IS SOLD, AND IT COSTS ABOUT A WEEK ─────────────────────
//
// Oliver, 26 Sep 2026: "according to novasol, you can stay there for just a
// weekend if you want". He was right, and this file said the opposite in its
// header. Read on Novasol's own booking pages the same evening:
//
//   Blokhus, arriving Fri 6 Nov 2026, the same houses at 2 nights and 7:
//     1,567 against 1,785    2,682 against 3,352    6,432 against 7,751
//   Rudkøbing, arriving 14 Oct 2026 (his own find), one house:
//     3 nights 3,120 against 7 nights 2,978, because the week carried a 40
//     percent discount and the short stay about 21
//   Blokhus, arriving Fri 16 Jul 2027 for 2 nights: no house at all, while 54
//     were free for the Saturday week. In the summer holidays it is the week.
//
// So a short stay is never cheaper than the week in any reading, and sometimes
// dearer. His rule, 26 Sep 2026: price a short stay as the whole week, and
// tell them a week often costs the same or less. No ratio is invented for it.
export const HOUSE_SHORT = {
  says: "Novasol sells weekends and short stays outside the summer holidays, and read on 26 Sep 2026 a weekend cost about 80 to 90 percent of the same house for a week, while close to the date a discounted week could cost less than three nights. In mid July no Blokhus house took a two night booking at all.",
  source: "https://www.novasol.dk/ferie/miniferie",
  checkedAt: "2026-09-26",
};

// What the panel and the planner are told about the length. A short trip is
// told plainly that it is paying for the week, and why that is still the
// honest figure.
export const houseStaySays = (short, season = null) => {
  // The summer clause only where summer is possible: seen live on 27 Sep 2026
  // telling an October trip what July allows.
  const summerPossible = !season || season === "high";
  if (short) return `Your trip is shorter than a week, and a house for a few nights costs about what the whole week does, sometimes more, so this counts the week.${summerPossible ? " In the summer holidays it is the week or nothing." : ""}`;
  return season === "high" ? "It is let by the week." : "It is let by the week, and outside the summer holidays for a weekend too.";
};

// ── AND WITHOUT A CAR, SAY IT ───────────────────────────────────────
//
// Seen live on 27 Sep 2026: six people with only Public transport ticked were
// told a sommerhus was strongly recommended and nothing else. Oliver, the day
// before: "if the location is very poor, then public transport can't reach,
// and the bike rental is likely far away from the sommerhouse". Which coasts a
// bus reaches has not been checked, so this names the risk and the check to
// make rather than naming coasts.
export const houseNoCarSays = "Most holiday houses sit out on the coast, away from buses and bike rental, so without a car pick one close to a town with a bus stop, and check how far the house is from it before booking.";

// ── AND WHERE THE HOUSE IS CHANGES THE PRICE ───────────────────────
//
// Oliver, 26 Sep 2026: "the place you might want to be located, can be
// pricier than other places." HOUSE_WEEK is the cheapest Novasol had in all of
// Jutland, and the coast a guide picks is not the cheapest one. So every coast
// in data/stayPlaces.js HOUSE_AREAS was read on Novasol's own search on 27 Sep
// 2026, the same three Saturday arrivals HOUSE_WEEK was read at, seven nights,
// four adults, sorted cheapest first. Each season is
//
//   [how many houses Novasol listed for the area, the cheapest of them,
//    the cheapest one sleeping six or more]
//
// in kroner for the whole week. The area is Novasol's own, which takes in the
// villages round it: "Blokhus" includes Hune and Pandrup. Grønhøj and Hou on
// Langeland have no Novasol area of their own and are left out rather than
// given a neighbour's price. A count of a handful means a thin market, and the
// sentences below leave those out of any spread.
export const HOUSE_COAST_WEEKS = { high: "10 Jul 2027", low: "16 Oct 2027", winter: "9 Jan 2027" };
export const HOUSE_COAST = {
  checkedAt: "2026-09-27",
  source: "https://www.novasol.dk/danmark",
  weeks: {
  "Kandestederne": { high: [2, 9834, 15917], low: [3, 4079, 8120], winter: [3, 4131, 4131] },
  "Skallerup": { high: [6, 9626, 9626], low: [10, 4517, 4517], winter: [6, 3927, 3927] },
  "Lønstrup": { high: [33, 6147, 7101], low: [33, 3251, 3849], winter: [27, 2677, 2677] },
  "Tversted": { high: [9, 6325, 6325], low: [10, 4058, 4058], winter: [5, 5128, 5128] },
  "Nørlev Strand": { high: [9, 10260, 10260], low: [11, 4325, 4325], winter: [13, 3109, 3109] },
  "Løkken": { high: [93, 5893, 5893], low: [95, 2393, 2738], winter: [80, 2382, 2382] },
  "Blokhus": { high: [57, 5379, 5379], low: [60, 2559, 3242], winter: [56, 2089, 2298] },
  "Rødhus": { high: [12, 7110, 7147], low: [12, 3904, 3904], winter: [8, 2964, 2964] },
  "Lild Strand": { high: [13, 5297, 5297], low: [11, 2497, 2497], winter: [7, 2322, 2322] },
  "Slettestrand": { high: [13, 5379, 5379], low: [11, 2973, 3476], winter: [9, 2157, 2157] },
  "Klitmøller": { high: [22, 5729, 5729], low: [21, 3693, 3693], winter: [18, 2244, 2244] },
  "Vorupør": { high: [56, 4812, 5272], low: [57, 2245, 2739], winter: [44, 1544, 1961] },
  "Agger": { high: [45, 5696, 6156], low: [44, 3178, 3394], winter: [37, 2400, 2400] },
  "Ålbæk": { high: [35, 6938, 6938], low: [49, 3335, 3335], winter: [30, 2477, 2604] },
  "Lyngså": { high: [37, 4851, 6833], low: [38, 2630, 2745], winter: [28, 2141, 2141] },
  "Hals": { high: [43, 4021, 5807], low: [42, 2557, 2766], winter: [28, 2313, 2313] },
  "Hou": { high: [37, 4021, 5807], low: [35, 2557, 2874], winter: [24, 2313, 2313] },
  "Øster Hurup": { high: [66, 5797, 6023], low: [75, 2907, 3208], winter: [57, 2154, 2156] },
  "Læsø": { high: [5, 6065, 6065], low: [8, 2738, 2738], winter: [7, 2110, 2110] },
  "Fur": { high: [13, 6692, 7196], low: [15, 2260, 3409], winter: [9, 2781, 2781] },
  "Vejlby Klit": { high: [15, 7691, 7691], low: [13, 3952, 3952], winter: [12, 3943, 3943] },
  "Thorsminde": { high: [13, 7054, 7054], low: [15, 4078, 4078], winter: [9, 3178, 3285] },
  "Søndervig": { high: [149, 3673, 4792], low: [150, 2232, 2468], winter: [137, 1567, 2144] },
  "Vedersø Klit": { high: [9, 8341, 8341], low: [7, 4342, 4342], winter: [10, 2959, 2959] },
  "Hvide Sande": { high: [143, 3673, 4792], low: [186, 2232, 2468], winter: [133, 1567, 2020] },
  "Årgab": { high: [10, 8444, 10856], low: [49, 3925, 3925], winter: [9, 3337, 3337] },
  "Bork Havn": { high: [80, 4491, 5118], low: [99, 2400, 2741], winter: [68, 1875, 1937] },
  "Nymindegab": { high: [12, 5174, 5951], low: [11, 2571, 2983], winter: [11, 2016, 2016] },
  "Henne Strand": { high: [5, 12638, 12638], low: [3, 7927, 7927], winter: [5, 5615, 5615] },
  "Vejers Strand": { high: [13, 5572, 11604], low: [9, 3815, 6635], winter: [13, 2661, 4702] },
  "Houstrup": { high: [25, 3696, 3696], low: [32, 2520, 2520], winter: [25, 1514, 1514] },
  "Blåvand": { high: [105, 5961, 5961], low: [106, 3017, 3017], winter: [90, 2372, 2486] },
  "Rømø": { high: [133, 4663, 5532], low: [131, 2619, 2841], winter: [118, 1888, 2375] },
  "Kegnæs": { high: [34, 5390, 6811], low: [27, 2786, 3408], winter: [24, 1955, 2510] },
  "Nordborg": { high: [47, 5170, 6326], low: [44, 2599, 2599], winter: [35, 1685, 1685] },
  "Hejlsminde": { high: [82, 4867, 5866], low: [83, 2804, 2804], winter: [57, 2032, 2347] },
  "Fanø": { high: [70, 5111, 6462], low: [86, 3353, 4304], winter: [74, 2216, 2216] },
  "Juelsminde": { high: [75, 4961, 6789], low: [98, 2997, 3682], winter: [76, 2543, 2820] },
  "Saksild Strand": { high: [25, 7826, 8549], low: [30, 4203, 4774], winter: [23, 3124, 3628] },
  "Ebeltoft": { high: [218, 5290, 5692], low: [260, 2936, 3053], winter: [209, 2305, 2305] },
  "Samsø": { high: [42, 4692, 6129], low: [60, 3494, 3494], winter: [43, 2358, 2358] },
  "Fjellerup Strand": { high: [63, 6071, 6589], low: [69, 3337, 3337], winter: [54, 3062, 3062] },
  "Skødshoved Strand": { high: [15, 6233, 8588], low: [15, 3296, 5081], winter: [12, 2601, 3498] },
  "Følle Strand": { high: [15, 8363, 8772], low: [15, 3661, 3661], winter: [13, 2892, 2892] },
  "Grenaa Strand": { high: [50, 6423, 9431], low: [55, 4312, 4312], winter: [43, 2949, 2949] },
  "Knebel": { high: [65, 5050, 5921], low: [66, 2416, 2497], winter: [41, 1791, 1961] },
  "Hasmark Strand": { high: [63, 6062, 6062], low: [75, 3461, 3641], winter: [62, 2857, 2857] },
  "Spodsbjerg": { high: [40, 5797, 6278], low: [40, 3214, 3879], winter: [29, 2559, 2559] },
  "Bogense": { high: [39, 5095, 8639], low: [44, 2626, 4351], winter: [36, 3221, 3221] },
  "Ristinge": { high: [48, 5297, 5379], low: [46, 2787, 3290], winter: [35, 2487, 2487] },
  "Bagenkop": { high: [18, 4642, 5968], low: [16, 2549, 2549], winter: [14, 1890, 2283] },
  "Ærø": { high: [1, 9903, 9903], low: [9, 3398, 3398], winter: [7, 3066, 3066] },
  "Hornbæk": { high: [15, 10961, 10970], low: [29, 4756, 4756], winter: [20, 4408, 5377] },
  "Dronningmølle": { high: [22, 8161, 9848], low: [31, 4085, 4756], winter: [22, 3238, 4279] },
  "Gilleleje": { high: [49, 7183, 9382], low: [73, 3807, 3887], winter: [50, 2999, 2999] },
  "Tisvildeleje": { high: [20, 7371, 10411], low: [27, 3760, 5845], winter: [16, 4084, 4285] },
  "Vejby Strand": { high: [32, 7504, 9855], low: [48, 3911, 4638], winter: [36, 3006, 3006] },
  "Liseleje": { high: [8, 6147, 12598], low: [14, 3388, 6377], winter: [9, 2382, 5017] },
  "Rørvig": { high: [16, 6882, 7486], low: [21, 3692, 4362], winter: [19, 3634, 3634] },
  "Sjællands Odde": { high: [31, 6289, 6767], low: [39, 3627, 3627], winter: [26, 2810, 2810] },
  "Gudmindrup Lyng": { high: [10, 6115, 9655], low: [15, 2648, 5129], winter: [14, 2107, 3271] },
  "Drøsselbjerg": { high: [15, 5344, 5344], low: [17, 3514, 3514], winter: [11, 2208, 2208] },
  "Rødvig": { high: [4, 6841, 6841], low: [4, 3991, 3991], winter: [3, 3246, 3246] },
  "Marielyst": { high: [146, 5925, 6817], low: [182, 2850, 3861], winter: [145, 2290, 2574] },
  "Hummingen": { high: [18, 6746, 7915], low: [17, 3494, 3494], winter: [12, 2992, 2992] },
  "Ulvshale": { high: [8, 7878, 8269], low: [12, 3553, 4398], winter: [9, 2648, 3602] },
  "Balka": { high: [24, 6324, 9397], low: [43, 2586, 4951], winter: [12, 1743, 5770] },
  "Dueodde": { high: [56, 4611, 9560], low: [66, 2536, 3551], winter: [29, 1828, 3484] },
  },
};
// The date in words, for sentences a traveller reads.
export const HOUSE_COAST_READ = "27 Sep 2026";
// Below this many houses the cheapest is one house, not a market.
export const HOUSE_COAST_THIN = 8;

// The cheapest week near one coast for a party, or null where it was not read.
// Up to four take the cheapest house of any size, five or six the cheapest
// sleeping six, and more than six the same with `atLeast`, because a bigger
// house was not read and costs more.
export const houseCoastWeek = (name, season, heads) => {
  const row = HOUSE_COAST.weeks[String(name || "")];
  const key = season === "high" || season === "low" || season === "winter" ? season : null;
  if (!row || !key || !row[key]) return null;
  const [count, four, six] = row[key];
  const n = Math.max(1, Math.floor(Number(heads)) || 1);
  const kr = n <= 4 ? four : six;
  if (!Number.isFinite(kr)) return null;
  return { kr, sleeps: n <= 4 ? 4 : 6, atLeast: n > 6, count, week: HOUSE_COAST_WEEKS[key], season: key };
};
const kroner = (n) => Number(n).toLocaleString("en-US");
// One sentence for the guide writer and the day card: what a week there cost.
// With no season, July and October both, which is the honest width.
export const houseCoastSays = (name, season, heads) => {
  const one = (k) => houseCoastWeek(name, k, heads);
  const size = (w) => (w.atLeast ? "sleeping six (a bigger one costs more)" : `sleeping ${w.sleeps === 4 ? "four" : "six"}`);
  const key = season === "high" || season === "low" || season === "winter" ? season : null;
  if (key) {
    const w = one(key);
    return w ? `Novasol's cheapest week near ${name} in a house ${size(w)} was ${kroner(w.kr)} kr for the week of ${w.week}, read on ${HOUSE_COAST_READ}.` : "";
  }
  const hi = one("high"), lo = one("low");
  return hi && lo ? `Novasol's cheapest week near ${name} in a house ${size(hi)} was ${kroner(lo.kr)} kr in October and ${kroner(hi.kr)} kr in July, read on ${HOUSE_COAST_READ}.` : "";
};
// And for the panel, which does not know the coast yet: how far apart the
// coasts are for this party in this season, cheapest and dearest, leaving out
// the thin ones. No season, no sentence: the width is the season then.
export const houseWhereSays = (season, sleeps) => {
  const key = season === "high" || season === "low" || season === "winter" ? season : null;
  if (!key || !sleeps) return "";
  const rows = Object.keys(HOUSE_COAST.weeks)
    .map(name => ({ name, w: houseCoastWeek(name, key, sleeps) }))
    .filter(r => r.w && r.w.count >= HOUSE_COAST_THIN)
    .sort((a, b) => a.w.kr - b.w.kr);
  if (rows.length < 2) return "";
  const lo = rows[0], hi = rows[rows.length - 1];
  // No month named: the season line beside it already named one, and saying it
  // twice is a test this panel has failed before.
  return `Where the house is matters as much as when: across the ${rows.length} coasts read, the cheapest week that time of year in a house sleeping ${lo.w.sleeps === 4 ? "four" : "six"} ran from ${kroner(lo.w.kr)} kr near ${lo.name} to ${kroner(hi.w.kr)} kr near ${hi.name}, so the figure above is the cheap end.`;
};

// How many nights the week's price is spread over: the trip's own nights for
// a week or longer, and seven for anything shorter, because a short stay pays
// the week. Nights unknown is a week, which is what the prices were read as.
export const houseNightsPaid = (nights) => {
  const n = Math.floor(Number(nights));
  return Number.isFinite(n) && n >= 1 && n < HOUSE_NIGHTS ? n : HOUSE_NIGHTS;
};

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
// A short trip divides the whole week by its own few nights. See HOUSE_SHORT.
export const housePerHeadNight = (heads, season = null, nights = null) => {
  const week = houseWeek(heads, season);
  if (!week) return null;
  const people = Math.max(1, Math.floor(Number(heads)) || 1);
  const over = houseNightsPaid(nights);
  return {
    low: Math.round(week.low / people / over),
    high: Math.round(week.high / people / over),
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
// THERE IS NO HARD GATE ON LENGTH ANY MORE. A short trip pays the week, so its
// nights are dearer and the comparison below says so by itself; a three night
// pair is not recommended, which is the true answer, and a three night
// family of six still can be. It needs the length known, because an unknown
// length would price a weekend as a week.
//
// ── AND ONLY FOR THE PEOPLE A HOUSE OUT THERE SUITS ────────────────
//
// Oliver, 26 Sep 2026: "summerhouse should probably only be recommended for
// nature people". Asked whether families still count, he chose nature OR kids.
// A house sits on a coast or in the countryside, usually away from a bus or a
// bike shop, so for a city trip the cheap bed is a long way from the trip.
// The chip stays for anyone to pick; only the recommendation is gated.
const NATURE_WORDS = ["nature", "natural", "outdoors", "outdoor", "beach", "beaches", "coast", "coastal",
  "sea", "seaside", "hiking", "hike", "hikes", "walks", "walking", "forest", "forests", "woods", "dunes",
  "quiet", "peace", "peaceful", "countryside", "wildlife", "birds", "birdwatching", "fishing", "kayak",
  "kayaking", "national park", "natur", "strand", "skov", "klit", "klitter", "vandring", "stilhed", "ro og fred"];
// Whole words on the folded text, the same boundary rule interestFit's saysWord
// keeps. Not imported from there, because that file reads tripBrief and this
// one is read by the budget: a small copy here is cheaper than a cycle. The
// caller scrubs refusals first ("no beaches, please"), see App.jsx.
const hasWord = (hay, word) => {
  const w = fold(word);
  let from = 0;
  for (;;) {
    const i = hay.indexOf(w, from);
    if (i < 0) return false;
    if (!/[a-z0-9]/.test(hay[i - 1] || " ") && !/[a-z0-9]/.test(hay[i + w.length] || " ")) return true;
    from = i + 1;
  }
};
export const houseSuits = ({ kids = false, interests = [], said = "" } = {}) => {
  if (kids) return true;
  if ((Array.isArray(interests) ? interests : []).some(i => String(i).trim().toLowerCase() === "nature")) return true;
  const hay = fold(String(said || ""));
  return !!hay && NATURE_WORDS.some(w => hasWord(hay, w));
};
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
const fitInSeason = (heads, season, bunkPerHead, nights = null) => {
  const house = housePerHeadNight(heads, season, nights);
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
  if (!Number.isFinite(n) || n < 1) return null;
  const key = seasonKey(season);
  if (key) return fitInSeason(heads, key, bunkPerHead, n);
  // Every season, each against its own bunk price. bunkBySeason is injected so
  // this file never learns what a hostel costs: see budgetEstimate.js.
  if (!bunkBySeason) return null;
  const verdicts = SEASONS.map(s => fitInSeason(heads, s, bunkBySeason[s], n));
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
