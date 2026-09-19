// ── "JUDGE WHETHER AN ISLAND IS TOO DEAD TO BE WORTH VISITING" ──────
//
// Oliver, 19 Sep 2026, working out what the community tier is really for:
//
//   "we get the AI to scan all of them and call out what Islands have more
//    activities than others. The AI guide can then scan the islands whenever it
//    builds a guide, and judge whether an Island is too 'dead' to be worth
//    visiting at the current time."
//
// This is a better use of these rows than the one they were built for. A
// community row on its own is a find on a day. Fifty of them across one island
// in one week is not fifty finds, it is a FACT ABOUT THE ISLAND THAT WEEK, and
// it is the fact a traveller deciding between Læsø and Sejerø in November most
// needs and can least look up.
//
// It also answers the Læsø problem from the other side. Oliver: "we'll have 50
// different events happening at the same Island from the same day." Counted
// rather than listed, fifty stops being noise and becomes the signal.
//
// ══ THE ONE RULE THIS WHOLE FILE IS BUILT AROUND ════════════════════
//
// A COUNT ABOVE ZERO IS EVIDENCE. A COUNT OF ZERO IS NOT.
//
// Gemlyx holds a calendar for the islands somebody has added a source for, and
// for no others. Sejerø with nothing on it in November means one of three
// things: the island is quiet, or nobody has added its calendar, or its
// calendar was added and has not been swept since August. Those are not the
// same, and this app cannot tell them apart from a count.
//
// So the asymmetry is deliberate and it is enforced in the block below rather
// than left to the model's judgement: a busy island may be called busy, and a
// silent one may never be called dead. This is the same shape as the transit
// rule in App.jsx, which has had to be restated three times: no transit
// itinerary is not no transit.
//
// WHAT CAN ANSWER "IS THIS PLACE DEAD IN JANUARY" is utils/seasonFit.js, which
// reads an entry's own words about its season and says what a month is like.
// That is a claim with a source behind it. This file is the other half: what is
// on, when we know.
import { fold } from "./danishNames";
import { townsOf, runsOn } from "./communityEvents";

// ── A WINDOW, BECAUSE A WEEK IS THE QUESTION ────────────────────────
//
// Not a day: one island having something on this Tuesday and another not is
// noise. Not a month: a traveller is there for a few days. The trip's own
// length is what a guide should ask about, and this defaults to a week for the
// chat, where the dates are often still loose.
export const DEFAULT_DAYS = 7;

const dayKeyOf = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const eachDay = (from, days) => {
  const start = from instanceof Date ? from : new Date(from);
  if (Number.isNaN(start.getTime())) return [];
  const out = [];
  for (let i = 0; i < Math.max(0, Math.floor(Number(days) || 0)); i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    out.push(dayKeyOf(d));
  }
  return out;
};

// ── WHAT ONE PLACE HAS ON ───────────────────────────────────────────
//
// Counted over the window, and per day, because a week with six things on one
// Saturday and nothing else is a different week from one with something on
// every day, and a traveller choosing which day to cross would want to know
// which it is.
//
// ONE EVENT IS COUNTED ONCE however many days it runs. A three day festival is
// not three things to do; it is one thing that is on for three days, and
// counting it three times would make a quiet island with one long market look
// busier than a lively one with two evenings.
export const activityIn = (pool, { place = "", from = new Date(), days = DEFAULT_DAYS } = {}) => {
  const want = fold(String(place || "").trim());
  const window = eachDay(from, days);
  if (!want || !window.length) return { place: String(place || "").trim(), count: 0, byDay: {}, busiest: "", busiestCount: 0 };
  const rows = (Array.isArray(pool) ? pool : []).filter(r => r && r.name
    && townsOf(r).some(w => fold(w) === want));
  const byDay = {};
  const seen = new Set();
  for (const day of window) {
    const on = rows.filter(r => runsOn(r, day));
    if (on.length) byDay[day] = on.length;
    on.forEach(r => seen.add(`${r.name}|${r.date}`));
  }
  const busiest = Object.keys(byDay).sort((a, b) => byDay[b] - byDay[a] || a.localeCompare(b))[0] || "";
  return {
    place: String(place || "").trim(),
    // The number of distinct EVENTS, not of event days. See the header above.
    count: seen.size,
    byDay,
    busiest,
    busiestCount: busiest ? byDay[busiest] : 0,
  };
};

// Every place in the plan, busiest first, so a block can be read top down.
export const activityAcross = (pool, places, when = {}) => [...new Set(
  (Array.isArray(places) ? places : []).map(p => String(p || "").trim()).filter(Boolean),
)]
  .map(p => activityIn(pool, { ...when, place: p }))
  .sort((a, b) => b.count - a.count || a.place.localeCompare(b.place));

// ── BUSY ENOUGH TO BE WORTH SAYING ──────────────────────────────────
//
// Three things in a week on one island. Below that a count is a coincidence of
// which calendars somebody happened to add, and a guide that made something of
// it would be reporting Gemlyx's own coverage as a fact about Denmark.
export const LIVELY = 3;
export const isLively = (row) => (Number(row?.count) || 0) >= LIVELY;

// ── AND WHAT THE MODEL IS TOLD ──────────────────────────────────────
//
// The counts, and then the rule, in that order and in capitals, because the
// inference this invites is the wrong one and it is the obvious one: a list
// with Læsø at 18 and Sejerø at 0 reads as a recommendation to skip Sejerø, and
// that would be Gemlyx reporting the state of its own source list as the state
// of an island.
export const activityBlock = (rows, { days = DEFAULT_DAYS } = {}) => {
  const list = (Array.isArray(rows) ? rows : []).filter(r => r && r.place);
  const lively = list.filter(isLively);
  if (!lively.length) return "";
  const lines = lively.map(r => `  ${r.place}: ${r.count} thing${r.count === 1 ? "" : "s"} on${r.busiestCount > 1 ? `, ${r.busiestCount} of them on ${r.busiest}` : ""}`).join("\n");
  // ── AND THE QUIET ONES ARE NOT NAMED ───────────────────
  //
  // The first draft listed them: "Gemlyx holds nothing in that window for:
  // Sejerø, Fejø". Two things wrong with that. It was FALSE for a place holding
  // one or two, which is neither lively nor nothing. And naming them at all is
  // what makes a model rank, whatever the rule underneath says: a list of
  // islands with a heading about what is on reads as the ones to skip.
  //
  // So only the places with something on are named, and the rule covers the
  // rest by covering everything not on the list.
  return `── WHAT IS ON WHERE, IN THE ${days} DAYS OF THIS TRIP ──\n`
    + `Counted off village and island calendars Gemlyx has been given, not off anything published:\n${lines}\n`
    + `A HIGH COUNT IS EVIDENCE AND A LOW ONE IS NOT. Somewhere with a lot on is a place worth putting a day into, and you may say so. ANYWHERE NOT ON THAT LIST IS ABSENT FROM THE LIST AND NOTHING MORE, and may NEVER be called quiet, dead, empty, closed, not worth it, or out of season on the strength of this block: Gemlyx holds a calendar for the places somebody added one for, and holding none for an island says nothing whatever about the island. Do not rank places by these numbers, do not print them, and do not tell the traveller how many things are on anywhere. Use them to decide where a day goes and say why in terms of what is on.`;
};
