// ── A PLACE THAT HOLDS OTHER PLACES ─────────────────────────────────
//
// Oliver, 15 Aug 2026, about bars: "So Copenhagen -> Gothersgade -> List of
// bars.. like that." And 22 Sep 2026, about shops: "put shopping centers with
// -> 'recommended Denmark-Only Shops' like with bar streets."
//
// The second sentence is the first one again with a different noun in it, and
// that is what this file is. A street or a centre sits between a town and the
// places inside it, and the places inside it are NOT stored on it: each keeps
// its own published row with its own address, and the match happens here, at
// render time. So publishing one more shop on Strøget needs no edit to
// Strøget's entry, and deleting one cannot leave a dangling name on a list
// nothing would ever correct.
//
// WRITTEN ONCE BECAUSE IT WAS ABOUT TO BE WRITTEN TWICE. nightlife.js has held
// this logic since August, along with four separate bugs found in it since:
// the longest name wins, the spelling variants, the field the address actually
// lives in, and the town the Studio staples onto a street's name. Copying it
// for shops would have copied the code and left the four lessons behind the
// moment either copy was touched.
//
// The town reader is INJECTED rather than imported, for the reason costLines
// takes its distances that way: nightlife.js owns the list of towns a night
// out happens in, this file owns the shape of the question, and neither has to
// import the other.
import { containsName } from "./danishNames";

// LONGEST NAME FIRST, and this is the whole subtlety. "Store Kongensgade" and
// "Kongensgade" are two different streets in the same country, and a venue on
// the first contains the name of the second. Testing the longer name first
// means a place is claimed by the most specific container that fits it, which
// is the only answer that can be right for both.
export const byLengthDesc = (a, b) => String(b?.name || "").length - String(a?.name || "").length;

// ── "Noerregade 40" AND "Nørregade" ARE THE SAME STREET ─────────────
// fold() maps ø to o, so "Nørregade" becomes norregade, while the ASCII
// transliteration people and scraped pages actually write, "Noerregade",
// becomes noerregade. Neither contains the other and the bar falls off its own
// street in silence, which is the exact shape of miss this project keeps
// finding on a screenshot weeks later.
//
// Deliberately NOT a change to fold(). A lossier global fold would make every
// comparison in the app slightly more willing to say yes, and the streets are
// not worth that. This spells the ONE name a few ways and asks containsName
// about each, which loosens nothing anybody else relies on.
const SWAPS = [["ø", "oe"], ["æ", "ae"], ["å", "aa"]];
export const spellingVariants = (name) => {
  const base = String(name || "").trim();
  if (!base) return [];
  const out = new Set([base]);
  for (const [danish, ascii] of SWAPS) {
    for (const v of [...out]) {
      if (v.toLowerCase().includes(danish)) out.add(v.replace(new RegExp(danish, "gi"), ascii));
      if (v.toLowerCase().includes(ascii)) out.add(v.replace(new RegExp(ascii, "gi"), danish));
    }
  }
  return [...out];
};
export const nameIsIn = (haystack, name) => spellingVariants(name).some(v => containsName(haystack, v));

// ── AND THE ADDRESS IS NOT IN THE FIELD I FIRST LOOKED IN ───────────
//
// Caught reviewing my own work the day bar streets shipped. This read
// `location`, and the night schema asks for `location` as "Neighbourhood,
// City": the example in the prompt is literally "Indre By, Copenhagen". A bar
// filed that way carries no street name at all, so Gothersgade would have
// listed nothing, for every bar already published, and the whole feature would
// have looked broken while every test passed.
//
// `mapHint` is where the street actually lives, on every type, and it always
// has: "Train, Toldbodgade 6c, 8000 Aarhus C, Denmark". Reading all three
// means this works on the rows that exist today rather than only on ones
// drafted after a schema changed, which is the difference between a feature
// and a plan.
export const addressIn = (item) => [item?.street, item?.location, item?.mapHint]
  .map(v => String(v || "").trim()).filter(Boolean).join(", ");

// ── AND THE STUDIO ASKS FOR THE NAME THAT BREAKS THIS ───────────────
//
// Found by Fable, 3 Sep 2026, auditing the bar-street path. The Studio's own
// placeholder for a bar street reads "Street name + city, e.g. Gothersgade
// Copenhagen", the schema pins the typed value as the row's name, and nothing
// strips the town. So the row publishes as "Gothersgade Copenhagen", and the
// matcher then looks for that whole phrase inside a venue's address, which no
// address contains. Probed: a bar at "Jomfru Ane Gade 15, Aalborg" matches the
// street "Jomfru Ane Gade" and matches NONE of "Jomfru Ane Gade Aalborg",
// "Jomfru Ane Gade, Aalborg" or "Jomfru Ane Gade (Aalborg)".
//
// The result is a street page saying "No individual venues on X are published
// yet" while its bars sit published one table away, which Oliver read as a
// content gap and it was a naming convention.
//
// STRIPPED HERE RATHER THAN AT DRAFT TIME, because the rows are already named
// this way and a render-time fix repairs all of them at once. The town is not
// guessed: it is handed in from the container's OWN fields, so nothing is
// removed unless the row itself says that word is where it is.
export const bareName = (container, town) => {
  const name = String(container?.name || "").trim();
  const where = String(town || "").trim();
  if (!name || !where) return name;
  // ", Aalborg" / " (Aalborg)" / " Aalborg", at the end and nowhere else: a
  // street genuinely called "Aalborggade" keeps its name.
  const tail = new RegExp(`[\\s,(]+${where.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)?\\s*$`, "i");
  const bare = name.replace(tail, "").trim();
  return bare && bare.length >= 3 ? bare : name;
};

// Is this address inside this container? Asked of a STRING, so a candidate
// that has no published row yet can be asked the same question a published one
// is. See splitOffStreet in utils/discovery.js for the caller that needs that.
export const inContainer = (where, container, town) => {
  const text = String(where || "").trim();
  if (!text || !container?.name) return false;
  if (nameIsIn(text, container.name)) return true;
  const bare = bareName(container, town);
  return bare !== container.name && nameIsIn(text, bare);
};

// ── AND IT HAS TO BE ASKED AGAINST ALL THE CONTAINERS ───────────────
// Fable's catch. This tested each bar against a ONE-street list, so
// longest-wins never ran, while the town page awards each bar to the most
// specific street. With Kongensgade and Store Kongensgade both published in
// Copenhagen, the town row said "1 bar published here" and opening it showed
// 2, and a bar on Store Kongensgade appeared on both streets' pages.
// The three readers a caller hands in, named once: which town a place is in,
// which town a container is in, and whether two town names are the same place.
// Passed rather than imported, and passed rather than held in a module
// variable, so two callers with different vocabularies cannot overwrite each
// other's answer halfway through a render.
const EQ = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
const readers = ({ townOfItem = null, townOfContainer = null, sameTown = null } = {}) => ({
  townOfItem: typeof townOfItem === "function" ? townOfItem : () => "",
  townOfContainer: typeof townOfContainer === "function" ? townOfContainer : () => "",
  sameTown: typeof sameTown === "function" ? sameTown : EQ,
});

export const containerFor = (item, containers, opts = {}) => {
  const where = addressIn(item);
  if (!where) return null;
  const r = readers(opts);
  const town = r.townOfItem(item);
  const list = (Array.isArray(containers) ? containers : []).filter(c => c?.name).slice().sort(byLengthDesc);
  for (const c of list) {
    // A street in another town with the same name is a different street.
    // Nørregade exists in a dozen Danish towns.
    const cTown = r.townOfContainer(c);
    if (cTown && town && !r.sameTown(cTown, town)) continue;
    if (inContainer(where, c, cTown)) return c;
  }
  return null;
};

export const itemsInContainer = (container, items, allContainers = null, opts = {}) => {
  const list = Array.isArray(allContainers) && allContainers.length ? allContainers : [container];
  return (Array.isArray(items) ? items : []).filter(i => containerFor(i, list, opts) === container);
};

// ── THE TOWN PAGE, AS ONE ANSWER ────────────────────────────────────
// `containers` carries each one with the places inside it, `loose` is
// everything in that town inside none of them, and a container with nothing in
// it is still returned: it has its own writing and its own page, and hiding it
// the moment its contents are unpublished would make it flicker in and out of
// existence.
export const splitByContainer = (town, items, containers, opts = {}) => {
  const r = readers(opts);
  const inTown = (Array.isArray(items) ? items : []).filter(i => {
    const t = r.townOfItem(i);
    return t && town && r.sameTown(t, town);
  });
  const mine = (Array.isArray(containers) ? containers : []).filter(c => {
    const t = r.townOfContainer(c);
    return t && town && r.sameTown(t, town);
  }).slice().sort(byLengthDesc);
  const claimed = new Set();
  const filled = mine.map(c => {
    const inside = inTown.filter(i => {
      if (claimed.has(i)) return false;
      // Asked against the FULL list, not just this one, so a bar on Store
      // Kongensgade is claimed by Store Kongensgade even while the shorter
      // street is the one being filled.
      return containerFor(i, mine, opts) === c;
    });
    inside.forEach(i => claimed.add(i));
    return { container: c, inside };
  });
  return { containers: filled, loose: inTown.filter(i => !claimed.has(i)) };
};

// ── AND ON THE PREVIEW, THE CONTAINER WITH AN ARROW ─────────────────
//
// Oliver, 22 Sep 2026, on a preview for a group who ticked Nightlife: "Too
// many bars.. it should be a bar street, and then a -> recommended bars on the
// bar street." And the same shape for shops the same evening.
//
// So the places the preview would list are folded into the published container
// they stand in: one card for the street or the centre, and under it a few of
// them by name. Anything in no published container stays a card of its own,
// and only a couple of those, because a long list is the thing he called too
// much. Nothing leaves the trip: the guide is still written from all of them,
// and the section's own line says so when the screen shows fewer.
export const foldIntoContainers = (items, containers, { perContainer = 3, looseCap = 2, src = "", ...opts } = {}) => {
  const list = Array.isArray(items) ? items : [];
  const known = (Array.isArray(containers) ? containers : []).filter(c => c?.name);
  const groups = new Map();
  const loose = [];
  for (const item of list) {
    const c = known.length ? containerFor(item, known, opts) : null;
    if (!c) { loose.push(item); continue; }
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(item);
  }
  const cards = [...groups.entries()].map(([c, inside]) => ({
    ...c,
    _src: src,
    _barsHere: inside.slice(0, perContainer),
    _barsMore: Math.max(0, inside.length - perContainer),
    // Theirs if anything inside was theirs, so the "Gemlyx suggested" mark
    // does not land on a container they led the conversation to.
    _byThem: inside.some(i => i?._byThem),
  }));
  // `rows` is every card, containers first; `shown` is how many of them the
  // preview draws, so the section can slice one array and count the same one.
  return {
    rows: [...cards, ...loose],
    shown: cards.length + Math.min(loose.length, looseCap),
  };
};
