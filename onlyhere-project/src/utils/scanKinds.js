// ── SCAN A SOURCE, FOR MORE THAN EVENTS ─────────────────────────────
//
// Oliver, 1 Oct 2026, with klaipedon.lt/en/discover/what-to-see/ open: "I want
// to be able to draft all of this", and then "there is only an 'event' page
// extractor.. it has to include this".
//
// So Scan a Source asks what kind of listing it is reading. The page is read
// the same way for every kind; only what the model is asked to pull out, and
// the Studio type the names are drafted as, change. Nothing here writes or
// publishes: the names go to the draft queue, and every one is researched and
// checked before anything reaches a reader.
export const SCAN_KINDS = [
  { id: "festival", label: "Events", what: "festival or event", extra: '"dates": "date range as written, else empty string"' },
  { id: "free", label: "Places to see", what: "place to see: an attraction, museum, park, beach, monument, square, viewpoint or landmark", extra: "" },
  { id: "food", label: "Food", what: "restaurant, café, bakery or other place to eat", extra: "" },
  { id: "town", label: "Towns", what: "town, village or district worth a visit", extra: "" },
];

export const scanKindOf = (id) => SCAN_KINDS.find(k => k.id === id) || SCAN_KINDS[0];

// The instruction for the extraction. A listing site gives most places a
// tagline ("Giruliai Beach: Where Summer Feels as Cosy as Childhood"), and a
// tagline is not a name anybody can search for, so the model is told to drop
// it and give the place's own name.
export const scanPrompt = (kindId, adjective = "Danish") => {
  const k = scanKindOf(kindId);
  const fields = [`"name": "the place's own name, as a person would search for it"`, `"town": "town or city if given, else empty string"`, k.extra].filter(Boolean).join(", ");
  return `Extract every distinct ${adjective} ${k.what} listed in this page text into strict JSON: {"items": [{${fields}}]}. Only include items present in the text: never invent, never add ones you think might exist. A listing often gives a place a tagline after a dash or a colon ("Giruliai Beach: Where Summer Feels as Cosy as Childhood"); drop the tagline and give the name alone ("Giruliai Beach"). Where the tagline is the only part that names it ("City Symbol: Sailing Ship Meridianas"), give the real name ("Meridianas"). If the same place appears twice, include it once. This is a discovery list only: the founder researches and verifies each one before anything is published.`;
};
