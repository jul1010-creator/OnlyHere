// ── WHAT A TIQETS PAGE SELLS, AND WHAT IT COSTS YOU ─────────────────
//
// Oliver, 28 Sep 2026, after the ticket links were checked page by page:
// "recommending Amalienborg through Getyourguide or zoo through Tiqets, is bad
// in the sense that it is 10 kr pricier. However, some of them do include
// packages that make it cheaper and have refunding." And, asked how the two
// links should sit: "Up to you."
//
// Three of the Tiqets pages behind a Tickets button sold no ticket to the place
// at all. Amalienborg's sold a guided tour, and Experimentarium's and
// Louisiana's sold only the Copenhagen Card. The address said "tickets" on all
// three, because a Tiqets venue page always does, so every rule in
// ticketLink.js that reads the address passed them.
//
// So the page is read once, when the link is found, and what it sells is
// stored beside the link as __ticketOffer:
//
//   entry   a ticket to this place on its own
//   combo   this place bundled with another sight, and no ticket on its own
//   tour    a guided tour or walk of this place, and no ticket
//   card    only a city card that includes it
//
// The page then says which it is, and what Tiqets adds (a refund, combos)
// in the words Tiqets' own pages use.
//
// Pure, so every case is tested with no network. The Studio reads the page
// through /api/scan-source and hands the text here.

const clean = (v) => String(v ?? "").trim();

export const TICKET_OFFER_KINDS = ["entry", "combo", "tour", "card"];

// Words that say nothing about WHICH place, so a match on them is no match.
const GENERIC = new Set([
  "the", "and", "of", "a", "an", "in", "i", "og", "af", "den", "det", "de",
  "castle", "slot", "palace", "museum", "museet", "gardens", "garden", "park",
  "copenhagen", "københavn", "kobenhavn", "denmark", "danmark", "danish", "national",
  "modern", "art", "resort", "house", "tower", "church", "kirke", "tickets", "ticket",
  "billund", "aarhus", "odense", "aalborg", "helsingør", "helsingor", "humlebæk",
]);

const tokens = (s) => clean(s).toLowerCase()
  .replace(/[^a-z0-9æøåäöüé]+/g, " ").split(" ").filter(Boolean);

// The words that name this place, from its own name and from the Tiqets
// address, which carries Tiqets' own name for it. "Amalienborg Slot" and
// "Amalienborg Palace" meet on "amalienborg"; "Copenhagen ZOO" keeps "zoo".
export const placeWords = (name, url = "") => {
  const slug = (() => {
    try {
      const seg = new URL(clean(url)).pathname.split("/").filter(Boolean).pop() || "";
      return seg.replace(/-(?:tickets?)?-?[lp]\d+$/i, "").replace(/-/g, " ");
    } catch { return ""; }
  })();
  const all = [...tokens(name), ...tokens(slug)];
  const specific = all.filter(w => !GENERIC.has(w) && w.length >= 3);
  return [...new Set(specific.length ? specific : all.filter(w => w.length >= 3))];
};

// A product title, as Tiqets prints one. Two shapes reach this file, because
// /api/scan-source reads a page two ways: the markdown the paid reader returns
// ("### [Kronborg Castle: Entry Ticket](…)"), and the plain reader's text,
// where every tag is gone and the whole page is one line. So the markdown
// headings are read when there are any, and the titles are also found by
// their own shape, which Tiqets keeps to: "Place: Product" and "A + B".
const WORD = "[A-Z0-9][\\w®’'&.-]*";
const JOIN = "(?:with|and|of|the|to|in|for|incl\\.?|&)";
const COLON_TITLE = new RegExp(`(${WORD}(?:\\s+${WORD}){0,5}):\\s+(${WORD}(?:\\s+(?:${WORD}|${JOIN})){0,9})`, "g");
const PLUS_TITLE = new RegExp(`(${WORD}(?:\\s+${WORD}){0,5})\\s\\+\\s(${WORD}(?:\\s+${WORD}){0,5})`, "g");

export const productTitles = (text) => {
  const src = String(text || "");
  const out = [];
  const add = (t) => {
    const title = clean(String(t || "").replace(/[*_`#[\]]/g, "").replace(/\s+/g, " "));
    if (title.length >= 4 && !out.includes(title)) out.push(title);
  };
  for (const line of src.split(/\n+/)) {
    const linked = /^\s*#{2,4}\s*\[([^\]]{4,160})\]\(/.exec(line);
    const heading = /^\s*#{3,4}\s+([^[\n]{4,160})$/.exec(line);
    if (linked) add(linked[1]);
    else if (heading) add(heading[1]);
  }
  // Markdown headings, where there are any, ARE the product list. The shape
  // search runs only on text that has none, so a sentence in a description
  // cannot become a product on a page whose products are already known.
  if (out.length) return out;
  for (const m of src.matchAll(COLON_TITLE)) add(`${m[1]}: ${m[2]}`);
  for (const m of src.matchAll(PLUS_TITLE)) add(`${m[1]} + ${m[2]}`);
  return out;
};

const CARD = /\b(?:copenhagen|city|aarhus|odense)\s+card\b|\bcity\s*pass\b/i;
const TOUR = /\b(?:tour|tours|guided|guide|walk|walking|audio\s*guide|cruise|day\s*trip|excursion|rundvisning|omvisning)\b/i;
const ENTRY = /\b(?:entry|entrance|admission|ticket|tickets|skip[\s-]the[\s-]line|day\s*pass|\d[\s-]day|billet|billetter|adgang)\b/i;
// A plain "and" joins two sights on Tiqets too ("Tivoli Gardens + Kronborg
// Castle", "National Museum + Copenhagen City Hall"), so both are read.
const COMBO = /\s\+\s/;

const namesPlace = (title, words) => {
  const t = ` ${tokens(title).join(" ")} `;
  return words.some(w => t.includes(` ${w} `));
};

// What one title sells, for this place, or "" when it is not about it.
export const titleKind = (title, words) => {
  const t = clean(title);
  if (!t) return "";
  if (CARD.test(t)) return "card";
  if (!namesPlace(t, words)) return "";
  if (COMBO.test(t)) return "combo";
  if (TOUR.test(t) && !ENTRY.test(t.replace(TOUR, ""))) return "tour";
  if (ENTRY.test(t)) return "entry";
  // "Tivoli Gardens" alone, or "LEGOLAND® Billund Resort", is the door itself.
  return "entry";
};

// ── AND WHETHER YOU CAN GET YOUR MONEY BACK ─────────────────────────
// Oliver, 28 Sep 2026, on "usually a little dearer": "currently tivoli is
// cheaper on tiqets than on tivoli's own site", with Tivoli's own checkout for
// 15 October at 220 kr against Tiqets' 190. So nothing here says which is
// cheaper any more. A price is a fact about one date, and a line that is
// wrong on the day a reader looks is the one that argues against his own link.
//
// What Tiqets DOES offer is said, and only from the ticket's own page, because
// the venue page never mentions it. Read 28 Sep 2026, the three answers are:
//
//   free     "Cancellation is possible until 23:59 on the day before your
//            visit" (National Museum, Legoland), "Cancel for free until 24
//            hours before" (Tivoli's Halloween ticket)
//   option   "Get a full refund if you select a refundable ticket during
//            checkout" (Tivoli's entry ticket). It is a choice at checkout,
//            and possibly a paid one, so it is never called free
//   none     "This ticket is nonrefundable" (Zoo, Kronborg)
const NONREFUNDABLE = /\bnon[\s-]?refundable\b|\bnot\s+refundable\b|\bingen\s+refusion\b/i;
const REFUND_OPTION = /\bselect\s+a\s+refundable\s+ticket\b|\brefundable\s+ticket\s+(?:during|at)\s+checkout\b/i;
const FREE_CANCEL = /\bfree\s+cancell?ation\b|\bcancel\s+(?:for\s+free|free\s+of\s+charge)\b|\bcancell?ation\s+is\s+possible\s+until\b|\bgratis\s+afbestilling\b|\bkostenlos(?:e)?\s+stornierung\b/i;
export const REFUND_KINDS = ["free", "option"];

export const refundFromText = (text) => {
  const t = String(text || "");
  if (NONREFUNDABLE.test(t)) return "none";
  if (REFUND_OPTION.test(t)) return "option";
  if (FREE_CANCEL.test(t)) return "free";
  return "";
};

// The ticket page to read that from: the link itself when it already is one,
// otherwise the first product on the venue page that sells the door. Markdown
// only, since the plain reader's text has no addresses left in it; with none
// found, nothing is said about refunds rather than something guessed.
const TIQETS_PRODUCT_LINK = /\[([^\]]{4,160})\]\((https?:\/\/(?:www\.)?tiqets\.com\/[^)\s]*?-p\d+\/?)(?:[?#][^)\s]*)?\)/gi;
export const entryProductUrl = (text, { name = "", url = "" } = {}) => {
  if (/-p\d+\/?(?:[?#].*)?$/i.test(clean(url))) return clean(url);
  const words = placeWords(name, url);
  for (const m of String(text || "").matchAll(TIQETS_PRODUCT_LINK)) {
    if (titleKind(m[1], words) === "entry") return m[2];
  }
  return "";
};

// The verdict for a whole page. Most specific first: a page that sells the
// door is an entry page however many tours and combos sit around it.
export const classifyTiqetsText = (text, { name = "", url = "" } = {}) => {
  const words = placeWords(name, url);
  const kinds = productTitles(text).map(t => titleKind(t, words)).filter(Boolean);
  // A city card is found anywhere on the page, not only in a title the shape
  // search caught, because its name ("Copenhagen Card - DISCOVER: 80+ …") is
  // the one title that does not start with the place.
  if (CARD.test(String(text || ""))) kinds.push("card");
  const has = (k) => kinds.includes(k);
  const kind = has("entry") ? "entry" : has("combo") ? "combo" : has("tour") ? "tour" : has("card") ? "card" : "";
  if (!kind) return null;
  const refund = refundFromText(text);
  return { kind, refund: REFUND_KINDS.includes(refund) ? refund : "", combos: has("combo") };
};

// The ticket page's answer laid over the venue page's, which is the one that
// counts: "none" there clears a "free" that only a combo on the venue page had.
export const withProductRefund = (offer, productText) => {
  if (!offer) return offer;
  const r = refundFromText(productText);
  if (!r) return offer;
  return { ...offer, refund: REFUND_KINDS.includes(r) ? r : "" };
};

// The stored shape, cleaned, or null. Read by the render and by shapeForLive,
// so a hand-edited row cannot put an unknown kind in front of a reader.
// `cancel: true` is the shape batch 151 wrote for one evening and is read as
// "free" so nothing already stored is lost.
export const cleanTicketOffer = (raw) => {
  const kind = clean(raw?.kind);
  if (!TICKET_OFFER_KINDS.includes(kind)) return null;
  const refund = REFUND_KINDS.includes(clean(raw?.refund)) ? clean(raw.refund) : raw?.cancel === true ? "free" : "";
  return {
    kind,
    refund,
    combos: !!raw?.combos,
    ...(clean(raw?.at) ? { at: clean(raw.at) } : {}),
  };
};

// Whether the link may be offered as a ticket at all. A tour or a card is
// offered as what it is, never under a Tickets label.
export const offerSellsTheDoor = (offer) => !offer || offer.kind === "entry" || offer.kind === "combo";

// ── THE LINE UNDER THE LINK ─────────────────────────────────────────
// What Tiqets offers that the door may not, and nothing it does not: no price
// claim either way (see above), a refund only in the words its ticket page
// uses, and combos only when the venue page lists one.
const LINES = {
  en: {
    also: "Also on Tiqets",
    free: "free cancellation up to a day before",
    option: "a refundable ticket you can pick at checkout",
    combos: "combo deals on other sights",
    tour: "Guided tour on Tiqets",
    card: "Included in the Copenhagen Card, sold on Tiqets",
    and: "and",
  },
  da: {
    also: "Også på Tiqets",
    free: "gratis afbestilling op til en dag før",
    option: "en billet med refusion, som du kan vælge ved betaling",
    combos: "kombibilletter til andre seværdigheder",
    tour: "Guidet tur på Tiqets",
    card: "Med i Copenhagen Card, som sælges på Tiqets",
    and: "og",
  },
  de: {
    also: "Auch bei Tiqets",
    free: "kostenlose Stornierung bis einen Tag vorher",
    option: "ein erstattbares Ticket, das man an der Kasse wählen kann",
    combos: "Kombitickets für andere Sehenswürdigkeiten",
    tour: "Führung bei Tiqets",
    card: "In der Copenhagen Card enthalten, erhältlich bei Tiqets",
    and: "und",
  },
};

const linesFor = (lang) => LINES[clean(lang).slice(0, 2).toLowerCase()] || LINES.en;
const perksOf = (o, L) => [o?.refund ? L[o.refund] : "", o?.combos ? L.combos : ""].filter(Boolean).join(` ${L.and} `);

export const ticketOfferLine = (offer, { lang = "en" } = {}) => {
  const L = linesFor(lang);
  const o = cleanTicketOffer(offer);
  if (o?.kind === "tour") return L.tour;
  if (o?.kind === "card") return L.card;
  const perks = perksOf(o, L);
  return perks ? `${L.also}: ${perks}` : L.also;
};

// ── BOTH LINKS, AND A REASON TO PICK TIQETS WHEN THERE IS ONE ──────
// Oliver, 28 Sep 2026: "Maybe we should just add both links? For people to
// decide themselves? Then we can sell the affiliate with 'We recommend Tiqets
// for its 24-hours refund policy'", and: "we can't rely on this price
// different forever."
//
// So the official site and Tiqets sit side by side, and the line under them
// is the reason to choose Tiqets, stated only when the ticket page gives one.
// A recommendation is made for free cancellation and for nothing weaker: a
// refundable option you may pay for at checkout, or combo deals, are said as
// facts rather than recommended. No reason on the page, no line.
const REASONS = {
  en: {
    free: "We recommend Tiqets for its free cancellation up to a day before",
    option: "Tiqets lets you pick a refundable ticket at checkout",
    combos: "Tiqets also has combo deals on other sights",
    andCombos: ", and it has combo deals on other sights",
    site: "Official site",
  },
  da: {
    free: "Vi anbefaler Tiqets for den gratis afbestilling op til en dag før",
    option: "Hos Tiqets kan du vælge en billet med refusion ved betaling",
    combos: "Tiqets har også kombibilletter til andre seværdigheder",
    andCombos: ", og der er kombibilletter til andre seværdigheder",
    site: "Officiel side",
  },
  de: {
    free: "Wir empfehlen Tiqets wegen der kostenlosen Stornierung bis einen Tag vorher",
    option: "Bei Tiqets kann man an der Kasse ein erstattbares Ticket wählen",
    combos: "Tiqets hat auch Kombitickets für andere Sehenswürdigkeiten",
    andCombos: ", und es gibt Kombitickets für andere Sehenswürdigkeiten",
    site: "Offizielle Seite",
  },
};
const reasonsFor = (lang) => REASONS[clean(lang).slice(0, 2).toLowerCase()] || REASONS.en;

export const tiqetsReason = (offer, { lang = "en" } = {}) => {
  const o = cleanTicketOffer(offer);
  if (!o || !offerSellsTheDoor(o)) return "";
  const R = reasonsFor(lang);
  if (o.refund) return `${R[o.refund]}${o.combos ? R.andCombos : ""}.`;
  return o.combos ? `${R.combos}.` : "";
};

export const officialSiteLabel = (lang = "en") => reasonsFor(lang).site;
