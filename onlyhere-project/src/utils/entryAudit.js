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

import { scanForAITells, fillerWordCounts } from "./helpers";

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

// A ranking with no measure attached. Caught deterministically because it is a
// pattern, not a judgement: "third-largest city" is unverifiable, "third-largest
// city by municipality" is checkable. The real case was Odense, still third by
// municipality and fourth by urban population, so the number was never wrong,
// only unqualified.
const RANK = /\b(largest|biggest|smallest|longest|oldest|newest|tallest|highest|busiest|most[- ]visited|best[- ]preserved|first|only)\b/i;
const MEASURE = /\bby (municipality|urban|population|area|visitors?|floor|length|height|volume)|\b(municipality|urban area|by number of)\b/i;
const ORDINAL_RANK = /\b(second|third|fourth|fifth|[0-9]+(st|nd|rd|th))[- ](largest|biggest|smallest|oldest|longest|busiest)\b/i;

// A year attached to a place with no event named. "Founded in 988" and "first
// mentioned in 988" are different claims; a bare year is neither.
const BARE_YEAR_CLAIM = /\b(dates back to|dating back to|founded in|established in|from|since)\s+(the\s+)?\d{3,4}\b/i;
const NAMED_EVENT = /first (written )?mention|mentioned in writing|market[- ]town|købstad|town rights|charter|consecrat|incorporat|settle/i;

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

// ── ONE ENTRY, TWO CONTRADICTORY ANSWERS ────────────────────────────
// Found by eye on the Copenhagen entry, 8 Aug 2026. The body says water costs
// 1.20 to 1.50 EUR and a hot dog about 7. The typicalCosts glance field says
// water is about 4 EUR and a hot dog about 1,20. Read those two lines together
// and the hot dog price in the glance field is the WATER price from the body:
// two fields written in separate passes, one of them shifted by a row.
//
// Nothing existing could have caught it. Every individual figure is plausible,
// every field parses, and the only thing wrong is that they disagree with each
// other. So the check is not "is this price right", which needs research and a
// source, but "does this entry answer the same question twice, differently",
// which is free, deterministic, and finds every entry with the shape rather
// than the one somebody happened to read.
//
// It runs on all 71 in milliseconds and always scores the same, which is the
// standing reason this file has no AI in it.

// A glance field is a short answer meant to be scanned. Where a figure in one
// of these disagrees with the prose, the glance field is usually the wrong one,
// because it was filled in second and by itself.
const GLANCE_COST_FIELDS = ["typicalCosts", "price", "extraCosts", "ticketInfo"];

// Only things that genuinely carry one price. "lunch" and "dinner" are left out
// on purpose: a range for a meal is not the same claim as a range for a bottle,
// and two honest figures for "dinner" in one entry is normal writing.
const PRICED_NOUNS = [
  ["water", /\b(?:bottled\s+)?water\b|\bvand\b/gi],
  ["a hot dog", /\bhot\s?dogs?\b|\bp(?:ø|o)lser?\b/gi],
  ["coffee", /\bcoffee\b|\bkaffe\b/gi],
  ["beer", /\bbeers?\b|\bpints?\b|\b(?:ø|oe)l\b/gi],
  ["a pastry", /\bpastr(?:y|ies)\b|\bcinnamon\s+(?:roll|swirl)\b|\bwienerbr(?:ø|o)d\b/gi],
  ["a bike hire", /\bbike\s+(?:hire|rental)\b|\bcycle\s+hire\b/gi],
  ["a single ticket", /\bsingle\s+(?:ticket|fare|journey)\b|\bone\s+way\s+ticket\b/gi],
];

const CURRENCY_TOKEN = /(eur\b|euros?\b|€|dkk\b|kroner\b|kr\.?(?=\s|$|\)|,))/gi;
const normCurrency = (raw) => {
  const t = String(raw || "").toLowerCase().replace(/\./g, "").trim();
  if (!t) return null;
  if (t === "eur" || t === "euro" || t === "euros" || t === "€") return "eur";
  if (t === "dkk" || t === "kr" || t === "kroner") return "dkk";
  return null;
};

// A number followed by a unit is a duration, a distance or a headcount, not a
// price, and a four-digit number in this range is a year. Both appear beside
// priced nouns often enough to matter ("coffee from 2019", "a 15 minute walk
// from the hot dog stand").
const NOT_A_PRICE_AFTER = /^\s*(?:min\b|mins\b|minutes?\b|hours?\b|hrs?\b|km\b|metres?\b|meters?\b|m\b|people\b|persons?\b|years?\b|%|:)/i;
// The number is grabbed WHOLE and interpreted afterwards. An earlier version
// pattern-matched the shape inline and read "2,400 DKK" as 2.40 followed by a
// separate 0, which is the kind of quiet arithmetic error that would have put a
// contradiction finding on entries that do not have one.
const NUM = "(\\d[\\d.,]*\\d|\\d)";
const PRICE_RE = new RegExp(`${NUM}\\s*(?:(?:–|—|-|to)\\s*${NUM})?\\s*(eur\\b|euros?\\b|€|dkk\\b|kroner\\b|kr\\.?)?`, "gi");

// Danish writes a decimal comma and a full-stop thousands separator, English
// does the opposite, and Gemlyx entries contain both because the sources do.
// Every shape that is genuinely ambiguous is REFUSED rather than guessed:
// "1.234" could be a price or twelve hundred and thirty four, and a wrong guess
// here invents a disagreement that is not in the entry.
const toNumber = (raw) => {
  const s = String(raw || "").trim();
  if (/^\d+$/.test(s)) return Number(s);
  if (/^\d{1,3}(?:,\d{3})+$/.test(s)) return Number(s.replace(/,/g, ""));      // 2,400
  if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));    // 2.400
  if (/^\d+,\d{1,2}$/.test(s)) return Number(s.replace(",", "."));             // 1,20
  if (/^\d+\.\d{1,2}$/.test(s)) return Number(s);                              // 1.20
  return null;
};

export const pricesIn = (text) => {
  const t = String(text || "");
  const out = [];
  PRICE_RE.lastIndex = 0;
  let m;
  while ((m = PRICE_RE.exec(t)) !== null) {
    if (m[0].trim() === "") { PRICE_RE.lastIndex++; continue; }
    const rest = t.slice(m.index + m[0].length);
    if (NOT_A_PRICE_AFTER.test(rest)) continue;
    const lo = toNumber(m[1]);
    const hi = m[2] ? toNumber(m[2]) : lo;
    if (lo == null || hi == null) continue;
    // A bare four-digit number in living memory is a year, not a price.
    if (!m[3] && lo >= 1000 && lo <= 2100 && !m[2]) continue;
    out.push({ at: m.index, lo: Math.min(lo, hi), hi: Math.max(lo, hi), currency: normCurrency(m[3]) });
  }
  return out;
};

// The currency the whole field is written in, when it states exactly one. A
// field mixing EUR and DKK cannot lend its currency to a figure that has none,
// so it lends nothing.
const fieldCurrency = (text) => {
  const found = new Set((String(text || "").match(CURRENCY_TOKEN) || []).map(normCurrency).filter(Boolean));
  return found.size === 1 ? [...found][0] : null;
};

// The price a noun is carrying: the first one after it, as long as another
// priced noun does not come first. "water 1.20 to 1.50 EUR and hotdog 7" gives
// water the range and the hot dog the seven, which is the whole point.
export const priceForNoun = (text, nounRe) => {
  const t = String(text || "");
  if (!t) return null;
  const nouns = [];
  for (const [, re] of PRICED_NOUNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t)) !== null) nouns.push(m.index);
  }
  nouns.sort((a, b) => a - b);

  const prices = pricesIn(t);
  const fc = fieldCurrency(t);

  nounRe.lastIndex = 0;
  let hit;
  while ((hit = nounRe.exec(t)) !== null) {
    const start = hit.index + hit[0].length;
    const nextNoun = nouns.find(n => n > hit.index) ?? t.length;
    const p = prices.find(x => x.at >= start && x.at < nextNoun && x.at - start <= 60);
    if (p) return { ...p, currency: p.currency || fc };
    // "7 EUR for a hot dog" reads the other way round. Only a very short reach
    // backwards, because a price twenty words earlier belongs to something else.
    const before = prices.filter(x => x.at < hit.index && hit.index - x.at <= 24).pop();
    if (before && !nouns.some(n => n < hit.index && n > before.at)) return { ...before, currency: before.currency || fc };
  }
  return null;
};

// Two figures for the same thing disagree when their ranges do not overlap AND
// they are far enough apart that rounding cannot explain it. 1.20 to 1.50
// against "about 1.50" is one entry written twice; 1.20 against 4 is two
// different claims.
const DISAGREEMENT_RATIO = 1.6;
// THREE LINES, AND ONE HONEST NOTE ABOUT THE MIDDLE ONE.
//
// The first draft of this had a stack of guards: an overlap check, a zero
// check, and the ratio. Mutation testing showed two of them could be deleted
// without a single test going red, because each was shadowed by arithmetic that
// happened to give the same answer, and they were propping each other up.
// Rewriting it to make every line load-bearing produced something that leaned
// on `0/0` being NaN, which is worse: correct by accident and unreadable.
//
// So it is written plainly instead, and the redundancy is stated rather than
// hidden. Given prices are never negative, the overlap line below is provably
// implied by the ratio that follows it (under overlap, a.lo <= b.hi, so the
// ratio is at most 1). It stays because it is the DEFINITION of two figures
// agreeing, and a future edit to the ratio should not silently take agreement
// with it. It cannot be isolated by a mutation, and pretending otherwise with a
// contrived test would be the exact failure this suite exists to prevent.
const contradicts = (a, b) => {
  if (a.currency && b.currency && a.currency !== b.currency) return false;   // 30 kr and 4 EUR is one price
  if (a.lo <= b.hi && b.lo <= a.hi) return false;                            // overlap: both can be true
  // Disjoint, so this is the real gap. Free on one side divides by zero, and
  // Infinity is the right answer to "how far apart are free and five euros".
  const [low, high] = a.hi < b.lo ? [a.hi, b.lo] : [b.hi, a.lo];
  return high / low >= DISAGREEMENT_RATIO;
};

const showPrice = (p) => `${p.lo === p.hi ? p.lo : `${p.lo} to ${p.hi}`}${p.currency ? ` ${p.currency.toUpperCase()}` : ""}`;

export const costContradictions = (payload) => {
  const p = payload || {};
  const glanceParts = GLANCE_COST_FIELDS.map(f => (typeof p[f] === "string" ? p[f] : "")).filter(Boolean);
  if (!glanceParts.length) return [];
  const glance = glanceParts.join(" ; ");

  // Everything that is not a glance cost field, so the prose is compared
  // against the summary rather than against itself.
  const prose = textOf(Object.fromEntries(Object.entries(p).filter(([k]) => !GLANCE_COST_FIELDS.includes(k))));

  const out = [];
  for (const [label, re] of PRICED_NOUNS) {
    const a = priceForNoun(glance, re);
    const b = priceForNoun(prose, re);
    if (!a || !b) continue;
    if (contradicts(a, b)) out.push({ noun: label, glance: showPrice(a), body: showPrice(b) });
  }
  return out;
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
  // ── low: a word used as a verbal tic ──────────────────────────
  // Separate finding from the phrase tells above, and LOW on purpose: this is
  // a style note about repetition, not a claim that any single sentence is
  // wrong, and rolling it into the tells count would push entries to "high"
  // for saying "actually" twice.
  const filler = fillerWordCounts(all);
  const fillerWords = Object.keys(filler);
  if (fillerWords.length > 0) {
    add("low", "voice", `Leans on filler words: ${fillerWords.map(w => `"${w}" ${filler[w]} times`).join(", ")}. Each one is only worth keeping where deleting it would change the meaning.`);
  }

  const lazyFields = Object.entries(p).filter(([k, v]) => typeof v === "string" && LAZY.test(v.trim())).map(([k]) => k);
  if (lazyFields.length > 0) {
    add(lazyFields.length >= 3 ? "high" : "low", "research", `${lazyFields.length} field${lazyFields.length === 1 ? "" : "s"} left as a placeholder instead of a real answer: ${lazyFields.slice(0, 4).join(", ")}.`);
  }

  // ── high: claims that cannot be checked as written ────────────
  if (ORDINAL_RANK.test(all) && !MEASURE.test(all)) {
    const m = all.match(ORDINAL_RANK);
    add("high", "ranking", `Says "${m[0]}" without naming the measure. This is the Odense case: third by municipality and fourth by urban population are both real, so an unqualified ranking is unverifiable and reads as wrong to anyone using the other one.`);
  } else if (RANK.test(all) && /\bin denmark\b/i.test(all) && !MEASURE.test(all)) {
    const m = all.match(RANK);
    add("low", "ranking", `Makes a "${m[0]}" claim about Denmark with no measure or scope stated. Worth checking it is the claim the source actually supports.`);
  }
  if (BARE_YEAR_CLAIM.test(all) && !NAMED_EVENT.test(all)) {
    const m = all.match(BARE_YEAR_CLAIM);
    add("high", "history", `Attaches a year ("${m[0].trim()}") without naming which event it belongs to. First written mention, founding, and a grant of town rights are three different dates, and welding them together is how the Odense 988 error happened.`);
  }

  // A glance field holding a sentence or an instruction to the reader. Real
  // case: nearestStation = "No train station in Kliplev; likely via Aabenraa by
  // bus, check rejseplanen.dk", which renders after the label as a station with
  // that name.
  const ns = typeof p.nearestStation === "string" ? p.nearestStation.trim() : "";
  // A period only means a sentence when more text follows: "Ribe St." is a real name.
  if (ns && (/;|\.\s+\S|,.*,/.test(ns) || ns.split(/\s+/).length > 6 || ns.length > 48
             || /\b(check|likely|probably|see |consult|rejseplanen|google maps|no train|unknown|varies)\b/i.test(ns))) {
    add("high", "nearest stop", `The Nearest Station field holds a sentence rather than a name: "${ns.slice(0, 70)}". It renders straight after the label, so it reads as the stop's name. Put the name there or leave it empty, and explain the journey in the prose.`);
  }

  // Critical rather than high: a traveller reading the glance row budgets from
  // it, and an entry that answers the same question two ways is wrong in one of
  // them for certain. Which one is wrong needs a human, which is exactly why it
  // is worth naming both figures here.
  const crossed = costContradictions(p);
  if (crossed.length) {
    add("critical", "costs", `The glance cost field and the body disagree about ${crossed.length === 1 ? "a price" : `${crossed.length} prices`}: ${crossed.map(c => `${c.noun} reads ${c.glance} at a glance and ${c.body} in the text`).join("; ")}. One of them is wrong, and a reader budgeting from the glance row has no way to tell which.`);
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
