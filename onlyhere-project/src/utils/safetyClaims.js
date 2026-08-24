// ── THE CLAIMS WHERE BEING WRONG HURTS SOMEBODY ──────────────────────
//
// 24 Aug 2026. Gemini, asked about Danish and EU law, put "safety and
// accessibility status" in its top tier alongside affiliate disclosure and
// affiliate prices, and it was right about the one thing this codebase had no
// answer for.
//
// `MEASURED_FIELDS` in correction.js is travelTime, ticketStatus, website,
// nearestStation, lat and lon: the fields the pipeline MEASURES, protected so a
// rewrite cannot overwrite a measurement with a guess. `accessibility` is not
// among them and could not be, because nothing measures it. It is a glance
// field a model writes, carried to the live row by shapeForLive and printed on
// the page beside figures that were checked.
//
// ── WHY THIS IS A DIFFERENT CLASS FROM A WRONG OPENING HOUR ─────────
//
// A wrong opening hour costs somebody an hour. "Step-free access" on a building
// with stairs costs a wheelchair user their afternoon, in a foreign country,
// having planned around it. The same is true of the other claims in this class:
// whether a route is passable, whether a crossing carries cars, whether a place
// is safe to walk to after dark.
//
// The rest of this repository already refuses to state what it has not checked.
// absenceClaims will not let a draft say a train does not run. isBookableTicketUrl
// returns null rather than a best guess. exampleGuide ships empty rather than
// invented. This is that rule arriving at the one field where the cost of
// breaking it lands on the reader's body rather than their schedule.
//
// ── WHAT THIS DOES AND DELIBERATELY DOES NOT DO ─────────────────────
//
// It does not block publishing. 77 of 148 published rows carry no __sources at
// all, from before that field was on the allow-list, so a hard gate would lock
// the founder out of his own library over a defect he already inherited.
//
// It raises a SHOUTED PUBLISHER NOTE instead, in the form correction.js already
// protects from being tidied away by a rewrite (SHOUTED_NOTE matches
// "CHECK BEFORE PUBLISHING"). A person decides. That is the same answer this
// codebase gives everywhere a machine cannot settle something, and it is the
// answer that does not pretend a missing check is a passed one.
//
// NOT LEGAL ADVICE. The legal framing came from a model and is recorded in
// EU_COMPLIANCE_24AUG.md; the product argument above stands on its own.

// One field today, named as a list because the class is the point and the
// second member is already visible: a "carries cars" claim about a ferry is the
// same shape, and the Bybjerg draft carried exactly that as an uncertainty.
export const SAFETY_CLAIM_FIELDS = ["accessibility"];

export const SAFETY_CLAIM_LABEL = {
  accessibility: "accessibility",
};

const said = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// ── WHAT COUNTS AS SUPPORT ──────────────────────────────────────────
//
// A recorded source for the ENTRY, which is the weakest honest test and the
// only one available at publish time. It does not prove the accessibility
// sentence came off that page, and it is not meant to: it separates "we read
// the operator's own site and wrote this" from "nobody read anything and a
// model wrote it anyway", which is the difference that matters and the one
// nothing was asking.
//
// A stronger test belongs upstream, where the drafting run still holds the page
// text: the same question the price trace answers, "which page states this",
// recorded as __accessibilitySource the way __priceSource already is. That is
// the next step and it is written down here rather than assumed.
export const claimIsSupported = (payload, field) => {
  if (!said(payload?.[field])) return true; // nothing claimed, nothing to support
  if (said(payload?.[`__${field}Source`])) return true;
  const sources = Array.isArray(payload?.__sources) ? payload.__sources : [];
  return sources.length > 0;
};

export const unsupportedSafetyClaims = (payload) =>
  SAFETY_CLAIM_FIELDS.filter(f => said(payload?.[f]) && !claimIsSupported(payload, f));

// ── THE NOTE, IN THE SHOUTED FORM A REWRITE MAY NOT DELETE ──────────
// Prefixed "CHECK BEFORE PUBLISHING" because correction.js's SHOUTED_NOTE
// already recognises that exact opening and protects it: a model tidying prose
// has no standing to remove an instruction addressed to a person.
export const safetyClaimNote = (payload) => {
  const missing = unsupportedSafetyClaims(payload);
  if (!missing.length) return "";
  const names = missing.map(f => SAFETY_CLAIM_LABEL[f] || f).join(", ");
  return `CHECK BEFORE PUBLISHING: this entry states ${names} and nothing records where that came from. A wrong opening hour costs somebody an hour; a wrong access claim costs a wheelchair user their afternoon in a country they do not live in. Open the operator's own page, confirm it in their words, or take the sentence out. Do not publish it because it sounds right.`;
};
