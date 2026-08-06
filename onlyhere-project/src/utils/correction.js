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

export const allowedFieldsFor = (entry, claims) => {
  const out = new Set();
  for (const c of claims) {
    if (c.verdict !== "confirmed") continue;
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

Verified corrections:
${confirmed.map((c, i) => `${i + 1}. Field: ${c.field}. What was wrong: ${c.says}. The verified correct value: ${c.correctValue || c.proposed}. Source: ${c.sourceUrl || "verified by live routing data"}`).join("\n")}

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

export const routeMessage = (text) => {
  const t = String(text || "").trim();
  if (!t) return "ask";
  if (AUDIT_INTENT.test(t) && !CORRECT_INTENT.test(t)) return "audit";
  if (CORRECT_INTENT.test(t)) return "correct";
  // A long paste with no instruction is a fact-check dropped in whole. That is
  // still a correction request, it just did not come with a covering sentence.
  if (t.length > 400 && /\b(wrong|incorrect|inaccurate|error|should be|actually|resolved|verify)\b/i.test(t)) return "correct";
  return "ask";
};

// The read-only half. Answers about an entry from the entry itself plus its
// audit, never from the model's own memory of Denmark, because a confident
// answer sourced from nowhere is what this whole tool exists to stop.
export const ASK_PROMPT = (entryJson, auditText, question) => `You are Gemlyx Studio's own assistant, answering the founder about ONE published entry.

Answer ONLY from the entry below and its automated audit. If the answer is not in there, say plainly that the entry does not say, and say what would settle it. Never fill a gap from general knowledge, and never state a Danish fact the entry does not contain: this tool exists because unsourced confidence is the problem.

Be short. No preamble, no restating the question. Never use an em dash or an en dash.

If the honest answer is that something looks wrong and should be corrected, say so and say which field.

Entry:
${entryJson}

Automated audit of this entry:
${auditText || "No findings."}

Question:
${question}`;

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

  const confirmed = verified.filter(v => v.verdict === "confirmed");
  const rejected = verified.filter(v => v.verdict === "rejected");
  const unresolved = verified.filter(v => v.verdict === "unresolved");

  if (confirmed.length === 0) {
    return { claims: verified, confirmed, rejected, unresolved, patched: null, changed: [], reverted: [], unchangedReason: "Nothing was confirmed, so the entry was left exactly as it is." };
  }

  // 3. patch, scoped
  stage("Applying the confirmed corrections", 82);
  const allowed = allowedFieldsFor(entry, confirmed);
  const patchRaw = await askClaude(PATCH_PROMPT(entryJson, confirmed, allowed), 8192, "claude-sonnet-5", true);
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
    ...confirmed.map(c => ({ at, field: resolveField(entry, c.field) || c.field, was: c.says, source: c.sourceUrl || "live routing measurement" })),
  ];
  // Unresolved claims do not change a word, but they are not thrown away
  // either. They go where the next reviewer will actually see them.
  if (unresolved.length) {
    patched.uncertainties = [
      ...(Array.isArray(patched.uncertainties) ? patched.uncertainties : []),
      ...unresolved.map(u => `Raised in a correction pass and NOT changed, because no primary source settled it: ${u.says}`),
    ];
  }

  const changed = Object.keys(patched).filter(k => JSON.stringify(patched[k]) !== JSON.stringify(entry?.[k]));
  return { claims: verified, confirmed, rejected, unresolved, patched, changed, reverted, allowed };
};
