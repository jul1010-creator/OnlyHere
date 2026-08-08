// ── WHAT KIND OF PLACE IS THIS, AND WHAT DOES IT HANG OFF ───────────
// Oliver, 8 Aug 2026, looking at the towns list:
//   "Nyhavn is 'technically' a town, but it is within Copenhagen. How do we
//    categorize this? Ticking Filters? Categories? What do we do?"
// and a minute later, which is the half that decides the shape of this:
//   "There are also villages in the 'towns' that are under other towns you
//    know.."
//
// His own data already had three different things wearing the same label:
//   "Nyhavn":                a canal INSIDE Copenhagen, filed as a town
//   "Nørresundby (Aalborg)": a district of Aalborg, with the relationship
//                            stuffed into the NAME STRING, where nothing can
//                            query it
//   "Dragør":                its own municipality, twelve kilometres from
//                            Copenhagen and reached by city bus
//   "Sønderho", "Thorup Strand", "Gudhjem": villages that are nobody's base
//
// A filter cannot fix this, which is the answer to his question. You cannot tick
// a filter that is not backed by a field, and no single field can say both "this
// is small" and "this belongs to that". So: TWO INDEPENDENT AXES.
//
//   WHAT IT IS      placeKind: city | town | village | area
//   WHAT IT HANGS   partOf      — this place is INSIDE that one. Areas only.
//   OFF             dayTripFrom — where you would actually sleep. Villages and
//                                 small towns that are not bases themselves.
//
// The two axes are independent on purpose. Dragør is a town with a dayTripFrom
// and no partOf. Nyhavn is an area with a partOf. Sønderho is a village with a
// dayTripFrom. Copenhagen is a city with neither. Nothing needs a special case.
//
// AND THE DIFFERENCE BETWEEN partOf AND dayTripFrom IS NOT COSMETIC. Only partOf
// collapses: a route through Copenhagen and Nyhavn visits ONE town, because
// Nyhavn is in Copenhagen. A route through Nordby and Sønderho visits TWO, even
// though you sleep in only one of them, because Sønderho is genuinely somewhere
// else. Counting them the same way would either inflate the trip or hide a real
// stop, and both go out in a share message where they cannot be corrected.

export const PLACE_KINDS = ["city", "town", "village", "area"];

const clean = (v) => String(v == null ? "" : v).trim();

// ── NEVER GUESSED ───────────────────────────────────────────────────
// A place is only a village if somebody SAID it is a village. Inferring it from
// a population figure the entry does not carry, or from a name that "sounds
// small", is exactly the invention this codebase exists to refuse — and it would
// be invention about the one thing a traveller uses to decide whether there is
// anywhere to eat.
//
// The two things that ARE safe to derive: isMajorCity, which is an existing
// published field meaning precisely "city", and partOf, because a place that
// states it is inside another place is an area by definition. Everything else
// falls back to "town", which is what every entry in the list is already
// presented as, so nothing changes for anything not explicitly marked.
export const placeKindOf = (entry) => {
  const stated = clean(entry && entry.placeKind).toLowerCase();
  if (PLACE_KINDS.includes(stated)) return stated;
  if (entry && entry.isMajorCity) return "city";
  if (clean(entry && entry.partOf)) return "area";
  return "town";
};

export const isArea = (entry) => placeKindOf(entry) === "area";

export const KIND_LABEL = { city: "City", town: "Town", village: "Village", area: "Area" };
export const kindLabel = (entry) => KIND_LABEL[placeKindOf(entry)] || "Town";

// The place a person would actually book a bed in. partOf first: if this is a
// district of Copenhagen then Copenhagen is where you sleep, whatever else the
// entry says.
export const baseTownFor = (entry) => clean(entry && entry.partOf) || clean(entry && entry.dayTripFrom) || null;

// How the relationship should be worded on the page. Two different sentences,
// because "inside Copenhagen" and "stay in Nordby" are two different facts and
// running them together is how a traveller ends up looking for a hotel in a
// canal.
export const relationLine = (entry) => {
  const self = clean(entry && entry.name);
  const same = (v) => v && v.toLowerCase() === self.toLowerCase();
  const inside = clean(entry && entry.partOf);
  // Nowhere is inside itself, and nowhere is a day trip from itself. Both are
  // reachable: a model filling in "the nearest place you would sleep" for a town
  // that IS the base has an obvious wrong answer available to it.
  if (inside && !same(inside)) return { label: "Inside", value: inside };
  const base = clean(entry && entry.dayTripFrom);
  if (base && !same(base)) return { label: "Where to base yourself", value: base };
  return null;
};

// ── COLLAPSING FOR ROUTE COUNTING ───────────────────────────────────
// Only an area collapses, and only into its own parent. Everything else is
// returned unchanged, including a village, because you really do go to Sønderho.
// `lookup` is whatever can turn a name into a published entry (lookupRealPlace
// in the app); with no lookup this is the identity, which is the honest answer
// when there is nothing to resolve against rather than a guess.
export const collapseToParent = (name, lookup) => {
  const n = clean(name);
  if (!n || typeof lookup !== "function") return n;
  const entry = lookup(n);
  const parent = clean(entry && entry.partOf);
  return parent && parent.toLowerCase() !== n.toLowerCase() ? parent : n;
};

// Everything published that sits inside this place, and everything published
// that uses it as a base. Matched on the name the entry itself states, so a
// rename in one place cannot silently empty a list in another.
const sameName = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();

// isArea IS PART OF THE TEST, not decoration. Without it these two disagreed
// with the towns page, which keys its own section off isArea: an entry stating
// placeKind "village" AND partOf "Aalborg" — exactly the Nørresundby shape, and
// exactly what the drafting prompt warns against ("a town twelve kilometres
// outside a city is NOT inside it") — rendered in the peer grid as an
// independent place while Aalborg's page listed it under "Inside Aalborg / Part
// of the city itself, so you are already there". A traveller was told a place
// both is and is not somewhere they are already standing.
//
// And nothing is ever its own child. A field described as "the nearest place a
// visitor would sleep" invites a base town to name itself, which produced a
// "Without changing hotel" list whose single entry reopened the page you were
// on.
export const areasInside = (townName, all) =>
  (Array.isArray(all) ? all : []).filter((t) => t && isArea(t) && sameName(t.partOf, townName) && !sameName(t.name, townName));

export const dayTripsFrom = (townName, all) =>
  (Array.isArray(all) ? all : []).filter((t) => t && sameName(t.dayTripFrom, townName) && !sameName(t.partOf, townName) && !sameName(t.name, townName));
