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
import { accessOf } from "./eventAccess";

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
// ── AND WHO IS COUNTING ─────────────────────────────────────────────
//
// Oliver, 19 Sep 2026, reading Læsø's calendar: "these islands are going to
// depend on alot on your language. Læsø's calender doesn't seem very foreigner
// friendly." And then: "Anything about 'theater' should be a clear nono as a
// foreigner."
//
// He is right, and it breaks this file's whole premise if it is not answered
// here. An island with eleven things on, nine of them an hour of spoken Danish
// and a members' dinner, is a BUSY ISLAND FOR A DANE AND A QUIET ONE FOR
// EVERYBODY ELSE. Counting all eleven and calling it lively tells a German
// family to cross for a week of things they cannot get into.
//
// So a row is counted twice over: `count` is what is on, and `usable` is what
// is on that THIS traveller can walk into. For a Danish speaker they are the
// same number and nothing changes. The test is accessOf, the same reader the
// day cards and the community block already use, so an event is judged the
// same way wherever it is met. See utils/eventAccess.js.
//
// MEMBERS COUNTS AGAINST EVERYBODY, language only against a non-speaker. A
// residents' association dinner is not a thing a visitor can attend in any
// language, which is a different fact from a concert being in Danish.
const canWalkIn = (row, danishSpeaker) => {
  const a = accessOf(row, { danishSpeaker });
  return !a.members && !a.danish;
};

export const activityIn = (pool, { place = "", from = new Date(), days = DEFAULT_DAYS, danishSpeaker = false } = {}) => {
  const want = fold(String(place || "").trim());
  const window = eachDay(from, days);
  const empty = { place: String(place || "").trim(), count: 0, usable: 0, byDay: {}, busiest: "", busiestCount: 0 };
  if (!want || !window.length) return empty;
  const rows = (Array.isArray(pool) ? pool : []).filter(r => r && r.name
    && townsOf(r).some(w => fold(w) === want));
  const byDay = {};
  const seen = new Set();
  const open = new Set();
  for (const day of window) {
    const on = rows.filter(r => runsOn(r, day));
    // BY DAY COUNTS THE USABLE ONES, because byDay drives "which day to cross"
    // and a Saturday whose five events are all in Danish is not a busy Saturday
    // for the person reading.
    const walkable = on.filter(r => canWalkIn(r, danishSpeaker));
    if (walkable.length) byDay[day] = walkable.length;
    on.forEach(r => {
      seen.add(`${r.name}|${r.date}`);
      if (canWalkIn(r, danishSpeaker)) open.add(`${r.name}|${r.date}`);
    });
  }
  const busiest = Object.keys(byDay).sort((a, b) => byDay[b] - byDay[a] || a.localeCompare(b))[0] || "";
  return {
    place: String(place || "").trim(),
    // The number of distinct EVENTS, not of event days. See the header above.
    count: seen.size,
    // And how many of them this traveller can get into. Equal to `count` for a
    // Danish speaker, which is the case where none of this applies.
    usable: open.size,
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
  // BY WHAT THIS TRAVELLER CAN GET INTO, then by what is on at all. An island
  // ordered to the top on eleven events they cannot follow is the ranking this
  // file exists to avoid making.
  .sort((a, b) => (b.usable || 0) - (a.usable || 0) || b.count - a.count || a.place.localeCompare(b.place));

// ── BUSY ENOUGH TO BE WORTH SAYING ──────────────────────────────────
//
// Three things in a week on one island. Below that a count is a coincidence of
// which calendars somebody happened to add, and a guide that made something of
// it would be reporting Gemlyx's own coverage as a fact about Denmark.
export const LIVELY = 3;
// ── ON THE USABLE COUNT, NOT THE TOTAL ──────────────────────────────
// The decision this number feeds is whether to put a day into a place, and a
// traveller cannot put a day into an evening they will be turned away from or
// cannot follow. For a Danish speaker the two counts are identical.
export const isLively = (row) => (Number(row?.usable ?? row?.count) || 0) >= LIVELY;

// ── AND THE ONE THING WORTH SAYING ABOUT A GAP ──────────────────────
//
// Busy in Danish and quiet in English is a REAL, REPORTABLE FACT about an
// island in a way that a low count on its own never is: both numbers came from
// the same calendar, so nothing about Gemlyx's own coverage can explain the
// difference between them. It is the fact Oliver was looking at on Læsø, and
// it is the one a non-Danish speaker most needs before crossing.
//
// The gap has to be worth mentioning. One event behind a language barrier on
// an island with four open ones is not a pattern, it is a Tuesday.
export const MOSTLY_DANISH = 2;
export const behindLanguage = (row) => Math.max(0, (Number(row?.count) || 0) - (Number(row?.usable) || 0));
export const mostlyDanish = (row) => behindLanguage(row) >= MOSTLY_DANISH && behindLanguage(row) > (Number(row?.usable) || 0);

// ── AND WHAT THE MODEL IS TOLD ──────────────────────────────────────
//
// The counts, and then the rule, in that order and in capitals, because the
// inference this invites is the wrong one and it is the obvious one: a list
// with Læsø at 18 and Sejerø at 0 reads as a recommendation to skip Sejerø, and
// that would be Gemlyx reporting the state of its own source list as the state
// of an island.
export const activityBlock = (rows, { days = DEFAULT_DAYS, danishSpeaker = true } = {}) => {
  const list = (Array.isArray(rows) ? rows : []).filter(r => r && r.place);
  const lively = list.filter(isLively);
  // ── AND THE ISLANDS THAT ARE BUSY IN A LANGUAGE THEY DO NOT READ ──
  //
  // Not lively for this traveller, and not silent either: a place with eight
  // things on and one they can walk into is a fact, and it is the fact Oliver
  // was looking at on Læsø. It goes in the block even though the place is not
  // on the lively list, because "there is plenty on here and almost none of it
  // is in English" is the single most useful sentence a non-speaker can be
  // told before booking a ferry.
  const gated = danishSpeaker ? [] : list.filter(r => !isLively(r) && mostlyDanish(r));
  if (!lively.length && !gated.length) return "";
  const lines = lively.map(r => {
    const behind = behindLanguage(r);
    return `  ${r.place}: ${r.usable} thing${r.usable === 1 ? "" : "s"} they can walk into`
      + (behind ? `, and ${behind} more that ${behind === 1 ? "is" : "are"} in Danish or for members` : "")
      + (r.busiestCount > 1 ? `, ${r.busiestCount} of them on ${r.busiest}` : "");
  }).join("\n");
  const gatedLines = gated.map(r => `  ${r.place}: ${r.count} thing${r.count === 1 ? "" : "s"} on and ${r.usable === 0 ? "none of them" : `only ${r.usable}`} open to somebody who does not read Danish`).join("\n");
  return `── WHAT IS ON WHERE, IN THE ${days} DAYS OF THIS TRIP ──\n`
    + `Counted off village and island calendars Gemlyx has been given, not off anything published`
    + (danishSpeaker ? "" : `, and counted for somebody who does NOT read Danish: an hour of spoken Danish and a members' dinner are both real events and neither is one this traveller can use`)
    + `:\n${lines}`
    + (gatedLines ? `\n${danishSpeaker ? "" : "BUSY, BUT NOT IN A LANGUAGE THEY READ:\n"}${gatedLines}\n`
        + `That gap is worth saying out loud in the guide, because both numbers came off the same calendar, so it is a fact about the island rather than about what Gemlyx happens to hold. Say it as what it is: there is plenty on and most of it runs in Danish. Never say the island is quiet.` : "")
    + `\nA HIGH COUNT IS EVIDENCE AND A LOW ONE IS NOT. Somewhere with a lot on is a place worth putting a day into, and you may say so. ANYWHERE NOT ON THAT LIST IS ABSENT FROM THE LIST AND NOTHING MORE, and may NEVER be called quiet, dead, empty, closed, not worth it, or out of season on the strength of this block: Gemlyx holds a calendar for the places somebody added one for, and holding none for an island says nothing whatever about the island. Do not rank places by these numbers, do not print them, and do not tell the traveller how many things are on anywhere. Use them to decide where a day goes and say why in terms of what is on.`;
};
