// ── GETYOURGUIDE'S DANISH ACTIVITIES, HAND CHECKED ──────────────────
//
// Oliver, 9 Sep 2026: "Can we put activities into the different blogs? Like pub
// crawl wouldn't need to go all the way into a blog, but rather stay in the
// nightlife town tab of Aarhus if it was pubcrawl in Aarhus, if you know what I
// mean?" And then, with the first row below: "Or hop onto Getyourguide and book
// a beerwalk!"
//
// That sentence is the whole design. Not a card in the grid beside his own
// checked entries, which would borrow the OUR PAGE badge whether or not it wore
// one. A line at the foot of the section, in his voice, obviously pointing
// somewhere else.
//
// ── A FILE RATHER THAN A SEARCH, FOR wegotrip.js'S REASON ───────────
//
// GetYourGuide holds hundreds of thousands of products and no listing of the
// Danish ones, so this is not their whole catalogue and never will be. It is a
// checked shortlist: one or two per town and category, picked for being the
// thing a reader of that section would actually want, and checked on a date
// written down below.
//
// THE COST OF THAT CHOICE IS STALENESS, exactly as it is for WeGoTrip. A product
// that disappears leaves a dead link on a public page, which is the failure this
// codebase minds most. Check it when it starts looking old.
export const CHECKED_ON = "2026-09-09";
export const GETYOURGUIDE_SOURCE = "https://www.getyourguide.com/da-dk/s/?q=Denmark";

// ── THE URL IS STORED CLEAN ─────────────────────────────────────────
//
// The address Oliver pasted was
//   .../aarhus-craft-beerwalk-t693822/?ranking_uuid=52e539b5-...&q=Aarhus&adults=1
// and two thirds of that query has no business on a public link. `ranking_uuid`
// is a tracking id from HIS OWN search session, and `adults=1` presets a party
// size for a reader who may be four people and who never asked to be one.
//
// So what is kept is the product address and nothing else. The partner id goes
// on at render, through affiliates.getyourguideUrl, which is also what makes a
// programme that ends stop paying without this file being touched.
//
// ── AND `what` IS WRITTEN IN THREE LANGUAGES ────────────────────────
//
// It is the noun phrase the sentence ends on, so it is OUR words rather than a
// fact about Denmark, and entryWords' rule applies: a phrase we wrote is a
// phrase a Danish reader meets in Danish. The product's own title is not used
// for this. GetYourGuide titles are marketing ("Aarhus: Craft Beerwalk with
// 5 Beers & Snacks") and reading one aloud in Gemlyx's voice would be quoting an
// advert as though it were a recommendation.
//
// `kind` is the section it belongs under, using the same vocabulary the site's
// own tabs use, so a row cannot be filed under a tab that does not exist.
export const GETYOURGUIDE_KINDS = ["nightlife", "food", "attraction", "town"];

export const GETYOURGUIDE_DK = [
  {
    town: "Aarhus",
    kind: "nightlife",
    url: "https://www.getyourguide.com/da-dk/aarhus-l32302/aarhus-craft-beerwalk-t693822/",
    what: { en: "a craft beer walk", da: "en craft beer-tur", de: "eine Craft-Beer-Tour" },
  },
];
