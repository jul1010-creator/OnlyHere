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
export const cleanOffer = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const text = clean(raw.text).slice(0, OFFER_TEXT_MAX);
  const until = clean(raw.until);
  if (!text && !until) return null;
  return { text, until };
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
export const offerView = (offer, { paid = false, today = new Date() } = {}) => {
  if (!offerLive(offer, today)) return { show: false, locked: false, text: "", until: "" };
  const o = cleanOffer(offer);
  if (!paid) return { show: true, locked: true, text: "", until: o.until };
  return { show: true, locked: false, text: o.text, until: o.until };
};

// What the locked state says. Names the thing and the condition, and promises
// nothing about what the offer is, because a teaser that hints at the size of
// the offer is the same promise with deniability.
export const OFFER_LOCKED_LABEL = "Gemlyx offer";
export const OFFER_LOCKED_NOTE = "Only for paying users.";

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
