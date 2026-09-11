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
import { variantsOf } from "./danishNames";
import { cleanTourUrl } from "./ticketLink";
import { parentTownOf } from "./previewMatch";
import { isExcluded } from "./exclusions";

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
// ── AND EVERY SPELLING OF THE TOWN, WHICH IS THE WHOLE OF IT ────────
//
// Found by an adversarial review of this file on 9 Sep 2026, and it was the
// worked example in the comment above: this app calls the capital Copenhagen,
// GetYourGuide's Danish path says kobenhavn, and folding does not bridge them.
// So the first version of this refused every Copenhagen activity there is,
// which is most of their Danish inventory, and stamped the town "nothing here"
// for ninety days on the way out.
//
// variantsOf is the function this codebase already uses to turn one name into
// every spelling of itself, and affiliates.tripcomCity calls it for exactly
// this reason with a comment saying "København reaches nothing at all". Second
// time the same wall, second time the same answer.
export const tourUrlIsAboutTown = (url, town) => {
  const said = String(town || "").trim();
  if (!said || !isGetyourguideProductUrl(url)) return false;
  let path = "";
  try { path = fold(new URL(String(url)).pathname); } catch { return false; }
  if (!path) return false;
  return variantsOf(said).some((v) => {
    const t = fold(v);
    return !!t && path.includes(t);
  });
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
  // Baja Bikes joined on 11 Sep 2026 and its slugs are plain English with no
  // "bike" in most of them: copenhagen-christianshavn, copenhagen-by-night,
  // copenhagen-sightseeing. Read off the slug like every line here, because
  // their own titles are written to sell and reading one aloud in Gemlyx's voice
  // quotes an advert as though it were a recommendation.
  [/copenhagen-by-night|by-?night/, "a bike tour after dark"],
  [/copenhagen-christianshavn|christianshavn/, "a bike tour through Christianshavn"],
  [/student-bike-tour/, "a student bike tour"],
  [/christmas-bike-tour/, "a Christmas bike tour"],
  [/private-guide/, "a private guide"],
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

// ── AND WHICH TOWN TO ASK ABOUT, WHICH IS NOT ALWAYS THE NAME ───────
//
// Found by an adversarial review, 9 Sep 2026. A bar street is called "Jomfru
// Ane Gade" and a food street is called "Reffen", and GetYourGuide's address
// carries the CITY: aalborg-l32304, kobenhavn-l12. So a search named after the
// street could never match its own answer, and every street on the site was
// costing a credit to be told no and then stamped for ninety days.
//
// A town asks about itself. Everything else asks about the town it is in,
// through parentTownOf, which is the same function affiliateSweep uses to decide
// which town a ticket search is scoped to.
export const tourTownFor = (payload) => {
  const p = payload || {};
  const own = String(p.name || "").trim();
  const kind = tourKindFor(p._src || p.type);
  if (kind === "town") return own;
  return parentTownOf(p) || own;
};

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

// ── THE BACKFILL, FOR TOWNS ALREADY PUBLISHED ───────────────────────
//
// The search above runs when a town is DRAFTED, which helps every town written
// from now on and none of the ones already live. Oliver has around sixty of
// those, so the panel that asks about them is what makes this a feature rather
// than a promise.
//
// NOTHING HERE FETCHES AND NOTHING HERE SAVES. It returns what it WOULD write,
// so the panel shows him the line before it reaches a public page and a wrong
// match is something he declines rather than something he discovers. Same split
// affiliateSweep.js documents, and the same reason.
export const FOUND = "found";
export const NOTHING = "nothing";
export const FAILED = "failed";

// A town that came back empty is not asked again tomorrow. Long, because
// GetYourGuide's Danish catalogue changes on the scale of seasons and asking
// sixty towns weekly would spend sixty credits to learn nothing.
export const TOUR_RESWEEP_DAYS = 90;

const isoDay = (d) => {
  const t = d instanceof Date ? d : new Date(d);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString().slice(0, 10);
};

const daysSince = (at, today) => {
  const then = new Date(String(at || ""));
  const now = today instanceof Date ? today : new Date(today);
  if (Number.isNaN(then.getTime()) || Number.isNaN(now.getTime())) return Infinity;
  return Math.floor((now - then) / 86400000);
};

// ── WHICH ROWS ARE WORTH A SEARCH ───────────────────────────────────
//
// A town with a tour already on it is not asked. A town stamped "nothing here"
// inside the resweep window is not asked either, which is the whole point of
// writing that stamp down: sixty credits a week to re-learn that GetYourGuide
// has nothing in Hornbæk is sixty credits a week wasted.
//
// AND ONLY THE TYPES WHOSE PAGE IT BELONGS ON, through tourKindFor, so an
// attraction is never in this list. Tiqets sells that door.
export const tourCandidates = (rows, { today = new Date() } = {}) =>
  (Array.isArray(rows) ? rows : []).filter((r) => {
    const p = r?.payload || r || {};
    if (!tourKindFor(p._src || p.type || r?.type)) return false;
    if (isGetyourguideProductUrl(p.tourUrl)) return false;
    const swept = p.__tourSweep;
    if (swept?.found === false && daysSince(swept.at, today) < TOUR_RESWEEP_DAYS) return false;
    return true;
  });

// ── THE PROPOSAL ────────────────────────────────────────────────────
//
// `others` is the half Oliver asked for by name: "put in a feature as well so I
// can replace it with another, if I know of a better or it's not matching (from
// a bug)." The search returned up to eight results and we picked one; the rest
// were paid for already and throwing them away would make "replace" mean
// "go and find one yourself".
export const tourProposal = (row, results, { today = new Date(), failed = 0 } = {}) => {
  const p = row?.payload || row || {};
  // The street is what the entry is CALLED; the town is what GetYourGuide files
  // the activity under. See tourTownFor.
  const town = tourTownFor(p) || "(unnamed)";
  const label = String(p.name || "").trim() || town;
  const kind = tourKindFor(p._src || p.type || row?.type);
  const at = isoDay(today);
  const list = (Array.isArray(results) ? results : []).filter(r => r?.url);
  const usable = list.filter(r => isGetyourguideProductUrl(r.url) && tourUrlIsAboutTown(r.url, town));
  const url = usable.length ? usable[0].url : null;

  // ANY FAILED QUERY POISONS A "NO" AND NOT A "YES". affiliateSweep paid for
  // this lesson: a quota part way through a run looks exactly like "nobody
  // sells this", and writing it down as one hides the row for the whole
  // resweep window. No `set`, so nothing is written and it stays in the list.
  if (!url && Number(failed) > 0) {
    return {
      id: row?.id, name: label, town, kind, verdict: FAILED, at, others: [],
      why: `The search itself failed for ${town}, so nothing is known either way. A quota or a rate limit looks exactly like "GetYourGuide has nothing here", and recording it as one would hide this town for ${TOUR_RESWEEP_DAYS} days.`,
    };
  }
  if (!url) {
    return {
      id: row?.id, name: label, town, kind, verdict: NOTHING, at, others: [],
      why: list.length
        ? `${list.length} ${list.length === 1 ? "result" : "results"} came back and none is a GetYourGuide activity page for ${town}. Their city is in the address, so a product for somewhere else is refused rather than landed on this town.`
        : `Nothing came back for ${town}. Their Danish coverage is thick in the big towns and thin everywhere else, and no activity is the right answer for most of this country.`,
      set: { __tourSweep: { at, found: false } },
    };
  }
  return {
    id: row?.id, name: label, town, kind, verdict: FOUND, at, url,
    phrase: tourPhrase(url, kind),
    // The runners-up, so replacing one is a choice rather than an errand.
    others: usable.slice(1, 4).map(r => ({ url: r.url, phrase: tourPhrase(r.url, kind) })),
    why: `Their own address names ${town}, and the slug reads as ${tourPhrase(url, kind)}.`,
    set: { tourUrl: url, __tourSweep: { at, found: true, url } },
  };
};

// ── AND REPLACING ONE BY HAND ───────────────────────────────────────
//
// Oliver: "so I can replace it with another, if I know of a better or it's not
// matching (from a bug)." Either a runner-up from the same search or an address
// he pastes, and both go through the same door, because a pasted link is the one
// nothing has checked.
//
// THE TOWN CHECK IS NOT APPLIED TO A HAND-PICKED LINK. He may know that the
// right activity for Ebeltoft is listed under Aarhus, and refusing his own
// choice on a slug rule would make the feature useless exactly when it matters.
// The product check IS applied, because a category page is not an activity
// however sure anybody is about it.
export const replaceTour = (proposal, url) => {
  // CLEANED FIRST. He pastes what the portal or a search result handed him, and
  // both of those carry a partner id, his own session id and a party size. See
  // ticketLink.cleanTourUrl for what comes off and why each one matters.
  const raw = cleanTourUrl(url);
  if (!isGetyourguideProductUrl(raw)) {
    return { ...proposal, replaceError: "That is not a GetYourGuide activity page. Their activity addresses end in the activity id, like -t693822/, and a city or search page is not something a reader can book." };
  }
  const kind = proposal?.kind || "";
  return {
    ...proposal,
    verdict: FOUND,
    url: raw,
    phrase: tourPhrase(raw, kind),
    replaceError: "",
    chosenByHand: true,
    why: `Chosen by hand. The slug reads as ${tourPhrase(raw, kind)}.`,
    set: { tourUrl: raw, __tourSweep: { at: proposal?.at || "", found: true, url: raw, byHand: true } },
  };
};

// ── AND DOES IT STILL EXIST ─────────────────────────────────────────
//
// Oliver: "make sure that there is an update feature that checks if this
// activity even still exists anymore.. because over time, these activities
// might get removed."
//
// A dead link on a public page is the failure this codebase minds most, and it
// is written down as such in data/wegotrip.js. Nothing until now could notice
// one.
//
// ── 200 IS NOT PROOF OF LIFE ────────────────────────────────────────
//
// A marketplace rarely 404s a withdrawn product. It redirects to the city page,
// or to a search, and returns 200 with a perfectly good page on it that is not
// the thing the reader was promised. So the question is not "did it answer" but
// "did it answer AS THE SAME PRODUCT": the activity id has to survive the
// redirects. That is checkable, and a status code alone is not.
export const ALIVE = "alive";
export const GONE = "gone";
export const UNKNOWN = "unknown";

const productId = (url) => {
  const m = String(url || "").match(/-t(\d+)\/?(?:[?#]|$)/i);
  return m ? m[1] : "";
};

export const tourAliveVerdict = ({ url, status = 0, finalUrl = "", error = "" } = {}) => {
  const id = productId(url);
  if (!id) return { verdict: UNKNOWN, why: "Not a GetYourGuide activity address, so there is no product to ask about." };
  // A network failure is not a death. Same rule as a failed search: "we could
  // not ask" and "we asked and it is gone" are different facts, and writing the
  // first down as the second would delete a working link.
  if (error || !status) return { verdict: UNKNOWN, why: `The check could not be made${error ? `: ${error}` : ""}. Nothing is known and nothing is changed.` };
  if (status === 404 || status === 410) return { verdict: GONE, why: `GetYourGuide answered ${status}. The activity has been withdrawn.` };
  if (status >= 500) return { verdict: UNKNOWN, why: `GetYourGuide answered ${status}, which is their end having a bad day rather than the activity being gone.` };
  // ── AND WHERE IT LANDED, WHICH IS THE QUESTION ───────────────────
  //
  // The first version read `finalUrl || url`, so a check that came back with no
  // final address compared the URL against itself, always matched, and reported
  // a page nobody had seen as alive. Found by an adversarial review, 9 Sep 2026,
  // and the giveaway was that half its own message was unreachable.
  //
  // No final address is not proof of death either: it is a check that did not
  // tell us where it went, and UNKNOWN is what this file says about those.
  if (!finalUrl) {
    return { verdict: UNKNOWN, why: `It answered ${status} and the check did not report where it landed, so nothing is known. Nothing is changed.` };
  }
  if (productId(finalUrl) === id) return { verdict: ALIVE, why: "Still the same activity page." };
  return {
    verdict: GONE,
    why: `It answered ${status} and landed on a different page, which is how a marketplace retires a listing without ever returning a 404. The reader would have arrived somewhere they were not promised.`,
  };
};

// What to do about a dead one, as data rather than a write. Clearing the field
// is the only honest option: a link that goes nowhere is worse than no link, and
// the entry reads perfectly well without one.
export const tourRemovalFor = (row, verdict) => {
  if (verdict !== GONE) return null;
  const p = row?.payload || row || {};
  return {
    id: row?.id,
    name: String(p.name || p.town || "").trim() || "(unnamed)",
    url: String(p.tourUrl || ""),
    set: { tourUrl: "", __tourSweep: { at: "", found: false } },
  };
};

export const describeTourFindings = (list) => {
  const all = Array.isArray(list) ? list : [];
  if (!all.length) return "Nothing was searched.";
  const broke = all.filter(p => p?.verdict === FAILED);
  const found = all.filter(p => p?.verdict === FOUND);
  const lead = broke.length
    ? `${broke.length} of ${all.length} could not be searched at all, so nothing is known about ${broke.length === 1 ? "it" : "them"} and nothing will be written. That is usually a quota or a rate limit. `
    : "";
  if (!found.length && broke.length === all.length) return lead.trim();
  const asked = all.length - broke.length;
  if (!found.length) return `${lead}${asked} ${asked === 1 ? "town" : "towns"} asked, and GetYourGuide has nothing for any of them. Each is stamped so the next sweep skips it for ${TOUR_RESWEEP_DAYS} days.`;
  return `${lead}${found.length} of ${asked} have an activity. Ticking one writes the plain GetYourGuide address; the partner id is added at render from config.js, so it is never frozen into the database.`;
};

// ── AND THE SAME SENTENCE INSIDE A BUILT GUIDE ──────────────────────
//
// Oliver, 9 Sep 2026: "Is it possible that our AI guide can recommend a
// GetYourGuide activity? If they're sent to Roskilde, then a GetYourGuide
// activity could be recommended."
//
// It reads the SAME field the town tab does. Nothing new is searched for and
// nothing new is written: a guide that routes through Aarhus shows the Aarhus
// activity Oliver already ticked in the sweep, in his own sentence, at the foot
// of the day it belongs to.
//
// ── THE GATE A TOWN TAB DOES NOT NEED ───────────────────────────────
//
// A town tab is a page somebody chose to open. A guide is a plan built FOR a
// person out of what they told us, INCLUDING what they told us they did not
// want, and exclusions.js opens with the day that cost: he wrote "Please don't
// send us to Legoland" and the preview offered him Legoland, top of the list,
// with a picture. A partner activity is that screen with money on it, which is
// worse, because a reader who spots it reads the money as the reason.
//
// So the check runs twice, on the two different things that can name a ruled
// out place: the TOWN the activity is filed under, and the activity's own
// address. GetYourGuide's slugs carry what the thing is
// ("billund-legoland-billet-t123"), so a Legoland ticket sold under Billund is
// caught by the second check even though Billund itself is fine to visit.
export const tourNamesExcluded = (url, excluded) => {
  let path = "";
  try { path = fold(new URL(String(url || "")).pathname); } catch { return false; }
  if (!path) return false;
  // Through variantsOf for the same reason the town match is: somebody who
  // wrote "no Copenhagen" has to catch a slug that says kobenhavn.
  const names = (Array.isArray(excluded) ? excluded : [])
    .flatMap(x => variantsOf(clean(x)))
    .map(fold)
    // Four letters, because a slug is one long unpunctuated word and a short
    // exclusion matches inside almost anything. "Tivoli" and "Legoland" are
    // the shapes people rule out; two letters is not a place, it is a hazard.
    .filter(x => x.length >= 4);
  return names.some(x => path.includes(x));
};

// ── ONCE PER TOWN, NOT ONCE PER DAY ─────────────────────────────────
//
// Three days in Aarhus is one beerwalk worth mentioning, not three. Returned
// keyed by day index so the caller can put the line under the right day, and a
// town already used is skipped, so the line lands on the first day it is true
// for and never repeats.
const rowForTown = (name, rows) => {
  const want = variantsOf(clean(name)).map(fold).filter(Boolean);
  if (!want.length) return null;
  return (Array.isArray(rows) ? rows : []).find(r => {
    const n = fold(clean(r?.name));
    return !!n && want.includes(n);
  }) || null;
};

export const guideTours = (days, { rows = [], excluded = [] } = {}) => {
  const out = {};
  const used = new Set();
  (Array.isArray(days) ? days : []).forEach((day, i) => {
    for (const stop of (Array.isArray(day?.stops) ? day.stops : [])) {
      const town = clean(stop?.town);
      const key = fold(town);
      if (!key || used.has(key)) continue;
      const url = rowForTown(town, rows)?.tourUrl;
      if (!isGetyourguideProductUrl(url)) continue;
      // The town itself first. A guide can route THROUGH a place somebody
      // ruled out, and an activity there is the one thing that must not be
      // offered when it does.
      if (isExcluded({ name: town, town }, excluded)) continue;
      if (tourNamesExcluded(url, excluded)) continue;
      used.add(key);
      out[i] = { url, town };
      return;
    }
  });
  return out;
};
