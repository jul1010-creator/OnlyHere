// ── ARE THEY ON THE TRIP RIGHT NOW ───────────────────────────────────
//
// Oliver, 23 Aug 2026, added to the list of things Gemlyx should know about
// somebody: "And obviously if they're currently on vacation. If they chose to go
// from the 5th to the 12th, and it is the 7th, then obviously they are on
// vacation."
//
// ── WHY THIS IS NOT IN profileLearning.js ────────────────────────────
//
// It looks like the other four things Gemlyx notices and it is a different kind
// of fact entirely, so it lives in its own file rather than being bolted onto a
// module whose whole job is the opposite.
//
// An observation in profileLearning is a PATTERN, counted across trips, and it
// stays true: somebody who travelled by bike twice travelled by bike twice
// forever. "On holiday" is a fact about a single moment. It becomes false on the
// 13th with nothing happening and nobody typing anything.
//
// Every stored version of it would therefore be a claim that was true when it
// was written, which is the exact shape this codebase keeps getting caught by:
// the save toast that announced a push that had not happened, the frozen
// Copenhagen claim, the theme colour left behind by a default that moved. So
// nothing here is ever written to the profile. It is computed from the saved
// trip and the day it is asked, every single time, and the only way it can be
// wrong is if the trip dates are wrong.
//
// ── AND `today` IS A PARAMETER ───────────────────────────────────────
//
// Same rule calendarDay.js and eventDates.js already state in their own words: a
// date helper that reads the clock cannot be tested, and this one has three
// boundaries worth testing (the first day, the last day, and the day after).
import { dayStart, dayPlus } from "./calendarDay";

// A trip needs a start and a length. `_arrivalDate` is what the builder writes
// onto a guide and `arrivalDate` is the same value written onto the saved row
// under a second name, so both are read: userSaves.js says in its own words that
// they are "the same value written under two names".
const startOf = (guide) => dayStart(guide?._arrivalDate || guide?.arrivalDate);

// The trip's length is the number of DAYS the guide plans, which is the only
// length a guide carries. A four-day guide starting on the 5th runs to the 8th,
// so the last day is start + (days - 1), never start + days.
const lengthOf = (guide) => {
  const days = Array.isArray(guide?.days) ? guide.days.length : 0;
  return days > 0 ? days : 0;
};

// Whole calendar days from a to b, both already normalised to midnight. Written
// here rather than imported because calendarDay exports no such helper and
// tripEvents' daysBetween counts INCLUSIVELY (a one-day trip is 1), which is a
// different question from "how many days until this starts".
const wholeDaysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / 86400000);

// ── THE ANSWER ───────────────────────────────────────────────────────
//
// null when there is nothing to say, which is the honest answer for a guide with
// no dates on it. A guide built from "four days somewhere quiet" has a length
// and no arrival, and tripWindow already says why that must not be dressed up as
// knowing when somebody is here.
//
// `phase` is one of "before", "during", "after". `dayOfTrip` is 1 on the first
// day and equals `days` on the last, because that is how a person counts their
// own holiday. `daysUntil` counts forward to the start and is 0 once it has
// begun.
export const tripStatus = (guide, today = new Date()) => {
  const start = startOf(guide);
  const days = lengthOf(guide);
  const now = dayStart(today) || dayStart(new Date());
  if (!start || !days || !now) return null;

  const end = dayPlus(start, days - 1);
  const offset = wholeDaysBetween(start, now);

  if (offset < 0) {
    return { phase: "before", start, end, days, dayOfTrip: 0, daysUntil: -offset };
  }
  if (offset < days) {
    return { phase: "during", start, end, days, dayOfTrip: offset + 1, daysUntil: 0 };
  }
  return { phase: "after", start, end, days, dayOfTrip: 0, daysUntil: 0, daysSince: offset - (days - 1) };
};

// ── WHICH OF THEIR TRIPS IS THE ONE HAPPENING ────────────────────────
//
// Somebody with four saved guides is not on four holidays. A trip in progress
// always wins; failing that the next one to start; failing that nothing, because
// "your trip to Ribe finished in March" is not news anybody needs on the front
// page.
//
// Ties broken by the earlier start so the same list always gives the same
// answer, which is the rule settledObservations already follows for the same
// reason: a panel that reorders itself between renders looks broken.
export const currentTrip = (guides, today = new Date()) => {
  const list = Array.isArray(guides) ? guides : [];
  const withStatus = list
    .map(g => ({ guide: g, status: tripStatus(g, today) }))
    .filter(x => x.status);

  const running = withStatus
    .filter(x => x.status.phase === "during")
    .sort((a, b) => a.status.start - b.status.start);
  if (running.length) return running[0];

  const coming = withStatus
    .filter(x => x.status.phase === "before")
    .sort((a, b) => a.status.start - b.status.start);
  if (coming.length) return coming[0];

  return null;
};

// ── SAYING IT TO A PERSON ────────────────────────────────────────────
//
// Plain counting, no adjectives. "Day 3 of 8" is a fact somebody can check
// against their own calendar, and a sentence they can check is the only kind
// this product is allowed to print.
export const tripStatusLine = (status, title = "") => {
  if (!status) return "";
  const name = String(title || "").trim();
  const trip = name ? `your trip to ${name}` : "your trip";
  if (status.phase === "during") {
    return `You are on ${trip} right now, day ${status.dayOfTrip} of ${status.days}.`;
  }
  if (status.phase === "before") {
    return status.daysUntil === 1
      ? `${trip.charAt(0).toUpperCase()}${trip.slice(1)} starts tomorrow.`
      : `${trip.charAt(0).toUpperCase()}${trip.slice(1)} starts in ${status.daysUntil} days.`;
  }
  return "";
};

// ── AND TO THE MODEL ─────────────────────────────────────────────────
//
// Somebody standing in Ribe on day three wants a different answer from somebody
// planning at their kitchen table in February, and until now Gemlyx could not
// tell the two apart. This is the one fact that separates them.
//
// Worded as a FACT rather than an instruction to change tone, for the reason
// observedForPrompt already gives about its own block: a model told how to feel
// performs it, while a model told what is true reasons from it. The one
// instruction here is the one that prevents harm, which is that a person already
// on the road cannot act on advice about what to book beforehand.
//
// Nothing is emitted when there is nothing to say. An empty string is what
// profileForPrompt returns for an empty profile, and a prompt that carries a
// paragraph saying "we do not know whether they are travelling" is worse than
// one that does not raise the subject.
export const tripStatusForPrompt = (status, title = "") => {
  if (!status || status.phase !== "during") return "";
  const name = String(title || "").trim();
  const where = name ? ` (${name})` : "";
  return `WHERE THEY ARE IN THE TRIP: they are travelling RIGHT NOW${where}, on day ${status.dayOfTrip} of ${status.days}, which ends ${status.end.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. This is measured from the trip they saved and the date today, not something they have told you in this conversation. Answer as though they are standing in the country: what is open today, what is reachable from where they are now, what is worth changing plans for. Do not suggest anything that has to be booked or decided before leaving home, and do not congratulate them on the trip or ask whether they are excited.`;
};
