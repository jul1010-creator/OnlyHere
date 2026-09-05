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
// are NOT here either, and they are the reason a Danish interface still shows
// English inside an entry. They are stored inside the 148 published rows rather
// than rendered from a constant, so they are job C wearing a job A costume, as
// MULTILINGUAL_25AUG.md puts it. Translating them is a content migration and it
// does not belong in this file.
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
