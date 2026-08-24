import { BOOKING_AFFILIATE_ID, TICKETMASTER_AFFILIATE_TEMPLATE, TIQETS_BROWSE_LINK, TIQETS_AFFILIATE_TEMPLATE, CAR_RENTAL_LINK } from "../config";
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

// Dates are optional. A search with no dates is still a useful search, and a
// half-filled date range is worse than none, so both must be present or neither.
const dateRange = (checkin, checkout) =>
  checkin && checkout ? { checkin, checkout } : {};

export const bookingUrl = ({ area, country = "Denmark", checkin, checkout, adults = 2 } = {}) => {
  if (!area) return null;
  const d = dateRange(checkin, checkout);
  return `https://www.booking.com/searchresults.html?ss=${q(`${area}, ${country}`)}` +
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
  for (const wrap of [ticketmasterUrl, tiqetsUrl]) {
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
export const affiliateNote = (url) => ticketDisclosure(url) || tiqetsDisclosure(url) || "";

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
