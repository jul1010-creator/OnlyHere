// ── "IF SOMEONE ONLY KNOWS MANDARIN CHINESE" ─────────────────────────
//
// Oliver, 15 Aug 2026: "What do we do about language? If someone only knows
// Mandarin Chinese.. then this page will probably be difficult."
//
// It is difficult, and the site has never once asked. Nothing in this codebase
// read navigator.language before this file, and not one of the four prompts
// that talk to a reader said a word about which language to answer in, so every
// one of them answered in English by default and nobody chose that.
//
// ── THIS IS THE HALF THAT COSTS NOTHING ─────────────────────────────
// Translating the 78 published entries is a real decision with a real risk
// attached (every fact gate in this codebase reads English, so a translated row
// sits outside all six of them). Telling a model which language to reply in is
// not that decision. It is one line in a prompt that was already being sent,
// with no extra call, no extra token to speak of, and nothing new to maintain.
//
// And for a Mandarin speaker it is worth MORE than a translated page, because
// the assistant can answer the question they have ("can I get there without a
// car") against the real entry, instead of handing them a machine translation
// of a ticket rule they then have to trust.
//
// ── READER FACING ONLY. THE PIPELINE STAYS ENGLISH ──────────────────
// This must never be spliced into a DRAFTING prompt. utils/glanceExtract.js
// spent 15 August fixing the opposite bug, untranslated Danish reaching a
// reader-facing field, and looksUntranslated exists to catch exactly that.
// Published content is written in English, checked in English by entryAudit,
// factSweep, claimCheck, checkScope and correction, and translated by the
// reader's own browser if they want it. What this file changes is the live
// conversation, which is generated fresh for one person and read by nobody
// else.

// Intl.DisplayNames turns "de" into "German" and "zh-Hans" into "Simplified
// Chinese", which is what a model needs, and it ships in every browser this app
// supports. The small table is the fallback for an environment without it and
// for the handful of tags where the display name is worse than the plain one.
const FALLBACK = {
  de: "German", nl: "Dutch", sv: "Swedish", no: "Norwegian", nb: "Norwegian",
  da: "Danish", fr: "French", es: "Spanish", it: "Italian", pl: "Polish",
  pt: "Portuguese", fi: "Finnish", zh: "Chinese", ja: "Japanese", ko: "Korean",
  ru: "Russian", ar: "Arabic", tr: "Turkish", cs: "Czech", en: "English",
};

// ── THE REGION COMES OFF, THE SCRIPT STAYS ON ───────────────────────
// Both halves of this were wrong in the first version and the suite caught
// both.
//
// Passing the whole tag to Intl gives "German (Germany)" for de-DE and, worse,
// "Austrian German" for de-AT. "ANSWER IN AUSTRIAN GERMAN" is a strange
// instruction to hand a model and it is not what the reader asked for: a region
// says where somebody is, not which language they read. So the region is
// dropped.
//
// The SCRIPT is the opposite and must be kept, which is the case Oliver's own
// question raises. zh-Hans is Simplified Chinese and zh-Hant is Traditional,
// and answering a Simplified reader in Traditional is answering in a script
// they may not read. Bare "zh" comes back as the ambiguous "Chinese", which is
// the right amount of detail when the browser gave no more.
//
// AND AN UNKNOWN TAG COMES BACK FORMATTED, NOT UNCHANGED. dn.of("qq-XX") is
// "qq (XX)", so testing the answer against the RAW tag said the name was real.
// Against the reduced tag, dn.of("qq") is "qq", which is the actual signal.
export const languageName = (tag) => {
  const parts = String(tag || "").trim().split("-").filter(Boolean);
  if (!parts.length) return "";
  const base = parts[0].toLowerCase();
  // A script subtag is four letters (Hans, Hant, Latn). A region is two letters
  // or three digits, and it is the one being dropped.
  const script = parts.slice(1).find(p => /^[A-Za-z]{4}$/.test(p));
  const reduced = script ? `${base}-${script[0].toUpperCase()}${script.slice(1).toLowerCase()}` : base;
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "language" });
    const named = dn.of(reduced);
    if (named && named.toLowerCase() !== reduced.toLowerCase()) return named;
    // A script Intl does not know still leaves a usable language underneath it.
    if (script) {
      const plain = dn.of(base);
      if (plain && plain.toLowerCase() !== base) return plain;
    }
  } catch { /* no Intl.DisplayNames, use the table */ }
  return FALLBACK[base] || "";
};

// null for English and for anything unrecognised, and null means "change
// nothing". A traveller whose browser is already English must not have a line
// added to every prompt telling it to answer in English, because that is a
// token cost and an instruction that can only ever be obeyed or misread.
export const readerLanguage = (nav) => {
  const source = nav || (typeof navigator !== "undefined" ? navigator : null);
  const tag = String(source?.language || "").trim();
  if (!tag) return null;
  if (tag.split("-")[0].toLowerCase() === "en") return null;
  const name = languageName(tag);
  return name ? { tag, name } : null;
};

// ── AND IT NEVER TRANSLATES A PLACE NAME ────────────────────────────
// This is the part that makes the difference between useful and dangerous. A
// German answer that says "Nordtor Station" instead of "Nørreport Station" is
// worse than an English one, because the traveller has to match that word
// against a sign, a departure board and a ticket machine, none of which will be
// translated. Same for a street, a ferry route, a festival's own name, and any
// price in DKK.
//
// The Danish clause matters for the same reason from the other side: this app
// spends most of its effort keeping Danish OUT of reader-facing fields
// (glanceExtract.js, looksUntranslated), and the one thing that must stay
// Danish is a name somebody has to read off a building.
// ── AND THE ORDER OF THESE TWO SENTENCES WAS THE BUG ────────────────
//
// 17 Aug 2026. A friend of Oliver's tested the Detour chat on a Danish phone,
// typed "More simple and in copenhagen" in English, and was answered in Danish.
// Then the app built him an English guide, because this block is attached to one
// prompt and the guide is not translated at all.
//
// Both halves of the right rule were already in here. The problem was which one
// shouted. The block opened with "ANSWER IN DANISH." in capitals and put "match
// the language THEY used" in a subordinate clause after it, so the browser
// setting won a fight it was never meant to be in.
//
// A browser tag says where a DEVICE is configured. It does not say which
// language the person holding it chose to write in, and half of Denmark's
// phones are set to Danish while their owners type to a travel site in English.
// So the typed language leads now, in capitals, and the tag is named as the hint
// it is. Nothing else in this file changed.
//
// THE TICK-BOX CASE IS THE ONE EXCEPTION, and it has to be stated or this
// overcorrects: the intake form's options are the app's own English labels, so a
// Danish traveller who has only ticked boxes has not written anything, and
// reading those labels as "they chose English" would be the same mistake in the
// other direction.

// ── AND THE INSTRUCTION ITSELF, IN THE LANGUAGE IT IS ABOUT ──────────
//
// Oliver, 23 Aug 2026, with six photographs of a Danish conversation:
// "it's being made in akward Danish... According to Gemini, you should prompt
// the Danish language in Danish. If that is possible?"
//
// It is, and it is the right instinct. Everything above tells a model to write
// Danish in English sentences, which is the same fault the block itself warns
// about one paragraph later: an instruction rendered word for word out of
// English produces something grammatical that no native speaker would write.
// An instruction ABOUT Danish, written IN English, is that fault applied to the
// instruction.
//
// ── WHAT THE PHOTOGRAPHS ACTUALLY SHOWED ────────────────────────────
//
// Not stiffness. Three faults, and the first one is not a matter of taste:
//
//   "Hvornår rejser JEG af sted, cirka?"  and  "skal JEG køre i bil"
// Gemlyx asking about its own holiday. A first person and second person
// inversion, in the two questions the whole intake depends on. Nothing in the
// English block above forbids it, because in English "I" and "you" are hard to
// confuse and the rule never needed writing down.
//
//   "det ligger lige i JERES rejseperiode"  and  "400-600 DKK PER PERSON"
// He travels alone and said so by never saying otherwise. Danish forces a
// choice between du and I that English does not, and the model guessed plural.
//
//   "weekenderne er markant mere fyldte omgivelser det ellers er der de fleste
//    ture ligger"
// Not a sentence in any language.
//
// ── ONE LANGUAGE, DELIBERATELY ──────────────────────────────────────
//
// Danish only. Not because the others do not deserve it, but because a native
// block is only worth having if somebody can read it, and Danish is the one
// language in this repo that its owner can check. Six machine-written blocks in
// languages nobody here reads is how the awkward Danish got here in the first
// place. Every other language keeps the English block above, unchanged.
const DA_COMMON = `
SKRIV DANSK SOM EN DANSKER, IKKE SOM EN OVERSÆTTELSE.
Alt det ovenstående er skrevet på engelsk, fordi koden er det. Det fortæller dig HVAD du skal skrive. Det fortæller dig ikke, hvordan det lyder på dansk. Formuler dig fra bunden på dansk.

1. TÆNK PÅ DANSK. Oversæt aldrig en engelsk vending direkte. Det hedder "det giver mening", ikke "det laver sans". Det hedder "når alt kommer til alt", ikke "i slutningen af dagen". Hvis en sætning først giver mening, når man oversætter den tilbage til engelsk, så skriv den om.

2. NATURLIG ORDSTILLING. Brug korrekt dansk syntaks, inversion efter en ledsætning, og de bindeord en dansker rent faktisk bruger. Læs sætningen højt for dig selv, inden du sender den. Snubler den, er den forkert. En sætning som "weekenderne er markant mere fyldte omgivelser det ellers er der de fleste ture ligger" må aldrig forlade dig.

3. DEN REJSENDE ER "DU". DU SELV ER "JEG". Spørg "Hvornår rejser du af sted?", aldrig "Hvornår rejser jeg af sted?". Spørg "Kører du i bil?", aldrig "Skal jeg køre i bil?". Det her er den hyppigste fejl, og den får hele svaret til at ligne noget, der er gået i stykker.

4. ÉN REJSENDE, INDTIL DU FÅR ANDET AT VIDE. Skriv "du", "din tur", "dine dage". Skift først til "I", "jer" og "jeres", når den rejsende selv har fortalt, at der er flere med. Regn heller ikke pris "per person", før du ved, hvor mange personer der er.

5. TONE. Aktivt, levende, nutidigt hverdagsdansk. Ikke kancellisprog, ikke reklamesprog, ikke oversat marketing. Skriv som et menneske, der kender stedet, og som har travlt med at være til nytte.

6. LÅNEORD. Brug kun engelske ord, hvis de er helt almindelige på dansk, som "computer" eller "weekend". Ellers det danske ord. Sæt aldrig et engelsk knapnavn midt i en dansk sætning.

7. EMOJI ER ANSIGTER, IKKE MÆRKATER. Et ansigt bærer stemningen i den sætning, det står i, og det vælges efter den: 😂 når noget er sjovt eller tørt ("så dropper vi København 😂"), 🙂 eller 😊 til varme og små gode nyheder ("det synes jeg er en god idé 🙂"), et let et på et afslappet spørgsmål ("hvornår rejser du? 🙂"). En sætning uden følelse får intet ansigt, og de fleste svar har højst ét. Et piktogram af det, du taler om, er ikke et ansigt: 🚲 ved siden af en cykel eller 🌊 ved siden af havet sætter mærkat på indholdet og får svaret til at ligne en brugerflade i stedet for et menneske. FIRE STEDER FÅR ALDRIG ET, uanset stemningen: ved siden af en pris, i en fejlbesked eller et afslag, ved siden af noget du har slået op og oplyser som tjekket (åbningstider, færgetider, om et arrangement er til salg), og nogen som helst steder inde i selve guiden.

8. STEDNAVNE OG PRISER RØRER DU IKKE. Nørreport hedder Nørreport. Priser står i DKK med tallet, som det er. Sætningen omkring navnet er dansk; navnet er ikke.`;

// The chat block gets one more rule, and it is the rule the product broke on.
// The marker is instructed in App.jsx in English and the model paraphrases it
// into Danish anyway: "Den er klar." and "Så er den bygget." are both from
// Oliver's own screenshots, and both are the paraphrase the English instruction
// names and forbids. Saying it again in Danish, inside the Danish block, at
// least puts the rule in the language the sentence is being composed in.
//
// It is a belt, not a fix. The fix is in App.jsx: the brief now grants the
// button on its own when it has everything it needs, so a translated marker
// costs nothing.
const DA_CHAT = `
9. MARKØREN ER EN KODE, IKKE EN SÆTNING. Når du er klar til at bygge planen, skriver du præcis [[GEMLYX_READY_TO_BUILD]] med firkantede parenteser, på engelsk, på sin egen linje. Skriv ALDRIG "Den er klar", "Så er den bygget", "Så er den klar" eller nogen anden dansk formulering i stedet for. En oversat markør er ingen markør, og så står den rejsende med en færdig plan og ingen knap.`;

// And the guide block gets the structural rule restated, for the same reason:
// it is the one that breaks the build rather than merely reading badly.
const DA_GUIDE = `
9. FELTNAVNENE ER ENGELSKE, UDEN UNDTAGELSE. title, essentials, budgetReality, transportTip, keepInMind, days, day, stops, name, town, arrivalTime, suggestedStay, note. De læses af kode. Oversætter du ét af dem til dansk, bliver guiden ikke venligere, den holder op med at kunne indlæses. arrivalTime er et klokkeslæt som "9:00", og dagnumre er tal.`;

// Danish only, and matched on the base tag so da-DK and bare da both hit it.
export const nativeBlock = (lang, kind = "chat") => {
  const base = String(lang?.tag || "").split("-")[0].toLowerCase();
  if (base !== "da") return "";
  return DA_COMMON + (kind === "guide" ? DA_GUIDE : DA_CHAT);
};

export const answerInLanguage = (lang) => {
  if (!lang?.name) return "";
  return `MATCH THE TRAVELLER'S OWN LANGUAGE. Read their most recent message and reply in the language THEY wrote it in. That rule outranks everything else in this block.
Their browser is set to ${lang.tag}, which suggests ${lang.name}. Treat that as a hint for a first reply and nothing more: it says where a device is configured, not which language the person chose to write in. If they write in English, reply in English. If they switch language halfway through, switch with them. Only when the sole thing they have sent is a form of ticked options, with no sentence of their own anywhere, does the hint decide, and then reply in ${lang.name}.
NEVER TRANSLATE A NAME. Place names, town names, station and stop names, street names, ferry routes and the names of festivals and venues stay exactly as they are written in Danish or English, because the traveller has to match them against a sign, a departure board or a ticket machine that will not be translated. Prices stay in DKK with the figure unchanged. Write the sentence around the name in ${lang.name}; leave the name alone.
WRITE ${lang.name.toUpperCase()}, DO NOT TRANSLATE ENGLISH. Everything else you have been given, the questions to ask, the phrases to prefer, the phrases that are banned, the examples of good and bad openings, is written in English because that is the language these instructions happen to be in. It tells you WHAT to say. It does not tell you HOW TO WORD IT in ${lang.name}, and rendering it word for word produces sentences that are grammatical and that no native speaker would ever say. Ask the question a ${lang.name} speaker would ask, from scratch, in their own idiom.
The banned filler is banned in every language, not only in English. Do not reach for the ${lang.name} equivalent of "Great!", "Certainly!" or "I'd be happy to help" and consider the rule satisfied because the English words are absent. The same goes for the phrases held up as good ones: they are examples of a REGISTER, warm and direct and unfussy, not a phrasebook to translate from.
And hedging words do not survive translation. An English "roughly", "a bit", "sort of" softens a question; the literal equivalent in another language often reads as clumsy or as an abbreviation nobody uses. If softening the question does not work naturally in ${lang.name}, ask it plainly instead.
${nativeBlock(lang, "chat")}`;
};

// One call, for a prompt builder that has a language and wants the block or
// nothing. Keeps every call site from repeating the same empty check.
export const languageBlock = (nav) => answerInLanguage(readerLanguage(nav));

// ── AND THE GUIDE ITSELF, WHICH WAS NEVER TRANSLATED AT ALL ─────────
//
// Oliver, 22 Aug 2026: "just get the language working for now."
//
// This file has carried the admission since 17 August, in its own words: "the
// app built him an English guide, because this block is attached to one prompt
// and the guide is not translated at all." Traced on 22 August, the whole repo
// had exactly TWO call sites, the Detour chat and Ask Gemlyx. The guide build,
// the enrichment pass that writes the legs and the accommodation sentence, the
// rewrite passes and the saved-guide assistant had nothing at all. So a Danish
// traveller had a Danish conversation and was handed an English document.
//
// THREE OF THOSE FOUR WERE FIXED THAT DAY. The rewrite passes were not, and
// this paragraph read for three days as though they had been, because it lists
// what was broken and then stops. Corrected 25 August, when they got
// keepLanguageOf at the bottom of this file: a rewrite is the one case where
// the browser tag is the wrong instrument, and the reasoning is down there.
//
// ── WHY THIS IS A SEPARATE BLOCK AND NOT answerInLanguage ───────────
//
// The chat block is written for a REPLY: "read their most recent message and
// reply in the language THEY wrote it in". A guide is not a reply. There is no
// most recent message at the moment it is written, there is a whole conversation
// behind it, and the output is a JSON document rather than a sentence.
//
// That last part is the one that would break something rather than merely read
// badly. The guide is parsed by code: `days`, `stops`, `arrivalTime`,
// `suggestedStay`, `essentials`, `budgetReality`. A model told in capitals to
// write in Danish will cheerfully return "dage" and "stop", and the parse then
// finds no days and the build fails with "empty". Structure and prose have to be
// separated in the instruction, loudly, or this makes the product worse in a new
// language rather than better.
export const writeInLanguage = (lang) => {
  if (!lang?.name) return "";
  return `
LANGUAGE OF THIS GUIDE. Write every piece of PROSE in the language the traveller used in the conversation below. That is the rule, and it outranks everything else in this paragraph. Their browser is set to ${lang.tag}, which suggests ${lang.name}: treat that as a hint and nothing more, because it says where a device is configured and not which language the person chose to type in. If they wrote to you in English, the guide is in English. If the only thing they ever sent was a form of ticked options with no sentence of their own, use ${lang.name}.
THE JSON KEYS AND THE STRUCTURE STAY IN ENGLISH, ALWAYS, WITHOUT EXCEPTION. Every field name in the shape above is read by code: title, essentials, budgetReality, transportTip, keepInMind, days, day, title, stops, name, town, arrivalTime, suggestedStay, note. Translating one of them does not make the guide friendlier, it makes the guide fail to load. The same goes for the format of a value the code parses rather than displays: arrivalTime stays as a clock time like "9:00", and the day numbers stay as numbers.
NEVER TRANSLATE A NAME. Place names, town names, station and stop names, street names, ferry routes, and the names of festivals, museums and venues stay exactly as they are written in Danish or English, because the traveller has to match them against a road sign, a departure board or a ticket machine that will not be translated. "Nørreport Station" is never "Nordtor Station". The "town" field in particular is used to look the place up, so it must stay in its real spelling whatever language the note around it is in.
PRICES STAY IN DKK with the figure unchanged. Write the sentence around the number in ${lang.name}; do not convert the number.
WRITE ${lang.name.toUpperCase()}, DO NOT TRANSLATE ENGLISH. Everything you have been given above is written in English because that is the language these instructions happen to be in. It says WHAT to write, not how to word it. A sentence rendered word for word out of English is grammatical and reads like nothing a native speaker would ever write. Compose in ${lang.name} from scratch, in the register a well-travelled friend from that country would use.
The banned filler above is banned in every language, not only in English. "Charming", "vibrant", "nestled" and the rest have direct equivalents in ${lang.name} and reaching for those is the same fault, not a way around the rule.
${nativeBlock(lang, "guide")}`;
};

// Same convenience wrapper, for the guide side.
export const guideLanguageBlock = (nav) => writeInLanguage(readerLanguage(nav));

// ── A REWRITE MAY NOT CHANGE THE LANGUAGE IT WAS HANDED ─────────────
//
// 25 Aug 2026, found while surveying for the multilingual assessment. THREE
// passes rewrite guide prose AFTER the guide has already been written in the
// traveller's language, and not one of them said a word about language:
//
//   App.jsx  the AI-tell rewrite, field by field
//   App.jsx  the fact-check fix, field by field
//   App.jsx  the retitle, when titlePromises finds a false claim
//
// So a German guide could come back from any of them with one field, or its
// headline, in English. A document that changes language halfway down is worse
// than one written plainly in one language, and the reader cannot tell whether
// the English part is a mistake or the important part.
//
// This file has carried the admission since 22 August in its own words, that
// the pass that day covered "the guide build, the enrichment pass, the rewrite
// passes and the saved-guide assistant". The build, the enrichment and the
// assistant did get blocks. The rewrite passes did not, and the comment saying
// otherwise is corrected below.
//
// ── AND writeInLanguage IS THE WRONG INSTRUMENT HERE, TWICE ─────────
//
// The obvious repair is to append the block that already exists. It is wrong in
// BOTH directions, which is why this is a new thing rather than another caller:
//
//   BROWSER ENGLISH, TRAVELLER WROTE GERMAN. The guide is German. readerLanguage
//   returns null for English, so no block is added at all, and the rewrite is
//   free to drift back to English. The bug survives its own fix.
//
//   BROWSER GERMAN, TRAVELLER WROTE ENGLISH. The guide is English and correct.
//   The block is added, in capitals, naming German, and the rewrite FLIPS A
//   CORRECT ENGLISH FIELD INTO GERMAN. The fix is worse than the defect.
//
// Both failures have the same root: the browser tag says where a device is
// configured, and a rewrite is not asking that question. A rewrite is holding
// the answer already. The text is right there.
//
// So this NAMES NO LANGUAGE, reads no navigator, and is unconditional. It costs
// one sentence on every guide build including the English ones, which is the
// price of an instruction that cannot be got wrong by a setting nobody chose.
export const keepLanguageOf = (what = "the text you have been given") =>
  `WRITE YOUR ANSWER IN THE SAME LANGUAGE AS ${String(what).toUpperCase()}. Do not translate it, in either direction: Danish in, Danish out; German in, German out; English in, English out. This text is one field of a document whose other fields you cannot see, and they are all in that language, so a field that comes back in another one makes the document change language halfway down. Place names, station names, street names and prices stay exactly as they are written, whatever language the sentence around them is in.`;
