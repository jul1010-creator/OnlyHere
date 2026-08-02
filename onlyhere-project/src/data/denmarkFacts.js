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
export const denmarkFacts = [
  {
    id: "hc-andersen",
    name: "H.C. Andersen",
    photo: "/hc-andersen.jpg",
    fact: "Born in Odense in 1805, he wrote over 150 fairy tales, including The Little Mermaid, The Ugly Duckling, and The Princess and the Pea, translated into more than 125 languages.",
  },
  {
    id: "ribe",
    name: "Ribe",
    photo: "/ribe.jpg",
    fact: "Founded around 700 AD, Ribe is the oldest town in Scandinavia, with a medieval cathedral and cobblestone streets that still follow their original layout.",
  },
  {
    id: "kronborg",
    name: "Kronborg Castle",
    photo: "/kronborgslot.jpg",
    fact: "This Renaissance castle in Helsingor is the real setting Shakespeare used for Hamlet's Elsinore, and is a UNESCO World Heritage Site.",
  },
  {
    id: "jelling",
    name: "The Jelling Stones",
    photo: "/jelling.jpg",
    fact: "Carved in the 900s under King Harald Bluetooth, these runic stones record the christening of Denmark and are sometimes called the country's birth certificate.",
  },
  {
    id: "viking-ships",
    name: "Roskilde's Viking Ships",
    photo: "/vikingshipmuseum1.jpg",
    fact: "The Viking Ship Museum in Roskilde displays five original Viking ships, deliberately sunk in the fjord around 1070 AD to block a channel, and recovered nearly 900 years later.",
  },
  {
    id: "amalienborg",
    name: "Amalienborg",
    photo: "/amalienborg1.jpg",
    fact: "The Danish royal family's winter home is actually four matching rococo palaces arranged around an octagonal courtyard, with a daily changing of the guard when the monarch is in residence.",
  },
];
