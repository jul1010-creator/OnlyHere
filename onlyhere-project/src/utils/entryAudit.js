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
// fold, because a Danish word ending in é, ø, æ or å cannot carry a \b word
// boundary in JavaScript. See TICKET_WORD.
import { fold } from "./danishNames";

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

// ── AND NOTHING EVER WENT LOOKING FOR ONE ───────────────────────────
//
// Oliver, 13 Aug 2026: "We just need to focus on getting tickets right." Asked
// which half mattered first, he chose the PRICE.
//
// tracePrices above is a good gate and it can only ever answer one question: is
// the price the writer stated supported. When the writer states NOTHING it
// returns an empty draft list and reports nothing at all, which reads as a
// pass. Two of his runs ended exactly there:
//
//   Ribelund, 12 Aug     "Pris: Entré: 400 kr." sat in a kultunaut snippet the
//                        pipeline had already fetched, and the entry shipped
//                        with no price
//   Græskarfestival,     16. Prices against the official site [google · ok]
//   13 Aug                   got: the draft states no price
//
// A clean verdict on a missing answer. This is his own universal diagnosis in
// its worst form: not "the pipeline measures and lets prose describe the
// measurement", but "the pipeline never measured and let silence stand".
//
// ── WHY THIS CANNOT JUST BE pricesIn ON THE PAGE ────────────────────
// pricesIn accepts a bare number on purpose, because it was written for the
// cost FIELDS where a figure beside a priced noun is a price. Turned loose on a
// whole scraped page it reads postcodes, house numbers and days of the month:
// the 12 Aug run log has it reporting "6760, 33, 400 DKK, 7" and only one of
// those is money.
//
// So FINDING is stricter than CHECKING, which is the opposite asymmetry to the
// one tracePrices documents, for the same underlying reason. A figure invented
// here goes into a field a reader plans around. A figure missed here leaves
// things exactly as they already are.
//
// Three conditions, all required:
//   a currency token, so "400" on its own is never a price
//   a ticket word within TICKET_WINDOW characters before it
//   that word not being one of the things sold BESIDE the ticket
//
// Danish first, because a Danish venue writes "Entré" and its English page is
// usually the stale translation of one that has since been updated.
// ── AND THIS IS MATCHED AGAINST FOLDED TEXT, WHICH IS NOT COSMETIC ──
// The first version wrote the Danish letters into the pattern and ended it with
// \b, and it could never match. JavaScript defines a word boundary on
// [A-Za-z0-9_], so "é" is a NON-word character: after "entré" the next
// character is a space, non-word beside non-word, and \b fails. So
// ticketPriceOn("Entré 400 kr") returned null and the whole finder was dead on
// exactly the Danish pages it was written for.
//
// Same family as the NFD-before-å bug in fold() and the missing word boundary
// in containsName. The answer is the one this codebase already settled on: fold
// the text first and keep the pattern ASCII. fold turns é into e, ø into o, æ
// into ae and å into aa, so one spelling reaches one pattern. It is only ever
// used for a BOOLEAN test here, never for an index, which matters because
// folding æ and å changes the string's length.
const TICKET_WORD = /\b(?:billet(?:ter|priser|pris|salg)?|entrepris|entre|adgangsbillet|adgang|priser|pris|koster|voksne|voksen|born|studerende|tickets|ticket|admission|entry|adults?|child(?:ren)?|concession)\b/g;

// Sold alongside the ticket and priced separately. ANCILLARY above does this for
// a whole listing TITLE; this does it for a word standing next to a price. The
// two lists are deliberately not shared, because matching a title and matching
// inside a sentence want different words.
const BESIDE_THE_TICKET = /\b(?:camping|parkering|parking|shuttle|shuttlebus|natbus|garderobe|cloakroom|merch(?:andise)?|billetgebyr|gebyr|fee|forsikring|insurance|leje|rental|depositum|deposit)\b/;

// How far before a figure the ticket word may sit. Wide enough for "Billetter
// til festivalen koster 400 kr." and narrow enough that a price four sentences
// later is not attributed to it.
export const TICKET_WINDOW = 80;

// FREE IS AN ANSWER, not an absence, and it is the most common answer for the
// small Danish events this app exists to write about. A finder that can only
// report a number reports nothing for a free festival, and nothing reads
// identically to having failed.
// Folded before matching, for the same reason and with the same trap: "fri
// entré" ends in a non-word character, so a trailing \b would refuse it.
const FREE_PHRASE = /\b(?:gratis(?:\s+adgang|\s+entre)?|fri\s+entre|fri\s+adgang|gratis\s+at\s+deltage|free\s+(?:entry|admission|to\s+attend)|no\s+ticket\s+required)\b/;
const saysFreeIn = (text) => FREE_PHRASE.test(fold(text));

// What a PAGE says a ticket costs. null when it does not say, which is a real
// and common answer and is never dressed up as zero.
export const ticketPriceOn = (text) => {
  const t = String(text || "");
  if (!t.trim()) return null;
  const found = [];
  for (const p of pricesIn(t)) {
    if (!p.currency) continue;                       // a bare number is not a price
    const before = fold(t.slice(Math.max(0, p.at - TICKET_WINDOW), p.at));
    TICKET_WORD.lastIndex = 0;
    if (!TICKET_WORD.test(before)) continue;         // nothing here says this is a ticket
    if (BESIDE_THE_TICKET.test(before)) continue;    // it is the camping, or the booking fee
    found.push(p);
  }
  if (found.length) {
    // THE LOWEST, and it is a choice rather than an obvious default. A ticket
    // page lists adult, child, student and multi-day, and what a reader plans
    // around is what it costs to get in at all. The full set travels alongside
    // so a caller can say "from".
    const lo = found.reduce((a, b) => (b.lo < a.lo ? b : a));
    return { kind: "price", lo: lo.lo, hi: lo.hi, currency: lo.currency, all: found, free: false };
  }
  // Only reached when no price was found, so a page saying "free for children,
  // 200 kr for adults" reports the 200 rather than calling the whole thing free.
  if (saysFreeIn(t)) return { kind: "free", lo: 0, hi: 0, currency: null, all: [], free: true };
  return null;
};

// ── WHOSE PAGE SAID IT, WHICH IS THE REST OF THE ANSWER ─────────────
// Oliver, 12 Aug 2026: "I want to make it clear that the tickets on the official
// website HAS TO BE PRIORITISED. Otherwise Tavily and Perplexity might take some
// 2024 blog and put in their ticket prices." And 13 Aug, choosing what may count
// as measured: the festival's own ticket page, "And websites such as
// Ticketmaster where some tickets are put in."
//
// Two tiers, in his order, and the tier is part of the answer rather than a
// footnote: a price from the operator can be stated flatly, a price from a
// reseller has to say where it came from. Same split tracePrices already draws
// between `traced` and `listed`, reused rather than reinvented.
export const findTicketPrice = ({ siteText = "", listingText = "" } = {}) => {
  const site = ticketPriceOn(siteText);
  if (site) return { ...site, from: "official-site", why: "the operator's own page states it" };
  const listing = ticketPriceOn(listingText);
  if (listing) return { ...listing, from: "listing", why: "a ticket shop or calendar states it and the operator's own page does not" };
  return null;
};

const moneyText = (p) => `${p.lo}${p.hi !== p.lo ? ` to ${p.hi}` : ""} ${String(p.currency).toUpperCase()}`;
const whoSaid = (from) => (from === "official-site" ? "The operator's own page" : "A ticket shop or calendar");

// ── THE FINDING, WHICH IS THE POINT OF ALL OF THIS ──────────────────
// A draft with no price beside a page that states one is the case that used to
// pass silently. It is reported as a MISS rather than written into the entry
// here: the figure goes back through the writer and through every gate a
// written price already passes, so nothing in this file becomes a second,
// unchecked way into a published field.
export const priceMisses = (draftText, opts) => {
  const found = findTicketPrice(opts);
  if (!found) return [];
  const stated = pricesIn(String(draftText || "")).filter(p => p.currency);
  const saysFree = saysFreeIn(draftText);
  if (found.free) {
    return saysFree || stated.length ? [] : [{
      severity: "medium", field: "ticketInfo",
      detail: `${whoSaid(found.from)} says entry is free and this draft does not say so. Free is an answer a reader plans around, and leaving it out reads as unknown.`,
    }];
  }
  if (stated.some(p => p.lo === found.lo && p.hi === found.hi)) return [];
  if (!stated.length) {
    return [{
      severity: "high", field: "ticketInfo",
      detail: `${whoSaid(found.from)} states a ticket price of ${moneyText(found)} and this draft states none. Nothing in this run had gone looking for a price before, so a missing one has always read as a clean pass.`,
    }];
  }
  return [{
    severity: found.from === "official-site" ? "high" : "medium",
    field: "ticketInfo",
    detail: `${whoSaid(found.from)} states ${moneyText(found)} and this draft states ${stated.map(moneyText).join(", ")}. ${found.from === "official-site" ? "The operator's own page outranks everything else on its own price." : "Worth checking which edition, or which ticket type, each figure is for."}`,
  }];
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
  // ── PROVENANCE IS NOT DOUBT, AND THIS SENTENCE CONFUSED THEM ─────
  // Oliver, 12 Aug 2026, on a draft whose ticketInfo said "400 kr; not
  // confirmed directly by the organiser" and whose Reality Check called it an
  // estimate: "I mean.. it is.. it shouldn't be considered an estimate. IT IS
  // 400 DKK." Esbjerg Kommune's own page says "Billet til festivalen koster
  // 400 kr", and Udviklingscenter Vest IS Esbjerg Kommune.
  //
  // The hedge came from HERE. This used to end "and it is still not the
  // operator's word for it", which is a true statement about PROVENANCE that
  // the writer quite reasonably read as a statement about CONFIDENCE. A price
  // published on a current ticket site is a real price: the calendar did not
  // invent it, the operator gave it to them. Which source it came from belongs
  // in __sources. It does not belong in a sentence that makes a reader think
  // the number might be wrong.
  const listedNote = (r.listed || []).length
    ? ` Also stated on a current ticket site or event calendar rather than on the operator's own page: ${r.listed.map(showPrice).join(", ")}. THAT IS A REAL, CURRENT PRICE AND IT IS WRITTEN AS ONE. A calendar or ticket shop publishes what the operator gave it. Do not call it an estimate, do not write that it is unconfirmed or not verified by the organiser, and do not tell a reader to ring and check. Which source it came from is recorded in __sources.`
    : "";
  if (!r.untraced.length) {
    return r.traced.length
      ? `Every price in this draft (${r.traced.map(showPrice).join(", ")}) appears in the official site's own text.${listedNote}`
      : `Every price in this draft is stated by a source that was actually read.${listedNote}`;
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
  // Oliver, 12 Aug, on a later draft: "One listing shows 400 kr, another calls
  // it free; this hasn't been confirmed with the organiser, so call ahead."
  // The contracted perfect slipped past every pattern above, and the errand on
  // the end was only being policed in gemlyxFind.
  [/\b(?:has|have|had)\s*(?:n[o']?t|not)\s+been\s+(?:confirmed|verified|checked)\b/i, "reports that a check came up empty"],
  [/\bremains?\s+(?:unconfirmed|unverified|unclear)\b/i, "reports that a check came up empty"],
  [/\b(?:one|another|other)\s+(?:listing|source|site)s?\s+(?:shows?|says?|calls?|lists?|gives?)\b/i, "narrates two sources disagreeing"],
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
// Which KIND of leak, because the repair differs. A clause that is entirely a
// report about the search has no fact in it and is deleted. A clause that
// states a fact and then credits a source keeps the fact and loses the credit.
export const glanceLeakKind = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  for (const [re] of SEARCH_REPORT) if (re.test(v)) return "report";
  for (const [re] of ERRANDS) if (re.test(v)) return "errand";
  for (const [re] of ATTRIBUTION) if (re.test(v)) return "attribution";
  return "";
};

// ── AND NOW ACTUALLY FIX IT ─────────────────────────────────────────
//
// Oliver, 12 Aug 2026, on a draft whose ticketInfo read "400 kr per the
// KultuNaut listing; not confirmed directly by the organiser": ":/". The gate
// above had ALREADY CAUGHT IT. It returned a finding, the finding went into
// uncertainties, and the field went out unchanged. Earlier the same evening:
// "I don't wanna just write it in. I want the pipeline to fix it."
//
// That is the honest flaw in a night of gates. Every one of them reports.
// Reporting is right where a repair would be a guess: a price that did not
// come from the operator is unproven rather than wrong, and deleting it would
// be this pipeline inventing in the other direction. It is NOT right here.
// A glance field's repair needs no research and no judgement, because the fact
// and the commentary are separated by a semicolon and the commentary is
// recognisable by pattern. "400 kr per the KultuNaut listing; not confirmed
// directly by the organiser" repairs to "400 kr", deterministically, and the
// provenance it drops is already in __sources where it belongs.
//
// An empty result is a real result. If every clause was commentary there was
// never a fact in the field, and an empty field reads honestly as "we do not
// know" while a field full of hedging reads as a price.
const CREDIT = /\s*[,;]?\s*\b(?:per|according to|as listed on|as per|via)\s+(?:the\s+)?[A-Za-z0-9ÆØÅæøå.-]+(?:\s+(?:listing|calendar|site|page|listings))?/gi;

export const cleanGlance = (value) => {
  const v = String(value || "").trim();
  if (!v) return v;
  const kept = v.split(/\s*;\s*/).map(part => {
    const t = part.trim();
    if (!t) return "";
    const kind = glanceLeakKind(t);
    // A whole clause of commentary has no fact to save.
    if (kind === "report" || kind === "errand") return "";
    if (kind === "attribution") {
      // ── AND NO GUARD ON THE RESULT, WHICH MUTATION PROVED ────
      // This read `stripped.length >= 2 && glanceLeakKind(stripped) === ""`.
      // Both halves are unreachable. glanceLeakKind checks reports and errands
      // BEFORE attribution, so a clause that reaches this branch has neither,
      // and removing text cannot introduce one. A clause that is only a credit
      // strips to "" and is dropped by the filter below either way. Deleting a
      // condition no mutation can distinguish, rather than writing a contrived
      // test to defend it: the same call this file's own DISAGREEMENT_RATIO
      // note describes making, for the same reason.
      return t.replace(CREDIT, "").replace(/\s{2,}/g, " ").replace(/[,;:]\s*$/, "").trim();
    }
    return t;
  }).filter(Boolean);
  return kept.join("; ");
};

export const glanceLeak = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  for (const [re, why] of SEARCH_REPORT) if (re.test(v)) return why;
  for (const [re, why] of ATTRIBUTION) if (re.test(v)) return why;
  // An errand belongs in no short field either, not only in gemlyxFind. "so
  // call ahead" sitting where a price goes is the same failure as "check
  // rejseplanen.dk" sitting where a station name goes, which is the case this
  // whole rule was written for. GO_CHECK is declared below, and a const
  // declaration is hoisted into the module scope before this ever runs.
  for (const [re, why] of ERRANDS) if (re.test(v)) return why;
  return "";
};

// The subset of GO_CHECK that is wrong in a glance field regardless of which
// field it is. Kept separate from GO_CHECK rather than reusing it whole,
// because "check the website" is a legitimate short answer in a price field and
// a bad one in the single curated find.
const ERRANDS = [
  [/\b(?:so |then )?call\s+(?:ahead|them|first|the\s+\w+)/i, "tells the reader to phone instead of answering"],
  [/\b(?:check|confirm)\s+(?:with\s+)?(?:the\s+)?(?:organiser|organizer|venue|operator|them)\b/i, "tells the reader to go and check"],
  [/\b(?:check|consult|look\s*up)\s+(?:on\s+)?(?:rejseplanen|the journey planner)/i, "sends the reader to a journey planner"],
];

// ── REPAIRS, AND SAYS SO ────────────────────────────────────────────
// MUTATES the payload, which nothing else in this file does, and that is the
// point: reporting a glance leak and shipping it anyway is what happened all
// evening. Every repair is journalled, because a silent edit is its own kind of
// unaccountable, and the note names the before and the after so a wrong repair
// is visible rather than quietly wrong.
export const repairGlance = (payload, fields = GLANCE_FIELDS) => {
  const out = [];
  for (const k of fields) {
    const before = payload?.[k];
    const why = glanceLeak(before);
    if (!why) continue;
    const after = cleanGlance(before);
    if (after === String(before || "").trim()) {
      // Recognised but not repairable by pattern. Report it, as before.
      out.push(`${k} ${why}: "${String(before).trim().slice(0, 140)}". A glance field is the answer a reader scans, so provenance belongs in __sources and doubt belongs in uncertainties. Put the plain fact here, or leave it empty.`);
      continue;
    }
    payload[k] = after;
    out.push(after
      ? `${k} ${why}, so it was cut back to the fact: "${String(before).trim().slice(0, 100)}" became "${after.slice(0, 100)}". The source is in __sources and the doubt is in this list, which is where a reader can act on them.`
      : `${k} was emptied. It ${why} and stated no fact underneath: "${String(before).trim().slice(0, 120)}". An empty field reads as "we do not know"; a field of hedging reads as an answer.`);
  }
  return out;
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

// ── A DRAFT MUST NOT PUBLISH AN INVENTION AND ITS RETRACTION ────────
//
// Oliver, 12 Aug 2026, quoting a fact-check of his own draft: "The writer layer
// is still introducing poetic claims that your validation layer immediately
// rejects." The draft's atmosphere said "Coach loads of visitors arrive from
// around the country", and the draft's own uncertainties said that could not be
// confirmed. Both shipped. Then: "I don't wanna just write it in. I want the
// pipeline to fix it."
//
// THIS ONE IS MINE, FROM THREE HOURS EARLIER. When I gave the auto-correction
// the CONTRADICTED/UNVERIFIED split I told it, in as many words, to "leave an
// UNVERIFIED claim exactly as it is and add a line to uncertainties instead".
// That is right for a MEASURED field: a price the checker could not find may
// still be the real price, and deleting it would be the fact-check undoing a
// fact-check. It is exactly wrong for PROSE. In a sentence nobody sourced,
// "unverified" does not mean "we could not check it", it means the writer made
// it up, and the honest edit is to delete it.
//
// So this is the enforcement, not the request. A quoted claim that the draft's
// own uncertainties call unsupported must not still be sitting in its prose.
const RETRACTS = /\b(?:not stated in the research|could not be confirmed|not supported|unverified|no source|nothing (?:states|supports)|was not found)\b/i;
// Findings quote the claim they are about, and the checker's output arrives
// with markdown emphasis around it. Both shapes, and the quotes themselves are
// not part of the claim.
const QUOTED = /[""]([^""]{4,200})[""]|\*\*([^*]{4,200})\*\*/g;

export const PROSE_FIELDS = ["atmosphere", "whoItsFor", "realityCheck", "desc", "special", "whoFor", "afterDark", "beforeDark", "bestTime", "howItsMade", "vibeLocation", "characterAndFit", "whatToDo", "gettingThereReality", "highlight"];

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").replace(/[*"""]/g, "").trim();

export const selfContradictions = (payload) => {
  const notes = Array.isArray(payload?.uncertainties) ? payload.uncertainties : [];
  const prose = PROSE_FIELDS.map(k => norm(payload?.[k])).filter(Boolean).join(" ␟ ");
  if (!prose) return [];
  const out = [];
  for (const line of notes) {
    if (!RETRACTS.test(String(line))) continue;
    QUOTED.lastIndex = 0;
    let m;
    while ((m = QUOTED.exec(String(line))) !== null) {
      const claim = norm(m[1] || m[2]);
      // Short fragments match by accident; a claim worth deleting is a clause.
      if (claim.length < 12 || !prose.includes(claim)) continue;
      out.push(`This draft states "${claim.slice(0, 120)}" in its prose AND says in its own uncertainties that it is unsupported. One of the two has to go, and it is the sentence: an unsourced line in prose is an invention rather than a doubt, so delete it rather than publishing the claim and the retraction together.`);
    }
  }
  return [...new Set(out)];
};

// ── WHICH PAGE THE PRICE CAME FROM, AS DATA ─────────────────────────
//
// Oliver, 12 Aug 2026: "Then write the page it got it from.. it got it from a
// very very reliable source."
//
// He is right and it resolves the tension in the two messages before it. He
// does not want provenance in ticketInfo, because a glance field is an answer
// and "400 kr per the KultuNaut listing" reads as part of the price. He does
// want it KNOWN, because Esbjerg Kommune's own page saying 400 kr is worth far
// more than a hedge saying nobody confirmed it.
//
// Those are the same requirement with different homes. The fact goes in the
// field, and the page goes in structured data where the UI can render it as a
// link and the reader can click it. __ticket already exists for exactly this
// and has been carrying { source: "writer" } because nothing ever filled it in
// from a real page.
//
// pagesByUrl is a map of url to the text actually read from it, so this reports
// where a price WAS SEEN rather than guessing from a source list.
// ── AND IT ASKS THE BEST PAGE FIRST, NOT THE FIRST PAGE ─────────────
// Oliver, 12 Aug 2026, on a draft whose __sources listed
// oplev.esbjerg.dk, Esbjerg Kommune's own page for its own festival, and whose
// __priceSource credited kultunaut.dk: "!?!?!?!?!!?!?!?!?"
//
// Fair. The first version of this walked Object.entries and returned the FIRST
// page whose text contained the figure, which is insertion order, which is
// whatever got scraped first. I had built the source hierarchy ninety minutes
// earlier and then written a function that ignored it. The organiser's own
// page was sitting in the same map.
//
// `order` is a list of hosts, best first, as rankSources produces it. Pages on
// no known host are tried last rather than dropped: a page that states the
// price is still where the price came from, even if nothing ranked it.
export const priceSource = (priceText, pagesByUrl, order = []) => {
  const wanted = pricesIn(priceText).filter(p => p.currency).map(priceKey);
  if (!wanted.length) return null;
  const hostOf = (u) => { try { return new URL(String(u)).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
  const rankOf = (u) => {
    const h = hostOf(u);
    const i = order.findIndex(x => { const o = String(x).toLowerCase().replace(/^www\./, ""); return h === o || h.endsWith(`.${o}`); });
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const urls = Object.keys(pagesByUrl || {}).sort((a, b) => rankOf(a) - rankOf(b));
  for (const url of urls) {
    const here = new Set(pricesIn(pagesByUrl[url]).map(priceKey));
    const hit = wanted.find(k => here.has(k));
    if (hit) return { url, price: hit, host: hostOf(url), ranked: rankOf(url) !== Number.MAX_SAFE_INTEGER };
  }
  return null;
};
