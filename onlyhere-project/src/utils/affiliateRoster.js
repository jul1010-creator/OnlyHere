// ── "LIST ALL OUR AFFILIATES AND WHY WE USE THEM" ────────────────────
//
// Oliver, 9 Sep 2026, asking for a page in the menu.
//
// He asked for it in the same message as a different idea, a line in Tips saying
// "Booking.com is usually cheaper in Denmark, but we appreciate use of Trip.com
// for hotel booking". That one does not ship: it asks a reader to pay more so
// that we get paid, on the page whose whole value is that it has no angle, and
// it is the same trade the entry pages had removed from them the morning before.
//
// This page is where that request belongs, and it works here because the page is
// honest about what it is. Every programme, what it sells, why it was picked,
// and whether it pays anything today. The ask at the bottom costs the reader
// nothing.
//
// ── READ FROM THE CONFIG, NEVER TYPED ────────────────────────────────
//
// A hand-written page saying "we work with Tiqets" is true until a programme
// ends, and then it is a public claim about money that nobody remembers to
// change. Every `earning` below comes from the same function the site itself
// uses to decide whether to attach a tracking id, so the page cannot say a
// programme pays while every link on the site goes out plain, and it cannot say
// one is off the day a template is pasted in.
//
// AND THE STUDIO PANEL READS THE SAME ANSWER. utils/affiliateAudit.programmeState
// is the founder-facing version of this list, with operational notes on it. The
// suite asserts the two agree about what is live, because a public page and a
// private dashboard disagreeing about money is the failure this file is most
// able to cause.
import {
  affiliateActive, tiqetsActive, ticketmasterActive, wegotripActive,
  tripcomActive, carRentalActive, getyourguideActive, bajabikesActive,
  partnerAdsPlacements,
  partnerAdsPending,
} from "./affiliates";
import { TRIPCOM_CITIES } from "../data/tripcom";

// ── WHERE THE PAGE LIVES ────────────────────────────────────────────
//
// Here rather than beside SUPPORT_PATH in App.jsx, which is where it started.
// AboutMePage links to it from the Legal card and App.jsx imports AboutMePage,
// so a constant exported from App would have had the two importing each other.
// This file already owns the page's reason for existing, so it owns its address.
export const AFFILIATES_PATH = "/affiliates";

// ── WHY, IN THE TERMS THE DECISION WAS ACTUALLY MADE IN ──────────────
//
// Not marketing copy. Each of these is the reason recorded in config.js on the
// day it was chosen, cut to a sentence a traveller can read. A reader who wants
// to know whether we picked a partner for their sake or ours is entitled to the
// real answer, and in two cases the real answer is "we turned the better rate
// down", which is worth more than any assurance.
const ROSTER = [
  {
    key: "tiqets",
    name: "Tiqets",
    sells: "Attraction tickets",
    // ── SOLD ON CONVENIENCE, NOT ON PRICE ──────────
    // Oliver, 18 Sep 2026: "Sell the affiliate by saying it's much more
    // convenient to use." Their prices are nearly identical to the gate rather
    // than identical, so the case for them is the case that is true.
    why: "One order and one card charged once for several attractions, in English, with every ticket as a QR code on your phone and free cancellation on most of them. Four attractions bought at four own sites is four checkouts and four cancellation policies. Prices are nearly identical to the gate rather than identical, so the attraction's own site is still the one to check against.",
    live: tiqetsActive,
  },
  {
    key: "getyourguide",
    name: "GetYourGuide",
    sells: "Guided tours and experiences",
    why: "This is where Denmark's canal tours, food tours, city walks and day trips are. A guided tour has no ticket window selling the same thing cheaper, which is why we point at experiences here and not at museum admissions.",
    live: getyourguideActive,
  },
  {
    key: "bajabikes",
    name: "Baja Bikes",
    sells: "Guided bike tours and bike rental, Copenhagen only",
    why: "Copenhagen is a city you see properly from a bike and badly from a bus, and they are the one partner on this list who rents you one. Every product they have in Denmark is in Copenhagen, which is why you will not see this anywhere else on the site.",
    live: bajabikesActive,
  },
  {
    key: "ticketmaster",
    name: "Ticketmaster",
    sells: "Concert and event tickets",
    why: "Most Danish festivals and concerts sell through them, and an event page is dated, so a link either works for your trip or is not shown.",
    live: ticketmasterActive,
  },
  {
    key: "wegotrip",
    name: "WeGoTrip",
    sells: "Self-guided audio walks",
    // ── "WHY BE CAREFUL?" ────────────────────
    // Oliver, 18 Sep 2026, reading this page: "I doubt those partners will be
    // happy seeing 'be careful with WeGoTrip'.. why be careful? The chances
    // that they've even read my blog in the first place is quite small.. they
    // take the guide and that's it."
    //
    // He is right, and it is the "yet" in the old stay disclosure all over
    // again: a founder's note about competition, printed under a partner's name
    // on a page a reader and the partner can both open. The reservation was
    // about whether WeGoTrip's audio walks substitute for what Gemlyx writes,
    // which is a question about our product and not a warning about theirs, and
    // nothing on a reader-facing page follows from it.
    //
    // It belongs here, where it is still on the record and reads as what it is.
    why: "Self-guided audio walks, which is the one thing on this list that works the minute you arrive: no booking window, nobody to meet, and you stop when you like. Offered where a walk exists for a place a guide already sends you to.",
    live: wegotripActive,
  },
  {
    key: "booking",
    name: "Booking.com",
    sells: "Places to stay",
    why: "It has rooms in towns nobody else lists, including the small ones this site exists for.",
    live: affiliateActive,
  },
  {
    key: "tripcom",
    name: "Trip.com",
    sells: "Places to stay",
    // The number is read rather than written, so a city added to the catalogue
    // changes this sentence without anybody editing it.
    why: `A second price to compare on stays. It reaches ${TRIPCOM_CITIES.length} Danish cities and no more: a town they have no listing for shows no Trip.com link at all, rather than sending you to the nearest big city.`,
    live: tripcomActive,
  },
  {
    key: "carhire",
    // ── A CLOSED PROGRAMME IS NOT AN ANSWER TO "HOW ARE YOU PAID" ──
    // AutoEurope closed on 14 Sep 2026 and CAR_RENTAL_LINK was emptied the same
    // night, so this row named a partner that no longer exists, under a heading
    // about money, on the page least likely to be corrected. Same call Oliver
    // made about Airbnb on 9 Sep: "Airbnb stopped being an affiliate in 2021.
    // So remove that."
    //
    // The row stays in the source, because a car programme is being chosen
    // right now and this is where its reason goes. hideWhenOff keeps it off the
    // page until one pays, rather than printing a partner's name beside the
    // word nothing.
    name: "Car hire",
    hideWhenOff: true,
    sells: "Car hire",
    why: "A car is the only way to reach a lot of what this site writes about, and the link appears only on a trip you have said involves driving, never on a page telling you a car is not worth it. The last programme was chosen over one paying more than twice the rate, because that one had no Danish cars at all, and its replacement is being picked on the same test.",
    live: carRentalActive,
  },
];

// ── AND AIRBNB IS NOT ON IT ─────────────────────────────────────────
//
// It was, for one evening, under a heading saying it earns nothing. Oliver, 9
// Sep 2026: "Airbnb stopped being an affiliate in 2021. So remove that."
//
// He is right and the first version was answering the wrong question. This page
// says how Gemlyx is paid, and a company that pays us nothing is not an answer
// to it: listing it was a transparency gesture that made the page longer and
// the list less true to its own heading.
//
// THE HONESTY IT WAS CARRYING DID NOT GO ANYWHERE. affiliates.stayDisclosure
// prints "The Airbnb link earns nothing" underneath the actual Airbnb button,
// on the row where a reader is deciding whether to press it. That is a better
// place for it than a list on another page, and it is the place the disclosure
// rules in this codebase have always insisted on: the sentence travels with the
// link rather than being filed somewhere.
// ── AND THE TWO PARTNER-ADS PLACEMENTS, 18 SEP 2026 ──────
//
// Oliver: "remember to add the hotel and tip inside the 'how we're paid'. I
// don't want to lie to people."
//
// GENERATED, not typed, and that is the same decision the header of this file
// makes about every other row. A partner-ads banner is named in config.js or it
// is placed nowhere on the site, so the row exists exactly when the placement
// does: one line in config gives the hotel a row here, and emptying it takes
// the row away. Nobody has to remember either.
//
// One row per ADVERTISER rather than one for the network, because "Partner-ads"
// answers none of the three questions this page asks. A reader wants to know
// which hotel, what it sells, and why it is on the page.
const PARTNER_ADS_WHY = {
  stay: "The one hotel we have a partnership with. It is named inside guides that already pass through its own town, never as a reason to send you there, and the Booking.com search sits beside it so you can pick something else.",
  gear: "Travel gear, on the Tips page and nowhere else. Nothing about a trip changes if you buy none of it, which is why it sits under advice rather than beside a place.",
  other: "A partner offer, named on the page it appears on rather than only here.",
};

// `placements` is an argument so the suite can see what a named banner produces
// without a config constant existing for it to flip.
// ── AND THE ONES THAT ARE SIGNED UP AND NOT YET NAMED ────
//
// A programme nobody can reach earns nothing, so its dot says so in the same
// size type as a live one. What it may NOT do is be absent: this page answers
// how Gemlyx is paid, and two signed-up programmes missing from it is the page
// being incomplete about money, which is the one thing it exists not to be.
//
// One row for both, because two rows reading "Partner Ads" with no company name
// tell a reader less than one row naming both slots.
export const partnerAdsPendingRow = (pending = partnerAdsPending()) => {
  if (!pending.length) return [];
  const slots = pending.map(p => p.slot === "stay" ? "a hotel" : p.slot === "gear" ? "travel gear" : "a partner offer");
  return [{
    key: "partnerads-pending",
    name: "Partner Ads",
    sells: slots.join(" and "),
    why: `A Danish affiliate network. ${pending.length === 1 ? "One programme is" : `${pending.length} programmes are`} signed up here and ${pending.length === 1 ? "it is" : "they are"} not live: nothing on the site links to ${pending.length === 1 ? "it" : "them"} yet, so ${pending.length === 1 ? "it earns" : "they earn"} nothing. A klikbanner link says nothing about where it goes, so the company has to be named in the site's own configuration before a button can tell you whose page you are about to open. When one goes live, this row names the company.`,
    earning: false,
  }];
};

export const partnerAdsRows = (placements = partnerAdsPlacements()) =>
  placements.map(p => ({
    key: `partnerads-${p.banner}`,
    name: p.merchant,
    sells: p.slot === "stay" ? `A place to stay${p.town ? ` in ${p.town}` : ""}`
      : p.slot === "gear" ? "Travel gear"
      : "A partner offer",
    why: PARTNER_ADS_WHY[p.slot] || PARTNER_ADS_WHY.other,
    // A named placement is a live link on the site, so it earns. There is no
    // half state: an unnamed banner never reaches this function.
    earning: true,
  }));

// The roster with the live state resolved, newest question first: does this
// programme pay anything TODAY. `live` is a function rather than a boolean so
// the answer is read when the page renders, not when this module is imported.
export const affiliateRoster = () => [
  ...ROSTER
    .map(({ live, ...rest }) => ({ ...rest, earning: !!live() }))
    // A row that opted in to being hidden while it earns nothing. See the car
    // row: the alternative is a partner's name printed under a heading about
    // money next to the word nothing.
    .filter(p => !(p.hideWhenOff && !p.earning))
    .map(({ hideWhenOff, ...rest }) => rest),
  ...partnerAdsRows(),
  ...partnerAdsPendingRow(),
];

// What the page says at the top, and it has to be countable rather than a claim.
// "Some of the links here are paid" over a site where none of them are would be
// the sentence this whole file exists to prevent.
export const payingCount = () => affiliateRoster().filter(p => p.earning).length;
