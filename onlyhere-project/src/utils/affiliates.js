import { BOOKING_AFFILIATE_ID, TICKETMASTER_AFFILIATE_TEMPLATE } from "../config";
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
