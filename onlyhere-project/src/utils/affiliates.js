import { BOOKING_AFFILIATE_ID, TICKETMASTER_AFFILIATE_TEMPLATE, TIQETS_BROWSE_LINK, TIQETS_AFFILIATE_TEMPLATE, CAR_RENTAL_LINK, WEGOTRIP_LINK, WEGOTRIP_AFFILIATE_TEMPLATE } from "../config";
// hostOf, not a fourth copy of it. See pageScan.js, and see the four other
// functions this codebase has already found existing twice.
import { hostOf } from "./pageScan";

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

export const bookingUrl = ({ area, near = "", country = "Denmark", checkin, checkout, adults = 2 } = {}) => {
  if (!area) return null;
  const d = dateRange(checkin, checkout);
  return `https://www.booking.com/searchresults.html?ss=${q(`${withTown(area, near)}, ${country}`)}` +
    (d.checkin ? `&checkin=${d.checkin}&checkout=${d.checkout}` : "") +
    `&group_adults=${adults}&no_rooms=1` +
    (BOOKING_AFFILIATE_ID ? `&aid=${BOOKING_AFFILIATE_ID}` : "");
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
export const STAY_DISCLOSURE = BOOKING_AFFILIATE_ID
  ? "Booking.com links may earn Gemlyx a small commission at no cost to you. The Airbnb link earns nothing."
  // ── AND "YET" IS A NOTE TO YOURSELF ─────────────────────────────
  // Oliver, 15 Aug 2026, reading a live town page: "anything that does not look
  // professionel gotta go." This line said "Gemlyx earns nothing from them
  // yet", and the "yet" is the tell: it is a founder's note about a plan,
  // printed under a reader's booking buttons. A reader does not need to know
  // what we intend to monetise later, only whether the link in front of them is
  // paid. It is not, and that is the whole sentence.
  : "Plain search links. Gemlyx earns no commission on these.";

export const affiliateActive = () => !!BOOKING_AFFILIATE_ID;

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
    ? "Booking through this link may earn Gemlyx a small commission. It costs you nothing and does not change the price."
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
    ? "Booking through this link may earn Gemlyx a small commission. It costs you nothing and does not change the price."
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
    ? "Booking through this link may earn Gemlyx a small commission. It costs you nothing and does not change the price."
    : "";

// ── CAR HIRE, AND WHY THERE IS NO LINK HERE YET ─────────────────────
//
// Oliver, 15 Aug 2026, sending a GetRentacar link: "I guess multiple car ones
// are fine."
//
// Several car programmes IS fine, and this returns the one configured link
// rather than a list on purpose. A page offering a reader two rental buttons
// has not given them more choice, it has given them a decision they did not
// come here to make, and the second button halves the clicks on the first.
// Several programmes, one link: pick per page by which has the cars.
//
// AND THAT IS THE PART THAT IS NOT SETTLED. GetRentacar is a marketplace of
// cars from local owners, and its own front page lists Turkey, the UAE, Spain,
// Greece and the United States. Denmark is not on it, its /country/denmark page
// is a 404, and no search turns up Danish inventory. A rental link that opens
// on an empty result is worse than no link at all: the reader learns that
// Gemlyx sends them to things that are not there, which costs more than the
// commission was ever going to pay.
//
// So this ships empty and the check is one search on their own site for
// Copenhagen. If the cars are there, paste the link. If they are not, the
// programmes with real Danish coverage are DiscoverCars and Rentalcars, both
// reachable through Travelpayouts.
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
];

export const isPartnerLink = (url) => {
  const raw = String(url || "").trim();
  const h = hostOf(raw);
  if (!h) return false;
  if (PARTNER_HOSTS.some(d => h === d || h.endsWith(`.${d}`))) return true;
  // The one that is decided by a parameter rather than a host.
  return /(?:[?&])aid=\d/.test(raw) && (h === "booking.com" || h.endsWith(".booking.com"));
};

// One sentence, the same one the other disclosures use, and "" when the link
// earns nothing. A caller can render it unconditionally and print nothing on an
// ordinary link.
export const partnerDisclosure = (url) =>
  isPartnerLink(url)
    ? "Partner link. Gemlyx may earn a small commission, at no cost to you and with no change to the price."
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
  booking: "Booking.com",
  ticketmaster: "Ticketmaster",
  discovercars: "DiscoverCars",
  rentalcars: "Rentalcars",
  getrentacar: "GetRentacar",
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
  for (const wrap of [ticketmasterUrl, tiqetsUrl, wegotripUrl]) {
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
export const affiliateNote = (url) => ticketDisclosure(url) || tiqetsDisclosure(url) || wegotripDisclosure(url) || "";

// True when the link is going through a programme, for a caller that has to set
// rel="sponsored nofollow", which is what Google asks of a paid link.
export const isAffiliateHref = (url) => {
  const raw = String(url || "").trim();
  const out = affiliateHref(raw);
  return !!out && out !== raw;
};



export const partnerMerchant = (url) => {
  if (!isPartnerLink(url)) return "";
  const h = hostOf(url);
  if (!h) return "";
  const first = h.split(".")[0].toLowerCase();
  // A bare programme host with no subdomain names nothing: booking.com?aid= is
  // recognised as paid by its parameter and its first label is the merchant
  // itself, which is fine, and impact.com is the network with no merchant in it.
  return PARTNER_MERCHANTS[first] || "";
};

export const linkLabel = (url) => {
  if (!isPartnerLink(url)) return "Official site";
  const who = partnerMerchant(url);
  return who ? `Book on ${who}` : "Partner site";
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
