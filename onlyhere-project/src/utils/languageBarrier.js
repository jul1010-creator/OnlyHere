// ── "AN EVENT MIGHT HAVE A GREAT LANGUAGE BARRIER" ──────────────────
//
// Oliver, 15 Aug 2026, reading the Kaløvig Havnefestival draft with Danish
// sitting in a reader-facing field: "I wonder if we should make people aware
// that an event might have a great language barrier."
//
// Two different problems came out of that draft and only one of them is a bug.
//
//   GEMLYX WRITING DANISH AT A READER is a defect. "Dagsbillet 395.00,- DKK;
//   Partoutbillet 695.00,- DKK. Priser er eks. gebyrer." reached a field a
//   reader plans around, because the glance extractor pastes what the page
//   said and nothing asked it for English. That is fixed in glanceExtract.js.
//
//   THE EVENT ITSELF BEING DANISH is a FACT ABOUT THE EVENT, and translating
//   it away would be the dishonest fix. A harbour festival in Skødstrup with a
//   lineup of Danish acts, an operator site with no English version and every
//   ticket page in Danish is a Danish event. Somebody flying in deserves to
//   know that before they buy a partoutbillet, and Gemlyx knowing it and
//   quietly smoothing it over is exactly the "full of crap" failure this app
//   exists not to be.
//
// So the language of the entry is English and the language of the EVENT is
// reported.
//
// ── HOW THIS IS MEASURED, AND WHAT IT REFUSES TO GUESS ──────────────
//
// Only from pages the pipeline read. Not from the town, not from the scale, not
// from the name: those are all inferences, and an inference about whether a
// stranger will understand the signage is not worth publishing. When the
// operator's own site was not read, the answer is "unknown" and nothing is
// said, the same discipline coordFitsTown follows when it has nothing to check
// against.
//
// An English version found on the operator's own site settles it in the other
// direction, and settles it strongly: a Danish festival that publishes an
// English page has decided visitors are welcome, whatever language the bar
// staff use.

// Whole Danish words that no English sentence contains. Deliberately NOT the
// Danish letters: "Kaløvig Badehotel" is a correct value in an English field
// and always will be, and a rule keyed on æ, ø and å would flag every proper
// noun in the country. Function and ticketing words are the signal, because
// they only appear when a sentence was never translated.
//
// Words shared with English are left out even where they are common Danish:
// "for", "med", "er", "alle", "kroner" and "weekend" all read as English in
// some sentence, and one false positive on a correct field costs more than a
// missed one.
export const DANISH_MARKERS = [
  "og", "eller", "ikke", "uden", "hvis", "hver", "kun", "både", "samt", "eks", "ekskl", "inkl",
  "gratis", "adgang", "adgangen", "entré", "billet", "billetter", "billetten",
  "dagsbillet", "dagsbilletter", "partoutbillet", "partoutbilletter",
  "pris", "priser", "priserne", "gebyr", "gebyrer", "afgift",
  "voksne", "voksen", "børn", "barn", "unge", "ældre",
  "åbent", "åben", "åbner", "lukket", "lukker", "afholdes", "finder",
  "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag",
  "hverdage", "timer", "dage", "dagen", "uger", "måned", "året",
];

// A number written the Danish way. "395.00,- DKK" is an accounting convention
// that appears in no English price anywhere, so it is worth as much as a word.
const DANISH_MONEY = /\d[\d.,]*\s*,-/;

const isLetter = (ch) => !!ch && /\p{L}/u.test(ch);

// Whole words, and lowercased rather than folded: folding ø to o would make
// "åben" and "aben" the same string, and this list is about spelling.
export const danishWordsIn = (text) => {
  const t = String(text || "").toLowerCase();
  if (!t.trim()) return [];
  const found = [];
  for (const w of DANISH_MARKERS) {
    let from = 0;
    for (;;) {
      const i = t.indexOf(w, from);
      if (i < 0) break;
      if (!isLetter(t[i - 1]) && !isLetter(t[i + w.length])) { found.push(w); break; }
      from = i + 1;
    }
  }
  return found;
};

// ── FOR A SHORT FIELD, ONE MARKER IS ENOUGH ─────────────────────────
// This is asked of At a Glance values, which are a phrase long. An English
// phrase does not contain "gebyrer" by accident, and requiring two would let
// "Dagsbillet 395 DKK" through on a technicality. The Danish money form counts
// on its own for the same reason.
export const looksUntranslated = (value) => {
  const v = String(value || "").trim();
  if (!v) return false;
  return DANISH_MONEY.test(v) || danishWordsIn(v).length > 0;
};

// ── AND FOR A WHOLE PAGE, PROPORTION ────────────────────────────────
// A long English page about a Danish festival legitimately quotes Danish: a
// stage name, a ticket tier, a street. Three markers in four hundred words is
// an English page with Danish nouns in it. Thirty is a Danish page.
export const DANISH_PAGE_RATIO = 0.012;
export const looksDanishPage = (text) => {
  const t = String(text || "");
  const words = (t.match(/\p{L}+/gu) || []).length;
  if (words < 60) return false;      // too little read to say anything
  // Counted with repeats, unlike danishWordsIn, because a page is judged on how
  // much Danish it contains rather than how many distinct Danish words it uses.
  let hits = 0;
  for (const w of DANISH_MARKERS) {
    const re = new RegExp(`(?<![\\p{L}])${w}(?![\\p{L}])`, "giu");
    hits += (t.match(re) || []).length;
  }
  return hits / words >= DANISH_PAGE_RATIO;
};

// ── AN ENGLISH VERSION, STATED BY THE SITE ITSELF ───────────────────
// Three shapes, because the pipeline holds three different things depending on
// how a page was read. api/scan-source returns extracted TEXT and no HTML, so
// the hreflang and href tests only fire where raw markup happens to be
// available, and the word test carries the weight in practice: a language
// switcher renders as the bare word "English" in extracted text, and that is
// what a Danish site puts in its nav when it has an English version.
//
// The word test is only ever reached on a page ALREADY judged Danish, which is
// what makes it safe. On an English page the word "English" means nothing; on a
// Danish page it is a switch.
const ENGLISH_MARKUP = /hreflang\s*=\s*["']en\b|href\s*=\s*["'][^"']*\/(?:en|english|en-gb|en-us)(?:\/|["'])|>\s*English\s*</i;
const ENGLISH_URL = /\/(?:en|english|en-gb|en-us)(?:\/|$)|[?&]lang=en\b/i;
const ENGLISH_WORD = /(?<!\p{L})English(?!\p{L})/u;
export const hasEnglishVersion = ({ html = "", urls = [], text = "" } = {}) =>
  ENGLISH_MARKUP.test(String(html || "")) ||
  (Array.isArray(urls) ? urls : []).some(u => ENGLISH_URL.test(String(u || ""))) ||
  ENGLISH_WORD.test(String(text || ""));

// ── THE ANSWER, AND THE SENTENCE A READER GETS ──────────────────────
// Three outcomes and two of them say nothing, which is the important part. The
// order matters: the page has to be judged Danish BEFORE the English switch is
// looked for, because on an English page the word "English" is not a switch.
export const languageBarrier = ({ siteText = "", siteHtml = "", siteUrls = [] } = {}) => {
  const read = String(siteText || "").trim() || String(siteHtml || "").trim();
  if (!read) return { level: "unknown", note: "", why: "the operator's own site was not read, so nothing here is measured" };
  if (!looksDanishPage(read)) {
    return { level: "unknown", note: "", why: "the operator's page was read but is not clearly in one language" };
  }
  if (hasEnglishVersion({ html: siteHtml, urls: siteUrls, text: read })) {
    return { level: "has-english", note: "", why: "the operator's own site publishes an English version" };
  }
  return {
    level: "danish-only",
    // Written to be useful rather than discouraging. It states what was
    // measured, which is the site, and what follows from it, which is a
    // reasonable expectation and not a promise about the bar staff.
    note: "This one runs in Danish. The organiser's own site and ticket pages have no English version, so expect the programme, the signage and the announcements in Danish. Most Danes switch to English if you ask.",
    why: "the operator's own site is in Danish and publishes no English version",
  };
};
