// ── WEGOTRIP'S DANISH INVENTORY, READ OFF THEIR OWN COUNTRY PAGE ─────
//
// Oliver, 6 Sep 2026: "Is it possible to do a sweep with wegotrip that is 'add
// audio to this tour' on the blogs that has the possible?"
//
// Yes, and it turned out cheaper than the ticket sweep rather than dearer,
// because WeGoTrip's ENTIRE Danish catalogue is twenty products on one page:
// wegotrip.com/denmark-s2623032. Twenty is small enough to hold, so nothing
// here costs a search, a scrape or a model call. The sweep reads this file and
// matches it against the published rows in memory.
//
// ── AND THAT IS WHY IT IS A FILE AND NOT A FETCH ────────────────────
//
// The alternative was a search per row, which is what the ticket sweep has to
// do because Tiqets and Ticketmaster hold hundreds of thousands of pages and no
// listing of the Danish ones. WeGoTrip publishes its Danish list in full, so
// paying to rediscover it a row at a time would be spending money to learn what
// is written on one page. Same shape as essentials.js and freeEntrance.js: a
// small, curated set that a human checked.
//
// THE COST OF THAT CHOICE IS STALENESS, so the date is here rather than in a
// commit message, the Studio panel prints it, and refreshing this file is one
// read of the country page. New products appear; a product that disappears
// leaves a dead link on a public card, which is the failure this codebase minds
// most. Check it when it starts looking old.
export const CHECKED_ON = "2026-09-06";
export const WEGOTRIP_SOURCE = "https://wegotrip.com/denmark-s2623032/";

// ── TWO KINDS, AND THEY WANT DIFFERENT HOMES ────────────────────────
//
//   audio    a self-guided audio walk. Every one of them is about a TOWN, not
//            an attraction: "Copenhagen: Self-Guided Audio Walk Through the Old
//            City Heart" belongs on the Copenhagen page and nowhere else.
//            Thirteen of them, across five towns.
//   ticket   admission to one named attraction, which is the same thing Tiqets
//            sells and belongs in the same field. Six of them here, out of the
//            seven they list: see the note beside Legoland.
//
// The split is not read off the URL. Six of the seven tickets say "entry-ticket"
// in the slug and every audio walk says "self-guided-audio", but "Best of
// Copenhagen" says neither and IS an audio tour: checked on its own page,
// 6 Sep 2026, €15, self-guided. A slug rule would have filed it wrong, which is
// the argument for a checked list over a clever regex.
export const WEGOTRIP_DK = [
  // ── SELF-GUIDED AUDIO WALKS ───────────────────────────────────────
  { kind: "audio", town: "Aalborg", title: "Aalborg: Self-Guided Audio Tour Through Fjord and Time", url: "https://wegotrip.com/aalborg-d2624886/aalborg-self-guided-audio-tour-through-fjord-and-time-p11554/" },
  { kind: "audio", town: "Aarhus", title: "Aarhus: Self-Guided Audio Walk Through Harbor and History", url: "https://wegotrip.com/arhus-d2624652/aarhus-self-guided-audio-walk-through-harbor-and-history-p11319/" },
  { kind: "audio", town: "Aarhus", title: "Aarhus: Self-Guided Audio Walk Through History and Green Streets", url: "https://wegotrip.com/arhus-d2624652/aarhus-self-guided-audio-walk-through-history-and-green-streets-p11021/" },
  { kind: "audio", town: "Helsingør", title: "Helsingør: Self-Guided Audio Walk Through Elsinore by the Sea", url: "https://wegotrip.com/helsingr-d2620473/helsingr-self-guided-audio-walk-through-elsinore-by-the-sea-p11255/" },
  { kind: "audio", town: "Roskilde", title: "Roskilde: Self-Guided Audio Walk Through Kings, Fjord and Vikings", url: "https://wegotrip.com/roskilde-d2614481/roskilde-self-guided-audio-walk-through-kings-fjord-and-vikings-p11053/" },
  { kind: "audio", town: "Copenhagen", title: "Copenhagen: Self-Guided Audio Walk Through the Old City Heart", url: "https://wegotrip.com/copenhagen-d2618425/copenhagen-self-guided-audio-walk-through-the-old-city-heart-p26610/" },
  { kind: "audio", town: "Copenhagen", title: "Copenhagen: Self-Guided Audio Walk Through Royal Canals and Culture", url: "https://wegotrip.com/copenhagen-d2618425/copenhagen-self-guided-audio-walk-through-royal-canals-and-culture-p27029/" },
  { kind: "audio", town: "Copenhagen", title: "Copenhagen: Self-Guided Audio Walk Through Royal Harbor Streets", url: "https://wegotrip.com/copenhagen-d2618425/copenhagen-self-guided-audio-walk-through-royal-harbor-streets-1-p26609/" },
  { kind: "audio", town: "Copenhagen", title: "Copenhagen: Self-Guided Audio Walk Through Harbor and Palaces", url: "https://wegotrip.com/copenhagen-d2618425/copenhagen-self-guided-audio-walk-through-harbor-and-palaces-p26608/" },
  { kind: "audio", town: "Copenhagen", title: "Copenhagen: Self-Guided Audio Walk Through Royal Old Copenhagen", url: "https://wegotrip.com/copenhagen-d2618425/copenhagen-self-guided-audio-walk-through-royal-old-copenhagen-p26383/" },
  { kind: "audio", town: "Copenhagen", title: "Copenhagen: Self-Guided Audio Walk Through Royal Harbor Stories", url: "https://wegotrip.com/copenhagen-d2618425/copenhagen-self-guided-audio-walk-through-royal-harbor-stories-p26328/" },
  { kind: "audio", town: "Copenhagen", title: "Copenhagen: Self-Guided Audio Walk Through Royal Harbor Streets", url: "https://wegotrip.com/copenhagen-d2618425/copenhagen-self-guided-audio-walk-through-royal-harbor-streets-p26324/" },
  { kind: "audio", town: "Copenhagen", title: "Best of Copenhagen: Get to know the capital of Denmark", url: "https://wegotrip.com/copenhagen-d2618425/best-of-copenhagen--get-to-know-the-capital-of-denmark-p27108/" },

  // ── ADMISSION TO ONE NAMED ATTRACTION ─────────────────────────────
  // `place` is what the row has to be about, and it is separate from `title`
  // deliberately: the title is WeGoTrip's marketing line and the place is the
  // thing Gemlyx publishes a page about. Matching on the title would make
  // "LEGOLAND® Billund 2-Day Ticket" fail to match a row called "Legoland
  // Billund Resort" over a registered-trademark sign.
  // ── AND THE ONE THAT IS DELIBERATELY NOT HERE ─────────────────────
  // Their Denmark page lists twenty products; this file holds nineteen.
  // "LEGOLAND® Billund 2-Day Ticket" (p20981) is the twentieth, and it is left
  // out because a row carries ONE ticket link and the standard entry ticket is
  // the right default for a page about Legoland. Listing both would make
  // ticketFor pick whichever came first in the array, which is a decision made
  // by array order rather than by anything true.
  { kind: "ticket", town: "Billund", place: "Legoland Billund", title: "LEGOLAND® Billund: Entry Ticket", url: "https://wegotrip.com/billund-d2624144/legoland-billund-entry-ticket-p20636/" },
  { kind: "ticket", town: "Billund", place: "WOW PARK Billund", title: "WOW PARK Billund: Entry Ticket", url: "https://wegotrip.com/billund-d2624144/wow-park-billund-entry-ticket-p21085/" },
  { kind: "ticket", town: "Skjern", place: "WOW PARK Skjern", title: "WOW PARK Skjern: Entry Ticket", url: "https://wegotrip.com/ringkbing-d2614776/wow-park-skjern-entry-ticket-p21437/" },
  { kind: "ticket", town: "Givskud", place: "Givskud Zoo", title: "Givskud Zoo - Zootopia: Entry Ticket", url: "https://wegotrip.com/vejle-d2610613/givskud-zoo-zootopia-entry-ticket-p20916/" },
  { kind: "ticket", town: "Copenhagen", place: "Home of Carlsberg", title: "Home of Carlsberg: Entry Ticket + Drink", url: "https://wegotrip.com/copenhagen-d2618425/home-of-carlsberg-entry-ticket-drink-p21610/" },
  { kind: "ticket", town: "Copenhagen", place: "IKONO Copenhagen", title: "IKONO Copenhagen: Entry Ticket", url: "https://wegotrip.com/copenhagen-d2618425/ikono-copenhagen-entry-ticket-p21658/" },
];

// ── AND THE TOWN PAGES, FOR THE TOWNS WITH SEVERAL WALKS ────────────
//
// Copenhagen has eight. Putting one of them on the Copenhagen page is a choice
// made on the reader's behalf with no reason behind it, and putting eight is a
// menu on a page that is not a shop. So a town with more than one walk links to
// WeGoTrip's own page for that town and the label says how many there are.
//
// This is the browse-versus-deep-link distinction the Tiqets block in config.js
// spends a paragraph on, and it lands on the other side of it here for a reason
// worth stating: a reader who clicked "Tickets" on Rosenborg was promised
// Rosenborg, and a reader offered "self-guided audio walks in Copenhagen" was
// promised the set. The browse link is the honest answer to the second and a
// betrayal of the first.
// EVERY TOWN WITH MORE THAN ONE WALK MUST BE IN HERE. audioFor returns null
// without it rather than picking one of several on the reader's behalf, so a
// missing entry is a silently absent offer. The suite asserts it.
export const WEGOTRIP_TOWN_PAGE = {
  Copenhagen: "https://wegotrip.com/copenhagen-d2618425/",
  Aarhus: "https://wegotrip.com/arhus-d2624652/",
  Aalborg: "https://wegotrip.com/aalborg-d2624886/",
  Helsingør: "https://wegotrip.com/helsingr-d2620473/",
  Roskilde: "https://wegotrip.com/roskilde-d2614481/",
  Billund: "https://wegotrip.com/billund-d2624144/",
  Vejle: "https://wegotrip.com/vejle-d2610613/",
  Ringkøbing: "https://wegotrip.com/ringkbing-d2614776/",
};
