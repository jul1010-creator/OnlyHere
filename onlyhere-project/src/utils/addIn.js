// ── "WHAT ARE YOU INTERESTED IN HERE?" ──────────────────────────────
//
// Oliver, 10 Sep 2026, asked what should fill the slots the nightlife cap frees
// up on a day: "hmmm... depends on the person. Do they fancy a nice dinner or a
// quick kebab before drinking. At the guide you can make a feature called 'add
// in' if there is a space of uncertainty. Ask is better than hallucination."
//
// That is the rule this whole pipeline already runs on, pointed at a new thing.
// An empty price field beats an invented number; an asked question beats a
// guessed dinner. Whether somebody wants a sit-down meal or a kebab on the way
// is not a fact about Denmark, it is a fact about the person, and the builder
// has no way to know it and no business pretending.
//
// ── AND IT IS THE PREVIEW SCREEN'S TWO DOORS, ONE DAY WIDE ──────────
//
// GuidePreviewScreen already has this pair: an empty section gets an invitation
// ("Add nightlife") and, beside it, a question typed into the real conversation
// rather than an empty composer, because "a door that opens onto an empty
// composer hands the traveller the job of working out the question, which is
// the same overwhelm wearing a different shape."
//
// His words for the difference: "Then instead it's just into that specific
// day." So the seed names the day and the town, and an answer lands where the
// gap is rather than on the trip as a whole.
export const ADD_IN_QUESTION = "What are you interested in here?";

// Three, and they are the three a day can be short of. Not a taxonomy: towns,
// events and workshops are all things a day already has or does not need, and a
// chip for every content type is the "massive overwhelming list" he objected to
// on the preview screen.
export const ADD_IN_CATS = [
  { key: "free", label: "Something to see", ask: "What is worth seeing" },
  { key: "food", label: "Somewhere to eat", ask: "Where should I eat" },
  { key: "nightlife", label: "A drink after", ask: "Where should I go for a drink" },
];

// ── ONLY WHAT THE DAY IS MISSING ────────────────────────────────────
//
// A day already carrying two restaurants does not need "Somewhere to eat" put
// in front of it, and offering it anyway is the same noise as a card under
// every reply. `kindOf` is injected for the reason planGate injects its own
// readers: this file knows what a gap looks like and has no business holding a
// copy of the library.
//
// NO READER, NOTHING OFFERED. A caller that cannot say what a stop is would
// otherwise be told every day is short of everything.
export const addInOffers = (day, { kindOf = null, cats = ADD_IN_CATS } = {}) => {
  if (typeof kindOf !== "function") return [];
  const stops = Array.isArray(day?.stops) ? day.stops.filter(s => s && s.name) : [];
  const held = new Set(stops.map(s => kindOf(s.name)).filter(Boolean));
  return (Array.isArray(cats) ? cats : []).filter(c => c && c.key && !held.has(c.key));
};

// The question, typed for them, naming the day and the place. "Where should I
// eat in Koge on day 4?" is a question somebody can send without thinking about
// how to phrase it, which is the whole point of seeding it at all.
//
// The day number is dropped rather than faked when it is not known, because
// "on day 0" is worse than no day at all.
export const addInSeed = (cat, { town = "", dayNo = null } = {}) => {
  const ask = String(cat?.ask || "").trim();
  if (!ask) return "";
  const where = String(town || "").trim();
  const n = Number(dayNo);
  const day = Number.isFinite(n) && n > 0 ? ` on day ${n}` : "";
  return `${ask}${where ? ` in ${where}` : ""}${day}?`;
};

// ── AND WHAT A STOP ALREADY IS ──────────────────────────────────────
//
// The reader addInOffers needs, built off the published pools. `_src` on a
// library row and the category keys above are the same three words on purpose,
// so this is a lookup rather than a mapping table that can drift.
//
// EXACT NAME, for the reason nightKindOf gives: a miss means a category is
// offered that the day may already hold, which is one extra chip. A loose match
// would mean a category NOT offered when the day is short of it, which is the
// gap this feature exists to close.
export const addInKindOf = (name, pools = {}) => {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return null;
  for (const cat of ADD_IN_CATS) {
    const rows = Array.isArray(pools?.[cat.key]) ? pools[cat.key] : [];
    if (rows.some(r => String(r?.name || "").trim().toLowerCase() === n)) return cat.key;
  }
  return null;
};

// The published places of one category near a day, for the pick door. A filter
// in front of the shared nearby reader rather than a second one: `_src` carries
// the category and nearbyPublished already knows about distance, walking time
// and not offering somebody the stop they are standing on.
export const addInNear = (cat, point, library, nearby, opts = {}) => {
  if (typeof nearby !== "function" || !cat?.key) return [];
  const rows = (Array.isArray(library) ? library : []).filter(r => r?._src === cat.key);
  return nearby(point, rows, opts) || [];
};
