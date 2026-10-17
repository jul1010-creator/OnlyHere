// ── DEALS NEAR YOU, ON NOW ──────────────────────────────────────────
//
// Oliver, 13 Oct 2026, turning the Klaipėda page around: "changing the
// concept so the deals is the focus. Because some places shot down because of
// lack of visitors", and "I hear numerous times that the travelling one
// probably won't be used. People will just use the chat bots for that."
//
// So the QR page opens on this: what local places offer right now, how far
// each is on foot from where the visitor stands, and a button that walks them
// there inside Gemlyx. The made-up walk planner moves underneath it.
//
// What a partner gets from it is counted (utils/partnerStats.js): the offer
// being listed here counts as "shown", a visitor opening it with "Redeem
// offer" counts as "opened to redeem", and one arriving on the walk from Show
// directions counts as "came".
//
// REDEEM, NOT WALK, 13 Oct 2026. Oliver: "the 'Walk There' gotta be changed
// out with 'redeem offer'. Because i want these business to understand that if
// they want this advertisement, then they gotta advetise for me." So the
// button on an offer that is on opens the screen shown at the counter
// (RedeemSheet.jsx), with Gemlyx's mark on it; the walk is under it.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { C } from "../utils/theme";
import { t as uiT } from "../utils/uiLanguage";
import { promoCard } from "../utils/promotions";
import { offerHoursLabel, offerLive, cleanOffer, offerTextIn } from "../utils/offer";
import { NOW_AREAS, NOW_STARTS, inNowArea, walkMinutes, crossesWater, legBetween } from "../utils/nowPlanner";
import { kmApart, ferryWait } from "../utils/walkable";
import { cleanBooking, busyAt } from "../utils/dealExtras";
import { dealsSeen, placeReached, dealRedeemOpened, dealScanned } from "../utils/partnerStats";
import { scanFromSearch, cleanScanCode, firstScanToday } from "../utils/scanCode";
import { WalkMode, askForCompass } from "./WalkMode";
import { DealCornerMap } from "./DealCornerMap";
import { DealPlaceView } from "./DealPlaceView";
import { placeClock, cleanClock, windowOf } from "../utils/offerClock";
import { RedeemSheet } from "./RedeemSheet";
import { DealTile, TILE_CSS, eyebrow, distanceWords } from "./DealCard";
import { DealDetail } from "./DealDetail";
import { ABOUT_PATH } from "./AboutPage";
import { GemlyxLogo } from "./GemlyxLogo";
import { CategoryNav } from "./CategoryFilter";
import { ExploreBanner, MAX_DEAL_SLIDES } from "./ExploreBanner";
import { dealCategory, byCategories, CATEGORY_SIGN, DEAL_CATEGORIES } from "../utils/dealCategories";
import { dayKey, dayPlus } from "../utils/calendarDay";
import { DEAL_OPEN_EVENT, pendingDeal, clearPendingDeal } from "../utils/dealOpen";

const fill = (t, v) => String(t).replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));

// A deal's place as the walk names it, `${type}:${row id}`, so a partner's
// numbers from this list and from the walks land on the same key. The live
// rows do not carry their database type, so it is read off the pool they came
// from; the made-up partners carry their own id.
export const SRC_TYPE = { free: "free", food: "food", nightlife: "night", shop: "shop", town: "town" };
// The pages hold a published row under its database id plus 100000
// (LIVE_ID_OFFSET in liveContent.js, which keeps them clear of the places
// written in the code), while the walks and the partner link use the database
// id itself. Taken off here, or a partner's "offer shown" and "opened to
// redeem" land on a key their page never reads (found 13 Oct 2026).
export const LIVE_OFFSET = 100000;
export const dealPlaceId = (d) => {
  if (d?._exampleId) return String(d._exampleId);
  const type = SRC_TYPE[d?._src];
  if (!type || d?.id == null || d.id === "") return "";
  const n = Number(d.id);
  return `${type}:${Number.isInteger(n) && n >= LIVE_OFFSET ? n - LIVE_OFFSET : d.id}`;
};
export const pointOf = (d) => {
  const lat = Number(d?.__lat), lon = Number(d?.__lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0) ? { lat, lon } : null;
};

// On now (or on whenever the door is open) first, nearest first; then the
// ones that start later today, soonest first. Off and shut are left out: a
// visitor off a ship has today.
const RANK = { now: 0, always: 0, later: 1 };
export const MAX_DEALS = 12;
// Two to a row on a phone, like Lidl Plus; three or four on a wider screen.
// DESIGN REVIEW, 15 OCT 2026: on a computer the auto-fill grid cut the 1088px
// column into six 171px tiles, each with a 214px picture, while lidl.dk puts
// four 290px tiles across the same width. So from 960px up it is four to a
// row with a wider gap, and the tile's own type grows a size with it
// (DealCard.jsx, TILE_CSS). The phone keeps the auto-fill: two across at
// 390px, three from about 520px.
const GRID = { display: "grid", gap: 12 };
const GRID_CSS = `
.gx-deal-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
@media (min-width: 960px) { .gx-deal-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; } }
`;
// HOW FAR, 16 Oct 2026. Metres as the crow flies for the tile, and minutes on
// foot. A place across the strait (Smiltynė) is never a straight line: the
// minutes are the walk planner's own leg with the old ferry in it (the walk to
// the landing, the longest wait this month, the crossing, the walk on), and
// the tile says "By ferry" instead of metres that would make it look close.
export const distanceFrom = (start, at, country = "LT", now = new Date()) => {
  if (!at || !start) return { minutes: null, metres: null, ferry: false };
  const metres = Math.round(kmApart(start, at) * 1000);
  if (!crossesWater(country, start, at)) return { minutes: walkMinutes(start, at), metres, ferry: false };
  const leg = legBetween(start, at, { country, ferryWait: ferryWait(country, now.getMonth() + 1) });
  return { minutes: leg.minutes < 9999 ? leg.minutes : null, metres, ferry: true };
};
// ORDER, 13 Oct 2026: "Make alphabetic and closest filter. And only calculate
// from you." So two orders a visitor picks, and distance only ever from where
// the phone is. "default" is the order the page used before he chose these,
// kept for the walk-free callers and the suite.
const nameOrder = (a, b) => String(a.d.name).localeCompare(String(b.d.name), "lt", { sensitivity: "base" });
export const nearbyDeals = (deals, start, { now = new Date(), lang = "en", limit = MAX_DEALS, order = "default", country = "LT" } = {}) =>
  (Array.isArray(deals) ? deals : [])
    .map(d => {
      const card = promoCard(d, { today: now, lang });
      const at = pointOf(d);
      return { d, card, at, id: dealPlaceId(d), ...distanceFrom(start, at, country, now) };
    })
    .filter(x => x.card.timing in RANK)
    .sort(order === "az" ? nameOrder
      : order === "closest" ? (a, b) => (a.minutes ?? 9999) - (b.minutes ?? 9999) || nameOrder(a, b)
      : (a, b) => RANK[a.card.timing] - RANK[b.card.timing]
        || (a.card.timing === "later" ? String(a.d.__offer?.from || "").localeCompare(String(b.d.__offer?.from || "")) : 0)
        || (a.minutes ?? 9999) - (b.minutes ?? 9999)
        || nameOrder(a, b))
    .slice(0, limit);

// One place, walked to from the start, for WalkMode. It ends at the place:
// there is no way back to plan when somebody is going for a coffee.
export const STAY_AT_DEAL = 20;
export const walkToDeal = (start, x, lang = "en") => ({
  start: { ...start },
  stops: [{ id: x.id || `deal:${x.d.name}`, name: x.d.name, lat: x.at.lat, lon: x.at.lon, arrive: x.minutes, stay: STAY_AT_DEAL, why: offerTextIn(x.d.__offer, lang), deal: { text: offerTextIn(x.d.__offer, lang) } }],
  back: { at: x.minutes * 2 + STAY_AT_DEAL },
});

// ── THE THREE FILTERS ───────────────────────────────────────────────
// Oliver, 13 Oct 2026: "make filters called 'Discounts' 'Entertainment'
// 'Activities'", over the partners' deals only. A deal is in one of them:
// set by hand in the Studio offer editor (`__dealKind`), or else read off
// what kind of place it is. A bar's offer is Entertainment even though bars
// are filed with food, which is why the hand setting wins.
export const DEAL_KINDS = ["discounts", "entertainment", "activities"];
// "The filters about activities, entertainments, and discounts, also need to
// be improved" (13 Oct 2026). The kind of place alone filed a beer bar under
// Discounts because bars and restaurants share a table, and a luggage room
// under Activities. So, in this order: his own setting in the Studio; then
// what the offer and the place say about themselves; then the kind of place.
// A service that is none of the three (a luggage room) is in none of them and
// shows under All only.
const SAYS = [
  ["entertainment", /\b(bar|pub|club|jazz|live music|concert|gig|dj|karaoke|cinema|theat(?:re|er)|comedy|cocktails?|beers?|wine bar|night)\b/i],
  ["activities", /\b(workshop|tour|guided|hire|rent(?:al)?|class|lesson|museum|gallery|boat|kayak|bike|bicycle|cruise|sail(?:ing)?|climb|escape room|tasting|make your own|yourself)\b/i],
  ["discounts", /(%|€|\beur\b|\bfree\b|\bhalf\b|\bprice\b|\boff\b|\brefill\b|\btwo for one\b|\b2 for 1\b|\blunch\b|\bmenu\b|\bcoffee\b|\bdessert\b)/i],
];
const KIND_OF_TYPE = {
  food: "discounts", foodStreet: "discounts", shop: "discounts", shopPlace: "discounts",
  night: "entertainment", nightlife: "entertainment", nightStreet: "entertainment", event: "entertainment", festival: "entertainment",
  booking: "activities", craft: "activities", free: "activities", town: "activities",
};
export const dealKind = (d) => {
  const set = String(d?.__dealKind || "");
  if (DEAL_KINDS.includes(set) || set === "other") return set;
  const words = `${d?.name || ""} ${d?.category || ""} ${d?.type || ""} ${d?.__offer?.text || ""}`;
  for (const [kind, re] of SAYS) if (re.test(words)) return kind;
  const type = String(d?._exampleId || "").split(":")[0] || d?._src || "";
  return KIND_OF_TYPE[type] || "other";
};
// The tourism centre's own site, where everything that is not a deal lives.
// "Less competitive to the page": Gemlyx shows the deals and sends people
// there for the rest.
export const centreSite = (lang) => (lang === "lt" ? "https://klaipedatravel.lt/" : "https://klaipedatravel.lt/en/");
// ── THE COOPERATION LINE WAITS FOR THE CENTRE'S YES ───────────────────
// Oliver, 16 Oct 2026: "remove the 'cooporation with Klaipeda Tourism
// Center'.. I'll ask them first, if I can write that." The line and its words
// in four languages stay as they were; true draws it again under the deals.
export const CENTRE_LINE_SHOWN = false;

export const SORTS = ["closest", "az"];

// ── HOW LONG THE OFFER HAS LEFT ─────────────────────────────────────
// Oliver, 13 Oct 2026: "if it is friday 17:40 and an offer closes at 18:00,
// then it'll say 'ends in 20 minutes'". Read on the place's own clock, from
// the offer's own end time; an offer that runs past midnight counts on into
// the next day. Shown once there are three hours or less to go; before that
// the card says the hours as it did.
export const ENDS_SOON_MIN = 180;
const clockMin = (v) => { const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(v || "").trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
export const minutesLeft = (offer, now = new Date(), zone = "Europe/Vilnius") => {
  const to = clockMin(offer?.to);
  if (to === null) return null;
  const left = (to - placeClock(now, zone).minutes + 1440) % 1440;
  return left === 0 ? null : left;
};
const UNITS = { en: ["h", "min"], da: ["t", "min"], de: ["Std.", "Min."], lt: ["val.", "min."] };
export const leftWords = (min, lang = "en") => {
  const [h, m] = UNITS[lang] || UNITS.en;
  const hours = Math.floor(min / 60), mins = min % 60;
  return hours ? `${hours} ${h}${mins ? ` ${mins} ${m}` : ""}` : `${Math.max(1, mins)} ${m}`;
};
// ── WHEN THE OFFER HOLDS, IN ONE LINE ───────────────────────────────
// Oliver, 13 Oct 2026: "'On now' gotta go. It has to be 'offer expires at' or
// offer starts at... something like that." So the line under an offer says,
// on the place's clock:
//   on, three hours or less to go   Offer ends in 20 min
//   on, with an end time            Offer expires at 18:00
//   later today                     Offer starts at 16:00
//   with a last day                 Offer valid until 31 October
//   ongoing, no last day            Fridays 15:00-18:00 / Every day
// and nothing at all when there is nothing true to say.
const DATE_LOCALE = { en: "en-GB", da: "da-DK", de: "de-DE", lt: "lt-LT" };
export const offerUntilWords = (until, lang = "en") => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(until || "").trim());
  if (!m) return "";
  try { return new Intl.DateTimeFormat(DATE_LOCALE[lang] || "en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))); } catch { return `${m[3]}.${m[2]}`; }
};
export const offerWhen = (offer, timing, { now = new Date(), lang = "en", zone = "Europe/Vilnius" } = {}) => {
  const say = (key, vars) => fill(uiT(key, lang), vars);
  if (timing === "later") {
    const from = cleanClock(offer?.from);
    if (from) return { kind: "starts", text: say("offer.startsAt", { time: from }) };
  }
  if (timing === "now") {
    const left = minutesLeft(offer, now, zone);
    if (left !== null && left <= ENDS_SOON_MIN) return { kind: "ends", left, text: say("explore.endsIn", { t: leftWords(left, lang) }) };
    const to = cleanClock(offer?.to);
    if (to) return { kind: "expires", text: say("offer.expiresAt", { time: to }) };
  }
  // No last day, every week (13 Oct 2026, "friday candy EVERY friday"): the
  // line says when it runs, as the place's other pages already write it.
  if (offer?.ongoing === true) {
    const runs = offerHoursLabel(offer, { timing: "off", lang });
    return { kind: "ongoing", text: runs || uiT("offer.everyDay", lang) };
  }
  const date = offerUntilWords(offer?.until, lang);
  if (date) return { kind: "until", text: say("offer.validUntil", { date }) };
  return null;
};
// ── UPCOMING, THE WAY LIDL PLUS SHOWS IT ─────────────────────────────
// Oliver, 13 Oct 2026: "hide the offer the days where it is not there, and
// just have it as an 'upcoming' offer. Similar to the Lidl+ app." So the list
// is only what a visitor can use now. An offer that starts later today, or on
// another day this week, waits underneath in Upcoming, greyed, saying when it
// starts, with no Redeem button: nothing to show at a counter yet.
//
// When it next starts, on the place's clock, within the coming week and
// inside its dates. null for one that runs all day every day, has ended, or
// does not come round again before its last day. One that is on now starts
// next on its next day, which is why only offers that are not on are asked.
const dateIn = (when, zone) => {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(when); } catch { return ""; }
};
export const nextStart = (offer, now = new Date(), zone = "Europe/Vilnius") => {
  const o = cleanOffer(offer);
  if (!o || !offerLive(o, now, zone)) return null;
  const w = windowOf(o);
  if (!w) return null;
  const pc = placeClock(now, zone);
  // Six days on at most: a weekly offer already over today drops out for the
  // evening rather than reading "From Friday" on a Friday (Fable's review).
  for (let k = 0; k <= 6; k++) {
    const day = (pc.day + k) % 7;
    if (w.days.length && !w.days.includes(day)) continue;
    if (k === 0 && pc.minutes >= w.fromMin) continue;
    if (!o.ongoing && o.until) {
      // The calendar day k days on at the place, counted on the calendar
      // rather than in milliseconds, so a clock change cannot move it.
      const on = dayKey(dayPlus(dateIn(now, zone), k)) || "";
      if (on && on > o.until) return null;
    }
    return { inDays: k, day, from: w.from, at: k * 1440 + w.fromMin };
  }
  return null;
};
// Lithuanian wants the day in the accusative after "prasideda".
const LT_DAY = ["sekmadienį", "pirmadienį", "antradienį", "trečiadienį", "ketvirtadienį", "penktadienį", "šeštadienį"];
const DAY_LOCALE = { en: "en-GB", da: "da-DK", de: "de-DE", lt: "lt-LT" };
const dayWord = (d, lang) => {
  if (lang === "lt") return LT_DAY[d];
  try { return new Intl.DateTimeFormat(DAY_LOCALE[lang] || "en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 4 + d))); } catch { return ""; }
};
export const startsWords = (ns, lang = "en") => {
  if (!ns) return "";
  const say = (key, vars) => fill(uiT(key, lang), vars);
  const time = ns.from ? (lang === "da" ? ns.from.replace(":", ".") : ns.from) : "";
  if (ns.inDays === 0) return say("offer.startsAt", { time });
  if (ns.inDays === 1) return time ? say("offer.startsTomorrowAt", { time }) : uiT("offer.startsTomorrow", lang);
  const day = dayWord(ns.day, lang);
  return time ? say("offer.startsOnAt", { day, time }) : say("offer.startsOn", { day });
};
// The offer's days and hours, "Mon to Fri 14:00-16:00" or "Fridays
// 18:00-21:00", under the line that says when it ends or starts. Oliver,
// 13 Oct 2026: "It should also display the hours..". "" for an offer that runs
// all day, every day.
export const hoursOf = (offer, lang = "en") => { const h = offerHoursLabel(offer, { timing: "off", lang }); return h ? h.charAt(0).toUpperCase() + h.slice(1) : ""; };
// ── THE BADGE IN THE PICTURE'S CORNER ───────────────────────────────
// Lidl's says "Fra søndag 11.10."; ours says the one thing about time a
// visitor needs at a glance, short enough for a tile two to a row.
const LT_DAY_OF = ["sekmadienio", "pirmadienio", "antradienio", "trečiadienio", "ketvirtadienio", "penktadienio", "šeštadienio"];
const shortDate = (until, lang) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(until || ""));
  if (!m) return "";
  // Lithuanian's short form is "12-31", a dash and a month first, so it gets
  // the long one, "gruodžio 31 d." (14 Oct 2026).
  try { return new Intl.DateTimeFormat(DAY_LOCALE[lang] || "en-GB", { day: "numeric", month: lang === "lt" ? "long" : "short", timeZone: "UTC" }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))); } catch { return `${m[3]}.${m[2]}`; }
};
export const liveBadge = (offer, when, lang = "en") => {
  const say = (key, vars) => fill(uiT(key, lang), vars);
  const clock = (t) => (lang === "da" ? t.replace(":", ".") : t);
  if (when?.kind === "ends") return say("badge.endsIn", { t: leftWords(when.left, lang) });
  if (when?.kind === "expires") return say("badge.until", { time: clock(cleanClock(offer?.to)) });
  if (when?.kind === "ongoing") return when.text;
  if (when?.kind === "until") return say("badge.untilDate", { date: shortDate(offer?.until, lang) });
  return "";
};
export const upcomingBadge = (ns, lang = "en") => {
  if (!ns) return "";
  const say = (key, vars) => fill(uiT(key, lang), vars);
  const time = ns.from ? (lang === "da" ? ns.from.replace(":", ".") : ns.from) : "";
  if (ns.inDays === 0) return time ? say("badge.from", { time }) : "";
  if (ns.inDays === 1) return time ? say("badge.tomorrowAt", { time }) : uiT("badge.tomorrow", lang);
  const day = lang === "lt" ? LT_DAY_OF[ns.day] : dayWord(ns.day, lang);
  return time ? say("badge.fromDayAt", { day, time }) : say("badge.fromDay", { day });
};
export const upcomingDeals = (deals, start, { now = new Date(), lang = "en", limit = MAX_DEALS, country = "LT" } = {}) =>
  (Array.isArray(deals) ? deals : [])
    .map(d => {
      const card = promoCard(d, { today: now, lang });
      if (card.timing !== "later" && card.timing !== "off") return null;
      const next = nextStart(d.__offer, now);
      if (!next) return null;
      const at = pointOf(d);
      return { d, card, at, next, id: dealPlaceId(d), ...distanceFrom(start, at, country, now) };
    })
    .filter(Boolean)
    .sort((a, b) => a.next.at - b.next.at || nameOrder(a, b))
    .slice(0, limit);
// The small line over the name: which kind of place it is (14 Oct 2026).
export const tagFor = (d, lang = "en") => uiT(`explore.cat.${dealCategory(d)}`, lang);
// The sign in the map pointer's window: the place's own, or its filter's.
export const KIND_SIGN = { discounts: "🏷️", entertainment: "🎵", activities: "🎯", other: "📍" };
export const signFor = (d) => (d?.emoji ? String(d.emoji) : CATEGORY_SIGN[dealCategory(d)] || "📍");

// `ready` is false while the deals are still loading, so the first paint is
// not "No deals are on right now" for a list that is about to fill.
export const DealsNearYou = ({ deals = [], examples = false, ready = true, lang = "en", country = "LT", sticky = true, banner = false }) => {
  const [here, setHere] = useState(null);
  const [note, setNote] = useState("");
  const [going, setGoing] = useState(null);
  // The card whose map was tapped open: the place from above, with Show
  // directions under it (DealPlaceView.jsx, 13 Oct 2026). One at a time.
  const [opened, setOpened] = useState(null);
  // A tap on the small map in a photo's corner opens the deal on its map.
  const [atMap, setAtMap] = useState(false);
  useEffect(() => { if (!opened) setAtMap(false); }, [opened]);
  const howFar = (x) => (x.minutes == null ? "" : fill(uiT(x.ferry ? "explore.ferryMin" : "trips.walkMin", lang), { n: x.minutes }));
  const awayOf = (x) => (x.ferry ? uiT("explore.byFerry", lang) : x.metres != null ? distanceWords(x.metres, lang) : "");
  // The offer opened to redeem: the screen shown at the counter
  // (RedeemSheet.jsx, 13 Oct 2026), with Gemlyx on it.
  const [redeem, setRedeem] = useState(null);
  // The countdown moves on by itself while the page is open.
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 30000); return () => clearInterval(t); }, []);
  // ── ONE KIND OF PLACE AT A TIME, EACH ITS OWN PAGE, FADING ──────────
  // Oliver, 14 Oct 2026: "Don't have those tick-offs. Let it be seperate
  // navigations. And let change be fades." `cat` is the kind of place being
  // shown, null for all of them. Going in or out fades the page out, swaps it,
  // and fades it back in. Going in is a step in the phone's history, so the
  // phone's own Back comes out again rather than leaving Explore.
  // Seeded from the phone's history, so a reload or a swipe away and back
  // shows what the history says is shown (Fable's review, 14 Oct 2026).
  const [cat, setCat] = useState(() => { try { const k = window.history.state?.gxCat; return DEAL_CATEGORIES.includes(k) ? k : null; } catch { return null; } });
  const catRef = useRef(cat);
  catRef.current = cat;
  const [fade, setFade] = useState(false);
  const FADE_MS = 200;
  const showCat = (k) => {
    setFade(true);
    setTimeout(() => {
      setCat(k);
      setOpened(null);
      setFade(false);
    }, FADE_MS);
  };
  const sectionRef = useRef(null);
  const enterCat = (k) => {
    try { window.history.pushState({ ...(window.history.state || {}), gxCat: k }, ""); } catch { /* no history */ }
    showCat(k);
  };
  // Another circle swaps in place; the one already shown, tapped again, shows
  // them all.
  const pickCat = (k) => {
    if (k === cat) { leaveCat(); return; }
    if (cat) { try { window.history.replaceState({ ...(window.history.state || {}), gxCat: k }, ""); } catch { /* no history */ } showCat(k); return; }
    enterCat(k);
  };
  const leaveCat = () => {
    try { if (window.history.state?.gxCat) { window.history.back(); return; } } catch { /* fall through */ }
    showCat(null);
  };
  // ── BACK CLOSES WHAT IS OPEN, ONE THING AT A TIME ──────────────────
  // Fable's review, 14 Oct 2026: the deal sheet and the Redeem screen took no
  // step in the phone's history, so Back left Explore instead of closing them.
  // Each pushes a step (gxSheet 1 for the deal, 2 for Redeem over it), and
  // Back reads what is left: the sheets above that level close, and the kind
  // of place follows the history too.
  const sheetLevel = () => { try { return Number(window.history.state?.gxSheet) || 0; } catch { return 0; } };
  const pushSheet = (level) => { try { window.history.pushState({ ...(window.history.state || {}), gxSheet: level }, ""); } catch { /* no history */ } };
  const closeSheet = (fallback) => { if (sheetLevel() > 0) { try { window.history.back(); return; } catch { /* fall through */ } } fallback(); };
  // Leaving every sheet at once, for a walk: back past their steps first.
  const dropSheets = () => { const n = sheetLevel(); if (n > 0) { try { window.history.go(-n); } catch { /* none */ } } };
  useEffect(() => {
    const onPop = () => {
      let st = {};
      try { st = window.history.state || {}; } catch { /* none */ }
      const level = Number(st.gxSheet) || 0;
      if (level < 2) setRedeem(null);
      if (level < 1) setOpened(null);
      const k = DEAL_CATEGORIES.includes(st.gxCat) ? st.gxCat : null;
      if (k !== catRef.current) showCat(k);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const only = useMemo(() => new Set(cat ? [cat] : []), [cat]);
  const [sort, setSort] = useState("az");
  const canLocate = typeof navigator !== "undefined" && !!navigator.geolocation && !!NOW_AREAS[country];
  // ── FROM THE VISITOR, ELSE FROM THE CENTRE ───────────────────────
  // Distance was only ever from the visitor (13 Oct 2026). Oliver, 17 Oct
  // 2026: "It should be from center if the user's own location is not
  // specified." So without a phone in Klaipėda that has said where it is,
  // distances, Closest and the walk start at the Tourist Information Centre,
  // and a line over the list says so. Never from the ship.
  const centre = NOW_STARTS[String(country || "").toUpperCase()]?.centre || null;
  const centreStart = centre ? { id: "centre", name: uiT("explore.centre", lang), lat: centre.lat, lon: centre.lon, ship: false } : null;
  const hereAt = (at) => ({ id: "here", name: uiT("now.whereYouAre", lang), lat: at.lat, lon: at.lon, ship: false });
  const start = here ? hereAt(here) : centreStart;
  const fromCentre = !here && !!centreStart;
  // Quiet either way: a phone outside Klaipėda, or one that says no, keeps
  // the centre, which the line over the list already names.
  const locate = (then = null) => {
    setNote("");
    if (!canLocate) return;
    try {
      navigator.geolocation.getCurrentPosition((p) => {
        const at = { lat: p.coords.latitude, lon: p.coords.longitude };
        if (!inNowArea(country, at)) return;
        setHere(at);
        if (then) then(at);
      }, () => {}, { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
    } catch { /* the centre stands in */ }
  };
  // A phone that has already said yes is not asked again: the list opens on
  // Closest. Anyone else starts A to Z and is asked only when they tap Closest.
  useEffect(() => {
    let gone = false;
    try {
      navigator.permissions?.query({ name: "geolocation" }).then(st => {
        if (!gone && st?.state === "granted") locate(() => setSort("closest"));
      }).catch(() => {});
    } catch { /* no permissions API */ }
    return () => { gone = true; };
  }, []);
  const pickSort = (k) => {
    if (k === "closest" && !here) { setSort("closest"); locate(); return; }
    setSort(k);
  };
  // Only what can be used now; what starts later waits in Upcoming (13 Oct
  // 2026). The tick moves an offer from one to the other as its hour comes.
  const all = useMemo(() => nearbyDeals(deals, start, { now: new Date(), lang, limit: Infinity, order: sort === "closest" && start ? "closest" : "az", country }).filter(x => x.card.timing !== "later"), [deals, start?.lat, start?.lon, lang, sort, tick]);
  const list = useMemo(() => byCategories(all, only, x => x.d).slice(0, MAX_DEALS), [all, only]);
  const soon = useMemo(() => byCategories(upcomingDeals(deals, start, { now: new Date(), lang, limit: Infinity, country }), only, x => x.d).slice(0, MAX_DEALS), [deals, start?.lat, start?.lon, lang, only, tick]);
  // The banner's slides (ExploreBanner.jsx): Gemlyx's own, then deals that
  // are on now, whatever kind of place is chosen.
  const slides = useMemo(() => [{ kind: "brand", key: "brand" }, ...all.slice(0, MAX_DEAL_SLIDES).map(x => {
    const when = offerWhen(x.d.__offer, x.card.timing, { now: new Date(), lang });
    return { kind: "deal", key: x.id || x.d.name, name: x.d.name, offer: offerTextIn(x.d.__offer, lang), tag: tagFor(x.d, lang), badge: liveBadge(x.d.__offer, when, lang), photo: x.d.photo || "", cat: dealCategory(x.d) };
  })], [all, lang]);
  // A walk from where the phone is, or from the centre when that is not known.
  const startWalk = (x, from) => setGoing({ ...x, minutes: walkMinutes(from, x.at), _from: from });
  const go = (x) => {
    askForCompass();
    if (here) { startWalk(x, hereAt(here)); return; }
    const fallback = () => { if (centreStart) startWalk(x, centreStart); };
    if (!canLocate) { fallback(); return; }
    try {
      navigator.geolocation.getCurrentPosition((p) => {
        const at = { lat: p.coords.latitude, lon: p.coords.longitude };
        if (!inNowArea(country, at)) { fallback(); return; }
        setHere(at);
        startWalk(x, hereAt(at));
      }, fallback, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    } catch { fallback(); }
  };
  const openRedeem = (x, when) => {
    pushSheet(2);
    setRedeem({ x, when: when?.text || "" });
    dealRedeemOpened(x.id, country);
  };
  // ── SHOW DIRECTIONS ASKS WHERE YOU ARE, AND ANSWERS IN THE DEAL ────
  // Oliver, 16 Oct 2026: "When people click 'Show directions' have the
  // website give them the 'access to location' question." The browser's own
  // question comes from getCurrentPosition, but only until it has been
  // answered once; after that a tap used to close the deal and leave a line
  // out of sight at the top of the page, so from outside Klaipėda nothing
  // seemed to happen. Now the deal stays open while the phone is found, and
  // a refusal, a blocked browser or a visitor elsewhere is said under the
  // buttons. The walk starts only from a phone in Klaipėda.
  const [dirNote, setDirNote] = useState("");
  const [finding, setFinding] = useState(false);
  useEffect(() => { setDirNote(""); setFinding(false); }, [opened]);
  // Since 17 Oct 2026 a phone outside Klaipėda, one that says no, or one
  // that cannot find itself walks from the Tourist Information Centre.
  const goFromDeal = (x) => {
    setDirNote("");
    const leave = (from) => { setFinding(false); dropSheets(); setOpened(null); startWalk(x, from); };
    if (here) { leave(hereAt(here)); return; }
    const fallback = () => { if (centreStart) leave(centreStart); else { setFinding(false); setDirNote(uiT("dir.cannot", lang)); } };
    if (!canLocate) { fallback(); return; }
    askForCompass();
    setFinding(true);
    try {
      navigator.geolocation.getCurrentPosition((p) => {
        const at = { lat: p.coords.latitude, lon: p.coords.longitude };
        if (!inNowArea(country, at)) { fallback(); return; }
        setHere(at);
        leave(hereAt(at));
      }, fallback, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    } catch { fallback(); }
  };
  // ── A SCAN OF THE GEMLYX CODE AT THE COUNTER ──────────────────────
  // 17 Oct 2026 (utils/scanCode.js). The sticker opens /s/<code>, which lands
  // here with ?scan=<code>. Once the deals are in, the place's offer opens
  // marked Redeemed with the time, and the scan is counted once per place per
  // phone per day. An offer that is not on now opens with its hours and a
  // line saying so; a code nobody holds says that at the top of the list.
  const [scanAsked, setScanAsked] = useState(() => (typeof window !== "undefined" ? scanFromSearch(window.location.search) : ""));
  useEffect(() => {
    if (!scanAsked || !ready) return;
    const code = scanAsked;
    setScanAsked("");
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("scan");
      window.history.replaceState(window.history.state, "", `${u.pathname}${u.search}${u.hash}`);
    } catch { /* the address keeps it, harmlessly */ }
    const now = new Date();
    const mine = (x) => cleanScanCode(x?.d?.__scan) === code;
    const live = all.find(mine);
    if (live) {
      let at = "";
      try { at = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vilnius", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now); } catch { /* no clock */ }
      const when = offerWhen(live.d.__offer, live.card.timing, { now, lang });
      pushSheet(2);
      setRedeem({ x: live, when: when?.text || "", scanned: true, at });
      const day = dayKey(dateIn(now, "Europe/Vilnius")) || "";
      if (live.id && firstScanToday(live.id, day)) dealScanned(live.id, country);
      return;
    }
    const later = upcomingDeals(deals, null, { now, lang, limit: Infinity, country }).find(mine);
    if (later) {
      pushSheet(2);
      setRedeem({ x: later, when: startsWords(later.next, lang), note: uiT("redeem.notNow", lang) });
      return;
    }
    setNote(uiT("redeem.unknown", lang));
  }, [scanAsked, ready, all]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── HOW IT WORKS ─────────────────────────────────────────────────
  // Oliver, 17 Oct 2026: "So we obviously need a 'how to use'". Three steps
  // over the list until the visitor closes it; closed stays closed on that
  // phone.
  const HOW_KEY = "gx.howto.closed";
  const [howOpen, setHowOpen] = useState(() => { try { return !localStorage.getItem(HOW_KEY); } catch { return true; } });
  const closeHow = () => { setHowOpen(false); try { localStorage.setItem(HOW_KEY, "1"); } catch { /* shows again next visit */ } };

  const walkStart = going?._from || start;

  // ── A DEAL ASKED FOR BY AN ALERT OR A MAIL ─────────────────────────
  // 15 Oct 2026 (utils/dealOpen.js): the bell's list and a deal mail's link
  // open one deal here, as its tile would, once the list has it. A deal of
  // another kind than the one shown brings back all of them first; one that
  // is no longer on Explore opens nothing.
  const [asked, setAsked] = useState(() => pendingDeal());
  useEffect(() => {
    const on = () => setAsked(pendingDeal());
    window.addEventListener(DEAL_OPEN_EVENT, on);
    return () => window.removeEventListener(DEAL_OPEN_EVENT, on);
  }, []);
  useEffect(() => {
    if (!asked || !ready) return;
    const keyOf = (x) => x.id || x.d.name;
    const done = (k) => { clearPendingDeal(); setAsked(null); if (k) { pushSheet(1); setOpened(k); } };
    if (all.some(x => keyOf(x) === asked) && (!cat || list.some(x => keyOf(x) === asked))) return done(asked);
    if (soon.some(x => keyOf(x) === asked)) return done(`soon:${asked}`);
    const anyKind = all.some(x => keyOf(x) === asked) || upcomingDeals(deals, null, { now: new Date(), lang, limit: Infinity }).some(x => keyOf(x) === asked);
    if (anyKind && cat) { leaveCat(); return; }
    done(null);
  }, [asked, ready, all, list, soon, cat]);

  // Counted once per visit, for the places listed: what a partner sees as
  // "times your offer was shown".
  const counted = useRef(false);
  useEffect(() => {
    if (counted.current || !list.length) return;
    counted.current = true;
    dealsSeen(list.map(x => x.id), country);
  }, [list.length]);

  // An app's filter row: one line of pills, the chosen one filled, All first.
  const pill = (on) => ({
    flex: "0 0 auto", background: on ? C.gold : "transparent", color: on ? C.onGold : C.light,
    border: `1px solid ${on ? C.gold : C.border}`, borderRadius: 100, padding: "7px 14px",
    fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
  });
  const seg = (on) => ({
    background: on ? C.surface : "transparent", color: on ? C.text : C.muted, border: "none", borderRadius: 100,
    padding: "5px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
  });

  return (
    <section ref={sectionRef} data-testid="deals-near" style={{ marginBottom: 30, position: "relative" }}>
      <style>{GRID_CSS}{TILE_CSS}</style>
      {banner && (
        <ExploreBanner slides={slides} cat={cat} catLabel={cat ? uiT(`explore.cat.${cat}`, lang) : ""} lang={lang} examples={examples}
          onOpen={(key) => { pushSheet(1); setOpened(key); }} />
      )}
      <div style={banner ? { maxWidth: 1120, margin: "0 auto", padding: "8px 16px 0" } : undefined}>
      {banner ? (
        // A little more air under the circles on a computer, where they are
        // 80px (design review, 15 Oct 2026); 18px on a phone as before.
        <div style={{ maxWidth: 640, margin: "0 auto clamp(18px, 2.4vw, 30px)" }}>
          <CategoryNav active={cat} onPick={pickCat} label={(k) => uiT(`explore.cat.${k}`, lang)} />
        </div>
      ) : (
      <div style={{ margin: "4px 0 14px" }}>
        <div style={{ ...eyebrow(), marginBottom: 8 }}>{country === "LT" ? "Klaipėda" : ""}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 30, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.1, letterSpacing: -0.3, margin: 0, color: C.text }}>{uiT("trips.dealsH", lang)}</h2>
          {examples && <span data-testid="deals-near-examples" style={{ fontSize: 10, fontWeight: 700, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 100, padding: "3px 9px", letterSpacing: 0.6, textTransform: "uppercase" }}>{uiT("deals.example", lang)}</span>}
        </div>
        <div style={{ marginTop: 18 }}>
          <CategoryNav active={cat} onPick={pickCat} label={(k) => uiT(`explore.cat.${k}`, lang)} />
        </div>
      </div>
      )}
      <div data-testid="deals-view" data-cat={cat || "all"} style={{ position: "relative", zIndex: 1, opacity: fade ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}>

      <div style={{ padding: "6px 0 8px", marginBottom: 8, ...(sticky ? { position: "sticky", top: 0, zIndex: 20, background: C.bg } : {}) }}>
        <div role="group" aria-label="Sort" data-testid="deals-sort" style={{ display: "inline-flex", gap: 2, background: `${C.border}55`, borderRadius: 100, padding: 2 }}>
          {SORTS.map(k => (
            <button key={k} onClick={() => pickSort(k)} aria-pressed={sort === k} style={seg(sort === k)} data-testid={`deals-sort-${k}`}>
              {uiT(`explore.${k}`, lang)}
            </button>
          ))}
        </div>
      </div>
      {fromCentre && <div data-testid="deals-from-centre" style={{ fontSize: 12, color: C.muted, margin: "0 0 10px" }}>{uiT("explore.fromCentre", lang)}</div>}
      {howOpen && (
        <div data-testid="deals-howto" style={{ position: "relative", background: C.surface, border: `1px solid ${C.gold}33`, borderRadius: 16, padding: "14px 44px 14px 16px", margin: "0 0 14px" }}>
          <div style={{ ...eyebrow(), marginBottom: 10 }}>{uiT("how.title", lang)}</div>
          {/* Three steps again, in his words (17 Oct 2026): "pick a venue",
              "scan the QR code at the counter", "show to the cashier", with
              staff for cashier, since a café or a workshop has no cashier. */}
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px 18px" }}>
            {["how.one", "how.two", "how.three"].map((k, i) => (
              <li key={k} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.text, lineHeight: 1.35 }}>
                <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: "50%", background: `${C.gold}1F`, color: C.gold, fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                {uiT(k, lang)}
              </li>
            ))}
          </ol>
          <button onClick={closeHow} aria-label={uiT("how.close", lang)} data-testid="deals-howto-close"
            style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", color: C.muted, fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>
      )}
      {note && <div data-testid="deals-near-note" style={{ fontSize: 12, color: "#FFB347", margin: "0 0 10px" }}>{note}</div>}
      {!ready ? (
        <div data-testid="deals-near-loading" style={{ height: 120 }} />
      ) : list.length === 0 ? (
        <div data-testid="deals-near-none" style={{ fontSize: 13.5, color: C.light, lineHeight: 1.6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "13px 16px" }}>
          {uiT(soon.length ? "explore.noneNowSoon" : cat ? "explore.noneCat" : "trips.noDeals", lang)}
        </div>
      ) : (
        <div data-testid="deals-grid" className="gx-deal-grid" style={GRID}>
          {list.map(x => {
            const offer = offerTextIn(x.d.__offer, lang);
            const when = offerWhen(x.d.__offer, x.card.timing, { now: new Date(), lang });
            const key = x.id || x.d.name;
            return (
              <DealTile key={key} testid="deal-near" name={x.d.name} offer={offer} badge={liveBadge(x.d.__offer, when, lang)}
                distance={howFar(x)}
                away={awayOf(x)}
                photo={x.d.photo || ""} at={x.at} sign={signFor(x.d)} pin={x.d.__pin || ""}
                onOpen={() => { pushSheet(1); setAtMap(false); setOpened(key); }}
                onMap={() => { pushSheet(1); setAtMap(true); setOpened(key); }} />
            );
          })}
        </div>
      )}
      {soon.length > 0 && (
        <div data-testid="deals-upcoming" style={{ marginTop: 30 }}>
          <h3 style={{ ...eyebrow(), margin: "0 0 12px" }}>{uiT("explore.upcoming", lang)}</h3>
          <div className="gx-deal-grid" style={GRID}>
            {soon.map(x => (
              <DealTile key={x.id || x.d.name} testid="deal-upcoming" upcoming name={x.d.name}
                offer={offerTextIn(x.d.__offer, lang)} badge={upcomingBadge(x.next, lang)}
                distance={howFar(x)}
                away={awayOf(x)}
                photo={x.d.photo || ""} at={x.at} sign={signFor(x.d)} pin={x.d.__pin || ""}
                onOpen={() => { pushSheet(1); setAtMap(false); setOpened(`soon:${x.id || x.d.name}`); }}
                onMap={() => { pushSheet(1); setAtMap(true); setOpened(`soon:${x.id || x.d.name}`); }} />
            ))}
          </div>
        </div>
      )}
      </div>
      {(() => {
        // The deal a tile opened, live or upcoming, read fresh from the lists.
        if (!opened) return null;
        const isSoon = String(opened).startsWith("soon:");
        const key = isSoon ? String(opened).slice(5) : opened;
        // `all` as well, for a deal opened by an alert that sits past the
        // first twelve (15 Oct 2026).
        const x = (isSoon ? soon : list).find(y => (y.id || y.d.name) === key) || (isSoon ? null : all.find(y => (y.id || y.d.name) === key));
        if (!x) return null;
        const offer = offerTextIn(x.d.__offer, lang);
        const when = isSoon ? { kind: "starts", text: startsWords(x.next, lang) } : offerWhen(x.d.__offer, x.card.timing, { now: new Date(), lang });
        const busy = busyAt(x.d.__busy, new Date(), "Europe/Vilnius");
        return (
          <DealDetail name={x.d.name} key={opened} startOnMap={atMap} offer={offer} tag={tagFor(x.d, lang)} upcoming={isSoon} lang={lang}
            distance={howFar(x)}
            when={when} hours={when?.kind !== "ongoing" ? hoursOf(x.d.__offer, lang) : ""}
            note={busy ? uiT(`busy.${busy.level}`, lang) : ""}
            photo={x.d.photo || ""} at={x.at} sign={signFor(x.d)} pin={x.d.__pin || ""}
            book={cleanBooking(x.d.__booking)}
            labels={{ redeem: uiT("offer.redeem", lang), directions: uiT("explore.directions", lang), finding: uiT("dir.finding", lang), close: uiT("explore.closeMap", lang), book: uiT("deal.book", lang) }}
            onRedeem={!isSoon && offer ? () => openRedeem(x, when) : null}
            onDirections={() => goFromDeal(x)} finding={finding} dirNote={dirNote}
            onClose={() => closeSheet(() => setOpened(null))} />
        );
      })()}
      </div>
      {country === "LT" && CENTRE_LINE_SHOWN && (() => {
        // "In cooperation with Klaipėda Tourism Center" (Oliver, 14 Oct 2026),
        // the centre's name the link to their own site.
        const [before, after = ""] = uiT("explore.coop", lang).split("{name}");
        return (
          <div data-testid="deals-centre" style={{ marginTop: 18, fontSize: 12.5, color: C.muted, textAlign: "center", letterSpacing: 0.2 }}>
            {before}
            <a href={centreSite(lang)} target="_blank" rel="noopener noreferrer" data-testid="deals-centre-link"
              style={{ color: C.light, fontWeight: 700, textDecoration: "underline", textDecorationColor: `${C.gold}88`, textUnderlineOffset: 3 }}>
              {uiT("explore.coopName", lang)}
            </a>
            {after}
          </div>
        );
      })()}

      {/* ── THE FOOT OF THE PAGE ─────────────────────────────────
          Oliver, 16 Oct 2026: About Gemlyx "at the end of the page, not the
          menu". Quiet, under everything, with the two documents a reader
          looks for in the same place. A link, so it opens as its own page
          with its own address. */}
      <footer data-testid="deals-foot" style={{ marginTop: 56, padding: "26px 0 8px", borderTop: `1px solid ${C.gold}1A`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <GemlyxLogo size={15} color={C.light} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "6px 12px", fontSize: 12.5 }}>
          <a href={ABOUT_PATH} data-testid="deals-foot-about" style={{ color: C.muted, textDecoration: "none" }}>{uiT("about.link", lang)}</a>
          <span aria-hidden="true" style={{ color: C.muted, opacity: 0.5 }}>·</span>
          <a href="/terms.html" style={{ color: C.muted, textDecoration: "none" }}>Terms of Service</a>
          <span aria-hidden="true" style={{ color: C.muted, opacity: 0.5 }}>·</span>
          <a href="/privacy.html" style={{ color: C.muted, textDecoration: "none" }}>Privacy Policy</a>
        </div>
      </footer>

      {redeem && (
        <RedeemSheet name={redeem.x.d.name} offer={offerTextIn(redeem.x.d.__offer, lang)} when={redeem.when} lang={lang}
          scanned={!!redeem.scanned} scannedAt={redeem.at || ""} note={redeem.note || ""}
          onDirections={redeem.x.at ? () => { const x = redeem.x; dropSheets(); setRedeem(null); setOpened(null); go(x); } : null}
          onClose={() => closeSheet(() => setRedeem(null))} />
      )}
      {/* On the body: on /lithuania Explore sits in the swiping pager, whose
          transform would pin a fixed walk to the page rather than the phone
          (Fable's review, 14 Oct 2026), as RedeemSheet's note says. */}
      {going && walkStart && typeof document !== "undefined" && createPortal(
        <WalkMode walk={walkToDeal(walkStart, going, lang)} madeAt={null} lang={lang} country={country} loop={false}
          cardFor={() => ({ emoji: "◈", ...(going.d.photo ? { photo: going.d.photo } : {}) })}
          onReach={(s) => placeReached(s, country)} onClose={() => setGoing(null)} />,
        document.body,
      )}
    </section>
  );
};

export default DealsNearYou;
