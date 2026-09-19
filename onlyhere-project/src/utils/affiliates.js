import { BOOKING_AFFILIATE_ID, BOOKING_CJ_LINK, BOOKING_CJ_DEEP_LINKS_WORK, PARTNER_ADS_PARTNER_ID, PARTNER_ADS_STAY_BANNER, PARTNER_ADS_GEAR_BANNER, PARTNER_ADS_BANNERS, TICKETMASTER_AFFILIATE_TEMPLATE, TIQETS_BROWSE_LINK, TIQETS_AFFILIATE_TEMPLATE, CAR_RENTAL_LINK, WEGOTRIP_LINK, WEGOTRIP_AFFILIATE_TEMPLATE , TRIPCOM_ALLIANCE_ID, TRIPCOM_SID, GETYOURGUIDE_PARTNER_ID, GETYOURGUIDE_CAMPAIGN, BAJABIKES_REFERRAL_ID, BAJABIKES_BANNERS, BAJABIKES_RENTAL_SLUG } from "../config";
// hostOf, not a fourth copy of it. See pageScan.js, and see the four other
// functions this codebase has already found existing twice.
import { hostOf } from "./pageScan";
// externalHref, not a second scheme guard written here. It is the one function
// in this codebase that decides whether a string is a link a reader may be sent
// to, and outboundLink below is the door every rendered link goes through, so
// the two belong in one place. helpers.js imports nothing that reaches back
// here, checked before this line was written.
import { externalHref } from "./helpers";
import { t as uiT, DEFAULT_UI_LANGUAGE } from "./uiLanguage";

// ── WHERE TO STAY LINKS (Oliver, 7 Aug: "on accommodation, put booking.com
// and AirBnB as affiliate links for me") ─────────────────────────────
//
// ONE OF THESE TWO CAN PAY AND THE OTHER CANNOT, and it matters that the code
// says so rather than quietly implying both do.
//
//   Booking.com  real affiliate programme. Every link carries aid=<id> once
//                BOOKING_AFFILIATE_ID is filled in in src/config.js. Until then
//                the parameter is simply left off and the link still works.
//   Airbnb       Airbnb Associates CLOSED in March 2021 and has not reopened.
//                There is no public affiliate programme and no partner
//                parameter to attach, so this is an ordinary search link. It is
//                here because it is genuinely useful to a traveler, not because
//                it earns anything. Do not add a made-up ref/aid parameter to
//                it: it would not pay, and it would read as a tracking tag.
//
// If the goal is rental income specifically, the programmes that ARE open for
// that are Vrbo and Expedia. Say the word and this file grows a third builder.
//
// The Booking URL shape is deliberately identical to the one GuidePage already
// builds for its "Where to stay" card, which carries a standing rule never to
// remove it. That logic now lives here so the two cannot drift apart.

const q = (s) => encodeURIComponent(String(s || "").trim());

// ── THE LINE THIS FILE MUST NOT CROSS ───────────────────────────────
//
// Directive (EU) 2026/1024 rewrote the Package Travel Directive. Adopted
// 29 April 2026, in force 28 May 2026, member states apply it from
// 29 March 2029. It matters to this file now rather than in 2029, because what
// it changed is the ARCHITECTURE that decides whether a website is a travel
// organiser, and architecture is cheap to keep and expensive to unwind.
//
// LINKED TRAVEL ARRANGEMENTS ARE ABOLISHED as a separate, lighter category.
// What used to be an LTA is now inside the definition of a package, and a
// package makes the trader an ORGANISER: liable for the performance of the
// whole trip, and required to hold insolvency protection covering travellers'
// payments, repatriation, outstanding refunds and unredeemed vouchers.
//
// The condition that reaches a site like this one is the click-through limb.
// A package now exists where separate contracts with different providers are
// bought through linked online booking processes such that
//
//   THE FIRST TRADER TRANSMITS THE TRAVELLER'S PERSONAL DATA TO ANOTHER TRADER
//   and within 24 hours of the first booking a further travel service is bought.
//
// So the thing that would make Gemlyx an organiser is not the affiliate money
// and not the recommendation. It is HANDING THE TRAVELLER'S DETAILS ACROSS.
//
// ── WHAT THAT MEANS FOR THE BUILDERS BELOW ──────────────────────────
//
// Every link this file produces is an ordinary outbound link with a partner's
// tracking marker on it. Nothing here carries a name, an email address, a phone
// number, an account id or a booking reference, and nothing here posts a form
// on somebody's behalf. That is what keeps these links a referral rather than a
// linked booking process, and it is a property to defend rather than a detail.
//
// THE CLOSEST THING TO THE LINE IS ALREADY HERE, and it is worth naming
// honestly rather than filing under safe. `bookingUrl` and `airbnbUrl` put the
// traveller's DATES and PARTY SIZE into a search URL. A pre-filled search is a
// long way from a pre-filled booking: no identifier crosses, the traveller
// still searches, chooses and contracts on the other site, and dates alone do
// not identify anybody. But it is the same direction of travel as the limb
// above, and if a future version pre-fills a name, an email or a checkout, this
// comment is the thing that should have stopped it.
//
// The "bookable itinerary" in the fifty point review is exactly that future
// version. It is a good product idea and it is the one feature on the roadmap
// that can turn this app into a travel organiser with an insolvency bond. Build
// it as a handoff, never as a transfer.
//
// NOT LEGAL ADVICE, and the dates above are worth re-checking against the
// Danish transposition when it lands. Recorded so the constraint is visible at
// the point where it would be broken.

// Dates are optional. A search with no dates is still a useful search, and a
// half-filled date range is worse than none, so both must be present or neither.
const dateRange = (checkin, checkout) =>
  checkin && checkout ? { checkin, checkout } : {};

// ── A HOTEL NAME IS NOT AN ADDRESS ──────────────────────────────────
//
// Oliver, 26 Aug 2026, with a screenshot of the Limfjord guide's own link:
// "you picked a hotel that wasn't available for that date." What Booking
// actually returned was HOTEL PHØNIX IN HOLSTEBRO — a different hotel, in a
// different town, 140 km from the one the guide is talking about, which is in
// Aalborg. It then reported that the Holstebro one had no room that weekend,
// which is true and completely beside the point.
//
// The search string was `${name}, Denmark`. Denmark has more than one Hotel
// Phønix, so a bare name and a country is not a query that identifies a
// building. `near` is the town, and it is the difference between a link that
// opens the right property and one that opens a plausible stranger.
//
// AND HE IS RIGHT THAT THE AFFILIATE IS NOT THE ISSUE: "I don't know if being
// affiliated to booking will help this situation." It would not. An aid
// parameter on this URL would have earned a commission on the wrong hotel.
//
// Skipped when the area already names the town, so "Aalborg, Aalborg, Denmark"
// cannot happen — Booking treats a repeated token as a weaker match, not a
// stronger one.
const withTown = (area, near) => {
  const a = String(area || "").trim();
  const t = String(near || "").trim();
  if (!t) return a;
  if (a.toLowerCase().includes(t.toLowerCase())) return a;
  return `${a}, ${t}`;
};

// ── "A 'GOOD HOTEL' OR 'BUDGET HOTEL'" ──────────────
//
// Oliver, 18 Sep 2026: "everytime they can pick a hotel make a 'good hotel' or
// 'budget hotel'. And in the Aarhus one, that would be replacing the 'good
// hotel'."
//
// Booking's own sort keys, on the search this file already builds. They live
// here rather than at the render sites, so the day Booking renames one there is
// one line to change instead of four.
//
// AN UNKNOWN SORT KEY DEGRADES RATHER THAN BREAKS, which is why this is safe to
// ship before anyone has pressed it: Booking ignores a parameter it does not
// recognise and returns its default order, so the worst case is an ordinary
// search that still lands on the right town on the right dates. Worth pressing
// both once to see the sort come up on the page, because that is the only way
// to know it is honoured.
//
// NOT a price filter. A filter can empty a page, and "budget" returning no
// hotels at all in a small town would be worse than the same list in a
// different order.
export const STAY_ORDER = { good: "bayesian_review_score", budget: "price" };

export const bookingUrl = ({ area, near = "", country = "Denmark", checkin, checkout, adults = 2, tier = "" } = {}) => {
  if (!area) return null;
  const d = dateRange(checkin, checkout);
  return `https://www.booking.com/searchresults.html?ss=${q(`${withTown(area, near)}, ${country}`)}` +
    (d.checkin ? `&checkin=${d.checkin}&checkout=${d.checkout}` : "") +
    `&group_adults=${adults}&no_rooms=1` +
    (STAY_ORDER[tier] ? `&order=${STAY_ORDER[tier]}` : "") +
    // ── ONE aid, AND NOT THIS ONE WHILE CJ IS IN FRONT ────────────
    //
    // 19 Sep 2026. His CJ link's destination is
    // `booking.com/?aid=1522413&label=..._cjevent-{eventid}`, and {eventid} is
    // substituted by CJ at its own redirect. An aid this app writes itself
    // arrives with no cjevent behind it: the reader lands in the right place
    // and the click pays nothing. Refused in code rather than in a comment,
    // because the comment above used to say these two were compatible.
    (BOOKING_AFFILIATE_ID && !BOOKING_CJ_LINK ? `&aid=${BOOKING_AFFILIATE_ID}` : "");
};

export const airbnbUrl = ({ area, country = "Denmark", checkin, checkout, adults = 2 } = {}) => {
  if (!area) return null;
  const d = dateRange(checkin, checkout);
  return `https://www.airbnb.com/s/${q(`${area}, ${country}`)}/homes` +
    (d.checkin ? `?checkin=${d.checkin}&checkout=${d.checkout}&adults=${adults}` : `?adults=${adults}`);
};

// Shown next to the links. Deliberately names which one pays: a blanket "these
// are affiliate links" would be inaccurate, and the whole identity of this app
// is not saying things that are not so.
// bookingEarns, not BOOKING_AFFILIATE_ID, from 18 Sep 2026: the programme
// arrived as a CJ click link rather than as an aid number, and every sentence
// below that asked about the aid alone would have gone on telling a reader that
// a link which now pays does not. Either one means Booking pays.
// ── AND THE CJ LINK EARNS AGAIN, BECAUSE THE DOOR CHANGED ───────
//
// This asked the deep-link switch for a few hours on 19 Sep, while the stay
// buttons were unwrapped searches carrying no marker and a disclosure claiming
// a commission would have been a false statement about money.
//
// stayDoorUrl removed that state. The door is now the front page THROUGH the
// click link, which earns and lands exactly where its label says, so the switch
// decides how much the label may promise and not whether anything is paid. Both
// branches of stayDoorUrl above the last one are tracked links.
export const bookingEarns = () => !!(BOOKING_AFFILIATE_ID || BOOKING_CJ_LINK);

export const STAY_DISCLOSURE = bookingEarns()
  ? "Booking.com links may earn Gemlyx a small commission at no cost to you. The Airbnb link earns nothing."
  // ── AND "YET" IS A NOTE TO YOURSELF ─────────────────────────────
  // Oliver, 15 Aug 2026, reading a live town page: "anything that does not look
  // professionel gotta go." This line said "Gemlyx earns nothing from them
  // yet", and the "yet" is the tell: it is a founder's note about a plan,
  // printed under a reader's booking buttons. A reader does not need to know
  // what we intend to monetise later, only whether the link in front of them is
  // paid. It is not, and that is the whole sentence.
  : "Plain search links. Gemlyx earns no commission on these.";

// ── AND THE SENTENCE HAS TO KNOW WHICH LINKS ARE ON SCREEN ──────────
//
// 7 Sep 2026. STAY_DISCLOSURE is a CONSTANT, decided by Booking alone, and it
// was true while Booking was the only paid stay link there could be. Trip.com
// changes that: on a town Trip.com has a city id for, the card now shows a link
// that DOES earn beside two that do not, and a constant cannot say so.
//
// The rule is the one this file already states about every disclosure: name
// which one pays, because a blanket "these are affiliate links" is inaccurate
// and so is silence over a paid one. Four true sentences for four states rather
// than one sentence that is right in some of them.
//
// The constant stays exported and unchanged, because a caller with no Trip.com
// link to show is still asking the question it answers.
export const stayDisclosure = ({ tripcom = false, booking = bookingEarns() } = {}) => {
  if (booking && tripcom) return "The Booking.com and Trip.com links may earn Gemlyx a small commission at no cost to you. The Airbnb link earns nothing.";
  if (booking) return STAY_DISCLOSURE;
  if (tripcom) return "The Trip.com link may earn Gemlyx a small commission at no cost to you. The Booking.com and Airbnb links earn nothing.";
  return STAY_DISCLOSURE;
};

export const affiliateActive = () => bookingEarns();

// ─ AND THE CJ CLICK LINK WRAPS THE SEARCH, NOT THE SITE ─────────
//
// The whole value of the Booking link in this app is that it is a search for
// one town on one set of dates. A bare CJ click link throws that away and lands
// on booking.com's front page, so the destination goes back on it through CJ's
// `url` parameter, which is the same shape Adtraction and Impact use and which
// destinationIn() already reads.
//
// ONLY booking.com. A click link belongs to one advertiser, and wrapping some
// other host in it would be a tracking link pointing somewhere the programme
// does not cover: it would earn nothing, and a disclosure saying it might would
// be a false statement about money. Already-wrapped links are returned
// untouched, so calling this twice cannot nest one click link inside another.
const BOOKING_HOSTS = ["booking.com"];

// ── AND WHICH BUTTON THE CLICK CAME FROM ────────
//
// His CJ label carries `clkid-{url(query('sid'))}`, which means CJ lifts a
// `sid` parameter off the click URL and hands it to Booking, where it lands in
// the booking's own label. That is the one field in this whole chain that can
// answer a question he will have the first time a commission arrives: which
// button earned it.
//
// DERIVED FROM THE DESTINATION, NOT PASSED IN. Every call site already builds
// the search URL, so reading the slot back off it means no new argument in
// eleven places and no chance of a call site labelling itself wrongly. It also
// cannot leak anything: the only thing it reports is the sort order, which is
// already in the URL it is derived from.
const cjSid = (raw) => {
  try {
    const order = new URL(raw).searchParams.get("order") || "";
    for (const [tier, key] of Object.entries(STAY_ORDER)) if (key === order) return `stay-${tier}`;
    return "stay";
  } catch { return "stay"; }
};

// ── AND THE SWITCH, WHICH IS OFF ────────────────────────────────
//
// Oliver, 19 Sep 2026, having pressed one of these: "Doesn't work.. let's fix
// it later." The 19 Sep handoff records the same thing a second time: the click
// link does not honour `url=`, so every stay button earns and lands on
// Booking's front page.
//
// That is the broken promise costLedger.js refuses in capitals about ticket
// links, and it is the same rule: a link is a promise, and one that lands
// somewhere unable to serve the reader is worse than no link. A button reading
// "See Hotel Viking on Booking.com" or "Budget hotels in Indre By" that arrives
// at a front page has not got anybody anywhere.
//
// So the wrapper is not applied and every stay link is the plain search URL: it
// lands where its label says, and it earns nothing. Nothing else is lost.
// bookingUrl already refuses to write an `aid` while a CJ link is set, for the
// reason written beside it, so the click through kqzyfj.com was the only thing
// in the chain that could pay, and that is the part that does not work.
//
// `on` IS INJECTED rather than read, and that is what keeps the logic below
// tested: the sid derivation, the destination surviving on `url`, the host
// guard and the refusal to nest are all still asserted with it forced true, so
// the day the programme allows deep links the only change is one word in
// config.js and none of that knowledge has to be rediscovered.
export const bookingCjUrl = (url, { on = BOOKING_CJ_DEEP_LINKS_WORK } = {}) => {
  const raw = String(url || "").trim();
  if (!BOOKING_CJ_LINK || !on) return raw;
  if (!/^https?:\/\//i.test(raw)) return raw;
  const h = hostOf(raw);
  if (!h || !BOOKING_HOSTS.some(d => h === d || h.endsWith(`.${d}`))) return raw;
  // sid before url, which is the order CJ's own examples use.
  return `${BOOKING_CJ_LINK}?sid=${cjSid(raw)}&url=${encodeURIComponent(raw)}`;
};

// ── ONE STAY DOOR, AND IT CANNOT PROMISE MORE THAN IT KEEPS ─────────
//
// Oliver, 19 Sep 2026, settling a thing he had been turning over: "I'm going a
// bit back and fourth on the 'budget' and 'good hotel'.. because it's really a
// long-shot to take. Perhaps stick to the area and then just put Booking.com
// front-page affiliate link. I think that's the best solution."
//
// He is right, and it resolves the deep-link problem rather than working around
// it. A guide day had three Booking doors on it: the property the guide named, a
// good search and a budget search. All three promised a specific landing, and
// the programme does not deep link, so all three arrived at the front page.
// Sorting a search for one building by price was the long shot he means: a
// cheaper room is a different hotel.
//
// So there is one door. The AREA stays where it belongs, in the guide's own
// sentence about where to sleep, and the link goes where the label says.
//
// ── THE LABEL IS DERIVED FROM THE LINK, WHICH IS THE POINT ──────────
//
// `area` is returned rather than left to the caller, so a button cannot name a
// town the link will not show. That is the failure this whole file keeps
// circling: costLedger.js has it in capitals about ticket links, and a stay
// button reading "Budget hotels in Indre By" that lands on a front page is the
// same broken promise with better manners.
//
// Today it is false and the button says Booking.com. The day the programme
// allows deep links, BOOKING_CJ_DEEP_LINKS_WORK becomes true and every stay
// door in the app turns into the area's own results with the area named on it,
// from one word in config.js, because the label follows the link rather than
// the other way round.
//
// `slot` rides on CJ's `sid`, which their label lifts through
// `clkid-{url(query('sid'))}`. It is the one field in the chain that can answer
// which surface earned a commission, and it reports nothing but the surface.
export const stayDoorUrl = ({ area = "", near = "", checkin, checkout, adults = 2, slot = "stay" } = {}) => {
  const slotName = /^[a-z][a-z0-9-]{0,23}$/i.test(String(slot)) ? String(slot) : "stay";
  const search = bookingUrl({ area, near, checkin, checkout, adults });
  // The best link available, in order of how much it can honestly promise.
  if (BOOKING_CJ_LINK && BOOKING_CJ_DEEP_LINKS_WORK && search) {
    return { href: bookingCjUrl(search), area: true, paid: true };
  }
  if (BOOKING_CJ_LINK) return { href: `${BOOKING_CJ_LINK}?sid=${slotName}`, area: false, paid: true };
  if (BOOKING_AFFILIATE_ID) return { href: `https://www.booking.com/?aid=${BOOKING_AFFILIATE_ID}`, area: false, paid: true };
  // No programme at all: the search is the honest link and it earns nothing.
  return search ? { href: search, area: true, paid: false } : null;
};

// ─ PARTNER-ADS: THE LINK, AND THE NAME THAT MUST COME WITH IT ─────
//
// The builder is trivial and the point of it is that the partnerid is written
// in ONE place. partnerAdsBanner reads the id back off a link, because that id
// is the only thing a partner-ads URL knows about itself and the merchant table
// is keyed on it.
// ── AND IT DOES CARRY A DESTINATION AFTER ALL ─────────────────
//
// 19 Sep 2026. Every comment in this file said a klikbanner URL has no
// destination in it, which was true of the link he pasted and not true of the
// network: his own program page offers
// `klikbanner.php?partnerid=..&bannerid=..&htmlurl=PRODUKTLINK`, which lands
// the click on a page inside the advertiser's site.
//
// ONLY ON THE ADVERTISER'S OWN HOST. A deep link is a URL this app hands to a
// network that will redirect somebody to it, so the one rule worth having is
// that it cannot point anywhere except the site the banner is for. `site` in
// PARTNER_ADS_BANNERS is that host, and a `to` that does not match it is
// dropped rather than sent, which fails back to the front page.
const sameHost = (a, b) => {
  const x = hostOf(a), y = hostOf(b);
  return !!x && !!y && (x === y || x.endsWith(`.${y}`) || y.endsWith(`.${x}`));
};

export const partnerAdsUrl = (banner, { to = "" } = {}) => {
  const b = String(banner || "").trim();
  if (!b || !PARTNER_ADS_PARTNER_ID) return null;
  const base = `https://www.partner-ads.com/dk/klikbanner.php?partnerid=${PARTNER_ADS_PARTNER_ID}&bannerid=${b}`;
  const want = String(to || "").trim();
  if (!want) return base;
  const site = String(((PARTNER_ADS_BANNERS || {})[b] || {}).site || "");
  if (!sameHost(want, site)) return base;
  return `${base}&htmlurl=${encodeURIComponent(want)}`;
};

export const partnerAdsBanner = (url) => {
  try {
    const u = new URL(String(url || "").trim());
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    if (h !== "partner-ads.com" && !h.endsWith(".partner-ads.com")) return "";
    return String(u.searchParams.get("bannerid") || "").trim();
  } catch { return ""; }
};

// "" when the banner has not been named in config.js, which is what keeps an
// unnamed banner from rendering anywhere. See the comment on PARTNER_ADS_BANNERS.
export const partnerAdsMerchant = (url) => {
  const b = partnerAdsBanner(url);
  if (!b) return "";
  const row = PARTNER_ADS_BANNERS[b];
  return row && row.merchant ? String(row.merchant) : "";
};

// ─ THE ONE NAMED STAY, AND THE RULE HE SET AROUND IT HIMSELF ──────
//
// Oliver, 18 Sep 2026, on the hotel banner: "an affiliate for a great hotel
// that we should probably somehow put on priority". Asked where, he chose the
// quietest of four offers: inside guides for its own town, and nowhere else.
//
// Then, unprompted, before a line of this existed: "Obviously don't make the
// guide give a biased route towards the hotel. But IF they go that route.."
//
// That is Layla complaint 5 in his own words, the one INVENTORY_MAY_NOT_SELECT
// in utils/constraintCheck.js was written against on 25 Aug: reviewers of other
// travel AI say it "pushes hotels". So this is a RENDER over a town the
// itinerary has already chosen, and it is kept that way structurally rather
// than by intention: featuredStayFor and PARTNER_ADS are both on that list, and
// the suite fails if either name appears anywhere in the window of App.jsx that
// plans the days and picks the stops.
//
// A town, not a region. "Aarhus C" and "Aarhus, Midtjylland" are the same town
// as "Aarhus" and a reader in either should see it; "Aarhusvej" is not, so the
// looser match needs the boundary after the name rather than a bare includes().
// ── AND THROUGH fold, OR THE MATCH DIES ON ONE LETTER ────────
//
// 19 Sep 2026, with the first real town in here: S\u00e6by. A guide that spells it
// "Saeby", which half of Danish web writing does and which this app's own
// danishNames.js exists for, would never have matched "S\u00e6by" on a bare
// lowercase compare, and the hotel would never have appeared at all. A silent
// non-match is the worst failure shape available to this feature: nothing to
// see, nothing in a log, and a paid placement that looks like it was never
// configured.
const sameTown = (a, b) => {
  const x = foldName(String(a || "").trim());
  const y = foldName(String(b || "").trim());
  if (!x || !y) return false;
  if (x === y) return true;
  const longer = x.length > y.length ? x : y;
  const shorter = x.length > y.length ? y : x;
  return longer.startsWith(shorter) && /^[\s,]/.test(longer.slice(shorter.length));
};

// ── AND WHAT IS PLACED, FOR THE PAGE THAT SAYS SO ────────
//
// Oliver, 18 Sep 2026: "remember to add the hotel and tip inside the 'how we're
// paid'. I don't want to lie to people."
//
// So the affiliates page reads THIS rather than a sentence somebody typed, the
// rule that file states about itself: a hand-written page is true until a
// placement changes and then it is a public claim about money that nobody
// remembers to edit. A banner with no name in config.js is placed nowhere,
// earns nothing, and appears on no page; the day it is named, the page says so
// with no edit.
// One definition of which banner is which, because the slot decides the render
// site, the roster wording AND the verb on the button. Three copies of this
// ternary would be three places to forget a new banner.
export const partnerAdsSlot = (banner) =>
  String(banner) === String(PARTNER_ADS_STAY_BANNER) ? "stay"
    : String(banner) === String(PARTNER_ADS_GEAR_BANNER) ? "gear"
    : "other";

export const partnerAdsPlacements = () =>
  Object.entries(PARTNER_ADS_BANNERS || {})
    .filter(([, row]) => row && String(row.merchant || "").trim())
    .map(([banner, row]) => ({
      banner: String(banner),
      slot: partnerAdsSlot(banner),
      merchant: String(row.merchant).trim(),
      town: String(row.town || "").trim(),
      site: String(row.site || "").trim(),
    }));

// ── AND A BANNER THAT IS SIGNED UP AND NOT YET NAMED ────
//
// Oliver, 19 Sep 2026: "the legal documents about our affiliates are not
// either", of the two partner-ads programmes.
//
// He is right and my reasoning was half wrong. A banner with no advertiser name
// cannot carry a reader-facing BUTTON, because the label would not be able to
// say where it goes. It can and must appear on the page that answers how this
// site is paid: "we are signed up to a hotel programme and a gear programme" is
// a true sentence that needs no merchant name, and leaving it off that page
// while the banner sits in config is the omission he objected to.
//
// Driven by the banner ids being present rather than by a flag, so the day he
// deletes a banner id the row goes with it.
export const partnerAdsPending = () =>
  [[PARTNER_ADS_STAY_BANNER, "stay"], [PARTNER_ADS_GEAR_BANNER, "gear"]]
    .filter(([banner]) => String(banner || "").trim())
    .filter(([banner]) => !String(((PARTNER_ADS_BANNERS || {})[banner] || {}).merchant || "").trim())
    .map(([banner, slot]) => ({ banner: String(banner), slot }));

// ── "THIS IS FOR TRAVELLING ITEMS. PUT THIS ON TIPS" ──────
//
// 18 Sep 2026, and it took until the 19th to have anywhere to render. The stay
// banner had `featuredStayFor` and a render site in GuidePage the same night;
// this one had neither, so "put it on tips" was answered with a config constant
// and nothing else. The roster row even described a Tips placement that did not
// exist. His words on the 19th: "the tips are still not there."
//
// No town and no route condition, unlike the hotel: gear is bought before a
// trip rather than on a day of it, which is the same reason it sits under
// advice rather than beside a place.
// `row` is an argument for the same reason partnerAdsRows takes its placements:
// the suite can see what a NAMED banner produces without a config constant
// existing for it to flip, and a source regex is not an answer to "does the
// button work", which is the question four wiring failures shipped through.
export const partnerAdsGear = (row = (PARTNER_ADS_BANNERS || {})[PARTNER_ADS_GEAR_BANNER]) => {
  if (!row || !String(row.merchant || "").trim()) return null;
  const url = partnerAdsUrl(PARTNER_ADS_GEAR_BANNER, { to: row.deepLink || "" });
  if (!url) return null;
  return { merchant: String(row.merchant).trim(), site: String(row.site || "").trim(), url };
};

export const featuredStayFor = (town) => {
  const row = PARTNER_ADS_BANNERS[PARTNER_ADS_STAY_BANNER];
  if (!row || !row.merchant || !row.town) return null;
  if (!sameTown(town, row.town)) return null;
  const url = partnerAdsUrl(PARTNER_ADS_STAY_BANNER, { to: row.deepLink || "" });
  if (!url) return null;
  return { merchant: String(row.merchant), town: String(row.town), site: String(row.site || ""), url };
};

// ── TICKETMASTER, AND ONLY TICKETMASTER ─────────────────────────────
//
// Oliver, 13 Aug 2026: "let's finish the ticketmaster affiliate."
//
// The hosts an Impact/Ticketmaster link is allowed to wrap. This is the whole
// safety of the feature and it is a short list on purpose.
//
// Gemlyx links out to madbillet, billetto, billetexpressen, kultunaut and
// whichever agent an operator happens to use, and wrapping ANY of those in a
// Ticketmaster tracking URL would be two separate wrongs at once: the reader
// lands somewhere they did not choose, and the affiliate network is sent a
// click it did not earn, which is the kind of thing that gets an account closed
// rather than a commission paid.
//
// ticketmaster.dk and .com are the Danish and international storefronts.
// livenation is here because Ticketmaster's own programme covers it and its
// links appear on Danish event pages; if his approval does not include it, take
// it out rather than hoping.
const TICKETMASTER_HOSTS = ["ticketmaster.dk", "ticketmaster.com", "ticketmaster.eu", "livenation.dk", "livenation.com"];

export const isTicketmasterUrl = (url) => {
  const h = hostOf(url);
  return !!h && TICKETMASTER_HOSTS.some(d => h === d || h.endsWith(`.${d}`));
};

// Returns the tracked link, or the ORIGINAL url, or null when there is nothing
// worth linking to. Never returns a tracking URL wrapped around a destination
// that is not Ticketmaster's, and never invents a template.
//
// THE DESTINATION IS ENCODED, because it rides inside a query parameter and a
// Ticketmaster event URL routinely carries its own ?query. Leaving it raw would
// truncate the deep link at the first ampersand and drop the reader on a
// homepage, which is the shape of bug that pays nothing AND annoys somebody.
// ── THE TEMPLATE IS A PARAMETER, SO THE LIVE STATE CAN BE TESTED ────
// It defaults to the config value, so every caller stays a one-argument call.
// It exists because the constant ships EMPTY and will do until he is approved,
// which meant the only reachable branch was "no programme, pass everything
// through" and the host guard, the single thing standing between a reader and a
// wrongly-wrapped link, had no test that could ever exercise it.
//
// A mutation caught that: deleting `!isTicketmasterUrl(raw)` left the suite
// green, because the empty template short-circuited before the guard was
// reached. The behaviour that matters most was the behaviour nothing checked.
export const ticketmasterUrl = (url, template = TICKETMASTER_AFFILIATE_TEMPLATE) => {
  const raw = String(url || "").trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  if (!template || !isTicketmasterUrl(raw)) return raw;
  // ── ONE BRANCH, BECAUSE THE OTHER ONE WAS THE SAME BRANCH ─────────
  // This was `template.includes("{url}") ? replace(...) : template`, and a
  // mutation showed the two arms are indistinguishable: String.replace is a
  // no-op when the placeholder is absent, so both return the template
  // unchanged. A conditional whose arms agree is a place to be wrong later for
  // no benefit now.
  //
  // The behaviour it was spelling out is still true and still worth knowing: a
  // template with no {url} is a link to the programme's landing page rather
  // than to this event. It tracks, so it is used rather than discarded, and it
  // is not dressed up as a deep link.
  return template.replace("{url}", encodeURIComponent(raw));
};

export const ticketmasterActive = () => !!TICKETMASTER_AFFILIATE_TEMPLATE;

// ── WHAT A READER IS TOLD, AND ONLY WHEN IT IS TRUE ─────────────────
// Same rule as STAY_DISCLOSURE above and the same reason: a blanket "these are
// affiliate links" on a page where nothing pays is a false statement about
// money, and the identity of this whole app is not saying things that are not
// so. Returns "" when this particular link earns nothing, so a caller that
// renders it unconditionally still prints nothing.
export const ticketDisclosure = (url, template = TICKETMASTER_AFFILIATE_TEMPLATE) =>
  !!template && isTicketmasterUrl(url)
    ? "Booking through this link may earn Gemlyx a small commission. You pay exactly what you would pay reaching the same page without it."
    : "";

// ── TIQETS, THROUGH TRAVELPAYOUTS ───────────────────────────────────
//
// Oliver, 15 Aug 2026: "Imma sign up for tiquts." Approved the same evening.
//
// Tiqets sells admission to the museums, castles and gardens Gemlyx already has
// pages about, which makes it the first programme whose inventory matches what
// this site writes about. It is reached through Travelpayouts, so the tracking
// hosts are tpx.li and tp.media rather than tiqets.com.
//
// ── AND A SHORT LINK IS NOT A DEEP LINK ─────────────────────────────
// This is why there are two constants rather than one. The link Travelpayouts
// hands you on signup, tiqets.tpx.li/<code>, resolves to ONE fixed destination.
// It cannot carry a different attraction each time. Put it on a card about
// Rosenborg Slot and a reader who asked for Rosenborg lands somewhere that is
// not Rosenborg: it pays close to nothing and it spends the one thing this site
// is built on.
//
// So the short link is only ever a BROWSE link, offered where the reader was
// not promised a particular page, and a named attraction uses the template.
const TIQETS_HOSTS = ["tiqets.com"];

export const isTiqetsUrl = (url) => {
  const h = hostOf(url);
  return !!h && TIQETS_HOSTS.some(d => h === d || h.endsWith(`.${d}`));
};

// The same contract as ticketmasterUrl, deliberately: the two are read side by
// side and a different shape in each is how one of them gets forgotten. Returns
// the tracked link, or the ORIGINAL url, or null when there is nothing worth
// linking to, and never wraps a destination that is not Tiqets.
export const tiqetsUrl = (url, template = TIQETS_AFFILIATE_TEMPLATE) => {
  const raw = String(url || "").trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  if (!template || !isTiqetsUrl(raw)) return raw;
  // Encoded, because it rides inside a query parameter and a Tiqets product URL
  // carries its own ?query often enough. Raw would truncate the deep link at
  // the first ampersand and drop the reader on a homepage.
  return template.replace("{url}", encodeURIComponent(raw));
};

// The general "see what is on Tiqets" link, for a place with no product page of
// its own. Null rather than a bare tiqets.com when nothing is configured, so a
// caller renders no button at all rather than an untracked one that pretends.
export const tiqetsBrowseUrl = (link = TIQETS_BROWSE_LINK) => {
  const raw = String(link || "").trim();
  return /^https?:\/\//i.test(raw) ? raw : null;
};

// ── AND "ACTIVE" MEANS THE DEEP LINK, NOT THE SHORT ONE ─────────────
// Reading the browse link here would report the programme live on the day he
// signed up, while every attraction link on the site was still untracked and
// earning nothing. The template is what makes a named link pay, so the template
// is what this answers about.
//
// THE TEMPLATE IS A PARAMETER FOR THE REASON ticketmasterUrl'S ALREADY IS. Now
// that a real template is configured, a version of this that read the browse
// link instead would return true as well, and no call against the live config
// could tell the two apart. Passing an empty template can: the browse link is
// still configured, so anything reading THAT still says true.
export const tiqetsActive = (template = TIQETS_AFFILIATE_TEMPLATE) => !!template;

export const tiqetsDisclosure = (url, template = TIQETS_AFFILIATE_TEMPLATE) =>
  !!template && isTiqetsUrl(url)
    ? "Booking through this link may earn Gemlyx a small commission. You pay exactly what you would pay reaching the same page without it."
    : "";

// ── WEGOTRIP, THROUGH TRAVELPAYOUTS ─────────────────────────────────
//
// Oliver, 6 Sep 2026: "Is it possible to do a sweep with wegotrip that is 'add
// audio to this tour' on the blogs that has the possible?"
//
// It was, and the sweep found the harder half of this file was missing.
// WEGOTRIP_LINK had been in config.js since 26 August, imported by exactly one
// file, AffiliatePanel.jsx, and used there only to print an on/off dot. Nothing
// on the reader-facing site could render it. Tenth helper in this codebase
// found written and called from nowhere, and the first one that was a live
// affiliate link rather than a function.
//
// THE SAME CONTRACT AS ticketmasterUrl AND tiqetsUrl, deliberately: the three
// are read side by side and a different shape in one is how that one gets
// forgotten. Returns the tracked link, or the ORIGINAL url, or null when there
// is nothing worth linking to, and never wraps a destination that is not
// WeGoTrip.
const WEGOTRIP_HOSTS = ["wegotrip.com"];

export const isWegotripUrl = (url) => {
  const h = hostOf(url);
  return !!h && WEGOTRIP_HOSTS.some(d => h === d || h.endsWith(`.${d}`));
};

export const wegotripUrl = (url, template = WEGOTRIP_AFFILIATE_TEMPLATE) => {
  const raw = String(url || "").trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  if (!template || !isWegotripUrl(raw)) return raw;
  return template.replace("{url}", encodeURIComponent(raw));
};

// The general "see what WeGoTrip has" link, for a caller with no particular
// product to point at. Null rather than a bare wegotrip.com when nothing is
// configured, so a caller renders no button at all rather than an untracked one
// that pretends. Same as tiqetsBrowseUrl, same reason.
export const wegotripBrowseUrl = (link = WEGOTRIP_LINK) => {
  const raw = String(link || "").trim();
  return /^https?:\/\//i.test(raw) ? raw : null;
};

// THE TEMPLATE, not the short link, for the reason tiqetsActive spells out: a
// version of this reading the browse link would report the programme live while
// every WeGoTrip link on the site was untracked and earning nothing.
export const wegotripActive = (template = WEGOTRIP_AFFILIATE_TEMPLATE) => !!template;

export const wegotripDisclosure = (url, template = WEGOTRIP_AFFILIATE_TEMPLATE) =>
  !!template && isWegotripUrl(url)
    ? "Booking through this link may earn Gemlyx a small commission. You pay exactly what you would pay reaching the same page without it."
    : "";

// ── GETYOURGUIDE, WHICH TRACKS ON ITS OWN DOMAIN ────────────────────
//
// Oliver, 9 Sep 2026: "I got affiliate link from getyourguide.dk".
//
// TWO HOSTS, ONE PROGRAMME. getyourguide.dk redirects to
// getyourguide.com/da-dk, so a link stored from their Danish site and a link
// stored from a search both have to be recognised or half of them go untracked.
// Verified by following one on 9 Sep 2026.
const GETYOURGUIDE_HOSTS = ["getyourguide.com", "getyourguide.dk"];

export const isGetyourguideUrl = (url) => {
  const h = hostOf(url);
  return !!h && GETYOURGUIDE_HOSTS.some(d => h === d || h.endsWith(`.${d}`));
};

// ── AND A PRODUCT IS THE ONE WITH AN ACTIVITY ID ────────────────────
//
// Their product URLs end in the activity id: /da-dk/kobenhavn-l12/<slug>-t37848/
// where l12 is the city and t37848 is the thing you can actually book. The same
// distinction isTiqetsProductUrl draws with -p<id>, and for the same reason: a
// city page or a search result is a browse link wearing a product's clothes, and
// a reader sent to one has been given a search box rather than the thing the
// entry was talking about.
const GETYOURGUIDE_PRODUCT = /\/[a-z0-9-]*-t\d+\/?(?:[?#]|$)/i;

export const isGetyourguideProductUrl = (url) =>
  isGetyourguideUrl(url) && GETYOURGUIDE_PRODUCT.test(String(url || ""));

// The tracked address, or the URL unchanged when there is no partner id, or null
// when it is not a link at all. Same three-way contract every wrapper above
// keeps, so affiliateHref can treat them all alike.
//
// APPENDED RATHER THAN TEMPLATED, because GetYourGuide tracks on its own domain.
// Their product URLs already carry query strings (ranking_uuid, q) and those have
// to survive, so this reads the URL and sets two parameters on it rather than
// pasting a string together. A hand-built `${url}?partner_id=` would have thrown
// away the query on every link copied out of a search result.
export const getyourguideUrl = (url, { partner = GETYOURGUIDE_PARTNER_ID, cmp = GETYOURGUIDE_CAMPAIGN } = {}) => {
  const raw = String(url || "").trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  if (!partner || !isGetyourguideUrl(raw)) return raw;
  try {
    const u = new URL(raw);
    u.searchParams.set("partner_id", partner);
    if (cmp) u.searchParams.set("cmp", cmp);
    return u.toString();
  } catch { return raw; }
};

// THE PARTNER ID, not the link he was given, for the reason tiqetsActive spells
// out about templates: the id is what makes a named link pay, and a version of
// this reading the sample link would report the programme live while every
// GetYourGuide link on the site was untracked.
export const getyourguideActive = (partner = GETYOURGUIDE_PARTNER_ID) => !!partner;

export const getyourguideDisclosure = (url, partner = GETYOURGUIDE_PARTNER_ID) =>
  !!partner && isGetyourguideUrl(url)
    ? "Booking through this link may earn Gemlyx a small commission. You pay exactly what you would pay reaching the same page without it."
    : "";

// ── BAJA BIKES, AND WHAT A SECOND TOUR PARTNER COSTS ────────────────
//
// Approved 11 Sep 2026, the morning after he applied. Guided bike tours, bike
// rental and a private guide, ten products, every one of them Copenhagen.
//
// SAME SHAPE AS GETYOURGUIDE, for the same reason: they track on their own
// domain, so this reads the URL and sets parameters on it rather than pasting a
// template together. A hand-built `${url}?bb=` would throw away a query the
// product page might need.
//
// TWO PARAMETERS AND THEY DO DIFFERENT JOBS. `bb` is the referral id and it is
// what makes a sale his. `a_bid` names the creative, which is what turns his
// dashboard from one number into ten, so a link missing it still pays and still
// reports nothing useful. The id is per product and comes off his panel; see
// BAJABIKES_BANNERS in config.js for why it lives there rather than on the row.
const BAJABIKES_HOST = "bajabikes.eu";

export const isBajabikesUrl = (url) => {
  const h = hostOf(url);
  return !!h && (h === BAJABIKES_HOST || h.endsWith(`.${BAJABIKES_HOST}`));
};

// ── AND A PRODUCT IS ONE THIS PROGRAMME ACTUALLY SELLS ──────────────
//
// The same distinction isGetyourguideProductUrl and isTiqetsProductUrl draw, and
// the same reason: a city page or a language root is a browse link wearing a
// product's clothes, and a reader sent to one has been handed a menu rather than
// the thing the entry was talking about.
//
// THE TEST IS THE BANNER TABLE, not the shape of the path, and that is the
// difference worth knowing. GetYourGuide encodes the product in the URL as
// -t<id>, so a regex can recognise one it has never seen. Baja's paths are plain
// slugs, so the only thing that can say whether an address is a product HE CAN
// EARN ON is the list off his own panel. A product they add tomorrow is not one
// of his until the row exists, and answering yes for it would print a
// disclosure over a link that pays nothing.
export const bajabikesSlug = (url) => {
  if (!isBajabikesUrl(url)) return "";
  try {
    const parts = new URL(String(url)).pathname.split("/").filter(Boolean);
    // /en/<slug>/ and /<slug>/ both, since their language prefix is optional on
    // some of these and a slug is always the last real segment.
    return parts.length ? parts[parts.length - 1].toLowerCase() : "";
  } catch { return ""; }
};

export const isBajabikesProductUrl = (url) =>
  !!bajabikesSlug(url) && Object.prototype.hasOwnProperty.call(BAJABIKES_BANNERS, bajabikesSlug(url));

// The one product that is not an activity. Rental answers "how do I get around
// today" rather than "what shall I do", so it is the only row here that belongs
// on a day rather than in the tour slot, and the tour slot has to be able to
// tell them apart.
export const isBajabikesRental = (url) => bajabikesSlug(url) === BAJABIKES_RENTAL_SLUG;

export const bajabikesUrl = (url, { referral = BAJABIKES_REFERRAL_ID, banners = BAJABIKES_BANNERS } = {}) => {
  const raw = String(url || "").trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  if (!referral || !isBajabikesUrl(raw)) return raw;
  try {
    const u = new URL(raw);
    u.searchParams.set("bb", referral);
    // Only where there is one. A product they sell that he has no banner for
    // still tracks the sale, and stamping a guessed id on it would file the
    // earning under a creative that does not exist.
    const bid = banners?.[bajabikesSlug(raw)];
    if (bid) u.searchParams.set("a_bid", String(bid));
    return u.toString();
  } catch { return raw; }
};

// The referral id, not a sample link, for the reason tiqetsActive spells out
// about templates: the id is what makes a named link pay.
export const bajabikesActive = (referral = BAJABIKES_REFERRAL_ID) => !!referral;

export const bajabikesDisclosure = (url, referral = BAJABIKES_REFERRAL_ID) =>
  !!referral && isBajabikesUrl(url)
    ? "Booking through this link may earn Gemlyx a small commission. You pay exactly what you would pay reaching the same page without it."
    : "";

// ── WHO SELLS IT, WHICH IS NOT THE SAME QUESTION AS WHO PAYS US ─────
//
// partnerMerchant answers "which programme is this tracked through", so it needs
// the tracking parameter and returns nothing without it. The SENTENCE needs a
// different fact: who the reader is about to buy from. Those are the same
// merchant on a normal day and they come apart the moment a programme is
// switched off, because the link is still a GetYourGuide link and still worth
// following, it just earns nothing.
//
// Found by mutation testing on 11 Sep 2026. TourLine's first version asked
// partnerMerchant and refused to render without an answer, which meant turning a
// partner id off HID THE RECOMMENDATION rather than hiding the disclosure. That
// is backwards, and this file already had the rule the other way round:
// wegotripUrl "hands back the plain link when it has none", and the disclosure
// is what a link that earns nothing must not carry, not the link itself.
//
// By host, and only the two that sell tours, so an arbitrary address still names
// nobody and still draws no line.
export const tourMerchant = (url) => {
  if (isGetyourguideUrl(url)) return "GetYourGuide";
  if (isBajabikesUrl(url)) return "Baja Bikes";
  return "";
};

// ── AND WHEN A RENTED BIKE IS THE ANSWER TO A DAY ───────────────────
//
// Oliver, asked where the rental belonged, chose the guide day over the town
// page: "on a bike day", at the point they need one, and never on a
// public-transport trip. The town page is read by everybody and the question
// "where do I get a bike" is only somebody's question on the day they want one.
//
// TWO CONDITIONS AND BOTH ARE NECESSARY. Copenhagen, because Baja has no other
// Danish city and a line offered in Aarhus is a link to somewhere they cannot
// help. And bike, because a traveller on trains is being sold something they
// did not ask for, which is the thing this whole file's disclosure rules exist
// to keep honest.
//
// `mode` is the traveller's own words, folded through travelModeKey by the
// caller, for the same reason carRentalFits takes the folded key: "cykel",
// "mostly bike but train for the long stretches" and a chip label all have to
// mean the same thing here.
//
// AND IT IS THE DAY'S TOWN, not the trip's. A Copenhagen trip that spends day
// four in Roskilde gets no line on day four, because the bike shop is not there.
const RENTAL_TOWN = "copenhagen";
const RENTAL_TOWN_DA = "københavn";

export const bikeRentalFits = ({ mode = "", town = "" } = {}) => {
  if (String(mode || "").trim().toLowerCase() !== "bike") return false;
  const t = String(town || "").trim().toLowerCase();
  if (!t) return false;
  return t.includes(RENTAL_TOWN) || t.includes(RENTAL_TOWN_DA);
};

// ── CAR HIRE, ONE LINK, CHOSEN ON INVENTORY ─────────────────────────
//
// Oliver, 15 Aug 2026, sending a GetRentacar link: "I guess multiple car ones
// are fine."
//
// Several car programmes IS fine, and this returns the one configured link
// rather than a list on purpose. A page offering a reader two rental buttons
// has not given them more choice, it has given them a decision they did not
// come here to make, and the second button halves the clicks on the first.
// Several programmes, one link: pick by which has the cars.
//
// WHICH IS HOW IT WAS PICKED. GetRentacar pays 10% on a 90-day cookie, the best
// pair on his Travelpayouts page, and its /country/denmark page is a 404: 10%
// of an inventory that is not here. AutoEurope pays 4.4 to 8% and has Kastrup,
// Billund, Aarhus, Aalborg, Esbjerg, Rønne, Sønderborg, Karup and Odense. A
// worse rate on real cars beats a better one on none, because a rental link
// that opens on an empty result teaches a reader that Gemlyx sends them to
// things that are not there, and that costs more than any commission pays.
//
// Settled 26 Aug 2026 and closed on 8 Sep, Oliver: "Shall we cut out the
// getrentacar?" The name came out of PARTNER_MERCHANTS with it. See config.js
// for the link itself and for why it is a browse link rather than a deep one.
export const carRentalUrl = (link = CAR_RENTAL_LINK) => {
  const raw = String(link || "").trim();
  return /^https?:\/\//i.test(raw) ? raw : null;
};

export const carRentalActive = () => !!carRentalUrl();

// ── A PAID LINK SAYS SO, WHEREVER IT IS PRINTED ─────────────────────
//
// Every disclosure above is tied to ONE programme and answers "is this
// particular link a Ticketmaster link, a Tiqets link". That works where the
// caller knows which programme it is calling. The Essentials list does not: it
// renders whatever sits in `link` on a data row, as a plain 🌐 Website button,
// with no idea where it points.
//
// So the moment a tracked link goes into essentials.js, that page prints a paid
// link with nothing under it. That is the exact thing public/privacy.html now
// promises a reader does not happen, in a section written tonight, and a
// promise on one page broken by a button on another is still broken.
//
// This asks the question from the other end: not "which programme is this" but
// "is this link tracked at all". Answered by HOST, because that is the part a
// tracking link cannot hide. tpx.li and tp.media are Travelpayouts, and the
// Impact and Ticketmaster hosts are the ones the template above can produce.
//
// Booking.com is deliberately NOT on this list. A booking.com link only pays
// when it carries aid=, and the host alone cannot tell you that, so it is
// tested on the parameter instead. Guessing from the host would print "this may
// earn us a commission" over the plain search links the app builds today, which
// is the same false statement in the opposite direction.
const PARTNER_HOSTS = [
  "tpx.li", "tp.media", "tp.st",
  "ticketmaster.evyy.net", "impact.com", "pxf.io",
  // ── ADTRACTION, THE THIRD NETWORK ─────────────────────────────────
  //
  // Oliver, 14 Sep 2026: "I'm gonna seek for Oscar's Biludlejning! I was
  // granted permission for adtraction."
  //
  // Added the moment the network was, and BEFORE the link exists, because the
  // failure this list prevents is silent: an Adtraction link pasted into
  // config.js while this array does not know the host renders as an ordinary
  // link, with no disclosure under it and no sponsored rel on it. The reader
  // sees a paid link presented as an unpaid one, which is the exact thing
  // public/privacy.html promises does not happen.
  //
  // Confirmed shape rather than guessed at, after a request shape was guessed
  // wrong this morning and was wrong in four places at once:
  //   https://track.adtraction.com/t/t?a=<id>&as=<sub>&t=2&tk=1&url=<target>
  // `url` carries the destination, which is the {url} template shape this file
  // already uses for Tiqets and Ticketmaster, so a deep link into one Oscar
  // branch is available later if Oscar allows deeplinking.
  "adtraction.com",
  // ─ CJ AFFILIATE, 18 SEP 2026 ──────────────────────
  //
  // Booking.com's programme runs on CJ, and CJ clicks land on a set of its own
  // short domains rather than on one. kqzyfj.com is the one his link uses; the
  // rest are CJ's other click domains, listed for the reason the Adtraction
  // entry above gives about itself. The failure this prevents is the silent
  // one: a link generated tomorrow on a sibling domain, pasted in, rendering
  // with no disclosure under it and no sponsored rel on it.
  //
  // The direction of error is chosen deliberately. A host listed here that
  // turns out not to be CJ's would make an ordinary link SAY it might earn,
  // which is visible and wrong on a page nobody links to; a host missing from
  // here makes a paid link say nothing, which is invisible and wrong on a page
  // a reader is about to press.
  "kqzyfj.com", "dpbolvw.net", "anrdoezrs.net", "jdoqocy.com", "tkqlhce.com", "emjcd.com",
  // ─ PARTNER-ADS, THE DANISH NETWORK ───────────────────
  // Every banner shares this one host and carries no destination at all, so the
  // merchant cannot be read off either the host or a url parameter. See
  // partnerAdsMerchant, and the table it reads in config.js.
  "partner-ads.com",
];

export const isPartnerLink = (url) => {
  const raw = String(url || "").trim();
  const h = hostOf(raw);
  if (!h) return false;
  if (PARTNER_HOSTS.some(d => h === d || h.endsWith(`.${d}`))) return true;
  // ── THE TWO THAT ARE DECIDED BY A PARAMETER RATHER THAN A HOST ────
  //
  // Booking.com and GetYourGuide both track on their own domain, so the host
  // says nothing: getyourguide.com is a partner link with partner_id on it and
  // an ordinary link without. Asked of the PARAMETER, which is the part a
  // tracking link cannot hide, and which is also what keeps a plain
  // GetYourGuide reference in prose from being labelled as paid.
  if (/(?:[?&])partner_id=[^&]/.test(raw) && isGetyourguideUrl(raw)) return true;
  // Baja Bikes is the third, 11 Sep 2026, and the same argument applies: their
  // product pages are ordinary links until `bb` is on them, and a plain
  // reference to bajabikes.eu in prose must not be labelled as paid.
  if (/(?:[?&])bb=[^&]/.test(raw) && isBajabikesUrl(raw)) return true;
  return /(?:[?&])aid=\d/.test(raw) && (h === "booking.com" || h.endsWith(".booking.com"));
};

// One sentence, the same one the other disclosures use, and "" when the link
// earns nothing. A caller can render it unconditionally and print nothing on an
// ordinary link.
export const partnerDisclosure = (url) =>
  isPartnerLink(url)
    // ── WHICH PRICE THIS SENTENCE IS ABOUT ──────────
    // Oliver, 18 Sep 2026: "tiqets prices seem to be slightly different from
    // the page own. I don't want to lie to users." These sentences said the
    // link makes "no change to the price", which is true of the LINK and reads
    // as a claim about the gate price. Said the way it is meant: the same page
    // reached without the link charges the same number.
    ? "Partner link. Gemlyx may earn a small commission, and you pay exactly what you would pay reaching the same page without it."
    : "";

// ── AND "OFFICIAL SITE" IS A CLAIM ABOUT WHOSE SITE IT IS ───────────
//
// Oliver, 16 Aug 2026, on the Tiqets row in Essentials: "can you please point
// out that this is one of our affiliates? Just so people is aware of why we use
// this random lesser known page."
//
// He is right, and the missing disclosure was only half of it. The button under
// that row read OFFICIAL SITE and pointed at tiqets.tpx.li, which is a tracked
// link to a reseller. Tiqets is not the official site of Tivoli, and a label
// saying so is not an omission, it is a false statement about who the reader is
// about to buy from. This whole app exists to not do that.
//
// The disclosure existed and the label did not reach it: the Essentials renderer
// grew a THIRD branch for web links on 15 August, and the partner disclosure and
// the sponsored rel lived in the branch a web link never takes. Same shape as
// every other bug in this codebase this week, one level down.
//
// SO THE LABEL ANSWERS THE QUESTION THE READER IS ACTUALLY ASKING, which is his
// own words: why is this a page I have never heard of. It names the merchant when
// the merchant is nameable and says "partner site" when it is not, and it never
// claims to be the official anything unless the link is untracked.
//
// AN ALLOW-LIST, for the reason every list in this codebase is one. A network
// short link is <programme>.tpx.li, so the first label of the host IS the
// merchant, and capitalising whatever happens to be there would print "Gjhkxmoh"
// the first time a programme is named differently. A merchant nobody has written
// down gets the honest generic label.
const PARTNER_MERCHANTS = {
  tiqets: "Tiqets",
  bajabikes: "Baja Bikes",
  booking: "Booking.com",
  ticketmaster: "Ticketmaster",
  // ── THE CAR PROGRAMMES ───────────────────────────────────────────
  // autoeurope is the one CAR_RENTAL_LINK actually points at, and it was
  // missing from this list until 8 Sep 2026, so the only car link on the site
  // rendered as "Partner site" rather than "Book on AutoEurope". A merchant
  // nobody has written down gets the generic label, which is the right rule and
  // was the wrong answer here.
  //
  // DiscoverCars and Rentalcars stay: both have real Danish coverage and are on
  // Travelpayouts, so either could be the link tomorrow. GetRentacar came off
  // the same day. Oliver: "Shall we cut out the getrentacar?", and "according
  // to Google, that affiliate is not as great as autoeurope". It had already
  // lost the decision on 26 August, on inventory rather than rate: 10% and a
  // 90-day cookie, the best pair on his page, of cars that are not in Denmark.
  getyourguide: "GetYourGuide",
  // bajabikes WAS WRITTEN HERE A SECOND TIME and is gone, 15 Sep 2026. Both
  // copies said "Baja Bikes", so the duplicate never printed a wrong name and
  // nothing ever looked broken, which is why it sat on the beta list for a week
  // rather than being fixed. It is still worth removing: a repeated key in an
  // object literal is silently the last one that wins, so the day somebody edits
  // the first copy their change does nothing, with no error to explain it.
  autoeurope: "AutoEurope",
  discovercars: "DiscoverCars",
  rentalcars: "Rentalcars",
  // ── AND THE DANISH ONE, 14 SEP 2026 ──────────────────────────────
  // Oscar Biludlejning, hejoscar.dk, through Adtraction. Keyed on the
  // DESTINATION host rather than on the network's, for the reason written into
  // partnerMerchant: every Adtraction link shares one host, so the merchant is
  // in the url parameter and nowhere else. He has been chasing this one since
  // 9 September because it is the most Danish inventory on any list: 145
  // branches against AutoEurope's fifteen pickup points.
  hejoscar: "Oscar Biludlejning",
  kiwi: "Kiwi.com",
  aviasales: "Aviasales",
  wegotrip: "WeGoTrip",
};
// ── ONE DOOR FOR EVERY OUTBOUND LINK ────────────────────────────────
//
// Oliver, 23 Aug 2026, on two published festivals with no ticket link: "Like
// automatically enable affiliate links if I am affiliated to the place. So if I
// redraft Koge festuge, then the affiliate link will come with it."
//
// The redraft half is built. This is the better half of his question, because
// it removes the redraft: instead of four wrappers applied by hand at whichever
// render site somebody remembered, there is ONE function that asks "do we hold
// a programme covering this host" and answers with either the tracked URL or
// the link exactly as it came in.
//
// WHY THAT MATTERS MORE THAN IT SOUNDS. Every wrapper in this file is gated on
// its template being configured, and the template is read at RENDER. So the day
// a programme is approved, every entry ever published starts earning through it
// with no migration, no republish and no redraft, and the day one ends they all
// go quietly back to being ordinary links. That is the property the Tiqets
// field already had and nothing else did.
//
// ORDER CANNOT COLLIDE: a URL is on ticketmaster or on tiqets and never on
// both, so the first wrapper that changes anything is the only one that could
// have.
export const affiliateHref = (url) => {
  const raw = String(url || "").trim();
  // The same refusal both wrappers make, kept here so a caller gets one
  // contract: null means "this is not a link", never "this is not a partner".
  if (!/^https?:\/\//i.test(raw)) return null;
  for (const wrap of [ticketmasterUrl, tiqetsUrl, wegotripUrl, getyourguideUrl, bajabikesUrl, bookingCjUrl]) {
    const out = wrap(raw);
    if (out && out !== raw) return out;
  }
  return raw;
};

// The sentence that MUST accompany it, from the same place, deliberately. A
// caller reaching for one and forgetting the other is the failure the render
// scan in tests/run.mjs exists to prevent, and pairing them here is how that
// stops being a thing anybody has to remember.
//
// Empty for a link that earns nothing, because "this may earn us a commission"
// printed over a link that earns nothing is a false statement about money.
// ── AND IN THE READER'S LANGUAGE, 9 SEP 2026 ────────────────────────
//
// The four functions above answer one question: does this link earn, and what
// is the sentence. They answer it in English because that is the source
// language of every string in this project. This is the accessor every RENDER
// site calls, so it is where the reader's language belongs.
//
// Found by rendering TourLine in Danish and reading the output: his sentence
// came out Danish and the disclosure under it came out English, which had been
// true of every paid link on the site since the first programme went in. A
// disclosure the reader cannot read is not a disclosure.
//
// The default is English, so a caller that passes nothing gets exactly what it
// got before and no existing behaviour moves.
export const affiliateNote = (url, lang = DEFAULT_UI_LANGUAGE) => {
  const earns = ticketDisclosure(url) || tiqetsDisclosure(url) || wegotripDisclosure(url) || getyourguideDisclosure(url) || bajabikesDisclosure(url) || "";
  if (!earns) return "";
  // Falls back to the English those four return rather than to "", because an
  // empty note is how this file says "this link earns nothing", and printing
  // nothing under a link that DOES earn is the one failure worse than printing
  // it in the wrong language.
  return uiT("affiliate.disclosure", lang) || earns;
};

// True when the link is going through a programme, for a caller that has to set
// rel="sponsored nofollow", which is what Google asks of a paid link.
export const isAffiliateHref = (url) => {
  const raw = String(url || "").trim();
  const out = affiliateHref(raw);
  return !!out && out !== raw;
};



// ── WHAT A TRACKING LINK IS POINTING AT ─────────────────────────────
//
// A network link carries its destination in a query parameter, and that
// parameter is the only place the merchant's name appears. Decoded rather than
// pattern-matched, because a destination is percent-encoded and a regex over
// the encoded form would read "hejoscar" out of one link and nothing out of the
// next one that happened to encode a slash differently.
//
// Returns "" rather than throwing on a malformed link, for the same reason
// asUrl does everywhere else in this codebase: a bad href is one empty string
// here and never a half parsed guess later.
export const destinationIn = (url) => {
  try {
    const u = new URL(String(url || "").trim());
    // ── AND THE THIRD NAME FOR THE SAME PARAMETER ──────────────────
    // Adtraction calls it `url`, Impact calls it `ulp`, and Travelpayouts
    // calls it `u`, which is the one TIQETS_AFFILIATE_TEMPLATE in config.js
    // writes on every deep link this file builds. It was missing here, so the
    // one network Gemlyx books most of its tickets through was the one whose
    // destination this could not read, and partnerMerchant below had nothing
    // to look the merchant up by.
    const target = u.searchParams.get("url") || u.searchParams.get("ulp") || u.searchParams.get("u") || "";
    return /^https?:\/\//i.test(target) ? target : "";
  } catch { return ""; }
};

export const partnerMerchant = (url) => {
  if (!isPartnerLink(url)) return "";
  const h = hostOf(url);
  if (!h) return "";
  // ── THE HOST FIRST, AND THE DESTINATION WHEN IT NAMES NOBODY ──────
  //
  // A Travelpayouts SHORT link is <programme>.tpx.li, so the first label IS the
  // merchant and the host answers on its own. Nothing else does. An Adtraction
  // link is track.adtraction.com whatever it sells, so the first label is
  // "track"; a Travelpayouts DEEP link is tp.media whatever it sells, so the
  // first label is "tp". Reading the host alone on either would print "Book on
  // Track", or fall through to the generic "Partner site" on every deep link
  // this file builds, which is what it did until 16 Sep 2026: the Tiqets
  // template produces a tp.media URL, and the one shape the affiliate machinery
  // generates was the one shape that could not name its own merchant.
  //
  // So the host is asked first and the DESTINATION is asked second, through the
  // parameter each network carries it in. One rule rather than a branch per
  // network, because the next network will have a third name for its host and
  // the same answer sitting in its `url`. A link with no readable destination
  // gets the honest generic label rather than a guess.
  //
  // A bare programme host with no subdomain names nothing: booking.com?aid= is
  // recognised as paid by its parameter and its first label is the merchant
  // itself, which is fine, and impact.com is the network with no merchant in it.
  // ─ THE NETWORK THAT CANNOT BE ASKED ──────────────────
  // Asked FIRST, because both lookups below would answer confidently and
  // wrongly on a partner-ads link: the host's first label is "partner", and
  // there is no destination in the URL to read. The table is the only thing
  // that knows, and an unnamed banner gets "" rather than a guess.
  const viaBanner = partnerAdsMerchant(url);
  if (viaBanner) return viaBanner;
  // ─ AND THE CLICK LINK WITH NO DESTINATION IN IT ──────────────────
  //
  // 19 Sep 2026, and it is the same shape as the partner-ads case above: a CJ
  // click link carries no destination once stayDoorUrl stops adding one, so
  // both lookups below answer "" and the button reads "Partner site" over a
  // link to Booking.com. Vaguer than it needs to be, and it hides which
  // company is being paid, which is the opposite of what every disclosure in
  // this file is for.
  //
  // THE CONFIGURED PREFIX, NOT ANY CJ LINK. kqzyfj.com issues click links for
  // every advertiser CJ has, so the host names nobody. BOOKING_CJ_LINK is one
  // specific click id, his, for Booking.com, and that id is the fact worth
  // reading. A different CJ link falls through to the lookups below and gets
  // the honest generic label rather than being called Booking.
  if (BOOKING_CJ_LINK && String(url || "").trim().startsWith(BOOKING_CJ_LINK)) return "Booking.com";
  const first = h.split(".")[0].toLowerCase();
  if (PARTNER_MERCHANTS[first]) return PARTNER_MERCHANTS[first];
  const dest = destinationIn(url);
  const destHost = dest ? hostOf(dest) : "";
  const label = destHost ? destHost.replace(/^www\./i, "").split(".")[0].toLowerCase() : "";
  return PARTNER_MERCHANTS[label] || "";
};

// ── AND THE VERB FOLLOWS WHAT IS BEING SOLD ──────
//
// 19 Sep 2026, when the second partner-ads banner turned out to be a shop.
// "Book on Travelbetter.dk" is the wrong sentence about a rucksack: you book a
// room and you buy a bag, and a label that gets that wrong reads as a template
// somebody forgot to fill in. Only partner-ads links are slotted, because it is
// the only programme here whose banners sell different KINDS of thing.
export const linkLabel = (url) => {
  if (!isPartnerLink(url)) return "Official site";
  const who = partnerMerchant(url);
  if (!who) return "Partner site";
  const banner = partnerAdsBanner(url);
  if (banner && partnerAdsSlot(banner) === "gear") return `Shop at ${who}`;
  return `Book on ${who}`;
};

// ── AND ONE DOOR THAT RENDERS A LINK, NOT JUST TRACKS ONE ───────────
//
// Oliver, 16 Sep 2026: "Can you put an affiliate link on the Copenhagen Card,
// please. From Tiqets."
//
// One row, and it could not be done honestly without this function, which is
// worth writing down. The Copenhagen Card row needs TWO links, the card's own
// site and the reseller, so it becomes a merged row and is drawn by the merged
// renderer. That renderer drew a bare href with rel="noreferrer" and nothing
// underneath it: no affiliateHref, so the link would not have paid; no
// disclosure, so a paid link would have printed as an ordinary one; and
// linkLabel over an unwrapped tiqets.com URL answers "Official site", which is
// a false statement about whose site it is. Three failures, all of them
// already solved once, forty lines above in the single-link branch of the same
// card.
//
// affiliateHref's own comment says the point of it is that nobody has to
// remember. That held for the HREF and for nothing else, and a render site is
// not finished when it has the href: it needs the label, the sentence, and the
// rel, and all three follow from the href. So they are computed together, once,
// and both renderers ask for the set rather than assembling it.
//
// THE ORDER MATTERS AND IS THE WHOLE TRICK. The href is wrapped FIRST, and the
// label and the disclosure are asked of the WRAPPED link. A raw
// tiqets.com/...-p1068607 is not a partner link by any test in this file, so
// asking it directly says "ordinary link, official site, no disclosure" about a
// link that is about to earn a commission. Wrapped, it is a tp.media URL, which
// is a partner host, and every one of those three answers flips to the truth.
// That is also why partnerMerchant learned to read a destination above: without
// it this returns a correct but useless "Partner site" on every deep link.
//
// Returns href: null when there is nothing safe to link to, so a caller draws
// no anchor at all rather than one pointing nowhere.
export const outboundLink = (url) => {
  const safe = externalHref(url);
  const href = safe ? (affiliateHref(safe) || safe) : null;
  const note = href ? partnerDisclosure(href) : "";
  return {
    href,
    label: linkLabel(href || ""),
    note,
    // sponsored and nofollow whenever the link is tracked, which is what Google
    // asks for and is the difference between an affiliate link and an
    // undisclosed ad. Read off the disclosure rather than asked separately, so
    // a link that says nothing and a link that carries no rel cannot be two
    // different sets of links.
    rel: note ? "noreferrer sponsored nofollow" : "noreferrer",
  };
};

// ── AND A CAR BUTTON MAY NOT CONTRADICT THE PAGE IT SITS ON ─────────
//
// carRentalUrl has existed since the link was first discussed and has NEVER had
// a caller — nothing in the app renders a car button at all. So pasting the
// AutoEurope link into config.js on its own would have changed nothing, which is
// this project's signature failure waiting to happen one more time.
//
// The gate is Oliver's own writing, quoted from the live Aalborg guide he built
// on 26 August:
//
//   "I får intet ud af en bil, som I heller ikke kører"      (in the city)
//   "først når man vil ud til Jyllands afkroge på egen hånd,
//    begynder en bil at give mening"                          (out in Jutland)
//
// A rental button on a page that says you would get nothing out of a car is the
// "pay here and pay here" he objected to in Layla, done to ourselves, on the same
// screen as our own advice against it. And a traveller who SAID they do not
// drive must never see one: that is the excluded-constraint failure wearing a
// commission.
//
// So the button appears only where the trip is actually a driving trip. Not
// "might be" — the traveller said so, or the plan is built around it.
export const carRentalFits = ({ mode = "", saidNoCar = false } = {}) => {
  if (saidNoCar) return false;
  const m = String(mode || "").toLowerCase();
  if (!m) return false;
  // travelModeKey's own vocabulary. "public transport", "cycling", "walking"
  // and "train" are all real answers and none of them wants a rental car.
  // Prefixes need to allow their own suffixes: `\bdriv\b` was written first and
  // never matched "driving", because there is no word boundary between "driv"
  // and "ing". `car` and `bil` stay EXACT on both sides on purpose — a loose
  // `bil` matches Billund, which is a town in half these guides, and a loose
  // `car` matches carriage.
  return /\b(?:driv\w*|rental car|hire car|road ?trip)\b|\b(?:car|bil|kør\w*|bilen)\b/.test(m);
};

// Said next to it. Names the commission and names the limit in the same breath,
// because a reader who is being sent to a paid link deserves both.
export const CAR_RENTAL_DISCLOSURE =
  "Partner link, and Gemlyx may earn a small commission at no cost to you. It searches Alamo, Avis, Budget, Europcar, Hertz and Thrifty for Danish pick-ups.";

// ── ASKING, ONCE, AT THE END ────────────────────────────────────────
//
// Oliver, 26 Aug 2026: "Can you perhaps make it a thing to write in the Guide
// that we'd appreciate if they use our affiliates."
//
// A fair ask, and the whole difficulty is in the register. He spent the evening
// objecting to Layla for feeling like "constant bills floating on the screen"
// and "just pay here and pay here", so the version of this that hurts the
// product is a badge on every stop, a heart, a "support us!" strip above the
// itinerary. One line, at the foot, after the trip is written, is the opposite
// of that and asks for the same thing.
//
// FOUR RULES, and each one is a way this goes wrong:
//
//   SAY WHAT IT IS. "Use our links" is a request; "these are partner links and
//   they pay us a commission" is a disclosure. It has to be both, in the same
//   sentence, or the ask is quietly asking them not to notice.
//
//   SAY IT COSTS THEM NOTHING, because it genuinely does not, and that is the
//   only reason it is reasonable to ask at all.
//
//   SAY IGNORING IT IS FINE, and mean it. This is the line that separates this
//   from every version of it he objected to. A request that cannot be declined
//   without friction is pressure wearing manners.
//
//   AND ONLY SAY IT WHERE IT IS TRUE. A guide with no partner link on it must
//   not carry this, because the sentence is a claim ABOUT THE PAGE — "where this
//   guide sends you to book" — and on a page that sends you nowhere paid it is
//   simply false. Every other gate written tonight follows the same rule.
export const supportNote = ({ partnerLinks = 0 } = {}) => {
  const n = Number(partnerLinks) || 0;
  if (n < 1) return "";
  // ── HIS WORDING, WITH THE DISCLOSURE KEPT IN FRONT OF IT ──────────
  //
  // Oliver's own line, 26 Aug: "We appreciate any use of our affiliates, it
  // helps us manage a better travelling experience for our users!"
  //
  // Two words changed and the reason for each is worth writing down, because
  // both are rules this product already holds itself to elsewhere.
  //
  //   "affiliates" → "partner links". To us it is the name of a programme. To
  //   somebody reading a trip plan it is industry jargon, and the product's own
  //   rule is to name things by what people recognise. They know what a booking
  //   link is.
  //
  //   "our users" → "you". A sentence addressed to the reader that refers to
  //   them in the third person makes them a bystander to a conversation about
  //   themselves.
  //
  // AND THE DISCLOSURE STAYS IN FRONT. His sentence is the ask; on its own it
  // does not say a commission is paid or that it costs nothing, and those two
  // facts are what make asking legitimate rather than a nudge. Same reason every
  // other paid link on this site carries a line under it.
  const ask = "We appreciate any use of them, it helps us build a better travelling experience for you.";
  const out = "Booking anywhere else is completely fine.";
  return n === 1
    ? `One booking link in this guide is a partner link, and it pays Gemlyx a small commission at no extra cost to you. We appreciate any use of it, it helps us build a better travelling experience for you. ${out}`
    : `Some of the booking links in this guide are partner links, and they pay Gemlyx a small commission at no extra cost to you. ${ask} ${out}`;
};

// How many paid links a built guide actually carries. Counts what is THERE,
// rather than what the app is capable of, so the sentence above can never
// promise a link the page does not have. `isPaid` is injected for the same
// reason every other audit in this codebase injects its judgement.
export const partnerLinkCount = (hrefs, { isPaid } = {}) =>
  (Array.isArray(hrefs) ? hrefs : []).filter(h => {
    try { return typeof isPaid === "function" ? !!isPaid(h) : false; } catch { return false; }
  }).length;

// ── TRIP.COM, AND THE FIRST DEEP LINK THIS FILE CAN BUILD ITSELF ─────
//
// Oliver, 7 Sep 2026: "Got another affiliate!" And, on why it matters here:
// "they have hotels. So I guess if we can't get booking.com.."
//
// Every other programme in this file either takes a URL somebody else found
// (Tiqets, Ticketmaster, WeGoTrip) or builds a text search (Booking). This one
// is different in a way worth naming: Trip.com's ids are ordinary query
// parameters on their own domain, so a link can be ASSEMBLED for a town from a
// city id and nothing else. No lookup, no search, no page to vet.
//
// ── WHICH IS ALSO WHY IT COVERS LESS ────────────────────────────────
//
// The city id is the price of that. bookingUrl takes free text and works for
// every town Gemlyx publishes; this works for the twenty cities Trip.com's own
// country page lists, and the hidden gems are not among them. A town with no id
// gets NULL and no button, deliberately: see data/tripcom.js for why a fallback
// to Copenhagen would be worse than nothing.
import { TRIPCOM_CITIES } from "../data/tripcom";
import { fold as foldName, variantsOf } from "./danishNames";

// Matched on the folded name, so Århus reaches Aarhus and København reaches
// Copenhagen the way they do everywhere else in this codebase. Exact rather
// than contains: "Aarhus C" is a different Trip.com city from "Aarhus" and a
// containment test would let the district win on a page about the city.
const CITY_BY_NAME = new Map(TRIPCOM_CITIES.map(c => [foldName(c.name), c]));

// ── AND KØBENHAVN HAS TO REACH COPENHAGEN ─────────────────────────
// Trip.com's list is in English and a Gemlyx row is in whichever spelling was
// drafted. Folding alone is not enough: Århus reaches Aarhus by luck, because å
// folds to aa, and København reaches nothing at all. variantsOf is the function
// this codebase already uses to turn one name into every spelling of itself,
// and PLACE_NAMES already pairs the two capitals.
export const tripcomCity = (town) => {
  const said = String(town || "").trim();
  if (!said) return null;
  for (const v of variantsOf(said)) {
    const hit = CITY_BY_NAME.get(foldName(v));
    if (hit) return hit;
  }
  return null;
};

// The tracked hotel list for one town, or null when Trip.com has no city for
// it. `sub` is the sub-id: the town goes in, so his dashboard reports which
// pages earn rather than only how much.
//
// THE IDS ARE PARAMETERS, so a caller passing empty ones gets an untracked but
// working link rather than a broken one, and the live state stays testable the
// way ticketmasterUrl's template already is.
export const tripcomStayUrl = (town, { alliance = TRIPCOM_ALLIANCE_ID, sid = TRIPCOM_SID } = {}) => {
  const city = tripcomCity(town);
  if (!city) return null;
  const q = new URLSearchParams();
  if (alliance) q.set("Allianceid", alliance);
  if (sid) q.set("SID", sid);
  // Currency and locale, because his own guide rule is that every price a
  // Danish trip quotes is in kroner, and an international reader lands on a
  // dollar figure otherwise.
  q.set("curr", "DKK");
  q.set("locale", "en-XX");
  if (alliance) q.set("trip_sub1", String(town || "").trim());
  return `https://www.trip.com/hotels/${city.slug}-hotels-list-${city.id}/?${q.toString()}`;
};

// True when the programme is actually configured, on the same terms
// tiqetsActive states: the thing that makes a link PAY is what this answers
// about, not the presence of a browse link somewhere in config.
export const tripcomActive = (alliance = TRIPCOM_ALLIANCE_ID) => !!alliance;
