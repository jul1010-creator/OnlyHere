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
import { cleanScanCode, newScanCode } from "./scanCode.js";
import { cleanOffer, offerProblems, OFFER_TEXT_MAX } from "./offer";
import { cleanClock, OFFER_WEEK } from "./offerClock";
import { bookingProblem, cleanBooking } from "./dealExtras";
import { inNowArea } from "./nowPlanner";
import { pinColour } from "./pinColours";
import { DEAL_CATEGORIES, TYPE_OF_CATEGORY, dealCategory } from "./dealCategories";
export { DEAL_CATEGORIES };

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
// A new deal is filed under the type that fits its kind of place.
export const typeForCategory = (c) => TYPE_OF_CATEGORY[c] || "free";
export const DAY_SHORT = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 0: "Sun" };
export const WEEK_ORDER = OFFER_WEEK;

// A deal row is a Klaipėda place of one of those types with an offer on it.
export const isDealRow = (row) =>
  !!row && TYPES.includes(row.type) && String(row.payload?.country || "").toUpperCase() === "LT" && !!row.payload?.__offer;

export const emptyDeal = () => ({
  id: null, type: "food", published: false,
  name: "", street: "", lat: "", lon: "", sign: "",
  text: "", days: [], from: "", to: "", until: "", ongoing: false,
  dealKind: "", booking: "", pin: "", photo: "", category: "restaurants",
  lt: "", da: "", de: "", trFor: "", scan: "",
});

// The form, from a row of gemlyx_content.
export const dealFromRow = (row) => {
  const p = row?.payload || {};
  const o = p.__offer || {};
  const tr = cleanOffer(o)?.tr || null;
  return {
    id: row?.id ?? null, type: TYPES.includes(row?.type) ? row.type : "food", published: !!row?.published,
    name: String(p.name || ""), street: String(p.location || ""),
    lat: p.__lat ?? p.lat ?? "", lon: p.__lon ?? p.lon ?? "", sign: String(p.emoji || ""),
    text: String(o.text || ""), days: Array.isArray(o.days) ? o.days : [], from: String(o.from || ""), to: String(o.to || ""), until: String(o.until || ""), ongoing: o.ongoing === true,
    dealKind: DEAL_FILTERS.includes(p.__dealKind) ? p.__dealKind : "", booking: String(p.__booking || ""), pin: pinColour(p.__pin), photo: String(p.photo || ""), category: dealCategory({ ...p, type: row?.type }),
    lt: tr?.lt || "", da: tr?.da || "", de: tr?.de || "", trFor: tr ? tr.src : "",
    scan: cleanScanCode(p.__scan),
  };
};

const num = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));

// ── WHAT A DEAL MAY NOT PROMOTE ─────────────────────────────────────
// Oliver, 17 Oct 2026: "make rules for people what they're allowed to
// promote. Like 'no alcohol promotions' and 'No 18+ promotions' written in
// red. And obviously it has to be put into terms of use." The rules are
// clause 14.6 of public/terms.html. Lithuania's Alcohol Control Law bans
// alcohol advertising and announcing alcohol price cuts (Articles 28 and 29),
// so a bar's deal is about food, games, entry or soft drinks, and never
// depends on buying alcohol. The word lists catch the plain cases in the four
// languages of the site; anything they miss is still against the terms.
// "alcoholic drinks. Remember. Because you can have non-alcoholic drinks or
// sodas.." (Oliver, 17 Oct 2026), so the rule names alcoholic drinks and the
// line under it says what is allowed.
export const DEAL_RULES = ["No alcoholic drink promotions", "No 18+ promotions"];
export const DEAL_RULES_ALLOWED = "Soft drinks and alcohol-free drinks are fine.";
// Oliver, same night: "It also needs to be clear that doing any of these
// promotions will lead to a immediate suspension." Terms clause 14.8.
export const DEAL_RULES_BREACH = "Breaking either rule means immediate suspension.";
const ALCOHOL = /(?:^|[^\p{L}])(beers?|lagers?|ales?|stouts?|ipa|ciders?|wines?|prosecco|champagne|cocktails?|vodka|gin|whisk(?:e)?y|brandy|cognac|liqueurs?|tequila|mead|spritz|aperol|mojitos?|happy hour|alus|alaus|vynas|vyno|degtinė|degtinės|kokteili\p{L}*|sidras|midus|øl|vin|vinen|snaps|bier|biere|wein|sekt|schnaps)(?![\p{L}])/iu;
const ALCOHOL_FREE = /(alcohol[ -]?free|non[ -]?alcoholic|(?:^|[^\d])0[.,]0\s*%|nealkoholin\p{L}*|be alkoholio|alkoholfri\p{L}*|alkoholfrei\p{L}*)/iu;
const ADULT = /(?:^|[^\p{L}\d])(18\+|tobacco|cigarettes?|cigars?|vape|vapes|vaping|e-?cig\p{L}*|hookah|shisha|casino|gambling|betting|poker|erotic|strip ?club|adults? only|tabak\p{L}*|cigaret\p{L}*|kaljan\p{L}*|lošim\p{L}*|kazino|glücksspiel|spillested)(?![\p{L}])/iu;
const offerWords = (f) => [f?.text, f?.lt, f?.da, f?.de].map(v => String(v || "")).join(" \n ");
export const promotesAlcohol = (f) => { const w = offerWords(f); return ALCOHOL.test(w) && !ALCOHOL_FREE.test(w); };
export const promotesAdult = (f) => ADULT.test(offerWords(f));
export const ruleProblems = (f) => [
  ...(promotesAlcohol(f) ? ["No alcoholic drink promotions. Soft drinks and alcohol-free drinks are fine, and the offer must not depend on buying alcohol."] : []),
  ...(promotesAdult(f) ? ["No 18+ promotions. Nothing about tobacco, vaping, gambling or anything only for adults."] : []),
];

// What stops it saving, in words, one thing to do each.
export const dealProblems = (f) => {
  const out = [];
  if (!String(f?.name || "").trim()) out.push("Give the place its name.");
  if (!TYPES.includes(f?.type)) out.push("Pick what kind of place it is.");
  const lat = num(f?.lat), lon = num(f?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) out.push("Put the place on the map: find it on Google, or tap the map where its door is.");
  else if (!inNowArea("LT", { lat, lon })) out.push("That spot is outside Klaipėda. Find the place again, or tap the map where its door is.");
  if (!String(f?.text || "").trim()) out.push("Write the offer: what a visitor gets.");
  out.push(...ruleProblems(f));
  if (!f?.ongoing && !String(f?.until || "").trim()) out.push("Give the offer a last day, or set it to No last day.");
  out.push(...offerProblems(offerOf(f)).filter(p => !/no end date|no text/.test(p)));
  const ph = String(f?.photo || "").trim();
  if (ph && !/^https:\/\//i.test(ph) && !/^\/[A-Za-z0-9_\-./]+$/.test(ph)) out.push("The photo has to be uploaded here or be a web address starting with https://.");
  const book = bookingProblem(f?.booking);
  if (book) out.push(book);
  return out;
};

export const offerOf = (f) => cleanOffer({
  text: f?.text, until: f?.until, days: f?.days, from: f?.from, to: f?.to, ongoing: f?.ongoing === true,
  tr: { src: f?.trFor || "", lt: f?.lt, da: f?.da, de: f?.de },
});

// ── THE OFFER IN LITHUANIAN, DANISH AND GERMAN ──────────────────────
// Oliver, 14 Oct 2026: "some things are stuck in English." The offer is the
// one line on a tile a visitor has to understand, so the Studio writes it in
// the three other languages of the site when the deal is saved, and shows the
// three boxes so a wrong word can be put right by hand.
//
// `trFor` is the English text the translations were written for. Changing the
// offer leaves them standing in the boxes but no longer current, and the next
// save writes them again (offer.js keeps only translations of the text as it
// is now).
export const OFFER_LANG_NAMES = { lt: "Lietuvių", da: "Dansk", de: "Deutsch" };
const squash = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
export const translationsCurrent = (f) => !!squash(f?.text) && squash(f?.trFor) === squash(f?.text) && ["lt", "da", "de"].some(l => squash(f?.[l]));
// The words "Danish" and "Denmark" are left out of the prompt on purpose:
// aiClient's localisePrompt swaps them for the country the Studio is working on.
export const offerTranslatePrompt = (text) => `Translate one short offer from a small business in Klaipėda, Lithuania. Visitors read it on a phone, on a tile with the place's photo.

The offer: "${squash(text)}"

Write it in lt (Lietuvių), da (Dansk) and de (Deutsch). Keep every price, number, clock time and name exactly as written. Plain and short, the way the person at the counter would say it. No dashes of any kind. Keep each one under ${OFFER_TEXT_MAX} characters.

Reply with only this JSON and nothing else: {"lt": "", "da": "", "de": ""}`;
// The reply, read. Null when it is not the JSON asked for.
export const readOfferTranslation = (raw) => {
  const t = String(raw || "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  let j;
  try { j = JSON.parse(t.slice(a, b + 1)); } catch { return null; }
  if (!j || typeof j !== "object") return null;
  const out = {};
  ["lt", "da", "de"].forEach(l => { const v = squash(typeof j[l] === "string" ? j[l] : "").replace(/\s*[\u2010-\u2015\u2212]\s*/g, ", ").slice(0, OFFER_TEXT_MAX); if (v) out[l] = v; });
  return Object.keys(out).length ? out : null;
};

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
  // The kind of place on Explore (14 Oct 2026), always set by hand here.
  if (DEAL_CATEGORIES.includes(f.category)) p.__category = f.category; else delete p.__category;
  // The tile's picture (13 Oct 2026). Empty means the map stands in for it.
  const photo = String(f.photo || "").trim();
  if (photo) p.photo = photo; else delete p.photo;
  // The code on the sticker by the till (17 Oct 2026, utils/scanCode.js). Made
  // on the first save and never changed after, so a printed sticker keeps working.
  p.__scan = cleanScanCode(f.scan) || cleanScanCode(base?.__scan) || newScanCode();
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
