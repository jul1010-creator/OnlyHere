// ── A FESTIVAL IS HELD AT A VENUE, AND THE VENUE HAS ITS OWN NAME ───
//
// Read off twelve run logs, 5 Sep 2026. "Where this place is" came back empty
// on nine of eleven runs, every one of them printing the same sentence:
//
//   Google's first listing for this search is "X", which is not Y. Nothing was
//   taken from it: no website, no address, no hours, no coordinate. This is
//   what a search for a street or a square usually returns, whichever business
//   on it Google ranks first.
//
// That explanation is written for a different failure, and the listings it was
// throwing away were these:
//
//   Danish Travel Show      → MCH Messecenter Herning     the hall it is in
//   Bellahøj Kræmmermarked  → Bellahøj Hallerne           the hall it is at
//   Sebbersund Vikingemarked→ Vikingebyen                 the site it is on
//   Vinterlys Festival      → Strib Vinterfestival        a different festival
//   Næstved Food Festival   → Næstved Metalfest           a different festival
//
// The last two are correct refusals and must stay refusals. The first three are
// the pipeline throwing away the right coordinate because a venue is not called
// what the event is called.
//
// ── WHAT THE REFUSAL COSTS, IN THE SAME RUNS ────────────────────────
//
//   five of eleven drafts ended completely unplaced
//   with no region, "every place-scoped source is left out", so his four
//     founder sources stopped being scoped to the right corner of Denmark
//   "no transit itinerary was measured" appeared fourteen times
//
// One refusal in the first second degrades everything after it.
//
// ── AND THE FIX IS NOT TO LOOSEN THE NAME RULE ──────────────────────
//
// listingMatchesSubject is right and stays exactly as it is. A listing whose
// name is not the drafted name is not the drafted place, and accepting one on
// the strength of a shared town is how "Rungsted Festival" became Ringsted, one
// letter and sixty kilometres away, and took thirteen findings down with it.
//
// So this asks a DIFFERENT question, later, with evidence pass one did not
// have: not "is this listing the event" but "is this listing the place the
// event is held at, according to the pages we have now read". "MCH Messecenter
// Herning" is all over a Danish Travel Show page. Nothing has to be fetched to
// notice that, and no model has to be asked.
//
// ── IT RUNS IN THE SECOND ATTEMPT, WHICH IS WHY IT IS WORTH IT ──────
//
// The postal-address tier already there says of itself: "it runs here, not
// later, on purpose. Before the founder sources are chosen, so a region found
// this way still scopes them, and well before the frozen facts, so the nearest
// stop gets looked up from a real coordinate." Everything that sentence claims
// for a postcode is true of a venue, and a venue coordinate is Google's own
// point for the building rather than the middle of a postal district.
//
// ── THE THREE REFUSALS, AND WHY EACH ONE IS THERE ───────────────────
//
//   NO NAME OF ITS OWN     a listing that reduces to its town, or to nothing
//                          but category words, cannot be looked for. Searching
//                          the research for "Centret" finds every page.
//   NOT IN THE RESEARCH    the whole test. Named once is a passing mention;
//                          the same rule danishAddressIn's caller already
//                          applies to a postcode, learned the expensive way
//                          when one Copenhagen postcode in one unscoped snippet
//                          pinned two Aarhus and Odense bar streets to the
//                          wrong city.
//   TOO FAR FROM THE TOWN  a sanity bound, not a precision claim. Rungsted to
//                          Ringsted is fifty-five kilometres. A hall on the
//                          edge of the town it is named for is six.
import { fold, foundAt, variantsOf } from "./danishNames";
import { nameIsDistinctive } from "./sourcePolicy";

const clean = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();

// ── HOW MUCH EVIDENCE, AND WHY IT MOVES ─────────────────────────────
//
// Two mentions when the town is known, three when it is not. The distance guard
// is the other half of this pair, and when there is no town there is no
// distance to measure, so the half that remains has to carry more. Evidence
// scaling with the absence of a cross-check rather than a single number applied
// to two different situations.
export const VENUE_MIN_MENTIONS = 2;
export const VENUE_MIN_MENTIONS_NO_TOWN = 3;

// Twenty kilometres. Not a claim that the venue is within twenty kilometres of
// anything in particular: it is the line past which "held near the town it is
// named for" stops being a plausible reading of a listing. Bellahøj Hallerne is
// six kilometres from the middle of Copenhagen and a rural festival ground can
// be fifteen from its own village; Rungsted and Ringsted are fifty-five apart.
export const VENUE_MAX_KM = 20;

const COUNTRY_WORDS = new Set(["denmark", "danmark"]);

// ── WHAT THERE IS TO LOOK FOR ───────────────────────────────────────
//
// Google's `name` field only. `address` is deliberately not accepted as a
// fallback the way the refusal message reads it: a street address is not a
// venue name, and looking for "Vardevej 1" in the research would match the
// contact block of anything on that road.
//
// The town comes off for the reason subjectCore takes it off the typed name,
// and the country for the reason streetKey takes it off an address: Google's
// own formatted strings end in it, so the shape most likely to arrive is the
// one shape that would otherwise fail.
//
// Returns "" when nothing identifying is left, which is a REFUSAL and not an
// empty string to be searched for. foundAt walks a bounded loop on the needle's
// length and an empty needle there once hung the suite rather than failing it.
export const venueCore = (listingName, town = "") => {
  const raw = clean(String(listingName ?? "").replace(/\([^)]*\)/g, " "));
  if (!raw) return "";
  // ── AND AN ADDRESS IS NOT A NAME, EVEN WHEN ONE IS HANDED IN ─────
  //
  // The caller is told to pass pd.name and never pd.name || pd.address, and a
  // test asked what happens when it does anyway: "Vardevej 1, 7400 Herning"
  // came back as "Vardevej", a perfectly distinctive street name, and the
  // research would then be searched for a road. A module that documents a
  // refusal should enforce it rather than rely on its caller.
  //
  // THE POSTCODE IS THE TELL, not the house number. Every Danish address ends
  // in four digits and a town, and a venue's own name essentially never carries
  // a four-digit number, while "Hal 7" and "Bygning 3" do carry small ones and
  // are real names.
  if (/(?:^|\D)\d{4}(?:\D|$)/.test(raw)) return "";
  const kill = new Set();
  variantsOf(town).forEach(v => fold(clean(v)).split(/[^\p{L}\p{N}]+/u).filter(Boolean).forEach(w => kill.add(w)));
  const kept = raw.split(/[\s,]+/).filter(Boolean).filter(w => {
    const f = fold(w).replace(/[^\p{L}\p{N}]+/gu, "");
    if (!f) return false;
    if (/^\d/.test(f)) return false;          // house numbers and postcodes
    if (f.length < 2) return false;           // "København K", "15 B"
    if (COUNTRY_WORDS.has(f)) return false;
    return !kill.has(f);
  });
  const core = kept.join(" ").trim();
  // nameIsDistinctive is the existing test for "is this a name or a category".
  // A listing that reduces to "Centret" or "Hallen" identifies nothing, and
  // looking for it in the research would find every page that mentions a hall.
  //
  // ── ASKED OF THE BARE FORM, BECAUSE DANISH HIDES IT ──────────────
  // A test run put "Kulturhuset" through as distinctive: GENERIC_PLACE_WORDS
  // holds "kulturhus" and the definite article is a suffix, so the -et form
  // walked straight past a list that already contains the word. Stripping the
  // ending before asking is contained to this file; widening a set six other
  // callers read is not a change to make on the strength of one example.
  return core && nameIsDistinctive(bareForms(core)) ? core : "";
};

// The same closed set of endings the mention counter uses, taken OFF rather
// than allowed after. "Kulturhuset" asks as "kulturhus", "Hallerne" as "hall".
const bareForms = (value) => String(value || "").split(/\s+/).map(w => {
  const f = fold(w);
  for (const end of ["ernes", "erne", "ens", "ets", "ers", "en", "et", "er", "ne", "s"]) {
    if (end && f.length > end.length + 2 && f.endsWith(end)) return f.slice(0, -end.length);
  }
  return f;
}).join(" ");

// ── AND THIS IS ITS OWN LIST, WHICH TOOK TWO TRIES TO ACCEPT ────────
//
// The first version read GENERIC_PLACE_WORDS, on the argument that this
// codebase does not keep a second copy of a list it already has. Running it
// showed the two lists answer different questions and cannot substitute:
// GENERIC_PLACE_WORDS is "words that do not IDENTIFY a place", so it holds
// "festival" and "marked" alongside "hallen" and "arena". Read as "words that
// say this is a place", it made "Vinterfestival" a venue.
//
// So the words below are the building nouns only, and the list is deliberately
// short. It is not trying to describe every Danish venue; it only has to hold
// the ones that turn up glued to an event word, which is what the pair test
// needs to avoid refusing a Messecenter for containing "messe".
const VENUE_WORDS = [
  "center", "centret", "centre", "hal", "hallen", "haller", "arena", "stadion",
  "plads", "pladsen", "torv", "torvet", "park", "parken", "have", "haven",
  "havn", "havnen", "by", "byen", "slot", "slottet", "borg", "gaard", "gard",
  "museum", "museet", "teater", "teatret", "scene", "spillested", "hus", "huset",
  "forsamlingshus", "festsal", "kulturhus", "kro", "hotel", "anlaeg", "lystanlaeg",
];

// Containment on the RAW folded word, and equality on the bare one. Danish
// glues its compounds, so "messecenter" contains "center" outright, while
// "hallerne" contains no listed word at all and only matches once its ending is
// off. Both directions are needed and neither is enough alone: a test run had
// bareForms strip the "er" off "Messecenter" and leave "messecent", which
// matched nothing.
const namesAPlace = (core) => {
  const raw = fold(core).split(/[^a-z0-9]+/).filter(Boolean);
  const bare = bareForms(core).split(/\s+/).filter(Boolean);
  return raw.some(w => VENUE_WORDS.some(g => g.length > 2 && w.includes(g)))
      || bare.some(w => w.length > 2 && VENUE_WORDS.includes(w));
};

// ── WHOLE WORDS, AND THE DANISH ENDING THAT BREAKS THEM ─────────────
//
// foundAt is the counter this codebase already has and it matches whole words,
// which is right: a substring count would make "Bork" match "Borkum". The
// comment here used to claim a substring count was what would miss
// "Vikingebyens", and an adversarial review pointed out it is the other way
// round. Verified: foundAt("Vikingebyens billetter", "Vikingebyen") finds
// nothing, on exactly the Sebbersund run this file was written for.
//
// Danish forms a definite and a genitive by suffix, so a page about that site
// writes Vikingebyen, Vikingebyens and Vikingebyens åbningstider. Each is the
// same name with letters after it, and demanding a word boundary on the right
// throws away most of the evidence.
//
// ── AND A LENGTH RULE IS NOT AN ENDING RULE ─────────────────────────
//
// The first version of this allowed any run-on of up to three letters, and a
// test run caught it immediately: "Borkum" is "Bork" plus two, so the ferry
// port counted as a mention of the market. An ending is a closed set, so it is
// written as one. Nothing outside it is a mention.
const DANISH_ENDINGS = new Set(["", "s", "en", "ens", "et", "ets", "er", "ers", "erne", "ernes", "ne", "nes"]);

export const venueMentions = (core, text) => {
  const needle = clean(core);
  if (!needle) return 0;
  // foundAt hands back the folded haystack and the length it matched on, so the
  // inflected forms are counted off the same string rather than folded a second
  // time and hoped to agree.
  const { hay, len } = foundAt(String(text || ""), needle);
  if (!len) return 0;
  const marks = hay.replace(/[^a-z0-9]/g, " ");
  const flat = fold(needle).replace(/[^a-z0-9]/g, " ");
  let n = 0;
  for (let from = 0; from <= marks.length - flat.length;) {
    const i = marks.indexOf(flat, from);
    if (i < 0) break;
    const before = marks[i - 1];
    if (before === undefined || before === " ") {
      let end = i + flat.length;
      while (end < marks.length && marks[end] !== " ") end += 1;
      if (DANISH_ENDINGS.has(marks.slice(i + flat.length, end))) n += 1;
    }
    from = i + 1;
  }
  return n;
};

// ── THE SENTENCE OUT OF THE RESEARCH THAT JUSTIFIES IT ──────────────
// Quoted rather than summarised, the same rule every sweep in this codebase
// follows: a green tick over a row is a lie at exactly the moment somebody is
// deciding whether to accept it. Taken off the FOLDED text, because that is
// where the offsets are, so it reads lower case. That is a fair price for a
// quote whose position is certain.
export const venueQuote = (core, text, width = 60) => {
  const needle = clean(core);
  if (!needle) return "";
  const { hay, at, len } = foundAt(String(text || ""), needle);
  if (!at.length) return "";
  const from = Math.max(0, at[0] - width);
  const to = Math.min(hay.length, at[0] + len + width);
  return `${from > 0 ? "…" : ""}${hay.slice(from, to).trim()}${to < hay.length ? "…" : ""}`;
};

// ── A VENUE IS NOT AN EVENT ─────────────────────────────────────────
//
// The two refusals this file's header calls correct — "Vinterlys Festival" →
// "Strib Vinterfestival" and "Næstved Food Festival" → "Næstved Metalfest" —
// were not enforced by anything. Both survive the town strip as "Vinterfestival"
// and "Metalfest", both pass nameIsDistinctive, and mentions are counted per
// occurrence rather than per page, so one page carrying the name in its title,
// a heading and a footer clears the bar on its own.
//
// The thing that separates them from MCH Messecenter Herning is not how often
// they are named. It is that they are EVENTS. A hall, a site and a harbour are
// places; a festival is a thing that happens at one. So a listing whose own
// name says "festival" is refused here whatever the research says about it,
// which is the same shape as GENERIC_PLACE_WORDS refusing a category word:
// narrow, checkable, and wrong in the safe direction.
// ── AND DANISH GLUES ITS COMPOUNDS ──────────────────────────────────
//
// The first version asked for a word boundary and caught nothing, because the
// two names it exists to refuse are single glued words: "Vinterfestival" and
// "Metalfest". So the test is a substring.
//
// WHICH IMMEDIATELY OVERREACHED. "MCH Messecenter" contains "messe", and a
// Messecenter is a building. Rather than trimming the list until it stopped
// being wrong, the rule asks BOTH questions: an event word marks an event only
// when the name carries no word that marks a place. GENERIC_PLACE_WORDS is
// already that list, and it already holds hallen, arena, center, plads, torv,
// park, havn, festsal and kulturhus.
//
//   Vinterfestival   event word, no place word   → refused
//   Metalfest        event word, no place word   → refused
//   MCH Messecenter  event word AND "center"     → kept
//   Festivalpladsen  event word AND "plads"      → kept
const EVENT_WORDS = /festival|festspil|fest|marked|market|messe|udstilling|koncert|concert/i;

export const NO_NAME = "no-name";
export const IS_AN_EVENT = "is-an-event";
export const NOT_NAMED = "not-named";
export const TOO_FAR = "too-far";
export const OK = "ok";

// ── ONE VERDICT, WITH ITS REASON ────────────────────────────────────
//
// `kmFromTown` is passed in rather than measured here, so this module stays
// pure and the suite can ask it about a distance without standing up a town
// table. Pass null when no town is known: that is a real state and it is what
// raises the number of mentions required.
//
// Every branch returns the same shape, so a caller writes one line to log it.
export const venueVerdict = (listing, { town = "", text = "", kmFromTown = null } = {}) => {
  const name = clean(listing?.name);
  const core = venueCore(name, town);
  const base = { ok: false, name, core, mentions: 0, kmFromTown };
  if (!core) {
    return { ...base, code: NO_NAME,
      why: name
        ? `"${name}" reduces to nothing that identifies a place once the town and the category words come off, so there is nothing to look for in the research.`
        : "Google's listing came back with no name, so there is nothing to look for in the research." };
  }
  // ── Number(null) IS 0, AND 0 km PASSES EVERY DISTANCE TEST ────────
  // Found by an adversarial review before this was wired. `Number(null)`,
  // `Number(undefined)` is NaN but `Number(null)` is 0, so a caller with no
  // coordinate for the town passed the guard and the log read "sits 0.0 km from
  // Herning". That is the common case rather than a corner: townPointFor holds
  // 34 towns and none of Herning, Ringsted, Rungsted, Næstved or Sebbersund is
  // among them, so the Rungsted-to-Ringsted guard this file was written around
  // would never have fired on Rungsted.
  const knowsTown = !!clean(town) && typeof kmFromTown === "number" && Number.isFinite(kmFromTown);
  const km = knowsTown ? kmFromTown : NaN;
  if (knowsTown && km > VENUE_MAX_KM) {
    return { ...base, code: TOO_FAR,
      why: `"${core}" is ${km.toFixed(0)} km from ${clean(town)}, which is further than a venue is from the town it is named for. This is the Rungsted and Ringsted shape: one listing, one letter, and a different town.` };
  }
  if (EVENT_WORDS.test(fold(core)) && !namesAPlace(core)) {
    return { ...base, code: IS_AN_EVENT,
      why: `"${core}" names an event rather than a place. A venue is where something is held, and a listing that calls itself a festival, a market or a show is a different event with a similar name. This is the "Strib Vinterfestival" shape.` };
  }
  const need = knowsTown ? VENUE_MIN_MENTIONS : VENUE_MIN_MENTIONS_NO_TOWN;
  const mentions = venueMentions(core, text);
  if (mentions < need) {
    return { ...base, code: NOT_NAMED, mentions,
      why: mentions
        ? `"${core}" appears ${mentions === 1 ? "once" : `${mentions} times`} in everything read for this draft, which is short of the ${need} this needs without a town to check against. A name mentioned in passing is not the place it is held.`
        : `"${core}" does not appear anywhere in what was read for this draft, so nothing corroborates that this is where it is held.` };
  }
  return { ...base, ok: true, code: OK, mentions,
    quote: venueQuote(core, text),
    why: `"${core}" is named ${mentions} times in the pages read for this draft${knowsTown ? `, and sits ${km.toFixed(1)} km from ${clean(town)}` : ""}.` };
};

// ── AND IT IS RECORDED AS A VENUE, NOT AS THE EVENT ─────────────────
//
// The provenance line says "the venue", because claiming this coordinate is the
// event's own listing would be the same overstatement the refusal exists to
// prevent, one step further along. The caller must also NOT take the listing's
// name: placesName feeds the relevance filter, and renaming Danish Travel Show
// to MCH Messecenter Herning would send every later check looking for the hall.
export const venueVia = (verdict) =>
  verdict?.ok
    ? `the venue "${verdict.core}", named ${verdict.mentions} times in the research rather than matched by name`
    : "";

export const describeVenue = (verdict) => {
  if (!verdict) return "";
  return verdict.ok
    ? `${verdict.why} Taken as the VENUE and not as the event's own listing, so the name on the draft is unchanged.${verdict.quote ? ` The research says: "${verdict.quote}"` : ""}`
    : verdict.why;
};
