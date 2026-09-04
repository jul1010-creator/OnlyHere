// ── "DO YOU MEAN..." ─────────────────────────────────────────────────
//
// Oliver, 17 Aug 2026: "you can also make it ask me, if it's not sure, 'do you
// mean..' like if multiple searches pop up."
//
// He arrived at this from the other end. His Heidi's draft was typed as "Heidi's
// (Aalborg)", and that parenthetical is a disambiguator he invented by hand
// because nothing ever offered him one. It is also what broke the whole run:
// every founder-source search ran on that literal string, the relevance filter
// refused everything, and the entry shipped with one source that could not even
// be read. The workaround for the missing feature was the bug.
//
// ── WHY THIS IS THE CHEAPEST GATE IN THE PIPELINE ───────────────────
// A wrong subject costs a full research pass: on that draft, 167 seconds, 32
// steps, and calls to Tavily, Perplexity, OpenAI, Claude and Google, to produce
// an entry that had to be thrown away. The question that would have prevented it
// costs nothing at all, because Google's Text Search is billed per REQUEST and
// not per result: asking for five candidates instead of one is the same call at
// the same price, and the app was already making it.
//
// ── AND IT MUST NOT ASK OFTEN ───────────────────────────────────────
// This is the part that decides whether the feature reads as smart or as a form.
// The same complaint he made about the Detour chat this morning applies here: a
// planner that asks a question it could have answered feels like paperwork. So
// the rules below are about NOT asking:
//
//   one candidate                  never ask. If its name is fuller than what he
//                                  typed, that is a resolution, not a question.
//   the same place listed twice     never ask. Two Google entries for one bar in
//                                  one town are a duplicate, not a choice.
//   the same name in two towns      ASK. This is the real case, and it is most of
//                                  them: a chain with a branch in five cities is
//                                  exactly what a bare name cannot settle.
//   different subjects entirely     ASK.
//
// Nothing here decides anything for him. It answers whether there is a real
// question, and hands back the candidates to show.
import { samePlaceName, variantsOf } from "./danishNames";
import { fold } from "./danishNames";
import { nameIsDistinctive } from "./sourcePolicy";

// Five. Enough for a chain with branches in the big cities, short enough to read
// at a glance on a phone, and Google's own text search rarely returns more than
// a handful worth showing.
export const CHOICE_LIMIT = 5;

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// A candidate is only usable if it has a name and a real coordinate. Google
// occasionally returns a result with no location at all, and a chooser row that
// resolves to nothing would be worse than not offering it.
export const cleanCandidates = (list, { limit = CHOICE_LIMIT } = {}) =>
  (Array.isArray(list) ? list : [])
    .map(c => ({
      name: clean(c?.name),
      address: clean(c?.address),
      town: clean(c?.town),
      lat: Number(c?.lat),
      lon: Number(c?.lon),
    }))
    .filter(c => c.name && Number.isFinite(c.lat) && Number.isFinite(c.lon))
    .slice(0, Math.max(0, Math.trunc(Number(limit) || CHOICE_LIMIT)));

// ── IS THE TYPED NAME ABOUT THIS CANDIDATE AT ALL ───────────────────
// "Heidi's" and "Heidi's Bier Bar Aalborg" are the same subject: one is the
// other with more of its own name. samePlaceName answers the exact-variant case
// (Copenhagen and København), and the containment test answers the partial one,
// which is the case a person typing into a box actually produces.
//
// Whole words on both sides. Without that, "Ribe" is inside "Ribers" and every
// short name matches half of Denmark.
export const sameSubject = (typed, candidate) => {
  const a = fold(clean(typed));
  const b = fold(clean(candidate));
  if (!a || !b) return false;
  if (a === b) return true;
  if (samePlaceName(typed, candidate)) return true;
  const words = (s) => s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const A = words(a), B = words(b);
  if (!A.length || !B.length) return false;
  const shorter = A.length <= B.length ? A : B;
  const longer = A.length <= B.length ? B : A;
  // Every word of the shorter name appears in the longer one, in order.
  let i = 0;
  for (const w of longer) { if (w === shorter[i]) i++; if (i === shorter.length) return true; }
  return false;
};

// Two candidates that are the same real place. A town is the decider: the same
// name in two towns is two places, however identical the words are, and that is
// the case this whole feature exists for.
export const sameCandidate = (a, b) => {
  if (!a || !b) return false;
  const townA = fold(clean(a.town)), townB = fold(clean(b.town));
  if (townA && townB && townA !== townB) return false;
  return sameSubject(a.name, b.name);
};

// The real question: is there anything to ask.
export const needsChoosing = (typed, candidates, { limit = CHOICE_LIMIT } = {}) => {
  const list = cleanCandidates(candidates, { limit });
  if (list.length < 2) return false;
  // Every candidate the same place as the first means Google listed one place
  // more than once. That is not a choice.
  return list.slice(1).some(c => !sameCandidate(list[0], c));
};

// What to show, worst-first-avoided: the order Google returned, because its
// ranking is better than anything that could be re-derived here, with the ones
// that are duplicates of an earlier row dropped so the list reads as choices.
export const choicesFor = (typed, candidates, { limit = CHOICE_LIMIT } = {}) => {
  const list = cleanCandidates(candidates, { limit });
  const out = [];
  list.forEach(c => {
    if (out.some(k => sameCandidate(k, c))) return;
    out.push(c);
  });
  return out;
};

// One line for the run log and the panel, and it never editorialises. It says
// what was found and what is being asked, so the log of a draft that paused
// reads as a decision rather than as a gap.
export const describeChoosing = (typed, candidates, { limit = CHOICE_LIMIT } = {}) => {
  const list = choicesFor(typed, candidates, { limit });
  if (!list.length) return `Google knows no place called "${clean(typed)}".`;
  if (list.length === 1) {
    const only = list[0];
    return sameSubject(typed, only.name) && fold(clean(typed)) === fold(only.name)
      ? `One place, and it is called what you typed: ${only.name}${only.town ? `, ${only.town}` : ""}.`
      : `One place, and Google calls it ${only.name}${only.town ? `, ${only.town}` : ""}. Using that name.`;
  }
  const towns = [...new Set(list.map(c => c.town).filter(Boolean))];
  const spread = towns.length > 1 ? ` in ${towns.join(", ")}` : "";
  return `${list.length} places match "${clean(typed)}"${spread}. Asking which one before spending a research pass on the wrong one.`;
};

// ── AND THE ANSWER, WHICHEVER WAY IT GOES ───────────────────────────
// A chosen candidate replaces the typed name, the town and the coordinate
// together, because those three have to agree: a name from one listing beside a
// coordinate from another is how a draft ends up describing one place and
// mapping a different one. Choosing "none of these" keeps every one of them
// exactly as typed, and says so, rather than half-applying a guess.
export const applyChoice = (typed, choice) => {
  if (!choice || !choice.name) return { name: clean(typed), town: "", coords: null, resolved: false };
  return {
    name: clean(choice.name),
    town: clean(choice.town),
    coords: Number.isFinite(Number(choice.lat)) && Number.isFinite(Number(choice.lon))
      ? { lat: Number(choice.lat), lon: Number(choice.lon) }
      : null,
    resolved: fold(clean(choice.name)) !== fold(clean(typed)),
  };
};

// ── AND THE SAME QUESTION ABOUT A LISTING NOBODY CHOSE ──────────────
//
// Found 17 Aug 2026 while answering his question about the Studio types, in the
// block that fetches Google's business listing. It reads data.places[0] and uses
// it with NO check that the listing is about the thing being drafted, and what it
// takes from it is the strongest material in the pipeline: the "official website"
// (which bypasses the domain matcher entirely, by design), the "VERIFIED
// ADDRESS", the "VERIFIED OPENING HOURS", and a re-derived coordinate that
// overwrites the frozen facts.
//
// For a venue that is fine: a text search for a bar returns the bar. For a
// STREET it is not fine at all, and foodStreet has been in that gate for weeks.
// A search for "Jægergårdsgade Aarhus" returns whichever business on that street
// Google ranks first, and then one restaurant's opening hours are published as
// the street's verified hours, with its website as the street's official site.
// Nothing in the run log would say so, because from inside the block a wrong
// listing and a right one are the same shape of answer.
//
// So the listing has to be about the subject before anything is taken from it.
// The comparison is the same sameSubject above, with one adjustment: the founder
// types a town into the box ("Rundetaarn Copenhagen", his own placeholder text
// says so) and Google's listing is called "Rundetårn". Comparing those two
// literally refuses a correct listing, so the town gets dropped from what he
// typed before comparing.
export const subjectCore = (typed, town = "") => {
  // Parentheses go first. They are his own disambiguator, as in "Heidi's
  // (Aalborg)", and they are never part of a registered business name.
  const raw = clean(String(typed ?? "").replace(/\([^)]*\)/g, " "));
  if (!raw) return "";
  const kill = new Set();
  variantsOf(town).forEach(v => fold(clean(v)).split(/[^\p{L}\p{N}]+/u).filter(Boolean).forEach(w => kill.add(w)));
  if (!kill.size) return raw;
  const kept = raw.split(/\s+/).filter(w => !kill.has(fold(w).replace(/[^\p{L}\p{N}]+/gu, "")));
  const core = kept.join(" ").trim();
  // Never return nothing, and never return a core that is no longer a name:
  // "Aalborg Zoo" minus its town is "Zoo", which would match a zoo in any city.
  // nameIsDistinctive is the existing test for exactly that.
  return core && core !== raw && nameIsDistinctive(core) ? core : raw;
};

// ── A STREET IS NOT A BUSINESS, AND EVERY BUSINESS ON IT IS ─────────
//
// sameSubject accepts a candidate that is the typed name plus more of its own
// name, because that is what a person typing into a box produces: "Heidi's"
// really is "Heidi's Bier Bar Aalborg". For a street the containment runs the
// other way and is always wrong. Vestergade Apotek, Vestergade Tandklinik and
// Vestergade Pizza all contain Vestergade, all sit on it, and none of them IS
// it, so the first one Google ranks was accepted as the street's own listing
// and its website, its opening hours and its business status went into the
// draft. A pharmacy that closed becomes CLOSED_PERMANENTLY on a bar street.
//
// describeListingRefusal below has said so in words since it was written: "This
// is what a search for a street or a square usually returns, whichever business
// on it Google ranks first." The sentence was right and nothing acted on it.
//
// So for a street the listing has to BE the street: the same words, once the
// town, the house number and the postcode are taken off. Nothing added.
// ── AND THE WORD AT THE END OF EVERY DANISH ADDRESS ─────────────────
// The first draft of this stripped the town, the house number and the postcode
// and stopped there, so "Gothersgade, Copenhagen, Denmark" reduced to
// "gothersgade denmark" and did not equal "gothersgade". Google's own formatted
// address always ends in the country, and this app's mapHint convention is
// literally "Street name, postcode City, Denmark", so the ONE shape most likely
// to arrive was the one shape that failed. The street's own listing was then
// refused, which is the outcome the refusal message promises for a WRONG
// listing, applied to the right one.
//
// The town alone is not enough either: the town is only known once something
// has resolved it, and the case this runs in is often the case where nothing
// has. So the country comes off by name, in both languages, always.
const COUNTRY_WORDS = new Set(["denmark", "danmark"]);
const streetKey = (value, town) => {
  const kill = new Set();
  variantsOf(town).forEach(v => fold(clean(v)).split(/[^\p{L}\p{N}]+/u).filter(Boolean).forEach(w => kill.add(w)));
  return fold(clean(value))
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    // House numbers, postcodes, and the single letters Danish addresses use for
    // a city district ("København K") or a stairway ("15 B").
    .filter(w => !/^\d/.test(w) && w.length > 1)
    .filter(w => !COUNTRY_WORDS.has(w))
    .filter(w => !kill.has(w))
    .join(" ");
};

// Exported so the caller can say which case it is in, and so the suite can ask
// the question directly rather than through the wrapper.
export const streetListingMatches = (typed, town, listing) => {
  const a = streetKey(typed, town), b = streetKey(listing, town);
  return !!a && !!b && a === b;
};

// Is Google's listing about the thing being drafted. Both directions, because
// either side can be the fuller name: he types "Heidi's" and the listing is
// "Heidi's Bier Bar", or he types "Rundetaarn Copenhagen" and it is "Rundetårn".
//
// `theNameIsAStreet` is an OPTION rather than a fourth positional argument. A
// boolean in fourth place next to three strings is the shape of the bug this
// repository has already paid for twice: transitProblems was called
// positionally where it wanted an options object, and three assertions passed
// vacuously because of it.
export const listingMatchesSubject = (typed, town, listing, { theNameIsAStreet = false } = {}) => {
  const got = clean(listing);
  if (!got || !clean(typed)) return false;
  if (theNameIsAStreet) return streetListingMatches(typed, town, got);
  if (sameSubject(typed, got)) return true;
  const core = subjectCore(typed, town);
  return core !== clean(typed) && sameSubject(core, got);
};

// What the log says when a listing is refused. It names the listing, because
// "Google had nothing" and "Google had something about a different place" are
// different facts and the run log has to be able to tell them apart.
export const describeListingRefusal = (typed, town, listing) => {
  const got = clean(listing);
  if (!got) return `Google's listing came back with no name, so there was no way to tell whether it is this place. Nothing was taken from it.`;
  return `Google's first listing for this search is "${got}", which is not ${clean(typed)}. Nothing was taken from it: no website, no address, no hours, no coordinate. This is what a search for a street or a square usually returns, whichever business on it Google ranks first.`;
};

// The uncertainty a resolved name earns, in the shape the drafting rules already
// demand for a corrected spelling: "use the correct, search-confirmed spelling
// even if the input had a typo, note the correction in uncertainties rather than
// silently repeating it." A silent rename is the thing that rule forbids.
export const choiceNote = (typed, applied) => {
  if (!applied?.resolved) return "";
  return `The name was typed as "${clean(typed)}" and published under "${clean(applied.name)}", which is the name Google's own listing for this place uses.`;
};
