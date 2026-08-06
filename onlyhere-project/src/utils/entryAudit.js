// ── Which published entries actually need redrafting ───────────────
// Oliver, 6 Aug 2026: "I'd also make a system so we put up a 'needs redraft'.
// Because right now I'm redrafting some. But I'm not sure which ones need. I
// don't care about the ones that was written by ChatGPT before.. that is what
// it is. But some of them might be very off."
//
// The old "Needs Redraft" panel listed the hardcoded `towns` array, which was
// emptied in PASS 29. It has been showing an empty list ever since. This
// replaces guessing with evidence.
//
// DELIBERATELY DETERMINISTIC, NO AI. Every check below is a fact about the
// stored payload that can be verified by reading it. That matters for three
// reasons: auditing 55 entries costs nothing, the same entry always scores the
// same, and the reason given is always literally true rather than a model's
// opinion about quality. An AI reviewer would be slower, cost real money, and
// produce a different answer each run.
//
// Every finding names WHAT is wrong and WHERE, so the answer is never just
// "this one looks bad".

import { scanForAITells } from "./helpers";

// The coordinate that was printed in the town prompt's own JSON schema as an
// example, which drafts copied verbatim (PASS 45). Any entry still carrying it
// has a map pin in a field near Ringkøbing Fjord instead of the actual town.
const SCHEMA_EXAMPLE_LAT = 56.09;
const SCHEMA_EXAMPLE_LON = 8.24;

// Claims that a place has no public transport. Same pattern as the live
// pipeline guard, kept in sync deliberately: an entry published before that
// guard existed can still carry the claim, and those are the worst offenders
// because they actively tell a traveler not to bother.
const NO_TRANSPORT = /no (?:confirmed |direct |reliable |real |proper |obvious )*(?:public transport|public transit|train[- ]and[- ]bus|bus[- ]and[- ]train|train and bus)[^.]{0,60}?(?:route|itinerary|connection|link)|(?:public transport|public transit)[^.]{0,40}?(?:does not exist|isn't available|is not available|unavailable)|driving is (?:genuinely |really )?the only/i;

// Lazy filler the voice rules ban outright. A field holding one of these is a
// field that was never actually researched.
const LAZY = /^(see website|check locally|check the website|varies|n\/a|unknown|tbd|contact them)\.?$/i;

const textOf = (payload) => {
  const parts = [];
  const walk = (v) => {
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => { if (k !== "photo" && k !== "src" && k !== "url" && k !== "sourceUrl" && k !== "mapHint") walk(x); });
  };
  walk(payload);
  return parts.join(" ");
};

// Severity is about what a traveler LOSES, not about how untidy the entry is.
// "critical" means someone could waste a day or money on it. "high" means a
// visibly wrong or missing fact. "low" means it reads badly but misleads nobody.
export const auditEntry = (row) => {
  const p = row?.payload || {};
  const type = row?.type || "";
  const findings = [];
  const add = (severity, field, detail) => findings.push({ severity, field, detail });

  const all = textOf(p);

  // ── critical: actively misleading ──────────────────────────────
  if (NO_TRANSPORT.test(all)) {
    add("critical", "getting there", "Claims no public transport route exists. This has been wrong every time it was checked, and it tells travelers without a car to skip the place entirely.");
  }
  if (Number(p.__lat) === SCHEMA_EXAMPLE_LAT && Number(p.__lon) === SCHEMA_EXAMPLE_LON) {
    add("critical", "coordinates", "Still carries the coordinate that was printed as an example in the old draft prompt, so the map pin is roughly 130km from the real place.");
  }
  if (type === "town" && (p.__lat == null || p.__lon == null)) {
    add("high", "coordinates", "No coordinates stored, so no map and no distance maths can use this entry.");
  }

  // ── high: a fact that is wrong, missing, or unusable ──────────
  const dashes = (all.match(/[—–]/g) || []).length;
  if (dashes > 0) {
    add("high", "voice", `Contains ${dashes} em or en dash${dashes === 1 ? "" : "es"}, which the dash ban forbids outright. A strong sign the entry predates the current rules.`);
  }
  const tells = scanForAITells(all);
  if (tells.length > 0) {
    add(tells.length >= 3 ? "high" : "low", "voice", `Uses banned AI-writing phrases: ${[...new Set(tells.map(t => t.phrase || t))].slice(0, 5).join(", ")}.`);
  }
  const lazyFields = Object.entries(p).filter(([k, v]) => typeof v === "string" && LAZY.test(v.trim())).map(([k]) => k);
  if (lazyFields.length > 0) {
    add(lazyFields.length >= 3 ? "high" : "low", "research", `${lazyFields.length} field${lazyFields.length === 1 ? "" : "s"} left as a placeholder instead of a real answer: ${lazyFields.slice(0, 4).join(", ")}.`);
  }

  // ── medium: thin or unfinished ────────────────────────────────
  const body = Array.isArray(p.blogBody) ? p.blogBody : [];
  const words = all.split(/\s+/).filter(Boolean).length;
  if (body.length === 0) add("medium", "body", "No long-form body at all, so the page is just a card with no article behind it.");
  else if (words < 180) add("medium", "body", `Only about ${words} words in total, which is thin for a full entry.`);
  if (!p.photo) add("medium", "photo", "No hero photo, so it shows as a monogram plate in every list.");
  if (!Array.isArray(p.uncertainties)) {
    add("low", "provenance", "No uncertainties array, which means it predates the honesty rules and nothing records what could not be confirmed.");
  }

  // ── the thing he actually asked about: is it OLD ──────────────
  // Not a defect on its own, but it is the tiebreaker between two entries that
  // otherwise look equally fine.
  const weight = { critical: 100, high: 30, medium: 8, low: 2 };
  const score = findings.reduce((n, f) => n + (weight[f.severity] || 0), 0);

  return {
    id: row?.id,
    type,
    name: p.name || "(unnamed)",
    score,
    verdict: score >= 100 ? "Redraft now" : score >= 30 ? "Worth redrafting" : score >= 8 ? "Minor gaps" : "Looks fine",
    findings,
  };
};

// Worst first. Ties broken by name so the list is stable between runs rather
// than reshuffling every time it is opened.
export const auditAll = (rows) => (Array.isArray(rows) ? rows : [])
  .map(auditEntry)
  .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)));
