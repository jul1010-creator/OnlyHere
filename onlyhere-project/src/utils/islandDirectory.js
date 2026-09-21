// ── WHAT THE ISLAND ITSELF LISTS ────────────────────────────────────
//
// Oliver, 19 Sep 2026, after I read Avernakø's homepage and announced that the
// site named no businesses:
//
//   "it did.. but okeye.."
//
// It did. avernak.dk/visit is a curated local directory, and I had made a claim
// about a site from one page of it, which is the exact failure this repository
// keeps catching in its own pipeline.
//
// WHAT IS ON THAT PAGE, in the island's own words: Ø-færgen, then Spisning with
// six places, then Overnatning with four, then Småbutikker. A sentence each,
// written by somebody who lives there.
//
// So this is not a hotel recommendation. It is the island stating its whole
// inventory, in the categories this app already thinks in, and Gemlyx holds a
// page for none of the six places to eat.
//
// ── THE PATH DOES NOT HOLD. THE DANISH WORD DOES. ───────────────────
//
// Checked before writing this, because of the mistake above. Avernakø keeps it
// at /visit. Sejerø keeps accommodation at /oplev-sejeroe/overnatning/ and
// dining under "Handels- og spisesteder". Every one of these sites was built by
// a different volunteer and no two agree on a URL.
//
// What they do agree on is the WORD, because it is the word for the thing:
// somewhere to sleep is Overnatning on every Danish site there has ever been.
// So the reader follows the heading and never the path, which is the same
// principle calendarFeed follows when it reads a page's markup rather than
// guessing from its domain.
import { fold } from "./danishNames";
// For the one link an island puts on somebody else's host on purpose. See the
// note on the ferry door in directoryLinks.
import { isOperatorSite } from "./ferryDoor";

// ── THE SECTIONS, AND WHAT EACH ONE IS ABOUT ────────────────────────
//
// Folded, so a heading in capitals is the same heading and the Danish letters
// stop mattering. WHICH IS THE PART THAT HAD TO BE CHECKED RATHER THAN
// ASSUMED: fold maps æ to ae and å to aa, not to a, so Småbutikker folds to
// smaabutikker and Ø-færgen to o-faergen. The first draft of this list was
// written the other way and matched neither of the two headings this feature
// exists to find.
//
// The English is here because a handful of these islands publish a visitor
// page in both, and a site that says Accommodation means Overnatning.
//
// SUBSTRING, NEVER A WORD BOUNDARY, for the reason eventAccess.js records
// about Børneteater: Danish glues its words together, so butik has to reach
// Småbutikker and faerge has to reach Ø-færgen. That rules out any word short
// enough to live inside an unrelated one, which is why bare "mad" is not on
// the eat list: it sits inside made, nomad and Madrid.
//
// THE ORDER IS THE TIE BREAK AND IT IS DELIBERATE. Sejerø files its cafés and
// its shop under one heading, "Handels- og spisesteder", which matches both
// eat and shop. Eat is first, so that heading reads as dining, which is what
// the page is mostly listing.
export const SECTIONS = [
  // ── THE PAGE ITSELF, WHICH IS NOT A SECTION OF ONE ──────────────
  //
  // Added 19 Sep 2026 after running this reader against avernak.dk's real
  // markup rather than against a fixture of my own. Its whole directory is one
  // page, /visit, and the only link to it anywhere on the site says "Besøg
  // Avernakø". That matched `see`, on "besog", and the wiring follows only
  // stay and eat links, so pasting avernak.dk came back with nothing at all:
  // the front page has no businesses on it and the one page that does was
  // classified as a thing to look at.
  //
  // FIRST, because it outranks every other word on a link. A page called Besøg
  // is the visitor page, and the sections are inside it.
  //
  // IT IS NOT A ROW KIND. DIRECTORY_PROMPT lists stay|eat|shop|ferry|see and
  // never offers this one, because nothing IS a visit: it is where the other
  // five are written down.
  { kind: "visit", words: ["besog", "visit", "turist", "for gaester", "plan your"] },
  { kind: "stay", words: ["overnatning", "overnatte", "sovested", "accommodation", "where to stay", "bed & breakfast", "bed and breakfast"] },
  { kind: "eat", words: ["spisning", "spise", "restaurant", "cafe", "kro", "mad og drikke", "eating", "where to eat", "food"] },
  { kind: "shop", words: ["butik", "kobmand", "handel", "shopping"] },
  { kind: "ferry", words: ["faerge", "sejlplan", "transport", "saadan kommer du", "getting here", "ferry"] },
  { kind: "see", words: ["oplev", "besog", "sevaerdigheder", "what to see", "things to do"] },
];

// The kind a heading or a link belongs to, or empty. First match in SECTIONS
// order wins, which is the tie break the comment above describes.
export const kindOf = (text) => {
  const t = fold(String(text || "")).replace(/\s+/g, " ").trim();
  if (!t) return "";
  for (const s of SECTIONS) if (s.words.some(w => t.includes(w))) return s.kind;
  return "";
};

// ── FINDING THE PAGE THAT HOLDS IT ──────────────────────────────────
//
// An island's front page is a photograph and a paragraph about the light. The
// directory is one click in, behind a link whose own text says what it is. Read
// off the raw HTML rather than a DOM, because this runs under the suite with no
// browser, same as the calendar readers.
//
// BOTH THE TEXT AND THE HREF are checked, because Avernakø's link says "Besøg
// Avernakø" and points at /visit, so the word is in the text; Sejerø's points
// at /oplev-sejeroe/overnatning/, so the word is in the path.
const ANCHOR = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const TAGS = /<[^>]+>/g;

// Read off raw markup, so the entities are still entities. Sejerø's own menu
// says "Handels- &amp; spisesteder", and a link text carrying that would be
// shown to him with the markup still in it. Only the five that matter: this is
// a label, not a document, and a full decoder here would be a parser nobody
// asked for.
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };
const decode = (v) => String(v || "").replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, k) => ENTITIES[k]);

// ── AND THE PART OF AN ADDRESS THAT IS ALLOWED TO SPEAK ─────────────
//
// 20 Sep 2026. Found by running this against oroe.dk rather than against a
// fixture, which is the second time a real island has taught this file
// something no fixture of mine would have.
//
// Orø files its beds and its restaurants under one parent, /spise-sove/, and
// hangs the shelters off it at:
//
//   /spise-sove/shelterpladser-paa-oroe/
//
// Matching the whole address put that page under EAT, because the parent
// segment says spise. A shelter is somewhere to sleep, and the page was going
// to be handed to the model as a list of restaurants.
//
// So only the LAST segment speaks, plus any query, because a handful of these
// sites still hang the word off index.php?page=overnatning. A parent segment
// describes the section a page lives under and not the page.
//
// WHAT THIS GIVES UP, said plainly: a link like /overnatning/havblik/ now
// reads as nothing rather than as a bed. That is the right way round. A page
// about one guesthouse is not the island's bed list, and this reader is
// looking for the list. Filing the wrong page under a heading sends the model
// to read shelters as dinner; dropping it loses one lead.
export const pathWord = (url) => {
  let tail = String(url || "");
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    tail = (parts.length ? parts[parts.length - 1] : "") + (u.search || "");
  } catch { /* a relative href before resolution, read as written */ }
  return tail;
};

export const directoryLinks = (html, baseUrl = "") => {
  const out = [];
  const at = new Map();
  let m;
  ANCHOR.lastIndex = 0;
  while ((m = ANCHOR.exec(String(html || ""))) !== null) {
    const href = String(m[1] || "").trim();
    const text = decode(String(m[2] || "").replace(TAGS, " ")).replace(/\s+/g, " ").trim();
    if (!href || /^(?:#|mailto:|tel:|javascript:)/i.test(href)) continue;
    let url = href;
    try { url = new URL(href, baseUrl || undefined).toString(); } catch { continue; }
    const kind = kindOf(text) || kindOf(pathWord(url));
    if (!kind) continue;
    // Its own site only. A link to visitdenmark under a heading called Oplev is
    // a tourist board's page about the island rather than the island's own, and
    // the whole authority of this source is that it IS the island's own.
    //
    // ── EXCEPT THE ONE DOOR THAT IS OFF-HOST BY NATURE ──────────
    //
    // Oliver, 20 Sep 2026: "sejerø færgen has to be gone through when sejerø
    // is put on the guide." Sejerø's own site carries that door, and this rule
    // was throwing it away: the booking runs on
    //
    //   https://sejeroe-ferry.teambooking.dk/new-booking
    //
    // which is a different host, so the island's own ferry booking was being
    // discarded as if it were a tourist board. Almost none of these operators
    // run their booking on the island's domain.
    //
    // NARROWED TO THE FERRY, AND STILL TESTED. isOperatorSite is the same
    // predicate ferryDoor already uses on this exact question, so an
    // aggregator, a destination company or a Facebook page is refused here for
    // the same reasons and by the same code rather than by a second list.
    if (baseUrl) {
      let sameHost = false;
      try { sameHost = new URL(url).hostname === new URL(baseUrl).hostname; } catch { continue; }
      if (!sameHost && !(kind === "ferry" && isOperatorSite(url))) continue;
    }
    // ── AND THE LABELLED ANCHOR BEATS THE PICTURE OF IT ─────────
    //
    // Every one of these sites emits each menu item twice, once wrapped round
    // an icon with no text and once with the words. sejero.dk emits the icon
    // FIRST, so keeping whichever came first threw away the label on every
    // section link on the island and left the founder reading a row with no
    // name on it. Worse, a row with no text falls back to the address, and on
    // a site like Orø the address is the thing that misreads.
    const had = at.get(url);
    if (had !== undefined) {
      if (text && !out[had].text) { out[had].text = text; out[had].kind = kind; }
      continue;
    }
    at.set(url, out.length);
    out.push({ url, text, kind });
  }
  return out;
};

// ── THE ISLAND'S OWN WAY ONTO THE BOAT ──────────────────────────────
//
// The one ferry link that is NOT on the island's own host, which is the shape
// a booking system takes. The island's own /transport page is a page about the
// crossing; this is the thing that sells a ticket, and it is the field
// ferryDoor asks for by hand on eleven of the fifteen.
//
// Reported rather than followed. There are no businesses on a booking form, so
// spending one of the four page reads on it would buy nothing.
export const ferryDoorIn = (links = [], baseUrl = "") => {
  let host = "";
  try { host = new URL(baseUrl).hostname; } catch { /* no base, every ferry link counts */ }
  for (const l of Array.isArray(links) ? links : []) {
    if (l?.kind !== "ferry" || !isOperatorSite(l?.url)) continue;
    let h = "";
    try { h = new URL(l.url).hostname; } catch { continue; }
    if (host && h === host) continue;
    return { url: l.url, text: String(l.text || "").replace(/\s+/g, " ").trim() };
  }
  return { url: "", text: "" };
};

// ── AND THE EXTRACTION ──────────────────────────────────────────────
//
// A model reads the page, because these are handwritten pages with no markup
// worth the name: a bold run for the business and a sentence after it, in
// whatever shape the volunteer who built the site felt like. There is nothing
// structured to parse.
//
// IT MAY READ AND IT MAY NOT DECIDE. Every rule below exists because the value
// of this source is that it is the island's own words, and a model improving
// them throws that away.
export const DIRECTORY_PROMPT = (place, text) =>
  `This is a page from the island of ${place}'s own website, listing what is on the island. Pull out every named business or place it mentions.\n\n`
  + `Respond with ONLY strict JSON: {"rows":[{"name":"the business as written","kind":"stay|eat|shop|ferry|see","said":"the sentence the page writes about it, word for word in Danish"}]}\n\n`
  + `KIND IS WHAT THE PAGE PUT IT UNDER, not what you think it is. A place listed under both Spisning and Overnatning is two rows.\n`
  + `"said" IS THE PAGE'S OWN SENTENCE, COPIED. Do not translate it, do not tidy it, do not shorten it and do not write a better one. The whole worth of this source is that somebody who lives there wrote it, and a rewritten sentence is worth nothing at all.\n`
  + `NEVER INVENT A BUSINESS AND NEVER INVENT A SENTENCE. A name with nothing written about it comes back with "said" empty. A page listing nothing comes back with an empty array, which is a normal answer.\n`
  + `Leave out the island's own institutions: the council, the church, the school, the residents' association, the ferry company's timetable page. A business somebody can walk into is what this is for.\n\n${text}`;

const clean = (v) => String(v || "").replace(/\s+/g, " ").trim();
// The kinds a ROW may carry, which is every section except the one that only
// finds a page. See the note on "visit" in SECTIONS.
export const ROW_KINDS = SECTIONS.map(s => s.kind).filter(k => k !== "visit");
const KINDS = new Set(ROW_KINDS);

export const rowsFromDirectory = (json, { place = "", source = "" } = {}) => {
  const list = Array.isArray(json?.rows) ? json.rows : [];
  const out = [];
  const seen = new Set();
  let dropped = 0;
  for (const r of list) {
    const name = clean(r?.name);
    const kind = clean(r?.kind).toLowerCase();
    if (!name || !KINDS.has(kind)) { dropped += 1; continue; }
    const key = `${fold(name)}|${kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      kind,
      // The island's own sentence, kept as it was written. Never shown to a
      // reader without saying whose words they are. See ISLAND_SAYS.
      said: clean(r?.said).slice(0, 400),
      place: clean(place),
      source: clean(source),
      fetchedAt: new Date().toISOString(),
    });
  }
  return { rows: out, dropped };
};

// What came back, before he adds any of it.
export const directoryProblems = ({ place = "", rows = [], dropped = 0 } = {}) => {
  const out = [];
  if (!clean(place)) return ["No island given, so there is nothing to file these under."];
  if (!rows.length) out.push("Nothing named came back from that page.");
  if (dropped) out.push(`${dropped} ${dropped === 1 ? "row was" : "rows were"} left out for having no name or no section.`);
  const noWords = rows.filter(r => !r.said).map(r => r.name);
  if (noWords.length) {
    out.push(noWords.length === 1
      ? `One is named with nothing written about it: ${noWords[0]}. That one is a lead rather than a quote.`
      : `${noWords.length} are named with nothing written about them: ${noWords.slice(0, 4).join(", ")}. Those are leads rather than quotes.`);
  }
  return out;
};

// ── AND WHAT THE GUIDE MAY DO WITH THE BEDS ─────────────────────────
//
// This is the half Oliver asked about first: "Do you think that should be taken
// into consideration when booking hotels on other islands? Recommending the
// places that the islands themselves recommend?"
//
// Yes, ATTRIBUTED. "Avernakø's own visitor page says" is honest about where it
// came from and is a stronger line than anything a model would write, because
// it is the island speaking. "Gemlyx recommends" would be this app borrowing
// somebody else's authority and dropping the one fact that makes it worth
// having.
//
// AND IT DOES NOT CLOSE THE DOOR BESIDE IT. The Booking link stays, under the
// standing rule that it survives every rebuild, and the two answer different
// questions rather than competing: the island's page says who is here, and the
// booking site says what is free on the nights in question, with a cancellation
// policy and a card charged once. A traveller wants both. So this is a line
// ABOVE that button rather than a replacement for it.
export const staysIn = (rows) => (Array.isArray(rows) ? rows : []).filter(r => r?.kind === "stay" && r?.name);
export const eatsIn = (rows) => (Array.isArray(rows) ? rows : []).filter(r => r?.kind === "eat" && r?.name);

const nameLine = (r) => `  ${r.name}${r.said ? `: "${r.said}"` : " (listed with nothing written about it)"}`;

// ── AND THE PLACES TO EAT COME WITH IT ──────────────────────────────
//
// Not scope creep: it is the same page, the same six names and the same
// sentence each, and Gemlyx holds an entry for none of them. A guide standing
// on Avernakø at seven in the evening has nothing to say about dinner unless
// this block says it, and the island's own page is the only list there is.
//
// Held to exactly the same rule as the beds, which is the rule that makes this
// source worth reading at all: the island is speaking, so the guide says so.
export const islandSaysBlock = (place, rows) => {
  const where = clean(place);
  const stays = staysIn(rows);
  const eats = eatsIn(rows);
  if (!where || (!stays.length && !eats.length)) return "";
  const parts = [`── WHAT ${where.toUpperCase()} ITSELF LISTS ──`,
    `Copied from the island's own visitor page, in its own words. THESE ARE THE ISLAND'S WORDS AND NOT GEMLYX'S, and every line below depends on saying so.`];
  if (stays.length) {
    parts.push(`Somewhere to sleep:\n${stays.map(nameLine).join("\n")}`);
    parts.push(`USE THESE FOR THE WHERE TO STAY LINE ON A DAY THAT SLEEPS ON ${where.toUpperCase()}, and name whose list it is: "${where}'s own visitor page points visitors at ..." or the same in the traveller's language. Do not claim it is the only one unless the list has one entry, and then say that is what the island lists rather than what exists.`);
  }
  if (eats.length) {
    parts.push(`Somewhere to eat:\n${eats.map(nameLine).join("\n")}`);
    parts.push(`USE THESE WHEN A DAY EATS ON ${where.toUpperCase()}, attributed the same way. A small island has few of these and they keep short seasons, so say the island lists it rather than that it is open.`);
  }
  parts.push(`Never write any of it as Gemlyx's own recommendation, because it is not one and the attribution is the part worth having. Do not translate a name, do not price anything, do not promise a room or a table, and do not add a place that is not on the list above.`);
  return parts.join("\n");
};

// The sentence a card can print, which is the same claim in one line.
export const ISLAND_SAYS = (place) => `${clean(place)}'s own visitor page lists this one.`;
