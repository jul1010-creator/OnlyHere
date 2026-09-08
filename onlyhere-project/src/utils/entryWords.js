// ── THE ENGLISH INSIDE AN ENTRY, WHICH IS NOT INTERFACE ─────────────
//
// Oliver, 7 Sep 2026: "work on translating more of the website from English to
// Danish and German, rather than just the interface."
//
// uiLanguage.js already holds the interface, and its own comment says why the
// job stopped there:
//
//   "The blogBody headings ("The Reality Check", "Who It's For", "Things to
//    Know") are NOT here either, and they are the reason a Danish interface
//    still shows English inside an entry. They are stored inside the 148
//    published rows rather than rendered from a constant, so they are job C
//    wearing a job A costume. Translating them is a content migration and it
//    does not belong in this file."
//
// The costume is real and the conclusion was one step too far. It is a content
// migration only if the ROWS have to change. They do not: this codebase has
// settled the same argument three times already, most recently in journeyScope
// — "suppressing it at RENDER so all 71 published entries were fixed at once
// rather than needing 71 redrafts". Every published row keeps its English, the
// crawler and the fact gates keep reading English, and a Danish reader gets
// Danish because the render looks the phrase up on the way to the screen.
//
// ── WHY THIS IS KEYED BY THE ENGLISH AND uiLanguage IS NOT ──────────
//
// A UI string is written at its render site, so it can have a key. These
// phrases ARRIVE: a heading comes out of a Supabase row, a stop label comes
// back from arrivalRow(), a price band from priceBandLabel(). Nothing at the
// render site knows which one it is holding, so the English text is the only
// key available. That makes the table fragile in exactly one way — change the
// English and the translation stops matching — and tests/run.mjs closes it by
// reading the pipeline's own heading list and helpers' own labels and asserting
// that every one of them is in here.
//
// NOTHING IN THIS TABLE CARRIES A FACT. Same rule that let the interface ship
// ahead of the content: a heading is a label on a section and a stop label says
// what kind of stop it is. The stop's NAME, the price, the duration and every
// other measured value pass through untouched, which is what keeps a Danish
// page and an English page saying the same thing about Denmark.
import { DEFAULT_UI_LANGUAGE, isUiLanguage } from "./uiLanguage";

// ── THE HEADINGS THE PIPELINE WRITES ────────────────────────────────
// Every one of these is a `{ type: "heading" }` block written by studioContent's
// bb() and bbBullets() out of App.jsx's own arrays, which is where the suite
// reads them back from.
//
// A few are not literal translations, on purpose, because the literal one is
// wrong in the target language. "Before Dark" and "After Dark" are a pair
// describing a bar street by day and by night, and Danish has no comfortable
// "før mørket": "Om dagen" and "Om aftenen" say the same thing the way a Dane
// would. German takes the idiomatic pair "Bei Tag" and "Bei Nacht".
const HEADINGS = {
  "Being There":          { da: "På stedet",              de: "Vor Ort" },
  "Who It's For":         { da: "Hvem er det for",        de: "Für wen geeignet" },
  "The Reality Check":    { da: "Virkeligheden",          de: "Realitätscheck" },
  "Things to Know":       { da: "Godt at vide",           de: "Gut zu wissen" },
  "What to Be Aware Of":  { da: "Vær opmærksom på",       de: "Worauf du achten solltest" },
  "Atmosphere":           { da: "Stemning",               de: "Atmosphäre" },
  "Before Dark":          { da: "Om dagen",               de: "Bei Tag" },
  "After Dark":           { da: "Om aftenen",             de: "Bei Nacht" },
  "Best Nights":          { da: "De bedste aftener",      de: "Die besten Abende" },
  "Best Time to Go":      { da: "Bedste tidspunkt",       de: "Beste Reisezeit" },
  "How It's Made":        { da: "Sådan bliver det lavet", de: "Wie es entsteht" },
  "Walking It":           { da: "Til fods",               de: "Zu Fuß" },
  "When Do People Enter": { da: "Hvornår kommer folk",    de: "Wann die Leute kommen" },
};

// ── THE ARRIVAL LABELS helpers.arrivalRow COMPUTES ──────────────────
// The label is chosen from the stop's NAME, which stays Danish either way. Only
// the word in front of it is translated: "Nærmeste station: Ribe Station".
const ARRIVAL = {
  "Nearest Stop":     { da: "Nærmeste stoppested",    de: "Nächste Haltestelle" },
  "Nearest Station":  { da: "Nærmeste station",       de: "Nächster Bahnhof" },
  "Nearest Bus Stop": { da: "Nærmeste busstoppested", de: "Nächste Bushaltestelle" },
  "Nearest Metro":    { da: "Nærmeste metrostation",  de: "Nächste Metrostation" },
  "Nearest Airport":  { da: "Nærmeste lufthavn",      de: "Nächster Flughafen" },
  "Ferry Terminal":   { da: "Færgeterminal",          de: "Fährterminal" },
};

// The price bands, which are a WORD and a FIGURE. The figure and the currency
// are the fact and are identical in all three; only "under", "to" and "over"
// are translated, and Danish happens to spell two of the three the same way.
const BANDS = {
  "Under 100 kr":  { da: "Under 100 kr",  de: "Unter 100 kr" },
  "100 to 250 kr": { da: "100 til 250 kr", de: "100 bis 250 kr" },
  "Over 250 kr":   { da: "Over 250 kr",   de: "Über 250 kr" },
};

// ── THE AT A GLANCE ROW LABELS ──────────────────────────────────────
// Built inline in DetailPage, one object per row, and translated in one place
// because AtAGlanceCard is the single component that renders all of them.
const GLANCE = {
  "Tickets":          { da: "Billetter",            de: "Tickets" },
  "Price":            { da: "Pris",                 de: "Preis" },
  "What it costs":    { da: "Hvad det koster",      de: "Was es kostet" },
  "Typical Costs":    { da: "Typiske udgifter",     de: "Typische Kosten" },
  "Extra Costs":      { da: "Ekstra udgifter",      de: "Zusätzliche Kosten" },
  "Accessibility":    { da: "Tilgængelighed",       de: "Barrierefreiheit" },
  "Accommodation":    { da: "Overnatning",          de: "Übernachtung" },
  "Camping":          { da: "Camping",              de: "Camping" },
  "Crowd":            { da: "Publikum",             de: "Publikum" },
  "Language":         { da: "Sprog",                de: "Sprache" },
  "Neighbourhood":    { da: "Kvarter",              de: "Viertel" },
  // How long to stay, not where to sleep. "Anbefalet ophold" reads as lodging
  // in Danish, which is the row directly above it on some entries.
  "Recommended Stay": { da: "Anbefalet varighed",   de: "Empfohlene Dauer" },
  "Best Time":        { da: "Bedste tidspunkt",     de: "Beste Zeit" },
  // A restaurant row. "Serverer" is the verb and reads oddly as a label; the
  // word both languages put on a menu is the cuisine.
  "Serves":           { da: "Køkken",               de: "Küche" },
  "Type":             { da: "Type",                 de: "Art" },
  "Book tickets":     { da: "Køb billetter",        de: "Tickets buchen" },
  // The self-guided walk, on the town card since 8 Sep. "Selvguidet" is the
  // Danish term the tour trade itself uses, so it is a translation rather than
  // a calque that happens to look like one.
  "Self-guided tour": { da: "Selvguidet tur",       de: "Selbstgeführte Tour" },
  // The merchant, named on the link because a link to a site nobody has heard
  // of has to say whose it is. Only the preposition is translated: WeGoTrip is
  // a name, and readerLanguage's rule for Nørreport covers it.
  "On WeGoTrip":      { da: "På WeGoTrip",          de: "Auf WeGoTrip" },
};

// ── AND THE POPULARITY TAGS, WHICH ARE A VERDICT NOT A FACT ─────────
// They rank an entry against the others rather than stating anything about
// Denmark, so they translate like the rest of the furniture.
const TAGS = {
  "Highly Recommended":     { da: "Stærkt anbefalet",          de: "Sehr empfehlenswert" },
  "Can't Miss Out":         { da: "Må ikke misses",            de: "Nicht verpassen" },
  "Worth Considering":      { da: "Værd at overveje",          de: "Überlegenswert" },
  "Best If Already Nearby": { da: "Bedst hvis du er i nærheden", de: "Lohnt sich, wenn du in der Nähe bist" },
};

// ── AND THE ONE WORD ON EVERY STOP IN A GUIDE ───────────────────────
//
// guideReading.stopKind turns a Danish compound name into the thing it is, and
// GuidePage prints it as a gold pill on every stop. It exists because Oliver
// asked whether a guide would overwhelm somebody who had never been to Denmark:
// "Vikingeskibsmuseet", "Roskilde Domkirke" and "Faxe Kalkbrud" are three long
// unpronounceable strings until one of them says Museum underneath.
//
// Which makes it the worst word on the page to leave in English, because it is
// the one word there for a reader who is already lost. travellerLanguage.js
// describes the failure it belongs to: a guide that came back Danish "with the
// leg lines and the weather still in English so the document changes language
// twice a page."
//
// Read back from guideReading's own STOP_KINDS list by the suite, so a kind
// added there cannot quietly ship untranslated.
const KINDS = {
  "Old town":           { da: "Gammel bydel",        de: "Altstadt" },
  "Cathedral":          { da: "Domkirke",            de: "Dom" },
  "Chalk quarry":       { da: "Kalkbrud",            de: "Kalkbruch" },
  "Round church":       { da: "Rundkirke",           de: "Rundkirche" },
  "Viking ship museum": { da: "Vikingeskibsmuseum",  de: "Wikingerschiffsmuseum" },
  "Museum":             { da: "Museum",              de: "Museum" },
  "Aquarium":           { da: "Akvarium",            de: "Aquarium" },
  "Festival":           { da: "Festival",            de: "Festival" },
  "Abbey":              { da: "Kloster",             de: "Kloster" },
  "Church":             { da: "Kirke",               de: "Kirche" },
  "Castle":             { da: "Slot",                de: "Schloss" },
  "Palace":             { da: "Palæ",                de: "Palais" },
  "Ferry port":         { da: "Færgehavn",           de: "Fährhafen" },
  "Airport":            { da: "Lufthavn",            de: "Flughafen" },
  "Harbour":            { da: "Havn",                de: "Hafen" },
  "Station":            { da: "Station",             de: "Bahnhof" },
  "Bridge":             { da: "Bro",                 de: "Brücke" },
  "Beach":              { da: "Strand",              de: "Strand" },
  "Campsite":           { da: "Campingplads",        de: "Campingplatz" },
  "Lighthouse":         { da: "Fyr",                 de: "Leuchtturm" },
  "Cliffs":             { da: "Klint",               de: "Steilküste" },
  "Forest":             { da: "Skov",                de: "Wald" },
  "Gardens":            { da: "Have",                de: "Garten" },
  "Square":             { da: "Torv",                de: "Platz" },
  "Street":             { da: "Gade",                de: "Straße" },
  "Lake":               { da: "Sø",                  de: "See" },
  "Park":               { da: "Park",                de: "Park" },
  "Zoo":                { da: "Zoo",                 de: "Zoo" },
  "Tower":              { da: "Tårn",                de: "Turm" },
  "Manor house":        { da: "Herregård",           de: "Herrenhaus" },
  "Ramparts":           { da: "Voldanlæg",           de: "Wallanlage" },
  "Mill":               { da: "Mølle",               de: "Mühle" },
  // The fallbacks stopKind uses when the name itself gives nothing away. These
  // come from the row's own content type rather than from its spelling.
  "Town":               { da: "By",                  de: "Stadt" },
  "Free to enter":      { da: "Gratis adgang",       de: "Eintritt frei" },
  "Restaurant":         { da: "Restaurant",          de: "Restaurant" },
  "Bar":                { da: "Bar",                 de: "Bar" },
  "Bar street":         { da: "Bargade",             de: "Kneipenstraße" },
  "Event":              { da: "Begivenhed",          de: "Veranstaltung" },
  "Workshop":           { da: "Værksted",            de: "Werkstatt" },
};

export const ENTRY_WORDS = { ...HEADINGS, ...ARRIVAL, ...BANDS, ...GLANCE, ...TAGS, ...KINDS };

// The four groups are exported so the suite can check each against the list it
// actually comes from, rather than against one flat bag where a missing heading
// could be excused by an unrelated label being present.
export const ENTRY_HEADINGS = Object.keys(HEADINGS);
export const ARRIVAL_LABELS = Object.keys(ARRIVAL);
export const GLANCE_LABELS = Object.keys(GLANCE);
export const KIND_LABELS = Object.keys(KINDS);

// ── LOOKING ONE UP ──────────────────────────────────────────────────
//
// Returns the ORIGINAL for anything it does not know, which is the only safe
// direction: an entry drafted with a heading nobody has translated yet shows
// that heading in English, and a reader loses nothing they had before. Blanking
// it, or rendering a key, would turn a missing translation into a broken page.
//
// The apostrophe is folded because "Who It's For" is written with an ASCII
// quote by the pipeline and with a curly one by anything that has been through
// a text editor, and those are two different strings to an object key.
const NORMALISE = (text) => String(text || "").trim().replace(/[’‘‛`´]/g, "'").replace(/\s+/g, " ");

const BY_NORMAL = new Map(Object.entries(ENTRY_WORDS).map(([k, v]) => [NORMALISE(k).toLowerCase(), v]));

export const entryWord = (text, lang = DEFAULT_UI_LANGUAGE) => {
  const raw = String(text ?? "");
  const code = String(lang || "").trim().toLowerCase();
  if (!raw.trim() || !isUiLanguage(code) || code === DEFAULT_UI_LANGUAGE) return raw;
  const hit = BY_NORMAL.get(NORMALISE(raw).toLowerCase());
  return (hit && hit[code]) || raw;
};
