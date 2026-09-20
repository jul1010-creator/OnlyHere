// ── THE RETRY THAT FORGOT EVERYTHING THE BUILD KNEW ─────────────────
//
// Found in a review of the guide pipeline, taken on 19 Sep 2026.
//
// When the writer comes back with fewer days than the traveller asked for, the
// build asks again. It was asking with a DIFFERENT, SHORTER PROMPT, written
// out by hand at the call site, and that prompt carried the JSON shape, the
// ruled-out places and the language and nothing else.
//
// So everything the build had worked out was dropped on the one path where a
// guide was already going wrong:
//
//   THE FROZEN FACTS, so the essentials came back written from nothing, with
//   whatever a model believes about Danish transport in place of what was
//   checked against rejsekort.dk.
//   THE DKK RULE, so a retried guide could price a hotel in euros, on a page
//   whose whole point is that a traveller in Denmark is charged kroner.
//   THE BOOKED BED, the events they chose, the places they have already been,
//   what is on in the villages, and the planner's own skeleton.
//
// The two other retries in the same function do it correctly and have done
// since they were written: both send `${guideSystemPrompt}` and then name the
// failure. This one is the odd one out, and the difference is invisible unless
// a guide happens to take this path.
//
// ── AND IT COMPARED AGAINST THE WRONG NUMBER ────────────────────────
//
// The accepting test read "at least as many days as last time". More days than
// last time is the right reason to PREFER the retry, and it is not the
// question being asked, which is whether the traveller got the days they asked
// for. Seven asked, three returned, four on the retry: accepted, and the build
// carried on with a four day guide for a seven day trip, with nothing said
// anywhere.
//
// So the two questions are separated here. `better` decides which attempt to
// keep. `shortBy` decides whether the traveller is still owed days, and if
// they are it is reported above the guide in their own terms, the way every
// other check on a finished guide already reports.

export const shortBy = (guide, requested) => {
  const want = Number(requested) || 0;
  const got = Array.isArray(guide?.days) ? guide.days.length : 0;
  return want > 0 && got < want ? want - got : 0;
};

// Which of two attempts to keep. More days wins, and an empty day is not a
// day: a retry that reaches the count by returning three days with nothing in
// them has answered the letter of the instruction and made the guide worse.
export const better = (before, after) => {
  const days = (g) => (Array.isArray(g?.days) ? g.days : []);
  const filled = (g) => days(g).filter(d => Array.isArray(d?.stops) && d.stops.length > 0).length;
  if (!days(after).length) return false;
  if (filled(after) < filled(before)) return false;
  return days(after).length > days(before).length || filled(after) > filled(before);
};

// The failure, named, in the shape the other two retries in this pipeline use.
// It sits UNDER the whole system prompt rather than replacing it, which is the
// entire fix: the rules the guide is built on are the rules it is rebuilt on.
export const dayRetryBlock = (got, requested) => {
  const want = Number(requested) || 0;
  if (!want) return "";
  return `YOUR LAST ATTEMPT RETURNED ${got} ${got === 1 ? "DAY" : "DAYS"} AND THE TRAVELLER ASKED FOR ${want}. `
    + `The "days" array must contain exactly ${want} entries. Split every place discussed across all ${want} days in a sensible geographic order, and repeat a base town for a slower day rather than inventing a place nobody mentioned. `
    + `Keep every rule above, including the essentials, the currency and anything already settled about where they sleep: this is the same guide with the missing days written, not a fresh one.`;
};

// ── AND WHEN IT IS STILL SHORT ──────────────────────────────────────
//
// Said above the guide rather than swallowed, which is the standing answer in
// this pipeline for a limitation that survived a retry. Written to the
// traveller, because that is who reads planProblems, and without an excuse:
// they asked for seven days and have five, and the useful thing is to say so
// and say what the five are.
export const stillShortNote = (guide, requested) => {
  const missing = shortBy(guide, requested);
  if (!missing) return "";
  const got = Array.isArray(guide?.days) ? guide.days.length : 0;
  const want = Number(requested) || 0;
  return `You asked for ${want} days and this plan covers ${got}. `
    + `I asked for the rest and they did not come back, which usually means the conversation named enough places for ${got} good days and not for ${want}. `
    + `Tell me somewhere else you would like to go, or say the word and I will spread what is here more slowly across the ${want}.`;
};
