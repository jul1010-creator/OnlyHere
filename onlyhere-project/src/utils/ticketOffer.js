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
// The page then says which it is, and says the trade out loud, which is his
// rule from 19 Sep: name the cost AND what the cost buys, never one alone.
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

const CANCEL = /\bfree\s+cancell?ation\b|\bcancel\s+(?:for\s+free|free\s+of\s+charge|up\s+to\s+\d+\s*(?:h|hours?|days?))\b|\bgratis\s+afbestilling\b|\bkostenlos(?:e)?\s+stornierung\b/i;

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
  return {
    kind,
    // Only when the page itself says so. A refund promised on our page and
    // refused on theirs is the worst sentence this could print.
    cancel: CANCEL.test(String(text || "")),
    combos: has("combo"),
  };
};

// The stored shape, cleaned, or null. Read by the render and by shapeForLive,
// so a hand-edited row cannot put an unknown kind in front of a reader.
export const cleanTicketOffer = (raw) => {
  const kind = clean(raw?.kind);
  if (!TICKET_OFFER_KINDS.includes(kind)) return null;
  return {
    kind,
    cancel: !!raw?.cancel,
    combos: !!raw?.combos,
    ...(clean(raw?.at) ? { at: clean(raw.at) } : {}),
  };
};

// Whether the link may be offered as a ticket at all. A tour or a card is
// offered as what it is, never under a Tickets label.
export const offerSellsTheDoor = (offer) => !offer || offer.kind === "entry" || offer.kind === "combo";

// ── THE LINE UNDER THE LINK ─────────────────────────────────────────
// Said the way he asked on 19 Sep: the cost and what it buys, together. The
// cost is "usually a little dearer than buying direct", which is his own
// measurement of the zoo and Amalienborg, and only said when there IS a direct
// site to compare with. What it buys is only what the page itself offers.
const LINES = {
  en: {
    also: "Also on Tiqets",
    dearer: "usually a little dearer than buying direct",
    cancel: "free cancellation",
    combos: "combo deals on other sights",
    tour: "Guided tour on Tiqets",
    card: "Included in the Copenhagen Card, sold on Tiqets",
    with: "with",
    and: "and",
  },
  da: {
    also: "Også på Tiqets",
    dearer: "som regel lidt dyrere end at købe direkte",
    cancel: "gratis afbestilling",
    combos: "kombibilletter til andre seværdigheder",
    tour: "Guidet tur på Tiqets",
    card: "Med i Copenhagen Card, som sælges på Tiqets",
    with: "med",
    and: "og",
  },
  de: {
    also: "Auch bei Tiqets",
    dearer: "meist etwas teurer als direkt",
    cancel: "kostenlose Stornierung",
    combos: "Kombitickets für andere Sehenswürdigkeiten",
    tour: "Führung bei Tiqets",
    card: "In der Copenhagen Card enthalten, erhältlich bei Tiqets",
    with: "mit",
    and: "und",
  },
};

export const ticketOfferLine = (offer, { direct = false, lang = "en" } = {}) => {
  const L = LINES[clean(lang).slice(0, 2).toLowerCase()] || LINES.en;
  const o = cleanTicketOffer(offer);
  if (o?.kind === "tour") return L.tour;
  if (o?.kind === "card") return L.card;
  const buys = [o?.cancel ? L.cancel : "", o?.combos ? L.combos : ""].filter(Boolean).join(` ${L.and} `);
  if (direct && buys) return `${L.also}: ${L.dearer}, ${L.with} ${buys}`;
  if (direct) return `${L.also}: ${L.dearer}`;
  if (buys) return `${L.also}: ${buys}`;
  return L.also;
};

// Only what the extra buys, as a sentence of its own, for under a Tiqets
// button that is already the way in. "" when the page offers nothing extra.
export const ticketOfferPerks = (offer, { lang = "en" } = {}) => {
  const L = LINES[clean(lang).slice(0, 2).toLowerCase()] || LINES.en;
  const o = cleanTicketOffer(offer);
  if (!o || !offerSellsTheDoor(o)) return "";
  const buys = [o.cancel ? L.cancel : "", o.combos ? L.combos : ""].filter(Boolean).join(` ${L.and} `);
  return buys ? buys.charAt(0).toUpperCase() + buys.slice(1) : "";
};
