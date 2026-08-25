// ── HOW DO WE KNOW THIS? ────────────────────────────────────────────
//
// Item 9 of the fifty point review: "introduce confidence / verification logic
// internally", distinguishing verified, stable, estimated and AI judgement.
// Gemini arrived at the same idea independently as its Priority 1/2/3 tiering.
// And this repository already built four corners of it separately, on four
// different days, without any of them knowing about the others:
//
//   correction.js    MEASURED_FIELDS, the fields a rewrite may not overwrite
//   entryAudit.js    __priceSource, which page states the price
//   safetyClaims.js  the claims where being wrong hurts somebody
//   provenance.js    hasEntrySources, whether anything is recorded at all
//   pageScan.js      factAge and PERISHABLE, whether a source has gone stale
//
// Three independent reviewers and our own code pointing at one system that did
// not exist as a system. This is the system half of it. THE RENDER IS NOT HERE
// and is deliberately left for Oliver to see, because "never give an estimate
// the visual authority of a measurement" is a design decision about a page and
// not a decision a module gets to make while he is asleep.
//
// ── IT IS NOT A CONFIDENCE SCORE, AND THAT IS THE POINT ─────────────
//
// The obvious build is a number from 0 to 1. It would be a guess wearing the
// costume of a measurement, which is the exact failure this whole repository
// exists to prevent, and it would be unfalsifiable: nobody can tell you why a
// field scored 0.72.
//
// So this answers a question with an answer that can be checked: WHAT KIND OF
// EVIDENCE IS THERE. Four kinds, ordered, each of which is a fact about the
// row rather than an opinion about it. A person can disagree with a tier by
// pointing at the row, which is what makes it worth having.
//
// ── AND IT KEEPS NO VOCABULARY OF ITS OWN ───────────────────────────
//
// The defect this is meant to end is FIVE SEPARATE LISTS over one namespace,
// none of them complete, and the gaps invisible. On the day this was written,
// two exports named PROSE_FIELDS disagreed about eleven fields, and the
// self-contradiction check could not see gemlyxFind because of it.
//
// A sixth list would make that worse. So every list here is IMPORTED, and the
// suite asserts this module answers to them rather than beside them. The one
// thing declared here is PERISHABLE_FIELDS, and even that is answerable: every
// entry in it maps to a topic pageScan already names, asserted.
//
// ── WHICH NAMESPACE ─────────────────────────────────────────────────
//
// LIVE-SIDE FIELD NAMES, the ones on a published row after shapeForLive. Not
// the draft names. `characterAndFit` becomes `desc` at publish and the two are
// different keys, so a module that quietly accepted both would report evidence
// for a field the reader never sees. Stated here because it is exactly the kind
// of thing that goes unwritten and then costs a day.
// ── AND NOTHING CALLS THIS YET, WHICH IS THIS REPOSITORY'S OWN BUG ──
//
// Said out loud rather than left to be discovered. The defect this codebase
// keeps finding in itself is finished, correct, tested code that nothing
// reaches: the tier gate that offered words it refused, the six AI Act
// translations that no reader could get to, the photo probe that ran once. A
// new module with 60 assertions and no caller is that shape exactly, and
// calling it "phase one" does not change what it is.
//
// It is deliberate here and it is bounded. Oliver asked for the system half and
// said to leave the render, because "never give an estimate the visual
// authority of a measurement" is a decision about a page that he should make
// with his eyes open rather than one I make while he sleeps.
//
// THE TWO PLACES IT SHOULD BE WIRED, so this is a next step and not a risk:
//
//   1. DetailPage, under a field, which is the render and is his.
//   2. The Studio's Manage view, which already groups rows by problem in
//      manageGroups.js and already counts the ones with no sources. That one is
//      founder-facing, so it is not a design decision, and it is the cheaper of
//      the two.
//
// A third publish note was considered and NOT built. evidenceNote and
// missingSourcesNote would fire on exactly the same rows: unbackedPerishables
// only reaches UNSOURCED, and a row with no sources is already told so once. A
// second sentence saying the same thing in different words is how a shouted
// note stops being read.

import { MEASURED_FIELDS, isPipelineOwned } from "./correction";
import { NOT_A_CLAIM } from "./factCheckCopy";
import { PERISHABLE } from "./pageScan";
import { SAFETY_CLAIM_FIELDS } from "./safetyClaims";

export const EVIDENCE = {
  MEASURED: "measured",
  CITED: "cited",
  SOURCED: "sourced",
  UNSOURCED: "unsourced",
  NOT_A_CLAIM: "notAClaim",
};

// Ordered so a render can sort and compare without knowing the names. Higher is
// better evidence. notAClaim is 0 rather than -1 because it is not weak
// evidence, it is not evidence at all: the field makes no claim about the world.
export const EVIDENCE_RANK = {
  [EVIDENCE.MEASURED]: 4,
  [EVIDENCE.CITED]: 3,
  [EVIDENCE.SOURCED]: 2,
  [EVIDENCE.UNSOURCED]: 1,
  [EVIDENCE.NOT_A_CLAIM]: 0,
};

// Written for a reader, not for a log. Every one of these is a sentence that
// could appear under a field on the page without further translation, which is
// the test of whether a tier is honest: if you cannot say it out loud to the
// person relying on it, the tier is wrong.
export const EVIDENCE_LABEL = {
  [EVIDENCE.MEASURED]: "Checked",
  [EVIDENCE.CITED]: "Sourced",
  [EVIDENCE.SOURCED]: "Researched",
  [EVIDENCE.UNSOURCED]: "Unverified",
  [EVIDENCE.NOT_A_CLAIM]: "",
};

// ── THE FIELD-LEVEL CITATION, WHICH MOSTLY DOES NOT EXIST YET ───────
//
// __priceSource is the only one built. entryAudit records which page actually
// states the price and refuses one found only on off-subject pages, and
// safetyClaims.js already names the next: "__accessibilitySource the way
// __priceSource already is".
//
// So the SHAPE is named here rather than the single field, because the shape is
// the thing that generalises and a second hand-written `__xSource` check is how
// you get a sixth vocabulary.
export const fieldSourceKey = (field) => `__${String(field || "")}Source`;

// ── DOES THIS FIELD GO OUT OF DATE ──────────────────────────────────
//
// The second axis, and the reason a single tier is not enough. "Founded 1891,
// unsourced" and "opening hours, unsourced" are the same tier and not the same
// problem: one of them was either right or wrong the day it was written and
// will not change, and the other is decaying while you read it.
//
// Every entry here maps to a topic pageScan's PERISHABLE already names, so the
// two instruments cannot drift. The map is the reconciliation and the suite
// asserts it holds.
export const PERISHABLE_FIELD_TOPIC = {
  price: "price",
  priceNote: "price",
  extraCosts: "price",
  typicalCosts: "price",
  ticketInfo: "price",
  ticketsGlance: "price",
  ticketStatus: "booking",
  bookingType: "booking",
  date: "date",
  dateStart: "date",
  dateEnd: "date",
  openingHours: "opening hours",
  hours: "opening hours",
  travelTime: "transport",
  nearestStation: "transport",
  website: "existence",
  link: "existence",
};

export const PERISHABLE_FIELDS = Object.keys(PERISHABLE_FIELD_TOPIC);
export const isPerishable = (field) => Object.prototype.hasOwnProperty.call(PERISHABLE_FIELD_TOPIC, String(field || ""));
export const perishableTopic = (field) => PERISHABLE_FIELD_TOPIC[String(field || "")] || null;

const said = (v) => {
  if (v == null) return "";
  if (Array.isArray(v)) return v.length ? "y" : "";
  if (typeof v === "object") return Object.keys(v).length ? "y" : "";
  return String(v).trim();
};

const entrySources = (entry) => (Array.isArray(entry?.__sources) ? entry.__sources : []).filter(s => typeof s === "string" && /^https?:\/\//i.test(s));

// ── THE ANSWER, FOR ONE FIELD ───────────────────────────────────────
//
// null when there is nothing to assess. An absent field has no evidence problem
// and reporting one would fill the render with rows about fields that are not
// on the page. Same reason claimIsSupported returns true for an empty claim:
// nothing claimed, nothing to support.
export const evidenceOf = (entry, field) => {
  const key = String(field || "");
  if (!key || !entry || typeof entry !== "object") return null;
  if (!said(entry[key])) return null;

  const perishable = isPerishable(key);
  const topic = perishableTopic(key);
  // The fifth vocabulary, and the one where being wrong lands on a body rather
  // than a schedule. Carried as a flag rather than a tier because it is a
  // different question: not how well we know it, but what it costs to be wrong.
  const safety = SAFETY_CLAIM_FIELDS.includes(key);
  const make = (tier, why, source = "") => ({
    field: key, tier, rank: EVIDENCE_RANK[tier], label: EVIDENCE_LABEL[tier],
    perishable, topic, safety, why, source,
  });

  // A field that makes no claim about the world is not weak evidence. It is a
  // slug, a colour, a photo path. Checked FIRST, because several of them are
  // also on other lists and the render must not print "unverified" under an
  // emoji.
  //
  // ── AND A `__` FIELD IS THE EVIDENCE, NOT THE CLAIM ───────────────
  //
  // Caught by running it. isPipelineOwned answers true for anything starting
  // `__`, so the first version reported __sources and __priceSource as MEASURED
  // claims and listed them on the page beside the price they are the source
  // for. That is a category error with a tidy label on it: the URL that proves
  // the price is not itself a thing Gemlyx claims about the place.
  //
  // NOT_A_CLAIM's own comment already had the words for it, at the top of its
  // list: "Ours, not the world's."
  if (key.startsWith("__")) {
    return make(EVIDENCE.NOT_A_CLAIM, "This is Gemlyx's own record of how it knows something, not a claim about the place.");
  }
  if (NOT_A_CLAIM.has(key) && !MEASURED_FIELDS.includes(key)) {
    return make(EVIDENCE.NOT_A_CLAIM, "This is how Gemlyx files the entry, not something it claims about the place.");
  }

  if (MEASURED_FIELDS.includes(key) || isPipelineOwned(key)) {
    return make(EVIDENCE.MEASURED,
      perishable
        ? `Gemlyx measured this rather than writing it, and a rewrite may not overwrite it. It is the kind of fact that changes, so it is only as current as the day it was taken.`
        : `Gemlyx measured this rather than writing it, and a rewrite may not overwrite it.`);
  }

  const cited = said(entry[fieldSourceKey(key)]);
  if (cited) {
    return make(EVIDENCE.CITED, "A specific page is recorded as stating this, and you can open it.", cited);
  }

  const sources = entrySources(entry);
  if (sources.length) {
    return make(EVIDENCE.SOURCED,
      `This entry was written from ${sources.length} recorded ${sources.length === 1 ? "source" : "sources"}, but nothing ties this particular line to any one of them.`);
  }

  return make(EVIDENCE.UNSOURCED,
    perishable
      ? "Nothing records where this came from, and it is the kind of fact that goes out of date. Check it before you rely on it."
      : "Nothing records where this came from.");
};

// ── THE WHOLE ROW ───────────────────────────────────────────────────
// Weakest first, because the render's job is to stop the weakest thing on the
// page looking like the strongest, and a list that opens with what is fine is
// the wrong way round for that.
export const entryEvidence = (entry) => {
  if (!entry || typeof entry !== "object") return [];
  return Object.keys(entry)
    .map(k => evidenceOf(entry, k))
    .filter(Boolean)
    .filter(e => e.tier !== EVIDENCE.NOT_A_CLAIM)
    // Weakest first, then a safety claim ahead of an ordinary one at the same
    // tier, then a perishable ahead of a stable one. The order is the render's
    // instruction about what to say first, so it encodes what costs most to get
    // wrong rather than what happens to sort early.
    .sort((a, b) =>
      a.rank - b.rank
      || Number(b.safety) - Number(a.safety)
      || Number(b.perishable) - Number(a.perishable)
      || a.field.localeCompare(b.field));
};

export const evidenceCounts = (entry) => {
  const out = { measured: 0, cited: 0, sourced: 0, unsourced: 0 };
  entryEvidence(entry).forEach(e => { out[e.tier] = (out[e.tier] || 0) + 1; });
  return out;
};

// ── THE PAIR THAT ACTUALLY MATTERS ──────────────────────────────────
//
// Unsourced AND perishable. A price nobody can trace that is also the kind of
// thing that changes every season is the combination that sends somebody to a
// door with the wrong number in their head, and until now nothing in this
// codebase could name it: the sources gate saw the first half and factAge saw
// the second half and neither saw both.
export const unbackedPerishables = (entry) =>
  entryEvidence(entry).filter(e => e.perishable && e.rank <= EVIDENCE_RANK[EVIDENCE.UNSOURCED]);

// The single weakest thing on the page, for a caller that has room for one line
// rather than a table. Null when there is nothing to worry about, which is a
// real answer and not an empty one.
export const weakestClaim = (entry) => entryEvidence(entry)[0] || null;

// ── AND A SENTENCE FOR THE PUBLISHER, IN THE SHOUTED FORM ───────────
// Same contract safetyClaimNote and missingSourcesNote already use: prefixed
// so correction.js's SHOUTED_NOTE protects it from being tidied away by a model
// that has no standing to remove an instruction addressed to a person.
export const evidenceNote = (entry) => {
  const bad = unbackedPerishables(entry);
  if (!bad.length) return "";
  const names = bad.slice(0, 4).map(e => e.field).join(", ");
  return `CHECK BEFORE PUBLISHING: ${bad.length} ${bad.length === 1 ? "field goes" : "fields go"} out of date and nothing records where ${bad.length === 1 ? "it" : "they"} came from (${names}${bad.length > 4 ? ", and more" : ""}). A stale fact nobody can trace is the one a reader acts on and finds wrong at the door.`;
};

// Named so the suite and any future render agree about the list rather than
// each keeping its own, which is the whole argument of this file applied to
// itself.
export const PERISHABLE_TOPICS_USED = [...new Set(Object.values(PERISHABLE_FIELD_TOPIC))];
export const PAGE_SCAN_TOPICS = PERISHABLE;
