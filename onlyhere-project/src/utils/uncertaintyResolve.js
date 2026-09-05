// ── A CAVEAT THAT HAS BEEN SETTLED ──────────────────────────────────
//
// Oliver, 5 Sep 2026, pasting a checker's own words back: it had found that an
// uncertainty on the Jelling festival draft was WRONG. Physical ticket sales at
// Byens Hus on 1 October, 10:00 to 18:00, are stated on the operator's own
// Billet-info page, quoted in Danish, with the URL. He asked what happens to it.
//
// Nothing happened to it, at three separate layers.
//
//   The prompt told the checker not to confirm: "ONLY report things that are
//   actually WRONG, unverifiable, or missing, do not restate or confirm anything
//   that's already correct."
//
//   There was no CONFIRMED label, so `label || UNVERIFIED` filed his
//   confirmation as UNVERIFIED, which is the precise opposite of what it said.
//
//   And nothing writes a fact check back into the draft anyway: googleAICheck
//   ends at setGoogleCheckResult, and fixFactCheckWithClaude never mentions
//   uncertainties.
//
// So the entry would publish with a caveat sitting beside the fact that
// disproves it. glanceExtract.js already wrote the reason that is worse than it
// sounds: a false caveat teaches a reader the caveats are decoration.
//
// ── WHAT MAY REMOVE ONE ─────────────────────────────────────────────
//
// Two conditions, and a confirmation has to pass BOTH.
//
//   THE DOMAIN. The operator's own site, or a public authority. Not a listing,
//   not an aggregator, not a search engine's summary of one. The reason is not
//   snobbery about sources: an uncertainty was raised because a fact could not
//   be confirmed, so what clears it has to be at least as strong as what would
//   have been accepted when the draft was written. The blocked list is
//   sourcePolicy's own, read rather than copied, because a second copy of a rule
//   this codebase already holds is its most expensive recurring habit.
//
//   THE SENTENCE. The page has to be quoted. This is the half worth insisting
//   on. glanceExtract sets the precedent: it removes a caveat that has GONE
//   FALSE, which is a checkable state rather than a judgement. A checker that
//   cannot produce the sentence has not settled anything, it has only asserted
//   that it looked.
//
// Passing one and not the other does not clear the caveat and does not leave it
// untouched either: it SOFTENS it, from "could not be verified" to "supported
// by X, not confirmed on the operator's own page". A middle state, because
// forcing every case into keep or kill is how a rule this strict starts getting
// worked around.
//
// ── AND WHERE THE REMOVED LINE GOES ─────────────────────────────────
//
// Out of `uncertainties`, into `__corrections`, with the URL, the quotation and
// the date. Not struck through on the page. A reader is not the audience for
// the checking, which this codebase has already said twice in its own words:
// entryAudit refuses a field that "reads as a note about the checking rather
// than as writing", and correction.js says it again. A struck-through caveat is
// a page arguing with itself in front of a traveller.
//
// The audit trail is the right instinct and `__corrections` is where it already
// lives. A month from now the question is not "was there once a doubt", it is
// "what cleared it, and on whose authority".
import { isNeverASource, normaliseDomain } from "./sourcePolicy";
import { hostMatchesName } from "./helpers";
import { fold } from "./danishNames";

// ── PUBLIC AUTHORITIES ──────────────────────────────────────────────
//
// Danish state and municipal bodies, and nothing that merely sounds official. A
// kommune publishing its own opening hours is as good as the operator; a
// destination company that is publicly funded is not the same thing and is
// deliberately absent, because "publicly funded" is not a fact about whether the
// page was written by the people who know.
const AUTHORITY = [
  /(?:^|\.)[a-z-]+kommune\.dk$/i,
  /(?:^|\.)kommune\.dk$/i,
  /(?:^|\.)borger\.dk$/i,
  /(?:^|\.)virk\.dk$/i,
  /(?:^|\.)dst\.dk$/i,
  /(?:^|\.)slks\.dk$/i,
  /(?:^|\.)kulturarv\.dk$/i,
  /(?:^|\.)naturstyrelsen\.dk$/i,
  /(?:^|\.)danmarksnationalparker\.dk$/i,
  /(?:^|\.)dataforsyningen\.dk$/i,
  /(?:^|\.)retsinformation\.dk$/i,
  /(?:^|\.)dsb\.dk$/i,
  /(?:^|\.)rejseplanen\.dk$/i,
];

export const OPERATOR = "operator";
export const AUTHORITY_SOURCE = "authority";
export const WEAK = "weak";

// How strongly a page can speak about this place. `ownSite` is the entry's own
// recorded website when it has one, which is a stronger test than the name
// matching the domain and is checked first for that reason.
export const settlingStrength = (url, { name = "", ownSite = "" } = {}) => {
  const u = String(url || "").trim();
  if (!u || isNeverASource(u)) return WEAK;
  const host = normaliseDomain(u);
  if (!host) return WEAK;
  // ── AND A FACEBOOK PAGE IS ALREADY REFUSED, ABOVE ─────────────────
  //
  // Plenty of small Danish venues record a facebook.com page as their website,
  // so this line looks like it needs an isNeverOwnSite guard beside it: without
  // one, a recorded Facebook site would match itself and a Facebook post could
  // settle a caveat the operator's real page never confirmed.
  //
  // It was written that way and mutation showed the guard could not fire. For
  // `host === own` to hold with a blocked `own`, the CITED url has to be on that
  // same blocked domain, and isNeverASource has already refused it two lines up.
  // A branch that cannot fire is reassurance rather than a rule, so it is gone
  // and the reasoning is here instead, to stop it being written back.
  const own = normaliseDomain(ownSite);
  if (own && host === own) return OPERATOR;
  if (name && hostMatchesName(u, name)) return OPERATOR;
  return AUTHORITY.some(re => re.test(host)) ? AUTHORITY_SOURCE : WEAK;
};

// ── READING WHAT THE CHECKER WROTE ──────────────────────────────────
//
// The shape is dictated rather than guessed at, the same way
// INVENTED_CHECK_FORMAT dictates its own: this is read by code and not by a
// person, so the checker is told exactly what to write.
export const CONFIRM_FORMAT = `CONFIRMED: <the uncertainty this settles, in enough words to recognise it>
QUOTE: "<the sentence from the page, copied exactly, in its own language>"
SOURCE: <the full URL of the page you read it on>`;

const QUOTE_RE = /["“”«»‘’]([^"“”«»‘’]{12,})["“”«»‘’]/;
const URL_RE = /(https?:\/\/[^\s)>\]]+)/i;

export const readConfirmation = (text) => {
  const t = String(text || "");
  const quote = (QUOTE_RE.exec(t) || [])[1] || "";
  const url = (URL_RE.exec(t) || [])[1] || "";
  // Everything before the quotation is what the confirmation is ABOUT. The
  // checker is asked to describe the uncertainty it settles, and this is that
  // description with the label and the machinery stripped off it.
  const head = t
    .replace(/^\s*[-*]?\s*\**\s*CONFIRMED\b[:\s-]*/i, "")
    .split(/\bQUOTE\b\s*:|["“«‘]/)[0]
    .replace(URL_RE, "")
    .trim();
  return { says: head, quote: quote.trim(), url: url.replace(/[.,;)]+$/, "") };
};

// ── WHICH LINE IT SETTLES ───────────────────────────────────────────
//
// A confirmation names the uncertainty it is about in its own words, so the
// match is on the distinctive words the two share. Short and common words are
// dropped, because "the note stating that the price" overlaps with every
// uncertainty ever written and would settle all of them.
//
// The bar is deliberately high. A confirmation that matches nothing is reported
// rather than applied to the closest line: removing the wrong caveat is a worse
// outcome than removing none, and it is invisible afterwards.
// ── NOT distinctiveWords ────────────────────────────────────────────
//
// danishNames.js already exports a function by that name and it does a DIFFERENT
// job: it strips generic PLACE words (gade, museum, hall) so two names for one
// town can be matched. This strips generic SENTENCE words, so a claim can be
// matched to the caveat it settles. Two jobs, and giving them one name is worse
// than duplicating either, because the collision reads as a reuse.
//
// The folding IS shared, from that file, so "Byens Hus" and "byens hus" are the
// same words here as everywhere else and a Danish letter cannot split a match.
const STOP = new Set(["the", "and", "that", "this", "with", "from", "for", "was", "were", "not",
  "could", "confirmed", "verified", "uncertainty", "note", "stating", "says", "said", "page",
  "official", "site", "wrong", "which", "there", "have", "has", "any", "its", "but", "are"]);
export const claimWords = (text) =>
  [...new Set(fold(text).match(/[a-z0-9][a-z0-9:.-]{2,}/g) || [])]
    .filter(w => !STOP.has(w));

export const MIN_SHARED_WORDS = 3;

export const matchingUncertainty = (says, uncertainties) => {
  const want = claimWords(says);
  if (want.length < MIN_SHARED_WORDS) return -1;
  const list = Array.isArray(uncertainties) ? uncertainties : [];
  let best = -1, bestScore = 0;
  list.forEach((u, i) => {
    const have = new Set(claimWords(u));
    const score = want.filter(w => have.has(w)).length;
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return bestScore >= MIN_SHARED_WORDS ? best : -1;
};

// ── AND WHAT IT DOES TO THE DRAFT ───────────────────────────────────
//
// Returns a NEW payload. Nothing here mutates what it was handed, because the
// caller shows the before and after side by side and a mutation would make the
// two identical.
export const softenedLine = (line, url) =>
  `${String(line || "").trim().replace(/\s*$/, "")} Since noted: supported by ${normaliseDomain(url) || "another page"}, and not confirmed on the operator's own site.`;

export const resolveUncertainties = (payload, confirmations, { name = "", ownSite = "", at = "" } = {}) => {
  const before = Array.isArray(payload?.uncertainties) ? payload.uncertainties.map(String) : [];
  const list = (Array.isArray(confirmations) ? confirmations : []).map(readConfirmation);
  const lines = [...before];
  const removed = [], softened = [], ignored = [];
  const corrections = [];

  for (const c of list) {
    const strength = settlingStrength(c.url, { name, ownSite });
    const strong = strength === OPERATOR || strength === AUTHORITY_SOURCE;
    const idx = matchingUncertainty(c.says, lines);
    if (idx < 0) { ignored.push({ ...c, strength, why: "no-match" }); continue; }
    if (strong && c.quote) {
      corrections.push({
        field: "uncertainties",
        was: lines[idx],
        now: "",
        why: `Settled by ${strength === OPERATOR ? "the operator's own site" : "a public authority"}, which states: "${c.quote}"`,
        source: c.url,
        at: at || "",
      });
      removed.push({ line: lines[idx], ...c, strength });
      lines[idx] = null;
      continue;
    }
    // One of the two, not both. The caveat stays and says what is now known
    // about it, rather than being kept exactly as it was or thrown away on a
    // page that cannot carry it.
    if (strong || c.quote) {
      const next = softenedLine(lines[idx], c.url);
      softened.push({ was: lines[idx], now: next, ...c, strength });
      lines[idx] = next;
      continue;
    }
    ignored.push({ ...c, strength, why: strength === WEAK ? "weak-source" : "no-quote" });
  }

  const out = { ...payload, uncertainties: lines.filter(x => x !== null) };
  if (corrections.length) {
    out.__corrections = [...(Array.isArray(payload?.__corrections) ? payload.__corrections : []), ...corrections];
  }
  return { payload: out, removed, softened, ignored, why: describeResolve({ removed, softened, ignored }) };
};

// ── SAID OUT LOUD, NEVER QUIETLY ────────────────────────────────────
//
// glanceExtract reports every caveat it removes and this does the same, for the
// same reason: a line that disappears from a draft with no explanation is a line
// nobody can argue with afterwards.
export const describeResolve = ({ removed = [], softened = [], ignored = [] } = {}) => {
  const parts = [];
  if (removed.length) {
    parts.push(`${removed.length} uncertaint${removed.length === 1 ? "y was" : "ies were"} settled and removed, each by a page that states the fact: ${removed.map(r => `"${String(r.line).slice(0, 70)}" (${normaliseDomain(r.url)})`).join("; ")}. The removal is recorded in __corrections with the quotation and the URL.`);
  }
  if (softened.length) {
    parts.push(`${softened.length} ${softened.length === 1 ? "was" : "were"} supported but not settled, so ${softened.length === 1 ? "it stays" : "they stay"} with what is now known written into ${softened.length === 1 ? "it" : "them"}.`);
  }
  if (ignored.length) {
    const byWhy = ignored.reduce((m, i) => ({ ...m, [i.why]: (m[i.why] || 0) + 1 }), {});
    const said = Object.entries(byWhy).map(([w, n]) =>
      `${n} ${w === "no-match" ? "named no uncertainty in this draft" : w === "weak-source" ? "stood on a page that cannot settle it" : "carried no quotation from the page"}`);
    parts.push(`${ignored.length} confirmation${ignored.length === 1 ? "" : "s"} changed nothing: ${said.join(", ")}.`);
  }
  return parts.join(" ");
};
