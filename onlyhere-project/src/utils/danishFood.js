// ── THE FOOD SECTION IS DANISH FOOD ─────────────────────────────────
//
// Oliver, 27 Sep 2026: "Nobody comes to Denmark thinking 'I'm in Denmark for 4
// days.. imma get myself some Thai Food.' So program it to only find Danish
// Cousines." And: "That includes Danish Streetfood", and "So this is only
// about the navigation." The Food page is the one place a reader browses food
// on purpose, so it shows what they could not get the same way at home.
// Everything else that reads the food rows (the chat, the guide, the preview)
// is left as it was: a published pizzeria can still be matched by name, and
// the guide may still say a kebab shop or a hot dog stand is a cheap meal.
//
// ── A FOOD HALL IS DANISH, WHATEVER ITS STALLS SELL ─────────────────
//
// Asked about Reffen, Aalborg Streetfood, Esbjerg Street Food and Storms
// Pakhus, he kept all four: "Street Food Halls should still exist. It's part
// of Denmark. Like China Town is also a unique part of Britain. Tivoli has
// alot of Asian Themes, but it's Tivoli. It's Danish Tivoli." And the same
// for the four unclear ones: Det Fedtede Hjørne, Aro, Café Broløs and
// Torvehallerne. So the test is whether the PLACE is Danish, not whether the
// dish on the plate is: a food hall, a market, a Danish institution stays;
// a restaurant whose whole point is somebody else's cuisine goes.
//
// ── HOW A ROW IS DECIDED, IN ORDER ──────────────────────────────────
//
//   1. its own `danish` field, set by the Studio draft (see studioPrompts.js)
//   2. a food street or market, always in
//   3. the verdict read off the 34 entries published on 27 Sep 2026, below
//   4. its category and name: a foreign cuisine word is out, anything else in
//
// Four is deliberately the lenient direction. A row nobody has judged is not
// proven foreign, and a Danish place wrongly hidden is a loss nobody sees.
import { fold } from "./danishNames";

// The published entries as they stood on 27 Sep 2026, judged one by one from
// their own category and text with Oliver's answers on the unclear ones. Keyed
// by the published name. `false` is out of the Food page, `true` is in.
export const FOOD_VERDICTS_READ = "2026-09-27";
export const FOOD_VERDICTS = {
  // Danish cooking, Danish institutions, and the ones he kept.
  "Dragsholm Slot": true,
  "Sømods Bolcher": true,
  "Aro": true,
  "Café Broløs": true,
  "Geranium": true,
  "Niels Bugges Kro": true,
  "Restaurant Surt & Sødt": true,
  "Smagsloet Vesterbro": true,
  "Hyttefadet": true,
  "Alma": true,
  // Somebody else's cuisine.
  "SanGiovanni": false,
  "Pizza by WH": false,
  "Tony's": false,
  "Restaurant Flammen Nyropsgade": false,
  "Restau74": false,
  "JOJO": false,
  "Seoul BBQ": false,
  "Burger Boom Aalborg": false,
  "Chickie’s": false,
  "Restaurant Provence": false,
  "Grillen Burgerbar Aalborg": false,
  "Hooked Christianshavn": false,
  "Hooked Kødbyen": false,
  "Rosita bistro": false,
  "Catch me Sushi": false,
  "Prinsens pizza & grill": false,
  "Flamestone Pizzaria": false,
  "Bones": false,
};

// Whole words, folded, so "pizza" does not fire inside a longer Danish word
// and "thai" not inside "thailandsk" by accident of a prefix.
const FOREIGN = ["pizza", "pizzeria", "pizzaria", "trattoria", "osteria", "italian", "sushi", "japanese", "ramen",
  "korean", "thai", "vietnamese", "chinese", "indian", "mexican", "taco", "tacos", "burrito", "burger", "burgers",
  "burgerbar", "bbq", "barbecue", "american", "diner", "french", "bistro", "brasserie", "kebab", "shawarma", "falafel",
  "lebanese", "turkish", "greek", "spanish", "tapas", "tex mex", "steakhouse", "poke", "dim sum", "noodle", "noodles"];
const hasWord = (hay, w) => new RegExp(`(^|[^a-z0-9])${w.replace(/ /g, "[^a-z0-9]+")}($|[^a-z0-9])`).test(hay);

export const foreignCuisineIn = (text) => {
  const hay = fold(String(text || ""));
  return FOREIGN.find(w => hasWord(hay, w)) || "";
};

const verdictFor = (name) => {
  const n = String(name || "").trim();
  if (Object.prototype.hasOwnProperty.call(FOOD_VERDICTS, n)) return FOOD_VERDICTS[n];
  const key = Object.keys(FOOD_VERDICTS).find(k => fold(k) === fold(n));
  return key ? FOOD_VERDICTS[key] : null;
};

export const foodOnNav = (row) => {
  if (!row || !row.name) return false;
  if (typeof row.danish === "boolean") return row.danish;
  if (row.isFoodStreet) return true;
  const said = verdictFor(row.name);
  if (said !== null) return said;
  return !foreignCuisineIn(`${row.category || ""} ${row.name}`);
};

// ── AND THE SEARCH THAT FINDS NEW ONES ──────────────────────────────
// The Studio's "search the web" for food is told to look for Danish food and
// nothing else, and what it brings back is filtered on the same words, because
// a prompt is not a filter (discovery.js has learned that five times).
export const DANISH_FOOD_FRAMING = "\n\nONLY DANISH FOOD. Look for places a visitor could not get the same way at home: smørrebrød, pølsevogne and other Danish street food such as flæskestegssandwich, bakeries and konditorier, fish smokehouses (røgerier), old kroer, Danish and New Nordic restaurants, and food halls and markets. Search in Danish as well as English. Leave out any restaurant whose point is another country's cuisine, however good it is: pizza, sushi, burgers, Thai, Indian, Mexican, French bistros and the like.";
export const DANISH_FOOD_EXTRACT = "\n\nTHIS IS A SEARCH FOR DANISH FOOD ONLY. Leave out every restaurant whose point is another country's cuisine (pizza, sushi, burgers, Thai, Indian, Mexican, a French bistro and the like). A food hall or market stays whatever its stalls sell. In each hook, say what Danish food it serves.";
export const splitOffForeignFood = (candidates) => {
  const kept = [], dropped = [];
  for (const c of Array.isArray(candidates) ? candidates : []) {
    const said = foreignCuisineIn(`${c?.name || ""} ${c?.hook || ""}`);
    const hall = /\b(street ?food|food ?hall|food ?market|madmarked|torvehal\w*|market hall|markethall)\b/i.test(`${c?.name || ""} ${c?.hook || ""}`);
    (said && !hall ? dropped : kept).push(c);
  }
  return { kept, dropped };
};
