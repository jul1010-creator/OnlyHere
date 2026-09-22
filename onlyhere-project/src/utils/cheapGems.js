// ── CHEAP GEMS ──────────────────────────────────────────────────────
//
// Oliver, 21 Sep 2026: "I want you to make 'cheap gems' navigation.. because I
// just realised something.. search up MSCH Copenhagen student discount, along
// with flying tiger discount app, and Brdr. simonsen.."
//
// What the three have in common, checked on their own pages that day:
//
//   MSCH Copenhagen   15% off for students. No verification service: you
//                     email a photo of your student card and they send a
//                     personal code.
//   Flying Tiger      a free club app, "up to 20%" off in the shop and never
//                     online, and a voucher only works in the country you
//                     joined in.
//   Brdr. Simonsen    no scheme at all. A Danish menswear chain with thirteen
//                     shops that is cheap to begin with.
//
// The first two are discounts that exist and that a visitor never finds,
// because they sit behind an email or an app. That is the realisation, and it
// is the answer to the Gemlyx+ question from the other direction: he called
// a Gemlyx funded discount stupid, and here are Danish brands already running
// their own, paid for by nobody but them. The third is the other half of the
// same page: somewhere that is cheap without asking.
//
// His choices, the same day: BOTH kinds, as two sections. An OWN PAGE in the
// navigation. Filled by PIPELINE RESEARCH that proposes and never publishes.
//
// ── NOT AN AFFILIATE, NOT AN OFFER ──────────────────────────────────
//
// Nothing here pays Gemlyx and nothing here is paid for by Gemlyx, so none of
// the disclosure machinery in affiliates.js or offer.js applies, and none of
// it is borrowed. What IS borrowed from offer.js is the one rule that makes a
// discount safe to print: it carries a date. An offer carries the day it ends.
// A brand's own scheme usually states no end, so a gem carries the day it was
// last CHECKED instead, and stops rendering when that day is too far back.
import { fold } from "./danishNames";
import { isNeverOwnSite } from "./sourcePolicy";
// The one hostOf, which the suite holds to one declaration across utils.
import { hostOf, textHasPrice, menuImagesToRead } from "./pageScan";

// The row type in gemlyx_content. Deliberately NOT in CONTENT_TYPES, for the
// reason "undated" is not: nothing drafts a gem through the normal pipeline.
// The only way one is made is the research pass below and his approval of it.
export const GEM_TYPE = "gem";

export const GEM_KINDS = ["scheme", "cheap"];
// What a gem is for. See gemCategory, under the filters.
export const GEM_CATEGORIES = ["food", "shop", "stay", "travel", "other"];

// The two sections, in his order. A scheme is the realisation, so it leads.
export const GEM_SECTION = {
  scheme: "Discounts you have to ask for",
  cheap: "Cheap anyway",
};

export const WHERE = ["shop", "online", "both"];
export const WHERE_LABEL = {
  shop: "In the shop",
  online: "Online",
  both: "In the shop and online",
};

// ── HOW OLD A CHECK MAY BE ──────────────────────────────────────────
//
// RECHECK is when the Studio starts saying so. STALE is when the page stops
// showing it. Half a year is long enough that a club which changed its terms
// in spring has not been silently wrong all summer, and short enough that the
// page is not mostly a list of expiring warnings.
export const RECHECK_DAYS = 90;
export const STALE_DAYS = 180;

const clean = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();

// ── THE RABATKODE SITES ─────────────────────────────────────────────
//
// Searching for Brdr. Simonsen returned nine pages and six of them were coupon
// sites: "85% OFF", "Eksklusiv 70% Rabatkode", "58% Tilbud". None of those
// figures came from the brand and most of those codes never existed. A page
// about saving money attracts these more than any other kind of page, so they
// are refused as a source outright rather than left to a model to spot.
//
// Matched on the HOST, because that is where these sites announce themselves.
export const COUPON_SITE = /rabat|kupon|coupon|coupert|promo|voucher|hotdeal|dealspotr|retailmenot|cuponation|picodi|heftyapp|danmarkcode|knoji|couponbirds|tilbudsavis/i;
export const isCouponSite = (url) => {
  const h = hostOf(url);
  return !!h && COUPON_SITE.test(h);
};

// ── IS THIS THE BRAND'S OWN PAGE ────────────────────────────────────
//
// A list of student discounts on a third site is a good lead and a bad source:
// it was right when somebody wrote it and nobody there checks it again. The
// brand's own page is the one that changes when the scheme does.
//
// Read off the name, because there is nothing else to read it off: a word of
// the name, four letters or more, that is not a place and not a word every
// shop shares, found in the host. mschcopenhagen.com carries msch,
// flyingtiger.com carries flying and tiger, brdr-simonsen.dk carries both of
// its words. studiz.dk carries none of them.
const COMMON_NAME_WORDS = new Set([
  "copenhagen", "kobenhavn", "koebenhavn", "denmark", "danmark", "danish", "dansk", "aarhus", "odense", "aalborg",
  "shop", "store", "butik", "butikken", "outlet", "market", "marked", "house", "huset", "group", "company",
  "cafe", "restaurant", "the", "and", "og",
]);
// Both spellings of a Danish letter, because a domain writes one of them:
// fold reads Føtex as "fotex" and the shop's site is foetex.dk. Found by
// review, 21 Sep 2026, where it blocked a brand on its own page.
const digraphs = (s) => clean(s).toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa");
const nameWords = (name) => [...new Set([fold(clean(name)), fold(digraphs(name))]
  .flatMap(n => n.split(/[^a-z0-9]+/)))].filter(w => w.length >= 4 && !COMMON_NAME_WORDS.has(w));

export const isOwnSite = (url, name) => {
  const h = hostOf(url);
  if (!h || isNeverOwnSite(url) || isCouponSite(url)) return false;
  const words = nameWords(name);
  if (!words.length) return false;
  const label = fold(h.split(".").slice(0, -1).join("."));
  return words.some(w => label.includes(w));
};

const dayOf = (iso) => {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};
const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const checkedAgo = (payload, today = new Date()) => {
  const d = dayOf(payload?.checkedAt);
  if (!d) return null;
  return Math.round((startOf(today).getTime() - startOf(d).getTime()) / 86400000);
};

// ── THE ONE INSERT SHAPE ────────────────────────────────────────────
//
// Called from shapeForLive in studioContent.js, which is the only insert path
// into gemlyx_content and has eaten a feature seven times by not naming a
// field. So the gem's fields are named HERE, once, and shapeForLive hands the
// whole row to this function rather than keeping a second list of them.
export const shapeGem = (t = {}) => {
  const kind = GEM_KINDS.includes(clean(t.kind)) ? clean(t.kind) : "";
  const where = WHERE.includes(clean(t.where)) ? clean(t.where) : "";
  const towns = (Array.isArray(t.towns) ? t.towns : []).map(clean).filter(Boolean).slice(0, 12);
  return {
    name: clean(t.name),
    kind,
    // EMPTY IS ALL OF DENMARK: a chain, or a scheme that works in every shop
    // the brand has. A named town is a single local place.
    towns,
    what: clean(t.what).slice(0, 160),
    who: clean(t.who).slice(0, 200),
    how: clean(t.how).slice(0, 300),
    where,
    // THE VISITOR'S CATCH, which is the field a local never needs and a visitor
    // always does: an app that only works in the country you joined in, a
    // student card that has to be Danish, a club that asks for a Danish number.
    catch: clean(t.catch).slice(0, 240),
    // What it is FOR, so the page can be filtered by it. Empty is allowed and
    // is read off the words instead: see gemCategory.
    category: GEM_CATEGORIES.includes(clean(t.category)) ? clean(t.category) : "",
    desc: clean(t.desc).slice(0, 400),
    source: clean(t.source),
    checkedAt: clean(t.checkedAt).slice(0, 10),
  };
};

// ── WHAT A ROW STILL OWES BEFORE IT MAY GO UP ───────────────────────
//
// Sentences rather than a boolean, the same reason offerProblems returns them:
// each one is a different thing for him to do. `blocks` is true when the row
// must not be published at all.
export const gemProblems = (payload = {}, today = new Date()) => {
  const g = shapeGem(payload);
  const out = [];
  let blocks = false;
  if (!g.name) { out.push("No name."); blocks = true; }
  if (!g.kind) { out.push("Not marked as a discount scheme or as cheap anyway."); blocks = true; }
  if (!/^https:\/\//i.test(g.source)) {
    out.push("No https page behind it. A saving nobody can check is a rumour.");
    blocks = true;
  } else if (isCouponSite(g.source)) {
    out.push(`${hostOf(g.source)} is a coupon site. Those print figures the brand never offered.`);
    blocks = true;
  } else if (!isOwnSite(g.source, g.name)) {
    // A DISCOUNT'S TERMS ARE THE BRAND'S TO STATE. A list of student discounts
    // on somebody else's site was right the day it was written, and the one
    // page that changes when the scheme does is the brand's own. So a scheme
    // from anywhere else does not go up. A cheap place may be vouched for by
    // a page that is not its own, a local guide saying where lunch is cheap,
    // and the card then names whose page that is.
    if (g.kind === "scheme") {
      out.push(`${hostOf(g.source)} is not ${g.name || "the brand"}'s own site, and a discount's terms have to come from the brand. Open their page and paste that instead.`);
      blocks = true;
    } else {
      out.push(`${hostOf(g.source)} is not ${g.name || "the place"}'s own site, so the card names that site rather than calling it theirs.`);
    }
  }
  if (g.kind === "scheme" && !g.what) { out.push("A discount with no saving named."); blocks = true; }
  if (g.kind === "scheme" && !g.who) out.push("Nobody named as who gets it.");
  if (g.kind === "scheme" && !g.how) out.push("Nothing on how to get it, which is the half a visitor is missing.");
  if (!g.where) out.push("Not known whether it works in the shop, online or both, so the page says nothing about it.");
  const ago = checkedAgo(g, today);
  if (ago == null) { out.push("No date it was checked."); blocks = true; }
  else if (ago > STALE_DAYS) { out.push(`Checked ${ago} days ago, so the page no longer shows it. Check it again.`); }
  else if (ago > RECHECK_DAYS) out.push(`Checked ${ago} days ago. Worth a look before somebody travels on it.`);
  return { problems: out, blocks };
};

// ── WHAT A READER SEES ──────────────────────────────────────────────
//
// A decision rather than a render, so it can be asserted without a browser,
// the same argument offerView makes. A row with a blocking problem or a check
// older than STALE_DAYS is not shown, and there is no badge saying something
// is hidden: a gem nobody has checked since spring is not a gem.
export const gemLive = (payload, today = new Date()) => {
  const { blocks } = gemProblems(payload, today);
  if (blocks) return false;
  const ago = checkedAgo(payload, today);
  return ago != null && ago >= 0 && ago <= STALE_DAYS;
};

const inTown = (g, town) => {
  if (!town) return true;
  const towns = Array.isArray(g.towns) ? g.towns : [];
  if (!towns.length) return true;
  return towns.some(t => fold(t) === fold(town));
};

// ── FILTERS ON THE PAGE ─────────────────────────────────────────────
//
// Oliver, 21 Sep 2026, going to bed: "Bring some filters in on our new
// navigations as well." A town filter was all the page had. Now also what a
// gem is for, whether you have to ask for it, whether it is for students, and
// a search. Each filter only shows when it would split the page: a pill that
// matches everything or nothing is a pill nobody needs.
export const GEM_CATEGORY_LABEL = { food: "Food and drink", shop: "Shops", stay: "Beds", travel: "Getting around", other: "Other" };
const FOOD_WORDS = /\b(?:restaurant|caf[eé]|bakery|bager(?:i|iet)?|burger|pizza|kebab|shawarma|d[uü]r[uü]m|food|street ?food|mad|madhal|spis(?:ested)?|frokost|lunch|dinner|brunch|breakfast|morgenmad|coffee|kaffe|sm(?:ø|oe)rrebr(?:ø|oe)d|p(?:ø|oe)lse(?:vogn)?|hot ?dog|bar|beer|(?:ø|oe)l|wine|vin|ice ?cream|is(?:bar|hus)|canteen|kantine|grill(?:bar)?|takeaway)\b/i;
const STAY_WORDS = /\b(?:hostel|hotel|camping|campsite|vandrerhjem|bed and breakfast|b&b|overnat\w*|room|v(?:æ|ae)relse)\b/i;
const TRAVEL_WORDS = /\b(?:bus|train|tog|ferry|f(?:æ|ae)rge|bike|cykel|metro|rejsekort|rejsebillet|ticket to ride|dsb|flixbus|kombardo|car hire|rental car)\b/i;
const SHOP_WORDS = /\b(?:shop|store|butik\w*|clothing|clothes|t(?:ø|oe)j|fashion|design|supermarke[dt]|kiosk|outlet|second ?hand|genbrug|chain|k(?:æ|ae)de|books?|boghandel|homeware|interior|souvenir|sko|shoes|retail)\b/i;
export const gemCategory = (g = {}) => {
  const said = clean(g.category);
  if (GEM_CATEGORIES.includes(said)) return said;
  const text = [g.name, g.what, g.desc, g.how].map(clean).join(" ");
  if (FOOD_WORDS.test(text)) return "food";
  if (STAY_WORDS.test(text)) return "stay";
  if (TRAVEL_WORDS.test(text)) return "travel";
  if (SHOP_WORDS.test(text)) return "shop";
  return "other";
};
export const isForStudents = (g = {}) => /\bstud(?:ent|erende|ie)\w*/i.test(`${clean(g.who)} ${clean(g.what)} ${clean(g.name)}`);

// `category`, `students` and `q` narrow the rows before gemsView sorts them.
export const gemMatches = (g = {}, { category = "", students = false, q = "" } = {}) => {
  if (category && gemCategory(g) !== category) return false;
  if (students && !isForStudents(g)) return false;
  const words = fold(clean(q)).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fold([g.name, g.what, g.who, g.how, g.desc, g.catch, ...(g.towns || [])].map(clean).join(" "));
  return words.every(w => hay.includes(w));
};

// Which filters are worth drawing for these rows.
export const gemFilterOptions = (rows = [], { today = new Date() } = {}) => {
  const live = (Array.isArray(rows) ? rows : []).filter(r => gemLive(r, today));
  const cats = GEM_CATEGORIES.filter(c => live.some(g => gemCategory(g) === c));
  const kinds = GEM_KINDS.filter(k => live.some(g => g.kind === k));
  const students = live.filter(isForStudents).length;
  return {
    categories: cats.length > 1 ? cats : [],
    kinds: kinds.length > 1 ? kinds : [],
    students: students > 0 && students < live.length,
    search: live.length > 6,
  };
};

export const gemsView = (rows = [], { town = "", today = new Date() } = {}) => {
  const live = (Array.isArray(rows) ? rows : []).filter(r => gemLive(r, today));
  const byName = (a, b) => fold(a.name).localeCompare(fold(b.name));
  const here = live.filter(g => inTown(g, town));
  const towns = [...new Set(live.flatMap(g => (Array.isArray(g.towns) ? g.towns : []).map(clean)).filter(Boolean))]
    .sort((a, b) => fold(a).localeCompare(fold(b)));
  return {
    scheme: here.filter(g => g.kind === "scheme").sort(byName),
    cheap: here.filter(g => g.kind === "cheap").sort(byName),
    towns,
  };
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const checkedLabel = (payload) => {
  const d = dayOf(payload?.checkedAt);
  return d ? `Checked ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "";
};

// ── THE RESEARCH PASS ───────────────────────────────────────────────
//
// Four searches for a town, four for the whole country. Written in Danish
// where the thing is Danish, because studierabat and kundeklub are the words
// on the pages that have these, and in English once, because a visitor's own
// search is part of what this is competing with.
export const gemSearches = (place = "") => {
  const p = clean(place);
  if (!p || /^(danmark|denmark)$/i.test(p)) {
    return [
      "studierabat butik Danmark kæde",
      "kundeklub app rabat i butik Danmark",
      "billig dansk kæde lave priser butikker",
      "Denmark discount app club students shops locals use",
    ];
  }
  return [
    `studierabat ${p}`,
    `${p} kundeklub app rabat butik`,
    `billig ${p} spar penge lokale tip`,
    `${p} student discount cheap shop`,
    // FOOD, Oliver 21 Sep 2026, of Restaurant Sporvejen: "I guess that can be
    // included in cheap gems then? So food is covered in that navigation."
    // The four above were written for shops, and a cheap place to eat never
    // came up in them.
    `billig mad ${p} frokost aftensmad kr`,
  ];
};

// ── ONE PLACE, BY NAME ──────────────────────────────────────────────
//
// For when he already knows the place, as he knew Sporvejen. The same pass as
// a town search, run on the name instead, so a place he names still goes up
// only on a page that states it: knowing a place is cheap is not a source.
export const gemSearchesFor = (name = "", place = "") => {
  const n = clean(name);
  if (!n) return [];
  const p = clean(place);
  const at = p && !/^(danmark|denmark)$/i.test(p) ? ` ${p}` : "";
  // BOTH KINDS, not only a place to eat. Oliver, 22 Sep 2026: "it says it
  // cannot find MSCH Copenhagen". The three searches were a restaurant's,
  // prices and a menu, and a shop's student discount is on none of those
  // pages. The name alone, then the words a discount is written in, then
  // the words a price is.
  return [`${n}${at}`, `${n} studierabat`, `${n} student discount`, `${n} rabat kundeklub`, `${n}${at} priser kr`];
};

// ── AND THE PLACE'S OWN PAGE, READ, WHEN THE SNIPPET HAS NO PRICE ───
//
// Oliver, 21 Sep 2026, first "the pipeline will always prioritise the home
// website, yes?" and then "some (very few) restaurants can have menus on
// pictures, instead of writing. So firecrawl needs to be prepared for that."
// A search snippet is a few lines, and a restaurant's price is further down
// the page or, on Sporvejen, in Frokost.jpg. So on a name lookup the place's
// own pages in the results are read in full, and when the text states no price
// its menu pictures are transcribed. Two pages at most: this is a Studio run
// he starts by hand, and two pages is one menu for lunch and one for dinner.
export const MAX_OWN_PAGES = 2;
export const ownPagesIn = (results = [], name = "") =>
  (Array.isArray(results) ? results : []).filter(r => r?.url && isOwnSite(r.url, name)).slice(0, MAX_OWN_PAGES);

// What a read page adds to the results the model is handed. The lines with a
// price on them, since that is what the search was for; a transcription is
// marked as one, because a figure read off a picture is weaker than a line of
// text and the row that cites it should be looked at before it goes up.
const DISCOUNT_LINE = /\d\s?%|\brabat|\bdiscount|\bstud(?:ent|erende|ie)|\bkundeklub|\bmember|\bmedlem|\bklub\b|\bclub\b/i;
export const pageAsResult = ({ url = "", title = "", text = "", fromImage = false } = {}) => {
  const body = clean(text);
  if (!body) return null;
  // The lines worth handing on: a price, or a discount.
  const lines = String(text || "").split(/\n+/).map(clean).filter(l => l && (textHasPrice(l) || DISCOUNT_LINE.test(l)));
  const snippet = fromImage
    ? `[Transcribed from a menu picture on ${hostOf(url)}] ${body}`.slice(0, 1500)
    : (lines.length ? lines.join(" | ") : body).slice(0, 1500);
  return { title: clean(title) || hostOf(url), url, snippet };
};

// ── AND THE MODEL, WHICH MAY READ AND MAY NOT DECIDE ────────────────
//
// The source is an INDEX into the results rather than an address, so a model
// that invents a page has nothing to invent it with: an index that is not in
// the list is a row that does not come back. Same principle as islandDirectory
// keeping the island's own words, one level down.
export const GEMS_PROMPT = (place, results = [], { only = "" } = {}) => {
  const where = clean(place) || "Denmark";
  const one = clean(only);
  const list = results.map((r, i) => `[${i}] ${clean(r.title)}\n${clean(r.url)}\n${clean(r.snippet)}`).join("\n\n");
  return `You are finding cheap gems for travellers in ${where}. Two kinds, and nothing else:\n\n`
    + `"scheme": a discount a shop, café or chain gives to anybody who does one thing first. A student card, joining a club, an app, a card. Only if a result below says so.\n`
    + `"cheap": a place that is cheap without doing anything, and only when a result below says it is.\n\n`
    + `Respond with ONLY strict JSON: {"gems":[{"name":"","kind":"scheme|cheap","category":"food|shop|stay|travel|other","towns":[],"what":"","who":"","how":"","where":"shop|online|both|","catch":"","desc":"","source":0}]}\n\n`
    + `SOURCE IS THE NUMBER OF THE RESULT that says it. A gem no result states does not come back.\n`
    + `WHEN THE PLACE'S OWN SITE SAYS IT TOO, THAT IS THE SOURCE. Another page only when the own site does not state it.\n`
    + `WHAT IS THE SAVING AS THE BRAND STATES IT. "Up to 20%" stays "up to 20%". Never round up, never add a figure the result does not give.\n`
    + `WHO is who gets it, HOW is what they do to get it, in the order they do it. Leave either empty rather than guess.\n`
    + `WHERE is empty unless a result says whether it works in the shop, online or both.\n`
    + `CATCH is what stops a VISITOR in particular: a voucher that only works in the country you joined in, a student card that has to be Danish, a club that wants a Danish phone number or MitID. Empty if no result states one. Never invent a catch.\n`
    + `TOWNS is empty for a chain or a scheme that works in every shop the brand has. Name the town only for a single local place.\n`
    + `A BRAND'S CLAIM ABOUT ITSELF IS THEIRS. Write "they say their prices are the lowest in Denmark", never "the lowest prices in Denmark".\n`
    + `LEAVE OUT: coupon code sites and anything they list, one-off sales, campaign codes with an end date, and anything that is not a shop, café, restaurant or chain a visitor can walk into or order from.\n`
    + `A PLACE TO EAT is "cheap" only when a result gives a price for something on its menu, and WHAT is that price as the result states it, with the dish: "a burger under 100 kr at lunch". Never "cheap food" with no figure.\n`
    + (one ? `ONE PLACE ONLY: return rows about ${one} and nothing else.\n` : "")
    + `Write plain English. No dashes of any kind. An empty list is a normal answer.\n\n${list}`;
};

// ── WHAT COMES BACK, SETTLED ────────────────────────────────────────
//
// Every rule the prompt states that can be enforced is enforced here, so a
// model that ignores one is caught by code rather than trusted.
export const settleGems = (json, results = [], { today = new Date(), only = "" } = {}) => {
  const one = fold(only);
  const list = Array.isArray(json?.gems) ? json.gems : [];
  const at = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const out = [];
  const dropped = { noSource: 0, coupon: 0, shape: 0, other: 0 };
  const seen = new Map();
  for (const raw of list) {
    const i = Number(raw?.source);
    const hit = Number.isInteger(i) && i >= 0 && i < results.length ? results[i] : null;
    if (!hit || !/^https?:\/\//i.test(clean(hit.url))) { dropped.noSource += 1; continue; }
    if (isCouponSite(hit.url)) { dropped.coupon += 1; continue; }
    const g = shapeGem({ ...raw, source: clean(hit.url), checkedAt: at });
    if (!g.name || !g.kind || (g.kind === "scheme" && !g.what)) { dropped.shape += 1; continue; }
    // A name search that comes back with the place next door is a different
    // run's answer, not this one's.
    if (one && !fold(g.name).includes(one) && !one.includes(fold(g.name))) { dropped.other += 1; continue; }
    // On a name lookup every row is about the one place, whatever the model
    // calls it: "Sporvejen" and "Restaurant Sporvejen" are the same row.
    const key = one ? `${one}|${g.kind}` : `${fold(g.name)}|${g.kind}`;
    const own = isOwnSite(g.source, g.name);
    // THE PLACE'S OWN PAGE WINS. Oliver, 21 Sep 2026: "the pipeline will
    // always prioritise the home website, yes?" It did not: the first row the
    // model listed was kept, whoever's page it was. Now a later row for the
    // same place on its own site takes the earlier one's place.
    if (seen.has(key)) {
      const at = seen.get(key);
      if (own && !out[at].own) out[at] = { ...g, own };
      continue;
    }
    seen.set(key, out.length);
    out.push({ ...g, own });
  }
  return { gems: out, dropped };
};

// What the Studio says about a run, in one line per thing he should know.
export const gemRunNotes = ({ gems = [], dropped = {} } = {}) => {
  const out = [];
  if (!gems.length) out.push("Nothing came back that a result states.");
  if (dropped.coupon) out.push(`${dropped.coupon} left out for coming off a coupon site.`);
  if (dropped.noSource) out.push(`${dropped.noSource} left out for pointing at no result.`);
  if (dropped.other) out.push(`${dropped.other} left out for being about a different place than the one you named.`);
  if (dropped.shape) out.push(`${dropped.shape} left out for having no name, no kind, or a discount with no saving.`);
  const notOwn = gems.filter(g => !g.own).length;
  if (notOwn) out.push(`${notOwn} ${notOwn === 1 ? "comes" : "come"} from a page that is not the brand's own, unticked until you have looked.`);
  return out;
};

// ── AND ON THE DAY A GUIDE PASSES ONE ───────────────────────────────
//
// Oliver, 21 Sep 2026, on "adding one on the day a guide passes a matching
// shop": "Then do that."
//
// COMPUTED WHEN THE GUIDE IS READ, NEVER WRITTEN INTO IT. A saved guide is
// opened weeks after it was built, and a gem that has gone stale since, or
// one published since, should be what the reader sees then. So nothing here
// touches the build, costs a call or adds a second to it.
//
// ONE A DAY AT MOST, AND NEVER THE SAME ONE TWICE. The guide was already told
// it looks like an advertisement page, and a line per shop would do it again.
//
// A CHAIN IS NOT ON A DAY BY TOWN. A gem with no town works in every shop the
// brand has, and the guide does not know where those shops are, so by town
// it would sit on every day of every trip. It is on a day only when that day
// stops at it by name. The Cheap gems page is where the chains live.
//
// What a day stops at by name comes first, then a town match with the
// discount ahead of the cheap place, which is the order of the page.
const gemKey = (g) => `${fold(g.name)}|${g.kind}`;

export const gemsForGuide = (days = [], rows = [], { today = new Date() } = {}) => {
  const live = (Array.isArray(rows) ? rows : []).filter(r => gemLive(r, today));
  const used = new Set();
  const rank = (g) => (g.kind === "scheme" ? 0 : 1);
  return (Array.isArray(days) ? days : []).map(day => {
    const stops = Array.isArray(day?.stops) ? day.stops : [];
    const byName = new Map(stops.map(s => [fold(s?.name), clean(s?.town)]));
    const townsHere = [...new Set(stops.map(s => clean(s?.town)).filter(Boolean))];
    const free = live.filter(g => !used.has(gemKey(g)));
    const atStop = free.find(g => byName.has(fold(g.name)));
    let pick = atStop ? { gem: atStop, town: byName.get(fold(atStop.name)) || (atStop.towns || [])[0] || "" } : null;
    if (!pick) {
      const inTownHere = free
        .filter(g => Array.isArray(g.towns) && g.towns.length)
        .map(g => ({ gem: g, town: townsHere.find(t => g.towns.some(x => fold(x) === fold(t))) || "" }))
        .filter(x => x.town)
        .sort((a, b) => rank(a.gem) - rank(b.gem) || fold(a.gem.name).localeCompare(fold(b.gem.name)));
      pick = inTownHere[0] || null;
    }
    if (pick) used.add(gemKey(pick.gem));
    return pick;
  });
};

// The line's heading, which is all the words the guide adds of its own.
export const gemHeading = (pick) => (pick?.town ? `Cheap gem in ${pick.town}` : "Cheap gem");
