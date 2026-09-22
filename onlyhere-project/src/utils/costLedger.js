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
import { affiliateHref, isPartnerLink, carRentalFits, carRentalUrl, stayDoorUrl, isWegotripUrl } from "./affiliates";
import { OPERATORS, isLongLeg } from "./operators";
import { journeyUrl } from "./rejseplanen";
import { isFerryText } from "./helpers";
// One definition of each, read twice. priceLabel and pricesIn are how the price
// was written down in the first place, and stampDay is how the provenance panel
// already prints this same stamp.
import { pricesIn, priceLabel } from "./entryAudit";
import { PRICE_FIELDS } from "./entryPrice";
// The door judgement, derived from TYPES_WITH_A_DOOR where the kind vocabulary
// already lives, so this file and the town page cannot disagree about it.
import { showsTicketForKind } from "./journeyScope";
import { stampDay } from "./provenance";
import { bedStateOf, openNightsLine, needsABed } from "./nightsOpen";
import { staysIn } from "./stayDoors";

export const COST_KIND = {
  ENTRY: "entry",
  EVENT: "event",
  TRANSPORT: "transport",
  FERRY: "ferry",
  CAR: "car",
  STAY: "stay",
  // 6 Sep 2026. A self-guided audio walk is not admission and not transport,
  // and giving it one of their kinds would have printed "Buy tickets" over a
  // walking tour. Its own kind, its own action word.
  AUDIO: "audio",
};

// ── A TOWN HAS NO DOOR, AND WAS SELLING FESTIVAL TICKETS ────────────
//
// Oliver, 19 Sep 2026, reading his own published guide 9vkdc564l13: "The
// Roskilde 'tickets' are literally selling Roskilde Festival tickets."
//
// He was reading this list. The stop is the TOWN of Roskilde, one day of a
// seven day itinerary, and the line printed under it carried 80 kr read off
// roskildedomkirke.dk beside a Buy tickets button landing on
// ticketmaster.dk/artist/roskilde-festival. Three different things — a town, a
// cathedral's admission, a music festival — added up into one charge, and a
// reader who trusted it would arrive having bought the wrong thing entirely.
//
// The cause is that entryLine read whatever the row carried and never asked
// whether the row is a thing with a way in. entryPrice.js has written down for
// weeks who is allowed to be asked: "Every check that reasons about 'the ticket
// price' belongs to this list and nothing else." This file reasons about the
// ticket price on every line and had never consulted it. affiliateSweep.js asks
// it as hasADoor before it will let an agent be searched for a row at all, so
// the question was already answered one module away.
//
// WHY IT READS _src AND NOT type. A guide stop is a name, resolved by
// lookupRealPlace, and what comes back is a pool entry stamped with the pool it
// was found in. The published `type` does not survive that merge.
//
// ── AND THE TABLE MOVED OUT, 19 SEP 2026 ────────────────────────────
//
// This file held its own type-to-pool table for a few hours, and then the town
// page needed the same judgement for its 🎫 Book tickets button. Two tables of
// the same relation is the mistake journeyScope.js was written about in its own
// words: "it was already a hand-written list copied from CONTENT_TYPES, which is
// the exact shape of the bug recorded in regions.js."
//
// So it lives in journeyScope.js, which already owns "the render vocabulary is
// not the Studio vocabulary" and already held the kind table, and it is derived
// there from TYPES_WITH_A_DOOR. The three doored pools this file resolves to
// (free, craft, event) are the same three names that file calls render kinds,
// which is a coincidence worth CHECKING rather than assuming: the assertions
// name every pool on both sides, so a vocabulary that drifts fails the suite
// rather than silently printing a checkout over a town again.
export const stopHasADoor = (row) => showsTicketForKind(String(row?._src || "").trim());

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
// ── AND A KEY IS NOT A PRICE ────────────────────────────────────────
//
// Found 8 Sep 2026. entryAudit.priceKey turns a price into "lo-hi" so two of
// them can be COMPARED, and priceSource was storing that key as the price. This
// function handed it straight to the render, so a stop whose ticket costs 199
// kr appeared under "What you pay" as "199-199", and a tiered one as "15-135".
//
// Fixed at the source, so every new draft stores a sentence. Fixed HERE for the
// rows already published, and not by guessing: the key was made from the
// entry's own price text, so the entry's own price text is where the figure and
// its currency are recovered from. A key that no longer matches anything the
// row says is a price we can no longer read, and no price on the line beats a
// wrong one.
const KEY_SHAPE = /^\d+(?:\.\d+)?-\d+(?:\.\d+)?$/;
const HAS_CURRENCY = /\b(?:kr|kroner|dkk|eur|euro|€|\$|usd)\b|€|\$/i;

export const readableFigure = (stored, row) => {
  const text = String(stored ?? "").trim();
  if (!text) return "";
  // Already a sentence: the Studio's own price repair writes "199 DKK", and so
  // does every draft written after the fix above.
  if (!KEY_SHAPE.test(text)) return HAS_CURRENCY.test(text) || /\d/.test(text) ? text : "";
  const said = PRICE_FIELDS.map(k => String(row?.[k] ?? "")).filter(Boolean).join(" ");
  const hit = pricesIn(said).find(p => `${p.lo}-${p.hi}` === text && p.currency);
  return hit ? priceLabel(hit) : "";
};

// The measured price, or "". __priceSource is the only field trusted here: it
// carries the URL it was read from and the date it was read, which is what makes
// a printed figure falsifiable instead of merely confident.
export const readPrice = (row) => {
  const ps = row?.__priceSource;
  const stored = String(ps?.price ?? "").trim();
  if (!stored) return null;
  // A band id is not a price. PRICE_BANDS exists for a different question and a
  // row storing "mid" must never render as though it were a figure in kroner.
  if (!/\d/.test(stored)) return null;
  const text = readableFigure(stored, row);
  if (!text) return null;
  // The DAY, not the timestamp. This printed "checked 2026-09-07T20:38:31.535Z"
  // under a figure, while the provenance panel formatted the same stamp
  // properly. Two readers of one value, one of them formatting it.
  return { text, host: String(ps.host || "").trim(), at: stampDay(ps.at) };
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
  // ── AND THE PRICE ON THIS LINE IS ALREADY ATTRIBUTED ──────────────
  //
  // Oliver, 8 Sep 2026, of the WOW PARK entry: "199.. you click link, and it
  // says 289." Both true and different tickets: the operator sells a dated day
  // ticket from 199 and the Tiqets page sells a flexible one from 289.
  //
  // This block briefly answered that by dropping the link, which measured badly
  // on the entry page and measures no better here: of the 192 published rows,
  // the 11 with a ticket link have NONE whose price was read from the shop
  // selling it, so the gate removed every checkout this list can offer.
  //
  // It is also the one place that never needed the gate. The line already
  // carries priceFrom, and CostsBlock prints the host and the day it was read
  // directly under the figure, so "199 kr / wowpark.dk / checked 2026-09-07"
  // stands beside a link marked Tiqets and says on its face that they are two
  // shops. The entry page had to LEARN to say that; this one already did.
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
  // THE DOOR FIRST, before the price is even read. A row with no admission has
  // no figure to print and nothing to sell, so it returns the empty line that
  // costLines already drops rather than a refusal: a refusal is printed, and
  // "there is nothing to buy here" is not news about a town.
  if (!stopHasADoor(row)) return { kind: COST_KIND.ENTRY, name, day, forWhat: `Day ${day}`, price: "", priceFrom: null, href: "", partner: false, refused: "", bookAhead: false };
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
// ferryLeg and dayDateFor are passed in rather than recomputed: the day walk
// in costLines is the only place that knows which stops the crossing sits
// between, and a second reader of the same legs array is how two parts of one
// file come to disagree. See utils/rejseplanen.js.
// ── AND "THE LONG HOPS" HAVE TO BE LONG ─────────────────────────────
//
// 22 Sep 2026, a live guide for two travellers on public transport in South
// Jutland: Højer, Møgeltønder, Ribe, and then three days inside Ribe. Under To
// arrange it read "FlixBus, coaches, slower and usually cheaper. The long hops
// on day 2, day 3, day 4, day 5." FlixBus runs no coach on any of those legs,
// which are regional buses and a local train, and days 4 and 5 never left
// Ribe at all.
//
// `travelDays` was every day after the first that had a stop on it. Nothing
// measured a hop, so a five day trip was five days of long hops by definition.
// The leg chip on the same page has applied the real rule since 9 Aug:
// operatorsForLeg names DSB and FlixBus only for a leg of LONG_LEG_KM or more,
// and stays quiet on a leg it cannot measure, because "unknown is not long".
//
// So `longDays` is now the days on which SOME leg measures long, read by the
// same isLongLeg the chip reads, and DSB and FlixBus are listed only when there
// is one. The local line stays for any trip that moves between days, because
// Rejseplanen is the answer for exactly the regional hops these two are not.
const transportLines = ({ mode = "", ferryDays = [], travelDays = [], longDays = [], ferryLeg = null, dayDateFor = () => null } = {}) => {
  const m = String(mode || "").toLowerCase();
  const out = [];
  const publicTransport = /public transport|train|bus|tog|offentlig/.test(m);
  if (publicTransport && longDays.length) {
    const onDays = `The long hops on day ${longDays.join(", day ")}`;
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
    ];
    for (const r of rows) {
      out.push({
        kind: COST_KIND.TRANSPORT,
        name: r.name,
        day: longDays[0],
        forWhat: r.what,
        price: "",
        priceFrom: null,
        href: r.op.url,
        partner: false,
        refused: "",
        bookAhead: true,
      });
    }
  }
  if (publicTransport && travelDays.length) {
    out.push({
      kind: COST_KIND.TRANSPORT,
      name: "Local buses and regional trains",
      day: travelDays[0],
      // "Neither of those" only when DSB and FlixBus are on the list above it.
      forWhat: longDays.length
        ? "The legs neither of those sells: city buses, the metro, the short regional hops. Rejseplanen prices every operator in one search."
        : "City buses, the metro and the regional hops on this trip. Rejseplanen prices every operator in one search.",
      price: "",
      priceFrom: null,
      href: OPERATORS.rejseplanen.url,
      partner: false,
      refused: "",
      // A tap-in ticket cannot sell out, so it never sorts above a booking.
      bookAhead: false,
    });
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
      // Prefilled with the crossing when the day named both ends, and the front
      // page when it did not. Nothing is lost in the second case, which is why
      // the fallback stays rather than the row being dropped.
      href: journeyUrl({ from: ferryLeg?.from, to: ferryLeg?.to, date: dayDateFor(ferryLeg?.day) }) || OPERATORS.rejseplanen.url,
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
  // The straight-line kilometres between two consecutive stops, or null when
  // nobody could measure it. Injected like everything else here, and the guide
  // page hands in the same legDistanceKm the leg chips use, so this list and
  // the chips cannot disagree about which hop is long. See transportLines.
  legKm = () => null,
} = {}) => {
  const days = Array.isArray(guide?.days) ? guide.days : [];
  const lookup = typeof rowFor === "function" ? rowFor : () => null;
  const measure = typeof legKm === "function" ? legKm : () => null;
  const out = [];
  const seen = new Set();
  const ferryDays = [];
  // The first crossing's two ends, for the journey planner link below.
  const ferryLeg = { from: "", to: "", day: null };
  const travelDays = [];
  const longDays = [];

  days.forEach((d, i) => {
    const dayNo = d?.day || i + 1;
    const dayDate = dayDateFor(dayNo);
    // Every hop that lands on this day: the one in from the day before, then
    // each one between its own stops. A day is a long day when any of them
    // measures long, and a hop nobody could measure is not long.
    {
      const stops = (d?.stops || []).filter(s => s && s.name);
      const before = i > 0 ? (days[i - 1]?.stops || []).filter(s => s && s.name).slice(-1)[0] : null;
      const hops = [];
      if (before && stops[0]) hops.push([before, stops[0]]);
      for (let k = 0; k < stops.length - 1; k++) hops.push([stops[k], stops[k + 1]]);
      if (hops.some(([a, b]) => isLongLeg(measure(a, b)))) longDays.push(dayNo);
    }
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
    if (legs.some(isFerryText)) {
      ferryDays.push(dayNo);
      // ── AND WHICH CROSSING IT IS ──────────────────────────────
      //
      // 20 Sep 2026, wiring Rejseplanen's own deep link format. The legs array
      // is parallel to the gaps BETWEEN stops, so leg i is the hop from stop i
      // to stop i+1: the first ferry leg names both ends of the crossing, and
      // those are the two fields the journey planner wants. Recorded the first
      // time a day has one, because a link to one real crossing beats a link
      // to a front page, and a second crossing on the same day would have to
      // overwrite the first. See utils/rejseplanen.js.
      const at = legs.findIndex(isFerryText);
      const stops = d?.stops || [];
      const from = String(stops[at]?.name || "").trim();
      const to = String(stops[at + 1]?.name || "").trim();
      if (from && to && !ferryLeg.from) { ferryLeg.from = from; ferryLeg.to = to; ferryLeg.day = dayNo; }
    }
    if ((d?.stops || []).length && i > 0) travelDays.push(dayNo);
  });

  // ── AND A WALK OF THE TOWN THEY ARE ALREADY IN ────────────────────
  //
  // Oliver, 6 Sep 2026, choosing where WeGoTrip's audio walks appear: town
  // pages AND guides. This is the guide half, and it is a SECOND pass rather
  // than a branch in the loop above on purpose: entryLine drops a row with no
  // door, which is exactly what a town row is, so a town carrying __audio never
  // reaches that loop's output. That used to be a happy accident of a town
  // carrying no price and no ticket link, and on 19 Sep 2026 one carried both.
  // stopHasADoor makes it the rule this pass was always relying on.
  //
  // ONE LINE PER TOWN, not per walk. Copenhagen has eight and __audio already
  // holds the honest single destination for that case, chosen by
  // utils/wegotripMatch.js when the sweep wrote it.
  //
  // NOT bookAhead. A self-guided walk cannot sell out and nothing is lost by
  // buying it on the morning, so it sorts below the things that stop being
  // possible if ignored. byUrgency does the rest.
  {
    const towns = new Set();
    days.forEach((d, i) => {
      const dayNo = d?.day || i + 1;
      (d?.stops || []).forEach((st) => {
        const row = lookup(String(st?.name || "").trim());
        const audio = row?.__audio;
        const href = String(audio?.url || "").trim();
        // isWegotripUrl AND the scheme. The host check is the one that stops a
        // guide printing "on WeGoTrip" over somebody else's site; the scheme
        // check is what stops a javascript: URL reaching an anchor. Two
        // different failures, so both are asked.
        if (!href || !/^https:\/\//i.test(href) || !isWegotripUrl(href)) return;
        const town = String(audio.town || "").trim() || String(st?.name || "").trim();
        if (towns.has(town)) return;
        towns.add(town);
        const count = Number(audio.count) || 1;
        const wrapped = affiliateHref(href) || href;
        out.push({
          kind: COST_KIND.AUDIO,
          name: count > 1 ? `Self-guided audio walks in ${town}` : (String(audio.title || "").trim() || `Self-guided audio walk in ${town}`),
          day: dayNo,
          forWhat: count > 1
            ? `${count} walking tours of ${town} you play on your phone, on WeGoTrip. Optional, and separate from anything in this guide.`
            : `A walking tour of ${town} you play on your phone, on WeGoTrip. Optional, and separate from anything in this guide.`,
          price: "",
          priceFrom: null,
          href: wrapped,
          partner: isPartnerLink(wrapped),
          refused: "",
          bookAhead: false,
        });
      });
    });
  }

  out.push(...transportLines({ mode, ferryDays, travelDays: travelDays.slice(0, 4), longDays: longDays.slice(0, 4), ferryLeg, dayDateFor }));

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

  // ── THE NIGHTS THAT ARE NOT ALREADY BOOKED ────────────────────────
  //
  // One line, not one per night: the search is the same search.
  //
  // AND NOT COUNTED HERE ANY MORE. This counted DAYS carrying a where-to-stay
  // sentence, which got two things wrong at once on Oliver's own guide: it
  // counted the last day, which has no night after it, and it said "3 nights
  // with no bed booked yet" on a trip whose KEEP IN MIND block, four inches
  // lower, said his booking covered nights nobody had identified. Two readers
  // of one slot. utils/nightsOpen.js is the only one now, and it writes the
  // sentence too, so this file cannot drift away from the writer's again.
  const beds = bedStateOf(guide);
  const stayArea = days.find(d => d?.glance?.stayArea)?.glance?.stayArea || "";
  const bedLine = openNightsLine(beds, stayArea);
  if (bedLine) {
    const area = stayArea;
    // ── THROUGH THE ONE STAY DOOR ──────────────────────────────────
    //
    // Oliver, 19 Sep 2026: "stick to the area and then just put Booking.com
    // front-page affiliate link. I think that's the best solution."
    //
    // stayDoorUrl, not a search this line builds, and for the reason it exists:
    // the programme does not deep link, so a search URL lands on the front page
    // and the row would be promising a listing for this area that nobody gets.
    // The door answers with what it may be labelled, and this row's `forWhat`
    // says the area only when the link will show it.
    const door = stayDoorUrl({ area, slot: "costs-stay" });
    const href = door?.href || "";
    out.push({
      kind: COST_KIND.STAY,
      name: "Somewhere to sleep",
      day: 1,
      // Written by nightsOpen, not here. See the block above.
      forWhat: bedLine,
      price: "",
      priceFrom: null,
      href,
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
// ── "CAN YOU IMPLEMENT ESTIMATED COST INTO THE GUIDE" ──────
//
// Oliver, 18 Sep 2026. The list under What you pay has been per line since it
// was built, and a reader planning a trip wants one number.
//
// ── A FLOOR, NOT A FORECAST ──────────────────
//
// Every rule below exists to stop this becoming a figure that is wrong in a way
// nobody can see:
//
//   ONE CURRENCY. Only DKK is added up. There is no live rate in this app and
//   converting at a guessed one would put a wrong number in a total that looks
//   precise. A line in euros is counted as not counted.
//
//   THE LOW END OF A RANGE. "150 to 275 DKK" contributes 150. The answer is a
//   floor, so it says FROM, and a floor built from high ends is neither.
//
//   FREE IS A FIGURE. A free line is counted, at zero, because leaving it out
//   would make it look unpriced when it is the most certain line on the list.
//
//   AND WHAT IS MISSING IS SAID OUT LOUD. `unpriced` is how many lines carry no
//   figure, and the render prints it. A total that quietly omits four stops is
//   the "at a glance" failure with money attached.
//
//   AND A LINE WITH NOTHING TO BUY IS NOT A COST. Found by writing the
//   assertion, 18 Sep 2026: on the February fixture this counted Distortion's
//   450 DKK, which is more than half the total, into a trip whose own page says
//   "there is nothing to buy for your dates" two lines above the figure. A
//   refusal is the page telling the reader not to count on something, so a
//   number labelled what you pay may not count it either. Refused lines are
//   reported in their own bucket rather than dropped in silence.
//
// PER PERSON, and that is a property of the data rather than a choice: every
// priced line in costLines is per head. The stay line carries no price at all,
// because it is a search rather than a quote, so a room is named as not
// included rather than guessed at.
export const estimateFrom = (lines) => {
  const rows = Array.isArray(lines) ? lines.filter(Boolean) : [];
  let from = 0;
  const counted = [], unpriced = [], otherCurrency = [], refused = [];
  for (const l of rows) {
    const text = String(l?.price ?? "").trim();
    // The refusal is read before the price, and a priced refusal counts as
    // refused rather than as unpriced: the figure is real, it is just not a
    // figure this reader pays. An unpriced refusal is nobody's business twice.
    if (l?.refused) { if (text) refused.push(l); continue; }
    if (!text) { unpriced.push(l); continue; }
    if (/^free$/i.test(text) || /\bgratis\b/i.test(text)) { counted.push({ line: l, kroner: 0 }); continue; }
    const found = pricesIn(text).filter(p => p.currency);
    const dkk = found.find(p => String(p.currency).toUpperCase() === "DKK");
    if (!dkk) {
      if (found.length) otherCurrency.push(l);
      else unpriced.push(l);
      continue;
    }
    const lo = Number(dkk.lo);
    if (!Number.isFinite(lo)) { unpriced.push(l); continue; }
    from += lo;
    counted.push({ line: l, kroner: lo });
  }
  // NOTHING COUNTED IS NOT A TOTAL OF ZERO. A guide whose every line is a
  // search link has no estimate, and printing "from 0 DKK" over one would be
  // the worst sentence in this file.
  if (!counted.length) return null;
  return {
    from,
    counted: counted.length,
    unpriced: unpriced.length,
    otherCurrency: otherCurrency.length,
    refused: refused.length,
    // Named, because "and 4 more" is not a thing anybody can check.
    missing: unpriced.map(l => String(l?.name || "")).filter(Boolean).slice(0, 6),
    // ── AND THE REFUSED ONES NAMED WITH THEIR PRICES ─────────────
    //
    // 19 Sep 2026. The lines on the page did not add up to the figure under
    // them: a reader saw 145, 450, 160 and 110 and a total of 255, with one
    // sentence saying two were left out and not saying which. The unpriced ones
    // were named directly underneath, which made the silence about these two
    // look like an error rather than a rule. The price comes with the name, so
    // the arithmetic closes: 255 plus the two named figures is what is on
    // screen.
    refusedNames: refused.map(l => {
      const n = String(l?.name || "").trim();
      if (!n) return "";
      const p = String(l?.price || "").trim();
      return p ? `${n} (${p})` : n;
    }).filter(Boolean).slice(0, 6),
    // A room is the biggest number on any trip and this list never holds one.
    stayIncluded: counted.some(c => c.line?.kind === COST_KIND.STAY),
  };
};

// ── "PER PERSON" IS HONEST AND NOT THE NUMBER A FAMILY WANTS ────
//
// Every priced line in costLines is per head, so the estimate is too, and it
// says so. A family of four reading 255 owes 1020 and the page was leaving that
// multiplication to them.
//
// THE COUNT IS REFUSED RATHER THAN GUESSED. `_travelers` is free text a
// traveller typed, so "2 adults and 2 kids" is four heads, "family of 4" is
// four, and "2 weeks with friends" is a number this must not multiply anything
// by. A count is read only where it sits next to a word about people, and the
// answer is null everywhere else: no group line is better than a wrong one.
const PEOPLE = "adults?|grown[- ]?ups?|people|persons?|travell?ers?|friends?|kids?|children|child|babies|baby|toddlers?|voksne|b\u00f8rn|boern|personer|rejsende|venner";
const KIDS = /\b(?:kids?|children|child|babies|baby|toddlers?|b\u00f8rn|boern|barn)\b/i;
const ALONE = /\b(?:alone|solo|just me|by myself|on my own|alene|selv)\b/i;
const PARTY_CAP = 12;

// ── AND THE COUNTS, WHEN THE BRIEF ALREADY HAS THEM ────
//
// 19 Sep 2026. partyOf reads a sentence, which is the only thing this block
// used to be given. The guide now carries `_party` as well, read by the brief
// from the same turns, and a structured count beats a parse of a rendered
// string every time.
//
// AND IT REFUSES AN INCOMPLETE PARTY. "5 children" with no adult count is the
// shape his own export produced, and multiplying a per person figure by five
// children would be wrong twice: the adults are missing from the count, and a
// child's ticket is usually cheaper than the figure being multiplied. No group
// line is the honest answer until somebody says how many adults are coming,
// which the brief now asks.
export const partyFrom = (party) => {
  if (!party || typeof party !== "object") return null;
  const adults = Number(party.adults);
  const kids = Number(party.kids);
  const total = Number(party.total);
  const heads = Number.isFinite(total) && total > 0 ? total
    : (Number.isFinite(adults) && adults > 0 ? adults + (Number.isFinite(kids) && kids > 0 ? kids : 0) : null);
  // Children and nobody to travel with them is not a headcount to multiply by.
  if (!heads || (party.hasKids && !(Number.isFinite(adults) && adults > 0))) return null;
  if (heads > PARTY_CAP) return null;
  return { heads, hasKids: !!party.hasKids };
};

export const partyOf = (said) => {
  const text = String(said ?? "").trim();
  if (!text) return null;
  const hasKids = KIDS.test(text);
  let heads = 0;
  for (const m of text.matchAll(new RegExp(`(\\d{1,2})\\s*(?:more\\s+)?(?:${PEOPLE})\\b`, "gi"))) {
    heads += Number(m[1]) || 0;
  }
  // "family of 4", "familie p\u00e5 4", "party of 3", "group of 6".
  if (!heads) {
    const of = text.match(/\b(?:family|familie|party|group|gruppe|selskab)\s+(?:of|p\u00e5|paa|pa)\s+(\d{1,2})\b/i);
    if (of) heads = Number(of[1]) || 0;
  }
  // A bare count, which is what the intake field mostly holds: "4", "4 pax",
  // "we are 4". Deliberately narrow: a number inside a sentence about anything
  // else is not a headcount.
  if (!heads) {
    const bare = text.match(/^\s*(?:we\s+are\s+|vi\s+er\s+)?(\d{1,2})\s*(?:pax|of us)?\s*$/i);
    if (bare) heads = Number(bare[1]) || 0;
  }
  if (!heads && ALONE.test(text)) heads = 1;
  if (!heads || heads < 1) return null;
  // A guide for thirty is a coach tour and not something this figure should
  // multiply out; a two-digit typo should not print a five-figure total either.
  if (heads > PARTY_CAP) return null;
  return { heads, hasKids };
};

// The group figure, and the caveat that makes it honest. A child's ticket is
// usually cheaper and sometimes free, so multiplying an adult price by heads
// OVERSTATES a family, which is the one direction a floor may not err in
// without saying so.
export const describeGroup = (e, party) => {
  if (!e || !party || !(party.heads > 1)) return "";
  const total = e.from * party.heads;
  return party.hasKids
    ? `For ${party.heads} of you that is from ${total} DKK, counting everybody at the adult price. Children are often cheaper and sometimes free, so the real figure is usually lower.`
    : `For ${party.heads} of you that is from ${total} DKK.`;
};

// The sentence, in one place, so the render cannot invent a different claim
// from the same numbers.
export const describeEstimate = (e) => {
  if (!e) return "";
  const bits = [`From ${e.from} DKK per person`];
  if (!e.stayIncluded) bits.push("a bed is not in it");
  if (e.unpriced) bits.push(`${e.unpriced} line${e.unpriced === 1 ? "" : "s"} on this list ${e.unpriced === 1 ? "carries" : "carry"} no price yet`);
  if (e.otherCurrency) bits.push(`${e.otherCurrency} priced in another currency and left out`);
  // Named rather than dropped quietly, because a reader who can see a 450 DKK
  // line above a total that does not include it is owed the reason.
  // "nothing to buy for them" rather than a date reason: off_window is about
  // the dates, sold_out and off_sale are not, and one sentence covers all six
  // refusals without claiming the wrong one.
  if (e.refused) bits.push(`${e.refused} left out because there is nothing to buy for ${e.refused === 1 ? "it" : "them"}`);
  // FROM, and the reason said plainly: every figure on the list is a lowest
  // price, so the sum of them is a lowest price too.
  return `${bits.join(", ")}. Every figure here is a lowest price, so this is a floor rather than a forecast.`;
};

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

// ── THE WORD ON A DOOR, IN ONE PLACE ────────────────────────────────
//
// Moved here from CostsBlock on 21 Sep 2026, when the doors left that block
// for the days they belong to. Two render sites now draw the same door, and a
// label decided in one of them would have drifted from the other.
export const costAction = (kind) =>
  kind === COST_KIND.TRANSPORT || kind === COST_KIND.FERRY ? "Check times and fares"
    : kind === COST_KIND.STAY ? "Find a room"
    : kind === COST_KIND.CAR ? "Book the car"
    // A walking tour is not a ticket, and "Buy tickets" over one is the label
    // that made it need its own kind in the first place.
    : kind === COST_KIND.AUDIO ? "Listen to a sample"
    : "Buy tickets";


// ── THE WHOLE TRIP ──────────────────────────────────────────────────
//
// Oliver, 21 Sep 2026: "I'd like if you can give the users an estimate on
// their entire trip." What you pay was the tickets and nothing else, under a
// line that said so: "a bed is not in it".
//
// The beds come from the build now. Each day's enrichment keeps the lowest
// room price its own search stated, with the words that stated it and the day
// it was read (see nightPriceFrom in utils/accommodation.js). A stay is priced
// at the figure read for any of its nights, times its nights, for ONE ROOM:
// the page says so rather than guessing how many rooms a party takes.
//
// A STAY WITH NO FIGURE IS NAMED, NOT GUESSED. It is counted as nights not in
// the total, the same way an unpriced ticket is. And a guide built before this
// existed has no figures at all, so it shows no whole-trip line and keeps the
// tickets estimate it always had.
export const bedsEstimate = (guide) => {
  const days = Array.isArray(guide?.days) ? guide.days : [];
  const state = bedStateOf(guide);
  const nights = days.map((d, i) => Number(d?.day || i + 1)).filter(n => needsABed(n, state));
  const byDay = new Map(days.map((d, i) => [Number(d?.day || i + 1), d]));
  let from = 0, unpricedNights = 0;
  const stays = [];
  for (const run of staysIn(days, nights)) {
    const read = run.nights.map(n => byDay.get(n)?.glance?.__night).find(x => Number(x?.kr) > 0) || null;
    if (!read) { unpricedNights += run.nights.length; continue; }
    const kr = Number(read.kr);
    from += kr * run.nights.length;
    stays.push({ nights: run.nights.length, kr, says: String(read.says || ""), at: String(read.at || "") });
  }
  if (!stays.length) return null;
  return { from, stays, nights: nights.length, unpricedNights };
};

// The line under the tickets estimate. The tickets are per person and the beds
// per room, and the sentence keeps them apart rather than adding people to
// rooms: "for one room and N people's tickets" is a sum a reader can check.
export const tripEstimate = (tickets, beds, party = null) => {
  if (!beds) return null;
  const heads = party?.heads > 1 ? party.heads : 1;
  const ticketPart = tickets ? tickets.from * heads : 0;
  return { from: ticketPart + beds.from, ticketPart, heads, beds };
};

export const describeTrip = (trip, { car = false, transport = false } = {}) => {
  if (!trip) return [];
  const out = [];
  const b = trip.beds;
  const nights = b.stays.reduce((n, s) => n + s.nights, 0);
  out.push(`Beds from ${b.from} DKK for one room, ${nights} ${nights === 1 ? "night" : "nights"}, at the lowest room price the search found when this guide was built.`);
  if (trip.ticketPart) out.push(`Tickets from ${trip.ticketPart} DKK${trip.heads > 1 ? ` for ${trip.heads} of you` : ""}.`);
  const not = ["meals"];
  if (car) not.push("the car");
  if (transport) not.push("trains and buses");
  if (b.unpricedNights) not.push(`${b.unpricedNights} ${b.unpricedNights === 1 ? "night" : "nights"} with no room price found`);
  const list = not.length === 1 ? not[0] : `${not.slice(0, -1).join(", ")} and ${not[not.length - 1]}`;
  out.push(`Not in it: ${list}.`);
  return out;
};
