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

import { scanForAITells, fillerWordCounts, haversineKm } from "./helpers";
// townPointFor, so the station check measures against the same town library the
// map, the route order and the weather all use. A second table of Danish town
// coordinates in this file would disagree with that one within a week.
import { townPointFor } from "./guideEnrichment";
import { claimConflicts, implausibleWalks } from "./claimCheck";
// Every coordinate rule, including the schema-example pair that used to be
// declared here as two loose constants. One file owns them now, because the
// publish gate and this audit have to agree about what counts as wrong, and two
// copies of a threshold is the failure this codebase repeats most.
import { coordProblems } from "./coordCheck";
// fold, because a Danish word ending in é, ø, æ or å cannot carry a \b word
// boundary in JavaScript. See TICKET_WORD.
import { fold, variantsOf, GENERIC_PLACE_WORDS } from "./danishNames";
import { isReferenceHost } from "./pageScan";
import { tierOf, TIERS } from "./placeThemes";
import { QUERY_WORDS } from "./sourcePolicy";
import { stayContradiction, restatementFindings } from "./draftShape";

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
// ── AND THE CURRENCY CAN COME FIRST ─────────────────────────────────
//
// Found by a third reviewer, 14 Aug 2026, and it is the first-order bug behind
// the whole Roskilde price problem. This pattern read a currency only AFTER the
// number, so the operator's own English page:
//
//     "eight instalments of DKK 327, plus a DKK 100 ticket fee.
//      The total price is DKK 2,720."
//
// produced three figures all carrying `currency: null`, ticketPriceOn returned
// null, and priceMisses passed in silence. Every gate downstream of pricesIn
// inherits that blindness, so on a page written this way the entire price layer
// is switched off and reports nothing at all.
//
// Neither of the two outside proposals found this. One said the model
// hallucinated the price and the other said the parser found it and refused to
// use it. It never found it.
//
// "DKK 2,720" and "kr. 150" are how English pages and many Danish ones write
// it, so the token is allowed on either side. Only ONE side is read into the
// result: a prefix currency wins when there is no suffix, which cannot produce
// a figure carrying two different currencies.
const CUR = "(eur\\b|euros?\\b|€|dkk\\b|kroner\\b|kr\\.?)";
// The whitespace belongs INSIDE the optional prefix. Written as `${CUR}?\\s*`
// the group matches empty and `\\s*` then eats the space in front of the
// number, so every `at` shifted one character left and priceForNoun, which
// compares a price position against a noun position, started handing the water
// the hot dog's price. Caught by a fixture that predates today.
const PRICE_RE = new RegExp(`(?:${CUR}\\s*)?${NUM}\\s*(?:(?:–|—|-|to)\\s*${NUM})?\\s*${CUR}?`, "gi");

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
    const lo = toNumber(m[2]);
    const hi = m[3] ? toNumber(m[3]) : lo;
    if (lo == null || hi == null) continue;
    // Suffix first, because "DKK 150 kr" is not a real shape and if it ever
    // appears the trailing token is the one a Danish reader trusts.
    const cur = normCurrency(m[4]) || normCurrency(m[1]);
    // A bare four-digit number in living memory is a year, not a price.
    if (!cur && lo >= 1000 && lo <= 2100 && !m[3]) continue;
    // ── AND HOW LONG THE MATCH WAS ────────────────────────────────
    // The after-windows used to start at `at + String(lo).length + 6`, a guess
    // at how far the number and its currency token ran. On "400 kr. Billetgebyr
    // 30 kr" that guess overshoots the full stop, so the window opens INSIDE
    // the next sentence and the fee word there is read as belonging to the 400.
    // The real length is right here in the match and never needed guessing.
    out.push({ at: m.index, len: m[0].length, lo: Math.min(lo, hi), hi: Math.max(lo, hi), currency: cur });
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
// The language of a verdict about checking, as opposed to the language of a
// travel guide. Written narrowly: an entry may legitimately say a price is
// unconfirmed IN uncertainties, and may legitimately use the word "confirmed"
// about the world ("confirmed for 2027"). What is caught is a sentence whose
// SUBJECT is the checking.
const VERDICT_AS_PROSE = /\b(?:the claim|this claim|the claims)\b[^.!?]{0,60}\b(?:not|could not|cannot)\b|\b(?:not|could not|cannot) be confirmed by\b|\bthe checked sources\b|\bnot (?:stated|supported) (?:in|by) the (?:research|sources|checked)\b|\bno source (?:states|confirms|supports)\b/i;

// A duration or a distance in a field that is not about the journey. Both
// forms this app actually produces: "4 hours 9 minutes", "5h 39min", "363 km".
const LOGISTICS_IN_PROSE = /\b\d+\s*(?:h|hr|hrs|hour|hours)\b[^.!?]{0,12}\b\d+\s*(?:m|min|mins|minute|minutes)\b|\b\d+\s*(?:km|kilometres|kilometers)\b|\b\d+\s*(?:min|mins|minutes)\b[^.!?]{0,20}\b(?:by (?:train|bus|car|ferry|bike)|on foot|drive|driving)\b/i;

// The Find repeating the body. Compared on the distinctive words rather than on
// the sentence, because a rewrite that changes the wording and keeps the fact
// is the same failure: "Ebeltoft Gårdbryggeri's café and taproom sit on a farm
// dating from 1860" against "Ebeltoft Gårdbryggeri's taproom on the 1860 farm".
const duplicatesBody = (find, payload) => {
  const words = (t) => new Set(String(t || "").toLowerCase().replace(/[^a-z0-9æøå ]/g, " ").split(/\s+/).filter(w => w.length >= 5));
  const f = words(find);
  if (f.size < 3) return false;
  const body = words([payload?.desc, payload?.special, payload?.atmosphere, ...(Array.isArray(payload?.blogBody) ? payload.blogBody.map(b => b?.content) : [])].join(" "));
  if (!body.size) return false;
  let shared = 0;
  for (const w of f) if (body.has(w)) shared++;
  // Two thirds of a short curated line already being in the body is a repeat,
  // not an echo. Set high enough that a Find naming the same PLACE with a
  // genuinely new detail still passes.
  return shared / f.size >= 0.67;
};

export const auditEntry = (row) => {
  const p = row?.payload || {};
  const type = row?.type || "";
  const findings = [];
  const add = (severity, field, detail) => findings.push({ severity, field, detail });

  // ── THE SHAPE OF THE DRAFT, NOT ITS FACTS ─────────────────────
  // Oliver, 15 Aug 2026, on the Billund draft: the glance box said "A day trip"
  // while the body said the three parks together need two or three, and three
  // of the four secondary fields were the body again in different words. Both
  // rules are already written into studioPrompts.js and neither was checked.
  // See utils/draftShape.js, which is measured against that real draft rather
  // than invented prose.
  const stayClash = stayContradiction(p);
  if (stayClash) findings.push(stayClash);
  findings.push(...restatementFindings(p));

  const all = textOf(p);

  // ── A VENUE NOBODY COULD CONFIRM IS NOT AN ENTRY ────────────────
  //
  // Oliver, 19 Aug 2026, on a published nightlife page called Folk: "clicking
  // 'Folk' with a first glance saying 'unverified...' I mean.. I'll probably
  // delete that blog." Then, on where it came from: "'Folk' was a websearch by
  // perplexity (I think). Apparently, the place turned out to not exist
  // according to Google Gemini, saying it was an event and called something
  // else."
  //
  // THE PIPELINE WAS HONEST AND NOTHING READ IT. The entry says so itself, in
  // its own opening paragraph: "no confirmed hours, no drinks list, no solid
  // word on who shows up or when. This entry exists to flag that gap honestly."
  // At a Glance says "Type: Unconfirmed venue type". The draft reported, in
  // writing, that it had confirmed nothing, and publishDraft had gates for the
  // date, the coordinate and the tier and none for this.
  //
  // ── WHY IT IS DIFFERENT FROM A MISSING PRICE ────────────────────
  // An entry with no price is an entry with a gap. An entry that cannot say
  // WHAT THE PLACE IS has no subject: there is nothing left for the rest of the
  // page to be about, and every honest sentence in it is a sentence about the
  // research rather than about Denmark. That is why this is critical and a
  // missing price is not.
  //
  // PRICE_UNCHECKED is the precedent. This codebase already names the
  // placeholder that stands in for an unchecked price, precisely so it can be
  // recognised later rather than read as content. Identity had no such name, so
  // "Unconfirmed venue type" travelled all the way to a reader's screen as
  // though it were the venue's type.
  //
  // Deliberately matched on the ADMISSION, not on emptiness. An empty type field
  // is a gap somebody can fill; a type field that says it could not be confirmed
  // is a draft reporting that the place could not be established at all.
  const identity = String(p.category ?? p.type ?? "");
  if (UNCONFIRMED_IDENTITY.test(identity)) {
    add("critical", "type", `The venue type reads "${identity.slice(0, 60)}", which is the draft saying it could not establish what this place is. An entry whose subject is unconfirmed has nothing for the rest of the page to be about. Confirm what it is, or delete the entry.`);
  }
  // And the same admission made in prose, which is where it did the most damage:
  // the opening paragraph a reader meets first.
  if (VENUE_KINDS.includes(type) && UNVERIFIED_PROSE.test(String(p.desc || ""))) {
    add("critical", "desc", "The opening paragraph tells the reader this is not a verified guide. Saying so is better than hiding it, but a page that opens by disclaiming itself should not have been published: put what could not be confirmed in uncertainties, or delete the entry.");
  }

  // ── AN AT A GLANCE BOX WITH ONE ROW IN IT ───────────────────────
  //
  // Oliver, 19 Aug 2026, on the Rock under broen page: "But the at a glance
  // very lame.." then "We can't have at a glance with so few information".
  //
  // That card renders every row whose value is non-empty and silently drops the
  // rest, so a festival with only accommodationTip filled shows a box headed AT
  // A GLANCE containing one line about booking a hotel. Nothing is broken and
  // nothing is wrong on the page; it just reads as "this is everything worth
  // knowing about this festival", which is not what it means. It means we hold
  // one of the five things.
  //
  // Same shape as the two he reported earlier today: the review panel slicing to
  // six without saying so, and the front page reporting "nothing published in
  // that category" when the category was full. A display that under-reports
  // without admitting it is the recurring fault in this product, and the fix is
  // always the same one, which is to say the number.
  //
  // FLAGGED HERE RATHER THAN HIDDEN ON THE PAGE, because the real fix is to fill
  // the fields, and only he can do that. The reader-facing half is a separate
  // decision: a one-row card could say what it does not have, or not render at
  // all, and which of those is right depends on how much he wants a thin entry
  // to admit its thinness.
  const glanceFilled = GLANCE_FIELDS.filter(f => String(p[f] ?? "").trim()).length;
  if (glanceFilled > 0 && glanceFilled < MIN_GLANCE_ROWS) {
    const missing = GLANCE_FIELDS.filter(f => !String(p[f] ?? "").trim() && LIKELY_GLANCE[type]?.includes(f));
    add("medium", "at a glance",
      `Only ${glanceFilled} At a Glance ${glanceFilled === 1 ? "row has" : "rows have"} a value, so the box renders as though that is everything worth knowing about this entry.`
      + (missing.length ? ` The ones a reader of a ${type} entry expects and this row does not have: ${missing.join(", ")}.` : ""));
  }

  // ── critical: actively misleading ──────────────────────────────
  if (NO_TRANSPORT.test(all)) {
    add("critical", "getting there", "Claims no public transport route exists. This has been wrong every time it was checked, and it tells travelers without a car to skip the place entirely.");
  }
  // ── THE CHECKER'S VERDICT, PUBLISHED AS THE WRITING ─────────────
  //
  // Oliver, 15 Aug 2026, reading gemlyxtravel.com/#/town/hyllestedskovgaarde.
  // The entry opens:
  //
  //   "The claim is not confirmed by the checked sources. It suits someone
  //    already driving through Mols Bjerge..."
  //
  // That is the fact-checker's own verdict, live, as the first sentence a
  // traveller reads. keepProse in utils/correction.js stops it happening to a
  // new draft. It cannot reach a row that is already published, and that row is
  // published, so the audit has to be able to see it.
  //
  // `uncertainties` is exempt: saying what is unconfirmed is that field's job,
  // and it is not prose a reader meets as writing.
  for (const field of ["desc", "atmosphere", "special", "whoFor", "realityCheck", "beforeDark", "afterDark", "gemlyxFind", "highlight", "tip"]) {
    const v = String(p[field] ?? "");
    if (v && VERDICT_AS_PROSE.test(v)) {
      add("critical", field, `Reads as a note about the checking rather than as writing: "${v.slice(0, 90).trim()}...". A reader is not the audience for whether a claim could be confirmed. If it cannot stand, take it out of the sentence and put it in uncertainties.`);
    }
  }

  // ── THE REALITY CHECK IS NOT A TIMETABLE ────────────────────────
  // Every draft prompt that has a realityCheck says the same thing: "2-3 blunt
  // sentences ... Never a logistics note". The Hyllested entry's reads
  //
  //   "Driving from Copenhagen is the sane option, taking about 4 hours 9
  //    minutes over 363 km, compared with 5h 39min by train, light rail and bus
  //    with two changes..."
  //
  // which is the journey, in the field that exists to say whether the place is
  // worth the trip. The travel time has its own field, the journey has its own
  // block, and a rule stated in nine prompts and enforced nowhere is a request.
  if (p.realityCheck && LOGISTICS_IN_PROSE.test(String(p.realityCheck))) {
    add("high", "realityCheck", "Carries the journey rather than the verdict. Every draft prompt says this field is never a logistics note: travelTime, the measured journey and Getting There already hold the minutes and the changes. This field answers whether the place is worth going to.");
  }

  // ── AND THE FIND IS NOT A SECOND COPY OF THE BODY ───────────────
  // Hyllested's body says "Ebeltoft Gårdbryggeri's café and taproom sit on a
  // farm dating from 1860"; its Gemlyx Find says "Ebeltoft Gårdbryggeri's
  // taproom on the 1860 farm." The Find is the one curated thing in the entry
  // and repeating the paragraph above it makes the whole page look automatic.
  if (p.gemlyxFind && duplicatesBody(p.gemlyxFind, p)) {
    add("high", "gemlyxFind", "Repeats what the body already said. This is the one curated line in the entry, and a reader who has just read the same sentence twenty words higher learns nothing from it.");
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

  // ── AND A STATION IN A DIFFERENT TOWN IS NOT THE NEAREST ONE ──────
  // Oliver, 18 Aug 2026, with a draft on screen: town "Copenhagen", nearestStation
  // "Slagelse". Seventy-six kilometres apart, in the same object, and nothing
  // objected — the sentence check above passes because "Slagelse" is a perfectly
  // well-formed station name. It is just not that entry's station.
  //
  // Measured, not asserted: both names go through the town library the rest of the
  // app uses, and the distance is the great circle between them. So this can only
  // ever fire on a station that IS a town Gemlyx knows, which is most of the ones a
  // model writes here ("Slagelse", "Ribe", "Odense") and none of the ones it cannot
  // check ("Nørreport" resolves to nothing, and reports nothing rather than
  // guessing).
  //
  // 25 km, because a real nearest station genuinely can be in the next town for a
  // village entry — Kliplev's is in Aabenraa — and that is a legitimate answer,
  // while a figure this size cannot be reached on foot from the place and is
  // therefore worth a human look either way. CRITICAL because a traveller plans
  // their arrival from this field.
  // ── AN UNRANKED ENTRY IS NOT PUBLISHABLE ──────────────────────────
  // Oliver, 18 Aug 2026: "the tier part should NEVER be left out."
  //
  // The tier is the one field that is entirely Gemlyx's own judgement, and it is
  // what every card, the region picker and the preview's ranking all read. An
  // entry without one is not a thin entry, it is an entry nobody has decided
  // about, sitting on a page that exists to give an opinion.
  //
  // CRITICAL, and specifically because of what used to happen instead:
  // shapeForLive read `t.tier || "Worth Considering"`, so an unjudged entry was
  // silently given a rank by a logical or. Removing that default is what makes
  // this check necessary and what makes it possible.
  //
  // Only for the types that HAVE a tier. Asked of the value rather than of a list
  // of type names: a type whose draft carries the field must fill it, and one that
  // never carries it is not being scolded for a field it does not have.
  if ("tier" in p) {
    const ranked = tierOf(p);
    const said = String(p.tier ?? "").trim();
    if (!said) {
      add("critical", "tier", `No tier. This is Gemlyx's own judgement about whether the place is worth planning around, and it is what the cards, the region picker and the preview all rank on. Pick one of: ${TIERS.map(t => t.label).join(", ")}.`);
    } else if (!ranked) {
      add("critical", "tier", `The tier reads "${said.slice(0, 40)}", which is not one Gemlyx recognises, so tierOf returns null and every card shows no rank at all. Use one of: ${TIERS.map(t => t.label).join(", ")}.`);
    }
  }

  const nsTown = ns ? townPointFor(ns) : null;
  const entryTown = townPointFor(p.town || p.city || "");
  // No `nsTown.key !== entryTown.key` guard: mutation testing showed removing it
  // changed no result, and it cannot — two identical keys resolve to one point, so
  // the distance is zero and the threshold below already declines. It was a
  // short-circuit dressed as a rule.
  if (nsTown && entryTown) {
    const apart = haversineKm({ lat: nsTown.lat, lon: nsTown.lon }, { lat: entryTown.lat, lon: entryTown.lon });
    if (Number.isFinite(apart) && apart > 25) {
      add("critical", "nearest stop", `The Nearest Station is ${Math.round(apart)} km from the town this entry names: it says ${entryTown.key} and the station is in ${nsTown.key}. One of the two is wrong, and a traveller plans their arrival off this field. If the station is right the town is wrong, which usually means the research was about a different place.`);
    }
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

// ── AND A SPAN IS NOT A POINT ───────────────────────────────────────
//
// Oliver, 13 Aug 2026, on a trace that read "NOT FROM THE OFFICIAL SITE: 15 to
// 135 DKK": "it shouldn't consider that an error. It was perfectly correct,
// because it was taken from the ticket agent."
//
// He is right and the trace was comparing the wrong shapes. priceKey turns a
// price into "lo-hi" and the comparison was string equality on that key, so a
// ticket page listing its tiers one per line:
//
//     Dagsbillet fredag  135 kr        ->  135-135
//     Børnebillet         15 kr        ->   15-15
//
// produces no key that equals "15-135", and a draft that summarises those tiers
// as a span was reported as coming "from a search result or a blog rather than
// from whoever charges it". Both of its numbers were read off the ticket page
// this pipeline fetched itself.
//
// And summarising a tier list as a span IS THE CORRECT WRITING. A reader wants
// to know what a day costs and what the range is, not four lines of Danish
// ticket categories. So the gate was punishing the writer for doing the right
// thing, which is the worst kind of gate: it teaches the pipeline to write
// worse in order to pass.
//
// The rule that fixes it, in both directions, because this is one defect and
// not two: A PRICE IS SUPPORTED WHEN EVERY NUMBER IT NAMES IS A NUMBER THE
// SOURCE NAMES. "15 to 135" needs a 15 and a 135 somewhere on the page. "135"
// on its own needs a 135, which is also satisfied by a page that says "15 to
// 135", and that is the same bug seen from the other end: a draft quoting one
// real tier off a page that states a range was untraceable too.
//
// Endpoint membership, deliberately, rather than "is the draft's span inside
// the page's span". A page listing a 275 kr partout beside a 15 to 135 kr day
// ticket is not evidence that "15 to 135" is wrong, because those are different
// products. Whether a range COVERS everything sold is a real and separate
// question, and it is not this one.
const priceNumbers = (list) => {
  const out = new Set();
  (list || []).forEach(p => { out.add(p.lo); out.add(p.hi); });
  return out;
};
const numbersPresent = (nums, p) => nums.has(p.lo) && nums.has(p.hi);

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
  // Both forms kept. The exact key still matches first, because a page and a
  // draft stating the same span is the strongest agreement there is; the number
  // sets are what catch a span written out of a tier list. See priceNumbers.
  const site = new Set(pricesIn(official).map(priceKey));
  const seenOnListing = new Set(pricesIn(listing).map(priceKey));
  const siteNums = priceNumbers(pricesIn(official));
  const listingNums = priceNumbers(pricesIn(listing));
  const onSite = (p) => site.has(priceKey(p)) || numbersPresent(siteNums, p);
  const onListing = (p) => seenOnListing.has(priceKey(p)) || numbersPresent(listingNums, p);
  return {
    checked: true, why: "", draft,
    traced: draft.filter(onSite),
    // The operator's own page wins outright. A figure that appears on BOTH is
    // traced, not listed, because the better provenance is the true one.
    listed: draft.filter(p => !onSite(p) && onListing(p)),
    untraced: draft.filter(p => !onSite(p) && !onListing(p)),
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

// ── AND A TICKET TO SOMETHING INSIDE IT IS NOT ADMISSION ────────────
//
// BESIDE_THE_TICKET catches what is sold ALONGSIDE the ticket. This catches
// what is sold INSTEAD of it: a separately ticketed activity that happens
// within the place or the festival. A museum page reading "Entré 180 kr.
// Rundvisning 50 kr." offers two real prices, and the lowest-open-price rule
// takes the 50 — publishing a guided tour as the cost of getting in.
//
// Every one of these names an activity you attend, not a way through the gate,
// and the distinction is the whole care of this list:
//
//   IN, deliberately: rundvisning, omvisning, guided tour — a tour of the place
//   you have already paid to enter. workshop, kursus, foredrag, smagning — a
//   scheduled thing with its own door.
//
//   OUT, deliberately: dagsbillet, partout, enkeltbillet, and every other way
//   of slicing admission itself. This file's own comment says why — "a ticket
//   page lists day and multi-day and what a reader plans around is the cheapest
//   way through the gate" — and a day ticket IS through the gate.
//
//   OUT, reluctantly: "koncert". A music festival's page says it in every
//   second sentence about its own programme, and catching it would throw away
//   the admission price on exactly the pages this app writes about most. A
//   single-concert ticket priced on a festival page is a real miss and it stays
//   a miss rather than being paid for with false positives everywhere else.
const A_THING_INSIDE = /\b(?:rundvisning(?:er)?|omvisning(?:er)?|guided\s+(?:tour|walk)|guidet\s+tur|workshop(?:s)?|kursus|kurser|course|foredrag|lecture|smagning|tasting|sejltur|boat\s+trip)\b/;

// How far before a figure the ticket word may sit. Wide enough for "Billetter
// til festivalen koster 400 kr." and narrow enough that a price four sentences
// later is not attributed to it.
export const TICKET_WINDOW = 80;

// ── A MEMBERS RATE IS NOT THE PRICE ─────────────────────────────────
//
// Oliver's Food Festival Aarhus run, 13 Aug 2026, and this one is a fault in
// code written an hour earlier. The finder reported:
//
//   22. What the pages say a ticket costs
//       got: 100 DKK, from the operator's own page
//
// Gemini, reading the same page: "your internal note mentions the operator's
// site stating 100 DKK — this is actually the special discounted rate for IDA
// members." The real table is 110 day and 170 partout in presale, 140 and 205
// at the gate.
//
// So "take the lowest" was wrong, and wrong in the dangerous direction: a
// confident figure with the best possible provenance, off the operator's own
// page, that almost nobody can actually pay. The reasoning behind lowest was
// "what it costs to get in at all", and that is right only among prices ANYONE
// can buy. A rate you have to be a member, a student, a pensioner or a child to
// use is a different claim.
//
// Danish first again, and folded, for the fourth time this week.
const CONCESSION = /\b(?:medlem(?:mer|skab)?|ida|foreningsmedlem|studerende|student|elev|pensionist|senior|efterloen|born|barn|child|children|ungdom|unge|youth|handicap|ledsager|gruppe|grupper|group|rabat|discount|klub)\b/;

// Not a discount, a CONDITION on the same ticket, and it changes the number a
// reader should plan around: presale 110 against 140 at the gate. Carried on
// the answer rather than filtered out, so a finding can say which one it is
// instead of quoting a bare figure that is true only until a deadline.
const WHEN_SOLD = [
  ["in presale", /\b(?:forsalg|foersalg|presale|pre-sale|online|foraf|indtil)\b/],
  ["at the gate", /\b(?:ved\s+indgangen|i\s+doren|paa\s+dagen|at\s+the\s+(?:gate|door)|on\s+the\s+day|door\s+price)\b/],
];
const whenSold = (folded) => (WHEN_SOLD.find(([, re]) => re.test(folded)) || [""])[0];

// ── AND THE CONDITION CAN SIT ON EITHER SIDE ────────────────────────
// Danish writes it both ways in the same paragraph: "Ved indgangen koster
// dagsbilletten 140 kr" puts it BEFORE, "110 kr i forsalg" puts it AFTER. A
// before-only window read the first and missed the second, so the presale
// figure travelled with no condition attached and would have been quoted flat.
//
// The window after is cut at the first full stop or at the NEXT price, whichever
// comes first, so "110 kr i forsalg. Ved indgangen 140 kr" cannot lend the gate
// condition to the presale figure. That is the same discipline priceForNoun
// already uses to stop one noun stealing the next noun's price.
const AFTER_WINDOW = 40;

// ── AND THE WINDOW BEFORE IS CUT AT THE SENTENCE, TOO ───────────────
// Caught by a fixture that already existed: "Gratis for børn. Voksne 200 kr."
// The 80-character window reaches back past the full stop, finds "børn", and
// marks the ADULT price as a concession, so a page pricing a real ticket
// reported that it prices only concessions. A qualifier belongs to its own
// sentence.
//
// Newlines are deliberately NOT a boundary. A Danish price table is one row per
// line, "Voksne\n200 kr", and breaking there would strip every label off every
// figure, which is the opposite failure and a worse one.
const sentenceBefore = (t, at) => {
  const w = t.slice(Math.max(0, at - TICKET_WINDOW), at);
  const cut = Math.max(w.lastIndexOf("."), w.lastIndexOf(";"), w.lastIndexOf("!"));
  return fold(cut >= 0 ? w.slice(cut + 1) : w);
};
// ── AND SO CAN THE THING BEING PRICED ───────────────────────────────
//
// Found by a third reviewer, 14 Aug 2026, on the operator's own page for
// Roskilde. BESIDE_THE_TICKET was tested against the sentence BEFORE a figure
// only, so "100 kr i billetgebyr" walks straight through: the fee word sits
// after the number. The lowest-open-price rule then picked it, and the pipeline
// reported that the operator's own page states a ticket price of 100 DKK for
// Roskilde Festival.
//
// WHEN_SOLD was given an after-window on 13 August for exactly this reason,
// stated one screen above: "the condition can sit on either side". A fee is the
// same shape of fact and did not get the same treatment. Same window, same
// boundaries, so a fee cannot be lent to the next figure any more than a
// presale condition can.
// ── AND THE MATCH ITSELF CAN SWALLOW THE FULL STOP ──────────────────
// `kr\.?` means "400 kr." matches WITH its trailing period, so `at + len`
// lands past the sentence end and the window opens inside the NEXT sentence.
// That read "Billetgebyr" from the following sentence as a fee attached to the
// 400, and rejected a perfectly good ticket price. Caught by a probe against
// fixtures that were already passing before today.
//
// So a match that ends in a sentence boundary has no "after" at all, and
// everything that reads forward from a figure goes through here.
const afterWindow = (t, at, len, nextAt) => {
  if (/[.;!\n]\s*$/.test(t.slice(at, at + len))) return "";
  const from = at + len;
  const stop = Math.min(from + AFTER_WINDOW, nextAt == null ? Infinity : nextAt, t.length);
  const tail = t.slice(from, stop);
  // The comma is a boundary here and is NOT one in sentenceBefore, deliberately.
  // "Billetter koster 200 kr, camping ekstra" prices a ticket and then mentions
  // camping as a separate thing; reading across the comma called that a camping
  // fee and threw the ticket price away. Before a figure a comma is usually
  // still the same clause ("Billetter til festivalen, 400 kr"), so only the
  // forward window stops there.
  const cut = tail.search(/[.,;\n]/);
  return fold(cut >= 0 ? tail.slice(0, cut) : tail);
};

const ancillaryAround = (t, at, len, nextAt) =>
  BESIDE_THE_TICKET.test(sentenceBefore(t, at)) || BESIDE_THE_TICKET.test(afterWindow(t, at, len, nextAt));

// Same two windows, same boundaries, for the same reason: Danish price tables
// write the label on either side of the figure.
const insideAround = (t, at, len, nextAt) =>
  A_THING_INSIDE.test(sentenceBefore(t, at)) || A_THING_INSIDE.test(afterWindow(t, at, len, nextAt));

const conditionAround = (t, at, len, nextAt) => {
  const before = sentenceBefore(t, at);
  // Same window, same swallowed-full-stop problem, which was latent here only
  // because presale wording is rarer than fee wording. See afterWindow.
  const after = afterWindow(t, at, len, nextAt);
  return whenSold(before) || whenSold(after);
};

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
  const all = pricesIn(t);
  for (let i = 0; i < all.length; i++) {
    const p = all[i];
    if (!p.currency) continue;                       // a bare number is not a price
    // The ticket word may sit anywhere in the window: "Billetter til festivalen
    // koster 400 kr" is one sentence with a long lead-in. The CONCESSION and the
    // condition are bound to the sentence, because they qualify this figure
    // rather than introducing it.
    const window = fold(t.slice(Math.max(0, p.at - TICKET_WINDOW), p.at));
    const sentence = sentenceBefore(t, p.at);
    TICKET_WORD.lastIndex = 0;
    if (!TICKET_WORD.test(window)) continue;         // nothing here says this is a ticket
    // Either side. See ancillaryAround: a fee word after the figure is how the
    // booking fee got reported as the price of Roskilde Festival.
    const width = p.len ?? (String(p.hi === p.lo ? p.lo : p.hi).length + 6);
    if (ancillaryAround(t, p.at, width, all[i + 1]?.at)) continue;
    found.push({
      ...p,
      concession: CONCESSION.test(sentence),
      // Carried rather than dropped, exactly like `concession`: the figure is
      // real and a page that prices ONLY guided tours has told us something.
      inside: insideAround(t, p.at, width, all[i + 1]?.at),
      when: conditionAround(t, p.at, width, all[i + 1]?.at),
    });
  }
  if (found.length) {
    // THE LOWEST ANYONE CAN BUY. Lowest overall was the first version and it
    // reported the IDA-members rate off foodfestival.dk as the price of getting
    // in. Among general-admission figures the lowest is still right: a ticket
    // page lists day and multi-day and what a reader plans around is the
    // cheapest way through the gate. The full set travels alongside either way.
    const open = found.filter(p => !p.concession && !p.inside);
    if (open.length) {
      // ── AND ZERO IS NOT WHAT GENERAL ADMISSION COSTS ────────────
      //
      // Oliver's Tivoli run, 3 Sep 2026. The same ticket agent was read twice
      // and answered "435 DKK" and then "0 DKK", and the 0 was kept. It then
      // became the pipeline's own figure and contradicted the draft's correct
      // 150-275: "billetlugen.dk states 0 DKK and this draft states 150 to 275
      // DKK", and the rewrite was asked to remove the real price.
      //
      // A ticket page that lists a 0 among paid tiers is pricing somebody's
      // free entry — under-3s, members, a carer — which is a concession by
      // definition, whatever words happen to sit near it. Taking it as the
      // lowest open price is the IDA-members bug the line below was written
      // against, one step further: not the cheapest rate a stranger can buy,
      // but a rate nobody buys at all.
      //
      // Only when EVERY open figure is zero does the page mean the door is
      // free, and that is left to the branches below, which say so in words.
      const payable = open.filter(p => Number(p.lo) > 0);
      if (payable.length) {
        const lo = payable.reduce((a, b) => (b.lo < a.lo ? b : a));
        return { kind: "price", lo: lo.lo, hi: lo.hi, currency: lo.currency, when: lo.when || "", all: found, free: false };
      }
      const lo = open.reduce((a, b) => (b.lo < a.lo ? b : a));
      return { kind: "price", lo: lo.lo, hi: lo.hi, currency: lo.currency, when: lo.when || "", all: found, free: false };
    }
    // EVERY price on the page is a concession rate. That is a real state and it
    // is NOT "the ticket costs 100": it means the page we read prices members
    // and students and never says what everyone else pays. Reported as its own
    // kind so a caller can go and look elsewhere rather than publish it.
    //
    // Same shape, one step along: every price on the page is for an activity
    // inside rather than for getting in. A museum's tours-and-workshops page is
    // exactly that, and "the entry costs 50" is the wrong reading of it.
    if (found.every(p => p.inside)) {
      return { kind: "inside-only", lo: null, hi: null, currency: found[0].currency, when: "", all: found, free: false };
    }
    return { kind: "concession-only", lo: null, hi: null, currency: found[0].currency, when: "", all: found, free: false };
  }
  // Only reached when no price was found, so a page saying "free for children,
  // 200 kr for adults" reports the 200 rather than calling the whole thing free.
  if (saysFreeIn(t)) return { kind: "free", lo: 0, hi: 0, currency: null, all: [], free: true };
  return null;
};

// ── A KIND THAT IS NOT AN ADMISSION PRICE ───────────────────────────
//
// Two of them now, and adding the second is what showed the first was being
// compared against by literal in six places. Every one of them would have let
// "inside-only" straight through as a ticket price, which is the exact fault
// the kind was invented to stop, one word later.
//
// So: one set, one predicate, and the six call sites ask the question instead
// of each holding an opinion about which strings mean "no answer yet".
export const NOT_ADMISSION = new Set(["concession-only", "inside-only"]);
export const pricesAdmission = (found) => !!found && !NOT_ADMISSION.has(found.kind);

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
// ── AND WHICH PAGE, BECAUSE "A LISTING" IS NOT ACTIONABLE ───────────
//
// Oliver's run log, 30 Aug 2026, drafting Vanvittig Verdenshistorie - AARHUS.
// A price was found and reported as "a ticket shop or calendar states a ticket
// price of 280 DKK". It came from akkc.dk, which is Aalborg Kongres & Kultur
// Center — the AALBORG venue of a touring show, on a draft about the Aarhus
// date. Whether 280 DKK is this show's price is a question he could not even
// ask, because the finding would not say where it came from.
//
// The array to fix it already exists at the call site and its own comment says
// why: listingDomains is "named, so the log can say WHICH calendar answered
// rather than 'a listing', which is the same unactionable shape as 'a source
// was blocked' that the scan log already fixed." It was never passed here.
//
// Optional, and every existing caller keeps working without it — the phrase
// falls back to the old wording rather than inventing a host it was not given.
export const findTicketPrice = ({ siteText = "", listingText = "", siteHosts = [], listingHosts = [] } = {}) => {
  const hosts = { siteHosts, listingHosts };
  const site = ticketPriceOn(siteText);
  if (pricesAdmission(site)) return { ...site, ...hosts, from: "official-site", why: "the operator's own page states it" };
  const listing = ticketPriceOn(listingText);
  if (pricesAdmission(listing)) return { ...listing, ...hosts, from: "listing", why: "a ticket shop or calendar states it and the operator's own page does not" };
  // ── AND THIS IS THE ORDER THAT FIXES THE FOOD FESTIVAL CASE ──────
  // The operator's page carried ONLY the IDA-members rate, so it no longer wins
  // outright, and the agent's page carries the table anyone can buy from. His
  // hierarchy is untouched: the operator still outranks the reseller on any
  // price they BOTH state. It stops outranking it on a price it does not state.
  const only = site || listing;
  if (only) return { ...only, ...hosts, from: site ? "official-site" : "listing", why: "the only prices on the page are concession rates" };
  return null;
};

const moneyText = (p) => `${p.lo}${p.hi !== p.lo ? ` to ${p.hi}` : ""} ${String(p.currency).toUpperCase()}${p.when ? ` ${p.when}` : ""}`;
// Names the page when the run told us which one, and falls back to the old
// phrase when it did not. A host is the difference between a finding he can
// act on and one he can only wonder about: "akkc.dk states 280 DKK" is
// checkable in one click, "a ticket shop states 280 DKK" is not.
const whoSaid = (from, found = null) => {
  const hosts = from === "official-site" ? found?.siteHosts : found?.listingHosts;
  const named = (Array.isArray(hosts) ? hosts : []).filter(Boolean);
  if (named.length) return named.length === 1 ? named[0] : `${named[0]} (of ${named.length} pages read)`;
  return from === "official-site" ? "The operator's own page" : "A ticket shop or calendar";
};

// ── THE FINDING, WHICH IS THE POINT OF ALL OF THIS ──────────────────
// A draft with no price beside a page that states one is the case that used to
// pass silently. It is reported as a MISS rather than written into the entry
// here: the figure goes back through the writer and through every gate a
// written price already passes, so nothing in this file becomes a second,
// unchecked way into a published field.
export const priceMisses = (draftText, opts) => {
  const found = findTicketPrice(opts);
  if (!found) return [];
  // A page that only prices members and students has not told us what a ticket
  // costs, so this reports the GAP rather than the figure. Publishing 100 DKK
  // off foodfestival.dk because it was the only number there is precisely the
  // confident-and-wrong answer this whole file exists to avoid.
  if (found.kind === "concession-only") {
    const rates = found.all.map(moneyText).join(", ");
    return [{
      severity: "medium", field: "ticketInfo",
      detail: `${whoSaid(found.from, found)} prices only concessions (${rates}) and never says what general admission costs. Do not use these figures as the ticket price; the ordinary price is on a page nothing has read yet, usually the ticket agent the operator links to.`,
    }];
  }
  // The same gap with a different cause, and it needs its own sentence: a page
  // pricing a guided tour and a workshop has not priced the door. Saying
  // "concessions" about it would send somebody looking for a students' rate
  // that is not what is wrong.
  if (found.kind === "inside-only") {
    const rates = found.all.map(moneyText).join(", ");
    return [{
      severity: "medium", field: "ticketInfo",
      detail: `${whoSaid(found.from, found)} prices only things that happen inside — tours, workshops, talks (${rates}) — and never says what it costs to get in. Do not use these as the entry price; they are what you pay ON TOP of admission, and the admission figure is on a page nothing has read yet.`,
    }];
  }
  const stated = pricesIn(String(draftText || "")).filter(p => p.currency);
  const saysFree = saysFreeIn(draftText);
  if (found.free) {
    return saysFree || stated.length ? [] : [{
      severity: "medium", field: "ticketInfo",
      detail: `${whoSaid(found.from, found)} says entry is free and this draft does not say so. Free is an answer a reader plans around, and leaving it out reads as unknown.`,
    }];
  }
  if (stated.some(p => p.lo === found.lo && p.hi === found.hi)) return [];
  if (!stated.length) {
    return [{
      severity: "high", field: "ticketInfo",
      detail: `${whoSaid(found.from, found)} states a ticket price of ${moneyText(found)} and this draft states none. Nothing in this run had gone looking for a price before, so a missing one has always read as a clean pass.`,
    }];
  }
  return [{
    severity: found.from === "official-site" ? "high" : "medium",
    field: "ticketInfo",
    detail: `${whoSaid(found.from, found)} states ${moneyText(found)} and this draft states ${stated.map(moneyText).join(", ")}. ${found.from === "official-site" ? "The operator's own page outranks everything else on its own price." : "Worth checking which edition, or which ticket type, each figure is for."}`,
  }];
};

// The formatter that already exists a hundred lines above, reused. It reads a
// range as "lo to hi" and uppercases the currency, which is the same shape a
// reader sees everywhere else in an audit.

// Phrased as what it is. A price that did not come from the site that charges it
// is not proven wrong, it is unproven, and the honest place for an unproven
// figure in this product is the uncertainties list rather than the prose.
// ── AND THE UNTRACED LINE GUESSED WHERE THE FIGURE CAME FROM ────────
//
// Oliver, 16 August 2026, on the paper art museum draft. The note below told him
// four prices "came from a search result or a blog rather than from whoever
// charges it". That is a claim about provenance, and this function has never once
// known it: all it checks is that the official site does not say the figure. On
// that draft the truth was worse than the note. The pages that stated the price
// had been discarded by the relevance filter, because the entry's name carried a
// "Det Nye" prefix the real museum does not use, so nothing in __sources
// supported the number at all. See nameCore in sourcePolicy.js.
//
// "It came from a blog" invites him to go and find the blog. "No page this draft
// read states it" tells him to cut the figure. Two different instructions, and
// the app was giving the first while the second was true.
//
// `statedOn` is three-valued on purpose, and UNDEFINED KEEPS THE OLD WORDING, so
// a caller that has not been taught to answer this cannot be made to lie by the
// change: a host means a real page that was read states it, null means none does,
// and undefined means nobody asked.
export const describePriceTrace = (r, { statedOn = undefined } = {}) => {
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
  const figures = `${r.untraced.map(showPrice).join(", ")}`;
  // "NO PAGE WE READ SAYS THIS" is a different instruction from "find the blog it
  // came from", and it is the stronger of the two, so it gets its own sentence.
  //
  // ── AND THE FIRST DRAFT OF THIS SENTENCE MADE THE MISTAKE IT FIXES ─
  // It read "Do not go looking for the page: if one existed it was already read
  // and discarded, which is a bug in the source filter." That is one of three
  // possible causes asserted as the only one, which is exactly the overreach of
  // the "came from a blog" line it replaces.
  //
  // Measured on the museum that started this, 16 Aug: museumforpapirkunst.dk
  // publishes its prices at /dk/besog, behind a link, and this pass reads the
  // front page. So those four figures may be exactly right and on the operator's
  // own site, in a place nothing opened. What is known is only what was read, and
  // an audit that says more than it measured is the thing this file exists to
  // stop, whoever is writing it.
  if (statedOn === null) {
    return `NOT IN ANYTHING WE READ: ${figures}. ${many ? "These figures are" : "This figure is"} not in the official site's text and no other page this draft read states ${many ? "them" : "it"}, so ${many ? "they have" : "it has"} no source on this row. Three things cause that and they need different answers. The site may keep its prices on a page nothing opened, commonly /priser, /besog or /practical, in which case fetch that page and ${many ? "they are" : "it is"} confirmed. A page that did state ${many ? "them" : "it"} may have been read and then refused by the source filter, which is a bug worth reporting rather than a gap to fill by hand. Or nothing ever stated ${many ? "them" : "it"}, in which case cut ${many ? "them" : "it"}.${listedNote}`;
  }
  if (statedOn) {
    return `NOT FROM THE OFFICIAL SITE: ${figures}. ${many ? "These figures do" : "This figure does"} not appear anywhere in the official site's own text. ${many ? "They are" : "It is"} stated on ${statedOn}, which is a page this draft read and is not the operator's own. Name the day, the ticket tier and whether it is still buyable.${listedNote}`;
  }
  return `NOT FROM THE OFFICIAL SITE: ${figures}. ${many ? "These figures do" : "This figure does"} not appear anywhere in the official site's own text, so ${many ? "they came" : "it came"} from a search result or a blog rather than from whoever charges it. Name the day, the ticket tier and whether it is still buyable, or move ${many ? "them" : "it"} to uncertainties.${listedNote}`;
};

// ── "SEE WEBSITE" IS WEAK, AND FOR REFFEN IT IS WORSE THAN WEAK ─────
//
// Oliver, on a Reffen draft: `"price": "See website"` is weak. He is right, and
// Reffen is the case that shows it is not merely weak. Reffen's own site does not
// publish stall prices either, so the field points a reader at a page that cannot
// answer them. Three words that look like an answer and send somebody on an
// errand ending where it started.
//
// TWO DIFFERENT THINGS WERE WEARING ONE SENTENCE:
//
//   we did not read the site        →  "See website" is honest and useful
//   we read it and it is not there  →  "See website" is a wild goose chase
//
// So the string is DECIDED FROM WHAT WAS READ rather than written by the model.
// The drafting pass already fetches the operator's own page and already asks
// ticketPriceOn whether it states a figure. Nothing consumed that answer for the
// price FIELD; it fed the audit note and stopped there.
//
// One pair of constants, because two spellings of "Not published" across a
// prompt, a publish shape and a render is this codebase's favourite bug.
export const PRICE_UNCHECKED = "See website";
export const PRICE_NOT_PUBLISHED = "Not published";
// ── AND A THIRD, BECAUSE "SEE WEBSITE" NEEDS A WEBSITE ──────────────
//
// Oliver, 17 Aug 2026, on a Café Broløs draft: `"See website"???`
//
// The branch was right and the sentence was still useless. That café is days old,
// its only readable sources were a magazine piece and two company-registry pages,
// no operator site was read, so siteChecked was false and the field correctly fell
// to "See website". The entry has NO WEBSITE IN IT. The field told a reader to go
// and look at a page the entry never gives them.
//
// Three states, not two, because there are three things that can be true:
//   Not published   we read the operator's page and it states no price.
//   See website     we did not read it, and here is the site, go and look.
//   Price unknown   we did not read it and there is no site to send you to.
//
// Named for what it is about, which is OUR knowledge rather than the operator's
// behaviour. Saying "Not published" here would assert something about a café
// nobody has checked.
export const PRICE_UNKNOWN = "Price unknown";

// ── AND THE SAME IDEA FOR IDENTITY, WHICH HAD NO NAME ───────────────
// See the venue check in auditEntry. A placeholder standing in for an unchecked
// PRICE has been named here since 17 Aug so it can be recognised rather than
// read as content. The equivalent for "what is this place" was unnamed, so
// "Unconfirmed venue type" reached a reader's At a Glance box as though it were
// the answer.
//
// The types where absence is evidence. A forest, a beach or a viewpoint is not a
// business listing and its absence from anywhere proves nothing. A bar, a
// restaurant, a club or a bookable workshop is a trading business, and nobody
// being able to establish what it is means it very likely is not one.
export const VENUE_KINDS = ["food", "foodStreet", "night", "nightStreet", "booking"];

// Two is the point at which the box stops being a summary and starts being a
// single fact wearing a heading. Not three: a genuinely simple entry, a free
// viewpoint with a station and nothing else to say, is honestly summarised by
// two rows and should not be nagged about.
export const MIN_GLANCE_ROWS = 2;
// What a reader of each type actually scans this box for, so the finding can
// name the gap instead of listing every field that exists. Derived per type
// because a festival with no camping line and a restaurant with no camping line
// are not the same omission.
export const LIKELY_GLANCE = {
  festival: ["nearestStation", "ticketInfo", "camping", "travelTime", "accommodationTip"],
  free: ["nearestStation", "ticketsGlance", "accessibility", "extraCosts"],
  town: ["nearestStation", "travelTime", "accommodationGlance", "recommendedStayGlance"],
  booking: ["nearestStation", "price", "priceNote", "travelTime"],
  food: ["price", "location"],
  night: ["crowd", "priceNote", "location"],
};
export const UNCONFIRMED_IDENTITY = /\b(?:unconfirmed|unverified|unknown)\b[^.]{0,20}\b(?:venue|type|kind|place)\b|\b(?:venue|type)\b[^.]{0,20}\b(?:unconfirmed|unverified)\b/i;
// The prose admission, matched on the shapes a draft actually uses when it is
// being honest about having failed. Deliberately narrow: "not a verified guide"
// is a disclaimer about the whole page, while "we could not confirm the price"
// is a normal, useful sentence about one field and must not trip this.
export const UNVERIFIED_PROSE = /not a verified guide|treat what follows as a starting point|exists to flag that gap|no solid word on who|nothing about it could be confirmed/i;

// A price field states a price when it contains a digit. Deliberately the same
// test priceBand applies, so a row can never be both banded and unpriced.
export const statesAPrice = (v) => /\d/.test(String(v ?? ""));

// Which of the two a reader is told. `siteChecked` means the operator's own page
// was READ, not that a fetch was attempted: a failed scrape is an unchecked site,
// and claiming a page does not publish a price on the strength of a timeout is the
// same overreach as the first draft of the price note above.
export const unpricedLine = ({ siteChecked = false, siteHasPrice = false, hasWebsite = false } = {}) => {
  if (siteChecked && !siteHasPrice) return PRICE_NOT_PUBLISHED;
  // "See website" is an instruction, and an instruction needs somewhere to go.
  return hasWebsite ? PRICE_UNCHECKED : PRICE_UNKNOWN;
};

// The founder note, and only for the stronger answer. "We could not read the
// site" is already in the run log and does not need a second line.
//
// It ends on Reffen's real answer, which its own audit found and its draft left
// out: entry is free and you pay per stall. A missing number is not the same as
// no cost, and that sentence is the one a reader needed.
export const describeUnpriced = ({ siteChecked = false, siteHasPrice = false, name = "", hasWebsite = false } = {}) => {
  const who = String(name || "").trim();
  // The new third case gets its own note, because it is the one where the entry
  // itself is thin rather than the operator being quiet, and the fix is different:
  // find the operator's page, or say in the prose what the money actually works
  // like here.
  if (!siteChecked && !hasWebsite) {
    return `NO PRICE AND NO WEBSITE${who ? ` (${who})` : ""}. The field reads "${PRICE_UNKNOWN}" rather than "${PRICE_UNCHECKED}", because telling a reader to see a website this entry does not give them is not an answer. If the operator has a page, put it in the website field and redraft; if they genuinely have none, say so in the prose along with whatever is known about what things cost.`;
  }
  if (!siteChecked || siteHasPrice) return "";
  return `NO PRICE, AND THE SITE DOES NOT PUBLISH ONE EITHER${who ? ` (${who})` : ""}. The field now reads "${PRICE_NOT_PUBLISHED}" rather than "${PRICE_UNCHECKED}", because sending a reader to a page that cannot answer them is worse than telling them nobody publishes it. If the real answer is that entry is free and you pay per stall or per item, that belongs in the entry as a sentence rather than as a missing number.`;
};

// ── WHAT IS THIS DRAFT STANDING ON ──────────────────────────────────
//
// Oliver, 16 August 2026, reading a finished draft's __sources: "one source?
// What da fk".
//
// Nothing in the app had said so. The comment beside __sources reads "AN EMPTY
// LIST IS ALLOWED. A place too small to have been written about should show no
// sources rather than eight about somewhere else", which is right for the READER
// and is exactly why an empty list is invisible to the FOUNDER. A short list has
// two possible causes that look identical, and they need opposite responses:
//
//   the place really is barely written about   →  publish it, that is the brand
//   the filter threw the pages away            →  fix the filter, redraft
//
// So this says which is which where it can, and says plainly that it cannot when
// it cannot. It is a __note, never a reader-facing field, so there is no cost to
// saying it on every thin draft rather than only on suspicious ones.
//
// THE VENUE'S OWN SITE IS COUNTED SEPARATELY, because it is not corroboration.
// A museum's own page is the right source for its opening hours and the worst
// possible source for whether the museum is worth an hour of somebody's day, and
// a list of one that IS that page reads as "sourced" while being unreviewed.
export const evidenceStanding = ({ sources = [], ownSite = "" } = {}) => {
  const host = (u) => { try { return new URL(String(u)).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
  const own = host(ownSite) || String(ownSite || "").toLowerCase().replace(/^www\./, "");
  const list = (Array.isArray(sources) ? sources : []).map(u => String(u || "")).filter(Boolean);
  const hosts = [...new Set(list.map(host).filter(Boolean))];
  const others = own ? hosts.filter(h => h !== own && !h.endsWith(`.${own}`)) : hosts;
  return { total: hosts.length, hasOwn: !!own && hosts.length > others.length, others: others.length };
};

// ── AND WHETHER THE SOURCES ANSWER THE QUESTION THE ENTRY ASKS ───────
//
// Oliver, 16 August 2026, on a Gothersgade nightlife draft: "why so innaccurate?
// The sources used are very good."
//
// They were very good, at a different question. Seven of the eight were
// encyclopedias, and the run log had already said so out loud: step 6 ranked them
// and printed "(reference)" eight times. The app classified every source
// correctly and then nothing read the classification.
//
// An encyclopedia is a real source about when a street was laid out and where it
// runs, and no source at all about who drinks there on a Tuesday. The draft's
// geography was right, every word of it. Its jazz, its after-work crowd and its
// half-empty weeknights came from nowhere, and eight plausible URLs underneath
// them is what made that invisible: a short source list looks thin, and a list of
// eight reference works looks researched.
//
// SO THE TEST IS BY TYPE, because the same source list is fine or useless
// depending on what is being written. A town's history is what a lexicon is for.
// A bar street is about this year, and pageScan's own comment on the reference
// class already says it: "good for history and bad for a price".
export const LIVING_TYPES = ["night", "nightStreet", "nightTown", "food", "foodStreet", "booking"];

// ── AND THE TEST IS THE SUBJECT, NOT THE HOST ───────────────────────
// The first version of this counted encyclopedias and asked whether they were
// ALL of them. Measured on his own eight, that came out FALSE: four hosts
// classify as reference, and hovedstadshistorie.dk, visitdenmark.dk and a
// hostel's generic nightlife page do not, while being no more use about
// Gothersgade's bars. A host-shaped test cannot answer a subject-shaped question,
// and shipping the first version would have been a check that agreed the draft
// was fine.
//
// So it asks the real question: did any page we read say anything about the
// SUBJECT. The words come from QUERY_WORDS, which already holds one line per type
// and is already maintained, rather than a second list here that would drift from
// it the first time either was touched. nightStreet is "natteliv barer nightlife
// bars", which is what a page about a bar street contains and what a lexicon
// entry on a 1650s street does not.
//
// `saidByUrl` is what each page was seen to say, the same map sourceIsAboutPlace
// is fed. WITHOUT IT THERE IS NO FINDING: not knowing what the pages said is not
// evidence they said nothing, and calling a draft unsourced on the strength of a
// missing map is the overreach this file has spent the day removing.
// Words that are in nobody's question. Deliberately small and deliberately not
// a general stopword list: the point is to stop a connective vouching for a
// page, not to second-guess a real question word in either language.
// NOT called FILLER_WORDS. helpers.js already exports a set by that name and it
// is a different question: that one is the AI-writing tells a draft must not
// USE ("actually", "really", "quite"), this one is the everyday words that
// cannot vouch for a page. Two same-named exports over one namespace is the
// collision this repository has already written about once, in the note above
// PROSE_FIELDS, and the bundler caught this one on its first run.
export const EVERYDAY_WORDS = new Set([
  "what", "see", "the", "and", "for", "with", "from", "how", "who", "why",
  "hvad", "der", "som", "med", "til", "har", "kan", "ved", "den", "det",
  // Added after a vocabulary written the same day as this filter ended "bars
  // closing time which night". These are not connectives in the grammatical
  // sense; they are ordinary words that appear on any page at all, which is the
  // only property that matters here. A question word has to be a word a page
  // about THIS kind of thing would use and a page about something else would
  // not, and "time" and "night" and "day" fail that on every page ever written.
  "time", "which", "night", "day", "days", "week", "year", "place", "one",
  "tid", "dag", "dage", "uge", "sted",
]);

// The words this check really looks for, exported so the note that explains a
// failure names the same list the failure was decided on. They were two
// separate readings of QUERY_WORDS and the note printed words the matcher had
// already dropped, which is a small lie in the one message whose whole job is
// to say what was looked for.
// Split out from the type lookup so the filter can be probed with real inputs
// rather than only through whatever the vocabulary happens to say today. Both
// halves defended each other and neither could be tested alone: with a clean
// vocabulary, deleting the filter changed nothing, and with the filter in place,
// putting "what to see" back changed nothing either. Two mutants survived
// because each fix was hidden behind the other.
export const questionWords = (raw) => [...new Set(
  String(raw || "").split(/\s+/).map(fold)
    .filter(w => w.length >= 3 && !EVERYDAY_WORDS.has(w))
)];
export const questionWordsFor = (type) => questionWords(QUERY_WORDS[String(type)]);

export const sourceFit = (urls, { type = "", saidByUrl = null } = {}) => {
  const list = (Array.isArray(urls) ? urls : []).map(u => String(u || "")).filter(Boolean);
  const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
  const hosts = [...new Set(list.map(hostOf).filter(Boolean))];
  const reference = hosts.filter(h => isReferenceHost(`https://${h}/`)).length;
  const living = LIVING_TYPES.includes(String(type));

  const said = (u) => String(
    (saidByUrl && typeof saidByUrl.get === "function" ? saidByUrl.get(u) : saidByUrl?.[u]) ?? ""
  );
  const heard = list.filter(u => said(u).trim());
  // ── A CONNECTIVE CANNOT VOUCH FOR A PAGE ────────────────────────
  // The vocabulary is the type's question words, and the town line used to
  // carry "what to see", so "what" and "see" were in it. Both appear on
  // essentially every page written in English, so every page read counted as
  // on-subject and subjectUnsourced could not fire for the type with the most
  // pages. Filtered here as well as fixed there, because the vocabulary is
  // edited by hand and this is the check that depends on it.
  const words = questionWordsFor(type);
  const spaced = (v) => ` ${fold(v).replace(/[^a-z0-9]+/g, " ").trim()} `;
  const onSubject = heard.filter(u => {
    const hay = spaced(said(u));
    return words.some(w => hay.includes(` ${w} `));
  });

  return {
    total: hosts.length,
    reference,
    other: hosts.length - reference,
    living,
    heard: heard.length,
    onSubject: onSubject.length,
    // Three conditions, and dropping any one of them makes this lie: it has to be
    // a type that is about the present, we have to have read something, and
    // nothing we read may mention the subject.
    subjectUnsourced: living && hosts.length > 0 && heard.length > 0 && onSubject.length === 0,
  };
};

// ── AND WHETHER ANY PAGE MENTIONS THE THING BY NAME ─────────────────
//
// Oliver, 18 Aug 2026, with a festival draft on screen:
//
//   "This was something called 'Folk', which doesn't even exist. If the name is
//    wrong, and it doesn't exist, then just delete it."
//   "the 'Folk' was something Perplexity found via web search btw."
//
// That last line is the whole diagnosis. The model did not invent a name out of
// nothing: THE RESEARCH RETURNED A DIFFERENT SUBJECT. Perplexity searched, came
// back with pages about something called Folk, and the draft went out named "TOV
// Festival" — a name that appears in not one of the sources under it.
//
// sourceFit above cannot catch that, and it is worth being precise about why
// rather than widening it and hoping. It asks whether the pages are about the
// TYPE: for a festival that is "festival musik lineup". Pages about Folk contain
// every one of those words, so subjectUnsourced comes back FALSE and the draft
// reads as properly researched. The type was right. The subject was wrong.
//
// So this asks the other question, which nothing asked: does the entry's own NAME
// appear in anything we read.
//
// ── DISTINCTIVE WORDS, NOT THE WHOLE STRING ─────────────────────────
// "Restaurant Glassalen" is written as "Glassalen" by half the internet, and
// requiring the full name would flag a correct draft. So it is the identifying
// part of the name that has to appear, not the whole label.
//
// AND THE FLOOR IS THREE CHARACTERS, NOT distinctiveWords' FOUR. Found by running
// this against his actual draft: "TOV Festival" produced NO words at all, because
// "TOV" is three letters and "festival" is in GENERIC_PLACE_WORDS. The check could
// not fire on the exact name that prompted it. distinctiveWords is left alone —
// isSameSpot depends on its four-character rule and widening it there would start
// merging stops — so the floor is lowered here only, where the whole-word match
// below makes a three-letter word safe: " tov " cannot match inside another word.
// Two characters would not be safe and is not offered.
//
// ── AND IT NEVER FIRES ON SILENCE ───────────────────────────────────
// Same three-condition discipline as subjectUnsourced, for the same reason: not
// knowing what a page said is not evidence it said nothing. No pages read, or a
// name with no distinctive word in it at all, and this reports nothing.
export const nameFit = (urls, { name = "", saidByUrl = null } = {}) => {
  const list = (Array.isArray(urls) ? urls : []).map(u => String(u || "")).filter(Boolean);
  const said = (u) => String(
    (saidByUrl && typeof saidByUrl.get === "function" ? saidByUrl.get(u) : saidByUrl?.[u]) ?? ""
  );
  const heard = list.filter(u => said(u).trim());
  // Every spelling of the name, so "Møgeltønder" and "Mogeltonder" are one name.
  const identifying = (v) => fold(v)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !GENERIC_PLACE_WORDS.has(w));
  const wanted = [...new Set(variantsOf(String(name || "")).flatMap(identifying))];
  const spaced = (v) => ` ${fold(v).replace(/[^a-z0-9]+/g, " ").trim()} `;
  const naming = heard.filter(u => {
    const hay = spaced(said(u));
    return wanted.some(w => hay.includes(` ${w} `));
  });
  return {
    heard: heard.length,
    naming: naming.length,
    words: wanted,
    // Not one page we read mentions the thing this draft is called. That is not a
    // thin draft, it is a draft about something else.
    nameUnsourced: heard.length > 0 && wanted.length > 0 && naming.length === 0,
  };
};

export const describeNameFit = (fit) => {
  const f = fit || {};
  if (!f.nameUnsourced) return "";
  return `NOT ONE SOURCE MENTIONS THIS NAME. ${f.heard} page${f.heard === 1 ? "" : "s"} were read and none of them contains ${f.words.length === 1 ? f.words[0] : f.words.join(" or ")}. The research found a subject and it was not this one, so the name is either wrong or the thing does not exist. Do not fix the fields: delete the draft and search again for the real name.`;
};

export const describeSourceFit = (fit, { type = "" } = {}) => {
  const f = fit || {};
  if (!f.subjectUnsourced) return "";
  const looked = questionWordsFor(type).join(" ");
  const refNote = f.reference > 0
    ? ` ${f.reference} of the ${f.total} hosts are encyclopedias, which is why the list reads as thorough research: a lexicon is a real source about when a street was laid out and no source at all about who drinks there on a Tuesday.`
    : "";
  return `NOTHING WE READ IS ABOUT THE SUBJECT. ${f.heard} page${f.heard === 1 ? "" : "s"} were read and not one mentions${looked ? ` any of: ${looked}` : " the subject"}.${refNote} The geography in this draft may be perfectly right while everything about the crowd, the hours and the money has nothing behind it. Search the subject rather than the name before this goes out.`;
};

export const describeEvidence = (standing, { untracedPrices = 0 } = {}) => {
  const s = standing || { total: 0, hasOwn: false, others: 0 };
  // Two or more independent pages is an ordinary draft and needs no note. The
  // threshold is on OTHERS rather than on the total, so the venue's own site
  // plus one blog does not read as two sources.
  if (s.others >= 2) return "";
  const priced = untracedPrices > 0
    ? ` ${untracedPrices} price${untracedPrices === 1 ? "" : "s"} in the prose ${untracedPrices === 1 ? "is" : "are"} stated as fact on top of that.`
    : "";
  if (s.total === 0) {
    return `NOTHING IS SOURCED. __sources is empty, so every sentence in this draft rests on a page nobody kept.${priced} Either the place is genuinely unwritten about, in which case say less, or the source filter refused pages that were about it, which is a bug and not a gap.`;
  }
  if (s.others === 0) {
    return `THE ONLY SOURCE IS THE VENUE'S OWN SITE. Nothing independent was kept, so the opening hours are as good as they get and every judgement in this draft, what it is worth and who it suits, is unreviewed.${priced} Check whether the name in this draft is the name the rest of the internet uses: a title the place does not call itself makes every page about it fail the relevance filter at once.`;
  }
  return `ONE INDEPENDENT SOURCE${s.hasOwn ? ", plus the venue's own site" : ""}. Everything here turns on a single page, so a mistake on that page is a mistake in this entry with nothing to catch it.${priced}`;
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
  // timeNeeded removed 19 Aug 2026 with the field. Auditing it would have gone
  // on asking him to fix wording no reader can see, on legacy payloads only.
  "typicalCosts", "price", "priceNote", "extraCosts",
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
// ── AND THE WORDS A DRAFT ACTUALLY RETRACTS IN ──────────────────────
//
// Oliver's Graeskarfestival draft, 14 Aug 2026. desc said flatly "Denmark's
// largest pumpkin festival" and the uncertainties said:
//
//   "Denmark's largest pumpkin festival" is the festival's own description and
//   was not independently verified against other pumpkin events in the country.
//
// Which is the exact pair this function exists to catch, and it returned
// nothing. QUOTED pulled the claim out correctly; the list below simply had no
// phrase for it. It carried the single word "unverified" and the draft wrote
// "was not independently VERIFIED", which \bunverified\b cannot match, and it
// had nothing at all for a claim attributed to its own subject.
//
// That is the second time today a check missed for its vocabulary rather than
// its logic, and both were mine to widen. The phrasings below are the ones his
// real drafts have actually used, not ones I invented: a model retracts by
// naming who said it at least as often as by naming what is missing.
const RETRACTS = /\b(?:not stated in the research|could not be confirmed|not supported|unverified|not (?:independently |fully |otherwise )?verified|self-described|self-declared|own (?:description|claim|claims|words|account|label)|no source|nothing (?:states|supports)|was not found|not checked against)\b/i;
// Findings quote the claim they are about, and the checker's output arrives
// with markdown emphasis around it. Both shapes, and the quotes themselves are
// not part of the claim.
const QUOTED = /[""]([^""]{4,200})[""]|\*\*([^*]{4,200})\*\*/g;

// ── AND THAT CHARACTER CLASS IS ASCII, WHICH IS THE WHOLE BUG ───────
//
// 25 Aug 2026, found by running it rather than reading it. `[""]` is two copies
// of the SAME straight quote, so a note written with typographic quotes was
// never matched, the claim was never extracted, and selfContradictions returned
// nothing at all. Silently: no error, no finding, a clean pass.
//
// Models write typographic quotes constantly, and so do the drafting prompts in
// this repository. Which means the check most likely to be defeated by this is
// the check on the drafts written most carefully.
//
// THE LESSON WAS ALREADY ON THE PAGE. Thirty lines down, under "AND TYPOGRAPHY
// IS NOT MEANING", this exact fault is described and fixed for APOSTROPHES, in
// `norm`. It was fixed one character short: norm straightens both, but norm
// runs on the PROSE, and QUOTED runs on the raw note before norm sees it.
//
// norm cannot be reused here either, because it STRIPS quotes entirely and
// QUOTED needs them to find where the claim ends. So this is typography and
// nothing else: the quote characters, left in place, made uniform. Guillemets
// included, because a Danish source quoted inside a note is as likely to carry
// those as anything else.
const straightenQuotes = (s) => String(s || "").replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"');

// ── AND THE LIST WAS MISSING THE FIELD MOST LIKELY TO OFFEND ────────
//
// 25 Aug 2026. `gemlyxFind` was not on it. That field is defined in the drafting
// prompt as "ONE specific curated recommendation only Gemlyx would flag", which
// is to say the one sentence per entry that is MEANT to make a strong claim
// nobody else makes. An unsupportable superlative goes there first, and this
// check could not see it.
//
// `blogBody` was not on it either, and after shapeForLive that is where most of
// the published prose lives. It is an array of {heading, paragraph}, so it is
// flattened below rather than added here: norm() of an object is
// "[object Object]", which would have looked like coverage and been none.
//
// ── AND THIS WAS THE SECOND PROSE_FIELDS IN THE REPOSITORY ──────────
// correction.js exported one too, same name, different contents: four fields
// overlapped and fifteen did not. The note here used to end "a collision
// waiting for its first wrong import", and the collision arrived from the other
// direction, which is the one this file did not watch: not a wrong import, but
// BOTH LISTS FALLING BEHIND THE SAME NEW TYPE, separately.
//
// Bar streets shipped 15 Aug with `bestNights` and `walkIt`, and food streets
// and essentials have `howTo`, and `whenEnter` is a club's own paragraph. Four
// fields, invisible to this audit and to the editor, in two hand-written lists
// that had to be updated twice and were updated neither time. That is the scar
// this codebase names against itself in regions.js: "Four lists, one omission,
// which is not four mistakes. It is one hand-written list copied four times."
//
// So there is now one list, here, and correction.js imports it. It is still
// hand-written, because a module-level call into studioContent would be a cycle
// (studioContent imports PRICE_UNKNOWN from this file). It is no longer
// UNCHECKED: the suite calls shapeForLive for every content type, reads which
// fields really land in a paragraph, and fails by name when this list is short.
export const PROSE_FIELDS = ["atmosphere", "whoItsFor", "realityCheck", "desc", "special", "whoFor", "afterDark", "beforeDark", "bestTime", "bestNights", "walkIt", "whenEnter", "howTo", "howItsMade", "vibeLocation", "characterAndFit", "whatToDo", "gettingThereReality", "highlight", "gemlyxFind",
  // ── AND THE PROSE THAT IS NOT IN A BODY ──────────────────────────
  // The derivation the suite runs reads paragraphs out of blogBody, so it can
  // only find fields that go into one. These three are reader-facing prose on
  // a CARD and reach no body at all, so nothing was ever going to point at
  // them: `tip` is the one italic line an essentials card prints, `crowd` is
  // the sentence under a bar's name, and `visitorNote` is the sentence the
  // essential prompt marks REQUIRED when a system is resident-gated. None was
  // scanned for banned words, em dashes, filler runs or a generic sentence.
  "tip", "crowd", "visitorNote"];

// Reader-facing prose that is not a plain string. Flattened rather than listed
// above, because the shape is the reason it was missed.
export const PROSE_LISTS = ["blogBody", "thingsToKnow"];

// ── THE FLATTENER READ KEYS THAT DO NOT EXIST ───────────────────────
//
// Written this morning, when blogBody was added to PROSE_LISTS so that
// selfContradictions could finally see the field most likely to carry an
// unsupportable superlative. It read `item.heading` and `item.paragraph`.
//
// A real published payload, pasted by Oliver on 25 Aug from the live Aalborg
// entry, is keyed by TYPE with the text in `content`:
//
//   { "type": "heading",   "content": "What to Do in Aalborg" }
//   { "type": "paragraph", "content": "Aalborg Zoo, the city's most visited..." }
//   { "type": "bullets",   "items": ["Jomfru Ane Gade is the main nightlife..."] }
//
// So every block flattened to "" and every check reading blogBody has been
// reading nothing since the day it was widened. The widening looked done, the
// suite went green, and the field it was widened to cover was invisible.
//
// That is this repository's signature failure, committed by me, in the fix for
// this repository's signature failure. The lesson it earns is narrow and worth
// keeping: a flattener written from an ASSUMED shape is a guess, and the first
// real payload is the only thing that can settle it.
//
// Both shapes are accepted, because rows written before and after any format
// change both have to work, and an image or instagram block correctly yields
// nothing rather than "undefined".
// ── AND THE SHAPE IS NAMED ONCE, 3 SEP 2026 ─────────────────────────
//
// The comment above records this mistake being made and fixed here. It was then
// made again, in researchVoice.js, which walks blogBody to STRIP research voice
// and repeated filler out of it and read `b.text` — a key shapeForLive has never
// written. So the strip that says in its own comment "blogBody is the long-form
// half of an entry, and cleaning only the short fields would leave the same
// sentence live one scroll further down" cleaned only the short fields, and its
// audit reported nothing on every row. Fable found it; the fixture I wrote for
// it was keyed `text`, so my assertion passed against a payload that does not
// exist. A probe built from invented inputs is not a probe.
//
// Reading is not enough for that caller: it has to put the text BACK. So the
// shape is a pair — the key, and a setter — and both live here, beside the
// flattener, because a fourth reader of this shape is how this happens a third
// time.
// ── AND THE BODY EDITOR HAD IT WRONG TOO, WHICH IS WORSE ────────────
//
// bodyEdit.js carried its own pair — `String(b.text ?? "")` — and that pair is
// what the Studio's "📝 Blog text" panel reads and writes. Probed against the
// real payload quoted above:
//
//   the heading and the paragraph both show as EMPTY in the editor
//   saving an edit writes {type, content: <the old text>, text: <the new one>}
//
// So a founder editing a published paragraph sees a blank box, types into it,
// saves, and the page keeps rendering `content` — the edit is gone and the row
// has quietly grown a phantom field. Bullets worked, because they live in
// `items`, which is why one block type in three working hid the other two.
//
// THREE COPIES OF ONE SHAPE, one of them right. This pair is now the only one:
// bodyEdit and researchVoice both read it, and it keeps bodyEdit's bullets
// handling, which was the half its version got right.
//
// `content` is written first for a block that has no text yet, because that is
// what shapeForLive produces and DetailPage renders; an older row keyed `text`
// is written back into `text` rather than gaining a second field.
export const BLOCK_TEXT_KEYS = ["content", "text", "paragraph"];
const isBullets = (b) => !!b && typeof b === "object" && (b.type === "bullets" || Array.isArray(b.items));

export const blockText = (block) => {
  if (typeof block === "string") return block;
  if (!block || typeof block !== "object") return "";
  // Bullets hold an array; joined so one reader serves every block type.
  if (isBullets(block)) return (Array.isArray(block.items) ? block.items : []).map(x => String(x ?? "")).join("\n");
  for (const k of BLOCK_TEXT_KEYS) if (typeof block[k] === "string" && block[k]) return block[k];
  return "";
};

export const withBlockText = (block, next) => {
  if (typeof block === "string") return String(next ?? "");
  if (!block || typeof block !== "object") return block;
  const t = String(next ?? "");
  if (isBullets(block)) {
    // Blank lines dropped: an empty bullet renders as a dot with nothing beside
    // it, and bodyProblems already counts that as a fault.
    return { ...block, items: t.split("\n").map(x => x.trim()).filter(Boolean) };
  }
  for (const k of BLOCK_TEXT_KEYS) if (typeof block[k] === "string" && block[k]) return { ...block, [k]: t };
  return { ...block, content: t };
};

const listProse = (payload) => PROSE_LISTS.flatMap(k => {
  const v = payload?.[k];
  if (!Array.isArray(v)) return [];
  return v.flatMap(item => {
    if (typeof item === "string") return [item];
    if (!item || typeof item !== "object") return [];
    // The bullets block: its text is a list, and each bullet is its own sentence
    // worth checking rather than one run-on paragraph.
    if (Array.isArray(item.items)) return item.items.map(x => String(x ?? "")).filter(Boolean);
    const text = [item.content, item.text, item.heading, item.paragraph]
      .map(x => (typeof x === "string" ? x : "")).filter(Boolean).join(" ");
    return text ? [text] : [];
  });
});

// Saying who said it. Kept to phrases that name a SOURCE for the claim, not to
// general hedges: "probably the largest" is still the entry asserting it, badly.
// The verb and its "as" can have the source in between, and a real draft puts
// it there: "billed BY ITS ORGANISERS as". My first version listed "billed as"
// only, and the very first attributed sentence written to test the repair was
// flagged by it. A list of attribution phrasings missing the natural ones sends
// a writer straight back to the flat assertion this rule exists to stop.
const ATTRIBUTED = /\b(?:(?:billed|described|advertised|marketed|promoted|sold)(?:\s+[\w'\u2019]+){0,4}\s+as|describes itself as|calls itself|calls it|self-described|self-declared|its own|their own|the organiser'?\u2019?s?|the festival'?\u2019?s? own|organisers? (?:call|say|describe)|says? it is|claims? to be|according to|by its own)\b[^.]{0,40}$/i;

// Is there an occurrence of `claim` in `prose` with no attribution in front of
// it. Every occurrence is checked, because a draft that attributes it once and
// then states it flat later has done the thing this rule is about.
export const bareOccurrence = (prose, claim) => {
  const hay = String(prose || ""), needle = String(claim || "");
  if (!needle || !hay.includes(needle)) return false;
  let at = hay.indexOf(needle);
  while (at !== -1) {
    // The window is short on purpose. An attribution governs the clause it
    // opens, and a marker four sentences earlier governs nothing.
    if (!ATTRIBUTED.test(hay.slice(Math.max(0, at - 60), at))) return true;
    at = hay.indexOf(needle, at + 1);
  }
  return false;
};

// ── AND TYPOGRAPHY IS NOT MEANING ──────────────────────────────────
// Found while testing the repair, 14 Aug. An uncertainty quoting "Denmark's
// largest pumpkin festival" with a straight apostrophe never matched the same
// words in prose written with a curly one, so this whole check turned on which
// character a model happened to emit that run. It had been passing by luck.
//
// Curly quotes and apostrophes fold to their ASCII forms before anything is
// compared, which is the same folding danishNames does for letters and for the
// same reason: two spellings of one string are one string.
const norm = (s) => String(s || "")
  .toLowerCase()
  .replace(/[\u2018\u2019\u201B\u02BC]/g, "'")
  .replace(/[\u201C\u201D\u201F]/g, '"')
  .replace(/\s+/g, " ")
  .replace(/[*"]/g, "")
  .trim();

export const selfContradictions = (payload) => {
  const notes = Array.isArray(payload?.uncertainties) ? payload.uncertainties : [];
  const prose = [...PROSE_FIELDS.map(k => payload?.[k]), ...listProse(payload)].map(norm).filter(Boolean).join(" ␟ ");
  if (!prose) return [];
  const out = [];
  for (const line of notes) {
    if (!RETRACTS.test(String(line))) continue;
    QUOTED.lastIndex = 0;
    let m;
    while ((m = QUOTED.exec(straightenQuotes(line))) !== null) {
      const claim = norm(m[1] || m[2]);
      // Short fragments match by accident; a claim worth deleting is a clause.
      if (claim.length < 12 || !prose.includes(claim)) continue;
      // ── AND ATTRIBUTION IS THE FIX, SO IT MUST NOT BE THE FAULT ────
      //
      // Caught the moment this widening started working. "Denmark's largest
      // pumpkin festival" stated flat is the bug. "BILLED AS Denmark's largest
      // pumpkin festival" is the correct repair, and it still contains the
      // claim, so a naive substring test flags the fixed draft as loudly as the
      // broken one.
      //
      // A gate that fires on its own fix teaches the pipeline to write worse in
      // order to pass, which is the same fault the price trace had this morning
      // when it called a span read off a ticket agent a blog rumour. So an
      // occurrence carrying an attribution in front of it is not a fault, and
      // only a BARE occurrence is: the entry may repeat what the organiser says
      // as long as it says who said it.
      //
      // Every occurrence is checked, not the first. A draft that attributes it
      // once in the intro and then states it flat two paragraphs later has done
      // the thing this rule is about.
      if (!bareOccurrence(prose, claim)) continue;
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
// ── AND A PAGE THAT CONTAINS THE NUMBER IS NOT A SOURCE FOR IT ──────
//
// 24 Aug 2026, found by Gemini on a Bybjerg draft and confirmed against the
// museum's own site. The entry said Orø Minder costs 20 kroner for anyone over
// 12, which is exactly right: oroeminder.dk says "Entré 20 kroner for personer
// over 12 år." The CITATION was wrong. The run recorded the price as coming
// from oroe.dk/oplev-oroe/kultur-og-sevaerdigheder, a page that does not state
// it, because that page ranked higher and contained a matching figure.
//
// This is the same error the fact-check pass was fixed for on 5 Aug, where a
// correction answered about a different ferry route and framed it as a
// correction: right number, wrong subject, delivered with the authority of a
// check. A citation is worse, because a reader who follows it and finds nothing
// learns that the receipts are decorative.
//
// `isAbout` is INJECTED rather than imported, the way reachOf is injected into
// tripEvents and townPoint into arrival: this file would otherwise have to
// reach into sourcePolicy for sourceIsAboutPlace and the two would become a
// cycle. The caller already holds the entry's name and town.
//
// AND A PRICE FOUND ONLY OFF-SUBJECT IS REFUSED, NOT DOWNGRADED. It comes back
// marked `offSubject` so the Studio can say what happened, and the caller stores
// nothing. An empty __priceSource means "we could not show you where this came
// from", which is true; a wrong one means "here is where this came from", which
// is not.
export const priceSource = (priceText, pagesByUrl, order = [], { isAbout = null } = {}) => {
  const wanted = pricesIn(priceText).filter(p => p.currency).map(priceKey);
  if (!wanted.length) return null;
  const hostOf = (u) => { try { return new URL(String(u)).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
  const rankOf = (u) => {
    const h = hostOf(u);
    const i = order.findIndex(x => { const o = String(x).toLowerCase().replace(/^www\./, ""); return h === o || h.endsWith(`.${o}`); });
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const urls = Object.keys(pagesByUrl || {}).sort((a, b) => rankOf(a) - rankOf(b));
  let offSubject = null;
  for (const url of urls) {
    const here = new Set(pricesIn(pagesByUrl[url]).map(priceKey));
    const hit = wanted.find(k => here.has(k));
    if (!hit) continue;
    const found = { url, price: hit, host: hostOf(url), ranked: rankOf(url) !== Number.MAX_SAFE_INTEGER };
    if (typeof isAbout !== "function") return found;
    let about = false;
    // A thrown matcher must not become "this page is fine". Same rule the
    // ferry probe keeps about a failed call: a check that could not run has
    // learned nothing, and nothing is not a pass.
    try { about = !!isAbout(String(pagesByUrl[url] || ""), url); } catch { about = false; }
    if (about) return found;
    if (!offSubject) offSubject = { ...found, offSubject: true };
  }
  // Nothing on-subject. If some page had the figure, say which, so the Studio
  // can show him the near miss instead of a silent absence.
  return offSubject || null;
};

// ── THE HONEST NOTE, LAUNDERED INTO A FACT ──────────────────────────
//
// Oliver, 25 Aug 2026, reading the live Aalborg payload: "it's odd, it doesn't
// actively write that there is no annual festival. I assume it looks at the
// unconfirmed and just makes it up from there?"
//
// That is exactly what happened, and it is a better diagnosis than the one I had.
// The draft's own uncertainties read:
//
//   "No confirmed signature annual festival or event turned up in the research,
//    so this may exist but wasn't found."
//
// Which is CORRECT. That is the sentence this whole pipeline is built to produce:
// a statement about the search, properly hedged, admitting the thing may exist.
// The research did its job and said so.
//
// Then the prose reads:
//
//   "There's no single big annual festival tying the city together, so don't
//    plan a trip around one."
//
// Aalborg Karneval runs the last week of every May and is the largest carnival in
// Scandinavia. The hedge was handed to the writer as context and came out the
// other side as an assertion about the world, in a field a reader scans, with an
// instruction attached.
//
// ── WHY NO EXISTING GATE SAW IT ─────────────────────────────────────
//
// selfContradictions is the right shape and cannot reach this: it requires the
// uncertainty to QUOTE the claim it retracts, and this one quotes nothing. It was
// built for "the draft said 'Denmark's largest pumpkin festival' and we could not
// confirm that", where the words are in both places. Here the uncertainty and the
// prose share no phrase at all — they share a SUBJECT, and disagree about it.
//
// So this pairs them by subject: an uncertainty that says a thing was not FOUND,
// and prose that says the same thing does not EXIST.
//
// This is the strongest form of the rule "an empty field is not evidence of an
// absence", because it does not guess at phrasings. The draft has already told us
// what it failed to establish. All this does is check whether it then went ahead
// and established it anyway.

// The shape of an honest research note. These are the sentences the pipeline is
// SUPPOSED to write, which is what makes them safe to key on.
const NOT_FOUND = /\b(?:no|none|nothing|not?)\b[^.!?]{0,80}?\b(?:turned up|was |were |could ?n[o']?t be|was ?n[o']?t|were ?n[o']?t|has ?n[o']?t been)?\s*(?:found|confirmed|verified|established|located|identified)\b|\b(?:could ?n[o']?t|unable to)\s+(?:find|confirm|verify|establish)\b|\bnot found\b|\bno[^.!?]{0,60}\bturned up\b/i;

// The subjects a draft can fail to find AND then deny the existence of. Each is
// the noun as it appears in both sentences, so the pairing needs no cleverness.
const SUBJECTS = [
  { key: "festival", re: /\b(?:festival|festivals|carnival|annual event|signature event|events?)\b/i },
  { key: "price", re: /\b(?:price|prices|pricing|cost|costs|entry fee|admission)\b/i },
  { key: "station", re: /\b(?:station|stop|platform|terminal)\b/i },
  { key: "opening hours", re: /\b(?:opening hours|hours|times|timetable)\b/i },
  { key: "website", re: /\b(?:website|official site|homepage)\b/i },
  { key: "tickets", re: /\b(?:tickets?|ticketing|booking)\b/i },
];

// Prose that ASSERTS an absence, rather than reporting one was not found. The
// hedges are excluded first, because a draft correctly writing "we could not
// confirm a festival" must never be flagged for it — a gate that fires on its
// own fix teaches the pipeline to write worse in order to pass.
const ASSERTS_ABSENCE = /\bthere\s+(?:is|are|'s)\s+no\b|\b(?:has|have|with)\s+no\b|\bno\s+(?:single|major|big|real|proper|notable|significant)\b|\bnothing\s+(?:much\s+)?(?:on|happening)\b|\b(?:does ?n[o']?t|do ?n[o']?t)\s+have\b|\blacks\b/i;
// A hedge is a hedge wherever it sits in the sentence. "There is no annual
// festival THAT WE COULD CONFIRM, though one MAY WELL EXIST" matches the absence
// shape and is the correct sentence, so both halves have to be readable: the
// active "we could confirm" as well as the passive "could be confirmed", and
// "may well exist" as well as "may exist". A gate that fires on its own fix
// teaches the pipeline to write worse in order to pass.
const HEDGE_IN_PROSE = /\b(?:could ?n[o']?t be|was ?n[o']?t|were ?n[o']?t|not)\s+(?:\w+\s+){0,2}(?:confirmed|verified|found|established)\b|\b(?:we |that we )?could (?:be )?(?:confirm|confirmed|verify|verified|find|found|establish|established)\b|\bwe could ?n[o']?t\b|\bunconfirmed\b|\bmay (?:well )?exist\b|\bturned up\b|\bin (?:our|the|this) research\b|\bnot (?:that )?we (?:could )?(?:found|find)\b/i;

export const launderedAbsence = (payload) => {
  const notes = (Array.isArray(payload?.uncertainties) ? payload.uncertainties : []).map(x => String(x || "")).filter(Boolean);
  if (!notes.length) return [];
  const fields = [...PROSE_FIELDS.map(k => payload?.[k]), ...listProse(payload)].map(x => String(x ?? "")).filter(Boolean);
  const out = [];
  for (const note of notes) {
    if (!NOT_FOUND.test(note)) continue;
    const subject = SUBJECTS.find(s => s.re.test(note));
    if (!subject) continue;
    for (const field of fields) {
      for (const sentence of String(field).split(/(?<=[.!?])\s+/)) {
        if (HEDGE_IN_PROSE.test(sentence)) continue;
        if (!ASSERTS_ABSENCE.test(sentence)) continue;
        if (!subject.re.test(sentence)) continue;
        out.push(
          `The research note says "${note.trim().slice(0, 110)}" — which is honest and correct. The prose then says "${sentence.trim().slice(0, 110)}", which is a statement about the world rather than about the search. ` +
          `A ${subject.key} nobody found is not a ${subject.key} that does not exist. Aalborg shipped "no single big annual festival" about the city with the largest carnival in Scandinavia. Say it could not be confirmed, or take the sentence out.`
        );
      }
    }
  }
  return [...new Set(out)];
};
