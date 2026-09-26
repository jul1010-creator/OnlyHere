// ── WHERE THEY SLEEP, ASKED AS A TICK RATHER THAN A QUESTION ────────
//
// Oliver, 25 Sep 2026, on the budget panel: "Accomodation: Cheapest Location /
// Best Location. Obviously cheapest location would not be outside the city,
// but just a little further out from center."
//
// And then, on the third option, which is the one that makes the row safe:
// "With the already booked, they'll have to name the hotel."
//
// ── THE THIRD OPTION IS NOT A NICETY ────────────────────────────────
//
// Cheapest and Best both quietly assert that NOBODY HAS BOOKED. `stay` is a
// BLOCKING slot in utils/tripBrief.js, so a row carrying only those two would
// fill a blocking slot with the app's own assumption, which is the exact class
// of bug this codebase spent 24 and 25 September removing: a stale echo
// deciding a trip's length, a form-filled start point nothing could read, a
// figure the app computed and then believed. An assumption is worse than an
// echo, because there is nothing to correct it against.
//
// So the row answers the question honestly or it does not answer it at all.
//
// ── AND IT USED TO ASK ABOUT THE WRONG THING ────────────────────────
//
// Oliver, 26 Sep 2026: "what about hostels and hotels? That is a bigger
// difference in price than hotel area".
//
// He is right by about four times. Measured off the app's own tables, a pair per
// head per night: a dorm bunk is 145 to 248, a central hotel double is 600 to
// 900. Against that, the centre against one ring out is a rounding error, and
// nobody can source it anyway: this file's own note said so.
//
// So the row asked about the lever nothing can price and silently priced the one
// it did not name, and the two halves contradicted each other out loud. The dorm
// figure comes from Next House and Steel House, both CENTRAL Copenhagen, while
// the chip carrying it told the planner they wanted to be "a little further out
// from the centre". A traveller who wants a central hostel, which is the exact
// thing the number is built on, had no chip to tick.
//
// THE ROW NAMES THE TYPE NOW. Location stops being the question and becomes a
// line inside each answer, which is honest: the guide picks real places per town
// later, and that is where location is really decided. See bedsEstimate in
// utils/costLedger.js for the figure that is real.

const clean = (s) => String(s ?? "").trim();

// ── AND THIS PROSE GOES INTO THE TRANSCRIPT, SO IT IS READ ──────────
//
// 26 Sep 2026. The Cheapest line used to end "still walkable or a short ride in".
// The intake posts these sentences into the conversation as a hidden turn, and
// travelModeKey reads a sentence and picks the SLOWEST mode in it, so the word
// walkable made a traveller who had ticked Car into a walker. dayCeilingKm("walk")
// is 15 km against 300 for a car, so the plan gate flagged and retried every
// driving day of their trip.
//
// tickedTravelMode now answers for a single ticked chip, which is the real fix,
// and this says the same thing without a mode word in it, which is the belt to
// that braces: a traveller who ticks NOTHING still must not be read as walking
// because of where they chose to sleep. tests/run.mjs holds every line this file
// and the budget panel can write to that turn against every mode reader, so the
// next phrase anybody adds cannot do this again.
export const STAY_CHOICES = [
  {
    key: "cheapest",
    label: "A hostel bed",
    booked: false,
    // His own words for it, and the limit matters: a bed an hour out of town is
    // not a saving, it is a different trip with a commute in it.
    // ── AND A HOSTEL IS NOT EVERYWHERE, WHICH THE FIGURE ASSUMES ──
    //
    // Oliver, 26 Sep 2026: "I just looked up Aalborg. Aalborg apparently has no
    // cheap hostels, while Copenhagen does. So someone can't be sent to Aalborg,
    // expecting a cheap stay."
    //
    // Checked and he is right, and it is worse than one town. Every dorm price in
    // this app is Copenhagen's. Danhostel Aalborg publishes 35 rooms, all with a
    // bath, none without, and reads as private rooms only; its own network quotes
    // nearby houses from 405 to 455 a night. Aarhus meanwhile has dorms from
    // about 85, CHEAPER than Copenhagen. So the figure is not a national one and
    // the towns are not interchangeable.
    //
    // The panel cannot price 31 towns. What it can do is stop the planner
    // repeating a number where the bed behind it does not exist, which is what
    // the last sentence here is for.
    said: "They have not booked anywhere, and they want a bed in a hostel rather than a room of their own, the cheap end of the market. Central is fine: the cheapest beds in Copenhagen are in the middle of town. IMPORTANT: not every Danish town has a hostel with dormitories. Copenhagen and Aarhus do; Aalborg's hostel is private rooms only, from about 405 a night. If the town you are proposing has no hostel dorm, say so plainly and price the cheapest real bed there instead of repeating the figure in their budget.",
  },
  {
    key: "best",
    label: "A hotel",
    booked: false,
    said: "They have not booked anywhere, and they want a hotel room rather than a hostel bed, somewhere central and comfortable rather than the cheapest thing going.",
  },
  // ── AND THE ONE DANES THEMSELVES BOOK ───────────────────────────
  //
  // Oliver, 26 Sep 2026: "I want you to create one specifically for
  // summerhouses, perhaps? ... if someone is a family of 4 on Jutland.."
  //
  // Measured against every other bed in this app, it is not a nice extra for a
  // family. It is the cheapest way for four people to sleep in Denmark in every
  // season, and in the busiest week of the year it undercuts a dorm bunk: 123 to
  // 143 a head in July against 218 to 248 for a bed in a Copenhagen dormitory,
  // and 53 to 59 in January. With a kitchen, which is what makes the cheapest
  // food tier reachable rather than theoretical.
  //
  // THE CATCH IS THE WEEK. It is sold in sevens and nothing shorter, so the chip
  // is only recommended to a trip long enough to use one. See utils/summerhouse.js.
  {
    key: "summerhouse",
    label: "A summerhouse",
    booked: false,
    said: "They have not booked anywhere, and they want a sommerhus: a whole holiday house with a kitchen, booked by the week. Danish holiday houses are on the coasts and in the countryside rather than in town centres, so plan a base out there and day trips in rather than a town-centre itinerary, and say which town they are near. They are let Saturday to Saturday and cannot be taken for fewer than seven nights.",
  },
  {
    key: "booked",
    label: "Already booked",
    booked: true,
    said: "They have already booked somewhere and the trip is built around it.",
  },
];

export const STAY_KEYS = STAY_CHOICES.map(s => s.key);
export const stayChoiceOf = (key) => STAY_CHOICES.find(s => s.key === clean(key)) || null;
export const stayIsBooked = (key) => !!stayChoiceOf(key)?.booked;

// ── AND A BOOKING WITH NO NAME IS NOT A BOOKING ─────────────────────
//
// The whole value of "already booked" is the address it leads to: a named
// hotel gives the trip a real base, which is what the day-trip radius, the
// first leg of day one and `stayWhen` all measure from. Ticked with the box
// empty, the app knows less than it did before the tick, because it now has a
// blocking slot filled with "somewhere".
//
// So this returns a problem rather than letting it through, and the row says
// so where they can see it.
export const stayProblem = (key, name) => {
  if (!stayIsBooked(key)) return null;
  if (clean(name)) return null;
  return { say: "Which one? The name is what lets Gemlyx plan the days around where you are sleeping rather than guessing a base." };
};

// The line the intake writes. Empty for a row nobody touched, because a
// sentence about a preference they did not state is the app answering for them.
export const staySaid = (key, name) => {
  const c = stayChoiceOf(key);
  if (!c) return "";
  const who = clean(name);
  return c.booked && who
    ? `Where they sleep: already booked, at ${who}. ${c.said} Build the days around ${who} rather than proposing anywhere else to stay.`
    : `Where they sleep: ${c.label}. ${c.said}`;
};
