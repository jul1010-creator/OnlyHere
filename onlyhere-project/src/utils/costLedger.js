// ── "GIVE THEM A LIST OF WHAT THEY HAVE TO PAY FOR" ─────────────────
//
// Oliver, 26 Aug 2026, on the TICKETS row in essentials — one browse link to
// Tiqets under a sentence about summer queues: "I'd rather you give them a list
// of what they have to pay for instead. Direct links. So Flixbus, attractions,
// events, etc. and also add what it is for."
//
// The old row is a category. This is an invoice: every line the traveller will
// actually be charged for on THIS trip, what each one buys, what it costs where
// we have read a real figure, and where to pay it.
//
// ── AND THE RULE HE SHOUTED, WHICH IS THE WHOLE FILE ────────────────
//
// "MAKE SURE THAT THE TICKETS AREN'T TAKEN!!!!!!!!!!!!!" and then, plainly:
// "Don't tell them to order tickets from Distortion, just for them to realise
// distortion is no longer available."
//
// A list of buy links is a promise, and it is a worse product than no list at
// all if any line on it sends somebody to a checkout that cannot sell them
// anything. So a line may carry a BUY link only when nothing we hold says
// otherwise, and every one of those checks reads data this app already stores:
//
//   ticketStatus   sold_out, cancelled and off_sale are refusals. The field is
//                  already written at publish and already has a vocabulary in
//                  utils/tickets.js; nothing had ever used it to withhold a LINK.
//   the date       an event whose edition does not run on the day this guide
//                  puts it, or whose dates were never confirmed, gets no buy
//                  link at all. This is the Distortion case exactly: a June
//                  street festival in a February guide is not on sale, it is not
//                  sold out, and it is not cancelled — it simply is not a thing
//                  you can buy for those dates.
//   the door       a place shut on the day of the visit is not sold either —
//                  though see the note on shutOn below, which is why that one
//                  is a parameter and not wired today.
//   the URL        isBookableTicketUrl already refuses a front page, a search
//                  and a category listing. A "ticket link" that lands on a
//                  homepage is the same broken promise with better manners.
//
// REFUSING THE LINK IS NOT REFUSING THE LINE. They still have to budget for the
// thing. The line stays, with its price and its reason, and says what is wrong
// instead of offering a checkout. That distinction is the difference between
// this and a list that quietly gets shorter the more we know.
//
// ── WHAT IT MAY NOT DO ──────────────────────────────────────────────
//
// INVENTORY_MAY_NOT_SELECT, from utils/constraintCheck.js, and it is load
// bearing here more than anywhere else in the app: this file reads a finished
// guide and may never add anything to it. Nothing appears on the list because
// it is bookable. Everything on the list is there because it is already in the
// plan. The suite asserts the output names are a subset of the guide's.
//
// ── AND THE PRICE IS READ, NEVER COMPOSED ───────────────────────────
//
// Oliver: "And obviously, include the price." Which reverses nothing — the
// standing rule was never "no prices", it was that the guide WRITER must not
// state one, because a model composing a ticket price from memory is how a
// tiered attraction becomes a single wrong number.
//
// A row's __priceSource is the opposite of that: a figure lifted off a named
// page on a stamped date, stored at publish precisely so it can be shown and
// checked. So the price comes from there verbatim, with the host it came from,
// and never from anywhere else. A price band ("mid", "cheap") is NOT a price and
// is never printed as one.
import { normaliseTicketStatus } from "./tickets";
import { isBookableTicketUrl } from "./ticketLink";
import { stopEventWhen } from "./guideReading";
import { affiliateHref, isPartnerLink, carRentalFits, carRentalUrl, bookingUrl } from "./affiliates";
import { OPERATORS } from "./operators";
import { isFerryText } from "./helpers";

export const COST_KIND = {
  ENTRY: "entry",
  EVENT: "event",
  TRANSPORT: "transport",
  FERRY: "ferry",
  CAR: "car",
  STAY: "stay",
};

// ── WHY A LINE MAY NOT CARRY A BUY LINK ─────────────────────────────
// One reason string per refusal, written for a traveller rather than for a log,
// because these are printed. Each one says what is true and what to do, and
// none of them claims more than the field it came from supports: off_sale in
// particular is NOT a sold-out confirmation, and utils/tickets.js already makes
// that point about the badge.
export const REFUSAL = {
  sold_out: "Sold out where it is sold officially, so this is one for returns rather than one to count on.",
  cancelled: "Listed as cancelled. Check the official site before you build a day around it.",
  off_sale: "Not on sale at the moment, which can mean sold out, not open yet, or closed for the season.",
  off_window: "Not running on the day this guide puts it, so there is nothing to buy for your dates.",
  undated: "The dates for this edition are not confirmed, so there is nothing to buy yet.",
  shut: "Closed on the day you are there.",
};

// The measured price, or "". __priceSource is the only field trusted here: it
// carries the URL it was read from and the date it was read, which is what makes
// a printed figure falsifiable instead of merely confident.
export const readPrice = (row) => {
  const ps = row?.__priceSource;
  const text = String(ps?.price ?? "").trim();
  if (!text) return null;
  // A band id is not a price. PRICE_BANDS exists for a different question and a
  // row storing "mid" must never render as though it were a figure in kroner.
  if (!/\d/.test(text)) return null;
  return { text, host: String(ps.host || "").trim(), at: String(ps.at || "").trim() };
};

// ── THE GATE ────────────────────────────────────────────────────────
//
// `when` is stopEventWhen's answer for this stop on this day, or null for
// anything that is not a dated event. Returns the reason a buy link is refused,
// or "" when nothing we hold argues against it.
//
// ORDER MATTERS AND IT IS DELIBERATE. The date is checked BEFORE the status,
// because a June festival in a February guide typically carries no status at
// all — nobody has marked it sold out, because it has not gone on sale. Reading
// the status first would find "unknown", pass, and print a checkout.
export const refuseTicket = ({ row, when = null, shutToday = false } = {}) => {
  if (!row) return "";
  const status = normaliseTicketStatus(row.ticketStatus);
  if (status === "sold_out") return REFUSAL.sold_out;
  if (status === "cancelled") return REFUSAL.cancelled;
  if (status === "off_sale") return REFUSAL.off_sale;
  if (row._src === "event") {
    if (when && when.confirmed === false) return REFUSAL.undated;
    if (when && when.offWindow) return REFUSAL.off_window;
    // A dated event with no day to check against is not evidence of anything,
    // so it falls through to the status rather than being refused on suspicion.
  }
  if (shutToday) return REFUSAL.shut;
  return "";
};

// The place's own ticket page where it has one, wrapped for tracking only if the
// wrapper recognises the merchant. affiliateHref returns the URL unchanged for
// anything it does not have a programme for, which is what keeps a museum's own
// shop pointing at the museum.
const buyLink = (row) => {
  const url = String(row?.ticketUrl || "").trim();
  if (!isBookableTicketUrl(url)) return null;
  const href = affiliateHref(url);
  return { href, partner: isPartnerLink(href) };
};

// ── ONE LINE PER THING, AND WHAT IT IS FOR ──────────────────────────
//
// `forWhat` is Oliver's "also add what it is for", and it is the field that
// makes this a list rather than a row of logos. It names the stop and the day,
// because that is the only reason this particular charge exists on this
// particular trip.
const entryLine = ({ row, name, day, when, shutToday }) => {
  const price = readPrice(row);
  const status = normaliseTicketStatus(row?.ticketStatus);
  // Free is a real answer and worth printing: it is the one line on a costs list
  // that makes the others believable.
  const free = status === "free";
  const refused = free ? "" : refuseTicket({ row, when, shutToday });
  const link = free || refused ? null : buyLink(row);
  return {
    kind: row?._src === "event" ? COST_KIND.EVENT : COST_KIND.ENTRY,
    name,
    day,
    forWhat: row?._src === "event"
      ? `Day ${day}${when?.runs ? `, ${when.runs}` : ""}`
      : `Day ${day}`,
    price: free ? "Free" : (price?.text || ""),
    priceFrom: free ? null : (price ? { host: price.host, at: price.at } : null),
    href: link?.href || "",
    partner: !!link?.partner,
    refused,
    bookAhead: !free && !refused && !!link && (row?._src === "event" || status === "limited"),
  };
};

// ── TRANSPORT IS PRICED PER JOURNEY AND SOLD PER OPERATOR ───────────
//
// So it is listed ONCE for the trip, not once per leg. Five days of DSB is one
// thing to buy from one place, and a costs list that repeats it five times is
// the same reason the TICKETS row was put in essentials rather than under every
// day: "a reader learns to scroll past it".
//
// No price. DSB and FlixBus both price dynamically by how far ahead you book,
// and any figure printed here would be wrong for most readers — which is the
// same rule that keeps a composed attraction price out of the guide.
//
// AND NO FERRY OPERATOR NAME, which is operators.js's standing decision and not
// an oversight: Samsø alone is served by two companies from opposite sides of
// the country, so naming one can send somebody across the Great Belt in the
// wrong direction. A crossing gets the national planner.
const transportLines = ({ mode = "", ferryDays = [], travelDays = [] } = {}) => {
  const m = String(mode || "").toLowerCase();
  const out = [];
  const publicTransport = /public transport|train|bus|tog|offentlig/.test(m);
  if (publicTransport && travelDays.length) {
    const onDays = `The long hops on day ${travelDays.join(", day ")}`;
    // ── A HEADING ON THIS LIST NAMES A CHARGE ─────────────────────
    //
    // Found 26 Aug 2026 reading the deployed block on guide q3xuswczshx. The
    // ferry line's heading was "Rejseplanen", set from OPERATORS because every
    // other caller of that table wants the operator's NAME. Under a heading
    // that says WHAT YOU PAY, that is a claim about who is being paid, and
    // Rejseplanen is not paid anything: it is a free national search that
    // covers every operator including the boats, which is exactly why
    // operators.js hands a crossing to it rather than naming a ferry company.
    //
    // So the link stays where operators.js put it and the heading stops
    // borrowing its name. DSB and FlixBus keep theirs, because those two really
    // are who the money goes to, and Oliver asked for them by name: "perhaps
    // refer them to Flixbus or DSB".
    const rows = [
      { op: OPERATORS.dsb, name: OPERATORS.dsb.name, what: `${OPERATORS.dsb.what}. ${onDays}.` },
      { op: OPERATORS.flixbus, name: OPERATORS.flixbus.name, what: `${OPERATORS.flixbus.what}. ${onDays}.` },
      {
        op: OPERATORS.rejseplanen,
        name: "Local buses and regional trains",
        what: "The legs neither of those sells: city buses, the metro, the short regional hops. Rejseplanen prices every operator in one search.",
      },
    ];
    for (const r of rows) {
      out.push({
        kind: COST_KIND.TRANSPORT,
        name: r.name,
        day: travelDays[0],
        forWhat: r.what,
        price: "",
        priceFrom: null,
        href: r.op.url,
        partner: false,
        refused: "",
        bookAhead: r.op.id !== "rejseplanen",
      });
    }
  }
  if (ferryDays.length) {
    out.push({
      kind: COST_KIND.FERRY,
      // The crossing, not the planner. See the note above.
      name: `The ferry on day ${ferryDays.join(" and day ")}`,
      day: ferryDays[0],
      forWhat: "Book the boat, not just the bed: Danish crossings run a handful of times a day, some islands are served from more than one port, and summer sailings sell out. Rejseplanen covers every operator including the boats.",
      price: "",
      priceFrom: null,
      href: OPERATORS.rejseplanen.url,
      partner: false,
      refused: "",
      bookAhead: true,
    });
  }
  return out;
};

// ── THE WALK ────────────────────────────────────────────────────────
//
// Everything is injected: rowFor, dayDateFor and today. The file has no clock
// and no database, so the suite can put a February trip in front of a June
// festival without a fixture, which is the one case this whole thing exists for.
export const costLines = ({
  guide,
  rowFor,
  dayDateFor = () => null,
  today = new Date(),
  // ── AND THIS ONE IS DELIBERATELY NOT WIRED ────────────────────────
  //
  // A row carries __hours, and shutOnVisit in utils/openingHours.js answers
  // "is this closed on the day they are there" from it. It would fit here
  // perfectly and it is not used, because Oliver settled the question on 11 Aug
  // 2026 and studioContent.js records the decision: hours are stored and NEVER
  // rendered, "because hours change and a stale opening time shown confidently
  // is worse than none."
  //
  // Withholding a buy link is the safe direction and would arguably be within
  // that rule. Printing "Closed on the day you are there" is not: it is a claim
  // about this Tuesday, made from an array fetched in March. So the parameter
  // stays, injected, for the day the freshness queue exists and the hours are
  // known to be current — and until then it is false and the reason is here
  // rather than in a gap where a check should be.
  shutOn = () => false,
  mode = "",
  saidNoCar = false,
} = {}) => {
  const days = Array.isArray(guide?.days) ? guide.days : [];
  const lookup = typeof rowFor === "function" ? rowFor : () => null;
  const out = [];
  const seen = new Set();
  const ferryDays = [];
  const travelDays = [];

  days.forEach((d, i) => {
    const dayNo = d?.day || i + 1;
    const dayDate = dayDateFor(dayNo);
    (d?.stops || []).forEach((s) => {
      const name = String(s?.name || "").trim();
      if (!name || seen.has(name)) return;
      const row = lookup(name);
      if (!row) return;
      const when = stopEventWhen(row, dayDate, today);
      const line = entryLine({ row, name, day: dayNo, when, shutToday: !!shutOn(row, dayNo) });
      // A line with no price, no link and nothing to warn about says nothing at
      // all, and a costs list padded with those is the browse row again.
      if (!line.price && !line.href && !line.refused) return;
      seen.add(name);
      out.push(line);
    });
    // A leg's own words are the only thing needed to know a boat is involved,
    // and isFerryText is the same reader the leg chip uses.
    const legs = (d?.glance?.legs || []).map(l => String(l?.how || ""));
    if (legs.some(isFerryText)) ferryDays.push(dayNo);
    if ((d?.stops || []).length && i > 0) travelDays.push(dayNo);
  });

  out.push(...transportLines({ mode, ferryDays, travelDays: travelDays.slice(0, 4) }));

  // The car, when they said they are driving. carRentalFits is the same reader
  // the rental button uses, so the list and the button cannot disagree about
  // whether this is a driving trip.
  if (carRentalFits({ mode, saidNoCar })) {
    const href = carRentalUrl();
    if (href) {
      out.push({
        kind: COST_KIND.CAR,
        name: "Car hire",
        day: 1,
        forWhat: "The whole trip is planned around having one. Collect at the airport on day 1.",
        price: "",
        priceFrom: null,
        href,
        partner: isPartnerLink(href),
        refused: "",
        bookAhead: true,
      });
    }
  }

  // The nights that are not already booked. One line, not one per night: the
  // search is the same search.
  const openNights = days.filter(d => d?.glance?.stayArea || d?.glance?.recommendedStay).length;
  if (openNights) {
    const area = days.find(d => d?.glance?.stayArea)?.glance?.stayArea || "";
    const href = bookingUrl({ area });
    out.push({
      kind: COST_KIND.STAY,
      name: "Somewhere to sleep",
      day: 1,
      forWhat: `${openNights} night${openNights === 1 ? "" : "s"} in the plan with no bed booked yet.`,
      price: "",
      priceFrom: null,
      href: href || "",
      partner: !!href && isPartnerLink(href),
      refused: "",
      bookAhead: true,
    });
  }

  return out;
};

// ── ORDER ───────────────────────────────────────────────────────────
//
// Oliver: "See if we can prioritise things that we can actually give them links
// for." So the sort is by how actionable a line is, not by day:
//
//   1. book ahead AND clickable    the ones that stop being possible if ignored
//   2. clickable                   the rest of the shopping
//   3. everything else             a cost to know about, nothing to do today
//
// Within each band, by day, because that is the order they will work through it.
export const byUrgency = (lines) =>
  [...(lines || [])].sort((a, b) => {
    const rank = (l) => (l.href && l.bookAhead ? 0 : l.href ? 1 : 2);
    return rank(a) - rank(b) || (a.day || 0) - (b.day || 0);
  });

// ── AND THE GAPS ARE A FOUNDER'S PROBLEM, NOT A READER'S ────────────
//
// Oliver: "saying 'we have no link' to like Copenhagen's National Museum is
// near embarrassing." It is, so no line ever says it. A line with no link
// prints its price and stops.
//
// The gap does not disappear, it changes audience: it becomes a plan problem,
// which renders above the guide in Studio and never on a saved page. Somewhere
// with a price, a place on the itinerary and no way to buy is a row that needs
// a ticket URL, and that is a thing he can go and fix.
export const linkGaps = (lines) =>
  (lines || [])
    .filter(l => (l.kind === COST_KIND.ENTRY || l.kind === COST_KIND.EVENT))
    .filter(l => !l.href && !l.refused && l.price && l.price !== "Free")
    .map(l => `${l.name} costs money on day ${l.day} and the costs list has nowhere to send them. Add a ticket URL to that row, or the guide can only tell them to pay at the door.`);
