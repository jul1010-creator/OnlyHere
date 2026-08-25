// ── FOUND, WRITTEN DOWN, AND DELETED ────────────────────────────────
//
// Oliver's Limfjord guide, 26 Aug 2026. The run log, step 14:
//
//   The guide's logistics, against its own legs  [google · empty · discarded]
//   "This suggests a bus for the last leg, and the last leg was MEASURED at
//    1 minute on foot from Kongernes Jelling. A walk that short is the
//    connection. Say the walk, or say nothing."
//
// That is HIS OWN RULE, from 12 August: "make a rule, tell it that less than 10
// minutes walk will never be suggested public transport or taxi?" It is
// SHORT_WALK_MINUTES in utils/journey.js. The gate ran, measured the leg, caught
// the violation, and wrote it into `planProblems`.
//
// `_planProblems` then has exactly one consumer in the whole app, in
// GuidePage's save path, and it DELETES it:
//
//   payload: (({ _testProfile, _testPlan, _planProblems, ...rest }) => rest)(guide)
//
// The strip is correct — these are notes in the pipeline's own voice and they
// were being sent to every browser that opened a shared link. What is not
// correct is the comment above it, written the same day and never resolved:
//
//   "Nothing renders them, so this is not a display leak"
//
// Nothing renders them. So a guide build finds real, checkable problems in the
// finished guide and the only thing that ever touches them throws them away, and
// the guide ships with the error in it.
//
// ── WHAT THIS DOES AND DELIBERATELY DOES NOT DO ─────────────────────
//
// It does not repair. titlePromises has the repair shape — claim, check, repair,
// and accept the rewrite ONLY if it actually fixed the thing — and a repair pass
// here would be the right next step. This is the step before it: a finding that
// is visible is a finding somebody can act on, and a finding that is invisible
// has cost the same to produce and is worth nothing.
//
// Shown only while the guide is UNSAVED, which needs no permission check: the
// save path strips the field, so a shared guide never carries one and a reader
// who was sent a link cannot see it. The person looking at an unsaved guide is
// the person who just built it.

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// The findings arrive as strings from most gates and as objects from checkPlan,
// which has its own shape. Both, or a mixed list, and never "[object Object]".
export const problemText = (p) => {
  if (typeof p === "string") return clean(p);
  if (!p || typeof p !== "object") return "";
  return clean(p.why || p.problem || p.text || p.message || "");
};

export const problemList = (guide) =>
  (Array.isArray(guide?._planProblems) ? guide._planProblems : [])
    .map(problemText).filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i);

// The heading. Says the number and says what kind of thing it is, because "3
// issues" could be anything and this is specifically the pipeline disagreeing
// with the guide it just wrote.
export const problemHeading = (n) =>
  n === 1
    ? "One thing the checks caught in this guide"
    : `${n} things the checks caught in this guide`;

// AND WHAT IT MEANS, which is the part that decides whether he acts. These are
// not warnings about the world. They are the pipeline's own measurements
// disagreeing with its own prose, which is the only kind of problem this app can
// be certain about.
export const PROBLEM_NOTE =
  "These come from this run's own measurements, not from a model's opinion, so each one is checkable. They are not saved with the guide and nobody you share it with sees them.";
