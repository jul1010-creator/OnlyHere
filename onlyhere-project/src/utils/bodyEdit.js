// ── EDITING A PUBLISHED ENTRY BY HAND ───────────────────────────────
//
// Oliver, 13 Aug 2026: "Can you make the studio able to go into the blog itself
// and edit? I know that might be a massive work.. but that would make it easier
// for anyone helping me."
//
// It is not massive, and it is worth saying why rather than just saying so.
// savePlaceEdit already merges a patch into a published payload, PATCHes it to
// Supabase, updates the local list and handles auth and errors. repairBody
// already walks blogBody and rewrites blocks. blogBody is a flat array of
// simple blocks. Everything underneath an editor exists; there has just never
// been an editor.
//
// ── THE FIRST TIME "A PUBLISHED ROW IS DATA" IS GOOD NEWS ───────────
// That sentence is the fourth standing rule and it has been a problem every
// time it has come up: fixing a writer does not fix what it already wrote, so
// every content fix has needed a repair path. Here it is the whole feature. The
// row is data, so a person can change it, and nothing has to be re-run.
//
// ── AND THE REAL WORK IS NOT THE TEXTAREA ───────────────────────────
// A redraft passes tracePrices, the absence gate, glanceLeak, the dash strip
// and the AI-tell scan. A typed edit passes NONE of them, and that path is the
// one being opened up to other people. So the free deterministic gates run on
// what was typed, and they WARN rather than block: he chose that deliberately,
// and it is the right call, because a person fixing a real error should not be
// stopped by a rule that cannot see why. What the checks said is recorded on
// the row either way, so a save that ignored a warning is legible afterwards.
//
// PROSE ONLY, and that is a structural guarantee rather than a UI convention.
// applyBodyEdits can change the TEXT of a block and can never change its type,
// its position, or how many there are. So the heading rules, the reality-check
// requirement and the image layout stay exactly as the pipeline left them, and
// bodyProblems cannot start firing because somebody deleted a block by hand.

import { stripDashesDeep, scanForAITells, fillerWordCounts } from "./helpers";
import { bodyProblems } from "./publishedRepair";
import { pricesIn } from "./entryAudit";

// The three a person may rewrite. Deliberately NOT image, video or instagram: a
// caption is a credit and a src is a file that has to exist, and neither is
// prose. An unknown type is left alone rather than guessed at, because a block
// shape added later must not become editable by accident.
export const EDITABLE_TYPES = ["paragraph", "heading", "bullets"];

// A block with no type is a paragraph. That is not a nicety: DetailPage's own
// layout code reads `b.type === "paragraph" || b.type === undefined`, so an
// editor that skipped them would refuse to touch some of the oldest entries.
export const typeOf = (b) => (b && b.type ? b.type : "paragraph");
export const isEditable = (b) => EDITABLE_TYPES.includes(typeOf(b));

// Bullets hold an array, everything else holds a string. One reader and one
// writer, so no call site has to know which it is holding.
export const blockText = (b) => {
  if (!b) return "";
  if (typeOf(b) === "bullets") return (Array.isArray(b.items) ? b.items : []).join("\n");
  return String(b.text ?? "");
};

export const withBlockText = (b, text) => {
  const t = String(text ?? "");
  if (typeOf(b) === "bullets") {
    // Blank lines are dropped, because an empty bullet renders as a dot with
    // nothing beside it and bodyProblems already counts that as a fault.
    return { ...b, items: t.split("\n").map(s => s.trim()).filter(Boolean) };
  }
  return { ...b, text: t };
};

// Every block, with its index and whether a person may edit it. The
// uneditable ones are RETURNED rather than filtered out, so the panel can show
// the whole entry in its real order and a person can see what sits between the
// paragraphs instead of editing a list that does not look like the page.
export const editableBlocks = (blogBody) =>
  (Array.isArray(blogBody) ? blogBody : []).map((b, i) => ({
    i, type: typeOf(b), editable: isEditable(b), text: blockText(b), block: b,
  }));

// ── THE ONLY WAY TEXT GETS IN ───────────────────────────────────────
// `edits` is a map of index to new text. Anything else about the body is
// carried through untouched, and an edit naming an index that is not editable,
// or is not there at all, is IGNORED rather than applied or thrown on: a stale
// panel sending an index that has since become an image must not corrupt a row.
//
// Dashes are stripped on the way in, which is his standing rule and the one a
// human editor is most likely to break, because a person typing a sentence
// reaches for an em dash without thinking about it. Same function the loader
// runs over every published row, so the two cannot disagree.
export const applyBodyEdits = (blogBody, edits = {}) => {
  const src = Array.isArray(blogBody) ? blogBody : [];
  return src.map((b, i) => {
    if (!Object.prototype.hasOwnProperty.call(edits, i)) return b;
    if (!isEditable(b)) return b;
    const next = withBlockText(b, stripDashesDeep(String(edits[i] ?? "")));
    return blockText(next) === blockText(b) ? b : next;
  });
};

// Did anything actually change. Compared on the TEXT rather than by identity,
// so a panel that rebuilt its state without the person typing does not produce
// a save, and an empty save does not stamp an edit record on a row.
export const bodyChanged = (before, after) => {
  const a = editableBlocks(before), b = editableBlocks(after);
  if (a.length !== b.length) return true;
  return a.some((x, i) => x.text !== b[i].text || x.type !== b[i].type);
};

export const changedIndexes = (before, after) => {
  const a = editableBlocks(before), b = editableBlocks(after);
  return a.filter((x, i) => b[i] && x.text !== b[i].text).map(x => x.i);
};

// ── WHAT THE FREE GATES SAY ABOUT WHAT WAS TYPED ────────────────────
// Every one of these is deterministic, costs nothing and runs on the edited
// text alone. They are the subset of the draft gates that do not need the
// research pages, because by definition those are gone: the entry was published
// and nothing was re-fetched. That limit is stated rather than hidden, and it
// is the reason for the price warning below.
export const bodyEditProblems = (payload, nextBody) => {
  const out = [];
  const next = { ...(payload || {}), blogBody: nextBody };
  const before = editableBlocks(payload?.blogBody);
  const after = editableBlocks(nextBody);

  // Structure first, because it is the one thing this editor promises cannot
  // break. If it ever reports something, the guarantee has failed and that
  // matters more than anything in the prose.
  if (before.length !== after.length) {
    out.push({ severity: "critical", detail: `The body went from ${before.length} blocks to ${after.length}. This editor is not allowed to add or remove blocks, so something is wrong and the save should not go through.` });
  }
  try {
    (bodyProblems(next) || []).forEach(p => out.push({ severity: "high", detail: p.detail }));
  } catch { /* a malformed body must not stop a person saving a typo fix */ }

  const changed = after.filter((x, i) => before[i] && x.text !== before[i].text);
  const typed = changed.map(x => x.text).join("\n");
  if (!typed.trim()) return out;

  // ── A PRICE TYPED BY HAND CANNOT BE TRACED ────────────────────────
  // tracePrices compares a figure against the pages the draft was written from,
  // and after publication those are gone. So a new price is not checked here
  // and CANNOT be, and the honest thing is to say so rather than let it through
  // in the same silence as a comma.
  const added = pricesIn(typed).filter(p => p.currency);
  const had = new Set(pricesIn(before.map(b => b.text).join("\n")).filter(p => p.currency).map(p => `${p.lo}-${p.hi}`));
  const fresh = added.filter(p => !had.has(`${p.lo}-${p.hi}`));
  if (fresh.length) {
    out.push({
      severity: "high",
      detail: `This edit adds a price (${fresh.map(p => `${p.lo}${p.hi !== p.lo ? ` to ${p.hi}` : ""} ${String(p.currency).toUpperCase()}`).join(", ")}) and nothing here can check it. The pages this entry was written from are not fetched again on an edit, so a typed figure is only as good as whoever typed it. Redraft the entry if you want it traced.`,
    });
  }

  // The voice rules, on the typed text only. Running them over the whole entry
  // would report faults the person did not introduce and cannot be expected to
  // fix, which is how a warning panel becomes something everybody dismisses.
  try {
    const tells = scanForAITells(typed) || [];
    if (tells.length) out.push({ severity: "low", detail: `Reads like AI writing: ${tells.slice(0, 3).map(t => (typeof t === "string" ? t : t.phrase || t.word)).filter(Boolean).join(", ")}.` });
  } catch { /* the scan is advisory and must never block a save */ }
  try {
    const filler = Object.entries(fillerWordCounts(typed) || {}).filter(([, n]) => n > 0);
    if (filler.length) out.push({ severity: "low", detail: `Filler words: ${filler.map(([w, n]) => `${w} (${n})`).join(", ")}.` });
  } catch { /* same */ }
  return out;
};

// ── WHO CHANGED WHAT, ON THE ROW ────────────────────────────────────
// A __ field, so it cannot reach a reader: shapeForLive is an allow-list and
// DetailPage renders named fields, so neither can print this. It exists so that
// a save which ignored a warning is legible afterwards, which is the whole
// difference between warning and blocking being an acceptable choice.
//
// Kept to the last twenty, because an edit log that grows forever is a payload
// that grows forever and this one rides along on every fetch of the row.
export const MAX_EDIT_LOG = 20;

export const stampEdit = (payload, { by = "", blocks = [], problems = [], at = "" } = {}) => ({
  ...(payload || {}),
  __edited: [
    ...((payload?.__edited || []).slice(-(MAX_EDIT_LOG - 1))),
    {
      at: at || new Date().toISOString(),
      by: String(by || "unknown").slice(0, 120),
      blocks,
      // The COUNT and the worst severity, not the sentences. The sentences are
      // in the panel at the moment of saving, where they can be acted on; on
      // the row what matters later is whether anything was overridden.
      warned: problems.length,
      worst: problems.length ? problems.map(p => p.severity)
        .sort((a, b) => ["critical", "high", "medium", "low"].indexOf(a) - ["critical", "high", "medium", "low"].indexOf(b))[0] : null,
    },
  ],
});

// ── AND SOMEBODY ELSE MAY HAVE SAVED WHILE THIS WAS OPEN ────────────
// savePlaceEdit's own comment says it: sending the whole payload back
// overwrites anything written between load and save, and that panel holds a
// copy that is already seconds old when it opens. A prose editor is open for
// MINUTES, and the reason this feature exists is that more than one person will
// be using it.
//
// So the row is re-read immediately before the write and compared. Compared on
// the BODY rather than the whole payload deliberately: a background job that
// stamped __checked or fixed a coordinate has not touched the prose and must
// not throw away somebody's paragraph.
export const bodyConflict = (openedWith, current) => {
  const a = editableBlocks(openedWith), b = editableBlocks(current);
  if (a.length !== b.length) return { conflict: true, why: "the entry gained or lost a block while this was open" };
  const moved = a.filter((x, i) => b[i] && x.text !== b[i].text).map(x => x.i);
  if (moved.length) return { conflict: true, why: `somebody else changed ${moved.length === 1 ? "a paragraph" : `${moved.length} paragraphs`} while this was open`, blocks: moved };
  return { conflict: false, why: "" };
};
