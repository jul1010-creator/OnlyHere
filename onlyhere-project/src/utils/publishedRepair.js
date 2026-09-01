// ── A PUBLISHED ROW IS DATA, AND FIXING THE GENERATOR DOES NOT FIX IT ─
//
// Oliver, 10 Aug 2026, looking at a live page for Københavns Museum: "Why the
// fk is it put to the old ChatGPT structure? 'Why people love it' and no
// reality check... tripple check now.. because I'm tired of wasting time and
// money on redrafting these things."
//
// He is right that it is wrong, and right to be angry, and the reason matters
// enormously for what it costs to fix.
//
// The headings on that page are NOT produced by any code that runs today.
// DetailPage renders item.blogBody verbatim, and blogBody is a stored array of
// {type:"heading"} / {type:"paragraph"} blocks that was frozen into the row on
// the day it was published. Every generator in the current codebase writes
// "Being There" / "Who It's For" / "The Reality Check". The row predates that.
//
// So the entry-voice fix of 8 Aug and the shapeForLive fix of 10 Aug both did
// exactly what they claimed, and neither could ever have changed a row that was
// already in the database. Nothing in this app rewrites a stored blogBody at
// read time. That is the whole bug: a fix to a WRITER is invisible to
// everything it already wrote, and the only symptom is an old page that looks
// like the fix failed.
//
// AND THE PROSE IS FINE. Look at what is actually under those headings on his
// page: "Walk in from Stormgade and the restored Overformynderiet building does
// a lot of the talking" is Being There content. "It's a weaker fit if you're
// chasing blockbuster art or need everything explained in English" is Who It's
// For content, and it is already honest. The model was not writing badly. It
// was writing correct paragraphs under signs that named them wrong.
//
// Which means the repair is a RENAME, not a redraft. Renaming a stored heading
// costs nothing: no model, no research, no fact-check, no Perplexity pass. A
// redraft costs a full pipeline run and would throw away prose that is already
// right. That distinction is the entire point of this file.
//
// What a rename genuinely CANNOT do is invent a Reality Check that was never
// written, because those rows were published by a shapeForLive that did not ask
// for the field at all. So this file reports that separately and never pretends
// a renamed row is a finished row.

import { entryPrice, entryBooking } from "./entryPrice";

// The current heading vocabulary, as produced by shapeForLive in
// studioContent.js and the paste-ready codegen in App.jsx. The test derives the
// real set from that source and asserts this covers it, so this list cannot
// quietly fall behind the generator the way every other duplicated list in this
// codebase has.
export const CURRENT_HEADINGS = [
  "Being There", "Who It's For", "The Reality Check", "Things to Know",
  "Atmosphere", "How It's Made", "How It Works", "After Dark", "Before Dark",
  "Best Time to Go", "When Do People Enter", "What to Be Aware Of",
  // Bar streets, added 15 Aug 2026. A street's two useful questions are which
  // nights are worth it and which way to walk, and neither is a question you
  // would ask about a single bar, so they are headings of their own.
  "Best Nights", "Walking It",
];

// A town's first heading carries the town's name, so it can never be a fixed
// string. Matched by shape instead.
export const DYNAMIC_HEADING = /^What to Do in .+/;

// ── WHAT AN OLD ROW SAYS, AND WHAT IT SHOULD SAY ────────────────────
// Every one of these is a heading this app genuinely used to write. The
// mapping is safe in both directions because each old heading sat above the
// same paragraph the new heading names:
//
//   "Why People Love It"    was the free/booking `special` field  -> Being There
//   "Perfect For"           was the free/booking `whoFor` field   -> Who It's For
//   "Who Is It For"         was the night `whoFor` field          -> Who It's For
//   "Who Is It Perfect For" was the nightTown `whoFor` field      -> Who It's For
//   "Reality Check"         was festival's, one word adrift       -> The Reality Check
//
// Nothing here changes a single character of body text. If a rename ever needed
// the paragraph rewritten too, it would not belong in this file.
export const LEGACY_HEADINGS = {
  "Why People Love It": "Being There",
  "Perfect For": "Who It's For",
  "Who Is It For": "Who It's For",
  "Who Is It Perfect For": "Who It's For",
  "Reality Check": "The Reality Check",
  // shapeForLive's TOWN branch wrote this while every other type and the whole
  // codegen wrote "Things to Know", so every town published through the button
  // has it. Same bullets underneath, so this is a pure rename like the rest.
  "Good to Know": "Things to Know",
};

const isHeading = (b) => b && b.type === "heading" && typeof b.content === "string";
const clean = (s) => String(s || "").trim();

export const headingsOf = (blogBody) =>
  (Array.isArray(blogBody) ? blogBody : []).filter(isHeading).map(b => clean(b.content));

// Repair one stored body. Pure, and idempotent: running it on an already-clean
// body returns the same blocks and reports no changes, which is what lets the
// Studio offer it on every row without a person having to know which rows need
// it.
export const repairBody = (blogBody) => {
  if (!Array.isArray(blogBody)) return { body: blogBody, renamed: [], changed: false };
  const renamed = [];
  const body = blogBody.map(b => {
    if (!isHeading(b)) return b;
    const to = LEGACY_HEADINGS[clean(b.content)];
    if (!to || to === clean(b.content)) return b;
    renamed.push({ from: clean(b.content), to });
    return { ...b, content: to };
  });
  return { body, renamed, changed: renamed.length > 0 };
};

// ── WHAT IS STILL WRONG AFTER THE FREE FIX ──────────────────────────
// Reported separately from the rename, and deliberately not merged into one
// "needs attention" flag, because the two cost wildly different amounts to put
// right and he is the one paying.
export const bodyProblems = (payload) => {
  const heads = headingsOf(payload?.blogBody);
  const problems = [];
  if (!heads.length) return problems;

  const legacy = heads.filter(h => LEGACY_HEADINGS[h]);
  if (legacy.length) {
    problems.push({
      kind: "legacy-heading",
      cost: "free",
      headings: [...new Set(legacy)],
      detail: `Renames to ${[...new Set(legacy.map(h => LEGACY_HEADINGS[h]))].join(" and ")}. No model call, no redraft.`,
    });
  }

  // The one a rename cannot solve. A row published before the reality-check
  // field existed has no verdict anywhere in it, and there is no honest way to
  // manufacture one out of the paragraphs that are there.
  if (!heads.some(h => /reality check/i.test(h))) {
    problems.push({
      kind: "no-reality-check",
      cost: "one field",
      detail: "Published before the Reality Check field existed. Needs real text, but only for that one field, not a full redraft.",
    });
  }

  // Anything this file has never heard of. The point is to report the real
  // state of his database rather than only the two headings I happened to know
  // about, since I cannot read the rows from here.
  const unknown = heads.filter(h =>
    !CURRENT_HEADINGS.includes(h) && !LEGACY_HEADINGS[h] && !DYNAMIC_HEADING.test(h));
  if (unknown.length) {
    problems.push({
      kind: "unknown-heading",
      cost: "look at it",
      headings: [...new Set(unknown)],
      detail: "Not a heading any current or known-old generator writes. Worth opening before touching.",
    });
  }
  return problems;
};

// ── "LEGOLAND IS OBVIOUSLY NOT A FREE ENTRANCE, BUT THE DRAFT IS FINE" ─
//
// Oliver, 27 Aug 2026, asking for "a sweep fix on all the free".
//
// That sentence is this file's whole thesis said back to me, which is why the
// sweep belongs here and not in a new one. The prose on those rows is good. The
// renderer that printed FREE over them was fixed this morning. What is left is
// ONE STORED FIELD on some number of rows, and the cost of putting it right is
// nothing like the cost of a redraft.
//
// ── AND THERE ARE TWO KINDS, WHICH COST THE SAME AND READ DIFFERENTLY ─
//
// utils/entryPrice.js already answers what a row says about its own door, and
// its three answers map straight onto what a person has to DO about each:
//
//   free true    it says free and means it. Nothing to do.
//   free false   it names a fare. Nothing to do.
//   free null    nobody has been told what entry costs — and this splits in two
//                by whether the row is SILENT or MISLEADING.
//
// Legoland is the misleading kind. Its ticket line reads "Children under 2:
// free entry", which is true, contains the word free, and says nothing about
// the 419 kroner everyone else pays. That is the row that produced the badge,
// and it is worse than an empty field because a person skimming it in Studio
// reads the word "free" and moves on.
//
// Only attractions. A restaurant with no ticket line is not missing anything,
// and a festival's price lives in its own fields.
const PRICED_TYPES = new Set(["free"]);

export const priceProblems = (payload, type) => {
  if (!PRICED_TYPES.has(String(type || ""))) return [];
  const { free, says } = entryPrice(payload);
  if (free !== null) return [];
  // A row with no ticket line at all has simply never been told. A row WITH one
  // that still cannot answer is telling the reader about somebody else.
  if (clean(says)) {
    return [{
      kind: "misleading-free",
      cost: "one field",
      says: clean(says),
      detail: `The ticket line says "${clean(says)}", which is about who gets in free rather than what entry costs. Reads as a free attraction at a glance. One field, no redraft.`,
    }];
  }
  return [{
    kind: "no-entry-price",
    cost: "one field",
    says: "",
    detail: "Nothing on this row says what entry costs, so the page says nothing about money. One field, no redraft.",
  }];
};

// ── AND WHETHER THE DOOR IS OPEN, WHICH NOTHING EVER ASKED ──────────
//
// Oliver, 1 Sep 2026: "What do we do about the 'free' and 'walk in no
// booking?" The booking half was a hardcoded chip with no field behind it (see
// entryBooking). Closing that means every existing row now says nothing about
// booking, which is honest and is also a hole in the product: a reader planning
// a summer day at AROS still needs to know it sells timed entry.
//
// Same shape as the price half deliberately, and for the reason that half
// states: this is "one field, not a redraft". It is listed separately from the
// price gaps because a row can know exactly what it costs and still never have
// been asked whether you can turn up.
//
// ONLY ATTRACTIONS. A craft workshop has carried a real bookingType since it
// was written and its card renders it; asking the question twice is how two
// answers start disagreeing.
export const bookingProblems = (payload, type) => {
  if (!PRICED_TYPES.has(String(type || ""))) return [];
  if (entryBooking(payload).walkIn !== null) return [];
  return [{
    kind: "no-booking-answer",
    cost: "one field",
    says: "",
    detail: "Nothing on this row says whether you can turn up or have to book, so the card says nothing either. One field, no redraft.",
  }];
};

// The whole picture in one call, so the Studio can say how big the job is
// instead of him finding these one at a time by browsing his own live site,
// which is how this one was found.
//
// `type` is passed to the price half because only attractions have a door. It
// was already on the row here and only the body half ever used it.
export const auditPublished = (rows) => {
  const list = (Array.isArray(rows) ? rows : [])
    .map(r => ({
      id: r?.id, name: r?.payload?.name || "(unnamed)", type: r?.type,
      problems: [...bodyProblems(r?.payload), ...priceProblems(r?.payload, r?.type), ...bookingProblems(r?.payload, r?.type)],
    }))
    .filter(r => r.problems.length > 0);
  const has = (k) => list.filter(r => r.problems.some(p => p.kind === k));
  return {
    rows: list,
    renameable: has("legacy-heading"),
    needWriting: has("no-reality-check"),
    unknown: has("unknown-heading"),
    misleadingFree: has("misleading-free"),
    noPrice: has("no-entry-price"),
    noBooking: has("no-booking-answer"),
    total: list.length,
  };
};

// One plain sentence for the Studio panel. Never says "all clear" when the only
// thing that ran was the free half.
export const describeAudit = (a) => {
  if (!a || a.total === 0) return "Every published entry uses the current structure.";
  const bits = [];
  if (a.renameable.length) bits.push(`${a.renameable.length} still on the old headings, fixable for free`);
  if (a.needWriting.length) bits.push(`${a.needWriting.length} with no Reality Check, which needs real text`);
  if (a.unknown.length) bits.push(`${a.unknown.length} with a heading nothing recognises`);
  // ── AND THE PRICE HALF, SAID SEPARATELY ─────────────────────────
  // Not folded into the sentence above, because that one is about entries that
  // predate the current structure and these do not. A row can be perfectly
  // modern and still never have been told what its door costs.
  const money = [];
  if (a.misleadingFree?.length) money.push(`${a.misleadingFree.length} whose ticket line names who gets in free but not what entry costs`);
  if (a.noPrice?.length) money.push(`${a.noPrice.length} that say nothing about entry at all`);
  // Its own sentence, not folded into the money one: "you can turn up" and
  // "it costs 150" are two different things a reader needs, and a row can have
  // one without the other.
  if (a.noBooking?.length) money.push(`${a.noBooking.length} that never say whether you can walk in or have to book`);
  const structural = bits.length
    ? `${bits.length && a.total ? `${a.renameable.length + a.needWriting.length + a.unknown.length} ` : ""}published entries predate the current structure: ${bits.join("; ")}.`
    : "";
  const priced = money.length ? `${money.join(", and ")}. Each is one field, not a redraft.` : "";
  return [structural, priced].filter(Boolean).join(" ") || "Every published entry uses the current structure.";
};

// ── THE LIST HE ACTUALLY WORKS FROM ─────────────────────────────────
// Names and what each row says today, so the sweep is a worklist rather than a
// count. Sorted misleading first: an empty field is a gap, and a field that
// reads as "free" at a glance is a wrong answer already on the site.
export const bookingWorklist = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map(r => ({ id: r?.id, name: r?.payload?.name || "(unnamed)", problems: bookingProblems(r?.payload, r?.type) }))
    .filter(r => r.problems.length > 0)
    .map(r => ({ id: r.id, name: r.name, kind: r.problems[0].kind, says: "" }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

export const priceWorklist = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map(r => ({ id: r?.id, name: r?.payload?.name || "(unnamed)", problems: priceProblems(r?.payload, r?.type) }))
    .filter(r => r.problems.length > 0)
    .map(r => ({ id: r.id, name: r.name, kind: r.problems[0].kind, says: r.problems[0].says }))
    .sort((a, b) => (a.kind === b.kind ? String(a.name).localeCompare(String(b.name)) : a.kind === "misleading-free" ? -1 : 1));
