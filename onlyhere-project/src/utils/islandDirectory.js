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

export const directoryLinks = (html, baseUrl = "") => {
  const out = [];
  const seen = new Set();
  let m;
  ANCHOR.lastIndex = 0;
  while ((m = ANCHOR.exec(String(html || ""))) !== null) {
    const href = String(m[1] || "").trim();
    const text = String(m[2] || "").replace(TAGS, " ").replace(/\s+/g, " ").trim();
    if (!href || /^(?:#|mailto:|tel:|javascript:)/i.test(href)) continue;
    const kind = kindOf(text) || kindOf(href);
    if (!kind) continue;
    let url = href;
    try { url = new URL(href, baseUrl || undefined).toString(); } catch { continue; }
    // Its own site only. A link to visitdenmark under a heading called Oplev is
    // a tourist board's page about the island rather than the island's own, and
    // the whole authority of this source is that it IS the island's own.
    if (baseUrl) {
      try { if (new URL(url).hostname !== new URL(baseUrl).hostname) continue; } catch { continue; }
    }
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, text, kind });
  }
  return out;
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
const KINDS = new Set(SECTIONS.map(s => s.kind));

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
