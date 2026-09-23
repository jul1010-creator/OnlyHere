// ── THE SHOPPING VOCABULARY, ON THE SAME ENGINE ─────────────────────
//
// Oliver, 22 Sep 2026: "put shopping centers with -> 'recommended Denmark-Only
// Shops' like with bar streets."
//
// So this file is to shops what nightlife.js is to bars: the words, the two
// numbers the preview slices by, and the town readers. The matching itself is
// utils/placeContainer.js, which both of them call, because a shopping street
// holds shops exactly the way a bar street holds bars and two copies of that
// would drift the first time either was touched.
//
// WHY THE TICK CAME BACK. "Shopping" was deleted from the intake form earlier
// the same day, on the grounds that no row carried a shopping theme so the
// tick steered nothing. That was true and this is what fixes it: with real
// rows behind it there is finally something for the word to mean.
import { townOfLocation, NIGHTLIFE_CITIES } from "./nightlife";
import { samePlaceName } from "./danishNames";
import { containerFor, itemsInContainer, splitByContainer, foldIntoContainers, inContainer } from "./placeContainer";

// The same list of cities a venue's free-text location is matched against.
// Shared rather than copied: a town where a bar can be is a town where a shop
// can be, and two lists would disagree the first time one of them grew.
export const SHOP_CITIES = NIGHTLIFE_CITIES;

// ── WHAT KIND OF SHOP IT IS ─────────────────────────────────────────
//
// Closed list, written criteria, and the same discipline placeThemes.js
// applies to a tier: a value nobody wrote is a category the app invented, and
// a model will reach for "lifestyle" the moment the list stops being closed.
//
// These four are what "only here" looks like in practice. A visitor picking
// between them is choosing what they want to carry home, which is a different
// question from where the shop stands.
export const SHOP_KINDS = [
  { id: "label", value: "Danish label", emoji: "🧥",
    meaning: "a Danish clothing or accessory brand's own store. It earns its place when buying it here is different from buying it at home: the full range, the outlet prices, or a shop that exists nowhere else. A Danish-owned chain that stands in every European high street does not count, whoever owns it." },
  { id: "secondhand", value: "Second-hand", emoji: "♻️",
    meaning: "vintage, genbrug and charity shops. Cheap, dense in the big cities, and the one kind of shopping a visitor cannot reproduce at home because the stock is whatever the neighbourhood gave away." },
  { id: "design", value: "Design and homeware", emoji: "🪑",
    meaning: "furniture, ceramics, glass and the rest of what Denmark is known for, including seconds and factory shops. Only when a visitor can carry it or have it sent." },
  { id: "maker", value: "Made on the premises", emoji: "🔨",
    meaning: "a workshop that sells what it makes on the spot: a pottery, a glassblower, a knitter. Common on the islands and usually in no street and no centre, which is correct and is why a shop needs no container." },
];
export const SHOP_KIND_VALUES = SHOP_KINDS.map(k => k.value);
const KIND_MATCH = {
  label: /\blabel\b|\bbrand\b|\bfashion\b|\bcloth/i,
  secondhand: /second.?hand|\bvintage\b|genbrug|\bcharity\b|\bthrift\b/i,
  design: /\bdesign\b|\bhomeware\b|\bfurniture\b|\bceramic|\bglass\b|interior/i,
  maker: /\bmade\b|\bmaker\b|workshop|premises|\bstudio\b/i,
};
export const shopKindOf = (shop) => {
  const raw = String((typeof shop === "string" ? shop : shop?.shopKind) || "").trim();
  if (!raw) return null;
  return SHOP_KINDS.find(k => KIND_MATCH[k.id].test(raw)) || null;
};
export const SHOP_KIND_RULE = `WHAT KIND OF SHOP THIS IS. Pick EXACTLY one of ${SHOP_KIND_VALUES.join(" / ")}:
${SHOP_KINDS.map(k => `- ${k.value}: ${k.meaning}`).join("\n")}
A shop the research does not place in one of these four leaves the field an empty string. Never invent a fifth kind.`;

// ── AND THE TEST EVERY SHOP HAS TO PASS ─────────────────────────────
//
// The one sentence this whole type exists for, written where the model drafting
// a shop will read it. Oliver's own framing of the app is that it is for what
// is only here, and a shop is the content type where that is easiest to get
// wrong, because a high street looks local until you read the signs.
export const ONLY_HERE_RULE = `THE TEST THIS TYPE EXISTS FOR: buying this in Denmark has to be different from buying it at home. A Danish-owned chain with stores across Europe fails it, however Danish the company is, and so does an international brand with a shop here. What passes: a Danish label's own store or outlet, a second-hand or genbrug shop, a workshop selling what it makes, a design shop carrying makers a visitor cannot buy from at home. If the honest answer is that somebody could buy the same thing in their own city, say so in uncertainties and do not dress it up.`;

const READERS = (cities) => ({
  // ── THE SHOP'S OWN FIELD FIRST, WHICH A BAR HAS NOT GOT ─────────
  //
  // Found by the suite, on a pottery in Svaneke filed at "Svaneke, Bornholm":
  // townOfLocation matched none of the ten cities it knows and fell back to
  // the last comma part, so the shop's town came out BORNHOLM and it vanished
  // from a Svaneke page while appearing under an island nobody filed it on.
  //
  // The shop schema asks for `town` as its own field, for the reason the
  // street schema does: the page groups on it, and a grouping that has to
  // parse a street address to find its own parent is one bad address away from
  // an empty section. So it is read first here, exactly as townOfStreet reads
  // a street's own town first, and the address is the fallback for a row
  // drafted before the field existed.
  townOfItem: (shop) => String(shop?.town || "").trim() || townOfLocation(String(shop?.location || shop?.mapHint || ""), cities) || "",
  townOfContainer: (place) => String(place?.town || "").trim() || townOfLocation(place?.location, cities) || "",
  sameTown: samePlaceName,
});

export const townOfShopPlace = (place, cities = SHOP_CITIES) => READERS(cities).townOfContainer(place);

// Asked of an ADDRESS STRING, so a candidate with no published row yet can be
// asked the same question a published shop is. See splitOffStreet in
// utils/discovery.js for the caller that needs that.
export const inShopPlace = (where, place, cities = SHOP_CITIES) =>
  inContainer(where, place, townOfShopPlace(place, cities));

export const shopPlaceFor = (shop, places, cities = SHOP_CITIES) =>
  containerFor(shop, places, READERS(cities));

export const shopsInPlace = (place, shops, allPlaces = null, cities = SHOP_CITIES) =>
  itemsInContainer(place, shops, allPlaces, READERS(cities));

// The town page, as one answer rather than three lookups that can disagree.
export const shoppingForTown = (town, shops, places, cities = SHOP_CITIES) => {
  const split = splitByContainer(town, shops, places, READERS(cities));
  return { places: split.containers.map(g => ({ place: g.container, shops: g.inside })), loose: split.loose };
};

// Every town that has a shop or a container in it, deduped across spellings so
// København and Copenhagen are one row. Same shape and same reason as
// nightlifeTownList.
export const shoppingTownList = (shops, places, cities = SHOP_CITIES) => {
  const r = READERS(cities);
  const all = [
    ...(Array.isArray(shops) ? shops : []).map(s => r.townOfItem(s)),
    ...(Array.isArray(places) ? places : []).map(p => r.townOfContainer(p)),
  ].filter(Boolean);
  const out = [];
  for (const t of all) if (!out.some(x => samePlaceName(x, t))) out.push(t);
  return out;
};

// ── ON THE PREVIEW, THE CONTAINER WITH AN ARROW ─────────────────────
// His own words for the bar version: "it should be a bar street, and then a ->
// recommended bars on the bar street." Same numbers, because the reason is the
// same: a screen full of shops is the thing he called too much.
export const PREVIEW_SHOPS_PER_PLACE = 3;
export const PREVIEW_LOOSE_SHOPS = 2;
export const shopsIntoPlaces = (items, places, cities = SHOP_CITIES) =>
  foldIntoContainers(items, places, {
    ...READERS(cities),
    perContainer: PREVIEW_SHOPS_PER_PLACE,
    looseCap: PREVIEW_LOOSE_SHOPS,
    src: "shopPlace",
  });

// A published container with nothing only-here inside it is not a
// recommendation, and Fields is the example: it is an address for the shops
// that are, and with none of them published it is a mall on a travel guide.
// The page and the preview both ask this rather than deciding it twice.
export const worthShowing = (place, shops, allPlaces = null, cities = SHOP_CITIES) =>
  shopsInPlace(place, shops, allPlaces, cities).length > 0;
