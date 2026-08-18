// MODE_DAY_KM and travelModeKey are imported, not re-derived: how far a mode goes
// in a day is decided in routeOrder.js, and a second copy of those numbers is how
// two parts of a product end up disagreeing about the same trip.
import { MODE_DAY_KM, travelModeKey } from "./routeOrder";

// ── "IT SUGGESTS HOSTELS, BUT THEN GIVES A SPECIFIC HOTEL??? ODD" ───
//
// Oliver, 9 Aug 2026, reading one guide:
//
//   Day 1  "book a hostel near Norreport... hostels start around EUR 30 per night"
//   Day 3  "Stay in central Odense... a comfortable hotel base" — Comwell H.C. Andersen Dolce
//
// He read that as the guide contradicting itself, and the first thing worth
// saying is that the pipeline was doing what it was told. enrichGuideDays runs
// ONE Claude call PER DAY, in parallel, and each call is told:
//
//   "central Copenhagen is expensive - a tight budget there realistically means
//    a hostel or budget guesthouse, not a hotel; the same budget in a smaller
//    town elsewhere in Denmark often comfortably covers a real hotel"
//
// So on the same budget, Copenhagen came back hostel and Odense came back hotel.
// That is the rule working. It is also, on the page, two sentences that appear
// to disagree about who this traveler is, because the ONE THING that makes them
// consistent, that Copenhagen costs more, is the thing neither sentence says.
//
// ── TWO SEPARATE FAULTS, AND ONLY ONE IS THE TIER ───────────────────
//
// 1. A REASON THAT IS NEVER STATED IS NOT A REASON THE READER HAS.
//    The days are generated independently and in parallel, so no day can see
//    what another said, and none of them knows it is the one that changed. The
//    fix is not to force one tier across a trip, which would be worse advice.
//    It is that a day recommending a different tier from the trip's own baseline
//    has to say why in the same sentence.
//
// 2. THE SENTENCE AND THE NAMED PROPERTY ARE NOT ALLOWED TO DISAGREE.
//    My first read of this was wrong and the correction is worth keeping. I
//    assumed the specific hotel was the sentence going off-script, because the
//    prompt asks the accommodation sentence for "an actual area/neighbourhood"
//    and gives an area as its example. It was not. The hotel came from
//    `recommendedStay`, a SEPARATE field with its own grounding rule: "ONLY if
//    one is explicitly present in the search context, exactly as named there",
//    and an empty string is called the correct answer most of the time. By that
//    rule the hotel was legitimate and checkable.
//
//    That makes Oliver's question sharper rather than softer. ONE Claude call
//    produces BOTH fields from ONE prompt, and it returned a sentence about
//    hostels and a property that is a hotel inside the same JSON object. Nothing
//    ever compared the two. The card then prints them next to each other.
//
//    So the fault is not "a hotel got named". It is that a single call
//    contradicted itself in one breath and no line of code was looking.

const clean = (v) => String(v == null ? "" : v).trim();

// ── WHAT KIND OF BED IS THIS SENTENCE TALKING ABOUT ─────────────────
// Ordered most specific first: "youth hostel" must not read as a hotel because
// the word "hostel" contains no "hotel" but "hostel" and "hotel" are one letter
// apart and easy to write a regex that confuses. Danish included, because the
// search context is Danish and the words come back in it: vandrerhjem is a
// hostel, kro is a country inn, campingplads is a campsite.
const TIERS = [
  // "danhostel" is spelled shut, so \bhostel\b could never see it, and Danhostel
  // is THE hostel chain in Denmark. Caught by writing a real chain name into a
  // test rather than by reading the regex.
  { id: "hostel", match: /\b(hostel|hostels|vandrerhjem|dorm|dormitory|danhostel)\b/i },
  { id: "camping", match: /\b(campsite|camping|campingplads|shelter|cabin|hytte)\b/i },
  { id: "apartment", match: /\b(apartment|apartments|airbnb|self[- ]catering|lejlighed)\b/i },
  { id: "guesthouse", match: /\b(guesthouse|guest house|bed and breakfast|b&b|pension|kro)\b/i },
  { id: "hotel", match: /\bhotels?\b/i },
];

// ── A SENTENCE THAT NAMES TWO TIERS IS NAMING ONE AND REJECTING ONE ──
// This was `TIERS.find(r => r.match.test(t))`, which answers "which entry of
// this list appears somewhere in the sentence", and that is not the question.
// The order of TIERS is a specificity ordering for the REGEXES (hostel before
// hotel so "youth hostel" is not read as a hotel); it says nothing about which
// tier a sentence is recommending. Reading it as if it did made list position
// beat everything the sentence said:
//
//   "a real hotel rather than a hostel"  ->  hostel
//
// which is the opposite of the sentence, and then costs twice. stayTierMismatch
// compares that answer against the named property, so a legitimately named
// hotel became "this day contradicts itself", a warning invented out of a
// sentence that was right. And stayTiers records the wrong tier for the day, so
// a trip that never changes tier looks like it does.
//
// This shape is not a corner case: the enrichment prompt explicitly contrasts
// the two tiers ("a tight budget there realistically means a hostel or budget
// guesthouse, NOT a hotel"), so the model is being taught to write it.
//
// Two rules, in this order:
//   1. A tier introduced by a contrast ("rather than a hostel", "not a hotel")
//      is the one being turned down. It does not count.
//   2. Of what is left, the one mentioned FIRST is the recommendation, because
//      that is how the sentence is built: lead with the advice.
//
// If every mention is rejected, the answer is null. "Not a hotel" says what the
// traveler is not booking and nothing about what they are, and inventing a tier
// from it would be exactly the guess this file exists to stop.
const CONTRAST = /(?:rather than|instead of|as opposed to|other than|not just|not|never|no)\s+(?:an?|the|any|some)?\s*$/i;

export const stayTier = (text) => {
  const t = clean(text);
  if (!t) return null;
  const hits = [];
  for (const tier of TIERS) {
    // A fresh regex per call, never TIERS' own: a /g/ pattern carries lastIndex
    // between calls and would skip matches on the second sentence it ever saw.
    const re = new RegExp(tier.match.source, "gi");
    let m;
    while ((m = re.exec(t)) !== null) {
      hits.push({ id: tier.id, at: m.index, rejected: CONTRAST.test(t.slice(0, m.index)) });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  const wanted = hits.filter(h => !h.rejected).sort((a, b) => a.at - b.at);
  return wanted.length ? wanted[0].id : null;
};

// ── AND WHETHER THAT TIER IS WHAT THEY ASKED FOR ────────────────────
//
// Oliver, 17 Aug 2026, reading a guide built from a conversation in which the
// traveller had said "We got plenty of money": the Where to stay card offered "a
// budget-friendly Wakeup Copenhagen hostel-style option if watching costs in the
// pricey capital."
//
// Nothing was wrong with the sentence in isolation, and stayTier reads it
// correctly as a hostel. The defect is that no part of the pipeline compared the
// recommendation against what the traveller said about money. The enrichment
// prompt teaches the contrast in the other direction, in its own words: "a tight
// budget there realistically means a hostel or budget guesthouse, NOT a hotel."
// Nothing taught it the opposite case, so a family with money got the tight-budget
// answer and a reason for it that contradicted them to their face.
//
// THREE LEVELS AND NOTHING FINER. A number per night would be a claim about
// Danish prices, which this file has no business making. Tight, middling and
// generous is all the recommendation needs, and all a sentence can support.
// Named travellerBudget, not budgetLevel: a per-entry `budgetLevel` field was
// retired on his instruction ("the average traveller doesn't know what mid-budget
// is in Denmark") and the suite asserts that name appears nowhere. This is a
// different question, about what the person said rather than what a place costs,
// and it gets its own name.
// ── "BUDGET" ON ITS OWN IS NOT A TIGHT BUDGET ────────────────────────
// Found 18 Aug 2026 by an adversarial review of the night's work, and it is the
// worst kind of bug this codebase can have: the product quoting a traveller's own
// words back at them, wrongly.
//
// The tight pattern contained the bare word `budget`. So "our budget is generous",
// "big budget for this trip" and "our daily budget is around 3000 kr" all read as
// TIGHT. Three consequences, all real code paths: the preview held every expensive
// restaurant behind a card reading "Above the budget you mentioned" — a printed
// claim about what they said, saying the opposite of what they said; the
// accommodation prompt was told "WHAT THEY SAID ABOUT MONEY: tight", recreating
// the hostel-for-a-rich-family bug this whole file was written to fix; and
// budgetTierMismatch emitted the flatly false sentence "They said the budget is
// tight".
//
// So `budget` only counts when something next to it says SMALL, and the generous
// list learned the ordinary ways people say the opposite. A bare "our budget is
// 3000 kr a day" now reads as no stated level at all, which is the honest answer:
// a figure without a currency-per-day rule attached is not a tier, and null rules
// nothing out.
const BUDGET_LEVELS = [
  { id: "tight", match: /\b(?:tight|cheap|shoestring|backpack(?:ing|er)?|hostel|as cheap as|saving money|watching (?:the )?(?:costs?|pennies)|not much (?:money|to spend))\b|\b(?:low|small|tight|limited|modest|strict)\s+budget\b|\bbudget\s+(?:is\s+)?(?:tight|small|low|limited|modest)\b|\bon a budget\b|\bbudget[- ]friendly\b/i },
  { id: "generous", match: /\b(?:plenty of money|money is no|no budget limit|splash(?:ing)? out|treat ourselves|luxur(?:y|ious)|high end|five star|5 star|whatever it costs|price is not|don'?t mind (?:the )?(?:cost|price|spending)|happy to spend)\b|\b(?:big|large|generous|healthy|decent|good|no real)\s+budget\b|\bbudget\s+(?:is\s+)?(?:generous|big|large|healthy|not an issue|no (?:issue|object|problem))\b/i },
  { id: "middling", match: /\b(?:moderate|mid[- ]?range|middling|reasonable|sensible|comfortable but not|nothing fancy)\b/i },
];

// Generous is tested before tight on purpose: "plenty of money" contains no tight
// word, but "we do not mind the cost, nothing fancy though" contains both, and the
// one that decides the tier is the one about how much they will spend rather than
// the one about taste.
export const travellerBudget = (text) => {
  const t = clean(text);
  if (!t) return null;
  const gen = BUDGET_LEVELS.find(b => b.id === "generous");
  if (gen.match.test(t)) return "generous";
  const tight = BUDGET_LEVELS.find(b => b.id === "tight");
  if (tight.match.test(t)) return "tight";
  const mid = BUDGET_LEVELS.find(b => b.id === "middling");
  return mid.match.test(t) ? "middling" : null;
};

// What a level rules OUT, not what it demands. A generous budget does not oblige
// anybody to book a five star hotel, and plenty of people with money stay in a
// converted kro on purpose. What it does forbid is being TOLD to save money they
// said they were not counting.
const RULED_OUT = {
  generous: ["hostel", "camping"],
  tight: ["hotel"],
};

// The sentence, not just the tier: "budget-friendly" and "if watching costs" are
// the phrases that make a recommendation an instruction to economise, and they are
// what contradicted him even where the tier itself might have been defensible.
const ECONOMISING = /\b(?:budget[- ]friendly|budget option|if watching costs?|to save money|cheaper option|keep costs down|on a budget)\b/i;

export const budgetTierMismatch = (level, accommodationText) => {
  const lvl = clean(level);
  const text = clean(accommodationText);
  if (!lvl || !text) return null;
  const tier = stayTier(text);
  const out = RULED_OUT[lvl] || [];
  if (tier && out.includes(tier)) {
    return {
      level: lvl, tier,
      detail: lvl === "generous"
        ? `They said money is not the constraint and this recommends a ${tier}. Suggest somewhere that matches what they told you, or say plainly why the ${tier} is genuinely the better choice here.`
        : `They said the budget is tight and this recommends a ${tier}.`,
    };
  }
  if (lvl === "generous" && ECONOMISING.test(text)) {
    return {
      level: lvl, tier: tier || "",
      detail: "They said money is not the constraint and this tells them to watch what they spend. Drop the economising, or name a real reason that has nothing to do with price.",
    };
  }
  return null;
};

// The tiers a whole trip recommends. More than one is not automatically wrong:
// a bike trip through Jutland genuinely mixes campsites and small hotels, and
// Copenhagen genuinely costs more than Odense. It is worth SEEING, which is
// different from being worth blocking.
export const stayTiers = (days) => {
  const found = [];
  for (const d of Array.isArray(days) ? days : []) {
    const tier = stayTier(d?.glance?.accommodation);
    if (tier && !found.includes(tier)) found.push(tier);
  }
  return found;
};

// ── A NAMED PROPERTY, WHICH IS A CLAIM NOTHING CHECKED ──────────────
// Looks for a proper noun sitting against a lodging word, in either order,
// because both are written: "Comwell H.C. Andersen Dolce" and "Hotel Odeon".
//
// DELIBERATELY CONSERVATIVE. This flags text for a human and for a prompt rule,
// so a false positive costs a re-write of a sentence that was fine, while a
// false negative ships an unverified business recommendation. Even so it will
// not fire on "stay near the Hotel Kong Frederik area" style phrasing used as
// a landmark, and that is accepted rather than solved: a landmark reference is
// not a recommendation.
const STOPWORDS = new Set(["the", "a", "an", "in", "at", "near", "by", "for", "and", "or", "of", "to", "from", "your", "this", "that", "with", "book", "stay", "central", "old", "new", "town", "city", "area", "district", "quarter", "harbour", "harbor", "centre", "center", "north", "south", "east", "west", "denmark", "danish"]);
// The lodging word and the proper noun need OPPOSITE case rules in one regex,
// so neither can use the /i flag: "Hotel Odeon" has a capital H, while the
// proper-noun part must stay case-SENSITIVE or every lowercase word after the
// word "hotel" reads as a hotel name. Written out per letter instead. This was
// wrong on the first attempt — the flags argument was "" and "Hotel Odeon"
// returned null — and found by a test using a real sentence rather than a
// lowercased one.
const LODGING = "(?:[Hh]otel|[Hh]ostel|[Ii]nn|[Kk]ro|[Vv]andrerhjem|[Gg]uesthouse|[Pp]ension|[Bb]&[Bb]|[Dd]anhostel)";
// A capitalised run: "H.C. Andersen Dolce", "Kong Frederik", "Odeon".
const PROPER = "(?:[A-ZÆØÅ][\\wÆØÅæøå.'-]*(?:\\s+[A-ZÆØÅ][\\wÆØÅæøå.'-]*){0,3})";

export const namedProperty = (text) => {
  const t = clean(text);
  if (!t) return null;
  // "Hotel Odeon" / "Hostel Copenhagen Downtown" — the lodging word leads.
  const after = t.match(new RegExp(`\\b${LODGING}\\s+(${PROPER})`, ""));
  if (after) {
    const name = after[1].trim();
    if (!STOPWORDS.has(name.split(/\s+/)[0].toLowerCase())) return name;
  }
  // "Comwell H.C. Andersen Dolce hotel" / "Danhostel Copenhagen" — the name
  // leads. Requires at least one capitalised word that is not a stopword.
  const before = t.match(new RegExp(`(${PROPER})\\s+${LODGING}\\b`, ""));
  if (before) {
    const words = before[1].trim().split(/\s+/).filter(w => !STOPWORDS.has(w.toLowerCase()));
    if (words.length) return words.join(" ");
  }
  return null;
};

// ── WHAT IS WRONG WITH THIS TRIP'S BEDS, IN PLAIN WORDS ─────────────
// Read by the plan check, phrased for a founder, and every line is a fact about
// the generated text rather than an opinion about where to sleep.
export const stayProblems = (days, budgetSaid = "") => {
  const out = [];
  const list = Array.isArray(days) ? days : [];
  // ── AGAINST WHAT THEY TOLD US ABOUT MONEY, FIRST ──────────────────
  // Before any question about the trip contradicting itself, the simpler one:
  // does it contradict THEM. His guide recommended a budget hostel to a family who
  // had just said they had plenty of money, and every check in this file was about
  // internal consistency, so the guide agreed with itself perfectly.
  const level = travellerBudget(budgetSaid);
  if (level) {
    const seen = new Set();
    list.forEach((d, i) => {
      const m = budgetTierMismatch(level, d?.glance?.accommodation);
      if (!m) return;
      // One line per distinct complaint, not per day: seven days of the same
      // mismatch is one problem with the guide, not seven.
      const key = `${m.tier}|${m.detail}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(`Day ${d?.day || i + 1}: ${m.detail}`);
    });
  }
  const tiers = stayTiers(list);
  if (tiers.length > 1) {
    // The reason the tier changed has to be IN the sentence, because the reader
    // has only the sentence. A day that switches tier and mentions cost is
    // explaining itself; one that does not is contradicting the trip.
    const unexplained = list.filter(d => {
      const text = clean(d?.glance?.accommodation);
      const tier = stayTier(text);
      return tier && tier !== tiers[0] && !/\b(expensive|pricier|cheaper|costs?|price|budget|affordable|dearer|goes further|stretches)\b/i.test(text);
    });
    if (unexplained.length) {
      out.push(`This trip recommends ${tiers.join(" and ")} on different days without saying why, which reads as the guide contradicting itself. Copenhagen costing more than a smaller town is a good reason, but it has to be in the sentence.`);
    }
  }
  for (const d of list) {
    const text = clean(d?.glance?.accommodation);
    const rec = clean(d?.glance?.recommendedStay);
    // The contradiction inside one call: the sentence says one kind of bed and
    // the property named beside it is another. This is the check that was
    // missing entirely, and it is the one Oliver's screenshot is about.
    if (stayTierMismatch(text, rec)) {
      out.push(`This day suggests a ${stayTier(text)} in the sentence and then names "${rec}", which is a ${stayTier(rec)}. Both come out of the same single call, so one of them is wrong and the reader has to pick.`);
    }
    // And the sentence naming its OWN property, separately from the field that
    // exists for exactly that and has a grounding rule attached to it.
    const name = !rec && namedProperty(text);
    if (name) {
      out.push(`The where-to-stay sentence names a specific place, "${name}", instead of an area. There is a separate field for a named property with a rule about only using one the search actually found; a name written into the prose skips that rule.`);
    }
  }
  return out;
};

// ── THE SENTENCE AND THE NAMED PROPERTY, ON THE SAME DAY ────────────
// After reading the pipeline: the specific hotel Oliver saw is NOT the sentence
// going off-script. It is `recommendedStay`, a separate field with its own
// grounding rule ("ONLY if one is explicitly present in the search context,
// exactly as named there"), and by that rule it was legitimate.
//
// Which makes his question sharper, not softer. One Claude call produces BOTH
// fields from ONE prompt, and it produced a sentence saying hostel and a
// property that is a hotel, in the same JSON object, and nothing looked at the
// two together. The card then prints them side by side.
//
// This is the check for that, and it only fires on a contradiction it can
// actually see: a property whose own NAME carries a tier word. "Danhostel
// Copenhagen" under a sentence about hotels is caught. "Comwell H.C. Andersen
// Dolce" carries no tier word in its name and is not caught here, which is
// stated rather than hidden: that half is the prompt's job below.
export const stayTierMismatch = (accommodationText, recommendedStayName) => {
  const said = stayTier(accommodationText);
  const named = stayTier(recommendedStayName);
  return !!said && !!named && said !== named;
};

// ── "IT'S NOT EXACTLY A DAY-TRIP FROM COPENHAGEN" ────────────────────
//
// Oliver, 17 Aug 2026, on a guide of his own, in the same breath as noticing that
// a stop called JOJO never said which town it was in.
//
// The phrasing is not the model inventing something. It is invited: the
// accommodation prompt in enrichGuideDays says, in as many words, "Only default to
// day-trip-from-Copenhagen phrasing if that is genuinely the better call for this
// specific day." Nothing measures whether it is. So the sentence can put a
// traveller in Copenhagen for a day in Aarhus, 185 km and about three hours of
// train away, each way.
//
// ── WHAT MAKES A DAY TRIP A DAY TRIP ─────────────────────────────────
// Out, a real amount of time at the place, and back, inside one day. So the
// one-way limit is not a day's travel, it is about a THIRD of one: two thirds of
// the day's travel budget is spent on the return journey and the rest of the day
// has to be worth going for.
//
// The numbers fall out of MODE_DAY_KM, so there is one place in the app that
// decides how far a mode goes in a day and this is not a second one:
//
//   car                300 / 3 = 100 km      Roskilde yes, Aarhus no
//   public transport   250 / 3 =  83 km      Helsingør yes, Odense marginal, Aarhus no
//   bike                60 / 3 =  20 km      the next town, and that is honest
//
// Aarhus from Copenhagen is 185 km. It fails on every mode, which is the answer he
// gave in one line.
export const DAY_TRIP_FRACTION = 3;

export const dayTripRadiusKm = (mode) => {
  const key = travelModeKey(mode);
  const perDay = key ? MODE_DAY_KM[key] : null;
  // No mode stated: use the slowest thing anybody drives, because claiming a day
  // trip is the risky direction and an unstated mode is not permission to assume
  // a car.
  const base = perDay != null ? perDay : MODE_DAY_KM["public transport"];
  return base / DAY_TRIP_FRACTION;
};

// The town a day-trip claim is anchored on, or null when the sentence makes no
// such claim. Deliberately narrow: it reads the shape the prompt actually invites
// ("a day trip from X", "day-trip from X", "as a day trip out of X") and nothing
// looser, because a false positive here silently edits a correct sentence.
// A DOT IS ONLY PART OF A NAME MID-WORD. The first version allowed "." anywhere in
// the town, so "day trips from Copenhagen." came back as "Copenhagen." — with the
// sentence's own full stop welded on, ready to be compared against a real town name
// and never match. A dot is kept only where a word character follows it ("St.
// Kongensgade"), never at the end.
const NAME_CHAR = "[\\wÆØÅæøå'’-]";
const NAME_PART = `[A-ZÆØÅ]${NAME_CHAR}*(?:\\.${NAME_CHAR}+)*`;
const DAY_TRIP_RE = new RegExp(`\\bday[\\s-]?trips?\\s+(?:from|out of)\\s+(${NAME_PART}(?:\\s+${NAME_PART})?)`);

export const dayTripClaim = (text) => {
  const m = String(text || "").match(DAY_TRIP_RE);
  if (!m) return null;
  // Trailing words that are not part of a place name.
  const town = String(m[1] || "").replace(/\s+(?:for|to|and|with|is|are|if|so|then|which|where|because)$/i, "").trim();
  return town || null;
};

// Is the claim true. `kmFromBase` is measured by the caller, because this file has
// no library and no geocoder and inventing one here would be a second source of
// truth about where places are.
//
// AN UNMEASURED CLAIM IS NOT ACCEPTED. Returning "fine, we could not check" would
// make every unresolvable town a licence to say day trip, which is the behaviour
// being fixed. Unknown reads as not established.
// ── ONE GUARD, BECAUSE THIS TRAP CAUGHT ME TWICE ─────────────────────
// Number(null) is 0. So is Number(""), Number([]) and Number(false). Both functions
// below started life with `Number.isFinite(Number(km))`, and both of them therefore
// read a MISSING distance as "zero kilometres away" — making an unmeasurable claim
// the single most honest one there is, the exact inversion of the rule each of them
// is for. The first was found by a smoke test, the second by an assertion written
// against the first. Two copies of a check is two chances to get it wrong, so there
// is one, and it returns null rather than a number nobody measured.
const measuredKm = (v) => {
  if (v == null || v === "" || typeof v === "boolean" || Array.isArray(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export const dayTripHonest = ({ kmFromBase = null, mode = null } = {}) => {
  const km = measuredKm(kmFromBase);
  if (km == null) return false;
  return km <= dayTripRadiusKm(mode);
};

// ── AND THE REPAIR IS A CUT, NEVER A REWRITE ─────────────────────────
// The clause comes out and nothing goes in its place. That matters: the rest of
// the sentence is a real recommendation about a real area, and replacing the false
// clause with a truer-sounding one would be this file inventing travel advice,
// which is the whole thing this product refuses to do. A shorter honest sentence
// beats a longer plausible one.
export const withoutDayTripClaim = (text) => {
  const raw = String(text || "");
  if (!dayTripClaim(raw)) return raw;
  const cut = raw
    // ", with easy day trips from Copenhagen" and " and take day trips out of X"
    .replace(/[,;]?\s*(?:and\s+|with\s+)?(?:easy\s+|simple\s+|straightforward\s+)?day[\s-]?trips?\s+(?:from|out of)\s+[^,.;]*/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/[,;]\s*\./g, ".")
    .trim();
  // If the cut leaves nothing a reader can act on, the whole sentence goes: an
  // accommodation card with no card is better than a fragment.
  const words = cut.replace(/[^\wÆØÅæøå\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length < 4) return "";
  return /[.!?]$/.test(cut) ? cut : `${cut}.`;
};

// What to tell him in Studio rather than silently repairing behind his back. The
// guide gets the cut sentence; this is the line that says a cut happened.
export const describeDayTripClaim = ({ town, kmFromBase, mode } = {}) => {
  if (!town) return "";
  const km = measuredKm(kmFromBase);
  const radius = Math.round(dayTripRadiusKm(mode));
  const how = travelModeKey(mode) || "public transport";
  if (km == null) {
    return `The stay line called this a day trip from ${town}, and the distance could not be measured, so the claim was removed rather than left standing.`;
  }
  return `The stay line called this a day trip from ${town}, which is ${Math.round(km)} km away. A day trip by ${how} is about ${radius} km each way, so the claim was removed.`;
};

// ── AND THE ONE FUNCTION THE GUIDE ACTUALLY CALLS ────────────────────
//
// Everything above this line was written on 17 Aug, tested, and wired to NOTHING.
// Found the next morning by grepping for its own exports: `dayTripHonest`,
// `withoutDayTripClaim` and `describeDayTripClaim` appeared in this file and in
// the suite and in no component. So the guide went on printing "day trips from
// Copenhagen" over a day in Aarhus, and the arithmetic that knew better sat in a
// module nobody imported.
//
// That is the eighth time this codebase has caught a helper written, tested and
// left unwired, and the fix is not a comment about being careful. It is this: ONE
// function that answers the whole question in the shape a render can use, so the
// caller is a single call instead of five, and the suite can assert that the page
// makes it.
//
// GEOGRAPHY STAYS OUT. `kmFromTown` is injected, because this file has no library
// and no geocoder, and building one here would be a second source of truth about
// where places are. The caller measures; this decides.
export const stayTextProblem = ({ text = "", mode = null, kmFromTown = null } = {}) => {
  const town = dayTripClaim(text);
  if (!town) return null;
  const km = typeof kmFromTown === "function" ? kmFromTown(town) : null;
  if (dayTripHonest({ kmFromBase: km, mode })) return null;
  return {
    town,
    kmFromBase: km,
    mode: travelModeKey(mode),
    // The cut sentence, which is what a reader gets. Never a rewrite: see
    // withoutDayTripClaim for why a shorter honest sentence beats a longer
    // plausible one.
    repaired: withoutDayTripClaim(text),
    // And the line that says a cut happened, for Studio rather than for a reader.
    note: describeDayTripClaim({ town, kmFromBase: km, mode }),
  };
};

// What the card should actually show, in one call, empty when the whole sentence
// was the false claim and there is nothing honest left to print.
export const stayTextForReader = ({ text = "", mode = null, kmFromTown = null } = {}) => {
  const problem = stayTextProblem({ text, mode, kmFromTown });
  return problem ? problem.repaired : String(text || "");
};
