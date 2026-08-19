// ── "ABSOLUTELY FK ALL WAS GENERATED" ────────────────────────────────
//
// Oliver, 15 Aug 2026, with the run report attached. The report is the reason
// this file could be written the same hour: it carried the brief, the themes
// that were read off it, the trip window, and `rows: []`. Three fields and the
// diagnosis was done, where a screenshot would have started a guess.
//
// Then his call on what to do about it, which is better than the one I offered:
// "Considering it was a studio test.. let the studio tell me that this area
// lacks content."
//
// That is the right instinct and it is the one this codebase keeps proving. Do
// not fill the hole. Name it. A preview that quietly invents picks to avoid
// looking empty is the same failure as an attraction section filled with
// whatever the town happened to hold, which was the thing he objected to this
// morning.
//
// ── AND THE TWO CAUSES LOOK IDENTICAL ON SCREEN ─────────────────────
// This is the whole reason this file exists rather than a one-line "nothing
// matched" message. An empty preview has two completely different causes and
// they need opposite responses:
//
//   THE MATCHER COULD NOT USE WHAT THEY SAID. Gemlyx holds eleven entries in
//   South Jutland and the traveller named no town and no region, so no pass
//   could reach any of them. Researching more content fixes nothing.
//
//   THERE IS NOTHING THERE. Gemlyx holds zero entries anywhere near where this
//   traveller lands. No matcher can return what does not exist, and the fix is
//   a discovery run.
//
// Telling them apart needs a count, and utils/discovery.js has counted
// published rows per region since 9 August (coverageByTarget). Reported as one
// finding rather than two numbers, because the founder-facing question is not
// "how many rows are in Sønderjylland", it is "do I write code or do I go and
// research".
import { DISCOVERY_TARGETS, coverageByTarget } from "./discovery";
// unplaced, not a local count: geography.js already owns the question "which rows
// can nothing place", and a second implementation here would be the two-instruments
// problem that caused this bug in the first place.
import { unplaced } from "./geography";
import { arrivalPoint } from "./arrival";
import { fitsBrief } from "./interestFit";
import { THEME_LABEL } from "./placeThemes";

// AIRPORTS and arrivalPoint moved to utils/arrival.js when previewMatch needed
// them too, to order a route from where the traveller lands. Re-exported here
// because this file was their first home and everything that reads them from
// here is still reading the same function.
export { AIRPORTS, arrivalPoint } from "./arrival";

// Which discovery target a coordinate falls in, using the same latitude bands
// the Studio's own region picker uses, so a finding here and a target there
// cannot describe different places.
export const targetForCoords = (lat, lon) => {
  const la = Number(lat), lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  // Bornholm sits east of the rest of the country and no latitude band reaches
  // it, so it is decided on longitude before the bands run.
  if (lo > 14) return DISCOVERY_TARGETS.find(t => t.id === "bornholm") || null;
  const part = lo < 10.7 ? "Jutland" : lo < 12.0 ? "Funen" : la < 55.3 ? "Lolland-Falster" : "Zealand";
  const inPart = DISCOVERY_TARGETS.filter(t => t.part === part);
  return inPart.find(t => t.lat && t.lat(la)) || inPart.find(t => !t.lat) || null;
};

export const COVERAGE_NOTHING_SAID = "nothing-named";
export const COVERAGE_UNANSWERED = "asked-for-nothing-you-have";
export const COVERAGE_THIN = "no-content-there";
export const COVERAGE_MATCHER = "matcher-could-not-reach-it";
export const COVERAGE_OK = "";

// ── THE FINDING ─────────────────────────────────────────────────────
// `library` is the published rows the Studio already holds (manageItems), which
// is what coverageByTarget counts. Returns null when the preview found
// something, because a finding on a working run is noise.
// ── AND WHAT TO GO AND LOOK FOR ─────────────────────────────────────
// Oliver, 15 Aug 2026: "I would also like a button for studio, that can click
// 'search for content in this area'. Because apparently here there was
// NOTHING."
//
// A finding that names a gap and leaves him to work out what to type is half a
// tool. The brief already said what they wanted, so the button carries it: the
// wanted CATEGORIES become the Studio content type to draft, and the region
// becomes the discovery target. Castles and festivals go looking for
// attractions and festivals, not for whatever the dropdown was last set to.
//
// First wanted category wins, in the order a traveller is most likely to have
// meant it. `event` before `free` because a festival is dated and a castle is
// not: a missing festival is a missing week, a missing castle is a missing
// entry.
const TYPE_FOR_CATEGORY = [
  ["event", "festival"],
  ["free", "free"],
  ["nightlife", "night"],
  ["food", "food"],
];

export const searchTypeFor = (wanted) => {
  if (!wanted || !wanted.size) return null;
  const hit = TYPE_FOR_CATEGORY.find(([cat]) => wanted.has(cat));
  return hit ? hit[1] : null;
};

export const previewCoverage = ({ matched = [], library = [], convoText = "", themes = null, days = null, wanted = null } = {}) => {
  const rows = Array.isArray(matched) ? matched : [];

  // ── "MATCHED PLENTY, ANSWERED NOTHING" ────────────────────────────
  // The Jutland run, 15 Aug 2026. Sixteen rows matched, so this file said
  // nothing at all, and the screen looked full. Every one of the eight Food and
  // Drink rows was in Aalborg, the town furthest from the airport, and the
  // brief had asked for MARKETS and NIGHTLIFE. There was no nightlife section
  // and not one market anywhere.
  //
  // A finding that only fires on zero is the easy half. A screen that is full
  // and answers nothing stated is the harder failure and the more damaging one,
  // because it looks like it worked.
  //
  // The test is per stated theme: which of the things they said did any matched
  // row satisfy? A theme nobody can answer is a content gap with a name on it.
  if (rows.length > 0) {
    if (!themes || !themes.size) return null;
    const answered = new Set();
    // ── ASKED, NOT READ OFF THE STAMP ──────────────────────────────
    // Every expanded row arrives carrying `_fit`, and reading that stamp was
    // the obvious thing to do and is wrong: previewMatch stamps it in its
    // EXPANSION pass and only there, so a town matched because the traveller
    // named it has no stamp at all. Trusting the stamp counted a nightlife town
    // as answering nothing and fired a finding on a run that worked. Asked
    // directly instead, off the same function and the same theme set the stamp
    // was built from, so there is one code path rather than two that agree
    // until one of them is touched.
    for (const r of rows) for (const t of fitsBrief(r, themes).why) answered.add(t);
    const unanswered = [...themes].filter(t => !answered.has(t)).sort();
    // ── AND "ANSWERED" MEANS ANSWERED WHAT THEY ASKED FOR ───────────
    // Written against the STATED set, not against `answered.size > 0`. Today
    // those two are the same line: fitsBrief intersects a row's themes with the
    // want set before returning them, so nothing outside the brief can ever
    // reach `answered`, and mutation testing correctly reports the swap as
    // making no difference. It is written this way anyway, because the day that
    // invariant slips is the day a castle counts as an answer to a request for
    // markets and this finding goes quiet on exactly the run it exists for. The
    // invariant is asserted in the suite rather than trusted here.
    //
    // Some answered and some not is ordinary: a library is never complete. The
    // finding is for a brief where NOTHING they asked for came back, which is
    // the case that reads as working and is not.
    if (unanswered.length < themes.size) return null;
    const townsShown = [...new Set(rows.filter(r => r?._src === "town").map(r => r.name))];
    // ── AND THE BUTTON HAS SOMEWHERE TO POINT ──────────────────────
    // "Search where it is thinnest" is the honest answer when nothing matched
    // and no arrival was named. It is the WRONG answer here, because this run
    // knows exactly where it was looking: sixteen rows came back and they were
    // all in one place. Aimed at where the traveller lands first, and at the
    // towns the run actually returned when they never said how they arrive.
    const arrival = arrivalPoint(convoText);
    const anchor = arrival
      ? targetForCoords(arrival.lat, arrival.lon)
      : rows.map(r => targetForCoords(r?.__lat ?? r?.lat, r?.__lon ?? r?.lon)).find(Boolean) || null;
    return {
      verdict: COVERAGE_UNANSWERED,
      arrival,
      target: anchor ? { id: anchor.id, label: anchor.label, danish: anchor.danish } : null,
      published: null,
      themes: [...themes].sort(),
      unanswered,
      shown: rows.length,
      towns: townsShown,
      days: Number.isFinite(Number(days)) ? Number(days) : null,
      total: (Array.isArray(library) ? library : []).length,
      searchType: searchTypeFor(wanted),
      searchTarget: anchor ? anchor.id : "anywhere",
    };
  }

  const arrival = arrivalPoint(convoText);
  const target = arrival ? targetForCoords(arrival.lat, arrival.lon) : null;
  const counts = coverageByTarget(library);
  // null, not zero, for a target that cannot be counted by latitude (the small
  // islands). A count that is quietly false is worse than no count, which is
  // discovery.js's own rule and it holds here too.
  const published = target ? counts[target.id] : null;

  // ── WHICH OF THE TWO PROBLEMS THIS IS ─────────────────────────────
  // The order matters. An empty region is an empty region whatever the matcher
  // does, so content is reported first. If there IS content there, the matcher
  // is the one that failed and saying "go research South Jutland" would send
  // him to write eleven entries he already has.
  // ── AND "NOTHING PUBLISHED THERE" HAS TO BE TRUE ──────────────────
  // Oliver, 19 Aug 2026: "it keeps saying I don't have any content in South
  // Jutland.. while I clearly have some."
  //
  // Half of that was partOfCountry reading only `__lat` (fixed in geography.js).
  // The other half is this sentence, which cannot tell two different situations
  // apart and states the more damaging one:
  //
  //   nothing published there            → a real content gap, go and research
  //   published but not PLACEABLE        → the rows exist and carry no usable
  //                                        coordinate, so no filter can see them
  //
  // A row with no coordinate is invisible to every geography filter in the app,
  // which is why geography.js already exports `unplaced` and why Studio has an
  // "Add missing coordinates" action. Telling him to go and write entries he
  // already has is the worst possible advice, and it is what this said.
  const cannotPlace = unplaced(library).length;
  let verdict = COVERAGE_NOTHING_SAID;
  if (target && published === 0) verdict = COVERAGE_THIN;
  else if (target && published > 0) verdict = COVERAGE_MATCHER;

  return {
    verdict,
    arrival,
    target: target ? { id: target.id, label: target.label, danish: target.danish } : null,
    published,
    // How many rows nothing could place at all. Carried so the sentence can say
    // "nothing I can place there" rather than "nothing published there", which
    // are different claims and only one of them is checked.
    unplaced: cannotPlace,
    themes: themes ? [...themes].sort() : [],
    days: Number.isFinite(Number(days)) ? Number(days) : null,
    total: (Array.isArray(library) ? library : []).length,
    // What the button should go and look for, from what they asked for rather
    // than from whatever the Studio dropdown was last left on.
    searchType: searchTypeFor(wanted),
    // "anywhere" is discovery.js's own id for "wherever it is thinnest", which
    // is the right aim when the brief gave nothing to aim at.
    searchTarget: target ? target.id : "anywhere",
  };
};

// One line for a founder, and it says which of the two jobs this is rather than
// describing the symptom. "Nothing matched" is a symptom and he has already
// seen it on the screen.
// ── AND IT HAS TO READ LIKE A SENTENCE ──────────────────────────────
// The first version printed the raw theme ids joined with a comma, straight
// into a clause that also carried the trip length, and produced "They asked for
// market, nightlife and 6 days". The reader parses that as three interests, one
// of which is a number. THEME_LABEL is the list every chip on the site is
// already drawn from, so the panel and the browse page name a theme the same
// way, and the trip length is moved out of the list it was sitting inside.
const listOf = (ids, join = "and") => {
  const named = (ids || []).map(t => THEME_LABEL[t] || t);
  if (named.length <= 1) return named[0] || "";
  return `${named.slice(0, -1).join(", ")} ${join} ${named[named.length - 1]}`;
};

export const describeCoverage = (f) => {
  if (!f) return "";
  const said = f.themes.length ? `They asked for ${listOf(f.themes)}` : "They named no interests";
  const trip = f.days ? ` on a ${f.days} day trip` : "";
  if (f.verdict === COVERAGE_UNANSWERED) {
    const where = f.towns.length ? ` across ${f.towns.join(", ")}` : "";
    return `${f.shown} rows matched${where}, and not one of them answers what they asked for. ${said}${trip}, and nothing published satisfies ${listOf(f.unanswered, "or")}. The screen looks full and answers nothing they said.`;
  }
  if (f.verdict === COVERAGE_THIN) {
    // The hedge is only added when there IS something unplaceable, so an honest
    // empty region still reads as an honest empty region.
    const blind = f.unplaced
      ? ` One caveat before you go and write anything: ${f.unplaced} published ${f.unplaced === 1 ? "entry has" : "entries have"} no usable coordinate, so no geography filter can see ${f.unplaced === 1 ? "it" : "them"} and ${f.unplaced === 1 ? "it" : "some"} could already be there. Run "Add missing coordinates" first.`
      : "";
    return `Nothing to show${f.unplaced ? "" : ", and it is a content gap"}. ${said}${trip}, landing at ${f.arrival.name}, and nothing placeable is published in ${f.target.label}.${blind} Discovery target: ${f.target.label}${f.target.danish ? ` (${f.target.danish})` : ""}.`;
  }
  if (f.verdict === COVERAGE_MATCHER) {
    return `Nothing to show, and it is NOT a content gap. ${said}${trip}, landing at ${f.arrival.name}, and you have ${f.published} published in ${f.target.label} that the preview could not reach, because the matcher only finds places the traveller names.`;
  }
  // ── AND IT MUST NOT SAY "ANY OF YOUR 0 ENTRIES" ──────────────────
  // Which is what it said on the 20:24 run. manageItems is null until Manage
  // Published has been opened, so the library arrives empty and the sentence
  // printed a count it had not measured. An unknown number and a real zero are
  // different facts and this said the wrong one confidently, which is the
  // failure the whole apiCost file was written to avoid.
  const reach = f.total > 0 ? `, so no pass could reach any of your ${f.total} entries` : ", so no pass had anything to reach";
  return `Nothing to show. ${said}${trip}, and the brief names no town, no region and no arrival the matcher can use${reach}.`;
};
