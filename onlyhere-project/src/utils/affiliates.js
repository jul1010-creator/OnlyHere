import { BOOKING_AFFILIATE_ID } from "../config";

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
  : "These are plain search links. Gemlyx earns nothing from them yet.";

export const affiliateActive = () => !!BOOKING_AFFILIATE_ID;
