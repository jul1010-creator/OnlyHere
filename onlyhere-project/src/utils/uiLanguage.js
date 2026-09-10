// ── THE FRAME, IN THE READER'S LANGUAGE ─────────────────────────────
//
// Oliver, 4 Sep 2026: "what do we do about making the page also being on Danish
// and German? I've had alot of complaints because people say they want a Danish
// version as well." Kristian asked for the same two on his first look at the
// site, back in August.
//
// This is JOB A of the three MULTILINGUAL_25AUG.md separates, and it is the one
// with no risk in it:
//
//   A. Interface   buttons, labels, nav, errors    NO STRING CARRIES A FACT
//   B. Model output  chat, itinerary, preview      already done at 6 of 10 sites
//   C. Published content, 148 rows                 every fact gate reads English
//
// Nothing in this file can make a guide wrong, because nothing in it is a claim
// about Denmark. That is the whole reason it can ship ahead of C.
//
// ── WHERE IT LIVES, AND WHY IT IS ONE MODULE ────────────────────────
//
// ENGLISH_STRINGS_24AUG.md settled this before anybody started substituting:
// "travellerWords.js is the precedent that works: one vocabulary that two
// parsers import, so adding a seventh language is a list entry rather than a
// seventh copy of the same regex." Same here, pointing the other way. A seventh
// language is a column in this table and nothing else, and a decision living
// inside a render can only ever be checked by a regex over its own source.

// ── THE LANGUAGES, AND THE FLAGS HE ASKED FOR ───────────────────────
//
// `code` is a BCP 47 base tag, so it can be handed to readerLanguage and to
// hreflang without translation. `name` is the ENDONYM, the language's own name
// for itself, because somebody who cannot read the interface cannot read
// "Danish" either and can read "Dansk".
//
// English is first and is the source language: every other column is checked
// against it, and a key missing elsewhere falls back to it rather than rendering
// a key name at a traveller.
// ── AND THE FLAG IS NOT A CHARACTER ─────────────────────────────
// This carried a flag emoji per language until 5 Sep 2026, when Oliver's own
// header showed "GB", "DK", "DE". Windows ships no font that draws a
// regional-indicator pair as a flag, so Chrome draws the two letters instead,
// and no font stack or CSS fixes that. The flags are SVG in LanguagePicker.jsx
// now, drawn from `code`, so the emoji field is not here to be believed.
export const UI_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "da", name: "Dansk" },
  { code: "de", name: "Deutsch" },
];

export const UI_CODES = UI_LANGUAGES.map(l => l.code);
export const DEFAULT_UI_LANGUAGE = "en";
export const isUiLanguage = (code) => UI_CODES.includes(String(code || "").trim().toLowerCase());
export const uiLanguageMeta = (code) => UI_LANGUAGES.find(l => l.code === String(code || "").trim().toLowerCase()) || UI_LANGUAGES[0];

// ── THE CATALOGUE ───────────────────────────────────────────────────
//
// One entry per key, one column per language, and the structural assertion in
// tests/run.mjs reads THIS OBJECT rather than a count: every key declares a
// string in every language in UI_LANGUAGES. A count is not a rule, and a
// source-scanning assertion about copy has been satisfied by an adjacent comment
// nine times in this repo.
//
// ── WHAT IS DELIBERATELY NOT IN HERE ────────────────────────────────
//
// "Gemlyx Detour" and "Gemlyx" are PRODUCT NAMES and are not translated, under
// the same rule readerLanguage.js applies to Nørreport: a name somebody has to
// match against a screen, a sign or a URL stays as it is. The nav entry keeps
// its ✦ and its English words in all three languages on purpose.
//
// The blogBody headings ("The Reality Check", "Who It's For", "Things to Know")
// are not here, and they were the reason a Danish interface still showed English
// inside an entry. They are stored inside the 148 published rows rather than
// rendered from a constant, so they are job C wearing a job A costume, as
// MULTILINGUAL_25AUG.md puts it.
//
// They are translated now, in utils/entryWords.js, and the costume is why they
// are there rather than here: a UI string is WRITTEN at its render site and can
// have a key, while a heading ARRIVES from a database row and the English text
// is the only key it has. Nothing was migrated. The rows keep their English and
// the render looks the phrase up on the way to the screen, which is the move
// this codebase has settled on three times: "suppressing it at RENDER so all 71
// published entries were fixed at once rather than needing 71 redrafts."
export const UI_STRINGS = {
  // The pages, along the top. NAV_ITEMS in App.jsx maps its labels through t().
  "nav.home":        { en: "Explore",         da: "Udforsk",        de: "Entdecken" },
  "nav.essentials":  { en: "Essentials",      da: "Praktisk info",  de: "Praktisches" },
  "nav.tips":        { en: "Tips",            da: "Tips",           de: "Tipps" },
  // "Attraktionen" rather than "Sehenswürdigkeiten", which is the more usual
  // German word and is eighteen characters in a horizontal bar that already
  // hides itself below 1080px. Both are correct; this one fits.
  "nav.attractions": { en: "Attractions",     da: "Attraktioner",   de: "Attraktionen" },
  "nav.events":      { en: "Events",          da: "Begivenheder",   de: "Veranstaltungen" },
  "nav.food":        { en: "Food",            da: "Mad",            de: "Essen" },
  "nav.nightlife":   { en: "Nightlife",       da: "Natteliv",       de: "Nachtleben" },
  "nav.visits":      { en: "Towns",           da: "Byer",           de: "Städte" },
  // The product name, untranslated in all three. See the note above.
  "nav.ai":          { en: "✦ Gemlyx Detour", da: "✦ Gemlyx Detour", de: "✦ Gemlyx Detour" },

  // The front-page category filter, which is a SECOND render site holding four
  // of the same words. Those four reuse the nav keys rather than getting a
  // parallel set: one word, one entry, which is the reason the catalogue is one
  // module. Only the two words the nav does not have are declared here.
  "filter.all":   { en: "Everything", da: "Alt",         de: "Alles" },
  "filter.craft": { en: "Workshops",  da: "Værksteder",  de: "Werkstätten" },

  // The two front-page rows. "Worth the trip right now" is about the PLACE and
  // "Fitting your preferences" is about the READER, which is the first thing on
  // this page that an account visibly buys.
  "row.yours.title":   { en: "Fitting your preferences", da: "Passer til dine interesser", de: "Passend zu deinen Interessen" },
  "row.yours.sub":     { en: "Matched to what you told us you like", da: "Ud fra det du har fortalt os", de: "Nach dem, was du uns gesagt hast" },
  "row.trend.title":   { en: "Worth the trip right now",  da: "Værd at rejse efter lige nu",  de: "Jetzt eine Reise wert" },
  "row.trend.sub":     { en: "The ones we would go out of our way for", da: "Dem vi selv ville køre en omvej for", de: "Die, für die wir einen Umweg fahren würden" },
  // Two empty states, because they need different buttons. A signed-in person
  // shown "Account needed" would be a bug wearing the costume of a feature.
  "row.needAccount.title":  { en: "Account needed",  da: "Kræver en konto",  de: "Konto erforderlich" },
  "row.needAccount.detail": { en: "Gemlyx matches places to what you like once you have an account.", da: "Gemlyx finder steder ud fra dine interesser, når du har en konto.", de: "Mit einem Konto sucht Gemlyx Orte nach deinen Interessen aus." },
  "row.needAccount.action": { en: "Sign in",         da: "Log ind",         de: "Anmelden" },
  "row.needInterests.title":  { en: "Tell Gemlyx what you like", da: "Fortæl Gemlyx hvad du kan lide", de: "Sag Gemlyx, was dir gefällt" },
  "row.needInterests.detail": { en: "Pick a few interests and this row fills itself in.", da: "Vælg et par interesser, så fylder rækken sig selv ud.", de: "Wähl ein paar Interessen, dann füllt sich diese Reihe von selbst." },
  "row.needInterests.action": { en: "Open my profile", da: "Åbn min profil",  de: "Mein Profil öffnen" },

  // Starting the conversation over. It needed a control the moment the thread
  // started surviving a reload: before that, closing the tab WAS the reset.
  "chat.reset":        { en: "Start over",   da: "Start forfra",   de: "Neu anfangen" },
  "chat.resetConfirm": { en: "Clear this conversation and start again?", da: "Ryd samtalen og start forfra?", de: "Unterhaltung löschen und neu anfangen?" },
  "chat.resetYes":     { en: "Clear it",     da: "Ryd den",        de: "Löschen" },
  "chat.resetNo":      { en: "Keep it",      da: "Behold den",     de: "Behalten" },

  // The header chrome, which renders on every page of the site.
  "header.search":       { en: "Search",                 da: "Søg",                    de: "Suchen" },
  "header.back":         { en: "Back to the front page", da: "Tilbage til forsiden",   de: "Zurück zur Startseite" },
  "header.menu":         { en: "Menu",                   da: "Menu",                   de: "Menü" },
  "header.language":     { en: "Language",               da: "Sprog",                  de: "Sprache" },
  // The section heading above the language row in the menu, which sits right
  // beside it and was the only English word left in that panel's own chrome.
  "header.theme":        { en: "Theme",                  da: "Tema",                   de: "Design" },
  "header.chooseLanguage": { en: "Choose a language",    da: "Vælg sprog",             de: "Sprache wählen" },

  // ── THE REST OF THE MENU, WHICH WAS HALF TRANSLATED ───────────────
  //
  // 6 Sep 2026. "Theme" and "Language" read the catalogue and every row above
  // them did not, so a Danish reader opened the menu and met Saved trips,
  // Navigate, FAQ and Support in English with Tema underneath. Half a
  // translation reads worse than none: it looks like the language switch did
  // not work.
  "menu.navigate": { en: "Navigate",      da: "Gå til",              de: "Navigation" },
  "menu.saved":    { en: "Saved trips",   da: "Gemte ture",          de: "Gespeicherte Reisen" },
  // "Ofte stillede spørgsmål" is the full Danish and it is 24 characters in a
  // 10px uppercase heading. This is the short form both languages use in
  // ordinary writing.
  "menu.faq":      { en: "FAQ",           da: "Spørgsmål og svar",   de: "Häufige Fragen" },
  "menu.credits":  { en: "Photo credits", da: "Fotokreditering",     de: "Bildnachweise" },
  // Danish borrows "support" for a paid helpdesk. This is a person answering
  // his own email, which is "hjælp".
  // ── AND HOW THE MONEY WORKS, WHERE SOMEBODY WOULD LOOK ────────────
  //
  // Oliver, 9 Sep 2026. It was a footer link and a row on the account page,
  // both of which are places a reader reaches after deciding to trust the site.
  // Somebody wondering why a booking link is there looks in the menu.
  "menu.paid":       { en: "How we are paid", da: "Sådan tjener vi penge", de: "Womit wir Geld verdienen" },
  "menu.support":  { en: "Support",       da: "Hjælp",               de: "Hilfe" },
  "menu.account":  { en: "Account",       da: "Konto",               de: "Konto" },
  // Its own entry rather than reusing row.needAccount.action, which holds the
  // same word today. Not duplication for its own sake: the suite reads literal
  // keys out of App.jsx with a two-segment pattern, so a three-segment key
  // cannot be written as a literal there at all, and a template literal with
  // nothing to interpolate is worse than a row in a table.
  "menu.signIn":   { en: "Sign in",       da: "Log ind",             de: "Anmelden" },

  // ── THE EMPTY STATES ──────────────────────────────────────────────
  //
  // The one screen where a reader is already unsure whether the site is
  // working, so an English sentence there is the worst place for one.
  //
  // TWO SEGMENTS PER KEY, not three. The suite reads every literal key out of
  // App.jsx with /uiT\("([a-z]+\.[a-zA-Z]+)"/ and checks it exists, and a
  // three-segment key gets truncated to its first two by that pattern and
  // reported missing. The existing row.needAccount.title keys escape it only
  // because they are built with a template literal.
  "empty.filtersTitle":  { en: "Nothing matches those filters", da: "Ingen resultater med de filtre", de: "Nichts passt zu diesen Filtern" },
  "empty.filtersDetail": { en: "Try clearing one. Denmark still has plenty to offer.", da: "Prøv at fjerne et af dem. Danmark har stadig masser at byde på.", de: "Nimm einen davon weg. Dänemark hat noch viel zu bieten." },
  "empty.events":        { en: "No upcoming events. Try a different filter.", da: "Ingen kommende begivenheder. Prøv et andet filter.", de: "Keine anstehenden Veranstaltungen. Probier einen anderen Filter." },
  "empty.towns":         { en: "Nothing published matches these filters yet.", da: "Der er endnu ikke udgivet noget, der passer til de filtre.", de: "Noch nichts veröffentlicht, das zu diesen Filtern passt." },

  // ── THE ENTRY PAGE, WHICH A DANISH READER REACHED IN ENGLISH ──────
  //
  // Oliver, 7 Sep 2026: "work on translating more of the website from English
  // to Danish and German, rather than just the interface." The nav was Danish
  // and every word inside an entry was not, which is the half-translation this
  // file's own menu note calls worse than none.
  //
  // The row LABELS on the glance card and the section headings inside the
  // article are in utils/entryWords.js instead, keyed by their English, because
  // those arrive from a published row rather than being written here. These are
  // the ones this component writes itself.
  "glance.title":     { en: "At a Glance",     da: "Kort fortalt",        de: "Auf einen Blick" },
  // The product's own name stays, exactly as nav.ai does. "Gemlyx Find" is what
  // the badge is called in all three languages.
  "entry.find":       { en: "Gemlyx Find",     da: "Gemlyx Find",         de: "Gemlyx Find" },
  "entry.branches":   { en: "Where you can go", da: "Hvor du kan tage hen", de: "Wo du hingehen kannst" },
  "entry.liveInfo":   { en: "Check live info", da: "Tjek aktuel info",    de: "Aktuelle Infos prüfen" },
  "entry.checking":   { en: "Checking...",     da: "Tjekker...",          de: "Wird geprüft..." },
  "entry.website":    { en: "Visit website",   da: "Besøg hjemmesiden",   de: "Zur Website" },
  "entry.tickets":    { en: "Book tickets",    da: "Køb billetter",       de: "Tickets buchen" },
  "entry.directions": { en: "Get Directions",  da: "Find vej",            de: "Route anzeigen" },
  // Two states of one button, so both are declared. Danish has no comfortable
  // one-word past tense here: "Har været her" is what a Dane would write.
  "entry.been":       { en: "Been here",       da: "Har været her",       de: "Schon hier gewesen" },
  "entry.beenDone":   { en: "✓ Been here",     da: "✓ Har været her",     de: "✓ Schon hier gewesen" },
  // ── WHOSE PRICE THE NUMBER ON THE ROW IS ──────────────────────────
  //
  // Rendered by the glance card rather than by DetailPage, so it is not in the
  // ENTRY_KEYS list the entry page is scanned against. The host is appended
  // rather than interpolated: this catalogue holds no placeholders, and a
  // hostname is the same string in all three languages anyway.
  //
  // "Pris fra" would read as "from 199 kr" in Danish, which is the exact
  // confusion this line exists to end. "Oplyst af" is who said it.
  "entry.priceFrom":  { en: "Price stated by", da: "Pris oplyst af",      de: "Preis laut" },
  // ── THE LINE AT THE FOOT OF A SECTION ─────────────────────────────
  //
  // Oliver's own words, 9 Sep 2026: "Or hop onto Getyourguide and book a
  // beerwalk!" The phrase it ends on comes from the product's slug and is
  // translated in entryWords; this is the half he wrote, so it keeps his
  // cadence rather than being tidied into a sentence nobody would say.
  "tour.lead":        { en: "Or hop onto GetYourGuide and book", da: "Eller smut forbi GetYourGuide og book", de: "Oder schau bei GetYourGuide vorbei und buche" },

  // ── THE GUIDE PAGE, WHICH WAS ENGLISH UNDER A DANISH NAV ──────────
  //
  // Oliver, 7 Sep 2026: "work on translating more of the website from English
  // to Danish and German, rather than just the interface." The guide itself is
  // WRITTEN in the reader's language, because the model is told to; everything
  // around it was typed in English and stayed there. So a Dane pressed Udforsk,
  // built a plan in Danish, and met "Does this look right?" above it.
  //
  // The counts below are split into a one and a many rather than templated,
  // because this catalogue holds no placeholders and never has: the number is
  // put in front of the phrase by the caller, in every language.
  "guide.notFound":     { en: "Guide not found",   da: "Guiden blev ikke fundet", de: "Reiseführer nicht gefunden" },
  "guide.loadFailed":   { en: "Something went wrong loading this guide.", da: "Noget gik galt, da guiden skulle hentes.", de: "Beim Laden dieses Reiseführers ist etwas schiefgelaufen." },
  "guide.linkGone":     { en: "This guide link doesn't exist or was removed.", da: "Dette guidelink findes ikke eller er blevet fjernet.", de: "Dieser Link existiert nicht oder wurde entfernt." },
  "guide.loadOffline":  { en: "Couldn't load this guide. Check your connection and try again.", da: "Guiden kunne ikke hentes. Tjek din forbindelse og prøv igen.", de: "Der Reiseführer konnte nicht geladen werden. Prüf deine Verbindung und versuch es noch einmal." },
  "guide.back":         { en: "Back to Gemlyx",    da: "Tilbage til Gemlyx",   de: "Zurück zu Gemlyx" },
  "guide.saveFailed":   { en: "Couldn't save this guide. Try again.", da: "Guiden kunne ikke gemmes. Prøv igen.", de: "Der Reiseführer konnte nicht gespeichert werden. Versuch es noch einmal." },
  "guide.saveOffline":  { en: "Couldn't save this guide. Check your connection and try again.", da: "Guiden kunne ikke gemmes. Tjek din forbindelse og prøv igen.", de: "Der Reiseführer konnte nicht gespeichert werden. Prüf deine Verbindung und versuch es noch einmal." },
  "guide.saved":        { en: "Saved. This link is your guide.", da: "Gemt. Dette link er din guide.", de: "Gespeichert. Dieser Link ist dein Reiseführer." },
  "guide.sendIt":       { en: "Send this to whoever you're travelling with.", da: "Send det til dem, du rejser med.", de: "Schick ihn an die Leute, mit denen du reist." },
  "guide.copyLink":     { en: "Copy link",         da: "Kopiér link",          de: "Link kopieren" },
  "guide.copied":       { en: "✓ Copied",          da: "✓ Kopieret",           de: "✓ Kopiert" },
  "guide.saving":       { en: "Saving…",           da: "Gemmer…",              de: "Wird gespeichert…" },
  "guide.saveCta":      { en: "Looks good, save my guide", da: "Det ser godt ud, gem min guide", de: "Sieht gut aus, Reiseführer speichern" },
  "guide.previewTitle": { en: "Does this look right?", da: "Ser det rigtigt ud?", de: "Sieht das richtig aus?" },
  "guide.previewSub":   { en: "Here's everything your guide will include. Take a look, then save it to get your own link.", da: "Her er alt det, din guide kommer til at indeholde. Kig det igennem, og gem den så for at få dit eget link.", de: "Hier ist alles, was dein Reiseführer enthalten wird. Sieh es dir an und speichere ihn dann für deinen eigenen Link." },
  "guide.fallbackTitle":{ en: "Your Denmark Guide", da: "Din guide til Danmark", de: "Dein Reiseführer für Dänemark" },
  "guide.kmTravel":     { en: "km of travel",      da: "km rejse",             de: "km Fahrt" },
  "guide.movingTotal":  { en: "moving in total",   da: "undervejs i alt",      de: "insgesamt unterwegs" },
  "guide.yourRoute":    { en: "Your route:",       da: "Din rute:",            de: "Deine Route:" },
  "guide.longestLeg":   { en: "Longest single journey:", da: "Længste enkelttur:", de: "Längste Einzelstrecke:" },
  "guide.closePin":     { en: "Close this pin",    da: "Luk denne markør",     de: "Diese Markierung schließen" },
  "guide.bookAhead":    { en: "Book before you go", da: "Book inden du tager af sted", de: "Vor der Reise buchen" },
  "guide.beforeYouGo":  { en: "Before you go",     da: "Inden du tager af sted", de: "Vor der Abreise" },
  "guide.money":        { en: "Money",             da: "Penge",                de: "Geld" },
  "guide.gettingAround":{ en: "Getting around",    da: "Transport",            de: "Unterwegs" },
  "guide.keepInMind":   { en: "Keep in mind",      da: "Husk på",              de: "Denk daran" },
  "guide.weather":      { en: "Weather",           da: "Vejr",                 de: "Wetter" },
  "guide.whereToStay":  { en: "Where to stay:",    da: "Hvor du bor:",         de: "Wo du übernachtest:" },
  "guide.samePlace":    { en: "Same place, nothing to travel", da: "Samme sted, ingen transport", de: "Gleicher Ort, keine Fahrt" },
  "guide.byBike":       { en: "by bike",           da: "på cykel",             de: "mit dem Rad" },
  "guide.byCar":        { en: "by car",            da: "i bil",                de: "mit dem Auto" },
  "guide.onFoot":       { en: "on foot",           da: "til fods",             de: "zu Fuß" },
  "guide.byTransit":    { en: "by train/bus",      da: "med tog eller bus",    de: "mit Bahn oder Bus" },
  "guide.shortWalk":    { en: "A short walk",      da: "En kort gåtur",        de: "Ein kurzer Weg zu Fuß" },
  "guide.checkTimes":   { en: "Check times on Rejseplanen", da: "Tjek tider på Rejseplanen", de: "Zeiten auf Rejseplanen prüfen" },
  "guide.checkRoute":   { en: "Check route",       da: "Tjek ruten",           de: "Route prüfen" },
  "guide.ferryLeg":     { en: "This journey includes a ferry crossing.", da: "Denne tur indeholder en færgeoverfart.", de: "Auf dieser Strecke liegt eine Fährüberfahrt." },
  "guide.realForecast": { en: "Real forecast for this date", da: "Rigtig prognose for denne dato", de: "Echte Vorhersage für dieses Datum" },
  "guide.forecastMoved":{ en: "The forecast moved since you saved this.", da: "Prognosen har ændret sig, siden du gemte.", de: "Die Vorhersage hat sich geändert, seit du gespeichert hast." },
  "guide.readMore":     { en: "Read more",         da: "Læs mere",             de: "Mehr lesen" },
  "guide.readLess":     { en: "Less",              da: "Mindre",               de: "Weniger" },
  "guide.changeStop":   { en: "Change this stop",  da: "Skift dette stop",     de: "Diesen Stopp ändern" },
  "guide.neverMind":    { en: "Never mind",        da: "Glem det",             de: "Doch nicht" },
  "guide.askPlaceholder": { en: "Ask about this trip, or anything else…", da: "Spørg om turen, eller om noget helt andet…", de: "Frag zu dieser Reise oder zu etwas ganz anderem…" },
  "guide.chatFailed":   { en: "Sorry, I couldn't get an answer just now, try again in a moment.", da: "Beklager, jeg kunne ikke få et svar lige nu. Prøv igen om et øjeblik.", de: "Sorry, ich habe gerade keine Antwort bekommen. Versuch es gleich noch einmal." },
  "guide.noUpdates":    { en: "No current updates found.", da: "Ingen aktuelle opdateringer fundet.", de: "Keine aktuellen Updates gefunden." },
  "guide.checkFailed":  { en: "Couldn't check right now. Try again in a moment.", da: "Kunne ikke tjekke lige nu. Prøv igen om et øjeblik.", de: "Konnte gerade nicht nachsehen. Versuch es gleich noch einmal." },
  "guide.straightLine": { en: "Straight line distance, not a measured route, so treat it as the shape of the day rather than as a timetable.", da: "Afstanden er i lige linje og ikke en målt rute, så se det som dagens form frem for som en køreplan.", de: "Luftlinie statt gemessener Route, also lies es als Form des Tages und nicht als Fahrplan." },
  // ── THE COUNTERS ABOVE THE DAYS ───────────────────────────────────
  //
  // Both halves of each plural are written down rather than an -s appended in
  // code, because Danish does not add one to "stop" and German changes the
  // stem of "Stadt". The number is put in front by the caller.
  "guide.day":          { en: "day",   da: "dag",  de: "Tag" },
  "guide.days":         { en: "days",  da: "dage", de: "Tage" },
  "guide.stop":         { en: "stop",  da: "stop", de: "Stopp" },
  "guide.stops":        { en: "stops", da: "stop", de: "Stopps" },
  "guide.town":         { en: "town",  da: "by",   de: "Stadt" },
  "guide.towns":        { en: "towns", da: "byer", de: "Städte" },

  // ── THE THREE FOOTNOTES UNDER THE MAP ─────────────────────────────
  //
  // The only sentences on this page that put a number in the MIDDLE of a
  // clause, which is why they were left in English on the first pass. Written
  // out in full for one and for many rather than templated, because the
  // catalogue holds no placeholders: the caller puts the count in front of the
  // many form and the list of names between the lead and the tail.
  //
  // Both forms are real sentences in each language rather than an -s bolted on,
  // and the German ones change more than the ending: "Ein Stopp ist" against
  // "Stopps sind".
  "guide.unplacedOne":  { en: "One stop is not on this map, because we could not place it on a coordinate:", da: "Ét stop er ikke med på kortet, fordi vi ikke kunne placere det på en koordinat:", de: "Ein Stopp ist nicht auf dieser Karte, weil wir ihn keiner Koordinate zuordnen konnten:" },
  "guide.unplacedMany": { en: "stops are not on this map, because we could not place them on a coordinate:", da: "stop er ikke med på kortet, fordi vi ikke kunne placere dem på en koordinat:", de: "Stopps sind nicht auf dieser Karte, weil wir sie keiner Koordinate zuordnen konnten:" },
  "guide.unplacedEndOne":  { en: "It is still in the day by day below.", da: "Det er der stadig i dag for dag herunder.", de: "Er steht trotzdem unten in der Tagesübersicht." },
  "guide.unplacedEndMany": { en: "They are still in the day by day below.", da: "De er der stadig i dag for dag herunder.", de: "Sie stehen trotzdem unten in der Tagesübersicht." },
  "guide.sharedPinOne":  { en: "One stop shares a pin with the stop before it, because they are the same place. That is why the highest number here is lower than the number of stops.", da: "Ét stop deler markør med stoppet før, fordi det er det samme sted. Derfor er det højeste tal her lavere end antallet af stop.", de: "Ein Stopp teilt sich eine Markierung mit dem Stopp davor, weil es derselbe Ort ist. Deshalb ist die höchste Zahl hier kleiner als die Zahl der Stopps." },
  "guide.sharedPinMany": { en: "stops share a pin with the stop before it, because they are the same place. That is why the highest number here is lower than the number of stops.", da: "stop deler markør med stoppet før, fordi det er de samme steder. Derfor er det højeste tal her lavere end antallet af stop.", de: "Stopps teilen sich eine Markierung mit dem Stopp davor, weil es dieselben Orte sind. Deshalb ist die höchste Zahl hier kleiner als die Zahl der Stopps." },
  "guide.approxOne":  { en: "One pin is approximate:", da: "Én markør er omtrentlig:", de: "Eine Markierung ist ungefähr:" },
  "guide.approxMany": { en: "pins are approximate:", da: "markører er omtrentlige:", de: "Markierungen sind ungefähr:" },
  "guide.approxEndOne":  { en: "We could not place it exactly, so it sits at the middle of the town rather than at the door. The dashed outline on the map marks it.", da: "Vi kunne ikke placere den præcist, så den sidder midt i byen i stedet for ved døren. Den stiplede kant på kortet viser den.", de: "Wir konnten sie nicht genau setzen, also sitzt sie in der Mitte der Stadt statt an der Tür. Der gestrichelte Rand auf der Karte zeigt sie." },
  "guide.approxEndMany": { en: "We could not place them exactly, so they sit at the middle of the town rather than at the door. The dashed outline on the map marks them.", da: "Vi kunne ikke placere dem præcist, så de sidder midt i byen i stedet for ved døren. Den stiplede kant på kortet viser dem.", de: "Wir konnten sie nicht genau setzen, also sitzen sie in der Mitte der Stadt statt an der Tür. Der gestrichelte Rand auf der Karte zeigt sie." },
  // ── AND THE CURRENCY NOTE ─────────────────────────────────────────
  //
  // Three numbers in one sentence, so it is assembled from four pieces around
  // them. "Kroner" is left as the label in all three: it is what the currency
  // is called, and the German column says Kronen because that is what a German
  // reader calls it.
  "guide.kroner":       { en: "Kroner",  da: "Kroner",  de: "Kronen" },
  "guide.pricedInDkk":  { en: "Everything here is priced in DKK, which is what you will be charged.", da: "Alt her er i danske kroner, og det er også det, du bliver trukket.", de: "Alles hier ist in dänischen Kronen ausgezeichnet, und genau das wird auch abgebucht." },
  "guide.wasAbout":     { en: "was about", da: "svarede til cirka", de: "waren etwa" },
  "guide.onDate":       { en: "on",       da: "den",     de: "am" },
  "guide.ratesMoved":   { en: "so rates will have moved a little by the time you travel.", da: "så kurserne har flyttet sig en smule, når du rejser.", de: "die Kurse werden sich bis zu deiner Reise also ein wenig bewegt haben." },

  // ── THE SENTENCE UNDER EVERY PAID LINK ────────────────────────────
  //
  // Found on 9 Sep 2026 by rendering TourLine in Danish and reading what came
  // out: the sentence above it was Danish and this one was English, on every
  // affiliate link on the site, in every language, since the first programme
  // went in. affiliates.js hard-codes it in four places and hands the same
  // English string to every reader.
  //
  // It matters more than a label does. This is the disclosure that makes a paid
  // link honest, and a disclosure the reader cannot read is not a disclosure.
  // A Dane was being told, in English, that the Danish sentence above it might
  // earn us money.
  //
  // The four functions in affiliates.js still return the English, because they
  // answer "does this link earn"; affiliateNote is the one render-facing
  // accessor and it translates. A test asserts this column and their string are
  // the same sentence, or the two drift apart the first time either is edited.
  "affiliate.disclosure": { en: "Booking through this link may earn Gemlyx a small commission. It costs you nothing and does not change the price.", da: "Booker du gennem dette link, kan Gemlyx få en lille kommission. Det koster dig ikke noget og ændrer ikke prisen.", de: "Wenn du über diesen Link buchst, kann Gemlyx eine kleine Provision erhalten. Für dich kostet es nichts und der Preis ändert sich nicht." },

  // ── THE SCREEN A DANE MEETS WHEN THEY TRY TO KEEP A GUIDE ─────────
  //
  // 9 Sep 2026. The last untranslated screen that a reader reaches by doing the
  // thing the product asks them to do: they built a plan in Danish, pressed
  // save, and the sheet that decides whether they get an account opened in
  // English. That is the worst place on the site for it. A sign-up form in a
  // language you did not pick is where people close the tab, and his own
  // complaint from 4 Sep was that Danes were asking for a Danish version.
  //
  // TWO THINGS ARE DELIBERATELY NOT HERE. Supabase's own error text comes back
  // from their API in English and this catalogue cannot reach it. And the
  // "Still needed" field names come from ProfileQuestions, which is its own
  // screen and its own pass. Both are named in the handoff rather than left to
  // be discovered.
  "auth.signIn":        { en: "Sign in",            da: "Log ind",              de: "Anmelden" },
  "auth.createAccount": { en: "Create account",     da: "Opret konto",          de: "Konto erstellen" },
  "auth.sendReset":     { en: "Send reset link",    da: "Send nulstillingslink", de: "Link zum Zurücksetzen senden" },
  "auth.setNewPass":    { en: "Set new password",   da: "Vælg ny adgangskode",  de: "Neues Passwort setzen" },
  "auth.chooseNewPass": { en: "Choose a new password", da: "Vælg en ny adgangskode", de: "Wähl ein neues Passwort" },
  "auth.resetPassword": { en: "Reset password",     da: "Nulstil adgangskode",  de: "Passwort zurücksetzen" },
  "auth.keepGuide":     { en: "Keep this guide",    da: "Gem denne guide",      de: "Diesen Reiseführer behalten" },
  "auth.signInKeep":    { en: "Sign in to keep it", da: "Log ind for at gemme den", de: "Anmelden, um ihn zu behalten" },
  "auth.reviewArticle": { en: "Review this article", da: "Anmeld denne artikel", de: "Diesen Artikel bewerten" },
  "auth.signInReview":  { en: "Sign in to review it", da: "Log ind for at anmelde den", de: "Anmelden, um zu bewerten" },
  "auth.createAnAccount": { en: "Create an account", da: "Opret en konto",      de: "Ein Konto erstellen" },
  // ── WHY YOU ARE BEING ASKED, WHICH IS NOT THE SAME EVERY TIME ─────
  //
  // The review line carried an em dash until this pass, in copy a reader meets,
  // which is the one thing his rule forbids outright. It came out as a comma
  // and an "and", and none of the three languages has one.
  "auth.whyGuide":      { en: "The guide itself is free and yours to read right now. An account is what keeps it, on this phone and every other one.", da: "Selve guiden er gratis og din at læse med det samme. En konto er det, der gemmer den, på denne telefon og alle andre.", de: "Der Reiseführer selbst ist kostenlos und du kannst ihn sofort lesen. Ein Konto ist das, was ihn behält, auf diesem Handy und auf jedem anderen." },
  "auth.whyReview":     { en: "Reviews of our writing need an account, so we know a real person is behind each one. Reporting something out of date needs nothing at all, and that button is right there for everybody.", da: "Anmeldelser af det, vi skriver, kræver en konto, så vi ved, at der er et rigtigt menneske bag hver enkelt. At melde noget forældet kræver ingenting, og den knap står der til alle.", de: "Bewertungen unserer Texte brauchen ein Konto, damit wir wissen, dass hinter jeder ein echter Mensch steht. Etwas als veraltet zu melden braucht gar nichts, und der Knopf steht für alle da." },
  "auth.whyDefault":    { en: "An account keeps your saved places and guides on every device instead of just this one.", da: "En konto gemmer dine steder og guider på alle dine enheder i stedet for kun denne.", de: "Ein Konto behält deine gespeicherten Orte und Reiseführer auf allen Geräten statt nur auf diesem." },
  "auth.newpassLead":   { en: "Type it twice and you are back in. This link works once, so if it fails, ask for a new one.", da: "Skriv den to gange, så er du inde igen. Linket virker én gang, så bed om et nyt, hvis det ikke går.", de: "Gib es zweimal ein und du bist wieder drin. Der Link funktioniert einmal, frag also nach einem neuen, wenn es nicht klappt." },
  // The count goes in FRONT of these, which is why the sentence starts at the
  // noun. Both halves written out: Danish does not add an s to ting and German
  // changes the adjective as well as the noun.
  "auth.savedOne":      { en: "saved item on this device will come with you.", da: "gemt ting på denne enhed følger med.", de: "gespeicherter Eintrag auf diesem Gerät kommt mit." },
  "auth.savedMany":     { en: "saved items on this device will come with you.", da: "gemte ting på denne enhed følger med.", de: "gespeicherte Einträge auf diesem Gerät kommen mit." },
  // ── THE SCREEN THAT ENDS, AND THE ADDRESS ON IT ───────────────────
  "auth.checkEmail":    { en: "Check your email",   da: "Tjek din mail",        de: "Sieh in deine Mails" },
  "auth.linkOnWay":     { en: "A confirmation link is on its way to", da: "Et bekræftelseslink er på vej til", de: "Ein Bestätigungslink ist unterwegs an" },
  "auth.openIt":        { en: "Open it and you are in. It can take a minute or two, and it does sometimes land in spam.", da: "Åbn det, så er du inde. Der kan gå et minut eller to, og det ender nogle gange i spam.", de: "Öffne ihn und du bist drin. Es kann ein oder zwei Minuten dauern, und manchmal landet er im Spam." },
  "auth.sameBrowser":   { en: "The answers you just gave are kept on this device. Confirm in this same browser and they come with you.", da: "De svar, du lige har givet, bliver på denne enhed. Bekræft i den samme browser, så følger de med.", de: "Die Antworten, die du gerade gegeben hast, bleiben auf diesem Gerät. Bestätige im selben Browser, dann kommen sie mit." },
  "auth.sending":       { en: "Sending…",           da: "Sender…",              de: "Wird gesendet…" },
  "auth.sendAgain":     { en: "Send it again",      da: "Send igen",            de: "Nochmal senden" },
  "auth.sendAgainIn":   { en: "Send it again in",   da: "Send igen om",         de: "Nochmal senden in" },
  "auth.wrongAddress":  { en: "Wrong address? Go back", da: "Forkert adresse? Gå tilbage", de: "Falsche Adresse? Zurück" },
  "auth.sentAgain":     { en: "Sent again. Check your spam folder too.", da: "Sendt igen. Tjek også din spammappe.", de: "Nochmal gesendet. Sieh auch im Spam nach." },
  // ── THE FORM ──────────────────────────────────────────────────────
  "auth.email":         { en: "Email",              da: "Mail",                 de: "E-Mail" },
  "auth.password":      { en: "Password",           da: "Adgangskode",          de: "Passwort" },
  "auth.newPassword":   { en: "New password",       da: "Ny adgangskode",       de: "Neues Passwort" },
  "auth.atLeastSix":    { en: "at least 6 characters", da: "mindst 6 tegn",     de: "mindestens 6 Zeichen" },
  "auth.confirmPassword": { en: "Confirm password", da: "Bekræft adgangskode",  de: "Passwort bestätigen" },
  "auth.typeItAgain":   { en: "Type it again",      da: "Skriv den igen",       de: "Nochmal eingeben" },
  "auth.noMatchYet":    { en: "These do not match yet.", da: "De to er ikke ens endnu.", de: "Die beiden stimmen noch nicht überein." },
  "auth.working":       { en: "Working…",           da: "Arbejder…",            de: "Wird bearbeitet…" },
  "auth.close":         { en: "Close",              da: "Luk",                  de: "Schließen" },
  // ── WHAT IT SAYS WHEN SOMETHING IS WRONG ──────────────────────────
  "auth.needSix":       { en: "Passwords need at least 6 characters.", da: "Adgangskoden skal være på mindst 6 tegn.", de: "Das Passwort braucht mindestens 6 Zeichen." },
  "auth.noMatch":       { en: "The two passwords do not match.", da: "De to adgangskoder er ikke ens.", de: "Die beiden Passwörter stimmen nicht überein." },
  "auth.enterEmail":    { en: "Enter your email.",  da: "Skriv din mail.",      de: "Gib deine E-Mail ein." },
  "auth.passChanged":   { en: "Password changed. You are signed in.", da: "Adgangskoden er skiftet. Du er logget ind.", de: "Passwort geändert. Du bist angemeldet." },
  "auth.resetSent":     { en: "If that email has an account, a reset link is on its way.", da: "Hvis der er en konto på den mail, er et nulstillingslink på vej.", de: "Wenn es zu dieser Adresse ein Konto gibt, ist ein Link unterwegs." },
  "auth.noSession":     { en: "That sign in did not come back with a session. Try again in a moment.", da: "Det login kom ikke tilbage med en session. Prøv igen om et øjeblik.", de: "Diese Anmeldung kam ohne Sitzung zurück. Versuch es gleich noch einmal." },
  "auth.stillNeeded":   { en: "Still needed:",      da: "Mangler stadig:",      de: "Fehlt noch:" },
  // The age sits between these two, so both halves are written out and the
  // number is put between them by the caller.
  "auth.ageLead":       { en: "You have to be at least", da: "Du skal være mindst", de: "Du musst mindestens" },
  "auth.ageTail":       { en: "to make an account.", da: "år for at oprette en konto.", de: "sein, um ein Konto zu erstellen." },
  // ── THE SMALL PRINT, WHICH IS THE PART THAT HAS TO BE READABLE ────
  "auth.agreeLead":     { en: "By creating an account you agree to the", da: "Når du opretter en konto, accepterer du vores", de: "Mit dem Erstellen eines Kontos akzeptierst du unsere" },
  "auth.terms":         { en: "Terms of Service",   da: "Servicevilkår",        de: "Nutzungsbedingungen" },
  "auth.andThe":        { en: "and the",            da: "og vores",             de: "und unsere" },
  "auth.privacy":       { en: "Privacy Policy",     da: "Privatlivspolitik",    de: "Datenschutzerklärung" },
  "auth.newUser":       { en: "New User? Sign up here!", da: "Ny bruger? Opret dig her!", de: "Neu hier? Registrier dich!" },
  "auth.haveOne":       { en: "I already have one", da: "Jeg har allerede en",  de: "Ich habe schon eins" },
  "auth.forgot":        { en: "Forgot password",    da: "Glemt adgangskode",    de: "Passwort vergessen" },
  "auth.freeAccount":   { en: "A free account saves your guide and nothing more. Keeping it live as your trip approaches, new events worth rerouting for, help while you are there, that is the paid side, and it is not switched on yet.", da: "En gratis konto gemmer din guide og ikke mere end det. At holde den opdateret frem mod turen, nye begivenheder det er værd at lægge om for, hjælp mens du er her, det er den betalte del, og den er ikke tændt endnu.", de: "Ein kostenloses Konto speichert deinen Reiseführer und sonst nichts. Ihn aktuell zu halten, während die Reise näher rückt, neue Veranstaltungen, für die sich ein Umweg lohnt, Hilfe vor Ort, das ist der bezahlte Teil, und der ist noch nicht eingeschaltet." },
  "auth.storeLead":     { en: "We store your email, what you fill in here, and your saved list. Gemlyx also notices which kinds of trip you build, so the next guide lands closer. No tracking, no marketing email, nothing sold. You can delete your account and everything in it from this menu at any time, and the", da: "Vi gemmer din mail, det du udfylder her, og din liste over gemte steder. Gemlyx lægger også mærke til, hvilke slags ture du bygger, så den næste guide rammer tættere på. Ingen sporing, ingen reklamemails, intet bliver solgt. Du kan slette din konto og alt i den fra denne menu når som helst, og", de: "Wir speichern deine E-Mail, was du hier ausfüllst, und deine gespeicherte Liste. Gemlyx merkt sich auch, welche Art von Reisen du planst, damit der nächste Reiseführer näher trifft. Kein Tracking, keine Werbemails, nichts wird verkauft. Du kannst dein Konto und alles darin jederzeit aus diesem Menü löschen, und die" },
  "auth.storeTail":     { en: "is the long version.", da: "er den lange udgave.", de: "ist die lange Fassung." },

  // ── WHAT A PIN ON THE MAP IS BEST FOR ─────────────────────────────
  //
  // Oliver's own wording, 9 Sep 2026: "a short 'Best if you want history'
  // 'Best if you want nightlife' 'Best if you want Art'".
  //
  // GERMAN TAKES A DIFFERENT SHAPE ON PURPOSE. "Best if you want art" is a
  // prefix plus a noun in English and in Danish, and in German the verb goes to
  // the end ("Am besten, wenn du Kunst willst"), so a prefix cannot work. The
  // German column says "best for" instead, which is the same thing said the way
  // the language says it. Each column is its own sentence; that is the point of
  // having three of them.
  "map.bestFor":     { en: "Best if you want", da: "Bedst hvis du vil have", de: "Am besten für" },

  // ── AND THE LINE UNDER THE MAP ────────────────────────────────────
  //
  // Three English sentences hard-coded into a component that already takes
  // `lang` and already translates the labels ON the map through it. A Danish
  // reader got Danish pin labels and an English instruction under them.
  //
  // NEITHER TRANSLATION NAMES THE PIN. English says "the pin", and Danish and
  // German each have two competing words for the thing (nål/markør,
  // Stecknadel/Marker) with no agreed one. Saying what to tap ON is what the
  // sentence is for, and a reader looking at a map with dots on it does not
  // need the dot named.
  "map.tapOne":      { en: "Where these are. Tap a pin to see it.", da: "Hvor de ligger. Tryk på en af dem for at se stedet.", de: "Wo sie liegen. Tippe auf einen Punkt, um ihn zu sehen." },
  "map.tapTheOne":   { en: "Tap the pin to see it.", da: "Tryk for at se stedet.", de: "Tippe auf den Punkt, um ihn zu sehen." },

  // ── AND THE ONES THAT ARE NOT ON IT ───────────────────────────────
  //
  // "A map quietly showing part of the conversation is a map of a different
  // trip", so the count is said out loud. {n} IS THE COUNT, and it is the only
  // placeholder in this whole table: the three languages put the number in the
  // same place but not the noun or the verb, so the sentence has to be one
  // string per language rather than fragments glued together at the render
  // site. tests/run.mjs asserts every column keeps the token.
  "map.offMapOne":   { en: "{n} earlier place is off this map.", da: "{n} tidligere sted ligger uden for kortet.", de: "{n} früherer Ort liegt außerhalb dieser Karte." },
  "map.offMapMany":  { en: "{n} earlier places are off this map.", da: "{n} tidligere steder ligger uden for kortet.", de: "{n} frühere Orte liegen außerhalb dieser Karte." },

  // The two search boxes that are not the header's. header.search covers that
  // one already, and these say what they search rather than repeating "Søg".
  "search.attractions": { en: "Search attractions", da: "Søg i attraktioner", de: "Attraktionen suchen" },
  "search.towns":       { en: "Search a town, a region, anything…", da: "Søg efter en by, en landsdel, hvad som helst…", de: "Suche eine Stadt, eine Region, irgendetwas…" },
};

export const UI_KEYS = Object.keys(UI_STRINGS);

// ── READING ONE ─────────────────────────────────────────────────────
//
// Falls back to English rather than to the key, and returns "" for a key that
// does not exist at all. Rendering "nav.food" at a traveller is worse than
// rendering "Food" at them, and rendering a key is the failure mode every
// hand-rolled t() in the world ships with.
export const t = (key, lang = DEFAULT_UI_LANGUAGE) => {
  const row = UI_STRINGS[key];
  if (!row) return "";
  const code = String(lang || "").trim().toLowerCase();
  return row[code] || row[DEFAULT_UI_LANGUAGE] || "";
};

// ── CHOOSING ONE ────────────────────────────────────────────────────
//
// Pure, so the rule can be asserted without a browser. `stored` is what the
// person picked and it always wins, including when they picked English: that is
// a choice and not an absence, and overriding it with a Danish browser tag on
// the next load is the thing a language picker exists to stop.
//
// The browser tag is consulted ONLY when nothing is stored. His brief says the
// selector must never switch on IP, and this is not IP: it is the setting on the
// device in the reader's own hand. A Dane landing on an English page and having
// to hunt for a flag is the complaint being fixed here, so the first guess is
// worth making, and the flag sits in the corner to undo it in one press.
//
// Region and script are dropped: "da-DK" is Danish and "de-AT" is German.
export const resolveUiLanguage = (stored, navTag) => {
  if (isUiLanguage(stored)) return String(stored).trim().toLowerCase();
  const base = String(navTag || "").trim().split("-")[0].toLowerCase();
  return isUiLanguage(base) ? base : DEFAULT_UI_LANGUAGE;
};

export const UI_LANGUAGE_KEY = "gemlyx.uiLang";

// Every read and write is guarded. Private mode throws on access rather than
// returning null, and an interface that cannot render because storage is off is
// a worse bug than one that forgets a preference.
export const storedUiLanguage = () => {
  try {
    const v = localStorage.getItem(UI_LANGUAGE_KEY);
    return isUiLanguage(v) ? v : null;
  } catch { return null; }
};

export const setStoredUiLanguage = (code) => {
  if (!isUiLanguage(code)) return false;
  try { localStorage.setItem(UI_LANGUAGE_KEY, String(code).trim().toLowerCase()); return true; }
  catch { return false; }
};

// What the app should render in right now. The one impure entry point, kept to
// one line so every caller reads the same rule.
export const currentUiLanguage = () =>
  resolveUiLanguage(storedUiLanguage(), typeof navigator !== "undefined" ? navigator.language : "");
