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
import { fold, containsName } from "./danishNames";
import { isNeverOwnSite } from "./sourcePolicy";
// The one hostOf, which the suite holds to one declaration across utils.
import { hostOf, textHasPrice, menuImagesToRead } from "./pageScan";
import { haversineKm } from "./helpers";

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

// ── AND A COMPANY DATABASE IS NOT A SOURCE EITHER ───────────────────
//
// Oliver, 22 Sep 2026, of a published Jem & Fix row whose link opened a
// zoominfo company profile: "not only is it ridiculous that it opens some
// zoom page". These sites sell contact data about companies. They carry a
// revenue figure and a phone number, never what a shop charges, and a
// traveller who taps the link lands on a sales page. Same rule as a coupon
// site: not a page a claim about prices may be checked against.
export const DATA_SITE = /zoominfo|crunchbase|dnb\.com|dun.?bradstreet|bloomberg|pitchbook|owler|glassdoor|indeed|linkedin|proff\.|virk\.dk|cvrapi|biq\.dk|nordicnet|kompass|yellowpages|degulesider|krak\./i;
export const isDataSite = (url) => {
  const h = hostOf(url);
  return !!h && DATA_SITE.test(h);
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

// ── AND THE SAME BRAND IN ANOTHER COUNTRY IS ANOTHER SHOP ───────────
//
// Oliver, 24 Sep 2026, on his own Flying Tiger run: "NO.. IT SAYS 20%!!!"
// He was right. He wrote "20% velkomstrabat", and the pass came back with
// "their page says 10% off your first purchase, so the page is what stands
// here", off https://flyingtiger.id/en/pages/first-purchase. That is Flying
// Tiger INDONESIA. Their Danish club page says members get "op til 20% rabat"
// in store, and the 10% is a separate newsletter offer somewhere else
// entirely. So a correct local was overruled by the wrong country's shop.
//
// A chain runs different offers in every market it trades in, so a page on
// another country's storefront is not evidence about a Danish one whatever
// the brand name on it. Judged by the domain ending, which is what a country
// storefront is: .dk is here, .com and the other global endings are the
// brand, and any other country code is somebody else's market.
//
// The generic ones are the trap in the other direction: .io, .co, .me, .ai,
// .tv and .fm are country codes nobody uses as one, and refusing those would
// throw away real brand sites.
const GENERIC_CC = new Set(["io", "co", "me", "ai", "tv", "fm", "app", "dev", "shop", "store"]);
export const isForeignStore = (url) => {
  const h = hostOf(url);
  if (!h) return false;
  const end = h.split(".").pop();
  if (!/^[a-z]{2}$/.test(end)) return false;
  return end !== "dk" && !GENERIC_CC.has(end);
};

export const isOwnSite = (url, name) => {
  const h = hostOf(url);
  if (!h || isNeverOwnSite(url) || isCouponSite(url) || isForeignStore(url)) return false;
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

// Who a shop sells to, when it sells to one group only. Empty is everybody.
export const AUDIENCES = ["women", "men", "kids"];
export const AUDIENCE_LABEL = { women: "Womenswear", men: "Menswear", kids: "Children's" };
const AUDIENCE_WORDS = [
  ["women", /\b(?:dame(?:t(?:ø|oe)j|mode|sko)?|damer|women'?s?wear|women'?s|ladies|kvinde\w*)\b/i],
  ["men", /\b(?:herre(?:t(?:ø|oe)j|mode|sko)?|herrer|men'?s?wear|men'?s|mands\w*)\b/i],
  ["kids", /\b(?:b(?:ø|oe)rn\w*|kids?|childre\w*|child'?s?wear|baby|babies)\b/i],
];

// One group or none. A shop that names two is a shop for both, and a guess
// between them would be worse than saying nothing.
export const audienceIn = (text) => {
  const t = clean(text);
  if (!t) return "";
  const hits = AUDIENCE_WORDS.filter(([, re]) => re.test(t)).map(([k]) => k);
  return hits.length === 1 ? hits[0] : "";
};

// What the confirming pass may come back with about a sentence he wrote.
// Three answers and no fourth: the page says it, the page says something
// else, or no page says anything either way.
export const SAID_CHECKS = ["confirmed", "contradicted", "notfound"];

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
    // ── AND WHO THE SHOP IS ACTUALLY FOR ────────────────────────────
    //
    // Oliver, 24 Sep 2026, of a gem he had published himself: "i just realised
    // this is Women-only.." Checked the same day: mschcopenhagen.dk sells
    // "elegant og moderne dametøj" and nothing else.
    //
    // A 15% student discount is a real saving and useless to half the people
    // it reaches, and nothing in this row could say so: `who` answers who gets
    // the DISCOUNT, and the answer there is students. This answers who the
    // SHOP is for, which decides whether a recommendation is worth making at
    // all. Empty means everybody, which is most shops.
    audience: AUDIENCES.includes(clean(t.audience)) ? clean(t.audience) : "",
    // What it is FOR, so the page can be filtered by it. Empty is allowed and
    // is read off the words instead: see gemCategory.
    category: GEM_CATEGORIES.includes(clean(t.category)) ? clean(t.category) : "",
    desc: clean(t.desc).slice(0, 400),
    source: clean(t.source),
    checkedAt: clean(t.checkedAt).slice(0, 10),
    // ── WHAT HE SAID, IN HIS WORDS ──────────────────────────────────
    //
    // Oliver, 23 Sep 2026: "If I write something, then also let me be able to
    // write the discount. Then the AI can research exactly what I'm refering
    // to, and then confirm it into a draft."
    //
    // He is from here and has stood in the bar. The pass was built to
    // DISCOVER a saving off a page, and discovery is the wrong instrument for
    // a thing he already knows: it went looking for Barkowski and came back
    // with a board game cafe. So when this field carries a sentence, the pass
    // stops discovering and CONFIRMS that sentence instead.
    said: clean(t.said).slice(0, 240),
    // What the confirming came to. Empty when he said nothing.
    saidCheck: SAID_CHECKS.includes(clean(t.saidCheck)) ? clean(t.saidCheck) : "",
    // The page's own words, when they disagree with his. See saidLine: on
    // what a thing COSTS the page wins, and this is what it wins with. It
    // exists only where there is a disagreement, so a row that agrees with
    // its page carries none of this whatever it was handed.
    saidPage: clean(t.saidCheck) === "contradicted" ? clean(t.saidPage).slice(0, 240) : "",
  };
};

// ── WHOSE SENTENCE A CARD IS PRINTING ───────────────────────────────
//
// THE RULE, agreed with him on 23 Sep 2026: on how a thing IS, he wins. On
// what it COSTS, the page wins. He has been in these places and the page has
// not, so his sentence carries a card that no page states. A figure is the
// other way round: a price he remembers from March is a price that moved, and
// when a page states a different one the card prints the page's and says so.
//
// A reader is never shown a saving without being told who said it.
export const saidLine = (g = {}) => {
  const said = clean(g?.said);
  if (!said) return "";
  // ── AND IT IS "LOCALS", NEVER "A LOCAL" ─────────────────────────
  //
  // Oliver, 23 Sep 2026: "I don't mind it saying 'According to locals..' but
  // don't give 'a told said..'". One unnamed person is a rumour with a source
  // attached to it, and a reader has no way to weigh it. Locals in the plural
  // is a place's own reputation, which is what this is and what it is worth.
  if (g.saidCheck === "confirmed") return "Known to locals, and their own page states it too.";
  if (g.saidCheck === "contradicted") {
    const page = clean(g.saidPage);
    return page
      ? `Locals say "${said}". Their page says ${page}, so the page is what stands here.`
      : `Locals say "${said}". Their page says otherwise, so the page is what stands here.`;
  }
  return "According to locals. No page of theirs states it, so ask when you are there.";
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
  // ── A SENTENCE OF HIS IS A SOURCE, AND SAYS SO ON THE CARD ────────
  //
  // Everything below this holds a row to a page, for the reason the header
  // gives: a saving nobody can check is a rumour. A local who has stood in
  // the bar is not a rumour, and Barkowski and Leanowski give their discount
  // off a blackboard that is on no page anywhere. So a row he wrote may go up
  // with no page behind it, and the card then credits locals, rather
  // than letting his word pass for the brand's. The check stays: what the
  // pass found is what decides which of the two the card prints.
  const onHisWord = !!g.said && g.saidCheck !== "confirmed" && !/^https:\/\//i.test(g.source);
  if (onHisWord) {
    out.push("No page of theirs states this, so the card says it is according to locals rather than showing it as theirs.");
  } else if (!/^https:\/\//i.test(g.source)) {
    out.push("No https page behind it. A saving nobody can check is a rumour.");
    blocks = true;
  } else if (isCouponSite(g.source)) {
    out.push(`${hostOf(g.source)} is a coupon site. Those print figures the brand never offered.`);
    blocks = true;
  } else if (isDataSite(g.source)) {
    out.push(`${hostOf(g.source)} is a company database, not the shop. It sells contact data and says nothing about what anything costs.`);
    blocks = true;
  } else if (isForeignStore(g.source)) {
    // Named rather than folded into "not their own site", because the fix is
    // different: find the Danish page, do not go looking for a better source.
    out.push(`${hostOf(g.source)} is ${g.name || "this brand"} in another country, and a chain runs a different offer in every market. Find their Danish page.`);
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
  if (g.said && g.saidCheck === "contradicted") {
    out.push(`Their page does not say what you said. ${clean(g.saidPage) || "It states something else"}, and that is what the card prints.`);
  }
  if (g.kind === "scheme" && !g.what) { out.push("A discount with no saving named."); blocks = true; }
  if (g.kind === "scheme" && !g.who) out.push("Nobody named as who gets it.");
  if (g.kind === "scheme" && !g.how) out.push("Nothing on how to get it, which is the half a visitor is missing.");
  if (g.audience) {
    out.push(`Read as ${AUDIENCE_LABEL[g.audience].toLowerCase()} only. Every card and every reply will say so, so check that is right before it goes up.`);
  }
  if (!g.where) out.push("Not known whether it works in the shop, online or both, so the page says nothing about it.");
  const ago = checkedAgo(g, today);
  if (ago == null) { out.push("No date it was checked."); blocks = true; }
  else if (ago > STALE_DAYS) {
    // A row standing on his word has no page to have moved, so it is told
    // the other way round: what he saw is old and the place should be asked.
    out.push(onHisWord
      ? `Checked ${ago} days ago, and it is standing on what you were told. Ask them again before it stays up.`
      : `Checked ${ago} days ago, so the page no longer shows it. Check it again.`);
  }
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

// ── WHERE A GEM IS, AND HOW FAR THAT IS FROM THE READER ─────────────
//
// Oliver, 22 Sep 2026: "also add location, and how far it is from 'you'."
//
// The towns the row names, and a distance only when two things are true: we
// hold a point for one of those towns, and the reader is somewhere we can
// measure from. A row with no town is a chain, and a chain is wherever they
// are, which is the honest line for it.
export const gemWhere = (g = {}, { point = null, me = null } = {}) => {
  const towns = (Array.isArray(g?.towns) ? g.towns : []).map(clean).filter(Boolean);
  if (!towns.length) return "All over Denmark";
  const where = towns.join(", ");
  const at = typeof point === "function" ? point(towns[0]) : null;
  const lat = Number(me?.lat), lon = Number(me?.lon);
  if (!at || !Number.isFinite(lat) || !Number.isFinite(lon)) return where;
  const km = Math.round(haversineKm({ lat, lon }, { lat: Number(at.lat), lon: Number(at.lon) }));
  if (!Number.isFinite(km)) return where;
  return `${where} · ${km < 2 ? "~2" : `~${km}`} km from you`;
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
// The words worth searching out of a sentence he wrote. What the pass needs
// is the part of "students get 20% off before ten" that would be printed on
// a page, so the small words and the figures with a percent on them go and
// what is left is the shape of the deal. Three at most: a search of eleven
// words matches nothing.
const SAID_SKIP = /^(a|an|and|the|at|on|in|for|to|of|is|are|you|your|get|gets|give|gives|giving|with|when|if|they|their|them|it|its|there|here|has|have|off|from|but|so|all|any|every|per|som|og|er|det|den|de|du|man|kan|til|med|for|på|i|en|et)$/i;
export const saidWords = (said = "") =>
  clean(said)
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(w => w && w.length > 2 && !/^\d+$/.test(w) && !SAID_SKIP.test(w))
    .slice(0, 3);

export const gemSearchesFor = (name = "", place = "", said = "") => {
  const n = clean(name);
  if (!n) return [];
  const p = clean(place);
  const at = p && !/^(danmark|denmark)$/i.test(p) ? ` ${p}` : "";
  // ── CONFIRMING SEARCHES THE SENTENCE, NOT THE CATEGORY ────────────
  //
  // Oliver, 23 Sep 2026, of trying it by hand: "It did look up the place, but
  // it talked about some board-free shit." Five searches for student
  // discounts and menu prices are five chances to come back with the wrong
  // business. When he has written what the deal is, the searches are the
  // place's own page and the words of his sentence, and nothing else.
  const heard = saidWords(said);
  if (heard.length) {
    return [`${n}${at}`, `${n} ${heard.join(" ")}`, `${n}${at} ${heard[0]}`, `${n} rabat tilbud`];
  }
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
export const GEMS_PROMPT = (place, results = [], { only = "", said = "" } = {}) => {
  const where = clean(place) || "Denmark";
  const one = clean(only);
  const heard = clean(said);
  const list = results.map((r, i) => `[${i}] ${clean(r.title)}\n${clean(r.url)}\n${clean(r.snippet)}`).join("\n\n");
  return `You are finding cheap gems for travellers in ${where}. Two kinds, and nothing else:\n\n`
    + `"scheme": a discount a shop, café or chain gives to anybody who does one thing first. A student card, joining a club, an app, a card. Only if a result below says so.\n`
    + `"cheap": a place that is cheap without doing anything, and only when a result below says it is.\n\n`
    + `Respond with ONLY strict JSON: {"gems":[{"name":"","kind":"scheme|cheap","category":"food|shop|stay|travel|other","towns":[],"what":"","who":"","how":"","where":"shop|online|both|","catch":"","desc":"","source":0${heard ? `,"check":"confirmed|contradicted|notfound","pageSays":""` : ""}}]}\n\n`
    + `SOURCE IS THE NUMBER OF THE RESULT that says it. A gem no result states does not come back.\n`
    + `WHEN THE PLACE'S OWN SITE SAYS IT TOO, THAT IS THE SOURCE. Another page only when the own site does not state it.\n`
    + `WHAT IS THE SAVING AS THE BRAND STATES IT. "Up to 20%" stays "up to 20%". Never round up, never add a figure the result does not give.\n`
    + `WHO is who gets it, HOW is what they do to get it, in the order they do it. Leave either empty rather than guess.\n`
    + `WHERE is empty unless a result says whether it works in the shop, online or both.\n`
    + `CATCH is what stops a VISITOR in particular: a voucher that only works in the country you joined in, a student card that has to be Danish, a club that wants a Danish phone number or MitID. Empty if no result states one. Never invent a catch.\n`
    + `TOWNS is empty for a chain or a scheme that works in every shop the brand has. Name the town only for a single local place.\n`
    + `A RANKING A BRAND GIVES ITSELF IS THEIRS: write "they say their prices are the lowest in Denmark", never "the lowest prices in Denmark". WHAT THE SHOP IS is not a ranking and is stated plainly: "low prices are central to this self service builders merchant chain", never "they say low prices are central". Hedge a claim nobody can check, not a description of the shop.\n`
    + `LEAVE OUT: coupon code sites and anything they list, one-off sales, campaign codes with an end date, and anything that is not a shop, café, restaurant or chain a visitor can walk into or order from.\n`
    + `A PLACE TO EAT is "cheap" only when a result gives a price for something on its menu, and WHAT is that price as the result states it, with the dish: "a burger under 100 kr at lunch". Never "cheap food" with no figure.\n`
    + (one ? `ONE PLACE ONLY: return rows about ${one} and nothing else.\n` : "")
    // ── CONFIRMING, WHICH IS NOT DISCOVERING ────────────────────────
    //
    // A discovery prompt asked about Barkowski came back with a board game
    // cafe, because discovery answers "what saving is on these pages" and he
    // was asking "is the saving I know about on these pages". Those are
    // different questions and this is the second one. The answer is one row
    // and a verdict, and a verdict of notfound is a correct answer that still
    // returns the row: gemProblems lets it up on his word and the card says
    // whose word that is.
    + (heard
      ? `\nSOMEBODY WHO HAS BEEN THERE SAYS THIS ABOUT ${one || where}: "${heard}"\n`
        + `YOUR JOB IS THAT SENTENCE AND NOTHING ELSE. Do not go looking for other savings. Return exactly one row, about ${one || "the place named in it"}, and add "check" to it: "confirmed" when a result states the same thing, "contradicted" when a result states something different about the same saving, "notfound" when no result says either way.\n`
        + `ON "confirmed": WHAT is the saving in the result's own words, and source is that result.\n`
        + `ON "contradicted": WHAT is what the RESULT says, not what the sentence says, and "pageSays" is the result's wording of it in under twenty words. The source is that result.\n`
        + `ON "notfound": WHAT is the sentence itself, tidied into a saving, and source is -1. A result about a different business is not a result about this one, and being unable to find a page is not a contradiction.\n`
        + `A RESULT LISTING THE PLACE WITH NO MENTION OF THE SAVING IS notfound, not contradicted. Only a result that states a different saving of the same sort contradicts.\n`
        + `Fill who, how, where, catch, towns, category and desc from the results where they say it, and leave them empty where they do not.\n`
      : "")
    + `Write plain English. No dashes of any kind. An empty list is a normal answer.\n\n${list}`;
};

// ── WHAT COMES BACK, SETTLED ────────────────────────────────────────
//
// Every rule the prompt states that can be enforced is enforced here, so a
// model that ignores one is caught by code rather than trusted.
export const settleGems = (json, results = [], { today = new Date(), only = "", said = "" } = {}) => {
  const one = fold(only);
  const heard = clean(said);
  const list = Array.isArray(json?.gems) ? json.gems : [];
  const at = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const out = [];
  const dropped = { noSource: 0, coupon: 0, shape: 0, other: 0 };
  const seen = new Map();
  for (const raw of list) {
    const i = Number(raw?.source);
    const hit = Number.isInteger(i) && i >= 0 && i < results.length ? results[i] : null;
    // WHAT THE PASS MADE OF HIS SENTENCE. Read before the source gate,
    // because notfound is the one verdict that comes back with no page and
    // is still an answer. A model that returns notfound while pointing at a
    // page is taken at its word on the verdict and keeps the page.
    const check = heard && SAID_CHECKS.includes(clean(raw?.check)) ? clean(raw.check) : (heard ? "notfound" : "");
    const saidBits = heard
      ? { said: heard, saidCheck: check, saidPage: check === "contradicted" ? clean(raw?.pageSays) : "" }
      : {};
    if (!hit || !/^https?:\/\//i.test(clean(hit.url))) {
      if (!heard || check !== "notfound") { dropped.noSource += 1; continue; }
    } else if (isCouponSite(hit.url) || isDataSite(hit.url) || isForeignStore(hit.url)) { dropped.coupon += 1; continue; }
    const from = check === "notfound" ? "" : clean(hit?.url);
    const g = shapeGem({ ...raw, ...saidBits, source: from, checkedAt: at });
    // WHO THE SHOP IS FOR, off the page it was read from, when the model did
    // not say. The row's own words first, because they describe the shop; the
    // result's snippet second, because that is where "dametøj" usually sits.
    if (!g.audience) {
      g.audience = audienceIn([g.name, g.what, g.desc].map(clean).join(" "))
        || audienceIn(clean(hit?.snippet));
    }
    // HIS SENTENCE IS THE SAVING when no page states one. The row is about a
    // thing he watched happen, and a row that came back with the verdict and
    // an empty WHAT would be dropped for having no saving named.
    if (heard && check === "notfound" && g.kind === "scheme" && !g.what) g.what = heard;
    if (!g.name || !g.kind || (g.kind === "scheme" && !g.what)) { dropped.shape += 1; continue; }
    // A name search that comes back with the place next door is a different
    // run's answer, not this one's.
    // SPACING IS NOT A DIFFERENT PLACE. `only` comes off the host he pasted
    // ("flyingtiger"), and the row comes back named "Flying Tiger Copenhagen",
    // so the two never matched and the only row was dropped as being about
    // somewhere else. Watched on his own run, 24 Sep 2026.
    const tight = (v) => fold(v).replace(/\s+/g, "");
    if (one && !fold(g.name).includes(one) && !one.includes(fold(g.name))
      && !tight(g.name).includes(tight(one)) && !tight(one).includes(tight(g.name))) { dropped.other += 1; continue; }
    // On a name lookup every row is about the one place, whatever the model
    // calls it: "Sporvejen" and "Restaurant Sporvejen" are the same row.
    const key = one ? `${one}|${g.kind}` : `${fold(g.name)}|${g.kind}`;
    const own = !!g.source && isOwnSite(g.source, g.name);
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
  const confirmed = gems.filter(g => g.saidCheck === "confirmed").length;
  if (confirmed) out.push(`${confirmed} ${confirmed === 1 ? "matches" : "match"} what you wrote, on their own page.`);
  const against = gems.filter(g => g.saidCheck === "contradicted").length;
  if (against) out.push(`${against} ${against === 1 ? "has" : "have"} a page saying something else, and the page is what the card prints.`);
  const onWord = gems.filter(g => g.saidCheck === "notfound").length;
  if (onWord) out.push(`${onWord} ${onWord === 1 ? "stands" : "stand"} on your word alone. No page states it, and the card will credit locals.`);
  const notOwn = gems.filter(g => !g.own && !g.said).length;
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

// ── AND THE CHAT COULD NOT SEE ANY OF THIS ──────────────────────────
//
// Oliver, 24 Sep 2026, reading a live reply that named NightPay's catch and
// stopped there: "I guess it doesn't dig into the cheap gems? Because it could
// mention the alternative, which is Barkowski and Leanowski."
//
// He is right, and it was never wired. A published gem reaches the Cheap gems
// page and reaches a guide, through gemsForGuide, at the moment the guide is
// read. The CHAT saw none of them, so it could say "that app needs a Danish
// number" and could not say "these two give a real discount to anybody", which
// is the answer to the sentence it had just written.
//
// PICKED BEFORE THE CALL, like the local notes beside it: code chooses the few
// that fit what was asked, the model never queries anything, and a
// conversation about lunch never meets a discount on shoes.
const TOPICS = [
  // Both sides of each pair, because the words a traveller uses and the words
  // a gem is written in are not the same vocabulary. "Where do people go out"
  // has to reach a bar with a beer offer on it.
  { key: "night", ask: /\b(?:night|nights|nightlife|bar|bars|beer|beers|drink|drinks|club|clubs|pub|pubs|cocktail|cocktails|go(?:ing)? out|party)\b/i,
    gem: /\b(?:bar|beer|(?:ø|oe)l|drink|club|pub|cocktail|happy hour|nightlife)\b/i },
  { key: "eat", ask: /\b(?:eat|eating|food|restaurant|restaurants|lunch|dinner|breakfast|brunch|hungry|meal|meals|cheap eats)\b/i,
    gem: /\b(?:restaurant|caf[eé]|bakery|bager\w*|burger|pizza|kebab|shawarma|food|mad|frokost|lunch|dinner|brunch|sm(?:ø|oe)rrebr(?:ø|oe)d|p(?:ø|oe)lse\w*|hot ?dog|grill\w*|takeaway|buffet)\b/i },
  { key: "shop", ask: /\b(?:shop|shopping|shops|buy|clothes|clothing|souvenir|souvenirs|design|second ?hand|vintage|store|stores)\b/i, gem: SHOP_WORDS },
  { key: "travel", ask: /\b(?:train|trains|bus|buses|coach|coaches|ferry|ticket|tickets|fare|fares|transport|getting around|metro|bike|bikes)\b/i, gem: TRAVEL_WORDS },
  { key: "stay", ask: /\b(?:hotel|hostel|stay|staying|sleep|accommodation|bed|beds|room|rooms|camping)\b/i, gem: STAY_WORDS },
  { key: "student", ask: /\b(?:student|students|studerende|studie\w*)\b/i, gem: /\b(?:student|studie\w*|studerende)\b/i },
];

// Two at most. A reply listing four discounts is an advertisement, which is
// the thing this page was built not to be, and the guide's own gem rule
// already holds itself to one a day for the same reason.
export const MAX_CHAT_GEMS = 2;

export const gemsForChat = (travellerText = "", rows = [], { town = "", today = new Date(), max = MAX_CHAT_GEMS } = {}) => {
  const said = clean(travellerText);
  if (!said) return [];
  const here = fold(clean(town));
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!gemLive(row, today)) continue;
    const g = shapeGem(row);
    const towns = (g.towns || []).map(fold);
    // A gem with no town is a chain and is wherever they are. One with a town
    // belongs to a conversation about that town, and nowhere else.
    if (towns.length && !towns.some(t => t === here || containsName(said, t))) continue;
    const text = [g.name, g.what, g.who, g.how, g.desc, g.category].map(clean).join(" ");
    // Named outright is a match whatever the subject: they asked about it.
    const named = !!g.name && containsName(said, g.name);
    const topic = TOPICS.some(t => t.ask.test(said) && t.gem.test(text));
    if (!named && !topic) continue;
    out.push(g);
    if (out.length >= max) break;
  }
  return out;
};

// ── HANDED OVER AS CHECKED, WHICH IS WHAT THEY ARE ──────────────────
//
// The difference from a local's note beside it: a gem carries a page and the
// day it was read, and it does not go up without them. So the chat may state
// one as a fact, and the one thing it may not do is improve the figure.
export const gemsChatBlock = (list = []) => {
  const gems = (Array.isArray(list) ? list : []).filter(Boolean);
  if (!gems.length) return "";
  const line = (g) => {
    const bits = [`${g.name}: ${g.what || "cheaper than it looks"}`];
    if (g.who) bits.push(`for ${g.who}`);
    if (g.how) bits.push(`to get it: ${g.how}`);
    // BEFORE THE CATCH, because this one decides whether the rest matters.
    if (g.audience) bits.push(`${AUDIENCE_LABEL[g.audience]} only, so say that before you recommend it`);
    if (g.where === "shop") bits.push("in the shop only, never online");
    if (g.catch) bits.push(`THE CATCH: ${g.catch}`);
    if (g.towns?.length) bits.push(`only in ${g.towns.join(", ")}`);
    else bits.push("everywhere they have a branch");
    bits.push(`checked ${g.checkedAt}`);
    return `- ${bits.join(". ")}`;
  };
  return `\n── CHEAP GEMS GEMLYX HAS CHECKED, ON WHAT THEY JUST ASKED ABOUT ──\n`
    + `Each one was read off the brand's own page and carries the day it was checked, so unlike a local's word these may be stated as fact.\n`
    + `USE THE FIGURE AS IT IS WRITTEN. Never round it, never turn "up to 20%" into "20%", and never add a price that is not here.\n`
    + `THE CATCH GOES WITH IT, always, in the same breath. A discount a visitor cannot use is worse than no discount, and the catch is the half they will not find out until they are standing there.\n`
    + `ONE OF THESE IS PLENTY IN A REPLY, and none at all is fine. A list of savings reads as an advertisement, which is the one thing this is not.\n\n`
    + `${gems.map(line).join("\n")}\n`;
};
