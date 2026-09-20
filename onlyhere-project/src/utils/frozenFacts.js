// ── THE FACTS A LATER PASS MAY NOT REWRITE ──────────────────────────
//
// Found in a review of the guide pipeline and left open for Oliver's call,
// then taken on 19 Sep 2026: "since you're going to fix the pipeline".
//
// THE HOLE. The guide prompt carries facts that were checked once, by hand,
// against the operator's own pages, and that are written into the prompt in
// capitals as FROZEN: the Rejsekort card being discontinued while the app is
// not resident-only, and Kombardo Expressen and Flixbus being long-distance
// coach lines that do not run commuter routes. Published Gemlyx essentials go
// in the same way, quoted rather than described, with the instruction USE THE
// WORDS BELOW.
//
// Stage 6 then hands the finished guide to Perplexity and asks it to find
// factual errors, and Stage 7 hands whatever it flags to Claude to rewrite.
// Neither stage is told any of those facts are frozen. So the single most
// likely thing to be flagged is the one thing that was checked hardest:
//
//   "the Rejsekort app requires MitID" is a widespread and wrong claim, and it
//   is exactly what a web search returns. Perplexity flags the field. Claude
//   dutifully rewrites it. The verified fact is gone, replaced by the error it
//   was written to correct, on a finished guide, silently.
//
// ── TELLING IT IS NOT ENOUGH, SO THE CHECK IS AFTERWARDS ────────────
//
// Both halves are here. The prompt block says what is frozen and why, which
// stops most of it. The check is what makes it hold: a rewrite that loses a
// frozen fact the original carried is THROWN AWAY and the original stands.
//
// That is the shape correction.js already uses on the founder's own rewrites,
// in its own words: "This is checked automatically afterwards and a rewrite
// that loses a fact is thrown away." A prompt rule is a request. A check is a
// rule.
//
// ── AN ANCHOR, NOT A SENTENCE ───────────────────────────────────────
//
// What is compared is the NAME of the thing, not the wording around it. A
// rewrite is allowed to say the same fact better, and demanding the sentence
// survive intact would refuse every legitimate improvement and make the whole
// pass pointless. What it may not do is drop Rejsekort, or turn Kombardo
// Expressen into a bus, because then the fact has not been reworded, it has
// been deleted.

const esc = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── THE ONES WRITTEN INTO THE PROMPT BY HAND ────────────────────────
//
// Each `why` is printed to a founder in the run log when a rewrite is refused,
// so it explains the fact rather than asserting it: he can check the first and
// argue with the second.
export const FROZEN_TRANSPORT = [
  {
    id: "rejsekort",
    anchor: /rejsekort/i,
    what: "Rejsekort",
    why: "Checked 10 Aug 2026 against rejsekort.dk: the physical card is discontinued and the APP is not resident-only. A web search returns the opposite about MitID, which is the claim this fact was written to correct, so a search flagging it is the expected failure rather than a finding.",
  },
  {
    id: "kombardo",
    anchor: /kombardo/i,
    what: "Kombardo Expressen",
    why: "A long-distance coach line, verified Aug 2026, and the spelling is part of the fact: Kombardo EXPRESSEN, never Expresbus.",
  },
  {
    id: "flixbus",
    anchor: /flixbus/i,
    what: "Flixbus",
    why: "The other long-distance coach line, named only on a real crossing between regions.",
  },
  {
    id: "orange",
    anchor: /orange\s*billetter/i,
    what: "DSB Orange billetter",
    why: "The discount advance-purchase train ticket, which is what a trip inside one region is pointed at instead of a coach line.",
  },
];

// ── AND THE ONES HE PUBLISHED ───────────────────────────────────────
//
// essentialsBlock quotes a published row into the prompt and tells the writer
// to use its words. Anything quoted that way is frozen by the same argument:
// it was researched, audited and published, and a model rewriting it on a
// search result is overruling the whole Studio pipeline from the last stage of
// the guide build.
//
// KEYED ON THE NAME, because that is the part a rewrite cannot paraphrase
// without changing what is being talked about. A Copenhagen Card rewritten
// into "a city pass" has lost the one word somebody needs to buy it.
export const frozenFrom = (picked = []) => [
  ...FROZEN_TRANSPORT,
  ...(Array.isArray(picked) ? picked : [])
    .map(p => String(p?.row?.name || "").trim())
    .filter(Boolean)
    .filter((n, i, a) => a.indexOf(n) === i)
    .map(name => ({
      id: `essential:${name.toLowerCase()}`,
      anchor: new RegExp(esc(name), "i"),
      what: name,
      why: "A published Gemlyx entry, quoted into this guide in its own words. It has been through the Studio audit, so a search result does not outrank it here.",
    })),
];

export const frozenIn = (text, frozen = []) =>
  (Array.isArray(frozen) ? frozen : []).filter(f => f?.anchor && f.anchor.test(String(text || "")));

// What a rewrite dropped. Empty is the normal answer and the only one that
// lets the rewrite through.
export const factsLost = (before, after, frozen = []) =>
  frozenIn(before, frozen).filter(f => !f.anchor.test(String(after || "")));

// ── WHAT THE FACT-CHECKER IS TOLD BEFORE IT LOOKS ───────────────────
//
// Not "do not check these". It is told what they are, that they were checked
// against the operator's own pages, and that a contradiction is worth
// reporting rather than acting on. A checker told to skip a field stops
// reading it; a checker told the field is contested reads it properly.
export const frozenBlock = (frozen = []) => {
  const list = (Array.isArray(frozen) ? frozen : []).filter(f => f?.what);
  if (!list.length) return "";
  return `\nCHECKED BY HAND ALREADY, AGAINST THE OPERATOR'S OWN PAGES: ${list.map(f => f.what).join(", ")}. `
    + `Do not flag a field for what it says about any of those. They were verified one at a time against the company's own site, which outranks a search result here, and at least one of them exists precisely to correct a wrong claim that is all over the web. `
    + `If you are sure one of them has since changed, say so as its own issue with the operator's own page as the reason, and expect it to be read by a person rather than applied. `
    + `Everything else in these fields is open and is what this check is for.`;
};

// ── AND THE REFUSAL, SAID OUT LOUD ──────────────────────────────────
//
// A guard that throws work away in silence is a guard nobody can tell is
// working. This goes in the run log beside every other stage's note, so a
// refusal is visible the same day rather than inferred from a fact that never
// went missing.
// ── AND ONE CASE THIS DELIBERATELY REFUSES TOO ──────────────────────
//
// Sometimes a flag is right for the opposite reason: the field names Kombardo
// Expressen on a trip that never leaves one region, and the correct fix is to
// take it out. This guard refuses that rewrite as well, because from here the
// two are the same edit and nothing in the reply says which one it is.
//
// That is the right way round on cost. Refusing a correct removal leaves a
// coach line named on a trip that will not use it, which is a weak
// recommendation about a real company. Allowing it lets a verified fact be
// replaced by a claim the fact exists to correct, on a finished guide, with
// nobody watching. So the refusal stands and WHAT WAS FLAGGED goes in the note
// with it, which is the whole reason `issue` is carried: a log line saying
// only that something was refused cannot be acted on, and one naming the
// complaint can be read in ten seconds and settled by hand.
export const lostNote = (id, lost = [], issue = "") => {
  if (!lost.length) return "";
  const names = lost.map(f => f.what).join(", ");
  const said = String(issue || "").trim();
  return `${id}: the rewrite was thrown away and the original kept, because it dropped ${names}.`
    + (said ? ` What was flagged: ${said}` : "")
    + ` ${lost.map(f => f.why).join(" ")}`;
};
