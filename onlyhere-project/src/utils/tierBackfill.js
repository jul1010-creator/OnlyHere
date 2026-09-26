// ── FORTY-SIX ATTRACTIONS WITH NO TIER ──────────────────────────────
//
// Oliver, 25 Sep 2026: "I just realised.. there is no tier.. on our
// attractions.." Then, when the first answer was to flag all of them in the
// audit tray: "Much of this is correct.. but this will take forever to
// independently edit."
//
// He is right. The tray is how a gap is FOUND, and it is the wrong shape for a
// backfill: forty-six cards each saying "update the real entry by hand" is an
// evening of opening and closing one editor. The tray still catches the
// forty-seventh attraction next month when everybody has forgotten this ran.
//
// ── SO IT IS A SWEEP, AND NOT A SCREEN OF ITS OWN ───────────────────
//
// sweeps.js already holds the only safe bulk-write path this app has: a
// proposal table nothing escapes, a snapshot that gates the write, a re-read of
// every row immediately before it is written, and a refusal to overwrite a
// field that filled in while the table sat on screen. A second screen would be
// a second write path, and gemlyx_content has no versioning to forgive one.
//
// ── ONE PASS OVER ALL OF THEM, NOT FORTY-SIX PASSES ─────────────────
//
// What this file adds is the one thing a sweep could not do. Every other sweep
// asks its question of one row at a time, which is right for a fact: what kind
// of place Ribe is does not depend on Ravnsborggade.
//
// A tier is not a fact, it is a RANKING, and TIER_RULE says so in its own
// words: "MOST PLACES ARE NOT AT THE TOP. A country has a handful of Can't Miss
// Out places, not one per region." Forty-six separate calls cannot honour that,
// because each one sees a single attraction and every attraction is somebody's
// favourite: asked alone, most places come back near the top. Asked together,
// the model has to spend a scale it can see the whole of.
//
// So the whole set goes in one prompt and the whole set comes back ranked
// against itself. It is also cheaper: forty-six short entries is one ordinary
// request rather than forty-six.
//
// ── AND NOTHING HERE WRITES ANYTHING ────────────────────────────────
//
// This file proposes and validates. sweeps.js turns that into a table and
// App.jsx writes it, only after a snapshot is on his disk. The publishing is
// his, as it is everywhere else.

import { TIERS, TIER_VALUES, TIER_RULE, tierOf } from "./placeThemes";
// The app's one Danish comparator, not a second call to localeCompare here: two
// sorters is how one A to Z list disagrees with another about where Æ goes.
import { daCompare } from "./helpers";

const clean = (s) => String(s ?? "").trim();
const fold = (s) => clean(s).toLowerCase();

// ── WHICH ROWS THIS IS FOR ──────────────────────────────────────────
//
// tierOf, not a check for an empty string, and the difference is a real set of
// rows: a stored tier of "Amazing" matches nothing on the scale, so tierLabel
// already refuses to print it and the card shows no rank at all. A field that
// is full of something no reader will ever see needs this pass exactly as much
// as an empty one does.
export const needsTier = (entry) => !tierOf(entry);

// ── SORTING, WHICH HE ASKED TO BE ABLE TO SWITCH ────────────────────
//
// Oliver, 25 Sep 2026: "both should be able to get filtered. But make default
// alphabetic."
//
// Alphabetical is for working down the list and knowing where you are. By tier
// is for the question a row-by-row list cannot answer: whether the top of the
// scale has been handed out too freely. TIERS is already in rank order, so the
// grouping reads top-down without a second table saying which is higher.
export const BACKFILL_SORTS = [
  { key: "name", label: "A to Z" },
  { key: "tier", label: "By tier" },
];
export const BACKFILL_SORT_DEFAULT = "name";

// A sweep proposal, not a shape of this file's own: { name, patch, before }.
// The proposed value if there is one, otherwise whatever is already stored, so
// a row nothing could answer sorts by what a reader would see today rather than
// vanishing to the bottom under a value it does not have.
export const proposedTier = (prop) => clean(prop?.patch?.tier) || clean(prop?.before?.tier);

const rankOf = (value) => {
  const i = TIERS.findIndex(t => t.value === clean(value));
  return i < 0 ? TIERS.length : i;          // unranked sinks to the bottom
};

export const sortForBackfill = (props, sort = BACKFILL_SORT_DEFAULT) => {
  const list = (Array.isArray(props) ? props : []).filter(Boolean);
  const byName = (a, b) => daCompare(a?.name, b?.name);
  if (sort !== "tier") return [...list].sort(byName);
  // Name inside the tier, so a group is still a list somebody can find a row in
  // rather than database order wearing a heading.
  return [...list].sort((a, b) => (rankOf(proposedTier(a)) - rankOf(proposedTier(b))) || byName(a, b));
};

// ── AND THE SHAPE OF THE WHOLE SCALE, AT A GLANCE ───────────────────
//
// The one thing the row list cannot show however it is sorted. TIER_RULE's
// warning is about the DISTRIBUTION, so this is a number per tier or the rule
// is unenforceable by eye: four "Can't Miss Out" out of forty-six is a scale,
// nineteen is decoration.
export const tierSpread = (props) => {
  const list = (Array.isArray(props) ? props : []).filter(Boolean);
  const out = TIERS.map(t => ({ value: t.value, label: t.label, mark: t.mark, count: 0 }));
  let unset = 0;
  for (const p of list) {
    const i = TIERS.findIndex(t => t.value === proposedTier(p));
    if (i < 0) unset += 1; else out[i].count += 1;
  }
  return { tiers: out, unset, total: list.length };
};

// ── WHAT THE PASS IS ASKED ──────────────────────────────────────────
//
// TIER_RULE carries the meanings and the "most places are not at the top"
// discipline, so it is handed over whole rather than summarised: a second
// wording of a rule that already exists is the two-readers failure this
// codebase keeps paying for.
//
// The entries go in with their OWN published words. A tier is a judgement about
// the place, and the entry is what Gemlyx has already said about it, so judging
// from anything else would be judging a different place.
export const backfillPrompt = (entries) => {
  const list = (Array.isArray(entries) ? entries : []).filter(e => clean(e?.name));
  if (!list.length) return "";
  // ── NOTHING AFTER THE NAME, WHICH COST A WHOLE RUN ──────────────
  //
  // Oliver, 26 Sep 2026, on the first live pass: forty-six rows, every one of
  // them "The pass ranked the others and left this one out", and every count
  // zero.
  //
  // This line listed each entry as "Amalienborg Slot (Copenhagen)" and the
  // schema asked for "exactly the name as given below". So the model did as it
  // was told and returned the name WITH the bracket, readBackfill looked up
  // "amalienborg slot (copenhagen)" against a set keyed on "amalienborg slot",
  // and all forty-six picks were dropped as rows nobody asked about.
  //
  // The same bracket trap townKeyFor was bitten by earlier the same day, in a
  // different file, for the same reason: a parenthetical is part of the string
  // and nothing about the string says so.
  //
  // Fixed on BOTH sides, deliberately. Here the town moves onto its own line
  // so the name stands alone and the instruction is literally true. In
  // readBackfill the bracket is stripped anyway, because a model that adds one
  // back must not be able to cost another run.
  const body = list.map((e, i) => {
    const parts = [clean(e.desc), clean(e.whoFor), clean(e.realityCheck)].filter(Boolean);
    const where = clean(e.city) ? `\nWhere: ${clean(e.city)}` : "";
    return `${i + 1}. ${clean(e.name)}${where}\n${parts.join(" ")}`;
  }).join("\n\n");
  return `${TIER_RULE}

Below are ${list.length} attractions Gemlyx publishes, with what it already says about each one. Give every one of them a tier.

RANK THEM AGAINST EACH OTHER, not one at a time. You can see the whole set, which is the point: asked alone almost any of these would come back near the top, and a scale where everything is near the top tells a reader nothing. Spend the top tier the way the rule above says, on a handful.

Judge each one on the words below and nothing else. If what is written about a place does not carry it, that is the answer: a place you happen to know is famous is not thereby better described.

These are all free to enter, so cost is not part of the judgement. The question is only how far out of their way somebody should go.

Respond with ONLY strict JSON: {"picks": [{"name": "the attraction name exactly as it appears after the number below, and nothing else: no town, no brackets, no numbering", "tier": "EXACTLY one of: ${TIER_VALUES.join(" / ")}", "why": "one short sentence, under 20 words, saying what decided it. Never restate the tier, never praise the place, say the thing that settled it"}]}

${body}`;
};

// ── AND WHAT COMES BACK IS NOT TRUSTED ──────────────────────────────
//
// Matched by name against what was SENT, because a model that invents a row or
// renames one must not be able to put a tier on an attraction nobody asked
// about. A tier outside the closed list is dropped rather than coerced: an
// unrecognised rank is the data problem tierOf already refuses to paper over,
// and writing one would leave the row exactly as unreadable as it is now.
//
// First answer wins. A model that lists the same place twice has contradicted
// itself, and the later line is not more considered than the earlier one.
// A trailing parenthetical is not part of a name. "Amalienborg Slot
// (Copenhagen)" and "Amalienborg Slot" are one place, and the difference
// between them cost a whole run of forty-six rows on 26 Sep 2026.
const bare = (s) => fold(s).replace(/\s*\([^()]*\)\s*$/, "").trim();

export const readBackfill = (answer, entries) => {
  const known = new Map();
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!clean(e?.name)) continue;
    // Keyed both ways, so a model that answers with the bracket and one that
    // answers without it both land on the same row. The VALUE is the entry's
    // own key, so what comes out is always Gemlyx's spelling.
    known.set(fold(e.name), e);
    known.set(bare(e.name), e);
  }
  const picks = Array.isArray(answer?.picks) ? answer.picks : [];
  const out = new Map();
  for (const p of picks) {
    const said = fold(p?.name);
    const key = known.has(said) ? said : (known.has(bare(said)) ? bare(said) : "");
    if (!key || out.has(fold(known.get(key)?.name))) continue;
    const tier = clean(p?.tier);
    if (!TIER_VALUES.includes(tier)) continue;
    // Filed under the entry's OWN name, never the one the model typed, so the
    // per-row lookup in sweeps.js finds it however the answer was spelled.
    out.set(fold(known.get(key).name), { tier, why: clean(p?.why) });
  }
  return out;
};

// The ones the pass did not answer for, NAMED rather than counted, because the
// number alone tells him nothing he can act on and these rows are the ones
// still his to fill in by hand.
export const missedByPass = (entries, proposals) =>
  (Array.isArray(entries) ? entries : [])
    .filter(e => clean(e?.name) && !proposals?.has?.(fold(e.name)))
    .map(e => clean(e.name));

// ── THE ONE CALL ────────────────────────────────────────────────────
//
// Injected, not imported: this module stays pure enough to test without a
// network, and the caller already owns the model client. Returns a Map keyed by
// the lowercase name, which is what the sweep's per-row loop looks itself up in.
//
// Every failure returns an EMPTY map rather than throwing. A whole-set pass
// that cannot run leaves forty-six rows unresolved, which the proposal table
// already knows how to say out loud; a throw would lose the run and the reason
// for it together.
// ── THE ONE CALL ────────────────────────────────────────────────────
//
// There was a proposeTiers here that returned just the Map, and once the sweep
// started reading the reason as well it had no caller left. A wrapper nobody
// calls is the dead export this repository's own suite refuses, so it went
// rather than being kept for symmetry.

// ── AND WHY NOTHING CAME BACK, WHEN NOTHING DID ─────────────────────
//
// Oliver, 26 Sep 2026, on the first live run: forty-six rows, every one
// reading "The pass ranked the others and left this one out", every count
// zero. That sentence is TRUE of a row the pass skipped and a lie about a run
// that never produced an answer at all, and the screen could not tell them
// apart because this file returned the same empty Map for both.
//
// A refusal carries its reason: this codebase's own rule, stated in sweeps.js
// and broken here. So the pass reports what happened, and the panel can say
// "the ranking failed" instead of accusing the model of declining forty-six
// times.
export const PASS_FAILED = {
  none: "",
  noReply: "The ranking pass got no answer back. Nothing was written and nothing is lost: run it again.",
  badJson: "The ranking pass answered, and the answer was not readable JSON. Nothing was written. Run it again.",
  noMatches: "The ranking pass answered, and not one of its names matched a published attraction, so none of it could be used. That is a fault in the pass rather than in the rows.",
};

// The same call, and what went wrong with it. Kept beside proposeTiers rather
// than folded into it because the sweep's whole-set hook wants a Map and this
// wants a sentence, and one function returning both is how a caller ends up
// checking the wrong half.
export const proposeTiersWithReason = async ({ entries, deps = {} }) => {
  const { askClaude, parseJSON } = deps;
  const list = (Array.isArray(entries) ? entries : []).filter(e => clean(e?.name));
  if (!list.length || !askClaude) return { picks: new Map(), why: PASS_FAILED.none };
  const prompt = backfillPrompt(list);
  if (!prompt) return { picks: new Map(), why: PASS_FAILED.none };
  const room = Math.max(2000, list.length * 90);
  const res = await askClaude(prompt, room, "claude-sonnet-5", true);
  if (res?.error || !res?.text) return { picks: new Map(), why: PASS_FAILED.noReply };
  let parsed = null;
  try { parsed = parseJSON ? await parseJSON(res.text) : JSON.parse(res.text); } catch { parsed = null; }
  if (!parsed) return { picks: new Map(), why: PASS_FAILED.badJson };
  const picks = readBackfill(parsed, list);
  // ANSWERED AND MATCHED NOTHING is the case that cost the run, and it is its
  // own fault with its own sentence: the rows were fine and the names were
  // not.
  if (!picks.size) return { picks, why: PASS_FAILED.noMatches };
  return { picks, why: PASS_FAILED.none };
};
