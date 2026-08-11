// ── FACT-CHECKING WHAT IS ALREADY PUBLISHED ──────────────────────────
//
// Oliver, 11 Aug 2026: "can we make a fact-checker on all of them that our
// pipeline can go through? It can be both individual and all of them. Because I
// noticed Faxe has some history wrong. Which I assume was from before we fixed
// history."
//
// He is almost certainly right about the cause. This is the fourth-standing-rule
// case again: fixing a writer does not fix what it already wrote. The Odense-988
// history rule was added to the drafting prompts, and every row published before
// that day still carries whatever it carried.
//
// ── WHY THIS FILE IS MOSTLY WIRING ──────────────────────────────────
// Nearly all of the checking already existed and was never pointed at the
// published table:
//
//   entryAudit.auditEntry   deterministic, no model, no cost. Already checks the
//                           exact Faxe case: a bare year with no named event,
//                           "First written mention, founding, and a grant of
//                           town rights are three different dates".
//   coordCheck.coordProblems is the pin in Denmark, near the town it claims.
//   publishedRepair          old headings, missing Reality Check.
//   correction.VERIFY_PROMPT one claim, checked against live sources, and it
//                           already refuses to call something confirmed when no
//                           source came back with it.
//
// Writing a new checker beside those would be the fifth duplicated thing found
// this week. So this file adds no rules. It decides WHICH rows to spend money
// on, and in what order.
//
// ── THE LADDER, WHICH IS THE WHOLE POINT ────────────────────────────
// He has asked about cost in almost every conversation, and "check all of them"
// against a live search is the single most expensive button this app could
// have: every published row, every claim, one Perplexity call each.
//
// So the sweep is free and total, and the paid check is narrow and deliberate:
//
//   TIER 1  every row, no model calls, instant, costs nothing. This is what
//           runs when he presses "Check everything".
//   TIER 2  one row at a time, real searches, only on rows he picks or rows
//           tier 1 flagged, and the count of calls is shown BEFORE it runs.
//
// Tier 1 is not a weaker version of tier 2. It catches a different class:
// contradictions inside the entry, which no amount of web search finds, because
// the entry disagreeing with itself is not a question about the world.

import { auditEntry } from "./entryAudit";
import { coordProblems } from "./coordCheck";
import { bodyProblems } from "./publishedRepair";

// Order matters: this is the order a person should read them in, and the order
// the list is sorted by.
export const SEVERITY = ["critical", "high", "medium", "low"];
const rank = (s) => { const i = SEVERITY.indexOf(s); return i < 0 ? SEVERITY.length : i; };

// ── TIER 1: FREE, DETERMINISTIC, EVERY ROW ──────────────────────────
// Every finding here is a fact about the stored payload that can be verified by
// reading it. That matters for three reasons, all of them his: sweeping 60
// entries costs nothing, the same entry always scores the same, and the reason
// given is literally true rather than a model's opinion.
export const sweepRow = (row) => {
  const findings = [];
  try {
    (auditEntry(row)?.findings || []).forEach(f => findings.push({ ...f, from: "audit" }));
  } catch { /* one malformed row must not stop the sweep */ }
  try {
    coordProblems(row?.payload, row?.type).forEach(c =>
      findings.push({ severity: c.severity, field: "coordinates", detail: c.detail, from: "coordinates" }));
  } catch { /* same */ }
  try {
    bodyProblems(row?.payload).forEach(b =>
      findings.push({ severity: b.kind === "legacy-heading" ? "low" : "medium", field: "structure", detail: b.detail, from: "structure" }));
  } catch { /* same */ }
  findings.sort((a, b) => rank(a.severity) - rank(b.severity));
  return {
    id: row?.id, name: row?.payload?.name || "(unnamed)", type: row?.type,
    findings,
    worst: findings.length ? findings[0].severity : null,
  };
};

export const sweepAll = (rows) => {
  const results = (Array.isArray(rows) ? rows : []).map(sweepRow).filter(r => r.findings.length > 0);
  results.sort((a, b) => rank(a.worst) - rank(b.worst) || String(a.name).localeCompare(String(b.name)));
  const count = (s) => results.filter(r => r.worst === s).length;
  return {
    rows: results,
    checked: (rows || []).length,
    flagged: results.length,
    critical: count("critical"),
    high: count("high"),
    // Named because he will want to know which rule is firing across the whole
    // library, not just which rows are bad. A rule that fires on forty entries
    // is a prompt problem, not forty content problems.
    byField: Object.entries(
      results.flatMap(r => r.findings).reduce((acc, f) => { acc[f.field] = (acc[f.field] || 0) + 1; return acc; }, {})
    ).sort((a, b) => b[1] - a[1]),
  };
};

// ── TIER 2: WHAT A PAID CHECK WOULD COST, BEFORE IT RUNS ────────────
// One search per claim. Stated as a count rather than a price, because the
// rates in apiCost.js are still blank and a made-up figure is worse than a
// count he can multiply himself.
//
// HISTORY AND RANKING FIRST, deliberately. Those are the two the deterministic
// pass can only ever say "this looks unverifiable" about: whether Faxe's year
// is the right year is a question about the world, and the only way to answer
// it is to go and look.
export const CHECKABLE_FIELDS = ["history", "ranking", "costs", "getting there", "distance and time"];

export const deepCheckPlan = (sweep) => {
  const claims = (sweep?.findings || []).filter(f => CHECKABLE_FIELDS.includes(f.field));
  return {
    name: sweep?.name || "",
    claims,
    calls: claims.length,
    // Nothing to look up is a real answer, and it is the common one: most
    // findings are voice, structure or a missing photo, which no search fixes.
    worthIt: claims.length > 0,
    why: claims.length
      ? `${claims.length} ${claims.length === 1 ? "claim needs" : "claims need"} a live source: ${[...new Set(claims.map(c => c.field))].join(", ")}.`
      : "Nothing here is a question about the world. The findings are voice, structure or coordinates, and a web search cannot settle any of them.",
  };
};

// ── WHAT WAS CHECKED, AND WHEN ──────────────────────────────────────
// Stored on the row so a check is not re-bought to re-read its answer, and so
// an entry checked before a rule existed is visibly different from one checked
// after it. `rules` is a version marker: bump it when a rule changes and every
// row checked under the old one correctly reads as stale.
export const RULES_VERSION = "2026-08-11";

export const stampCheck = (payload, sweep, deep) => ({
  ...(payload || {}),
  __checked: {
    at: new Date().toISOString(),
    rules: RULES_VERSION,
    findings: (sweep?.findings || []).length,
    worst: sweep?.worst || null,
    deep: deep ? { claims: deep.length, confirmed: deep.filter(d => d.verdict === "confirmed").length } : null,
  },
});

export const checkAge = (payload) => {
  const c = payload?.__checked;
  if (!c?.at) return { everChecked: false, stale: true, why: "Never checked." };
  const stale = c.rules !== RULES_VERSION;
  return {
    everChecked: true,
    stale,
    at: c.at,
    why: stale
      ? `Checked ${String(c.at).slice(0, 10)}, but under an older rule set. Worth re-running the free sweep.`
      : `Checked ${String(c.at).slice(0, 10)} under the current rules.`,
  };
};
