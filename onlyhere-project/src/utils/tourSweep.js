// ── FINDING THE THING TO DO, RATHER THAN THE TICKET ──────────────────
//
// Oliver, 9 Sep 2026: "Can we put activities into the different blogs? Like pub
// crawl wouldn't need to go all the way into a blog, but rather stay in the
// nightlife town tab of Aarhus if it was pubcrawl in Aarhus", and then, on
// paying for it: "Yes it will cost a little extra to do a websearch through get
// your guide... But I'm willing to spent those tokens."
//
// ── WHY A SEARCH HERE AND A FILE FOR WEGOTRIP ───────────────────────
//
// WeGoTrip publishes its entire Danish catalogue on one page, twenty products,
// so data/wegotrip.js holds it and the match costs nothing. GetYourGuide holds
// hundreds of thousands of products and publishes no Danish list, which is the
// same wall Tiqets is, and a search is the only way through it.
//
// AND IT RUNS AT SWEEP TIME, NEVER AT RENDER. One query per town and kind,
// once, stamped with the day it ran. A live version would cost a search every
// time a reader opened Aarhus nightlife, which is per pageview for something
// that changes twice a year.
import { isGetyourguideProductUrl } from "./affiliates";

const clean = (v) => String(v ?? "").trim();
const fold = (v) => clean(v).toLowerCase()
  .replace(/[øö]/g, "o").replace(/[æä]/g, "ae").replace(/[åá]/g, "a")
  .replace(/[^a-z0-9]+/g, "");

// ── ONE QUERY PER KIND, NOT ONE COMBINED ONE ────────────────────────
//
// The same call ticketQueries makes and for the same reason: a search engine
// answers "site:x A" well and "site:x (A OR B OR C)" badly. The words after the
// town are what separate a pub crawl from a food tour on a site that sells
// both, and a combined query gets whichever GetYourGuide happens to rank.
const KIND_WORDS = {
  nightlife: "bar crawl OR pub crawl OR beer tasting",
  food: "food tour OR food tasting",
  attraction: "guided tour",
  town: "walking tour",
};

export const tourQuery = (town, kind) => {
  const t = clean(town);
  const words = KIND_WORDS[clean(kind)];
  // "" rather than a query with a hole in it. A caller with no town or an
  // unknown kind has nothing to ask, and asking anyway spends a search to
  // learn that.
  if (!t || !words) return "";
  return `site:getyourguide.com "${t}" ${words}`;
};

// ── AND THE ANSWER HAS TO BE ABOUT THIS TOWN ────────────────────────
//
// A search for "Aarhus pub crawl" returns Copenhagen products, and a Copenhagen
// bar crawl on the Aarhus page is the failure ticketUrlSaysElsewhere exists to
// stop, one country smaller.
//
// GetYourGuide puts the city in the path: /da-dk/aarhus-l32302/<slug>-t693822/.
// So the town is checkable off the address itself rather than off a title, and
// a title is the part a marketplace writes to be found rather than to be true.
export const tourUrlIsAboutTown = (url, town) => {
  const t = fold(town);
  if (!t || !isGetyourguideProductUrl(url)) return false;
  try {
    const path = fold(new URL(String(url)).pathname);
    return path.includes(t);
  } catch { return false; }
};

// ── WHAT THE SENTENCE CALLS IT ──────────────────────────────────────
//
// Oliver's own line is "Or hop onto Getyourguide and book a beerwalk!", and the
// half that matters is "a beerwalk": the sentence ends on a plain noun phrase
// that says what the thing IS.
//
// NOT THE PRODUCT'S TITLE. GetYourGuide titles are written to sell, and reading
// "Aarhus: Craft Beerwalk with 5 Beers & Snacks Included" aloud in Gemlyx's
// voice is quoting an advert as though it were a recommendation. It is also
// English, on a site whose Danish readers were promised Danish.
//
// So the phrase comes from a small vocabulary matched against the SLUG, and the
// keys are English phrases translated in entryWords.js exactly as every other
// word a reader meets is. A slug nobody has a word for falls back to the kind,
// which is vaguer and still true.
// ── AND THE SLUG IS OFTEN DANISH ────────────────────────────────────
//
// Caught by the suite on the first canal tour: on the da-dk locale the address
// is kobenhavn-kanal-badtur-fra-gammel-strand-t37848, and a vocabulary written
// against English slugs matched none of it and fell back to "a guided walk" for
// a boat. Both spellings, therefore, and the Danish one first where they differ,
// because the Danish site is the one the links come from.
//
// ORDER MATTERS. A beer walk is also a walk, so the specific patterns are above
// the general ones and the first match wins.
const PHRASES = [
  [/ol-?vandring|beer-?walk|beerwalk/, "a beer walk"],
  [/bar-?rundtur|pub-?crawl|bar-?crawl/, "a bar crawl"],
  [/bryggeri|beer-?tast|olsmagning/, "a brewery tasting"],
  [/mad-?tur|madtur|food-?tour|food-?tast|street-?food/, "a food tour"],
  [/kanal|canal|bad-?tur|badtur|boat|havnerundfart|harbou?r-?cruise/, "a canal tour"],
  [/cykel|bike-?tour|cycling-?tour/, "a bike tour"],
  [/vandretur|byvandring|walking-?tour|city-?walk|guided-?walk/, "a guided walk"],
  [/viking/, "a Viking tour"],
  [/slot|castle/, "a castle tour"],
];

const KIND_PHRASE = {
  nightlife: "a night out",
  food: "a food tour",
  attraction: "a guided tour",
  town: "a guided walk",
};

export const tourPhrase = (url, kind) => {
  const path = String(url || "").toLowerCase();
  for (const [re, phrase] of PHRASES) if (re.test(path)) return phrase;
  return KIND_PHRASE[clean(kind)] || "a guided tour";
};

// ── AND WHICH KIND A DRAFT IS ──────────────────────────────────────
//
// The entry type the draft is being written for decides which words the query
// carries, so a nightlife town asks about bar crawls and a food street asks
// about food tours. Read from the type rather than chosen by the caller,
// because the caller is the drafting pipeline and it already knows the type.
//
// A type not on this list gets NO search, which is most of them. An attraction
// draft asking GetYourGuide for a guided tour of one museum is the overlap this
// whole design exists to avoid: Tiqets sells that door and this file must not
// go looking for a second seller of it.
const KIND_FOR_TYPE = {
  town: "town",
  nightTown: "nightlife",
  nightStreet: "nightlife",
  foodStreet: "food",
};

export const tourKindFor = (placeType) => KIND_FOR_TYPE[clean(placeType)] || "";

// ── PICKING ONE, AND ONLY ONE ───────────────────────────────────────
//
// One line per section, never a list. A list is a gallery and the sentence is
// the product, which is the same call the photo rail made and the same one the
// car link made about offering two rental buttons.
//
// FIRST THAT SURVIVES, in the order the search returned. Ranking them ourselves
// would need a quality signal we do not have, and inventing one is worse than
// taking the engine's.
export const pickTourUrl = (results, { town } = {}) => {
  const list = (Array.isArray(results) ? results : []).filter(r => r?.url);
  const ok = list.filter(r => isGetyourguideProductUrl(r.url) && tourUrlIsAboutTown(r.url, town));
  return ok.length ? ok[0].url : null;
};
