// ── GEMLYX PROMOTIONS ───────────────────────────────────────────────
//
// Oliver, 29 Sep 2026, on the Klaipėda pilot: "Chances are that they won't use
// the guide though.. I think what will sell more is the discount.. should we
// get a 'Gemlyx promotions' navigation?"
//
// Every offer already lives on its own entry as `__offer` (utils/offer.js),
// written in Studio and refused at publish without an end date. This page is
// only the other way in: every live offer in one list, so a visitor with an
// hour to spare can see what Gemlyx gets them before they pick where to go.
//
// No second source of truth. An offer is read off the same rows the entry
// pages draw, through the same offerLive, so the list and the entry cannot
// disagree about whether an offer is on, and an ended offer drops off both on
// the same day without anybody touching the page.
import { cleanOffer, offerLive, offerView, offerTiming, offerHoursLabel } from "./offer";
import { countryProfile, rowCountry } from "./countries";
import { dayEnd } from "./calendarDay";

// Which pools to read and what each is called on a card. The keys are the
// `_src` values openStopDetail dispatches on, so a card opens its own entry.
export const PROMO_KINDS = {
  free: "Attraction",
  craft: "Workshop",
  food: "Food",
  nightlife: "Nightlife",
  shop: "Shop",
  shopPlace: "Shopping street",
  event: "Event",
  town: "Town",
};

// The clock an offer runs on is the place's (see OFFER HOURS in offer.js).
export const zoneOf = (row) => countryProfile(rowCountry(row)).zone;

const whereOf = (row) => String(row?.town || row?.city || row?.location || row?.region || "").trim();

// { ...row, _src, _where, _offer } for every row with a live offer, ending
// soonest first, because an offer that ends on Friday is the one worth
// reading today. Duplicates (one row in two pools) are kept once.
export const livePromotions = (pools = {}, today = new Date()) => {
  const seen = new Set();
  const out = [];
  for (const [src, rows] of Object.entries(pools)) {
    if (!PROMO_KINDS[src]) continue;
    for (const row of (Array.isArray(rows) ? rows : [])) {
      if (!row?.name || !offerLive(row.__offer, today)) continue;
      const key = `${src}:${row.id ?? row.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...row, _src: src, _where: whereOf(row), _offer: cleanOffer(row.__offer) });
    }
  }
  // On now first, then on later today, then the rest, and within each the
  // one ending soonest. A lunch offer running this minute is the one worth
  // reading to somebody standing in the street with three hours.
  const RANK = { now: 0, always: 1, later: 2, off: 3 };
  const rankOf = (p) => RANK[offerTiming(p._offer, { now: today, zone: zoneOf(p) })] ?? 4;
  const endOf = (p) => dayEnd(p._offer.until)?.getTime() ?? Infinity;
  return out.sort((a, b) => rankOf(a) - rankOf(b) || endOf(a) - endOf(b) || String(a.name).localeCompare(String(b.name)));
};

// What one card says, through offerView so the locked rule is the entry
// page's rule and not a second copy of it.
export const promoCard = (promo, { paid = false, today = new Date(), lang = "en" } = {}) => {
  const view = offerView(promo?.__offer, { paid, today, zone: zoneOf(promo) });
  return {
    kind: PROMO_KINDS[promo?._src] || "",
    where: promo?._where || "",
    locked: view.locked,
    text: view.text,
    until: view.until,
    timing: view.timing,
    hours: offerHoursLabel(promo?.__offer, { timing: view.timing, lang }),
  };
};

// "Until 31 December" or "Until 31 December 2027" when it is not this year.
export const untilLabel = (until, today = new Date()) => {
  const end = dayEnd(until);
  if (!end) return "";
  const sameYear = end.getFullYear() === today.getFullYear();
  return `Until ${end.toLocaleDateString("en-GB", { day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) })}`;
};
