// ── Denmark facts, for the guide loading screen ────────────────────
// Oliver's ask: while a guide builds, real photos and real facts about
// Denmark should pop up, not a bare spinner. Each entry pairs an existing
// photo already on disk (public/) with a short, verified, real fact about
// that specific place or person, no invented details. Naming convention
// per Oliver: the photo's subject is what the fact is about, e.g.
// hc-andersen.jpg pairs with facts about H.C. Andersen, jelling.jpg with
// facts about the Jelling stones.
//
// Deliberately NOT included: the Little Mermaid statue and the LEGO logo,
// same commercial risk reasoning as the entrance card photo swap, see
// CHANGES_THIS_PASS.md. If more photos get added to public/ later, add
// them here following the same shape, real fact only, no filler.
// `category` drives which photo treatment DenmarkFactsLoader (App.jsx) uses —
// Oliver's idea: history should look different from attractions, which should
// look different from nightlife/food, "it depends on their taste." Shipped
// treatments: history (parchment), attractions/nature (map + pin), nightlife
// (neon glow), food (wooden tray + steam). Events don't get their own
// category here — an event fact just gets tagged with whichever of the above
// actually fits it, same as events.js's own real tags already do.
// nightlife has no entries yet: there are no real curated nightlife photos in
// this app yet (checked src/data/nightlife.js, no `photo` field on any spot),
// and a fabricated one would break the "never fabricate a photo" rule.
export const denmarkFacts = [
  {
    id: "hc-andersen",
    name: "H.C. Andersen",
    category: "history",
    photo: "/hc-andersen.jpg",
    // BUG FIX (Oliver: "H.C. Andersen's head seems to be cut off"): the
    // source photo is a TALL portrait (500x763, head near the very top),
    // and the loading card's fixed 210x170 landscape box was center-cropping
    // it with no objectPosition override — a plain center crop of a portrait
    // photo into a wide box trims equally off the top and bottom, and since
    // the head sits in roughly the top third here, that cut straight through
    // it. photoPos biases the crop toward the top so the whole head/face
    // stays in frame, same pattern the entrance card already uses for its
    // own hero photo.
    photoPos: "50% 12%",
    fact: "Born in Odense in 1805, he wrote over 150 fairy tales, including The Little Mermaid, The Ugly Duckling, and The Princess and the Pea, translated into more than 125 languages.",
  },
  {
    id: "ribe",
    name: "Ribe",
    category: "history",
    photo: "/ribe.jpg",
    fact: "Founded around 700 AD, Ribe is the oldest town in Scandinavia, with a medieval cathedral and cobblestone streets that still follow their original layout.",
  },
  {
    id: "kronborg",
    name: "Kronborg Castle",
    category: "attractions",
    photo: "/kronborgslot.jpg",
    fact: "This Renaissance castle in Helsingor is the real setting Shakespeare used for Hamlet's Elsinore, and is a UNESCO World Heritage Site.",
  },
  {
    id: "jelling",
    name: "The Jelling Stones",
    category: "history",
    photo: "/jelling.jpg",
    // Also a portrait source (768x1024) — the carved stone's own top bulge
    // sits close to the frame's top edge, so bias slightly upward too rather
    // than trimming evenly off both ends.
    photoPos: "50% 30%",
    fact: "Carved in the 900s under King Harald Bluetooth, these runic stones record the christening of Denmark and are sometimes called the country's birth certificate.",
  },
  {
    id: "viking-ships",
    name: "Roskilde's Viking Ships",
    category: "history",
    photo: "/vikingshipmuseum1.jpg",
    fact: "The Viking Ship Museum in Roskilde displays five original Viking ships, deliberately sunk in the fjord around 1070 AD to block a channel, and recovered nearly 900 years later.",
  },
  {
    id: "amalienborg",
    name: "Amalienborg",
    category: "attractions",
    photo: "/amalienborg1.jpg",
    // Portrait source (3901x5852): the guard himself sits noticeably left of
    // center with plain wall filling the right side, and his bearskin hat is
    // in the upper third — a plain center crop pushes him too far right and
    // trims close to his hat. photoPos keeps him properly framed.
    photoPos: "35% 30%",
    fact: "The Danish royal family's winter home is actually four matching rococo palaces arranged around an octagonal courtyard, with a daily changing of the guard when the monarch is in residence.",
  },
  {
    id: "harrys-place",
    name: "Harry's Place",
    category: "food",
    // Same real photo food.js's Harry's Place entry uses, correct extension.
    // Found while adding this: food.js itself has the wrong extension on
    // its own photo field (references harrysplace1.jpg, the real file on
    // disk is harrysplace1.png), a pre-existing bug, not something this
    // pass touches, flagged to Oliver separately.
    photo: "/harrysplace1.png",
    // Portrait source — the sign is the whole point of this fact, keep it
    // clearly in frame instead of losing it to an even top/bottom trim.
    photoPos: "50% 25%",
    fact: "A hot dog cart in Copenhagen since 1965, still run with the same hands-on style the whole time. Cash or Dankort only, no seats, just stand and eat like generations before you.",
  },
];
