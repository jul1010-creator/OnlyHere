// ── SOURCES YOU ADD, WITHOUT ASKING ANYONE TO EDIT CODE ─────────────
//
// Oliver, 8 Aug 2026: "I'd like to be able to write in sources that I demand
// Perplexity/Tavily research through. So I don't need to write directly to you
// all the time about sources that they have to include in their research.
// Perhaps it should be able to be applied universally for every research."
//
// The machinery already existed and was welded shut. `RESEARCH_SOURCE_RULES` in
// App.jsx has been appended to every research prompt for weeks, telling the
// models to check Wikipedia and the venue's own site, and how to break a tie
// between them. It is exactly the right shape and it is a hardcoded string, so
// changing it meant a commit, which meant asking me. This makes the same thing
// editable and stored, and leaves the hardcoded rules underneath as the floor.
//
// ── "I'M NOT SAYING ONLY.. I'M SAYING INCLUDE" ──────────────────────
// Oliver, correcting me the moment I described this as a restriction, and he is
// right. This is a list of pages he has found and vouched for, growing as he
// finds more: "so if I find new tourism pages, I'll use that." The instruction
// is ADD THESE, not USE ONLY THESE.
//
// The distinction is not pedantry, it decides whether the feature helps. Point a
// search model at four domains and a small Danish village with no page on any of
// them comes back empty, when an unrestricted search would have found the parish
// council's PDF. An empty research pass is not a safer answer than a sourced
// one, it is just a worse one.
//
// So: include them every time, prefer them over an anonymous aggregator when
// they disagree, and keep searching everything else exactly as before.
//
// ── AND IT MAY NOT OVERRIDE THE VENUE ON THE VENUE ──────────────────
// The standing rule already says the official site wins on anything current: a
// price, an opening hour, a ferry departure. A founder list that quietly
// outranked that would let a tourist board's stale page beat the operator's own
// timetable, which is the single error class this project has spent the most
// time on. The block below says so out loud, every time.

import { samePlaceName, otherNameFor } from "./danishNames";

const clean = (v) => String(v == null ? "" : v).trim();

// Accepts whatever gets pasted: a full URL, a bare host, a host with www, a
// trailing slash. Returns the bare host, or "" when it is not a domain at all.
// Deliberately strict about the shape, because a typo here is a rule the models
// will dutifully try to honour on every draft forever.
export const normaliseDomain = (input) => {
  let s = clean(input).toLowerCase();
  if (!s) return "";
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");   // protocol
  s = s.split(/[/?#]/)[0];                        // path, query, fragment
  s = s.replace(/^www\./, "").replace(/\.+$/, "");
  s = s.split("@").pop();                          // somebody pasting an email
  if (s.includes(" ") || s.length < 4 || s.length > 100) return "";
  // A real host: at least one dot, sane characters, and a TLD of letters.
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/.test(s)) return "";
  return s;
};

// A note is what the source is FOR, and it is not decoration: "the operator's
// own timetable" tells the model when to reach for it, which is most of the
// value. Capped because it lands in every prompt.
export const cleanNote = (v) => clean(v).replace(/\s+/g, " ").slice(0, 160);

// "" means every content type. Anything else must be a type the Studio actually
// drafts, or the rule is dead and nobody can tell.
export const CONTENT_TYPES = ["town", "festival", "free", "food", "foodStreet", "night", "nightTown", "booking"];
export const TYPE_LABEL = {
  "": "Everything", town: "Towns", festival: "Events", free: "Attractions", food: "Food",
  foodStreet: "Food streets", night: "Nightlife", nightTown: "Nightlife towns", booking: "Workshops",
};

// ── "VISITCOPENHAGEN IS A GOOD SOURCE BUT PROBABLY NOT FOR AARHUS" ──
// Oliver, 8 Aug 2026, and the content-type axis alone does not answer it:
// VisitCopenhagen is a town source, and it is a town source for exactly one
// town. Sending it along on an Aarhus draft costs money on every one of the
// seven research prompts, and it costs more than money. A model told to check
// visitcopenhagen.com for Aarhus will find a Copenhagen page that mentions
// Aarhus and treat it as an authority on it, which is the same failure as the
// ferry route "corrected" with a different route's sailing time.
//
// So a source carries a PLACE as well as a type, and the field takes either
// granularity, because both are genuinely useful:
//   "Copenhagen"  a town, matched against the entry's own name, its parent, and
//                 the base it is a day trip from
//   "Jutland"     a part of the country, matched against the derived geography
//   ""            everywhere, which is what a national tourist board is
//
// AND AN UNKNOWN PLACE EXCLUDES IT, deliberately. When nothing tells us where a
// draft is, a place-scoped source is left out rather than included: leaving it
// out costs one source that might have helped, and the search still runs
// everywhere else, while including it costs money on every call and invites the
// wrong-city answer this exists to prevent.
export const PARTS_OF_COUNTRY = ["Jutland", "Funen", "Zealand", "Lolland-Falster", "Bornholm"];

// Canonicalises a part of the country to the spelling the rest of the app uses,
// across languages: typing "Jylland" stores "Jutland", so it lands in the
// PARTS_OF_COUNTRY branch of placeMatches instead of being treated as a town
// nobody has an entry for. A town name is stored exactly as typed, because it is
// shown back to him in the panel and matched across variants anyway.
export const cleanPlace = (v) => {
  const t = clean(v);
  if (!t) return "";
  const part = PARTS_OF_COUNTRY.find(p => samePlaceName(p, t));
  return part || t;
};

// ── "I TYPE COPENHAGEN, BUT IN DANISH IT IS KØBENHAVN" ──────────────
// Oliver, 8 Aug 2026. Straight string equality made the scoping quietly wrong in
// the one case he was most likely to hit: he types the scope in English because
// that is how the entry is filed, and any Danish source, entry, or parent name
// carrying the Danish spelling then failed to match. A source scoped to
// Copenhagen would have been LEFT OUT of a København draft, silently, which
// looks exactly like the scoping working. Both directions now match, along with
// Jutland/Jylland, Funen/Fyn, Aarhus/Århus and the rest.
const same = (a, b) => samePlaceName(a, b);

// ctx is whatever is known where the prompt is being built. At draft time that
// is usually just a name, which is enough for the case he raised.
export const placeMatches = (place, ctx) => {
  const want = cleanPlace(place);
  if (!want) return true;                       // universal
  if (!ctx) return false;                       // nothing to match on: leave it out
  const c = typeof ctx === "string" ? { name: ctx } : ctx;
  if (PARTS_OF_COUNTRY.includes(want)) return same(c.part, want);
  // A town source applies to that town, to anywhere inside it, and to anywhere
  // that uses it as a base: a Dragør entry with dayTripFrom Copenhagen is a
  // Copenhagen trip, and VisitCopenhagen is the right place to look.
  return same(c.name, want) || same(c.town, want) || same(c.partOf, want) || same(c.dayTripFrom, want);
};

export const cleanSource = (row) => {
  const domain = normaliseDomain(row?.domain);
  if (!domain) return null;
  const appliesTo = clean(row?.applies_to ?? row?.appliesTo);
  return {
    id: row?.id,
    domain,
    note: cleanNote(row?.note),
    appliesTo: CONTENT_TYPES.includes(appliesTo) ? appliesTo : "",
    appliesPlace: cleanPlace(row?.applies_place ?? row?.appliesPlace),
    enabled: row?.enabled !== false,
  };
};

// The ones that apply to this draft: everything universal, plus anything scoped
// to this type. A ferry operator matters for a town on an island and is noise on
// a cocktail bar, which is why the per-type half exists.
export const sourcesFor = (rows, type, ctx) => {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(rows) ? rows : []) {
    const s = cleanSource(raw);
    if (!s || !s.enabled) continue;
    if (s.appliesTo && s.appliesTo !== type) continue;
    if (!placeMatches(s.appliesPlace, ctx)) continue;
    // BY DOMAIN, and only after filtering. Keying on the scope as well let the
    // same site be listed TWICE in one prompt: visitfyn.dk scoped to Odense and
    // the same domain scoped to Funen both match an Odense draft, and paying to
    // tell a model about one site twice is the waste this scoping exists to
    // remove. Whichever row comes first wins, and since they name the same
    // domain the only thing that differs is the scope note beside it.
    const key = s.domain;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  // Universal first, then the type-specific ones, so the general policy reads
  // before the exception to it.
  return out.sort((a, b) => (a.appliesTo === b.appliesTo ? a.domain.localeCompare(b.domain) : a.appliesTo ? 1 : -1));
};

// Returns "" when there is nothing to say. An empty heading in every prompt
// teaches the model that this section is usually noise.
export const sourceRulesBlock = (rows, type, ctx) => {
  const list = sourcesFor(rows, type, ctx);
  if (!list.length) return "";
  const scope = (s) => {
    const bits = [s.appliesTo ? TYPE_LABEL[s.appliesTo] || s.appliesTo : "", s.appliesPlace].filter(Boolean);
    return bits.length ? ` (for ${bits.join(" in ")} specifically)` : "";
  };
  const lines = list.map(s => `- ${s.domain}${s.note ? ` — ${s.note}` : ""}${scope(s)}`);
  return `\nSOURCES THE FOUNDER HAS FOUND AND WANTS INCLUDED, in this research and every other:
${lines.join("\n")}

INCLUDE these in your search every time, in addition to everything you would normally look at. They are pages he has read and vouches for, so they are worth reading rather than worth obeying.

THIS IS AN ADDITION, NOT A RESTRICTION. Search everything else exactly as you normally would. If one of them has nothing about this place, that is ordinary and expected: keep looking elsewhere rather than reporting that nothing was found. A small village with no page on any of these still has real facts somewhere, and finding them is still the job.

WHERE SOURCES DISAGREE, one of these outranks an anonymous aggregator or a content farm, because somebody has actually looked at it.

BUT THEY DO NOT OUTRANK A VENUE ON ITS OWN DETAILS. For anything current, a price, an opening hour, a departure time, the venue's or operator's own website is still the authority, exactly as stated above. A tourist board page beating an operator's own timetable is the specific error this rule exists to prevent.`;
};

// ── BEING NAMED IN A PROMPT IS NOT BEING SEARCHED ───────────────────
// Oliver, 8 Aug 2026, reading a finished Copenhagen draft's source list, which
// held eight URLs and not one of his: "you're 100% sure that it includes the
// sources I put in? I put in visitDenmark.dk and visitcopenhagen.dk".
//
// He was right and the block above was only half the feature. sourceRulesBlock
// reaches the PROMPTS, so Perplexity and Gemini were told to include his
// domains. Tavily, which is the half of the pipeline that actually fetches
// pages, builds its queries from a fixed template and never saw the list. The
// draft's __sources records what Tavily returned, so it was an accurate report
// that the sources had not been opened.
//
// This turns each vouched domain into a real search, restricted to that domain.
// /api/search has accepted include_domains this whole time and nothing used it.
//
// CAPPED, because the cost is per draft and it is his money: the list is meant
// to grow as he finds pages, and an uncapped version quietly turns a twelve-site
// list into twelve extra searches on every draft. The first few are the ones the
// ordering in sourcesFor already puts first.
export const MAX_DIRECT_SEARCHES = 4;

// Both languages in one query, because a Danish tourist board files the capital
// under København and an English-only query cannot reach that page. Most Danish
// towns are spelled the same either way and cost nothing extra for this.
const QUERY_WORDS = {
  town: "praktisk information seværdigheder åbningstider what to see opening hours",
  festival: "billetter datoer program tickets dates programme",
  free: "åbningstider gratis adgang opening hours free entry",
  food: "menukort priser åbningstider menu prices opening hours",
  foodStreet: "boder madmarked åbningstider stalls market opening hours",
  night: "åbningstider entré opening hours entry",
  nightTown: "natteliv barer nightlife bars",
  booking: "værksted booking priser workshop booking prices",
};

export const directSourceSearches = (rows, type, ctx) => {
  const name = clean(typeof ctx === "string" ? ctx : ctx?.name);
  // No name means no query worth spending. This is the same direction of caution
  // placeMatches takes: when we do not know where the draft is, do less.
  if (!name) return [];
  const words = QUERY_WORDS[type] || "praktisk information åbningstider opening hours";
  const other = otherNameFor(name, { includeSights: true });
  const names = other ? `${name} ${other}` : name;
  return sourcesFor(rows, type, ctx)
    .slice(0, MAX_DIRECT_SEARCHES)
    .map(s => ({ domain: s.domain, query: `${names} ${words}` }));
};

// ── WHAT THE LIST COSTS ─────────────────────────────────────────────
// "So it's a waste of money having it search through that." Every source rides
// in on all seven research prompts of every draft, so the list has a running
// cost and nothing was showing it. Rough words rather than a token count,
// deliberately: an exact-looking estimate would be its own small lie.
export const blockCost = (rows, type, ctx) => {
  const block = sourceRulesBlock(rows, type, ctx);
  if (!block) return { sources: 0, words: 0, perDraft: 0 };
  const words = block.trim().split(/\s+/).length;
  return { sources: sourcesFor(rows, type, ctx).length, words, perDraft: words * 7 };
};
