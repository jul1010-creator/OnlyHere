// ── A GEMLYX OFFER ───────────────────────────────────────────────────
//
// Oliver, 24 August 2026, walking into Copenhagen shops the next day:
//
//   "Put into the draft on edit and create 'Gemlyx offer'."
//
// And on who sees it:
//
//   "It will only be visible to paid users. So Gemlyx offer will say 'Only for
//    paying users'. But only paying users will know what the offer is."
//
// So there are three states on a page, not two: no offer, an offer somebody
// cannot read yet, and the offer. The middle one is the point. A signed out
// visitor learns that an offer EXISTS here, which is the reason to subscribe,
// and does not learn what it is, which is what keeps the reason.
//
// ── AN OFFER IS A PERISHABLE CLAIM ABOUT SOMEBODY ELSE'S SHOP ────────
//
// This file's whole reason to exist. Everything else Gemlyx prints about a
// place is a fact it checked. An offer is a PROMISE, made on behalf of a
// business, that they will hand something over. When it stops being true a
// traveller walks in, asks, and is refused, in front of the shop Gemlyx talked
// into it. That is worse than a stale opening hour, because a stale hour
// embarrasses Gemlyx and a stale offer embarrasses the shop as well.
//
// Which is why `until` is REQUIRED and an offer with no end date does not
// render at all. It is the same rule the rest of the codebase already keeps
// about a fact it cannot stand behind: refuse, and say why, rather than print
// it and hope. `offerProblems` is the saying-why, and it runs in the Studio
// before publish rather than in a console nobody reads.
//
// ── AND THE DASHES ──────────────────────────────────────────────────
// `stripDashesDeep` runs over every published payload as it loads and SKIPS
// every key beginning with an underscore, because those are machinery
// (helpers.js, `out[k] = k.startsWith("_") ? v : stripDashesDeep(v)`).
// `__offer` is machinery-shaped and its text is reader-facing prose, so it is
// the one field in the payload that carries a sentence past that guard. It is
// stripped here instead, at the point it is cleaned.
import { dayStart, dayEnd } from "./calendarDay";
import { stripDashes } from "./helpers";
import { PAID_PLANS_LIVE } from "../config";
import { t as uiT } from "./uiLanguage";
import { OFFER_WEEK, cleanDays, cleanClock, minutesOf, placeClock, windowOf, timingAt } from "./offerClock";
export { OFFER_WEEK, cleanClock, placeClock };
import { activeCountry, DEFAULT_COUNTRY } from "./countries";

const clean = (v) => stripDashes(String(v ?? "").replace(/\s+/g, " ").trim());

// Long enough for "Free bag of bolcher for the first 10 Gemlyx members" and
// short enough that nobody writes a paragraph of terms into it. Terms that need
// a paragraph are terms a traveller will not read at the counter.
export const OFFER_TEXT_MAX = 140;

// ── WHO COUNTS AS PAYING ────────────────────────────────────────────
//
// NOTHING IS PAYING TODAY. There is no payment system, no plan field on the
// profile, and the Plan panel in the account screen is deliberately a
// statement rather than a control, with an assertion holding it that way.
//
// So this returns false for everybody, on purpose, and the whole feature ships
// in its locked state. That is the useful half: the shop sees the badge on the
// page, a visitor sees that an offer exists, and no promise is made to anybody
// who cannot be verified.
//
// ONE PLACE TO WIRE. When plans exist, flip PAID_PLANS_LIVE in config.js and
// give this the field to read. Nothing else in the app asks this question, by
// construction, so nothing else has to change and nothing can drift out of
// agreement with it. Same shape as GOOGLE_SIGN_IN, which config.js already
// documents as one line to turn on.
export const hasPaidPlan = (profile) => {
  if (!PAID_PLANS_LIVE) return false;
  const plan = String(profile?.plan || "").trim().toLowerCase();
  return plan !== "" && plan !== "free";
};

// ── THE STORED SHAPE ────────────────────────────────────────────────
// Two fields and no more. A counter belongs here eventually, per his "10 left,
// 9 left, 8 left", and it is deliberately absent until something can count:
// a number nothing decrements is a lie that ticks.
//
// Plus, since 2 Oct 2026, an optional window inside those dates (see OFFER
// HOURS below): `days` and `from`/`to`, stored only when set, so every offer
// written before then keeps its exact shape.
export const cleanOffer = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const text = clean(raw.text).slice(0, OFFER_TEXT_MAX);
  const until = clean(raw.until);
  if (!text && !until) return null;
  const days = cleanDays(raw.days);
  const from = clean(raw.from), to = clean(raw.to);
  return {
    text, until,
    ...(days.length ? { days } : {}),
    ...(from || to ? { from: cleanClock(from) || from, to: cleanClock(to) || to } : {}),
  };
};

// ── OFFER HOURS ─────────────────────────────────────────────────────
//
// Oliver, 2 Oct 2026: "businesses could, let's say at 13.00 tuesday, where
// they get no customers, say 'from 13.00-16.00' we offer a full meal + free
// soda on chosen meals."
//
// So an offer can run in a window: on some weekdays, between two clock times,
// inside its dates. Nothing set means all day, every day, as before.
//
// THE CLOCK IS THE PLACE'S, NOT THE READER'S. A cruise passenger's phone may
// still be on ship time or home time, and "until 16:00" means 16:00 at the
// counter in Klaipėda. Callers pass the zone of the row's country.
//
// The clock helpers live in offerClock.js, which imports nothing a server
// route cannot load, so api/plan-now.js reads an offer's hours by the same
// rules as the pages do.
// The window, or null for an all day, every day offer.
export const offerWindow = (offer) => windowOf(cleanOffer(offer));

// Where an offer stands right now, at the place:
//   "always"  no window, so on whenever its dates are
//   "now"     inside its window
//   "later"   on today, but not yet
//   "off"     not today, or already over for today
// An offer outside its dates is "ended", whatever its window says.
export const offerTiming = (offer, { now = new Date(), zone = "" } = {}) => {
  if (!offerLive(offer, now)) return "ended";
  return timingAt(offerWindow(offer), placeClock(now, zone));
};

// ── WHY IT WILL NOT RENDER, IN WORDS, IN THE STUDIO ─────────────────
// Each branch is a different thing for him to do, which is why this returns
// sentences rather than a boolean. Same reason describeTicketSearch does.
export const offerProblems = (offer) => {
  const o = cleanOffer(offer);
  if (!o) return [];
  const out = [];
  if (!o.text) out.push("The offer has an end date and no text, so there is nothing to show. Write what the traveller gets, in the shop's own words where you can.");
  if (!o.until) out.push("The offer has no end date, so it will not render. An offer with no end is a promise nobody is going to remember to take down: give it a date, even a far one, and it becomes a review rather than a leak.");
  else if (!dayEnd(o.until)) out.push(`"${o.until}" is not a date this can read. Use YYYY-MM-DD.`);
  else if (!offerLive(o)) out.push(`This offer ended on ${o.until}, so it is already invisible on the page. Change the date or clear the field.`);
  // The hours. Both or neither, each one a time, and the end after the start.
  // A window past midnight is two offers' worth of argument at the counter, so
  // it is refused rather than guessed at.
  const hasFrom = !!String(o.from || "").trim(), hasTo = !!String(o.to || "").trim();
  if (hasFrom !== hasTo) out.push("Give the offer both a start and an end time, or leave both empty for all day.");
  if (hasFrom && !cleanClock(o.from)) out.push(`"${o.from}" is not a time this can read. Use 13:00.`);
  if (hasTo && !cleanClock(o.to)) out.push(`"${o.to}" is not a time this can read. Use 16:00.`);
  if (cleanClock(o.from) && cleanClock(o.to) && minutesOf(o.to) <= minutesOf(o.from)) out.push("The end time has to be after the start time, on the same day.");
  if (o.text && o.text.length >= OFFER_TEXT_MAX) out.push(`The text is at the ${OFFER_TEXT_MAX} character limit and may have been cut. Say the one thing they get, and leave the conditions to the counter.`);
  return out;
};

// Live means: readable text, a readable end date, and that date not yet past.
// The last day counts in full, which is what dayEnd is for: an offer valid
// until the 30th is valid all of the 30th.
export const offerLive = (offer, today = new Date()) => {
  const o = cleanOffer(offer);
  if (!o || !o.text || !o.until) return false;
  const end = dayEnd(o.until);
  const now = dayStart(today);
  return !!end && !!now && end.getTime() >= now.getTime();
};

// ── AND IN WORDS ────────────────────────────────────────────────────
// "On now until 16:00", "Today 13:00-16:00", or the schedule when it is not
// today: "Tuesdays 13:00-16:00", "Tue, Thu 13:00-16:00", "Every day 13:00-16:00".
// "" for an offer with no window, which says nothing it did not say before.
// Danish writes the clock with a full stop, 13.00, the way he wrote it.
const DAY_LOCALES = { en: "en-GB", da: "da-DK", de: "de-DE", lt: "lt-LT" };
const DAY_FALLBACK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const clockIn = (hhmm, lang) => (lang === "da" ? hhmm.replace(":", ".") : hhmm);
const dayName = (d, lang, style) => {
  try { return new Intl.DateTimeFormat(DAY_LOCALES[lang] || "en-GB", { weekday: style, timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 4 + d))); }
  catch { return DAY_FALLBACK[d]; }
};
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const offerHoursLabel = (offer, { timing = "", lang = "en" } = {}) => {
  const w = offerWindow(offer);
  if (!w) return "";
  const range = w.from ? `${clockIn(w.from, lang)}-${clockIn(w.to, lang)}` : "";
  if (timing === "now") return w.from ? uiT("offer.onNowUntil", lang).replace("{time}", clockIn(w.to, lang)) : uiT("offer.onToday", lang);
  if (timing === "later") return uiT("offer.todayAt", lang).replace("{range}", range);
  const days = w.days.length === 0 || w.days.length === 7 ? uiT("offer.everyDay", lang)
    : w.days.length === 1 ? (lang === "en" ? `${dayName(w.days[0], "en", "long")}s` : capital(dayName(w.days[0], lang, "long")))
    : w.days.map(d => dayName(d, lang, "short")).join(", ");
  return [days, range].filter(Boolean).join(" ");
};

// ── WHAT A GIVEN READER SEES ────────────────────────────────────────
//
// Returned as a decision rather than made in the render, so the rule can be
// asserted without a browser, and so the three states cannot quietly become
// two the next time somebody edits the JSX. Same argument that moved layoutBody
// and the food facets out of their render sites.
//
// AN ENDED OFFER SHOWS NOTHING, not even the locked badge. A badge saying an
// offer exists here, over an offer that has finished, is an advertisement for
// something that is gone, and it would be shown to exactly the people being
// asked to pay for access to it.
//
// `timing` and `window` ride along for the hours (see OFFER HOURS): the badge
// says "On now until 16:00" or when it runs, and the lock rule is untouched.
export const offerView = (offer, { paid = false, today = new Date(), zone = "" } = {}) => {
  if (!offerLive(offer, today)) return { show: false, locked: false, text: "", until: "", timing: "ended", window: null };
  const o = cleanOffer(offer);
  const timing = offerTiming(o, { now: today, zone });
  const win = offerWindow(o);
  if (!paid) return { show: true, locked: true, text: "", until: o.until, timing, window: win };
  return { show: true, locked: false, text: o.text, until: o.until, timing, window: win };
};

// What the locked state says. Names the thing and the condition, and promises
// nothing about what the offer is, because a teaser that hints at the size of
// the offer is the same promise with deniability.
export const OFFER_LOCKED_LABEL = "Gemlyx offer";
export const OFFER_LOCKED_NOTE = "Only for paying users.";
// 30 Sep 2026: on another country's page a deal is for anyone with a free
// account, so the locked card says what unlocks it.
export const OFFER_SIGNUP_NOTE = "Sign up to see the deal.";
export const offerLockedNote = (code = activeCountry()) => (code === DEFAULT_COUNTRY ? OFFER_LOCKED_NOTE : OFFER_SIGNUP_NOTE);

// ── AND THE SENTENCE THAT HAS TO GO UNDER IT ────────────────────────
//
// The affiliate invariant in affiliates.js is that nothing comes out tracked
// without a sentence to put under it, and nothing claims a commission on a
// link that earns none. An offer is the same question with the money running
// the other way: Gemlyx may have paid the business, or bought the goods, to put
// this here.
//
// A reader cannot tell the difference between "this shop is good" and "this
// shop did a deal with Gemlyx" unless somebody says so. Terms clause 14 and
// privacy section 13 already promise that nothing ranks higher because it pays.
// This is that promise, said where the money is visible.
export const OFFER_NOTE = "An offer does not change where a place appears in Gemlyx or what we say about it.";
