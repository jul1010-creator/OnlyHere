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

import { samePlaceName, otherNameFor, variantsOf, fold, containsName } from "./danishNames";
import { canonicalRegion, isRegion, regionPart, REGION_NAMES } from "./regions";

const clean = (v) => String(v == null ? "" : v).trim();

// ── "visitsønderjylland.dk" IS NOT A DOMAIN, AND HE WAS ABOUT TO TYPE IT ──
// Oliver named that exact address on 13 Aug 2026 as the source he wanted to
// add. The shape test below allows `[a-z0-9-]`, ø is not in it, and the panel
// would have answered "is not a domain I can use" about a site that exists.
//
// The real address is visitsonderjylland.dk in plain letters, which is how
// nearly every Danish site is registered: ø, æ and å reach DNS only through
// punycode and the tourist boards did not bother. So the Danish spelling is
// not a typo, it is what the place is CALLED, typed by somebody who knows it,
// and folding it is what this app already does with Danish letters everywhere
// else. fold() also settles Århus against Aarhus, the same problem in a
// hostname, which has already bitten the search index once.
//
// The fold runs BEFORE the shape test, so the test refuses everything it
// refused before. Nothing here gets looser except which letters count.
//
// AND IT MUST NOT SWALLOW SPACES. The first version stripped whitespace as
// well, which put it in front of the `includes(" ")` guard on the next line and
// quietly turned "hello world.dk" into a domain this app would then search
// forever. Caught by the assertion that nothing previously refused is accepted
// now, which is the shape of test worth writing whenever a validator is
// loosened at all: the interesting question is never what it accepts.
// fold() already collapses runs of whitespace and trims, so a real space
// survives to be refused.
const asciiHost = (s) => fold(s);

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
  s = asciiHost(s);
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
// "essential" is not a place. It is the practical layer: tickets, cards, apps,
// plugs, fines. Oliver, 10 Aug 2026, on a friend's tip about visitor ticketing
// and then, immediately after, the real question: "the whole essentials gotta
// be kept updated at all time. How do we manage that?"
//
// Until now these were thirteen objects hardcoded in src/data/essentials.js.
// The most perishable content in the app, prices and apps and card systems, was
// the ONLY content that never went near the research pipeline, while a town
// entry gets two research passes and a fact-check. Making it a real type is how
// it gets sources, a verdict, and a way to be re-checked rather than remembered.
export const CONTENT_TYPES = ["town", "festival", "free", "food", "foodStreet", "night", "nightTown", "booking", "essential"];
export const TYPE_LABEL = {
  "": "Everything", town: "Towns", festival: "Events", free: "Attractions", food: "Food",
  foodStreet: "Food streets", night: "Nightlife", nightTown: "Nightlife towns", booking: "Workshops", essential: "Essentials",
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

// ── AND A THIRD TIER, BECAUSE NEITHER OF THE OTHER TWO IS THE ANSWER ──
// Oliver, 13 Aug 2026: "We need to have regions of Denmark in 'specific'
// regions. So I can put 'visitsønderjylland.dk' as a source for Sønderjylland."
//
// He is describing the gap between the two scopes above. Jutland sends
// VisitSønderjylland to Skagen. Tønder sends it to Tønder and nowhere else, so
// Sønderborg, Aabenraa, Haderslev, Rømø and Møgeltønder each need their own row
// and the next place he publishes down there needs one too.
//
// utils/regions.js holds the twelve, each defined as the kommuner it contains
// rather than as an outline anybody drew. The scope field takes all three
// granularities now and the order below is what decides which one a typed word
// means: part, then region, then anything left is a town.
//
// PART BEFORE REGION IS DELIBERATE. "Jylland" is a part and "Vestjylland" is a
// region, and samePlaceName knows the Jutland/Jylland pair, so a check made in
// the other order would still be correct here only by luck. Stating the
// precedence is cheaper than relying on none of the twelve ever colliding.
export const cleanPlace = (v) => {
  const t = clean(v);
  if (!t) return "";
  const part = PARTS_OF_COUNTRY.find(p => samePlaceName(p, t));
  if (part) return part;
  // Stored canonical, so "South Jutland" and "sønderjylland" both become
  // "Sønderjylland" in the database and land in the region branch of the
  // matcher rather than being filed as a town nobody has an entry for. That
  // failure is the silent one: the row looks right in the panel and matches
  // nothing forever.
  return canonicalRegion(t) || t;
};

// Which tier a stored scope belongs to. Exported because the Studio panel shows
// it on the row: a scope that reads "Sønderjylland" tells him nothing about
// whether the app understood it as a region or filed it as a town, and those
// two behave completely differently on every draft.
export const scopeTier = (place) => {
  const p = cleanPlace(place);
  if (!p) return "everywhere";
  if (PARTS_OF_COUNTRY.includes(p)) return "part";
  if (isRegion(p)) return "region";
  return "town";
};

export { REGION_NAMES };

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
  // ── THE WIDER SCOPE CONTAINS THE NARROWER ONE ───────────────────
  // A draft that knows it is in Sønderjylland also knows it is in Jutland, and
  // a source scoped to Jutland must still reach it. Without the second half of
  // this line, adding regions would QUIETLY TURN OFF every part-scoped source
  // the moment a draft learned its region, which is the worst shape a change
  // can have: nothing breaks, the drafts just start finding less.
  if (PARTS_OF_COUNTRY.includes(want)) return same(c.part, want) || same(regionPart(c.region), want);
  // Only the region field answers a region scope. Not the town, not the
  // research text: the region is derived from a coordinate by
  // regions.regionAt, so if it is absent nothing has placed this draft yet and
  // the strict rule below applies for the same reason it always has.
  if (isRegion(want)) return canonicalRegion(c.region) === canonicalRegion(want);
  // A town source applies to that town, to anywhere inside it, and to anywhere
  // that uses it as a base: a Dragør entry with dayTripFrom Copenhagen is a
  // Copenhagen trip, and VisitCopenhagen is the right place to look.
  return same(c.name, want) || same(c.town, want) || same(c.partOf, want) || same(c.dayTripFrom, want);
};

// ── "IT NEEDS TO BE ON BOTH.. BUT I CAN ONLY PUT IT ON ONE" ─────────
//
// Oliver, 13 Aug 2026, about billetexpressen.dk. He is right, and the case is
// not unusual: a Danish ticket shop sells for festivals AND for the museums and
// workshops that take bookings, so "which single type is this" has no answer.
//
// He could have added the domain twice, once per type, and the duplicate check
// would have allowed it. That is a workaround rather than a fix, and it has a
// trap in it: sourcesFor and sourcesToSearch dedupe BY DOMAIN, so the two rows
// only stay separate because the type filter runs first. Anyone reordering
// those two lines would silently drop one of his rows.
//
// So applies_to holds a LIST. Stored comma-separated in the same text column,
// which is why parseTypes accepts a bare single value unchanged: every row
// already in his database keeps working with no migration, and "" still means
// every type.
export const parseTypes = (v) => {
  const raw = Array.isArray(v) ? v : String(v == null ? "" : v).split(",");
  const out = [];
  for (const t of raw) {
    const s = clean(t);
    // An unknown type is DROPPED rather than kept as a scope nothing matches.
    // A row scoped to a type the Studio does not draft is a source that looks
    // configured and never once fires, which is the silent shape this file has
    // spent the most comments on.
    if (CONTENT_TYPES.includes(s) && !out.includes(s)) out.push(s);
  }
  return out;
};

// The stored form, so what goes into the column is what parseTypes will read
// back. Order follows CONTENT_TYPES rather than what he clicked, so two rows
// covering the same pair are the same string and the duplicate check works.
export const serialiseTypes = (v) => CONTENT_TYPES.filter(t => parseTypes(v).includes(t)).join(",");

// "" (no types listed) means EVERY type, which is what a national tourist board
// is. Kept as the empty list rather than as all nine, so the panel can tell
// "everything" apart from "he happened to tick all nine".
export const typeMatches = (appliesTo, type) => {
  const list = parseTypes(appliesTo);
  return list.length === 0 || list.includes(type);
};

export const cleanSource = (row) => {
  const domain = normaliseDomain(row?.domain);
  if (!domain) return null;
  const types = parseTypes(row?.applies_to ?? row?.appliesTo);
  return {
    id: row?.id,
    domain,
    note: cleanNote(row?.note),
    types,
    // Kept as the joined string, because it is what every existing reader of
    // this shape prints and compares. A single type serialises to itself, so
    // nothing that worked before reads differently.
    appliesTo: types.join(","),
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
    if (!typeMatches(s.appliesTo, type)) continue;
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
    const label = s.types.length ? s.types.map(t => TYPE_LABEL[t] || t).join(" and ") : "";
    const bits = [label, s.appliesPlace].filter(Boolean);
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
  // Danish first, because the authority on a Danish ticket system is a Danish
  // page. "gældende" and "priser" are what a rules or price page calls itself.
  essential: "priser regler gældende 2026 turist besøgende practical information visitors price rules",
  town: "praktisk information seværdigheder åbningstider what to see opening hours",
  festival: "billetter datoer program tickets dates programme",
  free: "åbningstider gratis adgang opening hours free entry",
  food: "menukort priser åbningstider menu prices opening hours",
  foodStreet: "boder madmarked åbningstider stalls market opening hours",
  night: "åbningstider entré opening hours entry",
  nightTown: "natteliv barer nightlife bars",
  booking: "værksted booking priser workshop booking prices",
};

// ── "I WANNA PUT TIVOLI.DK INTO EVENTS FOR COPENHAGEN.. THIS WILL
//     PROBABLY HAPPEN WITH MORE AREAS" ──────────────────────────────
// Oliver, 9 Aug 2026, and doing exactly that would have produced a source that
// never fired once, silently, forever.
//
// placeMatches is strict on purpose: an unknown place EXCLUDES a place-scoped
// source, because including a Copenhagen source on an Aarhus draft is how you
// get a Copenhagen page read as an authority on Aarhus. That rule is right.
//
// But for an EVENT draft, the only thing the pipeline knows when the searches
// are built is the event's own name. "Copenhell" is not "Copenhagen", so a
// Copenhagen-scoped source matches nothing and is dropped. He would have added
// Tivoli, seen nothing happen, and had no way to tell why.
//
// ── DECIDING WHERE TO LOOK IS NOT DECIDING WHAT TO BELIEVE ──────────
// That is the distinction the strict rule was missing, and it is why one rule
// cannot serve both jobs.
//
// When the question is "should this source's words go into a PROMPT", a wrong
// answer means a model treating a Copenhagen page as evidence about Aarhus.
// Strict is correct: exclude unless something says where we are.
//
// When the question is "should we run one search against this domain", a wrong
// answer costs one query that returns nothing. Nothing enters the draft either
// way, because a search of tivoli.dk for an event that is not at Tivoli comes
// back empty. So this can afford to be generous, and being generous is what
// makes a venue or city source usable at all.
//
// So the loose test also reads the RESEARCH TEXT. By the time the direct
// searches run, the general web pass has already pulled snippets about this
// place, and a Copenhell snippet says Copenhagen in the first line. The strict
// test is untouched and still governs every prompt.
// ── A DRAFT THAT KNOWS WHERE IT IS DOES NOT NEED THE TEXT TO GUESS ──
// Oliver, 10 Aug 2026: "the AI blogger is searching through sources for
// Copenhagen, even if I am trying to find sources about Odense... Thankfully
// they don't use the Copenhagen ones. But it's a waste."
//
// He is right, and the waste is only the visible half.
//
// The text fallback below exists for a real case and stays: an EVENT draft
// knows the event's name and nothing else, "Copenhell" is not "Copenhagen",
// and the research snippets are what say where it is held. That is a draft
// that cannot place itself.
//
// A TOWN draft is not that. Its name IS the place. And a realistic Odense
// research text says something like "about 1 hour 15 from Copenhagen by
// train", which is a fact ABOUT Odense, not evidence that this is a Copenhagen
// draft. Every place named anywhere in the snippets was unlocking its own
// scoped source, so an Odense draft paid to ask visitcopenhagen.com about
// Odense.
//
// AND THE CAP MAKES IT WORSE THAN WASTE. MAX_DIRECT_SEARCHES is 4 and the sort
// is alphabetical, so visitaarhus.com and visitcopenhagen.com both come before
// visitodense.com. Four sources in, the Odense draft loses its own Odense
// source off the end of the list. The irrelevant searches do not only cost
// money, they crowd out the right one, and the symptom of THAT is a draft that
// quietly found less than it should have, with nothing on screen to say so.
//
// So the text only speaks when the draft is genuinely silent about its place.
const knowsItsOwnPlace = (ctx, type) => {
  if (!ctx || typeof ctx !== "object") return false;
  // For a town, the draft's own name is the answer to "where is this".
  if (type === "town" || type === "nightTown") return !!clean(ctx.name);
  // For everything else only a real place field counts, because a festival's
  // name does not locate it, which is the whole reason the fallback exists.
  //
  // A REGION COUNTS, AND IT IS THE STRONGEST OF THESE. It comes from a
  // coordinate rather than from a field somebody typed, and once the maps
  // lookup runs before the sources are chosen it is the thing a festival draft
  // knows FIRST. A draft holding a region does not need the research text to
  // guess where it is, and letting the text speak anyway is the 10 Aug bug:
  // "1 hour 15 from Copenhagen" unlocking visitcopenhagen.com on an Odense
  // draft, four searches deep, crowding visitodense.com off the end.
  return !!(clean(ctx.region) || clean(ctx.town) || clean(ctx.partOf) || clean(ctx.dayTripFrom) || clean(ctx.part));
};

export const placeMightMatch = (place, ctx, type) => {
  const want = cleanPlace(place);
  if (!want) return true;
  if (placeMatches(want, ctx)) return true;
  if (knowsItsOwnPlace(ctx, type)) return false;
  const text = ctx && typeof ctx === "object" ? String(ctx.text || "") : "";
  if (!text) return false;
  // Either spelling, because the research text is as likely to say København.
  //
  // containsName, not a raw substring on the folded text. The old version read
  // any occurrence of the letters, so a source scoped to Als matched research
  // containing "also", and one scoped to Fur matched "furniture". Same missing
  // word boundary as the discovery deduplication and the preview screen, and
  // here it spends money rather than only showing a wrong card.
  return variantsOf(want).some(v => v && containsName(text, v));
};

// Same shape as sourcesFor, with the loose place test. Kept as its own function
// rather than a flag, so no future call site can pick the generous rule for a
// prompt by passing the wrong argument.
export const sourcesToSearch = (rows, type, ctx) => {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(rows) ? rows : []) {
    const s = cleanSource(raw);
    if (!s || !s.enabled) continue;
    if (!typeMatches(s.appliesTo, type)) continue;
    if (!placeMightMatch(s.appliesPlace, ctx, type)) continue;
    if (seen.has(s.domain)) continue;
    seen.add(s.domain);
    out.push(s);
  }
  // ── MOST SPECIFIC FIRST, BECAUSE THIS LIST GETS CUT ───────────────
  // sourcesFor orders universal first, and it is right to: it feeds the PROMPT,
  // where the general policy should read before the exception to it. This list
  // feeds a BUDGET. Its only caller is directSourceSearches, which slices it at
  // MAX_DIRECT_SEARCHES, so ordering universal first means the cap is spent
  // before a type-specific source is ever reached.
  //
  // Oliver, 12 Aug 2026, after adding billetto.dk and watching nothing change:
  // "I have put this.. but it doesen't matter.." He was right, and it was worse
  // than he thought. He had six sources scoped to Everything and four scoped to
  // Events, the cap is four, and his run log named the four chosen:
  // enjoynordjylland.dk, getyourguide.com, visitcopenhagen.dk, visitdenmark.dk.
  // Every one of them universal. So ticketmaster.dk, kultunaut.dk, billetto.dk
  // and visitorservice.kk.dk were unreachable on every festival draft ever made,
  // and would have stayed unreachable however many more he added. Three
  // ticketing sources sat in that list doing nothing while the pipeline reported
  // "no Danish listing" for a festival whose tickets are on Billetto.
  //
  // A source scoped to this exact type is the one he chose FOR this type, so it
  // goes first. The universal ones still reach the draft through
  // sourceRulesBlock, so nothing is lost. They just stop eating the budget.
  //
  // ── AND FEWER TYPES IS MORE SPECIFIC ─────────────────────────────
  // Once a source can carry several types, "has a type" stops being a good
  // enough sort key: a domain scoped to Events alone was chosen FOR events,
  // and one scoped to Events and Attractions and Workshops is a general
  // ticketing site. Universal stays last, which is what the 0 is doing here.
  const rank = (s) => (s.types.length === 0 ? Infinity : s.types.length);
  return out.sort((a, b) => rank(a) - rank(b) || a.domain.localeCompare(b.domain));
};

// ── "IF I PUT IN TICKETMASTER.DK, DOES IT GO THROUGH ALL OF
//     TICKETMASTER?" ────────────────────────────────────────────────
// Oliver, 9 Aug 2026. The whole site, yes. But the honest answer needed a check,
// and the check found a hole: Tavily's docs describe include_domains as "a list
// of domains to specifically include" and say NOTHING about subdomains. They do
// say the list may hold up to 300.
//
// That silence matters here more than anywhere else, because of the failure this
// feature was built around. Rock Under Broen's ticket prices were not on
// unitedtickets.dk at all. They were on billet.unitedtickets.dk, one subdomain
// away, and a fact-check that stopped at the front page reported the price as
// unverified. Adding "unitedtickets.dk" and having it silently exclude the exact
// page holding the answer would reproduce that bug through the feature meant to
// fix it.
//
// So the search asks for the domain AND the places a Danish ticket shop actually
// lives. It is one query either way, because include_domains takes a list, so a
// subdomain that does not exist costs nothing and returns nothing.
const SHOP_SUBDOMAINS = ["billet", "billetter", "billetsalg", "tickets", "ticket", "shop", "booking", "kalender", "events"];

export const domainVariants = (domain) => {
  const d = normaliseDomain(domain);
  if (!d) return [];
  // The bare host first: it is the one he typed and the one most results carry.
  return [d, `www.${d}`, ...SHOP_SUBDOMAINS.map(sub => `${sub}.${d}`)];
};

export const directSourceSearches = (rows, type, ctx) => {
  const name = clean(typeof ctx === "string" ? ctx : ctx?.name);
  // No name means no query worth spending. This is the same direction of caution
  // placeMatches takes: when we do not know where the draft is, do less.
  if (!name) return [];
  const words = QUERY_WORDS[type] || "praktisk information åbningstider opening hours";
  const other = otherNameFor(name, { includeSights: true });
  const names = other ? `${name} ${other}` : name;
  return sourcesToSearch(rows, type, ctx)
    .slice(0, MAX_DIRECT_SEARCHES)
    // `domain` stays the bare host, because it is what the panel reports back to
    // him and what he typed. `domains` is what the search is actually given.
    // ── THE NAME FIRST. THE KEYWORDS ONLY IF THAT FINDS NOTHING ─────
    // Measured on 12 Aug 2026 against the live endpoint, same key, same code
    // path, scoped to kultunaut.dk:
    //
    //   "Ribelund Festival billetter datoer program tickets dates programme"
    //       -> results: []          the query this function has always sent
    //   "Ribelund Festival"
    //       -> 8 results, one of them carrying
    //          "Hvor: Ribelund Festivalplads, Pile Alle 2, Ribe ;
    //           Hvornår: Ons. d. 19. august 2026, kl. 10.30-19. ;
    //           Pris: Entré: 400 kr."
    //
    // The price, the date, the hours and the address, in the snippet, from a
    // source he had vouched for. The keyword tail was turning eight results into
    // none. A control search for "koncert" on the same domain returned eight, so
    // the index is fine and the query was the problem.
    //
    // The tail is not deleted, because it is doing real work elsewhere: it is
    // what biases a search toward a price or an opening-hours page rather than
    // any page that mentions the place. It becomes the FALLBACK. A bare name is
    // tried first, and the tail only runs when that came back empty.
    //
    // COST: one call in the normal case, exactly as now. Two only when the first
    // found nothing, which is the case that currently returns nothing at all, so
    // the extra call buys an answer where today there is none.
    .map(s => ({
      domain: s.domain,
      domains: domainVariants(s.domain),
      query: names,
      fallbackQuery: `${names} ${words}`,
    }));
};

// ── EVERYTHING PAST THE CAP, IN ONE CALL ────────────────────────────
//
// Oliver, 13 Aug 2026: "When it searches on the web for events, towns,
// attractions, etc. include the research sources I have implemented. Perhaps
// they'll help."
//
// They would have. His own run log for the Græskarfestival draft, the same day:
//
//   2. Founder sources chosen [tavily · ok]
//      got: 4 of 18: billet.unitedtickets.dk, billetlugen.dk, billetto.dk,
//           kultunaut.dk
//
// FOUR OF EIGHTEEN. And the four are all ticketing, because the specificity
// sort puts festival-scoped sources first and he has four of those. So
// billetexpressen.dk never ran a search, and Billetexpressen is where that
// festival's tickets are sold: the URL is sitting in the finished draft's own
// __sources, found by the general web pass, and Gemini's read of the same
// festival names it as the ticket vendor. The one source that had the answer
// was the one the cap cut.
//
// ── WHY THE CAP STAYS, AND WHY THIS IS NOT SIMPLY A BIGGER ONE ──────
// Raising MAX_DIRECT_SEARCHES to eighteen would be eighteen searches per draft,
// growing every time he finds a page. That is the cost problem he has raised in
// almost every conversation.
//
// include_domains takes a LIST, up to three hundred entries, and api/search has
// accepted a comma-separated `domains` this whole time. So everything past the
// cap fits in ONE call. Total cost per draft goes from four to five.
//
// The top four keep their own searches rather than being folded in, and that is
// the point of the split: results from a combined query are ranked across the
// whole set, so a site with thousands of pages crowds out the parish council's
// one relevant PDF. A source with its own call is guaranteed its own results.
// The overflow call cannot make that promise and does not need to: its job is
// that nothing on his list is unreachable, which today is the failure.
export const MAX_INCLUDE_DOMAINS = 300;

export const overflowSourceSearch = (rows, type, ctx) => {
  const name = clean(typeof ctx === "string" ? ctx : ctx?.name);
  if (!name) return null;
  const rest = sourcesToSearch(rows, type, ctx).slice(MAX_DIRECT_SEARCHES);
  if (!rest.length) return null;
  const words = QUERY_WORDS[type] || "praktisk information åbningstider opening hours";
  const other = otherNameFor(name, { includeSights: true });
  const names = other ? `${name} ${other}` : name;
  // Full variants, so a ticket shop past the cap can still be found at its
  // billet.<site> subdomain, which is where Rock Under Broen's prices were and
  // is the reason domainVariants exists at all.
  const all = [];
  for (const s of rest) for (const d of domainVariants(s.domain)) if (!all.includes(d)) all.push(d);
  // NO SILENT CAPS. Three hundred is Tavily's documented ceiling and eleven
  // variants per domain means about twenty-seven sources before it bites, which
  // is more than he has. If it ever does bite, the caller says which domains
  // were dropped rather than reporting a search that quietly covered less.
  const dropped = all.length > MAX_INCLUDE_DOMAINS ? all.slice(MAX_INCLUDE_DOMAINS) : [];
  return {
    covers: rest.map(s => s.domain),
    domains: all.slice(0, MAX_INCLUDE_DOMAINS),
    dropped,
    query: names,
    fallbackQuery: `${names} ${words}`,
  };
};

// ── AND THE DISCOVER TAB, WHICH NEVER SAW THE LIST AT ALL ───────────
//
// Oliver, 13 Aug 2026, clarifying which searches he meant: "I mean the 'discover
// new events' tab."
//
// That tab plans five queries with OpenAI and runs five plain web searches. Not
// one of his eighteen domains has ever been searched by it, and one of the five
// query slots is literally briefed as "one at local/regional tourism sources",
// so the planner has been asked to GUESS at the thing he has already written
// down. A Danish festival's first appearance anywhere is a line on a tourist
// board's what's-on page or a kultunaut listing, which is exactly the list.
//
// ── A DISCOVERY QUERY IS NOT A RESEARCH QUERY ───────────────────────
// The draft-side words above ask about a place already known by name:
// "billetter datoer program". Discovery does not have a name yet, it is looking
// for one, so the query has to be the shape of a LISTING page: what is on, this
// season, in this part of the country. Danish first for the same reason as
// everywhere else, since these are Danish sites and their listing pages are
// filed under Danish words.
const DISCOVER_WORDS = {
  town: "byer seværdigheder oplevelser besøg små byer towns to visit",
  festival: "kalender hvad sker der arrangementer festival 2026 2027 what's on events calendar",
  free: "gratis seværdigheder oplevelser attraktioner free attractions things to do",
  food: "restauranter spisesteder anbefalinger restaurants where to eat",
  foodStreet: "madmarked street food boder market halls",
  night: "natteliv barer klubber nightlife bars",
  nightTown: "natteliv udeliv nightlife towns",
  booking: "værksteder kurser oplevelser workshops courses experiences",
  essential: "praktisk information turist gældende priser practical visitor information",
};

// ONE call, not one per domain, and that is deliberate rather than a saving.
// Discovery wants NAMES it has not seen, so breadth across the whole list beats
// depth on any one site: a combined query returning eight results spread over
// six tourist boards is a better candidate list than eight pages of the same
// board. The opposite of the draft-side reasoning, for the opposite job.
export const discoverSourceSearch = (rows, type, ctx) => {
  const list = sourcesToSearch(rows, type, ctx);
  if (!list.length) return null;
  const all = [];
  for (const s of list) for (const d of domainVariants(s.domain)) if (!all.includes(d)) all.push(d);
  const where = clean(typeof ctx === "string" ? ctx : ctx?.name || ctx?.town);
  const words = DISCOVER_WORDS[type] || "oplevelser seværdigheder things to do";
  return {
    covers: list.map(s => s.domain),
    domains: all.slice(0, MAX_INCLUDE_DOMAINS),
    dropped: all.length > MAX_INCLUDE_DOMAINS ? all.slice(MAX_INCLUDE_DOMAINS) : [],
    query: where ? `${where} ${words}` : `Danmark ${words}`,
  };
};

// What the planner is told, so it stops inventing a query aimed at "local
// tourism sources" and spends that slot on an angle these domains do not cover.
// Returns "" when there is nothing to name, because an empty heading in every
// prompt teaches the model the section is noise.
export const discoverSourceNote = (rows, type, ctx) => {
  const list = sourcesToSearch(rows, type, ctx);
  if (!list.length) return "";
  return `\n\nTHESE SITES ARE ALREADY BEING SEARCHED SEPARATELY, so do not spend one of your five queries aiming at them: ${list.map(s => s.domain).join(", ")}. They are the founder's own vouched tourism and listing sources and a dedicated search runs across all of them alongside yours. Use your five for angles they will NOT cover: forum and Reddit discussion, personal blogs, local news, niche roundups, and anything written by somebody who lives there rather than by a tourist board.`;
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
