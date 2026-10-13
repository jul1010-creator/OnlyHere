// ── THE FOUR KINDS OF PLACE ON EXPLORE ──────────────────────────────
//
// Oliver, 14 Oct 2026, with lidl.dk's row of round category icons: "Make it
// like this. With nightlife, attractions, renting, and restaurants. I doubt
// we'd get clothing shops and what not along." And before it: "we need
// 'ticking off' filters", so a visitor can pick more than one.
//
// These replace Discounts, Entertainment and Activities (13 Oct): a tourist
// asks where to eat or what is on tonight before asking what kind of deal it
// is, and every deal is a discount anyway.
//
// A deal's kind of place, in this order: what he set in the Studio
// (`__category`); then what the place and its offer say about themselves;
// then the kind of row it is. No React here, so the tests and the server can
// read it as it is.
export const DEAL_CATEGORIES = ["restaurants", "nightlife", "attractions", "rentals"];

// The colours are the pin colours (utils/pinColours.js), so a category's
// circle and a deal's pin can belong to the same family.
export const CATEGORY_COLOUR = { restaurants: "#E07A5F", nightlife: "#7B6CF6", attractions: "#2A9D8F", rentals: "#3D8BFD" };
export const CATEGORY_SIGN = { restaurants: "🍽️", nightlife: "🍸", attractions: "🏛️", rentals: "🔑" };
// The type a new deal is filed under for each, in gemlyx_content.
export const TYPE_OF_CATEGORY = { restaurants: "food", nightlife: "night", attractions: "free", rentals: "free" };

const SAYS = [
  ["rentals", /\b(hire|rent|rental|rentals|bikes?|bicycles?|scooters?|kayaks?|sup board|luggage|lockers?|bag storage)\b|nuoma|bagaž/i],
  ["nightlife", /\b(bar|pub|club|nightclub|jazz|live music|cocktails?|beers?|wine bar|dj|karaoke|cellar)\b|alaus|baras|naktin/i],
  ["restaurants", /\b(restaurant|caf[eé]|bakery|kitchen|smokehouse|bistro|pizzeria|lunch|dinner|breakfast|brunch|tea room|coffee|dessert)\b|kepykl|arbatin|rūkykl|restoran|kavin|valgykl/i],
];
const OF_TYPE = { food: "restaurants", foodStreet: "restaurants", night: "nightlife", nightlife: "nightlife", nightStreet: "nightlife", nightTown: "nightlife" };

export const dealCategory = (d) => {
  const set = String(d?.__category || "");
  if (DEAL_CATEGORIES.includes(set)) return set;
  const words = `${d?.name || ""} ${d?.category || ""} ${d?.what || ""} ${d?.__offer?.text || ""}`;
  for (const [cat, re] of SAYS) if (re.test(words)) return cat;
  const type = String(d?._exampleId || "").split(":")[0] || d?._src || d?.type || "";
  return OF_TYPE[type] || "attractions";
};

// The ticked ones, or all of them when none is ticked.
export const byCategories = (items, picked, of = (x) => x) => {
  const set = picked instanceof Set ? picked : new Set(picked || []);
  return set.size ? items.filter(x => set.has(dealCategory(of(x)))) : items;
};
