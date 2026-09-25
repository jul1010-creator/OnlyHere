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
// ── AND IT IS A PREFERENCE, NOT A PRICE ─────────────────────────────
//
// Nothing here costs anything. "Cheapest" is a statement about WHERE, and what
// that saves is a per-town question the guide's own bed search answers later:
// the gap between the centre and one ring out is large in Copenhagen and close
// to nothing in Ribe, so a single percentage would be wrong in both towns at
// once. See bedsEstimate in utils/costLedger.js for the figure that is real.

const clean = (s) => String(s ?? "").trim();

export const STAY_CHOICES = [
  {
    key: "cheapest",
    label: "Cheapest location",
    booked: false,
    // His own words for it, and the limit matters: a bed an hour out of town is
    // not a saving, it is a different trip with a commute in it.
    said: "They have not booked anywhere, and they want the cheaper end of the market: a little further out from the centre, still in the town and still walkable or a short ride in, never out in the country.",
  },
  {
    key: "best",
    label: "Best location",
    booked: false,
    said: "They have not booked anywhere, and they would rather pay for being central than save on the room.",
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
