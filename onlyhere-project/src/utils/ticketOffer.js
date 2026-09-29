// ── WHAT A PARTNER TICKET PAGE SELLS, CHECKED BEFORE A READER SEES IT ─
//
// Oliver, 28 Sep 2026, after the ticket links were checked page by page:
// "recommending Amalienborg through Getyourguide or zoo through Tiqets, is bad
// in the sense that it is 10 kr pricier. However, some of them do include
// packages that make it cheaper and have refunding."
//
// And the same night, going to bed: "make sure these affiliates actually get it
// right... The Amalienborg Slot one must NOT happen. So if AI has to go through
// the affiliate link and compare with its own website, then do that." And: "also
// make sure that there actually is a 24-hour cancellation. Most of the time
// there is, but there can be times where there aren't. So these affiliates has
// to be fact-checked."
//
// Three of the Tiqets pages behind a Tickets button sold no ticket to the place
// at all. Amalienborg's sold a guided tour, and Experimentarium's and
// Louisiana's sold only the Copenhagen Card. The address said "tickets" on all
// three, because a Tiqets venue page always does, so every rule in
// ticketLink.js that reads the address passed them.
//
// ── THE RULE THIS FILE KEEPS: A TICKETS BUTTON NEEDS EVIDENCE ────────
//
// Batch 151 read the page and stored what it sold. A review the same night
// (Fable, 29 Sep) found the default pointed the wrong way: a link with no
// stored answer was treated as selling the door, so every row checked before
// that evening still showed "Book tickets". So now:
//
//   entry    a ticket to THIS place on its own, read off the page, and not
//            contradicted by the AI check against the place's own site
//   combo    this place only bundled with another sight
//   tour     a guided tour or walk, and no ticket
//   card     only a city card that includes it
//   unknown  not read, not readable, or the reads disagree
//
// and only "entry" is ever offered as Tickets. Everything else is a quieter line
// saying what it is. The answer is bound to the URL it was read from, so a link
// changed by hand is unknown until it is read again.
//
// Refunds are said only from the ticket's own page, with the sentence that said
// it kept beside the answer, so a claim can always be traced to its words.
//
// Pure, so every case is tested with no network. The Studio reads the pages
// through /api/scan-source and asks the model; the verdicts come back here.

const clean = (v) => String(v ?? "").trim();

export const TICKET_OFFER_KINDS = ["entry", "combo", "tour", "card", "unknown"];
export const REFUND_KINDS = ["free", "option", "none"];
export const OFFER_AGENTS = ["tiqets", "getyourguide"];
const AGENT_NAME = { tiqets: "Tiqets", getyourguide: "GetYourGuide" };
export const agentName = (agent) => AGENT_NAME[clean(agent)] || "Tiqets";

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

// The words that name this place, from the ENTRY's own names only. The page's
// address is not asked, because every title on a page matches its own address
// and a needle built from it finds "this place" on a page about another one.
export const placeWords = (name, alsoKnownAs = []) => {
  const all = [name, ...(Array.isArray(alsoKnownAs) ? alsoKnownAs : [])].flatMap(tokens);
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
    // Not the page's own H1 or H2: on a Tiqets venue page that is "Amalienborg
    // Palace tickets", the one heading that says "tickets" whatever is sold.
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
const COMBO = /\s\+\s/;

const namesPlace = (title, words) => {
  const t = ` ${tokens(title).join(" ")} `;
  return words.some(w => t.includes(` ${w} `));
};

// What one title sells, for this place, or "" when it is not about it or does
// not say. A title that names the place and says neither ticket nor tour is
// not assumed to be the door: it says nothing, so it counts for nothing.
export const titleKind = (title, words) => {
  const t = clean(title);
  if (!t) return "";
  if (CARD.test(t)) return "card";
  if (!namesPlace(t, words)) return "";
  if (COMBO.test(t)) return "combo";
  const rest = t.replace(new RegExp(TOUR.source, "gi"), " ");
  if (TOUR.test(t) && !ENTRY.test(rest)) return "tour";
  if (ENTRY.test(t)) return "entry";
  return "";
};

// ── AND WHETHER YOU CAN GET YOUR MONEY BACK ─────────────────────────
// Read 28 Sep 2026 off the ticket pages themselves:
//
//   free     "Cancellation is possible until 23:59 on the day before your
//            visit" (National Museum, Legoland), "Cancel up to 24 hours in
//            advance for a full refund" (GetYourGuide, Amalienborg)
//   option   "Get a full refund if you select a refundable ticket during
//            checkout" (Tivoli). A choice at checkout, possibly a paid one,
//            so never called free
//   none     "This ticket is nonrefundable" (Zoo, Kronborg)
//
// Kept with the sentence that said it, so a reader-facing claim can always be
// traced back to the words on the page.
const NONREFUNDABLE = /[^.!?\n]*\b(?:non[\s-]?refundable|not\s+refundable|no\s+refunds?|ingen\s+refusion)\b[^.!?\n]*/i;
const REFUND_OPTION = /[^.!?\n]*\b(?:select\s+a\s+refundable\s+ticket|refundable\s+ticket\s+(?:during|at)\s+checkout)\b[^.!?\n]*/i;
const FREE_CANCEL = /[^.!?\n]*\b(?:free\s+cancell?ation|cancel\s+(?:for\s+free|free\s+of\s+charge)|cancel\s+up\s+to\s+\d+\s*hours?\s+in\s+advance\s+for\s+a\s+full\s+refund|cancell?ation\s+is\s+possible\s+until|gratis\s+afbestilling|kostenlos(?:e)?\s+stornierung)\b[^.!?\n]*/i;

const said = (m) => clean(m?.[0]).replace(/\s+/g, " ").slice(0, 200);

export const refundAndWords = (text) => {
  const t = String(text || "");
  let m;
  if ((m = NONREFUNDABLE.exec(t))) return { refund: "none", refundSaid: said(m) };
  if ((m = REFUND_OPTION.exec(t))) return { refund: "option", refundSaid: said(m) };
  if ((m = FREE_CANCEL.exec(t))) return { refund: "free", refundSaid: said(m) };
  return { refund: "", refundSaid: "" };
};

// The ticket page to read that from: the link itself when it already is one,
// otherwise the first product on the venue page that sells the door. Markdown
// only, since the plain reader's text has no addresses left in it; with none
// found, nothing is said about refunds rather than something guessed.
const TIQETS_PRODUCT_LINK = /\[([^\]]{4,160})\]\((https?:\/\/(?:www\.)?tiqets\.com\/[^)\s]*?-p\d+\/?)(?:[?#][^)\s]*)?\)/gi;
export const entryProductUrl = (text, { name = "", url = "", alsoKnownAs = [] } = {}) => {
  if (/-[pt]\d+\/?(?:[?#].*)?$/i.test(clean(url))) return clean(url);
  const words = placeWords(name, alsoKnownAs);
  for (const m of String(text || "").matchAll(TIQETS_PRODUCT_LINK)) {
    if (titleKind(m[1], words) === "entry") return m[2];
  }
  return "";
};

// The rules' verdict for a whole page. Most specific first: a page that sells
// the door is an entry page however many tours and combos sit around it.
// Refunds are NOT read here: a venue page's "Free cancellation" badge can
// belong to a combo, and only the ticket's own page answers for the ticket.
export const classifyTiqetsText = (text, { name = "", alsoKnownAs = [] } = {}) => {
  const words = placeWords(name, alsoKnownAs);
  const kinds = productTitles(text).map(t => titleKind(t, words)).filter(Boolean);
  if (CARD.test(String(text || ""))) kinds.push("card");
  const has = (k) => kinds.includes(k);
  const kind = has("entry") ? "entry" : has("combo") ? "combo" : has("tour") ? "tour" : has("card") ? "card" : "";
  if (!kind) return null;
  return { kind, refund: "", refundSaid: "", combos: has("combo") };
};

// A GetYourGuide product is one product, so its page title and address are the
// whole answer to "what does it sell". Entry only when the address says ticket
// or entry; a tour that also gets you in is still a tour.
const GYG_TITLE = /^\s*#\s+(.{4,160})$/m;
export const classifyGetYourGuideText = (text, { name = "", url = "", alsoKnownAs = [] } = {}) => {
  const words = placeWords(name, alsoKnownAs);
  const slug = (() => { try { return new URL(clean(url)).pathname.split("/").filter(Boolean).pop() || ""; } catch { return ""; } })().replace(/-t\d+$/i, "").replace(/-/g, " ");
  const title = clean(GYG_TITLE.exec(String(text || ""))?.[1]) || slug;
  if (!namesPlace(`${title} ${slug}`, words)) return null;
  const kind = /\b(?:entry|entrance|admission|ticket|tickets)\b/i.test(slug) && !/\b(?:tour|guided|walking|walk|cruise)\b/i.test(slug) ? "entry"
    : TOUR.test(`${title} ${slug}`) ? "tour" : "";
  if (!kind) return null;
  return { kind, refund: "", refundSaid: "", combos: false };
};

// The ticket page's refund laid over the rules' verdict.
export const withProductRefund = (offer, productText) => {
  if (!offer) return offer;
  const r = refundAndWords(productText);
  if (!r.refund) return offer;
  return { ...offer, refund: r.refund, refundSaid: r.refundSaid };
};

// ── THE AI CHECK, AGAINST THE PLACE'S OWN SITE ──────────────────────
// His words: "if AI has to go through the affiliate link and compare with its
// own website, then do that." One call per link, when the link is found. The
// model is asked for a structured verdict and nothing it says is trusted on
// its own: a refund it reports only counts when its quoted sentence is really
// on the partner page, and "same place" has to be an explicit true.
export const ticketCheckPrompt = ({ name = "", town = "", type = "", agent = "tiqets", url = "", partnerText = "", siteText = "", siteUrl = "" } = {}) => [
  `You check one affiliate link for Gemlyx, a Danish travel guide, before it is shown to travellers.`,
  ``,
  `THE ENTRY: "${clean(name)}"${clean(town) ? ` in ${clean(town)}` : ""}, Denmark${clean(type) ? ` (${clean(type)})` : ""}.`,
  `ITS OWN WEBSITE${clean(siteUrl) ? ` (${clean(siteUrl)})` : ""}:`,
  clean(siteText).slice(0, 5000) || "(not available)",
  ``,
  `THE ${agentName(agent).toUpperCase()} PAGE (${clean(url)}):`,
  clean(partnerText).slice(0, 9000) || "(not available)",
  ``,
  `Answer ONLY with JSON:`,
  `{"samePlace": true|false, "sells": "entry"|"combo"|"tour"|"card"|"other", "city": "", "refund": "free"|"option"|"none"|"unknown", "refundQuote": "", "confidence": "high"|"medium"|"low", "why": ""}`,
  ``,
  `samePlace: true only if the ${agentName(agent)} page sells admission to, or a product at, the very place the entry and its website describe, in the same city. A different museum, palace, park or city is false.`,
  `sells: "entry" only if a traveller can buy a ticket that gets them into this place on its own. A guided tour or walk is "tour" even if it passes the place. Only a city card is "card". Only bundles with other sights is "combo".`,
  `refund: from the ${agentName(agent)} page only. "free" only if it says the ticket can be cancelled for a full refund (for example up to 24 hours before). "option" if a refundable ticket must be chosen at checkout. "none" if it says nonrefundable. Otherwise "unknown".`,
  `refundQuote: the exact sentence from the ${agentName(agent)} page that your refund answer rests on, copied word for word, or "".`,
  `Do not guess. If the page does not say, answer "unknown".`,
].join("\n");

const squash = (s) => clean(s).toLowerCase().replace(/\s+/g, " ");
export const readTicketCheck = (raw, partnerText = "") => {
  let j = raw;
  if (typeof raw === "string") {
    const s = raw.replace(/```json|```/g, "").trim();
    try { j = JSON.parse(s.startsWith("{") ? s : s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1)); } catch { return null; }
  }
  if (!j || typeof j !== "object") return null;
  const sells = ["entry", "combo", "tour", "card", "other"].includes(clean(j.sells)) ? clean(j.sells) : "other";
  const quote = clean(j.refundQuote);
  // A refund answer counts only when the sentence it rests on is really on the
  // partner page. A model that invents "free cancellation" invents its quote
  // too, and that quote will not be found.
  const quoted = quote.length >= 12 && squash(partnerText).includes(squash(quote));
  const refund = ["free", "option", "none"].includes(clean(j.refund)) && quoted ? clean(j.refund) : "";
  return {
    samePlace: j.samePlace === true ? true : j.samePlace === false ? false : null,
    sells,
    refund,
    refundSaid: refund ? quote.slice(0, 200) : "",
    confidence: ["high", "medium", "low"].includes(clean(j.confidence)) ? clean(j.confidence) : "low",
    why: clean(j.why).slice(0, 240),
  };
};

// Rules and model together. The stricter answer wins every disagreement:
//   a model that says "not this place" drops the link entirely;
//   Tickets needs both to say entry (or the rules alone, when the model could
//   not be asked, and then only for a page whose own titles said so);
//   a refund needs the ticket page's own words, from either reader, and the
//   two must not contradict each other.
export const mergeTicketCheck = (rules, ai, { url = "", agent = "tiqets", at = "" } = {}) => {
  if (ai && ai.samePlace === false) return { drop: true, why: ai.why || "The partner page is about a different place." };
  const ruleKind = rules?.kind || "";
  let kind;
  if (!ai) kind = ruleKind || "unknown";
  else if (ai.samePlace !== true || ai.confidence === "low") kind = ruleKind === "entry" ? "unknown" : (ruleKind || "unknown");
  else if (ruleKind && ai.sells !== "other" && ruleKind !== ai.sells) {
    // Disagreement: never the door. Keep a tour or card when either said so.
    kind = [ruleKind, ai.sells].includes("tour") ? "tour" : [ruleKind, ai.sells].includes("card") ? "card" : [ruleKind, ai.sells].includes("combo") ? "combo" : "unknown";
  } else kind = ruleKind || (ai.sells === "other" ? "unknown" : ai.sells);
  let refund = rules?.refund || "";
  let refundSaid = rules?.refundSaid || "";
  if (ai?.refund) {
    if (refund && refund !== ai.refund) { refund = ""; refundSaid = ""; }
    else if (!refund) { refund = ai.refund; refundSaid = ai.refundSaid; }
  }
  return {
    url: clean(url), agent: OFFER_AGENTS.includes(agent) ? agent : "tiqets",
    kind, refund, ...(refundSaid ? { refundSaid } : {}),
    combos: !!rules?.combos,
    checked: ai ? "ai" : "rules",
    ...(clean(at) ? { at: clean(at) } : {}),
  };
};

// ── THE STORED SHAPE, AND WHICH LINK IT BELONGS TO ──────────────────
const linkKey = (u) => {
  try {
    const x = new URL(clean(u));
    return `${x.hostname.replace(/^www\./, "").toLowerCase()}${x.pathname.replace(/\/+$/, "").toLowerCase()}`;
  } catch { return ""; }
};
export const sameLink = (a, b) => !!linkKey(a) && linkKey(a) === linkKey(b);

// Cleaned, or null. With `forUrl`, an answer read off a different address is
// null: a link changed by hand is unknown until it is read again.
export const cleanTicketOffer = (raw, forUrl = null) => {
  const kind = clean(raw?.kind);
  if (!TICKET_OFFER_KINDS.includes(kind)) return null;
  const url = clean(raw?.url);
  if (forUrl !== null && !sameLink(url, forUrl)) return null;
  const refund = REFUND_KINDS.includes(clean(raw?.refund)) ? clean(raw.refund) : "";
  return {
    ...(url ? { url } : {}),
    agent: OFFER_AGENTS.includes(clean(raw?.agent)) ? clean(raw.agent) : "tiqets",
    kind,
    refund,
    ...(refund && clean(raw?.refundSaid) ? { refundSaid: clean(raw.refundSaid).slice(0, 200) } : {}),
    combos: !!raw?.combos,
    ...(["ai", "rules"].includes(clean(raw?.checked)) ? { checked: clean(raw.checked) } : {}),
    ...(clean(raw?.at) ? { at: clean(raw.at) } : {}),
  };
};

// Only a checked entry ticket is ever offered as Tickets.
export const offerIsTheDoor = (offer) => offer?.kind === "entry";
// Kept under its old name for the callers that ask the old question.
export const offerSellsTheDoor = offerIsTheDoor;

// ── THE LINES ───────────────────────────────────────────────────────
// What the partner offers that the door may not, and nothing it does not: no
// price claim either way (Tivoli was cheaper on Tiqets on 28 Sep, Amalienborg
// dearer on GetYourGuide), a refund only in the words its ticket page uses,
// and combos only when the venue page lists one.
const LINES = {
  en: {
    also: (a) => `Also on ${a}`,
    free: "free cancellation up to a day before",
    option: "a refundable ticket you can pick at checkout",
    combos: "combo deals on other sights",
    combo: (a) => `Combo tickets with other sights on ${a}`,
    tour: (a) => `Guided tour on ${a}`,
    card: (a) => `Included in the Copenhagen Card, sold on ${a}`,
    and: "and",
  },
  da: {
    also: (a) => `Også på ${a}`,
    free: "gratis afbestilling op til en dag før",
    option: "en billet med refusion, som du kan vælge ved betaling",
    combos: "kombibilletter til andre seværdigheder",
    combo: (a) => `Kombibilletter med andre seværdigheder på ${a}`,
    tour: (a) => `Guidet tur på ${a}`,
    card: (a) => `Med i Copenhagen Card, som sælges på ${a}`,
    and: "og",
  },
  de: {
    also: (a) => `Auch bei ${a}`,
    free: "kostenlose Stornierung bis einen Tag vorher",
    option: "ein erstattbares Ticket, das man an der Kasse wählen kann",
    combos: "Kombitickets für andere Sehenswürdigkeiten",
    combo: (a) => `Kombitickets mit anderen Sehenswürdigkeiten bei ${a}`,
    tour: (a) => `Führung bei ${a}`,
    card: (a) => `In der Copenhagen Card enthalten, erhältlich bei ${a}`,
    and: "und",
  },
};
const linesFor = (lang) => LINES[clean(lang).slice(0, 2).toLowerCase()] || LINES.en;

// The quiet line for anything that is not a checked entry ticket.
export const ticketOfferLine = (offer, { lang = "en", agent = "" } = {}) => {
  const L = linesFor(lang);
  const o = cleanTicketOffer(offer);
  const a = agentName(agent || o?.agent);
  if (o?.kind === "tour") return L.tour(a);
  if (o?.kind === "card") return L.card(a);
  if (o?.kind === "combo") return L.combo(a);
  return L.also(a);
};

// ── BOTH LINKS, AND A REASON TO PICK THE PARTNER WHEN THERE IS ONE ──
// Oliver, 28 Sep 2026: "Maybe we should just add both links? For people to
// decide themselves? Then we can sell the affiliate with 'We recommend Tiqets
// for its 24-hours refund policy'", and: "we can't rely on this price
// different forever."
//
// Recommended for free cancellation and for nothing weaker: a refundable
// option you may pay for at checkout, or combo deals, are said as facts. A
// nonrefundable ticket gets no refund words at all.
const REASONS = {
  en: {
    free: (a) => `We recommend ${a} for its free cancellation up to a day before`,
    option: (a) => `${a} lets you pick a refundable ticket at checkout`,
    combos: (a) => `${a} also has combo deals on other sights`,
    andCombos: ", and it has combo deals on other sights",
    site: "Official site",
  },
  da: {
    free: (a) => `Vi anbefaler ${a} for den gratis afbestilling op til en dag før`,
    option: (a) => `Hos ${a} kan du vælge en billet med refusion ved betaling`,
    combos: (a) => `${a} har også kombibilletter til andre seværdigheder`,
    andCombos: ", og der er kombibilletter til andre seværdigheder",
    site: "Officiel side",
  },
  de: {
    free: (a) => `Wir empfehlen ${a} wegen der kostenlosen Stornierung bis einen Tag vorher`,
    option: (a) => `Bei ${a} kann man an der Kasse ein erstattbares Ticket wählen`,
    combos: (a) => `${a} hat auch Kombitickets für andere Sehenswürdigkeiten`,
    andCombos: ", und es gibt Kombitickets für andere Sehenswürdigkeiten",
    site: "Offizielle Seite",
  },
};
const reasonsFor = (lang) => REASONS[clean(lang).slice(0, 2).toLowerCase()] || REASONS.en;

export const partnerReason = (offer, { lang = "en" } = {}) => {
  const o = cleanTicketOffer(offer);
  if (!offerIsTheDoor(o)) return "";
  const R = reasonsFor(lang);
  const a = agentName(o.agent);
  if (o.refund === "free" || o.refund === "option") return `${R[o.refund](a)}${o.combos ? R.andCombos : ""}.`;
  return o.combos ? `${R.combos(a)}.` : "";
};
export const tiqetsReason = partnerReason;

// Whether the general partner sentence ("they often offer extra packages or
// refund deals") may stand under this link. Not under a nonrefundable ticket,
// a tour, a card or an unchecked link: those get the commission alone.
export const partnerPitchFits = (offer) => {
  const o = cleanTicketOffer(offer);
  return offerIsTheDoor(o) && o.refund !== "none";
};

export const officialSiteLabel = (lang = "en") => reasonsFor(lang).site;
