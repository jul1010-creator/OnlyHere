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
import { arrivalPoint } from "./arrival";

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
  if (rows.length > 0) return null;

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
  let verdict = COVERAGE_NOTHING_SAID;
  if (target && published === 0) verdict = COVERAGE_THIN;
  else if (target && published > 0) verdict = COVERAGE_MATCHER;

  return {
    verdict,
    arrival,
    target: target ? { id: target.id, label: target.label, danish: target.danish } : null,
    published,
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
export const describeCoverage = (f) => {
  if (!f) return "";
  const said = f.themes.length ? `They asked for ${f.themes.join(", ")}` : "They named no interests";
  const trip = f.days ? ` and ${f.days} days` : "";
  if (f.verdict === COVERAGE_THIN) {
    return `Nothing to show, and it is a content gap. ${said}${trip}, landing at ${f.arrival.name}, and you have nothing published in ${f.target.label}. Discovery target: ${f.target.label}${f.target.danish ? ` (${f.target.danish})` : ""}.`;
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
