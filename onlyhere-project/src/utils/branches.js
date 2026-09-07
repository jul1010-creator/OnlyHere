// ── "BONES IS AN EXAMPLE OF A RESTAURANT WITH MULTIPLE LOCATIONS" ────
//
// Oliver, 7 Sep 2026, correcting me. I had reported fifteen published venue
// rows as having "no town and no coordinate" and proposed refusing them at the
// gate. He answered: "The issue with multiple of those, is that they have
// multiple locations."
//
// He was right and the proposal was wrong. Prinsens pizza & grill stores
// `location: "Aalborg, Nørresundby"` and its own prose names both branches,
// while `mapHint` pins exactly one address. Refusing it for having no single
// town would have deleted a correct entry for being correct about something
// the schema could not hold.
//
// ── AND THE ROOT OF IT IS THAT THE SHAPE NEVER HAD A PLACE ──────────
//
// shapeForLive's food and night branches declare `location` and `mapHint` and
// no `town` at all, so EVERY restaurant and bar in the app is placed by a
// coordinate and a line of free text. One coordinate. A brand with eight
// addresses gets one pin, on whichever branch the geocoder happened to reach,
// and the guide can route somebody across a fjord to the branch nobody meant.
//
// ── WHAT HE CHOSE, AND WHY IT IS THE HARDER ONE ─────────────────────
//
// Shown three shapes, he picked one card carrying a list of branches, over one
// row per branch and over pinning the flagship. It is the most work and it is
// the only one that is true about both halves: the writing is about the brand,
// so duplicating it per branch is the scaled-content shape Google names, and
// the map is about addresses, so a single pin is a lie about where you can eat.
//
// So a branch is a small thing with a coordinate, and everything that used to
// ask an entry "where are you" now asks "which of you is nearest".
//
// ── THIS FILE HOLDS NO POLICY ABOUT WHICH BRANCH IS BEST ────────────
//
// Nearest to the day's route, and nothing else. Not the biggest, not the
// flagship, not the one with the best reviews: those are judgements this app
// has no data for, and a guide that quietly prefers one branch over a closer
// one is a guide that costs a traveller a bus ride for a reason it cannot say.
import { haversineKm } from "./helpers";
import { placeSlug } from "./placeUrl";
import { containsName, fold } from "./danishNames";

// A brand with more than this many Danish branches is a chain nobody needs an
// entry for, and an unbounded array in one jsonb column is a row that will
// eventually fail to save. Same reasoning as BEEN_CAP in beenThere.js.
export const MAX_BRANCHES = 12;

const text = (v) => String(v ?? "").trim();

// A coordinate, or null. Number.isFinite rather than truthiness, for the reason
// placeCoords states: 0 is a real number and NaN is not falsy in the way people
// expect. Copied in behaviour deliberately, not in code, because placeCoords
// reads __lat ?? lat off a published row and a branch has neither spelling.
const coordOf = (b) => {
  const lat = Number(b?.lat), lon = Number(b?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
};

// ── WHAT COMES BACK FROM THE DATABASE IS DATA ───────────────────────
// It is our own column, and it has been through jsonb, a network and possibly
// somebody editing a row by hand in the Supabase console. A branch with no town
// AND no address is not a branch, it is an empty object that would render as a
// blank line and match every lookup.
export const cleanBranch = (raw) => {
  const town = text(raw?.town);
  const address = text(raw?.address);
  if (!town && !address) return null;
  const c = coordOf(raw);
  const out = { town, address };
  if (c) { out.lat = c.lat; out.lon = c.lon; }
  const hours = text(raw?.hours);
  if (hours) out.hours = hours;
  return out;
};

// Deduplicated on town AND address, not on either alone. Two branches in one
// town is the normal case for Copenhagen, and two towns can share a street
// name, which is the fault withoutBeen in beenThere.js was found to have.
export const cleanBranches = (raw) => {
  const seen = new Set();
  const out = [];
  for (const r of (Array.isArray(raw) ? raw : [])) {
    const b = cleanBranch(r);
    if (!b) continue;
    const key = `${placeSlug(b.town)}|${placeSlug(b.address)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
    if (out.length >= MAX_BRANCHES) break;
  }
  return out;
};

export const branchesOf = (entry) => cleanBranches(entry?.branches);
export const hasBranches = (entry) => branchesOf(entry).length > 1;

// ── ONE KEY, MADE IN ONE PLACE ──────────────────────────────────────
// The been list, the hours lookup and the map all need to say WHICH branch, and
// three callers inventing three keys is the fault this codebase has now found
// six times over "where is this row". The town and the address both go in,
// because a brand with two Copenhagen branches has two rows that differ only in
// the street.
export const branchKey = (entry, branch) =>
  `${entry?.id ?? ""}:${placeSlug(branch?.town || "")}:${placeSlug(branch?.address || "")}`;

export const branchLabel = (branch) => {
  const town = text(branch?.town), address = text(branch?.address);
  if (town && address) return `${address}, ${town}`;
  return town || address;
};

// ── EVERY PIN THIS ENTRY PUTS ON A MAP ──────────────────────────────
//
// The fallback is the whole reason this returns a list rather than the array.
// An entry with no branches is not an entry with no location: it is the ordinary
// single-address case, which is nearly every row, and it still has to draw one
// pin. So a plain entry answers with one implicit branch built from its own
// coordinate, and every caller can loop without asking which kind it has.
//
// A branch with no coordinate yields no pin, because a pin needs one. It is
// still a real branch and still shows in the list on the page: knowing there is
// a Nørresundby branch without knowing its coordinate is worth more to a reader
// than pretending it does not exist.
export const branchPoints = (entry) => {
  const list = branchesOf(entry);
  if (list.length) {
    return list.map(b => ({ ...b, at: coordOf(b), key: branchKey(entry, b), label: branchLabel(b) }))
      .filter(p => p.at);
  }
  const own = coordOf({ lat: entry?.__lat ?? entry?.lat, lon: entry?.__lon ?? entry?.lon });
  if (!own) return [];
  return [{
    town: text(entry?.town), address: text(entry?.mapHint || entry?.location),
    lat: own.lat, lon: own.lon, at: own,
    key: `${entry?.id ?? ""}:`, label: text(entry?.location || entry?.town), only: true,
  }];
};

// The towns this entry is in, for a pool filter and for matching a stop name.
// A single-address entry answers with its own town, so a caller never has to
// know which kind it is holding.
export const branchTowns = (entry) => {
  const list = branchesOf(entry);
  const towns = list.length ? list.map(b => b.town) : [text(entry?.town)];
  return [...new Set(towns.map(text).filter(Boolean))];
};

// ── AND WHICH ONE A GUIDE DAY MEANS ─────────────────────────────────
//
// A stop in a guide always belongs to a day, and a day names a town. That is a
// far better question than "which is nearest to a coordinate", because the
// coordinate this pipeline would compare against is the same one the branches
// are trying to correct: an entry pinned in Copenhagen, on an Aalborg day,
// would measure every branch from Copenhagen and pick the Copenhagen one.
//
// So the town decides, and distance is only the tie-break WITHIN a town, for a
// brand with two branches in one city.
//
// Null when no branch is in that town, which is honest and is what the caller
// needs: it means this brand is not in the town the day is in, and the answer
// to that is not to pick one anyway.
export const branchForTown = (entry, town, near = null) => {
  const want = placeSlug(town);
  if (!want) return null;
  const here = branchPoints(entry).filter(p => placeSlug(p.town) === want);
  if (!here.length) return null;
  if (here.length === 1) return here[0];
  const to = coordOf(near);
  if (!to) return here[0];
  let best = here[0], bestKm = Infinity;
  for (const p of here) {
    const km = haversineKm(to, p.at);
    if (km == null || !(km < bestKm)) continue;
    bestKm = km; best = p;
  }
  return best;
};

// The coordinate a caller should use for this entry ON THIS DAY. Falls all the
// way back to the entry's own pin, so a single-address entry answers exactly
// what placeCoords would have answered and every caller can stop asking which
// kind it is holding.
export const coordForTown = (entry, town) => {
  const b = branchForTown(entry, town);
  if (b) return { lat: b.at.lat, lon: b.at.lon };
  const lat = Number(entry?.__lat ?? entry?.lat), lon = Number(entry?.__lon ?? entry?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
};

// ── AND THE LINE A READER SEES ──────────────────────────────────────
//
// Says the count and names the towns, because "several locations" is the
// sentence that made this a bug in the first place: the prose named two towns
// and nothing else in the app knew about the second one.
//
// Empty for a single-address entry rather than "1 location", which would be a
// sentence added to every card in the app to say nothing.
export const branchLine = (entry) => {
  const list = branchesOf(entry);
  if (list.length < 2) return "";
  const towns = branchTowns(entry);
  const n = list.length;
  // Towns, not addresses. A reader deciding whether this is near them wants the
  // town; the addresses are on the page underneath.
  if (towns.length === 1) return `${n} branches, all in ${towns[0]}.`;
  if (towns.length === 2) return `${n} branches, in ${towns[0]} and ${towns[1]}.`;
  return `${n} branches, in ${towns.slice(0, -1).join(", ")} and ${towns[towns.length - 1]}.`;
};


// ── FINDING THEM, RATHER THAN TYPING THEM ───────────────────────────
//
// /api/places-locate already returns `candidates`: every Google Places match
// with a name, a formatted address, a town and a coordinate. It was built on 17
// Aug for "do you mean.." on an ambiguous single venue, and a chain's branches
// are the same list read for a different question. Nothing new had to be asked
// of Google; the route just had to be allowed to return more than five.
//
// ── AND GOOGLE ANSWERS A TEXT SEARCH, NOT A BRAND QUERY ─────────────
//
// "Bones, Denmark" returns Bones restaurants and it also returns whatever else
// Google thinks is close enough. A candidate whose name does not carry the
// entry's name is not a branch of it, and ticking it by default would put
// somebody else's restaurant on this page as an address you can go to.
//
// containsName rather than a substring test, for the reason danishNames.js
// gives: a short name is inside a great many longer ones. The entry name has to
// be there as whole words.
//
// `matches` is returned rather than filtered on, because the ones that do NOT
// match are worth showing him unticked: a brand that trades under two spellings
// is real, and a list that silently drops half the answer is the failure mode
// this codebase keeps finding.
export const branchCandidates = (entryName, candidates) => {
  const want = String(entryName || "").trim();
  const seen = new Set();
  const out = [];
  for (const c of (Array.isArray(candidates) ? candidates : [])) {
    const town = String(c?.town ?? "").trim();
    const address = String(c?.address ?? "").trim();
    if (!town && !address) continue;
    const key = `${placeSlug(town)}|${placeSlug(address)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const found = String(c?.name ?? "").trim();
    out.push({
      town, address,
      ...(Number.isFinite(Number(c?.lat)) && Number.isFinite(Number(c?.lon)) ? { lat: Number(c.lat), lon: Number(c.lon) } : {}),
      found,
      // Its own name against the entry's, both ways: Google returns "Bones
      // Aalborg" for an entry called "Bones", and it returns "Bones" for an
      // entry called "Bones Aalborg".
      matches: !!want && !!found && (containsName(found, want) || containsName(want, found) || fold(found) === fold(want)),
    });
    if (out.length >= MAX_BRANCHES) break;
  }
  return out;
};

// What a candidate becomes once he ticks it. Separate from cleanBranch because
// a candidate carries `found` and `matches`, which are about the lookup and
// have no business being stored on a published row.
export const branchFromCandidate = (c) => cleanBranch({ town: c?.town, address: c?.address, lat: c?.lat, lon: c?.lon });

// Merging a found list into what the draft already holds. Additive and
// order-preserving: a branch he typed by hand is not replaced by a lookup, and
// running the lookup twice does not duplicate anything. Same rule markMany in
// beenThere.js follows, for the same reason.
export const mergeBranches = (existing, found) =>
  cleanBranches([...(Array.isArray(existing) ? existing : []), ...(Array.isArray(found) ? found : [])]);
