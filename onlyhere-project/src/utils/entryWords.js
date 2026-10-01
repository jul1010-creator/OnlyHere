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
  "Being There":          { da: "På stedet",              de: "Vor Ort", lt: "Vietoje" },
  "Who It's For":         { da: "Hvem er det for",        de: "Für wen geeignet", lt: "Kam tai tinka" },
  "The Reality Check":    { da: "Virkeligheden",          de: "Realitätscheck", lt: "Kaip yra iš tikrųjų" },
  "Things to Know":       { da: "Godt at vide",           de: "Gut zu wissen", lt: "Naudinga žinoti" },
  "What to Be Aware Of":  { da: "Vær opmærksom på",       de: "Worauf du achten solltest", lt: "Į ką atkreipti dėmesį" },
  "Atmosphere":           { da: "Stemning",               de: "Atmosphäre", lt: "Atmosfera" },
  "Before Dark":          { da: "Om dagen",               de: "Bei Tag", lt: "Dieną" },
  "After Dark":           { da: "Om aftenen",             de: "Bei Nacht", lt: "Vakare" },
  "Best Nights":          { da: "De bedste aftener",      de: "Die besten Abende", lt: "Geriausi vakarai" },
  // Shops, 22 Sep 2026. "Best Times" is not "Best Time to Go" above: that one
  // is a season, this one is which days of the week the doors are open.
  "What They Sell":       { da: "Hvad de sælger",         de: "Was sie verkaufen", lt: "Ką jie parduoda" },
  "Best Times":           { da: "Hvornår du skal komme",  de: "Wann du kommen solltest", lt: "Kada geriausia atvykti" },
  "Best Time to Go":      { da: "Bedste tidspunkt",       de: "Beste Reisezeit", lt: "Geriausias laikas" },
  "How It's Made":        { da: "Sådan bliver det lavet", de: "Wie es entsteht", lt: "Kaip tai gaminama" },
  "Walking It":           { da: "Til fods",               de: "Zu Fuß", lt: "Pėsčiomis" },
  "When Do People Enter": { da: "Hvornår kommer folk",    de: "Wann die Leute kommen", lt: "Kada žmonės atvyksta" },
};

// ── THE ARRIVAL LABELS helpers.arrivalRow COMPUTES ──────────────────
// The label is chosen from the stop's NAME, which stays Danish either way. Only
// the word in front of it is translated: "Nærmeste station: Ribe Station".
const ARRIVAL = {
  "Nearest Stop":     { da: "Nærmeste stoppested",    de: "Nächste Haltestelle", lt: "Artimiausia stotelė" },
  "Nearest Station":  { da: "Nærmeste station",       de: "Nächster Bahnhof", lt: "Artimiausia stotis" },
  "Nearest Bus Stop": { da: "Nærmeste busstoppested", de: "Nächste Bushaltestelle", lt: "Artimiausia autobusų stotelė" },
  "Nearest Metro":    { da: "Nærmeste metrostation",  de: "Nächste Metrostation", lt: "Artimiausia metro stotis" },
  "Nearest Airport":  { da: "Nærmeste lufthavn",      de: "Nächster Flughafen", lt: "Artimiausias oro uostas" },
  "Ferry Terminal":   { da: "Færgeterminal",          de: "Fährterminal", lt: "Keltų terminalas" },
};

// The price bands, which are a WORD and a FIGURE. The figure and the currency
// are the fact and are identical in all three; only "under", "to" and "over"
// are translated, and Danish happens to spell two of the three the same way.
const BANDS = {
  "Under 100 kr":  { da: "Under 100 kr",  de: "Unter 100 kr", lt: "Iki 100 kr" },
  "100 to 250 kr": { da: "100 til 250 kr", de: "100 bis 250 kr", lt: "Nuo 100 iki 250 kr" },
  "Over 250 kr":   { da: "Over 250 kr",   de: "Über 250 kr", lt: "Daugiau nei 250 kr" },
};

// ── THE AT A GLANCE ROW LABELS ──────────────────────────────────────
// Built inline in DetailPage, one object per row, and translated in one place
// because AtAGlanceCard is the single component that renders all of them.
const GLANCE = {
  "Tickets":          { da: "Billetter",            de: "Tickets", lt: "Bilietai" },
  "Price":            { da: "Pris",                 de: "Preis", lt: "Kaina" },
  "What it costs":    { da: "Hvad det koster",      de: "Was es kostet", lt: "Kiek kainuoja" },
  "Typical Costs":    { da: "Typiske udgifter",     de: "Typische Kosten", lt: "Įprastos išlaidos" },
  "Extra Costs":      { da: "Ekstra udgifter",      de: "Zusätzliche Kosten", lt: "Papildomos išlaidos" },
  "Accessibility":    { da: "Tilgængelighed",       de: "Barrierefreiheit", lt: "Prieinamumas" },
  "Accommodation":    { da: "Overnatning",          de: "Übernachtung", lt: "Apgyvendinimas" },
  "Camping":          { da: "Camping",              de: "Camping", lt: "Stovyklavimas" },
  "Crowd":            { da: "Publikum",             de: "Publikum", lt: "Publika" },
  "Language":         { da: "Sprog",                de: "Sprache", lt: "Kalba" },
  "Neighbourhood":    { da: "Kvarter",              de: "Viertel", lt: "Rajonas" },
  // How long to stay, not where to sleep. "Anbefalet ophold" reads as lodging
  // in Danish, which is the row directly above it on some entries.
  "Recommended Stay": { da: "Anbefalet varighed",   de: "Empfohlene Dauer", lt: "Rekomenduojama trukmė" },
  "Best Time":        { da: "Bedste tidspunkt",     de: "Beste Zeit", lt: "Geriausias laikas" },
  // ── THE ISLAND ROWS ────────────────────────────────
  // "Fast forbindelse" is what the Danish road authority calls a bridge or
  // causeway you can drive over, and it is the phrase a Dane looking for one
  // would search. "Overfart" is the crossing itself, not the boat.
  "Fixed link":       { da: "Fast forbindelse",     de: "Feste Verbindung", lt: "Nuolatinė jungtis" },
  "Crossing":         { da: "Overfart",             de: "Überfahrt", lt: "Perkėla" },
  "Operator":         { da: "Rederi",               de: "Reederei", lt: "Vežėjas" },
  "Ports":            { da: "Havne",                de: "Häfen", lt: "Uostai" },
  "Off season":       { da: "Uden for sæsonen",     de: "Außerhalb der Saison", lt: "Ne sezono metu" },
  // The row an island gets when nothing on file can say how you reach it.
  // "Sådan kommer du dertil" is the heading these island sites use themselves,
  // which is the phrase a Dane is looking for. 20 Sep 2026.
  "Getting there":    { da: "Sådan kommer du dertil", de: "Anreise", lt: "Kaip nuvykti" },
  // A restaurant row. "Serverer" is the verb and reads oddly as a label; the
  // word both languages put on a menu is the cuisine.
  "Serves":           { da: "Køkken",               de: "Küche", lt: "Virtuvė" },
  "Type":             { da: "Type",                 de: "Art", lt: "Tipas" },
  "Book tickets":     { da: "Køb billetter",        de: "Tickets buchen", lt: "Pirkti bilietus" },
  // The self-guided walk, on the town card since 8 Sep. "Selvguidet" is the
  // Danish term the tour trade itself uses, so it is a translation rather than
  // a calque that happens to look like one.
  "Self-guided tour": { da: "Selvguidet tur",       de: "Selbstgeführte Tour", lt: "Savarankiška ekskursija" },
  // The merchant, named on the link because a link to a site nobody has heard
  // of has to say whose it is. Only the preposition is translated: WeGoTrip is
  // a name, and readerLanguage's rule for Nørreport covers it.
  "On WeGoTrip":      { da: "På WeGoTrip",          de: "Auf WeGoTrip", lt: "WeGoTrip platformoje" },
  // ── AND THE TICKET AGENT, NAMED FOR THE SAME REASON ─────────────
  //
  // "Book tickets" told a reader nothing about where the tap was going to take
  // them, which mattered once the row stopped hiding a link whose price came
  // from somewhere else: the whole point of leaving it up is that the two hosts
  // are visibly different. Only the verb and the preposition are translated,
  // because the three agents are names.
  "Book on Tiqets":       { da: "Køb på Tiqets",       de: "Auf Tiqets buchen", lt: "Pirkti per Tiqets" },
  "Book on Ticketmaster": { da: "Køb på Ticketmaster", de: "Auf Ticketmaster buchen", lt: "Pirkti per Ticketmaster" },
  "Book on WeGoTrip":     { da: "Køb på WeGoTrip",     de: "Auf WeGoTrip buchen", lt: "Pirkti per WeGoTrip" },
  "Book on GetYourGuide": { da: "Køb på GetYourGuide", de: "Auf GetYourGuide buchen", lt: "Pirkti per GetYourGuide" },
  // ── AND THE TOURS ROW, WHICH IS NOT THE TICKETS ROW ─────────────
  //
  // Oliver, 9 Sep 2026, asked what to do about Tiqets and GetYourGuide covering
  // the same place. They mostly do not: one sells the door and the other sells
  // the walk, so they are two rows rather than two candidates for one. See
  // ticketLink.isTourUrl for the measurement behind that.
  //
  // "On GetYourGuide" rather than "Book on", matching the self-guided tour row
  // directly above it. Both rows name a merchant a reader has to be told about,
  // and two adjacent rows saying it two different ways reads as an accident.
  "Tours":                { da: "Ture",                de: "Touren", lt: "Ekskursijos" },
  "On GetYourGuide":      { da: "På GetYourGuide",     de: "Auf GetYourGuide", lt: "GetYourGuide platformoje" },
};

// ── WHAT THE TOUR SENTENCE ENDS ON ──────────────────────────────────
//
// Oliver's own line is "Or hop onto Getyourguide and book a beerwalk!", and the
// half that carries it is "a beerwalk": a plain noun phrase saying what the
// thing IS.
//
// A SEPARATE GROUP FROM THE ROW LABELS, because these are not labels. They are
// the object of a sentence, so they are lower case and they take an article,
// and folding them in with "Tickets" and "Price" would put a phrase into
// GLANCE_LABELS that is not a label and would be asserted about as one.
//
// The vocabulary itself is in utils/tourSweep.js, matched against the product
// slug rather than read off the title: a GetYourGuide title is written to sell
// ("Aarhus: Craft Beerwalk with 5 Beers & Snacks Included") and reading one
// aloud in Gemlyx's voice quotes an advert as a recommendation.
const TOURS = {
  "a beer walk":         { da: "en ølvandring",           de: "eine Bierwanderung", lt: "alaus pasivaikščiojimą" },
  "a bar crawl":         { da: "en barrundtur",           de: "eine Bar-Tour", lt: "barų turą" },
  "a brewery tasting":   { da: "en bryggerismagning",     de: "eine Brauereiverkostung", lt: "degustaciją alaus darykloje" },
  "a food tour":         { da: "en madtur",               de: "eine kulinarische Tour", lt: "kulinarinę ekskursiją" },
  "a canal tour":        { da: "en kanalrundfart",        de: "eine Kanalrundfahrt", lt: "ekskursiją kanalais" },
  "a bike tour":         { da: "en cykeltur",             de: "eine Radtour", lt: "dviračių ekskursiją" },
  // Baja Bikes, 11 Sep 2026. Their slugs name the ride rather than the vehicle,
  // so the phrase has to as well: "copenhagen-by-night" is a bike tour and
  // saying only "a bike tour" throws away the half that makes somebody want it.
  "a bike tour after dark": { da: "en cykeltur efter mørkets frembrud", de: "eine Radtour nach Einbruch der Dunkelheit", lt: "vakarinę dviračių ekskursiją" },
  "a bike tour through Christianshavn": { da: "en cykeltur gennem Christianshavn", de: "eine Radtour durch Christianshavn", lt: "dviračių ekskursiją po Christianshavn" },
  "a student bike tour": { da: "en cykeltur for studerende", de: "eine Radtour für Studierende", lt: "dviračių ekskursiją studentams" },
  "a Christmas bike tour": { da: "en juletur på cykel",     de: "eine weihnachtliche Radtour", lt: "kalėdinę dviračių ekskursiją" },
  "a private guide":     { da: "en privat guide",          de: "ein privater Guide", lt: "asmeninį gidą" },
  "a guided walk":       { da: "en guidet vandretur",     de: "ein geführter Rundgang", lt: "pėsčiųjų ekskursiją su gidu" },
  "a Viking tour":       { da: "en vikingetur",           de: "eine Wikinger-Tour", lt: "vikingų ekskursiją" },
  "a castle tour":       { da: "en slotsrundvisning",     de: "eine Schlossführung", lt: "ekskursiją po pilį" },
  "a night out":         { da: "en bytur",                de: "ein Abend in der Stadt", lt: "vakarą mieste" },
  "a guided tour":       { da: "en guidet tur",           de: "eine Führung", lt: "ekskursiją su gidu" },
};

// ── WHICH OF THEM A LINK WEARS ──────────────────────────────────────
//
// Keyed by the agent code ticketAgentOf returns. HERE rather than in the page
// that renders it, because a phrase a reader meets has to have a row in the
// table above, and a label written at the render site is a phrase nobody
// translated. The test reads this map against GLANCE_LABELS, so the two cannot
// drift apart without something saying so.
//
// The old label is the fallback and stays true: an agent this does not know
// still sells tickets, and "Book tickets" is what the button below the fold
// has always said.
const BOOK_ON = {
  tiqets: "Book on Tiqets",
  ticketmaster: "Book on Ticketmaster",
  wegotrip: "Book on WeGoTrip",
  getyourguide: "Book on GetYourGuide",
};

export const BOOK_LABELS = Object.values(BOOK_ON);

export const bookLabel = (agent) => BOOK_ON[String(agent || "").trim().toLowerCase()] || "Book tickets";

// ── AND THE POPULARITY TAGS, WHICH ARE A VERDICT NOT A FACT ─────────
// They rank an entry against the others rather than stating anything about
// Denmark, so they translate like the rest of the furniture.
const TAGS = {
  "Highly Recommended":     { da: "Stærkt anbefalet",          de: "Sehr empfehlenswert", lt: "Labai rekomenduojama" },
  "Can't Miss Out":         { da: "Må ikke misses",            de: "Nicht verpassen", lt: "Negalima praleisti" },
  "Worth Considering":      { da: "Værd at overveje",          de: "Überlegenswert", lt: "Verta apsvarstyti" },
  "Best If Already Nearby": { da: "Bedst hvis du er i nærheden", de: "Lohnt sich, wenn du in der Nähe bist", lt: "Verta, jei esate netoliese" },
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
  "Old town":           { da: "Gammel bydel",        de: "Altstadt", lt: "Senamiestis" },
  "Cathedral":          { da: "Domkirke",            de: "Dom", lt: "Katedra" },
  "Chalk quarry":       { da: "Kalkbrud",            de: "Kalkbruch", lt: "Kreidos karjeras" },
  "Round church":       { da: "Rundkirke",           de: "Rundkirche", lt: "Apvalioji bažnyčia" },
  "Viking ship museum": { da: "Vikingeskibsmuseum",  de: "Wikingerschiffsmuseum", lt: "Vikingų laivų muziejus" },
  "Museum":             { da: "Museum",              de: "Museum", lt: "Muziejus" },
  "Aquarium":           { da: "Akvarium",            de: "Aquarium", lt: "Akvariumas" },
  "Festival":           { da: "Festival",            de: "Festival", lt: "Festivalis" },
  "Abbey":              { da: "Kloster",             de: "Kloster", lt: "Vienuolynas" },
  "Church":             { da: "Kirke",               de: "Kirche", lt: "Bažnyčia" },
  "Castle":             { da: "Slot",                de: "Schloss", lt: "Pilis" },
  "Palace":             { da: "Palæ",                de: "Palais", lt: "Rūmai" },
  "Ferry port":         { da: "Færgehavn",           de: "Fährhafen", lt: "Keltų uostas" },
  "Airport":            { da: "Lufthavn",            de: "Flughafen", lt: "Oro uostas" },
  "Harbour":            { da: "Havn",                de: "Hafen", lt: "Uostas" },
  "Station":            { da: "Station",             de: "Bahnhof", lt: "Stotis" },
  "Bridge":             { da: "Bro",                 de: "Brücke", lt: "Tiltas" },
  "Beach":              { da: "Strand",              de: "Strand", lt: "Paplūdimys" },
  "Campsite":           { da: "Campingplads",        de: "Campingplatz", lt: "Kempingas" },
  "Lighthouse":         { da: "Fyr",                 de: "Leuchtturm", lt: "Švyturys" },
  "Cliffs":             { da: "Klint",               de: "Steilküste", lt: "Skardžiai" },
  "Forest":             { da: "Skov",                de: "Wald", lt: "Miškas" },
  "Gardens":            { da: "Have",                de: "Garten", lt: "Sodai" },
  "Square":             { da: "Torv",                de: "Platz", lt: "Aikštė" },
  "Street":             { da: "Gade",                de: "Straße", lt: "Gatvė" },
  "Lake":               { da: "Sø",                  de: "See", lt: "Ežeras" },
  "Park":               { da: "Park",                de: "Park", lt: "Parkas" },
  "Zoo":                { da: "Zoo",                 de: "Zoo", lt: "Zoologijos sodas" },
  "Tower":              { da: "Tårn",                de: "Turm", lt: "Bokštas" },
  "Manor house":        { da: "Herregård",           de: "Herrenhaus", lt: "Dvaras" },
  "Ramparts":           { da: "Voldanlæg",           de: "Wallanlage", lt: "Pylimai" },
  "Mill":               { da: "Mølle",               de: "Mühle", lt: "Malūnas" },
  // The fallbacks stopKind uses when the name itself gives nothing away. These
  // come from the row's own content type rather than from its spelling.
  "Town":               { da: "By",                  de: "Stadt", lt: "Miestas" },
  "Free to enter":      { da: "Gratis adgang",       de: "Eintritt frei", lt: "Įėjimas nemokamas" },
  "Restaurant":         { da: "Restaurant",          de: "Restaurant", lt: "Restoranas" },
  "Bar":                { da: "Bar",                 de: "Bar", lt: "Baras" },
  "Bar street":         { da: "Bargade",             de: "Kneipenstraße", lt: "Barų gatvė" },
  "Event":              { da: "Begivenhed",          de: "Veranstaltung", lt: "Renginys" },
  "Workshop":           { da: "Værksted",            de: "Werkstatt", lt: "Dirbtuvės" },
};

// ── WHAT A PLACE IS FOR, IN ONE WORD ────────────────────────────────
//
// The nine themes from placeThemes.js, which every published row carries up to
// three of. They were on the screen in two places already, the chips on a card
// and the theme filter, and both printed the English straight at a Danish
// reader. Adding a third render site without these would have been the same
// mistake a third time, so the table comes first and the three sites read it.
//
// Keyed by the LABEL rather than the id, like everything else in this file, so
// a render site passes what it was going to print anyway.
const THEMES = {
  "Nature":             { da: "Natur",               de: "Natur", lt: "Gamta" },
  "Coast":              { da: "Kyst",                de: "Küste", lt: "Pajūris" },
  "History":            { da: "Historie",            de: "Geschichte", lt: "Istorija" },
  "Food":               { da: "Mad",                 de: "Essen", lt: "Maistas" },
  "Nightlife":          { da: "Natteliv",            de: "Nachtleben", lt: "Naktinis gyvenimas" },
  "Art":                { da: "Kunst",               de: "Kunst", lt: "Menas" },
  // Design is the same word in all three, which is a fact about the word and
  // not a hole in the table. Asserted as such in the suite.
  "Design":             { da: "Design",              de: "Design", lt: "Dizainas" },
  "Markets":            { da: "Markeder",            de: "Märkte", lt: "Turgūs" },
  "Family":             { da: "Familie",             de: "Familie", lt: "Šeima" },
};

export const ENTRY_WORDS = { ...HEADINGS, ...ARRIVAL, ...BANDS, ...GLANCE, ...TOURS, ...TAGS, ...KINDS, ...THEMES };

// The four groups are exported so the suite can check each against the list it
// actually comes from, rather than against one flat bag where a missing heading
// could be excused by an unrelated label being present.
export const ENTRY_HEADINGS = Object.keys(HEADINGS);
export const ARRIVAL_LABELS = Object.keys(ARRIVAL);
export const GLANCE_LABELS = Object.keys(GLANCE);
// Read by the suite against tourSweep's own vocabulary, so a phrase added there
// cannot ship untranslated the way a heading added to the pipeline once could.
export const TOUR_PHRASE_WORDS = Object.keys(TOURS);
export const KIND_LABELS = Object.keys(KINDS);
// Read by the suite against placeThemes' own THEME_LABEL, so a tenth theme
// added there cannot reach a Danish screen in English.
export const THEME_WORDS = Object.keys(THEMES);

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
