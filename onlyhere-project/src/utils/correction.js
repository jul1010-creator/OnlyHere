// ── "Google AI says this is wrong. Correct it." ─────────────────────
// Oliver, 6 Aug 2026: "Is it possible to make an AI where I can write 'Google AI
// says this is wrong. Correct it.' So when we spot these mistakes, I don't need
// to make new drafts."
//
// Yes. This is that. Paste the criticism, get a patch.
//
// THREE RULES DECIDE THE WHOLE DESIGN, and all three come from things that
// already went wrong this week.
//
// 1. THE CRITICISM IS A LEAD, NOT A SOURCE. His own words, 6 Aug: "I've found
//    out that Gemini seems to not always be correct either." It has been wrong
//    twice in ways that would have made an entry WORSE: it insisted a ferry
//    crossing was 90 minutes when the operator's own timetable says 80, and it
//    called an unqualified "third-largest" claim an error when the figure was
//    right and only the measure was missing. So nothing is applied because a
//    model said it. Every claim is re-verified independently, and a claim that
//    fails verification is REJECTED with the evidence shown. A correction tool
//    that trusts its input is just a second way to publish someone else's
//    mistake.
//
// 2. TRANSPORT CLAIMS ARE SETTLED BY MEASUREMENT, NOT BY ASKING A MODEL. If a
//    claim is about a ferry, a route or a journey time, it goes to the
//    Directions API, not to Perplexity. A live route query is a fact; a model's
//    opinion about a route is a sentence. The Aarhus ferry claim in his document
//    is exactly this case, and it resolves in one API call.
//
// 3. ONLY THE CRITICISED FIELDS MAY CHANGE, AND THAT IS ENFORCED IN CODE. The
//    standing rule of this whole project: anything the system already knows must
//    be applied as code, never requested in a prompt. So the rewrite is asked to
//    touch only the named fields, and then every other field is compared against
//    the original and RESTORED if it moved. A model quietly "improving" an
//    untouched paragraph is how a correction turns into a redraft, which is the
//    exact thing he is trying to stop doing.
//
// What comes out is a patch plus a per-claim verdict list, for review before
// anything is saved. What you review is what you publish.

import { FERRY, classifyFerry } from "./transport";
import { hostMatchesName } from "./helpers";

// ── which claims can be settled without asking a model ──────────────
// Only two things here are settled by a live route query, and the line is
// drawn deliberately tight. Whether a ferry is required, and how long the
// journey takes, are both answers the Directions API gives directly. The NAME
// of a station is not: "Aarhus H" comes from DSB, not from a duration, and
// routing a name claim into a route probe would answer a different question
// confidently, which is the failure this whole file exists to prevent.
export const FERRY_WORDS = /\bferr(y|ies)|f(æ|ae)rge|\bcrossing\b|\bisland\b|\bbridge\b/i;
export const DURATION_WORDS = /travel ?time|journey time|\bduration\b|how long .{0,20}(take|journey|trip)|\bdrive time\b|\btravel duration\b/i;
export const WEBSITE_WORDS = /\bwebsite\b|\bofficial site\b|\bhomepage\b|\burl\b|\bdomain\b|\.dk\b|https?:\/\//i;
export const HOURS_WORDS = /opening hours?|\bopening times?\b|\bclosed on\b|\bopen from\b/i;

export const classifyClaim = (claim) => {
  const t = `${claim?.field || ""} ${claim?.says || ""} ${claim?.proposed || ""}`;
  // Order matters. A transport claim that happens to cite the operator's URL is
  // still a transport claim, so the measurable category is tested first.
  if (FERRY_WORDS.test(t) || DURATION_WORDS.test(t)) return "transport";
  if (WEBSITE_WORDS.test(t)) return "website";
  if (HOURS_WORDS.test(t)) return "hours";
  return "general";
};

// ── field resolution ────────────────────────────────────────────────
// A critic writes "the nearestStation field", "Nearest Station", "the station",
// or nothing at all. The patch has to land on a real key or the scope guard
// will simply revert it, so the hint is matched against the keys the entry
// actually has rather than trusted as given.
export const resolveField = (entry, hint) => {
  if (!entry || typeof entry !== "object" || !hint) return null;
  const keys = Object.keys(entry);
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const h = norm(hint);
  if (!h) return null;
  const exact = keys.find(k => norm(k) === h);
  if (exact) return exact;
  // "the nearestStation field" and "Nearest Station (At a Glance)" both contain
  // the key. Longest match wins so "ticketInfo" is not shadowed by "ticket".
  const contained = keys.filter(k => h.includes(norm(k)) || norm(k).includes(h));
  if (contained.length) return contained.sort((a, b) => norm(b).length - norm(a).length)[0];
  return null;
};

// Prose lives in blogBody and in the long narrative fields, and a critic almost
// never names those precisely. A claim that resolves to nothing is allowed to
// touch the prose fields only, never a glance field, because a glance field
// holding a guessed value is the failure mode this project keeps hitting.
export const PROSE_FIELDS = ["atmosphere", "whoItsFor", "realityCheck", "gemlyxFind", "desc", "blogBody", "intro", "body"];

// A claim reaches the patch step under one of two verdicts. "confirmed" means a
// primary source backed it. "asserted" means nothing settled it either way and
// Oliver supplied the value himself, so it is applied on his authority and
// labelled as such. See THE FOUNDER IS NOT GEMINI below for why that exists.
export const APPLIED_VERDICTS = new Set(["confirmed", "asserted"]);

export const allowedFieldsFor = (entry, claims) => {
  const out = new Set();
  for (const c of claims) {
    if (!APPLIED_VERDICTS.has(c.verdict)) continue;
    const f = resolveField(entry, c.field);
    if (f) out.add(f);
    else PROSE_FIELDS.forEach(p => { if (p in (entry || {})) out.add(p); });
  }
  // uncertainties is always writable: unresolved claims are recorded there, and
  // a claim that changed a field should stop being listed as unconfirmed.
  out.add("uncertainties");
  return [...out];
};

// ── the scope guard ─────────────────────────────────────────────────
// The part that makes this a correction rather than a redraft. Anything the
// rewrite changed outside the allowed set is put back, and the fact that it
// tried is reported rather than swallowed.
export const enforceScope = (original, patched, allowed) => {
  const out = { ...(patched || {}) };
  const reverted = [];
  const allow = new Set(allowed || []);
  const keys = new Set([...Object.keys(original || {}), ...Object.keys(patched || {})]);
  for (const k of keys) {
    if (allow.has(k)) continue;
    const before = JSON.stringify(original?.[k]);
    const after = JSON.stringify(out[k]);
    if (before === after) continue;
    reverted.push(k);
    if (k in (original || {})) out[k] = original[k];
    else delete out[k];
  }
  return { patched: out, reverted };
};

// ── splitting the criticism ─────────────────────────────────────────
// Deliberately a separate step from fixing. A pasted fact-check is prose with
// several claims in it, some right, some wrong, some already handled. Verifying
// them one at a time is what lets a single wrong claim be rejected without
// dragging the good ones down with it.
export const SPLIT_PROMPT = (entryJson, criticism, fieldList) => `Below is a published Gemlyx entry (JSON) and a piece of criticism about it, which may come from another AI, a reader, or the founder's own notes.

Break the criticism into SEPARATE, ATOMIC claims. One claim is one assertion that could be independently checked and turn out true or false. Do not merge two assertions, and do not invent claims the criticism does not make.

For each claim give:
- "field": the single JSON key it is about, chosen from this exact list where possible: ${fieldList.join(", ")}. Use "prose" if it is about the written paragraphs rather than a specific short field.
- "says": what the criticism asserts is wrong, in one plain sentence.
- "proposed": the corrected value or wording the criticism proposes, or an empty string if it only says something is wrong without saying what is right.
- "checkable": "yes" if this is a factual assertion (a name, number, date, route, URL, status), "no" if it is a matter of style, tone or opinion.

Respond with ONLY strict JSON: {"claims": [{"field": "...", "says": "...", "proposed": "...", "checkable": "yes"}]}

Entry:
${entryJson}

Criticism:
${criticism}`;

export const VERIFY_PROMPT = (name, claim) => `Check ONE factual claim about "${name}" in Denmark using real, current web search.

The claim: ${claim.says}${claim.proposed ? `\nThe correction proposed: ${claim.proposed}` : ""}

Rules for your answer, and they are strict:
- A PRIMARY SOURCE settles this. For an official site, opening hours, prices, programmes or dates that is the place's own website. For a ferry it is the operator's own timetable. Wikipedia, tourist boards and aggregators are supporting evidence, never the deciding one.
- If sources disagree, say so and name both, rather than silently picking one. An operator's own timetable page outranks its own marketing front page.
- If you cannot find a primary source, say so plainly. "Could not confirm" is a correct and useful answer here. Do not reason your way to a conclusion.

Respond with ONLY strict JSON:
{"verdict": "confirmed" | "rejected" | "unresolved", "correctValue": "the real verified value, or an empty string", "evidence": "one or two sentences on what the source actually says", "sourceUrl": "the primary source URL, or an empty string"}

"confirmed" means the criticism is right and the entry needs changing. "rejected" means the criticism is wrong and the entry is already correct, and your evidence must say why. "unresolved" means no primary source settled it.`;

export const PATCH_PROMPT = (entryJson, confirmed, allowed) => `Here is a published Gemlyx entry (JSON) and a list of corrections that have each been independently verified against a primary source.

Apply the corrections. Then stop.

Absolute rules:
- You may change ONLY these keys: ${allowed.join(", ")}. Every other key must come back byte-identical, same wording, same punctuation, same order.
- Do not improve, tighten, re-tone or re-order anything that is not listed above. This is a correction, not a rewrite. Any other edit will be automatically reverted, so it is wasted effort.
- Where a correction gives a real verified value, use that exact value.
- Never write an em dash or an en dash. Use a comma, a full stop, or a rephrase.
- A short At a Glance field takes a NAME or a VALUE, never a sentence, never advice to the reader, never a hedge. If the right value is unknown, leave it as an empty string.
- If applying a correction makes an existing sentence wrong, fix that sentence too, but only inside the keys listed above.

Corrections to apply:
${confirmed.map((c, i) => `${i + 1}. Field: ${c.field}. What was wrong: ${c.says}. The correct value: ${c.correctValue || c.proposed}. ${c.verdict === "asserted" ? "Given by the site's founder. Write it as stated, plainly and without hedging. Do not add \"reportedly\" or \"said to be\"." : `Source: ${c.sourceUrl || "verified by live routing data"}`}`).join("\n")}

Respond with ONLY the complete corrected JSON object, nothing before or after.

Entry:
${entryJson}`;

// ── transport verification, by measurement ──────────────────────────
// Injected `directions` is (origin, destination, mode, extra) => response, so
// the app passes its real fetch and the tests pass fixtures.
export const verifyTransportClaim = async (claim, entry, { directions, origin = "55.6761,12.5683" } = {}) => {
  const lat = entry?.__lat ?? entry?.lat, lon = entry?.__lon ?? entry?.lon;
  if (!directions || lat == null || lon == null) {
    return { verdict: "unresolved", evidence: "No stored coordinates for this entry, so the route could not be measured.", sourceUrl: "" };
  }
  const dest = `${lat},${lon}`;
  const isFerryClaim = /\bferr(y|ies)|f(æ|ae)rge|\bcrossing\b|\bisland\b|\bbridge\b/i.test(`${claim.says} ${claim.proposed}`);

  let base = null;
  try { base = await directions(origin, dest, "driving"); } catch { base = null; }
  if (!base || base.error) {
    return { verdict: "unresolved", evidence: `The routing API returned no driving route (${base?.error || "request failed"}), so this could not be settled by measurement.`, sourceUrl: "" };
  }

  if (isFerryClaim) {
    let avoid, probeRan = true;
    try { avoid = await directions(origin, dest, "driving", { avoid: "ferries" }); }
    catch { probeRan = false; avoid = undefined; }
    const verdict = classifyFerry({ base, avoid, probeRan });

    // What the criticism is asserting: either "a ferry is not needed here" or
    // "a ferry is needed here". The measurement answers both.
    const claimsNoFerryNeeded = /\bno (mandatory|required|necessary)\b|\bnot (an island|required|mandatory|needed|necessary)\b|\boptional\b|\bbridge\b|\bby road\b|\bnot a ferry\b|there is no .{0,20}ferry/i.test(`${claim.says} ${claim.proposed}`);

    if (verdict.status === FERRY.OPTIONAL) {
      return {
        verdict: claimsNoFerryNeeded ? "confirmed" : "rejected",
        correctValue: `Reachable by road${verdict.landDurationText ? ` in ${verdict.landDurationText}${verdict.landDistanceText ? ` (${verdict.landDistanceText})` : ""}` : ""}. The ferry is an optional shortcut, not a requirement.`,
        evidence: `Measured live: the same driving query with ferries banned still returns a road route${verdict.landDurationText ? ` of ${verdict.landDurationText}` : ""}, so there is a land connection and the ferry is optional.`,
        sourceUrl: "",
      };
    }
    if (verdict.status === FERRY.REQUIRED) {
      return {
        verdict: claimsNoFerryNeeded ? "rejected" : "confirmed",
        correctValue: "A ferry crossing is required, there is no road connection.",
        evidence: "Measured live: the same driving query with ferries banned returns no route at all, so no road reaches this place and the crossing is genuinely required.",
        sourceUrl: "",
      };
    }
    return { verdict: "unresolved", evidence: `The ferry check could not run (${verdict.probeError || "probe unavailable"}), so nothing is claimed either way.`, sourceUrl: "" };
  }

  // A duration claim. Google's own figure decides it, the same figure the
  // drafting pipeline uses, so a correction can never disagree with a fresh
  // draft of the same entry.
  return {
    verdict: "confirmed",
    correctValue: `${base.durationText} by car (${base.distanceText}) from Copenhagen`,
    evidence: `Measured live via the Directions API: ${base.durationText}, ${base.distanceText} by car from Copenhagen.`,
    sourceUrl: "",
  };
};

// Website claims lean on the same matcher the drafting pipeline uses, so the
// two can never disagree about what counts as a place's own domain.

// ── ONE BOX, NOT A FORM ─────────────────────────────────────────────
// Oliver, 6 Aug 2026: "Make it my personal Gemlyx."
//
// So it is not a Correction Panel with fields to fill in. It is a box you talk
// to about your own site, and it works out what you are asking for. Three
// things people actually type at a tool like this:
//
//   "Google AI says this is wrong. Correct it. <pasted fact-check>"  -> fix it
//   "is the ferry thing right on this one?"                          -> answer
//   "which ones need work?"                                          -> audit
//
// Routed deterministically, and deliberately so. A model deciding whether to
// EDIT YOUR PUBLISHED CONTENT or merely answer a question is a coin flip on
// something that must never be a coin flip, and the tell is unmissable: a
// correction message carries an instruction to change something, or it carries
// a pasted block of criticism. When it is genuinely unclear, this answers
// rather than edits, because the wrong guess in that direction costs a
// sentence and the wrong guess in the other direction costs an entry.
export const CORRECT_INTENT = /\b(correct|fix|change|update|amend|rewrite|redo|apply|patch)\b/i;
export const AUDIT_INTENT = /\b(which|what) (ones?|entries|towns|pages|are)\b|needs? (a )?(redraft|work|fixing)|worst|audit|scan (them|everything|all)/i;

// ── WHY THIS GOT REWRITTEN (Oliver, 7 Aug 2026) ─────────────────────
// "the AI assistant that is meant to put in the newly fact-checked things is
// not thaaat great... I would like to have an AI I can write to after the draft
// where I can say 'Fact-checkers say bla bla bla is wrong, and that really bla
// bla bla is true.'"
//
// The first version demanded an imperative verb. Run his own sentence through
// it and it routes to "ask", so the assistant discusses the fact-check instead
// of applying it. Five of six realistic correction messages did the same:
//
//   "The station is wrong. It should be Aarhus H."                    -> ask
//   "Google says the date is wrong, it is actually 25 August."        -> ask
//   "This says the ferry is required but that is not true."           -> ask
//
// Nobody types "correct it" every time. A correction is not an imperative, it
// is an ASSERTION: something is wrong, and here is what is right. Either half
// on its own is enough of a tell, because a person does not say "should be
// Aarhus H" to make conversation.
export const WRONG_HALF = /\b(wrong|incorrect|inaccurate|untrue|false|mistaken|a mistake|an error|errors?|not right|isn'?t right|not true|isn'?t true|not correct|doesn'?t exist|does not exist|misleading|misleads)\b/i;
export const RIGHT_HALF = /\b(should (be|say|read|actually)|shouldn'?t (be|say)|it'?s actually|is actually|actually is|actually,|\breally\b|in fact|in reality|the real |the correct |instead of|rather than|supposed to be)\b/i;

// A question is answered, never acted on, even when it is about something being
// wrong. Guessing "correct" on "is the ferry thing right?" would run a whole
// verification pass because he wondered aloud.
export const QUESTION = /^\s*(why|what|how|is|are|does|do|did|can|could|should|would|which|who|when|where|was|were|any|anything)\b|\?\s*$/i;

// ── "I would like to have Claude rewriting itself" ──────────────────
// Oliver, 7 Aug 2026: "I like that I can finally talk to an AI about the draft.
// But I would like to have Claude rewriting itself.. instead of me changing it."
//
// The correction pass above is a FACT-CHECKING pipeline. It splits criticism
// into atomic claims, checks each against a primary source, and patches only
// what a source backed. That is exactly right for "the station is wrong, it
// should be Aarhus H", and exactly useless for "this paragraph is too long".
// A style claim comes back from the splitter marked checkable:"no", nothing
// verifies it, nothing applies it, and he is left editing the JSON by hand.
//
// So there is a third thing a person can say to a draft, and it was missing:
//
//   correct  a claim about the WORLD.   "The date is wrong, it is 25 August."
//   edit     a claim about the WRITING. "This reads like an advert."
//   ask      a question.                "Why does it say the ferry is required?"
//
// An edit needs no verification, because nothing about reality is in dispute.
// What it needs instead is the opposite guard: A REWRITE MAY NOT CHANGE A FACT.
// That is the entire risk here. Ask for something shorter and a model will
// happily drop the price, round the year, or smooth "1 hour 20" into "about an
// hour", and it will read beautifully. Every number, date, price, URL and
// proper name in the original has to survive, and no new one may appear. See
// factsIn and factsPreserved below, which enforce it rather than request it.
const STYLE_WORDS = /\b(too (long|short|wordy|dry|formal|casual|salesy|generic|much)|wordy|clunky|boring|bland|dull|dry|stiff|salesy|markety|corporate|repetitive|repeats?|waffl|rambl|reads? like|sounds? like|feels? like|flows?|tone|voice|style|punchier|snappier|warmer|colder|plainer|simpler|shorter|longer|tighten|trim|cut|shorten|expand|reword|rephrase|make it more|make it less|less .{0,12}(formal|salesy|generic|wordy)|more .{0,12}(human|natural|direct|specific|concrete))\b/i;

// A rewrite instruction names an action on the TEXT. Kept separate from
// CORRECT_INTENT because "fix" and "change" belong to both worlds and only the
// company they keep tells them apart.
const EDIT_VERBS = /\b(rewrite|reword|rephrase|redraft|shorten|tighten|trim|cut|expand|punch up|polish|clean up|tidy)\b/i;

export const isEditRequest = (text) => {
  const t = String(text || "").trim();
  if (!t) return false;
  // A factual assertion is a correction even when it is phrased as a complaint
  // about the writing, because the fact is the thing that matters. "This is
  // wrong, it should say 25 August" is never an edit.
  if (RIGHT_HALF.test(t)) return false;
  return EDIT_VERBS.test(t) || STYLE_WORDS.test(t);
};

// ── A REWRITE MAY NOT CHANGE A FACT ─────────────────────────────────
// Everything a rewrite could quietly lose or invent, pulled out of the text so
// the two versions can be compared. Deliberately generous about what counts as
// a fact and deliberately blind to wording: the question is never "did this get
// rephrased", it is "did a number, a date, a price, a link or a name move".
// UNITS ARE LISTED LONGEST FIRST. Regex alternation takes the first branch that
// matches, so with "km|m|minutes" in that order "12 minutes" tokenises as
// "12 m" and a rewrite that turned it into "about an hour" reported the loss of
// something called "12 m". The verdict was right and the explanation was
// gibberish, which is its own kind of wrong when a person has to act on it.
const UNIT = "minutes?|mins?|hours?|hrs?|days?|weeks?|years?|kroner|dkk|kr|euros?|km|%|m";
const TIME = /\b\d{1,2}[:.]\d{2}\b/g;                       // 10:00, and 17.30
const NUMBER = new RegExp(`\\b\\d[\\d.,]*\\s?(?:${UNIT})?`, "gi");
const LINK = /https?:\/\/[^\s)"']+|\b[a-z0-9-]+\.(?:dk|com|org|net|eu)\b/gi;
const NAME = /\b[A-ZÆØÅ][\wÆØÅæøå-]+(?:\s+[A-ZÆØÅ][\wÆØÅæøå-]+)*/g;
// A phrase starting with one of these is a sentence beginning, not a name.
// Without this, "The Vikingeskibsmuseet is..." and "at the Vikingeskibsmuseet"
// are two different facts, and rephrasing around an article reads as losing a
// place. Stripped rather than rejected, so the place itself still counts.
const LEADING = /^(?:the|a|an|and|but|so|see|open|opens|it|its|this|that|in|at|on|for|from|to|of|is|was|there|here|you|your|we)\s+/i;

export const factsIn = (text) => {
  const t = String(text || "");
  const out = new Set();
  const times = t.match(TIME) || [];
  times.forEach(m => out.add(m.replace(".", ":")));
  // Times are removed before the number pass, or 10:00 also arrives as "10"
  // and "00" and every rephrasing looks like it moved a number.
  const withoutTimes = t.replace(TIME, " ");
  (withoutTimes.match(NUMBER) || [])
    .map(m => m.replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, "").toLowerCase())
    .filter(Boolean)
    .forEach(m => out.add(m));
  (t.match(LINK) || []).forEach(m => out.add(m.toLowerCase().replace(/[.,;:]+$/, "")));
  // ── A CAPITALISED WORD OPENING A SENTENCE IS NOT A NAME ────
  // Found by testing the edit path end to end on 8 Aug. The whoFor field read
  // "Anyone with an hour to spare around midday", and EVERY rewrite of it was
  // refused for "dropping anyone", because Anyone is capitalised, longer than
  // six letters and sits at the start of a sentence, so it counted as a proper
  // noun. Families, Visitors, Everyone and Sunday all do the same. That one
  // rule was quietly rejecting most honest rewrites of most fields.
  //
  // A single capitalised word only counts when it appears MID-SENTENCE, where
  // English has no other reason to capitalise it. A multi-word run still counts
  // anywhere, because "Roskilde Domkirke" is a name wherever it falls.
  for (const m of t.matchAll(NAME)) {
    const stripped = m[0].replace(LEADING, "").trim();
    if (!stripped) continue;
    const words = stripped.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      if (stripped.length < 6) continue;
      // What comes before it in the raw text, ignoring the whitespace.
      const before = t.slice(0, m.index).replace(/\s+$/, "");
      const opensSentence = before === "" || /[.!?:;]$/.test(before) || /^\s*[-*•]/.test(t.slice(0, m.index));
      if (opensSentence) continue;
    }
    out.add(stripped.toLowerCase());
  }
  return out;
};

// Returns what went missing and what appeared from nowhere. Empty on both
// counts is the only result that lets a rewrite through.
export const factsPreserved = (before, after, opts = {}) => {
  const a = factsIn(before), b = factsIn(after);
  const lost = [...a].filter(x => !b.has(x));
  // A NEW number or link is as bad as a lost one: it is an invention wearing
  // the clothes of an edit. New proper names are allowed, since a rewrite may
  // legitimately name a street the original described.
  //
  // `source`, when given, is the whole entry, and it widens what counts as
  // already known. A rewrite may move a fact between fields; it may not conjure
  // one the entry has never contained.
  const known = opts.source ? factsIn(opts.source) : a;
  const invented = [...b].filter(x => !a.has(x) && !known.has(x) && /\d|https?:|\.(dk|com|org|net|eu)\b/i.test(x));
  return { ok: lost.length === 0 && invented.length === 0, lost, invented };
};

export const EDIT_PROMPT = (fieldName, current, instruction, voice) => `Rewrite ONE field of a Gemlyx travel entry, following the founder's instruction about how it is written.

FIELD: ${fieldName}

CURRENT TEXT:
${typeof current === "string" ? current : JSON.stringify(current, null, 2)}

WHAT HE ASKED FOR:
${instruction}

THE ONE RULE THAT OUTRANKS HIS INSTRUCTION: every fact stays exactly as it is. Every number, price, date, duration, opening time, place name, street, venue and web address must survive the rewrite unchanged, and you may not introduce a single one that is not already there. If following the instruction fully would mean dropping a fact, keep the fact and follow the instruction as far as it will go. This is checked automatically afterwards and a rewrite that loses a fact is thrown away, so there is nothing to gain by guessing.

${voice || ""}

Reply with ONLY the rewritten text for that one field. No preamble, no explanation, no quotation marks around it, no markdown fences.${Array.isArray(current) ? " The field is a list, so reply with a JSON array of the same shape and the same number of items." : ""}`;

// ── "OR TALKING TO AN AI THAT ARE ABLE TO DO TINY CHANGES WITH THEM ALL" ──
// Oliver, 8 Aug 2026. The sentence has two halves and the second one is the
// whole request: not one entry, all of them.
//
// A correction is about THIS row. A sweep is about a column. The tell is that
// he names a set rather than a thing, and it has to be caught before the
// correction router sees it, because "every town that is inside a bigger city
// should say so" trips RIGHT_HALF ("should say") and would otherwise run a
// fact-checking pass on whatever single entry happened to be open.
//
// A wrong guess here is cheap in the safe direction: the sweep intent produces
// a confirmation card and nothing else. Nothing runs, nothing is written, and
// no row is read until he presses the button on it.
export const SWEEP_INTENT = /\b(?:all|every|each)\s+(?:the\s+)?(?:published\s+|single\s+|other\s+)?(?:ones?|entr(?:y|ies)|towns?|places?|pages?|rows?|guides?|cit(?:y|ies)|villages?)\b|\ball of them\b|\bthem all\b|\bacross (?:the board|everything|all entries|all of them)\b|\bin bulk\b|\bevery single one\b/i;

// ── THE CHAT MAY SELECT A SWEEP. IT MAY NOT INVENT ONE ──────────────
// This is the line that keeps the chat door safe, and it is worth stating
// plainly because the obvious design does the opposite.
//
// It would be easy to have the model return {fields: ["whatever"]} and run it.
// That would work, and it would quietly walk around the one rule protecting
// this whole feature: a sweep may only write a field shapeForLive already
// carries, asserted in tests against the REGISTRY. A sweep invented in a chat
// message has never been near that assertion, so it could write a field that
// renders perfectly and is silently dropped the next time that row is
// redrafted. That is the 8 Aug bug with a three-week fuse on it.
//
// So the model's entire job here is to pick an id out of a list, or say none of
// them fit. An id that is not in the registry is treated as none.
export const SWEEP_PROMPT = (registry, message) => `The founder of a Danish travel site said this about his published content:

"${message}"

Below are the bulk changes his Studio knows how to make. Each one fills specific fields on many published entries at once.

${registry.map(s => `id: ${s.id}\n  what it does: ${s.blurb}\n  fields it may touch: ${s.fields.join(", ")}`).join("\n\n")}

Which one, if any, is he asking for? Match on what the change would actually DO, not on shared words.

If none of them is what he means, answer null. That is a normal answer and it is better than a near miss: running the wrong bulk change over seventy entries is expensive, and he has no way to know it was the wrong one from the name alone.

Reply with ONLY this JSON:
{"sweep": "the id, or null", "why": "one plain sentence saying what you think he wants, in his own terms"}`;

export const routeMessage = (text) => {
  const t = String(text || "").trim();
  if (!t) return "ask";
  if (AUDIT_INTENT.test(t) && !CORRECT_INTENT.test(t)) return "audit";
  // Before edit and correct: a sentence naming a SET is not a claim about the
  // open entry, however much it reads like one.
  if (SWEEP_INTENT.test(t)) return "sweep";
  // An explicit instruction wins over everything, including a question mark:
  // "why is this wrong? fix it" is an instruction with a preamble.
  // An edit is checked BEFORE the correction intent, because "rewrite", "fix"
  // and "change" live in both vocabularies and only the rest of the sentence
  // separates them. isEditRequest already refuses anything that asserts a fact.
  if (isEditRequest(t) && !WRONG_HALF.test(t)) return "edit";
  if (CORRECT_INTENT.test(t)) return "correct";
  if (QUESTION.test(t)) return "ask";
  if (WRONG_HALF.test(t) || RIGHT_HALF.test(t)) return "correct";
  // A long paste with no instruction is a fact-check dropped in whole. That is
  // still a correction request, it just did not come with a covering sentence.
  if (t.length > 400 && /\b(wrong|incorrect|inaccurate|error|should be|actually|resolved|verify)\b/i.test(t)) return "correct";
  return "ask";
};

// The one-tap escape hatch for everything the router still answers instead of
// acting on. When a message reads like it MIGHT be a correction, the reply
// carries a "Correct it" button, so a wrong guess costs a tap and never a
// retype. This is the safe direction to be wrong in: answering is free.
export const offersCorrection = (text) => {
  const t = String(text || "").trim();
  if (!t || routeMessage(t) !== "ask") return false;
  return WRONG_HALF.test(t) || RIGHT_HALF.test(t) || t.length > 200;
};

// The read-only half. Answers about an entry from the entry itself plus its
// audit, never from the model's own memory of Denmark, because a confident
// answer sourced from nowhere is what this whole tool exists to stop.
// ── THE HANDOFF MARKER ─────────────────────────────────────────────
// Oliver, 7 Aug 2026: "the assistant that is ready on blogs and what not are
// about questions only. And if it can't answer, then perplexity will quickly
// research to answer the question."
//
// The entry stays the FIRST source, because it is the thing that was actually
// fact-checked. This marker is how the answering step says "I genuinely do not
// have this" in a way code can act on, instead of the caller trying to detect
// a hedge in prose. The two kinds of answer are never blended afterwards: an
// answer from the entry is quiet about its origin, an answer from a live search
// announces itself and carries its sources, so a reader can always tell which
// one they are holding.
export const NOT_IN_ENTRY = "NOT_IN_ENTRY";

export const ASK_PROMPT = (entryJson, auditText, question) => `You are Gemlyx Studio's own assistant, answering the founder about ONE published entry.

Answer ONLY from the entry below and its automated audit. Never fill a gap from general knowledge, and never state a Danish fact the entry does not contain: this tool exists because unsourced confidence is the problem.

IF THE ENTRY DOES NOT CONTAIN THE ANSWER, reply with exactly ${NOT_IN_ENTRY} followed by one short sentence naming what is missing, and nothing else. Do not apologise, do not guess, and do not answer anyway from what you happen to know. Something else will go and look it up. Getting this wrong in the other direction is the expensive mistake: answering from memory is how a fact nobody checked ends up on the page.

Be short. No preamble, no restating the question. Never use an em dash or an en dash.

If the honest answer is that something looks wrong and should be corrected, say so and say which field.

Entry:
${entryJson}

Automated audit of this entry:
${auditText || "No findings."}

Question:
${question}`;

// The lookup that runs when the entry genuinely does not have it. Scoped hard to
// the one gap, because this is a reader waiting for an answer, not a research
// pass: a broad prompt here would take ten seconds and come back with an essay.
export const LOOKUP_PROMPT = (name, question, gap) => `Using real, current web search, answer this specific question about ${name || "this place"} in Denmark.

Question: ${question}
${gap ? `What is missing: ${gap}\n` : ""}
Be short and concrete: the answer, and nothing else. Prefer the venue's own site, the organiser, or an official transport or tourism source over an aggregator. If you cannot confirm it, say exactly that rather than offering a likely answer.`;

// The whole pass. `deps` is injected so this file stays testable and has no
// knowledge of App.jsx's component state.
export const correctEntry = async ({ entry, criticism, deps }) => {
  const { askClaude, askPerplexity, parseJSON, directions, onStage } = deps || {};
  const stage = (label, percent) => { try { onStage?.({ label, percent }); } catch { /* UI only */ } };
  const name = entry?.name || "this entry";
  const entryJson = JSON.stringify(entry, null, 2);

  // 1. split
  stage("Reading the criticism", 10);
  const fieldList = Object.keys(entry || {}).filter(k => !k.startsWith("__"));
  const splitRaw = await askClaude(SPLIT_PROMPT(entryJson, criticism, fieldList), 4096, "claude-sonnet-5", true);
  if (splitRaw?.error) throw new Error(splitRaw.error);
  const split = await parseJSON(splitRaw.text, 4096);
  let claims = Array.isArray(split?.claims) ? split.claims : [];
  if (claims.length === 0) throw new Error("No specific claims could be read out of that text.");

  // 2. verify, one at a time, each by the right instrument
  const verified = [];
  for (let i = 0; i < claims.length; i++) {
    const c = claims[i];
    stage(`Verifying claim ${i + 1} of ${claims.length}`, 20 + Math.round((i / claims.length) * 55));
    const kind = classifyClaim(c);

    if (c.checkable === "no") {
      // Style and tone are not facts, so there is nothing to verify. They are
      // applied on the founder's say-so, because it is his voice.
      verified.push({ ...c, kind, verdict: "confirmed", correctValue: c.proposed || "", evidence: "A wording or tone change, applied as asked rather than fact-checked.", sourceUrl: "" });
      continue;
    }

    if (kind === "transport") {
      const r = await verifyTransportClaim(c, entry, { directions });
      verified.push({ ...c, kind, ...r });
      continue;
    }

    const res = await askPerplexity(VERIFY_PROMPT(name, c));
    if (res?.error || !res?.text) {
      verified.push({ ...c, kind, verdict: "unresolved", evidence: "The verification search could not run.", sourceUrl: "" });
      continue;
    }
    let parsed = null;
    try { parsed = await parseJSON(res.text, 2048); } catch { parsed = null; }
    if (!parsed || !parsed.verdict) {
      verified.push({ ...c, kind, verdict: "unresolved", evidence: (res.text || "").slice(0, 300), sourceUrl: "" });
      continue;
    }
    // A "confirmed" with no source is not confirmed. This is the whole
    // difference between a lead and a fact, and it is enforced here rather
    // than hoped for in the prompt. Website claims are exempt only when the
    // domain is literally the name, which is checked below.
    const hasSource = !!String(parsed.sourceUrl || "").trim();
    const selfEvidentUrl = kind === "website" && hostMatchesName(parsed.correctValue || c.proposed, name);
    const verdict = parsed.verdict === "confirmed" && !hasSource && !selfEvidentUrl ? "unresolved" : parsed.verdict;
    verified.push({
      ...c, kind, verdict,
      correctValue: parsed.correctValue || "",
      evidence: verdict === "unresolved" && parsed.verdict === "confirmed"
        ? `The check agreed with the criticism but gave no primary source, so nothing was changed. ${parsed.evidence || ""}`.trim()
        : (parsed.evidence || ""),
      sourceUrl: parsed.sourceUrl || (selfEvidentUrl ? (parsed.correctValue || c.proposed) : ""),
    });
  }

  // ── THE FOUNDER IS NOT GEMINI (Oliver, 7 Aug 2026) ─────────────────
  // Rule 1 at the top of this file, that criticism is a lead and not a source,
  // was written about a MODEL's criticism, and it is still right about that.
  // Applied to Oliver himself it produced a tool that ignored him: he types
  // "really it is X", no primary source turns up, the claim lands as unresolved
  // and NOTHING CHANGES. Handoff 6 records the opposite of that instinct,
  // "he is right more often than the fact-checker is", with the Samso ferry as
  // the case in point.
  //
  // So silence no longer blocks him, but evidence still overrules him:
  //   rejected   a source actively CONTRADICTS the claim. Never applied. This
  //              is the protection that caught Gemini's 90-minute ferry, and it
  //              is untouched.
  //   unresolved nothing settled it either way. If he supplied a value, it is
  //              applied on his authority as "asserted", labelled in the verdict
  //              list, in uncertainties and in __corrections, so it is never
  //              mistaken later for something a source confirmed.
  //   unresolved with no value supplied. Still changes nothing, because there
  //              is nothing to write.
  const asserted = [];
  for (const v of verified) {
    if (v.verdict !== "unresolved") continue;
    const value = String(v.proposed || "").trim();
    if (!value) continue;
    v.verdict = "asserted";
    v.correctValue = value;
    v.evidence = `Applied on your word. Nothing contradicted it, and no primary source confirmed it either. ${v.evidence || ""}`.trim();
    asserted.push(v);
  }

  const confirmed = verified.filter(v => v.verdict === "confirmed");
  const rejected = verified.filter(v => v.verdict === "rejected");
  const unresolved = verified.filter(v => v.verdict === "unresolved");
  const applying = [...confirmed, ...asserted];

  if (applying.length === 0) {
    return { claims: verified, confirmed, rejected, unresolved, asserted, patched: null, changed: [], reverted: [], unchangedReason: "Nothing was confirmed, and nothing came with a value to apply, so the entry was left exactly as it is." };
  }

  // 3. patch, scoped
  stage("Applying the corrections", 82);
  const allowed = allowedFieldsFor(entry, applying);
  const patchRaw = await askClaude(PATCH_PROMPT(entryJson, applying, allowed), 8192, "claude-sonnet-5", true);
  if (patchRaw?.error) throw new Error(patchRaw.error);
  const candidate = await parseJSON(patchRaw.text, 8192);
  if (!candidate || typeof candidate !== "object") throw new Error("The correction came back unreadable.");

  // 4. enforce
  stage("Checking nothing else moved", 92);
  const { patched, reverted } = enforceScope(entry, candidate, allowed);

  // 5. record what happened, in the payload itself
  const at = new Date().toISOString().slice(0, 10);
  patched.__corrections = [
    ...(Array.isArray(entry?.__corrections) ? entry.__corrections : []),
    ...applying.map(c => ({
      at,
      field: resolveField(entry, c.field) || c.field,
      was: c.says,
      // An asserted value must never read later like a sourced one. This line
      // is what a future audit or handoff sees, so it says plainly whose word
      // it is standing on.
      source: c.verdict === "asserted"
        ? "asserted by the founder, not source-verified"
        : (c.sourceUrl || "live routing measurement"),
    })),
  ];
  // Unresolved claims do not change a word, but they are not thrown away
  // either. They go where the next reviewer will actually see them.
  if (unresolved.length || asserted.length) {
    patched.uncertainties = [
      ...(Array.isArray(patched.uncertainties) ? patched.uncertainties : []),
      ...unresolved.map(u => `Raised in a correction pass and NOT changed, because no primary source settled it: ${u.says}`),
      // An applied-on-authority value is still an open item, not a closed one.
      // It belongs in front of the next reviewer exactly like an unresolved
      // claim does, or "applied because Oliver said so" quietly becomes
      // indistinguishable from "verified" a month from now.
      ...asserted.map(a => `Applied from your own correction and still UNCONFIRMED by a primary source: ${a.field} is now "${a.correctValue}". Worth a source when one turns up.`),
    ];
  }

  const changed = Object.keys(patched).filter(k => JSON.stringify(patched[k]) !== JSON.stringify(entry?.[k]));
  return { claims: verified, confirmed, rejected, unresolved, asserted, patched, changed, reverted, allowed };
};

// ── THE REWRITE PASS ────────────────────────────────────────────────
// Oliver: "I would like to have Claude rewriting itself.. instead of me
// changing it."
//
// Deliberately NOT routed through correctEntry. That pipeline's whole shape is
// split, verify, patch what a source backed, and a style instruction has
// nothing for a source to say about it. Running one through it means three API
// calls that all conclude "not checkable" and a draft that comes back
// untouched, which is exactly what has been happening.
//
// This is the other half: no verification, because no fact is in dispute, and
// in its place a hard guard that no fact MOVED. Claude does the writing, as it
// does everywhere in this project.
// ── WHAT AN EDIT IS ALLOWED TO TOUCH ────────────────────────────────
// Found in the same test run: "rename nothing, just tighten the writing"
// resolved to the `name` field, because resolveField matches a key as a
// substring of the instruction and "rename" contains "name". "make it less
// stereotypical" contains "type". "See the price" contains "price". Every short
// key in the schema is a word fragment of ordinary English, so an editorial
// instruction could rewrite an entry's identity, its category, or a glance
// value that is supposed to be a verified fact.
//
// An edit is for PROSE. Anything a resolver comes back with that is not a
// writing field is treated as if it resolved to nothing, which falls through to
// the prose fields the entry actually has.
export const EDITABLE_FIELDS = new Set([
  "desc", "intro", "body",
  "special", "whoFor", "whoItsFor", "whoItsForText", "realityCheck",
  "atmosphere", "whatToDo", "gettingThereReality", "characterAndFit",
  "howItsMade", "vibeLocation", "afterDark", "beforeDark", "bestTime",
  "whenEnter", "highlight", "gemlyxFind", "thingsToKnow", "accommodationTip",
]);

export const editEntry = async ({ entry, instruction, deps }) => {
  const { askClaude, voice, onStage } = deps || {};
  const stage = (label, percent) => { try { onStage?.({ label, percent }); } catch { /* UI only */ } };
  if (!entry || typeof entry !== "object") return { error: "There is no draft open to rewrite." };

  // WHICH FIELD. Named explicitly if he named it, otherwise the prose fields
  // this entry actually has. Never a glance field by accident: "make it
  // shorter" must not be allowed to rewrite nearestStation into something
  // prettier, because a glance field is a value and not a sentence.
  stage("Working out what to rewrite", 15);
  const resolved = resolveField(entry, instruction);
  // NAMING A FACT FIELD IS A REFUSAL, NOT A FALLBACK. The first version let it
  // fall through to the prose fields, so "shorten the ticketsGlance" quietly
  // rewrote the description instead. Rewriting something the person did not ask
  // about is worse than doing nothing, and it is the kind of wrong that only
  // gets noticed after it is published.
  if (resolved && !EDITABLE_FIELDS.has(resolved)) {
    return { error: `"${resolved}" holds a verified value, not writing, so a style note is the wrong tool for it. Correct it instead, for example: the ${resolved} is wrong, it should be X.` };
  }
  const named = resolved || null;
  // BUG 4: blogBody was in the fallback list. It is an array of {type, text}
  // blocks that the publish step BUILDS from the prose fields, so rewriting it
  // from a style instruction reshapes the rendered article and is then thrown
  // away at publish. Never a target.
  const targets = named
    ? [named]
    : PROSE_FIELDS.filter(f => f !== "blogBody" && EDITABLE_FIELDS.has(f) && f in entry && entry[f] != null && entry[f] !== "");
  if (targets.length === 0) {
    return { error: resolved
      ? `"${resolved}" is a fact field, not writing, so I will not rewrite it from a style note. Correct it instead, for example: the ${resolved} is wrong, it should be X.`
      : "I could not tell which part you meant. Name the field, for example \"rewrite the realityCheck\"." };
  }

  const patched = { ...entry };
  const changed = [];
  const refused = [];

  for (let i = 0; i < targets.length; i++) {
    const field = targets[i];
    const current = entry[field];
    if (current == null) continue;
    // AN EMPTY FIELD IS THE POINT, NOT A REASON TO SKIP. This used to `continue`
    // on an empty string, so asking for a reality check on an entry that has
    // none did nothing at all and reported nothing. That is now the single most
    // common thing to ask for, since four types only just gained the field.
    const writingFresh = current === "" || (Array.isArray(current) && current.length === 0);
    stage(`${writingFresh ? "Writing" : "Rewriting"} ${field}`, 20 + Math.round((i / targets.length) * 70));

    const res = await askClaude(EDIT_PROMPT(field, current, instruction, voice), 1400);
    if (res?.error || !res?.text) { refused.push({ field, reason: "the rewrite call failed" }); continue; }

    let next = res.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    if (Array.isArray(current)) {
      try { next = JSON.parse(next); } catch { refused.push({ field, reason: "the rewrite came back in the wrong shape for a list" }); continue; }
      if (!Array.isArray(next)) { refused.push({ field, reason: "the rewrite came back in the wrong shape for a list" }); continue; }
    } else {
      next = next.replace(/^["']|["']$/g, "");
    }

    // THE GUARD. A rewrite that lost a price or invented a year is thrown away
    // and SAID SO, rather than quietly kept because it reads better.
    const beforeText = typeof current === "string" ? current : JSON.stringify(current);
    const afterText = typeof next === "string" ? next : JSON.stringify(next);
    // Writing an empty field has nothing to preserve, so the question changes
    // from "did a fact move" to "did a fact come from nowhere". The rest of the
    // entry is the allowed source: moving a price out of ticketsGlance and into
    // the prose is fine, inventing one is not.
    // LOST is measured against the field, INVENTED against the whole entry.
    // Moving a price out of ticketsGlance and into the prose is a legitimate
    // edit; conjuring one that appears nowhere in the entry is not. Measuring
    // invention against the field alone refused "mention the price in the
    // description", which is a perfectly reasonable thing to ask for.
    const check = writingFresh
      ? factsPreserved(afterText, afterText, { source: JSON.stringify(entry) })
      : factsPreserved(beforeText, afterText, { source: JSON.stringify(entry) });
    if (!check.ok) {
      refused.push({
        field,
        reason: check.lost.length
          ? `the rewrite dropped ${check.lost.slice(0, 3).join(", ")}`
          : `the rewrite invented ${check.invented.slice(0, 3).join(", ")}`,
      });
      continue;
    }
    if (afterText.trim() === beforeText.trim()) continue;   // nothing to report

    patched[field] = next;
    changed.push(field);
  }

  stage("Done", 100);
  return { patched, changed, refused, targets };
};
