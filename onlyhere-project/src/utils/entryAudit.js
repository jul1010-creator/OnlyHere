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
import { claimConflicts, implausibleWalks } from "./claimCheck";
// Every coordinate rule, including the schema-example pair that used to be
// declared here as two loose constants. One file owns them now, because the
// publish gate and this audit have to agree about what counts as wrong, and two
// copies of a threshold is the failure this codebase repeats most.
import { coordProblems } from "./coordCheck";

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
// ── DOES THE ENTRY AGREE WITH ITSELF ABOUT DISTANCE AND TIME ────────
// Added 10 Aug 2026 after Oliver passed on a pipeline review built around an
// entry claiming a 42 minute walk where the real walk is about six.
//
// The app has checked spatial claims since the guide pipeline was built. It
// checks them on LEGS, structured pairs of stops with coordinates. This one was
// in a sentence, and every check in this file scanned prose for dashes, filler,
// unqualified rankings, bare years and crossed costs, and for no claim about
// time or distance at all. The one number in the paragraph that arithmetic
// could settle was the one number nothing looked at.
//
// See utils/claimCheck.js. It needs no API and no coordinates: when a sentence
// states both a distance and a duration for the same journey, those two numbers
// are a claim about speed, and speed is arithmetic.
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
  // ── IS THE COORDINATE ABOUT THIS PLACE ──────────────────────────
  // Was: the schema-example pair and a town-only null check, both written here
  // by hand. isInDenmark existed the whole time and was never once applied to a
  // coordinate that reaches a reader, and nothing compared a coordinate with the
  // town its own entry names. See utils/coordCheck.js, which the publish gate
  // uses too, so a row cannot be blocked on a rule this audit does not report or
  // reported on a rule the gate ignores.
  coordProblems(p, type).forEach(c => add(c.severity, "coordinates", c.detail));

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
  // Same family as the crossed-costs check above: the entry disagreeing with
  // itself, where nobody has to look anything up to know one side is wrong.
  claimConflicts(all).forEach(c => {
    add("critical", "distance and time",
      `"${c.sentence.slice(0, 120)}" ${c.direction}: ${Math.round(c.statedKm * 1000)} m ${c.mode === "walking" ? "on foot" : `by ${c.mode}`} is about ${c.expectedMinutes} minutes, not ${Math.round(c.statedMinutes)}. One of the two numbers is wrong and a reader cannot tell which.`);
  });
  // One number, no distance beside it, and past any figure a Dane would call a
  // walk. Not proof of an error, which is why it is not critical.
  implausibleWalks(all).forEach(w => {
    add("medium", "distance and time",
      `Calls ${Math.round(w.minutes)} minutes a walk: "${w.sentence.slice(0, 120)}". Past about twenty minutes people name a bus instead, so this is worth checking against a map.`);
  });

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


// ── ONLY WHAT A READER CAN SEE IS A PRICE CLAIM ─────────────────────
// My own regression, found by Oliver's run log on 12 Aug within hours of
// shipping it. tracePrices was handed JSON.stringify(t), the WHOLE draft, so it
// read numbers out of the machinery and reported this:
//
//   NOT FROM THE OFFICIAL SITE: 8 to 2026, 19, 93, 7, 400 DKK, 21 to 22,
//   26902, 1157325, 1072724, 645998, 19918555, 13654191, 13560064
//
// 13654191 and 13560064 are Ritzau press-release ids sitting inside __sources
// URLs. None of those are prices, the one plausible figure is buried in noise,
// and the whole line went into uncertainties on the entry.
//
// This codebase already had the rule and I did not apply it: keys beginning
// with _ are machinery, not prose, which is exactly why stripDashesDeep skips
// them. A price claim is something a reader can see. Nothing else counts.
export const readerText = (payload) => {
  const out = [];
  const walk = (v) => {
    if (typeof v === "string") { out.push(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        // Same test stripDashesDeep uses. A url, a coordinate, a cached
        // measurement and a source list are not sentences anybody reads.
        if (k.startsWith("_")) continue;
        walk(val);
      }
    }
  };
  walk(payload);
  return out.join(" ");
};

// ── A PRICE IS ONLY A FACT IF IT CAME FROM WHO CHARGES IT ───────────
//
// Oliver, 12 Aug 2026: "I want to make it clear that the tickets on the
// official website HAS TO BE PRIORITISED. Otherwise Tavily and Perplexity might
// take some 2024 blog and put in their ticket prices."
//
// The rule already existed and is good. TICKET_SOURCE_RULES is mandatory on
// anything ticketed and says where a price actually lives, that a sold out early
// tier is not the price, and that a figure without a named day and tier is not
// checkable. RESEARCH_SOURCE_RULES says anything priced before 2025 is stale.
//
// All of that is PROMPT, and the first standing rule of this codebase is that
// anything the system already knows is applied as CODE, because telling a model
// a fact is a request with a failure rate. The system does know this one: the
// official site's own text is already fetched, and already kept as its own
// string (scrapedSiteText) rather than folded into the blob that also holds
// Tavily and Perplexity, precisely so it can be compared against later. Nothing
// was comparing it.
//
// Built on the pricesIn above rather than a second extractor, which is the
// whole reason this lives in this file: that one already handles ranges, both
// separator conventions, currency tokens, and refuses genuinely ambiguous
// shapes instead of guessing. A second one would have been the seventh
// duplicated function found this week, and a worse one.
//
// NUMBERS ONLY, currency deliberately ignored in the comparison: a Danish site
// writing "155,-" and a draft writing "155 DKK" are the same claim, and
// insisting the token match would flag it as invented.
const priceKey = (p) => `${p.lo}-${p.hi}`;

// ── A NUMBER IS NOT A PRICE UNTIL IT NAMES A CURRENCY ───────────────
// Second correction to my own work, from Oliver's run log of 12 Aug. After the
// trace stopped reading __sources it still reported this:
//
//   NOT FROM THE OFFICIAL SITE: 8 to 2026, 19, 140 to 165 DKK, 6760, 33,
//   400 DKK, 7
//
// 6760 is the postcode in mapHint, 7 is the house number in "Kastanie Allé 7",
// 19 is the day of the month. All reader-facing, none of them prices. pricesIn
// accepts a bare number on purpose, because it was written for the cost FIELDS,
// where a bare figure beside a priced noun is a price. Turned loose on prose it
// reads an address.
//
// The two real claims in that line, "140 to 165 DKK" and "400 DKK", both name a
// currency. The seven pieces of noise do not. That is the whole distinction, and
// it keeps the trace working on prose rather than retreating to the cost fields,
// which would have missed a price stated inside a Reality Check.
//
// DELIBERATELY ASYMMETRIC. Strict about what counts as a CLAIM, lenient about
// what counts as corroboration: a site writing "Entré 400" with the currency in
// a heading still confirms a draft saying "400 kr". Being strict on both sides
// would invent disagreements out of a site's formatting.
// ── THREE ANSWERS, NOT TWO ──────────────────────────────────────────
// listingText is a third tier, added 12 Aug 2026 after Oliver's Ribelund run
// reported KultuNaut's text as "the official site's own words". A price on a
// national calendar or a ticket reseller is not the operator's word for it, and
// it is not a blog either. Collapsing those two into one verdict forces a
// choice between calling a reseller official, which is the bug being fixed, and
// calling it unproven, which would flag the 400 kr that is almost certainly
// right. So it gets its own bucket and its own sentence.
export const tracePrices = (draftText, siteText, listingText = "") => {
  const draft = [...new Map(pricesIn(draftText).filter(p => p.currency).map(p => [priceKey(p), p])).values()];
  const official = String(siteText || "").trim();
  const listing = String(listingText || "").trim();
  // Nothing to trace AGAINST is not the same as nothing tracing. Flagging every
  // price when the site could not be read would be accusing a draft of
  // something we cannot check, which is the discipline coordProblems and
  // coordFitsTown already follow.
  if (!official && !listing) {
    return { checked: false, why: "the official site's text was not available", draft, traced: [], listed: [], untraced: [] };
  }
  const site = new Set(pricesIn(official).map(priceKey));
  const seenOnListing = new Set(pricesIn(listing).map(priceKey));
  const onSite = (p) => site.has(priceKey(p));
  return {
    checked: true, why: "", draft,
    traced: draft.filter(onSite),
    // The operator's own page wins outright. A figure that appears on BOTH is
    // traced, not listed, because the better provenance is the true one.
    listed: draft.filter(p => !onSite(p) && seenOnListing.has(priceKey(p))),
    untraced: draft.filter(p => !onSite(p) && !seenOnListing.has(priceKey(p))),
  };
};

// The formatter that already exists a hundred lines above, reused. It reads a
// range as "lo to hi" and uppercases the currency, which is the same shape a
// reader sees everywhere else in an audit.

// Phrased as what it is. A price that did not come from the site that charges it
// is not proven wrong, it is unproven, and the honest place for an unproven
// figure in this product is the uncertainties list rather than the prose.
export const describePriceTrace = (r) => {
  if (!r) return "";
  if (!r.checked) return r.draft.length ? `${r.draft.length} price${r.draft.length === 1 ? "" : "s"} in this draft could not be traced, because ${r.why}.` : "";
  if (!r.draft.length) return "";
  // Said in the same breath as the verdict rather than in a separate line,
  // because "traced" and "only on a reseller" are two grades of the same
  // answer and a reader who sees one without the other has been told half.
  const listedNote = (r.listed || []).length
    ? ` Listed on a ticket site or an event calendar, but not on the operator's own page: ${r.listed.map(showPrice).join(", ")}. That is a real listing rather than an invention, and it is still not the operator's word for it.`
    : "";
  if (!r.untraced.length) {
    return r.traced.length
      ? `Every price in this draft (${r.traced.map(showPrice).join(", ")}) appears in the official site's own text.${listedNote}`
      : `No price in this draft appears on the operator's own page.${listedNote}`;
  }
  const many = r.untraced.length > 1;
  return `NOT FROM THE OFFICIAL SITE: ${r.untraced.map(showPrice).join(", ")}. ${many ? "These figures do" : "This figure does"} not appear anywhere in the official site's own text, so ${many ? "they came" : "it came"} from a search result or a blog rather than from whoever charges it. Name the day, the ticket tier and whether it is still buyable, or move ${many ? "them" : "it"} to uncertainties.${listedNote}`;
};

// ── A GLANCE FIELD IS AN ANSWER, NOT A REPORT ON THE SEARCH ─────────
//
// Oliver, 12 Aug 2026, reading a Ribelund draft: ticketInfo said
//
//   "400 kr entry per the KultuNaut listing; 2026 tickets were not found on
//    United Tickets or Billetlugen at the time of writing"
//
// and his reaction was "wtf?", which is the right one. That is a paragraph
// about the pipeline's own afternoon, sitting in the two-word field a traveller
// reads to find out what a ticket costs.
//
// BOTH HALVES ARE MINE, FROM EARLIER THE SAME DAY. The listing tier put
// "it must be attributed as a listing rather than written as the organiser's
// own word" into the scrape heading, and the writer attributed, in the field.
// The founder-source notes reported billetlugen and unitedtickets as searched
// and empty, and the writer turned two empty search results into prose.
//
// The rule already existed for exactly one field. The nearestStation prompt
// says: "NEVER put that advice in a short At a Glance field... no sentence, no
// semicolon, no 'likely', no 'check rejseplanen', no explanation," because a
// field containing advice once shipped as a station called
// "check rejseplanen.dk". It was a prompt, it named one field, and the first
// standing rule here is that anything the system already knows is enforced in
// code. Provenance and doubt have two homes that are not this one: __sources
// and uncertainties.
export const GLANCE_FIELDS = [
  "nearestStation", "ticketInfo", "camping", "accommodationTip", "travelTime",
  "budgetLevel", "typicalCosts", "price", "priceNote", "extraCosts", "timeNeeded",
  "ticketsGlance", "accessibility", "recommendedStayGlance", "bestTimeGlance",
  "accommodationGlance", "highlight", "tag", "location", "crowd", "bookingType",
];

// Two kinds of leak, and they are different sentences with the same cause.
const SEARCH_REPORT = [
  [/\b(?:was|were|are|is)\s+not\s+(?:found|listed|available|shown)\b/i, "says what a search did not find"],
  [/\bnot\s+found\s+(?:on|at|in)\b/i, "says what a search did not find"],
  [/\bat the time of writing\b/i, "dates itself to when the draft was written"],
  [/\bcould\s*n[o']?t\s+be\s+(?:confirmed|verified|found)\b/i, "reports that a check came up empty"],
  [/\b(?:un|not )(?:confirmed|verified)\b/i, "reports that a check came up empty"],
  [/\bno\s+(?:listing|listings|price|prices)\s+(?:was|were)?\s*(?:found|available)\b/i, "reports that a check came up empty"],
  [/\bin (?:our |the |this )?research\b/i, "describes the research rather than the place"],
  [/\bwe\s+could\s*n[o']?t\b/i, "describes the research rather than the place"],
];
const ATTRIBUTION = [
  [/\b(?:per|according to|via|source:|as listed on|from)\s+(?:the\s+)?[A-ZÆØÅ][\wÆØÅæøå.-]*\s*(?:listing|calendar|site|page)\b/i, "credits a source"],
  [/\b(?:per|according to)\s+(?:the\s+)?(?:kultunaut|billetto|billetlugen|billetten|ticketmaster|unitedtickets|eventim)\b/i, "credits a source"],
];

// Returns "" for a clean value, or the reason it is not one. Deliberately says
// nothing about length or tone: a long glance field is a style problem, and a
// glance field reporting on the pipeline is a correctness one.
export const glanceLeak = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  for (const [re, why] of SEARCH_REPORT) if (re.test(v)) return why;
  for (const [re, why] of ATTRIBUTION) if (re.test(v)) return why;
  return "";
};

export const glanceProblems = (payload, fields = GLANCE_FIELDS) => {
  const out = [];
  for (const k of fields) {
    const why = glanceLeak(payload?.[k]);
    if (!why) continue;
    out.push(`${k} ${why}: "${String(payload[k]).trim().slice(0, 140)}". A glance field is the answer a reader scans, so provenance belongs in __sources and doubt belongs in uncertainties. Put the plain fact here, or leave it empty.`);
  }
  return out;
};

// ── A FIND IS A THING TO DO, NOT AN ERRAND TO RUN ───────────────────
//
// Oliver, 12 Aug 2026, on a Ribelund draft. gemlyxFind said:
//
//   "...the useful move is to check Rejseplanen the same week for the real bus
//    connection from Ribe Station instead of assuming a fixed route exists..."
//
// Ribe Station is an eight-minute walk from the festival ground, which he
// checked on Google Maps himself. The draft sent a reader to a journey planner
// to look up a bus for a walk.
//
// WHERE IT COMES FROM. When Google's transit query returns no itinerary the
// prompt says, correctly, that this means UNCONFIRMED rather than "no route
// exists", and then tells the writer to "point at rejseplanen.dk and the ferry
// operator, IN THE PROSE ONLY". That was written for islands, where a real,
// frequent ferry genuinely is not in the transit feed. Pointed at a place 600
// metres from a station it produces an errand.
//
// gemlyxFind is defined in every schema in studioPrompts.js as "ONE specific
// curated recommendation only Gemlyx would flag". It is the single field in the
// entry whose whole job is to give the reader something they did not know. A
// hedge in it is not a small style problem: it is the field failing at the one
// thing it exists for, and it ships on every draft where transit is
// unconfirmed, which is most of them.
//
// realityCheck is deliberately NOT covered. The prompt says this advice belongs
// in the prose and it does; the Reality Check is where a reader expects a
// caveat. This is about the field that promised a find.
const GO_CHECK = [
  [/\b(?:check|consult|look\s*up|search)\s+(?:on\s+)?(?:rejseplanen|dsb\.dk|the journey planner|a journey planner|the timetable)/i, "sends the reader to a journey planner"],
  [/\bcheck\s+(?:the\s+)?(?:website|site|locally|with\s+the\s+(?:operator|organiser|venue))\b/i, "sends the reader off to check"],
  [/\bconfirm\s+(?:the\s+)?(?:route|connection|times?|schedule|departure)/i, "asks the reader to confirm the logistics"],
  [/\binstead of assuming\b/i, "argues with an assumption rather than stating a fact"],
  [/\bthe (?:useful|smart|right) move is to\b/i, "gives a procedure where a place was promised"],
];

export const findLeak = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  for (const [re, why] of GO_CHECK) if (re.test(v)) return why;
  return "";
};

export const curatedFindProblems = (payload) => {
  const why = findLeak(payload?.gemlyxFind);
  if (!why) return [];
  return [`gemlyxFind ${why}: "${String(payload.gemlyxFind).trim().slice(0, 140)}". This field is the one curated recommendation in the entry, so it takes a real place, dish or detail. Logistics belong in the Reality Check, and an unconfirmed connection belongs in uncertainties. If there is no genuine find, leave it empty.`];
};
