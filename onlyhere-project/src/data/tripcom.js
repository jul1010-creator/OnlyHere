// ── TRIP.COM'S DANISH CITIES, READ OFF THEIR OWN PAGE ────────────────
//
// Oliver, 7 Sep 2026: "Got another affiliate!" and then, on Booking: "I have
// applied!!! I just haven't gotten answered yet.. I might contact them" and "I
// applied weeks ago I mean."
//
// ── WHY A CATALOGUE AND NOT A SEARCH ────────────────────────────────
//
// bookingUrl builds a Booking.com search out of FREE TEXT, so it works for
// every town Gemlyx publishes including the ones nobody has heard of. Trip.com's
// hotel list needs a numeric city id:
//
//   trip.com/hotels/copenhagen-hotels-list-260/
//                                        ^^^
//
// and no rule turns "Aalborg" into 1441. That is the same wall Tiqets product
// ids were, and the same answer applies: a hand-checked list with the page it
// was read off and the day it was read, exactly as data/wegotrip.js does.
//
// ── WHAT THIS LIST IS AND IS NOT ────────────────────────────────────
//
// It is every Danish city Trip.com's own country page linked to on the date
// below. It is NOT everywhere Trip.com has hotels, and it is nowhere near
// everywhere Gemlyx publishes: the hidden-gem towns this whole site exists for
// are not on it and will not be. A town missing from here gets no Trip.com
// button, which is the right answer rather than a fallback to Copenhagen: a
// link that promised a reader Asaa and lands them 300 km away is the failure
// TIQETS_BROWSE_LINK's comment already describes.
//
// THE SLUG IS STORED, NOT DERIVED. Trip.com's own slugs are folded
// inconsistently — Hornbæk is "hornbk", Aarhus is "aarhus", Sønderborg is
// "sonderborg" — so a slugify rule would be wrong for at least one of them and
// there is no way to know which without checking every link. Copied verbatim
// from the URLs instead.
export const TRIPCOM_SOURCE = "https://www.trip.com/hotels/country/denmark.html";
export const TRIPCOM_CHECKED_ON = "7 Sep 2026";

// name is what a Gemlyx town is called; slug and id are Trip.com's own.
export const TRIPCOM_CITIES = [
  { name: "Copenhagen",     slug: "copenhagen",     id: 260 },
  { name: "Aarhus",         slug: "aarhus",         id: 3324 },
  { name: "Aalborg",        slug: "aalborg",        id: 1441 },
  { name: "Odense",         slug: "odense",         id: 781 },
  { name: "Billund",        slug: "billund",        id: 1709 },
  { name: "Esbjerg",        slug: "esbjerg",        id: 5238 },
  { name: "Kolding",        slug: "kolding",        id: 4135 },
  { name: "Vejle",          slug: "vejle",          id: 6230 },
  { name: "Herning",        slug: "herning",        id: 38013 },
  { name: "Viborg",         slug: "viborg",         id: 38109 },
  { name: "Frederikshavn",  slug: "frederikshavn",  id: 38001 },
  { name: "Sønderborg",     slug: "sonderborg",     id: 38082 },
  { name: "Aabenraa",       slug: "aabenraa",       id: 37981 },
  { name: "Middelfart",     slug: "middelfart",     id: 38065 },
  { name: "Holbæk",         slug: "holbaek",        id: 112318 },
  { name: "Hornbæk",        slug: "hornbk",         id: 38022 },
  { name: "Nykøbing Mors",  slug: "nykobing-mors",  id: 56744 },
  { name: "Vemb",           slug: "vemb",           id: 56787 },
  // Kastrup is the airport's town and Aarhus C is Aarhus's centre district.
  // Both are real Trip.com cities and neither is a Gemlyx town, so they are
  // here for completeness of what that page listed and are matched last: a
  // traveller reading the Copenhagen page wants Copenhagen's list, not the
  // airport's.
  { name: "Kastrup",        slug: "kastrup",        id: 38038 },
  { name: "Aarhus C",       slug: "aarhus-c",       id: 112234 },
];
