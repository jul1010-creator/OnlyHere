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
  tripcomActive, carRentalActive, getyourguideActive,
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
    why: "Their product pages cover a lot of what Denmark charges to get into, and a link goes to the exact attraction rather than a search.",
    live: tiqetsActive,
  },
  {
    key: "getyourguide",
    name: "GetYourGuide",
    sells: "Guided tours and experiences",
    why: "This is where Denmark's canal tours, food tours, city walks and day trips actually are. A guided tour has no ticket window selling the same thing cheaper, which is why we point at experiences here and not at museum admissions.",
    live: getyourguideActive,
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
    why: "The closest thing on this list to what Gemlyx already writes, which is the reason to be careful with it as much as the reason to have it. It is offered where a walk adds something our own writing does not.",
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
    name: "AutoEurope",
    sells: "Car hire",
    why: "Chosen over a programme paying more than twice the rate, because that one had no Danish cars at all. AutoEurope has nine Danish airports. The link only appears on a trip you have said involves driving.",
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
// The roster with the live state resolved, newest question first: does this
// programme pay anything TODAY. `live` is a function rather than a boolean so
// the answer is read when the page renders, not when this module is imported.
export const affiliateRoster = () =>
  ROSTER.map(({ live, ...rest }) => ({ ...rest, earning: !!live() }));

// What the page says at the top, and it has to be countable rather than a claim.
// "Some of the links here are paid" over a site where none of them are would be
// the sentence this whole file exists to prevent.
export const payingCount = () => affiliateRoster().filter(p => p.earning).length;
