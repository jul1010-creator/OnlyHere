// ── THE KLAIPĖDA DEALS, EDITED BY HAND ──────────────────────────────
//
// Oliver, 13 Oct 2026: "Bring in a studio so i can edit", and asked what, "The
// Explore deals". Until now a deal could only reach Explore by drafting a whole
// guide entry in the Studio and filling in its offer fields: the research, the
// sources, the coordinates gate, all for a bakery's coffee refill. And the
// seven partners on Explore were made up and written in the code.
//
// So a deal is its own small thing here: a place, where it is on the map, and
// the offer. Saved as a row of gemlyx_content like every other place, so the
// Explore page, the QR page, the walks and the partner's private numbers all
// read it the same way, with no second store to keep in step.
//
// THE MADE-UP PARTNERS STEP ASIDE BY THEMSELVES. useKlaipedaDeals shows them
// only while no real Klaipėda deal is live, so the first deal set to Show
// replaces all seven. A deal saved as Hidden is in the database and on no page,
// which is how one is got ready before that moment.
//
// This file is the rules, with no React, so the tests read them directly.
import { cleanOffer, offerProblems } from "./offer";
import { cleanClock, OFFER_WEEK } from "./offerClock";
import { bookingProblem, cleanBooking } from "./dealExtras";
import { inNowArea } from "./nowPlanner";
import { pinColour } from "./pinColours";

// The kinds of place a deal can be, as the database types them. What each one
// is called here is what a shop owner would call it, not the table's word.
export const DEAL_PLACE_TYPES = [
  { type: "food", label: "Food and drink", sign: "☕" },
  { type: "night", label: "Bar or nightlife", sign: "🍸" },
  { type: "shop", label: "Shop", sign: "🛍️" },
  { type: "free", label: "Something to do", sign: "🎯" },
];
const TYPES = DEAL_PLACE_TYPES.map(t => t.type);
export const DEAL_FILTERS = ["", "discounts", "entertainment", "activities"];
export const DAY_SHORT = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 0: "Sun" };
export const WEEK_ORDER = OFFER_WEEK;

// A deal row is a Klaipėda place of one of those types with an offer on it.
export const isDealRow = (row) =>
  !!row && TYPES.includes(row.type) && String(row.payload?.country || "").toUpperCase() === "LT" && !!row.payload?.__offer;

export const emptyDeal = () => ({
  id: null, type: "food", published: false,
  name: "", street: "", lat: "", lon: "", sign: "",
  text: "", days: [], from: "", to: "", until: "", ongoing: false,
  dealKind: "", booking: "", pin: "", photo: "",
});

// The form, from a row of gemlyx_content.
export const dealFromRow = (row) => {
  const p = row?.payload || {};
  const o = p.__offer || {};
  return {
    id: row?.id ?? null, type: TYPES.includes(row?.type) ? row.type : "food", published: !!row?.published,
    name: String(p.name || ""), street: String(p.location || ""),
    lat: p.__lat ?? p.lat ?? "", lon: p.__lon ?? p.lon ?? "", sign: String(p.emoji || ""),
    text: String(o.text || ""), days: Array.isArray(o.days) ? o.days : [], from: String(o.from || ""), to: String(o.to || ""), until: String(o.until || ""), ongoing: o.ongoing === true,
    dealKind: DEAL_FILTERS.includes(p.__dealKind) ? p.__dealKind : "", booking: String(p.__booking || ""), pin: pinColour(p.__pin), photo: String(p.photo || ""),
  };
};

const num = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));

// What stops it saving, in words, one thing to do each.
export const dealProblems = (f) => {
  const out = [];
  if (!String(f?.name || "").trim()) out.push("Give the place its name.");
  if (!TYPES.includes(f?.type)) out.push("Pick what kind of place it is.");
  const lat = num(f?.lat), lon = num(f?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) out.push("Put the place on the map: find it on Google, or tap the map where its door is.");
  else if (!inNowArea("LT", { lat, lon })) out.push("That spot is outside Klaipėda. Find the place again, or tap the map where its door is.");
  if (!String(f?.text || "").trim()) out.push("Write the offer: what a visitor gets.");
  if (!f?.ongoing && !String(f?.until || "").trim()) out.push("Give the offer a last day, or set it to No last day.");
  out.push(...offerProblems(offerOf(f)).filter(p => !/no end date|no text/.test(p)));
  const ph = String(f?.photo || "").trim();
  if (ph && !/^https:\/\//i.test(ph) && !/^\/[A-Za-z0-9_\-./]+$/.test(ph)) out.push("The photo has to be uploaded here or be a web address starting with https://.");
  const book = bookingProblem(f?.booking);
  if (book) out.push(book);
  return out;
};

export const offerOf = (f) => cleanOffer({ text: f?.text, until: f?.until, days: f?.days, from: f?.from, to: f?.to, ongoing: f?.ongoing === true });

// The row's payload, from the form. Kept on top of what the row already holds,
// so a place first written in the full Studio keeps its description, photo and
// sources when its deal is changed here.
export const payloadFromDeal = (f, base = {}) => {
  const p = { ...(base || {}) };
  p.name = String(f.name || "").trim();
  p.country = "LT";
  if (!p.town) p.town = "Klaipėda";
  const street = String(f.street || "").trim();
  if (street) { p.location = street; if (!p.mapHint) p.mapHint = `${street}, Klaipėda`; } else delete p.location;
  p.__lat = Number(Number(f.lat).toFixed(6));
  p.__lon = Number(Number(f.lon).toFixed(6));
  const sign = String(f.sign || "").trim();
  if (sign) p.emoji = sign; else if (!base?.emoji) delete p.emoji;
  const offer = offerOf(f);
  if (offer) p.__offer = offer; else delete p.__offer;
  if (DEAL_FILTERS.includes(f.dealKind) && f.dealKind) p.__dealKind = f.dealKind; else delete p.__dealKind;
  if (cleanBooking(f.booking)) p.__booking = String(f.booking).trim(); else delete p.__booking;
  if (pinColour(f.pin)) p.__pin = pinColour(f.pin); else delete p.__pin;
  // The tile's picture (13 Oct 2026). Empty means the map stands in for it.
  const photo = String(f.photo || "").trim();
  if (photo) p.photo = photo; else delete p.photo;
  return p;
};

// "Mon to Fri, 14:00 to 16:00", the way the list reads a deal at a glance.
export const dealWhenShort = (f) => {
  const days = (Array.isArray(f?.days) ? f.days : []).map(Number);
  const sorted = WEEK_ORDER.filter(d => days.includes(d));
  let dayWords = "Every day";
  if (sorted.length && sorted.length < 7) {
    const idx = sorted.map(d => WEEK_ORDER.indexOf(d));
    const run = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    dayWords = run && sorted.length > 2 ? `${DAY_SHORT[sorted[0]]} to ${DAY_SHORT[sorted[sorted.length - 1]]}` : sorted.map(d => DAY_SHORT[d]).join(", ");
  }
  const from = cleanClock(f?.from), to = cleanClock(f?.to);
  return from && to ? `${dayWords}, ${from} to ${to}` : `${dayWords}, all day`;
};
